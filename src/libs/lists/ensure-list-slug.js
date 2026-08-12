import { supabaseAdminClient } from 'src/libs/supabase/supabase-admin';

/**
 * Mint a unique public slug for a list if missing.
 * Internal helper only — not a server action (avoids unauthenticated admin writes).
 * @param {string} listId
 */
export async function ensureListSlug(listId) {
  const admin = supabaseAdminClient;

  const { data: list } = await admin
    .from('lists')
    .select('id, user_id, name, slug')
    .eq('id', listId)
    .maybeSingle();
  if (!list) return { error: 'not_found' };
  if (list.slug) return { error: null, slug: list.slug };

  const base =
    (list.name ?? 'list')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-{2,}/g, '-')
      .slice(0, 60)
      .replace(/^-|-$/g, '') || 'list';

  const { data: existing } = await admin
    .from('lists')
    .select('slug')
    .eq('user_id', list.user_id)
    .like('slug', `${base}%`);

  const taken = new Set((existing ?? []).map((r) => r.slug).filter(Boolean));
  let slug = base;
  let n = 2;
  while (taken.has(slug)) {
    slug = `${base}-${n}`;
    n += 1;
  }

  const { error } = await admin.from('lists').update({ slug }).eq('id', listId);
  return error ? { error: error.message } : { error: null, slug };
}
