'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { ic } from 'src/assets/icons';

import Iconify from 'src/components/iconify';

import {
  ICON_TILE,
  SHELL_HUB_ICON,
  hubCardShellSx,
  settingsShellRowHoverBg,
} from './view/settings-shell-shared';

/**
 * Shared row shell for settings list pages (subscribers, my-subscriptions, followers, following).
 *
 * Use one of two trailing modes:
 *   - Pass `username` → wrapper becomes a RouterLink to that user's public profile, with chevron.
 *   - Pass `trailingAction` → wrapper stays static; the action (e.g., cancel IconButton) sits on the right.
 *
 * Both modes share the avatar + title + chips + subtitle layout.
 */
export default function ProfileListItemRow({
  avatarSrc,
  avatarFallback,
  title,
  chips,
  subtitle,
  username,
  trailingAction,
}) {
  const theme = useTheme();
  const rowHoverBg = settingsShellRowHoverBg(theme);
  const isLink = Boolean(username);

  return (
    <Box
      component={isLink ? RouterLink : Box}
      href={isLink ? paths.dashboard.userPublic(username) : undefined}
      sx={{
        ...hubCardShellSx(theme),
        px: 2,
        py: 1.75,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        ...(isLink && { textDecoration: 'none', color: 'inherit' }),
        transition: theme.transitions.create('background-color', {
          duration: theme.transitions.duration.shorter,
        }),
        '&:hover': { bgcolor: rowHoverBg },
      }}
    >
      <Avatar
        src={avatarSrc || undefined}
        alt=""
        sx={{ width: ICON_TILE, height: ICON_TILE, flexShrink: 0 }}
      >
        {avatarFallback}
      </Avatar>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap" sx={{ mb: 0.25 }}>
          <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
            {title}
          </Typography>
          {chips}
        </Stack>
        {subtitle && (
          <Typography variant="caption" color="text.secondary" display="block">
            {subtitle}
          </Typography>
        )}
      </Box>
      {isLink ? (
        <Iconify
          icon={ic.chevronRightLinear}
          width={SHELL_HUB_ICON}
          sx={{ color: 'text.secondary', flexShrink: 0 }}
        />
      ) : (
        trailingAction
      )}
    </Box>
  );
}

ProfileListItemRow.propTypes = {
  avatarSrc: PropTypes.string,
  avatarFallback: PropTypes.node,
  title: PropTypes.node.isRequired,
  chips: PropTypes.node,
  subtitle: PropTypes.node,
  username: PropTypes.string,
  trailingAction: PropTypes.node,
};
