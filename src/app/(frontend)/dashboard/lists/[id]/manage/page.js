import { Suspense } from 'react';
import PropTypes from 'prop-types';
import { notFound } from 'next/navigation';

import { getServerViewerLang } from 'src/libs/i18n-server';
import { fetchListForManage, fetchListMembershipForViewer } from 'src/libs/lists/actions';

import { DynamicTitle } from 'src/components/dynamic-title';

import { ListManageView } from 'src/sections/lists/view';
import ListManagePageSkeleton from 'src/sections/lists/view/list-manage-skeleton';

// ----------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Streams manage payload under Suspense (async-suspense-boundaries).
 */
async function DashboardListManagePageContent({ id }) {
  // Lang + manage payload overlap membership gate (async-parallel).
  const viewerLangPromise = getServerViewerLang();
  const dataPromise = fetchListForManage(id, { viewerLang: viewerLangPromise });
  const membership = await fetchListMembershipForViewer(id);
  const canManageList = membership.isOwner || membership.isEditor || membership.isMember;

  if (!canManageList) {
    notFound();
  }

  const data = await dataPromise;
  if (!data.list) {
    notFound();
  }

  return (
    <>
      <DynamicTitle titleKey="pages.lists.document_title" titleValues={{ name: data.list.name }} />
      <ListManageView
        listId={id}
        isOwner={membership.isOwner}
        canEditItems={membership.isOwner || membership.isEditor}
        initial={data}
      />
    </>
  );
}

DashboardListManagePageContent.propTypes = {
  id: PropTypes.string.isRequired,
};

export default async function DashboardListManagePage({ params }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    notFound();
  }

  return (
    <Suspense fallback={<ListManagePageSkeleton />}>
      <DashboardListManagePageContent id={id} />
    </Suspense>
  );
}

DashboardListManagePage.propTypes = {
  params: PropTypes.shape({
    id: PropTypes.string,
  }),
};
