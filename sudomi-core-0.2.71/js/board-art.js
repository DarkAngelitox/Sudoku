/* SUDOMI 0.2.68 — graphics for Ajedrez and Damas (window.SudomiBoardArt). Pure drawing, no game logic:
 *   chess(p)   → an SVG chess piece (p = 'K','Q','R','B','N','P' for white, lower case for black), same look on every phone (no font glyphs)
 *   crown()    → the crown that marks a king in Damas
 *   moved(g,arr) → the squares that changed since the previous drawing of the same game (to highlight the last move)
 * The SVG gradients live once in the page (#baDefs); colours and wood textures are in css/main.css ("0.2.68"). */
(()=>{
 const defs=`<svg id="baDefs" width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <linearGradient id="baW" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#eef1f6"/><stop offset="1" stop-color="#b9c2d0"/></linearGradient>
  <linearGradient id="baB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6b7384"/><stop offset=".5" stop-color="#2c3240"/><stop offset="1" stop-color="#0f1219"/></linearGradient>
  <radialGradient id="baShine" cx=".3" cy=".25" r=".7"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
 </defs></svg>`;
 function mount(){if(!document.getElementById('baDefs')&&document.body)document.body.insertAdjacentHTML('afterbegin',defs)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
 // shapes drawn on a 45×45 board square, base at the bottom
 const base='<rect x="10.5" y="34" width="24" height="4.6" rx="2.3"/>';
 const SHAPES={
  p:`<circle cx="22.5" cy="12.6" r="5.3"/><rect x="16.2" y="18" width="12.6" height="3.2" rx="1.6"/><path d="M18.6 21C17.6 27 16.2 30.4 14.4 34h16.2c-1.8-3.6-3.2-7-4.2-13z"/>${base}`,
  r:`<path d="M12.2 19V10.8h4.4v3.6h3V10.8h5.8v3.6h3v-3.6h4.4V19z"/><path d="M14.4 19.4h16.2l-1.6 4v7.6l2 3H14l2-3v-7.6z"/>${base}`,
  b:`<circle cx="22.5" cy="6.4" r="2.4"/><path d="M22.5 8.4c5.7 4.6 7 9.8 4.4 14.4 1.6 1.5 2.2 4.4 1.4 7.2H16.7c-.8-2.8-.2-5.7 1.4-7.2-2.6-4.6-1.3-9.8 4.4-14.4z"/><rect x="14" y="29.8" width="17" height="3.4" rx="1.7"/>${base}`,
  n:`<path d="M12.4 35c.2-5 1.4-8.8 4.8-12.2-1.8-.2-3.4.6-4.4 2.2-.4-2.2.8-4.2 2.8-6.2 1.6-1.6 2.2-3 2.2-5l-.4-4.4 3.8 2.4c3.6-3.4 9.4-1.6 11.4 4.4 1.8 5.6 1.2 12.2.4 18.8z"/><path d="M13.2 24.8c1.2-.8 2.4-1.2 3.6-1" fill="none" stroke-width="1.2"/>`,
  q:`<path d="M10.2 14.2l4.6 14 2.2-12 3.6 11.4 1.9-13.2 1.9 13.2 3.6-11.4 2.2 12 4.6-14-2.2 19.2H12.4z"/><circle cx="10.2" cy="12.8" r="2.1"/><circle cx="16.8" cy="14.2" r="2.1"/><circle cx="22.5" cy="11.2" r="2.1"/><circle cx="28.2" cy="14.2" r="2.1"/><circle cx="34.8" cy="12.8" r="2.1"/>${base}`,
  k:`<rect x="20.9" y="3.4" width="3.2" height="11.2" rx="1.2"/><rect x="17.2" y="7" width="10.6" height="3.2" rx="1.2"/><rect x="16.2" y="17" width="12.6" height="3.6" rx="1.8"/><path d="M15.2 34c0-6.6 1.4-11.2 4-13.6h6.6c2.6 2.4 4 7 4 13.6z"/>${base}`
 };
 function chess(p){
  const white=p===p.toUpperCase(),k=p.toLowerCase(),shape=SHAPES[k];
  if(!shape)return '';
  return `<svg class="cp ${white?'w':'b'} cp-${k}" viewBox="0 0 45 45" aria-hidden="true"><g class="cp-body" fill="url(#${white?'baW':'baB'})" stroke="${white?'#2f3644':'#05070b'}" stroke-width="1.5" stroke-linejoin="round">${shape}</g><g class="cp-shine" fill="url(#baShine)" opacity="${white?'.5':'.28'}">${shape}</g>${k==='n'?`<circle cx="23.2" cy="15.6" r="1.25" fill="${white?'#2f3644':'#e9edf5'}"/><path d="M17.8 11.2c1.4 1.2 2.6 3 3 5" fill="none" stroke="${white?'#2f3644':'#e9edf5'}" stroke-width="1.1" stroke-linecap="round"/>`:''}</svg>`;
 }
 function crown(){return '<svg class="crown" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8l4.2 4 4.8-7 4.8 7L21 8l-1.8 10.5H4.8z" fill="#ffd54a" stroke="#8a5a00" stroke-width="1.3" stroke-linejoin="round"/><circle cx="3" cy="7.4" r="1.6" fill="#ffd54a" stroke="#8a5a00" stroke-width="1"/><circle cx="12" cy="4.4" r="1.6" fill="#ffd54a" stroke="#8a5a00" stroke-width="1"/><circle cx="21" cy="7.4" r="1.6" fill="#ffd54a" stroke="#8a5a00" stroke-width="1"/></svg>'}
 const seen=new WeakMap();
 function moved(g,arr){
  const key=arr.join('|'),s=seen.get(g);
  if(!s){seen.set(g,{key,last:new Set(),arr:arr.slice()});return new Set()}
  if(s.key!==key){const ch=new Set();arr.forEach((v,i)=>{if((v||'')!==(s.arr[i]||''))ch.add(i)});s.key=key;s.arr=arr.slice();s.last=ch}
  return s.last;
 }
 window.SudomiBoardArt={chess,crown,moved};
})();
