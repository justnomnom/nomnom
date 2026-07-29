'use client';

import useSWR from 'swr';

import { dedupeMapDropdownLists } from 'src/libs/lists/dedupe-map-dropdown-lists';
import {
  fetchMyOwnedListsForMapDropdown,
  fetchFollowingListsForMapDropdown,
  fetchMyCollaboratorListsForMapDropdown,
} from 'src/auth/actions/list-actions';

// ----------------------------------------------------------------------

async function ownedListsFetcher() {
  const { lists, error } = await fetchMyOwnedListsForMapDropdown();
  if (error) throw new Error(error);
  return dedupeMapDropdownLists(lists);
}

async function collaboratorListsFetcher() {
  const { lists, error } = await fetchMyCollaboratorListsForMapDropdown();
  if (error) throw new Error(error);
  return dedupeMapDropdownLists(lists);
}

async function followingListsFetcher() {
  const { lists, error } = await fetchFollowingListsForMapDropdown();
  if (error) throw new Error(error);
  return dedupeMapDropdownLists(lists);
}

const SWR_OPTS = {
  revalidateOnFocus: false,
  dedupingInterval: 30_000,
};

/**
 * @param {string | null | undefined} userId
 * @returns {{ lists: Array<object>, loading: boolean }}
 */
export function useMapOwnedLists(userId) {
  const { data, isLoading } = useSWR(
    userId ? ['map-owned-lists', userId] : null,
    ownedListsFetcher,
    SWR_OPTS
  );
  return {
    lists: data ?? [],
    loading: Boolean(userId) && isLoading && data === undefined,
  };
}

/**
 * @param {string | null | undefined} userId
 * @returns {{ lists: Array<object>, loading: boolean }}
 */
export function useMapCollaboratorLists(userId) {
  const { data, isLoading } = useSWR(
    userId ? ['map-collaborator-lists', userId] : null,
    collaboratorListsFetcher,
    SWR_OPTS
  );
  return {
    lists: data ?? [],
    loading: Boolean(userId) && isLoading && data === undefined,
  };
}

/**
 * @param {string | null | undefined} userId
 * @returns {{ lists: Array<object>, loading: boolean }}
 */
export function useMapFollowingLists(userId) {
  const { data, isLoading } = useSWR(
    userId ? ['map-following-lists', userId] : null,
    followingListsFetcher,
    SWR_OPTS
  );
  return {
    lists: data ?? [],
    loading: Boolean(userId) && isLoading && data === undefined,
  };
}
