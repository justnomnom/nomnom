/**
 * Preference defaults / upsert patch / mute target validation.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  NOTIFICATION_MUTE_TYPES,
  NOTIFICATION_PREF_DEFAULTS,
  buildNotificationPreferenceUpsert,
  isValidNotificationMuteTarget,
  mergeNotificationPreferences,
  optimisticNotificationPrefs,
  resolvePushEnableControlKind,
  rollbackNotificationPrefIfFailed,
} from '../notification-preference-helpers.js';

test('defaults: in-app + push on, email digest off (opt-in)', () => {
  assert.deepEqual(NOTIFICATION_PREF_DEFAULTS, {
    list_updates_in_app: true,
    list_updates_push: true,
    list_updates_email: false,
  });
});

test('merge: missing row → defaults; partial row fills remaining', () => {
  assert.deepEqual(mergeNotificationPreferences(null), { ...NOTIFICATION_PREF_DEFAULTS });
  assert.deepEqual(mergeNotificationPreferences({ list_updates_email: true }), {
    list_updates_in_app: true,
    list_updates_push: true,
    list_updates_email: true,
  });
  assert.deepEqual(
    mergeNotificationPreferences({
      list_updates_in_app: false,
      list_updates_push: false,
      list_updates_email: true,
    }),
    {
      list_updates_in_app: false,
      list_updates_push: false,
      list_updates_email: true,
    }
  );
});

test('upsert: only boolean patch fields copied; empty/non-boolean → null', () => {
  assert.equal(buildNotificationPreferenceUpsert('', { list_updates_in_app: true }), null);
  assert.equal(buildNotificationPreferenceUpsert('u1', {}), null);
  assert.equal(buildNotificationPreferenceUpsert('u1', { list_updates_in_app: 'yes' }), null);

  const row = buildNotificationPreferenceUpsert(
    'u1',
    { list_updates_in_app: false, list_updates_push: true, junk: 1 },
    '2026-01-01T00:00:00.000Z'
  );
  assert.deepEqual(row, {
    user_id: 'u1',
    updated_at: '2026-01-01T00:00:00.000Z',
    list_updates_in_app: false,
    list_updates_push: true,
  });
});

test('upsert: email-only patch allowed', () => {
  const row = buildNotificationPreferenceUpsert(
    'u1',
    { list_updates_email: true },
    't'
  );
  assert.deepEqual(row, {
    user_id: 'u1',
    updated_at: 't',
    list_updates_email: true,
  });
});

test('mute targets: list and creator only; id required', () => {
  assert.ok(NOTIFICATION_MUTE_TYPES.has('list'));
  assert.ok(NOTIFICATION_MUTE_TYPES.has('creator'));
  assert.equal(isValidNotificationMuteTarget('list', 'L1'), true);
  assert.equal(isValidNotificationMuteTarget('creator', 'C1'), true);
  assert.equal(isValidNotificationMuteTarget('restaurant', 'R1'), false);
  assert.equal(isValidNotificationMuteTarget('list', ''), false);
  assert.equal(isValidNotificationMuteTarget('list', null), false);
  assert.equal(isValidNotificationMuteTarget(null, 'L1'), false);
});

test('optimistic toggle then rollback only when save returns an error', () => {
  const prefs = { list_updates_in_app: true, list_updates_push: true, list_updates_email: false };
  const optimistic = optimisticNotificationPrefs(prefs, 'list_updates_email', true);
  assert.equal(optimistic.list_updates_email, true);
  assert.equal(prefs.list_updates_email, false);

  const afterSuccess = rollbackNotificationPrefIfFailed(optimistic, 'list_updates_email', false, null);
  assert.equal(afterSuccess.list_updates_email, true);

  const afterFail = rollbackNotificationPrefIfFailed(
    optimistic,
    'list_updates_email',
    false,
    'save_failed'
  );
  assert.equal(afterFail.list_updates_email, false);
  assert.equal(afterFail.list_updates_in_app, true);
});

test('push enable control kind: ios hint wins, then unsupported, blocked, enabled, enable', () => {
  assert.equal(
    resolvePushEnableControlKind({ iosNotInstalled: true, supported: false }),
    'ios_hint'
  );
  assert.equal(resolvePushEnableControlKind({ supported: false }), 'unsupported');
  assert.equal(
    resolvePushEnableControlKind({ supported: true, permission: 'denied' }),
    'blocked'
  );
  assert.equal(
    resolvePushEnableControlKind({
      supported: true,
      permission: 'granted',
      subscribed: true,
    }),
    'enabled'
  );
  assert.equal(
    resolvePushEnableControlKind({
      supported: true,
      permission: 'default',
      subscribed: false,
    }),
    'enable'
  );
});
