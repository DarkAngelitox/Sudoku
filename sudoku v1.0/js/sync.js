/* SUDOMI 0.2.53 — Phase 19: synchronisation between devices WITHOUT accounts or servers of our own.
 * Two devices open Configuración → "Sincronizar con otro dispositivo", pair (internet: a short code through the same room service as the online
 * games; no internet: the two-QR pairing of js/qr-client.js), exchange their progress and both end up with the SAME merged progress.
 * Merge rules (conservative, so nothing is lost and nothing is counted twice):
 *   XP: the higher of the two · achievements: the union (earliest unlock date) · counters (wins, combos, best score…): the higher · best times: the lower
 *   statistics: the union of finished games (by date) · daily calendar: the union of finished days (and half-done days) · records and training: the higher
 *   profile: kept if this device has one, otherwise taken from the other device · settings and the game in progress: each device keeps its own.
 * Real cloud sync (accounts, automatic) would need a server; this is the serverless version of Phase 19. */
(()=>{
 const S=window.SudomiScreen;if(!S)return;
 const SYNC_KEYS=['sudomi-xp','sudomi-ach','sudomi-stats','sudomi-daily','sudomi-score-best','sudomi-race','sudomi-training','sudomi-profile','sudomi-tutorial'];
 const J=s=>{try{return JSON.parse(s)}catch(_){return null}};
 const uniq=a=>[...new Set(a)];
 const max=(a,b)=>Math.max(+a||0,+b||0);
 const maxObj=(a,b)=>{const o={};for(const k of uniq([...Object.keys(a||{}),...Object.keys(b||{})]))o[k]=max((a||{})[k],(b||{})[k]);return o};
 const minObj=(a,b)=>{const o={};for(const k of uniq([...Object.keys(a||{}),...Object.keys(b||{})])){const x=(a||{})[k],y=(b||{})[k];o[k]=x&&y?Math.min(x,y):(x||y)}return o};
 /* ---- merging one key at a time (a = this device, b = the other) ---- */
 const MERGE={
  'sudomi-xp':(a,b)=>({xp:max(a.xp,b.xp),wins:uniq([...(a.wins||[]),...(b.wins||[])]).slice(-80),days:uniq([...(a.days||[]),...(b.days||[])]).slice(-400),lock:a.lock!==false,log:[...(a.log||[]),...(b.log||[])].sort((x,y)=>x.t-y.t).slice(-10)}),
  'sudomi-ach':(a,b)=>{
   const A=a.stats||{},B=b.stats||{},un={};
   for(const k of uniq([...Object.keys(a.unlocked||{}),...Object.keys(b.unlocked||{})])){const x=(a.unlocked||{})[k],y=(b.unlocked||{})[k];un[k]=x&&y?Math.min(x,y):(x||y)}
   const st={...A,...B};
   for(const k of Object.keys(st)){
    if(k==='byDiff'||k==='otherWins')st[k]=maxObj(A[k],B[k]);
    else if(k==='bestTime')st[k]=minObj(A[k],B[k]);
    else if(Array.isArray(st[k]))st[k]=uniq([...(A[k]||[]),...(B[k]||[])]).slice(-120);
    else st[k]=max(A[k],B[k]);
   }
   return {unlocked:un,stats:st};
  },
  'sudomi-stats':(a,b)=>{
   const seen=new Set(),games=[...(a.games||[]),...(b.games||[])].filter(g=>{const k=`${g.t}-${g.d}-${g.w}`;if(seen.has(k))return false;seen.add(k);return true}).sort((x,y)=>x.t-y.t).slice(-500);
   const sa=a.seed||{byDiff:{},best:{}},sb=b.seed||{byDiff:{},best:{}};
   return {games,seed:{byDiff:maxObj(sa.byDiff,sb.byDiff),best:minObj(sa.best,sb.best)},counted:uniq([...(a.counted||[]),...(b.counted||[])]).slice(-150)};
  },
  'sudomi-daily':(a,b)=>{
   const done={...(b.done||{}),...(a.done||{})};
   for(const k of Object.keys(b.done||{}))if(a.done&&a.done[k]&&b.done[k]&&b.done[k].s&&(!a.done[k].s||b.done[k].s<a.done[k].s))done[k]=b.done[k];
   const prog={...(b.prog||{}),...(a.prog||{})};for(const k of Object.keys(done))delete prog[k];
   return {done,prog,paid:uniq([...(a.paid||[]),...(b.paid||[])]).slice(-60)};
  },
  'sudomi-score-best':(a,b)=>maxObj(a,b),
  'sudomi-race':(a,b)=>maxObj(a,b),
  'sudomi-training':(a,b)=>maxObj(a,b),
  'sudomi-tutorial':(a,b)=>({...b,...a,seen:!!(a.seen||b.seen)})
 };
 function collect(){const o={};SYNC_KEYS.forEach(k=>{try{const v=localStorage.getItem(k);if(v!==null)o[k]=v}catch(_){}});return o}
 function merge(local,remote){
  const out={};
  for(const k of uniq([...Object.keys(local),...Object.keys(remote)])){
   const a=local[k],b=remote[k];
   if(a===undefined){out[k]=b;continue}if(b===undefined){out[k]=a;continue}
   if(k==='sudomi-profile'){out[k]=a;continue}
   const fn=MERGE[k];if(!fn){out[k]=a;continue}
   const ja=J(a),jb=J(b);if(!ja||!jb){out[k]=a;continue}
   try{out[k]=JSON.stringify(fn(ja,jb))}catch(_){out[k]=a}
  }
  return out;
 }
 function numbers(map){
  const xp=(J(map['sudomi-xp'])||{}).xp||0,ach=Object.keys((J(map['sudomi-ach'])||{}).unlocked||{}).length,games=((J(map['sudomi-stats'])||{}).games||[]).length,days=Object.keys((J(map['sudomi-daily'])||{}).done||{}).length;
  return {xp,ach,games,days};
 }
 function apply(map){try{Object.entries(map).forEach(([k,v])=>localStorage.setItem(k,v))}catch(_){}}
 const fmt=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,',');

 /* ---- the screen ---- */
 let cur=null,net=null,finished=false;
 function open(){
  S.open('syncScreen','🔄 Sincronizar',(body,api)=>{
   cur=api;finished=false;
   body.innerHTML=`<p class="tr-intro">Une tu progreso en <b>dos dispositivos</b> (por ejemplo tu teléfono y el de tu casa). Toma lo mejor de cada uno: XP, logros, estadísticas y calendario. Los dos terminan con lo mismo.</p>
   <div class="m-cards"><div class="m-card static"><span>🌐</span><div><b>Con internet (código)</b><small>Uno crea un código y el otro lo escribe.</small><div class="m-bots"><button type="button" id="syCreate">Crear código</button></div><div class="m-join"><input id="syCode" aria-label="Código del otro dispositivo" maxlength="9" autocapitalize="characters" autocomplete="off" placeholder="ABCD-1234"><button type="button" id="syJoin">Unirme</button></div></div></div>
    <div class="m-card static hidden" id="syQrCard"><span>📷</span><div><b>Sin internet (QR)</b><small>Dos teléfonos en la misma red, con códigos QR.</small><div class="m-bots"><button type="button" id="syQrHost">Crear (escanear)</button><button type="button" id="syQrGuest">Unirme (mostrar mi código)</button></div></div></div></div>
   <p class="m-status hidden" id="syStatus"></p>
   <p class="st-note">Consejo: guarda antes una copia desde Configuración. Las partidas en curso no se mezclan; cada dispositivo conserva la suya.</p>`;
   const st=t=>{const e=body.querySelector('#syStatus');e.classList.remove('hidden');e.textContent=t};
   if(window.SudomiQR&&window.RTCPeerConnection)body.querySelector('#syQrCard').classList.remove('hidden');
   body.querySelector('#syCreate').onclick=()=>hostNet(api,st);
   body.querySelector('#syJoin').onclick=()=>{const c=SudomiParty.normCode(body.querySelector('#syCode').value);if(c.length<8){st('Escribe el código completo (8 caracteres).');return}joinNet(api,st,c)};
   body.querySelector('#syQrHost').onclick=()=>qr(api,st,true);
   body.querySelector('#syQrGuest').onclick=()=>qr(api,st,false);
  });
 }
 function finish(api,remote){
  if(finished)return;finished=true;
  const local=collect(),before=numbers(local),merged=merge(local,remote),after=numbers(merged);
  apply(merged);
  setTimeout(()=>{try{if(net&&net.close)net.close()}catch(_){}net=null;if(window.SudomiQR)SudomiQR.deactivate()},900);
  api.body.innerHTML=`<div class="tr-end"><span>✅</span><h3>¡Progreso sincronizado!</h3><div class="sy-table"><div><small></small><b>Antes</b><b>Ahora</b></div><div><small>XP</small><span>${fmt(before.xp)}</span><b>${fmt(after.xp)}</b></div><div><small>Logros</small><span>${before.ach}</span><b>${after.ach}</b></div><div><small>Partidas guardadas</small><span>${before.games}</span><b>${after.games}</b></div><div><small>Días del Sudoku del día</small><span>${before.days}</span><b>${after.days}</b></div></div><p>Los dos dispositivos quedan con el mismo progreso.</p><div class="tr-act"><button type="button" id="syReload">Aplicar y reiniciar</button></div></div>`;
  api.body.querySelector('#syReload').onclick=()=>{location.href=location.pathname};
 }
 async function hostNet(api,st){
  try{
   st('Creando el código…');
   net=await SudomiParty.host('sync',e=>{
    if(e.type==='join'){st('¡Conectado! Intercambiando datos…');setTimeout(()=>net&&net.send(e.id,{t:'sync',data:collect()}),400)}
    else if(e.type==='msg'&&e.data&&e.data.t==='sync')finish(api,e.data.data||{});
   });
   api.body.innerHTML=`<div class="m-code"><small>CÓDIGO PARA EL OTRO DISPOSITIVO</small><b>${SudomiParty.pretty(net.code)}</b></div><p class="m-status big">⏳ En el otro dispositivo: Configuración → Sincronizar → «Unirme» y escribe el código.</p>`;
  }catch(err){st((err&&err.message)||'No se pudo crear el código.')}
 }
 function joinNet(api,st,code){
  st('Conectando…');
  net=SudomiParty.join('sync',code,{name:'sync'},e=>{
   if(e.type==='open'){st('¡Conectado! Intercambiando datos…');setTimeout(()=>net&&net.send({t:'sync',data:collect()}),400)}
   else if(e.type==='msg'&&e.data&&e.data.t==='sync')finish(api,e.data.data||{});
   else if(e.type==='closed'&&!finished)st(e.message||'No se pudo conectar.');
  });
 }
 async function qr(api,st,host){
  const Q=window.SudomiQR;if(!Q){st('El modo QR no está disponible.');return}
  Q.activate();const L=window.SudomiLAN;
  const handler=e=>{
   if(e.type==='peer-joined'){st('¡Conectado! Intercambiando datos…');setTimeout(()=>L.send('sync',{data:collect()}),400)}
   else if(e.type==='sync')finish(api,(e.payload&&e.payload.data)||{});
   else if(e.type==='room-lost'||e.type==='error'){if(!finished)st(e.message||'Se perdió la conexión.')}
  };
  L.on(handler);net={close(){try{L.leave()}catch(_){}}};
  try{
   if(host)await L.create('sync');
   else{await L.join('sync','QRDIRECT');st('¡Conectado! Intercambiando datos…');setTimeout(()=>L.send('sync',{data:collect()}),400)}
  }catch(err){st((err&&err.message)||'No se pudo emparejar.');Q.deactivate()}
 }
 window.SudomiSync={open,merge,collect,apply,SYNC_KEYS};
})();
