/**
 * Parses `/countries/[country]/[city]/restaurants/[[...parts]]` without throwing.
 * Used by generateMetadata; the page still 404s via `parseRestaurantParts`.
 *
 * @param {string[] | undefined} parts
 * @returns {{ kind: 'list', page: number, tag?: string } | { kind: 'detail', slug: string } | null}
 */
export function tryParseRestaurantParts(parts) {
  const p = parts ?? [];

  if (p.length === 0) {
    return { kind: 'list', page: 1 };
  }

  if (p[0] === 'page') {
    const n = Number(p[1]);
    if (p.length !== 2 || !Number.isInteger(n) || n < 2) return null;
    return { kind: 'list', page: n };
  }

  if (p[0] === 'tag') {
    const tag = p[1];
    if (!tag) return null;
    if (p.length === 2) {
      return { kind: 'list', page: 1, tag };
    }
    if (p.length === 4 && p[2] === 'page') {
      const n = Number(p[3]);
      if (!Number.isInteger(n) || n < 2) return null;
      return { kind: 'list', page: n, tag };
    }
    return null;
  }

  if (p.length === 1) {
    return { kind: 'detail', slug: p[0] };
  }

  return null;
}
