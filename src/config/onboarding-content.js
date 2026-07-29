import { ic } from 'src/assets/icons';

/** Iconify icon per location wire slug (`wireSlugFromText(municipality name)`); overrides country defaults when present. */
export const LOCATION_SLUG_ICONS = {
  'new-york': ic.emojiStatueLiberty,
  'los-angeles': ic.emojiCityscape,
  tokyo: ic.emojiTokyoTower,
  paris: ic.eiffelTower,
};

export const DEFAULT_LOCATION_ICON = ic.emojiCityscape;

/**
 * @param {string | undefined} slug
 * @param {string | undefined} countryCodeHint ISO 3166-1 alpha-2 when known (optional)
 * @param {string | undefined} countryName countries.name from geography join (optional)
 */
export function locationIconForSlug(slug, countryCodeHint, countryName) {
  const s = slug != null ? String(slug) : '';
  if (s && Object.prototype.hasOwnProperty.call(LOCATION_SLUG_ICONS, s)) {
    return LOCATION_SLUG_ICONS[s];
  }
  const cc = String(countryCodeHint || '').toUpperCase();
  const cn = String(countryName || '').toLowerCase();
  if (cc === 'PT' || cn === 'portugal') return ic.emojiFlagPortugal;
  if (cc === 'US') return ic.emojiStatueLiberty;
  if (cc === 'JP') return ic.emojiTokyoTower;
  if (cc === 'FR') return ic.eiffelTower;
  return DEFAULT_LOCATION_ICON;
}
