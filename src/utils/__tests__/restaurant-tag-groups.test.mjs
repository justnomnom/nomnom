import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  mergeDishTagsForPreferences,
  userDishTagIdSet,
} from '../restaurant-tag-groups.js';

test('mergeDishTagsForPreferences keeps non-dish tags and merges dish tags', () => {
  const catalog = [
    { id: 'a', slug: 'pizza', label: 'Pizza', category: 'cuisine', sort_order: 1 },
    { id: 'b', slug: 'rice', label: 'Rice', category: 'dish', sort_order: 2 },
  ];
  const userDishes = [
    { id: 'c', slug: 'pasta', label: 'Pasta', category: 'dish', sort_order: 5 },
  ];

  const merged = mergeDishTagsForPreferences(catalog, userDishes);

  assert.equal(merged.filter((t) => t.category === 'cuisine').length, 1);
  const dishes = merged.filter((t) => t.category === 'dish');
  assert.equal(dishes.length, 2);
  assert.ok(dishes.some((t) => t.id === 'b'));
  assert.ok(dishes.some((t) => t.id === 'c'));
});

test('mergeDishTagsForPreferences dedupes user dishes already in catalog', () => {
  const catalog = [{ id: 'b', slug: 'rice', label: 'Rice', category: 'dish', sort_order: 2 }];
  const userDishes = [{ id: 'b', slug: 'rice', label: 'Rice', category: 'dish', sort_order: 2 }];

  const merged = mergeDishTagsForPreferences(catalog, userDishes);

  assert.equal(merged.filter((t) => t.category === 'dish').length, 1);
});

test('userDishTagIdSet normalizes ids', () => {
  const set = userDishTagIdSet([{ id: 'ABC-DEF' }, { id: '  ' }]);
  assert.equal(set.size, 1);
  assert.ok(set.has('abc-def'));
});
