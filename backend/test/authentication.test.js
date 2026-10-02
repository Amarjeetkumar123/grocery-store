import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toVerifiedUser } from '../src/authentication.js';

const confirmedAt = '2026-10-03T10:00:00Z';

test('only a Google-only login with a confirmed email can be linked to staff', () => {
  const googleUser = { id: 'u1', email: 'Packer@Gmail.com', email_confirmed_at: confirmedAt, identities: [{ provider: 'google' }] };
  assert.deepEqual(toVerifiedUser(googleUser), { id: 'u1', email: 'packer@gmail.com', emailVerifiedByGoogle: true });

  const passwordUser = { ...googleUser, identities: [{ provider: 'email' }] };
  assert.equal(toVerifiedUser(passwordUser).emailVerifiedByGoogle, false);

  const passwordThenGoogleUser = { ...googleUser, identities: [{ provider: 'email' }, { provider: 'google' }] };
  assert.equal(toVerifiedUser(passwordThenGoogleUser).emailVerifiedByGoogle, false);

  assert.equal(toVerifiedUser({ ...googleUser, email_confirmed_at: null }).emailVerifiedByGoogle, false);
  assert.equal(toVerifiedUser({ id: 'u2', email: null }).emailVerifiedByGoogle, false);
});
