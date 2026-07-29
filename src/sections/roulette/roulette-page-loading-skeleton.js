'use client';

import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';

import { paths } from 'src/routes/paths';

import { useTranslate } from 'src/locales';
import { useSkeletonThemeColors } from 'src/theme/use-skeleton-theme';

import SettingsDrillShell from 'src/sections/profile/view/settings-drill-shell';

// ----------------------------------------------------------------------

export default function RoulettePageLoadingSkeleton() {
  const { t } = useTranslate();

  const skeletonTheme = useSkeletonThemeColors();

  return (
    <SkeletonTheme
      baseColor={skeletonTheme.baseColor}
      highlightColor={skeletonTheme.highlightColor}
    >
      <SettingsDrillShell
        title=""
        compactToolbar
        stretchPageContent
        backHref={paths.dashboard.discover}
        backAriaLabel={t('pages.dashboard.title')}
      >
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            py: { xs: 2, md: 3 },
          }}
          aria-busy="true"
        >
          <Card
            variant="outlined"
            sx={{
              width: 1,
              maxWidth: 480,
              mx: 'auto',
              borderRadius: 2,
              px: { xs: 2.5, sm: 3 },
              py: { xs: 3.5, md: 4 },
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              boxShadow: (th) => th.customShadows.z8,
            }}
          >
            <Box sx={{ mb: 3 }}>
              <Skeleton
                width={96}
                height={96}
                borderRadius={8}
                style={{ transform: 'rotate(3deg)' }}
              />
            </Box>
            <Skeleton height={36} width="78%" borderRadius={6} />
            <Skeleton height={18} width="90%" borderRadius={4} style={{ marginTop: 12 }} />
            <Skeleton height={18} width="70%" borderRadius={4} style={{ marginTop: 8 }} />
            <Skeleton
              height={52}
              width="100%"
              borderRadius={8}
              style={{ marginTop: 24, maxWidth: 360 }}
            />
            <Skeleton height={14} width={160} borderRadius={4} style={{ marginTop: 20 }} />
          </Card>
        </Box>
      </SettingsDrillShell>
    </SkeletonTheme>
  );
}
