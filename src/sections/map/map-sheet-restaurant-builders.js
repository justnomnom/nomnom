import { orderRestaurantTagsForDetail } from 'src/utils/restaurant-tag-groups';

/**
 * Pure map-sheet restaurant builders — JSX/hook-free for unit tests.
 */

export function spotIdEq(a, b) {
  if (a == null || b == null) return false;
  return String(a) === String(b);
}

/**
 * @param {object | null | undefined} selected
 * @param {Array<{ slug: string, label?: string, category?: string, sort_order?: number, id?: string }>} tagCatalog
 * @param {{ tagCatalogLoaded?: boolean }} [opts]
 */
export function buildSheetRestaurantFromMapPlace(selected, tagCatalog, opts) {
  if (!selected) return null;
  const tagCatalogLoaded = opts?.tagCatalogLoaded !== false;
  const meta =
    selected.metadata && typeof selected.metadata === 'object' && !Array.isArray(selected.metadata)
      ? selected.metadata
      : {};
  let fromMeta = '';
  if (typeof meta.address === 'string' && meta.address.trim()) {
    fromMeta = meta.address.trim();
  } else if (typeof meta.formatted_address === 'string') {
    fromMeta = meta.formatted_address.trim();
  }
  const fromRow =
    selected.address != null && String(selected.address).trim()
      ? String(selected.address).trim()
      : '';
  const address = fromRow || fromMeta || null;

  const slugList = Array.isArray(meta.tag_slugs)
    ? meta.tag_slugs
        .filter((s) => s != null && typeof s !== 'object')
        .map((s) => String(s).trim())
        .filter(Boolean)
    : [];
  const bySlug = new Map((tagCatalog ?? []).map((row) => [row.slug, row]));
  const rawTags = slugList.map((slug) => {
    const hit = bySlug.get(slug);
    if (hit) return hit;
    if (!tagCatalogLoaded) {
      return {
        id: `slug:${slug}`,
        slug,
        label: '',
        category: 'other',
        sort_order: 0,
        __loading: true,
      };
    }
    const label = slug
      .split('-')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    return {
      id: `slug:${slug}`,
      slug,
      label,
      category: 'other',
      sort_order: 0,
    };
  });
  const tags = orderRestaurantTagsForDetail(rawTags);

  let phone = null;
  if (selected.phone != null && String(selected.phone).trim()) {
    phone = String(selected.phone).trim();
  } else if (typeof meta.phone === 'string' && meta.phone.trim()) {
    phone = meta.phone.trim();
  } else if (
    typeof meta.formatted_phone_number === 'string' &&
    meta.formatted_phone_number.trim()
  ) {
    phone = meta.formatted_phone_number.trim();
  }

  return {
    id: String(selected.id),
    name: String(selected.name ?? ''),
    address,
    phone,
    latitude:
      selected.latitude != null && Number.isFinite(Number(selected.latitude))
        ? Number(selected.latitude)
        : null,
    longitude:
      selected.longitude != null && Number.isFinite(Number(selected.longitude))
        ? Number(selected.longitude)
        : null,
    metadata: meta,
    home_city: selected.home_city ?? undefined,
    tags,
    // Resolved server-side in `fetchRestaurantsInBbox` before metadata slimming, so it is
    // already on the row here. Absent for pin-only rows, which is why it stays optional.
    openingStatus: selected.openingStatus ?? null,
  };
}
