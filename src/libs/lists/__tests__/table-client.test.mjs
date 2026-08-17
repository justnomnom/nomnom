/**
 * Browser helpers for Table (storage, error copy, place mapping, picker rows).
 */
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  readMyVotes,
  canLockTable,
  readLockToken,
  persistMyVote,
  MY_VOTES_PREFIX,
  readCachedTable,
  summarizeGuests,
  tablePickerRows,
  persistLockToken,
  toggleSelectedIds,
  tableErrorMessage,
  LOCK_TOKEN_PREFIX,
  persistCachedTable,
  GUEST_KEY_STORAGE,
  TABLE_CACHE_PREFIX,
  tableAddSearchState,
  getOrCreateGuestKey,
  mapListItemsToPlaces,
  filterTablePickerRows,
  tableSelectedPickerRows,
  lockedWinnerRestaurantId,
} from '../table-client.js';

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  setItem(key, value) {
    this.map.set(String(key), String(value));
  }

  removeItem(key) {
    this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }
}

function installWindow({ search = '', throwOnStorage = false } = {}) {
  const storage = new MemoryStorage();
  const throwing = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('blocked');
    },
  };
  globalThis.window = {
    localStorage: throwOnStorage ? throwing : storage,
    sessionStorage: throwOnStorage ? throwing : storage,
    location: { search, href: `https://app.example/table/x${search}` },
  };
  globalThis.crypto = { randomUUID: () => '11111111-1111-4111-8111-111111111111' };
  return storage;
}

afterEach(() => {
  delete globalThis.window;
  delete globalThis.crypto;
});

describe('getOrCreateGuestKey', () => {
  it('returns the SSR placeholder without window', () => {
    assert.equal(getOrCreateGuestKey(), 'ssr-placeholder-key');
  });

  it('reuses a stored key of at least 8 chars', () => {
    const storage = installWindow();
    storage.setItem(GUEST_KEY_STORAGE, 'stored-key');
    assert.equal(getOrCreateGuestKey(), 'stored-key');
  });

  it('regenerates keys shorter than 8 chars', () => {
    const storage = installWindow();
    storage.setItem(GUEST_KEY_STORAGE, 'short');
    assert.equal(getOrCreateGuestKey(), '11111111-1111-4111-8111-111111111111');
    assert.equal(storage.getItem(GUEST_KEY_STORAGE), '11111111-1111-4111-8111-111111111111');
  });

  it('falls back to an ephemeral key when storage throws', () => {
    installWindow({ throwOnStorage: true });
    assert.match(getOrCreateGuestKey(), /^gk-ephemeral-\d+$/);
  });

  it('accepts a stored key of exactly 8 chars', () => {
    const storage = installWindow();
    storage.setItem(GUEST_KEY_STORAGE, '12345678');
    assert.equal(getOrCreateGuestKey(), '12345678');
  });

  it('uses a timestamp fallback when crypto.randomUUID is missing', () => {
    const storage = installWindow();
    globalThis.crypto = {};
    const key = getOrCreateGuestKey();
    assert.match(key, /^gk-\d+-/);
    assert.equal(storage.getItem(GUEST_KEY_STORAGE), key);
  });
});

describe('lock token + table cache', () => {
  it('no-ops persist/read without window', () => {
    persistLockToken('tid', 'tok');
    persistCachedTable({ session_id: 'tid', status: 'open' });
    assert.equal(readLockToken('tid'), null);
    assert.equal(readCachedTable('tid'), null);
  });

  it('round-trips lock token and cached payload', () => {
    const storage = installWindow();
    persistLockToken('tid-1', 'tok-1');
    persistCachedTable({ session_id: 'tid-1', status: 'open', tallies: {} });
    assert.equal(readLockToken('tid-1'), 'tok-1');
    assert.deepEqual(readCachedTable('tid-1'), {
      session_id: 'tid-1',
      status: 'open',
      tallies: {},
    });
    assert.equal(storage.getItem(`${LOCK_TOKEN_PREFIX}tid-1`), 'tok-1');
    assert.ok(storage.getItem(`${TABLE_CACHE_PREFIX}tid-1`));
  });

  it('ignores empty tokens, missing session_id, and invalid JSON', () => {
    const storage = installWindow();
    persistLockToken('', 'tok');
    persistLockToken('tid', '');
    persistCachedTable({ status: 'open' });
    persistCachedTable(null);
    storage.setItem(`${TABLE_CACHE_PREFIX}bad`, '{');
    storage.setItem(`${TABLE_CACHE_PREFIX}arr`, '[1]');
    storage.setItem(`${TABLE_CACHE_PREFIX}num`, '12');
    assert.equal(readLockToken('tid'), null);
    assert.equal(readCachedTable('bad'), null);
    assert.equal(readCachedTable('arr'), null);
    assert.equal(readCachedTable('num'), null);
    assert.equal(readCachedTable(''), null);
  });

  it('swallows sessionStorage throws on persist and read', () => {
    installWindow({ throwOnStorage: true });
    persistLockToken('tid', 'tok');
    persistCachedTable({ session_id: 'tid', status: 'open' });
    assert.equal(readLockToken('tid'), null);
    assert.equal(readCachedTable('tid'), null);
  });

  it('skips persist when JSON.stringify throws (circular payload)', () => {
    const storage = installWindow();
    const session = { session_id: 'tid', status: 'open' };
    session.self = session;
    persistCachedTable(session);
    assert.equal(storage.getItem(`${TABLE_CACHE_PREFIX}tid`), null);
  });
});

describe('tableErrorMessage', () => {
  const catalog = {
    'pages.table.error_table_locked': 'This table is settled — voting is closed.',
    'pages.table.error_generic': 'Something went wrong. Try again.',
  };
  const t = (key) => catalog[key] ?? key;

  it('returns null for empty codes and known translations for mapped codes', () => {
    assert.equal(tableErrorMessage(null, t), null);
    assert.equal(
      tableErrorMessage('table_locked', t),
      'This table is settled — voting is closed.'
    );
  });

  it('falls back to generic copy for unknown codes', () => {
    assert.equal(tableErrorMessage('not_a_real_code', t), 'Something went wrong. Try again.');
    assert.equal(tableErrorMessage('', t), null);
  });
});

describe('mapListItemsToPlaces', () => {
  it('skips rows without an id and accepts restaurants or restaurant', () => {
    const rows = mapListItemsToPlaces(
      [
        { restaurants: { id: 'r1', name: 'A', maps_link: 'https://maps', restaurant_images: [] } },
        { restaurant: { id: 'r2', name: 'B' } },
        { restaurant_id: 'r3' },
        { restaurants: { name: 'no-id' } },
        null,
      ],
      'Restaurant'
    );
    assert.deepEqual(
      rows.map((r) => r.restaurantId),
      ['r1', 'r2', 'r3']
    );
    assert.equal(rows[0].mapsLink, 'https://maps');
    assert.equal(rows[2].name, 'Restaurant');
  });

  it('picks the lowest sort_order image with a url', () => {
    const [row] = mapListItemsToPlaces(
      [
        {
          restaurants: {
            id: 'r1',
            name: 'A',
            restaurant_images: [
              { url: 'late.jpg', sort_order: 2 },
              { url: null, sort_order: 0 },
              { url: 'first.jpg', sort_order: 1 },
            ],
          },
        },
      ],
      'Restaurant'
    );
    assert.equal(row.photo, 'first.jpg');
  });

  it('unwraps restaurants when PostgREST returns an array embed', () => {
    const [row] = mapListItemsToPlaces(
      [
        {
          restaurants: [
            { id: 'r-arr', name: 'Array Join', maps_link: null, restaurant_images: [] },
          ],
        },
      ],
      'Restaurant'
    );
    assert.equal(row.restaurantId, 'r-arr');
    assert.equal(row.name, 'Array Join');
  });

  it('returns [] for non-arrays', () => {
    assert.deepEqual(mapListItemsToPlaces(null, 'x'), []);
    assert.deepEqual(mapListItemsToPlaces(undefined, 'x'), []);
    assert.deepEqual(mapListItemsToPlaces({}, 'x'), []);
  });

  it('uses restaurant_id when nested restaurant has no id, and skips empty image lists', () => {
    const [row] = mapListItemsToPlaces(
      [
        {
          restaurant_id: 'r9',
          restaurants: { name: 'Named', restaurant_images: null },
        },
      ],
      'Restaurant'
    );
    assert.equal(row.restaurantId, 'r9');
    assert.equal(row.name, 'Named');
    assert.equal(row.photo, null);
    assert.equal(row.mapsLink, null);
  });

  it('treats missing sort_order as 0 when picking a photo', () => {
    const [row] = mapListItemsToPlaces(
      [
        {
          restaurants: {
            id: 'r1',
            name: 'A',
            restaurant_images: [{ url: 'no-order.jpg' }, { url: 'later.jpg', sort_order: 5 }],
          },
        },
      ],
      'Restaurant'
    );
    assert.equal(row.photo, 'no-order.jpg');
  });
});

describe('tablePickerRows + filterTablePickerRows', () => {
  it('puts extras first and dedupes by restaurantId', () => {
    const rows = tablePickerRows(
      [
        { restaurantId: 'a', name: 'List A' },
        { restaurantId: 'b', name: 'List B' },
      ],
      [
        { restaurantId: 'x', name: 'Search X' },
        { restaurantId: 'a', name: 'Dup A' },
        { restaurantId: '', name: 'skip' },
      ]
    );
    assert.deepEqual(
      rows.map((r) => r.restaurantId),
      ['x', 'a', 'b']
    );
    assert.equal(rows[1].name, 'Dup A');
  });

  it('filters by name only when the query is at least 2 chars', () => {
    const places = [
      { restaurantId: 'a', name: 'Cervejaria Ramiro' },
      { restaurantId: 'b', name: 'Taberna da Rua das Flores' },
    ];
    assert.equal(filterTablePickerRows(places, 'r').length, 2);
    assert.deepEqual(
      filterTablePickerRows(places, 'ram').map((r) => r.restaurantId),
      ['a']
    );
    assert.deepEqual(filterTablePickerRows(null, 'ra'), []);
    assert.deepEqual(tablePickerRows(null, undefined), []);
  });

  it('keeps selected list picks even when search would hide them', () => {
    const places = [
      { restaurantId: 'a', name: 'Cervejaria Ramiro' },
      { restaurantId: 'b', name: 'Taberna da Rua das Flores' },
    ];
    const extras = [{ restaurantId: 'x', name: 'Caffe Florian' }];
    const selected = new Set(['b', 'x']);
    const visible = filterTablePickerRows(places, 'ram');
    assert.deepEqual(
      visible.map((r) => r.restaurantId),
      ['a']
    );
    assert.deepEqual(
      tableSelectedPickerRows(places, extras, selected).map((r) => r.restaurantId),
      ['x', 'b']
    );
    assert.deepEqual(tableSelectedPickerRows(places, extras, null), []);
  });
});

describe('toggleSelectedIds', () => {
  it('adds, removes, ignores empty ids, and has no default max', () => {
    const first = toggleSelectedIds(new Set(), 'a');
    assert.deepEqual([...first], ['a']);
    const removed = toggleSelectedIds(first, 'a');
    assert.deepEqual([...removed], []);
    const empty = new Set(['a']);
    assert.equal(toggleSelectedIds(empty, ''), empty);
    const full = new Set(['1', '2', '3', '4', '5']);
    const sixth = toggleSelectedIds(full, '6');
    assert.deepEqual([...sixth].sort(), ['1', '2', '3', '4', '5', '6']);
    assert.equal(toggleSelectedIds(full, '6', 5), full);
    const fromNull = toggleSelectedIds(null, 'z');
    assert.deepEqual([...fromNull], ['z']);
  });
});

describe('tableAddSearchState', () => {
  it('is idle below 2 chars, pending while in flight, and does not call empty during pending', () => {
    assert.equal(tableAddSearchState({ query: 'r' }), 'idle');
    assert.equal(tableAddSearchState({ query: 'ra', pending: true, hits: [] }), 'pending');
  });

  it('distinguishes no match from already-at-the-table', () => {
    const existingIds = new Set(['a']);
    assert.equal(
      tableAddSearchState({ query: 'ram', hits: [{ id: 'a' }], existingIds, pending: false }),
      'already_at_table'
    );
    assert.equal(
      tableAddSearchState({ query: 'ram', hits: [], existingIds, pending: false }),
      'empty'
    );
    assert.equal(
      tableAddSearchState({ query: 'ram', hits: [{ id: 'b' }], existingIds, pending: false }),
      'results'
    );
  });
});

describe('canLockTable + lockedWinnerRestaurantId', () => {
  it('allows owner or lock-token holder on an open table', () => {
    assert.equal(canLockTable({ tableId: 't', locked: false, isOwner: true }), true);
    assert.equal(
      canLockTable({ tableId: 't', locked: false, isOwner: false, lockToken: 'tok' }),
      true
    );
    assert.equal(canLockTable({ tableId: 't', locked: false, isOwner: false }), false);
    assert.equal(canLockTable({ tableId: 't', locked: true, isOwner: true }), false);
    assert.equal(canLockTable({}), false);
  });

  it('only returns a winner id after lock', () => {
    assert.equal(lockedWinnerRestaurantId({ status: 'open', winner_restaurant_id: 'r1' }), null);
    assert.equal(lockedWinnerRestaurantId({ status: 'locked' }), null);
    assert.equal(lockedWinnerRestaurantId(null), null);
    assert.equal(lockedWinnerRestaurantId({ status: 'locked', winner_restaurant_id: 'r1' }), 'r1');
    assert.equal(lockedWinnerRestaurantId({ status: 'locked', winner_restaurant_id: 99 }), '99');
  });

  it('treats an empty lock token as missing', () => {
    assert.equal(
      canLockTable({ tableId: 't', locked: false, isOwner: false, lockToken: '' }),
      false
    );
  });
});

describe('summarizeGuests', () => {
  it('counts every seat but only names the ones that have one', () => {
    const summary = summarizeGuests([
      { display_name: 'Ana' },
      { display_name: '  ' },
      { display_name: null },
      { display_name: ' Bea ' },
    ]);
    assert.deepEqual(summary, { count: 4, names: ['Ana', 'Bea'], anonymous: 2 });
  });

  it('is empty for non-arrays', () => {
    assert.deepEqual(summarizeGuests(null), { count: 0, names: [], anonymous: 0 });
    assert.deepEqual(summarizeGuests(undefined), { count: 0, names: [], anonymous: 0 });
    assert.deepEqual(summarizeGuests({}), { count: 0, names: [], anonymous: 0 });
  });

  it('ignores non-string display names', () => {
    assert.deepEqual(summarizeGuests([{ display_name: 42 }, {}]), {
      count: 2,
      names: [],
      anonymous: 2,
    });
  });
});

describe('readMyVotes / persistMyVote', () => {
  it('returns an empty map without window', () => {
    assert.deepEqual(readMyVotes('table-1'), {});
  });

  it('returns an empty map when the table id is missing', () => {
    installWindow();
    assert.deepEqual(readMyVotes(null), {});
  });

  it('round-trips a vote so a reload can restore it', () => {
    const storage = installWindow();
    persistMyVote('table-1', 'rest-a', 1);
    assert.equal(storage.getItem(`${MY_VOTES_PREFIX}table-1`), '{"rest-a":1}');
    assert.deepEqual(readMyVotes('table-1'), { 'rest-a': 1 });
  });

  it('merges additional restaurants instead of clobbering earlier votes', () => {
    installWindow();
    persistMyVote('table-1', 'rest-a', 1);
    const next = persistMyVote('table-1', 'rest-b', -1);
    assert.deepEqual(next, { 'rest-a': 1, 'rest-b': -1 });
    assert.deepEqual(readMyVotes('table-1'), { 'rest-a': 1, 'rest-b': -1 });
  });

  it('overwrites when you change your mind on the same restaurant', () => {
    installWindow();
    persistMyVote('table-1', 'rest-a', 1);
    persistMyVote('table-1', 'rest-a', -1);
    assert.deepEqual(readMyVotes('table-1'), { 'rest-a': -1 });
  });

  it('scopes votes per table so another table does not inherit them', () => {
    installWindow();
    persistMyVote('table-1', 'rest-a', 1);
    assert.deepEqual(readMyVotes('table-2'), {});
  });

  it('survives blocked storage without throwing', () => {
    installWindow({ throwOnStorage: true });
    assert.deepEqual(readMyVotes('table-1'), {});
    assert.deepEqual(persistMyVote('table-1', 'rest-a', 1), { 'rest-a': 1 });
  });

  it('ignores a non-object payload left in storage', () => {
    const storage = installWindow();
    storage.setItem(`${MY_VOTES_PREFIX}table-1`, '["not","an","object"]');
    assert.deepEqual(readMyVotes('table-1'), {});
  });
});
