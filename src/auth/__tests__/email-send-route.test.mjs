/**
 * POST /api/email/send field validation and auth (internal outbound route).
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';

process.env.EMAIL_OUTBOUND_SECRET = process.env.EMAIL_OUTBOUND_SECRET || 'outbound-secret';
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 're_test';
process.env.RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'NomNom <from@test.co>';

/** @type {boolean} */
let rateOk = true;
/** @type {object | null} */
let lastSend = null;

mock.module('src/libs/email/rate-limit.js', {
  exports: {
    rateLimitTake: async () => rateOk,
  },
});

mock.module('src/libs/email/resend-server-send.js', {
  exports: {
    sendResendEmail: async (payload) => {
      lastSend = payload;
      return { data: { id: 'msg_1' } };
    },
  },
});

mock.module('src/libs/crypto/timing-safe-secret.js', {
  exports: {
    isValidSecret: (token, secret) => Boolean(token) && token === secret,
  },
});

const { POST } = await import('../../app/(frontend)/api/email/send/route.js');

/**
 * @param {object} body
 * @param {Record<string, string>} [headerOverrides]
 */
function req(body, headerOverrides = {}) {
  const headers = new Headers({
    authorization: `Bearer ${process.env.EMAIL_OUTBOUND_SECRET}`,
    'content-type': 'application/json',
    ...headerOverrides,
  });
  return {
    headers,
    json: async () => body,
  };
}

describe('POST /api/email/send', { concurrency: false }, () => {
  beforeEach(() => {
    rateOk = true;
    lastSend = null;
  });

  test('rate limit → 429', async () => {
    rateOk = false;
    const res = await POST(req({ to: 'a@b.co', subject: 's', html: '<p>h</p>' }));
    assert.equal(res.status, 429);
  });

  test('missing bearer → 401', async () => {
    const res = await POST(req({ to: 'a@b.co', subject: 's', html: '<p>h</p>' }, { authorization: '' }));
    assert.equal(res.status, 401);
  });

  test('wrong bearer → 401', async () => {
    const res = await POST(
      req({ to: 'a@b.co', subject: 's', html: '<p>h</p>' }, { authorization: 'Bearer nope' })
    );
    assert.equal(res.status, 401);
  });

  test('missing to → 400', async () => {
    const res = await POST(req({ subject: 's', html: '<p>h</p>' }));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'Recipient email address is required');
  });

  test('invalid to → 400', async () => {
    const res = await POST(req({ to: 'not-an-email', subject: 's', html: '<p>h</p>' }));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'Invalid email address format');
  });

  test('empty to array → 400', async () => {
    const res = await POST(req({ to: [], subject: 's', html: '<p>h</p>' }));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'Email array cannot be empty');
  });

  test('too many recipients → 400', async () => {
    const to = Array.from({ length: 11 }, (_, i) => `u${i}@b.co`);
    const res = await POST(req({ to, subject: 's', html: '<p>h</p>' }));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'Maximum 10 recipients allowed');
  });

  test('subject too long → 400', async () => {
    const res = await POST(req({ to: 'a@b.co', subject: 's'.repeat(201), html: '<p>h</p>' }));
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /200 characters/);
  });

  test('missing subject/body → 400', async () => {
    const res = await POST(req({ to: 'a@b.co', subject: 'Hello' }));
    assert.equal(res.status, 400);
    assert.match((await res.json()).error, /subject and either html or text/);
  });

  test('valid payload sends via Resend', async () => {
    const res = await POST(req({ to: 'a@b.co', subject: 'Hello', text: 'hi' }));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.id, 'msg_1');
    assert.deepEqual(lastSend?.to, ['a@b.co']);
    assert.equal(lastSend?.subject, 'Hello');
  });
});
