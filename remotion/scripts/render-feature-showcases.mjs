#!/usr/bin/env node
/**
 * Render a 9:16 reel + 1:1 slideshow (video and stills) for each product feature.
 *
 *   node remotion/scripts/render-feature-showcases.mjs
 *   node remotion/scripts/render-feature-showcases.mjs --only feed
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const REMOTION_ROOT = join(ROOT, '..');
const OUT_ROOT = join(REMOTION_ROOT, 'content-queue', 'feature-showcases');
const FEATURES_SRC = join(REMOTION_ROOT, 'src', 'compositions', 'FeatureShowcase', 'features.js');

const SLIDE_COUNT = 5;
const SLIDE_SEC = 2.8;
const FPS = 30;
const SLIDE_FRAMES = Math.round(SLIDE_SEC * FPS);

const FEATURE_IDS = ['feed', 'lists', 'map', 'roulette', 'table'];

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const ids = only ? FEATURE_IDS.filter((id) => id === only) : FEATURE_IDS;
if (!ids.length) {
  console.error(`Unknown feature "${only}". Use: ${FEATURE_IDS.join(', ')}`);
  process.exit(1);
}

const catalogSrc = readFileSync(FEATURES_SRC, 'utf8');

function readField(id, field) {
  const start = catalogSrc.indexOf(`id: '${id}'`);
  if (start < 0) throw new Error(`feature ${id} missing`);
  const slice = catalogSrc.slice(start, start + 1200);
  const match = slice.match(new RegExp(`${field}:\\s*'([\\s\\S]*?)'`));
  if (!match) throw new Error(`${field} missing for ${id}`);
  return match[1].replace(/\\n/g, '\n');
}

const remotionBin = join(
  REMOTION_ROOT,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'remotion.cmd' : 'remotion'
);

function remotion(cliArgs) {
  const opts = {
    cwd: REMOTION_ROOT,
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32',
  };
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      execFileSync(remotionBin, cliArgs, opts);
      return;
    } catch (err) {
      lastErr = err;
      console.warn(`remotion failed (attempt ${attempt}/3), retrying…`);
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 4000);
    }
  }
  throw lastErr;
}

mkdirSync(OUT_ROOT, { recursive: true });

for (const id of ids) {
  const dir = join(OUT_ROOT, id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'caption.txt'), `${readField(id, 'caption')}\n`);
  const propsPath = join(dir, 'props.json');
  writeFileSync(propsPath, `${JSON.stringify({ featureId: id }, null, 2)}\n`);
  const props = propsPath

  console.log(`\n→ ${id} reel`);
  remotion([
    'render',
    'src/index.js',
    'FeatureReel',
    join(dir, 'reel.mp4'),
    `--props=${props}`,
    '--codec',
    'h264',
    '--crf',
    '18',
  ]);

  console.log(`→ ${id} slideshow video`);
  remotion([
    'render',
    'src/index.js',
    'FeatureSlideshow',
    join(dir, 'slideshow.mp4'),
    `--props=${props}`,
    '--codec',
    'h264',
    '--crf',
    '18',
  ]);

  for (let i = 0; i < SLIDE_COUNT; i += 1) {
    const still = join(dir, `slide-0${i + 1}.jpg`);
    const frame = i * SLIDE_FRAMES + Math.floor(SLIDE_FRAMES / 2);
    console.log(`→ ${id} slide ${i + 1}`);
    remotion([
      'still',
      'src/index.js',
      'FeatureSlideshow',
      still,
      `--props=${props}`,
      `--frame=${frame}`,
    ]);
  }
}

const review = `# Feature showcase batch

Produced ${new Date().toISOString().slice(0, 10)}. Not posted.

| Feature | Folder |
|---|---|
${ids.map((id) => `| ${readField(id, 'title')} | \`${id}/\` |`).join('\n')}

Each folder has \`reel.mp4\` (9:16), \`slideshow.mp4\` (1:1), \`slide-01.jpg\`–\`slide-05.jpg\`, and \`caption.txt\`.

Copy is from shipped locale strings (landing feed / lists / map, Roleta, Mesa). No ratings, user counts, or restaurant names.
`;

writeFileSync(join(OUT_ROOT, 'REVIEW.md'), review);
console.log(`\nDone. ${OUT_ROOT}`);
