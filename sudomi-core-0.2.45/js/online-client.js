/* SUDOMI online client: the same interface as lan-client.js (window.SudomiLAN), but the two phones talk
 * directly through WebRTC (PeerJS) instead of a server on your PC. That makes the games playable from a
 * GitHub Pages link, from anywhere in the world.
 *
 *  - The host creates a room = registers a PeerJS id ("sudomi-<game>-<code>").
 *  - The guest connects to that id with a secret token. Only that guest can ever reconnect to the room.
 *  - Messages are small JSON objects {t:type, p:payload}; the games above this layer are unchanged.
 *  - Messages sent while the other phone is away are queued and delivered when it returns.
 *  - A heartbeat notices a dead link quickly (PeerJS itself may take much longer).
 *  - A refreshed page can resume the room from sessionStorage (host keeps the same id).
 *
 * This file only takes over when the page is NOT served from your own PC/LAN (e.g. GitHub Pages),
 * or when the address has ?net=online. Otherwise lan-client.js stays in charge.
 */
(()=>{
 const cfg=window.SUDOMI_ONLINE||{};
 const KEY='sudomi-lan-session',NETKEY='sudomi-net';
 const PING_MS=cfg.pingMs||5000,DEAD_MS=cfg.deadMs||18000,RETRY_MS=cfg.retryMs||3000,OPEN_MS=cfg.openTimeoutMs||15000,CONNECT_MS=cfg.connectTimeoutMs||20000;

 /* ---------- is this page meant to use the online transport? ---------- */
 function wantsOnline(){
  let q=null;try{q=new URLSearchParams(location.search).get('net')}catch(_){}
  try{if(q)sessionStorage.setItem(NETKEY,q);else q=sessionStorage.getItem(NETKEY)}catch(_){}
  if(q==='online')return true;
  if(q==='lan')return false;
  const h=location.hostname;
  const local=h==='localhost'||h==='127.0.0.1'||h==='[::1]'||h.endsWith('.local')||/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h);
  return !local;
 }
 if(!wantsOnline())return;

 /* ---------- state ---------- */
 let session=null,handlers=[],backlog=[],peer=null,conn=null,queue=[];
 let closing=false,away=false,everJoined=false,reconnecting=false,lastRx=0,hb=null,signalTimer=null,attempts=0;
 let epoch=0,lastJoin=null;   // 0.2.18: epoch changes whenever the room changes, so work started for an old room stops itself
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const emit=e=>{if(handlers.length)handlers.forEach(fn=>fn(e));else backlog.push(e)};
 const RESERVED=['peer-joined','peer-away','peer-back','error','room-lost'];   // only this file may produce these
 const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
 const rand=n=>{const a=new Uint32Array(n);(window.crypto||window.msCrypto).getRandomValues(a);return Array.from(a,x=>x)};
 const makeCode=()=>rand(8).map(x=>ALPHABET[x%ALPHABET.length]).join('');
 const makeToken=()=>rand(6).map(x=>x.toString(36)).join('');
 const normCode=s=>String(s||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase();
 const peerId=(game,code)=>`sudomi-${game}-${code}`;

 const store={
  save(){try{session?sessionStorage.setItem(KEY,JSON.stringify({session,cursor:0,at:Date.now()})):sessionStorage.removeItem(KEY)}catch(_){}},
  read(){try{const v=JSON.parse(sessionStorage.getItem(KEY));return v&&v.session&&v.session.kind==='online'&&Date.now()-v.at<6*3600*1000?v:null}catch(_){return null}}
 };

 /* ---------- error messages ---------- */
 function friendly(err){
  const t=err&&err.type,code=err&&err.code;
  const map={
   'peer-unavailable':'No encontramos esa sala. Revisa el código y que tu amigo tenga la partida abierta.',
   'network':'Sin conexión a internet. Revisa tu red e inténtalo otra vez.',
   'server-error':'El servicio de salas no responde ahora. Inténtalo en un momento.',
   'socket-error':'El servicio de salas no responde ahora. Inténtalo en un momento.',
   'socket-closed':'Se cortó la conexión con el servicio de salas. Inténtalo otra vez.',
   'browser-incompatible':'Este navegador no permite jugar por internet.',
   'ssl-unavailable':'El servicio de salas no está disponible de forma segura.',
   'webrtc':'No se pudo abrir la conexión directa. Prueba con otra red (cambia de Wi‑Fi a datos móviles, o al revés).',
   'invalid-id':'Código de sala no válido.',
   'unavailable-id':'Esa sala ya existe.'
  };
  if(code==='timeout')return Object.assign(new Error('El servicio de salas tardó demasiado en responder. Revisa tu internet e inténtalo otra vez.'),{type:'network'});
  if(code==='direct')return Object.assign(new Error('Encontramos la sala pero no se pudo abrir la conexión directa. Prueba con otra red (cambia de Wi‑Fi a datos móviles, o al revés).'),{type:'webrtc'});
  if(code==='load')return err;
  return Object.assign(new Error(map[t]||(err&&err.message)||'No se pudo conectar.'),{type:t});
 }

 /* ---------- PeerJS library loader (local copy first, then CDNs) ---------- */
 let libPromise=null;
 function loadPeer(){
  if(window.Peer)return Promise.resolve(window.Peer);
  if(libPromise)return libPromise;
  const sources=cfg.scripts||['https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.5/peerjs.min.js'];
  libPromise=(async()=>{
   for(const src of sources){
    try{
     await new Promise((ok,bad)=>{const s=document.createElement('script');s.src=src;s.async=true;s.onload=ok;s.onerror=()=>{s.remove();bad(new Error('load'))};document.head.appendChild(s)});
     if(window.Peer)return window.Peer;
    }catch(_){}
   }
   libPromise=null;
   throw Object.assign(new Error('No se pudo cargar el módulo de juego por internet. Revisa tu conexión e inténtalo otra vez.'),{code:'load'});
  })();
  return libPromise;
 }
 const peerOptions=()=>({debug:0,config:{iceServers:cfg.iceServers||[{urls:'stun:stun.l.google.com:19302'}]},...(cfg.peerServer||{})});

 // 0.2.16: optional relay (TURN) servers fetched from the provider's address in online-config.js (`iceServersUrl`).
 // Asked once per page; if it fails the game still tries the direct connection.
 let icePromise=null;
 function loadIce(){
  if(!cfg.iceServersUrl)return Promise.resolve();
  if(!icePromise)icePromise=Promise.race([fetch(cfg.iceServersUrl).then(r=>r.ok?r.json():null),sleep(5000)])
   .then(list=>{if(Array.isArray(list)&&list.length)cfg.iceServers=[...(cfg.iceServers||[]),...list]}).catch(()=>{});
  return icePromise;
 }

 // Open a Peer and wait until the signalling server confirms the id.
 async function openPeer(id){
  const Peer=await loadPeer();await loadIce();
  return new Promise((resolve,reject)=>{
   const p=id?new Peer(id,peerOptions()):new Peer(peerOptions());let done=false;
   const timer=setTimeout(()=>{if(!done){done=true;try{p.destroy()}catch(_){}reject(Object.assign(new Error('timeout'),{code:'timeout'}))}},OPEN_MS);
   p.on('open',()=>{if(!done){done=true;clearTimeout(timer);resolve(p)}});
   p.on('error',err=>{if(!done){done=true;clearTimeout(timer);try{p.destroy()}catch(_){}reject(err)}});
  });
 }
 // The old id can stay registered for a few seconds after a refresh: retry while it is "taken".
 async function openHostPeer(id,tries){
  for(let i=0;;i++){
   try{return await openPeer(id)}
   catch(err){if(err&&err.type==='unavailable-id'&&i<tries){await sleep(1500);continue}throw err}
  }
 }

 /* ---------- connection plumbing ---------- */
 function flush(){while(queue.length&&conn&&conn.open){try{conn.send(queue.shift())}catch(_){break}}}
 function markAway(){if(!away){away=true;emit({type:'peer-away'})}}
 function markBack(){if(away){away=false;emit({type:'peer-back'})}}
 function startHeartbeat(){
  stopHeartbeat();lastRx=Date.now();
  hb=setInterval(()=>{
   if(!conn||!conn.open)return;
   try{conn.send({t:'sys-ping'})}catch(_){}
   if(Date.now()-lastRx>DEAD_MS)dropConn();
  },PING_MS);
 }
 function stopHeartbeat(){if(hb){clearInterval(hb);hb=null}}
 // The link is dead (no traffic for a while): close it, tell the app, and (guest) start reconnecting.
 function dropConn(){
  const c=conn;conn=null;if(c){c.__dead=true;try{c.close()}catch(_){}}
  if(!closing&&session){markAway();if(session.player===1)reconnectLoop()}
 }
 function onData(c,m){
  if(!m||typeof m!=='object'||typeof m.t!=='string')return;
  lastRx=Date.now();
  if(m.t==='sys-ping')return;
  if(m.t==='sys-reject'){
   const msg=m.p&&m.p.reason==='game'?'Esa sala es de otro juego.':'La sala ya tiene dos jugadores. Si eras tú desde otra ventana, espera 10 segundos e inténtalo otra vez.';
   emit({type:'error',message:msg});emit({type:'room-lost',message:msg});finish();return;
  }
  if(RESERVED.includes(m.t))return;
  if(m.t==='peer-left'){emit({type:'peer-left'});return}
  emit({type:m.t,payload:m.p||{}});
 }

 /* ----- host side ----- */
 function attachHost(){
  const p=peer;
  p.on('connection',c=>onIncoming(c));
  p.on('disconnected',()=>{if(!closing&&peer===p&&!p.destroyed)setTimeout(()=>{try{if(peer===p&&p.disconnected&&!p.destroyed)p.reconnect()}catch(_){}},1500)});
  p.on('error',err=>{if(err&&(err.type==='peer-unavailable'||err.type==='unavailable-id'))return;if(!closing)emit({type:'error',message:friendly(err).message})});
  p.on('close',()=>{if(!closing&&peer===p&&session&&session.player===0)rehost()});
  clearInterval(signalTimer);
  signalTimer=setInterval(()=>{try{if(peer&&peer.disconnected&&!peer.destroyed&&!closing)peer.reconnect()}catch(_){}},8000);
 }
 async function rehost(){
  try{peer=await openHostPeer(peerId(session.game,session.room),12);attachHost()}
  catch(err){emit({type:'error',message:friendly(err).message})}
 }
 function onIncoming(c){
  const meta=c.metadata||{};
  const reject=reason=>{const go=()=>{try{c.send({t:'sys-reject',p:{reason}})}catch(_){}setTimeout(()=>{try{c.close()}catch(_){}},400)};c.open?go():c.on('open',go)};
  if(!session||meta.game!==session.game)return reject('game');
  // 0.2.18: the seat belongs to the guest whose link is ALIVE. Before, the first phone that tried to join kept the seat
  // even if its connection never opened, so a retry (new window, second attempt) was told "the room is full".
  const taken=()=>!!(session&&session.peerToken&&meta.token!==session.peerToken&&conn&&conn!==c&&conn.open&&Date.now()-lastRx<8000);
  if(!meta.token||taken())return reject('full');
  const ready=()=>{
   if(!session||taken()){reject('full');return}
   const first=!session.peerToken;
   if(session.peerToken!==meta.token){session.peerToken=meta.token;store.save()}
   if(conn&&conn!==c){conn.__dead=true;try{conn.close()}catch(_){}}   // the guest came back (or opened the game again): replace the stale link
   conn=c;startHeartbeat();flush();
   if(first&&!everJoined)emit({type:'peer-joined'});else{away=false;emit({type:'peer-back'})}
   everJoined=true;away=false;
  };
  c.on('data',m=>onData(c,m));
  c.on('close',()=>{if(conn===c&&!c.__dead){conn=null;if(!closing)markAway()}});
  c.on('error',()=>{});
  c.open?ready():c.on('open',ready);
 }

 /* ----- guest side ----- */
 async function connectGuest(first){
  const Peer=await loadPeer();
  if(!peer||peer.destroyed){peer=await openPeer();peer.on('error',err=>{if(err&&err.type!=='peer-unavailable'&&!closing)emit({type:'error',message:friendly(err).message})})}
  else if(peer.disconnected){
   await new Promise(r=>{peer.once('open',r);try{peer.reconnect()}catch(_){r()}setTimeout(r,8000)});
   if(peer.destroyed){peer=await openPeer()}
  }
  return new Promise((resolve,reject)=>{
   const p=peer,my=epoch;let settled=false;
   if(!session||!p)return reject(new Error('Se canceló el intento anterior.'));
   const c=p.connect(peerId(session.game,session.room),{reliable:true,serialization:'json',metadata:{token:session.token,game:session.game}});
   const timer=setTimeout(()=>fail(Object.assign(new Error('direct'),{code:'direct'})),first?CONNECT_MS:Math.round(CONNECT_MS*.6));
   const onErr=err=>{if(err&&err.type==='peer-unavailable')fail(err)};
   p.on('error',onErr);
   function fail(err){if(settled)return;settled=true;clearTimeout(timer);try{p.off('error',onErr)}catch(_){}try{c.close()}catch(_){}reject(err)}
   c.on('open',()=>{
    if(settled){try{c.close()}catch(_){}return}
    if(my!==epoch){fail(new Error('Se canceló el intento anterior.'));return}   // the player moved to another room while this was connecting
    settled=true;clearTimeout(timer);try{p.off('error',onErr)}catch(_){}
    conn=c;startHeartbeat();flush();
    c.on('data',m=>onData(c,m));
    c.on('close',()=>{if(conn===c&&!c.__dead){conn=null;if(!closing){markAway();reconnectLoop()}}});
    c.on('error',()=>{});
    resolve(c);
   });
  });
 }
 async function reconnectLoop(){
  if(reconnecting||closing||!session||session.player!==1)return;
  reconnecting=true;attempts=0;
  const my=epoch;
  while(my===epoch&&session&&!closing&&!(conn&&conn.open)){
   try{await connectGuest(false);break}
   catch(err){
    if(my!==epoch)return;
    attempts++;
    if(attempts>=100){emit({type:'room-lost',message:'El anfitrión no volvió. La sala se cerró.'});finish();break}
    await sleep(RETRY_MS);
   }
  }
  if(my!==epoch)return;   // an old room's loop must not touch the new room
  reconnecting=false;
  if(conn&&conn.open)markBack();
 }

 /* ---------- lifecycle ---------- */
 function teardown(){
  epoch++;
  stopHeartbeat();clearInterval(signalTimer);signalTimer=null;
  const c=conn,p=peer;conn=null;peer=null;queue=[];away=false;everJoined=false;reconnecting=false;
  if(c){c.__dead=true;try{c.close()}catch(_){}}
  if(p){try{p.destroy()}catch(_){}}
 }
 function finish(){closing=true;teardown();session=null;store.save()}

 document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState!=='visible'||!session||closing)return;
  lastRx=Date.now();                                                    // grace period: give the link a chance to answer
  try{if(conn&&conn.open)conn.send({t:'sys-ping'})}catch(_){}
  try{if(peer&&peer.disconnected&&!peer.destroyed)peer.reconnect()}catch(_){}
  if(session.player===1&&!(conn&&conn.open))reconnectLoop();
 });
 window.addEventListener('online',()=>{if(session&&!closing&&session.player===1&&!(conn&&conn.open))reconnectLoop()});

 /* ---------- public interface (same shape as lan-client.js) ---------- */
 window.SudomiLAN={
  kind:'online',
  async create(game){
   teardown();closing=false;
   for(let i=0;i<6;i++){
    const code=makeCode();
    try{
     peer=await openPeer(peerId(game,code));
     session={room:code,player:0,token:makeToken(),game,kind:'online'};
     attachHost();store.save();return session;
    }catch(err){if(err&&err.type==='unavailable-id')continue;throw friendly(err)}
   }
   throw new Error('No pudimos crear la sala. Inténtalo otra vez.');
  },
  async join(game,room){
   teardown();closing=false;
   const code=normCode(room);
   if(code.length<8)throw new Error('Escribe el código completo de la sala (8 caracteres).');
   // a second attempt at the same room keeps the same token, so the host recognises the same phone
   if(!lastJoin||lastJoin.room!==code||lastJoin.game!==game)lastJoin={room:code,game,token:makeToken()};
   session={room:code,player:1,token:lastJoin.token,game,kind:'online'};
   const my=epoch;
   try{await connectGuest(true)}catch(err){const e=friendly(err);if(my===epoch){session=null;teardown()}throw e}
   store.save();return session;
  },
  on:fn=>{handlers.push(fn);if(backlog.length){const pending=backlog;backlog=[];pending.forEach(e=>fn(e))}},
  off:fn=>{handlers=handlers.filter(x=>x!==fn)},
  get session(){return session},
  get saved(){return store.read()},
  // Re-attach after the page was refreshed.
  resume(saved){
   teardown();closing=false;session=saved.session;session.kind='online';store.save();
   (async()=>{
    try{
     if(session.player===0){peer=await openHostPeer(peerId(session.game,session.room),12);attachHost()}
     else reconnectLoop();
    }catch(err){
     emit({type:'error',message:friendly(err).message});
     if(session&&session.player===0&&err&&err.type==='unavailable-id'){emit({type:'room-lost',message:'No se pudo recuperar la sala. Crea una nueva.'});finish()}
    }
   })();
   return session;
  },
  forget(){try{sessionStorage.removeItem(KEY)}catch(_){}},
  // Messages are queued while the other phone is away and delivered when it is back.
  send:async(type,payload={})=>{
   if(!session)throw new Error('La sala se desconectó');
   const m={t:type,p:payload};
   if(conn&&conn.open){try{conn.send(m);return {ok:true}}catch(_){}}
   queue.push(m);if(queue.length>100)queue.shift();
   return {ok:true,queued:true};
  },
  leave(){
   const c=conn,p=peer;
   closing=true;epoch++;
   if(c&&c.open){try{c.send({t:'peer-left',p:{}})}catch(_){}}
   stopHeartbeat();clearInterval(signalTimer);signalTimer=null;
   conn=null;peer=null;queue=[];away=false;everJoined=false;reconnecting=false;
   setTimeout(()=>{try{c&&c.close()}catch(_){}try{p&&p.destroy()}catch(_){}},400);   // let the goodbye message go out first
   session=null;handlers=[];backlog=[];store.save();
  }
 };
})();
