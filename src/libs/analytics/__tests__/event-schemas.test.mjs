/**
 * Analytics event catalog: every product event has a required-props contract.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ANALYTICS_EVENT_SCHEMAS,
  applyAnalyticsSchemaGuardrails,
} from '../event-schemas.js';

test('ANALYTICS_EVENT_SCHEMAS: checkout, table, and restaurant funnels stay required', () => {
  assert.deepEqual(ANALYTICS_EVENT_SCHEMAS.live_list_checkout_started.required, ['list_id']);
  assert.deepEqual(ANALYTICS_EVENT_SCHEMAS.snapshot_checkout_failed.required, [
    'list_id',
    'error_code',
  ]);
  assert.deepEqual(ANALYTICS_EVENT_SCHEMAS.table_started.required, ['table_id', 'list_id']);
  assert.deepEqual(ANALYTICS_EVENT_SCHEMAS.table_vote_cast.required, [
    'table_id',
    'restaurant_id',
    'vote',
  ]);
  assert.deepEqual(ANALYTICS_EVENT_SCHEMAS.restaurant_detail_viewed.required, [
    'restaurant_id',
    'surface',
  ]);
  assert.deepEqual(ANALYTICS_EVENT_SCHEMAS.onboarding_completed.required, ['path', 'from_step']);
});

test('ANALYTICS_EVENT_SCHEMAS: every entry has a required array', () => {
  const names = Object.keys(ANALYTICS_EVENT_SCHEMAS);
  assert.ok(names.length >= 80);
  for (const name of names) {
    assert.ok(Array.isArray(ANALYTICS_EVENT_SCHEMAS[name].required), name);
  }
});

test('applyAnalyticsSchemaGuardrails: unknown events and complete props pass through', () => {
  const props = { list_id: 'abc' };
  assert.equal(applyAnalyticsSchemaGuardrails('not_a_real_event', props), props);
  assert.equal(applyAnalyticsSchemaGuardrails('list_viewed', props), props);
});

test('applyAnalyticsSchemaGuardrails: missing / blank required props are flagged', () => {
  const flagged = applyAnalyticsSchemaGuardrails('list_viewed', { list_id: '  ' });
  assert.equal(flagged._schema_missing_required, 'list_id');
  const multi = applyAnalyticsSchemaGuardrails('table_vote_cast', { table_id: 't' });
  assert.equal(multi._schema_missing_required, 'restaurant_id,vote');
});
