/** DESIGN.md §17 — Portuguese body copy runs ~15–25% longer; tighten measure in pt. */
export const LOCALE_BODY_MAX_WIDTH_CH = {
  en: '72ch',
  pt: '60ch',
};

/**
 * Max line length for long-form body prose by UI locale.
 * @param {string | undefined} lang
 */
export function getLocaleBodyMaxWidthCh(lang) {
  if (lang === 'pt') return LOCALE_BODY_MAX_WIDTH_CH.pt;
  return LOCALE_BODY_MAX_WIDTH_CH.en;
}

/**
 * @param {string | undefined} lang
 * @returns {{ maxWidth: string }}
 */
export function localeBodyProseSx(lang) {
  return { maxWidth: getLocaleBodyMaxWidthCh(lang) };
}
