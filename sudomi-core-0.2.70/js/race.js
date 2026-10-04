/* SUDOMI 0.2.48 — Phase 17, version 1: Multijugador → "Carrera de sudoku" against bots.
 * The "Multijugador" button sits next to "Jugar" on the home screen and opens its OWN full screen (#raceScreen): pick the difficulty and how many
 * of each bot you want (0–3 of each, up to 8 in total — three Yaritzas if you like). You and the bots get the same puzzle; whoever finishes first wins.
 * Your sudoku is played on the normal board; the bots are simulated: each one gets a finishing time when the race starts (empty cells × seconds
 * per cell of its character × difficulty factor × 0.85–1.15, + 20 s per simulated mistake) and its progress bar moves with YOUR game clock
 * (pausing pauses the race). Rules: no hints, notes allowed, any difficulty (the level lock does not apply), your ranking time = game seconds
 * + 20 s per error, 3 errors still lose on Difícil+. If a bot finishes first the race ends and you may keep playing.
 * Rewards: +30 XP for finishing, +60 more for winning; achievements in js/achievements.js. Stats: localStorage['sudomi-race']; the race in
 * progress: localStorage['sudomi-race-live']; the last setup: localStorage['sudomi-race-setup']. Version 2 (friends online, turn duel) is not here yet.
 * It only uses public pieces of the game (ui.game, 'sudomi-win', ui.lose); js/app.js is not changed. */
(()=>{
 const C=window.SudomiCore;if(!C)return;
 const ui=C.ui,$=s=>document.querySelector(s),LIVE='sudomi-race-live',STAT='sudomi-race',SETUP='sudomi-race-setup';
 const DIFFS=['easy','medium','hard','expert','master','extreme'],DN={easy:'Fácil',medium:'Medio',hard:'Difícil',expert:'Experto',master:'Maestro',extreme:'Extremo'};
 const DF={easy:1,medium:1.3,hard:1.7,expert:2.2,master:2.8,extreme:3.5};            // difficulty factor for the seconds per cell
 const RIVALS={
  palomo:{id:'palomo',name:'El Palomo',icon:'🐦',level:'Novato',spc:11,err:.10,desc:'Vuela bajito: lento y con sus errores, pero no se rinde.'},
  yaritza:{id:'yaritza',name:'Yaritza',icon:'👩‍🦱',level:'Normal',spc:7,err:.05,desc:'Constante y cuidadosa. Una rival pareja.'},
  tigre:{id:'tigre',name:'El Tigre',icon:'🐯',level:'Experto',spc:4.5,err:.015,desc:'Rápido y casi sin errores. ¡Hay que correr!'}
 };
 const ORDER=['palomo','yaritza','tigre'],MAX_EACH=3,MAX_TOTAL=8,PENALTY=20;
 const clock=s=>{s=Math.max(0,Math.round(s));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`};
 const rd=k=>{try{return JSON.parse(localStorage.getItem(k))||null}catch(_){return null}};
 const wr=(k,v)=>{try{if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
 const stats=()=>({played:0,wins:0,big:0,...(rd(STAT)||{})});
 let R=null;                                   // the race in progress: {sig, diff, rivals:[{id,label,errs,finish}], empties, ended}
 const myName=()=>(window.SudomiProfile&&SudomiProfile.safeName&&SudomiProfile.safeName())||'Tú';
 const myIcon=()=>(window.SudomiProfile&&SudomiProfile.avatar&&SudomiProfile.avatar())||'🙂';
 // ---- the setup screen (a whole page of its own)
 function openSetup(){
  let scr=$('#raceScreen');
  if(!scr){scr=document.createElement('section');scr.id='raceScreen';scr.className='race-screen hidden';scr.setAttribute('aria-label','Multijugador');document.body.appendChild(scr);
   document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!scr.classList.contains('hidden'))closeSetup()})}
  const saved=rd(SETUP)||{};
  let diff=DIFFS.includes(saved.diff)?saved.diff:'easy',cnt={palomo:0,yaritza:1,tigre:0,...(saved.cnt||{})};
  const total=()=>ORDER.reduce((a,k)=>a+cnt[k],0);
  const draw=()=>{
   const n=total();
   scr.innerHTML=`<div class="rs-shell"><header class="rs-head"><button type="button" class="games-back" id="rsBack">‹ <span>Inicio</span></button><div><p>MULTIJUGADOR</p><h1>🏁 Carrera de sudoku</h1></div></header>
   <p class="rs-intro">Mismo tablero para todos: gana quien lo termine primero. Sin pistas, y cada error suma ${PENALTY} segundos a tu tiempo.</p>
   <h2 class="rs-h">1 · Dificultad</h2><div class="race-diffs">${DIFFS.map(k=>`<button type="button" data-d="${k}" class="${k===diff?'on':''}">${DN[k]}</button>`).join('')}</div>
   <h2 class="rs-h">2 · Tus rivales <small>${n} de ${MAX_TOTAL}</small></h2>
   <div class="rs-bots">${ORDER.map(id=>{const r=RIVALS[id];return `<div class="rs-bot ${cnt[id]?'on':''}"><span class="ri">${r.icon}</span><div class="rb-info"><b>${r.name} <em>${r.level}</em></b><small>${r.desc}</small></div><div class="rs-step"><button type="button" data-m="${id}" aria-label="Quitar uno" ${cnt[id]<=0?'disabled':''}>−</button><b>${cnt[id]}</b><button type="button" data-p="${id}" aria-label="Agregar uno" ${cnt[id]>=MAX_EACH||n>=MAX_TOTAL?'disabled':''}>+</button></div></div>`}).join('')}</div>
   <p class="race-note">${n?`Carrera de ${n+1} jugadores: tú${ORDER.filter(k=>cnt[k]).map(k=>`, ${cnt[k]>1?cnt[k]+' '+RIVALS[k].name.replace(/^El /,'')+'s':RIVALS[k].name}`).join('')}.`:'Agrega al menos un rival.'}</p>
   <h2 class="rs-h">Más formas de jugar</h2>
   <div class="m-modes"><button type="button" id="rsFriends"><span>👥</span><div><b>Carrera con amigos</b><small>Crea una sala y compite online (2 a 4 jugadores).</small></div><i>›</i></button><button type="button" id="rsDuel"><span>⏱️</span><div><b>Duelo por turnos</b><small>Un tablero, dos jugadores, tiempo por jugada. Con un amigo o contra un bot.</small></div><i>›</i></button></div>
   <button class="rs-go" id="rsGo" ${n?'':'disabled'}><span>🏁</span><div><strong>¡A correr!</strong><small>${DN[diff]} · ${n} ${n===1?'rival':'rivales'}</small></div><i>›</i></button></div>`;
   $('#rsBack').onclick=closeSetup;
   $('#rsFriends').onclick=()=>{$('#raceScreen').classList.add('hidden');if(window.SudomiMulti)SudomiMulti.open('srace')};
   $('#rsDuel').onclick=()=>{$('#raceScreen').classList.add('hidden');if(window.SudomiMulti)SudomiMulti.open('sduel')};
   scr.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{diff=b.dataset.d;wr(SETUP,{diff,cnt});draw()});
   scr.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{cnt[b.dataset.m]=Math.max(0,cnt[b.dataset.m]-1);wr(SETUP,{diff,cnt});draw()});
   scr.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{if(total()<MAX_TOTAL)cnt[b.dataset.p]=Math.min(MAX_EACH,cnt[b.dataset.p]+1);wr(SETUP,{diff,cnt});draw()});
   $('#rsGo').onclick=()=>{if(!total())return;const list=[];ORDER.forEach(k=>{for(let i=0;i<cnt[k];i++)list.push(k)});closeSetup();start(diff,list)};
  };
  draw();$('#homeScreen').classList.add('hidden');scr.classList.remove('hidden');window.scrollTo(0,0);
 }
 function closeSetup(){const s=$('#raceScreen');if(s)s.classList.add('hidden');if(!$('#gameScreen')||$('#gameScreen').classList.contains('hidden'))$('#homeScreen').classList.remove('hidden')}
 // ---- the race
 function start(diff,ids){
  const g=ui.game;g.newGame(diff);                     // same puzzle for everybody; bypasses the level lock on purpose
  const empties=g.puzzle.filter(v=>!v).length,seen={};
  const rivals=ids.map(id=>{const r=RIVALS[id];seen[id]=(seen[id]||0)+1;
   const base=empties*r.spc*DF[diff]*(.85+Math.random()*.3),errs=Math.round(empties*r.err*Math.random()*2);
   return {id,errs,finish:Math.round(base+errs*PENALTY),n:seen[id]}});
  const count={};ids.forEach(id=>count[id]=(count[id]||0)+1);
  rivals.forEach(r=>{r.label=RIVALS[r.id].name+(count[r.id]>1?` ${r.n}`:'')});   // "Yaritza 1", "Yaritza 2"…
  R={sig:g.puzzle.join(''),diff,rivals,empties,ended:false};wr(LIVE,R);
  ui.openGame();hud();
  if(window.SudomiSound)SudomiSound.play('bonus');
 }
 function resume(){
  const s=rd(LIVE),g=ui.game;if(!s||!g||!g.puzzle)return;
  if(s.sig!==g.puzzle.join('')||!g.running||s.ended){wr(LIVE,null);return}
  R=s;hud();
 }
 function stop(clear=true){R=null;if(clear)wr(LIVE,null);const h=$('#raceBar');if(h)h.remove();document.body.classList.remove('racing')}
 // ---- HUD with the bots' bars
 function hud(){
  if(!R)return;
  document.body.classList.add('racing');
  let h=$('#raceBar');
  if(!h){h=document.createElement('div');h.id='raceBar';h.className='race-bar';const anchor=$('#scoreBar')||$('.statsbar');anchor.parentNode.insertBefore(h,anchor.nextSibling)}
  const g=ui.game,done=g.board.filter((v,i)=>!g.puzzle[i]&&v===g.solution[i]).length,mine=Math.min(100,Math.round(done/R.empties*100));
  const t=g.seconds,rows=[`<div class="rb-row me"><span class="rb-ic">${myIcon()}</span><b>${myName()}</b><span class="rb-track"><i style="width:${mine}%"></i></span><em>${mine}%</em></div>`]
   .concat(R.rivals.map(r=>{const p=Math.min(100,Math.round(t/r.finish*100)),f=t>=r.finish;return `<div class="rb-row ${f?'fin':''}"><span class="rb-ic">${RIVALS[r.id].icon}</span><b>${r.label}</b><span class="rb-track"><i style="width:${p}%"></i></span><em>${f?'🏁':p+'%'}</em></div>`}));
  h.innerHTML=`<div class="rb-top"><b>🏁 Carrera · ${DN[R.diff]}</b><button type="button" id="raceQuit">Abandonar</button></div>${rows.join('')}`;
  $('#raceQuit').onclick=()=>{stop();ui.render()};
 }
 // bots move with the game clock; the first to arrive ends the race
 setInterval(()=>{
  if(!R||R.ended)return;const g=ui.game;
  if(!g||!g.puzzle||g.puzzle.join('')!==R.sig){stop();return}               // a different game was started: the race is over
  if(!g.running)return;
  hud();
  const t=g.seconds,first=R.rivals.filter(r=>t>=r.finish).sort((a,b)=>a.finish-b.finish)[0];
  if(first&&!g.paused)rivalWins(first);
 },1000);
 function endStats(won,big){const s=stats();s.played++;if(won)s.wins++;if(won&&big)s.big++;wr(STAT,s);if(window.SudomiAch)setTimeout(()=>SudomiAch.check(),50)}
 function rivalWins(r){
  R.ended=true;wr(LIVE,null);endStats(false,false);
  const g=ui.game,def=RIVALS[r.id];g.paused=true;
  const m=$('#modal');
  m.innerHTML=`<div class="modal-card"><h2>${def.icon} ¡${r.label} terminó primero!</h2><p>${r.label} resolvió el tablero en <b>${clock(r.finish)}</b>. Tú ibas en <b>${clock(g.seconds)}</b>.</p><div class="modal-actions"><button class="primary-action" id="raceAgain">Nueva carrera</button><button class="secondary-action" id="raceKeep">Seguir jugando este sudoku</button></div></div>`;
  m.classList.remove('hidden');
  if(window.SudomiSound)SudomiSound.play('lose');
  $('#raceAgain').onclick=()=>{C.hideModal();stop(false);ui.openHome();openSetup()};
  $('#raceKeep').onclick=()=>{C.hideModal();g.paused=false;stop(false);ui.render()};
 }
 // you finished: ranking, XP, summary inside the win dialog
 window.addEventListener('sudomi-win',e=>{
  if(!R||R.ended)return;const g=ui.game;if(g.puzzle.join('')!==R.sig)return;
  R.ended=true;wr(LIVE,null);
  const d=e.detail||{},mine=(d.seconds||g.seconds)+PENALTY*(d.errors||0);
  const field=[{me:true,name:myName(),icon:myIcon(),t:mine}].concat(R.rivals.map(r=>({me:false,name:r.label,icon:RIVALS[r.id].icon,t:r.finish}))).sort((a,b)=>a.t-b.t);
  const place=field.findIndex(x=>x.me)+1,won=place===1,big=R.rivals.length>=3;
  const xp=30+(won?60:0);if(window.SudomiXP)SudomiXP.award(xp);
  endStats(won,big);
  const html=`<div class="race-sum ${won?'won':''}"><h4>${won?'🏆 ¡Ganaste la carrera!':`🏁 Llegaste en el puesto ${place} de ${field.length}`}</h4><table>${field.map((x,i)=>`<tr class="${x.me?'me':''}"><td>${i+1}.</td><td>${x.icon} ${x.name}</td><td>${clock(x.t)}</td></tr>`).join('')}</table><p>Tu tiempo incluye ${PENALTY} s por cada error (${d.errors||0}). +${xp} XP</p></div>`;
  setTimeout(()=>{const mo=$('#modal .modal-card');if(!mo||mo.querySelector('.race-sum'))return;const a=mo.querySelector('.xp-sum')||mo.querySelector('.score-sum')||mo.querySelector('p');if(a)a.insertAdjacentHTML('afterend',html)},30);
  stop(false);
 });
 const origLose=ui.lose.bind(ui);
 ui.lose=function(g){if(R&&!R.ended){R.ended=true;endStats(false,false);stop()}return origLose(g)};
 // no hints during the race
 document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('#hintBtn');if(!b||!R||R.ended)return;
  e.preventDefault();e.stopImmediatePropagation();
  const old=b.textContent;b.textContent='Sin pistas en la carrera';setTimeout(()=>{b.textContent=old},1400);
 },true);
 function boot(){
  const b=$('#homeMulti');if(b)b.onclick=openSetup;
  resume();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
 window.SudomiRace={open:openSetup,start,get active(){return !!R},get stats(){return stats()},rivals:RIVALS};
})();
