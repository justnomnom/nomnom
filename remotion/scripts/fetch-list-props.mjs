#!/usr/bin/env node
// Pulls one list + its real places from Supabase and writes Remotion props
// for ListShowcase.
//
// Usage:
//   node scripts/fetch-list-props.mjs --id <uuid>
//   node scripts/fetch-list-props.mjs --name "Caldas must-gos"
//
// Options:
//   --out <path>       output JSON path (default props/<slug>.json)
//   --places <n>       max spot scenes (default 6; runtime is 10s + 3.5s each)
//   --render           render the video immediately after writing props
//
// Data honesty: same rule as fetch-restaurant-props.mjs. Every optional field
// is passed explicitly — as an empty value when there is no real source — so
// the composition's placeholder defaults can never leak into a real render.
// ListShowcase guards each of them (subtitle, neighbourhood, tagline, rating,
// photo), so an absent value hides its element instead of inventing one.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { getSupabase, REMOTION_ROOT } from './lib/supabase-client.mjs';
import { AVATAR_PALETTE, handleOf, initials, prettifyUsername, slugify, wrapName } from './lib/subject-text.mjs';
import { MIN_LIST_PLACES, listReelSeconds } from './lib/reel-readiness.mjs';
import {
  captionSiteOrigin,
  listPublicUrl,
  photoFitForAspect,
  spotConsensusFromMetadata,
  spotLocationFromRestaurant,
} from '../../src/libs/lists/list-spot-fields.js';
import { probeImageSize } from './lib/image-header.mjs';

const sb = getSupabase();

// ── CLI args ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (name) => args.includes(`--${name}`);

const idArg = flag('id');
const nameArg = flag('name');
const outArg = flag('out');
const placeLimit = Math.max(1, Number(flag('places') || 6));
const shouldRender = has('render');

if (!idArg && !nameArg) {
  console.error('Usage: node scripts/fetch-list-props.mjs --id <uuid> | --name "List name"');
  process.exit(1);
}

// ── Resolve list ─────────────────────────────────────────────────────────
let listId = idArg;
if (!listId) {
  const { data, error } = await sb.from('lists').select('id, name, visibility').ilike('name', `%${nameArg}%`).limit(6);
  if (error) { console.error(error.message); process.exit(1); }
  if (!data?.length) { console.error(`No list matching "${nameArg}"`); process.exit(1); }
  if (data.length > 1) {
    console.error(`Multiple lists match "${nameArg}" — rerun with --id:`);
    for (const l of data) console.error(`  ${l.id}  ${l.name}  ${l.visibility}`);
    process.exit(1);
  }
  listId = data[0].id;
}

const { data: list, error: lErr } = await sb
  .from('lists')
  .select('id, name, description, visibility, user_id, created_at, slug')
  .eq('id', listId)
  .maybeSingle();
if (lErr) { console.error(lErr.message); process.exit(1); }
if (!list) { console.error(`List ${listId} not found`); process.exit(1); }

// ── Places, in list sort_order (created_at is a tie-break only) ───────────
const { data: items, error: iErr } = await sb
  .from('list_items')
  .select('restaurant_id, sort_order, created_at')
  .eq('list_id', listId)
  .order('sort_order', { ascending: true })
  .order('created_at', { ascending: true });
if (iErr) { console.error(iErr.message); process.exit(1); }

const restaurantIds = [...new Set((items ?? []).map((i) => i.restaurant_id).filter(Boolean))];
if (restaurantIds.length < MIN_LIST_PLACES) {
  console.error(
    `List "${list.name}" has ${restaurantIds.length} place(s) — ListShowcase needs at least ${MIN_LIST_PLACES}.`
  );
  process.exit(1);
}

const [{ data: restaurants, error: rErr }, { data: tagRows }, { data: creatorRow }] = await Promise.all([
  sb
    .from('restaurants')
    .select(
      `id, name, address, rating, metadata,
       restaurant_images ( url, sort_order, moderation_status ),
       home_city:cities!restaurants_municipality_id_fkey ( name )`
    )
    .in('id', restaurantIds),
  sb.from('restaurant_tags').select('restaurant_id, tags ( slug, label, category, sort_order )').in('restaurant_id', restaurantIds),
  list.user_id
    ? sb.from('users').select('id, display_name, username').eq('id', list.user_id).maybeSingle()
    : Promise.resolve({ data: null }),
]);
if (rErr) { console.error(rErr.message); process.exit(1); }

const restaurantById = new Map((restaurants ?? []).map((r) => [r.id, r]));
const tagsById = new Map();
for (const row of tagRows ?? []) {
  if (!row.tags) continue;
  const list_ = tagsById.get(row.restaurant_id) ?? [];
  list_.push(row.tags);
  tagsById.set(row.restaurant_id, list_);
}

// ── Build places ─────────────────────────────────────────────────────────
const firstPhoto = (r) => {
  const approved = (r.restaurant_images || [])
    .filter((im) => im.moderation_status !== 'rejected' && im.url)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  if (approved.length) return approved[0].url;
  const meta = r.metadata && typeof r.metadata === 'object' ? r.metadata : {};
  const metaPhotos = Array.isArray(meta.photos) ? meta.photos.filter(Boolean) : [];
  return metaPhotos[0] ?? null;
};

const places = restaurantIds
  .map((id) => restaurantById.get(id))
  .filter(Boolean)
  .slice(0, placeLimit)
  .map((r) => {
    const tags = (tagsById.get(r.id) ?? []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const tagline = tags
      .filter((t) => t.category === 'cuisine' || t.category === 'vibe')
      .slice(0, 2)
      .map((t) => t.label)
      .join(' · ');
    const consensus = spotConsensusFromMetadata(r.metadata);
    return {
      id: r.id,
      name: r.name,
      nameLines: wrapName(r.name),
      tagline, // '' hides the line rather than inventing a vibe
      neighbourhood: r.home_city?.name || '',
      location: spotLocationFromRestaurant(r),
      rating: Number.isFinite(Number(r.rating)) && r.rating !== null ? Number(r.rating) : null,
      photo: firstPhoto(r),
      photoFit: 'cover',
      consensus,
    };
  });

for (const place of places) {
  if (!place.photo) continue;
  const size = await probeImageSize(place.photo);
  place.photoFit = photoFitForAspect(size ? size.width / size.height : null);
}

const missing = restaurantIds.length - restaurantById.size;
if (missing > 0) console.log(`Skipped ${missing} list item(s) whose restaurant row is gone.`);

// ── Location: only claimed when the places agree on one ──────────────────
const cityCounts = new Map();
for (const p of places) if (p.neighbourhood) cityCounts.set(p.neighbourhood, (cityCounts.get(p.neighbourhood) ?? 0) + 1);
const [topCity, topCityCount] = [...cityCounts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [null, 0];
const location = topCityCount === places.length ? topCity : '';

// ── Creator ──────────────────────────────────────────────────────────────
const creatorName = creatorRow?.display_name || prettifyUsername(creatorRow?.username) || '';
const creator = {
  name: creatorName,
  handle: handleOf(creatorRow?.username) || '',
  init: creatorName ? initials(creatorName) : '',
  tint: AVATAR_PALETTE[0].tint,
  tintInk: AVATAR_PALETTE[0].ink,
};

const listUrl = listPublicUrl({
  origin: captionSiteOrigin(process.env),
  username: creatorRow?.username,
  slug: list.slug,
  listId: list.id,
});

// ── Assemble props ───────────────────────────────────────────────────────
const subtitleParts = [String(list.description || '').trim(), location].filter(Boolean);
const props = {
  list: {
    title: list.name,
    titleLines: wrapName(list.name),
    subtitle: subtitleParts.join(' · '),
    location,
    url: listUrl,
    slug: list.slug || '',
  },
  creator,
  places,
  cta: {
    headlineLines: ['Guardar na lista.'],
    // Empty → the CTA scene builds its line from the real place count and handle.
    sub: '',
    button: 'Guardar na lista',
    footer: listUrl ? listUrl.replace(/^https:\/\//i, '') : 'O teu Círculo NomNom · justnomnom.com',
  },
};

const slug = slugify(list.name) || `list-${listId.slice(0, 8)}`;
const outPath = outArg || join(REMOTION_ROOT, 'props', `${slug}.json`);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(props, null, 2));

console.log(`List: ${list.name}  (${list.id})  ${list.visibility}`);
console.log(`Creator: ${creator.name || '(unnamed — intro avatar shows a placeholder)'}`);
console.log(
  `Places: ${places.length}${restaurantIds.length > places.length ? ` of ${restaurantIds.length} (--places ${placeLimit})` : ''}` +
    ` · with photo ${places.filter((p) => p.photo).length} · with tagline ${places.filter((p) => p.tagline).length}`
);
console.log(`Location: ${location || '(places span cities — line hidden)'}`);
console.log(
  `Spot fields: ${places.filter((p) => p.location).length}/${places.length} specific location · ${places.filter((p) => p.consensus?.summary).length}/${places.length} consensus`
);
console.log(`List URL: ${listUrl || '(no username/slug — id fallback empty)'}`);
console.log(`Subtitle: ${props.list.subtitle || '(none — hidden)'}`);
console.log(`Runtime: ~${Math.round(listReelSeconds(places.length))}s`);
console.log(`Wrote ${outPath}`);

if (shouldRender) {
  const outMp4 = join(REMOTION_ROOT, 'out', `${slug}.mp4`);
  if (!existsSync(join(REMOTION_ROOT, 'out'))) mkdirSync(join(REMOTION_ROOT, 'out'), { recursive: true });
  console.log(`Rendering ${outMp4} ...`);
  execFileSync('npx', ['remotion', 'render', 'ListShowcase', outMp4, `--props=${outPath}`], {
    cwd: REMOTION_ROOT,
    stdio: 'inherit',
    shell: true,
  });
  console.log(`Rendered ${outMp4}`);
}
