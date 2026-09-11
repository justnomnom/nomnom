import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { subscriptionStatusLabel } from '../subscription-status-label.js';

const EN = {
  'common.subscription_status.active': 'Active',
  'common.subscription_status.trialing': 'Trial',
  'common.subscription_status.past_due': 'Past due',
  'common.subscription_status.unpaid': 'Unpaid',
  'common.subscription_status.canceled': 'Cancelled',
  'common.subscription_status.incomplete': 'Incomplete',
  'common.subscription_status.incomplete_expired': 'Expired',
  'common.subscription_status.paused': 'Paused',
};

function t(key) {
  return EN[key] || key;
}

describe('subscriptionStatusLabel', () => {
  it('uses British cancelled, never the Stripe canceled code', () => {
    assert.equal(subscriptionStatusLabel('canceled', t), 'Cancelled');
    assert.notEqual(subscriptionStatusLabel('canceled', t), 'canceled');
  });

  it('maps the rest of Stripe statuses to sentence-case labels', () => {
    assert.equal(subscriptionStatusLabel('active', t), 'Active');
    assert.equal(subscriptionStatusLabel('trialing', t), 'Trial');
    assert.equal(subscriptionStatusLabel('past_due', t), 'Past due');
    assert.equal(subscriptionStatusLabel('paused', t), 'Paused');
  });

  it('returns empty for missing status and spaces unknown codes', () => {
    assert.equal(subscriptionStatusLabel('', t), '');
    assert.equal(subscriptionStatusLabel(null, t), '');
    assert.equal(subscriptionStatusLabel('not_a_status', t), 'not a status');
  });
});
