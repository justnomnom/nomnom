import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { C } from '../../theme';
import { buildReelTimeline } from './constants';
import { getFeature } from './features';
import { SceneBeats, SceneCta, SceneHook, SceneMock } from './scenes';

export const defaultFeatureReelProps = {
  featureId: 'feed',
};

/** Duration in frames for the current feature reel. */
export const getFeatureReelDuration = () => buildReelTimeline().totalFrames;

/** 9:16 reel — hook, product mock, how-it-works, CTA. */
export const FeatureReel = ({ featureId }) => {
  const feature = getFeature(featureId);
  const tl = buildReelTimeline();

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Sequence from={tl.hook.start} durationInFrames={tl.hook.duration}>
        <SceneHook feature={feature} />
      </Sequence>
      <Sequence from={tl.mock.start} durationInFrames={tl.mock.duration}>
        <SceneMock feature={feature} />
      </Sequence>
      <Sequence from={tl.beats.start} durationInFrames={tl.beats.duration}>
        <SceneBeats feature={feature} />
      </Sequence>
      <Sequence from={tl.cta.start} durationInFrames={tl.cta.duration}>
        <SceneCta feature={feature} />
      </Sequence>
    </AbsoluteFill>
  );
};
