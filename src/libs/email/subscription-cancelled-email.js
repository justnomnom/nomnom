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
 * Chrome matches list emails: parchment card, darker terracotta wordmark (readable as
 * 20px text), white-on-terracotta is reserved for CTAs — this letter has none.
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
 * @param {{ listName?: string | null, accessEndsAt?: string | null, reason?: string | null }} input
 * @returns {string}
 */
export function subscriptionCancelledHtml({ listName, accessEndsAt, reason }) {
  const what = listName ? `your subscription to ${escapeHtml(listName)}` : 'your subscription';
  const until = accessEndsAt
    ? `You keep access until ${escapeHtml(new Date(accessEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }))}. You won&rsquo;t be charged again.`
    : `You won&rsquo;t be charged again.`;
  const reasonLine = reason
    ? `<p style="margin:16px 0 0;font-family:'Albert Sans',Georgia,serif;font-size:12px;line-height:1.6;color:#948c7c">Reason given: ${escapeHtml(reason)}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>Subscription cancelled</title>
</head>
<body style="margin:0;padding:0;background-color:#f0ede4;font-family:'Albert Sans',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="background-color:#f0ede4;padding:32px 16px">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:560px;background-color:#faf9f5;border-radius:16px;
                      border:1px solid #e8e6dc;overflow:hidden">
          <tr>
            <td style="padding:28px 32px 20px;border-bottom:1px solid #e8e6dc">
              <span style="font-family:'Albert Sans',Georgia,serif;font-size:20px;
                           font-weight:800;color:#B8481F;letter-spacing:-0.02em">NomNom</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 24px">
              <p style="margin:0 0 8px;font-family:'Albert Sans',Georgia,serif;
                        font-size:22px;font-weight:700;line-height:1.3;color:#15130f">
                Subscription cancelled
              </p>
              <p style="margin:0 0 16px;font-family:'Albert Sans',Georgia,serif;
                        font-size:16px;font-weight:400;line-height:1.6;color:#6e6657">
                We&rsquo;ve cancelled ${what}.
              </p>
              <p style="margin:0 0 16px;font-family:'Albert Sans',Georgia,serif;
                        font-size:16px;font-weight:400;line-height:1.6;color:#6e6657">
                ${until}
              </p>
              <p style="margin:0;font-family:'Albert Sans',Georgia,serif;
                        font-size:16px;font-weight:400;line-height:1.6;color:#6e6657">
                If this wasn&rsquo;t you, or you&rsquo;d like it back, you can subscribe again from the creator&rsquo;s profile.
              </p>
              ${reasonLine}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * @param {{ to?: string | null, listName?: string | null, accessEndsAt?: string | null, reason?: string | null }} input
 * @returns {Promise<{ sent: boolean }>}
 */
export async function sendSubscriptionCancelledEmail({ to, listName, accessEndsAt, reason }) {
  if (!to || !RESEND_API.key || !RESEND_API.from) return { sent: false };

  await sendResendEmail({
    to,
    subject: listName ? `Subscription cancelled — ${listName}` : 'Subscription cancelled',
    html: subscriptionCancelledHtml({ listName, accessEndsAt, reason }),
  });

  return { sent: true };
}
