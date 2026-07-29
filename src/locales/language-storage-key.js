const LANGUAGE_STORAGE_KEY_PREFIX = 'i18next-lng';

/**
 * Language preference storage key — anonymous guests vs signed-in users must not share.
 *
 * @param {string | null | undefined} userId
 * @returns {string}
 */
export function getLanguageStorageKey(userId) {
  if (userId) {
    return `${LANGUAGE_STORAGE_KEY_PREFIX}-${userId}`;
  }
  return `${LANGUAGE_STORAGE_KEY_PREFIX}-anonymous`;
}
