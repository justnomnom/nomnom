/**
 * Pure helpers shared by split list server actions.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  enrichListItemsWithReviewsAndMustTry,
  itemCountFromListItemsEmbed,
  normUuid,
  resolveViewerLangInput,
} from '../actions/_shared.js';

test('normUuid: stringifies; nullish → empty', () => {
  assert.equal(normUuid('abc'), 'abc');
  assert.equal(normUuid(12), '12');
  assert.equal(normUuid(null), '');
  assert.equal(normUuid(undefined), '');
});

test('itemCountFromListItemsEmbed: reads PostgREST count embed shapes', () => {
  assert.equal(itemCountFromListItemsEmbed([{ count: 3 }]), 3);
  assert.equal(itemCountFromListItemsEmbed([{ count: '7' }]), 7);
  assert.equal(itemCountFromListItemsEmbed([{ count: '' }]), 0);
  assert.equal(itemCountFromListItemsEmbed([]), 0);
  assert.equal(itemCountFromListItemsEmbed(null), 0);
});

test('resolveViewerLangInput: awaits promises; only pt is pt', async () => {
  assert.equal(await resolveViewerLangInput('en'), 'en');
  assert.equal(await resolveViewerLangInput('pt'), 'pt');
  assert.equal(await resolveViewerLangInput('fr'), 'en');
  assert.equal(await resolveViewerLangInput(Promise.resolve('pt')), 'pt');
  assert.equal(await resolveViewerLangInput(Promise.resolve('PT')), 'en');
});

test('enrichListItemsWithReviewsAndMustTry: empty / missing items → []', async () => {
  const fakeSupabase = {};
  assert.deepEqual(await enrichListItemsWithReviewsAndMustTry(fakeSupabase, [], 'en'), []);
  assert.deepEqual(await enrichListItemsWithReviewsAndMustTry(fakeSupabase, null, 'en'), []);
});
