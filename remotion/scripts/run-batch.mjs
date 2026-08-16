#!/usr/bin/env node
// Turns picked subjects into a review queue.
//
// For each pick: fetch real props → render the reel (and a still) → write a
// caption → record it in the manifest and the ledger. Nothing is published;
// the batch lands in content-queue/<batchId>/ for a human to approve.
//
// Usage:
//   node scripts/pick-subjects.mjs --limit 3      # choose subjects first
//   node scripts/run-batch.mjs                    # then produce them
//
// Options:
//   --subjects <path>  picks JSON (default content-queue/subjects.json)
//   --kind <k>         restaurant | review | list | all  (default all)
//   --limit <n>        max items in this batch        (default 5)
//   --allow-duplicates let one venue appear as more than one cut in a batch
//   --no-render        write props + captions only, skip video rendering
//   --no-still         skip the poster frame
//   --dry-run          print the plan and exit
//   --keep-going       carry on after an item fails   (default: stop)
//   --rebuild <id>     re-produce an existing batch in place after a code change:
//                      same subjects, same filenames, refreshed manifest and
//                      REVIEW.md. Leaves the ledger alone — it is the same
//                      content, already recorded. Add --no-render to refresh
//                      captions, warnings and the manifest against the assets
//                      already on disk, without re-encoding anything.
//
// The ledger only records subjects whose video actually rendered, so a
// props-only or failed run leaves the subject eligible for the next batch.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execFileSync } from 'node:child_process';
import { REMOTION_ROOT } from './lib/supabase-client.mjs';
import { slugify } from './lib/subject-text.mjs';
import { captionFor } from './lib/captions.mjs';
import { MIN_USABLE_QUOTE } from './lib/reel-readiness.mjs';
import { warningsFromProps } from './lib/review-warnings.mjs';
import { QUEUE_ROOT, loadLedger, newBatchId, recordProduced, saveLedger } from './lib/content-state.mjs';

// ── CLI args ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (name) => args.includes(`--${name}`);

const subjectsPath = flag('subjects') || join(QUEUE_ROOT, 'subjects.json');
const kind = flag('kind') || 'both';
const limit = Math.max(1, Number(flag('limit') || 5));
const shouldRender = !has('no-render');
const shouldStill = shouldRender && !has('no-still');
const dryRun = has('dry-run');
const allowDuplicates = has('allow-duplicates');
const keepGoing = has('keep-going');

// A review spotlight reads the same props as a restaurant reel — RestaurantSpotlight
// takes reviews[0] — so it only needs a stricter quote filter and its own composition.
const FETCHERS = {
  restaurant: { script: 'fetch-restaurant-props.mjs', composition: 'RestaurantReviewsReel', stillFrame: '90' },
  review: {
    script: 'fetch-restaurant-props.mjs',
    composition: 'RestaurantSpotlight',
    stillFrame: '260',
    extraArgs: ['--reviews', '1', '--min-quote', String(MIN_USABLE_QUOTE)],
  },
  list: { script: 'fetch-list-props.mjs', composition: 'ListShowcase', stillFrame: '60' },
};

// ── Load picks, or an existing batch to rebuild ──────────────────────────
const rebuildId = flag('rebuild');
let rebuiltFrom = null;

if (rebuildId) {
  const manifestPath = join(QUEUE_ROOT, rebuildId, 'manifest.json');
  if (!existsSync(manifestPath)) {
    console.error(`No batch at ${manifestPath}.`);
    process.exit(1);
  }
  rebuiltFrom = JSON.parse(readFileSync(manifestPath, 'utf8'));
} else if (!existsSync(subjectsPath)) {
  console.error(`No picks at ${subjectsPath}.\nRun: node scripts/pick-subjects.mjs --limit ${limit}`);
  process.exit(1);
}
const picks = rebuiltFrom ? null : JSON.parse(readFileSync(subjectsPath, 'utf8'));
const wants = (k) => kind === k || kind === 'all' || kind === 'both';
const byScore = (list) => [...(list ?? [])].sort((a, b) => b.score - a.score);
const groups = rebuiltFrom
  ? []
  : [
      wants('restaurant') ? byScore(picks.restaurants) : [],
      wants('review') ? byScore(picks.reviews) : [],
      wants('list') ? byScore(picks.lists) : [],
    ].filter((g) => g.length);

// A drop should span formats and never show the same venue twice, so take the
// best remaining pick from each kind in turn rather than the global top N.
const seen = new Set();
// A rebuild replays exactly what the batch already contains.
const queue = rebuiltFrom
  ? rebuiltFrom.items.map((i) => ({ kind: i.kind, id: i.id, name: i.name, score: i.score, warnings: i.warnings ?? [], signals: i.signals }))
  : [];
const takeNext = (group) => {
  while (group.length) {
    const p = group.shift();
    if (allowDuplicates || !seen.has(p.id)) return p;
  }
  return null;
};
for (let progressed = !rebuiltFrom; progressed && queue.length < limit; ) {
  progressed = false;
  for (const group of groups) {
    if (queue.length >= limit) break;
    const p = takeNext(group);
    if (!p) continue;
    seen.add(p.id);
    queue.push(p);
    progressed = true;
  }
}

if (!queue.length) {
  console.error(`No subjects of kind "${kind}" in ${subjectsPath}.`);
  process.exit(1);
}

// Renders shell out to the Remotion CLI, which lives in remotion/node_modules.
const remotionInstalled =
  existsSync(join(REMOTION_ROOT, 'node_modules', 'remotion')) ||
  existsSync(join(REMOTION_ROOT, '..', 'node_modules', 'remotion'));
if (shouldRender && !remotionInstalled && !dryRun) {
  console.error(
    'Remotion is not installed. Run `npm install` inside remotion/ first, or pass --no-render to queue props + captions only.'
  );
  process.exit(1);
}

const batchId = rebuildId || newBatchId();
const batchDir = join(QUEUE_ROOT, batchId);
const rel = (p) => relative(QUEUE_ROOT, p).split('\\').join('/');

console.log(
  `${rebuiltFrom ? 'Rebuilding' : 'Batch'} ${batchId} — ${queue.length} item(s), render ${shouldRender ? 'on' : 'off'}`
);
for (const p of queue) console.log(`  ${p.kind.padEnd(10)} ${String(p.score).padStart(5)}  ${p.name}`);
if (dryRun) {
  console.log(`\nDry run — nothing written. Output would land in ${batchDir}`);
  process.exit(0);
}
mkdirSync(batchDir, { recursive: true });

// ── Produce ──────────────────────────────────────────────────────────────
const node = process.execPath;
const run = (file, argv) => execFileSync(file, argv, { cwd: REMOTION_ROOT, stdio: 'inherit', shell: file !== node });

/**
 * Renders drive a headless browser for minutes at a time and do fail
 * transiently under memory pressure — one observed crash re-rendered cleanly
 * with no change. Retry once so a blip does not cost the whole item.
 */
const runRender = (file, argv, label) => {
  try {
    run(file, argv);
  } catch (e) {
    console.warn(`${label} failed (${e.message.split('\n')[0]}) — retrying once`);
    run(file, argv);
  }
};

const items = [];
const ledger = loadLedger();
let recorded = 0;

for (const pick of queue) {
  const cfg = FETCHERS[pick.kind];
  const slug = `${pick.kind}-${slugify(pick.name) || pick.id.slice(0, 8)}`;
  const propsPath = join(batchDir, `${slug}.props.json`);
  const videoPath = join(batchDir, `${slug}.mp4`);
  const stillPath = join(batchDir, `${slug}.jpg`);
  const captionPath = join(batchDir, `${slug}.caption.txt`);
  const item = {
    kind: pick.kind,
    id: pick.id,
    name: pick.name,
    composition: cfg.composition,
    score: pick.score,
    warnings: pick.warnings ?? [],
    status: 'pending',
    props: rel(propsPath),
  };

  try {
    console.log(`\n── ${pick.name} (${pick.kind}) ──`);
    const fetchArgs = [join('scripts', cfg.script), '--id', pick.id, '--out', propsPath, ...(cfg.extraArgs ?? [])];
    // A restaurant with fewer reviews than the default gets exactly what it has.
    if (pick.kind === 'restaurant' && pick.signals?.reviewPool && pick.signals.reviewPool < 3) {
      fetchArgs.push('--reviews', String(pick.signals.reviewPool));
    }
    run(node, fetchArgs);

    const props = JSON.parse(readFileSync(propsPath, 'utf8'));
    writeFileSync(captionPath, `${captionFor(pick.kind, props)}\n`);
    item.caption = rel(captionPath);
    item.status = 'props-only';
    // Merge what the picker predicted with what the finished props reveal, so a
    // rebuild (which has no picker run behind it) still flags everything.
    item.warnings = [...new Set([...item.warnings, ...warningsFromProps(pick.kind, props)])];

    if (!shouldRender && rebuiltFrom && existsSync(videoPath)) {
      // `--rebuild --no-render` is the metadata-only refresh: keep the existing
      // assets and just bring the caption, warnings and manifest up to date.
      item.video = rel(videoPath);
      item.status = 'rendered';
      if (existsSync(stillPath)) item.still = rel(stillPath);
    }

    if (shouldRender) {
      runRender(
        'npx',
        ['remotion', 'render', cfg.composition, videoPath, `--props=${propsPath}`, '--codec', 'h264', '--crf', '18'],
        `render ${pick.name}`
      );
      item.video = rel(videoPath);
      item.status = 'rendered';
      if (shouldStill) {
        // The video is the deliverable; the poster frame is a convenience. A
        // still that will not render must not throw away a good render — and
        // must not leave a stale poster from a previous run passing as current.
        try {
          runRender(
            'npx',
            ['remotion', 'still', cfg.composition, stillPath, `--props=${propsPath}`, `--frame=${cfg.stillFrame}`],
            `still ${pick.name}`
          );
          item.still = rel(stillPath);
        } catch (e) {
          rmSync(stillPath, { force: true });
          item.warnings.push(`poster frame failed to render (${e.message.split('\n')[0]}) — video is unaffected`);
        }
      }
      // A rebuild re-renders content the ledger already knows about; recording
      // it again would double the history and reset the cooldown.
      if (!rebuiltFrom) {
        recordProduced(ledger, {
          kind: pick.kind,
          id: pick.id,
          name: pick.name,
          batchId,
          composition: cfg.composition,
          assets: [item.video, item.still].filter(Boolean),
        });
        recorded += 1;
      }
    }
  } catch (e) {
    item.status = 'failed';
    item.error = e.message;
    console.error(`FAILED: ${pick.name} — ${e.message}`);
    if (!keepGoing) {
      items.push(item);
      break;
    }
  }
  items.push(item);
}

// ── Manifest + review sheet ──────────────────────────────────────────────
const manifest = {
  batchId,
  createdAt: rebuiltFrom?.createdAt ?? new Date().toISOString(),
  ...(rebuiltFrom ? { rebuiltAt: new Date().toISOString() } : {}),
  reviewStatus: 'pending-review',
  policy: 'Nothing in this queue is published automatically. Review, then post manually.',
  rendered: items.filter((i) => i.status === 'rendered').length,
  failed: items.filter((i) => i.status === 'failed').length,
  items,
};
writeFileSync(join(batchDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const review = [
  `# Batch ${batchId}`,
  '',
  `${items.length} item(s) · ${manifest.rendered} rendered · ${manifest.failed} failed` +
    (rebuiltFrom ? ` · rebuilt ${manifest.rebuiltAt}` : ''),
  '',
  'Nothing here is published automatically. Check each reel, then post it yourself.',
  '',
  ...items.flatMap((i) => [
    `## ${i.name} — ${i.kind} (${i.status})`,
    '',
    `- composition: \`${i.composition}\`  · readiness score ${i.score}`,
    `- props: \`${i.props}\``,
    i.video ? `- video: \`${i.video}\`` : '- video: not rendered',
    i.still ? `- still: \`${i.still}\`` : null,
    i.caption ? `- caption: \`${i.caption}\`` : null,
    i.error ? `- error: ${i.error}` : null,
    ...(i.warnings.length ? ['', '**Check before posting:**', ...i.warnings.map((w) => `- ${w}`)] : []),
    '',
  ]),
].filter((l) => l !== null);
writeFileSync(join(batchDir, 'REVIEW.md'), `${review.join('\n')}\n`);

if (recorded) saveLedger(ledger);

console.log(`\nBatch ${batchId}: ${manifest.rendered} rendered, ${manifest.failed} failed, ${items.length} total`);
console.log(`Ledger: ${recorded ? `${recorded} subject(s) recorded` : 'not updated (nothing rendered)'}`);
console.log(`Review: ${join(batchDir, 'REVIEW.md')}`);
