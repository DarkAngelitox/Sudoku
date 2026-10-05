/* SUDOMI 0.2.36 — tutorials for "Otros juegos".
 * Every game has a short "Cómo se juega" (3–5 pages). DOS has TWO: "Cómo jugar" and "Cartas especiales" (every card, with the four
 * cards that only exist in SUDOMI marked as such, plus a little quiz). The texts follow the rules the code really implements
 * (js/other-games.js, js/extra-games.js, js/dos-game.js, js/stop-party.js).
 * The buttons are added from outside, so those files do not change: a MutationObserver puts "📘 Cómo se juega" in each game's mode picker,
 * and a 📘 button in each game's top bar (and in the DOS / STOP bars). Only reads; never touches a game in progress. */
(()=>{
 const $=s=>document.querySelector(s);
 const NAMES={mines:'Buscaminas',fleet:'Batalla naval',chess:'Ajedrez',checkers:'Damas',tictactoe:'Tres en raya',connect4:'4 en línea',domino:'Dominó',memory:'Memoria de animales',dotsboxes:'Puntos y cajas',stop:'STOP',mahjong:'Duelo Mahjong',blackjack:'Blackjack',poker:'Póker',escoba:'Escoba',rummy:'Rummy',slide:'Fichas deslizantes',dos:'DOS'};
 const ICON={mines:'💣',fleet:'🚢',chess:'♟️',checkers:'🔴',tictactoe:'❌',connect4:'🟡',domino:'🁣',memory:'🐾',dotsboxes:'▫️',stop:'🔤',mahjong:'🀄',blackjack:'🂡',poker:'🃏',escoba:'🃑',rummy:'🎴',slide:'🧩',dos:'🌪'};
 const ID_BY_NAME=Object.fromEntries(Object.entries(NAMES).map(([k,v])=>[v.toLowerCase(),k]));
 // ---- tiny drawing helpers
 const card=(c,t,x='')=>`<span class="tcard tc-${c} ${x}"><b>${t}</b></span>`;
 const ul=a=>`<ul class="tp-list">${a.map(x=>`<li>${x}</li>`).join('')}</ul>`;
 const note=t=>`<p class="tp-note">${t}</p>`;
 const mark=t=>`<span class="gt-own">✨ Exclusiva de SUDOMI</span>`;
 const board=(rows,cls='')=>`<div class="gt-board ${cls}" style="--c:${rows[0].length}">${rows.flat().map(x=>`<i class="${typeof x==='object'?x.c:''}">${typeof x==='object'?x.t:x}</i>`).join('')}</div>`;
 // quiz: question + options [text, correct?, why]
 let qid=0;
 const quiz=(q,opts)=>{const id='q'+(++qid);return `<div class="gq" data-q="${id}"><p class="tp-q"><b>${q}</b></p>${opts.map(([t,ok,why])=>`<button type="button" class="gq-o" data-ok="${ok?1:0}" data-why="${why.replace(/"/g,'&quot;')}">${t}</button>`).join('')}<p class="tp-fb gq-fb" aria-live="polite"></p></div>`};
 const bindQuiz=root=>root.querySelectorAll('.gq').forEach(q=>q.querySelectorAll('.gq-o').forEach(b=>b.onclick=()=>{
  const fb=q.querySelector('.gq-fb'),ok=b.dataset.ok==='1';fb.className='tp-fb gq-fb '+(ok?'good':'bad');fb.innerHTML=(ok?'✅ ¡Correcto! ':'❌ No exactamente. ')+b.dataset.why;
  if(ok)q.querySelectorAll('.gq-o').forEach(x=>x.classList.toggle('picked',x===b));
 }));
 const P=(title,html)=>({title,html});

 /* ================= DOS ================= */
 const dosBasic=[
  P('Objetivo',`<p class="tp-lead">DOS es un juego de cartas: <b>gana quien se quede sin cartas primero</b>.</p><div class="gt-hand">${card('r','7')}${card('b','2')}${card('g','⊘')}${card('y','5')}${card('k','★')}</div>
   <ul class="tp-list"><li>Cada jugador empieza con <b>7 cartas</b>.</li><li>Hay una carta boca arriba en el centro y un mazo para robar.</li><li>Cuando a alguien le quedan <b>2 cartas</b>, el juego avisa: <b>¡DOS!</b></li></ul>${note('Se juega contra la computadora o en una sala online de 2 a 8 jugadores.')}`),
  P('Tu turno: qué carta puedes tirar',`<p>Mira la carta del centro y el <b>color</b> activo. Puedes tirar una carta que tenga el <b>mismo color</b> o el <b>mismo número o símbolo</b>.</p>
   <p class="gt-center">Centro: ${card('r','7','big')}</p><div class="gt-hand">${card('r','3')}<span class="gt-chk">mismo color ✓</span></div><div class="gt-hand">${card('b','7')}<span class="gt-chk">mismo número ✓</span></div><div class="gt-hand">${card('g','4')}<span class="gt-chk bad">no coincide ✗</span></div><div class="gt-hand">${card('k','★')}<span class="gt-chk">el comodín siempre ✓</span></div>`),
  P('Practica',`<p>Carta del centro: ${card('b','5','big')} (color activo: <b>azul</b>).</p>`+quiz('¿Cuál de estas cartas NO puedes tirar?',[
   [card('b','8'),false,'La azul 8 es del mismo color.'],[card('r','5'),false,'La roja 5 tiene el mismo número.'],[card('g','9'),true,'La verde 9 no es azul ni es un 5.'],[card('k','+4'),false,'Los comodines negros se pueden tirar siempre.']])),
  P('Si no puedes tirar: robar',`<ul class="tp-list"><li>Si tienes <b>una carta que se puede tirar, tienes que tirarla</b>. No puedes robar para guardártela.</li><li>Si <b>no</b> tienes ninguna, toca el mazo para <b>robar una carta</b>.</li><li>Si la carta robada sirve, la puedes tirar. Si no, tu turno termina.</li></ul>${note('La única carta que puedes guardar aunque se pueda tirar es el 🛡 Parry: es para defenderte (lo verás en las cartas especiales).')}`),
  P('Cartas de acción',`<p>Algunas cartas hacen algo al siguiente jugador:</p><div class="gt-hand">${card('r','⊘')}<span>Salta: el siguiente pierde el turno.</span></div><div class="gt-hand">${card('b','⇄')}<span>Reversa: cambia el sentido. Entre dos jugadores funciona como Salta.</span></div><div class="gt-hand">${card('g','+2')}<span>+2: el siguiente roba 2 y pierde el turno.</span></div><div class="gt-hand">${card('k','★')}<span>Comodín: eliges el color.</span></div><div class="gt-hand">${card('k','+4')}<span>+4: eliges color; el siguiente roba 4 y pierde el turno.</span></div>${note('Hay cuatro cartas más, inventadas para SUDOMI. Las tienes en la segunda parte del tutorial: «Cartas especiales».')}`),
  P('Ganar',`<ul class="tp-list"><li>Quien tire su última carta <b>gana la partida</b>.</li><li>Jugar solo: es 1 contra 1 contra la computadora.</li><li>Online: de 2 a 8 jugadores. Los puestos vacíos los juega la computadora.</li><li>Con 6 o más jugadores se usan <b>dos barajas</b>.</li></ul><div class="tp-final"><button type="button" class="tp-btn big" data-goto="dos:1">✨ Ver las cartas especiales</button></div>`)
 ];
 const dosCards=[
  P('Todas las cartas',`<p>Ya conoces las cartas de colores. Aquí van <b>todas las especiales</b>. Las marcadas con ✨ son <b>exclusivas de SUDOMI</b>.</p>
   <table class="tp-table gt-tab"><tr><td>${card('r','⊘','sm')}</td><td><b>Salta</b></td><td>El siguiente pierde el turno</td></tr><tr><td>${card('b','⇄','sm')}</td><td><b>Reversa</b></td><td>Cambia el sentido</td></tr><tr><td>${card('g','+2','sm')}</td><td><b>+2</b></td><td>El siguiente roba 2</td></tr><tr><td>${card('k','★','sm')}</td><td><b>Comodín</b></td><td>Eliges el color</td></tr><tr><td>${card('k','+4','sm')}</td><td><b>+4</b></td><td>El siguiente roba 4</td></tr><tr><td>${card('k','⏪','sm')}</td><td><b>Rebobinar</b> ✨</td><td>Todos recuperan su última carta</td></tr><tr><td>${card('k','+2','sm super')}</td><td><b>Súper +2</b> ✨</td><td>Todos los demás roban 2</td></tr><tr><td>${card('k','🛡','sm parry')}</td><td><b>Parry</b> ✨</td><td>Devuelve el ataque</td></tr><tr><td>${card('k','🌪','sm')}</td><td><b>Tornado</b> ✨</td><td>Se mezclan todas las cartas</td></tr></table>`),
  P('Salta, Reversa y +2',`<div class="gt-hand">${card('r','⊘','big')}<span><b>Salta</b>: el siguiente jugador pierde su turno.</span></div><div class="gt-hand">${card('b','⇄','big')}<span><b>Reversa</b>: el juego cambia de sentido (si iba a la izquierda, va a la derecha). Con <b>solo dos jugadores</b> hace lo mismo que Salta.</span></div><div class="gt-hand">${card('g','+2','big')}<span><b>+2</b>: el siguiente roba 2 cartas y pierde el turno.</span></div>`),
  P('Comodín y +4',`<div class="gt-hand">${card('k','★','big')}<span><b>Comodín</b>: lo puedes tirar <b>siempre</b>, sobre cualquier carta. Tú eliges el nuevo color.</span></div><div class="gt-hand">${card('k','+4','big')}<span><b>+4</b>: también se tira siempre, eliges el color, y el siguiente roba <b>4 cartas</b> y pierde el turno.</span></div>`),
  P('Acumular +2 y +4',`<p>Si te tiran un <b>+2</b> o un <b>+4</b>, no tienes que robar enseguida: puedes <b>responder con tu propio +2 o +4</b> (de cualquier color).</p>
   <div class="gt-flow">${card('g','+2')}<i>→</i>${card('b','+2')}<i>→</i>${card('k','+4')}<i>→</i><span class="gt-sum">+8</span></div>
   <p>Se <b>suman</b> y le toca al siguiente, que también puede responder. Quien no responda <b>roba todas las cartas acumuladas</b> y pierde el turno.</p>${note('Mientras tengas un ataque pendiente solo puedes: aceptarlo, responder con un +2/+4 o usar un Parry.')}`),
  P('⏪ Rebobinar',`${mark()}<div class="gt-hand">${card('k','⏪','big')}<span>Eliges el color y el tiempo <b>retrocede</b>.</span></div><ul class="tp-list"><li>Cada jugador <b>recupera la última carta que tiró</b>.</li><li>Esa carta queda <b>bloqueada</b>: no se puede volver a usar en su próximo turno.</li><li>Los efectos que estaban por cumplirse (un +2, un Salta…) <b>se cancelan</b>.</li></ul>${note('Ideal cuando te tiran un +4: lo cancelas y además el que lo tiró recupera su carta.')}`),
  P('+2 Súper +2',`${mark()}<div class="gt-hand">${card('k','+2','big super')}<span>Eliges el color. <b>Todos los demás</b> jugadores roban 2 cartas.</span></div><ul class="tp-list"><li>Nadie pierde el turno.</li><li>Con 4 jugadores, ¡son 6 cartas repartidas de golpe!</li><li>Se puede detener con un 🛡 Parry.</li></ul>`),
  P('🛡 Parry',`${mark()}<div class="gt-hand">${card('k','🛡','big parry')}<span>Tu escudo.</span></div><ul class="tp-list"><li>Cuando te tiran <b>Salta, +2, +4 o Súper +2</b>, responde con Parry: <b>el efecto le regresa a quien lo tiró</b>.</li><li>Usarlo cuenta como tu jugada.</li><li>Es multicolor: también lo puedes tirar como una carta normal sobre cualquier color.</li><li>Es la única carta que puedes <b>guardar</b> aunque se pueda tirar.</li></ul>`),
  P('🌪 Tornado',`${mark()}<div class="gt-hand">${card('k','🌪','big')}<span>Eliges el color. ¡Todo se mezcla!</span></div><ol class="tp-steps"><li>Las cartas de <b>todos</b> se mezclan y van al centro <b>boca abajo</b>.</li><li>Empezando por quien tiró el Tornado, cada jugador <b>toma una carta por turno, sin saber cuál es</b>.</li><li>Sigue hasta que cada uno tenga <b>la misma cantidad</b> que tenía antes.</li></ol>${note('Si venías ganando con pocas cartas, el Tornado puede cambiarte las cartas por completo… ¡o regalarte las buenas!')}`),
  P('Cuántas especiales hay',`<ul class="tp-list"><li>Al repartir, <b>un jugador al azar</b> empieza con al menos una carta especial (Rebobinar, Súper +2, Parry o Tornado).</li><li>La baraja trae 4 Rebobinar, 4 Súper +2, 6 Parry y 4 Tornado.</li><li>Un Tornado que ya se jugó <b>no vuelve</b> al mazo, así que las partidas largas no se llenan de tornados.</li><li>Con la segunda baraja (6 o más jugadores) no hay más Rebobinar, Súper +2 ni Tornado.</li></ul>`),
  P('Reto: cartas especiales',quiz('Te tiran un +4. En tu mano tienes: 🛡 Parry, +2 verde y azul 3. ¿Cuál de estas jugadas NO puedes hacer?',[
    ['Responder con el +2 (se acumula)',false,'Sí puedes: tu +2 se suma y el total pasa al siguiente.'],['Usar el Parry',false,'Sí puedes: el +4 le regresa a quien lo tiró.'],['Tirar el azul 3',true,'Con un ataque pendiente solo puedes aceptarlo, acumular un +2/+4 o usar Parry.']])
   +quiz('Alguien te tiró un +2 y tú tiras Rebobinar. ¿Qué pasa?',[
    ['Robas 2 cartas igual',false,'No: Rebobinar cancela los efectos que estaban por cumplirse.'],['El +2 se cancela y cada jugador recupera su última carta',true,'Sí. Y la carta que recuperas queda bloqueada para tu siguiente turno.'],['Se reparten 2 cartas a todos',false,'Eso es el Súper +2.']])
   +quiz('¿Qué hace el Tornado?',[
    ['Mezcla las cartas de todos y cada uno toma de nuevo, a ciegas',true,'Exacto: las cartas van boca abajo al centro y cada jugador toma tantas como tenía.'],['Hace robar 4 cartas a todos',false,'No, eso lo haría un +4 (y solo a uno).'],['Cambia el sentido del juego',false,'Eso es la Reversa.']])
   +'<div class="tp-final"><button type="button" class="tp-btn big" data-close="1">🎴 ¡A jugar DOS!</button></div>')
 ];

 /* ================= other games ================= */
 const mk=(...p)=>p;
 const GAMES={
  dos:{parts:[{label:'1 · Cómo jugar',desc:'Lo básico: turnos, colores y cómo ganar',pages:dosBasic},{label:'2 · Cartas especiales',desc:'Todas las cartas, incluidas las exclusivas de SUDOMI',pages:dosCards}]},
  mines:mk(
   P('Objetivo',`<p class="tp-lead">Abre todas las casillas que <b>no</b> tienen mina. Si abres una mina, pierdes.</p>${board([['1','1','1','',''],['1','💣','1','',''],['1','1','1','',''],['','','','','']],'gt-mines')}${note('La primera casilla que abres siempre es segura.')}`),
   P('Los números',`<p>Cada número dice <b>cuántas minas hay en las 8 casillas que lo rodean</b>.</p><div class="gt-board gt-mines gt-nine" style="--c:3"><i class="h">?</i><i class="h">?</i><i class="h">?</i><i class="h">?</i><i class="n">2</i><i class="h">?</i><i class="h">?</i><i class="h">?</i><i class="h">?</i></div><p>Un <b>2</b> significa que, entre esas 8 casillas, hay 2 minas. Si ya descubriste dónde están, las demás son seguras.</p>${note('Si abres una casilla vacía (sin número), se abren sola las vecinas.')}`),
   P('Banderas',`${ul(['<b>Computadora:</b> clic derecho en una casilla para poner o quitar una 🚩.','<b>Teléfono:</b> activa el botón <b>🚩 Marcar bandera</b> y toca las casillas que crees que tienen mina.','Una casilla con bandera no se puede abrir por error.'])}`),
   P('Niveles y modos',`${ul(['Fácil 9×9 (10 minas) · Medio 12×12 (22) · Difícil 14×14 (35)','Experto 16×16 (50) · Maestro 16×16 (62) · Extremo 18×18 (80)','<b>Contra el reloj:</b> guarda tu mejor tiempo por nivel.','<b>Práctica:</b> sin cronómetro.'])}`)),
  fleet:mk(
   P('Objetivo',`<p class="tp-lead">Hunde <b>toda la flota enemiga</b> antes de que hundan la tuya.</p>${ul(['El tablero es de <b>8×8</b>.','Tu flota: Acorazado (4 casillas), Crucero (3), Submarino (3) y Patrullera (2).'])}<div class="gt-ships"><span>🚢 ▮▮▮▮</span><span>▮▮▮</span><span>▮▮▮</span><span>▮▮</span></div>`),
   P('1. Coloca tus barcos',`${ul(['Elige un barco, ajusta la orientación (horizontal o vertical) y toca el tablero.','No pueden salirse del tablero ni cruzarse entre sí.','Contra la computadora, ella coloca los suyos al azar. A dos jugadores en el mismo dispositivo, se pasan el aparato para colocar en secreto.'])}`),
   P('2. A disparar',`${ul(['Por turnos, toca una casilla del tablero enemigo.','Verás <b>¡Tocado!</b> si hay un barco o <b>Agua</b> si fallaste.','Cuando todas las casillas de un barco están tocadas, se hunde.','Gana quien hunda toda la flota rival.'])}${note('Truco: cuando aciertas, prueba las casillas de al lado para descubrir hacia dónde va el barco.')}`)),
  chess:mk(
   P('Objetivo',`<p class="tp-lead">Dar <b>jaque mate</b> al rey rival: atacarlo de modo que no pueda escapar.</p>${ul(['Juegan blancas y negras por turnos. Contra la computadora, tú llevas las blancas.','Si un jugador no tiene jugadas y su rey no está atacado, son <b>tablas</b> (empate).'])}`),
   P('Cómo se mueven',`<table class="tp-table gt-tab"><tr><td class="gt-pc">♙</td><td><b>Peón</b></td><td>Avanza 1 casilla (2 la primera vez) y captura en diagonal.</td></tr><tr><td class="gt-pc">♖</td><td><b>Torre</b></td><td>En línea recta, horizontal o vertical.</td></tr><tr><td class="gt-pc">♘</td><td><b>Caballo</b></td><td>En «L» y puede saltar piezas.</td></tr><tr><td class="gt-pc">♗</td><td><b>Alfil</b></td><td>En diagonal.</td></tr><tr><td class="gt-pc">♕</td><td><b>Dama</b></td><td>Como torre y alfil juntos.</td></tr><tr><td class="gt-pc">♔</td><td><b>Rey</b></td><td>1 casilla en cualquier dirección.</td></tr></table>`),
   P('Jaque y jaque mate',`${ul(['<b>Jaque:</b> tu rey está atacado. Tienes que salir del ataque (mover el rey, tapar o capturar al atacante).','<b>Jaque mate:</b> no hay forma de salir. Se acaba la partida.','No puedes hacer una jugada que deje tu propio rey en jaque.'])}`),
   P('Jugadas especiales',`${ul(['<b>Enroque:</b> el rey se mueve 2 casillas hacia una torre y la torre salta al otro lado, si ninguno se ha movido y no hay piezas ni jaques en medio.','<b>Coronación:</b> un peón que llega a la última fila se convierte en <b>dama</b> automáticamente.'])}`)),
  checkers:mk(
   P('Objetivo',`<p class="tp-lead">Captura todas las piezas del rival o déjalo sin jugadas.</p>${ul(['Rojas 🔴 contra negras ⚫.','Las piezas se mueven <b>en diagonal</b>, sobre las casillas oscuras.'])}`),
   P('Mover y capturar',`${ul(['Las piezas normales avanzan <b>una casilla en diagonal hacia adelante</b>.','Para capturar, <b>saltas</b> sobre una pieza contraria que tenga la casilla de detrás libre.','<b>La captura es obligatoria</b>: si puedes capturar, debes hacerlo.','Si después de capturar puedes seguir saltando, lo haces en la misma jugada (<b>saltos encadenados</b>).'])}`),
   P('Dama',`${ul(['Al llegar a la última fila, tu pieza se <b>corona</b> automáticamente.','La dama se mueve y captura en diagonal también <b>hacia atrás</b>.'])}${note('Sacrificar una pieza para obligar al rival a capturar es una táctica muy usada.')}`)),
  tictactoe:mk(
   P('Cómo se juega',`<p class="tp-lead">Consigue <b>tres símbolos seguidos</b> (horizontal, vertical o diagonal) antes que el rival.</p>${board([[{c:'x',t:'X'},{c:'o',t:'O'},''],['',{c:'x',t:'X'},{c:'o',t:'O'}],['','',{c:'x',t:'X'}]],'gt-ttt')}${ul(['Se turnan: tú pones una X, el otro una O.','Si se llenan las 9 casillas sin línea, es empate.','Cada partida empieza uno distinto, y el marcador se guarda.'])}`)),
  connect4:mk(
   P('Cómo se juega',`<p class="tp-lead">Forma una <b>línea de 4 fichas</b> del mismo color (horizontal, vertical o diagonal).</p>${ul(['El tablero tiene 7 columnas y 6 filas.','En tu turno eliges una <b>columna</b> y la ficha cae hasta el fondo o sobre otra ficha.','Si el tablero se llena sin línea de 4, es empate.'])}${note('Truco: las fichas del centro participan en más líneas posibles.')}`)),
  domino:mk(
   P('Objetivo',`<p class="tp-lead">Dominó para <b>4 jugadores en 2 parejas</b>: tú y tu compañero (el de enfrente) contra los otros dos.</p>${ul(['Se juega con el <b>doble seis</b> (28 fichas). Cada jugador recibe 7 y no hay pozo.','En la primera mano empieza quien tenga el <b>doble 6</b>, y esa es la única ficha que se puede jugar.','Se juega <b>de izquierda a derecha</b>: después de ti juega el de tu izquierda, luego tu compañero y luego el de tu derecha.','La pareja que primero llegue a <b>100 puntos</b> gana la partida.'])}`),
   P('Tu turno',`${ul(['Pon una ficha en <b>uno de los dos extremos</b> de la fila, con el mismo número. Si encaja en los dos, eliges el lado.','Toca una ficha de la mesa para verla en grande.','Si <b>no</b> tienes ninguna que encaje, toca <b>✋ Pasar</b> (suena como golpear la mesa).','Botella 🍾: toca para tomar. A los 5 tragos tus fichas se ven borrosas durante 2 turnos.'])}`),
   P('Cómo termina cada mano',`${ul(['Quien <b>se queda sin fichas</b> gana la mano para su pareja, que suma los puntos de <b>todas</b> las fichas que quedaron.','<b>Tranque:</b> si la mesa se cierra y nadie puede jugar, se anuncia quién trancó. Solo se comparan <b>quien trancó</b> y el jugador que <b>le sigue</b>: gana el que tenga <b>menos puntos</b> y su pareja suma esas dos manos.'])}`)),

  memory:mk(
   P('Cómo se juega',`<p class="tp-lead">Encuentra las <b>parejas de animales</b>.</p><div class="gt-hand gt-emojis"><span>🐶</span><span>🐱</span><span>🦊</span><span>🐶</span></div>${ul(['Hay 16 fichas: 8 parejas.','En tu turno volteas <b>dos fichas</b>.','Si son iguales, te las llevas y <b>juegas otra vez</b>.','Si no, se tapan y le toca al otro. ¡Memoriza dónde está cada una!','Gana quien reúna más parejas.'])}`)),
  dotsboxes:mk(
   P('Cómo se juega',`<p class="tp-lead">Cierra más <b>cuadros</b> que tu rival.</p>${ul(['Por turnos, une <b>dos puntos vecinos</b> con una línea.','Si con tu línea <b>cierras un cuadro</b>, ese cuadro es tuyo y <b>juegas otra vez</b>.','Gana quien termine con más cuadros.'])}${note('Truco: evita poner la tercera línea de un cuadro, porque le regalas el punto al rival.')}`)),
  stop:mk(
   P('Cómo se juega',`<p class="tp-lead">Sale una <b>letra</b> y <b>10 categorías</b>. Escribe una palabra que empiece con esa letra para cada categoría.</p>${ul(['Tienes <b>160 segundos</b>. Solo puedes tocar <b>¡STOP!</b> cuando las 10 casillas estén llenas, y la ronda <b>termina para todos</b>.','Si dices STOP, cada respuesta incorrecta tuya te quita <b>20 puntos</b> (el doble de lo que vale una buena).','La computadora también juega.'])}`),
   P('Votación y puntos',`${ul(['Después todos ven las respuestas. Toca las que no aceptas (❌). Si la <b>mayoría de los otros jugadores</b> la rechaza, vale 0.','<b>10 puntos</b> por respuesta válida que nadie más escribió.','<b>5 puntos</b> si otro escribió la misma.','<b>0</b> si está vacía, no empieza con la letra o fue rechazada.','Los puntos se suman ronda tras ronda.'])}`),
   P('Jugadores',`${ul(['Contra la máquina.','En una sala online de 2 a 8 jugadores (la IA ocupa los puestos vacíos).','Dos jugadores en el mismo teléfono.'])}`)),
  slide:mk(
   P('Objetivo',`<p class="tp-lead">Completa tus <b>6 columnas</b>: cada una con las <b>4 copias de la misma pieza</b>, todas boca arriba.</p>${ul(['Hay dos temas de 6 piezas cada uno (por ejemplo Frutas 🥭 y Música 🥁, o Banderas, Anime, Letras japonesas, Superhéroes…; en cada partida salen otros), con 4 copias de cada pieza, y un <b>comodín ★</b>.','Cada jugador pone 24 fichas boca abajo en <b>6 columnas de 4</b>. Solo juegas en tu lado del tablero.','Piedra, papel o tijera decide quién empieza y quién elige su set.'])}`),
   P('Tu turno',`<ol class="tp-steps"><li>Quien empieza pone el <b>comodín</b> encima de una de sus columnas: la columna se <b>desliza un espacio hacia abajo</b> y la última ficha <b>sale</b> y se voltea.</li><li>Si la ficha es de <b>tu set</b>, la pones encima de una de tus columnas (queda boca arriba). <b>Si ya tienes esa pieza boca arriba, solo puede ir en esa misma columna</b>; si es nueva, solo en una columna sin otras piezas boca arriba (en cada columna solo van piezas iguales). Eso empuja otra ficha y sigues jugando.</li><li>Si es del set del <b>rival</b>, se la pasas: él la pone encima de una de <b>sus</b> columnas y continúa.</li></ol>${note('El comodín cuenta como cualquier pieza de tu set.')}`),
   P('Cómo se gana',`${ul(['Una columna está lista cuando tiene <b>4 fichas iguales</b> boca arriba (el comodín puede reemplazar una).','Gana quien primero tenga sus <b>6 columnas completas</b>.','Truco: junta las fichas iguales en la misma columna y evita que se te salgan por abajo.'])}`)),
  mahjong:mk(
   P('Cómo se juega',`<p class="tp-lead">Quita <b>parejas de fichas iguales</b>. Gana quien reúna más parejas.</p>${ul(['El tablero tiene 40 fichas (20 parejas).','Solo puedes elegir fichas <b>libres</b>: con el <b>lado izquierdo o el derecho libre</b> y nada encima.','Elige una ficha libre y luego otra igual. Si coinciden, te llevas la pareja y pasa el turno.','La partida termina al despejar el tablero o cuando no quedan parejas libres.'])}`)),
  blackjack:mk(
   P('Objetivo',`<p class="tp-lead">Acércate a <b>21</b> sin pasarte, y supera a la banca.</p><div class="gt-hand">${card('r','A')}${card('b','K')}<span class="gt-sum">= 21</span></div>${ul(['Del 2 al 10 valen su número, las figuras valen 10 y el As vale 11 (o 1 si te pasarías).','Una mano de 21 con dos cartas te planta sola.'])}`),
   P('Tu turno',`${ul(['<b>Pedir:</b> recibes otra carta. Si pasas de 21, pierdes.','<b>Plantarte:</b> te quedas con lo que tienes.','Cuando ambos jugadores se plantan, la <b>banca</b> juega sola: roba hasta llegar a 17 o más.'])}${note('Dos jugadores juegan contra la misma banca.')}`),
   P('Quién gana',`${ul(['Superas a la banca si tu mano es mayor, o si la banca se pasa y tú no.','Si ambos superan a la banca, gana quien tenga la mano más alta.','Si te pasas de 21, pierdes aunque la banca se pase también.'])}`)),
  poker:mk(
   P('Cómo se juega',`<p class="tp-lead">Gana quien tenga la <b>mejor mano de 5 cartas</b>. No hay apuestas.</p>${ul(['Recibes 5 cartas.','Puedes <b>cambiar hasta 3 cartas</b> una sola vez: marca las que no quieres y confirma.','Luego se comparan las manos.'])}`),
   P('Las manos (de menor a mayor)',`<ol class="tp-steps gt-rank"><li>Carta alta</li><li>Pareja</li><li>Doble pareja</li><li>Trío</li><li>Escalera (5 seguidas)</li><li>Color (5 del mismo palo)</li><li>Full (trío + pareja)</li><li>Póker (4 iguales)</li><li>Escalera de color (y la Escalera real)</li></ol>${note('Si empatan en la categoría, gana la que tenga las cartas más altas.')}`)),
  escoba:mk(
   P('Objetivo',`<p class="tp-lead">Captura cartas de la mesa sumando <b>15</b>. Gana quien llegue primero a <b>11 puntos</b>.</p>${ul(['Se juega con baraja española: Oros, Copas, Espadas y Bastos.','Valores: del As al 7 valen su número; la <b>Sota 8</b>, el <b>Caballo 9</b> y el <b>Rey 10</b>.','Cada jugador tiene 3 cartas; en la mesa hay 4.'])}`),
   P('Tu turno',`<div class="gt-flow"><span class="gt-sum">7</span><i>+</i><span class="gt-sum">5</span><i>+</i><span class="gt-sum">3</span><i>=</i><span class="gt-sum ok">15 ✓</span></div>${ul(['Elige una carta de tu mano y las cartas de la mesa que, <b>junto con la tuya, sumen exactamente 15</b>. Te las llevas.','<b>Si puedes capturar, estás obligado a hacerlo.</b>','Si no puedes, dejas tu carta en la mesa.','Si limpias <b>toda</b> la mesa, haces una <b>🧹 escoba</b> (+1 punto), salvo en la última jugada.'])}`),
   P('Puntos de la ronda',`${ul(['Más cartas capturadas: 1 punto.','Más oros: 1 punto.','El 7 de oros: 1 punto.','Más sietes: 1 punto.','Cada escoba: 1 punto.','Las cartas que queden en la mesa al final se las lleva quien capturó último.'])}`)),
  rummy:mk(
   P('Objetivo',`<p class="tp-lead">Quédate sin cartas combinando grupos y escaleras.</p>${ul(['Cada jugador empieza con 7 cartas.','Combinaciones válidas: <b>grupo</b> (3 o 4 cartas del mismo número y palos distintos) o <b>escalera</b> (3 o más cartas seguidas del mismo palo; el As vale 1 o va después del Rey).'])}`),
   P('Tu turno',`<ol class="tp-steps"><li><b>Roba</b> una carta del mazo o toma la de arriba del <b>descarte</b>.</li><li><b>Baja</b> combinaciones: selecciona cartas y toca bajar. También puedes <b>agregar</b> una carta a una bajada, tuya o del rival.</li><li><b>Descarta</b> una carta. (No puedes devolver la que acabas de tomar del descarte.)</li></ol>`),
   P('Cómo se gana',`${ul(['Gana quien se quede <b>sin cartas</b>.','Si se acaba el mazo, gana quien tenga <b>menos puntos</b> en cartas sueltas (As 1, números su valor, figuras 10).'])}`))
 };
 // ---- overlay
 let root=null,cur=null;
 function build(){
  root=document.createElement('div');root.id='gtut';root.className='tut hidden';root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
  root.innerHTML='<div class="tut-card"><header><div class="tut-dots" aria-hidden="true"></div><button type="button" class="tut-x" aria-label="Cerrar">✕</button></header><h2 class="tut-title"></h2><div class="tut-body"></div><footer><button type="button" class="tut-prev">‹ Atrás</button><span class="tut-count"></span><button type="button" class="tut-next">Siguiente ›</button></footer></div>';
  document.body.appendChild(root);
  root.querySelector('.tut-x').onclick=close;
  root.querySelector('.tut-prev').onclick=()=>{if(cur.idx===0&&cur.multi){chooser();return}go(cur.idx-1)};
  root.querySelector('.tut-next').onclick=()=>cur.idx>=cur.pages.length-1?close():go(cur.idx+1);
  root.addEventListener('click',e=>{const t=e.target.closest('[data-goto],[data-close]');if(!t)return;if(t.dataset.close)return close();const [g,p]=t.dataset.goto.split(':');start(g,+p)});
  document.addEventListener('keydown',e=>{if(root.classList.contains('hidden'))return;if(e.key==='Escape')close();if(!cur||!cur.pages)return;if(e.key==='ArrowRight'&&cur.idx<cur.pages.length-1)go(cur.idx+1);if(e.key==='ArrowLeft'&&cur.idx>0)go(cur.idx-1)});
 }
 function show(){root.classList.remove('hidden');document.body.classList.add('tut-open')}
 function close(){if(root)root.classList.add('hidden');document.body.classList.remove('tut-open')}
 function chooser(){
  const g=GAMES[cur.id];cur.pages=null;
  root.querySelector('.tut-title').textContent=`${ICON[cur.id]} ${NAMES[cur.id]}: tutorial`;
  const body=root.querySelector('.tut-body');body.scrollTop=0;
  body.innerHTML=`<p>Este juego tiene dos partes. ¿Por cuál quieres empezar?</p><div class="gt-parts">${g.parts.map((p,i)=>`<button type="button" class="gt-part" data-goto="${cur.id}:${i}"><b>${p.label}</b><small>${p.desc}</small></button>`).join('')}</div>`;
  root.querySelector('.tut-dots').innerHTML='';root.querySelector('.tut-count').textContent='';
  root.querySelector('.tut-prev').style.visibility='hidden';root.querySelector('.tut-next').style.visibility='hidden';
 }
 function go(n){
  if(n<0||n>=cur.pages.length)return;cur.idx=n;const p=cur.pages[n];
  root.querySelector('.tut-title').textContent=p.title;
  const body=root.querySelector('.tut-body');body.innerHTML=p.html;body.scrollTop=0;bindQuiz(body);
  root.querySelector('.tut-dots').innerHTML=cur.pages.map((_,i)=>`<i class="${i===n?'on':i<n?'past':''}"></i>`).join('');
  root.querySelector('.tut-count').textContent=`${n+1} / ${cur.pages.length}`;
  const prev=root.querySelector('.tut-prev'),next=root.querySelector('.tut-next');
  prev.style.visibility=(n>0||cur.multi)?'visible':'hidden';next.style.visibility='visible';
  next.textContent=n===cur.pages.length-1?'Terminar ✓':'Siguiente ›';
 }
 function start(id,part){
  const g=GAMES[id];if(!g)return;if(!root)build();
  const parts=Array.isArray(g)?null:g.parts;
  cur={id,multi:!!parts,idx:0,pages:parts?parts[part].pages:g};
  show();go(0);
 }
 function open(id){
  const g=GAMES[id];if(!g)return;if(!root)build();
  if(!Array.isArray(g)){cur={id,multi:true,idx:0,pages:null};show();chooser();return}
  start(id,0);
 }
 // ---- buttons added from outside
 const link=id=>`<button type="button" class="gt-link" data-gt="${id}">📘 Cómo se juega</button>`;
 function inject(){
  const hub=$('#miniGamesScreen');if(!hub||hub.classList.contains('hidden'))return;
  const mp=hub.querySelector('.mode-picker');
  if(mp&&!mp.querySelector('.gt-link')){const id=ID_BY_NAME[(mp.querySelector('h2')||{}).textContent.trim().toLowerCase()];if(id){const c=mp.querySelector('.mode-choices');if(c)c.insertAdjacentHTML('afterend',link(id))}}
  hub.querySelectorAll('.mini-game-head .mini-game-actions').forEach(a=>{
   if(a.querySelector('.gt-mini'))return;const h=a.closest('.mini-game-head').querySelector('h2');const id=h&&ID_BY_NAME[h.textContent.trim().toLowerCase()];
   if(id)a.insertAdjacentHTML('afterbegin',`<button type="button" class="game-restart gt-mini" data-gt="${id}" aria-label="Cómo se juega" title="Cómo se juega">📘</button>`)});
  hub.querySelectorAll('.dos-head .dos-actions').forEach(a=>{
   if(a.querySelector('.gt-mini'))return;const h=a.closest('.dos-head').querySelector('h2');const id=h&&ID_BY_NAME[h.textContent.trim().toLowerCase()];
   if(id)a.insertAdjacentHTML('afterbegin',`<button type="button" class="game-restart gt-mini" data-gt="${id}" aria-label="Tutorial" title="Tutorial">📘</button>`)});
 }
 document.addEventListener('click',e=>{const b=e.target.closest('[data-gt]');if(b){e.preventDefault();e.stopPropagation();open(b.dataset.gt)}},true);
 function watch(){const s=$('#miniGamesScreen');if(!s)return;new MutationObserver(inject).observe(s,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});inject()}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
 window.SudomiGameTutorial={open,games:Object.keys(GAMES)};
})();
