'use server';

import { escapeHtml } from 'src/libs/email/escape-html';
import { sendResendEmail } from 'src/libs/email/resend-server-send';
import { RESEND_API, FEEDBACK_INBOUND_EMAIL } from 'src/config-global';
import { buildListItemRows } from 'src/libs/lists/build-list-item-rows';
import { pickRestaurantMatch } from 'src/libs/lists/pick-restaurant-match';
import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';
import {
  isGoogleMapsUrl,
  MAX_IMPORT_PLACES,
  parsePlacesFromJson,
} from 'src/auth/actions/google-maps-import-parse';

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

const BASE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

// ---------------------------------------------------------------------------
// Main extraction: follow redirect → extract list ID → call API directly
// No session token needed — just the list ID from the redirect URL.
// ---------------------------------------------------------------------------

async function extractGoogleMapsPlaces(url) {
  // Step 1: follow redirects to get the canonical Google Maps URL with list ID
  let finalUrl;
  try {
    const res = await fetch(url, { headers: BASE_HEADERS, redirect: 'follow' });
    if (!res.ok) return { error: 'fetch_failed', title: null, places: [] };
    finalUrl = res.url;
    // We only need the URL (for list ID extraction), not the HTML body
  } catch (e) {
    console.error('[googleMapsImport] follow redirects', e);
    return { error: 'fetch_failed', title: null, places: [] };
  }

  // Step 2: extract list ID from the URL pattern !2s{ID} or placelists/list/{ID}
  let listId = null;
  const dataMatch = finalUrl.match(/[!]2s([A-Za-z0-9_-]{20,})/);
  if (dataMatch) listId = dataMatch[1];
  if (!listId) {
    const placelistMatch = finalUrl.match(/placelists\/list\/([A-Za-z0-9_-]{20,})/);
    if (placelistMatch) listId = placelistMatch[1];
  }
  if (!listId) {
    console.error('[googleMapsImport] no list ID in URL', finalUrl.slice(0, 200));
    return { error: 'no_places_found', title: null, places: [] };
  }

  // Step 3: call the getlist API directly using the list ID (no session token needed)
  const apiUrl = `https://www.google.com/maps/preview/entitylist/getlist?authuser=0&hl=en&gl=us&pb=!1m4!1s${listId}!2e1!3m1!1e1!2e2!3e2!4i500`;

  let raw;
  try {
    const apiRes = await fetch(apiUrl, {
      headers: { ...BASE_HEADERS, Referer: finalUrl, Accept: '*/*' },
      redirect: 'follow',
    });
    if (!apiRes.ok) return { error: 'fetch_failed', title: null, places: [] };
    raw = await apiRes.text();
  } catch (e) {
    console.error('[googleMapsImport] getlist api', e);
    return { error: 'fetch_failed', title: null, places: [] };
  }

  if (!raw || raw.length < 100) {
    console.error('[googleMapsImport] empty api response', raw?.length);
    return { error: 'no_places_found', title: null, places: [] };
  }

  // Step 4: parse the JSON response
  let json;
  try {
    json = JSON.parse(raw.replace(/^\)\]}'[\n\r]*/, ''));
  } catch (e) {
    console.error('[googleMapsImport] json parse', e);
    return { error: 'no_places_found', title: null, places: [] };
  }

  const places = parsePlacesFromJson(json);
  if (!places.length) {
    return { error: 'no_places_found', title: null, places: [] };
  }

  // Extract list title from the JSON data (json[0][4])
  let title = null;
  try {
    const maybeTitle = json?.[0]?.[4];
    if (typeof maybeTitle === 'string' && maybeTitle.length > 0) title = maybeTitle;
  } catch {
    // title is optional — ignore extraction errors
  }

  return { error: null, title, places };
}

// ---------------------------------------------------------------------------
// Match parsed places against our restaurants table
// ---------------------------------------------------------------------------

async function matchOnePlace(supabase, place) {
  let matched = null;

  // Coordinate match first (~110m box). Require a name match within the box —
  // proximity alone collapses distinct neighbours onto whichever row sorts first.
  if (place.lat !== null && place.lng !== null) {
    const { data: nearby } = await supabase
      .from('restaurants')
      .select('id, name, address, latitude, longitude')
      .gte('latitude', place.lat - 0.001)
      .lte('latitude', place.lat + 0.001)
      .gte('longitude', place.lng - 0.001)
      .lte('longitude', place.lng + 0.001)
      .limit(10);

    matched = pickRestaurantMatch(place, nearby ?? []);
  }

  // Name search fallback
  if (!matched) {
    const { data: byName } = await supabase
      .from('restaurants')
      .select('id, name, address, latitude, longitude')
      .ilike('name', `%${place.name.trim()}%`)
      .limit(10);

    matched = pickRestaurantMatch(place, byName ?? []);
  }

  // Restaurants are never auto-created from a Maps import. A place that doesn't
  // match an existing row is reported as `not_found`; support is emailed the
  // list of missing places at commit time so the team can add them properly.
  return {
    ...place,
    restaurantId: matched?.id ?? null,
    matchedName: matched?.name ?? null,
    matchedAddress: matched?.address ?? null,
    status: matched ? 'matched' : 'not_found',
  };
}

// Imported lists can hold hundreds of places, and each item runs several
// Supabase queries. Firing them all at once exhausts the connection pool and
// makes the whole action throw, so map in bounded chunks. Concurrency 20 →
// peak ~60 in-flight queries, the level admin-reference-actions runs safely.
const DB_CONCURRENCY = 20;

async function mapWithConcurrency(items, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += DB_CONCURRENCY) {
    const chunk = items.slice(i, i + DB_CONCURRENCY);
    // eslint-disable-next-line no-await-in-loop -- intentional: cap concurrency
    const out = await Promise.all(chunk.map((item, j) => fn(item, i + j)));
    results.push(...out);
  }
  return results;
}

async function matchRestaurants(supabase, places) {
  return mapWithConcurrency(places, (place) => matchOnePlace(supabase, place));
}

// ---------------------------------------------------------------------------
// Public server action: preview import
// ---------------------------------------------------------------------------

export async function previewGoogleMapsImport(url) {
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { error: 'unauthorized', listTitle: null, places: [] };

  const trimmed = (url ?? '').trim();
  if (!trimmed) return { error: 'missing_url', listTitle: null, places: [] };
  if (!isGoogleMapsUrl(trimmed)) return { error: 'invalid_url', listTitle: null, places: [] };

  const { error, title, places: rawPlaces } = await extractGoogleMapsPlaces(trimmed);
  if (error) return { error, listTitle: title, places: [] };

  try {
    const supabase = await createSupabaseServerClient();
    const matched = await matchRestaurants(supabase, rawPlaces);
    return { error: null, listTitle: title, places: matched };
  } catch (e) {
    console.error('[previewGoogleMapsImport] match restaurants', e);
    return { error: 'fetch_failed', listTitle: title, places: [] };
  }
}

// ---------------------------------------------------------------------------
// Notify support about places from the imported list that aren't in our
// database. Restaurants are never auto-created from Maps imports — instead the
// team gets the list of missing places so they can add them properly.
// ---------------------------------------------------------------------------

async function notifySupportOfMissingRestaurants({ user, listName, missingPlaces }) {
  const to = FEEDBACK_INBOUND_EMAIL;
  if (!to || !RESEND_API.key || !RESEND_API.from) {
    console.warn('[commitGoogleMapsImport] email not configured — skipping support notification');
    return;
  }

  const rows = missingPlaces
    .filter((p) => p && typeof p.name === 'string' && p.name.trim())
    .slice(0, MAX_IMPORT_PLACES)
    .map((p) => {
      const hasCoords = typeof p.lat === 'number' && typeof p.lng === 'number';
      const coords = hasCoords ? `${p.lat}, ${p.lng}` : '—';
      const mapsLink = hasCoords
        ? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`
        : null;
      return `<tr>
        <td style="padding:4px 8px;border:1px solid #ddd;">${escapeHtml(p.name.trim())}</td>
        <td style="padding:4px 8px;border:1px solid #ddd;">${escapeHtml(p.address ?? '—')}</td>
        <td style="padding:4px 8px;border:1px solid #ddd;">${escapeHtml(coords)}</td>
        <td style="padding:4px 8px;border:1px solid #ddd;">${mapsLink ? `<a href="${mapsLink}">View on Maps</a>` : '—'}</td>
      </tr>`;
    })
    .join('');

  if (!rows) return;

  const html = `
    <h2>Restaurants missing from NomNom</h2>
    <p>A user imported a Google Maps list and the following places weren't found in our database. They were <strong>not</strong> created automatically — please review and add them.</p>
    <p><strong>List:</strong> ${escapeHtml(listName?.trim() || '—')}</p>
    <p><strong>Imported by:</strong> ${escapeHtml(user?.email ?? user?.id ?? 'unknown')}</p>
    <table style="border-collapse:collapse;font-size:14px;">
      <thead>
        <tr>
          <th style="padding:4px 8px;border:1px solid #ddd;text-align:left;">Name</th>
          <th style="padding:4px 8px;border:1px solid #ddd;text-align:left;">Address</th>
          <th style="padding:4px 8px;border:1px solid #ddd;text-align:left;">Coordinates</th>
          <th style="padding:4px 8px;border:1px solid #ddd;text-align:left;">Link</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;

  await sendResendEmail({
    to,
    subject: `Missing restaurants from Maps import (${missingPlaces.length})`,
    html,
  });
}

// ---------------------------------------------------------------------------
// Public server action: commit import
// Only restaurants already in our database (restaurantIds) are added to the
// list. `missingPlaces` are the not-found places — they are never created;
// support is emailed the list so the team can add them.
// ---------------------------------------------------------------------------

/**
 * @param {{
 *   listId?: string,          — when set: add to existing list (skip creation)
 *   listName?: string,        — used only when listId is absent
 *   restaurantIds?: string[], — existing restaurants to add to the list
 *   missingPlaces?: object[], — not-found places, reported to support (never created)
 *   visibility?: string,
 * }} input
 */
export async function commitGoogleMapsImport({
  listId: existingListId,
  listName,
  restaurantIds,
  missingPlaces = [],
  visibility = 'public',
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return { error: 'unauthorized', listId: null };

  // `listName` is only required when creating a new list — validated in the
  // else branch below. Adding to an existing list (existingListId) doesn't need it.

  const validVis = ['public', 'private', 'public_subscribers'].includes(visibility)
    ? visibility
    : 'public';

  const allRestaurantIds = restaurantIds ?? [];
  if (allRestaurantIds.length === 0) return { error: 'no_restaurants', listId: null };

  // Step 2: use existing list or create new
  let listId;
  if (existingListId) {
    // Verify ownership
    const { data: listRow } = await supabase
      .from('lists')
      .select('id, user_id')
      .eq('id', existingListId)
      .maybeSingle();
    if (!listRow || listRow.user_id !== user.id) return { error: 'forbidden', listId: null };
    listId = existingListId;
  } else {
    if (!listName?.trim()) return { error: 'missing_name', listId: null };
    const { data: newListId, error: createErr } = await supabase.rpc('create_user_list', {
      p_name: listName.trim(),
      p_description: 'Imported from Google Maps',
      p_visibility: validVis,
    });
    if (createErr || !newListId) {
      console.error('[commitGoogleMapsImport] create_user_list', createErr);
      return { error: 'list_create_failed', listId: null };
    }
    listId = String(newListId);
  }

  // Step 3: add all restaurants to list. Dedupe ids — two imported Maps places
  // can resolve to the same restaurant, and a duplicate (list_id, restaurant_id)
  // in one ON CONFLICT batch makes Postgres reject the whole upsert.
  const rows = buildListItemRows({ listId, restaurantIds: allRestaurantIds, addedBy: user.id });

  const { error: insertErr } = await supabase
    .from('list_items')
    .upsert(rows, { onConflict: 'list_id,restaurant_id' });

  if (insertErr) {
    console.error('[commitGoogleMapsImport] list_items', insertErr);
    return { error: 'restaurants_add_failed', listId };
  }

  // Stamp published_at only for newly created lists
  if (!existingListId) {
    await supabase
      .from('lists')
      .update({ published_at: new Date().toISOString() })
      .eq('id', listId);
  }

  // Notify support about places that aren't in our database yet. Best-effort —
  // a failed email must not fail the import the user just completed.
  if (missingPlaces.length) {
    try {
      await notifySupportOfMissingRestaurants({ user, listName, missingPlaces });
    } catch (e) {
      console.error('[commitGoogleMapsImport] notify support', e);
    }
  }

  return { error: null, listId };
}
