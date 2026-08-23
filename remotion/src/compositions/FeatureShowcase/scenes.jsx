import React from 'react';
import { C, SERIF, SANS, clamp, easeOutBack } from '../../theme';
import { REEL_SCENE } from './constants';
import { DeviceCard, Kicker, ParchmentWash, SceneFrame, TerraBar, Wordmark, useScene } from './helpers';
import { FeatureMock } from './mocks';

/** Open on the feature name. */
export const SceneHook = ({ feature }) => {
  const { p, op, slide } = useScene(REEL_SCENE.hook);
  const titleE = easeOutBack(clamp((p - 0.08) / 0.32, 0, 1));

  return (
    <SceneFrame op={op}>
      <ParchmentWash />
      <TerraBar />
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
        <div style={{ opacity: clamp(p / 0.22, 0, 1), marginBottom: 24 }}>
          <Wordmark size={240} />
        </div>
        <Kicker>{feature.kicker}</Kicker>
        <div
          style={{
            marginTop: 28,
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: 86,
            lineHeight: 1.04,
            letterSpacing: '-0.02em',
            color: C.ink,
            opacity: clamp((p - 0.06) / 0.25, 0, 1),
            transform: `translateY(${(1 - titleE) * 28}px) scale(${0.94 + titleE * 0.06})`,
          }}
        >
          {(feature.titleLines || [feature.title]).map((line) => (
            <div key={line}>{line}</div>
          ))}
        </div>
        <div
          style={{
            marginTop: 28,
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: 36,
            color: C.ink2,
            opacity: clamp((p - 0.28) / 0.25, 0, 1),
          }}
        >
          {feature.hook}
        </div>
      </div>
    </SceneFrame>
  );
};

/** Product mock for this feature. */
export const SceneMock = ({ feature }) => {
  const { p, op, slide } = useScene(REEL_SCENE.mock);
  const cardP = clamp((p - 0.04) / 0.28, 0, 1);

  return (
    <SceneFrame op={op}>
      <ParchmentWash />
      <div style={{ transform: `translateY(${slide}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ marginBottom: 28, opacity: clamp(p / 0.2, 0, 1) }}>
          <Kicker>{feature.kicker}</Kicker>
        </div>
        <DeviceCard
          progress={cardP}
          width={920}
          height={feature.mockKind === 'map' ? 1240 : 1100}
          pad={feature.mockKind === 'map' ? 0 : 36}
        >
          <FeatureMock kind={feature.mockKind} p={p} />
        </DeviceCard>
      </div>
    </SceneFrame>
  );
};

/** Three beats — how the feature works. */
export const SceneBeats = ({ feature }) => {
  const { p, op, slide } = useScene(REEL_SCENE.beats);

  return (
    <SceneFrame op={op}>
      <ParchmentWash />
      <div style={{ transform: `translateY(${slide}px)`, width: 920 }}>
        <Kicker>{feature.kicker}</Kicker>
        <div
          style={{
            marginTop: 18,
            marginBottom: 48,
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: 58,
            lineHeight: 1.08,
            color: C.ink,
          }}
        >
          Como funciona?
        </div>
        {feature.beats.map((beat, i) => {
          const show = clamp((p - 0.08 - i * 0.16) / 0.28, 0, 1);
          return (
            <div
              key={beat}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 22,
                marginBottom: 28,
                opacity: show,
                transform: `translateX(${(1 - show) * 24}px)`,
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: C.terra,
                  color: C.white,
                  fontFamily: SANS,
                  fontWeight: 800,
                  fontSize: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 36, color: C.ink }}>{beat}</div>
            </div>
          );
        })}
      </div>
    </SceneFrame>
  );
};

/** Close on a parchment CTA — terracotta stays on the button, not the canvas. */
export const SceneCta = ({ feature }) => {
  const { p, op, slide } = useScene(REEL_SCENE.cta);
  const btn = easeOutBack(clamp((p - 0.2) / 0.4, 0, 1));

  return (
    <SceneFrame op={op}>
      <ParchmentWash />
      <TerraBar />
      <div
        style={{
          transform: `translateY(${slide}px)`,
          width: 880,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Wordmark size={228} />
        <div
          style={{
            marginTop: 36,
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: 64,
            lineHeight: 1.08,
            color: C.ink,
            opacity: clamp((p - 0.08) / 0.25, 0, 1),
          }}
        >
          {feature.cta}
        </div>
        <div
          style={{
            marginTop: 18,
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: 30,
            color: C.ink2,
            lineHeight: 1.35,
            maxWidth: 760,
            opacity: clamp((p - 0.16) / 0.25, 0, 1),
          }}
        >
          {feature.body}
        </div>
        <div
          style={{
            marginTop: 44,
            transform: `scale(${0.92 + btn * 0.08})`,
            background: C.terra,
            color: C.white,
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 32,
            padding: '22px 44px',
            borderRadius: 999,
            boxShadow: '0 16px 36px -12px rgba(21,19,15,0.28)',
          }}
        >
          {feature.cta}
        </div>
        <div
          style={{
            marginTop: 22,
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: '0.08em',
            color: C.ink3,
          }}
        >
          justnomnom.com
        </div>
      </div>
    </SceneFrame>
  );
};
