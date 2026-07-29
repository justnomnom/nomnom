/* eslint-disable perfectionist/sort-imports */
import 'src/global.css';

// i18n
import 'src/locales/i18n';

import PropTypes from 'prop-types';
import Script from 'next/script';
import { cookies } from 'next/headers';

// ----------------------------------------------------------------------

import { LocalizationProvider } from 'src/locales';
import { UI_LOCALE_COOKIE, htmlLangFromUiLocaleCookie } from 'src/libs/ui-locale';

import ThemeProvider from 'src/theme';
import { primaryFont } from 'src/theme/typography';

import ProgressBar from 'src/components/progress-bar';
import { MotionLazy } from 'src/components/animate/motion-lazy';
import { SettingsProvider } from 'src/components/settings';

import { AuthProvider } from 'src/auth/context/supabase/auth-provider';
import SentryErrorBoundary from 'src/components/error-boundary/sentry-error-boundary';
import { SleekplanProvider } from 'src/components/sleekplan/sleekplan-provider';
import { PostHogProvider } from 'src/libs/posthog/posthog-provider';

import { GTM_API, APP_METADATA, APP_VIEWPORT, DEFAULT_APP_SETTINGS } from 'src/config-global';
import { AnalyticsProvider } from 'src/libs/analytics/analytics-provider';
import VercelAnalyticsLazy from 'src/components/vercel-analytics-lazy';
import GoogleTagManagerLazyClient from 'src/components/google-tag-manager-lazy';
import { CapacitorInit } from 'src/components/capacitor/capacitor-init';
import { IOSKeyboardInset } from 'src/components/capacitor/ios-keyboard-inset';
import PWAInstallPrompt from 'src/components/pwa-install-prompt';
import { getSiteUrl } from 'src/content-platform/site-url.ts';
import {
  parseThemeCookie,
  THEME_COOKIE_NAME,
  themeDatasetBootstrapScript,
} from 'src/libs/theme-cookie';

// ----------------------------------------------------------------------

export const viewport = APP_VIEWPORT;

export const metadata = {
  ...APP_METADATA,
  metadataBase: new URL(getSiteUrl()),
};

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const htmlLang = htmlLangFromUiLocaleCookie(cookieStore.get(UI_LOCALE_COOKIE)?.value);
  const initialTheme = parseThemeCookie(cookieStore.get(THEME_COOKIE_NAME)?.value);

  return (
    <html
      lang={htmlLang}
      className={primaryFont.className}
      data-theme={initialTheme}
      style={{ colorScheme: initialTheme }}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <Script
          id="jn-theme-dataset"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeDatasetBootstrapScript }}
        />
        {GTM_API.enabled && GTM_API.id && <GoogleTagManagerLazyClient gtmId={GTM_API.id} />}
        <PostHogProvider>
          <CapacitorInit />
          <IOSKeyboardInset />
          <AnalyticsProvider>
            <AuthProvider>
              <SleekplanProvider>
                <LocalizationProvider>
                  <SettingsProvider defaultSettings={DEFAULT_APP_SETTINGS}>
                    <ThemeProvider>
                      {/* MotionLazy must stay mounted when the boundary shows its
                          fallback — Error500View animates with m.* components that
                          stay invisible without a LazyMotion provider. */}
                      <MotionLazy>
                        <SentryErrorBoundary>
                          <ProgressBar />
                          {children}
                          <PWAInstallPrompt />
                          <VercelAnalyticsLazy />
                        </SentryErrorBoundary>
                      </MotionLazy>
                    </ThemeProvider>
                  </SettingsProvider>
                </LocalizationProvider>
              </SleekplanProvider>
            </AuthProvider>
          </AnalyticsProvider>
        </PostHogProvider>
      </body>
    </html>
  );
}

RootLayout.propTypes = {
  children: PropTypes.node,
};
