#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE url/secret env');
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const PAGE = 50;

let from = 0;
let total = 0;
let updated = 0;
let skipped = 0;

while (true) {
  const { data: rs, error } = await sb
    .from('restaurants')
    .select('id, metadata')
    .order('id', { ascending: true })
    .range(from, from + PAGE - 1);
  if (error) {
    console.error('fetch restaurants', error);
    process.exit(1);
  }
  if (!rs?.length) break;

  const ids = rs.map((r) => r.id);
  const { data: imgs, error: ie } = await sb
    .from('restaurant_images')
    .select('restaurant_id, url, sort_order, moderation_status')
    .in('restaurant_id', ids);
  if (ie) {
    console.error('fetch images', ie);
    process.exit(1);
  }
  const byR = new Map();
  for (const im of imgs ?? []) {
    if (im.moderation_status === 'rejected') continue;
    const arr = byR.get(im.restaurant_id) || [];
    arr.push(im);
    byR.set(im.restaurant_id, arr);
  }
  for (const arr of byR.values()) {
    arr.sort((a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0));
  }

  for (const r of rs) {
    total++;
    const urls = (byR.get(r.id) || []).map((x) => x.url).filter(Boolean);
    if (!urls.length) {
      skipped++;
      continue;
    }
    const m =
      r.metadata && typeof r.metadata === 'object' && !Array.isArray(r.metadata) ? r.metadata : {};
    const samePhotos =
      Array.isArray(m.photos) &&
      m.photos.length === urls.length &&
      m.photos.every((p, i) => p === urls[i]);
    const sameHero = m.image_url === urls[0];
    if (samePhotos && sameHero) {
      skipped++;
      continue;
    }
    const newMeta = { ...m, photos: urls, image_url: urls[0] };
    const { error: ue } = await sb
      .from('restaurants')
      .update({ metadata: newMeta })
      .eq('id', r.id);
    if (ue) {
      console.error('update', r.id, ue.message);
      continue;
    }
    updated++;
    if (updated % 50 === 0) console.log(`updated=${updated} total=${total}`);
  }

  if (rs.length < PAGE) break;
  from += PAGE;
}

console.log(`Done. total=${total} updated=${updated} skipped=${skipped}`);
