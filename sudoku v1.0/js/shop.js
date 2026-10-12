/* SUDOMI 0.3.38 (V2) — MONEDAS y TIENDA DE SKINS (idea del dueño). Tres cosas en este archivo:
 *
 *   window.SudomiCoins  = {get, add(n, motivo), spend(n)}        monedas del jugador, guardadas en este teléfono ('sudomi-coins')
 *   window.SudomiShopSkins  = {list, owns, active, buy, equip}       skins compradas y cuál está puesta en cada juego ('sudomi-shop-skins')
 *   window.SudomiShop   = {open}                                 la pantalla «Tienda de skins» (pestaña «Tienda» de la barra de abajo, js/tabbar.js)
 *
 * CÓMO SE GANAN MONEDAS: cumpliendo los retos diarios. Los dos sitios que ya marcaban el reto como cumplido llaman a SudomiCoins.add():
 *   · Sudoku del día  → js/daily.js      (DAILY_COINS, una vez por cada día del calendario)
 *   · Reto del arcade → js/other-games.js (DAILY_COINS, una vez al día)
 *
 * CÓMO SE PONE UNA SKIN: no se toca el juego. Al equiparla, <body> recibe la clase «skin-<juego>-<id>» y este archivo escribe una hoja de estilos
 * (<style id="sudomiSkinCss">) que repinta las piezas. Para una skin nueva: una entrada en SKINS y su CSS en css(). */
(()=>{
 const CKEY='sudomi-coins',SKEY='sudomi-shop-skins',DAILY_COINS=50;
 const num=v=>Number.isFinite(+v)&&+v>0?Math.floor(+v):0;
 const Coins={
  get(){try{return num(localStorage.getItem(CKEY))}catch(_){return 0}},
  set(n){try{localStorage.setItem(CKEY,String(num(n)))}catch(_){}try{window.dispatchEvent(new CustomEvent('sudomi-coins',{detail:{coins:num(n)}}))}catch(_){}},
  add(n,why){n=num(n);if(!n)return this.get();this.set(this.get()+n);toast(`+${n} monedas`,why||'');return this.get()},
  spend(n){n=num(n);if(this.get()<n)return false;this.set(this.get()-n);return true},
  DAILY:DAILY_COINS
 };
 function toast(title,sub){
  const t=document.createElement('div');t.className='coin-toast';t.innerHTML=`${coinSvg()}<div><b></b><small></small></div>`;
  t.querySelector('b').textContent=title;t.querySelector('small').textContent=sub;
  document.body.appendChild(t);setTimeout(()=>t.remove(),3200);
 }
 const coinSvg=()=>'<svg class="coin" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#f4b400" stroke="#8a5a00" stroke-width="1.800"/><circle cx="12" cy="12" r="6.500" fill="#ffd95a" stroke="#b07a00" stroke-width="1.200"/><path d="M12 7.500l1.300 2.700 3 .4-2.200 2.100.6 3-2.700-1.500-2.700 1.500.6-3-2.200-2.100 3-.4z" fill="#b07a00"/></svg>';

 /* ---------- skins ---------- */
 // una tapa de botella de vidrio (corona con 21 dientes), vista desde arriba, como imagen para usar de fondo
 function cap(main,dark,art){
  let d='';const N=21;
  for(let i=0;i<N*2;i++){const a=i*Math.PI/N-Math.PI/2,r=i%2?44.5:49.5;d+=(i?'L':'M')+(50+r*Math.cos(a)).toFixed(1)+' '+(50+r*Math.sin(a)).toFixed(1)}
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#b9bec8"/><stop offset="1" stop-color="#7c828e"/></linearGradient></defs><path d="${d}Z" fill="url(#m)" stroke="#5b616c" stroke-width="1.500" stroke-linejoin="round"/><circle cx="50" cy="50" r="39" fill="${main}" stroke="${dark}" stroke-width="2.500"/>${art}<path d="M22 38a30 30 0 0 1 34-18" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".45"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
 }
 const CAP_RED=cap('#d8232a','#8f1016','<path d="M17 56c12-14 22-14 33-4s21 8 33-6" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/><path d="M24 68c10-7 17-6 26 0s17 6 26-2" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>');
 // la tapa azul es un dibujo propio (estrella y aros): a propósito NO imita el logo de ninguna marca
 const CAP_BLUE=cap('#1553b6','#0a2f73','<circle cx="50" cy="50" r="30" fill="none" stroke="#fff" stroke-width="3"/><path d="M50 27l6.200 13.300 14.600 1.800-10.700 10 2.800 14.400L50 59.400 37.100 66.500l2.800-14.400-10.700-10 14.600-1.800z" fill="#fff"/>');
 // 0.3.38 — primera skin (pedido del dueño): en Damas, las fichas son tapas de refresco de botella de vidrio (rojas contra azules)
 // 0.3.44 — caritas para 4 en línea: la amarilla sonríe, la roja está brava
 const uri=svg=>`url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
 const face=(c1,c2,dark,parts)=>uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><radialGradient id="f" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient></defs><circle cx="50" cy="50" r="47" fill="url(#f)" stroke="${dark}" stroke-width="4"/>${parts}</svg>`);
 const FACE_HAPPY=face('#fff3a6','#f2b705','#8a5a00','<ellipse cx="34" cy="40" rx="6" ry="9" fill="#3a2a00"/><ellipse cx="66" cy="40" rx="6" ry="9" fill="#3a2a00"/><circle cx="36" cy="37" r="2.200" fill="#fff"/><circle cx="68" cy="37" r="2.200" fill="#fff"/><path d="M26 58q24 26 48 0" fill="#7a2a12" stroke="#3a2a00" stroke-width="4" stroke-linejoin="round"/><path d="M34 62q16 9 32 0" fill="#fff"/><ellipse cx="20" cy="56" rx="7" ry="4.500" fill="#ff8a65" opacity=".6"/><ellipse cx="80" cy="56" rx="7" ry="4.500" fill="#ff8a65" opacity=".6"/>');
 const FACE_ANGRY=face('#ff9aa2','#d8232a','#7d1118','<path d="M20 30l22 10M80 30l-22 10" stroke="#3b0508" stroke-width="7" stroke-linecap="round"/><ellipse cx="34" cy="48" rx="6" ry="7" fill="#fff"/><ellipse cx="66" cy="48" rx="6" ry="7" fill="#fff"/><circle cx="35" cy="49" r="3.200" fill="#3b0508"/><circle cx="65" cy="49" r="3.200" fill="#3b0508"/><path d="M30 76q20-18 40 0" fill="none" stroke="#3b0508" stroke-width="6" stroke-linecap="round"/><path d="M36 71l5 6M46 67l3 7M57 67l-3 7M66 71l-5 6" stroke="#fff" stroke-width="2.500" stroke-linecap="round"/>');
 // 0.3.44 — dados negros con puntos rojos para Parchimi (la imagen es solo para la vitrina de la tienda; en el juego se pintan con CSS)
 const die=pips=>uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="d" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a4a52"/><stop offset="1" stop-color="#0b0b0d"/></linearGradient></defs><rect x="5" y="5" width="90" height="90" rx="19" fill="url(#d)" stroke="#000" stroke-width="4"/>${pips.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="9" fill="#ff2b3a"/>`).join('')}</svg>`);
 const DIE_5=die([[28,28],[72,28],[50,50],[28,72],[72,72]]),DIE_6=die([[28,26],[72,26],[28,50],[72,50],[28,74],[72,74]]);
 // miniaturas para la vitrina de los objetos de la Mesa 3D
 const THUMB_COLMADO=uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="14" fill="#ffe9a8"/><rect x="12" y="8" width="76" height="16" rx="4" fill="#d62027"/><g fill="#7a3b12"><rect x="10" y="36" width="80" height="4"/><rect x="10" y="56" width="80" height="4"/></g><g><rect x="16" y="26" width="7" height="10" fill="#1f6b3a"/><rect x="30" y="24" width="7" height="12" fill="#b3161b"/><rect x="44" y="27" width="7" height="9" fill="#1761b2"/><rect x="58" y="24" width="7" height="12" fill="#e2a400"/><rect x="72" y="26" width="7" height="10" fill="#4a148c"/><rect x="22" y="45" width="7" height="11" fill="#e2a400"/><rect x="38" y="46" width="7" height="10" fill="#1f6b3a"/><rect x="54" y="44" width="7" height="12" fill="#b3161b"/><rect x="70" y="46" width="7" height="10" fill="#1761b2"/></g><rect y="66" width="100" height="16" fill="#a3262c"/><rect y="82" width="100" height="18" fill="#e3e7ec"/></svg>');
 const THUMB_PLAYA=uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="14" fill="#7fd0ff"/><circle cx="74" cy="24" r="11" fill="#ffe27a"/><rect y="44" width="100" height="18" fill="#0d8fc9"/><path d="M0 62q12-6 25 0t25 0t25 0t25 0v38H0z" fill="#f3dfa9"/><path d="M22 78q5-28 1-46" fill="none" stroke="#7a4a22" stroke-width="5" stroke-linecap="round"/><g fill="#1c8a4a"><path d="M23 32q-16-3-22 8q12-3 22-8z"/><path d="M23 32q6-15 22-12q-13 3-22 12z"/><path d="M23 32q16-2 22 10q-11-5-22-10z"/></g></svg>');
 const THUMB_TILE=uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g transform="rotate(-12 50 50)"><rect x="29" y="8" width="42" height="84" rx="8" fill="#1f9d55" stroke="#0e5a2e" stroke-width="4"/><path d="M36 50h28" stroke="#d7ffe6" stroke-width="3" stroke-linecap="round"/><g fill="#fff"><circle cx="40" cy="20" r="4.500"/><circle cx="60" cy="20" r="4.500"/><circle cx="50" cy="30" r="4.500"/><circle cx="40" cy="40" r="4.500"/><circle cx="60" cy="40" r="4.500"/><circle cx="40" cy="62" r="4.500"/><circle cx="60" cy="80" r="4.500"/><circle cx="50" cy="71" r="4.500"/></g></g></svg>');
 const THUMB_CHAIR=uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M26 74V26q0-14 14-14h20q14 0 14 14v48" fill="#2fb86a" stroke="#167a40" stroke-width="4"/><g stroke="#167a40" stroke-width="4" stroke-linecap="round"><path d="M38 24v36M50 24v36M62 24v36"/></g><rect x="18" y="62" width="64" height="12" rx="6" fill="#3fd27c" stroke="#167a40" stroke-width="4"/><path d="M24 74v20M76 74v20" stroke="#167a40" stroke-width="7" stroke-linecap="round"/></svg>');
 const KILL_BAT=uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g transform="rotate(-38 50 50)"><path d="M6 46h30l44-8q14 0 14 12t-14 12l-44-8H6z" fill="#c98a45" stroke="#6b3d12" stroke-width="4" stroke-linejoin="round"/><rect x="2" y="42" width="8" height="16" rx="3" fill="#6b3d12"/><path d="M18 46v8M24 46v8" stroke="#6b3d12" stroke-width="3"/></g></svg>');
 const KILL_BOMB=uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M60 34q4-16 20-16" fill="none" stroke="#8a6a3a" stroke-width="5" stroke-linecap="round"/><path d="M82 8l3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1z" fill="#ffd54a" stroke="#ff7a1a" stroke-width="2"/><rect x="50" y="26" width="18" height="12" rx="3" fill="#333"/><circle cx="48" cy="62" r="32" fill="#1b1b22" stroke="#000" stroke-width="4"/><ellipse cx="36" cy="50" rx="9" ry="6" fill="#fff" opacity=".35" transform="rotate(-30 36 50)"/></svg>');
 const KILL_HEART=uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 92C12 62 3 42 3 29A22.500 22.500 0 0 1 50 21A22.500 22.500 0 0 1 97 29C97 42 88 62 50 92Z" fill="#ff3b6b" stroke="#fff" stroke-width="4"/><text x="50" y="52" text-anchor="middle" font-family="Arial,sans-serif" font-size="18" font-weight="900" fill="#fff">sorry :(</text></svg>');
 const KILL_A=uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#e53935" stroke="#fff" stroke-width="6"/><g fill="#1a0b0b"><circle cx="38" cy="40" r="7"/><circle cx="62" cy="34" r="6"/><circle cx="56" cy="62" r="7"/><circle cx="34" cy="64" r="5"/></g><g stroke="#ffd54a" stroke-width="3" stroke-linecap="round"><path d="M38 28v-8M27 40h-8M62 22v-7M72 34h7"/></g></svg>');
 const KILL_B=uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="#e53935" stroke="#fff" stroke-width="4" stroke-linejoin="round"><path d="M46 44L20 30l18-16z"/><path d="M54 44l10-30 18 14z"/><path d="M58 54l30-4-6 22z"/><path d="M52 60l14 26-24 2z"/><path d="M44 56L14 70l2-24z"/></g></svg>');
 /* Cada skin: id · game (el id del juego) · gameName · name · price · desc · preview (dos imágenes para la tienda) · shared (true = en una partida online el rival también la ve) */
 // 0.3.55 — skins del Sudoku: cambian SOLO los números que pones tú, sus notas y el teclado con sus opciones (Notas, Auto, Borrar, Pista). Los números fijos del tablero no cambian.
 const FONT_LAPIZ='"Segoe Print","Bradley Hand","Chalkboard SE","Marker Felt","Comic Sans MS",cursive',FONT_ORO='Georgia,"Times New Roman",serif';
 const numThumb=(bg,stroke,n,attrs,extra)=>uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${extra||''}<rect x="6" y="6" width="88" height="88" rx="18" fill="${bg}" stroke="${stroke}" stroke-width="4"/><text x="50" y="71" text-anchor="middle" font-size="62" font-weight="900" ${attrs}>${n}</text></svg>`);
 const GLOW='<defs><filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
 const neonThumb=(n,c)=>numThumb('#0d1030',c,n,`fill="none" stroke="${c}" stroke-width="3.500" stroke-linejoin="round" filter="url(#g)" font-family="Arial Rounded MT Bold,Arial,sans-serif"`,GLOW);
 const SD_NEON=[neonThumb(2,'#29a8ff'),neonThumb(3,'#ff9a1f')];
 const FONT_NEON='"Arial Rounded MT Bold","Nunito","Varela Round","Segoe UI",system-ui,sans-serif',NEON_S=['body.skin-sudoku-neon #gameScreen','#shopScreen .pv-sk-neon'];
 // 0.3.59 — neón de tubo (pedido del dueño, a partir de una foto de referencia): cada número es un contorno de luz de su propio color, sobre una loseta oscura. data-n lo pone watchBoard()
 const NEON_CSS=['255,61,242','41,168,255','255,154,31','53,224,74','255,79,139','255,167,38','47,224,106','255,92,154','47,180,255'].map((c,k)=>NEON_S.map(S=>`\n${S} .cell[data-n="${k+1}"],${S} .num-btn:nth-child(${k+1}),${S} .notes .note:nth-child(${k+1}){--nc:${c}}`).join('')).join('')
  +NEON_S.map(S=>`
${S} .num-btn{color:rgba(var(--nc),.14);-webkit-text-stroke:1.400px rgb(var(--nc));text-shadow:none;border-color:rgb(var(--nc));box-shadow:0 0 0 1px rgb(var(--nc)),0 0 10px rgba(var(--nc),.5),inset 0 0 8px rgba(var(--nc),.2);font-family:${FONT_NEON}}
${S} .num-btn small{-webkit-text-stroke:0;color:rgb(var(--nc));text-shadow:none}`).join('');
 const SD_LAPIZ=[numThumb('#fff8c9','#e2cf6a',4,`fill="#3d4350" font-family='${FONT_LAPIZ.replace(/"/g,'')}'`),numThumb('#ffffff','#c9d3e2',8,`fill="#3d4350" font-family='${FONT_LAPIZ.replace(/"/g,'')}'`)];
 const SD_ORO=[numThumb('#16120a','#c79a1e',9,'fill="#f6d36b" stroke="#7a5200" stroke-width="1.500" font-family="Georgia,serif"'),numThumb('#16120a','#c79a1e',1,'fill="#f6d36b" stroke="#7a5200" stroke-width="1.500" font-family="Georgia,serif"')];
 const WIN_FLAG=uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="6" y="6" width="88" height="88" rx="14" fill="#fff"/><rect x="6" y="6" width="36" height="36" rx="10" fill="#002d62"/><rect x="58" y="6" width="36" height="36" rx="10" fill="#ce1126"/><rect x="6" y="58" width="36" height="36" rx="10" fill="#ce1126"/><rect x="58" y="58" width="36" height="36" rx="10" fill="#002d62"/><rect x="6" y="6" width="88" height="88" rx="14" fill="none" stroke="#10213b" stroke-width="4"/></svg>');
 const WIN_FALL=uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="6" y="6" width="88" height="88" rx="14" fill="#10213b"/><g fill="#fff" stroke="#c9d3e2" stroke-width="2"><rect x="12" y="12" width="22" height="22" rx="4"/><rect x="66" y="12" width="22" height="22" rx="4"/><rect x="38" y="30" width="22" height="22" rx="4" transform="rotate(18 49 41)"/><rect x="14" y="52" width="22" height="22" rx="4" transform="rotate(-24 25 63)"/><rect x="62" y="62" width="22" height="22" rx="4" transform="rotate(35 73 73)"/></g></svg>');
 const WIN_FIRE=uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="6" y="6" width="88" height="88" rx="14" fill="#0d1030"/><g stroke-width="4" stroke-linecap="round"><g stroke="#ffd54a"><path d="M36 38v-14M36 38v14M36 38h-14M36 38h14M36 38l-10-10M36 38l10 10M36 38l-10 10M36 38l10-10"/></g><g stroke="#ff4f8b"><path d="M68 64v-11M68 64v11M68 64h-11M68 64h11M68 64l-8-8M68 64l8 8M68 64l-8 8M68 64l8-8"/></g><g stroke="#29a8ff"><path d="M72 26v-7M72 26v7M72 26h-7M72 26h7"/></g></g></svg>');
 /* 0.3.62 — número EQUIVOCADO con skin (pedido del dueño): Neón = tubo apagado · A lápiz = el número con un borrón en zigzag encima · Oro = se vuelve piedra.
    La casilla lleva la clase sk-bad (la pone watchBoard: app.js quita «wrong» a los 220 ms y la skin se perdería). Entran con la misma animación de cada skin. */
 const NEON_BAD=`color:transparent!important;font-family:${FONT_NEON};font-weight:800;-webkit-text-stroke:1.600px #a3abbc;text-shadow:none`;
 const scrib=c=>uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M10 30 Q50 14 88 22 Q46 38 16 52 Q52 40 86 46 Q44 62 14 78 Q52 66 90 70" fill="none" stroke="${c}" stroke-width="6.500" stroke-linecap="round" stroke-linejoin="round" opacity=".88"/></svg>`);
 const LAPIZ_BAD=`color:#0b0b0d!important;font-family:${FONT_LAPIZ};font-weight:700`;
 const ORO_BAD=`color:#8a8e96!important;font-family:${FONT_ORO};font-weight:900;text-shadow:0 1px 0 #eceef1,0 -1px 0 #4a4d55,1px 2px 2px #0006`;
 const BAD_CSS=`
body.skin-sudoku-lapiz #gameScreen .cell.sk-bad:not(.given)::after{content:"";position:absolute;inset:5%;background:${scrib('#0b0b0d')} center/100% 100% no-repeat;pointer-events:none}
html[data-theme="dark"] body.skin-sudoku-lapiz #gameScreen .cell.sk-bad:not(.given){color:#e9edf5!important}
html[data-theme="dark"] body.skin-sudoku-lapiz #gameScreen .cell.sk-bad:not(.given)::after{background-image:${scrib('#e9edf5')}}
body.skin-sudoku-lapiz #gameScreen .cell.sk-bad.sk-in::after{animation:skScrib .5s steps(10,end) .4s both}
@keyframes skScrib{0%{clip-path:inset(0 100% 0 0)}100%{clip-path:inset(0)}}`;
 const sdCss=(id,r)=>[`body.skin-sudoku-${id} #gameScreen`,`#shopScreen .pv-sk-${id}`].map(S=>`
${S} .cell:not(.given):not(.wrong):not(.sk-bad){${r.num}}
${S} .cell.selected{background:var(--cell,#fff)!important;${r.sel}}
${S} .cell.same:not(.given):not(.wrong):not(.sk-bad){color:${r.col}!important}
${S} .cell.sk-bad:not(.given){${r.bad}}
${S} .note.on{${r.note}}
${S} .num-btn,${S} .erase-key,${S} .tool{${r.key}}
${S} .num-btn small{${r.small}}
${S} .tool.active{${r.active}}
${S} .num-btn.exhausted{${r.off}}`).join('');
 const SD_CSS=sdCss('neon',{bad:NEON_BAD,col:'rgba(var(--nc,47,180,255),.14)',sel:'box-shadow:inset 0 0 0 3px #00d0ff,inset 0 0 11px #00d0ffaa,inset 0 0 3px 4px #ff4fd844',num:`color:rgba(var(--nc,47,180,255),.14);font-family:${FONT_NEON};font-weight:800;-webkit-text-stroke:1.600px rgb(var(--nc,47,180,255));text-shadow:none`,note:`color:rgb(var(--nc,47,180,255));font-family:${FONT_NEON};font-weight:900;-webkit-text-stroke:0;text-shadow:none;filter:saturate(1.15) brightness(.82)`,   // 0.3.60: las notas llevan el color de su número, sin resplandor. Van rellenas: a ese tamaño el contorno hueco no se lee
   key:'background:#0b1020;color:#39e6ff;border-color:#00d0ff;box-shadow:0 0 0 1px #00d0ff,0 0 10px #00d0ff80,inset 0 0 8px #00d0ff33;text-shadow:none',small:'color:#ff7be3;text-shadow:none',
   active:'background:#ff2bd0;color:#fff;border-color:#ff8be6;box-shadow:0 0 12px #ff2bd0;text-shadow:none',off:'opacity:.35;box-shadow:none;text-shadow:none'})+NEON_CSS
  +sdCss('lapiz',{bad:LAPIZ_BAD,col:'#0b0b0d',sel:'outline:2.500px dashed #0b0b0d;outline-offset:-5px;box-shadow:inset 0 0 0 1.500px #0b0b0d55',num:`color:#0b0b0d;font-family:${FONT_LAPIZ};font-weight:700`,note:`color:#6a7180;font-family:${FONT_LAPIZ}`,
   key:`background:#fff8c9;color:#3d4350;border-color:#e2cf6a;border-radius:5px 15px 7px 13px;box-shadow:2px 3px 0 #d9c65a;font-family:${FONT_LAPIZ}`,small:'color:#8a7a2a',
   active:'background:#ffd54a;color:#2a2200;border-color:#c9a400',off:'background:#efe9c8;color:#b3ab84;box-shadow:none'})
  +sdCss('oro',{bad:ORO_BAD,col:'#e6a400',sel:'box-shadow:inset 0 0 0 3px #e6a400,inset 0 0 0 4.500px #fff3b0,inset 0 0 11px #ffd54acc',num:`color:#e6a400;font-family:${FONT_ORO};font-weight:900;text-shadow:0 1px 0 #fff6c8,0 -1px 0 #8a5a00,0 0 7px #ffd54acc;animation:skShine 2.6s ease-in-out infinite`,note:'color:#c98f00;text-shadow:0 0 3px #ffd54a',
   key:`background:linear-gradient(180deg,#3a2f14,#0e0c08);color:#ffe27a;border-color:#ffcf3f;box-shadow:0 3px 0 #8a6400,0 0 9px #ffc40077,inset 0 1px 0 #fff3b088;text-shadow:0 0 6px #ffc400cc;font-family:${FONT_ORO}`,small:'color:#ffd76a;text-shadow:none',
   active:'background:linear-gradient(180deg,#fff0a0,#f0b400);color:#2a1c00;border-color:#fff7d0;text-shadow:none;box-shadow:0 3px 0 #8a6400,0 0 14px #ffd54a',off:'opacity:.4;box-shadow:none;text-shadow:none'})
  +'\nhtml[data-theme="dark"] body.skin-sudoku-oro #gameScreen .cell:not(.given):not(.wrong):not(.sk-bad){color:#ffd75e!important}\nhtml[data-theme="dark"] body.skin-sudoku-lapiz #gameScreen .cell:not(.given):not(.wrong):not(.sk-bad){color:#e9edf5!important}\nhtml[data-theme="dark"] body.skin-sudoku-lapiz #gameScreen .cell.selected{outline-color:#e9edf5;box-shadow:inset 0 0 0 1.500px #e9edf555}'
  // 0.3.56 — animación al poner un número (la clase sk-in y el <span class="sk-num"> los pone watchBoard(), más abajo): neón sube desde abajo, a lápiz se va escribiendo, oro cae desde arriba del tablero
  +BAD_CSS+`\n@keyframes skShine{0%,100%{text-shadow:0 1px 0 #fff6c8,0 -1px 0 #8a5a00,0 0 5px #ffd54a99}50%{text-shadow:0 1px 0 #fff,0 -1px 0 #8a5a00,0 0 12px #ffe27a,0 0 20px #ffc40099}}
#gameScreen .cell.sk-in{z-index:3}#gameScreen .cell .sk-num{display:inline-block;pointer-events:none}
body.skin-sudoku-neon #gameScreen .cell.sk-in{overflow:hidden}
body.skin-sudoku-neon #gameScreen .sk-num{animation:skNeon .5s cubic-bezier(.2,1.3,.4,1)}
body.skin-sudoku-lapiz #gameScreen .sk-num{animation:skLapiz .55s steps(11,end)}
body.skin-sudoku-oro #gameScreen .sk-num{animation:skOro .6s cubic-bezier(.55,0,.85,.5)}
@keyframes skNeon{0%{transform:translateY(120%);filter:brightness(3)}65%{transform:translateY(-10%);filter:brightness(1.8)}100%{transform:none;filter:none}}
@keyframes skLapiz{0%{clip-path:inset(-15% 100% -15% -15%);transform:rotate(-5deg)}50%{transform:rotate(3deg)}100%{clip-path:inset(-15%);transform:none}}
@keyframes skOro{0%{transform:translateY(var(--fall,-400%)) rotate(-30deg) scale(1.35)}68%{transform:translateY(0) rotate(0) scale(1.2,.75);filter:brightness(2)}84%{transform:translateY(-16%) scale(.95,1.08)}100%{transform:none;filter:none}}
@media(prefers-reduced-motion:reduce){#gameScreen .cell .sk-num,body.skin-sudoku-oro #gameScreen .cell{animation:none!important}}`;
 const SD_SND={neon:'neon',lapiz:'pencil',oro:'gold'};
 // Mira el tablero del Sudoku sin tocar js/app.js: cada vez que se repinta compara con lo que había; si cambió UNA sola casilla tuya (un número nuevo y correcto), la anima y suena
 function watchBoard(){
  const b=document.getElementById('board');if(!b||!window.MutationObserver)return;let prev=null;
  new MutationObserver(()=>{
   const cells=b.children;if(cells.length!==81){prev=null;return}
   const cur=Array.prototype.map.call(cells,c=>c.classList.contains('given')?'g':/^[1-9]$/.test(c.textContent)?(c.classList.toggle('sk-bad',c.classList.contains('wrong')),c.dataset.n=c.textContent):'');   // data-n: qué número tiene cada casilla tuya (la skin Neón lo usa para el color)
   const id=Skins.active('sudoku');
   if(id&&SD_SND[id]&&prev){const ch=[];for(let i=0;i<81;i++)if(cur[i]&&cur[i]!=='g'&&cur[i]!==prev[i])ch.push(i);
    if(ch.length===1){const c=cells[ch[0]];
     {const bad=c.classList.contains('wrong');const s=document.createElement('span');s.className='sk-num';s.textContent=cur[ch[0]];c.textContent='';c.appendChild(s);c.classList.add('sk-in');
      c.style.setProperty('--fall',-(c.offsetTop+c.offsetHeight)+'px');if(!bad||id==='lapiz')try{window.SudomiSound&&SudomiSound.play(SD_SND[id])}catch(_){}}}}
   prev=cur;
  }).observe(b,{childList:true});
 }
 const SKINS=[
  {id:'neon',cat:'sudoku',pv:'sudoku',game:'sudoku',gameName:'Números',name:'Neón',price:150,desc:'Tus números brillan en azul neón y el teclado se vuelve oscuro con luces.',preview:SD_NEON},
  {id:'lapiz',cat:'sudoku',pv:'sudoku',game:'sudoku',gameName:'Números',name:'A lápiz',price:120,desc:'Tus números salen escritos a mano, como en el periódico, y el teclado son papelitos amarillos.',preview:SD_LAPIZ},
  // 0.3.61 — animaciones del final del Sudoku (ranura aparte: se llevan junto con una skin de números)
  {id:'flag',cat:'sudoku',pv:'win',game:'sudokuwin',gameName:'Animación final',name:'Bandera',price:200,desc:'Al completar el sudoku, el tablero se pinta como la bandera dominicana, casilla por casilla.',preview:[WIN_FLAG]},
  {id:'fall',cat:'sudoku',pv:'win',game:'sudokuwin',gameName:'Animación final',name:'Derrumbe',price:150,desc:'Al completar el sudoku, las casillas se sueltan y caen del tablero; después vuelven a su sitio.',preview:[WIN_FALL]},
  {id:'fireworks',cat:'sudoku',pv:'win',game:'sudokuwin',gameName:'Animación final',name:'Fuegos artificiales',price:250,desc:'Al completar el sudoku, el tablero brilla en dorado y estallan fuegos artificiales encima.',preview:[WIN_FIRE]},
  {id:'oro',cat:'sudoku',pv:'sudoku',game:'sudoku',gameName:'Números',name:'Oro',price:200,desc:'Tus números van en dorado con letra elegante y el teclado es negro con oro.',preview:SD_ORO},
  {id:'caps',cat:'checkers',pv:'board',game:'checkers',gameName:'Damas',name:'Tapitas de refresco',price:150,desc:'Las fichas se cambian por tapas de botella de vidrio: rojas contra azules.',preview:[CAP_RED,CAP_BLUE],shared:true},
  {id:'faces',cat:'connect4',pv:'grid',game:'connect4',gameName:'4 en línea',name:'Caritas',price:150,desc:'Las fichas amarillas son caritas felices y las rojas, caras enojadas.',preview:[FACE_ANGRY,FACE_HAPPY],shared:true},
  // 0.3.47 — Mesa 3D del dominó: tres ranuras separadas (fondo, dominós, sillas). Se ven en la mesa de TODOS cuando la mano la saca quien los lleva (js/domino-3d.js)
  {id:'colmado',cat:'domino',pv:'img',game:'d3scene',gameName:'Mesa 3D · Fondo',name:'Colmado',price:100,desc:'Estantes de botellas, mostrador rojo y piso de losetas.',preview:[THUMB_COLMADO],note:' Se pone cuando sacas tú.'},
  {id:'playa',cat:'domino',pv:'img',game:'d3scene',gameName:'Mesa 3D · Fondo',name:'Playa',price:150,desc:'Mar, arena, sol y una palma.',preview:[THUMB_PLAYA],note:' Se pone cuando sacas tú.'},
  {id:'tilegreen',cat:'domino',pv:'img',game:'d3tiles',gameName:'Fichas',name:'Dominós verdes',price:120,desc:'Fichas verdes con puntos blancos, en la mesa clásica y en la Mesa 3D.',preview:[THUMB_TILE],note:' Se ponen cuando sacas tú.'},
  {id:'chairgreen',cat:'domino',pv:'img',game:'d3chairs',gameName:'Mesa 3D · Sillas',name:'Sillas verdes',price:100,desc:'Sillas plásticas verdes para toda la mesa.',preview:[THUMB_CHAIR],note:' Se ponen cuando sacas tú.'},
  {id:'blackdice',cat:'parchis',pv:'dice',game:'parchis',gameName:'Dados',name:'Dados negros',price:120,desc:'Dados negros con puntos rojos: salen cuando tiras tú, en el modo normal y en guerra.',preview:[DIE_5,DIE_6],shared:true},
  // 0.3.52 - animacion de captura de Parchimi: ranura aparte («parchiskill») para poder llevarla junto con los dados
  {id:'killshots',cat:'parchis',pv:'kill',game:'parchiskill',gameName:'Animación de captura',name:'Balacera',price:200,desc:'Cuando te comes una ficha sale volando, recibe cuatro disparos, se rompe en pedazos y se arma otra vez en su casa.',preview:[KILL_A,KILL_B],shared:true},
  // 0.3.53 - dos animaciones de captura mas (misma ranura: se lleva una a la vez)
  {id:'killbat',cat:'parchis',pv:'kill',game:'parchiskill',gameName:'Animación de captura',name:'Batazo',price:200,desc:'Cuando te comes una ficha, un bate de pelota le da un batazo, la rompe en pedazos y se arma otra vez en su casa.',preview:[KILL_BAT,KILL_B],shared:true},
  {id:'killbomb',cat:'parchis',pv:'kill',game:'parchiskill',gameName:'Animación de captura',name:'Bomba «sorry»',price:250,desc:'Cuando te comes una ficha se le pega una bomba, explota y sale un corazón que dice «sorry :(».',preview:[KILL_BOMB,KILL_HEART],shared:true}
 ];
 const read=()=>{try{const v=JSON.parse(localStorage.getItem(SKEY));return {own:Array.isArray(v&&v.own)?v.own:[],on:(v&&v.on&&typeof v.on==='object')?v.on:{}}}catch(_){return {own:[],on:{}}}};
 const write=v=>{try{localStorage.setItem(SKEY,JSON.stringify(v))}catch(_){}apply();try{window.dispatchEvent(new CustomEvent('sudomi-shop-skins'))}catch(_){}};   // el aviso sirve para mandársela al rival si estás en una partida online
 const Skins={
  list:()=>SKINS.slice(),
  owns:id=>read().own.includes(id),
  active:game=>{const v=read(),id=v.on[game];return id&&v.own.includes(id)?id:''},
  buy(id){const s=SKINS.find(x=>x.id===id),v=read();if(!s||v.own.includes(id))return false;if(!Coins.spend(s.price))return false;v.own.push(id);v.on[s.game]=id;write(v);return true},   // al comprarla queda puesta
  equip(id,on){const s=SKINS.find(x=>x.id===id),v=read();if(!s||!v.own.includes(id))return false;if(on)v.on[s.game]=id;else delete v.on[s.game];write(v);return true}
 };
 function css(){
  // 0.3.39: la skin va en CADA ficha (clase sk-caps), no en toda la página: así en una partida online cada lado lleva la skin de su dueño.
  // Quién lleva qué lo decide skinOf() en js/other-games.js. Si te tocan las rojas, tu tapa es la roja; si te tocan las negras, la azul.
  return `#miniGameStage .checker-piece.sk-caps{border:0;border-radius:50%;background-size:100% 100%;background-repeat:no-repeat;box-shadow:0 3px 0 #0007,0 6px 9px #0006}
#miniGameStage .checker-piece.sk-caps::before,#miniGameStage .checker-piece.sk-caps::after{display:none}
#miniGameStage .checker-piece.sk-caps.red-piece{background-image:${CAP_RED};background-color:transparent}
#miniGameStage .checker-piece.sk-caps.black-piece{background-image:${CAP_BLUE};background-color:transparent}
#miniGameStage .checker-piece.sk-caps b{filter:drop-shadow(0 1px 1px #000a)}
#miniGameStage .connect-slot.sk-faces.red-disc{background:${FACE_ANGRY} center/100% 100% no-repeat;box-shadow:0 2px 4px #0007}
#miniGameStage .connect-slot.sk-faces.yellow-disc{background:${FACE_HAPPY} center/100% 100% no-repeat;box-shadow:0 2px 4px #0007}
#miniGameStage .connect-slot.sk-faces.falling-disc{background:radial-gradient(circle at 50% 40%,#0a2f73 0 60%,#0d3a85 100%)}
#miniGameStage .connect-slot.sk-faces.falling-disc::before{content:"";box-shadow:none}
#miniGameStage .connect-slot.sk-faces.falling-disc.red-disc::before{background:${FACE_ANGRY} center/100% 100% no-repeat}
#miniGameStage .connect-slot.sk-faces.falling-disc.yellow-disc::before{background:${FACE_HAPPY} center/100% 100% no-repeat}
.pc-die.sk-blackdice{border-color:#000;background:linear-gradient(145deg,#4a4a52,#0b0b0d);box-shadow:0 3px 0 #000a,0 6px 10px #0008}
.pc-die.sk-blackdice i.on{background:#ff2b3a;box-shadow:0 0 5px #ff2b3a,inset 0 1px 1px #fff6}
.pc-die.sk-blackdice.sel{box-shadow:0 0 0 3px #ffd54a,0 0 0 5px #000,0 6px 10px #0008}`+SD_CSS;
 }
 function apply(){
  let st=document.getElementById('sudomiSkinCss');
  if(!st){st=document.createElement('style');st.id='sudomiSkinCss';st.textContent=css();document.head.appendChild(st)}
  SKINS.forEach(s=>document.body.classList.toggle(`skin-${s.game}-${s.id}`,Skins.active(s.game)===s.id));
 }

 /* ---------- la pantalla ---------- */
 // 0.3.54: la tienda va separada por juego (pestañas arriba) y cada objeto tiene «Ver»: una vista previa grande; las animaciones de captura se ven en movimiento
 const CATS=[['all','Todo'],['sudoku','Sudoku'],['checkers','Damas'],['connect4','4 en línea'],['domino','Dominó'],['parchis','Parchimi']];
 let taps=0,tapAt=0,cat='all',pvId='';
 const bgi=u=>`style="background-image:${u.replace(/"/g,'&quot;')}"`;
 function pvHTML(s){
  const P=s.preview;
  if(s.pv==='board'){const at={1:0,3:0,4:0,6:0,9:1,11:1,12:1,14:1};return `<div class="shop-stage pv-board">${Array.from({length:16},(_,k)=>`<span class="${((k>>2)+k)%2?'d':'l'}">${k in at?`<i ${bgi(P[at[k]])}></i>`:''}</span>`).join('')}</div>`}
  if(s.pv==='grid'){const at={2:1,6:0,7:1,8:1,9:0,10:1,11:0,12:0,13:1,14:0,15:0};return `<div class="shop-stage pv-grid">${Array.from({length:16},(_,k)=>`<span>${k in at?`<i ${bgi(P[at[k]])}></i>`:''}</span>`).join('')}</div>`}
  if(s.pv==='sudoku'){const box=[[5,1],[7,0],[3,0],[4,0],[8,1],[6,0],[9,0],[2,1],[0,2]];   // [número, 1 = fijo · 0 = tuyo · 2 = notas]
   return `<div class="shop-stage pv-sudoku pv-sk-${s.id}"><div class="pv-sbox">${box.map(([n,k],i)=>k===2?`<span class="cell"><span class="notes">${[1,2,3,4,5,6,7,8,9].map(m=>`<span class="note${m===4||m===7?' on':''}">${m===4||m===7?m:''}</span>`).join('')}</span></span>`:`<span class="cell${k?' given':''}"${k?'':` data-n="${n}"`}>${n}</span>`).join('')}</div>
    <div class="pv-spad">${[1,2,3,4,5].map(n=>`<span class="num-btn${n===5?' exhausted':''}">${n}<small>${n===5?9:n+2}/9</small></span>`).join('')}</div>
    <div class="pv-stools"><span class="tool active">✎ Notas</span><span class="tool">⌫ Borrar</span><span class="tool">💡 Pista</span></div><em class="pv-snote">Los números negros son los fijos: esos no cambian.</em></div>`}
  if(s.pv==='win')return `<div class="shop-stage pv-win" data-win="${s.id}"></div>`;
  if(s.pv==='dice')return `<div class="shop-stage pv-dice"><i ${bgi(P[0])}></i><i ${bgi(P[1])}></i></div>`;
  if(s.pv==='kill')return `<div class="shop-stage pv-kill" data-kill="${s.id}"></div>`;
  return `<div class="shop-stage pv-img"><i ${bgi(P[0])}></i></div>`;
 }
 function open(){
  const S=window.SudomiScreen;if(!S)return;
  S.open('shopScreen','Tienda de skins',(body,api)=>{
   const coins=Coins.get();
   const item=s=>{const own=Skins.owns(s.id),on=Skins.active(s.game)===s.id,can=coins>=s.price;
     return `<div class="shop-item${on?' on':''}"><button type="button" class="shop-prev g-${s.game}" data-pv="${s.id}" aria-label="Ver ${s.name}">${s.preview.map(u=>`<i ${bgi(u)}></i>`).join('')}<em>👁 Ver</em></button>
      <div class="shop-txt"><small>${s.gameName}</small><b>${s.name}</b><p>${s.desc}${s.note||(s.shared?' Tu rival online también las ve.':'')}</p></div>
      ${own?`<button type="button" class="shop-btn ${on?'alt':''}" data-eq="${s.id}" data-on="${on?0:1}">${on?'Quitar':'Usar'}</button>`:`<button type="button" class="shop-btn buy" data-buy="${s.id}" ${can?'':'disabled'}>${coinSvg()} ${s.price}</button>`}
      ${own?`<em class="shop-tag">${on?'Puesta':'Comprada'}</em>`:can?'':`<em class="shop-tag miss">Te faltan ${s.price-coins}</em>`}</div>`};
   const groups=CATS.slice(1).filter(c=>cat==='all'||c[0]===cat).map(c=>{const L=SKINS.filter(s=>s.cat===c[0]);return L.length?`<h3 class="shop-h">${c[1]} <small>${L.filter(s=>Skins.owns(s.id)).length}/${L.length}</small></h3><div class="shop-list">${L.map(item).join('')}</div>`:''}).join('');
   const pv=SKINS.find(s=>s.id===pvId);
   body.innerHTML=`<div class="shop-bank">${coinSvg()}<div><b>${coins.toLocaleString('es')}</b><small>monedas</small></div></div>
    <p class="shop-how">Ganas <b>${DAILY_COINS} monedas</b> por cada reto diario que cumplas: el <b>Sudoku del día</b> y el <b>Reto de hoy</b> del arcade.</p>
    <div class="shop-cats" role="tablist">${CATS.map(c=>`<button type="button" role="tab" aria-selected="${cat===c[0]}" class="shop-cat${cat===c[0]?' on':''}" data-cat="${c[0]}">${c[1]}</button>`).join('')}</div>
    ${groups}
    <p class="shop-how small">Pronto habrá más skins. Las monedas y las compras se guardan en este teléfono.</p>
    ${pv?`<div class="shop-pv" role="dialog" aria-label="Vista previa de ${pv.name}"><div class="shop-pvcard"><small>${[(CATS.find(c=>c[0]===pv.cat)||[0,''])[1],pv.gameName].filter((x,k,a)=>x&&a.indexOf(x)===k).join(' · ')}</small><b>${pv.name}</b>${pvHTML(pv)}<p>${pv.desc}</p><button type="button" class="shop-btn alt" data-pvx>Cerrar</button></div></div>`:''}`;
   // 0.3.40 — TRUCO DE PRUEBAS (quitar antes de publicar en tiendas): tocar 7 veces seguidas la moneda grande da 500 monedas
   const bank=body.querySelector('.shop-bank .coin');
   if(bank)bank.onclick=()=>{const now=Date.now();taps=now-tapAt<1200?taps+1:1;tapAt=now;if(taps>=7){taps=0;Coins.add(500,'Monedas de prueba');api.redraw()}};
   body.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{if(Skins.buy(b.dataset.buy))api.redraw()});
   body.querySelectorAll('[data-eq]').forEach(b=>b.onclick=()=>{Skins.equip(b.dataset.eq,b.dataset.on==='1');api.redraw()});
   body.querySelectorAll('[data-cat]').forEach(b=>b.onclick=()=>{cat=b.dataset.cat;api.redraw()});
   body.querySelectorAll('[data-pv]').forEach(b=>b.onclick=()=>{pvId=b.dataset.pv;api.redraw()});
   const ov=body.querySelector('.shop-pv');
   if(ov){ov.onclick=ev=>{if(ev.target===ov||ev.target.closest('[data-pvx]')){pvId='';api.redraw()}};
    const wb=ov.querySelector('[data-win]');if(wb)demoWin(wb,wb.dataset.win);
    const kb=ov.querySelector('[data-kill]');if(kb&&window.SudomiParchis&&SudomiParchis.demoKill)SudomiParchis.demoKill(kb,kb.dataset.kill)}
  });
 }

 window.addEventListener('sudomi-coins',()=>{const el=document.getElementById('shopScreen');if(el&&!el.classList.contains('hidden')){const b=el.querySelector('.shop-bank b');if(b)b.textContent=Coins.get().toLocaleString('es')}});
 window.SudomiCoins=Coins;window.SudomiShopSkins=Skins;window.SudomiShop={open};
 /* 0.3.61 — FINAL DEL SUDOKU
    1) La tarjeta «¡Sudoku completado!» espera unos segundos antes de salir, para que se vea la animación del final. No se retrasa el código de js/app.js
       (otros archivos escriben dentro de esa tarjeta nada más ganar): la tarjeta se crea igual, pero invisible (#modal.win-wait) hasta que pasa el tiempo. Un toque la muestra ya.
    2) Animaciones del final (ranura «sudokuwin» de la tienda): winAnim(id, casillas, lado, rectángulo). La misma función mueve el tablero de verdad y la vista previa. */
 const WIN_HOLD=2600,WIN_HOLD_SKIN=4000,WIN_FX={flag:1,fall:1,fireworks:1};
 function winAnim(id,cells,side,rect){
  const mid=(side-1)/2,FX=window.SudomiFX;
  cells.forEach((c,i)=>{
   const r=Math.floor(i/side),k=i%side;c.classList.remove('wfx-flag','wfx-fall','wfx-gold');void c.offsetWidth;
   if(id==='flag'){const cross=r===mid||k===mid;c.style.setProperty('--wc',cross?'#ffffff':(r<mid)===(k<mid)?'#002d62':'#ce1126');c.style.setProperty('--wt',cross?'#10213b':'#ffffff');c.style.setProperty('--wd',(r+k)*55+'ms');c.classList.add('wfx-flag')}
   else if(id==='fall'){c.style.setProperty('--wd',Math.round(k*45+Math.random()*420)+'ms');c.style.setProperty('--wr',Math.round(Math.random()*120-60)+'deg');c.style.setProperty('--wy',Math.round(rect.height*(1.05-r/side)+40)+'px');c.classList.add('wfx-fall')}
   else{c.style.setProperty('--wd',Math.round(Math.hypot(r-mid,k-mid)*110)+'ms');c.classList.add('wfx-gold')}
  });
  if(id==='fireworks'&&FX&&FX.sparks){const C=['#ffd54a','#ff4f8b','#29a8ff','#35e04a','#ffffff','#ff9a1f'];
   for(let n=0;n<9;n++){const x=rect.left+rect.width*(.12+Math.random()*.76),y=rect.top+rect.height*(.1+Math.random()*.6);try{FX.sparks(x,y,26,[C[n%C.length],'#ffffff',C[(n+2)%C.length]],200+n*370,1.5)}catch(_){}}}
  setTimeout(()=>cells.forEach(c=>c.classList.remove('wfx-flag','wfx-fall','wfx-gold')),3900);
 }
 function winHold(){
  const m=document.getElementById('modal'),b=document.getElementById('board');if(!m)return;
  const id=Skins.active('sudokuwin'),on=!!WIN_FX[id];
  if(on&&b&&b.children.length===81)setTimeout(()=>{if(b.children.length===81)winAnim(id,[...b.children],9,b.getBoundingClientRect())},250);
  m.classList.add('win-wait');
  const show=()=>{m.classList.remove('win-wait');document.removeEventListener('pointerdown',skip,true)},skip=()=>setTimeout(show,0);
  setTimeout(()=>document.addEventListener('pointerdown',skip,true),400);   // un toque (pasado el primero, que es el del último número) la muestra ya
  setTimeout(show,on?WIN_HOLD_SKIN:WIN_HOLD);
 }
 window.addEventListener('sudomi-win',winHold);
 // vista previa en la tienda: un tablerito de 5×5 que repite la animación
 function demoWin(box,id){
  if(!box)return;const side=5;box.innerHTML=Array.from({length:side*side},(_,i)=>`<span class="cell${i%3?'':' given'}">${(i*7+3)%9+1}</span>`).join('');
  const loop=()=>{if(!box.isConnected)return;winAnim(id,[...box.children],side,box.getBoundingClientRect());setTimeout(loop,4700)};setTimeout(loop,500);
 }
 const boot=()=>{apply();watchBoard()};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
