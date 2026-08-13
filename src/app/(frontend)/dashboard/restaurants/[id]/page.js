import { Suspense } from 'react';
import PropTypes from 'prop-types';
import { notFound } from 'next/navigation';

import { APP } from 'src/config-global';
import { getServerViewerLang } from 'src/libs/i18n-server';
import { getDefaultTranslation } from 'src/locales/default-translations';
import { normalizeFollowCircle } from 'src/libs/restaurant/follow-circle';
import { fetchRestaurantReviews } from 'src/auth/actions/restaurant-review-actions';
import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';
import {
  RESTAURANT_ID_UUID_RE,
  fetchRestaurantByIdForSsr,
} from 'src/libs/restaurant/fetch-restaurant-by-id-for-ssr';
import {
  filterListMentionsToFollowsOnly,
  filterListMentionsToSelfOrReviewBacked,
} from 'src/libs/lists/filter-list-mentions-to-follows-only';
import {
  restaurantInMyLists,
  fetchViewerFollowingIds,
  fetchRestaurantListMentions,
  fetchPublicListItemsForRestaurant,
} from 'src/libs/lists/actions';

import { DynamicTitle } from 'src/components/dynamic-title';

import { RestaurantDetailView } from 'src/sections/restaurant/view';
import RestaurantDetailRouteLoadingSkeleton from 'src/sections/restaurant/view/restaurant-detail-route-loading-skeleton';

// ----------------------------------------------------------------------

async function fetchFollowCircleForRestaurant(restaurantId) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (!user) return null;
  const { data, error } = await supabase.rpc('restaurant_follow_circle_for_viewer', {
    p_restaurant_id: restaurantId,
  });
  if (error) {
    console.error('[fetchFollowCircleForRestaurant]', error);
    return null;
  }
  return normalizeFollowCircle(data);
}

async function getSessionUserId() {
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  return user?.id ?? null;
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  if (!RESTAURANT_ID_UUID_RE.test(id)) {
    return {
      title: `${getDefaultTranslation('pages.dashboard.restaurant.not_found_title')} — ${APP.name}`,
    };
  }
  const restaurant = await fetchRestaurantByIdForSsr(id);
  if (!restaurant) {
    return {
      title: `${getDefaultTranslation('pages.dashboard.restaurant.not_found_title')} — ${APP.name}`,
    };
  }
  return {
    title: `${restaurant.name} · ${APP.name}`,
    description: getDefaultTranslation('pages.dashboard.restaurant.meta_description'),
  };
}

/**
 * Streams restaurant payload under Suspense so the route shell can paint
 * while detail + mentions resolve (async-suspense-boundaries).
 */
async function DashboardRestaurantPageContent({ id }) {
  const viewerLangPromise = getServerViewerLang();
  const restaurantPromise = fetchRestaurantByIdForSsr(id);
  const secondaryPromise = Promise.all([
    fetchFollowCircleForRestaurant(id),
    restaurantInMyLists(id),
    fetchRestaurantReviews(id),
    getSessionUserId(),
    fetchPublicListItemsForRestaurant(id),
    fetchViewerFollowingIds(),
  ]);

  const restaurant = await restaurantPromise;
  if (!restaurant) {
    notFound();
  }

  const viewerLang = await viewerLangPromise;
  const [
    [followCircle, inLists, reviewsResult, myUserId, publicListItems, followingIds],
    listMentionsResult,
  ] = await Promise.all([secondaryPromise, fetchRestaurantListMentions(id, { viewerLang })]);
  const listIds = inLists.listIds ?? [];
  const savedLists = inLists.lists ?? [];

  if (reviewsResult.error) {
    console.error('[fetchRestaurantReviews]', reviewsResult.error);
  }
  if (listMentionsResult.error) {
    console.error('[fetchRestaurantListMentions]', listMentionsResult.error);
  }
  const reviews = reviewsResult.reviews ?? [];

  const primaryItemIds = new Set((listMentionsResult.items ?? []).map((m) => m.id).filter(Boolean));
  const reviewsByKey = new Map(reviews.map((r) => [`${r.user_id}:${r.restaurant_id}`, r]));
  const supplemental = (publicListItems ?? [])
    .filter(
      (item) =>
        item.id && !primaryItemIds.has(item.id) && item.added_by && followingIds.has(item.added_by)
    )
    .map((item) => {
      const { list_item_must_try_dishes: rawDishes, ...rest } = item;
      return {
        ...rest,
        must_try_dishes: (rawDishes ?? []).map((d) => ({ ...d, display_label: d.label ?? '' })),
        contributor_review: reviewsByKey.get(`${item.added_by}:${item.restaurant_id}`) ?? null,
      };
    });
  const listMentionsMerged = [...(listMentionsResult.items ?? []), ...supplemental];

  const listMentionsCircle = filterListMentionsToFollowsOnly(
    listMentionsMerged,
    myUserId,
    followingIds
  );
  const listMentions = filterListMentionsToSelfOrReviewBacked(listMentionsCircle, myUserId);

  const allowedReviewerIds = new Set([...(myUserId ? [String(myUserId)] : []), ...followingIds]);
  const filteredReviews = reviews.filter(
    (r) => r.user_id && allowedReviewerIds.has(String(r.user_id))
  );

  return (
    <>
      <DynamicTitle
        titleKey="pages.dashboard.restaurant.document_title"
        titleValues={{ name: restaurant.name }}
      />
      <RestaurantDetailView
        restaurant={restaurant}
        savedListIds={listIds ?? []}
        savedLists={savedLists}
        followCircle={followCircle}
        reviews={filteredReviews}
        listMentions={listMentions}
        myUserId={myUserId}
        dashboardFixedBottomNav
        analyticsSurface="dashboard"
      />
    </>
  );
}

DashboardRestaurantPageContent.propTypes = {
  id: PropTypes.string.isRequired,
};

export default async function DashboardRestaurantPage({ params }) {
  const { id } = await params;
  if (!RESTAURANT_ID_UUID_RE.test(id)) {
    notFound();
  }

  return (
    <Suspense fallback={<RestaurantDetailRouteLoadingSkeleton />}>
      <DashboardRestaurantPageContent id={id} />
    </Suspense>
  );
}

DashboardRestaurantPage.propTypes = {
  params: PropTypes.shape({
    id: PropTypes.string,
  }),
};
