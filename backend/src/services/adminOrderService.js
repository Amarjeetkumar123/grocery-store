import { withTransaction } from '../dbHelper/databaseConnection.js';
import {
  assignRiderToOrders, findAdminOrders, findBoardFilterOptions, findOrderStatusCounts, findUpcomingOrderDays, updateOrderStatus,
} from '../dbHelper/adminOrderDbHelper.js';
import { lockOrder } from '../dbHelper/orderDbHelper.js';
import { isActiveRider } from '../dbHelper/staffDbHelper.js';
import { buildAdminOrderFilter, buildBoardOrderFilter } from '../filters/orderFilters.js';
import { readPositiveInteger, readRequiredText } from '../validators/commonValidation.js';
import { readOptionalDate } from '../validators/productValidation.js';
import { readBoardQuery } from '../validators/orderValidation.js';
import { todayInIndia } from '../utils/indianDate.js';
import { cancelLockedOrder } from './orderCancellation.js';
import { ServiceError } from './serviceError.js';

// Each step forward on the order board: which status it comes from and who
// may do it. "Delivered" is set by the rider with the payment (Week 5).
const statusSteps = {
  confirmed: { from: 'new', roles: ['owner'] },
  packed: { from: 'confirmed', roles: ['owner', 'packer'] },
  out_for_delivery: { from: 'packed', roles: ['owner'], needsRider: true },
};
const maximumOrdersPerAssignment = 200;
const boardPageSize = 30;

// query: { date: "2026-10-04" } for the picking and delivery lists, or { customerId } for one customer's history.
async function listOrders({ database }, query) {
  const deliveryDate = readOptionalDate(query.date).date ?? null;
  const customerId = readPositiveInteger(query.customerId);
  if (!deliveryDate && !customerId) throw ServiceError.badRequest('Choose a delivery date.');
  return { orders: await findAdminOrders(database, buildAdminOrderFilter({ deliveryDate, customerId })) };
}

// The order board: one page of orders for a date range (none = all orders), the
// count in each column over every page, the dropdown choices, and the coming
// days that have orders, so an order booked for a later day is never missed.
async function listBoardOrders({ database }, query) {
  const { boardQuery, errorMessage } = readBoardQuery(query);
  if (errorMessage) throw ServiceError.badRequest(errorMessage);
  const [statusCounts, filterOptions, upcomingDays] = await Promise.all([
    findOrderStatusCounts(database, buildBoardOrderFilter(boardQuery, { includeCancelled: true })),
    findBoardFilterOptions(database, buildBoardOrderFilter({ fromDate: boardQuery.fromDate, toDate: boardQuery.toDate })),
    findUpcomingOrderDays(database, todayInIndia()),
  ]);
  const shownCount = Object.entries(statusCounts).reduce((sum, [status, orders]) => (status === 'cancelled' ? sum : sum + orders), 0);
  const pageCount = Math.max(1, Math.ceil(shownCount / boardPageSize));
  const page = Math.min(boardQuery.page, pageCount);
  // With no start date the newest orders come first; otherwise the nearest delivery day.
  const orders = await findAdminOrders(database, buildBoardOrderFilter(boardQuery),
    { limit: boardPageSize, offset: (page - 1) * boardPageSize, newestFirst: !boardQuery.fromDate });
  return { orders, page, pageCount, statusCounts, filterOptions, upcomingDays };
}

function checkStatusStep(step, order, staffMember) {
  if (!step) throw ServiceError.badRequest('Unknown status.');
  if (!step.roles.includes(staffMember.role)) throw ServiceError.forbidden('Only the owner can do this.');
  if (!order) throw ServiceError.notFound('Order not found.');
  if (order.status !== step.from) throw ServiceError.conflict('This order has changed. The board will refresh.');
  if (step.needsRider && !order.riderId) throw ServiceError.badRequest('Choose a rider first.');
}

// body: { status: "confirmed" | "packed" | "out_for_delivery" }
async function moveOrderForward({ database, notificationService }, staffMember, orderNumberInput, body) {
  const orderNumber = readPositiveInteger(orderNumberInput);
  const step = statusSteps[body.status];
  const order = await withTransaction(database, async (client) => {
    const locked = orderNumber ? await lockOrder(client, { orderNumber }) : null;
    checkStatusStep(step, locked, staffMember);
    await updateOrderStatus(client, locked.id, body.status);
    return locked;
  });
  // "Packed" is for the shop; the customer hears about confirmed and on the way.
  if (body.status !== 'packed') notificationService.orderStatusChanged(orderNumber, body.status, { total: order.total });
  return { orderNumber, status: body.status };
}

// body: { reason }. The customer sees the reason in My Orders.
async function cancelOrder({ database, notificationService }, orderNumberInput, body) {
  const orderNumber = readPositiveInteger(orderNumberInput);
  const fieldErrors = {};
  const reason = readRequiredText(body, 'reason', 'A reason', 200, fieldErrors);
  if (!reason) throw ServiceError.invalidFields(fieldErrors);
  await withTransaction(database, async (client) => {
    const order = orderNumber ? await lockOrder(client, { orderNumber }) : null;
    if (!order) throw ServiceError.notFound('Order not found.');
    if (['delivered', 'cancelled'].includes(order.status)) throw ServiceError.conflict(`This order is already ${order.status}.`);
    if (order.paymentStatus === 'paid') throw ServiceError.conflict('This order is already paid. Return the money before cancelling.');
    await cancelLockedOrder(client, order, reason);
  });
  notificationService.orderStatusChanged(orderNumber, 'cancelled', { reason });
  return { orderNumber, status: 'cancelled' };
}

// body: { orderNumbers: [1001, 1002], riderId } (riderId null takes the rider off).
async function assignRider({ database, notificationService }, body) {
  const orderNumbers = Array.isArray(body.orderNumbers) ? body.orderNumbers.map(readPositiveInteger) : [];
  if (orderNumbers.length === 0 || orderNumbers.length > maximumOrdersPerAssignment || orderNumbers.includes(null)) {
    throw ServiceError.badRequest('Choose the orders to assign.');
  }
  const riderId = body.riderId === null ? null : readPositiveInteger(body.riderId);
  if (body.riderId !== null && !(riderId && (await isActiveRider(database, riderId)))) {
    throw ServiceError.badRequest('Choose an active rider.');
  }
  const assignedOrderNumbers = await assignRiderToOrders(database, orderNumbers, riderId);
  if (riderId && assignedOrderNumbers.length > 0) notificationService.ridersAssigned(riderId, assignedOrderNumbers.length);
  return { assignedOrderNumbers };
}

export function createAdminOrderService(dependencies) {
  return {
    listOrders: (query) => listOrders(dependencies, query),
    listBoardOrders: (query) => listBoardOrders(dependencies, query),
    moveOrderForward: (staffMember, orderNumberInput, body) => moveOrderForward(dependencies, staffMember, orderNumberInput, body),
    cancelOrder: (orderNumberInput, body) => cancelOrder(dependencies, orderNumberInput, body),
    assignRider: (body) => assignRider(dependencies, body),
  };
}
