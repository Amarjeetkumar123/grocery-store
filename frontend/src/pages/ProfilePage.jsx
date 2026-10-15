import { Link } from 'react-router';
import { useAuthentication } from '../AuthenticationContext.jsx';
import { useApiData } from '../useApiData.js';
import { Icon } from '../Icon.jsx';
import { TabBar } from '../components/TabBar.jsx';
import { deliveryAddressLine, formatRupees } from '../formatting.js';
import { AlertsToggle } from '../components/AlertsToggle.jsx';
import { StatusPill, deliveryWindowOf } from './orders/OrderParts.jsx';

// "AK" for "Amarjeet Kumar"
const initialsOf = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0].toUpperCase()).join('');

function RecentOrders() {
  const { data } = useApiData('/api/orders');
  const orders = (data?.orders ?? []).slice(0, 3);
  if (orders.length === 0) return null;
  return (
    <section className="card recent-orders">
      <div className="card-heading"><h2>Recent orders</h2><Link to="/orders" className="text-button small-text-button">See all</Link></div>
      {orders.map((order) => (
        <Link key={order.orderNumber} to={`/orders/${order.orderNumber}`} className="recent-order-row">
          <span><strong>#{order.orderNumber}</strong><span className="hint">{deliveryWindowOf(order)} · {formatRupees(order.total)}</span></span>
          <StatusPill status={order.status} />
        </Link>
      ))}
    </section>
  );
}

export function ProfilePage() {
  const { account, signOut } = useAuthentication();
  const { profile } = account;
  const name = profile?.name ?? account.email;
  return (
    <main className="app-shell">
      <header className="page-bar"><h1>Profile</h1></header>
      <div className="page-body profile-layout">
        <div className="column-stack">
          <section className="card profile-card">
            <span className="profile-avatar" aria-hidden="true">{initialsOf(name)}</span>
            <div><h2>{name}</h2>{profile && <p className="hint">+91 {profile.phone}</p>}<p className="hint">{account.email}</p></div>
          </section>
          <AlertsToggle />
          <button type="button" className="text-button danger-text" onClick={signOut}><Icon name="logout" /> Sign out</button>
        </div>
        <div className="column-stack">
          <section className="card">
            <h2>Delivery address</h2>
            {profile && <p>{deliveryAddressLine(profile)}</p>}
            {profile?.landmark && <p className="hint">{profile.landmark}</p>}
            <Link to="/address" className="button button-outline address-change-button"><Icon name="pin" /> {profile ? 'Change address' : 'Add address'}</Link>
          </section>
          <RecentOrders />
        </div>
      </div>
      <TabBar />
    </main>
  );
}
