import assert from 'node:assert/strict';
import { test } from 'node:test';

import { groupNotifications } from '../group-notifications.js';
import {
  bucketFeedEntriesByDate,
  resolveFeedEntryTimestamp,
  NOTIFICATION_DATE_SECTIONS,
  resolveNotificationDateSection,
} from '../notification-feed-helpers.js';

/** Fixed "now": local noon, so day-boundary maths never depends on the runner's TZ offset. */
const NOW = new Date(2026, 0, 15, 12, 0, 0);
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const at = (msAgo) => new Date(NOW.getTime() - msAgo).toISOString();

function single(id, msAgo) {
  return { kind: 'single', id, notification: { id, type: 'new_follower', created_at: at(msAgo) } };
}

test('sections are ordered newest-first', () => {
  assert.deepEqual([...NOTIFICATION_DATE_SECTIONS], ['today', 'week', 'earlier']);
});

test('same calendar day is today, even 11 hours back', () => {
  assert.equal(resolveNotificationDateSection(at(0), NOW), 'today');
  assert.equal(resolveNotificationDateSection(at(11 * HOUR), NOW), 'today');
});

test('yesterday falls out of today even when under 24h old', () => {
  // 13h before local noon = 23:00 yesterday — same 24h window, different calendar day.
  assert.equal(resolveNotificationDateSection(at(13 * HOUR), NOW), 'week');
});

test('the six days before today are this week, the seventh is earlier', () => {
  assert.equal(resolveNotificationDateSection(at(6 * DAY), NOW), 'week');
  assert.equal(resolveNotificationDateSection(at(7 * DAY), NOW), 'earlier');
});

test('future timestamps (clock skew) stay visible under today', () => {
  assert.equal(resolveNotificationDateSection(new Date(NOW.getTime() + HOUR), NOW), 'today');
});

test('missing or unparseable timestamps land in earlier', () => {
  assert.equal(resolveNotificationDateSection(null, NOW), 'earlier');
  assert.equal(resolveNotificationDateSection('not-a-date', NOW), 'earlier');
});

test('bucketing keeps feed order inside each section and drops empty ones', () => {
  const sections = bucketFeedEntriesByDate(
    [single('a', 0), single('b', 2 * HOUR), single('c', 3 * DAY), single('d', 30 * DAY)],
    NOW
  );

  assert.deepEqual(
    sections.map((s) => s.key),
    ['today', 'week', 'earlier']
  );
  assert.deepEqual(
    sections[0].entries.map((e) => e.id),
    ['a', 'b']
  );
  assert.equal(sections[1].entries.length, 1);
  assert.equal(sections[2].entries.length, 1);
});

test('a feed with only recent rows yields a single section', () => {
  const sections = bucketFeedEntriesByDate([single('a', 0), single('b', HOUR)], NOW);
  assert.equal(sections.length, 1);
  assert.equal(sections[0].key, 'today');
});

test('grouped list_update entries bucket by their newest timestamp', () => {
  const listUpdate = (id, msAgo) => ({
    id,
    type: 'list_update',
    data: { list_id: 'L1', creator_id: 'C1', list_name: 'L', restaurant_name: 'R' },
    read_at: null,
    created_at: at(msAgo),
  });

  const grouped = groupNotifications([
    listUpdate('a', 0),
    listUpdate('b', HOUR),
    listUpdate('c', 2 * HOUR),
  ]);
  assert.equal(grouped[0].kind, 'group');
  assert.equal(resolveFeedEntryTimestamp(grouped[0]), at(0));

  const sections = bucketFeedEntriesByDate(grouped, NOW);
  assert.equal(sections.length, 1);
  assert.equal(sections[0].key, 'today');
});

test('bucketing tolerates null and non-array input', () => {
  assert.deepEqual(bucketFeedEntriesByDate(null, NOW), []);
  assert.deepEqual(bucketFeedEntriesByDate([null, undefined], NOW), []);
  assert.equal(resolveFeedEntryTimestamp(null), null);
});
