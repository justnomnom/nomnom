/**
 * Run: node --test src/libs/lists/__tests__/article-list-confirm.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveExtractDecision, resolveArticleListConfirm } from '../article-list-confirm.js';

const ramiro = {
  name: 'Cervejaria Ramiro',
  status: 'matched',
  restaurant_id: 'uuid-ramiro',
  candidates: [],
  decision: 'accept',
  picked_id: null,
};

test('accept uses restaurant_id', () => {
  const r = resolveExtractDecision(ramiro);
  assert.equal(r.ok, true);
  assert.equal(r.restaurantId, 'uuid-ramiro');
});

test('pick uses picked_id in candidates', () => {
  const r = resolveExtractDecision({
    name: 'Chiado spot',
    decision: 'pick',
    restaurant_id: null,
    picked_id: 'uuid-b',
    candidates: [
      { id: 'uuid-a', name: 'A' },
      { id: 'uuid-b', name: 'B' },
    ],
  });
  assert.equal(r.ok, true);
  assert.equal(r.restaurantId, 'uuid-b');
});

test('drop uses neither id', () => {
  const r = resolveExtractDecision({
    name: 'Missing',
    decision: 'drop',
    restaurant_id: null,
    picked_id: null,
    candidates: [],
  });
  assert.equal(r.ok, true);
  assert.equal(r.restaurantId, null);
});

test('refuse mixed accept+picked_id', () => {
  const r = resolveExtractDecision({ ...ramiro, picked_id: 'other' });
  assert.equal(r.ok, false);
});

test('refuse pick whose id is not in candidates', () => {
  const r = resolveExtractDecision({
    name: 'X',
    decision: 'pick',
    picked_id: 'nope',
    candidates: [{ id: 'uuid-a', name: 'A' }],
  });
  assert.equal(r.ok, false);
});

test('review requires list_name, confirmed_at, every decision', () => {
  const bad = resolveArticleListConfirm({ list_name: '', extracted: [ramiro], confirmed_at: '2026-08-21' });
  assert.equal(bad.ok, false);

  const unconfirmed = resolveArticleListConfirm({ list_name: 'Weekend', extracted: [ramiro] });
  assert.equal(unconfirmed.ok, false);

  const viaFlag = resolveArticleListConfirm(
    { list_name: 'Weekend', extracted: [ramiro] },
    { iConfirmed: true }
  );
  assert.equal(viaFlag.ok, true);
  assert.deepEqual(viaFlag.restaurantIds, ['uuid-ramiro']);
});

test('drop rows are omitted from restaurantIds', () => {
  const r = resolveArticleListConfirm(
    {
      list_name: 'Weekend',
      confirmed_at: '2026-08-21T00:00:00Z',
      extracted: [ramiro, { name: 'Ghost', decision: 'drop', restaurant_id: null, picked_id: null, candidates: [] }],
    }
  );
  assert.equal(r.ok, true);
  assert.deepEqual(r.restaurantIds, ['uuid-ramiro']);
});
