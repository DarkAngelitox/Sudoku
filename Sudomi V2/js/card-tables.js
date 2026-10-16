/* SUDOMI 0.3.97 (roadmap, Fase 7) — MESAS ONLINE de Blackjack y Póker (window.SudomiBJTable, window.SudomiPokerTable).
 * Se abren desde «Multijugador» de cada juego: open({hub,stage,exit}, 'online' | 'join', código). Contra la máquina siguen js/blackjack.js y js/poker.js.
 * SALA: js/party-net.js + la sala de js/lobby.js, de 2 a 4 personas. Los asientos vacíos los juega la máquina, y si alguien se va, la máquina sigue por él.
 * EL ANFITRIÓN LLEVA LA MESA: baraja, reparte, decide y manda a cada teléfono solo lo que puede ver (las cartas tapadas de los demás no viajan).
 * FICHAS: cada persona juega con SUS fichas de juego (window.SudomiChips, js/blackjack.js). Entra a la mesa con las que tiene y, al ir jugando,
 *   su teléfono las va guardando. Son de juego: no cuestan ni valen dinero.
 * Si alguien tarda más de WAIT segundos en su turno, la mesa decide por él (se planta / pasa o se retira). */
(()=>{
 const WAIT=45,BJ_CHIPS=[10,25,50,100],SB=5,BB=10,AI_STACK=500;
 const esc=t=>String(t==null?'':t).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const clean=n=>String(n||'').replace(/[<>&"']/g,'').replace(/\s+/g,' ').trim().slice(0,14);
 const fmt=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,',');
 const snd=n=>{try{window.SudomiSound&&SudomiSound.play(n)}catch(_){}};
 const Chips=()=>window.SudomiChips||{get:()=>1000,set:()=>{},REFILL:500};
 const Pf=()=>window.SudomiProfile,myName=()=>(Pf()&&Pf().name&&Pf().name())||'Jugador',myAvatar=()=>(Pf()&&Pf().avatar&&Pf().avatar())||'🙂';
 const SUITS=['♠','♥','♦','♣'];
 const AI_NAMES=[['Don Fichas','🦉'],['La Tigra','🐯'],['Manolo','🦊'],['Yaritza','🐼'],['Doña Suerte','🐢'],['El Profe','🐻']];
 function sheet(root,html){const s=document.createElement('div');s.className='pc-sheet';s.innerHTML=`<div class="pc-sheet-in">${html}<button class="arc-btn" type="button" data-close>Entendido</button></div>`;s.onclick=e=>{if(e.target===s||e.target.closest('[data-close]'))s.remove()};root.appendChild(s)}
 const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
 const arcade=(game,won)=>{try{window.dispatchEvent(new CustomEvent('sudomi-arcade',{detail:{game,won:!!won}}))}catch(_){}};

 /* ======================= una sala de mesa (común a los dos juegos) =======================
  * T = {GAME, NAME, ui, net, engine, view} · hooks: start(), act(seat,a), viewFor(seat), draw(view), menuHTML(), rules() */
 function makeTable(GAME,NAME,cls,H){
  const T={ui:null,net:{role:'solo',room:null,conn:null,code:'',seats:[],me:0,started:false,status:'',tok:0},V:null};
  const $=s=>T.ui.stage.querySelector(s);
  const head=()=>`<div class="dos-head"><div><h2>${NAME}</h2></div><div class="dos-actions"><button class="game-restart" id="ctRules" aria-label="Reglas">?</button></div></div>`;
  const bindHead=()=>{const r=$('#ctRules');if(r)r.onclick=()=>sheet($('.'+cls),H.rules())};
  const inviteUrl=()=>{const base=location.origin&&location.origin!=='null'?location.origin+location.pathname:location.href.split(/[?#]/)[0];return `${base}?game=${GAME}&room=${T.net.code}`};
  const pub=()=>T.net.seats.map(s=>({kind:s.kind,name:s.name,avatar:s.avatar,away:!!s.away,stack:s.stack||0}));
  function menu(){
   leave();const net=T.net;
   T.ui.stage.innerHTML=`<div class="mini-game ${cls}">${head()}<div class="wd-menu">${net.status?`<p class="pc-note bad">${esc(net.status)}</p>`:''}${H.menuHTML()}
    <p class="pc-note">Tus fichas: <b>${fmt(Chips().get())}</b>. Cada uno juega con las suyas.</p><button class="arc-btn pc-big" id="ctCreate">🌐 Crear mesa</button></div></div>`;
   net.status='';bindHead();$('#ctCreate').onclick=create;
  }
  function lobby(){
   const net=T.net,host=net.role==='host';
   T.ui.stage.innerHTML=`<div class="mini-game ${cls}">${head()}<div id="lbRoot"></div></div>`;bindHead();
   if(!window.SudomiLobby){$('#lbRoot').textContent=net.status||'Creando mesa…';return}
   SudomiLobby.render($('#lbRoot'),{game:GAME,gameName:NAME,code:net.code||null,url:net.code?inviteUrl():'',host,fixed:true,
    seats:net.seats.map((s,k)=>({state:k===net.me&&s.kind==='human'?'me':s.kind==='open'?'open':s.kind==='ai'?'ai':s.away?'away':'human',name:s.name,avatar:s.avatar,sub:s.kind==='human'?`${fmt(s.stack||0)} fichas`:undefined})),
    extra:'<p class="pc-note">Los asientos vacíos los juega la máquina. Cada uno apuesta sus propias fichas de juego.</p>',
    startLabel:'▶ Abrir la mesa',canStart:!!net.code,onStart:host?start:undefined,
    onAI:i=>{if(!host||net.started||!net.seats[i]||net.seats[i].kind!=='open')return;aiSeat(i);pushLobby()},
    status:net.status,hint:host?'Comparte el código o invita a tus amigos.':''});
  }
  const aiSeat=i=>{const used=T.net.seats.map(s=>s.name),nm=AI_NAMES.find(x=>!used.includes(x[0]))||['Rival','🤖'];Object.assign(T.net.seats[i],{kind:'ai',id:null,name:nm[0],avatar:nm[1],stack:AI_STACK})};
  function pushLobby(){const net=T.net;if(net.role!=='host')return;net.seats.forEach((s,k)=>{if(k&&s.id&&net.room)net.room.send(s.id,{t:'lobby',seats:pub(),code:net.code})});if(!net.started)lobby()}
  async function create(){
   if(Pf()&&Pf().get&&!Pf().get()){Pf().ensure(()=>create());return}
   const net=T.net;if(!window.SudomiParty){net.status='Este navegador no puede crear salas.';return menu()}
   const my=++net.tok;Object.assign(net,{role:'host',code:'',started:false,status:'',me:0,room:null});
   net.seats=[{kind:'human',id:'host',name:myName(),avatar:myAvatar(),stack:Chips().get()},{kind:'open'},{kind:'open'},{kind:'open'}];lobby();
   try{const room=await SudomiParty.host(GAME,onHost);if(my!==net.tok){room.close();return}net.room=room;net.code=room.code;lobby()}
   catch(e){if(my!==net.tok)return;net.role='solo';net.status=(e&&e.message)||'No se pudo crear la mesa.';menu()}
  }
  function onHost(e){
   const net=T.net;if(net.role!=='host')return;
   if(e.type==='join'){
    const old=net.seats.findIndex(s=>s.id===e.id);
    if(old>0){net.seats[old].away=false;net.seats[old].kind='human';H.seatBack&&H.seatBack(old)}
    else{const i=net.seats.findIndex(s=>s.kind==='open');if(i<0||net.started){net.room.reject(e.id,net.started?'La mesa ya empezó.':'La mesa está llena.');return}
     const m=e.meta||{};Object.assign(net.seats[i],{kind:'human',id:e.id,name:clean(m.n)||'Amigo',avatar:String(m.a||'🙂').slice(0,4),stack:Math.max(0,Math.min(1e6,Math.floor(+m.c||0)))})}
    pushLobby();if(net.started)broadcast();
   }else if(e.type==='leave'){const i=net.seats.findIndex(s=>s.id===e.id);if(i<1)return;if(!net.started){net.seats[i]={kind:'open'};pushLobby();return}
    net.seats[i].away=true;net.seats[i].kind='ai';H.seatAway&&H.seatAway(i);broadcast()}   // la máquina sigue por él
   else if(e.type==='msg'&&e.data&&e.data.t==='act'){const i=net.seats.findIndex(s=>s.id===e.id);if(i>0)H.act(i,e.data.a)}
  }
  function start(){const net=T.net;if(net.role!=='host'||!net.room)return;net.seats.forEach((s,i)=>{if(s.kind==='open')aiSeat(i)});net.started=true;H.start(net.seats);broadcast()}
  // cada cambio de la mesa: a cada invitado su vista, y el anfitrión pinta la suya
  function broadcast(){const net=T.net;if(net.role!=='host'||!net.started)return;net.seats.forEach((s,k)=>{if(k&&s.id&&!s.away&&net.room)net.room.send(s.id,{t:'v',v:H.viewFor(k)})});show(H.viewFor(0))}
  function show(v){T.V=v;if(!T.ui)return;try{if(v&&v.seats&&v.seats[v.you])Chips().set(v.seats[v.you].stack)}catch(_){}T.ui.stage.innerHTML=`<div class="mini-game ${cls}">${head()}${H.draw(v)}</div>`;bindHead();
   T.ui.stage.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>send(JSON.parse(b.dataset.a)));const x=$('#ctLeave');if(x)x.onclick=()=>{leave();T.ui.exit()}}
  function send(a){const net=T.net;if(net.role==='host')H.act(0,a);else if(net.conn)net.conn.send({t:'act',a})}
  function join(code){
   if(Pf()&&Pf().get&&!Pf().get()){Pf().ensure(()=>join(code));return}
   const net=T.net;if(!window.SudomiParty){net.status='Este navegador no puede entrar a salas.';return menu()}
   leave();const my=++net.tok;Object.assign(net,{role:'guest',code:SudomiParty.normCode(code),started:false,status:'Conectando con la mesa…',seats:[],me:-1});lobby();
   net.conn=SudomiParty.join(GAME,code,{n:myName(),a:myAvatar(),c:Chips().get()},e=>{if(my!==net.tok)return;
    if(e.type==='open'){net.status='';if(!net.started)lobby();return}
    if(e.type==='away'){net.status='Se perdió la conexión. Reconectando…';if(!net.started)lobby();return}
    if(e.type==='back'){net.status='';return}
    if(e.type==='closed'){leave();net.status=e.message||'La mesa se cerró.';menu();return}
    if(e.type!=='msg')return;const d=e.data||{};
    if(d.t==='lobby'){net.seats=d.seats;net.code=d.code||net.code;if(!net.started)lobby()}
    else if(d.t==='v'&&d.v){net.started=true;net.me=d.v.you;show(d.v)}
   });
  }
  function leave(){const net=T.net;net.tok++;H.stop&&H.stop();if(net.room){try{net.room.close()}catch(_){}}if(net.conn){try{net.conn.close()}catch(_){}}Object.assign(net,{role:'solo',room:null,conn:null,code:'',seats:[],started:false,me:0})}
  T.open=(ui,m,code)=>{T.ui=ui;ui.hub.classList.add('hidden');ui.stage.classList.remove('hidden');if(m==='join')join(code);else menu()};
  T.close=()=>{leave();T.net.status=''};
  T.broadcast=broadcast;T.seats=()=>T.net.seats;T.isHost=()=>T.net.role==='host';
  return T;
 }
 // espera a que un asiento actúe: una persona (anfitrión o invitado) o, pasado WAIT, la mesa decide
 function waiter(){let w=null;return {ask:(seat,fallback)=>new Promise(res=>{const tm=setTimeout(()=>{if(w&&w.seat===seat){w=null;res(fallback())}},WAIT*1000);w={seat,res:a=>{clearTimeout(tm);res(a)}}}),
  give:(seat,a)=>{if(w&&w.seat===seat){const r=w.res;w=null;r(a);return true}return false},who:()=>w?w.seat:-1,cancel:()=>{if(w){const r=w.res;w=null;r(null)}}}}
 const cardHTML=(c,hide,sm)=>hide?`<div class="bj-card back${sm?' sm':''}"></div>`:`<div class="bj-card ${c.s===1||c.s===2?'red':''}${sm?' sm':''}"><b>${({1:'A',11:'J',12:'Q',13:'K',14:'A'})[c.v]||c.v}</b><i>${SUITS[c.s]}</i></div>`;

 /* =================================================== BLACKJACK =================================================== */
 const BJ={E:null,tok:0,W:waiter()};
 const bjVal=c=>c.v===1?11:Math.min(c.v,10),bjTotal=cards=>{let n=0,a=0;for(const c of cards){n+=bjVal(c);if(c.v===1)a++}while(n>21&&a-->0)n-=10;return n},bjBJ=cards=>cards.length===2&&bjTotal(cards)===21;
 const bjSleep=(ms,t)=>new Promise(r=>setTimeout(()=>r(t===BJ.tok),ms));
 function bjDraw(){const E=BJ.E;if(E.deck.length<20){E.deck=[];for(let d=0;d<2;d++)for(let s=0;s<4;s++)for(let v=1;v<=13;v++)E.deck.push({v,s});shuffle(E.deck)}return E.deck.pop()}
 const bjT=makeTable('blackjack','Blackjack · mesa','bj',{
  rules:()=>`<h3>Blackjack en la mesa</h3><ul><li>Cada uno apuesta sus fichas y toca <b>Listo</b>. Cuando todos están listos (o el anfitrión toca <b>Repartir ya</b>), se reparte.</li><li>Se juega por turnos contra la <b>banca</b>: pedir, plantarse, doblar o dividir, como en el Blackjack de siempre. La banca pide hasta 17.</li><li>Blackjack paga 3 a 2, ganar 1 a 1 y el empate devuelve la apuesta.</li><li>Si alguien tarda más de ${WAIT} s, se planta solo.</li></ul>`,
  menuHTML:()=>'<div class="pc-hero">🂡<b>Blackjack en la mesa</b><span>Hasta 4 personas contra la banca, cada una con sus fichas. Los asientos vacíos los juega la máquina.</span></div>',
  start(seats){BJ.E={deck:[],dealer:[],hide:true,phase:'bet',turn:-1,msg:'Hagan sus apuestas',seats:seats.map(s=>({bet:0,ready:false,hands:[],cur:0,net:null,last:0}))};BJ.tok++;bjBetPhase()},
  stop(){BJ.tok++;BJ.W.cancel();BJ.E=null},
  seatAway(i){const E=BJ.E;if(!E)return;if(E.phase==='bet'){bjAiBet(i);bjMaybeDeal()}if(BJ.W.who()===i)BJ.W.give(i,{t:'stand'})},
  act(i,a){const E=BJ.E;if(!E||!a)return;const S=bjT.seats()[i],P=E.seats[i];
   if(E.phase==='bet'){if(P.ready)return;
    if(a.t==='chip'&&BJ_CHIPS.includes(a.n)&&P.bet+a.n<=S.stack){P.bet+=a.n;snd('tap')}else if(a.t==='clear')P.bet=0;
    else if(a.t==='ready'&&P.bet>0&&P.bet<=S.stack)P.ready=true;else if(a.t==='sit')P.ready=true,P.bet=0;
    else if(a.t==='go'&&i===0){E.seats.forEach(x=>{if(!x.ready)x.ready=true})}
    else if(a.t==='refill'&&S.stack<BJ_CHIPS[0]){S.stack=Chips().REFILL}
    bjT.broadcast();bjMaybeDeal();return}
   if(E.phase==='play'&&E.turn===i){BJ.W.give(i,a);return}
   if(E.phase==='done'&&a.t==='again'&&i===0)bjBetPhase();
  },
  viewFor(k){const E=BJ.E,S=bjT.seats();return {you:k,host:k===0,phase:E.phase,msg:E.msg,turn:E.turn,hide:E.hide,dealer:E.dealer.map((c,j)=>E.hide&&j===1?null:c),
   seats:S.map((s,i)=>({name:s.name,avatar:s.avatar,kind:s.kind,away:!!s.away,stack:s.stack,bet:E.seats[i].bet,ready:E.seats[i].ready,hands:E.seats[i].hands,cur:E.seats[i].cur,net:E.seats[i].net}))}},
  draw:bjDrawView
 });
 function bjAiBet(i){const E=BJ.E,s=bjT.seats()[i];if(s.stack<BJ_CHIPS[0])s.stack=AI_STACK;E.seats[i].bet=Math.min(s.stack,[10,25,25,50,100][Math.floor(Math.random()*5)]);E.seats[i].ready=true}
 function bjBetPhase(){const E=BJ.E;BJ.tok++;Object.assign(E,{phase:'bet',dealer:[],hide:true,turn:-1,msg:'Hagan sus apuestas'});
  E.seats.forEach((P,i)=>{const s=bjT.seats()[i];P.hands=[];P.cur=0;P.net=null;P.ready=false;P.bet=s.kind==='human'&&P.last&&P.last<=s.stack?P.last:0;if(s.kind==='ai')bjAiBet(i)});bjT.broadcast()}
 function bjMaybeDeal(){const E=BJ.E;if(E&&E.phase==='bet'&&E.seats.every(P=>P.ready))bjDeal()}
 async function bjDeal(){
  const E=BJ.E,S=bjT.seats(),t=++BJ.tok,play=E.seats.map((P,i)=>P.bet>0&&P.bet<=S[i].stack?i:-1).filter(i=>i>=0);
  if(!play.length){E.msg='Nadie apostó. Hagan sus apuestas.';E.seats.forEach(P=>P.ready=false);return bjT.broadcast()}
  E.phase='deal';E.msg='Repartiendo…';play.forEach(i=>{S[i].stack-=E.seats[i].bet;E.seats[i].last=E.seats[i].bet;E.seats[i].hands=[{cards:[],bet:E.seats[i].bet,done:false,res:''}]});
  for(let k=0;k<2;k++){for(const i of play){E.seats[i].hands[0].cards.push(bjDraw());snd('card');bjT.broadcast();if(!await bjSleep(260,t))return}E.dealer.push(bjDraw());bjT.broadcast();if(!await bjSleep(260,t))return}
  if(bjBJ(E.dealer))return bjFinish(t);
  E.phase='play';
  for(const i of play){
   const P=E.seats[i];P.cur=0;E.turn=i;
   while(P.cur<P.hands.length){
    const h=P.hands[P.cur];if(bjTotal(h.cards)>=21||h.done){h.done=true;P.cur++;continue}
    E.msg=`Turno de ${S[i].name}${P.hands.length>1?` · mano ${P.cur+1}`:''}`;bjT.broadcast();
    const a=S[i].kind==='ai'?await bjAi(h,t):await BJ.W.ask(i,()=>({t:'stand'}));if(t!==BJ.tok||!a)return;
    if(a.t==='hit'){h.cards.push(bjDraw());snd('card');if(bjTotal(h.cards)>=21)h.done=true}
    else if(a.t==='stand')h.done=true;
    else if(a.t==='double'&&h.cards.length===2&&S[i].stack>=h.bet){S[i].stack-=h.bet;h.bet*=2;h.cards.push(bjDraw());snd('card');h.done=true}
    else if(a.t==='split'&&P.hands.length===1&&h.cards.length===2&&bjVal(h.cards[0])===bjVal(h.cards[1])&&S[i].stack>=h.bet){S[i].stack-=h.bet;const c2=h.cards.pop();h.cards.push(bjDraw());P.hands.push({cards:[c2,bjDraw()],bet:h.bet,done:false,res:''});snd('card')}
    if(h.done)P.cur++;
   }
  }
  return bjFinish(t);
 }
 async function bjAi(h,t){if(!await bjSleep(700,t))return null;const n=bjTotal(h.cards),up=bjVal(BJ.E.dealer[0]);return {t:n<12||(n<17&&up>=7)?'hit':n===11&&h.cards.length===2?'double':'stand'}}
 async function bjFinish(t){
  const E=BJ.E,S=bjT.seats();E.phase='dealer';E.turn=-1;E.hide=false;E.msg='Juega la banca…';bjT.broadcast();
  const live=E.seats.some(P=>P.hands.some(h=>bjTotal(h.cards)<=21));
  if(live&&!bjBJ(E.dealer)){if(!await bjSleep(600,t))return;while(bjTotal(E.dealer)<17){E.dealer.push(bjDraw());snd('card');bjT.broadcast();if(!await bjSleep(600,t))return}}
  const d=bjTotal(E.dealer),dbj=bjBJ(E.dealer);
  E.seats.forEach((P,i)=>{if(!P.hands.length)return;let back=0,st=0;P.hands.forEach(h=>{const n=bjTotal(h.cards),bj=bjBJ(h.cards)&&P.hands.length===1;st+=h.bet;
    if(n>21)h.res='bust';else if(bj&&!dbj){h.res='bj';back+=h.bet*2.5}else if(dbj&&!bj)h.res='lose';else if(d>21||n>d){h.res='win';back+=h.bet*2}else if(n===d){h.res='push';back+=h.bet}else h.res='lose'});
   back=Math.floor(back);S[i].stack+=back;P.net=back-st});
  E.phase='done';E.msg=`La banca hizo ${d>21?'más de 21':d}${dbj?' (Blackjack)':''}.`;
  const mine=E.seats[0].net;if(mine!=null){snd(mine>0?'win':mine<0?'bad':'pop');arcade('blackjack',mine>0)}
  bjT.broadcast();
 }
 function bjDrawView(v){
  const me=v.seats[v.you],MS=me,res={win:'Gana',bj:'¡Blackjack!',push:'Empate',lose:'Pierde',bust:'Se pasó'};
  const dealerT=v.dealer.length?(v.dealer.some(c=>!c)?bjVal(v.dealer[0]):bjTotal(v.dealer)):'';
  const seat=(s,i)=>`<div class="ct-seat${v.turn===i?' turn':''}${i===v.you?' me':''}${s.away?' away':''}"><div class="ct-who"><span>${esc(s.avatar)}</span><b>${esc(i===v.you?'Tú':s.name)}</b><i>${fmt(s.stack)}</i></div>
   ${s.hands.length?s.hands.map((h,k)=>`<div class="ct-hand${v.turn===i&&s.cur===k?' on':''}"><div class="bj-cards">${h.cards.map(c=>cardHTML(c,false,1)).join('')}</div><small>${bjTotal(h.cards)} · ${fmt(h.bet)}${h.res?` · <b>${res[h.res]}</b>`:''}</small></div>`).join(''):`<small>${v.phase==='bet'?(s.ready?(s.bet?`Apuesta ${fmt(s.bet)} ✓`:'No juega'):s.bet?`Apostando ${fmt(s.bet)}…`:'Pensando…'):'—'}</small>`}
   ${s.net!=null&&s.hands.length?`<em class="${s.net>0?'win':s.net<0?'lose':''}">${s.net>0?'+':''}${fmt(s.net)}</em>`:''}</div>`;
  let ctrl='';
  if(v.phase==='bet'){const ready=me.ready;
   ctrl=ready?`<p class="bj-hint">${me.bet?`Listo con ${fmt(me.bet)}. Esperando a los demás…`:'Esta mano no juegas.'}</p>${v.host?'<div class="bj-row"><button class="arc-btn" data-a=\'{"t":"go"}\'>Repartir ya</button></div>':''}`
    :MS.stack<BJ_CHIPS[0]&&!me.bet?`<div class="bj-row"><button class="arc-btn pc-big" data-a='{"t":"refill"}'>🎁 Recargar ${Chips().REFILL} fichas</button></div>`
    :`<div class="bj-chips">${BJ_CHIPS.map(c=>`<button type="button" class="bj-chip c${c}" data-a='{"t":"chip","n":${c}}' ${me.bet+c>MS.stack?'disabled':''}>${c}</button>`).join('')}</div>
     <div class="bj-row"><button class="arc-btn ghost" data-a='{"t":"clear"}' ${me.bet?'':'disabled'}>Quitar</button><button class="arc-btn ghost" data-a='{"t":"sit"}'>No juego esta</button><button class="arc-btn pc-big" data-a='{"t":"ready"}' ${me.bet?'':'disabled'}>Listo${me.bet?' · '+fmt(me.bet):''}</button></div>${v.host?'<div class="bj-row"><button class="arc-btn ghost" data-a=\'{"t":"go"}\'>Repartir ya</button></div>':''}`}
  else if(v.phase==='play'&&v.turn===v.you){const h=me.hands[me.cur];if(h){const two=h.cards.length===2;
   ctrl=`<div class="bj-row bj-acts"><button class="arc-btn" data-a='{"t":"hit"}'>Pedir</button><button class="arc-btn" data-a='{"t":"stand"}'>Plantarse</button><button class="arc-btn ghost" data-a='{"t":"double"}' ${two&&MS.stack>=h.bet?'':'disabled'}>Doblar</button><button class="arc-btn ghost" data-a='{"t":"split"}' ${two&&me.hands.length===1&&bjVal(h.cards[0])===bjVal(h.cards[1])&&MS.stack>=h.bet?'':'disabled'}>Dividir</button></div>`}}
  else if(v.phase==='done')ctrl=v.host?`<div class="bj-row"><button class="arc-btn pc-big" data-a='{"t":"again"}'>Otra mano</button><button class="arc-btn ghost" id="ctLeave">Salir</button></div>`:'<p class="bj-hint">El anfitrión reparte la próxima mano.</p><div class="bj-row"><button class="arc-btn ghost" id="ctLeave">Salir</button></div>';
  return `<div class="bj-bank"><span>Tus fichas</span><b>${fmt(MS.stack)}</b></div>
   <div class="bj-table ct"><div class="bj-side"><small>Banca${dealerT!==''?' · '+dealerT:''}</small><div class="bj-cards">${v.dealer.map(c=>cardHTML(c,!c)).join('')||'<div class="bj-card ghost"></div><div class="bj-card ghost"></div>'}</div></div>
   <div class="bj-msg" role="status">${esc(v.msg)}</div><div class="ct-seats">${v.seats.map(seat).join('')}</div></div><div class="bj-ctrl">${ctrl}</div>`;
 }

 /* =================================================== PÓKER =================================================== */
 const PK={E:null,tok:0,W:waiter()};
 const CAT=['Carta alta','Pareja','Doble pareja','Trío','Escalera','Color','Full','Póker','Escalera de color'];
 function rank5(h){const vals=h.map(c=>c.v).sort((x,y)=>y-x),cnt={};vals.forEach(v=>cnt[v]=(cnt[v]||0)+1);
  const groups=Object.entries(cnt).map(([v,n])=>[+v,n]).sort((x,y)=>y[1]-x[1]||y[0]-x[0]),flush=h.every(c=>c.s===h[0].s);let high=0;
  if(groups.length===5){if(vals[0]-vals[4]===4)high=vals[0];else if(vals.join()==='14,5,4,3,2')high=5}const gv=groups.map(x=>x[0]);let cat,tb;
  if(high&&flush){cat=8;tb=[high]}else if(groups[0][1]===4){cat=7;tb=gv}else if(groups[0][1]===3&&groups[1][1]===2){cat=6;tb=gv}else if(flush){cat=5;tb=vals}
  else if(high){cat=4;tb=[high]}else if(groups[0][1]===3){cat=3;tb=gv}else if(groups[0][1]===2&&groups[1][1]===2){cat=2;tb=gv}else if(groups[0][1]===2){cat=1;tb=gv}else{cat=0;tb=vals}
  return cat*15**5+tb.reduce((s,x,i)=>s+x*15**(4-i),0)}
 function best(c){const n=c.length;if(n<5)return 0;if(n===5)return rank5(c);let b=0;for(let a=0;a<n;a++)for(let d=a+1;d<n;d++)if(n===7)b=Math.max(b,rank5(c.filter((_,i)=>i!==a&&i!==d)));if(n===6)for(let a=0;a<6;a++)b=Math.max(b,rank5(c.filter((_,i)=>i!==a)));return b}
 const catName=r=>CAT[Math.floor(r/15**5)];
 const pkSleep=(ms,t)=>new Promise(r=>setTimeout(()=>r(t===PK.tok),ms));
 const pkT=makeTable('poker','Póker · mesa','pk',{
  rules:()=>`<h3>Póker en la mesa (Texas Hold'em)</h3><ul><li>2 cartas tapadas para cada uno y 5 comunes en la mesa (3, 1 y 1). Gana la mejor mano de 5.</li><li>Retirarse, pasar, igualar o subir. Ciegas de ${SB} y ${BB}, que van rotando.</li><li>El anfitrión toca <b>Repartir</b> para cada mano. Si alguien tarda más de ${WAIT} s, la mesa pasa o se retira por él.</li><li>Cada uno juega con sus fichas de juego.</li></ul>`,
  menuHTML:()=>'<div class="pc-hero">🃏<b>Póker en la mesa</b><span>Texas Hold\'em de 2 a 4 personas, cada una con sus fichas. Los asientos vacíos los juega la máquina.</span></div>',
  start(seats){PK.E={phase:'start',deck:[],board:[],pot:0,cur:0,minRaise:BB,turn:-1,dealer:Math.floor(Math.random()*seats.length),street:0,show:false,msg:'El anfitrión reparte.',P:seats.map(()=>({cards:[],bet:0,total:0,fold:false,allin:false,say:'',won:0,best:0}))};PK.tok++},
  stop(){PK.tok++;PK.W.cancel();PK.E=null},
  seatAway(i){if(PK.W.who()===i)PK.W.give(i,{t:'call'})},
  act(i,a){const E=PK.E;if(!E||!a)return;
   if(i===0&&a.t==='deal'&&(E.phase==='start'||E.phase==='done'))return pkHand();
   if(a.t==='refill'){const s=pkT.seats()[i];if(s.stack<BB&&E.phase!=='play'){s.stack=Chips().REFILL;pkT.broadcast()}return}
   if(E.phase==='play'&&E.turn===i)PK.W.give(i,a);
  },
  viewFor(k){const E=PK.E,S=pkT.seats();return {you:k,host:k===0,phase:E.phase,msg:E.msg,turn:E.turn,dealer:E.dealer,board:E.board,pot:E.pot,cur:E.cur,minRaise:E.minRaise,show:E.show,waitMe:PK.W.who()===k,
   seats:S.map((s,i)=>{const p=E.P[i],see=i===k||(E.show&&!p.fold);return {name:s.name,avatar:s.avatar,kind:s.kind,away:!!s.away,stack:s.stack,bet:p.bet,fold:p.fold,allin:p.allin,say:p.say,won:p.won,cat:E.show&&!p.fold&&p.best?catName(p.best):'',cards:p.cards.map(c=>see?c:null)}}),
   mine:E.P[k].cards.length&&E.board.length>=3&&!E.P[k].fold?catName(best(E.P[k].cards.concat(E.board))):''}},
  draw:pkDrawView
 });
 function pkPay(i,x){const E=PK.E,s=pkT.seats()[i],p=E.P[i];x=Math.max(0,Math.min(x,s.stack));s.stack-=x;p.bet+=x;p.total+=x;E.pot+=x;if(s.stack===0)p.allin=true;return x}
 const pkAlive=()=>PK.E.P.map((p,i)=>i).filter(i=>!PK.E.P[i].fold),pkCanAct=()=>pkAlive().filter(i=>!PK.E.P[i].allin);
 async function pkHand(){
  const E=PK.E,S=pkT.seats(),n=S.length,t=++PK.tok;
  S.forEach((s,i)=>{if(s.kind==='ai'&&s.stack<BB)s.stack=AI_STACK});
  Object.assign(E,{phase:'play',deck:shuffle((()=>{const d=[];for(let s=0;s<4;s++)for(let v=2;v<=14;v++)d.push({v,s});return d})()),board:[],pot:0,cur:0,minRaise:BB,turn:-1,street:0,show:false,msg:''});
  E.P.forEach((p,i)=>Object.assign(p,{cards:[],bet:0,total:0,fold:S[i].stack<=0,allin:false,say:S[i].stack<=0?'Sin fichas':'',won:0,best:0}));
  if(pkAlive().length<2){E.phase='done';E.msg='Hace falta al menos dos jugadores con fichas.';return pkT.broadcast()}
  do{E.dealer=(E.dealer+1)%n}while(E.P[E.dealer].fold);
  const nx=i=>{let j=i;do{j=(j+1)%n}while(E.P[j].fold);return j},sb=nx(E.dealer),bb=nx(sb);
  pkPay(sb,SB);E.P[sb].say='Ciega '+SB;pkPay(bb,BB);E.P[bb].say='Ciega '+BB;E.cur=BB;
  for(let k=0;k<2;k++)E.P.forEach(p=>{if(!p.fold)p.cards.push(E.deck.pop())});snd('card');pkT.broadcast();if(!await pkSleep(500,t))return;
  let start=nx(bb);
  for(;;){
   if(!await pkRound(start,t))return;
   if(E.street>=3||pkAlive().length<=1)break;
   E.street++;for(let k=0;k<(E.street===1?3:1);k++)E.board.push(E.deck.pop());snd('card');start=nx(E.dealer);pkT.broadcast();if(!await pkSleep(700,t))return;
  }
  pkShowdown();
 }
 async function pkRound(i,t){
  const E=PK.E,S=pkT.seats(),n=S.length,acted=new Set();
  for(let guard=0;guard<200;guard++){
   if(pkAlive().length<=1)break;const act=pkCanAct();
   if(!act.length||act.every(q=>acted.has(q)&&E.P[q].bet===E.cur))break;
   if(act.length===1&&E.P[act[0]].bet>=E.cur&&(acted.has(act[0])||pkAlive().every(q=>E.P[q].allin||q===act[0])))break;
   const p=E.P[i];
   if(!p.fold&&!p.allin){
    const toCall=E.cur-p.bet;E.turn=i;E.msg=`Turno de ${S[i].name}`;
    const pr=S[i].kind==='ai'?pkAi(i,toCall,t):PK.W.ask(i,()=>({t:toCall?'fold':'call'}));pkT.broadcast();   // primero se espera y luego se avisa: así su teléfono ya enseña los botones
    const a=await pr;if(t!==PK.tok||!a)return false;
    if(a.t==='fold'){p.fold=true;p.say='Se retira'}
    else if(a.t==='raise'&&a.to>E.cur&&S[i].stack>toCall){const to=Math.min(a.to,p.bet+S[i].stack),size=to-E.cur;pkPay(i,to-p.bet);if(size>=E.minRaise)E.minRaise=size;E.cur=Math.max(E.cur,p.bet);acted.clear();p.say=p.allin?'All-in':`Sube a ${fmt(p.bet)}`;snd('tap')}
    else{const x=pkPay(i,toCall);p.say=x?(p.allin?'All-in':`Iguala ${fmt(x)}`):'Pasa';if(x)snd('tap')}
    acted.add(i);
   }
   i=(i+1)%n;
  }
  E.turn=-1;E.P.forEach(p=>{p.bet=0;if(!p.fold&&!p.allin)p.say=''});E.cur=0;E.minRaise=BB;pkT.broadcast();return true;
 }
 async function pkAi(i,toCall,t){
  if(!await pkSleep(700+Math.random()*700,t))return null;const E=PK.E,p=E.P[i],S=pkT.seats()[i],[a,b]=p.cards,hi=Math.max(a.v,b.v),lo=Math.min(a.v,b.v);
  let s;if(E.board.length<3)s=a.v===b.v?.5+a.v/28:Math.min(.95,(hi*2+lo)/46+(a.s===b.s?.06:0));else{const r=best(p.cards.concat(E.board)),cat=Math.floor(r/15**5);s=cat===0?.12+hi/14*.16:[0,.42,.66,.76,.84,.88,.94,.97,.99][cat]}
  s+=(Math.random()-.5)*.14;const r=Math.random(),odds=toCall/(E.pot+toCall||1),raiseTo=f=>Math.min(p.bet+S.stack,Math.max(E.cur+E.minRaise,Math.round((E.cur+E.pot*f)/5)*5));
  if(toCall===0)return s>.62&&r<.6?{t:'raise',to:raiseTo(.6)}:{t:'call'};
  if(s>.78&&r<.5&&S.stack>toCall)return {t:'raise',to:raiseTo(.8)};
  return s>odds+.1||(s>odds-.04&&r<.4)?{t:'call'}:{t:'fold'};
 }
 function pkShowdown(){
  const E=PK.E,S=pkT.seats(),live=pkAlive(),lines=[];
  if(live.length===1){S[live[0]].stack+=E.pot;E.P[live[0]].won=E.pot;lines.push(`${S[live[0]].name} gana ${fmt(E.pot)}`)}
  else{E.show=true;live.forEach(i=>E.P[i].best=best(E.P[i].cards.concat(E.board)));
   const levels=[...new Set(E.P.map(p=>p.total))].filter(x=>x>0).sort((a,b)=>a-b);let prev=0;
   for(const L of levels){const pot=E.P.reduce((s,p)=>s+Math.min(p.total,L)-Math.min(p.total,prev),0),elig=live.filter(i=>E.P[i].total>=L);prev=L;if(!pot)continue;
    if(!elig.length){const back=E.P.map((p,i)=>i).filter(i=>E.P[i].total>=L);back.forEach(i=>S[i].stack+=Math.floor(pot/back.length));continue}
    const top=Math.max(...elig.map(i=>E.P[i].best)),win=elig.filter(i=>E.P[i].best===top),share=Math.floor(pot/win.length);
    win.forEach((i,k)=>{const x=share+(k===0?pot-share*win.length:0);S[i].stack+=x;E.P[i].won+=x})}
   E.P.forEach((p,i)=>{if(p.won)lines.push(`${S[i].name} gana ${fmt(p.won)} con ${catName(p.best)}`)})}
  E.phase='done';E.pot=0;E.turn=-1;E.msg=lines.join(' · ');
  const me=E.P[0];if(me.total>0){snd(me.won?'win':'bad');arcade('poker',me.won>me.total)}
  pkT.broadcast();
 }
 function pkDrawView(v){
  const me=v.seats[v.you],n=v.seats.length,toCall=Math.max(0,v.cur-me.bet),my=v.phase==='play'&&v.turn===v.you&&v.waitMe;
  const seat=(s,i)=>{const rel=(i-v.you+n)%n;return `<div class="pk-seat s${rel}${v.turn===i?' turn':''}${s.fold?' out':''}${s.won?' won':''}"><div class="pk-who"><span>${esc(s.avatar)}</span><b>${esc(s.name)}${v.dealer===i?' <u>D</u>':''}</b><i>${fmt(s.stack)}</i></div><div class="pk-hole">${s.cards.map(c=>cardHTML(c,!c,1)).join('')}</div>${s.say?`<em>${esc(s.say)}</em>`:''}${s.bet?`<s>${fmt(s.bet)}</s>`:''}${s.cat?`<small>${s.cat}</small>`:''}</div>`};
  let ctrl='';
  if(v.phase==='start'||v.phase==='done')ctrl=me.stack<BB?`<div class="bj-row"><button class="arc-btn pc-big" data-a='{"t":"refill"}'>🎁 Recargar ${Chips().REFILL} fichas</button></div>`:v.host?`<div class="bj-row"><button class="arc-btn pc-big" data-a='{"t":"deal"}'>▶ Repartir</button><button class="arc-btn ghost" id="ctLeave">Salir</button></div>`:'<p class="bj-hint">El anfitrión reparte la próxima mano.</p><div class="bj-row"><button class="arc-btn ghost" id="ctLeave">Salir</button></div>';
  else if(my){const max=me.bet+me.stack,min=Math.min(max,v.cur+v.minRaise),opts=[...new Set([min,Math.round((v.cur+v.pot*.5)/5)*5,Math.round((v.cur+v.pot)/5)*5].filter(x=>x>=min&&x<max))].sort((a,b)=>a-b).slice(0,3);
   ctrl=`<div class="bj-row"><button class="arc-btn ghost" data-a='{"t":"fold"}'>Retirarse</button><button class="arc-btn" data-a='{"t":"call"}'>${toCall?(toCall>=me.stack?'All-in '+fmt(me.stack):'Igualar '+fmt(toCall)):'Pasar'}</button></div>${me.stack>toCall?`<div class="pk-raise"><span>Subir a</span>${opts.map(x=>`<button type="button" data-a='{"t":"raise","to":${x}}'>${fmt(x)}</button>`).join('')}<button type="button" class="all" data-a='{"t":"raise","to":${max}}'>All-in</button></div>`:''}`}
  else ctrl=`<p class="bj-hint">${v.turn>=0?'Juega '+esc(v.seats[v.turn].name)+'…':'&nbsp;'}</p>`;
  return `<div class="pk-table">${v.seats.map((s,i)=>i===v.you?'':seat(s,i)).join('')}<div class="pk-mid"><div class="pk-board">${Array.from({length:5},(_,k)=>v.board[k]?cardHTML(v.board[k],false):'<div class="bj-card ghost md"></div>').join('')}</div><p class="pk-pot">Bote <b>${fmt(v.pot)}</b></p></div>${seat(me,v.you)}</div>
   <div class="pk-me"><div class="pk-mycards">${me.cards.map(c=>cardHTML(c,!c)).join('')||'<div class="bj-card ghost"></div><div class="bj-card ghost"></div>'}</div><div><small>Tus fichas</small><b>${fmt(me.stack)}</b>${v.mine?`<i>${v.mine}</i>`:''}</div></div>
   <div class="bj-msg" role="status">${esc(v.msg||' ')}</div><div class="bj-ctrl">${ctrl}</div>`;
 }
 window.SudomiBJTable={open:bjT.open,close:bjT.close,playing:()=>!!BJ.E&&BJ.E.phase!=='bet'&&BJ.E.phase!=='done'};
 window.SudomiPokerTable={open:pkT.open,close:pkT.close,playing:()=>!!PK.E&&PK.E.phase==='play'};
})();
