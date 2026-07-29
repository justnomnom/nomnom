import PropTypes from 'prop-types';
import { notFound } from 'next/navigation';

import { fetchViewerFollowsUser } from 'src/auth/actions/profile-actions';
import { fetchPublicProfileByUsername } from 'src/auth/actions/list-actions';
import { getSupabaseAuthUser } from 'src/libs/supabase/supabase-server-client';

import { DynamicTitle } from 'src/components/dynamic-title';

import { UserPublicProfileView } from 'src/sections/lists/view';

// ----------------------------------------------------------------------

export default async function PublicUserProfilePage({ params }) {
  const { username } = await params;
  const raw = (username ?? '').trim();
  if (!raw) {
    notFound();
  }

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

PublicUserProfilePage.propTypes = {
  params: PropTypes.shape({
    username: PropTypes.string,
  }),
};
