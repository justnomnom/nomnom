import { notFound } from 'next/navigation';

/**
 * Catch unmatched frontend paths so Vercel/Next serves `not-found.js`
 * instead of the platform plain-text NOT_FOUND response.
 */
export default function UnmatchedFrontendRoutePage() {
  notFound();
}
