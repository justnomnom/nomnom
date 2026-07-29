/**
 * Cross-audience functional QA — helpers that every user type hits:
 * guest → free user → creator → follower → subscriber → collaborator → admin.
 *
 * Unit-testable pure paths only (no Supabase/SWR/React).
 */
import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';

import { isValidAuthReturnPath } from '../../utils/auth-return-path.js';
import { clientScopedStorageKey } from '../../utils/user-scoped-storage.js';
import { getLanguageStorageKey } from '../../locales/language-storage-key.js';
import { normalizeListVisibility } from '../lists/list-visibility.js';
import { dedupeMapDropdownLists } from '../lists/dedupe-map-dropdown-lists.js';
import { parseFreemiumPreviewCount } from '../stripe/list-stripe-constants.js';
import { buildListUpdateRecipients } from '../notifications/build-list-update-recipients.js';
import {
  filterListMentionsToFollowsOnly,
  filterListMentionsToSelfOrReviewBacked,
} from '../list/filter-list-mentions-to-follows-only.js';
import { isAdminUserId, getAdminUserIdSet } from '../auth/admin-allowlist.js';

const GUEST = null;
const FREE_USER = '111e8400-e29b-41d4-a716-446655440001';
const CREATOR = '222e8400-e29b-41d4-a716-446655440002';
const FOLLOWER = '333e8400-e29b-41d4-a716-446655440003';
const SUBSCRIBER = '444e8400-e29b-41d4-a716-446655440004';
const COLLAB = '555e8400-e29b-41d4-a716-446655440005';
const ADMIN = '666e8400-e29b-41d4-a716-446655440006';
const STRANGER = '777e8400-e29b-41d4-a716-446655440007';

// ---------------------------------------------------------------------------
// Auth return path — every signup/login/callback (guest becoming any role)
// ---------------------------------------------------------------------------

test('all users: safe returnTo accepted for post-auth redirect', () => {
  for (const path of [
    '/',
    '/discover',
    '/lists/abc',
    '/profile/me?tab=lists',
    '/settings#notifications',
  ]) {
    assert.equal(isValidAuthReturnPath(path), true, path);
  }
});

test('all users: open-redirect / protocol tricks rejected', () => {
  for (const path of [
    null,
    undefined,
    '',
    42,
    {},
    'https://evil.example/phish',
    '//evil.example',
    'javascript:alert(1)',
    'data:text/html,hi',
    'http://localhost/ok',
    'ftp://x',
    'evil.com',
    ' /relative-with-space',
  ]) {
    assert.equal(isValidAuthReturnPath(path), false, String(path));
  }
});

// ---------------------------------------------------------------------------
// List visibility — creator setting gates follower vs subscriber audiences
// ---------------------------------------------------------------------------

test('visibility: canonical values preserved; junk → private (safest for all)', () => {
  assert.equal(normalizeListVisibility('public'), 'public');
  assert.equal(normalizeListVisibility('public_subscribers'), 'public_subscribers');
  assert.equal(normalizeListVisibility('private'), 'private');
  assert.equal(normalizeListVisibility('  public  '), 'public');
  assert.equal(normalizeListVisibility('PUBLIC'), 'private');
  assert.equal(normalizeListVisibility('subscribers'), 'private');
  assert.equal(normalizeListVisibility(null), 'private');
  assert.equal(normalizeListVisibility(undefined), 'private');
  assert.equal(normalizeListVisibility(1), 'private');
  assert.equal(normalizeListVisibility({}), 'private');
});

test('visibility × audiences: public notifies followers+subscribers; paid-only skips followers', () => {
  const followerIds = [FOLLOWER, CREATOR];
  const subscriberIds = [SUBSCRIBER, CREATOR];

  const publicRecipients = buildListUpdateRecipients({
    visibility: 'public',
    followerIds,
    subscriberIds,
    creatorId: CREATOR,
    actingUserId: COLLAB,
  });
  assert.deepEqual(publicRecipients.sort(), [FOLLOWER, SUBSCRIBER].sort());

  const paidOnly = buildListUpdateRecipients({
    visibility: 'public_subscribers',
    followerIds,
    subscriberIds,
    creatorId: CREATOR,
    actingUserId: COLLAB,
  });
  assert.deepEqual(paidOnly, [SUBSCRIBER]);

  const privateList = buildListUpdateRecipients({
    visibility: 'private',
    followerIds,
    subscriberIds,
    creatorId: CREATOR,
    actingUserId: COLLAB,
  });
  assert.deepEqual(privateList, []);

  const unknownVis = buildListUpdateRecipients({
    visibility: normalizeListVisibility('weird'),
    followerIds,
    subscriberIds,
    creatorId: CREATOR,
  });
  assert.deepEqual(unknownVis, []);
});

// ---------------------------------------------------------------------------
// Locale + client storage — guest must not collide with signed-in prefs
// ---------------------------------------------------------------------------

test('language key: anonymous guest vs signed-in (free/creator/admin) are distinct', () => {
  assert.equal(getLanguageStorageKey(GUEST), 'i18next-lng-anonymous');
  assert.equal(getLanguageStorageKey(undefined), 'i18next-lng-anonymous');
  assert.equal(getLanguageStorageKey(''), 'i18next-lng-anonymous');
  assert.equal(getLanguageStorageKey(FREE_USER), `i18next-lng-${FREE_USER}`);
  assert.equal(getLanguageStorageKey(CREATOR), `i18next-lng-${CREATOR}`);
  assert.equal(getLanguageStorageKey(ADMIN), `i18next-lng-${ADMIN}`);
  assert.notEqual(getLanguageStorageKey(GUEST), getLanguageStorageKey(FREE_USER));
});

test('map/list prefs storage: guest namespace vs per-user uid', () => {
  assert.equal(clientScopedStorageKey(GUEST, 'map', 'filterPrefs'), 'guest-map-filterPrefs');
  assert.equal(
    clientScopedStorageKey(FREE_USER, 'map', 'filterPrefs'),
    `${FREE_USER}-map-filterPrefs`
  );
  assert.equal(
    clientScopedStorageKey(CREATOR, 'lists', 'placesView'),
    `${CREATOR}-lists-placesView`
  );
  assert.notEqual(
    clientScopedStorageKey(GUEST, 'map', 'viewState'),
    clientScopedStorageKey(FOLLOWER, 'map', 'viewState')
  );
});

// ---------------------------------------------------------------------------
// Freemium preview — guests + free users see N places before paywall
// ---------------------------------------------------------------------------

test('freemium preview count: positive ints; invalid → default 5', () => {
  assert.equal(parseFreemiumPreviewCount('3'), 3);
  assert.equal(parseFreemiumPreviewCount(10), 10);
  assert.equal(parseFreemiumPreviewCount('0'), 5);
  assert.equal(parseFreemiumPreviewCount('-1'), 5);
  assert.equal(parseFreemiumPreviewCount(''), 5);
  assert.equal(parseFreemiumPreviewCount(null), 5);
  assert.equal(parseFreemiumPreviewCount(undefined), 5);
  assert.equal(parseFreemiumPreviewCount('abc'), 5);
  assert.equal(parseFreemiumPreviewCount(NaN), 5);
  assert.equal(parseFreemiumPreviewCount(1.9), 1);
});

// ---------------------------------------------------------------------------
// Map dropdown — owned / collab / following chips for every signed-in type
// ---------------------------------------------------------------------------

test('map dropdown dedupe: owned+collab+following merge without duplicate ids', () => {
  const owned = [{ id: 'list-a', name: 'Mine' }];
  const collab = [
    { id: 'list-a', name: 'Mine again' },
    { id: 'list-b', name: 'Collab' },
    null,
    { id: null, name: 'bad' },
  ];
  const following = [
    { id: 42, name: 'numeric id' },
    { id: '42', name: 'same as numeric' },
    { id: 'list-c', name: 'Followed' },
  ];

  assert.deepEqual(
    dedupeMapDropdownLists([...owned, ...collab, ...following]).map((l) => l.id),
    ['list-a', 'list-b', '42', 'list-c']
  );
  assert.deepEqual(dedupeMapDropdownLists(null), []);
  assert.deepEqual(dedupeMapDropdownLists(undefined), []);
  assert.deepEqual(dedupeMapDropdownLists({}), []);
  assert.deepEqual(dedupeMapDropdownLists(false), []);
});

// ---------------------------------------------------------------------------
// Mentions — guest / free viewer / followee / stranger
// ---------------------------------------------------------------------------

test('mentions follows-only: guest sees nothing; viewer sees self + follows', () => {
  const mentions = [
    { added_by: FREE_USER, id: 1 },
    { added_by: FOLLOWER, id: 2 },
    { added_by: STRANGER, id: 3 },
    { added_by: null, id: 4 },
    { id: 5 },
  ];
  const following = new Set([FOLLOWER]);

  assert.deepEqual(
    filterListMentionsToFollowsOnly(mentions, GUEST, following).map((m) => m.id),
    [2]
  );
  assert.deepEqual(
    filterListMentionsToFollowsOnly(mentions, FREE_USER, following).map((m) => m.id),
    [1, 2]
  );
  assert.deepEqual(
    filterListMentionsToFollowsOnly(mentions, FREE_USER, null).map((m) => m.id),
    [1]
  );
  assert.deepEqual(filterListMentionsToFollowsOnly(null, FREE_USER, following), []);
  assert.deepEqual(
    filterListMentionsToFollowsOnly(mentions, FREE_USER, ['not-a-set']).map((m) => m.id),
    [1]
  );
});

test('mentions review-backed: stranger list-saves hidden; reviews + self kept', () => {
  const mentions = [
    { added_by: FREE_USER, contributor_review: null, id: 'self-save' },
    { added_by: FOLLOWER, contributor_review: { body: 'yum' }, id: 'follow-review' },
    { added_by: FOLLOWER, contributor_review: null, id: 'follow-save-only' },
    { added_by: STRANGER, contributor_review: { body: 'ok' }, id: 'stranger-review' },
  ];

  assert.deepEqual(
    filterListMentionsToSelfOrReviewBacked(mentions, FREE_USER).map((m) => m.id),
    ['self-save', 'follow-review', 'stranger-review']
  );
  assert.deepEqual(
    filterListMentionsToSelfOrReviewBacked(mentions, GUEST).map((m) => m.id),
    ['follow-review', 'stranger-review']
  );
  assert.deepEqual(filterListMentionsToSelfOrReviewBacked(undefined, FREE_USER), []);
});

// ---------------------------------------------------------------------------
// Admin allowlist — guests/users false unless UUID listed
// ---------------------------------------------------------------------------

let savedAdminEnv;
beforeEach(() => {
  savedAdminEnv = process.env.ADMIN_USER_IDS;
  process.env.ADMIN_USER_IDS = `${ADMIN},  ${CREATOR} `;
});
afterEach(() => {
  if (savedAdminEnv === undefined) delete process.env.ADMIN_USER_IDS;
  else process.env.ADMIN_USER_IDS = savedAdminEnv;
});

test('admin: only allowlisted ids; guest/free/follower never admin by accident', () => {
  assert.equal(isAdminUserId(ADMIN), true);
  assert.equal(isAdminUserId(CREATOR), true);
  assert.equal(isAdminUserId(FREE_USER), false);
  assert.equal(isAdminUserId(FOLLOWER), false);
  assert.equal(isAdminUserId(GUEST), false);
  assert.equal(isAdminUserId(''), false);
  assert.equal(isAdminUserId(123), false);
  assert.ok(getAdminUserIdSet().has(ADMIN));
  assert.equal(getAdminUserIdSet().has(SUBSCRIBER), false);
});
