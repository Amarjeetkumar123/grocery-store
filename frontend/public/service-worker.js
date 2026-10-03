// Shows order alerts sent by the store's server, and opens the right page
// when one is tapped. Nothing is cached: the shop always needs fresh stock and prices.

self.addEventListener('push', (event) => {
  const message = event.data ? event.data.json() : { title: 'Grocery Store' };
  event.waitUntil(self.registration.showNotification(message.title, {
    body: message.body,
    icon: '/icons/app-icon-192.png',
    badge: '/icons/app-icon-192.png',
    data: { url: message.url ?? '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data.url, self.location.origin).href;
  event.waitUntil((async () => {
    const openWindows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = openWindows.find((client) => client.url.startsWith(self.location.origin));
    if (existing) {
      await existing.navigate(url);
      return existing.focus();
    }
    return self.clients.openWindow(url);
  })());
});
