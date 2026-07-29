#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, createReadStream } from 'node:fs';
import { open } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { setTimeout as sleep } from 'node:timers/promises';

const JSON_PATH =
  process.argv[2] ||
  String.raw`C:\Users\andre\Downloads\google-maps-scraper\restaurants\out\restaurants-full.json`;
const ENDPOINT = process.env.INGEST_ENDPOINT || 'http://localhost:3032/api/restaurants/ingest';
const SECRET = process.env.RESTAURANT_INGEST_SECRET;
const CONCURRENCY = Number(process.env.CONCURRENCY || 4);
const MAX_RETRIES = Number(process.env.MAX_RETRIES || 4);
const PROGRESS_PATH = 'scripts/.ingest-progress.json';
const RESULTS_PATH = 'scripts/.ingest-results.json';

if (!SECRET) {
  console.error('Missing RESTAURANT_INGEST_SECRET env');
  process.exit(1);
}

// --- Input ---------------------------------------------------------------
// Accept either a JSON array (small / pretty-printed files) or JSONL — one
// object per line, which is the scraper's `-json` output. JSONL is streamed
// line-by-line so a country-scale file (multi-GB, beyond V8's ~512MB
// single-string JSON.parse limit) never has to be held in memory at once.
async function detectMode(path) {
  const fd = await open(path, 'r');
  try {
    const buf = Buffer.alloc(64);
    const { bytesRead } = await fd.read(buf, 0, 64, 0);
    const head = buf.subarray(0, bytesRead).toString('utf8').trim();
    return head[0] === '[' ? 'array' : 'jsonl';
  } finally {
    await fd.close();
  }
}

async function* iterItems(path) {
  const mode = await detectMode(path);

  if (mode === 'array') {
    const arr = JSON.parse(readFileSync(path, 'utf8'));
    console.log(`Loaded ${arr.length} entries (JSON array) from ${path}`);
    for (let i = 0; i < arr.length; i++) yield [arr[i], i, arr.length];
    return;
  }

  console.log(`Streaming JSONL from ${path}`);
  const rl = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
  let i = 0;
  for await (const line of rl) {
    const t = line.trim().replace(/,\s*$/, ''); // tolerate array-formatted lines
    if (!t || t === '[' || t === ']') continue;
    let obj;
    try {
      obj = JSON.parse(t);
    } catch {
      continue;
    }
    yield [obj, i++, null];
  }
}

// Async generators forbid concurrent .next(); serialize pulls so the worker
// pool can share one streaming iterator safely.
function lockedIterator(gen) {
  let lock = Promise.resolve();
  return () => {
    const p = lock.then(() => gen.next());
    lock = p.then(
      () => {},
      () => {}
    );
    return p;
  };
}

// --- Resume state --------------------------------------------------------
let done = {};
if (existsSync(PROGRESS_PATH)) {
  try {
    done = JSON.parse(readFileSync(PROGRESS_PATH, 'utf8'));
    console.log(`Resuming: ${Object.keys(done).length} already processed`);
  } catch {
    done = {};
  }
}

// Only failures/skips are kept on disk — storing every OK result and rewriting
// it each flush is O(n^2) and blows up at country scale. The resume map above
// records successes (id + status); this file is just the diagnostics tail.
const results = existsSync(RESULTS_PATH) ? JSON.parse(readFileSync(RESULTS_PATH, 'utf8')) : [];

let succeeded = 0;
let failed = 0;
let skipped = 0;
let processedSinceFlush = 0;

const flushProgress = () => {
  writeFileSync(PROGRESS_PATH, JSON.stringify(done));
  writeFileSync(RESULTS_PATH, JSON.stringify(results, null, 2));
};

function backoffMs(attempt, res) {
  const retryAfter = res ? Number(res.headers.get('retry-after')) : NaN;
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(retryAfter * 1000, 60_000);
  }
  return Math.min(30_000, 500 * 2 ** attempt) + Math.floor(Math.random() * 500);
}

// POST with retry/backoff on 429 (rate limit) and 5xx / network errors. 4xx
// other than 429 are returned as-is (bad payload / auth — retrying won't help).
async function postWithRetry(item) {
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${SECRET}` },
        body: JSON.stringify(item),
      });
    } catch (e) {
      if (attempt < MAX_RETRIES) {
        await sleep(backoffMs(attempt, null));
        continue;
      }
      throw e;
    }

    if ((res.status === 429 || res.status >= 500) && attempt < MAX_RETRIES) {
      await sleep(backoffMs(attempt, res));
      continue;
    }

    return res;
  }
}

async function ingest(item, idx, total) {
  const key = item.place_id || `${idx}`;
  if (done[key]) {
    skipped++;
    return;
  }

  // The scraper keeps its deep, star-rating-carrying reviews in
  // `user_reviews_extended`; `user_reviews` is the shallow RPC set. The ingest
  // mapper reads `user_reviews` (and caps at 25), so promote the good ones.
  if (Array.isArray(item.user_reviews_extended) && item.user_reviews_extended.length) {
    item.user_reviews = item.user_reviews_extended;
  }

  const tag = `[${idx + 1}${total ? `/${total}` : ''}]`;
  const started = Date.now();
  try {
    const res = await postWithRetry(item);
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
    const ms = Date.now() - started;

    if (res.ok) {
      succeeded++;
      done[key] = { ok: true, id: body.id, status: res.status };
      console.log(
        `${tag} OK ${res.status} ${ms}ms ${body.created ? 'created' : 'updated'} ${item.title}`
      );
    } else if (res.status === 422) {
      // Expected skip: permanently closed or outside Portugal. Mark done so a
      // resume doesn't keep retrying it.
      skipped++;
      done[key] = { ok: false, skipped: true, status: res.status, error: body.error };
      results.push({ idx, place_id: key, title: item.title, status: res.status, ms, body });
      console.log(`${tag} SKIP ${res.status} ${body.error || ''} :: ${item.title}`);
    } else {
      failed++;
      done[key] = { ok: false, status: res.status, error: body.error };
      results.push({ idx, place_id: key, title: item.title, status: res.status, ms, body });
      console.log(`${tag} FAIL ${res.status} ${ms}ms ${body.error || 'err'} :: ${item.title}`);
    }
  } catch (e) {
    failed++;
    done[key] = { ok: false, error: String(e?.message || e) };
    results.push({ idx, place_id: key, title: item.title, error: String(e?.message || e) });
    console.log(`${tag} EXC ${e?.message || e} :: ${item.title}`);
  }

  if (++processedSinceFlush >= 25) {
    processedSinceFlush = 0;
    flushProgress();
  }
}

const next = lockedIterator(iterItems(JSON_PATH));

async function worker() {
  for (;;) {
    const { value, done: streamDone } = await next();
    if (streamDone) break;
    const [item, idx, total] = value;
    await ingest(item, idx, total);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));
flushProgress();

console.log('');
console.log(`Done. ok=${succeeded} fail=${failed} skipped=${skipped}`);

const byError = {};
for (const r of results) {
  if (r.body?.error || r.error) {
    const k = r.body?.error || r.error;
    byError[k] = (byError[k] || 0) + 1;
  }
}
if (Object.keys(byError).length) {
  console.log('Error breakdown:');
  for (const [k, v] of Object.entries(byError).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${v}\t${k}`);
  }
}
