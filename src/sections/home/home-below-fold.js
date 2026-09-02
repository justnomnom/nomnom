'use client';

import HomeFaqs from './home-faqs';
import HomeTrustStrip from './home-trust-strip';
import HomeTestimonial from './home-testimonial';
import HomeAdvertisement from './home-advertisement';
import HomeLandingFeatures from './home-landing-features';

/**
 * Single lazy chunk for all below-the-fold home sections — fewer parallel chunk requests
 * than separate `next/dynamic` per section while keeping `HomeHero` in the critical path.
 */
export default function HomeBelowFold() {
  return (
    <>
      <HomeLandingFeatures />
      <HomeTrustStrip />
      <HomeTestimonial />
      <HomeFaqs />
      <HomeAdvertisement />
    </>
  );
}
