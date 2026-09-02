'use client';

import PropTypes from 'prop-types';
import dynamic from 'next/dynamic';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import { useRef, useMemo, useState, useEffect, useCallback, useLayoutEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import CircularProgress from '@mui/material/CircularProgress';
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { usePrefersReducedMotion } from 'src/hooks/use-prefers-reduced-motion';

import { groupRestaurantTagsByCategory } from 'src/utils/restaurant-tag-groups';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { readableAccent } from 'src/theme/readable-accent';
import { STEP_RHYTHM, TOUCH_TARGET_SIZE } from 'src/theme/spacing';
import { locationIconForSlug } from 'src/config/onboarding-content';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';
import { fetchSuggestedCreatorsForMunicipality } from 'src/auth/actions/suggested-creators-actions';
import {
  fetchLocationLocalities,
  resolveLocalityFromCoordinates,
} from 'src/auth/actions/location-actions';
import {
  completeOnboarding,
  saveOnboardingFollows,
  saveOnboardingLocation,
  saveUserRestaurantTagPreferences,
} from 'src/auth/actions/onboarding-actions';

import Logo from 'src/components/logo';
import Iconify from 'src/components/iconify';
import { m, AnimatePresence } from 'src/components/animate';

function RestaurantTagPickerLoadState() {
  const { t } = useTranslate();
  return (
    <Box
      role="status"
      sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}
    >
      <CircularProgress
        size={40}
        sx={{ color: (theme) => readableAccent(theme) }}
        aria-label={t('pages.onboarding.a11y.loading_tag_picker')}
      />
    </Box>
  );
}

/** Shared chunk loader — used by `dynamic()` and location-step prefetch. */
const loadRestaurantTagPreferencePicker = () =>
  import('src/components/restaurant-tag-preference-picker');

const RestaurantTagPreferencePicker = dynamic(loadRestaurantTagPreferencePicker, {
  ssr: false,
  loading: RestaurantTagPickerLoadState,
});

/** Non-production diagnostics only — avoids console noise and tiny main-thread cost in prod. */
function devWarn(...args) {
  if (process.env.NODE_ENV === 'development') {
    console.warn(...args);
  }
}

const STEPS = 4;

/** Cozy ease-out curves — confident deceleration, never bounce. */
const EASE_OUT_QUINT = [0.22, 1, 0.36, 1];
const EASE_OUT_QUART = [0.25, 1, 0.5, 1];

/** Reduced-motion is honored at the app root via `MotionConfig reducedMotion="user"` (translates suppressed, opacity kept). */
const stepMotionVariants = {
  enter: (direction) => ({ opacity: 0, x: direction * 16 }),
  center: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.2,
      ease: EASE_OUT_QUINT,
      staggerChildren: 0.035,
      delayChildren: 0.02,
    },
  },
  exit: (direction) => ({
    opacity: 0,
    x: direction * -16,
    transition: { duration: 0.15, ease: EASE_OUT_QUART },
  }),
};

const stepChildVariants = {
  enter: { opacity: 0, y: 8 },
  center: { opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE_OUT_QUINT } },
  exit: { opacity: 0, transition: { duration: 0.1, ease: EASE_OUT_QUART } },
};

/** Short labels for screen reader step announcements (`pages.onboarding.a11y.live_step`). */
const ONBOARDING_STEP_A11Y_LABEL_KEYS = [
  'pages.onboarding.a11y.step_welcome',
  'pages.onboarding.a11y.step_location',
  'pages.onboarding.a11y.step_tags',
  'pages.onboarding.a11y.step_creators',
];

const DRAFT_TAG_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Matches `CITY_ID_RE` in onboarding-actions (city ids may not be RFC v1–v5). */
const ONBOARDING_CITY_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Canonical lowercase UUID for locality ids (matches server `saveOnboardingLocation`). */
function normalizeOnboardingLocalityId(raw) {
  const s = raw != null ? String(raw).trim().toLowerCase() : '';
  return ONBOARDING_CITY_ID_RE.test(s) ? s : '';
}

/** Visually hidden; keeps `aria-live` text out of the visual layout. */
const a11yLiveRegionSx = {
  border: 0,
  margin: -1,
  padding: 0,
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  position: 'absolute',
  whiteSpace: 'nowrap',
  clip: 'rect(0 0 0 0)',
};

const onboardingStepHeadingSx = {
  scrollMarginTop: { xs: 2, sm: 3 },
  // Programmatic focus for step announcements — hide the browser focus ring.
  outline: 'none',
  '&:focus': { outline: 'none' },
};

const filterLocationOptions = createFilterOptions({
  stringify: (option) => `${option.countryGroup} ${option.label}`,
});

/** RPC `list_location_localities` returns active localities (not municipalities); snake_case row shape. */
function localityRowCountryName(row) {
  if (row == null || typeof row !== 'object') return '';
  const v = row.country_name ?? row.countryName;
  return String(v ?? '').trim();
}

function localityRowStateName(row) {
  if (row == null || typeof row !== 'object') return '';
  const v = row.state_name ?? row.stateName;
  return String(v ?? '').trim();
}

/** Display label from RPC row (`locality_name` column). */
function localityRowDisplayName(row) {
  if (row == null || typeof row !== 'object') return '';
  const v = row.locality_name ?? row.localityName;
  return String(v ?? '').trim();
}

/** One locality row per state (for FK + slug); prefers name matching the state. */
function representativeLocalityForState(rows, stateLabel) {
  if (!rows?.length) {
    return null;
  }
  const st = String(stateLabel ?? '')
    .trim()
    .toLowerCase();
  if (st) {
    const byLocality = rows.find((r) => localityRowDisplayName(r).toLowerCase() === st);
    if (byLocality) return byLocality;
    const byState = rows.find((r) => localityRowStateName(r).toLowerCase() === st);
    if (byState) return byState;
  }
  return [...rows].sort((a, b) =>
    localityRowDisplayName(a).localeCompare(localityRowDisplayName(b), undefined, {
      sensitivity: 'base',
    })
  )[0];
}

/**
 * Map a GPS-resolved locality id to the onboarding picker's representative id (one row per state).
 * `locality_for_point` may return a parish-level id that is not itself a picker option.
 */
function onboardingPickerIdForLocality(resolvedId, dbLocations, locationChoices, groupFallbacks) {
  const nid = normalizeOnboardingLocalityId(resolvedId);
  if (!nid || locationChoices.length === 0) {
    return '';
  }
  if (locationChoices.some((c) => c.id === nid)) {
    return nid;
  }
  const row = dbLocations.find((loc) => normalizeOnboardingLocalityId(loc.id) === nid);
  if (!row) {
    return '';
  }
  const { noCountry, noState } = groupFallbacks;
  const countryGroup = localityRowCountryName(row) || noCountry;
  const stateGroup = localityRowStateName(row) || noState;
  const choice = locationChoices.find(
    (c) => c.countryGroup === countryGroup && c.stateGroup === stateGroup
  );
  return choice?.id ?? '';
}

/**
 * Responsive headings: avoid `typography: { xs, sm }` in sx (breaks with MUI style pipeline).
 * Overrides go AFTER the typography spread so the design's heavy weight / tight tracking win
 * (theme.typography.h3–h5 carry their own fontWeight). Plus Jakarta Sans maxes at 800.
 */
function stepSectionTitleSx(theme) {
  return {
    ...theme.typography.h5,
    [theme.breakpoints.up('sm')]: { ...theme.typography.h4 },
    fontWeight: 800,
    lineHeight: 1.15,
    wordBreak: 'break-word',
    letterSpacing: '-0.03em',
  };
}

/** Vertical rhythm inside each step (title / body / controls). Sourced from theme/spacing tokens. */
const STEP_SECTION_SPACING = STEP_RHYTHM.cozy;

const bodyCopySx = {
  fontSize: '1rem',
  lineHeight: 1.65,
  maxWidth: 560,
};

/** Universal web storage (localStorage): browsers, macOS Safari, typical app WebViews. */
const ONBOARDING_DRAFT_VERSION = 4;
const ONBOARDING_DRAFT_PREFIX = 'nomnom.onboarding';

function onboardingDraftStorageKey(userId) {
  const id = userId != null && String(userId).trim() !== '' ? String(userId).trim() : '_';
  return `${ONBOARDING_DRAFT_PREFIX}.v${ONBOARDING_DRAFT_VERSION}:${id}`;
}

function clearOnboardingDraftStorage(userId) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(onboardingDraftStorageKey(userId));
  } catch {
    /* quota / private mode */
  }
}

function onboardingErrorMessage(err, t) {
  if (err == null || String(err).trim() === '') {
    return '';
  }
  const s = String(err).trim();
  if (s === 'Unauthorized' || /^unauthorized$/i.test(s)) {
    return t('pages.onboarding.errors.unauthorized');
  }
  if (s === 'invalid_location') {
    return t('pages.onboarding.errors.invalid_location');
  }
  if (s === 'tag_prefs_save_failed') {
    return t('pages.onboarding.errors.tag_prefs_save_failed');
  }
  if (s === 'gps_outside_supported') {
    return t('pages.onboarding.location.gps_outside_supported');
  }
  if (s === 'gps_resolve_failed') {
    return t('pages.onboarding.location.gps_resolve_failed');
  }
  return t('pages.onboarding.errors.save_failed');
}

function Progress({ active }) {
  const progressTheme = useTheme();
  const prefersReducedMotion = usePrefersReducedMotion();
  return (
    <Stack direction="row" spacing={{ xs: 0.75, sm: 1 }} sx={{ flex: 1, minWidth: 0 }}>
      {Array.from({ length: STEPS }, (_, i) => {
        const filled = i <= active;
        const isCurrent = i === active;
        return (
          <Box
            key={i}
            sx={{
              position: 'relative',
              flex: 1,
              height: { xs: 6, sm: 8 },
              minWidth: 4,
              borderRadius: 999,
              overflow: 'hidden',
              bgcolor: (muiTheme) => alpha(muiTheme.palette.grey[500], 0.22),
            }}
          >
            <Box
              component={prefersReducedMotion ? 'div' : m.div}
              {...(prefersReducedMotion
                ? {}
                : {
                    initial: false,
                    animate: { scaleX: filled ? 1 : 0 },
                    transition: {
                      duration: 0.4,
                      ease: 'easeOut',
                      delay: isCurrent && active > 0 ? 0.08 : 0,
                    },
                  })}
              sx={{
                position: 'absolute',
                inset: 0,
                borderRadius: 999,
                bgcolor: progressTheme.palette.primary.main,
                transformOrigin: 'left center',
                transform: prefersReducedMotion ? `scaleX(${filled ? 1 : 0})` : undefined,
                willChange: prefersReducedMotion ? undefined : 'transform',
              }}
            />
          </Box>
        );
      })}
    </Stack>
  );
}

Progress.propTypes = {
  active: PropTypes.number.isRequired,
};

/** Shared mobile-friendly control styles (touch targets, iOS safe area, cozy press feedback). */
const tapTargetButtonSx = {
  minHeight: { xs: 52, sm: 48 },
  py: { xs: 1.5, sm: 2 },
  fontSize: { xs: '1rem', sm: '1.125rem' },
  borderRadius: { xs: 2, sm: 4 },
  transition:
    'transform 0.15s ease, background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
  '&:active:not(.Mui-disabled)': { transform: 'scale(0.98)' },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
    '&:active:not(.Mui-disabled)': { transform: 'none' },
  },
};

const primaryCtaSx = {
  ...tapTargetButtonSx,
  fontWeight: 800,
  letterSpacing: '-0.01em',
  fontSize: { xs: '1.125rem', sm: '1.25rem' },
  py: { xs: 2, sm: 2.25 },
  minHeight: { xs: 56, sm: 60 },
  borderRadius: { xs: 3.5, sm: 4 },
  bgcolor: 'primary.main',
  color: 'primary.contrastText',
  boxShadow: (theme) => `0 14px 30px ${alpha(theme.palette.primary.main, 0.35)}`,
  '&:hover': {
    bgcolor: 'primary.dark',
    boxShadow: (theme) => `0 18px 38px ${alpha(theme.palette.primary.main, 0.45)}`,
  },
  // Design signature: the trailing icon nudges away from the label on hover.
  // Animate transform (composited) rather than margin-left (triggers layout).
  '& .MuiButton-endIcon': {
    transition: 'transform 0.2s ease',
  },
  '&:hover .MuiButton-endIcon': { transform: 'translateX(6px)' },
  '@media (prefers-reduced-motion: reduce)': {
    '& .MuiButton-endIcon': { transition: 'none' },
    '&:hover .MuiButton-endIcon': { transform: 'none' },
  },
};

/** Keep primary fill visible while saving — default disabled opacity feels like a hang. */
const primaryCtaBusySx = {
  '&.Mui-disabled': {
    bgcolor: 'primary.main',
    color: 'primary.contrastText',
    opacity: 1,
  },
};

/**
 * Playful floating background emoji per step — purely decorative watermarks.
 * Welcome (step 0) stays clean: no floating accents behind the logo/title.
 */
const STEP_DECOR = {
  0: [],
  1: [
    {
      key: 'm',
      emoji: '🗺️',
      sx: { bottom: -28, left: -28, fontSize: 150, opacity: 0.08, transform: 'rotate(-12deg)' },
    },
  ],
  2: [
    {
      key: 'b',
      emoji: '🍔',
      sx: { top: -28, right: -28, fontSize: 150, opacity: 0.08, transform: 'rotate(12deg)' },
    },
  ],
  3: [
    {
      key: 'w',
      emoji: '🪄',
      sx: { top: '12%', right: -36, fontSize: 180, opacity: 0.08, transform: 'rotate(45deg)' },
    },
  ],
};

function StepDecor({ step }) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const items = STEP_DECOR[step] ?? [];
  return items.map((it) => (
    <Box
      key={it.key}
      component={prefersReducedMotion || !it.animate ? 'div' : m.div}
      aria-hidden="true"
      animate={prefersReducedMotion ? undefined : it.animate}
      transition={
        !prefersReducedMotion && it.animate
          ? { duration: it.duration ?? 2.5, repeat: Infinity, ease: 'easeOut' }
          : undefined
      }
      sx={{
        position: 'absolute',
        zIndex: 0,
        pointerEvents: 'none',
        userSelect: 'none',
        lineHeight: 1,
        ...it.sx,
      }}
    >
      {it.emoji}
    </Box>
  ));
}

StepDecor.propTypes = {
  step: PropTypes.number.isRequired,
};

/**
 * Location step's primary "Use my location" action — mirrors the Claude Design
 * mockup: an accent-filled card button with an icon tile and two-line label,
 * shifting through idle → getting → granted states. Keeps the real geolocation
 * wiring (`requestGeo` / `clearGeo`, `geoLoading`, `locationGranted`).
 * When granted, the hint is "Tap to turn off" — click calls `onClear`, not another GPS request.
 */
function LocationGpsButton({ state, onRequest, onClear, t }) {
  const granted = state === 'on';
  const getting = state === 'getting';
  const COPY = {
    on: {
      title: 'pages.onboarding.location.location_on',
      hint: 'pages.onboarding.location.location_on_hint',
    },
    getting: {
      title: 'pages.onboarding.location.getting_location',
      hint: 'pages.onboarding.location.getting_location_hint',
    },
    idle: {
      title: 'pages.onboarding.location.use_location',
      hint: 'pages.onboarding.location.use_location_hint',
    },
  };
  const { title: titleKey, hint: hintKey } = COPY[state] ?? COPY.idle;

  const handleClick = () => {
    if (getting) return;
    if (granted) {
      onClear();
      return;
    }
    onRequest();
  };

  return (
    <Box
      component="button"
      type="button"
      onClick={handleClick}
      aria-busy={getting}
      sx={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        width: '100%',
        textAlign: 'left',
        cursor: getting ? 'default' : 'pointer',
        p: '14px 16px',
        borderRadius: 2.5,
        fontFamily: 'inherit',
        WebkitTapHighlightColor: 'transparent',
        border: '1.5px solid',
        ...(granted
          ? {
              bgcolor: 'background.paper',
              color: theme.palette.success.dark,
              borderColor: theme.palette.success.main,
            }
          : {
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              borderColor: 'primary.main',
              boxShadow: `0 8px 18px -8px ${alpha(theme.palette.primary.main, 0.5)}`,
            }),
        transition: theme.transitions.create(['transform', 'box-shadow', 'background-color'], {
          duration: 200,
          easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        }),
        '&:active:not([aria-busy="true"])': { transform: 'scale(0.98)' },
        '@media (prefers-reduced-motion: reduce)': {
          transition: 'none',
          '&:active': { transform: 'none' },
        },
      })}
    >
      <Box
        aria-hidden="true"
        sx={(theme) => ({
          flex: 'none',
          width: 38,
          height: 38,
          borderRadius: 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: granted
            ? theme.palette.success.lighter
            : alpha(theme.palette.primary.contrastText, 0.22),
          color: granted ? theme.palette.success.dark : 'primary.contrastText',
        })}
      >
        {getting ? (
          <CircularProgress size={20} thickness={5} sx={{ color: 'inherit' }} />
        ) : (
          <Iconify
            icon={granted ? ic.checkCircleBold : ic.mapPointBold}
            width={20}
            sx={{ color: 'inherit' }}
          />
        )}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1px' }}>
        <Box component="span" sx={{ fontSize: 15, fontWeight: 700 }}>
          {t(titleKey)}
        </Box>
        <Box component="span" sx={{ fontSize: 12.5, fontWeight: 500, opacity: 0.78 }}>
          {t(hintKey)}
        </Box>
      </Box>
    </Box>
  );
}

LocationGpsButton.propTypes = {
  state: PropTypes.oneOf(['idle', 'getting', 'on']).isRequired,
  onRequest: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
};

/** Divider with centered label — the mockup's "or pick a city" separator. */
function OrDivider({ label }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.5} sx={{ my: 0.5 }}>
      <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
      <Box
        component="span"
        sx={{
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'text.disabled',
        }}
      >
        {label}
      </Box>
      <Box sx={{ flex: 1, height: '1px', bgcolor: 'divider' }} />
    </Stack>
  );
}

OrDivider.propTypes = {
  label: PropTypes.string.isRequired,
};

export default function OnboardingWizard({ draftUserId = '', initialTags = [] }) {
  const { t } = useTranslate();
  const router = useRouter();
  const { trackEvent } = useAnalytics();
  const persistReadyRef = useRef(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  /** GPS-resolved locality id waiting for the catalog to load before picker mapping. */
  const pendingGeoLocalityRef = useRef('');
  /** One-shot auto geolocation when the Location step first opens this session. */
  const autoGeoAttemptedRef = useRef(false);
  /** Ignores stale `fetchLocationLocalities` results when Retry / Strict Mode overlaps. */
  const locationsFetchGenRef = useRef(0);
  /** Ignores stale `getCurrentPosition` / resolve callbacks after Clear or a newer request. */
  const geoRequestGenRef = useRef(0);
  /** True when the in-flight GPS request was started by auto-geo (not an explicit tap). */
  const geoFromAutoRef = useRef(false);
  /** Ignores stale suggested-creators responses when slug changes / Retry overlaps. */
  const creatorsFetchGenRef = useRef(0);

  const onboardingSkeletonTheme = useSkeletonThemeColors();
  const [step, setStep] = useState(0);

  const stepAnnouncement = useMemo(
    () =>
      t('pages.onboarding.a11y.live_step', {
        current: step + 1,
        total: STEPS,
        label: t(ONBOARDING_STEP_A11Y_LABEL_KEYS[step] ?? ONBOARDING_STEP_A11Y_LABEL_KEYS[0]),
      }),
    [step, t]
  );

  useLayoutEffect(() => {
    const el = document.getElementById('onboarding-step-heading');
    if (el) {
      el.focus();
    }
  }, [step]);

  /** Track step direction for the wizard slide: forward (1) or back (-1). Updated post-render. */
  const prevStepRef = useRef(step);
  const direction = step >= prevStepRef.current ? 1 : -1;
  useEffect(() => {
    prevStepRef.current = step;
  }, [step]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const [creators, setCreators] = useState([]);
  const [creatorsLoading, setCreatorsLoading] = useState(false);
  const [creatorsError, setCreatorsError] = useState(null);
  /** After at least one fetch for step 3 finished (avoids empty-state flash before load starts). */
  const [creatorsFetchSettled, setCreatorsFetchSettled] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState(() => new Set());
  const [selectedLocalityIds, setSelectedLocalityIds] = useState(() => []);
  const [locationGranted, setLocationGranted] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [followIds, setFollowIds] = useState(() => new Set());
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsError, setLocationsError] = useState(null);
  const [dbLocations, setDbLocations] = useState([]);
  const dbLocationsRef = useRef(dbLocations);
  dbLocationsRef.current = dbLocations;
  const locationsErrorRef = useRef(locationsError);
  locationsErrorRef.current = locationsError;
  const selectedLocalityIdsRef = useRef(selectedLocalityIds);
  selectedLocalityIdsRef.current = selectedLocalityIds;

  const loadLocations = useCallback(() => {
    const gen = ++locationsFetchGenRef.current;
    setLocationsLoading(true);
    setLocationsError(null);
    fetchLocationLocalities()
      .then(({ locations: rows, error }) => {
        if (gen !== locationsFetchGenRef.current) return;
        if (error) {
          devWarn('[OnboardingWizard] locations:', error);
          setLocationsError(error);
          setDbLocations([]);
          return;
        }
        setDbLocations(Array.isArray(rows) ? rows : []);
      })
      .catch((e) => {
        if (gen !== locationsFetchGenRef.current) return;
        devWarn('[OnboardingWizard] locations:', e);
        setLocationsError(e?.message ?? 'fetch_failed');
        setDbLocations([]);
      })
      .finally(() => {
        if (gen !== locationsFetchGenRef.current) return;
        setLocationsLoading(false);
      });
  }, []);

  // Load cities once the user reaches Location (or later, e.g. draft resume on
  // tags/creators). Avoid fetching on Welcome so a background failure does not
  // greet them with an instant "Could not load locations" on the next step.
  useEffect(() => {
    if (step < 1) return;
    if (dbLocationsRef.current.length > 0 && !locationsErrorRef.current) return;
    loadLocations();
  }, [step, loadLocations]);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    persistReadyRef.current = false;
    const key = onboardingDraftStorageKey(draftUserId);
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        queueMicrotask(() => {
          persistReadyRef.current = true;
        });
        return;
      }
      const d = JSON.parse(raw);
      if (![1, 2, 3, 4].includes(d.v)) {
        queueMicrotask(() => {
          persistReadyRef.current = true;
        });
        return;
      }
      if (typeof d.step === 'number' && !Number.isNaN(d.step)) {
        let s = Math.min(STEPS - 1, Math.max(0, Math.floor(d.step)));
        if (d.v === 1 || d.v === 2) {
          if (s === 1) s = 2;
          else if (s === 2) s = 1;
        }
        setStep(s);
      }
      if ((d.v === 2 || d.v === 3 || d.v === 4) && Array.isArray(d.selectedTagIds)) {
        const ids = d.selectedTagIds
          .map((x) => (typeof x === 'string' ? x.trim().toLowerCase() : ''))
          .filter((id) => DRAFT_TAG_ID_RE.test(id));
        setSelectedTagIds(new Set(ids));
      } else if (d.v === 1 && Array.isArray(d.selectedCuisines) && initialTags.length > 0) {
        const bySlug = new Map(initialTags.map((row) => [row.slug, row.id]));
        const ids = d.selectedCuisines
          .map((k) => bySlug.get(String(k)))
          .filter((id) => id != null && DRAFT_TAG_ID_RE.test(String(id)))
          .map((id) => String(id).trim().toLowerCase());
        setSelectedTagIds(new Set(ids));
      }
      const draftLocalityIds = Array.isArray(d.selectedLocalityIds) ? d.selectedLocalityIds : null;
      if (draftLocalityIds) {
        setSelectedLocalityIds([
          ...new Set(draftLocalityIds.map((x) => normalizeOnboardingLocalityId(x)).filter(Boolean)),
        ]);
      } else {
        setSelectedLocalityIds([]);
      }
      setLocationGranted(Boolean(d.locationGranted));
      if (Array.isArray(d.followIds)) {
        setFollowIds(
          new Set(
            d.followIds
              .map((x) => (typeof x === 'string' ? x.trim().toLowerCase() : ''))
              .filter((id) => DRAFT_TAG_ID_RE.test(id))
          )
        );
      }
    } catch (e) {
      devWarn('[OnboardingWizard] restore draft failed', e);
    }
    queueMicrotask(() => {
      persistReadyRef.current = true;
    });
    // initialTags from server on first paint — used only for v1 draft migration (slug → tag id).
  }, [draftUserId, initialTags]);

  useEffect(() => {
    // Stop persisting once onboarding is complete (Done step) — the draft is
    // already cleared and we never want to restore users back into the wizard.
    if (typeof window === 'undefined' || !persistReadyRef.current || step >= STEPS) return;
    const key = onboardingDraftStorageKey(draftUserId);
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          v: ONBOARDING_DRAFT_VERSION,
          step,
          selectedTagIds: [...selectedTagIds],
          selectedLocalityIds,
          locationGranted,
          followIds: [...followIds],
        })
      );
    } catch (e) {
      devWarn('[OnboardingWizard] persist draft failed', e);
    }
  }, [draftUserId, step, selectedTagIds, selectedLocalityIds, locationGranted, followIds]);

  useEffect(() => {
    const stepKeys = ['welcome', 'location', 'tags', 'creators'];
    trackEvent('onboarding_step_viewed', {
      step,
      step_key: stepKeys[step] ?? String(step),
    });
  }, [step, trackEvent]);

  const preferenceTagSections = useMemo(
    () => groupRestaurantTagsByCategory(initialTags),
    [initialTags]
  );

  const locationChoices = useMemo(() => {
    const noCountry = t('pages.onboarding.location.locations_group_no_country');
    const noState = t('pages.onboarding.location.locations_group_no_state');
    const bucket = new Map();
    dbLocations.forEach((muni) => {
      const nid = normalizeOnboardingLocalityId(muni.id);
      if (!nid) {
        return;
      }
      const row = { ...muni, id: nid };
      const countryGroup = localityRowCountryName(row) || noCountry;
      const stateGroup = localityRowStateName(row) || noState;
      const key = `${countryGroup}\0${stateGroup}`;
      if (!bucket.has(key)) {
        bucket.set(key, []);
      }
      bucket.get(key).push(row);
    });
    const rows = [...bucket.entries()].map(([key, muniRows]) => {
      const [countryGroup, stateGroup] = key.split('\0');
      const rep = representativeLocalityForState(
        muniRows,
        stateGroup === noState ? '' : stateGroup
      );
      const muni = rep ?? muniRows[0];
      const label =
        stateGroup === noState ? localityRowDisplayName(muni) || String(muni.id) : stateGroup;
      const localitySlug = String(muni.locality_slug ?? muni.localitySlug ?? '');
      const municipalitySlug = String(muni.municipality_slug ?? muni.municipalitySlug ?? '');
      return {
        id: muni.id,
        locality_slug: localitySlug,
        municipality_slug: municipalitySlug,
        label,
        countryGroup,
        stateGroup,
        icon: locationIconForSlug(
          municipalitySlug || localitySlug,
          '',
          muni.country_name ?? muni.countryName
        ),
      };
    });
    const rank = (o) => (o.countryGroup === noCountry ? 4 : 0) + (o.stateGroup === noState ? 2 : 0);
    return rows.sort((a, b) => {
      const ra = rank(a);
      const rb = rank(b);
      if (ra !== rb) return ra - rb;
      const byCo = a.countryGroup.localeCompare(b.countryGroup, undefined, { sensitivity: 'base' });
      if (byCo !== 0) return byCo;
      return a.label.localeCompare(b.label, undefined, { sensitivity: 'base' });
    });
  }, [dbLocations, t]);

  const locationGroupFallbacks = useMemo(
    () => ({
      noCountry: t('pages.onboarding.location.locations_group_no_country'),
      noState: t('pages.onboarding.location.locations_group_no_state'),
    }),
    [t]
  );

  useEffect(() => {
    if (locationChoices.length === 0) return;
    const allowed = new Set(locationChoices.map((c) => c.id));
    setSelectedLocalityIds((prev) => {
      const next = [
        ...new Set(
          prev
            .map((id) => {
              const nid = normalizeOnboardingLocalityId(id);
              if (!nid) return '';
              if (allowed.has(nid)) return nid;
              return onboardingPickerIdForLocality(
                nid,
                dbLocations,
                locationChoices,
                locationGroupFallbacks
              );
            })
            .filter(Boolean)
        ),
      ];
      if (
        next.length === prev.length &&
        next.every((id, i) => normalizeOnboardingLocalityId(prev[i]) === id)
      ) {
        return prev;
      }
      return next;
    });
  }, [dbLocations, locationChoices, locationGroupFallbacks]);

  useEffect(() => {
    const pending = pendingGeoLocalityRef.current;
    if (!pending || locationChoices.length === 0) {
      return;
    }
    const pickerId = onboardingPickerIdForLocality(
      pending,
      dbLocations,
      locationChoices,
      locationGroupFallbacks
    );
    if (!pickerId) {
      // Catalog is ready but GPS id does not map to a picker chip.
      pendingGeoLocalityRef.current = '';
      setErr('gps_outside_supported');
      return;
    }
    pendingGeoLocalityRef.current = '';
    setSelectedLocalityIds((prev) => [pickerId, ...prev.filter((x) => x !== pickerId)]);
  }, [dbLocations, locationChoices, locationGroupFallbacks]);

  const creatorMunicipalitySlug = useMemo(() => {
    const primaryId = selectedLocalityIds[0];
    const c = primaryId ? locationChoices.find((x) => x.id === primaryId) : null;
    return c?.municipality_slug ?? '';
  }, [locationChoices, selectedLocalityIds]);

  const selectedLocationsOrdered = useMemo(
    () => selectedLocalityIds.map((id) => locationChoices.find((c) => c.id === id)).filter(Boolean),
    [selectedLocalityIds, locationChoices]
  );

  const loadSuggestedCreators = useCallback(
    (abortSignal) => {
      const gen = ++creatorsFetchGenRef.current;
      setCreators([]);
      setCreatorsLoading(true);
      setCreatorsError(null);
      setCreatorsFetchSettled(false);
      const slug = creatorMunicipalitySlug;
      fetchSuggestedCreatorsForMunicipality(slug)
        .then(({ creators: rows, error }) => {
          if (abortSignal?.aborted || gen !== creatorsFetchGenRef.current) return;
          if (error) {
            devWarn('[OnboardingWizard] suggested creators:', error);
            setCreatorsError(error);
            setCreators([]);
            return;
          }
          setCreators(Array.isArray(rows) ? rows : []);
        })
        .catch((e) => {
          if (abortSignal?.aborted || gen !== creatorsFetchGenRef.current) return;
          devWarn('[OnboardingWizard] suggested creators:', e);
          setCreatorsError(e?.message ?? 'fetch_failed');
          setCreators([]);
        })
        .finally(() => {
          if (abortSignal?.aborted || gen !== creatorsFetchGenRef.current) return;
          setCreatorsLoading(false);
          setCreatorsFetchSettled(true);
        });
    },
    [creatorMunicipalitySlug]
  );

  const shouldLoadCreators = step >= 2 && step <= 3;
  /** Wait for city catalog/remap so we never prefetch creators with an empty slug by accident. */
  const creatorsSlugReady =
    !locationsLoading &&
    !(selectedLocalityIds.length > 0 && locationChoices.length === 0 && !locationsError);

  useEffect(() => {
    // Prefetch on tags (2) so creators are warm when advancing — avoid double wait
    // (save network + skeleton) on the creators step. Depend on the boolean so
    // step 2 → 3 does not abort/refetch.
    if (!shouldLoadCreators || !creatorsSlugReady) {
      if (!shouldLoadCreators) {
        setCreators([]);
        setCreatorsLoading(false);
        setCreatorsError(null);
        setCreatorsFetchSettled(false);
      }
      return undefined;
    }
    const ac = new AbortController();
    loadSuggestedCreators(ac.signal);
    return () => {
      ac.abort();
    };
  }, [shouldLoadCreators, creatorsSlugReady, creatorMunicipalitySlug, loadSuggestedCreators]);

  useEffect(() => {
    if (!creatorsFetchSettled || creatorsLoading || creatorsError) return;
    const allowed = new Set(
      creators
        .map((c) => (c.userId != null ? String(c.userId).trim().toLowerCase() : ''))
        .filter((id) => DRAFT_TAG_ID_RE.test(id))
    );
    setFollowIds((prev) => {
      let changed = false;
      const next = new Set();
      prev.forEach((id) => {
        if (allowed.has(id)) next.add(id);
        else changed = true;
      });
      return changed ? next : prev;
    });
  }, [creators, creatorsFetchSettled, creatorsLoading, creatorsError]);

  /** Warm the tags picker chunk on the location step so step 2 isn't blocked on import. */
  useEffect(() => {
    if (step !== 1) return undefined;
    let cancelled = false;
    loadRestaurantTagPreferencePicker().catch(() => {
      if (!cancelled) {
        /* ignore — dynamic() will retry on render */
      }
    });
    return () => {
      cancelled = true;
    };
  }, [step]);

  const onPreferenceSelectedIdsChange = useCallback((updater) => {
    setSelectedTagIds((prev) => updater(prev));
  }, []);

  const toggleFollow = useCallback((userId) => {
    if (!userId) return;
    const id = String(userId).trim().toLowerCase();
    if (!DRAFT_TAG_ID_RE.test(id)) return;
    setFollowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const finishAndExit = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await completeOnboarding();
      if (r.error) {
        setErr(r.error);
        return;
      }
      trackEvent('onboarding_completed', { path: 'skip', from_step: step });
      clearOnboardingDraftStorage(draftUserId);
      router.replace(paths.dashboard.discover);
    } catch (e) {
      devWarn('[OnboardingWizard] skip/complete failed', e);
      setErr('save_failed');
    } finally {
      setBusy(false);
    }
  }, [draftUserId, router, step, trackEvent]);

  const onSkip = useCallback(async () => {
    await finishAndExit();
  }, [finishAndExit]);

  const onNextFromWelcome = useCallback(() => {
    setStep(1);
  }, []);

  const onBack = useCallback(() => {
    if (busy) return;
    setErr(null);
    setStep((s) => (s > 0 ? s - 1 : s));
  }, [busy]);

  const onNextFromTags = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await saveUserRestaurantTagPreferences([...selectedTagIds]);
      if (r.error) {
        setErr(r.error);
        return;
      }
      setStep(3);
    } catch (e) {
      devWarn('[OnboardingWizard] save tag prefs failed', e);
      setErr('tag_prefs_save_failed');
    } finally {
      setBusy(false);
    }
  }, [selectedTagIds]);

  const handleLocationsAutocompleteChange = useCallback((_, newValue) => {
    const arr = Array.isArray(newValue) ? newValue : [];
    setSelectedLocalityIds([
      ...new Set(arr.map((o) => normalizeOnboardingLocalityId(o?.id)).filter(Boolean)),
    ]);
    setErr((prev) =>
      prev === 'gps_outside_supported' || prev === 'gps_resolve_failed' ? null : prev
    );
  }, []);

  const applyGeoResolvedLocality = useCallback(
    (resolvedId) => {
      const nid = normalizeOnboardingLocalityId(resolvedId);
      if (!nid) {
        return;
      }
      const pickerId = onboardingPickerIdForLocality(
        nid,
        dbLocations,
        locationChoices,
        locationGroupFallbacks
      );
      if (pickerId) {
        pendingGeoLocalityRef.current = '';
        setErr((prev) =>
          prev === 'gps_outside_supported' || prev === 'gps_resolve_failed' ? null : prev
        );
        setSelectedLocalityIds((prev) => [pickerId, ...prev.filter((x) => x !== pickerId)]);
        return;
      }
      pendingGeoLocalityRef.current = nid;
      if (locationChoices.length > 0) {
        setErr('gps_outside_supported');
      }
    },
    [dbLocations, locationChoices, locationGroupFallbacks]
  );

  /** Turns off the GPS "location is on" state (hint: Tap to turn off). Keeps manual city picks. */
  const clearGeo = useCallback(() => {
    geoRequestGenRef.current += 1;
    geoFromAutoRef.current = false;
    // Prevent auto-geo from immediately re-requesting after an explicit clear.
    autoGeoAttemptedRef.current = true;
    setLocationGranted(false);
    setGeoLoading(false);
    pendingGeoLocalityRef.current = '';
    setErr(null);
  }, []);

  /**
   * Request device geolocation and map coords → locality chip.
   * @param {{ fromAuto?: boolean }} [options] - `fromAuto: true` for the one-shot
   *   Location-step prompt; when the user already picked a city while GPS was in
   *   flight, auto results are ignored so we never override their primary.
   */
  const requestGeo = useCallback(
    (options = {}) => {
      if (!navigator.geolocation) {
        setLocationGranted(false);
        pendingGeoLocalityRef.current = '';
        return;
      }
      const fromAuto = Boolean(options?.fromAuto);
      const gen = ++geoRequestGenRef.current;
      geoFromAutoRef.current = fromAuto;
      setErr(null);
      setGeoLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (gen !== geoRequestGenRef.current) return;
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          try {
            const { location: matched, error } = await resolveLocalityFromCoordinates(lng, lat);
            if (gen !== geoRequestGenRef.current) return;
            // Auto-geo lost the race to a manual city pick — leave their selection alone.
            if (geoFromAutoRef.current && selectedLocalityIdsRef.current.length > 0) {
              return;
            }
            // Coords obtained (permission granted). Keep "Location is on" even when
            // resolve fails / is outside coverage so the user can clear or pick manually.
            setLocationGranted(true);
            if (error) {
              // Network/RPC failure — not the same as "coords outside supported area".
              devWarn('[OnboardingWizard] resolve locality:', error);
              setErr('gps_resolve_failed');
              return;
            }
            if (matched?.id) {
              applyGeoResolvedLocality(matched.id);
              return;
            }
            // Coords ok but no supported locality — button stays "on"; user must pick a city.
            setErr('gps_outside_supported');
          } finally {
            if (gen === geoRequestGenRef.current) {
              setGeoLoading(false);
            }
          }
        },
        () => {
          if (gen !== geoRequestGenRef.current) return;
          setLocationGranted(false);
          pendingGeoLocalityRef.current = '';
          setGeoLoading(false);
        },
        { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 }
      );
    },
    [applyGeoResolvedLocality]
  );

  /**
   * Auto-request device location after the city catalog is ready so a GPS match
   * can select a chip immediately (and the “outside supported area” hint does
   * not appear under the CTA while cities are still loading).
   * Skip when the user already has a city (draft restore or manual pick).
   */
  useEffect(() => {
    if (step !== 1) return;
    if (!persistReadyRef.current) return;
    if (autoGeoAttemptedRef.current) return;
    if (locationsLoading || locationsError) return;
    if (locationChoices.length === 0) return;
    if (geoLoading) return;
    if (locationGranted) {
      // Draft restored "Location is on" — do not re-prompt on clear later.
      autoGeoAttemptedRef.current = true;
      return;
    }
    if (selectedLocalityIds.length > 0) {
      autoGeoAttemptedRef.current = true;
      return;
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      autoGeoAttemptedRef.current = true;
      return;
    }
    autoGeoAttemptedRef.current = true;
    requestGeo({ fromAuto: true });
  }, [
    step,
    locationGranted,
    geoLoading,
    locationsLoading,
    locationsError,
    locationChoices.length,
    selectedLocalityIds.length,
    requestGeo,
  ]);

  const onNextFromLocation = useCallback(async () => {
    if (selectedLocalityIds.length === 0) {
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const r = await saveOnboardingLocation({
        localityIds: selectedLocalityIds,
        locationPermissionGranted: locationGranted,
      });
      if (r.error) {
        setErr(r.error);
        return;
      }
      setStep(2);
    } catch (e) {
      devWarn('[OnboardingWizard] save location failed', e);
      setErr('save_failed');
    } finally {
      setBusy(false);
    }
  }, [locationGranted, selectedLocalityIds]);

  const onFinish = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const fr = await saveOnboardingFollows([...followIds]);
      if (fr.error) {
        setErr(fr.error);
        return;
      }
      const cr = await completeOnboarding();
      if (cr.error) {
        setErr(cr.error);
        return;
      }
      trackEvent('onboarding_completed', { path: 'full', from_step: step });
      clearOnboardingDraftStorage(draftUserId);
      // Go straight to Discover. `completeOnboarding` revalidates the onboarding
      // layout (which redirects when completed) — a client-only "Done" step would
      // flash for a moment then get yanked away.
      router.replace(paths.dashboard.discover);
    } catch (e) {
      devWarn('[OnboardingWizard] finish failed', e);
      setErr('save_failed');
    } finally {
      setBusy(false);
    }
  }, [draftUserId, followIds, router, step, trackEvent]);

  let gpsState = 'idle';
  if (geoLoading) gpsState = 'getting';
  else if (locationGranted) gpsState = 'on';

  /** True while creators are loading or waiting for the city slug before the first fetch. */
  const creatorsPending = creatorsLoading || (!creatorsFetchSettled && !creatorsError);

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: { xs: '100dvh', sm: '100vh' },
        bgcolor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
        px: { xs: 2, sm: 3 },
        pt: { xs: 'max(12px, env(safe-area-inset-top, 0px))', sm: 2.5 },
        pb: { xs: 'max(16px, env(safe-area-inset-bottom, 0px))', sm: 4 },
        maxWidth: '100%',
        overflowX: 'hidden',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <StepDecor step={step} />
      {step >= 1 && step <= 3 ? (
        <Stack
          direction="row"
          alignItems="center"
          spacing={{ xs: 0.5, sm: 1 }}
          sx={{
            mb: { xs: 2.5, sm: 3.5 },
            zIndex: 1,
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              width: TOUCH_TARGET_SIZE,
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {step > 0 ? (
              <Button
                size="small"
                variant="text"
                onClick={onBack}
                disabled={busy}
                aria-label={t('pages.onboarding.back')}
                sx={{
                  color: 'text.secondary',
                  fontWeight: 800,
                  minWidth: TOUCH_TARGET_SIZE,
                  minHeight: TOUCH_TARGET_SIZE,
                  px: { xs: 0.5, sm: 1 },
                  py: 0.5,
                  borderRadius: 2,
                  WebkitTapHighlightColor: 'transparent',
                  '&:active': { bgcolor: 'action.hover' },
                }}
              >
                <Iconify
                  icon={ic.arrowLeftLinear}
                  sx={{
                    width: { xs: 18, sm: 20 },
                    height: { xs: 18, sm: 20 },
                    color: 'inherit',
                  }}
                />
              </Button>
            ) : null}
          </Box>
          <Progress active={step} />
          <Button
            size="small"
            onClick={onSkip}
            disabled={busy}
            aria-busy={busy}
            startIcon={
              busy ? <CircularProgress size={14} color="inherit" thickness={5} /> : undefined
            }
            sx={{
              color: 'text.secondary',
              fontWeight: 800,
              letterSpacing: '0.08em',
              fontSize: { xs: 10, sm: 11 },
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              minWidth: TOUCH_TARGET_SIZE,
              minHeight: TOUCH_TARGET_SIZE,
              px: { xs: 0.5, sm: 1 },
              WebkitTapHighlightColor: 'transparent',
              '&:active': { bgcolor: 'action.hover' },
            }}
          >
            {t('pages.onboarding.skip')}
          </Button>
        </Stack>
      ) : null}

      <Box
        component="section"
        aria-labelledby="onboarding-step-heading"
        sx={{
          flex: 1,
          zIndex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          pb: { xs: 1.5, sm: 0 },
        }}
      >
        <Typography component="p" aria-live="polite" aria-atomic="true" sx={a11yLiveRegionSx}>
          {stepAnnouncement}
        </Typography>
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          {step === 0 && (
            <Box
              key="step-welcome"
              component={m.div}
              custom={direction}
              variants={stepMotionVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <Stack
                spacing={2}
                sx={{
                  alignItems: 'center',
                  textAlign: 'center',
                  justifyContent: 'center',
                  minHeight: { xs: '62vh', sm: '60vh' },
                  px: 1,
                }}
              >
                <Box
                  component={prefersReducedMotion ? 'div' : m.div}
                  variants={stepChildVariants}
                  animate={prefersReducedMotion ? undefined : { y: [0, -5, 0] }}
                  transition={
                    prefersReducedMotion
                      ? undefined
                      : { duration: 4, repeat: Infinity, ease: 'easeOut' }
                  }
                >
                  <Logo disabledLink sx={{ width: { xs: 168, sm: 188 }, height: 'auto' }} />
                </Box>
                <Box component={m.div} variants={stepChildVariants}>
                  <Typography
                    id="onboarding-step-heading"
                    tabIndex={-1}
                    component="h1"
                    variant="h4"
                    sx={(muiTheme) => ({
                      ...muiTheme.typography.h4,
                      [muiTheme.breakpoints.up('sm')]: { ...muiTheme.typography.h3 },
                      fontWeight: 800,
                      lineHeight: 1.15,
                      letterSpacing: '-0.02em',
                      textWrap: 'balance',
                      ...onboardingStepHeadingSx,
                    })}
                  >
                    {t('pages.onboarding.welcome.title_prefix')}
                    <Box
                      component="span"
                      sx={{
                        color: (theme) => readableAccent(theme),
                        fontStyle: 'italic',
                        fontWeight: 800,
                      }}
                    >
                      {t('pages.onboarding.welcome.title_highlight')}
                    </Box>
                    {t('pages.onboarding.welcome.title_suffix')}
                  </Typography>
                </Box>
                <Box component={m.div} variants={stepChildVariants}>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ ...bodyCopySx, mx: 'auto', maxWidth: 300 }}
                  >
                    {t('pages.onboarding.welcome.subtitle')}
                  </Typography>
                </Box>
                <Stack
                  component={m.div}
                  variants={stepChildVariants}
                  direction="row"
                  alignItems="center"
                  spacing={1.25}
                  sx={{ mt: 1 }}
                >
                  <Box sx={{ display: 'flex' }} aria-hidden="true">
                    {[
                      { initial: 'M', color: 'primary' },
                      { initial: 'Y', color: 'info' },
                      { initial: 'S', color: 'success' },
                      { initial: 'D', color: 'warning' },
                    ].map((a, i) => (
                      <Box
                        key={a.initial}
                        sx={(muiTheme) => ({
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          ml: i === 0 ? 0 : '-9px',
                          bgcolor: `${a.color}.main`,
                          color: `${a.color}.contrastText`,
                          fontSize: 13,
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `2px solid ${muiTheme.palette.background.default}`,
                        })}
                      >
                        {a.initial}
                      </Box>
                    ))}
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                    {t('pages.onboarding.welcome.social_proof')}
                  </Typography>
                </Stack>
              </Stack>
            </Box>
          )}

          {step === 2 && (
            <Box
              key="step-tags"
              component={m.div}
              custom={direction}
              variants={stepMotionVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <Stack spacing={STEP_SECTION_SPACING}>
                <Box component={m.div} variants={stepChildVariants}>
                  <Typography
                    id="onboarding-step-heading"
                    tabIndex={-1}
                    component="h2"
                    sx={(muiTheme) => ({
                      ...stepSectionTitleSx(muiTheme),
                      ...onboardingStepHeadingSx,
                    })}
                  >
                    {t('pages.onboarding.tags.title_prefix')}{' '}
                    <Box
                      component="span"
                      sx={{
                        color: (theme) => readableAccent(theme),
                        fontStyle: 'italic',
                        textTransform: 'uppercase',
                        fontWeight: 800,
                      }}
                    >
                      {t('pages.onboarding.tags.title_highlight')}
                    </Box>
                    {t('pages.onboarding.tags.title_suffix')}
                  </Typography>
                </Box>
                <Box component={m.div} variants={stepChildVariants}>
                  <Typography variant="body1" color="text.secondary" sx={bodyCopySx}>
                    {t('pages.onboarding.tags.body')}
                  </Typography>
                </Box>
                <Box component={m.div} variants={stepChildVariants}>
                  <RestaurantTagPreferencePicker
                    tagSections={preferenceTagSections}
                    selectedIds={selectedTagIds}
                    onSelectedIdsChange={onPreferenceSelectedIdsChange}
                    emptyMessage={t('pages.dashboard.map.filter_sheet_empty')}
                    disablePortal={false}
                  />
                </Box>
              </Stack>
            </Box>
          )}

          {step === 1 && (
            <Box
              key="step-location"
              component={m.div}
              custom={direction}
              variants={stepMotionVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <Stack spacing={STEP_SECTION_SPACING}>
                <Box component={m.div} variants={stepChildVariants}>
                  <Typography
                    id="onboarding-step-heading"
                    tabIndex={-1}
                    component="h2"
                    sx={(muiTheme) => ({
                      ...stepSectionTitleSx(muiTheme),
                      ...onboardingStepHeadingSx,
                    })}
                  >
                    {t('pages.onboarding.location.title')}
                  </Typography>
                </Box>
                <Box component={m.div} variants={stepChildVariants}>
                  <Typography variant="body1" color="text.secondary" sx={bodyCopySx}>
                    {t('pages.onboarding.location.body')}
                  </Typography>
                </Box>
                <Box component={m.div} variants={stepChildVariants}>
                  <Stack spacing={1.75}>
                    <LocationGpsButton
                      state={gpsState}
                      onRequest={requestGeo}
                      onClear={clearGeo}
                      t={t}
                    />
                    <OrDivider label={t('pages.onboarding.location.or_pick_city')} />
                    {(err === 'gps_outside_supported' || err === 'gps_resolve_failed') &&
                    !locationsLoading &&
                    !locationsError &&
                    locationChoices.length > 0 ? (
                      <Alert
                        severity="info"
                        variant="outlined"
                        role="status"
                        sx={{
                          px: { xs: 0.5, sm: 1 },
                          py: 1.25,
                          fontWeight: 600,
                          lineHeight: 1.55,
                          width: '100%',
                          '& .MuiAlert-message': { width: 1 },
                        }}
                      >
                        {onboardingErrorMessage(err, t)}
                      </Alert>
                    ) : null}
                  </Stack>
                </Box>
                {locationsLoading ? (
                  <Box
                    sx={(muiTheme) => ({
                      mt: 0,
                      borderRadius: 2,
                      borderWidth: 2,
                      borderStyle: 'solid',
                      borderColor: alpha(muiTheme.palette.primary.main, 0.35),
                      bgcolor: alpha(muiTheme.palette.primary.main, 0.06),
                      px: { xs: 2, sm: 3 },
                      py: { xs: 2, sm: 2.25 },
                    })}
                    aria-busy="true"
                  >
                    <SkeletonTheme
                      baseColor={onboardingSkeletonTheme.baseColor}
                      highlightColor={onboardingSkeletonTheme.highlightColor}
                    >
                      <Stack spacing={0}>
                        {Array.from({ length: 6 }, (_, i) => (
                          <Stack
                            key={i}
                            direction="row"
                            alignItems="center"
                            spacing={1.5}
                            sx={{ py: 1.15, px: 0.5 }}
                          >
                            <Skeleton circle width={40} height={40} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Skeleton
                                height={17}
                                width={`${62 + (i % 4) * 8}%`}
                                borderRadius={4}
                              />
                              <Skeleton
                                height={13}
                                width="38%"
                                borderRadius={4}
                                style={{ marginTop: 6 }}
                              />
                            </Box>
                          </Stack>
                        ))}
                      </Stack>
                    </SkeletonTheme>
                  </Box>
                ) : null}
                {!locationsLoading && locationsError ? (
                  <Stack spacing={1}>
                    <Alert severity="error" variant="outlined" role="alert">
                      {t('pages.onboarding.location.locations_error')}
                    </Alert>
                    <Button
                      variant="outlined"
                      onClick={loadLocations}
                      disabled={busy}
                      sx={{ ...tapTargetButtonSx, fontWeight: 700 }}
                    >
                      {t('pages.onboarding.location.locations_retry')}
                    </Button>
                  </Stack>
                ) : null}
                {!locationsLoading && !locationsError && locationChoices.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    {t('pages.onboarding.location.locations_empty')}
                  </Typography>
                ) : null}
                {!locationsLoading && !locationsError && locationChoices.length > 0 ? (
                  <Autocomplete
                    multiple
                    disableCloseOnSelect
                    options={locationChoices}
                    value={selectedLocationsOrdered}
                    onChange={handleLocationsAutocompleteChange}
                    groupBy={(option) => option.countryGroup}
                    getOptionKey={(option) => option.id}
                    getOptionLabel={(o) => o.label}
                    isOptionEqualToValue={(a, b) => a?.id === b?.id}
                    filterSelectedOptions={false}
                    filterOptions={filterLocationOptions}
                    renderGroup={(params) => (
                      <li key={params.key}>
                        <Typography
                          variant="overline"
                          component="div"
                          className="MuiAutocomplete-groupLabel"
                          sx={{
                            display: 'block',
                            px: 1.5,
                            pt: 1.25,
                            pb: 0.25,
                            fontWeight: 800,
                            letterSpacing: '0.08em',
                            color: 'text.secondary',
                            bgcolor: (muiTheme) => alpha(muiTheme.palette.grey[500], 0.12),
                          }}
                        >
                          {params.group}
                        </Typography>
                        <Box
                          component="ul"
                          className="MuiAutocomplete-groupUl"
                          sx={{
                            p: 0,
                            m: 0,
                            listStyle: 'none',
                          }}
                        >
                          {params.children}
                        </Box>
                      </li>
                    )}
                    renderOption={(props, option, { selected }) => {
                      // MUI Autocomplete: props includes key/style for the option row.
                      // eslint-disable-next-line react/prop-types -- not a component; false positive on destructure
                      const { key, style, ...optionProps } = props;
                      return (
                        <li
                          key={key}
                          {...optionProps}
                          style={{ display: 'flex', alignItems: 'center', ...style }}
                        >
                          <Checkbox
                            size="small"
                            checked={selected}
                            sx={{ mr: 1, p: 0.25 }}
                            tabIndex={-1}
                            disableRipple
                          />
                          <Typography
                            component="span"
                            variant="body2"
                            sx={{ fontWeight: selected ? 800 : 500, flex: 1, minWidth: 0 }}
                          >
                            {option.label}
                          </Typography>
                        </li>
                      );
                    }}
                    renderTags={(value, getCustomizedItemProps) =>
                      value.map((option, index) => {
                        if (option == null) {
                          return null;
                        }
                        const { key: _tagKey, ...chipProps } = getCustomizedItemProps({ index });
                        return (
                          <Chip
                            {...chipProps}
                            key={option.id}
                            size="small"
                            label={option.label}
                            sx={{ fontWeight: 700 }}
                          />
                        );
                      })
                    }
                    renderInput={(params) => {
                      const ph = t('pages.onboarding.location.locations_search_placeholder');
                      return (
                        <TextField
                          {...params}
                          label={t('pages.onboarding.location.locations_select_label')}
                          placeholder={ph}
                          InputLabelProps={{ ...params.InputLabelProps, shrink: true }}
                          inputProps={{
                            ...params.inputProps,
                            placeholder: ph,
                          }}
                        />
                      );
                    }}
                    slotProps={{
                      listbox: {
                        sx: { maxHeight: 400, py: 0.5 },
                      },
                    }}
                    sx={{
                      width: '100%',
                      '& .MuiOutlinedInput-root': {
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        minHeight: { xs: 108, sm: 120 },
                        pt: 2,
                        pb: 1.5,
                        px: 1.25,
                      },
                      '& .MuiAutocomplete-input': {
                        flexGrow: 1,
                        minWidth: '9rem',
                        py: 0.85,
                        boxSizing: 'content-box',
                        fontSize: '1rem',
                        '&::placeholder': {
                          opacity: 1,
                          color: 'text.secondary',
                        },
                      },
                    }}
                  />
                ) : null}
              </Stack>
            </Box>
          )}

          {step === 3 ? (
            <Box
              key="step-creators"
              component={m.div}
              custom={direction}
              variants={stepMotionVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <Stack spacing={STEP_SECTION_SPACING}>
                <Box component={m.div} variants={stepChildVariants}>
                  <Typography
                    id="onboarding-step-heading"
                    tabIndex={-1}
                    component="h2"
                    sx={(muiTheme) => ({
                      ...stepSectionTitleSx(muiTheme),
                      ...onboardingStepHeadingSx,
                    })}
                  >
                    {t('pages.onboarding.creators.title')}
                  </Typography>
                </Box>
                <Box component={m.div} variants={stepChildVariants}>
                  <Typography variant="body1" color="text.secondary" sx={bodyCopySx}>
                    {t('pages.onboarding.creators.body')}
                  </Typography>
                </Box>
                {creatorsPending ? (
                  <Box
                    sx={(muiTheme) => ({
                      mt: 0,
                      borderRadius: 2,
                      borderWidth: 2,
                      borderStyle: 'solid',
                      borderColor: alpha(muiTheme.palette.primary.main, 0.35),
                      bgcolor: alpha(muiTheme.palette.primary.main, 0.06),
                      px: { xs: 2, sm: 3 },
                      py: { xs: 2, sm: 2.25 },
                    })}
                    aria-busy="true"
                  >
                    <SkeletonTheme
                      baseColor={onboardingSkeletonTheme.baseColor}
                      highlightColor={onboardingSkeletonTheme.highlightColor}
                    >
                      <Stack spacing={2.25}>
                        {Array.from({ length: 3 }, (_, i) => (
                          <Stack
                            key={i}
                            direction={{ xs: 'column', sm: 'row' }}
                            alignItems={{ xs: 'stretch', sm: 'center' }}
                            justifyContent="space-between"
                            spacing={{ xs: 2, sm: 0 }}
                            sx={{
                              p: { xs: 2, sm: 2.25 },
                              borderRadius: { xs: 2, sm: 4 },
                              border: '2px solid',
                              borderColor: 'divider',
                              bgcolor: 'background.paper',
                            }}
                          >
                            <Stack
                              direction="row"
                              spacing={2}
                              alignItems="center"
                              sx={{ minWidth: 0, flex: { sm: 1 } }}
                            >
                              <Skeleton
                                width={56}
                                height={56}
                                borderRadius={8}
                                style={{ flexShrink: 0 }}
                              />
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Skeleton height={20} width={`${58 + i * 6}%`} borderRadius={4} />
                                <Skeleton
                                  height={14}
                                  width="55%"
                                  borderRadius={4}
                                  style={{ marginTop: 8 }}
                                />
                              </Box>
                            </Stack>
                            <Box
                              sx={{
                                width: { xs: '100%', sm: 100 },
                                alignSelf: { xs: 'stretch', sm: 'center' },
                                flexShrink: 0,
                              }}
                            >
                              <Skeleton height={44} width="100%" borderRadius={8} />
                            </Box>
                          </Stack>
                        ))}
                      </Stack>
                    </SkeletonTheme>
                  </Box>
                ) : null}
                {!creatorsPending && creatorsError ? (
                  <Stack spacing={1}>
                    <Alert severity="error" variant="outlined" role="alert">
                      {t('pages.onboarding.creators.fetch_error')}
                    </Alert>
                    <Button
                      variant="outlined"
                      onClick={() => loadSuggestedCreators()}
                      disabled={busy}
                      sx={{ ...tapTargetButtonSx, fontWeight: 700 }}
                    >
                      {t('pages.onboarding.creators.retry')}
                    </Button>
                  </Stack>
                ) : null}
                {!creatorsPending &&
                !creatorsError &&
                creatorsFetchSettled &&
                creators.length === 0 ? (
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={2}
                    sx={{
                      p: { xs: 2, sm: 2.25 },
                      borderRadius: { xs: 2, sm: 4 },
                      border: '2px solid',
                      borderColor: 'divider',
                      bgcolor: 'background.paper',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <Avatar
                      variant="rounded"
                      alt=""
                      sx={{
                        width: { xs: 56, sm: 64 },
                        height: { xs: 56, sm: 64 },
                        flexShrink: 0,
                        bgcolor: (muiTheme) => alpha(muiTheme.palette.grey[500], 0.14),
                      }}
                    >
                      <Iconify
                        icon={ic.userSpeakRoundedBold}
                        width={28}
                        sx={{ color: 'text.secondary' }}
                      />
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontWeight: 800, wordBreak: 'break-word' }}>
                        {t('pages.onboarding.creators.empty_title')}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', lineHeight: 1.35 }}
                      >
                        {t('pages.onboarding.creators.empty_body')}
                      </Typography>
                    </Box>
                  </Stack>
                ) : null}
                {!creatorsPending && !creatorsError && creators.length > 0 ? (
                  <Box component={m.div} variants={stepChildVariants}>
                    <Stack spacing={2.25}>
                      {creators.map((c, idx) => {
                        const followKey =
                          c.userId != null ? String(c.userId).trim().toLowerCase() : '';
                        const canFollow = DRAFT_TAG_ID_RE.test(followKey);
                        const following = canFollow && followIds.has(followKey);
                        return (
                          <Stack
                            key={followKey || `creator-${idx}-${c.name || 'unknown'}`}
                            component={m.div}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              duration: 0.38,
                              ease: EASE_OUT_QUINT,
                              delay: 0.18 + idx * 0.06,
                            }}
                            direction={{ xs: 'column', sm: 'row' }}
                            alignItems={{ xs: 'stretch', sm: 'center' }}
                            justifyContent="space-between"
                            spacing={{ xs: 2, sm: 0 }}
                            sx={(muiTheme) => ({
                              p: { xs: 2, sm: 2.5 },
                              borderRadius: { xs: 3, sm: 5 },
                              border: following ? '3px solid' : '2px solid',
                              borderColor: following ? muiTheme.palette.primary.main : 'divider',
                              bgcolor: following
                                ? alpha(muiTheme.palette.primary.main, 0.06)
                                : 'background.paper',
                              WebkitTapHighlightColor: 'transparent',
                              transition: muiTheme.transitions.create(
                                ['border-color', 'background-color', 'box-shadow'],
                                { duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
                              ),
                              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                            })}
                          >
                            <Stack
                              direction="row"
                              spacing={2}
                              alignItems="center"
                              sx={{ minWidth: 0, flex: { sm: 1 } }}
                            >
                              <Box sx={{ position: 'relative', flexShrink: 0 }}>
                                <Avatar
                                  src={c.avatar}
                                  alt=""
                                  variant="rounded"
                                  sx={(muiTheme) => ({
                                    width: { xs: 56, sm: 64 },
                                    height: { xs: 56, sm: 64 },
                                    borderRadius: { xs: 3, sm: 3.5 },
                                    boxShadow: following
                                      ? `0 0 0 3px ${alpha(muiTheme.palette.primary.main, 0.22)}`
                                      : 'none',
                                    transition: muiTheme.transitions.create('box-shadow', {
                                      duration: 240,
                                      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                                    }),
                                    '@media (prefers-reduced-motion: reduce)': {
                                      transition: 'none',
                                    },
                                  })}
                                />
                                <AnimatePresence>
                                  {following ? (
                                    <Box
                                      key="follow-sparkle"
                                      component={m.div}
                                      initial={{ scale: 0.4, opacity: 0, rotate: -20 }}
                                      animate={{
                                        scale: [0.4, 1.15, 1],
                                        opacity: 1,
                                        rotate: [-20, 8, 0],
                                      }}
                                      exit={{ scale: 0.6, opacity: 0 }}
                                      transition={{
                                        duration: 0.5,
                                        times: [0, 0.6, 1],
                                        ease: EASE_OUT_QUINT,
                                      }}
                                      sx={{
                                        position: 'absolute',
                                        top: -6,
                                        right: -6,
                                        width: 22,
                                        height: 22,
                                        borderRadius: '50%',
                                        bgcolor: 'primary.main',
                                        color: 'primary.contrastText',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 13,
                                        lineHeight: 1,
                                        boxShadow: (muiTheme) =>
                                          `0 4px 10px ${alpha(muiTheme.palette.primary.main, 0.35)}`,
                                      }}
                                      aria-hidden="true"
                                    >
                                      ✨
                                    </Box>
                                  ) : null}
                                </AnimatePresence>
                              </Box>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 800, wordBreak: 'break-word' }}>
                                  {c.name}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ display: 'block', lineHeight: 1.35 }}
                                >
                                  {c.subtitle}
                                </Typography>
                              </Box>
                            </Stack>
                            <Button
                              size="medium"
                              color="primary"
                              variant={following ? 'outlined' : 'contained'}
                              disabled={!canFollow}
                              fullWidth
                              onClick={() => canFollow && toggleFollow(followKey)}
                              sx={{
                                minHeight: { xs: 48, sm: 44 },
                                flexShrink: 0,
                                alignSelf: { xs: 'stretch', sm: 'center' },
                                width: { xs: '100%', sm: 'auto' },
                                minWidth: { xs: 0, sm: 100 },
                                fontWeight: 800,
                                borderRadius: 2.5,
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                fontSize: { xs: 13, sm: 13 },
                                transition: (muiTheme) =>
                                  muiTheme.transitions.create(['transform', 'background-color'], {
                                    duration: 160,
                                    easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
                                  }),
                                '&:active:not(:disabled)': { transform: 'scale(0.96)' },
                                '@media (prefers-reduced-motion: reduce)': {
                                  transition: 'none',
                                  '&:active:not(:disabled)': { transform: 'none' },
                                },
                              }}
                            >
                              {(() => {
                                if (!canFollow) return t('pages.onboarding.creators.preview');
                                if (following) return t('pages.onboarding.creators.following');
                                return t('pages.onboarding.creators.follow');
                              })()}
                            </Button>
                          </Stack>
                        );
                      })}
                    </Stack>
                  </Box>
                ) : null}
              </Stack>
            </Box>
          ) : null}
        </AnimatePresence>
      </Box>

      <Box
        sx={{
          mt: { xs: 3, sm: 4 },
          zIndex: 1,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          alignItems: 'stretch',
        }}
      >
        <Stack spacing={0}>
          {step === 0 && (
            <Button
              fullWidth
              size="large"
              color="primary"
              variant="contained"
              onClick={onNextFromWelcome}
              disabled={busy}
              aria-busy={busy}
              sx={primaryCtaSx}
            >
              {t('pages.onboarding.cta.lets_nomnom')}
            </Button>
          )}
          {step === 1 && (
            <Button
              fullWidth
              size="large"
              color="primary"
              variant="contained"
              onClick={onNextFromLocation}
              disabled={
                busy ||
                // Don't block Continue once a city is selected — GPS and the catalog
                // fetch can still be in flight (or the catalog can have errored).
                (selectedLocalityIds.length === 0 &&
                  (geoLoading || locationsLoading || !!locationsError))
              }
              aria-busy={busy}
              startIcon={
                busy ? <CircularProgress size={22} color="inherit" thickness={5} /> : undefined
              }
              endIcon={busy ? undefined : <Iconify icon={ic.arrowRightBold} />}
              sx={{ ...primaryCtaSx, ...(busy ? primaryCtaBusySx : null) }}
            >
              {t('pages.onboarding.cta.almost')}
            </Button>
          )}
          {step === 2 && (
            <Button
              fullWidth
              size="large"
              color="primary"
              variant="contained"
              onClick={onNextFromTags}
              disabled={busy}
              aria-busy={busy}
              startIcon={
                busy ? <CircularProgress size={22} color="inherit" thickness={5} /> : undefined
              }
              endIcon={busy ? undefined : <Iconify icon={ic.arrowRightBold} />}
              sx={{ ...primaryCtaSx, ...(busy ? primaryCtaBusySx : null) }}
            >
              {t('pages.onboarding.cta.keep')}
            </Button>
          )}
          {step === 3 && (
            <Button
              fullWidth
              size="large"
              color="primary"
              variant="contained"
              onClick={onFinish}
              disabled={
                busy ||
                // Wait for the first creators fetch so users don't finish before cards appear.
                creatorsPending
              }
              aria-busy={busy}
              startIcon={
                busy ? <CircularProgress size={22} color="inherit" thickness={5} /> : undefined
              }
              endIcon={busy ? undefined : <Iconify icon={ic.rocketBold} />}
              sx={{ ...primaryCtaSx, ...(busy ? primaryCtaBusySx : null) }}
            >
              {t('pages.onboarding.cta.start')}
            </Button>
          )}
        </Stack>
        {err && err !== 'gps_outside_supported' && err !== 'gps_resolve_failed' ? (
          <Alert
            severity="error"
            variant="outlined"
            role="alert"
            sx={{
              mt: { xs: 1.5, sm: 2 },
              // Left-aligned: error copy can run multi-line (esp. pt) and sits next to the severity icon.
              px: { xs: 0.5, sm: 1 },
              py: 1.25,
              fontWeight: 600,
              lineHeight: 1.55,
              width: '100%',
              '& .MuiAlert-message': { width: 1 },
            }}
          >
            {onboardingErrorMessage(err, t)}
          </Alert>
        ) : null}
      </Box>
    </Box>
  );
}

OnboardingWizard.propTypes = {
  draftUserId: PropTypes.string,
  initialTags: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      slug: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      category: PropTypes.string.isRequired,
      sort_order: PropTypes.number,
    })
  ),
};
