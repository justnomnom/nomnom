/* NomNom service worker — Web Push notifications. */

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = { title: 'NomNom', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'NomNom';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/favicon/android-chrome-192x192.png',
    badge: payload.badge || '/favicon/android-chrome-192x192.png',
    data: payload.data || {},
    tag: payload.tag,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus an existing tab if one is open, else open a new one.
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(link);
          return undefined;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(link);
      return undefined;
    })
  );
});
