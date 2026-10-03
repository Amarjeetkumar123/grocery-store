import {
  deleteSubscription, findSubscriptionsForOrderCustomer, findSubscriptionsForStaffMember, findSubscriptionsForStaffRoles,
} from '../dbHelper/pushSubscriptionDbHelper.js';

const rupees = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`;

// ("2026-10-04", "07:00") -> "Sun 4 Oct, 7 AM"
function deliverySlotText(deliveryDate, startTime) {
  const day = new Date(`${deliveryDate}T00:00:00Z`)
    .toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).replace(',', '');
  const [hours, minutes] = startTime.split(':').map(Number);
  const clock = `${hours % 12 || 12}${minutes ? `:${String(minutes).padStart(2, '0')}` : ''} ${hours < 12 ? 'AM' : 'PM'}`;
  return `${day}, ${clock}`;
}

const customerMessages = {
  confirmed: ({ orderNumber }) => ({ title: `Order #${orderNumber} confirmed`, body: 'We will bring it in the slot you chose.' }),
  out_for_delivery: ({ orderNumber, total }) => ({ title: `Order #${orderNumber} is on the way`, body: `Please keep ${rupees(total)} ready, cash or UPI.` }),
  delivered: ({ orderNumber }) => ({ title: `Order #${orderNumber} delivered`, body: 'Thank you for shopping with us!' }),
  cancelled: ({ orderNumber, reason }) => ({ title: `Order #${orderNumber} cancelled`, body: reason }),
};

// Alerts never hold up or break the action that caused them: they are sent
// after it is saved, and a failure is only logged. The returned promise is
// for tests; callers do not wait for it.
function sendInBackground({ database, pushSender }, findSubscriptions, message) {
  if (!pushSender.isConfigured) return Promise.resolve();
  const sendOne = (subscription) => pushSender.send(subscription, message)
    .then((result) => result === 'gone' && deleteSubscription(database, subscription.endpoint))
    .catch((error) => console.error(`Push alert failed: ${error.message}`));
  return findSubscriptions()
    .then((subscriptions) => Promise.all(subscriptions.map(sendOne)))
    .catch((error) => console.error(`Push alert failed: ${error.message}`));
}

export function createNotificationService(dependencies) {
  const { database } = dependencies;
  const toShop = (message) => sendInBackground(dependencies, () => findSubscriptionsForStaffRoles(database, ['owner', 'packer']), message);
  return {
    // order: { orderNumber, total, deliveryDate, startTime }
    newOrder: (order) => toShop({
      title: `New order #${order.orderNumber}`, body: `${rupees(order.total)} · ${deliverySlotText(order.deliveryDate, order.startTime)} slot`, url: '/admin/orders',
    }),
    customerCancelled: (orderNumber) => toShop({ title: `Order #${orderNumber} cancelled by the customer`, body: 'Do not pack it.', url: '/admin/orders' }),
    // status: confirmed | out_for_delivery | delivered | cancelled; details: { total, reason }
    orderStatusChanged: (orderNumber, status, details = {}) => sendInBackground(
      dependencies,
      () => findSubscriptionsForOrderCustomer(database, orderNumber),
      { ...customerMessages[status]({ orderNumber, ...details }), url: `/orders/${orderNumber}` },
    ),
    ridersAssigned: (riderId, orderCount) => sendInBackground(
      dependencies,
      () => findSubscriptionsForStaffMember(database, riderId),
      { title: `${orderCount} ${orderCount === 1 ? 'delivery' : 'deliveries'} given to you`, body: 'Open My deliveries to see them.', url: '/rider' },
    ),
  };
}
