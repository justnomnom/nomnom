import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import {
  listNameFromSubscriptionRow,
  subscriptionCancelledHtml,
} from '../subscription-cancelled-email.js';

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

test('subscriptionCancelledHtml: parchment chrome, readable wordmark, escaped list name', () => {
  const html = subscriptionCancelledHtml({
    listName: 'Tascas & <script>',
    accessEndsAt: '2026-09-15T00:00:00.000Z',
    reason: null,
  });
  assert.ok(html.includes('background-color:#faf9f5'));
  assert.ok(html.includes('color:#B8481F'));
  assert.ok(html.includes('color:#15130f'));
  assert.ok(html.includes('color:#6e6657'));
  assert.ok(!html.includes('font-weight:800;color:#FF6B35'));
  assert.ok(!html.includes('#475569'));
  assert.ok(!html.includes('#94A3B8'));
  assert.ok(!html.includes('#121110'));
  assert.ok(html.includes('Tascas &amp; &lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('Subscription cancelled'));
  assert.ok(html.includes('You won&rsquo;t be charged again.'));
});
