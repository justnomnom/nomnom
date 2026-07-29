#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { selectImageUrls } from '../src/libs/restaurant-ingest/map-google-place-payload.js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Missing SUPABASE env');
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false } });

const JSON_PATH =
  process.argv[2] ||
  String.raw`C:\Users\andre\Downloads\google-maps-scraper\restaurants\out\restaurants-full.json`;
const items = JSON.parse(readFileSync(JSON_PATH, 'utf8'));
console.log(`Loaded ${items.length} entries`);

let touched = 0;
let unchanged = 0;
let missing = 0;
let errors = 0;

for (let i = 0; i < items.length; i += 1) {
  const it = items[i];
  const placeId = typeof it.place_id === 'string' ? it.place_id.trim() : '';
  if (!placeId) continue;

  let imageUrls = selectImageUrls(it.images, { max: 25 });
  if (
    imageUrls.length === 0 &&
    typeof it.thumbnail === 'string' &&
    /^https?:\/\//i.test(it.thumbnail)
  ) {
    imageUrls = [it.thumbnail.trim()];
  }

  const { data: r, error: re } = await sb
    .from('restaurants')
    .select('id, metadata')
    .eq('external_place_id', placeId)
    .maybeSingle();
  if (re) {
    console.error('lookup', placeId, re.message);
    errors++;
    continue;
  }
  if (!r) {
    missing++;
    continue;
  }

  const meta =
    r.metadata && typeof r.metadata === 'object' && !Array.isArray(r.metadata) ? r.metadata : {};
  const existingPhotos = Array.isArray(meta.photos) ? meta.photos : [];
  const same =
    existingPhotos.length === imageUrls.length &&
    existingPhotos.every((u, idx) => u === imageUrls[idx]) &&
    meta.image_url === (imageUrls[0] ?? undefined);

  if (same && imageUrls.length === 0) {
    unchanged++;
    continue;
  }

  const { error: delErr } = await sb
    .from('restaurant_images')
    .delete()
    .eq('restaurant_id', r.id);
  if (delErr) {
    console.error('delete images', r.id, delErr.message);
    errors++;
    continue;
  }
  if (imageUrls.length) {
    const rows = imageUrls.map((u, idx) => ({
      restaurant_id: r.id,
      url: u,
      sort_order: idx,
      moderation_status: 'approved',
    }));
    const { error: insErr } = await sb.from('restaurant_images').insert(rows);
    if (insErr) {
      console.error('insert images', r.id, insErr.message);
      errors++;
      continue;
    }
  }

  const newMeta = { ...meta };
  if (imageUrls.length) {
    newMeta.photos = imageUrls;
    newMeta.image_url = imageUrls[0];
  } else {
    delete newMeta.photos;
    delete newMeta.image_url;
  }
  const { error: ue } = await sb.from('restaurants').update({ metadata: newMeta }).eq('id', r.id);
  if (ue) {
    console.error('update metadata', r.id, ue.message);
    errors++;
    continue;
  }

  touched++;
  if (touched % 50 === 0) console.log(`touched=${touched} / scanned=${i + 1}`);
}

console.log(`Done. touched=${touched} unchanged=${unchanged} missing=${missing} errors=${errors}`);
