import { useRef, useState, useEffect, useCallback } from 'react';

import { useTranslate } from 'src/locales';
import { joinShareTextAndUrl } from 'src/libs/share/join-share-text-and-url';

import { useCopyToClipboard } from './use-copy-to-clipboard';

// ----------------------------------------------------------------------

/**
 * Share a URL with user-visible feedback.
 *
 * Tries the native share sheet first; without one (desktop, some WebViews) it
 * copies the link and reports the outcome via `feedback` so callers never
 * complete a share silently. Feedback auto-clears after `autoHideMs`.
 *
 * @param {object} [options]
 * @param {string} [options.copiedKey] i18n key for the copy-success message.
 * @param {string} [options.messageCopiedKey] i18n key used when the fallback copied an
 *   overview plus the link rather than a bare link.
 * @param {string} [options.failedKey] i18n key for the failure message.
 * @param {number} [options.autoHideMs] how long feedback stays before auto-clearing.
 * @returns {{
 *   share: (input: { url: string, title?: string, text?: string }) => Promise<'shared' | 'copied' | 'failed' | 'cancelled'>,
 *   copyLink: (url: string) => Promise<'copied' | 'failed'>,
 *   announceCopied: () => void,
 *   feedback: { severity: 'success' | 'error', text: string } | null,
 *   dismissFeedback: () => void,
 * }}
 */
export function useShareLink({
  copiedKey = 'pages.dashboard.restaurant.share_copied',
  messageCopiedKey = 'pages.dashboard.restaurant.share_message_copied',
  failedKey = 'pages.dashboard.restaurant.share_failed',
  autoHideMs = 2500,
} = {}) {
  const { t } = useTranslate();
  const { copy } = useCopyToClipboard();
  const [feedback, setFeedback] = useState(
    /** @type {{ severity: 'success' | 'error', text: string } | null} */ (null)
  );
  const timerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const dismissFeedback = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setFeedback(null);
  }, []);

  const showFeedback = useCallback(
    (severity, text) => {
      setFeedback({ severity, text });
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setFeedback(null), autoHideMs);
    },
    [autoHideMs]
  );

  const copyWithFeedback = useCallback(
    async (value, successKey) => {
      const ok = await copy(value);
      if (ok) {
        showFeedback('success', t(successKey));
        return 'copied';
      }
      showFeedback('error', t(failedKey));
      return 'failed';
    },
    [copy, showFeedback, t, failedKey]
  );

  /** Copy without offering the native share sheet (explicit "Copy link" actions). */
  const copyLink = useCallback(
    (url) => copyWithFeedback(url, copiedKey),
    [copyWithFeedback, copiedKey]
  );

  /** Show the copy-success toast without writing the clipboard again. */
  const announceCopied = useCallback(() => {
    showFeedback('success', t(copiedKey));
  }, [showFeedback, t, copiedKey]);

  /**
   * `text` becomes the message body. Most targets — WhatsApp included — ignore `title`
   * entirely and send `text` + `url`, so a share carrying only a title arrives as a bare
   * link. Callers that pass `text` get the overview in the message itself, which also
   * survives clients that render no link preview.
   *
   * The clipboard fallback joins the two, since there is no sheet to keep them apart — and
   * reports "copied" rather than "link copied", because by then it is a whole message.
   */
  const share = useCallback(
    async ({ url, title, text }) => {
      try {
        if (typeof navigator !== 'undefined' && navigator.share) {
          await navigator.share({ title: title || undefined, text: text || undefined, url });
          return 'shared';
        }
      } catch (e) {
        if (e?.name === 'AbortError') return 'cancelled';
        showFeedback('error', t(failedKey));
        return 'failed';
      }
      const composed = joinShareTextAndUrl(text, url);
      return copyWithFeedback(composed, text ? messageCopiedKey : copiedKey);
    },
    [copyWithFeedback, showFeedback, t, failedKey, copiedKey, messageCopiedKey]
  );

  return { share, copyLink, announceCopied, feedback, dismissFeedback };
}
