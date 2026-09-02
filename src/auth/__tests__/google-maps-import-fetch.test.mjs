/**
 * previewGoogleMapsImport: follow-redirect + getlist parse path (no live Google).
 */
import assert from 'node:assert/strict';
import { after, beforeEach, describe, mock, test } from 'node:test';

const USER_ID = '11111111-1111-4111-8111-111111111111';

/** @type {{ id: string } | null} */
let authUser = { id: USER_ID };
/** @type {{ data: object[] | null }} */
let nearbyRows = { data: [] };
/** @type {{ data: object[] | null }} */
let nameRows = { data: [] };

const originalFetch = globalThis.fetch;

/**
 * @param {{ data: unknown }} result
 */
function query(result) {
  const api = {
    select() {
      return api;
    },
    gte() {
      return api;
    },
    lte() {
      return api;
    },
    ilike() {
      return api;
    },
    limit() {
      return api;
    },
    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return api;
}

mock.module('src/libs/supabase/supabase-server-client.js', {
  exports: {
    getSupabaseAuthUser: async () => ({ data: { user: authUser }, error: null }),
    createSupabaseServerClient: async () => ({
      from() {
        return query(nearbyRows.data?.length ? nearbyRows : nameRows);
      },
    }),
  },
});

mock.module('src/libs/email/resend-server-send.js', {
  exports: {
    sendResendEmail: async () => {},
  },
});

const { previewGoogleMapsImport } = await import('../actions/google-maps-import-actions.js');

const PLACE = [
  null,
  [null, null, '', null, 'Rua Augusta, Lisboa', [null, null, 38.71, -9.14]],
  'Time Out Market',
];
const GETLIST_BODY = `)]}'\n${JSON.stringify([[null, null, null, null, 'Lisbon lunch', PLACE]])}`;

describe('previewGoogleMapsImport fetch path', { concurrency: false }, () => {
  beforeEach(() => {
    authUser = { id: USER_ID };
    nearbyRows = { data: [] };
    nameRows = { data: [] };
  });

  after(() => {
    globalThis.fetch = originalFetch;
  });

  test('redirect URL without a list id → no_places_found', async () => {
    globalThis.fetch = async () => ({ ok: true, url: 'https://www.google.com/maps', text: async () => '' });
    const out = await previewGoogleMapsImport('https://maps.app.goo.gl/abc');
    assert.equal(out.error, 'no_places_found');
    assert.deepEqual(out.places, []);
  });

  test('getlist HTTP failure → fetch_failed', async () => {
    globalThis.fetch = async (url) => {
      if (String(url).includes('getlist')) {
        return { ok: false, url: String(url), text: async () => '' };
      }
      return {
        ok: true,
        url: 'https://www.google.com/maps/placelists/list/AbCdEfGhIjKlMnOpQrStUvWx',
        text: async () => '',
      };
    };
    const out = await previewGoogleMapsImport('https://maps.app.goo.gl/abc');
    assert.equal(out.error, 'fetch_failed');
  });

  test('parses getlist JSON and marks unmatched places not_found', async () => {
    globalThis.fetch = async (url) => {
      if (String(url).includes('getlist')) {
        return { ok: true, url: String(url), text: async () => GETLIST_BODY };
      }
      return {
        ok: true,
        url: 'https://www.google.com/maps/placelists/list/AbCdEfGhIjKlMnOpQrStUvWx',
        text: async () => '',
      };
    };
    const out = await previewGoogleMapsImport('https://maps.app.goo.gl/abc');
    assert.equal(out.error, null);
    assert.equal(out.listTitle, 'Lisbon lunch');
    assert.equal(out.places.length, 1);
    assert.equal(out.places[0].name, 'Time Out Market');
    assert.equal(out.places[0].status, 'not_found');
    assert.equal(out.places[0].restaurantId, null);
  });

  test('coordinate match attaches restaurantId', async () => {
    nearbyRows = {
      data: [
        {
          id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          name: 'Time Out Market',
          address: 'Rua Augusta, Lisboa',
          latitude: 38.71,
          longitude: -9.14,
        },
      ],
    };
    globalThis.fetch = async (url) => {
      if (String(url).includes('getlist')) {
        return { ok: true, url: String(url), text: async () => GETLIST_BODY };
      }
      return {
        ok: true,
        url: 'https://www.google.com/maps/placelists/list/AbCdEfGhIjKlMnOpQrStUvWx',
        text: async () => '',
      };
    };
    const out = await previewGoogleMapsImport('https://www.google.com/maps/d/u/0/viewer?mid=x');
    assert.equal(out.error, null);
    assert.equal(out.places[0].status, 'matched');
    assert.equal(out.places[0].restaurantId, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  });
});
