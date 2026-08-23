'use client';

import PropTypes from 'prop-types';
import { useState, useCallback } from 'react';

import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import { alpha, useTheme } from '@mui/material/styles';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { RADIUS, TOUCH_TARGET_SIZE } from 'src/theme/spacing';

import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

/**
 * Per-row overflow menu for a notification (mark read / mute list / delete).
 *
 * A row can carry up to three actions; as inline icon buttons they crowd the
 * sentence on mobile, so they collapse into one 44px control with labelled
 * items. The trigger fades in on hover/focus on pointer devices and stays
 * visible on touch (see `notificationRowActionRevealSx`).
 */
export default function NotificationRowMenu({ isUnread, onMarkRead, onMute, onDelete }) {
  const theme = useTheme();
  const { t } = useTranslate();
  const [anchorEl, setAnchorEl] = useState(/** @type {HTMLElement | null} */ (null));
  const open = Boolean(anchorEl);

  const handleOpen = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  }, []);

  const handleClose = useCallback((e) => {
    e?.stopPropagation?.();
    setAnchorEl(null);
  }, []);

  const runAction = useCallback(
    (action) => (e) => {
      e.preventDefault();
      e.stopPropagation();
      setAnchorEl(null);
      action?.();
    },
    []
  );

  const items = [
    isUnread && onMarkRead
      ? {
          key: 'read',
          icon: ic.checkReadBold,
          label: t('components.notifications.mark_read'),
          onSelect: onMarkRead,
        }
      : null,
    onMute
      ? {
          key: 'mute',
          icon: ic.bellOffLinear,
          label: t('components.notifications.mute_list'),
          onSelect: onMute,
        }
      : null,
    onDelete
      ? {
          key: 'delete',
          icon: ic.trashLinear,
          label: t('components.notifications.delete'),
          onSelect: onDelete,
          danger: true,
        }
      : null,
  ].filter(Boolean);

  if (items.length === 0) return null;

  return (
    <>
      <IconButton
        onClick={handleOpen}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('components.notifications.row_actions')}
        className="notification-row-menu-button"
        sx={{
          width: TOUCH_TARGET_SIZE,
          height: TOUCH_TARGET_SIZE,
          color: 'text.secondary',
          flexShrink: 0,
          '&:hover': { color: 'text.primary' },
        }}
      >
        <Iconify icon={ic.moreHorizontalFill} width={20} />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          list: { dense: true, 'aria-label': t('components.notifications.row_actions') },
          paper: {
            sx: {
              mt: 0.5,
              minWidth: 208,
              borderRadius: `${RADIUS.loose}px`,
              boxShadow: theme.customShadows.dropdown,
            },
          },
        }}
      >
        {items.map((item) => (
          <MenuItem
            key={item.key}
            onClick={runAction(item.onSelect)}
            sx={{
              mx: 0.5,
              my: 0.15,
              py: 0.75,
              borderRadius: `${RADIUS.base}px`,
              ...(item.danger && {
                color: 'error.main',
                '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.08) },
              }),
            }}
          >
            <ListItemIcon sx={{ color: 'inherit' }}>
              <Iconify icon={item.icon} width={18} />
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: 600 }}>
              {item.label}
            </ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

NotificationRowMenu.propTypes = {
  isUnread: PropTypes.bool,
  onMarkRead: PropTypes.func,
  onMute: PropTypes.func,
  onDelete: PropTypes.func,
};
