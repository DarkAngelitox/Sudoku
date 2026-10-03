/* SUDOMI 0.2.49 — Phase 17, version 2: Multijugador con amigos (online) y Duelo por turnos.
 *  1. CARRERA CON AMIGOS (2–4 players): the host creates a room (code + invite link), friends join, the host picks the difficulty and starts.
 *     Everybody gets the SAME puzzle (the host sends the puzzle and its solution) and plays it on the normal board; progress bars of all players
 *     are shown live. Ranking time = game seconds + 20 s per error; the race closes when everybody has finished (or 150 s after the first one).
 *     No hints. +30 XP for finishing, +60 more for winning.
 *  2. DUELO POR TURNOS (2 players, against a friend online or against a bot): one shared board; players alternate; every move has a time limit
 *     (15/30/60 s). A correct number scores +1 (+3 for each row/column/box it completes), a wrong one −1; a timeout just passes the turn.
 *     When the board is full the higher score wins.
 * Online play is HOST-AUTHORITATIVE and uses js/party-net.js (the same star-shaped rooms as DOS/STOP): guests only send their intentions
 * (progress, finished, a move) and the host answers with the shared state. The duel's solution never leaves the host.
 * Invitation links: ?game=srace&room=CODE / ?game=sduel&room=CODE. Nothing here changes the sudoku rules; js/app.js only exposes generatePuzzle. */
(()=>{
 const C=window.SudomiCore,P=window.SudomiParty;if(!C||!P)return;
 const ui=C.ui,$=s=>document.querySelector(s);
 const DIFFS=['easy','medium','hard','expert','master','extreme'],DN={easy:'Fácil',medium:'Medio',hard:'Difícil',expert:'Experto',master:'Maestro',extreme:'Extremo'};
 const MODES={srace:{title:'Carrera con amigos',icon:'🏁',max:4},sduel:{title:'Duelo por turnos',icon:'⏱️',max:2}};
 const BOTS={palomo:{name:'El Palomo',icon:'🐦',err:.35,think:[2200,4200]},yaritza:{name:'Yaritza',icon:'👩‍🦱',err:.15,think:[1500,3200]},tigre:{name:'El Tigre',icon:'🐯',err:.04,think:[800,1800]}};
 const PENALTY=20,GRACE=150;
 const esc=t=>String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const clock=s=>{s=Math.max(0,Math.round(s));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`};
 const prof=()=>window.SudomiProfile;
 const myName=()=>(prof()&&prof().name())||'Jugador';
 const myIcon=()=>(prof()&&prof().avatar())||'🙂';
 const cleanName=n=>String(n||'Jugador').replace(/\s+/g,' ').trim().slice(0,14)||'Jugador';
 const cleanIcon=a=>(prof()&&prof().validAvatar(a))?a:'👤';
 const snd=n=>{if(window.SudomiSound)SudomiSound.play(n)};
 let M=null;            // the whole multiplayer session: {mode, role, net, players, opts, phase, status, run, duel, bot}
 const rdStat=()=>{try{return {played:0,wins:0,big:0,...(JSON.parse(localStorage.getItem('sudomi-race'))||{})}}catch(_){return {played:0,wins:0,big:0}}};
 function raceStat(won,big){const s=rdStat();s.played++;if(won)s.wins++;if(won&&big)s.big++;try{localStorage.setItem('sudomi-race',JSON.stringify(s))}catch(_){}if(window.SudomiAch)setTimeout(()=>SudomiAch.check(),50)}

 /* ====================== the screen shell ====================== */
 function shell(){
  let s=$('#multiScreen');
  if(!s){s=document.createElement('section');s.id='multiScreen';s.className='race-screen multi-screen hidden';s.setAttribute('aria-label','Multijugador');document.body.appendChild(s)}
  return s;
 }
 function show(){const s=shell();$('#homeScreen').classList.add('hidden');const rs=$('#raceScreen');if(rs)rs.classList.add('hidden');s.classList.remove('hidden');window.scrollTo(0,0)}
 function hide(){const s=$('#multiScreen');if(s)s.classList.add('hidden')}
 function backHome(){hide();const d=$('#duelScreen');if(d)d.classList.add('hidden');if($('#gameScreen').classList.contains('hidden'))$('#homeScreen').classList.remove('hidden')}
 function leave(toSetup){
  try{if(M&&M.net)M.net.close()}catch(_){}
  if(M){clearInterval(M.t1);clearInterval(M.t2);clearTimeout(M.tb)}
  const had=M;M=null;stopHud();hide();const d=$('#duelScreen');if(d)d.classList.add('hidden');const r=$('#multiResult');if(r)r.remove();
  document.body.classList.remove('racing');
  if(toSetup&&window.SudomiRace){ui.openHome();SudomiRace.open()}else if($('#gameScreen').classList.contains('hidden'))$('#homeScreen').classList.remove('hidden');
  return had;
 }
 const publicPlayers=()=>M.players.map(p=>({id:p.id,name:p.name,avatar:p.avatar,host:!!p.host,away:!!p.away}));
 const broadcast=d=>{if(M&&M.role==='host'&&M.net)M.players.forEach(p=>{if(!p.host&&!p.bot)M.net.send(p.id,d)})};
 const sendHost=d=>{if(M&&M.role==='guest'&&M.net)M.net.send(d)};
 const me=()=>M.players.find(p=>p.me)||null;

 /* ====================== entry / lobby ====================== */
 function open(mode,opts){
  const p=prof();
  if(p&&!p.get()){p.ensure(()=>open(mode,opts));return}
  if(M)leave(false);
  M={mode,role:null,net:null,players:[],opts:{diff:'easy',secs:30},phase:'entry',status:'',run:null,duel:null,bot:null,code:''};
  if(opts&&opts.code)return joinRoom(opts.code);
  drawEntry();show();
 }
 function drawEntry(code=''){
  const m=MODES[M.mode],s=shell();
  s.innerHTML=`<div class="rs-shell"><header class="rs-head"><button type="button" class="games-back" id="mBack">‹ <span>Atrás</span></button><div><p>MULTIJUGADOR</p><h1>${m.icon} ${m.title}</h1></div></header>
  <p class="rs-intro">${M.mode==='srace'?'Crea una sala y pasa el código o el enlace a tus amigos (de 2 a 4 jugadores). Todos juegan el mismo sudoku y gana quien lo termine primero. Sin pistas.':'Dos jugadores, un solo tablero. Se turnan para poner un número; cada jugada tiene tiempo límite. Acierto +1, fallo −1.'}</p>
  ${M.status?`<p class="m-status">${esc(M.status)}</p>`:''}
  <div class="m-cards">
   <button type="button" class="m-card" id="mCreate"><span>👥</span><div><b>Crear sala</b><small>Tú eres el anfitrión: eliges la dificultad y empiezas.</small></div></button>
   ${M.mode==='sduel'?`<div class="m-card static"><span>🤖</span><div><b>Contra un bot</b><small>Practica sin conexión.</small><div class="m-bots">${Object.entries(BOTS).map(([k,b])=>`<button type="button" data-bot="${k}">${b.icon} ${b.name}</button>`).join('')}</div></div></div>`:''}
   <div class="m-card static"><span>🔑</span><div><b>Unirme con un código</b><small>El código tiene 8 letras o números.</small><div class="m-join"><input id="mCode" maxlength="9" autocapitalize="characters" autocomplete="off" placeholder="ABCD-1234" value="${esc(code)}"><button type="button" id="mJoin">Unirme</button></div></div></div>
  </div></div>`;
  $('#mBack').onclick=()=>leave(true);
  $('#mCreate').onclick=hostCreate;
  const j=()=>{const c=P.normCode($('#mCode').value);if(c.length<6){M.status='Escribe el código completo.';drawEntry(c);return}joinRoom(c)};
  $('#mJoin').onclick=j;
  s.querySelectorAll('[data-bot]').forEach(b=>b.onclick=()=>startDuelBot(b.dataset.bot));
 }
 async function hostCreate(){
  M.role='host';M.status='Creando la sala…';drawEntry();
  try{
   M.net=await P.host(M.mode,onHostEvent);M.code=M.net.code;
   M.players=[{id:'host',name:cleanName(myName()),avatar:cleanIcon(myIcon()),host:true,me:true}];M.phase='lobby';M.status='';drawLobby();
  }catch(err){M.role=null;M.status=(err&&err.message)||'No se pudo crear la sala.';drawEntry()}
 }
 function joinRoom(code){
  M.role='guest';M.code=code;M.status='Conectando con la sala…';M.phase='joining';
  const s=shell();s.innerHTML=`<div class="rs-shell"><header class="rs-head"><button type="button" class="games-back" id="mBack">‹ <span>Atrás</span></button><div><p>MULTIJUGADOR</p><h1>${MODES[M.mode].icon} ${MODES[M.mode].title}</h1></div></header><p class="m-status big">Conectando con la sala ${esc(P.pretty(code))}…</p></div>`;show();
  $('#mBack').onclick=()=>leave(true);
  M.net=P.join(M.mode,code,{name:cleanName(myName()),avatar:cleanIcon(myIcon())},onGuestEvent);
 }
 function inviteUrl(){const base=location.origin&&location.origin!=='null'?location.origin+location.pathname:location.href.split(/[?#]/)[0];return `${base}?game=${M.mode}&room=${M.code}`}
 function share(){
  const url=inviteUrl();
  if(navigator.share)navigator.share({title:'SUDOMI',text:`Juega conmigo ${M.mode==='srace'?'una carrera de sudoku':'un duelo de sudoku'} en SUDOMI`,url}).catch(()=>{});
  else if(navigator.clipboard)navigator.clipboard.writeText(url).then(()=>{M.status='Enlace copiado. Pégalo en tu chat.';drawLobby()}).catch(()=>{M.status=url;drawLobby()});
  else{M.status=url;drawLobby()}
 }
 function drawLobby(){
  if(!M||M.phase!=='lobby')return;
  const m=MODES[M.mode],host=M.role==='host',s=shell(),n=M.players.length,can=host&&n>=2;
  s.innerHTML=`<div class="rs-shell"><header class="rs-head"><button type="button" class="games-back" id="mBack">‹ <span>Salir</span></button><div><p>${host?'SALA CREADA':'EN LA SALA'}</p><h1>${m.icon} ${m.title}</h1></div></header>
  ${host?`<div class="m-code"><small>CÓDIGO DE LA SALA</small><b>${esc(P.pretty(M.code))}</b><div><button type="button" id="mShare">📤 Compartir enlace</button></div></div>`:`<div class="m-code"><small>SALA</small><b>${esc(P.pretty(M.code))}</b></div>`}
  ${M.status?`<p class="m-status">${esc(M.status)}</p>`:''}
  <h2 class="rs-h">Jugadores <small>${n} de ${m.max}</small></h2>
  <div class="m-players">${M.players.map(p=>`<div class="m-pl ${p.me?'me':''}"><span>${esc(p.avatar)}</span><b>${esc(p.name)}${p.me?' (tú)':''}</b>${p.host?'<em>Anfitrión</em>':''}${p.away?'<em class="away">Sin conexión</em>':''}</div>`).join('')}${n<m.max?`<div class="m-pl empty"><span>⏳</span><b>Esperando jugadores…</b></div>`:''}</div>
  <h2 class="rs-h">Dificultad</h2>
  ${host?`<div class="race-diffs">${DIFFS.map(k=>`<button type="button" data-d="${k}" class="${k===M.opts.diff?'on':''}">${DN[k]}</button>`).join('')}</div>`:`<p class="rs-intro"><b>${DN[M.opts.diff]||'—'}</b>${M.mode==='sduel'?` · ${M.opts.secs} s por jugada`:''} (la elige el anfitrión)</p>`}
  ${host&&M.mode==='sduel'?`<h2 class="rs-h">Tiempo por jugada</h2><div class="race-diffs">${[15,30,60].map(k=>`<button type="button" data-s="${k}" class="${k===M.opts.secs?'on':''}">${k} s</button>`).join('')}</div>`:''}
  ${host?`<button class="rs-go" id="mStart" ${can?'':'disabled'}><span>${m.icon}</span><div><strong>${can?'¡Empezar!':'Espera a tus amigos'}</strong><small>${can?`${DN[M.opts.diff]} · ${n} jugadores`:'Se necesitan al menos 2 jugadores'}</small></div><i>›</i></button>`:`<p class="m-status big">⏳ Esperando a que el anfitrión empiece…</p>`}</div>`;
  $('#mBack').onclick=()=>leave(true);
  const sh=$('#mShare');if(sh)sh.onclick=share;
  s.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{M.opts.diff=b.dataset.d;lobbySync();drawLobby()});
  s.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{M.opts.secs=+b.dataset.s;lobbySync();drawLobby()});
  const st=$('#mStart');if(st)st.onclick=()=>{if(can)M.mode==='srace'?startRace():startDuel()};
 }
 const sendLobby=p=>{if(M.net&&!p.host&&!p.bot)M.net.send(p.id,{t:'lobby',players:publicPlayers(),opts:M.opts,you:p.id})};
 const lobbySync=()=>{if(M&&M.role==='host')M.players.forEach(sendLobby)};

 /* ====================== network events ====================== */
 function onHostEvent(e){
  if(!M||M.role!=='host')return;
  if(e.type==='join'){
   const old=M.players.find(p=>p.id===e.id);
   if(old){old.away=false;if(M.phase==='lobby'){lobbySync();drawLobby()}else resend(e.id);return}
   if(M.phase!=='lobby'){M.net.reject(e.id,'La partida ya empezó.');return}
   if(M.players.length>=MODES[M.mode].max){M.net.reject(e.id,'La sala está llena.');return}
   const meta=e.meta||{};M.players.push({id:e.id,name:cleanName(meta.name),avatar:cleanIcon(meta.avatar)});snd('hint');
   lobbySync();drawLobby();
  }else if(e.type==='leave'){
   const p=M.players.find(x=>x.id===e.id);if(!p)return;
   if(M.phase==='lobby'){M.players=M.players.filter(x=>x!==p);lobbySync();drawLobby()}
   else{p.away=true;if(M.mode==='srace'){checkRaceEnd()}}
  }else if(e.type==='msg'){
   const d=e.data||{},p=M.players.find(x=>x.id===e.id);if(!p)return;
   if(d.t==='prog'&&M.run){M.run.prog[p.id]={pct:Math.max(0,Math.min(100,+d.pct||0)),err:+d.err||0}}
   else if(d.t==='fin'&&M.run){recordFin(p.id,+d.eff||0)}
   else if(d.t==='dnf'&&M.run){M.run.dnf[p.id]=true;checkRaceEnd()}
   else if(d.t==='move'&&M.duel){duelAct(M.players.indexOf(p),+d.i,+d.d)}
  }
 }
 function onGuestEvent(e){
  if(!M||M.role!=='guest')return;
  if(e.type==='open'){M.phase=M.phase==='joining'?'lobby':M.phase;if(M.phase==='lobby'){M.status='';drawLobby()}}
  else if(e.type==='away'){M.status='Se perdió la conexión. Reconectando…';if(M.phase==='lobby')drawLobby()}
  else if(e.type==='back'){M.status='';if(M.phase==='lobby')drawLobby()}
  else if(e.type==='closed'){const msg=e.message||'La sala se cerró.';const had=M;leave(false);alertBox(msg)}
  else if(e.type==='msg'){
   const d=e.data||{};
   if(d.t==='lobby'){if(d.you)M.myId=d.you;M.players=(d.players||[]).map(p=>({...p,me:p.id===M.myId}));M.opts={...M.opts,...(d.opts||{})};if(M.phase==='lobby')drawLobby()}
   else if(d.t==='start')guestRaceStart(d);
   else if(d.t==='roster'){M.roster=d.list||[];hudDraw()}
   else if(d.t==='result')showResult(d.list||[]);
   else if(d.t==='dstate')guestDuelState(d.s);
  }
 }
 function alertBox(msg){
  const m=$('#modal');m.innerHTML=`<div class="modal-card"><h2>Multijugador</h2><p>${esc(msg)}</p><div class="modal-actions"><button class="primary-action" id="mOk">Entendido</button></div></div>`;m.classList.remove('hidden');$('#mOk').onclick=C.hideModal;
 }
 function resend(id){
  if(M.mode==='srace'&&M.run){M.net.send(id,{t:'start',diff:M.run.diff,puzzle:M.run.puzzle,solution:M.run.solution})}
  else if(M.mode==='sduel'&&M.duel){M.net.send(id,{t:'dstate',s:duelPub()})}
 }

 /* ====================== RACE ====================== */
 function startRace(){
  const g=ui.game,diff=M.opts.diff;g.newGame(diff);
  beginRun(diff,g.puzzle.slice(),g.solution.slice());
  broadcast({t:'start',diff,puzzle:M.run.puzzle,solution:M.run.solution});
 }
 function guestRaceStart(d){
  const g=ui.game,sig=(d.puzzle||[]).join('');
  if(M.run&&M.run.sig===sig)return;                         // reconnect: keep playing the same board
  g.startGiven(d.diff,d.puzzle,d.solution,null);
  M.me=null;beginRun(d.diff,d.puzzle,d.solution);
 }
 function beginRun(diff,puzzle,solution){
  M.phase='play';M.run={diff,puzzle,solution,sig:puzzle.join(''),empties:puzzle.filter(v=>!v).length,prog:{},fin:{},dnf:{},firstFin:0,ended:false,myFin:null};
  M.roster=null;hide();{const r=$('#multiResult');if(r)r.remove()}ui.openGame();document.body.classList.add('racing');hudDraw();snd('bonus');
  clearInterval(M.t1);M.t1=setInterval(raceTick,1500);
 }
 function myProgress(){
  const g=ui.game,done=g.board.filter((v,i)=>!g.puzzle[i]&&v===g.solution[i]).length;
  return {pct:Math.min(100,Math.round(done/Math.max(1,M.run.empties)*100)),err:g.errors};
 }
 function raceTick(){
  if(!M||M.mode!=='srace'||!M.run||M.run.ended){return}
  const g=ui.game;if(!g||g.puzzle.join('')!==M.run.sig){leave(false);return}      // the player started another game: out of the race
  const pr=myProgress();
  if(M.role==='host'){
   M.run.prog.host=pr;
   if(M.run.firstFin&&Date.now()-M.run.firstFin>GRACE*1000)finalizeRace();
   broadcast({t:'roster',list:rosterList()});M.roster=rosterList();
  }else sendHost({t:'prog',pct:pr.pct,err:pr.err});
  hudDraw();
 }
 function rosterList(){
  return M.players.map(p=>({id:p.id,name:p.name,avatar:p.avatar,pct:(M.run.prog[p.id]||{pct:0}).pct,eff:M.run.fin[p.id]!=null?M.run.fin[p.id]:null,dnf:!!M.run.dnf[p.id],away:!!p.away,me:p.id==='host'}));
 }
 function hudDraw(){
  if(!M||M.mode!=='srace'||!M.run)return;
  let h=$('#raceBar');
  if(!h){h=document.createElement('div');h.id='raceBar';h.className='race-bar';const a=$('#scoreBar')||$('.statsbar');a.parentNode.insertBefore(h,a.nextSibling)}
  const list=M.role==='host'?rosterList():(M.roster||M.players.map(p=>({name:p.name,avatar:p.avatar,pct:0,eff:null,dnf:false,away:!!p.away,me:p.me}))),pr=myProgress();
  const meIdx=M.role==='host'?list.findIndex(x=>x.id==='host'):list.findIndex(x=>x.id===M.myId);
  h.innerHTML=`<div class="rb-top"><b>🏁 Carrera con amigos · ${DN[M.run.diff]}</b><button type="button" id="raceQuit">Abandonar</button></div>${list.map((x,i)=>{const mine=i===meIdx,pct=mine?pr.pct:x.pct;return `<div class="rb-row ${mine?'me':''} ${x.eff!=null?'fin':''}"><span class="rb-ic">${esc(x.avatar)}</span><b>${esc(x.name)}</b><span class="rb-track"><i style="width:${x.eff!=null?100:pct}%"></i></span><em>${x.eff!=null?'🏁':x.dnf?'✖':x.away?'📴':pct+'%'}</em></div>`}).join('')}`;
  $('#raceQuit').onclick=()=>{leave(false);ui.render()};
 }
 function stopHud(){const h=$('#raceBar');if(h&&M===null)h.remove()}
 function recordFin(id,eff){
  if(!M.run||M.run.fin[id]!=null)return;M.run.fin[id]=eff;if(!M.run.firstFin)M.run.firstFin=Date.now();
  if(id!=='host'){const p=M.players.find(x=>x.id===id);if(p)snd('hint')}
  checkRaceEnd();
 }
 function checkRaceEnd(){
  if(!M||M.role!=='host'||!M.run||M.run.ended)return;
  const waiting=M.players.filter(p=>!p.away&&M.run.fin[p.id]==null&&!M.run.dnf[p.id]);
  if(!waiting.length)finalizeRace();
 }
 function finalizeRace(){
  if(!M||!M.run||M.run.ended)return;M.run.ended=true;
  const list=M.players.map(p=>({id:p.id,name:p.name,avatar:p.avatar,eff:M.run.fin[p.id]!=null?M.run.fin[p.id]:null})).sort((a,b)=>(a.eff==null)-(b.eff==null)||a.eff-b.eff);
  broadcast({t:'result',list});showResult(list);
 }
 function showResult(list){
  if(!M||!M.run||M.run.ended&&M.run.shown)return;M.run.ended=true;M.run.shown=true;clearInterval(M.t1);
  const myId=M.role==='host'?'host':M.myId,myIdx=list.findIndex(x=>x.id===myId);
  const finished=list.filter(x=>x.eff!=null),won=myIdx===0&&list[0].eff!=null,iFin=myIdx>=0&&list[myIdx].eff!=null;
  if(iFin){const xp=30+(won?60:0);if(window.SudomiXP)SudomiXP.award(xp);raceStat(won,list.length>=4)}
  else raceStat(false,false);
  snd(won?'win':iFin?'bonus':'lose');
  const old=$('#multiResult');if(old)old.remove();
  const r=document.createElement('div');r.id='multiResult';r.className='multi-result';
  r.innerHTML=`<div class="mr-card"><h2>${won?'🏆 ¡Ganaste la carrera!':iFin?`🏁 Puesto ${myIdx+1} de ${list.length}`:'🏁 Carrera terminada'}</h2><table>${list.map((x,i)=>`<tr class="${i===myIdx?'me':''}"><td>${x.eff!=null?i+1+'.':'—'}</td><td>${esc(x.avatar)} ${esc(x.name)}</td><td>${x.eff!=null?clock(x.eff):'No terminó'}</td></tr>`).join('')}</table><p>${iFin?`+${30+(won?60:0)} XP`:'Sin XP por no terminar'}</p><div class="mr-act">${M.role==='host'?'<button type="button" id="mrAgain">🔁 Revancha</button>':'<small>Esperando al anfitrión…</small>'}<button type="button" id="mrExit">Salir</button></div></div>`;
  document.body.appendChild(r);
  $('#mrExit').onclick=()=>{leave(false);ui.openHome()};
  const a=$('#mrAgain');if(a)a.onclick=()=>{r.remove();M.run=null;startRace()};
 }
 window.addEventListener('sudomi-win',e=>{
  if(!M||M.mode!=='srace'||!M.run||M.run.ended)return;const g=ui.game;if(g.puzzle.join('')!==M.run.sig)return;
  const d=e.detail||{},eff=(d.seconds||g.seconds)+PENALTY*(d.errors||0);M.run.myFin=eff;
  if(M.role==='host')recordFin('host',eff);else sendHost({t:'fin',eff});
 });
 const origLose=ui.lose.bind(ui);
 ui.lose=function(g){
  if(M&&M.mode==='srace'&&M.run&&!M.run.ended&&g.puzzle.join('')===M.run.sig){if(M.role==='host'){M.run.dnf.host=true;checkRaceEnd()}else sendHost({t:'dnf'})}
  return origLose(g);
 };
 document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('#hintBtn');if(!b||!M||M.mode!=='srace'||!M.run||M.run.ended)return;
  e.preventDefault();e.stopImmediatePropagation();const old=b.textContent;b.textContent='Sin pistas en la carrera';setTimeout(()=>{b.textContent=old},1400);
 },true);

 /* ====================== DUEL ====================== */
 const unitsOf=i=>{const r=Math.floor(i/9),c=i%9,b=Math.floor(r/3)*3+Math.floor(c/3);return [[...Array(9).keys()].map(x=>r*9+x),[...Array(9).keys()].map(x=>x*9+c),[...Array(9).keys()].map(x=>(Math.floor(b/3)*3+Math.floor(x/3))*9+(b%3)*3+x%3)]};
 function duelInit(diff,secs,names,icons,botIdx){
  const {puzzle,solution}=C.generatePuzzle(diff);
  M.duel={puzzle:[...puzzle],solution:[...solution],board:[...puzzle],owner:Array(81).fill(-1),turn:0,scores:[0,0],secs,left:secs,over:false,winner:-1,names,icons,botIdx:botIdx==null?-1:botIdx,last:null,diff,seq:0};
 }
 const duelPub=()=>{const d=M.duel;return {puzzle:d.puzzle,board:d.board,owner:d.owner,turn:d.turn,scores:d.scores,secs:d.secs,left:d.left,over:d.over,winner:d.winner,names:d.names,icons:d.icons,last:d.last,diff:d.diff,seq:d.seq}};
 function startDuel(){
  const h=M.players[0],g=M.players[1];
  duelInit(M.opts.diff,M.opts.secs,[h.name,g.name],[h.avatar,g.avatar],null);
  M.phase='play';sel=-1;hide();{const r=$('#multiResult');if(r)r.remove()}duelUI();duelBroadcast();clearInterval(M.t1);M.t1=setInterval(duelTick,1000);snd('bonus');
 }
 function startDuelBot(botKey){
  const b=BOTS[botKey];M.role='host';M.net=null;M.bot={key:botKey,...b};
  M.players=[{id:'host',name:cleanName(myName()),avatar:cleanIcon(myIcon()),host:true,me:true},{id:'bot',name:b.name,avatar:b.icon,bot:true}];
  duelInit(M.opts.diff,M.opts.secs,[M.players[0].name,b.name],[M.players[0].avatar,b.icon],1);
  M.phase='play';sel=-1;hide();{const r=$('#multiResult');if(r)r.remove()}duelUI();clearInterval(M.t1);M.t1=setInterval(duelTick,1000);snd('bonus');
 }
 function duelBroadcast(){if(M&&M.role==='host'&&M.net)broadcast({t:'dstate',s:duelPub()});duelUI();botMaybe()}
 function duelAct(p,i,d){
  const D=M.duel;if(!D||D.over||p!==D.turn||!(i>=0&&i<81)||!(d>=1&&d<=9)||D.board[i])return;
  const ok=D.solution[i]===d;D.last={p,i,d,ok,skip:false};
  if(ok){D.board[i]=d;D.owner[i]=p;let pts=1;for(const cells of unitsOf(i))if(cells.every(x=>D.board[x]===D.solution[x]))pts+=3;D.scores[p]+=pts;D.last.pts=pts}
  else{D.scores[p]=Math.max(0,D.scores[p]-1);D.last.pts=-1}
  D.seq++;nextTurn();
 }
 function nextTurn(){
  const D=M.duel;
  if(D.board.every(v=>v)){D.over=true;D.winner=D.scores[0]===D.scores[1]?-1:D.scores[0]>D.scores[1]?0:1;clearInterval(M.t1);duelEnd()}
  else{D.turn=1-D.turn;D.left=D.secs}
  duelBroadcast();
 }
 function duelTick(){
  const D=M&&M.duel;if(!D||D.over||M.role!=='host')return;
  if(D.turn!==D.botIdx||D.botIdx<0){/* a human turn: the clock runs */}
  D.left--;
  if(D.left<=0){D.last={p:D.turn,i:-1,d:0,ok:false,skip:true,pts:0};D.seq++;nextTurn();return}
  duelBroadcast();
 }
 function botMaybe(){
  const D=M&&M.duel;if(!D||D.over||D.botIdx<0||D.turn!==D.botIdx||M.tb)return;
  const b=M.bot,[a,z]=b.think,wait=a+Math.random()*(z-a);
  M.tb=setTimeout(()=>{
   M.tb=0;const D2=M&&M.duel;if(!D2||D2.over||D2.turn!==D2.botIdx)return;
   const empties=[...D2.board.keys()].filter(i=>!D2.board[i]);if(!empties.length)return;
   const i=empties[Math.floor(Math.random()*empties.length)];let d=D2.solution[i];
   if(Math.random()<b.err){const wrong=[1,2,3,4,5,6,7,8,9].filter(x=>x!==d);d=wrong[Math.floor(Math.random()*wrong.length)]}
   duelAct(D2.botIdx,i,d);
  },wait);
 }
 function guestDuelState(s){
  if(!M||M.mode!=='sduel')return;
  const first=!M.duel;if(M.shownEnd&&s.seq===0){M.shownEnd=false;const r=$('#multiResult');if(r)r.remove()}M.duel={...s};M.phase='play';
  if(first){hide();snd('bonus')}else{if(s.last&&s.seq!==M.lastSeq){snd(s.last.skip?'miss':s.last.ok?'good':'gbad')}}
  M.lastSeq=s.seq;duelUI();
  if(s.over&&!M.shownEnd){M.shownEnd=true;duelEnd()}
 }
 let sel=-1;
 function duelUI(){
  const D=M&&M.duel;if(!D)return;
  let s=$('#duelScreen');
  if(!s){s=document.createElement('section');s.id='duelScreen';s.className='race-screen duel-screen';document.body.appendChild(s)}
  s.classList.remove('hidden');$('#homeScreen').classList.add('hidden');
  const myIdx=M.role==='host'?0:1,myTurn=!D.over&&D.turn===myIdx&&!(D.botIdx>=0&&D.turn===D.botIdx);
  const selD=sel>=0?D.board[sel]:0;
  const cells=D.board.map((v,i)=>{const r=Math.floor(i/9),c=i%9,cls=['dc',D.puzzle[i]?'dgiven':v?`dp${D.owner[i]}`:'',(c===2||c===5)?'dbr':'',(r===2||r===5)?'dbb':'',i===sel?'dsel':'',v&&v===selD?'dsame':'',(D.last&&D.last.i===i&&D.last.ok===false&&D.seq>0&&!D.last.skip)?'dbad':'',(D.last&&D.last.i===i&&D.last.ok)?'dnew':''].join(' ');return `<button type="button" class="${cls}" data-i="${i}">${v||''}</button>`}).join('');
  const pc=i=>`<div class="du-pl ${D.turn===i&&!D.over?'turn':''} ${i===myIdx?'me':''}"><span>${esc(D.icons[i])}</span><b>${esc(D.names[i])}</b><em>${D.scores[i]}</em></div>`;
  const pct=Math.max(0,Math.round(D.left/D.secs*100));
  const msg=D.over?(D.winner<0?'¡Empate!':`🏆 ¡Gana ${esc(D.names[D.winner])}!`):myTurn?'Es tu turno: toca una casilla y un número':`Turno de ${esc(D.names[D.turn])}…`;
  s.innerHTML=`<div class="rs-shell duel-shell"><header class="rs-head"><button type="button" class="games-back" id="duQuit">‹ <span>Salir</span></button><div><p>${DN[D.diff]} · ${D.secs} s por jugada</p><h1>⏱️ Duelo por turnos</h1></div></header>
  <div class="du-score">${pc(0)}<i>VS</i>${pc(1)}</div>
  <div class="du-timer ${D.left<=5&&!D.over?'low':''}"><i style="width:${D.over?0:pct}%"></i><b>${D.over?'—':D.left+' s'}</b></div>
  <p class="du-msg ${myTurn?'mine':''}">${msg}</p>
  <div class="dg ${myTurn?'':'wait'}">${cells}</div>
  <div class="dk">${[1,2,3,4,5,6,7,8,9].map(n=>`<button type="button" data-n="${n}" ${myTurn&&sel>=0&&!D.board[sel]?'':'disabled'}>${n}</button>`).join('')}</div></div>`;
  $('#duQuit').onclick=()=>{leave(true)};
  s.querySelectorAll('.dg .dc').forEach(b=>b.onclick=()=>{const i=+b.dataset.i;sel=i;duelUI()});
  s.querySelectorAll('.dk button').forEach(b=>b.onclick=()=>{
   if(!myTurn||sel<0||D.board[sel])return;const i=sel,d=+b.dataset.n;
   if(M.role==='host'){const before=D.seq;duelAct(0,i,d);const L=M.duel.last;if(L&&M.duel.seq>before)snd(L.ok?(L.pts>1?'bonus':'good'):'gbad')}
   else{sendHost({t:'move',i,d})}
   sel=-1;
  });
  if(M.role==='host'&&D.seq!==M.hostSeen){M.hostSeen=D.seq;const L=D.last;if(L&&L.p!==0)snd(L.skip?'miss':L.ok?'good':'gbad')}
 }
 function duelEnd(){
  const D=M.duel,myIdx=M.role==='host'?0:1,won=D.winner===myIdx;
  snd(D.winner<0?'draw':won?'win':'lose');
  if(window.SudomiXP&&(won||D.winner<0))SudomiXP.award(won?60:30);
  const old=$('#multiResult');if(old)old.remove();
  const r=document.createElement('div');r.id='multiResult';r.className='multi-result';
  r.innerHTML=`<div class="mr-card"><h2>${D.winner<0?'🤝 ¡Empate!':won?'🏆 ¡Ganaste el duelo!':`${esc(D.icons[D.winner])} ¡Ganó ${esc(D.names[D.winner])}!`}</h2><table><tr><td>${esc(D.icons[0])} ${esc(D.names[0])}</td><td>${D.scores[0]} pts</td></tr><tr><td>${esc(D.icons[1])} ${esc(D.names[1])}</td><td>${D.scores[1]} pts</td></tr></table><p>${won?'+60 XP':D.winner<0?'+30 XP':'Mejor suerte en la revancha'}</p><div class="mr-act">${M.role==='host'?'<button type="button" id="mrAgain">🔁 Revancha</button>':'<small>Esperando al anfitrión…</small>'}<button type="button" id="mrExit">Salir</button></div></div>`;
  document.body.appendChild(r);
  $('#mrExit').onclick=()=>{leave(false);ui.openHome()};
  const a=$('#mrAgain');if(a)a.onclick=()=>{r.remove();M.shownEnd=false;if(M.bot){const b=M.bot;M.duel=null;startDuelBot(b.key)}else{startDuel();}};
 }

 /* ====================== invitation links ====================== */
 function checkInvite(){
  let q;try{q=new URLSearchParams(location.search)}catch(_){return}
  const mode=q.get('game'),room=P.normCode(q.get('room')||'');
  if(!MODES[mode]||!room)return;
  try{const u=new URL(location.href);['room','game'].forEach(k=>u.searchParams.delete(k));history.replaceState(null,'',u.pathname+u.search+u.hash)}catch(_){}
  setTimeout(()=>open(mode,{code:room}),600);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',checkInvite);else checkInvite();
 window.SudomiMulti={open,get session(){return M}};
})();
