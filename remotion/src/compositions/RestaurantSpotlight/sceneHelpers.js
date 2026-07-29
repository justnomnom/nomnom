// Shared scene envelope + presentational bits for RestaurantSpotlight v2.
import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, SANS, clamp, easeOutCubic, lerp } from '../../theme';
import { SCENE_FADE } from './constants';

export const icon = (name) => staticFile(`icons/${name}.svg`);

/** Resolve http URLs or public/ relative paths for Img. */
export const mediaSrc = (src) => {
  if (!src) return null;
  return src.startsWith('http') ? src : staticFile(src);
};

/** Fade/slide envelope — soft scene joins without Sequence overlap. */
export const useScene = (durSec) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame / fps;
  const p = clamp(local / durSec, 0, 1);
  const { fadeInSec: fin, fadeOutSec: fout, slideInPx, slideOutPx } = SCENE_FADE;
  let op = 1;
  let slide = 0;
  if (local < fin) {
    const t = easeOutCubic(clamp(local / fin, 0, 1));
    op = t;
    slide = (1 - t) * slideInPx;
  } else if (local > durSec - fout) {
    const t = clamp((local - (durSec - fout)) / fout, 0, 1);
    op = 1 - t;
    slide = -t * slideOutPx;
  }
  return { p, op, slide, local };
};

export const SceneBox = ({ children, op, bg }) => (
  <AbsoluteFill
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: op,
      background: bg || C.bg,
    }}
  >
    {children}
  </AbsoluteFill>
);

const Star = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
    <path
      fill={color}
      d="M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.3l-5.8 3.05 1.11-6.46-4.7-4.58 6.49-.94z"
    />
  </svg>
);

/** score 0–5; fills with progress p. */
export const NomStars = ({ score, p, size = 30 }) => {
  const filled = clamp(score, 0, 5) * clamp(p, 0, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {[0, 1, 2, 3, 4].map((i) => {
        const f = clamp(filled - i, 0, 1);
        return (
          <div key={i} style={{ position: 'relative', width: size, height: size }}>
            <Star size={size} color={C.hairline} />
            <div style={{ position: 'absolute', inset: 0, width: `${f * 100}%`, overflow: 'hidden' }}>
              <Star size={size} color={C.gold} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const Avatar = ({ init, tint, tintInk, size = 72 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: tint,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: SANS,
      fontWeight: 800,
      fontSize: size * 0.36,
      color: tintInk,
      flexShrink: 0,
      letterSpacing: '0.01em',
    }}
  >
    {init}
  </div>
);

/** Subtle parchment grain via layered gradients (no external asset). */
export const ParchmentWash = () => (
  <>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(120% 80% at 50% 0%, ${C.parch} 0%, ${C.bg} 55%)`,
      }}
    />
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(90% 50% at 80% 100%, rgba(255,107,53,0.06) 0%, transparent 60%)`,
      }}
    />
  </>
);

export { lerp, clamp, easeOutCubic };
