import { ImageResponse } from 'next/og';

import { SPACE } from 'src/theme/spacing';
import { fetchListMetadata } from 'src/libs/lists/actions';

import { truncate } from './truncate';
import { ogText, ogPlural } from './og-text';
import { ogImageOptions } from './og-fonts';
import { loadRemoteImage } from './load-remote-image';
import { fetchOgListItemCount } from './fetch-og-list-item-count';
import { fetchOgListRestaurantThumbs } from './fetch-og-list-restaurant-thumbs';
import {
  px,
  OG_SIZE,
  OgFrame,
  OG_TYPE,
  OgHandle,
  OG_COLORS,
  OgTagline,
  OgOverline,
  OgCoverThumb,
} from './og-card';

// ----------------------------------------------------------------------

/**
 * Share card for a public list, shared by both list routes — `/lists/<uuid>` and
 * `/lists/<handle>/<slug>` render the same art, so the UUID URL and the slug URL it
 * redirects to preview identically.
 *
 * Visibility is delegated to `fetchListMetadata`, which returns `null` for private lists and
 * for unpublished subscriber-only ones. Reusing it rather than re-querying keeps one copy of
 * that rule — a card that leaked a private list's name would be a real disclosure.
 *
 * WhatsApp acceptance: title ≤70 chars, `{N} places · by {owner}`, and up to four
 * restaurant thumbs (or the list cover) so the preview is not a blank/generic card.
 *
 * @param listId resolved list UUID, or `null` when the slug did not resolve.
 */
export async function renderListOgImage(listId: string | null) {
  const meta = listId ? await fetchListMetadata(listId).catch(() => null) : null;

  const name = truncate(meta?.name, 70) || ogText('pages.lists.og_list_fallback_name');
  const owner = meta?.ownerUsername
    ? `@${meta.ownerUsername}`
    : truncate(meta?.ownerName, 28) || '';
  const [cover, spotCount, thumbUrls] = await Promise.all([
    loadRemoteImage(meta?.coverImageUrl),
    meta && listId ? fetchOgListItemCount(listId) : Promise.resolve(0),
    meta && listId ? fetchOgListRestaurantThumbs(listId, 4) : Promise.resolve([]),
  ]);

  const thumbImages = (await Promise.all(thumbUrls.map((url) => loadRemoteImage(url)))).filter(
    Boolean
  ) as string[];

  const bylineParts = [
    spotCount ? ogPlural('pages.lists.spot_count', spotCount) : null,
    owner ? `${ogText('pages.lists.og_list_by_prefix')} ${owner}` : null,
  ].filter(Boolean);

  return new ImageResponse(
    <OgFrame>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: px(SPACE['2xl']) }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: px(SPACE.md) }}>
          <OgOverline>{ogText('pages.lists.og_list_kicker')}</OgOverline>
          <div style={{ display: 'flex', ...OG_TYPE.display, color: OG_COLORS.text }}>{name}</div>
          {bylineParts.length ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: px(SPACE.xs),
                ...OG_TYPE.meta,
                color: OG_COLORS.textSecondary,
                flexWrap: 'wrap',
              }}
            >
              {spotCount ? (
                <div style={{ display: 'flex' }}>
                  {ogPlural('pages.lists.spot_count', spotCount)}
                </div>
              ) : null}
              {spotCount && owner ? <div style={{ display: 'flex' }}> · </div> : null}
              {owner ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: px(SPACE.xs) }}>
                  <div style={{ display: 'flex' }}>{ogText('pages.lists.og_list_by_prefix')}</div>
                  <OgHandle inline>{owner}</OgHandle>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
        {cover && thumbImages.length === 0 ? <OgCoverThumb src={cover} /> : null}
      </div>

      {thumbImages.length > 0 ? (
        <div style={{ display: 'flex', gap: px(SPACE.sm), marginTop: px(SPACE.md) }}>
          {thumbImages.map((src, index) => (
            // eslint-disable-next-line react/no-array-index-key -- static OG collage
            <div
              key={`thumb-${index}`}
              style={{
                display: 'flex',
                width: 140,
                height: 140,
                borderRadius: 16,
                overflow: 'hidden',
                backgroundColor: OG_COLORS.brandLighter,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                width={140}
                height={140}
                style={{ objectFit: 'cover', width: 140, height: 140 }}
              />
            </div>
          ))}
        </div>
      ) : null}

      <OgTagline>{ogText('pages.lists.og_profile_tagline')}</OgTagline>
    </OgFrame>,
    ogImageOptions(OG_SIZE)
  );
}
