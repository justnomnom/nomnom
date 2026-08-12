/**
 * Pure helpers for social / direct in-app notifications
 * (invite, join, subscribe, new follower).
 */

/**
 * Recipient for invite_accepted / list_subscribed: the list owner,
 * never when the owner is also the actor (self-subscribe / self-accept).
 *
 * @param {string | null | undefined} ownerId
 * @param {string | null | undefined} actorId
 * @returns {string | null}
 */
export function resolveOwnerRecipientExcludingActor(ownerId, actorId) {
  if (!ownerId || !actorId) return null;
  if (String(ownerId) === String(actorId)) return null;
  return String(ownerId);
}

/**
 * Whether a direct (single-recipient) notification should be written.
 *
 * @param {string | null | undefined} recipientId
 * @returns {boolean}
 */
export function shouldEmitDirectNotification(recipientId) {
  return Boolean(recipientId && String(recipientId).trim());
}

/**
 * Display name for a social notification actor.
 *
 * @param {{ display_name?: string | null, username?: string | null } | null | undefined} actor
 * @param {string} [fallback]
 * @returns {string}
 */
export function resolveSocialActorName(actor, fallback = 'Someone') {
  return actor?.display_name || actor?.username || fallback;
}

/**
 * Shared data payload for list-scoped social notifications.
 *
 * @param {Object} params
 * @param {{ id?: string | null, display_name?: string | null, username?: string | null } | null} [params.actor]
 * @param {string | null | undefined} params.listId
 * @param {string | null | undefined} [params.listName]
 * @param {string} [params.fallbackName]
 * @returns {Record<string, unknown>}
 */
export function buildListSocialNotificationData({
  actor,
  listId,
  listName,
  fallbackName = 'Someone',
} = {}) {
  return {
    actor_id: actor?.id ?? null,
    actor_username: actor?.username ?? null,
    actor_name: resolveSocialActorName(actor, fallbackName),
    list_id: listId ?? null,
    list_name: listName ?? null,
  };
}

/**
 * Payload for new_follower notifications.
 *
 * @param {{ id?: string | null, display_name?: string | null, username?: string | null } | null} actor
 * @returns {Record<string, unknown>}
 */
export function buildNewFollowerNotificationData(actor) {
  return {
    actor_id: actor?.id ?? null,
    actor_username: actor?.username ?? null,
    actor_name: resolveSocialActorName(actor, 'Someone'),
  };
}

/**
 * Sentence kind used by the notifications panel for a given type.
 *
 * @param {string | null | undefined} type
 * @returns {'new_follower'|'list_invite'|'list_subscribed'|'invite_accepted'|'join_approved'|'list_update'}
 */
export function resolveNotificationSentenceKind(type) {
  switch (type) {
    case 'new_follower':
      return 'new_follower';
    case 'list_invite':
      return 'list_invite';
    case 'list_subscribed':
      return 'list_subscribed';
    case 'invite_accepted':
      return 'invite_accepted';
    case 'join_approved':
      return 'join_approved';
    default:
      return 'list_update';
  }
}

/**
 * Unify actor fields across list_update (creator_*) and social (actor_*) payloads.
 *
 * @param {Record<string, unknown> | null | undefined} data
 * @returns {{ name: string, username: string | null }}
 */
export function resolveNotificationActorFields(data) {
  return {
    name: String(data?.creator_name || data?.actor_name || ''),
    username: data?.creator_username || data?.actor_username || null,
  };
}
