import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBetween, isAfter, calculateDuration, fTimestamp, fDate, fDateTime } from '../format-time.js';

// isBetween
test('isBetween: date within range returns true', () => {
  const start = new Date('2024-01-01');
  const end = new Date('2024-12-31');
  assert.equal(isBetween('2024-06-15', start, end), true);
});
test('isBetween: date equal to start returns true (inclusive)', () => {
  const start = new Date('2024-01-01');
  const end = new Date('2024-12-31');
  assert.equal(isBetween('2024-01-01', start, end), true);
});
test('isBetween: date equal to end returns true (inclusive)', () => {
  const start = new Date('2024-01-01');
  const end = new Date('2024-12-31');
  assert.equal(isBetween('2024-12-31', start, end), true);
});
test('isBetween: date before range returns false', () => {
  const start = new Date('2024-01-01');
  const end = new Date('2024-12-31');
  assert.equal(isBetween('2023-12-31', start, end), false);
});
test('isBetween: date after range returns false', () => {
  const start = new Date('2024-01-01');
  const end = new Date('2024-12-31');
  assert.equal(isBetween('2025-01-01', start, end), false);
});

// isAfter
test('isAfter: later date returns true', () => {
  assert.equal(isAfter('2024-06-01', '2024-01-01'), true);
});
test('isAfter: earlier date returns false', () => {
  assert.equal(isAfter('2024-01-01', '2024-06-01'), false);
});
test('isAfter: same date returns false', () => {
  assert.equal(isAfter('2024-01-01', '2024-01-01'), false);
});
test('isAfter: null startDate returns false', () => {
  assert.equal(isAfter(null, '2024-01-01'), false);
});
test('isAfter: null endDate returns false', () => {
  assert.equal(isAfter('2024-01-01', null), false);
});

// calculateDuration
test('calculateDuration: same start and end = 1 day', () => {
  assert.equal(calculateDuration('2024-06-01', '2024-06-01'), 1);
});
test('calculateDuration: consecutive days = 2 days (inclusive)', () => {
  assert.equal(calculateDuration('2024-06-01', '2024-06-02'), 2);
});
test('calculateDuration: 7-day span = 7', () => {
  assert.equal(calculateDuration('2024-01-01', '2024-01-07'), 7);
});
test('calculateDuration: missing startDate returns 1', () => {
  assert.equal(calculateDuration(null, '2024-06-01'), 1);
});
test('calculateDuration: missing endDate returns 1', () => {
  assert.equal(calculateDuration('2024-06-01', null), 1);
});
test('calculateDuration: end before start returns 1', () => {
  assert.equal(calculateDuration('2024-06-10', '2024-06-01'), 1);
});

// fTimestamp
test('fTimestamp: returns numeric ms for a valid date', () => {
  const ts = fTimestamp('2024-01-15T12:00:00Z');
  assert.ok(typeof ts === 'number' && ts > 0, `expected positive number, got ${ts}`);
});
test('fTimestamp: empty string for falsy', () => {
  assert.equal(fTimestamp(null), '');
  assert.equal(fTimestamp(''), '');
});

// fDate (deterministic with explicit ISO dates)
test('fDate: formats date as dd MMM yyyy by default', () => {
  const result = fDate('2024-01-15');
  assert.equal(result, '15 Jan 2024');
});
test('fDate: respects custom format', () => {
  const result = fDate('2024-03-20', 'yyyy/MM/dd');
  assert.equal(result, '2024/03/20');
});
test('fDate: empty string for falsy input', () => {
  assert.equal(fDate(null), '');
  assert.equal(fDate(''), '');
});
