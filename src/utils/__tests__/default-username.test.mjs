import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDefaultUsernameBase,
  generateDefaultUsername,
  displayNameFromAuthMetadata,
} from '../default-username.js';

// buildDefaultUsernameBase
test('combines firstName + lastName', () => {
  assert.equal(buildDefaultUsernameBase({ firstName: 'John', lastName: 'Doe' }), 'johndoe');
});
test('strips non-alphanumeric from names', () => {
  // 'Jöhn' → 'jhn' (ö stripped), 'Dœ' → 'd' (œ stripped), combined → 'jhnd'
  assert.equal(buildDefaultUsernameBase({ firstName: 'Jöhn', lastName: 'Dœ' }), 'jhnd');
});
test('falls back to fullName when firstName+lastName too short', () => {
  assert.equal(buildDefaultUsernameBase({ firstName: 'A', lastName: '', fullName: 'Alice' }), 'alice');
});
test('falls back to displayName when fullName also absent', () => {
  assert.equal(buildDefaultUsernameBase({ displayName: 'Alice' }), 'alice');
});
test('falls back to userId when all name fields empty', () => {
  const base = buildDefaultUsernameBase({ userId: 'abc-123-def-456' });
  assert.ok(base.startsWith('user'));
  assert.ok(base.length > 4);
});
test('truncates to 21 chars max', () => {
  const base = buildDefaultUsernameBase({ firstName: 'averylongfirstname', lastName: 'withalongerlastname' });
  assert.ok(base.length <= 21);
});
test('empty parts falls back to userId', () => {
  const base = buildDefaultUsernameBase({ userId: '11111111-aaaa-bbbb-cccc-dddddddddddd' });
  assert.ok(base.startsWith('user'));
});

// generateDefaultUsername
test('generates username with underscore + 8 hex suffix', () => {
  const u = generateDefaultUsername({ firstName: 'Jane', lastName: 'Smith' });
  assert.match(u, /^janesmith_[0-9a-f]{8}$/);
});
test('generated username max 30 chars', () => {
  const u = generateDefaultUsername({ firstName: 'averylongfirstname', lastName: 'withalongerlastname' });
  assert.ok(u.length <= 30);
});
test('two calls produce different suffixes (probabilistic)', () => {
  const a = generateDefaultUsername({ firstName: 'Test' });
  const b = generateDefaultUsername({ firstName: 'Test' });
  assert.notEqual(a, b);
});

// displayNameFromAuthMetadata
test('returns display_name when present', () => {
  assert.equal(displayNameFromAuthMetadata({ user_metadata: { display_name: 'Alice' } }), 'Alice');
});
test('falls back to first_name + last_name', () => {
  assert.equal(
    displayNameFromAuthMetadata({ user_metadata: { first_name: 'John', last_name: 'Doe' } }),
    'John Doe'
  );
});
test('falls back to full_name', () => {
  assert.equal(displayNameFromAuthMetadata({ user_metadata: { full_name: 'Jane Doe' } }), 'Jane Doe');
});
test('falls back to name', () => {
  assert.equal(displayNameFromAuthMetadata({ user_metadata: { name: 'Bob' } }), 'Bob');
});
test('returns null when metadata empty', () => {
  assert.equal(displayNameFromAuthMetadata({ user_metadata: {} }), null);
});
test('handles null user', () => {
  assert.equal(displayNameFromAuthMetadata(null), null);
});
