/* SUDOMI 0.2.53 — Rankings (SIMULATED).
 * There is no server yet, so this screen shows a deterministic, hand-made list of 15 players that looks like a community ranking:
 * the scores run from "almost perfect" at #1 (about 93 % of the theoretical maximum of each difficulty, very hard to reach) down to
 * "slightly less perfect" at #15 (about 79 %). The player's own numbers (best score per difficulty, level, best daily streak) are real: if they
 * beat a listed value they are placed in the list; otherwise an estimated position among ~2,400 players is shown.
 * IMPORTANT: the other players are not real. When real rankings are built (Phase 18, needs a server) this file is replaced.
 * Theoretical maxima come from js/score.js (an instant, perfect, error-free game): Fácil 3085 · Medio 4026 · Difícil 4860 · Experto 6530 · Maestro 8215 · Extremo 9815. */
(()=>{
 const S=window.SudomiScreen;if(!S)return;
 const DIFFS=['easy','medium','hard','expert','master','extreme'],DN={easy:'Fácil',medium:'Medio',hard:'Difícil',expert:'Experto',master:'Maestro',extreme:'Extremo'};
 const MAXS={easy:3085,medium:4026,hard:4860,expert:6530,master:8215,extreme:9815};
 const SHARE=[.93,.915,.904,.893,.881,.869,.857,.846,.835,.824,.813,.803,.794,.786,.78];       // share of the maximum for places 1…15
 const PLAYERS=[
  ['Quisqueya_Pro','🦅','🇩🇴'],['Yaritza809','👩‍🦱','🇩🇴'],['ElTigreDelCibao','🐯','🇩🇴'],['MaestroKiko','🧠','🇩🇴'],['Dulce_Mar','🌴','🇵🇷'],
  ['SudokuBoss','👑','🇺🇸'],['Merengue_Mind','🎺','🇩🇴'],['LaProfe_Nelly','👩‍🏫','🇩🇴'],['Caribe_Lex','🌊','🇩🇴'],['DonPepe_RD','🎩','🇩🇴'],
  ['Mamajuana77','🍹','🇩🇴'],['Lógica_Total','🔢','🇪🇸'],['Colmadón_Pro','🛵','🇩🇴'],['Nube849','☁️','🇩🇴'],['Ficha_Veloz','⚡','🇲🇽']
 ];
 const LEVELS=[46,45,45,44,43,42,41,40,40,39,38,37,37,36,35];
 const STREAKS=[118,104,97,92,88,81,77,70,66,61,57,52,49,45,42];
 const TOTAL=2418;
 const fmt=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,',');
 const read=k=>{try{return JSON.parse(localStorage.getItem(k))||{}}catch(_){return {}}};
 // each board uses a different order of the same 15 names so the lists do not look copied
 const order=(seed)=>{const a=PLAYERS.map((p,i)=>i);let s=seed*9301+49297;for(let i=a.length-1;i>0;i--){s=(s*9301+49297)%233280;const j=Math.floor(s/233280*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
 function board(kind,diff){
  const seed=kind==='level'?3:kind==='streak'?5:2+DIFFS.indexOf(diff)*7;
  const ord=order(seed);
  let vals;
  if(kind==='score')vals=SHARE.map(s=>Math.round(MAXS[diff]*s));else if(kind==='level')vals=LEVELS.slice();else vals=STREAKS.slice();
  return vals.map((v,i)=>({v,p:PLAYERS[ord[i]]}));
 }
 function mine(kind,diff){
  if(kind==='score'){const b=read('sudomi-score-best');return +b[diff]||0}
  if(kind==='level')return window.SudomiXP?SudomiXP.info.L:1;
  return window.SudomiDaily?SudomiDaily.bestStreak():0;
 }
 const unit={score:'pts',level:'nivel',streak:'días'};
 function place(list,val,kind){
  // position of the player: inside the list if the value beats a listed one, else an estimate among TOTAL players
  const idx=list.findIndex(e=>val>e.v);
  if(idx>=0)return {rank:idx+1,inList:true,idx};
  const last=list[list.length-1].v,frac=Math.max(0,Math.min(1,val/last));
  if(val<=0)return {rank:null};
  return {rank:Math.min(TOTAL,16+Math.floor((TOTAL-16)*Math.pow(1-frac,1.7)+frac*8)),inList:false};
 }
 function open(){
  let kind='score',diff='easy';
  S.open('rankScreen','🌍 Rankings',(body,api)=>{
   const list=board(kind,diff),val=mine(kind,diff),pl=place(list,val,kind);
   const rows=list.map((e,i)=>({...e,rank:i+1}));
   if(pl.inList){rows.splice(pl.idx,0,{v:val,p:['Tú','🙂','🇩🇴'],rank:pl.rank,me:true});rows.forEach((r,i)=>r.rank=i+1);rows.length=15}
   const prof=window.SudomiProfile&&SudomiProfile.get();if(prof){for(const r of rows)if(r.me){r.p=[prof.name,prof.avatar,'🇩🇴']}}
   const tabs=[['score','⭐ Puntos'],['level','🎓 Nivel'],['streak','🔥 Racha']];
   const medal=i=>i===1?'🥇':i===2?'🥈':i===3?'🥉':i;
   body.innerHTML=`<div class="rk-tabs">${tabs.map(([k,l])=>`<button type="button" data-k="${k}" class="${k===kind?'on':''}">${l}</button>`).join('')}</div>
   ${kind==='score'?`<div class="rk-diffs">${DIFFS.map(d=>`<button type="button" data-d="${d}" class="${d===diff?'on':''}">${DN[d]}</button>`).join('')}</div>`:''}
   <p class="rk-sub">${kind==='score'?`Mejor puntuación en una partida de ${DN[diff]}`:kind==='level'?'Nivel más alto alcanzado':'Mejor racha del Sudoku del día'}</p>
   <div class="rk-me ${pl.rank?'':'none'}"><div><small>TU POSICIÓN</small><b>${pl.rank?'#'+fmt(pl.rank):'—'}</b></div><div><small>${kind==='score'?'TU MEJOR':kind==='level'?'TU NIVEL':'TU MEJOR RACHA'}</small><b>${val?fmt(val)+' '+unit[kind]:'Sin datos'}</b></div></div>
   ${pl.rank?`<p class="rk-hint">${pl.inList?'¡Estás entre los 15 mejores!':`Estás en el puesto ${fmt(pl.rank)} de ${fmt(TOTAL)} jugadores.${kind==='score'?` Para entrar al top 15 necesitas más de ${fmt(list[list.length-1].v)} puntos.`:kind==='level'?` Para entrar al top 15 necesitas pasar del nivel ${list[list.length-1].v}.`:` Para entrar al top 15 necesitas más de ${list[list.length-1].v} días seguidos.`}`}</p>`:`<p class="rk-hint">${kind==='score'?'Termina un sudoku de esta dificultad para aparecer en la clasificación.':'Juega para aparecer en la clasificación.'}</p>`}
   <div class="rk-list">${rows.map(r=>`<div class="rk-row ${r.me?'me':''} ${r.rank<=3?'top':''}"><span class="rk-pos">${medal(r.rank)}</span><span class="rk-av">${r.p[1]}</span><b class="rk-name">${String(r.p[0]).replace(/[<>&]/g,'')} <i>${r.p[2]}</i></b><span class="rk-val">${fmt(r.v)}<small>${unit[kind]}</small></span></div>`).join('')}</div>`;
   body.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{kind=b.dataset.k;api.redraw()});
   body.querySelectorAll('[data-d]').forEach(b=>b.onclick=()=>{diff=b.dataset.d;api.redraw()});
  });
 }
 function boot(){
  const a=document.getElementById('homeRank'),b=document.getElementById('openRankings');
  if(a)a.onclick=open;if(b)b.onclick=()=>{const m=document.getElementById('homeDropdown');if(m)m.classList.add('hidden');open()};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
 window.SudomiRankings={open,board,place,SIMULATED:true};
})();
