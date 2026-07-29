import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  clampMapListPanelWidth,
  compactMapSelectedSpotRow,
  parseMapChipPrefs,
  parseMapFilterPrefs,
  parseMapSelectedSpot,
} from '../map-storage-prefs.js';

const UUID = '550e8400-e29b-41d4-a716-446655440000';

test('clampMapListPanelWidth enforces min 260 and max 560', () => {
  assert.equal(clampMapListPanelWidth(100, 2000), 260);
  assert.equal(clampMapListPanelWidth(900, 2000), 560);
});

test('clampMapListPanelWidth respects half viewport cap', () => {
  assert.equal(clampMapListPanelWidth(400, 600), 300);
});

test('parseMapFilterPrefs defaults to distance sort and empty filters', () => {
  assert.deepEqual(parseMapFilterPrefs(null), {
    selectedTagSlugs: [],
    minRating: 0,
    sortMode: 'distance',
  });
  assert.deepEqual(parseMapFilterPrefs([]), {
    selectedTagSlugs: [],
    minRating: 0,
    sortMode: 'distance',
  });
});

test('parseMapFilterPrefs rejects invalid sortMode', () => {
  const out = parseMapFilterPrefs({ sortMode: 'popularity' });
  assert.equal(out.sortMode, 'distance');
});

test('parseMapFilterPrefs clamps minRating to 0–5 in 0.5 steps', () => {
  assert.equal(parseMapFilterPrefs({ minRating: -1 }).minRating, 0);
  assert.equal(parseMapFilterPrefs({ minRating: 99 }).minRating, 5);
  assert.equal(parseMapFilterPrefs({ minRating: 3.33 }).minRating, 3.5);
});

test('parseMapFilterPrefs trims tag slugs and drops blanks', () => {
  const out = parseMapFilterPrefs({
    selectedTagSlugs: [' pizza ', '', 42, 'sushi'],
    sortMode: 'recent',
  });
  assert.deepEqual(out.selectedTagSlugs, ['pizza', 'sushi']);
  assert.equal(out.sortMode, 'recent');
});

test('parseMapChipPrefs defaults when raw is invalid', () => {
  assert.deepEqual(parseMapChipPrefs(undefined), {
    savedActive: false,
    followingActive: false,
    selectedSavedListIds: 'all',
    selectedFollowingListIds: 'all',
  });
});

test('parseMapChipPrefs reads booleans and list id selections', () => {
  const out = parseMapChipPrefs({
    savedActive: true,
    followingActive: 1,
    selectedSavedListIds: ['a', '', 'b'],
    selectedFollowingListIds: 'all',
  });
  assert.equal(out.savedActive, true);
  assert.equal(out.followingActive, false);
  assert.deepEqual(out.selectedSavedListIds, ['a', 'b']);
  assert.equal(out.selectedFollowingListIds, 'all');
});

test('parseMapChipPrefs invalid selection arrays fall back to all', () => {
  assert.equal(parseMapChipPrefs({ selectedSavedListIds: 123 }).selectedSavedListIds, 'all');
});

test('compactMapSelectedSpotRow drops invalid rows', () => {
  assert.equal(compactMapSelectedSpotRow(null), null);
  assert.equal(compactMapSelectedSpotRow({ name: 'No id' }), null);
});

test('compactMapSelectedSpotRow keeps finite coords and optional fields', () => {
  const out = compactMapSelectedSpotRow({
    id: UUID,
    name: 'Test',
    latitude: '38.7',
    longitude: 'bad',
    rating: 4.5,
    is_sponsored: true,
    phone: '  ',
  });
  assert.equal(out.id, UUID);
  assert.equal(out.name, 'Test');
  assert.equal(out.latitude, 38.7);
  assert.equal(out.longitude, undefined);
  assert.equal(out.rating, 4.5);
  assert.equal(out.is_sponsored, true);
  assert.equal(out.phone, undefined);
});

test('parseMapSelectedSpot requires valid uuid id', () => {
  assert.equal(parseMapSelectedSpot(null), null);
  assert.equal(parseMapSelectedSpot({ id: 'not-a-uuid' }), null);
});

test('parseMapSelectedSpot returns id and compact row', () => {
  const out = parseMapSelectedSpot({
    id: UUID,
    row: { id: UUID, name: 'Spot', latitude: 1, longitude: 2 },
  });
  assert.ok(out);
  assert.equal(out.id, UUID);
  assert.equal(out.row?.name, 'Spot');
});
