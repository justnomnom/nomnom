import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import SpeedDial from '@mui/material/SpeedDial';
import ListItemText from '@mui/material/ListItemText';
import { alpha, useTheme } from '@mui/material/styles';
import SpeedDialAction from '@mui/material/SpeedDialAction';

import { useResponsive } from 'src/hooks/use-responsive';

import { fDate } from 'src/utils/format-time';

import { _socials } from 'src/_mock';
import { ic } from 'src/assets/icons';
import { bgGradient } from 'src/theme/css';
import { useTranslate } from 'src/locales/use-locales';

import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

export default function PostDetailsHero({ title, coverUrl, createdAt }) {
  const { t } = useTranslate();
  const theme = useTheme();

  const smUp = useResponsive('up', 'sm');

  return (
    <Box
      sx={{
        height: { xs: 140, md: 140 },
        overflow: 'hidden',
        ...bgGradient({
          imgUrl: coverUrl,
          startColor: `${alpha(theme.palette.grey[900], 0.64)} 0%`,
          endColor: `${alpha(theme.palette.grey[900], 0.64)} 100%`,
        }),
      }}
    >
      <Container sx={{ height: 1, position: 'relative' }}>
        <Stack
          sx={{
            left: 0,
            width: 1,
            bottom: 0,
            position: 'absolute',
          }}
        >
          {createdAt && (
            <Stack
              direction="row"
              alignItems="center"
              sx={{
                px: { xs: 2, md: 3 },
                pb: { xs: 2, md: 4 },
                pt: { xs: 4, md: 8 },
              }}
            >
              <ListItemText
                sx={{ color: 'common.white' }}
                primary={title}
                secondary={fDate(createdAt)}
                primaryTypographyProps={{ typography: 'h4', mb: 0.5 }}
                secondaryTypographyProps={{
                  color: 'inherit',
                  sx: { opacity: 0.64 },
                }}
              />
            </Stack>
          )}

          <SpeedDial
            direction={smUp ? 'left' : 'up'}
            ariaLabel={t('components.empty_content.blog.share.aria_label')}
            icon={<Iconify icon={ic.shareBold} />}
            FabProps={{ size: 'medium' }}
            sx={{
              position: 'absolute',
              bottom: { xs: 16, md: 32 },
              right: { xs: 16, md: 24 },
            }}
          >
            {_socials.map((action) => (
              <SpeedDialAction
                key={action.name}
                icon={<Iconify icon={action.icon} sx={{ color: action.color }} />}
                tooltipTitle={action.name}
                tooltipPlacement="top"
                FabProps={{ color: 'default' }}
              />
            ))}
          </SpeedDial>
        </Stack>
      </Container>
    </Box>
  );
}

PostDetailsHero.propTypes = {
  coverUrl: PropTypes.string,
  createdAt: PropTypes.string,
  title: PropTypes.string,
};
