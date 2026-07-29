import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import { useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { bgBlur } from 'src/theme/css';
import { useTranslate } from 'src/locales';
import { HEADER } from 'src/config-global';

import Logo from 'src/components/logo';

import HeaderShadow from './header-shadow';

// ----------------------------------------------------------------------

export default function HeaderSimple() {
  const theme = useTheme();
  const { t } = useTranslate();

  const offsetTop = true;

  return (
    <AppBar
      sx={{
        borderBottom: `1px solid ${
          theme.palette.mode === 'light' ? theme.palette.grey[300] : theme.palette.divider
        }`,
      }}
    >
      <Toolbar
        sx={{
          justifyContent: 'space-between',
          height: {
            xs: HEADER.H_MOBILE,
            md: HEADER.H_DESKTOP,
          },
          ...(offsetTop && {
            ...bgBlur({
              color: theme.palette.background.default,
            }),
            height: {
              md: HEADER.H_DESKTOP_OFFSET,
            },
          }),
        }}
      >
        <Logo />

        <Stack direction="row" alignItems="center" spacing={2}>
          <Link
            href={paths.faqs}
            component={RouterLink}
            color="inherit"
            sx={{ typography: 'subtitle2' }}
          >
            {t('header.need_help')}
          </Link>
        </Stack>
      </Toolbar>

      {offsetTop && <HeaderShadow />}
    </AppBar>
  );
}
