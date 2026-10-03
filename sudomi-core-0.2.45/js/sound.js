/* SUDOMI 0.2.44 — Phase 15: sound and vibration, independent settings (Personalizar → "Sonido y vibración").
 * No audio files: every sound is synthesised with the Web Audio API (short tones), so it works offline and adds no weight.
 * Events it reacts to (all fired by the other modules): 'sudomi-feedback' {type:'good'|'bad'|'bonus'|'hint', combo} from js/score.js,
 * 'sudomi-win', ui.lose(), 'sudomi-levelup' (js/xp.js), 'sudomi-achievement' (js/achievements.js) and taps on cells and tools.
 * The game already vibrates on a wrong number (js/app.js calls navigator.vibrate): that call is wrapped here so the vibration switch rules it too.
 * Browsers only allow audio after a touch/click, so the audio context is created on the first one. Settings: localStorage['sudomi-sound']. */
(()=>{
 const KEY='sudomi-sound';
 const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY))||{};return {sound:v.sound!==false,vibe:v.vibe!==false,vol:typeof v.vol==='number'?Math.min(1,Math.max(0,v.vol)):.6}}catch(_){return {sound:true,vibe:true,vol:.6}}};
 let cfg=read(),ctx=null;
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(cfg))}catch(_){}};
 // vibration switch also governs the vibration that js/app.js asks for
 const nativeVibrate=navigator.vibrate?navigator.vibrate.bind(navigator):null;
 const touched=()=>!navigator.userActivation||navigator.userActivation.hasBeenActive;   // browsers refuse vibration before the first tap
 if(nativeVibrate)navigator.vibrate=p=>cfg.vibe&&touched()?nativeVibrate(p):false;
 const vibe=p=>{if(cfg.vibe&&nativeVibrate&&touched()){try{nativeVibrate(p)}catch(_){}}};
 function audio(){
  if(ctx)return ctx;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
  try{ctx=new AC()}catch(_){ctx=null}return ctx;
 }
 const unlock=()=>{const c=audio();if(c&&c.state==='suspended')c.resume()};
 ['pointerdown','touchstart','keydown','click'].forEach(ev=>document.addEventListener(ev,unlock,{passive:true}));
 // one short tone: frequency, length (s), wave, loudness, start offset (s), optional glide target
 function tone(f,d,type='sine',v=.25,at=0,to=0){
  const c=audio();if(!c||c.state!=='running')return;
  const t0=c.currentTime+at,o=c.createOscillator(),g=c.createGain();
  o.type=type;o.frequency.setValueAtTime(f,t0);if(to)o.frequency.exponentialRampToValueAtTime(to,t0+d);
  const peak=Math.max(.0001,v*cfg.vol);
  g.gain.setValueAtTime(.0001,t0);g.gain.exponentialRampToValueAtTime(peak,t0+.012);g.gain.exponentialRampToValueAtTime(.0001,t0+d);
  o.connect(g);g.connect(c.destination);o.start(t0);o.stop(t0+d+.03);
 }
 const N={C4:261.6,D4:293.7,E4:329.6,G4:392,A4:440,C5:523.3,D5:587.3,E5:659.3,G5:784,A5:880,C6:1046.5};
 const SOUNDS={
  tap:()=>tone(520,.04,'triangle',.08),
  good:combo=>{const f=480+Math.min(combo||1,14)*26;tone(f,.09,'sine',.22);tone(f*1.5,.12,'sine',.16,.07)},
  bad:()=>{tone(170,.22,'sawtooth',.2,0,95)},
  hint:()=>{tone(N.E5,.1,'sine',.18);tone(N.C5,.16,'sine',.16,.09)},
  bonus:()=>{[N.C5,N.E5,N.G5,N.C6].forEach((f,i)=>tone(f,.14,'triangle',.2,i*.07))},
  win:()=>{[N.C5,N.E5,N.G5,N.C6,N.G5,N.C6].forEach((f,i)=>tone(f,i>3?.34:.16,'triangle',.24,i*.13))},
  lose:()=>{[N.G4,N.E4,N.C4].forEach((f,i)=>tone(f,.28,'sine',.22,i*.2,f*.92))},
  levelup:()=>{[N.C5,N.D5,N.E5,N.G5,N.A5,N.C6].forEach((f,i)=>tone(f,.13,'square',.12,i*.08))},
  achievement:()=>{[N.G5,N.C6,N.E5].forEach((f,i)=>tone(f,.22,'sine',.22,i*.1))}
 };
 const VIBES={tap:8,good:12,bonus:[18,40,18],hint:[10,30,10],win:[40,60,40,60,140],lose:[220],levelup:[30,40,30,40,80],achievement:[30,50,30]};
 function play(name,arg){
  if(cfg.sound&&SOUNDS[name])try{SOUNDS[name](arg)}catch(_){}
  if(name!=='bad'&&VIBES[name]!==undefined)vibe(VIBES[name]);          // 'bad' vibrates through app.js's own navigator.vibrate(120)
  else if(name==='bad'&&!nativeVibrate)return;
 }
 window.addEventListener('sudomi-feedback',e=>{const d=e.detail||{};play(d.type,d.combo)});
 window.addEventListener('sudomi-win',()=>play('win'));
 window.addEventListener('sudomi-levelup',()=>setTimeout(()=>play('levelup'),700));
 window.addEventListener('sudomi-achievement',()=>play('achievement'));
 if(window.SudomiCore&&SudomiCore.ui){const ol=SudomiCore.ui.lose.bind(SudomiCore.ui);SudomiCore.ui.lose=function(g){play('lose');return ol(g)}}
 document.addEventListener('click',e=>{const t=e.target.closest&&e.target.closest('.cell,.tool,.icon-btn');if(t)play('tap')},true);
 /* ---- 0.2.45: the "Otros juegos". Nothing in those files changes: sounds come from what the screen shows.
  *  1. any button pressed inside the games screen -> a soft tap
  *  2. the end-of-game card ("PARTIDA TERMINADA") -> victory / defeat (a computer win or "sin ganador" counts as a defeat)
  *  3. messages that appear on screen (Tocado, Agua, ¡Pareja!, ¡ESCOBA!, Jaque, ¡DOS!, Tornado…) -> the matching sound; a message only sounds
  *     when it is NEW compared with the previous drawing, so re-draws and timers stay silent. */
 SOUNDS.miss=()=>tone(210,.12,'sine',.16,0,150);
 SOUNDS.gbad=()=>{tone(170,.2,'sawtooth',.18,0,95)};
 SOUNDS.draw=()=>{tone(392,.14,'triangle',.18);tone(392,.2,'triangle',.14,.16)};
 Object.assign(VIBES,{miss:8,gbad:[60,40,60],draw:[20,40,20]});
 const RULES_FX=[
  [/¡dos!/i,'hint'],[/gana la partida|jaque\s*mate|¡escoba|¡dominó|¡rummy|hundi/i,'bonus'],[/tornado|súper|rebobinar/i,'bonus'],
  [/tocado|¡pareja|captur|barri/i,'good'],[/jaque/i,'hint'],[/agua\b/i,'miss'],
  [/no coinciden|no es una|no encaja|se pasó|es obligatorio|tiene que ser|no puedes|ya hay un/i,'gbad']
 ];
 let prevFx=new Set(),fxQueued=false,lastAt=0,endSeen=null;
 function scanGames(){
  fxQueued=false;const scr=document.querySelector('#miniGamesScreen');if(!scr||scr.classList.contains('hidden')){prevFx=new Set();endSeen=null;return}
  // end-of-game card
  const card=scr.querySelector('.game-end-card');
  if(card&&card!==endSeen){endSeen=card;const w=((card.querySelector('strong')||{}).textContent||'');
   play(/sin ganador/i.test(w)||/computadora/i.test(w)?'lose':/empate|tablas/i.test(w)?'draw':'win');prevFx=new Set([...prevFx]);return}
  if(!card)endSeen=null;
  // new messages
  const text=(scr.querySelector('#miniGameStage')||scr).innerText||'',now=new Set();
  for(const line of text.split('\n')){const l=line.trim();if(!l||l.length>200)continue;for(const [re,fx] of RULES_FX){if(re.test(l)){now.add(fx+'|'+l);break}}}
  const fresh=[...now].filter(k=>!prevFx.has(k));prevFx=now;
  if(fresh.length&&Date.now()-lastAt>150){lastAt=Date.now();const order=['bonus','good','hint','miss','gbad'];const fx=order.find(o=>fresh.some(k=>k.startsWith(o+'|')));if(fx)play(fx)}
 }
 const queueScan=()=>{if(!fxQueued){fxQueued=true;requestAnimationFrame(scanGames)}};
 function watchGames(){
  const scr=document.querySelector('#miniGamesScreen');if(!scr)return;
  new MutationObserver(queueScan).observe(scr,{childList:true,subtree:true,characterData:true});
  scr.addEventListener('click',e=>{const b=e.target.closest&&e.target.closest('button');if(b&&!b.classList.contains('gt-mini')&&!b.classList.contains('gt-link'))play('tap')},true);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watchGames);else watchGames();
 window.SudomiSound={get cfg(){return {...cfg}},set(o){cfg={...cfg,...o};save()},play,test(){unlock();play('bonus')}};
})();
