/* SUDOMI 0.2.101 — STOP CLÁSICO (window.SudomiStopClasico): la hoja de «Basta» de toda la vida. Es otro juego dentro de STOP:
 * se entra encendiendo el interruptor «Modo clásico» en la pantalla de elegir partida de STOP (other-games.js).
 *
 * LA HOJA: 6 columnas fijas (COLS) y 5 filas, una por ronda (ROUNDS). La casilla «Total» de la fila en juego es el botón ¡STOP!.
 * UNA PARTIDA:
 *  1) orden (solo la primera partida de la sala): 2 jugadores = piedra, papel o tijera; 3 o más = dados. Queda en sess.order y de ahí en
 *     adelante se van turnando para poner la letra (sess.turn), también en las partidas siguientes de la misma sala.
 *  2) 'letter': a quien le toca elige una letra que no haya salido en la sesión (sess.used) y confirma «Iniciar».
 *  3) 'start': a todos les sale ¡START! y 4) 'answer': escriben (máximo ANSWER_TIME segundos).
 *  5) alguien con las 6 casillas llenas toca ¡STOP! → 'stopped': a todos les sale ¡STOP!!! y durante GRACE segundos los demás solo pueden
 *     terminar la casilla en la que estaban escribiendo; las otras quedan como estaban.
 *  6) 'vote' y puntos, igual que el STOP normal: 10 única, 5 repetida, 0 vacía/mala/rechazada, y −20 por cada mala de quien dijo STOP.
 *  7) 'result': el total aparece donde estaba el botón. Tras la ronda 5, 'final'.
 * RED: manda el anfitrión, igual que stop-party.js (sala de party-net.js con el mismo nombre de juego 'stop'). Los invitados entran por
 * SudomiStop.join(); cuando stop-party.js ve que la sala es clásica (mensajes con classic:true) le pasa aquí la conexión (adopt/guest). */
(()=>{
 const COLS=['Nombre','Animal','Fruta o verdura','Ciudad o país','Cosa','Comida'],NC=COLS.length;
 // de qué listas de palabras de stop-party.js saca sus respuestas la computadora
 const SRC={'Nombre':['Nombre'],'Animal':['Animal'],'Fruta o verdura':['Fruta','Verdura'],'Ciudad o país':['Ciudad','País'],'Cosa':['Objeto de la casa','Prenda de vestir','Transporte'],'Comida':['Comida']};
 const LETTERS='ABCDEFGHIJLMNOPRSTUV'.split('');
 const ROUNDS=5,ANSWER_TIME=300,VOTE_TIME=60,GRACE=6;
 const RPS=['✊','✋','✌️'],RPSN=['Piedra','Papel','Tijera'];
 const WORDS=()=>(window.SudomiStop&&SudomiStop._engine&&SudomiStop._engine.WORDS)||{};
 const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').trim().toLowerCase();
 const esc=t=>String(t).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const cleanN=a=>Array.from({length:NC},(_,i)=>String(a&&a[i]!=null?a[i]:'').replace(/\s+/g,' ').trim().slice(0,40));
 const grid=n=>Array.from({length:n},()=>Array(NC).fill(''));

 /* ================= 1. reglas (solo en quien manda) ================= */
 let S=null,sess={order:null,used:[],turn:0};
 function newGame(names,kinds){
  const n=names.length;
  S={n,names,kinds,phase:'',round:1,picker:-1,letter:'',pend:'',left:0,stopBy:-1,answers:grid(n),drafts:grid(n),focus:Array(n).fill(-1),snap:Array(n).fill(false),
   done:Array(n).fill(false),aiAt:Array(n).fill(-1),marks:Array.from({length:n},()=>[]),voted:Array(n).fill(false),rows:null,points:null,totals:Array(n).fill(0),hist:[],
   rps:Array(n).fill(-1),reveal:null,dice:Array(n).fill(0),seq:0};
  if(sess.order&&sess.order.length===n)toLetter();else{sess.order=null;sess.turn=0;S.phase=n===2?'rps':'dice'}
 }
 function toLetter(){
  const s=S,n=s.n;
  Object.assign(s,{picker:sess.order[sess.turn%n],phase:'letter',letter:'',pend:'',left:0,stopBy:-1,answers:grid(n),drafts:grid(n),focus:Array(n).fill(-1),snap:Array(n).fill(false),
   done:Array(n).fill(false),marks:Array.from({length:n},()=>[]),voted:Array(n).fill(false),rows:null,points:null});
  if(sess.used.length>=LETTERS.length)sess.used=[];
 }
 function rpsCheck(){
  const s=S;if(s.reveal||s.rps[0]<0||s.rps[1]<0)return;
  const a=s.rps[0],b=s.rps[1];s.reveal={a,b,w:a===b?-1:(a-b+3)%3===1?0:1};s.left=3;
 }
 function diceCheck(){
  const s=S;if(sess.order||s.dice.some(d=>!d))return;
  const tie=s.dice.map(()=>Math.random());sess.order=s.dice.map((_,p)=>p).sort((x,y)=>s.dice[y]-s.dice[x]||tie[y]-tie[x]);s.left=4;
 }
 function go(p){
  const s=S;if(s.phase!=='letter'||p!==s.picker||!s.pend)return false;
  s.letter=s.pend;s.pend='';sess.used.push(s.letter);sess.turn++;s.phase='start';s.left=2;
  s.aiAt=s.kinds.map(k=>k==='ai'?ANSWER_TIME-(28+AI_LV().wait+Math.floor(Math.random()*45)):-1);return true;
 }
 const startsOk=txt=>{const a=norm(txt);return !!a&&a[0]===S.letter.toLowerCase()};
 function aiAnswers(){const W=WORDS(),L=S.letter.toLowerCase();return COLS.map(c=>{const list=SRC[c].flatMap(k=>(W[k]||'').split('|')).filter(w=>norm(w)[0]===L);return list.length&&Math.random()<AI_LV().know?list[Math.floor(Math.random()*list.length)]:''})}
 // 0.3.3: nivel de la máquina (el del arcade): segundos de más o de menos antes de escribir, y cuántas palabras «se sabe»
 function AI_LV(){const lv=window.SudomiAILevel?SudomiAILevel():'normal';return lv==='easy'?{wait:30,know:.6}:lv==='hard'?{wait:-14,know:.95}:{wait:0,know:.8}}
 function stop(p,list){
  const s=S;if(s.phase!=='answer'||s.done[p])return false;
  const a=cleanN(list);if(!a.every(Boolean))return false;
  s.answers[p]=a;s.done[p]=true;s.stopBy=p;
  for(let q=0;q<s.n;q++)if(q!==p){s.answers[q]=cleanN(s.drafts[q]);s.snap[q]=s.kinds[q]==='ai'}
  s.phase='stopped';s.left=GRACE;return true;
 }
 // lo que escribe cada quien. Después del STOP solo se acepta una foto de cómo iba la hoja y, luego, la casilla que estaba escribiendo
 function setDraft(p,list,f){
  const s=S,a=cleanN(list);
  if(s.phase==='answer'&&!s.done[p]){s.drafts[p]=a;s.focus[p]=f>=0&&f<NC?f|0:-1;return false}
  if(s.phase==='stopped'&&p!==s.stopBy){
   if(!s.snap[p]){s.snap[p]=true;s.answers[p]=a;s.focus[p]=f>=0&&f<NC?f|0:-1}
   else if(s.focus[p]>=0)s.answers[p][s.focus[p]]=a[s.focus[p]];
  }
  return false;
 }
 function toVote(){
  const s=S;if(s.phase==='answer')for(let q=0;q<s.n;q++)s.answers[q]=cleanN(s.drafts[q]);
  s.done=s.done.map(()=>true);s.phase='vote';s.left=VOTE_TIME;s.kinds.forEach((k,p)=>{if(k==='ai')s.voted[p]=true});
 }
 function mark(voter,p,q){
  const s=S;if(s.phase!=='vote'||s.voted[voter]||voter===p||!(q>=0&&q<NC)||!(p>=0&&p<s.n))return false;
  const key=p+':'+q,list=s.marks[voter],i=list.indexOf(key);if(i>=0)list.splice(i,1);else list.push(key);return true;
 }
 function rejected(p,q){const s=S,voters=s.kinds.map((k,v)=>v!==p&&k!=='ai'?v:-1).filter(v=>v>=0);if(!voters.length)return false;return voters.filter(v=>s.marks[v].includes(p+':'+q)).length*2>voters.length}
 function score(){
  const s=S;s.rows=Array.from({length:s.n},()=>Array(NC).fill(0));
  for(let q=0;q<NC;q++){
   const ok=[];for(let p=0;p<s.n;p++)if(startsOk(s.answers[p][q])&&!rejected(p,q))ok.push(p);
   for(const p of ok)s.rows[p][q]=ok.some(o=>o!==p&&norm(s.answers[o][q])===norm(s.answers[p][q]))?5:10;
  }
  if(s.stopBy>=0){const p=s.stopBy;for(let q=0;q<NC;q++)if(!(startsOk(s.answers[p][q])&&!rejected(p,q)))s.rows[p][q]=-20}
  s.points=s.rows.map(r=>r.reduce((a,b)=>a+b,0));s.totals=s.totals.map((t,p)=>t+s.points[p]);
  s.hist.push({letter:s.letter,answers:s.answers.map(a=>a.slice()),points:s.points.slice(),stopBy:s.stopBy});
  s.phase='result';s.left=0;
 }
 function ready(p){const s=S;if(s.phase!=='vote'||s.voted[p])return false;s.voted[p]=true;if(s.voted.every(Boolean))score();return true}
 function next(){const s=S;if(s.phase!=='result')return false;if(s.round>=ROUNDS)s.phase='final';else{s.round++;toLetter()}return true}
 // una acción de un jugador; devuelve true si hay que volver a pintar
 function apply(p,m){
  const s=S;if(!s||!m)return false;
  if(m.t==='rps'){if(s.phase!=='rps'||s.reveal||p>1||s.rps[p]>=0||!(m.c>=0&&m.c<3))return false;s.rps[p]=m.c|0;rpsCheck();return true}
  if(m.t==='roll'){if(s.phase!=='dice'||sess.order||s.dice[p])return false;s.dice[p]=1+(Math.random()*6|0);diceCheck();return true}
  if(m.t==='pick'){if(s.phase!=='letter'||p!==s.picker)return false;const l=String(m.l||'');if(l&&(!LETTERS.includes(l)||sess.used.includes(l)))return false;s.pend=l;return true}
  if(m.t==='go')return go(p);
  if(m.t==='draft')return setDraft(p,m.a,m.f);
  if(m.t==='stop')return stop(p,m.a);
  if(m.t==='mark')return mark(p,m.p,m.q);
  if(m.t==='ready')return ready(p);
  return false;
 }
 // una vez por segundo. away = jugadores desconectados: la máquina decide por ellos lo que haga falta para no trabar la partida
 function tick(away){
  const s=S,auto=p=>s.kinds[p]==='ai'||away.includes(p);
  if(s.phase==='rps'){
   if(s.reveal){if(--s.left<=0){if(s.reveal.w<0){s.reveal=null;s.rps=s.rps.map(()=>-1)}else{sess.order=[s.reveal.w,1-s.reveal.w];toLetter()}}}
   else{[0,1].forEach(p=>{if(auto(p)&&s.rps[p]<0)s.rps[p]=Math.random()*3|0});rpsCheck()}
  }else if(s.phase==='dice'){
   if(sess.order){if(--s.left<=0)toLetter()}
   else{s.dice.forEach((d,p)=>{if(!d&&auto(p))s.dice[p]=1+(Math.random()*6|0)});diceCheck()}
  }else if(s.phase==='letter'){
   if(auto(s.picker)){if(!s.pend){const f=LETTERS.filter(l=>!sess.used.includes(l));s.pend=f[Math.random()*f.length|0]}else go(s.picker)}
  }else if(s.phase==='start'){if(--s.left<=0){s.phase='answer';s.left=ANSWER_TIME}}
  else if(s.phase==='answer'){
   s.left--;
   s.kinds.forEach((k,p)=>{if(k==='ai'&&!s.done[p]&&s.phase==='answer'&&s.left<=s.aiAt[p]){const a=aiAnswers(),have=s.drafts[p].filter(Boolean).length;if(a.filter(Boolean).length>have)s.drafts[p]=a;if(s.drafts[p].every(Boolean))stop(p,s.drafts[p])}});
   if(s.left<=0&&s.phase==='answer')toVote();
  }else if(s.phase==='stopped'){if(--s.left<=0)toVote()}
  else if(s.phase==='vote'){s.left--;away.forEach(p=>{s.voted[p]=true});if(s.left<=0||s.voted.every(Boolean))score()}
  s.seq++;
 }
 function viewFor(seat){
  const s=S,open=s.phase==='vote'||s.phase==='result'||s.phase==='final';
  return {n:s.n,names:s.names,kinds:s.kinds,phase:s.phase,round:s.round,picker:s.picker,letter:s.letter,pend:seat===s.picker?s.pend:'',used:sess.used.slice(),left:s.left,stopBy:s.stopBy,
   done:s.done,voted:s.voted,you:seat,order:sess.order,rps:{mine:s.rps[seat],has:s.rps.map(x=>x>=0),reveal:s.reveal},dice:s.dice,
   answers:open?s.answers:null,mine:s.answers[seat],myMarks:s.marks[seat]||[],markCount:open?s.answers.map((_,p)=>Array.from({length:NC},(_,q)=>s.marks.filter(m=>m.includes(p+':'+q)).length)):null,
   rows:s.rows,points:s.points,totals:s.totals,hist:s.hist.map(h=>({letter:h.letter,a:h.answers[seat],pts:h.points[seat],stop:h.stopBy===seat}))};
 }

 /* ================= 2. pantallas ================= */
 const P=()=>window.SudomiProfile;
 const aiNames=n=>window.SudomiAI?SudomiAI.random(n).map(x=>x[0]):[];
 const myName=()=>{let n=P()?P().name():'';return String(n||'').trim().slice(0,14)||'Jugador'};
 const myAvatar=()=>(P()&&P().avatar())||'🦊';
 const needProfile=fn=>{if(P()&&!P().get()){P().ensure(fn);return true}return false};
 const play=n=>{try{window.SudomiSound&&SudomiSound.play(n)}catch(_){}};
 let ui=null,mode=null,V=null,net=null,gsend=null,seats=[],size=2,roomCode='',clock=null,status='',offline=false,busy=false,showRules=false,screen='';
 let draft=Array(NC).fill(''),draftKey='',focus=-1,lockF=-1,snapKey='',lastKey='',lastPhase='',sendTimer=null;
 const $=sel=>ui.stage.querySelector(sel);
 function reset(){clearInterval(clock);clock=null;clearTimeout(sendTimer);if(net){try{net.close()}catch(_){}}net=null;gsend=null;S=null;V=null;seats=[];status='';roomCode='';offline=false;mode=null;busy=false;lastKey='';lastPhase='';screen='';sess={order:null,used:[],turn:0}}
 function open(opts){ui=opts;reset();ui.hub.classList.add('hidden');ui.stage.classList.remove('hidden')}
 function close(){if(!ui)return;reset()}
 function leave(){const u=ui;close();if(u){u.stage.innerHTML='';u.exit()}}

 /* ----- anfitrión / solo ----- */
 const publicSeats=()=>seats.map(x=>({name:x.name,kind:x.kind,away:!!x.away,avatar:x.avatar||''}));
 const awaySeats=()=>seats.map((x,i)=>x.kind==='human'&&x.away?i:-1).filter(i=>i>=0);
 function pushLobby(){seats.forEach(x=>{if(x.id&&x.id!=='host')net.send(x.id,{t:'lobby',classic:true,seats:publicSeats(),size,code:roomCode})})}
 function pushState(){
  if(net&&mode==='host')seats.forEach((x,i)=>{if(x.id&&x.id!=='host'&&!x.away)net.send(x.id,{t:'state',classic:true,v:viewFor(i),seats:publicSeats()})});
  V=viewFor(0);screen='game';render();
 }
 function startClock(){clearInterval(clock);clock=setInterval(()=>{if(!S||S.phase==='result'||S.phase==='final')return;tick(awaySeats());pushState()},1000)}
 function startGame(){
  let k=0;const pool=aiNames(12).filter(nm=>!seats.some(s=>s.name===nm));seats=seats.map(x=>x.kind==='open'?{name:pool[k++]||`IA ${k}`,kind:'ai'}:x);
  newGame(seats.map(x=>x.name),seats.map(x=>x.kind));startClock();pushState();
 }
 function solo(){mode='solo';seats=[{name:myName(),kind:'human',id:'host',avatar:myAvatar()},{name:aiNames(1)[0]||'Máquina',kind:'ai'}];startGame()}
 async function create(n){
  if(busy||needProfile(()=>create(n)))return;
  if(!window.SudomiParty){status='No se cargó el módulo de conexión.';screen='wait';render();return}
  busy=true;mode='host';size=n;status='Creando sala…';screen='wait';render();
  try{
   net=await SudomiParty.host('stop',onHostEvent);
   roomCode=net.code;seats=[{name:myName(),kind:'human',id:'host',avatar:myAvatar()}];for(let i=1;i<n;i++)seats.push({name:'',kind:'open'});
   status='';screen='lobby';
  }catch(err){mode=null;status=(err&&err.message)||'No se pudo crear la sala.'}
  busy=false;render();
 }
 function onHostEvent(e){
  if(mode!=='host')return;
  if(e.type==='join'){
   let i=seats.findIndex(x=>x.id===e.id);
   if(i>=0)seats[i].away=false;
   else if(S){i=seats.findIndex(x=>x.kind==='human'&&x.away&&x.id!=='host');if(i<0){net.reject(e.id,'La partida ya empezó.');return}seats[i].id=e.id;seats[i].away=false}
   else{
    i=seats.findIndex(x=>x.kind==='open');if(i<0){net.reject(e.id,'La sala ya está llena.');return}
    seats[i]={name:String((e.meta&&e.meta.name)||'').trim().slice(0,14)||'Jugador',kind:'human',id:e.id,avatar:P()&&e.meta&&P().validAvatar(e.meta.avatar)?e.meta.avatar:''};
   }
   if(S)pushState();else{pushLobby();render()}
   return;
  }
  const i=seats.findIndex(x=>x.id===e.id);if(i<0)return;
  if(e.type==='leave'||(e.type==='msg'&&e.data.t==='bye')){
   if(!S){seats[i]={name:'',kind:'open'};pushLobby();render()}
   else if(e.type==='msg'){seats[i]={name:seats[i].name+' (IA)',kind:'ai'};S.names[i]=seats[i].name;S.kinds[i]='ai';S.aiAt[i]=S.left-5;if(S.phase==='vote')S.voted[i]=true;pushState()}
   else{seats[i].away=true;pushState()}
   return;
  }
  if(e.type==='msg'&&S&&e.data.t==='c'&&apply(i,e.data.a))pushState();
 }
 function removeSeat(i){if(mode!=='host'||!seats[i]||seats[i].kind!=='open'||seats.length<=2)return;seats.splice(i,1);size=seats.length;pushLobby();render()}
 /* ----- invitado: stop-party.js abrió la conexión y nos la pasa ----- */
 function adopt(opts,send,code){ui=opts;reset();mode='guest';gsend=send;roomCode=code;screen='wait';status='Conectado. Esperando al anfitrión…'}
 function guest(e){
  if(mode!=='guest')return;
  if(e.type==='away')offline=true;else if(e.type==='back')offline=false;
  else if(e.type==='msg'){const d=e.data;if(d.t==='lobby'){seats=d.seats;size=d.size;screen='lobby';status=''}else if(d.t==='state'){V=d.v;seats=d.seats;screen='game'}}
  render();
 }
 /* ----- acciones de este teléfono ----- */
 function act(m){
  if(mode==='guest'){if(gsend&&!gsend({t:'c',a:m})){offline=true;render()}return}
  if(S&&apply(0,m))pushState();
 }
 function saveDraft(now){
  const m={t:'draft',a:draft.slice(),f:V&&V.phase==='stopped'?lockF:focus};
  if(mode==='guest'){clearTimeout(sendTimer);if(now)gsend&&gsend({t:'c',a:m});else sendTimer=setTimeout(()=>gsend&&gsend({t:'c',a:m}),350)}
  else if(S)apply(0,m);
 }

 /* ----- dibujo ----- */
 const avatar=i=>seats[i]&&seats[i].kind==='ai'?'🤖':seats[i]&&seats[i].avatar?seats[i].avatar:['🦊','🐼','🦉','🐯','🐸','🐵','🦄','🐙'][i%8];
 const head=sub=>`<div class="dos-head"><div><p>STOP · ${sub}</p><h2>STOP clásico</h2></div><div class="dos-actions"><button class="game-restart" id="scRules" aria-label="Reglas">?</button></div></div>`;
 const RULES=[['La hoja','Seis columnas: Nombre, Animal, Fruta o verdura, Ciudad o país, Cosa y Comida. Cinco rondas, una fila por ronda.'],
  ['Quién pone la letra','La primera vez se decide con piedra, papel o tijera (2 jugadores) o con dados (3 o más). Después se van turnando: en 1 contra 1 sigue quien perdió; con dados, el siguiente número más alto. Una letra no se repite en la misma sesión.'],
  ['La ronda','Quien puso la letra toca «Iniciar», a todos les sale ¡START! y escriben a la vez una palabra con esa letra en cada casilla. Hay 5 minutos como máximo.'],
  ['¡STOP!','Con las 6 casillas llenas puedes tocar ¡STOP! (está en la casilla «Total»). A los demás solo se les deja terminar la casilla que estaban escribiendo.'],
  ['Puntos','Todos ven las respuestas y pueden rechazar (❌) las que no aceptan. 10 puntos por respuesta válida que nadie más puso, 5 si otro puso la misma, 0 si está vacía, mal o rechazada. A quien dijo STOP, cada respuesta mala le quita 20.']];
 const rulesHTML=()=>showRules?`<div class="dos-over"><div class="dos-card"><h3>Reglas de STOP clásico</h3><dl>${RULES.map(([t,d])=>`<dt>${t}</dt><dd>${d}</dd>`).join('')}</dl><button class="arc-btn" id="scRulesClose">Cerrar</button></div></div>`:'';
 function bindCommon(){const r=$('#scRules');if(r)r.onclick=()=>{showRules=true;lastKey='';render()};const c=$('#scRulesClose');if(c)c.onclick=()=>{showRules=false;lastKey='';render()}}
 function inviteUrl(){const base=location.origin&&location.origin!=='null'?location.origin+location.pathname:location.href.split(/[?#]/)[0];return `${base}?game=stop&room=${roomCode}`}
 function render(){
  if(!ui||!mode)return;
  if(screen==='game'&&V)return renderGame();
  lastKey='';
  if(screen==='lobby'){
   const host=mode==='host';
   ui.stage.innerHTML=`<div class="mini-game dos sp sc">${head('SALA DE ESPERA')}<div id="lbRoot"></div>${rulesHTML()}</div>`;bindCommon();
   SudomiLobby.render($('#lbRoot'),{game:'stop',gameName:'STOP clásico',code:roomCode,url:inviteUrl(),host,fixed:false,
    seats:seats.map((x,i)=>({state:x.kind==='human'?(i===0&&host?'me':x.away?'away':'human'):x.kind==='ai'?'ai':'open',name:x.name,avatar:x.avatar||'🙂',sub:i===0?'Anfitrión':undefined})),
    extra:'<p class="pc-note">📝 Modo clásico: la hoja de 6 columnas, 5 rondas.</p>',
    startLabel:'▶ Empezar partida',canStart:seats.length>=2,onStart:host?startGame:undefined,onRemove:removeSeat,status:(status||'')+(offline?' · Sin conexión. Reconectando…':'')});
   return;
  }
  ui.stage.innerHTML=`<div class="mini-game dos sp sc">${head('ONLINE')}<p class="arc-wait big">${esc(status)}</p>${rulesHTML()}</div>`;bindCommon();
 }
 const chips=(v,on)=>`<div class="sp-chips">${v.names.map((n,i)=>`<span class="${on(i)?'ok':''} ${i===v.you?'me':''}"><i>${avatar(i)}</i>${esc(n)}${on(i)?' ✔':''}</span>`).join('')}</div>`;
 // la hoja: cabecera + una fila por ronda. La fila en juego lleva las casillas para escribir y el botón STOP en «Total»
 function sheet(v){
  const me=v.you,cur=v.round-1,writing=v.phase==='answer'||v.phase==='stopped',full=draft.every(x=>String(x).trim());
  const rows=Array.from({length:ROUNDS},(_,r)=>{
   const h=v.hist[r];
   if(h)return `<div class="sc-row past"><b class="sc-l">${h.letter}</b>${h.a.map((a,i)=>`<span class="sc-c" data-l="${COLS[i]}">${a?esc(a):'—'}</span>`).join('')}<em class="sc-sum">${h.a.filter(Boolean).map(esc).join(' · ')||'—'}</em><strong class="sc-t ${h.pts<0?'neg':''}">${h.stop?'🛑 ':''}${h.pts}</strong></div>`;
   if(r!==cur||v.phase==='rps'||v.phase==='dice')return `<div class="sc-row empty"><b class="sc-l"></b>${COLS.map(()=>'<span class="sc-c"></span>').join('')}<strong class="sc-t"></strong></div>`;
   const cells=COLS.map((c,i)=>writing&&!(v.phase==='answer'&&v.done[me])
     ?`<label class="sc-c" data-l="${c}"><input data-sc="${i}" maxlength="40" autocomplete="off" autocapitalize="words" spellcheck="false" placeholder="${v.letter}…" value="${esc(draft[i]||'')}" ${v.phase==='stopped'&&(i!==lockF||v.stopBy===me)?'disabled':''}></label>`
     :`<span class="sc-c" data-l="${c}">${v.phase==='vote'&&v.mine[i]?esc(v.mine[i]):''}</span>`).join('');
   const tot=v.phase==='answer'?`<button type="button" class="sc-stop" id="scStop" ${full?'':'disabled'}>¡STOP!</button>`:v.phase==='stopped'?'<span class="sc-wait">🛑</span>':v.phase==='vote'?'<span class="sc-wait">…</span>':'';
   return `<div class="sc-row cur"><b class="sc-l">${v.letter||'?'}</b>${cells}<strong class="sc-t">${tot}</strong></div>`;
  }).join('');
  return `<div class="sc-sheet"><div class="sc-title"><b>Jugamos <em>STOP</em> clásico</b><span>Ronda ${Math.min(v.round,ROUNDS)} de ${ROUNDS}</span></div>
   <div class="sc-row sc-head"><span>Letra</span>${COLS.map(c=>`<span>${c}</span>`).join('')}<span>Total</span></div>${rows}</div>`;
 }
 function renderGame(){
  const v=V,me=v.you;
  const key=JSON.stringify([v.phase,v.round,v.picker,v.letter,v.pend,v.done,v.voted,v.stopBy,v.rps,v.dice,v.order,v.myMarks,v.markCount,v.totals,showRules,offline,seats.map(s=>s.kind+s.away)]);
  if(key===lastKey){const t=$('#scTimer');if(t){t.textContent=v.left;const bar=$('#scBar');if(bar)bar.style.width=Math.max(0,Math.min(100,v.left/(v.phase==='vote'?VOTE_TIME:v.phase==='stopped'?GRACE:ANSWER_TIME)*100))+'%'}return}
  lastKey=key;
  const dk=v.round+':'+v.letter+':'+v.hist.length;if(draftKey!==dk){draftKey=dk;draft=Array(NC).fill('');focus=-1;lockF=-1;snapKey=''}
  // al llegar el STOP: se guarda qué casilla estaba escribiendo y se manda la hoja tal como iba
  if(v.phase==='stopped'&&snapKey!==dk){const ae=document.activeElement;if(ae&&ae.dataset&&ae.dataset.sc!=null&&ui.stage.contains(ae))focus=+ae.dataset.sc;snapKey=dk;lockF=v.stopBy===me?-1:focus;if(v.stopBy!==me)saveDraft(true)}
  if(v.phase!==lastPhase){if(v.phase==='start')play('bonus');if(v.phase==='stopped')play('bad');if(v.phase==='final'){const mx=Math.max(...v.totals);try{window.dispatchEvent(new CustomEvent('sudomi-arcade',{detail:{game:'stop',won:v.totals[me]===mx}}))}catch(_){}}lastPhase=v.phase}
  const sub=mode==='solo'?'CONTRA LA MÁQUINA':`ONLINE · ${v.n} JUGADORES`,pk=esc(v.names[v.picker]||'');
  const timer=total=>`<div class="stop-timer"><span><b id="scTimer">${v.left}</b> s</span><div class="bar"><i id="scBar" style="width:${Math.max(0,Math.min(100,v.left/total*100))}%"></i></div></div>`;
  let body='',fx='';
  if(v.phase==='rps'){
   const rv=v.rps.reveal;
   body=`<div class="sc-box"><h3>✊ ✋ ✌️ ¿Quién pone la primera letra?</h3>
    ${rv?`<div class="sc-duel">${[0,1].map(p=>`<div class="${rv.w===p?'win':''}"><i>${avatar(p)}</i><b>${esc(v.names[p])}</b><span>${RPS[p?rv.b:rv.a]}</span></div>`).join('<em>vs</em>')}</div><p class="arc-msg">${rv.w<0?'¡Empate! Otra vez…':`<b>${esc(v.names[rv.w])}</b> pone la primera letra`}</p>`
     :v.rps.mine>=0?`<p class="arc-wait big">Elegiste ${RPS[v.rps.mine]} ${RPSN[v.rps.mine]}.<br>Esperando a ${esc(v.names[1-me])}…</p>`
     :`<p class="arc-msg">Elige. Quien gane pone la primera letra.</p><div class="sc-rps">${RPS.map((e,c)=>`<button type="button" data-rps="${c}"><span>${e}</span><b>${RPSN[c]}</b></button>`).join('')}</div>`}</div>`;
  }else if(v.phase==='dice'){
   body=`<div class="sc-box"><h3>🎲 Los dados deciden el orden</h3><ul class="sc-dice">${(v.order||v.names.map((_,i)=>i)).map((p,k)=>`<li class="${p===me?'me':''}"><em>${v.order?(k+1)+'º':''}</em><i>${avatar(p)}</i><b>${esc(v.names[p])}</b><span>${v.dice[p]?'⚀⚁⚂⚃⚄⚅'[v.dice[p]-1]+' '+v.dice[p]:'…'}</span></li>`).join('')}</ul>
    ${v.order?`<p class="arc-msg">Empieza <b>${esc(v.names[v.order[0]])}</b>. Después siguen en ese orden.</p>`:v.dice[me]?'<p class="arc-wait">Esperando a los demás…</p>':'<div class="arc-actions"><button class="arc-btn big" id="scRoll">🎲 Tirar el dado</button></div>'}</div>`;
  }else if(v.phase==='letter'){
   body=(v.picker===me
    ?`<div class="sc-box"><h3>🔤 Te toca poner la letra</h3><div class="sc-keys">${LETTERS.map(l=>`<button type="button" data-let="${l}" class="${v.pend===l?'on':''}" ${v.used.includes(l)?'disabled':''}>${l}</button>`).join('')}</div>
      ${v.pend?`<div class="sc-go"><div class="stop-letter">${v.pend}</div><p>¿Iniciar la ronda con la <b>${v.pend}</b>?</p><div class="arc-actions"><button class="arc-btn big" id="scGo">▶ Sí, iniciar</button><button class="arc-btn alt" id="scChange">Cambiar</button></div></div>`:'<p class="arc-sub center">Las letras tachadas ya salieron en esta sesión.</p>'}</div>`
    :`<div class="sc-box"><p class="arc-wait big">✍️ <b>${pk}</b> está eligiendo la letra…</p></div>`)+sheet(v);
  }else if(v.phase==='start'){
   body=`<div class="stop-top"><div class="stop-letter">${v.letter}</div><p class="arc-sub">Letra de ${pk}</p></div>`+sheet(v);fx='<div class="sc-fx go"><b>¡START!</b></div>';
  }else if(v.phase==='answer'||v.phase==='stopped'){
   const st=v.phase==='stopped';
   body=`<div class="stop-top"><div class="stop-letter">${v.letter}</div>${timer(st?GRACE:ANSWER_TIME)}</div>
    ${st?`<p class="arc-msg sc-stopmsg">🛑 <b>${esc(v.names[v.stopBy])}</b> dijo STOP. ${v.stopBy===me?'Esperando a que los demás terminen su palabra…':lockF>=0?`Solo puedes terminar <b>${COLS[lockF]}</b>.`:'Tu hoja quedó como estaba.'}</p>`:v.done[me]?'':'<p class="arc-sub center">Llena las 6 casillas y toca <b>¡STOP!</b> en «Total».</p>'}
    ${sheet(v)}`;
   if(st)fx='<div class="sc-fx halt"><b>¡STOP!!!</b></div>';
  }else if(v.phase==='vote'){
   const L=v.letter.toLowerCase();
   body=`<div class="stop-top small"><div class="stop-letter">${v.letter}</div>${timer(VOTE_TIME)}</div>
    <p class="arc-msg">${v.voted[me]?'✔ Listo. Esperando a los demás…':'Toca las respuestas que <b>no aceptas</b> (❌). Cuando termines, toca <b>Listo</b>.'}</p>${chips(v,i=>v.voted[i])}
    <div class="sp-vote">${COLS.map((c,q)=>`<section><h4>${c}</h4>${v.names.map((n,p)=>{const a=v.answers[p][q],bad=a&&norm(a)[0]!==L,mine=v.myMarks.includes(p+':'+q),cnt=v.markCount[p][q];
      return `<button class="sp-ans ${!a?'empty':''} ${bad?'bad':''} ${mine?'no':''}" data-p="${p}" data-q="${q}" ${p===me||!a||bad||v.voted[me]?'disabled':''}><i>${avatar(p)}</i><b>${a?esc(a):'—'}</b>${bad?'<em>no empieza con '+v.letter+'</em>':cnt?`<em>❌ ${cnt}</em>`:''}</button>`}).join('')}</section>`).join('')}</div>
    ${v.voted[me]?'':'<div class="arc-actions"><button class="arc-btn big" id="scReady">Listo</button></div>'}`;
  }else{
   const fin=v.phase==='final',order=v.names.map((_,i)=>i).sort((a,b)=>v.totals[b]-v.totals[a]||v.points[b]-v.points[a]),last=v.round>=ROUNDS;
   const nextPk=v.order?v.names[v.order[(v.order.indexOf(v.picker)+1)%v.n]]:'';
   body=`${fin?`<div class="sc-box"><h3>🏆 ${order[0]===me?'¡Ganaste la partida!':'Ganó '+esc(v.names[order[0]])}</h3></div>`:`<div class="stop-top small"><div class="stop-letter">${v.letter}</div><p class="arc-sub">Ronda ${v.round} de ${ROUNDS} terminada${v.stopBy>=0?' · 🛑 STOP de '+esc(v.names[v.stopBy]):' · se acabó el tiempo'}</p></div>`}
    ${sheet(v)}
    <ol class="sp-rank">${order.map((p,k)=>`<li class="${p===me?'me':''}"><span>${k===0?'🏆':k+1}</span><i>${avatar(p)}</i><b>${esc(v.names[p])}</b><em class="${v.points[p]<0?'neg':''}">${fin?'':(v.points[p]>0?'+':'')+v.points[p]}</em><strong>${v.totals[p]}</strong></li>`).join('')}</ol>
    ${fin?'':`<details class="sp-detail"><summary>Ver respuestas y puntos</summary>${COLS.map((c,q)=>`<section><h4>${c}</h4>${v.names.map((n,p)=>`<p><i>${avatar(p)}</i><span>${v.answers[p][q]?esc(v.answers[p][q]):'—'}</span><b class="${v.rows[p][q]>0?'pts':v.rows[p][q]<0?'neg':'zero'}">${v.rows[p][q]>0?'+'+v.rows[p][q]:v.rows[p][q]}</b></p>`).join('')}</section>`).join('')}</details>`}
    <div class="arc-actions">${mode==='guest'?`<p class="arc-sub center">${fin?'El anfitrión puede empezar otra partida.':'El anfitrión pasa a la siguiente ronda.'}</p>`
     :fin?'<button class="arc-btn big" id="scAgain">↻ Jugar otra partida</button>':`<button class="arc-btn big" id="scNext">${last?'Ver resultado final':'Siguiente ronda'}</button>`}</div>
    ${fin||last?'':`<p class="arc-sub center">La próxima letra la pone <b>${esc(nextPk)}</b>.</p>`}`;
  }
  ui.stage.innerHTML=`<div class="mini-game dos sp sc">${head(sub)}${offline?'<p class="arc-alert">Sin conexión. Reconectando…</p>':''}${body}${fx}${rulesHTML()}</div>`;
  bindCommon();
  ui.stage.querySelectorAll('[data-rps]').forEach(b=>b.onclick=()=>act({t:'rps',c:+b.dataset.rps}));
  const rl=$('#scRoll');if(rl)rl.onclick=()=>act({t:'roll'});
  ui.stage.querySelectorAll('[data-let]').forEach(b=>b.onclick=()=>act({t:'pick',l:b.dataset.let}));
  const g=$('#scGo');if(g)g.onclick=()=>act({t:'go'});const ch=$('#scChange');if(ch)ch.onclick=()=>act({t:'pick',l:''});
  ui.stage.querySelectorAll('[data-sc]').forEach(inp=>{
   const i=+inp.dataset.sc;
   inp.oninput=()=>{draft[i]=inp.value;if(V.phase==='answer')focus=i;saveDraft();const sb=$('#scStop');if(sb)sb.disabled=!draft.every(x=>String(x).trim())};
   inp.onfocus=()=>{if(V.phase==='answer'){focus=i;saveDraft()}};
   inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();const nx=V.phase==='answer'&&$(`[data-sc="${i+1}"]`);if(nx)nx.focus();else inp.blur()}};
  });
  const want=v.phase==='answer'?focus:v.phase==='stopped'?lockF:-1;
  if(want>=0){const el=$(`[data-sc="${want}"]`);if(el&&!el.disabled){el.focus();const n=el.value.length;try{el.setSelectionRange(n,n)}catch(_){}}}
  const sb=$('#scStop');if(sb)sb.onclick=()=>{if(!draft.every(x=>String(x).trim()))return;focus=-1;act({t:'stop',a:draft.slice()})};
  ui.stage.querySelectorAll('.sp-ans:not(:disabled)').forEach(b=>b.onclick=()=>act({t:'mark',p:+b.dataset.p,q:+b.dataset.q}));
  const rd=$('#scReady');if(rd)rd.onclick=()=>act({t:'ready'});
  const nx=$('#scNext');if(nx)nx.onclick=()=>{if(next())pushState()};
  const ag=$('#scAgain');if(ag)ag.onclick=()=>{newGame(seats.map(x=>x.name),seats.map(x=>x.kind));startClock();pushState()};
 }

 window.SudomiStopClasico={open,close,solo,create,adopt,guest,leave,active:()=>!!mode,playing:()=>!!V&&screen==='game'&&V.phase!=='final',_state:()=>S,_view:()=>V,_sess:()=>sess,_ev:e=>onHostEvent(e),_net:()=>net};
})();
