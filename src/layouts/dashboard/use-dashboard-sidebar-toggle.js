'use client';

import { useCallback } from 'react';

import { safeGetItem, safeSetItem, safeRemoveItem } from 'src/utils/safe-storage';

import { useSettingsContext } from 'src/components/settings';

/** Remember expanded layout (horizontal vs vertical) when collapsing so expand can restore it. */
const LAYOUT_BEFORE_MINI_KEY = 'dashboard-expanded-layout-before-mini';

/**
 * Desktop dashboard: collapse expanded sidebar to icon rail (mini) and expand again.
 * Applies to both "vertical" and "horizontal" theme layouts with a left rail.
 */
export function useDashboardSidebarToggle() {
  const settings = useSettingsContext();

  const isMini = settings.themeLayout === 'mini';

  const toggle = useCallback(() => {
    if (settings.themeLayout === 'mini') {
      const prev = safeGetItem(LAYOUT_BEFORE_MINI_KEY);
      const next = prev === 'horizontal' || prev === 'vertical' ? prev : 'vertical';
      settings.onUpdate('themeLayout', next);
      safeRemoveItem(LAYOUT_BEFORE_MINI_KEY);
    } else {
      const current = settings.themeLayout;
      if (current === 'horizontal' || current === 'vertical') {
        safeSetItem(LAYOUT_BEFORE_MINI_KEY, current);
      }
      settings.onUpdate('themeLayout', 'mini');
    }
  }, [settings]);

  return { isMini, toggle };
}
