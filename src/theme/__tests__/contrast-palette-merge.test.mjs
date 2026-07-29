import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createRequire } from 'node:module';

import { palette } from '../palette.js';

const require = createRequire(import.meta.url);
const merge = require('lodash/merge');
const { createTheme, alpha } = require('@mui/material/styles');

/** Mirrors `createContrast('bold', 'light').palette` without importing contrast.js
 *  (extensionless relative imports break under node:test ESM). */
const BOLD_LIGHT_CONTRAST_PALETTE = {
  background: {
    default: '#e2ddd0', // grey[200]
  },
};

// ----------------------------------------------------------------------

describe('theme contrast palette merge', () => {
  it('keeps background.neutral when bold contrast overrides background.default', () => {
    const merged = merge({}, palette('light'), BOLD_LIGHT_CONTRAST_PALETTE);
    const theme = createTheme({ palette: merged });

    assert.equal(theme.palette.background.default, BOLD_LIGHT_CONTRAST_PALETTE.background.default);
    assert.ok(theme.palette.background.neutral);
    assert.doesNotThrow(() => alpha(theme.palette.background.neutral, 0.95));
  });

  it('shallow spread of bold contrast would wipe background.neutral (regression guard)', () => {
    const shallow = {
      ...palette('light'),
      ...BOLD_LIGHT_CONTRAST_PALETTE,
    };

    assert.equal(shallow.background.neutral, undefined);
  });
});

describe('theme color preset fallback', () => {
  it('unknown preset ids still yield a primary.main safe for alpha()', () => {
    // Mirrors getPrimary(): PRIMARY_PRESETS[preset] ?? PRIMARY_PRESETS.default
    const presets = {
      default: palette('light').primary,
      cyan: { main: '#078DEE' },
    };
    const resolve = (id) => presets[id] ?? presets.default;

    assert.equal(resolve('not-a-real-preset').main, palette('light').primary.main);
    assert.doesNotThrow(() => alpha(resolve('not-a-real-preset').main, 0.24));
    assert.doesNotThrow(() => alpha(resolve('cyan').main, 0.24));
  });
});
