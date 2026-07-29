/** Max age span (ms) within which same creator+list list-updates collapse together. */
const GROUP_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Collapse bursts of `list_update` notifications from the same creator + list
 * (within a 24h window and contiguous in the time-sorted feed) into a single
 * expandable group. Everything else stays as an individual entry.
 *
 * Input must be sorted newest-first (as the API returns it).
 *
 * @param {Array<{id:string,type:string,data?:object,read_at?:string|null,created_at:string}>} notifications
 * @returns {Array<
 *   | { kind: 'single', id: string, notification: object }
 *   | { kind: 'group', id: string, items: object[], data: object, count: number,
 *       unreadCount: number, createdAt: string }
 * >}
 */
export function groupNotifications(notifications) {
  const out = [];

  const groupKey = (n) =>
    n?.type === 'list_update' && n?.data?.list_id
      ? `list_update|${n.data.creator_id ?? ''}|${n.data.list_id}`
      : null;

  (Array.isArray(notifications) ? notifications : []).forEach((n) => {
    const key = groupKey(n);
    const last = out[out.length - 1];

    const canAppend =
      key &&
      last &&
      last.kind === 'group' &&
      last.key === key &&
      new Date(last.newest).getTime() - new Date(n.created_at).getTime() < GROUP_WINDOW_MS;

    if (canAppend) {
      last.items.push(n);
      last.count += 1;
      if (!n.read_at) last.unreadCount += 1;
      return;
    }

    // Start a new bucket. Even a single list_update becomes a group bucket so the
    // renderer can decide to show it as a plain row when count === 1.
    if (key) {
      out.push({
        kind: 'group',
        key,
        id: n.id,
        newest: n.created_at,
        createdAt: n.created_at,
        data: n.data,
        items: [n],
        count: 1,
        unreadCount: n.read_at ? 0 : 1,
      });
    } else {
      out.push({ kind: 'single', id: n.id, notification: n });
    }
  });

  // Collapse single-item groups back to plain singles.
  return out.map((entry) => {
    if (entry.kind === 'group' && entry.count === 1) {
      return { kind: 'single', id: entry.items[0].id, notification: entry.items[0] };
    }
    return entry;
  });
}
