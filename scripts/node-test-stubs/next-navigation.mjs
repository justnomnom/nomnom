/**
 * Node-test stub for `next/navigation` (extensionless Next export).
 */
export function redirect() {
  throw new Error('NEXT_REDIRECT');
}

export function notFound() {
  throw new Error('NEXT_NOT_FOUND');
}

export function unstable_rethrow(error) {
  throw error;
}

export function usePathname() {
  return '/';
}

export function useRouter() {
  return { push() {}, replace() {}, prefetch() {}, back() {} };
}

export function useSearchParams() {
  return new URLSearchParams();
}
