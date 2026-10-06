/* SUDOMI 0.2.44 — Phase 16: Maestro Sudomi. A coach that reads YOUR numbers (the finished games kept by js/stats.js, the achievement
 * counters, the daily streak) and recommends how to improve: accuracy, hint use, speed, which difficulty to try next, techniques to study
 * (with a button that opens the tutorial), the daily habit, and the closest goal. All the rules are plain and visible below.
 * It needs at least 3 finished games to judge; before that it gives starter advice. Opened from the menu ("Maestro Sudomi") and from the
 * Estadísticas screen. Only reads data; it never changes a game. */
(()=>{
 const $=s=>document.querySelector(s);
 const DIFFS=['easy','medium','hard','expert','master','extreme'],DN={easy:'Fácil',medium:'Medio',hard:'Difícil',expert:'Experto',master:'Maestro',extreme:'Extremo'};
 const PAR={easy:420,medium:600,hard:900,expert:1200,master:1500,extreme:1800};
 const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
 const clock=s=>`${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.round(s%60)).padStart(2,'0')}`;
 const unlocked=k=>!window.SudomiXP||!SudomiXP.lock||SudomiXP.info.L>=SudomiXP.unlockLevels[k];
 const openTut=()=>window.SudomiTutorial&&SudomiTutorial.open();
 // ---- analysis. tone: good | warn | idea
 function analyse(){
  const tips=[],tip=(icon,tone,title,text,action)=>tips.push({icon,tone,title,text,action});
  const games=(window.SudomiStats?SudomiStats.games:[]).slice().sort((a,b)=>a.t-b.t);
  const wins=games.filter(g=>g.w),recent=games.slice(-12),rw=recent.filter(g=>g.w);
  const name=(window.SudomiProfile&&SudomiProfile.safeName&&SudomiProfile.safeName())||'';
  const out={name,games:games.length,tips,grade:'',gradeText:''};
  const dailyStreak=window.SudomiDaily?SudomiDaily.streak():0;
  let todayDone=false;try{const d=JSON.parse(localStorage.getItem('sudomi-daily'))||{},t=new Date();todayDone=!!(d.done||{})[`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`]}catch(_){}
  if(games.length<3){
   tip('📘','idea','Empieza por el tutorial','Aprende lo básico en menos de 3 minutos: el tablero, las notas y las dos técnicas principales.',{label:'Ver el tutorial',run:openTut});
   tip('🌱','idea','Juega en Fácil','Termina 3 partidas para que pueda analizar tu estilo y darte consejos personalizados.',{label:'Jugar ahora',run:()=>{window.SudomiCore&&SudomiCore.ui.showDifficultyPicker()}});
   if(!todayDone)tip('📅','idea','Prueba el Sudoku del día','Un reto nuevo cada día. Cada día completado suma una estrella y arma tu racha.',{label:'Abrir calendario',run:()=>window.SudomiDaily&&SudomiDaily.open()});
   out.grade='Aprendiz';out.gradeText='Todavía no tengo suficientes partidas para evaluarte.';return out;
  }
  // accuracy
  const errs=avg(rw.map(g=>g.e)),flaw=rw.length?rw.filter(g=>!g.e).length/rw.length:0;
  if(rw.length>=2){
   if(errs>=3)tip('🎯','warn','Cuida la precisión',`Cometes ${errs.toFixed(1)} errores por partida de media. Antes de poner un número, revisa su fila, columna y cuadro, y usa las notas cuando dudes.`,{label:'Repasar las notas',run:openTut});
   else if(flaw>=.6)tip('✨','good','Gran precisión',`El ${Math.round(flaw*100)} % de tus victorias recientes fue sin errores. ¡Eso es de maestro!`);
   else if(errs>=1)tip('🎯','idea','Afina la puntería',`Promedias ${errs.toFixed(1)} errores por partida. Intenta anotar candidatos en las casillas dudosas.`);
  }
  // hints
  const hints=avg(rw.map(g=>g.h));
  if(rw.length>=2){
   if(hints>=2)tip('💡','warn','Dependes mucho de las pistas',`Usas ${hints.toFixed(1)} pistas por partida. Prueba solo el Paso 1 de la pista inteligente: te dice dónde mirar y es gratis.`);
   else if(hints===0)tip('🧘','good','Sin ayuda','No usaste pistas en tus victorias recientes. Eso demuestra que ya lees el tablero por tu cuenta.');
  }
  // speed against the par time of each difficulty
  const ratios=rw.map(g=>g.s/(PAR[g.d]||900)).filter(x=>x>0);
  if(ratios.length>=2){
   const r=avg(ratios);
   if(r>.9)tip('⏱️','warn','Vas con calma… demasiada','Tardas cerca del tiempo de referencia del bonus. Empieza buscando números únicos (técnicas 1 y 2): resuelven la mayor parte del tablero.',{label:'Repasar técnicas',run:openTut});
   else if(r<.4)tip('🚀','good','¡Qué velocidad!','Resuelves en menos del 40 % del tiempo de referencia. Estás listo para un reto mayor.');
   else tip('⏱️','idea','Buen ritmo',`Tu tiempo medio es ${clock(avg(rw.map(g=>g.s)))}. Para ganar más bonus de tiempo, anota candidatos mientras lees el tablero.`);
  }
  // trend: last 3 wins against the 3 before
  if(wins.length>=6){
   const rel=g=>g.s/(PAR[g.d]||900),last=avg(wins.slice(-3).map(rel)),prev=avg(wins.slice(-6,-3).map(rel));
   if(prev&&last<prev*.85)tip('📈','good','¡Estás mejorando!',`Tus últimas 3 victorias fueron un ${Math.round((1-last/prev)*100)} % más rápidas que las 3 anteriores.`);
   else if(prev&&last>prev*1.2)tip('📉','idea','Una pausa corta ayuda','Tus últimos tiempos subieron un poco. Prueba el Sudoku del día o un nivel más fácil para recuperar el ritmo.');
  }
  // which difficulty next
  const by={};for(const k of DIFFS){const gs=games.filter(g=>g.d===k);by[k]={n:gs.length,w:gs.filter(g=>g.w).length}}
  const top=[...DIFFS].reverse().find(k=>by[k].n>=3);
  if(top){
   const rate=by[top].w/by[top].n,i=DIFFS.indexOf(top),nextK=DIFFS[i+1];
   if(rate>=.8&&nextK&&unlocked(nextK))tip('🆙','idea',`Prueba ${DN[nextK]}`,`Ganas el ${Math.round(rate*100)} % de tus partidas en ${DN[top]}. Es momento de subir un escalón.`,{label:`Jugar ${DN[nextK]}`,run:()=>startDiff(nextK)});
   else if(rate>=.8&&nextK&&!unlocked(nextK))tip('🔒','idea',`${DN[nextK]} está cerca`,`Dominas ${DN[top]}. Sigue sumando XP: ${DN[nextK]} se desbloquea en el nivel ${SudomiXP.unlockLevels[nextK]}.`);
   else if(rate<.4&&i>0)tip('🧩','warn',`Refuerza ${DN[DIFFS[i-1]]}`,`En ${DN[top]} ganas el ${Math.round(rate*100)} %. Practica un nivel abajo para afianzar las técnicas.`,{label:`Jugar ${DN[DIFFS[i-1]]}`,run:()=>startDiff(DIFFS[i-1])});
  }
  // losses on hard levels
  const hardLoss=games.slice(-10).filter(g=>!g.w&&['hard','expert','master','extreme'].includes(g.d)).length;
  if(hardLoss>=2)tip('🛑','warn','Cuidado con los 3 errores',`Perdiste ${hardLoss} de tus últimas partidas altas por llegar a 3 errores. Ve más despacio y comprueba cada número antes de ponerlo.`);
  // technique study for tough levels with hints
  if(top&&DIFFS.indexOf(top)>=2&&hints>=1)tip('🧠','idea','Estudia las técnicas avanzadas','En niveles altos hacen falta pares, tríos y X-Wing. El tutorial los explica con ejemplos interactivos.',{label:'Abrir tutorial',run:openTut});
  // daily habit
  if(!todayDone)tip('📅','idea',dailyStreak?`Salva tu racha de ${dailyStreak} ${dailyStreak===1?'día':'días'}`:'Haz el Sudoku del día','Un reto diario es la mejor forma de mejorar con constancia.',{label:'Abrir calendario',run:()=>window.SudomiDaily&&SudomiDaily.open()});
  else if(dailyStreak>=3)tip('🔥','good',`Racha de ${dailyStreak} días`,'La constancia te hace mejorar más que cualquier truco. ¡Sigue así!');
  // closest goal
  const A=window.SudomiAch;
  if(A){const st=A.stats,have=A.unlocked();
   const goals=[['w10','Gana 10 sudokus',st.wins,10],['w50','Gana 50 sudokus',st.wins,50],['combo15','Logra un combo de 15',st.maxCombo,15],['combo40','Logra un combo de 40',st.maxCombo,40],['score3000','Pasa los 3,000 puntos',st.bestScore,3000]].filter(g=>!have[g[0]]&&g[2]<g[3]).sort((a,b)=>b[2]/b[3]-a[2]/a[3]);
   if(goals[0])tip('🏆','idea','Tu próxima meta',`${goals[0][1]}: vas ${Math.round(goals[0][2])} de ${goals[0][3]}.`,{label:'Ver logros',run:()=>A.open()})}
  // grade 0–100: accuracy 40, hints 20, speed 25, win share 15
  const score=Math.max(0,Math.min(100,Math.round(40*(1-Math.min(errs,5)/5)+20*(1-Math.min(hints,4)/4)+25*(ratios.length?Math.max(0,1-avg(ratios)):.4)+15*(wins.length/games.length))));
  out.score=score;out.grade=score>=80?'Maestro':score>=60?'Avanzado':score>=40?'Intermedio':'En progreso';
  out.gradeText=score>=80?'Juegas con precisión, ritmo y poca ayuda.':score>=60?'Buen nivel: pequeños ajustes te harán subir.':score>=40?'Vas por buen camino. Los consejos de abajo te ayudarán.':'Todo gran jugador empezó así. ¡Sigue practicando!';
  return out;
 }
 function startDiff(k){const u=window.SudomiCore&&SudomiCore.ui;if(!u)return;u.game.newGame(k);u.openGame()}
 // ---- screen
 function open(){
  let s=$('#coachScreen');
  if(!s){s=document.createElement('div');s.id='coachScreen';s.className='tut ach-screen hidden';s.setAttribute('role','dialog');s.setAttribute('aria-modal','true');
   s.innerHTML='<div class="tut-card ach-card"><header><h2 class="tut-title ach-title">🧑‍🏫 Maestro Sudomi</h2><button type="button" class="tut-x" aria-label="Cerrar">✕</button></header><div class="tut-body ach-body"></div></div>';
   document.body.appendChild(s);s.querySelector('.tut-x').onclick=close;s.addEventListener('click',e=>{if(e.target===s)close()});
   document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!s.classList.contains('hidden'))close()});}
  s.classList.remove('hidden');document.body.classList.add('tut-open');draw();
 }
 function close(){const s=$('#coachScreen');if(s)s.classList.add('hidden');document.body.classList.remove('tut-open')}
 function draw(){
  const s=$('#coachScreen');if(!s)return;const a=analyse(),body=s.querySelector('.ach-body');
  const head=`<div class="co-head"><div class="co-avatar">🧑‍🏫</div><div class="co-say"><b>${a.name?`¡Hola, ${a.name}!`:'¡Hola, campeón!'}</b><p>${a.games<3?'Soy tu Maestro Sudomi. Te ayudaré a mejorar paso a paso.':`He revisado tus últimas ${Math.min(a.games,12)} partidas.`}</p></div></div>
   <div class="co-grade"><div><small>TU NIVEL DE JUEGO</small><b>${a.grade}</b><p>${a.gradeText}</p></div>${a.score!==undefined?`<div class="co-ring" style="--p:${a.score}"><b>${a.score}</b></div>`:''}</div>`;
  const list=a.tips.map((t,i)=>`<div class="co-tip ${t.tone}"><span class="co-ic">${t.icon}</span><div><b>${t.title}</b><p>${t.text}</p>${t.action?`<button type="button" class="co-act" data-i="${i}">${t.action.label}</button>`:''}</div></div>`).join('');
  body.innerHTML=`${head}<h3 class="ach-group">Consejos para ti</h3>${list||'<p class="st-none">¡Todo va muy bien! Sigue jugando.</p>'}<p class="st-note">Los consejos se calculan con tus partidas, tus errores, tus pistas y tus tiempos. Cambian a medida que juegas.</p>`;
  body.querySelectorAll('.co-act').forEach(b=>b.onclick=()=>{const t=a.tips[+b.dataset.i];if(t&&t.action){close();setTimeout(t.action.run,50)}});
 }
 // ---- entry points
 function boot(){
  const dd=$('#homeDropdown');
  if(dd&&!$('#openCoach')){const b=document.createElement('button');b.id='openCoach';b.type='button';b.className='dropdown-option';b.innerHTML='<span>🧑‍🏫</span><strong>Maestro Sudomi</strong><small>Consejos</small>';b.onclick=()=>{dd.classList.add('hidden');const t=$('#homeMenuBtn');if(t)t.setAttribute('aria-expanded','false');open()};dd.appendChild(b)}
  // a button at the top of the Estadísticas screen
  new MutationObserver(()=>{
   const sc=$('#statsScreen'),st=sc&&sc.querySelector('.ach-body');
   if(st&&!st.querySelector('.co-link')){st.insertAdjacentHTML('afterbegin','<button type="button" class="co-link">🧑‍🏫 Pedir consejos al Maestro Sudomi <i>›</i></button>');
    st.querySelector('.co-link').onclick=()=>{sc.classList.add('hidden');document.body.classList.remove('tut-open');open()}}
  }).observe(document.body,{childList:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
 window.SudomiCoach={open,analyse};
})();
