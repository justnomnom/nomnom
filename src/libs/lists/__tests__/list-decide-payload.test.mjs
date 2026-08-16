/**
 * Error mapping + RPC payload parse + voter-key validation.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isValidDecideVoterKey,
  mapDecideError,
  parseDecidePayload,
  NIGHT_PLACES_ABUSE_CAP,
} from '../list-decide-payload.js';

describe('mapDecideError', () => {
  it('maps known RPC exception fragments to stable codes', () => {
    assert.equal(mapDecideError('not_authenticated'), 'unauthorized');
    assert.equal(mapDecideError('ERROR: only_owner_can_decide'), 'only_owner');
    assert.equal(mapDecideError('list_not_public'), 'list_not_public');
    assert.equal(mapDecideError('need_at_least_three_places'), 'need_three_places');
    assert.equal(mapDecideError('session_not_found'), 'session_not_found');
    assert.equal(mapDecideError('session_locked'), 'session_locked');
    assert.equal(mapDecideError('restaurant_not_on_list'), 'restaurant_not_on_list');
    assert.equal(mapDecideError('invalid_voter_key'), 'invalid_voter_key');
    assert.equal(mapDecideError('invalid_vote'), 'invalid_vote');
    assert.equal(mapDecideError('rate_limited'), 'rate_limited');
    assert.equal(mapDecideError('not_authorized_to_lock'), 'not_authorized_to_lock');
    assert.equal(mapDecideError('restaurant_not_allowed'), 'restaurant_not_allowed');
    assert.equal(mapDecideError('night_not_found'), 'night_not_found');
    assert.equal(mapDecideError('not_joined'), 'not_joined');
    assert.equal(mapDecideError('invalid_display_name'), 'invalid_display_name');
    assert.equal(mapDecideError('too_many_places'), 'too_many_places');
    assert.equal(mapDecideError('invalid_restaurant_id'), 'invalid_restaurant_id');
  });

  it('hides Postgres / PostgREST internals as unknown', () => {
    assert.equal(mapDecideError('function gen_random_bytes(integer) does not exist'), 'unknown');
    assert.equal(mapDecideError('permission denied for table list_decide_votes'), 'unknown');
    assert.equal(mapDecideError('PGRST202: Could not find the function'), 'unknown');
    assert.equal(mapDecideError('postgres: deadlock detected'), 'unknown');
  });

  it('falls back to unknown for empty input and keeps unknown raw strings', () => {
    assert.equal(mapDecideError(null), 'unknown');
    assert.equal(mapDecideError(''), 'unknown');
    assert.equal(mapDecideError(undefined), 'unknown');
    assert.equal(mapDecideError('totally_custom_error'), 'totally_custom_error');
  });

  it('matches the first known fragment when several appear in one message', () => {
    assert.equal(mapDecideError('session_not_found then session_locked'), 'session_not_found');
    assert.equal(mapDecideError('not_authenticated only_owner_can_decide'), 'unauthorized');
  });

  it('stringifies non-string messages', () => {
    assert.equal(mapDecideError({ message: 'session_locked' }), '[object Object]');
    assert.equal(mapDecideError(42), '42');
  });
});

describe('parseDecidePayload', () => {
  it('returns objects as-is and parses JSON objects', () => {
    const obj = { session_id: 'abc', status: 'open' };
    assert.equal(parseDecidePayload(obj), obj);
    assert.deepEqual(parseDecidePayload(JSON.stringify(obj)), obj);
  });

  it('rejects null, arrays, primitives, and invalid JSON', () => {
    assert.equal(parseDecidePayload(null), null);
    assert.equal(parseDecidePayload(undefined), null);
    assert.equal(parseDecidePayload([1]), null);
    assert.equal(parseDecidePayload('[]'), null);
    assert.equal(parseDecidePayload('null'), null);
    assert.equal(parseDecidePayload('"open"'), null);
    assert.equal(parseDecidePayload('{'), null);
    assert.equal(parseDecidePayload(12), null);
    assert.equal(parseDecidePayload(false), null);
    assert.deepEqual(parseDecidePayload('{"session_id":"x"}'), { session_id: 'x' });
    assert.deepEqual(parseDecidePayload({}), {});
  });
});

describe('isValidDecideVoterKey', () => {
  it('accepts trimmed 8–128 character strings', () => {
    assert.equal(isValidDecideVoterKey('12345678'), true);
    assert.equal(isValidDecideVoterKey(`  ${'x'.repeat(8)}  `), true);
    assert.equal(isValidDecideVoterKey('x'.repeat(128)), true);
  });

  it('rejects short, long, blank, and non-string keys', () => {
    assert.equal(isValidDecideVoterKey('1234567'), false);
    assert.equal(isValidDecideVoterKey('x'.repeat(129)), false);
    assert.equal(isValidDecideVoterKey('        '), false);
    assert.equal(isValidDecideVoterKey('\n\t'), false);
    assert.equal(isValidDecideVoterKey(null), false);
    assert.equal(isValidDecideVoterKey(12345678), false);
    assert.equal(isValidDecideVoterKey(undefined), false);
  });

  it('accepts unicode and mixed whitespace as long as trimmed length is in range', () => {
    assert.equal(isValidDecideVoterKey('café-key'), true);
    assert.equal(isValidDecideVoterKey(`\n${'x'.repeat(8)}\t`), true);
    assert.equal(isValidDecideVoterKey('x'.repeat(8)), true);
  });
});

describe('NIGHT_PLACES_ABUSE_CAP', () => {
  it('is 200 so create and add share the same cap', () => {
    assert.equal(NIGHT_PLACES_ABUSE_CAP, 200);
  });
});
