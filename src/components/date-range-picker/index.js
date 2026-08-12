'use client';

import dayjs from 'dayjs';
import PropTypes from 'prop-types';
import { useMemo, useState, useEffect } from 'react';
import theme from 'antd/es/theme';
import DatePicker from 'antd/es/date-picker';
import ConfigProvider from 'antd/es/config-provider';

import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { Box, Select, MenuItem, Typography, FormControl } from '@mui/material';

import { useLocalStorage } from 'src/hooks/use-local-storage';

import { calculateDuration } from 'src/utils/format-time';
import { muiFullscreenPortalContainerProps } from 'src/utils/mui-fullscreen-portal';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales/use-locales';
import { useAuthContext } from 'src/auth/hooks/use-auth-context';

import Iconify from 'src/components/iconify';

const { RangePicker } = DatePicker;

/**
 * Get the start of the current week (Sunday) and end of the week (Saturday)
 * @returns {[dayjs.Dayjs, dayjs.Dayjs]} Array with [weekStart, weekEnd]
 */
const getThisWeekRange = () =>
  // Day.js default week starts on Sunday (no locale weekStart override)
  [dayjs().startOf('week').startOf('day'), dayjs().endOf('week').endOf('day')];
/**
 * Get the start of the previous week (Sunday) and end of the week (Saturday)
 * @returns {[dayjs.Dayjs, dayjs.Dayjs]} Array with [weekStart, weekEnd]
 */
const getPastWeekRange = () => {
  const thisWeekStart = dayjs().startOf('week').startOf('day');
  const weekEnd = thisWeekStart.subtract(1, 'day').endOf('day');
  const weekStart = thisWeekStart.subtract(1, 'week').startOf('day');
  return [weekStart, weekEnd];
};

/**
 * Get the start of the previous month (first day) and end of the month (last day)
 * @returns {[dayjs.Dayjs, dayjs.Dayjs]} Array with [monthStart, monthEnd]
 */
const getPastMonthRange = () => {
  const firstDayOfCurrentMonth = dayjs().startOf('month');
  const lastDayOfPastMonth = firstDayOfCurrentMonth.subtract(1, 'day').endOf('day');
  const firstDayOfPastMonth = lastDayOfPastMonth.startOf('month').startOf('day');
  return [firstDayOfPastMonth, lastDayOfPastMonth];
};

/**
 * Custom DateRangePicker component that integrates with Material-UI theme
 * and provides consistent styling across the application
 *
 * This component uses Ant Design's RangePicker with Material-UI theme integration
 * and styling to match the application's design system.
 *
 * The onChange callback receives an array [start_date, due_date] where:
 * - index 0 = start_date (first selected date)
 * - index 1 = due_date (last selected date)
 *
 * Features:
 * - Optional duration display below the date range picker
 * - Responsive design with mobile optimizations
 * - Consistent styling with Material-UI theme
 * - Built-in duration calculation (inclusive of start and end dates)
 */
export default function CustomDateRangePicker({
  value,
  onChange,
  placeholder,
  startDatePlaceholder,
  dueDatePlaceholder,
  cleanable = true,
  format,
  placement = 'bottomLeft',
  size = 'middle',
  disabled = false,
  readOnly = false,
  error = false,
  style,
  className,
  showOneCalendar = false,
  showDuration = false,
  durationIconSize = 16,
  durationVariant = 'caption',
  isFullscreen = false,
  ...otherProps
}) {
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useTranslate();
  const { user } = useAuthContext();

  // Get user identifier for storage key (use 'anonymous' if not logged in)
  const userId = user?.id || 'anonymous';
  const storageKey = `settings-duration-unit-${userId}`;

  // Memoize initialState to prevent infinite loops in useLocalStorage
  const initialState = useMemo(() => ({ unit: 'days' }), []);

  const { state: settingsState, update: updateSettings } = useLocalStorage(
    storageKey,
    initialState
  );

  const durationUnit = settingsState?.unit || 'days';

  const setDurationUnit = (newUnit) => {
    updateSettings('unit', newUnit);
  };

  // Get duration for current value
  const duration =
    showDuration && value && value.length >= 1 ? calculateDuration(value[0], value[1]) : null;

  const calculateDisplayDuration = () => {
    if (!duration || duration <= 0) return 0;

    let val = duration;
    if (durationUnit === 'weeks') {
      val = duration / 7;
    } else if (durationUnit === 'months') {
      val = duration / 30.437; // Average month length
    } else if (durationUnit === 'years') {
      val = duration / 365.25;
    }

    // If integer, return as is. If float, max 1 decimal.
    return Number.isInteger(val) ? val : Number(val.toFixed(1));
  };

  const displayDuration = calculateDisplayDuration();

  // Handle Escape key to close calendar
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  // Convert JavaScript Date objects to dayjs objects for Ant Design
  const convertToDayjs = (date) => {
    if (!date) return null;
    if (dayjs.isDayjs(date)) return date;
    // Use startOf('day') to avoid timezone issues that cause dates to appear one day earlier
    return dayjs(date).startOf('day');
  };

  const convertValueToDayjs = (dateArray) => {
    if (!dateArray || !Array.isArray(dateArray)) return null;
    return dateArray.map(convertToDayjs);
  };

  // Convert the value prop to dayjs format
  const dayjsValue = convertValueToDayjs(value);

  // Validate that we have a proper value
  // Allow partial dates (one date can be null) so we can show available dates with placeholders
  const validDayjsValue =
    dayjsValue && Array.isArray(dayjsValue) && dayjsValue.length === 2 ? dayjsValue : null;

  // When disabled, don't allow any interactions
  const handleChange = disabled
    ? undefined
    : (dates) => {
        if (!onChange) return;
        if (!dates || !Array.isArray(dates) || dates.length !== 2) {
          onChange(null);
          return;
        }
        // allowEmpty={[true, true]}: either bound may be null (open-ended ranges)
        const jsDates = dates.map((date) =>
          date && dayjs.isDayjs(date) ? date.startOf('day').toDate() : null
        );
        if (!jsDates[0] && !jsDates[1]) {
          onChange(null);
          return;
        }
        onChange(jsDates);
      };

  // Determine placeholder values based on state
  const getPlaceholders = () => {
    if (disabled || readOnly) {
      return validDayjsValue ? ['', ''] : ['DD/MM/YYYY', 'DD/MM/YYYY'];
    }
    return [
      startDatePlaceholder || t('common.date_picker.start_date'),
      dueDatePlaceholder || t('common.date_picker.due_date'),
    ];
  };

  // Get the fullscreen element if in fullscreen mode
  const getPopupContainer = () => {
    if (typeof document !== 'undefined' && isFullscreen && document.fullscreenElement) {
      return document.fullscreenElement;
    }
    return typeof document !== 'undefined' ? document.body : undefined;
  };

  // Desktop props
  const desktopProps = !isMobile
    ? {
        showOneCalendar,
        size,
        allowClear: cleanable,
        // Force the popup to render in a specific container to prevent positioning issues
        getPopupContainer,
        // Override placement to prevent default positioning
        placement: 'bottomLeft',
        // Try both presets and ranges for compatibility
        presets: [
          {
            label: t('common.date_ranges.last_30_days'),
            value: [dayjs().subtract(29, 'day'), dayjs()],
          },
          {
            label: t('common.date_ranges.last_7_days'),
            value: [dayjs().subtract(6, 'day'), dayjs()],
          },
          {
            label: t('common.date_ranges.past_month'),
            value: getPastMonthRange(),
          },
          {
            label: t('common.date_ranges.past_week'),
            value: getPastWeekRange(),
          },
          {
            label: t('common.date_ranges.today'),
            value: [dayjs(), dayjs()],
          },
          {
            label: t('common.date_ranges.this_week'),
            value: getThisWeekRange(),
          },
          {
            label: t('common.date_ranges.this_month'),
            value: [dayjs().startOf('month'), dayjs().endOf('month')],
          },
          {
            label: t('common.date_ranges.next_7_days'),
            value: [dayjs(), dayjs().add(6, 'day')],
          },
          {
            label: t('common.date_ranges.next_30_days'),
            value: [dayjs(), dayjs().add(29, 'day')],
          },
        ],
        // Center calendar in screen with backdrop
        panelRender: (panelNode) => (
          <>
            {/* Backdrop to prevent seeing the initial positioning */}
            <div
              role="button"
              tabIndex={0}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: alpha(muiTheme.palette.common.black, 0.5),
                zIndex: isFullscreen ? 10000 : 9999,
                cursor: 'pointer',
              }}
              onClick={() => {
                // Close calendar when backdrop is clicked
                setIsOpen(false);
              }}
              onKeyDown={(e) => {
                // Close calendar when Enter or Space is pressed
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsOpen(false);
                }
              }}
              aria-label={t('common.close_date_picker')}
            />
            {/* Centered calendar */}
            <div
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: isFullscreen ? 10000 : 9999,
                backgroundColor: muiTheme.palette.background.paper,
                borderRadius: '8px',
                boxShadow: `0 4px 20px ${alpha(muiTheme.palette.common.black, 0.3)}`,
                overflow: 'hidden',
                // Ensure immediate centering without jumping
                animation: 'none',
                transition: 'none',
                // Override any default Ant Design animations
                '--antd-wave-shadow-color': 'transparent',
                '--antd-motion-duration-slow': '0s',
                '--antd-motion-duration-base': '0s',
                '--antd-motion-duration-fast': '0s',
                // Force immediate positioning
                willChange: 'auto',
                backfaceVisibility: 'hidden',
              }}
            >
              {panelNode}
            </div>
          </>
        ),
      }
    : {};

  // Mobile props - also center on mobile
  const mobileProps = isMobile
    ? {
        // Use single calendar view on mobile for better UX
        showOneCalendar: true,
        // Force the popup to render in a specific container to prevent positioning issues
        getPopupContainer,
        // Override placement to prevent default positioning
        placement: 'bottomLeft',
        // Use smaller size on mobile
        size: 'small',
        // Enable mobile-friendly interactions
        allowClear: cleanable, // Respect the cleanable prop instead of always disabling
        // Mobile-optimized style
        style: {
          ...style,
          width: '100%',
          minHeight: '36px', // Reduced from 40px
          fontSize: '13px', // Reduced from 14px
        },
        // Better mobile input handling
        inputReadOnly: false,
        // Mobile-friendly date selection
        presets: [
          {
            label: t('common.date_ranges.last_7_days'),
            value: [dayjs().subtract(6, 'day'), dayjs()],
          },
          {
            label: t('common.date_ranges.past_month'),
            value: getPastMonthRange(),
          },
          {
            label: t('common.date_ranges.past_week'),
            value: getPastWeekRange(),
          },
          {
            label: t('common.date_ranges.today'),
            value: [dayjs(), dayjs()],
          },
          {
            label: t('common.date_ranges.this_week'),
            value: getThisWeekRange(),
          },
          {
            label: t('common.date_ranges.this_month'),
            value: [dayjs().startOf('month'), dayjs().endOf('month')],
          },
          {
            label: t('common.date_ranges.next_7_days'),
            value: [dayjs(), dayjs().add(6, 'day')],
          },
          {
            label: t('common.date_ranges.next_30_days'),
            value: [dayjs(), dayjs().add(29, 'day')],
          },
        ],
        // Center calendar on mobile too
        panelRender: (panelNode) => (
          <>
            {/* Backdrop to prevent seeing the initial positioning */}
            <div
              role="button"
              tabIndex={0}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: alpha(muiTheme.palette.common.black, 0.5),
                zIndex: isFullscreen ? 10000 : 9999,
                cursor: 'pointer',
              }}
              onClick={() => {
                // Close calendar when backdrop is clicked
                setIsOpen(false);
              }}
              onKeyDown={(e) => {
                // Close calendar when Enter or Space is pressed
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setIsOpen(false);
                }
              }}
              aria-label={t('common.close_date_picker')}
            />
            {/* Centered calendar */}
            <div
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: isFullscreen ? 10000 : 9999,
                maxWidth: '90vw',
                maxHeight: '80vh',
                overflow: 'auto',
                backgroundColor: muiTheme.palette.background.paper,
                borderRadius: '8px',
                boxShadow: `0 4px 20px ${alpha(muiTheme.palette.common.black, 0.3)}`,
                touchAction: 'pan-x pan-y',
                WebkitOverflowScrolling: 'touch',
                // Ensure immediate centering without jumping
                animation: 'none',
                transition: 'none',
                // Override any default Ant Design animations
                '--antd-wave-shadow-color': 'transparent',
                '--antd-motion-duration-slow': '0s',
                '--antd-motion-duration-base': '0s',
                '--antd-motion-duration-fast': '0s',
                // Force immediate positioning
                willChange: 'auto',
                backfaceVisibility: 'hidden',
              }}
            >
              {panelNode}
            </div>
          </>
        ),
      }
    : {};

  return (
    <Box
      className={className}
      style={style}
      sx={{
        // Ensure Ant Design picker text is visible in light mode
        '& .ant-picker-input > input': {
          color: `${muiTheme.palette.text.primary} !important`,
        },
        '& .ant-picker-input > input::placeholder': {
          color: `${muiTheme.palette.text.disabled} !important`,
        },
        '& .ant-picker-input input[disabled]': {
          color: `${muiTheme.palette.text.disabled} !important`,
        },
        '& .ant-picker-separator': {
          color: `${muiTheme.palette.text.secondary} !important`,
        },
      }}
    >
      <Box
        sx={{
          display: isMobile ? 'block' : 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'auto auto 1fr',
          gap: isMobile ? 0.5 : 1,
          alignItems: 'center',
          width: '100%',
        }}
      >
        {/* Date Range Picker */}
        <Box sx={{ gridColumn: isMobile ? '1' : '1', width: isMobile ? '100%' : 'auto' }}>
          <ConfigProvider
            theme={{
              algorithm:
                muiTheme.palette.mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
              token: {
                colorBgContainer: muiTheme.palette.background.paper,
                colorBgElevated: muiTheme.palette.background.paper,
                colorBorder: muiTheme.palette.divider,
                colorText: disabled
                  ? muiTheme.palette.text.disabled
                  : muiTheme.palette.text.primary,
                colorTextPlaceholder: muiTheme.palette.text.disabled,
                colorPrimary: muiTheme.palette.primary.main,
                colorPrimaryHover: muiTheme.palette.primary.dark,
                borderRadius: muiTheme.shape.borderRadius,
                // Additional tokens for disabled state
                colorTextDisabled: muiTheme.palette.text.disabled,
                colorBgContainerDisabled: muiTheme.palette.background.paper,
                colorBorderDisabled: muiTheme.palette.divider,
                // Input-specific tokens to ensure text visibility
                colorTextHeading: muiTheme.palette.text.primary,
                colorTextLabel: muiTheme.palette.text.secondary,
                colorTextDescription: muiTheme.palette.text.secondary,
                // Override motion durations to prevent animations
                motionDurationSlow: '0s',
                motionDurationMid: '0s',
                motionDurationFast: '0s',
                // Mobile-optimized tokens
                ...(isMobile && {
                  borderRadius: 6, // Reduced from 8
                  fontSize: 12, // Reduced from 14
                  paddingContentHorizontal: 8, // Reduced from 12
                  paddingContentVertical: 6, // Reduced from 8
                  // Additional mobile tokens
                  controlHeight: 32, // Reduced from 40
                  controlHeightLG: 36, // Reduced from 48
                  controlHeightSM: 28, // Reduced from 32
                  // Mobile calendar tokens
                  calendarItemActiveBg: muiTheme.palette.primary.main,
                  calendarItemHoverBg: muiTheme.palette.action.hover,
                  // Mobile input tokens
                  inputPaddingHorizontal: 8, // Reduced from 12
                  inputPaddingVertical: 6, // Reduced from 8
                  // Compact mobile calendar
                  calendarItemSize: 28, // Smaller calendar day cells
                  calendarHeaderHeight: 32, // Smaller header
                  calendarItemPadding: 2, // Reduced padding
                }),
              },
            }}
          >
            <RangePicker
              value={validDayjsValue}
              onChange={handleChange}
              placeholder={getPlaceholders()}
              format={format}
              disabled={disabled}
              allowEmpty={[true, true]}
              open={isOpen}
              onOpenChange={setIsOpen}
              style={{
                ...style,
                borderColor: error ? muiTheme.palette.error.main : undefined,
                borderWidth: error ? '2px' : undefined,
                color: muiTheme.palette.text.primary,
                // Ensure text is visible in both light and dark modes
                ...(muiTheme.palette.mode === 'light' && {
                  color: muiTheme.palette.text.primary,
                }),
                // Mobile-specific styles
                ...(isMobile && {
                  width: '100%',
                  minHeight: '32px', // Reduced from 36px
                  fontSize: '12px', // Reduced from 13px
                  touchAction: 'manipulation',
                  // Mobile touch optimizations
                  WebkitTapHighlightColor: 'transparent',
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                  userSelect: 'none',
                  // Better mobile spacing
                  padding: '4px 8px', // Reduced from 8px 12px
                  lineHeight: '1.2', // Reduced from 1.4
                  // Compact mobile layout
                  borderWidth: '1px',
                  borderRadius: '6px',
                }),
              }}
              className={`custom-date-range-picker-${muiTheme.palette.mode}`}
              {...mobileProps}
              {...desktopProps}
              {...otherProps}
            />
          </ConfigProvider>
        </Box>

        {/* Dash Separator */}
        {showDuration && duration && (
          <Box
            sx={{
              gridColumn: isMobile ? '1' : '2',
              display: 'flex',
              justifyContent: isMobile ? 'center' : 'center',
              alignItems: 'center',
              mt: isMobile ? 2 : 0,
              mb: isMobile ? 1 : 0,
              height: isMobile ? 'auto' : '100%',
              minHeight: isMobile ? 'auto' : '40px',
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: 'text.disabled',
                fontWeight: 400,
                fontSize: '14px',
              }}
            >
              —
            </Typography>
          </Box>
        )}

        {/* Duration Display */}
        {showDuration && duration && (
          <Box
            sx={{
              gridColumn: isMobile ? '1' : '3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isMobile ? 'center' : 'flex-start',
              height: '100%',
              minHeight: isMobile ? 'auto' : '40px', // Match typical input height
              mt: isMobile ? 0 : 0, // Reset since dash has its own margin
              mb: isMobile ? 2 : 0, // Match other components bottom spacing
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                minWidth: 'fit-content',
              }}
            >
              <Iconify
                icon={ic.calendarBold}
                width={durationIconSize}
                sx={{
                  color: 'text.secondary',
                  mr: 0.75,
                }}
              />
              <Typography
                variant={durationVariant}
                component="div"
                sx={{
                  color: 'text.secondary',
                  fontWeight: 400,
                  fontSize: durationVariant === 'caption' ? '12px' : '14px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {displayDuration}
                <FormControl size="small" variant="standard">
                  <Select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value)}
                    disableUnderline
                    MenuProps={{
                      disablePortal: isFullscreen,
                      ...muiFullscreenPortalContainerProps(isFullscreen),
                      slotProps: {
                        paper: {
                          sx: {
                            zIndex: isFullscreen ? 10005 : 'auto',
                          },
                          style: {
                            zIndex: isFullscreen ? 10005 : undefined,
                          },
                        },
                      },
                    }}
                    sx={{
                      ml: 0.5,
                      color: 'text.secondary',
                      fontSize: 'inherit',
                      '& .MuiSelect-select': {
                        paddingRight: '16px !important',
                        paddingTop: 0,
                        paddingBottom: 0,
                        minHeight: 'auto',
                        fontWeight: 'inherit',
                      },
                      '& .MuiSvgIcon-root': {
                        right: -2,
                        width: 16,
                        height: 16,
                        color: 'text.secondary',
                      },
                    }}
                  >
                    <MenuItem value="days">
                      {Number(displayDuration) === 1 ? t('common.day') : t('common.days')}
                    </MenuItem>
                    <MenuItem value="weeks">
                      {Number(displayDuration) === 1 ? t('common.week') : t('common.weeks')}
                    </MenuItem>
                    <MenuItem value="months">
                      {Number(displayDuration) === 1 ? t('common.month') : t('common.months')}
                    </MenuItem>
                    <MenuItem value="years">
                      {Number(displayDuration) === 1 ? t('common.year') : t('common.years')}
                    </MenuItem>
                  </Select>
                </FormControl>
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

CustomDateRangePicker.propTypes = {
  /** The selected date range value */
  value: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.instanceOf(Date),
      PropTypes.object, // For dayjs objects
    ])
  ),
  /** Callback fired when the date range changes. Receives array [start_date, due_date] where index 0 = start_date, index 1 = due_date */
  onChange: PropTypes.func.isRequired,
  /** Placeholder text (legacy support) */
  placeholder: PropTypes.string,
  /** Placeholder text for start date */
  startDatePlaceholder: PropTypes.string,
  /** Placeholder text for due date */
  dueDatePlaceholder: PropTypes.string,
  /** Whether the picker can be cleared */
  cleanable: PropTypes.bool,
  /** Date format string */
  format: PropTypes.string,
  /** Placement of the dropdown */
  placement: PropTypes.oneOf(['topLeft', 'topRight', 'bottomLeft', 'bottomRight']),
  /** Size of the picker */
  size: PropTypes.oneOf(['large', 'middle', 'small']),
  /** Whether the picker is disabled */
  disabled: PropTypes.bool,
  /** Whether the picker is read-only */
  readOnly: PropTypes.bool,
  /** Whether the picker is in error state */
  error: PropTypes.bool,
  /** Custom styles */
  style: PropTypes.object,
  /** Custom CSS class */
  className: PropTypes.string,
  /** Whether to show only one calendar (useful for mobile) */
  showOneCalendar: PropTypes.bool,
  /** Whether to show duration below the date range picker */
  showDuration: PropTypes.bool,
  /** Size of the duration icon */
  durationIconSize: PropTypes.number,
  /** Typography variant for duration text */
  durationVariant: PropTypes.oneOf([
    'caption',
    'body2',
    'body1',
    'h6',
    'h5',
    'h4',
    'h3',
    'h2',
    'h1',
  ]),
  /** Whether the component is in fullscreen mode */
  isFullscreen: PropTypes.bool,
};
