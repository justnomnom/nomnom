/**
 * Frontend QA — list tile subtitle / visibility helpers (hub + saved index).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  NOM_NOM_LIST_COMPACT_THUMB_PX,
  listHubOwnerPrefix,
  listSpotsVisibilitySubtitle,
  listVisibilityIcon,
} from '../nom-nom-list-tile-helpers.js';

const t = (key, vars) => (vars ? `${key}:${JSON.stringify(vars)}` : key);

test('listVisibilityIcon: maps visibility to iconify ids', () => {
  assert.equal(listVisibilityIcon({ visibility: 'public_subscribers' }), 'solar:wallet-money-linear');
  assert.equal(listVisibilityIcon({ visibility: 'public' }), 'solar:global-linear');
  assert.equal(listVisibilityIcon({ visibility: 'private' }), 'solar:lock-bold');
  assert.equal(listVisibilityIcon({}), 'solar:lock-bold');
});

test('listSpotsVisibilitySubtitle: singular vs plural count', () => {
  assert.ok(listSpotsVisibilitySubtitle(t, { item_count: 1 }).includes('spot_count_one'));
  assert.ok(listSpotsVisibilitySubtitle(t, { item_count: 0 }).includes('spot_count_other'));
  assert.ok(listSpotsVisibilitySubtitle(t, { item_count: 7 }).includes('"count":7'));
  assert.ok(listSpotsVisibilitySubtitle(t, {}).includes('spot_count_other'));
});

test('listHubOwnerPrefix: null when no owner fields', () => {
  assert.equal(listHubOwnerPrefix(t, {}), null);
  assert.equal(listHubOwnerPrefix(t, { owner_username: '  ' }), null);
});

test('listHubOwnerPrefix: prefers @handle over display name', () => {
  const out = listHubOwnerPrefix(t, {
    owner_username: 'chef',
    owner_display_name: 'Chef Name',
  });
  assert.ok(out.includes('@chef'));
});

test('listHubOwnerPrefix: falls back to display name', () => {
  const out = listHubOwnerPrefix(t, { owner_display_name: '  Nom Nom  ' });
  assert.ok(out.includes('Nom Nom'));
});

test('NOM_NOM_LIST_COMPACT_THUMB_PX is 96 (skeleton/create tile sync)', () => {
  assert.equal(NOM_NOM_LIST_COMPACT_THUMB_PX, 96);
});
