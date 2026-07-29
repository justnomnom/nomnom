import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flattenArray } from '../flatten-array.js';

test('flat list (no children) returns same items', () => {
  const input = [{ id: 1 }, { id: 2 }];
  const result = flattenArray(input);
  assert.deepEqual(result, [{ id: 1 }, { id: 2 }]);
});

test('single level of children flattened', () => {
  const input = [
    { id: 1, children: [{ id: 2 }, { id: 3 }] },
    { id: 4 },
  ];
  const result = flattenArray(input);
  assert.ok(result.some((r) => r.id === 1));
  assert.ok(result.some((r) => r.id === 2));
  assert.ok(result.some((r) => r.id === 3));
  assert.ok(result.some((r) => r.id === 4));
  assert.equal(result.length, 4);
});

test('nested children (2 levels) all included', () => {
  const input = [
    {
      id: 1,
      children: [{ id: 2, children: [{ id: 3 }] }],
    },
  ];
  const result = flattenArray(input);
  assert.equal(result.length, 3);
  assert.ok(result.some((r) => r.id === 3));
});

test('custom key works', () => {
  const input = [{ id: 1, items: [{ id: 2 }] }];
  const result = flattenArray(input, 'items');
  assert.equal(result.length, 2);
  assert.ok(result.some((r) => r.id === 2));
});

test('empty array returns empty array', () => {
  assert.deepEqual(flattenArray([]), []);
});

test('null/undefined input returns empty array', () => {
  assert.deepEqual(flattenArray(null), []);
  assert.deepEqual(flattenArray(undefined), []);
});
