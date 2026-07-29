/**
 * Frontend QA — flattenArray edges (empty children, custom key, deep trees).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { flattenArray } from '../flatten-array.js';

test('empty children array does not recurse forever', () => {
  const input = [{ id: 1, children: [] }, { id: 2 }];
  assert.deepEqual(flattenArray(input), input);
});

test('parent with empty children still included once', () => {
  const input = [{ id: 1, children: [] }];
  const result = flattenArray(input);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 1);
});

test('three-level nest includes all nodes', () => {
  const input = [
    {
      id: 'a',
      children: [
        {
          id: 'b',
          children: [{ id: 'c', children: [{ id: 'd' }] }],
        },
      ],
    },
  ];
  const ids = flattenArray(input).map((x) => x.id);
  assert.deepEqual(ids.sort(), ['a', 'b', 'c', 'd']);
});

test('custom key with empty branch', () => {
  const input = [{ id: 1, items: [] }, { id: 2, items: [{ id: 3 }] }];
  const result = flattenArray(input, 'items');
  assert.equal(result.length, 3);
});
