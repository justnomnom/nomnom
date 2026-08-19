import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import { alpha } from '@mui/material/styles';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useTranslate } from 'src/locales';
import { useAuthContext } from 'src/auth/hooks';

import CustomPopover, { usePopover } from 'src/components/custom-popover';

// ----------------------------------------------------------------------

const OPTIONS = [
  {
    label: 'components.account_popover.home',
    linkTo: '/',
  },
  {
    label: 'components.account_popover.settings',
    linkTo: paths.dashboard.settings,
  },
];

// ----------------------------------------------------------------------

export default function AccountPopover() {
  const router = useRouter();
  const { t } = useTranslate();

  const { user } = useAuthContext();

  const { logout } = useAuthContext();

  const popover = usePopover();

  const handleLogout = async () => {
    try {
      await logout();
      popover.onClose();
      router.replace('/');
    } catch (error) {
      console.error(error);
    }
  };

  const handleClickItem = (path) => {
    popover.onClose();
    router.push(path);
  };

  return (
    <>
      <IconButton
        onClick={popover.onOpen}
        aria-label={t('components.account_popover.open_aria', {
          defaultValue: 'Open account menu',
        })}
        aria-expanded={popover.open}
        aria-haspopup="menu"
        sx={{
          width: 44,
          height: 44,
          WebkitTapHighlightColor: 'transparent',
          transition: 'transform 0.15s ease, background-color 0.2s ease',
          background: (theme) => alpha(theme.palette.grey[500], 0.08),
          '&:active': { transform: 'scale(0.98)' },
          '@media (prefers-reduced-motion: reduce)': {
            transition: 'background-color 0.2s ease',
            '&:active': { transform: 'none' },
          },
          ...(popover.open && {
            background: (theme) => theme.palette.primary.main,
          }),
        }}
      >
        <Avatar
          src={user?.photoURL}
          alt={user?.displayName}
          sx={{
            width: 36,
            height: 36,
            border: (theme) => `solid 2px ${theme.palette.background.default}`,
          }}
        >
          {user?.displayName?.charAt(0).toUpperCase()}
        </Avatar>
      </IconButton>

      <CustomPopover open={popover.open} onClose={popover.onClose} sx={{ width: 200, p: 0 }}>
        <Box sx={{ p: 2, pb: 1.5 }}>
          <Typography variant="subtitle2" noWrap>
            {user?.displayName}
          </Typography>

          <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
            {user?.email}
          </Typography>
        </Box>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <Stack sx={{ p: 1 }}>
          {OPTIONS.map((option) => (
            <MenuItem key={option.label} onClick={() => handleClickItem(option.linkTo)}>
              {t(option.label)}
            </MenuItem>
          ))}
        </Stack>

        <Divider sx={{ borderStyle: 'dashed' }} />

        <MenuItem
          onClick={handleLogout}
          sx={{ m: 1, fontWeight: 'fontWeightBold', color: 'error.main' }}
        >
          {t('components.account_popover.logout')}
        </MenuItem>
      </CustomPopover>
    </>
  );
}
