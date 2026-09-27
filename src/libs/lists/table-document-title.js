import { cache } from 'react';

import { getServerViewerLang } from 'src/libs/i18n-server';
import { fetchTable } from 'src/libs/lists/actions/table-actions';
import { getTranslation } from 'src/locales/default-translations';

/**
 * Localized `<title>` for `/table/[id]` and `/table/[id]/join`.
 * Cached per request so `generateMetadata` and the page share one `get_table` RPC.
 * @param {string} tableId
 * @returns {Promise<{ title: string, name: string, missing: boolean }>}
 */
export const getTableDocumentTitle = cache(async (tableId) => {
  const lang = await getServerViewerLang();
  const { table } = await fetchTable(tableId);
  if (!table) {
    const title = getTranslation(lang, 'pages.table.not_found_title');
    return { title, name: '', missing: true };
  }
  const name =
    (typeof table.title === 'string' && table.title.trim()) ||
    getTranslation(lang, 'pages.table.default_title');
  return {
    title: getTranslation(lang, 'pages.table.document_title', { name }),
    name,
    missing: false,
  };
});
