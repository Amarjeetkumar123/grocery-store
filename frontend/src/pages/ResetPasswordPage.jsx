import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { supabase } from '../supabaseClient.js';
import { useAuthentication } from '../AuthenticationContext.jsx';
import { TextField } from '../FormFields.jsx';
import { PageBar } from '../components/PageBar.jsx';

// The "set a new password" email link opens this page already signed in.
export function ResetPasswordPage() {
  const { session } = useAuthentication();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) return setErrorMessage(error.message);
    navigate('/', { replace: true });
  }

  if (session === undefined) return <div className="center-screen" role="status">Loading…</div>;
  return (
    <main className="app-shell">
      <PageBar title="Set a new password" />
      <div className="page-body">
        {session ? (
          <form className="login-email-form" onSubmit={handleSubmit}>
            <TextField fieldId="newPassword" label="New password" type="password" value={password} onChange={setPassword}
              autoComplete="new-password" minLength={8} required />
            {errorMessage && <p className="error-text" role="alert">{errorMessage}</p>}
            <button type="submit" className="button button-large" disabled={submitting}>{submitting ? 'Saving…' : 'Save password'}</button>
          </form>
        ) : (
          <>
            <p className="error-text" role="alert">This link has expired or was already used.</p>
            <Link className="button" to="/login">Back to sign in</Link>
          </>
        )}
      </div>
    </main>
  );
}
