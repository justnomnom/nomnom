import { toCanonicalEnglishLabel } from 'src/libs/ugc/ugc-translate';
import { dishTagSlugFromCanonical } from 'src/libs/dish-tags/dish-tag-slug';

import { signatureDishLabelsFromConsensus } from './signature-dish-labels';

export { signatureDishLabelsFromConsensus };

/**
 * Ensure dish tags exist in `tags` and are linked on `restaurant_tags` for each
 * signature dish in review consensus. Idempotent via `ensure_restaurant_dish_tag`.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} restaurantId
 * @param {unknown} reviewConsensus metadata.review_consensus object
 */
export async function syncSignatureDishTags(supabase, restaurantId, reviewConsensus) {
  const labels = signatureDishLabelsFromConsensus(reviewConsensus);
  if (!labels.length || !restaurantId) return;

  await Promise.all(
    labels.map(async (label) => {
      try {
        const canonicalEn = await toCanonicalEnglishLabel(supabase, label, 'en');
        const slug = dishTagSlugFromCanonical(restaurantId, canonicalEn);
        const { error } = await supabase.rpc('ensure_restaurant_dish_tag', {
          p_restaurant_id: restaurantId,
          p_slug: slug,
          p_label: canonicalEn,
        });
        if (error) {
          console.error('[syncSignatureDishTags]', restaurantId, label, error);
        }
      } catch (e) {
        console.error('[syncSignatureDishTags]', restaurantId, label, e);
      }
    })
  );
}
