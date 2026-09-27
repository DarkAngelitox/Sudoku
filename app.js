// SUDOMI CORE 0.1.1 — classic-script bundle for GitHub Pages/Safari
const SIZE=9;
const ROWS=[...Array(9).keys()];
const shuffled=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const idx=(r,c)=>r*9+c;
const peers=i=>{const r=Math.floor(i/9),c=i%9,s=new Set();for(let x=0;x<9;x++){if(x!==c)s.add(idx(r,x));if(x!==r)s.add(idx(x,c))}const br=Math.floor(r/3)*3,bc=Math.floor(c/3)*3;for(let rr=br;rr<br+3;rr++)for(let cc=bc;cc<bc+3;cc++)if(rr!==r||cc!==c)s.add(idx(rr,cc));return [...s]};
function candidates(board,i){if(board[i])return new Set();const used=new Set(peers(i).map(p=>board[p]).filter(Boolean));return new Set(ROWS.map(x=>x+1).filter(n=>!used.has(n)))}
function solveCount(board,limit=2){let best=-1,bestC=null;for(let i=0;i<81;i++)if(!board[i]){const c=candidates(board,i);if(c.size===0)return 0;if(!bestC||c.size<bestC.size){best=i;bestC=c;if(c.size===1)break}}if(best<0)return 1;let count=0;for(const n of shuffled([...bestC])){board[best]=n;count+=solveCount(board,limit);if(count>=limit){board[best]=0;return count}board[best]=0}return count}
function countSolutions(board,limit=2){return solveCount([...board],limit)}
function solve(board){const b=[...board];function rec(){let best=-1,bc=null;for(let i=0;i<81;i++)if(!b[i]){const c=candidates(b,i);if(!c.size)return false;if(!bc||c.size<bc.size){best=i;bc=c}}if(best<0)return true;for(const n of shuffled([...bc])){b[best]=n;if(rec())return true;b[best]=0}return false}return rec()?b:null}
function generateSolution(){return solve(Array(81).fill(0))}
function carve(solution,targetClues){let puzzle=[...solution],order=shuffled(ROWS.map(r=>ROWS.flatMap(c=>[r*9+c])).flat());let clues=81;for(const i of order){if(clues<=targetClues)break;const old=puzzle[i];puzzle[i]=0;if(countSolutions(puzzle,2)!==1)puzzle[i]=old;else clues--}return puzzle}
const DIFFICULTIES={
 easy:{label:'Fácil',clues:40,hintLimit:99},medium:{label:'Medio',clues:34,hintLimit:99},hard:{label:'Difícil',clues:30,hintLimit:1},expert:{label:'Experto',clues:27,hintLimit:1},master:{label:'Maestro',clues:25,hintLimit:1},extreme:{label:'Extremo',clues:23,hintLimit:1}
};
function techniqueProfile(puzzle){let b=[...puzzle],steps=[];while(b.some(Boolean)===false?false:true){let progress=false;for(let i=0;i<81;i++)if(!b[i]){const c=candidates(b,i);if(c.size===1){b[i]=[...c][0];steps.push({type:'single',cell:i,value:b[i]});progress=true}}if(progress)continue;for(let unitType=0;unitType<3;unitType++){for(let u=0;u<9;u++){let cells=unitType===0?ROWS.map(c=>idx(u,c)):unitType===1?ROWS.map(r=>idx(r,u)):(()=>{const br=Math.floor(u/3)*3,bc=u%3*3;return [...Array(3)].flatMap((_,a)=>[...Array(3)].map((_,d)=>idx(br+a,bc+d)))})();for(let n=1;n<=9;n++){let poss=cells.filter(i=>!b[i]&&candidates(b,i).has(n));if(poss.length===1){b[poss[0]]=n;steps.push({type:'hidden-single',cell:poss[0],value:n});progress=true}}}}if(progress)continue;break}const unresolved=b.filter(x=>!x).length;return {steps,unresolved,level:unresolved?2:steps.some(s=>s.type==='hidden-single')?2:1};}
function generatePuzzle(key='medium'){const d=DIFFICULTIES[key]||DIFFICULTIES.medium;let attempts=0;while(attempts++<20){const solution=generateSolution();const puzzle=carve(solution,d.clues);const profile=techniqueProfile(puzzle);if(key==='easy'&&profile.unresolved===0&&profile.level===1)return {puzzle,solution};if(key==='medium'&&profile.unresolved===0)return {puzzle,solution};if(['hard','expert','master','extreme'].includes(key))return {puzzle,solution}}const solution=generateSolution();return {puzzle:carve(solution,d.clues),solution};}
function isComplete(board,solution){return board.every((n,i)=>n===solution[i])}

const KEY='sudomi-core-state-v01';
const emptyNotes=()=>Array.from({length:81},()=>new Set());
class Game{
 constructor(ui){this.ui=ui;this.resetHistory();this.loadOrNew();}
 resetHistory(){this.history=[];this.future=[]}
 snapshot(){return {board:[...this.board],notes:this.notes.map(s=>[...s]),errors:this.errors,seconds:this.seconds,hints:this.hints}}
 restore(s){this.board=[...s.board];this.notes=s.notes.map(a=>new Set(a));this.errors=s.errors;this.seconds=s.seconds;this.hints=s.hints}
 loadOrNew(){try{const s=JSON.parse(localStorage.getItem(KEY));if(s&&s.board&&s.solution){this.restore(s);this.solution=s.solution;this.puzzle=s.puzzle;this.difficulty=s.difficulty;this.paused=false;this.running=true;this.ui.render();return}}catch{}this.newGame(this.ui.getDifficulty(),false)}
 newGame(difficulty=this.difficulty||'easy',push=true){this.difficulty=difficulty;const {puzzle,solution}=generatePuzzle(difficulty);this.puzzle=puzzle;this.solution=solution;this.board=[...puzzle];this.notes=emptyNotes();this.errors=0;this.hints=0;this.seconds=0;this.paused=false;this.running=true;this.selected=null;this.resetHistory();this.save();this.ui.render()}
 save(){try{localStorage.setItem(KEY,JSON.stringify({puzzle:this.puzzle,solution:this.solution,board:this.board,notes:this.notes.map(a=>[...a]),errors:this.errors,hints:this.hints,seconds:this.seconds,difficulty:this.difficulty}))}catch{}}
 tick(){if(this.running&&!this.paused){this.seconds++;this.ui.updateStats()}}
 select(i){this.selected=i;this.ui.render()}
 push(){this.history.push(this.snapshot());if(this.history.length>200)this.history.shift();this.future=[]}
 setNumber(n){if(this.selected===null||this.paused||this.board[this.selected]===this.puzzle[this.selected])return false;const i=this.selected;if(this.ui.notesMode){this.toggleNote(n);return true}if(this.board[i]===n)return false;this.push();if(n!==this.solution[i]){this.board[i]=n;this.errors++;this.ui.wrong(i);if(this.difficulty!=='easy'&&this.difficulty!=='medium'&&this.errors>=3){this.board[i]=0;this.save();this.ui.render();this.lose();return true}this.save();this.ui.render();return true}this.board[i]=n;this.cleanNotes(i,n);this.save();this.ui.render();if(isComplete(this.board,this.solution))this.win();return true}
 toggleNote(n){const i=this.selected;if(this.board[i])return;this.push();if(this.notes[i].has(n))this.notes[i].delete(n);else this.notes[i].add(n);this.save();this.ui.render()}
 cleanNotes(i,n){for(const p of peers(i))this.notes[p].delete(n);this.notes[i].clear()}
 erase(){if(this.selected===null||this.paused)return;const i=this.selected;if(this.board[i]===this.puzzle[i]&&this.board[i]!==0)return; if(!this.board[i]&&!this.notes[i].size)return;this.push();this.board[i]=0;this.notes[i].clear();this.save();this.ui.render()}
 undo(){if(!this.history.length||this.paused)return;this.future.push(this.snapshot());this.restore(this.history.pop());this.save();this.ui.render()}
 redo(){if(!this.future.length||this.paused)return;this.history.push(this.snapshot());this.restore(this.future.pop());this.save();this.ui.render()}
 hint(){const limit=DIFFICULTIES[this.difficulty].hintLimit;if(this.hints>=limit)return false;let i=this.selected;if(i===null||this.board[i]){i=this.board.findIndex((n,j)=>!n&&this.notes[j].size===0)}if(i<0)return false;this.push();this.hints++;this.board[i]=this.solution[i];this.cleanNotes(i,this.solution[i]);this.save();this.ui.render();if(isComplete(this.board,this.solution))this.win();return true}
 togglePause(){if(!this.running)return;this.paused=!this.paused;this.ui.renderPause(this.paused)}
 win(){this.running=false;this.save();this.ui.win(this)}
 lose(){this.running=false;this.ui.lose(this)}
}
const $=s=>document.querySelector(s);const boardEl=$('#board'),keypad=$('#keypad');
class UI{
 constructor(){this.notesMode=true;this.selected=null;this.game=new Game(this);this.bind();setInterval(()=>this.game.tick(),1000)}
 getDifficulty(){return $('#difficulty').value}
 bind(){
  $('#difficulty').addEventListener('change',e=>this.game.newGame(e.target.value));
  $('#pauseBtn').onclick=()=>this.game.togglePause();$('#resumeBtn').onclick=()=>this.game.togglePause();$('#undoBtn').onclick=()=>this.game.undo();$('#redoBtn').onclick=()=>this.game.redo();$('#newBtn').onclick=()=>this.game.newGame(this.getDifficulty());
  $('#notesBtn').onclick=()=>{this.notesMode=!this.notesMode;$('#notesBtn').classList.toggle('active',this.notesMode);this.render()};$('#eraseBtn').onclick=()=>this.game.erase();$('#hintBtn').onclick=()=>{if(!this.game.hint())this.flashHint()};
  document.addEventListener('keydown',e=>{if(e.key>='1'&&e.key<='9')this.game.setNumber(+e.key);if(e.key==='Backspace'||e.key==='Delete')this.game.erase();if(e.key==='z'&&(e.ctrlKey||e.metaKey))this.game.undo();if(e.key==='y'&&(e.ctrlKey||e.metaKey))this.game.redo();});
 }
 flashHint(){const b=$('#hintBtn');const old=b.textContent;b.textContent='Sin pistas disponibles';setTimeout(()=>b.textContent=old,1000)}
 render(){const g=this.game;$('#difficulty').value=g.difficulty;$('#difficultyLabel').textContent=DIFFICULTIES[g.difficulty].label;$('#timer').textContent=fmt(g.seconds);$('#errors').textContent=g.errors;$('#hints').textContent=`${g.hints}/${DIFFICULTIES[g.difficulty].hintLimit>=99?'∞':DIFFICULTIES[g.difficulty].hintLimit}`;$('#undoBtn').disabled=!g.history.length;$('#redoBtn').disabled=!g.future.length;$('#pauseBtn').textContent=g.paused?'▶':'⏸';this.renderBoard();this.renderKeypad();this.updateStats()}
 updateStats(){if(!this.game)return;$('#timer').textContent=fmt(this.game.seconds);$('#errors').textContent=this.game.errors;}
 renderPause(p){$('#pauseOverlay').classList.toggle('hidden',!p);this.render()}
 renderBoard(){const g=this.game;boardEl.innerHTML='';const sel=g.selected;const selN=sel!==null?g.board[sel]:0;for(let i=0;i<81;i++){const c=document.createElement('button');c.className='cell';c.setAttribute('role','gridcell');c.dataset.i=i;const r=Math.floor(i/9),col=i%9;if(g.puzzle[i])c.classList.add('given');if(i===sel)c.classList.add('selected');if(sel!==null){if(r===Math.floor(sel/9)||col===sel%9)c.classList.add('related');const sr=Math.floor(sel/27)*3,sc=Math.floor((sel%9)/3)*3;if(r>=sr&&r<sr+3&&col>=sc&&col<sc+3)c.classList.add('related');if(selN&&g.board[i]===selN)c.classList.add('same')}if(g.board[i]){c.textContent=g.board[i];if(g.board[i]!==g.solution[i])c.classList.add('wrong')}else{const ns=document.createElement('div');ns.className='notes';for(let n=1;n<=9;n++){const d=document.createElement('span');d.className='note'+(g.notes[i].has(n)?' on':'')+(selN===n&&g.notes[i].has(n)?' match':'');d.textContent=g.notes[i].has(n)?n:' ';ns.appendChild(d)}c.appendChild(ns)}c.onclick=()=>{g.select(i)};boardEl.appendChild(c)}
  $('#selectedInfo').textContent=sel===null?'Selecciona una casilla':`Casilla ${Math.floor(sel/9)+1},${sel%9+1}${g.puzzle[sel]?' · fija':''}`;$('#remainingInfo').textContent=sel===null?'—':`Candidatos: ${[...candidates(g.board,sel)].join(' ')||'ninguno'}`;
 }
 renderKeypad(){const g=this.game;keypad.innerHTML='';const counts=Array(10).fill(0);for(const n of g.board)if(n)counts[n]++;for(let n=1;n<=9;n++){const b=document.createElement('button');b.className='num-btn';b.innerHTML=`${n}<small>${counts[n]}/9</small>`;if(counts[n]>=9){b.classList.add('exhausted');b.disabled=true}b.onclick=()=>g.setNumber(n);keypad.appendChild(b)}const e=document.createElement('button');e.className='erase-key';e.textContent='⌫';e.onclick=()=>g.erase();keypad.appendChild(e)}
 wrong(i){const el=document.querySelector(`.cell[data-i="${i}"]`);if(el){el.classList.add('wrong');navigator.vibrate?.(120);setTimeout(()=>el.classList.remove('wrong'),220)}}
 win(g){showModal(`🏆 ¡SUDOKU COMPLETADO!`,`¡Excelente! Terminaste en <b>${fmt(g.seconds)}</b> con <b>${g.errors}</b> errores y <b>${g.hints}</b> pistas.`,[['Nuevo Sudoku','primary-action',()=>{hideModal();g.newGame(g.difficulty)}],['Cerrar','secondary-action',hideModal]])}
 lose(g){showModal(`💥 SUDOMI TE VENCIÓ`,`Llegaste a <b>3 errores</b>.<br>Tiempo: <b>${fmt(g.seconds)}</b>`,[['Reintentar','primary-action',()=>{hideModal();g.newGame(g.difficulty)}],['Cerrar','secondary-action',hideModal]])}
}
function fmt(s){return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`}
function showModal(title,body,actions){const m=$('#modal');m.innerHTML=`<div class="modal-card"><h2>${title}</h2><p>${body}</p><div class="modal-actions">${actions.map((a,i)=>`<button class="${a[1]}" data-a="${i}">${a[0]}</button>`).join('')}</div></div>`;m.classList.remove('hidden');actions.forEach((a,i)=>m.querySelector(`[data-a="${i}"]`).onclick=a[2])}
function hideModal(){$('#modal').classList.add('hidden')}
new UI();
