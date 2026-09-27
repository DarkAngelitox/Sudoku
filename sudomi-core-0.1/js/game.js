import {DIFFICULTIES,candidates,generatePuzzle,isComplete,peers,idx} from './sudoku.js';
const KEY='sudomi-core-state-v01';
const emptyNotes=()=>Array.from({length:81},()=>new Set());
export class Game{
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
