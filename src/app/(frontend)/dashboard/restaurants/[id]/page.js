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
} from 'src/libs/list/filter-list-mentions-to-follows-only';
import {
  restaurantInMyLists,
  fetchViewerFollowingIds,
  fetchRestaurantListMentions,
  fetchPublicListItemsForRestaurant,
} from 'src/auth/actions/list-actions';

import { DynamicTitle } from 'src/components/dynamic-title';

import { RestaurantDetailView } from 'src/sections/restaurant/view';

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

export default async function DashboardRestaurantPage({ params }) {
  const { id } = await params;
  if (!RESTAURANT_ID_UUID_RE.test(id)) {
    notFound();
  }

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

  // Supplemental: public list rows for followed accounts (deduped vs primary RPC rows).
  // Primary: saves on lists you own, collaborate on, or subscribe to. Merged, then:
  // (1) Nom Nom circle: you + people you follow on a list;
  // (2) drop other people’s list-only saves (no written review) — no “Someone saved this” cards;
  // list names remain only on rows you can see (RPC + public supplement for follows).
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

  // Nom Nom circle: only you and people you follow who have this place on a list.
  const listMentionsCircle = filterListMentionsToFollowsOnly(
    listMentionsMerged,
    myUserId,
    followingIds
  );
  // Drop other people’s list-only saves (no written review) — avoids “Someone saved this” cards.
  const listMentions = filterListMentionsToSelfOrReviewBacked(listMentionsCircle, myUserId);

  // Reviews: you + everyone you follow (even if their save isn’t on a list you can see).
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

DashboardRestaurantPage.propTypes = {
  params: PropTypes.shape({
    id: PropTypes.string,
  }),
};
