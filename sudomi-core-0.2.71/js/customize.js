/* SUDOMI 0.2.32 — Personalizar: light/dark mode, accent colour and size of the board numbers.
 * Loaded in <head> (like theme.js) so the saved look is applied before the page is drawn.
 * It only sets html[data-accent] / html[data-digits]; the colours and sizes live at the end of css/main.css. */
(()=>{
 const KEY='sudomi-custom',root=document.documentElement;
 const ACCENTS=[
  ['dominicano','Dominicano','#0b3d91','#d62027'],['oceano','Océano','#0a5c8f','#0e9ad0'],['esmeralda','Esmeralda','#0d6b4f','#16a077'],
  ['atardecer','Atardecer','#a8341a','#e8812a'],['morado','Morado','#4b2a9a','#7a4fd6']
 ];
 const DIGITS=[['normal','Normal'],['grande','Grande']];
 const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY))||{};return {accent:ACCENTS.some(a=>a[0]===v.accent)?v.accent:'dominicano',digits:DIGITS.some(d=>d[0]===v.digits)?v.digits:'normal'}}catch(_){return {accent:'dominicano',digits:'normal'}}};
 let cfg=read();
 function apply(){
  root.setAttribute('data-accent',cfg.accent);root.setAttribute('data-digits',cfg.digits);
  const a=ACCENTS.find(x=>x[0]===cfg.accent),meta=document.querySelector('meta[name="theme-color"]');
  if(meta&&!(window.SudomiTheme&&SudomiTheme.current==='dark'))meta.setAttribute('content',a[2]);
 }
 function save(){try{localStorage.setItem(KEY,JSON.stringify(cfg))}catch(_){}apply()}
 function open(){
  const m=document.querySelector('#modal');if(!m)return;
  const dark=()=>window.SudomiTheme&&SudomiTheme.current==='dark',skin=window.SudomiSkins?SudomiSkins.current:'';
  const seg=(name,items,cur)=>`<div class="cust-seg" role="group" data-seg="${name}">${items.map(([v,l])=>`<button type="button" data-v="${v}" class="${v===cur?'on':''}" aria-pressed="${v===cur}">${l}</button>`).join('')}</div>`;
  m.innerHTML=`<div class="modal-card difficulty-dialog cust-dialog"><button class="picker-close" id="custClose" aria-label="Cerrar">×</button><p class="picker-kicker">HAZLO TUYO</p><h2>Personalizar</h2><p class="picker-description">Tus cambios se guardan en este dispositivo.</p>
  <div class="cust-group"><h3>Estilo del juego</h3><div class="cust-skins" role="group">${[{id:'',name:'Clásico',icon:'🇩🇴',color:'#0b3d91'},...(window.SudomiSkins?SudomiSkins.list:[])].map(s=>`<button type="button" data-skin="${s.id}" class="${s.id===skin?'on':''}" aria-pressed="${s.id===skin}" style="--sk:${s.color}"><span>${s.icon}</span><b>${s.name}</b></button>`).join('')}</div><p class="cust-sub">Cambia colores, iconos y textos de todo el juego.</p></div>
  <div class="cust-group"><h3>Tema</h3>${seg('theme',[['light','☀️ Claro'],['dark','🌙 Oscuro']],dark()?'dark':'light')}</div>
  ${skin?'':`<div class="cust-group"><h3>Color</h3><div class="cust-swatches" role="group" data-seg="accent">${ACCENTS.map(([v,l,c1,c2])=>`<button type="button" data-v="${v}" class="${v===cfg.accent?'on':''}" aria-pressed="${v===cfg.accent}" aria-label="${l}"><i style="background:linear-gradient(135deg,${c1} 55%,${c2} 55%)"></i><span>${l}</span></button>`).join('')}</div></div>`}
  <div class="cust-group"><h3>Tamaño de los números</h3>${seg('digits',DIGITS,cfg.digits)}</div>
  ${window.SudomiSound?`<div class="cust-group"><h3>Sonido y vibración</h3>${seg('sound',[['on','🔊 Sonido'],['off','🔇 Silencio']],SudomiSound.cfg.sound?'on':'off')}<div style="height:6px"></div>${seg('vibe',[['on','📳 Vibración'],['off','▫️ Sin vibrar']],SudomiSound.cfg.vibe?'on':'off')}<label class="cust-vol"><span>Volumen</span><input type="range" id="custVol" min="0" max="100" value="${Math.round(SudomiSound.cfg.vol*100)}"><button type="button" id="custTest">Probar</button></label><p class="cust-sub">${SudomiSound.info.ios?'En iPhone: el sonido suena aunque el modo silencio esté activado (sube el volumen del teléfono). La vibración necesita iOS 18 o más reciente.':SudomiSound.info.vibration?'La vibración funciona en teléfonos Android; en la computadora no vibra.':'Este dispositivo no permite vibración.'}</p></div>`:''}
  ${window.SudomiXP?`<div class="cust-group"><h3>Dificultades por nivel</h3>${seg('lock',[['on','🔒 Se desbloquean'],['off','🔓 Todas abiertas']],SudomiXP.lock?'on':'off')}<p class="cust-sub">Con «Se desbloquean», las dificultades altas se abren al subir de nivel.</p></div>`:''}
  ${window.SudomiBackup?(()=>{const i=SudomiBackup.info();return `<div class="cust-group"><h3>Mis datos y la app</h3><ul class="cust-info"><li>📦 Versión <b>${i.version}</b>${i.installed?' · instalada como app ✓':''}</li><li>${i.offline?'✅ Listo para jugar sin internet':'⏳ Preparando el modo sin internet (abre la app una vez con conexión)'}</li><li>${i.persistent?'🔒 Datos protegidos en este dispositivo':'💾 Tu progreso se guarda en este dispositivo'}</li></ul><div class="cust-data"><button type="button" id="custExport">📤 Exportar copia</button><button type="button" id="custImport">📥 Importar copia</button><button type="button" id="custUpdate">🔄 Buscar actualización</button></div><input type="file" id="custFile" accept=".json,application/json" hidden><p class="cust-sub" id="custDataMsg">Guarda una copia antes de cambiar de teléfono o borrar los datos del navegador.</p></div>`})():''}
  <button class="picker-back cust-reset" id="custReset">Volver a los colores originales</button><button class="picker-back" id="custDone">Listo</button></div>`;
  m.classList.remove('hidden');
  const close=()=>m.classList.add('hidden');
  m.querySelector('#custClose').onclick=m.querySelector('#custDone').onclick=close;
  m.querySelector('#custReset').onclick=()=>{cfg={accent:'dominicano',digits:'normal'};save();if(window.SudomiSkins&&SudomiSkins.current)SudomiSkins.set('',{keepMode:true});open()};
  const say=t=>{const e=m.querySelector('#custDataMsg');if(e)e.textContent=t};
  const bx=m.querySelector('#custExport'),bi=m.querySelector('#custImport'),bu=m.querySelector('#custUpdate'),bf=m.querySelector('#custFile');
  if(bx)bx.onclick=async()=>{const r=await SudomiBackup.export();say(r==='shared'?'Copia compartida. Guárdala en Archivos o envíatela.':r==='downloaded'?'Copia descargada (revisa tus descargas).':r==='copied'?'La copia se copió al portapapeles.':r==='cancel'?'':'No se pudo exportar la copia.')};
  if(bi&&bf){bi.onclick=()=>bf.click();bf.onchange=async()=>{const f=bf.files&&bf.files[0];if(!f)return;const r=await SudomiBackup.import(f);if(r&&r.message)say(r.message);bf.value=''}}
  if(bu)bu.onclick=async()=>{say('Buscando…');const r=await SudomiBackup.checkUpdate();say(r==='waiting'?'Hay una versión nueva: toca «Actualizar» en el aviso.':r==='latest'?'Ya tienes la última versión.':'No se pudo comprobar (¿sin internet?).')};
  const vol=m.querySelector('#custVol'),tst=m.querySelector('#custTest');
  if(vol)vol.oninput=()=>SudomiSound.set({vol:vol.value/100});if(vol)vol.onchange=()=>SudomiSound.test();if(tst)tst.onclick=()=>SudomiSound.test();
  m.querySelectorAll('[data-skin]').forEach(b=>b.onclick=()=>{if(window.SudomiSkins){SudomiSkins.set(b.dataset.skin);open()}});
  m.querySelectorAll('[data-seg] button').forEach(b=>b.onclick=()=>{
   const which=b.parentNode.dataset.seg,v=b.dataset.v;
   if(which==='theme'){if((v==='dark')!==dark()&&window.SudomiTheme)SudomiTheme.toggle()}
   else if(which==='sound'){if(window.SudomiSound){SudomiSound.set({sound:v==='on'});if(v==='on')SudomiSound.test()}}
   else if(which==='vibe'){if(window.SudomiSound){SudomiSound.set({vibe:v==='on'});if(v==='on'&&navigator.vibrate)navigator.vibrate(40)}}
   else if(which==='lock'){if(window.SudomiXP)SudomiXP.setLock(v==='on')}
   else{cfg[which]=v;save()}
   b.parentNode.querySelectorAll('button').forEach(x=>{const on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-pressed',on)});
  });
 }
 apply();
 function mount(){const b=document.querySelector('#openCustomize');if(b)b.onclick=()=>{const menu=document.querySelector('#homeDropdown');if(menu)menu.classList.add('hidden');const t=document.querySelector('#homeMenuBtn');if(t)t.setAttribute('aria-expanded','false');open()}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount);else mount();
 window.SudomiCustomize={open,get current(){return {...cfg}}};
})();
