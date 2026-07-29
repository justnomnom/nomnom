'use client';

import PropTypes from 'prop-types';
import { useCallback } from 'react';

import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';

import { paths } from 'src/routes/paths';
import { RouterLink, NAV_FORWARD_TRANSITION_TYPES } from 'src/routes/components';

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

import ListPublicView from './list-public-view';

// ----------------------------------------------------------------------

/** Public list content inside the signed-in dashboard shell (e.g. `/dashboard/lists/:id`). */
export default function DashboardListPublicView({
  listId,
  list,
  items,
  owner,
  error,
  membership,
  paidAccess,
}) {
  const theme = useTheme();
  const { t } = useTranslate();
  const tIcon = minimalIconButtonSx(theme);

  const canOpenListManage = membership?.isOwner || membership?.isEditor || membership?.isMember;

  const {
    share: shareLink,
    feedback: shareFeedback,
    dismissFeedback: dismissShareFeedback,
  } = useShareLink();

  const handleShare = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    await shareLink({ url, title: list?.name ?? '' });
  }, [shareLink, list?.name]);

  const endAdornment = (
    <>
      <IconButton
        onClick={handleShare}
        aria-label={t('pages.dashboard.restaurant.share_aria')}
        sx={tIcon}
      >
        <Iconify icon={ic.shareLinear} width={SHELL_TOOLBAR_ICON} />
      </IconButton>
      {canOpenListManage ? (
        <IconButton
          component={RouterLink}
          href={paths.dashboard.listManage(listId)}
          transitionTypes={NAV_FORWARD_TRANSITION_TYPES}
          aria-label={t('pages.lists.manage_list')}
          sx={tIcon}
        >
          <Iconify icon={ic.settingsLinear} width={SHELL_TOOLBAR_ICON} />
        </IconButton>
      ) : null}
    </>
  );

  return (
    <SettingsDrillShell
      title={list?.name ?? ''}
      compactToolbar
      fillMain
      useHistoryBack
      backAriaLabel={t('common.a11y.back')}
      endAdornment={endAdornment}
    >
      <ListPublicView
        variant="dashboard"
        listId={listId}
        list={list}
        items={items}
        owner={owner}
        error={error}
        membership={membership}
        paidAccess={paidAccess}
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

DashboardListPublicView.propTypes = {
  listId: PropTypes.string.isRequired,
  list: PropTypes.object,
  items: PropTypes.array,
  owner: PropTypes.object,
  error: PropTypes.string,
  membership: PropTypes.object,
  paidAccess: PropTypes.object,
};
