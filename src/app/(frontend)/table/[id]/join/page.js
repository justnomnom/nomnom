import PropTypes from 'prop-types';

import TableJoinView from 'src/sections/table/table-join-view';

// ----------------------------------------------------------------------

/**
 * `/table/[id]/join` — take a seat with a name before voting.
 */
export default async function TableJoinPage({ params }) {
  const { id } = await params;
  return <TableJoinView tableId={id} />;
}

TableJoinPage.propTypes = {
  params: PropTypes.oneOfType([PropTypes.object, PropTypes.instanceOf(Promise)]),
};
