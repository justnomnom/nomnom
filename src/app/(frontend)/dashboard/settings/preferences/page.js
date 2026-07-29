import { mergeDishTagsForPreferences } from 'src/utils/restaurant-tag-groups';

import { getDefaultTranslation } from 'src/locales/default-translations';
import { fetchUserMustTryDishTags } from 'src/auth/actions/must-try-actions';
import { fetchRestaurantTagsCatalog } from 'src/auth/actions/location-actions';
import { getUserRestaurantTagPreferences } from 'src/auth/actions/onboarding-actions';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SettingsTagPreferencesPage } from 'src/sections/profile/view';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';

export const metadata = {
  title: getDefaultTranslation('pages.dashboard.settings.preferences.page_title'),
};

export default async function DashboardSettingsPreferencesPage() {
  const [{ tags }, prefs, userDishes] = await Promise.all([
    fetchRestaurantTagsCatalog(),
    getUserRestaurantTagPreferences(),
    fetchUserMustTryDishTags(),
  ]);

  const initialSelectedIds = prefs.error ? [] : (prefs.tagIds ?? []);
  const mergedTags = mergeDishTagsForPreferences(tags ?? [], userDishes.tags ?? []);

  return (
    <>
      <DynamicTitle titleKey="pages.dashboard.settings.preferences.page_title" />
      <SettingsTagPreferencesPage
        initialTags={mergedTags}
        initialSelectedIds={initialSelectedIds}
        userDishTags={userDishes.tags ?? []}
      />
    </>
  );
}
