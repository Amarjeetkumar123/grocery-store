import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router';
import { callApi } from '../../apiClient.js';
import { useAuthentication } from '../../AuthenticationContext.jsx';
import { useStoreDetails } from '../../useStoreDetails.js';
import { Icon } from '../../Icon.jsx';
import { AlertsSwitch } from '../../components/AlertsToggle.jsx';
import logoImage from '../../assets/logo.png';

const navigationGroups = [
  { title: 'Daily', items: [
    { path: '/admin/dashboard', label: 'Dashboard', icon: 'home', roles: ['owner'] },
    { path: '/admin/orders', label: 'Orders', icon: 'box', roles: ['owner', 'packer'] },
    { path: '/admin/picking-list', label: 'Picking list', icon: 'layers', roles: ['owner', 'packer'] },
    { path: '/admin/delivery-list', label: 'Delivery list', icon: 'truck', roles: ['owner', 'packer'] },
  ] },
  { title: 'Catalogue', items: [
    { path: '/admin/products', label: 'Products', icon: 'tag', roles: ['owner'] },
    { path: '/admin/categories', label: 'Categories', icon: 'grid', roles: ['owner'] },
    { path: '/admin/stock', label: 'Stock', icon: 'layers', roles: ['owner', 'packer'] },
  ] },
  { title: 'Setup', items: [
    { path: '/admin/zones', label: 'Zones & slots', icon: 'pin', roles: ['owner'] },
    { path: '/admin/customers', label: 'Customers', icon: 'user', roles: ['owner'] },
    { path: '/admin/staff', label: 'Staff', icon: 'building', roles: ['owner'] },
    { path: '/admin/store-settings', label: 'Store settings', icon: 'settings', roles: ['owner'] },
  ] },
  { title: 'Money', items: [
    { path: '/admin/cash-check', label: 'Cash & UPI check', icon: 'cash', roles: ['owner'] },
    { path: '/admin/reports', label: 'Reports', icon: 'tag', roles: ['owner'] },
  ] },
];

const roleLabels = { owner: 'Owner', packer: 'Packer' };
const newOrderCheckInterval = 60 * 1000;

// Orders waiting to be confirmed, checked every minute and on each page change.
function useNewOrderCount() {
  const [newOrders, setNewOrders] = useState(0);
  const { pathname } = useLocation();
  useEffect(() => {
    const check = () => callApi('/api/admin/orders/new-count').then((result) => setNewOrders(result.newOrders)).catch(() => {});
    check();
    const timer = setInterval(check, newOrderCheckInterval);
    return () => clearInterval(timer);
  }, [pathname]);
  return newOrders;
}

export function AdminLayout() {
  const { account, signOut } = useAuthentication();
  const store = useStoreDetails();
  const newOrders = useNewOrderCount();
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
                  {item.path === '/admin/orders' && newOrders > 0 && (
                    <span className="navigation-count" aria-label={`${newOrders} new`}>{newOrders}</span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="admin-user">
          <AlertsSwitch label="New order alerts" />
          <div className="admin-account">
            <span className="admin-avatar" aria-hidden="true">{account.staffName?.charAt(0).toUpperCase()}</span>
            <span className="admin-account-text"><strong>{account.staffName}</strong><small>{roleLabels[account.role]}</small></span>
            <button type="button" className="icon-button admin-sign-out" onClick={signOut} aria-label="Logout" title="Logout"><Icon name="logout" size={18} /></button>
          </div>
        </div>
      </aside>
      <main className="admin-main"><Outlet /></main>
    </div>
  );
}

// /admin opens the dashboard for the owner, the order board for the packer.
export function AdminHomeRedirect() {
  const { account } = useAuthentication();
  return <Navigate to={account.role === 'owner' ? '/admin/dashboard' : '/admin/orders'} replace />;
}

// subtitle: one short summary line under the title, e.g. "24 products".
export function AdminPageHeader({ title, subtitle, children }) {
  return (
    <header className="admin-page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p className="admin-page-subtitle">{subtitle}</p>}
      </div>
      <div className="admin-page-actions">{children}</div>
    </header>
  );
}
