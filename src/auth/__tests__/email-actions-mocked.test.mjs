/**
 * Contact / LLM feedback email actions: validation before Resend.
 */
import assert from 'node:assert/strict';
import { describe, mock, test } from 'node:test';

const sent = [];
let rateLimitOk = true;
let resendConfigured = true;

mock.module('next/headers', {
  exports: {
    headers: async () => ({
      get: () => '127.0.0.1',
    }),
  },
});

mock.module('src/libs/email/rate-limit.js', {
  exports: {
    rateLimitTake: async () => rateLimitOk,
  },
});

const resendApi = {
  get to() {
    return resendConfigured ? 'ops@nomnom.test' : '';
  },
  get key() {
    return resendConfigured ? 'rk' : '';
  },
  get from() {
    return resendConfigured ? 'NomNom <hi@nomnom.test>' : '';
  },
};

mock.module('src/config-global.js', {
  exports: {
    RESEND_API: resendApi,
    FEEDBACK_INBOUND_EMAIL: 'ops@nomnom.test',
  },
});

mock.module('src/libs/email/resend-server-send.js', {
  exports: {
    sendResendEmail: async (payload) => {
      sent.push(payload);
    },
  },
});

const { sendContactInquiryEmail, submitLlmFeedbackEmail } = await import(
  '../actions/email-actions.js'
);

describe('email actions', { concurrency: false }, () => {
  test('sendContactInquiryEmail: rate limit and missing config', async () => {
    rateLimitOk = false;
    resendConfigured = true;
    assert.deepEqual(await sendContactInquiryEmail({ email: 'a@b.co', subject: 's', message: 'm' }), {
      ok: false,
      error: 'You’ve sent a few already — try again in a bit.',
    });
    rateLimitOk = true;
    resendConfigured = false;
    assert.deepEqual(await sendContactInquiryEmail({ email: 'a@b.co', subject: 's', message: 'm' }), {
      ok: false,
      error: 'We can’t send email right now. Try again in a moment.',
    });
  });

  test('sendContactInquiryEmail: field validation', async () => {
    rateLimitOk = true;
    resendConfigured = true;
    assert.equal(
      (await sendContactInquiryEmail({ email: 'not-an-email', subject: 's', message: 'hi' })).error,
      'Please enter a valid email address.'
    );
    assert.equal(
      (await sendContactInquiryEmail({ email: 'a@b.co', subject: '', message: 'hi' })).error,
      'Please choose a topic.'
    );
    assert.equal(
      (await sendContactInquiryEmail({ email: 'a@b.co', subject: 's', message: '' })).error,
      'Please enter a message (max 10,000 characters).'
    );
    assert.equal(
      (await sendContactInquiryEmail({ name: 'x'.repeat(201), email: 'a@b.co', subject: 's', message: 'hi' }))
        .error,
      'Please enter a valid name.'
    );
  });

  test('sendContactInquiryEmail: happy path escapes HTML and sends', async () => {
    sent.length = 0;
    rateLimitOk = true;
    resendConfigured = true;
    const out = await sendContactInquiryEmail({
      name: '<script>',
      email: 'a@b.co',
      subject: 'Help',
      message: 'Line 1\nLine 2',
    });
    assert.deepEqual(out, { ok: true });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, 'ops@nomnom.test');
    assert.match(sent[0].html, /&lt;script&gt;/);
    assert.match(sent[0].html, /<br>/);
  });

  test('submitLlmFeedbackEmail: rate limit + invalid payload', async () => {
    rateLimitOk = false;
    assert.deepEqual(await submitLlmFeedbackEmail({ contentType: 'plan', contentId: 'c1' }), {
      ok: false,
      error: 'You’ve sent a few already — try again in a bit.',
    });
    rateLimitOk = true;
    const out = await submitLlmFeedbackEmail({ contentType: 'plan', text: '' });
    assert.equal(out.ok, false);
    assert.equal(out.error, 'Invalid feedback payload.');
  });

  test('submitLlmFeedbackEmail: thumbs_down sends escaped reasons', async () => {
    sent.length = 0;
    rateLimitOk = true;
    resendConfigured = true;
    const out = await submitLlmFeedbackEmail({
      contentType: 'plan',
      contentId: 'c1',
      feedbackValue: 'thumbs_down',
      predefinedReasons: ['too_long'],
      additionalFeedback: '<b>nope</b>',
      userId: 'u1',
      userEmail: 'a@b.co',
    });
    assert.deepEqual(out, { ok: true });
    assert.equal(sent.length, 1);
    assert.match(sent[0].subject, /LLM Feedback/);
    assert.match(sent[0].html, /&lt;b&gt;nope&lt;\/b&gt;/);
    assert.match(sent[0].html, /u1/);
  });
});
