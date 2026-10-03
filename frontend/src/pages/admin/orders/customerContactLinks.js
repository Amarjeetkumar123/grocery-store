import { formatRupees } from '../../../formatting.js';
import { deliveryWindowOf } from '../../orders/OrderParts.jsx';

// Free one-tap WhatsApp: opens WhatsApp with a ready message to the customer.
// Nothing is sent until the owner presses send.
function messageFor(order, storeName) {
  const firstName = order.address.customerName.split(' ')[0];
  const number = `#${order.orderNumber}`;
  const when = deliveryWindowOf(order).replace(/^(Today|Tomorrow)/, (word) => word.toLowerCase());
  const amount = formatRupees(order.total);
  const messages = {
    new: `Hi ${firstName}, we have received your order ${number} from ${storeName}. We will deliver it ${when}. Total ${amount}, pay at the door by cash or UPI.`,
    confirmed: `Hi ${firstName}, your order ${number} from ${storeName} is confirmed for ${when}. Total ${amount}, pay at the door by cash or UPI.`,
    packed: `Hi ${firstName}, your order ${number} is packed and will reach you ${when}.`,
    out_for_delivery: `Hi ${firstName}, your order ${number} is on the way. Please keep ${amount} ready (cash or UPI).`,
    delivered: `Hi ${firstName}, thank you for shopping with ${storeName}!`,
    cancelled: `Hi ${firstName}, sorry, your order ${number} was cancelled: ${order.cancelReason}`,
  };
  return messages[order.status];
}

export function whatsAppLinkFor(order, storeName) {
  return `https://wa.me/91${order.address.customerPhone}?text=${encodeURIComponent(messageFor(order, storeName))}`;
}

// Only when the customer shared their GPS location (local areas).
export function mapLinkFor(order) {
  const { latitude, longitude } = order.address;
  return latitude === null ? null : `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}
