/* SUDOMI 0.3.87 — «Acertijos»: los problemas de Alcuino de York (Propositiones ad acuendos juvenes, hacia el año 800), rehechos,
 * y otros clásicos antiguos (Diofanto, Sun Tzu, Fibonacci, Bhaskara, Tartaglia, Euler, Lucas…).
 * Rehechos quiere decir: el cuento es el de Alcuino, pero el texto es nuevo y en varios los números se cambiaron para que la respuesta
 * sea exacta y no dependa de las medidas ni de las aproximaciones de la época (cada explicación lo dice cuando pasa).
 *   LIST: cada acertijo = {id, n (número en Alcuino, 0 = otro autor), c (grupo), d (dificultad 1–3), t (título), q (texto), k (tipo), …, h (pistas), s (explicación)}
 *   Tipos (k): num · multi (varias casillas; `ok` acepta cualquier respuesta válida) · choice · grid (tabla de reparto) ·
 *              river (cruzar el río) · jugs (jarras) · hanoi · queens · magic (cuadrado mágico)
 *   mount(host, p, {onSolve, onError}) dibuja un acertijo dentro de cualquier caja: lo usan esta pantalla y el modo historia (js/story.js).
 * Premios: la primera vez que se resuelve da monedas y XP (10 × dificultad). Estrellas: 3, menos una por pista y otra si hubo 3 fallos o más.
 * Guardado: localStorage['sudomi-puzzles'] = {done:{id:estrellas}}. */
(()=>{
 const S=window.SudomiScreen;if(!S)return;
 const KEY='sudomi-puzzles';
 const rd=()=>{try{const v=JSON.parse(localStorage.getItem(KEY));return v&&v.done?v:{done:{}}}catch(_){return {done:{}}}};
 const wr=v=>{try{localStorage.setItem(KEY,JSON.stringify(v))}catch(_){}};
 const snd=n=>{try{window.SudomiSound&&SudomiSound.play(n)}catch(_){}};
 const sum=a=>a.reduce((x,y)=>x+y,0),pos=v=>v.every(x=>Number.isInteger(x)&&x>=1);
 const ROMAN=n=>{let s='';[[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']].forEach(([v,r])=>{while(n>=v){s+=r;n-=v}});return s};
 const CATS=[['cuentas','Cuentas de cabeza','Se resuelven pensando al revés o con una cuenta corta.'],['reparto','Repartos','Hay que repartir justo. Algunos tienen más de una respuesta buena.'],
  ['rio','Cruzar el río','Una barca pequeña y gente que no puede quedarse sola.'],['trampa','Con trampa','Lee despacio: la respuesta no es la que parece.'],
  ['campo','Campos y ciudades','Medir terrenos como se hacía antes.'],['manos','Para mover','Jarras, discos, reinas y números: se resuelven tocando.'],['rompe','Rompecabezas','Piezas que se deslizan hasta formar la imagen. De 5 a 24 piezas.'],['ilus','Rompecabezas ilustrados','Paisajes de colores y personajes de estilo anime, en 3 × 3 y 4 × 4.'],['mundo','De otros maestros','Clásicos de Grecia, China, la India, Egipto y Europa.']];
 // ---- cruzar el río: quién viaja y qué no se puede dejar junto. bad(grupo) devuelve el motivo o ''
 const RIVER={
  lobo:{cap:2,items:[['g','🧑‍🌾','Granjero',1,1],['l','🐺','Lobo'],['c','🐐','Cabra'],['r','🥬','Repollo']],
   bad:s=>s.has('g')?'':s.has('l')&&s.has('c')?'El lobo se quedó solo con la cabra.':s.has('c')&&s.has('r')?'La cabra se quedó sola con el repollo.':''},
  parejas:{cap:2,items:[['h1','🤵','Hermano rojo',1,1,'#d0342c'],['m1','👩‍🦰','Hermana roja',1,1,'#d0342c'],['h2','👨‍🦱','Hermano azul',1,1,'#1f5fd0'],['m2','👩‍🦱','Hermana azul',1,1,'#1f5fd0'],['h3','👴','Hermano verde',1,1,'#1f8a3a'],['m3','👵','Hermana verde',1,1,'#1f8a3a']],
   bad:s=>{for(const i of [1,2,3]){if(s.has('m'+i)&&!s.has('h'+i)&&[1,2,3].some(j=>j!==i&&s.has('h'+j)))return 'Una hermana quedó con otros hombres sin su hermano.'}return ''}},
  familia:{capW:2,items:[['p','👨','Padre',2,1],['m','👩','Madre',2,1],['a','👦','Niño',1,1],['b','👧','Niña',1,1]],bad:()=>''},
  erizos:{capW:2,items:[['p','🦔','Erizo',2,1],['m','🦔','Eriza',2,1],['a','🐹','Hijito',1,1],['b','🐹','Hijito',1,1]],bad:()=>''}
 };
 const A=(n,c,d,t,q,k,x,h,s)=>({id:'a'+n,n:parseInt(n),c,d,t,q,k,...x,h,s});
 const O=(i,c,d,t,who,q,k,x,h,s)=>({id:'o'+i,n:0,who,c,d,t,q,k,...x,h,s});
 const Z=(id,t,who,d,cols,rows,img,w,hh)=>({id,n:0,who,c:'rompe',d,t,k:'slide',cols,rows,img,w,hh,
  q:img==='quince'?'Ordena las fichas del 1 al 15, de izquierda a derecha y de arriba abajo, con el hueco al final. Toca una ficha que esté en la misma fila o columna que el hueco.':'Desliza las piezas hasta formar la imagen de arriba. Toca una pieza que esté en la misma fila o columna que el hueco.',
  h:['Arma primero la fila de arriba y después la columna de la izquierda. Lo que ya está en su sitio no se vuelve a tocar.','Lo que queda al final se resuelve girando las piezas alrededor del hueco.'],s:'Imagen completa. El hueco queda siempre abajo a la derecha.'});
 // las imágenes de los rompecabezas, dibujadas aquí mismo (SVG) y convertidas en una dirección de imagen
 const SVGI=(w,h,b)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">${b}</svg>`,FNT=`font-family="Impact,'Arial Black',sans-serif"`,cacheI={};
 const IMGS={
  playa:()=>SVGI(300,200,`<rect width="300" height="200" fill="#59c2f0"/><circle cx="238" cy="46" r="27" fill="#ffd84a" stroke="#f4a81f" stroke-width="5"/><ellipse cx="70" cy="40" rx="34" ry="13" fill="#fff"/><ellipse cx="98" cy="50" rx="26" ry="10" fill="#fff"/><rect y="108" width="300" height="46" fill="#1f7fd0"/><path d="M0 120 q25 -9 50 0 t50 0 t50 0 t50 0 t50 0 t50 0" stroke="#bfe6ff" stroke-width="4" fill="none"/><path d="M0 138 q25 -9 50 0 t50 0 t50 0 t50 0 t50 0 t50 0" stroke="#8fd0ff" stroke-width="3" fill="none"/><path d="M168 112 h64 l-12 16 h-40 z" fill="#c0392b" stroke="#111" stroke-width="3"/><path d="M200 58 v50 h32 z" fill="#fff" stroke="#111" stroke-width="3"/><path d="M0 152 Q150 128 300 152 V200 H0 Z" fill="#f2d59a"/><path d="M62 178 Q70 122 92 86" stroke="#8a5a2b" stroke-width="11" fill="none" stroke-linecap="round"/><g fill="#2f9a4a" stroke="#1c6b31" stroke-width="3"><path d="M92 86 q-44 -30 -70 4 q38 -14 70 -4 z"/><path d="M92 86 q-18 -50 -58 -44 q40 8 58 44 z"/><path d="M92 86 q20 -48 60 -38 q-42 6 -60 38 z"/><path d="M92 86 q46 -22 68 14 q-36 -18 -68 -14 z"/></g><circle cx="90" cy="92" r="6" fill="#7a4a1f"/><circle cx="100" cy="94" r="6" fill="#7a4a1f"/><path d="M236 176 l5 -12 l5 12 l12 1 l-9 8 l3 12 l-11 -7 l-11 7 l3 -12 l-9 -8 z" fill="#ff6b5a" stroke="#111" stroke-width="2"/><ellipse cx="150" cy="180" rx="10" ry="5" fill="#e0b56a"/>`),
  quiero:()=>SVGI(300,300,`<rect width="300" height="300" fill="#fff"/><g fill="#ffd1dc"><path d="M40 40 c-14 -18 -34 2 -18 18 l18 16 l18 -16 c16 -16 -4 -36 -18 -18 z"/><path d="M262 250 c-14 -18 -34 2 -18 18 l18 16 l18 -16 c16 -16 -4 -36 -18 -18 z"/></g><g ${FNT} fill="#e0342c" stroke="#111" stroke-width="6" paint-order="stroke" text-anchor="middle" stroke-linejoin="round"><text x="150" y="98" font-size="96">TE</text><text x="150" y="190" font-size="84" textLength="262" lengthAdjust="spacingAndGlyphs">QUIERO</text><text x="150" y="280" font-size="84" textLength="250" lengthAdjust="spacingAndGlyphs">MUCHO</text></g>`),
  caracol:()=>window.SudomiPuzzleArt?SudomiPuzzleArt.standalone('a1','El caracol'):SVGI(160,100,'<rect width="160" height="100" fill="#ddd"/>'),
  quince:()=>{let b='<rect width="300" height="300" fill="#3a2a1a"/>';for(let i=0;i<16;i++){const x=i%4*75,y=Math.floor(i/4)*75;b+=i<15?`<rect x="${x+2}" y="${y+2}" width="71" height="71" rx="8" fill="${(i+Math.floor(i/4))%2?'#e9b96e':'#f4d69a'}" stroke="#8a5a2b" stroke-width="3"/><text x="${x+37.5}" y="${y+53}" font-size="44" ${FNT} fill="#3a2a1a" text-anchor="middle">${i+1}</text>`:`<rect x="${x+2}" y="${y+2}" width="71" height="71" rx="8" fill="#5a3d22"/>`}return SVGI(300,300,b)},
  castillo:()=>SVGI(300,300,`<defs><linearGradient id="n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0c1436"/><stop offset="1" stop-color="#3a4f9a"/></linearGradient></defs><rect width="300" height="300" fill="url(#n)"/><circle cx="232" cy="62" r="30" fill="#fff3b0"/><circle cx="220" cy="54" r="6" fill="#e6d68a"/><circle cx="242" cy="72" r="4" fill="#e6d68a"/><g fill="#fff">${[[30,30],[70,60],[110,24],[150,70],[180,36],[280,120],[20,110],[60,140],[270,24],[130,110]].map(([x,y],i)=>`<circle cx="${x}" cy="${y}" r="${i%3?1.6:2.6}"/>`).join('')}</g><path d="M0 250 Q80 200 150 236 T300 226 V300 H0 Z" fill="#17306a"/><g fill="#14142a" stroke="#0a0a18" stroke-width="2"><rect x="60" y="150" width="46" height="110"/><rect x="194" y="150" width="46" height="110"/><rect x="100" y="182" width="100" height="78"/><rect x="128" y="112" width="44" height="80"/><path d="M56 150 v-14 h10 v8 h8 v-8 h10 v8 h8 v-8 h10 v14 z"/><path d="M190 150 v-14 h10 v8 h8 v-8 h10 v8 h8 v-8 h10 v14 z"/><path d="M124 112 v-14 h10 v8 h8 v-8 h8 v8 h8 v-8 h10 v14 z"/></g><path d="M150 98 v-34" stroke="#0a0a18" stroke-width="3"/><path d="M150 64 l26 8 l-26 8 z" fill="#e0342c"/><g fill="#ffd84a"><rect x="76" y="170" width="12" height="18" rx="6"/><rect x="210" y="170" width="12" height="18" rx="6"/><rect x="143" y="130" width="14" height="20" rx="7"/><rect x="76" y="212" width="12" height="16" rx="6"/><rect x="210" y="212" width="12" height="16" rx="6"/></g><path d="M134 260 v-34 a16 16 0 0 1 32 0 v34 z" fill="#5a3d22" stroke="#0a0a18" stroke-width="2"/><path d="M0 268 Q150 250 300 268 V300 H0 Z" fill="#0f2350"/>`)
 };
 Object.assign(IMGS,window.SudomiPuzzlePics||{});   // 0.3.95: paisajes y personajes de anime (js/puzzle-pics.js)
 const imgUrl=k=>cacheI[k]||(cacheI[k]='data:image/svg+xml;utf8,'+encodeURIComponent(IMGS[k]()));
 const LIST=[
  A('1','cuentas',1,'El caracol invitado','Una golondrina invitó a un caracol a comer a una legua de distancia. El caracol avanza 1 pulgada al día. Una legua son 1,500 pasos, un paso son 5 pies y un pie son 12 pulgadas. ¿Cuántos días tarda en llegar?','num',{a:90000,u:'días'},['Pasa la legua a pies y luego a pulgadas.'],'1,500 × 5 = 7,500 pies; 7,500 × 12 = 90,000 pulgadas. A una pulgada por día: 90,000 días, unos 246 años. La comida se enfrió.'),
  A('2','cuentas',1,'El viajero y los estudiantes','Un hombre se cruzó con un grupo de estudiantes y dijo: «Si fueran otros tantos, más la mitad de ustedes, más la cuarta parte de ustedes, conmigo seríamos 100». ¿Cuántos estudiantes eran?','num',{a:36,u:'estudiantes'},['Quítale al 100 el hombre: quedan 99.','El grupo cuenta 2 veces, más ½, más ¼: 2.75 veces.'],'99 ÷ 2.75 = 36. Comprobación: 36 + 36 + 18 + 9 = 99, y con él, 100.'),
  A('3','cuentas',1,'Las cigüeñas','Dos amigos vieron unas cigüeñas. «Si fueran tres veces las que son, más la mitad de las que son, y dos más, serían 100». ¿Cuántas había?','num',{a:28,u:'cigüeñas'},['Quita las 2 del final: 98.','98 es tres veces y media el grupo.'],'98 ÷ 3.5 = 28. Comprobación: 84 + 14 + 2 = 100.'),
  A('4','cuentas',1,'Los caballos del prado','Un hombre vio caballos pastando. «Ojalá fueran míos, y otros tantos, y además la mitad de ellos: tendría 100». ¿Cuántos caballos vio?','num',{a:40,u:'caballos'},['El grupo cuenta dos veces y media.'],'100 ÷ 2.5 = 40. Comprobación: 40 + 40 + 20 = 100.'),
  A('5','reparto',2,'Cien cerdos por cien monedas','Un comprador quiere 100 cerdos por 100 monedas exactas. Un cerdo grande cuesta 10 monedas, una cerda 5 y dos cerditos cuestan 1 moneda. Tiene que llevar de las tres clases. ¿Cuántos de cada uno?','multi',{f:['Cerdos grandes','Cerdas','Cerditos'],ok:v=>pos(v)&&sum(v)===100&&20*v[0]+10*v[1]+v[2]===200,ex:[1,9,90]},['Los cerditos son baratos: hacen falta muchos.','Prueba con un solo cerdo grande.'],'1 cerdo grande (10), 9 cerdas (45) y 90 cerditos (45): 100 animales y 100 monedas.'),
  A('6','trampa',3,'Los dos vendedores','Dos vendedores compraron 250 cerdos por 100 monedas: a 5 cerdos por 2 monedas. Los separaron en dos corrales, los buenos y los flacos. Vendieron 120 buenos a 2 por moneda y 120 flacos a 3 por moneda. «¡Es el mismo precio: 5 cerdos por 2 monedas!», dijeron. ¿Cuántos cerdos les sobraron de ganancia después de recuperar sus 100 monedas?','num',{a:10,u:'cerdos'},['¿Cuánto cobraron por los 120 buenos? ¿Y por los 120 flacos?'],'120 ÷ 2 = 60 monedas y 120 ÷ 3 = 40 monedas: las 100 que pusieron. Vendieron 240 cerdos y les sobraron 10. La trampa: juntar «2 por 1» y «3 por 1» no da lo mismo que «5 por 2» cuando se venden igual cantidad de cada clase.'),
  A('7','reparto',2,'El plato de cuatro metales','Un plato pesa 30 libras (una libra tiene 12 onzas). Está hecho de oro, plata, cobre y hierro. Tiene tres veces más plata que oro, tres veces más cobre que plata y tres veces más hierro que cobre. ¿Cuántas onzas hay de cada metal?','multi',{f:['Oro','Plata','Cobre','Hierro'],ok:v=>v[0]===9&&v[1]===27&&v[2]===81&&v[3]===243,ex:[9,27,81,243]},['30 libras son 360 onzas.','Si el oro es 1 parte, en total hay 1 + 3 + 9 + 27 = 40 partes.'],'360 ÷ 40 = 9 onzas por parte: 9 de oro, 27 de plata, 81 de cobre y 243 de hierro.'),
  A('8','reparto',1,'El barril y los tres tubos','Tres tubos llenaron un barril de 300 medidas. El primero echó la mitad del total, el segundo la tercera parte y el tercero la sexta parte. ¿Cuánto echó cada uno?','multi',{f:['Primer tubo','Segundo tubo','Tercer tubo'],ok:v=>v[0]===150&&v[1]===100&&v[2]===50,ex:[150,100,50]},['La mitad, más un tercio, más un sexto, hacen el barril entero.'],'150, 100 y 50 medidas. Alcuino lo plantea con 100 medidas y salen fracciones; aquí se usó 300 para que salga exacto.'),
  A('9','campo',1,'La manta','Tengo una manta de 100 metros de largo y 80 de ancho. Quiero cortarla en pedazos de 5 metros por 4. ¿Cuántos pedazos salen?','num',{a:400,u:'pedazos'},['¿Cuántos caben a lo largo? ¿Y a lo ancho?'],'A lo largo caben 100 ÷ 5 = 20 y a lo ancho 80 ÷ 4 = 20: 20 × 20 = 400 pedazos.'),
  A('10','campo',1,'La tela','Una tela mide 60 metros de largo y 40 de ancho. Se corta en pedazos de 6 por 4. ¿Cuántos pedazos salen?','num',{a:100,u:'pedazos'},['Divide cada lado por separado.'],'60 ÷ 6 = 10 y 40 ÷ 4 = 10: salen 100 pedazos.'),
  A('11','trampa',2,'Los cuñados','Dos hombres se casaron cada uno con la hermana del otro. Cada pareja tuvo un hijo. ¿Qué son esos dos niños entre sí?','choice',{o:['Son hermanos','Son primos por parte de padre y por parte de madre a la vez','Uno es tío del otro','No son parientes'],a:1},['El padre de uno es hermano de la madre del otro… y al revés.'],'Son primos dobles: primos por el lado del padre y también por el de la madre.'),
  A('11b','trampa',3,'Las dos viudas','Dos amigos viudos, cada uno con una madre también viuda, se casaron cada uno con la madre del otro. Cada pareja tuvo un hijo. ¿Qué son esos dos niños entre sí?','choice',{o:['Primos','Hermanos','Cada uno es tío y sobrino del otro a la vez','Abuelo y nieto'],a:2},['El hijo de la madre de Juan es medio hermano de Juan.'],'El niño de la madre de Juan es hermano de Juan, y por eso tío del hijo de Juan. Y lo mismo al revés: cada niño es tío del otro y sobrino del otro.'),
  A('12','reparto',2,'Las treinta botellas','Un padre dejó a sus 3 hijos 30 botellas: 10 llenas de aceite, 10 a la mitad y 10 vacías. Cada hijo debe recibir la misma cantidad de botellas y la misma cantidad de aceite, sin pasar aceite de una botella a otra. Reparte.','grid',{rows:['Hijo 1','Hijo 2','Hijo 3'],cols:['Llenas','A medias','Vacías'],ok:m=>[0,1,2].every(c=>m[0][c]+m[1][c]+m[2][c]===10)&&m.every(r=>sum(r)===10&&2*r[0]+r[1]===10),ex:[[5,0,5],[5,0,5],[0,10,0]]},['A cada hijo le tocan 10 botellas y el aceite de 5 botellas llenas.','Uno puede llevarse todas las que están a medias.'],'Una forma: dos hijos se llevan 5 llenas y 5 vacías, y el tercero las 10 a medias. Hay otras, como 4 llenas, 2 a medias y 4 vacías.'),
  A('13','cuentas',2,'El ejército del rey','Un rey salió solo a juntar un ejército. Al salir de cada pueblo, su ejército era el doble del que entró. Pasó por 30 pueblos. ¿Cuántos eran al final, contando al rey?','choice',{o:['60','900','1,073,741,824','30,000'],a:2},['1, 2, 4, 8… duplica 30 veces.'],'2 multiplicado por sí mismo 30 veces: 1,073,741,824. Más de mil millones: duplicar crece muchísimo más rápido de lo que parece.'),
  A('14','trampa',1,'Las huellas del buey','Un buey ara un campo todo el día. ¿Cuántas huellas deja en la última raya que abre el arado?','num',{a:0,u:'huellas'},['¿Qué va detrás del buey?'],'Ninguna. El buey va delante y el arado, que va detrás, borra todas sus huellas.'),
  A('15','trampa',2,'Las rayas del arado','Un hombre aró un campo haciendo rayas largas de punta a punta. Dio 3 vueltas en cada punta. ¿Cuántas rayas hizo?','num',{a:7,u:'rayas'},['Son 6 vueltas en total. Cada vuelta separa dos rayas.'],'Con 6 vueltas hay 7 rayas: la primera, y una más después de cada vuelta.'),
  A('16','cuentas',2,'Los dueños de los bueyes','Dos hombres llevaban bueyes. El primero dijo: «Dame 2 bueyes y tendremos los mismos». El segundo contestó: «Mejor dame tú 2 a mí y tendré el doble que tú». ¿Cuántos tenía cada uno?','multi',{f:['El primero','El segundo'],ok:v=>v[0]===10&&v[1]===14,ex:[10,14]},['Por la primera frase, el segundo tiene 4 más.','Con la segunda frase: (primero + 4) + 2 = 2 × (primero − 2).'],'El primero tenía 10 y el segundo 14. Si pasan 2 al primero: 12 y 12. Si pasan 2 al segundo: 8 y 16.'),
  A('17','rio',3,'Los tres hermanos y sus hermanas','Tres hombres viajan cada uno con su hermana. La barca lleva a dos personas. Ninguna hermana puede quedar con otros hombres si su hermano no está, ni en la orilla ni en la barca. Pásalos a todos.','river',{rv:'parejas'},['Empieza cruzando a dos mujeres.','Hace falta devolver la barca varias veces: 11 viajes en total.'],'Se puede en 11 viajes. Por ejemplo: cruzan dos mujeres, vuelve una; cruzan dos mujeres, vuelve una; cruzan dos hombres, vuelve una pareja; cruzan dos hombres, vuelve una mujer; cruzan dos mujeres, vuelve una; cruzan las dos últimas.'),
  A('18','rio',1,'El lobo, la cabra y el repollo','Un granjero tiene que cruzar un lobo, una cabra y un repollo. En la barca cabe él y una sola cosa. Si no está, el lobo se come la cabra y la cabra se come el repollo.','river',{rv:'lobo'},['La cabra es la única que no puede quedarse con nadie.','En un viaje de vuelta hay que traer algo de regreso.'],'Siete viajes: lleva la cabra, vuelve solo; lleva el lobo y regresa con la cabra; lleva el repollo, vuelve solo; lleva la cabra.'),
  A('19','rio',2,'La familia y la barca','Un padre y una madre pesan lo mismo, y sus dos hijos pesan cada uno la mitad. La barca solo aguanta el peso de un adulto. Pásalos a todos.','river',{rv:'familia'},['Los dos niños juntos sí pueden ir.','Un niño siempre tiene que devolver la barca.'],'Nueve viajes: cruzan los dos niños, vuelve uno; cruza un adulto, vuelve el otro niño; cruzan los dos niños, vuelve uno; cruza el otro adulto, vuelve el niño; cruzan los dos niños.'),
  A('20','rio',2,'Los erizos','Un erizo y una eriza quieren cruzar con sus dos hijitos. Cada hijito pesa la mitad que un adulto y la hoja que usan de barca solo aguanta a un adulto.','river',{rv:'erizos'},['Es el mismo problema que el de la familia.'],'Igual que la familia: nueve viajes, con los hijitos devolviendo la hoja cada vez.'),
  A('21','campo',1,'El campo y las ovejas','Un campo mide 200 pies de largo y 100 de ancho. Cada oveja necesita un espacio de 5 pies por 4. ¿Cuántas ovejas caben?','num',{a:1000,u:'ovejas'},['200 ÷ 5 a lo largo y 100 ÷ 4 a lo ancho.'],'40 a lo largo por 25 a lo ancho: 1,000 ovejas.'),
  A('22','campo',2,'El campo torcido','Un campo mide 100 pies de largo, pero su ancho cambia: 50 pies en una punta, 60 en el medio y 40 en la otra punta. Antes, el que medía terrenos sacaba el promedio de los tres anchos y lo multiplicaba por el largo. ¿Qué superficie le salía, en pies cuadrados?','num',{a:5000,u:'pies²'},['El promedio de 50, 60 y 40 es 50.'],'(50 + 60 + 40) ÷ 3 = 50; 50 × 100 = 5,000 pies cuadrados. Es una aproximación, pero buena para campos casi rectos.'),
  A('23','campo',2,'El campo de cuatro lados','Un campo de cuatro lados mide 30 y 32 metros en dos lados de enfrente, y 34 y 32 en los otros dos. El que mide el terreno saca el promedio de cada par de lados de enfrente y multiplica los dos promedios. ¿Qué le da?','num',{a:1023,u:'metros²'},['Los promedios son 31 y 33.'],'31 × 33 = 1,023 metros cuadrados. Así lo calcula Alcuino. El método solo es exacto si el campo es un rectángulo.'),
  A('24','campo',2,'El campo triangular','Un campo triangular tiene dos lados de 30 metros y uno de 18. Antes, el que medía terrenos multiplicaba el lado largo por la mitad del corto. ¿Qué le salía?','num',{a:270,u:'metros²'},['La mitad de 18 es 9.'],'30 × 9 = 270. Se pasaba un poco: la altura real de ese triángulo es de unos 28.6 metros, y el área real unas 258.'),
  A('25','campo',2,'El campo redondo','Un campo redondo mide 400 metros de contorno. Antes, el que medía terrenos tomaba la cuarta parte del contorno y la multiplicaba por sí misma. ¿Qué superficie le salía?','num',{a:10000,u:'metros²'},['La cuarta parte de 400 es 100.'],'100 × 100 = 10,000. Se quedaba corto: el área real de ese círculo es de unos 12,732 metros cuadrados. Trataba el círculo como si fuera un cuadrado con el mismo contorno.'),
  A('26','cuentas',2,'El perro y la liebre','Una liebre lleva 150 pies de ventaja. El perro avanza 9 pies en cada salto y la liebre 7. Saltan al mismo tiempo. ¿En cuántos saltos la alcanza?','num',{a:75,u:'saltos'},['En cada salto el perro se acerca 2 pies.'],'150 ÷ 2 = 75 saltos. El perro habrá corrido 675 pies y la liebre 525.'),
  A('27','campo',1,'La ciudad y sus casas','Una ciudad mide 1,200 pies de largo y 600 de ancho. Se quiere llenar de casas de 40 pies por 30. ¿Cuántas casas caben?','num',{a:600,u:'casas'},['1,200 ÷ 40 y 600 ÷ 30.'],'30 casas a lo largo por 20 a lo ancho: 600. En Alcuino los lados son desiguales (1,100, 1,000, 600 y 600) y promedia; aquí se dejó un rectángulo.'),
  A('28','campo',2,'La ciudad triangular','Una plaza tiene forma de triángulo con un ángulo recto. Los dos lados que forman ese ángulo miden 80 y 60 pies. Si cada casa ocupa 20 pies por 10, ¿para cuántas casas alcanza la superficie?','num',{a:12,u:'casas'},['El área de ese triángulo es la mitad de 80 × 60.'],'80 × 60 ÷ 2 = 2,400 pies cuadrados; cada casa ocupa 200: alcanza para 12. Alcuino usa un triángulo de lados 100, 100 y 90.'),
  A('29','campo',2,'La ciudad redonda','Una ciudad redonda mide 8,000 pies de contorno. El que mide el terreno toma la cuarta parte del contorno y la multiplica por sí misma. Cada casa ocupa 40 pies por 25. ¿Cuántas casas calcula?','num',{a:4000,u:'casas'},['La cuarta parte de 8,000 es 2,000.'],'2,000 × 2,000 = 4,000,000 pies cuadrados; cada casa ocupa 1,000: 4,000 casas.'),
  A('30','campo',1,'El piso de la iglesia','El piso de una iglesia mide 240 pies de largo y 120 de ancho. Se cubre con losetas de 2 pies por 1. ¿Cuántas losetas hacen falta?','num',{a:14400,u:'losetas'},['Divide el tamaño del piso entre el tamaño de una loseta.'],'240 × 120 = 28,800 pies cuadrados; cada loseta cubre 2: hacen falta 14,400.'),
  A('31','campo',2,'La bodega','Una bodega mide 100 pies de largo y 64 de ancho. Cada barril ocupa 7 pies de largo y 4 de ancho, y hay que dejar un pasillo de 4 pies a todo lo largo. ¿Cuántos barriles caben?','num',{a:210,u:'barriles'},['Quita el pasillo del ancho: quedan 60 pies.','A lo largo caben 14 barriles enteros (14 × 7 = 98).'],'60 ÷ 4 = 15 filas y 14 barriles por fila: 210.'),
  A('32','reparto',2,'Veinte medidas para veinte','Un padre de familia reparte 20 medidas de grano entre 20 personas. Cada hombre recibe 3, cada mujer 2 y cada niño media. Hay de los tres. ¿Cuántos hombres, mujeres y niños son?','multi',{f:['Hombres','Mujeres','Niños'],ok:v=>pos(v)&&sum(v)===20&&6*v[0]+4*v[1]+v[2]===40,ex:[1,5,14]},['Los niños comen poco: tienen que ser la mayoría.'],'1 hombre (3), 5 mujeres (10) y 14 niños (7): 20 personas y 20 medidas.'),
  A('33','reparto',2,'Treinta medidas para treinta','Lo mismo con 30 personas y 30 medidas: 3 por hombre, 2 por mujer, media por niño.','multi',{f:['Hombres','Mujeres','Niños'],ok:v=>pos(v)&&sum(v)===30&&6*v[0]+4*v[1]+v[2]===60,ex:[3,5,22]},['Prueba con 3 hombres.'],'3 hombres (9), 5 mujeres (10) y 22 niños (11).'),
  A('33b','reparto',3,'Noventa medidas para noventa','Ahora son 90 personas y 90 medidas, con el mismo reparto: 3, 2 y media. Hay varias respuestas buenas: da una.','multi',{f:['Hombres','Mujeres','Niños'],ok:v=>pos(v)&&sum(v)===90&&6*v[0]+4*v[1]+v[2]===180,ex:[6,20,64]},['Multiplica por 3 la respuesta del de 30… o busca otra.'],'Alcuino da 6 hombres, 20 mujeres y 64 niños. También valen 3, 25 y 62, o 9, 15 y 66, entre otras.'),
  A('34','reparto',3,'Cien medidas para cien','Cien personas, cien medidas: 3 por hombre, 2 por mujer, media por niño. Da una respuesta que funcione.','multi',{f:['Hombres','Mujeres','Niños'],ok:v=>pos(v)&&sum(v)===100&&6*v[0]+4*v[1]+v[2]===200,ex:[11,15,74]},['Cinco veces los hombres más tres veces las mujeres tiene que dar 100.'],'Alcuino da 11 hombres, 15 mujeres y 74 niños. Hay seis respuestas en total: también 2-30-68, 5-25-70, 8-20-72, 14-10-76 y 17-5-78.'),
  A('35','reparto',3,'La herencia y los mellizos','Un hombre, al morir, dejó 700 monedas y a su esposa embarazada. Dijo: «Si nace niño, él recibe el doble que su madre. Si nace niña, la madre recibe el doble que ella». Nacieron mellizos: un niño y una niña. ¿Cómo se reparte respetando las dos reglas?','multi',{f:['Hijo','Madre','Hija'],ok:v=>v[0]===400&&v[1]===200&&v[2]===100,ex:[400,200,100]},['El hijo recibe 2 veces la madre; la madre, 2 veces la hija.','En partes: hija 1, madre 2, hijo 4.'],'Siete partes de 100: hijo 400, madre 200, hija 100. Es la versión romana, más antigua; Alcuino la cuenta con otras fracciones y su reparto no sale tan limpio.'),
  A('36','cuentas',2,'El saludo del anciano','Un anciano saludó a un niño: «Que vivas cuatro veces lo que has vivido; que después vivas el triple de todo eso; y que Dios te dé un año más: cumplirás 100». ¿Qué edad tenía el niño?','multi',{f:['Años','Meses'],ok:v=>v[0]===8&&v[1]===3,ex:[8,3]},['Sin el año de regalo son 99.','4 veces, y luego el triple: 12 veces su edad.'],'99 ÷ 12 = 8 años y un cuarto: 8 años y 3 meses.'),
  A('37','reparto',2,'Los albañiles','Seis albañiles levantan una casa: cinco maestros y un aprendiz. Entre todos cobran 33 monedas al día y el aprendiz gana la mitad que un maestro. ¿Cuánto gana cada uno?','multi',{f:['Un maestro','El aprendiz'],ok:v=>v[0]===6&&v[1]===3,ex:[6,3]},['El aprendiz vale medio maestro: son cinco maestros y medio.'],'33 ÷ 5.5 = 6 monedas cada maestro y 3 el aprendiz. En Alcuino cobran 25 y sale una fracción; aquí se cambió a 33.'),
  A('38','reparto',3,'Cien animales por cien monedas','Un comprador quiere 100 animales por 100 monedas. Un caballo cuesta 3 monedas, un buey 1, y 24 ovejas cuestan 1 moneda. Lleva de los tres.','multi',{f:['Caballos','Bueyes','Ovejas'],ok:v=>pos(v)&&sum(v)===100&&72*v[0]+24*v[1]+v[2]===2400,ex:[23,29,48]},['Las ovejas tienen que ser múltiplo de 24.','Prueba con 48 ovejas: cuestan 2 monedas.'],'23 caballos (69), 29 bueyes (29) y 48 ovejas (2): 100 animales y 100 monedas.'),
  A('39','reparto',3,'El vendedor de Oriente','En Oriente, un camello cuesta 5 monedas, un asno 1, y 20 ovejas cuestan 1 moneda. Compra 100 animales por 100 monedas, de los tres.','multi',{f:['Camellos','Asnos','Ovejas'],ok:v=>pos(v)&&sum(v)===100&&100*v[0]+20*v[1]+v[2]===2000,ex:[19,1,80]},['Las ovejas van de 20 en 20.','Con 80 ovejas gastas 4 monedas y te quedan 96 para 20 animales.'],'19 camellos (95), 1 asno (1) y 80 ovejas (4).'),
  A('40','cuentas',2,'Las ovejas del monte','Un pastor miró su rebaño: «Si tuviera otras tantas, y la mitad de las que tengo, y la cuarta parte, entonces con mi perro y conmigo seríamos 200». ¿Cuántas ovejas tiene?','num',{a:72,u:'ovejas'},['Quita al pastor y al perro: 198.','El rebaño cuenta 2.75 veces.'],'198 ÷ 2.75 = 72. Comprobación: 72 + 72 + 36 + 18 = 198. En Alcuino es igual al del caminante (36); aquí se cambió el total.'),
  A('41','cuentas',3,'La cerda y el corral','Una cerda va por un corral haciendo 6 paradas: el centro, las cuatro esquinas y el centro otra vez. En cada parada, ella y todas las cerdas que ya nacieron tienen 7 cerditas cada una. ¿Cuántas cerdas hay al final, contando a la primera?','num',{a:262144,u:'cerdas'},['En cada parada, cada cerda se convierte en 8.'],'8 × 8 × 8 × 8 × 8 × 8 = 262,144. Es un cuento imposible, hecho para practicar la multiplicación repetida.'),
  A('42','cuentas',2,'La escalera de las palomas','Una escalera tiene 100 escalones. En el primero hay 1 paloma, en el segundo 2, en el tercero 3… y en el último 100. ¿Cuántas palomas hay?','num',{a:5050,u:'palomas'},['Junta el escalón 1 con el 99, el 2 con el 98…'],'Alcuino junta escalones: 1 + 99, 2 + 98… son 49 parejas de 100, más el 50 y el 100 que quedan solos: 4,900 + 150 = 5,050. Mil años antes de la anécdota de Gauss.'),
  A('43','trampa',1,'Los cerdos impares','Un hombre quiere matar 300 cerdos en 3 días, un número impar cada día. ¿Cuántos mata cada día?','choice',{o:['99, 100 y 101','No se puede: tres impares nunca suman un número par','97, 101 y 102','Cualquier reparto sirve'],a:1},['Suma dos impares: ¿qué sale? Ahora suma otro.'],'Impar + impar = par, y par + impar = impar. Tres impares siempre dan un número impar, y 300 es par. Alcuino dice que es «una fábula para burlarse de los muchachos».'),
  A('44','cuentas',2,'El saludo del hijo','Un padre le dijo a su hijo: «Triplica tu edad, súmale la mitad de tu edad y un año más: llegarás a 50». ¿Cuántos años tiene el hijo?','num',{a:14,u:'años'},['Quita el año: 49 es tres veces y media su edad.'],'49 ÷ 3.5 = 14 años. Inspirado en el saludo entre padre e hijo de Alcuino, con una cuenta más clara.'),
  A('45','cuentas',1,'La paloma en el árbol','Una paloma vio pasar un grupo de palomas: «Si fueran otras tantas, y otras tantas más, conmigo seríamos 100». ¿Cuántas palomas volaban?','num',{a:33,u:'palomas'},['Quita a la paloma del árbol: 99 son tres grupos iguales.'],'99 ÷ 3 = 33.'),
  A('46','cuentas',2,'Los cofres encontrados','Un hombre encontró 2 cofres. Cada cofre tiene 75 bolsas y cada bolsa tiene 72 monedas. Lo repartió todo dando 50 monedas a cada persona. ¿A cuántas personas les tocó?','num',{a:216,u:'personas'},['Cuenta todas las monedas: 2 × 75 × 72.'],'2 × 75 × 72 = 10,800 monedas; 10,800 ÷ 50 = 216 personas.'),
  A('47','reparto',2,'Los panes del obispo','Un obispo reparte 12 panes entre 12 personas de su iglesia: cada sacerdote recibe 2, cada ayudante medio pan y cada lector un cuarto de pan. Hay de los tres. ¿Cuántos son de cada clase?','multi',{f:['Sacerdotes','Ayudantes','Lectores'],ok:v=>pos(v)&&sum(v)===12&&8*v[0]+2*v[1]+v[2]===48,ex:[5,1,6]},['Con 5 sacerdotes ya van 10 panes.'],'5 sacerdotes (10 panes), 1 ayudante (medio) y 6 lectores (un pan y medio): 12 y 12.'),
  A('48','cuentas',2,'Los alumnos','Un hombre preguntó a unos alumnos cuántos eran. «Dobla nuestro número, triplica lo que salga y pártelo en cuatro. Una de esas partes, contigo, hace 100». ¿Cuántos eran?','num',{a:66,u:'alumnos'},['Doblar y triplicar es multiplicar por 6; partir en cuatro deja una vez y media.'],'Una vez y media el grupo es 99: 99 ÷ 1.5 = 66.'),
  A('49','cuentas',1,'Los carpinteros','Siete carpinteros hicieron 7 ruedas cada uno. Cada carro lleva 4 ruedas. ¿Cuántos carros completos se arman y cuántas ruedas sobran?','multi',{f:['Carros','Ruedas que sobran'],ok:v=>v[0]===12&&v[1]===1,ex:[12,1]},['Son 49 ruedas.'],'49 ruedas: 12 carros (48 ruedas) y sobra 1.'),
  A('50','cuentas',1,'El vino en las jarras','Con un barril de vino se llenan 72 jarras. ¿Cuántas jarras se llenan con 100 barriles?','num',{a:7200,u:'jarras'},['72 × 100.'],'7,200 jarras.'),
  A('51','reparto',2,'Los cuatro barriles','Un padre dejó a sus 4 hijos cuatro barriles: uno con 40 medidas de vino, otro con 30, otro con 20 y otro con 10. Cada hijo se queda con un barril, pero todos deben tener el mismo vino. ¿Cuánto vino le toca a cada uno?','num',{a:25,u:'medidas'},['Suma todo el vino y pártelo entre cuatro.'],'Hay 100 medidas: 25 para cada uno. Se pasan 15 del barril de 40 al de 10, y 5 del de 30 al de 20.'),
  A('52','cuentas',3,'El camello y el grano','Hay que llevar 90 medidas de grano a 30 leguas. El camello carga 30 medidas y, cuando va cargado, se come 1 por legua. Alcuino lo hace así: tres viajes hasta la legua 20, y desde allí un último viaje. ¿Cuántas medidas llegan?','num',{a:20,u:'medidas'},['En cada uno de los tres viajes se come 20 y deja 10.','En la legua 20 hay 30 medidas, y faltan 10 leguas.'],'Quedan 30 en la legua 20 y en las últimas 10 leguas se come 10: llegan 20. ¿Se puede mejorar? Sí: parando en la legua 10 (quedan 60) y luego en la 25 (quedan 30), llegan 25.'),
  A('53','reparto',1,'Los huevos del abad','Un abad tiene 12 monjes y 204 huevos, y los reparte por igual. ¿Cuántos huevos recibe cada monje?','num',{a:17,u:'huevos'},['204 ÷ 12.'],'17 huevos cada uno.'),
  // ---- otros maestros
  O(1,'mundo',2,'La edad de Diofanto','Grecia, hacia el año 500','La tumba de Diofanto dice: «Su niñez duró la sexta parte de su vida; su juventud, una doceava parte más; pasó otra séptima parte antes de casarse. Cinco años después nació su hijo, que vivió la mitad de lo que vivió su padre. Diofanto murió 4 años después que su hijo». ¿Cuántos años vivió?','num',{a:84,u:'años'},['Busca un número que se pueda dividir entre 6, 12 y 7.'],'84: niñez 14, juventud 7, soltero 12 más, 5 años hasta el hijo, el hijo vivió 42, y 4 años más. 14 + 7 + 12 + 5 + 42 + 4 = 84.'),
  O(2,'mundo',2,'Los soldados de Sun Tzu','China, siglo IV','Un general cuenta a sus soldados. Si los forma de 3 en 3 sobran 2; de 5 en 5 sobran 3; de 7 en 7 sobran 2. ¿Cuál es el número más pequeño de soldados que puede ser?','num',{a:23,u:'soldados'},['Los que dejan 2 al dividir entre 7: 2, 9, 16, 23, 30…'],'23: 23 = 7 × 3 + 2, 23 = 5 × 4 + 3 y 23 = 3 × 7 + 2.'),
  O(3,'mundo',2,'Siete casas','Egipto, papiro de Ahmes, hacia 1650 a. C.','En 7 casas hay 7 gatos en cada una. Cada gato caza 7 ratones, cada ratón se habría comido 7 espigas y cada espiga habría dado 7 medidas de grano. ¿Cuánto suman casas, gatos, ratones, espigas y medidas?','num',{a:19607},['7, 49, 343…'],'7 + 49 + 343 + 2,401 + 16,807 = 19,607.'),
  O(4,'trampa',1,'Camino del mercado','Adivinanza inglesa, siglo XVIII','Yendo al mercado me crucé con un hombre que tenía 7 esposas. Cada esposa llevaba 7 sacos, cada saco 7 gatos y cada gato 7 gatitos. ¿Cuántos íbamos al mercado?','num',{a:1},['¿Hacia dónde iban ellos?'],'Solo yo. A los demás me los crucé: venían de vuelta.'),
  O(5,'mundo',2,'Los conejos de Fibonacci','Italia, 1202','En el mes 1 hay una pareja de conejos recién nacidos. Una pareja tarda un mes en crecer y, desde su segundo mes, tiene una pareja nueva cada mes. Ninguno muere. Las parejas van así: 1, 1, 2, 3, 5… ¿Cuántas parejas hay en el mes 12?','num',{a:144,u:'parejas'},['Cada mes es la suma de los dos anteriores.'],'1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144.'),
  O(6,'reparto',3,'Las cien aves','China, Zhang Qiujian, siglo V','Un gallo cuesta 5 monedas, una gallina 3 y tres pollitos cuestan 1 moneda. Compra 100 aves por 100 monedas, de las tres clases. Hay tres respuestas: da una.','multi',{f:['Gallos','Gallinas','Pollitos'],ok:v=>pos(v)&&sum(v)===100&&15*v[0]+9*v[1]+v[2]===300,ex:[4,18,78]},['Los pollitos van de 3 en 3.','Prueba con 4 gallos.'],'4 gallos, 18 gallinas y 78 pollitos. También 8, 11 y 81, o 12, 4 y 84.'),
  O(7,'mundo',2,'Las abejas de Bhaskara','India, siglo XII','De un grupo de abejas, la quinta parte se posó en una flor roja y la tercera parte en una flor blanca. Tres veces la diferencia entre esos dos grupos voló a un jazmín. Quedó una sola abeja en el aire. ¿Cuántas abejas eran?','num',{a:15,u:'abejas'},['Tiene que dividirse entre 5 y entre 3.'],'15: 3 en la flor roja, 5 en la blanca, 3 × (5 − 3) = 6 en el jazmín, y 1 en el aire.'),
  O(8,'mundo',2,'El tablero y el trigo','Leyenda india del ajedrez','El inventor del ajedrez pidió 1 grano de trigo por la primera casilla, 2 por la segunda, 4 por la tercera, y así, el doble cada vez. ¿En qué casilla se pasa por primera vez de mil granos?','num',{a:11},['1, 2, 4, 8, 16, 32…'],'En la casilla 11 hay 1,024 granos. En la 64 habría más de 9 trillones: más trigo del que se ha cosechado en toda la historia.'),
  O(9,'mundo',3,'Las pesas de Bachet','Francia, 1612','Un vendedor quiere pesar cualquier cantidad entera de 1 a 40 libras en una balanza de dos platos. Puede poner pesas en los dos platos. ¿Cuál es el menor número de pesas que necesita?','num',{a:4,u:'pesas'},['Una pesa en el plato de la mercancía resta.','Piensa en 1, 3, 9…'],'Cuatro pesas: 1, 3, 9 y 27. Por ejemplo, 5 = 9 − 3 − 1 y 40 = 27 + 9 + 3 + 1.'),
  O(10,'mundo',2,'La moneda falsa','Clásico de balanzas','De 9 monedas iguales, una pesa un poco más. Con una balanza de dos platos, ¿cuántas pesadas hacen falta como mínimo para encontrarla con seguridad?','num',{a:2,u:'pesadas'},['No peses 4 contra 4: pesa 3 contra 3.'],'Dos. Pesa 3 contra 3: si pesan igual, está en las 3 que dejaste fuera; si no, en el grupo que baja. De esas 3, pesa 1 contra 1.'),
  O(11,'mundo',2,'Los puentes de Königsberg','Euler, 1736','Una ciudad tiene un río con dos islas y 7 puentes: una isla tiene 5 puentes y cada una de las otras tres zonas tiene 3. ¿Se puede dar un paseo que cruce cada puente una sola vez?','choice',{o:['Sí, empezando por una isla','Sí, pero solo si se termina donde se empezó','No, es imposible','Depende de por dónde se empiece'],a:2},['Cada vez que pasas por una zona usas un puente para entrar y otro para salir.'],'Imposible. Salvo donde empiezas y donde terminas, cada zona necesita un número par de puentes. Aquí las cuatro zonas tienen un número impar. Con esta respuesta Euler inventó la teoría de grafos.'),
  O(12,'mundo',3,'El puente de noche','Clásico moderno','Cuatro personas tienen que cruzar un puente de noche con una sola linterna. El puente aguanta a dos a la vez y siempre hace falta la linterna. Tardan 1, 2, 5 y 10 minutos; dos juntas van al paso de la más lenta. ¿Cuál es el menor tiempo total, en minutos?','num',{a:17,u:'minutos'},['No siempre conviene que el más rápido acompañe a todos.','Haz que los dos más lentos crucen juntos.'],'17: cruzan 1 y 2 (2), vuelve 1 (1), cruzan 5 y 10 (10), vuelve 2 (2), cruzan 1 y 2 (2).'),
  O(13,'trampa',1,'La rana en el pozo','Clásico','Una rana está en el fondo de un pozo de 30 metros. Cada día sube 3 metros y cada noche resbala 2. ¿En qué día sale?','num',{a:28},['El último día no resbala: ya salió.'],'Gana 1 metro por día completo. Tras 27 días está a 27 metros; el día 28 sube 3 y sale.'),
  O(14,'mundo',3,'El círculo de Josefo','Roma, siglo I','Diez personas se sientan en círculo, numeradas del 1 al 10. Empezando a contar por el 1, se va eliminando una sí y una no: sale el 2, el 4, el 6… y se sigue dando vueltas hasta que queda una. ¿Cuál queda?','num',{a:5},['Primera vuelta: salen 2, 4, 6, 8 y 10.','Quedan 1, 3, 5, 7, 9 y le toca salir al 3.'],'Salen 2, 4, 6, 8, 10; luego 3 y 7; luego 1 y 9. Queda el 5.'),
  O(15,'manos',2,'Las jarras de Tartaglia','Italia, siglo XVI','Una jarra de 8 medidas está llena de vino. Tienes otras dos vacías, de 5 y de 3. Reparte el vino en dos partes iguales de 4. Toca una jarra y luego otra para verter.','jugs',{caps:[8,5,3],init:[8,0,0],goal:v=>v[0]===4&&v[1]===4,gt:'4 en la jarra grande y 4 en la mediana'},['Llena la de 5 y, de ella, la de 3: en la de 5 quedan 2.'],'Siete pasos: 8→5, 5→3, 3→8, 5→3, 8→5, 5→3, 3→8.'),
  O(16,'manos',2,'Las jarras y la fuente','Clásico','Tienes una fuente y dos jarras, de 5 y de 3 litros. Deja exactamente 4 litros en la jarra grande. Toca una jarra y usa «Llenar» o «Vaciar», o toca otra jarra para verter.','jugs',{caps:[5,3],init:[0,0],src:1,goal:v=>v[0]===4,gt:'4 litros en la jarra de 5'},['Llena la de 5 y vierte en la de 3: quedan 2.'],'Llena la de 5, vierte en la de 3 (quedan 2), vacía la de 3, pasa los 2 a la de 3, llena la de 5 y completa la de 3: quedan 4.'),
  O(17,'manos',1,'La torre de Hanói','Édouard Lucas, 1883','Pasa los 3 discos al último palo. Mueves uno a la vez y nunca puedes poner un disco grande sobre uno más pequeño.','hanoi',{nd:3},['El disco pequeño se mueve una jugada sí y una no.'],'El mínimo son 7 movimientos.'),
  O(18,'manos',2,'La torre de cuatro discos','Édouard Lucas, 1883','Ahora con 4 discos.','hanoi',{nd:4},['Primero lleva la torre de 3 al palo del medio.'],'El mínimo son 15 movimientos: con cada disco más, el doble y uno.'),
  O(19,'manos',2,'El cuadrado mágico','China, el Lo Shu, hace más de dos mil años','Coloca los números del 1 al 9, sin repetir, para que todas las filas, columnas y las dos diagonales sumen 15.','magic',{},['En el centro va el 5.','Los pares van en las esquinas.'],'Una forma: 4 9 2 / 3 5 7 / 8 1 6. Todas las demás son esa misma girada o reflejada.'),
  O(20,'manos',2,'Las seis reinas','Variante de Max Bezzel, 1848','Coloca 6 reinas en un tablero de 6 × 6 sin que ninguna ataque a otra: ni en fila, ni en columna, ni en diagonal.','queens',{nq:6},['Ninguna reina va en una esquina.'],'Una forma: columnas 2, 4, 6, 1, 3, 5 de arriba abajo.'),
  O(21,'manos',3,'Las ocho reinas','Max Bezzel, 1848','El problema original: 8 reinas en un tablero de ajedrez sin que ninguna ataque a otra.','queens',{nq:8},['Empieza por una fila y ve bajando, moviendo la última si te trabas.'],'Hay 92 formas. Una: columnas 1, 5, 8, 6, 3, 7, 2, 4 de arriba abajo.'),
  // ---- 0.3.94: rompecabezas de piezas que se deslizan (el «8», el «15» de 1880 y sus variantes de 5, 11 y 24 piezas). La imagen de cada uno la hace IMGS
  Z('r1','La playa','Rompecabezas de 5 piezas',1,3,2,'playa',300,200),
  Z('r2','Te quiero mucho','Rompecabezas de 8 piezas',1,3,3,'quiero',300,300),
  Z('r3','El caracol en piezas','Rompecabezas de 11 piezas',2,4,3,'caracol',160,100),
  Z('r4','El quince','Noyes Chapman, 1880 · 15 piezas',3,4,4,'quince',300,300),
  Z('r5','El castillo de noche','Rompecabezas de 24 piezas',3,5,5,'castillo',300,300),
  // ---- 0.3.95 (dueño): rompecabezas ilustrados de 3 × 3 (8 piezas) y 4 × 4 (15 piezas). Los dibujos están en js/puzzle-pics.js
  ...[['i1','Campo de girasoles','Paisaje',1,3,'girasoles'],['i2','La cascada','Paisaje',1,3,'cascada'],['i3','El arrecife','Paisaje',1,3,'arrecife'],
   ['i4','Bajo el cerezo','Personaje de anime',2,3,'cerezo'],['i5','La estrella del escenario','Personaje de anime',2,3,'idol'],['i6','El jinete del dragón','Personaje de anime',2,3,'dragon'],
   ['i7','Atardecer en la montaña','Paisaje',2,4,'montana'],['i8','El pueblo de colores','Paisaje',2,4,'pueblo'],['i9','Aurora en la nieve','Paisaje',3,4,'aurora'],
   ['i10','El ninja de la luna','Personaje de anime',3,4,'ninja'],['i11','La maga de las estrellas','Personaje de anime',3,4,'maga'],['i12','La cocinera de ramen','Personaje de anime',3,4,'cocinera']]
   .filter(x=>IMGS[x[5]]).map(([id,t,who,d,n,img])=>({...Z(id,t,`${who} · ${n} × ${n}, ${n*n-1} piezas`,d,n,n,img,300,300),c:'ilus'}))
 ];
 const byId=id=>LIST.find(p=>p.id===id);
 const num=s=>{const t=String(s).replace(/[\s.,]/g,'');return /^\d+$/.test(t)?parseInt(t,10):NaN};
 // ---- dibuja un acertijo dentro de `host`. o.onSolve() al resolverlo, o.onError() en cada fallo
 function mount(host,p,o){
  o=o||{};let solved=false;
  const done=()=>{if(solved)return;solved=true;host.querySelectorAll('button,input').forEach(b=>b.disabled=true);o.onSolve&&o.onSolve()};
  const fail=m=>{say(m,'bad');snd('gbad');o.onError&&o.onError()};
  const say=(m,cls)=>{const f=host.querySelector('.pz-msg');if(f){f.textContent=m||'';f.className='pz-msg '+(cls||'')}};
  const $=s=>host.querySelector(s),$$=s=>[...host.querySelectorAll(s)];
  const msg='<p class="pz-msg" aria-live="polite"></p>';
  if(p.k==='num'){
   host.innerHTML=`<form class="pz-ans"><label><span>Tu respuesta</span><input type="text" inputmode="numeric" autocomplete="off" maxlength="14" aria-label="Respuesta"></label>${p.u?`<i>${p.u}</i>`:''}<button type="submit" class="pz-btn">Comprobar</button></form>${msg}`;
   $('form').onsubmit=e=>{e.preventDefault();const v=num($('input').value);if(Number.isNaN(v)){say('Escribe un número.','bad');return}if(v===p.a)done();else fail('No es '+$('input').value.trim()+'. Vuelve a pensarlo.')};
  }else if(p.k==='multi'){
   host.innerHTML=`<form class="pz-ans pz-multi">${p.f.map((f,i)=>`<label><span>${f}</span><input type="text" inputmode="numeric" autocomplete="off" maxlength="8" data-i="${i}"></label>`).join('')}<button type="submit" class="pz-btn">Comprobar</button></form>${msg}`;
   $('form').onsubmit=e=>{e.preventDefault();const v=$$('input').map(i=>num(i.value));if(v.some(Number.isNaN)){say('Llena todas las casillas con números.','bad');return}if(p.ok(v))done();else fail('Ese reparto no cumple todas las condiciones.')};
  }else if(p.k==='choice'){
   host.innerHTML=`<div class="pz-opts">${p.o.map((t,i)=>`<button type="button" class="pz-opt" data-i="${i}">${t}</button>`).join('')}</div>${msg}`;
   $$('.pz-opt').forEach(b=>b.onclick=()=>{if(+b.dataset.i===p.a){b.classList.add('ok');done()}else{b.classList.add('no');b.disabled=true;fail('Esa no es.')}});
  }else if(p.k==='grid'){
   host.innerHTML=`<form class="pz-gridf"><table class="pz-table"><tr><th></th>${p.cols.map(c=>`<th>${c}</th>`).join('')}</tr>${p.rows.map((r,i)=>`<tr><th>${r}</th>${p.cols.map((c,j)=>`<td><input type="text" inputmode="numeric" maxlength="3" value="0" aria-label="${r}, ${c}" data-r="${i}" data-c="${j}"></td>`).join('')}</tr>`).join('')}</table><button type="submit" class="pz-btn">Comprobar</button></form>${msg}`;
   $('form').onsubmit=e=>{e.preventDefault();const m=p.rows.map(()=>[]);$$('input').forEach(i=>m[+i.dataset.r][+i.dataset.c]=num(i.value));if(m.some(r=>r.some(Number.isNaN))){say('Usa solo números.','bad');return}if(p.ok(m))done();else fail('Todavía no está parejo. Revisa botellas y aceite de cada hijo.')};
  }else if(p.k==='river')river(host,p,{done,fail,say,msg});
  else if(p.k==='jugs')jugs(host,p,{done,say,msg});
  else if(p.k==='hanoi')hanoi(host,p,{done,say,msg});
  else if(p.k==='queens')queens(host,p,{done,say,msg});
  else if(p.k==='magic')magic(host,p,{done,say,msg});
  else if(p.k==='slide')slide(host,p,{done,say,msg});
 }
 // rompecabezas de piezas que se deslizan: a[posición] = pieza; la última pieza (n-1) es el hueco. Se mezcla con movimientos de verdad,
 // así que siempre tiene solución. Una pieza en la misma fila o columna que el hueco empuja a todas las que tiene delante.
 function slide(host,p,x){
  const C=p.cols,Rw=p.rows,n=C*Rw;let a,moves=0,over=false,shown=p.img==='quince'?false:false;
  const nb=i=>{const o=[],r=Math.floor(i/C),c=i%C;if(r>0)o.push(i-C);if(r<Rw-1)o.push(i+C);if(c>0)o.push(i-1);if(c<C-1)o.push(i+1);return o};
  const mix=()=>{a=Array.from({length:n},(_,i)=>i);let b=n-1,prev=-1;for(let k=0;k<n*30;k++){const o=nb(b).filter(i=>i!==prev),t=o[Math.floor(Math.random()*o.length)];a[b]=a[t];a[t]=n-1;prev=b;b=t}if(a.every((v,i)=>v===i))mix();moves=0};
  mix();
  const draw=m=>{
   host.innerHTML=`<div class="pz-slide" style="--c:${C};--r:${Rw};--img:url(&quot;${imgUrl(p.img)}&quot;);aspect-ratio:${p.w}/${p.hh};width:min(100%,calc(46dvh*${p.w}/${p.hh}))">${a.map((v,i)=>v===n-1&&!over?'<span class="pz-gap"></span>':`<button type="button" class="pz-tile" data-i="${i}" aria-label="Pieza ${v+1}" style="background-size:${C*100}% ${Rw*100}%;background-position:${(v%C)/(C-1)*100}% ${Math.floor(v/C)/(Rw-1)*100}%">${shown&&!over?`<i>${v+1}</i>`:''}</button>`).join('')}</div>
   <div class="pz-row"><span class="pz-count">Movimientos: ${moves}</span>${p.img==='quince'?'':`<button type="button" class="pz-link" id="pzNum">${shown?'Quitar números':'Ver números'}</button>`}<button type="button" class="pz-link" id="pzReset">Mezclar de nuevo</button></div>${x.msg}`;
   if(m)x.say(m[0],m[1]);
   host.querySelectorAll('.pz-tile').forEach(t=>t.onclick=()=>{if(over)return;const i=+t.dataset.i,b=a.indexOf(n-1),row=Math.floor(i/C)===Math.floor(b/C),col=i%C===b%C;
    if(!row&&!col){draw(['Esa pieza no está en línea con el hueco.','bad']);return}
    const d=row?(b>i?1:-1):(b>i?C:-C);for(let k=b;k!==i;k-=d)a[k]=a[k-d];a[i]=n-1;moves++;snd('clack');
    if(a.every((v,k)=>v===k)){over=true;draw(['Imagen completa en '+moves+' movimientos.','good']);x.done();return}
    draw()});
   const nm=host.querySelector('#pzNum');if(nm)nm.onclick=()=>{shown=!shown;draw()};
   host.querySelector('#pzReset').onclick=()=>{mix();draw()};
  };
  draw();
 }
 function river(host,p,x){
  const R=RIVER[p.rv],it=R.items.map(a=>({id:a[0],e:a[1],n:a[2],w:a[3]||1,row:!!a[4],col:a[5]}));
  let side={},boat=0,load=[],trips=0,over=false;it.forEach(i=>side[i.id]=0);
  const tile=(i,cls)=>`<button type="button" class="pz-pas ${cls||''}${i.col?' fam':''}" data-id="${i.id}" aria-label="${i.n}"${i.col?` style="--fam:${i.col}"`:''}><b>${i.e}</b><small>${i.n}</small></button>`;
  const draw=m=>{
   const bank=s=>it.filter(i=>side[i.id]===s&&!load.includes(i.id)).map(i=>tile(i,s===boat?'':'far')).join('');
   host.innerHTML=`<div class="pz-river"><div class="pz-bank">${bank(0)}</div><div class="pz-water"><div class="pz-boat ${boat?'r':'l'}">${load.map(id=>tile(it.find(i=>i.id===id),'on')).join('')||'<em>barca</em>'}</div></div><div class="pz-bank goal">${bank(1)}</div></div>
   <div class="pz-row"><button type="button" class="pz-btn" id="pzGo">Cruzar ${boat?'←':'→'}</button><span class="pz-count">Viajes: ${trips}</span><button type="button" class="pz-link" id="pzReset">Empezar de nuevo</button></div>${x.msg}`;
   if(m)x.say(m[0],m[1]);
   host.querySelectorAll('.pz-pas').forEach(b=>b.onclick=()=>{if(over)return;const id=b.dataset.id,i=it.find(k=>k.id===id);
    if(load.includes(id)){load=load.filter(k=>k!==id);snd('tap');draw();return}
    if(side[id]!==boat){draw(['La barca está en la otra orilla.','bad']);return}
    const full=R.capW?load.reduce((s,k)=>s+it.find(q=>q.id===k).w,0)+i.w>R.capW:load.length>=R.cap;
    if(full){draw([R.capW?'La barca no aguanta tanto peso.':'En la barca no cabe nadie más.','bad']);return}
    load.push(id);snd('tap');draw()});
   host.querySelector('#pzReset').onclick=()=>{it.forEach(i=>side[i.id]=0);boat=0;load=[];trips=0;draw()};
   host.querySelector('#pzGo').onclick=()=>{
    if(over)return;
    if(!load.some(id=>it.find(i=>i.id===id).row)){draw([load.length?'Ahí no va nadie que sepa remar.':'Sube a alguien a la barca.','bad']);return}
    const from=boat,to=1-boat,moved=load.slice();
    moved.forEach(id=>side[id]=to);
    const grp=s=>new Set(it.filter(i=>side[i.id]===s).map(i=>i.id));
    const why=R.bad(new Set(moved))||R.bad(grp(from))||R.bad(grp(to));
    if(why){moved.forEach(id=>side[id]=from);draw();x.fail(why+' Ese viaje no vale.');return}
    boat=to;load=[];trips++;snd('swish');
    if(it.every(i=>side[i.id]===1)){over=true;draw(['Todos cruzaron en '+trips+' viajes.','good']);x.done();return}
    draw();
   };
  };
  draw();
 }
 function jugs(host,p,x){
  let v=p.init.slice(),sel=-1,moves=0,over=false;const mx=Math.max(...p.caps);
  const draw=m=>{
   host.innerHTML=`<p class="pz-goal">Meta: ${p.gt}.</p><div class="pz-jugs">${p.caps.map((c,i)=>`<button type="button" class="pz-jug ${sel===i?'sel':''}" data-i="${i}" style="--h:${Math.round(40+c/mx*90)}px;--f:${Math.round(v[i]/c*100)}%" aria-label="Jarra de ${c}, tiene ${v[i]}"><span><i></i></span><b>${v[i]} / ${c}</b></button>`).join('')}</div>
   <div class="pz-row">${p.src?'<button type="button" class="pz-btn" id="pzFill">Llenar</button><button type="button" class="pz-btn" id="pzEmpty">Vaciar</button>':''}<span class="pz-count">Movimientos: ${moves}</span><button type="button" class="pz-link" id="pzReset">Empezar de nuevo</button></div>${x.msg}`;
   if(m)x.say(m[0],m[1]);
   const after=()=>{moves++;sel=-1;snd('glug');if(p.goal(v)){over=true;draw(['Lo lograste en '+moves+' movimientos.','good']);x.done()}else draw()};
   host.querySelectorAll('.pz-jug').forEach(b=>b.onclick=()=>{if(over)return;const i=+b.dataset.i;
    if(sel<0||sel===i){sel=sel===i?-1:i;draw();return}
    const q=Math.min(v[sel],p.caps[i]-v[i]);if(!q){draw([v[sel]?'Esa jarra ya está llena.':'La jarra que elegiste está vacía.','bad']);return}
    v[sel]-=q;v[i]+=q;after()});
   host.querySelector('#pzReset').onclick=()=>{v=p.init.slice();sel=-1;moves=0;draw()};
   if(p.src){host.querySelector('#pzFill').onclick=()=>{if(over)return;if(sel<0){draw(['Toca primero una jarra.','bad']);return}if(v[sel]===p.caps[sel]){draw(['Ya está llena.','bad']);return}v[sel]=p.caps[sel];after()};
    host.querySelector('#pzEmpty').onclick=()=>{if(over)return;if(sel<0){draw(['Toca primero una jarra.','bad']);return}if(!v[sel]){draw(['Ya está vacía.','bad']);return}v[sel]=0;after()}}
  };
  draw();
 }
 function hanoi(host,p,x){
  const n=p.nd;let pegs,sel=-1,moves=0,over=false;const reset=()=>{pegs=[[],[],[]];for(let d=n;d>=1;d--)pegs[0].push(d);sel=-1;moves=0};reset();
  const draw=m=>{
   host.innerHTML=`<div class="pz-hanoi">${pegs.map((g,i)=>`<button type="button" class="pz-peg ${sel===i?'sel':''}" data-i="${i}" aria-label="Palo ${i+1}: ${g.length} discos">${g.slice().reverse().map(d=>`<i style="--w:${Math.round(28+d/n*72)}%" data-d="${d}"></i>`).join('')}</button>`).join('')}</div>
   <div class="pz-row"><span class="pz-count">Movimientos: ${moves}</span><button type="button" class="pz-link" id="pzReset">Empezar de nuevo</button></div>${x.msg}`;
   if(m)x.say(m[0],m[1]);
   host.querySelectorAll('.pz-peg').forEach(b=>b.onclick=()=>{if(over)return;const i=+b.dataset.i;
    if(sel<0){if(!pegs[i].length){draw(['Ese palo está vacío.','bad']);return}sel=i;draw();return}
    if(sel===i){sel=-1;draw();return}
    const d=pegs[sel][pegs[sel].length-1],t=pegs[i][pegs[i].length-1];
    if(t&&t<d){sel=-1;draw(['Un disco grande no va sobre uno pequeño.','bad']);return}
    pegs[i].push(pegs[sel].pop());sel=-1;moves++;snd('clack');
    if(pegs[2].length===n){over=true;draw(['Torre completa en '+moves+' movimientos.','good']);x.done()}else draw()});
   host.querySelector('#pzReset').onclick=()=>{reset();draw()};
  };
  draw();
 }
 function queens(host,p,x){
  const n=p.nq;let q=new Set(),over=false;
  const hits=()=>{const a=[...q].map(i=>[Math.floor(i/n),i%n]),bad=new Set();a.forEach(([r,c],i)=>a.forEach(([r2,c2],j)=>{if(i<j&&(r===r2||c===c2||Math.abs(r-r2)===Math.abs(c-c2))){bad.add(r*n+c);bad.add(r2*n+c2)}}));return bad};
  const draw=m=>{
   const bad=hits();
   host.innerHTML=`<div class="pz-chess" style="--n:${n}">${Array.from({length:n*n},(_,i)=>`<button type="button" class="${(Math.floor(i/n)+i%n)%2?'dk':''} ${bad.has(i)?'bad':''}" data-i="${i}" aria-label="Fila ${Math.floor(i/n)+1}, columna ${i%n+1}${q.has(i)?', reina':''}">${q.has(i)?'♛':''}</button>`).join('')}</div>
   <div class="pz-row"><span class="pz-count">Reinas: ${q.size} de ${n}</span><button type="button" class="pz-link" id="pzReset">Quitar todas</button></div>${x.msg}`;
   if(m)x.say(m[0],m[1]);
   host.querySelectorAll('.pz-chess button').forEach(b=>b.onclick=()=>{if(over)return;const i=+b.dataset.i;if(q.has(i))q.delete(i);else{if(q.size>=n){draw(['Ya pusiste las '+n+'. Quita una para moverla.','bad']);return}q.add(i)}snd('tap');
    if(q.size===n&&!hits().size){over=true;draw(['Ninguna se ataca. ¡Resuelto!','good']);x.done()}else draw(q.size===n?['Las reinas en rojo se atacan.','bad']:null)});
   host.querySelector('#pzReset').onclick=()=>{q=new Set();draw()};
  };
  draw();
 }
 function magic(host,p,x){
  let g=Array(9).fill(0),sel=0,over=false;const L=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  const draw=m=>{
   host.innerHTML=`<div class="pz-magic">${g.map((v,i)=>`<button type="button" class="${sel===i?'sel':''}" data-i="${i}" aria-label="Casilla ${i+1}${v?': '+v:', vacía'}">${v||''}</button>`).join('')}</div>
   <div class="pz-pad">${[1,2,3,4,5,6,7,8,9].map(d=>`<button type="button" data-n="${d}" class="${g.includes(d)?'used':''}">${d}</button>`).join('')}</div>
   <div class="pz-row"><span class="pz-count">Cada línea debe sumar 15</span><button type="button" class="pz-link" id="pzReset">Borrar todo</button></div>${x.msg}`;
   if(m)x.say(m[0],m[1]);
   host.querySelectorAll('.pz-magic button').forEach(b=>b.onclick=()=>{if(over)return;sel=+b.dataset.i;draw()});
   host.querySelectorAll('.pz-pad button').forEach(b=>b.onclick=()=>{if(over)return;const d=+b.dataset.n,at=g.indexOf(d);if(at>=0)g[at]=0;if(at!==sel)g[sel]=d;snd('tap');
    if(g.every(Boolean)){if(L.every(l=>g[l[0]]+g[l[1]]+g[l[2]]===15)){over=true;draw(['Todas las líneas suman 15.','good']);x.done();return}draw(['Aún no: alguna línea no suma 15.','bad']);return}
    const nx=g.indexOf(0);if(g[sel]&&nx>=0)sel=nx;draw()});
   host.querySelector('#pzReset').onclick=()=>{g=Array(9).fill(0);sel=0;draw()};
  };
  draw();
 }
 // ---- la pantalla
 const src=p=>p.n?`Alcuino de York · Propositio ${ROMAN(p.n)}`:p.who;
 const stars=n=>'★'.repeat(n)+'☆'.repeat(3-n);
 const art=p=>p.k==='slide'?`<img class="pz-art" alt="${p.t}" src="${imgUrl(p.img)}">`:window.SudomiPuzzleArt?SudomiPuzzleArt.svg(p.id,p.t):'';   // la viñeta de cada acertijo (js/puzzle-art.js)
 function open(startId,cat){
  S.open('puzScreen','📜 Acertijos',(body,api)=>{
   const st=rd(),n=LIST.filter(p=>st.done[p.id]).length;
   body.classList.add('pz');api.el.classList.add('pz-full');api.el.classList.remove('pz-solo');   // 0.3.89: a pantalla completa
   body.innerHTML=`<p class="pz-intro">Hacia el año 800, el maestro Alcuino de York reunió 53 problemas «para afilar la mente de los jóvenes». Aquí están todos, contados de nuevo, junto a otros clásicos de Grecia, China, la India y Europa.</p>
   <p class="pz-prog"><b>${n}</b> de ${LIST.length} resueltos<span><i style="width:${Math.round(n/LIST.length*100)}%"></i></span></p>
   ${CATS.map(([id,name,desc])=>{const L=LIST.filter(p=>p.c===id);return `<section class="pz-cat" data-cat="${id}"><h3>${name}</h3><p>${desc}</p><div class="pz-list">${L.map(p=>`<button type="button" class="pz-item ${st.done[p.id]?'done':''}" data-id="${p.id}" aria-label="${p.t}${st.done[p.id]?', resuelto':''}"><span class="pz-thumb">${art(p)}${st.done[p.id]?'<i class="pz-tick">✓</i>':''}</span><em>${p.n?ROMAN(p.n):'✦'}</em><span><b>${p.t}</b><small>${st.done[p.id]?'Resuelto · '+stars(st.done[p.id]):'●'.repeat(p.d)+'○'.repeat(3-p.d)}</small></span></button>`).join('')}</div></section>`}).join('')}
   <p class="st-note">La primera vez que resuelves un acertijo ganas monedas y XP. Cada pista cuesta una estrella.</p>`;
   body.querySelectorAll('.pz-item').forEach(b=>b.onclick=()=>show(b.dataset.id,api));
   if(startId){const id=startId;startId=null;show(id,api)}
   else if(cat){const sec=body.querySelector(`[data-cat="${cat}"]`);cat=null;if(sec)setTimeout(()=>sec.scrollIntoView({block:'start'}),60)}
  });
 }
 function show(id,api){
  const body=api.body,p=byId(id);if(!p)return;let hints=0,errs=0;
  const i=LIST.indexOf(p),nextP=LIST.slice(i+1).concat(LIST.slice(0,i)).find(x=>!rd().done[x.id]);
  body.classList.add('pz');api.el.classList.add('pz-full','pz-solo');   // pantalla completa y sin cabecera: solo queda el botón de salir
  // 0.3.91: una sola página de manga: el dibujo, el texto en un cartel y la respuesta, todo dentro del mismo marco, para que quepa en el teléfono sin deslizar
  body.innerHTML=`<div class="pz-manga k-${p.k} p-${p.id}${p.q.length>300?' long':''}"><button type="button" class="pz-exit pz-back">✕ Salir</button>
  <figure class="pz-fig">${art(p)}</figure>
  <div class="pz-cap"><p class="pz-src">${src(p)}</p><p class="pz-q">${p.q}</p></div>
  <div class="pz-play"></div><div class="pz-hints"></div>
  <div class="pz-row pz-foot"><button type="button" class="pz-link" id="pzHint">Pedir una pista (${p.h.length})</button></div><div class="pz-end"></div></div>`;
  body.scrollTop=0;
  body.querySelector('.pz-back').onclick=()=>api.redraw();
  const hb=body.querySelector('#pzHint');
  hb.onclick=()=>{if(hints>=p.h.length)return;body.querySelector('.pz-hints').innerHTML=`<p class="pz-hint"><b>Pista ${hints+1}.</b> ${p.h[hints]}</p>`;hints++;snd('hint');hb.textContent=hints>=p.h.length?'No quedan pistas':`Pedir otra pista (${p.h.length-hints})`;hb.disabled=hints>=p.h.length};
  mount(body.querySelector('.pz-play'),p,{onError:()=>{errs++},onSolve:()=>{
   const st=rd(),first=!st.done[p.id],got=Math.max(1,3-hints-(errs>=3?1:0));
   st.done[p.id]=Math.max(st.done[p.id]||0,got);wr(st);hb.disabled=true;
   body.querySelector('.pz-hints').innerHTML='';body.querySelector('.pz-foot').hidden=true;if(['num','multi','choice','grid'].includes(p.k))body.querySelector('.pz-play').hidden=true;   // deja sitio a la explicación
   const coins=first?p.d*10:0;
   if(first){try{window.SudomiCoins&&SudomiCoins.add(coins,'Acertijo resuelto')}catch(_){}try{window.SudomiXP&&SudomiXP.award(p.d*10)}catch(_){}}
   snd(first?'win':'bonus');
   body.querySelector('.pz-end').innerHTML=`<div class="pz-solved"><p class="pz-stars" aria-label="${got} de 3 estrellas">${stars(got)}</p><p><b>Resuelto.</b> ${p.s}</p>${first?`<p class="pz-prize">+${coins} monedas · +${p.d*10} XP</p>`:''}
   ${nextP?'<div class="pz-row"><button type="button" class="pz-btn" id="pzNext">Siguiente acertijo</button></div>':''}</div>`;
   const nb=body.querySelector('#pzNext');if(nb)nb.onclick=()=>show(nextP.id,api);
   body.querySelector('.pz-end').scrollIntoView({block:'nearest',behavior:'smooth'});
  }});
 }
 function boot(){
  const dd=document.getElementById('homeDropdown'),b=document.getElementById('openPuzzles'),h=document.getElementById('homePuzzles');
  if(b)b.onclick=()=>{if(dd)dd.classList.add('hidden');const t=document.getElementById('homeMenuBtn');if(t)t.setAttribute('aria-expanded','false');open()};
  if(h)h.onclick=()=>open();
  const r=document.getElementById('homeRompe');if(r)r.onclick=()=>open(null,'ilus');   // 0.3.95: la portada lleva directo a los rompecabezas ilustrados
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
 window.SudomiPuzzles={open,mount,list:LIST,byId,source:src,solved:()=>Object.keys(rd().done),_river:RIVER};
})();
