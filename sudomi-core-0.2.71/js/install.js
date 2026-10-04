/* SUDOMI 0.2.51 — Phase 20, step 1: polishing the installable app.
 *  1. Home-screen SHORTCUTS: long-press the app icon (Android/desktop Chrome) → Jugar, Sudoku del día, Multijugador, Estadísticas. They are links
 *     of the form ?action=play|daily|multi|stats (declared in manifest.webmanifest); this file opens the matching screen.
 *  2. A menu item "Instalar SUDOMI" (hidden once the app is installed): Android/Chrome → the real install prompt; iPhone → the picture guide;
 *     other browsers → short instructions.
 *  3. Asks the browser to keep the data ("persistent storage") so the progress is not cleaned up when the phone is short of space.
 *  4. BACKUP: Personalizar → "Mis datos": export all progress (profile, XP, achievements, statistics, daily calendar, settings…) to a file and import
 *     it on another device or after reinstalling. Until accounts exist (Phase 19) this is the only way to move progress between devices.
 *  Plain reading/writing of localStorage keys that start with "sudomi-"; no game file changes. */
(()=>{
 const $=s=>document.querySelector(s);
 const SKIP=['sudomi-daily-puzzle','sudomi-install-dismissed','sudomi-race-live'];
 let persisted=null;
 const standalone=()=>navigator.standalone===true||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches);

 /* ---- 1. shortcuts ---- */
 function runAction(a){
  const click=sel=>{const b=$(sel);if(b)b.click()};
  if(a==='play')click('#playBtn');
  else if(a==='daily'){if(window.SudomiDaily)SudomiDaily.open()}
  else if(a==='multi')click('#homeMulti');
  else if(a==='stats')click('#homeStats');
 }
 function checkAction(){
  let q;try{q=new URLSearchParams(location.search)}catch(_){return}
  const a=q.get('action'),src=q.get('source');
  if(!a&&!src)return;
  try{const u=new URL(location.href);['action','source'].forEach(k=>u.searchParams.delete(k));history.replaceState(null,'',u.pathname+u.search+u.hash)}catch(_){}
  if(a)setTimeout(()=>runAction(a),700);
 }

 /* ---- 2. "Instalar SUDOMI" in the menu ---- */
 function addMenuItem(){
  const dd=$('#homeDropdown');if(!dd||$('#openInstall')||standalone())return;
  const b=document.createElement('button');b.id='openInstall';b.type='button';b.className='dropdown-option';
  b.innerHTML='<span>📲</span><strong>Instalar SUDOMI</strong><small>Como app</small>';
  b.onclick=async()=>{
   dd.classList.add('hidden');const t=$('#homeMenuBtn');if(t)t.setAttribute('aria-expanded','false');
   const I=window.SudomiInstall;
   if(I&&I.canPrompt()){const ok=await I.prompt();if(ok)b.remove();return}
   if(I&&I.ios){I.guide();return}
   showHowTo();
  };
  dd.appendChild(b);
  window.addEventListener('appinstalled',()=>b.remove());
 }
 function showHowTo(){
  const m=$('#modal');if(!m)return;
  m.innerHTML=`<div class="modal-card"><h2>📲 Instalar SUDOMI</h2><p>Abre el menú de tu navegador (<b>⋮</b> o <b>⋯</b>) y toca <b>«Instalar app»</b> o <b>«Añadir a pantalla de inicio»</b>.</p><p>Así se abre como una app, sin barra del navegador y también sin internet.</p><div class="modal-actions"><button class="primary-action" id="howtoOk">Entendido</button></div></div>`;
  m.classList.remove('hidden');$('#howtoOk').onclick=()=>m.classList.add('hidden');
 }

 /* ---- 3. persistent storage ---- */
 function keepData(){
  if(navigator.storage&&navigator.storage.persisted){navigator.storage.persisted().then(p=>{persisted=p;if(!p&&navigator.storage.persist)return navigator.storage.persist().then(r=>{persisted=r})}).catch(()=>{})}
 }

 /* ---- 4. backup ---- */
 const keys=()=>{const o=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('sudomi-')&&!SKIP.includes(k))o.push(k)}}catch(_){}return o};
 function collect(){
  const data={};keys().forEach(k=>{try{data[k]=localStorage.getItem(k)}catch(_){}});
  return {app:'SUDOMI',format:1,version:(document.title.match(/[\d.]+/)||[''])[0],date:new Date().toISOString(),data};
 }
 async function exportCopy(){
  const json=JSON.stringify(collect(),null,1),name=`sudomi-copia-${new Date().toISOString().slice(0,10)}.json`;
  try{
   const file=new File([json],name,{type:'application/json'});
   if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'Copia de SUDOMI'});return 'shared'}
  }catch(err){if(err&&err.name==='AbortError')return 'cancel'}
  try{
   const url=URL.createObjectURL(new Blob([json],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);return 'downloaded';
  }catch(_){}
  try{await navigator.clipboard.writeText(json);return 'copied'}catch(_){return 'failed'}
 }
 function parse(text){
  let d;try{d=JSON.parse(text)}catch(_){return {error:'El archivo no es una copia de SUDOMI.'}}
  if(!d||d.app!=='SUDOMI'||!d.data||typeof d.data!=='object')return {error:'El archivo no es una copia de SUDOMI.'}
  const entries=Object.entries(d.data).filter(([k,v])=>k.startsWith('sudomi-')&&!SKIP.includes(k)&&typeof v==='string');
  if(!entries.length)return {error:'La copia está vacía.'};
  return {entries,date:d.date,version:d.version};
 }
 function importCopy(file){
  return new Promise(resolve=>{
   const rd=new FileReader();
   rd.onload=()=>{
    const p=parse(String(rd.result||''));
    if(p.error)return resolve({ok:false,message:p.error});
    const m=$('#modal');
    m.innerHTML=`<div class="modal-card"><h2>📥 Importar copia</h2><p>La copia tiene <b>${p.entries.length}</b> datos${p.date?` (del ${new Date(p.date).toLocaleDateString((window.SudomiI18n?SudomiI18n.locale():'es-DO'),{day:'numeric',month:'long',year:'numeric'})})`:''}.</p><p><b>Reemplazará</b> tu progreso actual en este dispositivo.</p><div class="modal-actions"><button class="primary-action" id="impGo">Reemplazar y abrir</button><button class="secondary-action" id="impNo">Cancelar</button></div></div>`;
    m.classList.remove('hidden');
    $('#impNo').onclick=()=>{m.classList.add('hidden');resolve({ok:false,message:''})};
    $('#impGo').onclick=()=>{
     try{keys().forEach(k=>localStorage.removeItem(k));p.entries.forEach(([k,v])=>localStorage.setItem(k,v))}catch(_){}
     location.href=location.pathname;resolve({ok:true});
    };
   };
   rd.onerror=()=>resolve({ok:false,message:'No se pudo leer el archivo.'});
   rd.readAsText(file);
  });
 }
 async function checkUpdate(){
  try{const reg=await navigator.serviceWorker.getRegistration();if(!reg)return 'none';await reg.update();return reg.waiting?'waiting':'latest'}catch(_){return 'none'}
 }
 const info=()=>({version:(document.title.match(/[\d.]+/)||['?'])[0],offline:!!(navigator.serviceWorker&&navigator.serviceWorker.controller),persistent:persisted,installed:standalone(),items:keys().length});

 function boot(){addMenuItem();keepData();checkAction()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
 window.SudomiBackup={export:exportCopy,import:importCopy,info,checkUpdate};
})();
