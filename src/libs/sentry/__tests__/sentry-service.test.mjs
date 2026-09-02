/**
 * Sentry service: no-ops when disabled; forwards when DSN + flag are on.
 */
import assert from 'node:assert/strict';
import { describe, mock, test } from 'node:test';

const flags = { sentry: false };
const sentryApi = { dsn: '' };
const captured = {
  exceptions: [],
  messages: [],
  users: [],
  conversations: [],
  contexts: [],
  tags: [],
  breadcrumbs: [],
  isolationAttrs: [],
  logs: [],
  metrics: [],
};

mock.module('src/config-global.js', {
  exports: {
    INTEGRATION_FLAGS: flags,
    SENTRY_API: sentryApi,
  },
});

mock.module('@sentry/nextjs', {
  exports: {
    captureException(error, opts) {
      captured.exceptions.push({ error, opts });
    },
    captureMessage(message, opts) {
      captured.messages.push({ message, opts });
    },
    setUser(user) {
      captured.users.push(user);
    },
    setConversationId(id) {
      captured.conversations.push(id);
    },
    setContext(name, data) {
      captured.contexts.push({ name, data });
    },
    setTags(tags) {
      captured.tags.push(tags);
    },
    addBreadcrumb(breadcrumb) {
      captured.breadcrumbs.push(breadcrumb);
    },
    getIsolationScope() {
      return {
        setAttributes(attrs) {
          captured.isolationAttrs.push(attrs);
        },
      };
    },
    logger: {
      info(message, attrs) {
        captured.logs.push({ level: 'info', message, attrs });
      },
      warn(message, attrs) {
        captured.logs.push({ level: 'warn', message, attrs });
      },
      error(message, attrs) {
        captured.logs.push({ level: 'error', message, attrs });
      },
      fmt(strings, ...values) {
        return { strings, values };
      },
    },
    metrics: {
      count(name, value, opts) {
        captured.metrics.push({ kind: 'count', name, value, opts });
      },
      distribution(name, value, opts) {
        captured.metrics.push({ kind: 'distribution', name, value, opts });
      },
      gauge(name, value, opts) {
        captured.metrics.push({ kind: 'gauge', name, value, opts });
      },
    },
  },
});

const sentry = await import('../sentry-service.js');

describe('sentry-service', { concurrency: false }, () => {
  test('disabled: captureError / captureMessage do not call Sentry', () => {
    flags.sentry = false;
    sentryApi.dsn = '';
    const prevEx = captured.exceptions.length;
    const prevMsg = captured.messages.length;
    sentry.captureError(new Error('x'), { a: 1 });
    sentry.captureMessage('hello', 'warning', { b: 2 });
    sentry.setUser({ id: 'u' });
    sentry.metricsCount('n');
    assert.equal(captured.exceptions.length, prevEx);
    assert.equal(captured.messages.length, prevMsg);
  });

  test('enabled: captureError and captureMessage forward extra context', () => {
    flags.sentry = true;
    sentryApi.dsn = 'https://example@sentry.io/1';
    const err = new Error('boom');
    sentry.captureError(err, { list_id: 'L1' });
    sentry.captureMessage('note', 'warning', { k: 1 });
    const lastEx = captured.exceptions.at(-1);
    const lastMsg = captured.messages.at(-1);
    assert.equal(lastEx.error, err);
    assert.deepEqual(lastEx.opts.extra, { list_id: 'L1' });
    assert.equal(lastMsg.message, 'note');
    assert.equal(lastMsg.opts.level, 'warning');
    assert.deepEqual(lastMsg.opts.extra, { k: 1 });
  });

  test('enabled: setUser, conversation, context, tags, breadcrumb, isolation attrs', () => {
    flags.sentry = true;
    sentryApi.dsn = 'https://example@sentry.io/1';
    sentry.setUser({ id: 'u1' });
    sentry.setConversationId('c1');
    sentry.setContext('checkout', { list_id: 'L' });
    sentry.setTags({ feature: 'table' });
    sentry.addBreadcrumb({ category: 'ui', message: 'click' });
    sentry.setIsolationAttributes({
      'nomnom.feature': 'search',
      nested: { skip: true },
      ok: true,
      n: 2,
    });
    sentry.configureScope({ id: 'u2' }, { req: { id: 'r1' } });
    assert.equal(captured.users.at(-1).id, 'u2');
    assert.equal(captured.conversations.at(-1), 'c1');
    assert.equal(captured.contexts.at(-1).name, 'req');
    assert.deepEqual(captured.tags.at(-1), { feature: 'table' });
    assert.equal(captured.breadcrumbs.at(-1).message, 'click');
    const attrs = captured.isolationAttrs.at(-1);
    assert.equal(attrs['nomnom.feature'], 'search');
    assert.equal(attrs.ok, true);
    assert.equal(attrs.n, 2);
    assert.equal(attrs.nested, undefined);
  });

  test('enabled: structured logs skip non-scalar attributes; metrics forward', () => {
    flags.sentry = true;
    sentryApi.dsn = 'https://example@sentry.io/1';
    sentry.logInfo('i', { a: 'x', skip: {} });
    sentry.logWarn('w');
    sentry.logError('e', { n: 1 });
    sentry.metricsCount('c', 2, { k: 1 });
    sentry.metricsDistribution('d', 12);
    sentry.metricsGauge('g', 3, { t: true });
    const info = captured.logs.find((l) => l.message === 'i');
    assert.deepEqual(info.attrs, { a: 'x' });
    assert.equal(captured.metrics.at(-1).kind, 'gauge');
    const fmt = sentry.logFmt`User ${'u'} done`;
    assert.ok(fmt.strings);
    assert.deepEqual(fmt.values, ['u']);
  });
});
