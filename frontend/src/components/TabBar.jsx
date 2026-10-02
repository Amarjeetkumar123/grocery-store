import { NavLink } from 'react-router';
import { Icon } from '../Icon.jsx';

// Cart and Orders tabs arrive with checkout (Week 3).
const tabs = [
  { path: '/', label: 'Home', icon: 'home' },
  { path: '/search', label: 'Search', icon: 'search' },
  { path: '/profile', label: 'Profile', icon: 'user' },
];

export function TabBar() {
  return (
    <nav className="tab-bar" aria-label="Main">
      {tabs.map((tab) => (
        <NavLink key={tab.path} to={tab.path} end className="tab">
          <Icon name={tab.icon} />
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
