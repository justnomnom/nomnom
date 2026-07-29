'use server';

import { headers } from 'next/headers';

import { escapeHtml } from 'src/libs/email/escape-html';
import { rateLimitTake } from 'src/libs/email/rate-limit';
import { sendResendEmail } from 'src/libs/email/resend-server-send';
import { RESEND_API, FEEDBACK_INBOUND_EMAIL } from 'src/config-global';

// ----------------------------------------------------------------------

async function clientIpKey(prefix) {
  const h = await headers();
  const xff = h.get('x-forwarded-for');
  const ip = xff?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
  return `${prefix}:${ip}`;
}

/**
 * Public contact / FAQ forms — sends only to `RESEND_TO_EMAIL` (no arbitrary recipients).
 * @param {{ name?: string, email: string, subject: string, message: string }} input
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function sendContactInquiryEmail(input) {
  const key = await clientIpKey('contact-email');
  if (!(await rateLimitTake(key, 5, 60 * 60 * 1000))) {
    return { ok: false, error: 'Too many submissions. Please try again later.' };
  }

  const { to } = RESEND_API;
  if (!to || !RESEND_API.key || !RESEND_API.from) {
    return { ok: false, error: 'Email service is not configured.' };
  }

  const name = typeof input?.name === 'string' ? input.name.trim() : '';
  const email = typeof input?.email === 'string' ? input.email.trim() : '';
  const subject = typeof input?.subject === 'string' ? input.subject.trim() : '';
  const message = typeof input?.message === 'string' ? input.message.trim() : '';

  // Name is optional (CRO); when present, keep it bounded.
  if (name.length > 200) {
    return { ok: false, error: 'Please enter a valid name.' };
  }
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  if (!subject || subject.length > 200) {
    return { ok: false, error: 'Please choose a topic.' };
  }
  if (!message || message.length > 10_000) {
    return { ok: false, error: 'Please enter a message (max 10,000 characters).' };
  }

  const displayName = name || '(not provided)';

  const html = `
    <h2>New contact submission</h2>
    <p><strong>Name:</strong> ${escapeHtml(displayName)}</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
  `;

  try {
    await sendResendEmail({
      to,
      subject: `New Contact Form: ${subject}`,
      html,
    });
    return { ok: true };
  } catch (e) {
    console.error('[sendContactInquiryEmail]', e);
    return { ok: false, error: 'Failed to send message. Please try again later.' };
  }
}

const MAX_CONTEXT_JSON = 120_000;
const MAX_FEEDBACK_TEXT = 5000;

const LLM_FEEDBACK_CONTENT_TYPE_LABELS = {
  plan: 'Plan',
  goal: 'Goal',
  reflection: 'Reflection',
  summary: 'Summary',
};

/**
 * LLM feedback from the client — delivers to the configured ops inbox only.
 * @param {object} payload
 * @returns {Promise<{ ok: true } | { ok: false, error: string }>}
 */
export async function submitLlmFeedbackEmail(payload) {
  const key = await clientIpKey('llm-feedback-email');
  if (!(await rateLimitTake(key, 20, 60 * 60 * 1000))) {
    return { ok: false, error: 'Too many submissions. Please try again later.' };
  }

  const to = FEEDBACK_INBOUND_EMAIL;
  if (!to || !RESEND_API.key || !RESEND_API.from) {
    return { ok: false, error: 'Email service is not configured.' };
  }

  const contentType = typeof payload?.contentType === 'string' ? payload.contentType : '';
  const contentId = typeof payload?.contentId === 'string' ? payload.contentId.slice(0, 500) : '';
  const feedbackValue = payload?.feedbackValue;
  const predefinedReasons = Array.isArray(payload?.predefinedReasons)
    ? payload.predefinedReasons.filter((x) => typeof x === 'string').slice(0, 20)
    : [];
  const additionalFeedback =
    typeof payload?.additionalFeedback === 'string'
      ? payload.additionalFeedback.slice(0, MAX_FEEDBACK_TEXT)
      : '';
  const fullContext = payload?.fullContext;
  const metadata =
    payload?.metadata && typeof payload.metadata === 'object' ? payload.metadata : {};

  const allowedTypes = new Set(['plan', 'goal', 'chat_message', 'summary', 'reflection']);
  if (!allowedTypes.has(contentType) || !contentId) {
    return { ok: false, error: 'Invalid feedback payload.' };
  }
  if (feedbackValue !== 'thumbs_up' && feedbackValue !== 'thumbs_down') {
    return { ok: false, error: 'Invalid feedback payload.' };
  }

  let contextJson = '';
  try {
    contextJson = JSON.stringify(fullContext ?? {}, null, 2);
  } catch {
    return { ok: false, error: 'Invalid feedback payload.' };
  }
  if (contextJson.length > MAX_CONTEXT_JSON) {
    return { ok: false, error: 'Feedback context is too large.' };
  }

  let metaJson = '';
  try {
    metaJson = JSON.stringify(metadata, null, 2);
  } catch {
    metaJson = '{}';
  }
  if (metaJson.length > 20_000) {
    return { ok: false, error: 'Feedback metadata is too large.' };
  }

  const contentTypeLabel = LLM_FEEDBACK_CONTENT_TYPE_LABELS[contentType] ?? 'Chat Message';
  const feedbackValueLabel = feedbackValue === 'thumbs_up' ? '👍 Thumbs Up' : '👎 Thumbs Down';

  let feedbackMessage = '';
  if (predefinedReasons.length) {
    feedbackMessage = predefinedReasons.join(', ');
  }
  if (additionalFeedback) {
    feedbackMessage = feedbackMessage
      ? `${feedbackMessage}\n\n${additionalFeedback}`
      : additionalFeedback;
  }

  const escapedFeedbackMessage = feedbackMessage
    ? escapeHtml(feedbackMessage).replace(/\n/g, '<br>')
    : '';

  const html = `
    <h2>New LLM Feedback Received</h2>
    <p><strong>Content Type:</strong> ${escapeHtml(contentTypeLabel)}</p>
    <p><strong>Feedback:</strong> ${escapeHtml(feedbackValueLabel)}</p>
    <p><strong>Content ID:</strong> ${escapeHtml(contentId)}</p>
    ${payload?.userId ? `<p><strong>User ID:</strong> ${escapeHtml(String(payload.userId))}</p>` : ''}
    ${payload?.userId && payload?.userEmail ? `<p><strong>User Email:</strong> ${escapeHtml(String(payload.userEmail))}</p>` : ''}
    ${payload?.userId && payload?.userName ? `<p><strong>User Name:</strong> ${escapeHtml(String(payload.userName))}</p>` : ''}
    ${payload?.sessionId ? `<p><strong>Session ID:</strong> ${escapeHtml(String(payload.sessionId))}</p>` : ''}
    ${feedbackMessage ? `<p><strong>Feedback Message:</strong></p><p>${escapedFeedbackMessage}</p>` : ''}
    <hr>
    <h3>Full Context:</h3>
    <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto;">${escapeHtml(contextJson)}</pre>
    ${
      metaJson !== '{}'
        ? `<h3>Metadata:</h3><pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto;">${escapeHtml(metaJson)}</pre>`
        : ''
    }
  `;

  try {
    await sendResendEmail({
      to,
      subject: `LLM Feedback: ${contentTypeLabel} - ${feedbackValueLabel}`,
      html,
    });
    return { ok: true };
  } catch (e) {
    console.error('[submitLlmFeedbackEmail]', e);
    return { ok: false, error: 'Failed to send feedback.' };
  }
}
