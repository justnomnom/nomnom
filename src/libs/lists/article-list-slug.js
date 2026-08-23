/**
 * Mint a unique lists.slug using the Remotion service-role client.
 * Same algorithm as ensureListSlug; that helper imports Next supabase-admin.
 *
 * @param {{ from: Function }} supabase
 * @param {string} listId
 */
export async function mintListSlug(supabase, listId) {
  const { data: list, error: fetchErr } = await supabase
    .from('lists')
    .select('id, user_id, name, slug')
    .eq('id', listId)
    .maybeSingle();
  if (fetchErr) return { error: fetchErr.message };
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

  const { data: existing, error: existErr } = await supabase
    .from('lists')
    .select('slug')
    .eq('user_id', list.user_id)
    .like('slug', `${base}%`);
  if (existErr) return { error: existErr.message };

  const taken = new Set((existing ?? []).map((r) => r.slug).filter(Boolean));
  let slug = base;
  let n = 2;
  while (taken.has(slug)) {
    slug = `${base}-${n}`;
    n += 1;
  }

  const { error } = await supabase.from('lists').update({ slug }).eq('id', listId);
  return error ? { error: error.message } : { error: null, slug };
}
