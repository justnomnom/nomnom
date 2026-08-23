// NomNom — Restaurant Spotlight v2 (16s, 1080×1920).
// Food-first arc: plate → identity → review → map+CTA.
import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { C } from '../../theme';
import { SCENE_TIMING } from './constants';
import { Scene1Plate } from './scenes/Scene1Plate';
import { Scene2Identity } from './scenes/Scene2Identity';
import { Scene3Review } from './scenes/Scene3Review';
import { Scene4Resolve } from './scenes/Scene4Resolve';

// Prefer a plate shot over interior ambience for the cold open.
const HERO_PHOTO =
  'https://jxknitagufcuyeozlazc.supabase.co/storage/v1/object/public/restaurant_images/ChIJJdWF8X80GQ0ReranKW4bn14/1.jpg';

export const defaultRestaurantSpotlightProps = {
  hookOverline: 'Lisboa · right now',
  hookLines: ['Locals', "won't stop", 'talking about', 'this spot.'],
  restaurant: {
    name: 'Volta dos Sabores',
    nameLines: ['Volta dos', 'Sabores'],
    tagline: 'Romantic · Casual · Coffee · Lisboa',
    location: 'Lisboa',
    rating: 4.8,
    address: 'R. da Barroca 106, 1200-043 Lisboa',
    savedBy: '+2,784',
    circleLabel: 'Loved by the NomNom community',
    mapImage: 'maps/volta-dos-sabores.png',
  },
  chips: [
    { emoji: 'sparkles', label: 'Romantic' },
    { emoji: 'sparkles', label: 'Casual' },
    { emoji: 'hot-beverage', label: 'Coffee' },
  ],
  badgeText: 'In your NomNom Circle',
  review: {
    init: 'CB',
    name: 'Charlotte Bae',
    handle: '',
    tint: '#FCE7C8',
    tintInk: '#B45309',
    score: 5,
    quote: 'Choriço, bacalhau com nata, grilled sardines — everything delicious, service exceptional.',
    dish: 'Bacalhau com nata',
    emoji: 'fork-and-knife',
    photo: HERO_PHOTO,
  },
  heroPhoto: HERO_PHOTO,
  cta: {
    headlineLines: ["Don't take", 'our word.'],
    subLines: ['Take theirs. Save the spots people you trust recommend.'],
    button: 'Save this spot',
    footer: 'Join the Nom Nom Circle · justnomnom.com',
  },
};

/** Main composition: Plate → Identity → Review → Map+CTA. */
export const RestaurantSpotlight = (props) => {
  const p = { ...defaultRestaurantSpotlightProps, ...props };
  const review = p.review || (p.reviews && p.reviews[0]) || defaultRestaurantSpotlightProps.review;
  const heroPhoto = p.heroPhoto || review.photo;

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Sequence from={SCENE_TIMING.plate.start} durationInFrames={SCENE_TIMING.plate.duration}>
        <Scene1Plate overline={p.hookOverline} lines={p.hookLines} photo={heroPhoto} />
      </Sequence>
      <Sequence from={SCENE_TIMING.identity.start} durationInFrames={SCENE_TIMING.identity.duration}>
        <Scene2Identity restaurant={p.restaurant} chips={p.chips} photo={heroPhoto} />
      </Sequence>
      <Sequence from={SCENE_TIMING.review.start} durationInFrames={SCENE_TIMING.review.duration}>
        <Scene3Review review={review} badgeText={p.badgeText} />
      </Sequence>
      <Sequence from={SCENE_TIMING.resolve.start} durationInFrames={SCENE_TIMING.resolve.duration}>
        <Scene4Resolve restaurant={p.restaurant} review={review} cta={p.cta} />
      </Sequence>
    </AbsoluteFill>
  );
};
