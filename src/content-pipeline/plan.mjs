import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PIPELINE_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../content/pipeline');

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * Load catalog + packs from content/pipeline.
 */
export function loadPipeline() {
  const catalog = JSON.parse(readFileSync(join(PIPELINE_DIR, 'catalog.json'), 'utf8'));
  const { packs } = JSON.parse(readFileSync(join(PIPELINE_DIR, 'packs.json'), 'utf8'));
  return { catalog, packs };
}

/**
 * Stable non-crypto hash so the same date always picks the same iteration.
 */
export function hash32(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Parse YYYY-MM-DD as a UTC calendar day.
 */
export function parseIsoDate(isoDate) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || ''));
  if (!match) {
    throw new Error(`Expected YYYY-MM-DD, got "${isoDate}"`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date "${isoDate}"`);
  }
  return utc;
}

function formatIsoDate(date) {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function pick(list, seed) {
  if (!list?.length) return null;
  return list[hash32(seed) % list.length];
}

export function pickRotate(list, index) {
  if (!list?.length) return null;
  const n = ((index % list.length) + list.length) % list.length;
  return list[n];
}

export function packsForType(packs, type, featureId) {
  return packs.filter((pack) => {
    if (!pack.types.includes(type)) return false;
    if (featureId && type === 'feature_reel') return pack.featureId === featureId;
    return true;
  });
}

export function fillCopy(iteration, pack) {
  const copy = pack?.copy || {};
  const fields = iteration.fields || [];
  const filled = {};
  for (const field of fields) {
    const direct = copy[`${field}_pt`];
    filled[field] = direct || copy.hook_pt || copy.cta_pt || '';
  }
  if (!fields.length && pack) {
    filled.hook = copy.hook_pt;
    filled.cta = copy.cta_pt;
  }
  return filled;
}

export function featureIdFor(typeDef, pack, seed) {
  if (!typeDef.featureIds) return pack?.featureId || null;
  if (pack?.featureId && typeDef.featureIds.includes(pack.featureId)) return pack.featureId;
  return pick(typeDef.featureIds, seed);
}

export function produceHint(catalog, type, featureId) {
  const producer = catalog.producers[type];
  if (!producer) return { skill: null, command: null };
  const command = producer.command
    ? producer.command.replaceAll('{{featureId}}', featureId || 'feed')
    : null;
  return { skill: producer.skill, command };
}

function buildSlot({ catalog, packs, isoDate, slot, epochDay }) {
  const typeDef = catalog.types[slot.type];
  if (!typeDef) {
    throw new Error(`Unknown content type "${slot.type}"`);
  }
  const slotIndex = ['hero', 'social', 'engage', 'inbound'].indexOf(slot.id) + 1;
  const iteration = pickRotate(typeDef.iterations, epochDay + slotIndex);
  const typePacks = packsForType(packs, slot.type);
  const pack =
    typeDef.source === 'db' || typeDef.source === 'news'
      ? null
      : pickRotate(typePacks, epochDay + slotIndex) || pick(typePacks, `${isoDate}:${slot.id}:pack`);
  const featureId = featureIdFor(typeDef, pack, `${isoDate}:${slot.id}:feature`);
  const producer = produceHint(catalog, slot.type, featureId);

  return {
    slot: slot.id,
    type: slot.type,
    typeLabel: typeDef.label,
    source: typeDef.source,
    formats: typeDef.formats,
    iteration: {
      id: iteration.id,
      label: iteration.label,
      hookRule: iteration.hook_rule || null,
    },
    pack: pack
      ? {
          id: pack.id,
          pillar: pack.pillar,
          seoPath: pack.seoPath || null,
          facts: pack.facts,
        }
      : null,
    featureId: typeDef.featureIds || pack?.featureId ? featureId : null,
    copy: fillCopy(iteration, pack),
    producer,
    honesty: {
      inventRestaurants: false,
      publish: false,
      needsLiveSubject: typeDef.source === 'db' || typeDef.source === 'news',
    },
  };
}

/**
 * Plan every slot for one UTC calendar day.
 */
export function planDay(isoDate, pipeline = loadPipeline()) {
  const { catalog, packs } = pipeline;
  const date = parseIsoDate(isoDate);
  const weekday = WEEKDAYS[date.getUTCDay()];
  const rhythm = catalog.rhythm.find((row) => row.weekday === weekday);
  if (!rhythm) {
    throw new Error(`No rhythm for ${weekday}`);
  }
  const epochDay = Math.floor(date.getTime() / 86_400_000);

  const slots = rhythm.slots.map((slot) =>
    buildSlot({ catalog, packs, isoDate, slot, epochDay })
  );

  return {
    date: isoDate,
    weekday,
    neverPublish: catalog.neverPublish,
    language: catalog.languages,
    slots,
  };
}

/**
 * Plan `count` consecutive days starting at isoDate.
 */
export function planRange(isoDate, count, pipeline = loadPipeline()) {
  const start = parseIsoDate(isoDate);
  const days = [];
  for (let i = 0; i < count; i += 1) {
    days.push(planDay(formatIsoDate(addUtcDays(start, i)), pipeline));
  }
  return days;
}

/**
 * Every type in the catalog must have ≥2 named iterations.
 */
export function iterationCoverage(catalog) {
  return Object.entries(catalog.types).map(([id, def]) => ({
    id,
    count: def.iterations.length,
    ids: def.iterations.map((item) => item.id),
  }));
}
