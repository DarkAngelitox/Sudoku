/* SUDOMI 0.2.34 — Phase 7: smart hints. The 💡 button no longer just fills a cell: it explains WHY a number belongs there.
 *  Paso 1 (free): shows where to look (a cell or a row / column / box).
 *  Paso 2 (costs one hint, as before): names the number and the reason, with the blocking numbers marked on the board.
 *  Then the player can place it ("Colocar") or just keep playing.
 * Reasons it can explain: a wrong number on the board, naked single (only one candidate fits the cell), hidden single in a box /
 * row / column (only one cell of the unit can take that number). When none of those exists it says so honestly (advanced techniques).
 * It reads the board only; the placing goes through Game.push/cleanNotes/save like the old hint. Nothing in the generator changes. */
(()=>{
 const C=window.SudomiCore;if(!C)return;
 const ui=C.ui,$=s=>document.querySelector(s);
 const BOXN=['superior izquierdo','superior central','superior derecho','central izquierdo','central','central derecho','inferior izquierdo','inferior central','inferior derecho'];
 const rc=i=>[Math.floor(i/9),i%9],boxOf=i=>Math.floor(i/27)*3+Math.floor((i%9)/3);
 const UNITS=[];for(let b=0;b<9;b++){const br=Math.floor(b/3)*3,bc=(b%3)*3,u=[];for(let a=0;a<3;a++)for(let d=0;d<3;d++)u.push((br+a)*9+bc+d);UNITS.push({kind:'box',n:b,cells:u})}
 for(let r=0;r<9;r++)UNITS.push({kind:'row',n:r,cells:[...Array(9).keys()].map(c=>r*9+c)});
 for(let c=0;c<9;c++)UNITS.push({kind:'col',n:c,cells:[...Array(9).keys()].map(r=>r*9+c)});
 const PEERS=[...Array(81)].map((_,i)=>{const s=new Set(),[r,c]=rc(i);for(let x=0;x<9;x++){s.add(r*9+x);s.add(x*9+c)}for(const j of UNITS[boxOf(i)].cells)s.add(j);s.delete(i);return [...s]});
 const unitName=u=>u.kind==='box'?`el cuadro ${BOXN[u.n]}`:u.kind==='row'?`la fila ${u.n+1}`:`la columna ${u.n+1}`;
 const where=i=>{const [r,c]=rc(i);return `fila ${r+1}, columna ${c+1}`};
 const cands=(b,i)=>{let m=0x1ff;for(const p of PEERS[i])if(b[p])m&=~(1<<(b[p]-1));return m};
 const list=m=>{const o=[];for(let n=1;n<=9;n++)if(m&(1<<(n-1)))o.push(n);return o};
 function find(g,noNaked){
  const b=g.board,sol=g.solution;
  const wrong=b.findIndex((v,i)=>v&&v!==sol[i]);
  if(wrong>=0)return {type:'wrong',cell:wrong,digit:sol[wrong]};
  const empty=[...b.keys()].filter(i=>!b[i]);if(!empty.length)return null;
  const sel=g.selected,order=sel!==null&&!b[sel]?[sel,...empty.filter(i=>i!==sel)]:empty;
  // 1. naked single
  if(!noNaked)for(const i of order){const m=cands(b,i);if(list(m).length===1)return {type:'naked',cell:i,digit:list(m)[0]}}
  // 2. hidden single (box, then row, then column; the selected cell's units first)
  const units=UNITS.filter(u=>sel===null||!u.cells.includes(sel)).concat([]);
  const pref=sel!==null&&!b[sel]?UNITS.filter(u=>u.cells.includes(sel)):[];
  for(const u of [...pref,...units]){
   for(let n=1;n<=9;n++){
    if(u.cells.some(i=>b[i]===n))continue;
    const spots=u.cells.filter(i=>!b[i]&&(cands(b,i)&(1<<(n-1))));
    if(spots.length===1)return {type:'hidden',cell:spots[0],digit:n,unit:u};
   }
  }
  // 3. nothing direct: point at the freest cell
  const pick=(sel!==null&&!b[sel])?sel:empty.reduce((a,i)=>list(cands(b,i)).length<list(cands(b,a)).length?i:a,empty[0]);
  return {type:'hard',cell:pick,digit:sol[pick],cand:list(cands(b,pick))};
 }
 // ---- text + highlights for each stage
 function describe(g,s,stage){
  const b=g.board,out={hl:{unit:[],target:[],block:[]},text:'',more:'',place:''};
  if(s.type==='wrong'){
   out.hl.target=[s.cell];out.text=`Hay un número incorrecto en la ${where(s.cell)} (está en rojo). Corrígelo antes de seguir: con un error en el tablero ninguna pista es fiable.`;out.place='Borrar ese número';return out;
  }
  if(s.type==='naked'){
   out.hl.unit=[s.cell];
   if(stage===1){out.text=`Mira la casilla de la ${where(s.cell)}. Hay una casilla donde casi todos los números ya están usados.`;out.more='Ver la explicación';return out}
   const blockers=[];for(let d=1;d<=9;d++){if(d===s.digit)continue;const p=PEERS[s.cell].find(j=>b[j]===d);if(p!==undefined)blockers.push(p)}
   out.hl.target=[s.cell];out.hl.block=blockers;out.hl.unit=[];
   out.text=`En la ${where(s.cell)} va el ${s.digit}. Los otros ocho números ya aparecen en su fila, su columna o su cuadro (marcados en azul), así que el ${s.digit} es el único que cabe.`;out.place=`Colocar el ${s.digit}`;return out;
  }
  if(s.type==='hidden'){
   const u=s.unit;out.hl.unit=u.cells.filter(i=>!b[i]);
   if(stage===1){out.text=`Mira ${unitName(u)}. Hay un número que, dentro de ${u.kind==='box'?'ese cuadro':'esa '+(u.kind==='row'?'fila':'columna')}, solo cabe en una casilla.`;out.more='Ver la explicación';return out}
   const blockers=[];for(const i of u.cells){if(b[i]||i===s.cell)continue;const p=PEERS[i].find(j=>b[j]===s.digit&&!u.cells.includes(j));if(p!==undefined&&!blockers.includes(p))blockers.push(p)}
   out.hl.target=[s.cell];out.hl.block=blockers;
   out.text=`El ${s.digit} solo puede ir en la ${where(s.cell)} dentro ${u.kind==="box"?"del cuadro "+BOXN[u.n]:"de la "+(u.kind==="row"?"fila ":"columna ")+(u.n+1)}. En las demás casillas libres de ${u.kind==='box'?'ese cuadro':'esa '+(u.kind==='row'?'fila':'columna')} no cabe porque ya hay un ${s.digit} en su fila o columna (marcados en azul).`;out.place=`Colocar el ${s.digit}`;return out;
  }
  // hard
  out.hl.unit=[s.cell];
  if(stage===1){out.text=`No hay jugadas directas (números únicos) a la vista. Revisa tus notas y busca pares o tríos de candidatos repetidos. La casilla de la ${where(s.cell)} es la que tiene menos opciones.`;out.more='Ver la respuesta';return out}
  out.hl.target=[s.cell];out.hl.unit=[];
  out.text=`En la ${where(s.cell)} los candidatos son ${s.cand.join(', ')}, y el que va es el ${s.digit}. Para llegar a él sin adivinar hace falta una técnica avanzada (pares, tríos o X-Wing).`;out.place=`Colocar el ${s.digit}`;return out;
 }
 // ---- panel
 let st=null;
 function panel(){
  let p=$('#smartHint');
  if(!p){p=document.createElement('div');p.id='smartHint';p.className='smart-hint hidden';p.setAttribute('role','status');
   p.innerHTML='<div class="sh-top"><b>💡 Pista inteligente</b><span class="sh-step"></span></div><p class="sh-text"></p><div class="sh-actions"><button type="button" class="sh-more"></button><button type="button" class="sh-place"></button><button type="button" class="sh-close">Cerrar</button></div>';
   const anchor=$('.mode-row');anchor.parentNode.insertBefore(p,anchor.nextSibling);
   p.querySelector('.sh-close').onclick=close;p.querySelector('.sh-more').onclick=more;p.querySelector('.sh-place').onclick=place;
  }
  return p;
 }
 function close(){st=null;const p=$('#smartHint');if(p)p.classList.add('hidden');decorate()}
 function show(){
  const g=ui.game,d=describe(g,st.step,st.stage),p=panel(),limit=C.DIFFICULTIES[g.difficulty].hintLimit;
  const t=st.step.type;
  p.querySelector('.sh-step').textContent=t==='wrong'?'Corrección':`Paso ${st.stage} de 2`;
  p.querySelector('.sh-text').textContent=d.text;
  const more=p.querySelector('.sh-more'),pl=p.querySelector('.sh-place');
  more.classList.toggle('hidden',st.stage!==1||t==='wrong');more.textContent=d.more||'';
  pl.classList.toggle('hidden',st.stage!==2&&t!=='wrong');pl.textContent=d.place||'';
  const noHints=st.stage===1&&t!=='wrong'&&g.hints>=limit;
  if(noHints){more.disabled=true;more.textContent='Sin pistas disponibles'}else more.disabled=false;
  p.classList.remove('hidden');st.hl=d.hl;decorate();
 }
 function open(){
  const g=ui.game;if(!g||g.paused||!g.running)return;
  if(st){close();return}
  const step=find(g);if(!step)return;
  st={step,stage:1,sig:g.board.join(''),counted:false};show();
 }
 function more(){
  const g=ui.game,limit=C.DIFFICULTIES[g.difficulty].hintLimit;
  if(!st||st.stage!==1)return;
  if(g.hints>=limit)return;
  g.hints++;g.save();ui.render();st.stage=2;show();
 }
 function place(){
  const g=ui.game;if(!st)return;const s=st.step;
  if(s.type==='wrong'){g.selected=s.cell;close();g.erase();return}
  if(st.stage!==2)return;
  if(window.SudomiScore)SudomiScore.skip(s.cell);      // 0.2.40: a number placed from a hint earns no points
  g.push();g.board[s.cell]=g.solution[s.cell];g.cleanNotes(s.cell,g.solution[s.cell]);g.selected=s.cell;
  close();g.save();ui.render();
  if(g.board.every((n,i)=>n===g.solution[i]))g.win();
 }
 // ---- marks on the board (renderBoard rebuilds every cell, so they are put back after each draw)
 function decorate(){
  const cells=document.querySelectorAll('#board .cell');
  cells.forEach(c=>c.classList.remove('hl-unit','hl-target','hl-block'));
  if(!st)return;
  const g=ui.game;
  if(g.board.join('')!==st.sig){st=null;const p=$('#smartHint');if(p)p.classList.add('hidden');return}
  const h=st.hl||{};
  (h.unit||[]).forEach(i=>cells[i]&&cells[i].classList.add('hl-unit'));
  (h.block||[]).forEach(i=>cells[i]&&cells[i].classList.add('hl-block'));
  (h.target||[]).forEach(i=>cells[i]&&cells[i].classList.add('hl-target'));
 }
 const orig=ui.renderBoard.bind(ui);
 ui.renderBoard=function(){orig();decorate()};
 $('#hintBtn').onclick=open;
 // 0.2.53: findFor(g) works on any {board, solution, puzzle, selected} (used by the Entrenamiento and Modo Profesor screens)
 window.SudomiSmartHints={find:()=>find(ui.game),findFor:find,describe,PEERS,UNITS,BOXN,where};
})();
