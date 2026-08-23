import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sizeFromImageHeader } from '../lib/image-header.mjs';

test('sizeFromImageHeader reads a PNG signature', () => {
  const buf = Buffer.alloc(24);
  buf[0] = 0x89;
  buf[1] = 0x50;
  buf[2] = 0x4e;
  buf[3] = 0x47;
  buf.writeUInt32BE(1200, 16);
  buf.writeUInt32BE(1200, 20);
  assert.deepEqual(sizeFromImageHeader(buf), { width: 1200, height: 1200 });
});

test('sizeFromImageHeader rejects junk', () => {
  assert.equal(sizeFromImageHeader(Buffer.from('not-an-image')), null);
});
