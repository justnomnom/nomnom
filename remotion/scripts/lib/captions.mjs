// Captions for queued reels.
//
// Built from the props that were actually rendered, so the caption can never
// claim something the video does not show. Every line is conditional on its
// source existing — there is no filler copy and no invented adjectives.

import { slugify } from './subject-text.mjs';

const CTA = 'Save it in NomNom → nomnom.app';
const LIST_CTA = 'Save the list in NomNom → nomnom.app';

// Review bodies carry their author's line breaks. In the video those collapse
// as HTML whitespace, but in a caption file each one would split the line.
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const dishLabel = (d) => (Array.isArray(d) ? clean(d[0]) : clean(d));

/** `#nomnom` plus one tag per real label, deduped and lowercased. */
export function hashtags(labels = []) {
  const tags = ['nomnom'];
  for (const label of labels) {
    const slug = slugify(label).replace(/-/g, '');
    if (slug && !tags.includes(slug)) tags.push(slug);
  }
  return tags.map((t) => `#${t}`).join(' ');
}

/** Caption for a RestaurantReviewsReel render. */
export function captionForRestaurant(props) {
  const r = props?.restaurant ?? {};
  const chips = (props?.chips ?? []).map((c) => clean(c.label)).filter(Boolean);
  const consensus = props?.consensus ?? {};
  const lines = [];

  const heading = [clean(r.name), clean(r.tagline)].filter(Boolean).join(' — ');
  if (heading) lines.push(heading);

  const stats = [];
  if (Number(r.rating) > 0) stats.push(`★ ${Number(r.rating).toFixed(1)}`);
  if (clean(consensus.reviewCount)) stats.push(`${clean(consensus.reviewCount)} reviews`);
  if (stats.length) lines.push(stats.join(' · '));

  const dishes = (consensus.dishes ?? []).map(dishLabel).filter(Boolean).slice(0, 3);
  if (dishes.length) lines.push(`Most mentioned: ${dishes.join(', ')}`);

  if (clean(r.address)) lines.push(clean(r.address));

  lines.push(CTA);
  lines.push(hashtags([clean(r.location), ...chips].filter(Boolean)));
  return lines.join('\n');
}

/**
 * Caption for a RestaurantSpotlight render — the review leads, and it is
 * attributed to whoever actually wrote it.
 */
export function captionForReview(props) {
  const r = props?.restaurant ?? {};
  const review = props?.review ?? props?.reviews?.[0] ?? {};
  const quote = clean(review.quote);
  const lines = [];

  if (quote) lines.push(`"${quote}"`);
  const author = clean(review.handle) || clean(review.name);
  if (author) lines.push(`— ${author}${clean(r.name) ? ` on ${clean(r.name)}` : ''}`);
  else if (clean(r.name)) lines.push(clean(r.name));

  const stats = [];
  if (Number(r.rating) > 0) stats.push(`★ ${Number(r.rating).toFixed(1)}`);
  if (clean(r.location)) stats.push(clean(r.location));
  if (stats.length) lines.push(stats.join(' · '));

  lines.push(CTA);
  lines.push(hashtags([clean(r.location), ...(props?.chips ?? []).map((c) => clean(c.label))].filter(Boolean)));
  return lines.join('\n');
}

/** Caption for a ListShowcase render. */
export function captionForList(props) {
  const list = props?.list ?? {};
  const creator = props?.creator ?? {};
  const places = props?.places ?? [];
  const lines = [];

  const by = clean(creator.handle) || clean(creator.name);
  const count = `${places.length} spot${places.length === 1 ? '' : 's'}`;
  lines.push([clean(list.title), by ? `${count} by ${by}` : count].filter(Boolean).join(' — '));

  if (clean(list.subtitle)) lines.push(clean(list.subtitle));

  places.forEach((p, i) => {
    const rating = Number.isFinite(Number(p.rating)) && p.rating !== null ? ` ★${Number(p.rating).toFixed(1)}` : '';
    lines.push(`${i + 1}. ${clean(p.name)}${rating}`);
  });

  lines.push(LIST_CTA);
  const cityLabels = [...new Set(places.map((p) => clean(p.neighbourhood)).filter(Boolean))].slice(0, 2);
  lines.push(hashtags([clean(list.location), ...cityLabels].filter(Boolean)));
  return lines.join('\n');
}

/** Dispatch by subject kind. */
export function captionFor(kind, props) {
  if (kind === 'restaurant') return captionForRestaurant(props);
  if (kind === 'review') return captionForReview(props);
  if (kind === 'list') return captionForList(props);
  throw new Error(`No caption builder for kind "${kind}".`);
}
