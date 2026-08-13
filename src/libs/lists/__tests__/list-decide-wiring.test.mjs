/**
 * Share → Decide wiring: i18n parity, grants, panel mount, analytics schemas, OG thumbs.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, test } from 'node:test';

import { API_GRANT_SERVICE_ROLE_ONLY_TABLES } from '../../db/api-table-grants.js';
import { pickOgListRestaurantThumbUrls } from '../../og/pick-og-list-restaurant-thumbs.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function lookup(bundle, key) {
  const value = key.split('.').reduce(
    (acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined),
    bundle
  );
  return typeof value === 'string' ? value : undefined;
}

const DECIDE_I18N_KEYS = [
  'pages.lists.decide_title',
  'pages.lists.decide_intro',
  'pages.lists.decide_open_hint',
  'pages.lists.decide_locked_hint',
  'pages.lists.decide_need_three',
  'pages.lists.decide_start_cta',
  'pages.lists.decide_waiting_owner',
  'pages.lists.decide_share_link',
  'pages.lists.decide_spin',
  'pages.lists.decide_spin_result',
  'pages.lists.decide_lock_cta',
  'pages.lists.decide_going_here',
  'pages.lists.decide_view_place',
  'pages.lists.decide_open_maps',
  'pages.lists.decide_tally',
  'pages.lists.decide_upvote_aria',
  'pages.lists.decide_downvote_aria',
  'pages.lists.decide_unnamed_place',
  'pages.lists.decide_join_to_vote_hint',
  'pages.lists.decide_error_generic',
  'pages.lists.decide_error_unauthorized',
  'pages.lists.decide_error_only_owner',
  'pages.lists.decide_error_list_not_public',
  'pages.lists.decide_error_need_three_places',
  'pages.lists.decide_error_session_not_found',
  'pages.lists.decide_error_session_locked',
  'pages.lists.decide_error_restaurant_not_on_list',
  'pages.lists.decide_error_invalid_voter_key',
  'pages.lists.decide_error_invalid_vote',
  'pages.lists.decide_error_rate_limited',
  'pages.lists.decide_error_not_authorized_to_lock',
  'pages.lists.decide_error_restaurant_not_allowed',
  'pages.lists.decide_error_night_not_found',
  'pages.lists.decide_error_not_joined',
  'pages.lists.decide_error_invalid_display_name',
  'pages.lists.decide_error_too_many_places',
  'pages.lists.decide_error_invalid_restaurant_id',
];

describe('Share → Decide i18n', () => {
  const en = JSON.parse(read('src/locales/langs/en.json'));
  const pt = JSON.parse(read('src/locales/langs/pt.json'));

  test('every decide key is a non-empty string in en and pt', () => {
    const missingEn = DECIDE_I18N_KEYS.filter((k) => !lookup(en, k)?.trim());
    const missingPt = DECIDE_I18N_KEYS.filter((k) => !lookup(pt, k)?.trim());
    assert.deepEqual(missingEn, [], `missing en: ${missingEn.join(', ')}`);
    assert.deepEqual(missingPt, [], `missing pt: ${missingPt.join(', ')}`);
  });

  test('interpolated copy keeps {{name}} / tally placeholders in both locales', () => {
    for (const key of [
      'pages.lists.decide_spin_result',
      'pages.lists.decide_upvote_aria',
      'pages.lists.decide_downvote_aria',
    ]) {
      assert.match(lookup(en, key), /\{\{name\}\}/);
      assert.match(lookup(pt, key), /\{\{name\}\}/);
    }
    assert.match(lookup(en, 'pages.lists.decide_tally'), /\{\{up\}\}/);
    assert.match(lookup(en, 'pages.lists.decide_tally'), /\{\{down\}\}/);
    assert.match(lookup(en, 'pages.lists.decide_tally'), /\{\{net\}\}/);
    assert.match(lookup(pt, 'pages.lists.decide_tally'), /\{\{up\}\}/);
    assert.match(lookup(pt, 'pages.lists.decide_tally'), /\{\{down\}\}/);
    assert.match(lookup(pt, 'pages.lists.decide_tally'), /\{\{net\}\}/);
  });
});

describe('Share → Decide wiring', () => {
  test('public list view mounts the panel on ?d= and public lists', () => {
    const src = read('src/sections/lists/view/list-public-view.js');
    assert.match(src, /import ListDecidePanel from 'src\/sections\/lists\/list-decide-panel'/);
    assert.match(src, /searchParams\.get\('d'\)/);
    assert.match(src, /visibility === 'public'/);
    assert.match(src, /!showPaidPaywall/);
  });

  test('dashboard share tracks list_share_copied', () => {
    const src = read('src/sections/lists/view/dashboard-list-public-view.js');
    assert.match(src, /useListDecideAnalytics/);
    assert.match(src, /trackShareCopied\(\{ list_id: listId \}\)/);
  });

  test('decide actions talk RPC-only (no table from())', () => {
    const src = read('src/libs/lists/actions/decide-actions.js');
    assert.match(src, /create_list_decide_session/);
    assert.match(src, /get_list_decide_session/);
    assert.match(src, /cast_list_decide_vote/);
    assert.match(src, /lock_list_decide_session/);
    assert.doesNotMatch(src, /\.from\(['"]list_decide_/);
  });

  test('schema forbids gen_random_bytes lock_token and wipe includes decide tables', () => {
    const schema = read('supabase/migrations/20260813140000_list_decide.sql');
    assert.match(schema, /MUST NOT call gen_random_bytes/);
    assert.match(schema, /gen_random_uuid\(\)::text \|\| gen_random_uuid\(\)::text/);
    assert.match(schema, /REVOKE ALL ON TABLE public\.list_decide_sessions FROM anon, authenticated/);
    const wipe = read('docs/db/empty-all-application-data.sql');
    assert.match(wipe, /public\.list_decide_votes/);
    assert.match(wipe, /public\.list_decide_sessions/);
    assert.match(wipe, /public\.nights/);
    assert.match(wipe, /public\.night_places/);
    assert.match(wipe, /public\.night_guests/);
    const pointer = read('docs/db/list-decide-schema.sql');
    assert.match(pointer, /supabase\/migrations\/20260813140000_list_decide\.sql/);
  });

  test('decide tables are service_role only in grants allowlist', () => {
    assert.ok(API_GRANT_SERVICE_ROLE_ONLY_TABLES.includes('list_decide_sessions'));
    assert.ok(API_GRANT_SERVICE_ROLE_ONLY_TABLES.includes('list_decide_votes'));
    assert.ok(API_GRANT_SERVICE_ROLE_ONLY_TABLES.includes('nights'));
    assert.ok(API_GRANT_SERVICE_ROLE_ONLY_TABLES.includes('night_places'));
    assert.ok(API_GRANT_SERVICE_ROLE_ONLY_TABLES.includes('night_guests'));
  });

  test('schema encodes vote ±1, open/locked status, and composite PK', () => {
    const schema = read('supabase/migrations/20260813140000_list_decide.sql');
    assert.match(schema, /CHECK \(status IN \('open', 'locked'\)\)/);
    assert.match(schema, /CHECK \(vote IN \(-1, 1\)\)/);
    assert.match(schema, /PRIMARY KEY \(session_id, voter_key, restaurant_id\)/);
    assert.match(schema, /ENABLE ROW LEVEL SECURITY/);
    assert.match(schema, /CREATE OR REPLACE FUNCTION public\.create_list_decide_session/);
    assert.match(schema, /CREATE OR REPLACE FUNCTION public\.get_list_decide_session/);
    assert.match(schema, /CREATE OR REPLACE FUNCTION public\.cast_list_decide_vote/);
    assert.match(schema, /CREATE OR REPLACE FUNCTION public\.lock_list_decide_session/);
    assert.match(schema, /GRANT EXECUTE ON FUNCTION public\.create_list_decide_session\(uuid\) TO authenticated/);
    assert.match(schema, /create_list_decide_session → authenticated/);
    assert.match(
      schema,
      /get_list_decide_session, cast_list_decide_vote, lock_list_decide_session → anon \+ authenticated/
    );
  });

  test('panel hydrates from sessionStorage, polls while open, and remounts on ?d=', () => {
    const panel = read('src/sections/lists/list-decide-panel.js');
    const sessionPanel = read('src/sections/lists/decide-session-panel.js');
    assert.match(sessionPanel, /const POLL_MS = 4000/);
    assert.match(panel, /useLayoutEffect/);
    assert.match(panel, /readCachedSession\(fromUrl\)/);
    assert.match(panel, /resolveDecideSessionId\(initialSessionId\)/);
    assert.match(sessionPanel, /window\.setInterval\(tick, POLL_MS\)/);
    assert.match(sessionPanel, /if \(!sessionId \|\| locked\) return undefined/);
    assert.match(sessionPanel, /if \(!showStart \|\| !onStart \|\| !isOwner \|\| !canStart \|\| busy\) return/);
    assert.match(sessionPanel, /if \(!sessionId \|\| locked \|\| busy\) return/);
    assert.match(sessionPanel, /if \(!restaurantIds\.length \|\| locked\) return/);
    assert.match(panel, /persistLockToken/);
    assert.match(sessionPanel, /trackDecideOpen|trackVoteCast/);
    assert.match(sessionPanel, /trackVoteCast/);
    assert.match(sessionPanel, /trackRouletteSpin/);
    assert.match(sessionPanel, /trackResultLocked/);
    assert.match(sessionPanel, /trackResultShown/);
    assert.match(sessionPanel, /trackShareCopied/);
    assert.match(panel, /trackDecideOpen/);

    const view = read('src/sections/lists/view/list-public-view.js');
    assert.match(view, /key=\{searchParams\.get\('d'\) \|\| 'decide-idle'\}/);
    assert.match(view, /initialSessionId=\{searchParams\.get\('d'\) \|\| null\}/);
    assert.match(view, /error !== 'login_required'/);
  });

  test('panel idle / locked / guest branches and URL sync are wired', () => {
    const panel = read('src/sections/lists/list-decide-panel.js');
    const sessionPanel = read('src/sections/lists/decide-session-panel.js');
    assert.match(sessionPanel, /if \(!canStart && !session\)/);
    assert.match(sessionPanel, /pages\.lists\.decide_need_three/);
    assert.match(sessionPanel, /pages\.lists\.decide_waiting_owner/);
    assert.match(sessionPanel, /pages\.lists\.decide_going_here/);
    assert.match(sessionPanel, /winner\.mapsLink/);
    assert.match(panel, /searchParams\.set\('d', nextSessionId\)/);
    assert.match(panel, /history\.replaceState/);
    assert.match(panel, /loadGenRef\.current !== gen/);
    assert.match(panel, /persistLockToken\(String\(created\.session_id\), String\(created\.lock_token\)\)/);
    assert.match(sessionPanel, /window\.location\.href/);
    assert.match(sessionPanel, /paths\.restaurantPublic\(winner\.restaurantId\)/);
    assert.match(sessionPanel, /color="primary"/);
    assert.match(sessionPanel, /touchTargetSx/);
    assert.match(sessionPanel, /tabularNumsSx/);
    assert.match(sessionPanel, /DecidePlaceThumb/);
    assert.doesNotMatch(panel, /gen_random_bytes/);
    assert.doesNotMatch(sessionPanel, /gen_random_bytes/);
  });

  test('list OG card fetches restaurant thumbs for WhatsApp collage', () => {
    const src = read('src/libs/og/list-og-image.tsx');
    assert.match(src, /fetchOgListRestaurantThumbs\(listId, 4\)/);
    assert.match(src, /WhatsApp acceptance/);
    assert.match(src, /truncate\(meta\?\.name, 70\)/);
  });
});

describe('Share → Decide analytics', () => {
  test('event names match the analytics provider schema keys', () => {
    const analyticsSrc = read('src/libs/analytics/list-decide-analytics.js');
    const provider = read('src/libs/analytics/analytics-provider.js');
    const names = [...analyticsSrc.matchAll(/:\s*'([a-z_]+)'/g)].map((m) => m[1]);
    assert.ok(names.length >= 6, `expected decide event names, got ${names.length}`);
    for (const name of names) {
      assert.match(provider, new RegExp(`${name}: \\{ required:`));
    }
    assert.ok(names.includes('list_share_copied'));
    assert.ok(names.includes('list_result_locked'));
  });

  test('provider required fields cover the funnel payloads the panel sends', () => {
    const provider = read('src/libs/analytics/analytics-provider.js');
    assert.match(provider, /list_share_copied: \{ required: \['list_id'\] \}/);
    assert.match(provider, /list_decide_open: \{ required: \['list_id', 'session_id'\] \}/);
    assert.match(
      provider,
      /list_vote_cast: \{ required: \['list_id', 'session_id', 'restaurant_id', 'vote'\] \}/
    );
    assert.match(provider, /list_roulette_spin: \{ required: \['list_id', 'restaurant_id'\] \}/);
    assert.match(
      provider,
      /list_result_shown: \{ required: \['list_id', 'session_id', 'restaurant_id'\] \}/
    );
    assert.match(provider, /list_result_locked: \{ required: \['list_id', 'session_id'\] \}/);
  });
});

describe('pickOgListRestaurantThumbUrls', () => {
  test('skips rejected / missing urls, de-dupes, and caps at limit', () => {
    const items = [
      {
        restaurants: {
          restaurant_images: [
            { url: 'b.jpg', sort_order: 2, moderation_status: 'approved' },
            { url: 'a.jpg', sort_order: 1, moderation_status: 'approved' },
          ],
        },
      },
      {
        restaurants: {
          restaurant_images: [{ url: 'bad.jpg', moderation_status: 'rejected' }],
        },
      },
      { restaurants: { restaurant_images: [{ url: 'a.jpg', sort_order: 0 }] } },
      { restaurants: { restaurant_images: [{ url: 'c.jpg' }] } },
      { restaurants: { restaurant_images: [{ url: 'd.jpg' }] } },
    ];
    assert.deepEqual(pickOgListRestaurantThumbUrls(items, 2), ['a.jpg', 'c.jpg']);
  });

  test('empty / invalid inputs and limit clamping', () => {
    assert.deepEqual(pickOgListRestaurantThumbUrls(null), []);
    assert.deepEqual(pickOgListRestaurantThumbUrls([]), []);
    assert.deepEqual(pickOgListRestaurantThumbUrls({ restaurants: [] }), []);
    const many = Array.from({ length: 8 }, (_, i) => ({
      restaurants: { restaurant_images: [{ url: `${i}.jpg` }] },
    }));
    assert.equal(pickOgListRestaurantThumbUrls(many, 99).length, 6);
    assert.equal(pickOgListRestaurantThumbUrls(many, 0).length, 4);
    assert.equal(pickOgListRestaurantThumbUrls(many, Number.NaN).length, 4);
    assert.equal(pickOgListRestaurantThumbUrls(many, -3).length, 1);
    assert.equal(pickOgListRestaurantThumbUrls(many).length, 4);
  });

  test('keeps pending/approved images and skips rows without restaurants.images', () => {
    const items = [
      { restaurant: { restaurant_images: [{ url: 'nested-wrong.jpg' }] } },
      { restaurants: { restaurant_images: [{ url: 'pending.jpg', moderation_status: 'pending' }] } },
      { restaurants: { restaurant_images: [{ url: 'ok.jpg', moderation_status: 'approved' }] } },
      { restaurants: { restaurant_images: [] } },
      { restaurants: null },
    ];
    assert.deepEqual(pickOgListRestaurantThumbUrls(items, 4), ['pending.jpg', 'ok.jpg']);
  });
});
