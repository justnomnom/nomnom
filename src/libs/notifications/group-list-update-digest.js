/**
 * Aggregate recent list_update notifications per recipient and per list for the
 * daily email digest. Skips rows without a list_id.
 *
 * @param {Array<{ user_id: string, data?: { list_id?: string, list_name?: string } }>} notifs
 * @returns {Map<string, Map<string, { listName: string, count: number }>>}
 */
export function groupListUpdatesByUserForDigest(notifs) {
  const byUser = new Map();
  (Array.isArray(notifs) ? notifs : []).forEach((n) => {
    const uid = String(n.user_id);
    const listId = n?.data?.list_id;
    if (!listId) return;
    if (!byUser.has(uid)) byUser.set(uid, new Map());
    const lists = byUser.get(uid);
    const entry = lists.get(listId) || { listName: n?.data?.list_name || 'a list', count: 0 };
    entry.count += 1;
    lists.set(listId, entry);
  });
  return byUser;
}

/**
 * Keep only users who explicitly opted into list-update email digests.
 *
 * @param {Iterable<string>} userIds
 * @param {Array<{ user_id: string, list_updates_email?: boolean }>} [prefRows]
 * @returns {Set<string>}
 */
export function filterDigestRecipientsByEmailPreference(userIds, prefRows) {
  const enabled = new Set(
    (Array.isArray(prefRows) ? prefRows : [])
      .filter((p) => p.list_updates_email === true)
      .map((p) => String(p.user_id))
  );
  return new Set([...userIds].filter((id) => enabled.has(String(id))));
}
