import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';

import MainLayout from 'src/layouts/main';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import { RestaurantDetailView } from 'src/sections/restaurant/view';

import { RelatedLinksSection } from '@/components/content-platform/sections/related-links';
import { ContentPageShell } from '@/components/content-platform/sections/content-page-shell';
import {
  contentInlineLinkMutedUnderlineClassName,
  contentInlineLinkSemiboldUnderlineClassName,
  contentRestaurantListRowLinkClassName,
} from 'src/components/content-platform/ui/content-inline-link-classname';
import { JsonLd } from '@/components/content-platform/seo/json-ld';
import { contentRestaurantToDetailViewModel } from '@/content-platform/content-restaurant-detail-adapter';
import {
  getCitySlugsForCountry,
  getCountrySlugs,
  getRestaurantBySlug,
  getRestaurantsByCityFiltered,
  paginateRestaurants,
} from '@/content-platform/fs-content';
import {
  findDocsLinkingRestaurant,
  hrefForMdxDoc,
  influencerSlugsForCountry,
  sampleGlobalCollectionSlugs,
} from '@/content-platform/internal-graph';
import {
  getRestaurantPageSize,
  parseRestaurantParts,
  restaurantListPath,
  tryParseRestaurantParts,
} from '@/content-platform/restaurants-path';
import { getSiteUrl } from '@/content-platform/site-url';
import { contentHubT, displaySlug } from '@/content-platform/content-hub-t';

import { APP_OG_IMAGE_PATH } from 'src/config-global';

export const revalidate = 60;

type PageProps = {
  params: Promise<{ country: string; city: string; parts?: string[] }>;
};

export async function generateStaticParams() {
  const out: { country: string; city: string; parts: string[] | undefined }[] = [];
  for (const country of getCountrySlugs()) {
    for (const city of getCitySlugsForCountry(country)) {
      out.push({ country, city, parts: undefined });
      const restaurants = getRestaurantsByCityFiltered(country, city);
      const pageSize = getRestaurantPageSize();
      const pages = Math.ceil(restaurants.length / pageSize);
      for (let p = 2; p <= pages; p += 1) {
        out.push({ country, city, parts: ['page', String(p)] });
      }
      const tags = [...new Set(restaurants.flatMap((r) => r.categories ?? []))];
      for (const tag of tags) {
        const filtered = getRestaurantsByCityFiltered(country, city, tag);
        const tagPages = Math.ceil(filtered.length / pageSize);
        out.push({ country, city, parts: ['tag', tag] });
        for (let p = 2; p <= tagPages; p += 1) {
          out.push({ country, city, parts: ['tag', tag, 'page', String(p)] });
        }
      }
      for (const r of restaurants) {
        out.push({ country, city, parts: [r.slug] });
      }
    }
  }
  return out;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { country, city, parts } = await params;
  const mode = tryParseRestaurantParts(parts);
  if (!mode) {
    return { title: 'Restaurants' };
  }

  if (mode.kind === 'detail') {
    const r = getRestaurantBySlug(mode.slug);
    if (!r || r.country !== country || r.city !== city) {
      return { title: 'Restaurant' };
    }
    const canonical = `${getSiteUrl()}/countries/${country}/${city}/restaurants/${r.slug}`;
    const title = `${r.name} — ${city.replace(/-/g, ' ')}`;
    const description = r.shortDescription ?? `Restaurant in ${city.replace(/-/g, ' ')}.`;
    const ogImage = r.heroImage ?? APP_OG_IMAGE_PATH;
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: {
        title,
        description,
        url: `/countries/${country}/${city}/restaurants/${r.slug}`,
        images: [{ url: ogImage, alt: r.name }],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
    };
  }

  const tagSuffix = mode.tag ? ` — ${mode.tag.replace(/-/g, ' ')}` : '';
  const pageSuffix = mode.page > 1 ? ` (page ${mode.page})` : '';
  const title = `Restaurants in ${city.replace(/-/g, ' ')}${tagSuffix}${pageSuffix}`;
  const description = `Browse restaurants in ${city.replace(/-/g, ' ')}, ${country.replace(/-/g, ' ')}.`;
  const canonicalPath = restaurantListPath(country, city, mode.page, mode.tag);
  return {
    title,
    description,
    alternates: { canonical: `${getSiteUrl()}${canonicalPath}` },
    openGraph: {
      title,
      description,
      url: canonicalPath,
      images: [{ url: APP_OG_IMAGE_PATH, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [APP_OG_IMAGE_PATH],
    },
  };
}

/**
 * Restaurant directory (paginated + tag filter) or restaurant detail.
 */
export default async function RestaurantsCatchAllPage({ params }: PageProps) {
  const { country, city, parts } = await params;

  if (!getCountrySlugs().includes(country) || !getCitySlugsForCountry(country).includes(city)) {
    notFound();
  }

  const t = await contentHubT();
  const cityName = displaySlug(city);
  const countryName = displaySlug(country);
  const mode = parseRestaurantParts(parts);

  if (mode.kind === 'detail') {
    const r = getRestaurantBySlug(mode.slug);
    if (!r || r.country !== country || r.city !== city) notFound();

    const linking = findDocsLinkingRestaurant(r.slug)
      .map((d) => {
        const href = hrefForMdxDoc(d);
        return href ? { href, label: d.frontmatter.title } : null;
      })
      .filter(Boolean) as { href: string; label: string }[];

    const inflLinks = r.influencerSlugs.map((slug) => ({
      href: `/countries/${country}/influencers/${slug}`,
      label: `Creator: ${slug.replace(/-/g, ' ')}`,
    }));

    const restaurantLd = {
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      name: r.name,
      description: r.shortDescription,
      geo: {
        '@type': 'GeoCoordinates',
        latitude: r.location.lat,
        longitude: r.location.lng,
      },
      address: {
        '@type': 'PostalAddress',
        addressLocality: city.replace(/-/g, ' '),
        addressCountry: country.replace(/-/g, ' '),
      },
      url: `${getSiteUrl()}/countries/${country}/${city}/restaurants/${r.slug}`,
    };

    const site = getSiteUrl();
    const breadcrumbLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: t('home'), item: `${site}` },
        { '@type': 'ListItem', position: 2, name: t('countries'), item: `${site}/countries` },
        {
          '@type': 'ListItem',
          position: 3,
          name: country.replace(/-/g, ' '),
          item: `${site}/countries/${country}`,
        },
        {
          '@type': 'ListItem',
          position: 4,
          name: city.replace(/-/g, ' '),
          item: `${site}/countries/${country}/${city}`,
        },
        {
          '@type': 'ListItem',
          position: 5,
          name: t('restaurants'),
          item: `${site}/countries/${country}/${city}/restaurants`,
        },
        {
          '@type': 'ListItem',
          position: 6,
          name: r.name,
          item: `${site}/countries/${country}/${city}/restaurants/${r.slug}`,
        },
      ],
    };

    const crumbLinks = [
      { name: t('home'), href: '/' },
      { name: t('countries'), href: '/countries' },
      { name: countryName, href: `/countries/${country}` },
      { name: cityName, href: `/countries/${country}/${city}` },
      { name: t('restaurants'), href: `/countries/${country}/${city}/restaurants` },
      {
        name: r.name,
        href: `/countries/${country}/${city}/restaurants/${r.slug}`,
      },
    ];

    return (
      <>
        <JsonLd data={[restaurantLd, breadcrumbLd]} />
        <MainLayout>
          <Container
            maxWidth={false}
            sx={{
              pt: { xs: 4, sm: 3, md: 4 },
              pb: 2,
              mb: 0,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <CustomBreadcrumbs links={crumbLinks} sx={{ maxWidth: 720, mx: 'auto' }} />
          </Container>

          <RestaurantDetailView
            restaurant={contentRestaurantToDetailViewModel(r, country, city)}
            showListsAndReviews={false}
            reviews={[]}
            myUserId={null}
            analyticsSurface="content_hub"
            analyticsContext={{
              country_slug: country,
              city_slug: city,
              content_slug: r.slug,
            }}
          />

          <Container maxWidth={false} sx={{ pb: 4 }}>
            <Stack spacing={3} sx={{ maxWidth: 720, mx: 'auto', pt: { xs: 2, sm: 3 } }}>
              <RelatedLinksSection
                title={t('collections_creators')}
                links={[
                  ...linking.slice(0, 4),
                  ...inflLinks,
                  ...sampleGlobalCollectionSlugs(2).map((slug) => ({
                    href: `/collections/${slug}`,
                    label: `Read: ${slug.replace(/-/g, ' ')}`,
                  })),
                ]}
              />
            </Stack>
          </Container>
        </MainLayout>
      </>
    );
  }

  const pageSize = getRestaurantPageSize();
  const all = getRestaurantsByCityFiltered(country, city, mode.tag);
  const page = mode.page;
  const slice = paginateRestaurants(all, page, pageSize);
  const totalPages = Math.max(1, Math.ceil(all.length / pageSize));

  if (page > totalPages) notFound();

  const site = getSiteUrl();
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t('home'), item: `${site}` },
      { '@type': 'ListItem', position: 2, name: t('countries'), item: `${site}/countries` },
      {
        '@type': 'ListItem',
        position: 3,
        name: countryName,
        item: `${site}/countries/${country}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: cityName,
        item: `${site}/countries/${country}/${city}`,
      },
      {
        '@type': 'ListItem',
        position: 5,
        name: t('restaurants'),
        item: `${site}${restaurantListPath(country, city, 1, mode.tag)}`,
      },
    ],
  };

  const itemListLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Restaurants in ${city.replace(/-/g, ' ')}${mode.tag ? ` — ${mode.tag.replace(/-/g, ' ')}` : ''}`,
    description: `${all.length} creator-curated restaurants in ${city.replace(/-/g, ' ')}, ${country.replace(/-/g, ' ')}.`,
    numberOfItems: slice.length,
    itemListElement: slice.map((r, i) => ({
      '@type': 'ListItem',
      position: (page - 1) * pageSize + i + 1,
      url: `${site}/countries/${country}/${city}/restaurants/${r.slug}`,
      name: r.name,
    })),
  };

  return (
    <>
      <JsonLd data={[breadcrumbLd, itemListLd]} />
      <ContentPageShell
        title={
          mode.tag
            ? t('restaurants_in_tagged', { city: cityName, tag: displaySlug(mode.tag) })
            : t('restaurants_in', { city: cityName })
        }
        description={
          mode.tag
            ? t('directory_description_tagged', {
                count: all.length,
                tag: displaySlug(mode.tag),
                page,
                pages: totalPages,
              })
            : t('directory_description', { count: all.length, page, pages: totalPages })
        }
        breadcrumbs={[
          { name: t('home'), href: '/' },
          { name: t('countries'), href: '/countries' },
          { name: countryName, href: `/countries/${country}` },
          { name: cityName, href: `/countries/${country}/${city}` },
          {
            name: t('restaurants'),
            href: restaurantListPath(country, city, 1, mode.tag),
          },
        ]}
      >
        <ul className="not-prose space-y-4">
          {slice.map((r) => (
            <li key={r.slug}>
              <Link
                href={`/countries/${country}/${city}/restaurants/${r.slug}`}
                className={contentRestaurantListRowLinkClassName}
              >
                <span className="font-semibold text-foreground">{r.name}</span>
                <span className="ml-2 text-sm text-muted-foreground">{r.rating.toFixed(1)} ★</span>
                <p className="mt-1 text-sm text-muted-foreground">{r.shortDescription}</p>
              </Link>
            </li>
          ))}
        </ul>

        <nav className="not-prose mt-8 flex flex-wrap gap-3 text-sm" aria-label="Pagination">
          {page > 1 ? (
            <Link
              href={restaurantListPath(country, city, page - 1, mode.tag)}
              className={contentInlineLinkSemiboldUnderlineClassName}
            >
              {t('previous_page')}
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              href={restaurantListPath(country, city, page + 1, mode.tag)}
              className={contentInlineLinkSemiboldUnderlineClassName}
            >
              {t('next_page')}
            </Link>
          ) : null}
          {mode.tag ? (
            <Link
              href={`/countries/${country}/${city}/restaurants`}
              className={contentInlineLinkMutedUnderlineClassName}
            >
              {t('clear_tag_filter')}
            </Link>
          ) : null}
        </nav>

        <RelatedLinksSection
          title={t('keep_exploring')}
          links={[
            { href: `/countries/${country}/${city}`, label: t('overview', { country: cityName }) },
            ...influencerSlugsForCountry(country)
              .slice(0, 2)
              .map((slug) => ({
                href: `/countries/${country}/influencers/${slug}`,
                label: t('profile_label', { name: displaySlug(slug) }),
              })),
            ...sampleGlobalCollectionSlugs(2).map((slug) => ({
              href: `/collections/${slug}`,
              label: t('collection_label', { name: displaySlug(slug) }),
            })),
          ]}
        />
      </ContentPageShell>
    </>
  );
}
