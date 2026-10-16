/* SUDOMI 0.3.87 — «Modo historia»: Las páginas perdidas. Un viaje tipo roguelike hecho con lo que SUDOMI ya tiene.
 * El viento regó por tres tierras las páginas del libro de acertijos del maestro Alcuino. Cada reto ganado devuelve una página.
 *   Un viaje = 3 actos. Cada acto: STEPS pasos (en cada uno se elige un camino entre 2 o 3) y un jefe.
 *   Caminos: enigma (un acertijo de js/puzzles.js) · juego (ganar una partida del arcade contra la máquina) · sudoku ·
 *            descanso · cofre (una reliquia) · mercader.
 *   Fallar cuesta una vida; sin vidas se acaba el viaje y se empieza otro desde cero (se conservan los récords y lo ganado).
 * No toca los juegos: se entera del resultado por lo que ya avisan ('sudomi-arcade' {game, won}, 'sudomi-win' y ui.lose del Sudoku).
 * Al terminar un viaje da monedas y XP. Ganarlo abre el siguiente nivel de «Travesía» (menos vidas, más premio).
 * Guardado: localStorage['sudomi-story'] = {run, best:{pages,wins,runs}, asc}. */
(()=>{
 const S=window.SudomiScreen,P=window.SudomiPuzzles,C=window.SudomiCore;if(!S||!P)return;
 const KEY='sudomi-story',STEPS=4;
 const rd=()=>{try{const v=JSON.parse(localStorage.getItem(KEY))||{};return {run:v.run||null,best:{pages:0,wins:0,runs:0,...(v.best||{})},asc:v.asc||0}}catch(_){return {run:null,best:{pages:0,wins:0,runs:0},asc:0}}};
 const wr=v=>{try{localStorage.setItem(KEY,JSON.stringify(v))}catch(_){}};
 const snd=n=>{try{window.SudomiSound&&SudomiSound.play(n)}catch(_){}};
 const pick=a=>a[Math.floor(Math.random()*a.length)];
 const ACTS=[
  {name:'La aldea de York',text:'Aquí enseñaba el maestro de joven. Las primeras páginas quedaron enredadas entre los puestos del mercado.',boss:{t:'jefe',name:'El barquero del Ouse',say:'«Nadie cruza mi río sin pensar primero.»',ids:['a19']}},
  {name:'El río Loira',text:'Río abajo está la abadía de Tours. Las páginas viajan de barca en barca y cada quien pide algo a cambio.',boss:{t:'jefe',name:'La capitana del Loira',say:'«Hunde mi flota y las páginas son tuyas.»',g:'fleet'}},
  {name:'La corte de Carlomagno',text:'Las últimas páginas llegaron a palacio. Los sabios de la corte no las sueltan sin ponerte a prueba.',boss:{t:'jefe',name:'El maestro Alcuino',say:'«Tres preguntas. Respóndeme dos y el libro vuelve a estar completo.»',trio:1}}
 ];
 const GAMES={memory:'Memoria de animales',connect4:'4 en línea',dotsboxes:'Puntos y cajas',checkers:'Damas',domino:'Dominó',escoba:'Escoba',dos:'DOS',fleet:'Batalla naval',blackjack:'Blackjack'};
 const GAME_ACT=[['memory','connect4','dotsboxes'],['memory','connect4','dotsboxes','checkers','domino','escoba','dos'],['connect4','checkers','domino','escoba','dos','fleet','blackjack']];
 const SUDOKU=['easy','easy','medium'];
 const RELICS={
  pluma:['🪶','Pluma de ganso','La primera pista de cada enigma es gratis.'],
  bota:['🥾','Bota de siete leguas','Salta un reto y cuéntalo como ganado. Un solo uso.'],
  amuleto:['📿','Amuleto del peregrino','Una vida máxima más, y te cura una.'],
  bolsa:['👝','Bolsa de doble fondo','Ganas la mitad más de oro.'],
  reloj:['⏳','Reloj de arena','El primer fallo de cada acto no cuesta vida.'],
  mapa:['🗺️','Mapa del monje','Ves tres caminos en vez de dos.']
 };
 const KIND={enigma:['📜','Enigma'],juego:['🎲','Partida'],sudoku:['🔢','Sudoku'],descanso:['🔥','Descanso'],cofre:['🧰','Cofre'],mercader:['⚖️','Mercader'],jefe:['👑','Jefe']};
 const LIVES=[3,3,2,2,1],has=(r,id)=>r.relics.includes(id);
 // ---- armar el viaje
 function newRun(asc){const max=LIVES[Math.min(asc,LIVES.length-1)];return {asc,act:0,step:0,lives:max,max,gold:0,pages:0,relics:[],used:[],shield:false,doors:null,cur:null,note:null,seen:false}}
 function enigma(r,d){
  const free=P.list.filter(p=>!r.used.includes(p.id)&&p.id!=='a19'&&p.k!=='slide'),want=[[1],[1,2],[2,3]][r.act];
  const L=free.filter(p=>d?p.d===d:want.includes(p.d));return pick(L.length?L:free.length?free:P.list).id;
 }
 function doors(r){
  const pool=['enigma','enigma','enigma','juego','juego','juego','sudoku'];
  if(!r.free){   // un solo respiro (descanso, cofre o mercader) por acto: el resto del camino son retos
   if(!Object.keys(RELICS).every(k=>has(r,k)))pool.push('cofre');
   if(r.lives<r.max)pool.push('descanso','descanso');if(r.gold>=30)pool.push('mercader');
  }
  const n=has(r,'mapa')?3:2,types=[pick(['enigma','juego'])];   // el primero siempre es un reto
  for(let guard=0;types.length<n&&guard<60;guard++){const t=pick(pool);if(!types.includes(t))types.push(t)}
  return types.map(t=>t==='enigma'?{t,id:enigma(r)}:t==='juego'?{t,g:pick(GAME_ACT[r.act])}:t==='sudoku'?{t,diff:SUDOKU[r.act]}:{t});
 }
 const gold=(r,n)=>{const g=Math.round(n*(has(r,'bolsa')?1.5:1));r.gold+=g;return g};
 const prize=n=>n.t==='jefe'?50:n.t==='sudoku'?40:n.t==='juego'?20:10+5*((P.byId(n.id)||{}).d||1);
 const title=n=>n.t==='enigma'?(P.byId(n.id)||{}).t:n.t==='juego'?GAMES[n.g]:n.t==='sudoku'?'Sudoku '+(C&&C.DIFFICULTIES[n.diff]?C.DIFFICULTIES[n.diff].label.toLowerCase():''):n.t==='jefe'?n.name:KIND[n.t][1];
 const blurb=n=>n.t==='enigma'?'Resuelve el acertijo. Tres fallos y pierdes una vida.':n.t==='juego'?'Gana una partida contra la máquina.':n.t==='sudoku'?'Complétalo sin perder. Además te cura una vida.':n.t==='descanso'?'Recuperas una vida.':n.t==='cofre'?'Elige una reliquia.':n.t==='mercader'?'Cambia oro por vidas o reliquias.':n.say;
 // ---- avanzar
 function advance(st){
  const r=st.run;r.cur=null;r.doors=null;
  if(r.step>STEPS){r.act++;r.step=0;r.shield=false;r.seen=false;r.free=0;if(r.lives<r.max)r.lives++;if(r.act>=ACTS.length){finish(st,true);return}}
  wr(st);
 }
 function won(st,n,skipped){
  const r=st.run,g=gold(r,prize(n));r.pages++;if(n.t==='sudoku'&&r.lives<r.max)r.lives++;
  if(n.t==='enigma')r.used.push(n.id);
  r.note={ok:true,text:(skipped?'La bota te llevó de un salto. ':'')+`Recuperaste una página y ${g} de oro.`};r.step++;snd('bonus');advance(st);
 }
 function lost(st,n){
  const r=st.run;if(n.t==='enigma')r.used.push(n.id);
  if(has(r,'reloj')&&!r.shield){r.shield=true;r.note={ok:false,text:'Fallaste, pero el reloj de arena te devolvió el tiempo. No pierdes vida.'}}
  else{r.lives--;r.note={ok:false,text:'Fallaste el reto y perdiste una vida.'}}
  snd('lose');r.cur=null;r.doors=null;
  if(r.lives<=0){finish(st,false);return}
  wr(st);
 }
 function finish(st,victory){
  const r=st.run,coins=r.pages*8+(victory?100+r.asc*25:0),xp=r.pages*10+(victory?100:0);
  st.best.runs++;st.best.pages=Math.max(st.best.pages,r.pages);if(victory){st.best.wins++;if(r.asc>=st.asc&&st.asc<LIVES.length-1)st.asc=r.asc+1}
  try{window.SudomiCoins&&coins&&SudomiCoins.add(coins,'Modo historia')}catch(_){}try{window.SudomiXP&&xp&&SudomiXP.award(xp)}catch(_){}
  st.run={over:true,victory,pages:r.pages,gold:r.gold,coins,xp,asc:r.asc,act:Math.min(r.act,ACTS.length-1)};wr(st);snd(victory?'win':'lose');
 }
 // ---- ir a jugar fuera de esta pantalla
 function goGame(g){
  S.close('storyScreen');const o=document.getElementById('openMiniGames');if(o)o.click();
  setTimeout(()=>{const b=document.querySelector('#miniGamesScreen [data-game="'+g+'"]');if(b)b.click()},380);
 }
 function goSudoku(diff){
  S.close('storyScreen');if(!C)return;
  // si el arcade está abierto hay que salir de él primero (un toque vuelve a la lista de juegos y otro al inicio, igual que hace js/tabbar.js)
  try{const b=document.getElementById('gamesBackHome'),scr=document.getElementById('miniGamesScreen');for(let k=0;k<3&&b&&scr&&!scr.classList.contains('hidden');k++)b.click()}catch(_){}
  setTimeout(()=>{try{C.ui.game.newGame(diff);C.hideModal();C.ui.openGame()}catch(e){console.error(e)}},120);
 }
 function result(ok,type,delay){
  const st=rd(),r=st.run;if(!r||r.over||!r.cur||!r.cur.away)return;
  const n=r.cur;if((n.g?'juego':n.t)!==type&&!(type==='juego'&&n.g))return;
  if(ok)won(st,n);else lost(st,n);
  setTimeout(open,delay);
 }
 window.addEventListener('sudomi-arcade',e=>{const st=rd(),n=st.run&&st.run.cur,d=e.detail||{};if(n&&n.away&&n.g&&d.game===n.g)result(!!d.won,'juego',2400)});
 window.addEventListener('sudomi-win',e=>{const st=rd(),n=st.run&&st.run.cur;if(n&&n.away&&n.t==='sudoku'&&!(e.detail&&e.detail.daily))result(true,'sudoku',4600)});
 if(C&&C.ui){const ol=C.ui.lose.bind(C.ui);C.ui.lose=function(g){const st=rd(),n=st.run&&st.run.cur;if(n&&n.away&&n.t==='sudoku')result(false,'sudoku',2600);return ol(g)}}
 // ---- pantallas
 const hearts=r=>'<span class="sy-hearts" aria-label="'+r.lives+' vidas de '+r.max+'">'+'♥'.repeat(r.lives)+'<i>'+'♥'.repeat(r.max-r.lives)+'</i></span>';
 const bar=r=>`<div class="sy-bar">${hearts(r)}<span class="sy-gold" aria-label="Oro">🪙 ${r.gold}</span><span class="sy-pages" aria-label="Páginas">📜 ${r.pages}</span>${r.relics.length?`<span class="sy-rel">${r.relics.map(k=>`<i title="${RELICS[k][1]}: ${RELICS[k][2]}">${RELICS[k][0]}</i>`).join('')}</span>`:''}</div>`;
 function open(){S.open('storyScreen','🗺️ Las páginas perdidas',(body,api)=>{body.classList.add('sy','pz');draw(body,api)})}
 function draw(body,api){
  const st=rd(),r=st.run,re=()=>draw(body,api);body.scrollTop=0;
  if(!r)return intro(body,st,re);
  if(r.over)return ending(body,st,re);
  if(r.cur)return challenge(body,st,re,api);
  if(!r.seen)return actIntro(body,st,re);
  return map(body,st,re);
 }
 function intro(body,st,re){
  const b=st.best;let asc=st.asc;
  body.innerHTML=`<article class="pz-page sy-tale"><p class="pz-src">Año 800 · Modo historia</p><h3>Las páginas perdidas</h3>
  <p class="pz-q">El maestro Alcuino escribió un libro de acertijos para afilar la mente de los jóvenes. Una tarde de viento, las páginas salieron volando por la ventana. Hay que recuperarlas: por la aldea, río abajo y hasta la corte del emperador.</p></article>
  <ul class="sy-rules"><li>En cada paso eliges un camino: un enigma, una partida, un sudoku, o un respiro.</li><li>Cada reto ganado devuelve una página. Cada fallo cuesta una vida.</li><li>Sin vidas, el viaje termina y el siguiente empieza de cero, con caminos distintos.</li></ul>
  ${st.asc?`<div class="sy-asc"><b>Travesía</b><div class="cust-seg" role="group">${Array.from({length:st.asc+1},(_,i)=>`<button type="button" data-a="${i}" class="${i===asc?'on':''}" aria-pressed="${i===asc}">${i?'Nivel '+i:'Normal'} · ${'♥'.repeat(LIVES[i])}</button>`).join('')}</div></div>`:''}
  <button type="button" class="pz-btn sy-big" id="syStart">Empezar el viaje</button>
  <p class="st-note">${b.runs?`Viajes: ${b.runs} · Completados: ${b.wins} · Más páginas en un viaje: ${b.pages}`:'Un viaje completo son 15 pasos, con un jefe al final de cada acto. Se guarda solo: puedes salir y seguir otro día.'}</p>`;
  body.querySelectorAll('[data-a]').forEach(x=>x.onclick=()=>{asc=+x.dataset.a;body.querySelectorAll('[data-a]').forEach(y=>{y.classList.toggle('on',y===x);y.setAttribute('aria-pressed',y===x)})});
  body.querySelector('#syStart').onclick=()=>{st.run=newRun(asc);wr(st);snd('bonus');re()};
 }
 function actIntro(body,st,re){
  const r=st.run,a=ACTS[r.act];
  body.innerHTML=`${bar(r)}<article class="pz-page sy-tale"><p class="pz-src">Acto ${r.act+1} de ${ACTS.length}</p><h3>${a.name}</h3><p class="pz-q">${a.text}</p></article>
  ${r.note?`<p class="pz-msg ${r.note.ok?'good':'bad'}">${r.note.text}</p>`:''}<button type="button" class="pz-btn sy-big" id="syGo">Seguir el camino</button>`;
  body.querySelector('#syGo').onclick=()=>{r.seen=true;r.note=null;wr(st);re()};
 }
 function map(body,st,re){
  const r=st.run,a=ACTS[r.act],boss=r.step>=STEPS;
  if(!r.doors){r.doors=boss?[{...a.boss}]:doors(r);wr(st)}
  body.innerHTML=`${bar(r)}<div class="sy-trail" aria-label="Paso ${Math.min(r.step+1,STEPS+1)} de ${STEPS+1}"><b>${a.name}</b><ol>${Array.from({length:STEPS+1},(_,i)=>`<li class="${i<r.step?'done':i===r.step?'now':''}">${i===STEPS?'👑':''}</li>`).join('')}</ol></div>
  ${r.note?`<p class="pz-msg ${r.note.ok?'good':'bad'}">${r.note.text}</p>`:''}
  <h3 class="sy-h">${boss?'El jefe te espera':'Elige tu camino'}</h3>
  <div class="sy-doors">${r.doors.map((n,i)=>`<button type="button" class="sy-door k-${n.t}" data-i="${i}"><em>${KIND[n.t][0]}</em><span><small>${KIND[n.t][1]}</small><b>${title(n)}</b><i>${blurb(n)}</i></span></button>`).join('')}</div>
  <button type="button" class="pz-link sy-quit" id="syQuit">Abandonar el viaje</button>`;
  body.querySelectorAll('.sy-door').forEach(b=>b.onclick=()=>{const n=r.doors[+b.dataset.i];r.note=null;snd('tap');if(!KIND[n.t]||['descanso','cofre','mercader'].includes(n.t))r.free=1;
   if(n.t==='descanso'){if(r.lives<r.max)r.lives++;r.note={ok:true,text:'Descansaste junto al fuego y recuperaste una vida.'};r.step++;advance(st);re();return}
   if(n.trio){const u=r.used.slice();n.ids=[2,3,3].map(d=>{const id=enigma({...r,used:u},d);u.push(id);return id});n.i=0;n.ok=0}
   r.cur=n;wr(st);re()});
  body.querySelector('#syQuit').onclick=()=>{if(body.querySelector('.sy-sure')){finish(st,false);re();return}body.querySelector('#syQuit').insertAdjacentHTML('beforebegin','<p class="pz-msg bad sy-sure">Si abandonas, el viaje termina aquí y cobras lo recuperado. Toca otra vez para confirmar.</p>')};
 }
 function challenge(body,st,re,api){
  const r=st.run,n=r.cur,head=`${bar(r)}<p class="sy-kind">${KIND[n.t][0]} ${KIND[n.t][1]}${n.t==='jefe'?' · '+n.name:''}</p>`;
  const boot=has(r,'bota')?'<button type="button" class="pz-link" id="syBoot">🥾 Usar la bota y saltar este reto</button>':'';
  const bindBoot=()=>{const b=body.querySelector('#syBoot');if(b)b.onclick=()=>{r.relics=r.relics.filter(k=>k!=='bota');won(st,n,true);re()}};
  if(n.t==='cofre'){
   const opts=Object.keys(RELICS).filter(k=>!has(r,k)).sort(()=>Math.random()-.5).slice(0,3);
   body.innerHTML=`${head}<h3 class="sy-h">Dentro del cofre hay tres cosas. Llévate una.</h3><div class="sy-doors">${opts.map(k=>`<button type="button" class="sy-door k-cofre" data-k="${k}"><em>${RELICS[k][0]}</em><span><b>${RELICS[k][1]}</b><i>${RELICS[k][2]}</i></span></button>`).join('')}</div>`;
   body.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{take(r,b.dataset.k);r.note={ok:true,text:'Te llevaste: '+RELICS[b.dataset.k][1]+'.'};r.step++;advance(st);re()});return}
  if(n.t==='mercader'){
   const stock=Object.keys(RELICS).filter(k=>!has(r,k)).slice(0,2);
   body.innerHTML=`${head}<h3 class="sy-h">«Tengo de todo, peregrino.»</h3><div class="sy-doors">
   <button type="button" class="sy-door" data-buy="vida" ${r.gold<30||r.lives>=r.max?'disabled':''}><em>♥</em><span><b>Una vida</b><i>30 de oro${r.lives>=r.max?' · ya estás completo':''}</i></span></button>
   ${stock.map(k=>`<button type="button" class="sy-door" data-buy="${k}" ${r.gold<60?'disabled':''}><em>${RELICS[k][0]}</em><span><b>${RELICS[k][1]}</b><i>60 de oro · ${RELICS[k][2]}</i></span></button>`).join('')}</div>
   <button type="button" class="pz-btn sy-big" id="syLeave">Seguir el camino</button>`;
   body.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{const k=b.dataset.buy;if(k==='vida'){r.gold-=30;r.lives++}else{r.gold-=60;take(r,k)}snd('coin');wr(st);re()});
   body.querySelector('#syLeave').onclick=()=>{r.step++;advance(st);re()};return}
  if(n.g||n.t==='sudoku'){
   const game=!!n.g,name=game?GAMES[n.g]:title(n);
   body.innerHTML=`${head}<article class="pz-page sy-tale"><h3>${n.t==='jefe'?n.name:name}</h3><p class="pz-q">${n.t==='jefe'?n.say+' ':''}${game?`Gana una partida de <b>${name}</b> contra la máquina. Al terminar la partida vuelves aquí con el resultado.`:`Completa un <b>${name}</b>. Si pierdes la partida, pierdes una vida. Tu sudoku actual, si tienes uno a medias, se reemplaza.`}</p></article>
   ${n.away?'<p class="pz-msg">Reto en curso. Termina la partida para seguir.</p>':''}
   <button type="button" class="pz-btn sy-big" id="syPlay">${n.away?'Volver a la partida':'Ir a jugar'}</button>
   <div class="pz-row">${boot}<button type="button" class="pz-link" id="syGive">Rendirme (pierdo una vida)</button></div>`;
   body.querySelector('#syPlay').onclick=()=>{const again=n.away;n.away=true;wr(st);const scr=document.getElementById('miniGamesScreen');
    if(game){if(again&&scr&&!scr.classList.contains('hidden'))S.close('storyScreen');else goGame(n.g)}else if(again){S.close('storyScreen');try{C.ui.openGame()}catch(_){}}else goSudoku(n.diff)};
   body.querySelector('#syGive').onclick=()=>{lost(st,n);re()};bindBoot();return}
  // enigma, o jefe hecho de enigmas
  const ids=n.ids||[n.id],k=n.i||0,p=P.byId(ids[k]),maxErr=p.k==='choice'?1:3;let errs=n.e||0,hints=0;   // n.e: los fallos se guardan, cerrar y abrir no los borra
  body.innerHTML=`${head}${n.t==='jefe'?`<p class="sy-say">${n.say}${ids.length>1?` Pregunta ${k+1} de ${ids.length} · llevas ${n.ok}.`:''}</p>`:''}
  <article class="pz-page"><p class="pz-src">${P.source(p)}</p><h3>${p.t}</h3><p class="pz-q">${p.q}</p></article>
  <p class="sy-tries">Fallos: <b id="syErr">${errs}</b> de ${maxErr}</p><div class="pz-play"></div><div class="pz-hints"></div>
  <div class="pz-row"><button type="button" class="pz-link" id="syHint"></button>${boot}<button type="button" class="pz-link" id="syGive">Rendirme</button></div>`;
  const hb=body.querySelector('#syHint'),cost=()=>has(r,'pluma')&&!hints?0:5;
  const hl=()=>{hb.textContent=hints>=p.h.length?'No quedan pistas':`Pista (${cost()?cost()+' de oro':'gratis'})`;hb.disabled=hints>=p.h.length||r.gold<cost()};hl();
  hb.onclick=()=>{r.gold-=cost();wr(st);body.querySelector('.pz-hints').insertAdjacentHTML('beforeend',`<p class="pz-hint"><b>Pista ${hints+1}.</b> ${p.h[hints]}</p>`);hints++;snd('hint');const g=body.querySelector('.sy-gold');if(g)g.textContent='🪙 '+r.gold;hl()};
  const end=ok=>{
   if(ids.length>1){r.used.push(p.id);n.ok+=ok?1:0;n.i=k+1;n.e=0;const left=ids.length-n.i,need=2;
    if(n.ok>=need){explain(true,()=>{won(st,n);re()});return}
    if(n.ok+left<need){explain(false,()=>{lost(st,n);re()});return}
    wr(st);explain(ok,re);return}
   explain(ok,()=>{if(ok)won(st,n);else lost(st,n);re()});
  };
  const explain=(ok,next)=>{body.querySelectorAll('.pz-play button,.pz-play input,#syHint,#syGive,#syBoot').forEach(b=>b.disabled=true);snd(ok?'good':'gbad');
   body.insertAdjacentHTML('beforeend',`<div class="pz-solved"><p><b>${ok?'Correcto.':'No lo lograste.'}</b> ${p.s}</p><button type="button" class="pz-btn sy-big" id="syNext">Seguir</button></div>`);
   const b=body.querySelector('#syNext');b.onclick=next;b.scrollIntoView({block:'nearest',behavior:'smooth'})};
  P.mount(body.querySelector('.pz-play'),p,{onSolve:()=>end(true),onError:()=>{errs++;n.e=errs;wr(st);const e=body.querySelector('#syErr');if(e)e.textContent=errs;if(errs>=maxErr)end(false)}});
  body.querySelector('#syGive').onclick=()=>end(false);bindBoot();
 }
 function take(r,k){r.relics.push(k);if(k==='amuleto'){r.max++;r.lives++}snd('achievement')}
 function ending(body,st,re){
  const e=st.run;
  body.innerHTML=`<article class="pz-page sy-tale"><p class="pz-src">${e.victory?'Fin del viaje':'El viaje terminó en '+ACTS[e.act].name}</p><h3>${e.victory?'El libro está completo':'Las páginas se quedan esperando'}</h3>
  <p class="pz-q">${e.victory?'Alcuino cosió la última página y cerró el libro. «Mil doscientos años después —dijo— alguien seguirá rompiéndose la cabeza con esto.» Tenía razón.':'El viento volvió a soplar y te quedaste sin fuerzas. Las páginas que recuperaste están a salvo; las demás siguen por ahí. Los caminos nunca son iguales dos veces.'}</p></article>
  <p class="sy-sum"><span>📜 <b>${e.pages}</b> páginas</span><span>🪙 +<b>${e.coins}</b> monedas</span><span>✨ +<b>${e.xp}</b> XP</span></p>
  ${e.victory&&st.asc>e.asc?`<p class="pz-msg good">Abriste la Travesía nivel ${st.asc}: empiezas con menos vidas y el premio final es mayor.</p>`:''}
  <button type="button" class="pz-btn sy-big" id="syAgain">Empezar otro viaje</button>`;
  body.querySelector('#syAgain').onclick=()=>{st.run=null;wr(st);re()};
  if(e.victory&&!e.shown){e.shown=true;wr(st);try{window.SudomiFX&&SudomiFX.confetti&&SudomiFX.confetti(innerWidth/2,innerHeight*.35,90)}catch(_){}}
 }
 function boot(){
  const dd=document.getElementById('homeDropdown'),b=document.getElementById('openStory'),h=document.getElementById('homeStory');
  if(b)b.onclick=()=>{if(dd)dd.classList.add('hidden');const t=document.getElementById('homeMenuBtn');if(t)t.setAttribute('aria-expanded','false');open()};
  if(h)h.onclick=()=>open();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
 window.SudomiStory={open,state:rd,_set:wr};
})();
