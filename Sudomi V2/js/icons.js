/* SUDOMI 0.3.98 (roadmap 5.1) — JUEGO DE ICONOS PROPIO para menús y botones (window.SudomiIcons).
 * Los emojis se ven distintos en iPhone, Android y Windows; estos son dibujos de línea que toman el color del texto.
 * No hay que tocar cada pantalla: un vigilante (MutationObserver) busca en los sitios de menú (títulos de pantalla, «Más de SUDOMI», menú de la
 * portada, botones de sala, botones del arcade) un emoji AL PRINCIPIO del texto y lo cambia por su icono. Lo que no está en EMOJI se queda igual.
 * SudomiIcons.svg('nombre') da el dibujo para usarlo a mano. */
(()=>{
 const P={
  brain:'<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V5a2 2 0 0 0-3-1zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/><path d="M12 9h-2M12 14h2"/>',
  teacher:'<rect x="3" y="4" width="13" height="9" rx="1"/><path d="M6 8h7M6 10.5h4"/><circle cx="18.5" cy="9" r="2.2"/><path d="M14.5 20c.4-3 2-4.6 4-4.6s3.6 1.6 4 4.6M16 13l-3 2"/>',
  trophy:'<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4c0 3 1.5 4.5 3.5 4.5M17 6h3c0 3-1.5 4.5-3.5 4.5M12 14v3M8 20h8M9.5 17h5v3h-5z"/>',
  user:'<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20c.7-4 3.7-6.3 7.5-6.3s6.8 2.3 7.5 6.3"/>',
  users:'<circle cx="9" cy="8.5" r="3.2"/><path d="M2.8 19.5c.5-3.3 3-5.3 6.2-5.3s5.7 2 6.2 5.3"/><circle cx="17" cy="9.5" r="2.5"/><path d="M16.5 14.3c2.6.1 4.3 1.8 4.8 4.4"/>',
  palette:'<path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-1.3-1.2-1.6-1.2-2.8 0-1 .8-1.6 1.8-1.6H17a4 4 0 0 0 4-4C21 6.5 17 3 12 3z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10" cy="7" r="1.2"/><circle cx="15" cy="7.5" r="1.2"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/><circle cx="12" cy="12" r="6.5"/>',
  pad:'<path d="M7 8h10a5 5 0 0 1 4.9 6l-.6 3a2.4 2.4 0 0 1-4.2 1l-1.6-2H8.5l-1.6 2a2.4 2.4 0 0 1-4.2-1l-.6-3A5 5 0 0 1 7 8Z"/><path d="M7.5 11v3M6 12.5h3"/><circle cx="16" cy="11.5" r=".8"/><circle cx="18" cy="13.5" r=".8"/>',
  globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  map:'<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  scroll:'<path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8"/><path d="M6 4a2 2 0 0 0-2 2v2h4V6a2 2 0 0 0-2-2zM8 8v10a2 2 0 0 1-4 0"/><path d="M11 9h5M11 12h5M11 15h3"/>',
  pencil:'<path d="M4 20l1-5L16 4l4 4L9 19z"/><path d="M14 6l4 4"/>',
  share:'<path d="M12 15V3M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  cloud:'<path d="M7 18a4 4 0 0 1-.6-8 6 6 0 0 1 11.5 1.5A3.3 3.3 0 0 1 17.5 18z"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  robot:'<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 8V4.5M9 19v2M15 19v2M3 12.5v3M21 12.5v3"/><circle cx="12" cy="3.5" r="1.2"/><circle cx="9.3" cy="12.5" r="1.3"/><circle cx="14.7" cy="12.5" r="1.3"/><path d="M9.5 16h5"/>',
  dice:'<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="8.5" cy="8.5" r="1.1"/><circle cx="15.5" cy="15.5" r="1.1"/><circle cx="12" cy="12" r="1.1"/><circle cx="15.5" cy="8.5" r="1.1"/><circle cx="8.5" cy="15.5" r="1.1"/>',
  bag:'<path d="M5 8.5h14l-1 11.5H6z"/><path d="M8.5 8.5V7a3.5 3.5 0 0 1 7 0v1.5"/>',
  swords:'<path d="M4 4l9 9M4 4h4M4 4v4M20 4l-9 9M20 4h-4M20 4v4"/><path d="M7 15l2 2M17 15l-2 2M5 19l3-3M19 19l-3-3"/>',
  calendar:'<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h2M12 14h2M16 14h.5M8 17h2"/>',
  lock:'<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><circle cx="12" cy="15.5" r="1.3"/>',
  gift:'<rect x="3.5" y="8" width="17" height="4" rx="1"/><path d="M5 12v8h14v-8M12 8v12M12 8c-2-4-6-4-6-1.5S10 8 12 8zM12 8c2-4 6-4 6-1.5S14 8 12 8z"/>',
  chat:'<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  key:'<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/>',
  phone:'<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/><path d="M12 7v6M9.5 10.5L12 13l2.5-2.5"/>',
  book:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
  star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  radio:'<rect x="3" y="8" width="18" height="12" rx="2.5"/><path d="M6 8l11-5"/><circle cx="9" cy="14" r="3"/><path d="M15 12h3M15 15h3"/>',
  flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  sound:'<path d="M4 9.5h4l5-4v13l-5-4H4z"/><path d="M16.5 9a4 4 0 0 1 0 6M19 6.5a7.5 7.5 0 0 1 0 11"/>',
  home:'<path d="M3.5 11L12 4l8.5 7"/><path d="M6 9.5V20h12V9.5"/><path d="M10 20v-5h4v5"/>',
  puzzle:'<path d="M5 8h3a2 2 0 1 1 4 0h3v3a2 2 0 1 1 0 4v3h-3a2 2 0 1 0-4 0H5v-3a2 2 0 1 0 0-4z"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.2"/>'
 };
 // emoji (sin el selector de variante) → icono
 const EMOJI={'🧠':'brain','👨‍🏫':'teacher','🧑‍🏫':'teacher','🏆':'trophy','👤':'user','👥':'users','🎨':'palette','⚙':'gear','🎮':'pad','🌍':'globe','🌐':'globe','🗺':'map','📜':'scroll','✏':'pencil','📤':'share','📊':'chart','☁':'cloud','📋':'copy','🤖':'robot','🎲':'dice','🛍':'bag','⚔':'swords','📅':'calendar','🔒':'lock','🎁':'gift','💬':'chat','🔑':'key','📲':'phone','📘':'book','⭐':'star','📻':'radio','🏁':'flag','🔊':'sound','🏠':'home','🧩':'puzzle','ℹ':'info'};
 const svg=n=>P[n]?`<svg viewBox="0 0 24 24" aria-hidden="true">${P[n]}</svg>`:'';
 const RE=/^(\s*)((?:\p{Extended_Pictographic}|ℹ)(?:️|‍(?:\p{Extended_Pictographic}|⚕|♀|♂)️?)*)\s*/u;
 // dónde se cambia: títulos de pantalla, menú de la portada, «Más de SUDOMI», botones de perfil, de sala y del arcade
 // (el menú viejo de la portada, #homeDropdown, NO se toca: está escondido y «Más de SUDOMI» copia sus emojis de ahí)
 const SEL='.ach-title,.pf-more button>span,.tc-btns button,.lb-btn,.lb-invite,.arc-btn,.shop-cat,.fs-menu button,.rd-shop,.daily-arc>span:first-child,.open-rooms>span:first-child';
 function fix(el){
  if(el.querySelector(':scope>i.si'))return;   // (las pantallas reescriben su título: entonces el icono se vuelve a poner)
  const t=el.firstChild;if(!t||t.nodeType!==3)return;
  const m=t.nodeValue.match(RE);if(!m)return;const name=EMOJI[m[2].replace(/️/g,'')];if(!name)return;
  t.nodeValue=t.nodeValue.slice(m[0].length);
  const i=document.createElement('i');i.className='si';i.innerHTML=svg(name);el.insertBefore(i,t);
 }
 let q=0;const run=()=>{q=0;document.querySelectorAll(SEL).forEach(fix)};
 const later=()=>{if(!q)q=setTimeout(run,40)};   // un temporizador y no requestAnimationFrame: ese se para si la app está en segundo plano
 function boot(){run();new MutationObserver(later).observe(document.body,{childList:true,subtree:true,characterData:true})}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
 window.SudomiIcons={svg,names:()=>Object.keys(P)};
})();
