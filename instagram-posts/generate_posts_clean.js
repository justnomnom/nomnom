const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function generatePosts(postsFile, outputDir) {
  const posts = JSON.parse(fs.readFileSync(postsFile, 'utf8'));
  const templatePath = path.join(
    'C:/Users/andre/AppData/Roaming/Claude/local-agent-mode-sessions/skills-plugin/63ea6e59-3084-4c7b-9c6b-4be5c537a0c8/c1b28381-166e-4ea8-9e59-fe8b21ffaa6e/skills/nomnom-news-punchline/assets',
    'template.html'
  );
  const templateHtml = fs.readFileSync(templatePath, 'utf8');

  fs.mkdirSync(outputDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1080, height: 1080 });

  for (const post of posts) {
    let html = templateHtml
      .replace('{{NEWS_SOURCE}}', escapeHtml(post.news_source || ''))
      .replace('{{NEWS_DATE}}', escapeHtml(post.news_date || ''))
      .replace('{{TITLE}}', escapeHtml(post.title || ''))
      .replace('{{SUBTITLE}}', escapeHtml(post.subtitle || ''));

    await page.setContent(html, { waitUntil: 'networkidle' });

    const outPath = path.join(outputDir, post.filename || `post-${posts.indexOf(post)+1}.png`);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log('Generated:', outPath);
  }

  await browser.close();
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const [,, postsFile, outputDir] = process.argv;
if (!postsFile || !outputDir) {
  console.error('Usage: node generate_posts_clean.js posts.json ./output-dir');
  process.exit(1);
}

generatePosts(postsFile, outputDir).catch(err => {
  console.error(err);
  process.exit(1);
});
