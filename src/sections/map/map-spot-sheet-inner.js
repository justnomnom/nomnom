'use client';

import PropTypes from 'prop-types';
import dynamic from 'next/dynamic';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import { memo, useRef, useMemo, useState, useEffect, useCallback, useLayoutEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import { alpha, useTheme } from '@mui/material/styles';
import ListItemButton from '@mui/material/ListItemButton';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';

import { useShareLink } from 'src/hooks/use-share-link';

import { fRating } from 'src/utils/format-number';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { RADIUS, tabularNumsSx } from 'src/theme/spacing';
import { hoverable } from 'src/theme/overrides/hoverable';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';
import {
  RESTAURANT_SURFACE,
  useRestaurantAnalytics,
} from 'src/libs/analytics/restaurant-analytics';

import Iconify from 'src/components/iconify';
import RemoteCoverImage from 'src/components/image/remote-cover-image';
import PhotoCarouselPillDots from 'src/components/photo-carousel-pill-dots/photo-carousel-pill-dots';

import MapSheetSortMenu from 'src/sections/map/map-sheet-sort-menu';
import { spotIdEq } from 'src/sections/map/use-restaurant-map-sheet';
import { RestaurantDetailViewMapSheet } from 'src/sections/map/map-restaurant-detail-view';
import {
  mapPlaceMapsUrl,
  mapPlaceTelHref,
  mapGalleryUrlsFromRow,
  mapPlaceNumericRating,
  mapPlaceTagLabelsCapped,
  mapPlaceTagSkeletonCount,
} from 'src/sections/map/map-spot-sheet-helpers';

const SaveToListSheet = dynamic(() => import('src/sections/lists/save-to-list-sheet'), {
  ssr: false,
});

const MAP_SHEET_LIST_ACTION_BTN_SIZE = 32;
const MAP_SHEET_LIST_ACTION_ICON = 18;
/** Full-width gallery strip height in the NomNom list row (map sheet). */
const MAP_SHEET_LIST_ROW_GALLERY_H_PX = 88;
/** Soft chips in list rows (`height: 22`); paired with `rowGap: 0.5`. */
const MAP_SHEET_LIST_CHIP_LINE_PX = 22;

/**
 * Chips fully below the clipped box bottom count as hidden (for “+N more”).
 * @param {HTMLElement | null} root
 */
function countMapSheetSpotTagsHiddenBelowClip(root) {
  if (!root) return 0;
  const nodes = root.querySelectorAll('[data-map-sheet-spot-tag]');
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
 * One NomNom List row: row 1 = title + action icons; row 2 = gallery, list rings, then tag chips
 * (collapsed with +more), full width.
 */
function MapSpotSheetListRowImpl({
  row,
  mapsUrl,
  phoneCall,
  rowListIds,
  isSaved,
  ratingVal,
  chipLabels,
  tagsLoading = false,
  listRingItems,
  followingOwners,
  followingOwnersLoading = false,
  userId,
  viewerAvatarUrl = null,
  viewerDisplayName = null,
  isHighlighted,
  itemRef,
  onSelectSpot,
  onListSave,
  onShareRow,
  onRemove,
  removeLoading = false,
  listRowActionBtnSx,
  restaurantAnalytics,
  t,
}) {
  const theme = useTheme();
  const { currentLang } = useTranslate();
  const rowSkeletonTheme = useSkeletonThemeColors();
  const galleryUrls = useMemo(() => mapGalleryUrlsFromRow(row), [row]);
  const thumb = galleryUrls[0] ?? null;
  const [listRowCarouselIndex, setListRowCarouselIndex] = useState(0);
  const [tagsExpanded, setTagsExpanded] = useState(false);
  const [tagsHiddenCount, setTagsHiddenCount] = useState(0);
  const tagsClipRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const tagsInnerRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const tagsHostRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  const tagsMaxCollapsedPx = useMemo(() => {
    const gapPx = parseFloat(String(theme.spacing(0.5))) || 4;
    const lines = 2;
    return MAP_SHEET_LIST_CHIP_LINE_PX * lines + gapPx * (lines - 1);
  }, [theme]);

  const tagSkeletonCount = useMemo(
    () => (tagsLoading ? mapPlaceTagSkeletonCount(row) : 0),
    [tagsLoading, row]
  );

  const safeFollowingOwners = useMemo(() => followingOwners ?? [], [followingOwners]);
  const viewerAvatarUrlFromListMeta = useMemo(() => {
    if (!isSaved || !userId || !Array.isArray(listRingItems) || listRingItems.length === 0)
      return null;
    const viewerId = String(userId);
    const pick = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
    const owned = listRingItems.find((item) => String(item?.owner_id ?? '') === viewerId);
    return pick(owned?.owner_avatar_url);
  }, [isSaved, listRingItems, userId]);
  const effectiveViewerAvatarUrl = viewerAvatarUrl || viewerAvatarUrlFromListMeta || null;

  const youAvatarInitial = useMemo(() => {
    const s = viewerDisplayName && String(viewerDisplayName).trim();
    if (s) return s[0].toUpperCase();
    return 'Y';
  }, [viewerDisplayName]);

  const updateTagOverflow = useCallback(() => {
    const root = tagsClipRef.current;
    if (root && !tagsExpanded && chipLabels.length > 0) {
      setTagsHiddenCount(countMapSheetSpotTagsHiddenBelowClip(root));
    } else {
      setTagsHiddenCount(0);
    }
  }, [tagsExpanded, chipLabels.length]);

  useLayoutEffect(() => {
    updateTagOverflow();
  }, [updateTagOverflow]);

  useEffect(() => {
    setTagsExpanded(false);
    setListRowCarouselIndex(0);
  }, [row.id]);

  const handleListRowThumbCarouselScroll = useCallback(
    (e) => {
      const el = e.currentTarget;
      const w = el.clientWidth;
      if (w <= 0) return;
      const i = Math.round(el.scrollLeft / w);
      setListRowCarouselIndex(Math.min(Math.max(0, i), Math.max(0, galleryUrls.length - 1)));
    },
    [galleryUrls.length]
  );

  /**
   * Skip the layout-watching observers when there are no chips to clip — saves 80+
   * ResizeObserver instantiations on a fresh map load. Viewport resizes already reach this
   * code via the observed elements re-laying out, so no separate window listener is needed.
   */
  useEffect(() => {
    if (chipLabels.length === 0) return undefined;
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => {
      updateTagOverflow();
    });
    [tagsClipRef.current, tagsInnerRef.current, tagsHostRef.current]
      .filter(Boolean)
      .forEach((el) => ro.observe(el));
    return () => {
      ro.disconnect();
    };
  }, [updateTagOverflow, tagsExpanded, chipLabels.length]);

  const stopRowSelect = (e) => {
    e.stopPropagation();
  };

  let listRowThumbInner;
  if (galleryUrls.length > 1) {
    listRowThumbInner = (
      <>
        <Box
          onScroll={handleListRowThumbCarouselScroll}
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollSnapType: 'x mandatory',
            scrollBehavior: 'smooth',
            overscrollBehaviorX: 'contain',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            // `pan-x` alone blocks vertical scrolls that start on the thumbnail —
            // a real problem when the bottom row's image fills most of the visible
            // sheet and the user tries to swipe back up the list. `pan-x pan-y`
            // lets the browser pick the dominant axis: horizontal swipes still
            // drive the carousel, vertical swipes scroll the list.
            touchAction: 'pan-x pan-y',
            '&::-webkit-scrollbar': { display: 'none' },
          }}
        >
          {galleryUrls.map((src, idx) => (
            <Box
              key={`${src}-${idx}`}
              sx={{
                position: 'relative',
                minWidth: '100%',
                height: 1,
                minHeight: 0,
                flexShrink: 0,
                scrollSnapAlign: 'start',
                scrollSnapStop: 'always',
                /* Later slides are off-screen horizontally — let the browser skip painting
                 * them until the user swipes. Pairs with next/image's lazy loading below so
                 * the network *and* the paint pipeline both stay quiet for slides #2+. */
                ...(idx === 0
                  ? null
                  : { contentVisibility: 'auto', containIntrinsicSize: '100% 88px' }),
              }}
            >
              {/* Loading/error fallback glyph sits behind; the optimized image covers
                  it once loaded (and reveals it again if the source 404s). DESIGN.md §15. */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Iconify icon={ic.shopBold} width={28} sx={{ color: 'grey.400' }} />
              </Box>
              {/* next/image (via RemoteCoverImage) resizes Supabase/Google/Unsplash
                  sources to the thumbnail size + serves AVIF/WebP instead of full-res. */}
              <RemoteCoverImage src={src} alt="" fill sizes="(max-width: 600px) 92vw, 480px" />
            </Box>
          ))}
        </Box>
        <PhotoCarouselPillDots
          total={galleryUrls.length}
          activeIndex={listRowCarouselIndex}
          variant="compact"
        />
      </>
    );
  } else if (thumb) {
    listRowThumbInner = (
      <>
        {/* Fallback glyph behind the optimized image (DESIGN.md §15). */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Iconify icon={ic.shopBold} width={28} sx={{ color: 'grey.400' }} />
        </Box>
        <RemoteCoverImage src={thumb} alt="" fill sizes="(max-width: 600px) 92vw, 480px" />
      </>
    );
  } else {
    listRowThumbInner = (
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Iconify icon={ic.shopBold} width={28} sx={{ color: 'grey.400' }} />
      </Box>
    );
  }

  return (
    <Stack
      ref={itemRef}
      component="li"
      direction="row"
      alignItems="stretch"
      spacing={0.75}
      sx={{
        mb: 0.5,
        py: 1.1,
        pl: 1.5,
        pr: 1,
        borderRadius: 2,
        listStyle: 'none',
        bgcolor: isHighlighted ? (tt) => alpha(tt.palette.primary.main, 0.08) : undefined,
        transition: (tt) => tt.transitions.create('background-color', { duration: 200 }),
        /**
         * Skip paint/layout for rows scrolled out of view. Browser still reserves space via
         * `contain-intrinsic-size`, IntersectionObserver still fires, but offscreen rows don't
         * pay the cost of rendering their gallery + chips + ring avatars. Major mobile win on
         * long lists. The intrinsic-size estimate (~280px) covers a typical row with a chip line.
         */
        contentVisibility: 'auto',
        containIntrinsicSize: '0 280px',
        ...hoverable({
          bgcolor: isHighlighted ? (tt) => alpha(tt.palette.primary.main, 0.13) : 'action.hover',
        }),
      }}
    >
      <ListItemButton
        component="div"
        role="button"
        tabIndex={0}
        onClick={() => onSelectSpot(row.id)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectSpot(row.id);
          }
        }}
        sx={{
          flex: '1 1 0%',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 0.75,
          py: 0,
          px: 0,
          borderRadius: 0,
          bgcolor: 'transparent',
          textAlign: 'left',
          ...hoverable({ bgcolor: 'transparent' }),
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            alignItems: 'center',
            columnGap: 0.75,
            width: 1,
            minWidth: 0,
            pr: 0.5,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0, width: 1 }}>
            <Typography
              component="span"
              variant="subtitle2"
              sx={{
                flex: '1 1 0%',
                minWidth: 0,
                fontWeight: 800,
                fontSize: '0.9375rem',
                lineHeight: 1.35,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {row.name}
            </Typography>
            {row.is_sponsored === true ? (
              <Chip
                label={t('pages.dashboard.discover.sponsored_badge')}
                size="small"
                sx={{
                  height: 20,
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  flexShrink: 0,
                  bgcolor: (tt) => alpha(tt.palette.warning.main, 0.14),
                  color: 'warning.main',
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            ) : null}
            {ratingVal != null ? (
              <Stack direction="row" alignItems="center" spacing={0.35} sx={{ flexShrink: 0 }}>
                <Iconify
                  icon={ic.starBold}
                  width={14}
                  sx={{ color: 'warning.main', flexShrink: 0 }}
                />
                <Typography
                  variant="caption"
                  component="span"
                  sx={{ fontWeight: 800, lineHeight: 1.2, color: 'text.primary', ...tabularNumsSx }}
                >
                  {fRating(ratingVal, currentLang)}
                </Typography>
              </Stack>
            ) : null}
          </Stack>
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            flexShrink={0}
            onClick={stopRowSelect}
            onKeyDown={stopRowSelect}
          >
            <IconButton
              size="small"
              aria-label={t('pages.dashboard.restaurant.save_aria')}
              onClick={(e) => {
                stopRowSelect(e);
                onListSave(String(row.id));
              }}
              sx={[
                listRowActionBtnSx,
                ...(isSaved
                  ? [
                      {
                        color: 'primary.main',
                        borderColor: (tt) => alpha(tt.palette.primary.main, 0.45),
                        bgcolor: (tt) => alpha(tt.palette.primary.main, 0.12),
                        ...hoverable({
                          bgcolor: (tt) => alpha(tt.palette.primary.main, 0.18),
                        }),
                      },
                    ]
                  : []),
              ]}
            >
              <Iconify
                icon={isSaved ? ic.bookmarkBold : ic.bookmarkLinear}
                width={MAP_SHEET_LIST_ACTION_ICON}
              />
            </IconButton>
            <IconButton
              size="small"
              aria-label={t('pages.dashboard.restaurant.share_aria')}
              onClick={(e) => {
                stopRowSelect(e);
                onShareRow(row);
              }}
              sx={listRowActionBtnSx}
            >
              <Iconify icon={ic.shareLinear} width={MAP_SHEET_LIST_ACTION_ICON} />
            </IconButton>
            {mapsUrl ? (
              <IconButton
                component="a"
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                size="small"
                aria-label={t('pages.dashboard.restaurant.open_maps_aria')}
                onClick={(e) => {
                  stopRowSelect(e);
                  restaurantAnalytics.trackMapsClicked({
                    restaurant_id: String(row.id),
                    surface: RESTAURANT_SURFACE.MAP_SHEET,
                  });
                }}
                sx={listRowActionBtnSx}
              >
                <Iconify icon={ic.mapPointBold} width={MAP_SHEET_LIST_ACTION_ICON} />
              </IconButton>
            ) : null}
            {phoneCall ? (
              <IconButton
                component="a"
                href={phoneCall.href}
                size="small"
                aria-label={t('pages.dashboard.restaurant.call_restaurant_aria', {
                  phone: phoneCall.display,
                })}
                onClick={stopRowSelect}
                sx={listRowActionBtnSx}
              >
                <Iconify icon={ic.phoneBold} width={MAP_SHEET_LIST_ACTION_ICON} />
              </IconButton>
            ) : null}
            {onRemove ? (
              <IconButton
                size="small"
                aria-label={t('pages.lists.remove')}
                disabled={removeLoading}
                onClick={(e) => {
                  stopRowSelect(e);
                  onRemove();
                }}
                sx={listRowActionBtnSx}
              >
                {removeLoading ? (
                  <CircularProgress size={MAP_SHEET_LIST_ACTION_ICON} color="inherit" />
                ) : (
                  <Iconify icon={ic.trashBold} width={MAP_SHEET_LIST_ACTION_ICON} />
                )}
              </IconButton>
            ) : null}
          </Stack>
        </Box>
        <Stack spacing={0.5} sx={{ width: 1, minWidth: 0, pr: 0.5 }}>
          <Box
            sx={{
              width: 1,
              minWidth: 0,
              height: MAP_SHEET_LIST_ROW_GALLERY_H_PX,
              position: 'relative',
              borderRadius: `${RADIUS.base}px`,
              overflow: 'hidden',
              /**
               * Image fallback per DESIGN.md §15: parchment background (not cool grey, which
               * reads as a loading failure) behind the centered food glyph. Dark mode keeps
               * the neutral hover tone — parchment would glare there.
               */
              bgcolor: (tt) =>
                tt.palette.mode === 'light'
                  ? tt.palette.marketing.parchment
                  : tt.palette.action.hover,
              boxShadow: (tt) =>
                tt.palette.mode === 'light'
                  ? `0 1px 3px ${alpha(tt.palette.common.black, 0.08)}`
                  : `0 1px 3px ${alpha(tt.palette.common.black, 0.35)}`,
            }}
          >
            {listRowThumbInner}
          </Box>
          {(() => {
            const avatarSx = (i) => ({
              width: 22,
              height: 22,
              fontSize: '0.55rem',
              fontWeight: 800,
              ml: i > 0 ? -0.6 : 0,
              border: '2px solid',
              borderColor: 'background.paper',
              boxShadow: 1,
              bgcolor: (tt) => alpha(tt.palette.primary.main, 0.15),
              color: 'primary.main',
            });
            const showFollowingSkeleton = Boolean(userId && followingOwnersLoading);
            const showSocialRow =
              !showFollowingSkeleton && (isSaved || safeFollowingOwners.length > 0);

            if (showFollowingSkeleton) {
              return (
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={0.65}
                  sx={{ minWidth: 0, overflow: 'hidden' }}
                  aria-busy="true"
                  aria-label={t('pages.dashboard.map.sheet_following_loading_aria')}
                >
                  <SkeletonTheme
                    baseColor={rowSkeletonTheme.baseColor}
                    highlightColor={rowSkeletonTheme.highlightColor}
                  >
                    <Stack direction="row" alignItems="center" sx={{ flexShrink: 0 }}>
                      {isSaved ? (
                        <Avatar
                          key="viewer-you"
                          src={effectiveViewerAvatarUrl || undefined}
                          alt=""
                          sx={avatarSx(0)}
                        >
                          {!effectiveViewerAvatarUrl ? youAvatarInitial : null}
                        </Avatar>
                      ) : null}
                      {[0, 1, 2].map((i) => (
                        <Skeleton
                          key={i}
                          circle
                          width={22}
                          height={22}
                          style={{
                            marginLeft: i > 0 || isSaved ? -4.8 : 0,
                            flexShrink: 0,
                            border: `2px solid ${theme.palette.background.paper}`,
                            boxSizing: 'content-box',
                          }}
                        />
                      ))}
                    </Stack>
                    <Box sx={{ flex: 1, maxWidth: 200, minWidth: 72 }}>
                      <Skeleton height={14} borderRadius={RADIUS.base} />
                    </Box>
                  </SkeletonTheme>
                </Stack>
              );
            }

            if (!showSocialRow) return null;

            const totalCount = (isSaved ? 1 : 0) + safeFollowingOwners.length;
            const maxAvatars = 3;
            const maxNamesShown = 3;
            const extraAvatars = Math.max(0, totalCount - maxAvatars);
            const followingSlice = safeFollowingOwners.slice(
              0,
              isSaved ? maxAvatars - 1 : maxAvatars
            );
            const followingNameLabels = safeFollowingOwners
              .map((o) => o.displayName || (o.username ? `@${o.username}` : null))
              .filter(Boolean);
            const nameParts = [...(isSaved ? ['You'] : []), ...followingNameLabels];
            const shownNames = nameParts.slice(0, maxNamesShown);
            const extraNames = Math.max(0, nameParts.length - shownNames.length);
            const namesText =
              extraNames > 0
                ? `${shownNames.join(', ')} +${extraNames} more`
                : shownNames.join(', ');

            return (
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.65}
                sx={{ minWidth: 0, overflow: 'hidden' }}
              >
                <Stack direction="row" alignItems="center" sx={{ flexShrink: 0 }}>
                  {isSaved ? (
                    <Avatar
                      key="viewer-you"
                      src={effectiveViewerAvatarUrl || undefined}
                      alt=""
                      sx={avatarSx(0)}
                    >
                      {!effectiveViewerAvatarUrl ? youAvatarInitial : null}
                    </Avatar>
                  ) : null}
                  {followingSlice.map((owner, i) => {
                    const label =
                      owner.displayName || (owner.username ? `@${owner.username}` : null);
                    return (
                      <Avatar
                        key={owner.userId}
                        src={owner.avatarUrl || undefined}
                        alt=""
                        title={label || undefined}
                        sx={avatarSx(isSaved ? i + 1 : i)}
                      >
                        {!owner.avatarUrl && label ? label[0].toUpperCase() : null}
                      </Avatar>
                    );
                  })}
                  {extraAvatars > 0 ? (
                    <Avatar
                      sx={{
                        width: 22,
                        height: 22,
                        ml: -0.6,
                        fontSize: '0.5rem',
                        fontWeight: 800,
                        border: '2px solid',
                        borderColor: 'background.paper',
                        boxShadow: 1,
                        bgcolor: (tt) => alpha(tt.palette.grey[500], 0.2),
                        color: 'text.secondary',
                      }}
                    >
                      +{extraAvatars}
                    </Avatar>
                  ) : null}
                </Stack>
                <Typography
                  noWrap
                  sx={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: 'text.secondary',
                    minWidth: 0,
                    lineHeight: 1.3,
                  }}
                >
                  {namesText}
                </Typography>
              </Stack>
            );
          })()}
          {tagsLoading && tagSkeletonCount > 0 ? (
            <Box
              role="status"
              aria-busy="true"
              sx={{
                position: 'relative',
                width: 1,
                minWidth: 0,
                boxSizing: 'border-box',
                pt: 0.15,
              }}
            >
              <Stack
                direction="row"
                flexWrap="wrap"
                useFlexGap
                sx={{
                  width: 1,
                  minWidth: 0,
                  columnGap: 0.5,
                  rowGap: 0.5,
                  alignItems: 'center',
                }}
              >
                {Array.from({ length: tagSkeletonCount }).map((_, i) => (
                  <Skeleton
                    key={`${row.id}-tag-skeleton-${i}`}
                    height={MAP_SHEET_LIST_CHIP_LINE_PX}
                    width={[48, 64, 56, 72][i % 4]}
                    style={{ borderRadius: RADIUS.pill }}
                  />
                ))}
              </Stack>
            </Box>
          ) : null}
          {!tagsLoading && chipLabels.length > 0 ? (
            <Box
              ref={tagsHostRef}
              sx={{
                position: 'relative',
                width: 1,
                minWidth: 0,
                boxSizing: 'border-box',
                pt: 0.15,
              }}
            >
              {!tagsExpanded ? (
                <Box
                  aria-hidden
                  ref={tagsClipRef}
                  sx={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    maxHeight: tagsMaxCollapsedPx,
                    overflow: 'hidden',
                    visibility: 'hidden',
                    pointerEvents: 'none',
                    zIndex: -1,
                  }}
                >
                  <Stack
                    ref={tagsInnerRef}
                    direction="row"
                    flexWrap="wrap"
                    useFlexGap
                    sx={{ width: 1, minWidth: 0, columnGap: 0.5, rowGap: 0.5 }}
                  >
                    {chipLabels.map((label, i) => (
                      <Chip
                        key={`${row.id}-tag-measure-${i}`}
                        data-map-sheet-spot-tag
                        size="small"
                        label={label}
                        variant="soft"
                        color="default"
                        sx={{
                          height: MAP_SHEET_LIST_CHIP_LINE_PX,
                          maxWidth: '100%',
                          '& .MuiChip-label': {
                            px: 0.85,
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          },
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              ) : null}
              <Stack
                direction="row"
                flexWrap="wrap"
                useFlexGap
                sx={{
                  width: 1,
                  minWidth: 0,
                  columnGap: 0.5,
                  rowGap: 0.5,
                  alignItems: 'center',
                }}
              >
                {(tagsExpanded
                  ? chipLabels
                  : chipLabels.slice(0, Math.max(0, chipLabels.length - tagsHiddenCount))
                ).map((label, i) => (
                  <Chip
                    key={`${row.id}-tag-${i}-${label}`}
                    size="small"
                    label={label}
                    variant="soft"
                    color="default"
                    sx={{
                      height: MAP_SHEET_LIST_CHIP_LINE_PX,
                      maxWidth: '100%',
                      flexShrink: 0,
                      '& .MuiChip-label': {
                        px: 0.85,
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      },
                    }}
                  />
                ))}
                {(tagsHiddenCount > 0 || tagsExpanded) && (
                  <Chip
                    clickable
                    onClick={(e) => {
                      e.stopPropagation();
                      setTagsExpanded((v) => !v);
                    }}
                    label={
                      tagsExpanded
                        ? t('pages.dashboard.restaurant.detail_tags_show_less')
                        : t('pages.dashboard.restaurant.detail_tags_more_count', {
                            count: tagsHiddenCount,
                          })
                    }
                    size="small"
                    variant="outlined"
                    color="primary"
                    aria-expanded={tagsExpanded}
                    aria-label={
                      tagsExpanded
                        ? t('pages.dashboard.restaurant.detail_tags_collapse_aria')
                        : t('pages.dashboard.restaurant.detail_tags_expand_aria')
                    }
                    sx={{
                      flexShrink: 0,
                      height: MAP_SHEET_LIST_CHIP_LINE_PX,
                      fontWeight: 700,
                      fontSize: '0.6875rem',
                    }}
                  />
                )}
              </Stack>
            </Box>
          ) : null}
        </Stack>
      </ListItemButton>
    </Stack>
  );
}

/**
 * Compare arrays of primitives by content.
 * @param {readonly unknown[] | null | undefined} a
 * @param {readonly unknown[] | null | undefined} b
 */
function shallowArrayEqual(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Compare `listRingItems` by the stable identifiers (id + cover + name) we actually render.
 * @param {ReadonlyArray<{ id?: unknown, name?: unknown, cover_image_url?: unknown }> | null | undefined} a
 * @param {ReadonlyArray<{ id?: unknown, name?: unknown, cover_image_url?: unknown }> | null | undefined} b
 */
function listRingItemsEqual(a, b) {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i];
    if (x !== y) {
      if (!x || !y) return false;
      if (x.id !== y.id) return false;
      if (x.name !== y.name) return false;
      if (x.cover_image_url !== y.cover_image_url) return false;
    }
  }
  return true;
}

/**
 * Custom memo equality so re-renders don't fire just because the parent's `.map()` re-derived
 * fresh array references on every render — those arrays have stable content while their identity
 * always changes. Without this, none of the row memoization actually skips work.
 * @param {Record<string, unknown>} prev
 * @param {Record<string, unknown>} next
 */
function arePropsEqualForListRow(prev, next) {
  if (prev.row !== next.row) return false;
  const scalarKeys = [
    'mapsUrl',
    'isSaved',
    'ratingVal',
    'tagsLoading',
    'followingOwnersLoading',
    'userId',
    'viewerAvatarUrl',
    'viewerDisplayName',
    'isHighlighted',
    'itemRef',
    'onSelectSpot',
    'onListSave',
    'onShareRow',
    'onRemove',
    'removeLoading',
    'listRowActionBtnSx',
    'restaurantAnalytics',
    't',
  ];
  for (let i = 0; i < scalarKeys.length; i += 1) {
    const k = scalarKeys[i];
    if (prev[k] !== next[k]) return false;
  }
  if (prev.phoneCall !== next.phoneCall) {
    // phoneCall is an object — same number means same row's phone, so compare href.
    if (!prev.phoneCall || !next.phoneCall) return false;
    if (prev.phoneCall.href !== next.phoneCall.href) return false;
  }
  if (!shallowArrayEqual(prev.chipLabels, next.chipLabels)) return false;
  if (!shallowArrayEqual(prev.rowListIds, next.rowListIds)) return false;
  if (!shallowArrayEqual(prev.followingOwners, next.followingOwners)) return false;
  if (!listRingItemsEqual(prev.listRingItems, next.listRingItems)) return false;
  return true;
}

export const MapSpotSheetListRow = memo(MapSpotSheetListRowImpl, arePropsEqualForListRow);

MapSpotSheetListRowImpl.propTypes = {
  row: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string,
    is_sponsored: PropTypes.bool,
  }).isRequired,
  mapsUrl: PropTypes.string,
  phoneCall: PropTypes.object,
  rowListIds: PropTypes.array,
  isSaved: PropTypes.bool,
  /** @see mapPlaceNumericRating — may be null */
  ratingVal: PropTypes.any,
  chipLabels: PropTypes.arrayOf(PropTypes.string).isRequired,
  tagsLoading: PropTypes.bool,
  listRingItems: PropTypes.array,
  followingOwners: PropTypes.array,
  followingOwnersLoading: PropTypes.bool,
  userId: PropTypes.string,
  viewerAvatarUrl: PropTypes.string,
  viewerDisplayName: PropTypes.string,
  isHighlighted: PropTypes.bool,
  itemRef: PropTypes.func,
  onSelectSpot: PropTypes.func.isRequired,
  onListSave: PropTypes.func.isRequired,
  onShareRow: PropTypes.func.isRequired,
  onRemove: PropTypes.func,
  removeLoading: PropTypes.bool,
  listRowActionBtnSx: PropTypes.oneOfType([PropTypes.object, PropTypes.array]).isRequired,
  restaurantAnalytics: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired,
};

/**
 * Scrollable map sheet body: loading skeleton, spot list (NomNom List heading), or selected restaurant detail.
 * Shared by dashboard map and list map.
 */
function MapSpotSheetInner({
  placesLoading,
  places,
  /** Current sort mode. When `onSortModeChange` is provided, sort pills render atop the list. */
  sortMode = null,
  onSortModeChange = null,
  selected,
  sheetRestaurant,
  sheetReviews,
  sheetListMentions,
  sheetFeedLoading,
  sheetFollowCircle = null,
  sheetFollowCircleLoading = false,
  selectedSavedListIds,
  selectedSavedListIdsLoading = false,
  savedListIdsByRestaurant = {},
  listMetaById = {},
  followingOwnersByRestaurant = {},
  followingOwnersLoading = false,
  userId,
  viewerAvatarUrl = null,
  viewerDisplayName = null,
  tagCatalog,
  /** False until the tag catalog has loaded — drives skeleton chips in the embedded detail view. */
  tagCatalogLoaded = true,
  highlightedId,
  onSelectSpot,
  onCloseDetail,
  onSaveApplied,
  refetchSheetReviews,
  sheetEmptyCopy,
  isMobileSheet,
  /** i18n key for list heading above sheet rows; default matches dashboard map. */
  spotsHeadingKey = 'pages.dashboard.map.sheet_spots_in_view',
  /** When set (e.g. snapshot purchase size), shown in the sheet list heading. */
  spotsHeadingBadgeCount = null,
  /** Owned + shared lists prefetched by the map view — passed to SaveToListSheet. */
  preloadedMyLists = null,
  /** False while map-owned or map-shared list prefetch is still in flight. */
  preloadedMyListsReady = true,
  /**
   * When provided, intercepts the per-row save click (bookmark icon) and the embedded detail-view's
   * save click, bypassing the internal SaveToListSheet. Used by the public list view to surface a
   * sign-in / sign-up prompt for unauthenticated viewers.
   */
  onGuestSaveClick = null,
  /**
   * Identity of the current result set (area + filters). When it changes the row-render batch
   * resets to the top; when only more rows are *appended* (load more) it stays put so the list
   * doesn't collapse. Falls back to `places` identity when not provided (fixed-list consumers).
   */
  listResetKey = null,
  /** True when more detailed rows can be loaded for the list (bbox mode, under the cap). */
  hasMoreSpots = false,
  /** True while a load-more fetch is in flight (drives the button spinner). */
  loadingMoreSpots = false,
  /** Fetch the next page of detailed rows. */
  onLoadMoreSpots = null,
}) {
  const { t } = useTranslate();
  const theme = useTheme();
  const restaurantAnalytics = useRestaurantAnalytics();
  const [listSaveForId, setListSaveForId] = useState(/** @type {string | null} */ (null));
  const {
    share: shareLink,
    feedback: shareFeedback,
    dismissFeedback: dismissShareFeedback,
  } = useShareLink();

  /** Tracks rendered row DOM nodes for the `highlightedId` scrollIntoView feature. */
  const rowRefs = useRef(new Map());

  /**
   * Up to MAP_VIEW_FETCH_LIMIT rows can land in `places` at once. Each row mounts
   * an IntersectionObserver target, a ResizeObserver across 3 nodes, a useLayoutEffect that reads
   * layout for tag clipping, and a photo carousel — synchronously rendering all of them blocks
   * input on mobile for seconds. Render in small batches with setTimeout yields so the browser
   * can paint and handle gestures between chunks.
   */
  const INITIAL_ROW_LIMIT = 20;
  const ROW_BATCH_SIZE = 20;
  const ROW_BATCH_DELAY_MS = 60;
  const [renderLimit, setRenderLimit] = useState(INITIAL_ROW_LIMIT);
  /**
   * Reset the batch to the top only when the result set itself changes (new area/filters). When
   * `listResetKey` is provided (dashboard map pagination), appending more rows keeps the same key
   * so the list doesn't snap back to 20. Fixed-list consumers pass none → reset on `places`.
   */
  const renderResetKey = listResetKey != null ? listResetKey : places;
  useEffect(() => {
    setRenderLimit(INITIAL_ROW_LIMIT);
  }, [renderResetKey]);
  useEffect(() => {
    if (renderLimit >= places.length) return undefined;
    const id = setTimeout(() => {
      setRenderLimit((n) => Math.min(places.length, n + ROW_BATCH_SIZE));
    }, ROW_BATCH_DELAY_MS);
    return () => clearTimeout(id);
  }, [renderLimit, places.length]);
  const placesToRender = useMemo(
    () => (renderLimit >= places.length ? places : places.slice(0, renderLimit)),
    [places, renderLimit]
  );

  /**
   * The map now shows every place from `sourcePlaces` directly (Mapbox handles density via
   * clustering), so the sheet no longer needs to feed visible-row ids back up to filter pins.
   * Ref callback is just a Map for the `highlightedId` scrollIntoView lookup below.
   */
  const setRowRef = useCallback((id, el) => {
    const key = String(id);
    if (el) {
      rowRefs.current.set(key, el);
    } else {
      rowRefs.current.delete(key);
    }
  }, []);

  /**
   * Per-id ref callback cache. The previous inline `itemRef={(el) => setRowRef(row.id, el)}`
   * created a new function per row per render — React then called the *old* ref with `null`
   * and the *new* ref with the element on every parent re-render, which made the
   * IntersectionObserver unobserve+re-observe every visible row on every render (and broke
   * `MapSpotSheetListRow`'s memo via prop identity change). The cached callbacks read the
   * latest `setRowRef` from a ref so they stay referentially stable for the component's lifetime.
   */
  const setRowRefLatestRef = useRef(setRowRef);
  useEffect(() => {
    setRowRefLatestRef.current = setRowRef;
  }, [setRowRef]);
  const itemRefByIdRef = useRef(
    /** @type {Map<string, (el: HTMLElement | null) => void>} */ (new Map())
  );
  const getItemRef = useCallback((id) => {
    const key = String(id);
    const cache = itemRefByIdRef.current;
    let fn = cache.get(key);
    if (!fn) {
      fn = (el) => setRowRefLatestRef.current(id, el);
      cache.set(key, fn);
    }
    return fn;
  }, []);

  useEffect(() => {
    if (!highlightedId) return;
    const el = rowRefs.current.get(String(highlightedId));
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlightedId]);

  const sheetSpotsSkeletonTheme = useSkeletonThemeColors();

  const listRowActionBtnSx = useMemo(() => {
    const borderAlpha = theme.palette.mode === 'dark' ? 0.2 : 0.55;
    return {
      width: MAP_SHEET_LIST_ACTION_BTN_SIZE,
      height: MAP_SHEET_LIST_ACTION_BTN_SIZE,
      p: 0,
      flexShrink: 0,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: '50%',
      bgcolor: (tt) => alpha(tt.palette.background.paper, 0.96),
      boxShadow: theme.shadows[2],
      color: 'text.primary',
      border: `1px solid ${alpha(theme.palette.common.white, borderAlpha)}`,
      WebkitTapHighlightColor: 'transparent',
      ...hoverable({ bgcolor: (tt) => alpha(tt.palette.background.paper, 0.98) }),
    };
  }, [theme]);

  const handleShareRow = useCallback(
    async (row) => {
      restaurantAnalytics.trackShareClicked({
        restaurant_id: String(row.id),
        surface: RESTAURANT_SURFACE.MAP_SHEET,
      });
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      await shareLink({ url: `${base}${paths.restaurantPublic(row.id)}`, title: row.name });
    },
    [restaurantAnalytics, shareLink]
  );

  const handleListSaveApplied = useCallback(() => {
    setListSaveForId(null);
    onSaveApplied?.();
  }, [onSaveApplied]);

  /**
   * Only show the skeleton on a true first load. During viewport-driven refetches we already
   * have rows to show — wiping them to a skeleton on every pan made the sheet feel like it was
   * constantly "refreshing and reloading". Keep showing the existing list while new data arrives.
   */
  const showInitialSkeleton = placesLoading && places.length === 0 && !selected;

  return (
    <>
      {showInitialSkeleton && (
        <Box
          role="status"
          aria-live="polite"
          aria-label={t('pages.dashboard.map.loading_spots')}
          sx={{
            px: 1.5,
            pb: 1,
            pt: { xs: 0.5, md: 2 },
          }}
        >
          <SkeletonTheme
            baseColor={sheetSpotsSkeletonTheme.baseColor}
            highlightColor={sheetSpotsSkeletonTheme.highlightColor}
            borderRadius={8}
            duration={1.2}
          >
            {['sk1', 'sk2', 'sk3', 'sk4', 'sk5', 'sk6'].map((skKey) => (
              <Stack
                key={skKey}
                direction="column"
                spacing={0.85}
                sx={{
                  py: 1.1,
                  '&:not(:last-of-type)': { mb: 0.5 },
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={1}
                  sx={{ pr: 0.5 }}
                >
                  <Skeleton height={18} width="58%" style={{ borderRadius: 6 }} />
                  <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
                    <Skeleton
                      height={MAP_SHEET_LIST_ACTION_BTN_SIZE}
                      width={MAP_SHEET_LIST_ACTION_BTN_SIZE}
                      style={{ borderRadius: '50%' }}
                    />
                    <Skeleton
                      height={MAP_SHEET_LIST_ACTION_BTN_SIZE}
                      width={MAP_SHEET_LIST_ACTION_BTN_SIZE}
                      style={{ borderRadius: '50%' }}
                    />
                  </Stack>
                </Stack>
                <Skeleton height={MAP_SHEET_LIST_ROW_GALLERY_H_PX} style={{ borderRadius: 12 }} />
                {userId ? (
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0.65}
                    sx={{ width: 1, minWidth: 0 }}
                  >
                    <Skeleton width={14} height={14} circle />
                    <Stack direction="row" alignItems="center" sx={{ flexShrink: 0 }}>
                      <Skeleton width={22} height={22} circle />
                      <Skeleton width={22} height={22} circle style={{ marginLeft: -4.8 }} />
                      <Skeleton width={22} height={22} circle style={{ marginLeft: -4.8 }} />
                    </Stack>
                    <Skeleton height={14} width="52%" style={{ borderRadius: 6 }} />
                  </Stack>
                ) : null}
                <Skeleton height={22} width="88%" style={{ borderRadius: RADIUS.pill }} />
              </Stack>
            ))}
          </SkeletonTheme>
        </Box>
      )}
      {!showInitialSkeleton && selected && sheetRestaurant ? (
        <RestaurantDetailViewMapSheet
          key={String(selected.id)}
          mapSheetMode
          restaurant={sheetRestaurant}
          tagsLoading={!tagCatalogLoaded}
          savedListIds={selectedSavedListIds}
          savedListIdsLoading={selectedSavedListIdsLoading}
          followCircle={sheetFollowCircle}
          followCircleLoading={sheetFollowCircleLoading}
          onClose={onCloseDetail}
          onSaveSheetApplied={onSaveApplied}
          onGuestSaveClick={onGuestSaveClick ? () => onGuestSaveClick(selected?.id ?? null) : null}
          reviews={sheetReviews}
          listMentions={sheetListMentions}
          mentionsFeedLoading={sheetFeedLoading}
          myUserId={userId}
          onReviewSaved={refetchSheetReviews}
        />
      ) : null}
      {!showInitialSkeleton && !selected && (
        <>
          {places.length === 0 ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                px: 3,
                pt: isMobileSheet ? 2 : 4,
                pb: 3,
              }}
            >
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: '16px',
                  bgcolor: (tt) =>
                    alpha(tt.palette.text.primary, tt.palette.mode === 'dark' ? 0.07 : 0.05),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 1.75,
                }}
              >
                <Iconify icon={ic.shopBold} width={26} sx={{ color: 'text.disabled' }} />
              </Box>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ lineHeight: 1.6, maxWidth: 260 }}
              >
                {sheetEmptyCopy}
              </Typography>
            </Box>
          ) : (
            <>
              {shareFeedback ? (
                <Alert
                  severity={shareFeedback.severity}
                  onClose={dismissShareFeedback}
                  sx={{ mx: 1.5, mb: 0.5, mt: { xs: 0.25, md: 2 } }}
                >
                  {shareFeedback.text}
                </Alert>
              ) : null}
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{
                  px: 1.5,
                  pt: shareFeedback ? 0.5 : { xs: 0.25, md: 2 },
                  pb: onSortModeChange ? 1 : 0.5,
                }}
              >
                <Typography
                  component="p"
                  variant="caption"
                  sx={{
                    flex: '1 1 auto',
                    minWidth: 0,
                    m: 0,
                    fontWeight: 800,
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {typeof spotsHeadingBadgeCount === 'number' &&
                  Number.isFinite(spotsHeadingBadgeCount)
                    ? t('pages.dashboard.map.sheet_spots_in_view_count', {
                        count: spotsHeadingBadgeCount,
                      })
                    : t(spotsHeadingKey)}
                </Typography>
                {onSortModeChange ? (
                  <MapSheetSortMenu sortMode={sortMode} onSortModeChange={onSortModeChange} />
                ) : null}
              </Stack>
              <List
                dense
                disablePadding
                aria-label={t('pages.dashboard.map.sheet_list_aria')}
                sx={{ pb: 1 }}
              >
                {placesToRender.map((row) => {
                  const mapsUrl = mapPlaceMapsUrl(row);
                  const phoneCall = mapPlaceTelHref(row);
                  const rowListIds = savedListIdsByRestaurant[String(row.id)] ?? [];
                  const isSaved = Array.isArray(rowListIds) && rowListIds.length > 0;
                  const ratingVal = mapPlaceNumericRating(row);
                  const chipLabels = mapPlaceTagLabelsCapped(row, t, tagCatalog, {
                    tagCatalogLoaded,
                  });
                  const listRingItems = [...rowListIds]
                    .map((lid) => {
                      const id = String(lid);
                      const hit = listMetaById[id];
                      return hit ?? { id, name: '', cover_image_url: null };
                    })
                    .sort((a, b) =>
                      String(a.name).localeCompare(String(b.name), undefined, {
                        sensitivity: 'base',
                      })
                    );
                  const followingOwners = followingOwnersByRestaurant[String(row.id)] ?? [];
                  return (
                    <MapSpotSheetListRow
                      key={row.id}
                      itemRef={getItemRef(row.id)}
                      isHighlighted={highlightedId != null && spotIdEq(row.id, highlightedId)}
                      row={row}
                      mapsUrl={mapsUrl}
                      phoneCall={phoneCall}
                      rowListIds={rowListIds}
                      isSaved={isSaved}
                      ratingVal={ratingVal}
                      chipLabels={chipLabels}
                      tagsLoading={!tagCatalogLoaded}
                      listRingItems={listRingItems}
                      followingOwners={followingOwners}
                      followingOwnersLoading={followingOwnersLoading}
                      userId={userId}
                      viewerAvatarUrl={viewerAvatarUrl}
                      viewerDisplayName={viewerDisplayName}
                      onSelectSpot={onSelectSpot}
                      onListSave={
                        onGuestSaveClick ? () => onGuestSaveClick(row.id) : setListSaveForId
                      }
                      onShareRow={handleShareRow}
                      listRowActionBtnSx={listRowActionBtnSx}
                      restaurantAnalytics={restaurantAnalytics}
                      t={t}
                    />
                  );
                })}
                {renderLimit >= places.length && hasMoreSpots && onLoadMoreSpots ? (
                  <ListItemButton
                    onClick={loadingMoreSpots ? undefined : onLoadMoreSpots}
                    disabled={loadingMoreSpots}
                    aria-label={t('pages.dashboard.map.sheet_load_more')}
                    sx={{
                      justifyContent: 'center',
                      gap: 1,
                      mx: 1.5,
                      mt: 0.5,
                      mb: 1,
                      borderRadius: RADIUS.pill,
                      border: (tt) => `1px solid ${alpha(tt.palette.text.primary, 0.12)}`,
                      ...hoverable({ bgcolor: (tt) => alpha(tt.palette.text.primary, 0.04) }),
                    }}
                  >
                    {loadingMoreSpots ? (
                      <CircularProgress size={16} thickness={5} color="inherit" />
                    ) : null}
                    <Typography variant="button" sx={{ fontWeight: 700 }}>
                      {t('pages.dashboard.map.sheet_load_more')}
                    </Typography>
                  </ListItemButton>
                ) : null}
              </List>
            </>
          )}
        </>
      )}
      {listSaveForId ? (
        <SaveToListSheet
          open
          onClose={() => setListSaveForId(null)}
          restaurantId={listSaveForId}
          onApplied={handleListSaveApplied}
          reviews={[]}
          myUserId={userId}
          initialLists={preloadedMyLists}
          initialListsReady={preloadedMyListsReady}
        />
      ) : null}
    </>
  );
}

MapSpotSheetInner.propTypes = {
  placesLoading: PropTypes.bool,
  places: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string,
    })
  ).isRequired,
  sortMode: PropTypes.oneOf(['relevance', 'distance', 'recent']),
  onSortModeChange: PropTypes.func,
  selected: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
  sheetRestaurant: PropTypes.object,
  sheetReviews: PropTypes.array,
  sheetListMentions: PropTypes.array,
  sheetFeedLoading: PropTypes.bool,
  sheetFollowCircle: PropTypes.shape({
    members: PropTypes.array,
    total: PropTypes.number,
  }),
  sheetFollowCircleLoading: PropTypes.bool,
  selectedSavedListIds: PropTypes.array,
  selectedSavedListIdsLoading: PropTypes.bool,
  savedListIdsByRestaurant: PropTypes.object,
  listMetaById: PropTypes.object,
  followingOwnersByRestaurant: PropTypes.object,
  followingOwnersLoading: PropTypes.bool,
  userId: PropTypes.string,
  viewerAvatarUrl: PropTypes.string,
  viewerDisplayName: PropTypes.string,
  tagCatalog: PropTypes.object,
  tagCatalogLoaded: PropTypes.bool,
  highlightedId: PropTypes.string,
  onSelectSpot: PropTypes.func.isRequired,
  onCloseDetail: PropTypes.func,
  onSaveApplied: PropTypes.func,
  onGuestSaveClick: PropTypes.func,
  refetchSheetReviews: PropTypes.func,
  sheetEmptyCopy: PropTypes.node,
  isMobileSheet: PropTypes.bool,
  spotsHeadingKey: PropTypes.string,
  spotsHeadingBadgeCount: PropTypes.number,
  preloadedMyLists: PropTypes.array,
  preloadedMyListsReady: PropTypes.bool,
  listResetKey: PropTypes.string,
  hasMoreSpots: PropTypes.bool,
  loadingMoreSpots: PropTypes.bool,
  onLoadMoreSpots: PropTypes.func,
};

export default memo(MapSpotSheetInner);
