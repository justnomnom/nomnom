'use client';

import PropTypes from 'prop-types';
import { useState, useCallback } from 'react';

import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useShareLink } from 'src/hooks/use-share-link';

import { ic } from 'src/assets/icons';
import { NAV } from 'src/config-global';
import { useTranslate } from 'src/locales';

import Iconify from 'src/components/iconify';
import ShareFeedbackSnackbar from 'src/components/share/share-feedback-snackbar';

import {
  SettingsDrillShell,
  SHELL_TOOLBAR_ICON,
  minimalIconButtonSx,
} from 'src/sections/profile/view';

import UserPublicProfileView from './user-public-profile-view';

// ----------------------------------------------------------------------

/** Logged-in shell: creator-profile style toolbar, body below. */
export default function UserPublicProfileDashboardShell({
  profile,
  lists,
  recentActivity = [],
  viewerUserId = null,
  initialFollowing = false,
}) {
  const theme = useTheme();
  const { t } = useTranslate();
  const [menuAnchor, setMenuAnchor] = useState(null);

  const handle = profile?.username ? `@${profile.username}` : '';
  /** Display name for native share only — not shown in the compact top bar. */
  const shareTitle = profile?.display_name?.trim() || handle || t('pages.dashboard.settings.title');
  /** Compact bar has no centered label; keep prop for SettingsDrillShell API. */
  const shellToolbarTitle = '';
  const isOwnProfile = Boolean(viewerUserId && profile?.id && viewerUserId === profile.id);
  const tIcon = minimalIconButtonSx(theme);

  const {
    share: shareLink,
    copyLink,
    feedback: shareFeedback,
    dismissFeedback: dismissShareFeedback,
  } = useShareLink({
    copiedKey: 'pages.lists.creator_share_copied',
    failedKey: 'pages.lists.creator_share_failed',
  });

  const handleShare = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    await shareLink({ url, title: shareTitle || handle });
  }, [shareLink, handle, shareTitle]);

  const handleCopyLink = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    setMenuAnchor(null);
    await copyLink(url);
  }, [copyLink]);

  const endAdornment = isOwnProfile ? (
    <IconButton
      component={RouterLink}
      href={paths.dashboard.settings}
      aria-label={t('pages.lists.creator_settings_aria')}
      sx={tIcon}
    >
      <Iconify icon={ic.settingsLinear} width={SHELL_TOOLBAR_ICON} />
    </IconButton>
  ) : (
    <>
      <IconButton onClick={handleShare} aria-label={t('pages.lists.creator_share_aria')} sx={tIcon}>
        <Iconify icon={ic.shareLinear} width={SHELL_TOOLBAR_ICON} />
      </IconButton>
      <IconButton
        onClick={(e) => setMenuAnchor(e.currentTarget)}
        aria-label={t('pages.lists.creator_more_aria')}
        sx={tIcon}
      >
        <Iconify icon={ic.menuDotsBold} width={SHELL_TOOLBAR_ICON} />
      </IconButton>
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={handleCopyLink}>{t('pages.lists.creator_copy_profile_link')}</MenuItem>
      </Menu>
    </>
  );

  return (
    <SettingsDrillShell
      title={shellToolbarTitle}
      compactToolbar
      useHistoryBack
      endAdornment={endAdornment}
      backAriaLabel={t('common.a11y.back')}
    >
      <UserPublicProfileView
        profile={profile}
        lists={lists}
        recentActivity={recentActivity}
        layout="dashboard"
        viewerUserId={viewerUserId}
        initialFollowing={initialFollowing}
      />
      <ShareFeedbackSnackbar
        feedback={shareFeedback}
        onClose={dismissShareFeedback}
        /* Clear the fixed mobile bottom nav. */
        sx={{ bottom: { xs: NAV.H_MOBILE_BOTTOM + 16, md: 24 } }}
      />
    </SettingsDrillShell>
  );
}

UserPublicProfileDashboardShell.propTypes = {
  profile: PropTypes.object.isRequired,
  lists: PropTypes.array,
  recentActivity: PropTypes.array,
  viewerUserId: PropTypes.string,
  initialFollowing: PropTypes.bool,
};
