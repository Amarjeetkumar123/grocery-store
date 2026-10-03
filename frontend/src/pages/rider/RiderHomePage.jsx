import { Link } from 'react-router';
import { useAuthentication } from '../../AuthenticationContext.jsx';
import { formatDeliveryDay, formatRupees, todayInIndia } from '../../formatting.js';
import { Icon } from '../../Icon.jsx';
import { LoadingOrError } from '../../components/LoadingOrError.jsx';
import { mapLinkFor } from '../admin/orders/customerContactLinks.js';
import { groupByZoneAndBlock, useRiderDay } from './riderData.js';

function DeliveryChip({ order, isNext }) {
  if (order.status === 'delivered') return <span className="pill pill-green">✓ {order.paymentMethod === 'upi' ? 'UPI' : 'Cash'}</span>;
  if (isNext) return <span className="pill pill-blue">Next</span>;
  if (order.status === 'packed') return <span className="pill pill-gray">Packed</span>;
  return null;
}

function DeliveryRow({ order, isNext }) {
  const mapLink = mapLinkFor(order);
  const place = order.address.zoneType === 'society' ? order.address.flatNumber : `${order.address.houseNumber}, ${order.address.street}`;
  return (
    <li className={`rider-row${isNext ? ' rider-row-next' : ''}`}>
      <Link to={`/rider/orders/${order.orderNumber}`} className="rider-row-link">
        <strong>{place}</strong>
        <span className="hint">{order.address.landmark && `Near ${order.address.landmark} · `}#{order.orderNumber} · {formatRupees(order.total)}</span>
      </Link>
      <DeliveryChip order={order} isNext={isNext} />
      {mapLink && order.status !== 'delivered' && (
        <a href={mapLink} target="_blank" rel="noreferrer" className="icon-button icon-button-soft" aria-label="Open in Google Maps"><Icon name="pin" /></a>
      )}
    </li>
  );
}

function RiderSummary({ orders, cashInHand }) {
  const delivered = orders.filter((order) => order.status === 'delivered').length;
  return (
    <div className="rider-stats">
      <p><strong>{orders.length}</strong> Orders</p>
      <p><strong>{delivered}</strong> Delivered</p>
      <p><strong>{formatRupees(cashInHand)}</strong> Cash in hand</p>
    </div>
  );
}

export function RiderHomePage() {
  const { account, signOut } = useAuthentication();
  const { orders, data, error, loading, reload } = useRiderDay();
  const zones = groupByZoneAndBlock(orders);
  const nextOrder = zones.flatMap((zone) => zone.blocks.flatMap((block) => block.orders)).find((order) => order.status !== 'delivered');
  return (
    <main className="app-shell">
      <header className="rider-header">
        <div className="card-heading">
          <div><p className="rider-date">{formatDeliveryDay(todayInIndia())}</p><h1>My deliveries</h1></div>
          <button type="button" className="rider-avatar" onClick={signOut} aria-label="Sign out">{account.staffName?.[0] ?? 'R'}</button>
        </div>
        {data && <RiderSummary orders={orders} cashInHand={data.cashInHand} />}
      </header>
      <div className="page-body">
        <LoadingOrError loading={loading && !data} error={error} onRetry={reload} />
        {data && orders.length === 0 && <p className="hint centered">No deliveries for you today yet.</p>}
        {zones.map((zone) => (
          <section key={zone.zoneName} className="rider-zone">
            <h2><Icon name={zone.zoneType === 'society' ? 'building' : 'home'} size={18} /> {zone.zoneName}</h2>
            {zone.blocks.map((block) => (
              <div key={block.name}>
                {zone.zoneType === 'society' && <p className="rider-block-title">{block.name}</p>}
                <ul className="rider-list">
                  {block.orders.map((order) => <DeliveryRow key={order.orderNumber} order={order} isNext={order === nextOrder} />)}
                </ul>
              </div>
            ))}
          </section>
        ))}
        <button type="button" className="text-button" onClick={reload}>Refresh</button>
      </div>
    </main>
  );
}
