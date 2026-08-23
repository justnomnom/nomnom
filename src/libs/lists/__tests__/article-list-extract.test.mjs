/**
 * Run: node --test src/libs/lists/__tests__/article-list-extract.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  stripArticleHtml,
  filterExtractedRows,
  mergeExtractedByName,
  capExtractedRows,
  chunkArticleText,
  finalizeExtractedRestaurants,
} from '../article-list-extract.js';

const ARTICLE = 'Cervejaria Ramiro still queues out the door. O Trevo is around the corner.';

test('stripArticleHtml removes scripts and tags from saved fixture', () => {
  const html = readFileSync(new URL('./fixtures/lisbon-weekend-article.html', import.meta.url), 'utf8');
  const text = stripArticleHtml(html);
  assert.equal(text.includes('window.track'), false);
  assert.equal(text.includes('Cervejaria Ramiro'), true);
  assert.ok(text.length > 100);
});

test('drops invented name even when evidence is a real sentence', () => {
  const rows = filterExtractedRows(
    [
      { name: 'Fake Bistro 1999', area: 'Chiado', evidence: 'still queues out the door' },
      { name: 'Cervejaria Ramiro', area: 'Intendente', evidence: 'Ramiro still queues out the door' },
    ],
    ARTICLE
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, 'Cervejaria Ramiro');
});

test('drops missing evidence', () => {
  const rows = filterExtractedRows([{ name: 'Cervejaria Ramiro', area: '', evidence: '' }], ARTICLE);
  assert.equal(rows.length, 0);
});

test('merge by normalizeName keeps first, joins extra evidence, fills area', () => {
  const merged = mergeExtractedByName([
    { name: 'Restaurante O Trevo', area: '', evidence: 'O Trevo is around the corner' },
    { name: 'O Trevo', area: 'Chiado', evidence: 'around the corner' },
  ]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].area, 'Chiado');
  assert.equal(merged[0].evidence.includes(' | '), true);
});

test('cap keeps first 20', () => {
  const rows = Array.from({ length: 25 }, (_, i) => ({ name: `N${i}`, area: '', evidence: 'x' }));
  assert.equal(capExtractedRows(rows).length, 20);
  assert.equal(capExtractedRows(rows)[0].name, 'N0');
});

test('chunkArticleText splits long articles with overlap', () => {
  const text = 'a'.repeat(13000);
  const chunks = chunkArticleText(text);
  assert.ok(chunks.length >= 2);
  assert.equal(chunks[0].length, 8000);
  assert.equal(chunks[1].startsWith(chunks[0].slice(-1000)), true);
});

test('finalizeExtractedRestaurants filters then merges then caps', () => {
  const out = finalizeExtractedRestaurants(
    { restaurants: [{ name: 'Cervejaria Ramiro', area: 'Intendente', evidence: 'Ramiro still queues out the door' }] },
    ARTICLE
  );
  assert.equal(out.length, 1);
});
