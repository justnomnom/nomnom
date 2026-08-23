/**
 * Run: node --test src/libs/lists/__tests__/article-list-qwen-env.test.mjs
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireQwenEnv } from '../../../../remotion/scripts/lib/qwen-json-chat.mjs';

test('requireQwenEnv fails closed when any of the three vars is missing', () => {
  const prev = {
    QWEN_API_KEY: process.env.QWEN_API_KEY,
    QWEN_BASE_URL: process.env.QWEN_BASE_URL,
    QWEN_MODEL: process.env.QWEN_MODEL,
  };
  try {
    delete process.env.QWEN_API_KEY;
    delete process.env.QWEN_BASE_URL;
    delete process.env.QWEN_MODEL;
    assert.throws(() => requireQwenEnv(), /QWEN_API_KEY/);

    process.env.QWEN_API_KEY = 'k';
    assert.throws(() => requireQwenEnv(), /QWEN_BASE_URL/);

    process.env.QWEN_BASE_URL = 'https://example.com';
    assert.throws(() => requireQwenEnv(), /QWEN_MODEL/);

    process.env.QWEN_MODEL = 'qwen-turbo';
    assert.deepEqual(requireQwenEnv(), {
      key: 'k',
      baseUrl: 'https://example.com',
      model: 'qwen-turbo',
    });
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});
