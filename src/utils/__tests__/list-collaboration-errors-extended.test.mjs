import assert from 'node:assert/strict';
import { test } from 'node:test';

import { translateListCollaborationError } from '../list-collaboration-errors.js';

const t = (key) => `T:${key}`;

test('translateListCollaborationError: null/empty → null', () => {
  assert.equal(translateListCollaborationError(t, null), null);
  assert.equal(translateListCollaborationError(t, undefined), null);
  assert.equal(translateListCollaborationError(t, ''), null);
  assert.equal(translateListCollaborationError(t, '   '), null);
});

test('translateListCollaborationError: covers major RPC codes', () => {
  const cases = {
    invalid: 'pages.lists.invite_error_invalid_username',
    not_found: 'pages.lists.invite_error_user_not_found',
    unauthorized: 'pages.lists.collab_error_sign_in',
    not_authenticated: 'pages.lists.collab_error_sign_in',
    cannot_invite_self: 'pages.lists.collab_error_cannot_invite_self',
    only_owner_can_invite_private: 'pages.lists.collab_error_only_owner_can_invite_private',
    has_snapshot_purchases: 'pages.lists.collab_error_has_snapshot_purchases',
    join_requests_disabled: 'pages.lists.collab_error_join_requests_disabled',
  };
  for (const [code, key] of Object.entries(cases)) {
    assert.equal(translateListCollaborationError(t, code), `T:${key}`, code);
  }
});

test('translateListCollaborationError: numbers coerced to string', () => {
  assert.equal(translateListCollaborationError(t, 42), '42');
});
