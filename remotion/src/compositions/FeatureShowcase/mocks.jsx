import React from 'react';
import { Img, staticFile } from 'remotion';
import { C, MONO, SANS, CARD_SHADOW, clamp, easeOutBack, easeOutCubic, lerp } from '../../theme';

const MAP_STREETS = staticFile('maps/lisboa-streets.png');

const chip = (label, bg, ink, extra) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      height: 48,
      padding: '0 18px',
      borderRadius: 999,
      background: bg,
      color: ink,
      fontFamily: SANS,
      fontWeight: 800,
      fontSize: 22,
      border: `1px solid ${ink}22`,
      ...extra,
    }}
  >
    {label}
  </span>
);

const avatar = (init, bg, ink, size, extra) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: bg,
      color: ink,
      fontFamily: SANS,
      fontWeight: 800,
      fontSize: size * 0.34,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `3px solid ${C.paper}`,
      flexShrink: 0,
      ...extra,
    }}
  >
    {init}
  </div>
);

const rowCard = ({ children, tilt = 0, delayP, p }) => {
  const show = easeOutBack(clamp((p - delayP) / 0.28, 0, 1));
  return (
    <div
      style={{
        background: C.paper,
        border: `1px solid ${C.hairline}`,
        borderRadius: 24,
        boxShadow: CARD_SHADOW,
        padding: '18px 20px',
        transform: `rotate(${tilt}deg) translateY(${(1 - show) * 18}px)`,
        opacity: show,
      }}
    >
      {children}
    </div>
  );
};

/** Feed: people you follow + vibe chips. No restaurant names. */
export const FeedMock = ({ p }) => {
  const chipsP = clamp((p - 0.12) / 0.4, 0, 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, height: '100%' }}>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 20, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.ink3 }}>
        Descobrir
      </div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {avatar('A', C.terraLight, C.terraDarker, 72, { marginLeft: 0, zIndex: 3 })}
        {avatar('M', '#FCE7C8', '#B45309', 72, { marginLeft: -16, zIndex: 2 })}
        {avatar('T', '#E8F5E9', '#2E7D32', 72, { marginLeft: -16, zIndex: 1 })}
        <div style={{ marginLeft: 16, fontFamily: SANS, fontWeight: 700, fontSize: 24, color: C.ink2 }}>
          A seguir
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', opacity: chipsP, transform: `translateY(${(1 - chipsP) * 12}px)` }}>
        {chip('Jantar a dois', 'rgba(239,68,68,0.10)', '#B91C1C', { transform: 'rotate(-2deg)' })}
        {chip('Amigos', 'rgba(59,130,246,0.10)', '#1D4ED8', { transform: 'rotate(1.5deg)' })}
        {chip('Económico', C.greenBg, '#047857', { transform: 'rotate(-1deg)' })}
      </div>
      <div
        style={{
          marginTop: 'auto',
          background: C.parch,
          borderRadius: 24,
          padding: 24,
          border: `1px solid ${C.hairline}`,
          opacity: clamp((p - 0.35) / 0.3, 0, 1),
        }}
      >
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 28, color: C.ink }}>O teu feed, as tuas pessoas</div>
        <div style={{ marginTop: 8, fontFamily: SANS, fontWeight: 600, fontSize: 22, color: C.ink2, lineHeight: 1.35 }}>
          Vê onde comem mesmo, com as fotos e notas deles.
        </div>
      </div>
    </div>
  );
};

/** Lists: follow / following rows, matching landing illustration labels without fake handles. */
export const ListsMock = ({ p }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 22, height: '100%' }}>
    <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 20, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.ink3 }}>
      Listas
    </div>
    {rowCard({
      p,
      delayP: 0.08,
      tilt: -1,
      children: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 16, background: C.terraLight, color: C.terraDarker, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
            ⌘
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 28, color: C.ink }}>Imperdíveis de Lisboa</div>
            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 20, color: C.ink2 }}>por bairro, ocasião ou cozinha</div>
          </div>
          <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 20, color: C.white, background: C.terra, borderRadius: 999, padding: '8px 16px' }}>
            A seguir
          </span>
        </div>
      ),
    })}
    {rowCard({
      p,
      delayP: 0.22,
      tilt: 0.8,
      children: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 16, background: C.parchDeep, color: C.ink2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
            +
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 28, color: C.ink }}>Escolhas do Porto</div>
            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 20, color: C.ink2 }}>Guarda qualquer sítio</div>
          </div>
          <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 20, color: C.terraDarker, background: C.terraLight, borderRadius: 999, padding: '8px 16px' }}>
            Seguir
          </span>
        </div>
      ),
    })}
  </div>
);

/** Circle pin — same language as dashboard-map-canvas (not the landing teardrop). */
const MapDot = ({ size, selected, follow, show }) => {
  const halo = selected ? 0.28 + 0.16 * Math.sin(show * Math.PI * 2) : 0;
  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        transform: `scale(${show})`,
        opacity: show,
      }}
    >
      {selected ? (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: size * 2.1,
            height: size * 2.1,
            marginLeft: -size * 1.05,
            marginTop: -size * 1.05,
            borderRadius: '50%',
            background: `rgba(184,72,31,${0.18 + halo * 0.2})`,
          }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: selected ? C.terra : C.terraDarker,
          border: `${selected ? 3.5 : 2.5}px solid ${C.white}`,
          boxShadow: '0 6px 14px -6px rgba(21,19,15,0.45)',
        }}
      />
      {follow ? (
        <div
          style={{
            position: 'absolute',
            right: -10,
            bottom: -10,
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: follow === 'A' ? C.terraLight : '#FCE7C8',
            color: follow === 'A' ? C.terraDarker : '#B45309',
            border: `3px solid ${C.paper}`,
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {follow}
        </div>
      ) : null}
    </div>
  );
};

const SearchGlyph = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="11" cy="11" r="6.5" stroke={C.ink3} strokeWidth="2" />
    <path d="M16 16.5L20 20.5" stroke={C.ink3} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const LocateGlyph = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
    <circle cx="12" cy="12" r="3.2" fill={C.terra} />
    <circle cx="12" cy="12" r="7" stroke={C.terraDarker} strokeWidth="1.8" />
    <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21" stroke={C.terraDarker} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

/**
 * Full-bleed map screen: Mapbox streets-v12 (same style as dashboard-map-canvas), circle pins, glass search,
 * filter chips, geolocate, nearby sheet. Copy is verbatim from pt.json.
 * No venue names, ratings, or counts.
 */
export const MapMock = ({ p }) => {
  const pan = lerp(18, 0, easeOutCubic(clamp(p / 0.4, 0, 1)));
  const zoom = lerp(1.08, 1, easeOutCubic(clamp(p / 0.45, 0, 1)));
  const chrome = clamp(p / 0.16, 0, 1);
  const sheet = easeOutCubic(clamp((p - 0.18) / 0.22, 0, 1));
  const pins = [
    { left: '28%', top: '32%', delay: 0.04, selected: false, follow: 'A', size: 22 },
    { left: '48%', top: '40%', delay: 0.08, selected: true, follow: null, size: 32 },
    { left: '66%', top: '30%', delay: 0.1, selected: false, follow: 'M', size: 22 },
    { left: '36%', top: '48%', delay: 0.12, selected: false, follow: null, size: 20 },
    { left: '70%', top: '46%', delay: 0.14, selected: false, follow: null, size: 20 },
    { left: '52%', top: '54%', delay: 0.16, selected: false, follow: null, size: 18 },
    { left: '22%', top: '52%', delay: 0.18, selected: false, follow: null, size: 18 },
  ];

  return (
    <div style={{ height: '100%', position: 'relative', overflow: 'hidden', background: C.parch }}>
      <div
        style={{
          position: 'absolute',
          inset: '-10%',
          transform: `translate(${pan}px, ${pan * 0.35}px) scale(${zoom})`,
          transformOrigin: '48% 40%',
        }}
      >
        <Img
          src={MAP_STREETS}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 38%' }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          left: '47%',
          top: '42%',
          width: 18,
          height: 18,
          marginLeft: -9,
          marginTop: -9,
          borderRadius: '50%',
          background: C.ink,
          border: `4px solid ${C.terraLight}`,
          boxShadow: `0 0 0 10px rgba(255,107,53,0.16)`,
          opacity: chrome,
        }}
      />

      {pins.map((pin, i) => {
        const show = easeOutBack(clamp((p - pin.delay) / 0.2, 0, 1));
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: pin.left,
              top: pin.top,
              transform: 'translate(-50%, -50%)',
              zIndex: pin.selected ? 4 : 2,
            }}
          >
            <MapDot size={pin.size} selected={pin.selected} follow={pin.follow} show={show} />
          </div>
        );
      })}

      <div
        style={{
          position: 'absolute',
          top: 18,
          left: 16,
          right: 16,
          opacity: chrome,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div
          style={{
            height: 56,
            borderRadius: 999,
            background: 'rgba(253,252,250,0.94)',
            border: `1px solid ${C.hairline}`,
            boxShadow: CARD_SHADOW,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '0 20px',
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: 22,
            color: C.ink3,
          }}
        >
          <SearchGlyph />
          Pesquisar sítios ou zonas…
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {chip('Seguidos', C.terra, C.white, { height: 40, fontSize: 18, border: 'none' })}
          {chip('Os meus', C.paper, C.ink2, { height: 40, fontSize: 18, background: 'rgba(253,252,250,0.94)', border: `1px solid ${C.hairline}` })}
          {chip('Mais…', C.paper, C.ink2, { height: 40, fontSize: 18, background: 'rgba(253,252,250,0.94)', border: `1px solid ${C.hairline}` })}
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          top: 168,
          right: 16,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: C.paper,
          border: `1px solid ${C.hairline}`,
          boxShadow: CARD_SHADOW,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: chrome,
        }}
      >
        <LocateGlyph />
      </div>

      <div
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 12,
          background: C.paper,
          borderRadius: 28,
          padding: '14px 20px 20px',
          boxShadow: CARD_SHADOW,
          opacity: sheet,
          transform: `translateY(${(1 - sheet) * 40}px)`,
        }}
      >
        <div style={{ width: 48, height: 5, borderRadius: 999, background: C.hairline, margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 26, color: C.ink }}>Sítios perto de ti</div>
          <div style={{ display: 'flex' }}>
            {avatar('A', C.terraLight, C.terraDarker, 36, { zIndex: 2 })}
            {avatar('M', '#FCE7C8', '#B45309', 36, { marginLeft: -10, zIndex: 1 })}
          </div>
        </div>
        <div
          style={{
            marginTop: 16,
            background: C.terra,
            color: C.white,
            fontFamily: SANS,
            fontWeight: 800,
            fontSize: 20,
            padding: '14px 18px',
            borderRadius: 999,
            textAlign: 'center',
          }}
        >
          Guardar na lista
        </div>
      </div>
    </div>
  );
};

/** Roulette: shake then reveal a generic pick — no restaurant name. */
export const RouletteMock = ({ p }) => {
  const shaking = p < 0.48;
  const shakeT = shaking ? (1 - p / 0.48) : 0;
  const rot = shaking ? Math.sin(p * 42) * 9 * shakeT : lerp(-8, 0, easeOutBack(clamp((p - 0.48) / 0.28, 0, 1)));
  const reveal = easeOutCubic(clamp((p - 0.5) / 0.3, 0, 1));
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 28 }}>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 20, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.ink3 }}>
        Sem ideias?
      </div>
      <div
        style={{
          width: 520,
          height: 520,
          borderRadius: 36,
          background: C.paper,
          border: `1px solid ${C.hairline}`,
          boxShadow: CARD_SHADOW,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `rotate(${rot}deg)`,
          padding: 36,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: '50%',
            background: C.terraLight,
            color: C.terraDarker,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 40,
            fontWeight: 800,
            fontFamily: SANS,
            marginBottom: 20,
          }}
        >
          N
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 36, color: C.ink }}>
          {shaking ? 'A girar…' : 'A tua escolha'}
        </div>
        <div style={{ marginTop: 12, fontFamily: SANS, fontWeight: 600, fontSize: 22, color: C.ink2, opacity: shaking ? 0.85 : reveal, maxWidth: 400, lineHeight: 1.35 }}>
          {shaking ? 'A escolher um…' : 'A tua escolha'}
        </div>
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 22, color: C.terraDarker, opacity: reveal }}>
        Recomendado por pessoas que segues
      </div>
    </div>
  );
};

/** Table: vote rows without naming restaurants. */
export const TableMock = ({ p }) => {
  const rows = [
    { label: 'Restaurante', votes: 0.72 },
    { label: 'Restaurante', votes: 0.48 },
    { label: 'Restaurante', votes: 0.31 },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>
      <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 20, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.ink3 }}>
        Mesa
      </div>
      <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 32, color: C.ink, marginBottom: 8 }}>Onde vamos?</div>
      {rows.map((row, i) => {
        const show = easeOutCubic(clamp((p - 0.1 - i * 0.12) / 0.28, 0, 1));
        return (
          <div
            key={i}
            style={{
              background: C.paper,
              border: `1px solid ${C.hairline}`,
              borderRadius: 22,
              padding: '16px 18px',
              opacity: show,
              transform: `translateX(${(1 - show) * 24}px)`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: SANS, fontWeight: 800, fontSize: 24, color: C.ink, marginBottom: 10 }}>
              <span>{row.label}</span>
              <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 18, color: C.ink2 }}>{i === 0 ? 'À frente' : ''}</span>
            </div>
            <div style={{ height: 10, borderRadius: 999, background: C.parchDeep, overflow: 'hidden' }}>
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: i === 0 ? C.terra : C.hairline,
                  borderRadius: 999,
                  transform: `scaleX(${row.votes * show})`,
                  transformOrigin: 'left center',
                }}
              />
            </div>
          </div>
        );
      })}
      <div style={{ marginTop: 'auto', fontFamily: SANS, fontWeight: 600, fontSize: 22, color: C.ink2, lineHeight: 1.35 }}>
        Os amigos votam sem instalar a app.
      </div>
    </div>
  );
};

export const FeatureMock = ({ kind, p }) => {
  if (kind === 'lists') return <ListsMock p={p} />;
  if (kind === 'map') return <MapMock p={p} />;
  if (kind === 'roulette') return <RouletteMock p={p} />;
  if (kind === 'table') return <TableMock p={p} />;
  return <FeedMock p={p} />;
};
