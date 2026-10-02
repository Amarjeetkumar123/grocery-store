import { findActiveStaffMemberForUser } from './dbHelper/staffDbHelper.js';

// Asks Supabase whether a login token is real and still valid.
// ponytail: one Supabase call per request; switch to local JWKS verification
// (supabase.auth.getClaims) if request volume grows.
export function createSupabaseTokenVerifier(supabaseUrl, publishableKey) {
  return async function verifyAccessToken(accessToken) {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: publishableKey, Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(5000),
    });
    if (response.status === 401 || response.status === 403) return null;
    if (!response.ok) throw new Error(`Supabase auth check failed with status ${response.status}`);

    return toVerifiedUser(await response.json());
  };
}

// Staff rows are linked by email only when the login is Google alone. A
// password account could have been opened by someone else using that
// person's email before they ever signed in.
export function toVerifiedUser(supabaseUser) {
  const identities = supabaseUser.identities ?? [];
  const googleOnly = identities.length > 0 && identities.every((identity) => identity.provider === 'google');
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ? supabaseUser.email.toLowerCase() : null,
    emailVerifiedByGoogle: googleOnly && Boolean(supabaseUser.email_confirmed_at),
  };
}

export function requireSignedIn(verifyAccessToken, database) {
  return async function checkSignedIn(request, response, next) {
    const authorizationHeader = request.get('authorization') ?? '';
    const accessToken = authorizationHeader.startsWith('Bearer ') ? authorizationHeader.slice('Bearer '.length) : '';
    if (!accessToken) {
      return response.status(401).json({ error: 'Please sign in.' });
    }

    const user = await verifyAccessToken(accessToken);
    if (!user) {
      return response.status(401).json({ error: 'Your session has expired. Please sign in again.' });
    }

    request.user = user;
    request.staffMember = await findActiveStaffMemberForUser(database, user);
    next();
  };
}

export function requireRole(...allowedRoles) {
  return function checkRole(request, response, next) {
    if (!request.staffMember || !allowedRoles.includes(request.staffMember.role)) {
      return response.status(403).json({ error: 'You do not have access to this page.' });
    }
    next();
  };
}
