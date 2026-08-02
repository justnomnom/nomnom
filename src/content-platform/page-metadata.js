import { getSiteUrl } from 'src/libs/site-url';
import { APP, APP_OG_IMAGE_PATH } from 'src/config-global';

/**
 * Page metadata for hand-written (non-MDX) routes — the `docMetadata` counterpart.
 *
 * Exists because a page that sets only `title`/`description` does **not** contribute them to
 * its social card: `openGraph` is replaced wholesale by the nearest segment that defines it,
 * and the root layout hardcodes `openGraph.title = APP.name`. So `/pricing` shipped a correct
 * `<title>Pricing</title>` while previewing in WhatsApp and Slack as "NomNom".
 *
 * `images` is set rather than omitted for the mirror-image reason: declaring `openGraph`
 * without it drops the inherited card and the page previews with no image at all — the bug
 * `/restaurants/[id]` shipped with.
 *
 * Plain JS because `.js` pages (`faqs`, `privacy`, `terms`, `contact-us`) import it, and
 * importing `.ts` from ESLint-strict JS is a known snag here (see `src/libs/site-url.js`).
 *
 * @param {{ title: string, description: string, path: string }} args `path` is root-relative
 *   with a leading slash, e.g. `/pricing`.
 * @returns {import('next').Metadata}
 */
export function pageMetadata({ title, description, path }) {
  const url = `${getSiteUrl()}${path}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      siteName: APP.name,
      title,
      description,
      url,
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
