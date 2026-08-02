import type { Metadata } from 'next';
import Link from 'next/link';

import { ContentPageShell } from '@/components/content-platform/sections/content-page-shell';
import { contentUseCaseStoryRowLinkClassName } from 'src/components/content-platform/ui/content-inline-link-classname';
import { readMdxFilesInDir } from '@/content-platform/fs-content';
import { pageMetadata } from '@/content-platform/page-metadata';

export const revalidate = 60;

const SLUG_ORDER = ['foodies', 'creators', 'restaurants'];
const TITLE_SEP = ' — ';

export const metadata: Metadata = pageMetadata({
  title: 'Use cases: foodies, creators, and restaurants',
  description:
    'See how foodies, creators, and restaurants use NomNom — restaurant picks from people you trust, with lists, roulette, and map and AI search.',
  path: '/use-cases',
});

function sortUseCaseDocs<T extends { slug: string }>(docs: T[]): T[] {
  return [...docs].sort((a, b) => {
    const ia = SLUG_ORDER.indexOf(a.slug);
    const ib = SLUG_ORDER.indexOf(b.slug);
    if (ia === -1 && ib === -1) return a.slug.localeCompare(b.slug);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

/** Split "Audience — headline" frontmatter titles into label + story line. */
function splitUseCaseTitle(title: string): { label: string; headline: string } {
  const sepIndex = title.indexOf(TITLE_SEP);
  if (sepIndex === -1) {
    return { label: title, headline: title };
  }

  const label = title.slice(0, sepIndex).trim();
  const rest = title.slice(sepIndex + TITLE_SEP.length).trim();
  const headline = rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : title;

  return { label, headline };
}

/**
 * Index of use-case stories (MDX) — resolves `/use-cases` for nav `paths.site.useCasesRoot`.
 */
export default function UseCasesIndexPage() {
  const docs = sortUseCaseDocs(readMdxFilesInDir('use-cases'));

  return (
    <ContentPageShell
      title="Use cases"
      description="Pick a story to see how NomNom fits food lovers, creators, and restaurants."
      breadcrumbs={[
        { name: 'Home', href: '/' },
        { name: 'Use cases', href: '/use-cases' },
      ]}
    >
      <p>
        NomNom turns the people you trust into the way you find where to eat. Every recommendation
        stays tied to a real person — a creator or a local — so you can see who picked a spot, not
        just an anonymous star average.
      </p>

      <h2>How NomNom works</h2>
      <ul>
        <li>
          <strong>NomNom Circle</strong> — activity from the people you follow on any given spot.
        </li>
        <li>
          <strong>NomNom Roulette</strong> — a random pick from a pool that fits the vibe when you
          can&rsquo;t decide.
        </li>
        <li>
          <strong>NomNom lists</strong> — saved, shareable restaurant lists for date night, friends,
          or cheap eats, public or private.
        </li>
        <li>
          <strong>Map and AI search</strong> — browse, search, or ask in plain language, anchored to
          your location.
        </li>
      </ul>

      <h2>For creators</h2>
      <p>
        Publish public lists for free, or get paid for the curation you already do. Readers buy a{' '}
        <strong>Snapshot</strong> for permanent access to a list as it stands today, or take out a
        monthly <strong>Subscription</strong> to follow you and unlock all of your paid lists.
        Payouts run through Stripe.
      </p>

      <h2>Pick your story</h2>
      <nav aria-label="Use case stories" className="not-prose">
        <div className="divide-y divide-border border-y border-border">
          {docs.map((doc) => {
            const { label, headline } = splitUseCaseTitle(doc.frontmatter.title);

            return (
              <Link
                key={doc.slug}
                href={`/use-cases/${doc.slug}`}
                className={contentUseCaseStoryRowLinkClassName}
              >
                <span className="block text-[0.75rem] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  {label}
                </span>
                <span className="mt-2 block text-xl font-bold leading-snug tracking-tight text-foreground transition-colors duration-200 group-hover:text-primary">
                  {headline}
                </span>
                {doc.frontmatter.description ? (
                  <span className="mt-2 block max-w-[65ch] text-[0.9375rem] font-normal leading-relaxed text-muted-foreground">
                    {doc.frontmatter.description}
                  </span>
                ) : null}
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 transition-all duration-200 group-hover:gap-2.5 group-hover:underline">
                  Read story
                  <span aria-hidden="true">→</span>
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </ContentPageShell>
  );
}
