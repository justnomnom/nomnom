'use client';

import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

import { paths } from 'src/routes/paths';

import { useTranslate } from 'src/locales';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

import { SettingsDrillShell } from 'src/sections/profile/view';

// ----------------------------------------------------------------------

/** Matches `SponsoredPlacementsAdminView` shell: intro + “add” card + placements table. */
export default function SponsoredPlacementsRouteLoadingSkeleton() {
  const theme = useTheme();
  const isNarrow = useMediaQuery(theme.breakpoints.down('sm'));
  const { t } = useTranslate();
  const tk = (k) => t(`pages.dashboard.admin.sponsored_placements.${k}`);

  const skeletonTheme = useSkeletonThemeColors();

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <SettingsDrillShell
        title={tk('heading')}
        compactToolbar
        backHref={paths.dashboard.admin}
        backAriaLabel={tk('back_to_admin')}
      >
        <Stack spacing={isNarrow ? 2.5 : 3} sx={{ width: 1 }} aria-busy="true">
          <Skeleton height={18} width="min(100%, 560px)" borderRadius={4} />

          <Card variant="outlined" sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 2 }}>
            <Skeleton height={24} width={200} borderRadius={4} style={{ marginBottom: 16 }} />
            <Stack spacing={2.25}>
              <Skeleton height={14} width={80} borderRadius={4} />
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Skeleton height={36} width={120} borderRadius={4} />
                <Skeleton height={36} width={120} borderRadius={4} />
              </Stack>
              <Skeleton height={56} style={{ width: '100%', maxWidth: 520, borderRadius: 8 }} />
              <Skeleton height={56} style={{ width: '100%', maxWidth: 520, borderRadius: 8 }} />
              <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ pt: 0.5 }}>
                <Skeleton height={40} width={140} borderRadius={4} />
                <Skeleton height={40} width={120} borderRadius={4} />
              </Stack>
            </Stack>
          </Card>

          <Card variant="outlined" sx={{ p: 0, overflow: 'auto', borderRadius: 2 }}>
            <Table size="small" sx={{ minWidth: 880 }}>
              <TableHead>
                <TableRow>
                  {[110, 160, 80, 80, 70, 40].map((w, i) => (
                    <TableCell key={i} sx={{ py: 1.5 }}>
                      <Skeleton width={w} height={16} borderRadius={4} />
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {[0, 1, 2, 3, 4].map((r) => (
                  <TableRow key={r}>
                    {[0, 1, 2, 3, 4, 5].map((c) => (
                      <TableCell key={c}>
                        <Skeleton height={18} width={c === 0 ? '88%' : '72%'} borderRadius={4} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </Stack>
      </SettingsDrillShell>
    </SkeletonTheme>
  );
}
