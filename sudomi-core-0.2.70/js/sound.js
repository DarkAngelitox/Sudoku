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
 // ---- vibration. Android/Chrome: navigator.vibrate. iPhone Safari has NO Vibration API at all; since iOS 18 a tiny haptic tick is played when a
 //      hidden <input type="checkbox" switch> is toggled from a tap, so on iPhone navigator.vibrate is replaced by that trick (one tick per pulse).
 const isIOS=/iP(hone|ad|od)/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 const nativeVibrate=navigator.vibrate?navigator.vibrate.bind(navigator):null;
 const touched=()=>!navigator.userActivation||navigator.userActivation.hasBeenActive;   // browsers refuse vibration before the first tap
 let hapticLabel=null;
 function haptic(){
  try{
   if(!hapticLabel){const l=document.createElement('label');l.setAttribute('aria-hidden','true');l.style.cssText='position:fixed;left:-200px;top:0;width:1px;height:1px;opacity:0;overflow:hidden;pointer-events:none';
    const i=document.createElement('input');i.type='checkbox';i.setAttribute('switch','');i.tabIndex=-1;l.appendChild(i);document.body.appendChild(l);hapticLabel=l}
   hapticLabel.click();
  }catch(_){}
 }
 function hapticPattern(p){const a=Array.isArray(p)?p:[p];let t=0;a.forEach((ms,i)=>{if(i%2===0){if(t===0)haptic();else setTimeout(haptic,t)}t+=ms})}
 const doVibe=p=>{if(nativeVibrate){if(touched()){try{nativeVibrate(p)}catch(_){}}}else if(isIOS)hapticPattern(p)};
 navigator.vibrate=p=>{if(!cfg.vibe)return false;doVibe(p);return true};   // js/app.js calls this on a wrong number; the switch rules it (and it now exists on iPhone)
 const vibe=p=>{if(cfg.vibe)doVibe(p)};
 // ---- audio. iPhone needs: the context created/resumed inside a tap (touchend/click, not touchstart), and the "playback" audio session so the
 //      ring/silent switch does not mute it (Audio Session API on iOS 17+, plus a looping silent <audio> as the older trick).
 let silent=null,primed=false;
 function audio(){
  if(ctx)return ctx;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
  try{ctx=new AC()}catch(_){ctx=null}return ctx;
 }
 function silentWav(){const n=8000,b=new ArrayBuffer(44+n),v=new DataView(b),w=(o,s)=>[...s].forEach((c,i)=>v.setUint8(o+i,c.charCodeAt(0)));
  w(0,'RIFF');v.setUint32(4,36+n,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,8000,true);v.setUint32(28,8000,true);v.setUint16(32,1,true);v.setUint16(34,8,true);w(36,'data');v.setUint32(40,n,true);
  for(let i=0;i<n;i++)v.setUint8(44+i,128);return URL.createObjectURL(new Blob([b],{type:'audio/wav'}))}
 function keepAlive(){
  if(!isIOS||silent)return;
  try{silent=new Audio(silentWav());silent.loop=true;silent.setAttribute('playsinline','');silent.preload='auto';const p=silent.play();if(p&&p.catch)p.catch(()=>{silent=null})}catch(_){silent=null}
 }
 const unlock=()=>{
  if(!cfg.sound)return;
  try{if(navigator.audioSession)navigator.audioSession.type='playback'}catch(_){}
  const c=audio();
  if(c){
   if(c.state!=='running'&&c.resume)c.resume().catch(()=>{});
   if(!primed){try{const b=c.createBuffer(1,1,22050),s=c.createBufferSource();s.buffer=b;s.connect(c.destination);s.start(0);primed=true}catch(_){}}
  }
  keepAlive();
 };
 ['touchend','pointerup','click','keydown'].forEach(ev=>document.addEventListener(ev,unlock,{passive:true}));
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&ctx&&ctx.state!=='running'&&ctx.resume)ctx.resume().catch(()=>{})});
 // one short tone: frequency, length (s), wave, loudness, start offset (s), optional glide target
 function tone(f,d,type='sine',v=.25,at=0,to=0){
  const c=audio();if(!c)return;
  if(c.state!=='running'&&c.resume)c.resume().catch(()=>{});          // scheduled anyway: it plays as soon as the context wakes up
  const t0=c.currentTime+at,o=c.createOscillator(),g=c.createGain();
  o.type=type;o.frequency.setValueAtTime(f,t0);if(to)o.frequency.exponentialRampToValueAtTime(to,t0+d);
  const peak=Math.max(.0001,v*cfg.vol);
  g.gain.setValueAtTime(.0001,t0);g.gain.exponentialRampToValueAtTime(peak,t0+.012);g.gain.exponentialRampToValueAtTime(.0001,t0+d);
  o.connect(g);g.connect(c.destination);o.start(t0);o.stop(t0+d+.03);
 } const N={C4:261.6,D4:293.7,E4:329.6,G4:392,A4:440,C5:523.3,D5:587.3,E5:659.3,G5:784,A5:880,C6:1046.5};
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
 /* 0.2.56 — Dominó table sounds (js/domino-table.js): a tile slammed on the table, the double knock that means "paso", a swallow, a bottle cap.
  *  Built from a short burst of filtered noise (the "clack") plus a low thump, so they sound like wood and glass without any audio file. */
 function noise(d,f,q,v,at=0){
  const c=audio();if(!c)return;if(c.state!=='running'&&c.resume)c.resume().catch(()=>{});
  const n=Math.max(1,Math.floor(c.sampleRate*d)),b=c.createBuffer(1,n,c.sampleRate),a=b.getChannelData(0);
  for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/n,3);
  const t0=c.currentTime+at,s=c.createBufferSource(),fl=c.createBiquadFilter(),g=c.createGain();
  s.buffer=b;fl.type='bandpass';fl.frequency.value=f;fl.Q.value=q;g.gain.value=Math.max(.0001,v*cfg.vol);
  s.connect(fl);fl.connect(g);g.connect(c.destination);s.start(t0);
 }
 SOUNDS.clack=()=>{noise(.07,2600,1.2,.9);noise(.05,900,.8,.7);tone(210,.09,'sine',.34,0,95)};
 SOUNDS.knock=()=>{[0,.17].forEach(t=>{noise(.05,700,.9,.6,t);tone(150,.11,'sine',.4,t,70)})};
 SOUNDS.glug=()=>{[0,.11,.22].forEach((t,i)=>tone(260+i*40,.1,'sine',.26,t,170+i*20));noise(.18,1800,3,.12,.05)};
 SOUNDS.pop=()=>{noise(.06,1500,1,.7);tone(700,.1,'sine',.3,0,240)};
 Object.assign(VIBES,{clack:12,knock:[14,70,14],glug:[8,30,8,30,8],pop:10});
 const RULES_FX=[
  [/¡dos!/i,'hint'],[/gana la partida|jaque\s*mate|¡escoba|¡dominó|¡rummy|hundi/i,'bonus'],[/tornado|súper|rebobinar/i,'bonus'],
  [/tocado|¡pareja|captur|barri/i,'good'],[/jaque/i,'hint'],[/agua\b/i,'miss'],
  [/no coinciden|no es una|no encaja|se pasó|es obligatorio|tiene que ser|no puedes|ya hay un/i,'gbad']
 ];
 const E=s=>window.SudomiI18n?SudomiI18n.esLine(s):s; // en otros idiomas, vuelve a leer el texto en español
 let prevFx=new Set(),fxQueued=false,lastAt=0,endSeen=null;
 function scanGames(){
  fxQueued=false;const scr=document.querySelector('#miniGamesScreen');if(!scr||scr.classList.contains('hidden')){prevFx=new Set();endSeen=null;return}
  // end-of-game card
  const card=scr.querySelector('.game-end-card');
  if(card&&card!==endSeen){endSeen=card;const w=E((card.querySelector('strong')||{}).textContent||'');
   play(/sin ganador/i.test(w)||/computadora|\(IA\)/i.test(w)?'lose':/empate|tablas/i.test(w)?'draw':'win');prevFx=new Set([...prevFx]);return}
  if(!card)endSeen=null;
  // new messages
  const text=(scr.querySelector('#miniGameStage')||scr).innerText||'',now=new Set();
  for(const line of text.split('\n')){const l=line.trim();if(!l||l.length>200)continue;for(const [re,fx] of RULES_FX){if(re.test(E(l))){now.add(fx+'|'+l);break}}}
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
 window.SudomiSound={get cfg(){return {...cfg}},get info(){return {ios:isIOS,audio:ctx?ctx.state:'sin iniciar',vibration:!!nativeVibrate||isIOS}},set(o){cfg={...cfg,...o};save();if(o.sound===false&&silent){try{silent.pause()}catch(_){}silent=null}},play,test(){unlock();play('bonus')}};
})();
