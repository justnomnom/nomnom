'use client';

import useSWR from 'swr';
import PropTypes from 'prop-types';
import dynamic from 'next/dynamic';
import { useTranslation } from 'react-i18next';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import List from '@mui/material/List';
import Tabs from '@mui/material/Tabs';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import { alpha, useTheme } from '@mui/material/styles';
import InputAdornment from '@mui/material/InputAdornment';
import CardActionArea from '@mui/material/CardActionArea';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { restaurantHrefWithFrom } from 'src/routes/restaurant-nav-from';
import { RouterLink, NAV_BACK_TRANSITION_TYPES } from 'src/routes/components';

import { useShareLink } from 'src/hooks/use-share-link';

import { translateListCollaborationError } from 'src/utils/list-collaboration-errors';

import { ic } from 'src/assets/icons';
import { NAV } from 'src/config-global';
import { useTranslate } from 'src/locales';
import { useAuthContext } from 'src/auth/hooks';
import { normalizeAppLocale } from 'src/libs/locale-utils';
import { SPACE, TOUCH_TARGET_SIZE } from 'src/theme/spacing';
import { sortListItemsByMode } from 'src/libs/lists/sort-list-items';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';
import {
  RESTAURANT_SURFACE,
  useRestaurantAnalytics,
} from 'src/libs/analytics/restaurant-analytics';
import {
  deleteList,
  inviteToList,
  updateListMeta,
  removeListMember,
  setListMemberRole,
  fetchListForManage,
  rejectListJoinRequest,
  approveListJoinRequest,
  resolveUsernameToUserId,
  removeRestaurantFromList,
  searchRestaurantsForPicker,
} from 'src/auth/actions/list-actions';

import Iconify from 'src/components/iconify';
import DeleteDialog from 'src/components/custom-dialog/delete-dialog';
import RemoteCoverImage from 'src/components/image/remote-cover-image';
import ShareFeedbackSnackbar from 'src/components/share/share-feedback-snackbar';

import MapSheetSortMenu from 'src/sections/map/map-sheet-sort-menu';
import { MapSpotSheetListRow } from 'src/sections/map/map-spot-sheet-inner';
import { useRestaurantMapSheet } from 'src/sections/map/use-restaurant-map-sheet';
import { useMapSheetViewerIdentity } from 'src/sections/map/use-map-sheet-viewer-identity';
import {
  mapPlaceMapsUrl,
  mapPlaceTelHref,
  mapPlaceNumericRating,
  mapPlaceTagLabelsCapped,
  mapPlaceFromListRestaurant,
} from 'src/sections/map/map-spot-sheet-helpers';
import {
  ICON_TILE,
  ROUNDED_CARD,
  SHELL_HUB_ICON,
  hubCardShellSx,
  HUB_ROW_MIN_HEIGHT,
  SettingsDrillShell,
  SHELL_TOOLBAR_ICON,
  minimalIconButtonSx,
  dashboardPageRootSx,
  DASHBOARD_SPACE_BLOCK,
  settingsShellRowHoverBg,
  settingsDrillFullBleedStripSx,
  dashboardSubsectionStackProps,
  dashboardPageSectionStackProps,
  dashboardMobileStretchButtonSx,
} from 'src/sections/profile/view';

import ListManagePageSkeleton from './list-manage-skeleton';

const GoogleMapsImportModal = dynamic(() => import('src/sections/lists/google-maps-import-modal'), {
  ssr: false,
});

// Dark editorial CTA (DESIGN.md §7): explicit bgcolor marks the dark color as intentional.
const darkBillingCtaSx = {
  ...dashboardMobileStretchButtonSx,
  bgcolor: 'text.primary',
  color: 'background.paper',
  '&:hover': { bgcolor: 'text.primary' },
};

const SaveToListSheet = dynamic(() => import('src/sections/lists/save-to-list-sheet'), {
  ssr: false,
});

// ----------------------------------------------------------------------

const COVER_MAX_BYTES = 5 * 1024 * 1024;
const COVER_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';

const MANAGE_TAB_DETAILS = 'details';
const MANAGE_TAB_ACCESS = 'access';
const MANAGE_TAB_PLACES = 'places';
const MANAGE_TAB_PEOPLE = 'people';
const MANAGE_TAB_DELETE = 'delete';

export default function ListManageView({ listId, isOwner, canEditItems, initial }) {
  const theme = useTheme();
  const { i18n } = useTranslation();
  const { t } = useTranslate();
  const router = useRouter();
  const tIcon = minimalIconButtonSx(theme);
  const rowHoverBg = settingsShellRowHoverBg(theme);
  const { supabase, user } = useAuthContext();
  const { trackEvent } = useAnalytics();
  const viewerLang = normalizeAppLocale(i18n.language);
  const { data, mutate } = useSWR(
    ['list-manage', listId, viewerLang],
    () => fetchListForManage(listId, { viewerLang }),
    {
      fallbackData: initial,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 10000,
    }
  );
  const list = data?.list ?? null;
  const items = useMemo(() => data?.items ?? [], [data]);
  const members = useMemo(() => data?.members ?? [], [data]);
  const listOwner = data?.listOwner ?? null;

  const coverFileInputRef = useRef(null);
  const [name, setName] = useState(initial?.list?.name ?? '');
  const [description, setDescription] = useState(initial?.list?.description ?? '');
  const [visibility, setVisibility] = useState(initial?.list?.visibility ?? 'private');
  const [coverUrl, setCoverUrl] = useState(initial?.list?.cover_image_url ?? '');
  /** Which async action is running (for per-control loading); null when idle. */
  const [busyOp, setBusyOp] = useState(null);
  const [optimisticRoles, setOptimisticRoles] = useState({});
  const busy = busyOp != null;
  const [searchQ, setSearchQ] = useState('');
  const [searchHits, setSearchHits] = useState([]);
  const [inviteUser, setInviteUser] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  /** Invite / member moderation errors shown on the People tab card (not only above tabs). */
  const [peopleSectionError, setPeopleSectionError] = useState(null);
  /** Visibility save error shown inline below the Save button on the Audience tab. */
  const [accessSectionError, setAccessSectionError] = useState(null);
  const [err, setErr] = useState(initial?.error ?? null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingList, setDeletingList] = useState(false);
  /** When set, remove-member confirmation sheet/dialog is open for this user id. */
  const [removeMemberUserId, setRemoveMemberUserId] = useState(null);
  const [coverUploadError, setCoverUploadError] = useState(null);
  const [coverUploading, setCoverUploading] = useState(false);
  const [manageTab, setManageTab] = useState(MANAGE_TAB_DETAILS);
  const [saveSheetOpen, setSaveSheetOpen] = useState(false);
  const [gmapsImportOpen, setGmapsImportOpen] = useState(false);
  const [saveSheetRestaurantId, setSaveSheetRestaurantId] = useState(null);
  const [listSortMode, setListSortMode] = useState(
    /** @type {'relevance' | 'distance' | 'recent'} */ ('relevance')
  );
  const [listGeoRef, setListGeoRef] = useState(
    /** @type {{ lat: number, lng: number } | null} */ (null)
  );
  const [listSortLocationError, setListSortLocationError] = useState(false);
  const ownerStripeChargesEnabled = data?.ownerStripeChargesEnabled ?? null;
  const paidAccessEnabled = Boolean(data?.list?.paid_access_enabled);
  const bundlePriceCents = data?.bundlePriceCents ?? null;
  const bundleCurrency = data?.bundleCurrency ?? 'eur';

  const refresh = useCallback(() => mutate(), [mutate]);

  const handleListSortChange = useCallback(
    (mode) => {
      setListSortLocationError(false);
      if (mode !== 'distance') {
        setListSortMode(mode);
        return;
      }
      if (listGeoRef) {
        setListSortMode('distance');
        return;
      }
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setListSortLocationError(true);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setListGeoRef({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setListSortMode('distance');
        },
        () => {
          setListSortLocationError(true);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 120_000 }
      );
    },
    [listGeoRef]
  );

  const sortedPlacesItems = useMemo(
    () => sortListItemsByMode(items, listSortMode, listGeoRef),
    [items, listSortMode, listGeoRef]
  );

  const listHasMultiplePlaces = items.length > 1;

  useEffect(() => {
    setListSortMode('relevance');
    setListSortLocationError(false);
  }, [listId]);

  useEffect(() => {
    if (data?.error) setErr(data.error);
    if (!data?.list) return;
    setName(data.list.name ?? '');
    setDescription(data.list.description ?? '');
    setVisibility(data.list.visibility ?? 'private');
    setCoverUrl(data.list.cover_image_url ?? '');
    setCoverUploadError(null);
  }, [data]);

  const handleCoverFileChange = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (event.target) event.target.value = '';
      if (!file || !isOwner || !supabase || !user?.id) return;

      setCoverUploadError(null);
      if (!file.type.startsWith('image/') || !COVER_ACCEPT.split(',').includes(file.type)) {
        setCoverUploadError(t('pages.lists.cover_upload_error'));
        return;
      }
      if (file.size > COVER_MAX_BYTES) {
        setCoverUploadError(t('pages.lists.cover_upload_error'));
        return;
      }

      setCoverUploading(true);
      const ext =
        (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const path = `${user.id}/list-covers/${listId}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });

      setCoverUploading(false);

      if (upErr) {
        setCoverUploadError(upErr.message || t('pages.lists.cover_upload_error'));
        return;
      }

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      if (pub?.publicUrl) {
        setCoverUrl(pub.publicUrl);
      } else {
        setCoverUploadError(t('pages.lists.cover_upload_error'));
      }
    },
    [isOwner, listId, supabase, t, user?.id]
  );

  useEffect(() => {
    let cancelled = false;
    const q = searchQ.trim();
    if (q.length < 2 || !canEditItems) {
      setSearchHits([]);
      return undefined;
    }
    const tmr = setTimeout(() => {
      searchRestaurantsForPicker(q, 15).then(({ restaurants }) => {
        if (!cancelled) setSearchHits(restaurants ?? []);
      });
    }, 320);
    return () => {
      cancelled = true;
      clearTimeout(tmr);
    };
  }, [searchQ, canEditItems]);

  const managePlaces = useMemo(
    () => (items ?? []).map((row) => mapPlaceFromListRestaurant(row.restaurants)).filter(Boolean),
    [items]
  );

  const {
    tagCatalog,
    tagCatalogLoaded,
    savedListIdsByRestaurant,
    listMetaById,
    followingOwnersByRestaurant,
    followingOwnersLoading,
    refreshSavedForPlaces,
  } = useRestaurantMapSheet({
    places: managePlaces,
    selectedId: null,
    userId: user?.id ?? null,
    userScopedSavedListCacheKey: null,
  });

  const { avatarUrl: viewerAvatarUrl, displayName: viewerDisplayName } = useMapSheetViewerIdentity(
    user,
    supabase
  );

  const restaurantAnalytics = useRestaurantAnalytics();

  const listRowActionBtnSx = useMemo(() => {
    const borderAlpha = theme.palette.mode === 'dark' ? 0.2 : 0.55;
    return {
      width: 32,
      height: 32,
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
    };
  }, [theme]);

  const handleListPlaceRowSelect = useCallback(
    (id) => {
      router.push(restaurantHrefWithFrom(paths.dashboard.restaurant(id), 'list', { listId }), {
        transitionTypes: ['nav-forward'],
      });
    },
    [listId, router]
  );

  const {
    share: shareLink,
    feedback: shareFeedback,
    dismissFeedback: dismissShareFeedback,
  } = useShareLink();

  const handleListPlaceShare = useCallback(
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

  const isPublicAudience =
    list?.visibility === 'public' || list?.visibility === 'public_subscribers';

  const canModerate = useMemo(() => isPublicAudience && isOwner, [isOwner, isPublicAudience]);

  const canInvite = useMemo(() => {
    if (isOwner) return true;
    return Boolean(canEditItems && isPublicAudience);
  }, [isOwner, canEditItems, isPublicAudience]);

  const memberStatusLabel = useCallback(
    (status) => {
      if (status === 'active') return t('pages.lists.member_status_active');
      if (status === 'pending_invite') return t('pages.lists.member_status_pending_invite');
      if (status === 'pending_request') return t('pages.lists.member_status_pending_request');
      return status;
    },
    [t]
  );

  const memberRoleLabel = useCallback(
    (role) => {
      if (role === 'editor') return t('pages.lists.role_editor');
      if (role === 'viewer') return t('pages.lists.role_viewer');
      return role;
    },
    [t]
  );

  const showRemoveForMemberRow = useCallback(
    (m) => {
      if (!canEditItems) return false;
      if (m.status === 'pending_request' && isOwner && canModerate) return false;
      return true;
    },
    [canEditItems, isOwner, canModerate]
  );

  const peopleSectionErrorText = useMemo(
    () => translateListCollaborationError(t, peopleSectionError),
    [peopleSectionError, t]
  );

  const accessSectionErrorText = useMemo(
    () => translateListCollaborationError(t, accessSectionError),
    [accessSectionError, t]
  );

  const errText = useMemo(() => translateListCollaborationError(t, err), [err, t]);

  const handleSaveDetails = useCallback(async () => {
    if (!isOwner) return;
    setBusyOp('details');
    setErr(null);
    const { error } = await updateListMeta(listId, {
      name: name.trim(),
      description: description.trim(),
      cover_image_url: coverUrl.trim() || null,
    });
    if (error) {
      setErr(error);
      setBusyOp(null);
      return;
    }
    trackEvent('list_details_saved', { list_id: listId });
    await refresh();
    router.refresh();
    setBusyOp(null);
  }, [coverUrl, description, isOwner, listId, name, refresh, router, trackEvent]);

  const handleSaveVisibility = useCallback(async () => {
    if (!isOwner) return;
    setBusyOp('visibility');
    setAccessSectionError(null);
    const publishedAt = ['public', 'public_subscribers'].includes(visibility)
      ? (list?.published_at ?? new Date().toISOString())
      : null;
    const { error } = await updateListMeta(listId, {
      visibility,
      published_at: publishedAt,
    });
    if (error) {
      setAccessSectionError(error);
      setBusyOp(null);
      return;
    }
    trackEvent('list_visibility_changed', { list_id: listId, visibility });
    await refresh();
    router.refresh();
    setBusyOp(null);
  }, [isOwner, list, listId, refresh, router, trackEvent, visibility]);

  const handleSaveSheetAppliedFromManage = useCallback(async () => {
    setSaveSheetOpen(false);
    setSearchQ('');
    setSearchHits([]);
    await refresh();
    refreshSavedForPlaces(managePlaces);
    router.refresh();
  }, [managePlaces, refresh, refreshSavedForPlaces, router]);

  const handleRemovePlace = useCallback(
    async (restaurantId) => {
      setBusyOp(`remove-place:${restaurantId}`);
      const { error } = await removeRestaurantFromList(listId, restaurantId);
      if (error) {
        setErr(error);
        setBusyOp(null);
        return;
      }
      trackEvent('list_place_removed', { list_id: listId, restaurant_id: restaurantId });
      await refresh();
      router.refresh();
      setBusyOp(null);
    },
    [listId, refresh, router, trackEvent]
  );

  const handleInvite = useCallback(async () => {
    setBusyOp('invite');
    setPeopleSectionError(null);
    const { userId, error: rErr } = await resolveUsernameToUserId(inviteUser);
    if (rErr || !userId) {
      setBusyOp(null);
      setPeopleSectionError(rErr ?? 'user');
      return;
    }
    const { error } = await inviteToList(listId, userId, inviteRole);
    if (error) {
      setPeopleSectionError(error);
      setBusyOp(null);
      return;
    }
    setPeopleSectionError(null);
    setInviteUser('');
    await refresh();
    setBusyOp(null);
  }, [inviteRole, inviteUser, listId, refresh]);

  const handleApprove = useCallback(
    async (userId, role) => {
      setPeopleSectionError(null);
      setBusyOp(`approve:${userId}`);
      const { error } = await approveListJoinRequest(listId, userId, role);
      if (error) {
        setPeopleSectionError(error);
        setBusyOp(null);
        return;
      }
      setPeopleSectionError(null);
      await refresh();
      setBusyOp(null);
    },
    [listId, refresh]
  );

  const handleReject = useCallback(
    async (userId) => {
      setPeopleSectionError(null);
      setBusyOp(`reject:${userId}`);
      const { error } = await rejectListJoinRequest(listId, userId);
      if (error) {
        setPeopleSectionError(error);
        setBusyOp(null);
        return;
      }
      setPeopleSectionError(null);
      await refresh();
      setBusyOp(null);
    },
    [listId, refresh]
  );

  const handleRoleChange = useCallback(
    async (userId, role) => {
      if (!isOwner) return;
      setPeopleSectionError(null);
      setOptimisticRoles((prev) => ({ ...prev, [userId]: role }));
      setBusyOp(`role:${userId}`);
      const { error } = await setListMemberRole(listId, userId, role);
      if (error) {
        setPeopleSectionError(error);
        setOptimisticRoles((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
        setBusyOp(null);
        return;
      }
      setPeopleSectionError(null);
      await refresh();
      setOptimisticRoles((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
      setBusyOp(null);
    },
    [isOwner, listId, refresh]
  );

  const removeMemberLabel = useMemo(() => {
    if (!removeMemberUserId) return '';
    const m = members.find((x) => x.user_id === removeMemberUserId);
    return m?.users?.display_name || m?.users?.username || removeMemberUserId;
  }, [members, removeMemberUserId]);

  const removingMember =
    removeMemberUserId != null && busyOp === `remove-member:${removeMemberUserId}`;

  const handleConfirmRemoveMember = useCallback(async () => {
    const userId = removeMemberUserId;
    if (!userId || !canEditItems) return;
    setPeopleSectionError(null);
    setBusyOp(`remove-member:${userId}`);
    const { error } = await removeListMember(listId, userId);
    if (error) {
      setPeopleSectionError(error);
      setBusyOp(null);
      return;
    }
    setPeopleSectionError(null);
    setRemoveMemberUserId(null);
    await refresh();
    setBusyOp(null);
  }, [canEditItems, listId, removeMemberUserId, refresh]);

  const handleConfirmDeleteList = useCallback(async () => {
    setDeletingList(true);
    setErr(null);
    const { error } = await deleteList(listId);
    setDeletingList(false);
    if (error) {
      if (error === 'unauthorized') {
        setErr(t('pages.lists.delete_list_unauthorized'));
      } else if (error === 'forbidden') {
        setErr(t('pages.lists.delete_list_forbidden'));
      } else if (error === 'has_snapshot_purchases') {
        setErr(t('pages.lists.collab_error_has_snapshot_purchases'));
      } else if (error === 'has_active_subscriptions') {
        setErr(t('pages.lists.collab_error_has_active_subscriptions'));
      } else {
        setErr(error);
      }
      setDeleteOpen(false);
      return;
    }
    trackEvent('list_deleted', { list_id: listId });
    setDeleteOpen(false);
    // Use replace so the back button can't return to the now-deleted list's
    // manage page. The lists index (SavedView) fetches fresh data on mount, so
    // no router.refresh() is needed — calling it here would re-render the
    // just-deleted manage route and interrupt the navigation.
    router.replace(paths.dashboard.lists);
  }, [listId, router, t, trackEvent]);

  const handleManageTabChange = useCallback((_, next) => {
    setManageTab(next);
  }, []);

  if (!list) {
    if (err) {
      return (
        <Container maxWidth="sm" sx={{ py: { xs: 3, md: 5 } }}>
          <Alert severity="error" variant="outlined" role="alert">
            {errText}
          </Alert>
        </Container>
      );
    }
    return <ListManagePageSkeleton />;
  }

  const openListPageAdornment =
    list.visibility === 'public' || list.visibility === 'public_subscribers' ? (
      <IconButton
        component={RouterLink}
        href={paths.dashboard.listDetails(listId)}
        transitionTypes={NAV_BACK_TRANSITION_TYPES}
        aria-label={t('pages.lists.open_public_link')}
        sx={tIcon}
      >
        <Iconify icon={ic.globeLinear} width={SHELL_TOOLBAR_ICON} />
      </IconButton>
    ) : null;

  return (
    <>
      <SettingsDrillShell
        title={list.name}
        compactToolbar
        backHref={paths.dashboard.listDetails(listId)}
        backAriaLabel={t('pages.lists.back_to_list_view')}
        endAdornment={openListPageAdornment}
      >
        <Box sx={{ ...dashboardPageRootSx, minWidth: 0, overflowX: 'hidden' }}>
          <DeleteDialog
            open={deleteOpen}
            onClose={() => !deletingList && setDeleteOpen(false)}
            onConfirm={handleConfirmDeleteList}
            isDeleting={deletingList}
            title={t('pages.lists.delete_list_dialog.title')}
            confirmationMessage={t('pages.lists.delete_list_dialog.confirmation', {
              name: list.name,
            })}
            warningMessage={t('pages.lists.delete_list_dialog.warning')}
            confirmButtonText={t('pages.lists.delete_list_dialog.confirm_button')}
          />

          <DeleteDialog
            open={removeMemberUserId != null}
            onClose={() => !removingMember && setRemoveMemberUserId(null)}
            onConfirm={handleConfirmRemoveMember}
            isDeleting={removingMember}
            title={t('pages.lists.remove_member_dialog.title')}
            confirmationMessage={t('pages.lists.remove_member_dialog.confirmation', {
              name: removeMemberLabel,
            })}
            warningMessage={t('pages.lists.remove_member_dialog.warning')}
            confirmButtonText={t('pages.lists.remove_member_dialog.confirm_button')}
          />

          <Stack {...dashboardSubsectionStackProps}>
            {errText ? (
              <Alert severity="error" variant="outlined" role="alert">
                {errText}
              </Alert>
            ) : null}

            <Tabs
              value={manageTab}
              onChange={handleManageTabChange}
              variant="scrollable"
              scrollButtons="auto"
              allowScrollButtonsMobile
              sx={{
                ...settingsDrillFullBleedStripSx,
                mb: 0,
                borderBottom: 1,
                borderColor: 'divider',
                '& .MuiTabScrollButton-root': {
                  width: TOUCH_TARGET_SIZE,
                  minWidth: TOUCH_TARGET_SIZE,
                  minHeight: 48,
                },
              }}
            >
              <Tab
                id={`list-manage-tab-${MANAGE_TAB_DETAILS}`}
                aria-controls={`list-manage-panel-${MANAGE_TAB_DETAILS}`}
                label={t('pages.lists.section_details')}
                value={MANAGE_TAB_DETAILS}
                sx={{ textTransform: 'none', fontWeight: 600, minHeight: 48 }}
              />
              <Tab
                id={`list-manage-tab-${MANAGE_TAB_ACCESS}`}
                aria-controls={`list-manage-panel-${MANAGE_TAB_ACCESS}`}
                label={t('pages.lists.section_access')}
                value={MANAGE_TAB_ACCESS}
                sx={{ textTransform: 'none', fontWeight: 600, minHeight: 48 }}
              />
              <Tab
                id={`list-manage-tab-${MANAGE_TAB_PLACES}`}
                aria-controls={`list-manage-panel-${MANAGE_TAB_PLACES}`}
                label={t('pages.lists.section_places')}
                value={MANAGE_TAB_PLACES}
                sx={{ textTransform: 'none', fontWeight: 600, minHeight: 48 }}
              />
              <Tab
                id={`list-manage-tab-${MANAGE_TAB_PEOPLE}`}
                aria-controls={`list-manage-panel-${MANAGE_TAB_PEOPLE}`}
                label={t('pages.lists.section_people')}
                value={MANAGE_TAB_PEOPLE}
                sx={{ textTransform: 'none', fontWeight: 600, minHeight: 48 }}
              />
              {isOwner ? (
                <Tab
                  data-testid="e2e-list-tab-delete"
                  id={`list-manage-tab-${MANAGE_TAB_DELETE}`}
                  aria-controls={`list-manage-panel-${MANAGE_TAB_DELETE}`}
                  label={t('pages.lists.delete_list')}
                  value={MANAGE_TAB_DELETE}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    minHeight: 48,
                    color: 'error.main',
                    '&.Mui-selected': { color: 'error.main' },
                  }}
                />
              ) : null}
            </Tabs>
          </Stack>

          <Stack
            {...dashboardPageSectionStackProps}
            sx={{ pt: DASHBOARD_SPACE_BLOCK, '& .MuiInputBase-input': { fontSize: '1rem' } }}
            role="tabpanel"
            id={`list-manage-panel-${manageTab}`}
            aria-labelledby={`list-manage-tab-${manageTab}`}
          >
            {manageTab === MANAGE_TAB_DETAILS && (
              <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Stack {...dashboardSubsectionStackProps}>
                  <TextField
                    label={t('pages.lists.field_name')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!isOwner || busy}
                    fullWidth
                  />
                  <TextField
                    label={t('pages.lists.field_description')}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={!isOwner || busy}
                    fullWidth
                    multiline
                    minRows={2}
                  />
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: 'block', mb: 1 }}
                    >
                      {t('pages.lists.cover_image')}
                    </Typography>
                    <input
                      ref={coverFileInputRef}
                      type="file"
                      accept={COVER_ACCEPT}
                      hidden
                      onChange={handleCoverFileChange}
                    />
                    <Stack
                      alignItems="center"
                      spacing={1.5}
                      sx={{ width: '100%', maxWidth: 480, mx: 'auto' }}
                    >
                      <Box
                        role={isOwner && !busy && !coverUploading ? 'button' : undefined}
                        tabIndex={isOwner && !busy && !coverUploading ? 0 : -1}
                        onKeyDown={(e) => {
                          if (!isOwner || busy || coverUploading) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            coverFileInputRef.current?.click();
                          }
                        }}
                        sx={{
                          position: 'relative',
                          width: '100%',
                          aspectRatio: '16 / 9',
                          borderRadius: 2,
                          overflow: 'hidden',
                          bgcolor: 'action.hover',
                          border: '1px solid',
                          borderColor: 'divider',
                          ...(isOwner &&
                            !busy &&
                            !coverUploading && {
                              cursor: 'pointer',
                              WebkitTapHighlightColor: 'transparent',
                              '&:hover .list-cover-overlay': { opacity: 1 },
                              '&:focus-visible': {
                                outline: (th) => `2px solid ${th.palette.primary.main}`,
                                outlineOffset: 2,
                              },
                            }),
                        }}
                        onClick={
                          isOwner && !busy && !coverUploading
                            ? () => coverFileInputRef.current?.click()
                            : undefined
                        }
                      >
                        {coverUrl ? (
                          <RemoteCoverImage
                            src={coverUrl}
                            alt={name || list?.name || ''}
                            fill
                            sizes="(max-width: 768px) 100vw, 960px"
                          />
                        ) : (
                          <Box
                            sx={{
                              width: '100%',
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              px: 2,
                            }}
                          >
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ textAlign: 'center' }}
                            >
                              {t(
                                isOwner
                                  ? 'pages.lists.cover_empty_owner'
                                  : 'pages.lists.cover_empty'
                              )}
                            </Typography>
                          </Box>
                        )}
                        {isOwner && !coverUploading && (
                          <Box
                            className="list-cover-overlay"
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              bgcolor: alpha(theme.palette.common.black, 0.45),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              opacity: 0,
                              transition: 'opacity 0.2s',
                              pointerEvents: 'none',
                              zIndex: 1,
                            }}
                          >
                            <Iconify
                              icon={ic.cameraBold}
                              width={40}
                              sx={{ color: 'common.white' }}
                            />
                          </Box>
                        )}
                        {isOwner && Boolean(coverUrl.trim()) && !coverUploading && (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCoverUrl('');
                              setCoverUploadError(null);
                            }}
                            aria-label={t('pages.lists.cover_remove')}
                            disabled={busy}
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              zIndex: 5,
                              minWidth: TOUCH_TARGET_SIZE,
                              minHeight: TOUCH_TARGET_SIZE,
                              width: TOUCH_TARGET_SIZE,
                              height: TOUCH_TARGET_SIZE,
                              p: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'common.white',
                              bgcolor: alpha(theme.palette.common.black, 0.52),
                              border: '2px solid',
                              borderColor: 'background.paper',
                              boxShadow: 1,
                              transition: theme.transitions.create(['background-color', 'color'], {
                                duration: theme.transitions.duration.shorter,
                              }),
                              '&:hover': {
                                bgcolor: alpha(theme.palette.common.black, 0.68),
                                color: 'common.white',
                              },
                            }}
                          >
                            <Iconify icon={ic.closeLine} width={18} />
                          </IconButton>
                        )}
                        {coverUploading && (
                          <Box
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              zIndex: 4,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              bgcolor: alpha(theme.palette.common.black, 0.35),
                            }}
                          >
                            <CircularProgress size={36} sx={{ color: 'common.white' }} />
                          </Box>
                        )}
                      </Box>
                      {isOwner && (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => coverFileInputRef.current?.click()}
                          disabled={busy || coverUploading}
                          sx={dashboardMobileStretchButtonSx}
                        >
                          {t('pages.lists.cover_upload')}
                        </Button>
                      )}
                      {coverUploadError && (
                        <Alert
                          severity="error"
                          variant="outlined"
                          role="alert"
                          sx={{
                            py: 0.5,
                            px: 1,
                            width: 1,
                            '& .MuiAlert-message': { width: 1, textAlign: 'center' },
                          }}
                        >
                          {coverUploadError}
                        </Alert>
                      )}
                    </Stack>
                  </Box>
                  {isOwner && (
                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      justifyContent="flex-end"
                      sx={{ pt: 0.5 }}
                    >
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleSaveDetails}
                        loading={busyOp === 'details'}
                        disabled={busy}
                        sx={dashboardMobileStretchButtonSx}
                      >
                        {t('pages.lists.save_details')}
                      </Button>
                    </Stack>
                  )}
                </Stack>
              </Card>
            )}

            {manageTab === MANAGE_TAB_ACCESS && (
              <Stack {...dashboardPageSectionStackProps}>
                <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Stack {...dashboardSubsectionStackProps}>
                    <TextField
                      select
                      label={t('pages.lists.field_visibility')}
                      value={visibility}
                      onChange={(e) => setVisibility(e.target.value)}
                      disabled={!isOwner || busy}
                      fullWidth
                      SelectProps={{
                        renderValue: (v) => {
                          if (v === 'private')
                            return t('pages.lists.visibility_option_private_label');
                          if (v === 'public')
                            return t('pages.lists.visibility_option_public_label');
                          return t('pages.lists.visibility_option_public_subscribers_label');
                        },
                      }}
                    >
                      <MenuItem
                        value="private"
                        sx={{ alignItems: 'flex-start', py: 1.5, whiteSpace: 'normal' }}
                      >
                        <ListItemText
                          primary={t('pages.lists.visibility_option_private_label')}
                          secondary={t('pages.lists.visibility_option_private_description')}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                          secondaryTypographyProps={{
                            variant: 'caption',
                            color: 'text.secondary',
                          }}
                        />
                      </MenuItem>
                      <MenuItem
                        value="public"
                        sx={{ alignItems: 'flex-start', py: 1.5, whiteSpace: 'normal' }}
                      >
                        <ListItemText
                          primary={t('pages.lists.visibility_option_public_label')}
                          secondary={t('pages.lists.visibility_option_public_description')}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                          secondaryTypographyProps={{
                            variant: 'caption',
                            color: 'text.secondary',
                          }}
                        />
                      </MenuItem>
                      <MenuItem
                        value="public_subscribers"
                        disabled={ownerStripeChargesEnabled !== true}
                        sx={{ alignItems: 'flex-start', py: 1.5, whiteSpace: 'normal' }}
                      >
                        <ListItemText
                          primary={t('pages.lists.visibility_option_public_subscribers_label')}
                          secondary={t(
                            'pages.lists.visibility_option_public_subscribers_description'
                          )}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                          secondaryTypographyProps={{
                            variant: 'caption',
                            color: 'text.secondary',
                          }}
                        />
                      </MenuItem>
                    </TextField>
                    {isOwner && (
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        justifyContent="flex-end"
                        sx={{ pt: 0.5 }}
                      >
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={handleSaveVisibility}
                          loading={busyOp === 'visibility'}
                          disabled={busy}
                          sx={dashboardMobileStretchButtonSx}
                        >
                          {t('pages.lists.save_visibility')}
                        </Button>
                      </Stack>
                    )}
                    {accessSectionErrorText && (
                      <Alert severity="error" variant="outlined" role="alert">
                        {accessSectionErrorText}
                      </Alert>
                    )}
                  </Stack>
                </Card>

                {/* Paid access toggle — subscribers-only lists need a bundle price set */}
                {isOwner &&
                  data?.list?.visibility === 'public_subscribers' &&
                  ownerStripeChargesEnabled === true &&
                  !paidAccessEnabled && (
                    <Alert severity="info" sx={{ alignItems: 'flex-start' }}>
                      <Stack spacing={1.25}>
                        <Typography variant="body2">
                          <strong>{t('pages.lists.freemium_pricing_title')}</strong>{' '}
                          {bundlePriceCents
                            ? t('pages.lists.freemium_pricing_bundle_active', {
                                price: new Intl.NumberFormat(undefined, {
                                  style: 'currency',
                                  currency: (bundleCurrency || 'eur').toUpperCase(),
                                }).format(bundlePriceCents / 100),
                              })
                            : t('pages.lists.freemium_pricing_no_bundle')}
                        </Typography>
                        <Button
                          component={RouterLink}
                          href={paths.dashboard.settingsBilling}
                          variant="contained"
                          size="small"
                          sx={darkBillingCtaSx}
                        >
                          {t('pages.lists.paid_connect_billing_cta')}
                        </Button>
                      </Stack>
                    </Alert>
                  )}

                {isOwner && ownerStripeChargesEnabled !== true && (
                  <Alert severity="info" sx={{ alignItems: 'flex-start' }}>
                    <Stack spacing={1.25}>
                      <Typography variant="body2">
                        <strong>{t('pages.lists.visibility_public_billing_prompt_title')}</strong>{' '}
                        {t('pages.lists.visibility_public_billing_prompt')}
                      </Typography>
                      <Button
                        component={RouterLink}
                        href={paths.dashboard.settingsBilling}
                        variant="contained"
                        size="small"
                        sx={darkBillingCtaSx}
                      >
                        {t('pages.lists.paid_connect_billing_cta')}
                      </Button>
                    </Stack>
                  </Alert>
                )}
              </Stack>
            )}

            {manageTab === MANAGE_TAB_PLACES && (
              <Stack spacing={2}>
                {canEditItems && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Iconify icon={ic.googleMaps} width={18} />}
                    onClick={() => setGmapsImportOpen(true)}
                    sx={dashboardMobileStretchButtonSx}
                  >
                    {t('pages.lists.import_from_gmaps')}
                  </Button>
                )}
                {canEditItems && (
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                    <Stack spacing={1}>
                      <TextField
                        label={t('pages.lists.search_places')}
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                        fullWidth
                      />
                      {searchHits.length > 0 && (
                        <Card variant="outlined" sx={{ maxHeight: 200, overflow: 'auto' }}>
                          {searchHits.map((r) => (
                            <Button
                              key={r.id}
                              fullWidth
                              sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                              onClick={() => {
                                setSaveSheetRestaurantId(r.id);
                                setSaveSheetOpen(true);
                              }}
                              disabled={busy}
                            >
                              {r.name}
                              {r.address ? ` · ${r.address}` : ''}
                            </Button>
                          ))}
                        </Card>
                      )}
                    </Stack>
                  </Card>
                )}
                {items.length === 0 ? (
                  <Box
                    sx={{
                      mt: 0.5,
                      py: { xs: 3, sm: 4 },
                      px: 2,
                      width: 1,
                      textAlign: 'center',
                      borderRadius: 2,
                      bgcolor: (muiTheme) => alpha(muiTheme.palette.grey[500], 0.06),
                      border: (muiTheme) => `1px dashed ${muiTheme.palette.divider}`,
                    }}
                  >
                    <Iconify
                      icon={ic.mapPointBold}
                      width={36}
                      sx={{
                        color: (muiTheme) => alpha(muiTheme.palette.primary.main, 0.4),
                        mb: 1.5,
                        display: 'block',
                        mx: 'auto',
                      }}
                    />
                    <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {t('pages.lists.no_places')}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.disabled"
                      sx={{ mt: 0.75, maxWidth: 280, mx: 'auto' }}
                    >
                      {t('pages.lists.no_places_hint')}
                    </Typography>
                  </Box>
                ) : (
                  <Stack spacing={1}>
                    {listHasMultiplePlaces ? (
                      <Box sx={{ pt: SPACE.sm }}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <MapSheetSortMenu
                            sortMode={listSortMode}
                            onSortModeChange={handleListSortChange}
                          />
                        </Box>
                        {listSortLocationError ? (
                          <Alert
                            severity="warning"
                            onClose={() => setListSortLocationError(false)}
                            sx={{ mt: 1 }}
                          >
                            {t('pages.lists.sort_location_error')}
                          </Alert>
                        ) : null}
                      </Box>
                    ) : null}
                    <List
                      dense
                      disablePadding
                      aria-label={t('pages.dashboard.map.sheet_list_aria')}
                      sx={{ mx: -0.5 }}
                    >
                      {sortedPlacesItems.map((row) => {
                        if (!row.restaurants) return null;
                        const placeRow = mapPlaceFromListRestaurant(row.restaurants);
                        if (!placeRow) return null;
                        const mapsUrl = mapPlaceMapsUrl(placeRow);
                        const phoneCall = mapPlaceTelHref(placeRow);
                        const rowListIds = savedListIdsByRestaurant[String(placeRow.id)] ?? [];
                        const isSaved = Array.isArray(rowListIds) && rowListIds.length > 0;
                        const ratingVal = mapPlaceNumericRating(placeRow);
                        const chipLabels = mapPlaceTagLabelsCapped(placeRow, t, tagCatalog, {
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
                        const followingOwners =
                          followingOwnersByRestaurant[String(placeRow.id)] ?? [];
                        const removeLoading = busyOp === `remove-place:${row.restaurant_id}`;
                        return (
                          <MapSpotSheetListRow
                            key={row.id}
                            row={placeRow}
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
                            userId={user?.id ?? null}
                            viewerAvatarUrl={viewerAvatarUrl}
                            viewerDisplayName={viewerDisplayName}
                            onSelectSpot={handleListPlaceRowSelect}
                            onListSave={(id) => {
                              setSaveSheetRestaurantId(id);
                              setSaveSheetOpen(true);
                            }}
                            onShareRow={handleListPlaceShare}
                            onRemove={
                              canEditItems ? () => handleRemovePlace(row.restaurant_id) : undefined
                            }
                            removeLoading={removeLoading}
                            listRowActionBtnSx={listRowActionBtnSx}
                            restaurantAnalytics={restaurantAnalytics}
                            t={t}
                          />
                        );
                      })}
                    </List>
                  </Stack>
                )}
              </Stack>
            )}

            {manageTab === MANAGE_TAB_PEOPLE && (
              <Card variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                {peopleSectionErrorText ? (
                  <Alert severity="error" variant="outlined" role="alert" sx={{ mb: 2 }}>
                    {peopleSectionErrorText}
                  </Alert>
                ) : null}
                {canInvite && (
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
                    <TextField
                      fullWidth
                      label={t('pages.lists.invite_username')}
                      value={inviteUser}
                      onChange={(e) => {
                        setInviteUser(e.target.value);
                        setPeopleSectionError(null);
                      }}
                      placeholder="@handle"
                      disabled={busy}
                    />
                    <TextField
                      select
                      fullWidth
                      label={t('pages.lists.role')}
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      sx={{ minWidth: { sm: 120 } }}
                    >
                      <MenuItem value="viewer">{t('pages.lists.role_viewer')}</MenuItem>
                      <MenuItem value="editor">{t('pages.lists.role_editor')}</MenuItem>
                    </TextField>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={handleInvite}
                      loading={busyOp === 'invite'}
                      disabled={busy}
                      sx={dashboardMobileStretchButtonSx}
                    >
                      {t('pages.lists.invite')}
                    </Button>
                  </Stack>
                )}
                {(isOwner || canEditItems) && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    sx={{ mb: 1 }}
                  >
                    {t('pages.lists.invite_hint')}
                  </Typography>
                )}
                <Stack spacing={1.5}>
                  {listOwner ? (
                    <Card variant="outlined" sx={{ p: 1.5 }}>
                      <Stack
                        direction={{ xs: 'column', sm: 'row' }}
                        spacing={1}
                        alignItems={{ sm: 'center' }}
                        justifyContent="space-between"
                      >
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {listOwner.users?.display_name ||
                              listOwner.users?.username ||
                              listOwner.user_id}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" component="div">
                            {(() => {
                              const uname =
                                listOwner.users?.username != null
                                  ? String(listOwner.users.username).trim().replace(/^@/, '')
                                  : '';
                              if (!uname) {
                                return (
                                  <>
                                    @— · {memberStatusLabel('active')} ·{' '}
                                    {t('pages.lists.role_owner')}
                                  </>
                                );
                              }
                              return (
                                <>
                                  <Link
                                    component={RouterLink}
                                    href={paths.dashboard.userPublic(uname)}
                                    underline="hover"
                                    color="primary"
                                    sx={{ fontWeight: 700 }}
                                  >
                                    @{uname}
                                  </Link>
                                  {` · ${memberStatusLabel('active')} · ${t('pages.lists.role_owner')}`}
                                </>
                              );
                            })()}
                          </Typography>
                        </Box>
                      </Stack>
                    </Card>
                  ) : null}
                  {members.map((m) => {
                    const rowRole = optimisticRoles[m.user_id] ?? m.role;
                    return (
                      <Card key={m.user_id} variant="outlined" sx={{ p: 1.5 }}>
                        <Stack
                          direction={{ xs: 'column', sm: 'row' }}
                          spacing={1}
                          alignItems={{ sm: 'center' }}
                          justifyContent="space-between"
                        >
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {m.users?.display_name || m.users?.username || m.user_id}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" component="div">
                              {(() => {
                                const uname =
                                  m.users?.username != null
                                    ? String(m.users.username).trim().replace(/^@/, '')
                                    : '';
                                if (!uname) {
                                  return (
                                    <>
                                      @— · {memberStatusLabel(m.status)} ·{' '}
                                      {memberRoleLabel(rowRole)}
                                    </>
                                  );
                                }
                                return (
                                  <>
                                    <Link
                                      component={RouterLink}
                                      href={paths.dashboard.userPublic(uname)}
                                      underline="hover"
                                      color="primary"
                                      sx={{ fontWeight: 700 }}
                                    >
                                      @{uname}
                                    </Link>
                                    {` · ${memberStatusLabel(m.status)} · ${memberRoleLabel(rowRole)}`}
                                  </>
                                );
                              })()}
                            </Typography>
                          </Box>
                          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                            {m.status === 'pending_request' && canModerate && (
                              <>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="primary"
                                  onClick={() => handleApprove(m.user_id, 'viewer')}
                                  loading={busyOp === `approve:${m.user_id}`}
                                  disabled={busy}
                                >
                                  {t('pages.lists.approve')}
                                </Button>
                                <Button
                                  size="small"
                                  color="inherit"
                                  onClick={() => handleReject(m.user_id)}
                                  loading={busyOp === `reject:${m.user_id}`}
                                  disabled={busy}
                                >
                                  {t('pages.lists.reject')}
                                </Button>
                              </>
                            )}
                            {m.status === 'active' &&
                              isOwner &&
                              (() => {
                                const isRoleUpdating = busyOp === `role:${m.user_id}`;
                                const displayRole = optimisticRoles[m.user_id] ?? m.role;
                                const roleFieldDisabled = busy && !isRoleUpdating;

                                if (isRoleUpdating) {
                                  return (
                                    <TextField
                                      size="small"
                                      label={t('pages.lists.role')}
                                      value={memberRoleLabel(displayRole)}
                                      sx={{ minWidth: 120 }}
                                      slotProps={{
                                        input: {
                                          readOnly: true,
                                          endAdornment: (
                                            <InputAdornment position="end">
                                              <CircularProgress size={18} thickness={5} />
                                            </InputAdornment>
                                          ),
                                        },
                                      }}
                                    />
                                  );
                                }

                                return (
                                  <TextField
                                    select
                                    size="small"
                                    label={t('pages.lists.role')}
                                    value={displayRole}
                                    onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                                    disabled={roleFieldDisabled}
                                    sx={{ minWidth: 120 }}
                                  >
                                    <MenuItem value="viewer">
                                      {t('pages.lists.role_viewer')}
                                    </MenuItem>
                                    <MenuItem value="editor">
                                      {t('pages.lists.role_editor')}
                                    </MenuItem>
                                  </TextField>
                                );
                              })()}
                            {m.status === 'active' && !isOwner && canEditItems && (
                              <Chip
                                size="small"
                                label={memberRoleLabel(rowRole)}
                                variant="outlined"
                              />
                            )}
                            {showRemoveForMemberRow(m) && (
                              <Button
                                size="small"
                                color="error"
                                onClick={() => setRemoveMemberUserId(m.user_id)}
                                disabled={busy}
                              >
                                {t('pages.lists.remove')}
                              </Button>
                            )}
                          </Stack>
                        </Stack>
                      </Card>
                    );
                  })}
                  {members.length === 0 && !listOwner && (
                    <Typography variant="body2" color="text.secondary">
                      {t('pages.lists.no_members')}
                    </Typography>
                  )}
                </Stack>
              </Card>
            )}

            {manageTab === MANAGE_TAB_DELETE && isOwner && (
              <Stack {...dashboardSubsectionStackProps}>
                <Typography
                  variant="body2"
                  sx={{ color: 'text.secondary', lineHeight: 1.55, px: 0.5 }}
                >
                  {t('pages.lists.delete_list_description')}
                </Typography>

                <Box sx={hubCardShellSx(theme)}>
                  <CardActionArea
                    data-testid="e2e-list-delete-open"
                    component="button"
                    type="button"
                    disabled={busy || deletingList}
                    onClick={() => setDeleteOpen(true)}
                    sx={{
                      px: 2,
                      py: 2.25,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 2,
                      minHeight: HUB_ROW_MIN_HEIGHT,
                      borderRadius: ROUNDED_CARD,
                      bgcolor: 'transparent',
                      WebkitTapHighlightColor: 'transparent',
                      width: '100%',
                      textAlign: 'left',
                      transition: theme.transitions.create(['background-color', 'transform'], {
                        duration: theme.transitions.duration.shorter,
                      }),
                      '&:hover': {
                        bgcolor: rowHoverBg,
                      },
                      '&:hover .list-delete-chevron': {
                        transform: 'translateX(4px)',
                      },
                      '&:active': {
                        bgcolor: rowHoverBg,
                      },
                      '&:active .list-delete-chevron': {
                        transform: 'translateX(4px)',
                      },
                      '&.Mui-disabled': {
                        opacity: 0.55,
                      },
                    }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={2}
                      sx={{ minWidth: 0, flex: 1 }}
                    >
                      <Box
                        sx={{
                          width: ICON_TILE,
                          height: ICON_TILE,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: alpha(theme.palette.error.main, 0.12),
                          color: 'error.main',
                          flexShrink: 0,
                        }}
                      >
                        <Iconify icon={ic.trashLinear} width={SHELL_HUB_ICON} />
                      </Box>
                      <Typography
                        variant="body2"
                        sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'error.main' }}
                      >
                        {t('pages.lists.delete_list_row_label')}
                      </Typography>
                    </Stack>
                    <Iconify
                      icon={ic.chevronRightLinear}
                      width={SHELL_HUB_ICON}
                      className="list-delete-chevron"
                      sx={{
                        color: 'text.secondary',
                        flexShrink: 0,
                        transition: theme.transitions.create('transform', {
                          duration: theme.transitions.duration.standard,
                        }),
                      }}
                    />
                  </CardActionArea>
                </Box>
              </Stack>
            )}
          </Stack>
        </Box>
      </SettingsDrillShell>
      <SaveToListSheet
        open={saveSheetOpen}
        onClose={() => setSaveSheetOpen(false)}
        restaurantId={saveSheetRestaurantId}
        onApplied={handleSaveSheetAppliedFromManage}
        defaultSelectedListId={listId}
        myUserId={user?.id ?? null}
      />
      <GoogleMapsImportModal
        open={gmapsImportOpen}
        onClose={() => {
          setGmapsImportOpen(false);
          refresh();
        }}
        listId={listId}
      />
      <ShareFeedbackSnackbar
        feedback={shareFeedback}
        onClose={dismissShareFeedback}
        /* Clear the fixed mobile bottom nav. */
        sx={{ bottom: { xs: NAV.H_MOBILE_BOTTOM + 16, md: 24 } }}
      />
    </>
  );
}

ListManageView.propTypes = {
  listId: PropTypes.string.isRequired,
  isOwner: PropTypes.bool,
  canEditItems: PropTypes.bool,
  initial: PropTypes.object,
};
