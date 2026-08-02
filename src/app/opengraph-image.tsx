import { ImageResponse } from 'next/og';

import { ogImageOptions } from 'src/libs/og/og-fonts';
import { OG_SIZE, OgFrame, OG_TYPE, OG_COLORS, OgTagline, OG_CONTENT_TYPE } from 'src/libs/og/og-card';

// Node.js avoids Vercel’s 1 MB Edge Function limit (`next/og` wasm exceeds it on Hobby).
export const runtime = 'nodejs';

export const alt = 'NomNom';

export const size = OG_SIZE;

export const contentType = OG_CONTENT_TYPE;

/**
 * Default Open Graph / social share image (1200×630).
 *
 * Also the fallback every route without its own card inherits, so it shares `OgFrame` with
 * the profile, list, restaurant and Roulette cards rather than carrying its own chrome.
 */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <OgFrame>
        <div style={{ display: 'flex', ...OG_TYPE.display, color: OG_COLORS.text, maxWidth: 900 }}>
          Restaurant picks from people who know
        </div>
        <OgTagline>Follow creators and locals. Not algorithms.</OgTagline>
      </OgFrame>
    ),
    ogImageOptions(OG_SIZE)
  );
}
