/**
 * Pure extract post-processing for article → list: HTML strip, honesty filters,
 * chunk merge, cap. No LLM, no database.
 */

import { normalizeName } from './pick-restaurant-match.js';

const SCRIPT_STYLE_RE = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;
const TAG_RE = /<[^>]+>/g;
const WS_RE = /\s+/g;
const CHUNK_TRIGGER = 12000;
const CHUNK_SIZE = 8000;
const CHUNK_OVERLAP = 1000;
const EXTRACT_CAP = 20;

/**
 * Accent-insensitive body text without venue-prefix stripping (that is name-only).
 * @param {unknown} text
 * @returns {string}
 */
export function normalizeArticleText(text) {
  if (typeof text !== 'string') return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(WS_RE, ' ')
    .trim();
}

/**
 * Collapse whitespace for evidence substring checks.
 * @param {unknown} text
 * @returns {string}
 */
export function collapseWhitespace(text) {
  if (typeof text !== 'string') return '';
  return text.replace(WS_RE, ' ').trim();
}

/**
 * Strip scripts/styles then tags. Fail-closed callers check length < 500.
 * @param {unknown} html
 * @returns {string}
 */
export function stripArticleHtml(html) {
  if (typeof html !== 'string') return '';
  return html.replace(SCRIPT_STYLE_RE, ' ').replace(TAG_RE, ' ').replace(WS_RE, ' ').trim();
}

/**
 * 8k windows with 1k overlap when the article is longer than 12k.
 * @param {string} articleText
 * @returns {string[]}
 */
export function chunkArticleText(articleText) {
  const text = typeof articleText === 'string' ? articleText : '';
  if (text.length <= CHUNK_TRIGGER) return [text];
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(text.length, start + CHUNK_SIZE);
    chunks.push(text.slice(start, end));
    if (end >= text.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks;
}

/**
 * Keep rows that are named in the article and whose evidence quote is in the text.
 * @param {unknown[]} restaurants
 * @param {string} articleText
 * @returns {{ name: string, area: string, evidence: string }[]}
 */
export function filterExtractedRows(restaurants, articleText) {
  const collapsed = collapseWhitespace(articleText);
  const articleNorm = normalizeArticleText(articleText);
  const rows = Array.isArray(restaurants) ? restaurants : [];
  return rows.reduce((out, row) => {
    const name = typeof row?.name === 'string' ? row.name.trim() : '';
    const evidence = typeof row?.evidence === 'string' ? row.evidence.trim() : '';
    const area = typeof row?.area === 'string' ? row.area.trim() : '';
    const nameNorm = normalizeName(name);
    const keep =
      name &&
      evidence &&
      collapsed.includes(collapseWhitespace(evidence)) &&
      nameNorm &&
      articleNorm.includes(nameNorm);
    if (keep) out.push({ name, area, evidence });
    return out;
  }, []);
}

/**
 * Merge extract rows by normalizeName: first-seen wins; extra evidence joined with ` | `;
 * empty area filled from a later row.
 * @param {{ name: string, area?: string, evidence?: string }[]} rows
 * @returns {{ name: string, area: string, evidence: string }[]}
 */
export function mergeExtractedByName(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const byKey = new Map();
  const order = [];
  list.forEach((row) => {
    const name = typeof row?.name === 'string' ? row.name.trim() : '';
    const key = name ? normalizeName(name) : '';
    if (!key) return;
    const evidence = typeof row.evidence === 'string' ? row.evidence.trim() : '';
    const area = typeof row.area === 'string' ? row.area.trim() : '';
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { name, area, evidence });
      order.push(key);
      return;
    }
    if (evidence && existing.evidence && evidence !== existing.evidence) {
      existing.evidence = `${existing.evidence} | ${evidence}`;
    } else if (evidence && !existing.evidence) {
      existing.evidence = evidence;
    }
    if (!existing.area && area) existing.area = area;
  });
  return order.map((key) => byKey.get(key));
}

/**
 * First N first-seen names after merge.
 * @param {{ name: string, area: string, evidence: string }[]} rows
 * @param {number} [cap]
 */
export function capExtractedRows(rows, cap = EXTRACT_CAP) {
  const list = Array.isArray(rows) ? rows : [];
  return list.slice(0, Math.max(0, cap));
}

/**
 * Filter, merge, cap a Qwen payload against the full article text.
 * @param {unknown} payload
 * @param {string} articleText
 */
export function finalizeExtractedRestaurants(payload, articleText) {
  const restaurants = payload && typeof payload === 'object' ? payload.restaurants : payload;
  const filtered = filterExtractedRows(restaurants, articleText);
  return capExtractedRows(mergeExtractedByName(filtered));
}
