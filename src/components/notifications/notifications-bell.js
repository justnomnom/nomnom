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
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useResponsive } from 'src/hooks/use-responsive';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { readableAccent } from 'src/theme/readable-accent';
import { useGetNotifications } from 'src/api/notifications';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';
import { RADIUS, touchTargetSx, TOUCH_TARGET_SIZE } from 'src/theme/spacing';

import Iconify from 'src/components/iconify';
import DeleteDialog from 'src/components/custom-dialog/delete-dialog';
import {
  SheetGrabBarRail,
  sheetDragHandleProps,
  mobileBottomSheetDrawerPaperSx,
  SwipeDismissBottomSheetContent,
} from 'src/components/sheet-shell';

import NotificationsPanel from './notifications-panel';

// ----------------------------------------------------------------------

const POPOVER_WIDTH = 400;

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
      <Badge
        badgeContent={unreadCount}
        max={9}
        color="primary"
        overlap="circular"
        sx={{ '& .MuiBadge-badge': { fontWeight: 700, boxShadow: `0 0 0 2px ${theme.palette.background.paper}` } }}
      >
        <Iconify icon={ic.bellBold} width={24} />
      </Badge>
    </IconButton>
  );

  const header = (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      gap={1}
      sx={{ px: 2, py: 1.25, minHeight: TOUCH_TARGET_SIZE + 8 }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 800, lineHeight: 1.3 }}>
          {t('components.notifications.title')}
        </Typography>
        {unreadCount > 0 && (
          <Typography variant="caption" sx={{ color: readableAccent(theme), fontWeight: 700 }}>
            {t('components.notifications.unread_count', { count: unreadCount })}
          </Typography>
        )}
      </Box>
      <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
        <Tooltip title={t('components.notifications.mark_all_read')}>
          <span>
            <IconButton
              size="small"
              disabled={unreadCount === 0}
              aria-label={t('components.notifications.mark_all_read')}
              onClick={() => markAllRead()}
              sx={touchTargetSx}
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
              sx={{ ...touchTargetSx, color: 'text.secondary', '&:hover': { color: 'error.main' } }}
            >
              <Iconify icon={ic.trashBold} width={20} />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
    </Stack>
  );

  const panel = (
    <NotificationsPanel
      notifications={notifications}
      loading={notificationsLoading}
      /** Peek surface: per-list filtering belongs on the full history page. */
      showListFilter={false}
      onMarkRead={markNotificationRead}
      onDelete={deleteNotification}
      onNavigate={handleClose}
      onMuteList={muteList}
    />
  );

  const seeAll = (
    <Button
      fullWidth
      color="inherit"
      onClick={handleSeeAll}
      endIcon={<Iconify icon={ic.chevronRightLinear} width={16} />}
      sx={{ fontWeight: 700, py: 1, minHeight: TOUCH_TARGET_SIZE }}
    >
      {t('components.notifications.see_all')}
    </Button>
  );

  return (
    <>
      {bell}

      {isMobile ? (
        <Drawer
          anchor="bottom"
          open={open}
          onClose={handleClose}
          PaperProps={{ sx: mobileBottomSheetDrawerPaperSx }}
        >
          <SwipeDismissBottomSheetContent
            onClose={handleClose}
            chrome={
              <>
                <Box {...sheetDragHandleProps()}>
                  <SheetGrabBarRail />
                </Box>
                {header}
                <Divider />
              </>
            }
          >
            <Box aria-live="polite">{panel}</Box>
            <Divider sx={{ mt: 0.5 }} />
            <Box sx={{ p: 1 }}>{seeAll}</Box>
          </SwipeDismissBottomSheetContent>
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
                width: POPOVER_WIDTH,
                maxWidth: 'calc(100vw - 24px)',
                mt: 1,
                overflow: 'hidden',
                borderRadius: `${RADIUS.loose}px`,
                border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                boxShadow: theme.customShadows?.dropdown ?? theme.shadows[8],
              },
            },
          }}
        >
          {header}
          <Divider />
          <Box aria-live="polite" sx={{ maxHeight: 440, overflowY: 'auto' }}>
            {panel}
          </Box>
          <Divider />
          <Box sx={{ p: 1 }}>{seeAll}</Box>
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
