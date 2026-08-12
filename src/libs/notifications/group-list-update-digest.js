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
 * Keep only users who explicitly opted into list-update emails
 * (daily digest and Live List emails share this opt-in).
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

/**
 * Drop digest list entries the user is an active/trialing paid subscriber of.
 * Those lists are covered by the Live List email path — including them here
 * would double-email opted-in subscribers.
 *
 * Mutates and returns the same Map for chaining; users left with zero lists
 * are removed.
 *
 * @param {Map<string, Map<string, { listName: string, count: number }>>} byUser
 * @param {Array<{ user_id?: string, list_id?: string, subscriber_user_id?: string }> | null | undefined} subscriptionEdges
 * @returns {Map<string, Map<string, { listName: string, count: number }>>}
 */
export function omitActiveSubscriptionsFromDigest(byUser, subscriptionEdges) {
  if (!(byUser instanceof Map)) return new Map();
  const subscribed = new Set();
  (Array.isArray(subscriptionEdges) ? subscriptionEdges : []).forEach((row) => {
    const uid = row?.user_id ?? row?.subscriber_user_id;
    const listId = row?.list_id;
    if (!uid || !listId) return;
    subscribed.add(`${String(uid)}|${String(listId)}`);
  });
  for (const [uid, lists] of byUser) {
    for (const listId of [...lists.keys()]) {
      if (subscribed.has(`${uid}|${listId}`)) lists.delete(listId);
    }
    if (lists.size === 0) byUser.delete(uid);
  }
  return byUser;
}
