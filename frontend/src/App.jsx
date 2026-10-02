import { Navigate, Route, Routes } from 'react-router';
import { RequireRole, RequireSignedIn } from './RouteGuards.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { HomePage } from './pages/HomePage.jsx';
import { AddressPage } from './pages/AddressPage.jsx';
import { StaffPlaceholderPage } from './pages/StaffPlaceholderPage.jsx';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireSignedIn />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/address" element={<AddressPage />} />
        <Route
          path="/admin"
          element={(
            <RequireRole allowedRoles={['owner', 'packer']}>
              <StaffPlaceholderPage title="Admin panel" />
            </RequireRole>
          )}
        />
        <Route
          path="/rider"
          element={(
            <RequireRole allowedRoles={['rider']}>
              <StaffPlaceholderPage title="My deliveries" />
            </RequireRole>
          )}
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
