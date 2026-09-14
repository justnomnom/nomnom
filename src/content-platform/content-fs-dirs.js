/**
 * Directory listing for `content/`, split out so `restaurant-catalog.js` can use
 * it without importing `fs-content.ts` — which re-exports the catalog and would
 * make the import cycle.
 */

import fs from 'fs';
import path from 'path';

/** Join repo-root `content/` + segments. `process.cwd()` is ignored for Turbopack file tracing. */
function contentPath(...segments) {
  return path.join(/* turbopackIgnore: true */ process.cwd(), 'content', ...segments);
}

/**
 * Immediate subdirectory names under a content-relative path.
 *
 * @param {string} relativeDir
 * @returns {string[]}
 */
export function listSubdirNames(relativeDir) {
  const abs = contentPath(relativeDir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}
