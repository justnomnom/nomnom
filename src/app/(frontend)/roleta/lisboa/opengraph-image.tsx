import { ImageResponse } from 'next/og';

import { SPACE, RADIUS } from 'src/theme/spacing';
import { ogText } from 'src/libs/og/og-text';
import { ogImageOptions } from 'src/libs/og/og-fonts';
import {
  px,
  OG_SIZE,
  OgFrame,
  OG_TYPE,
  OG_COLORS,
  OgTagline,
  OG_CONTENT_TYPE,
} from 'src/libs/og/og-card';

// Node.js avoids Vercel’s 1 MB Edge Function limit (`next/og` wasm exceeds it on Hobby).
export const runtime = 'nodejs';

export const alt = 'NomNom Roulette — Lisboa';

export const size = OG_SIZE;

export const contentType = OG_CONTENT_TYPE;

/**
 * Share card for the public Lisbon Roulette (1200×630).
 *
 * This page exists to be pasted into group chats by people who do not have an account, so a
 * missing preview costs more here than anywhere else on the site. Copy comes from the same
 * locale keys as the page's own `metadata`, so the card and the tab title cannot drift.
 */
export default function LisboaRouletteOpenGraphImage() {
  return new ImageResponse(
    <OgFrame>
      <div
        style={{
          display: 'flex',
          alignSelf: 'flex-start',
          alignItems: 'center',
          padding: `${px(SPACE.sm)}px ${px(SPACE.lg)}px`,
          borderRadius: RADIUS.pill,
          background: OG_COLORS.brandLighter,
          ...OG_TYPE.overline,
          color: OG_COLORS.brand,
        }}
      >
        {ogText('pages.public.roulette.lisboa.scope_footer')}
      </div>

      <div style={{ display: 'flex', ...OG_TYPE.display, color: OG_COLORS.text, maxWidth: 960 }}>
        {ogText('pages.public.roulette.lisboa.title')}
      </div>

      <div
        style={{
          display: 'flex',
          ...OG_TYPE.body,
          color: OG_COLORS.textSecondary,
          maxWidth: 900,
        }}
      >
        {ogText('pages.public.roulette.lisboa.subtitle')}
      </div>

      <OgTagline>{ogText('pages.public.roulette.lisboa.og_no_account')}</OgTagline>
    </OgFrame>,
    ogImageOptions(OG_SIZE)
  );
}
