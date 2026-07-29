import React from 'react';
import { Img, staticFile } from 'remotion';
import { C, SERIF, SANS, MONO, clamp, easeOutBack } from '../../../theme';
import { SCENE_DUR } from '../constants';
import { SceneBox, useScene, Avatar, ParchmentWash, mediaSrc } from '../sceneHelpers';

/** Open on the list — title, creator, spot count, photo stack tease. */
export const Scene1ListIntro = ({ list, creator, places }) => {
  const { p, op, slide } = useScene(SCENE_DUR.intro);
  const titleE = easeOutBack(clamp((p - 0.08) / 0.28, 0, 1));
  const stackP = clamp((p - 0.35) / 0.4, 0, 1);
  const previews = places.slice(0, 4);

  return (
    <SceneBox op={op}>
      <ParchmentWash />
      <div
        style={{
          transform: `translateY(${slide}px)`,
          width: 920,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 14,
            opacity: clamp(p / 0.22, 0, 1),
            marginBottom: 36,
          }}
        >
          <Img
            src={staticFile('logo_circle.png')}
            style={{ width: 52, height: 52, borderRadius: '50%', boxShadow: '0 8px 18px -8px rgba(255,107,53,0.45)' }}
          />
          <span
            style={{
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: C.terra,
            }}
          >
            A NomNom list
          </span>
        </div>

        <div
          style={{
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: 88,
            lineHeight: 1.04,
            letterSpacing: '-0.02em',
            color: C.ink,
            opacity: clamp((p - 0.06) / 0.25, 0, 1),
            transform: `translateY(${(1 - titleE) * 30}px) scale(${0.94 + titleE * 0.06})`,
          }}
        >
          {(list.titleLines || [list.title]).map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>

        {list.subtitle ? (
          <div
            style={{
              marginTop: 18,
              fontFamily: SANS,
              fontWeight: 600,
              fontSize: 28,
              color: C.ink2,
              opacity: clamp((p - 0.2) / 0.25, 0, 1),
            }}
          >
            {list.subtitle}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 32,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            opacity: clamp((p - 0.28) / 0.25, 0, 1),
          }}
        >
          <Avatar init={creator.init} tint={creator.tint} tintInk={creator.tintInk} size={56} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 28, color: C.ink }}>{creator.name}</div>
            <div style={{ fontFamily: MONO, fontWeight: 500, fontSize: 22, color: C.ink2 }}>{creator.handle}</div>
          </div>
          <div
            style={{
              marginLeft: 12,
              background: C.paper,
              border: `1px solid ${C.hairline}`,
              borderRadius: 999,
              padding: '10px 18px',
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: 24,
              color: C.ink,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {places.length} spots
          </div>
        </div>

        {/* Photo stack tease */}
        <div
          style={{
            marginTop: 56,
            position: 'relative',
            width: 520,
            height: 340,
            opacity: stackP,
          }}
        >
          {previews.map((place, i) => {
            const src = mediaSrc(place.photo);
            const rot = (i - 1.5) * 4;
            const x = (i - 1.5) * 28;
            const y = Math.abs(i - 1.5) * 8;
            return (
              <div
                key={place.id || i}
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: 20,
                  width: 280,
                  height: 300,
                  marginLeft: -140 + x,
                  transform: `translateY(${y + (1 - stackP) * 24}px) rotate(${rot}deg) scale(${0.92 + stackP * 0.08})`,
                  borderRadius: 28,
                  overflow: 'hidden',
                  boxShadow: '0 18px 40px -16px rgba(21,19,15,0.28)',
                  border: `3px solid ${C.paper}`,
                  zIndex: i,
                  background: C.parchDeep,
                }}
              >
                {src ? (
                  <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </SceneBox>
  );
};
