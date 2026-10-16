/* SUDOMI 0.3.99 — RADIO DE BACHATA en la mesa de Dominó (pedido del dueño). window.SudomiRadio = {songs, open, stop}.
 * 0.3.99 (dueño): fuera las canciones que tocaba el juego. Ahora suenan TRES fuentes:
 *   1) LAS CANCIONES DE SUDOMI: archivos MP3 de la carpeta audio/ (lista FILES, abajo). price 0 = gratis; con precio salen en la tienda
 *      (js/shop.js, Dominó → Radio de bachata) y, con «🎲 Al azar» de la tienda, la radio va saltando entre las que tengas puestas.
 *      Para añadir otra: copia el MP3 en audio/ y añade una línea a FILES: {id:'nombre',name:'Título',src:'audio/archivo.mp3',price:200}.
 *   2) MI MÚSICA: eliges canciones del teléfono (no se suben a ningún lado; suenan mientras la app esté abierta).
 *   3) YOUTUBE O SPOTIFY: pegas un enlace (canción, video, álbum o lista) y sale su reproductor dentro de la radio. Spotify solo deja
 *      oír un trozo si no has entrado a tu cuenta de Spotify en ese navegador. (Los dos dominios están permitidos en el CSP de index.html.)
 * El botón 📻 sale solo con una mesa de dominó a la vista (la clásica o la Mesa 3D) y la música se apaga al salir de la mesa.
 * Se recuerda si la dejaste encendida, el volumen, la última canción y el último enlace (localStorage 'sudomi-radio'). */
(()=>{
 const FILES=[
  {id:'melodia',name:'Melodía de bachata',src:'audio/melodia_bachata_original.mp3',price:0},
  {id:'calysol',name:'Cal y Sol',src:'audio/Cal_y_Sol_FULL_SONG.mp3',price:150},
  {id:'missing',name:'Missing Number',src:'audio/Missing_Number_FULL_SONG.mp3',price:200}
 ];
 const KEY='sudomi-radio';
 const cfgRead=()=>{try{const v=JSON.parse(localStorage.getItem(KEY))||{};return {on:!!v.on,vol:typeof v.vol==='number'?v.vol:.6,song:v.song||'melodia',link:typeof v.link==='string'?v.link:''}}catch(_){return {on:false,vol:.6,song:'melodia',link:''}}};
 let cfg=cfgRead();const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(cfg))}catch(_){}};
 const all=()=>FILES.slice();
 const owned=s=>!s.price||!!(window.SudomiShopSkins&&SudomiShopSkins.owns('radio-'+s.id));
 const mixIds=()=>{try{return (window.SudomiShopSkins&&SudomiShopSkins.mix('radio')||[]).map(id=>id.replace(/^radio-/,''))}catch(_){return []}};
 const esc=t=>String(t==null?'':t).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

 /* ================= lo que suena ================= */
 let audioEl=null,now=null,mine=[],mineAt=0,ext=null;   // now = {kind:'file'|'mine'|'ext', name}
 function stopAudio(){if(audioEl){try{audioEl.pause();audioEl.src=''}catch(_){}audioEl=null}}
 function stopExt(){if(ext){ext.remove();ext=null}}
 function stopAll(){stopAudio();stopExt();now=null;paint()}
 function playUrl(src,name,kind,onEnd){
  stopAudio();stopExt();
  audioEl=new Audio(src);audioEl.volume=cfg.vol;audioEl.onended=onEnd;audioEl.play().catch(()=>{});
  now={kind,name};paint();
 }
 // una canción de SUDOMI; al terminar sigue otra (de la mezcla de la tienda, o la siguiente que tengas)
 function playSong(id){
  const L=all().filter(owned),s=L.find(x=>x.id===id)||L[0];if(!s)return;
  cfg.song=s.id;cfg.on=true;save();
  playUrl(s.src,s.name,'file',()=>playSong(nextId(s.id)));
 }
 function nextId(cur){const m=mixIds().filter(id=>id!==cur&&all().some(s=>s.id===id&&owned(s)));if(m.length)return m[Math.floor(Math.random()*m.length)];
  const L=all().filter(owned),i=L.findIndex(s=>s.id===cur);return (L[(i+1)%L.length]||L[0]).id}
 // mi música: archivos del teléfono, uno detrás de otro
 function playMine(k){if(!mine.length)return;mineAt=(k+mine.length)%mine.length;const f=mine[mineAt];playUrl(f.url,f.name,'mine',()=>playMine(mineAt+1))}
 function pickMine(){
  const inp=document.createElement('input');inp.type='file';inp.accept='audio/*';inp.multiple=true;
  inp.onchange=()=>{const fs=[...inp.files].filter(f=>/^audio\//.test(f.type)||/\.(mp3|m4a|aac|ogg|wav|flac)$/i.test(f.name));if(!fs.length)return;
   mine.forEach(m=>{try{URL.revokeObjectURL(m.url)}catch(_){}});mine=fs.map(f=>({name:f.name.replace(/\.[^.]+$/,''),url:URL.createObjectURL(f)}));playMine(0)};
  inp.click();
 }
 // YouTube o Spotify: el enlace se convierte en la dirección de su reproductor
 function embedOf(raw){
  let u;try{u=new URL(String(raw).trim())}catch(_){return null}
  const h=u.hostname.replace(/^www\.|^m\./,'');
  if(h==='youtu.be'){const id=u.pathname.slice(1).split('/')[0];return /^[\w-]{6,}$/.test(id)?{src:`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`,name:'YouTube',tall:0}:null}
  if(h==='youtube.com'||h==='music.youtube.com'){
   const list=u.searchParams.get('list'),v=u.searchParams.get('v')||(u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/)||[])[1];
   if(v&&/^[\w-]{6,}$/.test(v))return {src:`https://www.youtube-nocookie.com/embed/${v}?autoplay=1${list&&/^[\w-]+$/.test(list)?'&list='+list:''}`,name:'YouTube',tall:0};
   if(list&&/^[\w-]+$/.test(list))return {src:`https://www.youtube-nocookie.com/embed/videoseries?list=${list}&autoplay=1`,name:'YouTube',tall:0};
   return null}
  if(h==='open.spotify.com'){const m=u.pathname.match(/^\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/);return m?{src:`https://open.spotify.com/embed/${m[1]}/${m[2]}`,name:'Spotify',tall:m[1]!=='track'&&m[1]!=='episode'?1:0}:null}
  return null;
 }
 function playLink(raw){
  const e=embedOf(raw);if(!e)return false;
  stopAudio();stopExt();cfg.link=String(raw).trim();cfg.on=true;save();
  ext=document.createElement('div');ext.className='rd-ext'+(e.tall?' tall':'');
  ext.innerHTML=`<iframe src="${esc(e.src)}" title="Reproductor de ${e.name}" allow="autoplay; encrypted-media; clipboard-write; fullscreen; picture-in-picture" loading="eager" referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  document.body.appendChild(ext);now={kind:'ext',name:e.name};placeExt();paint();return true;
 }
 function setVol(v){cfg.vol=v;save();if(audioEl)audioEl.volume=v}

 /* ================= el botón y el panel ================= */
 let btn=null,panel=null,tab='sudomi';
 const tableOn=()=>{const st=document.getElementById('miniGameStage'),sc=document.getElementById('miniGamesScreen');return !!st&&!!sc&&!sc.classList.contains('hidden')&&!st.classList.contains('hidden')&&!!st.querySelector('.dm-seat,.d3-stage')};
 // el reproductor de YouTube/Spotify vive fuera del panel (el panel se redibuja): se pone encima del hueco del panel, o fuera de la vista si está cerrado
 function placeExt(){if(!ext)return;const slot=panel&&!panel.hidden&&panel.querySelector('.rd-slot');if(slot){const r=slot.getBoundingClientRect();Object.assign(ext.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px'});ext.classList.remove('off')}else ext.classList.add('off')}
 function paint(){
  if(btn)btn.classList.toggle('on',!!now);
  if(!panel||panel.hidden){placeExt();return}
  const L=all();
  const tabs=[['sudomi','Canciones'],['mine','Mi música'],['link','YouTube / Spotify']];
  let body='';
  if(tab==='sudomi')body=`<ul class="rd-list">${L.map(s=>`<li class="${owned(s)?'':'lock'}${now&&now.kind==='file'&&cfg.song===s.id?' on':''}"><button type="button" data-s="${s.id}" ${owned(s)?'':'disabled'}>${now&&now.kind==='file'&&cfg.song===s.id?'🎶':owned(s)?'▶':'🔒'} ${esc(s.name)}</button><small>${owned(s)?(s.price?'comprada':'gratis'):s.price+' monedas'}</small></li>`).join('')}</ul><button type="button" class="rd-shop">🛍️ Más canciones en la tienda</button>`;
  else if(tab==='mine')body=`<p class="rd-note">Elige canciones de tu teléfono. Suenan aquí mientras la app esté abierta; no se suben a ningún lado.</p><button type="button" class="rd-pick">🎵 Elegir canciones</button>${mine.length?`<ul class="rd-list">${mine.map((m,k)=>`<li class="${now&&now.kind==='mine'&&k===mineAt?'on':''}"><button type="button" data-m="${k}">${now&&now.kind==='mine'&&k===mineAt?'🎶':'▶'} ${esc(m.name)}</button></li>`).join('')}</ul>`:''}`;
  else body=`<p class="rd-note">Pega el enlace de una canción, video, álbum o lista de YouTube o de Spotify.</p><div class="rd-linkrow"><input type="url" class="rd-link" placeholder="https://…" value="${esc(cfg.link)}" autocomplete="off"><button type="button" class="rd-go">▶ Poner</button></div><p class="rd-err" hidden>Ese enlace no es de YouTube ni de Spotify.</p><p class="rd-note small">Spotify solo deja oír un trozo si no has entrado a tu cuenta de Spotify en este navegador. El volumen lo lleva su propio reproductor.</p><div class="rd-slot${ext&&ext.classList.contains('tall')?' tall':''}"></div>`;
  panel.innerHTML=`<div class="rd-head"><b>📻 Radio Bachata</b><button type="button" class="rd-x" aria-label="Cerrar">✕</button></div>
   <p class="rd-now">${now?`Sonando: <b>${esc(now.name)}</b>`:'Apagada'}</p>
   <div class="rd-ctl"><button type="button" class="rd-play">${now?'⏸ Apagar':'▶ Encender'}</button><button type="button" class="rd-next" ${now&&now.kind!=='ext'?'':'disabled'}>⏭ Otra</button></div>
   <label class="rd-vol">🔈<input type="range" min="0" max="1" step=".05" value="${cfg.vol}" aria-label="Volumen de la radio">🔊</label>
   <div class="rd-tabs" role="tablist">${tabs.map(([k,n])=>`<button type="button" role="tab" aria-selected="${tab===k}" class="${tab===k?'on':''}" data-t="${k}">${n}</button>`).join('')}</div>${body}`;
  const $=s=>panel.querySelector(s);
  $('.rd-x').onclick=()=>{panel.hidden=true;placeExt()};
  $('.rd-play').onclick=()=>{if(now){stopAll();cfg.on=false;save()}else if(tab==='link'&&cfg.link&&playLink(cfg.link));else if(tab==='mine'&&mine.length)playMine(mineAt);else playSong(mixIds()[0]||cfg.song)};
  $('.rd-next').onclick=()=>{if(!now)return;if(now.kind==='mine')playMine(mineAt+1);else playSong(nextId(cfg.song))};
  $('.rd-vol input').oninput=e=>setVol(+e.target.value);
  panel.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{tab=b.dataset.t;paint()});
  panel.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>playSong(b.dataset.s));
  panel.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>playMine(+b.dataset.m));
  const sh=$('.rd-shop');if(sh)sh.onclick=()=>{panel.hidden=true;placeExt();if(window.SudomiShop)SudomiShop.open('domino')};
  const pk=$('.rd-pick');if(pk)pk.onclick=pickMine;
  const go=$('.rd-go');if(go){const inp=$('.rd-link'),run=()=>{if(!playLink(inp.value))$('.rd-err').hidden=false};go.onclick=run;inp.onkeydown=e=>{if(e.key==='Enter')run()}}
  placeExt();
 }
 function ensure(){
  if(btn)return;
  btn=document.createElement('button');btn.type='button';btn.className='rd-btn hidden';btn.setAttribute('aria-label','Radio de bachata');btn.innerHTML='<span>📻</span><i></i>';
  panel=document.createElement('div');panel.className='rd-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label','Radio de bachata');
  document.body.appendChild(btn);document.body.appendChild(panel);
  btn.onclick=()=>{panel.hidden=!panel.hidden;paint()};
  panel.addEventListener('scroll',placeExt,{passive:true});window.addEventListener('resize',placeExt);
 }
 let wasOn=false;
 function watch(){
  const on=tableOn();ensure();btn.classList.toggle('hidden',!on);
  if(!on){if(now)stopAll();panel.hidden=true;placeExt();wasOn=false;return}
  if(!wasOn){wasOn=true;if(cfg.on&&!now)playSong(mixIds().length?nextId(''):cfg.song)}   // si la dejaste encendida, vuelve a sonar al sentarte (las de SUDOMI; YouTube y Spotify se ponen a mano)
 }
 function boot(){const st=document.getElementById('miniGamesScreen');if(!st)return;let q=0;new MutationObserver(()=>{if(q)return;q=setTimeout(()=>{q=0;watch()},250)}).observe(st,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});watch()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
 window.SudomiRadio={songs:all,open:()=>{ensure();panel.hidden=false;paint()},stop:stopAll,_play:playSong,_link:playLink,_embed:embedOf};
})();
