import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { buildWinnerReplyText } from '../build-table-winner-reply-text.js';

describe('buildWinnerReplyText', () => {
  test('returns lead only when maps is absent', () => {
    assert.equal(
      buildWinnerReplyText({ lead: "We're going here: Taberna" }),
      "We're going here: Taberna"
    );
  });

  test('appends maps on a blank line', () => {
    assert.equal(
      buildWinnerReplyText({
        lead: "We're going here: Taberna",
        mapsLink: 'https://maps.example/x',
      }),
      "We're going here: Taberna\n\nhttps://maps.example/x"
    );
  });

  test('trims and drops blank maps', () => {
    assert.equal(buildWinnerReplyText({ lead: '  A  ', mapsLink: '  ' }), 'A');
    assert.equal(buildWinnerReplyText({ lead: '', mapsLink: 'https://m' }), '');
    assert.equal(buildWinnerReplyText({ lead: null }), '');
  });
});
