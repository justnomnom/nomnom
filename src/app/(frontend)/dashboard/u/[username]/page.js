import PropTypes from 'prop-types';
import { notFound } from 'next/navigation';

import { APP } from 'src/config-global';
import { getDefaultTranslation } from 'src/locales/default-translations';
import { fetchViewerFollowsUser } from 'src/auth/actions/profile-actions';
import { fetchPublicProfileByUsername } from 'src/libs/lists/actions';
import { getSupabaseAuthUser } from 'src/libs/supabase/supabase-server-client';

import { DynamicTitle } from 'src/components/dynamic-title';

import { UserPublicProfileDashboardShell } from 'src/sections/lists/view';

// ----------------------------------------------------------------------

export async function generateMetadata({ params }) {
  const { username } = await params;
  const raw = (username ?? '').trim();
  if (!raw) {
    return { title: `${getDefaultTranslation('pages.dashboard.settings.title')} — ${APP.name}` };
  }
  const { profile, error } = await fetchPublicProfileByUsername(raw);
  if (error === 'not_found' || !profile) {
    return { title: `${getDefaultTranslation('pages.dashboard.settings.title')} — ${APP.name}` };
  }
  const titleName = profile.display_name || (profile.username ? `@${profile.username}` : raw);
  const template = getDefaultTranslation('pages.lists.user_document_title');
  const base =
    typeof template === 'string' ? template.replace(/\{\{\s*name\s*\}\}/g, titleName) : titleName;
  return { title: `${base} — ${APP.name}` };
}

export default async function DashboardUserPublicProfilePage({ params }) {
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
      <UserPublicProfileDashboardShell
        profile={profile}
        lists={lists}
        recentActivity={recentActivity}
        viewerUserId={viewerUserId}
        initialFollowing={initialFollowing}
      />
    </>
  );
}

DashboardUserPublicProfilePage.propTypes = {
  params: PropTypes.shape({
    username: PropTypes.string,
  }),
};
