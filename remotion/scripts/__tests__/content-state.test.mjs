import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, describe, it } from 'node:test';

import {
  DEFAULT_COOLDOWN_DAYS,
  HISTORY_LIMIT,
  daysSinceProduced,
  emptyLedger,
  isCoolingDown,
  loadLedger,
  newBatchId,
  recordProduced,
  saveLedger,
  subjectKey,
  subjectsOfKind,
} from '../lib/content-state.mjs';

const dir = mkdtempSync(join(tmpdir(), 'nomnom-ledger-'));
after(() => rmSync(dir, { recursive: true, force: true }));

const AUG_14 = new Date('2026-08-14T12:00:00.000Z');
const daysBefore = (n) => new Date(AUG_14.getTime() - n * 86_400_000);

describe('ledger persistence', () => {
  it('treats a missing file as a first run', () => {
    assert.deepEqual(loadLedger(join(dir, 'nope.json')), emptyLedger());
  });

  it('round-trips through disk', () => {
    const path = join(dir, 'ledger.json');
    const ledger = recordProduced(emptyLedger(), { kind: 'restaurant', id: 'r1', name: 'Casa Lupo' }, AUG_14);
    saveLedger(ledger, path, AUG_14);
    const reloaded = loadLedger(path);
    assert.equal(reloaded.updatedAt, AUG_14.toISOString());
    assert.equal(reloaded.subjects[subjectKey('restaurant', 'r1')].name, 'Casa Lupo');
  });

  it('refuses a corrupt ledger rather than silently starting over', () => {
    const path = join(dir, 'broken.json');
    writeFileSync(path, '{ not json');
    assert.throws(() => loadLedger(path), /not valid JSON/);
    writeFileSync(path, '{"version":1}');
    assert.throws(() => loadLedger(path), /missing a "subjects" object/);
  });
});

describe('recordProduced', () => {
  it('accumulates runs and keeps the first-produced date', () => {
    let ledger = emptyLedger();
    ledger = recordProduced(ledger, { kind: 'restaurant', id: 'r1', name: 'Casa Lupo', batchId: 'b1' }, daysBefore(10));
    ledger = recordProduced(ledger, { kind: 'restaurant', id: 'r1', batchId: 'b2' }, AUG_14);
    const s = ledger.subjects[subjectKey('restaurant', 'r1')];
    assert.equal(s.count, 2);
    assert.equal(s.name, 'Casa Lupo', 'name carries forward when a later run omits it');
    assert.equal(s.firstProducedAt, daysBefore(10).toISOString());
    assert.equal(s.lastProducedAt, AUG_14.toISOString());
    assert.equal(s.history[0].batchId, 'b2', 'newest run first');
  });

  it('caps history', () => {
    let ledger = emptyLedger();
    for (let i = 0; i < HISTORY_LIMIT + 5; i += 1) {
      ledger = recordProduced(ledger, { kind: 'list', id: 'l1', batchId: `b${i}` }, daysBefore(i));
    }
    const s = ledger.subjects[subjectKey('list', 'l1')];
    assert.equal(s.history.length, HISTORY_LIMIT);
    assert.equal(s.count, HISTORY_LIMIT + 5, 'count keeps the true total');
  });

  it('rejects unknown kinds and missing ids', () => {
    assert.throws(() => recordProduced(emptyLedger(), { kind: 'tweet', id: 'x' }), /Unknown subject kind/);
    assert.throws(() => recordProduced(emptyLedger(), { kind: 'list' }), /needs a subject id/);
  });
});

describe('cooldown', () => {
  const ledger = recordProduced(emptyLedger(), { kind: 'restaurant', id: 'r1' }, daysBefore(10));

  it('reports age in whole days', () => {
    assert.equal(daysSinceProduced(ledger, 'restaurant', 'r1', AUG_14), 10);
    assert.equal(daysSinceProduced(ledger, 'restaurant', 'unknown', AUG_14), null);
  });

  it('holds a subject back until the cooldown elapses', () => {
    assert.equal(isCoolingDown(ledger, 'restaurant', 'r1', { cooldownDays: 45, now: AUG_14 }), true);
    assert.equal(isCoolingDown(ledger, 'restaurant', 'r1', { cooldownDays: 10, now: AUG_14 }), false, 'exactly at the cooldown is eligible');
    assert.equal(isCoolingDown(ledger, 'restaurant', 'r1', { cooldownDays: 0, now: AUG_14 }), false);
  });

  it('always allows a never-produced subject', () => {
    assert.equal(isCoolingDown(ledger, 'restaurant', 'fresh', { cooldownDays: DEFAULT_COOLDOWN_DAYS, now: AUG_14 }), false);
  });
});

describe('helpers', () => {
  it('lists a kind newest first', () => {
    let ledger = emptyLedger();
    ledger = recordProduced(ledger, { kind: 'list', id: 'old' }, daysBefore(30));
    ledger = recordProduced(ledger, { kind: 'list', id: 'new' }, AUG_14);
    ledger = recordProduced(ledger, { kind: 'restaurant', id: 'r' }, AUG_14);
    assert.deepEqual(subjectsOfKind(ledger, 'list').map((s) => s.id), ['new', 'old']);
  });

  it('builds sortable batch ids', () => {
    assert.equal(newBatchId(AUG_14), '20260814T120000Z');
    assert.ok(newBatchId(daysBefore(1)) < newBatchId(AUG_14));
  });
});
