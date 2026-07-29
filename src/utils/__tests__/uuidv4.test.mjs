import assert from 'node:assert/strict';
import { test } from 'node:test';

import uuidv4 from '../uuidv4.js';

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test('uuidv4: shape matches UUID v4', () => {
  const id = uuidv4();
  assert.match(id, UUID_V4_RE);
});

test('uuidv4: successive calls are usually unique', () => {
  const set = new Set(Array.from({ length: 50 }, () => uuidv4()));
  assert.equal(set.size, 50);
});
