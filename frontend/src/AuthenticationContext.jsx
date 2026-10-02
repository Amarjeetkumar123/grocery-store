import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient.js';
import { callApi } from './apiClient.js';

const AuthenticationContext = createContext(null);

// undefined while Supabase is still reading a saved login, then the
// session object, or null when nobody is signed in.
function useSupabaseSession() {
  const [session, setSession] = useState(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((authenticationEvent, newSession) => setSession(newSession));
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}

export function AuthenticationProvider({ children }) {
  const session = useSupabaseSession();
  const userId = session?.user?.id;
  const [account, setAccount] = useState(null);
  const [accountError, setAccountError] = useState(null);

  const refreshAccount = useCallback(async () => {
    setAccountError(null);
    try {
      setAccount(await callApi('/api/account'));
    } catch (error) {
      setAccountError(error.message);
    }
  }, []);

  useEffect(() => {
    setAccount(null);
    if (userId) refreshAccount();
  }, [userId, refreshAccount]);

  const signOut = useCallback(() => supabase.auth.signOut(), []);
  const value = useMemo(
    () => ({ session, account, accountError, refreshAccount, signOut }),
    [session, account, accountError, refreshAccount, signOut],
  );
  return <AuthenticationContext value={value}>{children}</AuthenticationContext>;
}

export function useAuthentication() {
  return useContext(AuthenticationContext);
}
