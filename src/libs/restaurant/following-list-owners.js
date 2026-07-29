/**
 * Build the map sheet "who has this spot" owner lookup from rows fetched by the server action.
 *
 * @param {Array<{ restaurant_id: unknown, list_id: unknown }>} items
 * @param {Array<{ id: unknown, user_id: string | null | undefined }>} listUserRows
 * @param {Array<{ id: unknown, display_name?: string | null, username?: string | null, avatar_url?: string | null }>} userRows
 * @returns {Record<string, Array<{ userId: string, displayName: string | null, username: string | null, avatarUrl: string | null }>>}
 */
export function buildFollowingListOwnersMap(items, listUserRows, userRows) {
  const userIdByList = {};
  (Array.isArray(listUserRows) ? listUserRows : []).forEach((l) => {
    if (l?.id != null) userIdByList[String(l.id)] = l.user_id;
  });

  const userById = {};
  (Array.isArray(userRows) ? userRows : []).forEach((u) => {
    if (u?.id != null) userById[String(u.id)] = u;
  });

  const result = {};
  (Array.isArray(items) ? items : []).forEach((item) => {
    if (item?.restaurant_id == null || item?.list_id == null) return;
    const rid = String(item.restaurant_id);
    const ownerId = userIdByList[String(item.list_id)];
    if (!ownerId) return;
    if (!result[rid]) result[rid] = [];
    if (!result[rid].find((o) => o.userId === ownerId)) {
      const u = userById[String(ownerId)];
      result[rid].push({
        userId: ownerId,
        displayName: u?.display_name ?? null,
        username: u?.username ?? null,
        avatarUrl: u?.avatar_url ?? null,
      });
    }
  });

  return result;
}
