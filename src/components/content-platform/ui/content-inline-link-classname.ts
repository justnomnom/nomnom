/** Focus ring + motion shared by content-hub links (`@theme` `--color-ring` / `--color-background`). */
const contentLinkFocusVisible =
  'rounded-sm outline-none transition-colors duration-200 ease-out focus-visible:ring-2 focus-visible:ring-[color:var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-background)]';

/** In-copy `<NextLink>` (About, Pricing, etc.). */
export const contentInlineLinkClassName = `font-medium text-primary-readable underline underline-offset-2 ${contentLinkFocusVisible}`;

/** Primary inline link, semibold + always underlined. */
export const contentInlineLinkSemiboldUnderlineClassName = `font-semibold text-primary-readable underline ${contentLinkFocusVisible}`;

/** Primary inline link, semibold + underline on hover only. */
export const contentInlineLinkSemiboldHoverUnderlineClassName = `font-semibold text-primary-readable underline-offset-2 hover:underline ${contentLinkFocusVisible}`;

/** Muted inline link (e.g. “Clear filter”). */
export const contentInlineLinkMutedUnderlineClassName = `text-muted-foreground underline ${contentLinkFocusVisible}`;

/** Restaurant card CTA (“View … in …”). */
export const contentRestaurantCardCtaLinkClassName = `mt-4 inline-block text-sm font-semibold text-primary-readable underline-offset-4 hover:underline ${contentLinkFocusVisible}`;

/** Breadcrumb trail links (muted until hover). */
export const contentBreadcrumbNavLinkClassName = `hover:text-primary-readable hover:underline ${contentLinkFocusVisible}`;

/** City hub tag chips linking to filtered restaurant lists. */
export const contentTagPillLinkClassName = `inline-flex rounded-full bg-muted px-3 py-1 text-sm capitalize outline-none transition-colors hover:bg-primary/10 ${contentLinkFocusVisible}`;

/** Full-width card row linking to a restaurant in directory lists. */
export const contentRestaurantListRowLinkClassName = `block rounded-2xl border border-border p-4 outline-none transition hover:border-primary/40 ${contentLinkFocusVisible}`;

/** Countries index grid card → country hub. */
export const contentCountryIndexCardLinkClassName = `block rounded-2xl border border-border bg-muted/80 p-5 font-semibold capitalize text-primary-readable outline-none transition hover:border-primary/50 ${contentLinkFocusVisible}`;

/** Use-cases index — editorial story row (no card chrome). */
export const contentUseCaseStoryRowLinkClassName = `group block py-7 text-inherit no-underline outline-none transition-colors duration-200 ease-out first:pt-5 last:pb-5 ${contentLinkFocusVisible}`;

/** Country hub city chip. */
export const contentCityHubPillLinkClassName = `inline-flex rounded-full border border-border px-3 py-1 text-sm font-medium capitalize outline-none transition-colors hover:border-primary/40 ${contentLinkFocusVisible}`;

/** Country hub influencer name chip. */
export const contentInfluencerPillLinkClassName = `inline-flex rounded-full border border-border px-3 py-1 text-sm font-medium outline-none transition-colors hover:border-primary/40 ${contentLinkFocusVisible}`;

/** “View all creators” dashed pill on country hub. */
export const contentViewAllCreatorsLinkClassName = `inline-flex rounded-full border border-dashed border-border px-3 py-1 text-sm font-medium text-primary-readable outline-none transition-colors hover:border-primary/40 ${contentLinkFocusVisible}`;

/** Influencer index list row → profile. */
export const contentInfluencerDirectoryRowLinkClassName = `block rounded-2xl border border-border p-4 font-semibold outline-none transition hover:border-primary/40 ${contentLinkFocusVisible}`;
