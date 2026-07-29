import { test } from 'node:test';
import assert from 'node:assert/strict';

import { hashSourcePhotoUrls, persistRestaurantImageUrls } from '../persist-restaurant-images.js';

const silentLogger = { error: () => {} };

/** Minimal Supabase storage stub: records uploads, serves deterministic public URLs. */
function makeAdminStub() {
  const uploads = [];
  return {
    uploads,
    storage: {
      from() {
        return {
          async list() {
            return { data: [], error: null };
          },
          async remove() {
            return { data: [], error: null };
          },
          async upload(path, bytes, opts) {
            uploads.push({ path, size: bytes.length, contentType: opts?.contentType });
            return { error: null };
          },
          getPublicUrl(path) {
            return {
              data: {
                publicUrl: `https://proj.supabase.co/storage/v1/object/public/restaurant_images/${path}`,
              },
            };
          },
        };
      },
    },
  };
}

function okImageResponse() {
  return {
    ok: true,
    status: 200,
    headers: { get: (k) => (k.toLowerCase() === 'content-type' ? 'image/jpeg' : null) },
    async arrayBuffer() {
      return new Uint8Array([1, 2, 3, 4]).buffer;
    },
  };
}

test('re-hosts live URLs to permanent Storage URLs', async () => {
  const admin = makeAdminStub();
  const originalFetch = global.fetch;
  global.fetch = async () => okImageResponse();
  try {
    const map = await persistRestaurantImageUrls(
      admin,
      'ChIJabc123',
      ['https://lh3.googleusercontent.com/gps-cs-s/AAA=w1600-h1200-k-no'],
      { logger: silentLogger }
    );
    const out = map.get('https://lh3.googleusercontent.com/gps-cs-s/AAA=w1600-h1200-k-no');
    assert.match(out, /\/storage\/v1\/object\/public\/restaurant_images\/ChIJabc123\/0\.jpg$/);
    assert.equal(admin.uploads.length, 1);
    assert.equal(admin.uploads[0].contentType, 'image/jpeg');
  } finally {
    global.fetch = originalFetch;
  }
});

test('falls back to the original URL when the download fails (never loses a photo)', async () => {
  const admin = makeAdminStub();
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 403,
    headers: { get: () => null },
    async arrayBuffer() {
      return new ArrayBuffer(0);
    },
  });
  try {
    const src = 'https://lh3.googleusercontent.com/gps-cs-s/DEAD=w1600-h1200-k-no';
    const map = await persistRestaurantImageUrls(admin, 'ChIJabc123', [src], {
      logger: silentLogger,
    });
    assert.equal(map.get(src), src);
    assert.equal(admin.uploads.length, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test('non-image content-type is rejected and falls back to original', async () => {
  const admin = makeAdminStub();
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    headers: { get: (k) => (k.toLowerCase() === 'content-type' ? 'text/html' : null) },
    async arrayBuffer() {
      return new Uint8Array([1, 2, 3]).buffer;
    },
  });
  try {
    const src = 'https://example.com/not-an-image';
    const map = await persistRestaurantImageUrls(admin, 'place', [src], { logger: silentLogger });
    assert.equal(map.get(src), src);
    assert.equal(admin.uploads.length, 0);
  } finally {
    global.fetch = originalFetch;
  }
});

test('dedupes repeated source URLs into a single download', async () => {
  const admin = makeAdminStub();
  const originalFetch = global.fetch;
  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return okImageResponse();
  };
  try {
    const src = 'https://lh3.googleusercontent.com/gps-cs-s/SAME=w1600-h1200-k-no';
    const map = await persistRestaurantImageUrls(admin, 'place', [src, src, src], {
      logger: silentLogger,
    });
    assert.equal(calls, 1);
    assert.equal(admin.uploads.length, 1);
    assert.equal(map.size, 1);
  } finally {
    global.fetch = originalFetch;
  }
});

test('empty / non-string inputs yield an empty mapping and no uploads', async () => {
  const admin = makeAdminStub();
  const map = await persistRestaurantImageUrls(admin, 'place', [null, '', '   ', undefined], {
    logger: silentLogger,
  });
  assert.equal(map.size, 0);
  assert.equal(admin.uploads.length, 0);
});

test('hashSourcePhotoUrls is order-independent', () => {
  const a = 'https://lh3.googleusercontent.com/a';
  const b = 'https://lh3.googleusercontent.com/b';
  assert.equal(
    hashSourcePhotoUrls([a, b]),
    hashSourcePhotoUrls([b, a, a])
  );
});

test('hashSourcePhotoUrls: empty / garbage → stable empty-set hash', () => {
  const emptyHash = hashSourcePhotoUrls([]);
  assert.equal(hashSourcePhotoUrls(null), emptyHash);
  assert.equal(hashSourcePhotoUrls([null, '', '  ', 12]), emptyHash);
  assert.match(emptyHash, /^[a-f0-9]{40}$/);
});
