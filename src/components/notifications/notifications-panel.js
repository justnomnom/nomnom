'use client';

import PropTypes from 'prop-types';
import { formatDistanceToNow } from 'date-fns';
import { pt as ptLocale } from 'date-fns/locale';
import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { ic } from 'src/assets/icons';
import { TOUCH_TARGET_SIZE } from 'src/theme/spacing';
import { useLocales, useTranslate } from 'src/locales';
import { readableAccent } from 'src/theme/readable-accent';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';
import { groupNotifications } from 'src/libs/notifications/group-notifications';
import {
  resolveNotificationActorFields,
  resolveNotificationSentenceKind,
} from 'src/libs/notifications/social-notification-payloads';
import {
  canMuteNotificationList,
  bucketFeedEntriesByDate,
  filterNotificationsByListId,
  NOTIFICATION_LIST_FILTER_ALL,
  buildNotificationListFilterChips,
} from 'src/libs/notifications/notification-feed-helpers';

import Iconify from 'src/components/iconify';
import { ScrollableChipRow } from 'src/components/horizontal-scroll-row';
import { scrollableChipPillButtonSx } from 'src/components/scrollable-chip-select';

import { sectionLabelSx } from 'src/sections/profile/view/settings-shell-shared';
import NotificationsPanelSkeleton from 'src/sections/notifications/notifications-panel-skeleton';

import NotificationRowMenu from './notification-row-menu';

// ----------------------------------------------------------------------

/** Row metrics — keep `notifications-panel-skeleton` in lockstep with these. */
const AVATAR_SIZE = 40;
const TYPE_BADGE_SIZE = 20;
const ROW_PX = 2;
const ROW_PY = 1.75;
const UNREAD_DOT_SIZE = 6;
/** Vertical center of the row avatar — anchors the unread dot and the action controls. */
const ROW_AVATAR_CENTER_PX = ROW_PY * 8 + AVATAR_SIZE / 2;
/** Left inset that lines expanded group items up with the sentence column. */
const TEXT_COLUMN_INSET = 8.5;

/** One glyph per notification kind so the feed is scannable without reading it. */
const TYPE_ICON_BY_KIND = {
  new_follower: ic.userBold,
  list_invite: ic.letterBold,
  list_subscribed: ic.bookmarkBold,
  invite_accepted: ic.checkCircleBold,
  join_approved: ic.usersGroupRoundedBold,
  list_update: ic.mapPointBold,
};

const SECTION_LABEL_KEYS = {
  today: 'components.notifications.section_today',
  week: 'components.notifications.section_week',
  earlier: 'components.notifications.section_earlier',
};

/** Raw list names would otherwise stretch a filter chip past the panel width. */
const chipLabelSx = {
  display: 'block',
  maxWidth: 148,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const SENTENCE_VERB_KEYS = {
  list_invite: 'list_invite_verb',
  list_subscribed: 'list_subscribed_verb',
  invite_accepted: 'invite_accepted_verb',
  join_approved: 'join_approved_verb',
};

function relativeTime(iso, isPt) {
  if (!iso) return '';
  try {
    return formatDistanceToNow(new Date(iso), {
      addSuffix: true,
      locale: isPt ? ptLocale : undefined,
    });
  } catch {
    return '';
  }
}

/** Bold, `text.primary` emphasis for the nouns inside a notification sentence. */
function Subject({ children }) {
  return (
    <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
      {children}
    </Box>
  );
}

Subject.propTypes = { children: PropTypes.node };

/**
 * Shared list UI for both the header bell popover and the full history page.
 * Groups list-update bursts into one row, buckets the feed by date, renders each
 * notification type with its own glyph, and tracks clicks.
 */
export default function NotificationsPanel({
  notifications,
  loading,
  onMarkRead,
  onDelete,
  onNavigate,
  onMuteList,
  emptyLabel,
  emptyAction,
  showListFilter = true,
}) {
  const theme = useTheme();
  const { t } = useTranslate();
  const { currentLang } = useLocales();
  const { trackEvent } = useAnalytics();
  const isPt = currentLang?.value === 'pt';

  const [listFilter, setListFilter] = useState(NOTIFICATION_LIST_FILTER_ALL);

  const listChips = useMemo(
    () => buildNotificationListFilterChips(notifications, t('components.notifications.title')),
    [notifications, t]
  );

  const visible = useMemo(
    () => filterNotificationsByListId(notifications, listFilter),
    [notifications, listFilter]
  );

  const sections = useMemo(() => bucketFeedEntriesByDate(groupNotifications(visible)), [visible]);

  const trackClick = useCallback(
    (type) => {
      try {
        trackEvent('notification_click', { type });
      } catch {
        /* analytics is best-effort */
      }
    },
    [trackEvent]
  );

  const showChips = showListFilter && listChips.length > 1;
  const isEmpty = sections.length === 0;

  const rowProps = { isPt, t, theme, onMarkRead, onDelete, onNavigate, onMuteList, trackClick };

  const renderBody = () => {
    if (loading && isEmpty) {
      return (
        <NotificationsPanelSkeleton count={4} ariaLabel={t('components.notifications.title')} />
      );
    }

    if (isEmpty) {
      const filtered = listFilter !== NOTIFICATION_LIST_FILTER_ALL;
      return (
        <EmptyFeed
          theme={theme}
          title={t(
            filtered
              ? 'components.notifications.empty_filtered_title'
              : 'components.notifications.empty_title'
          )}
          body={
            filtered
              ? t('components.notifications.empty_filtered')
              : emptyLabel || t('components.notifications.empty')
          }
          action={filtered ? null : emptyAction}
        />
      );
    }

    return (
      <Stack sx={{ pb: 0.5 }}>
        {sections.map((section) => (
          <Box key={section.key} component="section">
            <Typography component="h3" sx={{ ...sectionLabelSx(theme), px: ROW_PX, pt: 1.5, pb: 0.75 }}>
              {t(SECTION_LABEL_KEYS[section.key])}
            </Typography>

            <Box
              sx={{
                '& > *:not(:last-child)': {
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                },
              }}
            >
              {section.entries.map((entry) =>
                entry.kind === 'group' ? (
                  <GroupRow key={entry.id} group={entry} {...rowProps} />
                ) : (
                  <NotificationRow key={entry.id} notification={entry.notification} {...rowProps} />
                )
              )}
            </Box>
          </Box>
        ))}
      </Stack>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {showChips && (
        <Box
          role="group"
          aria-label={t('components.notifications.title')}
          sx={{
            px: 1.5,
            py: 1,
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          }}
        >
          <ScrollableChipRow gap={1} sx={{ mx: 0, width: 1 }}>
            <Button
              color="inherit"
              disableElevation
              aria-pressed={listFilter === NOTIFICATION_LIST_FILTER_ALL}
              onClick={() => setListFilter(NOTIFICATION_LIST_FILTER_ALL)}
              sx={scrollableChipPillButtonSx(theme, {
                selected: listFilter === NOTIFICATION_LIST_FILTER_ALL,
              })}
            >
              {t('components.notifications.filter_all')}
            </Button>
            {listChips.map((chip) => (
              <Button
                key={chip.id}
                color="inherit"
                disableElevation
                aria-pressed={listFilter === chip.id}
                onClick={() => setListFilter(chip.id)}
                sx={scrollableChipPillButtonSx(theme, { selected: listFilter === chip.id })}
              >
                <Box component="span" sx={chipLabelSx}>
                  {chip.name}
                </Box>
              </Button>
            ))}
          </ScrollableChipRow>
        </Box>
      )}

      {renderBody()}
    </Box>
  );
}

NotificationsPanel.propTypes = {
  notifications: PropTypes.array,
  loading: PropTypes.bool,
  onMarkRead: PropTypes.func,
  onDelete: PropTypes.func,
  onNavigate: PropTypes.func,
  onMuteList: PropTypes.func,
  emptyLabel: PropTypes.string,
  emptyAction: PropTypes.node,
  showListFilter: PropTypes.bool,
};

// ----------------------------------------------------------------------

/** Teaches what the feed is for instead of only reporting absence (DESIGN.md §7). */
function EmptyFeed({ theme, title, body, action }) {
  return (
    <Stack alignItems="center" spacing={1.25} sx={{ px: 3, py: 6, textAlign: 'center' }}>
      <Box
        sx={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          color: readableAccent(theme),
        }}
      >
        <Iconify icon={ic.bellLinear} width={26} />
      </Box>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 320 }}>
        {body}
      </Typography>
      {action ? <Box sx={{ pt: 0.5 }}>{action}</Box> : null}
    </Stack>
  );
}

EmptyFeed.propTypes = {
  theme: PropTypes.object.isRequired,
  title: PropTypes.string,
  body: PropTypes.string,
  action: PropTypes.node,
};

// ----------------------------------------------------------------------

/**
 * Row chrome shared by every notification type.
 *
 * The sentence area is a single link to one destination (no nested anchors) and the
 * controls sit outside it. On pointer devices the overflow trigger fades in on
 * hover/focus so a long feed reads as text rather than a wall of icon buttons.
 */
function RowShell({ isUnread, theme, t, href, onOpen, avatar, children, actions }) {
  const isLink = Boolean(href);

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'flex-start',
        bgcolor: isUnread ? alpha(theme.palette.primary.main, 0.055) : 'transparent',
        transition: theme.transitions.create('background-color', {
          duration: theme.transitions.duration.shorter,
        }),
        '&:hover': {
          bgcolor: isUnread ? alpha(theme.palette.primary.main, 0.1) : theme.palette.action.hover,
        },
        '@media (hover: hover) and (pointer: fine)': {
          '& .notification-row-menu-button': {
            opacity: 0,
            transition: theme.transitions.create('opacity', {
              duration: theme.transitions.duration.shorter,
            }),
          },
          '&:hover .notification-row-menu-button, & .notification-row-menu-button:focus-visible, & .notification-row-menu-button[aria-expanded="true"]':
            { opacity: 1 },
        },
      }}
    >
      {isUnread && (
        <Box
          role="img"
          aria-label={t('components.notifications.aria_unread')}
          sx={{
            position: 'absolute',
            left: 6,
            top: `${ROW_AVATAR_CENTER_PX - UNREAD_DOT_SIZE / 2}px`,
            width: UNREAD_DOT_SIZE,
            height: UNREAD_DOT_SIZE,
            borderRadius: '50%',
            bgcolor: readableAccent(theme),
          }}
        />
      )}

      <Box
        component={isLink ? RouterLink : 'div'}
        href={isLink ? href : undefined}
        onClick={isLink ? onOpen : undefined}
        sx={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1.5,
          pl: ROW_PX,
          pr: 0.5,
          py: ROW_PY,
          color: 'inherit',
          textDecoration: 'none',
          WebkitTapHighlightColor: 'transparent',
          /** Matches the filter-chip focus ring so keyboard nav reads the same app-wide. */
          '&:focus-visible': {
            outline: `2px solid ${alpha(theme.palette.primary.main, 0.35)}`,
            outlineOffset: -2,
          },
        }}
      >
        {avatar}
        <Box sx={{ minWidth: 0, flex: 1 }}>{children}</Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.25,
          pr: 0.5,
          /** Optically centers the 44px controls on the avatar rather than the whole row. */
          pt: `${ROW_AVATAR_CENTER_PX - TOUCH_TARGET_SIZE / 2}px`,
          flexShrink: 0,
        }}
      >
        {actions}
      </Box>
    </Box>
  );
}

RowShell.propTypes = {
  isUnread: PropTypes.bool,
  theme: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
  href: PropTypes.string,
  onOpen: PropTypes.func,
  avatar: PropTypes.node,
  children: PropTypes.node,
  actions: PropTypes.node,
};

/** Initial avatar with a kind badge — notification payloads carry no avatar URL. */
function ActorAvatar({ name, icon, theme }) {
  const initial = (name || '').charAt(0).toUpperCase();

  return (
    <Box sx={{ position: 'relative', flexShrink: 0 }}>
      <Avatar
        alt=""
        sx={{
          width: AVATAR_SIZE,
          height: AVATAR_SIZE,
          fontSize: '0.9375rem',
          fontWeight: 700,
          color: 'text.primary',
          bgcolor: alpha(theme.palette.primary.main, 0.12),
        }}
      >
        {initial}
      </Avatar>
      <Box
        sx={{
          position: 'absolute',
          right: -3,
          bottom: -3,
          width: TYPE_BADGE_SIZE,
          height: TYPE_BADGE_SIZE,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
          color: readableAccent(theme),
          boxShadow: theme.customShadows?.z1 ?? theme.shadows[1],
        }}
      >
        <Iconify icon={icon} width={12} />
      </Box>
    </Box>
  );
}

ActorAvatar.propTypes = {
  name: PropTypes.string,
  icon: PropTypes.string.isRequired,
  theme: PropTypes.object.isRequired,
};

/** Timestamp line under every sentence. */
function RowMeta({ children }) {
  return (
    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.375, display: 'block' }}>
      {children}
    </Typography>
  );
}

RowMeta.propTypes = { children: PropTypes.node };

// ----------------------------------------------------------------------

function NotificationRow({
  notification,
  isPt,
  t,
  theme,
  onMarkRead,
  onDelete,
  onNavigate,
  onMuteList,
  trackClick,
}) {
  const data = notification?.data ?? {};
  const type = notification?.type;
  const sentenceKind = resolveNotificationSentenceKind(type);
  const isUnread = !notification.read_at;
  const canMute = canMuteNotificationList(notification) && onMuteList;

  // Unify actor fields across types (list_update uses creator_*, others actor_*).
  const { name: actorName, username: actorUsername } = resolveNotificationActorFields(data);
  const actorHref = actorUsername ? paths.dashboard.userPublic(actorUsername) : null;
  const listName = data.list_name || '';
  const listHref = data.list_id ? paths.dashboard.listDetails(data.list_id) : null;
  const restaurantName = data.restaurant_name || '';
  const spotHref =
    listHref && data.restaurant_id ? `${listHref}?spot=${data.restaurant_id}` : listHref;

  /** One destination per row: the thing the notification is about. */
  const href = sentenceKind === 'new_follower' ? actorHref : (spotHref ?? actorHref);

  const handleOpen = () => {
    if (isUnread) onMarkRead?.(notification.id);
    trackClick?.(type);
    onNavigate?.();
  };

  let sentence;
  if (sentenceKind === 'new_follower') {
    sentence = (
      <>
        <Subject>{actorName}</Subject> {t('components.notifications.new_follower_body')}
      </>
    );
  } else if (sentenceKind === 'list_update') {
    sentence = (
      <>
        <Subject>{actorName}</Subject> {t('components.notifications.verb_added')}{' '}
        <Subject>{restaurantName}</Subject> {t('components.notifications.verb_to')}{' '}
        <Subject>{listName}</Subject>
      </>
    );
  } else {
    sentence = (
      <>
        <Subject>{actorName}</Subject>{' '}
        {t(`components.notifications.${SENTENCE_VERB_KEYS[sentenceKind]}`)}{' '}
        <Subject>{listName}</Subject>
      </>
    );
  }

  return (
    <RowShell
      isUnread={isUnread}
      theme={theme}
      t={t}
      href={href}
      onOpen={handleOpen}
      avatar={
        <ActorAvatar
          name={actorName}
          icon={TYPE_ICON_BY_KIND[sentenceKind] ?? TYPE_ICON_BY_KIND.list_update}
          theme={theme}
        />
      }
      actions={
        <NotificationRowMenu
          isUnread={isUnread}
          onMarkRead={onMarkRead ? () => onMarkRead(notification.id) : undefined}
          onMute={canMute ? () => onMuteList(data.list_id) : undefined}
          onDelete={onDelete ? () => onDelete(notification.id) : undefined}
        />
      }
    >
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: isUnread ? 500 : 400 }}>
        {sentence}
      </Typography>
      <RowMeta>{relativeTime(notification.created_at, isPt)}</RowMeta>
    </RowShell>
  );
}

NotificationRow.propTypes = {
  notification: PropTypes.object.isRequired,
  isPt: PropTypes.bool,
  t: PropTypes.func.isRequired,
  theme: PropTypes.object.isRequired,
  onMarkRead: PropTypes.func,
  onDelete: PropTypes.func,
  onNavigate: PropTypes.func,
  onMuteList: PropTypes.func,
  trackClick: PropTypes.func,
};

// ----------------------------------------------------------------------

function GroupRow({
  group,
  isPt,
  t,
  theme,
  onMarkRead,
  onDelete,
  onNavigate,
  onMuteList,
  trackClick,
}) {
  const [expanded, setExpanded] = useState(false);
  const data = group.data ?? {};
  const isUnread = group.unreadCount > 0;

  const actorName = data.creator_name || '';
  const listName = data.list_name || '';
  const listHref = data.list_id ? paths.dashboard.listDetails(data.list_id) : null;
  const ids = group.items.map((n) => n.id);

  const markGroupRead = () => ids.forEach((id) => onMarkRead?.(id));

  const handleOpen = () => {
    if (isUnread) markGroupRead();
    trackClick?.('list_update_group');
    onNavigate?.();
  };

  const toggleLabel = expanded
    ? t('components.notifications.group_hide')
    : t('components.notifications.group_show');

  return (
    <Box>
      <RowShell
        isUnread={isUnread}
        theme={theme}
        t={t}
        href={listHref}
        onOpen={handleOpen}
        avatar={<ActorAvatar name={actorName} icon={TYPE_ICON_BY_KIND.list_update} theme={theme} />}
        actions={
          <>
            <Tooltip title={toggleLabel}>
              <IconButton
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                aria-label={toggleLabel}
                sx={{
                  width: TOUCH_TARGET_SIZE,
                  height: TOUCH_TARGET_SIZE,
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary' },
                }}
              >
                <Iconify
                  icon={ic.chevronDownFill}
                  width={20}
                  sx={{
                    transform: expanded ? 'rotate(180deg)' : 'none',
                    transition: theme.transitions.create('transform', {
                      duration: theme.transitions.duration.shortest,
                    }),
                  }}
                />
              </IconButton>
            </Tooltip>
            <NotificationRowMenu
              isUnread={isUnread}
              onMarkRead={onMarkRead ? markGroupRead : undefined}
              onMute={data.list_id && onMuteList ? () => onMuteList(data.list_id) : undefined}
              onDelete={onDelete ? () => ids.forEach((id) => onDelete(id)) : undefined}
            />
          </>
        }
      >
        <Typography
          variant="body2"
          sx={{ color: 'text.secondary', fontWeight: isUnread ? 500 : 400 }}
        >
          <Subject>{actorName}</Subject> {t('components.notifications.verb_added')}{' '}
          <Subject>{t('components.notifications.spots_count', { count: group.count })}</Subject>{' '}
          {t('components.notifications.verb_to')} <Subject>{listName}</Subject>
        </Typography>
        <RowMeta>{relativeTime(group.createdAt, isPt)}</RowMeta>
      </RowShell>

      <Collapse in={expanded} unmountOnExit>
        <Box
          sx={{
            bgcolor: alpha(theme.palette.text.primary, 0.025),
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          }}
        >
          {group.items.map((item) => (
            <GroupSpotRow
              key={item.id}
              item={item}
              isPt={isPt}
              theme={theme}
              onOpen={() => {
                if (!item.read_at) onMarkRead?.(item.id);
                trackClick?.('list_update');
                onNavigate?.();
              }}
            />
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

GroupRow.propTypes = {
  group: PropTypes.object.isRequired,
  isPt: PropTypes.bool,
  t: PropTypes.func.isRequired,
  theme: PropTypes.object.isRequired,
  onMarkRead: PropTypes.func,
  onDelete: PropTypes.func,
  onNavigate: PropTypes.func,
  onMuteList: PropTypes.func,
  trackClick: PropTypes.func,
};

/** One spot inside an expanded burst — a link, not a full notification row. */
function GroupSpotRow({ item, isPt, theme, onOpen }) {
  const data = item?.data ?? {};
  const listHref = data.list_id ? paths.dashboard.listDetails(data.list_id) : null;
  const href = listHref && data.restaurant_id ? `${listHref}?spot=${data.restaurant_id}` : listHref;

  const body = (
    <>
      <Iconify
        icon={ic.mapPointBold}
        width={14}
        sx={{ color: readableAccent(theme), flexShrink: 0, mt: 0.25 }}
      />
      <Typography
        variant="body2"
        noWrap
        sx={{ fontWeight: 600, color: 'text.primary', minWidth: 0 }}
      >
        {data.restaurant_name || ''}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ flexShrink: 0, ml: 'auto' }}>
        {relativeTime(item.created_at, isPt)}
      </Typography>
    </>
  );

  const layoutSx = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 1,
    pl: TEXT_COLUMN_INSET,
    pr: 2,
    py: 1,
  };

  if (!href) {
    return <Box sx={layoutSx}>{body}</Box>;
  }

  return (
    <Box
      component={RouterLink}
      href={href}
      onClick={onOpen}
      sx={{
        ...layoutSx,
        color: 'inherit',
        textDecoration: 'none',
        WebkitTapHighlightColor: 'transparent',
        transition: theme.transitions.create('background-color', {
          duration: theme.transitions.duration.shorter,
        }),
        '&:hover': { bgcolor: theme.palette.action.hover },
        '&:focus-visible': {
          outline: `2px solid ${alpha(theme.palette.primary.main, 0.35)}`,
          outlineOffset: -2,
        },
      }}
    >
      {body}
    </Box>
  );
}

GroupSpotRow.propTypes = {
  item: PropTypes.object.isRequired,
  isPt: PropTypes.bool,
  theme: PropTypes.object.isRequired,
  onOpen: PropTypes.func,
};
