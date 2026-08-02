import { OG_SIZE, OG_CONTENT_TYPE } from 'src/libs/og/og-card';
import { renderListOgImage } from 'src/libs/og/list-og-image';

// Node.js avoids Vercel’s 1 MB Edge Function limit (`next/og` wasm exceeds it on Hobby).
export const runtime = 'nodejs';

export const alt = 'NomNom list';

export const size = OG_SIZE;

export const contentType = OG_CONTENT_TYPE;

/** `/lists/<uuid>`. This route only ever serves UUIDs; non-UUIDs `notFound()` on the page. */
export default async function ListOpenGraphImage({
  params,
}: {
  params: Promise<{ creatorHandle: string }>;
}) {
  const { creatorHandle: id } = await params;
  return renderListOgImage(id ?? null);
}
