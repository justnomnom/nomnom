import React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import { C, SERIF, SANS, clamp, easeOutBack, easeOutCubic, lerp } from '../../../theme';
import { SCENE_DUR } from '../constants';
import { useScene, mediaSrc, SpotIndex } from '../sceneHelpers';

/**
 * One list spot — full-bleed photo, index badge, name, short vibe line.
 */
export const Scene2Spot = ({ place, index, total }) => {
  const { p, op } = useScene(SCENE_DUR.spot);
  const kb = lerp(1.1, 1.02, easeOutCubic(clamp(p, 0, 1)));
  const textE = easeOutBack(clamp((p - 0.12) / 0.3, 0, 1));
  const src = mediaSrc(place.photo);
  const lines = place.nameLines || [place.name];

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
            'linear-gradient(180deg, rgba(21,19,15,0.25) 0%, rgba(21,19,15,0.05) 40%, rgba(21,19,15,0.55) 65%, rgba(21,19,15,0.94) 100%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 120,
          left: 64,
          right: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: clamp(p / 0.25, 0, 1),
        }}
      >
        <SpotIndex n={index + 1} size={64} />
        <span
          style={{
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'rgba(253,252,250,0.85)',
          }}
        >
          {index + 1} of {total}
        </span>
      </div>

      <div
        style={{
          position: 'absolute',
          left: 64,
          right: 64,
          bottom: 160,
          transform: `translateY(${(1 - textE) * 36}px)`,
          opacity: clamp((p - 0.1) / 0.25, 0, 1),
        }}
      >
        {place.neighbourhood ? (
          <div
            style={{
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: C.terra,
              marginBottom: 16,
            }}
          >
            {place.neighbourhood}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: 78,
            lineHeight: 1.05,
            letterSpacing: '-0.015em',
            color: C.white,
          }}
        >
          {lines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
        {place.tagline ? (
          <div
            style={{
              marginTop: 18,
              fontFamily: SANS,
              fontWeight: 600,
              fontSize: 30,
              color: 'rgba(253,252,250,0.88)',
            }}
          >
            {place.tagline}
          </div>
        ) : null}
        {Number.isFinite(place.rating) ? (
          <div
            style={{
              marginTop: 22,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(253,252,250,0.94)',
              borderRadius: 999,
              padding: '10px 18px',
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: 26,
              color: C.ink,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span style={{ color: C.gold }}>★</span>
            {place.rating.toFixed(1)}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
