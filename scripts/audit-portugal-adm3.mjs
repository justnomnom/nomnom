/**
 * Portugal CAOP2025 locality coverage audit.
 * node scripts/audit-portugal-adm3.mjs
 */
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { ensureAdm3Cache, loadAllCaopLocalities } = require('./lib/portugal-geography.cjs');

async function main() {
  await ensureAdm3Cache();
  const rows = loadAllCaopLocalities();
  rows.sort((a, b) => a.district.localeCompare(b.district) || a.name.localeCompare(b.name));

  const byDistrict = {};
  let withoutMunicipality = 0;
  for (const row of rows) {
    byDistrict[row.district] = (byDistrict[row.district] || 0) + 1;
    if (!row.municipalityName) withoutMunicipality += 1;
  }

  console.log(`CAOP freguesias: ${rows.length}`);
  console.log(`Without parent municipality: ${withoutMunicipality}`);
  console.log('Per district:', byDistrict);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
