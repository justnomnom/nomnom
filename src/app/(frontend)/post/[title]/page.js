import PropTypes from 'prop-types';

import { PostDetailsHomeView } from 'src/sections/blog/view';

// ----------------------------------------------------------------------

export const metadata = {
  title: 'Post: Details',
};

export default async function PostDetailsHomePage({ params }) {
  const { title } = await params;

  return <PostDetailsHomeView title={title} />;
}

export const dynamic = 'force-dynamic';

PostDetailsHomePage.propTypes = {
  params: PropTypes.shape({
    title: PropTypes.string,
  }),
};
