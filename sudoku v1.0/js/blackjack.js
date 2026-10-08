/* SUDOMI 0.3.8 (V2, Fase 7) — BLACKJACK completo (window.SudomiBlackjack) y FICHAS DE JUEGO (window.SudomiChips).
 * Se abre con SudomiBlackjack.open({hub,stage,exit}) desde «Contra la máquina» (ver openBlackjack en other-games.js). Los modos
 * «En este dispositivo» y «Multijugador» siguen usando el Blackjack de dos jugadores de js/extra-games.js.
 *
 * FICHAS: son de mentira, no se compran ni se cambian por nada. Se guardan en localStorage 'sudomi-chips'. Empiezas con START y,
 * si te quedas sin ninguna, el botón «Recargar» te da REFILL. Las usarán también los otros juegos de cartas con apuestas.
 * REGLAS: una baraja que se rebaraja cuando quedan pocas cartas · la banca pide hasta 17 y se planta en 17 · Blackjack (As + 10 con
 * las dos primeras) paga 3 a 2 · Doblar: solo con dos cartas, recibes una más y te plantas · Dividir: dos cartas del mismo valor, una vez.
 * ESTADO S: phase 'bet' | 'play' | 'dealer' | 'done'; bet = apuesta que se está armando; hands = [{cards,bet,done,doubled,res}];
 * cur = mano que juega; dealer = cartas de la banca (la segunda tapada hasta que le toca). */
(()=>{
 const START=1000,REFILL=500,CHIPS=[10,25,50,100],KEY='sudomi-chips';
 const readChips=()=>{try{const v=JSON.parse(localStorage.getItem(KEY));return v&&Number.isFinite(v.n)?Math.max(0,Math.floor(v.n)):START}catch(_){return START}};
 const writeChips=n=>{try{localStorage.setItem(KEY,JSON.stringify({n:Math.max(0,Math.floor(n))}))}catch(_){}};
 window.SudomiChips={get:readChips,set:writeChips,add:n=>{writeChips(readChips()+n);return readChips()},START,REFILL};
 const SUITS=['♠','♥','♦','♣'],NAMES={1:'A',11:'J',12:'Q',13:'K'};
 const play=n=>{try{window.SudomiSound&&SudomiSound.play(n)}catch(_){}};
 const fmt=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,',');
 let ui=null,S=null,token=0,deck=[];
 const $=s=>ui.stage.querySelector(s);
 function draw1(){if(deck.length<15){deck=[];for(let s=0;s<4;s++)for(let v=1;v<=13;v++)deck.push({v,s});for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]]}}return deck.pop()}
 const val=c=>c.v===1?11:Math.min(c.v,10);
 function total(cards){let n=0,a=0;for(const c of cards){n+=val(c);if(c.v===1)a++}while(n>21&&a-->0)n-=10;return n}
 const isBJ=cards=>cards.length===2&&total(cards)===21;
 const sleep=(ms,t)=>new Promise(r=>setTimeout(()=>r(t===token),ms));
 const cardHTML=(c,hide)=>hide?'<div class="bj-card back"></div>':`<div class="bj-card ${c.s===1||c.s===2?'red':''}"><b>${NAMES[c.v]||c.v}</b><i>${SUITS[c.s]}</i></div>`;
 const head=()=>`<div class="dos-head"><div><h2>Blackjack</h2></div><div class="dos-actions"><button class="game-restart" id="bjRules" aria-label="Reglas">?</button></div></div>`;
 const rulesHTML=()=>`<h3>Blackjack</h3><ul>
  <li>Acércate a <b>21</b> sin pasarte y supera a la banca. Del 2 al 10 valen su número, las figuras 10 y el As 11 (o 1 si te pasarías).</li>
  <li><b>Apuesta</b> tocando las fichas y luego <b>Repartir</b>. Las fichas son de juego: no cuestan ni valen dinero.</li>
  <li><b>Pedir:</b> otra carta. <b>Plantarse:</b> te quedas. La banca pide hasta 17.</li>
  <li><b>Doblar:</b> con tus dos primeras cartas doblas la apuesta, recibes una sola carta más y te plantas.</li>
  <li><b>Dividir:</b> si tus dos cartas valen lo mismo las separas en dos manos, cada una con su apuesta (una vez por ronda).</li>
  <li><b>Blackjack</b> (As + una de 10 al repartir) paga 3 a 2. Ganar paga 1 a 1; empatar te devuelve la apuesta.</li>
  <li>Si te quedas sin fichas, toca <b>Recargar</b> y recibes ${REFILL} gratis.</li></ul>`;
 function sheet(html){const s=document.createElement('div');s.className='pc-sheet';s.innerHTML=`<div class="pc-sheet-in">${html}<button class="arc-btn" type="button" data-close>Entendido</button></div>`;s.onclick=e=>{if(e.target===s||e.target.closest('[data-close]'))s.remove()};const r=$('.bj');if(r)r.appendChild(s)}

 function newRound(keepBet){S={phase:'bet',bet:keepBet&&keepBet<=readChips()?keepBet:0,hands:[],cur:0,dealer:[],hide:true,msg:'Haz tu apuesta',net:0,last:keepBet||0};render()}
 function render(){
  if(!ui||!S)return;const chips=readChips(),h=S.hands[S.cur],playing=S.phase==='play';
  const dealerTotal=S.dealer.length?(S.hide?val(S.dealer[0]):total(S.dealer)):'';
  const hands=S.hands.map((x,k)=>`<div class="bj-hand${playing&&k===S.cur?' on':''}${x.res?' '+x.res:''}"><div class="bj-cards">${x.cards.map(c=>cardHTML(c)).join('')}</div><p><b>${total(x.cards)}</b><span>Apuesta ${fmt(x.bet)}</span>${x.res?`<em>${{win:'Ganas',bj:'¡Blackjack!',push:'Empate',lose:'Pierdes',bust:'Te pasaste'}[x.res]}</em>`:''}</p></div>`).join('');
  let ctrl='';
  if(S.phase==='bet'){
   ctrl=chips<CHIPS[0]&&!S.bet?`<p class="bj-hint">Te quedaste sin fichas.</p><div class="bj-row"><button class="arc-btn pc-big" type="button" id="bjRefill">🎁 Recargar ${REFILL} fichas</button></div>`
    :`<div class="bj-chips">${CHIPS.map(c=>`<button type="button" class="bj-chip c${c}" data-chip="${c}" ${S.bet+c>chips?'disabled':''}>${c}</button>`).join('')}</div>
     <div class="bj-row"><button class="arc-btn ghost" type="button" id="bjClear" ${S.bet?'':'disabled'}>Quitar</button><button class="arc-btn pc-big" type="button" id="bjDeal" ${S.bet?'':'disabled'}>Repartir${S.bet?' · '+fmt(S.bet):''}</button></div>`;
  }else if(playing&&h){
   const two=h.cards.length===2,canDouble=two&&chips>=h.bet,canSplit=two&&S.hands.length===1&&val(h.cards[0])===val(h.cards[1])&&chips>=h.bet;
   ctrl=`<div class="bj-row bj-acts"><button class="arc-btn" type="button" data-act="hit">Pedir</button><button class="arc-btn" type="button" data-act="stand">Plantarse</button><button class="arc-btn ghost" type="button" data-act="double" ${canDouble?'':'disabled'}>Doblar</button><button class="arc-btn ghost" type="button" data-act="split" ${canSplit?'':'disabled'}>Dividir</button></div>`;
  }else if(S.phase==='done'){
   ctrl=`<div class="bj-row"><button class="arc-btn pc-big" type="button" id="bjAgain">Otra mano</button></div>`;
  }
  ui.stage.innerHTML=`<div class="mini-game bj">${head()}
   <div class="bj-bank"><span>Tus fichas</span><b>${fmt(chips)}</b>${S.phase==='bet'&&S.bet?`<i>Apuesta: ${fmt(S.bet)}</i>`:''}</div>
   <div class="bj-table"><div class="bj-side"><small>Banca${dealerTotal!==''?' · '+dealerTotal:''}</small><div class="bj-cards">${S.dealer.map((c,k)=>cardHTML(c,S.hide&&k===1)).join('')||'<div class="bj-card ghost"></div><div class="bj-card ghost"></div>'}</div></div>
    <div class="bj-msg${S.net>0?' win':S.net<0?' lose':''}" role="status">${S.msg}</div>
    <div class="bj-side me"><div class="bj-hands">${hands||'<div class="bj-hand"><div class="bj-cards"><div class="bj-card ghost"></div><div class="bj-card ghost"></div></div></div>'}</div><small>Tú</small></div></div>
   <div class="bj-ctrl">${ctrl}</div></div>`;
  $('#bjRules').onclick=()=>sheet(rulesHTML());
  ui.stage.querySelectorAll('[data-chip]').forEach(b=>b.onclick=()=>{const c=+b.dataset.chip;if(S.bet+c<=readChips()){S.bet+=c;play('tap');render()}});
  const on=(id,fn)=>{const e=$(id);if(e)e.onclick=fn};
  on('#bjClear',()=>{S.bet=0;render()});on('#bjDeal',deal);on('#bjAgain',()=>newRound(S.last));on('#bjRefill',()=>{writeChips(REFILL);play('bonus');newRound(0)});
  ui.stage.querySelectorAll('[data-act]').forEach(b=>b.onclick=()=>act(b.dataset.act));
 }
 async function deal(){
  if(!S||S.phase!=='bet'||!S.bet||S.bet>readChips())return;const t=++token;
  writeChips(readChips()-S.bet);S.last=S.bet;S.hands=[{cards:[],bet:S.bet,done:false,doubled:false,res:''}];S.dealer=[];S.hide=true;S.phase='deal';S.msg='Repartiendo…';S.net=0;
  for(const who of ['p','d','p','d']){(who==='p'?S.hands[0].cards:S.dealer).push(draw1());play('tap');render();if(!await sleep(380,t))return}
  const pb=isBJ(S.hands[0].cards),db=isBJ(S.dealer);
  if(pb||db){S.hands[0].done=true;return finish(t)}
  S.phase='play';S.cur=0;S.msg='Tu turno';render();
 }
 async function act(a){
  if(!S||S.phase!=='play')return;const t=token,h=S.hands[S.cur];if(!h||h.done)return;
  if(a==='hit'){h.cards.push(draw1());play('tap');if(total(h.cards)>=21)h.done=true}
  else if(a==='stand')h.done=true;
  else if(a==='double'){if(h.cards.length!==2||readChips()<h.bet)return;writeChips(readChips()-h.bet);h.bet*=2;h.doubled=true;h.cards.push(draw1());play('tap');h.done=true}
  else if(a==='split'){
   if(S.hands.length!==1||h.cards.length!==2||val(h.cards[0])!==val(h.cards[1])||readChips()<h.bet)return;
   writeChips(readChips()-h.bet);const second=h.cards.pop();
   S.hands=[{cards:[h.cards[0],draw1()],bet:h.bet,done:false,doubled:false,res:''},{cards:[second,draw1()],bet:h.bet,done:false,doubled:false,res:''}];
   S.cur=0;play('tap');S.hands.forEach(x=>{if(total(x.cards)===21)x.done=true});
  }
  while(S.cur<S.hands.length&&S.hands[S.cur].done)S.cur++;
  if(S.cur>=S.hands.length){S.cur=S.hands.length-1;return finish(t)}
  S.msg=S.hands.length>1?`Mano ${S.cur+1} de ${S.hands.length}`:'Tu turno';render();
 }
 // la banca juega (si hace falta) y se paga cada mano
 async function finish(t){
  S.phase='dealer';S.hide=false;S.msg='Juega la banca…';render();
  const live=S.hands.some(h=>total(h.cards)<=21&&!(isBJ(h.cards)&&S.hands.length===1));
  if(live){if(!await sleep(600,t))return;while(total(S.dealer)<17){S.dealer.push(draw1());play('tap');render();if(!await sleep(600,t))return}}
  const d=total(S.dealer),dbj=isBJ(S.dealer);let back=0,staked=0;
  S.hands.forEach(h=>{
   const n=total(h.cards),bj=isBJ(h.cards)&&S.hands.length===1;staked+=h.bet;
   if(n>21){h.res='bust'}
   else if(bj&&!dbj){h.res='bj';back+=h.bet*2.5}
   else if(dbj&&!bj){h.res='lose'}
   else if(d>21||n>d){h.res='win';back+=h.bet*2}
   else if(n===d){h.res='push';back+=h.bet}
   else h.res='lose';
  });
  back=Math.floor(back);writeChips(readChips()+back);S.net=back-staked;S.phase='done';
  S.msg=S.net>0?`🏆 Ganas ${fmt(S.net)} fichas`:S.net<0?`Pierdes ${fmt(-S.net)} fichas`:'Empate: recuperas tu apuesta';
  play(S.net>0?'win':S.net<0?'bad':'pop');render();
  try{window.dispatchEvent(new CustomEvent('sudomi-arcade',{detail:{game:'blackjack',won:S.net>0}}))}catch(_){}
 }
 function open(opts){ui=opts;ui.hub.classList.add('hidden');ui.stage.classList.remove('hidden');token++;newRound(0)}
 function close(){token++;S=null}
 window.SudomiBlackjack={open,close,playing:()=>!!S&&(S.phase==='deal'||S.phase==='play'||S.phase==='dealer'),_state:()=>S,_deck:d=>{deck=d}};
})();
