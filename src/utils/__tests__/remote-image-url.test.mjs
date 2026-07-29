import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  isOptimizableRemoteImageUrl,
  isSupabasePublicStorageUrl,
} from '../remote-image-url.js';

test('isSupabasePublicStorageUrl: valid public storage HTTPS', () => {
  assert.equal(
    isSupabasePublicStorageUrl(
      'https://abc.supabase.co/storage/v1/object/public/avatars/x.png'
    ),
    true
  );
});

test('isSupabasePublicStorageUrl: rejects non-https, wrong host, wrong path, garbage', () => {
  assert.equal(
    isSupabasePublicStorageUrl('http://abc.supabase.co/storage/v1/object/public/x'),
    false
  );
  assert.equal(
    isSupabasePublicStorageUrl('https://example.com/storage/v1/object/public/x'),
    false
  );
  assert.equal(
    isSupabasePublicStorageUrl('https://abc.supabase.co/storage/v1/object/sign/x'),
    false
  );
  assert.equal(isSupabasePublicStorageUrl(null), false);
  assert.equal(isSupabasePublicStorageUrl(''), false);
  assert.equal(isSupabasePublicStorageUrl('not a url'), false);
  assert.equal(isSupabasePublicStorageUrl(42), false);
});

test('isOptimizableRemoteImageUrl: allows known CDNs and supabase public', () => {
  assert.equal(
    isOptimizableRemoteImageUrl('https://images.unsplash.com/photo-1'),
    true
  );
  assert.equal(
    isOptimizableRemoteImageUrl('https://lh3.googleusercontent.com/a/b'),
    true
  );
  assert.equal(isOptimizableRemoteImageUrl('https://i.pravatar.cc/150'), true);
  assert.equal(
    isOptimizableRemoteImageUrl(
      'https://xyz.supabase.co/storage/v1/object/public/r/1.jpg'
    ),
    true
  );
});

test('isOptimizableRemoteImageUrl: rejects blob/data/http/unknown', () => {
  assert.equal(isOptimizableRemoteImageUrl('blob:http://localhost/1'), false);
  assert.equal(isOptimizableRemoteImageUrl('data:image/png;base64,xx'), false);
  assert.equal(isOptimizableRemoteImageUrl('https://evil.example.com/x.png'), false);
  assert.equal(isOptimizableRemoteImageUrl('http://images.unsplash.com/x'), false);
  assert.equal(isOptimizableRemoteImageUrl(null), false);
});
