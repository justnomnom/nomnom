import React from 'react';
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, SANS, clamp, easeOutCubic } from '../../theme';
import { SCENE_FADE } from './constants';

export const icon = (name) => staticFile(`icons/${name}.svg`);

export const mediaSrc = (src) => {
  if (!src) return null;
  return src.startsWith('http') ? src : staticFile(src);
};

/** Soft scene envelope for sequential Sequences. */
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

export const Avatar = ({ init, tint, tintInk, size = 64 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: tint || C.terraLight,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: SANS,
      fontWeight: 800,
      fontSize: size * 0.34,
      color: tintInk || C.terraDarker,
      flexShrink: 0,
    }}
  >
    {init}
  </div>
);

export const SpotIndex = ({ n, total, size = 56 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: C.terra,
      color: C.white,
      fontFamily: SANS,
      fontWeight: 800,
      fontSize: size * 0.38,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontVariantNumeric: 'tabular-nums',
      boxShadow: '0 10px 24px -8px rgba(255,107,53,0.55)',
      flexShrink: 0,
    }}
  >
    {n}
    {total ? (
      <span style={{ fontSize: size * 0.22, fontWeight: 700, opacity: 0.75, marginLeft: 1 }}>/{total}</span>
    ) : null}
  </div>
);

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
        background: 'radial-gradient(90% 50% at 80% 100%, rgba(255,107,53,0.06) 0%, transparent 60%)',
      }}
    />
  </>
);

export { clamp, easeOutCubic };
