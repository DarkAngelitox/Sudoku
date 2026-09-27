import {Game} from './game.js';
import {DIFFICULTIES,candidates} from './sudoku.js';
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
