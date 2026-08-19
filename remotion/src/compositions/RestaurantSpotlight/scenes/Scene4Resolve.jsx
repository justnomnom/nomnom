import React from 'react';
import { AbsoluteFill, Img, staticFile } from 'remotion';
import { C, SERIF, SANS, CARD_SHADOW, clamp, easeOutBack, easeOutCubic, lerp } from '../../../theme';
import { SCENE_DUR } from '../constants';
import { useScene, icon, mediaSrc, Avatar } from '../sceneHelpers';

/**
 * Map pin drop, then terra CTA takeover — find it, then save it.
 */
export const Scene4Resolve = ({ restaurant, review, cta }) => {
  const { p, op } = useScene(SCENE_DUR.resolve);
  // First ~55% = map beat; rest = CTA takeover (hard kill map so chrome doesn't ghost)
  const mapPhase = clamp(p / 0.55, 0, 1);
  const ctaPhase = clamp((p - 0.55) / 0.35, 0, 1);
  const mapOp = clamp(1 - ctaPhase * 1.35, 0, 1);
  const drop = easeOutBack(clamp((mapPhase - 0.12) / 0.55, 0, 1));
  const pinY = (1 - drop) * -120;
  const mapKb = lerp(1.1, 1.02, easeOutCubic(mapPhase));
  const mapSrc = mediaSrc(restaurant.mapImage);
  const btnS = easeOutBack(clamp((ctaPhase - 0.12) / 0.4, 0, 1));

  return (
    <AbsoluteFill style={{ opacity: op, overflow: 'hidden', background: C.terra }}>
      {/* Map layer */}
      <AbsoluteFill style={{ opacity: mapOp }}>
        {mapSrc ? (
          <Img
            src={mapSrc}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${mapKb})`,
            }}
          />
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #eef2e8 0%, #e2ecdc 55%, #e8e4d4 100%)' }} />
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(250,249,245,0.5) 0%, rgba(250,249,245,0) 18%, rgba(250,249,245,0) 70%, rgba(250,249,245,0.55) 100%)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: 140,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: C.terra,
            opacity: clamp(mapPhase / 0.3, 0, 1),
          }}
        >
          Find it in {restaurant.location}
        </div>

        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '42%',
            transform: `translate(-50%,-50%) translateY(${pinY}px)`,
            opacity: drop,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <div
            style={{
              background: 'rgba(253,252,250,0.97)',
              border: `2px solid ${C.divider}`,
              borderRadius: 22,
              padding: '18px 24px',
              boxShadow: CARD_SHADOW,
              minWidth: 380,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 34, color: C.ink, letterSpacing: '-0.01em' }}>
                {restaurant.name}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontFamily: SANS,
                  fontWeight: 800,
                  fontSize: 28,
                  color: C.ink,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <Img src={icon('star-terra')} style={{ width: 26, height: 26 }} />
                {Number.isFinite(restaurant.rating) ? restaurant.rating.toFixed(1) : '—'}
              </span>
            </div>
            {review ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
                <Avatar init={review.init} tint={review.tint} tintInk={review.tintInk} size={36} />
                <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 20, color: C.ink2 }}>
                  {restaurant.circleLabel || 'Loved in your circle'}
                </span>
              </div>
            ) : null}
          </div>
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: '14px solid transparent',
              borderRight: '14px solid transparent',
              borderTop: '16px solid rgba(253,252,250,0.97)',
              marginTop: -2,
            }}
          />
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: C.terraDarker,
              border: `8px solid ${C.white}`,
              boxShadow: '0 6px 16px rgba(21,19,15,0.3)',
              marginTop: 14,
              boxSizing: 'border-box',
            }}
          />
        </div>

        {restaurant.address ? (
          <div
            style={{
              position: 'absolute',
              left: 56,
              right: 56,
              bottom: 140,
              background: C.paper,
              borderRadius: 24,
              border: `1px solid ${C.divider}`,
              boxShadow: CARD_SHADOW,
              padding: '22px 26px',
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              opacity: clamp((mapPhase - 0.35) / 0.35, 0, 1),
            }}
          >
            <Img src={icon('pin-terra')} style={{ width: 36, height: 36, flexShrink: 0 }} />
            <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 26, color: C.ink2, lineHeight: 1.3 }}>
              {restaurant.address}
            </div>
          </div>
        ) : null}
      </AbsoluteFill>

      {/* CTA content — outer fill is already terra; map fades away into it */}
      <AbsoluteFill
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: ctaPhase,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            padding: '0 72px',
            transform: `translateY(${(1 - ctaPhase) * 36}px)`,
          }}
        >
          <Img
            src={staticFile('logo_circle.png')}
            style={{
              width: 132,
              height: 132,
              borderRadius: '50%',
              boxShadow: '0 18px 40px rgba(21,19,15,0.25)',
              border: `5px solid ${C.white}`,
            }}
          />
          <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 72, color: C.white, marginTop: 36, lineHeight: 1.06 }}>
            {(cta.headlineLines || []).map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
          <div
            style={{
              fontFamily: SANS,
              fontWeight: 600,
              fontSize: 30,
              color: 'rgba(253,252,250,0.92)',
              marginTop: 20,
              lineHeight: 1.35,
              maxWidth: 820,
            }}
          >
            {(cta.subLines || []).join(' ')}
          </div>
          <div
            style={{
              marginTop: 48,
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
            {cta.button}
          </div>
          <div
            style={{
              marginTop: 28,
              fontFamily: SANS,
              fontWeight: 600,
              fontSize: 22,
              color: 'rgba(253,252,250,0.8)',
              opacity: clamp((ctaPhase - 0.45) / 0.35, 0, 1),
            }}
          >
            {cta.footer}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
