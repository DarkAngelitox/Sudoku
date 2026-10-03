/* SUDOMI 0.2.40 — Phase 9: score. Points for good moves, line bonuses, combos and multipliers, penalties for errors and hints.
 *   Correct number ........ 10 × difficulty × combo      (each cell scores once, so undo/redo cannot farm points)
 *   Combo ................. every correct move in a row adds +0.1 to the multiplier (max ×2.0); an error resets it
 *   Row / column / box ..... +50 × difficulty             (+30 × difficulty when the 9th copy of a digit is placed)
 *   Error ................. −50   ·   Hint (step 2) −30   (the score never goes below 0)
 *   Finish ................ time bonus (against a "par" time per difficulty) + 100 with no errors + 100 with no hints
 * Difficulty multiplier: Fácil ×1 · Medio ×1.25 · Difícil ×1.5 · Experto ×2 · Maestro ×2.5 · Extremo ×3.
 * It only WATCHES the game: it wraps ui.render() and compares the board with the previous one. js/app.js is not changed.
 * State per puzzle is kept in localStorage['sudomi-score'] (last 12 puzzles) so a game continues with its score after a reload;
 * best scores per difficulty in localStorage['sudomi-score-best']. */
(()=>{
 const C=window.SudomiCore;if(!C)return;
 const ui=C.ui,$=s=>document.querySelector(s),KEY='sudomi-score',BEST='sudomi-score-best';
 const MULT={easy:1,medium:1.25,hard:1.5,expert:2,master:2.5,extreme:3};
 const PAR={easy:420,medium:600,hard:900,expert:1200,master:1500,extreme:1800};
 const COMBO_STEP=.1,COMBO_MAX=2;
 const fmt=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,',');
 const load=()=>{try{const v=JSON.parse(localStorage.getItem(KEY));return v&&typeof v==='object'?v:{}}catch(_){return {}}};
 const store=db=>{try{const k=Object.keys(db);if(k.length>12)k.slice(0,k.length-12).forEach(x=>delete db[x]);localStorage.setItem(KEY,JSON.stringify(db))}catch(_){}};
 const bests=()=>{try{return JSON.parse(localStorage.getItem(BEST))||{}}catch(_){return {}}};
 const fresh=g=>({score:0,combo:0,maxCombo:0,cells:[],units:[],digits:[],prev:g.board.join(''),errors:g.errors,hints:g.hints,lines:0,final:null});
 let db=load(),S=null,sig='',msgTimer=null,skipCells=new Set();
 const unitsOf=i=>{const r=Math.floor(i/9),c=i%9,b=Math.floor(r/3)*3+Math.floor(c/3);return [['r'+r,[...Array(9).keys()].map(x=>r*9+x)],['c'+c,[...Array(9).keys()].map(x=>x*9+c)],['b'+b,[...Array(9).keys()].map(x=>(Math.floor(b/3)*3+Math.floor(x/3))*9+(b%3)*3+x%3)]]};
 const UNIT_NAME={r:'Fila',c:'Columna',b:'Cuadro'};
 // ---- bar on the game screen
 function bar(){
  let b=$('#scoreBar');
  if(!b){b=document.createElement('div');b.id='scoreBar';b.className='score-bar';b.setAttribute('aria-live','polite');
   b.innerHTML='<span class="sb-score"><i>⭐</i><b>0</b></span><span class="sb-combo"></span><span class="sb-msg"></span>';
   const sb=$('.statsbar');sb.parentNode.insertBefore(b,sb.nextSibling)}
  return b;
 }
 function paint(msg,cls){
  const b=bar(),c=S.combo,m=1+Math.min(Math.max(c-1,0)*COMBO_STEP,COMBO_MAX-1);
  b.querySelector('.sb-score b').textContent=fmt(S.score);
  const cb=b.querySelector('.sb-combo');cb.textContent=c>=2?`🔥 Combo ×${m.toFixed(1)}`:'';cb.classList.toggle('on',c>=2);
  if(msg){const e=b.querySelector('.sb-msg');e.textContent=msg;e.className='sb-msg show '+(cls||'');clearTimeout(msgTimer);msgTimer=setTimeout(()=>e.classList.remove('show'),2200)}
 }
 // ---- the watcher
 function update(){
  const g=ui.game;if(!g||!g.puzzle)return;
  const nsig=g.puzzle.join('');
  if(nsig!==sig){sig=nsig;S=db[sig]||(db[sig]=fresh(g));skipCells=new Set()}
  // restartSame(): same puzzle, board back to the start
  if(g.board.every((v,i)=>v===g.puzzle[i])&&g.seconds===0&&(S.cells.length||S.score||S.final)){S=db[sig]=fresh(g);skipCells=new Set()}
  const mult=MULT[g.difficulty]||1,prev=S.prev.split('').map(Number),cur=g.board;
  const added=[];for(let i=0;i<81;i++)if(cur[i]&&cur[i]!==prev[i])added.push(i);   // filled, or a wrong number replaced by another
  const dErr=g.errors-S.errors,dHint=g.hints-S.hints;let msg='',cls='',fb='';
  if(dHint>0){S.score=Math.max(0,S.score-30*dHint);msg=`Pista −${30*dHint}`;cls='bad';fb='hint'}
  if(dErr>0){S.score=Math.max(0,S.score-50*dErr);S.combo=0;msg=`Error −${50*dErr}`;cls='bad';fb='bad'}
  if(added.length<=2&&!S.final){
   const player=[];
   for(const i of added){
    if(cur[i]!==g.solution[i]||S.cells.includes(i))continue;
    S.cells.push(i);
    if(skipCells.has(i)){skipCells.delete(i);continue}           // filled by a hint: no points, no bonuses
    S.combo++;S.maxCombo=Math.max(S.maxCombo,S.combo);
    const cm=1+Math.min((S.combo-1)*COMBO_STEP,COMBO_MAX-1),pts=Math.round(10*mult*cm);
    S.score+=pts;player.push(i);msg=`+${pts}`;cls='good';fb='good';
   }
   // bonuses: a row, column or box finished by the player's move, the 9th copy of a digit
   const extra=[];
   for(const i of player){
    for(const [id,cells] of unitsOf(i)){
     if(S.units.includes(id)||!cells.every(x=>cur[x]===g.solution[x]))continue;
     S.units.push(id);S.lines++;const b=Math.round(50*mult);S.score+=b;extra.push(`${UNIT_NAME[id[0]]} completa +${b}`);
    }
    const d=cur[i];
    if(!S.digits.includes(d)&&cur.filter((v,x)=>v===d&&g.solution[x]===d).length===9){S.digits.push(d);const b=Math.round(30*mult);S.score+=b;extra.push(`¡Los nueve ${d}! +${b}`)}
   }
   if(extra.length){msg=extra.join(' · ');cls='bonus';fb='bonus'}
  }
  S.prev=cur.join('');S.errors=g.errors;S.hints=g.hints;
  store(db);paint(msg,cls);
  if(fb)window.dispatchEvent(new CustomEvent('sudomi-feedback',{detail:{type:fb,combo:S.combo}}));   // 0.2.44: js/sound.js listens
 }
 // ---- finish: bonuses + summary in the win dialog
 function finish(e){
  const g=ui.game;if(!g)return;update();
  if(S.final)return;
  const d=e.detail||{},mult=MULT[g.difficulty]||1,par=PAR[g.difficulty]||900;
  const timeB=Math.round(500*mult*Math.max(0,1-(d.seconds||g.seconds)/par)),noErr=(d.errors||0)===0?100:0,noHint=g.hints===0?100:0;
  const play=S.score,total=play+timeB+noErr+noHint,all=bests(),old=all[g.difficulty]||0,rec=total>old;
  S.final={play,timeB,noErr,noHint,total};S.score=total;
  if(rec){all[g.difficulty]=total;try{localStorage.setItem(BEST,JSON.stringify(all))}catch(_){}}
  store(db);paint('');
  const label=C.DIFFICULTIES[g.difficulty].label;
  const html=`<div class="score-sum"><h4>⭐ Puntuación</h4><table><tr><td>Jugadas, combos y líneas</td><td>${fmt(play)}</td></tr><tr><td>Bonus de tiempo</td><td>+${fmt(timeB)}</td></tr><tr><td>Sin errores</td><td>${noErr?'+100':'—'}</td></tr><tr><td>Sin pistas</td><td>${noHint?'+100':'—'}</td></tr><tr class="sum-total"><td>Total</td><td>${fmt(total)}</td></tr></table><p>${rec?`🏆 <b>¡Nuevo récord en ${label}!</b>`:`Tu récord en ${label}: <b>${fmt(old)}</b>`} · Mejor combo: <b>${S.maxCombo}</b></p></div>`;
  setTimeout(()=>{const m=$('#modal .modal-card');if(m&&!m.querySelector('.score-sum')){const p=m.querySelector('p');if(p)p.insertAdjacentHTML('afterend',html)}},0);
 }
 const orig=ui.render.bind(ui);
 ui.render=function(){orig();try{update()}catch(err){console.error('score',err)}};
 window.addEventListener('sudomi-win',finish);
 bar();try{update()}catch(_){}
 window.SudomiScore={skip:i=>skipCells.add(i),get state(){return S},best:bests};
})();
