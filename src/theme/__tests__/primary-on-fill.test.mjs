/**
 * Product lock: labels on filled terracotta stay white.
 * The 2026-08-16 contrastText → ink change painted every primary CTA black.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import { palette, PRIMARY_ON_FILL_TEXT } from '../palette.js';
import { button } from '../overrides/components/button.js';
import { chip } from '../overrides/components/chip.js';
import { fab } from '../overrides/components/fab.js';

const require = createRequire(import.meta.url);
const { createTheme } = require('@mui/material/styles');

const REPO_THEME = path.dirname(fileURLToPath(import.meta.url));
const INK_ON_TERRACOTTA = '#15130f';

function flattenStyleResult(result) {
  const out = {};
  const visit = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value === 'object') {
      Object.assign(out, value);
    }
  };
  visit(result);
  return out;
}

function themeWithShadows() {
  const base = createTheme({ palette: palette('light') });
  return createTheme(base, {
    customShadows: {
      primary: 'none',
      primaryHover: 'none',
      z8: 'none',
      z12: 'none',
      z16: 'none',
    },
  });
}

describe('PRIMARY_ON_FILL_TEXT product lock', () => {
  it('is pure white — never the warm ink that blackened primary buttons', () => {
    assert.equal(PRIMARY_ON_FILL_TEXT.toUpperCase(), '#FFFFFF');
    assert.notEqual(PRIMARY_ON_FILL_TEXT.toLowerCase(), INK_ON_TERRACOTTA);
  });

  it('is primary.contrastText in light and dark (MUI filled surfaces read this)', () => {
    assert.equal(palette('light').primary.contrastText, PRIMARY_ON_FILL_TEXT);
    assert.equal(palette('dark').primary.contrastText, PRIMARY_ON_FILL_TEXT);
    assert.notEqual(palette('light').primary.contrastText.toLowerCase(), INK_ON_TERRACOTTA);
  });

  it('contained primary Button label is white even if contrastText is edited later', () => {
    const theme = themeWithShadows();
    const root = button(theme).MuiButton.styleOverrides.root;
    const styles = flattenStyleResult(
      root({ ownerState: { color: 'primary', variant: 'contained', size: 'medium' } })
    );
    assert.equal(styles.color, PRIMARY_ON_FILL_TEXT);
  });

  it('filled primary Chip label is white', () => {
    const theme = themeWithShadows();
    const root = chip(theme).MuiChip.styleOverrides.root;
    const styles = flattenStyleResult(
      root({ ownerState: { color: 'primary', variant: 'filled' } })
    );
    assert.equal(styles.color, PRIMARY_ON_FILL_TEXT);
  });

  it('circular primary Fab label is white', () => {
    const theme = themeWithShadows();
    const root = fab(theme).MuiFab.styleOverrides.root;
    const styles = flattenStyleResult(
      root({ ownerState: { color: 'primary', variant: 'circular' } })
    );
    assert.equal(styles.color, PRIMARY_ON_FILL_TEXT);
  });

  it('selected-chip token stays aliased to PRIMARY_ON_FILL_TEXT', () => {
    const chipSrc = fs.readFileSync(
      path.join(REPO_THEME, '../../components/scrollable-chip-select/scrollable-chip-select.js'),
      'utf8'
    );
    assert.match(chipSrc, /SCROLLABLE_CHIP_SELECTED_TEXT = PRIMARY_ON_FILL_TEXT/);
  });

  it('terracotta fills pair with contrastText, not common.white', () => {
    const roots = [
      path.join(REPO_THEME, '../../sections/home/home-hero-showcase.js'),
      path.join(REPO_THEME, '../../sections/home/home-landing-features.js'),
      path.join(REPO_THEME, '../../sections/home/home-hero-floats.js'),
      path.join(REPO_THEME, '../../components/map/styles.js'),
    ];
    const mixed = /bgcolor:\s*'primary\.main'[\s\S]{0,80}color:\s*'common\.white'|color:\s*theme\.palette\.common\.white[\s\S]{0,80}backgroundColor:\s*theme\.palette\.primary\.main/;
    for (const file of roots) {
      const src = fs.readFileSync(file, 'utf8');
      assert.equal(mixed.test(src), false, `${path.basename(file)} still pairs terracotta with common.white`);
    }
  });
});
