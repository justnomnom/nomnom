import { NextResponse } from 'next/server';

import { rateLimitTake } from 'src/libs/email/rate-limit';
import { RESTAURANT_INGEST_SECRET } from 'src/config-global';
import { setConversationId } from 'src/libs/sentry/sentry-service';
import { isValidSecret } from 'src/libs/crypto/timing-safe-secret';
import { supabaseAdminClient } from 'src/libs/supabase/supabase-admin';
import { extractReviewConsensus } from 'src/libs/restaurant-ingest/review-consensus-ai';
import { mapGooglePlacePayload } from 'src/libs/restaurant-ingest/map-google-place-payload';
import { syncSignatureDishTags } from 'src/libs/restaurant-ingest/sync-signature-dish-tags';
import {
  hashSourcePhotoUrls,
  persistRestaurantImageUrls,
} from 'src/libs/restaurant-ingest/persist-restaurant-images';
import {
  fetchAllTags,
  insertNewTags,
  resolveTagIds,
  buildSlugToIdMap,
  fetchTagsBySlugs,
  mapAboutToTagsWithAi,
} from 'src/libs/restaurant-ingest/about-tags-ai';

export const runtime = 'nodejs';
// Re-hosting up to 25 photos into Storage can take a while on a cold place; give
// the function headroom over the default serverless timeout.
export const maxDuration = 300;

const logger = {
  error: (msg, data = {}) => console.error(`[restaurants-ingest] ${msg}`, data),
};

function getClientIp(request) {
  const xff = request.headers.get('x-forwarded-for');
  return xff?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Venue/ambience topic labels from review consensus (non-dish mention chips).
 * @param {unknown} consensus
 * @returns {string[]}
 */
function topicLabelsFromConsensus(consensus) {
  if (!consensus || typeof consensus !== 'object') return [];
  const raw = /** @type {Record<string, unknown>} */ (consensus).topic_labels;
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (typeof item === 'string') {
      const t = item.trim();
      return t ? [t] : [];
    }
    if (item && typeof item === 'object') {
      const { label } = /** @type {Record<string, unknown>} */ (item);
      if (typeof label === 'string') {
        const t = label.trim();
        return t ? [t] : [];
      }
    }
    return [];
  });
}

/**
 * @param {string[]} prevSlugs
 * @param {string} restaurantId
 */
async function deleteRestaurantTagsBySlugs(prevSlugs, restaurantId) {
  if (!prevSlugs.length || !restaurantId) return;
  const { data: tagRows, error: tErr } = await supabaseAdminClient
    .from('tags')
    .select('id')
    .in('slug', prevSlugs);
  if (tErr) {
    logger.error('tags lookup for delete', tErr);
    throw new Error(tErr.message);
  }
  const ids = (tagRows ?? []).map((r) => r.id).filter(Boolean);
  if (!ids.length) return;
  const { error: dErr } = await supabaseAdminClient
    .from('restaurant_tags')
    .delete()
    .eq('restaurant_id', restaurantId)
    .in('tag_id', ids);
  if (dErr) {
    logger.error('restaurant_tags delete', dErr);
    throw new Error(dErr.message);
  }
}

/**
 * @param {string} restaurantId
 * @param {string[]} imageUrls
 */
async function replaceRestaurantImages(restaurantId, imageUrls) {
  const { data: existingRows, error: selErr } = await supabaseAdminClient
    .from('restaurant_images')
    .select('url, sort_order, moderation_status')
    .eq('restaurant_id', restaurantId)
    .order('sort_order', { ascending: true });
  if (selErr) {
    logger.error('restaurant_images select before replace', selErr);
    throw new Error(selErr.message);
  }
  const { error: delErr } = await supabaseAdminClient
    .from('restaurant_images')
    .delete()
    .eq('restaurant_id', restaurantId);
  if (delErr) {
    logger.error('restaurant_images delete', delErr);
    throw new Error(delErr.message);
  }
  if (!imageUrls.length) return;
  const rows = imageUrls.map((url, i) => ({
    restaurant_id: restaurantId,
    url,
    sort_order: i,
    moderation_status: 'approved',
  }));
  const { error: insErr } = await supabaseAdminClient.from('restaurant_images').insert(rows);
  if (insErr) {
    logger.error('restaurant_images insert', insErr);
    if (existingRows?.length) {
      const restore = existingRows.map((r) => ({
        restaurant_id: restaurantId,
        url: r.url,
        sort_order: r.sort_order,
        moderation_status: r.moderation_status ?? 'approved',
      }));
      const { error: restoreErr } = await supabaseAdminClient
        .from('restaurant_images')
        .insert(restore);
      if (restoreErr) {
        logger.error('restaurant_images restore after failed insert', restoreErr);
      }
    }
    throw new Error(insErr.message);
  }
}

/**
 * @param {string} restaurantId
 * @param {string[]} tagIds
 */
async function insertRestaurantTags(restaurantId, tagIds) {
  if (!tagIds.length) return;
  const rows = tagIds.map((tag_id) => ({ restaurant_id: restaurantId, tag_id }));
  const { error } = await supabaseAdminClient.from('restaurant_tags').upsert(rows, {
    onConflict: 'restaurant_id,tag_id',
  });
  if (error) {
    logger.error('restaurant_tags insert', error);
    throw new Error(error.message);
  }
}

/**
 * Internal: Bearer `RESTAURANT_INGEST_SECRET`. Body: Google Maps place JSON.
 */
export async function POST(request) {
  try {
    const ip = getClientIp(request);
    if (!(await rateLimitTake(`restaurants-ingest:${ip}`, 60, 60 * 60 * 1000))) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    if (!RESTAURANT_INGEST_SECRET) {
      logger.error('RESTAURANT_INGEST_SECRET is not set');
      return NextResponse.json(
        { error: 'Restaurant ingest API is not configured.' },
        { status: 503 }
      );
    }

    const auth = request.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (!token || !isValidSecret(token, RESTAURANT_INGEST_SECRET)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    let mapped;
    try {
      mapped = mapGooglePlacePayload(body);
    } catch (e) {
      const code =
        typeof e?.message === 'string' && e.message.trim() ? e.message.trim() : 'invalid_payload';
      /** @type {Record<string, number>} */
      const statusByCode = {
        invalid_payload: 400,
        invalid_coordinates: 400,
        missing_place_id: 400,
        missing_title: 400,
      };
      const status = statusByCode[code] ?? 400;
      return NextResponse.json({ error: code }, { status });
    }

    if (mapped.closedStatus === 'permanently_closed') {
      return NextResponse.json(
        { error: 'permanently_closed', message: 'Place is marked permanently closed by Google.' },
        { status: 422 }
      );
    }

    // Group about-tags + review-consensus LLM spans for this place ingest
    const placeId =
      typeof mapped.row?.external_place_id === 'string' ? mapped.row.external_place_id : null;
    setConversationId(placeId ? `restaurant-ingest:${placeId}` : `restaurant-ingest:${Date.now()}`);

    const { data: municipalityRows, error: rpcErr } = await supabaseAdminClient.rpc(
      'municipality_for_point',
      {
        p_lng: mapped.row.longitude,
        p_lat: mapped.row.latitude,
      }
    );

    if (rpcErr) {
      logger.error('municipality_for_point', rpcErr);
      return NextResponse.json({ error: 'municipality_resolve_failed' }, { status: 500 });
    }

    const municipalityRow = Array.isArray(municipalityRows)
      ? municipalityRows[0]
      : municipalityRows;
    if (!municipalityRow?.id) {
      return NextResponse.json(
        {
          error: 'no_municipality_for_point',
          message: 'No municipality boundary contains this location.',
        },
        { status: 422 }
      );
    }

    const municipalityId = String(municipalityRow.id);

    const externalPlaceId = mapped.row.external_place_id;
    const { data: existing, error: exErr } = await supabaseAdminClient
      .from('restaurants')
      .select('id, metadata')
      .eq('external_place_id', externalPlaceId)
      .maybeSingle();

    if (exErr) {
      logger.error('existing restaurant select', exErr);
      return NextResponse.json({ error: 'lookup_failed' }, { status: 500 });
    }

    const priorMeta =
      existing?.metadata && typeof existing.metadata === 'object'
        ? /** @type {Record<string, unknown>} */ (existing.metadata)
        : {};

    // Re-host scraped photos into Storage so the stored URLs don't expire (Google's
    // signed photo links 403 once rotated). Keyed by external_place_id — stable and
    // known before the row insert, so the persisted URLs land in this single write.
    const sourcePhotos = Array.from(
      new Set([
        ...(Array.isArray(mapped.imageUrls) ? mapped.imageUrls : []),
        ...(Array.isArray(mapped.metadataBase.photos) ? mapped.metadataBase.photos : []),
        ...(typeof mapped.metadataBase.image_url === 'string'
          ? [mapped.metadataBase.image_url]
          : []),
      ])
    );
    const sourcePhotoHash = hashSourcePhotoUrls(sourcePhotos);
    const priorPhotoHash =
      typeof priorMeta.ingest_source_photo_urls_hash === 'string'
        ? priorMeta.ingest_source_photo_urls_hash
        : null;
    const skipPhotoWork =
      Boolean(existing?.id) && priorPhotoHash != null && priorPhotoHash === sourcePhotoHash;

    /** @type {string[]} */
    let persistedImageUrls = [];
    if (!skipPhotoWork) {
      const persistedUrlMap = await persistRestaurantImageUrls(
        supabaseAdminClient,
        externalPlaceId,
        sourcePhotos,
        { logger }
      );
      const toPersisted = (url) =>
        typeof url === 'string' ? (persistedUrlMap.get(url) ?? url) : url;
      persistedImageUrls = (Array.isArray(mapped.imageUrls) ? mapped.imageUrls : []).map(
        toPersisted
      );
      if (Array.isArray(mapped.metadataBase.photos)) {
        mapped.metadataBase.photos = mapped.metadataBase.photos.map(toPersisted);
      }
      if (typeof mapped.metadataBase.image_url === 'string') {
        mapped.metadataBase.image_url = toPersisted(mapped.metadataBase.image_url);
      }
    } else {
      // Google URLs in the payload must not overwrite already-persisted Storage URLs.
      delete mapped.metadataBase.photos;
      delete mapped.metadataBase.image_url;
    }

    const prevIngestSlugs = Array.isArray(priorMeta.ingest_tag_slugs)
      ? priorMeta.ingest_tag_slugs.filter((s) => typeof s === 'string')
      : [];

    const categories = Array.isArray(body.categories)
      ? body.categories.map((c) => String(c)).filter(Boolean)
      : [];
    const description =
      typeof body.description === 'string' && body.description.trim()
        ? body.description.trim()
        : null;

    // Tag vocab fetch is independent of consensus — start it while Qwen classifies
    // mention chips into dishes vs venue topics.
    const allTagsPromise = fetchAllTags(supabaseAdminClient);
    const userReviews = Array.isArray(mapped.metadataBase.user_reviews)
      ? mapped.metadataBase.user_reviews
      : [];
    const mentionedInReviews = Array.isArray(mapped.metadataBase.mentioned_in_reviews)
      ? /** @type {Array<{ label: string, mentions: number }>} */ (
          mapped.metadataBase.mentioned_in_reviews
        )
      : null;
    const primaryCategory =
      typeof mapped.metadataBase.primary_category === 'string'
        ? mapped.metadataBase.primary_category
        : null;

    const priorAi =
      priorMeta.ingest_tag_ai && typeof priorMeta.ingest_tag_ai === 'object'
        ? /** @type {{ input_hash?: unknown }} */ (priorMeta.ingest_tag_ai)
        : null;

    const priorReviews = Array.isArray(priorMeta.user_reviews) ? priorMeta.user_reviews : null;
    const currentReviewCount =
      typeof mapped.metadataBase.review_count === 'number' &&
      Number.isFinite(mapped.metadataBase.review_count)
        ? mapped.metadataBase.review_count
        : null;
    const priorReviewCount =
      typeof priorMeta.review_count === 'number' && Number.isFinite(priorMeta.review_count)
        ? priorMeta.review_count
        : null;

    const priorConsensus =
      priorMeta.review_consensus && typeof priorMeta.review_consensus === 'object'
        ? /** @type {{ input_hash?: unknown }} */ (priorMeta.review_consensus)
        : null;

    // Consensus must finish before tagging so we only feed classified venue
    // topics (not dishes) into mapAboutToTagsWithAi.
    const reviewConsensus = await extractReviewConsensus({
      name: mapped.row.name,
      reviews: userReviews,
      rating: mapped.row.rating,
      primaryCategory,
      mentionedInReviews,
      priorConsensus,
      priorReviews,
      currentReviewCount,
      priorReviewCount,
    });

    const reviewTopics = topicLabelsFromConsensus(reviewConsensus ?? priorConsensus);

    const allTags = await allTagsPromise;
    const ai = await mapAboutToTagsWithAi({
      flattenedAbout: mapped.flattenedAbout,
      categories,
      description,
      priceSlug: mapped.priceTagSlug,
      reviewTopics,
      tags: allTags,
      priorAi,
    });

    // Build slugToId from the vocab we already fetched. On a fresh run we'll
    // append newly-inserted slugs via a targeted lookup — no full re-fetch.
    const slugToId = buildSlugToIdMap(allTags);

    /** @type {string[]} */
    let orderedSlugs;
    /** @type {{ input_hash: string, generated_at: string } | null} */
    let ingestTagAi;

    if (ai.skipped) {
      // Inputs unchanged: keep prior slugs and prior ingest_tag_ai stamp as-is.
      // Skips both LLM cost and DB write of restaurant_tags rows.
      orderedSlugs = [...prevIngestSlugs];
      ingestTagAi =
        priorAi && typeof priorAi.input_hash === 'string'
          ? /** @type {{ input_hash: string, generated_at: string }} */ (
              /** @type {unknown} */ (priorAi)
            )
          : { input_hash: ai.input_hash, generated_at: new Date().toISOString() };
    } else {
      await insertNewTags(supabaseAdminClient, ai.new_tags);
      if (ai.new_tags.length) {
        const newRows = await fetchTagsBySlugs(
          supabaseAdminClient,
          ai.new_tags.map((nt) => nt.slug)
        );
        newRows.forEach((r) => {
          if (r.id && r.slug) slugToId.set(r.slug, r.id);
        });
      }
      orderedSlugs = [];
      const pushSlug = (s) => {
        if (s && !orderedSlugs.includes(s)) orderedSlugs.push(s);
      };
      if (mapped.priceTagSlug) pushSlug(mapped.priceTagSlug);
      ai.existing_slugs.forEach(pushSlug);
      ai.new_tags.forEach((nt) => pushSlug(nt.slug));
      // Only stamp ingest_tag_ai when the Qwen call actually succeeded
      // (ai.input_hash present). On failure (null), preserve prior so the next
      // ingest retries rather than hash-skipping into the empty state.
      ingestTagAi = ai.input_hash
        ? { input_hash: ai.input_hash, generated_at: new Date().toISOString() }
        : /** @type {{ input_hash: string, generated_at: string } | null} */ (
            /** @type {unknown} */ (priorAi)
          );
    }

    const metadata = {
      ...priorMeta,
      ...mapped.metadataBase,
      ingest_tag_slugs: orderedSlugs,
      ingest_tag_ai: ingestTagAi,
      ingest_source_photo_urls_hash: sourcePhotoHash,
      ...(reviewConsensus ? { review_consensus: reviewConsensus } : {}),
    };

    const writeRow = {
      // municipality_id holds a MUNICIPALITY-tier cities row (is_municipality = true),
      // which is what municipality_for_point resolves. The column was renamed
      // from municipality_id in 20260722126000; the value's meaning did not change.
      municipality_id: municipalityId,
      name: mapped.row.name,
      address: mapped.row.address,
      latitude: mapped.row.latitude,
      longitude: mapped.row.longitude,
      external_place_id: mapped.row.external_place_id,
      rating: mapped.row.rating,
      price_level: mapped.row.price_level,
      phone: mapped.row.phone,
      website: mapped.row.website,
      maps_link: mapped.row.maps_link,
      menu_url: mapped.row.menu_url,
      menu_source: mapped.row.menu_source,
      metadata,
      updated_at: new Date().toISOString(),
    };

    let restaurantId;
    if (existing?.id) {
      const { error: updErr } = await supabaseAdminClient
        .from('restaurants')
        .update(writeRow)
        .eq('id', existing.id);
      if (updErr) {
        logger.error('restaurants update', updErr);
        return NextResponse.json({ error: 'upsert_failed' }, { status: 500 });
      }
      restaurantId = existing.id;
    } else {
      const { data: inserted, error: insErr } = await supabaseAdminClient
        .from('restaurants')
        .insert(writeRow)
        .select('id')
        .single();
      if (insErr || !inserted?.id) {
        logger.error('restaurants insert', insErr);
        return NextResponse.json({ error: 'upsert_failed' }, { status: 500 });
      }
      restaurantId = inserted.id;
    }

    if (!ai.skipped && existing?.id && prevIngestSlugs.length) {
      await deleteRestaurantTagsBySlugs(prevIngestSlugs, String(existing.id));
    }

    if (!skipPhotoWork) {
      await replaceRestaurantImages(restaurantId, persistedImageUrls);
    }

    if (!ai.skipped) {
      const tagIdsOrdered = resolveTagIds(slugToId, orderedSlugs);
      await insertRestaurantTags(restaurantId, tagIdsOrdered);
    }

    if (reviewConsensus) {
      await syncSignatureDishTags(supabaseAdminClient, restaurantId, metadata.review_consensus);
    }

    const created = !existing?.id;

    return NextResponse.json({
      id: restaurantId,
      created,
      updated: !created,
      municipality_id: municipalityId,
      ingest_tag_slugs: orderedSlugs,
    });
  } catch (e) {
    logger.error('unhandled', e);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
