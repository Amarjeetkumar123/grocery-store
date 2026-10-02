import { Navigate, NavLink, Outlet } from 'react-router';
import { useAuthentication } from '../../AuthenticationContext.jsx';
import { useStoreDetails } from '../../useStoreDetails.js';
import { Icon } from '../../Icon.jsx';
import logoImage from '../../assets/logo.png';

// The order board, staff and reports join this menu in Weeks 4 and 5.
const navigationItems = [
  { path: '/admin/products', label: 'Products', icon: 'tag', roles: ['owner'] },
  { path: '/admin/stock', label: 'Stock', icon: 'layers', roles: ['owner', 'packer'] },
  { path: '/admin/zones', label: 'Zones & slots', icon: 'pin', roles: ['owner'] },
  { path: '/admin/store-settings', label: 'Store settings', icon: 'settings', roles: ['owner'] },
];

const roleLabels = { owner: 'Owner', packer: 'Packer' };

export function AdminLayout() {
  const { account, signOut } = useAuthentication();
  const store = useStoreDetails();
  const visibleItems = navigationItems.filter((item) => item.roles.includes(account.role));
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand"><img className="store-logo" src={logoImage} alt="" /> {store.name}</div>
        <nav aria-label="Admin">
          {visibleItems.map((item) => (
            <NavLink key={item.path} to={item.path} className="admin-navigation-link">
              <Icon name={item.icon} /> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-user">
          <p>{account.staffName} <span>· {roleLabels[account.role]}</span></p>
          <button type="button" className="admin-navigation-link" onClick={signOut}><Icon name="logout" /> Sign out</button>
        </div>
      </aside>
      <main className="admin-main"><Outlet /></main>
    </div>
  );
}

// /admin opens the first page this role can use.
export function AdminHomeRedirect() {
  const { account } = useAuthentication();
  return <Navigate to={account.role === 'owner' ? '/admin/products' : '/admin/stock'} replace />;
}

export function AdminPageHeader({ title, children }) {
  return (
    <header className="admin-page-header">
      <h1>{title}</h1>
      <div className="admin-page-actions">{children}</div>
    </header>
  );
}
