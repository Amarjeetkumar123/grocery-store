import { uniqueViolationErrorCode, withTransaction } from '../dbHelper/databaseConnection.js';
import { findAdminOrders, updateOrderStatus } from '../dbHelper/adminOrderDbHelper.js';
import { lockOrder } from '../dbHelper/orderDbHelper.js';
import { findCashInHand, insertPayment } from '../dbHelper/paymentDbHelper.js';
import { findStoreSettings } from '../dbHelper/storeSettingsDbHelper.js';
import { buildRiderOrderFilter } from '../filters/orderFilters.js';
import { readPositiveInteger } from '../validators/commonValidation.js';
import { readOptionalDate } from '../validators/productValidation.js';
import { todayInIndia } from '../utils/indianDate.js';
import { ServiceError } from './serviceError.js';

const paymentMethods = ['cash', 'upi'];

// A rider's day: their orders, counts, cash in hand, and the store's UPI ID for the QR code.
async function listMyDeliveries({ database }, staffMember, query) {
  const deliveryDate = readOptionalDate(query.date).date ?? todayInIndia();
  const [orders, cashInHand, settings] = await Promise.all([
    findAdminOrders(database, buildRiderOrderFilter({ riderId: staffMember.id, deliveryDate })),
    findCashInHand(database, staffMember.id),
    findStoreSettings(database),
  ]);
  return { deliveryDate, orders, cashInHand, store: { name: settings.storeName, upiId: settings.upiId } };
}

// Riders act only on orders given to them; the owner may act on any order.
function checkMayHandle(order, staffMember) {
  if (!order || (staffMember.role !== 'owner' && order.riderId !== staffMember.id)) throw ServiceError.notFound('Order not found.');
}

// Locks the order, checks it, runs change(client, order) in one transaction.
// Returns { orderNumber, total }.
async function changeLockedOrder(database, staffMember, orderNumberInput, change) {
  const orderNumber = readPositiveInteger(orderNumberInput);
  const total = await withTransaction(database, async (client) => {
    const order = orderNumber ? await lockOrder(client, { orderNumber }) : null;
    checkMayHandle(order, staffMember);
    await change(client, order);
    return order.total;
  });
  return { orderNumber, total };
}

async function startDelivery({ database, notificationService }, staffMember, orderNumberInput) {
  const { orderNumber, total } = await changeLockedOrder(database, staffMember, orderNumberInput, async (client, order) => {
    if (order.status !== 'packed') throw ServiceError.conflict('Only a packed order can go out for delivery.');
    await updateOrderStatus(client, order.id, 'out_for_delivery');
  });
  notificationService.orderStatusChanged(orderNumber, 'out_for_delivery', { total });
  return { orderNumber };
}

// body: { method: "cash" | "upi" }. The amount is always the order total.
async function recordPayment({ database }, staffMember, orderNumberInput, body) {
  if (!paymentMethods.includes(body.method)) throw ServiceError.badRequest('Choose cash or UPI.');
  try {
    const { orderNumber } = await changeLockedOrder(database, staffMember, orderNumberInput, async (client, order) => {
      if (order.paymentStatus === 'paid') throw ServiceError.conflict('This order is already marked as paid.');
      if (order.status !== 'out_for_delivery') throw ServiceError.conflict('Start the delivery before taking payment.');
      await insertPayment(client, { orderId: order.id, method: body.method, amount: order.total, collectedBy: staffMember.id });
    });
    return { orderNumber };
  } catch (error) {
    if (error.code === uniqueViolationErrorCode) throw ServiceError.conflict('This order is already marked as paid.');
    throw error;
  }
}

async function markDelivered({ database, notificationService }, staffMember, orderNumberInput) {
  const { orderNumber } = await changeLockedOrder(database, staffMember, orderNumberInput, async (client, order) => {
    if (order.status !== 'out_for_delivery') throw ServiceError.conflict('This order is not out for delivery.');
    if (order.paymentStatus !== 'paid') throw ServiceError.badRequest('Mark the payment first.');
    await updateOrderStatus(client, order.id, 'delivered');
  });
  notificationService.orderStatusChanged(orderNumber, 'delivered');
  return { orderNumber };
}

export function createDeliveryService(dependencies) {
  return {
    listMyDeliveries: (staffMember, query) => listMyDeliveries(dependencies, staffMember, query),
    startDelivery: (staffMember, orderNumberInput) => startDelivery(dependencies, staffMember, orderNumberInput),
    recordPayment: (staffMember, orderNumberInput, body) => recordPayment(dependencies, staffMember, orderNumberInput, body),
    markDelivered: (staffMember, orderNumberInput) => markDelivered(dependencies, staffMember, orderNumberInput),
  };
}
