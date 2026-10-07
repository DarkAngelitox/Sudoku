/* SUDOMI 0.3.38 (V2) — MONEDAS y TIENDA DE SKINS (idea del dueño). Tres cosas en este archivo:
 *
 *   window.SudomiCoins  = {get, add(n, motivo), spend(n)}        monedas del jugador, guardadas en este teléfono ('sudomi-coins')
 *   window.SudomiShopSkins  = {list, owns, active, buy, equip}       skins compradas y cuál está puesta en cada juego ('sudomi-shop-skins')
 *   window.SudomiShop   = {open}                                 la pantalla «Tienda de skins» (pestaña «Tienda» de la barra de abajo, js/tabbar.js)
 *
 * CÓMO SE GANAN MONEDAS: cumpliendo los retos diarios. Los dos sitios que ya marcaban el reto como cumplido llaman a SudomiCoins.add():
 *   · Sudoku del día  → js/daily.js      (DAILY_COINS, una vez por cada día del calendario)
 *   · Reto del arcade → js/other-games.js (DAILY_COINS, una vez al día)
 *
 * CÓMO SE PONE UNA SKIN: no se toca el juego. Al equiparla, <body> recibe la clase «skin-<juego>-<id>» y este archivo escribe una hoja de estilos
 * (<style id="sudomiSkinCss">) que repinta las piezas. Para una skin nueva: una entrada en SKINS y su CSS en css(). */
(()=>{
 const CKEY='sudomi-coins',SKEY='sudomi-shop-skins',DAILY_COINS=50;
 const num=v=>Number.isFinite(+v)&&+v>0?Math.floor(+v):0;
 const Coins={
  get(){try{return num(localStorage.getItem(CKEY))}catch(_){return 0}},
  set(n){try{localStorage.setItem(CKEY,String(num(n)))}catch(_){}try{window.dispatchEvent(new CustomEvent('sudomi-coins',{detail:{coins:num(n)}}))}catch(_){}},
  add(n,why){n=num(n);if(!n)return this.get();this.set(this.get()+n);toast(`+${n} monedas`,why||'');return this.get()},
  spend(n){n=num(n);if(this.get()<n)return false;this.set(this.get()-n);return true},
  DAILY:DAILY_COINS
 };
 function toast(title,sub){
  const t=document.createElement('div');t.className='coin-toast';t.innerHTML=`${coinSvg()}<div><b></b><small></small></div>`;
  t.querySelector('b').textContent=title;t.querySelector('small').textContent=sub;
  document.body.appendChild(t);setTimeout(()=>t.remove(),3200);
 }
 const coinSvg=()=>'<svg class="coin" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#f4b400" stroke="#8a5a00" stroke-width="1.800"/><circle cx="12" cy="12" r="6.500" fill="#ffd95a" stroke="#b07a00" stroke-width="1.200"/><path d="M12 7.500l1.300 2.700 3 .4-2.200 2.100.6 3-2.700-1.500-2.700 1.500.6-3-2.200-2.100 3-.4z" fill="#b07a00"/></svg>';

 /* ---------- skins ---------- */
 // una tapa de botella de vidrio (corona con 21 dientes), vista desde arriba, como imagen para usar de fondo
 function cap(main,dark,art){
  let d='';const N=21;
  for(let i=0;i<N*2;i++){const a=i*Math.PI/N-Math.PI/2,r=i%2?44.5:49.5;d+=(i?'L':'M')+(50+r*Math.cos(a)).toFixed(1)+' '+(50+r*Math.sin(a)).toFixed(1)}
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#b9bec8"/><stop offset="1" stop-color="#7c828e"/></linearGradient></defs><path d="${d}Z" fill="url(#m)" stroke="#5b616c" stroke-width="1.500" stroke-linejoin="round"/><circle cx="50" cy="50" r="39" fill="${main}" stroke="${dark}" stroke-width="2.500"/>${art}<path d="M22 38a30 30 0 0 1 34-18" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".45"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
 }
 const CAP_RED=cap('#d8232a','#8f1016','<path d="M17 56c12-14 22-14 33-4s21 8 33-6" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/><path d="M24 68c10-7 17-6 26 0s17 6 26-2" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".8"/>');
 // la tapa azul es un dibujo propio (estrella y aros): a propósito NO imita el logo de ninguna marca
 const CAP_BLUE=cap('#1553b6','#0a2f73','<circle cx="50" cy="50" r="30" fill="none" stroke="#fff" stroke-width="3"/><path d="M50 27l6.200 13.300 14.600 1.800-10.700 10 2.800 14.400L50 59.400 37.100 66.500l2.800-14.400-10.700-10 14.600-1.800z" fill="#fff"/>');
 // 0.3.38 — primera skin (pedido del dueño): en Damas, las fichas son tapas de refresco de botella de vidrio (rojas contra azules)
 // 0.3.44 — caritas para 4 en línea: la amarilla sonríe, la roja está brava
 const uri=svg=>`url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
 const face=(c1,c2,dark,parts)=>uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><radialGradient id="f" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></radialGradient></defs><circle cx="50" cy="50" r="47" fill="url(#f)" stroke="${dark}" stroke-width="4"/>${parts}</svg>`);
 const FACE_HAPPY=face('#fff3a6','#f2b705','#8a5a00','<ellipse cx="34" cy="40" rx="6" ry="9" fill="#3a2a00"/><ellipse cx="66" cy="40" rx="6" ry="9" fill="#3a2a00"/><circle cx="36" cy="37" r="2.200" fill="#fff"/><circle cx="68" cy="37" r="2.200" fill="#fff"/><path d="M26 58q24 26 48 0" fill="#7a2a12" stroke="#3a2a00" stroke-width="4" stroke-linejoin="round"/><path d="M34 62q16 9 32 0" fill="#fff"/><ellipse cx="20" cy="56" rx="7" ry="4.500" fill="#ff8a65" opacity=".6"/><ellipse cx="80" cy="56" rx="7" ry="4.500" fill="#ff8a65" opacity=".6"/>');
 const FACE_ANGRY=face('#ff9aa2','#d8232a','#7d1118','<path d="M20 30l22 10M80 30l-22 10" stroke="#3b0508" stroke-width="7" stroke-linecap="round"/><ellipse cx="34" cy="48" rx="6" ry="7" fill="#fff"/><ellipse cx="66" cy="48" rx="6" ry="7" fill="#fff"/><circle cx="35" cy="49" r="3.200" fill="#3b0508"/><circle cx="65" cy="49" r="3.200" fill="#3b0508"/><path d="M30 76q20-18 40 0" fill="none" stroke="#3b0508" stroke-width="6" stroke-linecap="round"/><path d="M36 71l5 6M46 67l3 7M57 67l-3 7M66 71l-5 6" stroke="#fff" stroke-width="2.500" stroke-linecap="round"/>');
 // 0.3.44 — dados negros con puntos rojos para Parchimi (la imagen es solo para la vitrina de la tienda; en el juego se pintan con CSS)
 const die=pips=>uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="d" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a4a52"/><stop offset="1" stop-color="#0b0b0d"/></linearGradient></defs><rect x="5" y="5" width="90" height="90" rx="19" fill="url(#d)" stroke="#000" stroke-width="4"/>${pips.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="9" fill="#ff2b3a"/>`).join('')}</svg>`);
 const DIE_5=die([[28,28],[72,28],[50,50],[28,72],[72,72]]),DIE_6=die([[28,26],[72,26],[28,50],[72,50],[28,74],[72,74]]);
 // miniaturas para la vitrina de los objetos de la Mesa 3D
 const THUMB_COLMADO=uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="14" fill="#ffe9a8"/><rect x="12" y="8" width="76" height="16" rx="4" fill="#d62027"/><g fill="#7a3b12"><rect x="10" y="36" width="80" height="4"/><rect x="10" y="56" width="80" height="4"/></g><g><rect x="16" y="26" width="7" height="10" fill="#1f6b3a"/><rect x="30" y="24" width="7" height="12" fill="#b3161b"/><rect x="44" y="27" width="7" height="9" fill="#1761b2"/><rect x="58" y="24" width="7" height="12" fill="#e2a400"/><rect x="72" y="26" width="7" height="10" fill="#4a148c"/><rect x="22" y="45" width="7" height="11" fill="#e2a400"/><rect x="38" y="46" width="7" height="10" fill="#1f6b3a"/><rect x="54" y="44" width="7" height="12" fill="#b3161b"/><rect x="70" y="46" width="7" height="10" fill="#1761b2"/></g><rect y="66" width="100" height="16" fill="#a3262c"/><rect y="82" width="100" height="18" fill="#e3e7ec"/></svg>');
 const THUMB_PLAYA=uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="14" fill="#7fd0ff"/><circle cx="74" cy="24" r="11" fill="#ffe27a"/><rect y="44" width="100" height="18" fill="#0d8fc9"/><path d="M0 62q12-6 25 0t25 0t25 0t25 0v38H0z" fill="#f3dfa9"/><path d="M22 78q5-28 1-46" fill="none" stroke="#7a4a22" stroke-width="5" stroke-linecap="round"/><g fill="#1c8a4a"><path d="M23 32q-16-3-22 8q12-3 22-8z"/><path d="M23 32q6-15 22-12q-13 3-22 12z"/><path d="M23 32q16-2 22 10q-11-5-22-10z"/></g></svg>');
 const THUMB_TILE=uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g transform="rotate(-12 50 50)"><rect x="29" y="8" width="42" height="84" rx="8" fill="#1f9d55" stroke="#0e5a2e" stroke-width="4"/><path d="M36 50h28" stroke="#d7ffe6" stroke-width="3" stroke-linecap="round"/><g fill="#fff"><circle cx="40" cy="20" r="4.500"/><circle cx="60" cy="20" r="4.500"/><circle cx="50" cy="30" r="4.500"/><circle cx="40" cy="40" r="4.500"/><circle cx="60" cy="40" r="4.500"/><circle cx="40" cy="62" r="4.500"/><circle cx="60" cy="80" r="4.500"/><circle cx="50" cy="71" r="4.500"/></g></g></svg>');
 const THUMB_CHAIR=uri('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M26 74V26q0-14 14-14h20q14 0 14 14v48" fill="#2fb86a" stroke="#167a40" stroke-width="4"/><g stroke="#167a40" stroke-width="4" stroke-linecap="round"><path d="M38 24v36M50 24v36M62 24v36"/></g><rect x="18" y="62" width="64" height="12" rx="6" fill="#3fd27c" stroke="#167a40" stroke-width="4"/><path d="M24 74v20M76 74v20" stroke="#167a40" stroke-width="7" stroke-linecap="round"/></svg>');
 /* Cada skin: id · game (el id del juego) · gameName · name · price · desc · preview (dos imágenes para la tienda) · shared (true = en una partida online el rival también la ve) */
 const SKINS=[
  {id:'caps',game:'checkers',gameName:'Damas',name:'Tapitas de refresco',price:150,desc:'Las fichas se cambian por tapas de botella de vidrio: rojas contra azules.',preview:[CAP_RED,CAP_BLUE],shared:true},
  {id:'faces',game:'connect4',gameName:'4 en línea',name:'Caritas',price:150,desc:'Las fichas amarillas son caritas felices y las rojas, caras enojadas.',preview:[FACE_ANGRY,FACE_HAPPY],shared:true},
  // 0.3.47 — Mesa 3D del dominó: tres ranuras separadas (fondo, dominós, sillas). Se ven en la mesa de TODOS cuando la mano la saca quien los lleva (js/domino-3d.js)
  {id:'colmado',game:'d3scene',gameName:'Dominó 3D · Fondo',name:'Colmado',price:100,desc:'Estantes de botellas, mostrador rojo y piso de losetas.',preview:[THUMB_COLMADO],note:' Se pone cuando sacas tú.'},
  {id:'playa',game:'d3scene',gameName:'Dominó 3D · Fondo',name:'Playa',price:150,desc:'Mar, arena, sol y una palma.',preview:[THUMB_PLAYA],note:' Se pone cuando sacas tú.'},
  {id:'tilegreen',game:'d3tiles',gameName:'Dominó 3D · Fichas',name:'Dominós verdes',price:120,desc:'Fichas verdes con puntos blancos.',preview:[THUMB_TILE],note:' Se ponen cuando sacas tú.'},
  {id:'chairgreen',game:'d3chairs',gameName:'Dominó 3D · Sillas',name:'Sillas verdes',price:100,desc:'Sillas plásticas verdes para toda la mesa.',preview:[THUMB_CHAIR],note:' Se ponen cuando sacas tú.'},
  {id:'blackdice',game:'parchis',gameName:'Parchimi',name:'Dados negros',price:120,desc:'Dados negros con puntos rojos: salen cuando tiras tú.',preview:[DIE_5,DIE_6],shared:true}
 ];
 const read=()=>{try{const v=JSON.parse(localStorage.getItem(SKEY));return {own:Array.isArray(v&&v.own)?v.own:[],on:(v&&v.on&&typeof v.on==='object')?v.on:{}}}catch(_){return {own:[],on:{}}}};
 const write=v=>{try{localStorage.setItem(SKEY,JSON.stringify(v))}catch(_){}apply();try{window.dispatchEvent(new CustomEvent('sudomi-shop-skins'))}catch(_){}};   // el aviso sirve para mandársela al rival si estás en una partida online
 const Skins={
  list:()=>SKINS.slice(),
  owns:id=>read().own.includes(id),
  active:game=>{const v=read(),id=v.on[game];return id&&v.own.includes(id)?id:''},
  buy(id){const s=SKINS.find(x=>x.id===id),v=read();if(!s||v.own.includes(id))return false;if(!Coins.spend(s.price))return false;v.own.push(id);v.on[s.game]=id;write(v);return true},   // al comprarla queda puesta
  equip(id,on){const s=SKINS.find(x=>x.id===id),v=read();if(!s||!v.own.includes(id))return false;if(on)v.on[s.game]=id;else delete v.on[s.game];write(v);return true}
 };
 function css(){
  // 0.3.39: la skin va en CADA ficha (clase sk-caps), no en toda la página: así en una partida online cada lado lleva la skin de su dueño.
  // Quién lleva qué lo decide skinOf() en js/other-games.js. Si te tocan las rojas, tu tapa es la roja; si te tocan las negras, la azul.
  return `#miniGameStage .checker-piece.sk-caps{border:0;border-radius:50%;background-size:100% 100%;background-repeat:no-repeat;box-shadow:0 3px 0 #0007,0 6px 9px #0006}
#miniGameStage .checker-piece.sk-caps::before,#miniGameStage .checker-piece.sk-caps::after{display:none}
#miniGameStage .checker-piece.sk-caps.red-piece{background-image:${CAP_RED};background-color:transparent}
#miniGameStage .checker-piece.sk-caps.black-piece{background-image:${CAP_BLUE};background-color:transparent}
#miniGameStage .checker-piece.sk-caps b{filter:drop-shadow(0 1px 1px #000a)}
#miniGameStage .connect-slot.sk-faces.red-disc{background:${FACE_ANGRY} center/100% 100% no-repeat;box-shadow:0 2px 4px #0007}
#miniGameStage .connect-slot.sk-faces.yellow-disc{background:${FACE_HAPPY} center/100% 100% no-repeat;box-shadow:0 2px 4px #0007}
#miniGameStage .connect-slot.sk-faces.falling-disc{background:radial-gradient(circle at 50% 40%,#0a2f73 0 60%,#0d3a85 100%)}
#miniGameStage .connect-slot.sk-faces.falling-disc::before{content:"";box-shadow:none}
#miniGameStage .connect-slot.sk-faces.falling-disc.red-disc::before{background:${FACE_ANGRY} center/100% 100% no-repeat}
#miniGameStage .connect-slot.sk-faces.falling-disc.yellow-disc::before{background:${FACE_HAPPY} center/100% 100% no-repeat}
.pc-die.sk-blackdice{border-color:#000;background:linear-gradient(145deg,#4a4a52,#0b0b0d);box-shadow:0 3px 0 #000a,0 6px 10px #0008}
.pc-die.sk-blackdice i.on{background:#ff2b3a;box-shadow:0 0 5px #ff2b3a,inset 0 1px 1px #fff6}
.pc-die.sk-blackdice.sel{box-shadow:0 0 0 3px #ffd54a,0 0 0 5px #000,0 6px 10px #0008}`;
 }
 function apply(){
  let st=document.getElementById('sudomiSkinCss');
  if(!st){st=document.createElement('style');st.id='sudomiSkinCss';st.textContent=css();document.head.appendChild(st)}
  SKINS.forEach(s=>document.body.classList.toggle(`skin-${s.game}-${s.id}`,Skins.active(s.game)===s.id));
 }

 /* ---------- la pantalla ---------- */
 let taps=0,tapAt=0;
 function open(){
  const S=window.SudomiScreen;if(!S)return;
  S.open('shopScreen','Tienda de skins',(body,api)=>{
   const coins=Coins.get();
   body.innerHTML=`<div class="shop-bank">${coinSvg()}<div><b>${coins.toLocaleString('es')}</b><small>monedas</small></div></div>
    <p class="shop-how">Ganas <b>${DAILY_COINS} monedas</b> por cada reto diario que cumplas: el <b>Sudoku del día</b> y el <b>Reto de hoy</b> del arcade.</p>
    <div class="shop-list">${SKINS.map(s=>{const own=Skins.owns(s.id),on=Skins.active(s.game)===s.id,can=coins>=s.price;
     return `<div class="shop-item${on?' on':''}"><div class="shop-prev g-${s.game}">${s.preview.map(u=>`<i style="background-image:${u.replace(/"/g,'&quot;')}"></i>`).join('')}</div>
      <div class="shop-txt"><small>${s.gameName}</small><b>${s.name}</b><p>${s.desc}${s.note||(s.shared?' Tu rival online también las ve.':'')}</p></div>
      ${own?`<button type="button" class="shop-btn ${on?'alt':''}" data-eq="${s.id}" data-on="${on?0:1}">${on?'Quitar':'Usar'}</button>`:`<button type="button" class="shop-btn buy" data-buy="${s.id}" ${can?'':'disabled'}>${coinSvg()} ${s.price}</button>`}
      ${own?`<em class="shop-tag">${on?'Puesta':'Comprada'}</em>`:can?'':`<em class="shop-tag miss">Te faltan ${s.price-coins}</em>`}</div>`}).join('')}</div>
    <p class="shop-how small">Pronto habrá más skins. Las monedas y las compras se guardan en este teléfono.</p>`;
   // 0.3.40 — TRUCO DE PRUEBAS (quitar antes de publicar en tiendas): tocar 7 veces seguidas la moneda grande da 500 monedas
   const bank=body.querySelector('.shop-bank .coin');
   if(bank)bank.onclick=()=>{const now=Date.now();taps=now-tapAt<1200?taps+1:1;tapAt=now;if(taps>=7){taps=0;Coins.add(500,'Monedas de prueba');api.redraw()}};
   body.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{if(Skins.buy(b.dataset.buy))api.redraw()});
   body.querySelectorAll('[data-eq]').forEach(b=>b.onclick=()=>{Skins.equip(b.dataset.eq,b.dataset.on==='1');api.redraw()});
  });
 }
 window.addEventListener('sudomi-coins',()=>{const el=document.getElementById('shopScreen');if(el&&!el.classList.contains('hidden')){const b=el.querySelector('.shop-bank b');if(b)b.textContent=Coins.get().toLocaleString('es')}});
 window.SudomiCoins=Coins;window.SudomiShopSkins=Skins;window.SudomiShop={open};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})();
