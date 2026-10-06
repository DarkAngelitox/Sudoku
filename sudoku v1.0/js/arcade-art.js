/* SUDOMI 0.2.95 — dibujos de la interfaz del ARCADE («Otros juegos»): window.SudomiArcadeArt. Solo decoración, sin lógica de juego.
 *   logo            → el logo «SUDOMI ARCADE» de la barra de arriba (también es el botón que lleva a la lista de juegos)
 *   icon('home'|'back') → la casa y la flecha de la barra
 *   banner(id,nombre,sub) → el banner de cada juego: usa el dibujo de js/game-art.js + el nombre, con el color de BCOL[id]
 *   opt(id,modo)    → la animación de cada opción del menú de un juego: un emoji del tema del juego + un movimiento distinto por opción
 *   scene(estilo)   → adornos que flotan en el fondo según el estilo puesto en Personalizar (cohetes y planetas en Galaxia, etc.)
 * Para un juego nuevo: una línea en BCOL y otra en OPT (si faltan, se usa DEFAULT). Los movimientos (fx-…) están al final de css/main.css. */
window.SudomiArcadeArt=(()=>{
 const logo=`<svg viewBox="0 0 214 60" aria-hidden="true"><defs><linearGradient id="arcLg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e63c8"/><stop offset="1" stop-color="#0b2f6f"/></linearGradient></defs>
  <circle cx="30" cy="30" r="28" fill="#ffcc00"/><circle cx="30" cy="30" r="24.500" fill="url(#arcLg)"/>
  <g transform="rotate(-20 20 27)"><rect x="11" y="13" width="17" height="24" rx="3" fill="#fff" stroke="#10213b" stroke-width="1.2"/><path d="M19.500 20c-3.500-3.500-7 1-3.500 4.500l3.500 3.500 3.500-3.500c3.500-3.500 0-8-3.500-4.500z" fill="#d62027"/></g>
  <g transform="rotate(18 41 24)"><rect x="34" y="11" width="13" height="26" rx="3" fill="#fff" stroke="#10213b" stroke-width="1.2"/><line x1="35" y1="24" x2="46" y2="24" stroke="#10213b" stroke-width="1.2"/><circle cx="38" cy="16" r="1.5" fill="#10213b"/><circle cx="43" cy="20" r="1.5" fill="#10213b"/><circle cx="40.500" cy="30.500" r="1.5" fill="#10213b"/></g>
  <g transform="rotate(-8 30 40)"><rect x="21" y="31" width="18" height="18" rx="4" fill="#d62027" stroke="#10213b" stroke-width="1.2"/><circle cx="25.500" cy="35.500" r="1.800" fill="#fff"/><circle cx="30" cy="40" r="1.800" fill="#fff"/><circle cx="34.500" cy="44.500" r="1.800" fill="#fff"/></g>
  <text x="66" y="30" font-family="system-ui,'Segoe UI',Arial,sans-serif" font-size="27" font-weight="900" letter-spacing="1.5" fill="#0b3d91">SUDO<tspan fill="#d62027">MI</tspan></text>
  <rect x="66" y="37" width="92" height="19" rx="9.500" fill="#d62027"/><rect x="66" y="37" width="92" height="9" rx="6" fill="#fff" opacity=".14"/>
  <text x="112" y="51" text-anchor="middle" font-family="system-ui,'Segoe UI',Arial,sans-serif" font-size="12.500" font-weight="900" letter-spacing="4" fill="#fff">ARCADE</text>
  <path d="M170 39l3 6 6 1-4.500 4 1 6-5.500-3-5.500 3 1-6-4.500-4 6-1z" fill="#ffcc00" stroke="#10213b" stroke-width="1"/></svg>`;
 const ICONS={
  home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.500 11.200L12 4l8.500 7.200M6 9.800V20h4.200v-5.400h3.600V20H18V9.800" fill="none" stroke="currentColor" stroke-width="2.300" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  back:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.500 5L7.500 12l7 7M8 12h9.500" fill="none" stroke="currentColor" stroke-width="2.600" stroke-linecap="round" stroke-linejoin="round"/></svg>'
 };
 const BCOL={dos:'#ffb300',mines:'#6d7b8d',fleet:'#1e88e5',chess:'#8d6e63',checkers:'#c62828',tictactoe:'#7e57c2',connect4:'#1565c0',domino:'#2e7d32',memory:'#ef6c00',dotsboxes:'#00897b',stop:'#d81b60',mahjong:'#00796b',blackjack:'#1b5e20',poker:'#4a148c',escoba:'#ad6f00',rummy:'#283593',slide:'#f4511e',dominopolis:'#0277bd',parchis:'#f9a825'};
 function banner(id,name,sub){
  const art=(window.SudomiGameArt&&SudomiGameArt[id])||'';
  return `<div class="arc-banner" style="--bn:${BCOL[id]||'#0b3d91'}">${art?`<div class="arc-banner-art">${art}</div>`:''}<div class="arc-banner-name">${sub?`<small>${sub}</small>`:''}<b>${name}</b></div></div>`;
 }
 // [emoji, movimiento] por opción: contra la máquina · mismo dispositivo · multijugador · (Buscaminas: reloj / práctica)
 const OPT={
  dos:{pve:['🃏','flip'],online:['🌪','spin']},
  mines:{clock:['⏱','shake'],practice:['🚩','hop'],pve:['💣','zoom']},
  fleet:{pve:['🚢','slide'],pvp:['💥','zoom'],online:['🌊','wave']},
  chess:{pve:['♞','hop'],pvp:['♛','pulse'],online:['♜','slide']},
  checkers:{pve:['🔴','hop'],pvp:['⚫','slide'],online:['👑','spin']},
  tictactoe:{pve:['❌','spin'],pvp:['⭕','pulse'],online:['✏️','shake']},
  connect4:{pve:['🔴','drop'],pvp:['🟡','drop2'],online:['🏁','wave']},
  domino:{pve:['👊','zoom'],pvp:['🤝','shake'],online:['🍾','hop']},
  memory:{pve:['🐶','flip'],pvp:['🦊','hop'],online:['❓','spin']},
  dotsboxes:{pve:['✏️','slide'],pvp:['🟦','zoom'],online:['▫️','pulse']},
  stop:{pve:['✋','zoom'],pvp:['⏱','shake'],online:['🔤','flip']},
  mahjong:{pve:['🀄','flip'],pvp:['🎋','wave'],online:['🐉','slide']},
  blackjack:{pve:['♠️','flip'],pvp:['♥️','pulse'],online:['💰','hop']},
  poker:{pve:['♦️','spin'],pvp:['♣️','flip'],online:['🪙','drop']},
  escoba:{pve:['🧹','wave'],pvp:['🪙','hop'],online:['⚔️','shake']},
  rummy:{pve:['🎴','flip'],pvp:['🔗','shake'],online:['📚','hop']},
  slide:{pve:['🧩','slide'],pvp:['🥭','hop'],online:['🥁','shake']},
  dominopolis:{pve:['🏠','hop'],online:['💵','wave']},
  parchis:{pve:['🎲','spin'],pvp:['🟡','hop'],online:['⚔️','shake']}
 };
 const DEFAULT={pve:['🤖','hop'],pvp:['👥','shake'],online:['🌐','spin'],clock:['⏱','shake'],practice:['🧘','pulse']};
 function opt(id,mode){const o=(OPT[id]&&OPT[id][mode])||DEFAULT[mode];return o?`<span class="opt-fx fx-${o[1]}" aria-hidden="true">${o[0]}</span>`:''}
 // adornos del fondo por estilo: [emoji, left %, top %, tamaño px, segundos]
 const SCENES={
  '':[['🌴',4,16,54,9],['🌴',88,60,62,11],['☀️',82,6,46,13],['🌊',10,84,44,8],['⚾',70,34,26,10],['🥁',16,52,30,12],['🇩🇴',50,92,28,14],['🕊️',36,10,26,9],['🥭',92,26,24,10],['⭐',58,70,20,7]],
  galaxia:[['🚀',6,18,50,7],['🪐',84,10,64,14],['🛸',72,56,44,9],['🌍',10,74,56,16],['☄️',40,6,38,8],['🛰️',90,80,34,11],['⭐',26,40,18,5],['✨',60,30,22,6],['🌙',50,88,40,13],['👨‍🚀',20,92,34,10],['⭐',78,34,14,4],['🌟',4,50,20,6]],
  navidad:[['🎄',5,70,60,10],['🎁',86,82,40,8],['❄️',20,10,28,6],['❄️',70,22,22,7],['⛄',90,40,46,11],['🔔',40,6,30,9],['🦌',12,40,40,12],['⭐',55,90,24,6],['🎅',78,8,44,13],['❄️',48,50,18,5]],
  halloween:[['🎃',6,76,56,9],['👻',84,14,48,7],['🦇',24,10,34,6],['🕸️',92,70,52,14],['🦇',66,30,26,5],['🕯️',44,90,30,10],['💀',14,44,34,12],['🌕',52,6,50,15],['🍬',80,50,24,8]],
  anime:[['🌸',8,12,34,7],['🌸',80,24,26,6],['⛩️',86,74,56,13],['🗻',6,78,60,15],['🍡',44,8,30,9],['🎏',66,48,36,8],['🌸',30,54,20,5],['🍙',20,90,28,10],['✨',58,88,22,6]],
  manga:[['💥',8,16,46,7],['⚡',84,12,40,6],['💢',70,60,34,8],['✒️',12,74,40,11],['📖',88,82,42,13],['💭',40,8,40,10],['⭐',54,90,24,6],['💨',24,46,34,7]],
  comic:[['💥',84,14,54,7],['⚡',8,20,44,6],['🦸',6,74,54,12],['💬',70,58,40,9],['🌟',40,8,30,8],['🗯️',88,82,44,11],['💫',24,48,30,7],['🎯',52,90,30,10]],
  bosque:[['🌲',4,66,64,13],['🌳',86,60,66,14],['🍄',20,88,32,9],['🦌',74,84,40,11],['🦋',30,14,26,6],['🍃',60,8,26,7],['🐿️',10,36,30,10],['🌿',90,22,34,9],['🦉',48,48,28,12]],
  caramelo:[['🍭',6,18,50,8],['🍬',84,12,36,6],['🧁',86,70,48,11],['🍩',10,74,46,10],['🍫',44,8,32,9],['🍓',70,44,28,7],['🍦',24,48,34,12],['🍪',54,90,32,8]],
  fuego:[['🔥',6,78,58,5],['🔥',86,74,50,6],['🌋',84,14,58,14],['☄️',14,12,42,7],['💥',50,8,34,8],['🔥',40,90,36,4],['✨',68,44,22,5],['🐉',10,44,44,12]],
  minimalista:[['◯',8,16,44,12],['△',84,18,40,14],['▢',86,76,44,13],['◇',10,78,40,11],['＋',48,8,26,9]]
 };
 function scene(skin){return (SCENES[skin]||SCENES['']).map(([e,x,y,s,d],k)=>`<i style="left:${x}%;top:${y}%;font-size:${s}px;--d:${d}s;animation-delay:-${(k*1.3)%d}s">${e}</i>`).join('')}
 return {logo,icon:n=>ICONS[n]||'',banner,opt,scene};
})();
