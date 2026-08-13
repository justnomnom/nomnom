/**
 * Browser helpers for Share → Decide (storage, ?d=, place mapping).
 */
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  LOCK_TOKEN_PREFIX,
  SESSION_CACHE_PREFIX,
  VOTER_KEY_STORAGE,
  canLockDecideSession,
  decideErrorMessage,
  getOrCreateVoterKey,
  lockedWinnerRestaurantId,
  mapListItemsToDecidePlaces,
  persistCachedSession,
  persistLockToken,
  readCachedSession,
  readLockToken,
  resolveDecideSessionId,
} from '../list-decide-client.js';

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
    location: { search, href: `https://app.example/lists/x${search}` },
  };
  globalThis.crypto = { randomUUID: () => '11111111-1111-4111-8111-111111111111' };
  return storage;
}

afterEach(() => {
  delete globalThis.window;
  delete globalThis.crypto;
});

describe('getOrCreateVoterKey', () => {
  it('returns the SSR placeholder without window', () => {
    assert.equal(getOrCreateVoterKey(), 'ssr-placeholder-key');
  });

  it('reuses a stored key of at least 8 chars', () => {
    const storage = installWindow();
    storage.setItem(VOTER_KEY_STORAGE, 'stored-key');
    assert.equal(getOrCreateVoterKey(), 'stored-key');
  });

  it('regenerates keys shorter than 8 chars', () => {
    const storage = installWindow();
    storage.setItem(VOTER_KEY_STORAGE, 'short');
    assert.equal(getOrCreateVoterKey(), '11111111-1111-4111-8111-111111111111');
    assert.equal(storage.getItem(VOTER_KEY_STORAGE), '11111111-1111-4111-8111-111111111111');
  });

  it('falls back to an ephemeral key when storage throws', () => {
    installWindow({ throwOnStorage: true });
    assert.match(getOrCreateVoterKey(), /^vk-ephemeral-\d+$/);
  });

  it('accepts a stored key of exactly 8 chars', () => {
    const storage = installWindow();
    storage.setItem(VOTER_KEY_STORAGE, '12345678');
    assert.equal(getOrCreateVoterKey(), '12345678');
  });

  it('uses a timestamp fallback when crypto.randomUUID is missing', () => {
    const storage = installWindow();
    globalThis.crypto = {};
    const key = getOrCreateVoterKey();
    assert.match(key, /^vk-\d+-/);
    assert.equal(storage.getItem(VOTER_KEY_STORAGE), key);
  });
});

describe('lock token + session cache', () => {
  it('no-ops persist/read without window', () => {
    persistLockToken('sid', 'tok');
    persistCachedSession({ session_id: 'sid', status: 'open' });
    assert.equal(readLockToken('sid'), null);
    assert.equal(readCachedSession('sid'), null);
  });

  it('round-trips lock token and cached session', () => {
    const storage = installWindow();
    persistLockToken('sid-1', 'tok-1');
    persistCachedSession({ session_id: 'sid-1', status: 'open', tallies: {} });
    assert.equal(readLockToken('sid-1'), 'tok-1');
    assert.deepEqual(readCachedSession('sid-1'), {
      session_id: 'sid-1',
      status: 'open',
      tallies: {},
    });
    assert.equal(storage.getItem(`${LOCK_TOKEN_PREFIX}sid-1`), 'tok-1');
    assert.ok(storage.getItem(`${SESSION_CACHE_PREFIX}sid-1`));
  });

  it('ignores empty tokens, missing session_id, and invalid JSON', () => {
    const storage = installWindow();
    persistLockToken('', 'tok');
    persistLockToken('sid', '');
    persistCachedSession({ status: 'open' });
    persistCachedSession(null);
    storage.setItem(`${SESSION_CACHE_PREFIX}bad`, '{');
    storage.setItem(`${SESSION_CACHE_PREFIX}arr`, '[1]');
    storage.setItem(`${SESSION_CACHE_PREFIX}num`, '12');
    assert.equal(readLockToken('sid'), null);
    assert.equal(readCachedSession('bad'), null);
    assert.equal(readCachedSession('arr'), null);
    assert.equal(readCachedSession('num'), null);
    assert.equal(readCachedSession(''), null);
  });

  it('swallows sessionStorage throws on persist and read', () => {
    installWindow({ throwOnStorage: true });
    persistLockToken('sid', 'tok');
    persistCachedSession({ session_id: 'sid', status: 'open' });
    assert.equal(readLockToken('sid'), null);
    assert.equal(readCachedSession('sid'), null);
  });

  it('skips persist when JSON.stringify throws (circular session)', () => {
    const storage = installWindow();
    const session = { session_id: 'sid', status: 'open' };
    session.self = session;
    persistCachedSession(session);
    assert.equal(storage.getItem(`${SESSION_CACHE_PREFIX}sid`), null);
  });
});

describe('resolveDecideSessionId', () => {
  it('prefers the prop over the query string', () => {
    installWindow({ search: '?d=from-url' });
    assert.equal(resolveDecideSessionId('from-prop'), 'from-prop');
  });

  it('reads ?d= when the prop is empty', () => {
    installWindow({ search: '?d=from-url&spot=1' });
    assert.equal(resolveDecideSessionId(null), 'from-url');
    assert.equal(resolveDecideSessionId(''), 'from-url');
  });

  it('returns null without a prop or window', () => {
    assert.equal(resolveDecideSessionId(null), null);
  });

  it('returns empty ?d= as an empty string rather than null', () => {
    installWindow({ search: '?d=' });
    assert.equal(resolveDecideSessionId(null), '');
  });

  it('returns null when location.search is unreadable', () => {
    installWindow();
    globalThis.window.location = {
      get search() {
        throw new Error('blocked');
      },
    };
    assert.equal(resolveDecideSessionId(null), null);
  });

  it('stringifies a numeric prop', () => {
    installWindow({ search: '?d=from-url' });
    assert.equal(resolveDecideSessionId(12), '12');
  });
});

describe('decideErrorMessage', () => {
  const catalog = {
    'pages.lists.decide_error_session_locked': 'Voting is closed on this round.',
    'pages.lists.decide_error_generic': 'Something went wrong. Try again.',
  };
  const t = (key) => catalog[key] ?? key;

  it('returns null for empty codes and known translations for mapped codes', () => {
    assert.equal(decideErrorMessage(null, t), null);
    assert.equal(decideErrorMessage('session_locked', t), 'Voting is closed on this round.');
  });

  it('falls back to generic copy for unknown codes', () => {
    assert.equal(decideErrorMessage('not_a_real_code', t), 'Something went wrong. Try again.');
    assert.equal(decideErrorMessage('unknown', t), 'Something went wrong. Try again.');
    assert.equal(decideErrorMessage('invalid_list', t), 'Something went wrong. Try again.');
    assert.equal(decideErrorMessage('', t), null);
  });
});

describe('mapListItemsToDecidePlaces', () => {
  it('skips rows without an id and accepts restaurants or restaurant', () => {
    const rows = mapListItemsToDecidePlaces(
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
    const [row] = mapListItemsToDecidePlaces(
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

  it('returns [] for non-arrays', () => {
    assert.deepEqual(mapListItemsToDecidePlaces(null, 'x'), []);
    assert.deepEqual(mapListItemsToDecidePlaces(undefined, 'x'), []);
    assert.deepEqual(mapListItemsToDecidePlaces({}, 'x'), []);
  });

  it('uses restaurant_id when nested restaurant has no id, and skips empty image lists', () => {
    const [row] = mapListItemsToDecidePlaces(
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
    const [row] = mapListItemsToDecidePlaces(
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

describe('canLockDecideSession + lockedWinnerRestaurantId', () => {
  it('allows owner or lock-token holder on an open session', () => {
    assert.equal(canLockDecideSession({ sessionId: 's', locked: false, isOwner: true }), true);
    assert.equal(
      canLockDecideSession({ sessionId: 's', locked: false, isOwner: false, lockToken: 'tok' }),
      true
    );
    assert.equal(canLockDecideSession({ sessionId: 's', locked: false, isOwner: false }), false);
    assert.equal(canLockDecideSession({ sessionId: 's', locked: true, isOwner: true }), false);
    assert.equal(canLockDecideSession({}), false);
  });

  it('only returns a winner id after lock', () => {
    assert.equal(lockedWinnerRestaurantId({ status: 'open', winner_restaurant_id: 'r1' }), null);
    assert.equal(lockedWinnerRestaurantId({ status: 'locked' }), null);
    assert.equal(lockedWinnerRestaurantId(null), null);
    assert.equal(
      lockedWinnerRestaurantId({ status: 'locked', winner_restaurant_id: 'r1' }),
      'r1'
    );
    assert.equal(
      lockedWinnerRestaurantId({ status: 'locked', winner_restaurant_id: 99 }),
      '99'
    );
  });

  it('treats an empty lock token as missing', () => {
    assert.equal(
      canLockDecideSession({ sessionId: 's', locked: false, isOwner: false, lockToken: '' }),
      false
    );
  });
});
