import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { useAuthentication } from '../AuthenticationContext.jsx';
import { useStoreDetails } from '../useStoreDetails.js';
import { useApiData } from '../useApiData.js';
import { callApi } from '../apiClient.js';
import { deliveryAddressLine, formatRupees } from '../formatting.js';
import { Icon } from '../Icon.jsx';
import { PageBar } from '../components/PageBar.jsx';
import { LoadingOrError } from '../components/LoadingOrError.jsx';
import { AlertsToggle } from '../components/AlertsToggle.jsx';
import { OrderProgress, ReorderButton, StatusPill, cancellableStatuses, deliveryWindowOf } from './orders/OrderParts.jsx';

function OrderPlacedHeader({ orderNumber }) {
  return (
    <div className="order-placed">
      <span className="order-placed-tick"><Icon name="check" size={44} /></span>
      <h2>Order placed!</h2>
      <p className="hint">Order <strong>#{orderNumber}</strong></p>
    </div>
  );
}

// Free phone check: the customer sends a ready-made WhatsApp message.
function ConfirmOnWhatsApp({ order }) {
  const { account } = useAuthentication();
  const store = useStoreDetails();
  if (account.profile?.phoneConfirmed || !store.whatsappNumber) return null;
  const message = `Hi, I placed order #${order.orderNumber}. Please confirm my number ${order.address.customerPhone}.`;
  return (
    <section className="card whatsapp-card">
      <h2>One step for your first order</h2>
      <p className="hint">Tap below and press send in WhatsApp. It confirms your number so we can deliver.</p>
      <a className="button" href={`https://wa.me/91${store.whatsappNumber}?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
        <Icon name="chat" /> Confirm on WhatsApp
      </a>
    </section>
  );
}

function OrderFacts({ order }) {
  const rows = [
    ['Delivery', deliveryWindowOf(order)],
    ['Address', deliveryAddressLine(order.address)],
    ['Payment', order.paymentStatus === 'paid' ? `Paid by ${order.paymentMethod === 'upi' ? 'UPI' : 'cash'}` : 'At door · Cash / UPI'],
  ];
  return (
    <section className="card detail-list">
      {rows.map(([label, value]) => <div key={label} className="detail-row"><span className="hint">{label}</span><strong>{value}</strong></div>)}
      {order.status === 'cancelled' && <p className="hint">{order.cancelReason}</p>}
    </section>
  );
}

function OrderItems({ order }) {
  return (
    <section className="card detail-list">
      {order.items.map((item) => (
        <div key={item.packSizeId} className="detail-row">
          <span>{item.productName} · {item.packLabel} × {item.quantity}</span>
          <span>{formatRupees(item.unitPrice * item.quantity)}</span>
        </div>
      ))}
      <div className="detail-row"><span>Delivery</span><span>{order.deliveryCharge > 0 ? formatRupees(order.deliveryCharge) : 'FREE'}</span></div>
      <div className="detail-row bill-total"><span>Amount</span><span>{formatRupees(order.total)}</span></div>
    </section>
  );
}

function CancelOrderButton({ order, onCancelled }) {
  const [state, setState] = useState({ cancelling: false, error: null });
  if (!cancellableStatuses.includes(order.status)) return null;
  async function cancelOrder() {
    if (!window.confirm(`Cancel order #${order.orderNumber}?`)) return;
    setState({ cancelling: true, error: null });
    try {
      await callApi(`/api/orders/${order.orderNumber}/cancel`, { method: 'POST' });
      onCancelled();
    } catch (error) {
      setState({ cancelling: false, error: error.message });
    }
  }
  return (
    <>
      {state.error && <p className="error-text" role="alert">{state.error}</p>}
      <button type="button" className="text-button danger-text" onClick={cancelOrder} disabled={state.cancelling}>
        {state.cancelling ? 'Cancelling…' : 'Cancel order'}
      </button>
    </>
  );
}

export function OrderDetailPage() {
  const { orderNumber } = useParams();
  const justPlaced = useLocation().state?.justPlaced;
  const { data, error, loading, reload } = useApiData(`/api/orders/${encodeURIComponent(orderNumber)}`);
  const order = data?.order;
  return (
    <main className="app-shell">
      <PageBar title={`Order #${orderNumber}`} />
      <div className="page-body">
        <LoadingOrError loading={loading && !order} error={error} onRetry={reload} />
        {order && (
          <>
            {justPlaced ? <OrderPlacedHeader orderNumber={order.orderNumber} /> : <StatusPill status={order.status} />}
            {order.status !== 'cancelled' && <OrderProgress status={order.status} />}
            <OrderFacts order={order} />
            {justPlaced && <ConfirmOnWhatsApp order={order} />}
            {justPlaced && <AlertsToggle label="alerts for this order" />}
            <OrderItems order={order} />
            <div className="button-pair">
              {!justPlaced && <ReorderButton order={order} className="button button-outline" />}
              <Link to="/" className="button button-quiet">Keep shopping</Link>
            </div>
            <CancelOrderButton order={order} onCancelled={reload} />
          </>
        )}
      </div>
    </main>
  );
}
