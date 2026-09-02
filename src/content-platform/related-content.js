/**
 * Suggests related MDX documents by overlapping tags (deterministic order).
 *
 * @param {{ slug: string, frontmatter: { tags?: string[] } }} source
 * @param {Array<{ slug: string, frontmatter: { tags?: string[] } }>} pool
 * @param {number} [limit]
 * @returns {typeof pool}
 */
export function suggestByTags(source, pool, limit = 4) {
  const tags = new Set(source.frontmatter.tags ?? []);
  if (!tags.size) return [];

  const scored = pool
    .filter((d) => d.slug !== source.slug)
    .map((d) => {
      const overlap = (d.frontmatter.tags ?? []).filter((t) => tags.has(t)).length;
      return { d, overlap };
    })
    .filter((x) => x.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap || a.d.slug.localeCompare(b.d.slug));

  return scored.slice(0, limit).map((x) => x.d);
}
