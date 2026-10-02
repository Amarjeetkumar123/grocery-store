import { useState } from 'react';
import { supabase } from '../../supabaseClient.js';
import { TextField } from '../../FormFields.jsx';

const formModes = {
  signIn: { submitLabel: 'Sign in', needsPassword: true },
  signUp: { submitLabel: 'Create account', needsPassword: true },
  resetPassword: { submitLabel: 'Send reset link', needsPassword: false },
};

// Returns a message to show, or nothing when the user is now signed in
// (the login page then moves on by itself).
async function submitToSupabase(mode, email, password) {
  if (mode === 'signIn') {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return null;
  }
  if (mode === 'signUp') {
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { emailRedirectTo: `${window.location.origin}/` },
    });
    if (error) throw error;
    return data.session ? null : `We sent a link to ${email}. Open it to finish creating your account.`;
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
  if (error) throw error;
  return `If ${email} has an account, a link to set a new password is on its way.`;
}

function ModeLinks({ mode, changeMode }) {
  if (mode !== 'signIn') {
    return <button type="button" className="text-button" onClick={() => changeMode('signIn')}>Back to sign in</button>;
  }
  return (
    <div className="login-mode-links">
      <button type="button" className="text-button" onClick={() => changeMode('signUp')}>Create an account</button>
      <button type="button" className="text-button" onClick={() => changeMode('resetPassword')}>Forgot password?</button>
    </div>
  );
}

export function EmailPasswordForm() {
  const [mode, setMode] = useState('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ submitting: false, message: null, errorMessage: null });
  const { submitting, message, errorMessage } = status;
  const { submitLabel, needsPassword } = formModes[mode];

  function changeMode(newMode) {
    setMode(newMode);
    setStatus({ submitting: false, message: null, errorMessage: null });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus({ submitting: true, message: null, errorMessage: null });
    try {
      setStatus({ submitting: false, message: await submitToSupabase(mode, email.trim(), password), errorMessage: null });
    } catch (error) {
      setStatus({ submitting: false, message: null, errorMessage: error.message });
    }
  }

  return (
    <form className="login-email-form" onSubmit={handleSubmit}>
      <TextField fieldId="email" label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required />
      {needsPassword && (
        <TextField fieldId="password" label="Password" type="password" value={password} onChange={setPassword}
          autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'} minLength={mode === 'signUp' ? 8 : undefined} required />
      )}
      {errorMessage && <p className="error-text" role="alert">{errorMessage}</p>}
      {message && <p className="notice notice-success" role="status">{message}</p>}
      <button type="submit" className="button button-large" disabled={submitting}>{submitting ? 'Please wait…' : submitLabel}</button>
      <ModeLinks mode={mode} changeMode={changeMode} />
    </form>
  );
}
