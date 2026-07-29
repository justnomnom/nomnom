import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import { CANCELLATION_REASONS, normalizeCancellationReason } from '../cancellation-reasons.js';

describe('normalizeCancellationReason', () => {
  test('accepts every published reason', () => {
    CANCELLATION_REASONS.forEach((r) => {
      assert.equal(normalizeCancellationReason(r), r);
    });
  });

  test('trims surrounding whitespace', () => {
    assert.equal(normalizeCancellationReason('  too_expensive '), 'too_expensive');
  });

  test('rejects anything off the list rather than passing it through', () => {
    // The reason becomes an analytics dimension; unbounded values make it uncountable.
    assert.equal(normalizeCancellationReason('because I felt like it'), null);
    assert.equal(normalizeCancellationReason('TOO_EXPENSIVE'), null);
    assert.equal(normalizeCancellationReason(''), null);
  });

  test('non-strings are null', () => {
    assert.equal(normalizeCancellationReason(null), null);
    assert.equal(normalizeCancellationReason(undefined), null);
    assert.equal(normalizeCancellationReason(7), null);
    assert.equal(normalizeCancellationReason({ reason: 'not_using' }), null);
  });

  test('skipping the question is not an error', () => {
    // The picker's default is "Rather not say" — cancelling must never depend on answering.
    assert.equal(normalizeCancellationReason(''), null);
  });
});
