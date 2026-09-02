'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import useMediaQuery from '@mui/material/useMediaQuery';
import CardActionArea from '@mui/material/CardActionArea';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { readableAccent } from 'src/theme/readable-accent';

import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function AdminHubView() {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('md'));
  const { t } = useTranslate();
  const tk = (k) => t(`pages.dashboard.admin.hub.${k}`);

  const cards = [
    {
      key: 'sponsored',
      titleKey: 'card_sponsored_title',
      descKey: 'card_sponsored_description',
      href: paths.dashboard.adminSponsoredPlacements,
      icon: ic.starsBold,
      disabled: false,
    },
    {
      key: 'more',
      titleKey: 'card_more_title',
      descKey: 'card_more_description',
      href: null,
      icon: ic.infoOutline,
      disabled: true,
    },
  ];

  return (
    <Stack
      spacing={isNarrow ? 2.5 : 3}
      sx={{
        p: { xs: 1.5, sm: 2, md: 3 },
        maxWidth: 960,
        mx: 'auto',
        width: 1,
        pb: { xs: 4, md: 3 },
      }}
    >
      <Box>
        <Typography variant={isNarrow ? 'h5' : 'h4'} sx={{ mb: 1, fontWeight: 700 }}>
          {tk('heading')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {tk('sub')}
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {cards.map((c) => (
          <Grid key={c.key} size={{ xs: 12, sm: 6 }}>
            <Card
              variant="outlined"
              sx={{
                height: 1,
                opacity: c.disabled ? 0.72 : 1,
                borderRadius: 2,
              }}
            >
              {c.href ? (
                <CardActionArea
                  component={RouterLink}
                  href={c.href}
                  sx={{
                    height: 1,
                    alignItems: 'stretch',
                    textAlign: 'left',
                    borderRadius: 2,
                    minHeight: isNarrow ? 72 : 64,
                  }}
                >
                  <AdminHubCardBody
                    icon={c.icon}
                    title={tk(c.titleKey)}
                    description={tk(c.descKey)}
                  />
                </CardActionArea>
              ) : (
                <CardContent
                  sx={{
                    p: 0,
                    height: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    '&:last-child': { pb: 0 },
                  }}
                >
                  <AdminHubCardBody
                    icon={c.icon}
                    title={tk(c.titleKey)}
                    description={tk(c.descKey)}
                  />
                </CardContent>
              )}
            </Card>
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}

function AdminHubCardBody({ icon, title, description }) {
  return (
    <Stack direction="row" spacing={2} sx={{ p: 2, alignItems: 'flex-start' }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'action.hover',
          color: (theme) => readableAccent(theme),
          flexShrink: 0,
        }}
      >
        <Iconify icon={icon} width={26} />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Box>
    </Stack>
  );
}

AdminHubCardBody.propTypes = {
  icon: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
};
