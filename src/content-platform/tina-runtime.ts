import { createClient } from 'tinacms/dist/client';

import { queries } from '../../tina/__generated__/types';

const branch =
  process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || process.env.HEAD || 'main';

/**
 * Builds the Tina Cloud GraphQL URL for the configured client and branch.
 */
function getTinaApiUrl(): string {
  const clientId = process.env.NEXT_PUBLIC_TINA_CLIENT_ID;
  if (!clientId) {
    return 'http://localhost:4001/graphql';
  }
  return `https://content.tinajs.io/v1/content/${clientId}/github/${encodeURIComponent(branch)}`;
}

/**
 * Tina GraphQL client. Pass `{ fetchOptions: { next: { revalidate } } }` per query for ISR.
 */
export function getContentTinaClient() {
  const url = getTinaApiUrl();

  return createClient({
    url,
    token: process.env.TINA_TOKEN,
    queries,
  });
}
