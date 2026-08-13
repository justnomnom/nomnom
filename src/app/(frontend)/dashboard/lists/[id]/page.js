import { Suspense } from 'react';
import PropTypes from 'prop-types';
import { notFound } from 'next/navigation';

import { fetchListPage } from 'src/libs/lists/actions';
import { getServerViewerLang } from 'src/libs/i18n-server';

import { DynamicTitle } from 'src/components/dynamic-title';

import { DashboardListPublicView } from 'src/sections/lists/view';
import DashboardListPublicSkeleton from 'src/sections/lists/view/dashboard-list-public-skeleton';

// ----------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Streams list payload under Suspense (async-suspense-boundaries).
 */
async function DashboardListPageContent({ id }) {
  const viewerLangPromise = getServerViewerLang();
  const publicData = await fetchListPage(id, { viewerLang: viewerLangPromise });
  if (!publicData.list || publicData.error === 'not_found' || publicData.error === 'not_public') {
    notFound();
  }

  return (
    <>
      <DynamicTitle
        titleKey="pages.lists.document_title"
        titleValues={{ name: publicData.list.name }}
      />
      <DashboardListPublicView
        list={publicData.list}
        items={publicData.items}
        owner={publicData.owner}
        error={publicData.error}
        membership={publicData.membership}
        paidAccess={publicData.paidAccess}
      />
    </>
  );
}

DashboardListPageContent.propTypes = {
  id: PropTypes.string.isRequired,
};

export default async function DashboardListPage({ params }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    notFound();
  }

  return (
    <Suspense fallback={<DashboardListPublicSkeleton />}>
      <DashboardListPageContent id={id} />
    </Suspense>
  );
}

DashboardListPage.propTypes = {
  params: PropTypes.shape({
    id: PropTypes.string,
  }),
};
