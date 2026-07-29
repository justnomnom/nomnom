import { escapeHtml } from 'src/libs/email/escape-html';

// ---------------------------------------------------------------------------
// Live List update notification email
// ---------------------------------------------------------------------------
//
// Design: NomNom brand — parchment (#faf9f5) background, terracotta (#FF6B35)
// CTA, Albert Sans with Georgia/serif fallbacks. Text-only wordmark (no img tag —
// email clients block images by default). Tested rendering targets: Gmail web,
// Apple Mail, Outlook 2019+.

/**
 * @param {{ listName: string, creatorName: string, listUrl: string, manageUrl: string }} params
 */
export function liveListUpdateHtml({ listName, creatorName, listUrl, manageUrl }) {
  const safeList = escapeHtml(listName);
  const safeCreator = escapeHtml(creatorName);
  const safeListUrl = escapeHtml(listUrl);
  const safeManageUrl = escapeHtml(manageUrl);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>New spots added to ${safeList}</title>
</head>
<body style="margin:0;padding:0;background-color:#f0ede4;font-family:'Albert Sans',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="background-color:#f0ede4;padding:32px 16px">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
               style="max-width:560px;background-color:#faf9f5;border-radius:16px;
                      border:1px solid #e8e6dc;overflow:hidden">

          <!-- Wordmark header -->
          <tr>
            <td style="padding:28px 32px 20px;border-bottom:1px solid #e8e6dc">
              <span style="font-family:'Albert Sans',Georgia,serif;font-size:20px;
                           font-weight:800;color:#FF6B35;letter-spacing:-0.02em;
                           text-decoration:none">
                NomNom
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px">
              <p style="margin:0 0 8px;font-family:'Albert Sans',Georgia,serif;
                        font-size:22px;font-weight:700;line-height:1.3;color:#121110">
                ${safeCreator} just added new spots 🍽️
              </p>
              <p style="margin:0 0 24px;font-family:'Albert Sans',Georgia,serif;
                        font-size:16px;font-weight:400;line-height:1.6;color:#475569">
                They added new places to <strong style="color:#121110;font-weight:600">${safeList}</strong>.
                Go see what's been added — you might find your next favourite spot.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="border-radius:40px;background-color:#FF6B35;
                             box-shadow:0 2px 8px rgba(255,107,53,0.30)">
                    <a href="${safeListUrl}"
                       style="display:inline-block;padding:13px 28px;
                              font-family:'Albert Sans',Georgia,serif;
                              font-size:15px;font-weight:700;line-height:1;
                              color:#ffffff;text-decoration:none;
                              border-radius:40px;white-space:nowrap">
                      See what&rsquo;s new &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 24px;border-top:1px solid #e8e6dc">
              <p style="margin:0;font-family:'Albert Sans',Georgia,serif;
                        font-size:12px;line-height:1.6;color:#94A3B8">
                You received this because you subscribe to
                <a href="${safeListUrl}"
                   style="color:#94A3B8;text-decoration:underline">${safeList}</a>.
                &nbsp;&middot;&nbsp;
                <a href="${safeManageUrl}"
                   style="color:#94A3B8;text-decoration:underline">Manage subscriptions</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Daily digest — new spots across all lists a user follows / subscribes to
// ---------------------------------------------------------------------------

/**
 * @param {{
 *   items: Array<{ listName: string, listUrl: string, count: number }>,
 *   manageUrl: string
 * }} params
 */
export function listUpdateDigestHtml({ items, manageUrl }) {
  const safeManageUrl = escapeHtml(manageUrl);

  const rows = (items ?? [])
    .map(({ listName, listUrl, count }) => {
      const safeList = escapeHtml(listName || 'a list');
      const safeUrl = escapeHtml(listUrl);
      const n = Number(count) || 0;
      const label = n === 1 ? '1 new spot' : `${n} new spots`;
      return `
              <tr>
                <td style="padding:12px 0;border-bottom:1px solid #e8e6dc">
                  <a href="${safeUrl}"
                     style="font-family:'Albert Sans',Georgia,serif;font-size:16px;
                            font-weight:700;color:#121110;text-decoration:none">${safeList}</a>
                  <div style="font-family:'Albert Sans',Georgia,serif;font-size:14px;
                              color:#475569;margin-top:2px">${label}</div>
                </td>
              </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>New spots on lists you follow</title>
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
                           font-weight:800;color:#FF6B35;letter-spacing:-0.02em">NomNom</span>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px">
              <p style="margin:0 0 8px;font-family:'Albert Sans',Georgia,serif;
                        font-size:22px;font-weight:700;line-height:1.3;color:#121110">
                New spots on lists you follow 🍽️
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                ${rows}
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 24px;border-top:1px solid #e8e6dc">
              <p style="margin:0;font-family:'Albert Sans',Georgia,serif;
                        font-size:12px;line-height:1.6;color:#94A3B8">
                You received this digest because email updates are on.
                &nbsp;&middot;&nbsp;
                <a href="${safeManageUrl}"
                   style="color:#94A3B8;text-decoration:underline">Manage notifications</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
