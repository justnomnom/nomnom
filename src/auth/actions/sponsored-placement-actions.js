'use server';

import { revalidatePath } from 'next/cache';

import { paths } from 'src/routes/paths';

import { assertAdminUser } from 'src/auth/actions/admin-guard';
import { supabaseAdminClient } from 'src/libs/supabase/supabase-admin';

// ----------------------------------------------------------------------

function revalidateAdminSponsoredPage() {
  revalidatePath(paths.dashboard.adminSponsoredPlacements);
}

/**
 * @param {{
 *   scope?: 'city' | 'state',
 *   geographyId: string,
 *   restaurantId: string,
 *   pinSortOrder?: number,
 *   injectAfterOrganic: number | null,
 *   active?: boolean,
 *   validFrom?: string | null,
 *   validUntil?: string | null,
 * }} input
 */
export async function createSponsoredPlacementAction(input) {
  await assertAdminUser();

  const scope = input.scope === 'state' ? 'state' : 'city';
  const geographyId = String(input.geographyId ?? '').trim();
  const restaurantId = String(input.restaurantId ?? '').trim();
  if (!geographyId || !restaurantId) {
    return { ok: false, error: 'missing_ids' };
  }

  const pinSortOrder =
    typeof input.pinSortOrder === 'number' && Number.isFinite(input.pinSortOrder)
      ? Math.trunc(input.pinSortOrder)
      : 0;

  const { injectAfterOrganic: injectRaw } = input;
  let injectAfterOrganic = injectRaw;
  if (injectRaw != null) {
    const n = Number(injectRaw);
    if (!Number.isFinite(n) || n < 0) {
      return { ok: false, error: 'invalid_inject' };
    }
    injectAfterOrganic = Math.trunc(n);
  }

  const vf =
    input.validFrom != null && String(input.validFrom).trim()
      ? String(input.validFrom).trim()
      : null;
  const vu =
    input.validUntil != null && String(input.validUntil).trim()
      ? String(input.validUntil).trim()
      : null;

  const row = {
    city_id: scope === 'city' ? geographyId : null,
    state_id: scope === 'state' ? geographyId : null,
    restaurant_id: restaurantId,
    pin_sort_order: pinSortOrder,
    inject_after_organic: injectAfterOrganic,
    active: input.active !== false,
    valid_from: vf,
    valid_until: vu,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdminClient.from('sponsored_restaurant_placements').insert(row);

  if (error) {
    console.error('[createSponsoredPlacementAction]', error);
    return { ok: false, error: error.message };
  }

  revalidateAdminSponsoredPage();
  return { ok: true };
}

/**
 * @param {string} id
 */
export async function deleteSponsoredPlacementAction(id) {
  await assertAdminUser();
  const placementId = String(id ?? '').trim();
  if (!placementId) {
    return { ok: false, error: 'missing_id' };
  }

  const { error } = await supabaseAdminClient
    .from('sponsored_restaurant_placements')
    .delete()
    .eq('id', placementId);

  if (error) {
    console.error('[deleteSponsoredPlacementAction]', error);
    return { ok: false, error: error.message };
  }

  revalidateAdminSponsoredPage();
  return { ok: true };
}

/**
 * @param {string} id
 * @param {{
 *   active?: boolean,
 *   pinSortOrder?: number,
 *   injectAfterOrganic?: number | null,
 *   validFrom?: string | null,
 *   validUntil?: string | null,
 * }} patch
 */
export async function updateSponsoredPlacementAction(id, patch) {
  await assertAdminUser();
  const placementId = String(id ?? '').trim();
  if (!placementId) {
    return { ok: false, error: 'missing_id' };
  }

  const updates = { updated_at: new Date().toISOString() };
  if (typeof patch.active === 'boolean') {
    updates.active = patch.active;
  }
  if (typeof patch.pinSortOrder === 'number' && Number.isFinite(patch.pinSortOrder)) {
    updates.pin_sort_order = Math.trunc(patch.pinSortOrder);
  }
  if (patch.injectAfterOrganic === null) {
    updates.inject_after_organic = null;
  } else if (
    typeof patch.injectAfterOrganic === 'number' &&
    Number.isFinite(patch.injectAfterOrganic)
  ) {
    const n = Math.trunc(patch.injectAfterOrganic);
    if (n < 0) {
      return { ok: false, error: 'invalid_inject' };
    }
    updates.inject_after_organic = n;
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'validFrom')) {
    const v = patch.validFrom;
    updates.valid_from = v != null && String(v).trim() ? String(v).trim() : null;
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'validUntil')) {
    const v = patch.validUntil;
    updates.valid_until = v != null && String(v).trim() ? String(v).trim() : null;
  }

  const { error } = await supabaseAdminClient
    .from('sponsored_restaurant_placements')
    .update(updates)
    .eq('id', placementId);

  if (error) {
    console.error('[updateSponsoredPlacementAction]', error);
    return { ok: false, error: error.message };
  }

  revalidateAdminSponsoredPage();
  return { ok: true };
}
