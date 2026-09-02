import assert from 'node:assert/strict';
import { test } from 'node:test';

import { isDuplicateSignupUser } from '../duplicate-signup.js';

test('isDuplicateSignupUser: empty identities means the email is taken', () => {
  assert.equal(isDuplicateSignupUser(null), false);
  assert.equal(isDuplicateSignupUser({ id: 'u1' }), false);
  assert.equal(isDuplicateSignupUser({ id: 'u1', identities: [{ id: 'i1' }] }), false);
  assert.equal(isDuplicateSignupUser({ id: 'u1', identities: [] }), true);
});
