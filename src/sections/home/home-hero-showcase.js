'use client';

import PropTypes from 'prop-types';
import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha, useTheme, keyframes } from '@mui/material/styles';

import { ic } from 'src/assets/icons';
import { RADIUS } from 'src/theme/spacing';
import { useTranslate } from 'src/locales';

import Iconify from 'src/components/iconify';

import { bob, REDUCED_MOTION_NONE } from './home-motion';

// ----------------------------------------------------------------------

const showcaseIn = keyframes`
  to { opacity: 1; transform: none; }
`;

const savePop = keyframes`
  0% { transform: scale(0.8); }
  60% { transform: scale(1.18); }
  100% { transform: scale(1); }
`;

/** Illustrative mock feed content for the marketing showcase (not real data). */
const MOCK_ROWS = [
  {
    name: 'Tasca do Mar',
    rating: '4.7',
    saved: true,
    photos: [
      'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=560&h=180&fit=crop&q=55&auto=format',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=560&h=180&fit=crop&q=55&auto=format',
      'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=560&h=180&fit=crop&q=55&auto=format',
    ],
    avatars: ['/assets/home/hero-trusted-1.svg', '/assets/home/hero-trusted-2.svg'],
    moreAvatars: '+2',
    socialNames: '@martamasterchef, Sofia +2 more',
    tags: ['Seafood', 'Alfama', 'Petiscos'],
    moreTags: '+3',
  },
  {
    name: 'Brasa & Co.',
    rating: '4.5',
    saved: false,
    // Bright-edged grill shots so the photo merges into the card instead of
    // reading as an abrupt black block (the prior images had near-black edges).
    photos: [
      'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=560&h=180&fit=crop&q=55&auto=format',
      'https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=560&h=180&fit=crop&q=55&auto=format',
    ],
    avatars: ['/assets/home/hero-trusted-3.svg'],
    moreAvatars: '+1',
    socialNames: '@portolocal +1 more',
    tags: ['Grill', 'Bairro Alto', 'Late night'],
    moreTags: null,
  },
];

const FILTER_CHIPS = [
  { key: 'all', icon: 'emojiForkKnifePlate', active: true },
  { key: 'pizza', icon: 'emojiPizza', active: false },
  { key: 'sushi', icon: 'emojiSushi', active: false },
  { key: 'brunch', icon: 'emojiHotBeverage', active: false },
  { key: 'wine', icon: 'emojiWineGlass', active: false },
];

// ----------------------------------------------------------------------

function ShowcaseFeedRow({ row, cycleOffset }) {
  const theme = useTheme();
  const { t } = useTranslate();
  const [saved, setSaved] = useState(row.saved);
  const [popKey, setPopKey] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    if (row.photos.length < 2) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const id = setInterval(() => {
      // Don't churn re-renders for a background tab nobody is looking at.
      if (document.hidden) return;
      setPhotoIndex((prev) => (prev + 1) % row.photos.length);
    }, 3200 + cycleOffset);
    return () => clearInterval(id);
  }, [row.photos.length, cycleOffset]);

  // The feed window is a decorative "picture of the app" (the root carries
  // role="img"). These controls are non-interactive props, not real buttons —
  // so they stay out of the tab order and don't need 44px hit targets or
  // accessible names. The save chip keeps a mouse-only press as a flourish.
  const actionSx = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    borderRadius: '50%',
    bgcolor: alpha(theme.palette.marketing.paper, 0.96),
    color: 'text.primary',
    border: `1px solid ${alpha(theme.palette.common.white, 0.55)}`,
    boxShadow: `0 1px 3px ${alpha(theme.palette.marketing.shadowWarm, 0.16)}`,
    transition: theme.transitions.create(['transform', 'color', 'background-color'], {
      duration: 150,
    }),
    '&:active': { transform: 'scale(0.9)' },
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
        p: '9px 8px 9px 12px',
        borderRadius: 2,
        transition: theme.transitions.create(['background-color', 'transform'], {
          duration: 200,
        }),
        '&:hover': { bgcolor: alpha(theme.palette.grey[500], 0.08) },
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          alignItems: 'center',
          columnGap: 0.75,
          pr: 0.5,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
          <Box
            component="span"
            sx={{
              minWidth: 0,
              fontSize: '0.9375rem',
              fontWeight: 800,
              lineHeight: 1.35,
              color: 'text.primary',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.name}
          </Box>
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              flexShrink: 0,
              fontSize: 12,
              fontWeight: 800,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            <Iconify icon={ic.starBold} width={14} sx={{ color: 'warning.main' }} />
            {row.rating}
          </Box>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexShrink: 0 }}>
          <Box
            component="span"
            onClick={() => {
              setSaved((prev) => !prev);
              setPopKey((prev) => prev + 1);
            }}
            sx={{
              ...actionSx,
              cursor: 'pointer',
              ...(saved && {
                color: 'primary.main',
                borderColor: alpha(theme.palette.primary.main, 0.45),
                bgcolor: alpha(theme.palette.primary.main, 0.12),
              }),
              ...(popKey > 0 && {
                animation: `${savePop} 0.35s cubic-bezier(0.2, 0.85, 0.3, 1.4)`,
                ...REDUCED_MOTION_NONE,
              }),
            }}
            key={popKey}
          >
            <Iconify icon={saved ? ic.bookmarkBold : ic.bookmarkLinear} width={18} />
          </Box>
          <Box component="span" sx={actionSx}>
            <Iconify icon={ic.shareLinear} width={18} />
          </Box>
          <Box component="span" sx={actionSx}>
            <Iconify icon={ic.mapPointBold} width={18} />
          </Box>
        </Stack>
      </Box>

      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: 88,
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: alpha(theme.palette.grey[500], 0.1),
          boxShadow: `0 1px 3px ${alpha(theme.palette.marketing.shadowWarm, 0.08)}`,
        }}
      >
        {row.photos.map((src, index) => (
          <Box
            key={src}
            component="img"
            src={src}
            alt=""
            loading={index === 0 ? undefined : 'lazy'}
            decoding="async"
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: index === photoIndex ? 1 : 0,
              transition: 'opacity 0.6s ease',
              '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
            }}
          />
        ))}
        <Stack
          direction="row"
          spacing="3px"
          sx={{
            position: 'absolute',
            bottom: 6,
            left: '50%',
            transform: 'translateX(-50%)',
          }}
        >
          {row.photos.map((src, index) => (
            <Box
              key={src}
              sx={{
                width: index === photoIndex ? 10 : 4,
                height: 4,
                borderRadius: RADIUS.pill,
                bgcolor:
                  index === photoIndex
                    ? theme.palette.marketing.paper
                    : alpha(theme.palette.marketing.paper, 0.55),
                transition: 'width 0.2s ease, background-color 0.2s ease',
                '@media (prefers-reduced-motion: reduce)': {
                  transition: 'none',
                },
              }}
            />
          ))}
        </Stack>
      </Box>

      <Stack
        direction="row"
        alignItems="center"
        spacing={0.75}
        sx={{ minWidth: 0, overflow: 'hidden' }}
      >
        <Stack direction="row" alignItems="center" sx={{ flexShrink: 0 }}>
          {row.avatars.map((src, index) => (
            <Box
              key={src}
              component="img"
              src={src}
              alt=""
              sx={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                border: `2px solid ${theme.palette.background.paper}`,
                ml: index === 0 ? 0 : '-5px',
                objectFit: 'cover',
              }}
            />
          ))}
          <Box
            sx={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              ml: '-5px',
              bgcolor: alpha(theme.palette.grey[500], 0.2),
              color: 'text.secondary',
              border: `2px solid ${theme.palette.background.paper}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.5rem',
              fontWeight: 800,
            }}
          >
            {row.moreAvatars}
          </Box>
        </Stack>
        <Box
          component="span"
          sx={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'text.secondary',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
            lineHeight: 1.3,
          }}
        >
          {t('pages.home.hero.showcase.recommendThis', { names: row.socialNames })}
        </Box>
      </Stack>

      <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap" useFlexGap>
        {row.tags.map((tag) => (
          <Box
            key={tag}
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 22,
              px: '7px',
              borderRadius: RADIUS.pill,
              bgcolor: alpha(theme.palette.grey[500], 0.16),
              color: 'text.secondary',
              fontSize: '0.6875rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
            }}
          >
            {tag}
          </Box>
        ))}
        {row.moreTags && (
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 22,
              px: '7px',
              borderRadius: RADIUS.pill,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.45)}`,
              color: 'primary.main',
              fontSize: '0.6875rem',
              fontWeight: 700,
            }}
          >
            {row.moreTags}
          </Box>
        )}
      </Stack>
    </Box>
  );
}

ShowcaseFeedRow.propTypes = {
  row: PropTypes.object,
  cycleOffset: PropTypes.number,
};

// ----------------------------------------------------------------------

/**
 * Hero product showcase — a stylized NomNom feed window (handoff design):
 * Discover-style search bar, market row, filter chips, two feed rows with
 * auto-cycling galleries, and a floating "Saved to" notification. Tilts in
 * 3D toward the cursor on fine pointers.
 */
export default function HomeHeroShowcase() {
  const theme = useTheme();
  const { t } = useTranslate();
  const rootRef = useRef(null);
  const windowRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    const win = windowRef.current;
    if (!root || !win) return undefined;
    if (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !window.matchMedia('(pointer: fine)').matches
    ) {
      return undefined;
    }

    const onMove = (event) => {
      const rect = root.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      win.style.transform = `rotateX(${2 - py * 4}deg) rotateY(${px * 6}deg)`;
    };
    const onLeave = () => {
      win.style.transform = '';
    };

    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerleave', onLeave);
    return () => {
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <Box
      ref={rootRef}
      role="img"
      aria-label={t('pages.home.hero.showcase.ariaLabel')}
      sx={{
        position: 'relative',
        width: '100%',
        maxWidth: 600,
        mx: 'auto',
        mt: 7,
        perspective: '1600px',
        opacity: 0,
        transform: 'translateY(40px)',
        animation: `${showcaseIn} 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) 0.5s forwards`,
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
          opacity: 1,
          transform: 'none',
        },
      }}
    >
      <Box
        ref={windowRef}
        sx={{
          position: 'relative',
          borderRadius: 4,
          bgcolor: 'background.paper',
          boxShadow: `0 0 0 1px ${alpha(theme.palette.marketing.hairline, 0.6)}, 0 22px 48px -28px ${alpha(theme.palette.marketing.shadowWarm, 0.3)}, 0 8px 20px -12px ${alpha(theme.palette.marketing.shadowWarm, 0.14)}`,
          p: { xs: 2, sm: 2.25 },
          textAlign: 'left',
          overflow: 'hidden',
          transform: 'none',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)',
          '@media (prefers-reduced-motion: reduce)': { transform: 'none' },
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 1.25 }}>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{
              flex: 1,
              minWidth: 0,
              bgcolor: alpha(theme.palette.marketing.paper, 0.85),
              borderRadius: 2,
              p: '11px 8px 11px 14px',
              border: `1px solid ${alpha(theme.palette.marketing.outlineMuted, 0.2)}`,
              boxShadow: `0 1px 2px ${alpha(theme.palette.marketing.shadowWarm, 0.04)}`,
              backdropFilter: 'blur(6px)',
            }}
          >
            <Iconify
              icon={ic.searchLinear}
              width={18}
              sx={{ color: 'text.disabled', flexShrink: 0 }}
            />
            <Box
              component="span"
              sx={{
                flex: 1,
                minWidth: 0,
                fontSize: 14,
                color: 'text.disabled',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {t('pages.dashboard.discover.search_placeholder')}
            </Box>
            <Iconify
              icon={ic.arrowRightBold}
              width={18}
              sx={{ color: 'text.disabled', flexShrink: 0, mr: 0.5 }}
            />
          </Stack>
          <Iconify
            icon={ic.tuningLinear}
            width={20}
            sx={{ color: 'text.primary', flexShrink: 0 }}
          />
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
          sx={{ mb: 1.75, px: 0.5 }}
        >
          <Box component="span" sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary' }}>
            {t('pages.home.hero.showcase.showingIn')}
          </Box>
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              fontSize: 13,
              fontWeight: 700,
              color: 'primary.main',
            }}
          >
            <Iconify icon={ic.mapPointBold} width={18} />
            {t('pages.home.hero.showcase.changeArea')}
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ mb: 2.25, overflow: 'hidden' }}>
          {FILTER_CHIPS.map((chip) => (
            <Box
              key={chip.key}
              component="span"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1.5,
                minHeight: 40,
                borderRadius: RADIUS.pill,
                fontSize: '0.75rem',
                fontWeight: 800,
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                ...(chip.active
                  ? {
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      boxShadow: theme.customShadows.chipGlow,
                    }
                  : {
                      bgcolor: 'background.paper',
                      color: 'text.primary',
                      border: `1px solid ${alpha(theme.palette.marketing.shadowWarm, 0.12)}`,
                    }),
              }}
            >
              <Iconify icon={ic[chip.icon]} width={15} />
              {t(`pages.home.hero.showcase.chips.${chip.key}`)}
            </Box>
          ))}
        </Stack>

        <Stack spacing={0.5}>
          {MOCK_ROWS.map((row, index) => (
            <ShowcaseFeedRow key={row.name} row={row} cycleOffset={index * 700} />
          ))}
        </Stack>
      </Box>

      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          bottom: '12%',
          right: -24,
          display: { xs: 'none', sm: 'inline-flex' },
          alignItems: 'center',
          gap: 1.25,
          p: '11px 16px',
          borderRadius: 2,
          bgcolor: 'background.paper',
          boxShadow: `0 16px 32px -4px ${alpha(theme.palette.marketing.shadowWarm, 0.2)}, 0 0 0 1px ${alpha(theme.palette.marketing.hairline, 0.6)}`,
          fontSize: 13,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          animation: `${bob} 7s ease-in-out infinite 0.8s`,
          ...REDUCED_MOTION_NONE,
        }}
      >
        <Iconify icon={ic.bookmarkBold} width={20} sx={{ color: 'primary.main' }} />
        <span>
          {t('pages.home.hero.showcase.savedTo')}{' '}
          <Box component="b" sx={{ color: 'primary.main' }}>
            {t('pages.home.hero.floats.listTitle')}
          </Box>
        </span>
      </Box>
    </Box>
  );
}
