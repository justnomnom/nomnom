import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  RESTAURANT_TAG_CATEGORY_ORDER,
  getRestaurantTagDisplayLabel,
  groupRestaurantTagsByCategory,
  isRestaurantDishFacetTag,
  mergeDishTagsForPreferences,
  orderRestaurantTagsForDetail,
  splitRestaurantTagsForDetailDisplay,
  userDishTagIdSet,
} from '../restaurant-tag-groups.js';

test('groupRestaurantTagsByCategory: empty / non-array', () => {
  assert.deepEqual(groupRestaurantTagsByCategory(null), []);
  assert.deepEqual(groupRestaurantTagsByCategory([]), []);
  assert.deepEqual(groupRestaurantTagsByCategory(undefined), []);
});

test('groupRestaurantTagsByCategory: orders by RESTAURANT_TAG_CATEGORY_ORDER then extras', () => {
  const tags = [
    { id: '1', slug: 'loud', label: 'Loud', category: 'vibe', sort_order: 2 },
    { id: '2', slug: 'pizza', label: 'Pizza', category: 'cuisine', sort_order: 1 },
    { id: '3', slug: 'custom', label: 'Custom', category: 'mystery', sort_order: 0 },
    { id: '4', slug: 'quiet', label: 'Quiet', category: 'vibe', sort_order: 1 },
  ];
  const groups = groupRestaurantTagsByCategory(tags);
  assert.equal(groups[0].category, 'cuisine');
  assert.equal(groups[1].category, 'vibe');
  assert.deepEqual(
    groups[1].tags.map((t) => t.slug),
    ['quiet', 'loud']
  );
  assert.equal(groups[groups.length - 1].category, 'mystery');
});

test('groupRestaurantTagsByCategory: missing category → other', () => {
  const groups = groupRestaurantTagsByCategory([
    { id: '1', slug: 'x', label: 'X', category: '', sort_order: 0 },
  ]);
  assert.equal(groups[0].category, 'other');
});

test('orderRestaurantTagsForDetail: flattens category order', () => {
  const ordered = orderRestaurantTagsForDetail([
    { id: '1', slug: 'v', label: 'V', category: 'vibe', sort_order: 0 },
    { id: '2', slug: 'c', label: 'C', category: 'cuisine', sort_order: 0 },
  ]);
  assert.deepEqual(
    ordered.map((t) => t.category),
    ['cuisine', 'vibe']
  );
  assert.deepEqual(orderRestaurantTagsForDetail(null), []);
});

test('isRestaurantDishFacetTag: category dish or canonical slug', () => {
  assert.equal(isRestaurantDishFacetTag({ category: 'dish', slug: 'rice' }), true);
  assert.equal(
    isRestaurantDishFacetTag({
      category: 'other',
      slug: 'dish-550e8400e29b41d4a716446655440000-pasta-abcdef1234',
    }),
    true
  );
  assert.equal(isRestaurantDishFacetTag({ category: 'cuisine', slug: 'italian' }), false);
  assert.equal(isRestaurantDishFacetTag(null), false);
  assert.equal(isRestaurantDishFacetTag('dish'), false);
});

test('splitRestaurantTagsForDetailDisplay: separates primary vs dish', () => {
  const { detailTagsPrimary, detailDishTags } = splitRestaurantTagsForDetailDisplay([
    { id: '1', slug: 'italian', label: 'Italian', category: 'cuisine', sort_order: 0 },
    { id: '2', slug: 'pasta', label: 'Pasta', category: 'dish', sort_order: 0 },
  ]);
  assert.equal(detailTagsPrimary.length, 1);
  assert.equal(detailDishTags.length, 1);
  assert.equal(detailDishTags[0].category, 'dish');
});

test('getRestaurantTagDisplayLabel: appends price range when t resolves', () => {
  const t = (key) => (key.includes('budget') ? '€10–20' : key);
  assert.equal(
    getRestaurantTagDisplayLabel({ slug: 'budget', label: 'Budget', category: 'price' }, t),
    'Budget (€10–20)'
  );
});

test('getRestaurantTagDisplayLabel: falls back when missing/untranslated', () => {
  const t = (key) => key;
  assert.equal(
    getRestaurantTagDisplayLabel({ slug: 'budget', label: 'Budget', category: 'price' }, t),
    'Budget'
  );
  assert.equal(getRestaurantTagDisplayLabel(null, t), '');
  assert.equal(
    getRestaurantTagDisplayLabel({ slug: 'italian', label: 'Italian', category: 'cuisine' }, t),
    'Italian'
  );
});

test('mergeDishTagsForPreferences: handles null inputs', () => {
  assert.deepEqual(mergeDishTagsForPreferences(null, null), []);
  assert.equal(mergeDishTagsForPreferences([{ id: '1', category: 'cuisine' }], null).length, 1);
});

test('userDishTagIdSet: empty / null / whitespace ids', () => {
  assert.equal(userDishTagIdSet(null).size, 0);
  assert.equal(userDishTagIdSet([]).size, 0);
  assert.equal(userDishTagIdSet([{ id: null }, { id: '  ' }]).size, 0);
});

test('RESTAURANT_TAG_CATEGORY_ORDER starts with cuisine then dish', () => {
  assert.equal(RESTAURANT_TAG_CATEGORY_ORDER[0], 'cuisine');
  assert.equal(RESTAURANT_TAG_CATEGORY_ORDER[1], 'dish');
});
