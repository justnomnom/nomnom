import type { Metadata } from 'next';

import { JsonLd } from '@/components/content-platform/seo/json-ld';
import { getSiteUrl } from '@/content-platform/site-url';
import { DynamicTitle } from 'src/components/dynamic-title';
import { APP } from 'src/config-global';
import { getDefaultTranslation } from 'src/locales/default-translations';

import { HomeView } from 'src/sections/home/view';

// ----------------------------------------------------------------------

const homeTitle = getDefaultTranslation('pages.home.title') as string;
const homeOgImage = '/opengraph-image';

export const metadata: Metadata = {
  title: {
    absolute: homeTitle,
  },
  description: APP.description,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: homeTitle,
    description: APP.description,
    url: '/',
    images: [{ url: homeOgImage, width: 1200, height: 630, alt: APP.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: homeTitle,
    description: APP.description,
    images: [homeOgImage],
  },
};

export default function HomePage() {
  const origin = getSiteUrl();
  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: APP.name,
    url: origin,
    description: APP.description,
    publisher: {
      '@type': 'Organization',
      name: APP.name,
      url: origin,
    },
  };

  const organizationLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: APP.name,
    url: origin,
    description: APP.description,
    logo: `${origin}/favicon/android-chrome-512x512.png`,
    image: `${origin}/opengraph-image`,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: `${origin}/contact-us`,
    },
    sameAs: [APP.socials.instagram].filter(Boolean),
  };

  return (
    <>
      <JsonLd data={[websiteLd, organizationLd]} />
      <DynamicTitle titleKey="pages.home.title" />
      <HomeView />
    </>
  );
}
