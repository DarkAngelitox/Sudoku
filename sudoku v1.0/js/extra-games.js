/* SUDOMI 0.2.13 — two-player arcade games (same device or same Wi-Fi).
 *
 * Every game is a small state machine:
 *     create(id, mode)            -> fresh game state (plain, JSON-serialisable data)
 *     apply(id, game, player, a)  -> applies one action ({a:'play', i:3, ...}) if it is legal
 *     view(id, game, forPlayer)   -> copy of the state with the OTHER player's secrets removed
 *     render(id, game, ctx)       -> {html, bind}
 *
 * Wi-Fi is host-authoritative: the guest never changes the state itself, it sends its
 * action to the host, the host applies it and sends back a view() that hides the host's
 * cards. Pass-and-play hides hands behind a "pass the device" curtain.
 */
(()=>{
'use strict';

/* ---------- small helpers ---------- */
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};   // Fisher–Yates
const pick=a=>a[Math.floor(Math.random()*a.length)];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let seq=0;const uid=()=>'k'+(++seq).toString(36)+Math.random().toString(36).slice(2,6);
const inRange=(i,n)=>Number.isInteger(i)&&i>=0&&i<n;
const names={domino:'Dominó',memory:'Memoria de animales',dotsboxes:'Puntos y cajas',stop:'STOP',mahjong:'Duelo Mahjong',blackjack:'Blackjack',poker:'Póker',escoba:'Escoba',rummy:'Rummy',slide:'Fichas deslizantes'};

/* ---------- decks ---------- */
const SUITS=['♠','♥','♦','♣'];
const stdDeck=()=>shuffle(SUITS.flatMap(s=>Array.from({length:13},(_,i)=>({s,v:i+1,id:uid()}))));
const spanishDeck=()=>shuffle(['Oros','Copas','Espadas','Bastos'].flatMap(s=>[1,2,3,4,5,6,7,10,11,12].map(v=>({s,v,id:uid()}))));

/* ---------- shared state helpers ---------- */
function base(id,mode){return {id,mode,turn:0,over:false,winner:null,message:'',curtain:false,fx:[]}}
function win(g,p,msg){g.over=true;g.winner=p;g.curtain=false;g.message=msg||`Jugador ${p+1} gana.`}
// Hand the turn over. On one shared device the next player must not see the hand, so raise the curtain.
function pass(g){g.turn=1-g.turn;if(!g.wifi&&g.mode!=='pve'&&!g.over)g.curtain=true}
const sideWinner=(a,b)=>a===b?-1:a>b?0:1;

function create(id,mode='pve',opts){
 const g=base(id,mode);if(opts&&opts.seats)g.seats=opts.seats;
 ({domino:newDomino,memory:newMemory,dotsboxes:newDots,stop:newStop,mahjong:newMahjong,blackjack:newBlackjack,poker:newPoker,escoba:newEscoba,rummy:newRummy,slide:newSlide})[id](g);
 return g;
}

/* =====================================================================
 * DOMINÓ — 4 players in 2 teams (seats 0+2 against 1+3), double-six, 7 tiles each, no stock: all 28 tiles are dealt.
 * The highest double opens the first hand; later hands are opened by the team that won the previous one. Someone with no tile that fits passes
 * automatically. A hand ends when a player runs out of tiles (the team scores ALL the pips left in the other three hands) or when four passes in a
 * row block the table (the team with fewer pips wins and scores them all; a tie scores nothing). First team to DOM_TARGET points wins the match.
 * Seats: g.seats[p] = {name, avatar, bot}. Bots are driven from outside (botAct) so the same rules work for 1–4 people.
 * ===================================================================== */
const dTotal=t=>t[0]+t[1];
const DOM_TARGET=100;
const dTeam=p=>p%2;
const dName=(g,p)=>(g.seats&&g.seats[p]&&g.seats[p].name)||`Jugador ${p+1}`;
function newDomino(g,keep){
 const all=[];for(let a=0;a<=6;a++)for(let b=a;b<=6;b++)all.push([a,b]);shuffle(all);
 g.n=4;g.hands=[0,1,2,3].map(i=>all.slice(i*7,i*7+7));g.row=[];g.mid=0;g.sel=-1;g.passes=0;g.phase='play';g.summary=null;g.stock=[];g.first=null;g.over=false;g.winner=null;g.lastPlayer=-1;g.blocker=-1;g.bonus=[0,0];g.bonusLog=[];g.corrido='';
 g.score=keep?keep.score.slice():[0,0];g.handNo=keep?keep.handNo:1;
 if(!g.sips){g.sips=[0,0,0,0];g.drunk=[0,0,0,0];g.say=[];g.sayN=0}   // 0.3.30: vaso de cerveza y globos (Mesa 3D); siguen de una mano a la otra
 if(!g.seats)g.seats=[0,1,2,3].map(i=>({name:`Jugador ${i+1}`}));
 if(keep&&keep.opener!=null){g.turn=keep.opener;g.message=`${dName(g,g.turn)} abre la mano ${g.handNo}.`}
 else{
  let best=-1,who=0,tile=null;
  g.hands.forEach((h,p)=>h.forEach(t=>{const s=(t[0]===t[1]?100:0)+dTotal(t);if(s>best){best=s;who=p;tile=t}}));
  g.turn=who;g.first=tile?[tile[0],tile[1]]:null;g.message=`${dName(g,who)} tiene el doble 6 y abre la partida.`;
 }
 g.fx=[];dCurtain(g);
}
// local multiplayer (one device, 4 people): hide the hand behind the pass-the-device curtain at every change of player
function dCurtain(g){g.curtain=g.mode==='pvp'&&!g.wifi&&!g.over&&g.phase==='play'}
const dEnds=g=>g.row.length?[g.row[0][0],g.row[g.row.length-1][1]]:null;
const dFits=(g,t)=>{
 if(!g.row.length)return !g.first||(t[0]===g.first[0]&&t[1]===g.first[1]);      // the very first tile of the match is forced
 const e=dEnds(g);return t[0]===e[0]||t[1]===e[0]||t[0]===e[1]||t[1]===e[1];
};
const dPlayable=(g,p)=>g.hands[p].some(t=>dFits(g,t));
/* 0.3.30 — MESA 3D: el vaso de cerveza y los globos de conversación son parte del estado de la partida (así los ven todos, también online).
 *   g.sips[p]  = tragos que lleva p de su vaso · a los D3_SIPS se acaba el vaso y p queda borracho D3_TURNS turnos suyos (g.drunk[p])
 *   g.say      = últimos globos: {p, text, n}; n crece siempre (g.sayN), así la pantalla sabe cuáles son nuevos
 * No cambian ninguna regla del dominó: son adorno. La vista clásica los ignora. */
const D3_SIPS=5,D3_TURNS=2;   // 0.3.32 (dueño): la primera borrachera dura 2 turnos; se puede seguir bebiendo borracho y cada 5 tragos más suman 1 turno
function dSay(g,p,text){g.say=g.say||[];g.sayN=(g.sayN|0)+1;g.say.push({p,text,n:g.sayN});if(g.say.length>6)g.say.shift()}
function dSip(g,who){
 if(!g.sips){g.sips=[0,0,0,0];g.drunk=[0,0,0,0]}
 if(!inRange(who,4))return;
 g.sips[who]++;g.sipN=(g.sipN|0)+1;g.sipBy=who;
 if(g.sips[who]>=D3_SIPS){                                   // se acabó el vaso (le sirven otro)
  g.sips[who]=0;
  if(g.drunk[who]>0){g.drunk[who]++;dSay(g,who,'¡Otra ronda!')}
  else{g.drunk[who]=D3_TURNS;dSay(g,(who+2)%4,`Perdimos a ${dName(g,who)}`);dSay(g,(who+1)%4,'Ete loco ta borracho')}
 }else if(g.sips[who]===1&&!g.drunk[who])dSay(g,who,'¡Salud!');
}
const dSober=(g,p)=>{if(g.drunk&&g.drunk[p]>0)g.drunk[p]--};
const DOM_BONUS=25;   // 0.3.14: premios dominicanos (capicúa y pase corrido); se suman al terminar la mano
function dHandEnd(g,winnerSeat,blocked,capicua){
 g.bonus=g.bonus||[0,0];g.bonusLog=g.bonusLog||[];
 if(capicua&&winnerSeat>=0){g.bonus[dTeam(winnerSeat)]+=DOM_BONUS;g.bonusLog.push(`¡Capicúa de ${dName(g,winnerSeat)}! (+${DOM_BONUS})`)}
 const pips=g.hands.map(h=>h.reduce((s,t)=>s+dTotal(t),0)),all=pips.reduce((a,b)=>a+b,0);
 let team=-1,pts=0,txt;
 if(!blocked){team=dTeam(winnerSeat);pts=all;txt=`¡Dominó! ${dName(g,winnerSeat)} se quedó sin fichas.`;g.nextOpener=winnerSeat}
 else{
  // tranque: only the player who closed the table and the one who plays after them are compared (fewer points wins; the two hands are what is scored)
  const b=g.lastPlayer>=0?g.lastPlayer:g.turn,nx=(b+1)%4,pb=pips[b],pn=pips[nx];g.blocker=b;
  if(pb===pn){txt=`🔒 ¡Tranque de ${dName(g,b)}! Empata con ${dName(g,nx)} (${pb} puntos cada uno): no suma nadie.`;g.nextOpener=b}
  else{const w=pb<pn?b:nx;team=dTeam(w);pts=pb+pn;txt=`🔒 ¡Tranque de ${dName(g,b)}! Se comparan solo ${dName(g,b)} (${pb}) y ${dName(g,nx)} (${pn}): gana ${dName(g,w)}.`;g.nextOpener=w}
 }
 if(team>=0)g.score[team]+=pts;
 const prem=g.bonusLog.length?` Premios: ${g.bonusLog.join(' · ')}.`:'';
 g.score[0]+=g.bonus[0];g.score[1]+=g.bonus[1];txt+=prem;
 g.summary={team,pts,pips,blocked,text:txt,bonus:g.bonus.slice()};g.phase='handend';g.fx=[];g.curtain=false;
 g.message=`${txt}${team>=0?` El equipo ${team?'B':'A'} suma ${pts}${g.bonus[team]?' + '+g.bonus[team]+' de premio':''}.`:''}`;
 if(g.score[0]>=DOM_TARGET||g.score[1]>=DOM_TARGET){
  g.over=true;g.winTeam=g.score[0]>=g.score[1]?0:1;g.winner=g.winTeam;
  g.message=`${txt} ¡El equipo ${g.winTeam?'B':'A'} gana la partida: ${g.score[0]} a ${g.score[1]}!`;
 }
}
// A pass: one more in a row (four = the table is blocked) and the turn goes to the next seat.
// 0.3.14: PASE CORRIDO = después de tu ficha pasan los otros tres y te vuelve a tocar (y tú sí puedes jugar): premio para tu pareja
function dPass(g,p){
 dSober(g,p);dSay(g,p,'Toc toc… paso');
 g.passes++;if(g.passes>=4){dHandEnd(g,-1,true);return false}
 g.turn=(p+1)%4;
 if(g.passes===3&&g.lastPlayer>=0&&g.turn===g.lastPlayer&&dPlayable(g,g.turn)){const tm=dTeam(g.turn);g.bonus=g.bonus||[0,0];g.bonus[tm]+=DOM_BONUS;g.bonusLog=(g.bonusLog||[]).concat(`Pase corrido de ${dName(g,g.turn)} (+${DOM_BONUS})`);g.corrido=dName(g,g.turn)}
 return true;
}
// After every change: the computer players pass by themselves when they cannot move; a person has to press the "Pasar" button.
function dSettle(g){
 if(!g.over&&g.phase==='play'&&g.row.length&&[0,1,2,3].every(p=>!dPlayable(g,p))){dHandEnd(g,-1,true);return}
 const passed=[];
 while(!g.over&&g.phase==='play'&&g.row.length&&!dPlayable(g,g.turn)&&g.seats&&g.seats[g.turn]&&g.seats[g.turn].bot){
  passed.push(g.turn);if(!dPass(g,g.turn))return;
 }
 if(passed.length)g.message+=` ${passed.map(p=>dName(g,p)).join(' y ')} ${passed.length>1?'pasaron':'pasó'}.`;
 if(g.corrido&&!g.over&&g.phase==='play'){g.message+=` ¡Pase corrido de ${g.corrido}! +${DOM_BONUS} de premio.`;g.corrido=''}
}
function applyDomino(g,p,a){
 if(g.over)return;
 if(a.a==='sip'){dSip(g,g.wifi?p:(inRange(a.s,4)?a.s:p));return}   // tomar un trago: se puede en cualquier momento, no gasta turno
 if(g.phase==='handend'){if(a.a==='next')newDomino(g,{score:g.score,handNo:g.handNo+1,opener:g.nextOpener});return}
 if(p!==g.turn)return;
 if(a.a==='pass'){
  if(!g.row.length||dPlayable(g,p))return;
  g.ts=(g.ts|0)+1;                       // you may only pass when nothing fits
  g.message=` pasó (toc toc).`;g.fx=[];
  if(dPass(g,p)){dSettle(g);dCurtain(g)}return}
 if(a.a!=='play')return;
 const h=g.hands[p];
 if(!inRange(a.i,h.length))return;
 const t=h[a.i];if(!dFits(g,t))return;
 const e=dEnds(g);let side=a.side;
 if(e){
  const fitL=t[0]===e[0]||t[1]===e[0],fitR=t[0]===e[1]||t[1]===e[1];
  if(fitL&&fitR&&e[0]!==e[1]&&side!=='L'&&side!=='R'){g.sel=a.i;g.message='Esa ficha encaja en los dos extremos: elige dónde ponerla.';return}
  if((side==='L'&&!fitL)||(side==='R'&&!fitR))return;
  if(side!=='L'&&side!=='R')side=fitR?'R':'L';
 }
 // 0.3.14: CAPICÚA = ganar la mano con una ficha (que no sea doble) que encaja en los DOS extremos de la mesa
 const cap=!!e&&h.length===1&&e[0]!==e[1]&&t[0]!==t[1]&&((t[0]===e[0]&&t[1]===e[1])||(t[0]===e[1]&&t[1]===e[0]));
 h.splice(a.i,1);
 if(!e){g.row.push([t[0],t[1]]);g.mid=0;g.first=null;                      // g.mid = index of the opening tile (the table layout snakes out from it in both directions)
  g.look=(g.seats&&g.seats[p]&&g.seats[p].look)||{};g.lookN=(g.lookN|0)+1}   // 0.3.47: QUIEN SACA pone el aspecto de la mesa (fondo, dominós y sillas de la Mesa 3D, js/domino-3d.js)
 else if(side==='L'){g.row.unshift(t[1]===e[0]?[t[0],t[1]]:[t[1],t[0]]);g.mid=(g.mid|0)+1}
 else g.row.push(t[0]===e[1]?[t[0],t[1]]:[t[1],t[0]]);
 g.sel=-1;g.fx=[e?side:'R'];g.passes=0;g.lastPlayer=p;g.ts=(g.ts|0)+1;
 dSober(g,p);
 if(e&&t[0]===t[1])dSay(g,(p+1)%4,'¿Por qué tú te acuesta?');              // puso un doble (va «acostado», cruzado)
 if(!h.length)dSay(g,p,cap?'¡Capicúa!':'¡Dominó!');
 else if(g.seats&&g.seats[p]&&g.seats[p].bot&&Math.random()<.3)dSip(g,p);   // las máquinas también beben
 if(!h.length){dHandEnd(g,p,false,cap);return}
 g.turn=(p+1)%4;g.message=`${dName(g,p)} jugó ${t[0]}|${t[1]}.`;dSettle(g);dCurtain(g);
}

/* =====================================================================
 * MEMORIA DE ANIMALES — a match keeps the turn, a miss passes it.
 * ===================================================================== */
// 0.3.15 (V2, Fase 5): los animales están DIBUJADOS (antes eran emojis, que se ven distintos en cada teléfono). El valor de la ficha es el nombre.
const ANIMALS=['perro','gato','zorro','panda','rana','león','tortuga','búho'];
const EYES=(x1,x2,y,c)=>`<circle cx="${x1}" cy="${y}" r="2.200" fill="${c||'#1c2a3f'}"/><circle cx="${x2}" cy="${y}" r="2.200" fill="${c||'#1c2a3f'}"/>`;
const MEM_ART={
 perro:`<ellipse cx="8" cy="19" rx="5" ry="10" fill="#7a4a21"/><ellipse cx="32" cy="19" rx="5" ry="10" fill="#7a4a21"/><circle cx="20" cy="21" r="13" fill="#c98a4b"/><ellipse cx="20" cy="27" rx="7" ry="5.500" fill="#f3dcc0"/>${EYES(15,25,19)}<ellipse cx="20" cy="24.500" rx="2.600" ry="1.900" fill="#1c2a3f"/><path d="M18 29h4v3a2 2 0 0 1-4 0z" fill="#e2566b"/>`,
 gato:`<path d="M8 17L9 4l9 7zM32 17L31 4l-9 7z" fill="#8d95a6"/><circle cx="20" cy="22" r="13" fill="#aab1c0"/>${EYES(15,25,20,'#2e7d32')}<path d="M18.500 25h3l-1.500 2z" fill="#e2566b"/><path d="M20 27v2M9 25h6M9 28l6-1M31 25h-6M31 28l-6-1" stroke="#1c2a3f" stroke-width=".9" stroke-linecap="round" fill="none"/>`,
 zorro:`<path d="M7 18L8 3l10 9zM33 18L32 3l-10 9z" fill="#e8742a"/><path d="M6 17c4-6 24-6 28 0-2 12-9 19-14 19S8 29 6 17z" fill="#f08a3c"/><path d="M11 24c3 1 6 5 9 12 3-7 6-11 9-12-2 8-6 12-9 12s-7-4-9-12z" fill="#fff"/>${EYES(14.500,25.500,20)}<circle cx="20" cy="33" r="2" fill="#1c2a3f"/>`,
 panda:`<circle cx="9" cy="9" r="5.500" fill="#1c2a3f"/><circle cx="31" cy="9" r="5.500" fill="#1c2a3f"/><circle cx="20" cy="22" r="14" fill="#fff" stroke="#d5dce8" stroke-width=".8"/><ellipse cx="14" cy="20" rx="4" ry="5" fill="#1c2a3f" transform="rotate(20 14 20)"/><ellipse cx="26" cy="20" rx="4" ry="5" fill="#1c2a3f" transform="rotate(-20 26 20)"/>${EYES(14.500,25.500,20,'#fff')}<ellipse cx="20" cy="26.500" rx="2.400" ry="1.700" fill="#1c2a3f"/><path d="M17 30c2 2 4 2 6 0" stroke="#1c2a3f" stroke-width="1" fill="none" stroke-linecap="round"/>`,
 rana:`<circle cx="12" cy="11" r="6" fill="#43a047"/><circle cx="28" cy="11" r="6" fill="#43a047"/><ellipse cx="20" cy="23" rx="15" ry="12" fill="#4caf50"/><circle cx="12" cy="11" r="3.600" fill="#fff"/><circle cx="28" cy="11" r="3.600" fill="#fff"/>${EYES(12,28,11)}<path d="M10 25c6 6 14 6 20 0" stroke="#1b5e20" stroke-width="1.800" fill="none" stroke-linecap="round"/><circle cx="9" cy="24" r="2" fill="#f48fb1" opacity=".7"/><circle cx="31" cy="24" r="2" fill="#f48fb1" opacity=".7"/>`,
 león:`<circle cx="20" cy="20" r="17" fill="#a85f1c"/><g fill="#8a4a12"><circle cx="20" cy="3.500" r="3"/><circle cx="32" cy="8" r="3"/><circle cx="36.500" cy="20" r="3"/><circle cx="32" cy="32" r="3"/><circle cx="20" cy="36.500" r="3"/><circle cx="8" cy="32" r="3"/><circle cx="3.500" cy="20" r="3"/><circle cx="8" cy="8" r="3"/></g><circle cx="20" cy="21" r="11" fill="#f2b84b"/>${EYES(15.500,24.500,19)}<path d="M18 23.500h4l-2 2.500z" fill="#7a3b10"/><path d="M20 26v1.500m0 0c-1.500 2-3.500 2-4.500 .5m4.500-.5c1.500 2 3.500 2 4.500 .5" stroke="#7a3b10" stroke-width="1" fill="none" stroke-linecap="round"/>`,
 tortuga:`<ellipse cx="9" cy="30" rx="4" ry="3" fill="#7cb342"/><ellipse cx="31" cy="30" rx="4" ry="3" fill="#7cb342"/><circle cx="33" cy="20" r="5.500" fill="#8bc34a"/><circle cx="35" cy="18.500" r="1.300" fill="#1c2a3f"/><path d="M4 28a14 14 0 0 1 28 0z" fill="#2e7d32"/><path d="M11 28l3-9h8l3 9M14 19l4-4 4 4M18 28v-9" stroke="#a5d6a7" stroke-width="1.300" fill="none" stroke-linejoin="round"/>`,
 búho:`<path d="M9 9l-2-6 7 3zM31 9l2-6-7 3z" fill="#6d4c41"/><ellipse cx="20" cy="22" rx="14" ry="15" fill="#8d6e63"/><ellipse cx="20" cy="28" rx="8" ry="8" fill="#d7ccc8"/><circle cx="13.500" cy="16" r="6" fill="#fff"/><circle cx="26.500" cy="16" r="6" fill="#fff"/><circle cx="13.500" cy="16" r="3" fill="#ffb300"/><circle cx="26.500" cy="16" r="3" fill="#ffb300"/>${EYES(13.500,26.500,16)}<path d="M18 20h4l-2 4z" fill="#ef6c00"/>`
};
const memArt=v=>MEM_ART[v]?`<svg viewBox="0 0 40 40" aria-hidden="true">${MEM_ART[v]}</svg>`:v;
function newMemory(g){
 g.tiles=shuffle(ANIMALS.flatMap(v=>[v,v])).map((v,i)=>({v,id:i,gone:false,owner:-1}));
 g.open=[];g.pairs=[0,0];g.locked=false;g.message='Voltea dos fichas iguales.';
}
function applyMemory(g,p,a){
 if(g.over||p!==g.turn)return;
 if(a.a==='tile'){
  if(g.locked||g.open.length>=2||!inRange(a.i,16))return;
  const t=g.tiles[a.i];if(t.gone||g.open.includes(a.i))return;
  g.open.push(a.i);g.fx=[a.i];(g.seen=g.seen||{})[a.i]=t.v;       // what the computer player may remember
  if(g.open.length===2){
   const [x,y]=g.open;
   if(g.tiles[x].v===g.tiles[y].v){
    g.tiles[x].gone=g.tiles[y].gone=true;g.tiles[x].owner=g.tiles[y].owner=p;g.pairs[p]++;g.open=[];g.fx=[x,y];
    g.message='¡Pareja! Sigues jugando.';
    if(g.pairs[0]+g.pairs[1]===8)win(g,sideWinner(g.pairs[0],g.pairs[1]),`Memoria terminada · ${g.pairs[0]} a ${g.pairs[1]} parejas`);
   }else{g.locked=true;g.message='No coinciden. Memoriza dónde están.'}
  }
 }else if(a.a==='continue'){
  if(!g.locked)return;
  g.open=[];g.locked=false;g.turn=1-g.turn;g.message=`Turno del Jugador ${g.turn+1}.`;
 }
}

/* =====================================================================
 * PUNTOS Y CAJAS — 4×4 boxes; closing a box scores and gives another move.
 * ===================================================================== */
function newDots(g){g.w=4;g.edges={};g.boxes=Array(16).fill(-1);g.score=[0,0];g.message='Une dos puntos. Si cierras un cuadro, juegas otra vez.'}
function applyDots(g,p,a){
 if(g.over||p!==g.turn||a.a!=='edge')return;
 const k=String(a.k||''),m=/^([hv])(\d+),(\d+)$/.exec(k);if(!m)return;
 const x=+m[2],y=+m[3];
 if(m[1]==='h'&&(x>3||y>4))return;
 if(m[1]==='v'&&(x>4||y>3))return;
 if(g.edges[k]!==undefined)return;
 g.edges[k]=p;g.fx=[k];
 let made=0;
 for(let by=0;by<4;by++)for(let bx=0;bx<4;bx++){
  const ix=by*4+bx;
  if(g.boxes[ix]<0&&[`h${bx},${by}`,`h${bx},${by+1}`,`v${bx},${by}`,`v${bx+1},${by}`].every(z=>g.edges[z]!==undefined)){g.boxes[ix]=p;g.score[p]++;g.fx.push('b'+ix);made++}
 }
 if(Object.keys(g.edges).length===40){win(g,sideWinner(g.score[0],g.score[1]),`Puntos y cajas · ${g.score[0]} a ${g.score[1]}`);return}
 if(made){g.message=made>1?`¡${made} cuadros! Juegas otra vez.`:'¡Cuadro cerrado! Juegas otra vez.'}
 else{g.turn=1-g.turn;g.message=`Turno del Jugador ${g.turn+1}.`}
}

/* =====================================================================
 * STOP — simultaneous on Wi-Fi, one after the other on a shared device.
 * ===================================================================== */
const CATS=['Nombre','Apellido','Animal','País','Ciudad','Comida','Fruta','Verdura','Color','Profesión','Deporte','Equipo deportivo','Artista o cantante','Canción','Película','Serie','Personaje ficticio','Marca','Objeto de la casa','Prenda de vestir','Parte del cuerpo','Transporte','Algo de la escuela','Algo de la playa','Algo que se lleva en una mochila','Algo que da miedo','Algo que se puede regalar','Algo dominicano'];
const LETTERS='ABCDEFGHIJLMNOPRSTUV'.split('');
const STOP_TIME=160,STOP_GRACE=15;      // 0.2.64: 160 s; the STOP button needs all 10 boxes filled (this is the one-phone "legacy" STOP)
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();   // "Ángel" counts as an A word
function newStop(g){
 g.letter=pick(LETTERS);g.questions=shuffle([...CATS]).slice(0,10);g.phase='answer';
 g.answers=[Array(10).fill(''),Array(10).fill('')];g.done=[false,false];g.left=STOP_TIME;g.stopBy=-1;
 g.votes=[Array(10).fill(true),Array(10).fill(true)];g.voted=[false,false];g.points=[0,0];g.rows=[];g.round=uid();
 g.message=`Letra ${g.letter}: completa las 10 categorías.`;
}
function stopToVote(g){g.phase='vote';g.turn=0;g.left=0;g.curtain=!g.wifi;g.message='Revisen las respuestas del rival.'}
function stopScore(g){
 const L=g.letter.toLowerCase();g.points=[0,0];g.rows=[];
 for(let q=0;q<10;q++){
  const row=[0,0];
  for(let p=0;p<2;p++){
   const ans=norm(g.answers[p][q]);
   if(ans&&ans[0]===L&&g.votes[1-p][q]!==false)row[p]=ans===norm(g.answers[1-p][q])?5:10;   // identical answers: 5 each
  }
  g.rows.push(row);g.points[0]+=row[0];g.points[1]+=row[1];
 }
 g.phase='result';
 win(g,sideWinner(g.points[0],g.points[1]),`Puntaje ${g.points[0]} a ${g.points[1]}`);
}
function applyStop(g,p,a){
 if(g.over)return;
 if(g.phase==='answer'&&a.a==='submit'){
  if(g.done[p]||(!g.wifi&&p!==g.turn))return;
  const arr=Array.isArray(a.answers)?a.answers:[];
  if(!a.timeup&&!Array.from({length:10},(_,i)=>String(arr[i]==null?'':arr[i]).trim()).every(Boolean))return;
  g.answers[p]=Array.from({length:10},(_,i)=>String(arr[i]==null?'':arr[i]).trim().slice(0,40));
  g.done[p]=true;
  if(g.wifi){
   if(g.done[0]&&g.done[1])stopToVote(g);
   else{g.stopBy=p;g.left=Math.min(g.left,STOP_GRACE);g.message=`¡STOP! Jugador ${p+1} terminó. Quedan ${g.left} s para el rival.`}
  }else if(p===0){g.turn=1;g.left=STOP_TIME;g.curtain=true;g.message='Ahora responde el Jugador 2.'}
  else stopToVote(g);
 }else if(g.phase==='vote'&&a.a==='votes'){
  if(g.voted[p]||(!g.wifi&&p!==g.turn))return;
  const v=Array.isArray(a.v)?a.v:[];
  g.votes[p]=Array.from({length:10},(_,i)=>v[i]!==false);   // votes[p] = how p judged the OPPONENT's answers
  g.voted[p]=true;
  if(g.voted[0]&&g.voted[1])stopScore(g);
  else if(!g.wifi){g.turn=1;g.curtain=true;g.message='Ahora vota el Jugador 2.'}
  else g.message='Esperando el voto del rival…';
 }
}

/* =====================================================================
 * DUELO MAHJONG — two layers of tiles; only FREE tiles can be matched
 * (nothing on top, and an open left or right side). A match scores and
 * passes the turn, so you think twice before opening tiles for the rival.
 * ===================================================================== */
const MJ_TYPES=['東','南','西','北','中','發','一萬','二萬','一筒','二筒'];
const MJ_POS=[];for(let r=0;r<4;r++)for(let c=0;c<8;c++)MJ_POS.push({l:0,r,c});for(let r=1;r<=2;r++)for(let c=2;c<=5;c++)MJ_POS.push({l:1,r,c});
const mjAt=(l,r,c)=>MJ_POS.findIndex(q=>q.l===l&&q.r===r&&q.c===c);
function mjFree(i,gone){
 if(gone[i])return false;
 const q=MJ_POS[i];
 if(q.l===0){const up=mjAt(1,q.r,q.c);if(up>=0&&!gone[up])return false}
 const L=mjAt(q.l,q.r,q.c-1),R=mjAt(q.l,q.r,q.c+1);
 return !(L>=0&&!gone[L]&&R>=0&&!gone[R]);
}
// Deal by "un-playing" the board so there is always a full solution (never a stuck deal).
function mjDeal(){
 for(let t=0;t<300;t++){
  const gone=Array(40).fill(false),val=Array(40).fill(null),pool=shuffle([...MJ_TYPES,...MJ_TYPES]);let ok=true;
  for(let n=0;n<20;n++){
   const fr=[];for(let i=0;i<40;i++)if(mjFree(i,gone))fr.push(i);
   if(fr.length<2){ok=false;break}
   shuffle(fr);const [x,y]=fr;val[x]=val[y]=pool[n];gone[x]=gone[y]=true;
  }
  if(ok)return val;
 }
 return shuffle([0,1,2,3].flatMap(()=>[...MJ_TYPES]));
}
function mjHasPair(g){
 const gone=g.tiles.map(t=>t.gone),free=[];
 g.tiles.forEach((t,i)=>{if(mjFree(i,gone))free.push(i)});
 return free.some((x,k)=>free.slice(k+1).some(y=>g.tiles[x].v===g.tiles[y].v));
}
function newMahjong(g){g.tiles=mjDeal().map((v,i)=>({v,id:i,gone:false}));g.selected=[];g.score=[0,0];g.message='Elige dos fichas libres iguales. Al hacer pareja, pasa el turno.'}
function applyMahjong(g,p,a){
 if(g.over||p!==g.turn||a.a!=='pick'||!inRange(a.i,40))return;
 const gone=g.tiles.map(t=>t.gone);
 if(!mjFree(a.i,gone)){g.message='Esa ficha está bloqueada: necesita el lado izquierdo o derecho libre y nada encima.';return}
 if(!g.selected.length){g.selected=[a.i];g.message='Ahora busca su pareja entre las fichas libres.';return}
 if(g.selected[0]===a.i){g.selected=[];g.message='Selección cancelada.';return}
 const j=g.selected[0];
 if(g.tiles[j].v!==g.tiles[a.i].v){g.selected=[a.i];g.message='No coinciden. Prueba con otra pareja.';return}
 g.tiles[j].gone=g.tiles[a.i].gone=true;g.score[p]++;g.selected=[];g.fx=[j,a.i];
 if(g.tiles.every(t=>t.gone)){win(g,sideWinner(g.score[0],g.score[1]),`Tablero despejado · ${g.score[0]} a ${g.score[1]} parejas`);return}
 if(!mjHasPair(g)){win(g,sideWinner(g.score[0],g.score[1]),`No quedan parejas libres · ${g.score[0]} a ${g.score[1]}`);return}
 g.turn=1-g.turn;g.message=`¡Pareja! Turno del Jugador ${g.turn+1}.`;
}

/* =====================================================================
 * BLACKJACK — two players against one automatic dealer.
 * ===================================================================== */
function score21(h){let n=0,a=0;for(const c of h){if(!c)continue;if(c.v===1){n+=11;a++}else n+=Math.min(c.v,10)}while(n>21&&a-- >0)n-=10;return n}
function bjDraw(g){if(g.deck.length<8)g.deck=stdDeck().concat(g.deck);return g.deck.pop()}
function newBlackjack(g){
 g.deck=stdDeck();g.hands=[[],[]];g.dealer=[];g.stood=[false,false];g.stage='play';
 for(let k=0;k<2;k++){g.hands[0].push(g.deck.pop());g.hands[1].push(g.deck.pop());g.dealer.push(g.deck.pop())}
 g.hands.forEach((h,p)=>{if(score21(h)===21)g.stood[p]=true});   // a natural 21 plants automatically
 g.message='Acércate a 21 sin pasarte.';
 bjNext(g);
}
function bjNext(g){
 if(g.stood[0]&&g.stood[1]){bjDealer(g);return}
 if(g.stood[g.turn])pass(g);
}
function bjDealer(g){
 while(score21(g.dealer)<17)g.dealer.push(bjDraw(g));
 const v=g.hands.map(score21),d=score21(g.dealer),dealerBust=d>21;
 // 2 = beats the dealer, 1 = push, 0 = loses. If the dealer busts, every player who did not bust wins.
 const res=v.map(n=>n>21?0:(dealerBust||n>d)?2:n===d?1:0);
 let w=-1;
 if(res[0]!==res[1])w=res[0]>res[1]?0:1;
 else if(res[0]===2&&v[0]!==v[1])w=v[0]>v[1]?0:1;   // both beat the dealer: the higher hand wins
 g.stage='done';g.res=res;g.curtain=false;
 const tag=n=>n>21?' (se pasó)':'';
 win(g,w,`J1 ${v[0]}${tag(v[0])} · J2 ${v[1]}${tag(v[1])} · Banca ${d}${tag(d)}`);
}
function applyBlackjack(g,p,a){
 if(g.over||g.stage!=='play'||p!==g.turn)return;
 if(a.a==='hit'){
  const c=bjDraw(g);g.hands[p].push(c);g.fx=[c.id];
  const v=score21(g.hands[p]);
  if(v>=21){g.stood[p]=true;g.message=v>21?`Jugador ${p+1} se pasó de 21.`:`Jugador ${p+1} llegó a 21.`}
  else g.message=`Tienes ${v}.`;
  bjNext(g);
 }else if(a.a==='stand'){g.stood[p]=true;g.message=`Jugador ${p+1} se planta con ${score21(g.hands[p])}.`;bjNext(g)}
}

/* =====================================================================
 * PÓKER — five-card draw, one exchange of up to three cards, no betting.
 * ===================================================================== */
const POKER_NAMES=['Carta alta','Pareja','Doble pareja','Trío','Escalera','Color','Full','Póker','Escalera de color'];
function rankPoker(h){
 const vals=h.map(c=>c.v===1?14:c.v).sort((x,y)=>y-x),cnt={};
 vals.forEach(v=>cnt[v]=(cnt[v]||0)+1);
 // Groups ordered by how many you hold, then by value: that order IS the tie-break order.
 const groups=Object.entries(cnt).map(([v,n])=>[+v,n]).sort((x,y)=>y[1]-x[1]||y[0]-x[0]);
 const flush=h.every(c=>c.s===h[0].s);
 let high=0;
 if(groups.length===5){if(vals[0]-vals[4]===4)high=vals[0];else if(vals.join()==='14,5,4,3,2')high=5}   // A-2-3-4-5 is the lowest straight
 const gv=groups.map(x=>x[0]);let cat,tb;
 if(high&&flush){cat=8;tb=[high]}
 else if(groups[0][1]===4){cat=7;tb=gv}
 else if(groups[0][1]===3&&groups[1][1]===2){cat=6;tb=gv}
 else if(flush){cat=5;tb=vals}
 else if(high){cat=4;tb=[high]}
 else if(groups[0][1]===3){cat=3;tb=gv}
 else if(groups[0][1]===2&&groups[1][1]===2){cat=2;tb=gv}
 else if(groups[0][1]===2){cat=1;tb=gv}
 else{cat=0;tb=vals}
 return cat*15**5+tb.reduce((s,x,i)=>s+x*15**(4-i),0);
}
function pokerName(n){
 const cat=Math.floor(n/15**5);
 return cat===8&&Math.floor((n-cat*15**5)/15**4)===14?'Escalera real':POKER_NAMES[cat]||'Mano';
}
function newPoker(g){
 g.deck=stdDeck();g.hands=[g.deck.splice(0,5),g.deck.splice(0,5)];g.pick=[[],[]];g.stage='swap';
 g.message='Jugador 1: elige hasta 3 cartas para cambiar.';
}
function applyPoker(g,p,a){
 if(g.over||g.stage!=='swap'||p!==g.turn)return;
 if(a.a==='toggle'){
  if(!inRange(a.i,5))return;
  const d=g.pick[p],at=d.indexOf(a.i);
  if(at>=0)d.splice(at,1);else if(d.length<3)d.push(a.i);
 }else if(a.a==='confirm'){
  const h=g.hands[p],out=[...g.pick[p]].sort((x,y)=>y-x);
  out.forEach(i=>h.splice(i,1));
  const fresh=[];for(let n=0;n<out.length;n++){const c=g.deck.pop();h.push(c);fresh.push(c.id)}
  g.pick[p]=[];g.fx=fresh;
  if(p===0){pass(g);g.message='Jugador 2: elige hasta 3 cartas para cambiar.'}
  else{
   const x=rankPoker(g.hands[0]),y=rankPoker(g.hands[1]);g.stage='show';
   win(g,sideWinner(x,y),`J1 ${pokerName(x)} · J2 ${pokerName(y)}`);
  }
 }
}

/* =====================================================================
 * ESCOBA — Spanish deck; capture combinations that add up to 15.
 * Rounds score: most cards, most oros, 7 de oros, most sevens, and escobas (sweeps).
 * First to ESCOBA_TARGET points wins.
 * ===================================================================== */
const ESCOBA_TARGET=11;
const sval=c=>c.v>7?c.v-2:c.v;   // Sota 8, Caballo 9, Rey 10
function sCombos(table,need){
 const out=[],n=table.length;
 for(let m=1;m<(1<<n);m++){let s=0;const ix=[];for(let i=0;i<n;i++)if(m&(1<<i)){s+=sval(table[i]);ix.push(i);if(s>need)break}if(s===need)out.push(ix)}
 return out;
}
function newEscoba(g,keep){
 g.deck=spanishDeck();g.hands=[g.deck.splice(0,3),g.deck.splice(0,3)];g.table=g.deck.splice(0,4);
 g.captured=[[],[]];g.escobas=[0,0];g.last=-1;g.sel=[];g.card=-1;g.phase='play';g.summary=null;
 g.total=keep?keep.total:[0,0];g.round=keep?keep.round:1;g.dealer=keep?keep.dealer:1;
 g.turn=1-g.dealer;g.message=`Ronda ${g.round}: juega primero el Jugador ${g.turn+1}.`;
}
function escobaScore(g){
 const cnt=p=>g.captured[p].length,oros=p=>g.captured[p].filter(c=>c.s==='Oros').length,sev=p=>g.captured[p].filter(c=>c.v===7).length;
 const rows=[],pts=[0,0];
 const cat=(name,a,b,fmt)=>{const r={name,a:fmt?fmt(a):a,b:fmt?fmt(b):b,pt:[a>b?1:0,b>a?1:0]};rows.push(r);pts[0]+=r.pt[0];pts[1]+=r.pt[1]};
 cat('Más cartas',cnt(0),cnt(1));
 cat('Más oros',oros(0),oros(1));
 cat('Siete de oros',g.captured[0].some(c=>c.s==='Oros'&&c.v===7)?1:0,g.captured[1].some(c=>c.s==='Oros'&&c.v===7)?1:0,n=>n?'✔':'—');
 cat('Más sietes',sev(0),sev(1));
 rows.push({name:'Escobas 🧹',a:g.escobas[0],b:g.escobas[1],pt:[g.escobas[0],g.escobas[1]]});pts[0]+=g.escobas[0];pts[1]+=g.escobas[1];
 return {rows,pts};
}
function escobaEndRound(g){
 if(g.last>=0)g.captured[g.last].push(...g.table);   // the last capturer keeps whatever is left on the table
 g.table=[];
 const {rows,pts}=escobaScore(g);
 g.total=[g.total[0]+pts[0],g.total[1]+pts[1]];g.summary={rows,pts};
 const top=Math.max(...g.total);
 if(top>=ESCOBA_TARGET&&g.total[0]!==g.total[1]){win(g,g.total[0]>g.total[1]?0:1,`Escoba · ${g.total[0]} a ${g.total[1]} puntos`)}
 else{g.phase='roundend';g.curtain=false;g.message=`Fin de la ronda ${g.round}: +${pts[0]} / +${pts[1]}.`}
}
function applyEscoba(g,p,a){
 if(g.over)return;
 if(g.phase==='roundend'){
  if(a.a==='next'){newEscoba(g,{total:g.total,round:g.round+1,dealer:1-g.dealer});g.curtain=!g.wifi&&g.mode!=='pve';g.fx=[...g.hands[0],...g.hands[1]].map(c=>c.id)}
  return;
 }
 if(g.phase!=='play'||p!==g.turn)return;
 const h=g.hands[p];
 if(a.a==='hand'){if(!inRange(a.i,h.length))return;g.card=g.card===a.i?-1:a.i;g.sel=[];return}
 if(a.a==='table'){if(!inRange(a.i,g.table.length))return;const at=g.sel.indexOf(a.i);if(at<0)g.sel.push(a.i);else g.sel.splice(at,1);return}
 if(a.a!=='play'||!inRange(g.card,h.length))return;
 const c=h[g.card],sum=sval(c)+g.sel.reduce((s,ix)=>s+sval(g.table[ix]),0);
 const capture=g.sel.length>0&&sum===15;
 if(!capture){
  if(g.sel.length){g.message=`Suma ${sum}: tiene que ser exactamente 15.`;return}
  if(sCombos(g.table,15-sval(c)).length){g.message='Con esa carta puedes capturar: en la escoba es obligatorio.';return}
 }
 h.splice(g.card,1);g.card=-1;
 const lastPlay=!g.deck.length&&!g.hands[0].length&&!g.hands[1].length;   // the final card of the round
 if(capture){
  g.captured[p].push(c,...g.sel.map(ix=>g.table[ix]));
  g.table=g.table.filter((_,ix)=>!g.sel.includes(ix));g.last=p;g.fx=[c.id];
  if(!g.table.length&&!lastPlay){g.escobas[p]++;g.message=`¡ESCOBA! 🧹 Jugador ${p+1} barrió la mesa (+1).`}
  else g.message=`Jugador ${p+1} capturó con ${sum}.`;
 }else{g.table.push(c);g.fx=[c.id];g.message=`Jugador ${p+1} dejó una carta en la mesa.`}
 g.sel=[];
 if(!g.hands[0].length&&!g.hands[1].length){
  if(g.deck.length){g.hands=[g.deck.splice(0,3),g.deck.splice(0,3)];g.fx=[...g.hands[0],...g.hands[1]].map(x=>x.id);g.message+=' Se reparten 3 cartas más.';pass(g)}
  else escobaEndRound(g);
 }else pass(g);
}

/* =====================================================================
 * RUMMY — draw, lay down sets/runs, add to any meld, discard.
 * ===================================================================== */
const rv=(c,hi)=>c.v===1&&hi?14:c.v;
function rKind(cs){
 const n=cs.length;if(n<3)return null;
 if(n<=4&&cs.every(c=>c.v===cs[0].v)&&new Set(cs.map(c=>c.s)).size===n)return 'set';
 if(cs.every(c=>c.s===cs[0].s)){
  for(const hi of [false,true]){
   const v=cs.map(c=>rv(c,hi)).sort((x,y)=>x-y);
   if(new Set(v).size===n&&v.every((x,i)=>!i||x===v[i-1]+1))return 'run';   // A is low (A-2-3) or high (Q-K-A)
  }
 }
 return null;
}
function sortRun(cs){for(const hi of [false,true]){const s=[...cs].sort((x,y)=>rv(x,hi)-rv(y,hi));if(s.every((c,i)=>!i||rv(c,hi)===rv(s[i-1],hi)+1))return s}return cs}
const rPoints=c=>Math.min(c.v,10);
function newRummy(g){
 g.deck=stdDeck();g.hands=[g.deck.splice(0,7),g.deck.splice(0,7)];g.discard=[g.deck.pop()];
 g.melds=[[],[]];g.drawn=false;g.fromDiscard=null;g.sel=[];g.reshuffles=0;
 g.message='Roba una carta, baja combinaciones si puedes y descarta una.';
}
// 0.3.19: el Rummy se juega A PUNTOS en varias manos. Quien gana una mano suma las cartas sueltas del rival (o la diferencia, si se acabó
// el mazo); el primero en llegar a RUMMY_TARGET gana la partida. g.rscore = marcador, g.rhand = número de mano.
const RUMMY_TARGET=100;
function rHandEnd(g,w,pts,why){
 g.rscore=g.rscore||[0,0];if(w>=0)g.rscore[w]+=pts;
 const sc=`${g.rscore[0]} a ${g.rscore[1]}`;
 if(w>=0&&g.rscore[w]>=RUMMY_TARGET){win(g,w,`${why} · marcador final ${sc}`);return}
 const keep=g.rscore.slice(),hand=(g.rhand||1)+1;
 newRummy(g);g.rscore=keep;g.rhand=hand;g.turn=w>=0?1-w:g.turn;
 g.message=`${why}${w>=0?` Jugador ${w+1} suma ${pts}.`:' Nadie suma.'} Marcador: ${sc} (se juega a ${RUMMY_TARGET}). Mano ${hand}: empieza el Jugador ${g.turn+1}.`;
}
function rEndDeadwood(g,why){
 const d=g.hands.map(h=>h.reduce((s,c)=>s+rPoints(c),0)),w=sideWinner(d[1],d[0]);   // fewer leftover points wins
 rHandEnd(g,w,Math.abs(d[0]-d[1]),`${why} (cartas sueltas: J1 ${d[0]} / J2 ${d[1]}).`);
}
const rOut=(g,p)=>rHandEnd(g,p,g.hands[1-p].reduce((s,c)=>s+rPoints(c),0),`¡Rummy! El Jugador ${p+1} se quedó sin cartas.`);
function applyRummy(g,p,a){
 if(g.over||p!==g.turn)return;
 const h=g.hands[p];
 switch(a.a){
  case 'stock':{
   if(g.drawn)return;
   if(!g.deck.length){
    if(g.reshuffles>=2||g.discard.length<=1){rEndDeadwood(g,'Se acabaron las cartas');return}
    const top=g.discard.pop();g.deck=shuffle(g.discard);g.discard=[top];g.reshuffles++;
   }
   const c=g.deck.pop();h.push(c);g.drawn=true;g.fromDiscard=null;g.fx=[c.id];g.sel=[];g.message='Bajas combinaciones y luego descartas.';break;
  }
  case 'top':{
   if(g.drawn||!g.discard.length)return;
   const c=g.discard.pop();h.push(c);g.drawn=true;g.fromDiscard=c.id;g.fx=[c.id];g.sel=[];g.message='Tomaste el descarte. Bájalo en una combinación o descarta otra carta.';break;
  }
  case 'sel':{
   if(!inRange(a.i,h.length))return;
   const at=g.sel.indexOf(a.i);if(at<0)g.sel.push(a.i);else g.sel.splice(at,1);break;
  }
  case 'sort':{
   h.sort((x,y)=>SUITS.indexOf(x.s)-SUITS.indexOf(y.s)||x.v-y.v);g.sel=[];break;
  }
  case 'meld':{
   if(!g.drawn)return;
   const cs=g.sel.map(i=>h[i]).filter(Boolean),kind=rKind(cs);
   if(!kind){g.message='Eso no es un grupo (mismo número, palos distintos) ni una escalera (mismo palo, seguidas).';return}
   const ids=new Set(cs.map(c=>c.id));g.hands[p]=h.filter(c=>!ids.has(c.id));
   g.melds[p].push({id:uid(),kind,cards:kind==='run'?sortRun(cs):cs});g.fx=cs.map(c=>c.id);g.sel=[];
   g.message=`Jugador ${p+1} bajó ${kind==='run'?'una escalera':'un grupo'}.`;
   if(!g.hands[p].length)rOut(g,p);
   break;
  }
  case 'lay':{
   if(!g.drawn||g.sel.length!==1)return;
   const meld=g.melds[a.o]&&g.melds[a.o][a.m],card=h[g.sel[0]];
   if(!meld||!card)return;
   const cs=[...meld.cards,card];
   if(rKind(cs)!==meld.kind){g.message='Esa carta no encaja en esa bajada.';return}
   meld.cards=meld.kind==='run'?sortRun(cs):cs;g.hands[p]=h.filter(c=>c.id!==card.id);g.fx=[card.id];g.sel=[];
   g.message='Carta agregada a la bajada.';
   if(!g.hands[p].length)rOut(g,p);
   break;
  }
  case 'discard':{
   if(!g.drawn||!inRange(a.i,h.length))return;
   const c=h[a.i];
   if(c.id===g.fromDiscard){g.message='No puedes devolver la carta que acabas de tomar del descarte.';return}
   h.splice(a.i,1);g.discard.push(c);g.drawn=false;g.fromDiscard=null;g.sel=[];g.fx=[c.id];
   if(!h.length)rOut(g,p);
   else{pass(g);g.message=`Turno del Jugador ${g.turn+1}: roba una carta.`}
   break;
  }
 }
}

/* =====================================================================
 * FICHAS DESLIZANTES (0.2.61, rules by the owner) — two sets of 6 different pieces, 4 copies of each (48 tiles) + 1 comodín.
 * Each player lays 24 tiles face down in 6 columns of 4 (their side of the board). Rock-paper-scissors decides who starts and who picks the set.
 * The starter puts the COMODÍN on top of one of their columns: the column slides down one place and its last tile falls out and is turned over.
 *   · a tile of YOUR set: you put it on top of any of your columns (it stays face up), which pushes out another tile, and you go on;
 *   · a tile of the OTHER set: you hand it to the rival, who puts it on top of one of THEIR columns, pushes one out, and so on.
 * Win: every one of your 6 columns holds the 4 copies of the same piece, all face up (the comodín counts as any piece).
 * Seats: 0 and 1. g.phase = 'rps' → 'pickset' → 'play'. g.hand = the tile that must be placed now (belongs to g.turn).
 * ===================================================================== */
/* 0.2.62: 12 themes; every new match uses two different ones (never the same pair as the previous match, remembered on this device).
 * The comodín is placed anywhere; a piece whose twin is already face up on your side can ONLY go on that column (slAllowed). */
const SL_THEMES=[
 {name:'Frutas',icons:['🥭','🍌','🍍','🥥','🍉','🍋']},{name:'Música',icons:['🥁','🎷','🎺','🎸','🎻','🎤']},
 {name:'Banderas',icons:['🇩🇴','🇺🇸','🇧🇷','🇲🇽','🇪🇸','🇯🇵']},{name:'Anime',icons:['🥷','🐉','🍙','🌸','⛩️','🎴']},
 {name:'Letras japonesas',icons:['あ','き','す','ぬ','ほ','ん'],text:true},{name:'Superhéroes',icons:['🦇','🕷️','🛡️','🔨','⚡','🦸']},
 {name:'Animales',icons:['🐶','🐱','🐼','🦁','🐸','🐵']},{name:'Deportes',icons:['⚽','🏀','⚾','🏈','🎾','🥊']},
 {name:'Espacio',icons:['🚀','🪐','🌙','⭐','☄️','👽']},{name:'Comida',icons:['🍕','🍔','🌮','🍣','🍩','🍦']},
 {name:'Zodiaco',icons:['♈','♉','♊','♋','♌','♍'],text:true},{name:'Videojuegos',icons:['🎮','👾','🕹️','🏆','💎','🎲']}
];
function slPickThemes(){
 let last=[];try{last=JSON.parse(localStorage.getItem('sudomi-slide-themes'))||[]}catch(_){}
 const pool=SL_THEMES.map((_,i)=>i).filter(i=>!last.includes(i));
 const a=pool.splice(Math.floor(Math.random()*pool.length),1)[0],b=pool[Math.floor(Math.random()*pool.length)];
 try{localStorage.setItem('sudomi-slide-themes',JSON.stringify([a,b]))}catch(_){}
 return [a,b];
}
const slTheme=(g,s)=>SL_THEMES[g.themes[s]];
const SLI=['🪨','📄','✂️'],SLN=['Piedra','Papel','Tijera'];
function slDeck(){const d=[];let n=0;for(let s=0;s<2;s++)for(let t=0;t<6;t++)for(let k=0;k<4;k++)d.push({s,t,id:'t'+(n++),up:false});return shuffle(d)}
function newSlide(g){g.phase='rps';g.themes=slPickThemes();g.rpsSeq=0;g.rps=[null,null];g.rpsLast=null;g.sets=[null,null];g.chooser=-1;g.cols=[[],[]];g.hand=null;g.turn=0;g.moves=0;g.message='Piedra, papel o tijera: quien gane elige su tema y empieza.'}
function slColDone(col,set){const real=col.filter(x=>!x.w);return col.length===4&&col.every(x=>x.up)&&real.length>0&&real.every(x=>x.s===set&&x.t===real[0].t)}
const slDoneCount=(g,p)=>g.cols[p].filter(c=>slColDone(c,g.sets[p])).length;
const slIcon=(g,t)=>t.w?'★':slTheme(g,t.s).icons[t.t];
// Columns where the tile in hand may be placed: the comodín goes anywhere; a piece whose twin is already face up on your side can ONLY go on that column.
function slAllowed(g,p,t){
 const all=[0,1,2,3,4,5];if(t.w)return all;
 const at=all.filter(c=>g.cols[p][c].some(x=>x.up&&!x.w&&x.s===t.s&&x.t===t.t));
 if(at.length)return at;
 // 0.2.75: una columna con una pieza boca arriba solo recibe piezas iguales; una pieza nueva solo va en columnas sin otras piezas boca arriba
 const free=all.filter(c=>!g.cols[p][c].some(x=>x.up&&!x.w));
 return free.length?free:all;
}
function applySlide(g,p,a){
 if(g.over||(p!==0&&p!==1))return;
 if(g.phase==='rps'){
  if(a.a!=='rps'||![0,1,2].includes(a.v)||g.rps[p]!=null)return;
  g.rps[p]=a.v;
  if(!g.wifi&&g.mode==='pvp'&&g.rps[1-p]==null){g.turn=1-p;g.message=`Jugador ${g.turn+1}: elige tu jugada (sin que lo vea el otro).`;return}   // one device: pass it
  if(g.rps[1-p]==null){g.message='Elegiste. Esperando al rival…';return}
  const [x,y]=g.rps;g.rpsLast=[x,y];g.rpsSeq=(g.rpsSeq|0)+1;g.rps=[null,null];
  if(x===y){g.turn=0;g.message=`${SLI[x]} contra ${SLI[y]}: empate. ¡Otra vez!`;return}
  const w=(x-y+3)%3===1?0:1;g.chooser=w;g.turn=w;g.phase='pickset';
  g.message=`${SLI[x]} contra ${SLI[y]}: ¡gana Jugador ${w+1}! Elige tu tema de fichas; empiezas tú.`;
  return;
 }
 if(g.phase==='pickset'){
  if(a.a!=='pickset'||p!==g.chooser||![0,1].includes(a.s))return;
  g.sets[p]=a.s;g.sets[1-p]=1-a.s;
  const deck=slDeck();g.cols=[0,1].map(pl=>Array.from({length:6},(_,c)=>deck.slice(pl*24+c*4,pl*24+c*4+4)));
  g.hand={w:true,up:true,id:'wild'};g.phase='play';g.turn=p;g.fx=[];
  g.message=`Jugador ${p+1} juega con ${slTheme(g,a.s).name} y empieza con el comodín ★: ponlo sobre una columna.`;
  return;
 }
 if(g.phase!=='play'||p!==g.turn||a.a!=='insert'||!g.hand||!inRange(a.c,6))return;
 if(!slAllowed(g,p,g.hand).includes(a.c))return;                  // a piece you already revealed can only go on its own column
 const col=g.cols[p][a.c],tile=g.hand;
 tile.up=true;col.unshift(tile);const out=col.pop();out.up=true;g.moves=(g.moves|0)+1;g.fx=[p+':'+a.c];
 g.hand=out;
 if(slDoneCount(g,p)===6){g.hand=null;win(g,p,`¡Jugador ${p+1} completó sus 6 columnas!`);return}
 if(out.w||out.s===g.sets[p]){g.message=out.w?`Jugador ${p+1} sacó el comodín ★: cuenta como de su set y lo coloca.`:`Jugador ${p+1} sacó ${slIcon(g,out)}: es de su set. La coloca en una de sus columnas y sigue.`}
 else{g.turn=1-p;g.message=`Jugador ${p+1} sacó ${slIcon(g,out)}: es del set de Jugador ${g.turn+1}. Se la pasa.`}
}

const reducers={domino:applyDomino,memory:applyMemory,dotsboxes:applyDots,stop:applyStop,mahjong:applyMahjong,blackjack:applyBlackjack,poker:applyPoker,escoba:applyEscoba,rummy:applyRummy,slide:applySlide};
// Entry point for every action (local tap, or an action received from the Wi-Fi guest).
function apply(id,g,p,a){
 if(!g||!reducers[id]||!a||typeof a!=='object')return g;
 g.fx=[];
 if(a.a==='reveal'){g.curtain=false;return g}          // "pass the device" curtain
 if(g.curtain&&!g.wifi)return g;                        // nothing but "reveal" works behind the curtain
 try{reducers[id](g,p,a)}catch(e){console.warn('SUDOMI arcade:',e)}
 return g;
}

/* =====================================================================
 * RENDERING
 * ===================================================================== */
// Local, per-device UI state that must survive a re-render but is NOT part of the shared game state.
const D={stop:[],stopKey:'',votes:[],voteKey:'',hint:null,focus:-1,t:0,memSig:'',memN:3};

const rank=v=>({1:'A',11:'J',12:'Q',13:'K'}[v]||v);
const isRed=s=>s==='♥'||s==='♦';
const cardFx=(g,c)=>!!c&&g.fx.includes(c.id);
// c === null is a hidden / face-down card.
function pcard(c,o={}){
 if(!c)return `<span class="pcard back${o.mini?' mini':''}"${o.i!=null?` style="--i:${o.i}"`:''}></span>`;
 return `<span class="pcard ${isRed(c.s)?'red':'blk'}${c.v>10?' fig':''}${o.fx?' deal':''}"${o.i!=null?` style="--i:${o.i}"`:''}><b>${rank(c.v)}</b><i>${c.s}</i><em>${c.v>10?rank(c.v):c.s}</em><u>${rank(c.v)}</u></span>`;
}
// 0.3.24: los palos de la baraja española van dibujados (antes eran emoji, que cambian de un teléfono a otro).
const SP_SVG={
 oros:'<circle cx="20" cy="20" r="15" fill="#f4b400" stroke="#8a5a00" stroke-width="2"/><circle cx="20" cy="20" r="10" fill="#ffd95a" stroke="#b07a00" stroke-width="1.5"/><path d="M20 12l2.4 5 5.4.6-4 3.8 1.1 5.4-4.9-2.7-4.9 2.7 1.1-5.4-4-3.8 5.400-.6z" fill="#b07a00"/>',
 copas:'<path d="M9 7h22v6c0 7-4.500 12-11 12S9 20 9 13z" fill="#d8323c" stroke="#7d1118" stroke-width="2" stroke-linejoin="round"/><path d="M12 10h16" stroke="#ffb3b8" stroke-width="2.500" stroke-linecap="round"/><path d="M20 25v6" stroke="#7d1118" stroke-width="4"/><path d="M11 35c0-3 4-4.500 9-4.500s9 1.500 9 4.500z" fill="#f4b400" stroke="#8a5a00" stroke-width="1.800" stroke-linejoin="round"/>',
 espadas:'<path d="M20 3l4 6v17h-8V9z" fill="#dfe8f5" stroke="#1d4ea8" stroke-width="2" stroke-linejoin="round"/><path d="M20 6v19" stroke="#1d4ea8" stroke-width="1.200"/><rect x="10" y="25" width="20" height="4.500" rx="2.200" fill="#f4b400" stroke="#8a5a00" stroke-width="1.500"/><rect x="17.500" y="29" width="5" height="7" rx="1.500" fill="#1d4ea8"/><circle cx="20" cy="37" r="2.200" fill="#f4b400" stroke="#8a5a00" stroke-width="1"/>',
 bastos:'<path d="M14 36l-3-3L25 8c1.500-3 5-4 7.500-2s2.500 5.500 0 7.500z" fill="#8d5a2b" stroke="#4d2d10" stroke-width="2" stroke-linejoin="round"/><path d="M17 27l4 3M21 20l4 3M25 13l4 3" stroke="#4d2d10" stroke-width="1.600" stroke-linecap="round"/><path d="M27 6c-1-3 2-5 4-3M33 9c3-1 5 2 3 4" fill="none" stroke="#2f7d32" stroke-width="2.400" stroke-linecap="round"/>'
};
const spArt=cl=>`<svg viewBox="0 0 40 40" aria-hidden="true">${SP_SVG[cl]}</svg>`;
const SPS={Oros:['🪙','oros'],Copas:['🏆','copas'],Espadas:['⚔️','espadas'],Bastos:['🪵','bastos']};
const SPN={1:'As',10:'Sota',11:'Caballo',12:'Rey'};
function scard(c,o={}){
 if(!c)return '<span class="pcard back"></span>';
 const cl=SPS[c.s][1];
 return `<span class="scard ${cl}${o.fx?' deal':''}"${o.i!=null?` style="--i:${o.i}"`:''}><b>${c.v}</b><em>${spArt(cl)}</em><small>${SPN[c.v]||c.s}</small><u>${c.v}</u></span>`;
}
const backs=n=>`<span class="backs">${Array.from({length:n},(_,i)=>pcard(null,{mini:true,i})).join('')}</span>`;
const msg=g=>g.message?`<p class="arc-msg">${esc(g.message)}</p>`:'';

// 0.3.29: iconos dibujados para lo que antes eran emoji (escoba, pista, copa del ganador, candado)
const ico=b=>`<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${b}</svg>`;
const ICO={
 broom:ico('<path d="M19 3L11 12" stroke="#8d5a2b" stroke-width="2.600" stroke-linecap="round"/><path d="M12.500 10.500l-3-2.500-6 8 7 5.500z" fill="#f4b400" stroke="#8a5a00" stroke-width="1.600" stroke-linejoin="round"/><path d="M6 14l5 4M4.500 16.500l4 3" stroke="#8a5a00" stroke-width="1.300" stroke-linecap="round"/>'),
 bulb:ico('<path d="M12 3a6.500 6.500 0 0 0-3.500 12v2h7v-2A6.500 6.500 0 0 0 12 3z" fill="#ffd54a" stroke="#b26a00" stroke-width="1.600" stroke-linejoin="round"/><path d="M9.500 20h5M10.500 22h3" stroke="#b26a00" stroke-width="1.800" stroke-linecap="round"/>'),
 cup:ico('<path d="M7 4h10v4a5 5 0 0 1-10 0z" fill="#ffd54a" stroke="#b26a00" stroke-width="1.600" stroke-linejoin="round"/><path d="M7 5H3.500c0 3.500 1.500 5 4 5M17 5h3.500c0 3.500-1.500 5-4 5" fill="none" stroke="#b26a00" stroke-width="1.600" stroke-linecap="round"/><path d="M12 13v4M8 20h8" stroke="#b26a00" stroke-width="2" stroke-linecap="round"/>'),
 lock:ico('<rect x="5" y="10.500" width="14" height="10" rx="2.500" fill="#ffd54a" stroke="#b26a00" stroke-width="1.600"/><path d="M8 10.500V8a4 4 0 0 1 8 0v2.500" fill="none" stroke="#b26a00" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="15.500" r="1.600" fill="#b26a00"/>')
};
function bar(g,ctx,info,noTurn){
 return `<div class="arc-bar">${[0,1].map(p=>`<div class="arc-chip p${p}${!noTurn&&g.turn===p&&!g.over?' turn':''}${g.over&&g.winner===p?' won':''}"><span class="av">${p+1}</span><div><strong>Jugador ${p+1}${ctx.wifi&&ctx.player===p?' · tú':''}</strong><small>${info[p]}</small></div>${g.over&&g.winner===p?'<span class="crown">${ICO.cup}</span>':''}</div>`).join('')}</div>`;
}
function curtainHtml(g){
 return `<div class="arc-curtain"><span class="lock">${ICO.lock}</span><h3>Turno del Jugador ${g.turn+1}</h3>${msg(g)}<p class="arc-sub">Pásale el dispositivo. Toca cuando estés listo para ver tu mano.</p><button class="arc-btn big" data-a="reveal">Ver mi turno</button></div>`;
}

/* ---------- Dominó ---------- */
const PIPS=[[],[4],[0,8],[0,4,8],[0,2,6,8],[0,2,4,6,8],[0,2,3,5,6,8]];
const half=n=>`<span class="dh">${Array.from({length:9},(_,k)=>`<i${PIPS[n].includes(k)?' class="on"':''}></i>`).join('')}</span>`;
const dtile=(t,cls='')=>`<span class="dtile${cls?' '+cls:''}">${half(t[0])}<u></u>${half(t[1])}</span>`;
/* 0.2.57 — the chain on a SQUARE table. A grid of DU×DU cells; a tile covers 2×1 cells (1×2 when it turns). The opening tile sits in the middle; the right
 * end grows to the right and, when it reaches the edge, turns DOWN and comes back along the next row (snake); the left end is the same picture turned
 * 180°, so it turns UP. Every tile is drawn as a small SVG, so the whole chain (28 tiles) always fits; tapping a tile shows it large (js/domino-table.js). */
const DU=14;
// 0.2.75: los dobles van en vertical (cruzados a la fila): ocupan 1 casilla de largo y 2 de alto, centrados en la fila. dbl(i) dice si la ficha i de este tramo es doble.
function dSnake(m,x0,dbl){
 const out=[];let x=x0==null?8:x0,r=6,h=1,prevD=false;
 for(let i=0;i<m;i++){
  const d=!!(dbl&&dbl(i)),L=d?1:2,fit=h>0?x+L<=DU:x-L>=0;
  if(fit){
   if(h>0){out.push(d?{x,y:r-.5,w:1,h:2,d:[1,0]}:{x,y:r,w:2,h:1,d:[1,0]});x+=L}
   else{out.push(d?{x:x-1,y:r-.5,w:1,h:2,d:[-1,0]}:{x:x-2,y:r,w:2,h:1,d:[-1,0]});x-=L}
   prevD=d;
  }
  else{const col=h>0?x-1:x;out.push({x:col,y:r+1+(prevD?.5:0),w:1,h:2,d:[0,1]});x=h>0?col:col+1;r+=2;h=-h;prevD=false}
 }
 return out;
}
function dLayout(g){
 const n=g.row.length,items=[];if(!n)return {items,rows:DU};
 const mid=Math.min(Math.max(g.mid|0,0),n-1);
 const isD=k=>g.row[k]&&g.row[k][0]===g.row[k][1],od=isD(mid);
 items.push(od?{k:mid,x:6.5,y:5.5,w:1,h:2,d:[1,0],inn:g.row[mid][0],out:g.row[mid][1]}:{k:mid,x:6,y:6,w:2,h:1,d:[1,0],inn:g.row[mid][0],out:g.row[mid][1]});
 dSnake(n-1-mid,od?7.5:8,i=>isD(mid+1+i)).forEach((c,i)=>{const k=mid+1+i;items.push({...c,k,inn:g.row[k][0],out:g.row[k][1]})});
 dSnake(mid,od?7.5:8,i=>isD(mid-1-i)).forEach((c,i)=>{const k=mid-1-i;items.push({k,x:DU-c.x-c.w,y:12-c.y-(c.h-1),w:c.w,h:c.h,d:[-c.d[0],-c.d[1]],inn:g.row[k][1],out:g.row[k][0]})});
 const top=Math.min(0,...items.map(t=>t.y));if(top<0)items.forEach(t=>{t.y-=top});   // extreme case (almost every tile on one end): the board grows a little instead of clipping
 const rows=Math.max(DU,...items.map(t=>t.y+t.h));
 return {items,rows};
}
// one tile as an SVG; p is the left (or top) half, q the right (or bottom) half
function dSvg(p,q,vert){
 const W=vert?50:100,H=vert?100:50,pips=(v,ox,oy)=>PIPS[v].map(k=>`<circle cx="${ox+8.3+16.7*(k%3)}" cy="${oy+8.3+16.7*Math.floor(k/3)}" r="4.9"/>`).join('');
 return `<svg viewBox="0 0 ${W} ${H}" aria-hidden="true"><rect x=".8" y=".8" width="${W-1.6}" height="${H-1.6}" rx="7" fill="#fbf6e6" stroke="#b9ae92" stroke-width="1.6"/>${vert?'<line x1="7" y1="50" x2="43" y2="50"':'<line x1="50" y1="7" x2="50" y2="43"'} stroke="#7b7258" stroke-width="1.8" stroke-linecap="round"/><g fill="#10213b">${pips(p,0,0)}${vert?pips(q,0,50):pips(q,50,0)}</g></svg>`;
}
function dBoard(g){
 const {items,rows}=dLayout(g),last=g.row.length-1;
 const tiles=items.map(t=>{
  const vert=t.h>t.w;
  const [p,q]=vert?(t.d[1]>0?[t.inn,t.out]:[t.out,t.inn]):(t.d[0]>0?[t.inn,t.out]:[t.out,t.inn]);
  const pop=(g.fx[0]==='L'&&t.k===0)||(g.fx[0]==='R'&&t.k===last);
  const tilt=(((p*5+q*11+(p+1)*(q+2))%7)-3)*.9;   // 0.3.41: un poco de aire y cada ficha levemente torcida (siempre igual para la misma ficha)
  return `<button type="button" class="dmt${pop?' pop':''}" data-p="${p}" data-q="${q}" style="left:${(t.x/DU*100).toFixed(3)}%;top:${(t.y/rows*100).toFixed(3)}%;width:${(t.w/DU*100).toFixed(3)}%;height:${(t.h/rows*100).toFixed(3)}%;--tilt:${tilt.toFixed(1)}deg" aria-label="Ficha ${p}-${q}. Toca para verla grande">${dSvg(p,q,vert)}</button>`;
 }).join('');
 return `<div class="dm-board" style="aspect-ratio:${DU}/${rows}">${tiles||''}</div>`;
}
function drawDomino(g,ctx,I){
 const me=I.viewer,h=g.hands[me]||[],e=dEnds(g),playing=g.phase==='play'&&!g.over,reveal=g.phase==='handend'||g.over,myTeam=dTeam(me);
 const row=g.row.length?dBoard(g):`<div class="dm-board empty" style="aspect-ratio:1"><span class="arc-hint">La mesa está vacía: ${I.mine&&playing?'juega la ficha indicada para empezar.':'espera la primera ficha.'}</span></div>`;
 const sideChoice=I.mine&&playing&&e&&g.sel>=0&&h[g.sel]
  ?`<div class="d-side${g.look&&g.look.t==='green'?' tl-green':''}"><span>¿Dónde la colocas?</span><button type="button" class="d-sidebtn L" data-a="play" data-i="${g.sel}" data-side="L" aria-label="Poner la ficha junto a la ficha ${g.row[0][0]}-${g.row[0][1]}, extremo ${e[0]}">${dSvg(g.row[0][0],g.row[0][1],false)}</button><button type="button" class="d-sidebtn R" data-a="play" data-i="${g.sel}" data-side="R" aria-label="Poner la ficha junto a la ficha ${g.row[g.row.length-1][0]}-${g.row[g.row.length-1][1]}, extremo ${e[1]}">${dSvg(g.row[g.row.length-1][0],g.row[g.row.length-1][1],false)}</button></div>`:'';
 // 0.3.41: botón «Ordenar» (D.dsort): las fichas de tu mano se muestran de mayor a menor; es solo cómo se ven (data-i sigue siendo su lugar real)
 const dRank=D.dsort?h.map((t,i)=>[Math.max(t[0],t[1])*10+Math.min(t[0],t[1]),i]).sort((a,b)=>b[0]-a[0]).map(x=>x[1]):h.map((_,i)=>i);
 const hand=dRank.map(i=>{const t=h[i],ok=I.mine&&playing&&dFits(g,t);return `<button class="dbtn ${ok?'ok':'no'}${g.sel===i?' picked':''}" data-a="play" data-i="${i}" ${ok?'':'disabled'} aria-label="Ficha ${t[0]}-${t[1]}">${dtile(D.dsort?[Math.max(t[0],t[1]),Math.min(t[0],t[1])]:t)}</button>`}).join('');
 // the table: avatar + name + tile count for every seat (you at the bottom, your partner in front of you), the chain in the middle, a bottle (js/domino-table.js)
 const DM=window.SudomiDomino,seatOf=k=>(me+k)%4;
 const av=(p,pos,label)=>{
  const s=(g.seats&&g.seats[p])||{name:`Jugador ${p+1}`},sips=DM&&p===me?DM.sips(p):0;
  return `<div class="dm-seat ${pos}${g.turn===p&&playing?' turn':''}${g.over&&dTeam(p)===g.winTeam?' won':''}"><div class="dm-av"><span>${esc(s.avatar||(s.bot?'🤖':'👤'))}</span><i class="dm-cnt">${(g.hands[p]||[]).length}</i></div><div class="dm-who"><b>${esc(s.name)}</b><small>${label}</small>${sips?`<em>🍺 ${sips}</em>`:''}</div></div>`;
 };
 // 0.2.65: every player sits at their own side of the table (partner in front, rivals left and right) and their tiles are shown in front of them, face down, so you can see how many are left
 const backs=(p,cls)=>`<div class="dm-backs ${cls}" aria-label="${(g.hands[p]||[]).length} fichas">${(g.hands[p]||[]).map(()=>'<i></i>').join('')}</div>`;
 const drunkN=DM&&DM.drunk?DM.drunk(me):0,drunk=drunkN>0;
 const arena=`<div class="dm-arena"><div class="dm-a dm-at">${av(seatOf(2),'top','Compañero')}${backs(seatOf(2),'h')}</div><div class="dm-a dm-al">${av(seatOf(3),'left','Rival')}${backs(seatOf(3),'v')}</div><div class="dm-a dm-ab"><div class="d-ends"${e?'':' style="visibility:hidden"'}><span>◀ ${e?e[0]:0}</span><span>${e?e[1]:0} ▶</span></div>${row}</div><div class="dm-a dm-ar">${av(seatOf(1),'right','Rival')}${backs(seatOf(1),'v')}</div></div>`;   // 0.3.41 (dueño): se juega hacia la derecha — el siguiente jugador (asiento +1) va a tu derecha
 const score=`<div class="dm-score"><span class="mine">Tu equipo <b>${g.score[myTeam]}</b></span><i>meta ${DOM_TARGET}</i><span>Rivales <b>${g.score[1-myTeam]}</b></span></div><p class="dm-dir">↺ Se juega hacia la derecha</p>`;
 const sum=reveal&&g.summary?`<div class="dm-sum${g.look&&g.look.t==='green'?' tl-green':''}"><h4>${g.over?'🏆 Fin de la partida':`Mano ${g.handNo}`}</h4>${[0,1,2,3].map(p=>{const s=(g.seats&&g.seats[p])||{name:`Jugador ${p+1}`};return `<div class="dm-sum-row ${dTeam(p)===myTeam?'mine':''}"><b>${esc(s.name)}</b><span>${(g.hands[p]||[]).map(t=>dtile(t,'sm')).join('')||'<em>sin fichas</em>'}</span><i>${g.summary.pips[p]}</i></div>`}).join('')}${g.over?'':'<div class="arc-actions"><button class="arc-btn big" data-a="next">Siguiente mano ▶</button></div>'}</div>`:'';
 // 0.3.30: MESA 3D (js/domino-3d.js) — otra forma de pintar la misma partida; se elige con el interruptor del menú de Dominó
 if(window.SudomiDomino3D&&SudomiDomino3D.on())return SudomiDomino3D.draw(g,I,{dLayout,dSvg,dFits,dEnds,dPlayable,dTeam,esc,msg,sum,DOM_TARGET,D3_SIPS,DU});
 const tl=g.look&&g.look.t==='green'?' tl-green':'';   /* 0.3.54: los dominos verdes de la tienda tambien salen en la mesa clasica (los pone quien saca) */
 return `<div class="arc-felt dom dm-table${tl}" data-n="${g.row.length}" data-turn="${g.turn}" data-over="${g.over?1:0}" data-viewer="${me}">${score}${arena}<div class="dm-foot">${av(me,'bottom','Tú')}${DM?DM.bottle(me):''}</div></div>
  ${msg(g)}${sum}${reveal?'':`${sideChoice}${drunk?`<p class="dm-drunk-note">🥴 Estás mareado: las fichas se ven borrosas ${drunkN>1?'durante '+drunkN+' turnos más':'durante este turno'}.</p>`:''}<div class="d-hand${tl}${drunk?' drunk':''}">${hand||'<span class="arc-hint">Sin fichas</span>'}</div>${h.length>1?`<div class="dm-sortrow"><button type="button" class="dm-sortbtn" data-a="dsort">${D.dsort?'↩ Como salieron':'⇅ Ordenar fichas'}</button></div>`:''}${I.mine&&playing&&g.row.length&&!dPlayable(g,me)?'<div class="arc-actions"><button class="arc-btn pulse" data-a="pass">✋ Pasar · no tengo ficha</button></div>':''}`}`;
}

/* ---------- Memoria ---------- */
function drawMemory(g,ctx,I){
 const cards=g.tiles.map((t,i)=>{
  const up=t.gone||g.open.includes(i),cls=['mcard'];
  if(up)cls.push('up');if(t.gone)cls.push('own'+t.owner);if(g.fx.includes(i))cls.push(t.gone?'pairpop':'flip');
  const dis=!I.mine||up||g.locked||g.open.length>=2;
  return `<button class="${cls.join(' ')}" data-a="tile" data-i="${i}" ${dis?'disabled':''} aria-label="${up?t.v:'Ficha oculta'}"><span class="mc-back">?</span><span class="mc-face">${up&&t.v?memArt(t.v):''}</span></button>`;
 }).join('');
 const cont=g.locked&&I.mine?`<button class="arc-btn pulse" data-a="continue">Ocultar y pasar turno</button><small class="arc-sub">Se ocultan solas en unos segundos.</small>`:'';
 return `${msg(g)}<div class="mem-grid">${cards}</div><div class="arc-actions">${cont}</div>`;
}

/* ---------- Puntos y cajas ---------- */
function drawDots(g,ctx,I){
 const edge=(k,dir)=>{const o=g.edges[k];return `<button class="dedge ${dir}${o!==undefined?' on p'+o:''}${g.fx[0]===k?' last':''}" data-a="edge" data-k="${k}" ${o!==undefined||!I.mine?'disabled':''} aria-label="Línea"></button>`};
 let cells='';
 for(let y=0;y<5;y++){
  for(let x=0;x<5;x++){cells+='<i class="dd"></i>';if(x<4)cells+=edge(`h${x},${y}`,'h')}
  if(y<4)for(let x=0;x<5;x++){
   cells+=edge(`v${x},${y}`,'v');
   if(x<4){const ix=y*4+x,ow=g.boxes[ix];cells+=`<span class="dbox${ow>=0?' own'+ow:''}${g.fx.includes('b'+ix)?' pairpop':''}">${ow>=0?ow+1:''}</span>`}
  }
 }
 return `${msg(g)}<div class="dots-board">${cells}</div>`;
}

/* ---------- STOP ---------- */
function stopDraft(g,me){const key=g.round+':'+me;if(D.stopKey!==key){D.stopKey=key;D.stop=Array(10).fill('');D.focus=-1}}
function drawStop(g,ctx,I){
 const me=I.viewer,opp=I.opp,L=g.letter.toLowerCase();
 if(g.phase==='answer'){
  if(g.done[me])return `${msg(g)}<div class="arc-wait big">✔ Enviaste tus respuestas.<br>Esperando al Jugador ${opp+1}… <b id="stopTimer">${g.left}</b> s</div>`;
  stopDraft(g,me);
  const pct=Math.max(0,Math.min(100,g.left/STOP_TIME*100));
  const alarm=g.stopBy>=0&&g.stopBy!==me?'<div class="arc-alert">🚨 ¡STOP! Tu rival ya terminó. ¡Date prisa!</div>':'';
  return `${msg(g)}${alarm}<div class="stop-top"><div class="stop-letter">${g.letter}</div><div class="stop-timer"><span><b id="stopTimer">${g.left}</b> s</span><div class="bar"><i id="stopBar" style="width:${pct}%"></i></div></div></div>
   <ol class="stop-list">${g.questions.map((q,i)=>`<li><label for="sa${i}">${esc(q)}</label><input id="sa${i}" data-stop="${i}" maxlength="40" autocomplete="off" autocapitalize="words" placeholder="${g.letter}…" value="${esc(D.stop[i]||'')}"></li>`).join('')}</ol>
   <div class="arc-actions"><button class="arc-btn big stopbtn" data-a="stopsubmit" ${D.stop.slice(0,10).every(x=>String(x||'').trim())?'':'disabled'}>¡STOP!</button></div>`;
 }
 if(g.phase==='vote'){
  if(g.voted[me])return `${msg(g)}<div class="arc-wait big">✔ Votos enviados.<br>Esperando al Jugador ${opp+1}…</div>`;
  const key=g.round+':v'+me;if(D.voteKey!==key){D.voteKey=key;D.votes=Array(10).fill(true)}
  return `${msg(g)}<div class="stop-top small"><div class="stop-letter">${g.letter}</div><p class="arc-sub">Respuestas del Jugador ${opp+1}. Marca como no válida la que no te convenza.</p></div>
   <ul class="stop-votes">${g.questions.map((q,i)=>{
    const ans=g.answers[opp][i],auto=!ans||norm(ans)[0]!==L,on=!auto&&D.votes[i]!==false;
    return `<li class="${auto?'bad':on?'good':'no'}"><span class="q">${esc(q)}</span><b>${ans?esc(ans):'—'}</b>${auto?`<em>${ans?'No empieza con '+g.letter:'Vacía'}</em>`:`<button class="vote ${on?'yes':'no'}" data-vote="${i}">${on?'✔ Válida':'✘ No válida'}</button>`}</li>`}).join('')}</ul>
   <div class="arc-actions"><button class="arc-btn big" data-a="votesubmit">Confirmar votos</button></div>`;
 }
 return `${msg(g)}<div class="stop-result"><div class="stop-letter">${g.letter}</div>
  <table class="stop-table"><thead><tr><th>Categoría</th><th>J1</th><th>J2</th></tr></thead><tbody>${g.questions.map((q,i)=>`<tr><td>${esc(q)}</td>${[0,1].map(p=>`<td class="${g.rows[i][p]?'pts':'zero'}">${esc(g.answers[p][i]||'—')}<small>${g.rows[i][p]?'+'+g.rows[i][p]:'0'}</small></td>`).join('')}</tr>`).join('')}</tbody><tfoot><tr><td>Total</td><td>${g.points[0]}</td><td>${g.points[1]}</td></tr></tfoot></table></div>`;
}

/* ---------- Duelo Mahjong ---------- */
const MJ_COLOR={'東':'w','南':'w','西':'w','北':'w','中':'r','發':'g','一萬':'c','二萬':'c','一筒':'d','二筒':'d'};
function drawMahjong(g,ctx,I){
 const gone=g.tiles.map(t=>t.gone);
 const tile=(i,top)=>{
  const t=g.tiles[i];if(t.gone)return '';
  const free=mjFree(i,gone),sym=t.v.length===2?`<span class="n">${t.v[0]}</span><span class="s">${t.v[1]}</span>`:`<span class="n">${t.v}</span>`;
  return `<button class="mj-tile${top?' top':''} ${free?'free':'blocked'}${g.selected.includes(i)?' sel':''}" data-a="pick" data-i="${i}" ${!I.mine||!free?'disabled':''} aria-label="Ficha ${t.v}"><span class="mj-sym ${MJ_COLOR[t.v]}">${sym}</span></button>`;
 };
 let cells='';
 for(let r=0;r<4;r++)for(let c=0;c<8;c++){const up=mjAt(1,r,c);cells+=`<div class="mj-cell">${tile(r*8+c,false)}${up>=0?tile(up,true):''}</div>`}
 const left=g.tiles.filter(t=>!t.gone).length;
 return `${msg(g)}<div class="arc-felt mj"><div class="mj-board">${cells}</div></div><p class="arc-sub center">${left} fichas en la mesa · las brillantes están libres</p>`;
}

/* ---------- Blackjack ---------- */
function drawBlackjack(g,ctx,I){
 const done=g.over,me=I.viewer,opp=I.opp;
 const fan=(arr)=>arr.map((c,i)=>pcard(c,{fx:cardFx(g,c),i})).join('');
 const verdict=p=>done&&g.res?`<span class="verdict v${g.res[p]}">${['Pierde','Empata con la banca','Gana a la banca'][g.res[p]]}</span>`:'';
 const tag=p=>g.stood[p]&&!done?'<span class="tagpill">plantado</span>':'';
 const rowFor=(p,isMe)=>{
  const hand=g.hands[p],real=isMe||done;
  return `<div class="bj-row ${isMe?'me':'opp'}"><span class="bj-tag">Jugador ${p+1}${isMe&&ctx.wifi?' · tú':''}</span><div class="fan">${real?fan(hand):backs(hand.length)}</div>${real?`<b class="tot${score21(hand)>21?' bust':''}">${score21(hand)}</b>`:''}${tag(p)}${verdict(p)}</div>`;
 };
 const canAct=I.mine&&g.stage==='play';
 return `${msg(g)}<div class="arc-felt bj">
  <div class="bj-row dealer"><span class="bj-tag">Banca</span><div class="fan">${fan(g.dealer)}</div><b class="tot">${done?score21(g.dealer):'?'}</b></div>
  ${rowFor(I.opp,false)}${rowFor(me,true)}</div>
  <div class="arc-actions"><button class="arc-btn big" data-a="hit" ${canAct?'':'disabled'}>Pedir carta</button><button class="arc-btn big alt" data-a="stand" ${canAct?'':'disabled'}>Plantarse</button></div>`;
}

/* ---------- Póker ---------- */
function drawPoker(g,ctx,I){
 const me=I.viewer,opp=I.opp,show=g.over,canSwap=I.mine&&g.stage==='swap',h=g.hands[me];
 const nameOf=p=>pokerName(rankPoker(g.hands[p]));
 const mine=h.map((c,i)=>{const sel=g.pick[me].includes(i);return `<button class="cardbtn${sel?' lift':''}" data-a="toggle" data-i="${i}" ${canSwap?'':'disabled'}>${pcard(c,{fx:cardFx(g,c),i})}${sel?'<span class="swapflag">Cambiar</span>':''}</button>`}).join('');
 const rival=show?g.hands[opp].map((c,i)=>pcard(c,{i})).join(''):backs(5);
 const n=g.pick[me].length;
 const myName=h.every(Boolean)?`<div class="hand-name${show&&g.winner===me?' best':''}">${show?'Jugador '+(me+1)+': ':'Tu mano: '}${nameOf(me)}</div>`:'';
 return `${msg(g)}<div class="arc-felt pk">
  <div class="pk-row"><span class="bj-tag">Jugador ${opp+1}</span><div class="fan">${rival}</div>${show?`<div class="hand-name${g.winner===opp?' best':''}">${nameOf(opp)}</div>`:''}</div>
  <div class="pk-row me"><span class="bj-tag">Jugador ${me+1}${ctx.wifi?' · tú':''}</span><div class="fan hand">${mine}</div>${myName}</div></div>
  ${canSwap?`<div class="arc-actions"><button class="arc-btn big" data-a="confirm">${n?`Cambiar ${n} carta${n>1?'s':''}`:'Quedarme con estas'}</button></div><p class="arc-sub center">Toca hasta 3 cartas para cambiarlas.</p>`:''}`;
}

/* ---------- Escoba ---------- */
function drawEscoba(g,ctx,I){
 const me=I.viewer,hand=g.hands[me],round=g.phase==='roundend';
 const card=hand[g.card],sum=I.mine&&card?sval(card)+g.sel.reduce((s,ix)=>s+(g.table[ix]?sval(g.table[ix]):0),0):0;
 const hint=D.hint&&hand[D.hint.card]?D.hint:null;
 const tableHtml=g.table.length?g.table.map((c,i)=>`<button class="cardbtn${g.sel.includes(i)?' lift':''}${hint&&hint.sel.includes(i)?' hint':''}" data-a="table" data-i="${i}" ${I.mine&&g.card>=0?'':'disabled'}>${scard(c,{fx:cardFx(g,c)})}</button>`).join(''):'<span class="arc-hint">Mesa vacía</span>';
 const mine=hand.map((c,i)=>`<button class="cardbtn${g.card===i?' lift':''}${hint&&hint.card===i?' hint':''}" data-a="hand" data-i="${i}" ${I.mine?'':'disabled'}>${scard(c,{fx:cardFx(g,c),i})}</button>`).join('');
 const pile=p=>`<span class="es-pile p${p}"><b>${g.captured[p].length}</b> cartas · ${ICO.broom}${g.escobas[p]}</span>`;
 let summary='';
 if(g.summary&&(round||g.over)){
  summary=`<table class="es-sum"><thead><tr><th>Ronda ${g.round}</th><th>J1</th><th>J2</th></tr></thead><tbody>${g.summary.rows.map(r=>`<tr><td>${r.name}</td><td class="${r.pt[0]?'pt':''}">${r.a}${r.pt[0]?' <small>+'+r.pt[0]+'</small>':''}</td><td class="${r.pt[1]?'pt':''}">${r.b}${r.pt[1]?' <small>+'+r.pt[1]+'</small>':''}</td></tr>`).join('')}</tbody><tfoot><tr><td>Total (meta ${ESCOBA_TARGET})</td><td>${g.total[0]}</td><td>${g.total[1]}</td></tr></tfoot></table>${round&&!g.over?'<div class="arc-actions"><button class="arc-btn big" data-a="next">Siguiente ronda ▶</button></div>':''}`;
 }
 const hands=round||g.over?'':`<div class="d-hand">${mine}</div>
  <div class="es-sumline">${I.mine&&card?`Suma: <b class="${sum===15?'ok':sum>15?'over':''}">${sum}</b> / 15`:'&nbsp;'}</div>
  <div class="arc-actions"><button class="arc-btn big" data-a="play" ${I.mine&&g.card>=0?'':'disabled'}>${g.sel.length?`Capturar (suma ${sum})`:'Dejar carta en la mesa'}</button><button class="arc-btn alt" data-a="hint" ${I.mine?'':'disabled'}>${ICO.bulb} Pista</button></div>`;
 return `${msg(g)}<div class="es-score">Ronda ${g.round} · primero en llegar a ${ESCOBA_TARGET} · <b>J1 ${g.total[0]}</b> — <b>J2 ${g.total[1]}</b></div>
  <div class="arc-felt es">${round||g.over?'':`<div class="es-opp">${backs(g.hands[I.opp].length)}<span class="arc-sub">Jugador ${I.opp+1} · mazo: ${g.deck.length}</span></div>`}<div class="es-table">${round||g.over?'':tableHtml}</div><div class="es-piles">${pile(0)}${pile(1)}</div></div>${summary}${hands}`;
}

/* ---------- Rummy ---------- */
function drawRummy(g,ctx,I){
 const me=I.viewer,h=g.hands[me],mine=I.mine,selCards=g.sel.map(i=>h[i]).filter(Boolean),kind=rKind(selCards),single=selCards.length===1?selCards[0]:null;
 const meldHtml=(o)=>g.melds[o].length?g.melds[o].map((m,k)=>`<div class="r-meld ${m.kind}">${m.cards.map(c=>pcard(c,{fx:cardFx(g,c)})).join('')}${mine&&g.drawn&&single&&rKind([...m.cards,single])===m.kind?`<button class="r-add" data-a="lay" data-o="${o}" data-m="${k}" aria-label="Agregar carta">+</button>`:''}</div>`).join(''):'<span class="arc-hint">Sin bajadas</span>';
 const top=g.discard[g.discard.length-1];
 const handHtml=h.map((c,i)=>`<button class="cardbtn${g.sel.includes(i)?' lift':''}" data-a="sel" data-i="${i}" ${mine?'':'disabled'}>${pcard(c,{fx:cardFx(g,c),i})}</button>`).join('');
 const info=selCards.length?(kind?`✔ ${kind==='run'?'Escalera':'Grupo'} válido`:selCards.length<3?'Elige 3 o más para bajar, o 1 para descartar':'✘ No es una combinación válida'):'Toca cartas para seleccionarlas';
 const rival=g.over?g.hands[I.opp].map((c,i)=>pcard(c,{mini:true,i})).join(''):backs(g.hands[I.opp].length);
 return `${msg(g)}<div class="arc-felt rm">
  <div class="rm-opp">${rival}<span class="arc-sub">Jugador ${I.opp+1}</span></div>
  <div class="rm-melds"><div class="rm-lane"><span class="bj-tag">Bajadas J${I.opp+1}</span><div class="melds">${meldHtml(I.opp)}</div></div><div class="rm-lane"><span class="bj-tag">Tus bajadas</span><div class="melds">${meldHtml(me)}</div></div></div>
  <div class="rm-piles">
   <button class="pile" data-a="stock" ${mine&&!g.drawn?'':'disabled'}>${pcard(null)}<small>Mazo · ${g.deck.length}</small></button>
   <button class="pile" data-a="top" ${mine&&!g.drawn&&top?'':'disabled'}>${top?pcard(top,{fx:cardFx(g,top)}):'<span class="pcard empty"></span>'}<small>Descarte · ${g.discard.length}</small></button>
  </div></div>
  <p class="arc-sub center">${mine?info:''}</p>
  <div class="d-hand">${handHtml}</div>
  <div class="arc-actions"><button class="arc-btn" data-a="meld" ${mine&&g.drawn&&kind?'':'disabled'}>Bajar selección</button><button class="arc-btn" data-a="discard" data-i="${g.sel.length===1?g.sel[0]:''}" ${mine&&g.drawn&&g.sel.length===1?'':'disabled'}>Descartar</button><button class="arc-btn alt" data-a="sort" ${mine?'':'disabled'}>Ordenar</button></div>`;
}

/* ---------- Fichas deslizantes ---------- */
function slTile(g,t,reveal){
 if(!t)return '';
 const up=t.up||reveal;
 if(!up)return '<span class="slt back"></span>';
 if(t.w)return '<span class="slt up wild"><b>★</b></span>';
 const th=slTheme(g,t.s);
 return `<span class="slt up s${t.s}${th.text?' txt':''}"><b>${th.icons[t.t]}</b></span>`;
}
// the rock-paper-scissors reveal: both fists shake three times, then the two choices appear (module state keeps the timing across redraws)
let slRev={g:null,seq:-1,t0:0};
function slArena(g,ctx,me){
 if(!g.rpsLast)return null;
 if(slRev.g!==g||slRev.seq!==g.rpsSeq){slRev={g,seq:g.rpsSeq,t0:Date.now()};setTimeout(()=>{try{ctx.render&&ctx.render()}catch(_){}},2700)}
 const el=Date.now()-slRev.t0;if(el>2600)return null;
 const mine=g.rpsLast[me],theirs=g.rpsLast[1-me],tie=mine===theirs,iWin=!tie&&(mine-theirs+3)%3===1;
 return `<div class="arc-felt sl-box sl-arena" style="--el:${el}ms">
  <h3>¡Piedra, papel o tijera!</h3>
  <div class="sl-hands"><div class="sl-fist l"><span class="f">✊</span><span class="r${iWin?' win':''}">${SLI[mine]}</span><small>Tú</small></div><i class="sl-vs">VS</i><div class="sl-fist r"><span class="f">✊</span><span class="r${!tie&&!iWin?' win':''}">${SLI[theirs]}</span><small>Rival</small></div></div>
  <p class="sl-res">${tie?'¡Empate! Otra vez…':iWin?'¡Ganaste! 🎉':'Ganó el rival'}</p></div>`;
}
function drawSlide(g,ctx,I){
 const me=I.viewer,opp=1-me;
 if(g.phase==='rps'||g.phase==='pickset'){const arena=slArena(g,ctx,me);if(arena)return `${arena}`}
 if(g.phase==='rps'){
  const picked=g.rps[me]!=null;
  return `${msg(g)}<div class="arc-felt sl-box"><h3>Piedra, papel o tijera</h3><p>Quien gane elige su tema de fichas y empieza.</p>
   <div class="sl-rps">${[0,1,2].map(v=>`<button type="button" class="sl-rpsb" data-a="rps" data-v="${v}" ${picked?'disabled':''}><span>${SLI[v]}</span><small>${SLN[v]}</small></button>`).join('')}</div>
   ${picked?'<p class="sl-wait">✔ Ya elegiste. Esperando al rival…</p>':''}</div>`;
 }
 if(g.phase==='pickset'){
  const mine=g.chooser===me;
  return `${msg(g)}<div class="arc-felt sl-box"><h3>${mine?'¡Ganaste! Elige tu tema':`Jugador ${g.chooser+1} está eligiendo su tema…`}</h3>
   <div class="sl-sets">${[0,1].map(i=>{const th=slTheme(g,i);return `<button type="button" class="sl-set s${i}" data-a="pickset" data-s="${i}" ${mine?'':'disabled'}><b>${th.name}</b><span>${th.icons.join(' ')}</span></button>`}).join('')}</div>
   <p class="sl-wait">Cada tema tiene 6 piezas distintas, 4 copias de cada una. En cada partida salen temas diferentes.</p></div>`;
 }
 const reveal=!!g.over,canIns=I.mine&&g.phase==='play'&&!!g.hand&&!g.over,allowed=canIns?slAllowed(g,me,g.hand):[];
 const board=(p,mineBoard)=>`<div class="sl-board ${mineBoard?'mine':'opp'}">${g.cols[p].map((col,c)=>`<div class="sl-col${slColDone(col,g.sets[p])?' done':''}${g.fx.includes(p+':'+c)?' hit':''}${mineBoard&&canIns&&allowed.length===1&&allowed[0]===c?' only':''}">${mineBoard?(canIns?`<button type="button" class="sl-ins" data-a="insert" data-c="${c}" ${allowed.includes(c)?'':'disabled'} aria-label="Poner la ficha en la columna ${c+1}">▼</button>`:'<span class="sl-ins off"></span>'):''}${col.map(t=>slTile(g,t,reveal)).join('')}</div>`).join('')}</div>`;
 const tag=p=>{const th=slTheme(g,g.sets[p]);return `<div class="sl-tag p${p}${g.turn===p&&!g.over?' turn':''}"><b>Jugador ${p+1}${ctx.wifi&&ctx.player===p?' · tú':''}</b><span>${th.name} ${th.icons.slice(0,3).join('')}</span><i>${slDoneCount(g,p)}/6 columnas</i></div>`};
 const twinHere=canIns&&g.cols[me].some(col=>col.some(x=>x.up&&!x.w&&!g.hand.w&&x.s===g.hand.s&&x.t===g.hand.t));
 const lock=canIns&&allowed.length===1?(twinHere?`Ya tienes esa pieza: solo puede ir en la columna marcada.`:`Solo cabe en la columna marcada: en cada columna solo van piezas iguales.`):'Toca una flecha ▼ de tu lado para ponerla encima de esa columna.';
 const hand=g.hand&&!g.over?`<div class="sl-hand${canIns?' mine':''}"><span class="sl-hl">${canIns?'Tu ficha:':`Ficha de Jugador ${g.turn+1}:`}</span>${slTile(g,g.hand,true)}<p>${canIns?lock:'Espera su jugada…'}</p></div>`:'';
 return `${msg(g)}<div class="arc-felt sl-table">${tag(opp)}${board(opp,false)}${hand||'<div class="sl-hand"></div>'}${board(me,true)}${tag(me)}</div>`;
}

/* ---------- registry ---------- */
const pl=(n,w)=>`${n} ${n===1?w:w+'s'}`;
const infoFor={
 domino:g=>['',''],                      // the Dominó table has its own seats and score (the top bar is hidden by CSS)
 memory:g=>[0,1].map(p=>pl(g.pairs[p],'pareja')),
 dotsboxes:g=>[0,1].map(p=>pl(g.score[p],'cuadro')),
 stop:g=>[0,1].map(p=>g.phase==='answer'?(g.done[p]?'✔ listo':'escribiendo…'):g.phase==='vote'?(g.voted[p]?'✔ votó':'votando…'):`${g.points[p]} pts`),
 mahjong:g=>[0,1].map(p=>pl(g.score[p],'pareja')),
 blackjack:g=>[0,1].map(p=>g.over?`${score21(g.hands[p])} pts`:g.stood[p]?'plantado':pl(g.hands[p].length,'carta')),
 poker:g=>[0,1].map(p=>g.over?pokerName(rankPoker(g.hands[p])):g.stage==='swap'&&g.turn>p?'ya cambió':'5 cartas'),
 escoba:g=>[0,1].map(p=>`${g.total[p]} pts · ${ICO.broom}${g.escobas[p]}`),
 rummy:g=>[0,1].map(p=>`${g.rscore?g.rscore[p]:0} pts · ${pl(g.hands[p].length,'carta')}`),
 slide:g=>[0,1].map(p=>g.phase==='play'||g.over?`${slDoneCount(g,p)}/6 columnas`:'—')
};
const drawers={slide:drawSlide,domino:drawDomino,memory:drawMemory,dotsboxes:drawDots,stop:drawStop,mahjong:drawMahjong,blackjack:drawBlackjack,poker:drawPoker,escoba:drawEscoba,rummy:drawRummy};

function render(id,g,ctx){
 D.t=Date.now();
 const solo=g.mode==='pve'&&!ctx.wifi;                   // 0.2.58: you against the computer — you are always seat 0
 const I={viewer:ctx.wifi?ctx.player:(solo?0:g.turn),opp:0,mine:false};
 I.opp=1-I.viewer;
 // In STOP both Wi-Fi players act at the same time, so "my turn" is not a thing there.
 const simultaneous=(id==='stop'&&ctx.wifi&&g.phase!=='result')||(id==='slide'&&ctx.wifi&&g.phase==='rps');
 I.mine=!g.over&&(simultaneous||(!ctx.wifi&&(!solo||g.turn===0))||(ctx.wifi&&ctx.player===g.turn));
 if(id==='domino'&&g.phase==='handend')I.mine=true;
 const hidden=g.curtain&&!ctx.wifi&&!g.over;
 const waiting=ctx.wifi&&!I.mine&&!g.over&&!simultaneous&&id!=='domino'?`<div class="arc-wait">⏳ Esperando al Jugador ${g.turn+1}…</div>`:'';
 const body=hidden?curtainHtml(g):drawers[id](g,ctx,I);
 const dd=id==='domino'?` data-dn="${g.row.length}" data-dt="${g.turn}" data-dover="${g.over?1:0}" data-ds="${g.ts|0}" data-dv="${I.viewer}"`:(id==='slide'?` data-sn="${g.moves|0}"`:'');   // read by js/domino-table.js (sounds)
 return {html:`<div class="extra-game arc arc-${id}"${dd}>${bar(g,ctx,infoFor[id](g),simultaneous)}${waiting}${body}</div>`,bind:()=>bind(id,g,ctx)};
}

/* =====================================================================
 * WI-FI: what each player is allowed to see
 * ===================================================================== */
// Copy of the game state with the OTHER player's secrets removed. This is what the host sends to the guest.
// Hidden things become `null` placeholders, so counts (cards in hand, cards in the deck) still work.
function view(id,g,forP){
 const v=JSON.parse(JSON.stringify(g));
 if(g.over||(id==='domino'&&g.phase==='handend'))return v;     // game finished: everything is revealed
 const o=1-forP,hide=a=>Array(a.length).fill(null);
 switch(id){
  case 'domino':v.hands=g.hands.map((h,p)=>p===forP?h:hide(h));break;
  case 'memory':v.tiles=v.tiles.map((t,i)=>t.gone||g.open.includes(i)?t:{...t,v:null});break;
  case 'stop':if(g.phase==='answer')v.answers[o]=Array(10).fill('');break;
  case 'blackjack':if(g.stage==='play'){v.hands[o]=hide(g.hands[o]);v.dealer[1]=null;v.deck=hide(g.deck)}break;
  case 'poker':v.hands[o]=hide(g.hands[o]);v.deck=hide(g.deck);v.pick[o]=[];break;
  case 'escoba':v.hands[o]=hide(g.hands[o]);v.deck=hide(g.deck);if(g.turn===o){v.sel=[];v.card=-1}break;
  case 'rummy':v.hands[o]=hide(g.hands[o]);v.deck=hide(g.deck);if(g.turn===o)v.sel=[];break;
  case 'slide':v.cols=g.cols.map(pl=>pl.map(col=>col.map(x=>x.up?x:{up:false})));break;
 }
 return v;
}

/* =====================================================================
 * EVENTS
 * ===================================================================== */
function showHint(g,ctx){
 const me=ctx.wifi?ctx.player:g.turn,hand=g.hands[me],order=g.card>=0?[g.card]:hand.map((_,i)=>i);
 for(const i of order){
  const cs=sCombos(g.table,15-sval(hand[i]));
  if(cs.length){D.hint={card:i,sel:cs[0]};ctx.render();return}
 }
 D.hint=null;g.message='No hay capturas posibles con esa carta: déjala en la mesa.';ctx.render();
}

function bind(id,g,ctx){
 const root=document.querySelector('.extra-game.arc');
 if(!root)return;
 root.querySelectorAll('[data-a]').forEach(b=>{b.onclick=()=>{
  if(b.disabled)return;
  const act={a:b.dataset.a};
  for(const k of ['i','o','m','v','s','c'])if(b.dataset[k]!==undefined&&b.dataset[k]!=='')act[k]=+b.dataset[k];
  if(b.dataset.side)act.side=b.dataset.side;
  if(b.dataset.k)act.k=b.dataset.k;
  if(act.a==='stopsubmit'){act.a='submit';act.answers=D.stop.slice()}
  else if(act.a==='votesubmit'){act.a='votes';act.v=D.votes.slice()}
  else if(act.a==='hint'){showHint(g,ctx);return}
  else if(act.a==='dsort'){D.dsort=!D.dsort;ctx.render();return}          // 0.3.41: ordenar las fichas del dominó en tu mano (solo cambia cómo se ven)
  D.hint=null;ctx.dispatch(act);
 }});
 // STOP answer boxes: keep what was typed even if a Wi-Fi update re-draws the screen.
 root.querySelectorAll('[data-stop]').forEach(inp=>{
  const i=+inp.dataset.stop;
  inp.oninput=()=>{D.stop[i]=inp.value;const sb=root.querySelector('[data-a="stopsubmit"]');if(sb)sb.disabled=!D.stop.slice(0,10).every(x=>String(x||'').trim())};
  inp.onfocus=()=>{D.focus=i};
  inp.onblur=()=>{if(Date.now()-D.t>150)D.focus=-1};
  inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();const nx=root.querySelector(`[data-stop="${i+1}"]`);if(nx)nx.focus();else inp.blur()}};
 });
 root.querySelectorAll('[data-vote]').forEach(b=>{b.onclick=()=>{const i=+b.dataset.vote;D.votes[i]=D.votes[i]===false;ctx.render()}});
 if(id==='stop'&&D.focus>=0){
  const el=root.querySelector(`[data-stop="${D.focus}"]`);
  if(el){el.focus({preventScroll:true});try{el.setSelectionRange(el.value.length,el.value.length)}catch(_){}}
 }
}

// Called once a second by the host page.
function tick(id,g,ctx){
 if(!g||g.over)return;
 if(id==='stop'&&g.phase==='answer'){
  const me=ctx.wifi?ctx.player:g.turn;
  if((g.curtain&&!ctx.wifi)||g.done[me])return;
  g.left=Math.max(0,g.left-1);
  const t=document.getElementById('stopTimer'),b=document.getElementById('stopBar');
  if(t)t.textContent=g.left;
  if(b)b.style.width=Math.max(0,Math.min(100,g.left/STOP_TIME*100))+'%';
  if(g.left<=0)ctx.dispatch({a:'submit',answers:D.stop.slice(),timeup:true});          // time is up: send what is written
 }
 if(id==='memory'&&g.locked){
  const sig=g.open.join(',');
  if(D.memSig!==sig){D.memSig=sig;D.memN=3}
  if(--D.memN<=0&&(!ctx.wifi||ctx.player===g.turn))ctx.dispatch({a:'continue'});   // cards turn back on their own
 }
}

/* =====================================================================
 * COMPUTER PLAYERS (0.2.58) — "PVE: Jugador vs IA". botAct(id,g) returns the NEXT single action of the computer player whose turn it is
 * (or null when it is a human's turn / nothing to do). The page applies it after a short pause and asks again, so a turn made of several
 * steps (select, select, play) is visible, one step at a time. Seat 0 is the human; in two-player games the computer is seat 1.
 * The computers only use what a person could see: Memoria remembers the tiles that were turned over (with a chance to forget), etc.
 * ===================================================================== */
const BOTS={};
const chance=p=>Math.random()<p;
const sameSet=(a,b)=>a.length===b.length&&a.every(x=>b.includes(x));

BOTS.domino=g=>{
 if(g.over||g.phase!=='play')return null;
 const p=g.turn,s=g.seats&&g.seats[p];if(!s||!s.bot)return null;
 const h=g.hands[p],fit=h.map((t,i)=>i).filter(i=>dFits(g,h[i]));if(!fit.length)return null;
 const e=dEnds(g),count=v=>h.reduce((n,t)=>n+(t[0]===v)+(t[1]===v),0);
 // play the heaviest tile (get rid of points first), doubles slightly first; when it fits both ends keep the end whose number we hold most
 fit.sort((x,y)=>(dTotal(h[y])+(h[y][0]===h[y][1]?2:0))-(dTotal(h[x])+(h[x][0]===h[x][1]?2:0)));
 const i=fit[0],t=h[i];let side;
 if(e){
  const fitL=t[0]===e[0]||t[1]===e[0],fitR=t[0]===e[1]||t[1]===e[1];
  if(fitL&&fitR)side=count(e[0])>=count(e[1])?'R':'L';else side=fitR?'R':'L';
 }
 return {a:'play',i,side,delay:950};
};

BOTS.memory=g=>{
 if(g.over||g.turn!==1||g.locked||g.open.length>=2)return null;
 const seen=g.seen||{},avail=g.tiles.map((t,i)=>i).filter(i=>!g.tiles[i].gone&&!g.open.includes(i));
 const known=i=>seen[i]!==undefined&&chance(.82);        // it sometimes forgets, like a person
 let pick=null;
 if(g.open.length===1){
  const v=g.tiles[g.open[0]].v;
  pick=avail.find(j=>seen[j]===v&&known(j));
 }else{
  for(const i of avail){if(seen[i]!==undefined&&avail.some(j=>j!==i&&seen[j]===seen[i])&&known(i)){pick=i;break}}
 }
 if(pick==null||pick===undefined){const unseen=avail.filter(i=>seen[i]===undefined);const pool=unseen.length?unseen:avail;pick=pool[Math.floor(Math.random()*pool.length)]}
 return {a:'tile',i:pick,delay:850};
};

BOTS.dotsboxes=g=>{
 if(g.over||g.turn!==1)return null;
 const free=[];for(let y=0;y<5;y++)for(let x=0;x<4;x++)free.push(`h${x},${y}`);for(let y=0;y<4;y++)for(let x=0;x<5;x++)free.push(`v${x},${y}`);
 const open=free.filter(k=>g.edges[k]===undefined);if(!open.length)return null;
 const boxesOf=k=>{const m=/^([hv])(\d+),(\d+)$/.exec(k),x=+m[2],y=+m[3],o=[];
  if(m[1]==='h'){if(y>0)o.push([x,y-1]);if(y<4)o.push([x,y])}else{if(x>0)o.push([x-1,y]);if(x<4)o.push([x,y])}
  return o.filter(([bx,by])=>bx<4&&by<4)};
 const edgesOf=([bx,by])=>[`h${bx},${by}`,`h${bx},${by+1}`,`v${bx},${by}`,`v${bx+1},${by}`];
 const have=b=>edgesOf(b).filter(z=>g.edges[z]!==undefined).length;
 const closes=k=>boxesOf(k).filter(b=>have(b)===3).length;       // boxes this line completes
 const gives=k=>boxesOf(k).filter(b=>have(b)===2).length;        // boxes this line leaves with 3 sides (a gift for the rival)
 let best=open.filter(k=>closes(k)>0).sort((a,b)=>closes(b)-closes(a));
 let k;
 if(best.length)k=best[0];
 else{
  const safe=open.filter(z=>gives(z)===0);
  if(safe.length)k=safe[Math.floor(Math.random()*safe.length)];
  else{const m=Math.min(...open.map(gives));const pool=open.filter(z=>gives(z)===m);k=pool[Math.floor(Math.random()*pool.length)]}
 }
 return {a:'edge',k,delay:750};
};

BOTS.mahjong=g=>{
 if(g.over||g.turn!==1)return null;
 const gone=g.tiles.map(t=>t.gone),free=[];g.tiles.forEach((t,i)=>{if(mjFree(i,gone))free.push(i)});
 if(g.selected.length===1){
  const j=g.selected[0],m=free.find(i=>i!==j&&g.tiles[i].v===g.tiles[j].v);
  return {a:'pick',i:m!==undefined?m:j,delay:650};
 }
 const pairs=[];free.forEach((x,k)=>free.slice(k+1).forEach(y=>{if(g.tiles[x].v===g.tiles[y].v)pairs.push([x,y])}));
 if(!pairs.length)return null;
 // prefer pairs that do not open the table too much for the rival: the ones with the top-layer tile first
 const p=pairs[Math.floor(Math.random()*pairs.length)];
 return {a:'pick',i:p[0],delay:850};
};

BOTS.blackjack=g=>{
 if(g.over||g.stage!=='play'||g.turn!==1||g.stood[1])return null;
 const total=score21(g.hands[1]),up=g.dealer[0],uv=up?(up.v===1?11:Math.min(up.v,10)):10;
 const target=uv>=7?17:12;                                     // a strong dealer card: keep drawing; a weak one: stop early
 return total<target?{a:'hit',delay:900}:{a:'stand',delay:900};
};

function pokerDiscards(h){
 const rank=rankPoker(h),cat=Math.floor(rank/15**5);
 if(cat>=4)return [];                                           // straight or better: keep everything
 const val=c=>c.v===1?14:c.v,by={};h.forEach((c,i)=>(by[val(c)]=by[val(c)]||[]).push(i));
 const grouped=Object.values(by).filter(a=>a.length>=2).flat();
 if(grouped.length)return h.map((_,i)=>i).filter(i=>!grouped.includes(i)).slice(0,3);
 const suits={};h.forEach((c,i)=>(suits[c.s]=suits[c.s]||[]).push(i));
 const four=Object.values(suits).find(a=>a.length===4);
 if(four)return h.map((_,i)=>i).filter(i=>!four.includes(i));
 return h.map((_,i)=>i).sort((a,b)=>val(h[a])-val(h[b])).slice(0,3);    // nothing: keep the two highest cards
}
BOTS.poker=g=>{
 if(g.over||g.stage!=='swap'||g.turn!==1)return null;
 const want=pokerDiscards(g.hands[1]),have=g.pick[1];
 const add=want.find(i=>!have.includes(i));if(add!==undefined)return {a:'toggle',i:add,delay:450};
 const drop=have.find(i=>!want.includes(i));if(drop!==undefined)return {a:'toggle',i:drop,delay:300};
 return {a:'confirm',delay:800};
};

function escobaPlan(g){
 const hand=g.hands[1];let best=null;
 hand.forEach((c,i)=>{
  sCombos(g.table,15-sval(c)).forEach(ix=>{
   const cards=[c,...ix.map(k=>g.table[k])];
   let score=cards.length+cards.filter(x=>x.s==='Oros').length*2+cards.filter(x=>x.v===7).length*2+(cards.some(x=>x.s==='Oros'&&x.v===7)?6:0)+(ix.length===g.table.length?12:0);
   if(!best||score>best.score)best={card:i,sel:ix,score};
  });
 });
 if(best)return best;
 // no capture possible: leave the least valuable card on the table
 const worth=c=>(c.s==='Oros'?3:0)+(c.v===7?4:0)+(c.s==='Oros'&&c.v===7?10:0)+(c.v<=4?1:0);
 let w=0,lowest=99;hand.forEach((c,i)=>{const s=worth(c);if(s<lowest){lowest=s;w=i}});
 return {card:w,sel:[],score:0};
}
BOTS.escoba=g=>{
 if(g.over||g.phase!=='play'||g.turn!==1)return null;
 const plan=escobaPlan(g);
 if(g.sel.some(i=>i<0||i>=g.table.length))return {a:'hand',i:g.card>=0?g.card:plan.card,delay:200};       // stale selection: clear it
 if(g.card!==plan.card)return {a:'hand',i:plan.card,delay:800};
 const need=plan.sel.find(i=>!g.sel.includes(i));if(need!==undefined)return {a:'table',i:need,delay:550};
 const extra=g.sel.find(i=>!plan.sel.includes(i));if(extra!==undefined)return {a:'table',i:extra,delay:300};
 return {a:'play',delay:700};
};

// every valid group (same number, different suits) or run (same suit, consecutive) inside a hand: arrays of indices
function rummyMelds(h){
 const out=[],n=h.length;
 for(let m=1;m<(1<<n);m++){
  let c=0;for(let i=0;i<n;i++)if(m&(1<<i))c++;
  if(c<3||c>6)continue;
  const ix=[];for(let i=0;i<n;i++)if(m&(1<<i))ix.push(i);
  if(rKind(ix.map(i=>h[i])))out.push(ix);
 }
 return out.sort((a,b)=>b.length-a.length);
}
BOTS.rummy=g=>{
 if(g.over||g.turn!==1)return null;
 const h=g.hands[1];
 if(!g.drawn){
  const top=g.discard[g.discard.length-1];
  if(top){
   const useful=rummyMelds([...h,top]).some(ix=>ix.includes(h.length))||[0,1].some(o=>g.melds[o].some(m=>rKind([...m.cards,top])===m.kind));
   if(useful)return {a:'top',delay:900};
  }
  return {a:'stock',delay:900};
 }
 // 1) lay down a combination
 const melds=rummyMelds(h);
 if(melds.length){
  const m=melds[0];
  if(sameSet(g.sel,m))return {a:'meld',delay:900};
  const off=g.sel.find(i=>!m.includes(i));if(off!==undefined)return {a:'sel',i:off,delay:250};
  return {a:'sel',i:m.find(i=>!g.sel.includes(i)),delay:450};
 }
 // 2) add a single card to a combination already on the table
 for(let i=0;i<h.length;i++)for(const o of [0,1])for(let k=0;k<g.melds[o].length;k++){
  if(rKind([...g.melds[o][k].cards,h[i]])===g.melds[o][k].kind){
   if(g.sel.length===1&&g.sel[0]===i)return {a:'lay',o,m:k,delay:800};
   const off=g.sel.find(x=>x!==i);if(off!==undefined)return {a:'sel',i:off,delay:250};
   return {a:'sel',i,delay:450};
  }
 }
 // 3) discard the card that is least useful (many points, no partner nearby), never the one just taken from the discard pile
 const potential=(c,j)=>h.reduce((s,d,k)=>{if(k===j)return s;if(d.v===c.v)s+=3;else if(d.s===c.s&&Math.abs(d.v-c.v)<=2)s+=2;return s},0);
 let best=-1,score=-1e9;
 h.forEach((c,j)=>{if(c.id===g.fromDiscard)return;const sc=rPoints(c)-potential(c,j)*2;if(sc>score){score=sc;best=j}});
 if(best<0)best=0;
 return {a:'discard',i:best,delay:900};
};

BOTS.slide=g=>{
 if(g.over)return null;
 if(g.phase==='rps'){if(g.rps[1]!=null)return null;return {a:'rps',v:Math.floor(Math.random()*3),seat:1,delay:800}}
 if(g.phase==='pickset'){if(g.chooser!==1)return null;return {a:'pickset',s:Math.floor(Math.random()*2),seat:1,delay:3000}}
 if(g.phase!=='play'||g.turn!==1||!g.hand)return null;
 // choose the column: stack the same piece on the same column, never bury a finished one, avoid pushing out a good face-up tile
 const cols=g.cols[1],t=g.hand,allowed=slAllowed(g,1,t);let best=-1e9,bc=allowed[0];
 const same=x=>!x.w&&!t.w&&x.s===t.s&&x.t===t.t;
 cols.forEach((col,c)=>{
  if(!allowed.includes(c))return;
  const ups=col.filter(x=>x.up&&!x.w),dedicated=ups.length?ups[0]:null;
  const nSame=t.w?ups.length:ups.filter(same).length,nOther=ups.length-nSame;
  let s=nSame*6-nOther*4;
  if(slColDone(col,g.sets[1]))s-=100;
  if(!ups.length){s+=2;if(!t.w&&cols.some((cc,i)=>i!==c&&cc.some(x=>x.up&&same(x))))s-=3}
  const bottom=col[col.length-1];
  if(bottom.up&&!bottom.w&&dedicated&&bottom.s===dedicated.s&&bottom.t===dedicated.t&&nSame>0)s-=8;
  if(!bottom.up)s+=1;
  s+=Math.random()*.5;
  if(s>best){best=s;bc=c}
 });
 return {a:'insert',c:bc,seat:1,delay:950};
};
function botAct(id,g){
 if(!g||g.over&&!(id==='domino'&&g.phase==='handend'))return null;
 if(id!=='domino'&&g.mode!=='pve')return null;
 const f=BOTS[id];if(!f)return null;
 try{return f(g)||null}catch(e){console.warn('SUDOMI bot:',e);return null}
}

window.SudomiExtraGames={create,apply,view,render,tick,names,botAct,DOM_TARGET};
})();
