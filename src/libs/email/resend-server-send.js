import { Resend } from 'resend';

import { RESEND_API } from 'src/config-global';

/**
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
  return resend.emails.send({
    from: RESEND_API.from,
    to: recipients,
    subject,
    html,
    text,
  });
}
