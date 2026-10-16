/* SUDOMI online (internet) multiplayer settings.
   Only change these if you know what you are doing — the defaults work for most players. */
window.SUDOMI_ONLINE = {
  // PeerJS client library, tried in this order. To avoid depending on a CDN, download
  // https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.5/peerjs.min.js into js/vendor/peerjs.min.js
  scripts: [
    'js/vendor/peerjs.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.5/peerjs.min.js',
    'https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js'
  ],
  // STUN servers let two phones on different networks find a direct route to each other.
  // Strict networks (some schools, offices, carriers) also need a TURN relay: add one here
  // as {urls:'turn:host:3478', username:'…', credential:'…'}.
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
    // 0.2.17 — Metered TURN relay (the owner's free account, app "sudomi"): lets friends on different networks connect.
    // To replace it, create a new credential in the Metered dashboard and change username/credential below.
    { urls: 'stun:stun.relay.metered.ca:80' },
    { urls: 'turn:global.relay.metered.ca:80', username: '63a959e74ed1c1962c93f071', credential: 'K/oKDxTrmrGsU3MN' },
    { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: '63a959e74ed1c1962c93f071', credential: 'K/oKDxTrmrGsU3MN' },
    { urls: 'turn:global.relay.metered.ca:443', username: '63a959e74ed1c1962c93f071', credential: 'K/oKDxTrmrGsU3MN' },
    { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: '63a959e74ed1c1962c93f071', credential: 'K/oKDxTrmrGsU3MN' }
  ],
  // 0.2.16 — RELAY FOR FRIENDS WHO ARE FAR AWAY. Paste here the "credentials" address your TURN provider gives you
  // (for example Metered: 'https://TU-APP.metered.live/api/v1/turn/credentials?apiKey=TU-CLAVE').
  // The game downloads the relay list from that address. null = no relay (direct connections only).
  iceServersUrl: null,
  // Your own PeerJS signalling server (optional). null = the free public PeerJS cloud.
  // Example: { host: 'peer.example.com', port: 443, path: '/', secure: true, key: 'peerjs' }
  peerServer: null,
  // 0.3.75 — SERVIDOR DEDICADO (cuentas, progreso en la nube y rankings reales; ver js/cloud.js y la carpeta Servidor).
  // null = el mismo sitio que sirve esta página (vale cuando la app se abre desde el propio servidor, en el PC o en el NAS).
  // Para la app publicada en GitHub hay que poner aquí la dirección HTTPS del servidor, por ejemplo 'https://sudomi.midominio.com',
  // y arrancar el servidor con  --origin https://USUARIO.github.io . Sin servidor todo sigue funcionando como antes.
  api: null
};
