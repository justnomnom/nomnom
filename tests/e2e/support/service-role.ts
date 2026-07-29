import { loadE2EEnv } from '../load-env';

/**
 * True when E2E can call Supabase with the service role (DB assertions / sample row lookups).
 */
export function hasServiceRoleCredentials(): boolean {
  loadE2EEnv();
  return !!(process.env.E2E_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY);
}
