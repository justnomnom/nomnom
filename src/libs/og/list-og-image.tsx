import { ImageResponse } from 'next/og';

import { SPACE } from 'src/theme/spacing';
import { fetchListMetadata } from 'src/libs/lists/actions';

import { truncate } from './truncate';
import { ogText, ogPlural } from './og-text';
import { ogImageOptions } from './og-fonts';
import { loadRemoteImage } from './load-remote-image';
import { fetchOgListItemCount } from './fetch-og-list-item-count';
import {
  px,
  OG_SIZE,
  OgFrame,
  OG_TYPE,
  OgHandle,
  OG_COLORS,
  OgTagline,
  OgStatRow,
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
 * @param listId resolved list UUID, or `null` when the slug did not resolve.
 */
export async function renderListOgImage(listId: string | null) {
  const meta = listId ? await fetchListMetadata(listId).catch(() => null) : null;

  const name = truncate(meta?.name, 52) || ogText('pages.lists.og_list_fallback_name');
  const owner = meta?.ownerUsername
    ? `@${meta.ownerUsername}`
    : truncate(meta?.ownerName, 28) || '';
  const [cover, spotCount] = await Promise.all([
    loadRemoteImage(meta?.coverImageUrl),
    meta && listId ? fetchOgListItemCount(listId) : Promise.resolve(0),
  ]);

  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: px(SPACE['2xl']) }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: px(SPACE.md) }}>
            <OgOverline>{ogText('pages.lists.og_list_kicker')}</OgOverline>
            <div style={{ display: 'flex', ...OG_TYPE.display, color: OG_COLORS.text }}>{name}</div>
            <OgStatRow
              items={[
                // The handle itself carries the mono face (DESIGN.md §3); the "by" label
                // around it stays in Albert Sans like the rest of the stat run.
                // Own flex row rather than a fragment: satori does not flatten fragments into
                // the parent's flex children, so the row's `gap` never lands and the two
                // halves render touching ("by@handle").
                owner ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: px(SPACE.xs) }}>
                    <div style={{ display: 'flex' }}>{ogText('pages.lists.og_list_by_prefix')}</div>
                    <OgHandle inline>{owner}</OgHandle>
                  </div>
                ) : null,
                spotCount ? ogPlural('pages.lists.spot_count', spotCount) : null,
              ]}
            />
          </div>
          <OgCoverThumb src={cover} />
        </div>

        <OgTagline>{ogText('pages.lists.og_profile_tagline')}</OgTagline>
      </OgFrame>
    ),
    ogImageOptions(OG_SIZE)
  );
}
