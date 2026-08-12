import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  filterListMentionsToFollowsOnly,
  filterListMentionsToSelfOrReviewBacked,
} from '../filter-list-mentions-to-follows-only.js';

const ME = 'viewer-1';
const FOLLOWEE = 'followee-1';
const STRANGER = 'stranger-1';

test('filterListMentionsToFollowsOnly: keeps viewer and followees', () => {
  const follows = new Set([FOLLOWEE]);
  const out = filterListMentionsToFollowsOnly(
    [
      { added_by: ME, id: 1 },
      { added_by: FOLLOWEE, id: 2 },
      { added_by: STRANGER, id: 3 },
    ],
    ME,
    follows
  );
  assert.deepEqual(
    out.map((r) => r.id),
    [1, 2]
  );
});

test('filterListMentionsToFollowsOnly: drops rows without added_by', () => {
  const out = filterListMentionsToFollowsOnly(
    [{ added_by: null }, { added_by: '' }, { id: 'orphan' }, { added_by: ME }],
    ME,
    new Set()
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].added_by, ME);
});

test('filterListMentionsToFollowsOnly: non-array mentions → empty', () => {
  assert.deepEqual(filterListMentionsToFollowsOnly(null, ME, new Set()), []);
  assert.deepEqual(filterListMentionsToFollowsOnly(undefined, ME, new Set()), []);
  assert.deepEqual(filterListMentionsToFollowsOnly({}, ME, new Set()), []);
});

test('filterListMentionsToFollowsOnly: invalid following set treated as empty', () => {
  const out = filterListMentionsToFollowsOnly(
    [{ added_by: FOLLOWEE }, { added_by: ME }],
    ME,
    null
  );
  assert.deepEqual(
    out.map((r) => r.added_by),
    [ME]
  );
});

test('filterListMentionsToFollowsOnly: no viewer id → only followees', () => {
  const out = filterListMentionsToFollowsOnly(
    [{ added_by: FOLLOWEE }, { added_by: STRANGER }],
    null,
    new Set([FOLLOWEE])
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].added_by, FOLLOWEE);
});

test('filterListMentionsToSelfOrReviewBacked: keeps own saves without review', () => {
  const out = filterListMentionsToSelfOrReviewBacked(
    [{ added_by: ME }, { added_by: FOLLOWEE }, { added_by: FOLLOWEE, contributor_review: { id: 1 } }],
    ME
  );
  assert.equal(out.length, 2);
  assert.ok(out.some((r) => r.added_by === ME));
  assert.ok(out.some((r) => r.contributor_review));
});

test('filterListMentionsToSelfOrReviewBacked: non-array / missing added_by', () => {
  assert.deepEqual(filterListMentionsToSelfOrReviewBacked(null, ME), []);
  assert.deepEqual(
    filterListMentionsToSelfOrReviewBacked([{ added_by: null, contributor_review: {} }], ME),
    []
  );
});
