import PropTypes from 'prop-types';
import { forwardRef } from 'react';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import { alpha, styled } from '@mui/material/styles';
import CardActionArea from '@mui/material/CardActionArea';
import ListItemButton from '@mui/material/ListItemButton';

import { RouterLink } from 'src/routes/components';

import { ic } from 'src/assets/icons';
import { finePointerHover } from 'src/theme/overrides/hoverable';

import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

export const NavItem = forwardRef(
  ({ title, path, open, active, hasChild, externalLink, subItem, ...other }, ref) => {
    const renderContent = (
      <StyledNavItem
        disableRipple
        disableTouchRipple
        ref={ref}
        open={open}
        active={active}
        subItem={subItem}
        {...other}
      >
        {title}

        {hasChild && (
          <Iconify
            width={16}
            icon={ic.arrowIosDownwardFill}
            sx={{ ml: 1, color: 'currentColor', flexShrink: 0 }}
          />
        )}
      </StyledNavItem>
    );

    if (hasChild) {
      return renderContent;
    }

    if (externalLink) {
      return (
        <Link href={path} target="_blank" rel="noopener" color="inherit" underline="none">
          {renderContent}
        </Link>
      );
    }

    return (
      <Link component={RouterLink} href={path} color="inherit" underline="none">
        {renderContent}
      </Link>
    );
  }
);

NavItem.propTypes = {
  title: PropTypes.string,
  path: PropTypes.string,
  open: PropTypes.bool,
  active: PropTypes.bool,
  subItem: PropTypes.bool,
  hasChild: PropTypes.bool,
  externalLink: PropTypes.bool,
};

// ----------------------------------------------------------------------

const StyledNavItem = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== 'active' && prop !== 'subItem',
})(({ open, active, subItem, theme }) => {
  const opened = open && !active;

  const dotStyles = {
    width: 6,
    height: 6,
    left: -12,
    opacity: 0.64,
    content: '""',
    borderRadius: '50%',
    position: 'absolute',
    backgroundColor: 'currentColor',
    ...(active && {
      color: theme.palette.primary.main,
    }),
  };

  const hoverWash =
    theme.palette.mode === 'light'
      ? alpha(theme.palette.marketing.dividerWarm, 0.65)
      : alpha(theme.palette.common.white, 0.06);

  return {
    // Root item
    ...(!subItem && {
      ...theme.typography.body2,
      padding: theme.spacing(0.5, 1),
      height: '100%',
      color: theme.palette.text.primary,
      fontWeight: theme.typography.fontWeightMedium,
      borderRadius: 1,
      transition: theme.transitions.create(['background-color', 'color'], {
        duration: theme.transitions.duration.shorter,
      }),
      ...finePointerHover({
        '&:hover': {
          opacity: 1,
          backgroundColor: hoverWash,
          '&:before': {
            ...dotStyles,
          },
        },
      }),
      ...(active && {
        color: theme.palette.primary.main,
        fontWeight: theme.typography.fontWeightSemiBold,
        '&:before': {
          ...dotStyles,
        },
      }),
      ...(opened && {
        opacity: 1,
        backgroundColor: hoverWash,
        '&:before': {
          ...dotStyles,
        },
      }),
    }),

    // Sub item
    ...(subItem && {
      ...theme.typography.body2,
      padding: 0,
      fontSize: 13,
      color: theme.palette.text.primary,
      fontWeight: theme.typography.fontWeightMedium,
      borderRadius: 1,
      transition: theme.transitions.create(['background-color', 'color'], {
        duration: theme.transitions.duration.shorter,
      }),
      ...finePointerHover({
        '&:hover': {
          backgroundColor: hoverWash,
          color: theme.palette.text.primary,
          '&:before': {
            ...dotStyles,
          },
        },
      }),
      ...(active && {
        color: theme.palette.primary.main,
        fontWeight: theme.typography.fontWeightSemiBold,
        '&:before': {
          ...dotStyles,
        },
      }),
    }),
  };
});

// ----------------------------------------------------------------------

export function NavItemDashboard({ path, sx, ...other }) {
  return (
    <Link component={RouterLink} href={path} sx={{ width: 1, height: 1 }} {...other}>
      <CardActionArea
        sx={{
          height: 1,
          minHeight: 320,
          borderRadius: 1.5,
          color: 'text.disabled',
          bgcolor: 'background.neutral',
          px: { md: 3, lg: 10 },
          ...sx,
        }}
      >
        <Box
          sx={{
            transition: 'transform 0.15s ease',
            '&:active': { transform: 'scale(0.98)' },
            '@media (prefers-reduced-motion: reduce)': {
              transition: 'none',
              '&:active': { transform: 'none' },
            },
          }}
        >
          <Box component="img" alt="" src="/assets/content-placeholder.svg" aria-hidden />
        </Box>
      </CardActionArea>
    </Link>
  );
}

NavItemDashboard.propTypes = {
  path: PropTypes.string,
  sx: PropTypes.object,
};
