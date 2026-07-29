import assert from 'node:assert/strict';
import { test } from 'node:test';

import { chunkArray } from '../chunk.js';

test('chunkArray splits evenly', () => {
  assert.deepEqual(chunkArray([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});

test('chunkArray returns one chunk when size exceeds length', () => {
  assert.deepEqual(chunkArray(['a', 'b'], 10), [['a', 'b']]);
});

test('chunkArray with size 1 yields one element per chunk', () => {
  assert.deepEqual(chunkArray(['x', 'y'], 1), [['x'], ['y']]);
});

test('chunkArray empty input returns []', () => {
  assert.deepEqual(chunkArray([], 500), []);
});

test('chunkArray non-array input returns []', () => {
  assert.deepEqual(chunkArray(null, 10), []);
  assert.deepEqual(chunkArray(undefined, 10), []);
});

test('chunkArray invalid size returns []', () => {
  assert.deepEqual(chunkArray([1, 2, 3], 0), []);
  assert.deepEqual(chunkArray([1, 2, 3], -1), []);
});
