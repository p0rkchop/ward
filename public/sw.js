// Service Worker for Web Push Notifications
// This file must live at /sw.js (served from public/) to have root scope.

self.addEventListener('push', function (event) {
  if (!event.data) return;

  var payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { title: 'Notification', body: event.data.text() };
  }

  var options = {
    body: payload.body || '',
    icon: payload.icon || '/apple-icon.png',
    badge: '/apple-icon.png',
    data: { url: payload.url || '/' },
  };

  event.waitUntil(self.registration.showNotification(payload.title || 'Ward', options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();

  var url = (event.notification.data && event.notification.data.url) || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (windowClients) {
      // Focus an existing tab if one is open at the target URL
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
