'use client';

import PropTypes from 'prop-types';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import { useRef, useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import InputAdornment from '@mui/material/InputAdornment';
import CircularProgress from '@mui/material/CircularProgress';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';
import { useAuthContext } from 'src/auth/hooks';
import { useMyProfile } from 'src/api/my-profile';
import { readableAccent } from 'src/theme/readable-accent';
import { updateMyProfile } from 'src/auth/actions/profile-actions';
import { useAnalytics } from 'src/libs/analytics/analytics-provider';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

import Iconify from 'src/components/iconify';

import SettingsDrillShell from './view/settings-drill-shell';
import {
  TOUCH_MIN,
  HUB_ROW_MIN_HEIGHT,
  dashboardSubsectionStackProps,
  dashboardPageSectionStackProps,
  SETTINGS_DRILL_END_ACTION_PAD_X,
} from './view/settings-shell-shared';

// ----------------------------------------------------------------------

function profileToState(profile) {
  return {
    displayName: profile?.display_name ?? profile?.auth_full_name ?? '',
    username: profile?.username ?? '',
    bio: profile?.bio ?? '',
    avatarUrl: profile?.avatar_url ?? '',
    socialInstagram: profile?.social_instagram ?? '',
    socialTiktok: profile?.social_tiktok ?? '',
    socialYoutube: profile?.social_youtube ?? '',
    socialWebsite: profile?.social_website ?? '',
  };
}

export default function SettingsEditForm({
  user,
  initialProfile,
  cancelHref = paths.dashboard.discover,
}) {
  const theme = useTheme();
  const { t } = useTranslate();
  const { supabase } = useAuthContext();
  const { trackEvent } = useAnalytics();
  const fileInputRef = useRef(null);

  const editSkeletonTheme = useSkeletonThemeColors();

  const hasInitialProfile = Boolean(initialProfile);
  const { mutate: mutateMyProfile } = useMyProfile({
    fallbackData: hasInitialProfile ? { profile: initialProfile } : undefined,
  });
  const [loading, setLoading] = useState(!hasInitialProfile);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState(() => profileToState(initialProfile).displayName);
  const [username, setUsername] = useState(() => profileToState(initialProfile).username);
  const [bio, setBio] = useState(() => profileToState(initialProfile).bio);
  const [avatarUrl, setAvatarUrl] = useState(() => profileToState(initialProfile).avatarUrl);
  const [socialInstagram, setSocialInstagram] = useState(
    () => profileToState(initialProfile).socialInstagram
  );
  const [socialTiktok, setSocialTiktok] = useState(
    () => profileToState(initialProfile).socialTiktok
  );
  const [socialYoutube, setSocialYoutube] = useState(
    () => profileToState(initialProfile).socialYoutube
  );
  const [socialWebsite, setSocialWebsite] = useState(
    () => profileToState(initialProfile).socialWebsite
  );
  const [photoUploadError, setPhotoUploadError] = useState(null);
  const [photoUploadSuccess, setPhotoUploadSuccess] = useState(false);
  const [usernameError, setUsernameError] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [saveError, setSaveError] = useState(null);

  const load = useCallback(
    async (options = {}) => {
      const { showLoading = true } = options;
      if (showLoading) setLoading(true);
      try {
        const result = await mutateMyProfile();
        const profile = result?.profile;
        const error = result?.error;
        if (error || !profile) {
          setLoadError(error || t('pages.dashboard.settings.edit.load_error'));
          return;
        }
        const state = profileToState(profile);
        setLoadError(null);
        setDisplayName(state.displayName);
        setUsername(state.username);
        setBio(state.bio);
        setAvatarUrl(state.avatarUrl);
        setSocialInstagram(state.socialInstagram);
        setSocialTiktok(state.socialTiktok);
        setSocialYoutube(state.socialYoutube);
        setSocialWebsite(state.socialWebsite);
        setPhotoUploadError(null);
        setUsernameError(null);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [mutateMyProfile, t]
  );

  useEffect(() => {
    if (hasInitialProfile) return;
    load();
  }, [hasInitialProfile, load]);

  useEffect(() => {
    if (!photoUploadSuccess) return undefined;
    const id = window.setTimeout(() => setPhotoUploadSuccess(false), 2600);
    return () => window.clearTimeout(id);
  }, [photoUploadSuccess]);

  const displayAvatarSrc = avatarUrl.trim() ? avatarUrl : undefined;

  const avatarInitials = useMemo(() => {
    const n = displayName.trim();
    if (n) {
      const parts = n.split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return n.slice(0, 2).toUpperCase();
    }
    const email = typeof user?.email === 'string' ? user.email.trim() : '';
    if (email) return email[0].toUpperCase();
    return '?';
  }, [displayName, user?.email]);

  const handleRemovePhoto = useCallback(() => {
    setAvatarUrl('');
    setPhotoUploadError(null);
    setPhotoUploadSuccess(false);
    trackEvent('avatar_removed');
  }, [trackEvent]);

  const handlePhotoChange = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      if (!file || !supabase || !user?.id) return;

      setPhotoUploadError(null);
      setPhotoUploadSuccess(false);

      const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5 MB
      if (file.size > MAX_AVATAR_BYTES) {
        setPhotoUploadError(t('pages.dashboard.settings.edit.upload_error'));
        trackEvent('avatar_upload_failed', { reason: 'too_large' });
        if (event.target) event.target.value = '';
        return;
      }

      const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
      if (!ALLOWED_TYPES.has(file.type)) {
        setPhotoUploadError(t('pages.dashboard.settings.edit.upload_error'));
        trackEvent('avatar_upload_failed', { reason: 'invalid_type' });
        if (event.target) event.target.value = '';
        return;
      }

      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) {
        setPhotoUploadError(t('pages.dashboard.settings.edit.upload_error'));
        trackEvent('avatar_upload_failed', { reason: 'no_session' });
        if (event.target) event.target.value = '';
        return;
      }
      // Unique path (no upsert): `upsert: true` has failed RLS on a first insert
      // even when the folder matches auth.uid() — same pattern as list covers.
      const path = `${uid}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
        upsert: false,
        contentType: file.type || undefined,
      });

      if (event.target) {
        event.target.value = '';
      }

      if (upErr) {
        setPhotoUploadError(upErr.message || t('pages.dashboard.settings.edit.upload_error'));
        trackEvent('avatar_upload_failed', { reason: 'storage_error' });
        return;
      }

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path);
      if (pub?.publicUrl) {
        setAvatarUrl(pub.publicUrl);
        setPhotoUploadSuccess(true);
        trackEvent('avatar_uploaded');
      } else {
        setPhotoUploadError(t('pages.dashboard.settings.edit.upload_error'));
        trackEvent('avatar_upload_failed', { reason: 'no_public_url' });
      }
    },
    [supabase, t, user?.id, trackEvent]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const result = await updateMyProfile({
        displayName,
        username,
        bio,
        avatarUrl,
        socialInstagram,
        socialTiktok,
        socialYoutube,
        socialWebsite,
      });
      if (result.usernameTaken) {
        setUsernameError(t('pages.dashboard.settings.edit.username_taken'));
        trackEvent('profile_update_failed', { reason: 'username_taken' });
        return;
      }
      if (result.usernameInvalid) {
        setUsernameError(t('pages.dashboard.settings.edit.username_invalid'));
        trackEvent('profile_update_failed', { reason: 'username_invalid' });
        return;
      }
      if (result.error) {
        setSaveError(result.error);
        trackEvent('profile_update_failed', { reason: 'server_error' });
        return;
      }
      setUsernameError(null);
      trackEvent('profile_updated');
      await load({ showLoading: false });
    } finally {
      setSaving(false);
    }
  }, [
    avatarUrl,
    bio,
    displayName,
    load,
    socialInstagram,
    socialTiktok,
    socialWebsite,
    socialYoutube,
    t,
    trackEvent,
    username,
  ]);

  const trimmedHandle = username.trim();
  const canViewPublicProfile = /^[a-z0-9_]{3,30}$/.test(trimmedHandle);

  const doneButton = (
    <Button
      data-testid="e2e-profile-save"
      onClick={handleSave}
      disabled={saving || loading}
      color="primary"
      aria-busy={saving}
      aria-label={
        saving ? t('pages.dashboard.settings.edit.saving') : t('pages.dashboard.settings.edit.done')
      }
      sx={{
        fontWeight: 700,
        minHeight: TOUCH_MIN,
        boxSizing: 'border-box',
        textTransform: 'none',
        WebkitTapHighlightColor: 'transparent',
        lineHeight: 1,
        justifyContent: 'center',
        // Match back chevron: text = intrinsic width + same 12px inset as 20px icon in 44px hit area;
        // spinner = 44×44 like IconButton (shell keeps a wide grid track so title does not jump).
        ...(saving
          ? { minWidth: TOUCH_MIN, width: TOUCH_MIN, px: 0, py: 0 }
          : { minWidth: 0, px: `${SETTINGS_DRILL_END_ACTION_PAD_X}px`, py: 0 }),
      }}
    >
      {saving ? (
        <CircularProgress color="inherit" size={20} />
      ) : (
        t('pages.dashboard.settings.edit.done')
      )}
    </Button>
  );

  return (
    <SettingsDrillShell
      title={t('pages.dashboard.settings.edit.heading')}
      backHref={cancelHref}
      backAriaLabel={t('pages.dashboard.settings.back_to_hub')}
      endAdornment={doneButton}
    >
      <Stack
        {...dashboardPageSectionStackProps}
        sx={{
          maxWidth: '100%',
          overflowX: 'hidden',
          WebkitTapHighlightColor: 'transparent',
          mx: { xs: -0.5, sm: 0 },
        }}
      >
        {loading ? (
          <SkeletonTheme
            baseColor={editSkeletonTheme.baseColor}
            highlightColor={editSkeletonTheme.highlightColor}
          >
            <Stack
              {...dashboardPageSectionStackProps}
              alignItems="stretch"
              aria-busy="true"
              sx={{ width: 1, py: { xs: 1, sm: 2 } }}
            >
              <Stack alignItems="center" spacing={2}>
                <Skeleton circle width={120} height={120} />
                <Skeleton width={180} height={40} borderRadius={2} />
              </Stack>

              <Stack {...dashboardSubsectionStackProps}>
                <Skeleton width={72} height={12} borderRadius={1} />
                <Skeleton height={56} borderRadius={12} />
                <Skeleton width={88} height={12} borderRadius={1} />
                <Skeleton height={56} borderRadius={12} />
                <Skeleton width="64%" height={18} borderRadius={6} />
                <Skeleton width={56} height={12} borderRadius={1} />
                <Skeleton height={100} borderRadius={12} />
              </Stack>

              <Stack {...dashboardSubsectionStackProps}>
                <Skeleton width={96} height={12} borderRadius={1} />
                {[0, 1, 2, 3].map((key) => (
                  <Stack
                    key={key}
                    direction="row"
                    alignItems="center"
                    spacing={2}
                    sx={{
                      bgcolor: 'action.hover',
                      borderRadius: 3,
                      p: 1.5,
                      minHeight: HUB_ROW_MIN_HEIGHT,
                    }}
                  >
                    <Skeleton width={TOUCH_MIN} height={TOUCH_MIN} borderRadius={8} />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Skeleton height={20} borderRadius={4} />
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </SkeletonTheme>
        ) : (
          <>
            {loadError ? (
              <Alert severity="error" variant="outlined" role="alert">
                {loadError}
              </Alert>
            ) : null}
            <Stack alignItems="center" spacing={2} sx={{ py: { xs: 1, sm: 2 } }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={handlePhotoChange}
              />
              <Box
                sx={{
                  position: 'relative',
                  cursor: 'pointer',
                  '&:hover .avatar-overlay': { opacity: photoUploadSuccess ? 0 : 1 },
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Box
                  sx={{
                    p: '4px',
                    borderRadius: '50%',
                    bgcolor: alpha(
                      theme.palette.primary.main,
                      theme.palette.mode === 'light' ? 0.22 : 0.42
                    ),
                  }}
                >
                  <Avatar
                    src={displayAvatarSrc}
                    alt=""
                    sx={{
                      width: 112,
                      height: 112,
                      border: '4px solid',
                      borderColor: 'background.paper',
                      fontSize: '2.25rem',
                      fontWeight: 700,
                    }}
                  >
                    {avatarInitials}
                  </Avatar>
                </Box>
                <Box
                  className="avatar-overlay"
                  sx={{
                    position: 'absolute',
                    inset: 4,
                    borderRadius: '50%',
                    bgcolor: alpha(theme.palette.common.black, 0.45),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                  }}
                >
                  <Iconify icon={ic.cameraBold} width={36} sx={{ color: 'common.white' }} />
                </Box>
                {photoUploadSuccess && (
                  <Box
                    sx={{
                      position: 'absolute',
                      right: 2,
                      bottom: 2,
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      bgcolor: 'success.main',
                      border: '3px solid',
                      borderColor: 'background.paper',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: 2,
                      zIndex: 2,
                      pointerEvents: 'none',
                    }}
                  >
                    <Iconify icon={ic.checkCircleBold} width={22} sx={{ color: 'common.white' }} />
                  </Box>
                )}
                {Boolean(avatarUrl.trim()) && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePhoto();
                    }}
                    aria-label={t('pages.dashboard.settings.edit.remove_photo')}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      zIndex: 3,
                      minWidth: TOUCH_MIN,
                      minHeight: TOUCH_MIN,
                      width: TOUCH_MIN,
                      height: TOUCH_MIN,
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
              </Box>
              <Stack alignItems="center" spacing={0} sx={{ width: '100%', maxWidth: 320 }}>
                <Button
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                  sx={{
                    color: readableAccent(theme),
                    fontWeight: 700,
                    textTransform: 'none',
                    minHeight: TOUCH_MIN,
                    px: 2,
                    width: { xs: '100%', sm: 'auto' },
                  }}
                >
                  {t('pages.dashboard.settings.edit.change_photo')}
                </Button>
                {photoUploadError && (
                  <Alert
                    severity="error"
                    variant="outlined"
                    role="alert"
                    sx={{
                      mt: { xs: 1.5, sm: 2 },
                      py: 0.5,
                      px: 1,
                      width: 1,
                      '& .MuiAlert-message': { width: 1, textAlign: 'center' },
                    }}
                  >
                    {photoUploadError}
                  </Alert>
                )}
              </Stack>
            </Stack>

            {saveError ? (
              <Alert
                severity="error"
                variant="outlined"
                role="alert"
                onClose={() => setSaveError(null)}
              >
                {saveError}
              </Alert>
            ) : null}

            <Stack {...dashboardSubsectionStackProps}>
              <FieldLabel>{t('pages.dashboard.settings.edit.name')}</FieldLabel>
              <TextField
                fullWidth
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('pages.dashboard.settings.edit.name_placeholder')}
                sx={fieldSx}
              />
              <FieldLabel>{t('pages.dashboard.settings.edit.username')}</FieldLabel>
              <TextField
                fullWidth
                value={username}
                onChange={(e) => {
                  setUsernameError(null);
                  setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase());
                }}
                placeholder={t('pages.dashboard.settings.edit.username_placeholder')}
                error={Boolean(usernameError)}
                helperText={usernameError ?? undefined}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Typography fontWeight={700} color="text.secondary">
                          @
                        </Typography>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={fieldSx}
              />
              {canViewPublicProfile ? (
                <Button
                  component={RouterLink}
                  href={`${paths.dashboard.root}/u/${trimmedHandle}`}
                  variant="outlined"
                  color="primary"
                  fullWidth
                  startIcon={<Iconify icon={ic.userCircleLinear} width={22} />}
                  sx={{
                    borderRadius: 3,
                    fontWeight: 700,
                    textTransform: 'none',
                    minHeight: TOUCH_MIN,
                    borderWidth: 2,
                    '&:hover': { borderWidth: 2 },
                  }}
                >
                  {t('pages.dashboard.settings.edit.view_public_profile')}
                </Button>
              ) : (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ px: 0.5, display: 'block' }}
                >
                  {t('pages.dashboard.settings.edit.public_profile_hint')}
                </Typography>
              )}
              <FieldLabel>{t('pages.dashboard.settings.edit.bio')}</FieldLabel>
              <TextField
                fullWidth
                multiline
                minRows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t('pages.dashboard.settings.edit.bio_placeholder')}
                sx={fieldSx}
                inputProps={{ 'data-testid': 'e2e-profile-bio' }}
              />
            </Stack>

            <Stack {...dashboardSubsectionStackProps}>
              <FieldLabel>{t('pages.dashboard.settings.edit.social_title')}</FieldLabel>
              <SocialRow
                icon={ic.instagram}
                value={socialInstagram}
                onChange={setSocialInstagram}
                placeholder={t('pages.dashboard.settings.edit.instagram_ph')}
              />
              <SocialRow
                icon={ic.tiktok}
                value={socialTiktok}
                onChange={setSocialTiktok}
                placeholder={t('pages.dashboard.settings.edit.tiktok_ph')}
              />
              <SocialRow
                icon={ic.youtube}
                value={socialYoutube}
                onChange={setSocialYoutube}
                placeholder={t('pages.dashboard.settings.edit.youtube_ph')}
              />
              <SocialRow
                icon={ic.globeLinear}
                value={socialWebsite}
                onChange={setSocialWebsite}
                placeholder={t('pages.dashboard.settings.edit.website_ph')}
              />
            </Stack>
          </>
        )}
      </Stack>
    </SettingsDrillShell>
  );
}

SettingsEditForm.propTypes = {
  user: PropTypes.object,
  initialProfile: PropTypes.object,
  cancelHref: PropTypes.string,
};

// ----------------------------------------------------------------------

function FieldLabel({ children }) {
  return (
    <Typography
      variant="caption"
      sx={{
        fontWeight: 700,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'text.secondary',
        px: 0.5,
      }}
    >
      {children}
    </Typography>
  );
}

FieldLabel.propTypes = {
  children: PropTypes.node,
};

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: 3,
    bgcolor: 'action.hover',
    '& fieldset': { border: 'none' },
  },
  '& .MuiOutlinedInput-input': {
    py: { xs: 2, sm: 2 },
    px: { xs: 2.5, sm: 2.5 },
    // 16px minimum on mobile — avoids iOS zoom on focus
    fontSize: '1rem',
    fontWeight: 500,
  },
};

function SocialRow({ icon, value, onChange, placeholder }) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={2}
      sx={{ bgcolor: 'action.hover', borderRadius: 3, p: 1.5, minHeight: HUB_ROW_MIN_HEIGHT }}
    >
      <Box
        sx={{
          width: TOUCH_MIN,
          height: TOUCH_MIN,
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.paper',
          boxShadow: 1,
        }}
      >
        <Iconify icon={icon} width={20} />
      </Box>
      <TextField
        fullWidth
        variant="standard"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        InputProps={{ disableUnderline: true }}
        sx={{
          '& .MuiInputBase-input': {
            fontWeight: 500,
            fontSize: '1rem',
          },
        }}
      />
    </Stack>
  );
}

SocialRow.propTypes = {
  icon: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string.isRequired,
};
