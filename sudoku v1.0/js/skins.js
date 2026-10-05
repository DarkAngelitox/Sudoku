/* SUDOMI 0.2.33 — game styles ("Estilo del juego"): Navidad, Halloween, Anime, Manga, Cómic.
 * A style changes three things and never touches the game rules:
 *   1. colours, fonts and decoration: html[data-skin="…"] blocks at the end of css/main.css
 *   2. icons and 3. texts: the table below. Every text/icon slot remembers its original, so the "Clásico" style puts everything back.
 * The attribute is set from <head> (no flash); the texts are applied once the page is ready. Choice: localStorage['sudomi-skin']. */
(()=>{
 const KEY='sudomi-skin',root=document.documentElement;
 const SKINS={
  navidad:{name:'Navidad',icon:'🎄',mode:'light',color:'#1b6b3a',t:{
   chip:'<span>🎅</span> Navidad dominicana',logoTag:'Sudoku con espíritu navideño.',brandTag:'Sudoku navideño.',
   kicker:'SUDOKU NAVIDEÑO',title:['Felices fiestas,','empieza el reto.'],desc:'Un sudoku calentito, con luces, regalos y mucho cariño. Juega a tu ritmo estas fiestas.',
   playMain:'Jugar',playSub:'Elige tu regalo',playIcon:'🎁',star:'❄️',n1:'🎁',n2:'⭐',
   eyebrow:'ARCADE NAVIDEÑO',secTitle:'Juega en familia',daily:'🎄',battle:'🎅',stats:'⛄',
   menu:['🦌','🧑‍🎄','🌟','🎅','🎨','🔔','🎮'],footer:'🎄 <span>Hecho con cariño dominicano</span>',arcade:'ARCADE NAVIDEÑO',arcadeIcon:'🎁',
   stats4:['RELOJ','CARBÓN','REGALOS','NIVEL'],tools:['🎴 Tarjetas','⌫ Quitar','🎁 Regalo'],
   diff:{easy:'Turrón',medium:'Ponche',hard:'Pavo',expert:'Reno',master:'Santa',extreme:'Grinch'},
   win:'🎄 ¡FELIZ NAVIDAD!',lose:'🎅 EL GRINCH GANÓ',
   congrats:['¡Feliz Navidad{n}! Sudoku completado.','¡Ho, ho, ho{n}! Qué cabeza.','¡Tremendo regalo{n}! Lo resolviste.','¡Brindemos{n}! Misión cumplida.','¡Qué nivel{n}! Hasta Santa aplaude. 🎅']}},
  halloween:{name:'Halloween',icon:'🎃',mode:'dark',color:'#6a2fb0',t:{
   chip:'<span>🦇</span> Noche de brujas',logoTag:'Sudoku de terror… y de lógica.',brandTag:'Sudoku embrujado.',
   kicker:'SUDOKU DE MEDIANOCHE',title:['Si te atreves,','empieza el reto.'],desc:'Entra a la casa embrujada de los números. Resuelve cada casilla antes de que amanezca.',
   playMain:'Jugar',playSub:'Elige tu pesadilla',playIcon:'🎃',star:'🕸️',n1:'👻',n2:'🦇',
   eyebrow:'ARCADE EMBRUJADO',secTitle:'Juega si te atreves',daily:'🧙',battle:'🧛',stats:'💀',
   menu:['🧠','🧙','🏆','👻','🎨','🕯️','🎮'],footer:'🎃 <span>Hecho con orgullo y un poco de susto</span>',arcade:'ARCADE EMBRUJADO',arcadeIcon:'🎃',
   stats4:['TIEMPO','MALDICIONES','POCIONES','NIVEL DE TERROR'],tools:['🕯️ Conjuros','⌫ Exorcizar','🧪 Poción'],
   diff:{easy:'Caramelo',medium:'Truco',hard:'Pesadilla',expert:'Vampiro',master:'Bruja mayor',extreme:'Apocalipsis'},
   win:'🎃 ¡HAS SOBREVIVIDO!',lose:'💀 LOS FANTASMAS GANARON',
   congrats:['¡Buuu{n}! Sudoku completado.','¡Qué brujería{n}! Lo resolviste.','¡Sobreviviste{n}! Ni los fantasmas te pararon.','¡Truco o trato{n}! Trato hecho.','¡Eres un monstruo{n}… de la lógica! 🦇']}},
  anime:{name:'Anime',icon:'🌸',mode:'light',color:'#d6307f',t:{
   chip:'<span>🎌</span> Modo anime',logoTag:'Lógica con espíritu de héroe.',brandTag:'Sudoku, capítulo uno.',
   kicker:'SUDOKU ESTILO ANIME',title:['Tu aventura','empieza aquí.'],desc:'Entrena tu mente, sube de nivel y conviértete en la leyenda del tablero. ¡Tú puedes!',
   playMain:'Jugar',playSub:'Elige tu misión',playIcon:'⚔️',star:'✨',n1:'🌸',n2:'⭐',
   eyebrow:'ARCADE DE AVENTURAS',secTitle:'Juega con tu equipo',daily:'📅',battle:'⚔️',stats:'📊',
   menu:['🧠','🥋','🏆','🦸','🎨','⚙️','🎮'],footer:'🌸 <span>Hecho con corazón dominicano</span>',arcade:'ARCADE DE AVENTURAS',arcadeIcon:'🎌',
   stats4:['TIEMPO','FALLOS','AYUDAS','RANGO'],tools:['✍️ Apuntes','⌫ Borrar','💫 Ayuda'],
   diff:{easy:'Novato',medium:'Aprendiz',hard:'Guerrero',expert:'Maestro',master:'Leyenda',extreme:'Dios'},
   win:'🌸 ¡VICTORIA!',lose:'💫 ¡NO TE RINDAS!',
   congrats:['¡Sugoi{n}! Sudoku completado.','¡Lo lograste{n}! Subiste de nivel.','¡Eres el protagonista{n}! 🌸','¡Increíble{n}! Poder de la amistad… y de la lógica.','¡Ganaste{n}! Fin del capítulo. ✨']}},
  manga:{name:'Manga',icon:'📖',mode:'light',color:'#111111',t:{
   chip:'<span>📖</span> Edición manga',logoTag:'En blanco y negro, con carácter.',brandTag:'Sudoku en tinta.',
   kicker:'SUDOKU EN TINTA',title:['Capítulo uno:','empieza el reto.'],desc:'Páginas, tinta y lógica. Resuelve el tablero como si fuera el último capítulo de tu serie favorita.',
   playMain:'Leer capítulo',playSub:'Elige tu historia',playIcon:'📖',star:'💥',n1:'✒️',n2:'💢',
   eyebrow:'COLECCIÓN DE JUEGOS',secTitle:'Más capítulos',daily:'📰',battle:'💥',stats:'📚',
   menu:['🧠','🎓','🏆','🖋️','🎨','⚙️','📚'],footer:'📖 <span>Hecho con tinta dominicana</span>',arcade:'COLECCIÓN DE JUEGOS',arcadeIcon:'📚',
   stats4:['TIEMPO','TACHONES','PISTAS','TOMO'],tools:['✒️ Bocetos','⌫ Tachar','💡 Pista'],
   diff:{easy:'Prólogo',medium:'Capítulo 1',hard:'Capítulo 2',expert:'Arco final',master:'Obra maestra',extreme:'Edición infinita'},
   win:'📖 ¡FIN DEL CAPÍTULO!',lose:'💥 CONTINUARÁ…',
   congrats:['¡Fin del capítulo{n}!','¡Gran trazo{n}! Sudoku completado.','¡Obra maestra{n}!','¡Siguiente tomo{n}! Lo resolviste.','¡Qué final{n}! 📖']}},
  comic:{name:'Cómic',icon:'💥',mode:'light',color:'#1e4bd8',t:{
   chip:'<span>💥</span> Superhéroes',logoTag:'¡Sudoku con superpoderes!',brandTag:'¡Sudoku superpoderoso!',
   kicker:'SUDOKU DE SUPERHÉROES',title:['¡Zas! Tu reto','empieza aquí.'],desc:'¡Pow! Salva la ciudad resolviendo cada casilla. Los números te necesitan, héroe.',
   playMain:'¡Jugar!',playSub:'Elige tu misión',playIcon:'⚡',star:'💫',n1:'💥',n2:'⚡',
   eyebrow:'LIGA DE JUEGOS',secTitle:'Juega con tu liga',daily:'📅',battle:'🦸',stats:'📊',
   menu:['🧠','🦹','🏆','🦸','🎨','⚙️','🎮'],footer:'💥 <span>¡Hecho por héroes dominicanos!</span>',arcade:'LIGA DE JUEGOS',arcadeIcon:'💥',
   stats4:['TIEMPO','¡OUCH!','PODERES','NIVEL'],tools:['💭 Globos','⌫ ¡Zas!','⚡ Poder'],
   diff:{easy:'Aprendiz',medium:'Sidekick',hard:'Héroe',expert:'Superhéroe',master:'Titán',extreme:'Villano final'},
   win:'💥 ¡POW! ¡MISIÓN CUMPLIDA!',lose:'💫 ¡AUCH! EL VILLANO GANÓ',
   congrats:['¡POW{n}! Sudoku completado.','¡Zas{n}! Ciudad salvada.','¡Eres un superhéroe{n}! 🦸','¡BAM{n}! Lo resolviste.','¡Increíble{n}! Los números te aplauden. 💥']}},
  /* 0.2.44 (Phase 14): Galaxia, Bosque, Caramelo, Fuego, Minimalista */
  galaxia:{name:'Galaxia',icon:'🌌',color:'#5b2bd1',t:{
   chip:'<span>🚀</span> Misión espacial',logoTag:'Lógica a velocidad luz.',brandTag:'Sudoku intergaláctico.',
   kicker:'SUDOKU INTERGALÁCTICO',title:['Despega hacia','tu próximo reto.'],desc:'Viaja por la galaxia de los números y resuelve cada casilla como un verdadero capitán.',
   playMain:'Despegar',playSub:'Elige tu misión',playIcon:'🚀',star:'⭐',n1:'🪐',n2:'☄️',
   eyebrow:'ARCADE ESPACIAL',secTitle:'Juega con tu tripulación',daily:'🛰️',battle:'👽',stats:'🌠',
   menu:['🧠','👨‍🚀','🏆','🧑‍🚀','🎨','⚙️','🎮'],footer:'🌌 <span>Hecho con orgullo dominicano… en órbita</span>',arcade:'ARCADE ESPACIAL',arcadeIcon:'🪐',
   stats4:['TIEMPO','ASTEROIDES','COMBUSTIBLE','NIVEL'],tools:['🛰️ Señales','⌫ Borrar','🔭 Radar'],
   diff:{easy:'Cadete',medium:'Piloto',hard:'Capitán',expert:'Comandante',master:'Almirante',extreme:'Leyenda cósmica'},
   win:'🚀 ¡MISIÓN CUMPLIDA!',lose:'☄️ PERDIMOS LA NAVE',
   congrats:['¡Misión cumplida{n}!','¡Houston, lo logramos{n}!','¡Eres una estrella{n}! ⭐','¡Despegue perfecto{n}!','¡Galáctico{n}! Sudoku completado.']}},
  bosque:{name:'Bosque',icon:'🌲',color:'#2d6a3e',t:{
   chip:'<span>🍃</span> Naturaleza dominicana',logoTag:'Lógica que crece como un árbol.',brandTag:'Sudoku del bosque.',
   kicker:'SUDOKU DEL BOSQUE',title:['Respira hondo,','empieza tu reto.'],desc:'Camina entre los números con calma. Cada casilla es una hoja nueva en tu árbol de lógica.',
   playMain:'Jugar',playSub:'Elige tu sendero',playIcon:'🌿',star:'🍃',n1:'🍄',n2:'🦉',
   eyebrow:'ARCADE DEL BOSQUE',secTitle:'Juega entre amigos',daily:'🍂',battle:'🦊',stats:'🌳',
   menu:['🧠','🦉','🏆','🌱','🎨','⚙️','🎮'],footer:'🌲 <span>Hecho con raíces dominicanas</span>',arcade:'ARCADE DEL BOSQUE',arcadeIcon:'🌲',
   stats4:['TIEMPO','TROPIEZOS','AYUDAS','NIVEL'],tools:['🍃 Hojas','⌫ Quitar','🔦 Linterna'],
   diff:{easy:'Brote',medium:'Arbusto',hard:'Roble',expert:'Secuoya',master:'Guardabosques',extreme:'Espíritu del bosque'},
   win:'🌳 ¡LLEGASTE AL CLARO!',lose:'🍂 TE PERDISTE EN EL BOSQUE',
   congrats:['¡Qué bien{n}! Sudoku completado.','¡Creciste como un roble{n}! 🌳','¡Bravo{n}! El bosque te aplaude.','¡Sendero completado{n}!','¡Naturalmente genial{n}! 🍃']}},
  caramelo:{name:'Caramelo',icon:'🍬',color:'#e0408f',t:{
   chip:'<span>🍭</span> Modo dulce',logoTag:'Un sudoku dulcito.',brandTag:'Sudoku de caramelo.',
   kicker:'SUDOKU DULCE',title:['Un reto dulce','te espera.'],desc:'Colores, caramelos y mucha lógica. Resuelve el tablero sin que se te derrita la paciencia.',
   playMain:'Jugar',playSub:'Elige tu sabor',playIcon:'🍭',star:'🍬',n1:'🍩',n2:'🧁',
   eyebrow:'ARCADE DULCE',secTitle:'Juega con tus amigos',daily:'🍰',battle:'🎂',stats:'🍫',
   menu:['🧠','🍪','🏆','🍓','🎨','⚙️','🎮'],footer:'🍬 <span>Hecho con dulzura dominicana</span>',arcade:'ARCADE DULCE',arcadeIcon:'🍭',
   stats4:['TIEMPO','AMARGOS','DULCES','SABOR'],tools:['🍬 Notitas','⌫ Borrar','🍯 Miel'],
   diff:{easy:'Chicle',medium:'Piruleta',hard:'Caramelo',expert:'Bombón',master:'Turrón',extreme:'Mega dulce'},
   win:'🍭 ¡QUÉ DELICIA!',lose:'🍋 ¡QUÉ AGRIO!',
   congrats:['¡Qué dulce{n}! Sudoku completado.','¡Delicioso{n}! 🍭','¡Dulce victoria{n}!','¡Un bombón{n}! Lo resolviste.','¡Azúcar{n}! Misión cumplida. 🍬']}},
  fuego:{name:'Fuego',icon:'🔥',color:'#d9381e',t:{
   chip:'<span>🔥</span> Modo fuego',logoTag:'Lógica que quema.',brandTag:'Sudoku en llamas.',
   kicker:'SUDOKU EN LLAMAS',title:['Enciende tu','próximo reto.'],desc:'Que no se apague la llama: resuelve cada casilla y mantén el combo encendido.',
   playMain:'¡Prender!',playSub:'Elige tu fuego',playIcon:'🔥',star:'✨',n1:'🌋',n2:'🧨',
   eyebrow:'ARCADE ARDIENTE',secTitle:'Juega con fuego',daily:'🌅',battle:'🧯',stats:'🌡️',
   menu:['🧠','🧑‍🚒','🏆','🔥','🎨','⚙️','🎮'],footer:'🔥 <span>Hecho con sabor y candela</span>',arcade:'ARCADE ARDIENTE',arcadeIcon:'🔥',
   stats4:['TIEMPO','QUEMADAS','APAGONES','CALOR'],tools:['🕯️ Chispas','⌫ Apagar','🧯 Extintor'],
   diff:{easy:'Chispa',medium:'Llama',hard:'Hoguera',expert:'Incendio',master:'Volcán',extreme:'Infierno'},
   win:'🔥 ¡ESTÁS EN LLAMAS!',lose:'💨 SE APAGÓ LA LLAMA',
   congrats:['¡Estás en candela{n}!','¡Qué fuego{n}! Sudoku completado.','¡Ardiente{n}! 🔥','¡Pura llama{n}!','¡Incendiaste el tablero{n}!']}},
  minimalista:{name:'Minimalista',icon:'⚪',color:'#374151',t:{
   chip:'<span>○</span> Modo minimalista',logoTag:'Menos ruido, más lógica.',brandTag:'Sudoku sin ruido.',
   kicker:'SUDOKU MINIMALISTA',title:['Un reto,','sin ruido.'],desc:'Solo tú y el tablero. Todo lo demás se queda fuera.',
   playMain:'Jugar',playSub:'Elige la dificultad',playIcon:'▶',star:'·',n1:'1',n2:'9',
   eyebrow:'JUEGOS',secTitle:'Más juegos',daily:'·',battle:'·',stats:'·',
   menu:['·','·','·','·','·','·','·'],footer:'<span>Hecho con orgullo dominicano</span>',arcade:'JUEGOS',arcadeIcon:'○',
   tools:['Notas','Borrar','Pista'],
   win:'¡SUDOKU COMPLETADO!',lose:'SUDOKU NO RESUELTO'}}
 };
 const ORDER=['navidad','halloween','anime','manga','comic','galaxia','bosque','caramelo','fuego','minimalista'];
 const read=()=>{try{const v=localStorage.getItem(KEY);return SKINS[v]?v:''}catch(_){return ''}};
 let current=read();
 const $$=s=>[...document.querySelectorAll(s)];
 const orig=(el)=>{if(el.dataset.skOrig===undefined)el.dataset.skOrig=el.innerHTML;return el.dataset.skOrig};
 function put(sel,val,build){$$(sel).forEach(el=>{const o=orig(el);el.innerHTML=val===undefined?o:(build?build(val,o):val)})}
 function putEach(sel,arr){$$(sel).forEach((el,i)=>{const o=orig(el);el.innerHTML=arr&&arr[i]!==undefined?arr[i]:o})}
 let savedDiff=null,savedCongrats=null;
 function applyTexts(){
  const t=(SKINS[current]||{}).t||{},C=window.SudomiCore;
  put('.dom-chip',t.chip);put('.logo-word small',t.logoTag);put('.game-brand-copy small',t.brandTag);
  put('.home-kicker',t.kicker,v=>`<span></span> ${v}`);
  put('#homeTitle',t.title,v=>`${v[0]}<br><em>${v[1]}</em>`);
  put('.hero-description',t.desc);put('.play-button strong',t.playMain);put('.play-button small',t.playSub);put('.play-icon',t.playIcon);
  put('.floating-star',t.star);put('.n-one',t.n1);put('.n-two',t.n2);
  put('.games-section .section-eyebrow',t.eyebrow);put('.games-section .section-heading h2',t.secTitle);
  put('.daily-icon',t.daily);put('.battle-icon',t.battle);put('.stats-icon',t.stats);
  putEach('.home-dropdown .dropdown-option>span:first-child',t.menu);
  put('.home-footer>span:first-child',t.footer);
  put('.mini-games-header p',t.arcade);put('.games-brand-mark',t.arcadeIcon);
  putEach('.statsbar small',t.stats4);putEach('#notesBtn,#eraseBtn,#hintBtn',t.tools);
  // difficulty names, win/lose texts and congratulations
  if(C){
   if(!savedDiff){savedDiff={};for(const k in C.DIFFICULTIES)savedDiff[k]=C.DIFFICULTIES[k].label;savedCongrats=[...C.CONGRATS]}
   for(const k in savedDiff)C.DIFFICULTIES[k].label=(t.diff&&t.diff[k])||savedDiff[k];
   C.CONGRATS.splice(0,C.CONGRATS.length,...(t.congrats||savedCongrats));
   $$('#difficulty option').forEach(o=>{const l=C.DIFFICULTIES[o.value];if(l)o.textContent=l.label});
   try{C.ui.render()}catch(_){}
  }
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta&&current&&!(window.SudomiTheme&&SudomiTheme.current==='dark'))meta.setAttribute('content',SKINS[current].color);
  fixModal();
 }
 // texts of the dialogs that the game builds itself (difficulty picker, win, lose); the dialog is rebuilt every time it opens
 function fixModal(){
  const m=document.querySelector('#modal'),t=(SKINS[current]||{}).t;if(!m||!t)return;
  const pairs=[['🏆 ¡SUDOKU COMPLETADO!',t.win],['💥 SUDOMI TE VENCIÓ',t.lose]];
  const base={easy:'Fácil',medium:'Medio',hard:'Difícil',expert:'Experto',master:'Maestro',extreme:'Extremo'};
  for(const k in base)pairs.push([base[k],(t.diff||{})[k]||base[k]]);
  const w=document.createTreeWalker(m,NodeFilter.SHOW_TEXT);let n;
  while((n=w.nextNode())){const s=n.nodeValue.trim(),hit=pairs.find(p=>p[0]===s);if(hit)n.nodeValue=n.nodeValue.replace(s,hit[1])}
 } function apply(){
  if(current)root.setAttribute('data-skin',current);else root.removeAttribute('data-skin');
  const meta=document.querySelector('meta[name="theme-color"]');if(meta&&current&&!(window.SudomiTheme&&SudomiTheme.current==='dark'))meta.setAttribute('content',SKINS[current].color);
 }
 function set(id,opts){
  current=SKINS[id]?id:'';try{if(current)localStorage.setItem(KEY,current);else localStorage.removeItem(KEY)}catch(_){}
  apply();applyTexts();
  // 0.2.37: a style never changes light/dark mode: the player's choice (day or night) always stays
 }
 apply();
 function ready(){
  applyTexts();
  const m=document.querySelector('#modal');if(m)new MutationObserver(fixModal).observe(m,{childList:true,subtree:true});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready);else ready();
 window.SudomiSkins={list:ORDER.map(id=>({id,name:SKINS[id].name,icon:SKINS[id].icon,color:SKINS[id].color})),get current(){return current},set};
})();
