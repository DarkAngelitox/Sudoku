// SUDOMI CORE 0.1.5 — fixes: startup crash, blocked input, missing isComplete, difficulty ignored
const SIZE=9, CELLS=81, ROWS=[0,1,2,3,4,5,6,7,8], NUMS=[1,2,3,4,5,6,7,8,9];
const idx=(r,c)=>r*9+c;
const shuffled=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const peers=i=>{const r=Math.floor(i/9),c=i%9,s=new Set();for(let x=0;x<9;x++){if(x!==c)s.add(idx(r,x));if(x!==r)s.add(idx(x,c))}const br=Math.floor(r/3)*3,bc=Math.floor(c/3)*3;for(let rr=br;rr<br+3;rr++)for(let cc=bc;cc<bc+3;cc++)if(rr!==r||cc!==c)s.add(idx(rr,cc));return [...s]};
function candidates(board,i){if(board[i])return new Set();const used=new Set(peers(i).map(p=>board[p]).filter(Boolean));return new Set(NUMS.filter(n=>!used.has(n)))}

// Fast valid completed Sudoku: pattern + randomized rows/columns/numbers.
// This removes the expensive "solve an empty board" startup from 0.1.1.
function pattern(r,c){return (r*3+Math.floor(r/3)+c)%9}
function shuffledGroups(){return shuffled([0,1,2]).flatMap(g=>shuffled([0,1,2]).map(x=>g*3+x))}
function generateSolution(){
  const rows=shuffledGroups(), cols=shuffledGroups(), nums=shuffled(NUMS);
  return rows.flatMap(r=>cols.map(c=>nums[pattern(r,c)]));
}

function countSolutions(board,limit=2){
  const b=[...board];
  const rowMask=Array(9).fill(0), colMask=Array(9).fill(0), boxMask=Array(9).fill(0);
  for(let i=0;i<81;i++) if(b[i]){
    const n=b[i]-1, bit=1<<n, r=(i/9)|0,c=i%9,box=((r/3)|0)*3+((c/3)|0);
    if((rowMask[r]&bit)||(colMask[c]&bit)||(boxMask[box]&bit)) return 0;
    rowMask[r]|=bit;colMask[c]|=bit;boxMask[box]|=bit;
  }
  let count=0;
  function rec(){
    if(count>=limit)return;
    let best=-1,bestMask=0,bestCount=10;
    for(let i=0;i<81;i++) if(!b[i]){
      const r=(i/9)|0,c=i%9,box=((r/3)|0)*3+((c/3)|0);
      const mask=0x1ff & ~(rowMask[r]|colMask[c]|boxMask[box]);
      const pc=mask.toString(2).replace(/0/g,'').length;
      if(pc===0)return;
      if(pc<bestCount){best=i;bestMask=mask;bestCount=pc;if(pc===1)break}
    }
    if(best<0){count++;return}
    const r=(best/9)|0,c=best%9,box=((r/3)|0)*3+((c/3)|0);
    for(let bit=1;bit<=256;bit<<=1){
      if(bestMask&bit){
        b[best]=Math.log2(bit)+1;rowMask[r]|=bit;colMask[c]|=bit;boxMask[box]|=bit;
        rec();
        b[best]=0;rowMask[r]^=bit;colMask[c]^=bit;boxMask[box]^=bit;
        if(count>=limit)return;
      }
    }
  }
  rec(); return count;
}
/* 0.2.28 — every puzzle can be solved with logic alone (never by guessing), and the level decides which techniques it needs.
 * logicSolve() solves like a person, always using the easiest technique that makes progress:
 *   level 1 — naked and hidden singles
 *   level 2 — locked candidates (pointing / claiming)
 *   level 3 — naked and hidden pairs
 *   level 4 — naked and hidden triples
 *   level 5 — X-Wing and XY-Wing
 * It returns {solved, level}: level = the hardest technique the puzzle needed. A puzzle it can finish has exactly one
 * solution (every step is a sound deduction), so the generator does not need a separate uniqueness check. */
const UNITS=(()=>{const u=[];for(let r=0;r<9;r++)u.push(ROWS.map(c=>idx(r,c)));for(let c=0;c<9;c++)u.push(ROWS.map(r=>idx(r,c)));for(let b=0;b<9;b++){const br=Math.floor(b/3)*3,bc=b%3*3;u.push([0,1,2].flatMap(a=>[0,1,2].map(d=>idx(br+a,bc+d))))}return u})();
const PEERS=[...Array(81)].map((_,i)=>peers(i));
const bitCount=m=>{let n=0;while(m){m&=m-1;n++}return n};
const combos=(arr,k)=>{const out=[];const go=(s,acc)=>{if(acc.length===k){out.push(acc);return}for(let i=s;i<arr.length;i++)go(i+1,[...acc,arr[i]])};go(0,[]);return out};
function logicSolve(puzzle,maxLevel=5){
  const b=[...puzzle],cand=Array(81).fill(0);
  for(let i=0;i<81;i++)if(!b[i]){let m=0x1ff;for(const p of PEERS[i])if(b[p])m&=~(1<<(b[p]-1));cand[i]=m}
  const place=(i,n)=>{b[i]=n;cand[i]=0;const bit=1<<(n-1);for(const p of PEERS[i])cand[p]&=~bit};
  const remove=(cells,mask)=>{let ch=false;for(const i of cells)if(!b[i]&&(cand[i]&mask)){cand[i]&=~mask;ch=true}return ch};
  let level=0;
  for(let guard=0;guard<400;guard++){
    let empty=0;
    for(let i=0;i<81;i++)if(!b[i]){empty++;if(!cand[i])return {solved:false,level}}
    if(!empty)return {solved:true,level};
    let done=false;
    // level 1: naked singles, then hidden singles
    for(let i=0;i<81&&!done;i++)if(!b[i]&&bitCount(cand[i])===1){place(i,Math.log2(cand[i])+1);done=true}
    for(let u=0;u<27&&!done;u++)for(let n=0;n<9&&!done;n++){const bit=1<<n,where=UNITS[u].filter(i=>!b[i]&&(cand[i]&bit));if(where.length===1){place(where[0],n+1);done=true}}
    if(done){level=Math.max(level,1);continue}
    if(maxLevel<2)return {solved:false,level};
    // level 2: locked candidates
    for(let u=0;u<27&&!done;u++)for(let n=0;n<9&&!done;n++){
      const bit=1<<n,where=UNITS[u].filter(i=>!b[i]&&(cand[i]&bit));if(where.length<2)continue;
      for(let v=0;v<27&&!done;v++){if(v===u)continue;const inV=UNITS[v];if(where.every(i=>inV.includes(i)))done=remove(inV.filter(i=>!where.includes(i)),bit)}
    }
    if(done){level=Math.max(level,2);continue}
    // levels 3 and 4: naked and hidden subsets of size 2, then 3
    for(let k=2;k<=3&&!done;k++){
      if(maxLevel<k+1)return {solved:false,level};
      for(let u=0;u<27&&!done;u++){
        const open=UNITS[u].filter(i=>!b[i]);if(open.length<=k)continue;
        for(const set of combos(open.filter(i=>bitCount(cand[i])<=k),k)){const m=set.reduce((a,i)=>a|cand[i],0);if(bitCount(m)===k&&remove(open.filter(i=>!set.includes(i)),m)){done=true;break}}
        if(done)break;
        const digits=[...Array(9).keys()].filter(n=>open.some(i=>cand[i]&(1<<n)));
        for(const ds of combos(digits,k)){const m=ds.reduce((a,n)=>a|(1<<n),0),cells=open.filter(i=>cand[i]&m);if(cells.length===k&&ds.every(n=>cells.some(i=>cand[i]&(1<<n)))){let ch=false;for(const i of cells)if(cand[i]&~m){cand[i]&=m;ch=true}if(ch){done=true;break}}}
      }
      if(done)level=Math.max(level,k+1);
    }
    if(done)continue;
    if(maxLevel<5)return {solved:false,level};
    // level 5: X-Wing (rows and columns), then XY-Wing
    for(let n=0;n<9&&!done;n++){const bit=1<<n;
      for(const dir of [0,1]){
        const lines=[];for(let l=0;l<9;l++){const pos=UNITS[dir*9+l].filter(i=>!b[i]&&(cand[i]&bit)).map(i=>dir?Math.floor(i/9):i%9);if(pos.length===2)lines.push([l,pos])}
        for(const [x,y] of combos(lines,2)){if(x[1][0]!==y[1][0]||x[1][1]!==y[1][1])continue;
          const cross=x[1].flatMap(c=>UNITS[(1-dir)*9+c]).filter(i=>{const line=dir?i%9:Math.floor(i/9);return line!==x[0]&&line!==y[0]});
          if(remove(cross,bit)){done=true;break}}
        if(done)break;
      }
    }
    for(let pv=0;pv<81&&!done;pv++){
      if(b[pv]||bitCount(cand[pv])!==2)continue;
      const wings=PEERS[pv].filter(i=>!b[i]&&bitCount(cand[i])===2&&bitCount(cand[i]&cand[pv])===1);
      for(const [w1,w2] of combos(wings,2)){
        const z=cand[w1]&cand[w2]&~cand[pv];if(bitCount(z)!==1||(cand[w1]&cand[pv])===(cand[w2]&cand[pv]))continue;
        if(remove(PEERS[w1].filter(i=>i!==w2&&i!==pv&&PEERS[w2].includes(i)),z)){done=true;break}
      }
    }
    if(done){level=Math.max(level,5);continue}
    return {solved:false,level};      // would need guessing: never given to the player
  }
  return {solved:false,level};
}
// Remove numbers one by one, keeping only removals after which the puzzle can still be solved with the techniques this level allows
function carve(solution,cfg,deadline){
  const puzzle=[...solution];let clues=81;
  for(const i of shuffled([...Array(81).keys()])){
    if(clues<=cfg.clues||Date.now()>deadline)break;
    const old=puzzle[i];puzzle[i]=0;
    if(logicSolve(puzzle,cfg.max).solved)clues--;else puzzle[i]=old;
  }
  return {puzzle,clues,level:logicSolve(puzzle,cfg.max).level};
}
// min/max = which technique levels a puzzle of this difficulty must need (see logicSolve). ms = time allowed to look for one.
const DIFFICULTIES={
 easy:{label:'Fácil',clues:40,hintLimit:99,min:1,max:1,ms:600},medium:{label:'Medio',clues:32,hintLimit:99,min:1,max:2,ms:900},
 hard:{label:'Difícil',clues:29,hintLimit:1,min:2,max:3,ms:1400},expert:{label:'Experto',clues:26,hintLimit:1,min:3,max:4,ms:1800},
 master:{label:'Maestro',clues:24,hintLimit:1,min:4,max:5,ms:2200},extreme:{label:'Extremo',clues:22,hintLimit:1,min:5,max:5,ms:2600}
};
function techniqueProfile(puzzle){
  let b=[...puzzle],steps=[];
  while(true){
    let progress=false;
    for(let i=0;i<81;i++)if(!b[i]){
      const c=candidates(b,i);
      if(c.size===1){b[i]=[...c][0];steps.push({type:'single',cell:i,value:b[i]});progress=true}
    }
    if(progress)continue;
    for(let unitType=0;unitType<3;unitType++)for(let u=0;u<9;u++){
      let cells=unitType===0?ROWS.map(c=>idx(u,c)):unitType===1?ROWS.map(r=>idx(r,u)):
        (()=>{const br=Math.floor(u/3)*3,bc=u%3*3;return [...Array(3)].flatMap((_,a)=>[...Array(3)].map((_,d)=>idx(br+a,bc+d)))})();
      for(let n=1;n<=9;n++){
        let poss=cells.filter(i=>!b[i]&&candidates(b,i).has(n));
        if(poss.length===1){b[poss[0]]=n;steps.push({type:'hidden-single',cell:poss[0],value:n});progress=true}
      }
    }
    if(progress)continue;
    break;
  }
  const unresolved=b.filter(x=>!x).length;
  return {steps,unresolved,level:unresolved?2:steps.some(s=>s.type==='hidden-single')?2:1};
}
function isComplete(board,solution){return board.length===81&&board.every((n,i)=>n===solution[i])}
const PUZZLE_BANK=[
"530070000600195000098000060800060003400803001700020006060000280000419005000080079",
"009000000080605020501078000000000700706040102003000000000720904040901030000000800",
"200080300060070084030500209000105408000000000402706000301007040720040060004010003"
];
function solveBoard(puzzle){
  const b=puzzle.map(Number);
  function rec(){
    let best=-1, opts=null;
    for(let i=0;i<81;i++) if(!b[i]){
      const c=[...candidates(b,i)];
      if(!c.length)return false;
      if(opts===null||c.length<opts.length){best=i;opts=c;if(c.length===1)break}
    }
    if(best<0)return true;
    for(const n of shuffled(opts)){b[best]=n;if(rec())return true;b[best]=0}
    return false;
  }
  return rec()?b:null;
}
function transformPuzzle(puzzle){
  // Randomly permute digits while preserving the exact puzzle's validity/uniqueness.
  const map=shuffled(NUMS), out=puzzle.map(n=>n?map[n-1]:0);
  return out;
}
function generatePuzzle(key='medium'){
  // 0.2.28: random full grid, then carve; try again until the puzzle needs the techniques of its level.
  // Every candidate can be solved with logic alone. If time runs out, the hardest one found (still solvable) is used.
  const cfg=DIFFICULTIES[key]||DIFFICULTIES.easy;
  try{
    const deadline=Date.now()+cfg.ms;let best=null;
    do{
      const solution=generateSolution(),c=carve(solution,cfg,deadline+400);
      if(!best||c.level>best.level||(c.level===best.level&&c.clues<best.clues))best={...c,solution};
      if(best.level>=cfg.min&&best.clues<=cfg.clues+3)break;
    }while(Date.now()<deadline);
    return {puzzle:best.puzzle,solution:best.solution};
  }catch(e){console.error('Generator failed, using bank',e)}
  // Fallback: built-in bank (digits randomized).
  const raw=PUZZLE_BANK[Math.floor(Math.random()*PUZZLE_BANK.length)].split('').map(Number);
  const puzzle=transformPuzzle(raw);
  const solution=solveBoard(puzzle);
  if(!solution) throw new Error("Puzzle bank error");
  return {puzzle,solution};
}

const KEY='sudomi-core-state-v04', emptyNotes=()=>Array.from({length:81},()=>new Set());

class Game{
 constructor(ui){this.ui=ui;this.resetHistory();this.loadOrNew()}
 resetHistory(){this.history=[];this.future=[]}
 snapshot(){return {board:[...this.board],notes:this.notes.map(s=>[...s]),errors:this.errors,seconds:this.seconds,hints:this.hints}}
 restore(s){this.board=s.board.map(n=>+n||0);this.notes=s.notes.map(a=>new Set(a));this.errors=s.errors|0;this.seconds=s.seconds|0;this.hints=s.hints|0}
 loadOrNew(){
  try{
   const s=JSON.parse(localStorage.getItem(KEY));
   const validDifficulty=!!(s&&DIFFICULTIES[s.difficulty]);
   const validState=!!(s&&Array.isArray(s.board)&&s.board.length===81&&Array.isArray(s.solution)&&s.solution.length===81&&Array.isArray(s.puzzle)&&s.puzzle.length===81&&Array.isArray(s.notes)&&s.notes.length===81&&validDifficulty);
   const finished=validState&&(isComplete(s.board.map(n=>+n||0),s.solution)||((s.errors|0)>=3&&s.difficulty!=='easy'&&s.difficulty!=='medium'));
   if(validState&&!finished){
    this.restore(s);this.solution=s.solution;this.puzzle=s.puzzle.map(n=>+n||0);this.difficulty=s.difficulty;
    this.daily=typeof s.daily==='string'?s.daily:null;this.started=s.started!==false;this.ui.currentGameExists=this.started;this.paused=false;this.running=true;this.selected=null;return
   }
   localStorage.removeItem(KEY);
  }catch(e){try{localStorage.removeItem(KEY)}catch(_){}}
  this.newGame(this.ui.getDifficulty()||'easy',false)
 }
 newGame(difficulty=this.difficulty||'easy',push=true){
  this.daily=null;this.difficulty=difficulty;const {puzzle,solution}=generatePuzzle(difficulty);
  this.puzzle=puzzle;this.solution=solution;this.board=[...puzzle];this.notes=emptyNotes();
  this.errors=0;this.hints=0;this.seconds=0;this.paused=false;this.running=true;this.started=push;this.ui.currentGameExists=push;this.selected=null;
  this.resetHistory();this.save();this.ui.render()
 }
 // 0.2.32: start a puzzle made elsewhere (js/daily.js: the Sudoku del dia). `daily` = its date, or null.
 startGiven(difficulty,puzzle,solution,daily){
  this.daily=daily||null;this.difficulty=difficulty;this.puzzle=[...puzzle];this.solution=[...solution];this.board=[...puzzle];this.notes=emptyNotes();
  this.errors=0;this.hints=0;this.seconds=0;this.paused=false;this.running=true;this.started=true;this.ui.currentGameExists=true;this.selected=null;
  this.resetHistory();this.save();this.ui.render()
 }
 // 0.2.28: start the same puzzle again from the beginning (offered after losing)
 restartSame(){
  this.board=[...this.puzzle];this.notes=emptyNotes();
  this.errors=0;this.hints=0;this.seconds=0;this.paused=false;this.running=true;this.started=true;this.ui.currentGameExists=true;this.selected=null;
  this.resetHistory();this.save();this.ui.render()
 }
 save(){try{localStorage.setItem(KEY,JSON.stringify({puzzle:this.puzzle,solution:this.solution,board:this.board,notes:this.notes.map(a=>[...a]),errors:this.errors,hints:this.hints,seconds:this.seconds,difficulty:this.difficulty,started:this.started!==false,daily:this.daily||null}))}catch(e){}}
 tick(){if(this.running&&!this.paused){this.seconds++;this.ui.updateStats()}}
 select(i){this.selected=i;this.ui.render()}
 push(){this.history.push(this.snapshot());if(this.history.length>200)this.history.shift();this.future=[]}
 setNumber(n){
  if(this.selected===null||this.paused||!this.running||this.puzzle[this.selected])return false;
  const i=this.selected;
  if(!this.ui.notesMode){const count=this.board.reduce((t,v)=>t+(v===n?1:0),0);if(count>=9)return false;}
  if(this.ui.notesMode){this.toggleNote(n);return true}
  if(this.board[i]===n)return false;
  if(this.board[i]&&this.board[i]===this.solution[i])return false;   // 0.2.96: un número correcto ya no se puede reemplazar por otro (evita errores por un toque de más)
  this.push();
  if(n!==this.solution[i]){
   this.board[i]=n;this.errors++;this.ui.wrong(i);
   if(this.difficulty!=='easy'&&this.difficulty!=='medium'&&this.errors>=3){
    this.board[i]=0;this.save();this.ui.render();this.lose();return true
   }
   this.save();this.ui.render();return true
  }
  this.board[i]=n;this.cleanNotes(i,n);this.save();this.ui.render();
  if(isComplete(this.board,this.solution))this.win();return true
 }
 toggleNote(n){const i=this.selected;if(this.board[i])return;this.push();if(this.notes[i].has(n))this.notes[i].delete(n);else this.notes[i].add(n);this.save();this.ui.render()}
 // 0.3.10 (V2, con permiso del dueño para abrir el Core): NOTAS AUTOMÁTICAS. Llena cada casilla vacía con los números que todavía
 // no están en su fila, columna ni cuadro. Se puede deshacer. No da ni quita puntos y no gasta pistas.
 autoNotes(){
  if(this.paused||!this.running)return false;
  this.push();
  for(let i=0;i<81;i++){
   if(this.board[i]){this.notes[i].clear();continue}
   const used=new Set();for(const p of peers(i))if(this.board[p])used.add(this.board[p]);
   this.notes[i]=new Set([1,2,3,4,5,6,7,8,9].filter(n=>!used.has(n)));
  }
  this.save();this.ui.render();return true;
 }
 cleanNotes(i,n){for(const p of peers(i))this.notes[p].delete(n);this.notes[i].clear()}
 erase(){if(this.selected===null||this.paused)return;const i=this.selected;if(this.puzzle[i])return;if(!this.board[i]&&!this.notes[i].size)return;this.push();this.board[i]=0;this.notes[i].clear();this.save();this.ui.render()}
 undo(){if(!this.history.length||this.paused)return;const errors=this.errors;this.future.push(this.snapshot());this.restore(this.history.pop());this.errors=errors;this.save();this.ui.render()}
 redo(){if(!this.future.length||this.paused)return;const errors=this.errors;this.history.push(this.snapshot());this.restore(this.future.pop());this.errors=errors;this.save();this.ui.render()}
 hint(){const limit=DIFFICULTIES[this.difficulty].hintLimit;if(this.hints>=limit)return false;let i=this.selected;if(i===null||this.board[i])i=this.board.findIndex((n,j)=>!n&&!this.notes[j].size);if(i<0)return false;this.push();this.hints++;this.board[i]=this.solution[i];this.cleanNotes(i,this.solution[i]);this.save();this.ui.render();if(isComplete(this.board,this.solution))this.win();return true}
 togglePause(){if(!this.running)return;this.paused=!this.paused;this.ui.renderPause(this.paused)}
 win(){this.running=false;this.save();window.dispatchEvent(new CustomEvent('sudomi-win',{detail:{daily:this.daily||null,seconds:this.seconds,errors:this.errors,difficulty:this.difficulty}}));this.ui.win(this)}
 lose(){this.running=false;this.ui.lose(this)}
}
const $=s=>document.querySelector(s),boardEl=$('#board'),keypad=$('#keypad');
class UI{
 constructor(){this.notesMode=false;this.selected=null;this.currentGameExists=false;this.game=null;this.game=new Game(this);this.game.paused=true;this.bind();this.render();setInterval(()=>this.game.tick(),1000)}
 getDifficulty(){return $('#difficulty').value}
 bind(){
  $('#playBtn').onclick=()=>this.onPlay();$('#homeBtn').onclick=()=>this.openHome();
  $('#homeMenuBtn').onclick=e=>{e.stopPropagation();this.toggleHomeMenu()};
  $('#homeDropdown').onclick=e=>e.stopPropagation();
  document.addEventListener('click',e=>{if(!e.target.closest('.home-more-wrap'))this.closeHomeMenu()});
  document.querySelectorAll('.feature-option').forEach(b=>b.onclick=()=>this.showFeatureInDevelopment());
  $('#difficulty').addEventListener('change',e=>this.game.newGame(e.target.value));
  $('#pauseBtn').onclick=()=>this.game.togglePause();$('#resumeBtn').onclick=()=>this.game.togglePause();
  $('#undoBtn').onclick=()=>this.game.undo();$('#redoBtn').onclick=()=>this.game.redo();$('#newBtn').onclick=()=>this.game.newGame(this.getDifficulty());
  $('#notesBtn').onclick=()=>{this.notesMode=!this.notesMode;$('#notesBtn').classList.toggle('active',this.notesMode);this.render()};
  const an=$('#autoNotesBtn');if(an)an.onclick=()=>this.game.autoNotes();
  $('#eraseBtn').onclick=()=>this.game.erase();$('#hintBtn').onclick=()=>{if(!this.game.hint())this.flashHint()};
  document.addEventListener('keydown',e=>{if(e.key==='Escape')this.closeHomeMenu();if(e.key>='1'&&e.key<='9')this.game.setNumber(+e.key);if(e.key==='Backspace'||e.key==='Delete')this.game.erase();if(e.key==='z'&&(e.ctrlKey||e.metaKey))this.game.undo();if(e.key==='y'&&(e.ctrlKey||e.metaKey))this.game.redo()})
 }
 toggleHomeMenu(){const menu=$('#homeDropdown'),button=$('#homeMenuBtn'),open=menu.classList.contains('hidden');menu.classList.toggle('hidden',!open);button.setAttribute('aria-expanded',String(open))}
 closeHomeMenu(){const menu=$('#homeDropdown'),button=$('#homeMenuBtn');if(!menu||menu.classList.contains('hidden'))return;menu.classList.add('hidden');button.setAttribute('aria-expanded','false')}
 openGame(){
  $('#homeScreen').classList.add('hidden');$('#gameScreen').classList.remove('hidden');
  if(this.game.running&&this.game.paused)this.game.togglePause()
 }
 onPlay(){
  if(this.game.running&&this.currentGameExists)this.showResumeChoice();
  else this.showDifficultyPicker()
 }
 showResumeChoice(){
  const level=DIFFICULTIES[this.game.difficulty]?.label||'actual';
  const modal=$('#modal');
  modal.innerHTML=`<div class="modal-card difficulty-dialog resume-dialog"><button class="picker-close" id="closeResumeChoice" aria-label="Cerrar">×</button><p class="picker-kicker">TU PARTIDA</p><h2>Tienes una partida sin terminar</h2><p class="picker-description">Puedes continuar donde la dejaste o empezar otra partida.</p><div class="resume-choice-list"><button class="resume-choice" id="resumeExisting"><span class="resume-choice-icon">▶</span><span class="difficulty-copy"><strong>Reanudar partida</strong><small>${level} · ${fmt(this.game.seconds)} jugados</small></span><span class="difficulty-arrow">›</span></button><button class="resume-choice new-choice" id="startNewFromChoice"><span class="resume-choice-icon">＋</span><span class="difficulty-copy"><strong>Nueva partida</strong><small>Elige una dificultad y comienza de nuevo</small></span><span class="difficulty-arrow">›</span></button></div><button class="picker-back" id="backToHome">Volver al inicio</button></div>`;
  modal.classList.remove('hidden');
  $('#resumeExisting').onclick=()=>{hideModal();this.openGame()};
  $('#startNewFromChoice').onclick=()=>this.showDifficultyPicker();
  $('#closeResumeChoice').onclick=hideModal;$('#backToHome').onclick=hideModal
 }
 showDifficultyPicker(){
  const options=[['easy','Fácil','Para empezar con calma.'],['medium','Medio','Un reto para entrar en ritmo.'],['hard','Difícil','Pon a prueba tu lógica.'],['expert','Experto','Para mentes persistentes.'],['master','Maestro','Un desafío de alto nivel.'],['extreme','Extremo','¿Te atreves con todo?']];
  const modal=$('#modal');
  modal.innerHTML=`<div class="modal-card difficulty-dialog"><button class="picker-close" id="closeDifficulty" aria-label="Cerrar">×</button><p class="picker-kicker">PREPARA TU PARTIDA</p><h2>Elige la dificultad</h2><p class="picker-description">Cada nivel trae un nuevo reto. ¿Cuál va contigo hoy?</p><div class="difficulty-grid">${options.map(([key,label,desc],i)=>`<button class="difficulty-choice difficulty-${key}" data-difficulty="${key}"><span class="difficulty-number">0${i+1}</span><span class="difficulty-copy"><strong>${label}</strong><small>${desc}</small></span><span class="difficulty-arrow">›</span></button>`).join('')}</div><button class="picker-back" id="backToHome">Volver al inicio</button></div>`;
  modal.classList.remove('hidden');
  modal.querySelectorAll('.difficulty-choice').forEach(button=>button.onclick=()=>{this.game.newGame(button.dataset.difficulty);hideModal();this.openGame()});
  $('#closeDifficulty').onclick=hideModal;$('#backToHome').onclick=hideModal
 }
 openHome(){
  if(this.game.running){this.game.paused=true;this.game.save()}
  $('#pauseOverlay').classList.add('hidden');
  $('#gameScreen').classList.add('hidden');$('#homeScreen').classList.remove('hidden')
 }
 showFeatureInDevelopment(){this.closeHomeMenu();showModal('🚧 Función en desarrollo','Estamos preparando esta función para ti. ❤️',[['Volver','primary-action',hideModal]])}
 flashHint(){const b=$('#hintBtn'),old=b.textContent;b.textContent='Sin pistas disponibles';setTimeout(()=>b.textContent=old,1000)}
 render(){
  const g=this.game;if(!g)return;$('#difficulty').value=g.difficulty;$('#difficultyLabel').textContent=DIFFICULTIES[g.difficulty].label+(g.daily?' · diario':'');
  // 0.2.16: the difficulty selector disappears once the player has made a move in this game
  $('#difficulty').classList.toggle('hidden',g.history.length>0||g.future.length>0||g.errors>0||g.hints>0||g.board.some((v,i)=>v!==g.puzzle[i])||g.notes.some(s=>s.size>0)||!!g.daily);
   $('#newBtn').classList.toggle('hidden',!!g.daily);   // 0.2.32: the daily puzzle has no "new sudoku" button
  $('#timer').textContent=fmt(g.seconds);$('#errors').textContent=g.errors;
  $('#hints').textContent=`${g.hints}/${DIFFICULTIES[g.difficulty].hintLimit>=99?'∞':DIFFICULTIES[g.difficulty].hintLimit}`;
  $('#undoBtn').disabled=!g.history.length;$('#redoBtn').disabled=!g.future.length;$('#pauseBtn').textContent=g.paused?'▶':'⏸';
  this.renderBoard();this.renderKeypad();this.updateStats()
 }
 updateStats(){if(!this.game)return;$('#timer').textContent=fmt(this.game.seconds);$('#errors').textContent=this.game.errors}
 renderPause(p){$('#pauseOverlay').classList.toggle('hidden',!p);this.render()}
 renderBoard(){
  const g=this.game;if(!g)return;boardEl.innerHTML='';const sel=g.selected,selN=sel!==null?g.board[sel]:0;
  for(let i=0;i<81;i++){
   const c=document.createElement('button');c.className='cell';c.setAttribute('role','gridcell');c.dataset.i=i;
   const r=Math.floor(i/9),col=i%9;
   if(col===2||col===5)c.classList.add('box-right');
   if(col===8)c.classList.add('grid-right');
   if(r===2||r===5)c.classList.add('box-bottom');
   if(r===8)c.classList.add('grid-bottom');
   if(g.puzzle[i])c.classList.add('given');if(i===sel)c.classList.add('selected');
   if(sel!==null){
    if(r===Math.floor(sel/9)||col===sel%9)c.classList.add('related');
    const sr=Math.floor(sel/27)*3,sc=Math.floor((sel%9)/3)*3;
    if(r>=sr&&r<sr+3&&col>=sc&&col<sc+3)c.classList.add('related');
    if(selN&&g.board[i]===selN)c.classList.add('same')
   }
   if(g.board[i]){c.textContent=g.board[i];if(g.board[i]!==g.solution[i])c.classList.add('wrong')}
   else{
    const ns=document.createElement('div');ns.className='notes';
    for(let n=1;n<=9;n++){const d=document.createElement('span');d.className='note'+(g.notes[i].has(n)?' on':'')+(selN===n&&g.notes[i].has(n)?' match':'');d.textContent=g.notes[i].has(n)?n:' ';ns.appendChild(d)}
    c.appendChild(ns)
   }
   c.onclick=()=>g.select(i);boardEl.appendChild(c)
  }
  $('#selectedInfo').textContent=sel===null?'Selecciona una casilla':`Casilla ${Math.floor(sel/9)+1},${sel%9+1}${g.puzzle[sel]?' · fija':''}`;
  $('#remainingInfo').textContent=sel===null?'—':`Candidatos: ${[...candidates(g.board,sel)].join(' ')||'ninguno'}`
 }
 renderKeypad(){
  const g=this.game;if(!g)return;keypad.innerHTML='';const counts=Array(10).fill(0);for(const n of g.board)if(n)counts[n]++;
  for(let n=1;n<=9;n++){const b=document.createElement('button');b.className='num-btn';b.innerHTML=`${n}<small>${counts[n]}/9</small>`;if(counts[n]>=9){b.classList.add('exhausted');b.disabled=true}b.onclick=()=>g.setNumber(n);keypad.appendChild(b)}
  const e=document.createElement('button');e.className='erase-key';e.textContent='⌫';e.onclick=()=>g.erase();keypad.appendChild(e)
 }
 wrong(i){const el=document.querySelector(`.cell[data-i="${i}"]`);if(el){el.classList.add('wrong');navigator.vibrate?.(120);setTimeout(()=>el.classList.remove('wrong'),220)}}
 // 0.2.28: a different Dominican congratulation each time ({n} = ", Name" when there is a profile)
 win(g){const n=window.SudomiProfile&&SudomiProfile.safeName()?', '+SudomiProfile.safeName():'',line=CONGRATS[Math.floor(Math.random()*CONGRATS.length)].replace('{n}',n);showModal(`🏆 ¡SUDOKU COMPLETADO!`,`${line}<br>Terminaste en <b>${fmt(g.seconds)}</b> con <b>${g.errors}</b> errores y <b>${g.hints}</b> pistas.`,[['Nuevo Sudoku','primary-action',()=>{hideModal();g.newGame(g.difficulty)}],['Cerrar','secondary-action',hideModal]])}
 // 0.2.28: after losing — same puzzle again, a new one, or another difficulty
 lose(g){showModal(`💥 SUDOMI TE VENCIÓ`,`Llegaste a <b>3 errores</b>.<br>Tiempo: <b>${fmt(g.seconds)}</b>`,[['Reintentar este sudoku','primary-action',()=>{hideModal();g.restartSame()}],['Nuevo sudoku','secondary-action',()=>{hideModal();g.newGame(g.difficulty)}],['Cambiar dificultad','secondary-action',()=>{hideModal();this.showDifficultyPicker()}],['Cerrar','secondary-action',hideModal]])}
}
const CONGRATS=['¡Excelente{n}!','¡Tremendo{n}! Eso fue de campeón.','¡Qué nivel{n}! Lo resolviste como un tigre.','¡Eso ta’ chévere{n}!','¡Bacano{n}! Sudoku completado.','¡Diablo{n}, qué cabeza!','¡Eres un duro{n}!','¡Ta’ to’{n}! Misión cumplida.','¡Wepa{n}! Lo lograste.','¡Así se hace{n}! Orgullo dominicano. 🇩🇴'];
function fmt(s){return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
function showModal(title,body,actions){const m=$('#modal');m.innerHTML=`<div class="modal-card"><h2>${title}</h2><p>${body}</p><div class="modal-actions">${actions.map((a,i)=>`<button class="${a[1]}" data-a="${i}">${a[0]}</button>`).join('')}</div></div>`;m.classList.remove('hidden');actions.forEach((a,i)=>m.querySelector(`[data-a="${i}"]`).onclick=a[2])}
function hideModal(){$('#modal').classList.add('hidden')}
// 0.2.32: handle for js/daily.js (it needs the game, the generator pieces and the modal helpers)
window.SudomiCore={ui:new UI(),DIFFICULTIES,CONGRATS,generateSolution,carve,logicSolve,generatePuzzle,showModal,hideModal};
