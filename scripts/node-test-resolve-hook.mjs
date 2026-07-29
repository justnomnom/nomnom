/**
 * Node test resolve hook: extensionless relative imports + `src/` alias
 * (matches Next.js / webpack resolution used by the app).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const TRY_EXTS = ['', '.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx'];

/**
 * @param {string} absPath
 * @returns {string | null}
 */
function resolveFile(absPath) {
  for (const ext of TRY_EXTS) {
    const candidate = absPath + ext;
    try {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
        return candidate;
      }
    } catch {
      // ignore
    }
  }
  for (const ext of ['.js', '.mjs', '.cjs', '.jsx']) {
    const indexPath = path.join(absPath, `index${ext}`);
    try {
      if (fs.existsSync(indexPath) && fs.statSync(indexPath).isFile()) {
        return indexPath;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

/**
 * @param {string} specifier
 * @param {string | undefined} parentURL
 * @returns {string | null} file URL
 */
function tryResolveSpecifier(specifier, parentURL) {
  let abs;
  if (specifier.startsWith('src/') || specifier === 'src') {
    abs = path.join(ROOT, specifier);
  } else if (
    (specifier.startsWith('./') || specifier.startsWith('../')) &&
    parentURL &&
    parentURL.startsWith('file:')
  ) {
    const parentPath = fileURLToPath(parentURL);
    abs = path.resolve(path.dirname(parentPath), specifier);
  } else {
    return null;
  }

  // Skip if specifier already includes an extension that exists as written
  if (path.extname(specifier)) {
    try {
      if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
        return pathToFileURL(abs).href;
      }
    } catch {
      // fall through
    }
  }

  const resolved = resolveFile(abs);
  return resolved ? pathToFileURL(resolved).href : null;
}

/**
 * @param {string} specifier
 * @param {{ parentURL?: string }} context
 * @param {(s: string, c: object) => Promise<object>} nextResolve
 */
export async function resolve(specifier, context, nextResolve) {
  // Only rewrite bare extensionless relatives and src/ aliases.
  const needsRewrite =
    specifier.startsWith('src/') ||
    specifier === 'src' ||
    ((specifier.startsWith('./') || specifier.startsWith('../')) && !path.extname(specifier));

  if (needsRewrite) {
    const rewritten = tryResolveSpecifier(specifier, context.parentURL);
    if (rewritten) {
      return {
        shortCircuit: true,
        url: rewritten,
      };
    }
  }

  return nextResolve(specifier, context);
}
