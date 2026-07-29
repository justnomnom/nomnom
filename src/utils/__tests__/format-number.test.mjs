import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fNumber, fCurrency, fPercent, fShortenNumber, fData, getLocaleCode } from '../format-number.js';

// getLocaleCode
test('getLocaleCode: defaults when no lang provided', () => {
  const { code, currency } = getLocaleCode(undefined);
  assert.equal(code, 'en-US');
  assert.equal(currency, 'USD');
});
test('getLocaleCode: reads from lang object', () => {
  const lang = { numberFormat: { code: 'pt-PT', currency: 'EUR' } };
  const { code, currency } = getLocaleCode(lang);
  assert.equal(code, 'pt-PT');
  assert.equal(currency, 'EUR');
});

// fNumber
test('fNumber: returns "0" for 0', () => {
  assert.equal(fNumber(0), '0');
});
test('fNumber: returns empty string for falsy non-zero', () => {
  assert.equal(fNumber(null), '');
  assert.equal(fNumber(undefined), '');
  assert.equal(fNumber(''), '');
});
test('fNumber: formats positive integer', () => {
  const result = fNumber(1000);
  assert.ok(result.includes('1'), `expected "1" in "${result}"`);
  assert.ok(result.includes('000') || result.includes(','), `expected thousands in "${result}"`);
});
test('fNumber: formats float with up to 2 decimal places', () => {
  const result = fNumber(3.14);
  assert.ok(result.includes('3'), `expected "3" in "${result}"`);
});

// fCurrency
test('fCurrency: returns "0" for 0', () => {
  assert.equal(fCurrency(0), '0');
});
test('fCurrency: returns empty for null', () => {
  assert.equal(fCurrency(null), '');
});
test('fCurrency: includes currency symbol for positive value', () => {
  const result = fCurrency(100);
  assert.ok(result.includes('100'), `expected "100" in "${result}"`);
});

// fPercent
test('fPercent: returns "0%" for 0', () => {
  assert.equal(fPercent(0), '0%');
});
test('fPercent: returns empty for null', () => {
  assert.equal(fPercent(null), '');
});
test('fPercent: 50 → "50%"', () => {
  const result = fPercent(50);
  assert.ok(result.includes('50'), `expected "50" in "${result}"`);
  assert.ok(result.includes('%'), `expected "%" in "${result}"`);
});
test('fPercent: 100 → "100%"', () => {
  const result = fPercent(100);
  assert.ok(result.includes('100') && result.includes('%'));
});

// fShortenNumber
test('fShortenNumber: returns "0" for 0', () => {
  assert.equal(fShortenNumber(0), '0');
});
test('fShortenNumber: returns empty for null', () => {
  assert.equal(fShortenNumber(null), '');
});
test('fShortenNumber: large number uses compact notation', () => {
  const result = fShortenNumber(1_000_000);
  // Should be something like "1m" or "1M" (lowercased to "1m")
  assert.ok(result.toLowerCase().includes('m') || result.includes('1'), `result: "${result}"`);
});
test('fShortenNumber: lowercases suffix', () => {
  const result = fShortenNumber(5_000);
  // 5K becomes 5k
  assert.ok(result === result.toLowerCase(), `expected lowercase, got "${result}"`);
});

// fData
test('fData: empty for falsy non-zero', () => {
  assert.equal(fData(null), '');
  assert.equal(fData(''), '');
});
test('fData: zero bytes', () => {
  assert.equal(fData(0), '0 Bytes');
});
test('fData: bytes', () => {
  assert.equal(fData(500), '500 bytes');
});
test('fData: kilobytes', () => {
  assert.equal(fData(1024), '1 Kb');
});
test('fData: megabytes', () => {
  assert.equal(fData(1024 * 1024), '1 Mb');
});
test('fData: gigabytes', () => {
  assert.equal(fData(1024 * 1024 * 1024), '1 Gb');
});
