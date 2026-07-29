import React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import { C, SERIF, SANS, clamp, easeOutBack, easeOutCubic, lerp } from '../../../theme';
import { SCENE_DUR } from '../constants';
import { mediaSrc, useScene } from '../sceneHelpers';

/**
 * Cold open on the plate — food is the hero, hook text over a bottom scrim.
 * No cards, no logo, no floating badges.
 */
export const Scene1Plate = ({ overline, lines, photo }) => {
  const { p, op } = useScene(SCENE_DUR.plate);
  const kb = lerp(1.12, 1.02, easeOutCubic(clamp(p, 0, 1)));
  const scrim = clamp((p - 0.08) / 0.35, 0, 1);
  const src = mediaSrc(photo);

  return (
    <AbsoluteFill style={{ opacity: op, background: C.ink, overflow: 'hidden' }}>
      {src ? (
        <Img
          src={src}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${kb})`,
            transformOrigin: '50% 40%',
          }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(21,19,15,0.35) 0%, rgba(21,19,15,0.08) 38%, rgba(21,19,15,0.55) 62%, rgba(21,19,15,0.92) 100%)',
          opacity: scrim,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          bottom: 160,
          textAlign: 'left',
        }}
      >
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: C.terra,
            marginBottom: 22,
            opacity: clamp((p - 0.12) / 0.2, 0, 1),
          }}
        >
          {overline}
        </div>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 78, lineHeight: 1.06, letterSpacing: '-0.015em' }}>
          {lines.map((l, i) => {
            const r = clamp((p - (0.18 + i * 0.1)) / 0.18, 0, 1);
            const e = easeOutBack(r);
            return (
              <div
                key={i}
                style={{
                  opacity: r,
                  transform: `translateY(${(1 - e) * 36}px)`,
                  color: i === lines.length - 1 ? C.terra : C.white,
                }}
              >
                {l}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
