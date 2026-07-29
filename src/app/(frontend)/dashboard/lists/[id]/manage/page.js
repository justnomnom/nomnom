import PropTypes from 'prop-types';
import { notFound } from 'next/navigation';

import { getServerViewerLang } from 'src/libs/i18n-server';
import { fetchListForManage, fetchListMembershipForViewer } from 'src/auth/actions/list-actions';

import { DynamicTitle } from 'src/components/dynamic-title';

import { ListManageView } from 'src/sections/lists/view';

// ----------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function DashboardListManagePage({ params }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) {
    notFound();
  }

  // Lang overlaps membership check (async-parallel).
  const viewerLangPromise = getServerViewerLang();
  const membership = await fetchListMembershipForViewer(id);
  const canManageList = membership.isOwner || membership.isEditor || membership.isMember;

  if (!canManageList) {
    notFound();
  }

  const data = await fetchListForManage(id, { viewerLang: viewerLangPromise });
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

DashboardListManagePage.propTypes = {
  params: PropTypes.shape({
    id: PropTypes.string,
  }),
};
