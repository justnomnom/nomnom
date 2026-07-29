import Link from 'next/link';

import { contentInlineLinkSemiboldHoverUnderlineClassName } from 'src/components/content-platform/ui/content-inline-link-classname';

type InfluencerQuoteProps = {
  name: string;
  quote: string;
  href?: string;
  country?: string;
};

/**
 * Pull quote block for influencer-led SEO pages (optional link to profile).
 */
export function InfluencerQuote({ name, quote, href, country }: InfluencerQuoteProps) {
  return (
    <blockquote className="not-prose my-8 rounded-2xl border border-primary/25 bg-primary/[0.07] px-6 py-5">
      <p className="text-lg font-medium leading-relaxed text-foreground">&ldquo;{quote}&rdquo;</p>
      <footer className="mt-3 text-sm text-muted-foreground">
        — {name}
        {href ? (
          <>
            {' '}
            <Link href={href} className={contentInlineLinkSemiboldHoverUnderlineClassName}>
              View profile
            </Link>
          </>
        ) : null}
        {!href && country ? (
          <>
            {' '}
            <Link
              href={`/countries/${encodeURIComponent(country)}/influencers`}
              className={contentInlineLinkSemiboldHoverUnderlineClassName}
            >
              More creators in this country
            </Link>
          </>
        ) : null}
      </footer>
    </blockquote>
  );
}
