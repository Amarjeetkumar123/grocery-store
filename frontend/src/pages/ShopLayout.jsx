import { useEffect } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router';
import { useAuthentication } from '../AuthenticationContext.jsx';
import { useCart } from '../cart/CartContext.jsx';
import { useStoreDetails } from '../useStoreDetails.js';
import { deliveryAddressLine } from '../formatting.js';
import { Icon } from '../Icon.jsx';
import { CartDrawer } from './cart/CartDrawer.jsx';
import logoImage from '../assets/logo.png';

const topLinks = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/orders', label: 'Orders', icon: 'box' },
  { path: '/profile', label: 'Profile', icon: 'user' },
];

// Computers only (hidden on phones and tablets, which keep the tab bar).
function ShopTopBar() {
  const { account } = useAuthentication();
  const { itemCount, openCart } = useCart();
  const store = useStoreDetails();
  return (
    <nav className="shop-top-bar" aria-label="Shop">
      <div className="shop-top-bar-inner">
        <Link to="/" className="shop-top-brand"><img src={logoImage} alt="" />{store.name}</Link>
        {account.profile && (
          <Link to="/address" className="shop-top-address"><span className="hint">Deliver to</span><strong>{deliveryAddressLine(account.profile)}</strong></Link>
        )}
        <Link to="/search" className="shop-top-search"><Icon name="search" size={18} /> Search groceries &amp; essentials…</Link>
        <div className="shop-top-links">
          {topLinks.map((link) => (
            <NavLink key={link.path} to={link.path} end={link.path === '/'} className="shop-top-link"><Icon name={link.icon} size={18} />{link.label}</NavLink>
          ))}
          <button type="button" className="shop-top-cart" onClick={openCart}>
            <Icon name="cart" size={18} /> Cart{itemCount > 0 && <span className="shop-top-cart-count">{itemCount}</span>}
          </button>
        </div>
      </div>
    </nav>
  );
}

// Every customer page: the top bar on computers, the page, and the cart panel.
export function ShopLayout() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <>
      <ShopTopBar />
      <Outlet />
      <CartDrawer />
    </>
  );
}

// Old /cart links (bookmarks, alerts): open the cart panel over the home page.
export function OpenCartRoute() {
  const { openCart } = useCart();
  useEffect(openCart, [openCart]);
  return <Navigate to="/" replace />;
}
