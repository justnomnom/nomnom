import { buildListUpdateRecipients } from './build-list-update-recipients';

/**
 * Full list-update recipient pipeline: visibility → mutes → channel prefs.
 *
 * @param {Object} params
 * @param {string} params.visibility
 * @param {Iterable<string>} [params.followerIds]
 * @param {Iterable<string>} [params.subscriberIds]
 * @param {string} [params.creatorId]
 * @param {string} [params.actingUserId]
 * @param {string} params.listId
 * @param {Array<{ user_id: string, target_type: string, target_id: string }>} [params.muteRows]
 * @param {Array<{ user_id: string, list_updates_in_app?: boolean, list_updates_push?: boolean }>} [params.prefRows]
 * @returns {{ recipients: string[], activeRecipients: string[], inAppRecipients: string[], pushRecipients: string[] }}
 */
export function resolveListUpdateNotificationAudiences({
  visibility,
  followerIds = [],
  subscriberIds = [],
  creatorId,
  actingUserId,
  listId,
  muteRows = [],
  prefRows = [],
} = {}) {
  const recipients = buildListUpdateRecipients({
    visibility,
    followerIds,
    subscriberIds,
    creatorId,
    actingUserId,
  });
  const activeRecipients = filterMutedRecipients(recipients, muteRows, {
    listId,
    creatorId,
  });
  const { inAppRecipients, pushRecipients } = splitRecipientsByListUpdatePreferences(
    activeRecipients,
    prefRows
  );
  return { recipients, activeRecipients, inAppRecipients, pushRecipients };
}

/**
 * Per-user in-app/push delivery map for a set of candidate user ids.
 *
 * @param {Iterable<string>} candidateUserIds
 * @param {Parameters<typeof resolveListUpdateNotificationAudiences>[0]} params
 * @returns {Record<string, { inApp: boolean, push: boolean }>}
 */
export function getListUpdateDeliveryByUser(candidateUserIds, params) {
  const { inAppRecipients, pushRecipients } = resolveListUpdateNotificationAudiences(params);
  const inApp = new Set(inAppRecipients);
  const push = new Set(pushRecipients);
  let candidates = [];
  if (candidateUserIds != null) {
    if (Array.isArray(candidateUserIds)) {
      candidates = candidateUserIds;
    } else if (typeof candidateUserIds[Symbol.iterator] === 'function') {
      candidates = [...candidateUserIds];
    }
  }
  return Object.fromEntries(
    candidates.map((id) => [
      String(id),
      { inApp: inApp.has(String(id)), push: push.has(String(id)) },
    ])
  );
}

/**
 * Drop recipients who muted this list or its creator.
 *
 * @param {string[]} recipients
 * @param {Array<{ user_id: string, target_type: string, target_id: string }>} [muteRows]
 * @param {{ listId: string, creatorId: string }} targets
 * @returns {string[]}
 */
export function filterMutedRecipients(recipients, muteRows, { listId, creatorId }) {
  const listKey = listId != null ? String(listId) : '';
  const creatorKey = creatorId != null ? String(creatorId) : '';
  const mutedUserIds = new Set(
    (Array.isArray(muteRows) ? muteRows : [])
      .filter(
        (m) =>
          (m.target_type === 'list' && String(m.target_id) === listKey) ||
          (m.target_type === 'creator' && String(m.target_id) === creatorKey)
      )
      .map((m) => String(m.user_id))
  );
  return (Array.isArray(recipients) ? recipients : []).filter(
    (id) => id && !mutedUserIds.has(String(id))
  );
}

/**
 * Split list-update recipients into in-app and push audiences.
 * Missing preference rows default to ON (opt-out model).
 *
 * @param {string[]} activeRecipients
 * @param {Array<{ user_id: string, list_updates_in_app?: boolean, list_updates_push?: boolean }>} [prefRows]
 * @returns {{ inAppRecipients: string[], pushRecipients: string[] }}
 */
export function splitRecipientsByListUpdatePreferences(activeRecipients, prefRows) {
  const prefByUser = new Map(
    (Array.isArray(prefRows) ? prefRows : []).map((r) => [String(r.user_id), r])
  );
  const ids = (Array.isArray(activeRecipients) ? activeRecipients : []).filter(Boolean).map(String);
  return {
    inAppRecipients: ids.filter((id) => prefByUser.get(id)?.list_updates_in_app !== false),
    pushRecipients: ids.filter((id) => prefByUser.get(id)?.list_updates_push !== false),
  };
}

/**
 * Whether a new-follower notification should be emitted.
 * Self-follow and missing ids are rejected upstream; this keeps the rule testable.
 *
 * @param {string} actorId
 * @param {string} recipientId
 * @returns {boolean}
 */
export function shouldNotifyNewFollower(actorId, recipientId) {
  if (!actorId || !recipientId) return false;
  return String(actorId) !== String(recipientId);
}
