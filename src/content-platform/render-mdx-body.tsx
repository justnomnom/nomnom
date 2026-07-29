import { compileMDX } from 'next-mdx-remote/rsc';

import { getMdxComponents } from '@/content-platform/mdx-components';

/**
 * Renders MDX source string (from disk or Tina) inside server components.
 */
export async function renderMdxBody(source: string) {
  const { content } = await compileMDX({
    source,
    options: { parseFrontmatter: false },
    components: getMdxComponents(),
  });
  return content;
}

/**
 * Tina `body` may be a string (MDX) or a rich-text JSON object depending on schema.
 */
export async function renderTinaBody(body: unknown) {
  if (typeof body === 'string' && body.trim()) {
    return renderMdxBody(body);
  }
  if (body && typeof body === 'object') {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[renderTinaBody] Tina rich-text JSON body — add a renderer or export MDX for full rendering.',
        { keys: Object.keys(body as object) }
      );
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
          <p className="font-medium">Structured body from Tina</p>
          <p className="mt-1 text-amber-900/80">
            This document uses Tina rich-text JSON. Wire a rich-text renderer or export MDX from
            Tina for full in-page rendering.
          </p>
        </div>
      );
    }
    return null;
  }
  return null;
}
