/**
 * Frontend QA — signature dish label normalization from review consensus.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { signatureDishLabelsFromConsensus } from '../signature-dish-labels.js';

test('null / non-object → []', () => {
  assert.deepEqual(signatureDishLabelsFromConsensus(null), []);
  assert.deepEqual(signatureDishLabelsFromConsensus(undefined), []);
  assert.deepEqual(signatureDishLabelsFromConsensus('x'), []);
  assert.deepEqual(signatureDishLabelsFromConsensus(42), []);
});

test('missing or non-array signature_dishes → []', () => {
  assert.deepEqual(signatureDishLabelsFromConsensus({}), []);
  assert.deepEqual(signatureDishLabelsFromConsensus({ signature_dishes: null }), []);
  assert.deepEqual(signatureDishLabelsFromConsensus({ signature_dishes: 'pasta' }), []);
});

test('string labels: trim, keep first casing, drop empties', () => {
  assert.deepEqual(
    signatureDishLabelsFromConsensus({
      signature_dishes: ['  Pasta  ', '', '   ', 'Pizza'],
    }),
    ['Pasta', 'Pizza']
  );
});

test('{ label } objects supported; non-label objects skipped', () => {
  assert.deepEqual(
    signatureDishLabelsFromConsensus({
      signature_dishes: [
        { label: '  Ramen  ' },
        { name: 'ignored' },
        null,
        12,
        { label: '' },
        { label: 'Sushi' },
      ],
    }),
    ['Ramen', 'Sushi']
  );
});

test('case-insensitive dedupe keeps first occurrence label', () => {
  assert.deepEqual(
    signatureDishLabelsFromConsensus({
      signature_dishes: ['Pizza', 'PIZZA', { label: 'pizza' }, 'Pasta'],
    }),
    ['Pizza', 'Pasta']
  );
});

test('mixed string + object array', () => {
  assert.deepEqual(
    signatureDishLabelsFromConsensus({
      signature_dishes: ['Burger', { label: 'burger' }, { label: 'Fries' }],
    }),
    ['Burger', 'Fries']
  );
});
