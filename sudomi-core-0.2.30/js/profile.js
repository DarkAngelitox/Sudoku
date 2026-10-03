/* SUDOMI 0.2.25 — player profile (window.SudomiProfile): a name and an avatar, saved on this device.
 * Used by the sudoku (greeting + win message), DOS and the two-player online games (the other player sees your name).
 * Opened from "Menú → Perfil", from the avatar button in the top bars, or by itself the first time you play online.
 */
(()=>{
 const KEY='sudomi-profile',OLD_NAME='sudomi-player-name';
 const AVATARS=['🦊','🐼','🦉','🐯','🐸','🐵','🦄','🐙','🐶','🐱','🐰','🐨','🦁','🐧','🐢','🦜'];
 const esc=t=>String(t).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const clean=n=>String(n||'').replace(/\s+/g,' ').trim().slice(0,14);
 function read(){
  try{
   const p=JSON.parse(localStorage.getItem(KEY));
   if(p&&clean(p.name))return {name:clean(p.name),avatar:AVATARS.includes(p.avatar)?p.avatar:AVATARS[0]};
   const old=clean(localStorage.getItem(OLD_NAME));                 // name typed in DOS before profiles existed
   if(old)return {name:old,avatar:AVATARS[0],guess:true};
  }catch(_){}
  return null;
 }
 let profile=read();
 function save(name,avatar){
  profile={name:clean(name),avatar:AVATARS.includes(avatar)?avatar:AVATARS[0]};
  try{localStorage.setItem(KEY,JSON.stringify(profile));localStorage.setItem(OLD_NAME,profile.name)}catch(_){}
  paint();window.dispatchEvent(new CustomEvent('sudomi-profile',{detail:profile}));
 }

 /* ----- editor ----- */
 let box=null;
 function closeEditor(){if(box){box.remove();box=null}}
 // opts.then: called after a successful save · opts.reason: short line shown on top (e.g. why it is being asked)
 function edit(opts={}){
  closeEditor();
  let chosen=(profile&&profile.avatar)||AVATARS[Math.floor(Math.random()*AVATARS.length)];
  box=document.createElement('div');box.className='prof-over';box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');box.setAttribute('aria-label','Tu perfil');
  box.innerHTML=`<div class="prof-card"><button class="prof-x" type="button" aria-label="Cerrar">✕</button><p class="prof-kicker">TU PERFIL</p><h2>${profile&&!profile.guess?'Edita tu perfil':'Crea tu perfil'}</h2>${opts.reason?`<p class="prof-reason">${esc(opts.reason)}</p>`:''}
   <div class="prof-preview"><span class="prof-big">${chosen}</span><b>${esc((profile&&profile.name)||'Tu nombre')}</b></div>
   <label class="prof-label" for="profName">Nombre <small>(así te verán los demás jugadores)</small></label>
   <input id="profName" maxlength="14" autocomplete="nickname" spellcheck="false" placeholder="Escribe tu nombre" value="${esc((profile&&profile.name)||'')}">
   <p class="prof-label">Elige tu avatar</p>
   <div class="prof-avatars">${AVATARS.map(a=>`<button type="button" data-av="${a}" class="${a===chosen?'on':''}" aria-label="Avatar ${a}">${a}</button>`).join('')}</div>
   <p class="prof-err" id="profErr"></p>
   <div class="prof-actions"><button class="prof-save" type="button">Guardar</button><button class="prof-cancel" type="button">Cancelar</button></div></div>`;
  document.body.appendChild(box);
  const input=box.querySelector('#profName'),big=box.querySelector('.prof-big'),label=box.querySelector('.prof-preview b');
  input.oninput=()=>{label.textContent=clean(input.value)||'Tu nombre'};
  box.querySelectorAll('[data-av]').forEach(b=>b.onclick=()=>{chosen=b.dataset.av;big.textContent=chosen;box.querySelectorAll('[data-av]').forEach(x=>x.classList.toggle('on',x===b))});
  const done=()=>{
   const n=clean(input.value);
   if(n.length<2){box.querySelector('#profErr').textContent='Escribe un nombre de al menos 2 letras.';input.focus();return}
   save(n,chosen);closeEditor();if(opts.then)opts.then(profile);
  };
  box.querySelector('.prof-save').onclick=done;
  input.onkeydown=e=>{if(e.key==='Enter')done()};
  box.querySelector('.prof-x').onclick=box.querySelector('.prof-cancel').onclick=closeEditor;
  box.onclick=e=>{if(e.target===box)closeEditor()};
  setTimeout(()=>input.focus(),50);
 }
 // run fn with a real profile; ask for one first if this device has none yet
 function ensure(fn,reason){if(profile&&!profile.guess)fn(profile);else edit({then:fn,reason:reason||'Antes de jugar con otras personas, elige cómo te van a ver.'})}

 /* ----- what is shown on the pages ----- */
 function chip(extra){const b=document.createElement('button');b.type='button';b.className='prof-chip '+(extra||'');b.onclick=e=>{e.stopPropagation();edit()};return b}
 function paint(){
  document.querySelectorAll('.prof-chip').forEach(b=>{
   b.innerHTML=profile?`<span>${profile.avatar}</span><b>${esc(profile.name)}</b>`:'<span>👤</span><b>Crear perfil</b>';
   b.title=profile?'Editar tu perfil':'Crea tu perfil';b.setAttribute('aria-label',b.title);
  });
  const hello=document.getElementById('profHello');
  if(hello)hello.innerHTML=profile?`¡Hola, <b>${esc(profile.name)}</b>! ${profile.avatar}`:'';
  // the Perfil item of the home menu stops being "En desarrollo"
  document.querySelectorAll('.feature-option[data-feature="Perfil"] small').forEach(s=>{s.textContent=profile?esc(profile.name):'Crear'});
 }
 function mount(){
  const home=document.querySelector('.home-topbar .theme-toggle')||document.querySelector('.home-topbar .dom-chip');
  if(home)home.parentNode.insertBefore(chip(),home);
  const games=document.querySelector('.mini-games-header .theme-toggle')||document.querySelector('.mini-games-header .games-brand-mark');
  if(games)games.parentNode.insertBefore(chip(),games);
  const copy=document.querySelector('.hero-copy');
  if(copy&&!document.getElementById('profHello')){const p=document.createElement('p');p.id='profHello';p.className='prof-hello';copy.insertBefore(p,copy.querySelector('h1'))}
  const item=document.querySelector('.feature-option[data-feature="Perfil"]');
  if(item)item.onclick=e=>{e.stopPropagation();const m=document.getElementById('homeDropdown');if(m)m.classList.add('hidden');edit()};   // replaces "Función en desarrollo"
  paint();
 }
 // theme.js adds its buttons on DOMContentLoaded too; wait one tick so the profile button sits next to it
 const start=()=>setTimeout(mount,0);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();

 window.SudomiProfile={
  get:()=>profile&&!profile.guess?{...profile}:null,
  name:()=>profile?profile.name:'',
  safeName:()=>profile?esc(profile.name):'',
  avatar:()=>profile?profile.avatar:'',
  avatars:AVATARS.slice(),
  validAvatar:a=>AVATARS.includes(a),
  edit,ensure
 };
})();
