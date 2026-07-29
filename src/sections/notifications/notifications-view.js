'use client';

import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';

import { paths } from 'src/routes/paths';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { setNotificationMute } from 'src/auth/actions/notification-mutes-actions';
import {
  fetchNotificationsPage,
  deleteNotificationRequest,
  markNotificationReadRequest,
  deleteAllNotificationsRequest,
  markAllNotificationsReadRequest,
} from 'src/api/notifications';

import Iconify from 'src/components/iconify';
import { DashboardPageMotion } from 'src/components/dashboard';
import DeleteDialog from 'src/components/custom-dialog/delete-dialog';
import NotificationsPanel from 'src/components/notifications/notifications-panel';
import CompactToolbarIconSkeleton from 'src/components/loading-screen/compact-toolbar-icon-skeleton';

import { hubCardShellSx, SettingsDrillShell, dashboardPageRootSx } from 'src/sections/profile/view';

import NotificationsPageSkeleton from './notifications-page-skeleton';

// ----------------------------------------------------------------------

function NotificationsToolbarActions({ hasUnread, hasItems, loading, onMarkAllRead, onDeleteAll }) {
  const { t } = useTranslate();

  if (loading) {
    return <CompactToolbarIconSkeleton />;
  }

  return (
    <Stack direction="row" spacing={0.5}>
      <Tooltip title={t('components.notifications.mark_all_read')}>
        <span>
          <IconButton
            size="small"
            disabled={!hasUnread}
            aria-label={t('components.notifications.mark_all_read')}
            onClick={onMarkAllRead}
          >
            <Iconify icon={ic.checkReadBold} width={20} />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={t('components.notifications.delete_all')}>
        <span>
          <IconButton
            size="small"
            disabled={!hasItems}
            aria-label={t('components.notifications.delete_all')}
            onClick={onDeleteAll}
            sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
          >
            <Iconify icon={ic.trashBold} width={20} />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}

NotificationsToolbarActions.propTypes = {
  hasUnread: PropTypes.bool.isRequired,
  hasItems: PropTypes.bool.isRequired,
  loading: PropTypes.bool.isRequired,
  onMarkAllRead: PropTypes.func.isRequired,
  onDeleteAll: PropTypes.func.isRequired,
};

// ----------------------------------------------------------------------

export default function NotificationsView() {
  const theme = useTheme();
  const { t } = useTranslate();

  const [items, setItems] = useState([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadPage = useCallback(async (nextOffset, replace) => {
    setLoading(true);
    try {
      const res = await fetchNotificationsPage(nextOffset);
      setItems((prev) => (replace ? res.notifications : [...prev, ...res.notifications]));
      setHasMore(Boolean(res.hasMore));
      setOffset(nextOffset + (res.notifications?.length ?? 0));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage(0, true);
  }, [loadPage]);

  const handleMarkRead = async (id) => {
    await markNotificationReadRequest(id);
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    );
  };

  const handleDelete = async (id) => {
    await deleteNotificationRequest(id);
    setItems((prev) => prev.filter((n) => n.id !== id));
  };

  const handleMuteList = async (listId) => {
    if (!listId) return;
    await setNotificationMute('list', listId, true);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsReadRequest();
    setItems((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
  };

  const handleConfirmDeleteAll = async () => {
    setDeleting(true);
    try {
      await deleteAllNotificationsRequest();
      setItems([]);
      setHasMore(false);
      setOffset(0);
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const hasUnread = items.some((n) => !n.read_at);

  if (loading && items.length === 0) {
    return <NotificationsPageSkeleton />;
  }

  return (
    <SettingsDrillShell
      title={t('components.notifications.title')}
      backHref={paths.dashboard.discover}
      backAriaLabel={t('pages.dashboard.title')}
      endAdornment={
        <NotificationsToolbarActions
          hasUnread={hasUnread}
          hasItems={items.length > 0}
          loading={loading}
          onMarkAllRead={handleMarkAllRead}
          onDeleteAll={() => setConfirmOpen(true)}
        />
      }
    >
      <Box sx={{ ...dashboardPageRootSx, minWidth: 0, overflowX: 'hidden' }}>
        <DashboardPageMotion>
          <Box sx={hubCardShellSx(theme)}>
            <NotificationsPanel
              notifications={items}
              loading={loading}
              onMarkRead={handleMarkRead}
              onDelete={handleDelete}
              onMuteList={handleMuteList}
            />
          </Box>

          {hasMore && (
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Button
                variant="outlined"
                color="inherit"
                disabled={loading}
                onClick={() => loadPage(offset)}
              >
                {t('components.notifications.load_more')}
              </Button>
            </Box>
          )}
        </DashboardPageMotion>
      </Box>

      <DeleteDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDeleteAll}
        isDeleting={deleting}
        title={t('components.notifications.delete_all')}
        confirmationMessage={t('components.notifications.delete_all_confirm')}
        confirmButtonText={t('components.notifications.delete_all')}
      />
    </SettingsDrillShell>
  );
}
