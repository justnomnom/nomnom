import PropTypes from 'prop-types';
import { notFound, redirect } from 'next/navigation';

import { getSiteUrl } from 'src/libs/site-url';
import { getServerViewerLang } from 'src/libs/i18n-server';
import { fetchListPage, fetchListMetadata } from 'src/libs/lists/actions';

import { DynamicTitle } from 'src/components/dynamic-title';

import { ListPublicView } from 'src/sections/lists/view';

// ----------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }) {
  const { creatorHandle: id } = await params;
  if (!UUID_RE.test(id)) return {};
  const meta = await fetchListMetadata(id);
  if (!meta) return {};

  const siteUrl = getSiteUrl();
  const uuidUrl = `${siteUrl}/lists/${id}`;
  const slugUrl =
    meta.ownerUsername && meta.slug ? `${siteUrl}/lists/${meta.ownerUsername}/${meta.slug}` : null;
  const pageUrl = slugUrl ?? uuidUrl;
  const description =
    meta.description ||
    (meta.ownerName
      ? `A curated restaurant list by ${meta.ownerName}`
      : 'A curated restaurant list');

  return {
    title: meta.name,
    description,
    alternates: { canonical: pageUrl },
    openGraph: {
      title: meta.name,
      description,
      url: pageUrl,
      type: 'website',
      // No `images`: the colocated `opengraph-image.tsx` renders the list's own name, owner
      // and spot count. Setting `images` here would override it — and a list without a cover
      // photo used to fall back to the generic brand card, which named nothing.
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.name,
      description,
    },
  };
}

export default async function PublicListPage({ params, searchParams }) {
  const { creatorHandle: id } = await params;
  if (!UUID_RE.test(id)) {
    notFound();
  }

  const viewerLangPromise = getServerViewerLang();
  const data = await fetchListPage(id, { viewerLang: viewerLangPromise });
  if (data.error === 'not_found' || data.error === 'not_public' || !data.list) {
    notFound();
  }

  // Redirect UUID URL → slug URL when slug is available (301 for SEO)
  const listSlug = data.list.slug;
  const ownerUsername = data.owner?.username;
  if (listSlug && ownerUsername) {
    const sp = await searchParams;
    const qs = sp && Object.keys(sp).length > 0 ? `?${new URLSearchParams(sp).toString()}` : '';
    redirect(`/lists/${ownerUsername}/${listSlug}${qs}`);
  }

  return (
    <>
      <DynamicTitle titleKey="pages.lists.document_title" titleValues={{ name: data.list.name }} />
      <ListPublicView
        list={data.list}
        items={data.items}
        owner={data.owner}
        error={data.error}
        membership={data.membership}
        paidAccess={data.paidAccess}
      />
    </>
  );
}

PublicListPage.propTypes = {
  params: PropTypes.shape({
    creatorHandle: PropTypes.string,
  }),
  searchParams: PropTypes.object,
};
