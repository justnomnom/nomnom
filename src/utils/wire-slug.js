/**
 * Stable URL-ish key derived from a municipality / onboarding location display name.
 * Must stay in sync with `public.wire_slug_from_text` in Supabase migrations.
 *
 * @param {string | null | undefined} t
 * @returns {string}
 */
export function wireSlugFromText(t) {
  return String(t ?? '')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}
