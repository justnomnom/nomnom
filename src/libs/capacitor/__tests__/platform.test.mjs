import assert from 'node:assert/strict';
import test from 'node:test';

test('platform helpers are exported', async () => {
  const mod = await import('../platform.js');
  assert.equal(typeof mod.isCapacitorNative, 'function');
  assert.equal(typeof mod.getCapacitorPlatform, 'function');
  assert.equal(typeof mod.isCapacitorPluginAvailable, 'function');
});
