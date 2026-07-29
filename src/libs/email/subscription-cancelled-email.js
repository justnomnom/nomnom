import { RESEND_API } from 'src/config-global';
import { escapeHtml } from 'src/libs/email/escape-html';
import { sendResendEmail } from 'src/libs/email/resend-server-send';

/**
 * Confirmation that a paid list subscription was cancelled.
 *
 * "I cancelled and wasn't sure it worked" is one of the most damaging complaint patterns
 * for any paid app, and the cancel path had no acknowledgement of any kind. Subscriber
 * cancellation takes effect at the period end, so the email has to be explicit that access
 * continues until then — otherwise it reads as "cancelled, and you have been cut off".
 *
 * Tone is plain per `BRAND.md` §3: billing surfaces get no playful verbing.
 */

/**
 * The embedded `lists` relation is an object or a single-element array depending on the embed.
 *
 * @param {object | null | undefined} row
 * @returns {string | null}
 */
export function listNameFromSubscriptionRow(row) {
  const L = row?.lists;
  const obj = Array.isArray(L) ? L[0] : L;
  const name =
    obj && typeof obj === 'object' && typeof obj.name === 'string' ? obj.name.trim() : '';
  return name || null;
}

/**
 * @param {{ to?: string | null, listName?: string | null, accessEndsAt?: string | null, reason?: string | null }} input
 * @returns {Promise<{ sent: boolean }>}
 */
export async function sendSubscriptionCancelledEmail({ to, listName, accessEndsAt, reason }) {
  if (!to || !RESEND_API.key || !RESEND_API.from) return { sent: false };

  const what = listName ? `your subscription to ${escapeHtml(listName)}` : 'your subscription';
  const until = accessEndsAt
    ? `<p>You keep access until ${escapeHtml(new Date(accessEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))}. You won't be charged again.</p>`
    : `<p>You won't be charged again.</p>`;

  const html = `
    <p>We've cancelled ${what}.</p>
    ${until}
    <p>If this wasn't you, or you'd like it back, you can subscribe again from the creator's profile.</p>
    ${reason ? `<p style="color:#666;font-size:12px;">Reason given: ${escapeHtml(reason)}</p>` : ''}
  `;

  await sendResendEmail({
    to,
    subject: listName ? `Subscription cancelled — ${listName}` : 'Subscription cancelled',
    html,
  });

  return { sent: true };
}
