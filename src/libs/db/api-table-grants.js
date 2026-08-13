/**
 * Parse / audit PostgREST table grants for anon, authenticated, and service_role.
 * Keeps RLS from looking "fine" while the API still returns permission denied.
 *
 * SELECT-only audits are not enough: onboarding location save failed when
 * `authenticated` still had SELECT (or nothing) but lacked INSERT/UPDATE/DELETE on
 * `user_location_follows`. Always diff the full privilege set from
 * `docs/db/api-table-grants.sql`.
 *
 * Money-path regression: Lists hub failed with
 * `permission denied for table list_subscriptions` when authenticated SELECT
 * was stripped after least-privilege hardening. Those tables must stay in
 * {@link CRITICAL_AUTHENTICATED_SELECT_TABLES} and must never be granted to anon.
 */

/** Privileges expanded from `GRANT ALL` in SQL. */
export const ALL_TABLE_PRIVILEGES = Object.freeze([
  'DELETE',
  'INSERT',
  'REFERENCES',
  'SELECT',
  'TRIGGER',
  'TRUNCATE',
  'UPDATE',
]);

/**
 * Tables granted only to `service_role` (admin UI, Stripe ledger, curated data).
 * Clients reach this data via SECURITY DEFINER RPCs or the admin client.
 */
export const API_GRANT_SERVICE_ROLE_ONLY_TABLES = Object.freeze([
  'stripe_events',
  'suggested_creators',
  'sponsored_restaurant_placements',
  'list_decide_sessions',
  'list_decide_votes',
  'nights',
  'night_places',
  'night_guests',
]);

/**
 * Tables that authenticated (and service_role) may SELECT, but anon must not.
 * Includes money-path + private user data (no public catalog read).
 */
export const API_GRANT_NO_ANON_TABLES = Object.freeze([
  'customers',
  'list_members',
  'list_snapshot_purchases',
  'list_subscription_payments',
  'list_subscriptions',
  'notification_mutes',
  'notification_preferences',
  'notifications',
  'push_subscriptions',
  'user_follows',
  'user_location_follows',
  'user_restaurant_tag_preferences',
  'users',
]);

/**
 * Roles that need SELECT for a given table, based on business rules above.
 *
 * @param {string} table
 * @returns {readonly string[]}
 */
export function selectRolesForTable(table) {
  if (API_GRANT_SERVICE_ROLE_ONLY_TABLES.includes(table)) {
    return Object.freeze(['service_role']);
  }
  if (API_GRANT_NO_ANON_TABLES.includes(table)) {
    return Object.freeze(['authenticated', 'service_role']);
  }
  return Object.freeze(['anon', 'authenticated', 'service_role']);
}

/** @deprecated Prefer {@link selectRolesForTable}; kept for older call sites. */
export const API_SELECT_ROLES = Object.freeze(['anon', 'authenticated', 'service_role']);

/**
 * Tables where `authenticated` must retain row DML. RLS still scopes rows;
 * without these GRANTs PostgREST returns 42501 and the UI shows generic failures
 * (e.g. onboarding `save_failed`).
 *
 * `notifications` deliberately omits INSERT — producers use `insertNotifications`
 * (service_role). Clients only read / mark-read / delete their own rows.
 */
export const CRITICAL_AUTHENTICATED_WRITE_TABLES = Object.freeze({
  user_location_follows: Object.freeze(['DELETE', 'INSERT', 'SELECT', 'UPDATE']),
  user_follows: Object.freeze(['DELETE', 'INSERT', 'SELECT', 'UPDATE']),
  notifications: Object.freeze(['DELETE', 'SELECT', 'UPDATE']),
  notification_preferences: Object.freeze(['DELETE', 'INSERT', 'SELECT', 'UPDATE']),
  notification_mutes: Object.freeze(['DELETE', 'INSERT', 'SELECT', 'UPDATE']),
  push_subscriptions: Object.freeze(['DELETE', 'INSERT', 'SELECT', 'UPDATE']),
  users: Object.freeze(['INSERT', 'SELECT', 'UPDATE']),
  customers: Object.freeze(['DELETE', 'INSERT', 'SELECT', 'UPDATE']),
  lists: Object.freeze(['DELETE', 'INSERT', 'SELECT', 'UPDATE']),
  list_items: Object.freeze(['DELETE', 'INSERT', 'SELECT', 'UPDATE']),
  list_item_must_try_dishes: Object.freeze(['DELETE', 'INSERT', 'SELECT', 'UPDATE']),
  restaurant_reviews: Object.freeze(['DELETE', 'INSERT', 'SELECT', 'UPDATE']),
  user_restaurant_tag_preferences: Object.freeze(['DELETE', 'INSERT', 'SELECT', 'UPDATE']),
});

/**
 * Money-path + Lists hub: authenticated must be able to SELECT or the hub
 * returns `permission denied for table list_subscriptions` (42501).
 * Writes stay service_role-only (Stripe webhooks).
 */
export const CRITICAL_AUTHENTICATED_SELECT_TABLES = Object.freeze([
  'list_subscriptions',
  'list_snapshot_purchases',
  'list_subscription_payments',
  'list_members',
]);

/**
 * Service role must retain full DML on money-path tables for Stripe webhooks.
 */
export const CRITICAL_SERVICE_ROLE_WRITE_TABLES = Object.freeze({
  list_subscriptions: Object.freeze(['DELETE', 'INSERT', 'SELECT', 'UPDATE']),
  list_snapshot_purchases: Object.freeze(['DELETE', 'INSERT', 'SELECT', 'UPDATE']),
  list_subscription_payments: Object.freeze(['DELETE', 'INSERT', 'SELECT', 'UPDATE']),
  stripe_events: Object.freeze(['DELETE', 'INSERT', 'SELECT', 'UPDATE']),
  customers: Object.freeze(['DELETE', 'INSERT', 'SELECT', 'UPDATE']),
});

/**
 * Public tables that are internal bookkeeping / extension-owned and are not
 * required to appear in `docs/db/api-table-grants.sql`.
 */
export const API_GRANT_TABLE_ALLOWLIST = Object.freeze([
  '_schema_migrations_applied',
  'spatial_ref_sys',
  'geography_columns',
  'geometry_columns',
]);

const GRANT_LINE_RE =
  /^\s*GRANT\s+(.+?)\s+ON\s+TABLE\s+public\.([a-z0-9_]+)\s+TO\s+([a-z0-9_]+)\s*;?\s*$/im;

/**
 * Expand privilege tokens (`ALL` → concrete table privileges).
 *
 * @param {Iterable<string>} privileges
 * @returns {Set<string>}
 */
export function expandTablePrivileges(privileges) {
  const out = new Set();
  for (const raw of privileges ?? []) {
    const p = String(raw ?? '').trim().toUpperCase();
    if (!p) continue;
    if (p === 'ALL') {
      ALL_TABLE_PRIVILEGES.forEach((priv) => out.add(priv));
      continue;
    }
    out.add(p);
  }
  return out;
}

/**
 * Parse GRANT statements from a SQL file into a table → role → privilege set map.
 *
 * @param {string} sql
 * @returns {Map<string, Map<string, Set<string>>>}
 */
export function parseApiTableGrantSql(sql) {
  /** @type {Map<string, Map<string, Set<string>>>} */
  const byTable = new Map();
  const lines = String(sql ?? '').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('--')) continue;

    const match = trimmed.match(GRANT_LINE_RE);
    if (!match) continue;

    const privileges = expandTablePrivileges(
      match[1].split(',').map((p) => p.trim()).filter(Boolean)
    );
    const table = match[2];
    const role = match[3];

    if (!byTable.has(table)) byTable.set(table, new Map());
    const byRole = byTable.get(table);
    if (!byRole.has(role)) byRole.set(role, new Set());
    const privs = byRole.get(role);
    privileges.forEach((p) => privs.add(p));
  }

  return byTable;
}

/**
 * Tables that are missing SELECT for the API roles that should see them.
 *
 * @param {Map<string, Map<string, Set<string>>>} grantMap
 * @returns {Array<{ table: string, role: string }>}
 */
export function findMissingApiSelectGrants(grantMap) {
  /** @type {Array<{ table: string, role: string }>} */
  const missing = [];
  for (const [table, byRole] of grantMap.entries()) {
    for (const role of selectRolesForTable(table)) {
      const privs = byRole.get(role);
      if (!privs?.has('SELECT')) {
        missing.push({ table, role });
      }
    }
  }
  return missing;
}

/**
 * Grants that must never exist (anon on money/private tables; browser roles on
 * service-role-only tables). Catches over-permissive restores.
 *
 * @param {Map<string, Map<string, Set<string>>>} grantMap
 * @returns {Array<{ table: string, role: string, privilege: string }>}
 */
export function findForbiddenApiTableGrants(grantMap) {
  /** @type {Array<{ table: string, role: string, privilege: string }>} */
  const forbidden = [];

  for (const table of API_GRANT_SERVICE_ROLE_ONLY_TABLES) {
    const byRole = grantMap.get(table);
    if (!byRole) continue;
    for (const role of ['anon', 'authenticated']) {
      const privs = byRole.get(role);
      if (!privs?.size) continue;
      for (const privilege of privs) {
        forbidden.push({ table, role, privilege });
      }
    }
  }

  for (const table of API_GRANT_NO_ANON_TABLES) {
    const privs = grantMap.get(table)?.get('anon');
    if (!privs?.size) continue;
    for (const privilege of privs) {
      forbidden.push({ table, role: 'anon', privilege });
    }
  }

  return forbidden;
}

/**
 * Critical write tables missing required `authenticated` privileges in a grant map.
 *
 * @param {Map<string, Map<string, Set<string>>>} grantMap
 * @param {Record<string, readonly string[]>} [required]
 * @returns {Array<{ table: string, role: string, privilege: string }>}
 */
export function findMissingCriticalAuthenticatedWriteGrants(
  grantMap,
  required = CRITICAL_AUTHENTICATED_WRITE_TABLES
) {
  /** @type {Array<{ table: string, role: string, privilege: string }>} */
  const missing = [];
  for (const [table, privileges] of Object.entries(required)) {
    const have = grantMap.get(table)?.get('authenticated');
    for (const privilege of privileges) {
      if (!have?.has(privilege)) {
        missing.push({ table, role: 'authenticated', privilege });
      }
    }
  }
  return missing;
}

/**
 * Money-path / Lists hub: authenticated SELECT must be present.
 *
 * @param {Map<string, Map<string, Set<string>>>} grantMap
 * @param {readonly string[]} [tables]
 * @returns {Array<{ table: string, role: string, privilege: string }>}
 */
export function findMissingCriticalAuthenticatedSelectGrants(
  grantMap,
  tables = CRITICAL_AUTHENTICATED_SELECT_TABLES
) {
  /** @type {Array<{ table: string, role: string, privilege: string }>} */
  const missing = [];
  for (const table of tables) {
    if (!grantMap.get(table)?.get('authenticated')?.has('SELECT')) {
      missing.push({ table, role: 'authenticated', privilege: 'SELECT' });
    }
  }
  return missing;
}

/**
 * Stripe / admin writers: service_role DML must be present.
 *
 * @param {Map<string, Map<string, Set<string>>>} grantMap
 * @param {Record<string, readonly string[]>} [required]
 * @returns {Array<{ table: string, role: string, privilege: string }>}
 */
export function findMissingCriticalServiceRoleWriteGrants(
  grantMap,
  required = CRITICAL_SERVICE_ROLE_WRITE_TABLES
) {
  /** @type {Array<{ table: string, role: string, privilege: string }>} */
  const missing = [];
  for (const [table, privileges] of Object.entries(required)) {
    const have = grantMap.get(table)?.get('service_role');
    for (const privilege of privileges) {
      if (!have?.has(privilege)) {
        missing.push({ table, role: 'service_role', privilege });
      }
    }
  }
  return missing;
}

/**
 * Build a live grant map from `information_schema.role_table_grants` rows.
 *
 * @param {Array<{ table_name: string, grantee: string, privilege_type: string }>} liveRows
 * @returns {Map<string, Map<string, Set<string>>>}
 */
export function buildLiveGrantMap(liveRows) {
  /** @type {Map<string, Map<string, Set<string>>>} */
  const live = new Map();
  for (const row of liveRows ?? []) {
    const table = row.table_name;
    const role = row.grantee;
    const priv = String(row.privilege_type ?? '').toUpperCase();
    if (!table || !role || !priv) continue;
    if (!live.has(table)) live.set(table, new Map());
    const byRole = live.get(table);
    if (!byRole.has(role)) byRole.set(role, new Set());
    expandTablePrivileges([priv]).forEach((p) => byRole.get(role).add(p));
  }
  return live;
}

/**
 * Compare live `information_schema.role_table_grants` rows to the expected map.
 *
 * @param {Map<string, Map<string, Set<string>>>} expected
 * @param {Array<{ table_name: string, grantee: string, privilege_type: string }>} liveRows
 * @returns {{
 *   missingSelect: Array<{ table: string, role: string }>,
 *   missingPrivileges: Array<{ table: string, role: string, privilege: string }>,
 *   forbiddenPrivileges: Array<{ table: string, role: string, privilege: string }>,
 * }}
 */
export function diffLiveApiTableGrants(expected, liveRows) {
  const live = buildLiveGrantMap(liveRows);

  /** @type {Array<{ table: string, role: string }>} */
  const missingSelect = [];
  /** @type {Array<{ table: string, role: string, privilege: string }>} */
  const missingPrivileges = [];

  for (const [table, byRole] of expected.entries()) {
    for (const [role, expectedPrivs] of byRole.entries()) {
      const livePrivs = live.get(table)?.get(role);
      for (const privilege of expectedPrivs) {
        if (livePrivs?.has(privilege)) continue;
        missingPrivileges.push({ table, role, privilege });
        if (privilege === 'SELECT') {
          if (selectRolesForTable(table).includes(role)) {
            missingSelect.push({ table, role });
          }
        }
      }
    }
  }

  return {
    missingSelect,
    missingPrivileges,
    forbiddenPrivileges: findForbiddenApiTableGrants(live),
  };
}

/**
 * App tables present in the DB that are missing from the grants SQL (except allowlist).
 *
 * @param {string[]} publicTables
 * @param {Map<string, Map<string, Set<string>>>} expected
 * @param {string[]} [allowlist]
 * @returns {string[]}
 */
export function findUngrantedPublicTables(
  publicTables,
  expected,
  allowlist = API_GRANT_TABLE_ALLOWLIST
) {
  const allowed = new Set(allowlist);
  return (publicTables ?? [])
    .filter((name) => !allowed.has(name))
    .filter((name) => !expected.has(name))
    .toSorted();
}

/**
 * SQL used by the live audit to list all table grants for API roles.
 * Prefer this over SELECT-only queries so INSERT/UPDATE/DELETE holes surface.
 */
export const LIVE_API_TABLE_GRANTS_SQL = `
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'service_role')
ORDER BY table_name, grantee, privilege_type
`;

/** @deprecated Use {@link LIVE_API_TABLE_GRANTS_SQL}; kept for older call sites. */
export const LIVE_API_SELECT_GRANTS_SQL = `
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee IN ('anon', 'authenticated', 'service_role')
  AND privilege_type = 'SELECT'
ORDER BY table_name, grantee
`;

/** SQL used by the live audit to list public base tables. */
export const LIVE_PUBLIC_TABLES_SQL = `
SELECT c.relname AS table_name
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname
`;
