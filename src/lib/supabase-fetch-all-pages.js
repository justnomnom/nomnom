/** PostgREST default page size. */
export const SUPABASE_DEFAULT_PAGE_SIZE = 1000;

/**
 * Fetch all rows from a paginated Supabase query (recursive; avoids await-in-loop).
 *
 * @template T
 * @param {(from: number, pageSize: number) => Promise<T[]>} fetchPage
 * @param {number} [pageSize]
 * @returns {Promise<T[]>}
 */
export async function fetchAllSupabasePages(fetchPage, pageSize = SUPABASE_DEFAULT_PAGE_SIZE) {
  async function load(from) {
    const page = await fetchPage(from, pageSize);
    if (page.length < pageSize) {
      return page;
    }
    const rest = await load(from + pageSize);
    return [...page, ...rest];
  }

  return load(0);
}
