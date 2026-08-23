/**
 * Error mapping + RPC payload parse + guest-key validation.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  mapTableError,
  isValidGuestKey,
  parseTablePayload,
  normalizeStartsAt,
  TABLE_PLACES_ABUSE_CAP,
} from '../table-payload.js';

describe('mapTableError', () => {
  it('maps known RPC exception fragments to stable codes', () => {
    assert.equal(mapTableError('not_authenticated'), 'unauthorized');
    assert.equal(mapTableError('ERROR: only_owner_can_decide'), 'only_owner');
    assert.equal(mapTableError('list_not_public'), 'list_not_public');
    assert.equal(mapTableError('need_at_least_three_places'), 'need_three_places');
    assert.equal(mapTableError('table_not_found'), 'table_not_found');
    assert.equal(mapTableError('session_locked'), 'table_locked');
    assert.equal(mapTableError('invalid_voter_key'), 'invalid_voter_key');
    assert.equal(mapTableError('invalid_vote'), 'invalid_vote');
    assert.equal(mapTableError('rate_limited'), 'rate_limited');
    assert.equal(mapTableError('not_authorized_to_lock'), 'not_authorized_to_lock');
    assert.equal(mapTableError('restaurant_not_allowed'), 'restaurant_not_allowed');
    assert.equal(mapTableError('invalid_display_name'), 'invalid_display_name');
    assert.equal(mapTableError('not_joined'), 'not_joined');
    assert.equal(mapTableError('too_many_places'), 'too_many_places');
    assert.equal(mapTableError('invalid_restaurant_id'), 'invalid_restaurant_id');
  });

  it('hides Postgres / PostgREST internals as unknown', () => {
    assert.equal(mapTableError('function gen_random_bytes(integer) does not exist'), 'unknown');
    assert.equal(mapTableError('permission denied for table table_votes'), 'unknown');
    assert.equal(mapTableError('PGRST202: Could not find the function'), 'unknown');
    assert.equal(mapTableError('postgres: deadlock detected'), 'unknown');
  });

  it('falls back to unknown for empty input and keeps unknown raw strings', () => {
    assert.equal(mapTableError(null), 'unknown');
    assert.equal(mapTableError(''), 'unknown');
    assert.equal(mapTableError(undefined), 'unknown');
    assert.equal(mapTableError('totally_custom_error'), 'totally_custom_error');
  });

  it('matches the first known fragment when several appear in one message', () => {
    assert.equal(mapTableError('table_not_found then session_locked'), 'table_not_found');
    assert.equal(mapTableError('not_authenticated only_owner_can_decide'), 'unauthorized');
  });

  it('stringifies non-string messages', () => {
    assert.equal(mapTableError({ message: 'session_locked' }), '[object Object]');
    assert.equal(mapTableError(42), '42');
  });
});

describe('parseTablePayload', () => {
  it('returns objects as-is and parses JSON objects', () => {
    const obj = { table_id: 'abc', status: 'open' };
    assert.equal(parseTablePayload(obj), obj);
    assert.deepEqual(parseTablePayload(JSON.stringify(obj)), obj);
  });

  it('rejects null, arrays, primitives, and invalid JSON', () => {
    assert.equal(parseTablePayload(null), null);
    assert.equal(parseTablePayload(undefined), null);
    assert.equal(parseTablePayload([1]), null);
    assert.equal(parseTablePayload('[]'), null);
    assert.equal(parseTablePayload('null'), null);
    assert.equal(parseTablePayload('"open"'), null);
    assert.equal(parseTablePayload('{'), null);
    assert.equal(parseTablePayload(12), null);
    assert.equal(parseTablePayload(false), null);
    assert.deepEqual(parseTablePayload('{"table_id":"x"}'), { table_id: 'x' });
    assert.deepEqual(parseTablePayload({}), {});
  });
});

describe('isValidGuestKey', () => {
  it('accepts trimmed 8–128 character strings', () => {
    assert.equal(isValidGuestKey('12345678'), true);
    assert.equal(isValidGuestKey(`  ${'x'.repeat(8)}  `), true);
    assert.equal(isValidGuestKey('x'.repeat(128)), true);
  });

  it('rejects short, long, blank, and non-string keys', () => {
    assert.equal(isValidGuestKey('1234567'), false);
    assert.equal(isValidGuestKey('x'.repeat(129)), false);
    assert.equal(isValidGuestKey('        '), false);
    assert.equal(isValidGuestKey('\n\t'), false);
    assert.equal(isValidGuestKey(null), false);
    assert.equal(isValidGuestKey(12345678), false);
    assert.equal(isValidGuestKey(undefined), false);
  });

  it('accepts unicode and mixed whitespace as long as trimmed length is in range', () => {
    assert.equal(isValidGuestKey('café-key'), true);
    assert.equal(isValidGuestKey(`\n${'x'.repeat(8)}\t`), true);
    assert.equal(isValidGuestKey('x'.repeat(8)), true);
  });
});

describe('TABLE_PLACES_ABUSE_CAP', () => {
  it('is 200 so start and add share the same cap', () => {
    assert.equal(TABLE_PLACES_ABUSE_CAP, 200);
  });
});

describe('normalizeStartsAt', () => {
  it('keeps ISO timestamptz and Date values', () => {
    assert.equal(normalizeStartsAt('2026-08-19T19:00:00.000Z'), '2026-08-19T19:00:00.000Z');
    assert.equal(normalizeStartsAt(new Date('2026-08-19T19:00:00.000Z')), '2026-08-19T19:00:00.000Z');
  });

  it('rejects timezone-less local strings, blanks, and invalid input', () => {
    assert.equal(normalizeStartsAt('2026-08-19T20:00'), null);
    assert.equal(normalizeStartsAt(''), null);
    assert.equal(normalizeStartsAt('  '), null);
    assert.equal(normalizeStartsAt(null), null);
    assert.equal(normalizeStartsAt('not-a-dateZ'), null);
  });

  it('accepts offsets, trims, and rejects invalid Dates and non-strings', () => {
    assert.equal(normalizeStartsAt('2026-08-19T20:00:00+01:00'), '2026-08-19T19:00:00.000Z');
    assert.equal(normalizeStartsAt('  2026-08-19T19:00:00.000Z  '), '2026-08-19T19:00:00.000Z');
    assert.equal(normalizeStartsAt(new Date(Number.NaN)), null);
    assert.equal(normalizeStartsAt(0), null);
    assert.equal(normalizeStartsAt(12), null);
  });
});
