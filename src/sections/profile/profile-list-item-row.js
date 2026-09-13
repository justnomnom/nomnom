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
 * Trailing modes:
 *   - `username` only → whole row is a RouterLink to that profile, with a chevron.
 *   - `trailingAction` only → static row; the action sits on the right.
 *   - both → avatar + name link to the profile; `trailingAction` stays a sibling (not nested in the link).
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
  const profileHref = username ? paths.dashboard.userPublic(username) : undefined;
  const isRowLink = Boolean(profileHref) && !trailingAction;
  const isIdentityLink = Boolean(profileHref) && Boolean(trailingAction);

  const identity = (
    <>
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
        {subtitle ? (
          <Typography variant="caption" color="text.secondary" display="block">
            {subtitle}
          </Typography>
        ) : null}
      </Box>
    </>
  );

  return (
    <Box
      component={isRowLink ? RouterLink : Box}
      href={isRowLink ? profileHref : undefined}
      sx={{
        ...hubCardShellSx(theme),
        px: 2,
        py: 1.75,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        ...(isRowLink && { textDecoration: 'none', color: 'inherit' }),
        transition: theme.transitions.create('background-color', {
          duration: theme.transitions.duration.shorter,
        }),
        '&:hover': { bgcolor: rowHoverBg },
      }}
    >
      {isIdentityLink ? (
        <Box
          component={RouterLink}
          href={profileHref}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            minWidth: 0,
            flex: 1,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          {identity}
        </Box>
      ) : (
        identity
      )}
      {isRowLink ? (
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
