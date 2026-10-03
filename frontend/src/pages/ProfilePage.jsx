import { Link } from 'react-router';
import { useAuthentication } from '../AuthenticationContext.jsx';
import { Icon } from '../Icon.jsx';
import { TabBar } from '../components/TabBar.jsx';
import { deliveryAddressLine } from '../formatting.js';
import { AlertsToggle } from '../components/AlertsToggle.jsx';

export function ProfilePage() {
  const { account, signOut } = useAuthentication();
  const { profile } = account;
  return (
    <main className="app-shell">
      <header className="page-bar"><h1>Profile</h1></header>
      <div className="page-body">
        <section className="card">
          <h2>{profile?.name ?? account.email}</h2>
          {profile && <p className="hint">+91 {profile.phone}</p>}
          <p className="hint">{account.email}</p>
        </section>
        {profile && (
          <section className="card">
            <p className="field-label">Delivery address</p>
            <p>{deliveryAddressLine(profile)}</p>
            {profile.landmark && <p className="hint">{profile.landmark}</p>}
          </section>
        )}
        <Link to="/address" className="button button-outline"><Icon name="pin" /> Change address</Link>
        <AlertsToggle />
        <button type="button" className="text-button" onClick={signOut}><Icon name="logout" /> Sign out</button>
      </div>
      <TabBar />
    </main>
  );
}
