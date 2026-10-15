import { NavLink } from 'react-router';
import { Icon } from '../Icon.jsx';
import { useCart } from '../cart/CartContext.jsx';

const tabs = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/search', label: 'Search', icon: 'search' },
  { path: '/orders', label: 'Orders', icon: 'box' },
  { path: '/profile', label: 'Profile', icon: 'user' },
];

function TabLink({ tab }) {
  return (
    <NavLink to={tab.path} end={tab.path === '/'} className="tab">
      <span className="tab-icon"><Icon name={tab.icon} /></span>
      {tab.label}
    </NavLink>
  );
}

// Phones and tablets. Cart is a button: it slides the cart panel in.
export function TabBar() {
  const { itemCount, cartOpen, openCart } = useCart();
  return (
    <nav className="tab-bar" aria-label="Main">
      {tabs.slice(0, 2).map((tab) => <TabLink key={tab.path} tab={tab} />)}
      <button type="button" className={cartOpen ? 'tab active' : 'tab'} onClick={openCart}>
        <span className="tab-icon">
          <Icon name="cart" />
          {itemCount > 0 && <span className="tab-badge" aria-label={`${itemCount} in cart`}>{itemCount}</span>}
        </span>
        Cart
      </button>
      {tabs.slice(2).map((tab) => <TabLink key={tab.path} tab={tab} />)}
    </nav>
  );
}
