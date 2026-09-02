/**
 * Sentry beforeSendLog: drop noisy levels/health checks and redact secrets.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { beforeSendLog } from '../before-send-log.js';

test('beforeSendLog: drops debug and trace', () => {
  assert.equal(beforeSendLog({ level: 'debug', message: 'x' }), null);
  assert.equal(beforeSendLog({ level: 'trace', message: 'x' }), null);
});

test('beforeSendLog: drops health-check messages', () => {
  assert.equal(beforeSendLog({ level: 'info', message: 'GET /health 200' }), null);
  assert.equal(beforeSendLog({ level: 'info', message: 'probe /api/health' }), null);
});

test('beforeSendLog: redacts sensitive attribute keys and keeps the log', () => {
  const log = {
    level: 'error',
    message: 'checkout failed',
    attributes: {
      password: 'secret',
      token: 'tok_live',
      apiKey: 'ak',
      api_key: 'ak2',
      authorization: 'Bearer x',
      credit_card: '4242',
      creditCard: '4242',
      list_id: 'abc',
    },
  };
  const out = beforeSendLog(log);
  assert.equal(out, log);
  assert.equal(out.attributes.password, '[REDACTED]');
  assert.equal(out.attributes.token, '[REDACTED]');
  assert.equal(out.attributes.apiKey, '[REDACTED]');
  assert.equal(out.attributes.api_key, '[REDACTED]');
  assert.equal(out.attributes.authorization, '[REDACTED]');
  assert.equal(out.attributes.credit_card, '[REDACTED]');
  assert.equal(out.attributes.creditCard, '[REDACTED]');
  assert.equal(out.attributes.list_id, 'abc');
});

test('beforeSendLog: passes info logs without attributes through', () => {
  const log = { level: 'info', message: 'ok' };
  assert.equal(beforeSendLog(log), log);
});
