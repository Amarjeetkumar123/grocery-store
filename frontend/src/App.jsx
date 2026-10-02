import { Navigate, Route, Routes } from 'react-router';
import { RequireRole, RequireSignedIn } from './RouteGuards.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { ResetPasswordPage } from './pages/ResetPasswordPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { AddressPage } from './pages/AddressPage.jsx';
import { CategoryPage } from './pages/CategoryPage.jsx';
import { ProductPage } from './pages/ProductPage.jsx';
import { SearchPage } from './pages/SearchPage.jsx';
import { ProfilePage } from './pages/ProfilePage.jsx';
import { CartPage } from './pages/CartPage.jsx';
import { OrdersPage } from './pages/OrdersPage.jsx';
import { OrderDetailPage } from './pages/OrderDetailPage.jsx';
import { StaffPlaceholderPage } from './pages/StaffPlaceholderPage.jsx';
import { AdminHomeRedirect, AdminLayout } from './pages/admin/AdminLayout.jsx';
import { AdminProductsPage } from './pages/admin/AdminProductsPage.jsx';
import { AdminProductFormPage } from './pages/admin/AdminProductFormPage.jsx';
import { AdminBulkImportPage } from './pages/admin/AdminBulkImportPage.jsx';
import { AdminStockPage } from './pages/admin/AdminStockPage.jsx';
import { AdminZonesPage } from './pages/admin/AdminZonesPage.jsx';
import { AdminStoreSettingsPage } from './pages/admin/AdminStoreSettingsPage.jsx';

const ownerOnly = (page) => <RequireRole allowedRoles={['owner']}>{page}</RequireRole>;

function adminRoutes() {
  return (
    <Route path="/admin" element={<RequireRole allowedRoles={['owner', 'packer']}><AdminLayout /></RequireRole>}>
      <Route index element={<AdminHomeRedirect />} />
      <Route path="products" element={ownerOnly(<AdminProductsPage />)} />
      <Route path="products/new" element={ownerOnly(<AdminProductFormPage key="new" />)} />
      <Route path="products/import" element={ownerOnly(<AdminBulkImportPage />)} />
      <Route path="products/:productId" element={ownerOnly(<AdminProductFormPage />)} />
      <Route path="stock" element={<AdminStockPage />} />
      <Route path="zones" element={ownerOnly(<AdminZonesPage />)} />
      <Route path="store-settings" element={ownerOnly(<AdminStoreSettingsPage />)} />
    </Route>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route element={<RequireSignedIn />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/address" element={<AddressPage />} />
        <Route path="/category/:categoryId" element={<CategoryPage />} />
        <Route path="/product/:productId" element={<ProductPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:orderNumber" element={<OrderDetailPage />} />
        {adminRoutes()}
        <Route path="/rider" element={<RequireRole allowedRoles={['rider']}><StaffPlaceholderPage title="My deliveries" /></RequireRole>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
