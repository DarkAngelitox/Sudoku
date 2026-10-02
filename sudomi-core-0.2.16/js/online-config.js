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
    { urls: 'stun:global.stun.twilio.com:3478' }
  ],
  // 0.2.16 — RELAY FOR FRIENDS WHO ARE FAR AWAY. Paste here the "credentials" address your TURN provider gives you
  // (for example Metered: 'https://TU-APP.metered.live/api/v1/turn/credentials?apiKey=TU-CLAVE').
  // The game downloads the relay list from that address. null = no relay (direct connections only).
  iceServersUrl: null,
  // Your own PeerJS signalling server (optional). null = the free public PeerJS cloud.
  // Example: { host: 'peer.example.com', port: 443, path: '/', secure: true, key: 'peerjs' }
  peerServer: null
};
