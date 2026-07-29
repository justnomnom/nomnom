'use client';

import PropTypes from 'prop-types';
import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';

import Alert from '@mui/material/Alert';
import Container from '@mui/material/Container';

import { useTranslate } from 'src/locales';
import { useAuthContext } from 'src/auth/hooks';

import { RestaurantDetailView } from 'src/sections/restaurant/view';
import RestaurantPublicAuthPrompt from 'src/sections/restaurant/restaurant-public-auth-prompt';

const AUTO_PROMPT_DELAY_MS = 10_000;

export default function PublicRestaurantShareClient({ restaurant, restaurantId }) {
  const { t } = useTranslate();
  const searchParams = useSearchParams();
  const { authenticated, loading } = useAuthContext();
  const [authPromptOpen, setAuthPromptOpen] = useState(false);
  const fromRoulette = searchParams.get('from') === 'roleta';

  const openAuthPrompt = useCallback(() => setAuthPromptOpen(true), []);
  const closeAuthPrompt = useCallback(() => setAuthPromptOpen(false), []);

  useEffect(() => {
    if (loading || authenticated) return undefined;
    const tmr = window.setTimeout(() => setAuthPromptOpen(true), AUTO_PROMPT_DELAY_MS);
    return () => window.clearTimeout(tmr);
  }, [authenticated, loading]);

  useEffect(() => {
    if (authenticated) setAuthPromptOpen(false);
  }, [authenticated]);

  return (
    <>
      {fromRoulette ? (
        <Container maxWidth="lg" sx={{ pt: 2 }}>
          <Alert severity="success" variant="outlined">
            {t('pages.public.roulette.lisboa.result_badge')}
          </Alert>
        </Container>
      ) : null}
      <RestaurantDetailView
        restaurant={restaurant}
        savedListIds={[]}
        savedLists={[]}
        followCircle={null}
        reviews={[]}
        listMentions={[]}
        myUserId={null}
        showListsAndReviews={false}
        analyticsSurface="public"
        onGuestSaveClick={openAuthPrompt}
      />
      <RestaurantPublicAuthPrompt
        restaurantId={restaurantId}
        open={authPromptOpen}
        onClose={closeAuthPrompt}
      />
    </>
  );
}

PublicRestaurantShareClient.propTypes = {
  restaurant: PropTypes.object.isRequired,
  restaurantId: PropTypes.string.isRequired,
};
