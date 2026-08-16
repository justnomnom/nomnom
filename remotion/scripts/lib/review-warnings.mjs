// Warnings derived from the props that were actually produced.
//
// The picker's warnings describe a subject before anything is rendered, and a
// rebuild has no picker run behind it at all. These checks read the finished
// props instead, so REVIEW.md flags the same things either way — and catches
// anything that only becomes visible once the props exist.

import { looksGeneratedHandle } from './reel-readiness.mjs';

const clean = (s) => String(s ?? '').trim();

/**
 * @param {'restaurant'|'review'|'list'} kind
 * @param {object} props the generated props file
 * @returns {string[]}
 */
export function warningsFromProps(kind, props) {
  const out = [];
  if (!props) return out;

  if (kind === 'list') {
    const handle = clean(props.creator?.handle);
    if (looksGeneratedHandle(handle)) {
      out.push(`creator handle "${handle}" looks seeded or generated — the reel would put a test account on screen`);
    }
    if (!clean(props.creator?.name)) out.push('creator has no name — the intro avatar shows a placeholder');
    if (!clean(props.list?.subtitle)) out.push('no description — the intro subtitle hides itself');
    const places = props.places ?? [];
    const noPhoto = places.filter((p) => !p.photo).length;
    if (noPhoto) out.push(`${noPhoto}/${places.length} places have no photo`);
    return out;
  }

  const reviews = props.reviews ?? (props.review ? [props.review] : []);
  if (!clean(props.badgeText)) {
    out.push('no on-platform review — quotes are Google reviews, credited to their authors');
  }
  if (kind === 'review' && reviews[0] && clean(reviews[0].quote).endsWith('…')) {
    out.push('the quote is trimmed with an ellipsis — check it still reads as a complete thought');
  }
  if (!props.restaurant?.mapImage) out.push('no real map image — the resolve scene uses the stylized fallback');
  if (!(props.consensus?.knows ?? []).length && kind === 'restaurant') {
    out.push('no weaknesses in the AI consensus — the "good to know" section hides itself');
  }
  return out;
}
