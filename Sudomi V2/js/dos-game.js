/* SUDOMI 0.2.20 — DOS: a shedding card game for 1–4 players (window.SudomiDos).
 *
 * Modes: against the computer (1 vs 1), or an online room for 2, 3 or 4 players with a waiting room;
 * seats nobody takes are played by the computer ("IA").
 *
 * Structure of this file:
 *   1. rules engine  — plain functions over a JSON state (newGame, act, viewFor). No screen code.
 *   2. computer player (aiMove)
 *   3. screens       — menu, waiting room, table. They only ever draw a "view" (what ONE seat may see).
 * Online play is host-authoritative: guests send actions, the host applies them and sends each guest its own view,
 * so nobody ever receives another player's cards. The connection itself is js/party-net.js.
 *
 * Special cards: Rebobinar, Súper +2, Parry, Tornado — see RULES below (shown to the players in the "?" panel).
 */
(()=>{
 const COLORS=['r','b','g','y'],CNAME={r:'Rojo',b:'Azul',g:'Verde',y:'Amarillo'};
 const LABEL={skip:'Salta',rev:'Reversa',d2:'+2',wild:'Comodín',d4:'+4',rewind:'Rebobinar',super:'Súper +2',parry:'Parry',tornado:'Tornado'};
 const SYM={skip:'⊘',rev:'⇄',d2:'+2',wild:'★',d4:'+4',rewind:'⏪',super:'+2',parry:'🛡',tornado:'🌪'};
 const RULES=[
  ['Cómo se juega','Tira una carta del mismo color o del mismo número/símbolo que la del centro. Si tienes una carta que se puede tirar, tienes que tirarla: solo puedes robar o pasar cuando no tienes ninguna (el Parry es la única que puedes guardar). Gana quien se quede sin cartas.'],
  ['⊘ Salta · ⇄ Reversa · +2','Salta: el siguiente pierde el turno. Reversa: cambia el sentido (entre dos jugadores, salta). +2: el siguiente roba 2 y pierde el turno.'],
  ['★ Comodín · +4','Se pueden tirar siempre y eliges el color. Con +4 el siguiente roba 4 y pierde el turno.'],
  ['➕ Acumular +2 y +4','Si te tiran un +2 o un +4, puedes responder con tu propio +2 o +4 (de cualquier color): se suman y le toca al siguiente, que también puede responder. Quien no responda roba todas las cartas acumuladas y pierde el turno.'],
  ['⏪ Rebobinar','Cada jugador recupera la última carta que tiró y no puede volver a usarla en su próximo turno. Cancela los efectos que estaban por cumplirse. Eliges el color.'],
  ['+2 Súper +2','Todos los demás roban 2 cartas (no pierden el turno). Eliges el color.'],
  ['🛡 Parry','Cuando te tiran Salta, +2, +4 o Súper +2 puedes responder con Parry: el efecto le regresa a quien lo tiró. Usarlo cuenta como tu jugada. Es multicolor: también puedes tirarlo sobre cualquier color como una carta normal, o guardarlo.'],
  ['🌪 Tornado','Las cartas de todos se mezclan y van al centro boca abajo. Empezando por quien tiró el Tornado, cada jugador toma una carta por turno, sin saber cuál es, hasta tener la misma cantidad que tenía. Eliges el color.'],
  ['Jugadores','Contra la máquina, o en una sala online de 2 a 8 jugadores. Con 6 o más se usan dos barajas (la segunda no trae más Rebobinar, Súper +2 ni Tornado). Un Tornado ya jugado no vuelve al mazo.']
 ];
 const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
 const isNum=c=>c.c!=='k'&&c.v.length===1;
 const needsColor=c=>c.c==='k'&&c.v!=='parry';
 const cardName=c=>c.c==='k'?LABEL[c.v]:`${isNum(c)?c.v:LABEL[c.v]} ${CNAME[c.c].toLowerCase()}`;

 /* ================= 1. rules engine ================= */
 // 126 cards per deck. 0.2.24: with 6 or more players two decks are shuffled together.
 function deck(players=2){
  let u=0;const d=[];
  for(let copy=0;copy<(players>=6?2:1);copy++){
   for(const c of COLORS){
    d.push({u:u++,c,v:'0'});
    for(let n=1;n<=9;n++)for(let k=0;k<2;k++)d.push({u:u++,c,v:String(n)});
    for(const v of ['skip','rev','d2'])for(let k=0;k<2;k++)d.push({u:u++,c,v});
   }
   // the second deck brings no extra Rebobinar / Súper +2 / Tornado: with many players they would keep refilling every hand and the match would never end
   // 0.2.56: fewer special cards (owner request): Rebobinar/Súper +2/Tornado 4→2 each, Parry 6→3 (specials were 14% of the deck, now about 7%)
   const blacks=copy?{wild:4,d4:4,parry:2}:{wild:4,d4:4,parry:3,rewind:2,super:2,tornado:2};
   for(const v in blacks)for(let k=0;k<blacks[v];k++)d.push({u:u++,c:'k',v});
  }
  return shuffle(d);
 }
 const say=(s,t)=>{s.log.push(t);if(s.log.length>40)s.log.shift()};
 const nextOf=(s,p)=>((p+s.dir)%s.n+s.n)%s.n;
 const top=s=>s.discard[s.discard.length-1];
 const hasParry=(s,p)=>s.hands[p].some(c=>c.v==='parry');
 const isSpecial=c=>['rewind','super','parry','tornado'].includes(c.v);
 // 0.2.21: with a playable card in hand you MUST play. Parry is the only playable card you are allowed to keep.
 const mustPlay=(s,p)=>s.hands[p].some(c=>c.v!=='parry'&&canPlay(s,p,c));
 function newGame(names,kinds){
  const n=names.length,s={n,names,kinds,hands:[],draw:deck(n),discard:[],draft:null,color:'r',turn:0,dir:1,pend:{},skips:Array(n).fill(0),hist:Array(n).fill(null),locked:Array(n).fill(null),drew:false,winner:-1,log:[],seq:0};
  for(let p=0;p<n;p++)s.hands.push(s.draw.splice(0,7));
  // 0.2.22: ONE player chosen at random is guaranteed a special card (Rebobinar, Súper +2, Parry or Tornado); the rest depend on the shuffle
  const lucky=Math.floor(Math.random()*n);
  if(!s.hands[lucky].some(isSpecial)){const i=s.draw.findIndex(isSpecial);if(i>=0){const k=Math.floor(Math.random()*7),out=s.hands[lucky][k];s.hands[lucky][k]=s.draw[i];s.draw[i]=out}}
  const first=s.draw.splice(s.draw.findIndex(isNum),1)[0];
  s.discard.push(first);s.color=first.c;
  s.turn=Math.floor(Math.random()*n);say(s,`Empieza ${names[s.turn]}.`);
  return s;
 }
 // take k cards from the draw pile (the discard pile is reshuffled into it when it runs out)
 function take(s,p,k){
  let got=0;
  for(let i=0;i<k;i++){
   if(!s.draw.length){if(s.discard.length<=1)break;const t=s.discard.pop();s.draw=shuffle(s.discard.filter(c=>c.v!=='tornado'));s.discard=[t]}   // 0.2.24: a Tornado that was played does not come back, so a match has a limited number of them
   s.hands[p].push(s.draw.pop());got++;
  }
  return got;
 }
 function canPlay(s,p,c){
  if(s.locked[p]&&s.locked[p].u===c.u)return false;         // blocked by Rebobinar
  if(c.c==='k')return true;
  const t=top(s);
  return c.c===s.color||(t.c!=='k'&&c.v===t.v);
 }
 // an effect waiting for player p: {n: cards to draw, from: who threw it, skip: loses the turn, label}
 function resolve(s,p,e){
  if(e.n){const g=take(s,p,e.n);say(s,`${s.names[p]} roba ${g} (${e.label}).`)}
  if(e.skip)say(s,`${s.names[p]} pierde el turno${e.n?'':' ('+e.label+')'}.`);
 }
 // 0.2.27 — stacking: a +2/+4 waiting for you can be answered with your own +2 or +4 (any colour); the total moves on
 const isDraw=c=>c.v==='d2'||c.v==='d4';
 const stackCards=(s,p)=>{const e=s.pend[p];return e&&e.stack?s.hands[p].filter(c=>isDraw(c)&&!(s.locked[p]&&s.locked[p].u===c.u)):[]};
 // after the turn moves: apply whatever happens by itself. Stops when someone has a real decision to make.
 function settle(s){
  for(let k=0;k<20;k++){
   const p=s.turn;
   if(s.skips[p]>0){s.skips[p]--;say(s,`${s.names[p]} pierde el turno.`);s.turn=nextOf(s,p);continue}
   const e=s.pend[p];
   if(e&&!hasParry(s,p)&&!stackCards(s,p).length){delete s.pend[p];resolve(s,p,e);if(e.skip){s.turn=nextOf(s,p);continue}}
   break;
  }
  s.drew=false;
 }
 function endTurn(s,p){
  const l=s.locked[p];
  if(l){if(l.fresh)l.fresh=false;else s.locked[p]=null}       // the block lasts for that player's NEXT turn
  s.turn=nextOf(s,p);settle(s);
 }
 function rewind(s,p){
  s.pend={};
  const back=[];
  for(let q=0;q<s.n;q++){
   const u=s.hist[q];s.hist[q]=null;
   if(u==null)continue;
   const i=s.discard.findIndex((c,j)=>c.u===u&&j<s.discard.length-1);
   if(i<0)continue;
   const c=s.discard.splice(i,1)[0];
   s.hands[q].push(c);s.locked[q]={u:c.u,fresh:q===p};back.push(s.names[q]);
  }
  say(s,back.length?`⏪ ${back.join(', ')} ${back.length>1?'recuperan':'recupera'} su última carta (bloqueada un turno).`:'⏪ No había jugadas que rebobinar.');
 }
 /* 0.2.24 — Tornado is a draft: every hand goes to the middle and the players take cards back one at a time,
  * in turn (starting with whoever threw it), until each has as many as before.
  * 0.2.26 — the cards in the middle are FACE DOWN: a pick is a position in the shuffled pool, {t:'pick',i}.
  * While s.draft exists that is the only legal action, and only for s.draft.who. */
 function tornado(s,p){
  const need=s.hands.map(h=>h.length),pool=shuffle(s.hands.flat());
  s.hands=s.hands.map(()=>[]);s.locked=s.locked.map(()=>null);
  if(!need[p]||!pool.length){s.hands=need.map(k=>pool.splice(0,k));return}   // the Tornado was that player's last card: nothing to choose, they win
  s.draft={pool,need,who:p,by:p};
  say(s,'🌪 Todas las cartas van al centro boca abajo: cada quien toma las suyas por turno.');
 }
 function pickCard(s,p,i){
  const d=s.draft;
  if(p!==d.who||!Number.isInteger(i)||i<0||i>=d.pool.length)return false;
  s.hands[p].push(d.pool.splice(i,1)[0]);d.need[p]--;
  let left=d.need.map((k,q)=>k>0?q:-1).filter(q=>q>=0);
  if(left.length===1){const q=left[0];s.hands[q].push(...d.pool.splice(0));d.need[q]=0;left=[]}   // only one player still choosing: the rest is theirs
  if(!left.length||!d.pool.length){
   s.draft=null;say(s,'🌪 Todos tienen sus cartas.');
   if(s.hands[d.by].length===2)say(s,`¡DOS! A ${s.names[d.by]} le quedan 2 cartas.`);
   endTurn(s,d.by);
  }else{let w=nextOf(s,p);while(!d.need[w])w=nextOf(s,w);d.who=w}
  s.seq++;return true;
 }
 function win(s,p){s.winner=p;s.pend={};say(s,`🏆 ¡${s.names[p]} gana la partida!`)}
 /* One action by player p. Returns true if it was legal and applied.
  *   {t:'play',u,color?} · {t:'draw'} · {t:'pass'} · {t:'accept'} · {t:'parry'}  */
 function act(s,p,a){
  if(!s||s.winner>=0||!a)return false;
  if(s.draft)return a.t==='pick'&&pickCard(s,p,a.i);
  if(p!==s.turn)return false;
  const hand=s.hands[p],e=s.pend[p];
  if(e){                                                    // p holds a Parry and/or a +2/+4 to answer with: choose
   if(a.t==='play'){                                        // answer the +2/+4 with another one
    const card=stackCards(s,p).find(c=>c.u===a.u);if(!card)return false;
    if(card.v==='d4'&&!COLORS.includes(a.color))return false;
    hand.splice(hand.indexOf(card),1);s.discard.push(card);s.color=card.v==='d4'?a.color:card.c;
    delete s.pend[p];
    const total=e.n+(card.v==='d4'?4:2),nx=nextOf(s,p);
    say(s,`${s.names[p]} responde con ${cardName(card)}${card.v==='d4'?' → '+CNAME[s.color].toLowerCase():''}: ¡ya son +${total}!`);
    s.pend[nx]={n:total,from:p,skip:true,label:`+${total}`,stack:true};
    s.hist[p]=card.u;
    if(!hand.length)win(s,p);else{if(hand.length===2)say(s,`¡DOS! A ${s.names[p]} le quedan 2 cartas.`);endTurn(s,p)}
    s.seq++;return true;
   }
   if(a.t==='accept'){delete s.pend[p];resolve(s,p,e);if(e.skip)endTurn(s,p);s.seq++;return true}
   if(a.t==='parry'){
    const i=hand.findIndex(c=>c.v==='parry');if(i<0)return false;
    delete s.pend[p];s.discard.push(hand.splice(i,1)[0]);
    say(s,`🛡 ${s.names[p]} usa Parry: ${e.label} le regresa a ${s.names[e.from]}.`);
    if(e.n){const g=take(s,e.from,e.n);say(s,`${s.names[e.from]} roba ${g}.`)}
    if(e.skip)s.skips[e.from]++;
    if(!hand.length)win(s,p);else endTurn(s,p);
    s.seq++;return true;
   }
   return false;
  }
  if(a.t==='draw'){
   if(s.drew||mustPlay(s,p))return false;
   const g=take(s,p,1);s.drew=true;say(s,`${s.names[p]} roba una carta.`);
   if(!g||!hand.some(c=>canPlay(s,p,c)))endTurn(s,p);
   s.seq++;return true;
  }
  if(a.t==='pass'){if(!s.drew||mustPlay(s,p))return false;say(s,`${s.names[p]} pasa.`);endTurn(s,p);s.seq++;return true}
  if(a.t==='play'){
   const i=hand.findIndex(c=>c.u===a.u);if(i<0)return false;
   const card=hand[i];
   if(!canPlay(s,p,card))return false;
   if(needsColor(card)&&!COLORS.includes(a.color))return false;
   hand.splice(i,1);s.discard.push(card);
   if(card.c!=='k')s.color=card.c;else if(needsColor(card))s.color=a.color;
   const nx=nextOf(s,p),who=s.names[p];
   say(s,`${who} juega ${cardName(card)}${needsColor(card)?' → '+CNAME[s.color].toLowerCase():''}.`);
   const hit=(q,n,skip,label)=>{const o=s.pend[q];s.pend[q]=o?{n:o.n+n,from:p,skip:o.skip||skip,label}:{n,from:p,skip,label}};
   switch(card.v){
    case 'skip':hit(nx,0,true,'Salta');break;
    case 'rev':if(s.n===2)hit(nx,0,true,'Reversa');else{s.dir*=-1;say(s,'Cambia el sentido.')}break;
    case 'd2':hit(nx,2,true,'+2');s.pend[nx].stack=true;break;
    case 'd4':hit(nx,4,true,'+4');s.pend[nx].stack=true;break;
    case 'super':for(let q=0;q<s.n;q++)if(q!==p)hit(q,2,false,'Súper +2');break;
    case 'rewind':rewind(s,p);break;
    case 'tornado':tornado(s,p);break;
   }
   if(card.v!=='rewind')s.hist[p]=card.u;
   if(s.draft){s.seq++;return true}                          // the turn ends when everybody has chosen (pickCard)
   const left=s.hands[p].length;                             // Tornado/Rebobinar may have changed the hand
   if(!left)win(s,p);
   else{if(left===2)say(s,`¡DOS! A ${who} le quedan 2 cartas.`);endTurn(s,p)}
   s.seq++;return true;
  }
  return false;
 }
 // what ONE seat is allowed to see
 function viewFor(s,seat){
  const mine=s.hands[seat]||[],myTurn=s.turn===seat&&s.winner<0&&!s.draft;
  return {n:s.n,draft:s.draft?{count:s.draft.pool.length,who:s.draft.who,need:s.draft.need}:null,/* face down: only how many cards are in the middle, never which */names:s.names,kinds:s.kinds,counts:s.hands.map(h=>h.length),hand:mine,
   playable:!myTurn?[]:s.pend[seat]?stackCards(s,seat).map(c=>c.u):mine.filter(c=>canPlay(s,seat,c)).map(c=>c.u),
   stack:Math.max(0,...Object.values(s.pend).filter(x=>x.stack).map(x=>x.n)),
   drawCount:s.draw.length,top:top(s),color:s.color,turn:s.turn,dir:s.dir,
   must:myTurn&&!s.pend[seat]&&mustPlay(s,seat),
   pend:myTurn&&s.pend[seat]?s.pend[seat]:null,hit:Object.keys(s.pend).map(Number),
   locked:s.locked[seat]?s.locked[seat].u:null,drew:s.drew,winner:s.winner,log:s.log.slice(-4),you:seat,seq:s.seq};
 }

 /* ================= 2. computer player ================= */
 function aiMove(s,p){
  if(s.draft)return {t:'pick',i:Math.floor(Math.random()*s.draft.pool.length)};   // Tornado: the cards are face down, the computer cannot see them either
  const e=s.pend[p];
  if(e){
   const st=stackCards(s,p).sort((a,b)=>(a.v==='d2'?0:1)-(b.v==='d2'?0:1));   // answer with a +2 first, keep the +4
   if(st.length&&Math.random()<.85){const c=st[0],tally={r:0,b:0,g:0,y:0};s.hands[p].forEach(x=>{if(x!==c&&x.c!=='k')tally[x.c]++});return {t:'play',u:c.u,color:c.v==='d4'?COLORS.slice().sort((a,b)=>tally[b]-tally[a])[0]:undefined}}
   if(hasParry(s,p)&&(e.n>0||Math.random()<.6))return {t:'parry'};
   return {t:'accept'};
  }
  const hand=s.hands[p],ok=hand.filter(c=>c.v!=='parry'&&canPlay(s,p,c));   // Parry is kept for defending
  if(!ok.length){
   const par=hand.find(c=>c.v==='parry'&&canPlay(s,p,c));
   if(par&&(hand.length===1||(s.drew&&!s.draw.length)))return {t:'play',u:par.u};   // last card, or nothing left to draw
   return {t:s.drew?'pass':'draw'};
  }
  const others=s.hands.map((h,i)=>i===p?99:h.length),least=Math.min(...others),danger=s.hands[nextOf(s,p)].length<=2;
  const score=c=>{
   const r=Math.random();
   if(c.v==='parry')return -5+r;                              // keep it for defending
   if(c.c!=='k')return (isNum(c)?3:4)+(danger&&(c.v==='d2'||c.v==='skip')?5:0)+r;
   if(c.v==='d4')return (danger?8:1)+r;
   if(c.v==='super')return (least<=2?7:1.5)+r;
   if(c.v==='tornado')return (hand.length>=6&&least<=3?9:.5)+r;
   if(c.v==='rewind')return (least<=2?6:.8)+r;
   return 1+r;
  };
  const card=ok.map(c=>[score(c),c]).sort((a,b)=>b[0]-a[0])[0][1];
  let color;
  if(needsColor(card)){
   const tally={r:0,b:0,g:0,y:0};hand.forEach(c=>{if(c!==card&&c.c!=='k')tally[c.c]++});
   color=COLORS.slice().sort((a,b)=>tally[b]-tally[a]||Math.random()-.5)[0];
  }
  return {t:'play',u:card.u,color};
 }

 /* ================= 3. screens ================= */
 const NAME_KEY='sudomi-player-name';
 const esc=t=>String(t).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 let endSent=false;
 let ui=null,screen='menu',mode=null,S=null,V=null,net=null,seats=[],size=2,started=false,aiTimer=null,pick=null,status='',roomCode='',offline=false,showRules=false,busy=false;
 // 0.2.22 — what the table looked like the last time it was drawn. Animations play only for what changed since then.
 let shown={seq:-1,n:0,top:null,hand:[],counts:[],color:null};
 const FX={skip:['⊘','¡Salta!'],rev:['⇄','Reversa'],d2:['+2','¡Roba 2!'],d4:['+4','¡Roba 4!'],wild:['★','Comodín'],rewind:['⏪','¡Rebobinar!'],super:['+2','¡Súper +2!'],parry:['🛡','¡Parry!'],tornado:['🌪','¡Tornado!']};
 const CONFETTI=['#d62027','#1761b2','#1c8a4a','#e2a400','#ffffff'];
 // 0.2.25: the name and avatar come from the player profile (js/profile.js)
 const P=()=>window.SudomiProfile;
 const aiNames=n=>window.SudomiAI?SudomiAI.random(n).map(x=>x[0]):[];   // nombres de la computadora: la lista del dueño (other-games.js)
 const myName=()=>{let n=P()?P().name():'';if(!n)try{n=localStorage.getItem(NAME_KEY)||''}catch(_){}return n.trim().slice(0,14)||'Jugador'};
 const myAvatar=()=>(P()&&P().avatar())||'🦊';
 const needProfile=fn=>{if(P()&&!P().get()){P().ensure(fn);return true}return false};   // online play asks for a profile first
 window.addEventListener('sudomi-profile',()=>{if(ui&&screen==='menu')render()});
 const $=sel=>ui.stage.querySelector(sel);

 function reset(){try{window.SudomiFriends&&SudomiFriends.awayBar&&SudomiFriends.awayBar(null)}catch(_){}clearTimeout(aiTimer);aiTimer=null;if(net){try{net.close()}catch(_){}}net=null;S=null;V=null;seats=[];started=false;pick=null;status='';roomCode='';offline=false;mode=null;busy=false}
 function open(opts){ui=opts;reset();screen='menu';ui.hub.classList.add('hidden');ui.stage.classList.remove('hidden');render()}
 function close(){if(!ui)return;reset();screen='menu'}
 function leave(){try{window.SudomiFriends&&SudomiFriends.untrack()}catch(_){}const u=ui;close();if(u){u.stage.innerHTML='';u.exit()}}

 /* ----- host / solo ----- */
 const publicSeats=()=>seats.map(x=>({name:x.name,kind:x.kind,away:!!x.away,avatar:x.avatar||''}));
 function pushLobby(){seats.forEach(x=>{if(x.id&&x.id!=='host')net.send(x.id,{t:'lobby',seats:publicSeats(),size,code:roomCode})})}
 // 0.2.76: si alguien se desconecta, el anfitrión ve una barra con «Invitar de nuevo» (js/friends.js)
 function syncAway(){try{if(window.SudomiFriends&&SudomiFriends.awayBar)SudomiFriends.awayBar(net&&mode==='host'&&started?{game:'dos',gameName:'DOS',room:roomCode,names:seats.filter(x=>x.kind==='human'&&x.away).map(x=>x.name)}:null)}catch(_){}}
 function pushState(){
  if(net&&mode==='host')seats.forEach((x,i)=>{if(x.id&&x.id!=='host'&&!x.away)net.send(x.id,{t:'state',v:viewFor(S,i),seats:publicSeats()})});
  V=viewFor(S,0);screen='game';syncAway();render();scheduleAI();
 }
 function scheduleAI(){
  clearTimeout(aiTimer);
  if(!S||S.winner>=0)return;
  const actor=()=>S.draft?S.draft.who:S.turn,seat=seats[actor()];
  if(!seat||(seat.kind==='human'&&!seat.away))return;
  const game=S;
  aiTimer=setTimeout(()=>{if(S!==game||S.winner>=0)return;const p=actor();if(!act(S,p,aiMove(S,p))&&!act(S,p,{t:'accept'}))act(S,p,{t:S.drew?'pass':'draw'});pushState()},seat.away?2600:S.draft?650:1200);
 }
 function startSolo(){reset();mode='solo';seats=[{name:myName(),kind:'human',id:'host',avatar:myAvatar()},{name:aiNames(1)[0]||'Máquina',kind:'ai'}];startGame()}
 function startGame(){
  started=true;let k=0;
  const pool=aiNames(12).filter(nm=>!seats.some(s=>s.name===nm));seats=seats.map(x=>x.kind==='open'?{name:pool[k++]||`IA ${k}`,kind:'ai'}:x);
  S=newGame(seats.map(x=>x.name),seats.map(x=>x.kind));pushState();
 }
 async function createRoom(n){
  if(busy||needProfile(()=>createRoom(n)))return;
  if(!window.SudomiParty){status='No se cargó el módulo de conexión.';render();return}
  reset();busy=true;mode='host';size=n;status='Creando sala…';render();
  try{
   net=await SudomiParty.host('dos',onHostEvent);
   roomCode=net.code;seats=[{name:myName(),kind:'human',id:'host',avatar:myAvatar()}];
   for(let i=1;i<n;i++)seats.push({name:'',kind:'open'});
   status='';screen='lobby';
  }catch(err){mode=null;status=err.message||'No se pudo crear la sala.'}
  busy=false;render();
 }
 function onHostEvent(e){
  if(mode!=='host')return;
  if(e.type==='join'){
   let i=seats.findIndex(x=>x.id===e.id);
   if(i>=0){seats[i].away=false}                               // the same phone came back
   else if(started){   // 0.2.76: un teléfono nuevo (o sin su llave) puede ocupar el lugar de quien se desconectó
    i=seats.findIndex(x=>x.kind==='human'&&x.away&&x.id!=='host');
    if(i<0){net.reject(e.id,'La partida ya empezó.');return}
    seats[i].id=e.id;seats[i].away=false;
   }
   else{
    i=seats.findIndex(x=>x.kind==='open');
    if(i<0){net.reject(e.id,'La sala ya está llena.');return}
    seats[i]={name:String((e.meta&&e.meta.name)||'').trim().slice(0,14)||'Jugador',kind:'human',id:e.id,avatar:P()&&e.meta&&P().validAvatar(e.meta.avatar)?e.meta.avatar:''};   // escaped when drawn
   }
   if(started){S.names[i]=seats[i].name;pushState()}else{pushLobby();render()}
   return;
  }
  const i=seats.findIndex(x=>x.id===e.id);if(i<0)return;
  if(e.type==='leave'||(e.type==='msg'&&e.data.t==='bye')){
   if(!started){seats[i]={name:'',kind:'open'};pushLobby();render()}
   else if(e.type==='msg'){seats[i]={name:seats[i].name+' (IA)',kind:'ai'};S.names[i]=seats[i].name;pushState()}   // left for good: the computer takes the seat
   else{seats[i].away=true;pushState()}                                                                         // lost the connection: the computer covers until it returns
   return;
  }
  if(e.type==='msg'&&e.data.t==='act'&&started){if(act(S,i,e.data.a))pushState();else net.send(e.id,{t:'state',v:viewFor(S,i),seats:publicSeats()})}
 }
 /* ----- guest ----- */
 function joinRoom(raw){
  if(needProfile(()=>joinRoom(raw)))return;
  if(!window.SudomiParty){status='No se cargó el módulo de conexión.';render();return}
  const code=SudomiParty.normCode(raw);
  if(code.length!==8){status='Escribe el código de 8 caracteres.';render();return}
  reset();mode='guest';roomCode=code;status='Conectando…';screen='joining';render();
  net=SudomiParty.join('dos',code,{name:myName(),avatar:myAvatar()},e=>{
   if(mode!=='guest')return;
   if(e.type==='open'){status='Conectado. Esperando al anfitrión…';try{window.SudomiFriends&&SudomiFriends.track({game:'dos',gameName:'DOS',room:code,role:'guest'})}catch(_){}}
   else if(e.type==='away'){offline=true}
   else if(e.type==='back'){offline=false}
   else if(e.type==='closed'){const m=e.message;reset();screen='menu';status=m}
   else if(e.type==='msg'){
    const d=e.data;
    if(d.t==='lobby'){seats=d.seats;size=d.size;screen='lobby';status=''}
    else if(d.t==='state'){V=d.v;seats=d.seats;started=true;screen='game';if(pick&&!V.hand.some(c=>c.u===pick))pick=null}
   }
   render();
  });
 }
 /* ----- any seat ----- */
 function send(a){
  if(mode==='guest'){if(!net.send({t:'act',a})){offline=true;render()}}
  else if(S&&act(S,0,a))pushState();
 }
 function tapCard(u){
  const c=V.hand.find(x=>x.u===u);if(!c||!V.playable.includes(u))return;
  if(needsColor(c)){pick=u;render()}else send({t:'play',u});
 }
 function invite(){
  const base=location.origin&&location.origin!=='null'?location.origin+location.pathname:location.href.split(/[?#]/)[0];
  const url=`${base}?game=dos&room=${roomCode}`;
  if(navigator.share)navigator.share({title:'SUDOMI',text:(window.SudomiI18n?SudomiI18n.t('Juega DOS conmigo en SUDOMI'):'Juega DOS conmigo en SUDOMI'),url}).catch(()=>{});
  else if(navigator.clipboard)navigator.clipboard.writeText(url).then(()=>{status='Enlace copiado. Pégalo en tu chat.';render()}).catch(()=>{status=url;render()});
  else{status=url;render()}
 }

 /* ----- drawing ----- */
 function cardHTML(c,extra=''){
  const num=isNum(c);
  return `<span class="dcard c-${c.c} v-${c.v} ${extra}"><b>${num?c.v:SYM[c.v]}</b><em>${num?c.v:SYM[c.v]}</em>${num?'':`<small>${LABEL[c.v]}</small>`}</span>`;
 }
 const head=sub=>`<div class="dos-head"><div><p>ARCADE SUDOMI · ${sub}</p><h2>DOS</h2></div><div class="dos-actions"><button class="game-restart" id="dosRules" aria-label="Reglas">?</button><button class="game-restart" id="dosExit">Juegos</button></div></div>`;
 const rulesHTML=()=>showRules?`<div class="dos-over" id="dosRulesBox"><div class="dos-card"><h3>Reglas de DOS</h3><dl>${RULES.map(([t,d])=>`<dt>${t}</dt><dd>${d}</dd>`).join('')}</dl><button class="arc-btn" id="dosRulesClose">Cerrar</button></div></div>`:'';
 function bindCommon(){
  $('#dosExit').onclick=leave;
  $('#dosRules').onclick=()=>{showRules=true;render()};
  const c=$('#dosRulesClose');if(c)c.onclick=()=>{showRules=false;render()};
 }
 function render(){
  if(!ui)return;
  if(screen==='game'&&V)return renderGame();
  if(screen==='lobby')return renderLobby();
  if(screen==='joining'){ui.stage.innerHTML=`<div class="mini-game dos">${head('ONLINE')}<p class="arc-wait big">${esc(status)}</p>${rulesHTML()}</div>`;bindCommon();return}
  renderMenu();
 }
 function renderMenu(){
  ui.stage.innerHTML=`<div class="mini-game dos">${head('1 A 8 JUGADORES')}
   <div class="dos-profile"><span>${P()&&P().get()?myAvatar():'👤'}</span><div><b>${P()&&P().get()?esc(myName()):'Sin perfil'}</b><small>${P()&&P().get()?'Así te verán los demás':'Crea tu perfil para jugar online'}</small></div><button class="arc-btn alt" id="dosProfile">${P()&&P().get()?'Editar':'Crear perfil'}</button></div>
   <div class="dos-menu">
    <button class="dos-opt" id="dosSolo"><b>🤖 Contra la máquina</b><span>Tú contra la computadora</span></button>
    <div class="dos-opt static"><b>🌐 Crear sala online</b><span>Escribe cuántos juegan (de 2 a 8). Los puestos que nadie ocupe los juega la IA.</span>
     <div class="dos-join"><input id="dosSize" type="number" inputmode="numeric" min="2" max="8" step="1" value="${Math.min(8,Math.max(2,size||4))}" aria-label="Número de jugadores"><button class="arc-btn" id="dosCreate" ${busy?'disabled':''}>Crear sala</button></div></div>
    <div class="dos-opt static"><b>🔑 Unirme a una sala</b><span>Escribe el código que te envió tu amigo</span>
     <div class="dos-join"><input id="dosCode" maxlength="9" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="ABCD-2345"><button class="arc-btn" id="dosJoin">Unirme</button></div></div>
   </div>
   ${status?`<p class="arc-wait">${esc(status)}</p>`:''}${rulesHTML()}</div>`;
  bindCommon();
  $('#dosProfile').onclick=()=>P()&&P().edit();
  $('#dosSolo').onclick=startSolo;
  $('#dosCreate').onclick=()=>{
   const n=Math.round(+$('#dosSize').value);
   if(!(n>=2&&n<=8)){status='Escribe un número de jugadores entre 2 y 8.';size=4;render();return}
   createRoom(n);
  };
  $('#dosJoin').onclick=()=>joinRoom($('#dosCode').value);
 }
 function inviteUrl(){const base=location.origin&&location.origin!=='null'?location.origin+location.pathname:location.href.split(/[?#]/)[0];return `${base}?game=dos&room=${roomCode}`}
 function removeSeat(i){if(mode!=='host'||!seats[i]||seats[i].kind!=='open'||seats.length<=2)return;seats.splice(i,1);size=seats.length;pushLobby();render()}
 // 0.2.72: sala de espera única (js/lobby.js): código arriba, lista de espacios, «Invitar amigos» y «Empezar»
 function renderLobby(){
  const host=mode==='host';
  ui.stage.innerHTML=`<div class="mini-game dos">${head('SALA DE ESPERA')}<div id="lbRoot"></div>${rulesHTML()}</div>`;
  bindCommon();
  SudomiLobby.render($('#lbRoot'),{game:'dos',gameName:'DOS',code:roomCode,url:inviteUrl(),host,fixed:false,
   seats:seats.map((x,i)=>({state:x.kind==='human'?(i===0&&host?'me':x.away?'away':'human'):x.kind==='ai'?'ai':'open',name:x.name,avatar:x.avatar||'🙂',sub:i===0?'Anfitrión':undefined})),
   startLabel:'▶ Empezar partida',canStart:seats.length>=2,onStart:startGame,onRemove:removeSeat,
   status:(status||'')+(offline?' · Sin conexión. Reconectando…':'')});
 }
 function renderGame(){
  const v=V,me=v.you,myTurn=v.turn===me&&v.winner<0;
  if(v.winner<0)endSent=false;else if(!endSent){endSent=true;try{window.dispatchEvent(new CustomEvent('sudomi-arcade',{detail:{game:'dos',won:v.winner===me}}))}catch(_){}}   /* 0.3.2: avisa el resultado a logros y estadísticas */
  const order=[];for(let k=1;k<v.n;k++)order.push((me+k)%v.n);
  const tag=i=>seats[i]&&seats[i].kind==='ai'?' 🤖':seats[i]&&seats[i].away?' 📴':'';
  // ----- what changed since the last drawing (decides which animations play) -----
  if(v.seq<shown.seq||v.n!==shown.n)shown={seq:-1,n:v.n,top:null,hand:[],counts:[],color:null};
  const fresh=v.seq!==shown.seq,first=shown.seq<0;
  const newTop=fresh&&!first&&v.top.u!==shown.top;
  const fx=newTop&&!isNum(v.top)?v.top.v:'';
  const added=fresh?v.hand.filter(c=>!shown.hand.includes(c.u)).map(c=>c.u):[];
  const gains=v.counts.map((c,i)=>fresh&&!first?c-(shown.counts[i]||0):0),gain=i=>gains[i];   // worked out now, before `shown` is replaced below
  const handAnim=u=>fx==='tornado'?'whirl':added.includes(u)?'dealt':'';
  const colorChanged=fresh&&!first&&v.color!==shown.color;
  const justWon=fresh&&v.winner>=0;
  shown={seq:v.seq,n:v.n,top:v.top.u,hand:v.hand.map(c=>c.u),counts:v.counts.slice(),color:v.color};
  // 0.2.23 — round table: the other players sit around it in playing order (left, top, right); you are at the bottom
  // 0.2.24 — up to 7 opponents on an arc from your left, over the top, to your right. --fx/--fy are fractions of the arena (0..1).
  const m=v.n-1,arc=[0,90,165,180,190,195,200,200][m];
  const place=k=>{const ang=(m===1?90:arc-(2*arc-180)*k/(m-1))*Math.PI/180;return `--fx:${((1+Math.cos(ang))/2).toFixed(3)};--fy:${((1-Math.sin(ang))/1.5).toFixed(3)}`};
  const d=v.draft,acting=d?d.who:v.turn;
  const avatar=i=>seats[i]&&seats[i].kind==='ai'?'🤖':seats[i]&&seats[i].avatar?seats[i].avatar:['🦊','🐼','🦉','🐯','🐸','🐵','🦄','🐙'][i%8];
  const opp=(i,k)=>`<div class="dos-opp s${i} ${acting===i&&v.winner<0?'turn':''}${v.hit.includes(i)?'hit':''} ${!d&&gain(i)>0?'grew':!d&&gain(i)<0?'shrank':''}" style="${place(k)}">${!d&&gain(i)>0?`<s>+${gain(i)}</s>`:''}<span class="dos-av">${avatar(i)}<i>${v.counts[i]}</i></span><b>${esc(v.names[i])}${seats[i]&&seats[i].away?' 📴':''}</b><span class="dos-backs">${'<i></i>'.repeat(Math.min(v.counts[i],6))}</span></div>`;
  const ring=`<svg class="dos-ring c-${v.color} ${v.dir<0?'rev':''}" viewBox="0 0 200 200" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="11" stroke-linecap="round"><path d="M22 100A78 78 0 0 1 96 22"/><path d="M178 100A78 78 0 0 1 104 178"/></g><g fill="currentColor"><path d="M92 6l30 16-30 16z"/><path d="M108 194l-30-16 30-16z"/></g></svg>`;
  const fan=k=>{const n=v.hand.length,mid=(n-1)/2,step=Math.min(4,36/Math.max(n,1));return n>14?'':`--a:${((k-mid)*step).toFixed(1)}deg;--y:${(Math.pow(Math.abs(k-mid),2)*step*.22).toFixed(1)}px;`};
  const hand=v.hand.slice().sort((a,b)=>'rbgyk'.indexOf(a.c)-'rbgyk'.indexOf(b.c)||(a.v<b.v?-1:a.v>b.v?1:0));
  const e=v.pend;
  const canParry=e&&v.hand.some(c=>c.v==='parry'),canStack=e&&e.stack&&v.playable.length>0;
  const prompt=e?`<div class="dos-prompt"><p>${esc(v.names[e.from])} te tiró <b>${e.label}</b>.${canStack?' Responde con un <b>+2</b> o <b>+4</b> de tu mano (brillan abajo) y se lo pasas al siguiente,':''}${canParry?` ${canStack?'usa':'Usa'} Parry`:''}${canStack||canParry?' o acepta.':''}</p><div>${canParry?'<button class="arc-btn pulse" id="dosParry">🛡 Usar Parry</button>':''}<button class="arc-btn alt" id="dosAccept">${e.n?`Robar ${e.n}`:'Perder el turno'}</button></div></div>`:'';
  const canDraw=myTurn&&!e&&!v.drew&&!v.must,canPass=myTurn&&!e&&v.drew&&!v.must;
  const confetti=justWon?`<div class="dos-confetti">${Array.from({length:36},(_,k)=>`<i style="left:${Math.round(Math.random()*100)}%;background:${CONFETTI[k%5]};animation-delay:${(Math.random()*.9).toFixed(2)}s;animation-duration:${(1.8+Math.random()*1.6).toFixed(2)}s"></i>`).join('')}</div>`:'';
  const end=v.winner>=0?`<div class="dos-over ${justWon?'pop':''}">${confetti}<div class="dos-card"><p class="dos-kicker">PARTIDA TERMINADA</p><h3>${v.winner===me?'¡Ganaste! 🎉':`Ganó ${esc(v.names[v.winner])}`}</h3><div class="dos-endbtns">${mode==='guest'?'<p class="arc-sub center">El anfitrión puede iniciar otra partida.</p>':'<button class="arc-btn" id="dosAgain">Jugar otra</button>'}<button class="arc-btn alt" id="dosEndExit">Todos los juegos</button></div></div></div>`:'';
  // Tornado: everybody sees the cards in the middle; only the player whose turn it is can take one
  const sortCards=list=>list.slice().sort((a,b)=>'rbgyk'.indexOf(a.c)-'rbgyk'.indexOf(b.c)||(a.v<b.v?-1:a.v>b.v?1:0));
  const draftBox=d&&v.winner<0?`<div class="dos-over ${fx==='tornado'?'late':''}"><div class="dos-card dos-draft"><p class="dos-kicker">🌪 TORNADO</p><h3>${d.who===me?'Elige una carta':`Elige ${esc(v.names[d.who])}…`}</h3><p class="arc-sub center">${d.need[me]>0?`Te ${d.need[me]===1?'falta 1 carta':`faltan ${d.need[me]} cartas`}`:'Ya tienes todas tus cartas'} · quedan ${d.count} en el centro</p><div class="dos-pool ${d.who===me?'':'idle'}">${Array.from({length:d.count},(_,i)=>`<button class="dos-poolbtn" data-p="${i}" ${d.who===me?'':'disabled'} aria-label="Carta boca abajo ${i+1}"><span class="dcard back"></span></button>`).join('')}</div>${v.hand.length?`<p class="arc-sub center">Tus cartas</p><div class="dos-mine">${sortCards(v.hand).map(c=>cardHTML(c,added.includes(c.u)?'got':'')).join('')}</div>`:''}</div></div>`:'';
  const picker=pick!=null?`<div class="dos-over"><div class="dos-card"><h3>Elige el color</h3><div class="dos-colors">${COLORS.map(c=>`<button class="c-${c}" data-color="${c}">${CNAME[c]}</button>`).join('')}</div><button class="arc-btn alt" id="dosPickCancel">Cancelar</button></div></div>`:'';
  ui.stage.innerHTML=`<div class="mini-game dos">${head(mode==='solo'?'CONTRA LA MÁQUINA':`ONLINE · ${v.n} JUGADORES`)}
   ${offline?'<p class="arc-alert">Sin conexión. Reconectando…</p>':''}
   <div class="dos-room2">
    <div class="dos-arena n${v.n} ${v.n>5?'compact':''}">
     ${order.map(opp).join('')}
     <div class="dos-table ${fx?'fx-'+fx:''}">
      ${ring}
      <button class="dos-pile" id="dosDraw" ${canDraw?'':'disabled'} aria-label="Robar una carta"><span class="dcard back ${canDraw&&!v.playable.length?'glow':''}"></span><small>${v.drawCount}</small></button>
      <div class="dos-top">${cardHTML(v.top,newTop?'drop':'')}</div>
      ${fx?`<div class="dos-fx fx-${fx}"><span>${FX[fx][0]}</span><b>${FX[fx][1]}</b></div>`:''}
     </div>
     <div class="dos-info"><span class="dos-dot c-${v.color} ${colorChanged?'ping':''}"></span><b>${CNAME[v.color]}</b>${v.stack?`<em class="dos-stack">+${v.stack}</em>`:''}</div>
     <div class="dos-turn ${myTurn?'mine':''}">${v.winner>=0?'Fin de la partida':d?(d.who===me?'Elige tus cartas':`Elige ${esc(v.names[d.who])}`):myTurn?'Tu turno':`Turno de ${esc(v.names[v.turn])}`}</div>
    </div>
    <div class="dos-me s${me} ${myTurn?'turn':''}"><span class="dos-av">${avatar(me)}<i>${v.hand.length}</i></span><b>${esc(v.names[me])}</b>
     <div class="dos-mebtns"><button class="arc-btn" id="dosDraw2" ${canDraw?'':'disabled'}>Robar</button><button class="arc-btn alt" id="dosPass" ${canPass?'':'disabled'}>Pasar</button></div></div>
    ${prompt}
    <div class="dos-hand ${myTurn&&!e?'':'idle'} ${hand.length>14?'many':'fan'}" style="--n:${hand.length}">${hand.map((c,k)=>`<button class="dos-cardbtn ${v.playable.includes(c.u)?'ok':''} ${v.locked===c.u?'locked':''} ${handAnim(c.u)}" style="--k:${k};${fan(k)}" data-u="${c.u}" ${v.playable.includes(c.u)?'':'disabled'}>${cardHTML(c)}${v.locked===c.u?'<u>Bloqueada</u>':''}</button>`).join('')}</div>
   </div>
   <ul class="dos-log">${v.log.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>
   ${draftBox}${picker}${end}${rulesHTML()}</div>`;
  bindCommon();
  ui.stage.querySelectorAll('.dos-poolbtn').forEach(b=>b.onclick=()=>send({t:'pick',i:+b.dataset.p}));
  $('#dosDraw').onclick=$('#dosDraw2').onclick=()=>send({t:'draw'});
  $('#dosPass').onclick=()=>send({t:'pass'});
  ui.stage.querySelectorAll('.dos-cardbtn').forEach(b=>b.onclick=()=>tapCard(+b.dataset.u));
  if(e){const par=$('#dosParry');if(par)par.onclick=()=>send({t:'parry'});$('#dosAccept').onclick=()=>send({t:'accept'})}
  if(pick!=null){ui.stage.querySelectorAll('[data-color]').forEach(b=>b.onclick=()=>{const u=pick;pick=null;send({t:'play',u,color:b.dataset.color});if(mode==='guest')render()});$('#dosPickCancel').onclick=()=>{pick=null;render()}}
  if(v.winner>=0){$('#dosEndExit').onclick=leave;const again=$('#dosAgain');if(again)again.onclick=()=>{S=newGame(seats.map(x=>x.name),seats.map(x=>x.kind));pushState()}}
 }

 window.SudomiDos={open,close,join:code=>joinRoom(code),solo:()=>startSolo(),create:n=>createRoom(n),_engine:{newGame,act,viewFor,aiMove,canPlay}};
})();
