import PropTypes from 'prop-types';
import { notFound, redirect } from 'next/navigation';

import Box from '@mui/material/Box';

import { paths } from 'src/routes/paths';
import { restaurantHrefWithFrom } from 'src/routes/restaurant-nav-from';

import { getDefaultTranslation } from 'src/locales/default-translations';
import { getSupabaseAuthUser } from 'src/libs/supabase/supabase-server-client';
import {
  RESTAURANT_ID_UUID_RE,
  fetchRestaurantByIdForSsr,
} from 'src/libs/restaurant/fetch-restaurant-by-id-for-ssr';

import { DynamicTitle } from 'src/components/dynamic-title';

import PublicRestaurantShareClient from './public-restaurant-share-client';

// ----------------------------------------------------------------------

export async function generateMetadata({ params }) {
  const { id } = await params;
  const noIndex = { robots: { index: false, follow: false } };

  if (!RESTAURANT_ID_UUID_RE.test(id)) {
    return {
      title: getDefaultTranslation('pages.dashboard.restaurant.not_found_title'),
      ...noIndex,
    };
  }
  const restaurant = await fetchRestaurantByIdForSsr(id);
  if (!restaurant) {
    return {
      title: getDefaultTranslation('pages.dashboard.restaurant.not_found_title'),
      ...noIndex,
    };
  }
  const description = getDefaultTranslation('pages.dashboard.restaurant.public_meta_description');
  return {
    title: restaurant.name,
    description,
    ...noIndex,
    openGraph: {
      title: restaurant.name,
      description,
      type: 'website',
      // No `images`: the colocated `opengraph-image.tsx` supplies the card.
    },
    // Without this block Twitter fell through to the root layout's metadata, so a shared spot
    // previewed as "NomNom" with the generic tagline instead of the restaurant's own name.
    twitter: {
      card: 'summary_large_image',
      title: restaurant.name,
      description,
    },
  };
}

export default async function PublicRestaurantSharePage({ params, searchParams }) {
  const { id } = await params;
  if (!RESTAURANT_ID_UUID_RE.test(id)) {
    notFound();
  }

  // Auth first so logged-in redirects skip the restaurant fetch (async-defer-await).
  const {
    data: { user },
  } = await getSupabaseAuthUser();
  if (user) {
    const sp = await searchParams;
    const from = typeof sp?.from === 'string' ? sp.from : null;
    const listId = typeof sp?.listId === 'string' ? sp.listId : null;
    redirect(
      from
        ? restaurantHrefWithFrom(paths.dashboard.restaurant(id), from, { listId })
        : paths.dashboard.restaurant(id)
    );
  }

  const restaurant = await fetchRestaurantByIdForSsr(id);
  if (!restaurant) {
    notFound();
  }

  return (
    <>
      <DynamicTitle
        titleKey="pages.dashboard.restaurant.document_title"
        titleValues={{ name: restaurant.name }}
      />
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <PublicRestaurantShareClient restaurant={restaurant} />
      </Box>
    </>
  );
}

PublicRestaurantSharePage.propTypes = {
  params: PropTypes.shape({
    id: PropTypes.string,
  }),
  searchParams: PropTypes.oneOfType([PropTypes.object, PropTypes.instanceOf(Promise)]),
};
