import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useTranslate } from 'src/locales';
import { APP_SUPPORT_EMAIL } from 'src/config-global';
import { readableAccent } from 'src/theme/readable-accent';

import Logo from 'src/components/logo';

// ----------------------------------------------------------------------

const LINKS = [
  {
    headline: 'explore',
    children: [
      { name: 'features', href: paths.site.featuresRoot },
      { name: 'use_cases', href: paths.site.useCasesRoot },
      { name: 'resources', href: paths.site.resourcesRoot },
      { name: 'pricing', href: paths.site.pricing },
    ],
  },
  {
    headline: 'company',
    children: [
      { name: 'about', href: paths.site.about },
      { name: 'contact_us', href: paths.contact },
      { name: 'faqs', href: paths.faqs },
      { name: 'email', href: `mailto:${APP_SUPPORT_EMAIL}`, label: APP_SUPPORT_EMAIL },
    ],
  },
  {
    headline: 'legal',
    children: [
      { name: 'privacy', href: paths.privacy },
      { name: 'terms', href: paths.terms },
    ],
  },
];

// ----------------------------------------------------------------------

export default function Footer() {
  const { t } = useTranslate();
  const theme = useTheme();

  const mainFooter = (
    <Box
      component="footer"
      sx={{
        position: 'relative',
        bgcolor: 'background.default',
      }}
    >
      <Divider
        sx={{
          borderColor:
            theme.palette.mode === 'light'
              ? alpha(theme.palette.marketing.dividerWarm, 0.95)
              : theme.palette.divider,
        }}
      />

      <Container
        sx={(th) => ({
          pt: { xs: 6, sm: 8, md: 10 },
          // paddingBottom must be plain strings per breakpoint — functions are treated as spacing multipliers
          paddingBottom: {
            xs: `calc(${th.spacing(4)} + env(safe-area-inset-bottom, 0px))`,
            sm: `calc(${th.spacing(5)} + env(safe-area-inset-bottom, 0px))`,
          },
          textAlign: { xs: 'center', md: 'unset' },
        })}
      >
        <Logo sx={{ mb: { xs: 2, md: 3 }, mx: { xs: 'auto', md: 0 } }} />

        <Grid
          container
          justifyContent={{
            xs: 'center',
            md: 'space-between',
          }}
        >
          <Grid size={{ xs: 12, sm: 8, md: 3 }}>
            <Typography
              variant="body2"
              sx={{
                maxWidth: 270,
                mx: { xs: 'auto', md: 'unset' },
                color: 'text.secondary',
                lineHeight: 1.65,
              }}
            >
              {t('footer.description')}
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={5} direction={{ xs: 'column', md: 'row' }}>
              {LINKS.map((list) => (
                <Stack
                  key={list.headline}
                  spacing={2}
                  alignItems={{ xs: 'center', md: 'flex-start' }}
                  sx={{ width: 1 }}
                >
                  <Typography
                    component="div"
                    variant="overline"
                    sx={{ color: 'text.secondary', letterSpacing: '0.08em' }}
                  >
                    {t(`footer.links.${list.headline}`)}
                  </Typography>

                  {list.children.map((link) => (
                    <Link
                      key={link.name}
                      component={RouterLink}
                      href={link.href}
                      color="inherit"
                      variant="body2"
                      sx={{
                        color: 'text.primary',
                        textDecoration: 'none',
                        py: { xs: 1.25, md: 0.25 },
                        display: 'inline-block',
                        minHeight: { xs: 44, md: 'auto' },
                        lineHeight: { xs: '44px', md: 'inherit' },
                        borderRadius: 0.5,
                        transition: (th) =>
                          th.transitions.create(['color', 'text-decoration-color'], {
                            duration: th.transitions.duration.shorter,
                          }),
                        '&:hover': {
                          color: readableAccent(theme),
                          textDecoration: 'underline',
                          textUnderlineOffset: 4,
                        },
                        '&:focus-visible': {
                          outline: (th) =>
                            `2px solid ${
                              th.palette.mode === 'light'
                                ? th.palette.info.main
                                : alpha(th.palette.info.light, 0.9)
                            }`,
                          outlineOffset: 2,
                        },
                      }}
                    >
                      {link.label ?? t(`footer.links.${link.name}`)}
                    </Link>
                  ))}
                </Stack>
              ))}
            </Stack>
          </Grid>
        </Grid>

        <Typography
          variant="body2"
          sx={{
            mt: { xs: 6, md: 10 },
            color: 'text.secondary',
            fontSize: '0.8125rem',
            letterSpacing: '0.01em',
          }}
        >
          {t('footer.copyright')}
        </Typography>
      </Container>
    </Box>
  );

  return mainFooter;
}
