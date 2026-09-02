import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  fillCopy,
  loadPipeline,
  parseIsoDate,
  pickRotate,
  planDay,
  produceHint,
} from './plan.mjs';

const PIPELINE_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../content/pipeline');

/** Pack-sourced types we can fill without a live restaurant row. */
export const FILLABLE_TYPES = [
  'carousel',
  'story',
  'thread',
  'ugc_prompt',
  'ads',
  'feature_reel',
  'seo_resource',
];

export const DEFAULT_VOLUME = 24;

export const DEFAULT_OUT_ROOT = join(PIPELINE_DIR, 'out');

/**
 * Stable identity so calendar slots and mass extras do not duplicate.
 */
export function pieceKey(piece) {
  const packId = piece.pack?.id || 'live';
  return `${piece.type}:${piece.iteration.id}:${packId}`;
}

/**
 * Every pack × fillable type × iteration the catalog can draft today.
 */
export function enumerateFillableCombos(pipeline) {
  const { catalog, packs } = pipeline;
  const combos = [];
  for (const type of FILLABLE_TYPES) {
    const typeDef = catalog.types[type];
    if (!typeDef) continue;
    for (const pack of packs) {
      if (!pack.types.includes(type)) continue;
      for (const iteration of typeDef.iterations) {
        combos.push({ type, typeDef, iteration, pack });
      }
    }
  }
  return combos;
}

/**
 * Turn a calendar slot into a reviewable piece.
 */
function slotToPiece(slot, index) {
  return {
    index: index + 1,
    lane: 'calendar',
    slot: slot.slot,
    type: slot.type,
    typeLabel: slot.typeLabel,
    source: slot.source,
    formats: slot.formats,
    iteration: slot.iteration,
    pack: slot.pack,
    featureId: slot.featureId,
    copy: slot.copy,
    producer: slot.producer,
    honesty: slot.honesty,
  };
}

/**
 * Turn a pack combo into a reviewable extra piece.
 */
function comboToPiece(combo, index, catalog) {
  const { type, typeDef, iteration, pack } = combo;
  const featureId = pack.featureId || null;
  return {
    index: index + 1,
    lane: 'mass',
    slot: 'batch',
    type,
    typeLabel: typeDef.label,
    source: typeDef.source,
    formats: typeDef.formats,
    iteration: {
      id: iteration.id,
      label: iteration.label,
      hookRule: iteration.hook_rule || null,
      fields: iteration.fields || [],
    },
    pack: {
      id: pack.id,
      pillar: pack.pillar,
      seoPath: pack.seoPath || null,
      facts: pack.facts,
    },
    featureId: typeDef.featureIds || pack.featureId ? featureId : null,
    copy: fillCopy(iteration, pack),
    producer: produceHint(catalog, type, featureId),
    honesty: {
      inventRestaurants: false,
      publish: false,
      needsLiveSubject: false,
    },
  };
}

function liveStubPiece(catalog, type, isoDate, epochDay, index) {
  const typeDef = catalog.types[type];
  const iteration = pickRotate(typeDef.iterations, epochDay + index + 1);
  const featureId = typeDef.featureIds ? pickRotate(typeDef.featureIds, epochDay + index) : null;
  return {
    index: index + 1,
    lane: 'calendar-fill',
    slot: 'batch',
    type,
    typeLabel: typeDef.label,
    source: typeDef.source,
    formats: typeDef.formats,
    iteration: {
      id: iteration.id,
      label: iteration.label,
      hookRule: iteration.hook_rule || null,
    },
    pack: null,
    featureId,
    copy: {},
    producer: produceHint(catalog, type, featureId),
    honesty: {
      inventRestaurants: false,
      publish: false,
      needsLiveSubject: true,
    },
  };
}

/**
 * Build a large reviewable batch: 4 calendar slots plus rotating pack extras.
 */
export function produceMassDay(isoDate, options = {}) {
  const requestedVolume = Math.max(4, Number(options.volume) || DEFAULT_VOLUME);
  const pipeline = options.pipeline || loadPipeline();
  const { catalog } = pipeline;
  const plan = planDay(isoDate, pipeline);
  const pieces = plan.slots.map((slot, index) => slotToPiece(slot, index));
  const used = new Set(pieces.map(pieceKey));
  const epochDay = Math.floor(parseIsoDate(isoDate).getTime() / 86_400_000);

  const liveTypes = Object.entries(catalog.types)
    .filter(([, def]) => def.source === 'db' || def.source === 'news')
    .map(([id]) => id);
  for (const type of liveTypes) {
    if (pieces.length >= requestedVolume) break;
    if (pieces.some((piece) => piece.type === type)) continue;
    const stub = liveStubPiece(catalog, type, isoDate, epochDay, pieces.length);
    pieces.push(stub);
    used.add(pieceKey(stub));
  }

  const combos = enumerateFillableCombos(pipeline);
  for (const type of FILLABLE_TYPES) {
    if (pieces.length >= requestedVolume) break;
    if (pieces.some((piece) => piece.type === type)) continue;
    const combo = combos.find((item) => item.type === type);
    if (!combo) continue;
    const key = `${combo.type}:${combo.iteration.id}:${combo.pack.id}`;
    if (used.has(key)) continue;
    used.add(key);
    pieces.push(comboToPiece(combo, pieces.length, pipeline.catalog));
  }

  const comboCount = combos.length;
  const stride = comboCount > 1 ? 17 : 1;
  let cursor = comboCount ? (epochDay * 11) % comboCount : 0;
  let scanned = 0;

  while (pieces.length < requestedVolume && scanned < comboCount) {
    const combo = combos[cursor % comboCount];
    const key = `${combo.type}:${combo.iteration.id}:${combo.pack.id}`;
    if (!used.has(key)) {
      used.add(key);
      pieces.push(comboToPiece(combo, pieces.length, pipeline.catalog));
    }
    cursor += stride;
    scanned += 1;
  }

  return {
    date: isoDate,
    weekday: plan.weekday,
    neverPublish: true,
    requestedVolume,
    volume: pieces.length,
    liveSubjectCount: pieces.filter((piece) => piece.honesty.needsLiveSubject).length,
    pieces,
  };
}

/**
 * Filename-safe fragment.
 */
export function slugPart(value) {
  return String(value || 'none')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
}

/**
 * One reviewable markdown file for a piece.
 */
export function renderPieceMarkdown(piece, date) {
  const copyEntries = Object.entries(piece.copy || {});
  const copyLines = copyEntries.length
    ? copyEntries
        .map(([key, value]) => `- **${key}:** ${value || '_(empty — fill only from facts)_'}`)
        .join('\n')
    : '- _live subject — run the produce command, then paste real names/quotes_';
  const facts = piece.pack?.facts?.length
    ? piece.pack.facts.map((fact) => `- ${fact}`).join('\n')
    : '- _(no pack facts — pick a live row; do not invent a restaurant)_';
  const produce = piece.producer?.command
    ? `\`${piece.producer.command}\``
    : piece.producer?.skill
      ? `skill \`${piece.producer.skill}\``
      : '_copy in this file is the draft_';
  const related = piece.pack?.seoPath ? `\n## Related\n${piece.pack.seoPath}\n` : '';

  return `---
status: review
publish: false
date: ${date}
lane: ${piece.lane}
slot: ${piece.slot}
type: ${piece.type}
iteration: ${piece.iteration.id}
pack: ${piece.pack?.id || ''}
needsLiveSubject: ${piece.honesty.needsLiveSubject}
---

# ${String(piece.index).padStart(2, '0')} · ${piece.typeLabel} · ${piece.iteration.label}

Do not invent restaurant names, quotes, ratings, or dishes.
Do not publish this file. A human posts after review.

## Facts (do not add more)
${facts}

## Copy
${copyLines}

## Produce
${produce}
${related}`;
}

/**
 * Human checklist for the day's mass folder.
 */
export function renderReviewMarkdown(batch) {
  const calendar = batch.pieces.filter((piece) => piece.lane === 'calendar');
  const liveFills = batch.pieces.filter((piece) => piece.lane === 'calendar-fill');
  const extras = batch.pieces.filter((piece) => piece.lane === 'mass');
  const live = batch.pieces.filter((piece) => piece.honesty.needsLiveSubject);
  const list = (items) =>
    items
      .map((piece) => {
        const pack = piece.pack ? ` · ${piece.pack.id}` : ' · LIVE SUBJECT';
        return `- [ ] **${String(piece.index).padStart(2, '0')}** ${piece.slot} · ${piece.type} · ${piece.iteration.id}${pack}`;
      })
      .join('\n');

  return `# ${batch.date} mass batch (${batch.volume} pieces)

Never publish from this folder. Never invent restaurant facts.

## Daily process

1. You already ran \`npm run content:daily\`.
2. Tick or reject every piece below. Edit copy only from **Facts**.
3. For LIVE SUBJECT rows, run the produce command on the piece file, then paste real names/quotes.
4. Post approved pieces yourself. This pipeline does not post.

## Calendar (post today)
${list(calendar)}

## Live types not on today's calendar (stubs)
${liveFills.length ? list(liveFills) : '_all db/news types already on the calendar_'}

## Mass extras (same-day overflow / week queue)
${list(extras)}

## Live subjects still needed
${live.length ? list(live) : '_none — extras are pack-sourced_'}

## Honesty
- inventRestaurants: false
- publish: false
`;
}

/**
 * Wipe and write a dated out folder: REVIEW.md, manifest.json, pieces/*.md
 */
export function writeMassDay(batch, outRoot = DEFAULT_OUT_ROOT) {
  const outDir = join(outRoot, batch.date);
  if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
  const piecesDir = join(outDir, 'pieces');
  mkdirSync(piecesDir, { recursive: true });

  const manifestPieces = [];
  for (const piece of batch.pieces) {
    const lane = piece.lane === 'calendar' ? piece.slot : 'batch';
    const name = `${String(piece.index).padStart(2, '0')}-${lane}-${slugPart(piece.type)}-${slugPart(piece.iteration.id)}-${slugPart(piece.pack?.id || 'live')}.md`;
    writeFileSync(join(piecesDir, name), renderPieceMarkdown(piece, batch.date));
    manifestPieces.push({
      index: piece.index,
      file: `pieces/${name}`,
      lane: piece.lane,
      slot: piece.slot,
      type: piece.type,
      iteration: piece.iteration.id,
      pack: piece.pack?.id || null,
      needsLiveSubject: piece.honesty.needsLiveSubject,
    });
  }

  writeFileSync(join(outDir, 'REVIEW.md'), renderReviewMarkdown(batch));
  writeFileSync(
    join(outDir, 'manifest.json'),
    `${JSON.stringify(
      {
        date: batch.date,
        weekday: batch.weekday,
        neverPublish: true,
        requestedVolume: batch.requestedVolume,
        volume: batch.volume,
        pieces: manifestPieces,
      },
      null,
      2
    )}\n`
  );

  return { outDir, pieceFiles: batch.pieces.length };
}
