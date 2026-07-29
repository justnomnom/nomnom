import { createClient } from '@supabase/supabase-js';

import { SUPABASE_API } from 'src/config-global';

// Guard against this module reaching a client bundle. SUPABASE_API.secretKey
// reads SUPABASE_SECRET_KEY, which is not a NEXT_PUBLIC_ var, so on the client
// it silently resolves to '' — you would get a keyless admin client that fails
// every request with a confusing 401 instead of an obvious error here.
//
// (The stricter option is `import 'server-only'`, which turns this into a build
// error. That package is not currently a dependency; add it and swap this out
// if you want the check at build time rather than first use.)
if (typeof window !== 'undefined') {
  throw new Error(
    'supabase-admin is server-only: it was imported into a client bundle, where the service-role key is unavailable.'
  );
}

// ----------------------------------------------------------------------

/**
 * Creates a Supabase admin client with elevated privileges.
 * This client should only be used in server-side code and protected routes.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient} Supabase admin client
 */
export const supabaseAdminClient = createClient(SUPABASE_API.url, SUPABASE_API.secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'public',
  },
});
