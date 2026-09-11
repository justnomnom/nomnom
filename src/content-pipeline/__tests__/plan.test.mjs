import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { fillCopy, hash32, iterationCoverage, loadPipeline, planDay, planRange } from '../plan.mjs';

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

  test('fillCopy maps screenshot-walk taps to pack steps, not the hook', () => {
    const follow = pipeline.packs.find((pack) => pack.id === 'follow-the-list');
    const walk = pipeline.catalog.types.carousel.iterations.find((row) => row.id === 'screenshot_walk');
    const copy = fillCopy(walk, follow);
    assert.equal(copy.hook, follow.copy.hook_pt);
    assert.equal(copy.tap_1, follow.copy.step_1_pt);
    assert.equal(copy.tap_2, follow.copy.step_2_pt);
    assert.equal(copy.tap_3, follow.copy.step_3_pt);
    assert.equal(copy.cta, follow.copy.cta_pt);
    assert.equal(new Set([copy.hook, copy.tap_1, copy.tap_2, copy.tap_3, copy.cta]).size, 5);
  });

  test('fillCopy does not clone the hook into story frames or thread beats', () => {
    const maps = pipeline.packs.find((pack) => pack.id === 'maps-graveyard');
    const countdown = pipeline.catalog.types.story.iterations.find((row) => row.id === 'countdown');
    const thread = pipeline.catalog.types.thread.iterations.find((row) => row.id === 'problem_product');
    const poll = pipeline.catalog.types.story.iterations.find((row) => row.id === 'poll');
    const frames = fillCopy(countdown, maps);
    assert.equal(frames.frame_1, maps.copy.hook_pt);
    assert.equal(frames.frame_2, maps.copy.step_2_pt);
    assert.notEqual(frames.frame_2, frames.frame_1);
    assert.equal(frames.cta, maps.copy.cta_pt);

    const beats = fillCopy(thread, maps);
    assert.equal(beats.problem, maps.copy.before_pt);
    assert.equal(beats.turn, maps.copy.after_pt);
    assert.notEqual(beats.problem, beats.hook);

    const sticker = fillCopy(poll, maps);
    assert.equal(sticker.question, maps.copy.question_pt);
    assert.equal(sticker.poll_a, maps.copy.poll_a_pt);
    assert.notEqual(sticker.question, sticker.frame_1);
  });
});
