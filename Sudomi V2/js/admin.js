/* SUDOMI 0.3.100 — MODO ADMIN (solo el dueño).
 *   · Entrada escondida: toca 7 veces la versión del pie de la pantalla de inicio y escribe tu PIN.
 *   · El PIN NO está en este archivo. Aquí solo está CONF: la llave privada de firmar CIFRADA con el PIN (PBKDF2 + AES-GCM)
 *     y la llave pública (sin secreto). Con el PIN correcto se descifra la privada y queda guardada solo en tu teléfono.
 *   · Panel: sumar monedas a tu cuenta, crear CÓDIGOS DE REGALO para tus amigos y encender el MODO AUTO (botón 🤖).
 *   · Código de regalo: SUDOMI-<monedas>-<número único>-<firma>. Cualquiera lo comprueba con la llave pública
 *     (Tienda → 🎁 Canjear código); nadie puede inventar uno sin la llave privada. Cada teléfono canjea cada código una sola vez.
 *   · Si CONF está vacío, la primera vez se elige el PIN aquí mismo y el panel muestra el texto «SUDOMI-ADMIN-CONF:…» para pegarlo abajo.
 *   window.SudomiAdmin = {is, open, redeem} */
(()=>{
 'use strict';
 // ⬇︎ Datos públicos y cifrados: no contienen el PIN.
 const CONF={"salt":"EwNJQHVNJFt_onkGjsKITA","iv":"V-DrhDPVqUB6TVkT","priv":"F4V_ZJ49e1x_nCnzQSD9t2oktMnZ9idcxci7bdBdStUTkmqkfutq-hFGaZWBAB7e78eMAfXiBnu80R-BOCUps5reN7Q1ZO9zmF-qIZgcvLjIT_d1iMHvlPT2Z0J9swEP_gF1OiYGlyizU_y6fkk9dvDWg-FZ2Ijg2wD4gLhYr-Fl5OZsOrHwbO8VtsPLNtOp9tERoNT41UdtzBMarCoM5UN2Yfzm6QFAHI_fBEon8zhA_vkPgOqvIXAWaEjPQDd7eDH93-B46aTKpxC4lBb2HpkBByhUlPC8txhgaFgu","pub":{"kty":"EC","crv":"P-256","x":"JCWTRmvel9-WKxh-7FcSTTkQW7xJIF5icryHBEjUY3s","y":"vw8Rmko1nmDtST5dmNIwJs2H8L1o0jQKWfQbCIqxoNk"}};   // 18 oct 2026: llaves del dueño (la privada va cifrada con su PIN)
 const K_KEY='sudomi-admin-key',K_AUTO='sudomi-admin-auto',K_SPEED='sudomi-admin-speed',K_USED='sudomi-gifts-used',K_LOG='sudomi-admin-log',K_CONF='sudomi-admin-conf';
 const ITER=250000,MAX_GIFT=1000000;
 const $=s=>document.querySelector(s);
 const enc=new TextEncoder(),dec=new TextDecoder();
 const b64u={to:buf=>{let s='';new Uint8Array(buf).forEach(b=>s+=String.fromCharCode(b));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')},
  from:str=>{str=str.replace(/-/g,'+').replace(/_/g,'/');while(str.length%4)str+='=';const s=atob(str),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return u}};
 const get=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(_){return d}};
 const put=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
 const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const tr=s=>window.SudomiI18n&&SudomiI18n.t?SudomiI18n.t(s):s;
 const subtle=window.crypto&&crypto.subtle;
 // mientras CONF de arriba esté vacío vale el que se creó en este teléfono (solo para la primera vez)
 const conf=()=>CONF.pub?CONF:get(K_CONF,null);
 const isAdmin=()=>!!get(K_KEY,null);
 const autoOn=()=>get(K_AUTO,true)!==false;   // 0.3.101: encendido salvo que lo apagues en el panel

 // ---------- llaves ----------
 async function pinKey(pin,salt){
  const base=await subtle.importKey('raw',enc.encode(pin),'PBKDF2',false,['deriveKey']);
  return subtle.deriveKey({name:'PBKDF2',salt,iterations:ITER,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
 }
 async function login(pin){
  const C=conf();if(!C)return false;
  try{const k=await pinKey(pin,b64u.from(C.salt)),raw=await subtle.decrypt({name:'AES-GCM',iv:b64u.from(C.iv)},k,b64u.from(C.priv));
   const jwk=JSON.parse(dec.decode(raw));await subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);put(K_KEY,jwk);return true}
  catch(_){return false}
 }
 async function setup(pin){   // primera vez: crea el par de llaves y guarda la privada cifrada con el PIN
  const kp=await subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const priv=await subtle.exportKey('jwk',kp.privateKey),pub=await subtle.exportKey('jwk',kp.publicKey);
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=await subtle.encrypt({name:'AES-GCM',iv},await pinKey(pin,salt),enc.encode(JSON.stringify(priv)));
  const C={salt:b64u.to(salt),iv:b64u.to(iv),priv:b64u.to(ct),pub:{kty:pub.kty,crv:pub.crv,x:pub.x,y:pub.y}};
  put(K_CONF,C);put(K_KEY,priv);return C;
 }
 const pubKey=()=>{const C=conf();return C&&C.pub?subtle.importKey('jwk',C.pub,{name:'ECDSA',namedCurve:'P-256'},false,['verify']):Promise.resolve(null)};
 const ECP={name:'ECDSA',hash:'SHA-256'};

 // ---------- códigos de regalo ----------
 async function makeGift(n){
  const jwk=get(K_KEY,null);if(!jwk)throw new Error('no admin');
  const k=await subtle.importKey('jwk',jwk,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
  const nonce=Array.from(crypto.getRandomValues(new Uint8Array(6)),b=>b.toString(36).padStart(2,'0')).join('').slice(0,10);
  const sig=await subtle.sign(ECP,k,enc.encode(`SUDOMI|${n}|${nonce}`));
  const code=`SUDOMI-${n}-${nonce}-${b64u.to(sig)}`;
  const log=get(K_LOG,[]);log.unshift({n,code,t:Date.now()});put(K_LOG,log.slice(0,30));
  return code;
 }
 // devuelve {ok, n} o {ok:false, why}
 async function redeem(text){
  const m=String(text||'').replace(/\s+/g,'').match(/SUDOMI-(\d{1,7})-([a-z0-9]{6,16})-([A-Za-z0-9_-]{40,})/);
  if(!m)return {ok:false,why:tr('Ese código no es válido.')};
  const n=+m[1],nonce=m[2];if(!(n>0&&n<=MAX_GIFT))return {ok:false,why:tr('Ese código no es válido.')};
  const used=get(K_USED,[]);if(used.includes(nonce))return {ok:false,why:tr('Este código ya se canjeó en este teléfono.')};
  let good=false;try{const k=await pubKey();good=!!k&&await subtle.verify(ECP,k,b64u.from(m[3]),enc.encode(`SUDOMI|${n}|${nonce}`))}catch(_){}
  if(!good)return {ok:false,why:tr('Ese código no es válido.')};
  used.push(nonce);put(K_USED,used);
  if(window.SudomiCoins)SudomiCoins.add(n,tr('Regalo'));
  return {ok:true,n};
 }
 function redeemUI(prefill){
  const S=window.SudomiScreen;if(!S)return;
  S.open('giftScreen',tr('🎁 Canjear código'),(body,api)=>{
   body.innerHTML=`<p class="adm-p">${tr('Pega aquí el código de regalo que te mandaron. Cada código se puede canjear una vez en este teléfono.')}</p>
    <textarea class="adm-code" rows="3" spellcheck="false" autocapitalize="off" placeholder="SUDOMI-…">${esc(prefill||'')}</textarea>
    <button type="button" class="shop-btn adm-go">${tr('Canjear')}</button><p class="adm-msg" role="status"></p>`;
   const ta=body.querySelector('textarea'),msg=body.querySelector('.adm-msg'),go=body.querySelector('.adm-go');
   go.onclick=async()=>{go.disabled=true;const r=await redeem(ta.value);go.disabled=false;
    msg.className='adm-msg '+(r.ok?'ok':'bad');msg.textContent=r.ok?tr('¡Listo! +{} monedas.').replace('{}',r.n.toLocaleString('es')):r.why;if(r.ok)ta.value=''};
  });
 }

 // ---------- entrada escondida: 7 toques en la versión del pie ----------
 let taps=0,tapT=0;
 document.addEventListener('click',e=>{
  const f=e.target.closest&&e.target.closest('.home-footer span:last-child');if(!f)return;
  const now=Date.now();taps=now-tapT<1500?taps+1:1;tapT=now;
  if(taps>=7){taps=0;open()}
 });
 function open(){if(isAdmin())panel();else pinUI()}
 function pinUI(){
  const S=window.SudomiScreen;if(!S||!subtle)return;const first=!conf();
  S.open('adminScreen','🔐 Admin',(body,api)=>{
   body.innerHTML=`<p class="adm-p">${first?'Primera vez: elige un PIN de administrador (mínimo 6 números o letras). No se guarda en ningún sitio: si lo olvidas, hay que crear otro.':'Escribe tu PIN de administrador.'}</p>
    <input class="adm-pin" type="password" autocomplete="off" inputmode="text" minlength="6" placeholder="PIN">
    ${first?'<input class="adm-pin2" type="password" autocomplete="off" placeholder="Repite el PIN">':''}
    <button type="button" class="shop-btn adm-go">${first?'Crear':'Entrar'}</button><p class="adm-msg" role="status"></p>`;
   const p=body.querySelector('.adm-pin'),msg=body.querySelector('.adm-msg'),go=body.querySelector('.adm-go');
   const run=async()=>{const v=p.value.trim();
    if(first){const v2=body.querySelector('.adm-pin2').value.trim();if(v.length<6||v!==v2){msg.className='adm-msg bad';msg.textContent=v.length<6?'El PIN debe tener 6 caracteres o más.':'Los dos PIN no coinciden.';return}
     go.disabled=true;await setup(v);api.close();panel();return}
    go.disabled=true;msg.className='adm-msg';msg.textContent='…';const ok=await login(v);go.disabled=false;
    if(ok){api.close();panel()}else{msg.className='adm-msg bad';msg.textContent='PIN incorrecto.';p.value='';p.focus()}};
   go.onclick=run;body.querySelectorAll('input').forEach(i=>i.addEventListener('keydown',e=>{if(e.key==='Enter')run()}));
   setTimeout(()=>p.focus(),50);
  });
 }

 // ---------- panel ----------
 function panel(){
  const S=window.SudomiScreen;if(!S)return;
  S.open('adminScreen','🛠 Admin',(body,api)=>{
   const coins=window.SudomiCoins?SudomiCoins.get():0,log=get(K_LOG,[]),C=conf(),auto=autoOn(),fast=get(K_SPEED,'n')==='f';
   body.innerHTML=`
    <section class="adm-box"><h3>💰 Mis monedas: <b class="adm-coins">${coins.toLocaleString('es')}</b></h3>
     <div class="adm-row">${[100,500,1000,10000].map(n=>`<button type="button" class="shop-btn" data-add="${n}">+${n.toLocaleString('es')}</button>`).join('')}</div>
     <div class="adm-row"><input class="adm-num" type="number" min="1" max="${MAX_GIFT}" placeholder="Otra cantidad"><button type="button" class="shop-btn" data-addx>Sumar</button></div></section>
    <section class="adm-box"><h3>🎁 Regalar monedas a un amigo</h3>
     <p class="adm-p small">Crea un código y mándaselo. Tu amigo lo pega en Tienda → 🎁 Canjear código (o abre el enlace).</p>
     <div class="adm-row"><input class="adm-gift" type="number" min="1" max="${MAX_GIFT}" value="500"><button type="button" class="shop-btn" data-gift>Crear código</button></div>
     <div class="adm-out"></div>
     ${log.length?`<details class="adm-log"><summary>Códigos creados (${log.length})</summary>${log.map(x=>`<div><b>${x.n.toLocaleString('es')}</b> · ${new Date(x.t).toLocaleDateString('es')} <code>${esc(x.code.slice(0,22))}…</code> <button type="button" class="adm-mini" data-copy="${esc(x.code)}">Copiar</button></div>`).join('')}</details>`:''}</section>
    <section class="adm-box"><h3>🤖 Modo auto</h3>
     <p class="adm-p small">Sale un botón 🤖 en cada juego: tócalo y la máquina juega por ti (vuelve a tocarlo para pararla). En el Sudoku rellena las casillas.</p>
     <div class="adm-row"><button type="button" class="shop-btn${auto?'':' alt'}" data-auto>${auto?'Encendido':'Apagado'}</button>
      <button type="button" class="shop-btn${fast?' alt':''}" data-speed="n">Normal</button><button type="button" class="shop-btn${fast?'':' alt'}" data-speed="f">Rápido</button></div></section>
    ${CONF.pub?'':`<section class="adm-box warn"><h3>⚠️ Falta un paso</h3><p class="adm-p small">Copia este texto y pásaselo a Claude para que lo deje fijo en la app. Hasta entonces, los códigos de regalo solo funcionan en este teléfono.</p>
     <textarea class="adm-code" rows="3" readonly>${esc('SUDOMI-ADMIN-CONF:'+JSON.stringify(C))}</textarea><button type="button" class="shop-btn" data-copyconf>Copiar</button></section>`}
    <button type="button" class="shop-btn alt adm-out-btn" data-logout>Cerrar sesión de admin</button>`;
   const toast=t=>{const o=body.querySelector('.adm-out');o.innerHTML=`<p class="adm-msg ok">${esc(t)}</p>`};
   const copy=async t=>{try{await navigator.clipboard.writeText(t);return true}catch(_){return false}};
   body.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{SudomiCoins.add(+b.dataset.add,'Admin');api.redraw()});
   body.querySelector('[data-addx]').onclick=()=>{const n=Math.floor(+body.querySelector('.adm-num').value);if(n>0&&n<=MAX_GIFT){SudomiCoins.add(n,'Admin');api.redraw()}};
   body.querySelector('[data-gift]').onclick=async()=>{const n=Math.floor(+body.querySelector('.adm-gift').value);if(!(n>0&&n<=MAX_GIFT))return;
    const code=await makeGift(n),link=location.origin+location.pathname+'?regalo='+encodeURIComponent(code);
    const text=`🎁 Te regalo ${n.toLocaleString('es')} monedas en SUDOMI. Abre este enlace, o ve a Tienda → 🎁 Canjear código y pega:\n${code}\n${link}`;
    const o=body.querySelector('.adm-out');o.innerHTML=`<textarea class="adm-code" rows="4" readonly>${esc(text)}</textarea><div class="adm-row"><button type="button" class="shop-btn" data-c>Copiar</button>${navigator.share?'<button type="button" class="shop-btn" data-s>Compartir</button>':''}</div><p class="adm-msg" role="status"></p>`;
    o.querySelector('[data-c]').onclick=async()=>{o.querySelector('.adm-msg').textContent=await copy(text)?'Copiado.':'Selecciona el texto y cópialo.'};
    const sb=o.querySelector('[data-s]');if(sb)sb.onclick=()=>navigator.share({title:'SUDOMI',text}).catch(()=>{})};
   body.querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{b.textContent=await copy(b.dataset.copy)?'✓':'✗'});
   const cc=body.querySelector('[data-copyconf]');if(cc)cc.onclick=async()=>{cc.textContent=await copy('SUDOMI-ADMIN-CONF:'+JSON.stringify(C))?'Copiado ✓':'Selecciona y copia'};
   body.querySelector('[data-auto]').onclick=()=>{put(K_AUTO,!auto);if(auto)stopBot();sync();api.redraw()};
   body.querySelectorAll('[data-speed]').forEach(b=>b.onclick=()=>{put(K_SPEED,b.dataset.speed==='f'?'f':'n');if(timer){stopBot();startBot()}api.redraw()});
   body.querySelector('[data-logout]').onclick=()=>{try{localStorage.removeItem(K_KEY)}catch(_){}put(K_AUTO,false);stopBot();sync();api.close()};
  });
 }

 // ---------- botón 🤖 y el que juega ----------
 let btn=null,timer=null;
 const visible=el=>{if(!el||el.classList.contains('hidden'))return false;const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(el).visibility!=='hidden'};   // 0.3.101: offsetParent falla con position:fixed
 const sudokuOn=()=>visible(document.getElementById('gameScreen'))&&!document.body.classList.contains('tut-open');
 const arcadeOn=()=>visible(document.getElementById('miniGameStage'));
 function sudokuStep(){
  const C=window.SudomiCore,g=C&&C.ui&&C.ui.game;if(!g||!g.running||g.paused||!g.solution)return false;
  for(let i=0;i<81;i++)if(!g.puzzle[i]&&g.board[i]!==g.solution[i]){C.ui.notesMode=false;g.select(i);g.setNumber(g.solution[i]);return true}
  return false;
 }
 function tick(){
  if(!isAdmin()||!autoOn()){stopBot();return}
  try{if(sudokuOn())sudokuStep();else if(arcadeOn()&&window.SudomiArcadeAuto)SudomiArcadeAuto.step();else stopBot()}catch(e){console.warn('SUDOMI admin auto:',e)}
 }
 function startBot(){if(timer)return;timer=setInterval(tick,get(K_SPEED,'n')==='f'?300:900);if(btn)btn.classList.add('on');tick()}
 function stopBot(){if(!timer)return;clearInterval(timer);timer=null;if(btn)btn.classList.remove('on');try{window.SudomiArcadeAuto&&SudomiArcadeAuto.off()}catch(_){}}
 function sync(){
  const show=isAdmin()&&autoOn()&&(sudokuOn()||arcadeOn());
  if(show&&!btn){btn=document.createElement('button');btn.type='button';btn.className='adm-bot';btn.textContent='🤖';btn.title='Modo auto';btn.setAttribute('aria-label','Modo auto');
   btn.onclick=()=>timer?stopBot():startBot();document.body.appendChild(btn)}
  if(btn){btn.classList.toggle('hidden',!show);btn.classList.toggle('on',!!timer)}
  if(!show&&timer)stopBot();
 }
 setInterval(sync,800);

 // ---------- enlace ?regalo=… ----------
 window.addEventListener('load',()=>{
  const q=new URLSearchParams(location.search).get('regalo');if(!q)return;
  try{history.replaceState(null,'',location.pathname)}catch(_){}
  setTimeout(()=>redeemUI(q),600);
 });

 window.SudomiAdmin={is:isAdmin,open,redeem:redeemUI};
})();
