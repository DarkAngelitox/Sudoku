/* SUDOMI 0.2.52 — playing with NO internet: two phones on the same local network (for example one phone's hotspot) connect directly with
 * WebRTC and exchange the connection data through two QR codes, so no server and no internet are needed.
 *   guest: shows QR #1 (offer)  →  host scans it  →  host shows QR #2 (answer)  →  guest scans it  →  connected.
 * This file is a transport with the same interface as js/lan-client.js / js/online-client.js (create, join, on/off, send, leave, session…),
 * so the games work unchanged on top of it. It is switched on by SudomiQR.activate() (called by js/other-games.js when the player picks
 * "Sin internet (QR)") and switched off again when the player leaves. The option is offered only when no internet is detected.
 * Used for: Damas, Tres en raya, 4 en línea, Puntos y cajas, Memoria de animales (see QR_GAMES in js/other-games.js).
 * Details: no ICE servers (host candidates only); the camera permission is asked BEFORE the offer is made, because browsers then expose the
 * real local IP instead of an unresolvable ".local" name; the SDP is packed into ~100 bytes (ufrag, pwd, fingerprint, up to 4 candidates, CRC). */
(()=>{
 const Q=window.SudomiQRCode;if(!Q)return;
 const $=s=>document.querySelector(s);
 const MAGIC=0xA5;
 const dbg={mine:'',other:''};
 let orig=null,session=null,handlers=[],backlog=[],queue=[],pc=null,dc=null,pair=null,closing=false,stream=null,hb=null,lastRx=0,role=null,joinResolve=null,joinReject=null;
 const emit=e=>{if(handlers.length)handlers.forEach(fn=>fn(e));else backlog.push(e)};

 /* ---------- is the internet really missing? ---------- */
 let probeCache={at:0,off:false};
 async function checkOffline(force){
  // testing aid: open the app with ?qr=1 to show the option even with internet (kept for this browser tab only); ?qr=0 turns it off
  try{const q=new URLSearchParams(location.search).get('qr');if(q==='1')sessionStorage.setItem('sudomi-qr-force','1');if(q==='0')sessionStorage.removeItem('sudomi-qr-force');if(sessionStorage.getItem('sudomi-qr-force')==='1')return true}catch(_){}
  if(!force&&Date.now()-probeCache.at<12000)return probeCache.off;
  let off;
  if(navigator.onLine===false)off=true;
  else{
   try{const c=new AbortController(),t=setTimeout(()=>c.abort(),2500);await fetch('https://www.gstatic.com/generate_204',{mode:'no-cors',cache:'no-store',signal:c.signal});clearTimeout(t);off=false}catch(_){off=true}
  }
  probeCache={at:Date.now(),off};return off;
 }

 /* ---------- packing the connection data ---------- */
 const crc16=b=>{let c=0xFFFF;for(const x of b){c^=x<<8;for(let i=0;i<8;i++)c=(c&0x8000)?((c<<1)^0x1021)&0xFFFF:(c<<1)&0xFFFF}return c};
 const hex2b=h=>h.split(':').map(x=>parseInt(x,16));
 const b2hex=b=>b.map(x=>x.toString(16).toUpperCase().padStart(2,'0')).join(':');
 const ascii=s=>[...s].map(c=>c.charCodeAt(0)&127);
 function pack(sdp,type){
  const line=p=>{const m=sdp.match(new RegExp('^a='+p+':(.+)$','m'));return m?m[1].trim():''};
  const ufrag=line('ice-ufrag'),pwd=line('ice-pwd'),fpm=sdp.match(/^a=fingerprint:sha-256 ([0-9A-Fa-f:]+)/m);
  if(!ufrag||!pwd||!fpm)throw new Error('No se pudo preparar la conexión.');
  const cands=[];
  for(const m of sdp.matchAll(/^a=candidate:\S+ \d+ udp \d+ (\S+) (\d+) typ host/gm)){
   const ip=m[1],port=+m[2];
   if(/^\d+\.\d+\.\d+\.\d+$/.test(ip))cands.push({v4:ip.split('.').map(Number),port});
   else if(!ip.includes(':')&&ip.length<60)cands.push({name:ip,port});          // mDNS name; IPv6 is skipped
   if(cands.length>=4)break;
  }
  dbg.mine=cands.map(c=>(c.v4?c.v4.join('.'):c.name)+':'+c.port).join(', ')||'ninguna';
  if(!cands.length)throw new Error('No se encontró la red local. Conéctate al mismo Wi‑Fi (o al hotspot) que tu amigo.');
  const b=[MAGIC,type==='offer'?1:2,ufrag.length,...ascii(ufrag),pwd.length,...ascii(pwd),...hex2b(fpm[1]),cands.length];
  for(const c of cands){if(c.v4)b.push(4,...c.v4,c.port>>8,c.port&255);else b.push(6,c.name.length,...ascii(c.name),c.port>>8,c.port&255)}
  const crc=crc16(b);b.push(crc>>8,crc&255);
  return new Uint8Array(b);
 }
 function unpack(bytes){
  const b=Array.from(bytes);if(b.length<40||b[0]!==MAGIC)return null;
  const crc=crc16(b.slice(0,-2));if(((crc>>8)&255)!==b[b.length-2]||(crc&255)!==b[b.length-1])return null;
  let p=1;const type=b[p++]===1?'offer':'answer',ul=b[p++],ufrag=String.fromCharCode(...b.slice(p,p+ul));p+=ul;const pl=b[p++],pwd=String.fromCharCode(...b.slice(p,p+pl));p+=pl;
  const fp=b2hex(b.slice(p,p+32));p+=32;const n=b[p++],cands=[];
  for(let i=0;i<n;i++){const k=b[p++];
   if(k===4){cands.push({ip:b.slice(p,p+4).join('.'),port:(b[p+4]<<8)|b[p+5]});p+=6}
   else{const l=b[p++],name=String.fromCharCode(...b.slice(p,p+l));p+=l;cands.push({ip:name,port:(b[p]<<8)|b[p+1]});p+=2}}
  dbg.other=cands.map(c=>c.ip+':'+c.port).join(', ')||'ninguna';
  return {type,ufrag,pwd,fp,cands};
 }
 function buildSdp(d){
  const role=d.type==='offer'?'actpass':'active';
  const lines=['v=0','o=- 4611731400430051336 2 IN IP4 127.0.0.1','s=-','t=0 0','a=group:BUNDLE 0','a=msid-semantic: WMS','m=application 9 UDP/DTLS/SCTP webrtc-datachannel','c=IN IP4 0.0.0.0',
   'a=ice-ufrag:'+d.ufrag,'a=ice-pwd:'+d.pwd,'a=fingerprint:sha-256 '+d.fp,'a=setup:'+role,'a=mid:0','a=sctp-port:5000','a=max-message-size:262144'];
  d.cands.forEach((c,i)=>lines.push(`a=candidate:${i+1} 1 udp ${2113937151-i*256} ${c.ip} ${c.port} typ host generation 0`));
  lines.push('a=end-of-candidates');
  return lines.join('\r\n')+'\r\n';
 }

 /* ---------- WebRTC plumbing ---------- */
 async function camera(){
  if(stream&&stream.active)return stream;
  stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
  return stream;
 }
 function stopCamera(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}}
 function newPC(){
  pc=new RTCPeerConnection({iceServers:[]});
  pc.oniceconnectionstatechange=()=>{
   const s=pc&&pc.iceConnectionState;
   if(s==='failed'&&!closing){if(pair)pair.error('No se pudo abrir la conexión directa. Revisen que los dos teléfonos estén en el mismo Wi‑Fi (o en el hotspot de uno de ellos) y empiecen de nuevo.\n\nDatos para diagnóstico — mi teléfono: '+dbg.mine+' · el otro: '+dbg.other);else lost()}
  };
  return pc;
 }
 function gathered(){
  return new Promise(res=>{
   if(pc.iceGatheringState==='complete')return res();
   const done=()=>{if(pc.iceGatheringState==='complete'){pc.removeEventListener('icegatheringstatechange',done);res()}};
   pc.addEventListener('icegatheringstatechange',done);setTimeout(res,3500);
  });
 }
 function bind(ch){
  dc=ch;
  dc.onopen=()=>{if(pair){pair.close();pair=null}stopCamera();lastRx=Date.now();startHb();while(queue.length&&dc.readyState==='open')try{dc.send(queue.shift())}catch(_){break}
   if(role==='host')emit({type:'peer-joined'});if(joinResolve){joinResolve(session);joinResolve=joinReject=null}};
  dc.onmessage=e=>{
   let m;try{m=JSON.parse(e.data)}catch(_){return}
   if(!m||typeof m.t!=='string')return;lastRx=Date.now();
   if(m.t==='sys-ping')return;
   if(['peer-joined','peer-away','peer-back','error','room-lost'].includes(m.t))return;
   if(m.t==='peer-left'){emit({type:'peer-left'});return}
   emit({type:m.t,payload:m.p||{}});
  };
  dc.onclose=()=>{if(!closing)lost()};
 }
 function startHb(){stopHb();hb=setInterval(()=>{if(!dc||dc.readyState!=='open')return;try{dc.send(JSON.stringify({t:'sys-ping'}))}catch(_){}if(Date.now()-lastRx>15000)lost()},4000)}
 function stopHb(){if(hb){clearInterval(hb);hb=null}}
 function lost(){
  if(closing||!session)return;stopHb();
  emit({type:'room-lost',message:'Se perdió la conexión directa con el otro teléfono. Vuelvan a emparejarse para seguir jugando.'});
 }
 function teardown(){
  stopHb();try{dc&&dc.close()}catch(_){}try{pc&&pc.close()}catch(_){}dc=null;pc=null;queue=[];stopCamera();
  if(pair){pair.close();pair=null}
 }

 /* ---------- the pairing screen ---------- */
 function openPair(kind,onCancel){
  const el=document.createElement('div');el.className='qr-pair';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
  el.innerHTML='<div class="qp-card"><button type="button" class="qp-x" aria-label="Cancelar">✕</button><p class="qp-kicker"></p><h2 class="qp-title"></h2><p class="qp-help"></p><div class="qp-stage"></div><div class="qp-act"></div><p class="qp-note">Los dos teléfonos deben estar en el mismo Wi‑Fi (o conectados al hotspot de uno de ellos).</p></div>';
  document.body.appendChild(el);document.body.classList.add('tut-open');
  let scanner=null;
  const k=el.querySelector('.qp-kicker'),t=el.querySelector('.qp-title'),h=el.querySelector('.qp-help'),st=el.querySelector('.qp-stage'),ac=el.querySelector('.qp-act');
  const set=(kick,title,help)=>{k.textContent=kick;t.textContent=title;h.innerHTML=help};
  const api={
   close(){if(scanner)scanner.stop();el.remove();document.body.classList.remove('tut-open')},
   showQR(bytes,kick,title,help,btn,onBtn){
    if(scanner){scanner.stop();scanner=null}
    set(kick,title,help);st.innerHTML='<canvas class="qp-qr"></canvas>';
    Q.draw(st.querySelector('canvas'),Q.encode(Array.from(bytes)),Math.min(330,Math.floor(window.innerWidth-70)));
    ac.innerHTML=btn?`<button type="button" class="qp-btn">${btn}</button>`:'<p class="qp-wait">⏳ Esperando la conexión…</p>';
    if(btn)ac.querySelector('button').onclick=onBtn;
   },
   async scan(kick,title,help,onBytes){
    set(kick,title,help);ac.innerHTML='';st.innerHTML='<div class="qp-cam"><video playsinline muted autoplay></video><i class="qp-frame"></i></div><p class="qp-wait" id="qpMsg">Abriendo la cámara…</p>';
    try{
     const s=await camera(),v=st.querySelector('video');v.srcObject=s;await v.play().catch(()=>{});
     $('#qpMsg').textContent='Apunta la cámara al código QR del otro teléfono.';
     scanner=Q.scan(v,bytes=>{$('#qpMsg').textContent='¡Código leído!';onBytes(bytes)},b=>!!unpack(b));
    }catch(err){st.innerHTML=`<p class="qp-err">No se pudo abrir la cámara. Da permiso a la cámara en tu navegador y vuelve a intentarlo.</p>`}
   },
   status(kick,title,help,icon){if(scanner){scanner.stop();scanner=null}set(kick,title,help);st.innerHTML=`<div class="qp-bigicon">${icon}</div>`;ac.innerHTML='<p class="qp-wait">⏳ Esperando la conexión…</p>'},
   error(msg){if(scanner){scanner.stop();scanner=null}set('SIN CONEXIÓN','No se pudo conectar',msg);st.innerHTML='<div class="qp-bigicon">📵</div>';ac.innerHTML='<button type="button" class="qp-btn">Cerrar</button>';ac.querySelector('button').onclick=()=>{api.close();if(onCancel)onCancel()}}
  };
  el.querySelector('.qp-x').onclick=()=>{api.close();if(onCancel)onCancel()};
  return api;
 }

 /* ---------- host ---------- */
 async function startHost(){
  role='host';newPC();
  pc.ondatachannel=e=>bind(e.channel);
  pair=openPair('host',()=>{teardown();emit({type:'error',message:'Se canceló el emparejamiento.'})});
  pair.scan('PASO 1 DE 2 · ANFITRIÓN','Escanea el código de tu amigo','Tu amigo debe tocar <b>«Unirme»</b> y mostrarte su código QR.',async bytes=>{
   try{
    const d=unpack(bytes);if(!d||d.type!=='offer')throw new Error('Ese código no es de una invitación de SUDOMI.');
    await pc.setRemoteDescription({type:'offer',sdp:buildSdp(d)});
    const ans=await pc.createAnswer();await pc.setLocalDescription(ans);await gathered();
    const out=pack(pc.localDescription.sdp,'answer');
    pair.showQR(out,'PASO 2 DE 2 · ANFITRIÓN','Muestra este código a tu amigo','Tu amigo debe escanearlo con su teléfono. Cuando lo lea, quedarán conectados.');
   }catch(err){pair.error(err.message||'No se pudo leer el código.')}
  });
 }
 /* ---------- guest ---------- */
 async function startGuest(){
  role='guest';
  try{await camera()}catch(_){/* the scanner will explain; without it the other phone's IP may be hidden */}
  newPC();
  const ch=pc.createDataChannel('sudomi',{ordered:true});bind(ch);
  const off=await pc.createOffer();await pc.setLocalDescription(off);await gathered();
  const out=pack(pc.localDescription.sdp,'offer');
  pair=openPair('guest',()=>{teardown();if(joinReject){joinReject(new Error('Se canceló el emparejamiento.'));joinResolve=joinReject=null}});
  pair.showQR(out,'PASO 1 DE 2 · INVITADO','Muestra este código al anfitrión','El anfitrión debe tocar <b>«Crear partida»</b> y escanear este código con su teléfono.','Ya lo escaneó → Siguiente',()=>{
   pair.scan('PASO 2 DE 2 · INVITADO','Escanea el código del anfitrión','Ahora el anfitrión te mostrará <b>su</b> código. Escanéalo con tu cámara.',async bytes=>{
    try{
     const d=unpack(bytes);if(!d||d.type!=='answer')throw new Error('Ese código no es la respuesta del anfitrión.');
     await pc.setRemoteDescription({type:'answer',sdp:buildSdp(d)});
     pair.status('CONECTANDO','Conectando…','Un momento: se está abriendo la conexión directa.','🔗');
    }catch(err){pair.error(err.message||'No se pudo leer el código.')}
   });
  });
 }

 /* ---------- the transport (same shape as SudomiLAN) ---------- */
 const Net={
  kind:'qr',
  async create(game){teardown();closing=false;session={room:'QR',player:0,token:'qr',game,kind:'qr'};startHost();return session},
  join(game){
   teardown();closing=false;session={room:'QR',player:1,token:'qr',game,kind:'qr'};
   return new Promise((resolve,reject)=>{
    joinResolve=resolve;joinReject=err=>{session=null;reject(err)};
    startGuest().catch(err=>{if(joinReject){joinReject(new Error(err&&err.message||'No se pudo preparar la conexión.'));joinResolve=joinReject=null}});
    setTimeout(()=>{if(joinReject){const r=joinReject;joinResolve=joinReject=null;teardown();r(new Error('Se acabó el tiempo del emparejamiento. Inténtalo otra vez.'))}},240000);
   });
  },
  on:fn=>{handlers.push(fn);if(backlog.length){const p=backlog;backlog=[];p.forEach(e=>fn(e))}},
  off:fn=>{handlers=handlers.filter(x=>x!==fn)},
  get session(){return session},
  get saved(){return null},
  resume(){return null},
  forget(){},
  send:async(type,payload={})=>{
   if(!session)throw new Error('La conexión se cerró');
   const m=JSON.stringify({t:type,p:payload});
   if(dc&&dc.readyState==='open'){try{dc.send(m);return {ok:true}}catch(_){}}
   queue.push(m);if(queue.length>100)queue.shift();return {ok:true,queued:true};
  },
  leave(){
   closing=true;try{if(dc&&dc.readyState==='open')dc.send(JSON.stringify({t:'peer-left',p:{}}))}catch(_){}
   setTimeout(()=>teardown(),300);session=null;handlers=[];backlog=[];role=null;
   if(window.SudomiLAN===Net&&orig){window.SudomiLAN=orig;orig=null}
  }
 };
 function activate(){if(window.SudomiLAN!==Net){orig=window.SudomiLAN;window.SudomiLAN=Net;closing=false}}
 function deactivate(){if(window.SudomiLAN===Net){try{Net.leave()}catch(_){}if(orig){window.SudomiLAN=orig;orig=null}}}
 window.SudomiQR={checkOffline,activate,deactivate,Net,_pack:pack,_unpack:unpack,_sdp:buildSdp};
})();
