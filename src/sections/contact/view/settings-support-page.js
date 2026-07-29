'use client';

import { paths } from 'src/routes/paths';

import { useTranslate } from 'src/locales';

import SettingsDrillShell from 'src/sections/profile/view/settings-drill-shell';

import ContactView from './contact-view';

// ----------------------------------------------------------------------

export default function SettingsSupportPage() {
  const { t } = useTranslate();

  return (
    <SettingsDrillShell
      title={t('pages.contact_us.title')}
      backHref={paths.dashboard.settings}
      backAriaLabel={t('pages.dashboard.settings.back_to_hub')}
    >
      <ContactView variant="settings" />
    </SettingsDrillShell>
  );
}
