/* SUDOMI 0.3.38 (V2) — MONEDAS y TIENDA DE SKINS (idea del dueño). Tres cosas en este archivo:
 *
 *   window.SudomiCoins  = {get, add(n, motivo), spend(n)}        monedas del jugador, guardadas en este teléfono ('sudomi-coins')
 *   window.SudomiSkins  = {list, owns, active, buy, equip}       skins compradas y cuál está puesta en cada juego ('sudomi-skins')
 *   window.SudomiShop   = {open}                                 la pantalla «Tienda de skins» (pestaña «Tienda» de la barra de abajo, js/tabbar.js)
 *
 * CÓMO SE GANAN MONEDAS: cumpliendo los retos diarios. Los dos sitios que ya marcaban el reto como cumplido llaman a SudomiCoins.add():
 *   · Sudoku del día  → js/daily.js      (DAILY_COINS, una vez por cada día del calendario)
 *   · Reto del arcade → js/other-games.js (DAILY_COINS, una vez al día)
 *
 * CÓMO SE PONE UNA SKIN: no se toca el juego. Al equiparla, <body> recibe la clase «skin-<juego>-<id>» y este archivo escribe una hoja de estilos
 * (<style id="sudomiSkinCss">) que repinta las piezas. Para una skin nueva: una entrada en SKINS y su CSS en css(). */
(()=>{
 const CKEY='sudomi-coins',SKEY='sudomi-skins',DAILY_COINS=50;
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
 const SKINS=[
  {id:'caps',game:'checkers',gameName:'Damas',name:'Tapitas de refresco',price:150,desc:'Las fichas se cambian por tapas de botella de vidrio: rojas contra azules.',preview:[CAP_RED,CAP_BLUE]}
 ];
 const read=()=>{try{const v=JSON.parse(localStorage.getItem(SKEY));return {own:Array.isArray(v&&v.own)?v.own:[],on:(v&&v.on&&typeof v.on==='object')?v.on:{}}}catch(_){return {own:[],on:{}}}};
 const write=v=>{try{localStorage.setItem(SKEY,JSON.stringify(v))}catch(_){}apply();try{window.dispatchEvent(new CustomEvent('sudomi-skins'))}catch(_){}};   // el aviso sirve para mandársela al rival si estás en una partida online
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
#miniGameStage .checker-piece.sk-caps b{filter:drop-shadow(0 1px 1px #000a)}`;
 }
 function apply(){
  let st=document.getElementById('sudomiSkinCss');
  if(!st){st=document.createElement('style');st.id='sudomiSkinCss';st.textContent=css();document.head.appendChild(st)}
  SKINS.forEach(s=>document.body.classList.toggle(`skin-${s.game}-${s.id}`,Skins.active(s.game)===s.id));
 }

 /* ---------- la pantalla ---------- */
 function open(){
  const S=window.SudomiScreen;if(!S)return;
  S.open('shopScreen','Tienda de skins',(body,api)=>{
   const coins=Coins.get();
   body.innerHTML=`<div class="shop-bank">${coinSvg()}<div><b>${coins.toLocaleString('es')}</b><small>monedas</small></div></div>
    <p class="shop-how">Ganas <b>${DAILY_COINS} monedas</b> por cada reto diario que cumplas: el <b>Sudoku del día</b> y el <b>Reto de hoy</b> del arcade.</p>
    <div class="shop-list">${SKINS.map(s=>{const own=Skins.owns(s.id),on=Skins.active(s.game)===s.id,can=coins>=s.price;
     return `<div class="shop-item${on?' on':''}"><div class="shop-prev">${s.preview.map(u=>`<i style="background-image:${u.replace(/"/g,'&quot;')}"></i>`).join('')}</div>
      <div class="shop-txt"><small>${s.gameName}</small><b>${s.name}</b><p>${s.desc} Tu rival online también las ve.</p></div>
      ${own?`<button type="button" class="shop-btn ${on?'alt':''}" data-eq="${s.id}" data-on="${on?0:1}">${on?'Quitar':'Usar'}</button>`:`<button type="button" class="shop-btn buy" data-buy="${s.id}" ${can?'':'disabled'}>${coinSvg()} ${s.price}</button>`}
      ${own?`<em class="shop-tag">${on?'Puesta':'Comprada'}</em>`:can?'':`<em class="shop-tag miss">Te faltan ${s.price-coins}</em>`}</div>`}).join('')}</div>
    <p class="shop-how small">Pronto habrá más skins. Las monedas y las compras se guardan en este teléfono.</p>`;
   body.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{if(Skins.buy(b.dataset.buy))api.redraw()});
   body.querySelectorAll('[data-eq]').forEach(b=>b.onclick=()=>{Skins.equip(b.dataset.eq,b.dataset.on==='1');api.redraw()});
  });
 }
 window.addEventListener('sudomi-coins',()=>{const el=document.getElementById('shopScreen');if(el&&!el.classList.contains('hidden')){const b=el.querySelector('.shop-bank b');if(b)b.textContent=Coins.get().toLocaleString('es')}});
 window.SudomiCoins=Coins;window.SudomiSkins=Skins;window.SudomiShop={open};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
})();
