const CACHE_NAME = 'mkwr-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/player.js',
  '/manifest.json',
  '/assets/icon.png',
  '/assets/MKWR.png',
  '/assets/BG.png',
  '/assets/player-img/cover.png',
  '/assets/font/RacersDelight.otf',
  '/tracksCD1.json',
  '/tracksCD2.json',
  '/tracksCD3.json',
  '/tracksCD4.json'
];

// Install event - cache essential assets only (NO AUDIO FILES)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
  // Skip waiting to activate new service worker immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all clients immediately
  self.clients.claim();
});

// Fetch event - serve cached assets, but NEVER cache audio files
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Never cache audio files (.m4a) - always go to network
  if (url.pathname.includes('/audio/') || url.pathname.endsWith('.m4a')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // For other assets, use cache first strategy
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});