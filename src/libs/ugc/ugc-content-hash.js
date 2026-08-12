import { createHash } from 'crypto';

/**
 * SHA-256 hex of `sourceText + U+001F + sourceLocale` (UTF-8).
 * @param {string} sourceText
 * @param {string} sourceLocale
 */
export function ugcContentHash(sourceText, sourceLocale) {
  return createHash('sha256').update(`${sourceText}\u001f${sourceLocale}`, 'utf8').digest('hex');
}
