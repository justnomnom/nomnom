// Remotion merges a composition's defaultProps *underneath* the props file, so
// a key missing from a generated props file does not fail — it silently renders
// the placeholder venue. That is the one bug this project cannot ship, so the
// key sets are compared directly against the composition source.

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');

/** Top-level keys of the first object literal assigned to `name`. */
function defaultPropKeys(file, name) {
  const source = readFileSync(file, 'utf8');
  const start = source.indexOf(`${name} = {`);
  assert.notEqual(start, -1, `${name} not found in ${file}`);
  const body = source.slice(start);
  const end = body.indexOf('\n};');
  assert.notEqual(end, -1, `could not find the end of ${name}`);
  return [...body.slice(0, end).matchAll(/^ {2}([a-zA-Z][a-zA-Z0-9]*):/gm)].map((m) => m[1]);
}

/**
 * Top-level keys the fetcher writes, read out of its `const props = {...}`.
 * Matches both `key:` and the ES shorthand `key,`.
 */
function emittedKeys(script) {
  const source = readFileSync(join(SRC, '..', 'scripts', script), 'utf8');
  const start = source.indexOf('const props = {');
  assert.notEqual(start, -1, `no props literal in ${script}`);
  const body = source.slice(start);
  return [...body.slice(0, body.indexOf('\n};')).matchAll(/^ {2}([a-zA-Z][a-zA-Z0-9]*)\s*[:,]/gm)].map((m) => m[1]);
}

describe('generated props cover every composition key', () => {
  it('fetch-restaurant-props covers RestaurantReviewsReel', () => {
    const required = defaultPropKeys(join(SRC, 'Root.jsx'), 'const defaultProps');
    const emitted = emittedKeys('fetch-restaurant-props.mjs');
    const missing = required.filter((k) => !emitted.includes(k));
    assert.deepEqual(missing, [], `these keys would fall back to the placeholder: ${missing.join(', ')}`);
  });

  it('fetch-restaurant-props also covers RestaurantSpotlight, which reads review/heroPhoto', () => {
    const required = defaultPropKeys(
      join(SRC, 'compositions', 'RestaurantSpotlight', 'index.jsx'),
      'export const defaultRestaurantSpotlightProps'
    );
    const emitted = emittedKeys('fetch-restaurant-props.mjs');
    const missing = required.filter((k) => !emitted.includes(k));
    assert.deepEqual(missing, [], `these keys would fall back to the placeholder: ${missing.join(', ')}`);
    assert.ok(required.includes('review') && required.includes('heroPhoto'), 'guards the exact keys that leaked before');
  });

  it('fetch-list-props covers ListShowcase', () => {
    const required = defaultPropKeys(
      join(SRC, 'compositions', 'ListShowcase', 'index.jsx'),
      'export const defaultListShowcaseProps'
    );
    const emitted = emittedKeys('fetch-list-props.mjs');
    const missing = required.filter((k) => !emitted.includes(k));
    assert.deepEqual(missing, [], `these keys would fall back to the placeholder: ${missing.join(', ')}`);
  });
});
