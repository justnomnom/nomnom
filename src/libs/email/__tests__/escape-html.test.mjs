/**
 * Unit tests for escapeHtml — the XSS guard for all email template variables.
 *
 * Run: node --test src/libs/email/__tests__/escape-html.test.mjs
 *
 * Why this exists: liveListUpdateHtml injects user-provided strings (listName,
 * creatorName, listUrl, manageUrl) directly into HTML. escapeHtml() is the only
 * defence. If it's ever removed or bypassed, these tests catch it immediately.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHtml } from '../escape-html.js';

// ---------------------------------------------------------------------------
// Core entity escaping
// ---------------------------------------------------------------------------

test('escapes & to &amp;', () => {
  assert.equal(escapeHtml('Tom & Jerry'), 'Tom &amp; Jerry');
});

test('escapes < to &lt;', () => {
  assert.equal(escapeHtml('<script>'), '&lt;script&gt;');
});

test('escapes > to &gt;', () => {
  assert.equal(escapeHtml('5 > 3'), '5 &gt; 3');
});

test('escapes " to &quot;', () => {
  assert.equal(escapeHtml('say "hello"'), 'say &quot;hello&quot;');
});

test("escapes ' to &#39;", () => {
  assert.equal(escapeHtml("it's"), "it&#39;s");
});

// ---------------------------------------------------------------------------
// XSS attack vectors — these would break the email if escapeHtml were removed
// ---------------------------------------------------------------------------

test('neutralises script injection in list name', () => {
  const malicious = '<script>alert("xss")</script>';
  const result = escapeHtml(malicious);
  assert.ok(!result.includes('<script>'), 'raw <script> tag must not appear in output');
  assert.ok(!result.includes('</script>'), 'raw </script> tag must not appear in output');
});

test('neutralises attribute injection (href smuggling)', () => {
  const malicious = '" onmouseover="alert(1)';
  const result = escapeHtml(malicious);
  assert.ok(!result.includes('"'), 'raw double-quote must not appear in output');
});

test('neutralises single-quote attribute injection', () => {
  const malicious = "' onclick='evil()";
  const result = escapeHtml(malicious);
  assert.ok(!result.includes("'"), "raw single-quote must not appear in output");
});

test('neutralises HTML entity double-encoding attempt', () => {
  const input = '&lt;script&gt;';
  const result = escapeHtml(input);
  // The & in &lt; must itself be escaped → &amp;lt;
  assert.ok(result.startsWith('&amp;'), 'leading & must be escaped to &amp;');
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

test('returns empty string for non-string input (null)', () => {
  assert.equal(escapeHtml(null), '');
});

test('returns empty string for non-string input (undefined)', () => {
  assert.equal(escapeHtml(undefined), '');
});

test('returns empty string for non-string input (number)', () => {
  assert.equal(escapeHtml(42), '');
});

test('passes through plain text unchanged', () => {
  assert.equal(escapeHtml('Lisbon Hidden Gems'), 'Lisbon Hidden Gems');
});

test('handles empty string', () => {
  assert.equal(escapeHtml(''), '');
});

test('handles very long string without truncation', () => {
  const long = 'a'.repeat(10_000);
  assert.equal(escapeHtml(long).length, 10_000);
});
