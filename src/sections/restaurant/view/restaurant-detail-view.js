'use client';

import PropTypes from 'prop-types';
import dynamic from 'next/dynamic';
// Aliased: file uses `m` as an inline `.map((m) => …)` callback parameter throughout.
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import { useRef, useMemo, useState, useEffect, useCallback, useLayoutEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Rating from '@mui/material/Rating';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter, useSearchParams } from 'src/routes/hooks';
import { RouterLink, NAV_BACK_TRANSITION_TYPES } from 'src/routes/components';
import { resolveRestaurantNavBackHref } from 'src/routes/restaurant-nav-from';

import { useShareLink } from 'src/hooks/use-share-link';

import { fRating } from 'src/utils/format-number';
import {
  getRestaurantTagDisplayLabel,
  splitRestaurantTagsForDetailDisplay,
} from 'src/utils/restaurant-tag-groups';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { useAuthContext } from 'src/auth/hooks';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';
import { dedupeMustTryDishesByDisplayLabel } from 'src/lib/must-try-dedupe';
import { RADIUS, tabularNumsSx, TOUCH_TARGET_SIZE } from 'src/theme/spacing';
import { galleryUrlsForRestaurant } from 'src/libs/restaurant/restaurant-gallery-urls';
import { buildRestaurantShareText } from 'src/libs/restaurant/build-restaurant-share-text';
import {
  RESTAURANT_SURFACE,
  useRestaurantAnalytics,
} from 'src/libs/analytics/restaurant-analytics';

import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import RemoteCoverImage from 'src/components/image/remote-cover-image';
import PhotoCarouselPillDots from 'src/components/photo-carousel-pill-dots/photo-carousel-pill-dots';

import RestaurantOpeningStatus from 'src/sections/restaurant/restaurant-opening-status';
import { useMapSheetViewerIdentity } from 'src/sections/map/use-map-sheet-viewer-identity';
import RestaurantFollowCircleCard from 'src/sections/restaurant/restaurant-follow-circle-card';
import { shouldShowPendingReviewSkeleton } from 'src/sections/restaurant/pending-review-skeleton-gate';
import {
  listNameFromItemRow,
  listEmbedFromItemRow,
  listEntryForMentionRow,
  mergeReferencedListsById,
} from 'src/sections/restaurant/mention-list-entries';
import {
  formatReviewDate,
  ReviewExpandableBody,
  restaurantReviewAuthorLabel,
  RestaurantReviewMediaGallery,
  reviewAuthorDisplayNameForLabel,
} from 'src/sections/restaurant/restaurant-reviews-section';

const Lightbox = dynamic(() => import('src/components/lightbox/lightbox'), { ssr: false });
const SaveToListSheet = dynamic(() => import('src/sections/lists/save-to-list-sheet'), {
  ssr: false,
});

// ----------------------------------------------------------------------

/** Hero overlay actions — shared by full-page detail and map sheet (tap-friendly). */
const HERO_TOOLBAR_BTN_SIZE = 48;
const HERO_TOOLBAR_ICON_SIZE = 22;

/**
 * Approx. height of one flex-wrap row of soft tag chips after labels are single-line.
 * Paired with `gap={0.75}` between rows.
 */
const RESTAURANT_DETAIL_TAG_ROW_PX = 24;

/** Shared look for cuisine / vibe / dish tags on the restaurant detail page. */
const DETAIL_TAG_CHIP_SX = {
  height: RESTAURANT_DETAIL_TAG_ROW_PX,
  maxWidth: '100%',
  minWidth: 0,
  fontWeight: 700,
  '& .MuiChip-label': {
    px: 0.75,
    fontSize: { xs: '0.6875rem', sm: '0.75rem' },
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
};

/** Inline prefix label shown before a tag row (e.g. "Dishes"). */
const DETAIL_TAG_INLINE_LABEL_SX = {
  flexShrink: 0,
  pt: '3px',
  fontWeight: 700,
  fontSize: { xs: '0.6875rem', sm: '0.75rem' },
  letterSpacing: '0.02em',
  color: 'text.secondary',
  whiteSpace: 'nowrap',
};

/** Quiet, clearly-tappable "+N more" / "show less" control with a rotating chevron. */
const DETAIL_TAG_MORE_SX = {
  flexShrink: 0,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.25,
  height: RESTAURANT_DETAIL_TAG_ROW_PX,
  px: 0.5,
  borderRadius: RADIUS.pill,
  fontWeight: 700,
  fontSize: { xs: '0.6875rem', sm: '0.75rem' },
  lineHeight: 1,
  color: 'primary.main',
  '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.08) },
};

/**
 * Chips fully below the clipped box bottom count as hidden (for “+N more”).
 * @param {HTMLElement | null} root
 * @param {string} selector
 */
function countRestaurantDetailTagsHiddenBelowClip(root, selector) {
  if (!root) return 0;
  const nodes = root.querySelectorAll(selector);
  if (nodes.length === 0) return 0;
  const clipBottom = root.getBoundingClientRect().bottom;
  let visible = 0;
  nodes.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.bottom <= clipBottom + 1) visible += 1;
  });
  return Math.max(0, nodes.length - visible);
}

/**
 * One tag row on restaurant detail: optional inline label + soft chips clipped
 * to a single line, with a quiet "+N more" toggle. Used for the combined
 * cuisine/vibe labels and for dishes alike.
 */
function RestaurantDetailTagSection({ inlineLabel, tags, tagKind, maxCollapsedPx, t }) {
  const [expanded, setExpanded] = useState(false);
  const [hiddenCount, setHiddenCount] = useState(0);
  const clipRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const innerRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const tagSelector = `[data-restaurant-detail-tag="${tagKind}"]`;

  const updateOverflow = useCallback(() => {
    const root = clipRef.current;
    if (root && !expanded && tags.length > 0) {
      setHiddenCount(countRestaurantDetailTagsHiddenBelowClip(root, tagSelector));
    } else {
      setHiddenCount(0);
    }
  }, [expanded, tags.length, tagSelector]);

  useLayoutEffect(() => {
    updateOverflow();
  }, [updateOverflow]);

  useEffect(() => {
    const onResize = () => updateOverflow();
    window.addEventListener('resize', onResize);
    if (typeof ResizeObserver === 'undefined') {
      return () => window.removeEventListener('resize', onResize);
    }
    const ro = new ResizeObserver(() => {
      updateOverflow();
    });
    [clipRef.current, innerRef.current].filter(Boolean).forEach((el) => ro.observe(el));
    return () => {
      window.removeEventListener('resize', onResize);
      ro.disconnect();
    };
  }, [updateOverflow, tags.length]);

  if (!Array.isArray(tags) || tags.length === 0) return null;

  return (
    <Stack
      direction="row"
      flexWrap="nowrap"
      alignItems="flex-start"
      gap={0.75}
      sx={{ width: 1, minWidth: 0 }}
    >
      {inlineLabel ? (
        <Typography component="span" variant="caption" sx={DETAIL_TAG_INLINE_LABEL_SX}>
          {inlineLabel}
        </Typography>
      ) : null}
      <Box
        ref={clipRef}
        sx={{
          flex: 1,
          minWidth: 0,
          maxHeight: expanded ? 'none' : maxCollapsedPx,
          overflow: expanded ? 'visible' : 'hidden',
        }}
      >
        <Stack
          ref={innerRef}
          direction="row"
          flexWrap="wrap"
          useFlexGap
          gap={0.5}
          sx={{ width: 1, minWidth: 0 }}
        >
          {tags.map((tag) => (
            <Chip
              key={String(tag.id ?? tag.slug)}
              data-restaurant-detail-tag={tagKind}
              title={getRestaurantTagDisplayLabel(tag, t)}
              label={getRestaurantTagDisplayLabel(tag, t)}
              size="small"
              variant="soft"
              color="default"
              sx={DETAIL_TAG_CHIP_SX}
            />
          ))}
        </Stack>
      </Box>
      {(hiddenCount > 0 || expanded) && (
        <Link
          component="button"
          type="button"
          underline="none"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={
            expanded
              ? t('pages.dashboard.restaurant.detail_tags_collapse_aria')
              : t('pages.dashboard.restaurant.detail_tags_expand_aria')
          }
          sx={DETAIL_TAG_MORE_SX}
        >
          {expanded
            ? t('pages.dashboard.restaurant.detail_tags_show_less')
            : t('pages.dashboard.restaurant.detail_tags_more_count', { count: hiddenCount })}
          <Iconify
            icon={ic.chevronDownFill}
            width={14}
            sx={{
              transition: (tt) => tt.transitions.create('transform', { duration: 150 }),
              transform: expanded ? 'rotate(180deg)' : 'none',
            }}
          />
        </Link>
      )}
    </Stack>
  );
}

RestaurantDetailTagSection.propTypes = {
  inlineLabel: PropTypes.string,
  tags: PropTypes.arrayOf(PropTypes.object).isRequired,
  tagKind: PropTypes.string.isRequired,
  maxCollapsedPx: PropTypes.number.isRequired,
  t: PropTypes.func.isRequired,
};

/** Links @handle to `/dashboard/u/:handle` when `author_username` exists; else plain text. */
function authorLabelWithProfileLink({ rev, fallbackLabel }) {
  if (!rev) return fallbackLabel;
  const raw =
    typeof rev.author_username === 'string' ? rev.author_username.trim().replace(/^@/, '') : '';
  if (!raw) return fallbackLabel;
  const name = reviewAuthorDisplayNameForLabel(rev);
  const handleLink = (
    <Link
      component={RouterLink}
      href={paths.dashboard.userPublic(raw)}
      underline="hover"
      color="primary"
      sx={{ fontWeight: 700 }}
    >
      @{raw}
    </Link>
  );
  if (name) {
    return (
      <>
        {name} ({handleLink})
      </>
    );
  }
  return handleLink;
}

function buildMapsUrl({ name, address, latitude, longitude, maps_link: mapsLink }) {
  if (typeof mapsLink === 'string' && mapsLink.trim()) return mapsLink.trim();
  const nameQ = name && String(name).trim();
  const addressQ = address && String(address).trim();
  const q = [nameQ, addressQ].filter(Boolean).join(' ');
  if (q) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  const lat = latitude != null ? Number(latitude) : NaN;
  const lng = longitude != null ? Number(longitude) : NaN;
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  }
  return null;
}

/** @param {unknown} phone */
function buildTelHref(phone) {
  if (phone == null) return null;
  const raw = String(phone).trim();
  if (!raw) return null;
  const beforeExt = raw.split(/\s*(?:ext\.?|x)\s*/i)[0]?.trim() ?? raw;
  const hasPlus = beforeExt.trimStart().startsWith('+');
  const digits = beforeExt.replace(/\D/g, '');
  if (digits.length < 7) return null;
  const href = hasPlus ? `tel:+${digits}` : `tel:${digits}`;
  return { href, display: raw };
}

/**
 * Read AI-extracted community consensus from `metadata.review_consensus`
 * (populated during ingest by `src/libs/restaurant-ingest/review-consensus-ai.js`).
 * `signature_dishes` is intentionally NOT surfaced here — those are piped into
 * the must-try suggestion chips on the save-to-list sheet via
 * `fetchRestaurantDishSuggestions` so users can one-tap pre-select them.
 * Returns null when the field is missing or has no usable signal.
 */
function consensusFromMetadata(metadata) {
  const raw = metadata?.review_consensus;
  if (!raw || typeof raw !== 'object') return null;
  const trim = (s) => (typeof s === 'string' && s.trim() ? s.trim() : null);
  const list = (arr) =>
    Array.isArray(arr) ? arr.map((x) => trim(x)).filter((x) => x != null) : [];
  /** Accepts the new shape `[{label, mentions}]` or the legacy string-only shape. */
  const dishList = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr
      .map((d) => {
        if (typeof d === 'string') {
          const label = trim(d);
          return label ? { label, mentions: 1 } : null;
        }
        if (d && typeof d === 'object') {
          const label = trim(d.label);
          if (!label) return null;
          const mRaw =
            typeof d.mentions === 'number' ? d.mentions : parseInt(String(d.mentions ?? ''), 10);
          const mentions = Number.isFinite(mRaw) && mRaw > 0 ? Math.floor(mRaw) : 1;
          return { label, mentions };
        }
        return null;
      })
      .filter((x) => x != null);
  };
  const summary = trim(raw.summary);
  const strengths = list(raw.strengths);
  const weaknesses = list(raw.weaknesses);
  const signatureDishes = dishList(raw.signature_dishes);
  if (!summary && !strengths.length && !weaknesses.length && !signatureDishes.length) {
    return null;
  }
  const reviewsAnalyzed =
    typeof raw.reviews_analyzed === 'number' && Number.isFinite(raw.reviews_analyzed)
      ? raw.reviews_analyzed
      : null;
  return { summary, strengths, weaknesses, signatureDishes, reviewsAnalyzed };
}

function parseActivityMs(iso) {
  if (iso == null) return 0;
  const s = typeof iso === 'string' ? iso : String(iso);
  const x = Date.parse(s);
  return Number.isFinite(x) ? x : 0;
}

/**
 * Latest activity for a list-mention row: list save and/or review timestamps.
 * @param {object | null | undefined} row
 */
function rowMentionActivityMs(row) {
  if (!row || typeof row !== 'object') return 0;
  const rev = row.contributor_review;
  const fromRev = Math.max(parseActivityMs(rev?.updated_at), parseActivityMs(rev?.created_at));
  const fromLi = parseActivityMs(row.created_at);
  return Math.max(fromRev, fromLi);
}

/** Union + dedupe must-try chips from every list_item row in a contributor bucket. */
function mergeMustTryDishesFromMentionRows(rows) {
  const acc = [];
  (rows ?? []).forEach((row) => {
    if (Array.isArray(row?.must_try_dishes) && row.must_try_dishes.length > 0) {
      acc.push(...row.must_try_dishes);
    }
  });
  return dedupeMustTryDishesByDisplayLabel(acc);
}

/** List id → name from mention rows (best-effort; used when only `savedListIds` are known). */
function listIdNameLookupFromMentionRows(raw) {
  const rows = Array.isArray(raw) ? raw : [];
  /** @type {Map<string, string>} */
  const map = new Map();
  rows.forEach((row) => {
    if (!row || typeof row !== 'object') return;
    const listObj = listEmbedFromItemRow(row);
    const listId = listObj?.id ?? row.list_id ?? null;
    if (listId == null) return;
    const nm = listNameFromItemRow(row);
    if (!nm) return;
    const sid = String(listId);
    if (!map.has(sid)) map.set(sid, nm);
  });
  return map;
}

/**
 * One card per contributor: same `added_by` on multiple lists merges with all list names shown.
 * @param {unknown[]} raw
 * @returns {Array<{ groupKey: string, primary: object, lists: Array<{ id: string | null, name: string, savedAt: string | null }>, must_try_dishes: object[] }>}
 */
function groupListMentionsForDetail(raw) {
  const rows = Array.isArray(raw) ? raw : [];
  /** @type {Map<string, { rows: typeof rows, listEntries: Map<string, { id: string | null, name: string, savedAt: string | null }> }>} */
  const byKey = new Map();
  let orphanIdx = 0;
  rows.forEach((row) => {
    if (!row || typeof row !== 'object') return;
    const k =
      row.added_by != null
        ? `u:${String(row.added_by)}`
        : `i:${row.id != null ? String(row.id) : `orphan-${orphanIdx++}`}`;
    if (!byKey.has(k)) byKey.set(k, { rows: [], listEntries: new Map() });
    const bucket = byKey.get(k);
    bucket.rows.push(row);
    const listObj = listEmbedFromItemRow(row);
    const listId = listObj?.id ?? row.list_id ?? null;
    const listName = listNameFromItemRow(row);
    if (listId == null && !listName) return;
    const mapKey = listId != null ? `id:${String(listId)}` : `n:${listName}`;
    const entry = listEntryForMentionRow(row, bucket.listEntries.get(mapKey));
    if (entry) bucket.listEntries.set(mapKey, entry);
  });
  return [...byKey.values()]
    .map((bucket) => {
      const primary = bucket.rows.reduce((best, row) =>
        rowMentionActivityMs(row) > rowMentionActivityMs(best) ? row : best
      );
      const lists = [...bucket.listEntries.values()].sort((a, b) => {
        const aHas = Boolean(a.name && String(a.name).trim());
        const bHas = Boolean(b.name && String(b.name).trim());
        if (aHas !== bHas) return aHas ? -1 : 1;
        return String(a.name || '').localeCompare(String(b.name || ''), undefined, {
          sensitivity: 'base',
        });
      });
      let groupKey = 'unknown';
      if (primary?.added_by != null) {
        groupKey = `u:${String(primary.added_by)}`;
      } else if (primary?.id != null) {
        groupKey = `i:${String(primary.id)}`;
      }
      return {
        groupKey,
        primary,
        lists,
        must_try_dishes: mergeMustTryDishesFromMentionRows(bucket.rows),
      };
    })
    .sort((a, b) => rowMentionActivityMs(b.primary) - rowMentionActivityMs(a.primary));
}

/** Must-try dish chips (shared by list-mention and standalone review cards). */
function MustTryDishesOnReview({ dishes, t }) {
  if (!Array.isArray(dishes) || dishes.length === 0) return null;
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        columnGap: 0.75,
        rowGap: 0.5,
      }}
    >
      <Typography
        component="span"
        variant="caption"
        color="text.secondary"
        sx={{
          fontWeight: 800,
          fontSize: { xs: '0.6875rem', sm: '0.75rem' },
          flexShrink: 0,
        }}
      >
        {t('pages.lists.must_try_card_lead')}
      </Typography>
      {dishes.map((d) => (
        <Chip
          key={d.id}
          label={d.display_label ?? d.label}
          size="small"
          variant="outlined"
          sx={{ fontWeight: 600, flexShrink: 0 }}
        />
      ))}
    </Box>
  );
}

MustTryDishesOnReview.propTypes = {
  dishes: PropTypes.arrayOf(PropTypes.object),
  t: PropTypes.func.isRequired,
};

/**
 * Shows which list(s) a save / review is associated with (names link to list detail).
 * @param {{ lists: Array<{ id: string | null, name: string | null }>, t: (k: string) => string }} props
 */
function MentionReferencedLists({ lists, t }) {
  if (!Array.isArray(lists) || lists.length === 0) return null;
  return (
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'baseline',
        columnGap: 0.5,
        rowGap: 0.25,
      }}
    >
      <Typography
        component="span"
        variant="caption"
        color="text.secondary"
        sx={{
          fontWeight: 800,
          fontSize: { xs: '0.6875rem', sm: '0.75rem' },
          flexShrink: 0,
        }}
      >
        {t('pages.dashboard.restaurant.mentions_review_card_list_lead')}
      </Typography>
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          gap: 0.5,
          minWidth: 0,
        }}
      >
        {lists.map((L, idx) => {
          const label =
            L.name && String(L.name).trim()
              ? String(L.name).trim()
              : t('pages.dashboard.restaurant.mentions_list_untitled');
          return (
            <Box
              component="span"
              key={L.id ?? `ref-${idx}`}
              sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.5 }}
            >
              {idx > 0 ? (
                <Typography
                  component="span"
                  variant="caption"
                  sx={{ color: 'text.disabled', userSelect: 'none' }}
                >
                  ·
                </Typography>
              ) : null}
              {L.id ? (
                <Link
                  component={RouterLink}
                  href={paths.dashboard.listDetails(String(L.id))}
                  variant="caption"
                  underline="hover"
                  color="primary"
                  sx={{ fontWeight: 700 }}
                >
                  {label}
                </Link>
              ) : (
                <Typography variant="caption" fontWeight={700} color="primary">
                  {label}
                </Typography>
              )}
              {/* When it was saved. `list_items.created_at` has always been read for
                  sorting and never shown — "on a list" is a weaker signal than "on a list
                  since May", which is the provenance the brand promise trades on. */}
              {L.savedAt ? (
                <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>
                  {formatReviewDate(L.savedAt)}
                </Typography>
              ) : null}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

MentionReferencedLists.propTypes = {
  lists: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      /** `list_items.created_at` — when this spot went on that list. */
      savedAt: PropTypes.string,
    })
  ).isRequired,
  t: PropTypes.func.isRequired,
};

/**
 * Single layout for every review in the “Mentioned by” feed (list-linked and standalone).
 * Inline media and padded card — avoids the alternate standalone “hero” layout.
 */
function MentionFeedReviewCard({
  rev,
  lists,
  mustTryDishes,
  myUserId,
  showListsAndReviews,
  supabase,
  t,
  onRequestEdit,
  nameFallback,
}) {
  const whoLabel =
    nameFallback != null && String(nameFallback).trim()
      ? String(nameFallback).trim()
      : restaurantReviewAuthorLabel(rev);
  const avatarSrc = rev.author_avatar_url || undefined;
  const isMine = myUserId && showListsAndReviews && String(rev.user_id) === String(myUserId);

  return (
    <Card
      variant="outlined"
      sx={{
        p: { xs: 1.75, sm: 2 },
        borderRadius: '24px',
        boxShadow: (tt) =>
          tt.palette.mode === 'light'
            ? `0 1px 3px ${alpha(tt.palette.common.black, 0.06)}`
            : 'none',
      }}
    >
      <Stack spacing={1.75}>
        <Stack
          direction="row"
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={{ xs: 1.5, sm: 2 }}
          gap={1}
        >
          <Stack
            direction="row"
            alignItems="flex-start"
            spacing={{ xs: 1.5, sm: 2 }}
            sx={{ flex: 1, minWidth: 0 }}
          >
            <Box
              sx={{
                position: 'relative',
                width: 48,
                height: 48,
                borderRadius: '50%',
                overflow: 'hidden',
                flexShrink: 0,
                border: (tt) => `2px solid ${alpha(tt.palette.primary.main, 0.2)}`,
              }}
            >
              {avatarSrc ? (
                <RemoteCoverImage
                  src={avatarSrc}
                  alt={t('pages.dashboard.restaurant.reviewer_avatar_alt', {
                    name: whoLabel,
                  })}
                  fill
                  sizes="48px"
                />
              ) : (
                <Box
                  sx={{
                    width: 1,
                    height: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: (tt) => alpha(tt.palette.primary.main, 0.08),
                  }}
                >
                  <Iconify icon={ic.userBold} width={24} sx={{ color: 'primary.main' }} />
                </Box>
              )}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 700, wordBreak: 'break-word' }}>
                {authorLabelWithProfileLink({ rev, fallbackLabel: whoLabel })}
                {isMine ? (
                  <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600, ml: 0.5 }}>
                    {t('pages.dashboard.restaurant.reviews_yours_badge')}
                  </Box>
                ) : null}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                <Rating value={Number(rev.rating)} readOnly precision={0.5} size="small" />
                <Typography variant="caption" color="text.secondary">
                  {formatReviewDate(rev.created_at)}
                </Typography>
              </Stack>
            </Box>
          </Stack>
          {isMine ? (
            <Button
              variant="outlined"
              size="small"
              color="primary"
              onClick={onRequestEdit}
              startIcon={<Iconify icon={ic.penBold} width={16} />}
              sx={{
                flexShrink: 0,
                fontWeight: 700,
                borderRadius: '12px',
                textTransform: 'none',
              }}
            >
              {t('pages.dashboard.restaurant.reviews_edit_button')}
            </Button>
          ) : null}
        </Stack>
        <MentionReferencedLists lists={lists} t={t} />
        <MustTryDishesOnReview dishes={mustTryDishes} t={t} />
        {rev?.body ? (
          <Box
            sx={{
              p: { xs: 1.25, sm: 1.5 },
              borderRadius: '16px',
              bgcolor: (tt) => alpha(tt.palette.grey[500], 0.06),
            }}
          >
            <ReviewExpandableBody text={rev.body} />
          </Box>
        ) : null}
        {supabase && Array.isArray(rev?.media) && rev.media.length > 0 ? (
          <RestaurantReviewMediaGallery supabase={supabase} media={rev.media} variant="inline" />
        ) : null}
      </Stack>
    </Card>
  );
}

MentionFeedReviewCard.propTypes = {
  rev: PropTypes.shape({
    user_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    rating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    body: PropTypes.string,
    author_avatar_url: PropTypes.string,
    created_at: PropTypes.string,
    author_username: PropTypes.string,
    author_display_name: PropTypes.string,
    media: PropTypes.arrayOf(PropTypes.object),
  }).isRequired,
  lists: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
    })
  ).isRequired,
  mustTryDishes: PropTypes.arrayOf(PropTypes.object),
  myUserId: PropTypes.string,
  showListsAndReviews: PropTypes.bool,
  supabase: PropTypes.object,
  t: PropTypes.func.isRequired,
  onRequestEdit: PropTypes.func.isRequired,
  nameFallback: PropTypes.string,
};

// ----------------------------------------------------------------------

/**
 * Single card-shaped skeleton shown in place of the user's own review card
 * while `router.refresh()` is in-flight after a save-sheet update.
 */
function ReviewPendingSkeleton() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const baseColor = isDark
    ? alpha(theme.palette.common.white, 0.09)
    : alpha(theme.palette.common.black, 0.06);
  const highlightColor = isDark
    ? alpha(theme.palette.common.white, 0.18)
    : alpha(theme.palette.common.black, 0.12);

  return (
    <SkeletonTheme
      baseColor={baseColor}
      highlightColor={highlightColor}
      borderRadius={12}
      duration={1.2}
    >
      <Card
        variant="outlined"
        sx={{
          p: { xs: 1.75, sm: 2 },
          borderRadius: '24px',
          boxShadow: (tt) =>
            tt.palette.mode === 'light'
              ? `0 1px 3px ${alpha(tt.palette.common.black, 0.06)}`
              : 'none',
        }}
      >
        <Stack direction="row" alignItems="flex-start" spacing={{ xs: 1.5, sm: 2 }}>
          <Skeleton width={48} height={48} style={{ borderRadius: '50%', flexShrink: 0 }} />
          <Stack spacing={0.85} sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
            <Skeleton height={18} width="55%" style={{ borderRadius: 6 }} />
            <Skeleton height={14} width="35%" style={{ borderRadius: 6 }} />
            <Skeleton height={14} width="90%" style={{ borderRadius: 6 }} />
            <Skeleton height={14} width="70%" style={{ borderRadius: 6 }} />
          </Stack>
        </Stack>
      </Card>
    </SkeletonTheme>
  );
}

// ----------------------------------------------------------------------

export default function RestaurantDetailView({
  restaurant,
  savedListIds = [],
  /** True while saved-list membership is still resolving — shows a skeleton on the bookmark toolbar icon instead of flashing neutral → orange. */
  savedListIdsLoading = false,
  /** `{ id, name }[]` for lists where the viewer saved this restaurant (dashboard); enriches “Referenced lists” on the viewer’s own review. */
  savedLists = [],
  followCircle = null,
  followCircleLoading = false,
  mapSheetMode = false,
  onClose,
  onSaveSheetApplied: onSaveSheetAppliedFromParent,
  reviews = [],
  listMentions = [],
  myUserId = null,
  onReviewSaved,
  /** When false, hide save-to-list UI and reviews (e.g. static marketing / content-hub restaurants). */
  showListsAndReviews = true,
  /** Dashboard `<Main>` reserves fixed bottom nav; skip extra mobile `pb` on the outer Container. */
  dashboardFixedBottomNav = false,
  /** Analytics: `map_sheet` when `mapSheetMode`; else `content_hub` (marketing) or `dashboard` (default). */
  analyticsSurface = null,
  /** Optional slugs for content-hub detail (stable analytics breakdowns). */
  analyticsContext = null,
  /** Map sheet: reviews + list mentions load async; show skeleton in the “Mentioned by” block until ready. */
  mentionsFeedLoading = false,
  /** Map sheet: tag catalog loads async; show skeleton chips until labels resolve (avoids leaking raw slug identifiers). */
  tagsLoading = false,
  /** Public share page: render the save button for guests; click invokes this instead of the save sheet (used to open a sign-in/up prompt). */
  onGuestSaveClick = null,
}) {
  const theme = useTheme();
  const restaurantAnalytics = useRestaurantAnalytics();
  const settings = useSettingsContext();
  const { supabase, user } = useAuthContext();
  const viewerIdentity = useMapSheetViewerIdentity(user, supabase);
  const { t, currentLang } = useTranslate();
  const router = useRouter();
  const searchParams = useSearchParams();
  const navBackHref = useMemo(
    () =>
      resolveRestaurantNavBackHref(searchParams.get('from'), {
        listId: searchParams.get('listId'),
      }),
    [searchParams]
  );
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [galleryLightbox, setGalleryLightbox] = useState({ open: false, index: 0 });
  const [saveSheetOpen, setSaveSheetOpen] = useState(false);
  const {
    share: shareLink,
    feedback: shareFeedback,
    dismissFeedback: dismissShareFeedback,
  } = useShareLink();
  const [reviewPending, setReviewPending] = useState(false);
  const reviewsPropRef = useRef(reviews);
  const isSaved = Array.isArray(savedListIds) && savedListIds.length > 0;
  useEffect(() => {
    if (reviewsPropRef.current !== reviews) {
      reviewsPropRef.current = reviews;
      setReviewPending(false);
    }
  }, [reviews]);

  const analyticsSurfaceResolved = mapSheetMode
    ? RESTAURANT_SURFACE.MAP_SHEET
    : (analyticsSurface ?? RESTAURANT_SURFACE.DASHBOARD);

  const detailViewedPayload = useMemo(
    () => ({
      restaurant_id: String(restaurant.id),
      restaurant_name: restaurant.name,
      surface: analyticsSurfaceResolved,
      ...(analyticsContext && typeof analyticsContext === 'object' ? analyticsContext : {}),
    }),
    [restaurant.id, restaurant.name, analyticsSurfaceResolved, analyticsContext]
  );

  useEffect(() => {
    restaurantAnalytics.trackDetailViewed(detailViewedPayload);
  }, [detailViewedPayload, restaurantAnalytics]);

  const handleSaveSheetApplied = useCallback(
    (payload) => {
      onSaveSheetAppliedFromParent?.(payload);
      // Show skeleton on the user's own review card while the refresh is in-flight.
      setReviewPending(true);
      // Map (and any surface passing client-held `reviews`) must refetch; `router.refresh()` alone
      // does not update parent React state. Toolbar already calls this on inline save.
      onReviewSaved?.(payload);
      router.refresh();
    },
    [router, onReviewSaved, onSaveSheetAppliedFromParent]
  );

  const meta =
    restaurant.metadata && typeof restaurant.metadata === 'object' ? restaurant.metadata : {};
  const { rating: restaurantRating } = restaurant;
  const { rating: metaRating } = meta;
  let rating = null;
  if (typeof restaurantRating === 'number' && Number.isFinite(restaurantRating)) {
    rating = restaurantRating;
  } else if (typeof metaRating === 'number') {
    rating = metaRating;
  }
  const { detailTagSections, loadingTagCount } = useMemo(() => {
    const raw = Array.isArray(restaurant.tags) ? restaurant.tags : [];
    // Loading placeholders (from the map sheet, before the tag catalog fetch resolves) carry `__loading: true`
    // and an empty label — split them out so the regular chip rows never render an empty-labeled chip.
    const loadingRows = raw.filter((tag) => tag && tag.__loading === true);
    const ready = raw.filter((tag) => !(tag && tag.__loading === true));
    const { detailTagsPrimary, detailDishTags } = splitRestaurantTagsForDetailDisplay(ready);
    // Two rows only: all cuisine/vibe labels on one line, dishes on the next.
    const primarySections =
      detailTagsPrimary.length > 0
        ? [{ category: 'primary', tags: detailTagsPrimary, tagKind: 'primary' }]
        : [];
    const dishSection =
      detailDishTags.length > 0
        ? [{ category: 'dish', tags: detailDishTags, tagKind: 'dish' }]
        : [];
    return {
      detailTagSections: [...primarySections, ...dishSection],
      loadingTagCount: loadingRows.length,
    };
  }, [restaurant.tags]);

  const { primaryTagsMaxCollapsedPx } = useMemo(
    () => ({
      // Collapse each category to a single row; extra tags fold behind "+N more".
      primaryTagsMaxCollapsedPx: RESTAURANT_DETAIL_TAG_ROW_PX,
    }),
    []
  );

  const homeCity = restaurant.home_city;
  const cityName = homeCity?.name;
  const stateName = homeCity?.states?.name;
  const areaParts =
    stateName && cityName && stateName !== cityName
      ? [cityName, stateName]
      : [cityName].filter(Boolean);
  const areaLine = areaParts.join(' · ');
  const showAreaLine = areaLine.trim().length > 0;

  const galleryUrls = galleryUrlsForRestaurant(restaurant);
  const heroUrl = galleryUrls[0] ?? null;
  const galleryLightboxSlides = useMemo(() => galleryUrls.map((src) => ({ src })), [galleryUrls]);
  const mapsUrl = buildMapsUrl(restaurant);
  const phoneCall = buildTelHref(restaurant.phone);
  const phoneDisplayRaw =
    typeof restaurant.phone === 'string' && restaurant.phone.trim() ? restaurant.phone.trim() : '';
  const reviewConsensus = consensusFromMetadata(meta);

  const listMentionGroups = useMemo(() => groupListMentionsForDetail(listMentions), [listMentions]);

  /** All lists (per contributor) from raw mention rows — used if a review card is not merged into a list group. */
  const listsFromMentionsByUserId = useMemo(() => {
    const rows = Array.isArray(listMentions) ? listMentions : [];
    /** @type {Map<string, Map<string, { id: string | null, name: string | null }>>} */
    const byUser = new Map();
    rows.forEach((row) => {
      if (!row || typeof row !== 'object') return;
      const uid = row.added_by != null ? String(row.added_by) : null;
      if (!uid) return;
      const listObj = listEmbedFromItemRow(row);
      const listId = listObj?.id ?? row.list_id ?? null;
      const listName = listNameFromItemRow(row);
      if (listId == null && !listName) return;
      const mapKey = listId != null ? `id:${String(listId)}` : `n:${listName}`;
      if (!byUser.has(uid)) byUser.set(uid, new Map());
      byUser.get(uid).set(mapKey, {
        id: listId != null ? String(listId) : null,
        name: listName || null,
      });
    });
    /** @type {Map<string, Array<{ id: string | null, name: string | null }>>} */
    const out = new Map();
    byUser.forEach((entries, uid) => {
      const sorted = [...entries.values()].sort((a, b) => {
        const aHas = Boolean(a.name && String(a.name).trim());
        const bHas = Boolean(b.name && String(b.name).trim());
        if (aHas !== bHas) return aHas ? -1 : 1;
        return String(a.name || '').localeCompare(String(b.name || ''), undefined, {
          sensitivity: 'base',
        });
      });
      out.set(uid, sorted);
    });
    return out;
  }, [listMentions]);

  /** Viewer’s saved lists for this restaurant — used so the viewer’s own review shows the same list references when mention rows are filtered or incomplete. */
  const viewerSavedListRefs = useMemo(() => {
    const ids = Array.isArray(savedListIds) ? savedListIds : [];
    const uniqueIds = [...new Set(ids.map((x) => String(x)).filter(Boolean))];
    const summaries = Array.isArray(savedLists) ? savedLists : [];
    /** @type {Map<string, { id: string, name: string | null }>} */
    const summaryById = new Map();
    summaries.forEach((L) => {
      if (!L || L.id == null) return;
      const sid = String(L.id);
      const raw = L.name != null ? String(L.name).trim() : '';
      summaryById.set(sid, { id: sid, name: raw || null });
    });
    const mentionNames = listIdNameLookupFromMentionRows(listMentions);
    return uniqueIds.map((sid) => {
      if (summaryById.has(sid)) return summaryById.get(sid);
      const nm = mentionNames.get(sid) ?? null;
      return { id: sid, name: nm };
    });
  }, [savedListIds, savedLists, listMentions]);

  /** Must-try picks for each contributor (`added_by`), merged across their list_items for this restaurant. */
  const mustTryDishesByUserId = useMemo(() => {
    const rows = Array.isArray(listMentions) ? listMentions : [];
    /** @type {Map<string, object[]>} */
    const byUser = new Map();
    rows.forEach((row) => {
      if (!row || typeof row !== 'object') return;
      const uid = row.added_by != null ? String(row.added_by) : null;
      if (!uid) return;
      const dishes = Array.isArray(row.must_try_dishes) ? row.must_try_dishes : [];
      if (dishes.length === 0) return;
      if (!byUser.has(uid)) byUser.set(uid, []);
      byUser.get(uid).push(...dishes);
    });
    /** @type {Map<string, object[]>} */
    const out = new Map();
    byUser.forEach((arr, uid) => {
      out.set(uid, dedupeMustTryDishesByDisplayLabel(arr));
    });
    return out;
  }, [listMentions]);

  const standaloneReviews = useMemo(() => {
    if (!Array.isArray(reviews) || reviews.length === 0) return [];
    const rows = Array.isArray(listMentions) ? listMentions : [];
    const onListUserIds = new Set(
      rows.map((row) => (row?.added_by != null ? String(row.added_by) : '')).filter(Boolean)
    );
    return reviews.filter((rev) => rev?.user_id != null && !onListUserIds.has(String(rev.user_id)));
  }, [reviews, listMentions]);

  const myReview = useMemo(() => {
    if (!myUserId || !Array.isArray(reviews)) return null;
    const uid = String(myUserId);
    return reviews.find((r) => r?.user_id != null && String(r.user_id) === uid) ?? null;
  }, [reviews, myUserId]);

  const mentionCardsTotal = listMentionGroups.length + standaloneReviews.length;

  /** List-mention groups and standalone reviews — newest activity first. */
  const mergedMentionFeed = useMemo(() => {
    const fromLists = listMentionGroups.map((g) => ({
      kind: 'list_group',
      sortAt: rowMentionActivityMs(g.primary),
      payload: g,
    }));
    const fromStandalone = standaloneReviews.map((rev) => ({
      kind: 'standalone_review',
      sortAt: Math.max(parseActivityMs(rev.updated_at), parseActivityMs(rev.created_at)),
      payload: rev,
    }));
    return [...fromLists, ...fromStandalone].sort((a, b) => b.sortAt - a.sortAt);
  }, [listMentionGroups, standaloneReviews]);

  /**
   * First-time save: the viewer has no card in the feed yet, so the in-place skeleton
   * (which swaps an existing card) has nothing to show. Render a standalone pending
   * skeleton so the freshly-fetched review/mention doesn't pop in out of nowhere.
   */
  const showPendingReviewSkeleton = shouldShowPendingReviewSkeleton({
    reviewPending,
    showListsAndReviews,
    myUserId,
    mergedMentionFeed,
  });

  const mentionsSkeletonTheme = useSkeletonThemeColors();

  const handleCarouselScroll = useCallback(
    (e) => {
      const el = e.target;
      const w = el.clientWidth;
      if (w <= 0) return;
      const i = Math.round(el.scrollLeft / w);
      setCarouselIndex(Math.min(Math.max(0, i), galleryUrls.length - 1));
    },
    [galleryUrls.length]
  );

  const openGalleryLightbox = useCallback(
    (index) => {
      if (galleryLightboxSlides.length === 0) return;
      const safeIndex = Math.min(Math.max(0, index), galleryLightboxSlides.length - 1);
      restaurantAnalytics.trackPhotoViewed({
        restaurant_id: String(restaurant.id),
        surface: analyticsSurfaceResolved,
        index: safeIndex,
      });
      setGalleryLightbox({
        open: true,
        index: safeIndex,
      });
    },
    [galleryLightboxSlides, restaurantAnalytics, restaurant.id, analyticsSurfaceResolved]
  );

  const closeGalleryLightbox = useCallback(() => {
    setGalleryLightbox((s) => ({ ...s, open: false }));
  }, []);

  const shareUrlForRestaurant = useMemo(() => {
    if (mapSheetMode) {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      return `${origin}${paths.dashboard.restaurant(restaurant.id)}`;
    }
    if (typeof window !== 'undefined') return window.location.href;
    return '';
  }, [mapSheetMode, restaurant.id]);

  /** Overview that rides along in the message body — see `buildRestaurantShareText`. */
  const shareTextForRestaurant = useMemo(
    () =>
      buildRestaurantShareText({
        name: restaurant.name,
        area: areaLine,
        ratingText: rating != null ? fRating(rating, currentLang) : '',
        priceLevel: restaurant.price_level,
        consensus: reviewConsensus?.summary,
        consensusBasis:
          reviewConsensus?.summary && reviewConsensus.reviewsAnalyzed != null
            ? t('pages.dashboard.restaurant.consensus_basis', {
                count: reviewConsensus.reviewsAnalyzed,
              })
            : '',
      }),
    [restaurant.name, restaurant.price_level, areaLine, rating, currentLang, reviewConsensus, t]
  );

  const handleShare = async () => {
    restaurantAnalytics.trackShareClicked({
      restaurant_id: String(restaurant.id),
      surface: analyticsSurfaceResolved,
    });
    await shareLink({
      url: shareUrlForRestaurant,
      title: restaurant.name,
      text: shareTextForRestaurant,
    });
  };

  const handleSave = () => {
    if (onGuestSaveClick) {
      onGuestSaveClick();
      return;
    }
    if (!showListsAndReviews) return;
    setSaveSheetOpen(true);
  };

  const showSaveButton = showListsAndReviews || Boolean(onGuestSaveClick);

  /** Readable on bright hero photos — shared by map sheet + full-page restaurant detail. */
  const mapSheetHeroIconBtnSx = {
    width: HERO_TOOLBAR_BTN_SIZE,
    height: HERO_TOOLBAR_BTN_SIZE,
    p: 0,
    flexShrink: 0,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    bgcolor: (tt) => alpha(tt.palette.background.paper, 0.96),
    boxShadow: theme.shadows[3],
    color: 'text.primary',
    border: `1px solid ${alpha(theme.palette.common.white, theme.palette.mode === 'dark' ? 0.2 : 0.55)}`,
    WebkitTapHighlightColor: 'transparent',
    touchAction: 'manipulation',
    lineHeight: 0,
    '& svg': { display: 'block' },
    '&:hover': { bgcolor: (tt) => alpha(tt.palette.background.paper, 0.98) },
    '&:active': {
      transform: 'scale(0.94)',
      boxShadow: theme.shadows[2],
    },
  };

  const sheetTopRadius = '32px';
  /** Match export `restaurant-detail` hero — stable on mobile (toolbar chrome, notches) */
  const heroHeight = mapSheetMode
    ? {
        xs: 'clamp(160px, 32dvh, 320px)',
        sm: 220,
        md: 168,
        lg: 148,
      }
    : { xs: 'clamp(228px, 42dvh, 420px)', sm: 320, md: 420, lg: 480 };

  let containerMaxWidth = 'md';
  if (mapSheetMode) {
    containerMaxWidth = false;
  } else if (settings.themeStretch) {
    containerMaxWidth = false;
  }

  let containerBottomPadding;
  if (mapSheetMode) {
    // Sheet sits above the tab bar; safe-area + extra px here stacked with panel padding and read as a dead band.
    containerBottomPadding = 0;
  } else {
    containerBottomPadding = dashboardFixedBottomNav
      ? { xs: 0, sm: 3, lg: 2 }
      : { xs: 2, sm: 3, lg: 2 };
  }

  return (
    <Container
      maxWidth={containerMaxWidth}
      disableGutters
      sx={{
        px: mapSheetMode ? 0 : { xs: 2, sm: 3 },
        overflowX: 'hidden',
        maxWidth: '100%',
        pb: containerBottomPadding,
        ...(mapSheetMode && {
          width: '100%',
          overflow: 'visible',
          minHeight: 0,
        }),
      }}
    >
      <Box sx={{ mx: mapSheetMode ? 0 : { xs: -2, sm: -3 } }}>
        <Box
          sx={{
            position: 'relative',
            width: 1,
            height: heroHeight,
            borderRadius: { xs: 0, sm: '0 0 16px 16px' },
            overflow: 'hidden',
            bgcolor: (tt) => alpha(tt.palette.grey[500], 0.12),
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent={mapSheetMode ? 'flex-end' : 'space-between'}
            sx={{
              position: 'absolute',
              top: { xs: 10, sm: 16 },
              left: 0,
              right: 0,
              // Above hero carousel / images (compositing) so save/share/back stay tappable on small screens.
              zIndex: 10,
              pointerEvents: 'none',
              pl: (tt) => `calc(${tt.spacing(1.25)} + env(safe-area-inset-left, 0px))`,
              pr: (tt) => `calc(${tt.spacing(1.25)} + env(safe-area-inset-right, 0px))`,
            }}
          >
            {mapSheetMode ? (
              <Stack direction="row" spacing={0.5} sx={{ pointerEvents: 'auto' }}>
                {showSaveButton ? (
                  <IconButton
                    onClick={handleSave}
                    aria-label={t('pages.dashboard.restaurant.save_aria')}
                    size="small"
                    disabled={savedListIdsLoading}
                    sx={mapSheetHeroIconBtnSx}
                  >
                    {savedListIdsLoading ? (
                      <Skeleton
                        circle
                        width={HERO_TOOLBAR_ICON_SIZE}
                        height={HERO_TOOLBAR_ICON_SIZE}
                      />
                    ) : (
                      <Iconify
                        icon={isSaved ? ic.bookmarkBold : ic.bookmarkLinear}
                        width={HERO_TOOLBAR_ICON_SIZE}
                        sx={{
                          color: (tt) =>
                            isSaved ? tt.palette.primary.main : tt.palette.text.primary,
                        }}
                      />
                    )}
                  </IconButton>
                ) : null}
                <IconButton
                  onClick={handleShare}
                  aria-label={t('pages.dashboard.restaurant.share_aria')}
                  size="small"
                  sx={mapSheetHeroIconBtnSx}
                >
                  <Iconify icon={ic.shareLinear} width={HERO_TOOLBAR_ICON_SIZE} />
                </IconButton>
                {mapsUrl ? (
                  <IconButton
                    component="a"
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      restaurantAnalytics.trackMapsClicked({
                        restaurant_id: String(restaurant.id),
                        surface: analyticsSurfaceResolved,
                      })
                    }
                    aria-label={t('pages.dashboard.restaurant.open_maps_aria')}
                    size="small"
                    sx={mapSheetHeroIconBtnSx}
                  >
                    <Iconify icon={ic.mapPointBold} width={HERO_TOOLBAR_ICON_SIZE} />
                  </IconButton>
                ) : null}
                {phoneCall ? (
                  <IconButton
                    component="a"
                    href={phoneCall.href}
                    onClick={() =>
                      restaurantAnalytics.trackPhoneClicked({
                        restaurant_id: String(restaurant.id),
                        surface: analyticsSurfaceResolved,
                      })
                    }
                    aria-label={t('pages.dashboard.restaurant.call_restaurant_aria', {
                      phone: phoneCall.display,
                    })}
                    size="small"
                    sx={mapSheetHeroIconBtnSx}
                  >
                    <Iconify icon={ic.phoneBold} width={HERO_TOOLBAR_ICON_SIZE} />
                  </IconButton>
                ) : null}
                <IconButton
                  onClick={onClose}
                  aria-label={t('pages.dashboard.map.sheet_close_spot_aria')}
                  size="small"
                  sx={mapSheetHeroIconBtnSx}
                >
                  <Iconify icon={ic.closeLine} width={HERO_TOOLBAR_ICON_SIZE} />
                </IconButton>
              </Stack>
            ) : (
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ width: 1, pointerEvents: 'auto' }}
              >
                <IconButton
                  {...(navBackHref
                    ? {
                        component: RouterLink,
                        href: navBackHref,
                        transitionTypes: NAV_BACK_TRANSITION_TYPES,
                      }
                    : {
                        onClick: () => router.back(),
                      })}
                  aria-label={t('pages.dashboard.restaurant.back_aria')}
                  size="small"
                  sx={mapSheetHeroIconBtnSx}
                >
                  <Iconify icon={ic.chevronLeftLinear} width={HERO_TOOLBAR_ICON_SIZE} />
                </IconButton>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  {showSaveButton ? (
                    <IconButton
                      onClick={handleSave}
                      aria-label={t('pages.dashboard.restaurant.save_aria')}
                      size="small"
                      disabled={savedListIdsLoading}
                      sx={mapSheetHeroIconBtnSx}
                    >
                      {savedListIdsLoading ? (
                        <Skeleton
                          circle
                          width={HERO_TOOLBAR_ICON_SIZE}
                          height={HERO_TOOLBAR_ICON_SIZE}
                        />
                      ) : (
                        <Iconify
                          icon={isSaved ? ic.bookmarkBold : ic.bookmarkLinear}
                          width={HERO_TOOLBAR_ICON_SIZE}
                          sx={{
                            color: (tt) =>
                              isSaved ? tt.palette.primary.main : tt.palette.text.primary,
                          }}
                        />
                      )}
                    </IconButton>
                  ) : null}
                  <IconButton
                    onClick={handleShare}
                    aria-label={t('pages.dashboard.restaurant.share_aria')}
                    size="small"
                    sx={mapSheetHeroIconBtnSx}
                  >
                    <Iconify icon={ic.shareLinear} width={HERO_TOOLBAR_ICON_SIZE} />
                  </IconButton>
                  {mapsUrl ? (
                    <IconButton
                      component="a"
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() =>
                        restaurantAnalytics.trackMapsClicked({
                          restaurant_id: String(restaurant.id),
                          surface: analyticsSurfaceResolved,
                        })
                      }
                      aria-label={t('pages.dashboard.restaurant.open_maps_aria')}
                      size="small"
                      sx={mapSheetHeroIconBtnSx}
                    >
                      <Iconify icon={ic.mapPointBold} width={HERO_TOOLBAR_ICON_SIZE} />
                    </IconButton>
                  ) : null}
                  {phoneCall ? (
                    <IconButton
                      component="a"
                      href={phoneCall.href}
                      onClick={() =>
                        restaurantAnalytics.trackPhoneClicked({
                          restaurant_id: String(restaurant.id),
                          surface: analyticsSurfaceResolved,
                        })
                      }
                      aria-label={t('pages.dashboard.restaurant.call_restaurant_aria', {
                        phone: phoneCall.display,
                      })}
                      size="small"
                      sx={mapSheetHeroIconBtnSx}
                    >
                      <Iconify icon={ic.phoneBold} width={HERO_TOOLBAR_ICON_SIZE} />
                    </IconButton>
                  ) : null}
                </Stack>
              </Stack>
            )}
          </Stack>

          {(() => {
            if (galleryUrls.length > 1) {
              return (
                <Box
                  onScroll={handleCarouselScroll}
                  sx={{
                    display: 'flex',
                    height: 1,
                    minHeight: 0,
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    scrollSnapType: 'x mandatory',
                    scrollBehavior: 'smooth',
                    overscrollBehaviorX: 'contain',
                    WebkitOverflowScrolling: 'touch',
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': { display: 'none' },
                  }}
                >
                  {galleryUrls.map((src, idx) => (
                    <Box
                      key={`${src}-${idx}`}
                      component="button"
                      type="button"
                      onClick={() => openGalleryLightbox(idx)}
                      aria-label={t('pages.dashboard.restaurant.gallery_image_aria', {
                        current: idx + 1,
                        total: galleryLightboxSlides.length,
                        name: restaurant.name,
                      })}
                      sx={{
                        position: 'relative',
                        minWidth: '100%',
                        height: 1,
                        minHeight: 0,
                        scrollSnapAlign: 'start',
                        scrollSnapStop: 'always',
                        flexShrink: 0,
                        cursor: 'pointer',
                        border: 'none',
                        p: 0,
                        bgcolor: 'transparent',
                        display: 'block',
                        touchAction: 'manipulation',
                        WebkitTapHighlightColor: 'transparent',
                        '&:focus-visible': {
                          outline: `2px solid ${theme.palette.common.white}`,
                          outlineOffset: 2,
                        },
                      }}
                    >
                      <RemoteCoverImage
                        src={src}
                        alt={restaurant.name}
                        fill
                        sizes="(max-width: 768px) 100vw, min(960px, 90vw)"
                      />
                    </Box>
                  ))}
                </Box>
              );
            }
            if (heroUrl) {
              return (
                <Box
                  component="button"
                  type="button"
                  onClick={() => openGalleryLightbox(0)}
                  aria-label={t('pages.dashboard.restaurant.gallery_image_aria', {
                    current: 1,
                    total: galleryLightboxSlides.length,
                    name: restaurant.name,
                  })}
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    cursor: 'pointer',
                    border: 'none',
                    p: 0,
                    bgcolor: 'transparent',
                    display: 'block',
                    touchAction: 'manipulation',
                    WebkitTapHighlightColor: 'transparent',
                    '&:focus-visible': {
                      outline: `2px solid ${theme.palette.common.white}`,
                      outlineOffset: 2,
                    },
                  }}
                >
                  <RemoteCoverImage
                    src={heroUrl}
                    alt={restaurant.name}
                    fill
                    sizes="(max-width: 768px) 100vw, min(960px, 90vw)"
                  />
                </Box>
              );
            }
            return (
              <Box
                sx={{
                  width: 1,
                  height: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Iconify icon={ic.shopBold} width={72} sx={{ color: 'text.disabled' }} />
              </Box>
            );
          })()}

          <PhotoCarouselPillDots
            total={galleryUrls.length}
            activeIndex={carouselIndex}
            variant="hero"
          />
        </Box>
        {galleryLightboxSlides.length > 0 ? (
          <Lightbox
            open={galleryLightbox.open}
            close={closeGalleryLightbox}
            index={galleryLightbox.index}
            slides={galleryLightboxSlides}
            carousel={{ imageFit: 'contain' }}
            disabledThumbnails={galleryLightboxSlides.length < 2}
            disabledSlideshow={galleryLightboxSlides.length < 2}
            /**
             * Map sheet: lightbox is inside a fixed bottom sheet. `yet-another-react-lightbox`
             * NoScroll (body overflow / padding) can leave the sheet’s inner scroll region broken
             * on mobile after close. Full-page restaurant keeps default scroll lock.
             */
            noScroll={mapSheetMode ? { disabled: true } : undefined}
          />
        ) : null}
      </Box>

      {shareFeedback ? (
        <Alert
          severity={shareFeedback.severity}
          variant="outlined"
          role={shareFeedback.severity === 'error' ? 'alert' : 'status'}
          onClose={dismissShareFeedback}
          sx={{
            mt: 1.5,
            mx: mapSheetMode ? 2 : 0,
            mb: 0,
          }}
        >
          {shareFeedback.text}
        </Alert>
      ) : null}

      <Card
        elevation={0}
        sx={{
          mx: mapSheetMode ? 0 : { xs: -2, sm: -3 },
          mt: mapSheetMode ? { xs: -3, sm: -2.5, md: -2 } : { xs: -3, sm: -4 },
          position: 'relative',
          borderRadius: mapSheetMode
            ? `${sheetTopRadius} ${sheetTopRadius} 0 0`
            : {
                xs: `${sheetTopRadius} ${sheetTopRadius} 0 0`,
                sm: `${sheetTopRadius} ${sheetTopRadius} 16px 16px`,
              },
          px: { xs: 2.5, sm: 3 },
          py: { xs: 3, sm: 4 },
          boxShadow: (tt) =>
            tt.palette.mode === 'light'
              ? `0 -4px 24px ${alpha(tt.palette.common.black, 0.08)}`
              : tt.shadows[4],
        }}
      >
        <Stack spacing={{ xs: 3.5, sm: 4 }}>
          <Box>
            <Stack
              direction="row"
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
              spacing={mapSheetMode ? 0.5 : 0.75}
              component="h1"
              sx={{
                m: 0,
                mb: 1,
                // Neutralize UA `h1` sizing; visible styles live on the inner `Typography`.
                fontSize: 'unset',
                fontWeight: 'unset',
                lineHeight: 'unset',
              }}
            >
              <Typography
                variant="h4"
                component="span"
                sx={{
                  fontFamily: theme.typography.fontSecondaryFamily,
                  // Libre Baskerville ships 400/700 only — 800 falls back to fake-bold.
                  fontWeight: 700,
                  lineHeight: 1.2,
                  fontSize: { xs: '1.375rem', sm: '2rem' },
                  letterSpacing: '-0.02em',
                  wordBreak: 'break-word',
                  flex: '0 1 auto',
                  minWidth: 0,
                  width: 'fit-content',
                  maxWidth: '100%',
                }}
              >
                {restaurant.name}
              </Typography>
              {rating != null && (
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={0.75}
                  sx={{
                    flexShrink: 0,
                    bgcolor: (tt) => alpha(tt.palette.primary.main, 0.1),
                    color: 'primary.main',
                    px: { xs: 1.25, sm: 1.5 },
                    py: { xs: 0.625, sm: 0.75 },
                    borderRadius: '12px',
                  }}
                >
                  <Iconify icon={ic.starBold} width={16} />
                  <Typography
                    component="span"
                    variant="subtitle2"
                    sx={{
                      fontWeight: 800,
                      fontSize: { xs: '0.8rem', sm: undefined },
                      ...tabularNumsSx,
                    }}
                  >
                    {fRating(rating, currentLang)}
                  </Typography>
                </Stack>
              )}
            </Stack>
            {showAreaLine && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                  mb: { xs: 2.5, sm: 3 },
                }}
              >
                {areaLine}
              </Typography>
            )}

            {tagsLoading && loadingTagCount > 0 && (
              <Stack
                role="status"
                aria-live="polite"
                aria-busy="true"
                direction="row"
                flexWrap="wrap"
                useFlexGap
                gap={0.75}
                sx={{ mb: { xs: 2.5, sm: 3 }, width: 1, minWidth: 0 }}
              >
                {Array.from({ length: Math.min(loadingTagCount, 8) }).map((_, i) => (
                  <Skeleton
                    key={`tag-skeleton-${i}`}
                    height={RESTAURANT_DETAIL_TAG_ROW_PX}
                    width={[64, 88, 72, 96][i % 4]}
                    style={{ borderRadius: RADIUS.pill }}
                  />
                ))}
              </Stack>
            )}

            {!tagsLoading && detailTagSections.length > 0 && (
              <Stack spacing={1} sx={{ mb: { xs: 2, sm: 2.5 }, width: 1, minWidth: 0 }}>
                {detailTagSections.map((section) => (
                  <RestaurantDetailTagSection
                    key={`${restaurant.id}-${section.tagKind}`}
                    inlineLabel={
                      section.category === 'dish'
                        ? t('pages.dashboard.tag_filters.section_dish')
                        : null
                    }
                    tags={section.tags}
                    tagKind={section.tagKind}
                    maxCollapsedPx={primaryTagsMaxCollapsedPx}
                    t={t}
                  />
                ))}
              </Stack>
            )}

            <Stack
              direction="row"
              alignItems="flex-start"
              spacing={1.5}
              sx={{ mb: { xs: 2.5, sm: 3 } }}
            >
              <Stack
                direction="row"
                alignItems="center"
                flexWrap="wrap"
                useFlexGap
                spacing={1}
                sx={{ flexShrink: 0, mt: 0.25 }}
              >
                {mapsUrl ? (
                  <Button
                    component="a"
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      restaurantAnalytics.trackMapsClicked({
                        restaurant_id: String(restaurant.id),
                        surface: analyticsSurfaceResolved,
                      })
                    }
                    variant="outlined"
                    color="primary"
                    size="small"
                    aria-label={t('pages.dashboard.restaurant.open_maps_aria')}
                    sx={{
                      flexShrink: 0,
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: TOUCH_TARGET_SIZE,
                      height: TOUCH_TARGET_SIZE,
                      minWidth: TOUCH_TARGET_SIZE,
                      p: 0,
                      borderRadius: '50%',
                      borderColor: (tt) => alpha(tt.palette.primary.main, 0.35),
                      bgcolor: (tt) => alpha(tt.palette.primary.main, 0.06),
                      '&:hover': {
                        borderColor: (tt) => alpha(tt.palette.primary.main, 0.55),
                        bgcolor: (tt) => alpha(tt.palette.primary.main, 0.12),
                      },
                    }}
                  >
                    <Iconify icon={ic.mapPointBold} width={24} />
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    color="inherit"
                    size="small"
                    disabled
                    aria-label={t('pages.dashboard.restaurant.open_maps_aria')}
                    sx={{
                      flexShrink: 0,
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: TOUCH_TARGET_SIZE,
                      height: TOUCH_TARGET_SIZE,
                      minWidth: TOUCH_TARGET_SIZE,
                      p: 0,
                      borderRadius: '50%',
                    }}
                  >
                    <Iconify icon={ic.mapPointBold} width={24} />
                  </Button>
                )}
              </Stack>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {t('pages.dashboard.restaurant.address_title')}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5, lineHeight: 1.6 }}
                >
                  {restaurant.address?.trim() ? restaurant.address : '—'}
                </Typography>
                <RestaurantOpeningStatus openingStatus={restaurant.openingStatus} />
                {phoneDisplayRaw ? (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5, lineHeight: 1.6 }}
                  >
                    {phoneDisplayRaw}
                  </Typography>
                ) : null}
              </Box>
            </Stack>

            <RestaurantFollowCircleCard
              followCircle={followCircle}
              followCircleLoading={followCircleLoading}
              hideCircle={!myUserId}
              mapsHref={mapsUrl}
              onMapsClick={
                mapsUrl
                  ? () =>
                      restaurantAnalytics.trackMapsClicked({
                        restaurant_id: String(restaurant.id),
                        surface: analyticsSurfaceResolved,
                      })
                  : undefined
              }
              trailing={
                showListsAndReviews && myUserId && !myReview ? (
                  <IconButton
                    onClick={handleSave}
                    aria-label={t('pages.dashboard.restaurant.reviews_add_via_save')}
                    size="small"
                    sx={{
                      width: { xs: 32, sm: 36 },
                      height: { xs: 32, sm: 36 },
                      ml: 1,
                      flexShrink: 0,
                      p: 0,
                      borderRadius: '50%',
                      border: '2px solid',
                      borderColor: 'background.paper',
                      boxShadow: 2,
                      bgcolor: (tt) => alpha(tt.palette.primary.main, 0.12),
                      color: 'primary.main',
                      '&:hover': {
                        bgcolor: (tt) => alpha(tt.palette.primary.main, 0.22),
                      },
                    }}
                  >
                    <Iconify icon={ic.addRounded} width={20} />
                  </IconButton>
                ) : null
              }
              sx={{ mb: { xs: 2.5, sm: 3 } }}
            />
          </Box>

          <Box>
            <Typography
              variant="h6"
              sx={{
                mb: 2,
                fontWeight: 700,
                fontFamily: theme.typography.fontSecondaryFamily,
                fontSize: { xs: '1rem', sm: '1.25rem' },
                lineHeight: 1.3,
              }}
            >
              {t('pages.dashboard.restaurant.community_title')}
            </Typography>
            <Card
              variant="outlined"
              sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: '24px',
                boxShadow: (tt) =>
                  tt.palette.mode === 'light'
                    ? `0 1px 3px ${alpha(tt.palette.common.black, 0.06)}`
                    : 'none',
              }}
            >
              {reviewConsensus ? (
                <Stack spacing={2.25}>
                  {reviewConsensus.summary ? (
                    <Typography
                      variant="body2"
                      sx={{
                        fontStyle: 'italic',
                        color: 'text.secondary',
                        lineHeight: 1.55,
                        fontSize: { xs: '0.875rem', sm: '0.9375rem' },
                      }}
                    >
                      “{reviewConsensus.summary}”
                    </Typography>
                  ) : null}

                  {reviewConsensus.strengths.length > 0 ? (
                    <Box>
                      <Typography
                        variant="overline"
                        sx={{
                          display: 'block',
                          mb: 1,
                          color: 'success.main',
                          fontWeight: 700,
                          letterSpacing: 0.6,
                        }}
                      >
                        {t('pages.dashboard.restaurant.consensus_strengths')}
                      </Typography>
                      <Stack spacing={0.75}>
                        {reviewConsensus.strengths.map((s, i) => (
                          <Stack key={`s-${i}`} direction="row" spacing={1} alignItems="flex-start">
                            <Iconify
                              icon={ic.checkCircleBold}
                              width={16}
                              sx={{ color: 'success.main', mt: 0.25, flexShrink: 0 }}
                            />
                            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                              {s}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  ) : null}

                  {reviewConsensus.weaknesses.length > 0 ? (
                    <Box>
                      <Typography
                        variant="overline"
                        sx={{
                          display: 'block',
                          mb: 1,
                          color: 'warning.main',
                          fontWeight: 700,
                          letterSpacing: 0.6,
                        }}
                      >
                        {t('pages.dashboard.restaurant.consensus_weaknesses')}
                      </Typography>
                      <Stack spacing={0.75}>
                        {reviewConsensus.weaknesses.map((w, i) => (
                          <Stack key={`w-${i}`} direction="row" spacing={1} alignItems="flex-start">
                            <Iconify
                              icon={ic.alertTriangleFill}
                              width={16}
                              sx={{ color: 'warning.main', mt: 0.25, flexShrink: 0 }}
                            />
                            <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                              {w}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  ) : null}

                  {reviewConsensus.reviewsAnalyzed != null ? (
                    <Typography
                      variant="caption"
                      sx={{ color: 'text.disabled', fontStyle: 'italic' }}
                    >
                      {t('pages.dashboard.restaurant.consensus_basis', {
                        count: reviewConsensus.reviewsAnalyzed,
                      })}
                    </Typography>
                  ) : null}

                  {reviewConsensus.signatureDishes.length > 0 ? (
                    <Box>
                      <Typography
                        variant="overline"
                        sx={{
                          display: 'block',
                          mb: 1,
                          color: 'text.secondary',
                          fontWeight: 700,
                          letterSpacing: 0.6,
                        }}
                      >
                        {t('pages.dashboard.restaurant.consensus_dishes_mentioned')}
                      </Typography>
                      <Stack direction="row" flexWrap="wrap" gap={0.75}>
                        {reviewConsensus.signatureDishes.map((d, i) => (
                          <Chip
                            key={`d-${i}`}
                            label={`${d.label} · ${d.mentions}`}
                            size="small"
                            variant="outlined"
                            sx={{
                              fontWeight: 600,
                              borderColor: (tt) => alpha(tt.palette.primary.main, 0.4),
                              color: 'primary.dark',
                              '& .MuiChip-label': { px: 1 },
                            }}
                          />
                        ))}
                      </Stack>
                    </Box>
                  ) : null}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('pages.dashboard.restaurant.community_empty')}
                </Typography>
              )}
            </Card>
          </Box>

          {(showListsAndReviews ||
            mentionCardsTotal > 0 ||
            mentionsFeedLoading ||
            showPendingReviewSkeleton) && (
            <Box
              id="restaurant-mentions"
              component="section"
              aria-label={t('pages.dashboard.restaurant.mentions_title')}
              sx={{ scrollMarginTop: { xs: '72px', sm: '88px' } }}
            >
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                flexWrap="wrap"
                spacing={1}
                sx={{ mb: 2, rowGap: 1 }}
              >
                <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      fontFamily: theme.typography.fontSecondaryFamily,
                      fontSize: { xs: '1rem', sm: '1.25rem' },
                      lineHeight: 1.3,
                    }}
                  >
                    {t('pages.dashboard.restaurant.mentions_title')}
                  </Typography>
                  <Box
                    component="span"
                    sx={{
                      typography: 'body2',
                      fontWeight: 700,
                      fontSize: { xs: '0.8125rem', sm: '0.875rem' },
                      px: { xs: 0.875, sm: 1 },
                      py: 0.375,
                      borderRadius: '8px',
                      bgcolor: (tt) => alpha(tt.palette.grey[500], 0.12),
                      minWidth: mentionsFeedLoading ? 36 : undefined,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {mentionsFeedLoading ? (
                      <SkeletonTheme
                        baseColor={mentionsSkeletonTheme.baseColor}
                        highlightColor={mentionsSkeletonTheme.highlightColor}
                        borderRadius={6}
                        duration={1.2}
                      >
                        <Skeleton width={28} height={18} />
                      </SkeletonTheme>
                    ) : (
                      mentionCardsTotal
                    )}
                  </Box>
                </Stack>
              </Stack>

              {mentionsFeedLoading && (
                <Box
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                  aria-label={t('pages.dashboard.restaurant.mentions_title')}
                >
                  <SkeletonTheme
                    baseColor={mentionsSkeletonTheme.baseColor}
                    highlightColor={mentionsSkeletonTheme.highlightColor}
                    borderRadius={12}
                    duration={1.2}
                  >
                    <Stack spacing={2}>
                      {['msk1', 'msk2', 'msk3'].map((sk) => (
                        <Card
                          key={sk}
                          variant="outlined"
                          sx={{
                            p: { xs: 1.75, sm: 2 },
                            borderRadius: '24px',
                            boxShadow: (tt) =>
                              tt.palette.mode === 'light'
                                ? `0 1px 3px ${alpha(tt.palette.common.black, 0.06)}`
                                : 'none',
                          }}
                        >
                          <Stack
                            direction="row"
                            alignItems="flex-start"
                            spacing={{ xs: 1.5, sm: 2 }}
                          >
                            <Skeleton
                              width={48}
                              height={48}
                              style={{ borderRadius: '50%', flexShrink: 0 }}
                            />
                            <Stack spacing={0.85} sx={{ flex: 1, minWidth: 0, pt: 0.25 }}>
                              <Skeleton height={18} width="62%" style={{ borderRadius: 6 }} />
                              <Skeleton height={14} width="40%" style={{ borderRadius: 6 }} />
                              <Skeleton height={14} width="88%" style={{ borderRadius: 6 }} />
                              <Skeleton height={14} width="72%" style={{ borderRadius: 6 }} />
                            </Stack>
                          </Stack>
                        </Card>
                      ))}
                    </Stack>
                  </SkeletonTheme>
                </Box>
              )}
              {!mentionsFeedLoading && mentionCardsTotal > 0 && (
                <Stack spacing={2}>
                  {showPendingReviewSkeleton ? <ReviewPendingSkeleton key="pending-mine" /> : null}
                  {mergedMentionFeed.map((feed) => {
                    if (feed.kind === 'list_group') {
                      const {
                        groupKey,
                        primary: row,
                        lists,
                        must_try_dishes: groupMustTryDishes,
                      } = feed.payload;
                      const rev = row.contributor_review;
                      const addedBy = row?.added_by != null ? String(row.added_by) : '';
                      const isYou = myUserId && addedBy && String(myUserId) === addedBy;
                      // No-review card is only reachable for self (page filter drops list-only saves
                      // by others). Synthesize a rev-like object from the viewer's profile so the
                      // avatar + linked @handle render the same way as the with-review card.
                      const viewerPseudoRev =
                        isYou && !rev
                          ? {
                              author_avatar_url: viewerIdentity.avatarUrl,
                              author_display_name: viewerIdentity.displayName,
                              author_username: viewerIdentity.username,
                            }
                          : null;
                      let whoLabel = t('pages.dashboard.restaurant.mentions_list_member');
                      if (rev) whoLabel = restaurantReviewAuthorLabel(rev);
                      else if (viewerPseudoRev) {
                        const fromProfile = restaurantReviewAuthorLabel(viewerPseudoRev);
                        whoLabel =
                          fromProfile && fromProfile !== '—'
                            ? fromProfile
                            : t('pages.dashboard.restaurant.mentions_saved_by_you');
                      } else if (isYou)
                        whoLabel = t('pages.dashboard.restaurant.mentions_saved_by_you');
                      const avatarSrc =
                        rev?.author_avatar_url || viewerPseudoRev?.author_avatar_url || undefined;

                      const isMineReview =
                        rev &&
                        myUserId &&
                        showListsAndReviews &&
                        String(rev.user_id) === String(myUserId);

                      // Show a skeleton while the refreshed review data is in-flight.
                      if ((isMineReview || isYou) && reviewPending) {
                        return <ReviewPendingSkeleton key={groupKey} />;
                      }

                      if (rev) {
                        const cardLists = isMineReview
                          ? mergeReferencedListsById(lists, viewerSavedListRefs)
                          : lists;
                        return (
                          <MentionFeedReviewCard
                            key={groupKey}
                            rev={rev}
                            lists={cardLists}
                            mustTryDishes={groupMustTryDishes}
                            myUserId={myUserId}
                            showListsAndReviews={showListsAndReviews}
                            supabase={supabase}
                            t={t}
                            onRequestEdit={() => setSaveSheetOpen(true)}
                            nameFallback={whoLabel}
                          />
                        );
                      }

                      return (
                        <Card
                          key={groupKey}
                          variant="outlined"
                          sx={{
                            p: { xs: 1.75, sm: 2 },
                            borderRadius: '24px',
                            boxShadow: (tt) =>
                              tt.palette.mode === 'light'
                                ? `0 1px 3px ${alpha(tt.palette.common.black, 0.06)}`
                                : 'none',
                          }}
                        >
                          <Stack spacing={1.75}>
                            <Stack
                              direction="row"
                              alignItems="flex-start"
                              justifyContent="space-between"
                              spacing={{ xs: 1.5, sm: 2 }}
                              gap={1}
                            >
                              <Stack
                                direction="row"
                                alignItems="flex-start"
                                spacing={{ xs: 1.5, sm: 2 }}
                                sx={{ flex: 1, minWidth: 0 }}
                              >
                                <Box
                                  sx={{
                                    position: 'relative',
                                    width: 48,
                                    height: 48,
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    border: (tt) =>
                                      `2px solid ${alpha(tt.palette.primary.main, 0.2)}`,
                                  }}
                                >
                                  {avatarSrc ? (
                                    <RemoteCoverImage
                                      src={avatarSrc}
                                      alt={t('pages.dashboard.restaurant.reviewer_avatar_alt', {
                                        name: whoLabel,
                                      })}
                                      fill
                                      sizes="48px"
                                    />
                                  ) : (
                                    <Box
                                      sx={{
                                        width: 1,
                                        height: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        bgcolor: (tt) => alpha(tt.palette.primary.main, 0.08),
                                      }}
                                    >
                                      <Iconify
                                        icon={ic.userBold}
                                        width={24}
                                        sx={{ color: 'primary.main' }}
                                      />
                                    </Box>
                                  )}
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography
                                    variant="body2"
                                    sx={{ fontWeight: 700, wordBreak: 'break-word' }}
                                  >
                                    {authorLabelWithProfileLink({
                                      rev: rev ?? viewerPseudoRev,
                                      fallbackLabel: whoLabel,
                                    })}
                                    {isYou ? (
                                      <Box
                                        component="span"
                                        sx={{
                                          color: 'text.secondary',
                                          fontWeight: 600,
                                          ml: 0.5,
                                        }}
                                      >
                                        {t('pages.dashboard.restaurant.reviews_yours_badge')}
                                      </Box>
                                    ) : null}
                                  </Typography>
                                </Box>
                              </Stack>
                            </Stack>
                            <MentionReferencedLists lists={lists} t={t} />
                            <MustTryDishesOnReview dishes={groupMustTryDishes} t={t} />
                          </Stack>
                        </Card>
                      );
                    }
                    if (feed.kind === 'standalone_review') {
                      const rev = feed.payload;
                      const standaloneLists =
                        listsFromMentionsByUserId.get(String(rev.user_id)) ?? [];
                      const standaloneMustTry =
                        mustTryDishesByUserId.get(String(rev.user_id)) ?? [];
                      const isMineStandalone =
                        myUserId && showListsAndReviews && String(rev.user_id) === String(myUserId);
                      const standaloneCardLists = isMineStandalone
                        ? mergeReferencedListsById(standaloneLists, viewerSavedListRefs)
                        : standaloneLists;

                      // Show a skeleton while the refreshed review data is in-flight.
                      if (isMineStandalone && reviewPending) {
                        return <ReviewPendingSkeleton key={rev.id} />;
                      }

                      return (
                        <MentionFeedReviewCard
                          key={rev.id}
                          rev={rev}
                          lists={standaloneCardLists}
                          mustTryDishes={standaloneMustTry}
                          myUserId={myUserId}
                          showListsAndReviews={showListsAndReviews}
                          supabase={supabase}
                          t={t}
                          onRequestEdit={() => setSaveSheetOpen(true)}
                        />
                      );
                    }
                    return null;
                  })}
                </Stack>
              )}
              {!mentionsFeedLoading && mentionCardsTotal <= 0 && showPendingReviewSkeleton && (
                <ReviewPendingSkeleton />
              )}
              {!mentionsFeedLoading && mentionCardsTotal <= 0 && !showPendingReviewSkeleton && (
                <Card variant="outlined" sx={{ borderRadius: '24px', p: 2.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {t('pages.dashboard.restaurant.mentions_empty')}
                  </Typography>
                </Card>
              )}
            </Box>
          )}
        </Stack>
      </Card>

      {showListsAndReviews && saveSheetOpen ? (
        <SaveToListSheet
          open={saveSheetOpen}
          onClose={() => setSaveSheetOpen(false)}
          restaurantId={restaurant.id}
          onApplied={handleSaveSheetApplied}
          reviews={reviews}
          myUserId={myUserId}
        />
      ) : null}
    </Container>
  );
}

RestaurantDetailView.propTypes = {
  analyticsSurface: PropTypes.oneOf(['content_hub', 'dashboard']),
  analyticsContext: PropTypes.shape({
    country_slug: PropTypes.string,
    city_slug: PropTypes.string,
    content_slug: PropTypes.string,
  }),
  showListsAndReviews: PropTypes.bool,
  dashboardFixedBottomNav: PropTypes.bool,
  mentionsFeedLoading: PropTypes.bool,
  tagsLoading: PropTypes.bool,
  mapSheetMode: PropTypes.bool,
  onClose: PropTypes.func,
  onSaveSheetApplied: PropTypes.func,
  onGuestSaveClick: PropTypes.func,
  myUserId: PropTypes.string,
  onReviewSaved: PropTypes.func,
  listMentions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      list_id: PropTypes.string,
      restaurant_id: PropTypes.string,
      added_by: PropTypes.string,
      contributor_review: PropTypes.object,
      lists: PropTypes.oneOfType([
        PropTypes.shape({
          id: PropTypes.string,
          name: PropTypes.string,
        }),
        PropTypes.arrayOf(
          PropTypes.shape({
            id: PropTypes.string,
            name: PropTypes.string,
          })
        ),
      ]),
    })
  ),
  reviews: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      user_id: PropTypes.string.isRequired,
      rating: PropTypes.number.isRequired,
      body: PropTypes.string,
      author_display_name: PropTypes.string,
      author_username: PropTypes.string,
      author_avatar_url: PropTypes.string,
      created_at: PropTypes.string,
    })
  ),
  followCircle: PropTypes.shape({
    total: PropTypes.number.isRequired,
    members: PropTypes.arrayOf(
      PropTypes.shape({
        userId: PropTypes.string.isRequired,
        avatarUrl: PropTypes.string,
      })
    ),
  }),
  followCircleLoading: PropTypes.bool,
  savedListIds: PropTypes.arrayOf(PropTypes.string),
  savedListIdsLoading: PropTypes.bool,
  savedLists: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string,
    })
  ),
  restaurant: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    address: PropTypes.string,
    latitude: PropTypes.number,
    longitude: PropTypes.number,
    rating: PropTypes.number,
    price_level: PropTypes.number,
    phone: PropTypes.string,
    website: PropTypes.string,
    maps_link: PropTypes.string,
    menu_url: PropTypes.string,
    menu_source: PropTypes.string,
    metadata: PropTypes.object,
    /** Derived server-side from `metadata.hours_parsed`; null when hours are unknown. */
    openingStatus: PropTypes.shape({
      status: PropTypes.string,
      closesAt: PropTypes.string,
      opensAt: PropTypes.string,
    }),
    restaurant_images: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        url: PropTypes.string,
        sort_order: PropTypes.number,
        moderation_status: PropTypes.string,
      })
    ),
    home_city: PropTypes.shape({
      name: PropTypes.string,
      states: PropTypes.shape({ name: PropTypes.string }),
    }),
    tags: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        slug: PropTypes.string,
        label: PropTypes.string,
        category: PropTypes.string,
        sort_order: PropTypes.number,
      })
    ),
  }).isRequired,
};
