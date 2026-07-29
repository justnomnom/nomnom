/**
 * Which of a departing user's lists can actually be deleted.
 *
 * Account deletion used to leave every owned list behind, and a user deleting their account
 * expects their lists to go with it.
 *
 * Two kinds of list must be left out of the explicit delete, for opposite reasons:
 *
 * 1. PAID lists. The money-path FKs (`list_subscriptions`, `list_snapshot_purchases`,
 *    `list_subscription_payments`) are `ON DELETE RESTRICT`, so Postgres refuses to delete a
 *    list anyone has ever paid for — deliberately, because a Snapshot buyer paid for that
 *    content. Attempting it anyway just produces an FK error mid-deletion.
 *
 * 2. SYSTEM lists (`lists.system_key` non-null — the "Must-Go" / "Visited" rows seeded at
 *    signup). `lists_system_key_guard` refuses to delete these *while their owner still
 *    exists*, which is exactly the state this function runs in. Before they were excluded,
 *    every account deletion logged `system list must_go cannot be deleted`, the error was
 *    swallowed, and the rows then disappeared anyway via the CASCADE from `users`. The end
 *    state was right by accident. Skipping them makes it right on purpose.
 *
 * Note on the FK: `lists.user_id` is `ON DELETE CASCADE` and `NOT NULL` (migration
 * 20260724123000 — "a list without an owner has no meaning"). It is NOT `SET NULL`, despite
 * what several older comments claimed; nothing orphans any more. That matters here because
 * it is *why* skipping the system lists is safe — the cascade still removes them.
 */

/**
 * Split owned lists into ones safe to hard-delete and ones to leave to the cascade or keep.
 *
 * @param {Array<string | null | undefined> | null | undefined} ownedListIds
 * @param {Iterable<string> | null | undefined} paidListIds lists with any purchase or subscription row
 * @param {Iterable<string> | null | undefined} [systemListIds] lists with a non-null `system_key`
 * @returns {{ deletable: string[], retained: string[], systemLists: string[] }}
 */
export function partitionListsForAccountDeletion(ownedListIds, paidListIds, systemListIds) {
  const paid = new Set([...(paidListIds ?? [])].map((id) => String(id)));
  const system = new Set([...(systemListIds ?? [])].map((id) => String(id)));
  const seen = new Set();
  return (Array.isArray(ownedListIds) ? ownedListIds : []).reduce(
    (acc, raw) => {
      if (raw == null || raw === '') return acc;
      const id = String(raw);
      if (seen.has(id)) return acc;
      seen.add(id);
      // Paid wins over system: a system list cannot be monetised, so the two never overlap,
      // but if that ever changed the money path is the one that must not be touched.
      if (paid.has(id)) acc.retained.push(id);
      else if (system.has(id)) acc.systemLists.push(id);
      else acc.deletable.push(id);
      return acc;
    },
    { deletable: [], retained: [], systemLists: [] }
  );
}

/**
 * Child rows to clear before deleting a list, in dependency order.
 *
 * Written explicitly rather than relying on `ON DELETE CASCADE`: the cascade rules are not
 * in version control (migrations are gitignored and `types.ts` is empty), and a deletion
 * that half-succeeds because an assumed cascade was not there is worse than one extra
 * round-trip per table.
 */
export const LIST_CHILD_TABLES_IN_DELETE_ORDER = Object.freeze(['list_items', 'list_members']);
