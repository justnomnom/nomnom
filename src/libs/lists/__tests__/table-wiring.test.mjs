/**
 * Table wiring: i18n parity, entry points, grants, panel behaviour, analytics, OG thumbs.
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
  const value = key
    .split('.')
    .reduce((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), bundle);
  return typeof value === 'string' ? value : undefined;
}

const en = JSON.parse(read('src/locales/langs/en.json'));
const pt = JSON.parse(read('src/locales/langs/pt.json'));

/**
 * Every `pages.table.*` / `pages.lists.start_table_*` key the source actually asks for.
 * Derived from the code rather than hand-listed, so a new `t()` call cannot ship
 * untranslated. Dynamic `pages.table.error_${code}` keys are covered separately.
 */
function referencedTableKeys() {
  const keys = new Set();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '__tests__') continue;
        walk(p);
      } else if (/\.(js|jsx|ts|tsx)$/.test(entry.name)) {
        const src = fs.readFileSync(p, 'utf8');
        for (const m of src.matchAll(/pages\.(?:table\.[a-z_0-9]+|lists\.start_table_[a-z_0-9]+)/g)) {
          // `pages.table.error_` is a template prefix, not a key.
          if (!m[0].endsWith('error_')) keys.add(m[0]);
        }
      }
    }
  };
  walk(path.join(ROOT, 'src'));
  return [...keys].sort();
}

describe('Table i18n', () => {
  test('every referenced Table key is a non-empty string in en and pt', () => {
    const keys = referencedTableKeys();
    assert.ok(keys.length >= 30, `expected the Table copy surface, got ${keys.length} keys`);
    const missingEn = keys.filter((k) => !lookup(en, k)?.trim());
    const missingPt = keys.filter((k) => !lookup(pt, k)?.trim());
    assert.deepEqual(missingEn, [], `missing en: ${missingEn.join(', ')}`);
    assert.deepEqual(missingPt, [], `missing pt: ${missingPt.join(', ')}`);
  });

  test('every error code mapTableError can return has copy in both locales', async () => {
    const { mapTableError } = await import('../table-payload.js');
    const migration = [
      read('supabase/migrations/20260817120000_tables_merge.sql'),
      read('supabase/migrations/20260819220000_table_vote_requires_name.sql'),
    ].join('\n');
    const codes = new Set([
      ...[...migration.matchAll(/RAISE EXCEPTION '([a-z_]+)'/g)].map((m) =>
        mapTableError(m[1])
      ),
      // Codes the server actions return without ever reaching the RPC.
      'invalid_list',
      'need_three_places',
      'too_many_places',
      'table_not_found',
      'invalid_voter_key',
      'invalid_vote',
      'invalid_display_name',
      'not_joined',
      'invalid_restaurant_id',
      'unauthorized',
      'unknown',
      'generic',
    ]);
    for (const code of codes) {
      const key = `pages.table.error_${code}`;
      assert.ok(lookup(en, key)?.trim(), `missing en ${key}`);
      assert.ok(lookup(pt, key)?.trim(), `missing pt ${key}`);
    }
  });

  test('interpolated copy keeps its placeholders in both locales', () => {
    for (const key of [
      'pages.table.reply_share_text',
      'pages.table.upvote_aria',
      'pages.table.downvote_aria',
      'pages.table.place_details_aria',
      'pages.table.lock_confirm_body',
    ]) {
      assert.match(lookup(en, key), /\{\{name\}\}/);
      assert.match(lookup(pt, key), /\{\{name\}\}/);
    }
    for (const lang of [en, pt]) {
      assert.match(lang.pages.lists.start_table_hint, /\{\{min\}\}/);
      assert.doesNotMatch(lang.pages.lists.start_table_hint, /\{\{max\}\}/);
      assert.match(lang.pages.lists.start_table_selected, /\{\{count\}\}/);
      assert.match(lang.pages.table.whos_at_table, /\{\{count\}\}/);
      assert.match(lang.pages.table.anon_suffix, /\{\{count\}\}/);
      assert.match(lang.pages.table.when_today, /\{\{time\}\}/);
      assert.match(lang.pages.table.when_tomorrow, /\{\{time\}\}/);
      assert.match(lang.pages.table.when_on, /\{\{date\}\}/);
      assert.match(lang.pages.table.when_on, /\{\{time\}\}/);
    }
  });

  test('the retired Decide / Tonight namespaces are gone from both locales', () => {
    for (const lang of [en, pt]) {
      assert.equal(lang.pages.tonight, undefined);
      const listKeys = Object.keys(lang.pages.lists);
      assert.deepEqual(listKeys.filter((k) => k.startsWith('decide_')), []);
      assert.deepEqual(listKeys.filter((k) => k.startsWith('plan_tonight_')), []);
    }
  });
});

describe('Table entry points', () => {
  test('starting a Table is the only way to put a list to a vote', () => {
    const view = read('src/sections/lists/view/list-public-view.js');
    assert.match(view, /import StartTableSheet from 'src\/sections\/lists\/start-table-sheet'/);
    assert.match(view, /pages\.lists\.start_table_cta/);
    assert.match(view, /searchParams\.get\('table'\) !== '1'/);
    assert.match(view, /visibility === 'public'/);
    assert.match(view, /!showPaidPaywall/);
    assert.match(view, /error !== 'login_required'/);
    // The in-place Decide panel and its ?d= session are gone.
    assert.doesNotMatch(view, /ListDecidePanel|searchParams\.get\('d'\)/);
  });

  test('the Start a Table CTA is a contained primary, per DESIGN.md §7', () => {
    const view = read('src/sections/lists/view/list-public-view.js');
    // Window back from the label: setStartTableOpen appears twice (the ?table=1
    // effect opens the sheet too), so anchor on the CTA text, not the handler.
    const label = view.indexOf("t('pages.lists.start_table_cta')");
    const cta = view.slice(view.lastIndexOf('<Button', label), label);
    // Starting a Table is the only way to put a list to a vote, so it is THE primary
    // action here. DESIGN.md §7 reserves `outlined` for destructive/neutral actions
    // (Delete, Cancel) and gives the primary action `contained`.
    assert.match(cta, /variant="contained"/);
    assert.doesNotMatch(cta, /variant="outlined"/);
    // §7 also requires an explicit color on contained (the theme defaults MuiButton to
    // "inherit", which renders near-black instead of terracotta).
    assert.match(cta, /color="primary"/);
    // §19 / readable-accent.js: labels on a terracotta FILL stay white
    // (PRIMARY_ON_FILL_TEXT). readableAccent() is for accent-as-text only.
    assert.doesNotMatch(view, /readableAccent/);
  });

  test('the CTA needs places but the sheet mounts for any owner (?table=1 opens it)', () => {
    const view = read('src/sections/lists/view/list-public-view.js');
    assert.match(view, /\(items\?\.length \?\? 0\) > 0 \? \(/);
    assert.doesNotMatch(view, /isOwner\) && \(items\?\.length \?\? 0\) >= 3/);
  });

  test('Discover promotes matching Table + Roulette cards; Decide/Tonight tiles are gone', () => {
    const view = read('src/sections/discover/view/discover-view.js');
    const promo = read('src/sections/discover/discover-feature-promo.js');
    const provider = read('src/libs/analytics/analytics-provider.js');
    assert.match(view, /DiscoverFeaturePromo/);
    assert.match(view, /href=\{paths\.dashboard\.listsTable\}/);
    assert.match(view, /promo: 'table'/);
    assert.match(view, /promo: 'roulette'/);
    assert.doesNotMatch(view, /promo: 'decide'|promo: 'tonight'/);
    assert.doesNotMatch(view, /listsDecide|listsTonight/);
    assert.doesNotMatch(view, /variant="tile"|variant="hero"/);
    assert.match(view, /gridTemplateColumns: 'minmax\(0, 1fr\) minmax\(0, 1fr\)'/);
    assert.doesNotMatch(promo, /variant: PropTypes/);
    assert.match(provider, /discover_promo_clicked: \{ required: \['promo'\] \}/);
    for (const lang of [en, pt]) {
      const d = lang.pages.dashboard.discover;
      assert.ok(d.table_promo_title);
      assert.ok(d.table_promo_sub);
      assert.ok(d.roulette_promo_title);
      assert.equal(d.decide_promo_title, undefined);
      assert.equal(d.tonight_promo_title, undefined);
    }
  });

  test('each promo is its own product card (paper + card shadow, no wrapper tint)', () => {
    const promo = read('src/sections/discover/discover-feature-promo.js');
    const view = read('src/sections/discover/view/discover-view.js');
    assert.match(promo, /bgcolor: 'background\.paper'/);
    assert.match(promo, /customShadows\.card/);
    assert.doesNotMatch(promo, /bgcolor: 'transparent'/);
    // The pair sits in a grid, not inside a tinted group card (that would nest cards).
    assert.doesNotMatch(view, /alpha\(tt\.palette\.primary\.main, 0\.06\)/);
  });

  test('the discover route skeleton mirrors the real promo pair', () => {
    const skeleton = read('src/sections/discover/discover-page-loading-skeleton.js');
    const view = read('src/sections/discover/view/discover-view.js');
    const promo = read('src/sections/discover/discover-feature-promo.js');
    const grid = /gridTemplateColumns: 'minmax\(0, 1fr\) minmax\(0, 1fr\)'/;
    assert.match(skeleton, grid);
    assert.match(view, grid);
    for (const src of [skeleton, view]) assert.match(src, /gap: SPACE\.sm/);
    assert.match(promo, /borderRadius: 2,/);
    assert.match(skeleton, /borderRadius: 2,/);
    assert.doesNotMatch(skeleton, /borderRadius: 4,/);
    assert.match(skeleton, /import \{ SPACE \} from 'src\/theme\/spacing'/);
  });

  test('the hub hint is measurable at the destination, not just the click', () => {
    const hub = read('src/sections/lists/view/lists-hub-view.js');
    const provider = read('src/libs/analytics/analytics-provider.js');
    for (const name of ['table_hint_shown', 'table_hint_dismissed']) {
      assert.match(hub, new RegExp(`trackEvent\\('${name}'\\)`));
      assert.match(provider, new RegExp(`${name}: \\{ required: \\[\\] \\}`));
    }
    assert.doesNotMatch(hub, /decide_hint_|tonight_hint_/);
    // Dismissing strips ?table=1 rather than only flipping local state, so a reload or a
    // shared URL can't resurrect a closed hint.
    assert.match(hub, /searchParams\.get\('table'\) === '1'/);
    assert.match(hub, /router\.replace\(paths\.dashboard\.lists\)/);
    // The hint carries the param through to the list, where the sheet opens on it.
    assert.match(hub, /\?table=1/);
    for (const lang of [en, pt]) {
      const l = lang.pages.dashboard.lists;
      assert.ok(l.table_hint_title);
      assert.ok(l.table_hint_body);
      assert.ok(l.table_hint_dismiss);
      assert.equal(l.decide_hint_title, undefined);
      assert.equal(l.tonight_hint_title, undefined);
    }
  });

  test('paths expose the Table vote page, the join gate, and one hub deep link', () => {
    const paths = read('src/routes/paths.js');
    assert.match(paths, /table: \(id\) => `\/table\/\$\{id\}`/);
    assert.match(paths, /tableJoin: \(id\) => `\/table\/\$\{id\}\/join`/);
    assert.match(paths, /listsTable: `\$\{ROOTS\.DASHBOARD\}\/lists\?table=1`/);
    assert.doesNotMatch(paths, /listsDecide|listsTonight|\/tonight\//);
  });
});

describe('Table server + storage contract', () => {
  test('table actions talk RPC-only (no table from())', () => {
    const src = read('src/libs/lists/actions/table-actions.js');
    for (const rpc of [
      'start_table',
      'get_table',
      'get_table_decide',
      'join_table',
      'cast_table_vote',
      'add_table_place',
      'lock_table',
    ]) {
      assert.match(src, new RegExp(`rpc\\('${rpc}'`));
    }
    assert.doesNotMatch(src, /\.from\(['"]table/);
    assert.match(src, /TABLE_PLACES_ABUSE_CAP/);
  });

  test('Table tables are service_role only in the grants allowlist', () => {
    for (const table of ['tables', 'table_places', 'table_guests', 'table_votes']) {
      assert.ok(
        API_GRANT_SERVICE_ROLE_ONLY_TABLES.includes(table),
        `${table} must be service_role only`
      );
    }
    for (const gone of ['nights', 'night_places', 'night_guests', 'list_decide_sessions']) {
      assert.ok(!API_GRANT_SERVICE_ROLE_ONLY_TABLES.includes(gone), `${gone} no longer exists`);
    }
    const grantsSql = read('docs/db/api-table-grants.sql');
    for (const table of ['tables', 'table_places', 'table_guests', 'table_votes']) {
      assert.match(grantsSql, new RegExp(`ON TABLE public\\.${table} TO service_role`));
    }
    assert.doesNotMatch(grantsSql, /public\.nights|public\.night_|public\.list_decide_/);
  });

  test('the page polls while open, caches the payload, and keeps your own votes', () => {
    const view = read('src/sections/table/table-view.js');
    const panel = read('src/sections/table/table-vote-panel.js');
    assert.match(panel, /const POLL_MS = \d+/);
    assert.match(panel, /window\.setInterval\(tick, POLL_MS\)/);
    assert.match(panel, /if \(!tableId \|\| locked\) return undefined/);
    assert.match(view, /persistCachedTable/);
    assert.match(view, /readCachedTable/);
    assert.match(view, /getOrCreateGuestKey/);
    assert.match(panel, /persistMyVote/);
    assert.match(panel, /readMyVotes/);
    assert.match(panel, /readLinkCopied/);
    assert.match(panel, /clearLinkCopied/);
    assert.match(panel, /announceCopied/);
    // The organiser's lock token is written where the Table is created and read where it
    // is settled, so the starter can settle from a device that never signed in.
    assert.match(
      read('src/sections/lists/start-table-sheet.js'),
      /persistLockToken\(String\(table\.table_id\), String\(table\.lock_token\)\)/
    );
    assert.match(panel, /readLockToken\(tableId\)/);
    assert.doesNotMatch(view, /gen_random_bytes/);
    assert.doesNotMatch(panel, /gen_random_bytes/);
  });

  test('settling asks the organiser to confirm the final spot before lock_table', () => {
    const panel = read('src/sections/table/table-vote-panel.js');
    const sheet = read('src/sections/table/table-lock-confirm-sheet.js');
    assert.match(panel, /onClick=\{handleOpenLockConfirm\}/);
    assert.match(panel, /TableLockConfirmSheet/);
    assert.match(panel, /setLockConfirmOpen\(true\)/);
    assert.match(panel, /winnerRestaurantId: pendingWinnerId/);
    assert.match(sheet, /pages\.table\.lock_confirm_title/);
    assert.match(sheet, /pages\.table\.lock_confirm_cta/);
    assert.match(sheet, /ResponsiveSheet/);
  });

  test('the winner block offers reply, place, and maps', () => {
    const panel = read('src/sections/table/table-vote-panel.js');
    assert.match(panel, /pages\.table\.going_here/);
    assert.match(panel, /pages\.table\.reply_cta/);
    assert.match(panel, /handleReplyShare/);
    assert.match(panel, /buildWinnerReplyText/);
    assert.match(panel, /trackResultReplyShared/);
    assert.match(panel, /reply_copied/);
    assert.match(panel, /winner\.mapsLink/);
    assert.match(panel, /paths\.restaurantPublic\(place\.restaurantId\)/);
    assert.match(panel, /handleOpenPlace\(winner\)/);
    assert.match(panel, /pages\.table\.view_place/);
    assert.match(panel, /touchTargetSx/);
    assert.doesNotMatch(panel, /RouterLink/);
    assert.doesNotMatch(panel, /pages\.table\.spin|handleRoulette|trackRouletteSpin/);
  });

  test('tapping a place opens the restaurant detail sheet without leaving the table', () => {
    const panel = read('src/sections/table/table-vote-panel.js');
    const sheet = read('src/sections/table/table-restaurant-detail-sheet.js');
    const action = read('src/libs/restaurant/fetch-restaurant-detail-action.js');
    assert.match(panel, /PlaceIdentityButton/);
    assert.match(panel, /pages\.table\.place_details_aria/);
    assert.match(panel, /TableRestaurantDetailSheet/);
    assert.match(sheet, /fetchRestaurantDetail/);
    assert.match(sheet, /mapSheetMode/);
    assert.match(sheet, /RestaurantDetailViewMapSheet/);
    assert.match(sheet, /ResponsiveSheet|SwipeDismissBottomSheetContent/);
    assert.match(action, /fetchRestaurantByIdForSsr/);
    assert.match(action, /'use server'/);
  });

  test('naming yourself is required before voting', () => {
    const view = read('src/sections/table/table-view.js');
    const join = read('src/sections/table/table-join-view.js');
    const panel = read('src/sections/table/table-vote-panel.js');
    const page = read('src/app/(frontend)/table/[id]/join/page.js');
    assert.match(view, /paths\.tableJoin\(tableId\)/);
    assert.match(view, /named=\{hasNamed\}/);
    assert.match(panel, /if \(!tableId \|\| locked \|\| !named\) return/);
    assert.match(join, /nameGuest/);
    assert.match(join, /persistTableNamed/);
    assert.match(page, /TableJoinView/);
  });

  test('anyone at an open Table can add a place', () => {
    const view = read('src/sections/table/table-view.js');
    const actions = read('src/libs/lists/actions/table-actions.js');
    assert.match(view, /addTablePlace/);
    assert.match(view, /searchRestaurantsForPicker/);
    assert.match(view, /tableAddSearchState/);
    assert.match(view, /add_place_already/);
    assert.match(view, /const ok = await onPick/);
    assert.match(view, /\{!locked && hasNamed \? \(\s*<TableAddPlaceSearch/);
    assert.match(actions, /rpc\('add_table_place'/);
  });

  test('the start sheet searches any restaurant and keeps picks while it is open', () => {
    const sheet = read('src/sections/lists/start-table-sheet.js');
    assert.match(sheet, /searchRestaurantsForPicker/);
    assert.match(sheet, /start_table_search_label/);
    assert.match(sheet, /start_table_from_list[\s\S]*start_table_search_label/);
    assert.match(sheet, /tablePickerRows/);
    assert.match(sheet, /tableSelectedPickerRows/);
    assert.match(sheet, /justOpened/);
    assert.match(sheet, /wasOpenRef/);
    assert.match(sheet, /toggleSelectedIds/);
    assert.match(sheet, /stopPropagation/);
    assert.match(sheet, /autoFocus/);
    assert.match(sheet, /persistLinkCopied/);
    assert.match(sheet, /router\.push\(tablePath/);
    assert.doesNotMatch(sheet, /MAX_PLACES/);
    assert.match(sheet, /selectedCount >= MIN_PLACES && !busy/);
  });

  test('list OG card fetches restaurant thumbs for WhatsApp collage', () => {
    const src = read('src/libs/og/list-og-image.tsx');
    assert.match(src, /fetchOgListRestaurantThumbs\(listId, 4\)/);
    assert.match(src, /WhatsApp acceptance/);
    assert.match(src, /truncate\(meta\?\.name, 70\)/);
    // The Table share card reuses the list collage when the table resolves.
    const og = read('src/app/(frontend)/table/[id]/opengraph-image.tsx');
    assert.match(og, /fetchTable/);
    assert.match(og, /renderListOgImage\(listId\)/);
  });
});

describe('Table analytics', () => {
  test('event names match the analytics provider schema keys', () => {
    const analyticsSrc = read('src/libs/analytics/table-analytics.js');
    const provider = read('src/libs/analytics/analytics-provider.js');
    const names = [...analyticsSrc.matchAll(/:\s*'([a-z_]+)'/g)].map((m) => m[1]);
    assert.ok(names.length >= 9, `expected table event names, got ${names.length}`);
    for (const name of names) {
      assert.match(provider, new RegExp(`${name}: \\{ required:`));
    }
    assert.ok(names.includes('table_started'));
    assert.ok(names.includes('table_share_copied'));
    assert.ok(names.includes('table_result_locked'));
    assert.ok(names.includes('table_result_reply_shared'));
    assert.doesNotMatch(analyticsSrc, /ROULETTE_SPIN|trackRouletteSpin|table_roulette_spin/);
    assert.doesNotMatch(provider, /table_roulette_spin/);
  });

  test('provider required fields cover the funnel payloads the UI sends', () => {
    const provider = read('src/libs/analytics/analytics-provider.js');
    assert.match(provider, /table_started: \{ required: \['table_id', 'list_id'\] \}/);
    assert.match(provider, /table_share_copied: \{ required: \['table_id'\] \}/);
    assert.match(provider, /table_open: \{ required: \['table_id'\] \}/);
    assert.match(provider, /table_named: \{ required: \['table_id'\] \}/);
    assert.match(provider, /table_place_added: \{ required: \['table_id', 'restaurant_id'\] \}/);
    assert.match(provider, /table_vote_cast: \{ required: \['table_id', 'restaurant_id', 'vote'\] \}/);
    assert.match(provider, /table_result_locked: \{ required: \['table_id'\] \}/);
    // The vote panel sends list_id as '' when the payload has no list, so it must not be
    // required anywhere except at start time.
    assert.doesNotMatch(provider, /table_(?!started)[a-z_]+: \{ required: \[[^\]]*'list_id'/);
  });

  test('the retired Decide / Night events are gone; list share stays a list event', () => {
    const provider = read('src/libs/analytics/analytics-provider.js');
    assert.doesNotMatch(provider, /night_|list_decide_open|list_vote_cast|list_result_/);
    assert.match(provider, /list_share_copied: \{ required: \['list_id'\] \}/);
    const dashboardView = read('src/sections/lists/view/dashboard-list-public-view.js');
    assert.match(dashboardView, /trackEvent\('list_share_copied', \{ list_id: listId \}\)/);
    assert.doesNotMatch(dashboardView, /useListDecideAnalytics/);
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
