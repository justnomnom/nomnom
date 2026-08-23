import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { C, SERIF, SANS, clamp, easeOutCubic } from '../../theme';
import { SLIDE_COUNT, SLIDE_SEC } from './constants';
import { getFeature } from './features';
import { DeviceCard, Kicker, ParchmentWash, TerraBar, Wordmark } from './helpers';
import { FeatureMock } from './mocks';

export const defaultFeatureSlideshowProps = {
  featureId: 'feed',
};

/**
 * 1080×1080 slideshow. Five slides: cover, mock, how, why, CTA.
 * Still frames are taken at the midpoint of each slide.
 */
export const FeatureSlideshow = ({ featureId }) => {
  const feature = getFeature(featureId);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const slideFrames = Math.round(SLIDE_SEC * fps);
  const slide = Math.min(SLIDE_COUNT - 1, Math.floor(frame / slideFrames));
  const local = (frame % slideFrames) / slideFrames;
  const enter = easeOutCubic(clamp(local / 0.22, 0, 1));
  const leave = local > 0.88 ? 1 - clamp((local - 0.88) / 0.12, 0, 1) : 1;
  const op = enter * leave;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <ParchmentWash />
      <TerraBar />
      <div
        style={{
          position: 'absolute',
          inset: 48,
          display: 'flex',
          flexDirection: 'column',
          opacity: op,
          transform: `translateY(${(1 - enter) * 18}px)`,
        }}
      >
        {slide === 0 ? <CoverSlide feature={feature} /> : null}
        {slide === 1 ? <MockSlide feature={feature} local={local} /> : null}
        {slide === 2 ? <HowSlide feature={feature} local={local} /> : null}
        {slide === 3 ? <WhySlide feature={feature} /> : null}
        {slide === 4 ? <CtaSlide feature={feature} /> : null}
      </div>
      <Dots index={slide} />
    </AbsoluteFill>
  );
};

const CoverSlide = ({ feature }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 12px' }}>
    <Wordmark size={240} />
    <div style={{ marginTop: 20 }}>
      <Kicker>{feature.kicker}</Kicker>
    </div>
    <div
      style={{
        marginTop: 22,
        fontFamily: SERIF,
        fontWeight: 700,
        fontSize: 64,
        lineHeight: 1.06,
        letterSpacing: '-0.02em',
        color: C.ink,
      }}
    >
      {(feature.titleLines || [feature.title]).map((line) => (
        <div key={line}>{line}</div>
      ))}
    </div>
    <div style={{ marginTop: 22, fontFamily: SANS, fontWeight: 700, fontSize: 28, color: C.ink2 }}>{feature.hook}</div>
  </div>
);

const MockSlide = ({ feature, local }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
    <Kicker>{feature.kicker}</Kicker>
    <div style={{ flex: 1, marginTop: 16, minHeight: 0 }}>
      <DeviceCard
        progress={1}
        width={984}
        height={feature.mockKind === 'map' ? 860 : 820}
        pad={feature.mockKind === 'map' ? 0 : 36}
      >
        <FeatureMock kind={feature.mockKind} p={clamp(local, 0.35, 1)} />
      </DeviceCard>
    </div>
  </div>
);

const HowSlide = ({ feature, local }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 8px' }}>
    <Kicker>{feature.kicker}</Kicker>
    <div style={{ marginTop: 16, marginBottom: 36, fontFamily: SERIF, fontWeight: 700, fontSize: 48, color: C.ink }}>
      Como funciona?
    </div>
    {feature.beats.map((beat, i) => {
      const show = clamp((local - i * 0.12) / 0.22, 0, 1);
      return (
        <div key={beat} style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 22, opacity: show }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: C.terra,
              color: C.white,
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {i + 1}
          </div>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 32, color: C.ink }}>{beat}</div>
        </div>
      );
    })}
  </div>
);

const WhySlide = ({ feature }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 12px' }}>
    <Kicker>{feature.kicker}</Kicker>
    <div style={{ marginTop: 20, fontFamily: SERIF, fontWeight: 700, fontSize: 52, lineHeight: 1.08, color: C.ink }}>
      {feature.hook}
    </div>
    <div style={{ marginTop: 24, fontFamily: SANS, fontWeight: 600, fontSize: 30, lineHeight: 1.4, color: C.ink2 }}>
      {feature.body}
    </div>
  </div>
);

const CtaSlide = ({ feature }) => (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
    <Wordmark size={220} />
    <div style={{ marginTop: 28, fontFamily: SERIF, fontWeight: 700, fontSize: 52, color: C.ink, lineHeight: 1.08 }}>
      {feature.cta}
    </div>
    <div
      style={{
        marginTop: 32,
        background: C.terra,
        color: C.white,
        fontFamily: SANS,
        fontWeight: 800,
        fontSize: 28,
        padding: '18px 36px',
        borderRadius: 999,
      }}
    >
      justnomnom.com
    </div>
  </div>
);

const Dots = ({ index }) => (
  <div
    style={{
      position: 'absolute',
      bottom: 28,
      left: 0,
      right: 0,
      display: 'flex',
      justifyContent: 'center',
      gap: 8,
    }}
  >
    {Array.from({ length: SLIDE_COUNT }, (_, i) => (
      <div
        key={i}
        style={{
          width: i === index ? 28 : 10,
          height: 10,
          borderRadius: 999,
          background: i === index ? C.terra : C.hairline,
        }}
      />
    ))}
  </div>
);
