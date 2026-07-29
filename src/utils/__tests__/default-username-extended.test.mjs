import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildDefaultUsernameBase,
  displayNameFromAuthMetadata,
  generateDefaultUsername,
} from '../default-username.js';

test('buildDefaultUsernameBase: from first+last', () => {
  assert.equal(buildDefaultUsernameBase({ firstName: 'Ana', lastName: 'Silva' }), 'anasilva');
});

test('buildDefaultUsernameBase: falls back to fullName / displayName / userId', () => {
  assert.equal(buildDefaultUsernameBase({ fullName: 'João!' }), 'joo');
  // Single-char displayName is too short → falls back to user{id}
  assert.equal(buildDefaultUsernameBase({ displayName: 'X' }), 'user');
  assert.equal(
    buildDefaultUsernameBase({ userId: '550e8400-e29b-41d4-a716-446655440000' }),
    'user550e8400'
  );
});

test('buildDefaultUsernameBase: truncates to 21 chars', () => {
  const base = buildDefaultUsernameBase({ firstName: 'a'.repeat(30), lastName: 'b'.repeat(30) });
  assert.equal(base.length, 21);
});

test('buildDefaultUsernameBase: null parts object', () => {
  assert.match(buildDefaultUsernameBase(null), /^user/);
});

test('generateDefaultUsername: matches handle rules length 3–30 with underscore suffix', () => {
  const u = generateDefaultUsername({ firstName: 'Ana', lastName: 'Silva' });
  assert.match(u, /^[a-z0-9_]+$/);
  assert.ok(u.length >= 3 && u.length <= 30);
  assert.ok(u.includes('_'));
});

test('displayNameFromAuthMetadata: prefers display_name then first+last then full_name', () => {
  assert.equal(
    displayNameFromAuthMetadata({ user_metadata: { display_name: ' Nom ' } }),
    'Nom'
  );
  assert.equal(
    displayNameFromAuthMetadata({ user_metadata: { first_name: 'A', last_name: 'B' } }),
    'A B'
  );
  assert.equal(
    displayNameFromAuthMetadata({ user_metadata: { full_name: 'Full' } }),
    'Full'
  );
  assert.equal(displayNameFromAuthMetadata({ user_metadata: {} }), null);
  assert.equal(displayNameFromAuthMetadata({}), null);
});
