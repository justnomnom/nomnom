/**
 * Maps list collaboration RPC / client error codes to i18n keys under `pages.lists`.
 */

const CODE_TO_I18N_KEY = {
  invalid: 'pages.lists.invite_error_invalid_username',
  not_found: 'pages.lists.invite_error_user_not_found',
  user: 'pages.lists.invite_error_user_not_found',
  already_member: 'pages.lists.invite_error_already_member',
  unauthorized: 'pages.lists.collab_error_sign_in',
  not_authenticated: 'pages.lists.collab_error_sign_in',
  forbidden: 'pages.lists.collab_error_forbidden',
  failed: 'pages.lists.collab_error_generic',
  cannot_invite_self: 'pages.lists.collab_error_cannot_invite_self',
  only_owner_can_invite: 'pages.lists.collab_error_only_owner_can_invite',
  only_owner_can_invite_private: 'pages.lists.collab_error_only_owner_can_invite_private',
  cannot_invite_owner: 'pages.lists.collab_error_cannot_invite_owner',
  invalid_role: 'pages.lists.collab_error_invalid_role',
  list_not_found: 'pages.lists.collab_error_list_not_found',
  join_requests_disabled: 'pages.lists.collab_error_join_requests_disabled',
  list_not_public: 'pages.lists.collab_error_list_not_public',
  already_owner: 'pages.lists.collab_error_already_owner',
  not_allowed: 'pages.lists.collab_error_not_allowed',
  no_pending_request: 'pages.lists.collab_error_no_pending_request',
  only_owner: 'pages.lists.collab_error_only_owner',
  cannot_change_owner: 'pages.lists.collab_error_cannot_change_owner',
  not_active_member: 'pages.lists.collab_error_not_active_member',
  cannot_remove_owner: 'pages.lists.collab_error_cannot_remove_owner',
  not_member: 'pages.lists.collab_error_not_member',
  no_pending_invite: 'pages.lists.collab_error_no_pending_invite',
  invalid_name: 'pages.lists.collab_error_invalid_name',
  has_snapshot_purchases: 'pages.lists.collab_error_has_snapshot_purchases',
  has_active_subscriptions: 'pages.lists.collab_error_has_active_subscriptions',
};

/** Longest keys first so `not_active_member` wins over `not_member`. Underscore-only avoids matching English words like "failed". */
const SUBSTRING_CODES = Object.keys(CODE_TO_I18N_KEY)
  .filter((key) => key.includes('_'))
  .sort((a, b) => b.length - a.length);

/**
 * Turn a list collaboration error code (or Postgres message containing one) into user-facing copy.
 * @param {(key: string) => string} t - i18n translate function
 * @param {unknown} code
 * @returns {string|null}
 */
export function translateListCollaborationError(t, code) {
  if (code == null || code === '') return null;
  const raw = String(code).trim();
  if (!raw) return null;

  const exactKey = CODE_TO_I18N_KEY[raw];
  if (exactKey) return t(exactKey);

  const lower = raw.toLowerCase();
  const fragment = SUBSTRING_CODES.find((frag) => lower.includes(frag));
  if (fragment) {
    return t(CODE_TO_I18N_KEY[fragment]);
  }

  if (/^[a-z][a-z0-9_]*$/i.test(raw)) {
    return t('pages.lists.collab_error_generic');
  }

  return raw;
}
