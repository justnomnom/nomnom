/**
 * Seed one fully-populated sample restaurant.
 *
 * Every field the app reads is filled in — hours, about, photos, tags, per-rating review
 * breakdown, and the AI review consensus — so the detail page, map sheet, OG card and share
 * message can all be exercised without waiting on a real Google ingest.
 *
 * Identifiable and reversible by design: the row is keyed on `external_place_id =
 * SAMPLE-NOMNOM-001`, so `npm run seed:sample-restaurant -- --remove` takes it back out.
 * Re-running replaces the row rather than duplicating it.
 *
 * Photos come from images.unsplash.com (already in `remote-image-patterns.cjs`) rather than
 * another venue's storage objects, so nothing is misattributed. The website and menu links
 * use example.com, the reserved documentation domain, so they cannot resolve to a real site.
 *
 *   node scripts/seed-sample-restaurant.cjs            # insert or replace
 *   node scripts/seed-sample-restaurant.cjs --remove   # delete it again
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const EXTERNAL_PLACE_ID = 'SAMPLE-NOMNOM-001';
const CITY_NAME = 'Lisboa';

const PHOTOS = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=80',
  'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=1200&q=80',
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80',
];

const TAG_SLUGS = [
  'portuguese',
  'seafood',
  'casual',
  'cozy',
  'romantic',
  'outdoor_seating',
  'solo_friendly',
  'table_service',
  'wheelchair_accessible',
  'wine_cellar',
];

/** Both shapes the app reads: `open_hours` for display, `hours_parsed` for open-now logic. */
const SERVICE = [
  { open: '12:00', close: '15:00', crosses_midnight: false },
  { open: '19:00', close: '23:00', crosses_midnight: false },
];
const HOURS_PARSED = {
  Monday: [],
  Tuesday: SERVICE,
  Wednesday: SERVICE,
  Thursday: SERVICE,
  Friday: SERVICE,
  Saturday: SERVICE,
  Sunday: [{ open: '12:00', close: '15:00', crosses_midnight: false }],
};
const OPEN_HOURS = {
  Monday: ['Closed'],
  Tuesday: ['12–3 pm', '7–11 pm'],
  Wednesday: ['12–3 pm', '7–11 pm'],
  Thursday: ['12–3 pm', '7–11 pm'],
  Friday: ['12–3 pm', '7–11 pm'],
  Saturday: ['12–3 pm', '7–11 pm'],
  Sunday: ['12–3 pm'],
};

const METADATA = {
  primary_category: 'Portuguese restaurant',
  categories: ['Portuguese restaurant', 'Seafood restaurant'],
  timezone: 'Europe/Lisbon',
  complete_address: 'R. do Exemplo 12, 1200-109 Lisboa, Portugal',
  plus_code: '8CCGPRJW+9F',
  open_hours: OPEN_HOURS,
  hours_parsed: HOURS_PARSED,
  photos: PHOTOS,
  image_url: PHOTOS[0],
  review_count: 128,
  reviews_per_rating: { 1: 2, 2: 3, 3: 8, 4: 35, 5: 80 },
  tag_slugs: TAG_SLUGS,
  about: [
    {
      id: 'service_options',
      name: 'Service options',
      options: [
        { name: 'Dine-in', enabled: true },
        { name: 'Outdoor seating', enabled: true },
        { name: 'Takeaway', enabled: true },
        { name: 'Delivery', enabled: false },
      ],
    },
    {
      id: 'highlights',
      name: 'Highlights',
      options: [
        { name: 'Great wine list', enabled: true },
        { name: 'Great dessert', enabled: true },
        { name: 'Cosy', enabled: true },
      ],
    },
    {
      id: 'accessibility',
      name: 'Accessibility',
      options: [
        { name: 'Wheelchair-accessible entrance', enabled: true },
        { name: 'Wheelchair-accessible seating', enabled: true },
        { name: 'Wheelchair-accessible toilet', enabled: true },
      ],
    },
    {
      id: 'dining_options',
      name: 'Dining options',
      options: [
        { name: 'Lunch', enabled: true },
        { name: 'Dinner', enabled: true },
        { name: 'Dessert', enabled: true },
        { name: 'Vegetarian options', enabled: true },
      ],
    },
  ],
  mentioned_in_reviews: [
    { label: 'bacalhau', mentions: 22 },
    { label: 'grilled sardines', mentions: 14 },
    { label: 'vinho verde', mentions: 11 },
    { label: 'pastel de nata', mentions: 9 },
    { label: 'esplanada', mentions: 6 },
  ],
  user_reviews: [
    {
      order: 0,
      review: {
        author_name: 'Marta S.',
        author_avatar: null,
        rating: 5,
        text: 'The bacalhau à Brás is the best I have had outside my grandmother’s kitchen. Ask for a table on the esplanada.',
        when: '2 weeks ago',
      },
    },
    {
      order: 1,
      review: {
        author_name: 'Tiago R.',
        author_avatar: null,
        rating: 4,
        text: 'Great grilled sardines and a fair wine list. Gets busy after 20:00 — worth booking.',
        when: 'a month ago',
      },
    },
    {
      order: 2,
      review: {
        author_name: 'Chloé D.',
        author_avatar: null,
        rating: 5,
        text: 'Warm service, unhurried. The pastel de nata is made in-house and still warm.',
        when: '3 months ago',
      },
    },
  ],
  review_consensus: {
    model: 'sample-seed',
    input_hash: 'sample-nomnom-001',
    reviews_analyzed: 25,
    summary:
      'Regulars single out the bacalhau and grilled sardines, an unhurried esplanada, and a well-priced Portuguese wine list; a few note it fills up after 8pm.',
    strengths: [
      'Bacalhau à Brás and grilled sardines mentioned repeatedly',
      'Shaded esplanada that stays quiet at lunch',
      'Portuguese wine list with fair mark-ups',
      'Unhurried, attentive service',
    ],
    weaknesses: [
      'Fills up after 20:00 without a booking',
      'Cash-only on some evenings',
    ],
    signature_dishes: [
      { label: 'Bacalhau à Brás', mentions: 22 },
      { label: 'Grilled sardines', mentions: 14 },
      { label: 'Pastel de nata', mentions: 9 },
    ],
  },
};

const ROW = {
  external_place_id: EXTERNAL_PLACE_ID,
  name: 'Tasca do Exemplo',
  address: 'R. do Exemplo 12, 1200-109 Lisboa',
  latitude: 38.7139,
  longitude: -9.1394,
  rating: 4.7,
  price_level: 2,
  phone: '+351 210 000 000',
  website: 'https://example.com/tasca-do-exemplo',
  maps_link: 'https://www.google.com/maps/search/?api=1&query=38.7139,-9.1394',
  menu_url: 'https://example.com/tasca-do-exemplo/menu',
  menu_source: 'example.com',
  metadata: METADATA,
};

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function remove(s) {
  const { data } = await s
    .from('restaurants')
    .select('id')
    .eq('external_place_id', EXTERNAL_PLACE_ID);
  const ids = (data ?? []).map((r) => r.id);
  if (!ids.length) return 0;
  // Children first — FKs may not cascade.
  await s.from('restaurant_images').delete().in('restaurant_id', ids);
  await s.from('restaurant_tags').delete().in('restaurant_id', ids);
  await s.from('restaurants').delete().in('id', ids);
  return ids.length;
}

async function main() {
  const s = client();

  if (process.argv.includes('--remove')) {
    const n = await remove(s);
    console.log(n ? `Removed ${n} sample restaurant row(s).` : 'Nothing to remove.');
    return;
  }

  const { data: city, error: cityErr } = await s
    .from('cities')
    .select('id,name')
    .eq('name', CITY_NAME)
    .limit(1)
    .maybeSingle();
  if (cityErr) throw new Error(`city lookup failed: ${cityErr.message}`);
  if (!city) throw new Error(`no city named ${CITY_NAME}`);

  const removed = await remove(s);
  if (removed) console.log(`Replaced ${removed} existing sample row(s).`);

  const insert = { ...ROW, municipality_id: city.id };
  // PostGIS point; if the column rejects the WKT cast, retry without it and report.
  let { data: inserted, error } = await s
    .from('restaurants')
    .insert({ ...insert, location: `SRID=4326;POINT(${ROW.longitude} ${ROW.latitude})` })
    .select('id')
    .single();
  if (error) {
    console.warn(`location cast rejected (${error.message}); inserting without it`);
    ({ data: inserted, error } = await s.from('restaurants').insert(insert).select('id').single());
  }
  if (error) throw new Error(`insert failed: ${error.message}`);
  const id = inserted.id;

  const { error: imgErr } = await s.from('restaurant_images').insert(
    PHOTOS.map((url, i) => ({
      restaurant_id: id,
      url,
      sort_order: i,
      moderation_status: 'approved',
    }))
  );
  if (imgErr) throw new Error(`images failed: ${imgErr.message}`);

  const { data: tags } = await s.from('tags').select('id,slug').in('slug', TAG_SLUGS);
  const found = tags ?? [];
  if (found.length) {
    const { error: tagErr } = await s
      .from('restaurant_tags')
      .insert(found.map((t) => ({ restaurant_id: id, tag_id: t.id })));
    if (tagErr) throw new Error(`tags failed: ${tagErr.message}`);
  }
  const missing = TAG_SLUGS.filter((slug) => !found.some((t) => t.slug === slug));

  console.log(`Seeded "${ROW.name}"`);
  console.log(`  id            ${id}`);
  console.log(`  city          ${city.name}`);
  console.log(`  photos        ${PHOTOS.length}`);
  console.log(`  tags          ${found.length}/${TAG_SLUGS.length}${missing.length ? ` (missing: ${missing.join(', ')})` : ''}`);
  console.log(`  detail page   /restaurants/${id}`);
  console.log(`\nRemove with: node scripts/seed-sample-restaurant.cjs --remove`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
