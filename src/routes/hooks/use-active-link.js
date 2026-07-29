import { usePathname } from 'next/navigation';

// ----------------------------------------------------------------------

function normalizePath(p) {
  if (!p || p === '/') {
    return '/';
  }
  return p.replace(/\/$/, '') || '/';
}

function pathMatches(pathnameNorm, pathNorm, deep) {
  if (pathNorm === pathnameNorm) {
    return true;
  }
  if (!deep) {
    return false;
  }
  if (pathNorm === '/') {
    return false;
  }
  return pathnameNorm.startsWith(`${pathNorm}/`);
}

/**
 * @param {string} path
 * @param {boolean} [deep=true] Match current route or nested paths under `path`.
 * @param {string[]|null|undefined} [siblingPaths] When set, only the **longest** matching path among these is active (stops `/countries` and `/countries/portugal` both highlighting on `/countries/portugal/lisbon`).
 */
export function useActiveLink(path, deep = true, siblingPaths) {
  const pathname = usePathname();

  if (!path || path.startsWith('#')) {
    return false;
  }

  const pathnameNorm = normalizePath(pathname);
  const pathNorm = normalizePath(path);

  if (siblingPaths && siblingPaths.length > 0) {
    const candidates = siblingPaths.filter(Boolean);
    const matching = candidates.filter((candidate) =>
      pathMatches(pathnameNorm, normalizePath(candidate), deep)
    );
    if (!matching.length) {
      return false;
    }
    const longest = matching.reduce((a, b) =>
      normalizePath(a).length >= normalizePath(b).length ? a : b
    );
    return normalizePath(longest) === pathNorm;
  }

  return pathMatches(pathnameNorm, pathNorm, deep);
}
