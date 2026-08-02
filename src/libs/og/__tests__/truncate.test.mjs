import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import { truncate } from '../truncate.js';

describe('truncate', () => {
  test('leaves text within budget untouched', () => {
    assert.equal(truncate('Tasca do Chico', 40), 'Tasca do Chico');
  });

  test('collapses runs of whitespace, including newlines from a bio field', () => {
    assert.equal(truncate('  Lisbon   tascas,\n\nmostly.  ', 40), 'Lisbon tascas, mostly.');
  });

  test('cuts on a word boundary when one falls late enough', () => {
    const out = truncate('Restaurante Retiro dos Cubanos', 20);
    assert.equal(out, 'Restaurante Retiro…');
    assert.ok(out.length <= 20);
  });

  test('breaks mid-word when the only space is too early to be useful', () => {
    // A late break would leave "A…" — the long word has to be cut instead.
    assert.equal(truncate('A Cervejariaramiroramiro', 12), 'A Cervejari…');
  });

  test('never exceeds max, ellipsis included', () => {
    for (const max of [2, 5, 12, 33, 64]) {
      assert.ok(truncate('x'.repeat(200), max).length <= max, `max ${max}`);
    }
  });

  test('preserves Portuguese diacritics rather than splitting them', () => {
    // The space at index 4 is below the 60% threshold, so this breaks mid-word — the point
    // is that the cut lands between characters and leaves "ç" whole, not half a codepoint.
    assert.equal(truncate('Ação Coração Pão', 12), 'Ação Coraçã…');
    assert.equal(truncate('Ação Coração Pão de Lisboa', 20), 'Ação Coração Pão…');
  });

  test('coerces non-strings to empty, so a null bio renders nothing', () => {
    assert.equal(truncate(null, 20), '');
    assert.equal(truncate(undefined, 20), '');
    assert.equal(truncate(42, 20), '');
    assert.equal(truncate({}, 20), '');
  });

  test('a whitespace-only value is empty, not a lone ellipsis', () => {
    assert.equal(truncate('   ', 20), '');
  });
});
