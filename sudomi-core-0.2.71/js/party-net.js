/* SUDOMI 0.2.20 — online rooms for MORE than two players (window.SudomiParty).
 *
 * The older online-client.js links exactly two phones. Games for 2–4 players (DOS) use this file instead:
 *  - the host registers a PeerJS id "sudomi-<game>-<code>" and accepts several guests;
 *  - every guest talks only to the host (star shape). The host owns the game and sends each guest its own view;
 *  - a guest is recognised by a token kept in sessionStorage, so a refreshed or reconnected phone gets its seat back;
 *  - a heartbeat notices dead links; guests reconnect by themselves.
 * It reuses the settings in online-config.js (PeerJS library addresses, STUN/TURN relay).
 * Nothing here knows the rules of any game.
 */
(()=>{
 const cfg=window.SUDOMI_ONLINE||{};
 const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',PING_MS=5000,DEAD_MS=18000,OPEN_MS=15000,CONNECT_MS=20000,RETRY_MS=3000;
 const rnd=n=>{const a=new Uint32Array(n);(window.crypto||window.msCrypto).getRandomValues(a);return Array.from(a)};
 const makeCode=()=>rnd(8).map(x=>ALPHABET[x%ALPHABET.length]).join('');
 const makeToken=()=>rnd(6).map(x=>x.toString(36)).join('');
 const normCode=s=>String(s||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase();
 const sleep=ms=>new Promise(r=>setTimeout(r,ms));
 const peerId=(game,code)=>`sudomi-${game}-${code}`;

 function friendly(err){
  const t=err&&err.type,c=err&&err.code;
  if(c==='load')return err.message;
  if(c==='timeout')return 'El servicio de salas tardó demasiado en responder. Revisa tu internet e inténtalo otra vez.';
  if(c==='direct')return 'Encontramos la sala pero no se pudo abrir la conexión. Prueba con otra red (cambia de Wi‑Fi a datos móviles, o al revés).';
  return ({
   'peer-unavailable':'No encontramos esa sala. Revisa el código y que el anfitrión tenga la partida abierta.',
   'network':'Sin conexión a internet. Revisa tu red e inténtalo otra vez.',
   'server-error':'El servicio de salas no responde ahora. Inténtalo en un momento.',
   'socket-error':'El servicio de salas no responde ahora. Inténtalo en un momento.',
   'socket-closed':'Se cortó la conexión con el servicio de salas. Inténtalo otra vez.',
   'browser-incompatible':'Este navegador no permite jugar por internet.'
  })[t]||'No se pudo conectar. Inténtalo otra vez.';
 }

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
 let extraIce=null,icePromise=null;
 function loadIce(){
  if(!cfg.iceServersUrl)return Promise.resolve();
  if(!icePromise)icePromise=Promise.race([fetch(cfg.iceServersUrl).then(r=>r.ok?r.json():null),sleep(5000)]).then(list=>{if(Array.isArray(list)&&list.length)extraIce=list}).catch(()=>{});
  return icePromise;
 }
 const peerOptions=()=>({debug:0,config:{iceServers:[...(cfg.iceServers||[{urls:'stun:stun.l.google.com:19302'}]),...(extraIce||[])]},...(cfg.peerServer||{})});
 async function openPeer(id){
  const Peer=await loadPeer();await loadIce();
  return new Promise((resolve,reject)=>{
   const p=id?new Peer(id,peerOptions()):new Peer(peerOptions());let done=false;
   const timer=setTimeout(()=>{if(!done){done=true;try{p.destroy()}catch(_){}reject(Object.assign(new Error('timeout'),{code:'timeout'}))}},OPEN_MS);
   p.on('open',()=>{if(!done){done=true;clearTimeout(timer);resolve(p)}});
   p.on('error',err=>{if(!done){done=true;clearTimeout(timer);try{p.destroy()}catch(_){}reject(err)}});
  });
 }

 /* ---------- host: one room, many guests ----------
  * handler receives {type:'join',id,meta} · {type:'leave',id} · {type:'msg',id,data}  */
 async function host(game,handler,fixedCode){   // fixedCode: código propio y permanente (buzón de amigos); si ya está en uso se avisa en vez de buscar otro
  let peer=null,code='';
  for(let i=0;i<6&&!peer;i++){
   code=fixedCode||makeCode();
   try{peer=await openPeer(peerId(game,code))}catch(err){if(err&&err.type==='unavailable-id'){if(fixedCode)throw Object.assign(new Error('Ya tienes SUDOMI abierto en otra ventana.'),{code:'busy'});continue}throw new Error(friendly(err))}
  }
  if(!peer)throw new Error('No pudimos crear la sala. Inténtalo otra vez.');
  const links=new Map();let closed=false;
  const emit=e=>{try{handler(e)}catch(err){console.error('SUDOMI party:',err)}};
  const drop=(token,c)=>{const l=links.get(token);if(l&&l.conn===c){links.delete(token);if(!closed)emit({type:'leave',id:token})}};
  peer.on('connection',c=>{
   const meta=c.metadata||{},token=meta.token;
   const ready=()=>{
    if(closed||!token){try{c.close()}catch(_){}return}
    const old=links.get(token);
    if(old&&old.conn!==c){old.conn.__dead=true;try{old.conn.close()}catch(_){}}
    links.set(token,{conn:c,lastRx:Date.now()});
    emit({type:'join',id:token,meta});
   };
   c.on('data',m=>{const l=links.get(token);if(!l||l.conn!==c||!m||typeof m!=='object')return;l.lastRx=Date.now();if(m.t==='sys-ping')return;emit({type:'msg',id:token,data:m})});
   c.on('close',()=>{if(!c.__dead)drop(token,c)});
   c.on('error',()=>{});
   c.open?ready():c.on('open',ready);
  });
  peer.on('disconnected',()=>{if(!closed)setTimeout(()=>{try{if(!closed&&peer.disconnected&&!peer.destroyed)peer.reconnect()}catch(_){}},1500)});
  peer.on('error',()=>{});
  const hb=setInterval(()=>{
   for(const [token,l] of [...links]){
    try{l.conn.send({t:'sys-ping'})}catch(_){}
    if(Date.now()-l.lastRx>DEAD_MS){l.conn.__dead=true;try{l.conn.close()}catch(_){}drop(token,l.conn)}
   }
   try{if(peer.disconnected&&!peer.destroyed)peer.reconnect()}catch(_){}
  },PING_MS);
  const onVisible=()=>{if(document.visibilityState!=='visible')return;for(const l of links.values())l.lastRx=Date.now();try{if(peer.disconnected&&!peer.destroyed)peer.reconnect()}catch(_){}};
  document.addEventListener('visibilitychange',onVisible);
  return {
   code,
   has:id=>links.has(id),
   send(id,data){const l=links.get(id);if(l&&l.conn.open){try{l.conn.send(data);return true}catch(_){}}return false},
   // tell one phone why it cannot stay, then hang up
   reject(id,reason){const l=links.get(id);if(!l)return;links.delete(id);l.conn.__dead=true;try{l.conn.send({t:'reject',reason})}catch(_){}setTimeout(()=>{try{l.conn.close()}catch(_){}},500)},
   close(){
    if(closed)return;closed=true;clearInterval(hb);document.removeEventListener('visibilitychange',onVisible);
    for(const l of links.values()){l.conn.__dead=true;try{l.conn.send({t:'closed'})}catch(_){}}
    const all=[...links.values()];links.clear();
    setTimeout(()=>{all.forEach(l=>{try{l.conn.close()}catch(_){}});try{peer.destroy()}catch(_){}},500);
   }
  };
 }

 /* ---------- guest ----------
  * handler receives {type:'open'} · {type:'msg',data} · {type:'away'} · {type:'back'} · {type:'closed',message}  */
 function join(game,rawCode,meta,handler){
  const code=normCode(rawCode),KEY='sudomi-party-'+game+'-'+code;
  // la llave de la silla se guarda en el dispositivo (no solo en la pestaña): si cierras la app o se cae la conexión, al volver recuperas tu silla (hasta 6 h)
  let token;try{const v=JSON.parse(localStorage.getItem(KEY));if(v&&v.t&&Date.now()-v.at<6*3600*1000)token=v.t}catch(_){}
  if(!token){token=makeToken()}
  try{localStorage.setItem(KEY,JSON.stringify({t:token,at:Date.now()}))}catch(_){}
  let peer=null,conn=null,closed=false,lastRx=0,everOpen=false,looping=false,fails=0;
  const emit=e=>{try{handler(e)}catch(err){console.error('SUDOMI party:',err)}};
  function stop(){
   if(closed)return;closed=true;clearInterval(hb);document.removeEventListener('visibilitychange',onVisible);
   const c=conn,p=peer;conn=null;peer=null;
   setTimeout(()=>{try{c&&c.close()}catch(_){}try{p&&p.destroy()}catch(_){}},400);
  }
  async function connectOnce(){
   if(!peer||peer.destroyed){peer=await openPeer();peer.on('error',()=>{})}
   else if(peer.disconnected){await new Promise(r=>{peer.once('open',r);try{peer.reconnect()}catch(_){r()}setTimeout(r,8000)});if(!peer||peer.destroyed)peer=await openPeer()}
   if(closed)throw new Error('closed');
   await new Promise((ok,bad)=>{
    const p=peer,c=p.connect(peerId(game,code),{reliable:true,serialization:'json',metadata:{...(meta||{}),token}});
    let done=false;
    const timer=setTimeout(()=>fin(Object.assign(new Error('direct'),{code:'direct'})),CONNECT_MS);
    const onErr=err=>{if(err&&err.type==='peer-unavailable')fin(err)};
    p.on('error',onErr);
    function fin(err){if(done)return;done=true;clearTimeout(timer);try{p.off('error',onErr)}catch(_){}if(err){try{c.close()}catch(_){}bad(err)}else ok()}
    c.on('open',()=>{
     if(done||closed){try{c.close()}catch(_){}return}
     conn=c;lastRx=Date.now();
     c.on('data',m=>{
      if(!m||typeof m!=='object')return;lastRx=Date.now();
      if(m.t==='sys-ping')return;
      if(m.t==='closed'||m.t==='reject'){stop();emit({type:'closed',message:m.reason||'El anfitrión cerró la sala.'});return}
      emit({type:'msg',data:m});
     });
     c.on('close',()=>{if(conn===c){conn=null;if(!closed){emit({type:'away'});loop()}}});
     c.on('error',()=>{});
     fin();
    });
   });
  }
  async function loop(){
   if(looping||closed)return;looping=true;
   while(!closed&&!(conn&&conn.open)){
    try{await connectOnce();fails=0;emit({type:everOpen?'back':'open'});everOpen=true}
    catch(err){
     if(closed)break;
     fails++;
     if(!everOpen){stop();emit({type:'closed',message:friendly(err)});break}
     if(fails>=200){stop();emit({type:'closed',message:'El anfitrión no volvió. La sala se cerró.'});break}   // 0.2.71: unos 10 minutos de intentos (antes 3)
     await sleep(RETRY_MS);
    }
   }
   looping=false;
  }
  const hb=setInterval(()=>{
   if(!conn||!conn.open)return;
   try{conn.send({t:'sys-ping'})}catch(_){}
   if(Date.now()-lastRx>DEAD_MS){const c=conn;conn=null;try{c.close()}catch(_){}if(!closed){emit({type:'away'});loop()}}
  },PING_MS);
  const onVisible=()=>{if(document.visibilityState!=='visible'||closed)return;lastRx=Date.now();if(!(conn&&conn.open))loop()};
  document.addEventListener('visibilitychange',onVisible);
  loop();
  return {
   code,
   send(data){if(conn&&conn.open){try{conn.send(data);return true}catch(_){}}return false},
   close(){if(conn&&conn.open){try{conn.send({t:'bye'})}catch(_){}}try{localStorage.removeItem(KEY)}catch(_){}stop()}
  };
 }

 window.SudomiParty={host,join,normCode,pretty:c=>c&&c.length===8?c.slice(0,4)+'-'+c.slice(4):c};
})();
