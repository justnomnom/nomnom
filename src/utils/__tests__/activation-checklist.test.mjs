import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ACTIVATION_DISMISS_VERSION,
  activationDismissStorageKey,
  restaurantHasSaves,
  shouldShowActivationChecklist,
} from '../activation-checklist.js';

test('activationDismissStorageKey: scopes by user id and version', () => {
  assert.equal(
    activationDismissStorageKey('abc'),
    `nomnom.activation.dismissed.v${ACTIVATION_DISMISS_VERSION}:abc`
  );
  assert.equal(
    activationDismissStorageKey(''),
    `nomnom.activation.dismissed.v${ACTIVATION_DISMISS_VERSION}:_`
  );
  assert.equal(
    activationDismissStorageKey(null),
    `nomnom.activation.dismissed.v${ACTIVATION_DISMISS_VERSION}:_`
  );
});

test('restaurantHasSaves: any non-empty list-id array counts', () => {
  assert.equal(restaurantHasSaves(null), false);
  assert.equal(restaurantHasSaves({}), false);
  assert.equal(restaurantHasSaves({ a: [] }), false);
  assert.equal(restaurantHasSaves({ a: ['list-1'] }), true);
  assert.equal(restaurantHasSaves({ a: [], b: ['x'] }), true);
});

test('shouldShowActivationChecklist: hide when dismissed or both items done', () => {
  assert.equal(shouldShowActivationChecklist({ dismissed: true, hasFollowed: false, hasSaved: false }), false);
  assert.equal(shouldShowActivationChecklist({ dismissed: false, hasFollowed: true, hasSaved: true }), false);
  assert.equal(shouldShowActivationChecklist({ dismissed: false, hasFollowed: true, hasSaved: false }), true);
  assert.equal(shouldShowActivationChecklist({ dismissed: false, hasFollowed: false, hasSaved: true }), true);
  assert.equal(shouldShowActivationChecklist({}), true);
});
