/**
 * `fetchMapSpotDetailById` must derive `openingStatus` from the raw metadata blob,
 * then slim. Hours are not on the card allowlist — slimming first would drop them
 * and the sheet would never show open/closed.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { attachOpeningStatusToRows } from 'src/libs/restaurant/opening-hours';
import {
  CARD_METADATA_KEYS,
  slimRestaurantRowsMetadata,
} from 'src/libs/restaurant/slim-restaurant-card-metadata';

const MON_1300 = new Date('2026-07-20T12:00:00Z');

const RAW_HOURS_BLOB = {
  rating: 4.4,
  hero_url: 'https://cdn/hero.jpg',
  user_reviews: 'x'.repeat(4000),
  hours_parsed: {
    Monday: [{ open: '12:00', close: '15:00', crosses_midnight: false }],
  },
  timezone: 'Europe/Lisbon',
};

test('CARD_METADATA_KEYS does not include hours — opening status must be derived first', () => {
  assert.equal(CARD_METADATA_KEYS.includes('hours_parsed'), false);
  assert.equal(CARD_METADATA_KEYS.includes('open_hours'), false);
  assert.equal(CARD_METADATA_KEYS.includes('timezone'), false);
});

test('map pin hydration: slim(attachOpeningStatus(raw)) keeps status and drops hours', () => {
  const data = {
    id: 'rid',
    name: 'Cafe',
    metadata: RAW_HOURS_BLOB,
  };
  const [row] = slimRestaurantRowsMetadata(attachOpeningStatusToRows([data], MON_1300));
  assert.equal(row.openingStatus.status, 'open');
  assert.equal(row.openingStatus.closesAt, '15:00');
  assert.equal(row.metadata.rating, 4.4);
  assert.equal(row.metadata.hero_url, 'https://cdn/hero.jpg');
  assert.equal('hours_parsed' in row.metadata, false);
  assert.equal('user_reviews' in row.metadata, false);
});

test('map pin hydration: slimming first would lose opening status (the bug this order prevents)', () => {
  const data = {
    id: 'rid',
    name: 'Cafe',
    metadata: RAW_HOURS_BLOB,
  };
  const [slimmedFirst] = attachOpeningStatusToRows(
    slimRestaurantRowsMetadata([data]),
    MON_1300
  );
  assert.equal('openingStatus' in slimmedFirst, false);
});

test('fetchMapSpotDetailById derives opening status before slimming', () => {
  const src = fs.readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../auth/actions/location-actions.js'),
    'utf8'
  );
  const fn = src.slice(src.indexOf('export async function fetchMapSpotDetailById'));
  assert.match(fn, /slimRestaurantRowsMetadata\(attachOpeningStatusToRows\(\[data\]\)\)/);
});
