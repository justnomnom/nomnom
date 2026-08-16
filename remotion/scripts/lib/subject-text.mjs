// Text and display helpers shared by the props fetchers.
// Nothing here invents content — every function only reshapes a real value.

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const fmtCount = (n) => (n != null ? new Intl.NumberFormat('en-US').format(n) : null);

export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function prettifyUsername(username) {
  if (!username) return null;
  const stripped = username.replace(/^@/, '');
  return stripped
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function handleOf(username) {
  if (!username) return null;
  return username.startsWith('@') ? username : `@${username}`;
}

export function truncateQuote(text, maxChars = 150) {
  const trimmed = String(text || '').trim();
  if (trimmed.length <= maxChars) return trimmed;
  const cut = trimmed.slice(0, maxChars);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxChars)}…`;
}

/** Split a name over two display lines the way the compositions expect. */
export function wrapName(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [name || ''];
  if (words.length === 2) return [words[0], words[1]];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
}

/** Avatar tints, cycled by index so repeated avatars stay distinguishable. */
export const AVATAR_PALETTE = [
  { tint: '#FFE8DF', ink: '#B8481F' },
  { tint: '#FCE7C8', ink: '#B45309' },
  { tint: '#E7DCC9', ink: '#6e6657' },
  { tint: '#DCEAE3', ink: '#2F6B57' },
  { tint: '#E3DEF5', ink: '#5B4B8A' },
];

/** URL-safe slug used for props/out filenames. */
export const slugify = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
