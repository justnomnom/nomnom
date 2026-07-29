import type { MetadataRoute } from 'next';

import { getSiteUrl } from '@/content-platform/site-url';

const PRIVATE_PATHS = ['/dashboard/', '/api/', '/auth/', '/onboarding/', '/restaurants/'];

export default function robots(): MetadataRoute.Robots {
  const base = getSiteUrl();
  return {
    rules: [
      // General crawlers + all AI search bots
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      // Explicit AI search bots — allow citation, disallow private paths
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'PerplexityBot',
          'ClaudeBot',
          'anthropic-ai',
          'Google-Extended',
          'Bingbot',
        ],
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
