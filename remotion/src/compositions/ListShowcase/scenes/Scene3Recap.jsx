import React from 'react';
import { Img } from 'remotion';
import { C, SERIF, SANS, clamp, easeOutBack } from '../../../theme';
import { SCENE_DUR } from '../constants';
import { SceneBox, useScene, ParchmentWash, mediaSrc } from '../sceneHelpers';

/** All spots in a 2×2 grid — the list as one glance. */
export const Scene3Recap = ({ list, places }) => {
  const { p, op, slide } = useScene(SCENE_DUR.recap);
  const shown = places.slice(0, 4);

  return (
    <SceneBox op={op}>
      <ParchmentWash />
      <div
        style={{
          transform: `translateY(${slide}px)`,
          width: 920,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: C.terra,
            marginBottom: 14,
            opacity: clamp(p / 0.2, 0, 1),
          }}
        >
          The full list
        </div>
        <div
          style={{
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: 56,
            color: C.ink,
            letterSpacing: '-0.015em',
            marginBottom: 28,
            opacity: clamp((p - 0.05) / 0.22, 0, 1),
          }}
        >
          {list.title}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 18,
          }}
        >
          {shown.map((place, i) => {
            const r = clamp((p - (0.12 + i * 0.08)) / 0.28, 0, 1);
            const e = easeOutBack(r);
            const src = mediaSrc(place.photo);
            return (
              <div
                key={place.id || i}
                style={{
                  borderRadius: 28,
                  overflow: 'hidden',
                  background: C.paper,
                  border: `1px solid ${C.hairline}`,
                  boxShadow: '0 14px 32px -16px rgba(21,19,15,0.2)',
                  opacity: r,
                  transform: `translateY(${(1 - e) * 22}px) scale(${0.94 + e * 0.06})`,
                }}
              >
                <div style={{ height: 220, position: 'relative', background: C.parchDeep }}>
                  {src ? (
                    <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : null}
                  <div
                    style={{
                      position: 'absolute',
                      left: 14,
                      top: 14,
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: C.terra,
                      color: C.white,
                      fontFamily: SANS,
                      fontWeight: 800,
                      fontSize: 18,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {i + 1}
                  </div>
                </div>
                <div style={{ padding: '16px 18px 18px' }}>
                  <div
                    style={{
                      fontFamily: SANS,
                      fontWeight: 800,
                      fontSize: 26,
                      color: C.ink,
                      letterSpacing: '-0.01em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {place.name}
                  </div>
                  {place.tagline ? (
                    <div
                      style={{
                        marginTop: 4,
                        fontFamily: SANS,
                        fontWeight: 600,
                        fontSize: 20,
                        color: C.ink2,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {place.tagline}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SceneBox>
  );
};
