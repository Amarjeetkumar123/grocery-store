import { Link, useParams } from 'react-router';
import { useStoreDetails } from '../../useStoreDetails.js';
import { deliveryAddressLine, formatRupees } from '../../formatting.js';
import { Icon } from '../../Icon.jsx';
import { PageBar } from '../../components/PageBar.jsx';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { StatusPill } from '../orders/OrderParts.jsx';
import { mapLinkFor, whatsAppLinkFor } from '../admin/orders/customerContactLinks.js';
import { useRiderAction, useRiderDay } from './riderData.js';

function CustomerCard({ order }) {
  const store = useStoreDetails();
  const mapLink = mapLinkFor(order);
  return (
    <section className="card">
      <h2>{order.address.customerName}</h2>
      <p className="hint">{deliveryAddressLine(order.address)}{order.address.floor && ` · Floor ${order.address.floor}`}</p>
      {order.address.landmark && <p className="hint">Near {order.address.landmark}</p>}
      <div className="button-pair">
        <a className="button button-outline" href={`tel:+91${order.address.customerPhone}`}><Icon name="user" /> Call</a>
        <a className="button button-outline" href={whatsAppLinkFor(order, store.name)} target="_blank" rel="noreferrer"><Icon name="chat" /> WhatsApp</a>
      </div>
      {mapLink && <a className="button button-quiet" href={mapLink} target="_blank" rel="noreferrer"><Icon name="pin" /> Open in Google Maps</a>}
    </section>
  );
}

function ItemList({ order }) {
  return (
    <section className="card detail-list">
      <p className="field-label">Items · {order.items.reduce((sum, item) => sum + item.quantity, 0)}</p>
      {order.items.map((item) => (
        <div key={item.packSizeId} className="detail-row"><span>{item.productName} {item.packLabel}</span><strong>× {item.quantity}</strong></div>
      ))}
    </section>
  );
}

// packed -> Start delivery; out for delivery -> payment, then Mark delivered.
function DoorActions({ order, action }) {
  const paid = order.paymentStatus === 'paid';
  if (order.status === 'delivered') return <p className="notice notice-success"><Icon name="check" size={18} /> Delivered · paid by {order.paymentMethod === 'upi' ? 'UPI' : 'cash'}</p>;
  if (order.status === 'packed') {
    return <button type="button" className="button button-large" disabled={action.busy} onClick={() => action.run('start')}><Icon name="truck" /> Start delivery</button>;
  }
  async function cashCollected() {
    if (window.confirm(`Collected ${formatRupees(order.total)} in cash?`)) await action.run('payment', { method: 'cash' });
  }
  return (
    <>
      {paid ? <p className="notice notice-success"><Icon name="check" size={18} /> Paid by {order.paymentMethod === 'upi' ? 'UPI' : 'cash'}</p> : (
        <div className="button-pair">
          <button type="button" className="button button-outline button-large" disabled={action.busy} onClick={cashCollected}><Icon name="cash" /> Cash collected</button>
          <Link to={`/rider/orders/${order.orderNumber}/pay`} className="button button-large"><Icon name="layers" /> Show UPI QR</Link>
        </div>
      )}
      <button type="button" className="button button-large" disabled={!paid || action.busy} onClick={() => action.run('delivered')}>
        <Icon name="check" /> Mark delivered
      </button>
      {!paid && <p className="hint centered-text">Unlocks after payment is marked</p>}
    </>
  );
}

export function RiderOrderPage() {
  const orderNumber = Number(useParams().orderNumber);
  const { orders, data, error, loading, reload } = useRiderDay();
  const action = useRiderAction(orderNumber, reload);
  const order = orders.find((candidate) => candidate.orderNumber === orderNumber);
  return (
    <main className="app-shell">
      <PageBar title={`Order #${orderNumber}`}>{order && <StatusPill status={order.status} />}</PageBar>
      <div className="page-body">
        <LoadingOrError loading={loading && !data} error={error} onRetry={reload} />
        {data && !order && <p className="hint centered">This order is not in your deliveries today.</p>}
        {order && (
          <>
            <CustomerCard order={order} />
            <ItemList order={order} />
            <section className="collect-box"><p>Collect at door</p><strong>{formatRupees(order.total)}</strong></section>
            {action.error && <p className="error-text" role="alert">{action.error}</p>}
            <DoorActions order={order} action={action} />
          </>
        )}
      </div>
    </main>
  );
}
