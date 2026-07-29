import { useState } from 'react';

// ----------------------------------------------------------------------

export function useCopyToClipboard() {
  const [copiedText, setCopiedText] = useState(null);

  const copy = async (text) => {
    // Modern path: requires HTTPS / secure context in Safari + iOS.
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedText(text);
        return true;
      } catch (error) {
        console.warn('Clipboard API copy failed, falling back', error);
      }
    }

    // Legacy fallback for non-secure contexts (HTTP localhost, older iOS Safari).
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, text.length);
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (ok) {
        setCopiedText(text);
        return true;
      }
    } catch (error) {
      console.warn('Legacy copy failed', error);
    }

    setCopiedText(null);
    return false;
  };

  return { copiedText, copy };
}
