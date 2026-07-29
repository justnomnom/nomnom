'use client';

import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Container from '@mui/material/Container';
import { alpha, useTheme } from '@mui/material/styles';

import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

import { NOM_NOM_LIST_COMPACT_THUMB_PX } from 'src/sections/lists/nom-nom-list-tile';
import { profileSectionInsetSx } from 'src/sections/profile/view/settings-shell-shared';

// ----------------------------------------------------------------------

/** Must stay in sync with `UserPublicProfileView` list carousel (`LIST_CARD_W`). */
const LIST_CARD_W = 140;
const LIST_THUMB_PX = NOM_NOM_LIST_COMPACT_THUMB_PX;

/** Public `/u/[username]` — matches `UserPublicProfileView` `layout !== 'dashboard'` (MainLayout + Container sm). */
export default function PublicUserProfileMarketingSkeleton() {
  const theme = useTheme();
  const listThumbRingBg = alpha(
    theme.palette.primary.main,
    theme.palette.mode === 'light' ? 0.22 : 0.42
  );

  const skeletonTheme = useSkeletonThemeColors();

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <Container
        data-testid="e2e-public-user-public-profile-loading"
        maxWidth="sm"
        sx={{ py: 0, pb: 8 }}
        aria-busy="true"
      >
        <Box sx={{ ...profileSectionInsetSx, pb: 3, borderBottom: 1, borderColor: 'divider' }}>
          <Stack alignItems="center" textAlign="center" spacing={2}>
            <Skeleton circle width={96} height={96} />
            <Skeleton height={28} width={200} borderRadius={4} />
            <Skeleton height={18} width={120} borderRadius={4} />
            <Stack direction="row" spacing={4} sx={{ py: 1 }}>
              <Skeleton height={40} width={48} borderRadius={4} />
              <Skeleton height={40} width={48} borderRadius={4} />
              <Skeleton height={40} width={48} borderRadius={4} />
            </Stack>
            <Skeleton height={48} width="100%" borderRadius={8} style={{ maxWidth: 360 }} />
          </Stack>
        </Box>

        <Box sx={{ py: 4 }}>
          <Box sx={{ ...profileSectionInsetSx, mb: 2.5 }}>
            <Skeleton height={24} width={180} borderRadius={4} />
          </Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 2,
              overflowX: 'auto',
              pb: 1,
              width: 1,
              minWidth: 0,
              ...profileSectionInsetSx,
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
            }}
          >
            {[0, 1, 2].map((i) => (
              <Box
                key={i}
                sx={{
                  flex: '0 0 auto',
                  width: LIST_CARD_W,
                  maxWidth: LIST_CARD_W,
                  minWidth: 0,
                  textAlign: 'center',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1.25 }}>
                  <Box
                    sx={{
                      p: '3px',
                      borderRadius: 2,
                      bgcolor: listThumbRingBg,
                    }}
                  >
                    <Box
                      sx={{
                        position: 'relative',
                        width: LIST_THUMB_PX,
                        height: LIST_THUMB_PX,
                        borderRadius: 2,
                        overflow: 'hidden',
                        border: '2px solid',
                        borderColor: 'background.paper',
                        boxShadow: theme.shadows[3],
                        bgcolor: alpha(
                          theme.palette.text.primary,
                          theme.palette.mode === 'light' ? 0.05 : 0.08
                        ),
                      }}
                    >
                      <Skeleton
                        width="100%"
                        height="100%"
                        borderRadius={0}
                        style={{ display: 'block', lineHeight: 1 }}
                      />
                    </Box>
                  </Box>
                </Box>
                <Stack spacing={0.75} sx={{ alignItems: 'center', px: 0.5 }}>
                  <Skeleton
                    height={16}
                    width={LIST_CARD_W - 12}
                    borderRadius={4}
                    style={{ maxWidth: '100%' }}
                  />
                  <Skeleton
                    height={12}
                    width={LIST_CARD_W - 28}
                    borderRadius={4}
                    style={{ maxWidth: '100%' }}
                  />
                </Stack>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Activity feed — must stay in sync with creator-profile-recent-activity-label section */}
        <Box component="section" sx={{ width: 1 }}>
          <Box
            sx={{
              ...profileSectionInsetSx,
              py: 2,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Skeleton height={24} width={180} borderRadius={4} style={{ marginBottom: 16 }} />
            <Stack direction="row" gap={1}>
              <Skeleton height={36} width={56} borderRadius={999} />
              <Skeleton height={36} width={80} borderRadius={999} />
              <Skeleton height={36} width={108} borderRadius={999} />
            </Stack>
          </Box>
          <Stack spacing={1.75} sx={{ ...profileSectionInsetSx, pt: 3, pb: 4 }}>
            {[0, 1, 2].map((i) => (
              <Card key={i} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Stack spacing={1.25}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                    <Skeleton height={14} width={80} borderRadius={4} />
                    <Skeleton height={12} width={52} borderRadius={4} />
                  </Stack>
                  <Skeleton height={18} width="72%" borderRadius={4} />
                  <Skeleton height={14} width="50%" borderRadius={4} />
                  <Skeleton height={14} width="36%" borderRadius={4} />
                </Stack>
              </Card>
            ))}
          </Stack>
        </Box>
      </Container>
    </SkeletonTheme>
  );
}
