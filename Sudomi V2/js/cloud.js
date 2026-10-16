/* SUDOMI 0.3.75 — CUENTA Y NUBE (window.SudomiCloud). Habla con el servidor dedicado (Servidor/sudomi_server.py): cuentas con nombre y PIN,
 * progreso guardado en la nube y rankings reales.
 *
 * ES UN AÑADIDO, NO UN REEMPLAZO: si el servidor no responde (el PC apagado, sin internet), la app sigue igual que antes: el progreso vive
 * en este teléfono, las salas online siguen por la vía directa de siempre (PeerJS, js/online-client.js y js/party-net.js) y los rankings
 * vuelven a la lista de ejemplo. Nada de este archivo es obligatorio para jugar.
 *
 * Dónde está el servidor: SUDOMI_ONLINE.api (js/online-config.js). Vacío = el mismo sitio que sirve esta página (cuando la app se abre
 * desde el propio servidor). En GitHub Pages, sin dirección puesta, este archivo no hace nada.
 *
 * Mezcla: se baja lo de la nube, se une con lo de este teléfono con las mismas reglas que «Sincronizar» (js/sync.js: gana lo mejor de
 * cada uno, nada se pierde) y se sube el resultado. Los módulos de la app leen su progreso al arrancar, así que si la nube trajo algo
 * nuevo hay que recargar la página: se hace sola si todavía no tocaste nada; si no, se avisa. */
(()=>{
 const cfg=window.SUDOMI_ONLINE||{},KEY='sudomi-cloud',RELOADED='sudomi-cloud-reloaded';
 const base=String(cfg.api||'').replace(/\/+$/,'');
 const shown=!!base||(!/\.github\.io$/i.test(location.hostname)&&/^https?:$/.test(location.protocol));
 let ready=false,acct=null,busy=false,touched=false,synced=false;
 try{acct=JSON.parse(localStorage.getItem(KEY))}catch(_){}
 const save=()=>{try{acct?localStorage.setItem(KEY,JSON.stringify(acct)):localStorage.removeItem(KEY)}catch(_){}};
 const esc=t=>String(t).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

 async function call(method,path,data,ms=8000){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
  try{
   const r=await fetch(`${base}/api/v1/${path}`,{method,signal:c.signal,cache:'no-store',headers:{'Content-Type':'application/json',...(acct?{Authorization:'Bearer '+acct.token}:{})},body:data?JSON.stringify(data):undefined});
   const j=await r.json().catch(()=>({}));
   if(r.status===401&&acct&&path!=='login'){acct=null;save()}   // la sesión ya no vale: hay que entrar otra vez
   if(!r.ok){const e=new Error(j.error||'El servidor no respondió.');e.status=r.status;throw e}
   return j;
  }catch(e){
   if(e.name==='AbortError'||e instanceof TypeError){const x=new Error('No hay conexión con el servidor.');x.offline=true;throw x}
   throw e;
  }finally{clearTimeout(t)}
 }

 // mejores marcas de este teléfono → rankings. Un valor que el servidor rechace no corta los demás
 async function scores(){
  const P=window.SudomiProfile&&SudomiProfile.get(),avatar=P?P.avatar:'';
  let best={};try{best=JSON.parse(localStorage.getItem('sudomi-score-best'))||{}}catch(_){}
  const list=Object.entries(best).filter(([,v])=>+v>0).map(([diff,value])=>({kind:'score',diff,value:Math.round(+value)}));
  if(window.SudomiXP&&SudomiXP.info.L>1)list.push({kind:'level',value:SudomiXP.info.L});
  const st=window.SudomiDaily?SudomiDaily.bestStreak():0;if(st>0)list.push({kind:'streak',value:st});
  for(const s of list){try{await call('POST','scores',{...s,avatar})}catch(e){if(e.offline)throw e}}
 }
 // devuelve {changed}: true si la nube trajo algo que este teléfono no tenía
 async function sync(){
  if(!ready||!acct||busy||!window.SudomiSync)return null;
  busy=true;
  try{
   const S=SudomiSync,remote=(await call('GET','progress')).data||{},local=S.collect(),merged=S.merge(local,remote);
   const changed=Object.keys(remote).length>0&&Object.keys(merged).some(k=>merged[k]!==local[k]);
   S.apply(merged);
   await call('PUT','progress',{data:merged});
   await scores();
   acct.last=Date.now();save();synced=true;cache={};
   return {changed};
  }finally{busy=false}
 }
 function toast(text){
  let t=document.getElementById('cloudToast');
  if(!t){t=document.createElement('div');t.id='cloudToast';t.className='wifi-toast';t.setAttribute('role','status');document.body.appendChild(t)}
  t.innerHTML=text;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),9000);
  const b=t.querySelector('button');if(b)b.onclick=()=>location.reload();
 }
 async function auto(){
  try{
   const r=await sync();if(!r||!r.changed)return;
   let once=false;try{once=sessionStorage.getItem(RELOADED)==='1';sessionStorage.setItem(RELOADED,'1')}catch(_){once=true}
   if(!touched&&!once)location.reload();   // una sola vez por sesión: nunca un bucle de recargas
   else if(!once)toast('☁️ Llegó progreso nuevo de tu cuenta. <button type="button" class="arc-btn">Recargar</button>');
  }catch(_){}   // sin servidor no pasa nada: se intenta la próxima vez
 }

 /* ---- rankings reales (los usa js/rankings.js) ---- */
 let cache={};
 function board(kind,diff,onData){
  if(!ready)return null;
  const k=kind+':'+(kind==='score'?diff:''),c=cache[k];
  if(c&&c.data&&Date.now()-c.t<60000)return c.data;
  if(!c||!c.loading){
   cache[k]={loading:true,data:c&&c.data,t:c?c.t:0};
   call('GET',`rankings?kind=${encodeURIComponent(kind)}&diff=${encodeURIComponent(kind==='score'?diff:'')}`)
    .then(d=>{cache[k]={data:d,t:Date.now()};if(onData)onData()})
    .catch(()=>{cache[k]={data:null,t:Date.now(),loading:true};setTimeout(()=>{delete cache[k]},15000)});   // falló: lista de ejemplo, y se reintenta más tarde
  }
  return c&&c.data||null;
 }

 /* ---- la pantalla «Cuenta y nube» ---- */
 function open(){
  const S=window.SudomiScreen;if(!S)return;
  let msg='';
  S.open('cloudScreen','☁️ Cuenta y nube',(body,api)=>{
   const P=window.SudomiProfile&&SudomiProfile.get();
   if(!ready){
    body.innerHTML=`<p class="tr-intro">El servidor de SUDOMI no responde ahora mismo.</p><p class="st-note">No pasa nada: tu progreso sigue guardado en este teléfono y las salas online funcionan como siempre. Cuando el servidor vuelva, tu cuenta se pondrá al día sola.</p><div class="tc-btns"><button type="button" id="clRetry" class="main">Probar otra vez</button></div>`;
    body.querySelector('#clRetry').onclick=()=>ping().then(()=>api.redraw());
    return;
   }
   if(!acct){
    body.innerHTML=`<p class="tr-intro">Con una cuenta, tu progreso se guarda fuera de este teléfono y apareces en los <b>rankings reales</b>. Si cambias de teléfono, entras con tu nombre y tu PIN y lo recuperas todo.</p>
    <div class="cl-form"><label>Nombre<input id="clName" maxlength="14" autocomplete="username" autocapitalize="words" value="${P?esc(P.name):''}" placeholder="De 3 a 14 letras"></label>
    <label>PIN<input id="clPin" type="password" maxlength="32" autocomplete="current-password" placeholder="4 caracteres o más"></label></div>
    <div class="tc-btns"><button type="button" id="clNew" class="main">Crear cuenta</button><button type="button" id="clIn">Ya tengo cuenta</button></div>
    <p class="m-status ${msg?'':'hidden'}" id="clMsg">${esc(msg)}</p>
    <p class="st-note">No pongas un PIN que uses en otro sitio. Si lo olvidas no hay forma de recuperarlo: el servidor no lo guarda.</p>`;
    const go=path=>async()=>{
     const name=body.querySelector('#clName').value.trim(),pin=body.querySelector('#clPin').value;
     if(name.length<3||pin.length<4){msg='Escribe un nombre (3 letras o más) y un PIN (4 o más).';api.redraw();return}
     msg='Conectando…';api.redraw();
     try{const r=await call('POST',path,{name,pin,avatar:P?P.avatar:''});acct={name:r.name,token:r.token};save();msg='';const s=await sync();api.redraw();if(s&&s.changed)toast('☁️ Progreso de tu cuenta descargado. <button type="button" class="arc-btn">Recargar</button>')}
     catch(e){msg=e.message;api.redraw()}
    };
    body.querySelector('#clNew').onclick=go('register');body.querySelector('#clIn').onclick=go('login');
    return;
   }
   const when=acct.last?new Date(acct.last).toLocaleString():'todavía no';
   body.innerHTML=`<div class="pf-card"><div class="pf-av">${P?P.avatar:'☁️'}</div><div class="pf-main"><b>${esc(acct.name)}</b><span>Cuenta conectada</span><small>Última sincronización: ${esc(when)}</small></div></div>
   <div class="tc-btns"><button type="button" id="clSync" class="main">🔄 Sincronizar ahora</button><button type="button" id="clOut">Cerrar sesión</button></div>
   <p class="m-status ${msg?'':'hidden'}" id="clMsg">${esc(msg)}</p>
   <p class="st-note">Se sincroniza sola cada vez que abres SUDOMI. Cerrar sesión no borra nada de este teléfono.</p>`;
   body.querySelector('#clSync').onclick=async()=>{msg='Sincronizando…';api.redraw();try{const s=await sync();msg=s?(s.changed?'Listo. Llegó progreso nuevo: recarga la página para verlo.':'Listo. Todo al día.'):'No se pudo sincronizar.'}catch(e){msg=e.message}api.redraw()};
   body.querySelector('#clOut').onclick=async()=>{try{await call('POST','logout',{})}catch(_){}acct=null;save();msg='';api.redraw()};
  });
 }

 /* ---- 0.3.78: SALAS ABIERTAS (jugar con desconocidos). El anfitrión enciende «Sala abierta» en la sala de espera (js/lobby.js) y su sala
  * sale en esta lista para todo el que esté conectado al mismo servidor. Entrar es entrar con el código, por la vía de siempre: el
  * servidor solo hace de tablón de anuncios, no lleva la partida. */
 const publish=o=>ready?call('POST','rooms',o).catch(()=>{}):Promise.resolve();
 function rooms(){
  const S=window.SudomiScreen;if(!S)return;
  S.open('roomsScreen','🌍 Salas abiertas',(body,api)=>{
   body.innerHTML='<p class="tr-intro">Buscando salas…</p>';
   call('GET','rooms').then(d=>{
    const list=(d.rooms||[]);
    body.innerHTML=(list.length?`<p class="tr-intro">Salas que otros jugadores abrieron. Toca una para entrar.</p><div class="or-list">${list.map((r,i)=>`<button type="button" class="or-row" data-or="${i}"><b>${esc(r.gameName||r.game)}</b><span>${esc(r.name||'Jugador')} · ${r.free===1?'falta 1':'faltan '+r.free}</span><i>Entrar ›</i></button>`).join('')}</div>`:'<p class="tr-intro">Ahora mismo no hay ninguna sala abierta.</p><p class="st-note">Para abrir la tuya: crea una partida en Multijugador y enciende «Sala abierta» en la sala de espera.</p>')+'<div class="tc-btns small"><button type="button" id="orAgain">🔄 Actualizar</button></div>';
    body.querySelector('#orAgain').onclick=()=>api.redraw();
    body.querySelectorAll('[data-or]').forEach(b=>b.onclick=()=>{const r=list[+b.dataset.or];S.close('roomsScreen');if(!window.SudomiJoinInvite||SudomiJoinInvite(r.game,r.code)===false)toast('No se pudo abrir esa sala.')});
   }).catch(e=>{body.innerHTML=`<p class="tr-intro">${esc(e.message)}</p>`});
  });
 }
 /* 0.3.84 — RIVAL AL AZAR (botón en «Elige tu partida»). Mira el tablón: si alguien tiene abierta una sala de ese juego, entra; si no,
  * abre una sala nueva por el camino de siempre (create) y la deja anunciada, para que entre el primero que busque. */
 async function quick(game,create){
  try{
   const r=((await call('GET','rooms')).rooms||[]).find(x=>x.game===game);
   if(r&&window.SudomiJoinInvite&&SudomiJoinInvite(r.game,r.code)!==false){toast(`🎲 Entrando a la sala de ${esc(r.name||'otro jugador')}…`);return}
  }catch(_){}
  if(window.SudomiLobby&&SudomiLobby.autoOpen)SudomiLobby.autoOpen();
  create();toast('🎲 No había salas de este juego: se abre una para ti. Entrará el primero que busque rival.');
 }
 async function ping(){try{const r=await call('GET','ping',null,3500);ready=!!(r&&r.name==='sudomi')}catch(_){ready=false}return ready}
 if(shown){
  window.addEventListener('pointerdown',()=>{touched=true},{once:true,capture:true});
  const start=()=>ping().then(ok=>{if(ok&&acct)auto()});
  if(document.readyState==='complete')setTimeout(start,600);else window.addEventListener('load',()=>setTimeout(start,600));
  // al salir se sube lo de este teléfono (solo si ya se mezcló con la nube en esta sesión, para no pisar lo de otro aparato con datos viejos)
  document.addEventListener('visibilitychange',()=>{
   if(!document.hidden||!ready||!acct||!synced||!window.SudomiSync)return;
   try{fetch(`${base}/api/v1/progress`,{method:'PUT',keepalive:true,headers:{'Content-Type':'application/json',Authorization:'Bearer '+acct.token},body:JSON.stringify({data:SudomiSync.collect()})}).catch(()=>{})}catch(_){}
  });
 }
 window.SudomiCloud={open,sync,board,rooms,publish,quick,shown:()=>shown,ready:()=>ready,account:()=>acct&&acct.name};
})();
