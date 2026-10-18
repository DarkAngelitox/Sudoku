/* SUDOMI 0.3.95 — PALABRA OCULTA y AHORCADO (window.SudomiOculta, window.SudomiAhorcado). Pedido del dueño (15 oct 2026).
 * Se abren desde el arcade igual que Batalla naval: open({hub,stage,exit}, 'pve' | 'pvp' | 'online' | 'join', código).
 * DICCIONARIO: js/words-es.js y js/words-en.js (window.SUDOMI_WORDS). Se compara SIN tildes y la Ñ es letra propia. Al adivinar también valen
 *   plurales y verbos conjugados (derive): esas formas no salen nunca como palabra secreta.
 * PALABRA OCULTA: cada letra se pinta VERDE (en su sitio), AMARILLO (está, pero en otro sitio) o ROJO (no está).
 *   Modos: 4 letras con 4 intentos, 5 con 6, 6 con 6 y 7 letras con intentos sin límite; y la palabra del día (5 letras, una por día e idioma).
 *   1 contra 1 (mismo teléfono u online): cada uno le elige al otro una palabra del diccionario con un buscador. Gana quien la adivina en menos
 *   intentos; si empatan, el más rápido.
 * AHORCADO: contra la máquina (palabra al azar) o por equipos 1v1, 1v2, 2v2 y 3v1 (mismo teléfono u online). Un equipo elige la palabra (con el
 *   buscador) y el otro la adivina letra por letra, turnándose sus jugadores. 6 fallos completan el muñeco. 4 rondas, alternando quién elige.
 *   Puntos: adivinarla da 1 + las vidas que sobren; si no la adivinan, el equipo que la eligió suma 3.
 * ONLINE: js/party-net.js. El anfitrión lleva la partida y manda a cada teléfono solo lo que puede ver (la palabra secreta nunca viaja a quien la
 *   tiene que adivinar). Los asientos vacíos los juega la máquina. */
(()=>{
 const esc=t=>String(t==null?'':t).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const clean=n=>String(n||'').replace(/[<>&"']/g,'').replace(/\s+/g,' ').trim().slice(0,14);
 const NORM=w=>String(w).toLowerCase().replace(/ñ/g,'\u0001').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\u0001/g,'ñ');
 const snd=n=>{try{window.SudomiSound&&SudomiSound.play(n)}catch(_){}};
 const P=()=>window.SudomiProfile,myName=()=>(P()&&P().name&&P().name())||'Jugador 1',myAvatar=()=>(P()&&P().avatar&&P().avatar())||'🙂';
 const rnd=a=>a[Math.random()*a.length|0];
 const dayKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
 const store={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(_){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}}};
 const LANGS={es:'Español',en:'English'};
 let lang=store.get('sudomi-words-lang',null)||((window.SudomiI18n&&SudomiI18n.lang&&SudomiI18n.lang()==='en')?'en':'es');
 const setLang=l=>{if(LANGS[l]){lang=l;store.set('sudomi-words-lang',l)}};

 /* ================= diccionario ================= */
 const D={};
 function derive(L,n){
  const out=[];
  if(L==='es'){
   const last=n.slice(-1);out.push('aeiou'.includes(last)?n+'s':last==='z'?n.slice(0,-1)+'ces':n+'es');
   if(last==='o')out.push(n.slice(0,-1)+'a',n.slice(0,-1)+'as');
   if(/[aei]r$/.test(n)&&n.length>3){const s=n.slice(0,-2),E={ar:['o','as','a','amos','an','e','es','en','e','o','aba','aban','ado','ada','ando','aste','aron','are','ara'],
     er:['o','es','e','emos','en','a','as','an','i','io','ia','ian','ido','ida','iendo','iste','ieron'],ir:['o','es','e','imos','en','a','as','an','i','io','ia','ian','ido','ida','iendo','iste','ieron']}[n.slice(-2)];
    E.forEach(e=>out.push(s+e))}
  }else{
   out.push(/(s|x|z|ch|sh)$/.test(n)?n+'es':/[^aeiou]y$/.test(n)?n.slice(0,-1)+'ies':n+'s');
   if(n.endsWith('e'))out.push(n+'d',n.slice(0,-1)+'ing',n+'r',n+'st');
   else if(/[^aeiou]y$/.test(n))out.push(n.slice(0,-1)+'ied',n+'ing',n.slice(0,-1)+'ier');
   else out.push(n+'ed',n+'ing',n+'er',n+'est');
  }
  return out;
 }
 function dict(L){
  if(D[L])return D[L];
  const seen=new Map();
  for(const w of ((window.SUDOMI_WORDS||{})[L]||'').split(/\s+/)){if(!w)continue;const n=NORM(w);if(!/^[a-zñ]+$/.test(n))continue;const o=seen.get(n);if(!o||(o===n&&w!==n))seen.set(n,w)}   // la forma con tilde gana
  const list=[...seen].map(([n,w])=>({n,w})),by={},ok=new Set(seen.keys());
  list.forEach(x=>{(by[x.n.length]=by[x.n.length]||[]).push(x);derive(L,x.n).forEach(f=>ok.add(f))});
  return D[L]={list,by,ok,map:seen};
 }
 const show=(L,n)=>dict(L).map.get(n)||n;   // cómo se escribe (con tilde)
 const ROWS={es:['qwertyuiop','asdfghjklñ','⏎zxcvbnm⌫'],en:['qwertyuiop','asdfghjkl','⏎zxcvbnm⌫']};
 // buscador de palabras: solo deja elegir palabras del diccionario (len: largo exacto, o [min,max])
 function pickerHTML(id,L,len,title,sub){
  return `<div class="wd-pick" id="${id}"><h3>${esc(title)}</h3>${sub?`<p class="wd-note">${sub}</p>`:''}
   <div class="wd-searchrow"><input type="search" class="wd-search" placeholder="${L==='en'?'Search a word…':'Busca una palabra…'}" autocomplete="off" autocapitalize="off" spellcheck="false"><button type="button" class="arc-btn wd-rand">🎲 Al azar</button></div>
   <div class="wd-results" role="listbox"></div><p class="wd-chosen" hidden></p><button type="button" class="arc-btn pc-big wd-ok" disabled>✔ Elegir esta palabra</button></div>`;
 }
 function bindPicker(root,L,len,onPick){
  const box=root.querySelector('.wd-pick');if(!box)return;
  const inp=box.querySelector('.wd-search'),res=box.querySelector('.wd-results'),okb=box.querySelector('.wd-ok'),ch=box.querySelector('.wd-chosen');
  const pool=dict(L).list.filter(x=>Array.isArray(len)?x.n.length>=len[0]&&x.n.length<=len[1]:x.n.length===len);
  let sel=null;
  const choose=x=>{sel=x;ch.hidden=false;ch.innerHTML=`Elegiste: <b>${esc(x.w.toUpperCase())}</b> · ${x.n.length} letras`;okb.disabled=false;res.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.n===x.n))};
  const draw=()=>{const q=NORM(inp.value.trim());let m=q?pool.filter(x=>x.n.includes(q)):pool.slice();
   if(q)m.sort((a,b)=>(b.n.startsWith(q)-a.n.startsWith(q))||a.n.localeCompare(b.n));else m=m.slice().sort(()=>Math.random()-.5);
   res.innerHTML=m.slice(0,90).map(x=>`<button type="button" data-n="${x.n}" class="${sel&&sel.n===x.n?'on':''}">${esc(x.w)}</button>`).join('')||`<p class="wd-note">No hay palabras con «${esc(inp.value)}» de ese largo.</p>`;
   res.querySelectorAll('button').forEach(b=>b.onclick=()=>choose(pool.find(x=>x.n===b.dataset.n)))};
  inp.oninput=draw;box.querySelector('.wd-rand').onclick=()=>{const x=rnd(pool);inp.value='';draw();choose(x)};
  okb.onclick=()=>{if(sel)onPick(sel.n)};draw();
 }
 function sheet(root,html){const s=document.createElement('div');s.className='pc-sheet';s.innerHTML=`<div class="pc-sheet-in">${html}<button class="arc-btn" type="button" data-close>Entendido</button></div>`;s.onclick=e=>{if(e.target===s||e.target.closest('[data-close]'))s.remove()};root.appendChild(s)}
 const curtainHTML=(title,text,btn)=>`<div class="wd-curtain"><span>🔒</span><h3>${title}</h3><p>${text}</p><button class="arc-btn pc-big" type="button" id="wdReady">${btn}</button></div>`;
 const langHTML=()=>`<div class="pc-opt"><b>Idioma de las palabras</b><div class="wd-chips">${Object.keys(LANGS).map(k=>`<button type="button" data-lang="${k}" class="${k===lang?'on':''}">${LANGS[k]}</button>`).join('')}</div></div>`;
 const bindChips=(root,attr,cb)=>root.querySelectorAll(`[data-${attr}]`).forEach(b=>b.onclick=()=>{root.querySelectorAll(`[data-${attr}]`).forEach(x=>x.classList.toggle('on',x===b));cb(b.dataset[attr])});
 const inviteUrl=(game,code)=>{const base=location.origin&&location.origin!=='null'?location.origin+location.pathname:location.href.split(/[?#]/)[0];return `${base}?game=${game}&room=${code}`};
 const arcade=(game,won)=>{try{window.dispatchEvent(new CustomEvent('sudomi-arcade',{detail:{game,won:!!won}}))}catch(_){}};
 // teclas del teclado de verdad (PC): solo cuando el juego está a la vista y no se escribe en un campo
 let keyHandler=null;
 document.addEventListener('keydown',e=>{if(!keyHandler||e.ctrlKey||e.metaKey||e.altKey)return;const t=e.target;if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'))return;
  const k=e.key==='Enter'?'⏎':e.key==='Backspace'?'⌫':e.key.length===1?NORM(e.key):'';if(!k||!/^[a-zñ⏎⌫]$/.test(k))return;if(keyHandler(k)!==false)e.preventDefault()});

 /* ================================================================ PALABRA OCULTA ================================================================ */
 const O_GAME='oculta',O_NAME='Palabra Oculta';
 const MODES={4:{len:4,max:4},5:{len:5,max:6},6:{len:6,max:6},7:{len:7,max:Infinity}};
 const score=(g,t)=>{const r=Array(g.length).fill('r'),left={};for(let i=0;i<t.length;i++){if(g[i]===t[i])r[i]='g';else left[t[i]]=(left[t[i]]||0)+1}
  for(let i=0;i<g.length;i++)if(r[i]!=='g'&&left[g[i]]>0){r[i]='y';left[g[i]]--}return r};
 const O={ui:null,mode:'pve',len:5,free:store.get('sudomi-oculta-free',false),S:null,net:{role:'solo',room:null,conn:null,code:'',seats:[],me:0,started:false,status:'',tok:0},H:null,V:null};
 const o$=s=>O.ui.stage.querySelector(s);
 const oHead=()=>`<div class="dos-head"><div><h2>${O_NAME}</h2></div><div class="dos-actions"><button class="game-restart" id="wdRules" aria-label="Reglas">?</button></div></div>`;
 const oRules=()=>`<h3>${O_NAME}</h3><ul><li>Adivina la palabra escondida. Escribe una palabra del largo pedido y toca <b>⏎</b>.</li>
  <li>Cada letra se pinta: <b class="wd-k g">verde</b> si está en su sitio, <b class="wd-k y">amarilla</b> si está en la palabra pero en otro sitio, y <b class="wd-k r">roja</b> si no está.</li>
  <li>Modos: <b>4 letras</b> con 4 intentos, <b>5 letras</b> con 6, <b>6 letras</b> con 6 y <b>7 letras</b> con intentos sin límite.</li>
  <li>Las tildes no cuentan (á = a). La <b>Ñ</b> es una letra aparte.</li><li><b>Palabra del día</b>: la misma para todos, una vez al día.</li>
  <li><b>1 contra 1</b>: cada uno le elige al otro una palabra del diccionario. Gana quien la adivine en menos intentos; si empatan, el más rápido.</li>
  <li><b>Modo libre</b>: acepta cualquier palabra al adivinar, aunque no esté en el diccionario.</li></ul>`;
 const dailyLog=()=>store.get('sudomi-oculta-daily',{});
 function dailyWord(L){const list=(dict(L).by[5]||[]);let h=0;for(const c of dayKey()+L+'sudomi')h=(h*31+c.charCodeAt(0))>>>0;return list[h%list.length].n}
 // una partida de una persona: target = palabra (normalizada), max = intentos
 const newSolo=(L,len,max,target)=>({L,len,max,target,rows:[],cur:'',over:false,won:false,t0:Date.now(),t1:0,msg:''});
 function guess(S){
  if(S.over)return 'over';
  if(S.cur.length!==S.len)return 'short';
  if(!O.free&&!dict(S.L).ok.has(S.cur))return 'unknown';
  const r=score(S.cur,S.target);S.rows.push({g:S.cur,r});S.cur='';
  if(r.every(x=>x==='g')){S.over=true;S.won=true;S.t1=Date.now()}
  else if(S.rows.length>=S.max){S.over=true;S.t1=Date.now()}
  return 'ok';
 }
 function keyState(rows){const k={};rows.forEach(({g,r})=>[...g].forEach((c,i)=>{const v=r[i],o=k[c];if(v==='g'||(v==='y'&&o!=='g')||(!o))k[c]=v}));return k}
 function boardHTML(S,anim){
  const N=S.max===Infinity?Math.max(6,S.rows.length+(S.over?0:1)):S.max,rows=[];
  for(let i=0;i<N;i++){
   const done=S.rows[i],live=!done&&i===S.rows.length&&!S.over;
   const cells=Array.from({length:S.len},(_,k)=>{const c=done?done.g[k]:live?S.cur[k]||'':'';const cls=done?done.r[k]:'';
    return `<span class="wd-t ${cls}${c&&!done?' typed':''}${done&&anim&&i===S.rows.length-1?' rev':''}" style="--k:${k}">${c?esc(c.toUpperCase()):''}</span>`}).join('');
   rows.push(`<div class="wd-row${live?' live':''}${live&&S.bad?' shake':''}" style="--n:${S.len}">${cells}</div>`);
  }
  return `<div class="wd-board${S.max===Infinity?' inf':''}" id="wdBoard">${rows.join('')}</div>`;
 }
 function kbdHTML(L,states){return `<div class="wd-kbd">${ROWS[L].map(r=>`<div>${[...r].map(c=>`<button type="button" data-k="${c}" class="${c==='⏎'||c==='⌫'?'wide':''} ${states[c]||''}">${c==='⏎'?(L==='en'?'ENTER':'ENVIAR'):c==='⌫'?'⌫':c.toUpperCase()}</button>`).join('')}</div>`).join('')}</div>`}
 function oStop(){keyHandler=null;O.S=null;O.H=null;O.V=null;O.view=null}
 function oMenu(){
  oStop();oLeaveNet();const m=O.mode,net=O.net;
  const lens=Object.keys(MODES).map(k=>`<button type="button" data-len="${k}" class="${+k===O.len?'on':''}"><b>${k} letras</b><small>${MODES[k].max===Infinity?'intentos sin límite':MODES[k].max+' intentos'}</small></button>`).join('');
  const dl=dailyLog()[dayKey()+lang];
  O.ui.stage.innerHTML=`<div class="mini-game wd">${oHead()}<div class="wd-menu">${net.status?`<p class="pc-note bad">${esc(net.status)}</p>`:''}
   <div class="pc-hero">🔠<b>${O_NAME}</b><span>${m==='pve'?'Adivina la palabra escondida: verde, en su sitio; amarillo, en otro sitio; rojo, no está.':m==='pvp'?'Uno contra uno en este teléfono: cada uno le elige al otro una palabra.':'Uno contra uno por internet: cada uno le elige al otro una palabra y adivinan a la vez.'}</span></div>
   ${langHTML()}<div class="pc-opt"><b>Largo de la palabra</b><div class="wd-modes">${lens}</div></div>
   <label class="nv-check"><input type="checkbox" id="wdFree" ${O.free?'checked':''}><span>Modo libre: aceptar cualquier palabra al adivinar</span></label>
   <button class="arc-btn pc-big" id="wdStart">${m==='online'?'🌐 Crear sala':m==='pvp'?'▶ Empezar el duelo':'▶ Jugar'}</button>
   ${m==='pve'?`<button class="arc-btn wd-daily${dl?' done':''}" id="wdDaily">${dl?(dl.won?`✅ Palabra del día: en ${dl.tries} intentos`:'❌ Palabra del día: mañana hay otra'):'📅 Palabra del día (5 letras)'}</button>`:''}</div></div>`;
  net.status='';o$('#wdRules').onclick=()=>sheet(o$('.wd'),oRules());
  bindChips(O.ui.stage,'lang',l=>setLang(l));bindChips(O.ui.stage,'len',v=>{O.len=+v});
  o$('#wdFree').onchange=e=>{O.free=e.target.checked;store.set('sudomi-oculta-free',O.free)};
  o$('#wdStart').onclick=m==='online'?oCreateRoom:m==='pvp'?oDuelLocal:()=>oSolo(false);
  const d=o$('#wdDaily');if(d)d.onclick=()=>{if(dailyLog()[dayKey()+lang])return;oSolo(true)};
 }
 /* ---- solo ---- */
 function oSolo(daily){
  const M=MODES[daily?5:O.len],L=lang,target=daily?dailyWord(L):rnd(dict(L).by[M.len]).n;
  O.S=newSolo(L,M.len,M.max,target);O.S.daily=!!daily;oPlay();
 }
 function oPlay(){
  const S=O.S;if(!S)return;
  keyHandler=k=>{if(!O.S||O.S!==S||S.over||!o$('#wdBoard'))return false;oKey(S,k)};
  oDraw(false);
 }
 function oKey(S,k,after){
  if(S.over)return;S.bad=false;
  if(k==='⌫'){S.cur=S.cur.slice(0,-1);snd('tap')}
  else if(k==='⏎'){
   const r=after?after(S.cur):guess(S);
   if(r==='short'){S.msg=`Faltan letras: la palabra tiene ${S.len}.`;S.bad=true;snd('gbad')}
   else if(r==='unknown'){S.msg='Esa palabra no está en el diccionario. (Puedes activar el «Modo libre» en el menú.)';S.bad=true;snd('gbad')}
   else if(r==='ok'||r==='sent'){S.msg='';if(r==='ok')return oAfterGuess(S)}
  }
  else if(S.cur.length<S.len){S.cur+=k;snd('tap')}
  oDraw(false);
 }
 function oAfterGuess(S){
  const last=S.rows[S.rows.length-1],gs=last?last.r.filter(x=>x==='g').length:0;
  oDraw(true);setTimeout(()=>snd(S.won?'bonus':gs?'good':'miss'),S.len*120);
  if(S.over)setTimeout(()=>oFinish(S),S.len*130+500);
 }
 function oShare(S){return `SUDOMI · ${O_NAME} ${S.daily?dayKey()+' ':''}${S.won?S.rows.length:'X'}/${S.max===Infinity?'∞':S.max}\n`+S.rows.map(r=>r.r.map(x=>x==='g'?'🟩':x==='y'?'🟨':'🟥').join('')).join('\n')}
 function oFinish(S){
  if(O.S!==S)return;
  if('duel' in S)return oDuelNext(S);
  if(S.daily){const L=dailyLog();L[dayKey()+S.L]={won:S.won,tries:S.rows.length};store.set('sudomi-oculta-daily',L)}
  arcade(O_GAME,S.won);snd(S.won?'win':'lose');if(S.won)try{window.SudomiFX&&SudomiFX.confetti&&SudomiFX.confetti()}catch(_){}
  const st=store.get('sudomi-oculta-stats',{});const k=S.len+S.L;st[k]=st[k]||{p:0,w:0,streak:0,best:0};st[k].p++;if(S.won){st[k].w++;st[k].streak++;st[k].best=Math.max(st[k].best,st[k].streak)}else st[k].streak=0;store.set('sudomi-oculta-stats',st);
  const word=show(S.L,S.target).toUpperCase(),secs=Math.round((S.t1-S.t0)/1000);
  window.SudomiResult&&SudomiResult.show(o$('.wd'),{kind:S.won?'win':'lose',game:O_NAME.toUpperCase(),title:S.won?'¡La encontraste!':'Era: '+word,
   sub:S.won?`${word} en ${S.rows.length} ${S.rows.length===1?'intento':'intentos'} · ${secs} s`:`Te quedaste sin intentos.`,
   detail:`Racha: ${st[k].streak} · mejor racha: ${st[k].best} · ganadas ${st[k].w} de ${st[k].p}`,
   again:S.daily?null:()=>oSolo(false),againLabel:'Otra palabra',exit:()=>O.ui.exit(),share:oShare(S)});
 }
 function oDraw(anim){
  const S=O.S||O.V;if(!S||!O.ui)return;
  const vs=S.vs?`<div class="wd-vs">${S.vs}</div>`:'';
  O.ui.stage.innerHTML=`<div class="mini-game wd">${oHead()}${vs}<p class="wd-msg${S.bad?' bad':''}" role="status">${esc(S.msg||(S.over?'':S.max===Infinity?`Intento ${S.rows.length+1}`:`Intento ${S.rows.length+1} de ${S.max}`))}</p>
   ${boardHTML(S,anim)}${kbdHTML(S.L,keyState(S.rows))}<p class="board-hint">${S.L==='en'?'Palabras en inglés':'Palabras en español'} · ${S.len} letras${O.free?' · modo libre':''}</p></div>`;
  o$('#wdRules').onclick=()=>sheet(o$('.wd'),oRules());
  O.ui.stage.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>keyHandler&&keyHandler(b.dataset.k));
  const bd=o$('#wdBoard');if(bd&&S.max===Infinity)bd.scrollTop=bd.scrollHeight;
 }
 /* ---- 1 contra 1 en este teléfono: A elige para B, B juega; B elige para A, A juega ---- */
 function oDuelLocal(){
  const L=lang,M=MODES[O.len];O.H={L,M,names:['Jugador 1','Jugador 2'],res:[null,null],step:0};oDuelStep();
 }
 function oDuelStep(){
  const H=O.H;if(!H)return;keyHandler=null;const st=H.step,picker=st===0?0:1,player=1-picker;
  if(st>=2)return oDuelEnd();
  O.ui.stage.innerHTML=`<div class="mini-game wd">${oHead()}${curtainHTML(`${H.names[picker]} elige`,`Que <b>${H.names[player]}</b> no mire: ${H.names[picker]} le va a elegir una palabra de ${H.M.len} letras.`,`Soy ${H.names[picker]}`)}</div>`;
  o$('#wdRules').onclick=()=>sheet(o$('.wd'),oRules());
  o$('#wdReady').onclick=()=>{
   O.ui.stage.innerHTML=`<div class="mini-game wd">${oHead()}${pickerHTML('wdPick',H.L,H.M.len,`${H.names[picker]}: elige la palabra para ${H.names[player]}`,'Solo puedes elegir palabras del diccionario.')}</div>`;
   bindPicker(O.ui.stage,H.L,H.M.len,n=>{
    O.ui.stage.innerHTML=`<div class="mini-game wd">${oHead()}${curtainHTML(`Le toca a ${H.names[player]}`,`Pasa el teléfono a <b>${H.names[player]}</b> para que adivine la palabra.`,`Soy ${H.names[player]}`)}</div>`;
    o$('#wdReady').onclick=()=>{O.S=newSolo(H.L,H.M.len,H.M.max,n);O.S.duel=player;O.S.vs=`<b>${H.names[player]}</b> adivina la palabra de ${H.names[picker]}`;oPlay()};
   });
  };
 }
 function oDuelNext(S){const H=O.H;if(!H)return;H.res[S.duel]={won:S.won,tries:S.rows.length,ms:S.t1-S.t0,word:S.target};H.step++;snd(S.won?'bonus':'lose');
  setTimeout(()=>{if(O.H!==H)return;O.S=null;oDuelStep()},1400)}
 const duelWinner=res=>{const sc=r=>r?(r.won?r.tries:1e6):1e7;const a=sc(res[0]),b=sc(res[1]);if(a!==b)return a<b?0:1;if(!res[0]||!res[0].won)return -1;return res[0].ms===res[1].ms?-1:res[0].ms<res[1].ms?0:1};
 function oDuelEnd(){
  const H=O.H;O.H=null;O.S=null;const w=duelWinner(H.res),line=k=>{const r=H.res[k];return `${H.names[k]}: ${r.won?`${r.tries} intentos (${Math.round(r.ms/1000)} s)`:'no la adivinó'} · era ${show(H.L,r.word).toUpperCase()}`};
  arcade(O_GAME,true);snd(w<0?'draw':'win');
  window.SudomiResult&&SudomiResult.show(o$('.wd'),{kind:w<0?'draw':'win',game:O_NAME.toUpperCase()+' · 1 CONTRA 1',title:w<0?'¡Empate!':`¡Gana ${H.names[w]}!`,sub:line(0),detail:line(1),again:oDuelLocal,exit:()=>O.ui.exit()});
 }
 /* ---- 1 contra 1 online: el anfitrión guarda las dos palabras y corrige los intentos de los dos ---- */
 const oPub=()=>O.net.seats.map(s=>({kind:s.kind,name:s.name,avatar:s.avatar,away:!!s.away}));
 function oRenderLobby(){
  const net=O.net,host=net.role==='host';
  O.ui.stage.innerHTML=`<div class="mini-game wd">${oHead()}<div id="lbRoot"></div></div>`;o$('#wdRules').onclick=()=>sheet(o$('.wd'),oRules());
  if(!window.SudomiLobby){o$('#lbRoot').textContent=net.status||'Creando sala…';return}
  SudomiLobby.render(o$('#lbRoot'),{game:O_GAME,gameName:O_NAME,code:net.code||null,url:net.code?inviteUrl(O_GAME,net.code):'',host,fixed:true,
   seats:net.seats.map((s,k)=>({state:k===net.me&&s.kind==='human'?'me':s.kind==='open'?'open':s.kind==='ai'?'ai':s.away?'away':'human',name:s.name,avatar:s.avatar})),
   extra:`<p class="pc-note">${LANGS[net.lang||lang]} · ${net.len||O.len} letras · ${MODES[net.len||O.len].max===Infinity?'intentos sin límite':MODES[net.len||O.len].max+' intentos'}</p>`,
   startLabel:'▶ Empezar el duelo',canStart:!!net.code,onStart:host?oStartOnline:undefined,
   onAI:i=>{if(!host||net.started||!net.seats[i]||net.seats[i].kind!=='open')return;Object.assign(net.seats[i],{kind:'ai',name:'Profe Letras',avatar:'🦉'});oPushLobby()},
   status:net.status,hint:host?'Comparte el código o invita a un amigo. Si nadie entra, juega la máquina.':''});
 }
 function oPushLobby(){const net=O.net;if(net.role!=='host')return;const s=net.seats[1];if(s&&s.id&&net.room)net.room.send(s.id,{t:'lobby',seats:oPub(),code:net.code,lang,len:O.len});if(!net.started)oRenderLobby()}
 async function oCreateRoom(){
  if(P()&&P().get&&!P().get()){P().ensure(()=>oCreateRoom());return}
  const net=O.net;if(!window.SudomiParty){net.status='Este navegador no puede crear salas.';return oMenu()}
  const my=++net.tok;Object.assign(net,{role:'host',code:'',started:false,status:'',me:0,room:null,lang,len:O.len});
  net.seats=[{kind:'human',id:'host',name:myName(),avatar:myAvatar()},{kind:'open'}];oRenderLobby();
  try{const room=await SudomiParty.host(O_GAME,oOnHost);if(my!==net.tok){room.close();return}net.room=room;net.code=room.code;oRenderLobby()}
  catch(e){if(my!==net.tok)return;net.role='solo';net.status=(e&&e.message)||'No se pudo crear la sala.';oMenu()}
 }
 function oOnHost(e){
  const net=O.net;if(net.role!=='host')return;const s=net.seats[1];
  if(e.type==='join'){
   if(s.id===e.id)s.away=false;
   else if(s.kind!=='open'||net.started){net.room.reject(e.id,net.started?'La partida ya empezó.':'La sala está llena.');return}
   else Object.assign(s,{kind:'human',id:e.id,name:clean((e.meta||{}).n)||'Amigo',avatar:String((e.meta||{}).a||'🙂').slice(0,4)});
   oPushLobby();if(net.started)oSendView(1);
  }else if(e.type==='leave'){if(s.id!==e.id)return;if(!net.started){net.seats[1]={kind:'open'};oPushLobby();return}s.away=true}
  else if(e.type==='msg'&&s.id===e.id&&e.data&&e.data.t==='act')oAct(1,e.data.a);
 }
 // G (solo el anfitrión): pick[p] = palabra que p eligió para el otro · S[p] = la partida de p (adivina pick[1-p])
 function oStartOnline(){
  const net=O.net;if(net.role!=='host'||!net.room)return;
  if(net.seats[1].kind==='open')Object.assign(net.seats[1],{kind:'ai',name:'Profe Letras',avatar:'🦉'});
  net.started=true;const M=MODES[O.len];
  O.G={L:lang,M,pick:[null,null],S:[null,null],phase:'pick',names:net.seats.map(s=>s.name)};
  if(net.seats[1].kind==='ai')O.G.pick[1]=rnd(dict(lang).by[M.len]).n;
  oSendView(1);oHostView();
 }
 function oAct(p,a){
  const G=O.G;if(!G||!a)return;
  if(a.t==='pick'&&G.phase==='pick'&&!G.pick[p]){const n=NORM(a.w||'');if(n.length!==G.M.len||!dict(G.L).map.has(n))return;G.pick[p]=n;
   if(G.pick[0]&&G.pick[1]){G.phase='play';[0,1].forEach(k=>{G.S[k]=newSolo(G.L,G.M.len,G.M.max,G.pick[1-k])});if(O.net.seats[1].kind==='ai')oAiPlay()}}
  else if(a.t==='guess'&&G.phase==='play'){const S=G.S[p];if(!S||S.over)return;S.cur=NORM(a.w||'').slice(0,S.len);const r=guess(S);if(r!=='ok'){oSendView(p,r);return}
   if(G.S[0].over&&G.S[1].over)G.phase='over'}
  oSendView(1);oHostView();
 }
 // la máquina adivina: entre las palabras que encajan con lo que ya sabe, una al azar, cada 2–4 s
 function oAiPlay(){
  const G=O.G,S=G&&G.S[1];if(!S||S.over||G.phase!=='play')return;
  setTimeout(()=>{if(O.G!==G||S.over)return;const pool=(dict(G.L).by[S.len]||[]).map(x=>x.n).filter(w=>S.rows.every(r=>score(r.g,w).join('')===r.r.join('')));
   S.cur=(pool.length?rnd(pool):rnd(dict(G.L).by[S.len]).n);guess(S);if(G.S[0].over&&G.S[1].over)G.phase='over';oSendView(1);oHostView();oAiPlay()},2000+Math.random()*2200);
 }
 function oViewFor(p){
  const G=O.G,S=G.S[p],F=G.S[1-p],end=G.phase==='over';
  return {phase:G.phase,L:G.L,len:G.M.len,max:G.M.max,names:G.names,me:p,picked:!!G.pick[p],
   rows:S?S.rows:[],over:S?S.over:false,won:S?S.won:false,foe:F?{n:F.rows.length,over:F.over,won:F.won,cols:F.rows.map(r=>r.r)}:null,
   words:end?[G.pick[1],G.pick[0]]:null,ms:end?G.S.map(s=>s.t1-s.t0):null,tries:end?G.S.map(s=>s.rows.length):null,wins:end?G.S.map(s=>s.won):null};
 }
 function oSendView(p,err){const net=O.net,s=net.seats[p];if(p===0){oShowView(oViewFor(0),err);return}if(s&&s.id&&net.room&&O.G)net.room.send(s.id,{t:'v',v:oViewFor(p),err})}
 function oHostView(){if(O.G)oShowView(oViewFor(0))}
 // pinta la vista online (anfitrión o invitado)
 function oShowView(v,err){
  const prev=O.V;O.V=v;keyHandler=null;
  if(v.phase==='pick'){
   if(v.picked){O.ui.stage.innerHTML=`<div class="mini-game wd">${oHead()}<div class="wd-wait"><span>⏳</span><h3>Esperando a ${esc(v.names[1-v.me])}…</h3><p>Está eligiendo tu palabra.</p></div></div>`;return}
   if(prev&&prev.phase==='pick'&&!prev.picked&&o$('.wd-pick'))return;   // no borrar lo que estás buscando
   O.ui.stage.innerHTML=`<div class="mini-game wd">${oHead()}${pickerHTML('wdPick',v.L,v.len,`Elige la palabra para ${v.names[1-v.me]}`,`${v.len} letras · solo palabras del diccionario.`)}</div>`;
   o$('#wdRules').onclick=()=>sheet(o$('.wd'),oRules());
   bindPicker(O.ui.stage,v.L,v.len,n=>oSend({t:'pick',w:n}));return;
  }
  if(v.phase==='over'){
   const w=duelWinner([0,1].map(k=>({won:v.wins[k],tries:v.tries[k],ms:v.ms[k]}))),me=v.me,line=k=>`${v.names[k]}: ${v.wins[k]?`${v.tries[k]} intentos (${Math.round(v.ms[k]/1000)} s)`:'no la adivinó'} · era ${show(v.L,v.words[k]).toUpperCase()}`;
   O.S=null;O.view={L:v.L,len:v.len,max:v.max,rows:v.rows,cur:'',over:true,won:v.won,msg:''};oDrawOnline(v,false);snd(w<0?'draw':w===me?'win':'lose');arcade(O_GAME,w===me);
   window.SudomiResult&&SudomiResult.show(o$('.wd'),{kind:w<0?'draw':w===me?'win':'lose',game:O_NAME.toUpperCase()+' · ONLINE',title:w<0?'¡Empate!':w===me?'¡Ganaste el duelo!':`Ganó ${v.names[w]}`,sub:line(me),detail:line(1-me),exit:()=>{oLeaveNet();O.ui.exit()}});
   return;
  }
  // jugando: mi tablero con lo que estoy escribiendo, y el progreso del rival (solo colores)
  const cur=O.view&&prev&&prev.phase==='play'?O.view.cur:'';
  O.S=null;const S={L:v.L,len:v.len,max:v.max,rows:v.rows,cur:err?cur:'',over:v.over,won:v.won,online:true,msg:''};
  if(err==='unknown'){S.msg='Esa palabra no está en el diccionario.';S.bad=true;snd('gbad')}
  O.view=S;const grew=prev&&prev.rows&&v.rows.length>prev.rows.length;
  keyHandler=k=>{if(S.over||O.V!==v)return false;S.bad=false;if(k==='⌫')S.cur=S.cur.slice(0,-1);else if(k==='⏎'){if(S.cur.length!==S.len){S.msg=`Faltan letras: la palabra tiene ${S.len}.`;S.bad=true;snd('gbad')}else{S.msg='Comprobando…';oSend({t:'guess',w:S.cur})}}else if(S.cur.length<S.len){S.cur+=k;snd('tap')}if(O.V===v)oDrawOnline(v,false)};   // el anfitrión corrige al momento: si ya llegó otra vista, no se repinta la vieja
  oDrawOnline(v,grew);if(grew){const r=v.rows[v.rows.length-1].r;setTimeout(()=>snd(v.won?'bonus':r.includes('g')?'good':'miss'),v.len*120)}
 }
 function oDrawOnline(v,anim){
  const S=O.view;if(!S)return;
  const foe=v.foe?`<div class="wd-foe"><b>${esc(v.names[1-v.me])}</b><span>${v.foe.cols.slice(-6).map(r=>`<i>${r.map(x=>`<em class="${x}"></em>`).join('')}</i>`).join('')||'<small>aún no ha probado</small>'}</span><small>${v.foe.over?(v.foe.won?`¡la adivinó en ${v.foe.n}!`:'se quedó sin intentos'):`${v.foe.n} ${v.foe.n===1?'intento':'intentos'}`}</small></div>`:'';
  O.ui.stage.innerHTML=`<div class="mini-game wd">${oHead()}${foe}<p class="wd-msg${S.bad?' bad':''}" role="status">${esc(S.msg||(S.over?(S.won?'¡La encontraste! Esperando al rival…':'Sin intentos. Esperando al rival…'):''))}</p>${boardHTML(S,anim)}${kbdHTML(S.L,keyState(S.rows))}</div>`;
  o$('#wdRules').onclick=()=>sheet(o$('.wd'),oRules());
  O.ui.stage.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>keyHandler&&keyHandler(b.dataset.k));
  const bd=o$('#wdBoard');if(bd&&S.max===Infinity)bd.scrollTop=bd.scrollHeight;
 }
 function oSend(a){const net=O.net;if(net.role==='host')oAct(0,a);else if(net.conn)net.conn.send({t:'act',a})}
 function oJoin(code){
  if(P()&&P().get&&!P().get()){P().ensure(()=>oJoin(code));return}
  const net=O.net;if(!window.SudomiParty){net.status='Este navegador no puede entrar a salas.';O.mode='online';return oMenu()}
  oStop();oLeaveNet();const my=++net.tok;Object.assign(net,{role:'guest',code:SudomiParty.normCode(code),started:false,status:'Conectando con la sala…',seats:[],me:1});oRenderLobby();
  net.conn=SudomiParty.join(O_GAME,code,{n:myName(),a:myAvatar()},e=>{if(my!==net.tok)return;
   if(e.type==='open'){net.status='';if(!net.started)oRenderLobby();return}
   if(e.type==='away'){net.status='Se perdió la conexión. Reconectando…';if(!net.started)oRenderLobby();return}
   if(e.type==='back'){net.status='';return}
   if(e.type==='closed'){oStop();oLeaveNet();net.status=e.message||'La sala se cerró.';O.mode='online';oMenu();return}
   if(e.type!=='msg')return;const d=e.data||{};
   if(d.t==='lobby'){net.seats=d.seats;net.code=d.code||net.code;net.lang=d.lang;net.len=d.len;if(!net.started)oRenderLobby()}
   else if(d.t==='v'&&d.v){net.started=true;oShowView(d.v,d.err)}
  });
 }
 function oLeaveNet(){const net=O.net;net.tok++;if(net.room){try{net.room.close()}catch(_){}}if(net.conn){try{net.conn.close()}catch(_){}}Object.assign(net,{role:'solo',room:null,conn:null,code:'',seats:[],started:false,me:0});O.G=null}
 window.SudomiOculta={
  open(ui,m,code){O.ui=ui;ui.hub.classList.add('hidden');ui.stage.classList.remove('hidden');if(m==='join'){O.mode='online';oJoin(code);return}O.mode=m==='pvp'||m==='online'?m:'pve';oMenu()},
  close(){oStop();oLeaveNet();O.H=null;O.net.status=''},
  playing:()=>!!((O.S&&!O.S.over)||O.H||(O.G&&O.G.phase!=='over')||(O.V&&O.V.phase!=='over')),
  // 0.3.100 (admin): modo auto (js/admin.js): prueba una palabra que encaje con lo que ya sabe
  _auto:on=>{const S=O.S;if(on===false||!S||S.over||O.view)return false;const pool=(dict(S.L).by[S.len]||[]).map(x=>x.n).filter(w=>S.rows.every(r=>score(r.g,w).join('')===r.r.join('')));
   S.cur=(pool.length?rnd(pool):rnd(dict(S.L).by[S.len]).n);oKey(S,'⏎');return true},
  _dict:dict,_score:score
 };

 /* ================================================================ AHORCADO ================================================================ */
 const A_GAME='ahorcado',A_NAME='Ahorcado',MAXW=6,ROUNDS=4;
 const FMT={'1v1':[1,1],'1v2':[1,2],'2v2':[2,2],'3v1':[3,1]};
 const A={ui:null,mode:'pve',fmt:'1v1',G:null,V:null,net:{role:'solo',room:null,conn:null,code:'',seats:[],me:0,started:false,status:'',tok:0},timer:0,streak:store.get('sudomi-ahorcado-streak',0)};
 const a$=s=>A.ui.stage.querySelector(s);
 const aHead=()=>`<div class="dos-head"><div><h2>${A_NAME}</h2></div><div class="dos-actions"><button class="game-restart" id="wdRules" aria-label="Reglas">?</button></div></div>`;
 const aRules=()=>`<h3>${A_NAME}</h3><ul><li>Adivina la palabra letra por letra. Cada letra que no está dibuja una parte del muñeco: con <b>${MAXW} fallos</b> se completa y se pierde.</li>
  <li>Las tildes no cuentan (si pides la A también salen las Á). La <b>Ñ</b> es una letra aparte.</li>
  <li><b>Por equipos</b> (1v1, 1v2, 2v2 y 3v1): un equipo elige la palabra con el buscador y el otro la adivina; sus jugadores se turnan para pedir letras. Se juegan ${ROUNDS} rondas y en cada una cambia quién elige.</li>
  <li>Puntos: adivinarla da <b>1 punto más uno por cada vida que sobre</b>. Si no la adivinan, el equipo que la eligió gana <b>3 puntos</b>.</li>
  <li>Online, los asientos vacíos los juega la máquina.</li></ul>`;
 // el muñeco: horca y 6 partes
 function gallows(w,dead){
  const parts=['<circle cx="70" cy="42" r="10"/>','<path d="M70 52v30"/>','<path d="M70 60l-14 12"/>','<path d="M70 60l14 12"/>','<path d="M70 82l-12 18"/>','<path d="M70 82l12 18"/>'];
  return `<svg class="wd-gallows${dead?' dead':''}" viewBox="0 0 120 120" aria-label="${w} de ${MAXW} fallos"><g class="wd-wood"><path d="M10 112h70M30 112V10h40v22M30 30l20-20"/></g><g class="wd-man">${parts.slice(0,w).map((p,i)=>`<g class="pt${i===w-1?' new':''}">${p}</g>`).join('')}${dead?'<path class="wd-x" d="M65 38l4 4M69 38l-4 4M71 38l4 4M75 38l-4 4"/>':''}</g></svg>`;
 }
 function aKbd(L,G){const hit=new Set(),miss=new Set();(G.guessed||[]).forEach(c=>(G.hits&&G.hits.includes(c)?hit:miss).add(c));
  return `<div class="wd-kbd hm">${ROWS[L].map(r=>`<div>${[...r].filter(c=>c!=='⏎'&&c!=='⌫').map(c=>`<button type="button" data-k="${c}" class="${hit.has(c)?'g':miss.has(c)?'r':''}" ${hit.has(c)||miss.has(c)?'disabled':''}>${c.toUpperCase()}</button>`).join('')}</div>`).join('')}</div>`}
 // ---- motor (lo lleva quien juega solo, el teléfono compartido o el anfitrión online) ----
 function aNew(seats,fmt,L,pve){
  const [a,b]=pve?[1,1]:FMT[fmt],team=[[...Array(a).keys()],[...Array(b).keys()].map(i=>i+a)];
  return {seats,fmt,L,pve:!!pve,team,round:0,rounds:pve?Infinity:ROUNDS,setter:pve?1:0,picks:[0,0],word:'',guessed:[],hits:[],wrong:0,turn:0,phase:'pick',scores:[0,0],msg:'',solved:false};
 }
 const guessers=G=>G.team[1-G.setter],pickerSeat=G=>G.team[G.setter][G.picks[G.setter]%G.team[G.setter].length],guesserSeat=G=>{const t=guessers(G);return t[G.turn%t.length]};
 const masked=G=>[...G.word].map(c=>G.guessed.includes(c)?c:'_').join('');
 function aStartRound(G){G.word='';G.guessed=[];G.hits=[];G.wrong=0;G.turn=0;G.solved=false;G.phase='pick';G.msg='';
}
 function aPick(G,n){if(G.phase!=='pick')return false;n=NORM(n);if(!dict(G.L).map.has(n)||n.length<4)return false;G.word=n;G.phase='guess';G.msg='';return true}
 function aGuess(G,c){
  if(G.phase!=='guess'||!/^[a-zñ]$/.test(c)||G.guessed.includes(c))return false;
  G.guessed.push(c);const hit=G.word.includes(c),who=G.seats[guesserSeat(G)].name;
  if(hit){G.hits.push(c);G.msg=`${who}: ¡la ${c.toUpperCase()} está!`}else{G.wrong++;G.msg=`${who}: la ${c.toUpperCase()} no está`}
  if([...G.word].every(x=>G.guessed.includes(x))){G.solved=true;G.phase='end';G.scores[1-G.setter]+=1+(MAXW-G.wrong);G.msg=`¡${G.pve?'La adivinaste':'Equipo '+'AB'[1-G.setter]+' la adivinó'}!`}
  else if(G.wrong>=MAXW){G.phase='end';G.scores[G.setter]+=3;G.msg=`Se completó el muñeco. Era «${show(G.L,G.word).toUpperCase()}».`}
  else G.turn++;
  return hit?'hit':'miss';
 }
 function aNext(G){
  if(G.phase!=='end')return;G.round++;
  if(!G.pve&&G.round>=G.rounds){G.phase='over';return}
  if(!G.pve){G.picks[G.setter]++;G.setter=1-G.setter}
  aStartRound(G);
 }
 // la máquina pide letras: la que más aparece entre las palabras del diccionario que encajan con lo que se ve
 function aAiLetter(G){
  const m=masked(G),bad=G.guessed.filter(c=>!G.word.includes(c)),pool=(dict(G.L).by[G.word.length]||[]).map(x=>x.n).filter(w=>[...w].every((c,i)=>m[i]==='_'?!G.guessed.includes(c):c===m[i])&&!bad.some(b=>w.includes(b)));
  const cnt={};(pool.length?pool:[G.L==='en'?'etaoinshrdlucmfwypvbgkjqxz':'eaosrnidlctumpbgvyqhfzjñxkw']).forEach(w=>new Set(w).forEach(c=>{if(!G.guessed.includes(c))cnt[c]=(cnt[c]||0)+(pool.length?1:30-w.indexOf(c))}));
  const best=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]);return Math.random()<.18&&best.length>2?best[1+Math.random()*2|0]:best[0];
 }
 // quién puede actuar ahora: 'pick' → el que elige, 'guess' → el que adivina
 const aActor=G=>G.phase==='pick'?pickerSeat(G):G.phase==='guess'?guesserSeat(G):-1;
 function aStep(){   // tras cada cambio: turnos de la máquina y pantallas
  const G=A.G;if(!G)return;clearTimeout(A.timer);
  if(G.phase==='pick'&&G.seats[pickerSeat(G)].kind==='ai')A.timer=setTimeout(()=>{if(A.G!==G||G.phase!=='pick')return;const pool=dict(G.L).list.filter(x=>x.n.length>=5&&x.n.length<=(G.pve?9:10));aPick(G,rnd(pool).n);aStep()},G.pve?150:900);
  if(G.phase==='guess'&&G.seats[guesserSeat(G)].kind==='ai')A.timer=setTimeout(()=>{if(A.G!==G)return;const r=aGuess(G,aAiLetter(G));snd(r==='hit'?'good':'miss');aStep()},900+Math.random()*700);
  if(G.phase==='end'&&A.net.role==='host')A.timer=setTimeout(()=>{if(A.G!==G||G.phase!=='end')return;aNext(G);aStep()},3200);
  if(G.phase==='end'){snd(G.solved?(G.pve?'win':'bonus'):'lose');if(G.pve){arcade(A_GAME,G.solved);A.streak=G.solved?A.streak+1:0;store.set('sudomi-ahorcado-streak',A.streak)}}
  if(G.phase==='over'){const me=A.net.role==='solo'?-1:A.net.me,myTeam=me<0?-1:G.team[0].includes(me)?0:1,w=G.scores[0]===G.scores[1]?-1:G.scores[0]>G.scores[1]?0:1;arcade(A_GAME,myTeam<0?true:w===myTeam);snd('win')}
  aBroadcast();aRender();
 }
 // ---- vistas ----
 function aViewFor(G,seat){   // seat -1 = el teléfono compartido (lo ve todo menos la palabra mientras se adivina)
  const setterTeam=G.team[G.setter],canSee=G.phase==='end'||G.phase==='over'||(seat>=0&&setterTeam.includes(seat));
  return {fmt:G.fmt,L:G.L,pve:G.pve,team:G.team,names:G.seats.map(s=>s.name),avatars:G.seats.map(s=>s.avatar),kinds:G.seats.map(s=>s.kind),round:G.round,rounds:G.rounds,setter:G.setter,
   mask:G.word?masked(G):'',len:G.word.length,word:canSee?G.word:'',guessed:G.guessed,hits:G.hits,wrong:G.wrong,phase:G.phase,scores:G.scores,msg:G.msg,solved:G.solved,actor:aActor(G),me:seat};
 }
 function aBroadcast(){const net=A.net;if(net.role!=='host'||!net.room||!A.G)return;net.seats.forEach((s,k)=>{if(k&&s.id)net.room.send(s.id,{t:'v',v:aViewFor(A.G,k)})})}
 function aRender(){
  if(!A.ui)return;const net=A.net,v=net.role==='guest'?A.V:A.G?aViewFor(A.G,net.role==='host'?0:-1):null;if(!v)return;
  keyHandler=null;const local=net.role==='solo',me=local?-1:net.me,mine=local||v.actor===me;
  const teamName=t=>v.pve?(t===1?'Tú':'La máquina'):`Equipo ${'AB'[t]}`;
  const sb=v.pve?`<div class="wd-score"><span>Racha <b>${A.streak}</b></span></div>`:`<div class="wd-score">${[0,1].map(t=>`<span class="${v.setter===t?'set':''}">${teamName(t)} <small>${v.team[t].map(i=>esc(v.names[i])).join(' · ')}</small><b>${v.scores[t]}</b></span>`).join('<i>VS</i>')}</div><p class="wd-round">Ronda ${Math.min(v.round+1,v.rounds)} de ${v.rounds} · elige el ${teamName(v.setter).replace('Equipo','equipo')}</p>`;
  if(v.phase==='over'){
   const w=v.scores[0]===v.scores[1]?-1:v.scores[0]>v.scores[1]?0:1;
   A.ui.stage.innerHTML=`<div class="mini-game wd">${aHead()}${sb}</div>`;a$('#wdRules').onclick=()=>sheet(a$('.wd'),aRules());
   window.SudomiResult&&SudomiResult.show(a$('.wd'),{kind:w<0?'draw':'win',game:A_NAME.toUpperCase()+' · '+v.fmt,title:w<0?'¡Empate!':`¡Gana el ${teamName(w)}!`,sub:`${v.scores[0]} a ${v.scores[1]}`,detail:v.team[w<0?0:w].map(i=>v.names[i]).join(', '),again:net.role==='guest'?null:()=>aBegin(),exit:()=>{aLeaveNet();A.ui.exit()}});
   return;
  }
  if(v.phase==='pick'){
   const who=v.names[v.actor],guessT=v.team[1-v.setter].map(i=>v.names[i]).join(' y ');
   if(v.kinds[v.actor]==='ai'){A.ui.stage.innerHTML=`<div class="mini-game wd">${aHead()}${sb}<div class="wd-wait"><span>🤖</span><h3>${esc(who)} está eligiendo…</h3></div></div>`;a$('#wdRules').onclick=()=>sheet(a$('.wd'),aRules());return}
   if(!mine){A.ui.stage.innerHTML=`<div class="mini-game wd">${aHead()}${sb}<div class="wd-wait"><span>⏳</span><h3>${esc(who)} está eligiendo la palabra…</h3></div></div>`;a$('#wdRules').onclick=()=>sheet(a$('.wd'),aRules());return}
   const picker=()=>{A.ui.stage.innerHTML=`<div class="mini-game wd">${aHead()}${pickerHTML('wdPick',v.L,[4,12],`${esc(who)}: elige la palabra`,`La van a adivinar ${esc(guessT)}.`)}</div>`;a$('#wdRules').onclick=()=>sheet(a$('.wd'),aRules());bindPicker(A.ui.stage,v.L,[4,12],n=>aDo({t:'pick',w:n}))};
   if(local){A.ui.stage.innerHTML=`<div class="mini-game wd">${aHead()}${sb}${curtainHTML(`${esc(who)} elige`,`Que <b>${esc(guessT)}</b> no mire${v.team[1-v.setter].length>1?'n':''} la pantalla.`,`Soy ${esc(who)}`)}</div>`;a$('#wdRules').onclick=()=>sheet(a$('.wd'),aRules());a$('#wdReady').onclick=picker}
   else picker();
   return;
  }
  // adivinando (o fin de la ronda)
  const end=v.phase==='end',actor=v.actor>=0?v.names[v.actor]:'',word=v.word||'';
  const disp=word?show(v.L,word).toUpperCase():'';
  const letters=[...v.mask].map((c,i)=>{const open=c!=='_',ch=open?(disp[i]||c.toUpperCase()):end?(disp[i]||''):'';return `<span class="wd-l${open?' on':''}${end&&!open?' miss':''}">${esc(ch)}</span>`}).join('');
  const turnTxt=end?esc(v.msg):v.pve?'Elige una letra':v.kinds[v.actor]==='ai'?`🤖 ${esc(actor)} está pensando…`:mine?(local?`Turno de <b>${esc(actor)}</b>`:'<b>¡Tu turno!</b> Elige una letra'):`Turno de <b>${esc(actor)}</b>`;
  const secret=!end&&word&&!local?`<p class="wd-note">Tu equipo eligió: <b>${esc(show(v.L,word).toUpperCase())}</b></p>`:'';
  A.ui.stage.innerHTML=`<div class="mini-game wd">${aHead()}${sb}<div class="wd-hang">${gallows(v.wrong,end&&!v.solved)}<div><p class="wd-lives">${'❤️'.repeat(MAXW-v.wrong)}${'🖤'.repeat(v.wrong)}</p><p class="wd-msg${end&&!v.solved?' bad':''}">${turnTxt}</p>${!end&&v.msg?`<p class="wd-note">${esc(v.msg)}</p>`:''}</div></div>
   <div class="wd-word" style="--n:${v.len}">${letters}</div>${secret}
   ${end?(net.role==='guest'?'<p class="wd-note">Siguiente ronda en un momento…</p>':`<button class="arc-btn pc-big" id="wdNext">${v.pve?'▶ Otra palabra':v.round+1>=v.rounds?'🏁 Ver resultado':'▶ Siguiente ronda'}</button>`):aKbd(v.L,v)}
   <p class="board-hint">${v.L==='en'?'Palabras en inglés':'Palabras en español'} · ${v.len} letras</p></div>`;
  a$('#wdRules').onclick=()=>sheet(a$('.wd'),aRules());
  const nx=a$('#wdNext');if(nx)nx.onclick=()=>{if(A.G){clearTimeout(A.timer);aNext(A.G);aStep()}};
  const canTap=!end&&mine&&v.kinds[v.actor]!=='ai';
  A.ui.stage.querySelectorAll('.wd-kbd [data-k]').forEach(b=>{b.disabled=b.disabled||!canTap;b.onclick=()=>aDo({t:'guess',c:b.dataset.k})});
  if(canTap)keyHandler=k=>{if(/^[a-zñ]$/.test(k))aDo({t:'guess',c:k});else return false};
 }
 // una acción del jugador de este teléfono
 function aDo(a){const net=A.net;if(net.role==='guest'){if(net.conn)net.conn.send({t:'act',a});return}aApply(net.role==='host'?0:aActor(A.G),a)}
 function aApply(seat,a){
  const G=A.G;if(!G||!a||seat!==aActor(G))return;
  if(a.t==='pick'){if(!aPick(G,a.w))return;snd('tap')}
  else if(a.t==='guess'){const r=aGuess(G,String(a.c||''));if(!r)return;snd(r==='hit'?'good':'miss')}
  aStep();
 }
 // ---- menú, partida local y sala ----
 function aMenu(){
  aStopAll();aLeaveNet();const m=A.mode,net=A.net;
  const fm=Object.keys(FMT).map(k=>`<button type="button" data-fmt="${k}" class="${k===A.fmt?'on':''}"><b>${k.replace('v',' vs ')}</b><small>${FMT[k][0]+FMT[k][1]} jugadores</small></button>`).join('');
  A.ui.stage.innerHTML=`<div class="mini-game wd">${aHead()}<div class="wd-menu">${net.status?`<p class="pc-note bad">${esc(net.status)}</p>`:''}
   <div class="pc-hero">🪢<b>${A_NAME}</b><span>${m==='pve'?'Adivina la palabra de la máquina antes de que se complete el muñeco.':m==='pvp'?'Por equipos en este teléfono: un equipo elige la palabra y el otro la adivina.':'Por equipos por internet. Los asientos vacíos los juega la máquina.'}</span></div>
   ${langHTML()}${m==='pve'?'':`<div class="pc-opt"><b>Equipos</b><div class="wd-modes">${fm}</div></div>`}
   <button class="arc-btn pc-big" id="wdStart">${m==='online'?'🌐 Crear sala':'▶ Jugar'}</button></div></div>`;
  net.status='';a$('#wdRules').onclick=()=>sheet(a$('.wd'),aRules());
  bindChips(A.ui.stage,'lang',l=>setLang(l));bindChips(A.ui.stage,'fmt',f=>{A.fmt=f});
  a$('#wdStart').onclick=m==='online'?aCreateRoom:aBegin;
 }
 function aBegin(){
  const net=A.net;clearTimeout(A.timer);
  if(net.role==='host'){return aStartOnline()}
  if(A.mode==='pve'){A.G=aNew([{kind:'human',name:myName(),avatar:myAvatar()},{kind:'ai',name:'La máquina',avatar:'🤖'}],'1v1',lang,true)}
  else{const [a,b]=FMT[A.fmt];A.G=aNew(Array.from({length:a+b},(_,i)=>({kind:'human',name:`Jugador ${i+1}`,avatar:['🙂','😎','🤠','🥳'][i%4]})),A.fmt,lang,false)}
  aStartRound(A.G);aStep();
 }
 const aPub=()=>A.net.seats.map(s=>({kind:s.kind,name:s.name,avatar:s.avatar,away:!!s.away}));
 function aRenderLobby(){
  const net=A.net,host=net.role==='host',fmt=net.fmt||A.fmt,[a]=FMT[fmt];
  A.ui.stage.innerHTML=`<div class="mini-game wd">${aHead()}<div id="lbRoot"></div></div>`;a$('#wdRules').onclick=()=>sheet(a$('.wd'),aRules());
  if(!window.SudomiLobby){a$('#lbRoot').textContent=net.status||'Creando sala…';return}
  SudomiLobby.render(a$('#lbRoot'),{game:A_GAME,gameName:A_NAME,code:net.code||null,url:net.code?inviteUrl(A_GAME,net.code):'',host,fixed:true,
   seats:net.seats.map((s,k)=>({state:k===net.me&&s.kind==='human'?'me':s.kind==='open'?'open':s.kind==='ai'?'ai':s.away?'away':'human',name:s.name,avatar:s.avatar,sub:`Equipo ${k<a?'A':'B'}`})),
   extra:`<p class="pc-note">${fmt.replace('v',' vs ')} · ${LANGS[net.lang||lang]} · ${ROUNDS} rondas</p>`,
   startLabel:'▶ Empezar',canStart:!!net.code,onStart:host?aStartOnline:undefined,
   onAI:i=>{if(!host||net.started||!net.seats[i]||net.seats[i].kind!=='open')return;Object.assign(net.seats[i],{kind:'ai',name:'Máquina '+(i+1),avatar:'🤖'});aPushLobby()},
   status:net.status,hint:host?'Comparte el código o invita a tus amigos. Los asientos vacíos los juega la máquina.':''});
 }
 function aPushLobby(){const net=A.net;if(net.role!=='host')return;net.seats.forEach((s,k)=>{if(k&&s.id&&net.room)net.room.send(s.id,{t:'lobby',seats:aPub(),code:net.code,fmt:A.fmt,lang})});if(!net.started)aRenderLobby()}
 async function aCreateRoom(){
  if(P()&&P().get&&!P().get()){P().ensure(()=>aCreateRoom());return}
  const net=A.net;if(!window.SudomiParty){net.status='Este navegador no puede crear salas.';return aMenu()}
  const my=++net.tok,[a,b]=FMT[A.fmt];Object.assign(net,{role:'host',code:'',started:false,status:'',me:0,room:null,fmt:A.fmt,lang});
  net.seats=[{kind:'human',id:'host',name:myName(),avatar:myAvatar()},...Array.from({length:a+b-1},()=>({kind:'open'}))];aRenderLobby();
  try{const room=await SudomiParty.host(A_GAME,aOnHost);if(my!==net.tok){room.close();return}net.room=room;net.code=room.code;aRenderLobby()}
  catch(e){if(my!==net.tok)return;net.role='solo';net.status=(e&&e.message)||'No se pudo crear la sala.';aMenu()}
 }
 function aOnHost(e){
  const net=A.net;if(net.role!=='host')return;
  if(e.type==='join'){
   const old=net.seats.findIndex(s=>s.id===e.id);
   if(old>0){net.seats[old].away=false;if(A.G)A.G.seats[old].kind='human'}
   else{const i=net.seats.findIndex(s=>s.kind==='open');if(i<0||net.started){net.room.reject(e.id,net.started?'La partida ya empezó.':'La sala está llena.');return}
    Object.assign(net.seats[i],{kind:'human',id:e.id,name:clean((e.meta||{}).n)||'Amigo',avatar:String((e.meta||{}).a||'🙂').slice(0,4)})}
   aPushLobby();if(net.started)aBroadcast();
  }else if(e.type==='leave'){const i=net.seats.findIndex(s=>s.id===e.id);if(i<1)return;if(!net.started){net.seats[i]={kind:'open'};aPushLobby();return}
   net.seats[i].away=true;if(A.G){A.G.seats[i].kind='ai';aStep()}}   // mientras no vuelva, juega la máquina por él
  else if(e.type==='msg'&&e.data&&e.data.t==='act'){const i=net.seats.findIndex(s=>s.id===e.id);if(i>0)aApply(i,e.data.a)}
 }
 function aStartOnline(){
  const net=A.net;if(net.role!=='host'||!net.room)return;
  net.seats.forEach((s,i)=>{if(s.kind==='open')Object.assign(s,{kind:'ai',name:'Máquina '+(i+1),avatar:'🤖'})});
  net.started=true;A.G=aNew(net.seats.map(s=>({kind:s.kind,name:s.name,avatar:s.avatar})),net.fmt,net.lang||lang,false);aStartRound(A.G);aStep();
 }
 function aJoin(code){
  if(P()&&P().get&&!P().get()){P().ensure(()=>aJoin(code));return}
  const net=A.net;if(!window.SudomiParty){net.status='Este navegador no puede entrar a salas.';A.mode='online';return aMenu()}
  aStopAll();aLeaveNet();const my=++net.tok;Object.assign(net,{role:'guest',code:SudomiParty.normCode(code),started:false,status:'Conectando con la sala…',seats:[],me:-1});aRenderLobby();
  net.conn=SudomiParty.join(A_GAME,code,{n:myName(),a:myAvatar()},e=>{if(my!==net.tok)return;
   if(e.type==='open'){net.status='';if(!net.started)aRenderLobby();return}
   if(e.type==='away'){net.status='Se perdió la conexión. Reconectando…';if(!net.started)aRenderLobby();return}
   if(e.type==='back'){net.status='';return}
   if(e.type==='closed'){aStopAll();aLeaveNet();net.status=e.message||'La sala se cerró.';A.mode='online';aMenu();return}
   if(e.type!=='msg')return;const d=e.data||{};
   if(d.t==='lobby'){net.seats=d.seats;net.code=d.code||net.code;net.fmt=d.fmt;net.lang=d.lang;if(!net.started)aRenderLobby()}
   else if(d.t==='v'&&d.v){const was=A.V;net.started=true;net.me=d.v.me;A.V=d.v;
    if(was&&d.v.guessed.length>was.guessed.length&&d.v.phase!=='pick'){const c=d.v.guessed[d.v.guessed.length-1];snd(d.v.hits.includes(c)?'good':'miss')}
    if(d.v.phase==='end'&&(!was||was.phase!=='end'))snd(d.v.solved?'bonus':'lose');
    aRender()}
  });
 }
 function aStopAll(){clearTimeout(A.timer);keyHandler=null;A.G=null;A.V=null}
 function aLeaveNet(){const net=A.net;net.tok++;if(net.room){try{net.room.close()}catch(_){}}if(net.conn){try{net.conn.close()}catch(_){}}Object.assign(net,{role:'solo',room:null,conn:null,code:'',seats:[],started:false,me:0})}
 window.SudomiAhorcado={
  open(ui,m,code){A.ui=ui;ui.hub.classList.add('hidden');ui.stage.classList.remove('hidden');if(m==='join'){A.mode='online';aJoin(code);return}A.mode=m==='pvp'||m==='online'?m:'pve';aMenu()},
  close(){aStopAll();aLeaveNet();A.net.status=''},
  playing:()=>{const g=A.G||A.V;return !!g&&g.phase!=='over'&&!(g.pve&&g.phase==='end')},
  _state:()=>A.G,_ai:aAiLetter,
  // 0.3.100 (admin): modo auto (js/admin.js): elige la palabra o pide la letra por quien le toque en este teléfono
  _auto:on=>{const G=A.G;if(on===false||!G||A.net.role==='guest')return false;
   if(G.phase==='end'&&A.net.role!=='host'){clearTimeout(A.timer);aNext(G);aStep();return true}
   const who=aActor(G);if(who<0||G.seats[who].kind==='ai'||(A.net.role==='host'&&who!==0))return false;
   if(G.phase==='pick'){const pool=dict(G.L).list.filter(x=>x.n.length>=5&&x.n.length<=9);aApply(who,{t:'pick',w:rnd(pool).n});return true}
   if(G.phase==='guess'){aApply(who,{t:'guess',c:aAiLetter(G)});return true}return false}
 };
})();
