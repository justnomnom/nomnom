#!/usr/bin/env node
/**
 * Article URL → match existing NomNom restaurants → confirm JSON → private list
 * → ListShowcase video + per-spot stills.
 *
 * Never invents restaurants. Never auto-posts.
 *
 *   node remotion/scripts/article-to-list.mjs --url <article> --name "List name"
 *   node remotion/scripts/article-to-list.mjs --confirm <review.json> --render
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildListItemRows } from '../../src/libs/lists/build-list-item-rows.js';
import { resolveArticleListConfirm } from '../../src/libs/lists/article-list-confirm.js';
import {
  chunkArticleText,
  capExtractedRows,
  filterExtractedRows,
  mergeExtractedByName,
  stripArticleHtml,
} from '../../src/libs/lists/article-list-extract.js';
import {
  ARTICLE_LIST_NAME_CONCURRENCY,
  mapPool,
  recallRestaurantsByName,
} from '../../src/libs/lists/article-list-recall.js';
import { mintListSlug } from '../../src/libs/lists/article-list-slug.js';
import {
  LIST_SHOWCASE_POSTER_FRAME,
  spotStillFrame,
  videoPlaceCount,
} from '../../src/libs/lists/article-list-stills.js';
import { matchRestaurantByName } from '../../src/libs/lists/pick-restaurant-match.js';
import { captionForList, captionForListSpot } from './lib/captions.mjs';
import { qwenJsonChat } from './lib/qwen-json-chat.mjs';
import { MIN_LIST_PLACES } from './lib/reel-readiness.mjs';
import { getSupabase, REMOTION_ROOT } from './lib/supabase-client.mjs';
import { slugify } from './lib/subject-text.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const QUEUE_ROOT = join(REMOTION_ROOT, 'content-queue', 'article-lists');

const EXTRACT_SYSTEM = `You extract named restaurants from a Portugal food/lifestyle article.
Return JSON: {"restaurants":[{"name":"string","area":"neighbourhood or city if stated","evidence":"verbatim quote from the article that names or clearly refers to this restaurant"}]}.
Only named restaurants. No magazine scores, no invented venues, no bars-only unless they serve food as a restaurant.
Portuguese and English names are allowed. evidence must be copied from the article text.`;

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (name) => args.includes(`--${name}`);

/**
 * @returns {string}
 */
function requireOperatorUserId() {
  const fromFlag = flag('user-id')?.trim();
  const fromEnv = process.env.OPERATOR_USER_ID?.trim();
  if (!fromFlag || !fromEnv) {
    throw new Error('--user-id and OPERATOR_USER_ID are both required and must be equal');
  }
  if (fromFlag !== fromEnv) {
    throw new Error('--user-id must equal OPERATOR_USER_ID');
  }
  return fromFlag;
}

/**
 * @param {string} url
 */
async function fetchArticleText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'NomNomArticleList/1.0 (internal ops)' },
  });
  if (!res.ok) {
    throw new Error(`Fetch failed ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  const text = stripArticleHtml(html);
  if (text.length < 500) {
    throw new Error(
      `Article body is ${text.length} characters after stripping HTML (need ≥500). Fail closed — no Playwright in v1.`
    );
  }
  return text;
}

/**
 * @param {string} articleText
 */
async function extractRestaurants(articleText) {
  const chunks = chunkArticleText(articleText);
  const perChunk = [];
  for (const chunk of chunks) {
    const payload = await qwenJsonChat({
      system: EXTRACT_SYSTEM,
      user: chunk,
      maxTokens: 4096,
      logTag: 'article-to-list',
    });
    const rows = filterExtractedRows(payload?.restaurants, articleText);
    perChunk.push(...rows);
  }
  return capExtractedRows(mergeExtractedByName(perChunk));
}

/**
 * @param {{ name: string, area: string, evidence: string }[]} extracted
 * @param {{ from: Function }} sb
 */
async function matchExtracted(extracted, sb) {
  return mapPool(extracted, ARTICLE_LIST_NAME_CONCURRENCY, async (row) => {
    const candidates = await recallRestaurantsByName(sb, row.name);
    const matched = matchRestaurantByName({ name: row.name, candidates });
    return {
      name: row.name,
      area: row.area,
      evidence: row.evidence,
      status: matched.status,
      restaurant_id: matched.restaurant_id,
      candidates: matched.candidates,
      decision: matched.decision,
      picked_id: null,
    };
  });
}

/**
 * @param {string} reviewPath
 */
function loadReview(reviewPath) {
  if (!existsSync(reviewPath)) {
    throw new Error(`review.json not found: ${reviewPath}`);
  }
  return JSON.parse(readFileSync(reviewPath, 'utf8'));
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 * @param {string} userId
 */
async function assertUserExists(sb, userId) {
  const { data, error } = await sb.from('users').select('id').eq('id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`OPERATOR user ${userId} does not exist in public.users`);
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} sb
 * @param {object} review
 * @param {string[]} restaurantIds
 * @param {string} userId
 * @param {string} listName
 */
async function confirmList(sb, review, restaurantIds, userId, listName) {
  let listId = typeof review.list_id === 'string' && review.list_id ? review.list_id : null;

  if (listId) {
    const { data: listRow, error } = await sb
      .from('lists')
      .select('id, user_id')
      .eq('id', listId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!listRow || listRow.user_id !== userId) {
      throw new Error('list_id does not belong to OPERATOR_USER_ID');
    }
    const { error: delErr } = await sb.from('list_items').delete().eq('list_id', listId);
    if (delErr) throw new Error(`delete list_items: ${delErr.message}`);
    await sb.from('lists').update({ name: listName }).eq('id', listId);
  } else {
    const { data: inserted, error } = await sb
      .from('lists')
      .insert({
        name: listName,
        description: '',
        visibility: 'private',
        user_id: userId,
        published_at: null,
      })
      .select('id')
      .single();
    if (error || !inserted?.id) {
      throw new Error(`insert lists: ${error?.message || 'no id returned'}`);
    }
    listId = inserted.id;
  }

  const slugResult = await mintListSlug(sb, listId);
  if (slugResult.error) {
    console.warn(`slug mint: ${slugResult.error}`);
  }

  const rows = buildListItemRows({ listId, restaurantIds, addedBy: userId });
  if (rows.length) {
    const { error: insErr } = await sb.from('list_items').insert(rows);
    if (insErr) throw new Error(`insert list_items: ${insErr.message}`);
  }

  return listId;
}

/**
 * @param {string} listId
 * @param {string} outDir
 * @param {number} videoPlaces
 * @param {number} stillPlaces
 */
function renderList(listId, outDir, videoPlaces, stillPlaces) {
  const fetchScript = join(__dirname, 'fetch-list-props.mjs');
  const videoProps = join(outDir, 'props-video.json');
  const stillProps = join(outDir, 'props-stills.json');
  const runFetch = (places, out) => {
    execFileSync(process.execPath, [fetchScript, '--id', listId, '--places', String(places), '--out', out], {
      cwd: REMOTION_ROOT,
      stdio: 'inherit',
    });
  };
  runFetch(videoPlaces, videoProps);
  runFetch(stillPlaces, stillProps);

  const mp4 = join(outDir, 'list.mp4');
  execFileSync(
    'npx',
    ['remotion', 'render', 'ListShowcase', mp4, `--props=${videoProps}`, '--codec', 'h264', '--crf', '18'],
    { cwd: REMOTION_ROOT, stdio: 'inherit', shell: true }
  );

  const poster = join(outDir, 'poster.jpg');
  execFileSync(
    'npx',
    ['remotion', 'still', 'ListShowcase', poster, `--props=${videoProps}`, `--frame=${LIST_SHOWCASE_POSTER_FRAME}`],
    { cwd: REMOTION_ROOT, stdio: 'inherit', shell: true }
  );

  for (let i = 0; i < stillPlaces; i += 1) {
    const frame = spotStillFrame(stillPlaces, i);
    if (frame == null) continue;
    const dest = join(outDir, `spot-${String(i + 1).padStart(2, '0')}.jpg`);
    execFileSync(
      'npx',
      ['remotion', 'still', 'ListShowcase', dest, `--props=${stillProps}`, `--frame=${frame}`],
      { cwd: REMOTION_ROOT, stdio: 'inherit', shell: true }
    );
  }

  const stills = JSON.parse(readFileSync(stillProps, 'utf8'));
  writeFileSync(join(outDir, 'caption.txt'), `${captionForList(stills)}\n`);
  (stills.places || []).forEach((place, i) => {
    writeFileSync(
      join(outDir, `spot-${String(i + 1).padStart(2, '0')}.caption.txt`),
      `${captionForListSpot(place, stills.list)}\n`
    );
  });
}

async function runExtract() {
  const url = flag('url');
  const name = flag('name')?.trim();
  if (!url || !name) {
    throw new Error('Usage: node remotion/scripts/article-to-list.mjs --url <article> --name "List name"');
  }

  const sb = getSupabase();
  const articleText = await fetchArticleText(url);
  const extracted = await extractRestaurants(articleText);
  const matched = await matchExtracted(extracted, sb);

  const slug = slugify(name) || `article-list-${Date.now()}`;
  const outDir = join(QUEUE_ROOT, slug);
  mkdirSync(outDir, { recursive: true });
  const reviewPath = join(outDir, 'review.json');
  const review = {
    source_url: url,
    list_name: name,
    list_id: null,
    confirmed_at: null,
    extracted: matched,
  };
  writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`);

  const unmatched = matched.filter((row) => row.status === 'not_found');
  const ambiguous = matched.filter((row) => row.status === 'ambiguous');
  console.log(`Wrote ${reviewPath}`);
  console.log(`extracted ${matched.length} · matched ${matched.filter((r) => r.status === 'matched').length} · ambiguous ${ambiguous.length} · not_found ${unmatched.length}`);
  if (unmatched.length) {
    console.log('Unmatched (ingest then re-run):');
    for (const row of unmatched) console.log(`  - ${row.name}`);
  }
  console.log(`Edit decisions, then:\n  node remotion/scripts/article-to-list.mjs --confirm ${reviewPath} --render --user-id <uuid>`);
}

async function runConfirm() {
  const confirmArg = flag('confirm');
  if (!confirmArg) {
    throw new Error('Usage: node remotion/scripts/article-to-list.mjs --confirm <review.json> [--render] --user-id <uuid>');
  }
  const reviewPath = resolve(confirmArg);
  if (!existsSync(reviewPath)) {
    throw new Error(`review.json not found: ${reviewPath}`);
  }
  const sb = getSupabase();
  const userId = requireOperatorUserId();
  await assertUserExists(sb, userId);

  const review = loadReview(reviewPath);
  const resolved = resolveArticleListConfirm(review, { iConfirmed: has('i-confirmed') });
  if (!resolved.ok) throw new Error(resolved.error);

  const uniqueIds = [...new Set(resolved.restaurantIds)];
  if (uniqueIds.length < MIN_LIST_PLACES) {
    throw new Error(`Need at least ${MIN_LIST_PLACES} accepted restaurants (got ${uniqueIds.length})`);
  }

  const listId = await confirmList(sb, review, uniqueIds, userId, resolved.listName);
  review.list_id = listId;
  if (!review.confirmed_at) review.confirmed_at = new Date().toISOString();
  writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`);
  console.log(`List ${listId} (${uniqueIds.length} places)`);

  if (has('render')) {
    const outDir = dirname(reviewPath);
    const videoPlaces = videoPlaceCount(uniqueIds.length);
    renderList(listId, outDir, videoPlaces, uniqueIds.length);
    console.log(`Rendered video (${videoPlaces} places) and ${uniqueIds.length} stills in ${outDir}`);
  }
}

try {
  if (has('confirm')) {
    await runConfirm();
  } else {
    await runExtract();
  }
} catch (e) {
  console.error(e.message || e);
  process.exit(1);
}
