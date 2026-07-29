import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import { listNameFromSubscriptionRow } from '../subscription-cancelled-email.js';

describe('listNameFromSubscriptionRow', () => {
  test('reads the embed as an object or a single-element array', () => {
    assert.equal(listNameFromSubscriptionRow({ lists: { name: 'Tascas' } }), 'Tascas');
    assert.equal(listNameFromSubscriptionRow({ lists: [{ name: 'Tascas' }] }), 'Tascas');
  });

  test('trims', () => {
    assert.equal(listNameFromSubscriptionRow({ lists: { name: '  Tascas  ' } }), 'Tascas');
  });

  test('returns null when there is no usable name, so the email falls back to generic copy', () => {
    assert.equal(listNameFromSubscriptionRow({ lists: { name: '   ' } }), null);
    assert.equal(listNameFromSubscriptionRow({ lists: [] }), null);
    assert.equal(listNameFromSubscriptionRow({ lists: null }), null);
    assert.equal(listNameFromSubscriptionRow({}), null);
    assert.equal(listNameFromSubscriptionRow(null), null);
  });

  test('ignores a non-string name', () => {
    assert.equal(listNameFromSubscriptionRow({ lists: { name: 42 } }), null);
  });
});
