import { config } from 'dotenv';
import path from 'node:path';

/**
 * Load `.env.local` then `.env` so Playwright and globalSetup see the same vars as Next dev.
 */
export function loadE2EEnv(): void {
  config({ path: path.join(process.cwd(), '.env.local') });
  config({ path: path.join(process.cwd(), '.env') });
}
