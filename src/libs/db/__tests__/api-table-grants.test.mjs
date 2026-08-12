import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  API_GRANT_NO_ANON_TABLES,
  API_GRANT_SERVICE_ROLE_ONLY_TABLES,
  CRITICAL_AUTHENTICATED_SELECT_TABLES,
  CRITICAL_AUTHENTICATED_WRITE_TABLES,
  CRITICAL_SERVICE_ROLE_WRITE_TABLES,
  diffLiveApiTableGrants,
  expandTablePrivileges,
  findForbiddenApiTableGrants,
  findMissingApiSelectGrants,
  findMissingCriticalAuthenticatedSelectGrants,
  findMissingCriticalAuthenticatedWriteGrants,
  findMissingCriticalServiceRoleWriteGrants,
  findUngrantedPublicTables,
  parseApiTableGrantSql,
  selectRolesForTable,
} from '../api-table-grants.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const GRANTS_SQL_PATH = path.join(ROOT, 'docs', 'db', 'api-table-grants.sql');

/** Tables that previously failed open in production when grants were missing. */
const CRITICAL_TABLES = [
  'tags',
  'restaurants',
  'restaurant_tags',
  'cities',
  'countries',
  'states',
  'lists',
  'users',
  'user_location_follows',
  'user_follows',
  'list_subscriptions',
  'list_snapshot_purchases',
  'list_subscription_payments',
  'customers',
  'stripe_events',
];

test('parseApiTableGrantSql: extracts table/role/privilege triples', () => {
  const map = parseApiTableGrantSql(`
    -- comment
    GRANT SELECT ON TABLE public.tags TO anon;
    GRANT SELECT, INSERT ON TABLE public.tags TO authenticated;
    GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.tags TO service_role;
  `);

  assert.equal(map.size, 1);
  assert.deepEqual([...map.get('tags').get('anon')], ['SELECT']);
  assert.ok(map.get('tags').get('authenticated').has('SELECT'));
  assert.ok(map.get('tags').get('authenticated').has('INSERT'));
  assert.ok(map.get('tags').get('service_role').has('SELECT'));
});

test('expandTablePrivileges: expands ALL to concrete privileges', () => {
  const privs = expandTablePrivileges(['ALL']);
  assert.ok(privs.has('SELECT'));
  assert.ok(privs.has('INSERT'));
  assert.ok(privs.has('UPDATE'));
  assert.ok(privs.has('DELETE'));
});

test('selectRolesForTable: money path excludes anon; admin tables are service_role only', () => {
  assert.deepEqual([...selectRolesForTable('list_subscriptions')], [
    'authenticated',
    'service_role',
  ]);
  assert.deepEqual([...selectRolesForTable('stripe_events')], ['service_role']);
  assert.deepEqual([...selectRolesForTable('tags')], ['anon', 'authenticated', 'service_role']);
});

test('findMissingApiSelectGrants: flags roles without SELECT', () => {
  const map = parseApiTableGrantSql(`
    GRANT SELECT ON TABLE public.tags TO anon;
    GRANT INSERT ON TABLE public.tags TO authenticated;
    GRANT SELECT ON TABLE public.tags TO service_role;
  `);
  assert.deepEqual(findMissingApiSelectGrants(map), [{ table: 'tags', role: 'authenticated' }]);
});

test('docs/db/api-table-grants.sql matches required SELECT roles per table', () => {
  const sql = fs.readFileSync(GRANTS_SQL_PATH, 'utf8');
  const map = parseApiTableGrantSql(sql);
  assert.ok(map.size > 0, 'expected at least one GRANT in api-table-grants.sql');

  const missing = findMissingApiSelectGrants(map);
  assert.deepEqual(
    missing,
    [],
    missing.map((m) => `${m.table}.${m.role}`).join(', ')
  );

  for (const table of CRITICAL_TABLES) {
    assert.ok(map.has(table), `critical table missing from grants SQL: ${table}`);
  }

  assert.ok(map.get('tags')?.get('anon')?.has('SELECT'));
  assert.ok(map.get('tags')?.get('authenticated')?.has('SELECT'));
  assert.ok(map.get('tags')?.get('service_role')?.has('SELECT'));
});

test('docs/db/api-table-grants.sql: money path is authenticated SELECT + service_role write, never anon', () => {
  const sql = fs.readFileSync(GRANTS_SQL_PATH, 'utf8');
  const map = parseApiTableGrantSql(sql);

  for (const table of CRITICAL_AUTHENTICATED_SELECT_TABLES) {
    assert.ok(
      map.get(table)?.get('authenticated')?.has('SELECT'),
      `${table} must GRANT SELECT TO authenticated (Lists hub / paywall)`
    );
    assert.equal(
      map.get(table)?.has('anon'),
      false,
      `${table} must not GRANT to anon (Stripe / membership PII)`
    );
  }

  const missingAuthSelect = findMissingCriticalAuthenticatedSelectGrants(map);
  assert.deepEqual(missingAuthSelect, []);

  const missingSvc = findMissingCriticalServiceRoleWriteGrants(map);
  assert.deepEqual(
    missingSvc,
    [],
    missingSvc.map((m) => `${m.table}.${m.privilege}`).join(', ')
  );

  // Regression: the exact production failure mode for /dashboard/lists
  assert.ok(map.get('list_subscriptions')?.get('authenticated')?.has('SELECT'));
  assert.ok(map.get('list_subscriptions')?.get('service_role')?.has('INSERT'));
  assert.ok(map.get('list_snapshot_purchases')?.get('authenticated')?.has('SELECT'));
});

test('docs/db/api-table-grants.sql: service-role-only and no-anon rules have no forbidden grants', () => {
  const sql = fs.readFileSync(GRANTS_SQL_PATH, 'utf8');
  const map = parseApiTableGrantSql(sql);

  const forbidden = findForbiddenApiTableGrants(map);
  assert.deepEqual(
    forbidden,
    [],
    forbidden.map((f) => `${f.table}.${f.role}.${f.privilege}`).join(', ')
  );

  for (const table of API_GRANT_SERVICE_ROLE_ONLY_TABLES) {
    assert.ok(map.get(table)?.get('service_role')?.has('SELECT'), `${table} service_role SELECT`);
    assert.equal(map.get(table)?.has('anon'), false, `${table} must not grant anon`);
    assert.equal(map.get(table)?.has('authenticated'), false, `${table} must not grant authenticated`);
  }

  for (const table of API_GRANT_NO_ANON_TABLES) {
    assert.equal(map.get(table)?.has('anon'), false, `${table} must not grant anon`);
  }
});

test('docs/db/api-table-grants.sql keeps authenticated DML on onboarding/social write tables', () => {
  const sql = fs.readFileSync(GRANTS_SQL_PATH, 'utf8');
  const map = parseApiTableGrantSql(sql);

  const missing = findMissingCriticalAuthenticatedWriteGrants(map);
  assert.deepEqual(
    missing,
    [],
    missing.map((m) => `${m.table}.${m.privilege}`).join(', ')
  );

  // Regression: production stripped INSERT while SELECT looked fine in a SELECT-only audit.
  const follows = map.get('user_location_follows')?.get('authenticated');
  assert.ok(follows?.has('INSERT'), 'user_location_follows authenticated INSERT required for onboarding');
  assert.ok(follows?.has('DELETE'), 'user_location_follows authenticated DELETE required for follow sync');
  assert.ok(follows?.has('UPDATE'), 'user_location_follows authenticated UPDATE required for follow sync');

  // Notifications: clients read/mark/delete; producers insert via service_role.
  const notif = map.get('notifications')?.get('authenticated');
  assert.ok(notif?.has('SELECT'));
  assert.ok(notif?.has('UPDATE'));
  assert.ok(notif?.has('DELETE'));
  assert.equal(notif?.has('INSERT'), false, 'notifications INSERT must stay service_role-only');
});

test('findMissingCriticalAuthenticatedWriteGrants: catches SELECT-only authenticated hole', () => {
  const map = parseApiTableGrantSql(`
    GRANT SELECT ON TABLE public.user_location_follows TO authenticated;
    GRANT SELECT ON TABLE public.user_location_follows TO service_role;
  `);

  const missing = findMissingCriticalAuthenticatedWriteGrants(map, {
    user_location_follows: CRITICAL_AUTHENTICATED_WRITE_TABLES.user_location_follows,
  });

  assert.deepEqual(
    missing.toSorted((a, b) => a.privilege.localeCompare(b.privilege)),
    [
      { table: 'user_location_follows', role: 'authenticated', privilege: 'DELETE' },
      { table: 'user_location_follows', role: 'authenticated', privilege: 'INSERT' },
      { table: 'user_location_follows', role: 'authenticated', privilege: 'UPDATE' },
    ]
  );
});

test('findMissingCriticalAuthenticatedSelectGrants: catches list_subscriptions SELECT hole', () => {
  const map = parseApiTableGrantSql(`
    GRANT SELECT ON TABLE public.list_subscriptions TO service_role;
    GRANT INSERT ON TABLE public.list_subscriptions TO service_role;
  `);

  assert.deepEqual(findMissingCriticalAuthenticatedSelectGrants(map, ['list_subscriptions']), [
    { table: 'list_subscriptions', role: 'authenticated', privilege: 'SELECT' },
  ]);
});

test('findForbiddenApiTableGrants: flags anon SELECT on money-path tables', () => {
  const map = parseApiTableGrantSql(`
    GRANT SELECT ON TABLE public.list_subscriptions TO anon;
    GRANT SELECT ON TABLE public.list_subscriptions TO authenticated;
    GRANT SELECT ON TABLE public.list_subscriptions TO service_role;
  `);

  assert.deepEqual(findForbiddenApiTableGrants(map), [
    { table: 'list_subscriptions', role: 'anon', privilege: 'SELECT' },
  ]);
});

test('findForbiddenApiTableGrants: flags authenticated SELECT on service-role-only tables', () => {
  const map = parseApiTableGrantSql(`
    GRANT SELECT ON TABLE public.stripe_events TO authenticated;
    GRANT SELECT ON TABLE public.stripe_events TO service_role;
  `);

  assert.deepEqual(findForbiddenApiTableGrants(map), [
    { table: 'stripe_events', role: 'authenticated', privilege: 'SELECT' },
  ]);
});

test('findMissingCriticalServiceRoleWriteGrants: catches webhook INSERT hole', () => {
  const map = parseApiTableGrantSql(`
    GRANT SELECT ON TABLE public.list_subscriptions TO authenticated;
    GRANT SELECT ON TABLE public.list_subscriptions TO service_role;
  `);

  const missing = findMissingCriticalServiceRoleWriteGrants(map, {
    list_subscriptions: CRITICAL_SERVICE_ROLE_WRITE_TABLES.list_subscriptions,
  });

  assert.ok(missing.some((m) => m.privilege === 'INSERT'));
});

test('diffLiveApiTableGrants: detects live SELECT holes for expected tables', () => {
  const expected = parseApiTableGrantSql(`
    GRANT SELECT ON TABLE public.tags TO anon;
    GRANT SELECT ON TABLE public.tags TO authenticated;
    GRANT SELECT ON TABLE public.tags TO service_role;
    GRANT SELECT ON TABLE public.restaurants TO anon;
    GRANT SELECT ON TABLE public.restaurants TO authenticated;
    GRANT SELECT ON TABLE public.restaurants TO service_role;
  `);

  const { missingSelect, missingPrivileges } = diffLiveApiTableGrants(expected, [
    { table_name: 'tags', grantee: 'anon', privilege_type: 'SELECT' },
    { table_name: 'tags', grantee: 'authenticated', privilege_type: 'SELECT' },
    { table_name: 'tags', grantee: 'service_role', privilege_type: 'SELECT' },
    // restaurants: only postgres-style hole — nothing for API roles
  ]);

  assert.deepEqual(missingSelect, [
    { table: 'restaurants', role: 'anon' },
    { table: 'restaurants', role: 'authenticated' },
    { table: 'restaurants', role: 'service_role' },
  ]);
  assert.equal(missingPrivileges.length, 3);
});

test('diffLiveApiTableGrants: detects live INSERT hole when SELECT still present', () => {
  const expected = parseApiTableGrantSql(`
    GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE public.user_location_follows TO authenticated;
    GRANT SELECT ON TABLE public.user_location_follows TO service_role;
  `);

  const { missingSelect, missingPrivileges } = diffLiveApiTableGrants(expected, [
    { table_name: 'user_location_follows', grantee: 'authenticated', privilege_type: 'SELECT' },
    { table_name: 'user_location_follows', grantee: 'service_role', privilege_type: 'SELECT' },
  ]);

  assert.deepEqual(missingSelect, []);
  assert.deepEqual(
    missingPrivileges.toSorted((a, b) => a.privilege.localeCompare(b.privilege)),
    [
      { table: 'user_location_follows', role: 'authenticated', privilege: 'DELETE' },
      { table: 'user_location_follows', role: 'authenticated', privilege: 'INSERT' },
      { table: 'user_location_follows', role: 'authenticated', privilege: 'UPDATE' },
    ]
  );
});

test('diffLiveApiTableGrants: surfaces forbidden live anon grant on list_subscriptions', () => {
  const expected = parseApiTableGrantSql(`
    GRANT SELECT ON TABLE public.list_subscriptions TO authenticated;
    GRANT SELECT ON TABLE public.list_subscriptions TO service_role;
  `);

  const { forbiddenPrivileges } = diffLiveApiTableGrants(expected, [
    { table_name: 'list_subscriptions', grantee: 'anon', privilege_type: 'SELECT' },
    { table_name: 'list_subscriptions', grantee: 'authenticated', privilege_type: 'SELECT' },
    { table_name: 'list_subscriptions', grantee: 'service_role', privilege_type: 'SELECT' },
  ]);

  assert.deepEqual(forbiddenPrivileges, [
    { table: 'list_subscriptions', role: 'anon', privilege: 'SELECT' },
  ]);
});

test('findUngrantedPublicTables: surfaces new public tables not covered by grants SQL', () => {
  const expected = parseApiTableGrantSql(`
    GRANT SELECT ON TABLE public.tags TO anon;
    GRANT SELECT ON TABLE public.tags TO authenticated;
    GRANT SELECT ON TABLE public.tags TO service_role;
  `);
  assert.deepEqual(
    findUngrantedPublicTables(['tags', 'spatial_ref_sys', 'brand_new_feature'], expected),
    ['brand_new_feature']
  );
});
