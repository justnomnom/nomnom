/**
 * Source-level guards for the leftover Vercel React Best Practices pass:
 * lean OG metadata, per-request cache wrappers, auth∥json APIs, Suspense
 * boundaries, lazy Portuguese locale, and follow state on the profile payload.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

/** @param {string} rel */
function readSrc(rel) {
  return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

test('dashboard profile generateMetadata uses fetchOgProfile, not the full profile fetch', () => {
  const src = readSrc('src/app/(frontend)/dashboard/u/[username]/page.js');
  const meta = src.slice(
    src.indexOf('export async function generateMetadata'),
    src.indexOf('async function DashboardUserPublicProfilePageContent')
  );
  assert.match(meta, /fetchOgProfile\(/);
  assert.doesNotMatch(meta, /fetchPublicProfileByUsername\(/);
  assert.match(src, /Boolean\(profile\.viewer_following\)/);
  assert.doesNotMatch(src, /fetchViewerFollowsUser/);
});

test('public profile page uses fetchOgProfile for metadata and viewer_following for follow state', () => {
  const src = readSrc('src/app/(frontend)/u/[username]/page.js');
  const meta = src.slice(
    src.indexOf('export async function generateMetadata'),
    src.indexOf('async function PublicUserProfilePageContent')
  );
  assert.match(meta, /fetchOgProfile\(/);
  assert.doesNotMatch(meta, /fetchPublicProfileByUsername\(/);
  assert.match(src, /Boolean\(profile\.viewer_following\)/);
  assert.doesNotMatch(src, /fetchViewerFollowsUser/);
});

test('resolveListSlug and fetchPublicProfileByUsername are React.cache-wrapped', () => {
  const listPage = readSrc('src/libs/lists/actions/list-page-actions.js');
  const profile = readSrc('src/libs/lists/actions/members-profile-actions.js');
  assert.match(listPage, /const resolveListSlugCached = cache\(async/);
  assert.match(listPage, /return resolveListSlugCached\(/);
  assert.match(profile, /const fetchPublicProfileByUsernameCached = cache\(async/);
  assert.match(profile, /return fetchPublicProfileByUsernameCached\(/);
});

test('i18n eagerly loads English only; Portuguese is on-demand', () => {
  const i18n = readSrc('src/locales/i18n.js');
  assert.match(i18n, /import translationEn from '\.\/langs\/en\.json'/);
  assert.doesNotMatch(i18n, /import translationPt from '\.\/langs\/pt\.json'/);
  assert.match(i18n, /pt:\s*\(\)\s*=>\s*import\('\.\/langs\/pt\.json'\)/);
  assert.match(i18n, /export async function ensureI18nLocale/);
  const provider = readSrc('src/locales/localization-provider.js');
  assert.match(provider, /ensureI18nLocale/);
  assert.match(provider, /readUiLocaleCookie/);
  const useLocales = readSrc('src/locales/use-locales.js');
  assert.match(useLocales, /ensureI18nLocale\(nextLang\)/);
  assert.match(useLocales, /ensureI18nLocale\(newlang\)/);
});

test('onboarding and list manage stream under Suspense', () => {
  const onboarding = readSrc('src/app/(frontend)/onboarding/page.js');
  assert.match(onboarding, /<Suspense fallback=\{<SplashScreen \/>\}>/);
  assert.match(onboarding, /OnboardingPageContent/);
  const manage = readSrc('src/app/(frontend)/dashboard/lists/[id]/manage/page.js');
  assert.match(manage, /<Suspense fallback=\{<ListManagePageSkeleton \/>\}>/);
  assert.match(manage, /DashboardListManagePageContent/);
});

test('JSON body parse starts before awaiting auth on remaining POST APIs', () => {
  const routes = [
    'src/app/(frontend)/api/stripe/checkout/list/route.js',
    'src/app/(frontend)/api/stripe/checkout/verify-snapshot/route.js',
    'src/app/(frontend)/api/notifications/read/route.js',
    'src/app/(frontend)/api/notifications/delete/route.js',
    'src/app/(frontend)/api/push/subscribe/route.js',
    'src/app/(frontend)/api/push/unsubscribe/route.js',
  ];
  for (const rel of routes) {
    const src = readSrc(rel);
    const post = src.slice(src.indexOf('export async function POST'));
    const bodyIdx = post.indexOf('request.json()');
    const authIdx = post.indexOf('await getSupabaseAuthUser()');
    const authPromiseIdx = post.indexOf('await authPromise');
    const authAwait = authIdx === -1 ? authPromiseIdx : authIdx;
    assert.ok(bodyIdx !== -1, `${rel} must call request.json()`);
    assert.ok(authAwait !== -1, `${rel} must await auth`);
    assert.ok(
      bodyIdx < authAwait,
      `${rel}: request.json() must start before awaiting auth (body@${bodyIdx} auth@${authAwait})`
    );
  }
});

test('dead MUI date picker package and override are gone', () => {
  const pkg = JSON.parse(readSrc('package.json'));
  assert.equal(pkg.dependencies?.['@mui/x-date-pickers'], undefined);
  assert.equal(pkg.devDependencies?.['@mui/x-date-pickers'], undefined);
  assert.equal(
    fs.existsSync(path.join(REPO_ROOT, 'src/theme/overrides/components/date-picker.js')),
    false
  );
});

test('tag catalog extras fetch overlaps per-category fetches', () => {
  const src = readSrc('src/auth/actions/location-actions.js');
  const fn = src.slice(src.indexOf('export async function fetchRestaurantTagsCatalog'));
  assert.match(fn, /Promise\.all\(\s*\[\s*Promise\.all\(/);
  assert.match(fn, /fetchTagsCatalogExtras\(supabase\)/);
});

test('list page and manage overlap independent round-trips after the access gate', () => {
  const listPage = readSrc('src/libs/lists/actions/list-page-actions.js');
  const fetchPage = listPage.slice(listPage.indexOf('export async function fetchListPage'));
  assert.match(
    fetchPage,
    /await Promise\.all\(\[\s*snapshotCountPromise,\s*itemsFetchPromise,\s*ownerPromise,\s*viewerLangPromise/
  );
  const manage = listPage.slice(listPage.indexOf('export async function fetchListForManage'));
  assert.match(manage, /await Promise\.all\(\[\s*supabase[\s\S]*getSupabaseAuthUser\(\)/);
  assert.match(
    manage,
    /const \[itemsResult, membersResult, ownerResult\] = await Promise\.all\(/
  );
});

test('onboarding overlaps auth with the tag catalog; manage starts fetch before membership gate', () => {
  const onboarding = readSrc('src/app/(frontend)/onboarding/page.js');
  assert.match(onboarding, /Promise\.all\(\[\s*getSupabaseAuthUser\(\),\s*fetchRestaurantTagsCatalog\(\)/);
  const managePage = readSrc('src/app/(frontend)/dashboard/lists/[id]/manage/page.js');
  const dataIdx = managePage.indexOf('const dataPromise = fetchListForManage');
  const membershipIdx = managePage.indexOf('await fetchListMembershipForViewer');
  assert.ok(dataIdx !== -1 && membershipIdx !== -1 && dataIdx < membershipIdx);
});

test('restaurant review upsert overlaps existing review with author profile', () => {
  const src = readSrc('src/auth/actions/restaurant-review-actions.js');
  const fn = src.slice(src.indexOf('export async function upsertRestaurantReview'));
  assert.match(fn, /await Promise\.all\(\[/);
  assert.match(fn, /\.from\('restaurant_reviews'\)/);
  assert.match(fn, /\.from\('users'\)/);
});

test('profile activity and tag prefs sync server props during render, not in an effect', () => {
  const profile = readSrc('src/sections/lists/view/user-public-profile-view.js');
  assert.match(profile, /if \(recentActivity !== prevRecentActivity \|\| profile\?\.id !== prevActivityProfileId\)/);
  assert.match(profile, /setActivityRows\(recentActivity \?\? \[\]\)/);
  const tags = readSrc('src/sections/profile/view/settings-tag-preferences-page.js');
  assert.match(tags, /if \(prevServerIdsKey !== serverIdsKey\)/);
  assert.match(tags, /setSelectedIds\(new Set\(validInitial\)\)/);
  assert.doesNotMatch(tags, /useEffect/);
});
