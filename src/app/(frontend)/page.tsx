import type { Metadata } from 'next';

import { JsonLd } from '@/components/content-platform/seo/json-ld';
import { getSiteUrl } from '@/content-platform/site-url';
import { DynamicTitle } from 'src/components/dynamic-title';
import { APP } from 'src/config-global';
import { getServerViewerLang } from 'src/libs/i18n-server';
import { getTranslation } from 'src/locales/default-translations';

import { HomeView } from 'src/sections/home/view';

// ----------------------------------------------------------------------

const homeOgImage = '/opengraph-image';

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getServerViewerLang();
  const homeTitle = getTranslation(lang, 'pages.home.title');
  const description = getTranslation(lang, 'pages.home.hero.description');

  return {
    title: {
      absolute: homeTitle,
    },
    description,
    alternates: {
      canonical: '/',
    },
    openGraph: {
      title: homeTitle,
      description,
      url: '/',
      images: [{ url: homeOgImage, width: 1200, height: 630, alt: APP.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: homeTitle,
      description,
      images: [homeOgImage],
    },
  };
}

export default async function HomePage() {
  const lang = await getServerViewerLang();
  const description = getTranslation(lang, 'pages.home.hero.description');
  const origin = getSiteUrl();
  const websiteLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: APP.name,
    url: origin,
    description,
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
    description,
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
