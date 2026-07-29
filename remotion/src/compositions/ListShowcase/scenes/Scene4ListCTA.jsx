import React from 'react';
import { Img, staticFile } from 'remotion';
import { C, SERIF, SANS, clamp, easeOutBack } from '../../../theme';
import { SCENE_DUR } from '../constants';
import { SceneBox, useScene } from '../sceneHelpers';

/** Close — save the list on NomNom. */
export const Scene4ListCTA = ({ list, creator, places, cta }) => {
  const { p, op, slide } = useScene(SCENE_DUR.cta);
  const btnS = easeOutBack(clamp((p - 0.22) / 0.4, 0, 1));

  return (
    <SceneBox op={op} bg={C.terra}>
      <div
        style={{
          transform: `translateY(${slide}px)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 72px',
        }}
      >
        <Img
          src={staticFile('logo_circle.png')}
          style={{
            width: 128,
            height: 128,
            borderRadius: '50%',
            boxShadow: '0 18px 40px rgba(21,19,15,0.25)',
            border: '5px solid rgba(255,255,255,0.85)',
            opacity: clamp(p / 0.25, 0, 1),
          }}
        />
        <div
          style={{
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: 68,
            color: C.white,
            marginTop: 32,
            lineHeight: 1.06,
            opacity: clamp((p - 0.08) / 0.25, 0, 1),
          }}
        >
          {(cta.headlineLines || ['Save the list.']).map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
        <div
          style={{
            marginTop: 18,
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: 28,
            color: 'rgba(253,252,250,0.92)',
            lineHeight: 1.35,
            maxWidth: 800,
            opacity: clamp((p - 0.2) / 0.25, 0, 1),
          }}
        >
          {cta.sub || `${places.length} spots from ${creator.handle} — ready when the group chat starts.`}
        </div>
        <div
          style={{
            marginTop: 44,
            transform: `scale(${0.9 + btnS * 0.1})`,
            background: C.white,
            color: C.terraDarker,
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 32,
            padding: '22px 48px',
            borderRadius: 999,
            boxShadow: '0 16px 36px -12px rgba(21,19,15,0.35)',
          }}
        >
          {cta.button || 'Save this list'}
        </div>
        <div
          style={{
            marginTop: 28,
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: 22,
            color: 'rgba(253,252,250,0.8)',
            opacity: clamp((p - 0.5) / 0.3, 0, 1),
          }}
        >
          {cta.footer || `${list.title} · nomnom.app`}
        </div>
      </div>
    </SceneBox>
  );
};
