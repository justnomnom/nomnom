'use server';

import {
  RESTAURANT_ID_UUID_RE,
  fetchRestaurantByIdForSsr,
} from 'src/libs/restaurant/fetch-restaurant-by-id-for-ssr';

/**
 * Client-callable restaurant row for the Table detail sheet.
 * Same shape as the public / dashboard restaurant page.
 * @param {unknown} restaurantId
 * @returns {Promise<{ restaurant: object | null, error: string | null }>}
 */
export async function fetchRestaurantDetail(restaurantId) {
  const id = typeof restaurantId === 'string' ? restaurantId.trim() : '';
  if (!id || !RESTAURANT_ID_UUID_RE.test(id)) {
    return { restaurant: null, error: 'invalid_id' };
  }
  const restaurant = await fetchRestaurantByIdForSsr(id);
  if (!restaurant) return { restaurant: null, error: 'not_found' };
  return { restaurant, error: null };
}
