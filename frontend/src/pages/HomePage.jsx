import { Link, Navigate } from 'react-router';
import { useAuthentication } from '../AuthenticationContext.jsx';
import { useStoreDetails } from '../useStoreDetails.js';
import logoImage from '../assets/logo.png';
import { Icon } from '../Icon.jsx';

const staffHomeByRole = { owner: '/admin', packer: '/admin', rider: '/rider' };

function deliveryAddressLine(profile) {
  if (profile.zoneType === 'society') return `${profile.zoneName} · ${profile.towerName} · ${profile.flatNumber}`;
  return `${profile.houseNumber}, ${profile.street} · ${profile.zoneName}`;
}

// Week 1: shows the saved address. The product catalogue arrives in Week 2.
export function HomePage() {
  const { account, signOut } = useAuthentication();
  const store = useStoreDetails();

  if (staffHomeByRole[account.role]) return <Navigate to={staffHomeByRole[account.role]} replace />;
  if (!account.profile) return <Navigate to="/address" replace />;

  return (
    <main className="app-shell">
      <header className="store-header">
        <div className="brand">
          <img className="store-logo" src={logoImage} alt="" />
          {store.name}
        </div>
        <Link to="/address" className="delivery-line">
          <Icon name="pin" size={16} /> Delivering to <strong>{deliveryAddressLine(account.profile)}</strong>
        </Link>
      </header>
      <div className="page-body">
        <section className="card">
          <h2>Hi {account.profile.name}!</h2>
          <p className="hint">Products will appear here soon.</p>
        </section>
        <Link to="/address" className="button button-outline">Change address</Link>
        <button type="button" className="text-button" onClick={signOut}>Sign out</button>
      </div>
    </main>
  );
}
