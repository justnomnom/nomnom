import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';

import {
  DEFAULT_VOLUME,
  FILLABLE_TYPES,
  enumerateFillableCombos,
  pieceKey,
  produceMassDay,
  writeMassDay,
} from '../mass.mjs';
import { loadPipeline } from '../plan.mjs';

describe('mass daily content batch', () => {
  const pipeline = loadPipeline();

  test('fillable combos cover every pack type that can be drafted offline', () => {
    const combos = enumerateFillableCombos(pipeline);
    assert.ok(combos.length >= 80, `expected a large combo catalog, got ${combos.length}`);
    const types = new Set(combos.map((combo) => combo.type));
    assert.ok(types.has('carousel'));
    assert.ok(types.has('thread'));
    assert.ok(types.has('ugc_prompt'));
  });

  test('default volume is a mass batch, not four calendar slots', () => {
    const batch = produceMassDay('2026-08-24', { pipeline });
    assert.equal(batch.requestedVolume, DEFAULT_VOLUME);
    assert.equal(batch.volume, DEFAULT_VOLUME);
    assert.equal(batch.neverPublish, true);
    assert.equal(batch.pieces.filter((piece) => piece.lane === 'calendar').length, 4);
    assert.ok(
      batch.pieces.filter((piece) => piece.lane === 'mass').length >= 10,
      'default day should be mostly mass extras, not the four calendar slots'
    );
    const types = new Set(batch.pieces.map((piece) => piece.type));
    for (const typeId of Object.keys(pipeline.catalog.types)) {
      assert.ok(types.has(typeId), `default daily batch missing type ${typeId}`);
    }
  });

  test('a large batch covers every fillable catalog type', () => {
    const batch = produceMassDay('2026-08-24', { pipeline, volume: 80 });
    const types = new Set(batch.pieces.map((piece) => piece.type));
    for (const typeId of FILLABLE_TYPES) {
      if (!pipeline.catalog.types[typeId]) continue;
      assert.ok(types.has(typeId), `batch missing fillable type ${typeId}`);
    }
  });

  test('every piece in a day has a unique type+iteration+pack key', () => {
    const batch = produceMassDay('2026-08-24', { pipeline, volume: 40 });
    const keys = batch.pieces.map(pieceKey);
    assert.equal(new Set(keys).size, keys.length);
  });

  test('honors an explicit volume and stays deterministic', () => {
    const a = produceMassDay('2026-08-25', { pipeline, volume: 20 });
    const b = produceMassDay('2026-08-25', { pipeline, volume: 20 });
    assert.equal(a.volume, 20);
    assert.deepEqual(a, b);
  });

  test('mass extras spread across packs and iterations instead of dumping one pack', () => {
    const batch = produceMassDay('2026-08-24', { pipeline, volume: 24 });
    const extras = batch.pieces.filter((piece) => piece.lane === 'mass');
    const packs = new Set(extras.map((piece) => piece.pack.id));
    const types = new Set(extras.map((piece) => piece.type));
    const iterations = new Set(extras.map((piece) => `${piece.type}:${piece.iteration.id}`));
    assert.ok(packs.size >= 5, `expected several packs, got ${[...packs]}`);
    assert.ok(types.size >= 4, `expected several types, got ${[...types]}`);
    assert.ok(iterations.size >= 10, `expected distinct iterations, got ${iterations.size}`);
  });

  test('consecutive days rotate extras instead of cloning yesterday', () => {
    const mon = produceMassDay('2026-08-24', { pipeline, volume: 24 });
    const tue = produceMassDay('2026-08-25', { pipeline, volume: 24 });
    const monExtras = mon.pieces.filter((piece) => piece.lane === 'mass').map(pieceKey);
    const tueExtras = tue.pieces.filter((piece) => piece.lane === 'mass').map(pieceKey);
    assert.notDeepEqual(monExtras, tueExtras);
  });

  test('db/news calendar slots stay live stubs; mass extras do not invent restaurants', () => {
    const batch = produceMassDay('2026-08-24', { pipeline, volume: 24 });
    for (const piece of batch.pieces) {
      assert.equal(piece.honesty.inventRestaurants, false);
      assert.equal(piece.honesty.publish, false);
      if (piece.source === 'db' || piece.source === 'news') {
        assert.equal(piece.pack, null);
        assert.equal(piece.honesty.needsLiveSubject, true);
      }
      if (piece.lane === 'mass') {
        assert.equal(piece.honesty.needsLiveSubject, false);
        assert.ok(piece.pack?.id);
        assert.ok(piece.pack.facts.length >= 1);
      }
    }
    assert.ok(batch.liveSubjectCount >= 1);
  });

  test('writeMassDay creates REVIEW.md, manifest, and one file per piece', () => {
    const batch = produceMassDay('2026-08-24', { pipeline, volume: 12 });
    const outRoot = mkdtempSync(join(tmpdir(), 'nomnom-mass-'));
    const written = writeMassDay(batch, outRoot);
    const files = readdirSync(join(written.outDir, 'pieces'));
    assert.equal(files.length, 12);
    const review = readFileSync(join(written.outDir, 'REVIEW.md'), 'utf8');
    assert.match(review, /Never publish/);
    assert.match(review, /mass batch \(12 pieces\)/);
    const manifest = JSON.parse(readFileSync(join(written.outDir, 'manifest.json'), 'utf8'));
    assert.equal(manifest.neverPublish, true);
    assert.equal(manifest.volume, 12);
    assert.equal(manifest.pieces.length, 12);
  });
});
