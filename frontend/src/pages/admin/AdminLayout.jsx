import { Navigate, NavLink, Outlet } from 'react-router';
import { useAuthentication } from '../../AuthenticationContext.jsx';
import { useStoreDetails } from '../../useStoreDetails.js';
import { Icon } from '../../Icon.jsx';
import logoImage from '../../assets/logo.png';

// Cash check and reports join this menu in Week 5.
const navigationGroups = [
  { title: 'Daily', items: [
    { path: '/admin/orders', label: 'Orders', icon: 'box', roles: ['owner', 'packer'] },
    { path: '/admin/picking-list', label: 'Picking list', icon: 'layers', roles: ['owner', 'packer'] },
    { path: '/admin/delivery-list', label: 'Delivery list', icon: 'truck', roles: ['owner', 'packer'] },
  ] },
  { title: 'Catalogue', items: [
    { path: '/admin/products', label: 'Products', icon: 'tag', roles: ['owner'] },
    { path: '/admin/stock', label: 'Stock', icon: 'layers', roles: ['owner', 'packer'] },
  ] },
  { title: 'Setup', items: [
    { path: '/admin/zones', label: 'Zones & slots', icon: 'pin', roles: ['owner'] },
    { path: '/admin/customers', label: 'Customers', icon: 'user', roles: ['owner'] },
    { path: '/admin/staff', label: 'Staff', icon: 'building', roles: ['owner'] },
    { path: '/admin/store-settings', label: 'Store settings', icon: 'settings', roles: ['owner'] },
  ] },
];

const roleLabels = { owner: 'Owner', packer: 'Packer' };

export function AdminLayout() {
  const { account, signOut } = useAuthentication();
  const store = useStoreDetails();
  const visibleGroups = navigationGroups
    .map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(account.role)) }))
    .filter((group) => group.items.length > 0);
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand"><img className="store-logo" src={logoImage} alt="" /> {store.name}</div>
        <nav aria-label="Admin">
          {visibleGroups.map((group) => (
            <div key={group.title} className="admin-navigation-group">
              <p className="admin-navigation-title">{group.title}</p>
              {group.items.map((item) => (
                <NavLink key={item.path} to={item.path} className="admin-navigation-link">
                  <Icon name={item.icon} /> {item.label}
                </NavLink>
              ))}
            </div>
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

// /admin opens the order board for owner and packer.
export function AdminHomeRedirect() {
  return <Navigate to="/admin/orders" replace />;
}

export function AdminPageHeader({ title, children }) {
  return (
    <header className="admin-page-header">
      <h1>{title}</h1>
      <div className="admin-page-actions">{children}</div>
    </header>
  );
}
