import { queries } from '../../tina/__generated__/types';

import { CONTENT_REVALIDATE_SECONDS } from '@/content-platform/constants';
import { getContentTinaClient } from '@/content-platform/tina-runtime';

const tinaIsrFetch: RequestInit = {
  next: { revalidate: CONTENT_REVALIDATE_SECONDS },
};

/**
 * Fetches a global SEO collection document from Tina Cloud when credentials exist.
 */
export async function fetchTinaSeoCollection(relativePath: string) {
  if (!process.env.NEXT_PUBLIC_TINA_CLIENT_ID || !process.env.TINA_TOKEN) {
    return null;
  }
  try {
    const client = getContentTinaClient();
    const sdk = queries(client);
    const res = await sdk.seo_collection({ relativePath }, { fetchOptions: tinaIsrFetch });
    return res.data?.seo_collection ?? null;
  } catch {
    return null;
  }
}

/**
 * Fetches influencer MDX from Tina by relative path (e.g. `joao-ferreira.mdx`).
 */
export async function fetchTinaInfluencer(relativePath: string) {
  if (!process.env.NEXT_PUBLIC_TINA_CLIENT_ID || !process.env.TINA_TOKEN) {
    return null;
  }
  try {
    const client = getContentTinaClient();
    const sdk = queries(client);
    const res = await sdk.influencer({ relativePath }, { fetchOptions: tinaIsrFetch });
    return res.data?.influencer ?? null;
  } catch {
    return null;
  }
}
