/* SUDOMI 0.2.58 — Dominó MULTIJUGADOR (1 a 4 personas, rooms over the internet through js/party-net.js, the same PeerJS rooms DOS and STOP use).
 *   · The host creates a room and shares the code; up to 3 more people join. Seats are filled in this order: host = seat 1, second person = your PARTNER
 *     (seat 3, so two friends play together against two computers), then the two rivals. Every seat nobody takes is played by the computer
 *     (Yaritza, El Palomo, El Tigre). The host presses "Empezar" whenever they want — alone or with whoever is already in.
 *   · The host's page owns the game (js/extra-games.js: create/apply/view/render/botAct). Guests send {t:'act'}; the host applies it, lets the computers
 *     play their turns, and sends each person a copy of the state with the other hands hidden (SudomiExtraGames.view).
 *   · A person who leaves in the middle is replaced by the computer for the rest of the match.
 * Opened by openDominoParty() in js/other-games.js: SudomiDominoParty.open({hub, stage, exit, back, profile}). */
(()=>{
 const X=()=>window.SudomiExtraGames,P=()=>window.SudomiParty;
 const aiList=()=>window.SudomiAI?SudomiAI.random(3):[['IA','🤖'],['IA 2','🤖'],['IA 3','🤖']];
 const HUMAN_ORDER=[0,2,1,3];                     // who sits where: 1st = seat 0, 2nd = partner (seat 2), then the rivals
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let env=null,net=null,role=null,room={humans:[],started:false},mySeat=0,game=null,botTimer=null,code='',alive=false;
 const prof=()=>{const p=window.SudomiProfile;return p&&p.get()?{name:p.name(),avatar:p.avatar()}:{name:'Jugador',avatar:'🦊'}};
 const $=s=>env.hub.querySelector(s)||env.stage.querySelector(s);

 function open(e,pending){
  env=e;alive=true;
  if(!P()||!X()){env.hub.innerHTML='<p>No se cargó el módulo de conexión.</p>';return}
  const pr=window.SudomiProfile;if(pr&&!pr.get()){pr.ensure(()=>open(e,pending));return}
  menu();
  if(pending)join(P().normCode(pending));
 }
 function close(){
  alive=false;clearTimeout(botTimer);
  try{if(net&&net.close)net.close()}catch(_){}
  net=null;role=null;game=null;room={humans:[],started:false};
 }
 /* ---------- menu ---------- */
 function menu(msg){
  close();alive=true;
  env.stage.classList.add('hidden');env.hub.classList.remove('hidden');
  env.hub.innerHTML=`<button class="games-back mode-back" id="dpBack">‹ Modos</button><div class="mode-picker wifi-picker"><span class="mode-game-icon">🁣</span><p>MULTIJUGADOR · 1 A 4 JUGADORES</p><h2>Dominó</h2><div class="wifi-lobby">
   <button class="primary-action" id="dpCreate">Crear sala</button>
   <label for="dpCode">O únete con el código de un amigo</label><input id="dpCode" maxlength="9" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" placeholder="ABCD-2345"><button class="secondary-action" id="dpJoin">Unirse</button>
   <p id="dpStatus">${msg?esc(msg):'Cuando quieras, empiezas: los lugares que queden libres los juega la IA. Dos amigos juegan juntos contra dos computadoras.'}</p></div></div>`;
  $('#dpBack').onclick=()=>{close();env.back()};
  $('#dpCreate').onclick=host;
  $('#dpJoin').onclick=()=>{const c=P().normCode($('#dpCode').value);if(c.length!==8){status('Escribe el código de 8 caracteres.');return}join(c)};
 }
 const status=t=>{const e=$('#dpStatus');if(e)e.textContent=t};

 /* ---------- host ---------- */
 async function host(){
  status('Creando la sala…');
  const me=prof();room={humans:[{id:'host',name:me.name,avatar:me.avatar}],started:false,bots:aiList()};role='host';mySeat=0;
  try{
   net=await P().host('domino4',onHost);
   code=net.code;
   lobbyView();
  }catch(err){role=null;status((err&&err.message)||'No se pudo crear la sala.')}
 }
 function seatsFromRoom(){
  const seats=[null,null,null,null];
  room.humans.forEach((h,k)=>{seats[HUMAN_ORDER[k]]={name:h.name,avatar:h.avatar,human:true,id:h.id}});
  for(let s=0;s<4;s++)if(!seats[s]){const b=(room.bots||aiList())[s-1]||['IA','🤖'];seats[s]={name:b[0],avatar:b[1],bot:true}}
  return seats;
 }
 function onHost(e){
  if(!alive||role!=='host')return;
  if(e.type==='join'){
   const meta=e.meta||{};
   const known=room.humans.find(h=>h.id===e.id);
   if(!known){
    if(room.started){net.reject(e.id,'La partida ya empezó.');return}
    if(room.humans.length>=4){net.reject(e.id,'La sala está llena (4 jugadores).');return}
    room.humans.push({id:e.id,name:String(meta.name||'Jugador').slice(0,14),avatar:meta.avatar||'👤'});
   }
   if(room.started){sendState(e.id)}else{lobbyView();broadcastLobby()}
  }else if(e.type==='leave'){
   const i=room.humans.findIndex(h=>h.id===e.id);if(i<0)return;
   if(!room.started){room.humans.splice(i,1);lobbyView();broadcastLobby()}
   else{const seat=seatOfId(e.id);if(seat>=0&&game){game.seats[seat]={name:game.seats[seat].name+' (IA)',avatar:game.seats[seat].avatar,bot:true};room.humans[i].gone=true;toast(`${game.seats[seat].name} salió: lo reemplaza la IA.`);publish();scheduleBot()}}
  }else if(e.type==='msg'&&e.data&&e.data.t==='act'&&game){
   const seat=seatOfId(e.id);if(seat<0)return;
   X().apply('domino',game,seat,e.data.act);publish();scheduleBot();
  }
 }
 const seatOfId=id=>game?game.seats.findIndex(s=>s.id===id):-1;
 function lobbyView(){
  env.hub.classList.remove('hidden');env.stage.classList.add('hidden');
  const seats=seatsFromRoom(),isHost=role==='host';
  env.hub.innerHTML=`<button class="games-back mode-back" id="dpBack">‹ Salir</button><div class="mode-picker wifi-picker"><span class="mode-game-icon">🁣</span><p>SALA DE DOMINÓ</p><h2>${isHost?'Comparte este código':'Esperando al anfitrión'}</h2>
   <div class="m-code"><small>CÓDIGO DE LA SALA</small><b>${esc(P().pretty(code))}</b>${isHost?'<div><button type="button" id="dpShare">📤 Compartir enlace</button></div>':''}</div>
   <div class="dp-seats">${[0,1,2,3].map(s=>{const x=seats[s],mine=x.human&&((isHost&&x.id==='host')||(!isHost&&s===mySeat));return `<div class="dp-seat ${x.bot?'bot':''}"><span>${esc(x.avatar)}</span><div><b>${esc(x.name)}${mine?' (tú)':''}</b><small>${s%2===0?'Equipo A':'Equipo B'}${s===2?' · compañero del anfitrión':''}${x.bot?' · IA':''}</small></div></div>`}).join('')}</div>
   ${isHost?'<button class="primary-action" id="dpStart">Empezar la partida</button><p class="m-status">Los lugares sin persona los juega la IA.</p>':'<p class="m-status">El anfitrión empezará cuando esté listo…</p>'}</div>`;
  $('#dpBack').onclick=()=>{close();menu()};
  if(isHost){
   $('#dpStart').onclick=start;
   const sh=$('#dpShare');if(sh)sh.onclick=share;
  }
 }
 function share(){
  const base=location.origin&&location.origin!=='null'?location.origin+location.pathname:location.href.split(/[?#]/)[0];
  const url=`${base}?game=domino4&room=${code}`,text='Juega Dominó conmigo en SUDOMI';
  if(navigator.share)navigator.share({title:'SUDOMI',text,url}).catch(()=>{});
  else if(navigator.clipboard)navigator.clipboard.writeText(`${text}: ${url}`).then(()=>toast('Enlace copiado.')).catch(()=>{});
 }
 function broadcastLobby(){
  const seats=seatsFromRoom().map(s=>({name:s.name,avatar:s.avatar,bot:!!s.bot}));
  room.humans.forEach((h,k)=>{if(h.id!=='host')net.send(h.id,{t:'lobby',seats,you:HUMAN_ORDER[k],code})});
 }
 function start(){
  if(role!=='host')return;
  room.started=true;
  game=X().create('domino','party',{seats:seatsFromRoom()});game.wifi=true;
  env.hub.classList.add('hidden');env.stage.classList.remove('hidden');
  publish();scheduleBot();
 }
 function publish(){
  if(role==='host'&&game)room.humans.forEach(h=>{if(h.id!=='host'&&!h.gone)sendState(h.id)});
  draw();
 }
 function sendState(id){
  const seat=seatOfId(id);if(seat<0)return;
  const v=X().view('domino',game,seat);
  net.send(id,{t:'state',seat,state:v});
 }
 function scheduleBot(){
  clearTimeout(botTimer);botTimer=null;
  if(role!=='host'||!game||!alive)return;
  const act=X().botAct('domino',game);if(!act)return;
  const g0=game;
  botTimer=setTimeout(()=>{if(game!==g0||!alive)return;X().apply('domino',g0,g0.turn,act);publish();scheduleBot()},act.delay||900);
 }

 /* ---------- guest ---------- */
 function join(c){
  const me=prof();code=c;role='guest';room={humans:[],started:false};game=null;
  status('Conectando…');
  net=P().join('domino4',c,{name:me.name,avatar:me.avatar},e=>{
   if(!alive||role!=='guest')return;
   if(e.type==='open'){status('Conectado. Esperando al anfitrión…')}
   else if(e.type==='closed'){const m=e.message||'La sala se cerró.';close();menu(m)}
   else if(e.type==='away'){toast('Se perdió la conexión… reintentando.',true)}
   else if(e.type==='back'){toast('¡Conexión recuperada!')}
   else if(e.type==='msg'&&e.data){
    const d=e.data;
    if(d.t==='lobby'){mySeat=d.you;room.seats=d.seats;seatsGuest=d.seats;lobbyView2()}
    else if(d.t==='state'){mySeat=d.seat;game=d.state;game.wifi=true;draw()}
   }
  });
 }
 let seatsGuest=null;
 function lobbyView2(){   // the guest's waiting room (same look, seats come from the host)
  env.hub.classList.remove('hidden');env.stage.classList.add('hidden');
  env.hub.innerHTML=`<button class="games-back mode-back" id="dpBack">‹ Salir</button><div class="mode-picker wifi-picker"><span class="mode-game-icon">🁣</span><p>SALA DE DOMINÓ</p><h2>Esperando al anfitrión</h2>
   <div class="m-code"><small>CÓDIGO DE LA SALA</small><b>${esc(P().pretty(code))}</b></div>
   <div class="dp-seats">${seatsGuest.map((x,s)=>`<div class="dp-seat ${x.bot?'bot':''}"><span>${esc(x.avatar)}</span><div><b>${esc(x.name)}${s===mySeat?' (tú)':''}</b><small>${s%2===0?'Equipo A':'Equipo B'}${x.bot?' · IA':''}</small></div></div>`).join('')}</div>
   <p class="m-status">El anfitrión empezará cuando esté listo…</p></div>`;
  $('#dpBack').onclick=()=>{close();menu()};
 }

 /* ---------- drawing (host and guests) ---------- */
 function toast(t,sticky){const f=env&&env.toast;if(f)f(t,sticky)}
 function draw(){
  if(!alive||!game)return;
  env.hub.classList.add('hidden');env.stage.classList.remove('hidden');
  const ctx={wifi:true,player:mySeat,names:[],profile:null,render:draw,dispatch:act=>{
   if(role==='host'){X().apply('domino',game,mySeat,act);publish();scheduleBot()}
   else if(net)net.send({t:'act',act});
  }};
  const x=X().render('domino',game,ctx);
  const over=game.over;
  const end=over?`<div class="game-end-overlay"><div class="game-end-card"><p>PARTIDA TERMINADA</p><h3>${game.winTeam===mySeat%2?'¡Ganó tu equipo!':'Ganó el otro equipo'}</h3><strong>${game.winTeam===mySeat%2?'Ganador: tu equipo':'Ganador: equipo rival'}</strong><small>${esc(game.message||'')}</small><div>${role==='host'?'<button id="dpAgain">Jugar otra</button>':'<button disabled>El anfitrión inicia otra</button>'}<button id="dpExit">Salir</button></div></div></div>`:'';
  env.stage.innerHTML=`<div class="mini-game"><div class="mini-game-head"><div><p>ARCADE SUDOMI · MULTIJUGADOR</p><h2>Dominó</h2><small>Sala ${esc(P().pretty(code))}</small></div><div class="mini-game-actions"><button class="game-restart" id="dpLeave">Salir</button></div></div>${x.html}${end}</div>`;
  x.bind();
  $('#dpLeave').onclick=()=>{close();env.exit()};
  const again=$('#dpAgain');if(again)again.onclick=()=>{game=X().create('domino','party',{seats:game.seats});game.wifi=true;publish();scheduleBot()};
  const ex=$('#dpExit');if(ex)ex.onclick=()=>{close();env.exit()};
 }
 window.SudomiDominoParty={open,close};
})();
