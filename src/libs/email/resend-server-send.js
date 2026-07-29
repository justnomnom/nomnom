import { Resend } from 'resend';

import { RESEND_API } from 'src/config-global';

/**
 * Sends via Resend. Throws when the SDK returns `{ error }` (it does not throw by default).
 * @param {{ to: string | string[], subject: string, html?: string, text?: string }} params
 */
export async function sendResendEmail({ to, subject, html, text }) {
  if (!RESEND_API.key || !RESEND_API.from) {
    throw new Error('resend_not_configured');
  }
  if (!subject || !(html || text)) {
    throw new Error('resend_invalid_payload');
  }
  const resend = new Resend(RESEND_API.key);
  const recipients = Array.isArray(to) ? to : [to];
  const result = await resend.emails.send({
    from: RESEND_API.from,
    to: recipients,
    subject,
    html,
    text,
  });

  if (result?.error) {
    const message = result.error.message || 'resend_send_failed';
    console.error('[sendResendEmail]', result.error);
    throw new Error(message);
  }

  return result;
}
