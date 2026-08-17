import PropTypes from 'prop-types';

import TableView from 'src/sections/table/table-view';

// ----------------------------------------------------------------------

/**
 * `/table/[id]` — auth-free Table: shortlist, vote, settle.
 */
export default async function TablePage({ params }) {
  const { id } = await params;
  return <TableView tableId={id} />;
}

TablePage.propTypes = {
  params: PropTypes.oneOfType([PropTypes.object, PropTypes.instanceOf(Promise)]),
};
