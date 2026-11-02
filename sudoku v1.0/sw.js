/* SUDOMI — service worker de la MUDANZA (1 nov 2026). Reemplaza al del juego en las direcciones viejas.
 * Se activa al momento, borra todo lo guardado del juego viejo, recarga las ventanas abiertas y, desde entonces,
 * cualquier página que se abra aquí recibe el index.html de la mudanza (que lleva el progreso a la dirección nueva). */
const VERSION = 'mudanza-1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.clients.claim();
  for (const c of await self.clients.matchAll({ type: 'window' })) { try { c.navigate(c.url); } catch (_) {} }
})()));
self.addEventListener('fetch', e => {
  if (e.request.mode !== 'navigate') return;
  e.respondWith(fetch(self.registration.scope + 'index.html', { cache: 'no-store' })
    .catch(() => new Response('<meta charset="utf-8"><p style="font:18px system-ui;text-align:center;margin-top:30vh">SUDOMI se mudó a <b>sudomi-rd.com</b>. Conéctate a internet para llevar tu progreso.</p>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } })));
});
