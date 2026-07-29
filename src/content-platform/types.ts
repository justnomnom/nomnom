export type Restaurant = {
  name: string;
  slug: string;
  city: string;
  country: string;
  categories: string[];
  influencerSlugs: string[];
  rating: number;
  location: { lat: number; lng: number };
  shortDescription?: string;
  heroImage?: string;
};

export type MdxFrontmatter = {
  title: string;
  description: string;
  /** Optional share image (absolute URL or site-relative path, e.g. `/images/foo.jpg`) */
  ogImage?: string;
  /** Country slug for influencer documents */
  country?: string;
  date?: string;
  tags?: string[];
  /** Restaurant slugs this page should link to */
  relatedRestaurantSlugs?: string[];
  /** Influencer slugs for cross-linking */
  relatedInfluencerSlugs?: string[];
  /** Collection slugs (same city or global) */
  relatedCollectionSlugs?: string[];
  draft?: boolean;
};

export type ParsedMdxDocument<T extends MdxFrontmatter = MdxFrontmatter> = {
  slug: string;
  frontmatter: T;
  body: string;
  filePath: string;
};
