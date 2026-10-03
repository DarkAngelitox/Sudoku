/* SUDOMI 0.2.42 — Phase 11: achievements, plus the win counters they (and the future Statistics, Phase 12) need.
 * COUNTERS (localStorage['sudomi-ach'].stats): total wins, wins per difficulty, flawless wins, wins without hints, best combo, best score,
 * fastest times, other-games results. Counted once per puzzle when a sudoku is finished ('sudomi-win', after score.js and xp.js).
 * ACHIEVEMENTS: 31 normal/secret ones + the crown "Rey del Sudomi", unlocked when ALL the others are. Each gives XP through SudomiXP.
 * Other games are counted by watching the end-of-game card ("PARTIDA TERMINADA") that js/other-games.js already draws; DOS and STOP
 * have their own end screens and are not counted yet. js/app.js is not changed (a lost game is noticed by wrapping ui.lose()). */
(()=>{
 const C=window.SudomiCore;if(!C)return;
 const ui=C.ui,$=s=>document.querySelector(s),KEY='sudomi-ach';
 const MAXD=['hard','expert','master','extreme'];
 const GAMES={'buscaminas':'mines','batalla naval':'fleet','ajedrez':'chess','damas':'checkers','tres en raya':'tictactoe','4 en línea':'connect4','dominó':'domino','memoria de animales':'memory','puntos y cajas':'dotsboxes','duelo mahjong':'mahjong','blackjack':'blackjack','póker':'poker','escoba':'escoba','rummy':'rummy'};
 const fmt=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,',');
 const blank=()=>({unlocked:{},stats:{wins:0,byDiff:{easy:0,medium:0,hard:0,expert:0,master:0,extreme:0},flawless:0,noHint:0,perfectHard:0,maxCombo:0,bestScore:0,fastEasy:0,fastMed:0,calm:0,night:0,lucky:0,pride:0,persistent:0,maxStreak:0,otherWins:{},counted:[],losses:[],bestTime:{}}});
 let D=(()=>{try{const v=JSON.parse(localStorage.getItem(KEY));if(v&&v.stats){const b=blank();return {unlocked:v.unlocked||{},stats:{...b.stats,...v.stats,byDiff:{...b.stats.byDiff,...(v.stats.byDiff||{})},otherWins:v.stats.otherWins||{},counted:v.stats.counted||[],losses:v.stats.losses||[],bestTime:v.stats.bestTime||{}}}}}catch(_){}return blank()})();
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(D))}catch(_){}};
 const lvl=()=>window.SudomiXP?SudomiXP.info.L:1;
 const read=k=>{try{return JSON.parse(localStorage.getItem(k))||{}}catch(_){return {}}};
 const dailyDone=()=>read('sudomi-daily').done||{};
 const monthFull=()=>{const done=dailyDone(),by={};for(const k of Object.keys(done)){const m=k.slice(0,7);by[m]=(by[m]||0)+1}return Object.entries(by).some(([m,n])=>{const [y,mo]=m.split('-').map(Number);return n>=new Date(y,mo,0).getDate()})};
 const styled=()=>{const c=read('sudomi-custom');let s='';try{s=localStorage.getItem('sudomi-skin')||''}catch(_){}return !!s||(c.accent&&c.accent!=='dominicano')||c.digits==='grande'};
 const otherCount=()=>Object.keys(D.stats.otherWins).length;
 // ---- the list: [id, group, icon, name, description, xp, secret, test(), progress()]
 const S=()=>D.stats;
 const LIST=[
  ['first','Victorias','🥇','Primer paso','Gana tu primer sudoku',30,0,()=>S().wins>=1,()=>[S().wins,1]],
  ['w10','Victorias','🔟','De poco a mucho','Gana 10 sudokus',60,0,()=>S().wins>=10,()=>[S().wins,10]],
  ['w50','Victorias','5️⃣','Tablero conocido','Gana 50 sudokus',150,0,()=>S().wins>=50,()=>[S().wins,50]],
  ['w100','Victorias','💯','Cien tableros','Gana 100 sudokus',300,0,()=>S().wins>=100,()=>[S().wins,100]],
  ['easy','Dificultad','🌱','Calentando','Gana en Fácil',20,0,()=>S().byDiff.easy>=1],
  ['midhard','Dificultad','📈','Subiendo','Gana en Medio y en Difícil',50,0,()=>S().byDiff.medium>=1&&S().byDiff.hard>=1],
  ['expert','Dificultad','🧠','Mente fría','Gana en Experto',100,0,()=>S().byDiff.expert>=1],
  ['master','Dificultad','👑','Maestro del tablero','Gana en Maestro',150,0,()=>S().byDiff.master>=1],
  ['extreme','Dificultad','🔥','Sin miedo','Gana en Extremo',250,0,()=>S().byDiff.extreme>=1],
  ['flawless','Precisión','✨','Impecable','Gana un sudoku sin errores',50,0,()=>S().flawless>=1],
  ['nohint','Precisión','🧘','Sin ayuda','Gana un sudoku sin usar pistas',50,0,()=>S().noHint>=1],
  ['perfect','Precisión','💎','Perfecto','Gana sin errores ni pistas en Difícil o más',150,0,()=>S().perfectHard>=1],
  ['fast','Velocidad','⚡','Rápido','Gana un Fácil en menos de 4 minutos',50,0,()=>S().fastEasy>=1],
  ['lightning','Velocidad','🚀','Relámpago','Gana un Medio en menos de 6 minutos',100,0,()=>S().fastMed>=1],
  ['combo15','Velocidad','🔥','En racha','Logra un combo de 15',40,0,()=>S().maxCombo>=15,()=>[S().maxCombo,15]],
  ['combo40','Velocidad','🌋','Imparable','Logra un combo de 40',100,0,()=>S().maxCombo>=40,()=>[S().maxCombo,40]],
  ['score3000','Velocidad','💰','Gran puntuación','Pasa los 3,000 puntos en una partida',80,0,()=>S().bestScore>=3000,()=>[S().bestScore,3000]],
  ['daily1','Sudoku del día','📅','Puntual','Completa tu primer Sudoku del día',30,0,()=>Object.keys(dailyDone()).length>=1],
  ['streak7','Sudoku del día','🗓️','Constancia','Racha de 7 días en el Sudoku del día',150,0,()=>S().maxStreak>=7,()=>[S().maxStreak,7]],
  ['month','Sudoku del día','⭐','Mes de estrellas','Completa todos los días de un mes',400,0,()=>monthFull()],
  ['tutorial','Progreso','📘','Estudiante','Termina el tutorial',20,0,()=>!!read('sudomi-tutorial').seen],
  ['lvl5','Progreso','🎓','Nivel 5','Llega al nivel 5',40,0,()=>lvl()>=5,()=>[lvl(),5]],
  ['lvl10','Progreso','🎓','Nivel 10','Llega al nivel 10',80,0,()=>lvl()>=10,()=>[lvl(),10]],
  ['lvl25','Progreso','🎓','Nivel 25','Llega al nivel 25',200,0,()=>lvl()>=25,()=>[lvl(),25]],
  ['style','Progreso','🎨','A tu gusto','Cambia el estilo o los colores en Personalizar',20,0,()=>styled()],
  ['games5','Progreso','🎮','Jugón','Termina una partida (sin perder) en 5 juegos distintos de Otros juegos',100,0,()=>otherCount()>=5,()=>[otherCount(),5]],
  ['night','Secretos','🌙','Noctámbulo','Gana una partida entre las 12 y las 5 de la madrugada',50,1,()=>S().night>=1],
  ['lucky','Secretos','🍀','Suerte de campeón','Gana un Extremo sin errores ni pistas',500,1,()=>S().lucky>=1],
  ['calm','Secretos','🐢','Con calma','Gana una partida tardando más de una hora',30,1,()=>S().calm>=1],
  ['persist','Secretos','🔁','Persistente','Pierde un sudoku y vuelve a intentarlo hasta ganarlo',50,1,()=>S().persistent>=1],
  ['pride','Secretos','🇩🇴','Orgullo dominicano','Gana una partida el 27 de febrero, el 26 de enero o el 16 de agosto',100,1,()=>S().pride>=1]
 ];
 const KING={id:'king',icon:'👑',name:'Rey del Sudomi',desc:'Consigue todos los demás logros',xp:1000};
 const isKing=()=>!!D.unlocked.king;
 // ---- checking and unlocking
 const queue=[];let toasting=false;
 function toast(a){queue.push(a);window.dispatchEvent(new CustomEvent('sudomi-achievement',{detail:{id:a.id}}));if(!toasting)next()}   // 0.2.44: js/sound.js listens
 function next(){
  const a=queue.shift();if(!a){toasting=false;return}toasting=true;
  let t=$('#achToast');if(!t){t=document.createElement('button');t.id='achToast';t.type='button';t.className='ach-toast';document.body.appendChild(t);t.onclick=()=>openScreen()}
  t.innerHTML=`<span class="at-icon">${a.icon}</span><span class="at-copy"><small>${a.id==='king'?'¡LOGRO SUPREMO!':'LOGRO DESBLOQUEADO'}</small><b>${a.name}</b><em>+${a.xp} XP</em></span>`;
  t.classList.toggle('king',a.id==='king');t.classList.add('show');
  setTimeout(()=>{t.classList.remove('show');setTimeout(next,350)},a.id==='king'?4200:3000);
 }
 let checking=false;
 function check(){
  if(checking)return;checking=true;
  try{
   try{const st=window.SudomiDaily?SudomiDaily.streak():0;if(st>D.stats.maxStreak){D.stats.maxStreak=st}}catch(_){}
   let again=true,guard=0;
   while(again&&guard++<6){
    again=false;
    for(const a of LIST){
     if(D.unlocked[a[0]])continue;let ok=false;try{ok=a[7]()}catch(_){}
     if(ok){D.unlocked[a[0]]=Date.now();again=true;if(window.SudomiXP)SudomiXP.award(a[5]);toast({id:a[0],icon:a[2],name:a[3],xp:a[5]})}
    }
    if(!D.unlocked.king&&LIST.every(a=>D.unlocked[a[0]])){D.unlocked.king=Date.now();again=true;if(window.SudomiXP)SudomiXP.award(KING.xp);toast({id:'king',icon:KING.icon,name:KING.name,xp:KING.xp})}
   }
  }finally{checking=false}
  save();menuCount();
  if(!($('#achScreen')||{classList:{contains:()=>true}}).classList.contains('hidden'))draw();
 }
 function menuCount(){const b=$('#openAchievements small');if(b)b.textContent=`${LIST.filter(a=>D.unlocked[a[0]]).length} / ${LIST.length}${isKing()?' 👑':''}`}
 // ---- counters
 function onWin(e){
  const g=ui.game,d=e.detail||{};if(!g)return;
  const sig=g.puzzle.join('');if(D.stats.counted.includes(sig))return check();
  D.stats.counted.push(sig);if(D.stats.counted.length>120)D.stats.counted.shift();
  const s=D.stats,diff=g.difficulty,sec=d.seconds||g.seconds||0,err=d.errors||0,hints=g.hints||0;
  s.wins++;s.byDiff[diff]=(s.byDiff[diff]||0)+1;
  if(!err)s.flawless++;if(!hints)s.noHint++;
  if(!err&&!hints&&MAXD.includes(diff))s.perfectHard++;
  if(diff==='easy'&&sec<240)s.fastEasy=1;if(diff==='medium'&&sec<360)s.fastMed=1;
  if(sec>3600)s.calm=1;
  const hr=new Date().getHours();if(hr>=0&&hr<5)s.night=1;
  if(diff==='extreme'&&!err&&!hints)s.lucky=1;
  const dt=new Date(),md=`${dt.getMonth()+1}-${dt.getDate()}`;if(['2-27','1-26','8-16'].includes(md))s.pride=1;
  if(s.losses.includes(sig))s.persistent=1;
  const sc=window.SudomiScore&&SudomiScore.state;if(sc){if(sc.maxCombo>s.maxCombo)s.maxCombo=sc.maxCombo;if(sc.final&&sc.final.total>s.bestScore)s.bestScore=sc.final.total}
  if(!s.bestTime[diff]||sec<s.bestTime[diff])s.bestTime[diff]=sec;
  save();check();
 }
 window.addEventListener('sudomi-win',onWin);
 const origLose=ui.lose.bind(ui);
 ui.lose=function(g){try{const sig=g.puzzle.join('');if(!D.stats.losses.includes(sig)){D.stats.losses.push(sig);if(D.stats.losses.length>60)D.stats.losses.shift();save()}}catch(_){}return origLose(g)};
 // ---- results of the other games (the end-of-game card)
 function watchGames(){
  const scr=$('#miniGamesScreen');if(!scr)return;
  new MutationObserver(()=>{
   const card=scr.querySelector('.game-end-card');if(!card||card.dataset.ach)return;card.dataset.ach='1';
   const h=scr.querySelector('.mini-game-head h2'),id=h&&GAMES[h.textContent.trim().toLowerCase()];
   const win=(card.querySelector('strong')||{}).textContent||'';
   if(id&&!/computadora|sin ganador/i.test(win)){D.stats.otherWins[id]=(D.stats.otherWins[id]||0)+1;save();check()}
  }).observe(scr,{childList:true,subtree:true});
 }
 // ---- screen
 function openScreen(){
  let s=$('#achScreen');
  if(!s){s=document.createElement('div');s.id='achScreen';s.className='tut ach-screen hidden';s.setAttribute('role','dialog');s.setAttribute('aria-modal','true');
   s.innerHTML='<div class="tut-card ach-card"><header><h2 class="tut-title ach-title">🏆 Logros</h2><button type="button" class="tut-x" aria-label="Cerrar">✕</button></header><div class="tut-body ach-body"></div></div>';
   document.body.appendChild(s);s.querySelector('.tut-x').onclick=closeScreen;s.addEventListener('click',e=>{if(e.target===s)closeScreen()});
   document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!s.classList.contains('hidden'))closeScreen()});}
  check();s.classList.remove('hidden');document.body.classList.add('tut-open');draw();
 }
 function closeScreen(){const s=$('#achScreen');if(s)s.classList.add('hidden');document.body.classList.remove('tut-open')}
 const DN={easy:'Fácil',medium:'Medio',hard:'Difícil',expert:'Experto',master:'Maestro',extreme:'Extremo'};
 function draw(){
  const s=$('#achScreen');if(!s)return;const body=s.querySelector('.ach-body'),st=D.stats,done=LIST.filter(a=>D.unlocked[a[0]]).length;
  const pct=Math.round(done/LIST.length*100);
  const king=`<div class="ach-king ${isKing()?'on':''}"><span class="ak-crown">👑</span><div><small>EL MÁXIMO LOGRO</small><b>${KING.name}</b><p>${isKing()?'¡Lo conseguiste! Eres el rey del tablero.':KING.desc+` · +${KING.xp} XP`}</p><div class="ak-bar"><i style="width:${pct}%"></i></div><em>${done} / ${LIST.length}</em></div></div>`;
  const counters=`<div class="ach-counters"><h3>Contador de victorias</h3><div class="ac-total"><b>${fmt(st.wins)}</b><span>victorias en sudoku</span></div><div class="ac-grid">${Object.keys(DN).map(k=>`<div><b>${fmt(st.byDiff[k]||0)}</b><small>${DN[k]}</small></div>`).join('')}</div><div class="ac-row"><span>✨ Sin errores <b>${fmt(st.flawless)}</b></span><span>🧘 Sin pistas <b>${fmt(st.noHint)}</b></span></div><div class="ac-row"><span>🔥 Mejor combo <b>${st.maxCombo}</b></span><span>💰 Mejor puntuación <b>${fmt(st.bestScore)}</b></span></div><div class="ac-row"><span>🎮 Otros juegos ganados <b>${fmt(Object.values(st.otherWins).reduce((a,b)=>a+b,0))}</b></span><span>📚 Juegos distintos <b>${otherCount()}</b></span></div></div>`;
  const groups=[...new Set(LIST.map(a=>a[1]))].map(gr=>{
   const rows=LIST.filter(a=>a[1]===gr).map(a=>{
    const on=!!D.unlocked[a[0]],sec=a[6]&&!on,pr=a[8]&&!on?a[8]():null;
    return `<div class="ach-item ${on?'on':''} ${sec?'secret':''}"><span class="ai-icon">${sec?'❔':a[2]}</span><div class="ai-main"><b>${sec?'???':a[3]}</b><small>${sec?'Logro secreto: ¡descúbrelo jugando!':a[4]}</small>${pr?`<span class="ai-bar"><i style="width:${Math.min(100,Math.round(pr[0]/pr[1]*100))}%"></i></span><em>${fmt(Math.min(pr[0],pr[1]))} / ${fmt(pr[1])}</em>`:''}</div><span class="ai-xp">${on?'✅':`+${a[5]} XP`}</span></div>`}).join('');
   const n=LIST.filter(a=>a[1]===gr&&D.unlocked[a[0]]).length,t=LIST.filter(a=>a[1]===gr).length;
   return `<h3 class="ach-group">${gr} <small>${n}/${t}</small></h3>${rows}`}).join('');
  body.innerHTML=king+counters+groups;
 }
 function boot(){
  const b=$('#openAchievements');if(b)b.onclick=()=>{const m=$('#homeDropdown');if(m)m.classList.add('hidden');const t=$('#homeMenuBtn');if(t)t.setAttribute('aria-expanded','false');openScreen()};
  watchGames();check();menuCount();setInterval(check,5000);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
 window.SudomiAch={open:openScreen,check,toast,get king(){return isKing()},get stats(){return D.stats},list:LIST.map(a=>({id:a[0],name:a[3],xp:a[5]})),unlocked:()=>({...D.unlocked}),reset(){D=blank();save();menuCount()}};
})();
