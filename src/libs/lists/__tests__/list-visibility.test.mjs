import assert from 'node:assert/strict';
import { test } from 'node:test';

import { normalizeListVisibility } from '../list-visibility.js';

test('normalizeListVisibility: canonical trio', () => {
  assert.equal(normalizeListVisibility('private'), 'private');
  assert.equal(normalizeListVisibility('public'), 'public');
  assert.equal(normalizeListVisibility('public_subscribers'), 'public_subscribers');
  assert.equal(normalizeListVisibility('  public  '), 'public');
});

test('normalizeListVisibility: junk / non-string → private', () => {
  assert.equal(normalizeListVisibility('PUBLIC'), 'private');
  assert.equal(normalizeListVisibility(''), 'private');
  assert.equal(normalizeListVisibility(null), 'private');
  assert.equal(normalizeListVisibility({}), 'private');
});
