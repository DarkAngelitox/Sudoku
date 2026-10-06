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
 const bits=m=>{let k=0;while(m){k+=m&1;m>>=1}return k};
 // después de descartar candidatos (m = candidatos de cada casilla), ¿queda algún número único?
 function singleAfter(b,m){
  for(let i=0;i<81;i++)if(!b[i]&&bits(m[i])===1)return {cell:i,digit:list(m[i])[0]};
  for(const u of UNITS)for(let n=1;n<=9;n++){if(u.cells.some(i=>b[i]===n))continue;const spots=u.cells.filter(i=>!b[i]&&(m[i]&(1<<(n-1))));if(spots.length===1)return {cell:spots[0],digit:n}}
  return null;
 }
 function advanced(b,sol){
  const base=b.map((v,i)=>v?0:cands(b,i));
  // candidatos encerrados: en un cuadro, un número solo cabe en una fila (o columna) -> se descarta en el resto de esa fila (o columna)
  for(let k=0;k<9;k++){const box=UNITS[k];
   for(let n=1;n<=9;n++){
    if(box.cells.some(i=>b[i]===n))continue;const bit=1<<(n-1),spots=box.cells.filter(i=>!b[i]&&(base[i]&bit));
    if(spots.length<2||spots.length>3)continue;
    for(const kind of ['row','col']){
     const at=i=>kind==='row'?rc(i)[0]:rc(i)[1];if(!spots.every(i=>at(i)===at(spots[0])))continue;
     const line=UNITS.find(u=>u.kind===kind&&u.n===at(spots[0])),elim=line.cells.filter(i=>!b[i]&&!box.cells.includes(i)&&(base[i]&bit));
     if(!elim.length)continue;const m=base.slice();elim.forEach(i=>{m[i]&=~bit});
     const s=singleAfter(b,m);if(s&&sol[s.cell]===s.digit)return {type:'locked',cell:s.cell,digit:s.digit,box,line,n,spots,elim};
    }
   }
  }
  // 0.3.21: lo mismo al revés (reclamo): en una fila o columna, un número solo cabe dentro de un cuadro -> se descarta en el resto de ese cuadro
  for(const line of UNITS.filter(u=>u.kind!=='box')){
   for(let n=1;n<=9;n++){
    if(line.cells.some(i=>b[i]===n))continue;const bit=1<<(n-1),spots=line.cells.filter(i=>!b[i]&&(base[i]&bit));
    if(spots.length<2||spots.length>3||!spots.every(i=>boxOf(i)===boxOf(spots[0])))continue;
    const box=UNITS[boxOf(spots[0])],elim=box.cells.filter(i=>!b[i]&&!line.cells.includes(i)&&(base[i]&bit));
    if(!elim.length)continue;const m=base.slice();elim.forEach(i=>{m[i]&=~bit});
    const s=singleAfter(b,m);if(s&&sol[s.cell]===s.digit)return {type:'claim',cell:s.cell,digit:s.digit,box,line,n,spots,elim};
   }
  }
  // pareja desnuda: dos casillas de una unidad con los mismos dos candidatos -> esos dos números se descartan en las demás casillas de la unidad
  for(const u of UNITS){
   const two=u.cells.filter(i=>!b[i]&&bits(base[i])===2);
   for(let x=0;x<two.length;x++)for(let y=x+1;y<two.length;y++){
    if(base[two[x]]!==base[two[y]])continue;const pm=base[two[x]],elim=u.cells.filter(i=>!b[i]&&i!==two[x]&&i!==two[y]&&(base[i]&pm));
    if(!elim.length)continue;const m=base.slice();elim.forEach(i=>{m[i]&=~pm});
    const s=singleAfter(b,m);if(s&&sol[s.cell]===s.digit)return {type:'pair',cell:s.cell,digit:s.digit,unit:u,pair:[two[x],two[y]],digits:list(pm),elim};
   }
  }
  return null;
 }
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
  // 0.3.10 (V2): dos técnicas más antes de rendirse. Las dos DESCARTAN candidatos y, con eso, aparece un número único.
  const adv=advanced(b,sol);if(adv)return adv;
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
  if(s.type==='locked'){
   const ln=unitName(s.line),bx=unitName(s.box);
   if(stage===1){out.hl.unit=s.box.cells.filter(i=>!b[i]);out.text=`Mira ${bx}. Dentro de ese cuadro, el ${s.n} solo cabe en ${ln}. Piensa qué descarta eso en el resto de ${ln}.`;out.more='Ver la explicación';return out}
   out.hl.unit=s.spots;out.hl.block=s.elim;out.hl.target=[s.cell];
   out.text=`Técnica: candidatos encerrados. En ${bx}, el ${s.n} solo puede ir en ${ln} (casillas en amarillo). Entonces el ${s.n} no puede estar en las otras casillas de ${ln} (en azul). Con ese descarte, en la ${where(s.cell)} solo queda el ${s.digit}.`;out.place=`Colocar el ${s.digit}`;return out;
  }
  if(s.type==='claim'){
   const ln=unitName(s.line),bx=unitName(s.box).replace(/^el /,'l ');   // «dentro de» + «el cuadro…» = «dentro del cuadro…»
   if(stage===1){out.hl.unit=s.line.cells.filter(i=>!b[i]);out.text=`Mira ${ln}. En esa ${s.line.kind==='row'?'fila':'columna'}, el ${s.n} solo cabe dentro de${bx}. Piensa qué descarta eso en el resto de ese cuadro.`;out.more='Ver la explicación';return out}
   out.hl.unit=s.spots;out.hl.block=s.elim;out.hl.target=[s.cell];
   out.text=`Técnica: reclamo. En ${ln}, el ${s.n} solo puede ir dentro de${bx} (casillas en amarillo). Entonces el ${s.n} no puede estar en las otras casillas de ese cuadro (en azul). Con ese descarte, en la ${where(s.cell)} solo queda el ${s.digit}.`;out.place=`Colocar el ${s.digit}`;return out;
  }
  if(s.type==='pair'){
   const un=unitName(s.unit),[x,y]=s.digits;
   if(stage===1){out.hl.unit=s.unit.cells.filter(i=>!b[i]);out.text=`Mira ${un}. Hay dos casillas que solo pueden llevar los mismos dos números: una pareja. Piensa qué les quita eso a las demás.`;out.more='Ver la explicación';return out}
   out.hl.unit=s.pair;out.hl.block=s.elim;out.hl.target=[s.cell];
   out.text=`Técnica: pareja. En ${un}, las dos casillas en amarillo solo pueden llevar el ${x} y el ${y}, así que entre las dos se los reparten. Eso quita el ${x} y el ${y} de las demás casillas (en azul). Con ese descarte, en la ${where(s.cell)} solo queda el ${s.digit}.`;out.place=`Colocar el ${s.digit}`;return out;
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
