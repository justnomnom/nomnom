'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink, NAV_BACK_TRANSITION_TYPES } from 'src/routes/components';

import { useResponsive } from 'src/hooks/use-responsive';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';

import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import { DashboardPageMotion } from 'src/components/dashboard';

import {
  TOUCH_MIN,
  SHELL_TOOLBAR_ICON,
  minimalIconButtonSx,
  DASHBOARD_SPACE_BLOCK,
  SETTINGS_PAGE_GUTTER_PX,
  filledDrillBackIconButtonSx,
  SETTINGS_DRILL_END_ADORNMENT_SLOT_MIN_WIDTH,
} from './settings-shell-shared';

/** Equal `1fr` side tracks (compact drill / map chrome). Default drill uses flex + absolute title instead. */
const BALANCED_TOOLBAR_THREE_COL = 'minmax(0, 1fr) auto minmax(0, 1fr)';

/** Centers title in the full header width; `maxWidth` keeps long titles from overlapping side actions. */
const drillTitleAbsoluteSx = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  m: 0,
  fontWeight: 800,
  letterSpacing: '-0.02em',
  lineHeight: 1.2,
  textAlign: 'center',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  zIndex: 0,
  minWidth: 0,
  maxWidth: { xs: 'calc(100% - 112px)', sm: 'calc(100% - 128px)' },
};

// ----------------------------------------------------------------------

function resolveSettingsContainerMaxWidth(maxWidthProp, themeStretch) {
  if (maxWidthProp !== undefined) return maxWidthProp;
  if (themeStretch) return false;
  return 'lg';
}

export function SettingsPageContainer({
  children,
  sx,
  maxWidth: maxWidthProp,
  disableGutters = false,
}) {
  const settings = useSettingsContext();
  const maxWidth = resolveSettingsContainerMaxWidth(maxWidthProp, settings.themeStretch);

  return (
    <Container
      maxWidth={maxWidth}
      disableGutters={disableGutters}
      sx={{
        px: SETTINGS_PAGE_GUTTER_PX,
        pb: { xs: 'max(24px, env(safe-area-inset-bottom, 0px))', md: 3, lg: 4 },
        ...sx,
      }}
    >
      {children}
    </Container>
  );
}

SettingsPageContainer.propTypes = {
  children: PropTypes.node,
  sx: PropTypes.object,
  maxWidth: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  disableGutters: PropTypes.bool,
};

// ----------------------------------------------------------------------

/** Dashboard drill shell: optional `useHistoryBack` uses the browser stack instead of `backHref`. */
export default function SettingsDrillShell({
  title,
  children,
  backHref = paths.dashboard.settings,
  useHistoryBack = false,
  backAriaLabel,
  compactToolbar = false,
  endAdornment = null,
  /** Rendered after the back chevron (same toolbar row). */
  leadingEndAdornment = null,
  /** When set (e.g. Discover logo), replaces the back control in `compactToolbar` mode. */
  leadingSlot = null,
  /** Optional second row inside the sticky header (e.g. Discover search). */
  toolbarFooter = null,
  /**
   * Stretch to fill dashboard `Main` (flex column). Use for full-viewport surfaces like the map.
   */
  fillMain = false,
  /** Tighter sticky header vertical spacing (e.g. map). */
  toolbarDense = false,
  /** Omit chevron back in compact mode (e.g. map). */
  hideToolbarBack = false,
  /** Skip sticky toolbar row + footer (e.g. map: search floats over content). */
  hideCompactStickyHeader = false,
  /** Merged into `SettingsPageContainer` `sx` after `pageFillSx`. */
  pageContainerSx = null,
  /**
   * Let the scroll body grow so children can vertically center (compact drill only).
   * Pairs with a flex child using `flex: 1` + `justifyContent: 'center'`.
   */
  stretchPageContent = false,
}) {
  const theme = useTheme();
  const { t } = useTranslate();
  const router = useRouter();
  /** Match dashboard shell: fixed AppBar + sidebar use `lg`. Avoids “desktop” drill chrome while there is no top bar (md–lg). */
  const shellLgUp = useResponsive('up', 'lg');
  const resolvedBackAria = backAriaLabel ?? t('pages.dashboard.settings.back_to_hub');
  const hasEndAdornment = Boolean(endAdornment);
  const hasLeadingSlot = Boolean(leadingSlot);
  const hasToolbarFooter = Boolean(toolbarFooter);
  const showCompactTopRow = hasLeadingSlot || hasEndAdornment || !hideToolbarBack;

  const pageFillSx = fillMain
    ? {
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        width: 1,
        pb: 0,
      }
    : {};

  const contentFillSx = fillMain
    ? { flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }
    : {};

  const stretchBelowHeaderSx =
    stretchPageContent && compactToolbar
      ? { flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }
      : {};

  const backSx = compactToolbar
    ? { ...minimalIconButtonSx(theme), ml: -1 }
    : filledDrillBackIconButtonSx(theme);

  /** Renders the drill header chevron as either history back or a link to `backHref`. */
  const renderDrillBackIconButton = (extraSx = {}) => {
    const mergedSx = { ...backSx, ...extraSx };
    if (useHistoryBack) {
      return (
        <IconButton
          type="button"
          onClick={() => router.back()}
          aria-label={resolvedBackAria}
          sx={mergedSx}
        >
          <Iconify icon={ic.chevronLeftLinear} width={SHELL_TOOLBAR_ICON} />
        </IconButton>
      );
    }
    return (
      <IconButton
        component={RouterLink}
        href={backHref}
        transitionTypes={NAV_BACK_TRANSITION_TYPES}
        aria-label={resolvedBackAria}
        sx={mergedSx}
      >
        <Iconify icon={ic.chevronLeftLinear} width={SHELL_TOOLBAR_ICON} />
      </IconButton>
    );
  };

  const mobileHeaderSx = compactToolbar
    ? {
        position: 'sticky',
        top: 0,
        zIndex: 12,
        mx: { xs: -2, sm: -3, lg: -4 },
        px: SETTINGS_PAGE_GUTTER_PX,
        pt: 'max(0px, env(safe-area-inset-top, 0px))',
        pb: 0,
        mb: toolbarDense ? 0 : 0.5,
        minHeight: TOUCH_MIN,
        display: 'flex',
        alignItems: 'center',
        bgcolor: alpha(theme.palette.background.default, 0.96),
      }
    : {
        position: 'sticky',
        top: 0,
        zIndex: 12,
        mx: { xs: -2, sm: -3, lg: -4 },
        px: SETTINGS_PAGE_GUTTER_PX,
        pt: 'max(4px, env(safe-area-inset-top, 0px))',
        pb: 0,
        mb: 1,
        minHeight: TOUCH_MIN,
        display: 'flex',
        alignItems: 'center',
        bgcolor: alpha(theme.palette.background.default, 0.98),
      };

  if (compactToolbar) {
    const showCenterTitle = Boolean(title != null && String(title).trim() !== '');
    const showTrailingToolbar = !hasLeadingSlot || hasEndAdornment;
    let mobileGridColumns = BALANCED_TOOLBAR_THREE_COL;
    if (hasLeadingSlot) {
      mobileGridColumns = hasEndAdornment
        ? `auto minmax(0, 1fr) minmax(${SETTINGS_DRILL_END_ADORNMENT_SLOT_MIN_WIDTH}px, auto)`
        : 'auto minmax(0, 1fr)';
    }

    const compactTitleTypography = showCenterTitle ? (
      <Typography
        component="h1"
        variant="subtitle1"
        sx={{
          m: 0,
          justifySelf: 'center',
          textAlign: 'center',
          alignSelf: 'center',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
          minWidth: 0,
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </Typography>
    ) : (
      <Box sx={{ minWidth: 0 }} aria-hidden />
    );

    let compactMobileTrailingCell = null;
    if (hasLeadingSlot) {
      if (showTrailingToolbar && hasEndAdornment) {
        compactMobileTrailingCell = (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="flex-end"
            spacing={0.5}
            sx={{
              justifySelf: 'end',
              m: 0,
              width: 1,
              minWidth: 0,
              boxSizing: 'border-box',
            }}
          >
            {endAdornment}
          </Stack>
        );
      }
    } else if (hasEndAdornment) {
      compactMobileTrailingCell = (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="flex-end"
          spacing={0.5}
          sx={{
            justifySelf: 'end',
            m: 0,
            width: 1,
            minWidth: 0,
            boxSizing: 'border-box',
          }}
        >
          {endAdornment}
        </Stack>
      );
    } else if (showCenterTitle) {
      compactMobileTrailingCell = (
        <Box aria-hidden sx={{ width: TOUCH_MIN, minWidth: TOUCH_MIN, justifySelf: 'end' }} />
      );
    }

    let compactDesktopTrailingCell = null;
    if (hasEndAdornment) {
      compactDesktopTrailingCell = (
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="flex-end"
          spacing={0.5}
          sx={{ width: 1, minWidth: 0, boxSizing: 'border-box' }}
        >
          {endAdornment}
        </Stack>
      );
    } else if (showCenterTitle) {
      compactDesktopTrailingCell = (
        <Box aria-hidden sx={{ width: TOUCH_MIN, minWidth: TOUCH_MIN }} />
      );
    }

    const mobileStickyHeaderSx = {
      ...mobileHeaderSx,
      ...(hasToolbarFooter
        ? {
            flexDirection: 'column',
            alignItems: 'stretch',
            minHeight: 'unset',
            pb: toolbarDense ? 0.5 : 1.5,
          }
        : {}),
    };

    let compactMobileGridLeading = null;
    if (showCompactTopRow) {
      if (hasLeadingSlot) {
        compactMobileGridLeading = (
          <Box
            sx={{
              justifySelf: 'start',
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {/**
             * Do not pass `leadingSlot` as the grid child directly: grids will
             * stretch unknown block-level children vertically and squash logos.
             */}
            {leadingSlot}
          </Box>
        );
      } else if (hideToolbarBack) {
        compactMobileGridLeading = <Box aria-hidden sx={{ width: 0, minWidth: 0 }} />;
      } else {
        compactMobileGridLeading = renderDrillBackIconButton({ justifySelf: 'start' });
      }
    }

    let compactDesktopLeading = null;
    if (showCompactTopRow) {
      if (hasLeadingSlot) {
        compactDesktopLeading = leadingSlot;
      } else if (!hideToolbarBack) {
        compactDesktopLeading = renderDrillBackIconButton();
      }
    }

    let compactLgUpToolbarRow = null;
    if (showCompactTopRow) {
      if (hasLeadingSlot) {
        compactLgUpToolbarRow = (
          <Stack
            direction="row"
            alignItems="center"
            justifyContent={hasEndAdornment ? 'space-between' : 'flex-start'}
            sx={{ minHeight: TOUCH_MIN }}
          >
            {compactDesktopLeading}
            {hasEndAdornment ? (
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="flex-end"
                spacing={0.5}
                sx={{ flexShrink: 0 }}
              >
                {endAdornment}
              </Stack>
            ) : null}
          </Stack>
        );
      } else {
        compactLgUpToolbarRow = (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: BALANCED_TOOLBAR_THREE_COL,
              alignItems: 'center',
              columnGap: 0.5,
              width: 1,
              minHeight: TOUCH_MIN,
            }}
          >
            <Box sx={{ justifySelf: 'start' }}>{compactDesktopLeading}</Box>
            <Box sx={{ minWidth: 0, maxWidth: '100%', justifySelf: 'center' }}>
              {compactTitleTypography}
            </Box>
            <Box sx={{ justifySelf: 'end' }}>{compactDesktopTrailingCell}</Box>
          </Box>
        );
      }
    }

    return (
      <SettingsPageContainer
        maxWidth={fillMain ? false : undefined}
        disableGutters={fillMain}
        sx={{ ...pageFillSx, ...stretchBelowHeaderSx, ...(pageContainerSx || {}) }}
      >
        {!hideCompactStickyHeader ? (
          <>
            {!shellLgUp ? (
              <Box sx={mobileStickyHeaderSx}>
                {showCompactTopRow ? (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: mobileGridColumns,
                      alignItems: 'center',
                      columnGap: 0.5,
                      width: 1,
                      minHeight: TOUCH_MIN,
                    }}
                  >
                    {compactMobileGridLeading}
                    {hasLeadingSlot ? (
                      <Box sx={{ minWidth: 0 }} aria-hidden />
                    ) : (
                      compactTitleTypography
                    )}
                    {compactMobileTrailingCell}
                  </Box>
                ) : null}
                {toolbarFooter}
              </Box>
            ) : (
              <Box
                sx={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 12,
                  mx: { xs: -2, sm: -3, lg: -4 },
                  px: SETTINGS_PAGE_GUTTER_PX,
                  /* `lg+`: dashboard `Main` already clears notch + fixed AppBar — avoid double safe-area here. */
                  pt: {
                    xs: toolbarDense
                      ? 'max(0px, env(safe-area-inset-top, 0px))'
                      : 'max(4px, env(safe-area-inset-top, 0px))',
                    lg: toolbarDense ? 0.25 : 1,
                  },
                  mb: toolbarDense ? 0.25 : 1,
                  bgcolor: alpha(theme.palette.background.default, 0.96),
                }}
              >
                {compactLgUpToolbarRow}
                {hasToolbarFooter ? (
                  <Box sx={{ width: 1, pt: toolbarDense ? 0.25 : 1, pb: toolbarDense ? 0 : 0.5 }}>
                    {toolbarFooter}
                  </Box>
                ) : null}
              </Box>
            )}
          </>
        ) : null}

        <Box sx={{ ...contentFillSx, ...stretchBelowHeaderSx }}>
          <DashboardPageMotion disabled={fillMain}>{children}</DashboardPageMotion>
        </Box>
      </SettingsPageContainer>
    );
  }

  return (
    <SettingsPageContainer
      maxWidth={fillMain ? false : undefined}
      disableGutters={fillMain}
      sx={{ ...pageFillSx, ...(pageContainerSx || {}) }}
    >
      {!shellLgUp ? (
        <Box sx={mobileHeaderSx}>
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              width: 1,
              minHeight: TOUCH_MIN,
            }}
          >
            <Box
              sx={{
                position: 'relative',
                zIndex: 1,
                flex: '1 1 0',
                minWidth: 0,
                display: 'flex',
                justifyContent: 'flex-start',
                alignItems: 'center',
              }}
            >
              <Stack direction="row" alignItems="center" spacing={0.25}>
                {renderDrillBackIconButton()}
                {leadingEndAdornment}
              </Stack>
            </Box>
            <Typography component="h1" variant="subtitle1" sx={drillTitleAbsoluteSx}>
              {title}
            </Typography>
            <Box
              sx={{
                position: 'relative',
                zIndex: 1,
                flex: '1 1 0',
                minWidth: 0,
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
              }}
            >
              {hasEndAdornment ? (
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  {endAdornment}
                </Stack>
              ) : (
                <Box aria-hidden sx={{ width: TOUCH_MIN, minHeight: TOUCH_MIN }} />
              )}
            </Box>
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            width: 1,
            minHeight: TOUCH_MIN,
            mb: DASHBOARD_SPACE_BLOCK,
            mt: { xs: 0.5, sm: 0 },
          }}
        >
          <Box
            sx={{
              position: 'relative',
              zIndex: 1,
              flex: '1 1 0',
              minWidth: 0,
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
            }}
          >
            <Stack direction="row" alignItems="center" spacing={0.5}>
              {renderDrillBackIconButton()}
              {leadingEndAdornment}
            </Stack>
          </Box>
          <Typography component="h1" variant="h6" sx={drillTitleAbsoluteSx}>
            {title}
          </Typography>
          <Box
            sx={{
              position: 'relative',
              zIndex: 1,
              flex: '1 1 0',
              minWidth: 0,
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            {hasEndAdornment ? (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                {endAdornment}
              </Stack>
            ) : (
              <Box aria-hidden sx={{ width: TOUCH_MIN, minHeight: TOUCH_MIN }} />
            )}
          </Box>
        </Box>
      )}

      <Box sx={contentFillSx}>
        <DashboardPageMotion disabled={fillMain}>{children}</DashboardPageMotion>
      </Box>
    </SettingsPageContainer>
  );
}

SettingsDrillShell.propTypes = {
  title: PropTypes.string.isRequired,
  children: PropTypes.node,
  backHref: PropTypes.string,
  useHistoryBack: PropTypes.bool,
  backAriaLabel: PropTypes.string,
  compactToolbar: PropTypes.bool,
  endAdornment: PropTypes.node,
  leadingEndAdornment: PropTypes.node,
  leadingSlot: PropTypes.node,
  toolbarFooter: PropTypes.node,
  fillMain: PropTypes.bool,
  toolbarDense: PropTypes.bool,
  hideToolbarBack: PropTypes.bool,
  hideCompactStickyHeader: PropTypes.bool,
  pageContainerSx: PropTypes.object,
  stretchPageContent: PropTypes.bool,
};
