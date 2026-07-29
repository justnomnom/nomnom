'use client';

import NextLink from 'next/link';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

import { useTranslate } from 'src/locales';

import { RelatedLinksSection } from '@/components/content-platform/sections/related-links';
import { ContentPageShell } from '@/components/content-platform/sections/content-page-shell';
import { contentInlineLinkClassName } from 'src/components/content-platform/ui/content-inline-link-classname';
import { grey, marketing, primary } from 'src/theme/palette';

import { DASHBOARD_SPACE_SECTION } from 'src/sections/profile/view/settings-shell-shared';

// ----------------------------------------------------------------------

export default function PricingView() {
  const { t } = useTranslate();

  return (
    <ContentPageShell
      markdownBody={false}
      title={t('pages.pricing.title')}
      description={t('pages.pricing.description')}
      breadcrumbs={[
        { name: t('pages.pricing.breadcrumb_home'), href: '/' },
        { name: t('pages.pricing.breadcrumb_pricing'), href: '/pricing' },
      ]}
    >
      <Box component="section" className="not-prose">
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            mb: DASHBOARD_SPACE_SECTION,
            borderRadius: 2,
            bgcolor: alpha(marketing.parchment, 0.5),
            'html[data-theme="dark"] &': { bgcolor: grey[800] },
          }}
        >
          <Typography variant="h6" component="h2">
            {t('pages.pricing.free_title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t('pages.pricing.free_body')}
          </Typography>
          <Box component="ul" sx={{ mt: 2, pl: 2.5, mb: 0, color: 'text.secondary' }}>
            <Typography component="li" variant="body2" sx={{ mb: 0.75 }}>
              {t('pages.pricing.free_item_browse')}
            </Typography>
            <Typography component="li" variant="body2">
              {t('pages.pricing.free_item_features')}
            </Typography>
          </Box>
        </Paper>

        <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
          {t('pages.pricing.paid_title')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('pages.pricing.paid_body')}
        </Typography>

        <Grid container spacing={DASHBOARD_SPACE_SECTION}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                height: 1,
                borderRadius: 2,
                bgcolor: alpha(marketing.parchment, 0.5),
                'html[data-theme="dark"] &': { bgcolor: grey[800] },
              }}
            >
              <Typography variant="overline" color="text.secondary">
                {t('pages.pricing.snapshot_overline')}
              </Typography>
              <Typography variant="h6" component="h3" sx={{ mt: 0.5 }}>
                {t('pages.pricing.snapshot_title')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {t('pages.pricing.snapshot_body')}
              </Typography>
              <Box component="ul" sx={{ mt: 2, pl: 2.5, mb: 0, color: 'text.secondary' }}>
                <Typography component="li" variant="body2" sx={{ mb: 0.75 }}>
                  {t('pages.pricing.snapshot_item_access')}
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.75 }}>
                  {t('pages.pricing.snapshot_item_no_updates')}
                </Typography>
                <Typography component="li" variant="body2">
                  {t('pages.pricing.snapshot_item_nonrefundable')}
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                height: 1,
                borderRadius: 2,
                borderColor: alpha(primary.main, 0.35),
                bgcolor: alpha(primary.main, 0.07),
                'html[data-theme="dark"] &': {
                  borderColor: alpha(primary.main, 0.45),
                  bgcolor: alpha(primary.main, 0.1),
                },
              }}
            >
              <Typography variant="overline" color="text.secondary">
                {t('pages.pricing.subscription_overline')}
              </Typography>
              <Typography variant="h6" component="h3" sx={{ mt: 0.5 }}>
                {t('pages.pricing.subscription_title')}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {t('pages.pricing.subscription_body')}
              </Typography>
              <Box component="ul" sx={{ mt: 2, pl: 2.5, mb: 0, color: 'text.secondary' }}>
                <Typography component="li" variant="body2" sx={{ mb: 0.75 }}>
                  {t('pages.pricing.subscription_item_all_lists')}
                </Typography>
                <Typography component="li" variant="body2" sx={{ mb: 0.75 }}>
                  {t('pages.pricing.subscription_item_email')}
                </Typography>
                <Typography component="li" variant="body2">
                  {t('pages.pricing.subscription_item_cancel')}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        <Paper
          variant="outlined"
          sx={{
            p: 3,
            mt: DASHBOARD_SPACE_SECTION,
            borderRadius: 2,
            bgcolor: alpha(marketing.parchment, 0.5),
            'html[data-theme="dark"] &': { bgcolor: grey[800] },
          }}
        >
          <Typography variant="h6" component="h2">
            {t('pages.pricing.creators_title')}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {t('pages.pricing.creators_body_prefix')}
            <strong>{t('pages.pricing.creators_body_billing_path')}</strong>
            {t('pages.pricing.creators_body_suffix')}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            {t('pages.pricing.creators_caption')}
          </Typography>
        </Paper>
      </Box>

      <Typography variant="body1" component="p">
        {t('pages.pricing.questions_lead')}
        <NextLink href="/faqs" className={contentInlineLinkClassName}>
          {t('pages.pricing.questions_read_faqs')}
        </NextLink>
        {t('pages.pricing.questions_or')}
        <NextLink href="/contact-us" className={contentInlineLinkClassName}>
          {t('pages.pricing.questions_contact')}
        </NextLink>
        .
      </Typography>

      <RelatedLinksSection
        title={t('pages.pricing.get_started')}
        links={[
          { href: '/auth/register', label: t('pages.pricing.link_create_account') },
          { href: '/use-cases', label: t('pages.pricing.link_use_cases') },
          { href: '/faqs', label: t('pages.pricing.link_faqs') },
        ]}
      />
    </ContentPageShell>
  );
}
