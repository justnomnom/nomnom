#!/usr/bin/env node
// Picks which restaurants and lists are worth a reel right now.
//
// Scores real DB rows against what the compositions actually render (see
// lib/reel-readiness.mjs), drops anything the renderer would refuse or fake,
// and skips subjects the ledger says went out recently.
//
// Usage:
//   node scripts/pick-subjects.mjs
//   node scripts/pick-subjects.mjs --kind restaurant --limit 3 --city Lisboa
//
// Options:
//   --kind <k>        restaurant | review | list | all     (default all)
//                     review = RestaurantSpotlight, one quote carries a scene
//   --limit <n>       picks per kind                      (default 5)
//   --pool <n>        candidate rows pulled per kind      (default 300)
//   --enrich <n>      candidates that get the expensive metadata read (default 40)
//   --city <name>     restrict restaurants to a city (substring match)
//   --cooldown <d>    days before a subject repeats       (default 45)
//   --min-score <n>   drop picks below this score         (default 0)
//   --include-recent  ignore the ledger cooldown
//   --include-system-lists  also consider the app's built-in Visited / Must-Go lists
//   --out <path>      picks JSON (default content-queue/subjects.json)
//   --json            print JSON to stdout instead of the table

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { getSupabase, selectIn, chunk } from './lib/supabase-client.mjs';
import { scoreRestaurant, scoreReviewReel, scoreList, MIN_LIST_PLACES, MIN_USABLE_QUOTE } from './lib/reel-readiness.mjs';
import { loadLedger, isCoolingDown, daysSinceProduced, DEFAULT_COOLDOWN_DAYS, QUEUE_ROOT } from './lib/content-state.mjs';

// ── CLI args ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (name) => args.includes(`--${name}`);

const kind = flag('kind') || 'all';
const KIND_CHOICES = ['restaurant', 'review', 'list', 'all', 'both'];
if (!KIND_CHOICES.includes(kind)) {
  console.error(`--kind must be ${KIND_CHOICES.join(' | ')} (got "${kind}")`);
  process.exit(1);
}
const wants = (k) => kind === k || kind === 'all' || (kind === 'both' && k !== 'review');
const limit = Math.max(1, Number(flag('limit') || 5));
const pool = Math.max(limit, Number(flag('pool') || 300));
const enrichCount = Math.max(limit, Number(flag('enrich') || 40));
const cityArg = flag('city');
const cooldownDays = Number(flag('cooldown') ?? DEFAULT_COOLDOWN_DAYS);
const minScore = Number(flag('min-score') || 0);
const includeRecent = has('include-recent');
const includeSystemLists = has('include-system-lists');
const jsonOnly = has('json');
const outPath = flag('out') || join(QUEUE_ROOT, 'subjects.json');

const sb = getSupabase();
const ledger = loadLedger();
const now = new Date();
const log = (...m) => { if (!jsonOnly) console.log(...m); };

// ── Shared helpers ───────────────────────────────────────────────────────
const approvedImages = (rows) => (rows || []).filter((im) => im.moderation_status !== 'rejected' && im.url);
const isCuisineOrVibe = (t) => t && (t.category === 'cuisine' || t.category === 'vibe');
const countBy = (rows, key) => {
  const m = new Map();
  for (const r of rows) m.set(r[key], (m.get(r[key]) ?? 0) + 1);
  return m;
};
const groupBy = (rows, key) => {
  const m = new Map();
  for (const r of rows) {
    const list = m.get(r[key]);
    if (list) list.push(r);
    else m.set(r[key], [r]);
  }
  return m;
};

/** Ledger verdict for one subject: eligible, or why not. */
function cooldownState(subjectKind, id) {
  const days = daysSinceProduced(ledger, subjectKind, id, now);
  const cooling = !includeRecent && isCoolingDown(ledger, subjectKind, id, { cooldownDays, now });
  return { producedDaysAgo: days, cooling };
}

// ── Restaurants ──────────────────────────────────────────────────────────
// One DB pass serves both restaurant reels and review spotlights; they differ
// only in how the same candidates are scored.
async function gatherRestaurantCandidates() {
  let cityIds = null;
  if (cityArg) {
    const { data, error } = await sb.from('cities').select('id, name').ilike('name', `%${cityArg}%`);
    if (error) throw new Error(`cities: ${error.message}`);
    if (!data?.length) throw new Error(`No city matching "${cityArg}"`);
    cityIds = data.map((c) => c.id);
    log(`City filter "${cityArg}" → ${data.length} cities`);
  }

  // Pass 1 — cheap columns only. `metadata` holds the Google ingest payload and
  // is far too heavy to pull for the whole pool, so we read just the two JSON
  // keys we can rank on and defer the rest to the enrich pass.
  let q = sb
    .from('restaurants')
    .select(
      `id, name, address, rating, latitude, longitude, external_place_id,
       metaReviewCount:metadata->review_count,
       consensus:metadata->review_consensus,
       home_city:cities!restaurants_municipality_id_fkey ( name )`
    )
    .order('rating', { ascending: false, nullsFirst: false })
    .limit(pool);
  if (cityIds) q = q.in('municipality_id', cityIds);

  const { data: rows, error } = await q;
  if (error) throw new Error(`restaurants: ${error.message}`);
  if (!rows?.length) return [];
  const ids = rows.map((r) => r.id);
  log(`Restaurants: ${rows.length} candidates`);

  const [reviewRows, imageRows, tagRows] = await Promise.all([
    selectIn('restaurant_reviews', 'restaurant_id, body', 'restaurant_id', ids),
    selectIn('restaurant_images', 'restaurant_id, url, moderation_status', 'restaurant_id', ids),
    selectIn('restaurant_tags', 'restaurant_id, tags ( slug, label, category )', 'restaurant_id', ids),
  ]);

  const withBody = reviewRows.filter((r) => typeof r.body === 'string' && r.body.trim().length > 0);
  const reviewsById = countBy(withBody, 'restaurant_id');
  // A review reel needs a quote long enough to fill a scene, so track usable
  // ones separately from the raw count.
  const usableById = countBy(withBody.filter((r) => r.body.trim().length >= MIN_USABLE_QUOTE), 'restaurant_id');
  const longestById = new Map();
  for (const r of withBody) {
    longestById.set(r.restaurant_id, Math.max(longestById.get(r.restaurant_id) ?? 0, r.body.trim().length));
  }
  const imagesById = countBy(approvedImages(imageRows), 'restaurant_id');
  const tagsById = groupBy(tagRows, 'restaurant_id');

  const base = rows.map((r) => {
    const tags = (tagsById.get(r.id) ?? []).map((t) => t.tags).filter(Boolean);
    const consensus = r.consensus && typeof r.consensus === 'object' ? r.consensus : null;
    const signatureDishes = Array.isArray(consensus?.signature_dishes) ? consensus.signature_dishes.length : 0;
    return {
      id: r.id,
      name: r.name,
      city: r.home_city?.name ?? null,
      address: r.address ?? null,
      rating: r.rating,
      hasCoords: Number.isFinite(Number(r.latitude)) && Number.isFinite(Number(r.longitude)) && r.latitude !== null,
      onPlatformReviews: reviewsById.get(r.id) ?? 0,
      googleReviews: 0, // filled by the enrich pass
      userQuotes: usableById.get(r.id) ?? 0,
      googleQuotes: 0, // filled by the enrich pass
      bestQuoteChars: longestById.get(r.id) ?? 0,
      photos: imagesById.get(r.id) ?? 0,
      chips: tags.filter(isCuisineOrVibe).length,
      dishes: signatureDishes || tags.filter((t) => t.category === 'dish').length,
      hasConsensus: Boolean(consensus?.summary || consensus?.strengths?.length),
      metaReviewCount: Number(r.metaReviewCount) || null,
    };
  });

  // Pass 2 — the expensive read. `metadata->user_reviews` is the Google review
  // text; it is the only source of review scenes for restaurants with no
  // on-platform reviews yet, so candidates are ranked with it assumed absent
  // and the top slice is enriched.
  const ranked = [...base].sort((a, b) => scoreRestaurant(b).score - scoreRestaurant(a).score);
  const toEnrich = ranked.slice(0, enrichCount);
  const enrichIds = toEnrich.map((c) => c.id);
  const byId = new Map(base.map((c) => [c.id, c]));

  for (const ids_ of chunk(enrichIds, 10)) {
    const { data, error: mErr } = await sb
      .from('restaurants')
      .select('id, userReviews:metadata->user_reviews, metaPhotos:metadata->photos')
      .in('id', ids_);
    if (mErr) throw new Error(`restaurants metadata: ${mErr.message}`);
    for (const row of data ?? []) {
      const c = byId.get(row.id);
      if (!c) continue;
      const userReviews = Array.isArray(row.userReviews) ? row.userReviews : [];
      const texts = userReviews.map((r) => (typeof r?.text === 'string' ? r.text.trim() : '')).filter(Boolean);
      c.googleReviews = texts.filter((t) => t.length > 20).length;
      c.googleQuotes = texts.filter((t) => t.length >= MIN_USABLE_QUOTE).length;
      c.bestQuoteChars = Math.max(c.bestQuoteChars, ...texts.map((t) => t.length), 0);
      if (!c.photos) {
        const metaPhotos = Array.isArray(row.metaPhotos) ? row.metaPhotos.filter(Boolean) : [];
        c.photos = metaPhotos.length;
      }
      c.enriched = true;
    }
  }
  log(`Restaurants: enriched ${toEnrich.length} with Google review metadata`);

  return toEnrich.map((c) => byId.get(c.id));
}

const pickRestaurants = (candidates) =>
  finalise('restaurant', candidates, scoreRestaurant, (c) => ({
    kind: 'restaurant',
    id: c.id,
    name: c.name,
    city: c.city,
    composition: 'RestaurantReviewsReel',
    command: `node scripts/fetch-restaurant-props.mjs --id ${c.id}`,
  }));

const pickReviews = (candidates) =>
  finalise('review', candidates, scoreReviewReel, (c) => ({
    kind: 'review',
    id: c.id,
    name: c.name,
    city: c.city,
    composition: 'RestaurantSpotlight',
    command: `node scripts/fetch-restaurant-props.mjs --id ${c.id} --reviews 1 --min-quote ${MIN_USABLE_QUOTE}`,
  }));

// ── Lists ────────────────────────────────────────────────────────────────
async function pickLists() {
  const LIST_SELECT = 'id, name, description, visibility, user_id, published_at, updated_at, system_key';
  const load = (select) =>
    sb
      .from('lists')
      .select(select)
      .in('visibility', ['public', 'public_subscribers'])
      .order('updated_at', { ascending: false })
      .limit(pool);

  // `system_key` marks built-ins like the visited list; older deployments omit
  // the column, so fall back the same way the app's visit-actions does.
  let { data: rows, error } = await load(LIST_SELECT);
  if (error) ({ data: rows, error } = await load('id, name, description, visibility, user_id, published_at, updated_at'));
  if (error) throw new Error(`lists: ${error.message}`);
  rows = (rows ?? []).filter((l) => includeSystemLists || !l.system_key);
  if (!rows.length) return { picks: [], stats: { candidates: 0 } };
  log(`Lists: ${rows.length} public candidates${includeSystemLists ? ' (including built-ins)' : ''}`);

  const listIds = rows.map((l) => l.id);
  const itemRows = await selectIn('list_items', 'list_id, restaurant_id, created_at', 'list_id', listIds);
  const itemsByList = groupBy(itemRows.filter((i) => i.restaurant_id), 'list_id');

  // Only pull restaurants for lists that could actually fill a reel.
  const viable = rows.filter((l) => (itemsByList.get(l.id) ?? []).length >= MIN_LIST_PLACES);
  if (!viable.length) return { picks: [], stats: { candidates: rows.length, gated: rows.length } };

  const restaurantIds = [...new Set(viable.flatMap((l) => (itemsByList.get(l.id) ?? []).map((i) => i.restaurant_id)))];
  const [restaurantRows, imageRows, tagRows, userRows] = await Promise.all([
    selectIn(
      'restaurants',
      'id, name, rating, metaPhotos:metadata->photos, home_city:cities!restaurants_municipality_id_fkey ( name )',
      'id',
      restaurantIds,
      { chunkSize: 50 }
    ),
    selectIn('restaurant_images', 'restaurant_id, url, moderation_status', 'restaurant_id', restaurantIds),
    selectIn('restaurant_tags', 'restaurant_id, tags ( slug, label, category )', 'restaurant_id', restaurantIds),
    selectIn('users', 'id, display_name, username', 'id', [...new Set(viable.map((l) => l.user_id).filter(Boolean))]),
  ]);

  const restaurantById = new Map(restaurantRows.map((r) => [r.id, r]));
  const imagesById = countBy(approvedImages(imageRows), 'restaurant_id');
  const tagsById = groupBy(tagRows, 'restaurant_id');
  const userById = new Map(userRows.map((u) => [u.id, u]));

  const candidates = viable.map((l) => {
    const places = (itemsByList.get(l.id) ?? [])
      .map((i) => restaurantById.get(i.restaurant_id))
      .filter(Boolean);
    const ratings = places.map((p) => Number(p.rating)).filter(Number.isFinite);
    const cities = places.map((p) => p.home_city?.name).filter(Boolean);
    const cityCounts = countBy(cities.map((name) => ({ name })), 'name');
    const topCity = [...cityCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;
    const user = userById.get(l.user_id) ?? null;

    return {
      id: l.id,
      name: l.name,
      description: l.description,
      visibility: l.visibility,
      city: topCity?.[0] ?? null,
      creator: user ? user.display_name || user.username || null : null,
      creatorHandle: user?.username ?? null,
      creatorNamed: Boolean(user?.display_name || user?.username),
      placeCount: places.length,
      placesWithPhoto: places.filter(
        (p) => (imagesById.get(p.id) ?? 0) > 0 || (Array.isArray(p.metaPhotos) && p.metaPhotos.filter(Boolean).length > 0)
      ).length,
      placesWithTagline: places.filter((p) => (tagsById.get(p.id) ?? []).map((t) => t.tags).some(isCuisineOrVibe)).length,
      avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
      cityCoherence: places.length ? (topCity?.[1] ?? 0) / places.length : 0,
    };
  });

  return finalise('list', candidates, scoreList, (c) => ({
    kind: 'list',
    id: c.id,
    name: c.name,
    city: c.city,
    creator: c.creator,
    placeCount: c.placeCount,
    composition: 'ListShowcase',
    command: `node scripts/fetch-list-props.mjs --id ${c.id}`,
  }));
}

// ── Scoring, gating, ranking ─────────────────────────────────────────────
function finalise(subjectKind, candidates, scorer, shape) {
  const stats = { candidates: candidates.length, blocked: 0, cooling: 0, belowMinScore: 0 };
  const picks = [];

  for (const c of candidates) {
    const result = scorer(c);
    if (result.blockers.length) { stats.blocked += 1; continue; }
    const { producedDaysAgo, cooling } = cooldownState(subjectKind, c.id);
    if (cooling) { stats.cooling += 1; continue; }
    if (result.score < minScore) { stats.belowMinScore += 1; continue; }
    picks.push({
      ...shape(c),
      score: result.score,
      breakdown: result.breakdown,
      signals: result.signals,
      warnings: result.warnings,
      producedDaysAgo,
    });
  }

  // Scores saturate once a subject has everything the reel renders, so break ties
  // on how much real material is behind it, then on name for a stable order.
  const depth = (p) => p.signals.reviewPool ?? p.signals.placeCount ?? 0;
  picks.sort(
    (a, b) => b.score - a.score || depth(b) - depth(a) || (b.signals.rating ?? 0) - (a.signals.rating ?? 0) || String(a.name).localeCompare(String(b.name))
  );
  return { picks: picks.slice(0, limit), stats };
}

// ── Run ──────────────────────────────────────────────────────────────────
const result = { generatedAt: now.toISOString(), cooldownDays: includeRecent ? 0 : cooldownDays, limit, restaurants: [], reviews: [], lists: [], stats: {} };

if (wants('restaurant') || wants('review')) {
  const candidates = await gatherRestaurantCandidates();
  if (wants('restaurant')) {
    const { picks, stats } = pickRestaurants(candidates);
    result.restaurants = picks;
    result.stats.restaurants = stats;
  }
  if (wants('review')) {
    const { picks, stats } = pickReviews(candidates);
    result.reviews = picks;
    result.stats.reviews = stats;
  }
}
if (wants('list')) {
  const { picks, stats } = await pickLists();
  result.lists = picks;
  result.stats.lists = stats;
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`);

if (jsonOnly) {
  console.log(JSON.stringify(result, null, 2));
} else {
  for (const [label, picks] of [
    ['RESTAURANT REELS', result.restaurants],
    ['REVIEW SPOTLIGHTS', result.reviews],
    ['LIST REELS', result.lists],
  ]) {
    if (!picks.length) continue;
    console.log(`\n${label}`);
    for (const p of picks) {
      const age = p.producedDaysAgo === null ? 'never produced' : `last produced ${p.producedDaysAgo}d ago`;
      console.log(`  ${String(p.score).padStart(5)}  ${p.name}${p.city ? ` · ${p.city}` : ''}  (${age})`);
      console.log(`         ${JSON.stringify(p.signals)}`);
      for (const w of p.warnings) console.log(`         ! ${w}`);
      console.log(`         ${p.command}`);
    }
  }
  console.log(`\nStats: ${JSON.stringify(result.stats)}`);
  console.log(`Wrote ${outPath}`);
  if (!result.restaurants.length && !result.reviews.length && !result.lists.length) {
    console.log('No eligible subjects. Try --include-recent, a bigger --pool, or a lower --min-score.');
  }
}
