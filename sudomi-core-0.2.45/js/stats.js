/* SUDOMI 0.2.43 — Phase 12: statistics. Opened from the "Estadísticas" card on the home screen.
 * Every finished sudoku is one record {t, d(ifficulty), w(in), s(econds), e(rrors), h(ints), sc(ore), day(ily date)}: wins come from the
 * 'sudomi-win' event (once per puzzle), losses from wrapping ui.lose(). Everything on the screen is computed from that list (last 500).
 * Wins counted before this version (kept by js/achievements.js) are added once as a "seed" so the totals match the Logros screen;
 * averages only use the tracked games. Other games: the per-game wins that js/achievements.js already counts.
 * Storage: localStorage['sudomi-stats'] = {games:[…], seed:{byDiff:{…}, best:{…}}, counted:[puzzle ids]}. js/app.js is not changed. */
(()=>{
 const C=window.SudomiCore;if(!C)return;
 const ui=C.ui,$=s=>document.querySelector(s),KEY='sudomi-stats';
 const DIFFS=['easy','medium','hard','expert','master','extreme'],DN={easy:'Fácil',medium:'Medio',hard:'Difícil',expert:'Experto',master:'Maestro',extreme:'Extremo'};
 const GN={mines:'Buscaminas',fleet:'Batalla naval',chess:'Ajedrez',checkers:'Damas',tictactoe:'Tres en raya',connect4:'4 en línea',domino:'Dominó',memory:'Memoria de animales',dotsboxes:'Puntos y cajas',mahjong:'Duelo Mahjong',blackjack:'Blackjack',poker:'Póker',escoba:'Escoba',rummy:'Rummy'};
 const fmt=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,',');
 const clock=s=>{s=Math.round(s);return s>=3600?`${Math.floor(s/3600)}:${String(Math.floor(s%3600/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`:`${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`};
 const dur=s=>{const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?`${h} h ${m} min`:`${m} min`};
 const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
 let D=(()=>{try{const v=JSON.parse(localStorage.getItem(KEY));if(v&&Array.isArray(v.games))return {games:v.games,seed:v.seed||null,counted:v.counted||[]}}catch(_){}return {games:[],seed:null,counted:[]}})();
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(D))}catch(_){}};
 // one-time seed from the achievements counters (wins that happened before this screen existed)
 function seed(){
  if(D.seed)return;const A=window.SudomiAch&&SudomiAch.stats;
  D.seed={byDiff:{},best:{}};if(A&&A.wins){for(const k of DIFFS)D.seed.byDiff[k]=A.byDiff[k]||0;Object.assign(D.seed.best,A.bestTime||{})}
  save();
 }
 // ---- recording
 function add(rec){D.games.push(rec);if(D.games.length>500)D.games.shift();save();refresh()}
 window.addEventListener('sudomi-win',e=>{
  const g=ui.game,d=e.detail||{};if(!g)return;const sig=g.puzzle.join('');
  if(!D.seed){D.seed={byDiff:{},best:{}};save()}                       // never seed in the middle of a win
  if(D.counted.includes(sig))return;D.counted.push(sig);if(D.counted.length>150)D.counted.shift();
  const f=window.SudomiScore&&SudomiScore.state&&SudomiScore.state.final;
  add({t:Date.now(),d:g.difficulty,w:1,s:d.seconds||g.seconds||0,e:d.errors||0,h:g.hints||0,sc:f?f.total:0,day:d.daily||null});
 });
 const origLose=ui.lose.bind(ui);
 ui.lose=function(g){try{add({t:Date.now(),d:g.difficulty,w:0,s:g.seconds||0,e:g.errors||0,h:g.hints||0,sc:0,day:g.daily||null})}catch(_){}return origLose(g)};
 // ---- numbers
 function compute(){
  const G=D.games,S=D.seed||{byDiff:{},best:{}};
  const per={};
  for(const k of DIFFS){
   const gs=G.filter(x=>x.d===k),ws=gs.filter(x=>x.w),ls=gs.filter(x=>!x.w),sw=S.byDiff[k]||0;
   const times=ws.map(x=>x.s).filter(x=>x>0),best=Math.min(...times,S.best[k]||Infinity);
   per[k]={wins:ws.length+sw,losses:ls.length,played:gs.length+sw,tracked:ws.length,best:isFinite(best)?best:0,avgTime:avg(times),avgErr:avg(ws.map(x=>x.e)),avgHints:avg(ws.map(x=>x.h)),bestScore:Math.max(0,...ws.map(x=>x.sc)),avgScore:avg(ws.map(x=>x.sc).filter(x=>x>0))};
  }
  const wins=DIFFS.reduce((a,k)=>a+per[k].wins,0),losses=DIFFS.reduce((a,k)=>a+per[k].losses,0),played=wins+losses;
  const ordered=[...G].sort((a,b)=>a.t-b.t);let cur=0,best=0,run=0;for(const x of ordered){if(x.w){run++;best=Math.max(best,run)}else run=0}cur=run;
  const tracked=G.length;
  return {per,wins,losses,played,rate:played?Math.round(wins/played*100):0,time:G.reduce((a,x)=>a+x.s,0),errors:G.reduce((a,x)=>a+x.e,0),hints:G.reduce((a,x)=>a+x.h,0),curStreak:cur,bestStreak:best,tracked,recent:ordered.slice(-10).reverse()};
 }
 function refresh(){
  const b=$('#homeStats .dev-badge');if(b){try{const c=compute();b.textContent=c.wins?`${fmt(c.wins)} 🏆`:'Ver'}catch(_){}}
 }
 // ---- screen
 function open(){
  let s=$('#statsScreen');
  if(!s){s=document.createElement('div');s.id='statsScreen';s.className='tut ach-screen hidden';s.setAttribute('role','dialog');s.setAttribute('aria-modal','true');
   s.innerHTML='<div class="tut-card ach-card"><header><h2 class="tut-title ach-title">📊 Estadísticas</h2><button type="button" class="tut-x" aria-label="Cerrar">✕</button></header><div class="tut-body ach-body"></div></div>';
   document.body.appendChild(s);s.querySelector('.tut-x').onclick=close;s.addEventListener('click',e=>{if(e.target===s)close()});
   document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!s.classList.contains('hidden'))close()});}
  s.classList.remove('hidden');document.body.classList.add('tut-open');draw();
 }
 function close(){const s=$('#statsScreen');if(s)s.classList.add('hidden');document.body.classList.remove('tut-open')}
 function draw(){
  const s=$('#statsScreen');if(!s)return;const c=compute(),body=s.querySelector('.ach-body');
  let daily=0,streak=0;try{daily=Object.keys((JSON.parse(localStorage.getItem('sudomi-daily'))||{}).done||{}).length;streak=window.SudomiDaily?SudomiDaily.streak():0}catch(_){}
  const info=window.SudomiXP?SudomiXP.info:null,ow=window.SudomiAch?SudomiAch.stats.otherWins:{};
  const maxWins=Math.max(1,...DIFFS.map(k=>c.per[k].wins));
  const top=`<div class="st-hero"><div class="st-ring" style="--p:${c.rate}"><b>${c.rate}%</b><small>victorias</small></div><div class="st-hero-copy"><b>${fmt(c.wins)} <small>de ${fmt(c.played)} partidas</small></b><p>${fmt(c.wins)} victorias · ${fmt(c.losses)} derrotas</p>${info?`<p>Nivel ${info.L} · ${info.title}</p>`:''}</div></div>`;
  const cards=`<div class="st-cards"><div><b>${c.time?dur(c.time):'—'}</b><small>Tiempo jugado</small></div><div><b>${c.curStreak}</b><small>Racha de victorias</small></div><div><b>${c.bestStreak}</b><small>Mejor racha</small></div><div><b>${fmt(c.errors)}</b><small>Errores cometidos</small></div><div><b>${fmt(c.hints)}</b><small>Pistas usadas</small></div><div><b>${daily}</b><small>Días del Sudoku del día</small></div></div>`;
  const rows=DIFFS.map(k=>{const p=c.per[k];return `<div class="st-diff ${p.played?'':'empty'}"><div class="st-diff-top"><b>${DN[k]}</b><span>${fmt(p.wins)} victorias${p.losses?` · ${fmt(p.losses)} derrotas`:''}</span></div><div class="st-bar"><i style="width:${Math.round(p.wins/maxWins*100)}%"></i></div><div class="st-diff-grid"><span><small>Mejor tiempo</small><b>${p.best?clock(p.best):'—'}</b></span><span><small>Tiempo medio</small><b>${p.avgTime?clock(p.avgTime):'—'}</b></span><span><small>Errores (media)</small><b>${p.tracked?p.avgErr.toFixed(1):'—'}</b></span><span><small>Pistas (media)</small><b>${p.tracked?p.avgHints.toFixed(1):'—'}</b></span><span><small>Mejor puntuación</small><b>${p.bestScore?fmt(p.bestScore):'—'}</b></span><span><small>Puntuación media</small><b>${p.avgScore?fmt(p.avgScore):'—'}</b></span></div></div>`}).join('');
  const rec=c.recent.length?c.recent.map(x=>`<div class="st-rec ${x.w?'win':'loss'}"><span class="st-r-ic">${x.w?'✅':'❌'}</span><div><b>${DN[x.d]||x.d}${x.day?' · diario':''}</b><small>${new Date(x.t).toLocaleDateString('es-DO',{day:'numeric',month:'short'})} · ${clock(x.s)} · ${x.e} err · ${x.h} pistas</small></div><span class="st-r-sc">${x.w&&x.sc?fmt(x.sc):''}</span></div>`).join(''):'<p class="st-none">Todavía no hay partidas guardadas con detalle. ¡Juega un sudoku!</p>';
  const og=Object.entries(ow).sort((a,b)=>b[1]-a[1]);
  const others=og.length?`<div class="st-others">${og.map(([id,n])=>`<span>${GN[id]||id} <b>${n}</b></span>`).join('')}</div>`:'<p class="st-none">Aún no has terminado partidas en Otros juegos.</p>';
  body.innerHTML=`${top}${cards}<h3 class="ach-group">Por dificultad</h3>${rows}<h3 class="ach-group">Últimas partidas</h3>${rec}<h3 class="ach-group">Otros juegos <small>victorias</small></h3>${others}<p class="st-note">Los promedios usan las partidas guardadas desde que existen las estadísticas (${c.tracked}). Las victorias anteriores se suman al total.</p><button type="button" class="st-reset" id="stReset">Borrar estadísticas</button>`;
  const r=$('#stReset');let armed=false;r.onclick=()=>{if(!armed){armed=true;r.textContent='¿Seguro? Toca otra vez para borrar';r.classList.add('armed');setTimeout(()=>{armed=false;if(r.isConnected){r.textContent='Borrar estadísticas';r.classList.remove('armed')}},3500);return}
   D={games:[],seed:{byDiff:{},best:{}},counted:[]};save();refresh();draw()};
 }
 function boot(){const b=$('#homeStats');if(b)b.onclick=open;seed();refresh()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
 window.SudomiStats={open,compute,refresh,get games(){return D.games}};
})();
