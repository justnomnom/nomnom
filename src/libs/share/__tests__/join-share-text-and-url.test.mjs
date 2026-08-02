import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import { joinShareTextAndUrl } from '../join-share-text-and-url.js';

describe('joinShareTextAndUrl', () => {
  test('separates the overview from the link with a blank line', () => {
    assert.equal(joinShareTextAndUrl('A\n★ 4.6', 'https://x.test/r/1'), 'A\n★ 4.6\n\nhttps://x.test/r/1');
  });

  test('falls back to the url alone when there is no overview', () => {
    assert.equal(joinShareTextAndUrl('', 'https://x.test/r/1'), 'https://x.test/r/1');
    assert.equal(joinShareTextAndUrl(null, 'https://x.test/r/1'), 'https://x.test/r/1');
  });

  test('returns the overview alone when there is no url', () => {
    assert.equal(joinShareTextAndUrl('A', ''), 'A');
  });

  test('is empty when given nothing', () => {
    assert.equal(joinShareTextAndUrl('', ''), '');
  });
});
