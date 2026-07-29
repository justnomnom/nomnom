import { existsSync } from 'node:fs';
import path from 'node:path';

const SKIPPED = path.join(process.cwd(), 'tests/e2e/.auth/skipped');

export function dashboardTestsDisabled(): boolean {
  return existsSync(SKIPPED);
}
