'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { useLocales } from 'src/locales';
import { APP, APP_SUPPORT_EMAIL } from 'src/config-global';
import { getLocaleBodyMaxWidthCh } from 'src/theme/locale-prose';

import {
  marketingLegalHeaderBandSx,
  dashboardSubsectionStackProps,
} from 'src/sections/profile/view/settings-shell-shared';

// ----------------------------------------------------------------------

const LAST_UPDATED = 'April 2026';
const CONTACT_EMAIL = APP_SUPPORT_EMAIL;

export default function PrivacyView() {
  const theme = useTheme();
  const { currentLang } = useLocales();
  const bodyMaxWidth = getLocaleBodyMaxWidthCh(currentLang?.value);

  return (
    <Container
      maxWidth="md"
      sx={{
        pt: { xs: 6, md: 10 },
        pb: { xs: 8, md: 12 },
        px: { xs: 3, sm: 4 },
      }}
    >
      <Stack {...dashboardSubsectionStackProps} sx={marketingLegalHeaderBandSx}>
        <Typography
          variant="overline"
          sx={{
            color: 'primary.main',
            fontWeight: 700,
            letterSpacing: '0.1em',
            display: 'block',
          }}
        >
          Legal
        </Typography>
        <Typography variant="h2" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
          Privacy Policy
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Last updated: {LAST_UPDATED}
        </Typography>
      </Stack>

      <Box
        sx={{
          '& h2': {
            ...theme.typography.h5,
            fontWeight: 700,
            mt: 5,
            mb: 1.5,
            color: 'text.primary',
          },
          '& h3': {
            ...theme.typography.subtitle1,
            fontWeight: 700,
            mt: 3,
            mb: 1,
            color: 'text.primary',
          },
          '& p': {
            ...theme.typography.body1,
            color: 'text.secondary',
            mb: 2,
            lineHeight: 1.75,
            maxWidth: bodyMaxWidth,
          },
          '& ul': {
            pl: 3,
            mb: 2,
          },
          '& li': {
            ...theme.typography.body1,
            color: 'text.secondary',
            mb: 0.75,
            lineHeight: 1.7,
          },
          '& a': {
            color: 'primary.main',
            textDecoration: 'none',
            '&:hover': { textDecoration: 'underline' },
          },
        }}
      >
        <Box
          sx={{
            p: 2.5,
            mb: 4,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.06),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.14)}`,
          }}
        >
          <Typography
            variant="body2"
            sx={{ color: 'text.primary', fontWeight: 600, lineHeight: 1.65 }}
          >
            NomNom (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting
            your privacy. This policy explains what data we collect, why we collect it, and how we
            use and protect it when you use our app and website.
          </Typography>
        </Box>

        <h2>1. Who we are</h2>
        <p>
          NomNom is a restaurant discovery platform that surfaces picks from creators and locals you
          trust. We are incorporated in Portugal and operate the service at {APP.domain}.
        </p>
        <p>
          For questions about this policy, contact us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <h2>2. Information we collect</h2>

        <h3>Account information</h3>
        <ul>
          <li>Email address (required for sign-up)</li>
          <li>Display name and @handle (chosen by you)</li>
          <li>Profile photo (optional, uploaded by you)</li>
          <li>Short bio and social links (optional)</li>
        </ul>

        <h3>Preferences and activity</h3>
        <ul>
          <li>Cuisine, vibe, and dietary preferences you set during onboarding or in settings</li>
          <li>Restaurants you save, the lists you create, and reviews you write</li>
          <li>People you follow</li>
          <li>Natural-language search queries you enter in the AI search bar</li>
        </ul>

        <h3>Location</h3>
        <ul>
          <li>
            City or municipality you select when browsing Discover or the Map — we do not store your
            precise GPS coordinates
          </li>
          <li>
            If you grant location permission in the Map view, your device coordinates are used
            in-session only to center the map; they are not stored on our servers
          </li>
        </ul>

        <h3>Device and usage data</h3>
        <ul>
          <li>App version, device type (iOS / Android / web), and general usage analytics</li>
          <li>Crash reports and performance data to improve the app</li>
        </ul>

        <h3>Payments (subscribers only)</h3>
        <ul>
          <li>
            Billing is handled by Stripe. We store your Stripe customer ID but never hold your full
            card number, expiry, or CVV.
          </li>
        </ul>

        <h2>3. How we use your information</h2>
        <ul>
          <li>To create and maintain your account</li>
          <li>To personalise restaurant recommendations and filter results to your preferences</li>
          <li>To process payments and manage subscriptions</li>
          <li>To let you create and share NomNom lists</li>
          <li>To send transactional emails (account confirmation, password reset)</li>
          <li>To improve the product through aggregated analytics</li>
        </ul>
        <p>
          We do not sell your personal data to third parties. We do not use your data for cross-app
          tracking.
        </p>

        <h2>4. Third-party services</h2>
        <p>We share data with trusted providers only as needed to operate the service:</p>
        <ul>
          <li>
            <strong>Supabase</strong> — database, authentication, and file storage (EU region)
          </li>
          <li>
            <strong>Mapbox</strong> — map tiles and geocoding (no personal data shared beyond map
            viewport)
          </li>
          <li>
            <strong>Stripe</strong> — payment processing
          </li>
          <li>
            <strong>Anthropic / OpenAI / Google</strong> — AI-powered search (queries are sent to
            generate results; not stored for model training)
          </li>
          <li>
            <strong>Vercel</strong> — hosting and edge delivery
          </li>
        </ul>

        <h2>5. Data storage and security</h2>
        <p>
          Your data is stored in Supabase (EU region). We use row-level security and encrypted
          connections. Profile photos are stored in Supabase Storage. We retain your data for as
          long as your account is active. You may request deletion at any time.
        </p>

        <h2>6. Your rights</h2>
        <p>
          Under GDPR and similar regulations, you have the right to access, correct, or delete your
          personal data. You can edit your profile directly in the app. To request full account
          deletion or a data export, go to <strong>Settings → Delete Account</strong> or contact us
          at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <h2>7. Children</h2>
        <p>
          NomNom is not directed at children under 13 (or 16 in the EU). We do not knowingly collect
          personal data from children. If you believe a child has provided us data, please contact
          us and we will delete it promptly.
        </p>

        <h2>8. Changes to this policy</h2>
        <p>
          We may update this policy from time to time. When we do, we will update the &quot;Last
          updated&quot; date at the top and, where changes are material, notify you in-app or by
          email.
        </p>

        <h2>9. Contact</h2>
        <p>
          Questions? Reach us at <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </Box>
    </Container>
  );
}
