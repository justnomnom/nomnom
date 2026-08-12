import type { MetadataRoute } from 'next';

import { getContentSitemapEntries } from '@/content-platform/sitemap-data';
import { supabaseAdminClient } from 'src/libs/supabase/supabase-admin';
import { getSiteUrl } from 'src/libs/site-url';
import { fetchAllSupabasePages } from 'src/libs/supabase/supabase-fetch-all-pages';

export const revalidate = 3600; // regenerate hourly

function priorityForPath(pathname: string): number {
  if (pathname === '/') return 1;
  if (['/countries', '/pricing', '/about'].includes(pathname)) return 0.9;
  return 0.7;
}

function changeFrequencyForPath(pathname: string): MetadataRoute.Sitemap[0]['changeFrequency'] {
  if (pathname === '/') return 'daily';
  return 'weekly';
}

/**
 * Sitemap: static marketing routes + all published lists with slug URLs.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = getContentSitemapEntries().map((e) => ({
    url: e.url,
    lastModified: e.lastModified,
    changeFrequency: changeFrequencyForPath(e.path),
    priority: priorityForPath(e.path),
  }));

  // Fetch all published public lists that have a slug + owner username
  let listEntries: MetadataRoute.Sitemap = [];
  try {
    const siteUrl = getSiteUrl();
    const lists = await fetchAllSupabasePages(async (from, pageSize) => {
      const { data, error } = await supabaseAdminClient
        .from('lists')
        .select(
          `
          id,
          slug,
          list_updated_at,
          updated_at,
          users ( username )
        `
        )
        .not('slug', 'is', null)
        .not('published_at', 'is', null)
        .in('visibility', ['public', 'public_subscribers'])
        // Stable, deterministic ordering so recursive paging never skips/dupes rows.
        .order('id', { ascending: true })
        .range(from, from + pageSize - 1);
      if (error) throw error;
      return data ?? [];
    });

    listEntries = (lists ?? [])
      .filter((l) => l.slug && (l.users as any)?.username)
      .map((l) => {
        const username = (l.users as any).username as string;
        return {
          url: `${siteUrl}/lists/${username}/${l.slug}`,
          lastModified: l.list_updated_at ?? l.updated_at ?? new Date().toISOString(),
          changeFrequency: 'weekly' as const,
          priority: 0.8,
        };
      });
  } catch {
    // Non-fatal — sitemap still works without list entries
  }

  return [...staticEntries, ...listEntries];
}
