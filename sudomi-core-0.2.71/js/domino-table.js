/* SUDOMI 0.2.56 — Dominó table extras (window.SudomiDomino). drawDomino() in js/extra-games.js builds the table; this file adds:
 *   · the green bottle on the table: tap it to take a sip (it tilts, bubbles, the level drops, a "¡Salud!" bubble pops up, a swallow sound plays;
 *     when it is empty the next tap opens a new one). The sips are counted per player on this device only — it is just for fun, never part of the game state.
 *   · the table sounds, taken from what the table shows (the wrapper carries data-dn = tiles on the table, data-dt = whose turn):
 *       one more tile on the table  → "clack" (tile on the wood) · the turn changed and no tile was played → "knock-knock" (paso)
 *   Sounds go through js/sound.js (same switches and volume); the effects switch (Configuración) also hides the sparkles. */
(()=>{
 const LEVEL_STEP=20,SIP_MS=1300;
 const DRUNK_SIPS=5,DRUNK_TURNS=2;      // 0.2.67: at every 5th sip the hand blurs for the next two turns of that player
 const st={level:100,at:0,sips:[0,0,0,0],drunk:[0,0,0,0]};       // drunk[p] = turns of p still to play blurred
 const CHEERS=['¡Salud! 🍻','¡Qué fría está! 🥶','¡Dale pa\'lante! 🍺','¡Eso! 🍻','¡A la tuya! 🥂'];
 const play=n=>{try{window.SudomiSound&&SudomiSound.play(n)}catch(_){}};
 /* ---- the bottle ---- */
 const BODY='M23 8h14v6h-1v34c0 8 14 14 14 28v52c0 6-4 10-10 10H20c-6 0-10-4-10-10V76c0-14 14-20 14-28V14h-1z';
 function bottle(viewer){
  const y=(128-68*st.level/100).toFixed(1),el=(Date.now()-st.at)/1000,sipping=el<SIP_MS/1000;
  return `<button type="button" class="dm-bottle${sipping?' sip':''}${st.level<=0?' empty':''}" style="${sipping?`animation-delay:-${el.toFixed(2)}s`:''}" aria-label="${st.level<=0?'Abrir otra botella':'Tomar un trago'}" title="${st.level<=0?'Abrir otra botella':'Tomar un trago'}">
  <svg viewBox="0 0 60 142" aria-hidden="true"><defs><clipPath id="dmBottleClip"><path d="${BODY}"/></clipPath><linearGradient id="dmGlass" x1="0" x2="1"><stop offset="0" stop-color="#1c7a3c"/><stop offset=".45" stop-color="#46c46f"/><stop offset="1" stop-color="#14592b"/></linearGradient></defs>
  <path d="${BODY}" fill="#0e3d1d" opacity=".55"/>
  <g clip-path="url(#dmBottleClip)"><rect class="dm-liq" x="0" y="${y}" width="60" height="${142-y}" fill="url(#dmGlass)"/><rect x="0" y="${Math.max(0,y-2)}" width="60" height="3" fill="#d9ffe4" opacity="${st.level>0?.55:0}"/></g>
  <path d="${BODY}" fill="none" stroke="#bfe8cb" stroke-width="1.6" opacity=".8"/>
  <path d="M15 80v44" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35"/><path d="M27 16v26" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".3"/>
  <rect x="22" y="3" width="16" height="7" rx="2" fill="#d4a017"/>
  <rect x="12" y="86" width="36" height="30" rx="3" fill="#fff6dc"/><text x="30" y="99" text-anchor="middle" font-size="7.5" font-weight="900" fill="#0b4fb3" font-family="system-ui,sans-serif">SUDOMI</text><text x="30" y="109" text-anchor="middle" font-size="4.6" font-weight="800" fill="#d6293e" font-family="system-ui,sans-serif">BIEN FRÍA</text></svg>
  <i class="b b1"></i><i class="b b2"></i><i class="b b3"></i></button>`;
 }
 const sips=p=>st.sips[p]||0;
 const drunk=p=>st.drunk[p]|0;
 const drunkText=n=>`🥴 Estás mareado: las fichas se ven borrosas ${n>1?'durante '+n+' turnos más':'durante este turno'}.`;
 function showDrunk(n){
  const h=document.querySelector('#miniGameStage .d-hand');if(!h)return;h.classList.toggle('drunk',n>0);
  let t=document.querySelector('#miniGameStage .dm-drunk-note');
  if(n>0){if(!t){t=document.createElement('p');t.className='dm-drunk-note';h.parentNode.insertBefore(t,h)}t.textContent=drunkText(n)}
  else if(t)t.remove();
 }
 function cheer(text){
  const seat=document.querySelector('#miniGameStage .dm-seat.bottom');if(!seat)return;
  seat.querySelectorAll('.dm-cheer').forEach(e=>e.remove());
  const c=document.createElement('div');c.className='dm-cheer';c.textContent=text;seat.appendChild(c);setTimeout(()=>c.remove(),1800);
 }
 function updateSeat(viewer){
  const who=document.querySelector('#miniGameStage .dm-seat.bottom .dm-who');if(!who)return;
  let e=who.querySelector('em');if(!e){e=document.createElement('em');who.appendChild(e)}e.textContent='🍺 '+sips(viewer);
 }
 document.addEventListener('click',ev=>{
  const b=ev.target.closest&&ev.target.closest('#miniGameStage .dm-bottle');if(!b)return;
  ev.preventDefault();ev.stopPropagation();
  const wrap=b.closest('.arc-domino'),viewer=wrap?+wrap.dataset.dv||0:0;
  if(Date.now()-st.at<SIP_MS-200&&st.level>0)return;                       // one sip at a time
  if(st.level<=0){
   st.level=100;st.at=Date.now();play('pop');cheer('¡Otra botella! 🍾');
   b.classList.remove('empty');b.setAttribute('aria-label','Tomar un trago');
   const liq=b.querySelector('.dm-liq');if(liq){liq.setAttribute('y',60);liq.setAttribute('height',82)}
   return;
  }
  st.level=Math.max(0,st.level-LEVEL_STEP);st.at=Date.now();st.sips[viewer]=sips(viewer)+1;
  play('glug');
  b.classList.remove('sip');void b.offsetWidth;b.classList.add('sip');b.style.animationDelay='';
  const liq=b.querySelector('.dm-liq'),y=128-68*st.level/100;if(liq){liq.setAttribute('y',y);liq.setAttribute('height',142-y)}
  setTimeout(()=>{if(b.isConnected&&st.level<=0){b.classList.add('empty');b.setAttribute('aria-label','Abrir otra botella')}},SIP_MS);
  cheer(st.level<=0?'¡Se acabó! 🍾 Toca para abrir otra':CHEERS[Math.floor(Math.random()*CHEERS.length)]);
  updateSeat(viewer);
  if(st.sips[viewer]%DRUNK_SIPS===0){st.drunk[viewer]=DRUNK_TURNS;showDrunk(DRUNK_TURNS);cheer('¡Qué mareo! 🥴 Las fichas se ven borrosas')}
  try{window.SudomiFX&&SudomiFX.sparks&&(()=>{const r=b.getBoundingClientRect();SudomiFX.sparks(r.left+r.width/2,r.top+8,8,['#bfe8cb','#ffffff','#46c46f'],200,.8)})()}catch(_){}
 },true);
 /* ---- tap a tile on the table: see it large ---- */
 const PIPS=[[],[4],[0,8],[0,4,8],[0,2,6,8],[0,2,4,6,8],[0,2,3,5,6,8]];
 function bigTile(p,q){
  const half=(v,ox)=>PIPS[v].map(k=>`<circle cx="${ox+8.3+16.7*(k%3)}" cy="${8.3+16.7*Math.floor(k/3)}" r="4.9"/>`).join('');
  return `<svg viewBox="0 0 100 50" role="img" aria-label="Ficha ${p}-${q}"><rect x=".8" y=".8" width="98.4" height="48.4" rx="7" fill="#fbf6e6" stroke="#b9ae92" stroke-width="1.6"/><line x1="50" y1="7" x2="50" y2="43" stroke="#7b7258" stroke-width="1.8" stroke-linecap="round"/><g fill="#10213b">${half(p,0)}${half(q,50)}</g></svg>`;
 }
 function closeZoom(){const z=document.getElementById('dmZoom');if(z)z.remove()}
 document.addEventListener('click',ev=>{
  if(ev.target.closest&&ev.target.closest('#dmZoom')){closeZoom();return}
  const t=ev.target.closest&&ev.target.closest('#miniGameStage .dmt');if(!t)return;
  ev.preventDefault();ev.stopPropagation();closeZoom();
  const p=+t.dataset.p,q=+t.dataset.q,z=document.createElement('div');z.id='dmZoom';z.className='dm-zoom';z.setAttribute('role','dialog');z.setAttribute('aria-label','Ficha '+p+'-'+q);
  z.innerHTML=`<div class="dm-zoom-card">${bigTile(p,q)}<p>Ficha <b>${p}</b> | <b>${q}</b></p><small>Toca para cerrar</small></div>`;
  document.body.appendChild(z);
 },true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeZoom()});
 /* ---- table sounds ---- */
 let last=null,queued=false;
 let lastSn=null,skipKnock=false;
 document.addEventListener('click',ev=>{const b=ev.target.closest&&ev.target.closest('#miniGameStage [data-a="pass"]');if(!b||b.disabled)return;play('knock');skipKnock=true;setTimeout(()=>{skipKnock=false},1800)},true);
 function scan(){
  queued=false;
  const sl=document.querySelector('#miniGameStage .arc-slide');       // Fichas deslizantes: one 'clack' per tile placed (data-sn = moves so far)
  if(sl){const n=+sl.dataset.sn;if(lastSn!==null&&n===lastSn+1)play('clack');lastSn=isNaN(n)?null:n}else lastSn=null;
  const w=document.querySelector('#miniGameStage .arc-domino');
  if(!w){last=null;return}
  const cur={n:+w.dataset.dn,t:+w.dataset.dt,over:w.dataset.dover==='1'};
  if(last&&!isNaN(cur.n)){
   if(cur.n===last.n+1){play('clack');
    try{const t=w.querySelector('.dm-board .dmt.pop');if(t&&window.SudomiFX&&SudomiFX.sparks){const r=t.getBoundingClientRect();SudomiFX.sparks(r.left+r.width/2,r.top+r.height/2,7,undefined,0,.6)}}catch(_){}
   }
   else if(cur.n===last.n&&cur.t!==last.t&&!cur.over){if(skipKnock)skipKnock=false;else play('knock')}
  }
  cur.s=+w.dataset.ds;
  if(last&&cur.s!==last.s){const p=last.t;
   if(st.drunk[p]>0){st.drunk[p]--;if(p===+w.dataset.dv)showDrunk(st.drunk[p])}
  }
  last=cur;
 }
 function boot(){
  const stage=document.getElementById('miniGameStage');if(!stage)return;
  new MutationObserver(()=>{if(!queued){queued=true;setTimeout(scan,30)}}).observe(stage,{childList:true,subtree:true,attributes:true,attributeFilter:['data-dn','data-dt','data-sn','data-ds']});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
 window.SudomiDomino={bottle,sips,drunk};
})();
