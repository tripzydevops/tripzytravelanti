// Tripzy Service Worker - Auto-updating Network-First Cache Strategy
const CACHE_NAME = 'tripzy-v4';

// Install Event: Activate immediately without waiting for tabs to close
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Activate Event: Delete all old caches and claim clients immediately
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event: Network-First for Navigation (HTML), Cache-First for static assets
self.addEventListener('fetch', (event) => {
    const request = event.request;

    // Never intercept non-GET requests or external API/database calls
    if (
        request.method !== 'GET' ||
        request.url.includes('/api/') ||
        request.url.includes('supabase.co') ||
        request.url.includes('googlesyndication') ||
        request.url.includes('chrome-extension')
    ) {
        return;
    }

    // Navigation requests (HTML document): ALWAYS Network-First
    // If online, always fetch fresh HTML from server so updates apply immediately.
    // If offline, fallback to cached HTML.
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                    }
                    return networkResponse;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // Static assets (hashed JS/CSS/images): Stale-while-revalidate or Network-First
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
                // Fetch fresh in background
                fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
                    }
                }).catch(() => {});
                return cachedResponse;
            }

            return fetch(request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                }
                return networkResponse;
            });
        })
    );
});

// Push Notifications
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : { title: 'Tripzy', body: 'New travel deal alert!' };
    const options = {
        body: data.body,
        icon: '/favicon.png',
        badge: '/favicon.png',
        data: { url: data.url || '/' }
    };
    event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url));
});
