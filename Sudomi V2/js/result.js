/* SUDOMI 0.3.11 (V2, Fase 2.2) — PANTALLA DE RESULTADO única para los juegos del arcade (window.SudomiResult).
 *   SudomiResult.show(raiz, {kind, game, title, sub, detail, again, againLabel, exit, share})
 *     raiz   = el elemento .mini-game del juego (la tarjeta se pone dentro, a pantalla completa)
 *     kind   = 'win' | 'lose' | 'draw' | 'end'  -> dibujo y color
 *     again  = función del botón «Revancha» (si falta, no sale el botón: por ejemplo un invitado online)
 *     exit   = función de «Todos los juegos»
 *     share  = texto para «Compartir» (se le añade el enlace del juego)
 *   «Ver el tablero» (o tocar fuera) solo cierra la tarjeta, para mirar cómo quedó la partida.
 * La tarjeta de fin de los juegos sencillos (other-games.js, .game-end-card) usa los mismos dibujos con SudomiResult.icon(). */
(()=>{
 const ICON={
  win:'<path d="M14 8h20v8a10 10 0 0 1-20 0z" fill="#ffd54a" stroke="#b26a00" stroke-width="2" stroke-linejoin="round"/><path d="M14 10H7c0 7 3 10 8 10M34 10h7c0 7-3 10-8 10" fill="none" stroke="#b26a00" stroke-width="2.500" stroke-linecap="round"/><path d="M24 26v7M16 40h16M19 34h10v6H19z" fill="#ffd54a" stroke="#b26a00" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>',
  lose:'<circle cx="24" cy="24" r="17" fill="#e8edf5" stroke="#6a7790" stroke-width="2.500"/><circle cx="17.500" cy="20" r="2.200" fill="#6a7790"/><circle cx="30.500" cy="20" r="2.200" fill="#6a7790"/><path d="M16 33c4-5 12-5 16 0" fill="none" stroke="#6a7790" stroke-width="2.500" stroke-linecap="round"/>',
  draw:'<circle cx="16" cy="24" r="10" fill="#bcd4f7" stroke="#0b3d91" stroke-width="2.500"/><circle cx="32" cy="24" r="10" fill="#f7bcbc" stroke="#d62027" stroke-width="2.500"/><path d="M20 21h8M20 27h8" stroke="#10213b" stroke-width="2.500" stroke-linecap="round"/>',
  end:'<path d="M12 6v36" stroke="#10213b" stroke-width="3" stroke-linecap="round"/><path d="M12 8h24l-6 8 6 8H12z" fill="#d62027" stroke="#8f1016" stroke-width="2" stroke-linejoin="round"/>'
 };
 const icon=kind=>`<svg viewBox="0 0 48 48" aria-hidden="true">${ICON[kind]||ICON.end}</svg>`;
 const esc=t=>String(t==null?'':t).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 function share(text,note){
  const url=location.origin&&location.origin!=='null'?location.origin+location.pathname:'';
  if(navigator.share){navigator.share({title:'SUDOMI',text,url}).catch(()=>{});return}
  if(navigator.clipboard)navigator.clipboard.writeText(text+(url?' '+url:'')).then(()=>{if(note)note.textContent='Copiado. Pégalo en tu chat.'}).catch(()=>{});
 }
 function show(root,o){
  if(!root)return null;
  root.querySelectorAll('.res-overlay').forEach(e=>e.remove());
  const el=document.createElement('div');el.className='res-overlay';
  el.innerHTML=`<div class="res-card ${esc(o.kind||'end')}" role="dialog" aria-label="Resultado">
   <div class="res-ic">${icon(o.kind)}</div><p class="res-eyebrow">${esc(o.game||'PARTIDA TERMINADA')}</p><h3>${esc(o.title)}</h3>
   ${o.sub?`<strong>${esc(o.sub)}</strong>`:''}${o.detail?`<small>${esc(o.detail)}</small>`:''}
   <div class="res-btns">${o.again?`<button type="button" class="res-main" data-r="again">↻ ${esc(o.againLabel||'Revancha')}</button>`:''}${o.share?'<button type="button" data-r="share">📤 Compartir</button>':''}${o.exit?'<button type="button" data-r="exit">Todos los juegos</button>':''}</div>
   <button type="button" class="res-peek" data-r="close">Ver el tablero</button><p class="res-note" role="status"></p></div>`;
  el.addEventListener('click',e=>{
   const b=e.target.closest('[data-r]');
   if(!b){if(e.target===el)el.remove();return}
   const r=b.dataset.r;
   if(r==='close')el.remove();
   else if(r==='share')share(o.share,el.querySelector('.res-note'));
   else if(r==='again'){el.remove();o.again()}
   else if(r==='exit'){el.remove();o.exit()}
  });
  root.appendChild(el);return el;
 }
 window.SudomiResult={show,share,icon};
})();
