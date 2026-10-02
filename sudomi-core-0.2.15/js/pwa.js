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

 function banner({icon,title,text,action,onAction,onClose}){
  if(bannerEl)bannerEl.remove();
  const el=document.createElement('div');el.className='pwa-banner';el.setAttribute('role','status');
  el.innerHTML=`<span class="pwa-ico">${icon}</span><div class="pwa-txt"><b>${title}</b><span>${text}</span></div>${action?`<button class="pwa-act" type="button">${action}</button>`:''}<button class="pwa-x" type="button" aria-label="Cerrar">✕</button>`;
  document.body.appendChild(el);bannerEl=el;
  const act=el.querySelector('.pwa-act');if(act)act.onclick=()=>{onAction&&onAction();};
  el.querySelector('.pwa-x').onclick=()=>{el.remove();bannerEl=null;onClose&&onClose()};
  return el;
 }
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
   banner({icon:'📲',title:'Instala SUDOMI en tu iPhone',text:'En Safari toca Compartir ⬆︎ y elige «Añadir a pantalla de inicio».',onClose:remember});
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
