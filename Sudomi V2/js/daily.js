/* SUDOMI 0.2.32 — Sudoku del día, as a calendar.
 * Every date has its own puzzle, the same for everybody: the grid and the carving are driven by a seeded random generator
 * (the date), never by the clock. Past days and today can be played, future days are locked.
 * A finished day gets a star. A day left half-way keeps its progress (board, notes, errors, hints, time) and is offered again.
 * It starts through Game.startGiven() in js/app.js; a win arrives as the 'sudomi-win' event (detail.daily = date).
 * localStorage['sudomi-daily'] = {done:{'YYYY-MM-DD':{s:seconds,e:errors}}, prog:{'YYYY-MM-DD':{board,notes,errors,hints,seconds}}}
 * localStorage['sudomi-daily-puzzle'] = {'YYYY-MM-DD': {difficulty,puzzle,solution}} (the last few days, only a cache) */
(()=>{
 const C=window.SudomiCore;if(!C)return;
 const $=s=>document.querySelector(s),STORE='sudomi-daily',PUZ='sudomi-daily-puzzle';
 // Sun..Sat: the week gets harder towards the weekend
 const LEVELS=['expert','easy','medium','hard','medium','hard','expert'];
 const MONTHS=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
 const DAYNAMES=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
 const pad=n=>String(n).padStart(2,'0'),key=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
 const fromKey=k=>{const [y,m,d]=k.split('-').map(Number);return new Date(y,m-1,d)};
 const clock=s=>`${pad(Math.floor(s/60))}:${pad(s%60)}`;
 const read=()=>{try{const v=JSON.parse(localStorage.getItem(STORE));if(v&&v.done&&typeof v.done==='object')return {done:v.done,prog:v.prog&&typeof v.prog==='object'?v.prog:{}}}catch(_){}return {done:{},prog:{}}};
 const write=v=>{try{localStorage.setItem(STORE,JSON.stringify(v))}catch(_){}};
 const levelOf=k=>LEVELS[fromKey(k).getDay()];
 function seeded(seed){let a=0;for(const ch of 'sudomi-'+seed)a=(Math.imul(a,31)+ch.charCodeAt(0))>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
 function make(date){
  let cache={};try{cache=JSON.parse(localStorage.getItem(PUZ))||{}}catch(_){}
  const c=cache[date];if(c&&c.puzzle&&c.puzzle.length===81&&c.solution&&c.solution.length===81)return {date,...c};
  const difficulty=levelOf(date),cfg=C.DIFFICULTIES[difficulty],real=Math.random;let best=null;
  Math.random=seeded(date);
  try{
   for(let n=0;n<30;n++){
    const solution=C.generateSolution(),r=C.carve(solution,cfg,Infinity);
    if(!best||r.level>best.level||(r.level===best.level&&r.clues<best.clues))best={...r,solution};
    if(best.level>=cfg.min&&best.clues<=cfg.clues+3)break;
   }
  }finally{Math.random=real}
  cache[date]={difficulty,puzzle:best.puzzle,solution:best.solution};
  const keep=Object.keys(cache).sort().slice(-14),slim={};keep.forEach(k=>slim[k]=cache[k]);
  try{localStorage.setItem(PUZ,JSON.stringify(slim))}catch(_){}
  return {date,...cache[date]};
 }
 function streak(){
  const {done}=read();let d=new Date();if(!done[key(d)])d.setDate(d.getDate()-1);
  let n=0;while(done[key(d)]){n++;d.setDate(d.getDate()-1)}return n;
 }
 // 0.2.44 (Phase 13): best streak ever, and XP for reaching 3 / 7 / 14 / 30 days in a row
 function bestStreak(){const ks=Object.keys(read().done).sort();let best=0,run=0,prev=null;for(const k of ks){if(prev){const d=fromKey(prev);d.setDate(d.getDate()+1);run=key(d)===k?run+1:1}else run=1;best=Math.max(best,run);prev=k}return best}
 const STREAK_XP={3:30,7:80,14:150,30:400};
 function streakReward(){
  const n=streak(),xp=STREAK_XP[n];if(!xp)return;
  const start=new Date();start.setDate(start.getDate()-(n-1));const id=`${key(start)}:${n}`,v=read();v.paid=v.paid||[];
  if(v.paid.includes(id))return;v.paid.push(id);if(v.paid.length>60)v.paid.shift();write(v);
  if(window.SudomiXP)SudomiXP.award(xp);
  if(window.SudomiAch&&SudomiAch.toast)SudomiAch.toast({id:'streak',icon:'🔥',name:`Racha de ${n} días`,xp});
 }
 const best=()=>{const t=Object.values(read().done).map(x=>x.s).filter(Boolean);return t.length?Math.min(...t):0};
 // ---- progress of a day left half-way: saved every time the game saves (every move, and when leaving to the home screen)
 const g0=C.ui.game,origSave=g0.save.bind(g0);
 g0.save=function(){
  origSave();
  const d=g0.daily;if(!d||!g0.running)return;
  const v=read();if(v.done[d]&&!v.prog[d])return;            // a replay of a finished day is not kept
  v.prog[d]={board:[...g0.board],notes:g0.notes.map(s=>[...s]),errors:g0.errors,hints:g0.hints,seconds:g0.seconds};write(v);
 };
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&g0.daily&&g0.running)g0.save()});
 window.addEventListener('pagehide',()=>{if(g0.daily&&g0.running)g0.save()});
 const hasProg=(v,k)=>{const p=v.prog[k];return !!(p&&Array.isArray(p.board)&&p.board.length===81&&(p.errors|0)<3)};
 function status(k,v=read()){return v.done[k]?'done':hasProg(v,k)?'prog':'new'}
 function refresh(){
  const b=$('#homeDaily');if(!b)return;const v=read(),t=key(new Date()),st=status(t,v),n=streak();
  const month=t.slice(0,7),stars=Object.keys(v.done).filter(k=>k.startsWith(month)).length;
  b.querySelector('small').textContent=st==='done'?`Completado hoy · 🔥 ${n} ${n===1?'día':'días'}`:n?`⚠️ ¡No pierdas tu racha de ${n} ${n===1?'día':'días'}!`:st==='prog'?'Tienes el de hoy a medias':stars?`${stars} ${stars===1?'estrella':'estrellas'} este mes`:'Calendario de retos diarios';
  const badge=b.querySelector('.dev-badge');badge.textContent=st==='done'?'⭐ Hecho':st==='prog'?'A medias':'Hoy';b.classList.toggle('daily-done',st==='done');
 }
 // ---- the calendar
 let view=null,picked=null;
 function open(){const t=new Date();view={y:t.getFullYear(),m:t.getMonth()};picked=key(t);draw()}
 function draw(){
  const v=read(),today=key(new Date()),first=new Date(view.y,view.m,1),days=new Date(view.y,view.m+1,0).getDate();
  const lead=(first.getDay()+6)%7;                          // weeks start on Monday
  const stars=Object.keys(v.done).filter(k=>k.startsWith(`${view.y}-${pad(view.m+1)}`)).length,n=streak(),bt=best();
  const t0=new Date();const minOk=!(view.y===t0.getFullYear()-1&&view.m===t0.getMonth()),maxOk=!(view.y===t0.getFullYear()&&view.m===t0.getMonth());
  let cells='';for(let i=0;i<lead;i++)cells+='<span class="cal-empty"></span>';
  for(let d=1;d<=days;d++){
   const k=`${view.y}-${pad(view.m+1)}-${pad(d)}`,st=status(k,v),future=k>today;
   cells+=`<button type="button" class="cal-day ${st} ${k===today?'today':''} ${k===picked?'picked':''}" data-k="${k}" ${future?'disabled':''} aria-label="${d} de ${MONTHS[view.m]}${st==='done'?', completado':st==='prog'?', a medias':''}"><b>${d}</b><i>${st==='done'?'★':st==='prog'?'●':''}</i></button>`;
  }
  const m=$('#modal');
  m.innerHTML=`<div class="modal-card difficulty-dialog daily-dialog"><button class="picker-close" id="dailyClose" aria-label="Cerrar">×</button><p class="picker-kicker">RETOS DIARIOS</p><h2>Sudoku del día</h2>
  <div class="daily-stats"><div><small>ESTE MES</small><strong>${stars} ★</strong></div><div><small>RACHA</small><strong>${n} 🔥</strong><em class="daily-best">mejor: ${bestStreak()}</em></div><div><small>MEJOR TIEMPO</small><strong>${bt?clock(bt):'—'}</strong></div></div>
  <div class="cal-head"><button type="button" id="calPrev" aria-label="Mes anterior" ${minOk?'':'disabled'}>‹</button><strong>${MONTHS[view.m]} ${view.y}</strong><button type="button" id="calNext" aria-label="Mes siguiente" ${maxOk?'':'disabled'}>›</button></div>
  <div class="cal-week"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
  <div class="cal-grid">${cells}</div>
  <div class="cal-legend"><span><i class="star">★</i> Completado</span><span><i class="dot">●</i> A medias</span></div>
  <div id="calPanel"></div><button class="picker-back" id="dailyBack">Volver</button></div>`;
  m.classList.remove('hidden');
  $('#dailyClose').onclick=$('#dailyBack').onclick=C.hideModal;
  $('#calPrev').onclick=()=>{view.m--;if(view.m<0){view.m=11;view.y--}if(!picked||picked.slice(0,7)!==`${view.y}-${pad(view.m+1)}`)picked=null;draw()};
  $('#calNext').onclick=()=>{view.m++;if(view.m>11){view.m=0;view.y++}if(!picked||picked.slice(0,7)!==`${view.y}-${pad(view.m+1)}`)picked=null;draw()};
  m.querySelectorAll('.cal-day').forEach(b=>b.onclick=()=>{picked=b.dataset.k;m.querySelectorAll('.cal-day').forEach(x=>x.classList.toggle('picked',x===b));panel()});
  panel();
 }
 function panel(){
  const box=$('#calPanel');if(!box)return;
  if(!picked){box.innerHTML='<p class="cal-hint">Toca un día para jugarlo.</p>';return}
  const v=read(),st=status(picked,v),d=fromKey(picked),diff=C.DIFFICULTIES[levelOf(picked)];
  const g=C.ui.game,live=g.daily===picked&&g.running&&C.ui.currentGameExists;
  const label=`${DAYNAMES[d.getDay()]} ${d.getDate()} de ${MONTHS[d.getMonth()].toLowerCase()}`;
  const p=v.prog[picked],rec=v.done[picked];
  const main=st==='done'?['Jugar otra vez',`Completado en ${clock(rec.s)} · ${rec.e} ${rec.e===1?'error':'errores'}`]:st==='prog'||live?['Continuar',`A medias · ${clock(live?g.seconds:p.seconds)}`]:['Jugar este día','Mismo sudoku para todos'];
  const warn=g.running&&C.ui.currentGameExists&&!g.daily&&st!=='done'?'<p class="daily-note">Tu partida actual se reemplazará (la del día se guarda aparte).</p>':'';
  box.innerHTML=`<div class="cal-panel"><div class="cal-panel-top"><strong>${label}</strong><span>${diff.label}${st==='done'?' · ★':''}</span></div>${warn}<button class="play-button daily-play" id="dailyPlay"><span class="play-icon">${st==='done'?'↻':'▶'}</span><span><strong>${main[0]}</strong><small>${main[1]}</small></span><span class="play-chevron">›</span></button></div>`;
  $('#dailyPlay').onclick=()=>play(picked,st);
 }
 function play(k,st){
  if(C.ui.game.daily===k&&C.ui.game.running&&C.ui.currentGameExists&&st!=='done'){C.hideModal();C.ui.openGame();return}
  const btn=$('#dailyPlay');btn.disabled=true;btn.querySelector('strong').textContent='Preparando…';btn.querySelector('small').textContent='Armando el sudoku';
  setTimeout(()=>{
   let p;try{p=make(k)}catch(e){console.error(e);btn.disabled=false;btn.querySelector('strong').textContent='No se pudo preparar';return}
   const g=C.ui.game;if(g.daily&&g.running)g.save();            // keep the day we are leaving
   const v=read(),saved=v.prog[k],ok=hasProg(v,k);               // read before startGiven, which writes a fresh entry
   g.startGiven(p.difficulty,p.puzzle,p.solution,k);
   if(st==='prog'&&saved&&ok){g.restore(saved);g.paused=false;g.save();C.ui.render()}
   C.hideModal();C.ui.openGame();refresh();
  },60);
 }
 window.addEventListener('sudomi-win',e=>{
  const k=e.detail&&e.detail.daily;if(!k)return;const v=read();
  if(!v.done[k]){v.done[k]={s:e.detail.seconds,e:e.detail.errors};try{if(window.SudomiCoins)setTimeout(()=>SudomiCoins.add(SudomiCoins.DAILY,'Sudoku del día'),1500)}catch(_){}}   // 0.3.38: la primera vez que se cumple ese día da monedas (js/shop.js)
  delete v.prog[k];write(v);refresh();
  if(k===key(new Date()))streakReward();
 });
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
 const btn=$('#homeDaily');if(btn)btn.onclick=open;
 refresh();
 window.SudomiDaily={open,refresh,streak,bestStreak,make};
})();
