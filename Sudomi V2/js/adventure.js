/* SUDOMI 0.3.94 — «Aventura»: el modo historia como un juego de rol visto desde arriba, a pantalla completa.
 * HISTORIA (del dueño): Alcuino escribió un libro que abre el conocimiento; de ahí su poder. Mordrac, el Sellador, fue sellando sus páginas
 *   sin que se notara, venció a Alcuino y se lo llevó para escribir su propio libro. En la pelea las páginas se regaron. Quien tiene una
 *   lleva un aura negra y te reta; un sello solo se rompe resolviendo su acertijo. El jefe final es Mordrac y al vencerlo se libera a Alcuino.
 *   (js/story.js, el «Viaje rápido», conserva su texto anterior.)
 *   MUNDO   9 lugares en fila: ciudad, zona de monstruos, ciudad… (LUGAR par = ciudad, impar = zona). Se arman solos con una semilla fija.
 *   CIUDAD  2 personas con «!» en la calle, 2 páginas escondidas dentro de casas (sin señal), la armería, la posada, la descifradora y el jefe.
 *           Se entra a las casas por la puerta. El jefe pide 3 páginas de su ciudad y abre la puerta del este.
 *   ZONA    monstruos que pasean. Al tocarlos empieza un combate por turnos con los poderes que da el nivel (PODERES).
 *           Sueltan oro y cosas: hierbas, pociones, gemas, rara vez un objeto raro y a veces una PÁGINA SELLADA.
 *   SELLOS  la descifradora de cada ciudad rompe el sello de una página; dentro hay un reto contra una sombra.
 *   RETOS   acertijo (js/puzzles.js) o partida del arcade contra la máquina, al nivel de la ciudad. Se juegan dentro de la aventura,
 *           con tu personaje a un lado y quien te reta al otro. La partida usa la pantalla del arcade sin su marco (body.av-battle).
 *   VIDA    en un acertijo cada fallo quita vida; en una partida perdida, más cuanto peor el marcador (severity()); la armadura quita daño.
 *   MENÚ    personaje y poderes · inventario · mapa (dónde faltan páginas) · opciones.
 * No hay archivos de imagen: todo se pinta pixel a pixel en <canvas> (tile(), sprite(), beast()).
 * No toca los juegos: se entera del resultado por 'sudomi-arcade' {game, won}. Guardado: localStorage['sudomi-aventura']. */
(()=>{
 const S=window.SudomiScreen,P=window.SudomiPuzzles;if(!S||!P)return;
 const KEY='sudomi-aventura',T=16,VW=13;let VH=11;   // el mapa enseña 13 casillas de ancho y de 9 a 17 de alto, según quepa en la pantalla
 const snd=n=>{try{window.SudomiSound&&SudomiSound.play(n)}catch(_){}};
 const rng=s=>()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296};
 const G=0,R=1,ST=2,W=3,TR=4,RF=5,WL=6,DR=7,FL=8,BR=9,FE=10,SL=11,FO=12,DK=13,BT=14,CW=15,GA=16,FLR=17,IW=18,TB=19,BD=20,SH=21,RG=22,MT=23,RK=24,BU=25;
 const SOLID=new Set([W,TR,RF,WL,DR,FE,SL,FO,BT,CW,IW,TB,BD,SH,RK,BU]);
 const TH={
  aldea:{g:'#6dab4d',g2:'#5a9440',r:'#dcbb80',r2:'#c8a468',roofs:['#b4513a','#8c5c2e','#a2476a'],wall:'#ecdcb4',trees:.16,flowers:.1},
  puerto:{g:'#86b565',g2:'#73a155',r:'#d8c59a',r2:'#c2ad80',roofs:['#3f6fa3','#b4513a','#2f8a84'],wall:'#f1ead6',trees:.07,flowers:.05},
  rio:{g:'#5fa055',g2:'#4d8a46',r:'#cdb07a',r2:'#b99b63',roofs:['#7a4a8c','#8c5c2e','#b4513a'],wall:'#e6dcc2',trees:.13,flowers:.12},
  mercado:{g:'#9bb866',g2:'#88a557',r:'#e0c98f',r2:'#cbb277',roofs:['#c2792c','#b4513a','#3f6fa3'],wall:'#f0e2bd',trees:.05,flowers:.06},
  castillo:{g:'#a9a595',g2:'#958f7e',r:'#c9c2ad',r2:'#b3ab94',roofs:['#55607a','#6b4a5f','#4a6b5d'],wall:'#d8d2c0',trees:.03,flowers:.02},
  casa:{g:'#b98a54',g2:'#a37545',r:'#b98a54',r2:'#a37545',roofs:['#b4513a'],wall:'#e6dcc2'}
 };
 const SPECIAL=['','#3d4a63','#2f7a4a','#8f2f2a'];   // techos: armería, posada, casa del jefe
 // m = misiones: [nombre, tipo ('e' acertijo, 'g' juego), qué, lo que dice]. Las 2 primeras están en la calle, las 2 siguientes dentro de casas,
 // y las demás salen al romper sellos. La aventura es de uno contra uno y con partidas cortas: solo Memoria, 4 en línea, Puntos y cajas y Blackjack.
 const VILLANO='Mordrac, el Sellador';
 const CITIES=[
  {name:'York',th:'aldea',w:26,seed:11,ai:'easy',intro:'La aldea donde enseñaba el maestro. Aquí cayeron las primeras páginas, y el aura negra ya ronda entre las casas.',
   m:[['Hilda, la panadera','e','a1','«Esta página es mía… ¿o no? Si me dices cuánto tarda el caracol, te la doy.»'],['Wulf, el herrero','g','connect4','«Nadie toca mi página. Cuatro en fila y hablamos.»'],['Osric, el pastor','e','a45','«¿Quién anda ahí? No te acerques a la página. Primero dime cuántas palomas eran.»'],['Edith, la tejedora','g','memory','«Pasa, pasa… pero la página no sale de aquí. Gáname a la memoria.»'],['','e','a14','']],
   boss:['El maestro Elberto','e','a42','«El aura me pesa, aprendiz. Yo le enseñé a Alcuino. Sube mi escalera de palomas y quizá me la quites de encima.»']},
  {name:'Quentovic',th:'puerto',w:28,seed:23,ai:'easy',intro:'El puerto por donde Mordrac se llevó a Alcuino. Los marineros miran al suelo y nadie quiere hablar.',
   m:[['Ansgar, el barquero','e','a18','«Yo crucé al encapuchado y a su preso. No digo más… salvo que resuelvas esto.»'],['Otón, el marinero','g','dotsboxes','«En mi barco se cierran cajas con rayas. Gana y la página es tuya.»'],['Gerda, la cazadora','e','a26','«Cierra la puerta. Mi perro siempre alcanza a la liebre. ¿En cuántos saltos?»'],['Ida, la estibadora','g','memory','«En casa jugamos a las parejas. Siéntate, si te atreves.»'],['','e','a5','']],
   boss:['La capitana Rotrud','g','connect4','«Mordrac me pagó por no ver nada. Cuatro en fila en mi propia cubierta y te digo por dónde se fue.»']},
  {name:'Tours',th:'rio',w:30,seed:37,ai:'normal',intro:'La abadía donde se escribió el libro. Los monjes guardan páginas que ya no pueden leer.',
   m:[['Marta, la lavandera','e','a19','«Mi familia quiere cruzar y la barca es chica. Ayúdanos y suelto la página.»'],['Raganardo, el copista','g','dotsboxes','«Entre página y página, rayas y cajas. Empiezas tú.»'],['El hermano Sigulfo','e','a12','«Treinta botellas y tres herederos. Reparte sin derramar.»'],['Berta, la bodeguera','e','o15','«Baja la voz. Parte este vino en dos mitades con las jarras que hay.»'],['','e','a47',''],['','g','memory','']],
   boss:['El abad Fridugiso','e','a17','«Mordrac selló hasta mis rezos. Tres hermanos, tres hermanas y una barca: si lo resuelves, cruzas mi río.»']},
  {name:'Saint-Denis',th:'mercado',w:30,seed:41,ai:'hard',intro:'La gran feria. Aquí las páginas selladas se venden como rarezas, y Mordrac las compra todas.',
   m:[['Guido, el tratante','e','a38','«Cien animales por cien monedas. Tú haces la lista y yo suelto la página.»'],['Odila, la tabernera','g','blackjack','«Veintiuno en mi taberna. Quien pierde, paga.»'],['Los hermanos Lupo','e','a6','«Vendimos al mismo precio y ganamos. ¿Cuánto?»'],['Fara, la cambista','g','memory','«Cuento monedas todo el día. A ver si recuerdas dónde está cada una.»'],['','e','a39',''],['','g','connect4','']],
   boss:['El gran cambista','g','connect4','«Compro páginas selladas por orden de Mordrac. Gáname una fila de cuatro y son tuyas.»']},
  {name:'Aquisgrán',th:'castillo',w:32,seed:59,ai:'hard',intro:'La corte, tomada por Mordrac. En algún salón tiene preso al maestro.',
   m:[['Angilberto, el poeta','e','a52','«Un camello, noventa medidas y treinta leguas. No me mires así: no soy yo quien pregunta.»'],['Paulino, el gramático','g','connect4','«Cuatro en fila, sin prisa y sin piedad.»'],['Teodulfo, el obispo','e','o19','«Nueve números, quince por cada lado.»'],['La reina Liutgarda','e','o21','«Ocho reinas en un tablero y que ninguna se mire.»'],['','e','a35',''],['','g','dotsboxes','']],
   boss:[VILLANO,'e',['a41','a34','o12'],'«Así que tú eres el aprendiz. Tu maestro ya casi me lo ha contado todo. Me quedan tres sellos: rómpelos, si puedes.»']}
 ];
 // monstruos: nombre, dibujo, colores [cuerpo, borde], vida, daño, experiencia, lo que sabe hacer (ver POSTURA)
 const MOBS={slime:['Babosa del pantano','slime',['#6fcf5a','#2f6b2f'],22,5,12,['ataque','guardia']],wolf:['Lobo gris','wolf',['#9aa3ad','#3d4a55'],30,7,16,['ataque','carga','ataque']],boar:['Jabalí','wolf',['#8a5a2b','#3a2a1a'],46,10,24,['carga','ataque','guardia']],bandit:['Salteador','bandit',['#3a3f52','#15151c'],54,12,28,['guardia','ataque','esquiva']],
  bat:['Murciélago','bat',['#6b4a8c','#2a1a3a'],60,15,38,['esquiva','ataque','esquiva']],ghost:['Espectro','ghost',['#d9e6f2','#6f8aa3'],78,17,44,['reflejo','ataque','reflejo']],golem:['Gólem de piedra','golem',['#9a958a','#4a463e'],120,22,60,['guardia','carga','ataque']],dire:['Lobo negro','wolf',['#3a3a44','#0f0f14'],96,24,56,['carga','esquiva','ataque']]};
 // lo que el enemigo va a hacer este turno. Se enseña antes de que elijas, y usar el poder equivocado se paga:
 //   guardia: los golpes físicos casi no hacen nada y te los devuelve · reflejo: la magia rebota contra ti · esquiva: lo físico suele fallar
 //   carga: toma impulso y al turno siguiente embiste (el doble de daño, salvo escudo o aturdirlo con el rayo)
 const POSTURA={ataque:['⚔️','va a atacar','Cualquier poder sirve.'],carga:['💢','toma impulso','El próximo turno embiste con el doble de fuerza. Aprovecha para pegar, y prepárate.'],embiste:['💥','va a embestir','Pega el doble. El escudo lo deja en casi nada; el rayo lo aturde y lo frena.'],
  guardia:['🛡️','está en guardia','Los golpes físicos casi no le hacen nada y te los devuelve. Usa magia.'],reflejo:['🪞','brilla como un espejo','La magia rebota contra ti. Usa golpes físicos.'],esquiva:['💨','se mueve muy rápido','Los golpes físicos suelen fallar. La magia no falla.']};
 const ZONES=[
  {name:'Bosque de Galtres',seed:101,g:'#4f8f47',g2:'#3f7a3a',r:'#b99a63',r2:'#a58650',trees:.26,rocks:.02,bush:.07,flowers:.05,ponds:1,mobs:['slime','wolf'],intro:'El bosque entre York y el mar. Los caminantes no pasan de noche.'},
  {name:'Camino de Neustria',seed:131,g:'#a8b56a',g2:'#93a058',r:'#d8c08a',r2:'#c2a972',trees:.1,rocks:.05,bush:.08,flowers:.08,ponds:0,mobs:['boar','bandit'],intro:'Campo abierto y salteadores. El camino largo hacia el Loira.'},
  {name:'Marjal del Loira',seed:167,g:'#5d9b6a',g2:'#4a8558',r:'#bfae7a',r2:'#a99763',trees:.14,rocks:.03,bush:.1,flowers:.04,ponds:4,mobs:['bat','ghost'],intro:'Niebla, charcas y cosas que no hacen ruido.'},
  {name:'Las Ardenas',seed:193,g:'#5f7a5a',g2:'#4d6649',r:'#a89a80',r2:'#93856b',trees:.3,rocks:.08,bush:.05,flowers:.02,ponds:1,mobs:['golem','dire'],intro:'El bosque más viejo del reino. Detrás está la corte del emperador.'}
 ];
 const LAST=CITIES.length*2-2,isCity=p=>p%2===0,ci=p=>p>>1;
 const GAMES={memory:'Memoria de animales',connect4:'4 en línea',dotsboxes:'Puntos y cajas',blackjack:'Blackjack'};
 const AI_NAME={easy:'fácil',normal:'normal',hard:'difícil'};
 const SLOTS=[['casco','Casco'],['pecho','Coraza'],['escudo','Escudo'],['botas','Botas']];
 const TIERS=[null,['de cuero','#8a5a2b'],['de bronce','#b9803c'],['de hierro','#8e98a3'],['de acero','#cfd8e2'],['dorada','#e2b93b']];
 // poderes: clave, nombre, PÁGINAS que hacen falta para abrirlo, energía que cuesta, fuerza (× ataque), qué hace
 //          y de qué tipo es: f físico · m mágico · d apoyo. El tipo importa: cada postura del enemigo castiga uno (POSTURA).
 const PODERES=[['golpe','Golpe',0,0,1,'Un golpe sencillo. No gasta energía.','f'],['foco','Concentración',1,0,0,'No atacas: recuperas 4 de energía. El enemigo sí hace lo suyo.','d'],['espada','Espada de telequinesis',3,3,1.8,'Una espada que vuela sola. Es magia: atraviesa la guardia.','m'],
  ['escudo','Escudo de luz',6,2,0,'El próximo golpe hace la mitad de daño (una embestida, la cuarta parte) y recuperas 8 de vida.','d'],['tajo','Tajo doble',8,2,1.4,'Dos golpes seguidos. Si el enemigo esquiva, el segundo acierta.','f'],
  ['fuego','Bola de fuego',10,5,2.6,'Quema al enemigo: también le duele los dos turnos siguientes.','m'],['cura','Curación',12,4,0,'Recuperas 30 de vida.','d'],['rayo','Rayo',15,7,3.5,'El golpe más fuerte. Aturde: el enemigo pierde su turno y su impulso.','m']];
 // ropa: 'ranura:calidad'. Calidad 1–5 = la que venden las armerías (una por ciudad); s0–s3 = especial, solo la sueltan los monstruos de cada zona.
 // El NIVEL sirve para poder ponérsela (LVL_REQ). Se vende en cualquier armería a mitad de precio.
 const ESPECIAL=[['de piel de lobo','#7d8a96',5,2],['de salteador','#4a3f5c',8,5],['espectral','#8fe0e6',11,8],['de gólem','#b7a98a',14,11]],LVL_REQ=[0,1,3,6,9,12];
 /* 0.3.95 (dueño) — ROPA LEGENDARIA: 3 sets × 4 piezas = 12, la mejor del juego (20% cada pieza). Id 'ranura:L0'…'L2'.
  *   Solo la sueltan los JEFES de las zonas (4 % al vencerlos) o la da el coleccionista de las posadas (3 legendarias por 1 al azar).
  *   Cada pieza brilla; la coraza trae las alas; con las 4 del mismo set sale el aura: fuego, luz blanca o sombra negra. */
 const LEG=[['del dragón de fuego','#e0342c',['#c0281f','#5a0f0a','#ffb02e'],'Dragón de fuego'],['del ángel','#f4f6ff',['#ffffff','#b8c6e8','#fff3a0'],'Ángel'],['del demonio','#3a1a4a',['#2a1a3a','#0f0814','#b04aff'],'Demonio']];
 const LEG_IDS=LEG.flatMap((_,k)=>['casco','pecho','escudo','botas'].map(s=>s+':L'+k));
 const gear=id=>{if(!id||typeof id!=='string')return null;const [slot,q]=id.split(':'),sn=(SLOTS.find(s=>s[0]===slot)||[])[1];if(!sn||!q)return null;
  if(q[0]==='L'){const k=+q.slice(1),e=LEG[k];if(!e)return null;return {id,slot,name:sn+' '+e[0],def:20,lvl:1,price:600,color:e[1],legend:1,set:k}}
  if(q[0]==='s'){const e=ESPECIAL[+q.slice(1)];return {id,slot,name:sn+' '+e[0],def:e[2],lvl:e[3],price:60*(+q.slice(1)+1),color:e[1],special:1}}
  const t=+q;return {id,slot,name:sn+' '+TIERS[t][0],def:t*3,lvl:LVL_REQ[t],price:25*t,color:TIERS[t][1]}};
 function icon(g,slot,col){const d='#24160c',px=(c,x,y,w,h)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};g.clearRect(0,0,16,16);
  if(slot==='casco'){px(d,3,3,10,10);px(col,4,4,8,8);px(d,4,9,8,1);px('#ffffff66',5,5,3,2);px(d,7,10,2,2)}
  else if(slot==='pecho'){px(d,2,2,12,5);px(d,4,6,8,8);px(col,3,3,10,3);px(col,5,6,6,7);px(d,7,3,2,2);px('#ffffff66',5,7,2,3)}
  else if(slot==='escudo'){px(d,3,2,10,9);px(d,4,11,8,2);px(d,6,13,4,1);px(col,4,3,8,7);px(col,5,10,6,2);px(col,7,12,2,1);px('#ffffff66',7,3,2,9);px('#ffffff66',4,6,8,2)}
  else{px(d,2,3,5,11);px(d,2,10,7,4);px(d,9,3,5,11);px(d,9,10,6,4);px(col,3,4,3,9);px(col,3,11,5,2);px(col,10,4,3,9);px(col,10,11,4,2)}}
 const ITEMS={hierba:['🌿','Hierba','Cura 20 de vida.'],pocion:['🧪','Poción','Cura 50 de vida.'],gema:['💎','Gema','No sirve para pelear. La armería la compra.'],sellada:['📕','Página sellada','Llévala a la descifradora de una ciudad: dentro hay un reto.']};
 const RARE={amuleto:['📿','Amuleto del peregrino','+10 de vida máxima, para siempre.'],anillo:['💍','Anillo de la guardia','+4% de protección, para siempre.']};
 const NEED=3,BOSS_CHANCE=.05,LEG_CHANCE=.04;   // 0.3.95: jefes de zona (5 % de cada monstruo) y su 4 % de soltar una pieza legendaria
 const fem=n=>n.startsWith('Babosa'),elM=n=>(fem(n)?'La ':'El ')+n.toLowerCase(),alM=n=>(fem(n)?'a la ':'al ')+n.toLowerCase(),unM=n=>(fem(n)?'Una ':'Un ')+n.toLowerCase();   // el nombre de un monstruo dentro de una frase
 const nm=s=>s.replace(/^(El|La|Los) /,m=>m.toLowerCase()),aQ=s=>/^El /.test(s)?'al '+s.slice(3):'a '+nm(s);   // nombres con artículo dentro de una frase
 // ---- guardado
 const blank=()=>({hero:'',name:'',p:0,x:2,y:12,hp:100,gold:0,xp:0,armor:{casco:'',pecho:'',escudo:'',botas:''},bag:[],done:{},boss:{},extra:{},inv:{hierba:1,pocion:0,gema:0,sellada:0},rare:{amuleto:0,anillo:0},seen:{},home:0,pend:null,note:'',end:false});
 const rd=()=>{try{const v=JSON.parse(localStorage.getItem(KEY));if(v&&v.hero){const b=blank(),s={...b,...v,armor:{...b.armor,...(v.armor||{})},inv:{...b.inv,...(v.inv||{})},rare:{...b.rare,...(v.rare||{})}};
   if(v.p===undefined&&v.city!==undefined){s.p=v.city*2;s.seen={};s.seen[s.p]=1}   // partidas de la 0.3.88: la ciudad pasa a ser un lugar
   SLOTS.forEach(([k])=>{const a=s.armor[k];s.armor[k]=typeof a==='number'?(a?k+':'+a:''):gear(a)?a:''});s.bag=(Array.isArray(v.bag)?v.bag:[]).filter(gear);   // 0.3.92: la armadura era un número
   return s}}catch(_){}return null};
 let st=null;const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(st))}catch(_){}};
 const level=()=>{let L=1,need=30,x=st.xp;while(x>=need){x-=need;L++;need+=20}return {L,cur:x,need}};
 const maxHp=()=>100+5*(level().L-1)+10*st.rare.amuleto,def=()=>Math.min(80,SLOTS.reduce((s,[k])=>s+((gear(st.armor[k])||{}).def||0),0)+4*st.rare.anillo),atk=()=>6+2*level().L;
 const base=c=>12+6*c,pagesIn=c=>[0,1,2,3].filter(i=>st.done[c+'-'+i]).length+(st.extra[c]||0),pages=()=>CITIES.reduce((s,_,c)=>s+pagesIn(c),0);
 // ---- construir los mapas
 const cache={};
 function grid(w,h){const m=new Uint8Array(w*h),kind=new Uint8Array(w*h),used=new Uint8Array(w*h),at=(x,y)=>y*w+x,inb=(x,y)=>x>=0&&y>=0&&x<w&&y<h;
  return {w,h,m,kind,used,at,inb,put:(x,y,t,k)=>{if(inb(x,y)){m[at(x,y)]=t;used[at(x,y)]=1;if(k)kind[at(x,y)]=k}}}}
 function city(c){
  const C=CITIES[c],w=C.w,H=22,th=TH[C.th],r=rng(C.seed),g=grid(w,H),{m,kind,used,at,inb,put}=g,mx=(w>>1)-1,my=11;
  const sea=C.th==='puerto',rx=C.th==='rio'?w-9:-9;
  m.fill(C.th==='castillo'?ST:G);
  if(sea)for(let y=19;y<H;y++)for(let x=0;x<w;x++)put(x,y,W);
  if(rx>0)for(let y=0;y<H;y++)for(let x=rx;x<rx+3;x++)put(x,y,W);
  const road=(x,y)=>{if(inb(x,y))put(x,y,m[at(x,y)]===W?(sea?DK:BR):R)};
  const hroad=(y,x0,x1)=>{for(let x=x0;x<=x1;x++){road(x,y);road(x,y+1)}},vroad=(x,y0,y1)=>{for(let y=y0;y<=y1;y++){road(x,y);road(x+1,y)}};
  hroad(my,0,w-1);hroad(5,3,w-4);hroad(17,3,w-4);vroad(mx,5,sea?H-1:18);
  const big=C.th==='mercado'?2:0;
  for(let y=my-2-big;y<=my+3+big;y++)for(let x=mx-3-big;x<=mx+4+big;x++)if(inb(x,y)&&m[at(x,y)]!==W&&m[at(x,y)]!==BR)put(x,y,C.th==='castillo'?R:ST);
  if(!sea)put(mx-2,my-2,FO);
  if(big)[[mx-5,my-4],[mx-3,my-4],[mx+4,my-4],[mx+6,my-4],[mx-5,my+5],[mx-3,my+5],[mx+4,my+5],[mx+6,my+5]].forEach(([x,y])=>put(x,y,SL));
  for(let x=mx-1;x<=mx+2;x++){put(x,2,RF,3);put(x,3,RF,3);put(x,4,x===mx||x===mx+1?DR:WL,3)}        // la casa del jefe, al fondo de la calle del medio
  const fronts=[];
  const clear=(x,y)=>{for(let dy=-3;dy<0;dy++)for(let dx=0;dx<3;dx++)if(!inb(x+dx,y+dy)||used[at(x+dx,y+dy)])return false;return true};
  const house=(x,y,k)=>{for(let dx=0;dx<3;dx++){put(x+dx,y-3,RF,k);put(x+dx,y-2,RF,k);put(x+dx,y-1,dx===1?DR:WL,k)}return {x:x+1,y}};
  const band=y=>{for(let x=3;x+2<=w-4;){if(clear(x,y)&&r()<.86){fronts.push({...house(x,y,4+Math.floor(r()*3)),band:y});x+=4}else x++}};
  band(my);band(5);band(17);
  const main=fronts.filter(f=>f.band===my),shop=main[0]||fronts[0],inn=main[main.length-1]||fronts[fronts.length-1];
  [[shop,1],[inn,2]].forEach(([f,k])=>{for(let dx=-1;dx<=1;dx++)for(let dy=-3;dy<0;dy++)kind[at(f.x+dx,f.y+dy)]=k});
  for(let y=0;y<H;y++)for(let x=0;x<w;x++){const i=at(x,y);if(used[i])continue;
   const edge=x<2||x>=w-2||y<2||(!sea&&y>=H-2);
   if(edge)m[i]=C.th==='castillo'?CW:TR;else{const q=r();m[i]=q<th.trees?TR:q<th.trees+th.flowers?FL:q<th.trees+th.flowers+.02?FE:m[i]}}
  [my,my+1].forEach(y=>{put(0,y,GA);put(1,y,R);put(w-1,y,c<CITIES.length-1?GA:C.th==='castillo'?CW:TR);put(w-2,y,R)});
  if(sea)[[mx-5,20],[mx+6,20],[4,21],[w-6,20]].forEach(([x,y])=>{if(m[at(x,y)]===W)m[at(x,y)]=BT});
  // casas: la armería, la posada y las demás. Dos de las demás esconden a alguien con una página.
  const homes=fronts.filter(f=>f!==shop&&f!==inn),hid=[homes[1]||homes[0],homes[homes.length-2]||homes[homes.length-1]];
  const doors=fronts.map((f,i)=>({x:f.x,y:f.y-1,fx:f.x,fy:f.y,hi:i,what:f===shop?'shop':f===inn?'inn':f===hid[0]?'m2':f===hid[1]&&hid[1]!==hid[0]?'m3':'home'}));
  if(!doors.some(d=>d.what==='m3')){const d=doors.find(d=>d.what==='home');if(d)d.what='m3'}
  // gente en la calle: las dos misiones a la vista, la descifradora y el jefe
  const spots=homes.filter(f=>!hid.includes(f)).map(f=>({x:f.x+1,y:f.y})).filter(p=>m[at(p.x,p.y)]===R||m[at(p.x,p.y)]===ST);
  for(let i=spots.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[spots[i],spots[j]]=[spots[j],spots[i]]}
  const mk=(i,pos)=>({id:c+'-'+i,name:C.m[i][0],type:C.m[i][1],what:C.m[i][2],say:C.m[i][3],look:C.seed*7+i*13,...pos});
  const npcs=[0,1].map(i=>mk(i,spots[i]||{x:3+i*3,y:my}));
  npcs.push({id:'boss'+c,boss:1,name:C.boss[0],type:C.boss[1],what:C.boss[2],say:C.boss[3],look:C.seed*3,x:mx,y:5});
  npcs.push({id:'scribe',scribe:1,name:'La descifradora',look:903,x:mx+4+big,y:my+2+big});
  const walkers=[0,1,2].map(i=>({x:mx+(i?4*i:-4),y:my+1,px:0,py:0,look:C.seed+i*31,t:i*400}));
  return {type:'c',c,key:'c'+c,name:C.name,thName:C.th,th,w,h:H,m,kind,at,npcs,walkers,mobs:[],doors,my,mx,mk,inn:{x:inn.x,y:inn.y+1},L:{x:2,y:my+1},Rr:{x:w-3,y:my+1},ai:C.ai,intro:C.intro};
 }
 function zone(z){
  const Z=ZONES[z],w=34,H=22,r=rng(Z.seed),g=grid(w,H),{m,used,at,inb,put}=g,my=11;
  m.fill(G);
  for(let k=0;k<Z.ponds;k++){const cx=6+Math.floor(r()*(w-12)),cy=3+Math.floor(r()*(H-6)),rr=1+Math.floor(r()*2);if(Math.abs(cy-my)<5)continue;for(let y=cy-rr;y<=cy+rr;y++)for(let x=cx-rr-1;x<=cx+rr+1;x++)if(inb(x,y)&&Math.hypot((x-cx)*.7,y-cy)<=rr+.3)put(x,y,W)}
  let py=my;for(let x=0;x<w;x++){const want=x<3||x>w-8?my:my+Math.round(3.4*Math.sin(x/4.2+Z.seed));py+=Math.sign(want-py);for(let d=-1;d<=2;d++)put(x,py+d,R);if(x===0||x===w-1){put(x,my,GA);put(x,my+1,GA)}}
  for(let y=0;y<H;y++)for(let x=0;x<w;x++){const i=at(x,y);if(used[i])continue;const edge=x<1||x>=w-1||y<2||y>=H-2,q=r();
   m[i]=edge?TR:q<Z.trees?TR:q<Z.trees+Z.rocks?RK:q<Z.trees+Z.rocks+Z.bush?BU:q<Z.trees+Z.rocks+Z.bush+Z.flowers?FL:G}
  return {type:'z',z,key:'z'+z,name:Z.name,thName:'z'+z,th:Z,w,h:H,m,kind:g.kind,at,npcs:[],walkers:[],mobs:[],doors:[],my,L:{x:2,y:my+1},Rr:{x:w-3,y:my+1},intro:Z.intro,Z};
 }
 function spawn(M){   // los monstruos de una zona vuelven cada vez que entras
  const r=rng(M.Z.seed+Math.floor(performance.now())),out=[],ok=new Uint8Array(M.w*M.h),q=[[M.L.x,M.L.y]];ok[M.at(M.L.x,M.L.y)]=1;
  while(q.length){const [x,y]=q.pop();for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=M.w||ny>=M.h||ok[M.at(nx,ny)]||SOLID.has(M.m[M.at(nx,ny)]))continue;ok[M.at(nx,ny)]=1;q.push([nx,ny])}}   // solo donde se puede llegar caminando
  for(let k=0;k<300&&out.length<6;k++){const x=6+Math.floor(r()*(M.w-12)),y=2+Math.floor(r()*(M.h-4));if(!ok[M.at(x,y)]||out.some(o=>Math.abs(o.x-x)+Math.abs(o.y-y)<3))continue;out.push({x,y,px:x*T,py:y*T,kind:M.Z.mobs[out.length%2],t:300+out.length*250,id:out.length,boss:Math.random()<BOSS_CHANCE})}   // 0.3.95: un jefe de vez en cuando
  M.mobs=out;
 }
 function inside(M0,d){   // el interior de una casa: 9 × 8, con muebles según la casa
  const C=CITIES[M0.c],w=9,H=8,g=grid(w,H),{m,at,put}=g,r=rng(C.seed*31+d.hi*7);
  m.fill(FLR);for(let x=0;x<w;x++){put(x,0,IW);put(x,H-1,IW)}for(let y=0;y<H;y++){put(0,y,IW);put(w-1,y,IW)}
  put(4,H-1,MT);put(1+Math.floor(r()*2),1,SH);put(5+Math.floor(r()*2),1,SH);
  if(d.what==='inn'){put(1,3,BD);put(1,5,BD);put(7,3,BD);put(7,5,BD)}else if(d.what==='shop'){put(3,3,TB);put(4,3,TB);put(5,3,TB)}else{put(1,2,BD);put(6,4,TB);if(r()<.6)put(2,5,TB)}
  [[3,4],[4,4],[5,4],[3,5],[4,5],[5,5]].forEach(([x,y])=>{if(m[at(x,y)]===FLR)m[at(x,y)]=RG});
  const npcs=[];
  if(d.what==='shop')npcs.push({id:'shop',shop:1,name:'El armero',look:901,x:4,y:2});
  else if(d.what==='inn')npcs.push({id:'inn',inn:1,name:'La posadera',look:902,x:4,y:2},{id:'collector',collector:1,name:'El coleccionista',look:904,x:6,y:3});   // 0.3.95
  else if(d.what==='m2'||d.what==='m3')npcs.push({...M0.mk(d.what==='m2'?2:3,{x:4,y:2}),hidden:1});
  else if(r()<.7)npcs.push({id:'v'+d.hi,flavor:1,name:'Vecino',look:C.seed*5+d.hi*17,x:3+Math.floor(r()*3),y:2});
  return {type:'h',c:M0.c,key:M0.key+'h'+d.hi,name:d.what==='shop'?'La armería':d.what==='inn'?'La posada':'Una casa de '+C.name,thName:'casa',th:TH.casa,w,h:H,m,kind:g.kind,at,npcs,walkers:[],mobs:[],doors:[],door:d,ai:M0.ai};
 }
 const place=p=>cache[p]||(cache[p]=isCity(p)?city(ci(p)):zone(ci(p)));
 const solidAt=(M,x,y)=>x<0||y<0||x>=M.w||y>=M.h||SOLID.has(M.m[M.at(x,y)])||M.npcs.some(n=>n.x===x&&n.y===y);
 // ---- pintar: cada casilla se dibuja una vez en un lienzo pequeño y se reutiliza
 const tiles={};
 function tile(M,x,y,frame){
  const id=M.m[M.at(x,y)],k=M.kind[M.at(x,y)],v=(x*7+y*13)%4,top=id===RF&&(y===0||M.m[M.at(x,y-1)]!==RF)?1:0,th=M.th;
  const key=[M.thName,id,k,id===W||id===BT?frame:0,id<3||id===FL||id===TR||id===FLR?v:0,top].join();
  if(tiles[key])return tiles[key];
  const c=document.createElement('canvas');c.width=c.height=T;const g=c.getContext('2d'),px=(col,x0,y0,w0,h0)=>{g.fillStyle=col;g.fillRect(x0,y0,w0,h0)};
  const stone=M.thName==='castillo';
  const ground=()=>{px(stone?'#a9a595':th.g,0,0,T,T);[[2,3],[9,6],[5,12],[13,10],[11,1]].forEach(([a,b],i)=>px(stone?'#958f7e':th.g2,(a+v*3)%15,(b+v*5+i)%15,stone?3:2,1))};
  const wood=()=>{px('#9b6b3a',0,0,T,T);for(let i=0;i<T;i+=4)px('#7c5229',0,i,T,1);px('#6a4420',0,0,1,T);px('#6a4420',15,0,1,T)};
  const water=()=>{px('#3f7fc4',0,0,T,T);[[1,3],[9,7],[4,12],[11,14]].forEach(([a,b])=>px('#86b8ea',(a+frame*3)%13,b,4,1))};
  const floor=()=>{px('#b98a54',0,0,T,T);px('#a37545',0,7,T,1);px('#a37545',0,15,T,1);px('#a37545',v%2?4:10,0,1,7);px('#a37545',v%2?11:5,8,1,7)};
  if(id===G)ground();
  else if(id===R){px(th.r,0,0,T,T);[[3,2],[10,5],[6,11],[13,13],[1,9]].forEach(([a,b])=>px(th.r2,(a+v*4)%15,(b+v*3)%15,2,1))}
  else if(id===ST){px('#c3bead',0,0,T,T);px('#a8a291',0,0,T,1);px('#a8a291',0,8,T,1);px('#a8a291',v%2?4:11,0,1,8);px('#a8a291',v%2?11:4,8,1,8)}
  else if(id===W)water();
  else if(id===TR){ground();px('#6a4420',6,10,4,5);px('#2f6b2f',3,2,10,9);px('#2f6b2f',2,4,12,5);px('#2f6b2f',5,1,6,2);px('#4c9443',4,3,5,3);px('#255725',3,9,10,2)}
  else if(id===RF){const col=k<4?SPECIAL[k]:th.roofs[k-4];px(col,0,0,T,T);for(let i=3;i<T;i+=4)px('#00000030',0,i,T,1);for(let i=0;i<T;i+=8)px('#00000022',i+(top?0:4),0,1,T);if(top)px('#ffffff40',0,0,T,2)}
  else if(id===WL||id===DR){px(k===3?'#cfc8b4':th.wall,0,0,T,T);px('#00000026',0,0,T,2);px('#0000001c',0,14,T,2);
   if(id===WL){px('#5a3d22',4,4,8,8);px('#8fc1e8',5,5,6,6);px('#5a3d22',7,5,1,6);px('#5a3d22',5,8,6,1)}
   else{px('#5a3d22',3,2,10,14);px(k===1?'#3d4a63':k===2?'#2f7a4a':k===3?'#8f2f2a':'#8a5a2b',4,3,8,13);px('#e8c15a',10,9,1,2);
    if(k===1){px('#fff',5,4,6,4);px('#3d4a63',6,5,4,1);px('#3d4a63',7,6,2,2)}if(k===2){px('#fff',5,4,6,4);px('#c0392b',7,4,2,4);px('#c0392b',6,5,4,2)}}}
  else if(id===FL){ground();[['#e9486a',3,4],['#f4d03f',10,3],['#ffffff',6,10],['#b06fd8',12,11]].forEach(([col,a,b])=>{px(col,(a+v*2)%13,b,2,2)})}
  else if(id===BR||id===DK)wood();
  else if(id===FE){ground();px('#7c5229',0,6,T,2);px('#7c5229',0,11,T,2);[2,8,13].forEach(a=>px('#6a4420',a,3,2,11))}
  else if(id===SL){px('#c3bead',0,0,T,T);px('#7c5229',1,9,14,6);for(let i=0;i<T;i+=4)px(i%8?'#f4efe2':'#c0392b',i,1,4,7);px('#00000030',0,8,T,1);px('#e9a23b',4,10,3,3);px('#6dab4d',9,10,3,3)}
  else if(id===FO){px('#c3bead',0,0,T,T);px('#8e98a3',2,2,12,12);px('#3f7fc4',3,3,10,10);px('#86b8ea',6,6,4,4);px('#ffffff',7,7,2,2)}
  else if(id===BT){water();px('#7c5229',2,9,12,4);px('#5a3d22',3,13,10,1);px('#5a3d22',7,2,1,7);px('#f4efe2',8,2,5,6)}
  else if(id===CW){px('#8e8a7d',0,0,T,T);for(let i=0;i<T;i+=4)px('#6f6b60',0,i,T,1);for(let i=0;i<4;i++)px('#6f6b60',(i%2?2:8),i*4,1,4);px('#b1ad9f',0,0,4,2);px('#b1ad9f',8,0,4,2)}
  else if(id===GA){px(th.r,0,0,T,T);px('#6a4420',0,0,T,3);px('#e2b93b',6,0,4,2)}
  else if(id===FLR)floor();
  else if(id===IW){px('#e6dcc2',0,0,T,T);px('#cfc3a4',0,11,T,5);px('#8a7a5c',0,15,T,1);px('#ffffff30',0,0,T,1)}
  else if(id===TB){floor();px('#5a3d22',2,4,12,9);px('#8a5a2b',2,3,12,7);px('#a9743a',3,4,10,2);px('#f4efe2',6,5,3,2)}
  else if(id===BD){floor();px('#5a3d22',2,1,12,14);px('#f4efe2',3,2,10,4);px('#3f6fa3',3,6,10,8);px('#2f5a8a',3,12,10,2)}
  else if(id===SH){px('#e6dcc2',0,0,T,T);px('#5a3d22',1,2,14,13);px('#3a2a1a',2,3,12,5);px('#3a2a1a',2,9,12,5);[['#c0392b',3],['#2f7a4a',5],['#e2b93b',7],['#3f6fa3',10]].forEach(([col,a])=>{px(col,a,4,2,4);px(col,a+1,10,2,4)})}
  else if(id===RG){floor();px('#a2362f',0,0,T,T);px('#c9564b',2,2,12,12);px('#e2b93b',7,7,2,2)}
  else if(id===MT){px('#e6dcc2',0,0,T,T);px('#5a3d22',2,0,12,16);px('#3a2a1a',3,0,10,16);px('#e2b93b',7,10,2,4);px('#e2b93b',6,12,4,1)}
  else if(id===RK){ground();px('#6f6b60',3,6,10,8);px('#8e8a7d',4,5,8,7);px('#b1ad9f',5,6,4,2)}
  else if(id===BU){ground();px('#2f6b2f',2,6,12,8);px('#3f8a3a',3,5,10,7);px('#5aa64d',5,6,4,2);px('#c0392b',10,9,1,1);px('#c0392b',5,11,1,1)}
  return tiles[key]=c;
 }
 // personas: 12 × 16 puntos. h pelo · s piel · e ojo · c ropa · b cinturón · p piernas · f pies
 const BODY={
  chico:['....hhhh....','...hhhhhh...','..hhhhhhhh..','..hhsssshh..','..hsessesh..','..hssssssh..','...ssssss...','..cccccccc..','.sccccccccs.','.sccccccccs.','..ccbbbbcc..','..cccccccc..','...pp..pp...','...pp..pp...','...ff..ff...','..fff..fff..'],
  chica:['....hhhh....','...hhhhhh...','..hhhhhhhh..','.hhhsssshhh.','.hhsesseshh.','.hhsssssshh.','.hh.ssss.hh.','.hcccccccch.','.sccccccccs.','.sccccccccs.','..ccbbbbcc..','..cccccccc..','..cccccccc..','...pp..pp...','...ff..ff...','..fff..fff..']
 };
 const SKIN=['#f1c9a5','#d9a273','#a8703f','#7a4a28'],HAIR=['#3a2a1a','#7a4a1f','#c98a2b','#d8d2c0','#1f1f24','#a33a22'],CLOTH=['#b4513a','#3f6fa3','#2f8a5a','#7a4a8c','#c2792c','#55607a','#a2476a','#6b6f3a'];
 // 0.3.95: alas (la coraza legendaria), aura (el set completo) y el brillo de cada pieza legendaria. Se mueven con el reloj, no con los pasos
 function legWings(g,x,y,k){const C=LEG[k][2],u=Math.floor(Date.now()/260)%2;
  for(const s of [-1,1]){const X=s<0?x+2:x+14,R=(dx,dy,w,h,c)=>{g.fillStyle=c;g.fillRect(s<0?X-dx-w:X+dx,y+dy,w,h)};
   if(k===1){R(0,6,2,4,C[0]);R(1,4-u,2,5,C[0]);R(2,3-u,2,5,C[0]);R(3,2-u,1,5,C[0]);R(1,9,2,1,C[1]);R(2,8-u,2,1,C[1]);R(3,7-u,1,1,C[1])}
   else{R(0,6,2,4,C[0]);R(1,4-u,2,5,C[0]);R(2,2-u,2,6,C[0]);R(3,1-u,1,3,C[1]);R(2,2-u,1,1,C[1]);R(1,4-u,1,5,C[1]);R(2,8-u,2,1,C[1]);if(k===0)R(3,1-u,1,1,C[2])}}}
 function legAura(g,x,y,k,front){const t=Date.now();
  if(k===2&&!front){const u=Math.floor(t/400)%2;g.fillStyle='#0f0814bb';[[3,-1,10,18],[1,2,14,13],[0,6,16,7]].forEach(([a,b,w,h])=>g.fillRect(x+a-u,y+b-u,w+u*2,h+u));g.fillStyle='#b04aff';[[1,3],[14,5],[7,-2],[3,14],[12,1]].forEach(([a,b],i)=>{if((i+Math.floor(t/200))%3)g.fillRect(x+a,y+b-u,1,1)})}
  else if(k===1&&!front){g.fillStyle='#fff8d055';g.fillRect(x+1,y-1,14,18);g.fillStyle='#ffffff40';g.fillRect(x,y+2,16,12)}
  else if(k===1&&front){g.fillStyle='#fff';const s=Math.floor(t/150);[[1,1],[14,4],[0,10],[15,13],[7,-2],[4,16]].forEach(([a,b],i)=>{if((s+i)%3===0)g.fillRect(x+a,y+b,1,1)})}
  else if(k===0&&!front){g.fillStyle='#ff6a0030';g.fillRect(x,y,16,16)}
  else if(k===0&&front){const s=Math.floor(t/90);for(let i=0;i<10;i++){const a=((s*31+i*67)%97*7)%17-1,b=15-((s+i*3)%9)*2;g.fillStyle=['#ffd84a','#ff7a1a','#e0342c'][i%3];g.fillRect(x+a,y+b,1,(i%2)+1)}}}
 function legGlow(g,x,y,o){const s=Math.floor(Date.now()/180)%4,PT=[[[5,0],[10,1]],[[4,8],[11,9]],[[o.flip?2:12,9]],[[4,15],[10,15]]];
  o.leg.forEach((k,i)=>{if(k<0)return;const p=PT[i][s%PT[i].length];g.fillStyle=s<2?'#ffffff':LEG[k][2][2];g.fillRect(x+p[0],y+p[1],1,1)})}
 function sprite(g,x,y,o){
  const rows=BODY[o.girl?'chica':'chico'],pal={h:o.hair,s:o.skin,e:'#24160c',c:o.cloth,b:'#3a2a1a',p:o.legs||'#3a3f52',f:o.feet||'#4a3320'};
  if(o.full>=0&&!o.shadow)legAura(g,x,y,o.full,0);
  if(o.wings>=0&&!o.shadow)legWings(g,x,y-(o.bob?1:0),o.wings);
  if(o.aura){const u=o.pulse?1:0;g.fillStyle='#1a0f24';[[3,-1,10,18],[1,2,14,13],[0,6,16,7]].forEach(([a,b,w,h])=>g.fillRect(x+a-u,y+b-u,w+u*2,h+u));g.fillStyle='#7a3aa3';g.fillRect(x+1,y+3-u,1,2);g.fillRect(x+14,y+5+u,1,2);g.fillRect(x+7,y-2-u,2,1);g.fillRect(x+3,y+14,1,1);g.fillRect(x+12,y+1,1,1)}
  for(let j=0;j<16;j++){const row=rows[j];for(let i=0;i<12;i++){let ch=row[i];if(ch==='.'||ch===' ')continue;
   if(o.back&&(ch==='s'||ch==='e')&&j>=3&&j<=6)ch='h';
   if(o.helm&&ch==='h'&&j<4)ch='H';
   g.fillStyle=o.shadow?(ch==='e'?'#e9486a':'#15151c'):ch==='H'?o.helm:pal[ch];g.fillRect(x+2+(o.flip?11-i:i),y+j-(o.bob?1:0),1,1)}}
  if(o.shadow)return;
  if(o.helm){g.fillStyle='#00000030';g.fillRect(x+4,y+3-(o.bob?1:0),8,1)}
  if(o.mask){g.fillStyle='#15151c';g.fillRect(x+4,y+4,8,2);g.fillStyle='#fff';g.fillRect(x+6,y+4,1,1);g.fillRect(x+9,y+4,1,1)}
  if(o.crown){g.fillStyle='#e2b93b';g.fillRect(x+5,y-1,6,2);g.fillRect(x+5,y-2,1,1);g.fillRect(x+7,y-2,2,1);g.fillRect(x+10,y-2,1,1)}
  if(o.shield&&!o.back){const sx=o.flip?x+1:x+11;g.fillStyle='#3a2a1a';g.fillRect(sx,y+7,4,6);g.fillStyle=o.shield;g.fillRect(sx+1,y+8,2,4)}
  if(o.leg)legGlow(g,x,y,o);
  if(o.full>=0)legAura(g,x,y,o.full,1);
 }
 // monstruos: 12 × 12. o borde · b cuerpo · w blanco · k negro
 const BEAST={
  slime:['............','............','....oooo....','..oobbbboo..','.obbbbbbbbo.','.obwkbbwkbo.','obbbbbbbbbbo','obbbbbbbbbbo','obbbkkkkbbbo','.obbbbbbbbo.','..oooooooo..','............'],
  wolf:['............','.......o..o.','......obbobo','..ooooobbbbo','.obbbbbbwkbo','obbbbbbbbbko','obbbbbbbbbo.','obbobbbobbo.','obo.obo.obo.','obo.obo.obo.','............','............'],
  bat:['............','o..........o','bo...oo...ob','bbo.obbo.obb','bbbobbbbobbb','.bbbwkkwbbb.','..bbbbbbbb..','...bkbbkb...','....b..b....','............','............','............'],
  ghost:['....oooo....','..oobbbboo..','.obbbbbbbbo.','.obkkbbkkbo.','.obkkbbkkbo.','.obbbbbbbbo.','.obbbkkbbbo.','.obbbbbbbbo.','.obbbbbbbbo.','.obobbobbob.','.o.oo.oo.o..','............'],
  golem:['...oooooo...','..obbbbbbo..','..obwkwkbo..','..obbbbbbo..','oooobbbboooo','obbobbbbobbo','obbobbbbobbo','obbobbbbobbo','.oo.obbo.oo.','...obbbbo...','...obbobbo..','...ooo.ooo..']
 };
 function beast(g,x,y,kind,flip){
  const D=MOBS[kind];if(D[1]==='bandit'){sprite(g,x,y-3,{skin:SKIN[1],hair:'#15151c',cloth:D[2][0],legs:'#24242c',mask:1,flip});return}
  const rows=BEAST[D[1]],pal={o:D[2][1],b:D[2][0],w:'#fff',k:'#15151c'};
  for(let j=0;j<12;j++)for(let i=0;i<12;i++){const ch=rows[j][i];if(ch==='.')continue;g.fillStyle=pal[ch];g.fillRect(x+2+(flip?11-i:i),y+2+j,1,1)}
 }
 const lookOf=n=>{const r=rng(n*97+5);return {skin:SKIN[Math.floor(r()*4)],hair:HAIR[Math.floor(r()*6)],cloth:CLOTH[Math.floor(r()*8)],girl:r()<.5,legs:['#3a3f52','#5a4630','#2f3a2f'][Math.floor(r()*3)]}};
 const legOf=k=>{const q=gear(st.armor[k]);return q&&q.legend?q.set:-1},fullSet=()=>{const a=SLOTS.map(([k])=>legOf(k));return a[0]>=0&&a.every(v=>v===a[0])?a[0]:-1};
 const heroLook=()=>{const c=k=>(gear(st.armor[k])||{}).color||'',leg=SLOTS.map(([k])=>legOf(k));return {girl:st.hero==='chica',skin:st.hero==='chica'?'#e8b98f':'#d9a273',hair:st.hero==='chica'?'#7a2f1f':'#3a2a1a',cloth:c('pecho')||(st.hero==='chica'?'#7a4a8c':'#3f6fa3'),legs:'#4a3f35',feet:c('botas')||'#4a3320',helm:c('casco'),shield:c('escudo'),
  leg:leg.some(v=>v>=0)?leg:null,wings:leg[1],full:fullSet()}};
 const face=n=>n.sealed?{shadow:1}:n.collector?{skin:SKIN[2],hair:HAIR[3],cloth:'#5a2a6a',legs:'#2a1a3a'}:n.shop?{skin:SKIN[1],hair:HAIR[4],cloth:'#3d4a63',helm:'#8e98a3'}:n.inn?{skin:SKIN[0],hair:HAIR[2],cloth:'#2f7a4a',girl:true}:n.scribe?{skin:SKIN[0],hair:HAIR[3],cloth:'#5b3f8c',girl:true}
  :n.name===VILLANO?(st.boss[CITIES.length-1]?{skin:SKIN[0],hair:HAIR[3],cloth:'#7a5a2b'}:{skin:'#cfc6d8',hair:'#15151c',cloth:'#2a1a3a',legs:'#15151c',crown:1,aura:1})   // vencido Mordrac, en su sitio queda Alcuino
  :{...lookOf(n.look),crown:n.boss,aura:!!n.type&&!(n.boss?st.boss[M.c]:st.done[n.id])};   // quien guarda una página lleva el aura negra hasta que le ganas
 // ---- la pantalla
 let api=null,body=null,cv=null,M=null,pl=null,raf=0,last=0,frame=0,mode='map',goal=null,F=null,tab='yo';
 function open(){S.open('advScreen','⚔️ Aventura',(b,a)=>{api=a;body=b;a.el.classList.add('av-full');b.classList.add('av','pz');a.onClose=stop;arenaOff();st=rd();st?(st.pend?pending():enter()):create()})}
 function stop(){cancelAnimationFrame(raf);raf=0;if(st&&pl&&M&&M.type!=='h'){st.x=pl.x;st.y=pl.y;save()}}
 function create(){
  let hero='chica';const prof=window.SudomiProfile&&SudomiProfile.name?SudomiProfile.name():'';
  body.innerHTML=`<div class="av-col"><article class="pz-page"><p class="pz-src">Año 800 · Modo historia</p><h3>Las páginas perdidas</h3><p class="pz-q">El maestro Alcuino escribió un libro que abre el conocimiento a quien lo lee: de ahí sale su poder. ${VILLANO} lo sabía. Durante años fue sellando sus páginas una a una, sin que el maestro lo notara. Cuando atacó, casi todo el libro estaba sellado: venció a Alcuino y se lo llevó, para sacarle el secreto y escribir su propio libro.</p><p class="sy-say">En la pelea las páginas salieron volando. Quien encuentra una queda envuelto en un aura negra y no la suelta sin retarte. Un sello solo se rompe resolviendo su acertijo. Eres el aprendiz del maestro: reúne el libro y tráelo de vuelta.</p></article>
  <h3 class="sy-h">¿Quién hace el viaje?</h3><div class="av-pick">${['chica','chico'].map(h=>`<button type="button" data-h="${h}" class="${h===hero?'on':''}" aria-pressed="${h===hero}"><canvas width="16" height="16"></canvas><b>${h==='chica'?'Aprendiza':'Aprendiz'}</b></button>`).join('')}</div>
  <label class="av-name"><span>Nombre</span><input type="text" maxlength="14" value="${(prof||'').replace(/[<>"&]/g,'')}" placeholder="Tu nombre"></label>
  <button type="button" class="pz-btn sy-big" id="avGo">Empezar la aventura</button>
  <div class="pz-row av-menu"><button type="button" class="pz-link" id="avQuick">Prefiero el viaje rápido, sin caminar</button><button type="button" class="pz-link" id="avOut">Salir</button></div></div>`;
  body.querySelectorAll('[data-h]').forEach(b=>{const g=b.querySelector('canvas').getContext('2d');st={...blank(),hero:b.dataset.h};sprite(g,0,0,heroLook());st=null;
   b.onclick=()=>{hero=b.dataset.h;body.querySelectorAll('[data-h]').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)})}});
  body.querySelector('#avGo').onclick=()=>{st={...blank(),hero,name:body.querySelector('.av-name input').value.trim()||(hero==='chica'?'Aprendiza':'Aprendiz')};save();snd('bonus');enter()};
  body.querySelector('#avQuick').onclick=()=>{api.close();window.SudomiStory&&SudomiStory.open()};body.querySelector('#avOut').onclick=()=>api.close();
 }
 const hudHTML=()=>{const L=level();return `<button type="button" class="av-mbtn" id="avMenu" aria-label="Menú">☰ Menú</button><b>${M?M.name:''}</b><span class="av-hp" role="img" aria-label="Vida ${st.hp} de ${maxHp()}"><i style="width:${Math.round(st.hp/maxHp()*100)}%"></i><em>♥ ${st.hp}</em></span><span>Nv ${L.L}</span><span>🪙 ${st.gold}</span><span>📜 ${pages()}</span>`};
 function hud(){const e=body.querySelector('.av-hud');if(!e)return;e.innerHTML=hudHTML();const b=e.querySelector('#avMenu');if(b)b.onclick=()=>menu('yo')}
 function enter(house){
  mode='map';arenaOff();const out=place(st.p);
  if(house)M=inside(out,house);else{M=out;if(M.type==='z'&&!M.mobs.length)spawn(M);if(solidAt(M,st.x,st.y)){st.x=M.L.x;st.y=M.L.y}}
  const sx=house?4:st.x,sy=house?M.h-2:st.y;
  pl={x:sx,y:sy,px:sx*T,py:sy*T,path:[],dir:1,back:!!house,step:0};goal=null;
  const bw=Math.min(body.clientWidth-16,720),bh=body.clientHeight-196;VH=bw>0&&bh>0?Math.max(9,Math.min(17,Math.floor(bh/(bw/VW)))):11;
  body.innerHTML=`<div class="av-col"><div class="av-hud"></div><div class="av-stage" style="width:min(100%,${bh>0?Math.floor(bh*VW/VH):720}px)"><canvas class="av-map" style="aspect-ratio:${VW}/${VH}" width="${VW*T}" height="${VH*T}" tabindex="0" aria-label="${M.name}. Toca a dónde ir."></canvas></div><div class="av-talk" aria-live="polite"></div></div>`;
  cv=body.querySelector('.av-map');hud();
  cv.onclick=e=>{const b=cv.getBoundingClientRect(),cam=camera();tap(Math.floor(((e.clientX-b.left)/b.width*VW*T+cam.x)/T),Math.floor(((e.clientY-b.top)/b.height*VH*T+cam.y)/T))};
  cv.onkeydown=e=>{const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!d)return;e.preventDefault();if(pl.path.length)return;const nx=pl.x+d[0],ny=pl.y+d[1];
   const dr=M.doors.find(k=>k.x===nx&&k.y===ny);if(dr){goIn(dr);return}if(!solidAt(M,nx,ny)){goal=null;pl.path=[[nx,ny]]}};
  const tip='Toca a dónde quieres ir, o a una persona para hablarle.';
  if(st.note){say(null,st.note);st.note='';save()}
  else if(house)say(null,`<b>${M.name}.</b> ${M.npcs.length?'Hay alguien dentro.':'No hay nadie.'} La puerta está abajo.`)
  else if(!st.seen[st.p]){st.seen[st.p]=1;save();say(null,`<b>${M.name}.</b> ${M.intro} ${M.type==='c'?`Quien lleva el aura negra guarda una página sellada: en la calle se les ve la señal <b class="av-bang">!</b>, y dentro de algunas casas hay más. Rompe ${NEED} sellos y busca ${aQ(CITIES[M.c].boss[0])}, al fondo de la calle del medio.`:'Los monstruos sueltan cosas al caer. Con poca vida, vuelve a una posada.'}`)}
  else say(null,tip);
  cancelAnimationFrame(raf);last=performance.now();raf=requestAnimationFrame(loop);
 }
 const camera=()=>({x:M.w*T<=VW*T?-Math.floor((VW*T-M.w*T)/2):Math.max(0,Math.min(M.w*T-VW*T,Math.round(pl.px)-6*T)),y:M.h*T<=VH*T?-Math.floor((VH*T-M.h*T)/2):Math.max(0,Math.min(M.h*T-VH*T,Math.round(pl.py)-(VH>>1)*T))});
 function path(tx,ty){
  const w=M.w,prev=new Int32Array(w*M.h).fill(-1),q=[pl.y*w+pl.x];prev[q[0]]=q[0];
  for(let h=0;h<q.length;h++){const c=q[h],x=c%w,y=(c-x)/w;if(x===tx&&y===ty)break;
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=ny*w+nx;if(nx<0||ny<0||nx>=w||ny>=M.h||prev[k]>=0||solidAt(M,nx,ny))continue;prev[k]=c;q.push(k)}}
  const end=ty*w+tx;if(prev[end]<0)return null;const out=[];for(let c=end;c!==prev[c];c=prev[c])out.unshift([c%w,(c-c%w)/w]);return out;
 }
 const walkTo=(x,y)=>x===pl.x&&y===pl.y?[]:path(x,y);
 function tap(x,y){
  if(mode!=='map'||x<0||y<0||x>=M.w||y>=M.h)return;
  const n=M.npcs.find(k=>k.x===x&&(k.y===y||k.y===y+1));     // la cabeza de alguien también cuenta
  if(n){const near=[[0,1],[1,0],[-1,0],[0,-1]].map(([dx,dy])=>[n.x+dx,n.y+dy]).filter(([a,b])=>!solidAt(M,a,b)).map(p=>({p,path:walkTo(p[0],p[1])})).filter(k=>k.path).sort((a,b)=>a.path.length-b.path.length)[0];
   if(!near){say(null,'No hay cómo llegar hasta ahí.');return}
   goal={n};pl.path=near.path;if(!near.path.length)arrive();return}
  const dr=M.doors.find(k=>k.x===x&&(k.y===y||k.y===y+1||k.y===y+2));   // la puerta o el techo de la casa
  if(dr&&SOLID.has(M.m[M.at(x,y)])){const p=walkTo(dr.fx,dr.fy);if(!p){say(null,'No hay cómo llegar hasta esa puerta.');return}goal={door:dr};pl.path=p;if(!p.length)arrive();return}
  const mb=M.mobs.find(k=>k.x===x&&k.y===y);
  if(mb){const near=[[0,1],[1,0],[-1,0],[0,-1]].map(([dx,dy])=>walkTo(mb.x+dx,mb.y+dy)).filter(Boolean).sort((a,b)=>a.length-b.length)[0];if(near){goal={mob:mb};pl.path=near;if(!near.length)arrive()}return}
  const wk=M.walkers.find(k=>k.x===x&&k.y===y);
  if(wk){say(lookOf(wk.look),LINES[(wk.look+Math.floor(performance.now()/4000))%LINES.length]);return}
  goal=null;const p=solidAt(M,x,y)?null:path(x,y);if(p){pl.path=p;snd('tap')}
 }
 const LINES=['«Dicen que un encapuchado se llevó al maestro Alcuino.»','«Al que encuentra una página se le pone la mirada negra. No es él quien habla.»','«Los bichos de Mordrac no pegan siempre igual: míralos antes de atacar.»','«Con buena armadura duele menos equivocarse.»','«En la posada te curan por unas monedas.»','«No todas las páginas están a la vista. Toca a las puertas.»','«Si pierdes por poco, casi no duele.»','«La descifradora rompe sellos. Los monstruos a veces llevan páginas selladas.»','«Fuera de la ciudad hay bichos. Mejor ir con el casco puesto.»'];
 function goIn(d){if(M.kind[M.at(d.x,d.y)]===3){say(null,'La puerta del salón está cerrada. Quien manda aquí atiende afuera.');return}st.x=d.fx;st.y=d.fy;save();snd('pop');enter(d)}
 function arrive(){const g=goal;goal=null;if(!g)return;if(g.door)return goIn(g.door);if(g.mob)return fight(g.mob);const n=g.n;pl.back=n.y<pl.y;pl.dir=n.x<pl.x?-1:1;talk(n)}
 function loop(now){
  if(!body||!cv||!cv.isConnected||mode!=='map'){raf=0;return}
  const dt=Math.min(60,now-last);last=now;frame=Math.floor(now/500)%2;
  if(update(dt,now)){draw();raf=requestAnimationFrame(loop)}
 }
 // un paso de tiempo: mueve al personaje, a la gente y a los monstruos. Devuelve false si la pantalla cambió
 function update(dt,now){
  if(pl.path.length){const [tx,ty]=pl.path[0],sp=dt*.11,dx=tx*T-pl.px,dy=ty*T-pl.py,d=Math.hypot(dx,dy);
   if(dx)pl.dir=dx<0?-1:1;pl.back=dy<0;pl.step+=dt;
   if(d<=sp){pl.px=tx*T;pl.py=ty*T;pl.x=tx;pl.y=ty;pl.path.shift();const id=M.m[M.at(tx,ty)];
    if(id===GA){gate(tx);return false}if(id===MT){leave();return false}
    if(!pl.path.length&&goal){arrive();if(mode!=='map')return false}}else{pl.px+=dx/d*sp;pl.py+=dy/d*sp}}
  const roam=(k,ok)=>{k.t-=dt;if(k.t<=0){k.t=600+((k.id*53+(k.look||7)*37+Math.floor(now))%900);const o=[[1,0],[-1,0],[0,1],[0,-1]][Math.floor(now/7+(k.look||k.id*3))%4],nx=k.x+o[0],ny=k.y+o[1];
    if(nx>1&&nx<M.w-2&&ok(M.m[M.at(nx,ny)])&&!solidAt(M,nx,ny)&&!(nx===pl.x&&ny===pl.y)&&!M.mobs.some(q=>q!==k&&q.x===nx&&q.y===ny)){k.x=nx;k.y=ny;k.flip=o[0]<0}}
   if(!k.px&&!k.py){k.px=k.x*T;k.py=k.y*T}k.px+=(k.x*T-k.px)*Math.min(1,dt*.012);k.py+=(k.y*T-k.py)*Math.min(1,dt*.012)};
  for(const k of M.walkers)roam(k,t=>t===R||t===ST||t===BR);
  for(const k of M.mobs)roam(k,t=>!SOLID.has(t)&&t!==GA);
  const hit=M.mobs.find(k=>Math.abs(k.x-pl.x)+Math.abs(k.y-pl.y)===0);if(hit){fight(hit);return false}
  return mode==='map';
 }
 function draw(){
  const g=cv.getContext('2d'),cam=camera(),x0=Math.max(0,Math.floor(cam.x/T)),y0=Math.max(0,Math.floor(cam.y/T));g.imageSmoothingEnabled=false;
  g.fillStyle='#15120e';g.fillRect(0,0,VW*T,VH*T);
  for(let y=y0;y<=y0+VH&&y<M.h;y++)for(let x=x0;x<=x0+VW&&x<M.w;x++)g.drawImage(tile(M,x,y,frame),x*T-cam.x,y*T-cam.y);
  const list=[];
  M.walkers.forEach(k=>list.push({y:k.py,f:()=>sprite(g,Math.round(k.px-cam.x),Math.round(k.py-cam.y)-3,{...lookOf(k.look),flip:k.flip,bob:frame})}));
  M.mobs.forEach(k=>list.push({y:k.py,f:()=>{const X=Math.round(k.px-cam.x),Y=Math.round(k.py-cam.y)-(frame?1:0);if(k.boss)bossGlow(g,X,Y,0);beast(g,X,Y,k.kind,k.flip);if(k.boss)bossGlow(g,X,Y,1)}}));
  M.npcs.forEach(n=>list.push({y:n.y*T,f:()=>{const X=n.x*T-cam.x,Y=n.y*T-cam.y-3;sprite(g,X,Y,{...face(n),pulse:frame});
   const dn=n.boss?st.boss[M.c]:st.done[n.id],mark=(c1,c2)=>{const up=frame?1:0;g.fillStyle='#24160c';g.fillRect(X+6,Y-11-up,4,9);g.fillStyle=c1;g.fillRect(X+7,Y-10-up,2,4);g.fillRect(X+7,Y-5-up,2,2)};
   if(n.shop||n.inn||n.flavor)return;
   if(n.scribe){if(st.inv.sellada>0)mark('#ff7ad1');return}
   if(dn){g.fillStyle='#2f7a4a';g.fillRect(X+5,Y-6,1,2);g.fillRect(X+6,Y-5,1,2);g.fillRect(X+7,Y-6,1,2);g.fillRect(X+8,Y-7,1,2);g.fillRect(X+9,Y-8,1,2)}
   else if(!n.hidden)mark(n.boss?'#e2b93b':'#ffd84a')}}));   // las páginas escondidas en casas no llevan señal
  list.push({y:pl.py+.5,f:()=>sprite(g,Math.round(pl.px-cam.x),Math.round(pl.py-cam.y)-3,{...heroLook(),flip:pl.dir<0,back:pl.back&&(pl.path.length>0||M.type==='h'&&pl.y===M.h-2),bob:pl.path.length&&Math.floor(pl.step/140)%2})});
  list.sort((a,b)=>a.y-b.y).forEach(k=>k.f());
 }
 function paint(canvas,spec){const g=canvas.getContext('2d');g.clearRect(0,0,16,16);if(spec.mob){if(spec.boss)bossGlow(g,0,0,0);beast(g,0,0,spec.mob);if(spec.boss)bossGlow(g,0,0,1)}else sprite(g,0,0,spec.hero?heroLook():spec)}
 // el jefe: un resplandor rojo detrás y una corona encima
 function bossGlow(g,x,y,front){if(!front){const u=Math.floor(Date.now()/300)%2;g.fillStyle='#ff1a1a44';g.fillRect(x+1-u,y+1-u,14+u*2,14+u*2);g.fillStyle='#ff1a1a66';g.fillRect(x+3,y+3,10,10);return}
  g.fillStyle='#24160c';g.fillRect(x+5,y-1,7,3);g.fillStyle='#e2b93b';g.fillRect(x+6,y,5,1);g.fillRect(x+6,y-1,1,1);g.fillRect(x+8,y-1,1,1);g.fillRect(x+10,y-1,1,1);g.fillStyle='#e0342c';g.fillRect(x+8,y,1,1)}
 // ---- hablar
 function say(look,html,btns){
  const t=body.querySelector('.av-talk');if(!t)return;
  t.innerHTML=`${look?'<canvas class="av-face" width="16" height="16"></canvas>':''}<div><p>${html}</p>${btns?`<div class="pz-row">${btns.map((b,i)=>`<button type="button" class="${i?'pz-link':'pz-btn'}" data-b="${i}">${b[0]}</button>`).join('')}</div>`:''}</div>`;
  if(look)paint(t.querySelector('canvas'),look);
  (btns||[]).forEach((b,i)=>t.querySelector(`[data-b="${i}"]`).onclick=b[1]);
 }
 const reward=n=>n.boss?60+30*M.c:n.sealed?25+12*M.c:15+10*M.c,xpOf=n=>n.boss?60+30*M.c:20+10*M.c;
 function talk(n){
  const c=M.c,hush=()=>say(null,'Toca a dónde quieres ir, o a una persona para hablarle.');snd('tap');
  if(n.shop)return shop(n);
  if(n.collector)return collector(n);
  if(n.flavor)return say(face(n),LINES[(n.look+c)%LINES.length]);
  if(n.inn){const cost=5+5*c;st.home=st.p;save();return say(face(n),`<b>${n.name}.</b> «Cama, sopa caliente y como nuevo. Son ${cost} de oro.»${st.hp>=maxHp()?' No te hace falta: estás con toda la vida.':''}`,[[`Descansar (${cost} de oro)`,()=>{if(st.hp>=maxHp())return hush();if(st.gold<cost)return say(face(n),'«Sin oro no hay cama. Vuelve cuando tengas.»');st.gold-=cost;st.hp=maxHp();save();hud();snd('bonus');say(face(n),'«Buenos días. Se te ve otra cara.» Recuperaste toda la vida.')}],['Ahora no',hush]])}
  if(n.scribe){if(!st.inv.sellada)return say(face(n),`<b>${n.name}.</b> «Conozco los sellos de Mordrac. Sus monstruos cargan páginas selladas: si te dejan una, tráemela. Dentro siempre espera una sombra.»`);
   const q=sealed(c);return say(face(n),`<b>${n.name}.</b> «Tienes ${st.inv.sellada} página${st.inv.sellada>1?'s':''} sellada${st.inv.sellada>1?'s':''}. Si rompo el sello, sale la sombra que la guarda y tendrás que ganarle.»<br><small>${q.type==='g'?`Una partida de <b>${GAMES[q.what]}</b> contra la sombra`:`Acertijo: <b>${P.byId(q.what).t}</b>`} · premio ${reward(q)} de oro y una página de ${CITIES[c].name}</small>`,[['Romper el sello',()=>q.type==='g'?playGame(q):enigma(q,0)],['Ahora no',hush]])}
  if(n.boss&&st.boss[c])return say(face(n),c<CITIES.length-1?`<b>${n.name}.</b> «Se me fue el aura, y el peso con ella. La puerta del este está abierta: ve por el maestro.»`:'<b>El maestro Alcuino.</b> «El libro vuelve a estar entero, y es gracias a ti. Ahora el aprendiz enseña al maestro.»');
  if(!n.boss&&st.done[n.id])return say(face(n),`<b>${n.name}.</b> «No sé qué me pasó. Tenía una sombra en la cabeza y no quería soltar esa página. Gracias.»`);
  if(n.boss&&pagesIn(c)<NEED)return say(face(n),`<b>${n.name}.</b> «Tráeme ${NEED} páginas de ${CITIES[c].name} y hablamos. Llevas ${pagesIn(c)}. Mira el mapa del menú si no sabes dónde buscar.»`);
  const game=n.type==='g',what=game?`Una partida de <b>${GAMES[n.what]}</b>, nivel ${AI_NAME[M.ai]}`:Array.isArray(n.what)?'Tres acertijos seguidos':`Acertijo: <b>${P.byId(n.what).t}</b>`;
  say(face(n),`<b>${n.name}.</b> <i class="av-aura">Un aura negra ${n.boss&&c===CITIES.length-1?'lo rodea como un manto':'le nubla los ojos'}.</i> ${n.say}<br><small>${what} · premio ${reward(n)} de oro${game?` · si pierdes, hasta ${hit(base(c)*2)} de vida`:` · cada fallo cuesta ${hit(base(c)*.4)} de vida`}</small>`,
   [[game?'Jugar':'Aceptar el reto',()=>game?playGame(n):enigma(n,0)],['Ahora no',hush]]);
 }
 // el reto que guarda una página sellada en esta ciudad: primero los que le sobran a la ciudad, luego acertijos de su dificultad
 function sealed(c){
  const k=st.extra[c]||0,pool=CITIES[c].m.slice(4);let q=pool[k];
  if(!q){const d=Math.min(3,1+Math.floor(c/2)),L=P.list.filter(p=>p.d===d&&p.k!=='river'&&p.k!=='slide');q=['', 'e',L[(k*7+c*3)%L.length].id,'']}
  return {id:'seal'+c+'-'+k,sealed:1,name:'La sombra del sello',type:q[1],what:q[2],say:'',look:0};
 }
 const hit=d=>Math.max(1,Math.round(d*(1-def()/100)));
 function hurt(d){const h=hit(d);st.hp=Math.max(0,st.hp-h);save();snd('bad');return h}
 function faint(why){
  arenaOff();st.hp=Math.round(maxHp()/2);const lost=Math.floor(st.gold*.25);st.gold-=lost;st.pend=null;st.p=st.home||0;const m=place(st.p);st.x=m.inn.x;st.y=m.inn.y;
  st.note=`${why||'Te quedaste sin fuerzas.'} Despertaste frente a la posada de ${m.name} con media vida${lost?` y ${lost} de oro menos`:''}.`;save();pl=null;enter();
 }
 function gain(x){const a=level().L;st.xp+=x;const b=level().L;if(b>a){st.hp=maxHp();const ok=st.bag.map(gear).some(q=>q.lvl>a&&q.lvl<=b);return ` <b>¡Subiste al nivel ${b}!</b> Vida completa${ok?'. Ya puedes ponerte ropa que tenías guardada':''}.`}return ''}
 function win(n){
  const c=ci(st.p),g=reward(n),pg0=pages();st.gold+=g;let up=gain(xpOf(n));
  const pw=PODERES.filter(q=>q[2]>pg0&&q[2]<=pg0+1&&!n.boss).map(q=>q[1]);if(pw.length)up+=` <b>Poder nuevo: ${pw.join(', ')}.</b>`;   // los poderes se abren con páginas
  try{window.SudomiXP&&SudomiXP.award(n.boss?40:10)}catch(_){}
  if(n.boss){st.boss[c]=1;st.hp=maxHp();try{window.SudomiCoins&&SudomiCoins.add(25,'Aventura: jefe vencido')}catch(_){}
   if(c===CITIES.length-1){st.end=true;st.note=`<b>Mordrac se deshizo en humo</b> con su último sello. Detrás del trono, una puerta: el maestro Alcuino, flaco y sonriente. «Sabía que vendrías. Un sello no aguanta a quien piensa.» El libro vuelve a estar entero. Ganaste ${g} de oro.${up}`;try{window.SudomiFX&&SudomiFX.confetti&&SudomiFX.confetti(innerWidth/2,innerHeight*.35,90)}catch(_){}}
   else st.note=`<b>Venciste ${aQ(n.name)}</b> y el aura negra se le deshizo. Ganaste ${g} de oro, recuperaste toda la vida y se abrió la puerta del este, camino a ${ZONES[c].name}.${up}`;snd('win')}
  else{if(n.sealed){st.inv.sellada=Math.max(0,st.inv.sellada-1);st.extra[c]=(st.extra[c]||0)+1}else st.done[n.id]=1;
   st.note=`<b>Sello roto: página recuperada.</b> ${n.sealed?'La sombra se deshizo y dejó':'El aura negra se apagó. '+n.name.split(',')[0]+' volvió en sí y te dio'} ${g} de oro. Llevas ${pagesIn(c)} de ${CITIES[c].name}${pagesIn(c)>=NEED&&!st.boss[c]?`: ya puedes ir a ver ${aQ(CITIES[c].boss[0])}`:''}.${up}`;snd('bonus')}
  save();
 }
 // ---- los dos lados de un reto: tú a la izquierda, quien te reta a la derecha
 const vsHTML=(name,extra,cls,dMe,dFoe)=>`<div class="av-vs ${cls||''}"><div class="av-side"><canvas class="av-big" width="16" height="16" data-f="me"></canvas><b>${st.name}</b><span class="av-hp"><i style="width:${Math.round(st.hp/maxHp()*100)}%"></i><em>♥ ${st.hp}</em></span>${dMe?`<i class="av-dmg${String(dMe)[0]==='+'?' heal':''}">${dMe}</i>`:''}</div><em class="av-x">VS</em><div class="av-side r"><canvas class="av-big" width="16" height="16" data-f="foe"></canvas><b>${name}</b>${extra||''}${dFoe?`<i class="av-dmg">${dFoe}</i>`:''}</div></div>`;
 const vsPaint=(root,foe)=>{paint(root.querySelector('[data-f="me"]'),{hero:1});paint(root.querySelector('[data-f="foe"]'),foe)};
 const vsHp=root=>{const e=root.querySelector('.av-side .av-hp');if(e)e.innerHTML=`<i style="width:${Math.round(st.hp/maxHp()*100)}%"></i><em>♥ ${st.hp}</em>`};
 const back=()=>{const d=M&&M.type==='h'?M.door:null;enter(d)};
 // ---- reto: acertijo (cada fallo quita vida; se puede dejar para después)
 function enigma(n,k){
  mode='puzzle';cancelAnimationFrame(raf);const ids=Array.isArray(n.what)?n.what:[n.what],p=P.byId(ids[k]),c=M.c;let hints=0;
  body.innerHTML=`<div class="av-col">${vsHTML(n.name,ids.length>1?`<small>Pregunta ${k+1} de ${ids.length}</small>`:'')}
  <article class="pz-page"><p class="pz-src">${P.source(p)}</p><h3>${p.t}</h3><p class="pz-q">${p.q}</p></article><div class="pz-play"></div><div class="pz-hints"></div>
  <div class="pz-row"><button type="button" class="pz-link" id="avHint">Pedir una pista</button><button type="button" class="pz-link" id="avBack">Dejarlo para después</button></div><div class="pz-end"></div></div>`;
  vsPaint(body,face(n));body.scrollTop=0;
  const hb=body.querySelector('#avHint');hb.onclick=()=>{if(hints>=p.h.length)return;body.querySelector('.pz-hints').innerHTML=`<p class="pz-hint"><b>Pista ${hints+1}.</b> ${p.h[hints]}</p>`;hints++;snd('hint');if(hints>=p.h.length){hb.disabled=true;hb.textContent='No quedan pistas'}};
  body.querySelector('#avBack').onclick=back;
  P.mount(body.querySelector('.pz-play'),p,{
   onError:()=>{const h=hurt(base(c)*.4);vsHp(body);if(st.hp<=0){faint();return}body.querySelector('.pz-end').innerHTML=`<p class="pz-msg bad">Fallaste: −${h} de vida.</p>`},
   onSolve:()=>{snd('good');const lastQ=k>=ids.length-1;if(lastQ)win(n);
    body.querySelector('.pz-end').innerHTML=`<div class="pz-solved"><p><b>Correcto.</b> ${p.s}</p><button type="button" class="pz-btn sy-big" id="avNext">${lastQ?'Seguir':'Siguiente pregunta'}</button></div>`;
    hb.disabled=true;body.querySelector('#avBack').disabled=true;const b=body.querySelector('#avNext');b.onclick=()=>lastQ?back():enigma(n,k+1);b.scrollIntoView({block:'nearest',behavior:'smooth'})}});
 }
 // ---- reto: partida del arcade contra la máquina, al nivel de la ciudad. Se ve dentro de la aventura: body.av-battle esconde el marco del arcade
 //      y arriba queda la barra con los dos lados.
 let foeNow=null;
 function arena(n){
  foeNow=n;document.body.classList.add('av-battle');let bar=document.getElementById('avVs');if(!bar){bar=document.createElement('div');bar.id='avVs';bar.className='pz av-vsbar';document.body.appendChild(bar)}
  bar.innerHTML=vsHTML(n.name,'<button type="button" class="pz-link" id="avGiveUp">Rendirme</button>');vsPaint(bar,face(n));
  bar.querySelector('#avGiveUp').onclick=()=>{const p=st.pend;if(!p)return;st.pend=null;aiBack(p);hurt(base(p.c)*.6);const dead=st.hp<=0;if(!dead){st.note='Te rendiste en la partida.';save()}leaveArcade().then(()=>{if(dead){open();faint('Te rendiste sin fuerzas.')}else open()})};
 }
 function arenaOff(){document.body.classList.remove('av-battle');const b=document.getElementById('avVs');if(b)b.remove()}
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 async function leaveArcade(){   // sale de la partida y del arcade (un toque vuelve a la lista de juegos y otro al inicio, como js/tabbar.js)
  const scr=document.getElementById('miniGamesScreen'),bk=document.getElementById('gamesBackHome');
  for(let k=0;k<4&&scr&&bk&&!scr.classList.contains('hidden');k++){bk.click();await wait(140);const ex=[...document.querySelectorAll('button')].filter(x=>x.offsetParent&&!x.closest('#avVs')).find(x=>/^salir$/i.test(x.textContent.trim()));if(ex){ex.click();await wait(140)}}
  arenaOff();
 }
 function launch(g){
  const scr=document.getElementById('miniGamesScreen');if(scr&&scr.classList.contains('hidden')){const o=document.getElementById('openMiniGames');if(o)o.click()}
  setTimeout(()=>{const b=document.querySelector('#miniGamesScreen [data-game="'+g+'"]');if(b)b.click();
   let n=0;const t=setInterval(()=>{const st2=[...document.querySelectorAll('#miniGamesScreen .mode-picker button')].find(x=>/contra la máquina/i.test(x.textContent));if(st2){st2.click();clearInterval(t)}else if(++n>20)clearInterval(t)},150)},380);   // entra directo contra la máquina (el selector de modo queda oculto en body.av-battle)
 }
 function playGame(n){
  let prev='';try{prev=localStorage.getItem('sudomi-ai-level')||''}catch(_){}
  const c=M.c;st.pend={id:n.id,g:n.what,prev,c,sealed:n.sealed?1:0,boss:n.boss?1:0,hidden:n.hidden?1:0,name:n.name,look:n.look};if(M.type!=='h'){st.x=pl.x;st.y=pl.y}save();
  try{localStorage.setItem('sudomi-ai-level',CITIES[c].ai)}catch(_){}
  api.close();arena(n);launch(n.what);
 }
 const aiBack=p=>{try{if(p.prev)localStorage.setItem('sudomi-ai-level',p.prev);else localStorage.removeItem('sudomi-ai-level')}catch(_){}};
 const pendFoe=p=>({id:p.id,name:p.name,look:p.look,sealed:p.sealed,boss:p.boss,type:'g',what:p.g});
 // qué tan mal se perdió: de 0.6 (por poco) a 2 (paliza), según el marcador que el juego tiene en pantalla al terminar.
 // Memoria, Puntos y cajas y los demás juegos sencillos: las fichas de jugador (.arc-chip p0 = tú, p1 = la máquina). Dominó: .dm-score. Escoba: .es-score.
 // Si el juego no enseña marcador (Batalla naval, DOS, Blackjack), el daño es el normal.
 function severity(){
  try{
   const scr=document.getElementById('miniGamesScreen'),num=s=>{const e=scr.querySelector(s),m=e&&e.textContent.match(/\d+/);return m?+m[0]:NaN};
   let a=num('.arc-chip.p0 small'),b=num('.arc-chip.p1 small');
   const dm=scr.querySelector('.dm-score'),es=scr.querySelector('.es-score'),t=dm?dm.textContent.match(/(\d+)\D+meta\D+\d+\D+(\d+)/):es?es.textContent.match(/J1\D*(\d+)\D+J2\D*(\d+)/):null;
   if(t){a=+t[1];b=+t[2]}
   if(!Number.isNaN(a)&&!Number.isNaN(b)&&b>a)return Math.min(2,.6+1.4*(b-a)/b);
  }catch(_){}
  return 1;
 }
 window.addEventListener('sudomi-arcade',e=>{
  st=rd();const p=st&&st.pend,d=e.detail||{};if(!p||d.game!==p.g)return;
  const n=pendFoe(p);st.pend=null;aiBack(p);M=place(p.c*2);let dead=false;
  if(d.won)win(n);
  else{const s=severity(),h=hurt(base(p.c)*s);st.note=`<b>Perdiste contra ${nm(n.name)}</b>${s>1.3?' por mucho':s<.9?' por poco':''}: −${h} de vida. Puedes volver a intentarlo.`;save();dead=st.hp<=0}
  setTimeout(()=>leaveArcade().then(()=>{open();if(dead)faint(`Perdiste contra ${nm(n.name)} y te quedaste sin fuerzas.`)}),2400);
 });
 function pending(){
  const p=st.pend,n=pendFoe(p);M=place(st.p);
  body.innerHTML=`<div class="av-col">${vsHTML(n.name)}<article class="pz-page"><p class="pz-src">Reto en curso</p><h3>${n.name} te espera</h3><p class="pz-q">Tienes pendiente una partida de ${GAMES[p.g]}. Al terminarla vuelves aquí con el resultado.</p></article>
  <button type="button" class="pz-btn sy-big" id="avPlay">Ir a la partida</button><button type="button" class="pz-link sy-quit" id="avDrop">Retirarme (−${hit(base(p.c)*.6)} de vida)</button></div>`;
  vsPaint(body,face(n));
  body.querySelector('#avPlay').onclick=()=>{api.close();arena(n);const scr=document.getElementById('miniGamesScreen');if(!scr||scr.classList.contains('hidden')||!scr.querySelector('#miniGameStage')||scr.querySelector('#miniGameStage').classList.contains('hidden'))launch(p.g)};
  body.querySelector('#avDrop').onclick=()=>{st.pend=null;aiBack(p);hurt(base(p.c)*.6);if(st.hp<=0)return faint();st.note='Te retiraste de la partida.';save();enter()};
 }
 // ---- combate por turnos contra un monstruo. Antes de que elijas, el enemigo enseña lo que va a hacer (POSTURA): pegar sin mirar se paga.
 //      Animaciones (css/main.css): entrada (.intro), ataque (.me-atk / .foe-atk), golpe recibido (.me-hit / .foe-hit),
 //      el número de daño que sube (.av-dmg) y, al ganar, la pantalla del botín (.av-loot).
 const stance=()=>{if(F.charged){F.charged=false;return 'embiste'}const L=MOBS[F.mb.kind][6];let s=L[Math.floor(Math.random()*L.length)];if(s==='carga'&&F.last==='embiste')s='ataque';return s};
 function fight(mb){
  mode='fight';cancelAnimationFrame(raf);const D=MOBS[mb.kind],B=mb.boss?1:0,nm0=D[0]+(B?' colosal':'');st.x=pl.x;st.y=pl.y;save();
  F={mb,boss:B,name:nm0,hp:D[3]*(B?3:1),max:D[3]*(B?3:1),dmg:D[4]*(B?2:1),xp:D[5]*(B?3:1),en:4,shield:false,burn:0,stun:false,charged:false,last:'',st:'ataque',log:B?`<b>¡Un jefe!</b> ${unM(nm0)} te corta el paso: el triple de vida y pega el doble.`:`¡${unM(D[0])} te corta el paso!`,busy:true};F.st=stance();snd(B?'roar':'whack');drawFight('intro');
  setTimeout(()=>{if(F&&F.mb===mb){F.busy=false;drawFight()}},950);
 }
 const TIPO={f:'físico',m:'mágico',d:'apoyo'};
 function drawFight(fx,dm){
  const pg=pages(),A=atk(),cls=fx==='intro'?'intro':fx==='fx-foe'?'foe-atk me-hit':fx==='fx-apoyo'?'me-cast':fx==='fx-rebote'?'me-atk me-hit':fx?'me-atk foe-hit':'',P0=POSTURA[F.st];dm=dm||{};
  body.innerHTML=`<div class="av-col av-fight">${fx==='intro'?'<div class="av-flash" aria-hidden="true"><b>!</b></div>':''}${vsHTML(F.name,`<span class="av-hp foe"><i style="width:${Math.round(F.hp/F.max*100)}%"></i><em>${F.hp} / ${F.max}</em></span>`,cls,dm.me,dm.foe)}
  <div class="av-ring ${fx&&fx!=='intro'?fx:''}"><i class="av-fx"></i></div><p class="av-log" aria-live="polite">${F.log}</p>
  <p class="av-intent s-${F.st}"><em>${P0[0]}</em><span><b>${elM(F.name)} ${P0[1]}.</b><small>${P0[2]}</small></span></p>
  <p class="av-en" aria-label="Energía ${F.en} de 10">Energía ${'●'.repeat(F.en)}${'○'.repeat(10-F.en)}</p>
  <div class="av-acts">${PODERES.map(q=>pg>=q[2]?`<button type="button" class="pz-btn t-${q[6]}" data-p="${q[0]}" ${F.en<q[3]||F.busy?'disabled':''}>${q[1]}<small>${TIPO[q[6]]} · ${q[3]?q[3]+' de energía':'gratis'}${q[4]?' · '+Math.round(A*q[4])+' de daño':''}</small></button>`:`<button type="button" class="pz-btn lock" disabled>🔒 ${q[2]} páginas<small>${q[1]}</small></button>`).join('')}</div>
  <div class="pz-row av-items">${['hierba','pocion'].map(k=>`<button type="button" class="pz-link" data-i="${k}" ${!st.inv[k]||F.busy||st.hp>=maxHp()?'disabled':''}>${ITEMS[k][0]} ${ITEMS[k][1]} × ${st.inv[k]}</button>`).join('')}<button type="button" class="pz-link" id="avRun" ${F.busy?'disabled':''}>Huir</button></div></div>`;
  vsPaint(body,{mob:F.mb.kind,boss:F.boss});if(F.boss)body.querySelector('.av-fight').classList.add('boss');
  body.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>turn(b.dataset.p));
  body.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{const k=b.dataset.i;st.inv[k]--;const h=k==='hierba'?20:50;st.hp=Math.min(maxHp(),st.hp+h);save();snd('glug');F.log=`Usaste ${ITEMS[k][1].toLowerCase()}: +${h} de vida.`;foeTurn()});
  body.querySelector('#avRun').onclick=()=>{if(Math.random()<.55){st.note='Lograste escapar.';save();pl=null;const m=place(st.p);st.x=Math.max(2,st.x-2);if(solidAt(m,st.x,st.y)){st.x=m.L.x;st.y=m.L.y}enter()}else{F.log='No lograste escapar.';foeTurn()}};
 }
 const dead=()=>{if(st.hp>0)return false;const nmb=F.name;F=null;faint(`${elM(nmb)} te venció.`);return true};
 function turn(key){
  if(F.busy)return;const q=PODERES.find(x=>x[0]===key);if(F.en<q[3])return;F.en-=q[3];F.busy=true;const next=()=>setTimeout(()=>{if(!F)return;if(F.hp<=0)return victory();foeTurn()},780);
  if(q[6]==='d'){   // apoyo: no hace daño
   if(key==='foco'){F.en=Math.min(10,F.en+4);F.log='Te concentras: +4 de energía.';snd('hint');drawFight('fx-apoyo')}
   else if(key==='escudo'){F.shield=true;st.hp=Math.min(maxHp(),st.hp+8);save();snd('hint');F.log='Levantaste el escudo de luz: +8 de vida.';drawFight('fx-apoyo',{me:'+8'})}
   else{st.hp=Math.min(maxHp(),st.hp+30);save();snd('glug');F.log='Curación: +30 de vida.';drawFight('fx-apoyo',{me:'+30'})}
   return next()}
  let d=Math.round(atk()*q[4]*(.85+Math.random()*.3));
  if(q[6]==='m'&&F.st==='reflejo'){   // la magia rebota
   const h=hurt(d*.5);F.log=`${q[1]} rebota en el espejo: −${h} de vida para ti y nada para ${fem(F.name)?'ella':'él'}.`;drawFight('fx-rebote',{me:'−'+h,foe:'0'});if(dead())return;return next()}
  if(q[6]==='f'&&F.st==='esquiva'){
   if(key==='tajo'){d=Math.round(d*.5);F.log=`Tajo doble: el primero falla, el segundo acierta. ${d} de daño.`}
   else if(Math.random()<.65){F.log=`${q[1]}: ¡fallaste! Se movió antes.`;snd('swish');drawFight('fx-'+key,{foe:'falla'});return next()}
   else F.log=`${q[1]}: ${d} de daño, de milagro.`}
  else if(q[6]==='f'&&F.st==='guardia'){   // contra la guardia: casi nada, y te lo devuelve
   d=Math.max(1,Math.round(d*.3));F.hp=Math.max(0,F.hp-d);const h=hurt(F.dmg*.6);F.log=`${q[1]} choca con su guardia: solo ${d} de daño, y te lo devuelve: −${h} de vida.`;snd('clack');drawFight('fx-'+key,{foe:'−'+d,me:'−'+h});if(dead())return;return next()}
  else F.log=`${q[1]}: ${d} de daño.`;
  F.hp=Math.max(0,F.hp-d);if(key==='fuego')F.burn=2;if(key==='rayo'&&F.hp>0){F.stun=true;F.log+=' Queda aturdido.'}
  snd(key==='golpe'||key==='tajo'?'whack':key==='espada'?'slash':'boom');drawFight('fx-'+key,{foe:'−'+d});next();
 }
 function foeTurn(){
  if(F.burn>0){F.burn--;const b=Math.round(atk()*.5);F.hp=Math.max(0,F.hp-b);F.log+=` El fuego le quita ${b}.`;if(F.hp<=0)return victory()}
  const s=F.st;let h=0;F.last=s;
  if(F.stun){F.stun=false;F.charged=false;F.log+=` ${elM(F.name)} está aturdido y pierde el turno.`}
  else if(s==='carga'){F.charged=true;F.log+=` ${elM(F.name)} toma impulso…`}
  else if(s==='guardia')F.log+=` ${elM(F.name)} sigue en guardia.`;
  else{let d=F.dmg*(s==='embiste'?2.2:s==='reflejo'?.6:s==='esquiva'?.8:1)*(.85+Math.random()*.3);if(F.shield){d*=s==='embiste'?.25:.5;F.shield=false}h=hurt(d);F.log+=` ${elM(F.name)} ${s==='embiste'?'embiste':'te golpea'}: −${h} de vida.`}
  F.en=Math.min(10,F.en+2);F.busy=false;if(dead())return;
  F.st=stance();drawFight(h?'fx-foe':'',h?{me:'−'+h}:null);
 }
 // el final de la batalla: el monstruo se deshace y lo ganado aparece una cosa detrás de otra
 function victory(){
  const z=ci(st.p),B=F.boss,g=(5+Math.floor(Math.random()*10)*(z+1))*(B?3:1),r=Math.random(),L0=level(),got=[['✨',`+${F.xp} de experiencia`],['🪙',`+${g} de oro`]];st.gold+=g;
  if(B&&Math.random()<LEG_CHANCE){const id=LEG_IDS[Math.floor(Math.random()*LEG_IDS.length)];st.bag.push(id);st.legSeen=st.legSeen||{};st.legSeen[id]=1;got.push([id,gear(id).name+' · ¡LEGENDARIA!','rare legend']);setTimeout(()=>snd('achievement'),700)}
  else if(B){st.inv.pocion++;got.push(['🧪','Poción (premio del jefe)'])}
  if(r<.15){st.inv.sellada++;got.push(['📕','Página sellada','rare'])}
  else if(r<.20){const id=SLOTS[Math.floor(Math.random()*4)][0]+':s'+z;st.bag.push(id);got.push([id,gear(id).name+' · ropa especial','rare'])}
  else if(r<.25){const k=Math.random()<.5?'amuleto':'anillo';st.rare[k]++;got.push([RARE[k][0],RARE[k][1]+' · objeto raro','rare'])}
  else if(r<.35){st.inv.gema++;got.push(['💎','Gema'])}
  else if(r<.55){st.inv.pocion++;got.push(['🧪','Poción'])}
  else if(r<.9){st.inv.hierba++;got.push(['🌿','Hierba'])}
  const up=gain(F.xp),L1=level(),kind=F.mb.kind,name=F.name;M.mobs=M.mobs.filter(k=>k!==F.mb);save();snd('win');F=null;mode='loot';
  body.innerHTML=`<div class="av-col av-loot"><h3 class="av-win">¡Victoria!</h3><canvas class="av-dead" width="16" height="16"></canvas><p class="av-note">Venciste ${alM(name)}.</p>
  <ul class="av-won">${got.map((x,i)=>`<li class="${x[2]||''}" style="--d:${i}">${x[0].includes(':')?`<canvas width="16" height="16" data-ic="${x[0]}"></canvas>`:`<em>${x[0]}</em>`}<b>${x[1]}</b></li>`).join('')}</ul>
  <p class="av-xp"><span><i style="width:${L1.L>L0.L?0:Math.round(L0.cur/L0.need*100)}%"></i></span>Nivel ${L1.L} · ${L1.cur} / ${L1.need} de experiencia</p>${up?`<p class="pz-msg good av-up">${up}</p>`:''}
  <button type="button" class="pz-btn sy-big" id="avOk">Seguir</button></div>`;
  paint(body.querySelector('.av-dead'),{mob:kind,boss:B});icons(body);
  setTimeout(()=>{const b=body.querySelector('.av-loot .av-xp i');if(b)b.style.width=Math.round(L1.cur/L1.need*100)+'%'},120);
  body.querySelector('#avOk').onclick=()=>{pl=null;enter()};
 }
 // ---- casillas del inventario y de la tienda: la ropa se dibuja (icon()), lo demás es un emoji
 const cell=(id,cls,attrs,label,count)=>{const cloth=id.includes(':'),nmx=cloth?(id.startsWith('empty:')?'Vacío':gear(id).name):(ITEMS[id]||RARE[id])[1];
  return `<button type="button" class="av-cell ${cls||''}${cloth&&!id.startsWith('empty:')&&gear(id).special?' sp':''}${cloth&&!id.startsWith('empty:')&&gear(id).legend?' lg':''}" ${attrs||''} aria-label="${nmx}${count>1?' × '+count:''}">${cloth?`<canvas width="16" height="16" data-ic="${id}"></canvas>`:`<em>${(ITEMS[id]||RARE[id])[0]}</em>`}${label?`<small>${label}</small>`:''}${count>1?`<i class="av-n">${count}</i>`:''}</button>`};
 function icons(root){root.querySelectorAll('canvas[data-ic]').forEach(c=>{const id=c.dataset.ic,g=c.getContext('2d');if(id.startsWith('empty:'))icon(g,id.slice(6),'#00000026');else{const q=gear(id);icon(g,q.slot,q.color);
  if(q.legend){const C=LEG[q.set][2];g.fillStyle=C[2];g.fillRect(0,0,16,1);g.fillRect(0,15,16,1);g.fillRect(0,0,1,16);g.fillRect(15,0,1,16);g.fillStyle='#fff';g.fillRect(12,2,1,3);g.fillRect(11,3,3,1)}}})}
 const wear=id=>{const q=gear(id),old=st.armor[q.slot];st.armor[q.slot]=id;st.bag.splice(st.bag.indexOf(id),1);if(old)st.bag.push(old)};
 // ---- armería: se compra la ropa de esta ciudad y se vende la tuya a mitad de precio
 let pick=null;
 function shop(n,msg){
  mode='menu';cancelAnimationFrame(raf);const tier=M.c+1,L=level().L,gem=40*tier,buy=SLOTS.map(([k])=>k+':'+tier);
  let det='<p class="av-note">Toca una casilla para ver qué es.</p>';
  if(pick&&pick.t==='buy'){const q=gear(pick.id);det=`<p><b>${q.name}</b><br>Quita un ${q.def}% del daño · se puede llevar desde el nivel ${q.lvl}${L<q.lvl?' (te falta nivel)':''} · ${q.price} de oro</p><button type="button" class="pz-btn" id="avDo" ${st.gold<q.price?'disabled':''}>${st.gold<q.price?'No te alcanza':'Comprar'}</button>`}
  else if(pick&&pick.t==='sell'&&st.bag[pick.i]){const q=gear(st.bag[pick.i]);det=`<p><b>${q.name}</b>${q.special?' · ropa especial':''}<br>Quita un ${q.def}% del daño · nivel ${q.lvl} · te doy ${Math.floor(q.price/2)} de oro, la mitad de lo que vale</p><button type="button" class="pz-btn" id="avDo">Vender</button>`}
  else if(pick&&pick.t==='gem'&&st.inv.gema)det=`<p><b>Gema</b><br>Te doy ${gem} de oro por cada una.</p><button type="button" class="pz-btn" id="avDo">Vender una</button>`;
  body.innerHTML=`<div class="av-col"><div class="av-tabs"><b class="av-shopname">⚒️ ${n.name}</b><span class="av-note">🪙 ${st.gold} · nivel ${L}</span><button type="button" class="av-close" id="avBackMap">✕ Salir</button></div>
  <p class="av-note">«Ropa ${TIERS[tier][0]}. Lo que traigas, te lo compro a mitad de precio.»</p>
  <h3 class="sy-h">Comprar</h3><div class="av-grid">${buy.map(id=>cell(id,pick&&pick.t==='buy'&&pick.id===id?'on':'',`data-buy="${id}"`,gear(id).price+' 🪙')).join('')}</div>
  <h3 class="sy-h">Vender</h3>${st.bag.length||st.inv.gema?`<div class="av-grid">${st.bag.map((id,i)=>cell(id,pick&&pick.t==='sell'&&pick.i===i?'on':'',`data-sell="${i}"`,'+'+Math.floor(gear(id).price/2)+' 🪙')).join('')}${st.inv.gema?cell('gema',pick&&pick.t==='gem'?'on':'','data-gem="1"','+'+gem+' 🪙',st.inv.gema):''}</div>`:'<p class="av-note">No llevas nada para vender. La ropa que tienes puesta no se vende: quítatela primero en el inventario.</p>'}
  <div class="av-detail">${det}</div>${msg?`<p class="pz-msg good">${msg}</p>`:''}</div>`;
  icons(body);body.querySelector('#avBackMap').onclick=()=>{pick=null;back()};
  body.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>{pick={t:'buy',id:b.dataset.buy};snd('tap');shop(n)});
  body.querySelectorAll('[data-sell]').forEach(b=>b.onclick=()=>{pick={t:'sell',i:+b.dataset.sell};snd('tap');shop(n)});
  const gm=body.querySelector('[data-gem]');if(gm)gm.onclick=()=>{pick={t:'gem'};snd('tap');shop(n)};
  const go=body.querySelector('#avDo');if(go)go.onclick=()=>{snd('coin');
   if(pick.t==='buy'){const q=gear(pick.id),cur=gear(st.armor[q.slot]);st.gold-=q.price;st.bag.push(q.id);let m=`Compraste: ${q.name}.`;
    if(L>=q.lvl&&(!cur||cur.def<q.def)){wear(q.id);m+=' Te la pusiste.'}else if(L<q.lvl)m+=` Queda en el inventario hasta que llegues al nivel ${q.lvl}.`;save();return shop(n,m)}
   if(pick.t==='sell'){const q=gear(st.bag[pick.i]),v=Math.floor(q.price/2);st.bag.splice(pick.i,1);st.gold+=v;pick=null;save();return shop(n,`Vendiste: ${q.name}. +${v} de oro.`)}
   st.inv.gema--;st.gold+=gem;if(!st.inv.gema)pick=null;save();shop(n,`Vendiste una gema. +${gem} de oro.`)};
 }
 // ---- 0.3.95 (dueño): EL COLECCIONISTA, en cada posada. Enseña las 12 piezas legendarias, cuenta de dónde salen y cambia 3 de las tuyas por 1 al azar
 //      (una que aún no tengas, si te falta alguna). Solo cuentan las de la mochila: lo que llevas puesto no se cambia.
 let csel=[];
 function collector(n,msg){
  mode='menu';cancelAnimationFrame(raf);
  csel=csel.filter(i=>st.bag[i]&&gear(st.bag[i]).legend);
  const mine=st.bag.map((id,i)=>({id,i})).filter(x=>gear(x.id).legend),have=new Set([...st.bag,...Object.values(st.armor)].filter(id=>gear(id)&&gear(id).legend));
  body.innerHTML=`<div class="av-col"><div class="av-tabs"><b class="av-shopname">🏺 ${n.name}</b><span class="av-note">${have.size} de ${LEG_IDS.length}</span><button type="button" class="av-close" id="avBackMap">✕ Salir</button></div>
  <div class="av-collect"><canvas class="av-face" width="16" height="16"></canvas><p>«Cuentan los aldeanos que a veces aparece un monstruo muy fuerte, más grande que los demás y con una corona. Hace años logramos derrotar a algunos, y nos dejaron estas piezas que ves aquí. Tráeme tres de las tuyas y te cambio una al azar.»</p></div>
  ${LEG.map((L,k)=>`<h3 class="sy-h">Set ${L[3]}</h3><div class="av-grid lgset">${SLOTS.map(([s])=>{const id=s+':L'+k;return cell(id,have.has(id)?'got':'miss','','')}).join('')}</div>`).join('')}
  <p class="av-note">Las sueltan los <b>jefes</b> de las zonas, los monstruos con corona y resplandor rojo: tienen el triple de vida y pegan el doble. Al vencer a uno hay un ${Math.round(LEG_CHANCE*100)} % de que suelte una pieza. Cada pieza brilla, la coraza trae las alas y con las cuatro del mismo set sale el aura.</p>
  <h3 class="sy-h">Cambiar 3 por 1</h3>${mine.length?`<div class="av-grid">${mine.map(x=>cell(x.id,csel.includes(x.i)?'on':'',`data-c="${x.i}"`,'')).join('')}</div>`:'<p class="av-note">No llevas piezas legendarias en la mochila. Las que tienes puestas no se cambian: quítatelas primero en el inventario.</p>'}
  <button type="button" class="pz-btn" id="avSwap" ${csel.length===3?'':'disabled'}>Cambiar ${csel.length} de 3 por una al azar</button>${msg?`<p class="pz-msg good">${msg}</p>`:''}</div>`;
  paint(body.querySelector('.av-face'),face(n));icons(body);
  body.querySelector('#avBackMap').onclick=()=>{csel=[];back()};
  body.querySelectorAll('[data-c]').forEach(b=>b.onclick=()=>{const i=+b.dataset.c;csel=csel.includes(i)?csel.filter(x=>x!==i):csel.length<3?[...csel,i]:csel;snd('tap');collector(n)});
  body.querySelector('#avSwap').onclick=()=>{if(csel.length!==3)return;csel.sort((a,b)=>b-a).forEach(i=>st.bag.splice(i,1));csel=[];
   const own=new Set([...st.bag,...Object.values(st.armor)]),miss=LEG_IDS.filter(id=>!own.has(id)),pool=miss.length?miss:LEG_IDS,id=pool[Math.floor(Math.random()*pool.length)];
   st.bag.push(id);save();snd('achievement');collector(n,`El coleccionista te dio: <b>${gear(id).name}</b>.`)};
 }
 // ---- el menú: personaje, inventario, mapa, opciones
 let sel=null;
 function menu(t){
  if(mode==='map'){if(M.type!=='h'){st.x=pl.x;st.y=pl.y}save()}mode='menu';cancelAnimationFrame(raf);tab=t||tab;const L=level(),here=M,pg=pages();
  const tabs=[['yo','Personaje'],['cosas','Inventario'],['mapa','Mapa'],['mas','Opciones']];
  let h=`<div class="av-col"><div class="av-tabs" role="tablist">${tabs.map(([k,n])=>`<button type="button" role="tab" aria-selected="${k===tab}" class="${k===tab?'on':''}" data-t="${k}">${n}</button>`).join('')}<button type="button" class="av-close" id="avBackMap">✕ Volver</button></div>`;
  if(tab==='yo')h+=`<div class="av-gear"><canvas width="16" height="16"></canvas><div><h3 class="sy-h">${st.name} · nivel ${L.L}</h3><p class="av-xp"><span><i style="width:${Math.round(L.cur/L.need*100)}%"></i></span>${L.cur} / ${L.need} de experiencia</p>
   <p>Vida ${st.hp} / ${maxHp()} · Ataque ${atk()} · Protección ${def()}% · Páginas ${pg}</p><p class="av-note">El nivel sube al ganar experiencia y deja ponerse mejor ropa. Los poderes se abren al juntar páginas.</p></div></div>
   <h3 class="sy-h">Poderes</h3><ul class="av-pow">${PODERES.map(q=>`<li class="${pg>=q[2]?'':'lock'}"><b>${pg>=q[2]?q[1]:'🔒 '+q[1]}</b><small>${pg>=q[2]?q[5]+(q[3]?` Cuesta ${q[3]} de energía.`:''):`Se abre con ${q[2]} páginas. Llevas ${pg}.`}</small></li>`).join('')}</ul>`;
  if(tab==='cosas'){
   const stuff=Object.keys(ITEMS).filter(k=>st.inv[k]>0).map(k=>({t:'it',k,n:st.inv[k]})).concat(Object.keys(RARE).filter(k=>st.rare[k]>0).map(k=>({t:'ra',k,n:st.rare[k]})),st.bag.map((id,i)=>({t:'bag',i,id})));
   const same=(a,b)=>a&&b&&a.t===b.t&&a.k===b.k&&a.i===b.i,blanks=Math.max(0,15-stuff.length)+(5-(Math.max(15,stuff.length)%5))%5;
   let det='<p class="av-note">Toca una casilla para ver qué es y qué puedes hacer con ella.</p>';
   if(sel&&sel.t==='eq'&&st.armor[sel.k]){const q=gear(st.armor[sel.k]);det=`<p><b>${q.name}</b>${q.special?' · ropa especial':''} · puesta<br>Quita un ${q.def}% del daño.</p><button type="button" class="pz-btn" id="avDo">Quitármela</button>`}
   else if(sel&&sel.t==='bag'&&st.bag[sel.i]){const q=gear(st.bag[sel.i]);det=`<p><b>${q.name}</b>${q.legend?' · ¡LEGENDARIA! Solo la sueltan los jefes':q.special?' · ropa especial, solo la sueltan los monstruos':''}<br>Quita un ${q.def}% del daño · desde el nivel ${q.lvl} · la armería la compra por ${Math.floor(q.price/2)} de oro</p><button type="button" class="pz-btn" id="avDo" ${L.L<q.lvl?'disabled':''}>${L.L<q.lvl?'Te falta nivel '+q.lvl:'Ponérmela'}</button>`}
   else if(sel&&sel.t==='it'&&st.inv[sel.k]){const use=sel.k==='hierba'||sel.k==='pocion';det=`<p><b>${ITEMS[sel.k][1]} × ${st.inv[sel.k]}</b><br>${ITEMS[sel.k][2]}</p>${use?`<button type="button" class="pz-btn" id="avDo" ${st.hp>=maxHp()?'disabled':''}>${st.hp>=maxHp()?'Tienes toda la vida':'Usar'}</button>`:''}`}
   else if(sel&&sel.t==='ra'&&st.rare[sel.k])det=`<p><b>${RARE[sel.k][1]} × ${st.rare[sel.k]}</b> · objeto raro<br>${RARE[sel.k][2]}</p>`;
   h+=`<p class="av-note">Vida ${st.hp} / ${maxHp()} · 🪙 ${st.gold} · Protección ${def()}% · nivel ${L.L}</p>
   <h3 class="sy-h">Puesto</h3><div class="av-grid eq">${SLOTS.map(([k,name])=>cell(st.armor[k]||'empty:'+k,same(sel,{t:'eq',k})?'on':'',`data-eq="${k}"`,name)).join('')}</div>
   <h3 class="sy-h">Mochila</h3><div class="av-grid">${stuff.map(o=>cell(o.t==='bag'?o.id:o.k,same(sel,o)?'on':'',`data-s='${JSON.stringify(o)}'`,'',o.n)).join('')}${'<span class="av-cell void"></span>'.repeat(blanks)}</div>
   <div class="av-detail">${det}</div>`}
  if(tab==='mapa'){const list=CITIES.map((C,i)=>{const seen=st.seen[i*2],left=[];if(seen){[0,1].forEach(k=>{if(!st.done[i+'-'+k])left.push(`${C.m[k][0].split(',')[0]} (en la calle, con «!»)`)});const hid=[2,3].filter(k=>!st.done[i+'-'+k]).length;if(hid)left.push(`${hid} dentro de casas (puertas marcadas en naranja)`)}
     return `<li class="${st.boss[i]?'done':''}"><b>${seen?C.name:'???'}</b><small>${!seen?'Aún no llegas.':`Páginas: ${pagesIn(i)} · Jefe: ${st.boss[i]?'vencido':pagesIn(i)>=NEED?'te espera':'pide '+NEED}${left.length?'<br>Faltan: '+left.join('; '):'<br>No falta ninguna página de la ciudad.'}`}</small>${seen&&i*2!==st.p?`<button type="button" class="pz-link" data-go="${i*2}">Viajar</button>`:''}</li>`}).join('');
   h+=`<h3 class="sy-h">${here.type==='h'?place(st.p).name:here.name}</h3><canvas class="av-mini" aria-label="Mapa del lugar"></canvas>
   <p class="av-key"><i style="background:#fff"></i>tú<i style="background:#ffd84a"></i>página en la calle<i style="background:#ff8a2b"></i>casa con página<i style="background:#e0342c"></i>jefe<i style="background:#ff7ad1"></i>descifradora<i style="background:#5b8cff"></i>armería<i style="background:#35c46a"></i>posada${here.type==='z'?'<i style="background:#b000ff"></i>monstruo':''}</p>
   <h3 class="sy-h">Ciudades</h3><ul class="av-places">${list}</ul>${st.inv.sellada?`<p class="av-note">Llevas ${st.inv.sellada} página${st.inv.sellada>1?'s':''} sellada${st.inv.sellada>1?'s':''}: llévala${st.inv.sellada>1?'s':''} a la descifradora de cualquier ciudad.</p>`:''}`}
  if(tab==='mas')h+=`<div class="sy-doors"><button type="button" class="sy-door" id="avQuick"><em>🗺️</em><span><b>Viaje rápido</b><i>El modo historia anterior, sin caminar.</i></span></button><button type="button" class="sy-door" id="avExit"><em>🚪</em><span><b>Salir del juego</b><i>Tu aventura queda guardada.</i></span></button><button type="button" class="sy-door k-juego" id="avNew"><em>🗑️</em><span><b>Empezar de cero</b><i>Borra esta aventura. No se puede deshacer.</i></span></button></div><p class="av-note" id="avSure"></p>`;
  body.innerHTML=h+'</div>';body.scrollTop=0;icons(body);
  body.querySelectorAll('[data-t]').forEach(b=>b.onclick=()=>{sel=null;menu(b.dataset.t)});body.querySelector('#avBackMap').onclick=()=>{sel=null;back()};
  if(tab==='yo')paint(body.querySelector('.av-gear canvas'),{hero:1});
  if(tab==='cosas'){
   body.querySelectorAll('[data-eq]').forEach(b=>b.onclick=()=>{sel={t:'eq',k:b.dataset.eq};snd('tap');menu('cosas')});
   body.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{sel=JSON.parse(b.dataset.s);snd('tap');menu('cosas')});
   const go=body.querySelector('#avDo');if(go)go.onclick=()=>{
    if(sel.t==='eq'){st.bag.push(st.armor[sel.k]);st.armor[sel.k]='';sel=null;snd('pop')}
    else if(sel.t==='bag'){wear(st.bag[sel.i]);sel=null;snd('clack')}
    else{st.inv[sel.k]--;st.hp=Math.min(maxHp(),st.hp+(sel.k==='hierba'?20:50));snd('glug')}
    save();menu('cosas')}}
  body.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{st.p=+b.dataset.go;const m=place(st.p);st.x=m.L.x;st.y=m.L.y;save();pl=null;M=m;enter()});
  if(tab==='mapa')mini(body.querySelector('.av-mini'));
  if(tab==='mas'){body.querySelector('#avQuick').onclick=()=>{api.close();window.SudomiStory&&SudomiStory.open()};body.querySelector('#avExit').onclick=()=>api.close();
   let sure=false;body.querySelector('#avNew').onclick=()=>{if(!sure){sure=true;body.querySelector('#avSure').textContent='Toca otra vez «Empezar de cero» para confirmar. Se pierde todo: nivel, ropa y páginas.';return}try{localStorage.removeItem(KEY)}catch(_){}st=null;pl=null;create()}}
 }
 // el mapa pequeño: cada casilla un cuadrito, y encima dónde está cada cosa
 function mini(c){
  const m=place(st.p),s=6;c.width=m.w*s;c.height=m.h*s;const g=c.getContext('2d'),COL={[G]:m.th.g,[R]:m.th.r,[ST]:'#c3bead',[W]:'#3f7fc4',[TR]:'#2f6b2f',[RF]:'#8a4a36',[WL]:'#d8cfb6',[DR]:'#5a3d22',[FL]:m.th.g,[BR]:'#9b6b3a',[DK]:'#9b6b3a',[FE]:m.th.g2,[SL]:'#c0392b',[FO]:'#86b8ea',[BT]:'#7c5229',[CW]:'#6f6b60',[GA]:'#e2b93b',[RK]:'#8e8a7d',[BU]:'#3f8a3a'};
  for(let y=0;y<m.h;y++)for(let x=0;x<m.w;x++){g.fillStyle=COL[m.m[m.at(x,y)]]||'#000';g.fillRect(x*s,y*s,s,s)}
  const dot=(x,y,col)=>{g.fillStyle='#15120e';g.fillRect(x*s-2,y*s-2,s+4,s+4);g.fillStyle=col;g.fillRect(x*s-1,y*s-1,s+2,s+2)};
  if(m.type==='c'){m.doors.forEach(d=>{if(d.what==='shop')dot(d.x,d.y,'#5b8cff');else if(d.what==='inn')dot(d.x,d.y,'#35c46a');else if((d.what==='m2'&&!st.done[m.c+'-2'])||(d.what==='m3'&&!st.done[m.c+'-3']))dot(d.x,d.y,'#ff8a2b')});
   m.npcs.forEach(n=>{if(n.boss){if(!st.boss[m.c])dot(n.x,n.y,'#e0342c')}else if(n.scribe)dot(n.x,n.y,'#ff7ad1');else if(!st.done[n.id])dot(n.x,n.y,'#ffd84a')})}
  else m.mobs.forEach(k=>dot(k.x,k.y,'#b000ff'));
  dot(st.x,st.y,'#fff');
 }
 // ---- puertas de la ciudad y de las casas
 function leave(){const d=M.door;snd('pop');pl=null;enter()}
 function gate(x){
  const p=st.p,bk=()=>{pl.x+=x?-1:1;pl.px=pl.x*T;pl.path=[];last=performance.now();raf=requestAnimationFrame(loop)};
  if(!x){if(!p){say(null,'Por aquí se vuelve a casa. Todavía no: faltan páginas.');return bk()}st.p=p-1;const m=place(st.p);st.x=m.Rr.x;st.y=m.Rr.y;if(m.type==='z')m.mobs=[];save();snd('swish');pl=null;return enter()}
  if(isCity(p)&&!st.boss[ci(p)]){say(lookOf(77),`El guardia: «La puerta del este no se abre hasta que ${nm(CITIES[ci(p)].boss[0])} lo diga.»`);return bk()}
  if(p>=LAST)return bk();
  st.p=p+1;const m=place(st.p);st.x=m.L.x;st.y=m.L.y;if(m.type==='z')m.mobs=[];if(isCity(st.p))st.home=st.p;save();snd('swish');pl=null;enter();   // si te desmayas, despiertas en la última ciudad a la que llegaste
 }
 function boot(){
  const dd=document.getElementById('homeDropdown'),b=document.getElementById('openStory'),h=document.getElementById('homeStory');
  if(b)b.onclick=()=>{if(dd)dd.classList.add('hidden');const t=document.getElementById('homeMenuBtn');if(t)t.setAttribute('aria-expanded','false');open()};
  if(h)h.onclick=()=>open();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
 window.SudomiAdventure={open,state:()=>rd(),_place:place,_set:v=>{try{v?localStorage.setItem(KEY,JSON.stringify(v)):localStorage.removeItem(KEY)}catch(_){}},cities:CITIES,zones:ZONES,_solid:solidAt,_tap:(x,y)=>tap(x,y),_pos:()=>pl&&{x:pl.x,y:pl.y,moving:pl.path.length,mode,map:M&&M.key},_map:()=>M,_fight:()=>F,_menu:menu,
  _tick:ms=>{for(let t=0;t<ms&&mode==='map'&&pl;t+=40)if(!update(40,performance.now()+t))break;if(mode==='map'&&cv&&cv.isConnected)draw()}};
})();
