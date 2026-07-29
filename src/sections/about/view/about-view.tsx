'use client';

import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useTranslate } from 'src/locales';

import { RelatedLinksSection } from '@/components/content-platform/sections/related-links';
import { ContentPageShell } from '@/components/content-platform/sections/content-page-shell';

// ----------------------------------------------------------------------

export default function AboutView() {
  const { t } = useTranslate();

  return (
    <ContentPageShell
      markdownBody={false}
      title={t('pages.about.title')}
      description={t('pages.about.description')}
      breadcrumbs={[
        { name: t('pages.about.breadcrumb_home'), href: '/' },
        { name: t('pages.about.breadcrumb_about'), href: '/about' },
      ]}
    >
      <Stack spacing={2} component="article">
        <Typography variant="body1" component="p">
          {t('pages.about.body_1_prefix')}
          <Typography component="span" fontWeight="fontWeightBold">
            {t('pages.about.body_1_emphasis')}
          </Typography>
          {t('pages.about.body_1_suffix')}
        </Typography>

        <Typography variant="body1" component="p">
          {t('pages.about.body_2_prefix')}
          <Typography component="span" fontWeight="fontWeightBold">
            {t('pages.about.body_2_roulette')}
          </Typography>
          {t('pages.about.body_2_suffix')}
        </Typography>
      </Stack>

      <RelatedLinksSection
        title={t('pages.about.explore')}
        links={[
          { href: '/auth/register', label: t('pages.about.link_create_account') },
          { href: '/faqs', label: t('pages.about.link_faqs') },
          { href: '/countries/portugal', label: t('pages.about.link_portugal') },
        ]}
      />
    </ContentPageShell>
  );
}
