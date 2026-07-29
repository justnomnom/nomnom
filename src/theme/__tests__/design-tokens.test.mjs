/**
 * Frontend QA — design tokens that UI layout depends on (touch targets, z-index, locale prose).
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  RADIUS,
  SPACE,
  TOUCH_TARGET_SIZE,
  Z_INDEX,
  tabularNumsSx,
  touchTargetSx,
} from '../spacing.js';
import {
  getLocaleBodyMaxWidthCh,
  localeBodyProseSx,
} from '../locale-prose.js';
import {
  compactPageActionsStackSx,
  dialogActionsMobileSx,
  mobileStretchButtonSx,
} from '../responsive-button-sx.js';

test('SPACE tokens are ordered ascending (layout rhythm)', () => {
  assert.ok(SPACE.xxs < SPACE.xs);
  assert.ok(SPACE.xs < SPACE.sm);
  assert.ok(SPACE.sm < SPACE.md);
  assert.ok(SPACE.md < SPACE.lg);
  assert.ok(SPACE.lg < SPACE.xl);
  assert.ok(SPACE.xl < SPACE['2xl']);
  assert.ok(SPACE['2xl'] < SPACE.section);
});

test('TOUCH_TARGET_SIZE is 44px (a11y)', () => {
  assert.equal(TOUCH_TARGET_SIZE, 44);
  assert.equal(touchTargetSx.minWidth, 44);
  assert.equal(touchTargetSx.minHeight, 44);
});

test('RADIUS tiers: tight < base < loose < pill', () => {
  assert.ok(RADIUS.tight < RADIUS.base);
  assert.ok(RADIUS.base < RADIUS.loose);
  assert.ok(RADIUS.loose < RADIUS.pill);
});

test('Z_INDEX stacking order is deterministic', () => {
  assert.ok(Z_INDEX.belowAppBar < Z_INDEX.mobileBottomNav);
  assert.ok(Z_INDEX.mobileBottomNav <= Z_INDEX.dashboardBottomNav);
  assert.ok(Z_INDEX.searchTypeahead >= 1300);
  assert.ok(Z_INDEX.fullscreenBackdrop < Z_INDEX.fullscreenContent);
  assert.ok(Z_INDEX.fullscreenContent < Z_INDEX.fullscreenDialog);
  assert.ok(Z_INDEX.routeProgress < Z_INDEX.fullscreenBackdrop);
});

test('tabularNumsSx enables tabular figures', () => {
  assert.equal(tabularNumsSx.fontVariantNumeric, 'tabular-nums');
});

test('getLocaleBodyMaxWidthCh: pt tighter than en', () => {
  assert.equal(getLocaleBodyMaxWidthCh('en'), '72ch');
  assert.equal(getLocaleBodyMaxWidthCh('pt'), '60ch');
  assert.equal(getLocaleBodyMaxWidthCh(undefined), '72ch');
  assert.equal(getLocaleBodyMaxWidthCh('fr'), '72ch');
  assert.deepEqual(localeBodyProseSx('pt'), { maxWidth: '60ch' });
});

test('mobileStretchButtonSx: full width + 44px min height on xs', () => {
  assert.equal(mobileStretchButtonSx.width.xs, '100%');
  assert.equal(mobileStretchButtonSx.minHeight.xs, 44);
  assert.equal(dialogActionsMobileSx.flexDirection.xs, 'column');
  assert.equal(compactPageActionsStackSx.maxWidth, 400);
});
