/**
 * Keeps .env.example list price floor aligned with code default (399¢).
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { LIST_PRICE_MIN_CENTS } from '../list-stripe-constants.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

test('.env.example NEXT_PUBLIC_LIST_PRICE_MIN_CENTS is 399', () => {
  const example = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
  const m = example.match(/^NEXT_PUBLIC_LIST_PRICE_MIN_CENTS=(\d+)/m);
  assert.ok(m, 'NEXT_PUBLIC_LIST_PRICE_MIN_CENTS missing from .env.example');
  assert.equal(Number(m[1]), 399);
});

test('LIST_PRICE_MIN_CENTS is 399 when env is unset', () => {
  if (process.env.NEXT_PUBLIC_LIST_PRICE_MIN_CENTS) {
    assert.equal(LIST_PRICE_MIN_CENTS, Number(process.env.NEXT_PUBLIC_LIST_PRICE_MIN_CENTS));
    return;
  }
  assert.equal(LIST_PRICE_MIN_CENTS, 399);
});
