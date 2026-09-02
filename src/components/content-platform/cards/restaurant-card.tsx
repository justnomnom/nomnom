import Link from 'next/link';

import { contentRestaurantCardCtaLinkClassName } from 'src/components/content-platform/ui/content-inline-link-classname';

type RestaurantCardProps = {
  name: string;
  slug: string;
  country: string;
  city: string;
  rating?: number;
  categories?: string[];
  description?: string;
};

/**
 * MDX-friendly card linking to a restaurant detail page.
 */
export function RestaurantCard({
  name,
  slug,
  country,
  city,
  rating,
  categories = [],
  description,
}: RestaurantCardProps) {
  const href = `/countries/${country}/${city}/restaurants/${slug}`;

  return (
    <div className="not-prose my-6 rounded-2xl border border-border bg-muted/80 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{name}</h3>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          {categories.length > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {categories.map((c) => (
                <span key={c} className="mr-2 rounded bg-card px-2 py-0.5 capitalize">
                  {c.replace(/-/g, ' ')}
                </span>
              ))}
            </p>
          ) : null}
        </div>
        {typeof rating === 'number' ? (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary-readable">
            {rating.toFixed(1)} ★
          </span>
        ) : null}
      </div>
      <Link href={href} className={contentRestaurantCardCtaLinkClassName}>
        View {name} in {city}
      </Link>
    </div>
  );
}
