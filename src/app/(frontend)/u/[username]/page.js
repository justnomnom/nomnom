import { Suspense } from 'react';
import PropTypes from 'prop-types';
import { notFound } from 'next/navigation';

import { ogText } from 'src/libs/og/og-text';
import { getSiteUrl } from 'src/libs/site-url';
import { fetchOgProfile } from 'src/libs/og/fetch-og-profile';
import { fetchPublicProfileByUsername } from 'src/libs/lists/actions';
import { fetchViewerFollowsUser } from 'src/auth/actions/profile-actions';
import { getSupabaseAuthUser } from 'src/libs/supabase/supabase-server-client';

import { DynamicTitle } from 'src/components/dynamic-title';

import { UserPublicProfileView } from 'src/sections/lists/view';
import PublicUserProfileMarketingSkeleton from 'src/sections/lists/view/public-user-profile-marketing-skeleton';

// ----------------------------------------------------------------------

/**
 * Public profiles had no metadata at all, so every pasted link rendered bare.
 *
 * `openGraph.images` is deliberately omitted: Next fills it from the colocated
 * `opengraph-image.tsx` / `twitter-image.tsx`, and setting it here would override them.
 */
export async function generateMetadata({ params }) {
  const { username } = await params;
  const handle = (username ?? '').trim().replace(/^@/, '');
  if (!handle) return {};

  const profile = await fetchOgProfile(handle).catch(() => null);
  const name = profile?.displayName || `@${profile?.handle || handle}`;
  const title = ogText('pages.lists.user_document_title', { name });
  const description = profile?.bio || ogText('pages.lists.og_profile_description', { name });
  const pageUrl = `${getSiteUrl()}/u/${encodeURIComponent(profile?.handle || handle)}`;

  return {
    title,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

/**
 * Streams public profile payload under Suspense (async-suspense-boundaries).
 */
async function PublicUserProfilePageContent({ raw }) {
  const [{ profile, lists, recentActivity, error }, authResult] = await Promise.all([
    fetchPublicProfileByUsername(raw),
    getSupabaseAuthUser(),
  ]);
  if (error === 'not_found' || !profile) {
    notFound();
  }

  const titleName = profile.display_name || (profile.username ? `@${profile.username}` : raw);

  const {
    data: { user },
  } = authResult;
  const viewerUserId = user?.id ?? null;
  let initialFollowing = false;
  if (viewerUserId && viewerUserId !== profile.id) {
    const f = await fetchViewerFollowsUser(profile.id);
    initialFollowing = f.following;
  }

  return (
    <>
      <DynamicTitle titleKey="pages.lists.user_document_title" titleValues={{ name: titleName }} />
      <UserPublicProfileView
        profile={profile}
        lists={lists}
        recentActivity={recentActivity}
        viewerUserId={viewerUserId}
        initialFollowing={initialFollowing}
      />
    </>
  );
}

PublicUserProfilePageContent.propTypes = {
  raw: PropTypes.string.isRequired,
};

export default async function PublicUserProfilePage({ params }) {
  const { username } = await params;
  const raw = (username ?? '').trim();
  if (!raw) {
    notFound();
  }

  return (
    <Suspense fallback={<PublicUserProfileMarketingSkeleton />}>
      <PublicUserProfilePageContent raw={raw} />
    </Suspense>
  );
}

PublicUserProfilePage.propTypes = {
  params: PropTypes.shape({
    username: PropTypes.string,
  }),
};
