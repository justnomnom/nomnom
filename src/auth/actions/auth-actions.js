'use server';

import { getStripe } from 'src/libs/stripe/stripe-server';
import { supabaseAdminClient } from 'src/libs/supabase/supabase-admin';
import { tearDownUserStripe } from 'src/libs/stripe/user-stripe-teardown';
import {
  getSupabaseAuthUser,
  createSupabaseServerClient,
} from 'src/libs/supabase/supabase-server-client';
import {
  partitionListsForAccountDeletion,
  LIST_CHILD_TABLES_IN_DELETE_ORDER,
} from 'src/libs/lists/account-deletion-lists';

// Logger helper function - silent info/debug, keep errors
const logger = {
  info: (message, data = {}) => {
    // Silent logging - no console output
  },
  error: (message, data = {}) => {
    console.error('[auth-actions.js]', message, data);
  },
  debug: (message, data = {}) => {
    // Silent debug logging - no console output
  },
};

export async function getOrCreateCustomer({
  userId,
  email,
  firstName,
  lastName,
  forceCreate = false,
}) {
  try {
    if (!userId || !email) {
      logger.error('Missing required parameters:', { userId, email });
      return null;
    }

    // Security: verify the caller is acting on their own account. This is a
    // browser-reachable Server Action, so the supplied userId/email are
    // untrusted and must match the authenticated session.
    const {
      data: { user: authUser },
      error: authError,
    } = await getSupabaseAuthUser();

    if (authError || !authUser || authUser.id !== userId) {
      logger.error('getOrCreateCustomer: unauthorized or mismatched user', {
        hasAuthUser: !!authUser,
        requestedUserId: userId,
      });
      return null;
    }

    const supabase = await createSupabaseServerClient();

    // Ensure the user's `users` row exists on sign-in.
    try {
      await ensureUserRecord({ id: userId, email });
    } catch (recordError) {
      logger.error('Failed to ensure user record during customer creation:', recordError);
    }

    if (!forceCreate) {
      const { data, error } = await supabase
        .from('customers')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        return { ok: true };
      }
    }

    const { error: supabaseError } = await supabase.from('customers').upsert(
      {
        id: userId,
      },
      {
        onConflict: 'id',
        ignoreDuplicates: false,
      }
    );

    if (supabaseError) {
      logger.error('Error upserting customer into Supabase:', {
        error: supabaseError,
        userId,
      });
      return null;
    }

    return { ok: true };
  } catch (error) {
    logger.error('Error in getOrCreateCustomer:', {
      error: error.message,
      type: error.type,
      code: error.code,
      raw: error.raw,
      userId,
      email,
    });
    throw error;
  }
}

/**
 * Ensure a `users` row exists for the authenticated user (upsert on sign-in).
 * @param {Object} userData - User data
 * @param {string} userData.id - User ID
 * @param {string} userData.email - User email
 * @returns {Promise<Object|null>} The upserted user row, or null on failure
 */
export async function ensureUserRecord(userData) {
  logger.info('ensureUserRecord called', {
    userId: userData?.id,
    email: userData?.email,
  });

  try {
    if (!userData?.id || !userData?.email) {
      logger.error('Missing required user data', {
        hasId: !!userData?.id,
        hasEmail: !!userData?.email,
      });
      return null;
    }

    // Security: this is a browser-reachable Server Action that writes to the
    // `users` table via the service-role client (bypassing RLS). The supplied
    // id/email are untrusted, so verify against the authenticated session and
    // use the session-derived identity for the write rather than caller input.
    const {
      data: { user: authUser },
      error: authError,
    } = await getSupabaseAuthUser();

    if (authError || !authUser || authUser.id !== userData.id) {
      logger.error('ensureUserRecord: unauthorized or mismatched user', {
        hasAuthUser: !!authUser,
        requestedUserId: userData?.id,
      });
      return null;
    }

    // Authoritative identity comes from the session, never the caller payload.
    const { data: user, error: userError } = await supabaseAdminClient
      .from('users')
      .upsert(
        {
          id: authUser.id,
          email: authUser.email,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'id',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (userError) {
      logger.error('Error upserting user record in Supabase', {
        error: userError.message,
        code: userError.code,
        userId: userData.id,
      });
      return null;
    }

    return user;
  } catch (error) {
    logger.error('Unexpected error in ensureUserRecord', {
      error: error.message,
      stack: error.stack,
      userId: userData?.id,
    });
    return null;
  }
}

/**
 * Hard-delete the departing user's own lists, sparing any that carry money or are seeded
 * system lists.
 *
 * Never throws and never aborts the deletion: `lists.user_id` is `ON DELETE CASCADE`, so
 * anything skipped here still goes when the `users` row does, rather than trapping a user in
 * an account they asked to delete. Contrast the Stripe teardown, which *must* abort.
 *
 * @param {string} userId
 * @param {string[]} ownedListIds
 */
async function deleteOwnedListsForAccountDeletion(userId, ownedListIds) {
  if (!ownedListIds?.length) return;
  try {
    const [snapRes, subRes, systemRes] = await Promise.all([
      supabaseAdminClient
        .from('list_snapshot_purchases')
        .select('list_id')
        .in('list_id', ownedListIds),
      supabaseAdminClient.from('list_subscriptions').select('list_id').in('list_id', ownedListIds),
      // Seeded system lists. `lists_system_key_guard` refuses to delete these while the owner
      // row still exists, which is precisely now — so asking would only log an error that we
      // then swallow. The CASCADE from `users` removes them a moment later regardless.
      supabaseAdminClient
        .from('lists')
        .select('id')
        .in('id', ownedListIds)
        .not('system_key', 'is', null),
    ]);

    const paidListIds = [
      ...(snapRes.data ?? []).map((r) => r.list_id),
      ...(subRes.data ?? []).map((r) => r.list_id),
    ].filter(Boolean);

    // A failed lookup must not turn into "delete them anyway" — that is the path that logs
    // the guard error. Treat an errored probe as "assume system" only when it actually
    // returned rows; otherwise the guard remains the backstop and the cascade still cleans up.
    const systemListIds = (systemRes.data ?? []).map((r) => r.id).filter(Boolean);
    if (systemRes.error) {
      logger.warn('Could not identify system lists on account deletion', {
        error: systemRes.error.message,
        userId,
      });
    }

    const { deletable, retained, systemLists } = partitionListsForAccountDeletion(
      ownedListIds,
      paidListIds,
      systemListIds
    );

    if (retained.length) {
      // Expected, not an error: these stay so buyers keep what they paid for.
      logger.info('Retaining paid lists on account deletion', { userId, retained });
    }
    if (systemLists.length) {
      // Expected, not an error: left to the CASCADE from `users`.
      logger.info('Leaving system lists to the owner cascade', { userId, systemLists });
    }
    if (!deletable.length) return;

    // Children first — cascade rules are not in version control, so do not assume them.

    for (let i = 0; i < LIST_CHILD_TABLES_IN_DELETE_ORDER.length; i += 1) {
      const table = LIST_CHILD_TABLES_IN_DELETE_ORDER[i];
      // eslint-disable-next-line no-await-in-loop -- ordered by FK dependency
      const { error } = await supabaseAdminClient.from(table).delete().in('list_id', deletable);
      if (error)
        logger.error(`Error deleting ${table} for owned lists`, { error: error.message, userId });
    }

    const { error: listsError } = await supabaseAdminClient
      .from('lists')
      .delete()
      .in('id', deletable);
    if (listsError) {
      // Falls back to the CASCADE from `users` — degraded, not fatal.
      logger.error('Error deleting owned lists', { error: listsError.message, userId });
    }
  } catch (e) {
    logger.error('Unexpected error deleting owned lists', { error: e?.message, userId });
  }
}

/**
 * Delete user account and all associated data
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function deleteAccount() {
  try {
    // Verify user authentication
    const {
      data: { user },
      error: userError,
    } = await getSupabaseAuthUser();

    if (userError || !user) {
      logger.error('deleteAccount', userError || new Error('No authenticated user found'));
      return {
        success: false,
        error: 'User not authenticated',
      };
    }

    const userId = user.id;

    // Block deletion if the creator has active Live List subscribers.
    // They must cancel all subscriptions before deleting their account.
    const { data: ownedLists } = await supabaseAdminClient
      .from('lists')
      .select('id')
      .eq('user_id', userId);
    const ownedListIds = (ownedLists ?? []).map((l) => l.id);
    if (ownedListIds.length) {
      const { data: activeSubs } = await supabaseAdminClient
        .from('list_subscriptions')
        .select('id')
        .in('list_id', ownedListIds)
        .in('status', ['active', 'trialing'])
        .limit(1);
      if (activeSubs?.length) {
        return { success: false, error: 'has_active_subscribers' };
      }
    }

    // Tear Stripe down *before* deleting any rows. `customers` holds the Connect account id
    // and `list_subscriptions` is how we find live subscriptions — delete those first and the
    // pointers are gone, leaving the user billed for a subscription nothing references.
    //
    // Unlike the row deletions below, a failure here aborts: continuing would keep charging
    // someone who has just deleted their account.
    const stripeTeardown = await tearDownUserStripe({
      userId,
      supabase: supabaseAdminClient,
      stripe: getStripe(),
    });
    if (!stripeTeardown.ok) {
      logger.error('Stripe teardown failed, aborting account deletion', {
        userId,
        error: stripeTeardown.error,
      });
      return { success: false, error: stripeTeardown.error ?? 'stripe_teardown_failed' };
    }

    // Delete the user's own lists explicitly, ahead of the cascade, so child rows go in a
    // known order. `lists.user_id` is ON DELETE CASCADE and NOT NULL (migration
    // 20260724123000) — NOT SET NULL as this comment used to say, so nothing orphans and the
    // cascade is a genuine backstop for anything skipped here. Lists anyone has paid for are
    // exempt (the money FKs are RESTRICT, and a Snapshot buyer paid for that content), and so
    // are seeded system lists (the system_key guard blocks deleting them while the owner
    // exists; the cascade takes them instead).
    await deleteOwnedListsForAccountDeletion(userId, ownedListIds);

    // Security: userId is obtained from authenticated session, ensuring users can only delete their own account
    // All database operations use this userId, which is verified from the authenticated session
    logger.info('Starting account deletion', { userId });

    // Delete user data in order: related data first, then auth user
    try {
      // Delete customers table
      const { error: customersError } = await supabaseAdminClient
        .from('customers')
        .delete()
        .eq('id', userId);

      if (customersError) {
        logger.error('Error deleting customers', {
          error: customersError.message,
          userId,
        });
        // Continue with deletion even if this fails
      }

      const { error: tagPrefError } = await supabaseAdminClient
        .from('user_restaurant_tag_preferences')
        .delete()
        .eq('user_id', userId);

      if (tagPrefError) {
        logger.error('Error deleting user_restaurant_tag_preferences', {
          error: tagPrefError.message,
          userId,
        });
      }

      const { error: followsError } = await supabaseAdminClient
        .from('user_follows')
        .delete()
        .or(`follower_id.eq.${userId},following_id.eq.${userId}`);

      if (followsError) {
        logger.error('Error deleting user_follows', {
          error: followsError.message,
          userId,
        });
      }

      // Delete users table
      const { error: usersError } = await supabaseAdminClient
        .from('users')
        .delete()
        .eq('id', userId);

      if (usersError) {
        logger.error('Error deleting users', {
          error: usersError.message,
          userId,
        });
        // Continue with deletion even if this fails
      }

      // Finally, delete the auth user
      // Security: userId is from authenticated session, ensuring users can only delete their own account
      const { error: authDeleteError } = await supabaseAdminClient.auth.admin.deleteUser(userId);

      if (authDeleteError) {
        logger.error('Error deleting auth user', {
          error: authDeleteError.message,
          userId,
        });
        return {
          success: false,
          error: authDeleteError.message || 'Failed to delete account',
        };
      }

      logger.info('Account deleted successfully', { userId });

      return {
        success: true,
      };
    } catch (error) {
      logger.error('Error during account deletion', {
        error: error.message,
        stack: error.stack,
        userId,
      });
      return {
        success: false,
        error: error.message || 'Failed to delete account',
      };
    }
  } catch (error) {
    logger.error('Unexpected error in deleteAccount', {
      error: error.message,
      stack: error.stack,
    });
    return {
      success: false,
      error: error.message || 'Failed to delete account',
    };
  }
}
