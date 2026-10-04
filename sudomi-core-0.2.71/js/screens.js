/* SUDOMI 0.2.53 — a tiny helper to build full-screen panels (Rankings, Perfil, Configuración, Entrenamiento, Profesor…).
 *   const s = SudomiScreen.open('myScreen', '🏆 Título', (body, api) => { body.innerHTML = '…'; … })
 *   api.redraw() runs the render function again; api.close() closes. Escape and a tap on the dark backdrop close it too.
 * It reuses the overlay look of the achievements screen (.tut / .ach-card). */
(()=>{
 const reg={};
 function open(id,title,render){
  let el=document.getElementById(id);
  if(!el){
   el=document.createElement('div');el.id=id;el.className='tut ach-screen hidden';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
   el.innerHTML='<div class="tut-card ach-card"><header><h2 class="tut-title ach-title"></h2><button type="button" class="tut-x" aria-label="Cerrar">✕</button></header><div class="tut-body ach-body"></div></div>';
   document.body.appendChild(el);
   el.querySelector('.tut-x').onclick=()=>close(id);
   el.addEventListener('click',e=>{if(e.target===el)close(id)});
   document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!el.classList.contains('hidden'))close(id)});
  }
  el.querySelector('.ach-title').textContent=title;
  const body=el.querySelector('.ach-body'),api={body,el,close:()=>close(id),redraw:()=>{render(body,api)},setTitle:t=>{el.querySelector('.ach-title').textContent=t}};
  reg[id]=api;el.classList.remove('hidden');document.body.classList.add('tut-open');
  render(body,api);body.scrollTop=0;
  return api;
 }
 function close(id){
  const el=document.getElementById(id);if(el)el.classList.add('hidden');
  const open=[...document.querySelectorAll('.ach-screen,.tut')].some(x=>!x.classList.contains('hidden'));
  if(!open)document.body.classList.remove('tut-open');
  if(reg[id]&&reg[id].onClose)reg[id].onClose();
 }
 window.SudomiScreen={open,close};
})();
