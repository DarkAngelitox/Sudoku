/* SUDOMI 0.2.5 — lightweight mini-games. 0.2.13: stronger chess/checkers AI, fair shuffles, Wi-Fi reconnect + hidden-card protection. */
(()=>{
const $=s=>document.querySelector(s), hub=$('#miniGamesHub'),stage=$('#miniGameStage');
const shuffleList=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};   // Fisher–Yates: unbiased
const games=[
 ['mines','💣','Buscaminas','Encuentra las casillas seguras.'],
 ['fleet','🚢','Batalla naval','Hunde la flota rival.'],
 ['chess','♟️','Ajedrez','Un duelo clásico para dos.'],
 ['checkers','🔴','Damas','Captura las piezas contrarias.'],
 ['tictactoe','❌','Tres en raya','Vence a la computadora.'],
 ['connect4','🟡','4 en línea','Conecta cuatro fichas seguidas.'],
 ['domino','🁣','Dominó','Versión para dos jugadores.'],
 ['memory','🐾','Memoria de animales','Encuentra parejas volteando dos fichas.'],
 ['dotsboxes','▫️','Puntos y cajas','Completa cuadros para sumar puntos.'],
 ['stop','🔤','STOP','Diez categorías, de 1 a 8 jugadores, con IA y salas online.'],
 ['mahjong','🀄','Duelo Mahjong','Variante de emparejar fichas para 2 jugadores.'],
 ['blackjack','🂡','Blackjack','Cartas, estrategia y banca.'],
 ['poker','🃏','Póker','Cambia cartas y gana con la mejor mano (2 jugadores).'],
 ['escoba','🃑','Escoba','La clásica escoba con baraja española.'],
 ['rummy','🎴','Rummy','Forma combinaciones con tus cartas.'],
 ['slide','🧩','Fichas deslizantes','Desliza columnas, voltea fichas y completa tu set.'],
 ['dos','🌪','DOS','Quédate sin cartas. De 1 a 8 jugadores, con IA y salas online.'],
 ['dominopolis','🏙️','Dominópolis','Compra, construye y cobra alquiler. De 2 a 8 jugadores, con IA y salas online.']   // 0.2.20: runs on its own (js/dos-game.js), not through SudomiExtraGames
];
// 0.2.30: difficulty buttons shown above the Minesweeper modes (the choice is remembered on this device)
function mineLevelsHTML(){const best=mineBest();return `<div class="mine-levels" role="group" aria-label="Dificultad">${Object.entries(MINE_LEVELS).map(([k,L])=>`<button type="button" data-ml="${k}" class="${k===minesLevel?'on':''}"><b>${L.label}</b><small>${L.n}×${L.n} · ${L.mines} 💣${best[k]?` · ⏱ ${clockText(best[k])}`:''}</small></button>`).join('')}</div>`}
document.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('[data-ml]');if(!b)return;minesLevel=b.dataset.ml;try{localStorage.setItem('sudomi-mines-level',minesLevel)}catch(_){}document.querySelectorAll('[data-ml]').forEach(x=>x.classList.toggle('on',x===b))});
// DOS has its own screens and its own online rooms for up to 4 players.
function openDos(){if(!window.SudomiDos)return false;current=null;game=null;SudomiDos.open({hub,stage,exit:()=>{stage.classList.add('hidden');hub.classList.remove('hidden');renderHub()}});return true}
// 0.2.29: STOP for 1–8 players has its own screens too (js/stop-party.js); "legacy" opens the old two-players-on-one-phone STOP
// 0.2.58: Dominó for 1–4 people has its own room screens (js/domino-party.js); `pending` is a room code from an invitation link
function openDominoParty(pending,create){if(!window.SudomiDominoParty)return false;current=null;game=null;SudomiDominoParty.open({hub,stage,exit:()=>{stage.classList.add('hidden');hub.classList.remove('hidden');renderHub()},back:()=>{stage.classList.add('hidden');hub.classList.remove('hidden');chooseMode('domino')},toast:(t,s)=>wifiToast(t,s)},pending,create);return true}
function openDominopolis(){if(!window.SudomiDominopolis)return false;current=null;game=null;SudomiDominopolis.open({hub,stage,exit:()=>{stage.classList.add('hidden');hub.classList.remove('hidden');renderHub()}});return true}
function openStop(){if(!window.SudomiStop)return false;current=null;game=null;SudomiStop.open({hub,stage,exit:()=>{stage.classList.add('hidden');hub.classList.remove('hidden');renderHub()},legacy:()=>launch('stop','pvp')});return true}
let current=null, game=null, wifi={active:false,player:0,handler:null,names:[null,null]}, acknowledgedWin=null, localWinListener=null;
/* 0.2.25 — player profiles in two-player online games: each phone sends {name, avatar} to the other one,
 * and every "Jugador 1"/"Jugador 2" on screen is replaced by that player's name. */
const escHTML=t=>String(t).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function myProfile(){const P=window.SudomiProfile;return P&&P.get()?{name:P.name(),avatar:P.avatar()}:null}
function sendProfile(){const me=myProfile();wifi.names[wifi.player]=me;if(me)wifiSend('profile',me)}
function takeProfile(p){if(!p||typeof p.name!=='string')return;const name=p.name.replace(/\s+/g,' ').trim().slice(0,14);if(!name)return;const P=window.SudomiProfile;wifi.names[1-wifi.player]={name,avatar:P&&P.validAvatar(p.avatar)?p.avatar:'👤'}}
/* 0.2.63 — names. The computer players get a person's name (the owner's list, one drawn per game); in "Multijugador local" (one device) player 1 is
 * the profile and the second person is "Invitado". Everything is done on the text the screen is about to show, like the online names. */
const AI_NAMES=[['Pavel','🦉'],['Esteban','🐯'],['Madeline','🦄'],['Cristal','🐼'],['Edwin','🐸'],['Harly','🦊'],['Gian Carlos','🐵'],['Jean Luis','🐙'],['Luis Miguel','🦁'],['Carmelis','🐰'],['Maicol','🐧']];
function randomAi(n=1){const pool=AI_NAMES.slice(),out=[];for(let i=0;i<n&&pool.length;i++)out.push(pool.splice(Math.floor(Math.random()*pool.length),1)[0]);return out}
let aiPick=randomAi(3);
const aiName=()=>aiPick[0][0];
window.SudomiAI={names:AI_NAMES,random:randomAi};
// against the computer: "Jugador 1" is you (profile name), "Jugador 2" / "CPU" / "la computadora" is the computer player's name
function pveNames(html){const me=myProfile(),nm=me?me.name.replace(/[<>&"']/g,''):null,ai=aiName();
 html=html.replace(/del Jugador 2(?!\d)/g,'de '+ai).replace(/al Jugador 2(?!\d)/g,'a '+ai).replace(/Jugador 2(?!\d)/g,ai)
  .replace(/La computadora está pensando/g,ai+' está pensando').replace(/\bCPU\b/g,ai).replace(/Computadora/g,ai).replace(/la computadora/gi,ai).replace(/computadora/g,ai);
 if(nm)html=html.replace(/del Jugador 1(?!\d)/g,'de '+nm).replace(/al Jugador 1(?!\d)/g,'a '+nm).replace(/Jugador 1(?!\d)/g,nm);
 return html}
// one device: player 1 = the profile, the others are guests ("Invitado", "Invitado 2", "Invitado 3")
function localNames(html){const me=myProfile(),nm=me?me.name.replace(/[<>&"']/g,''):null;
 if(nm)html=html.replace(/del Jugador 1(?!\d)/g,'de '+nm).replace(/al Jugador 1(?!\d)/g,'a '+nm);
 return html.replace(/Jugador ([1-4])(?!\d)/g,(m,k)=>k==='1'?(nm||m):k==='2'?'Invitado':'Invitado '+(k-1))}
function withNames(html){if(!wifi.active){if(!game)return html;if(game.mode==='pve'&&current!=='domino')return pveNames(html);if(game.mode==='pvp')return localNames(html);return html}return html.replace(/Jugador ([12])(?!\d)/g,(m,k)=>{const p=wifi.names[k-1];return p?escHTML(p.name):m})}
function vsBar(){if(!wifi.active)return '';const tag=i=>{const p=wifi.names[i];return `<span class="${i===wifi.player?'me':''}">${p?`${p.avatar} ${escHTML(p.name)}`:`Jugador ${i+1}`}${i===wifi.player?' <small>(tú)</small>':''}</span>`};return `<div class="vs-bar">${tag(0)}<i>VS</i>${tag(1)}</div>`}
window.addEventListener('sudomi-profile',()=>{if(wifi.active){sendProfile();if(game)render()}});
// online play asks for a profile first; then it goes on by itself
function profileFirst(button){const P=window.SudomiProfile;if(P&&!P.get()){P.ensure(()=>{const b=document.getElementById(button);if(b)b.click()});return true}return false}
const matchRecords={tictactoe:{pve:{scores:[0,0],starter:0},pvp:{scores:[0,0],starter:0}},connect4:{pve:{scores:[0,0]},pvp:{scores:[0,0]}}};
function init(){
 $('#openMiniGames').onclick=()=>{let m=$('#homeDropdown');m.classList.add('hidden');$('#homeMenuBtn').setAttribute('aria-expanded','false');open()};
 $('#gamesBackHome').onclick=back;
 setInterval(()=>{if(current==='mines'&&game?.mode==='clock'&&game.clockStarted&&!game.over){game.seconds++;let value=clockText(game.seconds);let timer=$('#mineClock'),badge=document.querySelector('.turn-indicator');if(timer)timer.textContent=value;if(badge)badge.textContent=`⏱ ${value}`}else if(game&&games.findIndex(g=>g[0]===current)>=6)SudomiExtraGames.tick(current,game,{wifi:wifi.active,player:wifi.player,render,dispatch:dispatchExtra})},1000);
 renderHub();
 renderHomeGames();
}
// 0.2.31: game cards on the home screen (same art as the hub). Tapping one goes straight to its mode picker / own screen.
function renderHomeGames(){
 const box=$('#homeGames');if(!box)return;
 const feat=['dos','stop','mines','chess','fleet','checkers','connect4'].map(id=>games.find(g=>g[0]===id)).filter(Boolean);
 box.innerHTML=feat.map(([id,icon,name,desc])=>{const art=window.SudomiGameArt&&SudomiGameArt[id];return `<button class="game-card has-art home-game" data-hg="${id}" type="button">${art?`<div class="gc-art">${art}</div>`:''}<span>${icon}</span><strong>${name}</strong><small>${desc}</small></button>`}).join('')+(()=>{
  // 0.2.39: the "all games" card is a mosaic of the games that are NOT shown in this row
  const shown=new Set(feat.map(g=>g[0])),rest=games.filter(g=>!shown.has(g[0])&&window.SudomiGameArt&&SudomiGameArt[g[0]]);
  const tiles=rest.map(g=>`<i>${SudomiGameArt[g[0]]}</i>`).join('');
  return `<button class="game-card has-art home-game home-game-more" data-hg="" type="button"><div class="gc-art gc-mosaic">${tiles}</div><strong>Todos los juegos</strong><small>${games.length} juegos para jugar solo o con amigos</small><b>Ver todos <i>›</i></b></button>`})();
 const all=()=>open();
 $('#homeAllGames').onclick=all;
 box.querySelectorAll('[data-hg]').forEach(b=>b.onclick=()=>{const id=b.dataset.hg;if(!id)return all();open();chooseMode(id)});
}
function open(){ $('#homeScreen').classList.add('hidden');$('#gameScreen').classList.add('hidden');$('#miniGamesScreen').classList.remove('hidden');stage.classList.add('hidden');hub.classList.remove('hidden');renderHub() }
// 0.2.76: cuando el otro se desconecta (o sale por error), barra con «Invitar de nuevo» / «Compartir enlace» para que vuelva a la misma partida
function awayBarHook(on){
 if(!window.SudomiFriends||!SudomiFriends.awayBar)return;
 const s=window.SudomiLAN&&SudomiLAN.session;
 if(!on||!s||SudomiLAN.kind!=='online'||!current){SudomiFriends.awayBar(null);return}
 const it=games.find(g=>g[0]===current),nm=(wifi.names[1-wifi.player]||{}).name||'Tu amigo';
 SudomiFriends.awayBar({game:current,gameName:it?it[2]:'',room:s.room,names:[nm]});
}
function leaveWifi(){try{window.SudomiFriends&&SudomiFriends.awayBar&&SudomiFriends.awayBar(null)}catch(_){}wifi.names=[null,null];if(wifi.active&&window.SudomiLAN){SudomiLAN.leave();wifi.active=false;wifi.player=0;wifi.handler=null}try{localStorage.removeItem(HOST_KEY)}catch(_){}hideWifiToast()}
function back(){if(window.SudomiDos)SudomiDos.close();if(window.SudomiStop)SudomiStop.close();leaveWifi();stage.classList.add('hidden');hub.classList.remove('hidden');$('#miniGamesScreen').classList.add('hidden');$('#homeScreen').classList.remove('hidden');current=null;game=null;renderHub()}
function toHub(){if(game?.dispose)game.dispose();leaveWifi();current=null;game=null;stage.classList.add('hidden');hub.classList.remove('hidden');renderHub()}
function renderHub(){
 const saved=window.SudomiLAN&&!SudomiLAN.session?SudomiLAN.saved:null,item=saved&&games.find(g=>g[0]===saved.session.game);
 const resume=item?`<div class="wifi-resume"><span>📶</span><div><strong>Partida ${netInfo().label} en curso</strong><small>${item[2]} · sala ${saved.session.room}</small></div><button id="resumeWifi">Reconectar</button><button id="dropWifi" aria-label="Descartar">✕</button></div>`:'';
 hub.innerHTML=`<p class="games-intro">Elige un juego y selecciona cómo quieres jugar.</p>${resume}<div class="games-grid">${[...games].sort((a,b)=>(b[0]==='dos')-(a[0]==='dos')).map(([id,icon,name,desc])=>{const art=window.SudomiGameArt&&SudomiGameArt[id];return `<button class="game-card ${art?'has-art':''}" data-game="${id}">${art?`<div class="gc-art">${art}</div>`:''}<span>${icon}</span><strong>${name}</strong><small>${desc}</small><b>Elegir modo <i>›</i></b></button>`}).join('')}</div>`;
 hub.querySelectorAll('[data-game]').forEach(b=>b.onclick=()=>{chooseMode(b.dataset.game)});
 if(item){$('#resumeWifi').onclick=()=>resumeWifi(saved);$('#dropWifi').onclick=()=>{SudomiLAN.forget();try{localStorage.removeItem(HOST_KEY)}catch(_){}renderHub()}}
}
// 0.2.58: every game offers the same two ways to play: PVE (you against the computer) and Multijugador (people; empty seats are filled by the computer)
// 0.2.72: MENÚ ÚNICO de todos los minijuegos, siempre igual:
//   🤖 Contra la máquina · 👥 En este dispositivo (si el juego lo tiene) · 🌐 Multijugador · 🔑 Unirme con un código (para quien no es amigo)
// «Multijugador» crea la sala solo. DOS, STOP y Dominópolis primero preguntan cuántos juegan (2 a 8); los demás tienen tamaño fijo y pasan directo a la sala.
const VARIABLE_GAMES=['dos','stop','dominopolis'];
const NO_LOCAL=['dos','dominopolis'];
const isLocalHost=()=>{const h=location.hostname;return h==='localhost'||h==='127.0.0.1'||h==='[::1]'||h.endsWith('.local')||/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)};
function modeButtons(id){
 const pve='<button data-mode="pve"><strong>🤖 Contra la máquina</strong><small>'+(id==='domino'?'Tú y un compañero IA contra dos rivales IA':'Juega contra la computadora')+'</small></button>';
 const local=NO_LOCAL.includes(id)?'':'<button data-mode="pvp"><strong>👥 En este dispositivo</strong><small>'+(id==='domino'?'4 personas en un solo dispositivo: se lo pasan en cada turno':'Dos personas en un solo dispositivo: se lo pasan en cada turno')+'</small></button>';
 const multi='<button data-mode="online"><strong>🌐 Multijugador</strong><small>'+(VARIABLE_GAMES.includes(id)?'Elige cuántos juegan, crea la sala e invita a tus amigos.':'Crea una sala e invita a tus amigos. Si nadie llega, juega la IA.')+'</small></button>';
 const join='<div class="mc-join"><label for="mcCode">¿Te invitaron? Escribe el código de la sala</label><div><input id="mcCode" maxlength="9" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCD-2345"><button type="button" id="mcJoin">Unirme</button></div><p id="mcMsg"></p></div>';
 return pve+local+multi+join;
}
function chooseMode(id){
 const item=games.find(g=>g[0]===id);
 const choices=id==='mines'?mineLevelsHTML()+'<button data-mode="clock"><strong>⏱ Contra el reloj</strong><small>Completa el tablero y mejora tu tiempo</small></button><button data-mode="practice"><strong>🧘 Práctica</strong><small>Juega sin cronómetro</small></button>':modeButtons(id);
 hub.innerHTML=`<button class="games-back mode-back" id="backToGames">‹ Todos los juegos</button><div class="mode-picker"><span class="mode-game-icon">${item[1]}</span><p>ELIGE TU PARTIDA</p><h2>${item[2]}</h2><div class="mode-choices">${choices}</div></div>`;
 $('#backToGames').onclick=renderHub;
 hub.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>enterMode(id,b.dataset.mode));
 const j=$('#mcJoin');if(j)j.onclick=()=>{const raw=$('#mcCode').value,msg=$('#mcMsg'),code=raw.replace(/[^A-Za-z0-9]/g,'').toUpperCase();if(code.length<6){msg.textContent='Escribe el código completo de la sala.';return}joinByCode(id,code)};
 qrOffer(id);
}
function enterMode(id,mode){
 if(mode==='clock'||mode==='practice')return launch(id,mode);
 if(mode==='pve'){
  if(id==='dos'&&openDos()){SudomiDos.solo();return}
  if(id==='stop'&&openStop()){SudomiStop.solo();return}
  if(id==='dominopolis'&&openDominopolis()){SudomiDominopolis.soloSetup();return}
  return launch(id,'pve');
 }
 if(mode==='pvp')return launch(id,'pvp');
 if(mode==='online')return multi(id);
}
function multi(id){if(VARIABLE_GAMES.includes(id))return countScreen(id);startMulti(id,id==='domino'?4:2)}
function countScreen(id){
 const item=games.find(g=>g[0]===id);
 hub.innerHTML=`<button class="games-back mode-back" id="backToModes2">‹ Modos</button><div class="mode-picker"><span class="mode-game-icon">${item[1]}</span><p>MULTIJUGADOR</p><h2>${item[2]}</h2><h3 class="mc-q">¿Cuántos van a jugar?</h3><div class="mc-count">${[2,3,4,5,6,7,8].map(n=>`<button type="button" data-n="${n}">${n}</button>`).join('')}</div><p class="mc-hint">Los espacios que no se llenen los puedes quitar; si no los quitas, juega la IA.</p></div>`;
 $('#backToModes2').onclick=()=>chooseMode(id);
 hub.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>startMulti(id,+b.dataset.n));
}
function startMulti(id,n){
 if(id==='dos'&&openDos()){SudomiDos.create(n);return}
 if(id==='stop'&&openStop()){SudomiStop.create(n);return}
 if(id==='dominopolis'&&openDominopolis()){SudomiDominopolis.create(n);return}
 if(id==='domino'){openDominoParty('',true);return}
 friendLobby(id);
}
function joinByCode(id,code){
 if(id==='dos'&&openDos()){SudomiDos.join(code);return}
 if(id==='stop'&&openStop()){SudomiStop.join(code);return}
 if(id==='dominopolis'&&openDominopolis()){SudomiDominopolis.join(code);return}
 if(id==='domino'){openDominoParty(code);return}
 useNet('online');wifiLobby(id,{code});setTimeout(()=>{const b=$('#joinWifiRoom');if(b)b.click()},120);
}
// cambia el transporte de los juegos de 2 jugadores: 'online' (internet) · 'qr' (sin internet) · 'lan' (Wi‑Fi local con la PC)
function useNet(kind){
 try{if(window.SudomiLAN&&SudomiLAN.session)SudomiLAN.leave()}catch(_){}
 if(window.SudomiQR)SudomiQR.deactivate();
 if(kind==='qr'){if(window.SudomiQR)SudomiQR.activate();return}
 const t=kind==='lan'?window.SudomiLANRelay:window.SudomiLANOnline;
 if(t)window.SudomiLAN=t;
}
function goMode(id,kind){
 try{if(window.SudomiLAN&&SudomiLAN.session)SudomiLAN.leave()}catch(_){}
 wifi.handler=null;
 if(kind==='qr'){useNet('qr');wifiLobby(id,{qr:true});return}
 if(kind==='lan'){useNet('lan');wifiLobby(id,{});return}
 useNet('online');friendLobby(id);
}
const netSwitches=(id,mode)=>({mode,qr:QR_GAMES.includes(id)&&!!window.SudomiQR&&!!window.RTCPeerConnection,lan:isLocalHost()&&!!window.SudomiLANRelay,onSwitch:k=>goMode(id,k)});
function inviteUrl(id,room){
 let net='';try{if(window.SudomiLAN&&SudomiLAN.kind==='online')net='&net=online'}catch(_){}
 const base=location.origin&&location.origin!=='null'?location.origin+location.pathname:location.href.split(/[?#]/)[0];
 return `${base}?game=${encodeURIComponent(id)}&room=${room}${net}`;
}
// sala de espera de los juegos de 2 jugadores (la misma pantalla que los demás juegos: js/lobby.js)
async function friendLobby(id){
 const item=games.find(g=>g[0]===id);
 const pr=window.SudomiProfile;if(pr&&!pr.get()){pr.ensure(()=>friendLobby(id));return}
 useNet('online');wifi.handler=null;
 hub.innerHTML=`<button class="games-back mode-back" id="backToModes">‹ Modos</button><div class="mode-picker lb-picker"><span class="mode-game-icon">${item[1]}</span><p>MULTIJUGADOR · 2 JUGADORES</p><h2>${item[2]}</h2><div id="lbRoot"></div></div>`;
 const leaveAll=()=>{try{if(window.SudomiLAN&&SudomiLAN.session)SudomiLAN.leave()}catch(_){}if(window.SudomiQR)SudomiQR.deactivate();wifi.handler=null};
 $('#backToModes').onclick=()=>{leaveAll();chooseMode(id)};
 const me=pr?{name:pr.name(),avatar:pr.avatar()}:{name:'Tú',avatar:'🦊'};
 const draw=(code,status)=>SudomiLobby.render($('#lbRoot'),{game:id,gameName:item[2],code,url:code?inviteUrl(id,code):'',host:true,fixed:true,onStart:null,
  seats:[{state:'me',name:me.name,avatar:me.avatar,sub:'Anfitrión'},{state:'open'}],
  switches:netSwitches(id,'online'),status,hint:'Cuando tu amigo entre, la partida empieza sola.',
  onAI:()=>{leaveAll();wifi.active=false;launch(id,'pve')}});
 draw(null,'');
 try{const s=await SudomiLAN.create(id);draw(s.room,'');startWifiEvents(id)}catch(e){draw(null,(e&&e.message)||'No se pudo crear la sala.')}
}
const QR_GAMES=['checkers','tictactoe','connect4','dotsboxes','memory'];
// 0.2.58: the QR option now lives INSIDE the Multijugador lobby (button '📷 Sin internet (QR)'), not as a separate mode
async function qrOffer(id){}
function qrLobby(id){SudomiQR.activate();wifiLobby(id,{qr:true})}
function launch(id,mode='pve'){current=id;if(mode==='pve')aiPick=randomAi(3);wifi.active=mode==='wifi';game=create(id,mode==='wifi'?'pvp':mode);if(wifi.active)game.wifi=true;hub.classList.add('hidden');stage.classList.remove('hidden');render();}
function wifiLobby(id,opts={}){
 if(!window.SudomiLAN){hub.innerHTML='<p>No se cargó el módulo de conexión.</p>';return}
 const item=games.find(g=>g[0]===id),N=netInfo();
 hub.innerHTML=`<button class="games-back mode-back" id="backToModes">‹ Modos</button><div id="swBar" class="lb"></div><div class="mode-picker wifi-picker"><span class="mode-game-icon">${N.icon}</span><p>${N.title}</p><h2>${item[2]} · ${N.label}</h2><div class="wifi-lobby">${N.qr?'<button class="primary-action" id="createWifiRoom">Crear partida (escanear)</button><button class="secondary-action" id="joinWifiRoom">Unirme (mostrar mi código)</button>':`<button class="primary-action" id="createWifiRoom">Crear sala</button><label for="wifiCode">O únete con el código de tu amigo</label><input id="wifiCode" maxlength="${N.online?9:6}" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" placeholder="${N.online?'ABCD-2345':'ABC123'}" value="${opts.code?prettyRoom(opts.code):''}"><button class="secondary-action" id="joinWifiRoom">Unirse</button>`}<p id="wifiStatus">${opts.code?'Entrando a la sala…':N.hint}</p>${QR_GAMES.includes(id)&&!N.qr&&window.SudomiQR&&window.RTCPeerConnection?'<button class="secondary-action" id="lobbyQR">📷 Sin internet (QR)</button>':''}<button class="secondary-action" id="lobbyAI">🤖 ¿Nadie se une? Jugar contra la IA ahora</button></div></div>`;
 const sbar=$('#swBar');if(sbar){const kd=window.SudomiLAN&&SudomiLAN.kind;sbar.innerHTML=SudomiLobby.switchesHTML(netSwitches(id,kd==='qr'?'qr':kd==='lan'?'lan':'online'));sbar.querySelectorAll('[data-sw]').forEach(c=>c.onchange=()=>goMode(id,c.checked?c.dataset.sw:'online'))}
 const lq=$('#lobbyQR');if(lq)lq.onclick=()=>qrLobby(id);
 $('#lobbyAI').onclick=()=>{if(SudomiLAN.session)SudomiLAN.leave();if(window.SudomiQR)SudomiQR.deactivate();wifi.handler=null;wifi.active=false;launch(id,'pve')};
 $('#backToModes').onclick=()=>{if(SudomiLAN.session)SudomiLAN.leave();if(window.SudomiQR)SudomiQR.deactivate();wifi.handler=null;chooseMode(id)};
 $('#createWifiRoom').onclick=async()=>{
  if(profileFirst('createWifiRoom'))return;
  const status=$('#wifiStatus');status.textContent='Creando sala…';
  try{
   const s=await SudomiLAN.create(id);
   status.innerHTML=N.qr?'Escanea el código QR de tu amigo y luego muéstrale el tuyo.<span>Esperando que se una…</span>':`Comparte este código con el otro jugador:<strong class="wifi-room-code">${prettyRoom(s.room)}</strong>${N.online?'<button class="secondary-action" id="shareInvite">📤 Enviar invitación</button>':''}<span>Esperando que se una…</span>${N.online?`<div class="fr-panel" data-game="${id}" data-name="${item[2]}" data-room="${s.room}"></div>`:''}`;
   if(N.online&&!N.qr){$('#shareInvite').onclick=()=>shareInvite(id,s.room)}
   startWifiEvents(id);
  }catch(e){status.textContent=e.message}
 };
 $('#joinWifiRoom').onclick=async()=>{
  if(profileFirst('joinWifiRoom'))return;
  const status=$('#wifiStatus'),raw=N.qr?'QRDIRECT':$('#wifiCode').value,code=N.online||N.qr?raw.replace(/[^A-Za-z0-9]/g,'').toUpperCase():raw.trim().toUpperCase(),len=N.qr?8:N.online?8:6;
  if(code.length!==len){status.textContent=`Escribe el código de ${len} caracteres.`;return}
  status.textContent=N.qr?'Sigue los pasos para emparejar los teléfonos…':'Conectando…';
  try{const s=await SudomiLAN.join(id,code);wifi.player=s.player;status.textContent='Conectado. Esperando que el creador inicie…';startWifiEvents(id)}catch(e){status.textContent=e.message}
 };
}
function startWifiEvents(id){
 if(wifi.handler)SudomiLAN.off(wifi.handler);
 wifi.handler=e=>{
  const lobby=$('#wifiStatus')||$('#lbStatus');
  if(e.type==='error'){if(lobby)lobby.textContent=e.message;else if(wifi.active)wifiToast('Sin conexión con el otro teléfono… reintentando.',true);return}
  if(e.type==='room-lost'){if(lobby)lobby.textContent=e.message||'La sala ya no existe.';else wifiToast('La sala expiró o ya no existe. Vuelve a los juegos para crear otra.',true);return}
  if(e.type==='peer-joined'&&SudomiLAN.session?.player===0){wifi.player=0;launch(id,'wifi');wifiSend('start',wifiSnapshot());sendProfile();persistWifi();return}
  if(e.type==='profile'&&wifi.active){takeProfile(e.payload);if(game)render();return}
  if(e.type==='start'&&SudomiLAN.session?.player===1){wifi.player=1;launch(id,'wifi');applyWifiSnapshot(e.payload);sendProfile();persistWifi();render();return}
  if(e.type==='state'&&!wifi.active&&lobby&&SudomiLAN.session?.player===1){wifi.player=1;launch(id,'wifi')}   // 0.2.18: joined a game that was already running (opened the invitation again): go straight in
  if(e.type==='state'&&wifi.active){hideWifiToast();applyWifiSnapshot(e.payload);persistWifi();render();return}
  if(e.type==='action'&&wifi.active&&wifi.player===0&&game&&isExtra()){SudomiExtraGames.apply(current,game,1,e.payload?.act);publishWifi();render();return}
  if(e.type==='sync-request'&&wifi.active&&game&&(!isExtra()||wifi.player===0)){wifiSend('state',wifiSnapshot());return}   // the other phone came back: send it the current board
  if(e.type==='peer-away'&&wifi.active){wifiToast('El otro jugador perdió la conexión. Esperando que vuelva…',true);awayBarHook(true);return}
  if(e.type==='peer-back'&&wifi.active){wifiToast('¡El otro jugador volvió!');awayBarHook(false);sendProfile();if(game&&(!isExtra()||wifi.player===0))wifiSend('state',wifiSnapshot());return}
  if(e.type==='peer-left'&&wifi.active){wifiToast('El otro jugador salió de la partida.',true);awayBarHook(true);return}
  if(e.type==='win-ack'&&wifi.active&&game){acknowledgedWin=game;disarmWinTap();render()}
 };
 SudomiLAN.on(wifi.handler)
}
const netInfo=()=>window.SudomiLAN&&window.SudomiLAN.kind==='qr'
 ?{online:true,qr:true,label:'Sin internet',icon:'📷',title:'MULTIJUGADOR SIN INTERNET',desc:'Dos teléfonos en la misma red, con códigos QR',hint:'Los dos teléfonos deben estar en el mismo Wi‑Fi o en el hotspot de uno de ellos. Uno toca «Crear partida» y el otro «Unirme»; se emparejan escaneando dos códigos QR con la cámara.'}
 :window.SudomiLAN&&window.SudomiLAN.kind==='online'
 ?{online:true,label:'Online',icon:'🌐',title:'MULTIJUGADOR ONLINE',desc:'Juega con un amigo por internet',hint:'Crea una sala y envíale el enlace o el código a tu amigo. Pueden estar en cualquier lugar.'}
 :{online:false,label:'Wi‑Fi',icon:'📶',title:'MULTIJUGADOR LOCAL',desc:'Juega desde dos teléfonos en la misma red',hint:'Ambos teléfonos deben estar conectados a la misma Wi‑Fi y abrir esta app desde la dirección local de la PC.'};
const netBtn=()=>{const n=netInfo();return `<button data-mode="wifi"><strong>${n.icon} Multijugador</strong><small>${n.desc}. Si nadie se une, puedes jugar contra la IA.</small></button>`};
const prettyRoom=r=>r&&r.length===8?r.slice(0,4)+'-'+r.slice(4):r;
function shareInvite(id,room){
 let net='';try{if(sessionStorage.getItem('sudomi-net')==='online')net='&net=online'}catch(_){}
 const base=location.origin&&location.origin!=='null'?location.origin+location.pathname:location.href.split(/[?#]/)[0];
 const url=`${base}?game=${encodeURIComponent(id)}&room=${room}${net}`,name=games.find(g=>g[0]===id)[2],text=`Juega ${name} conmigo en SUDOMI`;
 if(navigator.share)navigator.share({title:'SUDOMI',text,url}).catch(()=>{});
 else if(navigator.clipboard)navigator.clipboard.writeText(url).then(()=>wifiToast('Enlace copiado. Pégalo en tu chat.')).catch(()=>wifiToast(url,true));
 else wifiToast(url,true);
}
// A friend's invitation link (?game=…&room=…) opens the lobby and joins the room by itself.
function handleInvite(){
 let q;try{q=new URLSearchParams(location.search)}catch(_){return}
 const room=(q.get('room')||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase(),id=q.get('game');
 if(!room||!id)return;
 try{const u=new URL(location.href);['room','game'].forEach(k=>u.searchParams.delete(k));history.replaceState(null,'',u.pathname+u.search+u.hash)}catch(_){}
 joinInvite(id,room);
}
// 0.2.71: también lo usa la lista de amigos (js/friends.js) cuando alguien toca «Unirme» en una invitación
function joinInvite(id,room,opts){
 room=String(room||'').replace(/[^A-Za-z0-9]/g,'').toUpperCase();
 if(!room||!id)return false;
 if(id==='domino4'){open();openDominoParty(room);return true}   // 0.2.58: Dominó multijugador
 if(id==='mines'||!games.some(g=>g[0]===id))return false;
 if(id==='dos'){open();if(openDos())SudomiDos.join(room);return}
 if(id==='stop'){open();if(openStop())SudomiStop.join(room);return}
 if(id==='dominopolis'){open();if(openDominopolis())SudomiDominopolis.join(room,opts);return}
 open();wifiLobby(id,{code:room});
 setTimeout(()=>{const b=$('#joinWifiRoom');if(b)b.click()},200);
}
window.SudomiJoinInvite=joinInvite;
// 0.2.76: partida de 2 jugadores guardada en este teléfono: la portada ofrece «Volver a la partida» (js/friends.js)
window.SudomiSavedGame=()=>{const s=window.SudomiLAN&&!SudomiLAN.session?SudomiLAN.saved:null,it=s&&games.find(g=>g[0]===s.session.game);return it?{game:it[0],gameName:it[2],room:s.session.room,role:s.session.player===0?'host':'guest'}:null};
window.SudomiResumeSaved=()=>{const s=window.SudomiLAN&&SudomiLAN.saved;if(!s)return false;open();resumeWifi(s);return true};
window.SudomiDropSaved=()=>{try{SudomiLAN.forget();localStorage.removeItem(HOST_KEY)}catch(_){}};
const HOST_KEY='sudomi-lan-state';
const isExtra=(id=current)=>games.findIndex(g=>g[0]===id)>=6;
function fullState(){const state={};for(const k of Object.keys(game))if(!['mode','record','wifi'].includes(k))state[k]=game[k];return {state,scores:game.record?.scores||null,starter:game.record?.starter}}
// Card / tile games are host-authoritative: the guest only ever receives a copy with the host's hidden cards removed.
function wifiSnapshot(forPlayer=1-wifi.player){
 if(!isExtra())return fullState();
 const v=SudomiExtraGames.view(current,game,forPlayer),state={};
 for(const k of Object.keys(v))if(!['mode','record','wifi'].includes(k))state[k]=v[k];
 return {state};
}
function persistWifi(){try{if(wifi.active&&window.SudomiLAN?.session&&game)localStorage.setItem(HOST_KEY,JSON.stringify({room:SudomiLAN.session.room,game:current,state:fullState()}))}catch(_){}}
function restoreWifi(room){try{const v=JSON.parse(localStorage.getItem(HOST_KEY));if(v&&v.room===room&&v.game===current){applyWifiSnapshot(v.state);return true}}catch(_){}return false}
function wifiToast(text,sticky){let t=document.getElementById('wifiToast');if(!t){t=document.createElement('div');t.id='wifiToast';t.className='wifi-toast';t.setAttribute('role','status');document.body.appendChild(t)}t.textContent=text;t.classList.add('show');clearTimeout(t._h);if(!sticky)t._h=setTimeout(()=>t.classList.remove('show'),4500)}
function hideWifiToast(){const t=document.getElementById('wifiToast');if(t)t.classList.remove('show')}
// Every tap in a card/tile game goes through here.
function dispatchExtra(act){
 if(!game||!isExtra())return;
 if(wifi.active){
  if(wifi.player===0){SudomiExtraGames.apply(current,game,0,act);publishWifi();render()}
  else wifiSend('action',{act})            // the guest never edits the game: the host decides and sends back the result
 }else{SudomiExtraGames.apply(current,game,game.turn,act);render()}
}
function resumeWifi(saved){
 const s0=saved.session,id=s0.game;
 if(!games.some(g=>g[0]===id)){SudomiLAN.forget();renderHub();return}
 SudomiLAN.resume(saved);wifi.player=s0.player;current=id;startWifiEvents(id);
 let hadState=false;try{const v=JSON.parse(localStorage.getItem(HOST_KEY));hadState=!!v&&v.room===s0.room&&v.game===id}catch(_){}
 if(!hadState&&s0.player===0){            // host whose friend had not joined yet: back to the waiting lobby
  wifiLobby(id);const st=$('#wifiStatus');if(st)st.innerHTML=`Sala recuperada. Comparte este código:<strong class="wifi-room-code">${prettyRoom(s0.room)}</strong><span>Esperando que se una…</span>`;return;
 }
 launch(id,'wifi');restoreWifi(s0.room);render();
 wifiToast('Reconectado a la partida.');sendProfile();
 if(s0.player===0)wifiSend('state',wifiSnapshot());else wifiSend('sync-request',{});
}
function applyWifiSnapshot(packet){if(!game||!packet?.state)return;for(const [k,v] of Object.entries(packet.state))game[k]=v;if(packet.scores&&game.record)game.record.scores=packet.scores;if(packet.starter!==undefined&&game.record)game.record.starter=packet.starter}
function wifiSend(type,payload){if(wifi.active&&window.SudomiLAN?.session)SudomiLAN.send(type,payload).catch(e=>console.warn('SUDOMI Wi-Fi:',e.message))}
function publishWifi(){if(wifi.active){wifiSend('state',wifiSnapshot());persistWifi()}}
function localTurn(){if(!wifi.active)return true;if(current==='fleet'){if(game.phase==='setup')return game.turn===wifi.player;if(game.phase==='handoff')return game.afterWait==='setup'?game.turn===wifi.player: wifi.player===0;return game.turn===wifi.player}if(current==='chess')return game.turn===(wifi.player===0?'w':'b');if(current==='checkers')return game.turn===(wifi.player===0?'r':'b');if(current==='tictactoe')return game.turn===(wifi.player===0?'X':'O');if(current==='connect4')return game.turn===(wifi.player===0?'R':'Y');if(games.findIndex(g=>g[0]===current)>=6)return game.turn===wifi.player;return false}
// 0.2.58: Dominó is a 4-player game: you (seat 0) + a computer partner against two computers
// 0.2.63: right rival, partner and left rival take the three names drawn for this game (aiPick)
function pveSeats(){const me=myProfile(),a=aiPick;return [{name:me?me.name:'Tú',avatar:me?me.avatar:'🦊'},{name:a[0][0],avatar:a[0][1],bot:true},{name:a[1][0],avatar:a[1][1],bot:true},{name:a[2][0],avatar:a[2][1],bot:true}]}
// one device, 4 people: the profile and three guests
function localSeats(){const me=myProfile();return [{name:me?me.name:'Jugador 1',avatar:me?me.avatar:'🦊'},{name:'Invitado',avatar:'👤'},{name:'Invitado 2',avatar:'👤'},{name:'Invitado 3',avatar:'👤'}]}
function create(id,mode){if(id==='mines')return new Mines(mode);if(id==='fleet')return new Fleet(mode);if(id==='chess')return new Chess(mode);if(id==='checkers')return new Checkers(mode);if(id==='connect4')return new Connect4(mode);if(games.findIndex(g=>g[0]===id)>=6)return SudomiExtraGames.create(id,mode,id==='domino'&&mode==='pve'?{seats:pveSeats()}:id==='domino'&&mode==='pvp'?{seats:localSeats()}:undefined);return new TicTacToe(mode);}
// 0.2.58: the computer player of the card/tile games. After every drawing it asks for the computer's next step and plays it after a short pause.
let botTimer=null;
function scheduleBot(){
 clearTimeout(botTimer);botTimer=null;
 if(!game||!isExtra()||game.over&&!(current==='domino'&&game.phase==='handend')||wifi.active||!SudomiExtraGames.botAct)return;
 if(game.mode!=='pve')return;
 const act=SudomiExtraGames.botAct(current,game);if(!act)return;
 const g0=game,id0=current;
 botTimer=setTimeout(()=>{if(game!==g0||current!==id0||g0.over)return;SudomiExtraGames.apply(id0,g0,act.seat!=null?act.seat:g0.turn,act);render()},act.delay||850);
}
function modeLabel(){return wifi.active?'PVP · WI-FI':game.mode==='pve'?(current==='domino'?'PVE':'PVE · CPU'):game.mode==='pvp'?'PVP · LOCAL':game.mode==='clock'?'CONTRA EL RELOJ':'PRÁCTICA'}
function isFinished(){return current==='chess'?!!game.done:current==='checkers'?!!game.over:!!game.over}
function resultInfoRaw(){if(!isFinished())return null;let g=game;if(current==='mines'){const lv=MINE_LEVELS[g.level].label,best=mineBest()[g.level];return {title:g.won?'¡Tablero completado!':'Partida terminada',winner:g.won?'Ganador: tú':'Sin ganador · mina descubierta',detail:g.mode==='clock'?`${lv} · Tiempo: ${clockText(g.seconds)}${g.record?' · 🏅 ¡Nuevo récord!':best?` · Récord: ${clockText(best)}`:''}`:`${lv} · Modo práctica`}}if(current==='fleet')return {title:'Batalla terminada',winner:g.mode==='pve'?(g.won?'Ganador: tú':'Ganador: computadora'):`Ganador: Jugador ${g.won?1:2}`,detail:'Flota hundida'};if(current==='chess'){let draw=g.done.startsWith('Tablas'),white=g.done.includes('ganan blancas');return {title:draw?'Partida en tablas':'Jaque mate',winner:draw?'Sin ganador · tablas':g.mode==='pve'?(white?'Ganador: tú':'Ganador: computadora'):(white?'Ganador: blancas':'Ganador: negras'),detail:g.done}}if(current==='checkers'){let red=g.over.includes('Rojas');return {title:'Partida terminada',winner:g.mode==='pve'?(red?'Ganador: tú':'Ganador: computadora'):(red?'Ganador: rojas':'Ganador: negras'),detail:g.over}}if(current==='tictactoe')return {title:'Partida terminada',winner:g.winner||'Empate',detail:'Tres en raya'};if(current==='connect4')return {title:'Partida terminada',winner:g.winner||'Empate',detail:'4 en línea'};if(current==='domino'){const s=g.seats||[],pve=g.mode==='pve';return {title:'Partida terminada',winner:pve?(g.winTeam===0?('Ganador: tú y '+(s[2]?s[2].name:'tu compañero')):('Ganador: '+(s[1]?s[1].name:'')+' y '+(s[3]?s[3].name:'')+' (IA)')):('Ganador: Equipo '+(g.winTeam?'B':'A')),detail:g.message||'Dominó'}}if(games.findIndex(x=>x[0]===current)>=6)return {title:'Partida terminada',winner:g.winner<0?'Empate':g.mode==='pve'?(g.winner===0?'Ganador: tú':'Ganador: computadora'):`Ganador: Jugador ${g.winner+1}`,detail:g.message||games.find(x=>x[0]===current)[2]};return null}
function resultInfo(){const r=resultInfoRaw();if(r&&game&&game.mode==='pve'&&current!=='domino'&&/computadora/i.test(r.winner))r.winner=r.winner.replace(/la computadora/i,aiName()+' (IA)').replace(/computadora/i,aiName()+' (IA)');return r}
function winnerPlayer(){if(current==='fleet')return game.won?0:1;if(current==='chess')return game.done.includes('ganan blancas')?0:1;if(current==='checkers')return game.over.includes('Rojas')?0:1;if(current==='tictactoe')return game.winnerLine?.length&&game.b[game.winnerLine[0]]==='X'?0:1;if(current==='connect4')return game.winnerLine?.length&&game.b[game.winnerLine[0]]==='R'?0:1;if(games.findIndex(g=>g[0]===current)>=6)return game.winner;return null}
function victoryPrompt(result){if(wifi.active)return wifi.player===winnerPlayer()?`¡${result.winner}! Espera a que quien perdió toque su pantalla para ver el resultado.`:'Toca cualquier parte de la pantalla para detener la animación y ver el resultado.';return 'Pásale el dispositivo a quien perdió. Cuando esté listo, toca cualquier parte de la pantalla.'}
function localWinPending(result=resultInfo()){return !!(game&&game.mode==='pvp'&&result&&!/empate|sin ganador/i.test(result.winner)&&acknowledgedWin!==game)}
const winnerHere=()=>wifi.active&&wifi.player===winnerPlayer();   // this phone belongs to the winner, who waits for the other player's tap
function disarmWinTap(){if(localWinListener){document.removeEventListener('click',localWinListener,true);localWinListener=null}}
// 0.2.16: the winner can still use the top buttons (Juegos / Sudoku / Modos / ↻) while waiting, so nobody gets stuck.
function armLocalWinTap(waiting){if(!waiting){disarmWinTap();return}if(localWinListener)return;const target=game;localWinListener=e=>{if(game!==target)return;if(winnerHere()&&e.target.closest&&e.target.closest('.mini-game-head'))return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(winnerHere())return;acknowledgedWin=target;disarmWinTap();if(wifi.active)wifiSend('win-ack');render()};document.addEventListener('click',localWinListener,true)}
function turnInfo(){if(current==='mines')return game.mode==='clock'?`⏱ ${clockText(game.seconds)}`:game.mode==='practice'?'🧩 Práctica':'';if(current==='fleet')return game.mode==='pve'?'🎯 Tu turno':`🚢 J${game.turn+1}`;if(current==='chess')return `${game.turn==='w'?'♔':'♚'} ${game.mode==='pve'&&game.turn==='b'?'CPU':game.turn==='w'?'Blancas':'Negras'}`;if(current==='checkers')return `${game.turn==='r'?'🔴':'⚫'} ${game.mode==='pve'&&game.turn==='b'?'CPU':game.turn==='r'?'Rojas':'Negras'}`;if(current==='tictactoe')return `${game.turn==='X'?'❌':'⭕'} ${game.mode==='pve'&&game.turn==='O'?'CPU':`Jugador ${game.turn==='X'?1:2}`}`;if(current==='connect4')return `${game.turn==='R'?'🔴':'🟡'} ${game.mode==='pve'&&game.turn==='Y'?'CPU':game.turn==='R'?'Rojo · J1':'Amarillo · J2'}`;if(current==='domino'){const s=game.seats&&game.seats[game.turn];return `🎲 ${s?s.name:'Jugador '+(game.turn+1)}`}if(games.findIndex(g=>g[0]===current)>=6)return game.mode==='pve'?(game.turn===0?'🎲 Tu turno':'🎲 '+aiName()):`🎲 Jugador ${game.turn+1}`;return ''}
function clockText(s){return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
function resetMatch(){if(wifi.active&&wifi.player!==0)return;const mode=wifi.active?'pvp':game.mode;game=create(current,mode);if(wifi.active)game.wifi=true;render();publishWifi()}
function shell(title,subtitle,content){const result=resultInfo();if(!result&&acknowledgedWin===game)acknowledgedWin=null;   // 0.2.16: a rematch on the same room celebrates again
const waiting=localWinPending(result),score=current==='tictactoe'||current==='connect4'?game.scoreMarkup():'';stage.innerHTML=withNames(`<div class="mini-game ${waiting?'local-win-active':''}"><div class="mini-game-head"><div><p>ARCADE SUDOMI · ${modeLabel()}</p><h2>${title}</h2><small>${subtitle}</small></div><div class="mini-game-actions"><span class="turn-indicator">${turnInfo()}</span><button class="game-restart" id="gameListBtn">Juegos</button><button class="game-restart" id="sudokuBtn">Sudoku</button><button class="game-restart" id="changeMode">Modos</button>${score?'<button class="game-restart" id="resetScore">Reiniciar marcador</button>':''}<button class="game-restart" id="restartMini" ${wifi.active&&wifi.player!==0?'disabled title="El creador de la sala reinicia la partida"':''}>↻</button></div></div>${vsBar()}${waiting?`<p class="victory-awaiting"><strong>🏆 ${result.winner}</strong><span>${victoryPrompt(result)}</span></p>${winnerHere()?'':'<button class="win-tap-catcher" type="button" aria-label="Ver el resultado"></button>'}`:''}${score}${content}${result&&!waiting?`<div class="game-end-overlay"><div class="game-end-card"><p>PARTIDA TERMINADA</p><h3>${result.title}</h3><strong>${result.winner}</strong><small>${result.detail}</small><div><button id="playAgain" ${wifi.active&&wifi.player!==0?'disabled':''}>${wifi.active&&wifi.player!==0?'El creador de la sala inicia otra':'Jugar otra'}</button><button id="endGames">Todos los juegos</button><button id="endSudoku">Volver a Sudoku</button></div></div></div>`:''}</div>`);$('#restartMini').onclick=()=>wifi.active?resetMatch():(game=create(current,game.mode),render());const reset=$('#resetScore');if(reset)reset.onclick=()=>{game.record.scores=[0,0];publishWifi();render()};$('#gameListBtn').onclick=toHub;$('#sudokuBtn').onclick=back;$('#changeMode').onclick=()=>{if(wifi.active)leaveWifi();game=null;stage.classList.add('hidden');hub.classList.remove('hidden');chooseMode(current)};if(result&&!waiting){$('#playAgain').onclick=resetMatch;$('#endGames').onclick=toHub;$('#endSudoku').onclick=back}armLocalWinTap(waiting)}
function render(){if(current==='mines')renderMines();else if(current==='fleet')renderFleet();else if(current==='chess')renderChess();else if(current==='checkers')renderCheckers();else if(current==='connect4')renderConnect4();else if(games.findIndex(g=>g[0]===current)>=6){const x=SudomiExtraGames.render(current,game,{wifi:wifi.active,player:wifi.player,names:wifi.names,profile:myProfile(),publish:publishWifi,render,dispatch:dispatchExtra});shell(games.find(g=>g[0]===current)[2],game.message||'Toma tu turno',x.html);x.bind();scheduleBot()}else renderTtt();}

// Minesweeper: safe first click, flags and recursive reveal.
// 0.2.30: six difficulties (board size + number of mines) and the best time of each one saved on this device.
const MINE_LEVELS={facil:{label:'Fácil',n:9,mines:10},medio:{label:'Medio',n:12,mines:22},dificil:{label:'Difícil',n:14,mines:35},experto:{label:'Experto',n:16,mines:50},maestro:{label:'Maestro',n:16,mines:62},extremo:{label:'Extremo',n:18,mines:80}};
let minesLevel=(()=>{try{const k=localStorage.getItem('sudomi-mines-level');return MINE_LEVELS[k]?k:'facil'}catch(_){return 'facil'}})();
const mineBest=()=>{try{return JSON.parse(localStorage.getItem('sudomi-mines-best'))||{}}catch(_){return {}}};
class Mines{
 constructor(mode='clock'){const L=MINE_LEVELS[minesLevel];this.level=minesLevel;this.mode=mode;this.seconds=0;this.clockStarted=false;this.n=L.n;this.total=L.mines;const N=L.n*L.n;this.m=Array(N).fill(false);this.opened=Array(N).fill(false);this.flags=Array(N).fill(false);this.ready=false;this.over=false;this.won=false;this.flagMode=false;this.record=false}
 neighbors(i){const n=this.n;let r=i/n|0,c=i%n;let out=[];for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++){let a=r+y,b=c+x;if((x||y)&&a>=0&&a<n&&b>=0&&b<n)out.push(a*n+b)}return out}
 // the first cell you touch and the cells around it never have a mine, so every game starts with an opening
 setup(safe){const keep=new Set([safe,...this.neighbors(safe)]);let picks=shuffleList(Array.from({length:this.n*this.n},(_,i)=>i).filter(i=>!keep.has(i))).slice(0,this.total);picks.forEach(i=>this.m[i]=true);this.ready=true}
 count(i){return this.neighbors(i).filter(j=>this.m[j]).length}
 reveal(i){if(this.over||this.flags[i]||this.opened[i])return;if(!this.ready)this.setup(i);if(this.mode==='clock')this.clockStarted=true;if(this.m[i]){this.over=true;return}this.opened[i]=true;if(!this.count(i))this.neighbors(i).forEach(j=>this.reveal(j));if(!this.over&&this.opened.filter((v,j)=>v&&!this.m[j]).length===this.n*this.n-this.total){this.over=true;this.won=true;this.saveBest()}}
 saveBest(){if(this.mode!=='clock')return;const best=mineBest();if(!best[this.level]||this.seconds<best[this.level]){best[this.level]=this.seconds;this.record=true;try{localStorage.setItem('sudomi-mines-best',JSON.stringify(best))}catch(_){}}}
 flag(i){if(!this.over&&!this.opened[i])this.flags[i]=!this.flags[i]}
}
function renderMines(){let g=game,lv=MINE_LEVELS[g.level].label,status=g.over?(g.won?'¡Tablero despejado! 🎉':'¡Mina descubierta!'):g.mode==='clock'?`${lv} · Tiempo ${clockText(g.seconds)} · Minas ${g.flags.filter(Boolean).length}/${g.total}`:`${lv} · Práctica · Minas ${g.flags.filter(Boolean).length}/${g.total}`;shell('Buscaminas',status,`<div class="game-tools"><span class="mine-clock">${g.mode==='clock'?'⏱ <b id="mineClock">'+clockText(g.seconds)+'</b>':'Sin cronómetro'}</span><button id="flagMode" class="mini-tool ${g.flagMode?'on':''}">🚩 ${g.flagMode?'Modo bandera activado':'Marcar bandera'}</button></div><div class="mine-grid ${g.n>12?'big':''}" style="--mn:${g.n}">${g.m.map((mine,i)=>{let shown=g.opened[i]||g.over&&mine;let count=g.count(i);let text=g.flags[i]?'🚩':shown?(mine?'💣':count||''):'';return `<button class="mine-cell ${shown&&!mine?'revealed':''} ${mine&&g.over?'mine-hit':''}" data-i="${i}" ${g.opened[i]||g.over?'disabled':''}>${text}</button>`}).join('')}</div><p class="board-hint">Primer toque seguro · revela todas las casillas sin minas. En móvil activa “Marcar bandera” para 🚩</p>`);$('#flagMode').onclick=()=>{g.flagMode=!g.flagMode;render()};stage.querySelectorAll('.mine-cell').forEach(b=>{const i=+b.dataset.i;b.onclick=()=>{if(g.flagMode)g.flag(i);else g.reveal(i);render()};b.oncontextmenu=e=>{e.preventDefault();g.flag(i);render()}})}

// Battleship: fleet hidden from the computer; the computer fires back automatically.
class Fleet{
 constructor(mode='pve'){this.mode=mode;this.n=8;this.fleet=[{name:'Acorazado',len:4},{name:'Crucero',len:3},{name:'Submarino',len:3},{name:'Patrullera',len:2}];this.you=Array(64).fill(false);this.enemy=Array(64).fill(false);this.remaining=[this.fleet.map(x=>x.len),this.fleet.map(x=>x.len)];this.placed=[[],[]];this.shots=Array(64).fill(false);this.shots2=Array(64).fill(false);this.incoming=Array(64).fill(false);this.turn=0;this.phase='setup';this.afterWait='';this.waiting=false;this.orientation='h';this.selectedLength=4;this.lastShot='';this.lastShotIndex=-1;this.over=false;this.won=false;this.setSelected()}
 get board(){return this.turn===0?this.you:this.enemy}
 get remainingHere(){return this.remaining[this.turn]}
 setSelected(){if(!this.remainingHere.includes(this.selectedLength))this.selectedLength=[...this.remainingHere].sort((a,b)=>b-a)[0]||0}
 placementCells(i){let r=i/8|0,c=i%8,len=this.selectedLength,ids=Array.from({length:len},(_,k)=>this.orientation==='h'?r*8+c+k:(r+k)*8+c);return ids.some((x,k)=>x>=64||this.orientation==='h'&&(x%8)<c||this.board[x])?[]:ids}
 placeAt(i){if(this.phase!=='setup')return;let ids=this.placementCells(i);if(!ids.length)return;ids.forEach(x=>this.board[x]=true);this.placed[this.turn].push({len:this.selectedLength,ids});this.remainingHere.splice(this.remainingHere.indexOf(this.selectedLength),1);this.setSelected();if(!this.remainingHere.length){if(this.mode==='pve'){this.randomFleet(this.enemy);this.phase='play';this.turn=0;this.lastShot='Tu flota está lista. ¡A disparar!'}else if(this.turn===0){this.turn=1;this.selectedLength=4;this.phase='handoff';this.afterWait='setup';this.waiting=true}else{this.turn=0;this.phase='handoff';this.afterWait='play';this.waiting=true}}}
 undoPlacement(){if(this.phase!=='setup')return;let p=this.placed[this.turn].pop();if(!p)return;p.ids.forEach(i=>this.board[i]=false);this.remainingHere.push(p.len);this.selectedLength=p.len}
 randomFleet(board){for(const ship of this.fleet){let done=false,tries=0;while(!done&&tries++<1000){let horizontal=Math.random()<.5,r=Math.random()*8|0,c=Math.random()*8|0,ids=Array.from({length:ship.len},(_,k)=>horizontal?r*8+c+k:(r+k)*8+c);if(ids.some(x=>x>=64||horizontal&&x%8<c||board[x]))continue;ids.forEach(x=>board[x]=true);done=true}}}
 ready(){this.waiting=false;this.phase=this.afterWait;this.afterWait='';this.lastShot=''}
 passTurn(){this.turn=1-this.turn;this.phase='handoff';this.afterWait='play';this.waiting=true;this.lastShot=''}
 fire(i){if(this.over||this.phase!=='play')return;if(this.mode==='pvp'){let attacks=this.turn===0?this.shots:this.shots2,targets=this.turn===0?this.enemy:this.you;if(attacks[i])return;attacks[i]=true;this.lastShotIndex=i;this.lastShot=targets[i]?'¡Tocado!':'Agua';if(targets.filter((v,j)=>v&&attacks[j]).length===12){this.over=true;this.won=this.turn===0;return}this.phase='result';return}if(this.shots[i])return;this.shots[i]=true;this.lastShotIndex=i;this.lastShot=this.enemy[i]?'¡Tocado!':'Agua';if(this.enemy.filter((v,j)=>v&&this.shots[j]).length===12){this.over=true;this.won=true;return}let choices=this.incoming.map((v,j)=>v?-1:j).filter(j=>j>=0);if(choices.length){let c=choices[Math.random()*choices.length|0];this.incoming[c]=true}if(this.you.filter((v,j)=>v&&this.incoming[j]).length===12){this.over=true;this.won=false}}
}
function renderFleet(){let g=game,celebrate=localWinPending();if(g.phase==='setup'){let setupPlayer=`Jugador ${g.turn+1}`;let cells=g.board.map((occupied,i)=>`<button class="fleet-cell setup-cell ${occupied?'your-ship':''}" data-i="${i}" ${occupied||!g.selectedLength||!localTurn()?'disabled':''}></button>`).join('');shell('Batalla naval',`Coloca los barcos · ${setupPlayer}`,`<div class="fleet-setup-tools"><div class="ship-choice-list">${[...new Set(g.fleet.map(s=>s.len))].map(len=>{let s=g.fleet.find(x=>x.len===len),qty=g.remainingHere.filter(x=>x===len).length;return `<button class="ship-choice ${qty?'':'used'} ${g.selectedLength===len?'selected':''}" data-len="${len}" ${!qty||!localTurn()?'disabled':''}>${len===3?'Crucero / submarino':s.name}<small>${len} casillas · ${qty} disponibles</small></button>`}).join('')}</div><button id="rotateShip" class="mini-tool" ${!localTurn()?'disabled':''}>↻ Girar barco (${g.orientation==='h'?'horizontal':'vertical'})</button></div><div class="fleet-placement-grid">${cells}</div><p class="board-hint">Elige un barco, ajusta la orientación y toca el tablero para colocarlo. Evita que se salga o se cruce con otro barco.</p>`);stage.querySelectorAll('.ship-choice').forEach(b=>b.onclick=()=>{if(!localTurn())return;g.selectedLength=+b.dataset.len;render()});$('#rotateShip').onclick=()=>{if(!localTurn())return;g.orientation=g.orientation==='h'?'v':'h';render()};const undo=document.createElement('button');undo.className='mini-tool undo-ship';undo.textContent='↶ Deshacer último barco';undo.disabled=!g.placed[g.turn].length||!localTurn();undo.onclick=()=>{if(!localTurn())return;g.undoPlacement();render()};$('#rotateShip').insertAdjacentElement('afterend',undo);stage.querySelectorAll('.setup-cell:not(:disabled)').forEach(b=>{b.onclick=()=>{if(!localTurn())return;g.placeAt(+b.dataset.i);if(wifi.active&&g.phase==='handoff')publishWifi();render()};b.onmouseenter=()=>{let ids=g.placementCells(+b.dataset.i);stage.querySelectorAll('.setup-cell').forEach(x=>{if(ids.includes(+x.dataset.i))x.classList.add('preview')})};b.onmouseleave=()=>stage.querySelectorAll('.setup-cell').forEach(x=>x.classList.remove('preview'))});return}
 if(g.phase==='handoff'){let title=g.afterWait==='setup'?`Jugador ${g.turn+1}, prepara tu flota`:'¡Las flotas están listas!';shell('Batalla naval',title,`<div class="pass-device"><span>🔒</span><h3>${g.afterWait==='setup'?'Entrega el dispositivo':'Batalla naval lista'}</h3><p>${g.afterWait==='setup'?`Jugador ${g.turn+1}, coloca tus barcos en secreto.`:'Jugador 1, puedes comenzar la batalla.'}</p><button id="readyFleet" class="primary-action" ${!localTurn()?'disabled':''}>${g.afterWait==='setup'?'Estoy listo':'Comenzar partida'}</button></div>`);$('#readyFleet').onclick=()=>{if(!localTurn())return;g.ready();publishWifi();render()};return}
 let attacks=g.turn===0?g.shots:g.shots2,target=g.turn===0?g.enemy:g.you,status=g.mode==='pve'?g.lastShot||'Tu turno':`Jugador ${g.turn+1} · ${g.lastShot||'Elige dónde disparar'}`;let own=g.you.map((ship,i)=>`<span class="fleet-cell ${ship?'your-ship':''} ${g.incoming[i]?(ship?'hit':'miss'):' '}">${g.incoming[i]?(ship?'✹':'·'):''}</span>`).join('');let content=`<div class="fleet-battle ${g.mode==='pvp'?'fleet-single':''}"><div class="fleet-target"><h3>${g.mode==='pve'?'Flota rival':`Objetivo · Jugador ${g.turn===0?2:1}`} · ${target.filter((v,i)=>v&&attacks[i]).length}/12</h3><div class="fleet-grid enemy-grid">${target.map((_,i)=>`<button class="fleet-cell ${attacks[i]?(target[i]?'hit':'miss'):''} ${celebrate&&g.lastShotIndex===i?'winning-shot':''}" data-i="${i}" ${attacks[i]||g.over||g.phase!=='play'||!localTurn()?'disabled':''}>${attacks[i]?(target[i]?'✹':'·'):''}</button>`).join('')}</div></div>${g.mode==='pve'?`<div><h3>Tu flota</h3><div class="fleet-grid own-grid">${own}</div></div>`:''}</div>${g.lastShot?`<p class="shot-feedback ${g.lastShot.includes('Tocado')?'hit-feedback':'miss-feedback'}">${g.lastShot}</p>`:''}${!wifi.active&&g.phase==='result'?'<button id="passFleet" class="primary-action pass-next">Pasar dispositivo al siguiente jugador</button>':''}<p class="board-hint">${wifi.active?'La partida se sincroniza por la red local.':g.mode==='pvp'?'El resultado queda visible antes de pasar el dispositivo.':'La computadora responde a cada disparo.'}</p>`;shell('Batalla naval',status,content);if(g.phase==='result')$('#passFleet')?.addEventListener('click',()=>{g.passTurn();render()});stage.querySelectorAll('.enemy-grid button').forEach(b=>b.onclick=()=>{if(!localTurn())return;g.fire(+b.dataset.i);if(wifi.active&&g.phase==='result'&&!g.over){g.turn=1-g.turn;g.phase='play'}publishWifi();render()})}

// Tic-tac-toe: player X versus a computer that takes wins, blocks, or picks randomly.
class TicTacToe{
 constructor(mode='pve'){this.mode=mode;this.record=matchRecords.tictactoe[mode];this.start=this.record.starter;this.b=Array(9).fill('');this.turn=this.start===0?'X':'O';this.over=false;this.winner='';this.winnerLine=[];this.message=mode==='pve'?(this.turn==='X'?'Tu turno · eres X':'La computadora inicia · eres O'):`Turno de ${this.turn} · Jugador ${this.turn==='X'?1:2}`;if(mode==='pve'&&this.turn==='O'){this.b[4]='O';this.turn='X';this.message='La computadora comenzó · tu turno'}}
 wins=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
 winningLine(p){return this.wins.find(line=>line.every(i=>this.b[i]===p))||[]}
 won(p){return this.winningLine(p).length>0}
 finish(side){this.over=true;this.record.starter=1-this.start;this.winnerLine=side?this.winningLine(side):[];if(side){if(this.mode==='pvp'){let n=side==='X'?0:1;this.record.scores[n]++;this.winner=`Gana Jugador ${n+1}`}else{let n=side==='X'?0:1;this.record.scores[n]++;this.winner=n===0?'Ganas tú':'Gana la computadora'}this.message=this.winner}else{this.winner='Empate';this.message='Empate.'}}
 move(i){if(this.over||this.b[i])return;if(this.mode==='pvp'){this.b[i]=this.turn;if(this.won(this.turn)){this.finish(this.turn);return}if(this.b.every(Boolean)){this.finish(null);return}this.turn=this.turn==='X'?'O':'X';this.message=`Turno de ${this.turn} · Jugador ${this.turn==='X'?1:2}`;return}this.b[i]='X';if(this.won('X')){this.finish('X');return}if(this.b.every(Boolean)){this.finish(null);return}this.turn='O';let m=this.best('O')??this.best('X');if(m===null||m===undefined){let a=this.b.map((v,j)=>v?-1:j).filter(j=>j>=0);m=a[Math.random()*a.length|0]}this.b[m]='O';if(this.won('O')){this.finish('O')}else if(this.b.every(Boolean)){this.finish(null)}else{this.turn='X';this.message='Tu turno · eres X'}}
 best(p){for(const line of this.wins){let empty=line.filter(i=>!this.b[i]);if(empty.length===1&&line.filter(i=>this.b[i]===p).length===2)return empty[0]}return null}
 scoreMarkup(){let s=this.record.scores;return `<div class="match-score"><span>${this.mode==='pve'?'Tú':'Jugador 1'}<b>${s[0]}</b></span><i>VS</i><span>${this.mode==='pve'?'Computadora':'Jugador 2'}<b>${s[1]}</b></span></div>`}
}
function renderTtt(){let g=game,celebrate=localWinPending();shell('Tres en raya',g.message,`<div class="ttt-board-wrap"><div class="ttt-board">${g.b.map((v,i)=>`<button class="ttt-cell ${v==='X'?'mark-x':v==='O'?'mark-o':''} ${celebrate&&g.winnerLine.includes(i)?'winning-cell':''}" style="--win-delay:${Math.max(0,g.winnerLine.indexOf(i))*90}ms" data-i="${i}" ${v||g.over||!localTurn()?'disabled':''}><span class="ttt-mark">${v}</span></button>`).join('')}</div></div><p class="board-hint">${g.mode==='pve'?'Juegas contra la computadora. Empieza X.':wifi.active?`Estás jugando como Jugador ${wifi.player+1}.`:'X: Jugador 1 · O: Jugador 2.'}</p>`);stage.querySelectorAll('.ttt-cell').forEach(b=>b.onclick=()=>{if(!localTurn())return;g.move(+b.dataset.i);publishWifi();render()})}

// Connect Four: local two-player or a simple win/block/center-preferring CPU.
class Connect4{
 constructor(mode='pve'){this.mode=mode;this.record=matchRecords.connect4[mode];this.b=Array(42).fill('');this.turn='R';this.busy=false;this.over=false;this.winner='';this.lastMove=-1;this.msg=mode==='pve'?'Tu turno · fichas rojas':'Turno de rojas · Jugador 1'}
 drop(col,side=this.turn){for(let r=5;r>=0;r--){let i=r*7+col;if(!this.b[i]){this.b[i]=side;if(side===this.turn)this.lastMove=i;return i}}return -1}
 winningLine(side){for(let r=0;r<6;r++)for(let c=0;c<7;c++){let i=r*7+c;if(this.b[i]!==side)continue;for(let [dr,dc] of [[0,1],[1,0],[1,1],[1,-1]]){let cells=[0,1,2,3].map(k=>(r+dr*k)*7+c+dc*k);if(cells.every((x,k)=>{let rr=r+dr*k,cc=c+dc*k;return rr>=0&&rr<6&&cc>=0&&cc<7&&this.b[x]===side}))return cells}}return []}
 check(side){return this.winningLine(side).length>0}
 finish(side){this.over=true;this.winnerLine=side?this.winningLine(side):[];if(side){let n=this.mode==='pvp'?(side==='R'?0:1):(side==='R'?0:1);this.record.scores[n]++;this.winner=this.mode==='pve'?(n===0?'Ganas tú':'Gana la computadora'):`Gana Jugador ${n+1}`;this.msg=this.winner}else{this.winner='Empate';this.msg='Empate.'}}
 play(col){if(this.over||this.busy||this.b[col])return;let i=this.drop(col);if(i<0)return;if(this.check(this.turn)){this.finish(this.turn);return}if(this.b.every(Boolean)){this.finish(null);return}if(this.mode==='pvp'){this.turn=this.turn==='R'?'Y':'R';this.msg=`Turno de ${this.turn==='R'?'rojas · Jugador 1':'amarillas · Jugador 2'}`;return}this.turn='Y';this.busy=true;this.msg='La computadora está pensando…';const self=this;setTimeout(()=>{if(game!==self||self.over)return;let colAI=self.choose();self.drop(colAI,'Y');if(self.check('Y'))self.finish('Y');else if(self.b.every(Boolean))self.finish(null);else{self.turn='R';self.msg='Tu turno · fichas rojas'}self.busy=false;render()},400)}
 choose(){let available=Array.from({length:7},(_,c)=>c).filter(c=>!this.b[c]);for(let side of ['Y','R'])for(let c of available){let i=this.drop(c,side),win=this.check(side);this.b[i]='';if(win)return c}return available.sort((a,b)=>Math.abs(a-3)-Math.abs(b-3))[0]}
 scoreMarkup(){let s=this.record.scores;return `<div class="match-score"><span>${this.mode==='pve'?'Tú · Rojo':'Jugador 1 · Rojo'}<b>${s[0]}</b></span><i>VS</i><span>${this.mode==='pve'?'CPU · Amarillo':'Jugador 2 · Amarillo'}<b>${s[1]}</b></span></div>`}
}
// 0.2.60: 4 en línea animations — a disc falls from the top with gravity and bounces; a ghost disc shows where it will land; the winning four pulse in turn while the rest dim
let c4Anim={g:null,mv:-2,t0:0};
function c4Fall(g){
 const mv=g.lastMove;if(mv==null||mv<0||!g.b[mv])return null;
 const rows=(mv/7|0)+1,dur=.34+rows*.075;
 if(c4Anim.g!==g||c4Anim.mv!==mv){c4Anim={g,mv,t0:Date.now()};setTimeout(()=>{try{window.SudomiSound&&SudomiSound.play('clack')}catch(_){}},Math.round(dur*580))}
 const el=(Date.now()-c4Anim.t0)/1000;
 return el<dur?{i:mv,rows,dur,el}:null;
}
function c4Ghost(col,on){
 const slots=stage.querySelectorAll('.connect-slot');slots.forEach(s=>s.classList.remove('ghost','ghost-R','ghost-Y'));
 if(!on||!game||game.over||game.busy)return;
 for(let r=5;r>=0;r--){if(!game.b[r*7+col]){const s=slots[r*7+col];if(s)s.classList.add('ghost','ghost-'+(game.turn==='Y'?'Y':'R'));return}}
}
function renderConnect4(){let g=game,celebrate=localWinPending();const win=g.over&&g.winnerLine&&g.winnerLine.length?g.winnerLine:null,fall=c4Fall(g);shell('4 en línea',g.busy?'La computadora está pensando…':g.msg,`<div class="connect-board${win?' has-win':''}">${Array.from({length:42},(_,i)=>{let r=i/7|0,c=i%7,v=g.b[i],blocked=g.over||g.busy||g.b[c]||!localTurn();return `<button class="connect-slot ${v==='R'?'red-disc':v==='Y'?'yellow-disc':''} ${fall&&fall.i===i?'falling-disc':''} ${win&&win.includes(i)?'winning-disc':''}" style="${fall&&fall.i===i?`--rows:${fall.rows};--dur:${fall.dur.toFixed(2)}s;--delay:-${fall.el.toFixed(2)}s;`:''}${win&&win.includes(i)?`--k:${win.indexOf(i)}`:''}" data-col="${c}" ${blocked?'disabled':''} aria-label="Fila ${r+1}, columna ${c+1}${v?`, ficha ${v==='R'?'roja':'amarilla'}`:''}">${v?'●':''}</button>`}).join('')}</div><p class="board-hint">${g.mode==='pve'?'Tú: rojo · Computadora: amarillo':wifi.active?`Estás jugando como Jugador ${wifi.player+1}.`:'Rojo: Jugador 1 · Amarillo: Jugador 2'}</p>`);stage.querySelectorAll('.connect-slot:not(:disabled)').forEach(b=>{b.onclick=()=>{if(!localTurn())return;c4Ghost(0,false);g.play(+b.dataset.col);publishWifi();render()};b.onmouseenter=b.onfocus=()=>c4Ghost(+b.dataset.col,true);b.onmouseleave=b.onblur=()=>c4Ghost(0,false)})}

// Checkers: local two-player, diagonal movement, captures, kings and chained jumps.
/* Checkers engine used only by the computer player (same rules as the board: forced captures, multi-jumps, kings). */
function ckDirs(p){return p===p.toUpperCase()?[[-1,-1],[-1,1],[1,-1],[1,1]]:p==='r'?[[-1,-1],[-1,1]]:[[1,-1],[1,1]]}
function ckJumps(b,from,p,at,path,caps,out){for(const [dr,dc] of ckDirs(p)){const r=at>>3,c=at&7,r2=r+2*dr,c2=c+2*dc;if(r2<0||r2>7||c2<0||c2>7)continue;const mid=(r+dr)*8+c+dc,land=r2*8+c2,t=b[mid];if(!t||t.toLowerCase()===p.toLowerCase()||b[land])continue;const crowned=(p==='r'&&r2===0)||(p==='b'&&r2===7);b[mid]='';if(crowned)out.push({from,path:[...path,land],caps:[...caps,mid]});else{const n=out.length;ckJumps(b,from,p,land,[...path,land],[...caps,mid],out);if(out.length===n)out.push({from,path:[...path,land],caps:[...caps,mid]})}b[mid]=t}}
function ckMoves(b,side){const jumps=[],steps=[];for(let i=0;i<64;i++){const p=b[i];if(!p||p.toLowerCase()!==side)continue;b[i]='';ckJumps(b,i,p,i,[],[],jumps);b[i]=p;for(const [dr,dc] of ckDirs(p)){const r=(i>>3)+dr,c=(i&7)+dc;if(r<0||r>7||c<0||c>7||b[r*8+c])continue;steps.push({from:i,path:[r*8+c],caps:[]})}}return jumps.length?jumps:steps}
function ckApply(b,m){const p=b[m.from],to=m.path[m.path.length-1];b[m.from]='';for(const c of m.caps)b[c]='';b[to]=p==='r'&&to<8?'R':p==='b'&&to>=56?'B':p}
function ckEval(b){let s=0;for(let i=0;i<64;i++){const p=b[i];if(!p)continue;const black=p.toLowerCase()==='b',king=p===p.toUpperCase(),r=i>>3,c=i&7;let v=king?170:100;if(!king){const adv=black?r:7-r;v+=adv*4;if(adv===0)v+=6}if(c>=2&&c<=5&&r>=2&&r<=5)v+=3;if(c===0||c===7)v+=2;s+=black?v:-v}return s}
function ckSearch(b,side,d,alpha,beta,deadline,stop){if(Date.now()>deadline){stop.v=true;return 0}const moves=ckMoves(b,side);if(!moves.length)return -9000-d;if(d<=0&&(!moves[0].caps.length||d<-5))return (side==='b'?1:-1)*ckEval(b);const opp=side==='b'?'r':'b';let best=-Infinity;for(const m of moves){const nb=b.slice();ckApply(nb,m);const sc=-ckSearch(nb,opp,d-1,-beta,-alpha,deadline,stop);if(stop.v)return 0;if(sc>best)best=sc;if(sc>alpha)alpha=sc;if(alpha>=beta)break}return best}
// Iterative deepening with a time budget: always answers in about a second, deeper when the board is simple.
function ckBest(board,ms=900){const moves=ckMoves(board.slice(),'b');if(!moves.length)return null;if(moves.length===1)return moves[0];const deadline=Date.now()+ms,stop={v:false};let best=moves[0];for(let depth=2;depth<=12;depth+=2){let bs=-Infinity,cur=null;for(const m of moves){const nb=board.slice();ckApply(nb,m);const sc=-ckSearch(nb,'r',depth-1,-Infinity,Infinity,deadline,stop)+Math.random()*3;if(stop.v)break;if(sc>bs){bs=sc;cur=m}}if(stop.v||!cur)break;best=cur;moves.splice(moves.indexOf(cur),1);moves.unshift(cur)}return best}
class Checkers{
 constructor(mode='pve'){this.mode=mode;this.busy=false;this.captured=[[],[]];this.b=Array(64).fill('');for(let r=0;r<3;r++)for(let c=0;c<8;c++)if((r+c)%2)this.b[r*8+c]='b';for(let r=5;r<8;r++)for(let c=0;c<8;c++)if((r+c)%2)this.b[r*8+c]='r';this.turn='r';this.sel=-1;this.moves=[];this.over='';this.chain=-1;this.last=null;this.lastBy={r:null,b:null};this.cur=null;this.msg=mode==='pve'?'Rojas contra negras de la computadora.':'Rojas comienzan · pasan el dispositivo.'}
 captures(side=this.turn){let out=[];for(let i=0;i<64;i++)if(this.b[i]&&this.b[i].toLowerCase()===side)out.push(...this.legal(i).filter(m=>m.capture));return out}
 legal(i){let p=this.b[i];if(!p)return[];let r=i/8|0,c=i%8,dirs=p===p.toUpperCase()?[-1,1]:p==='r'?[-1]:[1],out=[];for(let dr of dirs)for(let dc of [-1,1]){let rr=r+dr,cc=c+dc;if(rr<0||rr>7||cc<0||cc>7)continue;let j=rr*8+cc;if(!this.b[j])out.push({to:j});else if(this.b[j].toLowerCase()!==p.toLowerCase()){let r2=rr+dr,c2=cc+dc;if(r2>=0&&r2<8&&c2>=0&&c2<8&&!this.b[r2*8+c2])out.push({to:r2*8+c2,capture:j})}}return out}
 click(i){if(this.over)return;if(this.sel>=0){let m=this.moves.find(x=>x.to===i);if(m){let p=this.b[this.sel];if(this.chain<0||!this.cur)this.cur={id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),side:this.turn,path:[this.sel],caps:[],before:this.b.slice()};let took=null;this.b[i]=p;this.b[this.sel]='';if(m.capture){let taken=this.b[m.capture];took={i:m.capture,p:taken};this.captured[taken.toLowerCase()==='r'?0:1].push(taken);this.b[m.capture]=''}this.cur.path.push(i);this.cur.caps.push(took);this.last={id:this.cur.id,side:this.cur.side,path:this.cur.path.slice(),caps:this.cur.caps.slice(),before:this.cur.before};this.lastBy=this.lastBy||{r:null,b:null};this.lastBy[this.cur.side]=this.last;const crowned=(p==='r'&&((i/8)|0)===0)||(p==='b'&&((i/8)|0)===7);if(p==='r'&&((i/8)|0)===0)this.b[i]='R';if(p==='b'&&((i/8)|0)===7)this.b[i]='B';if(m.capture&&!crowned&&this.legal(i).some(x=>x.capture)){this.sel=i;this.chain=i;this.moves=this.legal(i).filter(x=>x.capture);this.msg='¡Captura otra vez con la misma ficha!';return}this.chain=-1;this.turn=this.turn==='r'?'b':'r';this.sel=-1;this.moves=[];let stuck=!this.b.some((piece,j)=>piece&&piece.toLowerCase()===this.turn&&this.legal(j).length);if(stuck){this.over=this.turn==='r'?'Negras ganan.':'Rojas ganan.';this.msg=this.over}else this.msg=`Turno de ${this.turn==='r'?'rojas 🔴':'negras ⚫'}`;if(this.mode==='pve'&&this.turn==='b')this.computer();return}}if(this.b[i]&&this.b[i].toLowerCase()===this.turn){if(this.chain>=0)return;let legal=this.legal(i),must=this.captures();if(must.length)legal=legal.filter(x=>x.capture);if(legal.length){this.sel=i;this.moves=legal}}}
 computer(){this.busy=true;const self=this;setTimeout(()=>{if(game!==self||self.over)return;let pick=null;try{pick=ckBest(self.b)}catch(e){console.warn('SUDOMI checkers AI:',e)}if(pick){self.sel=pick.from;self.moves=self.legal(pick.from);for(const to of pick.path){if(self.over)break;self.click(to)}}
  /* safety net: if the engine could not finish its move, fall back to a random legal move so the game never freezes */
  if(!self.over&&self.turn==='b'){let all=[];for(let i=0;i<64;i++)if(self.b[i]==='b'||self.b[i]==='B')all.push(...self.legal(i).map(m=>({from:i,...m})));let captures=all.filter(m=>m.capture);if(captures.length)all=captures;if(!all.length){self.over='Rojas ganan.';self.msg=self.over}else{let m=all[Math.random()*all.length|0];self.sel=m.from;self.moves=self.legal(m.from);self.click(m.to);while(self.sel>=0&&!self.over){let chain=self.moves[Math.random()*self.moves.length|0];if(!chain)break;self.click(chain.to)}}}self.busy=false;render()},350)}
}
// 0.2.75: tablero girado para quien juega con las piezas de arriba, y una tarjeta por jugador con su color y su nombre (se ilumina en su turno)
const seatOrder=(n,flip)=>{const a=[];for(let i=0;i<n;i++)a.push(flip?n-1-i:i);return a};
function seatChips(kind,flip){
 const L=kind==='chess'?[['⚪','Blancas','w'],['⚫','Negras','b']]:[['🔴','Rojas','r'],['⚫','Negras','b']];
 const over=!!(game.done||game.over);
 const chip=k=>`<div class="seat-chip ${!over&&game.turn===L[k][2]?'turn':''}"><span class="seat-sw">${L[k][0]}</span><div><b>Jugador ${k+1}</b><small>${L[k][1]}${wifi.active&&k===wifi.player?' · tú':''}</small></div></div>`;
 return flip?[chip(0),chip(1)]:[chip(1),chip(0)];   // [arriba, abajo]: abajo siempre queda tu color
}
/* 0.2.80 — Damas: every move is animated step by step (also a chain of captures, for both players), each capture
 * sounds and leaves a red ✕, the squares of the move are bright yellow, and both marks fade after about 5 seconds.
 * "📷 Última jugada" shows a picture of the rival's last move. The move itself is recorded in Checkers.click(). */
let ckSeen={id:'',steps:0},ckMark={key:'',until:0},ckTimer=null,ckToken=0,ckPhoto=null;
const ckCell=i=>stage.querySelector(`.checkers-layout .checker-cell[data-i="${i}"]`);
const ckSound=()=>{const S=window.SudomiSound;if(!S)return;try{S.play('clack');setTimeout(()=>{try{S.play('pop')}catch(_){}},90)}catch(_){}};
const ckStill=()=>document.documentElement.dataset.fx==='off'||!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const ckPieceHTML=(p,extra='')=>`<span class="checker-piece ${p.toLowerCase()==='r'?'red-piece':'black-piece'} ${extra}">${p===p.toUpperCase()?'<b>'+(window.SudomiBoardArt?SudomiBoardArt.crown():'♛')+'</b>':''}</span>`;
function ckMarkX(i){const cell=ckCell(i);if(cell&&!cell.querySelector('.ck-xm')){cell.classList.add('ck-x');cell.insertAdjacentHTML('beforeend','<i class="ck-xm">✕</i>')}}
function ckAnimate(mv,from){
 const board=stage.querySelector('.checkers-layout .checkers-board'),endCell=ckCell(mv.path[mv.path.length-1]),real=endCell&&endCell.querySelector('.checker-piece');
 if(!board||!real)return;
 const token=++ckToken,br=()=>board.getBoundingClientRect(),size=real.getBoundingClientRect().width;
 const pos=i=>{const r=ckCell(i).getBoundingClientRect(),b=br();return {x:r.left-b.left+(r.width-size)/2,y:r.top-b.top+(r.height-size)/2}};
 const fly=real.cloneNode(true);fly.classList.add('ck-fly');fly.classList.remove('winning-piece');
 const p0=pos(mv.path[from]);Object.assign(fly.style,{width:size+'px',height:size+'px',transform:`translate(${p0.x}px,${p0.y}px)`});
 real.style.visibility='hidden';board.appendChild(fly);
 const ghosts={};   // pieces that are about to be captured stay on the board until the jump passes over them
 for(let k=from;k<mv.caps.length;k++){const c=mv.caps[k],cell=c&&ckCell(c.i);if(!cell)continue;cell.insertAdjacentHTML('beforeend',ckPieceHTML(c.p,'ck-ghost'));ghosts[k]=cell.lastElementChild}
 let k=from;
 // safety net: if the browser pauses the animation (app in the background), finish at once so no piece stays hidden
 const total=mv.caps.slice(from).reduce((s,c)=>s+(c?580:330),0);
 setTimeout(()=>{if(token!==ckToken||!document.body.contains(fly))return;ckToken++;fly.remove();real.style.visibility='';Object.values(ghosts).forEach(x=>x.remove());mv.caps.forEach((c,q)=>{if(c&&q>=k)ckMarkX(c.i)})},total+900);
 const step=()=>{
  if(token!==ckToken||!document.body.contains(fly))return;
  if(k>=mv.path.length-1){fly.remove();real.style.visibility='';return}
  const a=pos(mv.path[k]),b=pos(mv.path[k+1]),cap=mv.caps[k];
  const dur=cap?420:280;fly.animate([{transform:`translate(${a.x}px,${a.y}px) scale(1)`},{transform:`translate(${(a.x+b.x)/2}px,${(a.y+b.y)/2}px) scale(${cap?1.18:1.08})`,offset:.5},{transform:`translate(${b.x}px,${b.y}px) scale(1)`}],{duration:dur,easing:'ease-in-out',fill:'forwards'});
  setTimeout(()=>{if(token!==ckToken){if(cap)ckSound();return}if(cap){ckSound();if(ghosts[k])ghosts[k].remove();ckMarkX(cap.i)}k++;setTimeout(step,cap?90:30)},dur);   // a timer, not the animation's own event: that one does not fire while the page is not being drawn
 };
 setTimeout(step,40);   // 0.2.81: let the freshly drawn board settle first, so the first frames are not dropped
}
const ckOppSide=g=>wifi.active?(wifi.player===0?'b':'r'):g.mode==='pve'?'b':(g.last?g.last.side:null);
function ckPhotoHTML(mv,canReplay,flip){
 const step=new Map(mv.path.map((sq,k)=>[sq,k])),caps=mv.caps.filter(Boolean),capAt=new Set(caps.map(c=>c.i)),end=mv.path[mv.path.length-1],mover=mv.before[mv.path[0]]||(mv.side==='r'?'r':'b');
 const cells=seatOrder(64,flip).map(i=>{const p=mv.before[i],dark=((i/8|0)+i%8)%2===1,k=step.get(i);return `<span class="checker-cell ${dark?'dark-square':'light-square'} ${k!=null?'ck-trail':''} ${capAt.has(i)?'ck-x':''}">${p?ckPieceHTML(p):i===end?ckPieceHTML(mover,'ck-ghost'):''}${capAt.has(i)?'<i class="ck-xm">✕</i>':''}${k!=null?`<em class="ck-n">${k===0?'inicio':k}</em>`:''}</span>`}).join('');
 return `<div class="ck-photo" id="ckPhotoBox"><div class="ck-photo-card"><p>ÚLTIMA JUGADA</p><h3>${mv.side==='r'?'🔴 Rojas':'⚫ Negras'}: ${caps.length?`comió ${caps.length} ficha${caps.length>1?'s':''}`:'movió una ficha'}</h3><div class="checkers-board ck-mini">${cells}</div><small>Amarillo: el recorrido · ✕ roja: fichas comidas</small><div class="ck-photo-btns"><button id="ckReplay" ${canReplay?'':'disabled'}>▶ Ver de nuevo</button><button id="ckPhotoClose">Cerrar</button></div></div></div>`;
}
function renderCheckers(){let g=game,flip=wifi.active&&wifi.player===1,chips=seatChips('checkers',flip),title=g.busy?'Turno de la computadora…':g.over||g.msg,celebrate=localWinPending(),winningSide=g.over?.startsWith('Rojas')?'r':'b',BA=window.SudomiBoardArt,mv=g.last&&g.last.path&&g.last.path.length>1?g.last:null,lastMv=BA&&!mv?BA.moved(g,g.b):new Set();let fresh=-1;const trail=new Set(),xs=new Set();if(mv){const steps=mv.path.length-1,from=ckSeen.id===mv.id?Math.min(ckSeen.steps,steps):0,key=mv.id+':'+steps;if(from<steps){fresh=from;ckSeen={id:mv.id,steps};ckMark={key,until:Date.now()+5000+(steps-from)*450};clearTimeout(ckTimer);ckTimer=setTimeout(()=>{stage.querySelectorAll('.checkers-layout .ck-xm').forEach(e=>e.remove());stage.querySelectorAll('.checkers-layout .ck-trail,.checkers-layout .ck-x').forEach(e=>e.classList.remove('ck-trail','ck-x'))},ckMark.until-Date.now())}if(ckMark.key===key&&Date.now()<ckMark.until){mv.path.forEach(i=>trail.add(i));mv.caps.forEach((c,k)=>{if(c&&(fresh<0||k<fresh))xs.add(c.i)})}}const oppMv=(g.lastBy&&g.lastBy[ckOppSide(g)])||null;const tray=(n,color)=>`<aside class="captured-tray ${color}"><strong>${color==='red-captures'?'🔴':'⚫'}</strong><small>${n.length} capturadas</small><div>${n.map(p=>`<i class="captured-piece ${color}">${p===p.toUpperCase()?'♛':'●'}</i>`).join('')}</div></aside>`;shell('Damas',title,`<div class="ck-bar"><span>${g.over?'Fin de la partida':g.turn==='r'?'🔴 Juegan rojas':'⚫ Juegan negras'}</span><button class="mini-tool" id="ckLast" ${oppMv?'':'disabled'}>📷 Última jugada</button></div>${chips[0]}<div class="checkers-layout">${tray(g.captured[0],'red-captures')}<div class="checkers-board">${seatOrder(g.b.length,flip).map(i=>{let p=g.b[i],dark=((i/8|0)+i%8)%2===1,move=g.moves.some(m=>m.to===i),cap=g.moves.some(m=>m.to===i&&m.capture);return `<button class="checker-cell ${dark?'dark-square':'light-square'} ${i===g.sel?'chosen':''} ${move?'possible':''} ${cap?'capture-target':''} ${lastMv.has(i)?'last-move':''} ${trail.has(i)?'ck-trail':''} ${xs.has(i)?'ck-x':''}" data-i="${i}" aria-label="${p?pieceName(p):'casilla'}" ${g.busy||!localTurn()?'disabled':''}>${p?`<span class="checker-piece ${p.toLowerCase()==='r'?'red-piece':'black-piece'} ${celebrate&&p.toLowerCase()===winningSide?'winning-piece':''}">${p===p.toUpperCase()?'<b>'+(BA?BA.crown():'♛')+'</b>':''}</span>`:''}${xs.has(i)?'<i class="ck-xm">✕</i>':''}</button>`}).join('')}</div>${tray(g.captured[1],'black-captures')}</div>${chips[1]}${ckPhoto?ckPhotoHTML(ckPhoto,!!g.last&&g.last.id===ckPhoto.id,flip):''}<p class="board-hint">${wifi.active?`Estás jugando como Jugador ${wifi.player+1}. `:''}Rojas 🔴 vs negras ⚫ · captura obligatoria · coronación automática.</p>`);stage.querySelectorAll('.checkers-layout .checker-cell').forEach(b=>b.onclick=()=>{if(!localTurn())return;g.click(+b.dataset.i);publishWifi();render()});const lastBtn=$('#ckLast');if(lastBtn)lastBtn.onclick=()=>{if(oppMv){ckPhoto=oppMv;render()}};const pc=$('#ckPhotoClose');if(pc){const shut=()=>{ckPhoto=null;render()};pc.onclick=shut;$('#ckPhotoBox').onclick=e=>{if(e.target.id==='ckPhotoBox')shut()};$('#ckReplay').onclick=()=>{const m=ckPhoto;ckPhoto=null;ckSeen={id:'',steps:0};render();if(m&&ckSeen.id!==m.id)ckAnimate(m,0)}}if(fresh>=0&&mv){if(ckStill()){mv.caps.forEach((c,k)=>{if(c&&k>=fresh)ckMarkX(c.i)});if(mv.caps.slice(fresh).some(Boolean))ckSound()}else ckAnimate(mv,fresh)}}
function pieceName(p){return p.toLowerCase()==='r'?'Ficha roja':'Ficha negra'}

// Chess: standard local two-player movement, check, checkmate, stalemate, castling, queen promotion.
const INIT_CHESS=['rnbqkbnr','pppppppp','........','........','........','........','PPPPPPPP','RNBQKBNR'];
const CHESS_VAL={p:100,n:320,b:330,r:500,q:900,k:20000};
class Chess{
 constructor(mode='pve'){this.mode=mode;this.busy=false;this.b=INIT_CHESS.join('').split('').map(x=>x==='.'?'':x);this.turn='w';this.sel=-1;this.moves=[];this.done='';this.last=null;this.lastBy={w:null,b:null};this.msg=mode==='pve'?'Blancas vs computadora · tu turno.':'Juegan blancas · pasan el dispositivo.';this.castle={K:true,Q:true,k:true,q:true}}
 color(p){return p===p.toUpperCase()?'w':'b'}
 at(r,c){return r<0||r>7||c<0||c>7?-1:r*8+c}
 pseudo(i,attacksOnly=false){let p=this.b[i];if(!p)return[];let w=this.color(p)==='w',r=i/8|0,c=i%8,k=p.toLowerCase(),out=[],add=(rr,cc)=>{let j=this.at(rr,cc);if(j>=0&&(attacksOnly||!this.b[j]||this.color(this.b[j])!==this.color(p)))out.push(j)};
  if(k==='p'){let d=w?-1:1;if(attacksOnly){add(r+d,c-1);add(r+d,c+1)}else{if(this.at(r+d,c)>=0&&!this.b[this.at(r+d,c)]){out.push(this.at(r+d,c));let start=w?6:1;if(r===start&&!this.b[this.at(r+2*d,c)])out.push(this.at(r+2*d,c))}for(let dc of [-1,1]){let j=this.at(r+d,c+dc);if(j>=0&&this.b[j]&&this.color(this.b[j])!==this.color(p))out.push(j)}}return out}
  if(k==='n'){for(let [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]])add(r+dr,c+dc);return out}
  if(k==='k'){for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++)if(dr||dc)add(r+dr,c+dc);if(!attacksOnly&&w&&r===7&&c===4){if(this.castle.K&&!this.b[61]&&!this.b[62]&&this.b[63]==='R'&&!this.attacked(60,'b')&&!this.attacked(61,'b')&&!this.attacked(62,'b'))out.push(62);if(this.castle.Q&&!this.b[59]&&!this.b[58]&&!this.b[57]&&this.b[56]==='R'&&!this.attacked(60,'b')&&!this.attacked(59,'b')&&!this.attacked(58,'b'))out.push(58)}if(!attacksOnly&&!w&&r===0&&c===4){if(this.castle.k&&!this.b[5]&&!this.b[6]&&this.b[7]==='r'&&!this.attacked(4,'w')&&!this.attacked(5,'w')&&!this.attacked(6,'w'))out.push(6);if(this.castle.q&&!this.b[3]&&!this.b[2]&&!this.b[1]&&this.b[0]==='r'&&!this.attacked(4,'w')&&!this.attacked(3,'w')&&!this.attacked(2,'w'))out.push(2)}return out}
  let dirs=k==='b'?[[1,1],[1,-1],[-1,1],[-1,-1]]:k==='r'?[[1,0],[-1,0],[0,1],[0,-1]]:[[1,1],[1,-1],[-1,1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];for(let [dr,dc] of dirs){let rr=r+dr,cc=c+dc;while(this.at(rr,cc)>=0){let j=rr*8+cc;if(!this.b[j])out.push(j);else{if(this.color(this.b[j])!==this.color(p)||attacksOnly)out.push(j);break}rr+=dr;cc+=dc}}return out}
 attacked(i,by){for(let s=0;s<64;s++)if(this.b[s]&&this.color(this.b[s])===by&&this.pseudo(s,true).includes(i))return true;return false}
 inCheck(side){let k=this.b.findIndex(p=>p&&(p.toLowerCase()==='k')&&this.color(p)===side);return k>=0&&this.attacked(k,side==='w'?'b':'w')}
 legal(i){let p=this.b[i];return this.pseudo(i).filter(to=>{let old=this.b[to],from=this.b[i];this.b[to]=from;this.b[i]='';let safe=!this.inCheck(this.color(p));this.b[i]=from;this.b[to]=old;return safe})}
 allMoves(side){let a=[];for(let i=0;i<64;i++)if(this.b[i]&&this.color(this.b[i])===side)for(let to of this.legal(i))a.push([i,to]);return a}
 move(i){if(this.done)return;if(this.sel>=0&&this.moves.includes(i)){let p=this.b[this.sel],from=this.sel;this.last={id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),side:this.turn,from,to:i,p,cap:this.b[i]||null,rook:(p==='K'||p==='k')&&Math.abs(i-from)===2?(i>from?[from+3,from+1]:[from-4,from-1]):null,before:this.b.slice()};this.lastBy=this.lastBy||{w:null,b:null};this.lastBy[this.turn]=this.last;this.b[i]=p;this.b[from]='';if(p==='P'&&i<8)this.b[i]='Q';if(p==='p'&&i>=56)this.b[i]='q';if(p==='K'){this.castle.K=this.castle.Q=false;if(i===62){this.b[61]='R';this.b[63]=''}if(i===58){this.b[59]='R';this.b[56]=''}}if(p==='k'){this.castle.k=this.castle.q=false;if(i===6){this.b[5]='r';this.b[7]=''}if(i===2){this.b[3]='r';this.b[0]=''}}if(from===63||i===63)this.castle.K=false;if(from===56||i===56)this.castle.Q=false;if(from===7||i===7)this.castle.k=false;if(from===0||i===0)this.castle.q=false;this.turn=this.turn==='w'?'b':'w';this.sel=-1;this.moves=[];let check=this.inCheck(this.turn),moves=this.allMoves(this.turn);if(!moves.length){this.done=check?(this.turn==='w'?'Jaque mate · ganan negras.':'Jaque mate · ganan blancas.'):'Tablas por ahogado.';this.msg=this.done}else this.msg=`Turno de ${this.turn==='w'?'blancas':'negras'}${check?' · ¡Jaque!':''}`;if(this.mode==='pve'&&this.turn==='b'&&!this.done)this.computer();return}if(this.b[i]&&this.color(this.b[i])===this.turn){this.sel=i;this.moves=this.legal(i)}}
 evalBoard(){let s=0;for(let i=0;i<64;i++){const p=this.b[i];if(!p)continue;const w=p===p.toUpperCase(),r=i>>3,c=i&7,k=p.toLowerCase(),cen=3.5-Math.max(Math.abs(r-3.5),Math.abs(c-3.5));let v=k==='k'?0:CHESS_VAL[k];if(k==='p')v+=(w?6-r:r-1)*7+cen*2;else if(k==='n'||k==='b')v+=cen*9;else if(k==='q')v+=cen*2;else if(k==='r'&&(w?r===1:r===6))v+=12;s+=w?v:-v}return s}
 sim(from,to){const p=this.b[from],cap=this.b[to],u={from,to,p,cap,rf:-1,rt:-1,rp:''};this.b[to]=p;this.b[from]='';if(p==='P'&&to<8)this.b[to]='Q';else if(p==='p'&&to>=56)this.b[to]='q';else if((p==='K'||p==='k')&&Math.abs(to-from)===2){const q=to>from;u.rf=q?from+3:from-4;u.rt=q?from+1:from-1;u.rp=this.b[u.rf];this.b[u.rt]=u.rp;this.b[u.rf]=''}return u}
 unsim(u){this.b[u.from]=u.p;this.b[u.to]=u.cap;if(u.rf>=0){this.b[u.rf]=u.rp;this.b[u.rt]=''}}
 pseudoList(side){const out=[];for(let i=0;i<64;i++){const p=this.b[i];if(!p||this.color(p)!==side)continue;for(const to of this.pseudo(i)){const t=this.b[to];out.push({from:i,to,s:t?CHESS_VAL[t.toLowerCase()]*10-CHESS_VAL[p.toLowerCase()]:0})}}return out}
 // Negamax with alpha-beta. Inner plies use pseudo-legal moves: capturing a king is worth a fortune, which also teaches the engine to respect checks.
 search(d,alpha,beta,side){if(d===0)return (side==='w'?1:-1)*this.evalBoard();const moves=this.pseudoList(side);if(!moves.length)return 0;moves.sort((a,b)=>b.s-a.s);const opp=side==='w'?'b':'w';let best=-Infinity;for(const m of moves){const u=this.sim(m.from,m.to);const sc=u.cap&&u.cap.toLowerCase()==='k'?100000+d:-this.search(d-1,-beta,-alpha,opp);this.unsim(u);if(sc>best)best=sc;if(sc>alpha)alpha=sc;if(alpha>=beta)break}return best}
 bestMove(){const root=this.allMoves('b');if(!root.length)return null;if(root.length===1)return root[0];const saved=this.castle,pieces=this.b.filter(Boolean).length,depth=pieces<=10?4:3;let best=null,bestScore=-Infinity;try{this.castle={K:false,Q:false,k:false,q:false};for(const [from,to] of root){const u=this.sim(from,to);let sc;if(u.cap&&u.cap.toLowerCase()==='k')sc=100000;else if(this.inCheck('w')&&!this.allMoves('w').length)sc=90000;else sc=-this.search(depth-1,-Infinity,Infinity,'w');this.unsim(u);sc+=Math.random()*5;if(sc>bestScore){bestScore=sc;best=[from,to]}}}finally{this.castle=saved}return best}
 computer(){this.busy=true;const self=this;setTimeout(()=>{if(game!==self||self.done)return;let mv=null;try{mv=self.bestMove()}catch(e){console.warn('SUDOMI chess AI:',e)}if(!mv){const all=self.allMoves('b');if(all.length)mv=all[Math.random()*all.length|0]}if(mv){self.sel=mv[0];self.moves=self.legal(mv[0]);self.busy=false;self.move(mv[1])}else self.busy=false;render()},400)}
}
/* 0.2.80 — Ajedrez gets what Damas got in 0.2.80: the piece travels to its square (the rook too when castling),
 * a capture sounds and leaves a small red ✕, the two squares of the move are bright yellow for about 5 seconds,
 * and "📷 Última jugada" shows a picture of the rival's last move. The move is recorded in Chess.move(). */
let chSeen='',chMark={id:'',until:0},chTimer=null,chToken=0,chPhoto=null;
const chCell=i=>stage.querySelector(`.chess-main .chess-cell[data-i="${i}"]`);
const CH_GLYPH={r:'♜',n:'♞',b:'♝',q:'♛',k:'♚',p:'♟',R:'♖',N:'♘',B:'♗',Q:'♕',K:'♔',P:'♙'},CH_NAME={p:'un peón',n:'un caballo',b:'un alfil',r:'una torre',q:'la dama',k:'el rey'};
const chArt=p=>window.SudomiBoardArt?SudomiBoardArt.chess(p):CH_GLYPH[p];
function chMarkX(i){const cell=chCell(i);if(cell&&!cell.querySelector('.ch-xm'))cell.insertAdjacentHTML('beforeend','<i class="ch-xm">✕</i>')}
function chAnimate(mv){
 const board=stage.querySelector('.chess-main');if(!board||!chCell(mv.to)||!chCell(mv.from))return;
 const token=++chToken,DUR=360,b0=board.getBoundingClientRect(),flies=[];
 const rect=i=>{const r=chCell(i).getBoundingClientRect();return {x:r.left-b0.left-board.clientLeft,y:r.top-b0.top-board.clientTop,w:r.width,h:r.height}};
 let ghost=null;
 if(mv.cap){ghost=document.createElement('span');ghost.className='ch-ghost';ghost.innerHTML=chArt(mv.cap);chCell(mv.to).appendChild(ghost)}   // the captured piece stays until the other one arrives
 const pairs=[[mv.from,mv.to,mv.p]];if(mv.rook&&chCell(mv.rook[0])&&chCell(mv.rook[1]))pairs.push([mv.rook[0],mv.rook[1],mv.side==='w'?'R':'r']);
 for(const [f,to,p] of pairs){
  const a=rect(f),z=rect(to),cs=getComputedStyle(chCell(to)),fly=document.createElement('span');
  fly.className='ch-fly';fly.innerHTML=chArt(p);
  Object.assign(fly.style,{width:a.w+'px',height:a.h+'px',fontSize:cs.fontSize,color:cs.color,transform:`translate(${a.x}px,${a.y}px)`});
  chCell(to).classList.add('ch-hide');board.appendChild(fly);
  fly.animate([{transform:`translate(${a.x}px,${a.y}px) scale(1)`},{transform:`translate(${(a.x+z.x)/2}px,${(a.y+z.y)/2}px) scale(1.22)`,offset:.5},{transform:`translate(${z.x}px,${z.y}px) scale(1)`}],{duration:DUR,easing:'ease-in-out',fill:'forwards'});
  flies.push([fly,to]);
 }
 // a timer, not the animation's own event (that one does not fire while the page is not being drawn)
 setTimeout(()=>{flies.forEach(([fly,to])=>{fly.remove();const c=chCell(to);if(c)c.classList.remove('ch-hide')});if(ghost)ghost.remove();if(token!==chToken)return;if(mv.cap){ckSound();chMarkX(mv.to)}},DUR+20);
}
const chOppSide=g=>wifi.active?(wifi.player===0?'b':'w'):g.mode==='pve'?'b':(g.last?g.last.side:null);
function chPhotoHTML(mv,canReplay,flip){
 const cells=seatOrder(64,flip).map(i=>{const p=mv.before[i],r=i/8|0,c=i%8,on=i===mv.from||i===mv.to||(mv.rook&&mv.rook.includes(i));return `<span class="chess-cell ${(r+c)%2?'dark-square':'light-square'} ${on?'ck-trail':''}">${p?chArt(p):i===mv.to?`<span class="ch-ghost still">${chArt(mv.p)}</span>`:''}${i===mv.to&&mv.cap?'<i class="ck-xm">✕</i>':''}${i===mv.from?'<em class="ck-n">inicio</em>':i===mv.to?'<em class="ck-n">1</em>':''}</span>`}).join('');
 const name=CH_NAME[mv.p.toLowerCase()],what=mv.rook?'se enrocó':mv.cap?`comió ${CH_NAME[mv.cap.toLowerCase()]} con ${name}`:`movió ${name}`;
 return `<div class="ck-photo" id="chPhotoBox"><div class="ck-photo-card"><p>ÚLTIMA JUGADA</p><h3>${mv.side==='w'?'⚪ Blancas':'⚫ Negras'}: ${what}</h3><div class="chess-board ck-mini">${cells}</div><small>Amarillo: de dónde salió y a dónde llegó · ✕ roja: pieza comida</small><div class="ck-photo-btns"><button id="chReplay" ${canReplay?'':'disabled'}>▶ Ver de nuevo</button><button id="chPhotoClose">Cerrar</button></div></div></div>`;
}
function renderChess(){let g=game,flip=wifi.active&&wifi.player===1,chips=seatChips('chess',flip),symbols={r:'♜',n:'♞',b:'♝',q:'♛',k:'♚',p:'♟',R:'♖',N:'♘',B:'♗',Q:'♕',K:'♔',P:'♙'},celebrate=localWinPending(),losingKing=g.done.includes('ganan blancas')?'k':'K',BA=window.SudomiBoardArt,mv=g.last&&g.last.before?g.last:null,lastMv=BA&&!mv?BA.moved(g,g.b):new Set();let fresh=false;const trail=new Set();if(mv){if(chSeen!==mv.id){fresh=true;chSeen=mv.id;chMark={id:mv.id,until:Date.now()+5400};clearTimeout(chTimer);chTimer=setTimeout(()=>{stage.querySelectorAll('.chess-main .ch-xm').forEach(e=>e.remove());stage.querySelectorAll('.chess-main .ck-trail').forEach(e=>e.classList.remove('ck-trail'))},5400)}if(chMark.id===mv.id&&Date.now()<chMark.until){trail.add(mv.from);trail.add(mv.to);if(mv.rook)mv.rook.forEach(i=>trail.add(i))}}const showX=i=>mv&&mv.cap&&i===mv.to&&!fresh&&trail.has(i),oppMv=(g.lastBy&&g.lastBy[chOppSide(g)])||null;shell('Ajedrez',g.busy?'Turno de la computadora…':g.done||g.msg,`<div class="ck-bar"><span>${g.done?'Fin de la partida':g.turn==='w'?'⚪ Juegan blancas':'⚫ Juegan negras'}</span><button class="mini-tool" id="chLast" ${oppMv?'':'disabled'}>📷 Última jugada</button></div>${chips[0]}<div class="chess-board chess-main">${seatOrder(g.b.length,flip).map(i=>{let p=g.b[i],r=i/8|0,c=i%8,dc=flip?7-c:c,dr=flip?7-r:r;return `<button class="chess-cell ${(r+c)%2?'dark-square':'light-square'} ${r>=6?'white-piece-square':''} ${g.sel===i?'chosen':''} ${g.moves.includes(i)?'possible':''} ${g.moves.includes(i)&&p?'capture-target':''} ${lastMv.has(i)?'last-move':''} ${trail.has(i)?'ck-trail':''} ${celebrate&&p===losingKing?'mated-king':''}" data-i="${i}" aria-label="${!p?'Casilla vacía':symbols[p]+' '+String.fromCharCode(97+c)+(8-r)}" ${(g.busy||!localTurn()||g.mode==='pve'&&g.turn==='b')?'disabled':''}>${dc===0?`<i class="co rk">${8-r}</i>`:''}${dr===7?`<i class="co fl">${String.fromCharCode(97+c)}</i>`:''}${p?(BA?BA.chess(p):symbols[p]):''}${showX(i)?'<i class="ch-xm">✕</i>':''}</button>`}).join('')}</div>${chips[1]}${chPhoto?chPhotoHTML(chPhoto,!!g.last&&g.last.id===chPhoto.id,flip):''}<p class="board-hint">${g.mode==='pve'?'Tú juegas con blancas · computadora con negras':wifi.active?`Estás jugando como ${wifi.player===0?'blancas':'negras'}.`:'Dos jugadores · enroque y promoción a dama · sin captura al paso.'}</p>`);stage.querySelectorAll('.chess-main .chess-cell').forEach(b=>b.onclick=()=>{if(!localTurn())return;g.move(+b.dataset.i);publishWifi();render()});const lastBtn=$('#chLast');if(lastBtn)lastBtn.onclick=()=>{if(oppMv){chPhoto=oppMv;render()}};const pc=$('#chPhotoClose');if(pc){const shut=()=>{chPhoto=null;render()};pc.onclick=shut;$('#chPhotoBox').onclick=e=>{if(e.target.id==='chPhotoBox')shut()};$('#chReplay').onclick=()=>{chPhoto=null;chSeen='';render()}}if(fresh&&mv){if(ckStill()){if(mv.cap){ckSound();chMarkX(mv.to)}}else chAnimate(mv)}}

init();
// 0.2.29: wait until every script has loaded — DOS and STOP live in files that load after this one,
// so before this fix an invitation link to a DOS room only opened the games menu
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',handleInvite);else handleInvite();
})();
