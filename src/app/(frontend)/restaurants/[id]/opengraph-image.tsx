import { ImageResponse } from 'next/og';

import { ogText } from 'src/libs/og/og-text';
import { truncate } from 'src/libs/og/truncate';
import { loadRemoteImage } from 'src/libs/og/load-remote-image';
import { galleryUrlsForRestaurant } from 'src/libs/restaurant/restaurant-gallery-urls';
import {
  RESTAURANT_ID_UUID_RE,
  fetchRestaurantByIdForSsr,
} from 'src/libs/restaurant/fetch-restaurant-by-id-for-ssr';
import { SPACE } from 'src/theme/spacing';
import { ogImageOptions } from 'src/libs/og/og-fonts';
import {
  px,
  OG_SIZE,
  OgFrame,
  OgStar,
  OG_TYPE,
  OG_COLORS,
  OgTagline,
  OgStatRow,
  OgOverline,
  OgCoverThumb,
  OG_CONTENT_TYPE,
} from 'src/libs/og/og-card';

// Node.js avoids Vercel’s 1 MB Edge Function limit (`next/og` wasm exceeds it on Hobby).
export const runtime = 'nodejs';

export const alt = 'NomNom spot';

export const size = OG_SIZE;

export const contentType = OG_CONTENT_TYPE;

/**
 * Share card for a public spot (1200×630).
 *
 * This is the page behind the app's own share button, and it shipped with `openGraph.title`
 * but no image at all — so WhatsApp, the channel Portuguese restaurant recommendations
 * actually travel through, previewed it with no picture.
 *
 * Reuses `fetchRestaurantByIdForSsr` and `galleryUrlsForRestaurant` so the card's photo is
 * the same moderation-aware, sort-ordered hero the page itself shows.
 */
export default async function RestaurantOpenGraphImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // `fetchRestaurantByIdForSsr` is JSDoc-typed as `object`; name the handful of fields used
  // here rather than widening its contract for one caller.
  const restaurant = (RESTAURANT_ID_UUID_RE.test(id ?? '')
    ? await fetchRestaurantByIdForSsr(id).catch(() => null)
    : null) as {
    name?: unknown;
    rating?: unknown;
    price_level?: unknown;
    home_city?: { name?: unknown } | null;
  } | null;

  const name = truncate(restaurant?.name, 46) || ogText('pages.dashboard.restaurant.not_found_title');
  const city = truncate(restaurant?.home_city?.name, 34);
  const rating = Number(restaurant?.rating);
  const priceLevel = Number(restaurant?.price_level);
  const photo = await loadRemoteImage(galleryUrlsForRestaurant(restaurant)?.[0]);

  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: px(SPACE['2xl']) }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: px(SPACE.md) }}>
            {city ? <OgOverline>{city}</OgOverline> : null}
            <div style={{ display: 'flex', ...OG_TYPE.display, color: OG_COLORS.text }}>{name}</div>
            <OgStatRow
              items={[
                // Own flex row rather than a fragment: satori does not flatten fragments into
                // the parent's flex children, so the gap never lands and the star sits flush
                // against the number.
                Number.isFinite(rating) && rating > 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: px(SPACE.xs) }}>
                    <OgStar />
                    <div style={{ display: 'flex' }}>{rating.toFixed(1)}</div>
                  </div>
                ) : null,
                Number.isFinite(priceLevel) && priceLevel > 0
                  ? '€'.repeat(Math.min(priceLevel, 4))
                  : null,
              ]}
            />
          </div>
          <OgCoverThumb src={photo} />
        </div>

        <OgTagline>{ogText('pages.lists.og_profile_tagline')}</OgTagline>
      </OgFrame>
    ),
    ogImageOptions(OG_SIZE)
  );
}
