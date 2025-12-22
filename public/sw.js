const CACHE_NAME = 'tripzy-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/manifest.json',
    '/vite.svg'
];

// Install Event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Activate Event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
});

// Fetch Event
// Stale-While-Revalidate Strategy for Fetch
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests like Google Analytics or Ads to avoid opaque response issues
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.match(event.request).then((cachedResponse) => {
                const fetchPromise = fetch(event.request).then((networkResponse) => {
                    // Update the cache with the fresh response
                    if (networkResponse.status === 200) {
                        cache.put(event.request, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => {
                    // If network fails and no cache, we might want a fallback. 
                    // For now, just let it fail or handled by the app.
                });

                // Return cached response immediately if available, otherwise wait for network
                return cachedResponse || fetchPromise;
            });
        })
    );
});

// Push Event
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : { title: 'Tripzy', body: 'New travel deal alert!' };

    const options = {
        body: data.body,
        icon: '/vite.svg', // Fallback to vite.svg for now
        badge: '/vite.svg',
        data: {
            url: data.url || '/'
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// Notification Click Event
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});
