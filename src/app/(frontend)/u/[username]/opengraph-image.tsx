import { ImageResponse } from 'next/og';

import { SPACE, RADIUS } from 'src/theme/spacing';
import { ogText, ogPlural } from 'src/libs/og/og-text';
import { truncate } from 'src/libs/og/truncate';
import { fetchOgProfile } from 'src/libs/og/fetch-og-profile';
import { loadRemoteImage } from 'src/libs/og/load-remote-image';
import { ogImageOptions } from 'src/libs/og/og-fonts';
import {
  px,
  OG_SIZE,
  OgFrame,
  OG_TYPE,
  OgHandle,
  OG_COLORS,
  OgTagline,
  OgStatRow,
  OG_CONTENT_TYPE,
} from 'src/libs/og/og-card';

// Node.js avoids Vercel’s 1 MB Edge Function limit (`next/og` wasm exceeds it on Hobby).
export const runtime = 'nodejs';

export const alt = 'NomNom profile';

export const size = OG_SIZE;

export const contentType = OG_CONTENT_TYPE;

/** On the 8px grid, and close to `OgCoverThumb`'s 256 so the two card families feel related. */
const AVATAR_SIZE = 160;

/**
 * Per-profile share card (1200×630).
 *
 * The profile is the most-pasted NomNom URL there is — a bio link, a WhatsApp message, an
 * Instagram story. Until now it rendered as a bare link, because the route had no metadata
 * at all. Next wires this file into `openGraph.images` automatically.
 *
 * Every failure path falls through to a handle-only card rather than throwing: a crawler
 * that gets a 500 here caches the absence, and the link stays ugly long after the fix.
 */
export default async function ProfileOpenGraphImage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const profile = await fetchOgProfile(username).catch(() => null);

  const handle = profile?.handle || String(username ?? '').replace(/^@/, '');
  const name = truncate(profile?.displayName || handle, 32);
  const bio = truncate(profile?.bio, 110);
  const avatar = await loadRemoteImage(profile?.avatarUrl);
  const monogram = (name || handle || '?').trim().charAt(0).toUpperCase();

  const stats = profile
    ? [
        profile.followerCount ? ogPlural('pages.lists.og_followers', profile.followerCount) : null,
        profile.listCount ? ogPlural('pages.lists.og_lists', profile.listCount) : null,
        profile.spotCount ? ogPlural('pages.lists.spot_count', profile.spotCount) : null,
      ]
    : [];

  return new ImageResponse(
    <OgFrame>
      <div style={{ display: 'flex', alignItems: 'center', gap: px(SPACE.xl) }}>
        {avatar ? (
          <img
            src={avatar}
            width={AVATAR_SIZE}
            height={AVATAR_SIZE}
            alt=""
            style={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: RADIUS.pill,
              objectFit: 'cover',
              border: `${px(SPACE.xs)}px solid ${OG_COLORS.surface}`,
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: RADIUS.pill,
              background: OG_COLORS.brandLighter,
              border: `${px(SPACE.xs)}px solid ${OG_COLORS.surface}`,
              fontSize: 72,
              fontWeight: 800,
              color: OG_COLORS.brand,
            }}
          >
            {monogram}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: px(SPACE.xs) }}>
          <div style={{ display: 'flex', ...OG_TYPE.display, color: OG_COLORS.text }}>{name}</div>
          {handle ? <OgHandle>@{handle}</OgHandle> : null}
        </div>
      </div>

      {bio ? (
        <div
          style={{
            display: 'flex',
            ...OG_TYPE.body,
            color: OG_COLORS.text,
            maxWidth: 940,
          }}
        >
          {bio}
        </div>
      ) : null}

      <OgStatRow items={stats} />

      <OgTagline>{ogText('pages.lists.og_profile_tagline')}</OgTagline>
    </OgFrame>,
    ogImageOptions(size)
  );
}
