import { Suspense } from 'react';

import { loadDiscoverPageData } from 'src/auth/actions/discover-actions';
import { localizedDocumentTitle } from 'src/content-platform/page-metadata';

import { DynamicTitle } from 'src/components/dynamic-title';

import { DiscoverView } from 'src/sections/discover/view';
import DiscoverPageLoadingSkeleton from 'src/sections/discover/discover-page-loading-skeleton';

// ----------------------------------------------------------------------

export async function generateMetadata() {
  return localizedDocumentTitle('pages.dashboard.discover.document_title');
}

/**
 * Streams Discover data under Suspense so the document title can paint while
 * locality + feed + leaderboard resolve (async-suspense-boundaries).
 */
async function DiscoverPageContent() {
  const data = await loadDiscoverPageData();

  return (
    <DiscoverView
      marketLabel={data.marketLabel}
      homeLocalityId={data.homeLocalityId}
      homeMunicipalityId={data.homeMunicipalityId}
      feedLocalityId={data.feedLocalityId}
      feedRefLat={data.feedRefLat}
      feedRefLng={data.feedRefLng}
      isFallbackMarket={data.isFallbackMarket}
      suggestedCreators={data.suggestedCreators}
      followingIds={data.followingIds}
      hasFollows={data.hasFollows}
      restaurants={data.restaurants}
      savedListIdsByRestaurant={data.savedListIdsByRestaurant}
      listsLeaderboard={data.listsLeaderboard}
    />
  );
}

export default function DashboardDiscoverPage() {
  return (
    <>
      <DynamicTitle titleKey="pages.dashboard.discover.document_title" />
      <Suspense fallback={<DiscoverPageLoadingSkeleton />}>
        <DiscoverPageContent />
      </Suspense>
    </>
  );
}
