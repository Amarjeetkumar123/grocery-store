import { useNavigate } from 'react-router';
import { useCart } from '../../cart/CartContext.jsx';
import { formatDeliveryDay, formatTimeRange } from '../../formatting.js';

const progressSteps = [
  { status: 'new', label: 'Placed' },
  { status: 'confirmed', label: 'Confirmed' },
  { status: 'packed', label: 'Packed' },
  { status: 'out_for_delivery', label: 'On the way' },
  { status: 'delivered', label: 'Delivered' },
];

const statusPills = {
  new: ['Placed', 'pill-amber'],
  confirmed: ['Confirmed', 'pill-blue'],
  packed: ['Packed', 'pill-blue'],
  out_for_delivery: ['On the way', 'pill-blue'],
  delivered: ['Delivered', 'pill-green'],
  cancelled: ['Cancelled', 'pill-gray'],
};

export const cancellableStatuses = ['new', 'confirmed'];

export function StatusPill({ status }) {
  const [label, colorClass] = statusPills[status];
  return <span className={`pill ${colorClass}`}>{label}</span>;
}

// Placed -> Confirmed -> Packed -> On the way -> Delivered
export function OrderProgress({ status }) {
  const reachedIndex = progressSteps.findIndex((step) => step.status === status);
  return (
    <ol className="order-progress" aria-label="Order progress">
      {progressSteps.map((step, index) => (
        <li key={step.status} className={index <= reachedIndex ? 'order-progress-reached' : ''}
          aria-current={index === reachedIndex ? 'step' : undefined}>
          <span className="order-progress-dot" />
          {step.label}
        </li>
      ))}
    </ol>
  );
}

// "Tomorrow, 7–9 AM"
export function deliveryWindowOf(order) {
  return `${formatDeliveryDay(order.deliveryDate)}, ${formatTimeRange(order.slot.startTime, order.slot.endTime)}`;
}

export function itemCountOf(order) {
  return order.items.reduce((sum, item) => sum + item.quantity, 0);
}

// Puts the same items in the cart again; the cart shows today's prices.
export function ReorderButton({ order, className = 'button button-compact' }) {
  const { addItems } = useCart();
  const navigate = useNavigate();
  function reorder() {
    addItems(order.items.map(({ packSizeId, quantity }) => ({ packSizeId, quantity })));
    navigate('/cart');
  }
  return <button type="button" className={className} onClick={reorder}>Reorder</button>;
}
