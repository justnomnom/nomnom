import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PROFILE_ACTIVITY_PAGE_SIZE } from '../public-profile-activity-constants.js';

test('PROFILE_ACTIVITY_PAGE_SIZE is 20 (server/client load-more alignment)', () => {
  assert.equal(PROFILE_ACTIVITY_PAGE_SIZE, 20);
  assert.equal(typeof PROFILE_ACTIVITY_PAGE_SIZE, 'number');
});
