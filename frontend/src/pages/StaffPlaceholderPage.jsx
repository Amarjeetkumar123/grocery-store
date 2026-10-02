import { useAuthentication } from '../AuthenticationContext.jsx';

const roleLabels = { owner: 'Owner', packer: 'Packer', rider: 'Rider' };

// Week 1 placeholder: proves staff sign-in and roles work.
// The real admin and rider screens arrive in Weeks 2 to 5.
export function StaffPlaceholderPage({ title }) {
  const { account, signOut } = useAuthentication();
  return (
    <main className="app-shell">
      <header className="page-bar"><h1>{title}</h1></header>
      <div className="page-body">
        <section className="card">
          <h2>Hi {account.staffName}</h2>
          <p className="hint">Signed in as {roleLabels[account.role]} ({account.email}).</p>
          <p className="hint">These screens are being built next.</p>
        </section>
        <button type="button" className="text-button" onClick={signOut}>Sign out</button>
      </div>
    </main>
  );
}
