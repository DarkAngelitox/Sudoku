/* SUDOMI 0.2.29 — STOP for 1 to 8 players (window.SudomiStop).
 *
 * Modes: against the computer (1 vs 1), an online room for 2–8 players (empty seats are played by the computer),
 * or the older two-player game on one phone (it lives in extra-games.js and is opened through ui.legacy()).
 *
 * A round: a letter and 10 categories → everyone writes at the same time; the first to press STOP ends the round at once (160 s per round; only with all 10 boxes filled; the stopper loses 20 per wrong answer)
 * → everyone sees all the answers and can mark the ones they do not accept → points:
 * 10 for a valid answer nobody else gave, 5 if someone else wrote the same, 0 if empty, wrong letter or rejected by
 * the majority of the other players. Totals add up over the rounds played in the same room.
 *
 * Online play is host-authoritative (js/party-net.js): guests send their drafts and votes, the host runs the clock
 * and sends each phone what it may see (nobody sees other players' answers before the voting starts).
 */
(()=>{
 /* ================= words the computer can answer with ================= */
 const WORDS={
  'Nombre':'Ana|Andrés|Beatriz|Bruno|Carlos|Carmen|Daniel|Diana|Eduardo|Elena|Fernando|Fátima|Gabriel|Gloria|Héctor|Helena|Isabel|Iván|Ignacio|Juan|Julia|Jorge|Luis|Laura|Lucía|Manuel|María|Nicolás|Natalia|Néstor|Óscar|Olga|Pedro|Paola|Rafael|Rosa|Ramón|Sofía|Santiago|Tomás|Teresa|Ulises|Úrsula|Víctor|Valeria',
  'Apellido':'Álvarez|Abreu|Báez|Batista|Castillo|Cruz|Díaz|Durán|Estévez|Espinal|Fernández|Féliz|García|Guzmán|Hernández|Henríquez|Ibarra|Jiménez|Jáquez|López|Lantigua|Martínez|Mejía|Núñez|Nova|Ortiz|Olivo|Pérez|Peña|Polanco|Ramírez|Rosario|Rodríguez|Sánchez|Santos|Tavárez|Torres|Ureña|Uribe|Vargas|Ventura',
  'Animal':'abeja|araña|ballena|burro|búho|caballo|cabra|cocodrilo|delfín|elefante|erizo|foca|flamenco|gato|gallina|gaviota|hipopótamo|hormiga|iguana|jirafa|jaguar|león|lobo|lagarto|mono|mariposa|murciélago|nutria|oso|oveja|pato|perro|pingüino|rana|ratón|serpiente|sapo|tigre|tortuga|urraca|vaca|venado',
  'País':'Argentina|Alemania|Bolivia|Brasil|Canadá|Chile|Colombia|Cuba|Dinamarca|Ecuador|España|Egipto|Estonia|Francia|Finlandia|Grecia|Guatemala|Haití|Honduras|India|Italia|Irlanda|Japón|Jamaica|Líbano|Libia|México|Marruecos|Nicaragua|Noruega|Omán|Perú|Panamá|Rusia|Rumania|Suecia|Suiza|Turquía|Tailandia|Uruguay|Ucrania|Venezuela|Vietnam',
  'Ciudad':'Azua|Atlanta|Barahona|Bonao|Bogotá|Caracas|Constanza|Cotuí|Dajabón|Dallas|El Seibo|Estambul|Florencia|Filadelfia|Ginebra|Guayaquil|Higüey|Houston|Iquitos|Jarabacoa|Jerusalén|La Romana|Lima|Londres|Moca|Madrid|Miami|Nagua|Nueva York|Ocoa|Oslo|Puerto Plata|París|Quito|Roma|Río de Janeiro|Santiago|Samaná|Tokio|Toronto|Uruapan|Valencia|Viena',
  'Comida':'arroz|arepa|burrito|bandera dominicana|chicharrón|chivo guisado|domplines|dulce de leche|empanada|espagueti|fritura|fajitas|guiso|gofio|habichuelas|hamburguesa|huevo|jamón|lasaña|locrio|mangú|moro|mofongo|natilla|ñoquis|omelet|pastelón|pizza|pollo|quesadilla|queso frito|ravioles|sancocho|sopa|tostones|tacos|tamal|vegetales',
  'Fruta':'aguacate|anón|banana|cereza|chinola|coco|ciruela|cajuil|durazno|frambuesa|fresa|guayaba|granada|guanábana|higo|jobo|jagua|limón|lechosa|mango|manzana|melón|mandarina|mamón|naranja|níspero|nectarina|pera|piña|pomelo|sandía|tamarindo|toronja|uva|uchuva',
  'Verdura':'ají|apio|ajo|auyama|alcachofa|berenjena|brócoli|batata|berro|calabaza|cebolla|coliflor|cilantro|espinaca|espárrago|endivia|frijol|guisante|habichuela|jengibre|lechuga|maíz|nabo|ñame|orégano|pepino|perejil|puerro|rábano|remolacha|rúcula|tomate|tayota|vainita',
  'Color':'amarillo|azul|ámbar|aguamarina|beige|blanco|bermellón|café|celeste|carmesí|dorado|durazno|esmeralda|fucsia|gris|granate|hueso|índigo|jade|lila|lavanda|marrón|morado|magenta|mostaza|naranja|negro|ocre|oro|plateado|púrpura|rojo|rosado|salmón|turquesa|terracota|verde|violeta|vino',
  'Profesión':'abogado|arquitecto|bombero|barbero|carpintero|chef|contador|cajero|dentista|doctor|electricista|enfermero|farmacéutico|fotógrafo|granjero|guardia|historiador|ingeniero|jardinero|juez|locutor|maestro|mecánico|músico|notario|nutricionista|odontólogo|obrero|piloto|policía|periodista|panadero|psicólogo|químico|recepcionista|sastre|secretario|taxista|técnico|traductor|veterinario|vendedor',
  'Deporte':'atletismo|ajedrez|baloncesto|béisbol|boxeo|bádminton|buceo|ciclismo|clavados|esgrima|esquí|fútbol|golf|gimnasia|hockey|halterofilia|judo|lucha|natación|polo|patinaje|pádel|remo|rugby|softbol|surf|tenis|taekwondo|triatlón|voleibol|vela',
  'Marca':'Adidas|Apple|Altice|Bimbo|Brugal|Barceló|Coca-Cola|Claro|Dell|Disney|Fanta|Ford|Google|Gucci|Gatorade|Honda|Huawei|IKEA|Induveca|Instagram|Jeep|Lego|Lenovo|Lacoste|Mazda|Microsoft|Movistar|Nike|Nestlé|Nintendo|Netflix|Oreo|Puma|Pepsi|Presidente|Rolex|Rica|Samsung|Sony|Toyota|Tesla|Uber|Visa|Volvo',
  'Objeto de la casa':'abanico|almohada|aspiradora|bañera|bombillo|cama|cuchara|cortina|cuchillo|colchón|ducha|despertador|escoba|espejo|estufa|florero|freezer|grifo|guayo|horno|hamaca|inodoro|jarra|jabón|lámpara|licuadora|mesa|microondas|nevera|olla|plato|puerta|reloj|radio|sofá|silla|sartén|televisor|taza|tenedor|utensilio|ventilador|vaso|ventana',
  'Prenda de vestir':'abrigo|bata|blusa|bufanda|boina|bermudas|botas|calcetín|camisa|chaqueta|corbata|chancletas|delantal|enagua|falda|franela|gorra|guantes|gabardina|huaraches|jeans|jersey|leggins|medias|mameluco|minifalda|overol|pantalón|pijama|poncho|saco|sombrero|sandalias|suéter|tenis|traje|uniforme|vestido|vaqueros',
  'Parte del cuerpo':'abdomen|boca|brazo|cabeza|cadera|codo|cuello|ceja|corazón|dedo|diente|espalda|estómago|frente|garganta|glúteo|hombro|hígado|intestino|iris|labio|lengua|mano|mejilla|muñeca|mandíbula|nariz|nuca|ojo|oreja|ombligo|pie|pierna|pestaña|pulmón|rodilla|riñón|tobillo|talón|uña|vena|vientre',
  'Transporte':'avión|autobús|ambulancia|avioneta|barco|bicicleta|bote|camión|carro|canoa|crucero|concho|carreta|dirigible|furgoneta|ferry|guagua|góndola|helicóptero|hidroavión|jeep|lancha|limusina|metro|motocicleta|monopatín|nave espacial|patineta|patines|planeador|remolque|submarino|scooter|taxi|tren|teleférico|tranvía|trineo|ultraligero|velero'
 };
 const CATS=Object.keys(WORDS);
 const LETTERS='ABCDEFGHIJLMNOPRSTUV'.split('');
 const ANSWER_TIME=160,VOTE_TIME=60;       // 0.2.64: 160 s per round; STOP ends the round at once and needs all 10 boxes filled; the one who says STOP loses 20 per wrong answer
 const norm=s=>String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').trim().toLowerCase();
 const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
 const esc=t=>String(t).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const clean10=a=>Array.from({length:10},(_,i)=>String(a&&a[i]!=null?a[i]:'').replace(/\s+/g,' ').trim().slice(0,40));

 /* ================= 1. rules (host side) ================= */
 function newRound(prev,names,kinds){
  const n=names.length,last=prev&&prev.letter;
  let letter;do{letter=LETTERS[Math.floor(Math.random()*LETTERS.length)]}while(letter===last);
  return {n,names,kinds,letter,cats:shuffle(CATS.slice()).slice(0,10),phase:'answer',left:ANSWER_TIME,stopBy:-1,
   answers:Array.from({length:n},()=>Array(10).fill('')),drafts:Array.from({length:n},()=>Array(10).fill('')),done:Array(n).fill(false),
   aiAt:kinds.map(k=>k==='ai'?ANSWER_TIME-(55+Math.floor(Math.random()*70)):-1),
   marks:Array.from({length:n},()=>[]),voted:Array(n).fill(false),rows:null,points:null,
   totals:prev?prev.totals.slice():Array(n).fill(0),round:prev?prev.round+1:1,seq:0};
 }
 const startsOk=(s,txt)=>{const a=norm(txt);return !!a&&a[0]===s.letter.toLowerCase()};
 function aiAnswers(s){return s.cats.map(c=>{const list=WORDS[c].split('|').filter(w=>norm(w)[0]===s.letter.toLowerCase());return list.length&&Math.random()<.8?list[Math.floor(Math.random()*list.length)]:''})}
 // STOP: only with all 10 boxes filled; it ends the round immediately (everybody else's current writing is taken as it is)
 function submit(s,p,list){
  if(s.phase!=='answer'||s.done[p])return false;
  const a=clean10(list);if(!a.every(Boolean))return false;
  s.answers[p]=a;s.done[p]=true;s.stopBy=p;
  toVote(s);
  s.seq++;return true;
 }
 function toVote(s){
  s.done.forEach((d,p)=>{if(!d){s.answers[p]=clean10(s.drafts[p]);s.done[p]=true}});
  s.phase='vote';s.left=VOTE_TIME;
  s.kinds.forEach((k,p)=>{if(k==='ai')s.voted[p]=true});           // the computer accepts everything
  s.seq++;
 }
 function mark(s,voter,p,q){
  if(s.phase!=='vote'||s.voted[voter]||voter===p||!(q>=0&&q<10)||!(p>=0&&p<s.n))return false;
  const key=p+':'+q,list=s.marks[voter],i=list.indexOf(key);
  if(i>=0)list.splice(i,1);else list.push(key);
  s.seq++;return true;
 }
 // an answer is rejected when most of the other players who can vote (people, not the computer) marked it
 function rejected(s,p,q){const voters=s.kinds.map((k,v)=>v!==p&&k!=='ai'?v:-1).filter(v=>v>=0);if(!voters.length)return false;const no=voters.filter(v=>s.marks[v].includes(p+':'+q)).length;return no*2>voters.length}
 function score(s){
  s.rows=Array.from({length:s.n},()=>Array(10).fill(0));
  for(let q=0;q<10;q++){
   const ok=[];for(let p=0;p<s.n;p++)if(startsOk(s,s.answers[p][q])&&!rejected(s,p,q))ok.push(p);
   for(const p of ok)s.rows[p][q]=ok.some(o=>o!==p&&norm(s.answers[o][q])===norm(s.answers[p][q]))?5:10;
  }
  // whoever said STOP risks double: every incorrect answer of theirs (wrong letter, or rejected by the vote) takes 20 points away
  if(s.stopBy>=0){const p=s.stopBy;for(let q=0;q<10;q++)if(!(startsOk(s,s.answers[p][q])&&!rejected(s,p,q)))s.rows[p][q]=-20}
  s.points=s.rows.map(r=>r.reduce((a,b)=>a+b,0));
  s.totals=s.totals.map((t,p)=>t+s.points[p]);
  s.phase='result';s.left=0;s.seq++;
 }
 function ready(s,p){if(s.phase!=='vote'||s.voted[p])return false;s.voted[p]=true;if(s.voted.every(Boolean))score(s);s.seq++;return true}
 // once a second, on the host
 function tick(s,away){
  if(s.phase==='answer'){
   s.left--;
   // a computer player starts writing at its time, keeps the fullest try, and says STOP only when it has an answer for every category
   s.kinds.forEach((k,p)=>{if(k==='ai'&&!s.done[p]&&s.phase==='answer'&&s.left<=s.aiAt[p]){const a=aiAnswers(s),have=s.drafts[p].filter(Boolean).length;if(a.filter(Boolean).length>have)s.drafts[p]=a;if(s.drafts[p].every(Boolean))submit(s,p,s.drafts[p])}});
   if(s.left<=0&&s.phase==='answer')toVote(s);
  }else if(s.phase==='vote'){
   s.left--;
   away.forEach(p=>{if(!s.voted[p])s.voted[p]=true});
   if(s.left<=0||s.voted.every(Boolean))score(s);
  }
 }
 function viewFor(s,seat){
  const open=s.phase!=='answer';
  return {n:s.n,names:s.names,kinds:s.kinds,letter:s.letter,cats:s.cats,phase:s.phase,left:s.left,stopBy:s.stopBy,round:s.round,
   done:s.done,voted:s.voted,you:seat,seq:s.seq,
   answers:open?s.answers:null,                                     // nobody sees the others' answers before the vote
   myMarks:s.marks[seat]||[],markCount:open?s.answers.map((_,p)=>Array.from({length:10},(_,q)=>s.marks.filter(m=>m.includes(p+':'+q)).length)):null,
   rows:s.rows,points:s.points,totals:s.totals};
 }

 /* ================= 2. screens ================= */
 const P=()=>window.SudomiProfile;
 const aiNames=n=>window.SudomiAI?SudomiAI.random(n).map(x=>x[0]):[];   // nombres de la computadora: la lista del dueño (other-games.js)
 const myName=()=>{let n=P()?P().name():'';if(!n)try{n=localStorage.getItem('sudomi-player-name')||''}catch(_){}return n.trim().slice(0,14)||'Jugador'};
 const myAvatar=()=>(P()&&P().avatar())||'🦊';
 const needProfile=fn=>{if(P()&&!P().get()){P().ensure(fn);return true}return false};
 let ui=null,screen='menu',mode=null,S=null,V=null,net=null,seats=[],size=4,clock=null,status='',roomCode='',offline=false,busy=false,showRules=false;
 let draft=Array(10).fill(''),draftKey='',focus=-1,lastKey='',sendTimer=null;
 let classic=false;   // 0.2.101: la sala a la que entré es de STOP clásico -> la pantalla la lleva js/stop-clasico.js
 const $=sel=>ui.stage.querySelector(sel);
 window.addEventListener('sudomi-profile',()=>{if(ui&&screen==='menu')render()});

 function reset(){try{window.SudomiFriends&&SudomiFriends.awayBar&&SudomiFriends.awayBar(null)}catch(_){}clearInterval(clock);clock=null;clearTimeout(sendTimer);if(net){try{net.close()}catch(_){}}net=null;classic=false;S=null;V=null;seats=[];status='';roomCode='';offline=false;mode=null;busy=false;lastKey=''}
 function open(opts){ui=opts;reset();screen='menu';ui.hub.classList.add('hidden');ui.stage.classList.remove('hidden');render()}
 function close(){if(!ui)return;reset();screen='menu'}
 function leave(){try{window.SudomiFriends&&SudomiFriends.untrack()}catch(_){}const u=ui;close();if(u){u.stage.innerHTML='';u.exit()}}

 /* ----- host / solo ----- */
 const publicSeats=()=>seats.map(x=>({name:x.name,kind:x.kind,away:!!x.away,avatar:x.avatar||''}));
 const awaySeats=()=>seats.map((x,i)=>x.kind==='human'&&x.away?i:-1).filter(i=>i>=0);
 function pushLobby(){seats.forEach(x=>{if(x.id&&x.id!=='host')net.send(x.id,{t:'lobby',seats:publicSeats(),size,code:roomCode})})}
 // 0.2.76: si alguien se desconecta, el anfitrión ve una barra con «Invitar de nuevo» (js/friends.js)
 function syncAway(){try{if(window.SudomiFriends&&SudomiFriends.awayBar)SudomiFriends.awayBar(net&&mode==='host'&&S?{game:'stop',gameName:'STOP',room:roomCode,names:seats.filter(x=>x.kind==='human'&&x.away).map(x=>x.name)}:null)}catch(_){}}
 function pushState(){
  if(net&&mode==='host')seats.forEach((x,i)=>{if(x.id&&x.id!=='host'&&!x.away)net.send(x.id,{t:'state',v:viewFor(S,i),seats:publicSeats()})});
  V=viewFor(S,0);screen='game';syncAway();render();
 }
 function startClock(){clearInterval(clock);clock=setInterval(()=>{if(!S||S.phase==='result')return;tick(S,awaySeats());pushState()},1000)}
 function startGame(){
  let k=0;const pool=aiNames(12).filter(nm=>!seats.some(s=>s.name===nm));seats=seats.map(x=>x.kind==='open'?{name:pool[k++]||`IA ${k}`,kind:'ai'}:x);
  S=newRound(null,seats.map(x=>x.name),seats.map(x=>x.kind));startClock();pushState();
 }
 function nextRound(){S=newRound(S,seats.map(x=>x.name),seats.map(x=>x.kind));pushState()}
 function startSolo(){reset();mode='solo';seats=[{name:myName(),kind:'human',id:'host',avatar:myAvatar()},{name:aiNames(1)[0]||'Máquina',kind:'ai'}];startGame()}
 async function createRoom(n){
  if(busy||needProfile(()=>createRoom(n)))return;
  if(!window.SudomiParty){status='No se cargó el módulo de conexión.';render();return}
  reset();busy=true;mode='host';size=n;status='Creando sala…';render();
  try{
   net=await SudomiParty.host('stop',onHostEvent);
   roomCode=net.code;seats=[{name:myName(),kind:'human',id:'host',avatar:myAvatar()}];
   for(let i=1;i<n;i++)seats.push({name:'',kind:'open'});
   status='';screen='lobby';
  }catch(err){mode=null;status=err.message||'No se pudo crear la sala.'}
  busy=false;render();
 }
 function onHostEvent(e){
  if(mode!=='host')return;
  if(e.type==='join'){
   let i=seats.findIndex(x=>x.id===e.id);
   if(i>=0)seats[i].away=false;
   else if(S){   // 0.2.76: un teléfono nuevo (o sin su llave) puede ocupar el lugar de quien se desconectó
    i=seats.findIndex(x=>x.kind==='human'&&x.away&&x.id!=='host');
    if(i<0){net.reject(e.id,'La partida ya empezó.');return}
    seats[i].id=e.id;seats[i].away=false;
   }
   else{
    i=seats.findIndex(x=>x.kind==='open');
    if(i<0){net.reject(e.id,'La sala ya está llena.');return}
    seats[i]={name:String((e.meta&&e.meta.name)||'').trim().slice(0,14)||'Jugador',kind:'human',id:e.id,avatar:P()&&e.meta&&P().validAvatar(e.meta.avatar)?e.meta.avatar:''};
   }
   if(S)pushState();else{pushLobby();render()}
   return;
  }
  const i=seats.findIndex(x=>x.id===e.id);if(i<0)return;
  if(e.type==='leave'||(e.type==='msg'&&e.data.t==='bye')){
   if(!S){seats[i]={name:'',kind:'open'};pushLobby();render()}
   else if(e.type==='msg'){seats[i]={name:seats[i].name+' (IA)',kind:'ai'};S.names[i]=seats[i].name;S.kinds[i]='ai';S.aiAt[i]=S.left-5;if(S.phase==='vote')S.voted[i]=true;pushState()}
   else{seats[i].away=true;pushState()}
   return;
  }
  if(e.type!=='msg'||!S)return;
  const d=e.data;
  if(d.t==='draft'&&S.phase==='answer'&&!S.done[i]){S.drafts[i]=clean10(d.a);return}   // no redraw needed
  if((d.t==='stop'&&submit(S,i,d.a))||(d.t==='mark'&&mark(S,i,d.p,d.q))||(d.t==='ready'&&ready(S,i)))pushState();
 }
 /* ----- guest ----- */
 function joinRoom(raw){
  if(needProfile(()=>joinRoom(raw)))return;
  if(!window.SudomiParty){status='No se cargó el módulo de conexión.';render();return}
  const code=SudomiParty.normCode(raw);
  if(code.length!==8){status='Escribe el código de 8 caracteres.';render();return}
  reset();mode='guest';roomCode=code;status='Conectando…';screen='joining';render();
  net=SudomiParty.join('stop',code,{name:myName(),avatar:myAvatar()},e=>{
   if(mode!=='guest')return;
   const C=window.SudomiStopClasico;
   if(C&&!classic&&e.type==='msg'&&e.data&&e.data.classic){classic=true;C.adopt(ui,m=>!!(net&&net.send(m)),code)}
   if(classic&&e.type!=='closed'){if(e.type!=='open')C.guest(e);return}
   if(classic&&C)C.close();
   if(e.type==='open'){status='Conectado. Esperando al anfitrión…';try{window.SudomiFriends&&SudomiFriends.track({game:'stop',gameName:'STOP',room:code,role:'guest'})}catch(_){}}
   else if(e.type==='away')offline=true;
   else if(e.type==='back')offline=false;
   else if(e.type==='closed'){const m=e.message;reset();screen='menu';status=m}
   else if(e.type==='msg'){const d=e.data;if(d.t==='lobby'){seats=d.seats;size=d.size;screen='lobby';status=''}else if(d.t==='state'){V=d.v;seats=d.seats;screen='game'}}
   render();
  });
 }
 /* ----- actions from this phone ----- */
 function send(msg){
  if(mode==='guest'){if(!net.send(msg)){offline=true;render()}return}
  if(!S)return;
  const ok=msg.t==='stop'?submit(S,0,msg.a):msg.t==='mark'?mark(S,0,msg.p,msg.q):msg.t==='ready'?ready(S,0):false;
  if(ok)pushState();
 }
 function saveDraft(){
  if(mode==='guest'){clearTimeout(sendTimer);sendTimer=setTimeout(()=>net&&net.send({t:'draft',a:draft}),400)}
  else if(S&&S.phase==='answer'&&!S.done[0])S.drafts[0]=clean10(draft);
 }
 function invite(){
  const base=location.origin&&location.origin!=='null'?location.origin+location.pathname:location.href.split(/[?#]/)[0];
  const url=`${base}?game=stop&room=${roomCode}`;
  if(navigator.share)navigator.share({title:'SUDOMI',text:(window.SudomiI18n?SudomiI18n.t('Juega STOP conmigo en SUDOMI'):'Juega STOP conmigo en SUDOMI'),url}).catch(()=>{});
  else if(navigator.clipboard)navigator.clipboard.writeText(url).then(()=>{status='Enlace copiado. Pégalo en tu chat.';render()}).catch(()=>{status=url;render()});
  else{status=url;render()}
 }

 /* ----- drawing ----- */
 const avatar=i=>seats[i]&&seats[i].kind==='ai'?'🤖':seats[i]&&seats[i].avatar?seats[i].avatar:['🦊','🐼','🦉','🐯','🐸','🐵','🦄','🐙'][i%8];
 const head=sub=>`<div class="dos-head"><div><p>ARCADE SUDOMI · ${sub}</p><h2>STOP</h2></div><div class="dos-actions"><button class="game-restart" id="spRules" aria-label="Reglas">?</button><button class="game-restart" id="spExit">Juegos</button></div></div>`;
 const RULES=[['Cómo se juega','Sale una letra y 10 categorías. Escribe una palabra que empiece con esa letra para cada categoría. Tienes 160 segundos. Cuando llenes las 10 casillas puedes tocar ¡STOP!, que termina la ronda para todos. Solo puedes decir STOP con todo completo, y si lo dices, cada respuesta incorrecta tuya te quita 20 puntos (el doble de lo que vale una buena).'],['Votación','Después todos ven las respuestas. Toca las que no aceptas (❌). Si la mayoría de los otros jugadores la rechaza, vale 0.'],['Puntos','10 puntos por respuesta válida que nadie más escribió, 5 si otro escribió la misma, 0 si está vacía, no empieza con la letra o fue rechazada (y -20 si fue tuya y dijiste STOP). Los puntos se suman ronda tras ronda.'],['Jugadores','Contra la máquina, en una sala online de 2 a 8 (la IA ocupa los puestos vacíos), o dos jugadores en el mismo teléfono.']];
 const rulesHTML=()=>showRules?`<div class="dos-over"><div class="dos-card"><h3>Reglas de STOP</h3><dl>${RULES.map(([t,d])=>`<dt>${t}</dt><dd>${d}</dd>`).join('')}</dl><button class="arc-btn" id="spRulesClose">Cerrar</button></div></div>`:'';
 function bindCommon(){$('#spExit').onclick=leave;$('#spRules').onclick=()=>{showRules=true;lastKey='';render()};const c=$('#spRulesClose');if(c)c.onclick=()=>{showRules=false;lastKey='';render()}}
 function render(){
  if(!ui)return;
  if(screen==='game'&&V)return renderGame();
  lastKey='';
  if(screen==='lobby')return renderLobby();
  if(screen==='joining'){ui.stage.innerHTML=`<div class="mini-game dos sp">${head('ONLINE')}<p class="arc-wait big">${esc(status)}</p>${rulesHTML()}</div>`;bindCommon();return}
  renderMenu();
 }
 function renderMenu(){
  const has=P()&&P().get();
  ui.stage.innerHTML=`<div class="mini-game dos sp">${head('1 A 8 JUGADORES')}
   <div class="dos-profile"><span>${has?myAvatar():'👤'}</span><div><b>${has?esc(myName()):'Sin perfil'}</b><small>${has?'Así te verán los demás':'Crea tu perfil para jugar online'}</small></div><button class="arc-btn alt" id="spProfile">${has?'Editar':'Crear perfil'}</button></div>
   <div class="dos-menu">
    <button class="dos-opt" id="spSolo"><b>🤖 Contra la máquina</b><span>Tú contra la computadora</span></button>
    <div class="dos-opt static"><b>🌐 Crear sala online</b><span>Escribe cuántos juegan (de 2 a 8). Los puestos que nadie ocupe los juega la IA.</span>
     <div class="dos-join"><input id="spSize" type="number" inputmode="numeric" min="2" max="8" step="1" value="${Math.min(8,Math.max(2,size||4))}" aria-label="Número de jugadores"><button class="arc-btn" id="spCreate" ${busy?'disabled':''}>Crear sala</button></div></div>
    <div class="dos-opt static"><b>🔑 Unirme a una sala</b><span>Escribe el código que te envió tu amigo</span>
     <div class="dos-join"><input id="spCode" maxlength="9" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="ABCD-2345"><button class="arc-btn" id="spJoin">Unirme</button></div></div>
    ${ui.legacy?'<button class="dos-opt" id="spLocal"><b>📱 Dos jugadores en este teléfono</b><span>El STOP de siempre, pasando el teléfono</span></button>':''}
   </div>
   ${status?`<p class="arc-wait">${esc(status)}</p>`:''}${rulesHTML()}</div>`;
  bindCommon();
  $('#spProfile').onclick=()=>P()&&P().edit();
  $('#spSolo').onclick=startSolo;
  $('#spCreate').onclick=()=>{const n=Math.round(+$('#spSize').value);if(!(n>=2&&n<=8)){status='Escribe un número de jugadores entre 2 y 8.';render();return}createRoom(n)};
  $('#spJoin').onclick=()=>joinRoom($('#spCode').value);
  const loc=$('#spLocal');if(loc)loc.onclick=()=>{const u=ui;close();u.legacy()};
 }
 function inviteUrl(){const base=location.origin&&location.origin!=='null'?location.origin+location.pathname:location.href.split(/[?#]/)[0];return `${base}?game=stop&room=${roomCode}`}
 function removeSeat(i){if(mode!=='host'||!seats[i]||seats[i].kind!=='open'||seats.length<=2)return;seats.splice(i,1);size=seats.length;pushLobby();render()}
 // 0.2.72: sala de espera única (js/lobby.js): código arriba, lista de espacios, «Invitar amigos» y «Empezar»
 function renderLobby(){
  const host=mode==='host';
  ui.stage.innerHTML=`<div class="mini-game dos sp">${head('SALA DE ESPERA')}<div id="lbRoot"></div>${rulesHTML()}</div>`;
  bindCommon();
  SudomiLobby.render($('#lbRoot'),{game:'stop',gameName:'STOP',code:roomCode,url:inviteUrl(),host,fixed:false,
   seats:seats.map((x,i)=>({state:x.kind==='human'?(i===0&&host?'me':x.away?'away':'human'):x.kind==='ai'?'ai':'open',name:x.name,avatar:x.avatar||'🙂',sub:i===0?'Anfitrión':undefined})),
   startLabel:'▶ Empezar partida',canStart:seats.length>=2,onStart:startGame,onRemove:removeSeat,
   status:(status||'')+(offline?' · Sin conexión. Reconectando…':'')});
 }
 const chips=v=>`<div class="sp-chips">${v.names.map((n,i)=>`<span class="${(v.phase==='answer'?v.done[i]:v.voted[i])?'ok':''} ${i===v.you?'me':''}"><i>${avatar(i)}</i>${esc(n)}${(v.phase==='answer'?v.done[i]:v.voted[i])?' ✔':''}</span>`).join('')}</div>`;
 function renderGame(){
  const v=V,me=v.you;
  // the whole screen is only redrawn when something other than the clock changed (so typing is never interrupted)
  const key=JSON.stringify([v.phase,v.round,v.done,v.voted,v.stopBy,v.myMarks,v.markCount,v.totals,showRules,offline,seats.map(s=>s.kind+s.away)]);
  if(key===lastKey&&$('#spTimer')){
   $('#spTimer').textContent=v.left;
   const bar=$('#spBar');if(bar)bar.style.width=Math.max(0,Math.min(100,v.left/(v.phase==='vote'?VOTE_TIME:ANSWER_TIME)*100))+'%';
   return;
  }
  lastKey=key;
  const dk=v.round+':'+me;if(draftKey!==dk){draftKey=dk;draft=Array(10).fill('');focus=-1}
  const sub=mode==='solo'?'CONTRA LA MÁQUINA':`ONLINE · ${v.n} JUGADORES`;
  const timer=total=>`<div class="stop-timer"><span><b id="spTimer">${v.left}</b> s</span><div class="bar"><i id="spBar" style="width:${Math.max(0,Math.min(100,v.left/total*100))}%"></i></div></div>`;
  let body='';
  if(v.phase==='answer'){
   const alarm='',full=draft.every(x=>String(x).trim());
   body=v.done[me]
    ?`<div class="stop-top"><div class="stop-letter">${v.letter}</div>${timer(ANSWER_TIME)}</div><div class="arc-wait big">✔ Enviaste tus respuestas.<br>Esperando a los demás…</div>${chips(v)}`
    :`${alarm}<div class="stop-top"><div class="stop-letter">${v.letter}</div>${timer(ANSWER_TIME)}</div>${chips(v)}
      <ol class="stop-list">${v.cats.map((c,i)=>`<li><label for="sp${i}">${esc(c)}</label><input id="sp${i}" data-sp="${i}" maxlength="40" autocomplete="off" autocapitalize="words" placeholder="${v.letter}…" value="${esc(draft[i]||'')}"></li>`).join('')}</ol>
      <div class="arc-actions"><button class="arc-btn big stopbtn" id="spStop" ${full?'':'disabled'}>¡STOP!</button></div><p class="arc-sub center" id="spStopHint">Solo puedes decir STOP con las 10 casillas llenas, y termina la ronda para todos. Si lo dices, cada respuesta incorrecta tuya te quita <b>20 puntos</b> (el doble).</p>`;
  }else if(v.phase==='vote'){
   const L=v.letter.toLowerCase();
   body=`<div class="stop-top small"><div class="stop-letter">${v.letter}</div>${timer(VOTE_TIME)}</div>
    <p class="arc-msg">${v.voted[me]?'✔ Listo. Esperando a los demás…':'Toca las respuestas que <b>no aceptas</b> (❌). Cuando termines, toca <b>Listo</b>.'}</p>${chips(v)}
    <div class="sp-vote">${v.cats.map((c,q)=>`<section><h4>${esc(c)}</h4>${v.names.map((n,p)=>{const a=v.answers[p][q],bad=a&&norm(a)[0]!==L,mine=v.myMarks.includes(p+':'+q),cnt=v.markCount[p][q];
      return `<button class="sp-ans ${!a?'empty':''} ${bad?'bad':''} ${mine?'no':''}" data-p="${p}" data-q="${q}" ${p===me||!a||bad||v.voted[me]?'disabled':''}><i>${avatar(p)}</i><b>${a?esc(a):'—'}</b>${bad?'<em>no empieza con '+v.letter+'</em>':cnt?`<em>❌ ${cnt}</em>`:''}</button>`}).join('')}</section>`).join('')}</div>
    ${v.voted[me]?'':'<div class="arc-actions"><button class="arc-btn big" id="spReady">Listo</button></div>'}`;
  }else{
   const order=v.names.map((_,i)=>i).sort((a,b)=>v.totals[b]-v.totals[a]||v.points[b]-v.points[a]);
   body=`<div class="stop-top small"><div class="stop-letter">${v.letter}</div><p class="arc-sub">Ronda ${v.round} terminada${v.stopBy>=0?' · 🛑 STOP de '+esc(v.names[v.stopBy])+' (sus respuestas incorrectas restan 20)':''}</p></div>
    <ol class="sp-rank">${order.map((p,k)=>`<li class="${p===me?'me':''}"><span>${k===0?'🏆':k+1}</span><i>${avatar(p)}</i><b>${esc(v.names[p])}</b><em class="${v.points[p]<0?'neg':''}">${v.points[p]>0?'+':''}${v.points[p]}</em><strong>${v.totals[p]}</strong></li>`).join('')}</ol>
    <details class="sp-detail"><summary>Ver respuestas y puntos</summary>${v.cats.map((c,q)=>`<section><h4>${esc(c)}</h4>${v.names.map((n,p)=>`<p><i>${avatar(p)}</i><span>${v.answers[p][q]?esc(v.answers[p][q]):'—'}</span><b class="${v.rows[p][q]>0?'pts':v.rows[p][q]<0?'neg':'zero'}">${v.rows[p][q]>0?'+'+v.rows[p][q]:v.rows[p][q]<0?String(v.rows[p][q]):'0'}</b></p>`).join('')}</section>`).join('')}</details>
    <div class="arc-actions">${mode==='guest'?'<p class="arc-sub center">El anfitrión empieza la siguiente ronda.</p>':'<button class="arc-btn big" id="spNext">Otra ronda</button>'}<button class="arc-btn alt" id="spLeave">Todos los juegos</button></div>`;
  }
  ui.stage.innerHTML=`<div class="mini-game dos sp">${head(sub)}${offline?'<p class="arc-alert">Sin conexión. Reconectando…</p>':''}<p class="sp-round">Ronda ${v.round}</p>${body}${rulesHTML()}</div>`;
  bindCommon();
  ui.stage.querySelectorAll('[data-sp]').forEach(inp=>{
   const i=+inp.dataset.sp;
   inp.oninput=()=>{draft[i]=inp.value;saveDraft();const sb=$('#spStop');if(sb)sb.disabled=!draft.every(x=>String(x).trim())};
   inp.onfocus=()=>{focus=i};
   inp.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();const nx=$(`[data-sp="${i+1}"]`);if(nx)nx.focus();else inp.blur()}};
  });
  if(focus>=0&&v.phase==='answer'){const el=$(`[data-sp="${focus}"]`);if(el){el.focus();const n=el.value.length;try{el.setSelectionRange(n,n)}catch(_){}}}
  const stop=$('#spStop');if(stop)stop.onclick=()=>{if(!draft.every(x=>String(x).trim()))return;focus=-1;send({t:'stop',a:draft.slice()})};
  ui.stage.querySelectorAll('.sp-ans:not(:disabled)').forEach(b=>b.onclick=()=>send({t:'mark',p:+b.dataset.p,q:+b.dataset.q}));
  const rd=$('#spReady');if(rd)rd.onclick=()=>send({t:'ready'});
  const nx=$('#spNext');if(nx)nx.onclick=nextRound;
  const lv=$('#spLeave');if(lv)lv.onclick=leave;
 }

 window.SudomiStop={open,close,join:code=>joinRoom(code),solo:()=>startSolo(),create:n=>createRoom(n),_engine:{newRound,submit,mark,ready,tick,viewFor,score,aiAnswers,WORDS}};
})();
