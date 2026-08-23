import { ImageResponse } from 'next/og';

import {
  OG_SIZE,
  OG_CONTENT_TYPE,
  OgFrame,
  OG_TYPE,
  OG_COLORS,
  OgTagline,
} from 'src/libs/og/og-card';
import { ogImageOptions } from 'src/libs/og/og-fonts';
import { renderListOgImage } from 'src/libs/og/list-og-image';
import { fetchTable } from 'src/libs/lists/actions/table-actions';

// Node.js avoids Vercel’s 1 MB Edge Function limit (`next/og` wasm exceeds it on Hobby).
export const runtime = 'nodejs';

export const alt = 'NomNom Table';

export const size = OG_SIZE;

export const contentType = OG_CONTENT_TYPE;

/**
 * Table OG: reuse the list collage when the table resolves; else a simple title card.
 */
export default async function TableOpenGraphImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { table: raw } = await fetchTable(id).catch(() => ({ table: null }));
  const table = raw as { list_id?: unknown; title?: unknown } | null;
  const listId = table?.list_id ? String(table.list_id) : null;
  if (listId) {
    return renderListOgImage(listId);
  }

  const title = table?.title ? String(table.title) : 'Table';
  return new ImageResponse(
    <OgFrame>
      <div style={{ display: 'flex', ...OG_TYPE.display, color: OG_COLORS.text, maxWidth: 900 }}>
        {title}
      </div>
      <OgTagline>Pick a place together — NomNom</OgTagline>
    </OgFrame>,
    ogImageOptions(OG_SIZE)
  );
}
