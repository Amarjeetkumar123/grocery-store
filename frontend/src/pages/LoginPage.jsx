import { useState } from 'react';
import { Navigate } from 'react-router';
import { supabase } from '../supabaseClient.js';
import { useAuthentication } from '../AuthenticationContext.jsx';
import { useStoreDetails } from '../useStoreDetails.js';
import logoImage from '../assets/logo.png';
import groceriesImage from '../assets/login-groceries.png';
import { Icon } from '../Icon.jsx';
import { EmailPasswordForm } from './login/EmailPasswordForm.jsx';

function GoogleLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M20.5 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.6-3.9 2.6-6.6z" />
      <path fill="#34A853" d="M12 21c2.4 0 4.5-.8 5.9-2.2L15 16.6c-.8.5-1.8.9-3 .9-2.3 0-4.3-1.6-5-3.7H4v2.3A9 9 0 0 0 12 21z" />
      <path fill="#FBBC05" d="M7 13.8a5.4 5.4 0 0 1 0-3.5V8H4a9 9 0 0 0 0 8.1z" />
      <path fill="#EA4335" d="M12 6.6c1.3 0 2.5.5 3.4 1.3L18 5.4A9 9 0 0 0 4 8l3 2.3c.7-2.1 2.7-3.7 5-3.7z" />
    </svg>
  );
}

function StoreBenefits() {
  return (
    <ul className="benefits benefit-card">
      <li><span className="benefit-icon"><Icon name="clock" /></span>Pick a slot</li>
      <li><span className="benefit-icon"><Icon name="cash" /></span>Pay at door</li>
      <li><span className="benefit-icon"><Icon name="truck" /></span>To your door</li>
    </ul>
  );
}

export function LoginPage() {
  const { session } = useAuthentication();
  const store = useStoreDetails();
  const [errorMessage, setErrorMessage] = useState(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  if (session) return <Navigate to="/" replace />;

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
    if (error) setErrorMessage(error.message);
  }

  return (
    <main className="app-shell">
      <section className="login-hero">
        <span className="login-logo"><img className="store-logo store-logo-large" src={logoImage} alt="" /></span>
        <h1>{store.name}</h1>
        <p>Daily groceries from your local store, delivered to your door in the slot you pick</p>
        <img className="login-illustration" src={groceriesImage} alt="A basket of everyday groceries" />
      </section>
      <div className="page-body login-body">
        <StoreBenefits />
        <div className="login-actions">
          <h2>Sign in to start shopping</h2>
          {errorMessage && <p className="error-text" role="alert">{errorMessage}</p>}
          <button type="button" className="button button-large button-google" onClick={signInWithGoogle}>
            <GoogleLogo /> Continue with Google
          </button>
          <p className="login-divider"><span>or</span></p>
          {showEmailForm ? <EmailPasswordForm /> : (
            <button type="button" className="button button-large button-soft" onClick={() => setShowEmailForm(true)}>
              <Icon name="mail" /> Continue with email
            </button>
          )}
          <p className="hint login-note">New here? Your account is created the first time you sign in.</p>
        </div>
      </div>
    </main>
  );
}
