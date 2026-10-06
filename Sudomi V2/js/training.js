/* SUDOMI 0.2.53 — "Entrenamiento": quick drills to get better at the two basic techniques of the tutorial.
 *   Únicos posibles (naked single)  → "which number goes in the orange cell?"
 *   Únicos ocultos (hidden single)  → "where does the N go in this block / row / column?"
 *   Mezcla                          → both kinds, 10 questions
 *   Relámpago                       → 60 seconds, as many questions as you can
 * Each question is built from a REAL generated puzzle: some correct numbers are placed at random until the board has the wanted kind of
 * next step (found with js/smart-hints.js, the same finder the 💡 button uses), so the answer is always right and always explained.
 * Rewards: 5 XP per correct answer (+20 for 10/10); records in localStorage['sudomi-training'] = {naked, hidden, mixed, blitz, sessions}. */
(()=>{
 const S=window.SudomiScreen,H=()=>window.SudomiSmartHints,C=window.SudomiCore;if(!S||!C)return;
 const KEY='sudomi-training';
 const rd=()=>{try{return {sessions:0,naked:0,hidden:0,mixed:0,blitz:0,...(JSON.parse(localStorage.getItem(KEY))||{})}}catch(_){return {sessions:0,naked:0,hidden:0,mixed:0,blitz:0}}};
 const wr=v=>{try{localStorage.setItem(KEY,JSON.stringify(v))}catch(_){}};
 const MODES={naked:['🎯','Únicos posibles','La casilla donde solo cabe un número.'],hidden:['🔍','Únicos ocultos','El número que solo cabe en una casilla de su zona.'],mixed:['🎲','Mezcla','Diez preguntas de los dos tipos.'],blitz:['⚡','Relámpago','60 segundos: ¿cuántas aciertas?']};
 // ---- building a question
 function make(kind){
  const h=H();
  for(let tries=0;tries<60;tries++){
   const {puzzle,solution}=C.generatePuzzle(Math.random()<.5?'easy':'medium');
   const g={puzzle,solution,board:puzzle.slice(),selected:null};
   const empties=[...g.board.keys()].filter(i=>!g.board[i]);
   // fill a random number of cells correctly, then look for the wanted step
   for(let i=empties.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[empties[i],empties[j]]=[empties[j],empties[i]]}
   const target=Math.floor(Math.random()*Math.max(4,empties.length-8));
   for(let k=0;k<=Math.min(target,empties.length-1);k++){g.board[empties[k]]=solution[empties[k]]}
   for(let k=target+1;k<=empties.length&&k<target+30;k++){
    const step=h.findFor(g,kind==='hidden');if(!step)break;
    if(step.type===kind&&(kind!=='hidden'||(step.unit.kind==='box'&&step.unit.cells.filter(i=>!g.board[i]).length>=3)||tries>40))return {g,step};
    if(step.type!=='naked'&&step.type!=='hidden')break;
    g.board[empties[k]]=solution[empties[k]];
   }
  }
  return null;
 }
 // ---- drawing a mini board
 function gridHtml(g,mark){
  let s='<div class="tg tr-grid">';
  for(let i=0;i<81;i++){const r=Math.floor(i/9),c=i%9,v=g.board[i];
   s+=`<button type="button" class="tc ${g.puzzle[i]?'tgiven':''} ${(c===2||c===5)?'tbr':''} ${(r===2||r===5)?'tbb':''} ${mark[i]||''}" data-i="${i}">${v||''}</button>`}
  return s+'</div>';
 }
 // ---- the screens
 function open(){
  S.open('trainScreen','🧠 Entrenamiento',(body,api)=>{
   const rec=rd();
   body.innerHTML=`<p class="tr-intro">Practica con ejercicios cortos. Cada pregunta viene de un sudoku real y siempre te explico la respuesta.</p>
   <div class="tr-cards">${Object.entries(MODES).map(([k,[ic,name,desc]])=>`<button type="button" class="tr-card" data-m="${k}"><span>${ic}</span><div><b>${name}</b><small>${desc}</small></div><em>${k==='blitz'?`Récord: ${rec.blitz}`:`Mejor: ${rec[k]}/10`}</em></button>`).join('')}</div>
   <p class="st-note">Ganas 5 XP por respuesta correcta y 20 XP extra si haces 10 de 10. Sesiones hechas: ${rec.sessions}.</p>`;
   body.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>session(b.dataset.m,api));
  });
 }
 function session(mode,api){
  const body=api.body,total=mode==='blitz'?Infinity:10;
  let n=0,ok=0,q=null,answered=false,t0=Date.now(),timer=null,left=60;
  const finish=()=>{
   clearInterval(timer);const rec=rd();rec.sessions++;
   const score=ok,newBest=mode==='blitz'?score>rec.blitz:score>rec[mode];if(newBest)rec[mode]=score;wr(rec);
   const xp=ok*5+((mode!=='blitz'&&ok===10)?20:0);if(xp&&window.SudomiXP)SudomiXP.award(xp);
   if(window.SudomiSound)SudomiSound.play(ok>=(mode==='blitz'?8:7)?'win':'bonus');
   body.innerHTML=`<div class="tr-end"><span>${ok===10?'🏆':'🎯'}</span><h3>${mode==='blitz'?`${ok} aciertos en 60 s`:`${ok} de ${n} correctas`}</h3><p>${newBest?'🌟 ¡Nuevo récord!':`Tu mejor: ${mode==='blitz'?rec.blitz:rec[mode]}`}</p><p class="tr-xp">+${xp} XP</p><div class="tr-act"><button type="button" id="trAgain">Otra vez</button><button type="button" id="trMenu">Menú</button></div></div>`;
   $('#trAgain').onclick=()=>session(mode,api);$('#trMenu').onclick=()=>api.redraw();
  };
  const $=s=>body.querySelector(s);
  const next=()=>{
   if(n>=total){finish();return}
   const kind=mode==='mixed'||mode==='blitz'?(Math.random()<.5?'naked':'hidden'):mode;
   q=make(kind)||make(kind==='naked'?'hidden':'naked');
   if(!q){body.innerHTML='<p class="tr-intro">No pude preparar la pregunta. Inténtalo otra vez.</p>';return}
   n++;answered=false;draw(null);
  };
  const draw=res=>{
   const {g,step}=q,mark={};
   if(step.type==='naked'){PEERS(g,step.cell).forEach(i=>mark[i]='hl');mark[step.cell]='target'}
   else{step.unit.cells.forEach(i=>{if(!g.board[i])mark[i]='hl'})}
   if(res){const h=H();if(step.type==='naked'){for(let d=1;d<=9;d++){if(d===step.digit)continue;const p=h.PEERS[step.cell].find(j=>g.board[j]===d);if(p!==undefined)mark[p]='block'}mark[step.cell]='ok'}
    else{for(const i of step.unit.cells){if(g.board[i]||i===step.cell)continue;const p=h.PEERS[i].find(x=>g.board[x]===step.digit&&!step.unit.cells.includes(x));if(p!==undefined)mark[p]='block'}mark[step.cell]='ok'}}
   const board2={...g,board:g.board.slice()};if(res&&step.type==='naked')board2.board[step.cell]=step.digit;if(res&&step.type==='hidden')board2.board[step.cell]=step.digit;
   const unitName=step.type==='hidden'?(step.unit.kind==='box'?`el cuadro ${H().BOXN[step.unit.n]}`:step.unit.kind==='row'?`la fila ${step.unit.n+1}`:`la columna ${step.unit.n+1}`):'';
   const ask=step.type==='naked'?`¿Qué número va en la casilla <b>naranja</b> (${H().where(step.cell)})?`:`En ${unitName} (casillas amarillas), ¿<b>dónde</b> va el <b>${step.digit}</b>? Toca la casilla.`;
   body.innerHTML=`<div class="tr-top"><b>${MODES[mode][1]}</b><span>${mode==='blitz'?`⏱ <i id="trLeft">${left}</i> s · ✔ ${ok}`:`Pregunta ${n} de ${total} · ✔ ${ok}`}</span></div>${gridHtml(board2,mark)}<p class="tr-q">${ask}</p>
   ${step.type==='naked'&&!res?`<div class="tp-pad">${[1,2,3,4,5,6,7,8,9].map(d=>`<button type="button" data-n="${d}">${d}</button>`).join('')}</div>`:''}
   <p class="tp-fb ${res?(res.ok?'good':'bad'):''}" aria-live="polite">${res?res.msg:''}</p>${res?`<button type="button" class="tr-next" id="trNext">${n>=total?'Ver resultado':'Siguiente ›'}</button>`:''}`;
   if(res){$('#trNext').onclick=next;return}
   if(step.type==='naked')body.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>answer(+b.dataset.n===step.digit,+b.dataset.n));
   else body.querySelectorAll('.tr-grid .tc').forEach(c=>c.onclick=()=>{const i=+c.dataset.i;if(!step.unit.cells.includes(i)||g.board[i])return;answer(i===step.cell,i)});
  };
  const PEERS=(g,i)=>H().PEERS[i];
  const answer=(good,pick)=>{
   if(answered)return;answered=true;const {g,step}=q;if(good)ok++;
   if(window.SudomiSound)SudomiSound.play(good?'good':'gbad');
   const why=H().describe({...g,hints:0},step,2).text;
   draw({ok:good,msg:(good?'✅ ¡Correcto! ':'❌ No era esa. ')+why});
  };
  if(mode==='blitz'){timer=setInterval(()=>{left--;const e=body.querySelector('#trLeft');if(e)e.textContent=Math.max(left,0);if(left<=0){clearInterval(timer);finish()}},1000)}
  next();
 }
 function boot(){
  const dd=document.getElementById('homeDropdown'),b=document.getElementById('openTraining');
  if(b)b.onclick=()=>{dd.classList.add('hidden');const t=document.getElementById('homeMenuBtn');if(t)t.setAttribute('aria-expanded','false');open()};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
 window.SudomiTraining={open};
})();
