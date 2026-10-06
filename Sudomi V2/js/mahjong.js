/* SUDOMI 0.2.100 — DUELO MAHJONG nuevo (window.SudomiMahjong). Sustituye al Mahjong por turnos de js/extra-games.js, que sigue ahí sin usarse.
 * Se abre con SudomiMahjong.open({hub,stage,exit}, 'pve' | 'online' | 'join', código)  (ver openMahjong en other-games.js).
 *
 * ES UNA CARRERA: cada jugador tiene SU PROPIO tablero de 80 fichas (40 parejas), idéntico al del rival, y juegan a la vez.
 * Tocas una ficha libre y luego su pareja. Si fallas, tu tablero se bloquea LOCK milisegundos. Gana quien primero despeje el suyo.
 * FICHAS (FACES): cada pareja tiene un dibujo único y van de MUY DISTINTAS (primeras 12) a MUY PARECIDAS (últimas 16).
 * TABLERO (T): pirámide de 3 pisos, 8×6 + 6×4 + 4×2 = 80. Una ficha está libre si no tiene nada encima y tiene libre la izquierda o la derecha.
 * REPARTO (deal): se «desarma» el tablero al revés, de dos en dos fichas libres, y a la pareja número n se le da el dibujo n; por eso siempre
 * tiene solución, y como no hay dibujos repetidos nunca te quedas trabado. Las primeras parejas en salir (arriba y a los lados) son las fáciles.
 * ONLINE: js/party-net.js + sala de js/lobby.js, 2 jugadores. El anfitrión reparte y envía {t:'start',val}; cada teléfono juega su tablero y
 * solo se mandan el avance {t:'p',n}. El invitado avisa {t:'fin'} y el anfitrión decide quién ganó y lo anuncia con {t:'over',w,ms}. */
(()=>{
 const GAME='mahjong',NAME='Duelo Mahjong',LOCK=2000;
 /* 0.3.4 (V2, Fase 5): FICHAS DIBUJADAS, ya no emojis (se veían distintas en cada teléfono). Son las 40 fichas de un mahjong de verdad,
  * ordenadas de muy distintas a muy parecidas: 6 símbolos, 3 dragones, 4 vientos, 9 de números, 9 de bambú y 9 de círculos.
  * face(n) devuelve el dibujo SVG de la ficha n (caja de 40×50). */
 const PAIRS=40;
 const DOTS={1:[[20,25]],2:[[20,13],[20,37]],3:[[10,11],[20,25],[30,39]],4:[[12,13],[28,13],[12,37],[28,37]],5:[[11,11],[29,11],[20,25],[11,39],[29,39]],
  6:[[12,10],[28,10],[12,25],[28,25],[12,40],[28,40]],7:[[9,8],[20,14],[31,20],[12,33],[28,33],[12,44],[28,44]],8:[[12,7],[28,7],[12,19],[28,19],[12,31],[28,31],[12,43],[28,43]],
  9:[[9,9],[20,9],[31,9],[9,25],[20,25],[31,25],[9,41],[20,41],[31,41]]};
 const DR=[0,9,6.5,5.5,6,5.2,5,4.2,4.2,4.4],INK=['#1565c0','#c62828','#2e7d32'];
 const SYM=[
  '<path d="M20 5l4.700 10.400 11.300 1.200-8.500 7.600 2.500 11.100L20 29.500 10 35.300l2.500-11.100L4 16.600l11.300-1.200z" fill="#f9a825" stroke="#b26a00" stroke-width="1.200" stroke-linejoin="round"/>',
  '<circle cx="20" cy="25" r="8" fill="#ef6c00"/><g stroke="#ef6c00" stroke-width="2.600" stroke-linecap="round"><path d="M20 8v5M20 37v5M3 25h5M32 25h5M8 13l3.500 3.500M28.500 33.500L32 37M32 13l-3.500 3.500M11.500 33.500L8 37"/></g>',
  '<path d="M26 7a18 18 0 1 0 0 36A14 14 0 0 1 26 7z" fill="#3949ab"/>',
  '<path d="M20 5c12 8 13 24 0 40C7 29 8 13 20 5z" fill="#2e7d32"/><path d="M20 10v32" stroke="#c8e6c9" stroke-width="1.800" stroke-linecap="round"/>',
  '<path d="M20 42C4 30 3 15 11 11c4-2 7 0 9 4 2-4 5-6 9-4 8 4 7 19-9 31z" fill="#d81b60"/>',
  '<g fill="#8e24aa"><circle cx="20" cy="13" r="6"/><circle cx="31" cy="21" r="6"/><circle cx="27" cy="34" r="6"/><circle cx="13" cy="34" r="6"/><circle cx="9" cy="21" r="6"/></g><circle cx="20" cy="25" r="5" fill="#ffd54a"/>'
 ];
 const CJK=(ch,col,lat)=>`<text x="20" y="35" text-anchor="middle" font-size="28" font-weight="900" fill="${col}" font-family="'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif">${ch}</text>${lat?`<text x="5" y="11" font-size="9" font-weight="900" fill="${col}" font-family="sans-serif">${lat}</text>`:''}`;
 function face(n){
  let g='';
  if(n<6)g=SYM[n];
  else if(n<9)g=n===6?CJK('中','#c62828'):n===7?CJK('發','#2e7d32'):'<rect x="8" y="9" width="24" height="32" rx="3" fill="none" stroke="#1565c0" stroke-width="3.500"/><rect x="13" y="14" width="14" height="22" rx="1.500" fill="none" stroke="#1565c0" stroke-width="1.500"/>';
  else if(n<13)g=CJK('東南西北'[n-9],'#10213b','ESON'[n-9]);
  else if(n<22){const k=n-12;g=`<text x="20" y="24" text-anchor="middle" font-size="22" font-weight="900" fill="#10213b" font-family="sans-serif">${k}</text><text x="20" y="44" text-anchor="middle" font-size="17" font-weight="900" fill="#c62828" font-family="'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif">萬</text>`}
  else if(n<31){const k=n-21;g=DOTS[k].map(([x,y],j)=>{const h=k===1?30:k<4?15:k<7?12:9.500,w=k===1?7:4.200,c=k===1?'#2e7d32':INK[(j%2)*2];return `<rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" rx="${w/2}" fill="${c}"/><path d="M${x-w/2} ${y}h${w}" stroke="#fff" stroke-width=".9"/>`}).join('')}
  else{const k=n-30;g=DOTS[k].map(([x,y],j)=>`<circle cx="${x}" cy="${y}" r="${DR[k]}" fill="${INK[(j+k)%3]}"/><circle cx="${x}" cy="${y}" r="${DR[k]*.42}" fill="#fff" opacity=".85"/>`).join('')}
  return `<svg viewBox="0 0 40 50" aria-hidden="true">${g}</svg>`;
 }
 const T=[];[[8,6,0],[6,4,1],[4,2,2]].forEach(([w,h,o],z)=>{for(let r=0;r<h;r++)for(let c=0;c<w;c++)T.push({z,r:r+o,c:c+o})});
 const IDX=new Map(T.map((t,i)=>[t.z*100+t.r*10+t.c,i]));
 const at=(z,r,c)=>{const i=IDX.get(z*100+r*10+c);return i===undefined?-1:i};
 function free(i,gone){const t=T[i],up=at(t.z+1,t.r,t.c),l=at(t.z,t.r,t.c-1),r=at(t.z,t.r,t.c+1);if(up>=0&&!gone[up])return false;return l<0||gone[l]||r<0||gone[r]}
 function deal(){
  for(let tr=0;tr<600;tr++){
   const gone=T.map(()=>false),val=T.map(()=>-1);let ok=true;
   for(let n=0;n<PAIRS;n++){
    const fr=[];T.forEach((_,i)=>{if(!gone[i]&&free(i,gone))fr.push(i)});
    if(fr.length<2){ok=false;break}
    const w=new Map(fr.map(i=>[i,(tr<400?T[i].z:0)+Math.random()*3]));fr.sort((a,b)=>w.get(b)-w.get(a));   // primero lo de arriba, con algo de azar
    val[fr[0]]=val[fr[1]]=n;gone[fr[0]]=gone[fr[1]]=true;
   }
   if(ok)return val;
  }
  return T.map((_,i)=>i>>1);
 }
 const validDeal=v=>Array.isArray(v)&&v.length===T.length&&v.every(x=>Number.isInteger(x)&&x>=0&&x<PAIRS);
 const esc=t=>String(t).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const clean=n=>String(n||'').replace(/[<>&"']/g,'').replace(/\s+/g,' ').trim().slice(0,14);
 const P=()=>window.SudomiProfile,myName=()=>(P()&&P().name&&P().name())||'Jugador 1',myAvatar=()=>(P()&&P().avatar&&P().avatar())||'🙂';
 const play=n=>{try{window.SudomiSound&&SudomiSound.play(n)}catch(_){}};
 const clock=ms=>{const s=Math.max(0,Math.round(ms/1000));return (s/60|0)+':'+String(s%60).padStart(2,'0')};
 let ui=null,S=null,els=[],token=0,umode='pve',tick=0;
 const net={role:'solo',room:null,conn:null,code:'',seats:[],me:0,started:false,status:'',tok:0};
 const $=s=>ui.stage.querySelector(s);
 const head=()=>`<div class="dos-head"><div><h2>${NAME}</h2></div><div class="dos-actions"><button class="game-restart" id="mzRules" aria-label="Reglas">?</button></div></div>`;
 const rulesHTML=()=>`<h3>${NAME}</h3><ul>
  <li>Es una <b>carrera</b>: cada jugador tiene <b>su propio tablero</b> con las mismas ${T.length} fichas (${PAIRS} parejas) y juegan <b>al mismo tiempo</b>.</li>
  <li>Solo puedes tocar fichas <b>libres</b>: sin nada encima y con el lado izquierdo o el derecho libre. Las bloqueadas se ven oscuras.</li>
  <li>Toca una ficha libre y luego <b>su pareja</b> (el mismo dibujo). Cada dibujo aparece solo dos veces.</li>
  <li>Al principio las fichas son muy distintas; mientras avanzas se vuelven <b>muy parecidas</b>.</li>
  <li>Si te equivocas, tu tablero se <b>bloquea ${LOCK/1000} segundos</b>.</li>
  <li>Gana quien <b>primero</b> despeje su tablero.</li></ul>`;
 function sheet(html){const s=document.createElement('div');s.className='pc-sheet';s.innerHTML=`<div class="pc-sheet-in">${html}<button class="arc-btn" type="button" data-close>Entendido</button></div>`;s.onclick=e=>{if(e.target===s||e.target.closest('[data-close]'))s.remove()};const r=$('.mz');if(r)r.appendChild(s)}

 function renderMenu(){
  stop();leaveNet();
  const online=umode==='online';
  ui.stage.innerHTML=`<div class="mini-game mz">${head()}<div class="mz-menu">${net.status?`<p class="pc-note bad">${esc(net.status)}</p>`:''}
   <div class="pc-hero">🀄<b>${NAME}</b><span>Carrera de parejas: cada quien con su tablero de ${T.length} fichas. Fallar te bloquea ${LOCK/1000} segundos. Gana quien termine primero.</span></div>
   <div class="mz-sample"><span>${face(0)}</span><span>${face(5)}</span><i>→</i><span>${face(15)}</span><span>${face(18)}</span><i>→</i><span>${face(33)}</span><span>${face(34)}</span><small>De muy distintas a muy parecidas</small></div>
   <button class="arc-btn pc-big" id="mzStart">${online?'🌐 Crear sala':'▶ Jugar'}</button>${online?'':`<button class="arc-btn ghost pc-big" id="mzSolo">⏱ Solitario contra el reloj${bestSolo()?' · récord '+clock(bestSolo()):''}</button>`}</div></div>`;
  net.status='';$('#mzRules').onclick=()=>sheet(rulesHTML());
  $('#mzStart').onclick=online?createRoom:()=>startLocal(false);const so=$('#mzSolo');if(so)so.onclick=()=>startLocal(true);
 }
 // 0.3.12: SOLITARIO — el mismo tablero sin rival, contra el reloj; se guarda tu mejor tiempo en localStorage 'sudomi-mahjong-best'
 const bestSolo=()=>{try{return Math.max(0,+localStorage.getItem('sudomi-mahjong-best')||0)}catch(_){return 0}};
 let lastSolo=false;
 function startLocal(solo){
  lastSolo=!!solo;
  if(solo){begin(deal(),[{name:myName(),avatar:myAvatar()},{name:'Tu récord',avatar:'⏱',solo:true}],0);return}
  const ai=[['Maestra Li','🐼'],['Don Fichas','🦉'],['La Rápida','🦊']][Math.random()*3|0];
  begin(deal(),[{name:myName(),avatar:myAvatar()},{name:ai[0],avatar:ai[1],ai:true}],0);
 }
 // empieza una partida en este teléfono: val = dibujo de cada ficha, seats = los dos jugadores, me = cuál soy yo
 function begin(val,seats,me){
  stop();const t=token;
  S={val,gone:T.map(()=>false),sel:-1,done:[0,0],me,seats,started:false,over:false,winner:null,lockUntil:0,t0:0,ms:0,waitFin:false};
  ui.stage.innerHTML=`<div class="mini-game mz">${head()}
   <div class="mz-top">${[me,1-me].map(p=>`<div class="mz-p${p===me?' me':''}" data-p="${p}"><span>${esc(seats[p].avatar)}</span><b>${esc(seats[p].name)}${p===me&&net.role!=='solo'?' (tú)':''}</b><i>0/${PAIRS}</i><u><s></s></u></div>`).join('')}</div>
   <div class="mz-alert" id="mzAlert" role="status"></div>
   <div class="mz-wrap"><div class="mz-board wait" id="mzBoard">${T.map((q,i)=>`<button type="button" class="mz-t" data-i="${i}" style="left:${q.c*12.5}%;top:${(q.r/6*100).toFixed(3)}%;--z:${q.z};z-index:${q.z*10+1}"><span>${face(val[i])}</span></button>`).join('')}</div>
    <div class="mz-lock hidden" id="mzLock"><span>⛔</span><b>${LOCK/1000}</b><small>Te equivocaste</small></div><div class="mz-count" id="mzCount">3</div></div>
   <p class="mz-clock" id="mzClock">⏱ 0:00</p><div class="mz-ctrl" id="mzCtrl"></div></div>`;
  $('#mzRules').onclick=()=>sheet(rulesHTML());
  els=[...ui.stage.querySelectorAll('.mz-t')];els.forEach((e,i)=>e.onclick=()=>tap(i));
  draw();setAlert('Prepárate…');
  // cuenta atrás 3-2-1 para que los dos empiecen a la vez
  let n=3;const step=()=>{if(t!==token||!S)return;const c=$('#mzCount');if(!c)return;if(n>0){c.textContent=n--;play('tap');setTimeout(step,800);return}
   c.classList.add('hidden');$('#mzBoard').classList.remove('wait');S.started=true;S.t0=Date.now();setAlert('🀄 ¡Busca las parejas!');
   tick=setInterval(()=>{if(S&&S.started&&!S.over&&$('#mzClock'))$('#mzClock').textContent='⏱ '+clock(Date.now()-S.t0)},500);
   if(S.seats[1-S.me].ai)aiLoop(t)};
  step();
 }
 function setAlert(txt,cls){const a=$('#mzAlert');if(a){a.textContent=txt;a.className='mz-alert '+(cls||'')}}
 function draw(){
  if(!S||!els.length)return;
  els.forEach((e,i)=>{const g=S.gone[i],f=!g&&free(i,S.gone);e.classList.toggle('gone',g);e.classList.toggle('free',f);e.classList.toggle('blocked',!g&&!f);e.classList.toggle('sel',S.sel===i);e.disabled=g});
  ui.stage.querySelectorAll('.mz-p').forEach(b=>{const p=+b.dataset.p;b.querySelector('i').textContent=S.seats[p].solo?(bestSolo()?clock(bestSolo()):'—'):(S.seats[p].away?'📴 ':'')+S.done[p]+'/'+PAIRS;b.querySelector('s').style.width=(S.done[p]/PAIRS*100)+'%'});
 }
 function tap(i){
  if(!S||!S.started||S.over||S.waitFin||S.gone[i]||Date.now()<S.lockUntil)return;
  if(!free(i,S.gone)){setAlert('Esa ficha está bloqueada: necesita un lado libre y nada encima');return}
  if(S.sel<0){S.sel=i;play('tap');draw();return}
  if(S.sel===i){S.sel=-1;draw();return}
  const j=S.sel;S.sel=-1;
  if(S.val[j]===S.val[i]){
   S.gone[j]=S.gone[i]=true;S.done[S.me]++;play('pop');setAlert(S.done[S.me]>=PAIRS-16?'👀 Ojo: ahora se parecen mucho':'✅ ¡Pareja!');draw();
   if(net.role==='host')toGuest({t:'p',n:S.done[0]});else if(net.role==='guest'&&net.conn)net.conn.send({t:'p',n:S.done[1]});
   if(S.done[S.me]>=PAIRS){
    if(net.role==='guest'){S.waitFin=true;S.ms=Date.now()-S.t0;net.conn.send({t:'fin',ms:S.ms});setAlert('¡Terminaste! Confirmando…')}
    else decide(S.me,Date.now()-S.t0);
   }
   return;
  }
  // fallo: tablero bloqueado LOCK ms
  const t=token;S.lockUntil=Date.now()+LOCK;play('bad');[j,i].forEach(k=>{els[k].classList.add('miss');setTimeout(()=>els[k]&&els[k].classList.remove('miss'),500)});
  const lk=$('#mzLock'),bd=$('#mzBoard');lk.classList.remove('hidden');bd.classList.add('locked');setAlert(`⛔ No son iguales: bloqueado ${LOCK/1000} segundos`,'danger');draw();
  let left=LOCK/1000;lk.querySelector('b').textContent=left;
  const cd=setInterval(()=>{if(t!==token||!S){clearInterval(cd);return}left--;if(left>0)lk.querySelector('b').textContent=left},1000);
  setTimeout(()=>{clearInterval(cd);if(t!==token||!S)return;lk.classList.add('hidden');bd.classList.remove('locked');if(!S.over)setAlert('🀄 Sigue buscando')},LOCK);
 }
 // la computadora no tiene tablero: solo avanza su contador, cada vez un poco más lento (las últimas fichas son las difíciles)
 function aiLoop(t){
  const lv=window.SudomiAILevel?SudomiAILevel():'normal',pace=lv==='easy'?[3800,110]:lv==='hard'?[1900,55]:[2600,80];   // 0.3.3: milisegundos por pareja = base + extra por cada pareja ya hecha
  const p=1-S.me,next=()=>{if(t!==token||!S||S.over)return;setTimeout(()=>{if(t!==token||!S||S.over)return;S.done[p]++;draw();if(S.done[p]>=PAIRS)decide(p,Date.now()-S.t0);else next()},pace[0]+pace[1]*S.done[p]+Math.random()*1500)};
  next();
 }
 // quien manda la partida (solo o anfitrión) declara al ganador
 function decide(w,ms){if(!S||S.over)return;toGuest({t:'over',w,ms});finish(w,ms)}
 function finish(w,ms){
  const solo=!!(S&&S.seats[1-S.me]&&S.seats[1-S.me].solo);let record=false;
  if(solo&&S&&!S.over){const b0=bestSolo();if(!b0||ms<b0){record=true;try{localStorage.setItem('sudomi-mahjong-best',String(ms))}catch(_){}}}
  if(!S||S.over)return;S.over=true;S.winner=w;if(!solo)try{window.dispatchEvent(new CustomEvent('sudomi-arcade',{detail:{game:'mahjong',won:w===S.me}}))}catch(_){}S.waitFin=false;clearInterval(tick);S.sel=-1;draw();
  const mine=w===S.me,lk=$('#mzLock');if(lk)lk.classList.add('hidden');const bd=$('#mzBoard');if(bd)bd.classList.add('over');
  if($('#mzClock'))$('#mzClock').textContent='⏱ '+clock(ms);
  setAlert(mine?`🏆 ¡Ganaste! Terminaste en ${clock(ms)}`:`💀 Ganó ${S.seats[w].name} · te faltaron ${PAIRS-S.done[S.me]} parejas`,mine?'win':'danger');
  play(mine?'win':'bad');if(mine){try{window.SudomiFX&&SudomiFX.confetti&&SudomiFX.confetti()}catch(_){}}
  const c=$('#mzCtrl');if(!c)return;
  c.innerHTML=net.role==='guest'?'<p class="mz-hint">Esperando a que el anfitrión empiece otra partida…</p>':'<button class="arc-btn pc-big" type="button" id="mzAgain">↻ Jugar otra vez</button>';
  const b=$('#mzAgain');if(b)b.onclick=()=>net.role==='host'?startOnline():startLocal(lastSolo);
  // 0.3.11: pantalla de resultado común (js/result.js)
  if(window.SudomiResult)SudomiResult.show($('.mz'),{kind:mine?'win':'lose',game:'DUELO MAHJONG',title:solo?(record?'¡Nuevo récord!':'¡Tablero despejado!'):mine?'¡Ganaste la carrera!':'Ganó '+S.seats[w].name,sub:solo?('Tu tiempo: '+clock(ms)+(record?'':' · récord '+clock(bestSolo()))):mine?'Terminaste en '+clock(ms):`Te faltaron ${PAIRS-S.done[S.me]} parejas`,
   again:net.role==='guest'?null:()=>net.role==='host'?startOnline():startLocal(lastSolo),exit:()=>{const u=ui;close();u.stage.innerHTML='';u.exit()},
   share:mine?`Despejé el Duelo Mahjong de SUDOMI en ${clock(ms)}. ¡Juega conmigo!`:'Jugué Duelo Mahjong en SUDOMI. ¡Juega conmigo!'});
 }

 /* ================= sala online (2 jugadores) ================= */
 const toGuest=d=>{if(net.role==='host'&&net.room&&net.seats[1]&&net.seats[1].id)net.room.send(net.seats[1].id,d)};
 const pubSeats=()=>net.seats.map(s=>({kind:s.kind,name:s.name,avatar:s.avatar,away:!!s.away}));
 function inviteUrl(){const base=location.origin&&location.origin!=='null'?location.origin+location.pathname:location.href.split(/[?#]/)[0];return `${base}?game=${GAME}&room=${net.code}`}
 function pushLobby(){if(net.role!=='host')return;toGuest({t:'lobby',seats:pubSeats(),code:net.code});if(!net.started)renderLobby()}
 function renderLobby(){
  if(!ui)return;const host=net.role==='host';
  ui.stage.innerHTML=`<div class="mini-game mz">${head()}<div id="lbRoot"></div></div>`;$('#mzRules').onclick=()=>sheet(rulesHTML());
  if(!window.SudomiLobby){$('#lbRoot').textContent=net.status||'Creando sala…';return}
  SudomiLobby.render($('#lbRoot'),{game:GAME,gameName:NAME,code:net.code||null,url:net.code?inviteUrl():'',host,fixed:true,
   seats:net.seats.map((s,k)=>({state:k===net.me&&s.kind==='human'?'me':s.kind==='open'?'open':s.kind==='ai'?'ai':s.away?'away':'human',name:s.name,avatar:s.avatar})),
   extra:`<p class="pc-note">Carrera: ${T.length} fichas para cada uno. Gana quien termine primero.</p>`,
   startLabel:'▶ Empezar la carrera',canStart:!!net.code,onStart:host?startOnline:undefined,
   onAI:i=>{if(!host||net.started||!net.seats[i]||net.seats[i].kind!=='open')return;Object.assign(net.seats[i],{kind:'ai',name:'Maestra Li',avatar:'🐼'});pushLobby()},
   status:net.status,hint:host?'Comparte el código o invita a un amigo. Si nadie entra, juega la IA.':''});
 }
 async function createRoom(){
  if(P()&&P().get&&!P().get()){P().ensure(()=>createRoom());return}
  if(!window.SudomiParty){net.status='Este navegador no puede crear salas.';return renderMenu()}
  const my=++net.tok;Object.assign(net,{role:'host',code:'',started:false,status:'',me:0,room:null});
  net.seats=[{kind:'human',id:'host',name:myName(),avatar:myAvatar()},{kind:'open'}];renderLobby();
  try{const room=await SudomiParty.host(GAME,onHost);if(my!==net.tok){room.close();return}net.room=room;net.code=room.code;renderLobby()}
  catch(e){if(my!==net.tok)return;net.role='solo';net.status=(e&&e.message)||'No se pudo crear la sala.';renderMenu()}
 }
 function onHost(e){
  if(net.role!=='host')return;const s=net.seats[1];
  if(e.type==='join'){
   if(s.id===e.id){s.away=false;if(S){S.seats[1].away=false;draw()}}
   else if(s.kind!=='open'||net.started){net.room.reject(e.id,net.started?'La partida ya empezó.':'La sala está llena.');return}
   else Object.assign(s,{kind:'human',id:e.id,name:clean((e.meta||{}).n)||'Amigo',avatar:String((e.meta||{}).a||'🙂').slice(0,4)});
   pushLobby();
  }else if(e.type==='leave'){
   if(s.id!==e.id)return;
   if(!net.started){net.seats[1]={kind:'open'};pushLobby();return}
   s.away=true;if(S){S.seats[1].away=true;draw();if(!S.over)setAlert(`📴 ${S.seats[1].name} se desconectó. Termina tu tablero para ganar.`)}
  }else if(e.type==='msg'&&s.id===e.id&&S&&!S.over&&e.data){
   if(e.data.t==='p'){S.done[1]=Math.max(S.done[1],Math.min(PAIRS,e.data.n|0));draw()}
   else if(e.data.t==='fin'){S.done[1]=PAIRS;decide(1,Math.max(0,e.data.ms|0)||Date.now()-S.t0)}
  }
 }
 function startOnline(){
  if(net.role!=='host'||!net.room)return;
  if(net.seats[1].kind==='open')Object.assign(net.seats[1],{kind:'ai',name:'Maestra Li',avatar:'🐼'});
  net.started=true;const val=deal();toGuest({t:'start',val,seats:pubSeats()});
  begin(val,net.seats.map(s=>({name:s.name,avatar:s.avatar,ai:s.kind==='ai',away:!!s.away})),0);
 }
 function joinRoom(code){
  if(P()&&P().get&&!P().get()){P().ensure(()=>joinRoom(code));return}
  if(!window.SudomiParty){net.status='Este navegador no puede entrar a salas.';umode='online';return renderMenu()}
  stop();leaveNet();
  const my=++net.tok;Object.assign(net,{role:'guest',code:SudomiParty.normCode(code),started:false,status:'Conectando con la sala…',seats:[],me:1});renderLobby();
  net.conn=SudomiParty.join(GAME,code,{n:myName(),a:myAvatar()},e=>{if(my===net.tok)onGuest(e)});
 }
 function onGuest(e){
  if(e.type==='open'){net.status='';if(!net.started)renderLobby();return}
  if(e.type==='away'){net.status='Se perdió la conexión. Reconectando…';if(!net.started)renderLobby();else if(S&&!S.over)setAlert(net.status,'danger');return}
  if(e.type==='back'){net.status='';if(S&&!S.over)setAlert('🀄 Sigue buscando');return}
  if(e.type==='closed'){const m=e.message||'La sala se cerró.';stop();leaveNet();net.status=m;umode='online';renderMenu();return}
  if(e.type!=='msg')return;const d=e.data||{};
  if(d.t==='lobby'){net.seats=d.seats;net.code=d.code||net.code;if(!net.started)renderLobby()}
  else if(d.t==='start'&&validDeal(d.val)){net.started=true;if(Array.isArray(d.seats))net.seats=d.seats;begin(d.val,net.seats.map(s=>({name:s.name,avatar:s.avatar})),1)}
  else if(d.t==='p'&&S&&!S.over){S.done[0]=Math.max(S.done[0],Math.min(PAIRS,d.n|0));draw()}
  else if(d.t==='over'&&S){if(d.w===0)S.done[0]=PAIRS;finish(d.w===1?1:0,Math.max(0,d.ms|0))}
 }
 function leaveNet(){net.tok++;if(net.room){try{net.room.close()}catch(_){}}if(net.conn){try{net.conn.close()}catch(_){}}Object.assign(net,{role:'solo',room:null,conn:null,code:'',seats:[],started:false,me:0})}
 function stop(){token++;clearInterval(tick);S=null;els=[]}
 function close(){stop();leaveNet();net.status=''}
 function open(opts,m,code){
  ui=opts;ui.hub.classList.add('hidden');ui.stage.classList.remove('hidden');
  if(m==='join'){umode='online';joinRoom(code);return}
  umode=m==='online'?'online':'pve';renderMenu();
 }
 window.SudomiMahjong={open,close,join:code=>joinRoom(code),playing:()=>!!S&&!S.over,_state:()=>S,_net:()=>net,_ev:e=>onHost(e),_deal:deal,_free:free,_T:T};
})();
