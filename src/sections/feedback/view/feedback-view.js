'use client';

import { useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import * as ConfigGlobal from 'src/config-global';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';
import {
  openSleekplanWidget,
  getSleekplanFeedbackUrl,
} from 'src/libs/sleekplan/sleekplan-service';

import { HubNavRow } from 'src/sections/profile/view/settings-hub-view';
import SettingsDrillShell from 'src/sections/profile/view/settings-drill-shell';
import {
  hubCardShellSx,
  sectionLabelSx,
  dashboardSubsectionStackProps,
  dashboardPageSectionStackProps,
} from 'src/sections/profile/view/settings-shell-shared';

const feedbackActionsRowSx = {
  width: 1,
  '& .MuiButton-root': {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    px: { xs: 1, sm: 2 },
  },
};

// ----------------------------------------------------------------------

/**
 * Feedback — Sleekplan widget CTAs and help links; layout matches other settings drill pages.
 * Hosted portal embeds are blocked by Sleekplan X-Frame-Options: SAMEORIGIN.
 */
export default function FeedbackView() {
  const theme = useTheme();
  const { t } = useTranslate();
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    trackEvent('feedback_opened');
  }, [trackEvent]);

  const portalUrl = getSleekplanFeedbackUrl({
    productId: ConfigGlobal.SLEEKPLAN_API.productId,
  });

  const handleOpenBoard = () => {
    trackEvent('feedback_widget_opened', { view: 'feedback' });
    openSleekplanWidget('feedback');
  };

  const handleShareIdea = () => {
    trackEvent('feedback_widget_opened', { view: 'feedback.add' });
    openSleekplanWidget('feedback.add');
  };

  const helpLinks = (
    <Stack {...dashboardSubsectionStackProps}>
      <Typography component="h2" sx={sectionLabelSx(theme)}>
        {t('pages.dashboard.feedback.section_help')}
      </Typography>
      <Stack spacing={2}>
        <Box sx={hubCardShellSx(theme)}>
          <HubNavRow
            href={paths.dashboard.settingsFaqs}
            icon={ic.notebookBookmarkLinear}
            title={t('pages.faqs.title')}
            subtitle={t('pages.dashboard.settings.hub.row_faqs_subtitle')}
          />
        </Box>
        <Box sx={hubCardShellSx(theme)}>
          <HubNavRow
            href={paths.dashboard.settingsSupport}
            icon={ic.letterLinear}
            title={t('pages.dashboard.settings.hub.row_support')}
            subtitle={t('pages.dashboard.settings.hub.row_support_subtitle')}
          />
        </Box>
      </Stack>
    </Stack>
  );

  const embedSection = !ConfigGlobal.INTEGRATION_FLAGS.sleekplan ? null : (
    <Stack {...dashboardSubsectionStackProps}>
      <Typography component="h2" sx={sectionLabelSx(theme)}>
        {t('pages.dashboard.feedback.section_embed')}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.55, px: 0.5 }}>
        {t('pages.dashboard.feedback.description')}
      </Typography>
      <Box sx={{ ...hubCardShellSx(theme), p: 2 }}>
        <Stack direction="row" spacing={1} sx={feedbackActionsRowSx}>
          <Button variant="contained" color="inherit" onClick={handleShareIdea}>
            {t('pages.dashboard.feedback.actions.share_idea')}
          </Button>
          <Button variant="outlined" color="inherit" onClick={handleOpenBoard}>
            {t('pages.dashboard.feedback.actions.browse_board')}
          </Button>
          {portalUrl ? (
            <Button
              component="a"
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="text"
              color="inherit"
            >
              {t('pages.dashboard.feedback.actions.open_portal')}
            </Button>
          ) : null}
        </Stack>
      </Box>
    </Stack>
  );

  return (
    <SettingsDrillShell
      title={t('pages.dashboard.feedback.title')}
      backHref={paths.dashboard.settings}
      backAriaLabel={t('pages.dashboard.settings.back_to_hub')}
    >
      <Stack {...dashboardPageSectionStackProps}>
        {embedSection}
        {helpLinks}
      </Stack>
    </SettingsDrillShell>
  );
}
