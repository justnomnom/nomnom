import React from 'react';
import { interpolateColors } from 'remotion';
import { C, SANS, SERIF, clamp, lerp } from '../../../theme';
import { SCENE_DUR } from '../constants';
import { SceneBox, useScene, Avatar, NomStars, ParchmentWash } from '../sceneHelpers';

/**
 * One trusted voice — bold word-reveal quote (matches full reel craft).
 */
export const Scene3Review = ({ review, badgeText }) => {
  const { p, op, slide } = useScene(SCENE_DUR.review);
  const quoteWords = (review.quote || '').split(/\s+/).filter(Boolean);
  const wp = clamp((p - 0.16) / 0.55, 0, 1);
  const starP = clamp((p - 0.1) / 0.4, 0, 1);
  const cardS = lerp(0.97, 1, clamp(p / 0.35, 0, 1));

  return (
    <SceneBox op={op}>
      <ParchmentWash />
      <div
        style={{
          width: 920,
          transform: `translateY(${slide}px) scale(${cardS})`,
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
            marginBottom: 28,
            opacity: clamp(p / 0.2, 0, 1),
          }}
        >
          Someone you can trust
        </div>

        <div
          style={{
            background: C.paper,
            borderRadius: 36,
            boxShadow: '0 0 0 1px rgba(226,221,208,0.95), 0 24px 48px -18px rgba(21,19,15,0.18)',
            padding: '48px 48px 44px',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 20,
              right: 40,
              fontFamily: SERIF,
              fontWeight: 700,
              fontSize: 140,
              color: C.terraLight,
              lineHeight: 0.7,
              userSelect: 'none',
            }}
          >
            &rdquo;
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Avatar init={review.init} tint={review.tint} tintInk={review.tintInk} size={88} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
              <span
                style={{
                  fontFamily: SANS,
                  fontWeight: 800,
                  fontSize: 36,
                  color: C.ink,
                  letterSpacing: '-0.01em',
                }}
              >
                {review.name}
              </span>
              {badgeText ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignSelf: 'flex-start',
                    background: C.terraLight,
                    color: C.terraDarker,
                    borderRadius: 999,
                    padding: '7px 16px',
                    fontFamily: SANS,
                    fontWeight: 700,
                    fontSize: 20,
                  }}
                >
                  {badgeText}
                </span>
              ) : null}
            </div>
          </div>

          {Number.isFinite(review.score) ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 28 }}>
              <NomStars score={review.score} p={starP} size={34} />
              <span
                style={{
                  fontFamily: SANS,
                  fontWeight: 800,
                  fontSize: 34,
                  color: C.ink,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {(review.score * starP).toFixed(1)}
              </span>
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 24, color: C.ink3 }}>/ 5</span>
            </div>
          ) : null}

          <div
            style={{
              marginTop: 28,
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: 44,
              lineHeight: 1.2,
              letterSpacing: '-0.015em',
              textWrap: 'balance',
            }}
          >
            {quoteWords.map((w, i) => {
              const t = clamp(wp * quoteWords.length - i, 0, 1);
              return (
                <span
                  key={i}
                  style={{
                    opacity: lerp(0.14, 1, t),
                    color: interpolateColors(t, [0, 1], [C.ink3, C.ink]),
                  }}
                >
                  {w}
                  {i < quoteWords.length - 1 ? ' ' : ''}
                </span>
              );
            })}
          </div>

          {review.dish ? (
            <div
              style={{
                marginTop: 32,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                border: '1px solid rgba(255,107,53,0.35)',
                color: C.terraDarker,
                borderRadius: 999,
                padding: '10px 18px',
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: 22,
                opacity: clamp((p - 0.55) / 0.25, 0, 1),
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 8, background: C.terra }} />
              Ordered · {review.dish}
            </div>
          ) : null}
        </div>
      </div>
    </SceneBox>
  );
};
