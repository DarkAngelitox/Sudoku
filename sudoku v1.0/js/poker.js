/* SUDOMI 0.3.9 (V2, Fase 7) — PÓKER Texas Hold'em contra la máquina (window.SudomiPoker), con las fichas de juego de js/blackjack.js.
 * Se abre con SudomiPoker.open({hub,stage,exit}) desde «Contra la máquina». «En este dispositivo» y «Multijugador» siguen con el
 * póker de cambiar cartas de js/extra-games.js.
 *
 * LA MESA: tú y 3 jugadores de la máquina. Tu pila ES tu saldo de fichas (SudomiChips): cada apuesta se descuenta al momento y cada
 * bote ganado se suma al momento, así nunca se pierde nada si cierras la app. La máquina entra con AI_STACK y, si se queda sin fichas,
 * se sienta otra. Ciegas SB/BB fijas. Sin límite: puedes subir lo que quieras hasta tu pila.
 * UNA MANO (hand): ciegas → 2 cartas a cada uno → apuestas → flop (3) → apuestas → turn (1) → apuestas → river (1) → apuestas → se enseñan.
 * round() lleva una ronda de apuestas; a las personas las espera con ask() y a la máquina le pregunta aiAct().
 * BOTES: showdown() reparte por niveles de lo que puso cada uno (p.total), así salen bien los botes laterales cuando alguien va all-in.
 * MANOS: rank5() puntúa 5 cartas (categoría y desempates en un solo número) y best() busca la mejor de las 21 combinaciones de 7. */
(()=>{
 const SB=5,BB=10,AI_STACK=500;
 const SUITS=['♠','♥','♦','♣'],LBL={11:'J',12:'Q',13:'K',14:'A'},CAT=['Carta alta','Pareja','Doble pareja','Trío','Escalera','Color','Full','Póker','Escalera de color'];
 const C=()=>window.SudomiChips,play=n=>{try{window.SudomiSound&&SudomiSound.play(n)}catch(_){}};
 const fmt=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,','),esc=t=>String(t).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 let ui=null,T=null,P=[],token=0,waiting=null;
 const $=s=>ui.stage.querySelector(s);
 const sleep=(ms,t)=>new Promise(r=>setTimeout(()=>r(t===token),ms));
 function rank5(h){
  const vals=h.map(c=>c.v).sort((x,y)=>y-x),cnt={};vals.forEach(v=>cnt[v]=(cnt[v]||0)+1);
  const groups=Object.entries(cnt).map(([v,n])=>[+v,n]).sort((x,y)=>y[1]-x[1]||y[0]-x[0]),flush=h.every(c=>c.s===h[0].s);
  let high=0;if(groups.length===5){if(vals[0]-vals[4]===4)high=vals[0];else if(vals.join()==='14,5,4,3,2')high=5}
  const gv=groups.map(x=>x[0]);let cat,tb;
  if(high&&flush){cat=8;tb=[high]}else if(groups[0][1]===4){cat=7;tb=gv}else if(groups[0][1]===3&&groups[1][1]===2){cat=6;tb=gv}else if(flush){cat=5;tb=vals}
  else if(high){cat=4;tb=[high]}else if(groups[0][1]===3){cat=3;tb=gv}else if(groups[0][1]===2&&groups[1][1]===2){cat=2;tb=gv}else if(groups[0][1]===2){cat=1;tb=gv}else{cat=0;tb=vals}
  return cat*15**5+tb.reduce((s,x,i)=>s+x*15**(4-i),0);
 }
 function best(cards){
  const n=cards.length;if(n===5)return rank5(cards);let b=0;
  if(n===6){for(let a=0;a<6;a++)b=Math.max(b,rank5(cards.filter((_,i)=>i!==a)));return b}
  for(let a=0;a<n;a++)for(let c=a+1;c<n;c++)b=Math.max(b,rank5(cards.filter((_,i)=>i!==a&&i!==c)));
  return b;
 }
 const catOf=r=>Math.floor(r/15**5),catName=r=>catOf(r)===8&&Math.floor((r-8*15**5)/15**4)===14?'Escalera real':CAT[catOf(r)];
 function newDeck(){const d=[];for(let s=0;s<4;s++)for(let v=2;v<=14;v++)d.push({v,s});for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]]}return d}
 const cardHTML=(c,hide,cls)=>hide?`<div class="bj-card back ${cls||''}"></div>`:`<div class="bj-card ${c.s===1||c.s===2?'red':''} ${cls||''}"><b>${LBL[c.v]||c.v}</b><i>${SUITS[c.s]}</i></div>`;
 const alive=()=>P.filter(p=>!p.fold),canAct=()=>P.filter(p=>!p.fold&&!p.allin);
 const me=()=>P[0];
 function pay(p,x){x=Math.max(0,Math.min(x,p.stack));p.stack-=x;p.bet+=x;p.total+=x;T.pot+=x;if(p.stack===0)p.allin=true;if(p.me)C().set(p.stack);return x}
 function give(p,x){p.stack+=x;if(p.me)C().set(p.stack)}

 /* ---- la máquina ---- */
 function strength(p){
  const [a,b]=p.cards,hi=Math.max(a.v,b.v),lo=Math.min(a.v,b.v);
  if(T.board.length<3){if(a.v===b.v)return .5+a.v/28;return Math.min(.95,(hi*2+lo)/46+(a.s===b.s?.06:0)+(hi-lo===1?.04:0))}
  const r=best(p.cards.concat(T.board)),cat=catOf(r),own=T.board.length>=5?best(T.board):0,fromBoard=own&&catOf(own)===cat;
  if(cat===0)return .12+hi/14*.16;
  if(cat===1){const pairV=Math.floor((r-15**5)/15**4);return fromBoard?.2:(pairV===a.v||pairV===b.v)?(.4+pairV/14*.15):.25}
  return fromBoard?.3:[0,0,.66,.76,.84,.88,.94,.97,.99][cat];
 }
 async function aiAct(p,toCall,t){
  if(!await sleep(650+Math.random()*700,t))return null;
  const lv=window.SudomiAILevel?SudomiAILevel():'normal',s=strength(p)+(lv==='easy'?(Math.random()-.5)*.3:lv==='hard'?(Math.random()-.5)*.06:(Math.random()-.5)*.14);
  const r=Math.random(),odds=toCall/(T.pot+toCall||1),raiseTo=f=>Math.min(p.bet+p.stack,Math.max(T.cur+T.minRaise,Math.round((T.cur+T.pot*f)/5)*5));
  if(toCall===0){
   if(s>.62&&r<.7)return {t:'raise',to:raiseTo(.6)};
   if(s>.42&&r<.3)return {t:'raise',to:raiseTo(.4)};
   if(lv!=='easy'&&r<(lv==='hard'?.1:.05))return {t:'raise',to:raiseTo(.5)};
   return {t:'call'};
  }
  if(s>.78&&r<.6&&p.stack>toCall)return {t:'raise',to:raiseTo(.8)};
  if(s>odds+(lv==='easy'?0:.14))return {t:'call'};
  if(s>odds-.04&&r<(lv==='easy'?.8:.4))return {t:'call'};
  return {t:'fold'};
 }
 const ask=()=>new Promise(res=>{waiting=res;render()});
 function answer(a){const w=waiting;waiting=null;if(w)w(a)}

 /* ---- una ronda de apuestas. Devuelve false si se cerró la mesa ---- */
 async function round(first,t){
  let acted=new Set(),i=first;
  for(let guard=0;guard<200;guard++){
   if(alive().length<=1)break;
   const act=canAct();if(!act.length||(act.length===1&&act[0].bet>=T.cur)&&acted.has(act[0].i)||(act.every(q=>acted.has(q.i)&&q.bet===T.cur)))break;
   if(act.length===1&&act[0].bet>=T.cur&&alive().every(q=>q.allin||q===act[0]))break;
   const p=P[i];
   if(!p.fold&&!p.allin){
    const toCall=T.cur-p.bet;T.turn=i;render();
    const a=p.me?await ask():await aiAct(p,toCall,t);if(t!==token||!a)return false;
    if(a.t==='fold'){p.fold=true;p.say='Se retira'}
    else if(a.t==='raise'&&a.to>T.cur&&p.stack>toCall){
     const to=Math.min(a.to,p.bet+p.stack),size=to-T.cur;pay(p,to-p.bet);if(size>=T.minRaise)T.minRaise=size;T.cur=Math.max(T.cur,p.bet);acted=new Set();p.say=p.allin?'All-in':`Sube a ${fmt(p.bet)}`;play('tap');
    }else{const x=pay(p,toCall);p.say=x?(p.allin?'All-in':`Iguala ${fmt(x)}`):'Pasa';if(x)play('tap')}
    acted.add(i);
   }
   i=(i+1)%P.length;
  }
  T.turn=-1;P.forEach(p=>{p.bet=0;if(!p.fold&&!p.allin)p.say=''});T.cur=0;T.minRaise=BB;render();
  return true;
 }
 async function hand(){
  const t=++token,n=P.length;
  P.forEach(p=>{if(p.me)p.stack=C().get()});
  Object.assign(T,{deck:newDeck(),board:[],pot:0,cur:0,minRaise:BB,turn:-1,phase:'play',msg:'',show:false,result:null});
  P.forEach(p=>Object.assign(p,{cards:[],bet:0,total:0,fold:p.stack<=0,allin:false,say:'',won:0,best:0}));
  T.dealer=(T.dealer+1)%n;
  const sb=(T.dealer+1)%n,bb=(T.dealer+2)%n;
  pay(P[sb],SB);P[sb].say='Ciega '+SB;pay(P[bb],BB);P[bb].say='Ciega '+BB;T.cur=BB;
  for(let k=0;k<2;k++)P.forEach(p=>{if(!p.fold)p.cards.push(T.deck.pop())});
  play('tap');render();if(!await sleep(500,t))return;
  if(!await round((bb+1)%n,t))return;
  for(const cnt of [3,1,1]){
   if(alive().length<=1)break;
   for(let k=0;k<cnt;k++)T.board.push(T.deck.pop());play('tap');render();if(!await sleep(700,t))return;
   if(canAct().length>1){if(!await round((T.dealer+1)%n,t))return}
  }
  showdown();
 }
 function showdown(){
  const live=alive(),before=me().stack+me().total;let lines=[];
  const who=p=>p.me?'Ganas':p.name+' gana';
  if(live.length===1){give(live[0],T.pot);live[0].won=T.pot;lines.push(`${who(live[0])} ${fmt(T.pot)} (los demás se retiraron)`)}
  else{
   T.show=true;live.forEach(p=>p.best=best(p.cards.concat(T.board)));
   const levels=[...new Set(P.map(p=>p.total))].filter(x=>x>0).sort((a,b)=>a-b);let prev=0;
   for(const L of levels){
    const pot=P.reduce((s,p)=>s+Math.min(p.total,L)-Math.min(p.total,prev),0),elig=live.filter(p=>p.total>=L);prev=L;
    if(!pot)continue;
    if(!elig.length){const back=P.filter(p=>p.total>=L);back.forEach(p=>give(p,Math.floor(pot/back.length)));continue}
    const top=Math.max(...elig.map(p=>p.best)),win=elig.filter(p=>p.best===top),share=Math.floor(pot/win.length);
    win.forEach((p,k)=>{const x=share+(k===0?pot-share*win.length:0);give(p,x);p.won+=x});
   }
   P.filter(p=>p.won).forEach(p=>lines.push(`${who(p)} ${fmt(p.won)} con ${catName(p.best)}`));
  }
  const net=me().stack-before;T.phase='done';T.result=net;T.pot=0;
  T.msg=lines.join(' · ');play(me().won?'win':net<0?'bad':'pop');
  if(me().total>0&&(me().won||!me().fold)){try{window.dispatchEvent(new CustomEvent('sudomi-arcade',{detail:{game:'poker',won:net>0}}))}catch(_){}}
  render();
 }
 function nextHand(){
  P.forEach((p,i)=>{if(!p.me&&p.stack<BB){const nm=aiName(P.map(x=>x.name));T.note=`${p.name} se quedó sin fichas. Entra ${nm[0]}.`;Object.assign(p,{name:nm[0],avatar:nm[1],stack:AI_STACK})}});
  hand();
 }
 function aiName(used){const pool=(window.SudomiAI?SudomiAI.random(8):[]).concat([['Don Fichas','🦉'],['La Tigra','🐯'],['Manolo','🦊'],['Yaritza','🐼']]);return pool.find(x=>!used.includes(x[0]))||['Rival','🤖']}

 /* ---- pantalla ---- */
 const head=()=>`<div class="dos-head"><div><h2>Póker</h2></div><div class="dos-actions"><button class="game-restart" id="pkRules" aria-label="Reglas">?</button></div></div>`;
 const rulesHTML=()=>`<h3>Póker Texas Hold'em</h3><ul>
  <li>Cada jugador recibe <b>2 cartas</b> tapadas. En la mesa salen <b>5 cartas comunes</b>: primero 3, luego 1 y luego 1. Gana la mejor mano de 5 cartas usando las tuyas y las de la mesa.</li>
  <li>Antes de cada tanda de cartas hay una ronda de apuestas: <b>Retirarse</b> (dejas la mano), <b>Pasar</b> o <b>Igualar</b> (pones lo que falta) o <b>Subir</b>.</li>
  <li>Dos jugadores ponen las <b>ciegas</b> (${SB} y ${BB}) antes de repartir; van rotando.</li>
  <li>Si todos menos uno se retiran, ese se lleva el bote sin enseñar las cartas.</li>
  <li>Manos, de menor a mayor: carta alta, pareja, doble pareja, trío, escalera, color, full, póker, escalera de color.</li>
  <li>Juegas con tus <b>fichas de juego</b> (las mismas del Blackjack). No cuestan ni valen dinero.</li></ul>`;
 function sheet(html){const s=document.createElement('div');s.className='pc-sheet';s.innerHTML=`<div class="pc-sheet-in">${html}<button class="arc-btn" type="button" data-close>Entendido</button></div>`;s.onclick=e=>{if(e.target===s||e.target.closest('[data-close]'))s.remove()};const r=$('.pk');if(r)r.appendChild(s)}
 function seatHTML(p){
  const cards=p.cards.length?p.cards.map(c=>cardHTML(c,!(p.me||(T.show&&!p.fold)),'sm')).join(''):'';
  return `<div class="pk-seat s${p.i}${T.turn===p.i?' turn':''}${p.fold?' out':''}${p.won?' won':''}"><div class="pk-who"><span>${esc(p.avatar)}</span><b>${esc(p.name)}${T.dealer===p.i?' <u>D</u>':''}</b><i>${fmt(p.stack)}</i></div>${p.me?'':`<div class="pk-hole">${cards}</div>`}${p.say?`<em>${esc(p.say)}</em>`:''}${p.bet?`<s>${fmt(p.bet)}</s>`:''}${T.show&&!p.fold&&p.best?`<small>${catName(p.best)}</small>`:''}</div>`;
 }
 function render(){
  if(!ui||!T)return;const m=me(),my=T.turn===0&&!!waiting,toCall=Math.max(0,T.cur-m.bet);
  let ctrl='';
  if(T.phase==='start')ctrl=C().get()<BB?`<p class="bj-hint">No tienes fichas suficientes.</p><div class="bj-row"><button class="arc-btn pc-big" type="button" id="pkRefill">🎁 Recargar ${C().REFILL} fichas</button></div>`:`<div class="bj-row"><button class="arc-btn pc-big" type="button" id="pkDeal">▶ Repartir</button></div>`;
  else if(T.phase==='done')ctrl=m.stack<BB?`<p class="bj-hint">Te quedaste sin fichas.</p><div class="bj-row"><button class="arc-btn pc-big" type="button" id="pkRefill">🎁 Recargar ${C().REFILL} fichas</button></div>`:`<div class="bj-row"><button class="arc-btn pc-big" type="button" id="pkNext">Siguiente mano</button></div>`;
  else if(my){
   const max=m.bet+m.stack,min=Math.min(max,T.cur+T.minRaise),opts=[...new Set([min,Math.round((T.cur+T.pot*.5)/5)*5,Math.round((T.cur+T.pot)/5)*5].filter(x=>x>=min&&x<max))].sort((a,b)=>a-b).slice(0,3);
   ctrl=`<div class="bj-row"><button class="arc-btn ghost" type="button" data-pk="fold">Retirarse</button><button class="arc-btn" type="button" data-pk="call">${toCall?(toCall>=m.stack?'All-in '+fmt(m.stack):'Igualar '+fmt(toCall)):'Pasar'}</button></div>
    ${m.stack>toCall?`<div class="pk-raise"><span>Subir a</span>${opts.map(x=>`<button type="button" data-to="${x}">${fmt(x)}</button>`).join('')}<button type="button" data-to="${max}" class="all">All-in</button></div>`:''}`;
  }else ctrl=`<p class="bj-hint">${T.turn>0?'Juega '+esc(P[T.turn].name)+'…':'&nbsp;'}</p>`;
  const mine=m.cards.length&&T.board.length>=3&&!m.fold?catName(best(m.cards.concat(T.board))):'';
  ui.stage.innerHTML=`<div class="mini-game pk">${head()}
   <div class="pk-table">${P.slice(1).map(seatHTML).join('')}
    <div class="pk-mid"><div class="pk-board">${Array.from({length:5},(_,k)=>T.board[k]?cardHTML(T.board[k],false,'md'):'<div class="bj-card ghost md"></div>').join('')}</div><p class="pk-pot">Bote <b>${fmt(T.pot)}</b></p></div>
    ${seatHTML(m)}</div>
   <div class="pk-me"><div class="pk-mycards">${m.cards.map(c=>cardHTML(c,false)).join('')||'<div class="bj-card ghost"></div><div class="bj-card ghost"></div>'}</div><div><small>Tus fichas</small><b>${fmt(m.stack)}</b>${mine?`<i>${mine}</i>`:''}${m.fold&&T.phase==='play'?'<i>Te retiraste</i>':''}</div></div>
   <div class="bj-msg${T.phase==='done'?(T.result>0?' win':T.result<0?' lose':''):''}" role="status">${esc(T.phase==='done'?(T.msg+(T.result?` · Tu saldo: ${T.result>0?'+':'−'}${fmt(Math.abs(T.result))}`:'')):T.phase==='start'?(T.note||'Ciegas '+SB+' / '+BB+'. Toca Repartir.'):my?'Tu turno':(T.note||'')||' ')}</div>
   <div class="bj-ctrl">${ctrl}</div></div>`;
  $('#pkRules').onclick=()=>sheet(rulesHTML());
  const on=(id,fn)=>{const e=$(id);if(e)e.onclick=fn};
  on('#pkDeal',()=>{T.note='';hand()});on('#pkNext',()=>{T.note='';nextHand()});on('#pkRefill',()=>{C().set(C().REFILL);m.stack=C().get();play('bonus');T.phase='start';render()});
  ui.stage.querySelectorAll('[data-pk]').forEach(b=>b.onclick=()=>answer({t:b.dataset.pk}));
  ui.stage.querySelectorAll('[data-to]').forEach(b=>b.onclick=()=>answer({t:'raise',to:+b.dataset.to}));
 }
 function open(opts){
  ui=opts;ui.hub.classList.add('hidden');ui.stage.classList.remove('hidden');token++;waiting=null;
  const Pf=window.SudomiProfile,names=[];P=[{i:0,me:true,name:(Pf&&Pf.name&&Pf.name())||'Tú',avatar:(Pf&&Pf.avatar&&Pf.avatar())||'🙂',stack:C().get()}];
  for(let k=1;k<4;k++){const nm=aiName(names.concat(P.map(p=>p.name)));names.push(nm[0]);P.push({i:k,me:false,name:nm[0],avatar:nm[1],stack:AI_STACK})}
  P.forEach(p=>Object.assign(p,{cards:[],bet:0,total:0,fold:false,allin:false,say:'',won:0,best:0}));
  T={dealer:Math.floor(Math.random()*4),board:[],pot:0,cur:0,minRaise:BB,turn:-1,phase:'start',msg:'',note:'',show:false,result:null};
  render();
 }
 function close(){token++;const w=waiting;waiting=null;if(w)w(null);T=null}
 window.SudomiPoker={open,close,playing:()=>!!T&&T.phase==='play',_state:()=>T,_players:()=>P,_rank5:rank5,_best:best,_answer:answer};
})();
