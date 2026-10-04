/* SUDOMI 0.2.53 — accessibility helper (does not touch js/app.js): gives every board cell a spoken name
 * ("Fila 3, columna 5, vacía" / "…, número 7") so screen readers (VoiceOver, TalkBack) can read the board.
 * Cells are re-labelled when the board is redrawn; only changed labels are written (no observer loop: attributes are not observed). */
(()=>{
 function label(el){
  const i=+el.dataset.i;if(!(i>=0))return;
  const t=(el.textContent||'').trim().replace(/\s+/g,' '),r=Math.floor(i/9)+1,c=i%9+1;
  const txt=`Fila ${r}, columna ${c}, ${/^[1-9]$/.test(t)?'número '+t:t?'notas '+t:'vacía'}`;
  if(el.getAttribute('aria-label')!==txt)el.setAttribute('aria-label',txt);
 }
 function all(){document.querySelectorAll('#board .cell, .cell[data-i]').forEach(label)}
 function boot(){
  const b=document.getElementById('board');if(!b)return;
  all();let q=0;
  new MutationObserver(()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;all()})}).observe(b,{childList:true,subtree:true,characterData:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
