/* SUDOMI 0.2.97 — BATALLA NAVAL nueva (window.SudomiNaval). Sustituye a la antigua clase Fleet de js/other-games.js.
 * Se abre con SudomiNaval.open({hub,stage,exit}, 'pve' | 'pvp' | 'online' | 'join', código)  (ver openNaval en other-games.js).
 *
 * DOS MODOS (MODES): «Clásico» 10×10 y «Táctico» 12×12, donde cada barco tiene una habilidad (AB).
 * En los dos, cada turno se eligen hasta SHOTS casillas y se pulsa «Disparar». Quien recibe el ataque ve SU tablero con las siluetas
 * de sus barcos y el aviso de quién lo ataca. Agua = salpicadura; barco = llama que se queda en la casilla.
 *
 * ESTADO COMPLETO (G, solo lo tiene quien manda la partida): fleets[jugador] = barcos {k,len,r,c,v}, shots[jugador] = disparos RECIBIDOS
 * (0 nada · 1 agua · 2 tocado), scan[jugador] = lo que su sonar descubrió del rival, cd[jugador] = turnos que faltan para cada habilidad.
 * A LA PANTALLA solo llega viewFor(jugador): su flota, lo que ha disparado, y del rival únicamente los barcos ya hundidos.
 * Así, en una sala online, el invitado nunca recibe dónde están los barcos del anfitrión.
 * FLUJO: run() (async) coloca flotas y lleva los turnos; espera a cada persona con ask(jugador) y la pantalla responde con act(acción).
 * ONLINE: js/party-net.js + sala de js/lobby.js, 2 jugadores, manda el anfitrión; el invitado envía {t:'act',a} y recibe {t:'v',v}. */
(()=>{
 const SHOTS=3,GAME='fleet',NAME='Batalla naval',ABC='ABCDEFGHIJKL';
 const MODES={classic:{n:'Clásico',N:10,d:'Tablero 10×10 · 3 disparos por turno'},tactic:{n:'Táctico',N:12,d:'Tablero 12×12 · 3 disparos y cada barco tiene una habilidad'}};
 const SHIPS=[{k:'carrier',n:'Portaaviones',len:5,col:'#ffa77f'},{k:'battle',n:'Acorazado',len:4,col:'#f58a98'},{k:'destroyer',n:'Destructor',len:3,col:'#a9a3e0'},{k:'sub',n:'Submarino',len:3,col:'#9db88a'},{k:'boat',n:'Lancha',len:2,col:'#a3a3a3'}];
 // habilidades del modo Táctico. cd = turnos de espera después de usarla; pick = hay que tocar una casilla del tablero rival
 const AB={
  sub:{n:'Sonar',e:'📡',cd:3,pick:true,d:'Toca una casilla: el submarino escanea el área de 3×3 a su alrededor y marca dónde hay barcos.'},
  battle:{n:'Andanada',e:'💥',cd:3,pick:true,d:'Toca una casilla: el acorazado dispara a un bloque de 2×2.'},
  carrier:{n:'Ataque aéreo',e:'✈️',cd:4,pick:true,d:'Toca una casilla: los aviones bombardean 5 casillas seguidas de esa fila.'},
  destroyer:{n:'Torpedo',e:'🚀',cd:4,pick:true,d:'Toca una fila: el torpedo la recorre de izquierda a derecha y le da al primer barco que encuentre.'},
  boat:{n:'Maniobra',e:'🧭',cd:0,pick:false,d:'Mueve la lancha una casilla (una vez por turno, y solo mientras no la hayan tocado).'}
 };
 const DIR={u:[-1,0],d:[1,0],l:[0,-1],r:[0,1]};
 const esc=t=>String(t).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const clean=n=>String(n||'').replace(/[<>&"']/g,'').replace(/\s+/g,' ').trim().slice(0,14);
 const P=()=>window.SudomiProfile,myName=()=>(P()&&P().name&&P().name())||'Jugador 1',myAvatar=()=>(P()&&P().avatar&&P().avatar())||'🙂';
 let ui=null,G=null,V=null,token=0,umode='pve';
 let sel=[],abil=null,forceBoard=null,draft=null,pick=-1,prev={key:'',cells:null},lastTurnKey='';
 const waits=new Map();let overSent=false,resShown=false;
 const net={role:'solo',room:null,conn:null,code:'',seats:[],me:0,started:false,status:'',tok:0};
 const setup={mode:'classic',noTouch:false};
 const $=s=>ui.stage.querySelector(s);
 function play(n){try{window.SudomiSound&&SudomiSound.play(n)}catch(_){}if(net.role==='host'&&net.room&&net.seats[1]&&net.seats[1].id)net.room.send(net.seats[1].id,{t:'snd',n})}

 /* ================= motor ================= */
 const cellsOf=(s,N)=>Array.from({length:s.len},(_,k)=>s.v?(s.r+k)*N+s.c:s.r*N+s.c+k);
 const inside=(s,N)=>s.r>=0&&s.c>=0&&(s.v?s.r+s.len<=N&&s.c<N:s.c+s.len<=N&&s.r<N);
 // 0.3.12: regla opcional «los barcos no pueden tocarse» (noTouch): entonces tampoco vale quedar pegado a otro barco, ni en diagonal
 let noTouch=false;
 const near=(a,b,N)=>Math.abs((a/N|0)-(b/N|0))<=1&&Math.abs(a%N-b%N)<=1;
 function fits(fleet,s,N,skip){if(!inside(s,N))return false;const mine=cellsOf(s,N);return !fleet.some((o,k)=>k!==skip&&cellsOf(o,N).some(i=>mine.some(m=>noTouch?near(m,i,N):m===i)))}
 function randomFleet(N){
  const f=[];
  for(const S of SHIPS){for(let t=0;t<2000;t++){const s={k:S.k,len:S.len,v:Math.random()<.5,r:Math.random()*N|0,c:Math.random()*N|0};if(fits(f,s,N,-1)){f.push(s);break}}}
  return f;
 }
 const validFleet=(f,N)=>Array.isArray(f)&&f.length===SHIPS.length&&SHIPS.every((S,k)=>f[k]&&f[k].k===S.k&&f[k].len===S.len&&Number.isInteger(f[k].r)&&Number.isInteger(f[k].c))&&f.every((s,k)=>fits(f,s,N,k));
 const shipAt=(p,i)=>G.fleets[p].find(s=>cellsOf(s,G.N).includes(i));
 const isHit=(p,s)=>cellsOf(s,G.N).some(i=>G.shots[p][i]===2);
 const isSunk=(p,s)=>cellsOf(s,G.N).every(i=>G.shots[p][i]===2);
 const alive=p=>G.fleets[p].filter(s=>!isSunk(p,s)).length;
 const nm=p=>G.seats[p].name;
 const auto=p=>G.seats[p].kind==='ai'||!!G.seats[p].away;
 const abReady=(p,k)=>{const s=G.fleets[p].find(x=>x.k===k);return !!s&&!isSunk(p,s)&&!(G.cd[p][k]>0)};
 function canMove(p,d){
  const k=G.fleets[p].findIndex(s=>s.k==='boat'),s=G.fleets[p][k];if(!s||isHit(p,s)||!DIR[d])return null;
  const ns={...s,r:s.r+DIR[d][0],c:s.c+DIR[d][1]};
  if(!fits(G.fleets[p],ns,G.N,k)||cellsOf(ns,G.N).some(i=>G.shots[p][i]))return null;   // tampoco puede esconderse en una casilla donde ya dispararon
  return {k,ns};
 }
 function newGame(mode,seats,local){
  const N=MODES[mode].N,z=()=>Array(N*N).fill(0);noTouch=!!setup.noTouch;
  G={mode,N,seats,local:!!local,fleets:[[],[]],shots:[z(),z()],scan:[z(),z()],cd:[{},{}],ready:[false,false],turn:0,phase:'setup',used:[false,false],moved:[false,false],msg:'',over:false,winner:null,turnNo:0,noTouch:!!setup.noTouch,sim:!local,locked:[false,false],plan:[[],[]],queued:[null,null],pm:['','']};
 }
 // lo que puede ver el jugador v
 function viewFor(v){
  const f=1-v;
  return {mode:G.mode,N:G.N,noTouch:G.noTouch,me:v,turn:G.turn,phase:G.phase,over:G.over,winner:G.winner,msg:G.pm[v]||G.msg,local:G.local,sim:G.sim,locked:G.locked.slice(),plan:G.plan[v],turnNo:G.turnNo,
   names:G.seats.map(s=>s.name),avatars:G.seats.map(s=>s.avatar),away:G.seats.map(s=>!!s.away),ready:G.ready.slice(),
   fleet:G.fleets[v].map(s=>({...s,sunk:isSunk(v,s),hit:isHit(v,s)})),foe:G.fleets[f].filter(s=>isSunk(f,s)||G.over).map(s=>({...s,sunk:isSunk(f,s)})),
   inc:G.shots[v],out:G.shots[f],scan:G.scan[v],cd:G.cd[v],used:G.used[v],moved:G.moved[v],
   left:[0,1].map(p=>G.fleets[p].length?alive(p):SHIPS.length),moves:G.mode==='tactic'&&G.phase==='aim'&&(G.sim?!G.locked[v]:G.turn===v)&&!G.moved[v]?Object.keys(DIR).filter(d=>canMove(v,d)):[]};
 }
 // quién mira este teléfono: -1 = nadie (cortina de «pasa el dispositivo»)
 const viewer=()=>net.role!=='solo'?net.me:umode==='pve'?0:G.phase==='pass'?-1:G.turn;
 function push(){
  if(!G)return;
  if(net.role==='host'&&net.room&&net.seats[1]&&net.seats[1].id&&net.started)net.room.send(net.seats[1].id,{t:'v',v:viewFor(1)});
  const v=viewer();V=v<0?{...viewFor(G.turn),curtain:true}:viewFor(v);draw();
 }
 const sleep=(ms,t)=>new Promise(res=>setTimeout(()=>res(t===token),ms));
 const ask=p=>new Promise(res=>waits.set(p,res));
 function submit(p,a){const r=waits.get(p);if(!r)return false;waits.delete(p);r(a);return true}
 function shotOn(def,i){if(G.shots[def][i])return null;const s=shipAt(def,i);G.shots[def][i]=s?2:1;return {i,hit:!!s,sunk:s&&isSunk(def,s)?s:null}}
 const at=(i,N)=>ABC[i/N|0]+(i%N+1);
 // dispara las casillas una por una (se ve cada salpicadura o llama) y mira si la partida terminó
 async function shoot(p,cells,t){
  const f=1-p;G.phase='fire';
  for(const i of cells){
   const r=shotOn(f,i);if(!r)continue;
   G.msg=`${nm(p)} disparó a ${at(i,G.N)}: ${r.hit?'¡TOCADO!':'agua'}`;play(r.hit?'bad':'pop');push();
   if(!await sleep(620,t))return false;
   if(r.sunk){G.msg=`💥 ¡${nm(p)} hundió ${r.sunk.k==='boat'?'la':'el'} ${SHIPS.find(S=>S.k===r.sunk.k).n.toLowerCase()} de ${nm(f)}!`;play('bonus');push();if(!await sleep(950,t))return false}
   if(alive(f)===0){if(G.sim)return true;G.over=true;G.winner=p;G.phase='over';G.msg=`🏆 ¡${nm(p)} hundió toda la flota de ${nm(f)}!`;play('win');push();try{window.SudomiFX&&SudomiFX.confetti&&SudomiFX.confetti()}catch(_){}return true}
  }
  return true;
 }
 // el sonar marca en scan[p] el área de 3×3 alrededor de la casilla i; devuelve cuántas casillas con barco encontró
 function sonar(p,i){
  const f=1-p,N=G.N,r=i/N|0,c=i%N;let n=0;
  for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){const rr=r+dr,cc=c+dc;if(rr<0||cc<0||rr>=N||cc>=N)continue;const j=rr*N+cc;if(G.shots[f][j])continue;const s=shipAt(f,j);G.scan[p][j]=s?2:1;if(s)n++}
  return n;
 }
 async function ability(p,a,t){
  const f=1-p,N=G.N,i=Math.max(0,Math.min(N*N-1,a.i|0)),r=i/N|0,c=i%N,cl=(v,m)=>Math.max(0,Math.min(m,v));
  if(a.k==='sub'){
   const n=sonar(p,i);
   G.phase='fire';G.msg=`📡 Sonar de ${nm(p)} en ${at(i,N)}: ${n?n+(n===1?' contacto':' contactos'):'nada'}`;play('tap');push();return await sleep(1300,t);
  }
  if(a.k==='battle'){const r0=cl(r,N-2),c0=cl(c,N-2);G.msg=`💥 Andanada de ${nm(p)}`;return await shoot(p,[r0*N+c0,r0*N+c0+1,(r0+1)*N+c0,(r0+1)*N+c0+1],t)}
  if(a.k==='carrier'){const c0=cl(c-2,N-5);G.msg=`✈️ Ataque aéreo de ${nm(p)}`;return await shoot(p,[0,1,2,3,4].map(k=>r*N+c0+k),t)}
  if(a.k==='destroyer'){
   G.phase='fire';G.msg=`🚀 Torpedo de ${nm(p)} por la fila ${ABC[r]}…`;play('tap');push();if(!await sleep(900,t))return false;
   for(let cc=0;cc<N;cc++){const j=r*N+cc;if(G.shots[f][j]!==2&&shipAt(f,j))return await shoot(p,[j],t)}
   G.msg=`🚀 El torpedo recorrió la fila ${ABC[r]} y no encontró nada`;push();return await sleep(1000,t);
  }
  return true;
 }
 /* ---- la computadora ---- */
 function aiTargets(p,n){
  const f=1-p,N=G.N,sc=[],lv=window.SudomiAILevel?SudomiAILevel():'normal';
  // 0.3.3: nivel de la máquina. Fácil = casi al azar. Difícil = además cuenta en cuántas posiciones posibles de los barcos que quedan cabe cada casilla
  let den=null;
  if(lv==='hard'){den=Array(N*N).fill(0);for(const sh of G.fleets[f]){if(isSunk(f,sh))continue;for(const v of [false,true])for(let r=0;r<N;r++)for(let c=0;c<N;c++){const t={len:sh.len,v,r,c};if(!inside(t,N))continue;const cs=cellsOf(t,N);if(cs.some(i=>G.shots[f][i]===1))continue;cs.forEach(i=>den[i]++)}}}
  for(let i=0;i<N*N;i++){
   if(G.shots[f][i])continue;
   let s=lv==='easy'?Math.random()*30:Math.random()*4+(((i/N|0)+i%N)%2?0:5)+(den?den[i]*.6:0);
   if(G.scan[p][i]===2)s+=100;else if(G.scan[p][i]===1)s-=100;
   const r=i/N|0,c=i%N;
   [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(([rr,cc])=>{if(rr<0||cc<0||rr>=N||cc>=N)return;const j=rr*N+cc;if(G.shots[f][j]===2){const sh=shipAt(f,j);if(sh&&!isSunk(f,sh))s+=lv==='easy'?12:40}});
   sc.push([s,i]);
  }
  return sc.sort((a,b)=>b[0]-a[0]).slice(0,n).map(x=>x[1]);
 }
 async function aiAction(p,t){
  if(!await sleep(1100,t))return null;
  if(G.mode==='tactic'){
   if(!G.moved[p]&&Math.random()<.3){const d=Object.keys(DIR).sort(()=>Math.random()-.5).find(x=>canMove(p,x));if(d)return {t:'move',d}}
   if(!G.used[p]){const ks=['carrier','battle','destroyer','sub'].filter(k=>abReady(p,k));if(ks.length&&Math.random()<.55)return {t:'ab',k:ks[Math.random()*ks.length|0],i:aiTargets(p,1)[0]||0}}
  }
  return {t:'fire',cells:aiTargets(p,SHOTS)};
 }
 /* ---- 0.2.99: RONDAS SIMULTÁNEAS (G.sim: contra la máquina y online; en el mismo teléfono se sigue por turnos) ----
  * Los dos eligen a la vez sus casillas y «fijan» el ataque; quien fija espera al otro. Con los dos fijados se disparan los dos ataques
  * (primero el del jugador 0, luego el del 1) y solo al final se mira quién ganó: si las dos flotas se hunden en la misma ronda es empate (winner −1).
  * En Táctico, mientras eliges: la maniobra y el sonar son inmediatos y secretos (pm = mensaje privado); las habilidades de ataque quedan en queued y salen con tus disparos. */
 function aiPlan(p){
  if(G.mode==='tactic'){
   if(Math.random()<.3){const d=Object.keys(DIR).sort(()=>Math.random()-.5).find(x=>canMove(p,x)),m=d&&canMove(p,d);if(m){G.fleets[p][m.k]=m.ns;G.moved[p]=true}}
   const ks=['carrier','battle','destroyer','sub'].filter(k=>abReady(p,k));
   if(ks.length&&Math.random()<.55){const k=ks[Math.random()*ks.length|0],i=aiTargets(p,1)[0]||0;G.used[p]=true;G.cd[p][k]=AB[k].cd;if(k==='sub')sonar(p,i);else G.queued[p]={k,i}}
  }
  G.plan[p]=aiTargets(p,SHOTS);G.locked[p]=true;
 }
 async function planOf(p,t){
  const f=1-p,N=G.N;
  for(;;){
   if(auto(p)){if(!await sleep(900+Math.random()*1200,t))return;if(!auto(p))continue;aiPlan(p);push();return}
   const a=await ask(p);if(t!==token)return;if(!a||a.t==='auto')continue;
   if(a.t==='move'){if(G.mode==='tactic'&&!G.moved[p]){const m=canMove(p,a.d);if(m){G.fleets[p][m.k]=m.ns;G.moved[p]=true;G.pm[p]='🧭 Moviste tu lancha';push()}}continue}
   if(a.t==='ab'){
    if(G.mode==='tactic'&&!G.used[p]&&AB[a.k]&&AB[a.k].pick&&abReady(p,a.k)){
     const i=Math.max(0,Math.min(N*N-1,a.i|0));G.used[p]=true;G.cd[p][a.k]=AB[a.k].cd;
     if(a.k==='sub'){const n=sonar(p,i);G.pm[p]=`📡 Sonar en ${at(i,N)}: ${n?n+(n===1?' contacto':' contactos'):'nada'}`}
     else{G.queued[p]={k:a.k,i};G.pm[p]=`${AB[a.k].e} ${AB[a.k].n} lista en ${at(i,N)}: saldrá junto con tus disparos`}
     push();
    }
    continue;
   }
   if(a.t==='fire'){const cells=[...new Set(a.cells||[])].filter(i=>Number.isInteger(i)&&i>=0&&i<N*N&&!G.shots[f][i]).slice(0,SHOTS);if(!cells.length)continue;G.plan[p]=cells;G.locked[p]=true;push();return}
  }
 }
 async function simRound(t){
  G.turnNo++;G.phase='aim';G.locked=[false,false];G.plan=[[],[]];G.queued=[null,null];G.used=[false,false];G.moved=[false,false];G.pm=['',''];G.msg='';
  [0,1].forEach(p=>Object.keys(G.cd[p]).forEach(k=>{if(G.cd[p][k]>0)G.cd[p][k]--}));
  push();
  await Promise.all([0,1].map(p=>planOf(p,t)));if(t!==token||!G)return false;
  G.pm=['',''];
  for(const p of [0,1]){
   G.turn=p;G.phase='fire';
   if(G.queued[p]&&!await ability(p,G.queued[p],t))return false;
   if(!await shoot(p,G.plan[p],t))return false;
   if(!await sleep(650,t))return false;
  }
  const d0=alive(0)===0,d1=alive(1)===0;
  if(d0||d1){
   G.over=true;G.phase='over';G.winner=d0&&d1?-1:d0?1:0;
   G.msg=G.winner<0?'🤝 ¡Empate! Las dos flotas se hundieron en la misma ronda':`🏆 ¡${nm(G.winner)} hundió toda la flota de ${nm(1-G.winner)}!`;
   play('win');push();try{window.SudomiFX&&SudomiFX.confetti&&SudomiFX.confetti()}catch(_){}
  }
  return true;
 }
 async function run(t){
  // 1) cada quien coloca su flota
  const place=(p,a)=>{G.fleets[p]=a&&validFleet(a.ships,G.N)?a.ships.map(s=>({k:s.k,len:s.len,r:s.r,c:s.c,v:!!s.v})):randomFleet(G.N);G.ready[p]=true};
  G.phase='setup';
  if(net.role==='host'){push();await Promise.all([0,1].map(p=>(auto(p)?Promise.resolve(null):ask(p)).then(a=>{if(t!==token)return;place(p,a);push()})));if(t!==token)return}
  else if(!G.local){G.fleets[1]=randomFleet(G.N);G.ready[1]=true;push();const a=await ask(0);if(t!==token)return;place(0,a)}
  else{
   G.turn=0;push();let a=await ask(0);if(t!==token)return;place(0,a);
   G.turn=1;G.phase='pass';push();await ask(1);if(t!==token)return;
   G.phase='setup';push();a=await ask(1);if(t!==token)return;place(1,a);
   G.turn=0;G.phase='pass';push();await ask(0);if(t!==token)return;
  }
  G.turn=0;
  if(G.sim){while(G&&!G.over&&t===token){if(!await simRound(t))return}return}
  // 2) turnos (solo en el mismo teléfono)
  while(G&&!G.over&&t===token){
   const p=G.turn,f=1-p;
   G.turnNo++;G.phase='aim';G.used[p]=false;G.moved[p]=false;Object.keys(G.cd[p]).forEach(k=>{if(G.cd[p][k]>0)G.cd[p][k]--});
   G.msg='';push();
   for(;;){
    const a=auto(p)?await aiAction(p,t):await ask(p);if(t!==token)return;if(!a||a.t==='auto')continue;
    if(a.t==='move'){if(G.mode==='tactic'&&!G.moved[p]){const m=canMove(p,a.d);if(m){G.fleets[p][m.k]=m.ns;G.moved[p]=true;G.msg=`🧭 ${nm(p)} movió su lancha`;play('tap');push()}}continue}
    if(a.t==='ab'){if(G.mode==='tactic'&&!G.used[p]&&AB[a.k]&&AB[a.k].pick&&abReady(p,a.k)){G.used[p]=true;G.cd[p][a.k]=AB[a.k].cd;if(!await ability(p,a,t))return;if(G.over)break;G.phase='aim';push()}continue}
    if(a.t==='fire'){const cells=[...new Set(a.cells||[])].filter(i=>Number.isInteger(i)&&i>=0&&i<G.N*G.N&&!G.shots[f][i]).slice(0,SHOTS);if(!cells.length)continue;if(!await shoot(p,cells,t))return;break}
   }
   if(G.over)break;
   if(!await sleep(700,t))return;
   G.turn=f;
   if(G.local){G.phase='pass';push();await ask(f);if(t!==token)return}
  }
 }

 /* ================= dibujo ================= */
 // 0.3.16: barcos VISTOS DESDE ARRIBA (antes de lado), dentro de una caja de 10 por cada casilla. Cada dibujo es una función del largo w.
 const DK='fill="#1c2a3f" stroke="none" opacity=".5"';
 const hull=w=>`<path d="M1 5.100Q2.500 1.900 7 1.900H${w-5}Q${w-1.300} 2.200 ${w-.6} 5.100Q${w-1.300} 8 ${w-5} 8.300H7Q2.500 8.300 1 5.100Z"/>`;
 const gun=x=>`<circle cx="${x}" cy="5.100" r="1.600" ${DK}/><path d="M${x} 5.100h3.200" stroke="#1c2a3f" stroke-width=".7" fill="none" opacity=".6"/>`;
 const SIL={
  carrier:w=>`<path d="M1.500 2.100H${w-6}L${w-1} 5.100L${w-6} 8.100H1.500Z"/><path d="M5 5.100H${w-9}" stroke="#fff" stroke-width=".55" stroke-dasharray="2.200 1.600" fill="none"/><rect x="${w*.56}" y="2.500" width="5.500" height="1.700" rx=".5" ${DK}/>`,
  battle:w=>hull(w)+gun(w*.24)+gun(w*.5)+gun(w*.74),
  destroyer:w=>hull(w)+gun(w*.3)+`<rect x="${w*.46}" y="3.700" width="4" height="2.800" rx=".6" ${DK}/>`+gun(w*.72),
  sub:w=>`<rect x="1.500" y="2.700" width="${w-3}" height="4.800" rx="2.400"/><ellipse cx="${w*.45}" cy="5.100" rx="2.800" ry="1.300" ${DK}/><path d="M${w*.45} 5.100h4" stroke="#1c2a3f" stroke-width=".6" fill="none" opacity=".6"/>`,
  boat:w=>hull(w)+`<rect x="${w*.34}" y="3.500" width="${w*.3}" height="3.200" rx=".7" ${DK}/>`
 };
 function sil(s){const S=SHIPS.find(x=>x.k===s.k),w=s.len*10,inner=`<g fill="${S.col}" stroke="#1c2a3f" stroke-width=".45" stroke-linejoin="round">${SIL[s.k](w)}</g>`;
  // la caja se recorta a la altura real del dibujo (de 1 a 9.2) para que el barco llene bien su casilla
  return s.v?`<svg viewBox="0.8 0 8.2 ${w}" preserveAspectRatio="none" aria-hidden="true"><g transform="translate(10 0) rotate(90)">${inner}</g></svg>`:`<svg viewBox="0 1 ${w} 8.2" preserveAspectRatio="none" aria-hidden="true">${inner}</svg>`}
 const pc=(v,N)=>(v/N*100).toFixed(3)+'%';
 const head=()=>`<div class="dos-head"><div><h2>${NAME}</h2></div><div class="dos-actions"><button class="game-restart" id="nvRules" aria-label="Reglas">?</button></div></div>`;
 function rulesHTML(){return `<h3>Batalla naval</h3><ul>
  <li>Cada jugador esconde <b>5 barcos</b>: portaaviones (5 casillas), acorazado (4), destructor (3), submarino (3) y lancha (2).</li>
  <li>Los dos jugadores eligen <b>al mismo tiempo</b> sus <b>${SHOTS} casillas</b> del mar rival y tocan <b>🔒 Fijar ataque</b>. Quien fija primero espera al otro; con los dos fijados, salen los dos ataques. Agua salpica; un barco tocado se queda <b>en llamas</b>.</li><li>Si las dos flotas se hunden en la misma ronda, es <b>empate</b>.</li><li>En el <b>mismo dispositivo</b> se juega por turnos: eliges, tocas <b>🔥 Disparar</b> y pasas el aparato.</li>
  <li>Mientras te atacan ves <b>tu flota</b> y el aviso de quién te está disparando.</li>
  <li>Gana quien hunda los 5 barcos del rival.</li></ul>
  <h3>Modo Táctico (12×12)</h3><p>Además de tus ${SHOTS} disparos puedes usar <b>una habilidad por turno</b> (y mover la lancha). Cada habilidad necesita que su barco siga a flote, y descansa unos turnos después de usarla. Cuando los dos eligen a la vez, el sonar y la maniobra se hacen al momento y en secreto; las habilidades de ataque salen junto con tus disparos.</p>
  <ul>${Object.keys(AB).map(k=>`<li>${AB[k].e} <b>${AB[k].n}</b> (${SHIPS.find(S=>S.k===k).n.toLowerCase()}${AB[k].cd?`, espera ${AB[k].cd} turnos`:''}): ${AB[k].d}</li>`).join('')}</ul>`}
 function sheet(html){const s=document.createElement('div');s.className='pc-sheet';s.innerHTML=`<div class="pc-sheet-in">${html}<button class="arc-btn" type="button" data-close>Entendido</button></div>`;s.onclick=e=>{if(e.target===s||e.target.closest('[data-close]'))s.remove()};const r=$('.nv');if(r)r.appendChild(s)}
 function renderMenu(){
  stop();leaveNet();
  const online=umode==='online';
  ui.stage.innerHTML=`<div class="mini-game nv">${head()}<div class="nv-menu">${net.status?`<p class="pc-note bad">${esc(net.status)}</p>`:''}
   <div class="pc-hero">🚢<b>${NAME}</b><span>Esconde tu flota, elige tres casillas y fija tu ataque: los dos disparan a la vez. Hunde los cinco barcos del rival.</span></div>
   <div class="pc-opt"><b>Modo de juego</b><div class="nv-modes">${Object.keys(MODES).map(k=>`<button type="button" data-m="${k}" class="${k===setup.mode?'on':''}"><b>${MODES[k].n}</b><small>${MODES[k].d}</small></button>`).join('')}</div></div>
   <label class="nv-check"><input type="checkbox" id="nvTouch" ${setup.noTouch?'checked':''}><span>Los barcos no pueden tocarse</span></label>
   <div class="nv-fleetrow">${SHIPS.map(S=>`<span>${sil({k:S.k,len:S.len,v:false})}<small>${S.n} · ${S.len}</small></span>`).join('')}</div>
   <button class="arc-btn pc-big" id="nvStart">${online?'🌐 Crear sala':'▶ Jugar'}</button></div></div>`;
  net.status='';$('#nvRules').onclick=()=>sheet(rulesHTML());
  ui.stage.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{setup.mode=b.dataset.m;ui.stage.querySelectorAll('[data-m]').forEach(x=>x.classList.toggle('on',x===b))});
  $('#nvTouch').onchange=e=>{setup.noTouch=e.target.checked};
  $('#nvStart').onclick=online?createRoom:startLocal;
 }
 function startLocal(){
  stop();
  const ai=[['Almirante Pavel','🦉'],['Capitana Cristal','🐼'],['Capitán Harly','🦊']][Math.random()*3|0];
  const seats=umode==='pve'?[{kind:'human',name:myName(),avatar:myAvatar()},{kind:'ai',name:ai[0],avatar:ai[1]}]:[{kind:'human',name:myName(),avatar:myAvatar()},{kind:'human',name:'Jugador 2',avatar:'😎'}];
  newGame(setup.mode,seats,umode==='pvp');build(G.N);run(++token);
 }
 function build(N){
  const cols=Array.from({length:N},(_,c)=>`<i>${c+1}</i>`).join(''),rows=Array.from({length:N},(_,r)=>`<i>${ABC[r]}</i>`).join('');
  const cells=Array.from({length:N*N},(_,i)=>`<button type="button" class="nv-cell" data-i="${i}" aria-label="${at(i,N)}"></button>`).join('');
  ui.stage.innerHTML=`<div class="mini-game nv">${head()}
   <div class="nv-seats" id="nvSeats"></div>
   <div class="nv-alert" id="nvAlert" role="status"></div>
   <div class="nv-tabs" id="nvTabs"><button type="button" data-b="foe">🎯 Mar rival</button><button type="button" data-b="mine">🚢 Mi flota</button></div>
   <div class="nv-case" id="nvCase"><div class="nv-board" style="--n:${N}"><span class="nv-corner"></span><div class="nv-cols">${cols}</div><div class="nv-rows">${rows}</div><div class="nv-sea" id="nvSea">${cells}<div class="nv-ships" id="nvShips"></div></div></div></div>
   <div class="nv-pass hidden" id="nvPass"></div>
   <div class="nv-ctrl" id="nvCtrl"></div>
   <p class="nv-msg" id="nvMsg"></p></div>`;
  $('#nvRules').onclick=()=>sheet(rulesHTML());
  ui.stage.querySelectorAll('#nvTabs [data-b]').forEach(b=>b.onclick=()=>{forceBoard=b.dataset.b;draw()});
  ui.stage.querySelectorAll('.nv-cell').forEach(b=>b.onclick=()=>tapCell(+b.dataset.i));
  // 0.2.98: al colocar la flota los barcos se ARRASTRAN con el dedo o el ratón, y el botón ↻ de su esquina los gira
  const sea=$('#nvSea');let dg=null;
  const cellAt=e=>{const b=sea.getBoundingClientRect(),cl=v=>Math.max(0,Math.min(N-1,Math.floor(v*N)));return cl((e.clientY-b.top)/b.height)*N+cl((e.clientX-b.left)/b.width)};
  const placing=()=>!!V&&V.phase==='setup'&&!!draft&&!V.ready[V.me]&&!V.curtain;
  sea.addEventListener('pointerdown',e=>{
   if(!placing())return;
   const rb=e.target.closest('.nv-rot');if(rb){e.preventDefault();rotate(+rb.dataset.k);return}
   const i=cellAt(e),k=draft.findIndex(s=>cellsOf(s,N).includes(i));dg={i,k,moved:false,dr:0,dc:0};
   if(k>=0){const s=draft[k];dg.dr=(i/N|0)-s.r;dg.dc=i%N-s.c;pick=k;try{sea.setPointerCapture(e.pointerId)}catch(_){}draw()}
  });
  sea.addEventListener('pointermove',e=>{
   if(!dg||dg.k<0||!placing())return;const i=cellAt(e);if(i===dg.i&&!dg.moved)return;
   const s=draft[dg.k],ns={...s,r:(i/N|0)-dg.dr,c:i%N-dg.dc};dg.moved=true;
   ns.r=Math.max(0,Math.min(ns.v?N-s.len:N-1,ns.r));ns.c=Math.max(0,Math.min(ns.v?N-1:N-s.len,ns.c));
   if((ns.r!==s.r||ns.c!==s.c)&&fits(draft,ns,N,dg.k)){draft[dg.k]=ns;draw()}
  });
  sea.addEventListener('pointerup',()=>{dg=null});sea.addEventListener('pointercancel',()=>{dg=null});
  overSent=false;resShown=false;sel=[];abil=null;forceBoard=null;draft=null;pick=-1;prev={key:'',cells:null};lastTurnKey='';
 }
 function act(a){if(net.role==='guest'){if(net.conn)net.conn.send({t:'act',a});return}const v=viewer();if(v>=0)submit(v,a)}
 // qué tablero se enseña: en tu turno el mar rival; cuando te atacan, tu flota
 const boardShown=()=>V.phase==='setup'?'mine':forceBoard||(!V.over&&(V.sim&&V.phase==='aim'||V.turn===V.me)?'foe':'mine');
 // ¿puedo elegir casillas ahora? por turnos: es mi turno; en rondas simultáneas: todavía no he fijado mi ataque
 const aimingNow=()=>!!V&&V.phase==='aim'&&!V.over&&(V.sim?!V.locked[V.me]:V.turn===V.me);
 // gira un barco de la flota que se está colocando; si de pie/acostado no cabe en su sitio, lo corre unas casillas hasta que quepa
 function rotate(k){
  if(!draft||!V||k<0||!draft[k])return;const N=V.N,s=draft[k];
  for(let d=0;d<s.len;d++){const ns={...s,v:!s.v};if(ns.v){ns.r=Math.max(0,Math.min(N-s.len,s.r-d))}else{ns.c=Math.max(0,Math.min(N-s.len,s.c-d))}
   if(fits(draft,ns,N,k)){draft[k]=ns;break}}
  pick=k;try{window.SudomiSound&&SudomiSound.play('tap')}catch(_){}draw();
 }
 function tapCell(i){
  if(!V||V.curtain)return;const N=V.N;
  if(V.phase==='setup'){
   if(!draft||V.ready[V.me])return;
   const k=draft.findIndex(s=>cellsOf(s,N).includes(i));
   if(k>=0){pick=k;draw();return}
   if(pick>=0){const s=draft[pick],ns={...s,r:i/N|0,c:i%N};if(ns.v)ns.r=Math.min(ns.r,N-s.len);else ns.c=Math.min(ns.c,N-s.len);if(fits(draft,ns,N,pick)){draft[pick]=ns;draw()}}
   return;
  }
  if(!aimingNow()||boardShown()!=='foe')return;
  if(abil&&AB[abil].pick){const k=abil;abil=null;act({t:'ab',k,i});return}
  if(V.out[i])return;
  const j=sel.indexOf(i);if(j>=0)sel.splice(j,1);else if(sel.length<SHOTS)sel.push(i);else{sel.shift();sel.push(i)}
  try{window.SudomiSound&&SudomiSound.play('tap')}catch(_){}draw();
 }
 function draw(){
  if(!V||!ui||!$('#nvSea'))return;
  if(V.over&&!overSent&&!V.local){overSent=true;try{window.dispatchEvent(new CustomEvent('sudomi-arcade',{detail:{game:'fleet',won:V.winner===V.me}}))}catch(_){}}   /* 0.3.2: avisa el resultado a logros y estadísticas */
  const N=V.N,me=V.me,foe=1-me,sim=!!V.sim,aiming=aimingNow(),myTurn=sim?aiming||(V.phase==='fire'&&V.turn===me):V.turn===me&&!V.over,tk=V.turnNo+':'+V.turn+':'+(V.phase==='fire');
  if(!aiming){sel=[];abil=null}
  if(lastTurnKey!==tk){lastTurnKey=tk;forceBoard=null}
  if(V.phase==='setup'&&!draft&&!V.ready[me]){draft=randomFleet(N);pick=-1}
  if(V.phase!=='setup')draft=null;
  // cortina de «pasa el dispositivo»
  const pass=$('#nvPass'),cs=$('#nvCase');
  if(V.curtain){
   pass.innerHTML=`<span>🔒</span><h3>Pasa el dispositivo</h3><p>Le toca a <b>${esc(V.names[V.turn])}</b>. Que nadie más mire la pantalla.</p><button class="arc-btn pc-big" type="button" id="nvReady">Soy ${esc(V.names[V.turn])}: estoy listo</button>`;
   pass.classList.remove('hidden');cs.classList.add('hidden');$('#nvTabs').classList.add('hidden');$('#nvCtrl').innerHTML='';$('#nvAlert').textContent='';$('#nvMsg').textContent='';
   $('#nvReady').onclick=()=>submit(G.turn,{t:'ready'});drawSeats();return;
  }
  pass.classList.add('hidden');cs.classList.remove('hidden');
  const show=boardShown(),data=show==='foe'?V.out:V.inc,ships=V.phase==='setup'?(draft||V.fleet):show==='foe'?V.foe:V.fleet;
  cs.dataset.b=show;$('#nvTabs').classList.toggle('hidden',V.phase==='setup');
  ui.stage.querySelectorAll('#nvTabs [data-b]').forEach(b=>b.classList.toggle('on',b.dataset.b===show));
  // casillas: agua, llamas, selección, sonar; lo que acaba de cambiar lleva su efecto
  const key=show+':'+(V.phase==='setup'?'s':'g'),same=prev.key===key&&prev.cells;
  ui.stage.querySelectorAll('.nv-cell').forEach(e=>{
   const i=+e.dataset.i,v=V.phase==='setup'?0:data[i];
   e.classList.toggle('miss',v===1);e.classList.toggle('hit',v===2);
   e.classList.toggle('sel',show==='foe'&&(sel.includes(i)||(sim&&V.phase==='aim'&&V.locked[me]&&V.plan.includes(i))));
   e.classList.toggle('scan2',show==='foe'&&!v&&V.scan[i]===2);e.classList.toggle('scan1',show==='foe'&&!v&&V.scan[i]===1);
   if(same&&v&&!prev.cells[i]){const c=v===2?'fx-boom':'fx-splash';e.classList.remove('fx-boom','fx-splash');void e.offsetWidth;e.classList.add(c);setTimeout(()=>e.classList.remove(c),1100)}
  });
  prev={key,cells:V.phase==='setup'?Array(N*N).fill(0):data.slice()};
  $('#nvShips').innerHTML=ships.map((s,k)=>`<div class="nv-ship${s.sunk?' sunk':''}${V.phase==='setup'&&k===pick?' pick':''}" style="left:${pc(s.c,N)};top:${pc(s.r,N)};width:${pc(s.v?1:s.len,N)};height:${pc(s.v?s.len:1,N)}">${sil(s)}${V.phase==='setup'&&draft&&!V.ready[me]?`<button type="button" class="nv-rot" data-k="${k}" aria-label="Girar">↻</button>`:''}</div>`).join('');
  cs.classList.toggle('setup',V.phase==='setup'&&!!draft&&!V.ready[me]);
  drawSeats();
  // aviso de arriba
  const al=$('#nvAlert');let txt='',cls='';
  if(V.over){txt=V.winner<0?'🤝 ¡Empate!':V.winner===me?'🏆 ¡Ganaste la batalla!':`💀 Ganó ${V.names[V.winner]}`;cls=V.winner<0?'':V.winner===me?'win':'danger'}
  else if(sim&&V.phase==='aim')txt=aiming?`🎯 Elige ${SHOTS} casillas y fija tu ataque`:`🔒 Ataque fijado. Esperando a ${V.names[foe]}…`;
  else if(V.phase==='setup')txt=V.ready[me]?`Esperando a ${V.names[foe]}…`:`${V.local?V.names[me]+': c':'C'}oloca tu flota`;
  else if(myTurn)txt=V.phase==='fire'?'¡Fuego!':`🎯 ${V.local?V.names[me]:'Tu turno'}: elige ${SHOTS} casillas y dispara`;
  else{txt=`⚠️ ${V.names[foe]} está atacando tu flota`;cls='danger'}
  al.textContent=txt;al.className='nv-alert '+cls;
  $('#nvMsg').textContent=V.msg||'';
  drawCtrl(show,aiming);
  // 0.3.11: pantalla de resultado común (js/result.js), una vez por partida
  if(V.over&&!resShown&&window.SudomiResult){
   resShown=true;const w=V.winner,mine=!V.local&&w===me;
   SudomiResult.show($('.nv'),{kind:w<0?'draw':V.local||mine?'win':'lose',game:'BATALLA NAVAL',title:w<0?'¡Empate!':mine?'¡Ganaste la batalla!':'Ganó '+V.names[w],sub:V.msg||'',
    again:net.role==='guest'?null:()=>net.role==='host'?startOnline():startLocal(),exit:()=>{const u=ui;close();u.stage.innerHTML='';u.exit()},
    share:mine?'Gané una Batalla naval en SUDOMI. ¡Juega conmigo!':'Jugué Batalla naval en SUDOMI. ¡Juega conmigo!'});
  }
 }
 function drawSeats(){
  $('#nvSeats').innerHTML=[0,1].map(p=>`<div class="nv-seat${(V.sim&&V.phase==='aim'?!V.locked[p]:V.turn===p)&&!V.over&&V.phase!=='setup'?' turn':''}"><span>${esc(V.avatars[p])}</span><b>${esc(V.names[p])}${net.role!=='solo'&&p===V.me?' (tú)':''}</b><i>${V.away[p]?'📴 ':''}${V.sim&&V.phase==='aim'&&V.locked[p]&&!V.over?'🔒 ':''}🚢 ${V.left[p]}/${SHIPS.length}</i></div>`).join('');
 }
 function drawCtrl(show,myTurn){
  const c=$('#nvCtrl'),N=V.N,me=V.me;
  if(V.over){c.innerHTML=net.role==='guest'?'<p class="nv-hint">Esperando a que el anfitrión empiece otra partida…</p>':'<button class="arc-btn pc-big" type="button" id="nvAgain">↻ Jugar otra vez</button>';const b=$('#nvAgain');if(b)b.onclick=()=>net.role==='host'?startOnline():startLocal();return}
  if(V.phase==='setup'){
   if(V.ready[me]){c.innerHTML='<p class="nv-hint">Tu flota está lista.</p>';return}
   c.innerHTML=`<div class="nv-row"><button class="arc-btn ghost" type="button" id="nvRand">🎲 Al azar</button><button class="arc-btn" type="button" id="nvDone">✅ Listo</button></div><p class="nv-hint">Arrastra cada barco a donde lo quieras. El botón ↻ de su esquina lo pone de pie o acostado.</p>`;
   $('#nvRand').onclick=()=>{draft=randomFleet(N);pick=-1;draw()};
   $('#nvDone').onclick=()=>{const ships=draft;pick=-1;act({t:'place',ships})};return;
  }
  if(!myTurn){c.innerHTML=V.sim&&V.phase==='aim'&&V.locked[me]?`<p class="nv-hint">🔒 Tu ataque está fijado: <b>${V.plan.map(i=>at(i,N)).join(', ')}</b>. Cuando ${esc(V.names[1-me])} fije el suyo, disparan los dos.</p>`:'';return}
  let h='';
  if(V.mode==='tactic'){
   h+=`<div class="nv-abs">${Object.keys(AB).map(k=>{const s=V.fleet.find(x=>x.k===k),dead=!s||s.sunk,cd=V.cd[k]||0,off=k==='boat'?dead||s.hit||V.moved||!V.moves.length:dead||cd>0||V.used;
    return `<button type="button" class="nv-ab${abil===k?' on':''}" data-ab="${k}" ${off?'disabled':''} title="${esc(AB[k].d)}"><span>${AB[k].e}</span><b>${AB[k].n}</b>${dead?'<i>hundido</i>':cd>0?`<i>${cd} t</i>`:''}</button>`}).join('')}</div>`;
   if(abil==='boat')h+=`<div class="nv-row nv-arrows">${[['l','⬅️'],['u','⬆️'],['d','⬇️'],['r','➡️']].map(([d,e])=>`<button type="button" class="arc-btn ghost" data-mv="${d}" ${V.moves.includes(d)?'':'disabled'}>${e}</button>`).join('')}</div>`;
   if(abil)h+=`<p class="nv-hint">${esc(AB[abil].d)}</p>`;
  }
  h+=`<div class="nv-row"><span class="nv-count">${Array.from({length:SHOTS},(_,k)=>`<i class="${k<sel.length?'on':''}"></i>`).join('')}</span><button class="arc-btn nv-fire" type="button" id="nvFire" ${sel.length&&show==='foe'?'':'disabled'}>${V.sim?'🔒 Fijar ataque':'🔥 Disparar'}${sel.length?' ('+sel.map(i=>at(i,N)).join(', ')+')':''}</button></div>`;
  c.innerHTML=h;
  $('#nvFire').onclick=()=>{if(!sel.length)return;const cells=sel.slice();sel=[];act({t:'fire',cells})};
  c.querySelectorAll('[data-ab]').forEach(b=>b.onclick=()=>{const k=b.dataset.ab;abil=abil===k?null:k;if(abil&&AB[abil].pick)forceBoard='foe';if(abil==='boat')forceBoard='mine';draw()});
  c.querySelectorAll('[data-mv]').forEach(b=>b.onclick=()=>{abil=null;act({t:'move',d:b.dataset.mv})});
 }

 /* ================= sala online (2 jugadores) ================= */
 const pubSeats=()=>net.seats.map(s=>({kind:s.kind,name:s.name,avatar:s.avatar,away:!!s.away}));
 function inviteUrl(){const base=location.origin&&location.origin!=='null'?location.origin+location.pathname:location.href.split(/[?#]/)[0];return `${base}?game=${GAME}&room=${net.code}`}
 function pushLobby(){if(net.role!=='host')return;const s=net.seats[1];if(s&&s.id&&net.room)net.room.send(s.id,{t:'lobby',seats:pubSeats(),code:net.code,mode:setup.mode});if(!net.started)renderLobby()}
 function renderLobby(){
  if(!ui)return;const host=net.role==='host',mode=host?setup.mode:net.mode||'classic';
  ui.stage.innerHTML=`<div class="mini-game nv">${head()}<div id="lbRoot"></div></div>`;$('#nvRules').onclick=()=>sheet(rulesHTML());
  if(!window.SudomiLobby){$('#lbRoot').textContent=net.status||'Creando sala…';return}
  SudomiLobby.render($('#lbRoot'),{game:GAME,gameName:NAME,code:net.code||null,url:net.code?inviteUrl():'',host,fixed:true,
   seats:net.seats.map((s,k)=>({state:k===net.me&&s.kind==='human'?'me':s.kind==='open'?'open':s.kind==='ai'?'ai':s.away?'away':'human',name:s.name,avatar:s.avatar})),
   extra:`<p class="pc-note">Modo ${MODES[mode].n}: ${MODES[mode].d}</p>`,
   startLabel:'▶ Empezar la batalla',canStart:!!net.code,onStart:host?startOnline:undefined,
   onAI:i=>{if(!host||net.started||!net.seats[i]||net.seats[i].kind!=='open')return;Object.assign(net.seats[i],{kind:'ai',name:'Almirante Pavel',avatar:'🦉'});pushLobby()},
   status:net.status,hint:host?'Comparte el código o invita a un amigo. Si nadie entra, juega la IA.':''});
 }
 async function createRoom(){
  if(P()&&P().get&&!P().get()){P().ensure(()=>createRoom());return}
  if(!window.SudomiParty){net.status='Este navegador no puede crear salas.';return renderMenu()}
  const my=++net.tok;Object.assign(net,{role:'host',code:'',started:false,status:'',me:0,room:null});
  net.seats=[{kind:'human',id:'host',name:myName(),avatar:myAvatar()},{kind:'open'}];renderLobby();
  try{const room=await SudomiParty.host(GAME,onHost);if(my!==net.tok){room.close();return}net.room=room;net.code=room.code;renderLobby()}
  catch(e){if(my!==net.tok)return;net.role='solo';net.status=(e&&e.message)||'No se pudo crear la sala.';renderMenu()}
 }
 function onHost(e){
  if(net.role!=='host')return;const s=net.seats[1];
  if(e.type==='join'){
   if(s.id===e.id){s.away=false;if(G)G.seats[1].away=false}
   else if(s.kind!=='open'||net.started){net.room.reject(e.id,net.started?'La partida ya empezó.':'La sala está llena.');return}
   else Object.assign(s,{kind:'human',id:e.id,name:clean((e.meta||{}).n)||'Amigo',avatar:String((e.meta||{}).a||'🙂').slice(0,4)});
   pushLobby();if(net.started&&G){net.room.send(e.id,{t:'start',mode:G.mode});push()}
  }else if(e.type==='leave'){
   if(s.id!==e.id)return;
   if(!net.started){net.seats[1]={kind:'open'};pushLobby();return}
   s.away=true;if(G){G.seats[1].away=true;submit(1,{t:'auto'});push()}   // mientras no vuelva, juega la IA por él
  }else if(e.type==='msg'&&s.id===e.id&&G&&e.data&&e.data.t==='act')submit(1,e.data.a);
 }
 function startOnline(){
  if(net.role!=='host'||!net.room)return;
  if(net.seats[1].kind==='open')Object.assign(net.seats[1],{kind:'ai',name:'Almirante Pavel',avatar:'🦉'});
  net.started=true;stop();newGame(setup.mode,net.seats.map(s=>({kind:s.kind,name:s.name,avatar:s.avatar,away:!!s.away})),false);
  if(net.seats[1].id)net.room.send(net.seats[1].id,{t:'start',mode:G.mode});
  build(G.N);run(++token);
 }
 function joinRoom(code){
  if(P()&&P().get&&!P().get()){P().ensure(()=>joinRoom(code));return}
  if(!window.SudomiParty){net.status='Este navegador no puede entrar a salas.';umode='online';return renderMenu()}
  stop();leaveNet();
  const my=++net.tok;Object.assign(net,{role:'guest',code:SudomiParty.normCode(code),started:false,status:'Conectando con la sala…',seats:[],me:1});renderLobby();
  net.conn=SudomiParty.join(GAME,code,{n:myName(),a:myAvatar()},e=>{if(my===net.tok)onGuest(e)});
 }
 function onGuest(e){
  if(e.type==='open'){net.status='';if(!net.started)renderLobby();return}
  if(e.type==='away'){net.status='Se perdió la conexión. Reconectando…';if(!net.started)renderLobby();else if($('#nvMsg'))$('#nvMsg').textContent=net.status;return}
  if(e.type==='back'){net.status='';return}
  if(e.type==='closed'){const m=e.message||'La sala se cerró.';stop();leaveNet();net.status=m;umode='online';renderMenu();return}
  if(e.type!=='msg')return;const d=e.data||{};
  if(d.t==='lobby'){net.seats=d.seats;net.code=d.code||net.code;net.mode=d.mode;if(!net.started)renderLobby()}
  else if(d.t==='start'){net.started=true;V=null;build(MODES[d.mode]?MODES[d.mode].N:10)}
  else if(d.t==='v'){if(!net.started||!$('#nvSea')||(V&&V.N!==d.v.N)||(V&&V.over&&!d.v.over)){net.started=true;build(d.v.N)}V=d.v;noTouch=!!V.noTouch;draw()}
  else if(d.t==='snd'){try{window.SudomiSound&&SudomiSound.play(d.n)}catch(_){}}
 }
 function leaveNet(){net.tok++;if(net.room){try{net.room.close()}catch(_){}}if(net.conn){try{net.conn.close()}catch(_){}}Object.assign(net,{role:'solo',room:null,conn:null,code:'',seats:[],started:false,me:0})}
 function stop(){token++;G=null;V=null;const p=[...waits.values()];waits.clear();p.forEach(r=>r(null))}
 function close(){stop();leaveNet();net.status=''}
 function open(opts,m,code){
  ui=opts;ui.hub.classList.add('hidden');ui.stage.classList.remove('hidden');
  if(m==='join'){umode='online';joinRoom(code);return}
  umode=m==='pvp'||m==='online'?m:'pve';renderMenu();
 }
 window.SudomiNaval={open,close,join:code=>joinRoom(code),_state:()=>G,_view:()=>V,_net:()=>net,_act:act,_ev:e=>onHost(e)};
})();
