import PropTypes from 'prop-types';

import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';

import { RouterLink } from 'src/routes/components';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales/use-locales';

import Iconify from 'src/components/iconify';
import EmptyContent from 'src/components/empty-content/empty-content';

import PostItem from './post-item';
import { PostItemSkeleton } from './post-skeleton';

// ----------------------------------------------------------------------

export default function PostList({
  posts,
  loading,
  disabledIndex,
  empty = false,
  skeletonCount = 16,
}) {
  const { t } = useTranslate();

  const renderSkeleton = (
    <>
      {[...Array(skeletonCount)].map((_, index) => (
        <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
          <PostItemSkeleton />
        </Grid>
      ))}
    </>
  );

  const renderEmpty = (
    <Container sx={{ my: 10 }}>
      <EmptyContent
        filled
        title={t('components.empty_content.no_posts.title')}
        description={t('components.empty_content.no_posts.description')}
        action={
          <Button
            component={RouterLink}
            href="/"
            startIcon={<Iconify icon={ic.arrowIosBackFill} width={16} />}
            sx={{ mt: 3 }}
          >
            {t('components.empty_content.no_posts.return_home')}
          </Button>
        }
        sx={{ py: 10 }}
      />
    </Container>
  );

  const renderList = (
    <>
      {posts.map((post, index) => (
        <Grid key={post.id} size={{ xs: 12, sm: 6, md: !disabledIndex && index === 0 ? 6 : 3 }}>
          <PostItem post={post} index={!disabledIndex ? index : undefined} />
        </Grid>
      ))}
    </>
  );

  // Show empty state when not loading and no posts
  if (!loading && (empty || !posts?.length)) {
    return renderEmpty;
  }

  return (
    <>
      <Grid container spacing={3}>
        {loading ? renderSkeleton : renderList}
      </Grid>

      {posts?.length > 8 && (
        <Stack
          alignItems="center"
          sx={{
            mt: 4,
            mb: { xs: 6, md: 8 },
          }}
        >
          <Button
            size="large"
            variant="outlined"
            startIcon={<Iconify icon={ic.spinner12Dots} width={24} />}
          >
            {t('components.empty_content.blog.load_more')}
          </Button>
        </Stack>
      )}
    </>
  );
}

PostList.propTypes = {
  disabledIndex: PropTypes.bool,
  loading: PropTypes.bool,
  posts: PropTypes.array,
  empty: PropTypes.bool,
  skeletonCount: PropTypes.number,
};
