import { ImageResponse } from 'next/og';

import { OG_SIZE, OG_CONTENT_TYPE, OgFrame, OG_TYPE, OG_COLORS, OgTagline } from 'src/libs/og/og-card';
import { ogImageOptions } from 'src/libs/og/og-fonts';
import { renderListOgImage } from 'src/libs/og/list-og-image';
import { fetchNight } from 'src/libs/lists/actions/night-actions';

// Node.js avoids Vercel’s 1 MB Edge Function limit (`next/og` wasm exceeds it on Hobby).
export const runtime = 'nodejs';

export const alt = 'NomNom Tonight';

export const size = OG_SIZE;

export const contentType = OG_CONTENT_TYPE;

/**
 * Tonight OG: reuse list collage when night resolves; else simple title card.
 */
export default async function TonightOpenGraphImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { night } = await fetchNight(id).catch(() => ({ night: null }));
  const listId = night?.list_id ? String(night.list_id) : null;
  if (listId) {
    return renderListOgImage(listId);
  }

  const title = night?.title ? String(night.title) : 'Tonight';
  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: 'flex', ...OG_TYPE.display, color: OG_COLORS.text, maxWidth: 900 }}>
          {title}
        </div>
        <OgTagline>Pick a place together — NomNom</OgTagline>
      </OgFrame>
    ),
    ogImageOptions(OG_SIZE)
  );
}
