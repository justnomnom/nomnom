import PropTypes from 'prop-types';

import { getTableDocumentTitle } from 'src/libs/lists/table-document-title';

import { DynamicTitle } from 'src/components/dynamic-title';

import TableJoinView from 'src/sections/table/table-join-view';

// ----------------------------------------------------------------------

export async function generateMetadata({ params }) {
  const { id } = await params;
  const { title } = await getTableDocumentTitle(id);
  return { title };
}

/**
 * `/table/[id]/join` — take a seat with a name before voting.
 */
export default async function TableJoinPage({ params }) {
  const { id } = await params;
  const { name, missing } = await getTableDocumentTitle(id);

  return (
    <>
      {missing ? (
        <DynamicTitle titleKey="pages.table.not_found_title" />
      ) : (
        <DynamicTitle titleKey="pages.table.document_title" titleValues={{ name }} />
      )}
      <TableJoinView tableId={id} />
    </>
  );
}

TableJoinPage.propTypes = {
  params: PropTypes.oneOfType([PropTypes.object, PropTypes.instanceOf(Promise)]),
};
