/**
 * Shared chrome and helpers for the `next/og` share cards.
 *
 * These render through satori, outside React DOM and outside the MUI theme, so the tokens are
 * imported from `src/theme/spacing.js` where possible and repeated as literals where the theme
 * only exposes them through MUI (`palette.js`). Keep the literals in sync with `DESIGN.md` §2.
 *
 * Satori needs an explicit `display` on every element with more than one child, hence the
 * verbose inline styles.
 */

import type { ReactNode } from 'react';

import { SPACE, RADIUS } from 'src/theme/spacing';

import { OG_FONT_SANS, OG_FONT_MONO } from './og-fonts';

// ----------------------------------------------------------------------

/** Facebook/LinkedIn/WhatsApp all crop to roughly this; Twitter uses it for `summary_large_image`. */
export const OG_SIZE = { width: 1200, height: 630 };

export const OG_CONTENT_TYPE = 'image/png';

/** `DESIGN.md` §2. `brand` is `primary.main`, `text` is `grey[900]`, `textSecondary` is `grey[600]`. */
export const OG_COLORS = {
  brand: '#FF6B35',
  brandLighter: '#FFE8DF',
  text: '#15130f',
  textSecondary: '#6e6657',
  surface: '#fdfcfa',
  /** `warning` — the gold the product already uses for star ratings. */
  star: '#F59E0B',
};

/** `SPACE` is in MUI multipliers (8px base); satori wants raw px. */
export const px = (token: number) => token * 8;

/** Warm cream → peach wash, shared by every card so all NomNom links look related. */
const OG_BACKGROUND = 'linear-gradient(145deg, #faf9f5 0%, #fff4ee 45%, #ffe8dc 100%)';

/**
 * Card type scale.
 *
 * Weights, line-heights and tracking follow `DESIGN.md` §3; the sizes are scaled up for the
 * 1200×630 canvas, which sits far above the app's responsive range (h1 tops out at 34px).
 * `display` therefore takes h1's posture — 800 weight, 1.2 line-height, -0.02em tracking —
 * rather than inventing its own. Albert Sans is capped at 800: no `900` (DESIGN.md §3).
 */
export const OG_TYPE = {
  /** Wordmark — h1 posture at brand colour. */
  wordmark: { fontSize: 44, fontWeight: 800, letterSpacing: '-0.02em' },
  /** Card headline (list name, restaurant name, display name). */
  display: { fontSize: 68, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-0.02em' },
  /** Section label above the headline — `overline`: 700 weight, 0.08em tracking, caps. */
  overline: {
    fontSize: 26,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  },
  /** Body copy — `body1`'s 1.6 line-height (DESIGN.md: "that's the contract"). */
  body: { fontSize: 30, lineHeight: 1.6 },
  /** Metadata run — `body2` posture. */
  meta: { fontSize: 28 },
  /** Footer tagline. */
  caption: { fontSize: 26 },
};

/**
 * Numeric labels lock digit advance widths, mirroring `tabularNumsSx` from
 * `src/theme/spacing.js` — DESIGN.md §3 requires it on ratings, follower counts and list sizes.
 */
const OG_TABULAR_NUMS = {
  fontVariantNumeric: 'tabular-nums',
  fontFeatureSettings: '"tnum"',
};

// ----------------------------------------------------------------------

/**
 * Card shell: full-bleed warm background, NomNom wordmark top-left, content bottom-aligned.
 * `SPACE.section` padding and `SPACE.lg` between content blocks.
 */
export function OgFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: px(SPACE.section),
        background: OG_BACKGROUND,
        fontFamily: OG_FONT_SANS,
      }}
    >
      <div style={{ display: 'flex', ...OG_TYPE.wordmark, color: OG_COLORS.brand }}>NomNom</div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          justifyContent: 'flex-end',
          gap: px(SPACE.lg),
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Section label above a card headline. `overline` per DESIGN.md §3 — caps, open tracking. */
export function OgOverline({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', ...OG_TYPE.overline, color: OG_COLORS.brand }}>{children}</div>
  );
}

/**
 * A `@handle`. JetBrains Mono per DESIGN.md §3, which assigns handles to the mono face —
 * counts and ratings stay in Albert Sans with tabular numerals, matching the app.
 *
 * @param inline set inside a stat run, where the parent already owns size and colour and
 *   only the face should change.
 */
export function OgHandle({ children, inline = false }: { children: ReactNode; inline?: boolean }) {
  return (
    <div
      style={
        inline
          ? { display: 'flex', fontFamily: OG_FONT_MONO }
          : {
              display: 'flex',
              ...OG_TYPE.body,
              fontFamily: OG_FONT_MONO,
              color: OG_COLORS.textSecondary,
            }
      }
    >
      {children}
    </div>
  );
}

/** Footer line every card closes on, so the brand promise reads the same wherever a link lands. */
export function OgTagline({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', ...OG_TYPE.caption, color: OG_COLORS.textSecondary }}>
      {children}
    </div>
  );
}

/**
 * Square photo for the list and restaurant cards, sitting beside the text rather than behind
 * it — a full-bleed background would put arbitrary user photos under the copy and gamble on
 * legibility for every image we have never seen.
 *
 * @param src a `data:` URI from `loadRemoteImage`, or `null` to render nothing.
 */
export function OgCoverThumb({
  src,
  size: thumbSize = 256,
}: {
  src: string | null;
  size?: number;
}) {
  if (!src) return null;
  return (
    <img
      src={src}
      width={thumbSize}
      height={thumbSize}
      alt=""
      style={{
        width: thumbSize,
        height: thumbSize,
        // A photo tile is card-shaped, so it takes the card radius rather than RADIUS.loose.
        borderRadius: 32,
        objectFit: 'cover',
        border: `${px(SPACE.xs)}px solid ${OG_COLORS.surface}`,
      }}
    />
  );
}

/**
 * Rating star. Drawn as SVG, not `★` — satori's fallback font has no U+2605 and renders it
 * as a tofu box (the server logged `Failed to load dynamic font for ★`).
 */
export function OgStar({ size: starSize = 26 }: { size?: number }) {
  return (
    <svg width={starSize} height={starSize} viewBox="0 0 24 24" fill={OG_COLORS.star}>
      <path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3-5.8 3 1.1-6.5L2.6 9.4l6.5-.9L12 2.6z" />
    </svg>
  );
}

/**
 * Dot-separated stat run, e.g. `128 followers · 6 lists · 214 spots`. Empty entries are
 * dropped, so callers can pass `condition ? value : null` without filtering first.
 *
 * Carries `OG_TABULAR_NUMS` because every caller uses it for counts and ratings.
 */
export function OgStatRow({ items }: { items: ReactNode[] }) {
  const shown = items.filter(Boolean);
  if (!shown.length) return null;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: px(SPACE.md),
        ...OG_TYPE.meta,
        ...OG_TABULAR_NUMS,
      }}
    >
      {shown.map((item, index) => (
        // eslint-disable-next-line react/no-array-index-key -- items are positional, not keyed data
        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: px(SPACE.md) }}>
          {index > 0 ? (
            <div
              style={{
                display: 'flex',
                width: px(SPACE.xs),
                height: px(SPACE.xs),
                borderRadius: RADIUS.pill,
                background: OG_COLORS.brand,
              }}
            />
          ) : null}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: px(SPACE.xs),
              color: OG_COLORS.textSecondary,
            }}
          >
            {item}
          </div>
        </div>
      ))}
    </div>
  );
}
