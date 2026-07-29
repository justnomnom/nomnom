/**
 * E2E Playwright specs create lists prefixed with "E2E …". Hide them in local dev UI
 * so design QA and manual browsing aren't polluted by test artifacts.
 *
 * Playwright's webServer sets NEXT_PUBLIC_SHOW_E2E_LISTS_IN_UI=true so list CRUD specs
 * still see tiles on /dashboard/lists. When reusing an existing dev server for E2E, set
 * the same env var before `npm run dev:webpack`.
 */

const E2E_LIST_NAME = /^E2E\b/i;

/** @param {{ hideE2eTestLists?: boolean }} [options] */
export function shouldHideE2eTestListsInUi(options = {}) {
  if (options.hideE2eTestLists !== undefined) return options.hideE2eTestLists;
  if (process.env.NEXT_PUBLIC_SHOW_E2E_LISTS_IN_UI === 'true') return false;
  return process.env.NODE_ENV === 'development';
}

/**
 * @param {string | null | undefined} name
 */
export function isE2eTestListName(name) {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return false;
  return E2E_LIST_NAME.test(trimmed);
}

/**
 * @template {{ name?: string | null }} T
 * @param {T[] | null | undefined} lists
 * @param {{ hideE2eTestLists?: boolean }} [options]
 * @returns {T[]}
 */
export function filterE2eTestListsForDisplay(lists, options = {}) {
  if (!Array.isArray(lists)) return [];
  const hideE2eTestLists = shouldHideE2eTestListsInUi(options);
  if (!hideE2eTestLists || !lists.length) return lists;
  return lists.filter((row) => !isE2eTestListName(row?.name));
}
