import assert from 'node:assert/strict';
import { test } from 'node:test';

import { hasNormalizedSuggestedCreators, normalizeSuggestedCreator } from '../suggested-creator.js';

test('normalizeSuggestedCreator: accepts non-RFC UUID versions and camelCase', () => {
  const row = {
    userId: '00000000-0000-0000-0000-000000000001',
    username: 'ana',
    displayName: 'Ana',
    avatarUrl: 'https://example.com/a.jpg',
  };
  const normalized = normalizeSuggestedCreator(row);
  assert.equal(normalized.userId, '00000000-0000-0000-0000-000000000001');
  assert.equal(normalized.name, 'Ana');
  assert.equal(normalized.subtitle, '@ana');
  assert.equal(normalized.avatar, 'https://example.com/a.jpg');
});

test('normalizeSuggestedCreator: drops invalid rows and unnamed ids', () => {
  assert.equal(normalizeSuggestedCreator(null), null);
  assert.equal(normalizeSuggestedCreator({ user_id: 'nope' }), null);
  assert.equal(
    normalizeSuggestedCreator({
      user_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    }),
    null
  );
});

test('hasNormalizedSuggestedCreators: true only when at least one row normalizes', () => {
  assert.equal(hasNormalizedSuggestedCreators(null), false);
  assert.equal(hasNormalizedSuggestedCreators([]), false);
  assert.equal(hasNormalizedSuggestedCreators([{ user_id: 'nope' }]), false);
  assert.equal(
    hasNormalizedSuggestedCreators([
      { user_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' },
    ]),
    false
  );
  assert.equal(
    hasNormalizedSuggestedCreators([
      { user_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', username: 'ana' },
    ]),
    true
  );
});
