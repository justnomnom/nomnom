'use client';

import PropTypes from 'prop-types';

import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { ic } from 'src/assets/icons';
import { useTranslate } from 'src/locales/use-locales';
import { useGetPost, useGetLatestPosts } from 'src/api/blog';

import Iconify from 'src/components/iconify';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import EmptyContent from 'src/components/empty-content/empty-content';
import { RichTextRenderer } from 'src/components/blog/rich-text-renderer';

import PostList from '../post-list';
import PostDetailsHero from '../post-details-hero';
import { PostDetailsSkeleton } from '../post-skeleton';

export default function PostDetailsHomeView({ title }) {
  const { t } = useTranslate();

  const { post, postError, postLoading } = useGetPost(title);

  const { latestPosts, latestPostsLoading } = useGetLatestPosts(title);
  const latestPostsSafe = Array.isArray(latestPosts) ? latestPosts : [];

  const renderSkeleton = <PostDetailsSkeleton />;

  const renderError = (
    <Container sx={{ my: 10 }}>
      <EmptyContent
        filled
        title={t('components.empty_content.post_not_found.title')}
        description={t('components.empty_content.post_not_found.description')}
        action={
          <Button
            component={RouterLink}
            href={paths.post.root}
            startIcon={<Iconify icon={ic.arrowIosBackFill} width={16} />}
            sx={{ mt: 3 }}
          >
            {t('components.empty_content.post_not_found.back_to_blog')}
          </Button>
        }
        sx={{ py: 10 }}
      />
    </Container>
  );

  const renderPost = post && post.id && (
    <>
      <PostDetailsHero
        title={post.title || ''}
        author={post.author || {}}
        coverUrl={post.coverUrl || ''}
        createdAt={post.createdAt || ''}
      />

      <Container
        maxWidth={false}
        sx={{
          py: 2,
          mb: 3,
          borderBottom: (theme) => `solid 1px ${theme.palette.divider}`,
        }}
      >
        <CustomBreadcrumbs
          links={[
            {
              name: t('navigation.home'),
              href: '/',
            },
            {
              name: t('components.empty_content.blog.title'),
              href: paths.post.root,
            },
            {
              name: post?.title,
            },
          ]}
          sx={{ maxWidth: 720, mx: 'auto' }}
        />
      </Container>

      <Container maxWidth={false}>
        <Stack sx={{ maxWidth: 720, mx: 'auto', pb: 4 }}>
          {post.description && (
            <Typography variant="subtitle1" sx={{ mb: 3 }}>
              {post.description}
            </Typography>
          )}

          {post.content && <RichTextRenderer content={post.content} />}

          <Stack
            spacing={2}
            sx={{
              py: 2,
              borderTop: (theme) =>
                `1px solid ${
                  theme.palette.mode === 'light' ? theme.palette.grey[300] : theme.palette.divider
                }`,
              borderBottom: (theme) =>
                `1px solid ${
                  theme.palette.mode === 'light' ? theme.palette.grey[300] : theme.palette.divider
                }`,
            }}
          >
            {post.tags && post.tags.length > 0 && (
              <Stack direction="row" flexWrap="wrap" spacing={1}>
                {post.tags.map((tag) => (
                  <Chip key={tag} label={tag} variant="soft" />
                ))}
              </Stack>
            )}
          </Stack>
        </Stack>
      </Container>
    </>
  );

  const renderLatestPosts = (
    <>
      <Typography variant="h4" sx={{ mb: 3 }}>
        {t('components.empty_content.blog.recent_posts')}
      </Typography>

      <PostList
        posts={
          latestPostsLoading ? [] : latestPostsSafe.slice(Math.max(0, latestPostsSafe.length - 4))
        }
        loading={latestPostsLoading}
        disabledIndex
        empty={false}
        skeletonCount={4}
      />
    </>
  );

  // Show skeleton while loading or if we have no post data yet
  if (postLoading || (!post && !postError)) {
    return renderSkeleton;
  }

  // Show error if there's an error and no post
  if (postError && !post) {
    return renderError;
  }

  // Show post content if we have it
  if (post && post.id) {
    return (
      <>
        {renderPost}

        <Container sx={{ pb: 8 }}>
          {(latestPostsLoading || (latestPosts && latestPosts.length > 0)) && renderLatestPosts}
        </Container>
      </>
    );
  }

  // Fallback to error if no post found
  return renderError;
}

PostDetailsHomeView.propTypes = {
  title: PropTypes.string,
};
