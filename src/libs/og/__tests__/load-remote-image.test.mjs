import assert from 'node:assert/strict';
import { test, describe, afterEach } from 'node:test';

import { loadRemoteImage } from '../load-remote-image.js';

const realFetch = globalThis.fetch;

/** Minimal `Response` stand-in — only the three members `loadRemoteImage` touches. */
function stubFetch({ ok = true, contentType = 'image/png', body = Uint8Array.from([1, 2, 3]) }) {
  globalThis.fetch = async () => ({
    ok,
    headers: { get: (name) => (name === 'content-type' ? contentType : null) },
    arrayBuffer: async () => body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
  });
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('loadRemoteImage', () => {
  test('inlines an image as a data URI carrying the served content type', async () => {
    stubFetch({ contentType: 'image/jpeg', body: Uint8Array.from([255, 216, 255]) });
    assert.equal(await loadRemoteImage('https://cdn.example/a.jpg'), 'data:image/jpeg;base64,/9j/');
  });

  test('rejects non-HTTPS urls without fetching', async () => {
    globalThis.fetch = async () => assert.fail('must not fetch over plaintext');
    assert.equal(await loadRemoteImage('http://cdn.example/a.png'), null);
  });

  test('rejects blank, missing and non-string urls', async () => {
    globalThis.fetch = async () => assert.fail('must not fetch without a url');
    assert.equal(await loadRemoteImage(null), null);
    assert.equal(await loadRemoteImage(''), null);
    assert.equal(await loadRemoteImage(42), null);
  });

  test('rejects a non-image response — an HTML error page is not an avatar', async () => {
    stubFetch({ contentType: 'text/html' });
    assert.equal(await loadRemoteImage('https://cdn.example/a.png'), null);
  });

  test('rejects a non-ok response', async () => {
    stubFetch({ ok: false });
    assert.equal(await loadRemoteImage('https://cdn.example/gone.png'), null);
  });

  test('rejects an empty body', async () => {
    stubFetch({ body: new Uint8Array(0) });
    assert.equal(await loadRemoteImage('https://cdn.example/empty.png'), null);
  });

  test('rejects a body over the 2 MB cap', async () => {
    stubFetch({ body: new Uint8Array(2 * 1024 * 1024 + 1) });
    assert.equal(await loadRemoteImage('https://cdn.example/huge.png'), null);
  });

  test('swallows a fetch rejection so a dead avatar cannot 500 the card', async () => {
    globalThis.fetch = async () => {
      throw new Error('ETIMEDOUT');
    };
    assert.equal(await loadRemoteImage('https://cdn.example/slow.png'), null);
  });
});
