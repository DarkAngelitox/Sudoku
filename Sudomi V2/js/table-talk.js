/* SUDOMI 0.3.97 (roadmap, Fase 6) — FRASES Y RELOJ DE TURNO en las salas online de Parchimi, STOP, Dominó, Dominópolis, Batalla naval y Mahjong.
 * No toca los juegos: envuelve SudomiParty.host / SudomiParty.join (js/party-net.js) solo para esos juegos y se queda con los mensajes {t:'tt'}
 *   (frase k + nombre de quien la dice). El anfitrión la reparte a todos los demás. Solo viaja el número de la frase, nunca texto libre.
 * 💬 abajo a la izquierda abre la lista de frases (una cada 2 segundos como mucho); a todos les sale un globo «Nombre: frase».
 * ⏱ RELOJ DE TURNO: cuánto lleva el turno actual (en Mahjong, que es una carrera, el tiempo de la carrera; STOP ya trae su cuenta atrás).
 *   Se lee de cada juego con TURN[juego](); si te toca y pasas de un minuto, te avisa una vez. */
(()=>{
 const P=window.SudomiParty;if(!P)return;
 const GAMES={fleet:1,parchis:1,mahjong:1,stop:1,dominopolis:1,domino4:1};
 const PHRASES=['👍','😂','😮','🔥','¡Buena jugada!','¡Qué suerte!','¡Dale, que es tarde!','¡Te toca!','¡Ahora sí!','¡Otra más!','Gracias','¡Bien jugado!'];
 const esc=t=>String(t==null?'':t).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const myName=()=>{try{return (window.SudomiProfile&&SudomiProfile.name&&SudomiProfile.name())||'Jugador'}catch(_){return 'Jugador'}};
 const clean=n=>String(n||'').replace(/[<>&"']/g,'').replace(/\s+/g,' ').trim().slice(0,14)||'Alguien';
 let live=null;   // la sala abierta: {game, role, room|conn, ids}
 const oh=P.host,oj=P.join;
 P.host=async function(game,handler,fixed){
  if(!GAMES[game])return oh.apply(this,arguments);
  const L={game,role:'host',room:null,ids:new Set()};
  const room=await oh.call(this,game,e=>{
   if(e.type==='join')L.ids.add(e.id);else if(e.type==='leave')L.ids.delete(e.id);
   if(e.type==='msg'&&e.data&&e.data.t==='tt'){const k=e.data.k|0,n=clean(e.data.n);if(PHRASES[k]){bubble(n,k);L.ids.forEach(id=>{if(id!==e.id&&L.room)L.room.send(id,{t:'tt',k,n})})}return}
   handler(e);
  },fixed);
  L.room=room;live=L;const close=room.close.bind(room);room.close=silent=>{if(live===L)live=null;close(silent)};return room;
 };
 P.join=function(game,code,meta,handler){
  if(!GAMES[game])return oj.apply(this,arguments);
  const L={game,role:'guest',conn:null};
  const conn=oj.call(this,game,code,meta,e=>{
   if(e.type==='msg'&&e.data&&e.data.t==='tt'){const k=e.data.k|0;if(PHRASES[k])bubble(clean(e.data.n),k);return}
   if(e.type==='closed'&&live===L)live=null;
   handler(e);
  });
  L.conn=conn;live=L;const close=conn.close.bind(conn);conn.close=()=>{if(live===L)live=null;close()};return conn;
 };
 let lastSent=0;
 function say(k){
  if(!live||Date.now()-lastSent<2000)return;lastSent=Date.now();const n=clean(myName());
  if(live.role==='host')live.ids.forEach(id=>live.room&&live.room.send(id,{t:'tt',k,n}));else if(live.conn)live.conn.send({t:'tt',k,n});
  bubble('Tú',k,true);
 }
 let bubT=0;
 function bubble(who,k,mine){
  let b=document.getElementById('ttBubble');if(!b){b=document.createElement('div');b.id='ttBubble';b.className='tt-bubble';b.setAttribute('role','status');document.body.appendChild(b)}
  b.innerHTML=`<small>${esc(who)}</small><b>${esc(PHRASES[k])}</b>`;b.classList.toggle('mine',!!mine);b.classList.remove('show');void b.offsetWidth;b.classList.add('show');
  clearTimeout(bubT);bubT=setTimeout(()=>b.classList.remove('show'),2800);try{window.SudomiSound&&SudomiSound.play('pop')}catch(_){}
 }
 // ---- de quién es el turno en cada juego: {key (cambia con cada turno), who, mine} o null si no hay turno que contar
 const byName=(name)=>!!name&&name===myName();
 const TURN={
  fleet:()=>{const N=window.SudomiNaval,v=N&&N._view&&N._view();if(!v||v.over||v.phase==='setup'||v.curtain)return null;
   return v.sim?{key:'r'+v.turnNo,who:'Ronda '+v.turnNo,mine:v.phase==='aim'&&!v.locked[v.me]}:{key:v.turnNo+':'+v.turn,who:v.names[v.turn],mine:v.turn===v.me}},
  parchis:()=>{const M=window.SudomiParchis,g=M&&M._state&&M._state();if(!g||g.over||g.turn==null)return null;const s=g.seats&&g.seats[g.turn];return {key:'t'+g.turn+':'+(g.last?JSON.stringify(g.last):''),who:s?s.name:'',mine:!!s&&s.kind==='human'&&byName(s.name)}},
  dominopolis:()=>{const M=window.SudomiDominopolis,g=M&&M._state&&M._state(),S=M&&M._seats&&M._seats();if(!g||g.over||g.winner!=null&&g.winner!==undefined&&g.winner!==-1&&g.phase==='over')return null;const s=S&&S[g.turn];return {key:'t'+g.turn,who:s?s.name:'',mine:!!s&&byName(s.name)}},
  domino4:()=>{const M=window.SudomiDominoParty,g=M&&M._state&&M._state();if(!g||g.over||g.turn==null||!g.seats)return null;const s=g.seats[g.turn];return {key:'t'+g.turn+':'+((g.board||g.chain||[]).length||0),who:s?s.name:'',mine:g.turn===(M._me?M._me():-1)}},
  mahjong:()=>{const M=window.SudomiMahjong,s=M&&M._state&&M._state();if(!s||s.over)return null;return {key:'race',who:'Carrera',mine:false,race:1}},
  stop:()=>null
 };
 let mark={key:null,t:0,nudged:false};
 const fmt=s=>`${s/60|0}:${String(s%60).padStart(2,'0')}`;
 let box=null;
 function ensure(){
  if(box)return box;
  box=document.createElement('div');box.className='tt-box hidden';
  box.innerHTML=`<div class="tt-panel hidden">${PHRASES.map((p,k)=>`<button type="button" data-k="${k}">${esc(p)}</button>`).join('')}</div><span class="tt-clock hidden" aria-live="off"></span><button type="button" class="tt-btn" aria-label="Frases">💬</button>`;
  document.body.appendChild(box);
  const panel=box.querySelector('.tt-panel');
  box.querySelector('.tt-btn').onclick=()=>panel.classList.toggle('hidden');
  box.querySelectorAll('[data-k]').forEach(b=>b.onclick=()=>{panel.classList.add('hidden');say(+b.dataset.k)});
  return box;
 }
 function tick(){
  const scr=document.getElementById('miniGamesScreen'),stage=document.getElementById('miniGameStage');
  const on=!!live&&!!scr&&!scr.classList.contains('hidden')&&!!stage&&!stage.classList.contains('hidden')&&!stage.querySelector('.lb');
  if(!box&&!on)return;ensure();
  box.classList.toggle('hidden',!on);if(!on){box.querySelector('.tt-panel').classList.add('hidden');mark.key=null;return}
  const fn=TURN[live.game];let tr=null;try{tr=fn&&fn()}catch(_){}
  const ck=box.querySelector('.tt-clock');if(!tr){ck.classList.add('hidden');mark.key=null;return}
  if(tr.key!==mark.key)mark={key:tr.key,t:Date.now(),nudged:false};
  const s=Math.floor((Date.now()-mark.t)/1000);ck.classList.remove('hidden');ck.classList.toggle('slow',!tr.race&&s>=60);ck.classList.toggle('mine',!!tr.mine);
  ck.textContent=`⏱ ${fmt(s)} · ${tr.race?'carrera':tr.mine?'tu turno':'turno de '+tr.who}`;
  if(tr.mine&&s>=60&&!mark.nudged){mark.nudged=true;bubbleNote('⏱ Te toca: ya llevas un minuto.');try{navigator.vibrate&&navigator.vibrate(120)}catch(_){}}
 }
 function bubbleNote(t){let b=document.getElementById('ttBubble');if(!b){bubble('',0);b=document.getElementById('ttBubble')}b.innerHTML=`<b>${esc(t)}</b>`;b.classList.remove('mine');b.classList.remove('show');void b.offsetWidth;b.classList.add('show');clearTimeout(bubT);bubT=setTimeout(()=>b.classList.remove('show'),3200)}
 setInterval(tick,1000);
 window.SudomiTableTalk={phrases:PHRASES,say,_live:()=>live};
})();
