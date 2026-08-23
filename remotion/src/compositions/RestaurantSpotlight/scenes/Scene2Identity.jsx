import React from 'react';
import { Img, staticFile } from 'remotion';
import { C, SERIF, SANS, clamp, easeOutBack, easeOutCubic, lerp } from '../../../theme';
import { SCENE_DUR } from '../constants';
import { SceneBox, useScene, icon, NomStars, ParchmentWash, mediaSrc } from '../sceneHelpers';

/**
 * Name the place — restaurant first, small NomNom mark, social proof count.
 * Dish thumbnail anchors that this is the same plate from the cold open.
 */
export const Scene2Identity = ({ restaurant, chips, photo }) => {
  const { p, op, slide } = useScene(SCENE_DUR.identity);
  const nameP = clamp((p - 0.06) / 0.28, 0, 1);
  const nameE = easeOutBack(nameP);
  // Fill stars early so the rating reads complete for most of the scene.
  const rateP = clamp((p - 0.18) / 0.28, 0, 1);
  const chipP = clamp((p - 0.38) / 0.32, 0, 1);
  const thumbS = lerp(0.94, 1, easeOutCubic(clamp(p / 0.4, 0, 1)));
  const src = mediaSrc(photo);

  return (
    <SceneBox op={op}>
      <ParchmentWash />
      <div
        style={{
          transform: `translateY(${slide}px)`,
          width: 920,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          paddingTop: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 14,
              opacity: clamp(p / 0.25, 0, 1),
            }}
          >
            <Img
              src={staticFile('logo_circle.png')}
              style={{ width: 88, height: 88, borderRadius: '50%', boxShadow: '0 10px 22px -8px rgba(255,107,53,0.45)' }}
            />
            <span
              style={{
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: 28,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: C.terra,
              }}
            >
              On NomNom
            </span>
          </div>
          {restaurant.savedBy ? (
            <span
              style={{
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: 24,
                color: C.ink2,
                opacity: clamp((p - 0.15) / 0.25, 0, 1),
              }}
            >
              {restaurant.savedBy} saved
            </span>
          ) : null}
        </div>

        {src ? (
          <div
            style={{
              width: '100%',
              height: 420,
              borderRadius: 32,
              overflow: 'hidden',
              marginBottom: 40,
              transform: `scale(${thumbS})`,
              transformOrigin: 'center top',
              boxShadow: '0 0 0 1px rgba(226,221,208,0.95), 0 28px 48px -20px rgba(21,19,15,0.22)',
            }}
          >
            <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        ) : null}

        <div
          style={{
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: 92,
            color: C.ink,
            lineHeight: 1.02,
            letterSpacing: '-0.02em',
            opacity: nameP,
            transform: `translateY(${(1 - nameE) * 28}px)`,
          }}
        >
          {restaurant.nameLines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>

        <div
          style={{
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: 28,
            color: C.ink2,
            marginTop: 18,
            opacity: clamp((p - 0.2) / 0.25, 0, 1),
          }}
        >
          {restaurant.tagline}
        </div>

        {Number.isFinite(restaurant.rating) ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 28 }}>
            <NomStars score={restaurant.rating} p={rateP} size={34} />
            <span
              style={{
                fontFamily: SANS,
                fontWeight: 800,
                fontSize: 36,
                color: C.ink,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {(restaurant.rating * rateP).toFixed(1)}
            </span>
            <Img src={icon('star-terra')} style={{ width: 30, height: 30, opacity: rateP }} />
          </div>
        ) : null}

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            marginTop: 36,
            opacity: chipP,
            transform: `translateY(${(1 - chipP) * 14}px)`,
          }}
        >
          {chips.map(({ emoji, label }) => (
            <div
              key={label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                background: C.paper,
                border: `1px solid ${C.hairline}`,
                borderRadius: 999,
                padding: '12px 20px',
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: 24,
                color: C.ink,
              }}
            >
              <Img src={icon(emoji)} style={{ width: 26, height: 26 }} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </SceneBox>
  );
};
