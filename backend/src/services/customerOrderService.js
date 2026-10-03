import { withTransaction } from '../dbHelper/databaseConnection.js';
import { findCustomerWithProfileByUserId } from '../dbHelper/customerDbHelper.js';
import { findCustomerOrder, findCustomerOrders, lockOrder } from '../dbHelper/orderDbHelper.js';
import { cancelLockedOrder } from './orderCancellation.js';
import { readPositiveInteger } from '../validators/commonValidation.js';
import { ServiceError } from './serviceError.js';

// Once packed, the order is on its way; the customer calls the store instead.
const cancellableStatuses = ['new', 'confirmed'];

async function findCustomerId(database, user) {
  const customer = await findCustomerWithProfileByUserId(database, user.id);
  return customer?.customerId ?? null;
}

async function listMyOrders({ database }, user) {
  const customerId = await findCustomerId(database, user);
  return { orders: customerId ? await findCustomerOrders(database, customerId) : [] };
}

async function getMyOrder({ database }, user, orderNumberInput) {
  const orderNumber = readPositiveInteger(orderNumberInput);
  const customerId = await findCustomerId(database, user);
  const order = orderNumber && customerId ? await findCustomerOrder(database, customerId, orderNumber) : null;
  if (!order) throw ServiceError.notFound('Order not found.');
  return { order };
}

function checkCanCancel(order) {
  if (!order) throw ServiceError.notFound('Order not found.');
  if (order.status === 'cancelled') throw ServiceError.conflict('This order is already cancelled.');
  if (!cancellableStatuses.includes(order.status)) {
    throw ServiceError.conflict('This order is already packed, so it can no longer be cancelled here. Please call the store.');
  }
}

async function cancelMyOrder(dependencies, user, orderNumberInput) {
  const { database } = dependencies;
  const orderNumber = readPositiveInteger(orderNumberInput);
  const customerId = await findCustomerId(database, user);
  if (!orderNumber || !customerId) throw ServiceError.notFound('Order not found.');

  await withTransaction(database, async (client) => {
    const order = await lockOrder(client, { orderNumber, customerId });
    checkCanCancel(order);
    await cancelLockedOrder(client, order, 'Cancelled by customer');
  });
  return getMyOrder(dependencies, user, orderNumber);
}

export function createCustomerOrderService(dependencies) {
  return {
    listMyOrders: (user) => listMyOrders(dependencies, user),
    getMyOrder: (user, orderNumberInput) => getMyOrder(dependencies, user, orderNumberInput),
    cancelMyOrder: (user, orderNumberInput) => cancelMyOrder(dependencies, user, orderNumberInput),
  };
}
