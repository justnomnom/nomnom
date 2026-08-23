// NomNom — "Spots people you trust love" reviews reel (9:16, reels-style).
// Self-contained: tiny timeline engine + scene composition. Registers window.ReviewsReel.
// Styled strictly from the NomNom design tokens (terracotta accent, warm parchment, gold nom-meter).

const C = {
  bg:        '#faf9f5',
  paper:     '#fdfcfa',
  parch:     '#f5f4ed',
  parchDeep: '#edeae0',
  hairline:  '#d1cfc5',
  divider:   'rgba(110,102,87,0.2)',
  ink:       '#15130f',
  ink2:      '#6e6657',
  ink3:      '#948c7c',
  terra:     '#FF6B35',
  terraDark: '#E85A28',
  terraDarker:'#B8481F',
  terraLight:'#FFE8DF',
  gold:      '#F59E0B',
  goldBg:    'rgba(245,158,11,0.14)',
  green:     '#10B981',
  greenBg:   'rgba(16,185,129,0.12)',
  white:     '#fdfcfa',
};
const SANS = "'Albert Sans', system-ui, sans-serif";
const SERIF = "'Libre Baskerville', Georgia, serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";
const C_SHADOW = '0 10px 26px -8px rgba(21,19,15,0.22)';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const lerp = (a, b, t) => a + (b - a) * t;

// ── Timeline ────────────────────────────────────────────────────────────────
const SCENES = [
  { id: 'hook',   start: 0.0,  dur: 2.6 },
  { id: 'intro',  start: 2.6,  dur: 3.2 },
  { id: 'r1',     start: 5.8,  dur: 4.6 },
  { id: 'agg',    start: 10.4, dur: 4.8 },
  { id: 'map',    start: 15.2, dur: 3.7 },
  { id: 'cta',    start: 18.9, dur: 3.6 },
];
const DURATION = 22.5;

const REVIEWS = [
  {
    init: 'MD', name: 'Mara D.', handle: '@maradines', tint: C.terraLight, tintInk: C.terraDarker,
    follows: true, score: 9.6,
    quote: 'The cacio e pepe ruined me for every other pasta in this city.',
    dish: 'Cacio e pepe', emoji: 'spaghetti',
  },
  {
    init: 'TK', name: 'Theo K.', handle: '@theoeats', tint: '#FCE7C8', tintInk: '#B45309',
    follows: false, score: 9.2,
    quote: 'Came for one glass of natural wine. Stayed three hours. No regrets.',
    dish: 'The wine list', emoji: 'wine-glass',
  },
  {
    init: 'PN', name: 'Priya N.', handle: '@priyabites', tint: '#E7DCC9', tintInk: '#6e6657',
    follows: true, score: 9.8,
    quote: 'That tiramisu is a genuinely religious experience. Order two.',
    dish: 'Tiramisu', emoji: 'shortcake',
  },
];

// ── Star / nom-meter row (gold, out of 5, fills with progress) ───────────────
function NomStars({ score, p, size = 30 }) {
  const filled = (score / 10) * 5 * clamp(p, 0, 1);
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
}
function Star({ size, color }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }}>
      <path fill={color} d="M12 2.5l2.9 5.88 6.49.94-4.7 4.58 1.11 6.46L12 17.3l-5.8 3.05 1.11-6.46-4.7-4.58 6.49-.94z" />
    </svg>
  );
}

function Avatar({ init, tint, tintInk, size = 88, ring }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: tint,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: SANS, fontWeight: 800, fontSize: size * 0.36, color: tintInk,
      flexShrink: 0, boxShadow: ring ? `0 0 0 4px ${C.bg}, 0 0 0 6px ${C.terra}` : 'none',
      letterSpacing: '0.01em',
    }}>{init}</div>
  );
}

// Big colorful dish tile = food photo (drop-in image slot over an emoji default)
function DishTile({ emoji, label, slotId, w = 620, h = 360, p = 1 }) {
  const kb = lerp(1, 1.06, easeOutCubic(clamp(p, 0, 1))); // ken-burns drift
  const s = lerp(0.92, 1, easeOutCubic(clamp(p / 0.5, 0, 1)));
  return (
    <div style={{
      width: w, height: h, borderRadius: 36, overflow: 'hidden', flexShrink: 0,
      background: `radial-gradient(120% 120% at 30% 20%, ${C.parch} 0%, ${C.parchDeep} 100%)`,
      boxShadow: '0 0 0 1px rgba(226,221,208,0.95), 0 24px 40px -18px rgba(21,19,15,0.22)',
      position: 'relative',
    }}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${kb})`, transformOrigin: '50% 50%' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={`https://api.iconify.design/fluent-emoji/${emoji}.svg`} alt={label}
            style={{ width: h * 0.52, height: h * 0.52, transform: `scale(${s}) rotate(-6deg)`, filter: 'drop-shadow(0 16px 22px rgba(21,19,15,0.18))' }} />
        </div>
        <image-slot id={slotId} shape="rounded" radius="0" fit="cover" placeholder="Drop a food photo"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}></image-slot>
      </div>
      <div style={{
        position: 'absolute', left: 22, top: 20, display: 'inline-flex', alignItems: 'center', gap: 8, zIndex: 2,
        background: 'rgba(253,252,250,0.92)', backdropFilter: 'blur(4px)',
        borderRadius: 999, padding: '9px 18px', boxShadow: '0 1px 2px rgba(21,19,15,0.08)',
        fontFamily: SANS, fontWeight: 700, fontSize: 24, color: C.ink,
      }}>
        <span style={{ width: 9, height: 9, borderRadius: 9, background: C.terra }} />
        {label}
      </div>
    </div>
  );
}

// ── Scene helper: returns {active, p, op, slide} for a scene window ──────────
function seg(time, s) {
  const local = time - s.start;
  const active = local >= -0.001 && local <= s.dur + 0.001;
  const p = clamp(local / s.dur, 0, 1);
  const fin = 0.42, fout = 0.4;
  let op = 1, slide = 0;
  if (local < fin) { const t = easeOutCubic(clamp(local / fin, 0, 1)); op = t; slide = (1 - t) * 34; }
  else if (local > s.dur - fout) { const t = clamp((local - (s.dur - fout)) / fout, 0, 1); op = 1 - t; slide = -t * 22; }
  return { active, p, op, slide, local };
}

// ── Slim progress only (clean social post, no app UI) ────────────────────
function Chrome({ time }) {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, background: 'rgba(110,102,87,0.14)' }}>
        <div style={{ width: `${clamp(time / DURATION, 0, 1) * 100}%`, height: '100%', background: C.terra }} />
      </div>
    </div>
  );
}

// ── Scenes ───────────────────────────────────────────────────────────────────
function Hook({ p, op, slide }) {
  const lines = ['Locals', "won't stop", 'talking about', 'this spot.'];
  return (
    <SceneBox op={op} bg={C.ink}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(120% 80% at 50% 32%, rgba(255,107,53,0.26) 0%, rgba(21,19,15,0) 58%)' }} />
      <div style={{ transform: `translateY(${slide}px)`, padding: '0 80px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 24, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.terra, marginBottom: 40 }}>Fitzroy · right now</div>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 106, lineHeight: 1.04, letterSpacing: '-0.01em' }}>
          {lines.map((l, i) => {
            const r = clamp((p - (0.06 + i * 0.13)) / 0.2, 0, 1);
            const e = easeOutBack(r);
            return <div key={i} style={{ opacity: r, transform: `translateY(${(1 - e) * 44}px) scale(${0.9 + e * 0.1})`, color: i === 3 ? C.terra : C.white }}>{l}</div>;
          })}
        </div>
      </div>
    </SceneBox>
  );
}

function Intro({ p, op, slide }) {
  const logoS = easeOutBack(clamp(p / 0.34, 0, 1));
  const meterP = clamp((p - 0.45) / 0.4, 0, 1);
  return (
    <SceneBox op={op}>
      <div style={{ transform: `translateY(${slide}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 70px' }}>
        <img src="assets/logo_circle.png" alt="" style={{ width: 168, height: 168, borderRadius: '50%', transform: `scale(${logoS})`, boxShadow: '0 24px 50px -16px rgba(255,107,53,0.45)' }} />
        <div className="overline" style={{ marginTop: 44, fontFamily: SANS, fontWeight: 700, fontSize: 23, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.terra }}>What real diners are saying</div>
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 110, color: C.ink, lineHeight: 1.04, marginTop: 22, letterSpacing: '-0.01em' }}>Casa<br/>Lupo</div>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 30, color: C.ink2, marginTop: 26 }}>Handmade pasta · Natural wine · Fitzroy</div>
        <div style={{ display: 'flex', gap: 14, marginTop: 40 }}>
          {[['spaghetti', 'Pasta'], ['wine-glass', 'Wine'], ['cook', 'Trattoria']].map(([e, l]) => (
            <div key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: C.paper, border: `1px solid ${C.hairline}`, borderRadius: 999, padding: '13px 22px', fontFamily: SANS, fontWeight: 700, fontSize: 25, color: C.ink }}>
              <img src={`https://api.iconify.design/fluent-emoji/${e}.svg`} style={{ width: 28, height: 28 }} alt="" />{l}
            </div>
          ))}
        </div>
      </div>
    </SceneBox>
  );
}

function Review({ r, p, op, slide, index }) {
  const quoteWords = r.quote.split(' ');
  const wp = clamp((p - 0.18) / 0.5, 0, 1); // word reveal progress
  const shown = Math.round(wp * quoteWords.length);
  const meterP = clamp((p - 0.3) / 0.45, 0, 1);
  return (
    <SceneBox op={op}>
      <div style={{ width: 920, transform: `translateY(${slide}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 23, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.terra, marginBottom: 26 }}>A review from someone you trust</div>
        {/* dish photo */}
        <DishTile emoji={r.emoji} label={r.dish} slotId="dish-main" p={p} />
        {/* review card */}
        <div style={{ width: '100%', marginTop: -28, background: C.paper, borderRadius: 40, boxShadow: '0 0 0 1px rgba(226,221,208,0.95), 0 20px 44px -16px rgba(21,19,15,0.18)', padding: '54px 52px 48px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 28, right: 44, fontFamily: SERIF, fontWeight: 700, fontSize: 150, color: C.terraLight, lineHeight: 0.7, userSelect: 'none' }}>&rdquo;</div>
          {/* reviewer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <Avatar init={r.init} tint={r.tint} tintInk={r.tintInk} size={96} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
              <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 40, color: C.ink, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{r.name}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: C.terraLight, color: C.terraDarker, borderRadius: 999, padding: '8px 18px', fontFamily: SANS, fontWeight: 700, fontSize: 22, alignSelf: 'flex-start', whiteSpace: 'nowrap' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.2 6.6H21l-5.4 4 2.1 6.6L12 15.6 6.3 19.2l2.1-6.6L3 8.6h6.8z"/></svg>
                In your NomNom Circle
              </span>
            </div>
          </div>
          {/* quote */}
          <div style={{ marginTop: 30, fontFamily: SANS, fontWeight: 800, fontSize: 52, lineHeight: 1.18, color: C.ink, letterSpacing: '-0.015em', textWrap: 'balance' }}>
            {quoteWords.map((w, i) => (
              <span key={i} style={{ opacity: i < shown ? 1 : 0.16, transition: 'opacity 0.18s ease', color: i < shown ? C.ink : C.ink3 }}>{w}{i < quoteWords.length - 1 ? ' ' : ''}</span>
            ))}
          </div>
        </div>
      </div>
    </SceneBox>
  );
}

function Aggregate({ p, op, slide }) {
  const loves = ['Cacio e pepe worth the trip', 'Natural wine list locals obsess over', 'Warm, unhurried service'];
  const knows = ['Book ahead — it fills up fast', 'Cozy room runs loud on weekends'];
  const dishes = [['Cacio e pepe', 41], ['Tiramisu', 33], ['Tagliatelle al ragù', 22]];
  const rateP = clamp((p - 0.16) / 0.4, 0, 1);
  const chipS = easeOutBack(clamp((p - 0.12) / 0.32, 0, 1));
  const cardS = lerp(0.96, 1, easeOutCubic(clamp(p / 0.4, 0, 1)));
  const star = 'https://api.iconify.design/solar/star-bold.svg?color=%23FF6B35';
  const check = 'https://api.iconify.design/solar/check-circle-bold.svg?color=%2310B981';
  const warn = 'https://api.iconify.design/solar/danger-triangle-bold.svg?color=%23F59E0B';
  const rev = (order) => clamp((p - (0.18 + order * 0.05)) / 0.3, 0, 1);
  const Item = ({ icon, text, order }) => {
    const r = rev(order);
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 14, opacity: r, transform: `translateY(${(1 - r) * 10}px)` }}>
        <img src={icon} alt="" style={{ width: 34, height: 34, flexShrink: 0, marginTop: 3 }} />
        <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: 31, color: C.ink, lineHeight: 1.4 }}>{text}</span>
      </div>
    );
  };
  return (
    <SceneBox op={op}>
      <div style={{ transform: `translateY(${slide}px)`, width: 920, display: 'flex', flexDirection: 'column' }}>
        {/* name + rating (detail-page header) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 52, color: C.ink, letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>Casa Lupo</span>
          <span className="tnum" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,107,53,0.10)', color: C.terra, padding: '8px 18px', borderRadius: 16, fontFamily: SANS, fontWeight: 800, fontSize: 34, fontVariantNumeric: 'tabular-nums', transform: `scale(${chipS})`, transformOrigin: 'left center' }}>
            <img src={star} alt="" style={{ width: 32, height: 32 }} />{(9.4 * rateP).toFixed(1)}
          </span>
        </div>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 28, color: C.ink2, marginTop: 10 }}>Handmade pasta · Natural wine · Fitzroy</div>
        {/* section heading */}
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 38, color: C.ink, letterSpacing: '-0.01em', margin: '34px 0 18px' }}>Community consensus</div>
        {/* consensus card */}
        <div style={{ transform: `scale(${cardS})`, transformOrigin: 'top center', borderRadius: 28, padding: '34px 36px', border: `1px solid ${C.divider}`, background: C.paper, boxShadow: '0 1px 3px rgba(21,19,15,0.06)', display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ fontFamily: SANS, fontStyle: 'italic', fontWeight: 400, fontSize: 33, color: C.ink2, lineHeight: 1.5 }}>“A neighbourhood trattoria punching well above its room — confident handmade pasta and a natural wine list regulars keep coming back for.”</div>
          <div>
            <span style={{ display: 'block', fontFamily: SANS, fontWeight: 700, fontSize: 24, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.green, marginBottom: 14 }}>What people love</span>
            {loves.map((x, i) => <Item key={i} icon={check} text={x} order={i + 1} />)}
          </div>
          <div>
            <span style={{ display: 'block', fontFamily: SANS, fontWeight: 700, fontSize: 24, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.gold, marginBottom: 14 }}>Things to know</span>
            {knows.map((x, i) => <Item key={i} icon={warn} text={x} order={i + 4} />)}
          </div>
          <div>
            <span style={{ display: 'block', fontFamily: SANS, fontWeight: 700, fontSize: 24, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.ink2, marginBottom: 14 }}>Dishes mentioned</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {dishes.map(([label, nn], i) => (
                <span key={i} className="tnum" style={{ display: 'inline-flex', alignItems: 'center', height: 50, padding: '0 20px', borderRadius: 999, border: `1px solid rgba(255,107,53,0.4)`, color: C.terraDarker, fontFamily: SANS, fontWeight: 600, fontSize: 26, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{label} · {nn}</span>
              ))}
            </div>
          </div>
          <div style={{ fontFamily: SANS, fontStyle: 'italic', fontSize: 25, color: C.ink3 }}>Based on 1,284 reviews from people you trust</div>
        </div>
      </div>
    </SceneBox>
  );
}

function MapView({ p, op }) {
  const drop = easeOutBack(clamp((p - 0.1) / 0.5, 0, 1));
  const pinY = (1 - drop) * -140;
  const rateP = clamp((p - 0.25) / 0.4, 0, 1);
  const ringT = (clamp((p - 0.3) / 0.7, 0, 1) * 2) % 1;
  const ring = { scale: 0.7 + ringT * 1.7, op: (1 - ringT) * 0.45 };
  const proof = [
    { init: 'MD', tint: C.terraLight, ink: C.terraDarker },
    { init: 'TK', tint: '#FCE7C8', ink: '#B45309' },
    { init: 'PN', tint: '#E7DCC9', ink: '#6e6657' },
  ];
  const mapPoint = 'https://api.iconify.design/solar/map-point-bold.svg?color=%23FF6B35';
  const star = 'https://api.iconify.design/solar/star-bold.svg?color=%23FF6B35';
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: op, overflow: 'hidden' }}>
      {/* map base + grid */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, #eef2e8 0%, #e2ecdc 55%, #e8e4d4 100%)' }} />
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(150,160,140,0.16) 2px, transparent 2px), linear-gradient(90deg, rgba(150,160,140,0.16) 2px, transparent 2px)', backgroundSize: '96px 96px' }} />
      {/* water + park blobs */}
      <div style={{ position: 'absolute', right: -160, top: -160, width: 520, height: 520, borderRadius: '46% 54% 50% 50%', background: 'rgba(150,190,205,0.35)' }} />
      <div style={{ position: 'absolute', left: -120, bottom: 240, width: 380, height: 320, borderRadius: '50%', background: 'rgba(170,200,150,0.34)' }} />
      {/* roads */}
      <div style={{ position: 'absolute', left: '-10%', right: '-10%', top: '52%', height: 40, background: 'rgba(253,252,250,0.72)', transform: 'rotate(-7deg)', boxShadow: '0 0 0 1px rgba(150,160,140,0.18)' }} />
      <div style={{ position: 'absolute', top: '-10%', bottom: '-10%', left: '60%', width: 30, background: 'rgba(253,252,250,0.62)', transform: 'rotate(4deg)' }} />
      <div style={{ position: 'absolute', left: '-10%', right: '-10%', top: '28%', height: 18, background: 'rgba(253,252,250,0.5)', transform: 'rotate(5deg)' }} />

      {/* overline */}
      <div style={{ position: 'absolute', top: 150, left: 0, right: 0, textAlign: 'center', fontFamily: SANS, fontWeight: 700, fontSize: 23, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.terra }}>Find it in Fitzroy</div>

      {/* pin */}
      <div style={{ position: 'absolute', left: '50%', top: '44%', transform: `translate(-50%,-50%) translateY(${pinY}px)`, opacity: drop, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* name pill */}
        <div style={{ background: 'rgba(253,252,250,0.97)', border: `2px solid ${C.divider}`, borderRadius: 22, padding: '18px 24px', boxShadow: C_SHADOW, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 360 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 18 }}>
            <span style={{ fontFamily: SANS, fontWeight: 800, fontSize: 38, color: C.ink, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>Casa Lupo</span>
            <span className="tnum" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: SANS, fontWeight: 800, fontSize: 32, color: C.ink, fontVariantNumeric: 'tabular-nums' }}><img src={star} alt="" style={{ width: 28, height: 28 }} />{(9.4 * rateP).toFixed(1)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex' }}>
              {proof.map((a, i) => (
                <div key={i} style={{ marginLeft: i ? -10 : 0, zIndex: 5 - i, borderRadius: '50%', boxShadow: '0 0 0 3px #fdfcfa' }}><Avatar init={a.init} tint={a.tint} tintInk={a.ink} size={38} /></div>
              ))}
            </div>
            <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: 22, color: C.ink2 }}>Saved by your circle +309</span>
          </div>
        </div>
        {/* caret */}
        <div style={{ width: 0, height: 0, borderLeft: '14px solid transparent', borderRight: '14px solid transparent', borderTop: '16px solid rgba(253,252,250,0.97)', marginTop: -2 }} />
        {/* dot + halo */}
        <div style={{ position: 'relative', width: 72, height: 72, marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', width: 72, height: 72, borderRadius: '50%', background: 'rgba(184,72,31,0.20)', transform: `scale(${ring.scale})`, opacity: ring.op }} />
          <div style={{ position: 'absolute', width: 150, height: 150, borderRadius: '50%', background: 'rgba(184,72,31,0.12)' }} />
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: C.terraDarker, border: `9px solid ${C.white}`, boxShadow: '0 6px 16px rgba(21,19,15,0.3)', boxSizing: 'border-box' }} />
        </div>
      </div>

      {/* address card (detail-page address row) */}
      <div style={{ position: 'absolute', left: 56, right: 56, bottom: 130, background: C.paper, borderRadius: 28, border: `1px solid ${C.divider}`, boxShadow: C_SHADOW, padding: '28px 30px', display: 'flex', alignItems: 'center', gap: 22 }}>
        <div style={{ width: 84, height: 84, borderRadius: '50%', flexShrink: 0, background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src={mapPoint} alt="" style={{ width: 44, height: 44 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 24, color: C.ink }}>Address</div>
          <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: 28, color: C.ink2, marginTop: 4 }}>23 Gertrude St, Fitzroy VIC</div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: C.terra, color: C.white, borderRadius: 18, padding: '20px 26px', fontFamily: SANS, fontWeight: 800, fontStyle: 'italic', fontSize: 22, textTransform: 'uppercase', letterSpacing: '0.1em', boxShadow: '0 12px 24px -6px rgba(255,107,53,0.4)', flexShrink: 0 }}>
          <img src="https://api.iconify.design/solar/map-point-bold.svg?color=%23ffffff" alt="" style={{ width: 26, height: 26 }} />Maps
        </div>
      </div>
    </div>
  );
}

function Cta({ p, op, slide }) {
  const btnS = easeOutBack(clamp((p - 0.2) / 0.4, 0, 1));
  return (
    <SceneBox op={op} bg={C.terra}>
      <div style={{ transform: `translateY(${slide}px)`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 80px' }}>
        <img src="assets/logo_circle.png" alt="" style={{ width: 150, height: 150, borderRadius: '50%', boxShadow: '0 18px 40px rgba(21,19,15,0.25)', border: '5px solid rgba(255,255,255,0.85)' }} />
        <div style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 80, color: C.white, marginTop: 40, lineHeight: 1.06 }}>Don't take<br/>our word.</div>
        <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 32, color: 'rgba(253,252,250,0.92)', marginTop: 22, lineHeight: 1.4 }}>Take theirs. The spots people you<br/>trust can't stop recommending.</div>
        <div style={{ marginTop: 56, transform: `scale(${btnS})`, display: 'inline-flex', alignItems: 'center', gap: 16, background: C.white, color: C.terraDark, borderRadius: 999, padding: '26px 52px', fontFamily: SANS, fontWeight: 800, fontSize: 40, boxShadow: '0 16px 30px rgba(21,19,15,0.22)', whiteSpace: 'nowrap' }}>
          <svg width="38" height="38" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h12a1 1 0 011 1v15l-7-4-7 4V5a1 1 0 011-1z"/></svg>
          Save this spot
        </div>
        <div style={{ marginTop: 40, fontFamily: SANS, fontWeight: 700, fontSize: 30, color: C.white, letterSpacing: '0.02em' }}>Join the Nom Nom Circle · justnomnom.com</div>
      </div>
    </SceneBox>
  );
}

function SceneBox({ children, op, bg }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: op, background: bg || 'transparent' }}>
      {children}
    </div>
  );
}

// ── Root reel (full 1080×1920 frame, fits to its mount via Stage) ────────────
function Reel({ time }) {
  const s = SCENES.reduce((acc, sc) => { acc[sc.id] = seg(time, sc); return acc; }, {});
  return (
    <div style={{ position: 'absolute', inset: 0, background: C.bg, overflow: 'hidden', fontFamily: SANS }}>
      {/* soft warm vignette */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(130% 90% at 50% 8%, rgba(255,107,53,0.06) 0%, rgba(255,107,53,0) 46%)' }} />
      {s.intro.active && <Intro {...s.intro} />}
      {s.hook.active && <Hook {...s.hook} />}
      {s.r1.active && <Review r={REVIEWS[0]} {...s.r1} index={0} />}
      {s.agg.active && <Aggregate {...s.agg} />}
      {s.map.active && <MapView {...s.map} />}
      {s.cta.active && <Cta {...s.cta} />}
      {!s.cta.active && <Chrome time={time} />}
    </div>
  );
}

// ── Stage: scales 1080×1920 to viewport, loops, scrubber, persists playhead ──
const W = 1080, H = 1920;
function ReviewsReel() {
  const [time, setTime] = React.useState(() => {
    try { const v = parseFloat(localStorage.getItem('nomreel:t') || '0'); return isFinite(v) ? clamp(v, 0, DURATION) : 0; } catch { return 0; }
  });
  const [playing, setPlaying] = React.useState(true);
  const [scale, setScale] = React.useState(0.3);
  const wrap = React.useRef(null), raf = React.useRef(null), last = React.useRef(null);

  React.useEffect(() => { try { localStorage.setItem('nomreel:t', String(time)); } catch {} }, [time]);

  React.useEffect(() => {
    const el = wrap.current; if (!el) return;
    const measure = () => { const s = Math.min(el.clientWidth / W, (el.clientHeight - 52) / H); setScale(Math.max(0.05, s)); };
    measure(); const ro = new ResizeObserver(measure); ro.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  React.useEffect(() => {
    if (!playing) { last.current = null; return; }
    const step = (ts) => {
      if (last.current == null) last.current = ts;
      const dt = (ts - last.current) / 1000; last.current = ts;
      setTime((t) => { let n = t + dt; if (n >= DURATION) n = n % DURATION; return n; });
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); last.current = null; };
  }, [playing]);

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space') { e.preventDefault(); setPlaying(p => !p); }
      else if (e.code === 'ArrowLeft') setTime(t => clamp(t - (e.shiftKey ? 1 : 0.1), 0, DURATION));
      else if (e.code === 'ArrowRight') setTime(t => clamp(t + (e.shiftKey ? 1 : 0.1), 0, DURATION));
      else if (e.key === '0') setTime(0);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pct = (time / DURATION) * 100;
  const fmt = (t) => { const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${String(s).padStart(2, '0')}`; };

  return (
    <div ref={wrap} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#100f0e' }}>
      <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', minHeight: 0 }}>
        <div style={{ width: W, height: H, position: 'relative', transform: `scale(${scale})`, flexShrink: 0, borderRadius: 0, overflow: 'hidden', boxShadow: '0 30px 90px rgba(0,0,0,0.5)' }}>
          <Reel time={time} />
        </div>
      </div>
      {/* playback bar */}
      <div style={{ height: 52, width: '100%', maxWidth: 720, display: 'flex', alignItems: 'center', gap: 14, padding: '0 18px', color: '#f6f4ef', fontFamily: SANS }}>
        <button onClick={() => setTime(0)} title="Restart" style={ctlBtn}>
          <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 2v10M12 2L5 7l7 5V2z" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinejoin="round"/></svg>
        </button>
        <button onClick={() => setPlaying(p => !p)} title="Play/pause" style={ctlBtn}>
          {playing
            ? <svg width="14" height="14" viewBox="0 0 14 14"><rect x="3" y="2" width="3" height="10" fill="currentColor"/><rect x="8" y="2" width="3" height="10" fill="currentColor"/></svg>
            : <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 2l9 5-9 5V2z" fill="currentColor"/></svg>}
        </button>
        <span style={{ fontFamily: MONO, fontSize: 12, width: 36, textAlign: 'right' }}>{fmt(time)}</span>
        <div onMouseDown={(e) => { const r = e.currentTarget.getBoundingClientRect(); setTime(clamp((e.clientX - r.left) / r.width, 0, 1) * DURATION); }}
          style={{ flex: 1, height: 18, display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
          <div style={{ position: 'absolute', left: 0, right: 0, height: 4, background: 'rgba(255,255,255,0.14)', borderRadius: 2 }} />
          <div style={{ position: 'absolute', left: 0, width: `${pct}%`, height: 4, background: C.terra, borderRadius: 2 }} />
          <div style={{ position: 'absolute', left: `${pct}%`, width: 12, height: 12, marginLeft: -6, background: '#fff', borderRadius: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.5)' }} />
        </div>
        <span style={{ fontFamily: MONO, fontSize: 12, width: 36, color: 'rgba(246,244,239,0.5)' }}>{fmt(DURATION)}</span>
      </div>
    </div>
  );
}
const ctlBtn = { width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 6, color: '#f6f4ef', cursor: 'pointer', padding: 0 };

window.ReviewsReel = ReviewsReel;
