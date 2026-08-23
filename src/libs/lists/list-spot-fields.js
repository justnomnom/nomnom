/**
 * Derive ListShowcase spot fields from a restaurant row.
 * Never invents a neighbourhood, quote, or dish — empty string/array when
 * the source field is missing.
 */

/**
 * Trim, collapse whitespace, and cut on a word boundary.
 * @param {unknown} text
 * @param {number} max
 * @returns {string}
 */
export function clipAtWord(text, max) {
  const value = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!value) return '';
  if (value.length <= max) return value;
  const sliced = value.slice(0, max);
  const space = sliced.lastIndexOf(' ');
  const cut = space > Math.floor(max * 0.45) ? sliced.slice(0, space) : sliced;
  return `${cut.trim()}…`;
}

/**
 * Street line: complete_address.street, else the text before the first comma
 * of restaurants.address.
 * @param {{ address?: unknown, metadata?: { complete_address?: { street?: unknown } } }} row
 * @returns {string}
 */
export function streetFromRestaurant(row) {
  const complete = row?.metadata?.complete_address;
  const fromMeta = typeof complete?.street === 'string' ? complete.street.trim() : '';
  if (fromMeta) return fromMeta;
  const address = typeof row?.address === 'string' ? row.address.trim() : '';
  if (!address) return '';
  return address.split(',')[0].trim();
}

/**
 * Specific location for a spot card: borough when Google has one, otherwise
 * street, then municipality. City comes from NomNom `home_city`, not the
 * English Google city string, when both exist.
 * @param {{
 *   address?: unknown,
 *   home_city?: { name?: unknown },
 *   metadata?: { complete_address?: Record<string, unknown> },
 * }} row
 * @returns {string}
 */
export function spotLocationFromRestaurant(row) {
  const complete =
    row?.metadata?.complete_address && typeof row.metadata.complete_address === 'object'
      ? row.metadata.complete_address
      : {};
  const city = String(row?.home_city?.name || complete.city || '').trim();
  const borough = String(
    complete.borough ||
      complete.neighborhood ||
      complete.neighbourhood ||
      complete.suburb ||
      complete.district ||
      ''
  ).trim();
  const street = streetFromRestaurant(row);
  const lower = (s) => s.toLowerCase();

  if (borough && city && lower(borough) !== lower(city)) return `${borough} · ${city}`;
  if (street && city && !lower(street).includes(lower(city))) return `${street} · ${city}`;
  return street || borough || city || '';
}

/**
 * Collapse whitespace without clipping. Ingest already caps bullets.
 * @param {unknown} value
 * @returns {string}
 */
function tidyText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Full community consensus from restaurant ingest — same fields the app card
 * shows. Never invents copy; missing sections stay empty so the composition
 * can hide them.
 * @param {unknown} metadata
 * @returns {{
 *   summary: string,
 *   loves: string[],
 *   knows: string[],
 *   dishes: { label: string, mentions: number | null }[],
 *   reviewCount: number | null,
 * }}
 */
export function spotConsensusFromMetadata(metadata) {
  const empty = { summary: '', loves: [], knows: [], dishes: [], reviewCount: null };
  const consensus =
    metadata &&
    typeof metadata === 'object' &&
    metadata.review_consensus &&
    typeof metadata.review_consensus === 'object'
      ? metadata.review_consensus
      : null;
  if (!consensus) return empty;

  const loves = (Array.isArray(consensus.strengths) ? consensus.strengths : [])
    .map(tidyText)
    .filter(Boolean);
  const knows = (Array.isArray(consensus.weaknesses) ? consensus.weaknesses : [])
    .map(tidyText)
    .filter(Boolean);
  const rawDishes = Array.isArray(consensus.signature_dishes) ? consensus.signature_dishes : [];
  const dishes = rawDishes
    .map((item) => {
      if (typeof item === 'string') {
        const label = tidyText(item);
        return label ? { label, mentions: null } : null;
      }
      const label = tidyText(item?.label);
      if (!label) return null;
      const raw = item?.mentions ?? item?.mentions;
      const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
      return {
        label,
        mentions: Number.isFinite(n) && n > 0 ? Math.floor(n) : null,
      };
    })
    .filter(Boolean);

  const analyzed =
    consensus.reviews_analyzed ?? consensus.reviews_analyzed ?? consensus.reviews_analyzed;
  const n = typeof analyzed === 'number' ? analyzed : parseInt(String(analyzed ?? ''), 10);

  return {
    summary: tidyText(consensus.summary),
    loves,
    knows,
    dishes,
    reviewCount: Number.isFinite(n) && n > 0 ? n : null,
  };
}

/**
 * Public list URL. Uses username/slug when both exist, otherwise the list id.
 * @param {{ origin?: string, username?: string, slug?: string, listId?: string }} input
 * @returns {string}
 */
export function listPublicUrl({ origin, username, slug, listId } = {}) {
  const base = String(origin || 'https://www.justnomnom.com')
    .trim()
    .replace(/\/$/, '');
  const user = String(username || '')
    .trim()
    .replace(/^@/, '');
  const listSlug = String(slug || '').trim();
  if (user && listSlug)
    return `${base}/lists/${encodeURIComponent(user)}/${encodeURIComponent(listSlug)}`;
  const id = String(listId || '').trim();
  if (id) return `${base}/lists/${id}`;
  return '';
}

/**
 * Canonical https origin for captions. Ignores localhost SITE_URL so a local
 * render does not ship a 127.0.0.1 link to Instagram.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function captionSiteOrigin(env = process.env) {
  const site = String(env.NEXT_PUBLIC_SITE_URL || env.SITE_URL || '').trim();
  if (/^https:\/\//i.test(site) && !/localhost|127\.0\.0\.1/i.test(site)) {
    return site.replace(/\/$/, '');
  }
  const domain = String(env.NEXT_PUBLIC_APP_DOMAIN || 'www.justnomnom.com')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/$/, '');
  return `https://${domain || 'www.justnomnom.com'}`;
}

/**
 * How to place a restaurant photo in the 4:5-ish still well.
 * Near-square assets are usually wordmarks — contain them so type isn't clipped.
 * @param {number | null | undefined} aspect width / height
 * @returns {'cover' | 'contain'}
 */
export function photoFitForAspect(aspect) {
  if (!Number.isFinite(aspect) || aspect <= 0) return 'cover';
  if (aspect >= 0.92 && aspect <= 1.08) return 'contain';
  return 'cover';
}

/**
 * Name lines for a spot card. Short two-word names stay on one line so the
 * still doesn't stack "Tia" / "Alice" as a poster title.
 * @param {unknown} nameLines
 * @param {unknown} name
 * @returns {string[]}
 */
export function spotNameLinesForCard(nameLines, name) {
  const lines = (Array.isArray(nameLines) ? nameLines : [])
    .map((line) => String(line || '').trim())
    .filter(Boolean);
  const joined = (lines.length ? lines.join(' ') : String(name || '').trim()).replace(/\s+/g, ' ');
  if (!joined) return lines.length ? lines : [''];
  if (joined.length <= 24 && !joined.includes('|')) return [joined];
  return lines.length ? lines : [joined];
}
