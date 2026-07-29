/**
 * Pure helper: decide who should be notified about a new spot added to a list.
 *
 * Visibility rules:
 *  - 'public'             → creator-followers ∪ active/trialing subscribers
 *  - 'public_subscribers' → active/trialing subscribers only (followers can't see items)
 *  - 'private'            → nobody (collaborators are out of scope)
 *
 * The list creator and the acting user (whoever added the spot) are always
 * excluded, and the result is de-duplicated.
 *
 * @param {Object} params
 * @param {string} params.visibility
 * @param {Iterable<string>} [params.followerIds]
 * @param {Iterable<string>} [params.subscriberIds]
 * @param {string} [params.creatorId]
 * @param {string} [params.actingUserId]
 * @returns {string[]} recipient user ids
 */
export function buildListUpdateRecipients({
  visibility,
  followerIds = [],
  subscriberIds = [],
  creatorId,
  actingUserId,
} = {}) {
  const recipients = new Set();

  /** @param {unknown} ids */
  const add = (ids) => {
    if (ids == null || typeof ids === 'string') return;
    let list = [];
    if (Array.isArray(ids)) {
      list = ids;
    } else if (typeof ids[Symbol.iterator] === 'function') {
      list = [...ids];
    }
    list.forEach((id) => {
      if (id) recipients.add(String(id));
    });
  };

  if (visibility === 'public') {
    add(followerIds);
    add(subscriberIds);
  } else if (visibility === 'public_subscribers') {
    add(subscriberIds);
  }
  // 'private' (and anything unrecognized) → no recipients.

  if (creatorId) recipients.delete(String(creatorId));
  if (actingUserId) recipients.delete(String(actingUserId));

  return [...recipients];
}
