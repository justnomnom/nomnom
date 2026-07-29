'use client';

import { useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import * as ConfigGlobal from 'src/config-global';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';
import { getSleekplanFeedbackUrl } from 'src/libs/sleekplan/sleekplan-service';

import { HubNavRow } from 'src/sections/profile/view/settings-hub-view';
import SettingsDrillShell from 'src/sections/profile/view/settings-drill-shell';
import {
  hubCardShellSx,
  sectionLabelSx,
  dashboardSubsectionStackProps,
  dashboardPageSectionStackProps,
} from 'src/sections/profile/view/settings-shell-shared';

// ----------------------------------------------------------------------

/**
 * Feedback — Sleekplan iframe and links; layout matches other settings drill pages.
 */
export default function FeedbackView() {
  const theme = useTheme();
  const { t } = useTranslate();
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    trackEvent('feedback_opened');
  }, [trackEvent]);

  const getFeedbackUrl = () =>
    getSleekplanFeedbackUrl({ productId: ConfigGlobal.SLEEKPLAN_API.productId });

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
      <Box sx={hubCardShellSx(theme)}>
        <Box
          sx={{
            width: '100%',
            height: { xs: 'min(72vh, 800px)', md: 720 },
            overflow: 'hidden',
          }}
        >
          <iframe
            src={getFeedbackUrl()}
            width="100%"
            height="100%"
            style={{
              border: 'none',
              display: 'block',
              minHeight: 480,
            }}
            title={t('pages.dashboard.feedback.reportBug.iframeTitle')}
            loading="lazy"
          />
        </Box>
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
