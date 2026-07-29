'use client';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Badge from '@mui/material/Badge';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Popover from '@mui/material/Popover';
import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useResponsive } from 'src/hooks/use-responsive';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { touchTargetSx } from 'src/theme/spacing';
import { useGetNotifications } from 'src/api/notifications';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';

import Iconify from 'src/components/iconify';
import DeleteDialog from 'src/components/custom-dialog/delete-dialog';

import NotificationsPanel from './notifications-panel';

// ----------------------------------------------------------------------

export default function NotificationsBell() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslate();
  const { trackEvent } = useAnalytics();
  const isMobile = useResponsive('down', 'sm');

  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    notifications,
    unreadCount,
    notificationsLoading,
    markNotificationRead,
    markAllRead,
    deleteNotification,
    deleteAll,
    muteList,
  } = useGetNotifications();

  const handleOpen = (e) => {
    setAnchorEl(e.currentTarget);
    try {
      trackEvent('notification_open', { unread: unreadCount });
    } catch {
      /* analytics is best-effort */
    }
  };
  const handleClose = () => setAnchorEl(null);

  const handleConfirmDeleteAll = async () => {
    setDeleting(true);
    try {
      await deleteAll();
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleSeeAll = () => {
    handleClose();
    router.push(paths.dashboard.notifications);
  };

  const bell = (
    <IconButton
      onClick={handleOpen}
      aria-label={t('components.notifications.aria_bell')}
      sx={{ ...touchTargetSx, color: 'text.primary' }}
    >
      <Badge badgeContent={unreadCount > 9 ? '9+' : unreadCount} color="error" overlap="circular">
        <Iconify icon={ic.bellBold} width={24} />
      </Badge>
    </IconButton>
  );

  const header = (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ px: 2, py: 1.5 }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
        {t('components.notifications.title')}
      </Typography>
      <Stack direction="row" spacing={0.5}>
        <Tooltip title={t('components.notifications.mark_all_read')}>
          <span>
            <IconButton
              size="small"
              disabled={unreadCount === 0}
              aria-label={t('components.notifications.mark_all_read')}
              onClick={() => markAllRead()}
            >
              <Iconify icon={ic.checkReadBold} width={20} />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title={t('components.notifications.delete_all')}>
          <span>
            <IconButton
              size="small"
              disabled={notifications.length === 0}
              aria-label={t('components.notifications.delete_all')}
              onClick={() => setConfirmOpen(true)}
              sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}
            >
              <Iconify icon={ic.trashBold} width={20} />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Stack>
  );

  const body = (
    <Box
      aria-live="polite"
      sx={{ maxHeight: { xs: '70vh', sm: 420 }, overflowY: 'auto', minWidth: 0 }}
    >
      <NotificationsPanel
        notifications={notifications}
        loading={notificationsLoading}
        onMarkRead={markNotificationRead}
        onDelete={deleteNotification}
        onNavigate={handleClose}
        onMuteList={muteList}
      />
    </Box>
  );

  const footer = (
    <>
      <Divider />
      <Box sx={{ p: 1 }}>
        <Button fullWidth size="small" color="inherit" onClick={handleSeeAll}>
          {t('components.notifications.see_all')}
        </Button>
      </Box>
    </>
  );

  return (
    <>
      {bell}

      {isMobile ? (
        <Drawer
          anchor="bottom"
          open={open}
          onClose={handleClose}
          PaperProps={{
            sx: {
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              maxHeight: '85vh',
              pb: 'env(safe-area-inset-bottom, 0px)',
            },
          }}
        >
          {header}
          <Divider />
          {body}
          {footer}
        </Drawer>
      ) : (
        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          slotProps={{
            paper: {
              sx: {
                width: 380,
                maxWidth: 'calc(100vw - 24px)',
                mt: 1,
                boxShadow: theme.customShadows?.dropdown ?? theme.shadows[8],
              },
            },
          }}
        >
          {header}
          <Divider />
          {body}
          {footer}
        </Popover>
      )}

      <DeleteDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirmDeleteAll}
        isDeleting={deleting}
        title={t('components.notifications.delete_all')}
        confirmationMessage={t('components.notifications.delete_all_confirm')}
        confirmButtonText={t('components.notifications.delete_all')}
      />
    </>
  );
}
