#!/usr/bin/env node
/**
 * Produce a large reviewable content batch for one day. Does not publish.
 *
 *   node scripts/content-pipeline/daily.mjs
 *   node scripts/content-pipeline/daily.mjs --date 2026-08-24 --volume 24
 */
import { DEFAULT_OUT_ROOT, produceMassDay, writeMassDay } from '../../src/content-pipeline/mass.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const isoDate = flag('date') || new Date().toISOString().slice(0, 10);
const volume = flag('volume') ? Number(flag('volume')) : undefined;
const asJson = args.includes('--json');

const batch = produceMassDay(isoDate, { volume });
const { outDir, pieceFiles } = writeMassDay(batch);

if (asJson) {
  process.stdout.write(`${JSON.stringify({ ...batch, outDir, pieceFiles }, null, 2)}\n`);
  process.exit(0);
}

console.log(`NomNom daily mass batch — ${batch.date} (${batch.weekday})`);
console.log(`Wrote ${pieceFiles} pieces to ${outDir.replace(DEFAULT_OUT_ROOT, 'content/pipeline/out')}`);
console.log('Do not publish. Do not invent restaurant facts.\n');
console.log(`Calendar: 4   Extras: ${batch.volume - 4}   Live subjects needed: ${batch.liveSubjectCount}`);
console.log(`Review: ${outDir.replace(/\\/g, '/')}/REVIEW.md\n`);

for (const piece of batch.pieces.slice(0, 8)) {
  const pack = piece.pack?.id || 'LIVE';
  console.log(
    `  ${String(piece.index).padStart(2, '0')} ${piece.lane === 'calendar' ? piece.slot : 'batch'} · ${piece.type} · ${piece.iteration.id} · ${pack}`
  );
}
if (batch.pieces.length > 8) {
  console.log(`  … ${batch.pieces.length - 8} more in REVIEW.md`);
}
