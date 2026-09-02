/**
 * POST /api/restaurants/ingest auth, payload gates, and a successful municipality insert.
 */
import assert from 'node:assert/strict';
import { beforeEach, describe, mock, test } from 'node:test';

process.env.RESTAURANT_INGEST_SECRET = process.env.RESTAURANT_INGEST_SECRET || 'ingest-secret';

/** @type {boolean} */
let rateOk = true;
/** @type {object | Error} */
let mapped = { closedStatus: null, row: { external_place_id: 'ChIJx' } };

mock.module('src/libs/email/rate-limit.js', {
  exports: {
    rateLimitTake: async () => rateOk,
  },
});

mock.module('src/libs/crypto/timing-safe-secret.js', {
  exports: {
    isValidSecret: (token, secret) => Boolean(token) && token === secret,
  },
});

mock.module('src/libs/sentry/sentry-service.js', {
  exports: {
    setConversationId() {},
  },
});

const REST_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const MUNI_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

function thenable(result) {
  const api = {
    select() {
      return api;
    },
    eq() {
      return api;
    },
    in() {
      return api;
    },
    insert() {
      return api;
    },
    update() {
      return api;
    },
    delete() {
      return api;
    },
    upsert() {
      return api;
    },
    order() {
      return api;
    },
    maybeSingle: async () => result,
    single: async () => result,
    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return api;
}

const admin = {
  rpc: async (name) => {
    if (name === 'municipality_for_point') {
      return { data: [{ id: MUNI_ID }], error: null };
    }
    return { data: null, error: null };
  },
  from(table) {
    if (table === 'restaurants') {
      const api = {
        select() {
          return api;
        },
        eq() {
          return api;
        },
        update() {
          return api;
        },
        insert() {
          return api;
        },
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: { id: REST_ID }, error: null }),
        then(resolve, reject) {
          return Promise.resolve({ data: { id: REST_ID }, error: null }).then(resolve, reject);
        },
      };
      return api;
    }
    return thenable({ data: [], error: null });
  },
};

mock.module('src/libs/supabase/supabase-admin.js', {
  exports: {
    supabaseAdminClient: admin,
  },
});

mock.module('src/libs/restaurant-ingest/review-consensus-ai.js', {
  exports: {
    extractReviewConsensus: async () => null,
  },
});

mock.module('src/libs/restaurant-ingest/map-google-place-payload.js', {
  exports: {
    PRICE_TAG_SLUGS: [],
    mapGooglePlacePayload: () => {
      if (mapped instanceof Error) throw mapped;
      return mapped;
    },
  },
});

mock.module('src/libs/restaurant-ingest/sync-signature-dish-tags.js', {
  exports: {
    syncSignatureDishTags: async () => {},
  },
});

mock.module('src/libs/restaurant-ingest/persist-restaurant-images.js', {
  exports: {
    hashSourcePhotoUrls: () => '',
    persistRestaurantImageUrls: async () => new Map(),
  },
});

mock.module('src/libs/restaurant-ingest/about-tags-ai.js', {
  exports: {
    fetchAllTags: async () => [],
    insertNewTags: async () => [],
    resolveTagIds: () => [],
    buildSlugToIdMap: () => new Map(),
    fetchTagsBySlugs: async () => [],
    mapAboutToTagsWithAi: async () => ({ skipped: true, new_tags: [], existing_slugs: [] }),
  },
});

const { POST } = await import('../../app/(frontend)/api/restaurants/ingest/route.js');

/**
 * @param {object | null} body
 * @param {Record<string, string>} [headerOverrides]
 */
function req(body, headerOverrides = {}) {
  const headers = new Headers({
    authorization: `Bearer ${process.env.RESTAURANT_INGEST_SECRET}`,
    'content-type': 'application/json',
    ...headerOverrides,
  });
  return {
    headers,
    json: async () => {
      if (body === null) throw new SyntaxError('bad json');
      return body;
    },
  };
}

describe('POST /api/restaurants/ingest', { concurrency: false }, () => {
  beforeEach(() => {
    rateOk = true;
    mapped = { closedStatus: null, row: { external_place_id: 'ChIJx' } };
  });

  test('wrong bearer → 401', async () => {
    const res = await POST(req({ placeId: 'x' }, { authorization: 'Bearer nope' }));
    assert.equal(res.status, 401);
  });

  test('unauthenticated rate limit → 429', async () => {
    rateOk = false;
    const res = await POST(req({ placeId: 'x' }, { authorization: '' }));
    assert.equal(res.status, 429);
  });

  test('invalid JSON → 400', async () => {
    const res = await POST(req(null));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'Invalid JSON');
  });

  test('mapper missing_place_id → 400', async () => {
    mapped = new Error('missing_place_id');
    const res = await POST(req({}));
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error, 'missing_place_id');
  });

  test('permanently closed place → 422', async () => {
    mapped = { closedStatus: 'permanently_closed', row: { external_place_id: 'ChIJx' } };
    const res = await POST(req({ placeId: 'x' }));
    assert.equal(res.status, 422);
    assert.equal((await res.json()).error, 'permanently_closed');
  });

  test('authorized place with a municipality inserts a restaurant row', async () => {
    mapped = {
      closedStatus: null,
      row: {
        external_place_id: 'ChIJx',
        name: 'Time Out Market',
        address: 'Cais do Sodré',
        latitude: 38.7071,
        longitude: -9.1458,
        rating: 4.4,
        price_level: 2,
        phone: null,
        website: null,
        maps_link: null,
        menu_url: null,
        menu_source: null,
      },
      imageUrls: [],
      metadataBase: {},
      flattenedAbout: '',
      priceTagSlug: null,
    };
    const res = await POST(req({ placeId: 'ChIJx' }));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), {
      id: REST_ID,
      created: true,
      updated: false,
      municipality_id: MUNI_ID,
      ingest_tag_slugs: [],
    });
  });
});
