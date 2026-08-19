'use client';

import PropTypes from 'prop-types';
import dynamic from 'next/dynamic';
import { useRef, useMemo, useState, useEffect, useCallback, useLayoutEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { touchTargetSx } from 'src/theme/spacing';
import { mobileStretchButtonSx } from 'src/theme/responsive-button-sx';

import Iconify from 'src/components/iconify';
import RemoteCoverImage from 'src/components/image/remote-cover-image';
import PhotoCarouselPillDots from 'src/components/photo-carousel-pill-dots/photo-carousel-pill-dots';

import { previewTruncatedBody } from './review-body-preview';
import {
  formatReviewDate,
  restaurantReviewAuthorLabel,
  REVIEW_BODY_PREVIEW_MAX_CHARS,
  reviewAuthorDisplayNameForLabel,
} from './review-author-labels';

export {
  formatReviewDate,
  restaurantReviewAuthorLabel,
  REVIEW_BODY_PREVIEW_MAX_CHARS,
  reviewAuthorDisplayNameForLabel,
};

const Lightbox = dynamic(() => import('src/components/lightbox/lightbox'), { ssr: false });

// ----------------------------------------------------------------------

const REVIEW_MEDIA_BUCKET = 'restaurant_review_media';

/** Max lines while collapsed (pairs with char preview; caps very dense / narrow layouts). */
const REVIEW_BODY_PREVIEW_MAX_LINES = 5;

/**
 * Long review (or quoted mention) text: collapsed preview with Show more / Show less.
 * @param {boolean} [quoted] — wrap in curly quotes and italic (creator mentions).
 */
export function ReviewExpandableBody({
  text = '',
  maxChars = REVIEW_BODY_PREVIEW_MAX_CHARS,
  maxLinesCollapsed = REVIEW_BODY_PREVIEW_MAX_LINES,
  sx,
  quoted = false,
}) {
  const { t } = useTranslate();
  const [expanded, setExpanded] = useState(false);
  const bodyRef = useRef(null);
  const [lineClampOverflow, setLineClampOverflow] = useState(false);
  const full = typeof text === 'string' ? text : '';
  const overCharLimit = full.length > maxChars;
  const preview = overCharLimit
    ? previewTruncatedBody(full, maxChars)
    : { text: full, truncated: false };
  const inner = expanded || !preview.truncated ? full : preview.text;
  const displayed = quoted && inner.length > 0 ? `\u201c${inner}\u201d` : inner;
  /** While collapsed, clamp so we can detect wrapped overflow under `maxChars` (common on narrow screens). */
  const collapsedClamp = !expanded && maxLinesCollapsed > 0;

  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el || expanded) {
      setLineClampOverflow(false);
      return undefined;
    }
    const measure = () => {
      setLineClampOverflow(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [displayed, expanded, maxLinesCollapsed, full]);

  const showToggle = overCharLimit || lineClampOverflow || expanded;

  return (
    <Box>
      <Typography
        ref={bodyRef}
        variant="body2"
        sx={{
          lineHeight: 1.6,
          fontSize: { xs: '0.8125rem', sm: '0.875rem' },
          // `pre-wrap` fights `-webkit-line-clamp` in some engines; `pre-line` keeps line breaks when collapsed.
          whiteSpace: collapsedClamp ? 'pre-line' : 'pre-wrap',
          wordBreak: 'break-word',
          ...(quoted ? { fontStyle: 'italic' } : {}),
          ...(collapsedClamp
            ? {
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                WebkitLineClamp: maxLinesCollapsed,
                overflow: 'hidden',
              }
            : {}),
          ...sx,
        }}
      >
        {displayed}
      </Typography>
      {showToggle ? (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: 1, mt: 0.25 }}>
          <Button
            type="button"
            variant="text"
            size="small"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            sx={[touchTargetSx, {
              mr: -0.75,
              px: 0.75,
              py: 0.25,
              minWidth: 0,
              textTransform: 'none',
              fontWeight: 700,
              fontSize: { xs: '0.75rem', sm: '0.8125rem' },
            }]}
          >
            {expanded
              ? t('pages.dashboard.restaurant.reviews_show_less')
              : t('pages.dashboard.restaurant.reviews_show_more')}
          </Button>
        </Box>
      ) : null}
    </Box>
  );
}

ReviewExpandableBody.propTypes = {
  text: PropTypes.string,
  maxChars: PropTypes.number,
  maxLinesCollapsed: PropTypes.number,
  sx: PropTypes.object,
  quoted: PropTypes.bool,
};

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {Array<{ kind?: string, path?: string }>} media
 * @param {'inline' | 'hero'} [variant] — `hero`: top-of-card grid, no outer margin; `inline`: below copy, stacked / grid.
 */
export function RestaurantReviewMediaGallery({ supabase, media, variant = 'inline', sx }) {
  const { t } = useTranslate();
  const [lightbox, setLightbox] = useState({ open: false, index: 0 });
  const [carouselIndex, setCarouselIndex] = useState(0);

  const resolved = useMemo(() => {
    if (!supabase || !Array.isArray(media) || media.length === 0) return [];
    return media
      .map((m, idx) => {
        const path = typeof m?.path === 'string' ? m.path : '';
        if (!path) return null;
        const isVideo = m?.kind === 'video';
        const {
          data: { publicUrl },
        } = supabase.storage.from(REVIEW_MEDIA_BUCKET).getPublicUrl(path);
        if (!publicUrl) return null;
        return { publicUrl, isVideo, idx, path };
      })
      .filter(Boolean);
  }, [supabase, media]);

  const lightboxSlides = useMemo(
    () =>
      resolved.map((r) =>
        r.isVideo
          ? {
              type: 'video',
              sources: [{ src: r.publicUrl }],
            }
          : { src: r.publicUrl }
      ),
    [resolved]
  );

  const openLightboxAt = useCallback((index) => {
    setLightbox({ open: true, index });
  }, []);

  const closeLightbox = useCallback(() => {
    setLightbox((s) => ({ ...s, open: false }));
  }, []);

  useEffect(() => {
    setCarouselIndex(0);
  }, [media]);

  const handleReviewCarouselScroll = useCallback(
    (e) => {
      const el = e.currentTarget;
      const w = el.clientWidth;
      if (w <= 0) return;
      const i = Math.round(el.scrollLeft / w);
      setCarouselIndex(Math.min(Math.max(0, i), resolved.length - 1));
    },
    [resolved.length]
  );

  if (resolved.length === 0) return null;

  const imageOnlyCount = resolved.filter((r) => !r.isVideo).length;
  const isHero = variant === 'hero';
  const useTwoColGrid = imageOnlyCount >= 2;
  const inlinePureImages = imageOnlyCount >= 2 && resolved.every((r) => !r.isVideo);
  const twoColThumbs = (isHero && useTwoColGrid) || inlinePureImages;
  const thumbSizes = twoColThumbs
    ? '(max-width: 768px) 50vw, 400px'
    : '(max-width: 768px) 100vw, 720px';

  const renderImageTile = (r, slideIndex, tileSx) => (
    <Box
      key={`${r.path}-${slideIndex}`}
      component="button"
      type="button"
      onClick={() => openLightboxAt(slideIndex)}
      aria-label={t('pages.dashboard.restaurant.review_media_open_lightbox')}
      sx={{
        display: 'block',
        position: 'relative',
        width: 1,
        p: 0,
        m: 0,
        border: 'none',
        cursor: 'pointer',
        borderRadius: '12px',
        overflow: 'hidden',
        bgcolor: (tt) => tt.palette.grey[900],
        '&:focus-visible': {
          outline: (tt) => `2px solid ${tt.palette.primary.main}`,
          outlineOffset: 2,
        },
        ...tileSx,
      }}
    >
      <RemoteCoverImage
        src={r.publicUrl}
        alt={t('pages.dashboard.restaurant.review_photo_alt', { n: slideIndex + 1 })}
        fill
        sizes={thumbSizes}
      />
    </Box>
  );

  const renderVideoTile = (r, slideIndex, videoSx) => (
    <Box
      key={`${r.path}-${slideIndex}-video`}
      sx={{
        position: 'relative',
        width: 1,
        borderRadius: '12px',
        overflow: 'hidden',
        bgcolor: 'common.black',
        gridColumn: '1 / -1',
        ...videoSx,
      }}
    >
      <Box
        component="video"
        src={r.publicUrl}
        controls
        playsInline
        preload="metadata"
        sx={{
          width: 1,
          display: 'block',
          maxHeight: isHero ? { xs: 200, sm: 240 } : { xs: 180, sm: 220 },
        }}
      />
      <IconButton
        type="button"
        size="small"
        onClick={() => openLightboxAt(slideIndex)}
        aria-label={t('pages.dashboard.restaurant.review_video_open_lightbox')}
        sx={{
          position: 'absolute',
          top: 6,
          right: 6,
          color: 'common.white',
          bgcolor: (tt) => alpha(tt.palette.common.black, 0.5),
          '&:hover': { bgcolor: (tt) => alpha(tt.palette.common.black, 0.65) },
        }}
      >
        <Iconify icon={ic.carbonZoomIn} width={20} />
      </IconButton>
    </Box>
  );

  const lightboxNode =
    lightboxSlides.length > 0 ? (
      <Lightbox
        open={lightbox.open}
        close={closeLightbox}
        index={lightbox.index}
        slides={lightboxSlides}
        carousel={{ imageFit: 'contain' }}
        disabledThumbnails={lightboxSlides.length < 2}
        disabledSlideshow={lightboxSlides.length < 2}
      />
    ) : null;

  if (resolved.length > 1) {
    return (
      <>
        <Box
          sx={{
            position: 'relative',
            width: 1,
            mt: isHero ? 0 : 1.5,
            ...sx,
          }}
        >
          <Box
            onScroll={handleReviewCarouselScroll}
            sx={{
              display: 'flex',
              overflowX: 'auto',
              overflowY: 'hidden',
              scrollSnapType: 'x mandatory',
              scrollBehavior: 'smooth',
              overscrollBehaviorX: 'contain',
              WebkitOverflowScrolling: 'touch',
              scrollbarWidth: 'none',
              borderRadius: '12px',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            {resolved.map((r, slideIndex) => (
              <Box
                key={`${r.path}-carousel-${slideIndex}`}
                sx={{
                  minWidth: '100%',
                  flexShrink: 0,
                  scrollSnapAlign: 'start',
                  scrollSnapStop: 'always',
                }}
              >
                {r.isVideo
                  ? renderVideoTile(r, slideIndex, { gridColumn: 'auto' })
                  : renderImageTile(r, slideIndex, {
                      aspectRatio: '16 / 10',
                      maxHeight: isHero ? { xs: 168, sm: 200 } : { xs: 200, sm: 220 },
                      minHeight: { xs: 96, sm: 104 },
                    })}
              </Box>
            ))}
          </Box>
          <PhotoCarouselPillDots
            total={resolved.length}
            activeIndex={carouselIndex}
            variant="hero"
          />
        </Box>
        {lightboxNode}
      </>
    );
  }

  if (!isHero) {
    return (
      <>
        <Box
          sx={{
            display: 'grid',
            gap: 1,
            mt: 1.5,
            gridTemplateColumns: inlinePureImages
              ? { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(2, minmax(0, 1fr))' }
              : '1fr',
            width: 1,
            ...sx,
          }}
        >
          {resolved.map((r, slideIndex) => {
            if (r.isVideo) {
              return renderVideoTile(r, slideIndex, {});
            }
            const singleImg = imageOnlyCount === 1;
            return renderImageTile(r, slideIndex, {
              aspectRatio: singleImg ? '16 / 10' : '1',
              maxHeight: singleImg ? { xs: 200, sm: 220 } : { xs: 160, sm: 180 },
              minHeight: singleImg ? { xs: 96, sm: 104 } : { xs: 88, sm: 100 },
            });
          })}
        </Box>
        {lightboxNode}
      </>
    );
  }

  return (
    <>
      <Box
        sx={{
          display: 'grid',
          gap: { xs: 0.5, sm: 0.75 },
          gridTemplateColumns: {
            xs: '1fr',
            sm: useTwoColGrid ? 'repeat(2, minmax(0, 1fr))' : '1fr',
          },
          width: 1,
          ...sx,
        }}
      >
        {resolved.map((r, slideIndex) => {
          if (r.isVideo) {
            return renderVideoTile(r, slideIndex, {});
          }
          const singleImage = imageOnlyCount === 1;
          return renderImageTile(r, slideIndex, {
            aspectRatio: singleImage ? '16 / 10' : '1',
            maxHeight: singleImage ? { xs: 168, sm: 200 } : { xs: 112, sm: 140 },
            minHeight: singleImage ? undefined : { xs: 88, sm: 100 },
          });
        })}
      </Box>
      {lightboxNode}
    </>
  );
}

RestaurantReviewMediaGallery.propTypes = {
  supabase: PropTypes.object,
  variant: PropTypes.oneOf(['inline', 'hero']),
  sx: PropTypes.object,
  media: PropTypes.arrayOf(
    PropTypes.shape({
      kind: PropTypes.string,
      path: PropTypes.string,
    })
  ),
};

// ----------------------------------------------------------------------

/** Prompt to write a first review (opens save sheet). Edit/delete live on the card and inside the sheet. */
export function RestaurantReviewMentionToolbar({
  restaurantId: _restaurantId,
  reviews = [],
  myUserId = null,
  onReviewSaved: _onReviewSaved,
  onRequestWriteReview,
}) {
  const { t } = useTranslate();

  const myReview = useMemo(() => {
    if (!myUserId) return null;
    const uid = String(myUserId);
    return reviews.find((r) => String(r.user_id) === uid) ?? null;
  }, [reviews, myUserId]);

  if (typeof onRequestWriteReview !== 'function' || myReview) {
    return null;
  }

  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="flex-end"
      flexWrap="wrap"
      sx={{ mb: 2, rowGap: 1, columnGap: 1, width: 1 }}
    >
      <Button
        variant="outlined"
        color="primary"
        size="small"
        onClick={onRequestWriteReview}
        startIcon={<Iconify icon={ic.addCircleBold} width={18} />}
        sx={[touchTargetSx, {
          ...mobileStretchButtonSx,
          flexShrink: 0,
          fontWeight: 700,
          borderRadius: '12px',
          textTransform: 'none',
        }]}
      >
        {t('pages.dashboard.restaurant.reviews_add_via_save')}
      </Button>
    </Stack>
  );
}

RestaurantReviewMentionToolbar.propTypes = {
  restaurantId: PropTypes.string.isRequired,
  myUserId: PropTypes.string,
  onReviewSaved: PropTypes.func,
  onRequestWriteReview: PropTypes.func,
  reviews: PropTypes.arrayOf(
    PropTypes.shape({
      user_id: PropTypes.string.isRequired,
    })
  ),
};
