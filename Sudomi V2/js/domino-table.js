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
 // 0.2.83: al tomar un trago sale una de las frases de la etiqueta de la botella PANDA
 const CHEERS=['¡Nosotros somos bebedores! 🍻','¡Con el lápiz no! ✏️','¡Me encanta esta vaina! 🐼','Extra viejo… reserva familiar 🥃','Panda, desde 1888 🐼','¡Salud! 🍻'];
 const play=n=>{try{window.SudomiSound&&SudomiSound.play(n)}catch(_){}};
 /* ---- the bottle ---- */
 /* 0.2.83 — la botella es «PANDA Extra Viejo» (dibujo del dueño, pasado a limpio). Dos etiquetas: clásica (ámbar) y reserva negra;
  * se alternan cada vez que se abre otra botella (st.look). El ron baja de LIQ_TOP hasta donde empieza la etiqueta. */
 const BODY='M96 128 C93 215 46 300 40 400 L40 622 Q40 650 70 652 L170 652 Q200 650 200 622 L200 400 C194 300 147 215 144 128 Z';
 const LIQ_TOP=135,LIQ_SPAN=183,liqY=l=>LIQ_TOP+LIQ_SPAN*(1-l/100);
 const LOOKS=[
  {glass:['#6b2f08','#c4731c','#57250a'],empty:'#3a1a06',cap:['#8f1016','#d8343b'],line:'#2a1405',label:'#f7edd3',ink:'#3a1c08',brand:'#b3161b',accent:'#b3161b',onAccent:'#fff6dc',net:'#f0d27a',netO:.75,pl:'#fff',pd:'#1c1c1c'},
  {glass:['#2a1808','#7a4c18','#1f1206'],empty:'#0b0d10',cap:['#8a6a1c','#f0d27a'],line:'#0a0a0a',label:'#17130f',ink:'#e6c66f',brand:'#f0d27a',accent:'#c9a23a',onAccent:'#17130f',net:'#e6c66f',netO:.6,pl:'#fbf6e6',pd:'#17130f'}
 ];
 function panda(cx,cy,r,p,stache){
  return `<g transform="translate(${cx},${cy}) scale(${r/20})"><circle cx="-15" cy="-15" r="8" fill="${p.pd}"/><circle cx="15" cy="-15" r="8" fill="${p.pd}"/><circle r="20" fill="${p.pl}" stroke="${p.pd}" stroke-width="2"/><ellipse cx="-8" cy="-3" rx="5.5" ry="7" transform="rotate(20 -8 -3)" fill="${p.pd}"/><ellipse cx="8" cy="-3" rx="5.5" ry="7" transform="rotate(-20 8 -3)" fill="${p.pd}"/><circle cx="-7.5" cy="-3.5" r="2" fill="${p.pl}"/><circle cx="7.5" cy="-3.5" r="2" fill="${p.pl}"/><ellipse cx="0" cy="6" rx="3.6" ry="2.6" fill="${p.pd}"/>${stache?`<path d="M0 9C-4 13-10 13-13 9C-9 11-4 10 0 9C4 10 9 11 13 9C10 13 4 13 0 9Z" fill="${p.pd}"/>`:`<path d="M-5 11Q0 15 5 11" fill="none" stroke="${p.pd}" stroke-width="1.8" stroke-linecap="round"/>`}</g>`;
 }
 function art(){
  const p=LOOKS[(st.look|0)%LOOKS.length],y=liqY(st.level).toFixed(1);
  const ic=(x,inner)=>`<g transform="translate(${x},522)"><circle r="12.5" fill="${p.label}" stroke="${p.ink}" stroke-width="1.6"/>${inner}</g>`;
  return `<svg viewBox="0 0 240 664" aria-hidden="true"><defs><clipPath id="dmBottleClip"><path d="${BODY}"/></clipPath><linearGradient id="dmGlass" x1="0" x2="1"><stop offset="0" stop-color="${p.glass[0]}"/><stop offset=".45" stop-color="${p.glass[1]}"/><stop offset="1" stop-color="${p.glass[2]}"/></linearGradient><linearGradient id="dmCap" x1="0" x2="1"><stop offset="0" stop-color="${p.cap[0]}"/><stop offset=".5" stop-color="${p.cap[1]}"/><stop offset="1" stop-color="${p.cap[0]}"/></linearGradient><pattern id="dmNet" width="54" height="96" patternUnits="userSpaceOnUse" x="13" y="128"><path d="M0 0L27 48L0 96M54 0L27 48L54 96" fill="none" stroke="${p.net}" stroke-width="2.2"/></pattern></defs>
  <rect x="94" y="8" width="52" height="42" rx="6" fill="url(#dmCap)" stroke="${p.line}" stroke-width="3"/>
  <rect x="96" y="50" width="48" height="62" fill="${p.label}" stroke="${p.line}" stroke-width="3"/>${panda(120,76,13,p,true)}
  <rect x="96" y="96" width="48" height="16" fill="${p.accent}"/><text x="120" y="107.5" text-anchor="middle" font-family="Georgia,serif" font-size="5.8" font-weight="700" fill="${p.onAccent}">DESDE · 1888</text>
  <rect x="92" y="112" width="56" height="18" rx="4" fill="url(#dmCap)" stroke="${p.line}" stroke-width="3"/>
  <path d="${BODY}" fill="${p.empty}" opacity=".6"/>
  <g clip-path="url(#dmBottleClip)"><rect class="dm-liq" x="0" y="${y}" width="240" height="${(664-y).toFixed(1)}" fill="url(#dmGlass)"/>
   <rect x="40" y="436" width="160" height="196" fill="${p.label}"/><circle cx="120" cy="376" r="63" fill="${p.label}" stroke="${p.ink}" stroke-width="2"/><rect x="42" y="437" width="156" height="30" fill="${p.label}"/><circle cx="120" cy="376" r="57" fill="none" stroke="${p.accent}" stroke-width="1.6"/>
   <line x1="40" y1="632" x2="200" y2="632" stroke="${p.ink}" stroke-width="2"/><rect x="40" y="588" width="160" height="34" fill="${p.accent}"/></g>
  <path d="M104 150C101 225 60 300 54 400" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity=".28"/>
  ${panda(120,345,19,p,false)}
  <text x="120" y="412" text-anchor="middle" font-family="Impact,'Arial Black',sans-serif" font-size="35" letter-spacing="2" fill="${p.brand}" stroke="${p.ink}" stroke-width="1.2" paint-order="stroke">PANDA</text>
  <text x="120" y="458" text-anchor="middle" font-family="Georgia,serif" font-size="23" font-weight="700" letter-spacing="3" fill="${p.ink}">EXTRA</text><text x="120" y="483" text-anchor="middle" font-family="Georgia,serif" font-size="23" font-weight="700" letter-spacing="3" fill="${p.ink}">VIEJO</text>
  <text x="120" y="498" text-anchor="middle" font-family="Arial,sans-serif" font-size="7.5" font-weight="700" letter-spacing="2.2" fill="${p.brand}">RESERVA FAMILIAR</text>
  <line x1="48" y1="522" x2="192" y2="522" stroke="${p.ink}" stroke-width="1.4"/>
  ${ic(75,`<path d="M-2.2 -8h4.4v4l2 3v8h-8.4v-8l2-3z" fill="none" stroke="${p.ink}" stroke-width="1.5" stroke-linejoin="round"/>`)}${ic(105,`<g transform="scale(.42)">${panda(0,2,20,p,false)}</g>`)}${ic(135,`<g transform="rotate(40)"><rect x="-2" y="-8" width="4" height="12" fill="none" stroke="${p.ink}" stroke-width="1.4"/><path d="M-2 4L0 9L2 4" fill="${p.ink}" stroke="${p.ink}" stroke-width="1.2" stroke-linejoin="round"/></g>`)}${ic(165,`<circle cx="-3.6" cy="-2.5" r="1.4" fill="${p.ink}"/><circle cx="3.6" cy="-2.5" r="1.4" fill="${p.ink}"/><path d="M-5.5 2.5Q0 8 5.5 2.5" fill="none" stroke="${p.ink}" stroke-width="1.6" stroke-linecap="round"/>`)}
  <text x="120" y="556" text-anchor="middle" font-family="'Segoe Script','Brush Script MT',cursive" font-size="14.5" fill="${p.ink}">Nosotros somos</text><text x="120" y="578" text-anchor="middle" font-family="'Segoe Script','Brush Script MT',cursive" font-size="19" font-weight="700" fill="${p.brand}">¡Bebedores!</text>
  <text x="120" y="604" text-anchor="middle" font-family="Georgia,serif" font-size="12.5" font-weight="700" font-style="italic" fill="${p.onAccent}">¡Con el lápiz no!</text><text x="120" y="616" text-anchor="middle" font-family="Arial,sans-serif" font-size="6.6" letter-spacing="1" fill="${p.onAccent}">ME ENCANTA ESTA VAINA</text>
  <rect x="30" y="128" width="180" height="530" fill="url(#dmNet)" clip-path="url(#dmBottleClip)" opacity="${p.netO}"/>
  <path d="${BODY}" fill="none" stroke="${p.line}" stroke-width="4" stroke-linejoin="round"/></svg>`;
 }
 function bottle(viewer){
  const el=(Date.now()-st.at)/1000,sipping=el<SIP_MS/1000;
  return `<button type="button" class="dm-bottle${sipping?' sip':''}${st.level<=0?' empty':''}" style="${sipping?`animation-delay:-${el.toFixed(2)}s`:''}" aria-label="${st.level<=0?'Abrir otra botella':'Tomar un trago'}" title="${st.level<=0?'Abrir otra botella':'Tomar un trago'}">
  ${art()}
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
  const c=document.createElement('div');c.className='dm-cheer';c.textContent=text;seat.appendChild(c);setTimeout(()=>c.remove(),2600);
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
   st.level=100;st.at=Date.now();st.look=(st.look|0)+1;play('pop');cheer('¡Otra botella! 🍾');
   b.classList.remove('empty');b.setAttribute('aria-label','Tomar un trago');
   const sv=b.querySelector('svg');if(sv)sv.outerHTML=art();   // la otra etiqueta, llena
   return;
  }
  st.level=Math.max(0,st.level-LEVEL_STEP);st.at=Date.now();st.sips[viewer]=sips(viewer)+1;
  play('glug');
  b.classList.remove('sip');void b.offsetWidth;b.classList.add('sip');b.style.animationDelay='';
  const liq=b.querySelector('.dm-liq'),y=liqY(st.level);if(liq){liq.setAttribute('y',y);liq.setAttribute('height',664-y)}
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
