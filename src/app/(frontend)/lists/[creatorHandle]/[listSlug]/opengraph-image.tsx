import { resolveListSlug } from 'src/libs/lists/actions';

import { OG_SIZE, OG_CONTENT_TYPE } from 'src/libs/og/og-card';
import { renderListOgImage } from 'src/libs/og/list-og-image';

// Node.js avoids Vercel’s 1 MB Edge Function limit (`next/og` wasm exceeds it on Hobby).
export const runtime = 'nodejs';

export const alt = 'NomNom list';

export const size = OG_SIZE;

export const contentType = OG_CONTENT_TYPE;

/** `/lists/<handle>/<slug>` — the canonical URL the UUID route redirects to. */
export default async function SlugListOpenGraphImage({
  params,
}: {
  params: Promise<{ creatorHandle: string; listSlug: string }>;
}) {
  const { creatorHandle, listSlug } = await params;
  const listId = await resolveListSlug(creatorHandle, listSlug).catch(() => null);
  return renderListOgImage(listId ?? null);
}
