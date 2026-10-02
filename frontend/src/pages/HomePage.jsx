import { Link, Navigate } from 'react-router';
import { useAuthentication } from '../AuthenticationContext.jsx';
import { useStoreDetails } from '../useStoreDetails.js';
import { Icon } from '../Icon.jsx';
import { deliveryAddressLine } from '../formatting.js';
import { TabBar } from '../components/TabBar.jsx';
import { CategoryGrid } from './home/CategoryGrid.jsx';
import logoImage from '../assets/logo.png';

const staffHomeByRole = { owner: '/admin', packer: '/admin', rider: '/rider' };

function StoreHeader({ profile }) {
  const store = useStoreDetails();
  return (
    <header className="store-header">
      <div className="brand">
        <img className="store-logo" src={logoImage} alt="" />
        {store.name}
      </div>
      <Link to="/address" className="delivery-line">
        <Icon name="pin" size={16} /> Delivering to <strong>{deliveryAddressLine(profile)}</strong>
      </Link>
      <Link to="/search" className="search-box">
        <Icon name="search" /> Search atta, oil, dal…
      </Link>
    </header>
  );
}

export function HomePage() {
  const { account } = useAuthentication();
  if (staffHomeByRole[account.role]) return <Navigate to={staffHomeByRole[account.role]} replace />;
  if (!account.profile) return <Navigate to="/address" replace />;

  return (
    <main className="app-shell">
      <StoreHeader profile={account.profile} />
      <div className="page-body">
        <p className="offer-banner"><Icon name="cash" /> Pay at your door · Cash or UPI</p>
        <h2 className="section-title">Shop by category</h2>
        <CategoryGrid />
      </div>
      <TabBar />
    </main>
  );
}
