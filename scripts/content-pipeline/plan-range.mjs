#!/usr/bin/env node
/**
 * Write N days of plans as JSON files (never posts).
 *
 *   node scripts/content-pipeline/plan-range.mjs --from 2026-08-24 --days 28 --out content/pipeline/queue
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { planRange } from '../../src/content-pipeline/plan.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const from = flag('from') || new Date().toISOString().slice(0, 10);
const days = Math.max(1, Number(flag('days') || 28));
const outRel = flag('out') || 'content/pipeline/queue';
const outDir = join(repoRoot, outRel);

const plans = planRange(from, days);
mkdirSync(outDir, { recursive: true });

const index = [];
for (const plan of plans) {
  const file = join(outDir, `${plan.date}.json`);
  writeFileSync(file, `${JSON.stringify(plan, null, 2)}\n`);
  index.push({
    date: plan.date,
    weekday: plan.weekday,
    slots: plan.slots.map((s) => ({
      slot: s.slot,
      type: s.type,
      iteration: s.iteration.id,
      pack: s.pack?.id || null,
    })),
  });
}

writeFileSync(join(outDir, 'index.json'), `${JSON.stringify({ from, days, plans: index }, null, 2)}\n`);
console.log(`Wrote ${plans.length} daily plans to ${outRel} (review only, not published)`);
