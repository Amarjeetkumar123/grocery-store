import { Navigate, Outlet } from 'react-router';
import { useAuthentication } from './AuthenticationContext.jsx';

function LoadingScreen() {
  return <div className="center-screen" role="status">Loading…</div>;
}

function AccountErrorScreen({ message, onRetry, onSignOut }) {
  return (
    <div className="center-screen">
      <p className="error-text" role="alert">{message}</p>
      <button type="button" className="button" onClick={onRetry}>Try again</button>
      <button type="button" className="text-button" onClick={onSignOut}>Sign out</button>
    </div>
  );
}

// Pages inside this route need a signed-in user whose account has loaded.
export function RequireSignedIn() {
  const { session, account, accountError, refreshAccount, signOut } = useAuthentication();
  if (session === null) return <Navigate to="/login" replace />;
  if (accountError) {
    return <AccountErrorScreen message={accountError} onRetry={refreshAccount} onSignOut={signOut} />;
  }
  if (session === undefined || !account) return <LoadingScreen />;
  return <Outlet />;
}

export function RequireRole({ allowedRoles, children }) {
  const { account } = useAuthentication();
  return allowedRoles.includes(account.role) ? children : <Navigate to="/" replace />;
}
