import { Link, Navigate } from 'react-router';
import { useAuthentication } from '../AuthenticationContext.jsx';
import { useStoreDetails } from '../useStoreDetails.js';
import { Icon } from '../Icon.jsx';
import { deliveryAddressLine } from '../formatting.js';
import { TabBar } from '../components/TabBar.jsx';
import { CartBar } from '../components/CartBar.jsx';
import { CategoryGrid } from './home/CategoryGrid.jsx';
import { HomeBanners } from './home/HomeBanners.jsx';
import { NextSlotsCard, PopularProducts } from './home/HomeSections.jsx';
import { AlertsBell } from '../components/AlertsToggle.jsx';
import logoImage from '../assets/logo.png';

const staffHomeByRole = { owner: '/admin', packer: '/admin', rider: '/rider' };

function StoreHeader({ profile }) {
  const store = useStoreDetails();
  return (
    <>
      <header className="store-header">
        <div className="brand">
          <img className="store-logo" src={logoImage} alt="" />
          <span className="brand-name-text">{store.name}</span>
          <AlertsBell />
        </div>
        <Link to="/address" className="delivery-line">
          <span className="delivery-pin"><Icon name="pin" size={16} /></span>
          Deliver to <strong>{deliveryAddressLine(profile)}</strong>
          <Icon name="down" size={16} />
        </Link>
      </header>
      <Link to="/search" className="search-box search-box-floating">
        <Icon name="search" /> Search groceries &amp; essentials…
      </Link>
    </>
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
        <div className="home-hero">
          <HomeBanners />
          <NextSlotsCard />
        </div>
        <section className="home-section">
          <h2 className="section-title">Explore categories</h2>
          <CategoryGrid />
        </section>
        <PopularProducts />
      </div>
      <CartBar aboveTabBar />
      <TabBar />
    </main>
  );
}
