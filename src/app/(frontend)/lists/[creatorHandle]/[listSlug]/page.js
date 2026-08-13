import { Suspense } from 'react';
import PropTypes from 'prop-types';
import { notFound } from 'next/navigation';

import { getSiteUrl } from 'src/libs/site-url';
import { getServerViewerLang } from 'src/libs/i18n-server';
import { fetchListPage, resolveListSlug, fetchListMetadata } from 'src/libs/lists/actions';

import { DynamicTitle } from 'src/components/dynamic-title';

import { ListPublicView } from 'src/sections/lists/view';
import PublicListPageSkeleton from 'src/sections/lists/view/public-list-page-skeleton';

// ----------------------------------------------------------------------

export async function generateMetadata({ params }) {
  const { creatorHandle, listSlug } = await params;
  const listId = await resolveListSlug(creatorHandle, listSlug);
  if (!listId) return {};
  const meta = await fetchListMetadata(listId);
  if (!meta) return {};

  const siteUrl = getSiteUrl();
  const pageUrl = `${siteUrl}/lists/${creatorHandle}/${listSlug}`;
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

/**
 * Streams slug list payload under Suspense (async-suspense-boundaries).
 */
async function SlugListPageContent({ creatorHandle, listSlug }) {
  const viewerLangPromise = getServerViewerLang();
  const listId = await resolveListSlug(creatorHandle, listSlug);
  if (!listId) notFound();

  const data = await fetchListPage(listId, { viewerLang: viewerLangPromise });
  if (data.error === 'not_found' || data.error === 'not_public' || !data.list) {
    notFound();
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

SlugListPageContent.propTypes = {
  creatorHandle: PropTypes.string.isRequired,
  listSlug: PropTypes.string.isRequired,
};

export default async function SlugListPage({ params }) {
  const { creatorHandle, listSlug } = await params;

  return (
    <Suspense fallback={<PublicListPageSkeleton />}>
      <SlugListPageContent creatorHandle={creatorHandle} listSlug={listSlug} />
    </Suspense>
  );
}

SlugListPage.propTypes = {
  params: PropTypes.shape({
    creatorHandle: PropTypes.string,
    listSlug: PropTypes.string,
  }),
};
