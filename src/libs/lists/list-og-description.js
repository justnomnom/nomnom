import { getTranslation } from 'src/locales/default-translations';

/**
 * Public-list Open Graph description: the list’s own blurb when it exists,
 * otherwise the NomNom List byline — never “curated restaurant list”.
 * @param {{ description?: string | null, ownerUsername?: string | null, ownerName?: string | null } | null | undefined} meta
 * @param {string} [lang]
 * @returns {string}
 */
export function listOgDescription(meta, lang = 'en') {
  const custom = typeof meta?.description === 'string' ? meta.description.trim() : '';
  if (custom) return custom;

  const username = typeof meta?.ownerUsername === 'string' ? meta.ownerUsername.trim() : '';
  if (username) {
    const handle = username.startsWith('@') ? username : `@${username}`;
    return getTranslation(lang, 'pages.lists.by_handle', { handle });
  }

  const name = typeof meta?.ownerName === 'string' ? meta.ownerName.trim() : '';
  if (name) {
    return getTranslation(lang, 'pages.lists.by_handle', { handle: name });
  }

  return getTranslation(lang, 'pages.lists.og_profile_tagline');
}
