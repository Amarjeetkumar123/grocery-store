import { NavLink } from 'react-router';
import { Icon } from '../Icon.jsx';
import { useCart } from '../cart/CartContext.jsx';

const tabs = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/search', label: 'Search', icon: 'search' },
  { path: '/cart', label: 'Cart', icon: 'cart' },
  { path: '/orders', label: 'Orders', icon: 'box' },
  { path: '/profile', label: 'Profile', icon: 'user' },
];

export function TabBar() {
  const { itemCount } = useCart();
  return (
    <nav className="tab-bar" aria-label="Main">
      {tabs.map((tab) => (
        <NavLink key={tab.path} to={tab.path} end={tab.path === '/'} className="tab">
          <span className="tab-icon">
            <Icon name={tab.icon} />
            {tab.path === '/cart' && itemCount > 0 && <span className="tab-badge" aria-label={`${itemCount} in cart`}>{itemCount}</span>}
          </span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
