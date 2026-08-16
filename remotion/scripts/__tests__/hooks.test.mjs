import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MAX_LINE_CHARS, MIN_MENTIONS, buildHook, hashId } from '../lib/hooks.mjs';

const withMentions = { id: 'a', location: 'Lisboa', dishes: [['Carbonara', 21]], rating: 4.9, reviewCount: 924 };

describe('buildHook', () => {
  it('leads with a real mention count when a dish has one', () => {
    // Force the mentions template by finding an id that lands on it.
    const hooks = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => buildHook({ ...withMentions, id }));
    const mentions = hooks.find((h) => h.template === 'mentions');
    assert.ok(mentions, 'mentions template should be reachable');
    assert.deepEqual(mentions.lines, ['21 reviews', 'mention the', 'Carbonara.']);
  });

  it('offers the numbers template alongside it, so a batch varies', () => {
    const templates = new Set(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => buildHook({ ...withMentions, id }).template)
    );
    assert.ok(templates.size > 1, `expected variety, got ${[...templates]}`);
  });

  it('skips a dish whose name would overflow the 106px line', () => {
    const long = buildHook({ ...withMentions, dishes: [['Bacalhau com natas', 40]] });
    assert.notEqual(long.template, 'mentions');
  });

  it('ignores a dish mentioned too few times to be worth claiming', () => {
    const thin = buildHook({ ...withMentions, dishes: [['Pastel', MIN_MENTIONS - 1]], reviewCount: 10 });
    assert.equal(thin.template, 'default');
  });

  it('never uses the generic copy when a real figure is available', () => {
    const templates = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => buildHook({ ...withMentions, id }).template);
    assert.ok(!templates.includes('default'), `generic copy should lose to real figures, got ${[...new Set(templates)]}`);
  });

  it('falls back to the original copy when there are no figures', () => {
    const bare = buildHook({ id: 'x', location: 'Porto', dishes: [], rating: null, reviewCount: null });
    assert.equal(bare.template, 'default');
    assert.deepEqual(bare.lines, ['Locals', "won't stop", 'talking about', 'this spot.']);
  });

  it('never emits a line that would overflow', () => {
    const subjects = [
      withMentions,
      { id: 'y', location: 'Vila Nova de Gaia', dishes: [['Ostras', 9]], rating: 4.85, reviewCount: 12_345 },
      { id: 'z', dishes: [], rating: 5, reviewCount: 60 },
    ];
    for (const s of subjects) {
      for (const line of buildHook(s).lines) {
        assert.ok(line.length <= MAX_LINE_CHARS, `"${line}" is ${line.length} chars`);
      }
    }
  });

  it('gives the same venue the same hook every run', () => {
    assert.equal(buildHook(withMentions).template, buildHook(withMentions).template);
    assert.equal(hashId('same'), hashId('same'));
  });

  it('always names the location in the overline', () => {
    assert.equal(buildHook(withMentions).overline, 'Lisboa · right now');
    assert.equal(buildHook({ id: 'q' }).overline, 'Right here · right now');
  });
});
