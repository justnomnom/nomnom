import PropTypes from 'prop-types';

import { getTableDocumentTitle } from 'src/libs/lists/table-document-title';

import { DynamicTitle } from 'src/components/dynamic-title';

import TableView from 'src/sections/table/table-view';

// ----------------------------------------------------------------------

export async function generateMetadata({ params }) {
  const { id } = await params;
  const { title } = await getTableDocumentTitle(id);
  return { title };
}

/**
 * `/table/[id]` — auth-free Table: shortlist, vote, settle.
 */
export default async function TablePage({ params }) {
  const { id } = await params;
  const { name, missing } = await getTableDocumentTitle(id);

  return (
    <>
      {missing ? (
        <DynamicTitle titleKey="pages.table.not_found_title" />
      ) : (
        <DynamicTitle titleKey="pages.table.document_title" titleValues={{ name }} />
      )}
      <TableView tableId={id} />
    </>
  );
}

TablePage.propTypes = {
  params: PropTypes.oneOfType([PropTypes.object, PropTypes.instanceOf(Promise)]),
};
