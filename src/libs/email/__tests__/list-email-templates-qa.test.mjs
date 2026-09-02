/**
 * Frontend QA — email templates must escape injected user strings.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { liveListUpdateHtml, listUpdateDigestHtml } from '../list-email-templates.js';

test('liveListUpdateHtml: escapes XSS in list/creator names and URLs', () => {
  const html = liveListUpdateHtml({
    listName: '<script>alert(1)</script>',
    creatorName: 'Tom & Jerry',
    listUrl: 'https://x.com/"onclick=evil',
    manageUrl: "https://x.com/'onclick=evil",
  });
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('Tom &amp; Jerry'));
  assert.ok(html.includes('&quot;'));
  assert.ok(html.includes('&#39;'));
  assert.ok(html.includes('NomNom'));
  assert.ok(html.includes('color:#B8481F'));
  assert.ok(html.includes('color:#15130f'));
  assert.ok(html.includes('color:#6e6657'));
  assert.ok(!html.includes('font-weight:800;color:#FF6B35'));
  assert.ok(!html.includes('#475569'));
  assert.ok(!html.includes('#94A3B8'));
  assert.ok(!html.includes('#121110'));
});

test('listUpdateDigestHtml: escapes item fields and manage URL', () => {
  const html = listUpdateDigestHtml({
    items: [
      {
        listName: '<b>Evil</b>',
        listUrl: 'https://ok.com/"x',
        count: 2,
      },
    ],
    manageUrl: 'https://manage.com/<x>',
  });
  assert.ok(!html.includes('<b>Evil</b>'));
  assert.ok(html.includes('&lt;b&gt;Evil&lt;/b&gt;'));
  assert.ok(html.includes('2 new spots'));
  assert.ok(html.includes('&lt;x&gt;'));
  assert.ok(html.includes('&quot;'));
  assert.ok(html.includes('color:#B8481F'));
  assert.ok(html.includes('color:#15130f'));
  assert.ok(html.includes('color:#6e6657'));
  assert.ok(!html.includes('#475569'));
  assert.ok(!html.includes('#94A3B8'));
});
