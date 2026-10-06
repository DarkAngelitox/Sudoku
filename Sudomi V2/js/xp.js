/* SUDOMI 0.2.41 — Phase 10: XP and levels.
 *   XP is earned when you FINISH a sudoku: a base for the difficulty + score/25, and +40 the first time you finish a daily sudoku of a date.
 *   Level L needs 100 + 50·(L−1) XP to reach L+1 (cap 50). Each level band has a title (Novato … Gran Maestro SUDOMI).
 *   Difficulties unlock with the level: Fácil 1 · Medio 2 · Difícil 4 · Experto 7 · Maestro 10 · Extremo 14.
 *   The daily calendar ignores the lock. "Personalizar" has a switch to turn the lock off.
 * It only listens to the 'sudomi-win' event (after js/score.js has computed the final score) and decorates the difficulty picker.
 * localStorage['sudomi-xp'] = {xp, wins:[puzzle ids already paid], days:['YYYY-MM-DD'…], lock:true, log:[last 10 wins]}. js/app.js is not changed. */
(()=>{
 const C=window.SudomiCore;if(!C)return;
 const $=s=>document.querySelector(s),KEY='sudomi-xp';
 const BASE={easy:40,medium:60,hard:90,expert:130,master:180,extreme:250};
 const UNLOCK={easy:1,medium:2,hard:4,expert:7,master:10,extreme:14};
 const TITLES=[[1,'Novato'],[3,'Aprendiz'],[5,'Curioso del tablero'],[8,'Duro del sudoku'],[12,'Maestro de la lógica'],[17,'Tigre del tablero'],[25,'Leyenda dominicana'],[35,'Gran Maestro SUDOMI']];
 const MAXL=50,fmt=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,',');
 const need=L=>100+50*(L-1);
 const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY));if(v&&typeof v==='object')return {xp:+v.xp||0,wins:Array.isArray(v.wins)?v.wins:[],days:Array.isArray(v.days)?v.days:[],lock:v.lock!==false,log:Array.isArray(v.log)?v.log:[]}}catch(_){}return {xp:0,wins:[],days:[],lock:true,log:[]}};
 let D=read();const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(D))}catch(_){}};
 function levelOf(xp){let L=1,rest=xp;while(L<MAXL&&rest>=need(L)){rest-=need(L);L++}return {L,into:L>=MAXL?need(MAXL):rest,span:need(L)}}
 const titleOf=L=>TITLES.filter(t=>L>=t[0]).pop()[1];
 const info=()=>{const l=levelOf(D.xp);return {...l,title:window.SudomiAch&&SudomiAch.king?'👑 Rey del Sudomi':titleOf(l.L),xp:D.xp}};   // 0.2.42: the crown replaces the title
 const labelOf=k=>C.DIFFICULTIES[k]?C.DIFFICULTIES[k].label:k;
 const locked=k=>D.lock&&UNLOCK[k]>levelOf(D.xp).L;
 const nextUnlock=()=>{const L=levelOf(D.xp).L;return Object.entries(UNLOCK).filter(([,n])=>n>L).sort((a,b)=>a[1]-b[1])[0]};
 // ---- earning
 function award(e){
  const d=e.detail||{},g=C.ui.game;if(!g)return;
  const id=g.puzzle.join('');if(D.wins.includes(id))return;
  const fin=window.SudomiScore&&SudomiScore.state&&SudomiScore.state.final,total=fin?fin.total:0;
  const base=BASE[g.difficulty]||40,perf=Math.floor(total/25);let dayB=0;
  if(d.daily&&!D.days.includes(d.daily)){dayB=40;D.days.push(d.daily);if(D.days.length>400)D.days.shift()}
  const gain=base+perf+dayB,before=levelOf(D.xp).L;
  D.xp+=gain;D.wins.push(id);if(D.wins.length>80)D.wins.shift();
  const after=levelOf(D.xp).L;D.log.push({t:Date.now(),d:g.difficulty,xp:gain});if(D.log.length>10)D.log.shift();save();
  const unlocked=Object.entries(UNLOCK).filter(([,n])=>n>before&&n<=after).map(([k])=>labelOf(k));
  const newTitle=titleOf(after)!==titleOf(before)?titleOf(after):'';
  renderCard();
  if(after>before)window.dispatchEvent(new CustomEvent('sudomi-levelup',{detail:{level:after}}));   // 0.2.44: js/sound.js listens
  const html=`<div class="xp-sum"><h4>✨ Experiencia</h4><p class="xp-gain">+${fmt(gain)} XP</p><small>Base ${base} · puntuación +${perf}${dayB?` · sudoku del día +${dayB}`:''}</small>${after>before?`<div class="xp-up">🎉 <b>¡Subiste al nivel ${after}!</b>${newTitle?`<br>Nuevo título: <b>${newTitle}</b>`:''}${unlocked.length&&D.lock?`<br>🔓 Desbloqueaste: <b>${unlocked.join(', ')}</b>`:''}</div>`:`<div class="xp-bar"><i style="width:${Math.round(levelOf(D.xp).into/levelOf(D.xp).span*100)}%"></i></div><small>Nivel ${after} · ${fmt(levelOf(D.xp).into)} / ${fmt(levelOf(D.xp).span)} XP</small>`}</div>`;
  setTimeout(()=>{const m=$('#modal .modal-card');if(!m||m.querySelector('.xp-sum'))return;const anchor=m.querySelector('.score-sum')||m.querySelector('p');if(anchor)anchor.insertAdjacentHTML('afterend',html)},0);
 }
 window.addEventListener('sudomi-win',award);
 // ---- the difficulty picker: locked levels show a padlock and cannot be chosen
 function decoratePicker(){
  const m=$('#modal');if(!m)return;
  m.querySelectorAll('.difficulty-choice').forEach(b=>{
   const k=b.dataset.difficulty,lk=locked(k);b.classList.toggle('locked',lk);
   const arrow=b.querySelector('.difficulty-arrow');
   if(lk){if(arrow&&arrow.textContent!=='🔒')arrow.textContent='🔒';const s=b.querySelector('.difficulty-copy small');if(s&&!s.dataset.orig){s.dataset.orig=s.textContent;s.textContent=`Desbloquea en el nivel ${UNLOCK[k]}`}}
   b.setAttribute('aria-disabled',lk?'true':'false');
  });
 }
 document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('.difficulty-choice');if(!b||!locked(b.dataset.difficulty))return;
  e.preventDefault();e.stopImmediatePropagation();
  const s=b.querySelector('.difficulty-copy small');if(s){const t=s.textContent;s.textContent=`¡Sube al nivel ${UNLOCK[b.dataset.difficulty]} para jugarlo!`;setTimeout(()=>{if(s.isConnected)s.textContent=t},1800)}
 },true);
 function decorateSelect(){const s=$('#difficulty');if(!s)return;[...s.options].forEach(o=>{o.disabled=locked(o.value)})}
 // ---- level card on the home screen and the "Tu progreso" dialog
 function renderCard(){
  const sec=$('.explore-section');if(!sec)return;
  let c=$('#levelCard');
  if(!c){c=document.createElement('button');c.id='levelCard';c.type='button';c.className='level-card';sec.parentNode.insertBefore(c,sec);c.onclick=openProgress}
  const i=info(),nx=nextUnlock(),pct=Math.round(i.into/i.span*100);
  c.innerHTML=`<span class="lv-badge"><b>${i.L}</b><small>NIVEL</small></span><span class="lv-main"><strong>${i.title}</strong><span class="lv-bar"><i style="width:${pct}%"></i></span><small>${i.L>=MAXL?'Nivel máximo':`${fmt(i.into)} / ${fmt(i.span)} XP`}${D.lock&&nx?` · 🔓 ${labelOf(nx[0])} en el nivel ${nx[1]}`:''}</small></span><span class="lv-go">›</span>`;
 }
 function openProgress(){
  const i=info(),m=$('#modal');if(!m)return;
  const rows=Object.entries(UNLOCK).map(([k,n])=>`<tr class="${i.L>=n?'ok':''}"><td>${labelOf(k)}</td><td>Nivel ${n}</td><td>${i.L>=n||!D.lock?'✅':'🔒'}</td></tr>`).join('');
  const tt=TITLES.map(([n,t])=>`<li class="${i.L>=n?'ok':''}"><b>Nivel ${n}</b> · ${t}</li>`).join('');
  m.innerHTML=`<div class="modal-card difficulty-dialog xp-dialog"><button class="picker-close" id="xpClose" aria-label="Cerrar">×</button><p class="picker-kicker">TU PROGRESO</p><h2>Nivel ${i.L} · ${i.title}</h2>
   <div class="lv-bar big"><i style="width:${Math.round(i.into/i.span*100)}%"></i></div><p class="picker-description">${fmt(i.into)} / ${fmt(i.span)} XP para el nivel ${Math.min(i.L+1,MAXL)} · ${fmt(i.xp)} XP en total</p>
   <h3 class="xp-h">Cómo ganar XP</h3><p class="xp-how">Cada sudoku que termines da XP según su dificultad (Fácil 40 … Extremo 250) más tu puntuación ÷ 25. El primer sudoku del día de cada fecha da +40 extra.</p>
   <h3 class="xp-h">Dificultades</h3><table class="xp-table">${rows}</table>
   <h3 class="xp-h">Títulos</h3><ul class="xp-titles">${tt}</ul>
   <button class="picker-back" id="xpDone">Cerrar</button></div>`;
  m.classList.remove('hidden');$('#xpClose').onclick=$('#xpDone').onclick=C.hideModal;
 }
 const mo=new MutationObserver(decoratePicker);
 function boot(){const m=$('#modal');if(m)mo.observe(m,{childList:true,subtree:true});decorateSelect();renderCard();
  const origRender=C.ui.render.bind(C.ui);C.ui.render=function(){origRender();decorateSelect()}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
 window.SudomiXP={get info(){return info()},setLock(v){D.lock=!!v;save();decorateSelect();renderCard()},get lock(){return D.lock},unlockLevels:UNLOCK,award:x=>{D.xp+=x;save();renderCard()},reset(){D=read();D.xp=0;D.wins=[];D.days=[];save();renderCard()}};
})();
