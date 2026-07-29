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
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { ic } from 'src/assets/icons';
import { useLocales, useTranslate } from 'src/locales';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';
import { groupNotifications } from 'src/libs/notifications/group-notifications';

import Iconify from 'src/components/iconify';
import { ScrollableChipRow } from 'src/components/horizontal-scroll-row';
import { scrollableChipPillButtonSx } from 'src/components/scrollable-chip-select';

import NotificationsPanelSkeleton from 'src/sections/notifications/notifications-panel-skeleton';

// ----------------------------------------------------------------------

const FILTER_ALL = '__all__';

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

const rowLinkSx = {
  color: 'text.primary',
  fontWeight: 700,
  textDecoration: 'none',
  cursor: 'pointer',
  '&:hover': { textDecoration: 'underline' },
};

/**
 * Shared list UI for both the header bell popover and the full history page.
 * Groups list-update bursts, renders each notification type, exposes per-row
 * read/delete, and tracks clicks.
 */
export default function NotificationsPanel({
  notifications,
  loading,
  onMarkRead,
  onDelete,
  onNavigate,
  onMuteList,
  emptyLabel,
}) {
  const theme = useTheme();
  const { t } = useTranslate();
  const { currentLang } = useLocales();
  const { trackEvent } = useAnalytics();
  const isPt = currentLang?.value === 'pt';

  const [listFilter, setListFilter] = useState(FILTER_ALL);

  const listChips = useMemo(() => {
    const seen = new Map();
    notifications.forEach((n) => {
      const id = n?.data?.list_id;
      if (id && !seen.has(id)) {
        seen.set(id, n?.data?.list_name || t('components.notifications.title'));
      }
    });
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [notifications, t]);

  const visible = useMemo(() => {
    if (listFilter === FILTER_ALL) return notifications;
    return notifications.filter((n) => n?.data?.list_id === listFilter);
  }, [notifications, listFilter]);

  const grouped = useMemo(() => groupNotifications(visible), [visible]);

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

  const showChips = listChips.length > 1;

  const rowProps = { isPt, t, theme, onMarkRead, onDelete, onNavigate, onMuteList, trackClick };

  const renderBody = () => {
    if (loading && grouped.length === 0) {
      return (
        <NotificationsPanelSkeleton count={4} ariaLabel={t('components.notifications.title')} />
      );
    }
    if (grouped.length === 0) {
      return (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {listFilter === FILTER_ALL
              ? emptyLabel || t('components.notifications.empty')
              : t('components.notifications.empty_filtered')}
          </Typography>
        </Box>
      );
    }
    return (
      <Stack sx={{ py: 0.5 }}>
        {grouped.map((entry) =>
          entry.kind === 'group' ? (
            <GroupRow key={entry.id} group={entry} {...rowProps} />
          ) : (
            <NotificationRow key={entry.id} notification={entry.notification} {...rowProps} />
          )
        )}
      </Stack>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      {showChips && (
        <Box sx={{ px: 1, pb: 1 }} role="group" aria-label={t('components.notifications.title')}>
          <ScrollableChipRow gap={1} sx={{ mx: 0, width: 1 }}>
            <Button
              size="small"
              disableRipple
              aria-pressed={listFilter === FILTER_ALL}
              onClick={() => setListFilter(FILTER_ALL)}
              sx={scrollableChipPillButtonSx(theme, { selected: listFilter === FILTER_ALL })}
            >
              {t('components.notifications.filter_all')}
            </Button>
            {listChips.map((chip) => (
              <Button
                key={chip.id}
                size="small"
                disableRipple
                aria-pressed={listFilter === chip.id}
                onClick={() => setListFilter(chip.id)}
                sx={scrollableChipPillButtonSx(theme, { selected: listFilter === chip.id })}
              >
                {chip.name}
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
};

// ----------------------------------------------------------------------

/** Row chrome shared by every notification type. */
function RowShell({ isUnread, theme, avatar, children, actions }) {
  return (
    <Box
      sx={{
        px: 2,
        py: 1.5,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
        position: 'relative',
        bgcolor: isUnread ? alpha(theme.palette.primary.main, 0.06) : 'transparent',
        transition: theme.transitions.create('background-color'),
        '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) },
      }}
    >
      {avatar}
      <Box sx={{ minWidth: 0, flex: 1 }}>{children}</Box>
      {actions}
    </Box>
  );
}

RowShell.propTypes = {
  isUnread: PropTypes.bool,
  theme: PropTypes.object.isRequired,
  avatar: PropTypes.node,
  children: PropTypes.node,
  actions: PropTypes.node,
};

function ActorAvatar({ name, href, go }) {
  const initial = (name || '').charAt(0).toUpperCase();
  if (href) {
    return (
      <Avatar
        component={RouterLink}
        href={href}
        onClick={go}
        alt=""
        sx={{ width: 40, height: 40, flexShrink: 0 }}
      >
        {initial}
      </Avatar>
    );
  }
  return (
    <Avatar alt="" sx={{ width: 40, height: 40, flexShrink: 0 }}>
      {initial}
    </Avatar>
  );
}

ActorAvatar.propTypes = { name: PropTypes.string, href: PropTypes.string, go: PropTypes.func };

function RowActions({ isUnread, t, onMarkRead, onDelete, onMute }) {
  return (
    <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
      {isUnread && (
        <Tooltip title={t('components.notifications.mark_read')}>
          <IconButton
            size="small"
            aria-label={t('components.notifications.mark_read')}
            onClick={onMarkRead}
          >
            <Iconify icon={ic.checkmarkFill} width={18} />
          </IconButton>
        </Tooltip>
      )}
      {onMute && (
        <Tooltip title={t('components.notifications.mute_list')}>
          <IconButton
            size="small"
            aria-label={t('components.notifications.mute_list')}
            onClick={onMute}
            sx={{ color: 'text.secondary' }}
          >
            <Iconify icon={ic.bellOffLinear} width={18} />
          </IconButton>
        </Tooltip>
      )}
      <Tooltip title={t('components.notifications.delete')}>
        <IconButton
          size="small"
          aria-label={t('components.notifications.delete')}
          onClick={onDelete}
          sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
        >
          <Iconify icon={ic.trashLinear} width={18} />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}

RowActions.propTypes = {
  isUnread: PropTypes.bool,
  t: PropTypes.func.isRequired,
  onMarkRead: PropTypes.func,
  onDelete: PropTypes.func,
  onMute: PropTypes.func,
};

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
  const router = useRouter();
  const data = notification?.data ?? {};
  const type = notification?.type;
  const isUnread = !notification.read_at;
  const canMute = type === 'list_update' && data.list_id && onMuteList;

  // Unify actor fields across types (list_update uses creator_*, others actor_*).
  const actorName = data.creator_name || data.actor_name || '';
  const actorUsername = data.creator_username || data.actor_username || null;
  const actorHref = actorUsername ? paths.dashboard.userPublic(actorUsername) : null;
  const listName = data.list_name || '';
  const listHref = data.list_id ? paths.dashboard.listDetails(data.list_id) : null;

  const go = (href) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUnread) onMarkRead?.(notification.id);
    trackClick?.(type);
    onNavigate?.();
    if (href) router.push(href);
  };

  const actorLink = actorHref ? (
    <Box component={RouterLink} href={actorHref} onClick={go(actorHref)} sx={rowLinkSx}>
      {actorName}
    </Box>
  ) : (
    <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
      {actorName}
    </Box>
  );

  const listLink = (
    <Box component={RouterLink} href={listHref} onClick={go(listHref)} sx={rowLinkSx}>
      {listName}
    </Box>
  );

  let sentence;
  if (type === 'new_follower') {
    sentence = (
      <>
        {actorLink} {t('components.notifications.new_follower_body')}
      </>
    );
  } else if (type === 'list_invite') {
    sentence = (
      <>
        {actorLink} {t('components.notifications.list_invite_verb')} {listLink}
      </>
    );
  } else if (type === 'list_subscribed') {
    sentence = (
      <>
        {actorLink} {t('components.notifications.list_subscribed_verb')} {listLink}
      </>
    );
  } else if (type === 'invite_accepted') {
    sentence = (
      <>
        {actorLink} {t('components.notifications.invite_accepted_verb')} {listLink}
      </>
    );
  } else if (type === 'join_approved') {
    sentence = (
      <>
        {actorLink} {t('components.notifications.join_approved_verb')} {listLink}
      </>
    );
  } else {
    // list_update
    const restaurantName = data.restaurant_name || '';
    const spotHref =
      data.list_id && data.restaurant_id
        ? `${paths.dashboard.listDetails(data.list_id)}?spot=${data.restaurant_id}`
        : listHref;
    sentence = (
      <>
        {actorLink} {t('components.notifications.verb_added')}{' '}
        <Box component={RouterLink} href={spotHref} onClick={go(spotHref)} sx={rowLinkSx}>
          {restaurantName}
        </Box>{' '}
        {t('components.notifications.verb_to')} {listLink}
      </>
    );
  }

  return (
    <RowShell
      isUnread={isUnread}
      theme={theme}
      avatar={
        <ActorAvatar name={actorName} href={actorHref} go={actorHref ? go(actorHref) : undefined} />
      }
      actions={
        <RowActions
          isUnread={isUnread}
          t={t}
          onMarkRead={() => onMarkRead?.(notification.id)}
          onDelete={() => onDelete?.(notification.id)}
          onMute={canMute ? () => onMuteList(data.list_id) : undefined}
        />
      }
    >
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {sentence}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block' }}>
        {relativeTime(notification.created_at, isPt)}
      </Typography>
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
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const data = group.data ?? {};
  const isUnread = group.unreadCount > 0;

  const actorName = data.creator_name || '';
  const actorUsername = data.creator_username || null;
  const actorHref = actorUsername ? paths.dashboard.userPublic(actorUsername) : null;
  const listHref = data.list_id ? paths.dashboard.listDetails(data.list_id) : null;
  const ids = group.items.map((n) => n.id);

  const go = (href) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUnread) ids.forEach((id) => onMarkRead?.(id));
    trackClick?.('list_update_group');
    onNavigate?.();
    if (href) router.push(href);
  };

  const actorLink = actorHref ? (
    <Box component={RouterLink} href={actorHref} onClick={go(actorHref)} sx={rowLinkSx}>
      {actorName}
    </Box>
  ) : (
    <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
      {actorName}
    </Box>
  );

  return (
    <Box>
      <RowShell
        isUnread={isUnread}
        theme={theme}
        avatar={
          <ActorAvatar
            name={actorName}
            href={actorHref}
            go={actorHref ? go(actorHref) : undefined}
          />
        }
        actions={
          <RowActions
            isUnread={isUnread}
            t={t}
            onMarkRead={() => ids.forEach((id) => onMarkRead?.(id))}
            onDelete={() => ids.forEach((id) => onDelete?.(id))}
            onMute={data.list_id && onMuteList ? () => onMuteList(data.list_id) : undefined}
          />
        }
      >
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {actorLink} {t('components.notifications.verb_added')}{' '}
          <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
            {t('components.notifications.spots_count', { count: group.count })}
          </Box>{' '}
          {t('components.notifications.verb_to')}{' '}
          <Box component={RouterLink} href={listHref} onClick={go(listHref)} sx={rowLinkSx}>
            {data.list_name || ''}
          </Box>
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.25 }}>
          <Typography variant="caption" color="text.secondary">
            {relativeTime(group.createdAt, isPt)}
          </Typography>
          <Button
            size="small"
            variant="text"
            color="inherit"
            onClick={() => setExpanded((v) => !v)}
            sx={{ minWidth: 0, p: 0.25, fontSize: 12, color: 'primary.main' }}
            aria-expanded={expanded}
          >
            {expanded
              ? t('components.notifications.group_hide')
              : t('components.notifications.group_show')}
          </Button>
        </Stack>
      </RowShell>

      <Collapse in={expanded} unmountOnExit>
        <Box sx={{ pl: 2, borderLeft: `2px solid ${theme.palette.divider}`, ml: 3 }}>
          {group.items.map((n) => (
            <NotificationRow
              key={n.id}
              notification={n}
              isPt={isPt}
              t={t}
              theme={theme}
              onMarkRead={onMarkRead}
              onDelete={onDelete}
              onNavigate={onNavigate}
              onMuteList={onMuteList}
              trackClick={trackClick}
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
