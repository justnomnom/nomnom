// NomNom — "Spots people you trust love" reviews reel (1080×1920, 9:16).
// Ported from remotion/design-source/reel.jsx (Claude Design import).
// All motion is driven by useCurrentFrame(); scene windows use <Sequence>.
import React from 'react';
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolateColors,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { C, SANS, SERIF, MONO, CARD_SHADOW, clamp, easeOutCubic, easeOutBack, lerp } from './theme';
import { buildTimeline } from './timeline';

const icon = (name) => staticFile(`icons/${name}.svg`);

// ── Scene envelope: same fade/slide as the design's seg() helper ─────────────
const useScene = (dur) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame / fps;
  const p = clamp(local / dur, 0, 1);
  const fin = 0.42;
  const fout = 0.4;
  let op = 1;
  let slide = 0;
  if (local < fin) {
    const t = easeOutCubic(clamp(local / fin, 0, 1));
    op = t;
    slide = (1 - t) * 34;
  } else if (local > dur - fout) {
    const t = clamp((local - (dur - fout)) / fout, 0, 1);
    op = 1 - t;
    slide = -t * 22;
  }
  return { p, op, slide, local };
};

const SceneBox = ({ children, op, bg }) => (
  <AbsoluteFill
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: op,
      background: bg || 'transparent',
    }}
  >
    {children}
  </AbsoluteFill>
);

// ── Star / nom-meter row (gold, out of 5, fills with progress) ───────────────
const Star = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
    <path fill={color} d="M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.3l-5.8 3.05 1.11-6.46-4.7-4.58 6.49-.94z" />
  </svg>
);

// score is on the app's 0–5 scale; each unit fills one of the 5 stars.
export const NomStars = ({ score, p, size = 30 }) => {
  const filled = clamp(score, 0, 5) * clamp(p, 0, 1);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {[0, 1, 2, 3, 4].map((i) => {
        const f = clamp(filled - i, 0, 1);
        return (
          <div key={i} style={{ position: 'relative', width: size, height: size }}>
            <Star size={size} color={C.hairline} />
            <div style={{ position: 'absolute', inset: 0, width: `${f * 100}%`, overflow: 'hidden' }}>
              <Star size={size} color={C.gold} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const Avatar = ({ init, tint, tintInk, size = 88, ring }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: tint,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: SANS,
      fontWeight: 800,
      fontSize: size * 0.36,
      color: tintInk,
      flexShrink: 0,
      boxShadow: ring ? `0 0 0 4px ${C.bg}, 0 0 0 6px ${C.terra}` : 'none',
      letterSpacing: '0.01em',
    }}
  >
    {init}
  </div>
);

// Big dish tile — food photo if provided, emoji fallback otherwise
const DishTile = ({ emoji, label, photo, w = 620, h = 360, p = 1 }) => {
  const kb = lerp(1, 1.06, easeOutCubic(clamp(p, 0, 1))); // ken-burns drift
  const s = lerp(0.92, 1, easeOutCubic(clamp(p / 0.5, 0, 1)));
  const photoSrc = photo ? (photo.startsWith('http') ? photo : staticFile(photo)) : null;
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: 36,
        overflow: 'hidden',
        flexShrink: 0,
        background: `radial-gradient(120% 120% at 30% 20%, ${C.parch} 0%, ${C.parchDeep} 100%)`,
        boxShadow: '0 0 0 1px rgba(226,221,208,0.95), 0 24px 40px -18px rgba(21,19,15,0.22)',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${kb})`, transformOrigin: '50% 50%' }}>
        {photoSrc ? (
          <Img src={photoSrc} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Img
              src={icon(emoji)}
              style={{
                width: h * 0.52,
                height: h * 0.52,
                transform: `scale(${s}) rotate(-6deg)`,
                filter: 'drop-shadow(0 16px 22px rgba(21,19,15,0.18))',
              }}
            />
          </div>
        )}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 22,
          top: 20,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          zIndex: 2,
          background: 'rgba(253,252,250,0.92)',
          borderRadius: 999,
          padding: '9px 18px',
          boxShadow: '0 1px 2px rgba(21,19,15,0.08)',
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: 24,
          color: C.ink,
        }}
      >
        <span style={{ width: 9, height: 9, borderRadius: 9, background: C.terra }} />
        {label}
      </div>
    </div>
  );
};

// ── Scenes ───────────────────────────────────────────────────────────────────
const Hook = ({ dur, overline, lines }) => {
  const { p, op, slide } = useScene(dur);
  return (
    <SceneBox op={op} bg={C.ink}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(120% 80% at 50% 32%, rgba(255,107,53,0.26) 0%, rgba(21,19,15,0) 58%)',
        }}
      />
      <div
        style={{
          transform: `translateY(${slide}px)`,
          padding: '0 80px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: 24,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: C.terra,
            marginBottom: 40,
          }}
        >
          {overline}
        </div>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 106, lineHeight: 1.04, letterSpacing: '-0.01em' }}>
          {lines.map((l, i) => {
            const r = clamp((p - (0.06 + i * 0.13)) / 0.2, 0, 1);
            const e = easeOutBack(r);
            return (
              <div
                key={i}
                style={{
                  opacity: r,
                  transform: `translateY(${(1 - e) * 44}px) scale(${0.9 + e * 0.1})`,
                  color: i === lines.length - 1 ? C.terra : C.white,
                }}
              >
                {l}
              </div>
            );
          })}
        </div>
      </div>
    </SceneBox>
  );
};

const Intro = ({ dur, restaurant, chips }) => {
  const { p, op, slide } = useScene(dur);
  const logoS = easeOutBack(clamp(p / 0.34, 0, 1));
  return (
    <SceneBox op={op}>
      <div
        style={{
          transform: `translateY(${slide}px)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 70px',
        }}
      >
        <Img
          src={staticFile('logo_circle.png')}
          style={{
            width: 168,
            height: 168,
            borderRadius: '50%',
            transform: `scale(${logoS})`,
            boxShadow: '0 24px 50px -16px rgba(255,107,53,0.45)',
          }}
        />
        <div
          style={{
            marginTop: 44,
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: 23,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: C.terra,
          }}
        >
          What real diners are saying
        </div>
        <div
          style={{
            fontFamily: SERIF,
            fontWeight: 700,
            fontSize: 110,
            color: C.ink,
            lineHeight: 1.04,
            marginTop: 22,
            letterSpacing: '-0.01em',
          }}
        >
          {restaurant.nameLines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 30, color: C.ink2, marginTop: 26 }}>
          {restaurant.tagline}
        </div>
        <div style={{ display: 'flex', gap: 14, marginTop: 40 }}>
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
                padding: '13px 22px',
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: 25,
                color: C.ink,
              }}
            >
              <Img src={icon(emoji)} style={{ width: 28, height: 28 }} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </SceneBox>
  );
};

const Review = ({ dur, r, badgeText }) => {
  const { p, op, slide } = useScene(dur);
  const quoteWords = r.quote.split(' ');
  const wp = clamp((p - 0.18) / 0.5, 0, 1); // word reveal progress
  const starP = clamp((p - 0.12) / 0.42, 0, 1); // nom-meter fill progress
  const hasScore = Number.isFinite(r.score);
  return (
    <SceneBox op={op}>
      <div
        style={{
          width: 920,
          transform: `translateY(${slide}px)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: 23,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: C.terra,
            marginBottom: 26,
          }}
        >
          A review from someone you trust
        </div>
        <DishTile emoji={r.emoji} label={r.dish} photo={r.photo} p={p} />
        <div
          style={{
            width: '100%',
            marginTop: -28,
            background: C.paper,
            borderRadius: 40,
            boxShadow: '0 0 0 1px rgba(226,221,208,0.95), 0 20px 44px -16px rgba(21,19,15,0.18)',
            padding: '54px 52px 48px',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 28,
              right: 44,
              fontFamily: SERIF,
              fontWeight: 700,
              fontSize: 150,
              color: C.terraLight,
              lineHeight: 0.7,
              userSelect: 'none',
            }}
          >
            &rdquo;
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <Avatar init={r.init} tint={r.tint} tintInk={r.tintInk} size={96} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
              <span
                style={{
                  fontFamily: SANS,
                  fontWeight: 800,
                  fontSize: 40,
                  color: C.ink,
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap',
                }}
              >
                {r.name}
              </span>
              {r.follows ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 9,
                    background: C.terraLight,
                    color: C.terraDarker,
                    borderRadius: 999,
                    padding: '8px 18px',
                    fontFamily: SANS,
                    fontWeight: 700,
                    fontSize: 22,
                    alignSelf: 'flex-start',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l2.2 6.6H21l-5.4 4 2.1 6.6L12 15.6 6.3 19.2l2.1-6.6L3 8.6h6.8z" />
                  </svg>
                  {badgeText}
                </span>
              ) : (
                <span style={{ fontFamily: MONO, fontWeight: 500, fontSize: 23, color: C.ink2 }}>{r.handle}</span>
              )}
            </div>
          </div>
          {/* reviewer's Nom-meter rating — from the review's `score` variable (0–10) */}
          {hasScore && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 26 }}>
              <NomStars score={r.score} p={starP} size={36} />
              <span
                style={{
                  fontFamily: SANS,
                  fontWeight: 800,
                  fontSize: 36,
                  color: C.ink,
                  letterSpacing: '-0.01em',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {(r.score * starP).toFixed(1)}
              </span>
              <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 26, color: C.ink3 }}>/ 5</span>
            </div>
          )}
          <div
            style={{
              marginTop: 30,
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: 52,
              lineHeight: 1.18,
              letterSpacing: '-0.015em',
              textWrap: 'balance',
            }}
          >
            {quoteWords.map((w, i) => {
              // frame-driven word reveal (design used a CSS transition here)
              const t = clamp(wp * quoteWords.length - i, 0, 1);
              return (
                <span
                  key={i}
                  style={{
                    opacity: lerp(0.16, 1, t),
                    color: interpolateColors(t, [0, 1], [C.ink3, C.ink]),
                  }}
                >
                  {w}
                  {i < quoteWords.length - 1 ? ' ' : ''}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </SceneBox>
  );
};

const Aggregate = ({ dur, restaurant, consensus }) => {
  const { p, op, slide } = useScene(dur);
  const rateP = clamp((p - 0.16) / 0.4, 0, 1);
  const chipS = easeOutBack(clamp((p - 0.12) / 0.32, 0, 1));
  const cardS = lerp(0.96, 1, easeOutCubic(clamp(p / 0.4, 0, 1)));
  const rev = (order) => clamp((p - (0.18 + order * 0.05)) / 0.3, 0, 1);
  const Item = ({ iconName, text, order }) => {
    const r = rev(order);
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 16,
          marginBottom: 14,
          opacity: r,
          transform: `translateY(${(1 - r) * 10}px)`,
        }}
      >
        <Img src={icon(iconName)} style={{ width: 34, height: 34, flexShrink: 0, marginTop: 3 }} />
        <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 31, color: C.ink, lineHeight: 1.4 }}>{text}</span>
      </div>
    );
  };
  return (
    <SceneBox op={op}>
      <div style={{ transform: `translateY(${slide}px)`, width: 920, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span
            style={{
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: 52,
              color: C.ink,
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap',
            }}
          >
            {restaurant.name}
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255,107,53,0.10)',
              color: C.terra,
              padding: '8px 18px',
              borderRadius: 16,
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: 34,
              fontVariantNumeric: 'tabular-nums',
              transform: `scale(${chipS})`,
              transformOrigin: 'left center',
            }}
          >
            <Img src={icon('star-terra')} style={{ width: 32, height: 32 }} />
            {(restaurant.rating * rateP).toFixed(1)}
          </span>
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 28, color: C.ink2, marginTop: 10 }}>
          {restaurant.tagline}
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 38, color: C.ink, letterSpacing: '-0.01em', margin: '34px 0 18px' }}>
          Community consensus
        </div>
        <div
          style={{
            transform: `scale(${cardS})`,
            transformOrigin: 'top center',
            borderRadius: 28,
            padding: '34px 36px',
            border: `1px solid ${C.divider}`,
            background: C.paper,
            boxShadow: '0 1px 3px rgba(21,19,15,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
          }}
        >
          <div style={{ fontFamily: SANS, fontStyle: 'italic', fontWeight: 400, fontSize: 33, color: C.ink2, lineHeight: 1.5 }}>
            &ldquo;{consensus.quote}&rdquo;
          </div>
          {consensus.loves?.length > 0 && (
            <div>
              <span
                style={{
                  display: 'block',
                  fontFamily: SANS,
                  fontWeight: 700,
                  fontSize: 24,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: C.green,
                  marginBottom: 14,
                }}
              >
                What people love
              </span>
              {consensus.loves.map((x, i) => (
                <Item key={i} iconName="check-green" text={x} order={i + 1} />
              ))}
            </div>
          )}
          {consensus.knows?.length > 0 && (
            <div>
              <span
                style={{
                  display: 'block',
                  fontFamily: SANS,
                  fontWeight: 700,
                  fontSize: 24,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: C.gold,
                  marginBottom: 14,
                }}
              >
                Things to know
              </span>
              {consensus.knows.map((x, i) => (
                <Item key={i} iconName="warn-gold" text={x} order={i + 1 + (consensus.loves?.length ?? 0)} />
              ))}
            </div>
          )}
          {consensus.dishes?.length > 0 && (
          <div>
            <span
              style={{
                display: 'block',
                fontFamily: SANS,
                fontWeight: 700,
                fontSize: 24,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: C.ink2,
                marginBottom: 14,
              }}
            >
              Dishes mentioned
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {consensus.dishes.map((entry, i) => {
                const [label, nn] = Array.isArray(entry) ? entry : [entry, null];
                return (
                  <span
                    key={i}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      height: 50,
                      padding: '0 20px',
                      borderRadius: 999,
                      border: '1px solid rgba(255,107,53,0.4)',
                      color: C.terraDarker,
                      fontFamily: SANS,
                      fontWeight: 600,
                      fontSize: 26,
                      fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {nn != null ? `${label} · ${nn}` : label}
                  </span>
                );
              })}
            </div>
          </div>
          )}
          {consensus.reviewCount != null && (
            <div style={{ fontFamily: SANS, fontStyle: 'italic', fontSize: 25, color: C.ink3 }}>
              Based on {consensus.reviewCount} reviews from people you trust
            </div>
          )}
        </div>
      </div>
    </SceneBox>
  );
};

const MapView = ({ dur, restaurant, reviews }) => {
  const { p, op } = useScene(dur);
  const drop = easeOutBack(clamp((p - 0.1) / 0.5, 0, 1));
  const pinY = (1 - drop) * -140;
  const rateP = clamp((p - 0.25) / 0.4, 0, 1);
  const ringT = (clamp((p - 0.3) / 0.7, 0, 1) * 2) % 1;
  const ring = { scale: 0.7 + ringT * 1.7, op: (1 - ringT) * 0.45 };
  const proof = reviews.slice(0, 3).map((r) => ({ init: r.init, tint: r.tint, ink: r.tintInk }));
  const mapKb = lerp(1.08, 1, easeOutCubic(clamp(p / 0.7, 0, 1))); // slow settle onto the location
  return (
    <AbsoluteFill style={{ opacity: op, overflow: 'hidden' }}>
      {restaurant.mapImage ? (
        <>
          {/* real map image (Mapbox streets-v12, matching the in-app dashboard map) */}
          <Img
            src={staticFile(restaurant.mapImage)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${mapKb})` }}
          />
          {/* subtle top + bottom scrims so the overline and address card stay legible
              over live streets, without washing out the map's color */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(250,249,245,0.55) 0%, rgba(250,249,245,0) 16%, rgba(250,249,245,0) 78%, rgba(250,249,245,0.6) 100%)' }} />
        </>
      ) : (
        <>
          {/* stylized map fallback (no coordinates / no Mapbox token) */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #eef2e8 0%, #e2ecdc 55%, #e8e4d4 100%)' }} />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'linear-gradient(rgba(150,160,140,0.16) 2px, transparent 2px), linear-gradient(90deg, rgba(150,160,140,0.16) 2px, transparent 2px)',
              backgroundSize: '96px 96px',
            }}
          />
          <div style={{ position: 'absolute', right: -160, top: -160, width: 520, height: 520, borderRadius: '46% 54% 50% 50%', background: 'rgba(150,190,205,0.35)' }} />
          <div style={{ position: 'absolute', left: -120, bottom: 240, width: 380, height: 320, borderRadius: '50%', background: 'rgba(170,200,150,0.34)' }} />
          <div style={{ position: 'absolute', left: '-10%', right: '-10%', top: '52%', height: 40, background: 'rgba(253,252,250,0.72)', transform: 'rotate(-7deg)', boxShadow: '0 0 0 1px rgba(150,160,140,0.18)' }} />
          <div style={{ position: 'absolute', top: '-10%', bottom: '-10%', left: '60%', width: 30, background: 'rgba(253,252,250,0.62)', transform: 'rotate(4deg)' }} />
          <div style={{ position: 'absolute', left: '-10%', right: '-10%', top: '28%', height: 18, background: 'rgba(253,252,250,0.5)', transform: 'rotate(5deg)' }} />
        </>
      )}

      <div
        style={{
          position: 'absolute',
          top: 150,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: 23,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: C.terra,
        }}
      >
        Find it in {restaurant.location}
      </div>

      {/* pin */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '44%',
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
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            minWidth: 360,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
            <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 38, color: C.ink, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
              {restaurant.name}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: SANS,
                fontWeight: 800,
                fontSize: 32,
                color: C.ink,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <Img src={icon('star-terra')} style={{ width: 28, height: 28 }} />
              {(restaurant.rating * rateP).toFixed(1)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex' }}>
              {proof.map((a, i) => (
                <div key={i} style={{ marginLeft: i ? -10 : 0, zIndex: 5 - i, borderRadius: '50%', boxShadow: '0 0 0 3px #fdfcfa' }}>
                  <Avatar init={a.init} tint={a.tint} tintInk={a.ink} size={38} />
                </div>
              ))}
            </div>
            <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 22, color: C.ink2 }}>
              {restaurant.circleLabel ?? 'Saved by your circle'} {restaurant.savedBy}
            </span>
          </div>
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
        <div style={{ position: 'relative', width: 72, height: 72, marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            style={{
              position: 'absolute',
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'rgba(184,72,31,0.20)',
              transform: `scale(${ring.scale})`,
              opacity: ring.op,
            }}
          />
          <div style={{ position: 'absolute', width: 150, height: 150, borderRadius: '50%', background: 'rgba(184,72,31,0.12)' }} />
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: C.terraDarker,
              border: '9px solid #fff',
              boxShadow: '0 6px 16px rgba(21,19,15,0.3)',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* address card */}
      <div
        style={{
          position: 'absolute',
          left: 56,
          right: 56,
          bottom: 130,
          background: C.paper,
          borderRadius: 28,
          border: `1px solid ${C.divider}`,
          boxShadow: CARD_SHADOW,
          padding: '28px 30px',
          display: 'flex',
          alignItems: 'center',
          gap: 22,
        }}
      >
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: '50%',
            flexShrink: 0,
            background: 'rgba(255,107,53,0.06)',
            border: '1px solid rgba(255,107,53,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Img src={icon('pin-terra')} style={{ width: 44, height: 44 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 24, color: C.ink }}>Address</div>
          <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 28, color: C.ink2, marginTop: 4 }}>{restaurant.address}</div>
        </div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            background: C.terra,
            color: '#fff',
            borderRadius: 18,
            padding: '20px 26px',
            fontFamily: SANS,
            fontWeight: 800,
            fontStyle: 'italic',
            fontSize: 22,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            boxShadow: '0 12px 24px -6px rgba(255,107,53,0.4)',
            flexShrink: 0,
          }}
        >
          <Img src={icon('pin-white')} style={{ width: 26, height: 26 }} />
          Maps
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Cta = ({ dur, cta }) => {
  const { p, op, slide } = useScene(dur);
  const btnS = easeOutBack(clamp((p - 0.2) / 0.4, 0, 1));
  return (
    <SceneBox op={op} bg={C.terra}>
      <div
        style={{
          transform: `translateY(${slide}px)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 80px',
        }}
      >
        <Img
          src={staticFile('logo_circle.png')}
          style={{
            width: 150,
            height: 150,
            borderRadius: '50%',
            boxShadow: '0 18px 40px rgba(21,19,15,0.25)',
            border: '5px solid rgba(255,255,255,0.85)',
          }}
        />
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 80, color: C.white, marginTop: 40, lineHeight: 1.06 }}>
          {cta.headlineLines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 32, color: 'rgba(253,252,250,0.92)', marginTop: 22, lineHeight: 1.4 }}>
          {cta.subLines.map((l, i) => (
            <div key={i}>{l}</div>
          ))}
        </div>
        <div
          style={{
            marginTop: 56,
            transform: `scale(${btnS})`,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 16,
            background: C.white,
            color: C.terraDark,
            borderRadius: 999,
            padding: '26px 52px',
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 40,
            boxShadow: '0 16px 30px rgba(21,19,15,0.22)',
            whiteSpace: 'nowrap',
          }}
        >
          <svg width="38" height="38" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h12a1 1 0 011 1v15l-7-4-7 4V5a1 1 0 011-1z" />
          </svg>
          {cta.button}
        </div>
        <div style={{ marginTop: 40, fontFamily: SANS, fontWeight: 700, fontSize: 30, color: C.white, letterSpacing: '0.02em' }}>
          {cta.footer}
        </div>
      </div>
    </SceneBox>
  );
};

// Slim progress bar, hidden during the closing CTA
const Progress = ({ ctaStartFrame }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  if (frame >= ctaStartFrame) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, background: 'rgba(110,102,87,0.14)' }}>
        <div style={{ width: `${clamp(frame / durationInFrames, 0, 1) * 100}%`, height: '100%', background: C.terra }} />
      </div>
    </div>
  );
};

// ── Root composition ─────────────────────────────────────────────────────────
export const RestaurantReviewsReel = (props) => {
  const { fps } = useVideoConfig();
  const { items } = buildTimeline(props.reviews.length);
  const cta = items.find((s) => s.id === 'cta');

  const renderScene = (sc) => {
    if (sc.id === 'hook') return <Hook dur={sc.dur} overline={props.hookOverline} lines={props.hookLines} />;
    if (sc.id === 'intro') return <Intro dur={sc.dur} restaurant={props.restaurant} chips={props.chips} />;
    if (sc.id.startsWith('review-')) {
      const i = Number(sc.id.split('-')[1]);
      return <Review dur={sc.dur} r={props.reviews[i]} badgeText={props.badgeText} />;
    }
    if (sc.id === 'agg') return <Aggregate dur={sc.dur} restaurant={props.restaurant} consensus={props.consensus} />;
    if (sc.id === 'map') return <MapView dur={sc.dur} restaurant={props.restaurant} reviews={props.reviews} />;
    if (sc.id === 'cta') return <Cta dur={sc.dur} cta={props.cta} />;
    return null;
  };

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden', fontFamily: SANS }}>
      {/* soft warm vignette */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(130% 90% at 50% 8%, rgba(255,107,53,0.06) 0%, rgba(255,107,53,0) 46%)',
        }}
      />
      {items.map((sc) => (
        <Sequence key={sc.id} name={sc.id} from={Math.round(sc.start * fps)} durationInFrames={Math.round(sc.dur * fps)}>
          {renderScene(sc)}
        </Sequence>
      ))}
      <Progress ctaStartFrame={Math.round(cta.start * fps)} />
    </AbsoluteFill>
  );
};
