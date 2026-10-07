/* SUDOMI 0.3.30 (V2) — DOMINÓ «MESA 3D» (window.SudomiDomino3D). Idea del dueño: ver la partida sentado a la mesa.
 *
 * Es SOLO otra forma de pintar la misma partida: las reglas siguen en js/extra-games.js (applyDomino). drawDomino() llama a draw() de aquí
 * cuando el interruptor «Mesa 3D» del menú de Dominó está encendido (se guarda en localStorage 'sudomi-domino-3d').
 *
 *   · La mesa es un cuadrado inclinado con CSS (rotateX + perspective): no hay motor 3D ni librerías.
 *   · Los otros tres jugadores son muñecos de palitos sentados en sillas plásticas; la cabeza lleva el avatar de su perfil.
 *   · Vaso de cerveza: tocarlo manda la acción {a:'sip'}; a los 5 tragos el jugador queda borracho unos turnos (g.sips / g.drunk, en extra-games.js):
 *     su cabeza cambia por una cara dibujada, se tambalea, y a quien le pasa se le mueve la mesa y ve las fichas borrosas.
 *   · Globos de conversación: salen de g.say (los escribe el motor del dominó cuando pasa algo).
 *   · Tu mano: un brazo de línea que sigue el dedo o el mouse. Arrastra una ficha desde tu atril y suéltala sobre la mesa; tocarla también sirve.
 * Los botones llevan data-a (play / sip / pass), así que los conecta el mismo bind() de extra-games.js, igual que en la vista clásica. */
(()=>{
 const KEY='sudomi-domino-3d';
 const on=()=>{try{return localStorage.getItem(KEY)==='1'}catch(_){return false}};
 const set=v=>{try{localStorage.setItem(KEY,v?'1':'0')}catch(_){}};
 // lo que ya se pintó, para animar solo lo nuevo (la pantalla se vuelve a dibujar entera en cada jugada)
 /* 0.3.31 — ESCENAS: el fondo se puede cambiar con el botón de la esquina (se guarda en este teléfono, 'sudomi-d3-scene').
  *   [id, nombre, foto]  · sin foto = fondo dibujado (patio = el de siempre, hecho con CSS; colmado = el SVG de abajo)
  *   Las fotos están en img/escenas/, ya desenfocadas en el propio archivo (no se reconocen caras, marcas ni letreros). */
 const SKEY='sudomi-d3-scene';
 const SCENES=[['patio','Patio'],['colmado','Colmado'],['barra','La barra','colmado-barra.jpg'],['estantes','Los estantes','colmado-estantes.jpg'],['baile','Bachata','colmado-baile.jpg'],['pista','La pista','pista.jpg']];
 const scene=()=>{let v='';try{v=localStorage.getItem(SKEY)||''}catch(_){}return SCENES.find(s=>s[0]===v)||SCENES[0]};
 const COLMADO=(()=>{
  const cols=['#7a3b12','#1f6b3a','#b3161b','#e2a400','#1761b2','#f4f1e8','#4a148c','#0b3d91'];let o='<rect width="300" height="400" fill="#ffe9a8"/><rect width="300" height="40" fill="#fff3c9"/>';
  for(let r=0;r<4;r++){
   const y=68+r*30;
   for(let i=0;i<26;i++){const x=10+i*10.8,c=cols[(i*7+r*3)%cols.length],hh=13+((i*5+r)%4)*2;
    o+=r%2?`<rect x="${x.toFixed(1)}" y="${y-hh}" width="8" height="${hh}" rx="1.500" fill="${c}"/>`:`<path d="M${(x+2.5).toFixed(1)} ${y-hh-5}h3v5l2.500 3v${hh-3}h-8v${3-hh}l2.500-3z" fill="${c}"/><rect x="${x.toFixed(1)}" y="${y-hh+4}" width="8" height="5" fill="#fff" opacity=".8"/>`}
   o+=`<rect x="6" y="${y}" width="288" height="5" fill="#8a5a2b"/><rect x="6" y="${y+5}" width="288" height="2" fill="#5d3a18"/>`;
  }
  o+='<rect x="66" y="6" width="168" height="27" rx="6" fill="#d62027" stroke="#fff" stroke-width="2.500"/><text x="150" y="25" text-anchor="middle" font-family="system-ui,Arial,sans-serif" font-size="14" font-weight="900" letter-spacing="1.500" fill="#fff">COLMADO SUDOMI</text>';
  o+='<rect y="178" width="300" height="12" fill="#efe0bd"/><rect y="190" width="300" height="4" fill="#bfa878"/><rect y="194" width="300" height="46" fill="#a3262c"/>';
  for(let i=0;i<=30;i++)o+=`<path d="M${i*10} 194v46" stroke="#7d1118" stroke-width="1.200"/>`;
  o+='<rect y="240" width="300" height="160" fill="#e3e7ec"/>';
  for(let i=-9;i<=9;i++)o+=`<path d="M${150+i*17} 240L${150+i*62} 400" stroke="#c3cad3" stroke-width="1.500"/>`;
  [252,270,296,332,380].forEach(y=>{o+=`<path d="M0 ${y}H300" stroke="#c3cad3" stroke-width="1.500"/>`});
  return `<svg viewBox="0 0 300 400" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${o}</svg>`;
 })();
 const bgHTML=s=>s[2]?`<div class="d3-bg photo" style="background-image:url(img/escenas/${s[2]})"></div>`:s[0]==='colmado'?`<div class="d3-bg">${COLMADO}</div>`:'';
 const sceneBtn=s=>`<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="2.200"/><circle cx="9" cy="10" r="1.800" fill="currentColor"/><path d="M5 17l5-5 3.500 3.500 2.500-2.500 3 3" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linejoin="round" stroke-linecap="round"/></svg><span>${s[1]}</span>`;
 document.addEventListener('click',ev=>{
  const b=ev.target.closest&&ev.target.closest('.d3-scenebtn');if(!b)return;
  ev.preventDefault();ev.stopPropagation();
  const s=SCENES[(SCENES.indexOf(scene())+1)%SCENES.length],sc=b.closest('.d3');
  try{localStorage.setItem(SKEY,s[0])}catch(_){}
  if(!sc)return;
  SCENES.forEach(x=>sc.classList.remove('sc-'+x[0]));sc.classList.add('sc-'+s[0]);
  sc.querySelectorAll('.d3-bg').forEach(e=>e.remove());sc.insertAdjacentHTML('afterbegin',bgHTML(s));
  b.innerHTML=sceneBtn(s);
 },true);
 const seen={ts:-1,sayN:0,sipN:0,bubbles:[]};
 const BUB_MS=3400;

 /* ---- caras de borracho: dibujos propios, de trazo negro, dentro de la cabeza (centro 60,34, radio 24) ---- */
 const FACES=[
  // bizco con la lengua afuera
  '<circle cx="50" cy="29" r="7" fill="#fff" stroke="#111" stroke-width="2"/><circle cx="71" cy="27" r="9" fill="#fff" stroke="#111" stroke-width="2"/><circle cx="53" cy="31" r="2.600" fill="#111"/><circle cx="67" cy="24" r="2.600" fill="#111"/><path d="M46 44q14 8 28-2" fill="none" stroke="#111" stroke-width="2.500" stroke-linecap="round"/><path d="M58 47q1 9 7 7t3-9z" fill="#ff5d6c" stroke="#111" stroke-width="2" stroke-linejoin="round"/>',
  // mareado: ojos en espiral y boca ondulada
  '<path d="M51 29m-6 0a6 6 0 1 0 12 0a4.500 4.500 0 1 0-9 0a3 3 0 1 0 6 0" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round"/><path d="M70 29m-6 0a6 6 0 1 0 12 0a4.500 4.500 0 1 0-9 0a3 3 0 1 0 6 0" fill="none" stroke="#111" stroke-width="2" stroke-linecap="round"/><path d="M46 45q4-5 8 0t8 0t8 0t5-1" fill="none" stroke="#111" stroke-width="2.500" stroke-linecap="round"/><ellipse cx="44" cy="38" rx="4" ry="2.500" fill="#ff9aa2" opacity=".8"/><ellipse cx="77" cy="38" rx="4" ry="2.500" fill="#ff9aa2" opacity=".8"/>',
  // risa con lágrimas
  '<path d="M44 30q6-7 12 0M64 30q6-7 12 0" fill="none" stroke="#111" stroke-width="2.600" stroke-linecap="round"/><path d="M45 39h30q0 12-15 12t-15-12z" fill="#fff" stroke="#111" stroke-width="2.500" stroke-linejoin="round"/><path d="M45 44h30M53 39v11M60 39v12M67 39v11" stroke="#111" stroke-width="1.400"/><path d="M42 33q-3 6 0 8q3-2 0-8zM78 33q3 6 0 8q-3-2 0-8z" fill="#59c2ff" stroke="#111" stroke-width="1.200"/>'
 ];
 /* ---- un vaso de cerveza; lv = cuánto queda (0..1) ---- */
 function mug(lv,id){
  const y=(8+34*(1-lv)).toFixed(1);
  return `<svg viewBox="0 0 44 50" aria-hidden="true"><defs><clipPath id="d3m${id}"><path d="M8 7h22l-2.500 37h-17z"/></clipPath></defs><path d="M30 15q10-1 9 9t-10 9" fill="none" stroke="#f3f6fa" stroke-width="3.500" stroke-linecap="round"/><path d="M8 7h22l-2.500 37h-17z" fill="#ffffff3d"/><g clip-path="url(#d3m${id})"><rect x="0" y="${y}" width="44" height="50" fill="#f5b301"/><rect x="0" y="${y}" width="44" height="5" fill="#ffd95a"/></g>${lv>0?`<path d="M6 ${(+y+2).toFixed(1)}q3-6 7-2q3-6 7-1q4-5 7 0q3-2 4 3z" fill="#fff" stroke="#e9e3d2" stroke-width="1"/>`:''}<path d="M8 7h22l-2.500 37h-17z" fill="none" stroke="#f3f6fa" stroke-width="2.500" stroke-linejoin="round"/><path d="M12 12l2 28" stroke="#fff" stroke-width="1.800" stroke-linecap="round" opacity=".55"/></svg>`;
 }
 /* ---- un jugador sentado: silla plástica blanca + cuerpo de palitos + cabeza con su avatar ---- */
 function figure(p,pos,o,H){
  const slats=[44,52,60,68,76].map(x=>`<path d="M${x} 58V102" stroke="#d3cebe" stroke-width="3" stroke-linecap="round"/>`).join('');
  const head=o.face?FACES[p%FACES.length]:`<text x="60" y="45" text-anchor="middle" font-size="29">${H.esc(o.avatar)}</text>`;
  return `<div class="d3-fig ${pos}${o.turn?' turn':''}${o.drunk?' drunk':''}${o.reach?' reach':''}${o.sip?' sip':''}${o.won?' won':''}" data-seat="${p}">
   <svg viewBox="0 0 120 150" aria-hidden="true">
    <g class="d3-chair"><path d="M30 122V60q0-16 16-16h28q16 0 16 16v62" fill="#f6f3ea" stroke="#b9b4a3" stroke-width="2.500"/>${slats}<rect x="22" y="108" width="76" height="13" rx="6" fill="#fdfbf5" stroke="#b9b4a3" stroke-width="2.500"/><path d="M28 121v26M92 121v26" stroke="#d9d4c5" stroke-width="6" stroke-linecap="round"/></g>
    <g class="d3-body"><path d="M60 58V108" stroke="#111" stroke-width="5" stroke-linecap="round"/>
     <g class="d3-arm l"><path d="M60 72L39 92L46 118" fill="none" stroke="#111" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="46" cy="118" r="5" fill="#111"/></g>
     <g class="d3-arm r"><path d="M60 72L81 92L74 118" fill="none" stroke="#111" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="74" cy="118" r="5" fill="#111"/></g>
     <g class="d3-head"><circle cx="60" cy="34" r="24" fill="#fff" stroke="#111" stroke-width="4"/>${head}</g></g>
   </svg>
   <span class="d3-tag"><b>${H.esc(o.name)}</b><i>${o.count}</i></span><small class="d3-role">${o.label}</small>
   <span class="d3-mug">${mug(o.lv,'s'+p)}</span>
  </div>`;
 }

 function draw(g,I,H){
  const me=I.viewer,seatOf=k=>(me+k)%4,playing=g.phase==='play'&&!g.over,reveal=g.phase==='handend'||g.over;
  const h=g.hands[me]||[],e=H.dEnds(g),myTeam=H.dTeam(me),now=Date.now();
  const sips=g.sips||[0,0,0,0],dr=g.drunk||[0,0,0,0];
  // ----- qué es nuevo desde el dibujo anterior -----
  if((g.ts|0)<seen.ts||(g.sayN|0)<seen.sayN){seen.ts=-1;seen.sayN=0;seen.sipN=0;seen.bubbles=[]}      // partida nueva
  const fresh=(g.ts|0)!==seen.ts,played=fresh&&g.fx&&(g.fx[0]==='L'||g.fx[0]==='R')?g.lastPlayer:-1;
  const sipBy=(g.sipN|0)!==seen.sipN?g.sipBy:-1;
  (g.say||[]).forEach(s=>{if(s.n>seen.sayN)seen.bubbles.push({p:s.p,text:s.text==='Perdimos a Tú'?'¡Te perdimos!':s.text,at:now})});
  seen.bubbles=seen.bubbles.filter(b=>now-b.at<BUB_MS).slice(-4);
  seen.ts=g.ts|0;seen.sayN=g.sayN|0;seen.sipN=g.sipN|0;
  const posOf=p=>p===me?'bottom':p===seatOf(2)?'top':p===seatOf(1)?'left':'right';
  // ----- la mesa -----
  const {items,rows}=H.dLayout(g),last=g.row.length-1;
  const rect=t=>`left:${(t.x/H.DU*100).toFixed(2)}%;top:${(t.y/rows*100).toFixed(2)}%;width:${(t.w/H.DU*100).toFixed(2)}%;height:${(t.h/rows*100).toFixed(2)}%`;
  const tiles=items.map(t=>{
   const vert=t.h>t.w,[p,q]=vert?(t.d[1]>0?[t.inn,t.out]:[t.out,t.inn]):(t.d[0]>0?[t.inn,t.out]:[t.out,t.inn]);
   const pop=fresh&&((g.fx[0]==='L'&&t.k===0)||(g.fx[0]==='R'&&t.k===last));
   return `<span class="d3-t${pop?' pop':''}${t.k===0?' endL':''}${t.k===last?' endR':''}" style="${rect(t)}">${H.dSvg(p,q,vert)}</span>`;
  }).join('');
  // la ficha elegida encaja en las dos puntas: dos huecos brillantes para escoger
  const choose=I.mine&&playing&&e&&g.sel>=0&&h[g.sel];
  const targets=choose?items.filter(t=>t.k===0||t.k===last).map(t=>`<button type="button" class="d3-target" data-a="play" data-i="${g.sel}" data-side="${t.k===0?'L':'R'}" style="${rect(t)}" aria-label="Poner la ficha en esta punta"></button>`).join(''):'';
  const rack=(p,cls)=>`<div class="d3-rack ${cls}">${(g.hands[p]||[]).map(()=>'<i></i>').join('')}</div>`;
  const table=`<div class="d3-stage"><div class="d3-table"><i class="d3-cup c1"></i><i class="d3-cup c2"></i><i class="d3-cup c3"></i><i class="d3-cup c4"></i>
    ${rack(seatOf(2),'t')}${rack(seatOf(1),'l')}${rack(seatOf(3),'r')}<div class="d3-rack b"></div>
    <div class="d3-board"><div class="d3-chain" style="aspect-ratio:${H.DU}/${rows}">${tiles}${targets}</div>${g.row.length?'':`<p class="d3-empty">${I.mine&&playing?'Pon la ficha que brilla para empezar':'Esperando la primera ficha…'}</p>`}</div>
   </div></div>`;
  // ----- los jugadores -----
  const fig=(p,pos,label)=>{const s=(g.seats&&g.seats[p])||{name:`Jugador ${p+1}`};
   return figure(p,pos,{name:s.name,avatar:s.avatar||(s.bot?'🤖':'🙂'),count:(g.hands[p]||[]).length,label,turn:g.turn===p&&playing,drunk:dr[p]>0,face:dr[p]>0||dr[me]>0,reach:played===p,sip:sipBy===p,won:g.over&&H.dTeam(p)===g.winTeam,lv:(H.D3_SIPS-sips[p])/H.D3_SIPS},H)};   // face: cara de borracho — la del que está borracho, y TODAS cuando el borracho eres tú (así lo ves tú)
  const bubbles=seen.bubbles.map(b=>`<div class="d3-bub ${posOf(b.p)}" style="animation-delay:-${((now-b.at)/1000).toFixed(2)}s">${H.esc(b.text)}</div>`).join('');
  // ----- tu atril, tu vaso y tu mano -----
  // 0.3.32: las fichas de tu mano van ordenadas (por el número más alto y luego el otro) con la propiedad CSS «order»; data-i sigue siendo su lugar real en la mano
  const rank=h.map((t,i)=>[Math.max(t[0],t[1])*10+Math.min(t[0],t[1]),i]).sort((a,b)=>b[0]-a[0]).map(x=>x[1]);
  const mine=rank.map(i=>{const t=h[i],ok=I.mine&&playing&&H.dFits(g,t);                 // 0.3.34: se escriben ya en su orden, cada una en su casilla
   return `<button type="button" class="d3-my ${ok?'ok':'no'}${g.sel===i?' picked':''}" data-a="play" data-i="${i}" data-v0="${t[0]}" data-v1="${t[1]}" ${ok?'':'disabled'} aria-label="Ficha ${t[0]}-${t[1]}">${H.dSvg(Math.max(t[0],t[1]),Math.min(t[0],t[1]),true)}</button>`}).join('');
  const myDrunk=dr[me]>0,myLv=(H.D3_SIPS-sips[me])/H.D3_SIPS;
  const beer=`<button type="button" class="d3-beer${sipBy===me?' sip':''}" data-a="sip" data-s="${me}" aria-label="Tomar un trago">${mug(myLv,'me')}<small>${H.D3_SIPS-sips[me]}/${H.D3_SIPS}</small></button>`;
  const turnText=g.over?'Fin de la partida':reveal?'Mano terminada':I.mine?'Tu turno':`Juega ${H.esc(((g.seats&&g.seats[g.turn])||{}).name||'')}`;
  const sc=scene();
  const sceneHTML=`<div class="d3 sc-${sc[0]}${myDrunk?' drunk':''}${I.mine&&playing?' myturn':''}" data-el="${e?e[0]:''}" data-er="${e?e[1]:''}">${bgHTML(sc)}
   <button type="button" class="d3-scenebtn" aria-label="Cambiar la escena">${sceneBtn(sc)}</button>
   <div class="d3-hud"><span class="mine">Tu equipo <b>${g.score[myTeam]}</b></span><i>meta ${H.DOM_TARGET}</i><span>Rivales <b>${g.score[1-myTeam]}</b></span></div>
   ${fig(seatOf(2),'top','Compañero')}${fig(seatOf(1),'left','Rival')}${fig(seatOf(3),'right','Rival')}
   ${table}${bubbles}
   <div class="d3-turn${I.mine&&playing?' mine':''}">${turnText}</div>
   ${beer}
   <svg class="d3-myarm" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M82 112L72 95L52 78" /></svg><div class="d3-hand" style="left:52%;top:78%"></div>
   <div class="d3-myrack${myDrunk?' blur':''}">${mine||'<span class="arc-hint">Sin fichas</span>'}</div>
   <button type="button" hidden class="d3-drop" data-a="play" data-i="" data-side=""></button>
  </div>`;
  const pass=I.mine&&playing&&g.row.length&&!H.dPlayable(g,me)?'<div class="arc-actions"><button class="arc-btn pulse" data-a="pass">✋ Pasar · no tengo ficha</button></div>':'';
  return `${sceneHTML}${myDrunk?`<p class="dm-drunk-note">Estás borracho: la mesa se mueve y las fichas se ven borrosas ${dr[me]>1?'durante '+dr[me]+' turnos tuyos':'durante este turno'}.</p>`:''}${H.msg(g)}${H.sum}${reveal?'':pass}`;
 }

 /* =============== tu mano: sigue el dedo / el mouse y arrastra fichas =============== */
 let drag=null,justDropped=0;
 const sceneOf=el=>el&&el.closest?el.closest('.d3'):null;
 function moveHand(sc,cx,cy){
  const r=sc.getBoundingClientRect();if(!r.width)return;
  const x=Math.max(2,Math.min(98,(cx-r.left)/r.width*100)),y=Math.max(4,Math.min(98,(cy-r.top)/r.height*100));
  const hand=sc.querySelector('.d3-hand'),path=sc.querySelector('.d3-myarm path');if(!hand||!path)return;
  hand.style.left=x+'%';hand.style.top=y+'%';
  path.setAttribute('d',`M82 112L${((82+x)/2+9).toFixed(1)} ${((112+y)/2+5).toFixed(1)}L${x.toFixed(1)} ${y.toFixed(1)}`);
 }
 document.addEventListener('pointerdown',ev=>{
  const b=ev.target.closest&&ev.target.closest('.d3-my.ok');if(!b||b.disabled)return;
  drag={b,sc:sceneOf(b),x:ev.clientX,y:ev.clientY,on:false,id:ev.pointerId};
 },true);
 document.addEventListener('pointermove',ev=>{
  const sc=drag?drag.sc:sceneOf(ev.target);if(!sc)return;
  moveHand(sc,ev.clientX,ev.clientY);
  if(!drag||ev.pointerId!==drag.id)return;
  if(!drag.on&&Math.hypot(ev.clientX-drag.x,ev.clientY-drag.y)>9){
   drag.on=true;drag.b.classList.add('lifted');sc.classList.add('dragging');
   const hand=sc.querySelector('.d3-hand');if(hand)hand.innerHTML=`<span class="d3-held">${drag.b.innerHTML}</span>`;
  }
  if(drag.on)ev.preventDefault();
 },{capture:true,passive:false});
 function endDrag(ev,cancel){
  const d=drag;drag=null;if(!d)return;
  if(!d.on||!d.sc.isConnected)return;
  const sc=d.sc,hand=sc.querySelector('.d3-hand'),rack=sc.querySelector('.d3-myrack'),drop=sc.querySelector('.d3-drop');
  sc.classList.remove('dragging');d.b.classList.remove('lifted');if(hand)hand.innerHTML='';
  justDropped=Date.now();
  if(cancel||!rack||!drop||ev.clientY>rack.getBoundingClientRect().top-6)return;          // la soltó sobre su atril: no juega
  // ¿en qué punta? si encaja en las dos, la más cercana a donde la soltó
  const el=sc.dataset.el,er=sc.dataset.er,v0=d.b.dataset.v0,v1=d.b.dataset.v1;let side='';
  if(el!==''&&el!==er){
   const fl=v0===el||v1===el,fr=v0===er||v1===er;
   if(fl&&fr){
    const dist=q=>{const t=sc.querySelector(q);if(!t)return 1e9;const r=t.getBoundingClientRect();return Math.hypot(ev.clientX-(r.left+r.width/2),ev.clientY-(r.top+r.height/2))};
    side=dist('.d3-t.endL')<=dist('.d3-t.endR')?'L':'R';
   }
  }
  drop.dataset.i=d.b.dataset.i;drop.dataset.side=side;drop.click();
 }
 document.addEventListener('pointerup',ev=>endDrag(ev,false),true);
 document.addEventListener('pointercancel',ev=>endDrag(ev,true),true);
 // al soltar una ficha arrastrada el navegador también manda un «click» a la ficha: ese no cuenta
 document.addEventListener('click',ev=>{if(Date.now()-justDropped<350&&ev.target.closest&&ev.target.closest('.d3-my')){ev.stopPropagation();ev.preventDefault()}},true);

 window.SudomiDomino3D={on,set,draw};
})();
