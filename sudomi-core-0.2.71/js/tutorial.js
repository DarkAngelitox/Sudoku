/* SUDOMI 0.2.35 — Phase 8: tutorial. Twelve short pages: goal, board, controls and colours, notes, smart hints, three techniques
 * (naked single and hidden single as little practice questions, naked pairs, X-Wing) and the difficulty levels.
 * The practice boards are the classic example puzzle; the examples are FOUND by the code (not typed by hand), so they cannot be wrong.
 * Opened from the menu ("Tutorial"), from the help box on the game screen, or from the first-visit banner on the home screen.
 * Only reads; it never changes a game. localStorage['sudomi-tutorial'] = {seen:true} / {dismissed:true}. */
(()=>{
 const $=s=>document.querySelector(s),KEY='sudomi-tutorial';
 const PUZ='530070000600195000098000060800060003400803001700020006060000280000419005000080079'.split('').map(Number);
 const SOL='534678912672195348198342567859761423426853791713924856961537284287419635345286179'.split('').map(Number);
 const BOXN=['superior izquierdo','superior central','superior derecho','central izquierdo','central','central derecho','inferior izquierdo','inferior central','inferior derecho'];
 const rc=i=>[Math.floor(i/9),i%9],boxOf=i=>Math.floor(i/27)*3+Math.floor((i%9)/3);
 const UNITS=[];for(let b=0;b<9;b++){const br=Math.floor(b/3)*3,bc=(b%3)*3,u=[];for(let a=0;a<3;a++)for(let d=0;d<3;d++)u.push((br+a)*9+bc+d);UNITS.push({kind:'box',n:b,cells:u})}
 for(let r=0;r<9;r++)UNITS.push({kind:'row',n:r,cells:[...Array(9).keys()].map(c=>r*9+c)});
 for(let c=0;c<9;c++)UNITS.push({kind:'col',n:c,cells:[...Array(9).keys()].map(r=>r*9+c)});
 const PEERS=[...Array(81)].map((_,i)=>{const s=new Set(),[r,c]=rc(i);for(let x=0;x<9;x++){s.add(r*9+x);s.add(x*9+c)}for(const j of UNITS[boxOf(i)].cells)s.add(j);s.delete(i);return [...s]});
 const cand=(b,i)=>{const o=[];for(let n=1;n<=9;n++)if(!PEERS[i].some(p=>b[p]===n))o.push(n);return o};
 const where=i=>{const [r,c]=rc(i);return `fila ${r+1}, columna ${c+1}`};
 // examples found by the code
 const nakedEx=(()=>{for(let i=0;i<81;i++)if(!PUZ[i]){const c=cand(PUZ,i);if(c.length===1)return {cell:i,digit:c[0]}}})();
 const hiddenEx=(()=>{for(const u of UNITS)for(let n=1;n<=9;n++){if(u.cells.some(i=>PUZ[i]===n))continue;const sp=u.cells.filter(i=>!PUZ[i]&&cand(PUZ,i).includes(n));if(sp.length===1&&cand(PUZ,sp[0]).length>1&&u.kind==='box')return {unit:u,digit:n,cell:sp[0]}}})();
 const read=()=>{try{return JSON.parse(localStorage.getItem(KEY))||{}}catch(_){return {}}};
 const save=o=>{try{localStorage.setItem(KEY,JSON.stringify({...read(),...o}))}catch(_){}};
 // ---- drawing helpers
 const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
 // cells: {v, cls:'', notes:[..]} ; mark: map index -> class string
 function grid(board,mark={},opt={}){
  let h=`<div class="tg ${opt.cls||''}" ${opt.id?`id="${opt.id}"`:''}>`;
  for(let i=0;i<81;i++){
   const [r,c]=rc(i),v=board[i],m=mark[i]||'',cls=['tc',v&&PUZ[i]===v?'tgiven':'',(c===2||c===5)?'tbr':'',(r===2||r===5)?'tbb':'',m].join(' ');
   h+=`<button type="button" class="${cls}" data-i="${i}" ${opt.static?'tabindex="-1"':''}>${v?v:''}</button>`;
  }
  return h+'</div>';
 }
 const unitMark=(u,cls,mark={})=>{u.cells.forEach(i=>mark[i]=((mark[i]||'')+' '+cls).trim());return mark};
 const strip=(cells)=>`<div class="ts">${cells.map(c=>`<div class="ts-c ${c.cls||''}">${c.v?`<b>${c.v}</b>`:`<span class="ts-n">${[1,2,3,4,5,6,7,8,9].map(n=>`<i class="${(c.n||[]).includes(n)?(c.x&&c.x.includes(n)?'x':'on'):''}">${(c.n||[]).includes(n)?n:''}</i>`).join('')}</span>`}</div>`).join('')}</div>`;

 // ---- pages. Each returns {title, html, bind?(root)}
 const pages=[
  {title:'Bienvenido a SUDOMI',html:()=>`<p class="tp-lead">El sudoku es un juego de lógica. No hace falta saber matemáticas: solo pensar con calma.</p>
   ${grid(PUZ,unitMark(UNITS[9+4],'hl'),{static:true})}
   <p>Tu meta: <b>llenar la cuadrícula</b> con los números del <b>1 al 9</b> de forma que <b>no se repita ninguno</b> en cada <b>fila</b>, cada <b>columna</b> y cada <b>cuadro de 3×3</b>.</p>
   <p class="tp-note">En este tutorial hay dos mini-retos para practicar. ¡Toma menos de 3 minutos!</p>`},
  {title:'El tablero',html:()=>`<p>Toca un botón para ver cada zona:</p>
   <div class="tp-tabs" role="group"><button type="button" data-z="row" class="on">Fila</button><button type="button" data-z="col">Columna</button><button type="button" data-z="box">Cuadro</button></div>
   <div id="tutZone">${grid(PUZ,unitMark(UNITS[9+4],'hl'),{static:true})}</div>
   <p id="tutZoneText">Una <b>fila</b> va de izquierda a derecha. Hay 9 filas y cada una debe tener del 1 al 9.</p>`,
   bind(root){
    const txt={row:['Una <b>fila</b> va de izquierda a derecha. Hay 9 filas y cada una debe tener del 1 al 9.',UNITS[9+4]],col:['Una <b>columna</b> va de arriba hacia abajo. Hay 9 columnas y cada una debe tener del 1 al 9.',UNITS[18+4]],box:['Un <b>cuadro</b> es cada bloque de 3×3 (las líneas gruesas lo separan). Hay 9 cuadros y cada uno también lleva del 1 al 9.',UNITS[4]]};
    root.querySelectorAll('.tp-tabs button').forEach(b=>b.onclick=()=>{root.querySelectorAll('.tp-tabs button').forEach(x=>x.classList.toggle('on',x===b));const t=txt[b.dataset.z];root.querySelector('#tutZone').innerHTML=grid(PUZ,unitMark(t[1],'hl'),{static:true});root.querySelector('#tutZoneText').innerHTML=t[0]});
   }},
  {title:'Cómo se juega',html:()=>`<ol class="tp-steps"><li><b>Toca una casilla</b> vacía para seleccionarla. Se resaltan su fila, su columna y su cuadro.</li><li><b>Toca un número</b> en el teclado de abajo (o usa el teclado de tu computadora).</li><li>Si te equivocas, usa <b>Borrar</b>, o <b>↶ Deshacer</b> / <b>↷ Rehacer</b> arriba.</li></ol>
   <p>Los colores te hablan:</p>
   <div class="tp-legend"><span><i class="lg lg-given">5</i> Número del juego (fijo)</span><span><i class="lg lg-mine">7</i> Tu número</span><span><i class="lg lg-match">7</i> Mismo número que el seleccionado</span><span><i class="lg lg-bad">3</i> Error</span><span><i class="lg lg-sel"></i> Casilla seleccionada</span></div>
   <p class="tp-note">Cada número tiene un contador (por ejemplo <b>6/9</b>). Cuando llega a 9/9 ya no se puede usar más.</p>`},
  {title:'Las notas',html:()=>`<p>Cuando dudas entre varios números, <b>anótalos</b> en pequeño. Activa <b>✎ Notas</b> y toca los números que podrían ir en la casilla.</p>
   <div class="tp-cell"><div class="tp-bigcell">${[1,2,3,4,5,6,7,8,9].map(n=>`<i class="${[2,4,9].includes(n)?'on':''}">${[2,4,9].includes(n)?n:''}</i>`).join('')}</div><p>Esta casilla podría ser <b>2, 4 o 9</b>.</p></div>
   <ul class="tp-list"><li>Las notas se limpian <b>solas</b>: cuando colocas un número correcto, se borra de las notas de su fila, columna y cuadro.</li><li>Usa notas cuando no veas una jugada clara; con ellas aparecen los pares y las técnicas de abajo.</li></ul>`},
  {title:'Errores y pistas',html:()=>`<p>El contador de <b>Errores</b> cuenta tus fallos. En <b>Fácil</b> y <b>Medio</b> puedes equivocarte sin límite. Desde <b>Difícil</b>, <b>3 errores</b> y pierdes la partida (puedes reintentarla).</p>
   <p>El botón <b>💡 Pista</b> no solo te da la respuesta: te <b>explica por qué</b>.</p>
   <ol class="tp-steps"><li><b>Paso 1 (gratis):</b> te dice dónde mirar y resalta la zona.</li><li><b>Paso 2:</b> dice el número y la razón, con los números que lo bloquean en azul. Gasta una pista.</li><li><b>Colocar:</b> pones el número, o lo escribes tú.</li></ol>
   <p class="tp-note">Fácil y Medio: pistas sin límite. Difícil y niveles altos: 1 pista por partida. Si hay un número incorrecto, la pista te avisa primero.</p>`},
  {title:'Puntos y combos',html:()=>`<p>Cada partida suma puntos (el marcador ⭐ está debajo del tiempo y los errores).</p>
   <table class="tp-table"><tr><th>Jugada</th><th>Puntos</th></tr><tr><td>Número correcto</td><td>+10</td></tr><tr><td>🔥 Combo: cada acierto seguido sube el multiplicador (hasta ×2)</td><td>×1.1, ×1.2…</td></tr><tr><td>Completar una fila, columna o cuadro</td><td>+50</td></tr><tr><td>Colocar el 9.º número de un dígito</td><td>+30</td></tr><tr><td>Error</td><td>−50 y se rompe el combo</td></tr><tr><td>Pista (paso 2)</td><td>−30</td></tr></table>
   <p>Los puntos se multiplican según la dificultad: de ×1 en Fácil hasta ×3 en Extremo.</p>${note('Al terminar ganas un bonus por tiempo, +100 sin errores y +100 sin pistas. Guardamos tu récord por dificultad.')}`},
  {title:'Técnica 1 · Único posible',html:()=>{const e=nakedEx,mk={};PEERS[e.cell].forEach(i=>mk[i]='hl');mk[e.cell]='target';return `<p>A veces una casilla tiene <b>solo un número posible</b>, porque los demás ya están en su fila, columna o cuadro.</p>
   ${grid(PUZ,mk,{static:true,id:'tutNaked'})}
   <p class="tp-q"><b>Reto:</b> ¿qué número va en la casilla naranja (${where(e.cell)})?</p>
   <div class="tp-pad" id="tutPad">${[1,2,3,4,5,6,7,8,9].map(n=>`<button type="button" data-n="${n}">${n}</button>`).join('')}</div><p class="tp-fb" id="tutFb" aria-live="polite"></p>`},
   bind(root){
    const e=nakedEx;
    root.querySelectorAll('#tutPad button').forEach(b=>b.onclick=()=>{
     const n=+b.dataset.n,fb=root.querySelector('#tutFb');
     if(n===e.digit){const mk={};for(let d=1;d<=9;d++){if(d===e.digit)continue;const p=PEERS[e.cell].find(j=>PUZ[j]===d);if(p!==undefined)mk[p]='block'}mk[e.cell]='ok';const b2=PUZ.slice();b2[e.cell]=e.digit;
      root.querySelector('#tutNaked').outerHTML=grid(b2,mk,{static:true,id:'tutNaked'});
      fb.className='tp-fb good';fb.innerHTML=`✅ ¡Correcto! Es el <b>${n}</b>. Los otros ocho números ya aparecen en su fila, columna o cuadro (en azul).`}
     else{const p=PEERS[e.cell].find(j=>PUZ[j]===n);fb.className='tp-fb bad';fb.innerHTML=p!==undefined?`❌ El ${n} no puede ir ahí: ya hay un ${n} en la ${where(p)} que comparte fila, columna o cuadro. Prueba otro.`:`❌ El ${n} no es. Mira qué números ya aparecen alrededor de la casilla naranja.`}
    });
   }},
  {title:'Técnica 2 · Único en su zona',html:()=>{const e=hiddenEx,mk={};e.unit.cells.forEach(i=>{if(!PUZ[i])mk[i]='hl'});return `<p>Otras veces un número solo cabe <b>en una casilla de un cuadro</b>, aunque esa casilla tenga más opciones.</p>
   ${grid(PUZ,mk,{id:'tutHidden'})}
   <p class="tp-q"><b>Reto:</b> en el cuadro ${BOXN[e.unit.n]} (casillas amarillas), ¿<b>dónde</b> va el <b>${e.digit}</b>? Toca la casilla.</p><p class="tp-fb" id="tutFb2" aria-live="polite"></p>`},
   bind(root){
    const e=hiddenEx;
    root.querySelectorAll('#tutHidden .tc').forEach(c=>c.onclick=()=>{
     const i=+c.dataset.i,fb=root.querySelector('#tutFb2');
     if(!e.unit.cells.includes(i)||PUZ[i]){fb.className='tp-fb bad';fb.innerHTML='Toca una de las casillas vacías amarillas.';return}
     if(i===e.cell){const mk={};e.unit.cells.forEach(j=>{if(!PUZ[j]&&j!==e.cell)mk[j]='dim'});
       for(const j of e.unit.cells){if(PUZ[j]||j===e.cell)continue;const p=PEERS[j].find(x=>PUZ[x]===e.digit&&!e.unit.cells.includes(x));if(p!==undefined)mk[p]='block'}
       mk[e.cell]='ok';const b2=PUZ.slice();b2[e.cell]=e.digit;root.querySelector('#tutHidden').outerHTML=grid(b2,mk,{id:'tutHidden'});
       fb.className='tp-fb good';fb.innerHTML=`✅ ¡Eso es! En las otras casillas del cuadro no cabe el <b>${e.digit}</b>: ya hay uno en su fila o columna (en azul). Solo queda la ${where(e.cell)}.`}
     else{const p=PEERS[i].find(x=>PUZ[x]===e.digit);fb.className='tp-fb bad';fb.innerHTML=p!==undefined?`❌ Ahí no: ya hay un ${e.digit} en la ${where(p)}, en la misma fila, columna o cuadro. Prueba otra.`:'❌ Ahí no. Busca la casilla donde el número sí cabe.'}
    });
   }},
  {title:'Técnica 3 · Pares',html:()=>`<p>Si <b>dos casillas</b> de la misma fila (columna o cuadro) tienen <b>solo los mismos dos candidatos</b>, esos dos números son de ellas. Se pueden <b>quitar</b> de las demás casillas de esa zona.</p>
   <div id="tutPair">${pairStrip(false)}</div>
   <button type="button" class="tp-btn" id="tutPairBtn">Aplicar el par {2,5}</button>
   <p id="tutPairText">Las dos primeras casillas solo pueden ser <b>2 o 5</b>. Entonces ninguna otra casilla de la fila puede ser 2 ni 5.</p>`,
   bind(root){let on=false;const b=root.querySelector('#tutPairBtn');b.onclick=()=>{on=!on;root.querySelector('#tutPair').innerHTML=pairStrip(on);b.textContent=on?'Volver a mirar':'Aplicar el par {2,5}';root.querySelector('#tutPairText').innerHTML=on?'Tachamos los 2 y 5 sobrantes. ¡Ahora la tercera casilla solo puede ser <b>7</b>, la cuarta <b>9</b> y la quinta <b>1</b>!':'Las dos primeras casillas solo pueden ser <b>2 o 5</b>. Entonces ninguna otra casilla de la fila puede ser 2 ni 5.'}}},
  {title:'Técnica 4 · X-Wing',html:()=>`<p>Si el <b>7</b> solo puede ir en <b>dos columnas</b> dentro de dos filas distintas, forma un rectángulo (las 4 esquinas naranjas). Un 7 irá en cada fila, así que en esas dos columnas el 7 <b>no puede estar en ninguna otra fila</b>.</p>
   <div id="tutX">${xwing(false)}</div>
   <button type="button" class="tp-btn" id="tutXBtn">Aplicar el X-Wing</button>
   <p class="tp-note">Es una técnica de nivel Maestro. Se ve difícil al principio: no pasa nada si hoy la dejas para más adelante.</p>`,
   bind(root){let on=false;const b=root.querySelector('#tutXBtn');b.onclick=()=>{on=!on;root.querySelector('#tutX').innerHTML=xwing(on);b.textContent=on?'Volver a mirar':'Aplicar el X-Wing'}}},
  {title:'Los niveles de dificultad',html:()=>`<p>Todos los sudokus de SUDOMI se resuelven <b>con lógica, sin adivinar</b>. Cada nivel pide técnicas distintas:</p>
   <table class="tp-table"><tr><th>Nivel</th><th>Técnicas</th></tr>
   <tr><td>Fácil · Medio</td><td>Únicos (técnicas 1 y 2)</td></tr><tr><td>Difícil</td><td>+ Parejas bloqueadas y pares (3)</td></tr><tr><td>Experto</td><td>+ Tríos</td></tr><tr><td>Maestro · Extremo</td><td>+ X-Wing (4) y XY-Wing</td></tr></table>
   <p class="tp-note">Truco: empieza siempre buscando únicos. Cuando no encuentres ninguno, usa las notas y busca pares.</p>`},
  {title:'¡Listo para jugar!',html:()=>`<div class="tp-done"><span>🎉</span><p>Ya conoces lo básico. Cuando te trabes, el botón <b>💡 Pista</b> te explicará cada jugada.</p></div>
   <div class="tp-final"><button type="button" class="tp-btn big" id="tutPlay">▶ Jugar ahora</button><button type="button" class="tp-btn ghost" id="tutDaily">📅 Sudoku del día</button></div>`,
   bind(root){root.querySelector('#tutPlay').onclick=()=>{close(true);const u=window.SudomiCore&&SudomiCore.ui;if(u)u.showDifficultyPicker()};
    root.querySelector('#tutDaily').onclick=()=>{close(true);if(window.SudomiDaily)SudomiDaily.open()}}}
 ];
 function pairStrip(applied){
  const base=[{n:[2,5]},{n:[2,5]},{n:[2,5,7],x:[2,5]},{n:[2,5,9],x:[2,5]},{n:[1,2,5],x:[2,5]},{v:8},{v:6},{v:3},{v:4}];
  return strip(base.map((c,i)=>{if(c.v)return c;const n=applied&&c.x?c.n.filter(d=>!c.x.includes(d)):c.n;if(applied&&n.length===1)return {v:n[0],cls:'solved'};return {n,x:applied?[]:c.x,cls:i<2?'pair':''}}));
 }
 function xwing(applied){
  const rowsX=[1,5],colsX=[2,6],mk={},b=Array(81).fill(0);
  let h='<div class="tg tx">';
  for(let i=0;i<81;i++){const [r,c]=rc(i),corner=rowsX.includes(r)&&colsX.includes(c),inRowOnly=rowsX.includes(r)&&!colsX.includes(c),elim=!rowsX.includes(r)&&colsX.includes(c)&&[0,3,8].includes(r);
   const show=corner||elim;const cls=['tc',(c===2||c===5)?'tbr':'',(r===2||r===5)?'tbb':'',corner?'xcorner':'',elim?(applied?'xgone':'xelim'):'',colsX.includes(c)?'xcol':''].join(' ');
   h+=`<div class="${cls}">${show&&!(elim&&applied)?'7':''}</div>`}
  return h+'</div>';
 }
 // ---- overlay
 let idx=0,root=null;
 function build(){
  root=document.createElement('div');root.id='tutorial';root.className='tut hidden';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Tutorial');
  root.innerHTML='<div class="tut-card"><header><div class="tut-dots" aria-hidden="true"></div><button type="button" class="tut-x" aria-label="Cerrar tutorial">✕</button></header><h2 class="tut-title"></h2><div class="tut-body"></div><footer><button type="button" class="tut-prev">‹ Atrás</button><span class="tut-count"></span><button type="button" class="tut-next">Siguiente ›</button></footer></div>';
  document.body.appendChild(root);
  root.querySelector('.tut-x').onclick=()=>close(false);root.querySelector('.tut-prev').onclick=()=>go(idx-1);root.querySelector('.tut-next').onclick=()=>idx===pages.length-1?close(true):go(idx+1);
  document.addEventListener('keydown',e=>{if(root.classList.contains('hidden'))return;if(e.key==='Escape')close(false);if(e.key==='ArrowRight')go(Math.min(idx+1,pages.length-1));if(e.key==='ArrowLeft')go(Math.max(idx-1,0))});
 }
 function go(n){
  if(n<0||n>=pages.length)return;idx=n;const p=pages[n];
  root.querySelector('.tut-title').textContent=p.title;
  const body=root.querySelector('.tut-body');body.innerHTML=p.html();body.scrollTop=0;if(p.bind)p.bind(body);
  root.querySelector('.tut-dots').innerHTML=pages.map((_,i)=>`<i class="${i===n?'on':i<n?'past':''}"></i>`).join('');
  root.querySelector('.tut-count').textContent=`${n+1} / ${pages.length}`;
  root.querySelector('.tut-prev').style.visibility=n?'visible':'hidden';
  root.querySelector('.tut-next').textContent=n===pages.length-1?'Terminar ✓':'Siguiente ›';
 }
 function open(){if(!root)build();root.classList.remove('hidden');document.body.classList.add('tut-open');go(0);const b=$('#tutBanner');if(b)b.remove()}
 function close(done){if(!root)return;root.classList.add('hidden');document.body.classList.remove('tut-open');save(done?{seen:true}:{dismissed:true})}
 // ---- entry points
 function mount(){
  const dd=$('#homeDropdown');
  if(dd&&!$('#openTutorial')){const b=document.createElement('button');b.id='openTutorial';b.type='button';b.className='dropdown-option';b.innerHTML='<span>📘</span><strong>Tutorial</strong><small>Aprende a jugar</small>';b.onclick=()=>{dd.classList.add('hidden');const t=$('#homeMenuBtn');if(t)t.setAttribute('aria-expanded','false');open()};dd.appendChild(b)}
  const help=$('details.help');
  if(help&&!$('#helpTutorial')){const b=document.createElement('button');b.id='helpTutorial';b.type='button';b.className='tp-btn ghost help-tut';b.textContent='📘 Ver el tutorial';b.onclick=open;help.appendChild(b)}
  const s=read(),hero=$('.welcome-hero');
  if(hero&&!s.seen&&!s.dismissed&&!$('#tutBanner')){const d=document.createElement('div');d.id='tutBanner';d.className='tut-banner';d.innerHTML='<span>📘</span><div><b>¿Primera vez con el sudoku?</b><small>Aprende a jugar en menos de 3 minutos.</small></div><button type="button" class="tp-btn">Ver tutorial</button><button type="button" class="tut-banner-x" aria-label="Ocultar">✕</button>';
   hero.parentNode.insertBefore(d,hero.nextSibling);d.querySelector('.tp-btn').onclick=open;d.querySelector('.tut-banner-x').onclick=()=>{save({dismissed:true});d.remove()}}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
 window.SudomiTutorial={open,close,pages:pages.length};
})();
