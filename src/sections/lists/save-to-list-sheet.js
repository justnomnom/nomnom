'use client';

import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Drawer from '@mui/material/Drawer';
import Rating from '@mui/material/Rating';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import CircularProgress from '@mui/material/CircularProgress';

import { useRouter } from 'src/routes/hooks';

import { usePrefersReducedMotion } from 'src/hooks/use-prefers-reduced-motion';

import uuidv4 from 'src/utils/uuidv4';
import { translateListCollaborationError } from 'src/utils/list-collaboration-errors';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { useAuthContext } from 'src/auth/hooks';
import { normalizeAppLocale } from 'src/libs/locale-utils';
import { isCapacitorNative } from 'src/libs/capacitor/platform';
import { touchTargetSx, TOUCH_TARGET_SIZE } from 'src/theme/spacing';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';
import { useRestaurantAnalytics } from 'src/libs/analytics/restaurant-analytics';
import {
  fetchMyLists,
  restaurantInMyLists,
  addRestaurantToLists,
  removeRestaurantFromList,
} from 'src/libs/lists/actions';
import {
  fetchRestaurantReviews,
  upsertRestaurantReview,
  deleteRestaurantReview,
} from 'src/auth/actions/restaurant-review-actions';
import {
  fetchRestaurantDishSuggestions,
  fetchMyMustTryDraftForRestaurant,
  upsertMustTryDishesForRestaurantLists,
} from 'src/auth/actions/must-try-actions';

import Iconify from 'src/components/iconify';
import DeleteDialog from 'src/components/custom-dialog/delete-dialog';
import RemoteCoverImage from 'src/components/image/remote-cover-image';
import {
  SheetHeaderRow,
  SheetGrabBarRail,
  sheetDragHandleProps,
  SheetCloseIconButton,
  sheetStackedContainedGlowSx,
  sheetStackedCancelOutlinedSx,
  mobileBottomSheetDrawerPaperSx,
  SwipeDismissBottomSheetContent,
  sheetStackedDestructiveOutlinedSx,
} from 'src/components/sheet-shell';

import CreateListModal from './create-list-modal';
import {
  NomNomListPickerTile,
  NomNomListCreateTile,
  NOM_NOM_LIST_COMPACT_THUMB_PX,
} from './nom-nom-list-tile';

const LIST_SKELETON_ROWS = 5;
const listNameSkeletonWidths = ['72%', '58%', '85%', '64%', '78%'];
const LIST_THUMB_SKELETON_H = NOM_NOM_LIST_COMPACT_THUMB_PX + 6;
/** Skeleton widths while must-try data loads (subtle bars, not pill-shaped). */
const MUST_TRY_CHIP_LOADING_WIDTHS = [68, 92, 76, 84];
/** Matches must-try dish chips on `restaurant-detail-view` (Mentioned by). */
const MUST_TRY_DISH_CHIP_SX = { fontWeight: 600 };

const REVIEW_MEDIA_BUCKET = 'restaurant_review_media';
const MAX_REVIEW_MEDIA = 6;
const MAX_MUST_TRY_DISHES = 10;
const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

const I18N_ERROR_KEYS = {
  unauthorized: 'pages.dashboard.restaurant.reviews_error_unauthorized',
  invalid_rating: 'pages.dashboard.restaurant.reviews_error_invalid_rating',
  body_required: 'pages.dashboard.restaurant.reviews_error_body_required',
  body_too_long: 'pages.dashboard.restaurant.reviews_error_body_too_long',
  invalid_restaurant: 'pages.dashboard.restaurant.reviews_error_invalid_restaurant',
  invalid_media: 'pages.dashboard.restaurant.reviews_error_invalid_media',
  media_too_many: 'pages.dashboard.restaurant.reviews_error_media_too_many',
  nothing_to_delete: 'pages.dashboard.restaurant.reviews_error_nothing_to_delete',
};

function errorMessage(t, result) {
  if (!result?.error) return '';
  const path = I18N_ERROR_KEYS[result.errorKey];
  if (path) return t(path);
  return result.error;
}

/** Stable id for Dialog/Drawer aria-labelledby (matches create-list modal pattern). */
const SAVE_TO_LIST_SHEET_TITLE_ID = 'save-to-list-sheet-title';

/** @param {File} file */
function fileKindFromFile(file) {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type === 'video/mp4' || file.type === 'video/webm') return 'video';
  return null;
}

/** @param {File} file @param {'image'|'video'} kind */
function extForUpload(file, kind) {
  const fromName = (file.name.split('.').pop() || '').toLowerCase();
  if (kind === 'image') {
    const map = { jpg: 'jpg', jpeg: 'jpg', png: 'png', gif: 'gif', webp: 'webp' };
    if (map[fromName]) return map[fromName];
    if (file.type === 'image/jpeg') return 'jpg';
    if (file.type === 'image/png') return 'png';
    if (file.type === 'image/gif') return 'gif';
    if (file.type === 'image/webp') return 'webp';
    return 'jpg';
  }
  if (fromName === 'webm') return 'webm';
  if (fromName === 'mp4') return 'mp4';
  if (file.type === 'video/webm') return 'webm';
  return 'mp4';
}

function ReviewMediaDraftThumb({ item, src }) {
  if (!src) return null;
  if (item.kind === 'video') {
    return (
      <Box
        component="video"
        src={src}
        muted
        playsInline
        sx={{ width: 1, height: 1, objectFit: 'cover' }}
      />
    );
  }
  if (src.startsWith('blob:') || src.startsWith('data:')) {
    return (
      <Box
        component="img"
        src={src}
        alt=""
        sx={{ width: 1, height: 1, objectFit: 'cover', display: 'block' }}
      />
    );
  }
  return <RemoteCoverImage src={src} alt="" fill sizes="88px" />;
}

ReviewMediaDraftThumb.propTypes = {
  item: PropTypes.shape({
    kind: PropTypes.string,
  }).isRequired,
  src: PropTypes.string,
};

function mediaPayloadSignature(mediaDraft) {
  return mediaDraft
    .filter((x) => x.path)
    .map((x) => `${x.kind}:${x.path}`)
    .sort()
    .join('|');
}

/** Public URL for a stored review media path (bucket `restaurant_review_media`). */
function previewUrlForReviewMediaPath(supabaseClient, path) {
  if (!path || typeof path !== 'string') return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (!supabaseClient) return '';
  const {
    data: { publicUrl },
  } = supabaseClient.storage.from(REVIEW_MEDIA_BUCKET).getPublicUrl(path);
  return publicUrl || '';
}

function reviewFormNeedsUpsert({ toUpsertLen, myReview, rating, body, mediaSig }) {
  if (toUpsertLen === 0) return false;
  const trimmed = typeof body === 'string' ? body.trim() : '';
  if (!myReview) {
    return trimmed.length > 0 || rating != null;
  }
  const prevSig = Array.isArray(myReview.media)
    ? myReview.media
        .filter((x) => x && typeof x.path === 'string')
        .map((x) => `${x.kind === 'video' ? 'video' : 'image'}:${x.path}`)
        .sort()
        .join('|')
    : '';
  const ratingChanged = Number(myReview.rating) !== Number(rating);
  const bodyChanged = (myReview.body ?? '').trim() !== trimmed;
  const mediaChanged = prevSig !== mediaSig;
  return ratingChanged || bodyChanged || mediaChanged;
}

export default function SaveToListSheet({
  open,
  onClose,
  restaurantId,
  onApplied,
  reviews,
  myUserId = null,
  defaultSelectedListId = null,
  initialLists = null,
  /** When false, treat preload as incomplete (show loading until map prefetch finishes). */
  initialListsReady = true,
}) {
  const { t } = useTranslate();
  const { i18n } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const restaurantAnalytics = useRestaurantAnalytics();
  const { supabase, user } = useAuthContext();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const prefersReducedMotion = usePrefersReducedMotion();
  /** Two-column compact list cards on phones / small tablets; single column on larger screens. */
  const listSkeletonTheme = useSkeletonThemeColors();

  const [lists, setLists] = useState(() =>
    Array.isArray(initialLists) && initialLists.length > 0 ? initialLists : []
  );
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  /** ID of the list just created via the inline modal — fires a brief pop animation, then clears. */
  const [justCreatedListId, setJustCreatedListId] = useState(/** @type {string | null} */ (null));
  const [deleteReviewOpen, setDeleteReviewOpen] = useState(false);
  const [deletingReview, setDeletingReview] = useState(false);
  const [localReviewCleared, setLocalReviewCleared] = useState(false);
  const [err, setErr] = useState(null);
  const errText = useMemo(() => translateListCollaborationError(t, err), [err, t]);
  const [rating, setRating] = useState(null);
  const [body, setBody] = useState('');
  /** @type {[{ key: string, kind: 'image'|'video', path?: string, previewUrl?: string, uploading?: boolean }]} */
  const [reviewMediaDraft, setReviewMediaDraft] = useState([]);
  /** @type {[{ key: string, suggestionId: string | null, label: string }]} */
  const [mustTryPicks, setMustTryPicks] = useState([]);
  const [mustTrySuggestions, setMustTrySuggestions] = useState([]);
  const [mustTryLoading, setMustTryLoading] = useState(false);
  const [customDishInput, setCustomDishInput] = useState('');
  const baselineIdsRef = useRef(new Set());
  const mergedDefaultListRef = useRef(false);
  const fileInputRef = useRef(null);
  const mediaDraftRef = useRef([]);
  const loadedRestaurantIdRef = useRef(null);
  /** Preserves user's unsaved toggled selection across close/reopen for the same restaurant. */
  const pendingSelectionRef = useRef(null); // { restaurantId, selected: Set }

  const effectiveUserId = myUserId ?? user?.id ?? null;

  const [fetchedReviews, setFetchedReviews] = useState([]);

  useEffect(() => {
    if (!open || !restaurantId) return;
    restaurantAnalytics.trackSaveIntent({ restaurant_id: String(restaurantId) });
  }, [open, restaurantId, restaurantAnalytics]);

  useEffect(() => {
    if (!open) {
      setFetchedReviews([]);
      setLocalReviewCleared(false);
      return () => {};
    }
    if (reviews !== undefined) return () => {};
    if (!restaurantId) return () => {};
    let cancelled = false;
    fetchRestaurantReviews(restaurantId).then(({ reviews: rv, error }) => {
      if (cancelled || error) return;
      setFetchedReviews(rv ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [open, restaurantId, reviews]);

  useEffect(() => {
    if (!open) {
      setCustomDishInput('');
      setMustTryLoading(false);
      return () => {};
    }
    if (!restaurantId) {
      return () => {};
    }
    let cancelled = false;
    setMustTryLoading(true);
    setMustTrySuggestions([]);
    setMustTryPicks([]);
    (async () => {
      try {
        const [sugRes, draftRes] = await Promise.all([
          fetchRestaurantDishSuggestions(restaurantId),
          fetchMyMustTryDraftForRestaurant(restaurantId),
        ]);
        if (cancelled) return;
        setMustTrySuggestions(sugRes.suggestions ?? []);
        const picks = (draftRes.picks ?? []).map((p, i) => ({
          key: p.suggestionId ? `s-${p.suggestionId}` : `c-${i}-${p.label}`,
          suggestionId: p.suggestionId,
          label: p.label,
        }));
        setMustTryPicks(picks);
      } finally {
        if (!cancelled) setMustTryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, restaurantId]);

  const effectiveReviews = reviews !== undefined ? reviews : fetchedReviews;

  const myReview = useMemo(() => {
    if (localReviewCleared) return null;
    if (!effectiveUserId) return null;
    const uid = String(effectiveUserId);
    return effectiveReviews.find((r) => String(r.user_id) === uid) ?? null;
  }, [effectiveReviews, effectiveUserId, localReviewCleared]);

  useEffect(() => {
    mediaDraftRef.current = reviewMediaDraft;
  }, [reviewMediaDraft]);

  const syncReviewFormFromProps = useCallback(() => {
    setRating(myReview ? Number(myReview.rating) : null);
    setBody(myReview?.body ?? '');
    const m = myReview?.media;
    setReviewMediaDraft(
      Array.isArray(m)
        ? m
            .filter((x) => x && typeof x.path === 'string')
            .map((x, i) => {
              const { path } = x;
              return {
                key: typeof path === 'string' ? path : `m-${i}`,
                kind: x.kind === 'video' ? 'video' : 'image',
                path,
                previewUrl: previewUrlForReviewMediaPath(supabase, path),
              };
            })
        : []
    );
  }, [myReview, supabase]);

  useEffect(() => {
    if (!open || !restaurantId) return;
    syncReviewFormFromProps();
  }, [open, restaurantId, myReview, syncReviewFormFromProps]);

  useEffect(() => {
    if (open) {
      mergedDefaultListRef.current = false;
    }
  }, [open]);

  const hasPreloadedLists =
    initialListsReady && Array.isArray(initialLists) && initialLists.length > 0;

  /** Sync list grid when parent prefetch completes after the sheet has mounted. */
  useEffect(() => {
    if (!initialListsReady || !Array.isArray(initialLists) || initialLists.length === 0) return;
    setLists((prev) => {
      const byId = new Map(prev.map((l) => [String(l.id), l]));
      initialLists.forEach((l) => {
        byId.set(String(l.id), l);
      });
      const seen = new Set();
      const mergedFromInitial = initialLists.reduce((acc, l) => {
        const id = String(l.id);
        if (seen.has(id)) return acc;
        seen.add(id);
        acc.push(byId.get(id) ?? l);
        return acc;
      }, []);
      const mergedFromPrev = prev.reduce((acc, l) => {
        const id = String(l.id);
        if (seen.has(id)) return acc;
        seen.add(id);
        acc.push(l);
        return acc;
      }, []);
      return [...mergedFromInitial, ...mergedFromPrev];
    });
  }, [initialLists, initialListsReady]);

  const load = useCallback(async () => {
    if (!restaurantId) return;
    if (!hasPreloadedLists) setLoading(true);
    setErr(null);
    const [{ lists: mine, error: e1 }, { listIds: inIds, error: e2 }] = await Promise.all([
      fetchMyLists(),
      restaurantInMyLists(restaurantId),
    ]);
    setLoading(false);
    if (e1) setErr(e1);
    else if (e2) setErr(e2);
    setLists(mine ?? []);
    const initial = new Set(inIds ?? []);
    const pending = pendingSelectionRef.current;
    setSelected(pending?.restaurantId === restaurantId ? pending.selected : initial);
    baselineIdsRef.current = new Set(initial);
  }, [restaurantId, hasPreloadedLists]);

  useEffect(() => {
    if (!open || !restaurantId) return;
    if (loadedRestaurantIdRef.current === restaurantId) return;
    loadedRestaurantIdRef.current = restaurantId;
    load();
  }, [open, restaurantId, load]);

  useEffect(() => {
    if (!open || loading || !defaultSelectedListId || mergedDefaultListRef.current) return;
    const exists = lists.some((l) => l.id === defaultSelectedListId);
    if (exists) {
      setSelected((prev) => new Set([...prev, defaultSelectedListId]));
      mergedDefaultListRef.current = true;
    }
  }, [open, loading, defaultSelectedListId, lists]);

  const toggle = useCallback(
    (id) => {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        pendingSelectionRef.current = { restaurantId, selected: next };
        return next;
      });
    },
    [restaurantId]
  );

  const handleListCreated = useCallback(({ id, name: listName, visibility: vis }) => {
    setLists((prev) => [
      {
        id,
        name: listName,
        item_count: 0,
        visibility: vis ?? 'private',
        cover_image_url: null,
      },
      ...prev,
    ]);
    setSelected((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setJustCreatedListId(id);
  }, []);

  useEffect(() => {
    if (!justCreatedListId) return undefined;
    const timer = setTimeout(() => setJustCreatedListId(null), 700);
    return () => clearTimeout(timer);
  }, [justCreatedListId]);

  const revokeBlobPreviews = useCallback((items) => {
    items.forEach((item) => {
      if (item.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
  }, []);

  const removeDraftItem = useCallback((key) => {
    setReviewMediaDraft((prev) => {
      const item = prev.find((x) => x.key === key);
      if (item?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((x) => x.key !== key);
    });
  }, []);

  const handlePickFiles = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFilesSelected = useCallback(
    async (fileList) => {
      if (!fileList?.length) return;
      if (!supabase || !effectiveUserId) {
        setErr(t('pages.dashboard.restaurant.reviews_error_unauthorized'));
        return;
      }
      setErr(null);
      const uid = String(effectiveUserId);
      const rid = String(restaurantId);
      const files = Array.from(fileList);
      const slots = MAX_REVIEW_MEDIA - mediaDraftRef.current.length;
      if (slots <= 0) {
        setErr(t('pages.dashboard.restaurant.reviews_media_max'));
        return;
      }
      if (files.length > slots) {
        setErr(t('pages.dashboard.restaurant.reviews_media_max'));
      }
      const toProcess = files.slice(0, slots);

      const uploadOne = async (file) => {
        const kind = fileKindFromFile(file);
        if (!kind) {
          setErr(t('pages.dashboard.restaurant.reviews_media_invalid_type'));
          return;
        }
        const max = kind === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
        if (file.size > max) {
          setErr(
            kind === 'image'
              ? t('pages.dashboard.restaurant.reviews_media_too_large_image')
              : t('pages.dashboard.restaurant.reviews_media_too_large_video')
          );
          return;
        }

        const localKey = globalThis.crypto?.randomUUID?.() ?? uuidv4();
        const blobPreview = URL.createObjectURL(file);
        setReviewMediaDraft((prev) => [
          ...prev,
          { key: localKey, kind, previewUrl: blobPreview, uploading: true },
        ]);

        const ext = extForUpload(file, kind);
        const path = `${uid}/${rid}/${globalThis.crypto?.randomUUID?.() ?? uuidv4()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(REVIEW_MEDIA_BUCKET)
          .upload(path, file, {
            contentType: file.type || undefined,
            upsert: false,
          });

        if (upErr) {
          setReviewMediaDraft((prev) => {
            const victim = prev.find((x) => x.key === localKey);
            if (victim?.previewUrl?.startsWith('blob:')) {
              URL.revokeObjectURL(victim.previewUrl);
            }
            return prev.filter((x) => x.key !== localKey);
          });
          setErr(t('pages.dashboard.restaurant.reviews_media_upload_error'));
          return;
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from(REVIEW_MEDIA_BUCKET).getPublicUrl(path);

        setReviewMediaDraft((prev) =>
          prev.map((row) => {
            if (row.key !== localKey) return row;
            if (row.previewUrl?.startsWith('blob:')) {
              URL.revokeObjectURL(row.previewUrl);
            }
            return {
              key: localKey,
              kind,
              path,
              previewUrl: publicUrl,
              uploading: false,
            };
          })
        );
      };

      await toProcess.reduce((chain, file) => chain.then(() => uploadOne(file)), Promise.resolve());
    },
    [effectiveUserId, restaurantId, supabase, t]
  );

  const mediaUploading = reviewMediaDraft.some((x) => x.uploading);

  /** Matches `hadWork` in `handleSave` — disable Confirm when nothing would change. */
  const saveHasWork = useMemo(() => {
    const baseline = baselineIdsRef.current;
    const toRemove = [...baseline].filter((listId) => !selected.has(listId));
    const toUpsert = [...selected];
    const mediaSig = mediaPayloadSignature(reviewMediaDraft);
    const needsReviewUpsert = reviewFormNeedsUpsert({
      toUpsertLen: toUpsert.length,
      myReview,
      rating,
      body,
      mediaSig,
    });
    return toRemove.length > 0 || toUpsert.length > 0 || needsReviewUpsert;
  }, [selected, myReview, rating, body, reviewMediaDraft]);

  const addSuggestionMustTry = useCallback((s) => {
    // AI-derived suggestions carry a synthetic id (`ai:<label>`) and no real
    // tag_id. Persist them as label-only (suggestionId: null), the same shape
    // as a user-typed custom dish, so the upsert action treats them as free-text.
    const isAi = typeof s.id === 'string' && s.id.startsWith('ai:');
    setMustTryPicks((prev) => {
      if (prev.length >= MAX_MUST_TRY_DISHES) return prev;
      if (isAi) {
        const lower = String(s.label || '').toLowerCase();
        if (prev.some((p) => String(p.label || '').toLowerCase() === lower)) return prev;
        return [...prev, { key: `s-${s.id}`, suggestionId: null, label: s.label }];
      }
      if (prev.some((p) => p.suggestionId === s.id)) return prev;
      return [...prev, { key: `s-${s.id}`, suggestionId: s.id, label: s.label }];
    });
  }, []);

  const availableMustTrySuggestions = useMemo(() => {
    const pickedLabels = new Set(
      mustTryPicks.map((p) => String(p.label || '').toLowerCase()).filter(Boolean)
    );
    const pickedIds = new Set(mustTryPicks.map((p) => p.suggestionId).filter(Boolean));
    return mustTrySuggestions.filter((s) => {
      const isAi = typeof s.id === 'string' && s.id.startsWith('ai:');
      // AI suggestions have no tag_id stored on pick — dedupe by label.
      if (isAi) return !pickedLabels.has(String(s.label || '').toLowerCase());
      return !pickedIds.has(s.id);
    });
  }, [mustTrySuggestions, mustTryPicks]);

  const removeMustTryPick = useCallback((key) => {
    setMustTryPicks((prev) => prev.filter((p) => p.key !== key));
  }, []);

  const addCustomMustTry = useCallback(() => {
    const label = customDishInput.trim();
    if (!label) return;
    setMustTryPicks((prev) => {
      if (prev.length >= MAX_MUST_TRY_DISHES) return prev;
      if (prev.some((p) => p.label.toLowerCase() === label.toLowerCase())) return prev;
      return [...prev, { key: `c-${Date.now()}`, suggestionId: null, label }];
    });
    setCustomDishInput('');
  }, [customDishInput]);

  const handleConfirmDeleteReview = useCallback(async () => {
    if (!restaurantId) return;
    setDeletingReview(true);
    setErr(null);
    const res = await deleteRestaurantReview({ restaurantId });
    if (res.error) {
      setErr(errorMessage(t, res));
      setDeletingReview(false);
      return;
    }
    revokeBlobPreviews(mediaDraftRef.current);
    setLocalReviewCleared(true);
    setRating(null);
    setBody('');
    setReviewMediaDraft([]);
    setMustTryPicks([]);
    setDeleteReviewOpen(false);
    setDeletingReview(false);
    onApplied?.();
    router.refresh();
  }, [restaurantId, revokeBlobPreviews, onApplied, router, t]);

  const handleSave = useCallback(async () => {
    if (!restaurantId) {
      onClose?.();
      return;
    }
    const baseline = baselineIdsRef.current;
    const toRemove = [...baseline].filter((listId) => !selected.has(listId));
    const toUpsert = [...selected];
    const payloadMedia = reviewMediaDraft
      .filter((x) => x.path)
      .map((x) => ({ kind: x.kind, path: x.path }));
    const mediaSig = mediaPayloadSignature(reviewMediaDraft);

    const needsReviewUpsert = reviewFormNeedsUpsert({
      toUpsertLen: toUpsert.length,
      myReview,
      rating,
      body,
      mediaSig,
    });

    if (needsReviewUpsert) {
      if (rating == null || rating < 1 || rating > 5) {
        setErr(t('pages.dashboard.restaurant.reviews_rating_required'));
        return;
      }
      if (mediaUploading) {
        setErr(t('pages.dashboard.restaurant.reviews_media_still_uploading'));
        return;
      }
    }

    const hadWork = toRemove.length > 0 || toUpsert.length > 0 || needsReviewUpsert;

    setBusy(true);
    setErr(null);

    if (toRemove.length > 0) {
      const removeResults = await Promise.all(
        toRemove.map((listId) => removeRestaurantFromList(listId, restaurantId))
      );
      const removeErr = removeResults.find((r) => r.error)?.error;
      if (removeErr) {
        setErr(removeErr);
        setBusy(false);
        return;
      }
    }

    if (needsReviewUpsert) {
      const res = await upsertRestaurantReview({
        restaurantId,
        rating,
        body,
        media: payloadMedia,
      });
      if (res.error) {
        setErr(errorMessage(t, res));
        setBusy(false);
        return;
      }
    }

    if (toUpsert.length > 0) {
      const { error } = await addRestaurantToLists(restaurantId, toUpsert);
      if (error) {
        setErr(error);
        setBusy(false);
        return;
      }
    }

    if (mustTryPicks.length > 0 && toUpsert.length === 0) {
      setErr(t('pages.lists.must_try_requires_list'));
      setBusy(false);
      return;
    }

    if (toUpsert.length > 0) {
      const mtRes = await upsertMustTryDishesForRestaurantLists({
        restaurantId,
        listIds: toUpsert,
        picks: mustTryPicks.map((p) => ({
          suggestionId: p.suggestionId,
          label: p.label,
        })),
        labelLocale: normalizeAppLocale(i18n.language),
      });
      if (mtRes.error) {
        let msg = mtRes.error;
        if (mtRes.error === 'too_many') msg = t('pages.lists.must_try_error_too_many');
        else if (mtRes.error === 'invalid_dish_tag')
          msg = t('pages.lists.must_try_error_invalid_dish');
        else if (mtRes.error === 'invalid_label')
          msg = t('pages.lists.must_try_error_invalid_label');
        setErr(msg);
        setBusy(false);
        return;
      }
    }

    setBusy(false);
    revokeBlobPreviews(mediaDraftRef.current);
    if (hadWork) {
      if (toUpsert.length > 0) {
        restaurantAnalytics.trackSaved({
          restaurant_id: String(restaurantId),
          list_ids: toUpsert,
        });
      }
      if (toRemove.length > 0) {
        restaurantAnalytics.trackUnsaved({
          restaurant_id: String(restaurantId),
          list_ids: toRemove,
        });
      }
      // Haptic confirmation on native platforms
      if (isCapacitorNative()) {
        try {
          const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
          await Haptics.impact({ style: ImpactStyle.Light });
        } catch {
          // Haptics unavailable — continue silently
        }
      }
    }
    loadedRestaurantIdRef.current = null;
    pendingSelectionRef.current = null;
    const addedListIds = toUpsert.filter((id) => !baseline.has(id));
    onApplied?.({
      addedListIds,
      removedListIds: toRemove,
      savedListIds: toUpsert,
    });
    router.refresh();
    onClose?.();
  }, [
    body,
    mediaUploading,
    myReview,
    onApplied,
    onClose,
    rating,
    restaurantId,
    reviewMediaDraft,
    revokeBlobPreviews,
    restaurantAnalytics,
    router,
    selected,
    t,
    mustTryPicks,
    i18n.language,
  ]);

  const closeBtn = (
    <SheetCloseIconButton
      onClick={() => {
        revokeBlobPreviews(mediaDraftRef.current);
        onClose?.();
      }}
      disabled={busy || deletingReview}
    />
  );

  const sheetTitle = (
    <Typography
      id={SAVE_TO_LIST_SHEET_TITLE_ID}
      variant="subtitle1"
      component="h2"
      sx={{ fontWeight: 800, flex: 1, minWidth: 0, lineHeight: 1.3, m: 0 }}
    >
      {t('pages.lists.save_sheet_title')}
    </Typography>
  );

  const listsScrollAreaSx = useMemo(
    () => ({
      /**
       * Show all lists without an inner scroll region.
       * If content exceeds the viewport, the sheet/dialog can scroll as a whole.
       */
      maxHeight: 'none',
      overflow: 'visible',
    }),
    []
  );

  /**
   * Skeleton ↔ tiles crossfade. The tiles' own per-child stagger (below) runs after the fade-in,
   * so the picker feels assembled rather than dumped on top of an empty pane.
   */
  const sheetSwapDuration = 0.24;
  const sheetSwapEase = [0.22, 1, 0.36, 1];
  const sheetSwapInitial = prefersReducedMotion ? false : { opacity: 0 };
  const sheetSwapExit = prefersReducedMotion ? undefined : { opacity: 0 };

  const bodyInner = (
    <Stack spacing={2.5} sx={{ pt: 0.5 }}>
      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.div
            key="save-sheet-loading"
            initial={sheetSwapInitial}
            animate={{ opacity: 1 }}
            exit={sheetSwapExit}
            transition={{ duration: sheetSwapDuration, ease: sheetSwapEase }}
          >
            <Box role="status" aria-live="polite" sx={listsScrollAreaSx}>
              <SkeletonTheme
                baseColor={listSkeletonTheme.baseColor}
                highlightColor={listSkeletonTheme.highlightColor}
                borderRadius={16}
                duration={1.2}
              >
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 1.5,
                  }}
                >
                  {Array.from({ length: LIST_SKELETON_ROWS }, (_, i) => (
                    <Box key={i} sx={{ width: 1, minWidth: 0 }}>
                      <Skeleton
                        height={LIST_THUMB_SKELETON_H}
                        style={{ borderRadius: 12, marginBottom: 8 }}
                      />
                      <Box sx={{ px: 0.5 }}>
                        <Skeleton
                          height={14}
                          width={listNameSkeletonWidths[i] ?? '75%'}
                          style={{ borderRadius: 6, marginBottom: 4 }}
                        />
                        <Skeleton height={11} width="50%" style={{ borderRadius: 6 }} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </SkeletonTheme>
            </Box>
          </motion.div>
        ) : (
          <motion.div
            key="save-sheet-tiles"
            initial={sheetSwapInitial}
            animate={{ opacity: 1 }}
            exit={sheetSwapExit}
            transition={{ duration: sheetSwapDuration, ease: sheetSwapEase }}
          >
            <Stack spacing={0} sx={listsScrollAreaSx}>
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  pt: 1,
                  pb: 1.5,
                  px: 0.5,
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'text.secondary',
                }}
              >
                {t('pages.lists.save_sheet_section_nom_nom_lists')}
              </Typography>
              {/*
            Intentionally no "scroll to see more" hint: the list section is not scrollable.
          */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 1.5,
                  '@keyframes sheetListReveal': {
                    from: { opacity: 0, transform: 'translateY(10px)' },
                    to: { opacity: 1, transform: 'translateY(0)' },
                  },
                  '@keyframes sheetListPop': {
                    '0%': { transform: 'scale(0.85)', opacity: 0 },
                    '55%': { transform: 'scale(1.06)', opacity: 1 },
                    '100%': { transform: 'scale(1)', opacity: 1 },
                  },
                  /**
                   * Per-tile stagger so the picker feels assembled, not dumped.
                   * Cap delays at the 8th tile so long lists don't trail noticeably.
                   */
                  '@media (prefers-reduced-motion: no-preference)': {
                    '& > [data-sheet-tile]': {
                      animation: 'sheetListReveal 0.32s cubic-bezier(0.22, 1, 0.36, 1) both',
                    },
                    '& > [data-sheet-tile]:nth-of-type(1)': { animationDelay: '0ms' },
                    '& > [data-sheet-tile]:nth-of-type(2)': { animationDelay: '40ms' },
                    '& > [data-sheet-tile]:nth-of-type(3)': { animationDelay: '80ms' },
                    '& > [data-sheet-tile]:nth-of-type(4)': { animationDelay: '120ms' },
                    '& > [data-sheet-tile]:nth-of-type(5)': { animationDelay: '160ms' },
                    '& > [data-sheet-tile]:nth-of-type(6)': { animationDelay: '200ms' },
                    '& > [data-sheet-tile]:nth-of-type(7)': { animationDelay: '240ms' },
                    '& > [data-sheet-tile]:nth-of-type(n+8)': { animationDelay: '280ms' },
                    '& > [data-sheet-tile][data-just-created="true"]': {
                      animation: 'sheetListPop 0.46s cubic-bezier(0.22, 1, 0.36, 1) both',
                      animationDelay: '0ms !important',
                    },
                  },
                }}
              >
                {lists.map((l) => {
                  const isSel = selected.has(l.id);
                  const wasJustCreated = l.id === justCreatedListId;
                  return (
                    <Box
                      key={l.id}
                      data-sheet-tile=""
                      data-just-created={wasJustCreated ? 'true' : undefined}
                    >
                      <NomNomListPickerTile
                        list={l}
                        selected={isSel}
                        onToggle={() => toggle(l.id)}
                        t={t}
                        compact
                      />
                    </Box>
                  );
                })}
                <Box data-sheet-tile="">
                  <NomNomListCreateTile compact onClick={() => setCreateOpen(true)} t={t} />
                </Box>
              </Box>
            </Stack>
          </motion.div>
        )}
      </AnimatePresence>

      <Box>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            pb: 1,
            px: 0.5,
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'text.secondary',
          }}
        >
          {t('pages.lists.save_sheet_section_your_review')}
        </Typography>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {t('pages.dashboard.restaurant.reviews_rating_label')}
            </Typography>
            <Rating
              name="save-sheet-review-rating"
              value={rating}
              onChange={(_, v) => setRating(v)}
              precision={0.5}
              size="large"
            />
          </Box>
          <TextField
            multiline
            minRows={3}
            fullWidth
            label={t('pages.dashboard.restaurant.reviews_body_label')}
            placeholder={t('pages.dashboard.restaurant.reviews_body_placeholder')}
            value={body}
            onChange={(ev) => setBody(ev.target.value)}
            inputProps={{ maxLength: 2000 }}
          />
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {t('pages.dashboard.restaurant.reviews_media_label')}
            </Typography>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
              style={{ display: 'none' }}
              onChange={(ev) => {
                handleFilesSelected(ev.target.files);
                if (ev.target) ev.target.value = '';
              }}
            />
            {reviewMediaDraft.length > 0 ? (
              <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
                {reviewMediaDraft.map((item) => {
                  const src = item.previewUrl || '';
                  return (
                    <Box
                      key={item.key}
                      sx={{
                        position: 'relative',
                        width: 88,
                        height: 88,
                        borderRadius: '12px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        bgcolor: (tt) => alpha(tt.palette.grey[500], 0.12),
                      }}
                    >
                      <ReviewMediaDraftThumb item={item} src={src} />
                      {item.uploading ? (
                        <Box
                          sx={{
                            position: 'absolute',
                            inset: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: (tt) => alpha(tt.palette.common.black, 0.35),
                          }}
                        >
                          <CircularProgress size={28} sx={{ color: 'common.white' }} />
                        </Box>
                      ) : null}
                      <IconButton
                        size="small"
                        onClick={() => removeDraftItem(item.key)}
                        disabled={busy || loading || item.uploading}
                        aria-label={t('pages.dashboard.restaurant.reviews_media_remove')}
                        sx={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: (tt) => alpha(tt.palette.common.black, 0.5),
                          color: 'common.white',
                          minWidth: TOUCH_TARGET_SIZE,
                          minHeight: TOUCH_TARGET_SIZE,
                          width: TOUCH_TARGET_SIZE,
                          height: TOUCH_TARGET_SIZE,
                          p: 0,
                          transition: theme.transitions.create(['background-color', 'color'], {
                            duration: theme.transitions.duration.shorter,
                          }),
                          '&:hover': { bgcolor: (tt) => alpha(tt.palette.common.black, 0.65) },
                        }}
                      >
                        <Iconify icon={ic.closeLine} width={16} />
                      </IconButton>
                    </Box>
                  );
                })}
              </Stack>
            ) : null}
            <Button
              type="button"
              variant="outlined"
              size="small"
              onClick={handlePickFiles}
              disabled={
                busy || loading || mediaUploading || reviewMediaDraft.length >= MAX_REVIEW_MEDIA
              }
              startIcon={<Iconify icon={ic.cameraAddBold} width={18} />}
              sx={[touchTargetSx, { borderRadius: '12px', textTransform: 'none', fontWeight: 700 }]}
            >
              {t('pages.dashboard.restaurant.reviews_media_add')}
            </Button>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mt: 0.75 }}
            >
              {t('pages.dashboard.restaurant.reviews_media_hint')}
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Box>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            pb: 1,
            px: 0.5,
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'text.secondary',
          }}
        >
          {t('pages.lists.save_sheet_section_must_try')}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mb: 1.5, px: 0.5 }}
        >
          {t('pages.lists.must_try_hint')}
        </Typography>
        {mustTryLoading && (
          <Box role="status" aria-live="polite" aria-busy="true" sx={{ mb: 1.75 }}>
            <SkeletonTheme
              baseColor={listSkeletonTheme.baseColor}
              highlightColor={listSkeletonTheme.highlightColor}
              borderRadius={8}
              duration={1.2}
            >
              <Stack direction="row" flexWrap="wrap" gap={0.75}>
                {MUST_TRY_CHIP_LOADING_WIDTHS.map((w, i) => (
                  <Skeleton key={i} width={w} height={24} style={{ borderRadius: 8 }} />
                ))}
              </Stack>
            </SkeletonTheme>
          </Box>
        )}
        {!mustTryLoading && mustTryPicks.length > 0 && (
          <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 1.5 }}>
            {mustTryPicks.map((p) => (
              <Chip
                key={p.key}
                label={p.label}
                variant="outlined"
                size="small"
                onDelete={() => removeMustTryPick(p.key)}
                disabled={busy || loading || mustTryLoading}
                sx={{ maxWidth: '100%', ...MUST_TRY_DISH_CHIP_SX }}
                slotProps={{
                  deleteIcon: {
                    'aria-label': t('pages.lists.must_try_remove_aria'),
                  },
                }}
              />
            ))}
          </Stack>
        )}
        {!mustTryLoading && availableMustTrySuggestions.length > 0 ? (
          <>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: 'block', mb: 0.75 }}
            >
              {t('pages.lists.must_try_suggested')}
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.75} sx={{ mb: 1.75 }}>
              {availableMustTrySuggestions.map((s) => (
                <Chip
                  key={s.id}
                  label={s.label}
                  variant="outlined"
                  size="small"
                  onClick={() => addSuggestionMustTry(s)}
                  disabled={
                    busy || loading || mustTryLoading || mustTryPicks.length >= MAX_MUST_TRY_DISHES
                  }
                  sx={{
                    maxWidth: '100%',
                    cursor: 'pointer',
                    ...MUST_TRY_DISH_CHIP_SX,
                  }}
                />
              ))}
            </Stack>
          </>
        ) : null}
        <Box
          sx={(tt) => ({
            display: 'flex',
            alignItems: 'stretch',
            gap: 0.5,
            minHeight: 52,
            pl: { xs: 1.5, sm: 1.75 },
            pr: 0.75,
            py: 0.5,
            borderRadius: '16px',
            border: '1px solid',
            borderColor:
              tt.palette.mode === 'dark'
                ? alpha(tt.palette.divider, 0.65)
                : alpha(tt.palette.grey[400], 0.85),
            bgcolor:
              tt.palette.mode === 'dark'
                ? alpha(tt.palette.common.white, 0.04)
                : alpha(tt.palette.grey[500], 0.06),
            transition: tt.transitions.create(['border-color', 'box-shadow'], {
              duration: tt.transitions.duration.shorter,
            }),
            '&:focus-within': {
              borderColor: 'primary.main',
              boxShadow: `0 0 0 3px ${alpha(tt.palette.primary.main, tt.palette.mode === 'dark' ? 0.28 : 0.16)}`,
            },
            ...(mustTryPicks.length >= MAX_MUST_TRY_DISHES || mustTryLoading
              ? { opacity: 0.55, pointerEvents: 'none' }
              : {}),
          })}
        >
          <TextField
            variant="standard"
            fullWidth
            placeholder={t('pages.lists.must_try_add_placeholder')}
            value={customDishInput}
            onChange={(ev) => setCustomDishInput(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter') {
                ev.preventDefault();
                addCustomMustTry();
              }
            }}
            disabled={
              busy || loading || mustTryLoading || mustTryPicks.length >= MAX_MUST_TRY_DISHES
            }
            inputProps={{ maxLength: 300, 'aria-label': t('pages.lists.must_try_add_placeholder') }}
            InputProps={{ disableUnderline: true }}
            sx={{
              flex: 1,
              minWidth: 0,
              justifyContent: 'center',
              '& .MuiInputBase-root': { py: 0.5 },
              '& .MuiInputBase-input': {
                py: 1,
                fontSize: '0.9375rem',
                fontWeight: 600,
                lineHeight: 1.35,
                '&::placeholder': { fontWeight: 500, opacity: 0.55 },
              },
            }}
          />
          <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <IconButton
              type="button"
              color="primary"
              onClick={addCustomMustTry}
              disabled={
                busy ||
                loading ||
                mustTryLoading ||
                !customDishInput.trim() ||
                mustTryPicks.length >= MAX_MUST_TRY_DISHES
              }
              aria-label={t('pages.lists.must_try_add_button')}
              sx={(tt) => ({
                width: TOUCH_TARGET_SIZE,
                height: TOUCH_TARGET_SIZE,
                borderRadius: '14px',
                bgcolor: alpha(tt.palette.primary.main, 0.14),
                color: 'primary.main',
                transition: tt.transitions.create(['background-color', 'color', 'transform'], {
                  duration: tt.transitions.duration.shorter,
                }),
                '&:hover': {
                  bgcolor: alpha(tt.palette.primary.main, 0.22),
                },
                '&.Mui-disabled': {
                  bgcolor: alpha(tt.palette.primary.main, 0.06),
                  color: alpha(tt.palette.primary.main, 0.35),
                },
                '&:active:not(.Mui-disabled)': { transform: 'scale(0.96)' },
              })}
            >
              <Iconify icon={ic.addRounded} width={22} />
            </IconButton>
          </Box>
        </Box>
        {!mustTryLoading ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', mt: 0.75, px: 0.5 }}
          >
            {`${mustTryPicks.length}/${MAX_MUST_TRY_DISHES}`}
          </Typography>
        ) : null}
      </Box>

      {errText && (
        <Alert severity="error" variant="outlined" role="alert">
          {errText}
        </Alert>
      )}
      <Stack spacing={2} sx={{ width: 1 }}>
        {myReview ? (
          <Button
            type="button"
            variant="outlined"
            color="error"
            fullWidth
            size="large"
            onClick={() => setDeleteReviewOpen(true)}
            disabled={busy || loading || mediaUploading || deletingReview}
            sx={sheetStackedDestructiveOutlinedSx}
          >
            {t('pages.dashboard.restaurant.reviews_delete_button')}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outlined"
          fullWidth
          size="large"
          onClick={() => {
            revokeBlobPreviews(mediaDraftRef.current);
            onClose?.();
          }}
          disabled={busy || loading || deletingReview}
          sx={sheetStackedCancelOutlinedSx}
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="button"
          color="primary"
          variant="contained"
          fullWidth
          size="large"
          onClick={handleSave}
          loading={busy}
          disabled={
            busy || loading || mediaUploading || deletingReview || mustTryLoading || !saveHasWork
          }
          sx={[
            sheetStackedContainedGlowSx('primary'),
            {
              transition: (tt) =>
                tt.transitions.create(['background-color', 'box-shadow', 'transform'], {
                  duration: tt.transitions.duration.shorter,
                }),
              '&:active:not(.Mui-disabled)': { transform: 'scale(0.98)' },
              '@media (prefers-reduced-motion: reduce)': {
                '&:active': { transform: 'none' },
              },
            },
          ]}
        >
          {t('pages.lists.confirm_save')}
        </Button>
      </Stack>
    </Stack>
  );

  return (
    <>
      <DeleteDialog
        open={deleteReviewOpen}
        onClose={() => !deletingReview && setDeleteReviewOpen(false)}
        onConfirm={handleConfirmDeleteReview}
        isDeleting={deletingReview}
        title={t('pages.dashboard.restaurant.reviews_delete_dialog.title')}
        confirmationMessage={t('pages.dashboard.restaurant.reviews_delete_dialog.confirmation')}
        warningMessage={t('pages.dashboard.restaurant.reviews_delete_dialog.warning')}
        confirmButtonText={t('pages.dashboard.restaurant.reviews_delete_dialog.confirm_button')}
      />
      <CreateListModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={handleListCreated}
      />
      {isMobile ? (
        <Drawer
          anchor="bottom"
          elevation={0}
          open={open}
          onClose={() => {
            if (busy || deletingReview) return;
            revokeBlobPreviews(mediaDraftRef.current);
            onClose?.();
          }}
          aria-labelledby={SAVE_TO_LIST_SHEET_TITLE_ID}
          PaperProps={{
            sx: mobileBottomSheetDrawerPaperSx,
          }}
        >
          <SwipeDismissBottomSheetContent
            onClose={() => {
              if (busy || deletingReview) return;
              revokeBlobPreviews(mediaDraftRef.current);
              onClose?.();
            }}
            disabled={busy || deletingReview}
            chrome={
              <>
                <Box {...sheetDragHandleProps()}>
                  <SheetGrabBarRail />
                </Box>
                <SheetHeaderRow title={sheetTitle} endAction={closeBtn} />
              </>
            }
          >
            <Box sx={{ px: 2, pb: 3 }}>{bodyInner}</Box>
          </SwipeDismissBottomSheetContent>
        </Drawer>
      ) : (
        <Dialog
          open={open}
          onClose={() => {
            if (busy || deletingReview) return;
            revokeBlobPreviews(mediaDraftRef.current);
            onClose?.();
          }}
          maxWidth="sm"
          fullWidth
          aria-labelledby={SAVE_TO_LIST_SHEET_TITLE_ID}
          sx={{ '& .MuiDialog-paper': { m: 2 } }}
        >
          <SheetHeaderRow title={sheetTitle} endAction={closeBtn} sx={{ px: 3, pt: 2.5, pb: 1 }} />
          <Box sx={{ px: 3, pb: 3 }}>{bodyInner}</Box>
        </Dialog>
      )}
    </>
  );
}

SaveToListSheet.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  restaurantId: PropTypes.string,
  onApplied: PropTypes.func,
  reviews: PropTypes.arrayOf(
    PropTypes.shape({
      user_id: PropTypes.string.isRequired,
      rating: PropTypes.number.isRequired,
      body: PropTypes.string,
      media: PropTypes.array,
    })
  ),
  myUserId: PropTypes.string,
  defaultSelectedListId: PropTypes.string,
  initialLists: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string,
    })
  ),
  initialListsReady: PropTypes.bool,
};
