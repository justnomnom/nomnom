import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { buildDecideWinnerReplyText } from '../build-decide-winner-reply-text.js';

describe('buildDecideWinnerReplyText', () => {
  test('returns lead only when maps is absent', () => {
    assert.equal(
      buildDecideWinnerReplyText({ lead: "We're going here: Taberna" }),
      "We're going here: Taberna"
    );
  });

  test('appends maps on a blank line', () => {
    assert.equal(
      buildDecideWinnerReplyText({
        lead: "We're going here: Taberna",
        mapsLink: 'https://maps.example/x',
      }),
      "We're going here: Taberna\n\nhttps://maps.example/x"
    );
  });

  test('trims and drops blank maps', () => {
    assert.equal(buildDecideWinnerReplyText({ lead: '  A  ', mapsLink: '  ' }), 'A');
    assert.equal(buildDecideWinnerReplyText({ lead: '', mapsLink: 'https://m' }), '');
    assert.equal(buildDecideWinnerReplyText({ lead: null }), '');
  });
});
