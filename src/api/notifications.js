'use client';

import useSWR from 'swr';
import { useMemo, useEffect } from 'react';

import { useAuthContext } from 'src/auth/hooks';
import { supabaseBrowserClient } from 'src/libs/supabase/supabase-client';
import { setNotificationMute } from 'src/auth/actions/notification-mutes-actions';

// ----------------------------------------------------------------------

const ENDPOINT = '/api/notifications';

const notificationsFetcher = async (url) => {
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error('Notifications request failed');
    err.status = res.status;
    throw err;
  }
  return res.json();
};

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const err = new Error('Notification action failed');
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// Standalone action helpers (also used by the full-history page).
export const markNotificationReadRequest = (id) => postJson(`${ENDPOINT}/read`, { id });
export const markAllNotificationsReadRequest = () => postJson(`${ENDPOINT}/read`, { all: true });
export const deleteNotificationRequest = (id) => postJson(`${ENDPOINT}/delete`, { id });
export const deleteAllNotificationsRequest = () => postJson(`${ENDPOINT}/delete`, { all: true });

/**
 * Fetch one page of notifications for the full-history view.
 * @param {number} offset
 */
export async function fetchNotificationsPage(offset = 0) {
  return notificationsFetcher(`${ENDPOINT}?offset=${offset}`);
}

// ----------------------------------------------------------------------

/**
 * Current user's notifications + unread count. Polls every 60s and, when
 * available, subscribes to Supabase Realtime so the badge updates instantly.
 */
export function useGetNotifications() {
  const { user } = useAuthContext();

  const { data, isLoading, error, isValidating, mutate } = useSWR(ENDPOINT, notificationsFetcher, {
    refreshInterval: 60000,
    revalidateOnFocus: true,
  });

  // Realtime: revalidate on any change to this user's notifications.
  useEffect(() => {
    if (!user?.id) return undefined;
    const { supabase } = supabaseBrowserClient();
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          mutate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, mutate]);

  const markNotificationRead = async (id) => {
    await postJson(`${ENDPOINT}/read`, { id });
    mutate();
  };

  const markAllRead = async () => {
    await postJson(`${ENDPOINT}/read`, { all: true });
    mutate();
  };

  const deleteNotification = async (id) => {
    await postJson(`${ENDPOINT}/delete`, { id });
    mutate();
  };

  const deleteAll = async () => {
    await postJson(`${ENDPOINT}/delete`, { all: true });
    mutate();
  };

  const muteList = async (listId) => {
    if (!listId) return;
    await setNotificationMute('list', listId, true);
    mutate();
  };

  return useMemo(
    () => ({
      notifications: data?.notifications ?? [],
      unreadCount: data?.unreadCount ?? 0,
      hasMore: Boolean(data?.hasMore),
      notificationsLoading: isLoading,
      notificationsValidating: isValidating,
      notificationsError: error,
      notificationsEmpty: !isLoading && !(data?.notifications?.length > 0),
      mutate,
      markNotificationRead,
      markAllRead,
      deleteNotification,
      deleteAll,
      muteList,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, isLoading, isValidating, error]
  );
}
