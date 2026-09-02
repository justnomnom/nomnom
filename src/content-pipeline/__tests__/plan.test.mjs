import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { hash32, iterationCoverage, loadPipeline, planDay, planRange } from '../plan.mjs';

describe('daily content pipeline', () => {
  const pipeline = loadPipeline();

  test('every type has at least three distinct iterations', () => {
    const coverage = iterationCoverage(pipeline.catalog);
    assert.ok(coverage.length >= 10);
    for (const row of coverage) {
      assert.ok(row.count >= 3, `${row.id} only has ${row.count} iterations`);
      const iterationIds = row.ids;
      assert.equal(new Set(iterationIds).size, iterationIds.length, `${row.id} has duplicate iteration ids`);
    }
  });

  test('weekly rhythm covers every type', () => {
    const scheduled = new Set(pipeline.catalog.rhythm.flatMap((day) => day.slots.map((s) => s.type)));
    for (const typeId of Object.keys(pipeline.catalog.types)) {
      assert.ok(scheduled.has(typeId), `${typeId} never appears in the weekly rhythm`);
    }
  });

  test('planDay is deterministic', () => {
    const a = planDay('2026-08-24', pipeline);
    const b = planDay('2026-08-24', pipeline);
    assert.deepEqual(a, b);
    assert.equal(a.weekday, 'mon');
    assert.equal(a.slots.length, 4);
    assert.equal(a.neverPublish, true);
  });

  test('the same type uses different iterations across the week', () => {
    const week = planRange('2026-08-24', 14, pipeline);
    const byType = new Map();
    for (const day of week) {
      for (const slot of day.slots) {
        if (!byType.has(slot.type)) byType.set(slot.type, new Set());
        byType.get(slot.type).add(slot.iteration.id);
      }
    }
    for (const [type, iterations] of byType) {
      assert.ok(
        iterations.size >= 2,
        `${type} did not rotate iterations over 14 days (got ${[...iterations]})`
      );
    }
  });

  test('db and news slots do not smuggle a pack restaurant name', () => {
    const week = planRange('2026-08-24', 7, pipeline);
    for (const day of week) {
      for (const slot of day.slots) {
        if (slot.source === 'db' || slot.source === 'news') {
          assert.equal(slot.pack, null);
          assert.equal(slot.honesty.needsLiveSubject, true);
        }
      }
    }
  });

  test('pack slots keep product facts and never-publish flags', () => {
    const day = planDay('2026-08-26', pipeline);
    const carousel = day.slots.find((s) => s.type === 'carousel');
    assert.ok(carousel.pack?.id);
    assert.ok(carousel.pack.facts.length >= 1);
    assert.equal(carousel.honesty.inventRestaurants, false);
    assert.equal(carousel.honesty.publish, false);
    assert.ok(carousel.copy.hook);
  });

  test('hash32 is stable', () => {
    assert.equal(hash32('nomnom'), hash32('nomnom'));
    assert.notEqual(hash32('nomnom'), hash32('nom nom'));
  });
});
