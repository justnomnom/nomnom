#!/usr/bin/env node
// Pulls one restaurant + its real reviews/tags/dishes/photos from Supabase
// from Supabase and writes Remotion props for RestaurantReviewsReel.
//
// Usage:
//   node scripts/fetch-restaurant-props.mjs --name "Casa Lupo"
//   node scripts/fetch-restaurant-props.mjs --id <uuid>
//   node scripts/fetch-restaurant-props.mjs --place-id <external_place_id>
//
// Options:
//   --out <path>       output JSON path (default props/<slug>.json)
//   --reviews <n>      number of review scenes to include (default 3)
//   --render           render the video immediately after writing props
//
// Data honesty: this script never invents restaurant-specific facts. Fields
// with no real source (operational caveats like "book ahead", a personalized
// "your circle" follow graph) are left empty and the corresponding scene
// section hides itself rather than showing fabricated copy.

import { config as loadEnv } from 'dotenv';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REMOTION_ROOT = join(__dirname, '..');
const REPO_ROOT = join(REMOTION_ROOT, '..');

for (const f of ['.env.local', '.env']) {
  const p = join(REPO_ROOT, f);
  if (existsSync(p)) loadEnv({ path: p });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    'Missing Supabase env (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY). Checked .env.local and .env at repo root.'
  );
  process.exit(1);
}
const sb = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });

// ── CLI args ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (name) => args.includes(`--${name}`);

const idArg = flag('id');
const placeIdArg = flag('place-id');
const nameArg = flag('name');
const outArg = flag('out');
const reviewLimit = Math.max(1, Number(flag('reviews') || 3));
const shouldRender = has('render');

if (!idArg && !placeIdArg && !nameArg) {
  console.error(
    'Usage: node scripts/fetch-restaurant-props.mjs --name "Restaurant Name" | --id <uuid> | --place-id <external_place_id>'
  );
  process.exit(1);
}

// ── Resolve restaurant id ────────────────────────────────────────────────
let restaurantId = idArg;

if (!restaurantId && placeIdArg) {
  const { data, error } = await sb
    .from('restaurants')
    .select('id, name')
    .eq('external_place_id', placeIdArg)
    .maybeSingle();
  if (error) { console.error(error.message); process.exit(1); }
  if (!data) { console.error(`No restaurant with external_place_id "${placeIdArg}"`); process.exit(1); }
  restaurantId = data.id;
}

if (!restaurantId && nameArg) {
  const { data, error } = await sb
    .from('restaurants')
    .select('id, name, address')
    .ilike('name', `%${nameArg}%`)
    .limit(6);
  if (error) { console.error(error.message); process.exit(1); }
  if (!data?.length) { console.error(`No restaurant matching "${nameArg}"`); process.exit(1); }
  if (data.length > 1) {
    console.error(`Multiple restaurants match "${nameArg}" — rerun with --id:`);
    for (const r of data) console.error(`  ${r.id}  ${r.name}  ${r.address ?? ''}`);
    process.exit(1);
  }
  restaurantId = data[0].id;
}

// ── Fetch restaurant + related rows ─────────────────────────────────────
const { data: restaurant, error: rErr } = await sb
  .from('restaurants')
  .select(
    `
    id, name, address, rating, price_level, latitude, longitude, metadata,
    restaurant_images ( url, sort_order, moderation_status ),
    home_city:cities!restaurants_municipality_id_fkey ( name, states ( name ) )
  `
  )
  .eq('id', restaurantId)
  .maybeSingle();
if (rErr) { console.error(rErr.message); process.exit(1); }
if (!restaurant) { console.error(`Restaurant ${restaurantId} not found`); process.exit(1); }

const [{ data: tagRows }, { data: reviews, count: reviewCount }] = await Promise.all([
    sb.from('restaurant_tags').select('tags ( slug, label, category, sort_order )').eq('restaurant_id', restaurantId),
    sb
      .from('restaurant_reviews')
      .select('id, rating, body, author_display_name, author_username, created_at', { count: 'exact' })
      .eq('restaurant_id', restaurantId)
      .order('rating', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

// ── Helpers ──────────────────────────────────────────────────────────────
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmtCount = (n) => (n != null ? new Intl.NumberFormat('en-US').format(n) : null);

function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function prettifyUsername(username) {
  if (!username) return null;
  const stripped = username.replace(/^@/, '');
  return stripped
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function handleOf(username) {
  if (!username) return null;
  return username.startsWith('@') ? username : `@${username}`;
}

function truncateQuote(text, maxChars = 150) {
  const trimmed = String(text || '').trim();
  if (trimmed.length <= maxChars) return trimmed;
  const cut = trimmed.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxChars)}…`;
}

function wrapName(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [name || ''];
  if (words.length === 2) return [words[0], words[1]];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

const EMOJI_BY_SLUG = {
  italian: 'spaghetti',
  pasta: 'spaghetti',
  pizza: 'pizza',
  japanese: 'sushi',
  sushi: 'sushi',
  ramen: 'steaming-bowl',
  noodles: 'steaming-bowl',
  mexican: 'taco',
  bbq: 'meat-on-bone',
  steak: 'meat-on-bone',
  seafood: 'shrimp',
  vegan: 'green-salad',
  vegetarian: 'green-salad',
  salad: 'green-salad',
  bakery: 'croissant',
  french: 'croissant',
  dessert: 'shortcake',
  cake: 'shortcake',
  wine: 'wine-glass',
  bar: 'cocktail-glass',
  cocktails: 'cocktail-glass',
  cafe: 'hot-beverage',
  coffee: 'hot-beverage',
  brunch: 'fried-egg',
  breakfast: 'fried-egg',
  chinese: 'takeout-box',
  thai: 'steaming-bowl',
  indian: 'curry-rice',
  curry: 'curry-rice',
  burger: 'hamburger',
  burgers: 'hamburger',
  fried_chicken: 'poultry-leg',
  chicken: 'poultry-leg',
  portuguese: 'bread',
  fish: 'fish',
  petiscos: 'bread',
  tapas: 'bread',
};
const FALLBACK_DISH_EMOJI = 'fork-and-knife';
const FALLBACK_VIBE_EMOJI = 'sparkles';

const AVATAR_PALETTE = [
  { tint: '#FFE8DF', ink: '#B8481F' },
  { tint: '#FCE7C8', ink: '#B45309' },
  { tint: '#E7DCC9', ink: '#6e6657' },
  { tint: '#DCEAE3', ink: '#2F6B57' },
  { tint: '#E3DEF5', ink: '#5B4B8A' },
];

// ── Derived data ─────────────────────────────────────────────────────────
const meta = restaurant.metadata && typeof restaurant.metadata === 'object' ? restaurant.metadata : {};

// Rich ingest metadata (Google + AI consensus), present on ingested restaurants.
const metaUserReviews = Array.isArray(meta.user_reviews) ? meta.user_reviews : [];
const consensus = meta.review_consensus && typeof meta.review_consensus === 'object' ? meta.review_consensus : null;
const metaMentioned = Array.isArray(meta.mentioned_in_reviews) ? meta.mentioned_in_reviews : [];
const metaSignatureDishes = Array.isArray(consensus?.signature_dishes) ? consensus.signature_dishes : [];
const metaReviewCount = Number.isFinite(meta.review_count) ? meta.review_count : null;
const metaCity = meta.complete_address?.city || null;

const metaPhotos = Array.isArray(meta.photos) ? meta.photos.filter(Boolean) : [];
const imgPhotos = (restaurant.restaurant_images || [])
  .filter((im) => im.moderation_status !== 'rejected')
  .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
  .map((im) => im.url)
  .filter(Boolean);
const photos = imgPhotos.length ? imgPhotos : metaPhotos;

const tags = (tagRows || [])
  .map((r) => r.tags)
  .filter(Boolean)
  .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
const cuisineVibeTags = tags.filter((t) => t.category === 'cuisine' || t.category === 'vibe').slice(0, 3);
const dishTagLabels = tags.filter((t) => t.category === 'dish').map((t) => t.label);
const primaryCuisineSlug = tags.find((t) => t.category === 'cuisine')?.slug;

const cityName = restaurant.home_city?.name || metaCity || null;
const stateName = restaurant.home_city?.states?.name || null;
const location = cityName || stateName || 'your area';

// Ratings are on the app's native 0–5 scale (restaurants.rating,
// restaurant_reviews.rating 1–5, metadata Google ratings) — used as-is.
const rating5 = restaurant.rating != null ? clamp(restaurant.rating, 0, 5) : 0;

const taglineParts = [...cuisineVibeTags.map((t) => t.label), cityName].filter(Boolean);
const tagline = taglineParts.length ? taglineParts.join(' · ') : restaurant.address || '';

const chips = cuisineVibeTags.map((t) => ({
  emoji: EMOJI_BY_SLUG[t.slug] || (t.category === 'vibe' ? FALLBACK_VIBE_EMOJI : FALLBACK_DISH_EMOJI),
  label: t.label,
}));

// Dish chips for the consensus scene, with real mention counts when available.
// Priority: AI signature dishes → mentioned-in-reviews → dish tags.
const titleCase = (s) => String(s).replace(/\b\w/g, (c) => c.toUpperCase());
const dishesFromMentions = (metaSignatureDishes.length ? metaSignatureDishes : metaMentioned)
  .filter((d) => d && d.label && !/seating|hours|service|parking|wifi|reservation/i.test(d.label))
  .slice(0, 5)
  .map((d) => [titleCase(d.label), Number.isFinite(d.mentions) ? d.mentions : null]);
const dishes = dishesFromMentions.length ? dishesFromMentions : dishTagLabels;
// Flat labels used to caption the per-review dish tiles.
const dishLabels = dishes.map((d) => (Array.isArray(d) ? d[0] : d));

// ── Review pool: on-platform reviews, then Google ingest metadata ─────────
const userReviews = (reviews || [])
  .filter((r) => typeof r.body === 'string' && r.body.trim().length > 0)
  .map((r, i) => ({
    init: initials(r.author_display_name || prettifyUsername(r.author_username) || 'ND'),
    name: r.author_display_name || prettifyUsername(r.author_username) || 'NomNom diner',
    handle: handleOf(r.author_username) || '',
    ...AVATAR_PALETTE[i % AVATAR_PALETTE.length],
    follows: false,
    score: r.rating != null ? clamp(r.rating, 0, 5) : rating5,
    quote: truncateQuote(r.body, 150),
    _sourceOrder: i,
  }));
const skippedEmptyBody = (reviews || []).length - userReviews.length;
if (skippedEmptyBody > 0) {
  console.log(`Skipped ${skippedEmptyBody} review row(s) with an empty body.`);
}

// Google reviews from ingest metadata — real reviewer name, rating, text.
const googleReviews = metaUserReviews
  .filter((r) => typeof r.text === 'string' && r.text.trim().length > 20)
  .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
  .map((r, i) => ({
    init: initials(r.author_name || 'Diner'),
    name: r.author_name || 'Google reviewer',
    handle: '', // Google reviewers have no handle; falls back to plain name
    ...AVATAR_PALETTE[i % AVATAR_PALETTE.length],
    follows: false,
    score: r.rating != null ? clamp(r.rating, 0, 5) : rating5,
    quote: truncateQuote(r.text, 150),
    _sourceOrder: 1000 + i,
  }));

const reviewPool = [...userReviews, ...googleReviews];
if (!reviewPool.length) {
  console.error(
    `Restaurant "${restaurant.name}" has no reviews yet — the reel needs at least 1 review scene.`
  );
  process.exit(1);
}
const chosenReviews = reviewPool.slice(0, reviewLimit).map((r, i) => {
  const dishLabel = dishLabels.length ? dishLabels[i % dishLabels.length] : null;
  const dish = dishLabel || (cuisineVibeTags[0] ? `${cuisineVibeTags[0].label} favorite` : 'Fan favorite');
  const emojiSlug = dishLabel ? undefined : primaryCuisineSlug;
  const { tint, ink, _sourceOrder, ...rest } = r;
  return {
    ...rest,
    tint,
    tintInk: ink,
    dish,
    emoji: EMOJI_BY_SLUG[emojiSlug] || FALLBACK_DISH_EMOJI,
    photo: photos.length ? photos[i % photos.length] : null,
  };
});

// Consensus card. Prefer the AI review_consensus (strengths/weaknesses/summary);
// otherwise fall back to real quotes not already shown on a review card.
const usedQuotes = new Set(chosenReviews.map((r) => r.quote));
const loves = (
  consensus?.strengths?.length
    ? consensus.strengths
    : reviewPool.map((r) => r.quote).filter((q) => q && !usedQuotes.has(q))
)
  .map((s) => truncateQuote(s, 90))
  .slice(0, 3);
const knows = (consensus?.weaknesses || []).map((s) => truncateQuote(s, 90)).slice(0, 2);

const pullQuote = truncateQuote(consensus?.summary || reviewPool[0]?.quote || '', 220);

const totalReviewCount = metaReviewCount ?? reviewCount ?? null;

// ── Real static map image (Mapbox) ───────────────────────────────────────
// Downloaded to public/maps/<slug>.png so renders stay offline-deterministic.
// 540x960 @2x → 1080x1920 (exact 9:16); the reel draws its own pin/halo on top,
// so the map is requested clean (no Mapbox marker) and centered on the venue.
const slug = restaurant.name
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');

let mapImage = null;
const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
const lat = restaurant.latitude;
const lng = restaurant.longitude;
if (mapboxToken && Number.isFinite(lat) && Number.isFinite(lng)) {
  // Match the in-app map: same Mapbox Streets style the dashboard canvas uses
  // (src/sections/map/view/dashboard-map-canvas.js → mapbox/streets-v12).
  const zoom = 15.2;
  const style = 'streets-v12';
  const mapUrl =
    `https://api.mapbox.com/styles/v1/mapbox/${style}/static/` +
    `${lng},${lat},${zoom},0/540x960@2x?access_token=${mapboxToken}&attribution=false&logo=false`;
  try {
    const res = await fetch(mapUrl);
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      const mapDir = join(REMOTION_ROOT, 'public', 'maps');
      mkdirSync(mapDir, { recursive: true });
      writeFileSync(join(mapDir, `${slug}.png`), buf);
      mapImage = `maps/${slug}.png`;
    } else {
      console.warn(`Mapbox static map failed (${res.status}); using stylized map fallback.`);
    }
  } catch (e) {
    console.warn(`Mapbox static map error (${e.message}); using stylized map fallback.`);
  }
} else if (!mapboxToken) {
  console.warn('No NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN; using stylized map fallback.');
} else {
  console.warn('Restaurant has no coordinates; using stylized map fallback.');
}

// ── Assemble props ──────────────────────────────────────────────────────
const props = {
  hookOverline: `${location} · right now`,
  hookLines: ['Locals', "won't stop", 'talking about', 'this spot.'],
  restaurant: {
    name: restaurant.name,
    nameLines: wrapName(restaurant.name),
    tagline,
    location,
    rating: rating5,
    address: restaurant.address || '',
    savedBy: totalReviewCount ? `+${fmtCount(totalReviewCount)}` : '',
    circleLabel: 'Loved by the NomNom community',
    mapImage,
  },
  chips,
  badgeText: 'In your NomNom Circle',
  reviews: chosenReviews,
  consensus: {
    quote: pullQuote,
    loves,
    knows, // from AI review_consensus.weaknesses; empty → section hides itself
    dishes,
    reviewCount: totalReviewCount ? fmtCount(totalReviewCount) : null,
  },
  cta: {
    headlineLines: ["Don't take", 'our word.'],
    subLines: ['Take theirs. The spots people you', "trust can't stop recommending."],
    button: 'Save this spot',
    footer: 'Join the Nom Nom Circle · nomnom.app',
  },
};

// ── Write output ─────────────────────────────────────────────────────────
const outPath = outArg || join(REMOTION_ROOT, 'props', `${slug}.json`);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(props, null, 2));

console.log(`Restaurant: ${restaurant.name}  (${restaurant.id})`);
console.log(
  `Reviews: ${chosenReviews.length} shown / pool ${reviewPool.length} ` +
    `(on-platform ${userReviews.length}, google ${googleReviews.length})`
);
console.log(`Consensus: ${consensus ? `AI summary + ${loves.length} loves / ${knows.length} knows` : 'from quotes'}`);
console.log(`Dishes: ${dishes.length}${dishes[0] && Array.isArray(dishes[0]) ? ' (with mention counts)' : ''}`);
console.log(`Photos: ${photos.length} · Tags: ${tags.length} (${cuisineVibeTags.length} chips) · Reviews total: ${totalReviewCount ?? 0}`);
console.log(`Map: ${mapImage ? `real (${mapImage})` : 'stylized fallback'}`);
console.log(`Wrote ${outPath}`);

if (shouldRender) {
  const outMp4 = join(REMOTION_ROOT, 'out', `${slug}.mp4`);
  console.log(`Rendering ${outMp4} ...`);
  execFileSync(
    'npx',
    ['remotion', 'render', 'RestaurantReviewsReel', outMp4, `--props=${outPath}`],
    { cwd: REMOTION_ROOT, stdio: 'inherit', shell: true }
  );
  console.log(`Rendered ${outMp4}`);
}
