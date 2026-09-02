/**
 * TEST-PLAN D6: dashboard map and public list map show a placeholder when Mapbox is unset.
 * Restaurant pages use a Google Maps CTA, not a static Mapbox tile (see TEST-PLAN notes).
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const SECTIONS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('D6 map canvas returns nothing without an access token', () => {
  const canvas = fs.readFileSync(path.join(SECTIONS, 'view', 'dashboard-map-canvas.js'), 'utf8');
  assert.match(canvas, /if \(!accessToken\) \{/);
  assert.match(canvas, /return null;/);
});

test('D6 map-view and public list map render map_placeholder when the token is missing', () => {
  const mapView = fs.readFileSync(path.join(SECTIONS, 'view', 'map-view.js'), 'utf8');
  assert.match(mapView, /!MAPBOX_API\.accessToken/);
  assert.match(mapView, /pages\.dashboard\.map\.map_placeholder/);

  const publicList = fs.readFileSync(
    path.resolve(SECTIONS, '..', 'lists', 'view', 'list-public-view.js'),
    'utf8'
  );
  assert.match(publicList, /!MAPBOX_API\.accessToken/);
});

test('typeahead stays open for an empty query so the no-matches copy can mount', () => {
  const mapView = fs.readFileSync(path.join(SECTIONS, 'view', 'map-view.js'), 'utf8');
  const discover = fs.readFileSync(
    path.resolve(SECTIONS, '..', 'discover', 'view', 'discover-view.js'),
    'utf8'
  );
  const mapBlock = mapView.slice(
    mapView.indexOf('<MapSearchSuggestions'),
    mapView.indexOf('</MapSearchSuggestions>')
  );
  const discoverBlock = discover.slice(
    discover.indexOf('<MapSearchSuggestions'),
    discover.indexOf('</MapSearchSuggestions>')
  );
  assert.match(mapBlock, /debouncedQuery/);
  assert.doesNotMatch(mapBlock, /inViewSuggestions\.length > 0/);
  assert.doesNotMatch(mapBlock, /elsewhereSuggestions\.length > 0/);
  assert.doesNotMatch(discoverBlock, /inMarketSuggestions\.length > 0/);
  assert.doesNotMatch(discoverBlock, /elsewhereSuggestions\.length > 0/);
});
