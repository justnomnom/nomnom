#!/usr/bin/env node
/**
 * Screenshot branded stills from a day's pipeline pieces. Does not publish.
 *
 *   node scripts/content-pipeline/render-stills.mjs --date 2026-08-24
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const isoDate = flag('date') || new Date().toISOString().slice(0, 10);
const dayDir = join(ROOT, 'content/pipeline/out', isoDate);
const piecesDir = join(dayDir, 'pieces');
const mediaDir = join(dayDir, 'media');

const SKIP_TYPES = new Set(['restaurant_reel', 'review_spotlight', 'list_reel', 'punchline']);

function parsePiece(raw, filename) {
  const copy = {};
  for (const match of raw.matchAll(/- \*\*([a-z0-9_]+):\*\*\s*(.+)/gi)) {
    copy[match[1]] = match[2].trim();
  }
  const type = (raw.match(/^type:\s*(.+)$/m) || [])[1]?.trim() || '';
  const iteration = (raw.match(/^iteration:\s*(.+)$/m) || [])[1]?.trim() || '';
  const pack = (raw.match(/^pack:\s*(.+)$/m) || [])[1]?.trim() || '';
  const title = (raw.match(/^# .+$/m) || ['# Piece'])[0].replace(/^#\s*/, '');
  return { filename, type, iteration, pack, title, copy };
}

function slidesFor(piece) {
  const { type, copy } = piece;
  const entries = Object.entries(copy);
  if (!entries.length) return [];

  if (type === 'story') {
    const frames = [];
    if (copy.frame_1) frames.push({ kicker: 'Stories', text: copy.frame_1 });
    if (copy.poll_a || copy.poll_b) {
      frames.push({
        kicker: 'Poll',
        text: [copy.poll_a, copy.poll_b].filter(Boolean).join('\n'),
        options: [copy.poll_a, copy.poll_b].filter(Boolean),
      });
    }
    if (copy.question) frames.push({ kicker: 'Pergunta', text: copy.question });
    if (copy.countdown) frames.push({ kicker: 'Countdown', text: copy.countdown });
    for (const [key, value] of entries) {
      if (['frame_1', 'poll_a', 'poll_b', 'question', 'countdown'].includes(key)) continue;
      frames.push({ kicker: key, text: value });
    }
    return frames.map((frame) => ({ ...frame, format: 'story' }));
  }

  return entries.map(([key, text], index) => ({
    kicker: `${String(index + 1).padStart(2, '0')} · ${key.replaceAll('_', ' ')}`,
    text,
    format: type === 'story' ? 'story' : 'square',
  }));
}

function htmlFor({ kicker, text, format, brand, options }) {
  const story = format === 'story';
  const w = 1080;
  const h = story ? 1920 : 1080;
  const poll = Array.isArray(options) && options.length >= 2;
  const body = poll
    ? `<div class="options">${options
        .map(
          (opt, i) =>
            `<div class="option"><span class="opt-letter">${String.fromCharCode(65 + i)}</span><span class="opt-text">${esc(opt)}</span></div>`
        )
        .join('')}</div>`
    : `<div class="quote">${esc(text).replace(/([./])/g, '$1\u200b')}</div>`;
  return `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Albert+Sans:wght@500;700;800&family=Libre+Baskerville:wght@700&display=swap" rel="stylesheet">
<style>
:root {
  --paper: #faf9f5;
  --parch: #f5f4ed;
  --ink: #15130f;
  --ink2: #6e6657;
  --terra: #FF6B35;
  --accent: #B8481F;
  --hair: #d1cfc5;
  --sans: 'Albert Sans', system-ui, sans-serif;
  --serif: 'Libre Baskerville', Georgia, serif;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: ${w}px; height: ${h}px; background: var(--paper); overflow: hidden; }
.card {
  width: ${w}px; height: ${h}px; background: var(--paper);
  position: relative; overflow: hidden;
}
.bar { position: absolute; left: 0; top: 0; width: 100%; height: 12px; background: var(--terra); }
.mark {
  position: absolute; top: ${story ? 120 : 48}px; left: 8px;
  font-family: var(--serif); font-size: ${story ? 420 : 300}px; line-height: 0.75;
  color: var(--terra); opacity: 0.12; pointer-events: none; user-select: none;
}
.kicker {
  position: absolute; top: ${story ? 48 : 36}px; left: ${story ? 56 : 48}px; right: 48px;
  font-family: var(--sans); font-size: ${story ? 22 : 20}px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase; color: var(--accent);
}
.stage {
  position: absolute;
  top: ${story ? 108 : 84}px; left: ${story ? 48 : 40}px; right: ${story ? 48 : 40}px;
  bottom: ${story ? 116 : 96}px;
  display: flex; flex-direction: column; justify-content: center;
  min-height: 0;
}
.quote {
  width: 100%;
  font-family: var(--serif); font-size: ${story ? 96 : 84}px; font-weight: 700;
  color: var(--ink); line-height: 1.08; letter-spacing: -0.03em;
  overflow-wrap: break-word; word-break: normal; white-space: pre-wrap;
}
.options {
  display: flex; flex-direction: column; gap: ${story ? 24 : 20}px;
  height: 100%; justify-content: stretch;
}
.option {
  flex: 1 1 0; display: flex; align-items: center; gap: 28px;
  background: var(--parch); border: 2px solid var(--hair); border-radius: 28px;
  padding: ${story ? '36px 32px' : '28px 28px'};
  min-height: 0;
}
.opt-letter {
  flex: 0 0 auto; width: ${story ? 72 : 64}px; height: ${story ? 72 : 64}px;
  border-radius: 16px; background: var(--terra); color: #fff;
  font-family: var(--sans); font-size: ${story ? 32 : 28}px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
}
.opt-text {
  font-family: var(--sans); font-size: ${story ? 56 : 48}px; font-weight: 800;
  color: var(--ink); line-height: 1.15;
}
.bottom {
  position: absolute; left: ${story ? 56 : 48}px; right: ${story ? 56 : 48}px;
  bottom: ${story ? 44 : 32}px;
  display: flex; justify-content: space-between; align-items: baseline;
  border-top: 1px solid var(--hair); padding-top: 18px;
}
.brand { font-family: var(--sans); font-size: 28px; font-weight: 800; color: var(--terra); }
.meta { font-family: var(--sans); font-size: 16px; font-weight: 500; color: var(--ink2); text-align: right; }
</style>
</head>
<body>
<div class="card">
  <div class="bar"></div>
  ${poll ? '' : `<div class="mark" aria-hidden="true">“</div>`}
  <div class="kicker">${esc(kicker)}</div>
  <div class="stage">${body}</div>
  <div class="bottom">
    <div class="brand">NomNom</div>
    <div class="meta">${esc(brand)}</div>
  </div>
</div>
</body>
</html>`;
}

function esc(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function slug(value) {
  return String(value || 'slide')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

/** Grow type until the quote (or poll cards) fill the stage, then stop. */
async function fitType(page) {
  await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('700 80px "Libre Baskerville"'),
      document.fonts.load('800 48px "Albert Sans"'),
      document.fonts.ready,
    ]);
  });
  await page.evaluate(() => {
    const stage = document.querySelector('.stage');
    if (!stage) return;
    const maxH = stage.clientHeight;
    const maxW = stage.clientWidth;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const longestToken = (el) =>
      (el.textContent || '')
        .split(/[\s./→—–-]+/)
        .reduce((best, word) => (word.length > best.length ? word : best), '');

    const wordFits = (font, token) => {
      ctx.font = font;
      return ctx.measureText(token).width <= maxW - 8;
    };

    const quote = document.querySelector('.quote');
    if (quote) {
      const token = longestToken(quote);
      quote.style.width = '100%';
      quote.style.lineHeight = '1.05';
      let lo = 56;
      let hi = stage.clientHeight > 1400 ? 280 : 320;
      let best = lo;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        quote.style.fontSize = `${mid}px`;
        const overflowY = quote.scrollHeight > maxH + 1;
        const overflowWord = token ? !wordFits(`700 ${mid}px "Libre Baskerville"`, token) : false;
        if (!overflowY && !overflowWord) {
          best = mid;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      quote.style.fontSize = `${best}px`;
      return;
    }

    const options = document.querySelector('.options');
    if (!options) return;
    const texts = [...options.querySelectorAll('.opt-text')];
    const token = texts.map((el) => longestToken(el)).reduce((best, word) => (word.length > best.length ? word : best), '');
    const apply = (n) => {
      texts.forEach((el) => {
        el.style.fontSize = `${n}px`;
      });
    };
    let lo = 40;
    let hi = 140;
    let best = lo;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      apply(mid);
      const overflowY = options.scrollHeight > maxH + 1;
      const overflowWord = !wordFits(`800 ${mid}px "Albert Sans"`, token);
      if (!overflowY && !overflowWord) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    apply(best);
  });
}

const files = readdirSync(piecesDir).filter((name) => name.endsWith('.md')).sort();
const jobs = [];
for (const filename of files) {
  const piece = parsePiece(readFileSync(join(piecesDir, filename), 'utf8'), filename);
  if (SKIP_TYPES.has(piece.type)) continue;
  const stem = filename.replace(/\.md$/, '');
  const slides = slidesFor(piece);
  slides.forEach((slide, index) => {
    jobs.push({
      piece,
      slide,
      outName: `${stem}-${String(index + 1).padStart(2, '0')}-${slug(slide.kicker)}.png`,
    });
  });
}

mkdirSync(mediaDir, { recursive: true });
const browser = await chromium.launch();
const index = [];

for (const job of jobs) {
  const { slide, piece, outName } = job;
  const page = await browser.newPage();
  const size = slide.format === 'story' ? { width: 1080, height: 1920 } : { width: 1080, height: 1080 };
  await page.setViewportSize(size);
  await page.setContent(
    htmlFor({
      ...slide,
      brand: piece.pack || piece.iteration || 'justnomnom.com',
    }),
    { waitUntil: 'networkidle' }
  );
  await fitType(page);
  const outPath = join(mediaDir, outName);
  await page.screenshot({ path: outPath, type: 'png' });
  await page.close();
  index.push({
    file: `media/${outName}`,
    type: piece.type,
    iteration: piece.iteration,
    pack: piece.pack || null,
    format: slide.format,
    text: slide.text,
  });
  process.stdout.write(`wrote ${outName}\n`);
}

await browser.close();
writeFileSync(join(mediaDir, 'index.json'), `${JSON.stringify({ date: isoDate, stills: index }, null, 2)}\n`);
console.log(`\n${index.length} stills → ${mediaDir}`);
