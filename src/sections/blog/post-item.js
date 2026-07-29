import PropTypes from 'prop-types';

import Link from '@mui/material/Link';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useResponsive } from 'src/hooks/use-responsive';

import { fDate } from 'src/utils/format-time';
import { paramCase } from 'src/utils/change-case';

import Image from 'src/components/image';
import TextMaxLine from 'src/components/text-max-line';

// ----------------------------------------------------------------------

function normalizePostForCard(post) {
  if (!post) return {};

  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    coverUrl: post.coverUrl || post.featuredImage?.url || '/assets/images/cover/cover_1.jpg',
    createdAt: post.publishedAt || post.createdAt,
  };
}

// ----------------------------------------------------------------------

export default function PostItem({ post, index }) {
  const theme = useTheme();

  const mdUp = useResponsive('up', 'md');

  // Normalize list card fields (CMS-agnostic)
  const transformedPost = normalizePostForCard(post);
  const { coverUrl, title, slug, createdAt } = transformedPost;

  const latestPost = index === 0 || index === 1 || index === 2;

  if (mdUp && latestPost) {
    return (
      <Card sx={{ mb: 3 }}>
        <PostContent title={title} slug={slug} createdAt={createdAt} index={index} />

        <Image
          alt={title}
          src={coverUrl}
          overlay={alpha(theme.palette.grey[900], 0.48)}
          sx={{
            width: 1,
            height: 360,
          }}
        />
      </Card>
    );
  }

  return (
    <Card sx={{ mb: 3 }}>
      <Image alt={title} src={coverUrl} ratio="4/3" />

      <PostContent title={title} slug={slug} createdAt={createdAt} />
    </Card>
  );
}

PostItem.propTypes = {
  index: PropTypes.number,
  post: PropTypes.object,
};

// ----------------------------------------------------------------------

export function PostContent({ title, slug, createdAt, index }) {
  const mdUp = useResponsive('up', 'md');

  const linkTo = paths.post.details(slug || paramCase(title));

  const latestPostLarge = index === 0;

  const latestPostSmall = index === 1 || index === 2;

  return (
    <CardContent
      sx={{
        pt: 3,
        width: 1,
        ...((latestPostLarge || latestPostSmall) && {
          pt: 0,
          zIndex: 9,
          bottom: 0,
          position: 'absolute',
          color: 'common.white',
        }),
      }}
    >
      <Typography
        variant="caption"
        component="div"
        sx={{
          mb: 1,
          color: 'text.disabled',
          ...((latestPostLarge || latestPostSmall) && {
            opacity: 0.64,
            color: 'common.white',
          }),
        }}
      >
        {fDate(createdAt)}
      </Typography>

      <Link color="inherit" component={RouterLink} href={linkTo}>
        <TextMaxLine variant={mdUp && latestPostLarge ? 'h5' : 'subtitle2'} line={2} persistent>
          {title}
        </TextMaxLine>
      </Link>
    </CardContent>
  );
}

PostContent.propTypes = {
  createdAt: PropTypes.string,
  index: PropTypes.number,
  slug: PropTypes.string,
  title: PropTypes.string,
};
