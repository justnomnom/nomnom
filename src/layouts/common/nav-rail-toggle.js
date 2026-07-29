'use client';

import PropTypes from 'prop-types';

import Tooltip from '@mui/material/Tooltip';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';

import { useResponsive } from 'src/hooks/use-responsive';

import { ic } from 'src/assets/icons';
import { bgBlur } from 'src/theme/css';
import { HEADER } from 'src/config-global';
import { useTranslate } from 'src/locales';
import { Z_INDEX } from 'src/theme/spacing';

import Iconify from 'src/components/iconify';

import { useDashboardSidebarToggle } from '../dashboard/use-dashboard-sidebar-toggle';

/**
 * Sits on the sidebar / main divider at the app bar band (top intersection, not viewport center).
 */
export default function NavRailToggle({ navWidth, sx, ...other }) {
  const theme = useTheme();
  const { t } = useTranslate();
  const { isMini, toggle } = useDashboardSidebarToggle();
  const lgUp = useResponsive('up', 'lg');

  if (!lgUp) {
    return null;
  }

  const label = isMini ? t('common.a11y.expand_sidebar') : t('common.a11y.collapse_sidebar');

  return (
    <Tooltip title={label} placement="right" enterDelay={250}>
      <IconButton
        onClick={toggle}
        aria-label={label}
        size="small"
        sx={{
          position: 'fixed',
          // Rail edge (horizontal) × app bar (vertical): centered in toolbar row below safe-area
          left: navWidth,
          top: `calc(env(safe-area-inset-top, 0px) + ${HEADER.H_DESKTOP / 2}px)`,
          transform: 'translate(-50%, -50%)',
          zIndex: Z_INDEX.navRailToggle,
          width: 28,
          height: 28,
          p: 0.5,
          border: `1px solid ${
            theme.palette.mode === 'light' ? theme.palette.grey[300] : theme.palette.divider
          }`,
          borderRadius: '50%',
          boxShadow: theme.shadows[2],
          bgcolor: theme.palette.background.paper,
          ...bgBlur({ opacity: 0.92, color: theme.palette.background.paper }),
          color: 'text.primary',
          '&:hover': {
            bgcolor: theme.palette.action.hover,
          },
          ...sx,
        }}
        {...other}
      >
        <Iconify width={16} icon={isMini ? ic.arrowIosForwardFill : ic.arrowIosBackFill} />
      </IconButton>
    </Tooltip>
  );
}

NavRailToggle.propTypes = {
  navWidth: PropTypes.number.isRequired,
  sx: PropTypes.object,
};
