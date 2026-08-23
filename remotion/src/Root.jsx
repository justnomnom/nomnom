import React from 'react';
import { Composition } from 'remotion';
import { RestaurantReviewsReel } from './RestaurantReviewsReel';
import {
  RestaurantSpotlight,
  defaultRestaurantSpotlightProps,
} from './compositions/RestaurantSpotlight';
import { DURATION_FRAMES, FPS as SPOT_FPS, HEIGHT, WIDTH } from './compositions/RestaurantSpotlight/constants';
import {
  ListShowcase,
  defaultListShowcaseProps,
  getListShowcaseDuration,
} from './compositions/ListShowcase';
import { FPS as LIST_FPS, WIDTH as LIST_W, HEIGHT as LIST_H } from './compositions/ListShowcase/constants';
import {
  FeatureReel,
  defaultFeatureReelProps,
  getFeatureReelDuration,
} from './compositions/FeatureShowcase';
import {
  FeatureSlideshow,
  defaultFeatureSlideshowProps,
} from './compositions/FeatureShowcase/Slideshow';
import {
  FPS as FEATURE_FPS,
  REEL_W,
  REEL_H,
  SLIDE_W,
  SLIDE_H,
  getFeatureSlideshowDuration,
} from './compositions/FeatureShowcase/constants';
import { FPS, buildTimeline } from './timeline';

// Default showcase: Volta dos Sabores (Lisboa) — mirrors props/volta-dos-sabores.json
// Override anytime via Remotion Studio or --props on the CLI.
const defaultProps = {
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
  reviews: [
    {
      init: 'TF',
      name: 'Thomas Fowler',
      handle: '',
      tint: '#FFE8DF',
      tintInk: '#B8481F',
      follows: false,
      score: 5,
      quote:
        'My wife and I lucked into a wonderful dinner this evening.  We were looking for a restaurant that served local Portuguese dishes and felt like…',
      dish: 'Portuguese Food',
      emoji: 'fork-and-knife',
      photo:
        'https://jxknitagufcuyeozlazc.supabase.co/storage/v1/object/public/restaurant_images/ChIJJdWF8X80GQ0ReranKW4bn14/0.jpg',
    },
    {
      init: 'CB',
      name: 'Charlotte Bae',
      handle: '',
      tint: '#FCE7C8',
      tintInk: '#B45309',
      follows: false,
      score: 5,
      quote:
        'We ordered choriço, bacalhau com nata, and grilled sardines with orange almond flour cake. Everything was delicious and the service was exceptional.…',
      dish: 'Octopus',
      emoji: 'fork-and-knife',
      photo:
        'https://jxknitagufcuyeozlazc.supabase.co/storage/v1/object/public/restaurant_images/ChIJJdWF8X80GQ0ReranKW4bn14/1.jpg',
    },
    {
      init: 'JC',
      name: 'Juan Coronado',
      handle: '',
      tint: '#E7DCC9',
      tintInk: '#6e6657',
      follows: false,
      score: 5,
      quote:
        'Rita was amazing, we kind of settled for inside seating, is like she could read our minds, she quickly noticed that we wanted to seat outside and she…',
      dish: 'Chorizo',
      emoji: 'fork-and-knife',
      photo:
        'https://jxknitagufcuyeozlazc.supabase.co/storage/v1/object/public/restaurant_images/ChIJJdWF8X80GQ0ReranKW4bn14/2.jpg',
    },
  ],
  consensus: {
    quote:
      'Visitors consistently praise the authentic Portuguese food, exceptional service, and cozy atmosphere at Volta dos Sabores.',
    loves: [
      'Authentic and delicious Portuguese dishes, especially cod, grilled fish, and peri-peri…',
      'Outstanding service with attentive, friendly, and knowledgeable staff',
      'Perfect table placement and welcoming staff who accommodate preferences',
    ],
    knows: [],
    dishes: [
      ['Portuguese Food', 108],
      ['Octopus', 83],
      ['Chorizo', 76],
      ['Paella', 72],
      ['Sangria', 43],
    ],
    reviewCount: '2,784',
  },
  cta: {
    headlineLines: ["Don't take", 'our word.'],
    subLines: ['Take theirs. The spots people you', "trust can't stop recommending."],
    button: 'Save this spot',
    footer: 'Join the Nom Nom Circle · justnomnom.com',
  },
};

export const RemotionRoot = () => (
  <>
    <Composition
      id="RestaurantReviewsReel"
      component={RestaurantReviewsReel}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={Math.round(buildTimeline(defaultProps.reviews.length).total * FPS)}
      defaultProps={defaultProps}
      calculateMetadata={({ props }) => ({
        durationInFrames: Math.round(buildTimeline(props.reviews.length).total * FPS),
      })}
    />
    <Composition
      id="RestaurantSpotlight"
      component={RestaurantSpotlight}
      width={WIDTH}
      height={HEIGHT}
      fps={SPOT_FPS}
      durationInFrames={DURATION_FRAMES}
      defaultProps={defaultRestaurantSpotlightProps}
    />
    <Composition
      id="ListShowcase"
      component={ListShowcase}
      width={LIST_W}
      height={LIST_H}
      fps={LIST_FPS}
      durationInFrames={getListShowcaseDuration(defaultListShowcaseProps)}
      defaultProps={defaultListShowcaseProps}
      calculateMetadata={({ props }) => ({
        durationInFrames: getListShowcaseDuration(props),
      })}
    />
    <Composition
      id="FeatureReel"
      component={FeatureReel}
      width={REEL_W}
      height={REEL_H}
      fps={FEATURE_FPS}
      durationInFrames={getFeatureReelDuration()}
      defaultProps={defaultFeatureReelProps}
    />
    <Composition
      id="FeatureSlideshow"
      component={FeatureSlideshow}
      width={SLIDE_W}
      height={SLIDE_H}
      fps={FEATURE_FPS}
      durationInFrames={getFeatureSlideshowDuration()}
      defaultProps={defaultFeatureSlideshowProps}
    />
  </>
);
