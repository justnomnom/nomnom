/** Cookie name for UI language — read in root layout (SSR) and set on the client. */
export const UI_LOCALE_COOKIE = 'ui_locale';

/** @param {string | undefined} value */
export function htmlLangFromUiLocaleCookie(value) {
  return value === 'pt' ? 'pt' : 'en';
}

/** @returns {'en' | 'pt' | null} */
export function readUiLocaleCookie() {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(/(?:^|; )ui_locale=(en|pt)(?:;|$)/);
  return m ? /** @type {'en' | 'pt'} */ (m[1]) : null;
}

/**
 * Persists UI locale for the next SSR response (`<html lang>`).
 * @param {string} lang — i18n language code (e.g. `en`, `pt`, `pt-BR`)
 */
export function setUiLocaleCookie(lang) {
  if (typeof document === 'undefined') return;
  const normalized = String(lang || '')
    .toLowerCase()
    .startsWith('pt')
    ? 'pt'
    : 'en';
  document.cookie = `${UI_LOCALE_COOKIE}=${normalized};path=/;max-age=31536000;SameSite=Lax`;
}
