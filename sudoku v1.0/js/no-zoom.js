/* SUDOMI 0.2.77 — sin zoom en la portada, los menús y los juegos (solo el Sudoku se puede ampliar con los dedos).
 *  · CSS (css/main.css): html.no-zoom { touch-action: pan-x pan-y } quita el zoom de pellizco y el de doble toque en Android y en iPhone reciente,
 *    y los campos de texto usan 16 px para que el iPhone no se acerque solo al escribir.
 *  · Aquí: Safari de iPhone ignora el aviso del viewport, así que se frenan sus gestos de pellizco (gesturestart…) y el pellizco de dos dedos;
 *    en computadora se frena Ctrl + rueda del ratón.
 *  · La clase "no-zoom" se pone en <html> mientras NO esté a la vista la pantalla del Sudoku (#gameScreen). No toca js/app.js. */
(() => {
  const root = document.documentElement;
  const sudoku = () => { const g = document.getElementById('gameScreen'); return !!g && !g.classList.contains('hidden') };
  const sync = () => root.classList.toggle('no-zoom', !sudoku());
  root.classList.add('no-zoom');                       // desde el primer momento (la portada es lo primero que se ve)
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(ev => document.addEventListener(ev, e => { if (!sudoku()) e.preventDefault() }, { passive: false }));
  document.addEventListener('touchmove', e => { if (!sudoku() && e.touches && e.touches.length > 1) e.preventDefault() }, { passive: false });
  document.addEventListener('wheel', e => { if (e.ctrlKey && !sudoku()) e.preventDefault() }, { passive: false });
  const watch = () => {
    sync();
    const g = document.getElementById('gameScreen');
    if (g) new MutationObserver(sync).observe(g, { attributes: true, attributeFilter: ['class'] });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
  window.SudomiNoZoom = { sync };
})();
