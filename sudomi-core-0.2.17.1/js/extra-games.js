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
const names={domino:'Dominó',memory:'Memoria de animales',dotsboxes:'Puntos y cajas',stop:'STOP',mahjong:'Duelo Mahjong',blackjack:'Blackjack',poker:'Póker',escoba:'Escoba',rummy:'Rummy'};

/* ---------- decks ---------- */
const SUITS=['♠','♥','♦','♣'];
const stdDeck=()=>shuffle(SUITS.flatMap(s=>Array.from({length:13},(_,i)=>({s,v:i+1,id:uid()}))));
const spanishDeck=()=>shuffle(['Oros','Copas','Espadas','Bastos'].flatMap(s=>[1,2,3,4,5,6,7,10,11,12].map(v=>({s,v,id:uid()}))));

/* ---------- shared state helpers ---------- */
function base(id,mode){return {id,mode,turn:0,over:false,winner:null,message:'',curtain:false,fx:[]}}
function win(g,p,msg){g.over=true;g.winner=p;g.curtain=false;g.message=msg||`Jugador ${p+1} gana.`}
// Hand the turn over. On one shared device the next player must not see the hand, so raise the curtain.
function pass(g){g.turn=1-g.turn;if(!g.wifi&&!g.over)g.curtain=true}
const sideWinner=(a,b)=>a===b?-1:a>b?0:1;

function create(id,mode='pvp'){
 const g=base(id,mode);
 ({domino:newDomino,memory:newMemory,dotsboxes:newDots,stop:newStop,mahjong:newMahjong,blackjack:newBlackjack,poker:newPoker,escoba:newEscoba,rummy:newRummy})[id](g);
 return g;
}

/* =====================================================================
 * DOMINÓ — double-six, 7 tiles each, draw from the stock when you cannot play.
 * ===================================================================== */
const dTotal=t=>t[0]+t[1];
function newDomino(g){
 const all=[];for(let a=0;a<=6;a++)for(let b=a;b<=6;b++)all.push([a,b]);shuffle(all);
 g.hands=[all.slice(0,7),all.slice(7,14)];g.stock=all.slice(14);g.row=[];g.sel=-1;
 // The holder of the highest double (or, failing that, the highest tile) opens the game.
 let best=-1,who=0;
 g.hands.forEach((h,p)=>h.forEach(t=>{const s=(t[0]===t[1]?100:0)+dTotal(t);if(s>best){best=s;who=p}}));
 g.turn=who;g.message=`Jugador ${who+1} tiene la ficha más alta y abre la partida.`;
}
const dEnds=g=>g.row.length?[g.row[0][0],g.row[g.row.length-1][1]]:null;
const dFits=(g,t)=>{const e=dEnds(g);return !e||t[0]===e[0]||t[1]===e[0]||t[0]===e[1]||t[1]===e[1]};
const dPlayable=(g,p)=>g.hands[p].some(t=>dFits(g,t));
// After every change: end blocked games, and pass automatically for a player who truly cannot move.
function dSettle(g){
 if(g.over)return;
 const stuck=p=>!g.stock.length&&!dPlayable(g,p);
 if(stuck(0)&&stuck(1)){
  const n=g.hands.map(h=>h.reduce((s,t)=>s+dTotal(t),0)),w=sideWinner(n[1],n[0]);   // fewer pips wins
  win(g,w,`Partida bloqueada · ${n[0]} contra ${n[1]} puntos${w<0?' · empate':''}`);return;
 }
 if(stuck(g.turn)){const who=g.turn+1;pass(g);g.message=`Jugador ${who} no tiene jugada y pasa.`}
}
function applyDomino(g,p,a){
 if(g.over||p!==g.turn)return;
 const h=g.hands[p];
 if(a.a==='play'){
  if(!inRange(a.i,h.length))return;
  const t=h[a.i];if(!dFits(g,t))return;
  const e=dEnds(g);let side=a.side;
  if(e){
   const fitL=t[0]===e[0]||t[1]===e[0],fitR=t[0]===e[1]||t[1]===e[1];
   if(fitL&&fitR&&e[0]!==e[1]&&side!=='L'&&side!=='R'){g.sel=a.i;g.message='Esa ficha encaja en los dos extremos: elige dónde ponerla.';return}
   if((side==='L'&&!fitL)||(side==='R'&&!fitR))return;
   if(side!=='L'&&side!=='R')side=fitR?'R':'L';
  }
  h.splice(a.i,1);
  if(!e)g.row.push([t[0],t[1]]);
  else if(side==='L')g.row.unshift(t[1]===e[0]?[t[0],t[1]]:[t[1],t[0]]);
  else g.row.push(t[0]===e[1]?[t[0],t[1]]:[t[1],t[0]]);
  g.sel=-1;g.fx=[e?side:'R'];
  if(!h.length){const pips=g.hands[1-p].reduce((s,x)=>s+dTotal(x),0);win(g,p,`¡Dominó! Jugador ${p+1} se quedó sin fichas · +${pips} puntos`);return}
  pass(g);g.message=`Turno del Jugador ${g.turn+1}.`;dSettle(g);
 }else if(a.a==='draw'){
  // You may only draw when nothing in your hand fits, and only while the stock lasts.
  if(!g.stock.length||(g.row.length&&dPlayable(g,p)))return;
  h.push(g.stock.pop());g.fx=['draw'];g.sel=-1;
  g.message=dPlayable(g,p)?'Ficha robada: ya puedes jugar.':'Ficha robada. Sigue sin encajar.';
  dSettle(g);
 }
}

/* =====================================================================
 * MEMORIA DE ANIMALES — a match keeps the turn, a miss passes it.
 * ===================================================================== */
const ANIMALS=['🐶','🐱','🦊','🐼','🐸','🦁','🐢','🦉'];
function newMemory(g){
 g.tiles=shuffle(ANIMALS.flatMap(v=>[v,v])).map((v,i)=>({v,id:i,gone:false,owner:-1}));
 g.open=[];g.pairs=[0,0];g.locked=false;g.message='Voltea dos fichas iguales.';
}
function applyMemory(g,p,a){
 if(g.over||p!==g.turn)return;
 if(a.a==='tile'){
  if(g.locked||g.open.length>=2||!inRange(a.i,16))return;
  const t=g.tiles[a.i];if(t.gone||g.open.includes(a.i))return;
  g.open.push(a.i);g.fx=[a.i];
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
const STOP_TIME=90,STOP_GRACE=15;
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
  if(a.a==='next'){newEscoba(g,{total:g.total,round:g.round+1,dealer:1-g.dealer});g.curtain=!g.wifi;g.fx=[...g.hands[0],...g.hands[1]].map(c=>c.id)}
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
function rEndDeadwood(g,why){
 const d=g.hands.map(h=>h.reduce((s,c)=>s+rPoints(c),0)),w=sideWinner(d[1],d[0]);   // fewer leftover points wins
 win(g,w,`${why} · cartas sueltas: J1 ${d[0]} / J2 ${d[1]}${w<0?' · empate':''}`);
}
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
   if(!g.hands[p].length)win(g,p,`¡Rummy! Jugador ${p+1} se quedó sin cartas · rival suma ${g.hands[1-p].reduce((s,c)=>s+rPoints(c),0)}`);
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
   if(!g.hands[p].length)win(g,p,`¡Rummy! Jugador ${p+1} se quedó sin cartas · rival suma ${g.hands[1-p].reduce((s,c)=>s+rPoints(c),0)}`);
   break;
  }
  case 'discard':{
   if(!g.drawn||!inRange(a.i,h.length))return;
   const c=h[a.i];
   if(c.id===g.fromDiscard){g.message='No puedes devolver la carta que acabas de tomar del descarte.';return}
   h.splice(a.i,1);g.discard.push(c);g.drawn=false;g.fromDiscard=null;g.sel=[];g.fx=[c.id];
   if(!h.length)win(g,p,`¡Rummy! Jugador ${p+1} se quedó sin cartas · rival suma ${g.hands[1-p].reduce((s,x)=>s+rPoints(x),0)}`);
   else{pass(g);g.message=`Turno del Jugador ${g.turn+1}: roba una carta.`}
   break;
  }
 }
}

const reducers={domino:applyDomino,memory:applyMemory,dotsboxes:applyDots,stop:applyStop,mahjong:applyMahjong,blackjack:applyBlackjack,poker:applyPoker,escoba:applyEscoba,rummy:applyRummy};
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
 return `<span class="pcard ${isRed(c.s)?'red':'blk'}${o.fx?' deal':''}"${o.i!=null?` style="--i:${o.i}"`:''}><b>${rank(c.v)}</b><i>${c.s}</i><em>${c.s}</em></span>`;
}
const SPS={Oros:['🪙','oros'],Copas:['🏆','copas'],Espadas:['⚔️','espadas'],Bastos:['🪵','bastos']};
const SPN={1:'As',10:'Sota',11:'Caballo',12:'Rey'};
function scard(c,o={}){
 if(!c)return '<span class="pcard back"></span>';
 const [ic,cl]=SPS[c.s];
 return `<span class="scard ${cl}${o.fx?' deal':''}"${o.i!=null?` style="--i:${o.i}"`:''}><b>${c.v}</b><em>${ic}</em><small>${SPN[c.v]||c.s}</small></span>`;
}
const backs=n=>`<span class="backs">${Array.from({length:n},(_,i)=>pcard(null,{mini:true,i})).join('')}</span>`;
const msg=g=>g.message?`<p class="arc-msg">${esc(g.message)}</p>`:'';

function bar(g,ctx,info,noTurn){
 return `<div class="arc-bar">${[0,1].map(p=>`<div class="arc-chip p${p}${!noTurn&&g.turn===p&&!g.over?' turn':''}${g.over&&g.winner===p?' won':''}"><span class="av">${p+1}</span><div><strong>Jugador ${p+1}${ctx.wifi&&ctx.player===p?' · tú':''}</strong><small>${info[p]}</small></div>${g.over&&g.winner===p?'<span class="crown">🏆</span>':''}</div>`).join('')}</div>`;
}
function curtainHtml(g){
 return `<div class="arc-curtain"><span class="lock">🔒</span><h3>Turno del Jugador ${g.turn+1}</h3>${msg(g)}<p class="arc-sub">Pásale el dispositivo. Toca cuando estés listo para ver tu mano.</p><button class="arc-btn big" data-a="reveal">Ver mi turno</button></div>`;
}

/* ---------- Dominó ---------- */
const PIPS=[[],[4],[0,8],[0,4,8],[0,2,6,8],[0,2,4,6,8],[0,2,3,5,6,8]];
const half=n=>`<span class="dh">${Array.from({length:9},(_,k)=>`<i${PIPS[n].includes(k)?' class="on"':''}></i>`).join('')}</span>`;
const dtile=(t,cls='')=>`<span class="dtile${cls?' '+cls:''}">${half(t[0])}<u></u>${half(t[1])}</span>`;
function drawDomino(g,ctx,I){
 const e=dEnds(g),h=g.hands[I.viewer],oppHand=g.hands[I.opp];
 const row=g.row.length
  ?g.row.map((t,k)=>dtile(t,(g.fx[0]==='L'&&k===0)||(g.fx[0]==='R'&&k===g.row.length-1)?'pop':'')).join('')
  :`<span class="arc-hint">La mesa está vacía: ${I.mine?'juega cualquier ficha para empezar.':'espera la primera ficha.'}</span>`;
 const mustDraw=I.mine&&g.row.length>0&&!dPlayable(g,I.viewer)&&g.stock.length>0;
 const sideChoice=I.mine&&e&&g.sel>=0&&h[g.sel]
  ?`<div class="d-side"><span>¿Dónde la colocas?</span><button class="arc-btn" data-a="play" data-i="${g.sel}" data-side="L">◀ Izquierda (${e[0]})</button><button class="arc-btn" data-a="play" data-i="${g.sel}" data-side="R">Derecha (${e[1]}) ▶</button></div>`:'';
 const hand=h.map((t,i)=>{const ok=I.mine&&dFits(g,t);return `<button class="dbtn ${ok?'ok':'no'}${g.sel===i?' picked':''}" data-a="play" data-i="${i}" ${ok?'':'disabled'} aria-label="Ficha ${t[0]}-${t[1]}">${dtile(t,g.fx[0]==='draw'&&i===h.length-1?'pop':'')}</button>`}).join('');
 const rival=g.over
  ?`<div class="d-opp"><span>Fichas del Jugador ${I.opp+1}:</span><div class="d-open">${oppHand.map(t=>dtile(t,'sm')).join('')||'—'}</div></div>`
  :`<div class="d-opp"><span>Jugador ${I.opp+1}</span><div class="d-open">${oppHand.map(()=>'<span class="dback"></span>').join('')}</div></div>`;
 return `<div class="arc-felt dom">${rival}${e?`<div class="d-ends"><span>◀ ${e[0]}</span><span>${e[1]} ▶</span></div>`:''}<div class="d-board">${row}</div></div>
  ${msg(g)}${sideChoice}
  <div class="d-hand">${hand||'<span class="arc-hint">Sin fichas</span>'}</div>
  <div class="arc-actions"><button class="arc-btn${mustDraw?' pulse':''}" data-a="draw" ${mustDraw?'':'disabled'}>Robar del pozo (${g.stock.length})</button></div>`;
}

/* ---------- Memoria ---------- */
function drawMemory(g,ctx,I){
 const cards=g.tiles.map((t,i)=>{
  const up=t.gone||g.open.includes(i),cls=['mcard'];
  if(up)cls.push('up');if(t.gone)cls.push('own'+t.owner);if(g.fx.includes(i))cls.push(t.gone?'pairpop':'flip');
  const dis=!I.mine||up||g.locked||g.open.length>=2;
  return `<button class="${cls.join(' ')}" data-a="tile" data-i="${i}" ${dis?'disabled':''} aria-label="${up?t.v:'Ficha oculta'}"><span class="mc-back">?</span><span class="mc-face">${up&&t.v?t.v:''}</span></button>`;
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
   <div class="arc-actions"><button class="arc-btn big stopbtn" data-a="stopsubmit">¡STOP!</button></div>`;
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
 const pile=p=>`<span class="es-pile p${p}"><b>${g.captured[p].length}</b> cartas · 🧹${g.escobas[p]}</span>`;
 let summary='';
 if(g.summary&&(round||g.over)){
  summary=`<table class="es-sum"><thead><tr><th>Ronda ${g.round}</th><th>J1</th><th>J2</th></tr></thead><tbody>${g.summary.rows.map(r=>`<tr><td>${r.name}</td><td class="${r.pt[0]?'pt':''}">${r.a}${r.pt[0]?' <small>+'+r.pt[0]+'</small>':''}</td><td class="${r.pt[1]?'pt':''}">${r.b}${r.pt[1]?' <small>+'+r.pt[1]+'</small>':''}</td></tr>`).join('')}</tbody><tfoot><tr><td>Total (meta ${ESCOBA_TARGET})</td><td>${g.total[0]}</td><td>${g.total[1]}</td></tr></tfoot></table>${round&&!g.over?'<div class="arc-actions"><button class="arc-btn big" data-a="next">Siguiente ronda ▶</button></div>':''}`;
 }
 const hands=round||g.over?'':`<div class="d-hand">${mine}</div>
  <div class="es-sumline">${I.mine&&card?`Suma: <b class="${sum===15?'ok':sum>15?'over':''}">${sum}</b> / 15`:'&nbsp;'}</div>
  <div class="arc-actions"><button class="arc-btn big" data-a="play" ${I.mine&&g.card>=0?'':'disabled'}>${g.sel.length?`Capturar (suma ${sum})`:'Dejar carta en la mesa'}</button><button class="arc-btn alt" data-a="hint" ${I.mine?'':'disabled'}>💡 Pista</button></div>`;
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

/* ---------- registry ---------- */
const pl=(n,w)=>`${n} ${n===1?w:w+'s'}`;
const infoFor={
 domino:g=>[0,1].map(p=>pl(g.hands[p].length,'ficha')),
 memory:g=>[0,1].map(p=>pl(g.pairs[p],'pareja')),
 dotsboxes:g=>[0,1].map(p=>pl(g.score[p],'cuadro')),
 stop:g=>[0,1].map(p=>g.phase==='answer'?(g.done[p]?'✔ listo':'escribiendo…'):g.phase==='vote'?(g.voted[p]?'✔ votó':'votando…'):`${g.points[p]} pts`),
 mahjong:g=>[0,1].map(p=>pl(g.score[p],'pareja')),
 blackjack:g=>[0,1].map(p=>g.over?`${score21(g.hands[p])} pts`:g.stood[p]?'plantado':pl(g.hands[p].length,'carta')),
 poker:g=>[0,1].map(p=>g.over?pokerName(rankPoker(g.hands[p])):g.stage==='swap'&&g.turn>p?'ya cambió':'5 cartas'),
 escoba:g=>[0,1].map(p=>`${g.total[p]} pts · 🧹${g.escobas[p]}`),
 rummy:g=>[0,1].map(p=>`${pl(g.hands[p].length,'carta')} · ${pl(g.melds[p].length,'bajada')}`)
};
const drawers={domino:drawDomino,memory:drawMemory,dotsboxes:drawDots,stop:drawStop,mahjong:drawMahjong,blackjack:drawBlackjack,poker:drawPoker,escoba:drawEscoba,rummy:drawRummy};

function render(id,g,ctx){
 D.t=Date.now();
 const I={viewer:ctx.wifi?ctx.player:g.turn,opp:0,mine:false};
 I.opp=1-I.viewer;
 // In STOP both Wi-Fi players act at the same time, so "my turn" is not a thing there.
 const simultaneous=id==='stop'&&ctx.wifi&&g.phase!=='result';
 I.mine=!g.over&&(simultaneous||!ctx.wifi||ctx.player===g.turn);
 const hidden=g.curtain&&!ctx.wifi&&!g.over;
 const waiting=ctx.wifi&&!I.mine&&!g.over&&!simultaneous?`<div class="arc-wait">⏳ Esperando al Jugador ${g.turn+1}…</div>`:'';
 const body=hidden?curtainHtml(g):drawers[id](g,ctx,I);
 return {html:`<div class="extra-game arc arc-${id}">${bar(g,ctx,infoFor[id](g),simultaneous)}${waiting}${body}</div>`,bind:()=>bind(id,g,ctx)};
}

/* =====================================================================
 * WI-FI: what each player is allowed to see
 * ===================================================================== */
// Copy of the game state with the OTHER player's secrets removed. This is what the host sends to the guest.
// Hidden things become `null` placeholders, so counts (cards in hand, cards in the deck) still work.
function view(id,g,forP){
 const v=JSON.parse(JSON.stringify(g));
 if(g.over)return v;                                    // game finished: everything is revealed
 const o=1-forP,hide=a=>Array(a.length).fill(null);
 switch(id){
  case 'domino':v.hands[o]=hide(g.hands[o]);v.stock=hide(g.stock);break;
  case 'memory':v.tiles=v.tiles.map((t,i)=>t.gone||g.open.includes(i)?t:{...t,v:null});break;
  case 'stop':if(g.phase==='answer')v.answers[o]=Array(10).fill('');break;
  case 'blackjack':if(g.stage==='play'){v.hands[o]=hide(g.hands[o]);v.dealer[1]=null;v.deck=hide(g.deck)}break;
  case 'poker':v.hands[o]=hide(g.hands[o]);v.deck=hide(g.deck);v.pick[o]=[];break;
  case 'escoba':v.hands[o]=hide(g.hands[o]);v.deck=hide(g.deck);if(g.turn===o){v.sel=[];v.card=-1}break;
  case 'rummy':v.hands[o]=hide(g.hands[o]);v.deck=hide(g.deck);if(g.turn===o)v.sel=[];break;
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
  for(const k of ['i','o','m'])if(b.dataset[k]!==undefined&&b.dataset[k]!=='')act[k]=+b.dataset[k];
  if(b.dataset.side)act.side=b.dataset.side;
  if(b.dataset.k)act.k=b.dataset.k;
  if(act.a==='stopsubmit'){act.a='submit';act.answers=D.stop.slice()}
  else if(act.a==='votesubmit'){act.a='votes';act.v=D.votes.slice()}
  else if(act.a==='hint'){showHint(g,ctx);return}
  D.hint=null;ctx.dispatch(act);
 }});
 // STOP answer boxes: keep what was typed even if a Wi-Fi update re-draws the screen.
 root.querySelectorAll('[data-stop]').forEach(inp=>{
  const i=+inp.dataset.stop;
  inp.oninput=()=>{D.stop[i]=inp.value};
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
  if(g.left<=0)ctx.dispatch({a:'submit',answers:D.stop.slice()});          // time is up: send what is written
 }
 if(id==='memory'&&g.locked){
  const sig=g.open.join(',');
  if(D.memSig!==sig){D.memSig=sig;D.memN=3}
  if(--D.memN<=0&&(!ctx.wifi||ctx.player===g.turn))ctx.dispatch({a:'continue'});   // cards turn back on their own
 }
}

window.SudomiExtraGames={create,apply,view,render,tick,names};
})();
