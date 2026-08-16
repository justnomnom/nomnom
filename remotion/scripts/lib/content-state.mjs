// Produced-asset ledger for the content machine.
//
// One JSON file records every subject a reel has been produced for, so the
// subject picker can skip anything that went out recently and the batch runner
// can prove what it made. Pure functions here; the only IO is load/save.
//
// Ledger shape:
//   {
//     version: 1,
//     updatedAt: "2026-08-14T21:00:00.000Z",
//     subjects: {
//       "restaurant:<uuid>": {
//         kind, id, name, count,
//         firstProducedAt, lastProducedAt,
//         history: [{ batchId, producedAt, composition, assets: [...] }]
//       }
//     }
//   }

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REMOTION_ROOT = join(__dirname, '..', '..');
export const QUEUE_ROOT = join(REMOTION_ROOT, 'content-queue');
export const LEDGER_PATH = join(QUEUE_ROOT, 'ledger.json');

export const LEDGER_VERSION = 1;
/** Runs kept per subject; enough to see a pattern, not enough to bloat the file. */
export const HISTORY_LIMIT = 10;
/** Days a subject rests before it can be picked again. */
export const DEFAULT_COOLDOWN_DAYS = 45;

// A restaurant reel and a review spotlight of the same venue are different
// subjects: different composition, different cut, so they cool down separately.
export const KINDS = ['restaurant', 'review', 'list'];

const MS_PER_DAY = 86_400_000;

/** Stable key for a subject. */
export const subjectKey = (kind, id) => `${kind}:${id}`;

export const emptyLedger = () => ({ version: LEDGER_VERSION, updatedAt: null, subjects: {} });

/**
 * Read the ledger from disk. A missing file is a normal first run, not an error;
 * a corrupt one is loud, because silently starting over would re-produce
 * everything that already went out.
 */
export function loadLedger(path = LEDGER_PATH) {
  if (!existsSync(path)) return emptyLedger();
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    throw new Error(`Ledger at ${path} is not valid JSON (${e.message}). Fix or delete it before running.`);
  }
  if (!parsed || typeof parsed !== 'object' || typeof parsed.subjects !== 'object' || parsed.subjects === null) {
    throw new Error(`Ledger at ${path} is missing a "subjects" object.`);
  }
  return { version: parsed.version ?? LEDGER_VERSION, updatedAt: parsed.updatedAt ?? null, subjects: parsed.subjects };
}

export function saveLedger(ledger, path = LEDGER_PATH, now = new Date()) {
  mkdirSync(dirname(path), { recursive: true });
  const out = { ...ledger, version: LEDGER_VERSION, updatedAt: now.toISOString() };
  writeFileSync(path, `${JSON.stringify(out, null, 2)}\n`);
  return out;
}

export const getSubject = (ledger, kind, id) => ledger.subjects[subjectKey(kind, id)] ?? null;

/** ISO string of the last production, or null if this subject is untouched. */
export function lastProducedAt(ledger, kind, id) {
  return getSubject(ledger, kind, id)?.lastProducedAt ?? null;
}

/** Whole days since the last production, or null if never produced. */
export function daysSinceProduced(ledger, kind, id, now = new Date()) {
  const last = lastProducedAt(ledger, kind, id);
  if (!last) return null;
  const then = Date.parse(last);
  if (Number.isNaN(then)) return null;
  return Math.floor((now.getTime() - then) / MS_PER_DAY);
}

/** True while a subject is still resting. Never-produced subjects are always eligible. */
export function isCoolingDown(ledger, kind, id, { cooldownDays = DEFAULT_COOLDOWN_DAYS, now = new Date() } = {}) {
  const days = daysSinceProduced(ledger, kind, id, now);
  return days !== null && days < cooldownDays;
}

/**
 * Record one produced asset set. Mutates and returns the ledger so a batch can
 * record several subjects before a single save.
 */
export function recordProduced(ledger, entry, now = new Date()) {
  const { kind, id, name = null, batchId = null, composition = null, assets = [] } = entry ?? {};
  if (!KINDS.includes(kind)) throw new Error(`Unknown subject kind "${kind}" (expected ${KINDS.join(' | ')}).`);
  if (!id) throw new Error('recordProduced needs a subject id.');

  const producedAt = now.toISOString();
  const key = subjectKey(kind, id);
  const existing = ledger.subjects[key];
  const run = { batchId, producedAt, composition, assets };

  ledger.subjects[key] = {
    kind,
    id,
    name: name ?? existing?.name ?? null,
    count: (existing?.count ?? 0) + 1,
    firstProducedAt: existing?.firstProducedAt ?? producedAt,
    lastProducedAt: producedAt,
    history: [run, ...(existing?.history ?? [])].slice(0, HISTORY_LIMIT),
  };
  return ledger;
}

/** Every subject of a kind, most recently produced first. */
export function subjectsOfKind(ledger, kind) {
  return Object.values(ledger.subjects)
    .filter((s) => s.kind === kind)
    .sort((a, b) => String(b.lastProducedAt ?? '').localeCompare(String(a.lastProducedAt ?? '')));
}

/** Batch ids are sortable timestamps: 20260814T211500Z. */
export function newBatchId(now = new Date()) {
  return `${now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}`;
}
