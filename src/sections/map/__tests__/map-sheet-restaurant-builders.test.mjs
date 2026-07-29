import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildSheetRestaurantFromMapPlace,
  spotIdEq,
} from '../map-sheet-restaurant-builders.js';

test('spotIdEq / buildSheetRestaurantFromMapPlace: null corners', () => {
  assert.equal(spotIdEq(null, null), false);
  assert.equal(buildSheetRestaurantFromMapPlace(null, []), null);
});

test('buildSheetRestaurantFromMapPlace: drops object tag_slugs', () => {
  const out = buildSheetRestaurantFromMapPlace(
    {
      id: '1',
      name: 'X',
      metadata: { tag_slugs: ['ok', null, { x: 1 }, '  '] },
    },
    [],
    { tagCatalogLoaded: true }
  );
  assert.equal(out.tags.length, 1);
  assert.equal(out.tags[0].slug, 'ok');
});

test('buildSheetRestaurantFromMapPlace: carries openingStatus through to the sheet', () => {
  // Resolved server-side in `fetchRestaurantsInBbox` before metadata slimming strips
  // `hours_parsed`, so by the time the sheet builds a restaurant it is already on the row.
  const out = buildSheetRestaurantFromMapPlace(
    { id: '1', name: 'X', openingStatus: { status: 'open', closesAt: '23:00' } },
    [],
    { tagCatalogLoaded: true }
  );
  assert.deepEqual(out.openingStatus, { status: 'open', closesAt: '23:00' });
});

test('buildSheetRestaurantFromMapPlace: openingStatus is null for pin-only rows', () => {
  // The 5000-row pin fetch deliberately skips hours resolution, so absent is normal.
  const out = buildSheetRestaurantFromMapPlace({ id: '1', name: 'X' }, [], {
    tagCatalogLoaded: true,
  });
  assert.equal(out.openingStatus, null);
});
