import React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import { C, SERIF, SANS, clamp, easeOutBack } from '../../../theme';
import { SCENE_DUR } from '../constants';
import { useScene, mediaSrc, SpotIndex } from '../sceneHelpers';

/** 4:5-leaning well, content-column width. Tall enough for plate photos,
 *  short enough that the consensus card still fits on a 9:16 still. */
const PHOTO_W = 800;
const PHOTO_H = 560;
const PHOTO_RADIUS = 32;

/**
 * @param {unknown} dishes
 * @returns {{ key: string, text: string }[]}
 */
function dishChips(dishes) {
  if (!Array.isArray(dishes)) return [];
  return dishes
    .map((item, i) => {
      if (typeof item === 'string') {
        const text = item.trim();
        return text ? { key: `${text}-${i}`, text } : null;
      }
      const label = String(item?.label || '').trim();
      if (!label) return null;
      const n = item.mentions;
      const text = Number(n) > 0 ? `${label} · ${n}` : label;
      return { key: `${label}-${i}`, text };
    })
    .filter(Boolean);
}

/**
 * @param {{ summary?: unknown, loves?: unknown, knows?: unknown, dishes?: unknown }} consensus
 */
function hasConsensusCard(consensus) {
  const loves = Array.isArray(consensus.loves) ? consensus.loves : [];
  const knows = Array.isArray(consensus.knows) ? consensus.knows : [];
  const dishes = dishChips(consensus.dishes);
  const summary = typeof consensus.summary === 'string' ? consensus.summary.trim() : '';
  return Boolean(summary || loves.length || knows.length || dishes.length);
}

/** Short two-word names stay on one line; long titles keep their wrap. */
function nameLinesForCard(nameLines, name) {
  const lines = (Array.isArray(nameLines) ? nameLines : [])
    .map((line) => String(line || '').trim())
    .filter(Boolean);
  const joined = (lines.length ? lines.join(' ') : String(name || '').trim()).replace(/\s+/g, ' ');
  if (!joined) return lines.length ? lines : [''];
  if (joined.length <= 24 && !joined.includes('|')) return [joined];
  return lines.length ? lines : [joined];
}

function SectionLabel({ children, color }) {
  return (
    <div
      style={{
        fontFamily: SANS,
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color,
        marginBottom: 8,
      }}
    >
      {children}
    </div>
  );
}

/** A still only has room for the highlights, not the full restaurant card. */
const STILL_LOVES = 3;
const STILL_KNOWS = 2;
const STILL_DISHES = 4;

function Bullet({ kind, text }) {
  const love = kind === 'love';
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: 999,
          flexShrink: 0,
          marginTop: 2,
          background: love ? C.greenBg : C.goldBg,
          color: love ? C.green : C.gold,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: SANS,
          fontWeight: 800,
          fontSize: 11,
        }}
      >
        {love ? '✓' : '!'}
      </div>
      <div
        style={{
          fontFamily: SANS,
          fontWeight: 500,
          fontSize: 17,
          lineHeight: 1.3,
          color: C.ink,
        }}
      >
        {text}
      </div>
    </div>
  );
}

function ConsensusColumn({ label, color, kind, items }) {
  if (!items.length) return null;
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <SectionLabel color={color}>{label}</SectionLabel>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((text) => (
          <Bullet key={text} kind={kind} text={text} />
        ))}
      </div>
    </div>
  );
}

/**
 * Inset paper card — highlights only, two columns. Not a stretched bottom sheet
 * dumping every ingest bullet.
 */
function ConsensusCard({ loves, knows, dishes, reviewCount }) {
  return (
    <div
      style={{
        margin: '12px auto 40px',
        width: PHOTO_W,
        background: C.paper,
        border: `1px solid ${C.hairline}`,
        borderRadius: 28,
        padding: '20px 24px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          fontFamily: SERIF,
          fontWeight: 700,
          fontSize: 26,
          letterSpacing: '-0.02em',
          color: C.ink,
          lineHeight: 1.15,
        }}
      >
        Consenso da comunidade
      </div>

      {loves.length || knows.length ? (
        <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start' }}>
          <ConsensusColumn label="O que adoram" color={C.green} kind="love" items={loves} />
          <ConsensusColumn label="A ter em conta" color={C.gold} kind="know" items={knows} />
        </div>
      ) : null}

      {dishes.length ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {dishes.map((dish) => (
            <span
              key={dish.key}
              style={{
                fontFamily: SANS,
                fontWeight: 600,
                fontSize: 15,
                color: C.terraDarker,
                background: C.terraLight,
                borderRadius: 999,
                padding: '5px 12px',
              }}
            >
              {dish.text}
            </span>
          ))}
        </div>
      ) : null}

      {reviewCount ? (
        <div
          style={{
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: 14,
            color: C.ink3,
          }}
        >
          Com base em {reviewCount} avaliações
        </div>
      ) : null}
    </div>
  );
}

function IdentityBlock({ locationLine, lines, tagline, rating }) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        {locationLine ? (
          <div
            style={{
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: C.terra,
              minWidth: 0,
            }}
          >
            {locationLine}
          </div>
        ) : (
          <div />
        )}
        {Number.isFinite(rating) ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              flexShrink: 0,
              background: C.paper,
              border: `1px solid ${C.hairline}`,
              borderRadius: 999,
              padding: '5px 12px',
              fontFamily: SANS,
              fontWeight: 800,
              fontSize: 20,
              color: C.ink,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <span style={{ color: C.gold }}>★</span>
            {Number(rating).toFixed(1)}
          </div>
        ) : null}
      </div>
      <div
        style={{
          marginTop: 8,
          fontFamily: SERIF,
          fontWeight: 700,
          fontSize: lines.length > 1 ? 40 : 48,
          lineHeight: 1.08,
          letterSpacing: '-0.02em',
          color: C.ink,
        }}
      >
        {lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
      {tagline ? (
        <div
          style={{
            marginTop: 6,
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: 18,
            color: C.ink2,
          }}
        >
          {tagline}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Restaurant photo. Cover fills a 4:5-leaning well; contain is used for
 * square wordmarks so the type isn't cropped. No drop shadow — DESIGN.md §15.
 */
function PhotoWell({ src, fit }) {
  const contain = fit === 'contain';
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        borderRadius: PHOTO_RADIUS,
        overflow: 'hidden',
        background: C.parchDeep,
        border: `1px solid ${C.hairline}`,
      }}
    >
      {src ? (
        <Img
          src={src}
          style={{
            width: '100%',
            height: '100%',
            objectFit: contain ? 'contain' : 'cover',
            objectPosition: contain ? 'center center' : '50% 42%',
            transform: contain ? 'scale(1.28)' : undefined,
            transformOrigin: 'center center',
          }}
        />
      ) : null}
    </div>
  );
}

/**
 * One list spot — photo + identity as one column, then community consensus.
 */
export const Scene2Spot = ({ place, index, total }) => {
  const { p, op } = useScene(SCENE_DUR.spot);
  const textE = easeOutBack(clamp((p - 0.12) / 0.3, 0, 1));
  const src = mediaSrc(place.photo);
  const lines = nameLinesForCard(place.nameLines, place.name);
  const locationLine = place.location || place.neighbourhood || '';
  const tagline = place.tagline || '';
  const rating = Number.isFinite(place.rating) ? place.rating : null;
  const consensus = place.consensus && typeof place.consensus === 'object' ? place.consensus : {};
  const loves = (Array.isArray(consensus.loves) ? consensus.loves : [])
    .map((s) => String(s).trim())
    .filter(Boolean)
    .slice(0, STILL_LOVES);
  const knows = (Array.isArray(consensus.knows) ? consensus.knows : [])
    .map((s) => String(s).trim())
    .filter(Boolean)
    .slice(0, STILL_KNOWS);
  const dishes = dishChips(consensus.dishes).slice(0, STILL_DISHES);
  const reviewCount = Number(consensus.reviewCount) > 0 ? Number(consensus.reviewCount) : null;
  const showCard = hasConsensusCard(consensus);
  const photoFit = place.photoFit === 'contain' ? 'contain' : 'cover';

  return (
    <AbsoluteFill
      style={{
        opacity: op,
        background: C.parch,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '44px 48px 0', flexShrink: 0 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            opacity: clamp(p / 0.25, 0, 1),
          }}
        >
          <SpotIndex n={index + 1} size={48} />
          <span
            style={{
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: 18,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: C.ink3,
            }}
          >
            {index + 1} de {total}
          </span>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          minHeight: PHOTO_H,
          width: PHOTO_W,
          margin: '18px auto 0',
        }}
      >
        <PhotoWell src={src} fit={photoFit} />
      </div>

      <div
        style={{
          width: PHOTO_W,
          margin: '16px auto 0',
          flexShrink: 0,
          transform: `translateY(${(1 - textE) * 12}px)`,
          opacity: clamp((p - 0.1) / 0.25, 0, 1),
        }}
      >
        <IdentityBlock locationLine={locationLine} lines={lines} tagline={tagline} rating={rating} />
      </div>

      {showCard ? (
        <ConsensusCard loves={loves} knows={knows} dishes={dishes} reviewCount={reviewCount} />
      ) : null}
    </AbsoluteFill>
  );
};
