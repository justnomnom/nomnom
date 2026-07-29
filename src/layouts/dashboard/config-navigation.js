import { useMemo } from 'react';

import { paths } from 'src/routes/paths';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales';

import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

/** In-app nav uses Iconify (navbar SVGs under `public/assets/icons/navbar/` are not shipped). */
const I = (icon) => <Iconify icon={icon} width={24} sx={{ color: 'inherit' }} />;

// ----------------------------------------------------------------------

export function useNavData(options = {}) {
  const { myPublicProfilePath } = options;
  const { t } = useTranslate();

  const data = useMemo(() => {
    const groups = [
      // DISCOVER (sidebar + bottom shell)
      // ----------------------------------------------------------------------
      {
        subheader: t('overview'),
        items: [
          {
            title: t('navigation.discover'),
            path: paths.dashboard.discover,
            icon: I(ic.compassLinear),
            bottomNavIconify: {
              active: ic.compassBold,
              inactive: ic.compassLinear,
            },
          },
          {
            title: t('navigation.map'),
            path: paths.dashboard.map,
            icon: I(ic.mapLinear),
            bottomNavIconify: {
              active: ic.mapBold,
              inactive: ic.mapLinear,
            },
          },
          {
            title: t('navigation.lists'),
            path: paths.dashboard.lists,
            icon: I(ic.bookmarkLinear),
            bottomNavIconify: {
              active: ic.bookmarkBold,
              inactive: ic.bookmarkLinear,
            },
          },
          {
            title: t('components.notifications.title'),
            path: paths.dashboard.notifications,
            icon: I(ic.bellLinear),
            bottomNavIconify: {
              active: ic.bellBold,
              inactive: ic.bellLinear,
            },
          },
          {
            title: t('navigation.profile'),
            path: paths.dashboard.settingsEdit,
            icon: I(ic.userCircleLinear),
            bottomNavIconify: {
              active: ic.userCircleBold,
              inactive: ic.userCircleLinear,
            },
          },
        ],
      },
      // FEEDBACK (sidebar only)
      // ----------------------------------------------------------------------
      {
        subheader: t('navigation.feedback'),
        items: [
          {
            title: t('navigation.report_bug'),
            path: paths.dashboard.feedback,
            icon: I(ic.dangerLinear),
            bottomNavIconify: {
              active: ic.dangerBold,
              inactive: ic.dangerLinear,
            },
            hideBottomNav: true,
          },
          {
            title: t('navigation.suggest_feature'),
            path: paths.dashboard.feedback,
            icon: I(ic.rocketLinear),
            bottomNavIconify: {
              active: ic.rocketBold,
              inactive: ic.rocketLinear,
            },
            hideBottomNav: true,
          },
        ],
      },
    ];

    if (!myPublicProfilePath) {
      return groups;
    }

    return groups.map((group) => ({
      ...group,
      items: group.items.map((item) =>
        item.path === paths.dashboard.settingsEdit && myPublicProfilePath
          ? { ...item, path: myPublicProfilePath }
          : item
      ),
    }));
  }, [t, myPublicProfilePath]);

  return data;
}

// ----------------------------------------------------------------------

/**
 * Longest matching path wins (e.g. /dashboard/settings over /dashboard).
 */
export function getDashboardBottomNavActivePath(pathname, items) {
  if (!pathname || !items?.length) {
    return null;
  }

  const matches = items.filter((item) => {
    if (item.path === '/') {
      return pathname === '/';
    }
    return pathname === item.path || pathname.startsWith(`${item.path}/`);
  });

  if (!matches.length) {
    return null;
  }

  return matches.reduce((best, cur) => (cur.path.length > best.path.length ? cur : best)).path;
}

export function useDashboardBottomNavItems(slotProps = {}) {
  const { currentRole, myPublicProfilePath } = slotProps;
  const data = useNavData({ myPublicProfilePath });

  return useMemo(() => {
    const seen = new Set();
    const out = [];

    data.forEach((group) => {
      group.items.forEach((item) => {
        if (!item.path || item.disabled) {
          return;
        }
        if (item.hideBottomNav) {
          return;
        }
        if (item.roles && currentRole && !item.roles.includes(`${currentRole}`)) {
          return;
        }
        if (seen.has(item.path)) {
          return;
        }
        seen.add(item.path);
        out.push({
          path: item.path,
          title: item.title,
          icon: item.icon,
          bottomNavIconify: item.bottomNavIconify,
        });
      });
    });

    return out;
  }, [data, currentRole]);
}
