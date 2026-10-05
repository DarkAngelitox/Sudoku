/* SUDOMI service worker — lets the app install to the home screen and run offline.
 *
 * Strategy: the whole app is stored in one versioned cache and served from it (so a visit never mixes files
 * from two different versions). A new release is picked up when this file changes: BUMP `VERSION` WHEN YOU
 * PUBLISH. The page then offers an "Actualizar" button (see js/pwa.js) instead of reloading in the middle of a game.
 * Cross-origin requests (the PeerJS library, the PeerJS signalling service) and /api/ calls always go to the network.
 */
const VERSION = '0.2.79';
const CACHE = 'sudomi-' + VERSION;
const SHELL = [
  './', 'index.html', 'manifest.webmanifest',
  'css/main.css',
  'js/app.js', 'js/lan-client.js', 'js/online-config.js', 'js/online-client.js', 'js/other-games.js', 'js/extra-games.js', 'js/pwa.js', 'js/install.js', 'js/qr-code.js', 'js/qr-client.js', 'js/theme.js', 'js/customize.js', 'js/skins.js', 'js/smart-hints.js', 'js/score.js', 'js/xp.js', 'js/achievements.js', 'js/stats.js', 'js/race.js', 'js/multi-online.js', 'js/sound.js', 'js/coach.js', 'js/screens.js', 'js/rankings.js', 'js/training.js', 'js/teacher.js', 'js/profile-screen.js', 'js/sync.js', 'js/settings.js', 'js/a11y.js', 'js/effects.js', 'js/domino-table.js', 'js/domino-party.js', 'js/board-art.js', 'js/dominopolis-fotos.js', 'js/friends.js', 'js/no-zoom.js', 'js/lobby.js', 'js/avatar-art.js', 'js/dominopolis-fondos.js', 'js/dominopolis-engine.js', 'js/dominopolis-ui.js', 'js/i18n.js', 'js/lang-en.js', 'js/lang-fr.js', 'js/lang-pt.js', 'js/lang-zh.js','js/tutorial.js', 'js/game-tutorials.js', 'js/daily.js', 'js/profile.js', 'js/game-art.js', 'js/party-net.js', 'js/dos-game.js', 'js/stop-party.js',
  'img/dragones/dragon1.png', 'img/dragones/dragon2.png', 'img/dragones/dragon3.png', 'img/dragones/dragon4.png', 'img/dragones/dragon5.png', 'img/dragones/dragon6.png', 'img/dragones/dragon7.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png'
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
