import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getAdminUserIdSet, isAdminUserId } from '../admin-allowlist.js';

let savedAdminIds;
beforeEach(() => {
  savedAdminIds = process.env.ADMIN_USER_IDS;
  delete process.env.ADMIN_USER_IDS;
});
afterEach(() => {
  if (savedAdminIds !== undefined) process.env.ADMIN_USER_IDS = savedAdminIds;
  else delete process.env.ADMIN_USER_IDS;
});

// getAdminUserIdSet
test('returns empty Set when env not set', () => {
  const s = getAdminUserIdSet();
  assert.ok(s instanceof Set);
  assert.equal(s.size, 0);
});
test('single id', () => {
  process.env.ADMIN_USER_IDS = 'uuid-1';
  const s = getAdminUserIdSet();
  assert.equal(s.size, 1);
  assert.ok(s.has('uuid-1'));
});
test('comma-separated ids', () => {
  process.env.ADMIN_USER_IDS = 'uuid-1,uuid-2,uuid-3';
  const s = getAdminUserIdSet();
  assert.equal(s.size, 3);
  assert.ok(s.has('uuid-2'));
});
test('trims whitespace around ids', () => {
  process.env.ADMIN_USER_IDS = ' uuid-1 , uuid-2 ';
  const s = getAdminUserIdSet();
  assert.ok(s.has('uuid-1'));
  assert.ok(s.has('uuid-2'));
});
test('empty env returns empty Set', () => {
  process.env.ADMIN_USER_IDS = '';
  const s = getAdminUserIdSet();
  assert.equal(s.size, 0);
});

// isAdminUserId
test('returns true for listed id', () => {
  process.env.ADMIN_USER_IDS = 'admin-uuid';
  assert.equal(isAdminUserId('admin-uuid'), true);
});
test('returns false for unlisted id', () => {
  process.env.ADMIN_USER_IDS = 'admin-uuid';
  assert.equal(isAdminUserId('other-uuid'), false);
});
test('returns false for null', () => {
  assert.equal(isAdminUserId(null), false);
});
test('returns false for undefined', () => {
  assert.equal(isAdminUserId(undefined), false);
});
test('returns false for non-string', () => {
  assert.equal(isAdminUserId(123), false);
});
test('returns false when env empty', () => {
  assert.equal(isAdminUserId('any-uuid'), false);
});
