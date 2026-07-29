'use client';

import { useState, useEffect, useCallback } from 'react';

import { WEB_PUSH } from 'src/config-global';

// ----------------------------------------------------------------------

const SW_URL = '/sw.js';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * iOS only allows Web Push from a Home-Screen-installed PWA. Detect a non-installed
 * iOS browser so the UI can show the "Add to Home Screen" hint instead of a dead button.
 */
function isIosNotInstalled() {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  const isIos = /iPad|iPhone|iPod/.test(ua);
  const standalone =
    window.navigator.standalone === true ||
    window.matchMedia?.('(display-mode: standalone)')?.matches;
  return isIos && !standalone;
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) {
    const err = new Error('Push request failed');
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function subscribeToPush() {
  if (!isPushSupported() || !WEB_PUSH.publicKey) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  const registration = await navigator.serviceWorker.register(SW_URL);
  await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(WEB_PUSH.publicKey),
    }));

  await postJson('/api/push/subscribe', subscription.toJSON());
  return true;
}

async function unsubscribeFromPush() {
  if (!isPushSupported()) return false;
  const registration = await navigator.serviceWorker.getRegistration(SW_URL);
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return true;

  const { endpoint } = subscription;
  await subscription.unsubscribe();
  await postJson('/api/push/unsubscribe', { endpoint });
  return true;
}

// ----------------------------------------------------------------------

/**
 * Client hook for the "enable notifications on this device" control.
 * Reports support, permission state, and whether this device is subscribed.
 */
export function useWebPush() {
  const supported = isPushSupported() && Boolean(WEB_PUSH.publicKey);
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!supported) return undefined;
    (async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration(SW_URL);
        const sub = await registration?.pushManager.getSubscription();
        if (!cancelled) setSubscribed(Boolean(sub));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supported]);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const ok = await subscribeToPush();
      setPermission(typeof Notification !== 'undefined' ? Notification.permission : 'default');
      setSubscribed(ok);
      return ok;
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      await unsubscribeFromPush();
      setSubscribed(false);
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    supported,
    permission, // 'default' | 'granted' | 'denied'
    subscribed,
    busy,
    iosNotInstalled: isIosNotInstalled(),
    enable,
    disable,
  };
}
