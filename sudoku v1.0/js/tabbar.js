/* SUDOMI 0.3.1 (v2, Fase 1 del roadmap) — BARRA DE ABAJO con 4 pestañas: Sudoku · Arcade · Amigos · Perfil.
 * Sustituye al menú de hamburguesa de la portada (que se esconde con CSS: body.v2nav). Lo que estaba en ese menú
 * (Rankings, Entrenamiento, Modo Profesor, Personalizar, Configuración) ahora está en la pantalla Perfil (js/profile-screen.js).
 *
 * No cambia ninguna pantalla por dentro: cada pestaña usa lo que ya existía.
 *   Sudoku  -> vuelve a la portada (si estás en el arcade, pulsa su botón de casa/atrás hasta llegar)
 *   Arcade  -> el mismo botón #openMiniGames del menú viejo
 *   Amigos  -> SudomiFriends (avisos si hay, si no la lista); el círculo rojo cuenta los avisos
 *   Perfil  -> SudomiProfileScreen.open()
 * LA BARRA SOLO SE VE en la portada y en la lista/menús del arcade. Se esconde dentro de una partida (sudoku o cualquier juego):
 * visible() lo decide mirando qué pantallas están a la vista, y un MutationObserver la actualiza cuando cambian. */
(()=>{
 const $=s=>document.querySelector(s);
 const ICON={
  sudoku:'<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M9.2 3.5v17M14.8 3.5v17M3.5 9.2h17M3.5 14.8h17"/>',
  arcade:'<path d="M7 8h10a5 5 0 0 1 4.9 6l-.6 3a2.4 2.4 0 0 1-4.2 1l-1.6-2H8.500l-1.600 2a2.400 2.400 0 0 1-4.200-1l-.6-3A5 5 0 0 1 7 8Z"/><path d="M7.500 11v3M6 12.500h3"/><circle cx="16" cy="11.500" r=".7"/><circle cx="18" cy="13.500" r=".7"/>',
  friends:'<circle cx="9" cy="8.500" r="3.200"/><path d="M2.800 19.500c.5-3.300 3-5.300 6.200-5.300s5.700 2 6.200 5.300"/><circle cx="17" cy="9.500" r="2.500"/><path d="M16.500 14.300c2.600.1 4.300 1.800 4.800 4.400"/>',
  profile:'<circle cx="12" cy="8.500" r="3.800"/><path d="M4.500 20c.7-4 3.700-6.300 7.500-6.300s6.800 2.300 7.500 6.300"/>',
  shop:'<path d="M5 8.500h14l-1 11.500H6z"/><path d="M8.500 8.500V7a3.500 3.500 0 0 1 7 0v1.500"/>'
 };
 // 0.3.38: quinta pestaña, «Tienda» (tienda de skins, js/shop.js)
 const TABS=[['sudoku','Sudoku'],['arcade','Arcade'],['shop','Tienda'],['friends','Amigos'],['profile','Perfil']];
 let bar=null,timer=0;
 const shown=el=>!!el&&!el.classList.contains('hidden');
 // dónde está el jugador: 'home', 'arcade' (lista o menú de un juego) o '' (dentro de una partida u otra pantalla: sin barra)
 const PAGES={profile:['profileScreen'],friends:['friendsScreen','friendsNotifs'],shop:['shopScreen']};   // friendsNotifs = los avisos (invitaciones), que abre la misma pestaña
 function base(){
  if(shown($('#homeScreen')))return 'home';
  if(shown($('#miniGamesScreen'))&&!shown($('#miniGameStage')))return 'arcade';
  return '';
 }
 // 0.3.7: Perfil y Amigos se abren como PÁGINA a pantalla completa con la barra a la vista (body.tab-page), no como ventana encima.
 // Solo cuando debajo está la portada o la lista del arcade; si se abren en medio de una partida siguen siendo una ventana normal.
 function where(){
  const b=base();if(!b)return '';
  for(const k in PAGES)if(PAGES[k].some(id=>shown(document.getElementById(id))))return k;
  return b;
 }
 function closePages(except){const S=window.SudomiScreen;if(!S)return;for(const k in PAGES)if(k!==except)PAGES[k].forEach(id=>{if(shown(document.getElementById(id)))S.close(id)})}
 function update(){
  if(!bar)return;
  const w=where(),vis=!!w;
  if(bar.classList.contains('hidden')===vis)bar.classList.toggle('hidden',!vis);
  if(document.body.classList.contains('has-tabbar')!==vis)document.body.classList.toggle('has-tabbar',vis);
  const page=w==='profile'||w==='friends'||w==='shop';
  if(document.body.classList.contains('tab-page')!==page)document.body.classList.toggle('tab-page',page);
  bar.querySelectorAll('[data-tab]').forEach(b=>{const t=b.dataset.tab,on=(w==='home'&&t==='sudoku')||(w===t);if(b.classList.contains('on')!==on)b.classList.toggle('on',on)});
  const n=window.SudomiFriends&&SudomiFriends.notifs?SudomiFriends.notifs().length:0,bd=bar.querySelector('.tb-badge'),txt=n?String(n):'';
  if(bd&&bd.textContent!==txt){bd.textContent=txt;bd.classList.toggle('hidden',!n)}
 }
 const later=()=>{clearTimeout(timer);timer=setTimeout(update,60)};
 function goHome(){
  // en el arcade el botón de arriba es «atrás» en el menú de un juego y «casa» en la lista: se pulsa hasta llegar a la portada
  for(let k=0;k<3&&!shown($('#homeScreen'));k++){const b=$('#gamesBackHome');if(!b)break;b.click()}
  window.scrollTo(0,0);
 }
 function go(tab){
  if(where()===tab&&(tab==='profile'||tab==='friends'||tab==='shop'))return;   // ya estás en esa página
  closePages(tab);
  if(tab==='sudoku')goHome();
  else if(tab==='arcade'){if(base()==='arcade'){const l=$('#arcLogo');if(l)l.click()}else{const b=$('#openMiniGames');if(b)b.click()}window.scrollTo(0,0)}
  else if(tab==='friends'){const F=window.SudomiFriends;if(F)(F.notifs&&F.notifs().length&&F.showNotifs?F.showNotifs:F.open)()}
  else if(tab==='profile'){if(window.SudomiProfileScreen)SudomiProfileScreen.open()}
  else if(tab==='shop'){if(window.SudomiShop)SudomiShop.open()}
  later();
 }
 function boot(){
  if(bar)return;
  document.body.classList.add('v2nav');
  bar=document.createElement('nav');bar.id='tabBar';bar.className='tab-bar hidden';bar.setAttribute('aria-label','Secciones');
  bar.innerHTML='<div class="tb-in">'+TABS.map(([k,n])=>`<button type="button" data-tab="${k}"><span class="tb-ic"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>${k==='friends'?'<em class="tb-badge hidden"></em>':''}</span><b>${n}</b></button>`).join('')+'</div>';
  document.body.appendChild(bar);
  bar.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>go(b.dataset.tab));
  const mo=new MutationObserver(later);
  ['#homeScreen','#miniGamesScreen','#miniGameStage','#gameScreen'].forEach(s=>{const e=$(s);if(e)mo.observe(e,{attributes:true,attributeFilter:['class']})});
  // las páginas Perfil y Amigos se crean al abrirlas: se envuelven open/close de SudomiScreen para enterarse
  const S=window.SudomiScreen;
  if(S&&!S._tb){S._tb=true;const o=S.open,c=S.close;S.open=function(){const r=o.apply(this,arguments);update();return r};S.close=function(){const r=c.apply(this,arguments);update();return r}}
  setInterval(update,4000);window.addEventListener('storage',later);
  update();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
 window.SudomiTabBar={update,go};
})();
