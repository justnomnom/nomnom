'use client';

import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';

import { usePrefersReducedMotion } from 'src/hooks/use-prefers-reduced-motion';

import { ic } from 'src/assets/icons';

import Iconify from 'src/components/iconify';
import RemoteCoverImage from 'src/components/image/remote-cover-image';

import {
  listHubOwnerPrefix,
  listVisibilityIcon,
  listSpotsVisibilitySubtitle,
  NOM_NOM_LIST_COMPACT_THUMB_PX,
} from './nom-nom-list-tile-helpers';

export {
  listHubOwnerPrefix,
  listVisibilityIcon,
  listSpotsVisibilitySubtitle,
  NOM_NOM_LIST_COMPACT_THUMB_PX,
};

// ----------------------------------------------------------------------
// Shared surface sx — landscape row only (compact uses inline styling below)
// ----------------------------------------------------------------------

const FOCUS_VISIBLE_OUTLINE_SX = (theme) => ({
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
});

function listCoverEmptyGradient(primary) {
  return `linear-gradient(165deg, ${alpha(primary, 0.14)} 0%, ${alpha(primary, 0.06)} 52%, ${alpha(primary, 0.22)} 100%)`;
}

export function getNomNomListTileSurfaceSx(theme, { selected, reduceMotion = false }) {
  return {
    width: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    p: 2,
    borderRadius: '24px',
    textAlign: 'left',
    cursor: 'pointer',
    border: '1px solid',
    borderColor: alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.55 : 1),
    bgcolor: 'background.paper',
    transition: reduceMotion ? 'border-color 0.2s' : 'border-color 0.2s, transform 0.15s',
    WebkitTapHighlightColor: 'transparent',
    ...FOCUS_VISIBLE_OUTLINE_SX(theme),
    ...(reduceMotion ? {} : { '&:active': { transform: 'scale(0.98)' } }),
    ...(selected
      ? {}
      : {
          '&:hover': {
            borderColor: alpha(theme.palette.primary.main, 0.35),
          },
        }),
  };
}

// ----------------------------------------------------------------------
// Compact (portrait) card — saved/lists hub + profile carousel
// ----------------------------------------------------------------------

const COMPACT_THUMB_PX = NOM_NOM_LIST_COMPACT_THUMB_PX;

/** Ring + square thumbnail, matching the profile page portrait card. */
function CompactThumb({ list, theme }) {
  const primary = theme.palette.primary.main;
  const ringBg = alpha(primary, theme.palette.mode === 'light' ? 0.22 : 0.42);
  const innerBg = alpha(theme.palette.text.primary, theme.palette.mode === 'light' ? 0.05 : 0.08);

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
      <Box sx={{ p: '3px', borderRadius: 2, bgcolor: ringBg }}>
        <Box
          sx={{
            position: 'relative',
            width: COMPACT_THUMB_PX,
            height: COMPACT_THUMB_PX,
            borderRadius: 2,
            overflow: 'hidden',
            border: '2px solid',
            borderColor: 'background.paper',
            bgcolor: innerBg,
          }}
        >
          {list.cover_image_url ? (
            <Box sx={{ position: 'absolute', inset: 0 }}>
              <RemoteCoverImage
                src={list.cover_image_url}
                alt={list.name}
                fill
                sizes="(max-width: 600px) 45vw, 180px"
              />
            </Box>
          ) : (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background: listCoverEmptyGradient(primary),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Iconify icon={ic.bookmarkBold} width={32} sx={{ color: alpha(primary, 0.45) }} />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

CompactThumb.propTypes = {
  list: PropTypes.object.isRequired,
  theme: PropTypes.object.isRequired,
};

/** Compact card surface sx — portrait, matching profile page style. */
function compactCardSx(theme, { reduceMotion = false } = {}) {
  return {
    width: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    p: 0,
    borderRadius: '20px',
    textAlign: 'center',
    cursor: 'pointer',
    border: 'none',
    bgcolor: 'transparent',
    transition: reduceMotion ? undefined : 'transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
    position: 'relative',
    WebkitTapHighlightColor: 'transparent',
    ...FOCUS_VISIBLE_OUTLINE_SX(theme),
    ...(reduceMotion
      ? {}
      : {
          '&:active': { transform: 'scale(0.98)' },
          // Pointer-only lift so touch devices don't get sticky hover state after a tap.
          '@media (hover: hover) and (pointer: fine)': {
            '&:hover': { transform: 'translateY(-2px)' },
          },
        }),
  };
}

const COMPACT_CAPTION_SX = {
  fontWeight: 600,
  color: 'text.secondary',
  display: 'block',
  textAlign: 'center',
  fontSize: '0.65rem',
  lineHeight: 1.35,
  px: 0.5,
  minWidth: 0,
  width: 1,
};

/**
 * Name + metadata for compact portrait cards (2-col grids).
 * Owner / pending lines and spot count each get their own row so long titles
 * never push "by …" or "N spots" out of view.
 */
function CompactText({ name, spotsLabel, ownerLabel, pendingLabel, visIcon, combinedSubtitle }) {
  const hasStructuredMeta = Boolean(spotsLabel || ownerLabel || pendingLabel);
  const useCombined = Boolean(combinedSubtitle) && !hasStructuredMeta;
  const reserveMetaRows = hasStructuredMeta || useCombined;
  const ownerLine =
    pendingLabel && ownerLabel
      ? `${pendingLabel} · ${ownerLabel}`
      : pendingLabel || ownerLabel || null;

  return (
    <Box sx={{ px: 0.5, minWidth: 0, width: 1 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          mb: reserveMetaRows ? 0.35 : 0.5,
          minWidth: 0,
          width: 1,
        }}
      >
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'flex-start',
            gap: 0.35,
            maxWidth: 1,
            minWidth: 0,
          }}
        >
          {visIcon ? (
            <Iconify
              icon={visIcon}
              width={12}
              sx={{ color: 'text.secondary', flexShrink: 0, mt: '2px' }}
            />
          ) : null}
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 800,
              fontSize: '0.8125rem',
              lineHeight: 1.3,
              minWidth: 0,
              textAlign: visIcon ? 'left' : 'center',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
              WebkitLineClamp: reserveMetaRows ? 1 : 2,
            }}
          >
            {name}
          </Typography>
        </Box>
      </Box>

      {useCombined ? (
        <Typography
          variant="caption"
          sx={{
            ...COMPACT_CAPTION_SX,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {combinedSubtitle}
        </Typography>
      ) : (
        <Stack spacing={0.15} sx={{ alignItems: 'center', width: 1, minWidth: 0 }}>
          {ownerLine ? (
            <Typography
              variant="caption"
              sx={{
                ...COMPACT_CAPTION_SX,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {ownerLine}
            </Typography>
          ) : null}
          {spotsLabel ? (
            <Typography
              variant="caption"
              sx={{
                ...COMPACT_CAPTION_SX,
                flexShrink: 0,
                color: ownerLine ? 'text.disabled' : 'text.secondary',
              }}
            >
              {spotsLabel}
            </Typography>
          ) : null}
        </Stack>
      )}
    </Box>
  );
}

CompactText.propTypes = {
  name: PropTypes.string.isRequired,
  spotsLabel: PropTypes.string,
  ownerLabel: PropTypes.string,
  pendingLabel: PropTypes.string,
  visIcon: PropTypes.string,
  combinedSubtitle: PropTypes.string,
};

// ----------------------------------------------------------------------
// Landscape row sub-components (non-compact)
// ----------------------------------------------------------------------

function NomNomListAvatar({ list, theme }) {
  const primary = theme.palette.primary.main;
  const thumb = list.cover_image_url || null;
  const avatarSx = {
    width: 48,
    height: 48,
    flexShrink: 0,
    alignSelf: 'flex-start',
  };

  if (thumb) {
    return <Avatar variant="rounded" alt={list.name || ''} src={thumb} sx={avatarSx} />;
  }

  return (
    <Box
      sx={{
        ...avatarSx,
        borderRadius: 2,
        overflow: 'hidden',
        background: listCoverEmptyGradient(primary),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Iconify icon={ic.bookmarkBold} width={24} sx={{ color: alpha(primary, 0.45) }} />
    </Box>
  );
}

NomNomListAvatar.propTypes = {
  list: PropTypes.object.isRequired,
  theme: PropTypes.object.isRequired,
};

function NomNomListTextBlock({ list, subtitle, spotsLabel, ownerLabel, pendingLabel }) {
  const ownerLine =
    pendingLabel && ownerLabel
      ? `${pendingLabel} · ${ownerLabel}`
      : pendingLabel || ownerLabel || null;
  const hasStructuredMeta = Boolean(spotsLabel || ownerLine);

  return (
    <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.35, minWidth: 0 }}>
        <Iconify
          icon={listVisibilityIcon(list)}
          width={14}
          sx={{ color: 'text.secondary', flexShrink: 0 }}
        />
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            fontSize: '1rem',
            lineHeight: 1.2,
            minWidth: 0,
            flex: 1,
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {list.name}
        </Typography>
      </Box>
      {hasStructuredMeta ? (
        <Stack spacing={0.1} sx={{ minWidth: 0 }}>
          {ownerLine ? (
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: 'text.secondary',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {ownerLine}
            </Typography>
          ) : null}
          {spotsLabel ? (
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: ownerLine ? 'text.disabled' : 'text.secondary',
                display: 'block',
                flexShrink: 0,
              }}
            >
              {spotsLabel}
            </Typography>
          ) : null}
        </Stack>
      ) : (
        <Typography
          variant="caption"
          sx={{
            fontWeight: 600,
            color: 'text.secondary',
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

NomNomListTextBlock.propTypes = {
  list: PropTypes.object.isRequired,
  subtitle: PropTypes.string,
  spotsLabel: PropTypes.string,
  ownerLabel: PropTypes.string,
  pendingLabel: PropTypes.string,
};

// ----------------------------------------------------------------------

/**
 * Picker row for save-to-list sheet (toggle membership).
 * Compact mode: profile-page portrait card style.
 * Non-compact: landscape row.
 */
export function NomNomListPickerTile({ list, selected, onToggle, t, compact }) {
  const theme = useTheme();
  const reduceMotion = usePrefersReducedMotion();
  const subtitle = listSpotsVisibilitySubtitle(t, list);

  if (compact) {
    return (
      <Box
        component="button"
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        sx={compactCardSx(theme, { reduceMotion })}
      >
        {/* Selection indicator — top-right of card */}
        <Box
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            width: 22,
            height: 22,
            borderRadius: 0.75,
            border: '2px solid',
            borderColor: selected ? 'primary.main' : alpha(theme.palette.divider, 0.9),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: selected ? 'primary.main' : 'background.paper',
            zIndex: 1,
          }}
        >
          {selected ? (
            <Iconify icon={ic.checkmarkFill} width={14} sx={{ color: 'primary.contrastText' }} />
          ) : null}
        </Box>
        <CompactThumb list={list} theme={theme} />
        <CompactText name={list.name} spotsLabel={subtitle} visIcon={listVisibilityIcon(list)} />
      </Box>
    );
  }

  // Landscape row
  const selectionRing = (
    <Box
      sx={{
        width: 28,
        height: 28,
        borderRadius: 1,
        border: '2px solid',
        borderColor: selected ? 'primary.main' : alpha(theme.palette.divider, 0.9),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        alignSelf: 'center',
      }}
    >
      {selected ? (
        <Iconify icon={ic.checkCircleBold} width={22} sx={{ color: 'primary.main' }} />
      ) : null}
    </Box>
  );

  return (
    <Box
      component="button"
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      sx={getNomNomListTileSurfaceSx(theme, { selected, reduceMotion })}
    >
      <NomNomListAvatar list={list} theme={theme} />
      <NomNomListTextBlock list={list} spotsLabel={subtitle} />
      {selectionRing}
    </Box>
  );
}

NomNomListPickerTile.propTypes = {
  list: PropTypes.object.isRequired,
  selected: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
  compact: PropTypes.bool,
};

// ----------------------------------------------------------------------

/**
 * Navigates to list detail.
 * Compact mode: profile-page portrait card style.
 * Non-compact: landscape row with chevron.
 */
export function NomNomListLinkTile({ list, href, t, subtitle: subtitleProp, compact }) {
  const theme = useTheme();
  const reduceMotion = usePrefersReducedMotion();
  const ownerLabel = listHubOwnerPrefix(t, list);
  const spotsLabel = listSpotsVisibilitySubtitle(t, list);
  const pendingLabel =
    list.member_status === 'pending_invite'
      ? t('pages.dashboard.lists.list_shared_pending_invite')
      : null;
  const combinedSubtitle =
    subtitleProp ?? (ownerLabel ? `${ownerLabel} · ${spotsLabel}` : spotsLabel);

  if (compact) {
    return (
      <Box
        component={RouterLink}
        href={href}
        sx={{
          ...compactCardSx(theme, { reduceMotion }),
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <CompactThumb list={list} theme={theme} />
        {subtitleProp ? (
          <CompactText
            name={list.name}
            combinedSubtitle={combinedSubtitle}
            visIcon={listVisibilityIcon(list)}
          />
        ) : (
          <CompactText
            name={list.name}
            spotsLabel={spotsLabel}
            ownerLabel={ownerLabel}
            pendingLabel={pendingLabel}
            visIcon={listVisibilityIcon(list)}
          />
        )}
      </Box>
    );
  }

  // Landscape row
  return (
    <Box
      component={RouterLink}
      href={href}
      sx={{
        ...getNomNomListTileSurfaceSx(theme, { selected: false, reduceMotion }),
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <NomNomListAvatar list={list} theme={theme} />
      <NomNomListTextBlock
        list={list}
        subtitle={subtitleProp ? combinedSubtitle : undefined}
        spotsLabel={subtitleProp ? undefined : spotsLabel}
        ownerLabel={subtitleProp ? undefined : ownerLabel}
        pendingLabel={subtitleProp ? undefined : pendingLabel}
      />
      <Iconify
        icon={ic.chevronRightLinear}
        width={20}
        sx={{ color: 'text.secondary', flexShrink: 0, alignSelf: 'center' }}
      />
    </Box>
  );
}

NomNomListLinkTile.propTypes = {
  list: PropTypes.object.isRequired,
  href: PropTypes.string.isRequired,
  t: PropTypes.func.isRequired,
  subtitle: PropTypes.string,
  compact: PropTypes.bool,
};

// ----------------------------------------------------------------------

/**
 * "New NomNom list" create tile.
 * Compact mode: matches profile page portrait card — dashed ring with + icon, label below.
 * Non-compact: landscape dashed row.
 */
export function NomNomListCreateTile({ compact, onClick, t, thumbPx }) {
  const theme = useTheme();
  const reduceMotion = usePrefersReducedMotion();
  const primary = theme.palette.primary.main;
  const createLabel = t('pages.lists.creator_new_list');

  if (compact) {
    const isDark = theme.palette.mode === 'dark';
    const sz = thumbPx ?? COMPACT_THUMB_PX;
    return (
      <Box
        component="button"
        type="button"
        onClick={onClick}
        aria-label={createLabel}
        sx={{
          width: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          p: 0,
          color: 'text.primary',
          border: 'none',
          bgcolor: 'transparent',
          boxShadow: 'none',
          cursor: 'pointer',
          textAlign: 'center',
          borderRadius: 2,
          ...FOCUS_VISIBLE_OUTLINE_SX(theme),
          transition: theme.transitions.create(['color'], {
            duration: theme.transitions.duration.shorter,
          }),
          '&:hover': { color: 'primary.main' },
          ...(reduceMotion ? {} : { '&:active': { transform: 'scale(0.985)' } }),
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
          <Box
            sx={{
              p: '3px',
              borderRadius: 2,
              bgcolor: alpha(primary, isDark ? 0.42 : 0.22),
            }}
          >
            <Box
              sx={{
                position: 'relative',
                width: sz,
                height: sz,
                borderRadius: 2,
                overflow: 'hidden',
                border: '2px solid',
                borderColor: 'background.paper',
                bgcolor: alpha(primary, 0.08),
                color: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Iconify icon={ic.addRounded} width={32} />
            </Box>
          </Box>
        </Box>
        <CompactText name={createLabel} />
      </Box>
    );
  }

  // Landscape dashed row
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      aria-label={createLabel}
      sx={{
        ...getNomNomListTileSurfaceSx(theme, { selected: false, reduceMotion }),
        border: '2px dashed',
        borderColor: alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.65 : 1),
        bgcolor: 'transparent',
        color: 'text.secondary',
        transition: reduceMotion
          ? 'color 0.2s, border-color 0.2s'
          : 'color 0.2s, border-color 0.2s, transform 0.15s',
        '&:hover': {
          color: 'primary.main',
          borderColor: alpha(primary, 0.45),
        },
        ...(reduceMotion ? {} : { '&:active': { transform: 'scale(0.98)' } }),
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '16px',
          bgcolor: alpha(primary, 0.08),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          alignSelf: 'flex-start',
        }}
      >
        <Iconify icon={ic.addRounded} width={24} sx={{ color: 'primary.main' }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            fontSize: '1rem',
            lineHeight: 1.2,
            display: 'block',
          }}
        >
          {createLabel}
        </Typography>
      </Box>
    </Box>
  );
}

NomNomListCreateTile.propTypes = {
  compact: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired,
  thumbPx: PropTypes.number,
};
