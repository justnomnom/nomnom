// NomNom — List Showcase (9:16). Intro → spot cards → grid recap → CTA.
import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { C } from '../../theme';
import { buildListTimeline } from './constants';
import { Scene1ListIntro } from './scenes/Scene1ListIntro';
import { Scene2Spot } from './scenes/Scene2Spot';
import { Scene3Recap } from './scenes/Scene3Recap';
import { Scene4ListCTA } from './scenes/Scene4ListCTA';

const img = (placeId, n = 0) =>
  `https://jxknitagufcuyeozlazc.supabase.co/storage/v1/object/public/restaurant_images/${placeId}/${n}.jpg`;

export const defaultListShowcaseProps = {
  list: {
    title: 'Caldas must-gos',
    titleLines: ['Caldas', 'must-gos'],
    subtitle: 'Four tables worth the drive · West coast Portugal',
    location: 'Caldas da Rainha',
  },
  creator: {
    name: 'Andre',
    handle: '@andre',
    init: 'A',
    tint: '#FFE8DF',
    tintInk: '#B8481F',
  },
  places: [
    {
      id: 'woak',
      name: 'WOAK SUSHI',
      nameLines: ['WOAK', 'SUSHI'],
      tagline: 'Sushi · Date night',
      neighbourhood: 'Caldas da Rainha',
      rating: 4.9,
      photo: img('ChIJWwt6hoyzGA0Rm8rScAwmRLc', 1),
    },
    {
      id: 'retiro',
      name: 'Retiro dos Cubanos',
      nameLines: ['Retiro dos', 'Cubanos'],
      tagline: 'Cuban · Group dinner',
      neighbourhood: 'Gaeiras',
      rating: 4.6,
      photo: img('ChIJD6ZOjwO1GA0RsLV3wd8hEMM', 0),
    },
    {
      id: 'taskinha',
      name: 'Taskinha Do B3co',
      nameLines: ['Taskinha', 'Do B3co'],
      tagline: 'Petiscos · Casual',
      neighbourhood: 'Caldas da Rainha',
      rating: 4.6,
      photo: img('ChIJV1WlHKWzGA0RihEz3q0HKeE', 0),
    },
    {
      id: 'paraiso',
      name: 'Paraíso do Coto',
      nameLines: ['Paraíso', 'do Coto'],
      tagline: 'Portuguese · Sunday lunch',
      neighbourhood: 'Caldas da Rainha',
      rating: 4.5,
      photo: img('ChIJNy1LdUmyGA0RXwSHnb_lUSo', 0),
    },
  ],
  cta: {
    headlineLines: ['Save the list.'],
    sub: 'Four spots from someone you trust — ready when the group chat starts.',
    button: 'Save this list',
    footer: 'Join the Nom Nom Circle · nomnom.app',
  },
};

/** Duration in frames for current props. */
export const getListShowcaseDuration = (props) => {
  const places = props?.places || defaultListShowcaseProps.places;
  return buildListTimeline(places.length).totalFrames;
};

/** Main composition: list intro → each spot → recap grid → CTA. */
export const ListShowcase = (props) => {
  const p = {
    ...defaultListShowcaseProps,
    ...props,
    list: { ...defaultListShowcaseProps.list, ...(props.list || {}) },
    creator: { ...defaultListShowcaseProps.creator, ...(props.creator || {}) },
    cta: { ...defaultListShowcaseProps.cta, ...(props.cta || {}) },
    places: props.places || defaultListShowcaseProps.places,
  };
  const tl = buildListTimeline(p.places.length);

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Sequence from={tl.intro.start} durationInFrames={tl.intro.duration}>
        <Scene1ListIntro list={p.list} creator={p.creator} places={p.places} />
      </Sequence>
      {tl.spots.map((spot, i) => (
        <Sequence key={spot.id} from={spot.start} durationInFrames={spot.duration}>
          <Scene2Spot place={p.places[i]} index={i} total={p.places.length} />
        </Sequence>
      ))}
      <Sequence from={tl.recap.start} durationInFrames={tl.recap.duration}>
        <Scene3Recap list={p.list} places={p.places} />
      </Sequence>
      <Sequence from={tl.cta.start} durationInFrames={tl.cta.duration}>
        <Scene4ListCTA list={p.list} creator={p.creator} places={p.places} cta={p.cta} />
      </Sequence>
    </AbsoluteFill>
  );
};
