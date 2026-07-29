const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const https = require('https');

function getUnsplashUrl(query) {
  const encoded = encodeURIComponent(query || 'food restaurant portugal');
  return `https://source.unsplash.com/featured/860x460/?${encoded}`;
}

function resolveRedirect(url) {
  return new Promise((resolve) => {
    try {
      const req = https.request(url, { method: 'HEAD' }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 303) {
          resolve(res.headers.location || url);
        } else {
          resolve(url);
        }
      });
      req.on('error', () => resolve(url));
      req.setTimeout(10000, () => { req.destroy(); resolve(url); });
      req.end();
    } catch (e) {
      resolve(url);
    }
  });
}

async function generatePosts(postsFile, outputDir) {
  const posts = JSON.parse(fs.readFileSync(postsFile, 'utf8'));
  const templatePath = path.join(__dirname, 'template.html');
  const templateHtml = fs.readFileSync(templatePath, 'utf8');

  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1080, height: 1080 });

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`[${i+1}/${posts.length}] ${post.filename || 'post.png'}`);

    let imageUrl = post.image_url || '';
    if (!imageUrl) {
      const query = post.image_query || 'food restaurant';
      const unsplashUrl = getUnsplashUrl(query);
      const FALLBACK = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=860&h=460&fit=crop';
      try {
        const resolved = await Promise.race([
          resolveRedirect(unsplashUrl),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
        ]);
        imageUrl = resolved;
      } catch (e) {
        console.log('  Unsplash timeout, using fallback');
        imageUrl = FALLBACK;
      }
      console.log(`  Image: ${imageUrl.substring(0, 80)}...`);
    }

    const html = templateHtml
      .replace('{{TITLE}}', escapeHtml(post.title || ''))
      .replace('{{SUBTITLE}}', escapeHtml(post.subtitle || ''))
      .replace('{{IMAGE_URL}}', imageUrl)
      .replace('{{NEWS_SOURCE}}', escapeHtml(post.news_source || ''))
      .replace('{{NEWS_DATE}}', escapeHtml(post.news_date || ''));

    await page.setContent(html, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const outPath = path.join(outputDir, post.filename || `post-${i+1}.png`);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`  Saved: ${outPath}`);
  }

  await browser.close();
  console.log('\nDone.');
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const [,, postsFile, outputDir] = process.argv;
if (!postsFile || !outputDir) {
  console.error('Usage: node generate_posts.js posts.json ./output-dir');
  process.exit(1);
}

generatePosts(postsFile, outputDir).catch(err => {
  console.error(err);
  process.exit(1);
});