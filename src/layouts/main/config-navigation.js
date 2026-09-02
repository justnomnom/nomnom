import { useMemo } from 'react';

import { paths } from 'src/routes/paths';

import { useTranslate } from 'src/locales';

// ----------------------------------------------------------------------

/**
 * Main site header — each top item opens a panel (desktop) or drawer section (mobile)
 * with sub-links listed underneath.
 */
export function useNavData() {
  const { t } = useTranslate();

  const data = useMemo(
    () => [
      {
        title: t('navigation.features'),
        path: paths.site.featuresRoot,
        children: [
          {
            key: 'features-browse',
            items: [
              { title: t('navigation.features_all'), path: paths.site.featuresRoot },
              { title: t('navigation.feature_feed'), path: paths.site.featureFeed },
              { title: t('navigation.feature_lists'), path: paths.site.featureLists },
              { title: t('navigation.feature_map'), path: paths.site.featureMap },
              { title: t('navigation.feature_roulette'), path: paths.site.featureRoulette },
              { title: t('navigation.feature_table'), path: paths.site.featureTable },
            ],
          },
        ],
      },
      {
        title: t('navigation.use_cases'),
        path: paths.site.useCasesRoot,
        children: [
          {
            key: 'use-cases-browse',
            items: [
              { title: t('navigation.use_cases_all'), path: paths.site.useCasesRoot },
              { title: t('navigation.use_case_foodies'), path: paths.site.useCaseFoodies },
              { title: t('navigation.use_case_creators'), path: paths.site.useCaseCreators },
              { title: t('navigation.use_case_hosts'), path: paths.site.useCaseHosts },
              { title: t('navigation.use_case_restaurants'), path: paths.site.useCaseRestaurants },
            ],
          },
        ],
      },
      {
        title: t('navigation.section_company'),
        path: paths.site.about,
        children: [
          {
            key: 'company-browse',
            items: [
              { title: t('navigation.about'), path: paths.site.about },
              { title: t('navigation.pricing'), path: paths.site.pricing },
              { title: t('navigation.resources'), path: paths.site.resourcesRoot },
              { title: t('navigation.contact'), path: paths.contact },
              { title: t('navigation.faqs'), path: paths.faqs },
            ],
          },
        ],
      },
    ],
    [t]
  );

  return data;
}
