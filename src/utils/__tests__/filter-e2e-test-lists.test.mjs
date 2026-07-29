import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isE2eTestListName,
  shouldHideE2eTestListsInUi,
  filterE2eTestListsForDisplay,
} from '../filter-e2e-test-lists.js';

test('isE2eTestListName matches Playwright list prefixes', () => {
  assert.equal(isE2eTestListName('E2E CRUD 1710000000'), true);
  assert.equal(isE2eTestListName('E2E Gate 123 list'), true);
  assert.equal(isE2eTestListName('  e2e lowercase  '), true);
  assert.equal(isE2eTestListName('My Lisbon picks'), false);
  assert.equal(isE2eTestListName('Almost E2E but not prefix'), false);
  assert.equal(isE2eTestListName(''), false);
  assert.equal(isE2eTestListName(null), false);
  assert.equal(isE2eTestListName(undefined), false);
});

test('filterE2eTestListsForDisplay: null/empty lists', () => {
  assert.deepEqual(filterE2eTestListsForDisplay(null, { hideE2eTestLists: true }), []);
  assert.deepEqual(filterE2eTestListsForDisplay(undefined, { hideE2eTestLists: true }), []);
  assert.deepEqual(filterE2eTestListsForDisplay([], { hideE2eTestLists: true }), []);
});

test('shouldHideE2eTestListsInUi: explicit option overrides env', () => {
  assert.equal(shouldHideE2eTestListsInUi({ hideE2eTestLists: true }), true);
  assert.equal(shouldHideE2eTestListsInUi({ hideE2eTestLists: false }), false);
});

test('filterE2eTestListsForDisplay removes E2E lists when hiding enabled', () => {
  const lists = [
    { id: '1', name: 'E2E CRUD 1' },
    { id: '2', name: 'Weekend brunch' },
  ];
  const filtered = filterE2eTestListsForDisplay(lists, { hideE2eTestLists: true });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].name, 'Weekend brunch');
});

test('filterE2eTestListsForDisplay keeps all lists when hiding disabled', () => {
  const lists = [{ id: '1', name: 'E2E CRUD 1' }];
  assert.equal(filterE2eTestListsForDisplay(lists, { hideE2eTestLists: false }).length, 1);
});

test('shouldHideE2eTestListsInUi respects explicit opt-out for Playwright dev server', () => {
  const prev = process.env.NEXT_PUBLIC_SHOW_E2E_LISTS_IN_UI;
  process.env.NEXT_PUBLIC_SHOW_E2E_LISTS_IN_UI = 'true';
  try {
    assert.equal(shouldHideE2eTestListsInUi(), false);
  } finally {
    if (prev === undefined) delete process.env.NEXT_PUBLIC_SHOW_E2E_LISTS_IN_UI;
    else process.env.NEXT_PUBLIC_SHOW_E2E_LISTS_IN_UI = prev;
  }
});
