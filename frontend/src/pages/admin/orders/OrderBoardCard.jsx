import { useState } from 'react';
import { callApi } from '../../../apiClient.js';
import { useAuthentication } from '../../../AuthenticationContext.jsx';
import { useStoreDetails } from '../../../useStoreDetails.js';
import { useSaveRequest } from '../../../useSaveRequest.js';
import { formatDeliveryDay, formatRupees, formatTimeAgo, formatTimeRange } from '../../../formatting.js';
import { Icon } from '../../../Icon.jsx';
import { useDialog } from '../../../components/DialogProvider.jsx';
import { useToast } from '../../../components/ToastProvider.jsx';
import { itemCountOf, shortAddressOf } from './orderBoardData.js';
import { mapLinkFor, whatsAppLinkFor } from './customerContactLinks.js';
import { RiderPicker } from './RiderPicker.jsx';

const itemsLabel = (count) => `${count} ${count === 1 ? 'item' : 'items'}`;

// The button that moves an order to the next column, and who sees it.
const nextSteps = {
  new: { status: 'confirmed', label: 'Confirm', done: 'confirmed', icon: 'check', roles: ['owner'] },
  confirmed: { status: 'packed', label: 'Mark packed', done: 'packed', icon: 'box', roles: ['owner', 'packer'] },
  packed: { status: 'out_for_delivery', label: 'Out for delivery', done: 'is out for delivery', icon: 'truck', roles: ['owner'] },
};

function CardBadges({ order, isOwner, save, onChanged }) {
  const { customer } = order;
  const showToast = useToast();
  async function confirmPhone() {
    if (!(await save(() => callApi(`/api/admin/customers/${customer.id}`, { method: 'PUT', body: { phoneConfirmed: true } })))) return;
    showToast(`${order.address.customerName}'s phone confirmed`);
    onChanged();
  }
  if (order.status !== 'new' || (!customer.firstOrder && customer.phoneConfirmed)) return null;
  return (
    <div className="badge-cell">
      {customer.firstOrder && <span className="pill pill-amber">New customer</span>}
      {!customer.phoneConfirmed && <span className="pill pill-red">Phone not confirmed</span>}
      {!customer.phoneConfirmed && isOwner && <button type="button" className="text-button small-text-button" onClick={confirmPhone}>Phone OK</button>}
    </div>
  );
}

// Owner at the counter, or a rider without a phone: payment and delivered in one tap.
function OwnerDeliveredButtons({ order, save, onChanged }) {
  const dialog = useDialog();
  const showToast = useToast();
  async function markDelivered(method) {
    const orderPath = `/api/admin/orders/${order.orderNumber}`;
    const paidBy = method ? ` by ${method === 'upi' ? 'UPI' : 'cash'}` : '';
    const confirmed = await dialog.confirm({
      title: `Order #${order.orderNumber} delivered?`, message: `${formatRupees(order.total)} received${paidBy}.`,
      confirmLabel: 'Mark delivered', icon: method === 'cash' ? 'cash' : 'check',
    });
    if (!confirmed) return;
    const paid = method ? await save(() => callApi(`${orderPath}/payment`, { method: 'POST', body: { method } })) : true;
    if (!paid || !(await save(() => callApi(`${orderPath}/delivered`, { method: 'POST', body: {} })))) return;
    showToast(`Order #${order.orderNumber} delivered`);
    onChanged();
  }
  if (order.paymentStatus === 'paid') {
    return <button type="button" className="button button-compact" onClick={() => markDelivered(null)}><Icon name="check" size={18} /> Delivered</button>;
  }
  return (
    <>
      <button type="button" className="button button-compact" onClick={() => markDelivered('cash')}>Delivered · Cash</button>
      <button type="button" className="button button-compact button-outline" onClick={() => markDelivered('upi')}>UPI</button>
    </>
  );
}

function CardActions({ order, role, save, onChanged }) {
  const store = useStoreDetails();
  const step = nextSteps[order.status];
  const mapLink = mapLinkFor(order);
  const [moving, setMoving] = useState(false);
  const showToast = useToast();
  // The spinner stays until the board has reloaded and the card has moved column.
  async function moveForward() {
    setMoving(true);
    if (await save(() => callApi(`/api/admin/orders/${order.orderNumber}/status`, { method: 'POST', body: { status: step.status } }))) {
      showToast(`Order #${order.orderNumber} ${step.done}`);
      await onChanged();
    }
    setMoving(false);
  }
  return (
    <div className="board-card-actions">
      {step?.roles.includes(role) && (
        <button type="button" className="button button-compact" onClick={moveForward} disabled={moving || (step.status === 'out_for_delivery' && !order.rider)}>
          {moving ? <span className="spinner" aria-hidden="true" /> : <Icon name={step.icon} size={18} />} {step.label}
        </button>
      )}
      {order.status === 'out_for_delivery' && role === 'owner' && <OwnerDeliveredButtons order={order} save={save} onChanged={onChanged} />}
      <a className="icon-button icon-button-outline icon-button-whatsapp" href={whatsAppLinkFor(order, store.name)} target="_blank" rel="noreferrer" aria-label={`WhatsApp ${order.address.customerName}`}>
        <Icon name="chat" />
      </a>
      {mapLink && <a className="icon-button icon-button-outline" href={mapLink} target="_blank" rel="noreferrer" aria-label="Open in Google Maps"><Icon name="pin" /></a>}
    </div>
  );
}

function CardDetails({ order, isOwner, save, onChanged }) {
  const dialog = useDialog();
  const showToast = useToast();
  async function cancelOrder() {
    const reason = await dialog.prompt({
      title: `Cancel order #${order.orderNumber}?`, message: 'The customer will see the reason, and the stock goes back on the shelf.',
      label: 'Reason', placeholder: 'For example: Out of stock, sorry', multiline: true, required: true,
      confirmLabel: 'Cancel order', cancelLabel: 'Keep order', tone: 'danger', icon: 'close',
    });
    if (!reason || !(await save(() => callApi(`/api/admin/orders/${order.orderNumber}/cancel`, { method: 'POST', body: { reason } })))) return;
    showToast(`Order #${order.orderNumber} cancelled`);
    onChanged();
  }
  return (
    <details className="board-card-details">
      <summary>Items and contact</summary>
      <ul>{order.items.map((item) => <li key={item.packSizeId}>{item.productName} · {item.packLabel} × {item.quantity}</li>)}</ul>
      <p className="hint">{order.address.customerName} · <a href={`tel:+91${order.address.customerPhone}`}>{order.address.customerPhone}</a></p>
      {order.address.landmark && <p className="hint">Near {order.address.landmark}</p>}
      {isOwner && order.status !== 'delivered' && order.paymentStatus !== 'paid' && <button type="button" className="text-button small-text-button danger-text" onClick={cancelOrder}>Cancel order</button>}
    </details>
  );
}

function CardCorner({ order }) {
  if (order.status === 'new') return <small className="board-card-corner">{formatTimeAgo(order.createdAt)}</small>;
  if (order.status === 'out_for_delivery') return <small className="board-card-corner">{order.rider?.name}</small>;
  if (order.paymentStatus === 'paid') return <span className="pill pill-green">{order.paymentMethod === 'upi' ? 'UPI' : 'Cash'} ✓</span>;
  return <span className="pill pill-gray">{order.status === 'delivered' ? 'Unpaid' : 'Cash/UPI'}</span>;
}

export function OrderBoardCard({ order, riders, onChanged }) {
  const { account } = useAuthentication();
  const isOwner = account.role === 'owner';
  const { error, save } = useSaveRequest();
  const shared = { order, save, onChanged };
  return (
    <article className={`board-card${order.status === 'new' && !order.customer.phoneConfirmed ? ' board-card-attention' : ''}`}>
      <div className="board-card-top"><strong>#{order.orderNumber}</strong><CardCorner order={order} /></div>
      <p className="board-card-place"><small>{order.address.zoneName}</small><strong>{shortAddressOf(order)}</strong></p>
      <p className="board-card-meta"><Icon name="clock" size={15} /> {formatDeliveryDay(order.deliveryDate)} · {formatTimeRange(order.slot.startTime, order.slot.endTime)}</p>
      <p className="board-card-meta board-card-total"><span>{itemsLabel(itemCountOf(order))}</span><strong>{formatRupees(order.total)}</strong></p>
      <CardBadges {...shared} isOwner={isOwner} />
      {order.status === 'packed' && isOwner && <RiderPicker orderNumbers={[order.orderNumber]} rider={order.rider} riders={riders} save={save} onChanged={onChanged} />}
      <CardActions {...shared} role={account.role} />
      {error && <p className="field-error" role="alert">{error}</p>}
      <CardDetails {...shared} isOwner={isOwner} />
    </article>
  );
}
