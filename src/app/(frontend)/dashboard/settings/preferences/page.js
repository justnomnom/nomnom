import { mergeDishTagsForPreferences } from 'src/utils/restaurant-tag-groups';

import { localizedDocumentTitle } from 'src/content-platform/page-metadata';
import { fetchUserMustTryDishTags } from 'src/auth/actions/must-try-actions';
import { fetchRestaurantTagsCatalog } from 'src/auth/actions/location-actions';
import { getUserRestaurantTagPreferences } from 'src/auth/actions/onboarding-actions';

import { DynamicTitle } from 'src/components/dynamic-title';

import { SettingsTagPreferencesPage } from 'src/sections/profile/view';

// ----------------------------------------------------------------------

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return localizedDocumentTitle('pages.dashboard.settings.preferences.page_title');
}

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
