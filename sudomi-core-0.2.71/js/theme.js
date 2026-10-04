/* SUDOMI 0.2.19 — light / dark mode.
 * Loaded in <head> so the saved choice is applied before the page is drawn.
 * The colours themselves live at the end of css/main.css under html[data-theme="dark"].
 * It only adds one button to each top bar; it never touches the sudoku logic.
 */
(()=>{
 const KEY='sudomi-theme',root=document.documentElement;
 const read=()=>{try{return localStorage.getItem(KEY)==='dark'?'dark':'light'}catch(_){return 'light'}};
 let theme=read();
 function apply(){
  root.setAttribute('data-theme',theme);
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',theme==='dark'?'#0b1424':'#0b3d91');
  document.querySelectorAll('.theme-toggle').forEach(b=>{b.textContent=theme==='dark'?'☀️':'🌙';const label=theme==='dark'?'Cambiar a modo claro':'Cambiar a modo oscuro';b.title=label;b.setAttribute('aria-label',label)});
 }
 function toggle(){theme=theme==='dark'?'light':'dark';try{localStorage.setItem(KEY,theme)}catch(_){}apply()}
 function button(extra){const b=document.createElement('button');b.type='button';b.className='theme-toggle'+(extra?' '+extra:'');b.onclick=e=>{e.stopPropagation();toggle()};return b}
 function mount(){
  const chip=document.querySelector('.home-topbar .dom-chip');if(chip)chip.parentNode.insertBefore(button(),chip);
  const actions=document.querySelector('#gameScreen .top-actions');if(actions)actions.appendChild(button('icon-btn'));
  const mark=document.querySelector('.mini-games-header .games-brand-mark');if(mark)mark.parentNode.insertBefore(button(),mark);
  apply();
 }
 apply();
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
 window.SudomiTheme={get current(){return theme},toggle};
})();
