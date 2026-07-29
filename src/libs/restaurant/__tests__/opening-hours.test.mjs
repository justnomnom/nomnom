import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

import {
  localTimeParts,
  minutesFromClock,
  openingStatusForRow,
  resolveOpeningStatus,
  attachOpeningStatusToRows,
} from '../opening-hours.js';

/** A Lisbon-local wall-clock time, expressed as the UTC instant it corresponds to. */
function lisbon(dateIso) {
  return new Date(dateIso);
}

/** 2026-07-20 is a Monday. Lisbon is UTC+1 in July. */
const MON_1300 = lisbon('2026-07-20T12:00:00Z');
const MON_1700 = lisbon('2026-07-20T16:00:00Z');
const MON_2330 = lisbon('2026-07-20T22:30:00Z');
const TUE_0030 = lisbon('2026-07-20T23:30:00Z');
const TUE_0400 = lisbon('2026-07-21T03:00:00Z');

const LUNCH_AND_DINNER = {
  timezone: 'Europe/Lisbon',
  hours_parsed: {
    Monday: [
      { open: '12:00', close: '15:00', crosses_midnight: false },
      { open: '19:00', close: '23:00', crosses_midnight: false },
    ],
  },
};

describe('minutesFromClock', () => {
  test('parses HH:MM', () => {
    assert.equal(minutesFromClock('00:00'), 0);
    assert.equal(minutesFromClock('09:30'), 570);
    assert.equal(minutesFromClock('23:59'), 1439);
  });

  test('rejects malformed input rather than guessing', () => {
    assert.equal(minutesFromClock('24:00'), null);
    assert.equal(minutesFromClock('12:60'), null);
    assert.equal(minutesFromClock('noon'), null);
    assert.equal(minutesFromClock(''), null);
    assert.equal(minutesFromClock(null), null);
  });
});

describe('localTimeParts', () => {
  test('reads the weekday and clock at the restaurant, not the viewer', () => {
    // 23:30 UTC on Monday is already Tuesday 00:30 in Lisbon (UTC+1 in July).
    const parts = localTimeParts(TUE_0030, 'Europe/Lisbon');
    assert.equal(parts.dayIndex, 2, 'Tuesday');
    assert.equal(parts.minutes, 30);
  });

  test('falls back to Lisbon when ingest wrote a bad timezone', () => {
    const parts = localTimeParts(MON_1300, 'Not/AZone');
    assert.equal(parts.dayIndex, 1);
    assert.equal(parts.minutes, 13 * 60);
  });
});

describe('resolveOpeningStatus', () => {
  test('open during a service window, and reports when it closes', () => {
    const out = resolveOpeningStatus(LUNCH_AND_DINNER, MON_1300);
    assert.equal(out.status, 'open');
    assert.equal(out.closesAt, '15:00');
    assert.equal(out.opensAt, null);
  });

  test('closed between lunch and dinner, and reports the next opening', () => {
    const out = resolveOpeningStatus(LUNCH_AND_DINNER, MON_1700);
    assert.equal(out.status, 'closed');
    assert.equal(out.opensAt, '19:00');
    assert.equal(out.closesAt, null);
  });

  test('no next opening left today', () => {
    const out = resolveOpeningStatus(LUNCH_AND_DINNER, TUE_0400);
    assert.equal(out.status, 'closed');
    assert.equal(out.opensAt, null);
  });

  test('a window that crosses midnight is open before midnight', () => {
    const late = {
      timezone: 'Europe/Lisbon',
      hours_parsed: { Monday: [{ open: '19:00', close: '02:00', crosses_midnight: true }] },
    };
    assert.equal(resolveOpeningStatus(late, MON_2330).status, 'open');
  });

  test("and still open after midnight, on yesterday's window", () => {
    const late = {
      timezone: 'Europe/Lisbon',
      hours_parsed: { Monday: [{ open: '19:00', close: '02:00', crosses_midnight: true }] },
    };
    // Tuesday 00:30 — Tuesday itself has no hours, but Monday's window reaches here.
    const out = resolveOpeningStatus(late, TUE_0030);
    assert.equal(out.status, 'open');
    assert.equal(out.closesAt, '02:00');
  });

  test("but shut once yesterday's window has ended", () => {
    const late = {
      timezone: 'Europe/Lisbon',
      hours_parsed: { Monday: [{ open: '19:00', close: '02:00', crosses_midnight: true }] },
    };
    assert.equal(resolveOpeningStatus(late, TUE_0400).status, 'closed');
  });

  test('infers a midnight crossing even when the flag is missing', () => {
    const late = {
      timezone: 'Europe/Lisbon',
      hours_parsed: { Monday: [{ open: '19:00', close: '02:00' }] },
    };
    assert.equal(resolveOpeningStatus(late, MON_2330).status, 'open');
  });

  test('permanently and temporarily closed are distinct states', () => {
    assert.equal(
      resolveOpeningStatus({ is_closed: true, closed_reason: 'permanently_closed' }, MON_1300).status,
      'permanently_closed'
    );
    assert.equal(
      resolveOpeningStatus({ is_closed: true, closed_reason: 'temporarily_closed' }, MON_1300).status,
      'temporarily_closed'
    );
  });

  test('missing or unusable hours resolve to unknown, never closed', () => {
    // Saying "closed" because ingest failed is worse than saying nothing at all.
    assert.equal(resolveOpeningStatus(null, MON_1300).status, 'unknown');
    assert.equal(resolveOpeningStatus({}, MON_1300).status, 'unknown');
    assert.equal(resolveOpeningStatus({ hours_parsed: {} }, MON_1300).status, 'unknown');
    assert.equal(resolveOpeningStatus({ hours_parsed: 'closed' }, MON_1300).status, 'unknown');
    assert.equal(resolveOpeningStatus([1, 2], MON_1300).status, 'unknown');
  });

  test('a day present but empty is closed, not unknown', () => {
    const shutMonday = {
      timezone: 'Europe/Lisbon',
      hours_parsed: { Monday: [], Sunday: [{ open: '12:00', close: '15:00' }] },
    };
    assert.equal(resolveOpeningStatus(shutMonday, MON_1300).status, 'closed');
  });

  test('malformed intervals are skipped without throwing', () => {
    const junk = {
      timezone: 'Europe/Lisbon',
      hours_parsed: { Monday: [{ open: 'lunch', close: '15:00' }, null, { open: '12:00', close: '15:00' }] },
    };
    assert.equal(resolveOpeningStatus(junk, MON_1300).status, 'open');
  });

  test('defaults to Lisbon when ingest recorded no timezone', () => {
    const noTz = { hours_parsed: { Monday: [{ open: '12:00', close: '15:00' }] } };
    assert.equal(resolveOpeningStatus(noTz, MON_1300).status, 'open');
  });
});

describe('openingStatusForRow', () => {
  test('unknown hours add nothing to the payload', () => {
    assert.equal(openingStatusForRow({}, MON_1300), null);
  });

  test('open rows carry only the closing time', () => {
    assert.deepEqual(openingStatusForRow(LUNCH_AND_DINNER, MON_1300), {
      status: 'open',
      closesAt: '15:00',
    });
  });

  test('closed rows carry only the next opening', () => {
    assert.deepEqual(openingStatusForRow(LUNCH_AND_DINNER, MON_1700), {
      status: 'closed',
      opensAt: '19:00',
    });
  });
});

describe('attachOpeningStatusToRows', () => {
  test('adds openingStatus to rows that have usable hours', () => {
    const rows = [{ id: 'r1', metadata: LUNCH_AND_DINNER }];
    const [out] = attachOpeningStatusToRows(rows, MON_1300);
    assert.deepEqual(out.openingStatus, { status: 'open', closesAt: '15:00' });
    assert.equal(out.id, 'r1', 'other fields survive');
  });

  test('leaves rows without usable hours completely untouched', () => {
    // Adding `openingStatus: null` to thousands of rows would be pure payload for nothing.
    const row = { id: 'r1', metadata: {} };
    const [out] = attachOpeningStatusToRows([row], MON_1300);
    assert.equal('openingStatus' in out, false);
    assert.equal(out, row, 'the original object is passed through by reference');
  });

  test('does not mutate the input rows', () => {
    // These rows come straight from an RPC and are slimmed afterwards; mutating them
    // would leak the derived field into whatever else holds a reference.
    const row = { id: 'r1', metadata: LUNCH_AND_DINNER };
    attachOpeningStatusToRows([row], MON_1300);
    assert.equal('openingStatus' in row, false);
  });

  test('tolerates junk rows and non-arrays', () => {
    assert.deepEqual(attachOpeningStatusToRows(null), []);
    assert.deepEqual(attachOpeningStatusToRows(undefined), []);
    const out = attachOpeningStatusToRows([null, 'x', { id: 'r1' }], MON_1300);
    assert.equal(out.length, 3);
    assert.equal(out[0], null);
  });

  test('resolves each row against its own timezone', () => {
    const lisbon = { timezone: 'Europe/Lisbon', hours_parsed: { Monday: [{ open: '12:00', close: '15:00' }] } };
    const tokyo = { timezone: 'Asia/Tokyo', hours_parsed: { Monday: [{ open: '12:00', close: '15:00' }] } };
    const [a, b] = attachOpeningStatusToRows([{ metadata: lisbon }, { metadata: tokyo }], MON_1300);
    assert.equal(a.openingStatus.status, 'open', 'Lisbon 13:00');
    // Same instant is 21:00 in Tokyo — long shut.
    assert.equal(b.openingStatus.status, 'closed');
  });
});
