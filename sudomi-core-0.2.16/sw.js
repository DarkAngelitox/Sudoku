/* SUDOMI service worker — lets the app install to the home screen and run offline.
 *
 * Strategy: the whole app is stored in one versioned cache and served from it (so a visit never mixes files
 * from two different versions). A new release is picked up when this file changes: BUMP `VERSION` WHEN YOU
 * PUBLISH. The page then offers an "Actualizar" button (see js/pwa.js) instead of reloading in the middle of a game.
 * Cross-origin requests (the PeerJS library, the PeerJS signalling service) and /api/ calls always go to the network.
 */
const VERSION = '0.2.16';
const CACHE = 'sudomi-' + VERSION;
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'css/main.css',
  'js/app.js', 'js/lan-client.js', 'js/online-config.js', 'js/online-client.js', 'js/other-games.js', 'js/extra-games.js', 'js/pwa.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'
];

self.addEventListener('install', event => {
  // allSettled: one missing optional file must not make the whole install fail
  event.waitUntil(caches.open(CACHE).then(cache => Promise.allSettled(SHELL.map(url => cache.add(url)))));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('sudomi-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

// The page asks to take over once the player chose to update.
self.addEventListener('message', event => { if (event.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || url.pathname.includes('/api/')) return;
  event.respondWith(serve(req));
});

async function serve(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req, { ignoreSearch: true });      // invitation links (?room=…) must still open the cached app
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
    return res;
  } catch (err) {
    if (req.mode === 'navigate') {
      const shell = await cache.match('index.html');
      if (shell) return shell;
    }
    throw err;
  }
}
