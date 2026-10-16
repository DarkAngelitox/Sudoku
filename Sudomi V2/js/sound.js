/* SUDOMI 0.2.44 — Phase 15: sound and vibration, independent settings (Personalizar → "Sonido y vibración").
 * No audio files: every sound is synthesised with the Web Audio API, so it works offline and adds no weight.
 * 0.3.86: new engine (shared output with compressor, master volume and a short reverb; bell / wood / soft instruments), one sound set per game
 * style (PACKS, keyed by html[data-skin]; switch: cfg.themed), and sounds for the shop skins, the win animations and the Parchimi captures.
 * Events it reacts to (all fired by the other modules): 'sudomi-feedback' {type:'good'|'bad'|'bonus'|'hint', combo} from js/score.js,
 * 'sudomi-win', ui.lose(), 'sudomi-levelup' (js/xp.js), 'sudomi-achievement' (js/achievements.js) and taps on cells and tools.
 * The game already vibrates on a wrong number (js/app.js calls navigator.vibrate): that call is wrapped here so the vibration switch rules it too.
 * Browsers only allow audio after a touch/click, so the audio context is created on the first one. Settings: localStorage['sudomi-sound']. */
(()=>{
 const KEY='sudomi-sound';
 const read=()=>{try{const v=JSON.parse(localStorage.getItem(KEY))||{};return {sound:v.sound!==false,vibe:v.vibe!==false,themed:v.themed!==false,vol:typeof v.vol==='number'?Math.min(1,Math.max(0,v.vol)):.6}}catch(_){return {sound:true,vibe:true,themed:true,vol:.6}}};
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
 /* ---- 0.3.86: motor nuevo. Todo pasa por una salida común: compresor (nada satura aunque suenen muchas cosas a la vez), volumen general
  *      (el control de volumen se nota al instante) y una reverberación corta hecha con ruido, que es lo que quita el sonido «de pitido».
  *      tone(…, o) admite: a = ataque (s) · rv = cuánto va a la reverberación · lp = filtro pasa-bajos (Hz) · vib = vibrato (Hz) · gl = cuánto dura el glide */
 let bus=null;
 function out(c){
  if(bus)return bus;
  const inp=c.createGain(),comp=c.createDynamicsCompressor(),master=c.createGain(),send=c.createGain(),rev=c.createConvolver(),wet=c.createGain();
  try{comp.threshold.value=-16;comp.knee.value=20;comp.ratio.value=6;comp.attack.value=.004;comp.release.value=.22}catch(_){}
  const len=Math.floor(c.sampleRate*1.3),ir=c.createBuffer(2,len,c.sampleRate);
  for(let ch=0;ch<2;ch++){const a=ir.getChannelData(ch);for(let i=0;i<len;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/len,2.6)}
  rev.buffer=ir;wet.gain.value=.5;master.gain.value=cfg.vol;
  inp.connect(comp);send.connect(rev);rev.connect(wet);wet.connect(comp);comp.connect(master);master.connect(c.destination);
  return bus={inp,send,master};
 }
 function link(c,node,rv){const b=out(c);node.connect(b.inp);if(rv){const s=c.createGain();s.gain.value=rv;node.connect(s);s.connect(b.send)}}
 const wake=c=>{if(c.state!=='running'&&c.resume)c.resume().catch(()=>{})};   // scheduled anyway: it plays as soon as the context wakes up
 function tone(f,d,type='sine',v=.25,at=0,to=0,o){
  const c=audio();if(!c)return;wake(c);o=o||{};
  const t0=c.currentTime+at,os=c.createOscillator(),g=c.createGain(),a=Math.min(o.a||.008,d*.5);
  os.type=type;os.frequency.setValueAtTime(f,t0);if(to)os.frequency.exponentialRampToValueAtTime(to,t0+(o.gl||d));
  if(o.vib){const l=c.createOscillator(),lg=c.createGain();l.frequency.value=o.vib;lg.gain.value=f*.02;l.connect(lg);lg.connect(os.frequency);l.start(t0);l.stop(t0+d+.05)}
  g.gain.setValueAtTime(.0001,t0);g.gain.exponentialRampToValueAtTime(Math.max(.0002,v),t0+a);g.gain.exponentialRampToValueAtTime(.0001,t0+d);
  let last=os;if(o.lp){const fl=c.createBiquadFilter();fl.type='lowpass';fl.frequency.value=o.lp;os.connect(fl);last=fl}
  last.connect(g);link(c,g,o.rv);os.start(t0);os.stop(t0+d+.05);
 }
 // un golpe de ruido filtrado: largo (s), frecuencia del filtro, Q, volumen, cuándo empieza. o: type (filtro) · to (el filtro se mueve hasta ahí) ·
 // pow (lo rápido que se apaga) · scratch (ruido sostenido y tembloroso: el grafito del lápiz) · rv
 function noise(d,f,q,v,at=0,o){
  const c=audio();if(!c)return;wake(c);o=o||{};
  const sr=c.sampleRate,n=Math.max(1,Math.floor(sr*d)),b=c.createBuffer(1,n,sr),a=b.getChannelData(0),pw=o.pow||3;
  for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*(o.scratch?(.55+.45*Math.sin(i/sr*Math.PI*2*42))*Math.min(1,i/(sr*.02))*Math.min(1,(n-i)/(n*.3)):Math.pow(1-i/n,pw));
  const t0=c.currentTime+at,s=c.createBufferSource(),fl=c.createBiquadFilter(),g=c.createGain();
  s.buffer=b;fl.type=o.type||'bandpass';fl.frequency.setValueAtTime(f,t0);if(o.to)fl.frequency.exponentialRampToValueAtTime(o.to,t0+d);fl.Q.value=q;g.gain.value=Math.max(.0001,v);
  s.connect(fl);fl.connect(g);link(c,g,o.rv);s.start(t0);
 }
 // ---- instrumentos (nota MIDI, largo, volumen, cuándo): campana, madera (marimba) y el timbre suave del estilo clásico
 const M=n=>440*Math.pow(2,(n-69)/12);
 const bell=(n,d,v,at=0,rv=.25)=>{const f=M(n);tone(f,d,'sine',v,at,0,{rv});tone(f*2.76,d*.6,'sine',v*.35,at,0,{rv});tone(f*5.4,d*.3,'sine',v*.15,at,0,{rv})};
 const wood=(n,d,v,at=0)=>{const f=M(n);tone(f,d,'sine',v,at,0,{a:.003,rv:.1});tone(f*4,d*.25,'sine',v*.3,at,0,{a:.002});noise(.015,f*3,2,v*.5,at)};
 const soft=(n,d,v,at=0)=>{const f=M(n);tone(f,d,'triangle',v,at,0,{rv:.18});tone(f*2,d*.7,'sine',v*.3,at,0,{rv:.18})};
 const PEN=[0,2,4,7,9],MAJ=[0,2,4,5,7,9,11],MIN=[0,2,3,5,7,8,11];
 const SOUNDS={
  tap:()=>{noise(.02,2600,1.4,.3);tone(700,.035,'sine',.12,0,0,{a:.002})},
  good:combo=>{const i=Math.min((combo||1)-1,12),n=72+PEN[i%5]+12*Math.floor(i/5);soft(n,.16,.2);soft(n+7,.22,.12,.07)},   // el combo sube por la escala
  bad:()=>{tone(196,.2,'triangle',.3,0,131);tone(185,.22,'sine',.2,0,123)},
  hint:()=>{bell(88,.22,.13);bell(84,.32,.12,.1)},
  bonus:()=>{[72,76,79,84].forEach((n,i)=>bell(n,.3,.15,i*.075))},
  win:()=>{[72,76,79,84,79,84].forEach((n,i)=>soft(n,i>3?.5:.2,.2,i*.13));[60,64,67,72].forEach(n=>bell(n,1.2,.07,.78,.4))},
  lose:()=>{[67,63,60].forEach((n,i)=>tone(M(n),.45,'triangle',.18,i*.22,M(n)*.94,{rv:.3,lp:1800}))},
  levelup:()=>{[72,74,76,79,81,84].forEach((n,i)=>soft(n,.15,.15,i*.07));bell(96,.7,.09,.44,.4);bell(91,.7,.07,.44,.4)},
  achievement:()=>{[79,84,88,91].forEach((n,i)=>bell(n,.5,.13,i*.09,.4))},
  /* 0.2.45 — the "Otros juegos" */
  miss:()=>{tone(420,.13,'sine',.3,0,150);noise(.09,900,1,.2,.01)},
  gbad:()=>tone(180,.18,'triangle',.3,0,120),
  draw:()=>{soft(67,.18,.16);soft(67,.26,.13,.17)},
  /* 0.2.56 — Dominó table sounds (js/domino-table.js): a tile slammed on the table, the double knock that means "paso", a swallow, a bottle cap. */
  clack:()=>{noise(.07,2600,1.2,.9);noise(.05,900,.8,.7);tone(210,.09,'sine',.34,0,95)},
  knock:()=>{[0,.17].forEach(t=>{noise(.05,700,.9,.6,t);tone(150,.11,'sine',.4,t,70)})},
  glug:()=>{[0,.11,.22].forEach((t,i)=>tone(260+i*40,.1,'sine',.26,t,170+i*20));noise(.18,1800,3,.12,.05)},
  pop:()=>{noise(.06,1500,1,.7);tone(700,.1,'sine',.3,0,240)},
  /* 0.3.86 — golpes para las animaciones (capturas de Parchimi) y cosas de mesa */
  tick:()=>{tone(1300,.04,'square',.14,0,0,{lp:3000});noise(.015,3000,2,.25)},
  swish:()=>noise(.16,900,1.2,.6,0,{to:4200,pow:1.2}),
  slash:()=>{noise(.12,5000,1.5,.8,0,{to:1200,pow:1.5});tone(1900,.14,'sawtooth',.12,0,500,{lp:5000})},
  whack:()=>{noise(.07,1100,.8,.9);tone(160,.16,'sine',.42,0,60);noise(.04,3200,1.5,.4)},
  shot:()=>{noise(.09,1800,.6,.8,0,{pow:4});tone(240,.08,'square',.16,0,70,{lp:1500})},
  boom:()=>{noise(.7,220,.5,1,0,{type:'lowpass',pow:2,rv:.4});tone(90,.6,'sine',.5,0,32);noise(.12,2400,.7,.5)},
  dice:()=>{[0,.06,.13,.19,.27].forEach((t,i)=>{noise(.03,1700+i*230,2,.5-i*.06,t);tone(300+i*35,.04,'sine',.12,t,180)})},
  card:()=>noise(.09,3600,.9,.55,0,{to:1800,pow:1.6}),
  coin:()=>{bell(95,.12,.12,0,.2);bell(100,.5,.13,.07,.3)},
  /* 0.3.95 — Batalla naval: cañonazo con su silbido y, cuando el misil llega (0.3 s, como la animación), agua o explosión */
  nvfire:()=>{noise(.35,160,.6,.9,0,{type:'lowpass',pow:2.2,rv:.35});tone(70,.3,'sine',.5,0,38);noise(.05,2600,.8,.5);tone(1500,.26,'sine',.05,.03,520,{rv:.2})},
  nvmiss:()=>{SOUNDS.nvfire();noise(.6,1300,.5,.55,.3,{to:350,pow:1.6,rv:.35});noise(.25,3800,.7,.25,.32,{pow:2});[.42,.5,.6].forEach((t,i)=>tone(380-i*60,.07,'sine',.08,t,700,{a:.003}))},
  nvhit:()=>{SOUNDS.nvfire();noise(.9,190,.5,1,.3,{type:'lowpass',pow:1.8,rv:.5});tone(62,.7,'sine',.6,.3,28);noise(.18,2600,.6,.5,.3);for(let i=0;i<8;i++)noise(.02,3000+Math.random()*3500,3,.18,.45+Math.random()*.5,{pow:2})},
  nvsink:()=>{tone(85,1.6,'sawtooth',.12,0,52,{lp:420,rv:.4,a:.2});tone(130,1.1,'triangle',.07,.25,95,{lp:700,vib:3,rv:.5});noise(1.6,320,.5,.4,0,{type:'lowpass',pow:1.1,rv:.5});for(let i=0;i<10;i++){const t=.5+i*.11+Math.random()*.06;tone(240+Math.random()*260,.07,'sine',.07,t,600+Math.random()*400,{a:.004})}},
  nvsonar:()=>{tone(1180,.9,'sine',.16,0,0,{rv:.7,a:.004});tone(1180,.7,'sine',.06,.45,0,{rv:.7});tone(1185,.5,'sine',.03,.9,0,{rv:.7})},
  nvtorpedo:()=>{noise(.12,700,.8,.6,0,{type:'lowpass'});noise(.9,500,.9,.4,.05,{to:1600,pow:.8,rv:.3});[.1,.25,.4,.55,.7].forEach(t=>tone(300+Math.random()*200,.06,'sine',.05,t,650,{a:.003}))},
  nvplane:()=>{tone(95,1.1,'sawtooth',.09,0,140,{lp:600,a:.25,vib:12,rv:.3});tone(190,1.1,'sawtooth',.05,0,260,{lp:900,a:.25,vib:12})},
  /* 0.3.95 — capturas nuevas de Parchimi: rayo, bola de fuego y dragón */
  zap:()=>{for(let i=0;i<6;i++)noise(.03,4000+Math.random()*4000,2,.5,i*.035,{pow:1.5});tone(1800,.2,'sawtooth',.08,0,120,{lp:6000})},
  thunder:()=>{noise(1.4,180,.5,1,0,{type:'lowpass',pow:1.6,rv:.6});noise(.25,900,.6,.6,0,{pow:3});tone(55,1.1,'sine',.45,0,30);[.18,.42,.7].forEach(t=>noise(.3,240,.6,.5,t,{type:'lowpass',pow:2}))},
  fireball:()=>{noise(.5,400,.7,.6,0,{to:2400,pow:.9,rv:.3});tone(160,.45,'sawtooth',.06,0,420,{lp:1200})},
  roar:()=>{tone(92,.9,'sawtooth',.2,0,62,{lp:700,vib:14,a:.08,rv:.4});tone(138,.8,'sawtooth',.12,.05,90,{lp:900,vib:11,a:.08});noise(.9,500,.6,.45,0,{type:'lowpass',pow:1.4})},
  flame:()=>{noise(1.5,900,.5,.7,0,{type:'lowpass',pow:.5,rv:.3});noise(1.4,2600,.7,.25,.05,{pow:.6});for(let i=0;i<12;i++)noise(.015,2500+Math.random()*4000,2,.22,.2+Math.random()*1.2,{pow:2})},
  nvmove:()=>{noise(.5,600,.7,.3,0,{to:300,pow:1.3});tone(140,.4,'sine',.1,0,110,{a:.05})},
  /* skins de números del Sudoku (las pide js/shop.js al poner un número; los tiempos van con la animación de cada una) */
  pencil:()=>{noise(.15,3200,.9,.3,0,{scratch:1});noise(.2,2600,.9,.26,.19,{scratch:1});noise(.1,3600,.9,.2,.42,{scratch:1})},
  gold:()=>{bell(91,.25,.11,.38);bell(96,.6,.12,.44,.45);bell(103,.5,.05,.47,.45)},
  neon:()=>{tone(110,.3,'sawtooth',.05,0,0,{lp:900});tone(220,.3,'sawtooth',.05,0,900,{lp:2600});tone(990,.22,'sine',.1,.24,0,{rv:.4});tone(1485,.2,'sine',.05,.26,0,{rv:.4})},
  /* animaciones del final del Sudoku (winAnim de js/shop.js): redoble y platillo, fichas que caen, cohetes */
  wflag:()=>{for(let i=0;i<14;i++)noise(.035,1900,1.1,.16+i*.02,i*.06,{pow:2});noise(.8,7000,.6,.22,.86,{type:'highpass',pow:2,rv:.3});tone(110,.3,'sine',.35,.86,55)},
  wfall:()=>{for(let i=0;i<16;i++){const t=.1+i*.06+Math.random()*.05;noise(.05,1400-i*50,1.1,.5,t);tone(190-i*6,.08,'sine',.2,t,80)}},
  wfireworks:()=>{for(let n=0;n<9;n++){const t=.2+n*.37;if(n)tone(500,.3,'sine',.035,t-.3,1700);noise(.5,300+Math.random()*250,.6,.55,t,{type:'lowpass',pow:2.5,rv:.5});tone(80,.3,'sine',.25,t,40);
   for(let k=0;k<5;k++)noise(.02,5000+Math.random()*3000,3,.1,t+.12+Math.random()*.4)}}
 };
 const VIBES={tap:8,good:12,bonus:[18,40,18],hint:[10,30,10],win:[40,60,40,60,140],lose:[220],levelup:[30,40,30,40,80],achievement:[30,50,30],
  miss:8,gbad:[60,40,60],draw:[20,40,20],clack:12,knock:[14,70,14],glug:[8,30,8,30,8],pop:10,
  tick:6,slash:20,whack:40,shot:10,boom:[90,30,60],dice:[8,30,8,30,8],coin:10,
  nvmiss:12,nvhit:[20,280,90],nvsink:[60,60,60,60,200],nvsonar:8,nvtorpedo:10};
 /* ---- 0.3.86: cada estilo del juego (js/skins.js) tiene su propio juego de sonidos: un instrumento, una escala y un adorno.
  *      Con el estilo Clásico, o con «Sonidos del estilo» apagado, suenan los de arriba. Los sonidos de mesa (ficha, dado, carta…) no cambian. */
 const V={
  bell:(n,d,v,at)=>bell(n,d*1.8,v*.8,at,.4),
  organ:(n,d,v,at)=>{const f=M(n);tone(f,d*1.5,'triangle',v,at,0,{a:.03,rv:.5,vib:5.5});tone(f/2,d*1.5,'sine',v*.6,at,0,{a:.03,rv:.5});tone(f*1.5,d*1.2,'sine',v*.18,at,0,{a:.03,rv:.5})},
  spark:(n,d,v,at)=>{const f=M(n);tone(f,d*1.3,'sine',v,at,0,{rv:.45});tone(f*2,d,'triangle',v*.3,at+.02,0,{rv:.45});tone(f*3,d*.5,'sine',v*.12,at+.04,0,{rv:.45})},
  koto:(n,d,v,at)=>{const f=M(n);tone(f,d*1.6,'triangle',v*1.1,at,f*.985,{a:.002,rv:.2});tone(f*2,d*.5,'sawtooth',v*.2,at,0,{a:.002,lp:4000});noise(.012,f*4,3,v*.6,at)},
  chip:(n,d,v,at)=>tone(M(n),d*.9,'square',v*.8,at,0,{a:.002,lp:5000}),
  space:(n,d,v,at)=>{const f=M(n);tone(f*.5,d*1.6,'sine',v,at,f,{gl:.07,rv:.6});tone(f*1.005,d*1.8,'sine',v*.5,at,0,{a:.04,rv:.6,vib:7})},
  wood:(n,d,v,at)=>wood(n,d*1.2,v*1.2,at),
  bubble:(n,d,v,at)=>{const f=M(n);tone(f*.6,d,'sine',v*1.1,at,f,{gl:.05,a:.004,rv:.12})},
  brass:(n,d,v,at)=>{const f=M(n);tone(f,d*1.2,'sawtooth',v*.6,at,0,{a:.02,lp:f*4,rv:.2});tone(f*1.007,d*1.2,'sawtooth',v*.4,at,0,{a:.02,lp:f*3})},
  pure:(n,d,v,at)=>tone(M(n),d*1.1,'sine',v*.6,at,0,{a:.01,rv:.15})
 };
 const ORN={
  sleigh:at=>{for(let i=0;i<6;i++){const t=at+i*.085;noise(.05,7200,6,.22,t,{pow:2});noise(.05,9400,8,.14,t+.01,{pow:2})}},
  ghost:at=>tone(520,.9,'sine',.07,at,760,{a:.15,vib:6,rv:.6,gl:.5}),
  twinkle:at=>[0,4,7,12,16,19,24].forEach((k,i)=>tone(M(88+k),.18,'sine',.06,at+i*.045,0,{rv:.5})),
  taiko:at=>{tone(120,.35,'sine',.3,at,48,{a:.003});noise(.06,500,.7,.4,at)},
  punch:at=>{noise(.08,1200,.7,.5,at);tone(170,.18,'square',.2,at,55,{lp:900})},
  laser:at=>tone(1900,.35,'sawtooth',.05,at,180,{lp:4000,rv:.5}),
  bird:at=>[0,.11,.2].forEach((t,i)=>tone(2600+i*250,.08,'sine',.07,at+t,3500+i*200,{rv:.3})),
  pops:at=>[0,.07,.15].forEach((t,i)=>tone(500+i*180,.07,'sine',.14,at+t,1100+i*250,{a:.003})),
  crackle:at=>{for(let i=0;i<10;i++)noise(.012,2500+Math.random()*4000,2,.2+Math.random()*.2,at+Math.random()*.5,{pow:2});noise(.5,400,.7,.12,at,{type:'lowpass',pow:1.2})}
 };
 // o: v = instrumento · sc = escala · root = nota base · fx = adorno de los momentos grandes · tap / bad / lose = sonidos propios
 function pack(o){
  const L=o.sc.length,n=i=>o.root+o.sc[i%L]+12*Math.floor(i/L),fx=at=>{if(o.fx)o.fx(at)};
  return {
   tap:o.tap,bad:o.bad,
   good:combo=>{const i=Math.min((combo||1)-1,L*2);o.v(n(i),.16,.2,0);o.v(n(i+2),.2,.13,.07)},
   hint:()=>{o.v(n(4),.14,.16,0);o.v(n(2),.22,.14,.1)},
   bonus:()=>{[0,2,4,L].forEach((k,i)=>o.v(n(k),.2,.18,i*.075));fx(.3)},
   win:()=>{[0,2,4,L,4,L].forEach((k,i)=>o.v(n(k),i>3?.5:.2,.2,i*.13));[0,2,4].forEach(k=>o.v(n(k)-12,.9,.09,.8));fx(.8)},
   lose:o.lose||(()=>[4,2,0].forEach((k,i)=>o.v(n(k)-12,.4,.18,i*.22))),
   levelup:()=>{for(let i=0;i<=L;i++)o.v(n(i),.14,.14,i*.065);fx(.5)},
   achievement:()=>{[4,L,L+2].forEach((k,i)=>o.v(n(k),.3,.17,i*.1));fx(.3)}
  };
 }
 const PACKS={
  navidad:pack({v:V.bell,sc:MAJ,root:72,fx:ORN.sleigh,tap:()=>tone(M(96),.06,'sine',.14,0,0,{rv:.3}),bad:()=>{bell(58,.3,.16);bell(57,.3,.12,.02)}}),
  halloween:pack({v:V.organ,sc:MIN,root:57,fx:ORN.ghost,tap:()=>{tone(180,.05,'triangle',.2);noise(.02,900,2,.2)},
   bad:()=>{tone(M(42),.5,'sawtooth',.16,0,0,{lp:500,rv:.5});tone(M(48),.5,'sawtooth',.13,0,0,{lp:500,rv:.5})},lose:()=>[69,68,65,64,57].forEach((n,i)=>V.organ(n,.3,.15,i*.2))}),
  anime:pack({v:V.spark,sc:PEN,root:76,fx:ORN.twinkle,tap:()=>tone(M(100),.05,'sine',.12,0,0,{rv:.3}),bad:()=>{tone(M(64),.12,'triangle',.18,0,M(58));tone(M(58),.2,'triangle',.16,.11,M(52))}}),
  manga:pack({v:V.koto,sc:[0,1,5,7,10],root:69,fx:ORN.taiko,tap:()=>noise(.05,2400,1,.35,0,{to:900,pow:1.5}),bad:()=>ORN.taiko(0)}),
  comic:pack({v:V.chip,sc:MAJ,root:72,fx:ORN.punch,tap:()=>tone(880,.04,'square',.12,0,1320,{lp:5000}),bad:()=>tone(330,.2,'square',.25,0,82,{lp:2400})}),
  galaxia:pack({v:V.space,sc:[0,2,4,6,7,9,11],root:67,fx:ORN.laser,tap:()=>tone(1200,.06,'sine',.14,0,1900,{rv:.4}),bad:()=>tone(300,.35,'sawtooth',.25,0,60,{lp:1200,rv:.4})}),
  bosque:pack({v:V.wood,sc:PEN,root:67,fx:ORN.bird,tap:()=>wood(84,.05,.2),bad:()=>{wood(48,.2,.3);wood(47,.2,.2,.03)}}),
  caramelo:pack({v:V.bubble,sc:MAJ,root:79,fx:ORN.pops,tap:()=>tone(600,.05,'sine',.16,0,1200,{a:.003}),bad:()=>tone(500,.25,'sine',.3,0,140)}),
  fuego:pack({v:V.brass,sc:[0,1,4,5,7,8,10],root:62,fx:ORN.crackle,tap:()=>noise(.015,4500,2,.45),bad:()=>{noise(.35,2500,.8,.3,0,{to:300,pow:1.3});tone(150,.3,'sawtooth',.12,0,70,{lp:700})}}),
  minimalista:pack({v:V.pure,sc:PEN,root:72,tap:()=>tone(900,.025,'sine',.08),bad:()=>tone(220,.16,'sine',.14,0,180)})
 };
 const skin=()=>document.documentElement.getAttribute('data-skin')||'';
 function pick(name){const p=cfg.themed?PACKS[skin()]:null;return (p&&(p[name]||(name==='gbad'&&p.bad)))||SOUNDS[name]}
 function play(name,arg){
  const fn=pick(name);
  if(cfg.sound&&fn)try{fn(arg)}catch(_){}
  if(name!=='bad'&&VIBES[name]!==undefined)vibe(VIBES[name]);          // 'bad' vibrates through app.js's own navigator.vibrate(120)
 }
 // al cambiar de estilo suena su fanfarria corta, para oír cómo es antes de jugar
 let lastSkin=skin();
 new MutationObserver(()=>{const s=skin();if(s===lastSkin)return;lastSkin=s;if(cfg.themed&&touched())play('bonus')}).observe(document.documentElement,{attributes:true,attributeFilter:['data-skin']});
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
   play(/sin ganador/i.test(w)||/computadora|\(IA\)/i.test(w)?'lose':/empate|tablas/i.test(w)?'draw':'win');return}
  if(!card)endSeen=null;
  // new messages (0.3.95: Batalla naval pone sus propios sonidos, así que aquí no se lee)
  if(scr.querySelector('#miniGameStage .mini-game.nv')){prevFx=new Set();return}
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
 window.SudomiSound={get cfg(){return {...cfg}},get info(){return {ios:isIOS,audio:ctx?ctx.state:'sin iniciar',vibration:!!nativeVibrate||isIOS}},
  set(o){cfg={...cfg,...o};save();if(bus)bus.master.gain.value=cfg.vol;if(o.sound===false&&silent){try{silent.pause()}catch(_){}silent=null}},
  play,test(){unlock();play('bonus')},names:()=>Object.keys(SOUNDS)};
})();
