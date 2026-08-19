#!/usr/bin/env node
/**
 * generate_posts.js
 * Generates 1080x1080 Instagram PNGs from posts.json using the NomNom template.
 * Downloads food images from Unsplash as base64 to avoid CORS in Playwright.
 *
 * Usage:
 *   node generate_posts.js posts.json ./output-dir
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

function fetchImage(url, hops = 6) {
  return new Promise((resolve, reject) => {
    if (!hops) return reject(new Error('too many redirects'));
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*,*/*' },
      timeout: 20000
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        req.destroy();
        resolve(fetchImage(res.headers.location, hops - 1));
        return;
      }
      if (res.statusCode !== 200) { req.destroy(); reject(new Error('HTTP ' + res.statusCode)); return; }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

async function toDataUri(query, directUrl) {
  const sources = [
    directUrl,
    `https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=860&h=460&fit=crop`,
  ].filter(Boolean);

  for (const url of sources) {
    try {
      process.stdout.write(`  img: ${url.slice(0, 70)}...\n`);
      const buf = await fetchImage(url);
      let mime = 'image/jpeg';
      if (buf[0] === 0x89 && buf[1] === 0x50) mime = 'image/png';
      process.stdout.write(`  ok ${Math.round(buf.length / 1024)}KB\n`);
      return `data:${mime};base64,${buf.toString('base64')}`;
    } catch (e) {
      process.stdout.write(`  fail: ${e.message}\n`);
    }
  }
  return '';
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function run(postsFile, outDir) {
  const posts = JSON.parse(fs.readFileSync(postsFile, 'utf8'));
  const tpl = fs.readFileSync(path.join(__dirname, '..', 'assets', 'template.html'), 'utf8');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1080, height: 1080 });

  for (let i = 0; i < posts.length; i++) {
    const p = posts[i];
    console.log(`\n[${i + 1}/${posts.length}] ${p.filename || `post-${i + 1}.png`}`);
    const imgUri = await toDataUri(p.image_query || 'food restaurant portugal', p.image_url || '');
    const html = tpl
      .replaceAll('{{TITLE}}', esc(p.title))
      .replaceAll('{{SUBTITLE}}', esc(p.subtitle))
      .replaceAll('{{IMAGE_URL}}', imgUri)
      .replaceAll('{{NEWS_SOURCE}}', esc(p.news_source))
      .replaceAll('{{NEWS_DATE}}', esc(p.news_date));

    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);

    const out = path.join(outDir, p.filename || `post-${i + 1}.png`);
    await page.screenshot({ path: out });
    console.log(`  saved: ${out}`);
  }

  await browser.close();
  console.log('\nAll done.');
}

const [,, postsFile, outDir] = process.argv;
if (!postsFile || !outDir) {
  console.error('Usage: node generate_posts.js posts.json ./output-dir');
  process.exit(1);
}
run(postsFile, outDir).catch(e => { console.error(e); process.exit(1); });
