const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @typedef {{
 *   userId: string | null,
 *   avatarUrl: string | null,
 *   displayName: string | null,
 *   username: string | null,
 * }} FollowCircleMember
 */

/** @param {unknown} v @returns {string | null} trimmed non-empty string, else null */
function str(v) {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}

/**
 * Normalizes `restaurant_follow_circle_for_viewer` RPC payload for UI.
 *
 * `userId` is nullable by design. The RPC returns identity only for savers who also wrote a
 * review of this restaurant — a review is already public, so naming its author reveals
 * nothing new. A saver who only added the place to a list comes back as an avatar with no
 * id, no handle and no name, and must stay anonymous on every surface. So this deliberately
 * does NOT drop members without a `user_id`: they are the anonymous faces, and dropping them
 * would make the row disagree with `total`.
 *
 * @param {unknown} raw
 * @returns {{ members: FollowCircleMember[], total: number } | null}
 */
export function normalizeFollowCircle(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const totalRaw = raw.total;
  const total =
    typeof totalRaw === 'number' && Number.isFinite(totalRaw)
      ? Math.max(0, Math.floor(totalRaw))
      : parseInt(String(totalRaw), 10);
  if (!Number.isFinite(total) || total < 0) return null;
  const rows = Array.isArray(raw.members) ? raw.members : [];
  const members = rows
    .filter((m) => m && typeof m === 'object')
    .map((m) => {
      const rawId = m.user_id ?? m.userId;
      // Two different things that must not be conflated:
      //   absent id   -> an anonymous saver, which is the RPC's deliberate output for someone
      //                  who saved without reviewing. Keep the face, carry no identity.
      //   malformed id-> corrupt data. Drop it; we cannot say who this is or that it is
      //                  legitimately anonymous.
      const idAbsent = rawId == null || rawId === '';
      if (!idAbsent && !(typeof rawId === 'string' && UUID_RE.test(rawId))) return null;
      const userId = idAbsent ? null : /** @type {string} */ (rawId);
      const avatarUrl = str(m.avatar_url ?? m.avatarUrl);
      // Never carry a name for a member the RPC would not identify.
      const displayName = userId ? str(m.display_name ?? m.displayName) : null;
      const username = userId ? str(m.username) : null;
      return { userId, avatarUrl, displayName, username };
    })
    .filter(Boolean)
    .slice(0, 3);
  return { members, total };
}

/**
 * Label for a follow-circle member, or null when the member must stay anonymous.
 * Prefers the display name, falls back to the handle.
 *
 * @param {FollowCircleMember | null | undefined} member
 * @returns {string | null}
 */
export function followCircleMemberLabel(member) {
  if (!member?.userId) return null;
  return member.displayName ?? (member.username ? `@${member.username}` : null);
}
