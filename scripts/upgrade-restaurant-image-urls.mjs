#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import { upgradeGoogleImageUrl } from '../src/libs/restaurant-ingest/map-google-place-payload.js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE env');
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const PAGE = 200;
let from = 0;
let updatedImages = 0;
let unchangedImages = 0;

while (true) {
  const { data: rows, error } = await sb
    .from('restaurant_images')
    .select('id, url')
    .order('id', { ascending: true })
    .range(from, from + PAGE - 1);
  if (error) {
    console.error('select images', error);
    process.exit(1);
  }
  if (!rows?.length) break;
  for (const r of rows) {
    const up = upgradeGoogleImageUrl(r.url);
    if (up === r.url) {
      unchangedImages++;
      continue;
    }
    const { error: ue } = await sb.from('restaurant_images').update({ url: up }).eq('id', r.id);
    if (ue) {
      console.error('update', r.id, ue.message);
      continue;
    }
    updatedImages++;
  }
  if (updatedImages % 200 === 0 && updatedImages > 0) {
    console.log(`updated images=${updatedImages}`);
  }
  if (rows.length < PAGE) break;
  from += PAGE;
}

console.log(`images: updated=${updatedImages} unchanged=${unchangedImages}`);

let mFrom = 0;
let updatedMeta = 0;
let unchangedMeta = 0;
while (true) {
  const { data: rs, error } = await sb
    .from('restaurants')
    .select('id, metadata')
    .order('id', { ascending: true })
    .range(mFrom, mFrom + PAGE - 1);
  if (error) {
    console.error('select restaurants', error);
    process.exit(1);
  }
  if (!rs?.length) break;
  for (const r of rs) {
    const meta =
      r.metadata && typeof r.metadata === 'object' && !Array.isArray(r.metadata) ? r.metadata : {};
    const photos = Array.isArray(meta.photos) ? meta.photos : null;
    const imageUrl = typeof meta.image_url === 'string' ? meta.image_url : null;
    if (!photos && !imageUrl) {
      unchangedMeta++;
      continue;
    }
    const newPhotos = photos ? photos.map((u) => upgradeGoogleImageUrl(u)) : null;
    const newImageUrl = imageUrl ? upgradeGoogleImageUrl(imageUrl) : null;
    const photosSame = !photos || (newPhotos && newPhotos.every((u, i) => u === photos[i]));
    const heroSame = !imageUrl || newImageUrl === imageUrl;
    if (photosSame && heroSame) {
      unchangedMeta++;
      continue;
    }
    const newMeta = { ...meta };
    if (newPhotos) newMeta.photos = newPhotos;
    if (newImageUrl) newMeta.image_url = newImageUrl;
    const { error: ue } = await sb.from('restaurants').update({ metadata: newMeta }).eq('id', r.id);
    if (ue) {
      console.error('update meta', r.id, ue.message);
      continue;
    }
    updatedMeta++;
  }
  if (rs.length < PAGE) break;
  mFrom += PAGE;
}
console.log(`metadata: updated=${updatedMeta} unchanged=${unchangedMeta}`);
