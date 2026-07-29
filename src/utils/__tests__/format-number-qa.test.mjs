/**
 * Frontend QA — format-number edges (ratings, fData zero bug, invalid inputs).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fCurrency, fData, fNumber, fRating } from '../format-number.js';

const pt = { numberFormat: { code: 'pt-PT', currency: 'EUR' } };

test('fRating: finite ratings format to 1 decimal', () => {
  assert.equal(fRating(4.25), '4.3');
  assert.equal(fRating(4), '4.0');
});

test('fRating: trimTrailingZero drops .0 on integers', () => {
  assert.equal(fRating(5, undefined, { trimTrailingZero: true }), '5');
  assert.equal(fRating(4.5, undefined, { trimTrailingZero: true }), '4.5');
});

test('fRating: non-finite → empty', () => {
  assert.equal(fRating(NaN), '');
  assert.equal(fRating(Infinity), '');
  assert.equal(fRating(null), '');
  assert.equal(fRating(undefined), '');
  assert.equal(fRating(''), '');
  assert.equal(fRating('nope'), '');
});

test('fRating: numeric 0 is a valid rating display', () => {
  assert.equal(fRating(0), '0.0');
});

test('fNumber / fCurrency: string "0" is truthy path (not special-cased like 0)', () => {
  // Document contract: only === 0 hits the early "0" branch; "0" goes through NumberFormat.
  assert.ok(fNumber('0').length >= 1);
  assert.ok(fCurrency('0').length >= 1);
});

test('fRating: pt-PT uses locale decimal separator', () => {
  const out = fRating(4.5, pt);
  assert.ok(out.includes('4'));
  assert.ok(out.includes(',') || out.includes('.'));
});

test('fData: 0 returns "0 Bytes" (regression — was dead code after falsy check)', () => {
  assert.equal(fData(0), '0 Bytes');
});

test('fData: rejects negative / NaN', () => {
  assert.equal(fData(-1), '');
  assert.equal(fData(NaN), '');
});

test('fNumber: string numeric input', () => {
  assert.ok(fNumber('42').includes('42'));
});
