/* SUDOMI 0.2.53 — "Modo Profesor": the teacher solves a whole sudoku step by step and explains every move.
 * Pick a difficulty (Fácil / Medio / Difícil); the teacher shows where to look (step 1), then WHY (step 2, with the blocking numbers in blue),
 * then places the number. It uses the same finder as the 💡 button (js/smart-hints.js): naked singles and hidden singles. When the board needs a
 * technique beyond those, the teacher says so (pairs, X-Wing…) and places the number from the solution so the lesson can continue.
 * Controls: "Ver por qué", "Colocar y seguir", "Paso atrás", "Otro sudoku". Nothing here changes the player's own game or earns XP. */
(()=>{
 const S=window.SudomiScreen,C=window.SudomiCore,H=()=>window.SudomiSmartHints;if(!S||!C)return;
 const LEVELS=[['easy','Fácil'],['medium','Medio'],['hard','Difícil']];
 function open(){
  S.open('teachScreen','👨‍🏫 Modo Profesor',(body,api)=>{
   body.innerHTML=`<div class="co-head"><div class="co-avatar">👨‍🏫</div><div class="co-say"><b>¡Bienvenido a mi clase!</b><p>Yo resuelvo un sudoku completo y te explico cada paso.</p></div></div><h3 class="ach-group">Elige la dificultad</h3><div class="tr-cards">${LEVELS.map(([k,l])=>`<button type="button" class="tr-card" data-d="${k}"><span>${k==='easy'?'🌱':k==='medium'?'📚':'🧩'}</span><div><b>${l}</b><small>${k==='easy'?'Solo únicos: ideal para empezar.':k==='medium'?'Más casillas por resolver.':'Pocos números: verás cuándo hace falta una técnica avanzada.'}</small></div></button>`).join('')}</div>`;
   body.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>lesson(b.dataset.d,api));
  });
 }
 function lesson(diff,api){
  const body=api.body,{puzzle,solution}=C.generatePuzzle(diff),empties=puzzle.filter(v=>!v).length;
  let g={puzzle,solution,board:puzzle.slice(),selected:null},history=[],step=null,stage=1,placed=0;
  const h=H();
  const next=()=>{step=h.findFor(g);stage=1;draw()};
  const draw=()=>{
   const mark={},done=g.board.every((v,i)=>v===solution[i]);
   if(done){
    body.innerHTML=`<div class="tr-end"><span>🎓</span><h3>¡Sudoku resuelto!</h3><p>Resolvimos juntos ${placed} casillas. ¿Quieres otra clase?</p><div class="tr-act"><button type="button" id="tcAgain">Otro sudoku</button><button type="button" id="tcMenu">Menú</button></div></div>`;
    body.querySelector('#tcAgain').onclick=()=>lesson(diff,api);body.querySelector('#tcMenu').onclick=()=>api.redraw();return;
   }
   const d=h.describe(g,step,stage);
   (d.hl.unit||[]).forEach(i=>mark[i]='hl');(d.hl.block||[]).forEach(i=>mark[i]='block');(d.hl.target||[]).forEach(i=>mark[i]='target');
   let s='<div class="tg tr-grid">';
   for(let i=0;i<81;i++){const r=Math.floor(i/9),c=i%9,v=g.board[i];s+=`<span class="tc ${puzzle[i]?'tgiven':''} ${(c===2||c===5)?'tbr':''} ${(r===2||r===5)?'tbb':''} ${mark[i]||''}">${v||''}</span>`}
   s+='</div>';
   const pct=Math.round((empties-g.board.filter((v,i)=>!puzzle[i]&&v!==solution[i]).length)/empties*100);
   body.innerHTML=`<div class="tr-top"><b>Clase de ${LEVELS.find(l=>l[0]===diff)[1]}</b><span>Paso ${placed+1} · ${pct}%</span></div><div class="tc-bar"><i style="width:${pct}%"></i></div>${s}
   <div class="tc-say"><span>👨‍🏫</span><p>${d.text}</p></div>
   <div class="tc-btns">${stage===1&&step.type!=='wrong'?'<button type="button" id="tcWhy">Ver por qué</button>':''}<button type="button" id="tcPlace" class="main">${stage===1&&step.type!=='wrong'?'Colocar y seguir':`Colocar el ${step.digit} y seguir`}</button></div>
   <div class="tc-btns small"><button type="button" id="tcBack" ${history.length?'':'disabled'}>‹ Paso atrás</button><button type="button" id="tcNew">Otro sudoku</button></div>`;
   const why=body.querySelector('#tcWhy');if(why)why.onclick=()=>{stage=2;draw()};
   body.querySelector('#tcPlace').onclick=()=>{history.push(g.board.slice());g.board[step.cell]=solution[step.cell];placed++;if(window.SudomiSound)SudomiSound.play('tap');next()};
   body.querySelector('#tcBack').onclick=()=>{if(!history.length)return;g.board=history.pop();placed=Math.max(0,placed-1);next()};
   body.querySelector('#tcNew').onclick=()=>lesson(diff,api);
  };
  next();
 }
 function boot(){const b=document.getElementById('openTeacher'),dd=document.getElementById('homeDropdown');if(b)b.onclick=()=>{dd.classList.add('hidden');const t=document.getElementById('homeMenuBtn');if(t)t.setAttribute('aria-expanded','false');open()}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
 window.SudomiTeacher={open};
})();
