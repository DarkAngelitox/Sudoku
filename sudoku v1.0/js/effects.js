/* SUDOMI 0.2.55 — special visual effects (window.SudomiFX). One transparent canvas over the whole page; nothing in the game files changes.
 *   Sudoku: completing a 3×3 box, a row or a column makes it glow in a wave with sparkles; finishing the puzzle fires confetti and a wave over the board.
 *   Otros juegos: the end card of a won game and the big moments (¡Tocado!, ¡Pareja!, ¡Escoba!, Jaque mate, ¡Dominó!…) fire confetti or sparkles.
 * Setting: Configuración → "Efectos especiales" (localStorage['sudomi-fx'] = {on}); html[data-fx="off"] also stops the older CSS celebrations.
 * Phones that ask for reduced motion start with the effects OFF (the player can switch them on). The canvas only runs while something is animating. */
(()=>{
 const KEY='sudomi-fx',root=document.documentElement;
 const reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
 let cfg={on:!reduce};
 try{const v=JSON.parse(localStorage.getItem(KEY));if(v&&typeof v.on==='boolean')cfg.on=v.on}catch(_){}
 const apply=()=>root.setAttribute('data-fx',cfg.on?'on':'off');apply();
 const COLORS=['#0b4fb3','#d6293e','#f3c844','#ffffff','#1fa35b','#2a7de1','#ff8a3d'];
 const GOLD=['#ffd34d','#fff3b0','#ffffff'];
 let cv=null,cx=null,W=0,H=0,dpr=1,parts=[],raf=0,last=0;
 const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
 function ensure(){
  if(cv)return;cv=document.createElement('canvas');cv.setAttribute('aria-hidden','true');cv.id='fxCanvas';
  cv.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9700';
  document.body.appendChild(cv);cx=cv.getContext('2d');size();window.addEventListener('resize',size);
 }
 function size(){if(!cv)return;dpr=Math.min(window.devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*dpr;cv.height=H*dpr}
 function start(){if(!raf){last=performance.now();raf=requestAnimationFrame(loop)}}
 function loop(t){
  raf=0;const dt=Math.min((t-last)/1000,.05);last=t;
  cx.setTransform(dpr,0,0,dpr,0,0);cx.clearRect(0,0,W,H);
  const now=performance.now();
  parts=parts.filter(p=>{
   if(now<p.at)return true;
   const age=(now-p.at)/1000;if(age>p.life)return false;
   const k=age/p.life;cx.save();
   if(p.kind==='glow'){
    const a=Math.sin(Math.PI*Math.min(1,k))*p.a;cx.globalAlpha=a;cx.fillStyle=p.color;
    const r=p.r,x=p.x-p.w*(1+k*.25)/2,y=p.y-p.h*(1+k*.25)/2,w=p.w*(1+k*.25),h=p.h*(1+k*.25);
    cx.shadowColor=p.color;cx.shadowBlur=18;cx.beginPath();cx.roundRect?cx.roundRect(x,y,w,h,r):cx.rect(x,y,w,h);cx.fill();
   }else{
    p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=p.drag;p.rot+=p.vr*dt;
    cx.globalAlpha=k>.7?(1-k)/.3:1;cx.translate(p.x,p.y);cx.rotate(p.rot);cx.fillStyle=p.color;
    if(p.kind==='conf'){cx.scale(1,Math.abs(Math.cos(age*p.flip)));cx.fillRect(-p.s/2,-p.s/3,p.s,p.s*.66)}
    else{cx.shadowColor=p.color;cx.shadowBlur=8;star(p.s*(1-k*.5))}
   }
   cx.restore();return p.y<H+40;
  });
  if(parts.length)raf=requestAnimationFrame(loop);else cx.clearRect(0,0,W,H);
 }
 function star(s){cx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?s*.35:s;cx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}cx.closePath();cx.fill()}
 const add=p=>{ensure();parts.push(p);start()};
 /* ---- public effects ---- */
 function confetti(x,y,n=90,spread=1){
  if(!cfg.on)return;x=x==null?W/2||innerWidth/2:x;y=y==null?innerHeight*.35:y;
  for(let i=0;i<n;i++){const a=rnd(-Math.PI,0)+rnd(-.3,.3)*spread,sp=rnd(220,620);
   add({kind:'conf',x,y,vx:Math.cos(a)*sp*spread,vy:Math.sin(a)*sp,g:rnd(520,760),drag:.992,rot:rnd(0,6),vr:rnd(-9,9),s:rnd(7,13),color:pick(COLORS),life:rnd(1.8,3),at:performance.now()+rnd(0,160),flip:rnd(6,14)})}
 }
 function sparks(x,y,n=14,colors=GOLD,delay=0,power=1){
  if(!cfg.on)return;
  for(let i=0;i<n;i++){const a=rnd(0,Math.PI*2),sp=rnd(60,260)*power;
   add({kind:'spark',x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-40,g:260,drag:.95,rot:rnd(0,6),vr:rnd(-6,6),s:rnd(4,9)*power,color:pick(colors),life:rnd(.5,1),at:performance.now()+delay})}
 }
 function glow(rect,delay=0,color='#ffd34d',a=.5,life=.7){
  if(!cfg.on||!rect)return;
  add({kind:'glow',x:rect.left+rect.width/2,y:rect.top+rect.height/2,w:rect.width,h:rect.height,r:Math.min(rect.width,rect.height)*.18,color,a,life,at:performance.now()+delay});
 }
 const cellEl=i=>document.querySelector(`#board .cell[data-i="${i}"]`);
 function wave(idx,order,color,a,life,spark=4){
  idx.forEach((i,k)=>{const el=cellEl(i);if(!el)return;const r=el.getBoundingClientRect(),d=order?order[k]*55:k*55;
   glow(r,d,typeof color==='function'?color(i):color,a,life);if(spark)sparks(r.left+r.width/2,r.top+r.height/2,spark,GOLD,d+80,.6)});
 }
 /* ---- Sudoku: completed box / row / column ---- */
 const UNITS=[];for(let n=0;n<9;n++){
  UNITS.push({id:'r'+n,cells:[...Array(9)].map((_,c)=>n*9+c),kind:'line'});
  UNITS.push({id:'c'+n,cells:[...Array(9)].map((_,r)=>r*9+n),kind:'line'});
  const br=Math.floor(n/3)*3,bc=(n%3)*3,cells=[];for(let r=0;r<3;r++)for(let c=0;c<3;c++)cells.push((br+r)*9+bc+c);
  UNITS.push({id:'b'+n,cells,kind:'box'});
 }
 let curKey='',done=new Set();
 const doneSet=g=>{const s=new Set();for(const u of UNITS)if(u.cells.every(i=>g.board[i]&&g.board[i]===g.solution[i]))s.add(u.id);return s};
 function checkSudoku(){
  const ui=window.SudomiCore&&SudomiCore.ui,g=ui&&ui.game;if(!g||!g.board||!g.solution||!g.puzzle)return;
  const key=g.puzzle.join('')+(g.daily?'d':'');
  if(key!==curKey){curKey=key;done=doneSet(g);return}          // a game just loaded: no effects for what was already complete
  const now=doneSet(g),full=g.board.every((v,i)=>v===g.solution[i]);
  if(cfg.on&&!full){
   for(const u of UNITS){if(now.has(u.id)&&!done.has(u.id)){
    if(u.kind==='box'){const order=u.cells.map((_,k)=>Math.abs((k%3)-1)+Math.abs(Math.floor(k/3)-1));wave(u.cells,order,'#ffd34d')}
    else wave(u.cells,null,u.id[0]==='r'?'#5ec3ff':'#9be26b');
   }}
  }
  done=now;
 }
 function finale(){
  if(!cfg.on)return;
  const g=window.SudomiCore&&SudomiCore.ui&&SudomiCore.ui.game;
  if(g){const idx=[...Array(81).keys()];wave(idx,idx.map(i=>(Math.floor(i/9)+i%9)*.6),i=>'hsl('+((Math.floor(i/9)+i%9)*22)+',90%,60%)',.3,.55,0)}
  confetti(innerWidth*.2,innerHeight*.45,70,1);confetti(innerWidth*.8,innerHeight*.45,70,1);
  setTimeout(()=>confetti(innerWidth/2,innerHeight*.3,90,1.2),450);
 }
 /* ---- Otros juegos ---- */
 const RULES=[
  [/jaque\s*mate|¡escoba|¡dominó|¡rummy|hundi|gana la partida/i,'big'],[/tornado|súper|rebobinar|¡dos!/i,'big'],
  [/tocado|¡pareja|captur|barri/i,'small'],[/jaque/i,'small']
 ];
 const E=s=>window.SudomiI18n?SudomiI18n.esLine(s):s; // en otros idiomas, vuelve a leer el texto en español
 let prev=new Set(),endSeen=null,vicSeen=null,queued=false;
 function where(stage,line){
  const el=[...stage.querySelectorAll('*')].find(e=>e.children.length===0&&e.textContent.trim()===line);
  const r=(el||stage).getBoundingClientRect();return {x:r.left+r.width/2,y:el?r.top+r.height/2:r.top+80};
 }
 function scan(){
  queued=false;const scr=document.getElementById('miniGamesScreen');
  if(!scr||scr.classList.contains('hidden')){prev=new Set();endSeen=vicSeen=null;return}
  const stage=scr.querySelector('#miniGameStage')||scr;
  const vic=stage.querySelector('.victory-awaiting');
  if(vic&&vic!==vicSeen){vicSeen=vic;confetti(innerWidth/2,innerHeight*.4,80)}if(!vic)vicSeen=null;
  const card=stage.querySelector('.game-end-card');
  if(card&&card!==endSeen){
   endSeen=card;const w=E((card.querySelector('strong')||{}).textContent||'');
   if(/empate|tablas/i.test(w))sparks(innerWidth/2,innerHeight*.4,20,COLORS,0,1.2);
   else if(!/sin ganador|computadora|\(IA\)/i.test(w)){confetti(innerWidth*.25,innerHeight*.5,70);confetti(innerWidth*.75,innerHeight*.5,70)}
   return;
  }
  if(!card)endSeen=null;
  const now=new Set(),text=stage.innerText||'';
  for(const line of text.split('\n')){const l=line.trim();if(!l||l.length>200)continue;for(const [re,k] of RULES)if(re.test(E(l))){now.add(k+'|'+l);break}}
  const fresh=[...now].filter(k=>!prev.has(k));prev=now;
  fresh.slice(0,2).forEach(k=>{const [kind,line]=[k.split('|')[0],k.slice(k.indexOf('|')+1)],p=where(stage,line);
   if(kind==='big'){confetti(p.x,p.y,45,.8);sparks(p.x,p.y,24,COLORS,0,1.3)}else sparks(p.x,p.y,16,GOLD,0,1)});
 }
 function boot(){
  const scr=document.getElementById('miniGamesScreen');
  if(scr)new MutationObserver(()=>{if(!queued&&cfg.on){queued=true;requestAnimationFrame(scan)}}).observe(scr,{childList:true,subtree:true,characterData:true});
  const ui=window.SudomiCore&&SudomiCore.ui;
  if(ui&&ui.render){const o=ui.render.bind(ui);ui.render=function(...a){const r=o(...a);try{requestAnimationFrame(checkSudoku)}catch(_){}return r}}
  window.addEventListener('sudomi-win',()=>setTimeout(finale,350));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
 window.SudomiFX={
  get on(){return cfg.on},
  set(on){cfg.on=!!on;try{localStorage.setItem(KEY,JSON.stringify(cfg))}catch(_){}apply();if(!cfg.on){parts=[];if(cx)cx.clearRect(0,0,W,H)}},
  demo(){confetti(innerWidth/2,innerHeight*.4,70);sparks(innerWidth/2,innerHeight*.4,20,COLORS,0,1.2)},
  confetti,sparks,glow,finale
 };
})();
