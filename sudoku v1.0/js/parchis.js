/* SUDOMI 0.2.87 — PARCHÍS (window.SudomiParchis). De 2 a 4 jugadores: contra la máquina, varias personas en el mismo teléfono, o SALA ONLINE.
 * Se abre desde «Otros juegos» con SudomiParchis.open({hub,stage,exit}, 'pve' | 'pvp' | 'online' | 'join', código) (ver openParchis en js/other-games.js).
 *
 * TABLERO (dibujo del dueño): 68 casillas numeradas, 4 pasillos de color y 4 casas redondas. Se dibuja en un lienzo de 22×22 unidades:
 *   esquinas de 7×7 (las casas), brazos de 8 casillas, y cada brazo con 3 carriles de 8/3 de ancho.
 *   · Las LÍNEAS DE COLOR (pasillos, salidas, aros de las casas y triángulos del centro) son fijas.
 *   · En el círculo de cada casa va la FOTO DE PERFIL del jugador (capa HTML encima del SVG, para que js/avatar-art.js pueda poner las fotos).
 *   · Todo lo demás (fondo, casillas, líneas, números, seguros) sale de un TEMA: ver THEMES. Para agregar un tema basta una entrada nueva ahí.
 *
 * POSICIÓN de una ficha (g.pos[color][i]): -1 en casa · 0…63 en el anillo (0 = su salida) · 64…70 en su pasillo · 71 en la meta.
 * DOS DADOS (0.2.87): ruedan sobre el tablero (animDice). Cada dado se usa por separado; g.dice = valores, g.used = cuáles ya se usaron,
 *   g.opts = [{d: índice del dado (-1 = contar 10/20), moves}] = lo que puede hacer el jugador de turno. Reglas: ver rulesHTML().
 * ONLINE: manda el anfitrión (js/party-net.js + sala de js/lobby.js). Solo él corre run(); a los invitados les llega una copia del estado
 *   ({t:'s'}) en cada cambio y el aviso {t:'roll'} para que vean rodar los mismos dados. El invitado solo envía {t:'roll'} y {t:'pick',i,d}.
 * El motor (tryMove / legal / run) no toca la pantalla; renderGame()/place()/update() solo dibujan. */
(()=>{
 const L=8/3,X1=7+L,X2=7+2*L;
 const COLORS=[
  {id:'y',name:'Amarillo',hex:'#ffcc00',ink:'#5b4300',start:5,nest:[18.6,18.6],goal:[11,12.7]},
  {id:'b',name:'Azul',hex:'#003399',ink:'#fff',start:22,nest:[18.6,3.4],goal:[12.7,11]},
  {id:'r',name:'Rojo',hex:'#ff0000',ink:'#fff',start:39,nest:[3.4,3.4],goal:[11,9.3]},
  {id:'g',name:'Verde',hex:'#00dd00',ink:'#063b06',start:56,nest:[3.4,18.6],goal:[9.3,11]}
 ];
 const SAFE=new Set([5,12,17,22,29,34,39,46,51,56,63,68]),RING_LAST=63,GOAL=71;
 const ORDER={2:[0,2],3:[0,1,2],4:[0,1,2,3]};
 /* ---- temas: solo cambian lo que NO es línea de color ---- */
 const THEMES={
  clasico:{name:'Clásico',bg:'#ffffff',cell:'#ffffff',line:'#111111',num:'#111111',safe:'#6b3500',nest:'#ffffff'},
  noche:{name:'Noche',bg:'#0f1626',cell:'#1b2740',line:'#6f83a8',num:'#c9d6ee',safe:'#f0d27a',nest:'#0f1626'},
  madera:{name:'Madera',bg:'#e9c891',cell:'#f6e2bd',line:'#6a4317',num:'#4a2c0c',safe:'#6a4317',nest:'#f6e2bd'}
 };
 const TKEY='sudomi-parchis-theme',GAME='parchis';
 const AI=[['Pavel','🦉'],['Cristal','🐼'],['Harly','🦊'],['Maicol','🐧'],['Edwin','🐸'],['Carmelis','🐰']];
 const esc=t=>String(t).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const clean=n=>String(n||'').replace(/[<>&"']/g,'').replace(/\s+/g,' ').trim().slice(0,14);
 const P=()=>window.SudomiProfile;
 const myName=()=>(P()&&P().name&&P().name())||'Jugador 1',myAvatar=()=>(P()&&P().avatar&&P().avatar())||'🙂';
 let ui=null,g=null,token=0,mode='pve',waiting=null,selDie=0,rollTok=0,rolling=false;
 const net={role:'solo',room:null,conn:null,code:'',seats:[],me:0,started:false,status:'',tok:0};
 const setup={n:4,theme:(()=>{try{const t=localStorage.getItem(TKEY);return THEMES[t]?t:'clasico'}catch(_){return 'clasico'}})()};
 const $=s=>ui.stage.querySelector(s);
 function play(n){try{window.SudomiSound&&SudomiSound.play(n)}catch(_){}if(net.role==='host')bcast({t:'snd',n})}

 /* ================= motor ================= */
 const ringSq=(c,p)=>((COLORS[c].start-1+p)%68)+1;
 const keyOf=(c,p)=>p<0?'n'+c:p<=RING_LAST?'r'+ringSq(c,p):p<GOAL?'c'+c+'-'+(p-RING_LAST):'g'+c;
 function at(key){const o=[];for(const c of g.players)g.pos[c].forEach((p,i)=>{if(keyOf(c,p)===key)o.push({c,i})});return o}
 // una jugada posible de la ficha i, o null. bonus = se está contando 10 o 20 (con eso no se puede salir de casa)
 function tryMove(c,i,k,bonus){
  const p=g.pos[c][i];if(p===GOAL)return null;
  if(p<0){
   if(bonus||k!==5)return null;
   const occ=at('r'+COLORS[c].start);
   if(occ.length<2)return {c,i,from:-1,to:0,capture:null};
   if(occ.every(o=>o.c===c))return null;                                // mi propia barrera tapa la salida
   return {c,i,from:-1,to:0,capture:occ.filter(o=>o.c!==c).pop()};      // salida ocupada: me como una ficha rival
  }
  const t=p+k;if(t>GOAL)return null;
  let capture=null;
  for(let q=p+1;q<=t;q++){
   if(q===GOAL)break;
   const occ=at(keyOf(c,q)),ring=q<=RING_LAST;
   if(ring&&occ.length===2&&occ[0].c===occ[1].c)return null;            // barrera: nadie pasa
   if(q===t){
    if(occ.length>=2)return null;                                       // casilla llena
    if(ring&&occ.length===1&&occ[0].c!==c&&!SAFE.has(ringSq(c,q)))capture=occ[0];
   }
  }
  return {c,i,from:p,to:t,capture};
 }
 // breakBarrier: con pareja, la primera jugada tiene que abrir una barrera propia si hay alguna que se pueda mover
 function legal(c,k,bonus,breakBarrier){
  let m=[];for(let i=0;i<4;i++){const x=tryMove(c,i,k,bonus);if(x)m.push(x)}
  if(!bonus&&k===5){const out=m.filter(x=>x.from<0);if(out.length)return out}                      // con 5 es obligatorio sacar ficha
  if(!bonus&&breakBarrier){const br=m.filter(x=>x.from>=0&&x.from<=RING_LAST&&at(keyOf(c,x.from)).filter(o=>o.c===c).length===2);if(br.length)return br}
  return m;
 }
 // la computadora: puntúa cada jugada y elige la mejor
 function danger(c,p){   // ¿cuántas fichas rivales tienen esta casilla a tiro de dado?
  if(p<0||p>RING_LAST||SAFE.has(ringSq(c,p)))return 0;
  const sq=ringSq(c,p);let n=0;
  for(const o of g.players)if(o!==c)g.pos[o].forEach(q=>{if(q>=0&&q<=RING_LAST){const d=(sq-ringSq(o,q)+68)%68;if(d>=1&&d<=12&&q+d<=RING_LAST)n++}});
  return n;
 }
 function score(c,m){
  let s=Math.random()*4+(m.to-m.from)*.4;
  if(m.capture)s+=90+g.pos[m.capture.c][m.capture.i];
  if(m.to===GOAL)s+=70;else if(m.to>RING_LAST)s+=18;
  if(m.from<0)s+=45;
  if(m.to<=RING_LAST){if(SAFE.has(ringSq(c,m.to)))s+=16;if(at(keyOf(c,m.to)).some(o=>o.c===c))s+=14;s-=danger(c,m.to)*(12+m.to*.4)}
  if(m.from>=0)s+=danger(c,m.from)*(9+m.from*.3);
  return s;
 }
 function aiPick(c,opts){let best=null,bs=-1e9;for(const o of opts)for(const m of o.moves){const s=score(c,m);if(s>bs){bs=s;best={d:o.d,m}}}return best}

 /* ================= dibujo ================= */
 function cell(n){   // forma de la casilla n: {r:[x,y,w,h]} o {p:'puntos'}
  if(n<=7)return {r:[X2,22-n,L,1]};if(n===8)return {p:`${X2},14 14,14 15,15 ${X2},15`};
  if(n===9)return {p:`14,${X2} 15,${X2} 15,15 14,14`};if(n<=16)return {r:[14+(n-9),X2,1,L]};
  if(n===17)return {r:[21,X1,1,L]};
  if(n<=24)return {r:[21-(n-18),7,1,L]};if(n===25)return {p:`15,7 15,${X1} 14,${X1} 14,8`};
  if(n===26)return {p:`${X2},7 15,7 14,8 ${X2},8`};if(n<=33)return {r:[X2,7-(n-26),L,1]};
  if(n===34)return {r:[X1,0,L,1]};
  if(n<=41)return {r:[7,n-35,L,1]};if(n===42)return {p:`7,7 ${X1},7 ${X1},8 8,8`};
  if(n===43)return {p:`7,7 8,8 8,${X1} 7,${X1}`};if(n<=50)return {r:[7-(n-43),7,1,L]};
  if(n===51)return {r:[0,X1,1,L]};
  if(n<=58)return {r:[n-52,X2,1,L]};if(n===59)return {p:`7,${X2} 8,${X2} 8,14 7,15`};
  if(n===60)return {p:`8,14 ${X1},14 ${X1},15 7,15`};if(n<=67)return {r:[7,14+(n-60),L,1]};
  return {r:[X1,21,L,1]};
 }
 function center(n){
  if(n<=8)return [X2+L/2,22.5-n];if(n<=16)return [14.5+(n-9),X2+L/2];if(n===17)return [21.5,11];
  if(n<=25)return [21.5-(n-18),7+L/2];if(n<=33)return [X2+L/2,7.5-(n-26)];if(n===34)return [11,.5];
  if(n<=42)return [7+L/2,n-34.5];if(n<=50)return [7.5-(n-43),7+L/2];if(n===51)return [.5,11];
  if(n<=59)return [n-51.5,X2+L/2];if(n<=67)return [7+L/2,14.5+(n-60)];return [11,21.5];
 }
 const wide=n=>n<=8||(n>=26&&n<=42)||n>=60;      // casillas anchas (brazos de arriba y abajo): dos fichas se ponen lado a lado
 const hall=(c,s)=>c===0?[X1,21-s,L,1]:c===1?[21-s,X1,1,L]:c===2?[X1,s,L,1]:[s,X1,1,L];
 const hallC=(c,s)=>c===0?[11,21.5-s]:c===1?[21.5-s,11]:c===2?[11,.5+s]:[.5+s,11];
 function numAt(n){const [x,y]=center(n);
  if(n===17||n===51)return [x,y-.85,'middle'];if(n===34||n===68)return [x-.85,y+.18,'middle'];
  if(n<=8||(n>=26&&n<=33))return [14.75,y+.18,'end'];if((n>=35&&n<=42)||n>=60)return [7.25,y+.18,'start'];
  if(n<=16||(n>=52&&n<=59))return [x,14.78,'middle'];return [x,7.55,'middle'];
 }
 function boardSVG(){
  const shape=(s,fill)=>s.r?`<rect x="${s.r[0]}" y="${s.r[1]}" width="${s.r[2]}" height="${s.r[3]}" fill="${fill}"/>`:`<polygon points="${s.p}" fill="${fill}"/>`;
  const exits={5:0,22:1,39:2,56:3};let h='';
  for(let n=1;n<=68;n++){const ex=exits[n];h+=shape(cell(n),ex!=null?COLORS[ex].hex:'var(--pc-cell)')}
  COLORS.forEach((C,c)=>{for(let s=1;s<=7;s++){const r=hall(c,s);h+=`<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" fill="${C.hex}"/>`}});
  // de la salida a la casa, y los aros de las casas
  h+=`<rect x="15" y="17" width=".5" height="1" fill="${COLORS[0].hex}" stroke="none"/><rect x="17" y="6.5" width="1" height=".5" fill="${COLORS[1].hex}" stroke="none"/><rect x="6.5" y="4" width=".5" height="1" fill="${COLORS[2].hex}" stroke="none"/><rect x="4" y="15" width="1" height=".5" fill="${COLORS[3].hex}" stroke="none"/>`;
  COLORS.forEach(C=>{h+=`<circle cx="${C.nest[0]}" cy="${C.nest[1]}" r="3" fill="var(--pc-nest)" stroke="${C.hex}" stroke-width=".85"/>`});
  // centro
  h+=`<polygon points="8,8 14,8 11,11" fill="${COLORS[2].hex}"/><polygon points="14,8 14,14 11,11" fill="${COLORS[1].hex}"/><polygon points="14,14 8,14 11,11" fill="${COLORS[0].hex}"/><polygon points="8,14 8,8 11,11" fill="${COLORS[3].hex}"/>`;
  let marks='';
  for(let n=1;n<=68;n++){const [x,y]=center(n),[tx,ty,a]=numAt(n);
   if(SAFE.has(n))marks+=`<circle cx="${x}" cy="${y}" r=".34" fill="${exits[n]!=null?'#fff':'var(--pc-safe)'}" stroke="var(--pc-line)" stroke-width=".04"/>`;
   marks+=`<text x="${tx}" y="${ty}" text-anchor="${a}">${n}</text>`}
  return `<svg class="pc-svg" viewBox="-.06 -.06 22.12 22.12" aria-hidden="true"><rect x="0" y="0" width="22" height="22" fill="var(--pc-bg)" stroke="none"/><g stroke="var(--pc-line)" stroke-width=".05" stroke-linejoin="round">${h}<rect x="0" y="0" width="22" height="22" fill="none" stroke-width=".1"/></g><g class="pc-marks">${marks}</g></svg>`;
 }
 const pct=v=>(v/22*100).toFixed(3)+'%';
 function spot(c,i){   // dónde se dibuja la ficha i del color c
  const p=g.pos[c][i],C=COLORS[c];
  if(p<0){const a=(45+90*i)*Math.PI/180;return [C.nest[0]+Math.cos(a)*3,C.nest[1]+Math.sin(a)*3]}
  if(p===GOAL){const d=[[-.75,-.35],[.75,-.35],[-.75,.5],[.75,.5]][i],v=c===1||c===3;return [C.goal[0]+(v?d[1]:d[0]),C.goal[1]+(v?d[0]:d[1])]}
  const key=keyOf(c,p),occ=at(key),j=occ.findIndex(o=>o.c===c&&o.i===i),off=occ.length>1?(j===0?-.55:.55):0;
  if(p<=RING_LAST){const n=ringSq(c,p),[x,y]=center(n);return wide(n)?[x+off,y]:[x,y+off]}
  const [x,y]=hallC(c,p-RING_LAST);return c===0||c===2?[x+off,y]:[x,y+off];
 }
 function place(){
  if(!g||!ui)return;
  for(const c of g.players)for(let i=0;i<4;i++){const e=$(`.pc-piece[data-c="${c}"][data-i="${i}"]`);if(!e)continue;const [x,y]=spot(c,i);e.style.left=pct(x);e.style.top=pct(y)}
 }
 const nm=c=>g.seats[c].name;
 // ¿este teléfono maneja ese color?
 const mine=c=>g.seats[c].kind==='human'&&(net.role==='solo'||c===net.me);
 const auto=c=>g.seats[c].kind==='ai'||!!g.seats[c].away;
 /* ---- dados ---- */
 const PIPS={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
 function setDie(e,x,y,rot,v){e.style.left=pct(x);e.style.top=pct(y);e.style.transform=`rotate(${rot}deg)`;const on=PIPS[v]||[];[...e.children].forEach((d,k)=>d.classList.toggle('on',on.includes(k)))}
 const ROLL_FRAMES=9,ROLL_MS=30+ROLL_FRAMES*100+180;
 // los dos dados salen de la casa de quien tira, ruedan hasta el centro y ahí muestran el número
 function animDice(ev){
  const els=[0,1].map(d=>ui&&$(`.pc-die[data-d="${d}"]`));if(!els[0]||!els[1])return;
  const my=++rollTok,N=COLORS[ev.by].nest;rolling=true;
  els.forEach((e,d)=>{e.classList.remove('hidden','used','sel','pickable');e.style.transition='none';setDie(e,N[0]+(d?.9:-.9),N[1],0,1+Math.floor(Math.random()*6))});
  let k=0;
  const step=()=>{
   if(my!==rollTok||!ui)return;
   k++;const f=k/ROLL_FRAMES,ease=1-(1-f)*(1-f),last=k>=ROLL_FRAMES;
   els.forEach((e,d)=>{const T=ev.at[d];e.style.transition='left .1s linear,top .1s linear,transform .1s linear';
    setDie(e,N[0]+(T[0]-N[0])*ease,N[1]+(T[1]-N[1])*ease-Math.abs(Math.sin(f*Math.PI*3))*.7*(1-f),last?T[2]:k*(d?-131:149),last?ev.dice[d]:1+Math.floor(Math.random()*6))});
   if(!last)setTimeout(step,100);else setTimeout(()=>{if(my===rollTok){rolling=false;update(true)}},160);
  };
  setTimeout(step,30);
 }
 function drawDice(c,me){
  if(rolling)return;
  [0,1].forEach(d=>{const e=$(`.pc-die[data-d="${d}"]`);if(!e)return;
   if(!g.dice||!g.diePos){e.classList.add('hidden');return}
   const usable=g.phase==='pick'&&me&&g.opts.some(o=>o.d===d);
   e.classList.remove('hidden');e.style.transition='none';setDie(e,g.diePos[d][0],g.diePos[d][1],g.diePos[d][2],g.dice[d]);
   e.classList.toggle('used',!!g.used[d]);e.classList.toggle('pickable',usable);e.classList.toggle('sel',usable&&selDie===d&&g.opts.filter(o=>o.d>=0).length>1);e.disabled=!usable});
 }
 function update(local){
  if(!g||!ui||!$('.pc-board'))return;
  const c=g.players[g.turn],me=mine(c)&&!g.over,opts=g.phase==='pick'&&me?g.opts:[];
  if(opts.length&&!opts.some(o=>o.d===selDie))selDie=opts[0].d;
  const can=new Set(opts.flatMap(o=>o.moves.map(m=>m.c+'-'+m.i)));
  ui.stage.querySelectorAll('.pc-piece').forEach(e=>{const on=can.has(e.dataset.c+'-'+e.dataset.i);e.classList.toggle('can',on);e.disabled=!on;e.classList.toggle('home',g.pos[+e.dataset.c][+e.dataset.i]===GOAL)});
  ui.stage.querySelectorAll('.pc-av').forEach(e=>{e.classList.toggle('turn',!g.over&&+e.dataset.c===c);e.classList.toggle('away',!!g.seats[+e.dataset.c].away)});
  ui.stage.querySelectorAll('.pc-seat').forEach(e=>{const s=+e.dataset.c;e.classList.toggle('turn',!g.over&&s===c);e.querySelector('i').textContent=(g.seats[s].away?'📴 ':'')+'🏁 '+g.pos[s].filter(p=>p===GOAL).length+'/4'});
  drawDice(c,me);
  const d=$('#pcDice'),canRoll=g.phase==='roll'&&me;
  d.style.setProperty('--pc-c',COLORS[c].hex);d.style.setProperty('--pc-ink',COLORS[c].ink);d.disabled=!canRoll;d.classList.toggle('go',canRoll);
  $('#pcMsg').textContent=g.msg;
  $('#pcSub').textContent=g.over?'':canRoll?'Toca «Tirar» para lanzar los dados':opts.length?(opts.filter(o=>o.d>=0).length>1?'Toca un dado para elegir cuál usar, y luego la ficha':'Toca la ficha que quieres mover'):net.role!=='solo'&&!mine(c)?'Esperando a '+nm(c)+'…':'';
  $('#pcAgain').classList.toggle('hidden',!g.over||net.role==='guest');
  if(net.role==='host'&&!local)bcast({t:'s',s:snapshot()});
 }
 const say=t=>{g.msg=t;update()};
 const flush=()=>{place();update()};
 function fitUnit(){const b=$('.pc-board');if(b)b.style.setProperty('--pc-u',(b.clientWidth/22)+'px')}
 function applyTheme(){const t=THEMES[setup.theme]||THEMES.clasico;ui.stage.querySelectorAll('.pc-board').forEach(b=>['bg','cell','line','num','safe','nest'].forEach(k=>b.style.setProperty('--pc-'+k,t[k])))}
 const SUB={pve:'CONTRA LA MÁQUINA',pvp:'EN ESTE DISPOSITIVO',online:'SALA ONLINE'};
 const head=()=>`<div class="dos-head"><div><p>ARCADE SUDOMI · ${SUB[mode]||SUB.online}</p><h2>Parchís</h2></div><div class="dos-actions"><button class="game-restart" id="pcRules" aria-label="Reglas">?</button><button class="game-restart" id="pcExit">Juegos</button></div></div>`;
 const themePick=()=>`<div class="pc-opt"><b>Tema del tablero</b><div class="pc-seg">${Object.entries(THEMES).map(([k,t])=>`<button type="button" data-theme="${k}" class="${k===setup.theme?'on':''}"><span class="pc-sw" style="background:${t.cell};border-color:${t.line}"></span>${t.name}</button>`).join('')}</div></div>`;
 function bindTheme(root){(root||ui.stage).querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>{setup.theme=b.dataset.theme;try{localStorage.setItem(TKEY,setup.theme)}catch(_){}ui.stage.querySelectorAll('[data-theme]').forEach(x=>x.classList.toggle('on',x.dataset.theme===setup.theme));applyTheme()})}
 function rulesHTML(){return `<h3>Cómo se juega</h3><ul>
  <li>Cada jugador tiene <b>4 fichas</b>. Gana quien meta las cuatro en el centro.</li>
  <li>Se tiran <b>dos dados</b>. Cada dado se usa por separado: puedes mover dos fichas, o la misma ficha dos veces. Tú eliges el orden.</li>
  <li>Con un <b>5</b> en un dado sacas una ficha de casa (es obligatorio si puedes). También si los dos dados <b>suman 5</b>.</li>
  <li><b>Pareja</b> (los dos dados iguales): tiras otra vez. Con <b>tres parejas seguidas</b>, la última ficha que moviste vuelve a casa.</li>
  <li><b>Comer:</b> si caes donde hay una sola ficha rival, la mandas a su casa y <b>cuentas 20</b> con cualquier ficha.</li>
  <li><b>Seguros</b> (casillas con círculo y las salidas): ahí nadie puede comer.</li>
  <li><b>Barrera:</b> dos fichas del mismo color en una casilla. Nadie puede pasar. Con pareja estás obligado a abrirla.</li>
  <li>Después de dar la vuelta entras a tu <b>pasillo de color</b>. A la meta se llega con el número <b>exacto</b>, y al llegar <b>cuentas 10</b>.</li></ul>`}
 function showRules(){const s=document.createElement('div');s.className='pc-sheet';s.innerHTML=`<div class="pc-sheet-in">${rulesHTML()}<button class="arc-btn" type="button">Entendido</button></div>`;s.onclick=e=>{if(e.target===s||e.target.closest('button'))s.remove()};$('.pc')&&$('.pc').appendChild(s)}
 const bindHead=()=>{$('#pcExit').onclick=leave;$('#pcRules').onclick=showRules};

 function renderMenu(){
  stopGame();leaveNet();
  const online=mode==='online';
  const opts=mode==='pve'?[2,3,4].map(n=>[n,`Tú + ${n-1} IA`]):[2,3,4].map(n=>[n,`${n} ${online?'jugadores':'personas'}`]);
  const war=online?`<label class="pc-switch"><input type="checkbox" role="switch" id="pcWar"><i></i><span><b>⚔️ Parchís guerra</b><small id="pcWarNote">Un modo distinto, con sus propias reglas.</small></span></label>`:'';
  ui.stage.innerHTML=`<div class="mini-game pc">${head()}
   <div class="pc-menu">${net.status?`<p class="pc-note bad">${esc(net.status)}</p>`:''}<div class="pc-hero">🎲<b>Parchís</b><span>Saca tus cuatro fichas, da la vuelta al tablero y llévalas al centro.</span></div>
    <div class="pc-opt"><b>${mode==='pve'?'¿Contra cuántos?':'¿Cuántos juegan?'}</b><div class="pc-seg">${opts.map(([n,t])=>`<button type="button" data-n="${n}" class="${n===setup.n?'on':''}">${t}</button>`).join('')}</div>${online?'<small class="pc-hint">Los espacios que no se llenen los juega la IA.</small>':''}</div>
    ${war}${themePick()}<div class="pc-board pc-mini">${boardSVG()}</div>
    <button class="arc-btn pc-big" id="pcStart">${online?'🌐 Crear sala':'▶ Jugar'}</button></div></div>`;
  net.status='';bindHead();
  ui.stage.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{setup.n=+b.dataset.n;ui.stage.querySelectorAll('[data-n]').forEach(x=>x.classList.toggle('on',x===b))});
  const w=$('#pcWar');if(w)w.onchange=()=>{w.checked=false;const n=$('#pcWarNote');n.textContent='🚧 En desarrollo. Parchís guerra estará disponible pronto.';n.classList.add('dev');play('tap')};
  bindTheme();applyTheme();$('#pcStart').onclick=online?createRoom:start;
 }
 function newGame(players,seats){
  g={players,seats,pos:{},turn:0,phase:'roll',dice:null,used:[true,true],diePos:null,doubles:0,last:null,bonus:[],opts:[],msg:'',over:false,winner:null};
  players.forEach(c=>g.pos[c]=[-1,-1,-1,-1]);
 }
 function start(){
  const players=ORDER[setup.n],seats={},names=AI.slice().sort(()=>Math.random()-.5);
  players.forEach((c,k)=>{
   if(k===0)seats[c]={kind:'human',name:myName(),avatar:myAvatar()};
   else if(mode==='pvp')seats[c]={kind:'human',name:'Jugador '+(k+1),avatar:['🙂','😎','🤠','🥳'][k]};
   else seats[c]={kind:'ai',name:names[k][0],avatar:names[k][1]};
  });
  newGame(players,seats);renderGame();run(++token);
 }
 function renderGame(){
  const pieces=g.players.map(c=>[0,1,2,3].map(i=>`<button type="button" class="pc-piece" data-c="${c}" data-i="${i}" style="--pc-c:${COLORS[c].hex}" aria-label="Ficha ${COLORS[c].name} ${i+1}" disabled></button>`).join('')).join('');
  const avs=g.players.map(c=>`<div class="pc-av" data-c="${c}" style="left:${pct(COLORS[c].nest[0])};top:${pct(COLORS[c].nest[1])};--pc-c:${COLORS[c].hex}" title="${esc(nm(c))}"><span>${esc(g.seats[c].avatar)}</span></div>`).join('');
  const seats=g.players.map(c=>`<div class="pc-seat" data-c="${c}" style="--pc-c:${COLORS[c].hex}"><u></u><b>${esc(nm(c))}${net.role!=='solo'&&c===net.me?' (tú)':''}</b><i></i></div>`).join('');
  const dice=[0,1].map(d=>`<button type="button" class="pc-die hidden" data-d="${d}" aria-label="Dado ${d+1}" disabled>${'<i></i>'.repeat(9)}</button>`).join('');
  ui.stage.innerHTML=`<div class="mini-game pc">${head()}
   <div class="pc-seats">${seats}</div>
   <div class="pc-board">${boardSVG()}${avs}${pieces}${dice}</div>
   <div class="pc-hud"><button type="button" id="pcDice" class="pc-dice" aria-label="Tirar los dados"><span>🎲</span><small>Tirar</small></button><div class="pc-say"><b id="pcMsg"></b><small id="pcSub"></small></div></div>
   <div class="pc-foot"><button class="arc-btn hidden" id="pcAgain" type="button">↻ Jugar otra vez</button>${net.role==='solo'?'<button class="arc-btn ghost" id="pcMenu" type="button">Opciones</button>':''}</div></div>`;
  bindHead();const mb=$('#pcMenu');if(mb)mb.onclick=renderMenu;
  $('#pcAgain').onclick=()=>{if(net.role==='host')startOnline();else start()};
  $('#pcDice').onclick=()=>{if(!g||g.over||g.phase!=='roll'||!mine(g.players[g.turn]))return;if(net.role==='guest'){net.conn.send({t:'roll'});return}answer('roll',g.players[g.turn],true)};
  ui.stage.querySelectorAll('.pc-die').forEach(e=>e.onclick=()=>{const d=+e.dataset.d;if(g&&g.phase==='pick'&&g.opts.some(o=>o.d===d)){selDie=d;update(true)}});
  ui.stage.querySelectorAll('.pc-piece').forEach(e=>e.onclick=()=>{
   if(!g||g.phase!=='pick'||!mine(g.players[g.turn]))return;
   const c=+e.dataset.c,i=+e.dataset.i,has=o=>o.moves.some(m=>m.c===c&&m.i===i),o=g.opts.find(x=>x.d===selDie&&has(x))||g.opts.find(has);if(!o)return;
   if(net.role==='guest'){net.conn.send({t:'pick',i,d:o.d});g.phase='anim';update(true);return}
   answer('pick',c,{d:o.d,m:o.moves.find(m=>m.c===c&&m.i===i)});
  });
  applyTheme();fitUnit();place();update();
 }
 window.addEventListener('resize',()=>{if(ui&&g)fitUnit()});

 /* ================= flujo del turno (solo, o el anfitrión de una sala) ================= */
 const sleep=(ms,t)=>new Promise(res=>setTimeout(()=>res(t===token),ms));
 const ask=(kind,c)=>new Promise(res=>{waiting={kind,c,res}});
 function answer(kind,c,val){if(!waiting||waiting.kind!==kind||waiting.c!==c)return false;const w=waiting;waiting=null;w.res(val);return true}
 async function choose(c,opts,t){
  g.opts=opts;
  if(auto(c)){if(!await sleep(700,t))return null;return aiPick(c,opts)}
  const all=opts.flatMap(o=>o.moves.map(m=>({d:o.d,m})));
  if(opts.length===1&&all.every(x=>x.m.from===all[0].m.from&&x.m.to===all[0].m.to)){if(!await sleep(420,t))return null;return all[0]}
  g.phase='pick';selDie=opts[0].d;update();
  const r=await ask('pick',c);if(t!==token)return null;
  g.phase='anim';return r&&r!=='auto'?r:aiPick(c,opts);
 }
 async function doMove(m,t){
  const {c,i}=m;g.phase='anim';g.opts=[];update();
  if(m.from<0){g.pos[c][i]=0;flush();play('pop');if(!await sleep(320,t))return false}
  else{const fast=m.to-m.from>9;for(let q=m.from+1;q<=m.to;q++){g.pos[c][i]=q;flush();if(!fast||q%2===0)play('tap');if(!await sleep(fast?70:170,t))return false}}
  if(m.capture){const v=m.capture;g.pos[v.c][v.i]=-1;place();play('bad');say(`${nm(c)} se comió una ficha de ${nm(v.c)}: cuenta 20`);g.bonus.push(20);if(!await sleep(750,t))return false}
  if(m.to===GOAL){
   if(g.pos[c].every(p=>p===GOAL)){g.over=true;g.winner=c;g.phase='over';play('win');place();say(`🏆 ¡${nm(c)} ganó la partida!`);try{window.SudomiFX&&SudomiFX.confetti&&SudomiFX.confetti()}catch(_){}return true}
   play('bonus');say(`${nm(c)} llevó una ficha a la meta: cuenta 10`);g.bonus.push(10);if(!await sleep(650,t))return false;
  }
  g.last={c,i};flush();return true;
 }
 async function bonuses(c,t){
  while(!g.over&&g.bonus.length){
   const b=g.bonus.shift(),bm=legal(c,b,true,false);
   if(!bm.length){say(`${nm(c)} no puede contar ${b}`);if(!await sleep(900,t))return false;continue}
   say(`${nm(c)} cuenta ${b}`);const p=await choose(c,[{d:-1,moves:bm}],t);if(!p||!await doMove(p.m,t))return false;
  }
  return true;
 }
 async function run(t){
  while(g&&!g.over&&t===token){
   const c=g.players[g.turn],who=nm(c);
   g.phase='roll';g.opts=[];g.bonus=[];say(g.doubles?`¡Pareja! ${who} tira otra vez`:`Turno de ${who}`);
   if(auto(c)){if(!await sleep(800,t))return}else{await ask('roll',c);if(t!==token)return}
   // tirar: los mismos dados y el mismo recorrido para todos
   const dice=[1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6)],jit=()=>Math.random()*1.6-.8;
   const ev={t:'roll',by:c,dice,at:[[9.7+jit()*.6,11+jit()*1.6,Math.round(jit()*30)],[12.3+jit()*.6,11+jit()*1.6,Math.round(jit()*30)]]};
   g.phase='anim';update();bcast(ev);play('clack');
   g.dice=dice;g.used=[false,false];g.diePos=ev.at;animDice(ev);   // mientras ruedan (rolling) no se dibuja el número final
   if(!await sleep(ROLL_MS,t))return;
   play('tap');
   const [a,b]=dice,dbl=a===b;
   if(dbl)g.doubles++;
   if(dbl&&g.doubles===3){
    const Lm=g.last;g.used=[true,true];
    if(Lm&&Lm.c===c&&g.pos[c][Lm.i]>=0&&g.pos[c][Lm.i]<=RING_LAST){g.pos[c][Lm.i]=-1;place();play('bad');say(`Tres parejas seguidas: la última ficha de ${who} vuelve a casa`)}
    else say(`Tres parejas seguidas: ${who} pierde el turno`);
    if(!await sleep(1400,t))return;next();continue;
   }
   say(`${who} sacó ${a} y ${b}`);
   if(a+b===5){   // sumando 5 también se sale de casa
    const ex=legal(c,5,false,false).filter(m=>m.from<0);
    if(ex.length){g.used=[true,true];say(`${who} sacó ${a} y ${b}: suman 5 y sale una ficha`);if(!await sleep(500,t))return;if(!await doMove(ex[0],t))return;if(!await bonuses(c,t))return}
   }
   let first=true;
   while(!g.over&&g.used.includes(false)){
    const opts=[];
    [0,1].forEach(d=>{if(g.used[d]||(d===1&&!g.used[0]&&dbl))return;const mv=legal(c,dice[d],false,dbl&&first);if(mv.length)opts.push({d,moves:mv})});
    if(!opts.length){say(first?`${who} sacó ${a} y ${b} y no puede mover`:`${who} no puede usar el otro dado`);g.used=[true,true];if(!await sleep(1100,t))return;break}
    const p=await choose(c,opts,t);if(!p)return;
    g.used[p.d]=true;first=false;if(!await doMove(p.m,t))return;if(!await bonuses(c,t))return;
   }
   if(g.over)break;
   if(!dbl)next();
  }
  if(g&&t===token)update();
 }
 function next(){g.turn=(g.turn+1)%g.players.length;g.doubles=0;g.last=null}

 /* ================= sala online ================= */
 const snapshot=()=>({pos:g.pos,turn:g.turn,phase:g.phase,dice:g.dice,used:g.used,diePos:g.diePos,doubles:g.doubles,opts:g.opts,msg:g.msg,over:g.over,winner:g.winner,away:Object.fromEntries(g.players.map(c=>[c,!!g.seats[c].away]))});
 const pubSeats=()=>net.seats.map(s=>({c:s.c,kind:s.kind,name:s.name,avatar:s.avatar,away:!!s.away}));
 function bcast(msg){if(net.role!=='host'||!net.room)return;net.seats.forEach(s=>{if(s.kind==='human'&&s.id&&s.id!=='host')net.room.send(s.id,msg)})}
 function inviteUrl(){const base=location.origin&&location.origin!=='null'?location.origin+location.pathname:location.href.split(/[?#]/)[0];return `${base}?game=${GAME}&room=${net.code}`}
 function pushLobby(){if(net.role!=='host')return;net.seats.forEach(s=>{if(s.kind==='human'&&s.id&&s.id!=='host'&&net.room)net.room.send(s.id,{t:'lobby',seats:pubSeats(),you:s.c,code:net.code})});if(!net.started)renderLobby()}
 function renderLobby(){
  if(!ui)return;
  const host=net.role==='host';
  ui.stage.innerHTML=`<div class="mini-game pc">${head()}<div id="lbRoot"></div></div>`;bindHead();
  if(!window.SudomiLobby){$('#lbRoot').textContent=net.status||'Creando sala…';return}
  SudomiLobby.render($('#lbRoot'),{game:GAME,gameName:'Parchís',code:net.code||null,url:net.code?inviteUrl():'',host,fixed:false,
   seats:net.seats.map(s=>({state:s.c===net.me&&s.kind==='human'?'me':s.kind==='open'?'open':s.kind==='ai'?'ai':s.away?'away':'human',name:s.name,avatar:s.avatar,sub:s.kind==='open'?undefined:COLORS[s.c].name+(s.c===net.me?' · tú':'')})),
   extra:themePick(),bindExtra:root=>bindTheme(root),
   startLabel:'▶ Empezar la partida',canStart:!!net.code,onStart:host?startOnline:undefined,
   onRemove:i=>{if(!host||net.started||!net.seats[i]||net.seats[i].kind!=='open'||net.seats.length<=2)return;net.seats.splice(i,1);pushLobby()},
   status:net.status,hint:host?'Comparte el código o invita a tus amigos. Los espacios libres los juega la IA.':''});
 }
 async function createRoom(){
  if(P()&&P().get&&!P().get()){P().ensure(()=>createRoom());return}
  if(!window.SudomiParty){net.status='Este navegador no puede crear salas.';return renderMenu()}
  const players=ORDER[setup.n],my=++net.tok;
  Object.assign(net,{role:'host',code:'',started:false,status:'',me:players[0],room:null});
  net.seats=players.map((c,k)=>k===0?{c,kind:'human',id:'host',name:myName(),avatar:myAvatar()}:{c,kind:'open'});
  renderLobby();
  try{const room=await SudomiParty.host(GAME,onHost);if(my!==net.tok){room.close();return}net.room=room;net.code=room.code;renderLobby()}
  catch(e){if(my!==net.tok)return;net.role='solo';net.status=(e&&e.message)||'No se pudo crear la sala.';renderMenu()}
 }
 function onHost(e){
  if(net.role!=='host')return;
  let seat=net.seats.find(s=>s.id===e.id);
  if(e.type==='join'){
   const meta=e.meta||{};
   if(seat){seat.away=false;if(g&&g.seats[seat.c])g.seats[seat.c].away=false}
   else if(net.started){net.room.reject(e.id,'La partida ya empezó.');return}
   else{seat=net.seats.find(s=>s.kind==='open');if(!seat){net.room.reject(e.id,'La sala está llena.');return}Object.assign(seat,{kind:'human',id:e.id,name:clean(meta.n)||'Amigo',avatar:String(meta.a||'🙂').slice(0,4)})}
   pushLobby();
   if(net.started&&g){net.room.send(e.id,{t:'start',players:g.players,seats:pubSeats(),you:seat.c});update()}
  }else if(e.type==='leave'){
   if(!seat)return;
   if(!net.started){Object.assign(seat,{kind:'open',id:null,name:undefined,avatar:undefined});pushLobby();return}
   seat.away=true;if(g&&g.seats[seat.c]){g.seats[seat.c].away=true;if(waiting&&waiting.c===seat.c){const w=waiting;waiting=null;w.res('auto')}update()}   // mientras no vuelva, juega la IA por él
  }else if(e.type==='msg'&&seat&&g&&!g.over){
   const d=e.data||{},c=seat.c;
   if(d.t==='roll')answer('roll',c,true);
   else if(d.t==='pick'&&g.phase==='pick'&&g.players[g.turn]===c){const o=g.opts.find(x=>x.d===d.d),m=o&&o.moves.find(x=>x.c===c&&x.i===d.i);if(m)answer('pick',c,{d:o.d,m})}
  }
 }
 function startOnline(){
  if(net.role!=='host'||!net.room)return;
  const names=AI.slice().sort(()=>Math.random()-.5),seats={};
  net.seats.forEach((s,k)=>{if(s.kind==='open')Object.assign(s,{kind:'ai',name:names[k][0],avatar:names[k][1]});seats[s.c]={kind:s.kind,name:s.name,avatar:s.avatar,away:!!s.away}});
  net.started=true;stopGame();newGame(net.seats.map(s=>s.c),seats);
  net.seats.forEach(s=>{if(s.kind==='human'&&s.id!=='host')net.room.send(s.id,{t:'start',players:g.players,seats:pubSeats(),you:s.c})});
  renderGame();run(++token);
 }
 function joinRoom(code){
  if(P()&&P().get&&!P().get()){P().ensure(()=>joinRoom(code));return}
  if(!window.SudomiParty){net.status='Este navegador no puede entrar a salas.';mode='online';return renderMenu()}
  stopGame();leaveNet();
  const my=++net.tok;Object.assign(net,{role:'guest',code:SudomiParty.normCode(code),started:false,status:'Conectando con la sala…',seats:[],me:-1});
  renderLobby();
  net.conn=SudomiParty.join(GAME,code,{n:myName(),a:myAvatar()},e=>{if(my===net.tok)onGuest(e)});
 }
 function onGuest(e){
  if(e.type==='open'){net.status='';if(!net.started)renderLobby();return}
  if(e.type==='away'){net.status='Se perdió la conexión. Reconectando…';if(g){g.msg=net.status;update(true)}else renderLobby();return}
  if(e.type==='back'){net.status='';return}
  if(e.type==='closed'){const msg=e.message||'La sala se cerró.';stopGame();leaveNet();net.status=msg;mode='online';renderMenu();return}
  if(e.type!=='msg')return;
  const d=e.data||{};
  if(d.t==='lobby'){net.seats=d.seats;net.me=d.you;net.code=d.code||net.code;if(!net.started)renderLobby()}
  else if(d.t==='start'){
   net.started=true;net.seats=d.seats;net.me=d.you;token++;rollTok++;rolling=false;
   const seats={};d.seats.forEach(s=>seats[s.c]={kind:s.kind,name:s.name,avatar:s.avatar,away:!!s.away});
   newGame(d.players,seats);renderGame();
  }
  else if(d.t==='s'&&g){const s=d.s;Object.keys(s.away||{}).forEach(c=>{if(g.seats[c])g.seats[c].away=s.away[c]});delete s.away;Object.assign(g,s);place();update(true)}
  else if(d.t==='roll'&&g){g.phase='anim';g.dice=d.dice;g.used=[false,false];g.diePos=d.at;animDice(d)}
  else if(d.t==='snd'){try{window.SudomiSound&&SudomiSound.play(d.n)}catch(_){}if(d.n==='win'){try{window.SudomiFX&&SudomiFX.confetti&&SudomiFX.confetti()}catch(_){}}}
 }
 function leaveNet(){
  net.tok++;
  if(net.room){try{net.room.close()}catch(_){}}
  if(net.conn){try{net.conn.close()}catch(_){}}
  Object.assign(net,{role:'solo',room:null,conn:null,code:'',seats:[],started:false,me:0});
 }
 function stopGame(){token++;rollTok++;rolling=false;g=null;if(waiting){const w=waiting;waiting=null;w.res(null)}}
 function leave(){close();const u=ui;if(u){u.stage.innerHTML='';u.exit()}}
 function close(){stopGame();leaveNet();net.status=''}
 function open(opts,m,code){
  ui=opts;ui.hub.classList.add('hidden');ui.stage.classList.remove('hidden');
  if(m==='join'){mode='online';joinRoom(code);return}
  mode=m==='pvp'||m==='online'?m:'pve';renderMenu();
 }
 window.SudomiParchis={open,close,join:code=>joinRoom(code),themes:THEMES,_state:()=>g,_net:()=>net,_ev:e=>onHost(e),_legal:legal,_setState:s=>{Object.assign(g,s);place();update()}};
})();
