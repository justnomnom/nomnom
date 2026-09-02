#!/usr/bin/env node
/**
 * Print the reviewable content plan for one day.
 *
 *   node scripts/content-pipeline/plan-day.mjs
 *   node scripts/content-pipeline/plan-day.mjs --date 2026-08-24 --json
 */
import { planDay } from '../../src/content-pipeline/plan.mjs';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const isoDate = flag('date') || new Date().toISOString().slice(0, 10);
const asJson = args.includes('--json');
const plan = planDay(isoDate);

if (asJson) {
  process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
  process.exit(0);
}

console.log(`NomNom daily plan — ${plan.date} (${plan.weekday})`);
console.log('Do not publish. Do not invent restaurant facts.\n');

for (const slot of plan.slots) {
  console.log(`## ${slot.slot} · ${slot.typeLabel}`);
  console.log(`   iteration: ${slot.iteration.id} — ${slot.iteration.label}`);
  if (slot.pack) console.log(`   pack: ${slot.pack.id} (${slot.pack.pillar})`);
  if (slot.featureId) console.log(`   feature: ${slot.featureId}`);
  if (slot.copy?.hook) console.log(`   hook: ${slot.copy.hook}`);
  if (slot.producer.command) console.log(`   produce: ${slot.producer.command}`);
  else if (slot.producer.skill) console.log(`   produce: skill ${slot.producer.skill}`);
  if (slot.honesty.needsLiveSubject) console.log('   subject: pick from live data (pick-subjects / news bar)');
  if (slot.pack?.seoPath) console.log(`   related: ${slot.pack.seoPath}`);
  console.log('');
}
