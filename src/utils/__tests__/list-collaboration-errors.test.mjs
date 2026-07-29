import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translateListCollaborationError } from '../list-collaboration-errors.js';

const t = (key) => key;

test('maps exact RPC codes', () => {
  assert.equal(
    translateListCollaborationError(t, 'already_member'),
    'pages.lists.invite_error_already_member'
  );
  assert.equal(
    translateListCollaborationError(t, 'no_pending_invite'),
    'pages.lists.collab_error_no_pending_invite'
  );
});

test('matches codes embedded in Postgres messages', () => {
  assert.equal(
    translateListCollaborationError(t, 'ERROR: already_member'),
    'pages.lists.invite_error_already_member'
  );
});

test('prefers longer substring matches', () => {
  assert.equal(
    translateListCollaborationError(t, 'not_active_member'),
    'pages.lists.collab_error_not_active_member'
  );
});

test('returns human-readable strings unchanged', () => {
  assert.equal(
    translateListCollaborationError(t, 'Payment failed. Try again.'),
    'Payment failed. Try again.'
  );
});

test('unknown snake_case codes use generic fallback', () => {
  assert.equal(
    translateListCollaborationError(t, 'some_new_rpc_code'),
    'pages.lists.collab_error_generic'
  );
});
