/* SUDOMI install + update helper.
 *  - registers the service worker (offline support)
 *  - shows "update available" when a new version is waiting (never reloads by itself in the middle of a game)
 *  - on iPhone/iPad (which has no install prompt) explains Share -> "Añadir a pantalla de inicio"
 *  - on Android/desktop Chrome offers a real "Instalar" button
 */
(()=>{
 const DISMISS_KEY='sudomi-install-dismissed',DAY=864e5;
 const ua=navigator.userAgent||'';
 const isiOS=/iPad|iPhone|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const standalone=()=>navigator.standalone===true||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches);
 let deferred=null,bannerEl=null;

 function banner({icon,title,text,action,onAction,onClose,onOpen}){
  if(bannerEl)bannerEl.remove();
  const el=document.createElement('div');el.className='pwa-banner';el.setAttribute('role','status');
  el.innerHTML=`<span class="pwa-ico">${icon}</span><div class="pwa-txt"><b>${title}</b><span>${text}</span></div>${action?`<button class="pwa-act" type="button">${action}</button>`:''}<button class="pwa-x" type="button" aria-label="Cerrar">✕</button>`;
  document.body.appendChild(el);bannerEl=el;
  const act=el.querySelector('.pwa-act');if(act)act.onclick=()=>{onAction&&onAction();};
  if(onOpen){el.classList.add('pwa-tap');el.querySelector('.pwa-ico').onclick=el.querySelector('.pwa-txt').onclick=onOpen}
  el.querySelector('.pwa-x').onclick=()=>{el.remove();bannerEl=null;onClose&&onClose()};
  return el;
 }

 /* ----- 0.2.16: picture guide for iPhone/iPad, opened by tapping the banner ----- */
 let guideEl=null;
 const SHARE='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3.5M8 7l4-4 4 4M7 10.5H5.8A1.8 1.8 0 0 0 4 12.3v6.9A1.8 1.8 0 0 0 5.8 21h12.4a1.8 1.8 0 0 0 1.8-1.8v-6.9a1.8 1.8 0 0 0-1.8-1.8H17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 const PLUS='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 8v8M8 12h8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
 const SHOT=(n,alt)=>`<img class="pg-shot" src="img/instalar/ios${n}.jpg" alt="${alt}" loading="lazy" decoding="async">`;
 const STEPS=[
  // 0.2.85: los cuatro primeros pasos son capturas reales del iPhone del dueño (img/instalar/): todo desenfocado menos la opción que hay que tocar
  ['Toca el botón ≡ de Safari','Está en la barra de abajo, junto a la dirección. Si en tu iPhone ya ves el botón Compartir (un cuadro con una flecha), tócalo y pasa al paso 3.',
   SHOT(1,'El botón de menú de Safari, abajo a la izquierda')],
  ['Toca «Compartir»','En el menú que se abre. En inglés dice «Share».',
   SHOT(2,'La opción Compartir del menú')],
  ['Toca «Ver más»','Es la flecha hacia abajo, al final de la fila de botones. En inglés: «View More».',
   SHOT(3,'El botón Ver más, la flecha hacia abajo')],
  ['Elige «Añadir a pantalla de inicio»','Está en la lista de abajo. En inglés: «Add to Home Screen».',
   SHOT(4,'La opción Añadir a pantalla de inicio')],
  ['Toca «Añadir»','Está arriba a la derecha. Deja el nombre SUDOMI.',
   `<div class="pg-add"><div class="pg-addbar"><span>Cancelar</span><b>Añadir a inicio</b><span class="pg-hot">Añadir</span></div><div class="pg-app"><img src="icons/icon-192.png" alt=""><span>SUDOMI</span></div></div>`],
  ['¡Listo!','Abre SUDOMI desde su icono, como cualquier otra app.',
   `<div class="pg-home"><i></i><i></i><i></i><i></i><i></i><span class="pg-hot"><img src="icons/icon-192.png" alt=""></span><i></i><i></i></div>`]
 ];
 function closeGuide(){if(guideEl){guideEl.remove();guideEl=null;document.removeEventListener('keydown',guideKey)}}
 function guideKey(e){if(e.key==='Escape')closeGuide()}
 function openGuide(){
  closeGuide();
  const el=document.createElement('div');el.className='pwa-guide';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Cómo instalar SUDOMI');
  el.innerHTML=`<div class="pg-card"><button class="pg-x" type="button" aria-label="Cerrar">✕</button><p class="pg-kicker">INSTALAR EN IPHONE</p><h2>Añade SUDOMI a tu pantalla de inicio</h2><ol>${STEPS.map(([t,d,pic],i)=>`<li class="${pic.includes('pg-shot')?'pg-photo':''}"><div class="pg-pic">${pic}</div><div class="pg-copy"><b><em>${i+1}</em>${t}</b><span>${d}</span></div></li>`).join('')}</ol><button class="pg-done" type="button">Cerrar</button></div>`;
  document.body.appendChild(el);guideEl=el;
  el.onclick=e=>{if(e.target===el)closeGuide()};
  el.querySelector('.pg-x').onclick=el.querySelector('.pg-done').onclick=closeGuide;
  document.addEventListener('keydown',guideKey);
 }
 window.SudomiInstallGuide=openGuide;
 // 0.2.51: lets the menu item "Instalar SUDOMI" (js/install.js) use the same prompt and guide
 window.SudomiInstall={standalone,ios:isiOS,canPrompt:()=>!!deferred,async prompt(){if(!deferred)return false;try{deferred.prompt();const r=await deferred.userChoice;deferred=null;return !!r&&r.outcome==='accepted'}catch(_){return false}},guide:openGuide};
 const dismissed=()=>{try{const t=+localStorage.getItem(DISMISS_KEY);return t&&Date.now()-t<14*DAY}catch(_){return false}};
 const remember=()=>{try{localStorage.setItem(DISMISS_KEY,String(Date.now()))}catch(_){}};
 const onHome=()=>{const h=document.getElementById('homeScreen');return !h||!h.classList.contains('hidden')};

 /* ----- install hints (shown only on the home screen, never during a game) ----- */
 function offerInstall(tries=0){
  if(standalone()||dismissed()||bannerEl)return;
  if(!onHome()){if(tries<6)setTimeout(()=>offerInstall(tries+1),10000);return}
  if(deferred){
   banner({icon:'📲',title:'Instala SUDOMI',text:'Ábrelo como una app, también sin internet.',action:'Instalar',
    onAction:async()=>{try{deferred.prompt();await deferred.userChoice}catch(_){}deferred=null;if(bannerEl){bannerEl.remove();bannerEl=null}},onClose:remember});
  }else if(isiOS){
   banner({icon:'📲',title:'Instala SUDOMI en tu iPhone',text:'Toca aquí para ver cómo, paso a paso.',action:'Ver guía',onAction:openGuide,onOpen:openGuide,onClose:remember});
  }
 }
 window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;setTimeout(()=>offerInstall(),4000)});
 window.addEventListener('appinstalled',()=>{deferred=null;if(bannerEl){bannerEl.remove();bannerEl=null}});
 if(isiOS)setTimeout(()=>offerInstall(),6000);

 /* ----- service worker + update flow ----- */
 if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){
  const hadController=!!navigator.serviceWorker.controller;
  let reloading=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!hadController||reloading)return;reloading=true;location.reload()});
  const offerUpdate=worker=>banner({icon:'⬆️',title:'Hay una versión nueva',text:'Actualiza cuando termines la partida.',action:'Actualizar',onAction:()=>worker.postMessage('SKIP_WAITING')});
  window.addEventListener('load',()=>{
   navigator.serviceWorker.register('sw.js').then(reg=>{
    if(reg.waiting&&navigator.serviceWorker.controller)offerUpdate(reg.waiting);
    reg.addEventListener('updatefound',()=>{
     const w=reg.installing;
     if(w)w.addEventListener('statechange',()=>{if(w.state==='installed'&&navigator.serviceWorker.controller)offerUpdate(w)});
    });
    // installed apps stay open for days: check for a new version whenever the player comes back
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')reg.update().catch(()=>{})});
   }).catch(()=>{});
  });
 }
})();
