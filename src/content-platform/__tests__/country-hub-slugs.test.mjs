/**
 * TEST-PLAN M2: /countries lists slugs from content/countries (+ restaurant JSON).
 * An empty tree renders an empty hub, so Portugal → Lisbon must exist on disk.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const COUNTRIES = path.join(ROOT, 'content', 'countries');

test('content/countries includes portugal/lisbon for the country hub drill-down', () => {
  assert.equal(fs.existsSync(COUNTRIES), true, 'content/countries');
  const countries = fs
    .readdirSync(COUNTRIES, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  assert.ok(countries.includes('portugal'), `got ${countries.join(',')}`);
  const cities = fs
    .readdirSync(path.join(COUNTRIES, 'portugal'), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  assert.ok(cities.includes('lisbon'), `got ${cities.join(',')}`);
});

test('collections and portugal influencer MDX exist so those hubs are not empty 404s', () => {
  const collections = fs
    .readdirSync(path.join(ROOT, 'content', 'collections'))
    .filter((f) => f.endsWith('.mdx'));
  assert.ok(collections.length > 0, 'content/collections/*.mdx');
  const countryCollections = fs
    .readdirSync(path.join(COUNTRIES, 'portugal', 'collections'))
    .filter((f) => f.endsWith('.mdx'));
  assert.ok(countryCollections.length > 0, 'content/countries/portugal/collections/*.mdx');
  const cityCollections = fs
    .readdirSync(path.join(COUNTRIES, 'portugal', 'lisbon', 'collections'))
    .filter((f) => f.endsWith('.mdx'));
  assert.ok(cityCollections.length > 0, 'content/countries/portugal/lisbon/collections/*.mdx');
  const influencersDir = path.join(ROOT, 'content', 'influencers');
  const influencerFiles = fs.readdirSync(influencersDir).filter((f) => f.endsWith('.mdx'));
  assert.ok(influencerFiles.length > 0, 'content/influencers/*.mdx');
  const hasPortugal = influencerFiles.some((f) =>
    fs.readFileSync(path.join(influencersDir, f), 'utf8').includes('country: portugal')
  );
  assert.equal(hasPortugal, true);
});

import { displaySlug } from '../content-hub-display.js';

test('displaySlug title-cases hub slugs', () => {
  assert.equal(displaySlug('portugal'), 'Portugal');
  assert.equal(displaySlug('lisbon'), 'Lisbon');
});
