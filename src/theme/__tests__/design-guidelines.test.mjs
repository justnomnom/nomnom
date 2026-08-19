/**
 * Static DESIGN.md guardrails.
 *
 * These encode rules nothing enforces at runtime, and both have already shipped
 * broken here: a `size="small"` Button silently renders 30px tall, and a hardcoded
 * hex silently stops tracking the brand.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

const NL = String.fromCharCode(10);
const WS = [' ', NL, String.fromCharCode(13), String.fromCharCode(9)];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!p.includes('__tests__') && !p.includes('node_modules')) walk(p, out);
    } else if (p.endsWith('.js')) out.push(p);
  }
  return out;
}

/** Opening `<Tag ...>` spans, brace-aware so `onClick={() => x}` does not end the tag. */
function openingTags(src, tag) {
  const out = [];
  const needle = '<' + tag;
  let from = 0;
  let i = src.indexOf(needle, from);
  while (i !== -1) {
    from = i + needle.length;
    if (WS.includes(src[i + needle.length])) {
      let depth = 0;
      let j = i;
      for (; j < src.length; j += 1) {
        const c = src[j];
        if (c === '{') depth += 1;
        else if (c === '}') depth -= 1;
        else if (c === '>' && depth === 0) break;
      }
      out.push({ text: src.slice(i, j + 1), line: src.slice(0, i).split(NL).length });
    }
    i = src.indexOf(needle, from);
  }
  return out;
}

const FILES = walk('src');
const rel = (f) => f.split(path.sep).join('/');

describe('DESIGN.md §19 — 44px touch targets', () => {
  it('every size="small" Button declares a touch floor', () => {
    const offenders = [];
    for (const f of FILES) {
      const src = fs.readFileSync(f, 'utf8');
      for (const tag of openingTags(src, 'Button')) {
        if (!tag.text.includes('size="small"')) continue;
        const hasFloor =
          tag.text.includes('touchTargetSx') ||
          tag.text.includes('minHeight') ||
          tag.text.includes('height:');
        if (!hasFloor) offenders.push(rel(f) + ':' + tag.line);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      'size="small" renders 30px tall. DESIGN.md §19 calls 44x44 a Capacitor/iOS ' +
        'requirement, not a soft guideline — spread touchTargetSx or set an explicit ' +
        'height on: ' + offenders.join(', ')
    );
  });
});

describe('DESIGN.md §12 — no hardcoded brand hex in components', () => {
  it('no component file hardcodes a palette colour', () => {
    // Scoped to the rule as written: "hardcoded hex colors in COMPONENT files".
    // Out of scope on purpose, because these cannot read the MUI theme:
    //   src/config-global.js  themeColor for the PWA manifest / meta tag
    //   src/libs/email/*      email HTML, where clients need literal inline hex
    // Comment lines are dropped so prose citing #FF6B35 (readable-accent.js) is fine.
    const BRAND = ['#ff6b35', '#ffe8df', '#e85a28', '#b8481f'];
    const scoped = FILES.filter(
      (f) => f.includes(path.join('src', 'sections')) || f.includes(path.join('src', 'components'))
    );
    const offenders = [];
    for (const f of scoped) {
      const code = fs
        .readFileSync(f, 'utf8')
        .toLowerCase()
        .split(NL)
        .filter((l) => {
          const t = l.trim();
          return !t.startsWith('*') && !t.startsWith('//') && !t.startsWith('/*');
        })
        .join(NL);
      for (const hex of BRAND) {
        if (code.includes(hex)) offenders.push(rel(f) + ' -> ' + hex);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      'Hardcoded brand hex bypasses the theme and breaks dark mode (DESIGN.md §12). ' +
        'Import from src/theme/palette or read theme.palette.* in: ' + offenders.join(', ')
    );
  });
});
