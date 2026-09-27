import { cache } from 'react';

import { fetchListMetadata } from 'src/libs/lists/actions';
import { createSupabaseServerClient } from 'src/libs/supabase/supabase-server-client';

/**
 * List name for document `<title>` on dashboard list routes.
 * Prefers the public metadata path; falls back to an RLS-scoped read so private
 * lists the viewer can open still get a real name instead of the app default.
 * @param {string} listId
 * @returns {Promise<string | null>}
 */
export const fetchListDocumentName = cache(async (listId) => {
  const meta = await fetchListMetadata(listId);
  if (meta?.name) return meta.name;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from('lists').select('name').eq('id', listId).maybeSingle();
  const name = typeof data?.name === 'string' ? data.name.trim() : '';
  return name || null;
});
