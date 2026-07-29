'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { useLocales } from 'src/locales';
import { APP_SUPPORT_EMAIL } from 'src/config-global';
import { getLocaleBodyMaxWidthCh } from 'src/theme/locale-prose';

import {
  marketingLegalHeaderBandSx,
  dashboardSubsectionStackProps,
} from 'src/sections/profile/view/settings-shell-shared';

// ----------------------------------------------------------------------

const LAST_UPDATED = 'April 2026';
const CONTACT_EMAIL = APP_SUPPORT_EMAIL;

export default function TermsView() {
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
          Terms of Service
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
            By creating an account or using NomNom, you agree to these Terms of Service. Please read
            them — they&apos;re written in plain language on purpose.
          </Typography>
        </Box>

        <h2>1. What NomNom is</h2>
        <p>
          NomNom is a restaurant discovery service. We help you find great places to eat based on
          recommendations from creators and locals you follow. We operate the website and mobile
          apps under the brand NomNom.
        </p>

        <h2>2. Your account</h2>
        <ul>
          <li>You must be at least 13 years old to use NomNom (16 in the EU).</li>
          <li>You are responsible for keeping your login credentials secure.</li>
          <li>
            One account per person. Do not create accounts on behalf of others without their
            permission.
          </li>
          <li>You are responsible for any activity that occurs under your account.</li>
        </ul>

        <h2>3. Your content</h2>
        <p>
          You own what you create — your lists, reviews, and profile content. By posting it on
          NomNom you grant us a non-exclusive, royalty-free licence to display and distribute it
          within the service (for example, showing your list to people who follow you).
        </p>
        <p>You agree not to post content that is:</p>
        <ul>
          <li>False, misleading, or deceptive</li>
          <li>Harmful, harassing, or abusive toward any person</li>
          <li>Infringing on intellectual property rights</li>
          <li>In violation of any applicable law</li>
        </ul>
        <p>We reserve the right to remove content or suspend accounts that violate these terms.</p>

        <h2>4. Subscriptions and billing</h2>
        <p>
          Some features require a paid subscription. Billing is processed by Stripe. Subscription
          fees are charged in advance and are non-refundable except where required by law. You may
          cancel at any time; your access continues until the end of the current billing period.
        </p>
        <p>
          Creators may offer paid access to their lists. In that case, a portion of the subscription
          fee goes to the creator and a portion to NomNom as a platform fee. The split is disclosed
          at checkout.
        </p>

        <h2>5. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Scrape, crawl, or systematically extract content from NomNom</li>
          <li>
            Reverse-engineer the app or attempt to access systems you are not authorised to use
          </li>
          <li>Use the service to send unsolicited messages or spam</li>
          <li>Impersonate any person or entity</li>
          <li>Attempt to circumvent any security measures</li>
        </ul>

        <h2>6. Intellectual property</h2>
        <p>
          The NomNom name, logo, and all app and website design elements are our property or
          licenced to us. You may not use them without our written permission.
        </p>
        <p>
          Restaurant information (names, addresses, descriptions, images) comes from public sources
          or is provided by users. We make no guarantees about its accuracy or completeness.
        </p>

        <h2>7. Disclaimer</h2>
        <p>
          NomNom is provided &quot;as is&quot;. We do not guarantee that any restaurant will meet
          your expectations, be open when you visit, or match the description. Restaurant details
          change — always confirm before you go.
        </p>
        <p>
          To the maximum extent permitted by law, we are not liable for any indirect, incidental, or
          consequential damages arising from your use of the service.
        </p>

        <h2>8. Termination</h2>
        <p>
          You may delete your account at any time in <strong>Settings → Delete Account</strong>. We
          may suspend or terminate accounts that violate these terms, with or without notice.
        </p>

        <h2>9. Changes to these terms</h2>
        <p>
          We may update these terms from time to time. We will notify you of material changes by
          email or in-app notice. Continued use of NomNom after notice constitutes acceptance of the
          updated terms.
        </p>

        <h2>10. Governing law</h2>
        <p>
          These terms are governed by the laws of Portugal. Any disputes will be resolved in the
          courts of Lisbon, Portugal, unless local consumer-protection law requires otherwise.
        </p>

        <h2>11. Contact</h2>
        <p>
          Questions about these terms? Write to us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </Box>
    </Container>
  );
}
