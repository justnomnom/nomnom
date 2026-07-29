'use client';

import { paths } from 'src/routes/paths';

import { useTranslate } from 'src/locales';

import SettingsDrillShell from 'src/sections/profile/view/settings-drill-shell';

import FaqsView from './faqs-view';

// ----------------------------------------------------------------------

export default function SettingsFaqsPage() {
  const { t } = useTranslate();

  return (
    <SettingsDrillShell
      title={t('pages.faqs.title')}
      backHref={paths.dashboard.settings}
      backAriaLabel={t('pages.dashboard.settings.back_to_hub')}
    >
      <FaqsView variant="settings" />
    </SettingsDrillShell>
  );
}
