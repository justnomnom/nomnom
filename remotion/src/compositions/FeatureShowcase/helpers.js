import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, CARD_SHADOW, SANS, clamp, easeOutCubic } from '../../theme';
import { REEL_FADE } from './constants';

export const logoSrc = () => staticFile('logo_circle.png');

/** Soft scene envelope for sequential Sequences. */
export const useScene = (durSec) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame / fps;
  const p = clamp(local / durSec, 0, 1);
  const { fadeInSec: fin, fadeOutSec: fout, slideInPx, slideOutPx } = REEL_FADE;
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

export const ParchmentWash = () => (
  <>
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(120% 80% at 50% 0%, ${C.parch} 0%, ${C.bg} 58%)`,
      }}
    />
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(80% 46% at 82% 100%, rgba(255,107,53,0.07) 0%, transparent 62%)',
      }}
    />
  </>
);

export const SceneFrame = ({ children, op, bg }) => (
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

export const TerraBar = () => (
  <div
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 10,
      background: C.terra,
    }}
  />
);

export const Wordmark = ({ size = 240 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(size * 0.28) }}>
    <Img
      src={logoSrc()}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        boxShadow: '0 10px 22px -8px rgba(255,107,53,0.45)',
      }}
    />
    <span
      style={{
        fontFamily: SANS,
        fontWeight: 800,
        fontSize: Math.round(size * 0.54),
        letterSpacing: '-0.03em',
        color: C.ink,
      }}
    >
      NomNom
    </span>
  </div>
);

export const Kicker = ({ children, color = C.terraDarker }) => (
  <div
    style={{
      fontFamily: SANS,
      fontWeight: 700,
      fontSize: 22,
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      color,
    }}
  >
    {children}
  </div>
);

export const DeviceCard = ({ children, width = 920, height = 980, progress = 1, pad = 36 }) => (
  <div
    style={{
      width,
      height,
      borderRadius: 32,
      background: C.paper,
      boxShadow: CARD_SHADOW,
      border: `1px solid ${C.hairline}`,
      overflow: 'hidden',
      transform: `translateY(${(1 - progress) * 28}px) scale(${0.96 + progress * 0.04})`,
      opacity: progress,
      padding: pad,
      boxSizing: 'border-box',
    }}
  >
    {children}
  </div>
);
