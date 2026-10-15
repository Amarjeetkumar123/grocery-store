import { useState } from 'react';
import { Link } from 'react-router';
import { useApiData } from '../useApiData.js';
import { formatRupees, formatShortDate } from '../formatting.js';
import { LoadingOrError } from '../components/LoadingOrError.jsx';
import { TabBar } from '../components/TabBar.jsx';
import { OrderProgress, ReorderButton, StatusPill, deliveryWindowOf, itemCountOf } from './orders/OrderParts.jsx';

const paymentLabels = { cash: 'Paid in cash', upi: 'Paid by UPI' };

function OrderSummaryLine({ order }) {
  const itemCount = itemCountOf(order);
  const parts = [`${itemCount} ${itemCount === 1 ? 'item' : 'items'}`, formatRupees(order.total)];
  if (order.status === 'cancelled') return <p className="hint">{formatShortDate(order.createdAt)} · {order.cancelReason}</p>;
  if (order.status === 'delivered') {
    return <p className="hint">{[formatShortDate(order.createdAt), ...parts, paymentLabels[order.paymentMethod]].filter(Boolean).join(' · ')}</p>;
  }
  return <p className="hint">{[deliveryWindowOf(order), ...parts].join(' · ')}</p>;
}

// "Toor Dal, Sunflower Oil +2 more"
function itemNamesOf(order) {
  const names = order.items.slice(0, 2).map((item) => item.productName).join(', ');
  return order.items.length > 2 ? `${names} +${order.items.length - 2} more` : names;
}

const orderFilters = [
  { key: 'all', label: 'All', matches: () => true },
  { key: 'upcoming', label: 'Upcoming', matches: (order) => !['delivered', 'cancelled'].includes(order.status) },
  { key: 'delivered', label: 'Delivered', matches: (order) => order.status === 'delivered' },
  { key: 'cancelled', label: 'Cancelled', matches: (order) => order.status === 'cancelled' },
];

function OrderFilterChips({ chosenKey, onChoose }) {
  return (
    <div className="chip-row filter-chips" role="group" aria-label="Show orders">
      {orderFilters.map((filter) => (
        <button key={filter.key} type="button" className="chip" aria-pressed={filter.key === chosenKey} onClick={() => onChoose(filter.key)}>{filter.label}</button>
      ))}
    </div>
  );
}

function OrderCard({ order }) {
  const active = !['delivered', 'cancelled'].includes(order.status);
  return (
    <article className="card order-card">
      <div className="card-heading">
        <Link to={`/orders/${order.orderNumber}`} className="order-number">#{order.orderNumber}</Link>
        <StatusPill status={order.status} />
      </div>
      <p className="order-item-names">{itemNamesOf(order)}</p>
      <OrderSummaryLine order={order} />
      {active && <OrderProgress status={order.status} />}
      <div className="order-card-actions">
        <Link to={`/orders/${order.orderNumber}`} className="text-button small-text-button">View details</Link>
        {!active && <ReorderButton order={order} />}
      </div>
    </article>
  );
}

export function OrdersPage() {
  const { data, error, loading, reload } = useApiData('/api/orders');
  const [filterKey, setFilterKey] = useState('all');
  const orders = data?.orders ?? [];
  const shownOrders = orders.filter(orderFilters.find((filter) => filter.key === filterKey).matches);
  return (
    <main className="app-shell">
      <header className="page-bar"><h1>My orders</h1></header>
      <div className="page-body">
        <LoadingOrError loading={loading && !data} error={error} onRetry={reload} />
        {data && orders.length === 0 && (
          <div className="centered-block">
            <p>No orders yet.</p>
            <Link to="/" className="button button-outline">Start shopping</Link>
          </div>
        )}
        {orders.length > 0 && <OrderFilterChips chosenKey={filterKey} onChoose={setFilterKey} />}
        {orders.length > 0 && shownOrders.length === 0 && <p className="hint centered">No orders here.</p>}
        <div className="order-grid">
          {shownOrders.map((order) => <OrderCard key={order.orderNumber} order={order} />)}
        </div>
      </div>
      <TabBar />
    </main>
  );
}
