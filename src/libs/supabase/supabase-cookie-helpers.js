/**
 * Prefix for Supabase Auth cookies, aligned with @supabase/supabase-js default storage key:
 * sb-{projectRef}-auth-token (plus chunk suffixes and -code-verifier).
 * @param {string | undefined} supabaseUrl - `NEXT_PUBLIC_SUPABASE_URL`
 * @returns {string} e.g. "sb-abcdefgh-"
 */
export function getSupabaseAuthCookiePrefix(supabaseUrl) {
  if (!supabaseUrl) {
    return 'sb-';
  }
  try {
    const host = new URL(supabaseUrl).hostname;
    const projectRef = host.split('.')[0];
    return projectRef ? `sb-${projectRef}-` : 'sb-';
  } catch {
    return 'sb-';
  }
}
