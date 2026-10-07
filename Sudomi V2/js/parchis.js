/* SUDOMI 0.2.93 — PARCHIMI, el parchís de SUDOMI (window.SudomiParchis). De 2 a 4 jugadores: contra la máquina, en el mismo teléfono o en SALA ONLINE.
 * Dos formas de jugar: CLÁSICO y ⚔️ PARCHÍS GUERRA (g.war). Se abre con SudomiParchis.open({hub,stage,exit}, 'pve'|'pvp'|'online'|'join', código).
 *
 * TABLERO (dibujo del dueño): 68 casillas numeradas, 4 pasillos de color y 4 casas redondas, en un lienzo de 22×22 unidades
 *   (esquinas de 7×7, brazos de 8 casillas, 3 carriles de 8/3 de ancho). Las LÍNEAS DE COLOR son fijas; en el círculo de cada casa va la
 *   FOTO DE PERFIL (capa HTML, para que js/avatar-art.js ponga las fotos); el resto sale de un TEMA (THEMES).
 *
 * POSICIÓN de una ficha (g.pos[color][i]): -1 en casa · 0…63 anillo (0 = su salida) · 64…70 su pasillo · 71 meta ·
 *   100 + 10·h + s = casilla s (1…7) del PASILLO DE OTRO COLOR h (solo en guerra).
 * DOS DADOS: ruedan sobre el tablero (animDice). g.dice, g.used, g.opts = [{d: dado (-1 = contar 10/20), moves}] = jugadas posibles.
 *
 * ⚔️ GUERRA (0.2.93) — reglas en rulesHTML(true). En el código:
 *   · g.team[color] (4 jugadores = parejas 0+2 contra 1+3), g.hp (vidas, HPMAX), g.shield, g.cards, g.frozen, g.stats, g.duel.
 *   · tryMove(): cada vida perdida resta un paso al dado; no hay seguros; dos fichas del mismo equipo juntas no se pueden atacar.
 *   · caer sobre un rival = DUELO de piedra, papel o tijera (duel()). hallMoves() = atacar dentro del pasillo de un rival.
 *   · CARDS + cardTargets() + useCard() = las armas; se consiguen en las casillas grises. endWar() reparte los puntos.
 * ONLINE: manda el anfitrión (js/party-net.js + sala de js/lobby.js). Solo él corre run(); a los invitados les llega una copia del estado
 *   ({t:'s'}) y {t:'roll'}. El invitado solo envía {t:'roll'}, {t:'pick',d,m}, {t:'rps',v} y {t:'card',idx,t1,t2}.
 * El motor (tryMove / legal / run) no toca la pantalla; renderGame()/place()/update() solo dibujan. */
(()=>{
 const L=8/3,X1=7+L,X2=7+2*L;
 const COLORS=[
  {id:'y',name:'Amarillo',hex:'#ffcc00',ink:'#5b4300',start:5,nest:[18.6,18.6],goal:[11,12.7]},
  {id:'b',name:'Azul',hex:'#003399',ink:'#fff',start:22,nest:[18.6,3.4],goal:[12.7,11]},
  {id:'r',name:'Rojo',hex:'#ff0000',ink:'#fff',start:39,nest:[3.4,3.4],goal:[11,9.3]},
  {id:'g',name:'Verde',hex:'#00dd00',ink:'#063b06',start:56,nest:[3.4,18.6],goal:[9.3,11]}
 ];
 const SAFE=new Set([5,12,17,22,29,34,39,46,51,56,63,68]),EXITS={5:0,22:1,39:2,56:3},ENTRY=[68,17,34,51],RING_LAST=63,GOAL=71,HPMAX=3,HAND=2;
 const ORDER={2:[0,2],3:[0,1,2],4:[0,1,2,3]};
 /* ---- temas: solo cambian lo que NO es línea de color ---- */
 const THEMES={
  // safe = el gris de las zonas seguras (lleva dos puntos blancos encima, así que no puede ser muy claro)
  clasico:{name:'Clásico',bg:'#ffffff',cell:'#ffffff',line:'#111111',num:'#111111',safe:'#9aa0a8',nest:'#ffffff'},
  noche:{name:'Noche',bg:'#0f1626',cell:'#1b2740',line:'#6f83a8',num:'#c9d6ee',safe:'#5b6680',nest:'#0f1626'},
  madera:{name:'Madera',bg:'#e9c891',cell:'#f6e2bd',line:'#6a4317',num:'#4a2c0c',safe:'#9c8f7c',nest:'#f6e2bd'},
  // 0.2.92: fondos dominicanos
  playa:{name:'Playa de Punta Cana',bg:'#7fd6dc',cell:'#fff3d6',line:'#0f6f7a',num:'#0b4d55',safe:'#8aa0a3',nest:'#fff8e6'},
  larimar:{name:'Larimar',bg:'#bfe6f2',cell:'#e9f8fc',line:'#2f86a6',num:'#1c5870',safe:'#8fa3ad',nest:'#f4fcff'},
  ambar:{name:'Ámbar',bg:'#e8a23a',cell:'#ffe3ad',line:'#8a4b0a',num:'#5e3104',safe:'#a3927b',nest:'#fff0cf'},
  malecon:{name:'Atardecer en el Malecón',bg:'#f08a5d',cell:'#ffd9c2',line:'#7a2c4a',num:'#5a1e36',safe:'#a08e96',nest:'#ffe9dc'},
  cibao:{name:'Campo del Cibao',bg:'#7fb069',cell:'#eef6dc',line:'#2f5d2a',num:'#234a1f',safe:'#8f9b8a',nest:'#f6fbe9'},
  colonial:{name:'Zona Colonial',bg:'#c9b79c',cell:'#f1e7d3',line:'#5b4a36',num:'#3e3122',safe:'#978c7e',nest:'#f8f1e2'},
  carnaval:{name:'Carnaval',bg:'#5b2a86',cell:'#fff4c7',line:'#3b145c',num:'#3b145c',safe:'#8f869c',nest:'#fff9de'}
 };
 /* ---- armas de Parchís guerra. t = a quién se apunta: foe (ficha rival) · pair (pareja rival) · own · hurt (propia herida) · swap (propia y luego rival) · null */
 const CARDS={
  bomba:{e:'💣',n:'Bomba',d:'Quita 2 vidas a una ficha rival que esté sola.',t:'foe'},
  chancla:{e:'👡',n:'Chancletazo',d:'Quita 2 vidas a cada ficha de una pareja rival.',t:'pair'},
  machete:{e:'🗡️',n:'Machete',d:'Quita 1 vida a cualquier ficha rival, aunque esté en pareja.',t:'any'},
  ciclon:{e:'🌪️',n:'Ciclón',d:'Manda una ficha rival de vuelta a su salida.',t:'foe'},
  hielo:{e:'❄️',n:'Hielo',d:'Un rival pierde su próximo turno.',t:'player'},
  cambio:{e:'🔄',n:'Cambiazo',d:'Cambia de lugar una ficha tuya con una rival que esté detrás de ella.',t:'swap'},
  escudo:{e:'🛡️',n:'Escudo',d:'Una ficha tuya no puede ser atacada durante 2 turnos.',t:'own'},
  curita:{e:'🩹',n:'Mamajuana',d:'Cura todas las vidas de una ficha tuya.',t:'hurt'},
  turbo:{e:'⚡',n:'Turbo',d:'Tu próximo dado vale el doble.',t:null},
  motoconcho:{e:'🛵',n:'Motoconcho',d:'Saca una ficha tuya de casa sin necesitar un 5.',t:null}
 };
 const CARD_KEYS=Object.keys(CARDS),RPS={r:'✊',p:'✋',s:'✌️'},RPS_N={r:'piedra',p:'papel',s:'tijera'};
 const TKEY='sudomi-parchis-theme',GAME='parchis';
 const NAME='Parchimi';   // nombre propio del juego (el id interno y los enlaces de sala siguen siendo «parchis»). Para cambiarlo: aquí y en la lista `games` de other-games.js
 const AI=[['Pavel','🦉'],['Cristal','🐼'],['Harly','🦊'],['Maicol','🐧'],['Edwin','🐸'],['Carmelis','🐰']];
 const esc=t=>String(t).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const clean=n=>String(n||'').replace(/[<>&"']/g,'').replace(/\s+/g,' ').trim().slice(0,14);
 const P=()=>window.SudomiProfile;
 const myName=()=>(P()&&P().name&&P().name())||'Jugador 1',myAvatar=()=>(P()&&P().avatar&&P().avatar())||'🙂';
 let ui=null,g=null,token=0,mode='pve',selDie=0,rollTok=0,rolling=false,aim=null,choice=null;
 const waits=new Map();   // lo que el motor está esperando de una persona: 'roll:c', 'pick:c', 'rps:c'
 const net={role:'solo',room:null,conn:null,code:'',seats:[],me:0,started:false,status:'',tok:0};
 const setup={n:4,war:false,n4:2,theme:(()=>{try{const t=localStorage.getItem(TKEY);return THEMES[t]?t:'clasico'}catch(_){return 'clasico'}})()};
 const $=s=>ui.stage.querySelector(s);
 function play(n){try{window.SudomiSound&&SudomiSound.play(n)}catch(_){}if(net.role==='host')bcast({t:'snd',n})}

 /* ================= motor ================= */
 const ringSq=(c,p)=>((COLORS[c].start-1+p)%68)+1;
 const fh=p=>Math.floor((p-100)/10),fs=p=>(p-100)%10;
 const keyOf=(c,p)=>p<0?'n'+c:p>=100?'c'+fh(p)+'-'+fs(p):p<=RING_LAST?'r'+ringSq(c,p):p<GOAL?'c'+c+'-'+(p-RING_LAST):'g'+c;
 // la casilla `key` vista por el color c (o null si esa casilla no está en su camino)
 function posFromKey(c,key){
  if(key[0]==='r'){const p=(+key.slice(1)-COLORS[c].start+68)%68;return p<=RING_LAST?p:null}
  if(key[0]==='c'){const [h,s]=key.slice(1).split('-').map(Number);return h===c?RING_LAST+s:100+h*10+s}
  return null;
 }
 function at(key){const o=[];for(const c of g.players)g.pos[c].forEach((p,i)=>{if(keyOf(c,p)===key)o.push({c,i})});return o}
 const foeOf=(c,o)=>g.team[o.c]!==g.team[c],shielded=o=>g.war&&g.shield[o.c][o.i]>0;
 const ko=(c,i)=>g.war&&(g.hp[c][i]<=0||g.hp[c][i]===1.5);   // ficha que se quedó sin vidas y todavía no terminó de curarse
 const stepsOf=(c,i,k,bonus)=>g.war&&!bonus?Math.max(1,k-(HPMAX-g.hp[c][i])):k;   // guerra: cada vida perdida es un paso menos
 // una jugada posible de la ficha i, o null. bonus = se está contando 10 o 20 (con eso no se puede salir de casa)
 function tryMove(c,i,k,bonus){
  const p=g.pos[c][i],W=g.war;if(p===GOAL)return null;
  const mk=(path,x)=>({c,i,from:p,to:path[path.length-1],path,capture:null,duel:null,...x});
  if(p<0){
   if(bonus||k!==5)return null;
   if(W&&g.hp[c][i]<=0)return mk([-1],{heal:true});   // sin vidas: el primer 5 solo la cura a medias (1½); con el segundo sale
   const occ=at('r'+COLORS[c].start);
   if(W){
    if(!occ.some(o=>foeOf(c,o)))return occ.length<2?mk([0]):null;
    return occ.length===1&&!shielded(occ[0])?mk([0],{duel:occ[0]}):null;   // un rival solo en mi salida: duelo
   }
   if(occ.length<2)return mk([0]);
   if(occ.every(o=>o.c===c))return null;                                // mi propia barrera tapa la salida
   return mk([0],{capture:occ.filter(o=>o.c!==c).pop()});               // salida ocupada: me como una ficha rival
  }
  const s=stepsOf(c,i,k,bonus);
  if(p>=100){   // dentro del pasillo de otro color: avanzo y, al llegar al final, vuelvo a mi salida
   const h=fh(p),f=fs(p),path=[];
   for(let q=f+1;q<=Math.min(f+s,7);q++){
    const occ=at('c'+h+'-'+q);if(occ.length===2)return null;
    path.push(100+h*10+q);
    if(q===f+s&&occ.length===1&&foeOf(c,occ[0]))return shielded(occ[0])?null:mk(path,{duel:occ[0]});
   }
   if(f+s>=8){path.push(0);return mk(path,{back:true})}
   return mk(path);
  }
  const t=p+s;if(t>GOAL)return null;
  const path=[];let capture=null,duel=null;
  for(let q=p+1;q<=t;q++){
   path.push(q);if(q===GOAL)break;
   const occ=at(keyOf(c,q)),ring=q<=RING_LAST;
   if(occ.length===2&&(W||ring)&&g.team[occ[0].c]===g.team[occ[1].c])return null;   // pareja / barrera: nadie pasa
   if(q===t){
    if(occ.length>=2)return null;                                       // casilla llena
    if(occ.length===1&&foeOf(c,occ[0])){
     if(W){if(shielded(occ[0]))return null;duel=occ[0]}
     else if(ring&&!SAFE.has(ringSq(c,q)))capture=occ[0];
    }
   }
  }
  return mk(path,{capture,duel});
 }
 // guerra: doblar hacia el pasillo de un rival para atacar a la ficha que está justo en esa casilla
 function hallMoves(c,i,k){
  const p=g.pos[c][i],out=[];if(!g.war||p<0||p>RING_LAST)return out;
  const s=stepsOf(c,i,k,false);
  for(const h of g.players){
   if(g.team[h]===g.team[c])continue;
   const pe=(ENTRY[h]-COLORS[c].start+68)%68;if(pe>RING_LAST||pe<p||pe>=p+s)continue;
   const r=s-(pe-p);if(r<1||r>7)continue;
   const path=[];let ok=true;
   for(let q=p+1;ok&&q<=pe;q++){if(at(keyOf(c,q)).length===2)ok=false;else path.push(q)}
   for(let q=1;ok&&q<r;q++){if(at('c'+h+'-'+q).length===2)ok=false;else path.push(100+h*10+q)}
   if(!ok)continue;
   const occ=at('c'+h+'-'+r);
   if(occ.length===1&&foeOf(c,occ[0])&&!shielded(occ[0])){path.push(100+h*10+r);out.push({c,i,from:p,to:100+h*10+r,path,capture:null,duel:occ[0],hall:h})}
  }
  return out;
 }
 // breakBarrier: con pareja de dados, la primera jugada tiene que abrir una barrera propia si hay alguna que se pueda mover
 function legal(c,k,bonus,breakBarrier){
  let m=[];for(let i=0;i<g.pos[c].length;i++){const x=tryMove(c,i,k,bonus);if(x)m.push(x);if(!bonus)m.push(...hallMoves(c,i,k))}
  if(!bonus&&k===5){const out=m.filter(x=>x.from<0);if(out.length)return out}                      // con 5 es obligatorio sacar ficha
  if(!bonus&&breakBarrier&&!g.war){const br=m.filter(x=>x.from>=0&&x.from<=RING_LAST&&at(keyOf(c,x.from)).filter(o=>o.c===c).length===2);if(br.length)return br}
  return m;
 }
 // hace daño a una ficha; devuelve true si se quedó sin vidas (vuelve a casa, curada). by = color que hizo el daño
 function damage(c,i,n,by){
  if(g.shield[c][i]>0||g.pos[c][i]<0||g.pos[c][i]===GOAL)return false;
  const d=Math.min(n,g.hp[c][i]);g.hp[c][i]-=d;g.stats[c].taken+=d;if(by!=null)g.stats[by].dmg+=d;
  if(g.hp[c][i]>0)return false;
  g.pos[c][i]=-1;g.hp[c][i]=0;g.shield[c][i]=0;if(by!=null)g.stats[by].kills++;return true;   // sin vidas: a casa, y hacen falta dos 5 para volver a salir
 }
 /* ---- armas ---- */
 function cardTargets(c,key,first){
  const all=[];for(const o of g.players)g.pos[o].forEach((p,i)=>all.push({c:o,i,p}));
  const on=x=>x.p>=0&&x.p!==GOAL,foe=x=>g.team[x.c]!==g.team[c],sh=x=>g.shield[x.c][x.i]>0,paired=x=>on(x)&&at(keyOf(x.c,x.p)).length===2,ring=x=>x.p>=0&&x.p<=RING_LAST;
  switch(CARDS[key]&&CARDS[key].t){
   case 'foe':return all.filter(x=>foe(x)&&on(x)&&!sh(x)&&!paired(x)&&(key!=='ciclon'||(ring(x)&&x.p>0&&!at('r'+COLORS[x.c].start).some(o=>foeOf(x.c,o)))));
   case 'any':return all.filter(x=>foe(x)&&on(x)&&!sh(x));
   case 'pair':return all.filter(x=>foe(x)&&paired(x)&&!sh(x));
   case 'player':return all.filter(x=>foe(x)&&!g.frozen[x.c]);
   case 'own':return all.filter(x=>x.c===c&&on(x)&&!sh(x));
   case 'hurt':return all.filter(x=>x.c===c&&on(x)&&g.hp[x.c][x.i]<HPMAX);
   case 'swap':
    if(!first)return all.filter(x=>x.c===c&&ring(x)&&!paired(x));
    return all.filter(x=>foe(x)&&ring(x)&&!sh(x)&&!paired(x)&&posFromKey(c,keyOf(x.c,x.p))!=null&&posFromKey(c,keyOf(x.c,x.p))<g.pos[c][first.i]&&posFromKey(x.c,keyOf(c,g.pos[c][first.i]))!=null);   // 0.2.94: solo con fichas rivales que están DETRÁS de la tuya
   default:return [];
  }
 }
 const cardUsable=(c,key)=>key==='turbo'?g.pos[c].some(p=>p>=0&&p!==GOAL):key==='motoconcho'?g.pos[c].some((p,i)=>p<0&&!ko(c,i))&&!at('r'+COLORS[c].start).some(o=>foeOf(c,o))&&at('r'+COLORS[c].start).length<2:cardTargets(c,key).length>0;
 function useCard(c,idx,t1,t2){
  if(!g||!g.war||g.over||!g.cards[c]||(g.phase!=='roll'&&g.phase!=='pick'))return false;   // 0.2.94: en cualquier momento, sea o no tu turno
  const key=g.cards[c][idx],C=CARDS[key];if(!C)return false;
  const ok=(list,t)=>t&&list.some(x=>x.c===t.c&&x.i===t.i);
  let text='';
  if(C.t==='swap'){
   if(!ok(cardTargets(c,key),t1)||!ok(cardTargets(c,key,t1),t2))return false;
   const a=posFromKey(c,keyOf(t2.c,g.pos[t2.c][t2.i])),b=posFromKey(t2.c,keyOf(c,g.pos[c][t1.i]));g.pos[c][t1.i]=a;g.pos[t2.c][t2.i]=b;text=`cambió de lugar con una ficha de ${nm(t2.c)}`;
  }else if(C.t){
   if(!ok(cardTargets(c,key),t1))return false;
   if(key==='bomba')text=damage(t1.c,t1.i,2,c)?`mandó a casa una ficha de ${nm(t1.c)}`:`le quitó 2 vidas a una ficha de ${nm(t1.c)}`;
   else if(key==='machete')text=damage(t1.c,t1.i,1,c)?`mandó a casa una ficha de ${nm(t1.c)}`:`le quitó 1 vida a una ficha de ${nm(t1.c)}`;
   else if(key==='chancla'){at(keyOf(t1.c,g.pos[t1.c][t1.i])).forEach(o=>damage(o.c,o.i,2,c));text=`le dio a una pareja de ${nm(t1.c)}: 2 vidas menos cada una`}
   else if(key==='ciclon'){g.pos[t1.c][t1.i]=0;text=`mandó una ficha de ${nm(t1.c)} de vuelta a su salida`}
   else if(key==='hielo'){g.frozen[t1.c]=true;text=`congeló a ${nm(t1.c)}: pierde su próximo turno`}
   else if(key==='escudo'){g.shield[c][t1.i]=2;text='protegió una ficha por 2 turnos'}
   else if(key==='curita'){g.hp[c][t1.i]=HPMAX;text='curó una ficha'}
  }else{
   if(!cardUsable(c,key))return false;
   if(key==='turbo'){g.turbo[c]=true;text='su próximo dado vale el doble'}
   else{const i=g.pos[c].findIndex((p,k)=>p<0&&!ko(c,k));g.pos[c][i]=0;text='sacó una ficha de casa'}
  }
  g.cards[c].splice(idx,1);aim=null;g.fx={id:Date.now()+Math.random(),key,text:`${nm(c)} ${text}`};play('bonus');place();
  const redo=g.phase==='pick';say(`${C.e} ${nm(c)} usó ${C.n}: ${text}`);
  if(redo)answer('pick',g.players[g.turn],'redo');   // el tablero cambió: se vuelven a calcular las jugadas de quien estaba eligiendo
  return true;
 }
 // la computadora: puntúa cada jugada y elige la mejor
 const prog=p=>p>=100?40:p;
 function danger(c,p){   // ¿cuántas fichas rivales tienen esta casilla a tiro de dado?
  if(p<0||p>RING_LAST||(!g.war&&SAFE.has(ringSq(c,p))))return 0;
  const sq=ringSq(c,p);let n=0;
  for(const o of g.players)if(g.team[o]!==g.team[c])g.pos[o].forEach(q=>{if(q>=0&&q<=RING_LAST){const d=(sq-ringSq(o,q)+68)%68;if(d>=1&&d<=12&&q+d<=RING_LAST)n++}});
  return n;
 }
 function score(c,m){
  if(m.heal)return 30+Math.random()*4;
  let s=Math.random()*4+(prog(m.to)-prog(m.from))*.4;
  if(m.capture)s+=90+g.pos[m.capture.c][m.capture.i];
  if(m.duel)s+=18+prog(g.pos[m.duel.c][m.duel.i])*.5+(g.hp[c][m.i]-g.hp[m.duel.c][m.duel.i])*10+(m.hall!=null?12:0);
  if(m.to===GOAL)s+=70;else if(m.to>RING_LAST&&m.to<100)s+=18;
  if(m.from<0)s+=45;
  if(m.to<=RING_LAST&&m.to>=0){
   const sq=ringSq(c,m.to);
   if(g.war){if(SAFE.has(sq)&&EXITS[sq]==null&&g.cards[c].length<HAND)s+=22}else if(SAFE.has(sq))s+=16;
   if(at(keyOf(c,m.to)).some(o=>!foeOf(c,o)))s+=g.war?24:14;
   s-=danger(c,m.to)*(12+m.to*.4);
  }
  if(m.from>=0&&m.from<=RING_LAST)s+=danger(c,m.from)*(9+m.from*.3);
  return s;
 }
 function aiPick(c,opts){let best=null,bs=-1e9;for(const o of opts)for(const m of o.moves){const s=score(c,m);if(s>bs){bs=s;best={d:o.d,m}}}return best}
 function aiCard(c){
  for(let idx=0;idx<g.cards[c].length;idx++){
   const key=g.cards[c][idx],C=CARDS[key];if(!cardUsable(c,key))continue;
   if(!C.t)return useCard(c,idx);
   const far=l=>l.slice().sort((a,b)=>prog(b.p)-prog(a.p))[0];
   if(C.t==='swap'){   // solo vale la pena si el rival pierde mucho más camino del que pierdo yo
    let best=null,bg=14;
    for(const own of cardTargets(c,key))for(const foe of cardTargets(c,key,own)){const gain=(foe.p-posFromKey(foe.c,keyOf(c,own.p)))-(own.p-posFromKey(c,keyOf(foe.c,foe.p)));if(gain>bg){bg=gain;best=[own,foe]}}
    if(!best)continue;return useCard(c,idx,best[0],best[1]);
   }
   const list=cardTargets(c,key);if(!list.length)continue;
   return useCard(c,idx,far(list));
  }
  return false;
 }

 /* ================= dibujo ================= */
 function cell(n){   // forma de la casilla n: {r:[x,y,w,h]} o {p:'puntos'}
  if(n<=7)return {r:[X2,22-n,L,1]};if(n===8)return {p:`${X2},14 14,14 15,15 ${X2},15`};
  if(n===9)return {p:`14,${X2} 15,${X2} 15,15 14,14`};if(n<=16)return {r:[14+(n-9),X2,1,L]};
  if(n===17)return {r:[21,X1,1,L]};
  if(n<=24)return {r:[21-(n-18),7,1,L]};if(n===25)return {p:`15,7 15,${X1} 14,${X1} 14,8`};
  if(n===26)return {p:`${X2},7 15,7 14,8 ${X2},8`};if(n<=33)return {r:[X2,7-(n-26),L,1]};
  if(n===34)return {r:[X1,0,L,1]};
  if(n<=41)return {r:[7,n-35,L,1]};if(n===42)return {p:`7,7 ${X1},7 ${X1},8 8,8`};
  if(n===43)return {p:`7,7 8,8 8,${X1} 7,${X1}`};if(n<=50)return {r:[7-(n-43),7,1,L]};
  if(n===51)return {r:[0,X1,1,L]};
  if(n<=58)return {r:[n-52,X2,1,L]};if(n===59)return {p:`7,${X2} 8,${X2} 8,14 7,15`};
  if(n===60)return {p:`8,14 ${X1},14 ${X1},15 7,15`};if(n<=67)return {r:[7,14+(n-60),L,1]};
  return {r:[X1,21,L,1]};
 }
 function center(n){
  if(n<=8)return [X2+L/2,22.5-n];if(n<=16)return [14.5+(n-9),X2+L/2];if(n===17)return [21.5,11];
  if(n<=25)return [21.5-(n-18),7+L/2];if(n<=33)return [X2+L/2,7.5-(n-26)];if(n===34)return [11,.5];
  if(n<=42)return [7+L/2,n-34.5];if(n<=50)return [7.5-(n-43),7+L/2];if(n===51)return [.5,11];
  if(n<=59)return [n-51.5,X2+L/2];if(n<=67)return [7+L/2,14.5+(n-60)];return [11,21.5];
 }
 const wide=n=>n<=8||(n>=26&&n<=42)||n>=60;      // casillas anchas (brazos de arriba y abajo): dos fichas se ponen lado a lado
 const hall=(c,s)=>c===0?[X1,21-s,L,1]:c===1?[21-s,X1,1,L]:c===2?[X1,s,L,1]:[s,X1,1,L];
 const hallC=(c,s)=>c===0?[11,21.5-s]:c===1?[21.5-s,11]:c===2?[11,.5+s]:[.5+s,11];
 function numAt(n){const [x,y]=center(n);
  if(n===17||n===51)return [x,y-.85,'middle'];if(n===34||n===68)return [x-.85,y+.18,'middle'];
  if(n<=8||(n>=26&&n<=33))return [14.75,y+.18,'end'];if((n>=35&&n<=42)||n>=60)return [7.25,y+.18,'start'];
  if(n<=16||(n>=52&&n<=59))return [x,14.78,'middle'];return [x,7.55,'middle'];
 }
 function boardSVG(war){
  const shape=(s,fill)=>s.r?`<rect x="${s.r[0]}" y="${s.r[1]}" width="${s.r[2]}" height="${s.r[3]}" fill="${fill}"/>`:`<polygon points="${s.p}" fill="${fill}"/>`;
  let h='';
  // las zonas seguras son casillas grises con dos puntos blancos; las salidas siguen de su color. En guerra las grises son las cajas de armas
  for(let n=1;n<=68;n++){const ex=EXITS[n];h+=shape(cell(n),ex!=null?COLORS[ex].hex:SAFE.has(n)?'var(--pc-safe)':'var(--pc-cell)')}
  COLORS.forEach((C,c)=>{for(let s=1;s<=7;s++){const r=hall(c,s);h+=`<rect x="${r[0]}" y="${r[1]}" width="${r[2]}" height="${r[3]}" fill="${C.hex}"/>`}});
  h+=`<rect x="15" y="17" width=".5" height="1" fill="${COLORS[0].hex}" stroke="none"/><rect x="17" y="6.5" width="1" height=".5" fill="${COLORS[1].hex}" stroke="none"/><rect x="6.5" y="4" width=".5" height="1" fill="${COLORS[2].hex}" stroke="none"/><rect x="4" y="15" width="1" height=".5" fill="${COLORS[3].hex}" stroke="none"/>`;
  COLORS.forEach(C=>{h+=`<circle cx="${C.nest[0]}" cy="${C.nest[1]}" r="3" fill="var(--pc-nest)" stroke="${C.hex}" stroke-width=".85"/>`});
  h+=`<polygon points="8,8 14,8 11,11" fill="${COLORS[2].hex}"/><polygon points="14,8 14,14 11,11" fill="${COLORS[1].hex}"/><polygon points="14,14 8,14 11,11" fill="${COLORS[0].hex}"/><polygon points="8,14 8,8 11,11" fill="${COLORS[3].hex}"/>`;
  let marks='';
  for(let n=1;n<=68;n++){const [x,y]=center(n),[tx,ty,a]=numAt(n);
   if(EXITS[n]!=null)marks+=`<circle cx="${x}" cy="${y}" r=".34" fill="#fff" stroke="var(--pc-line)" stroke-width=".04"/>`;
   else if(SAFE.has(n)){
    if(war)marks+=`<text class="pc-box" x="${x}" y="${y+.3}" text-anchor="middle">🎁</text>`;
    else{const w=wide(n)||n===34||n===68,dx=w?.55:0,dy=w?0:.55;marks+=`<circle cx="${x-dx}" cy="${y-dy}" r=".24" fill="#fff"/><circle cx="${x+dx}" cy="${y+dy}" r=".24" fill="#fff"/>`}
   }
   marks+=`<text x="${tx}" y="${ty}" text-anchor="${a}">${n}</text>`}
  return `<svg class="pc-svg" viewBox="-.06 -.06 22.12 22.12" aria-hidden="true"><rect x="0" y="0" width="22" height="22" fill="var(--pc-bg)" stroke="none"/><g stroke="var(--pc-line)" stroke-width=".05" stroke-linejoin="round">${h}<rect x="0" y="0" width="22" height="22" fill="none" stroke-width=".1"/></g><g class="pc-marks">${marks}</g></svg>`;
 }
 const pct=v=>(v/22*100).toFixed(3)+'%';
 function spot(c,i){   // dónde se dibuja la ficha i del color c
  const p=g.pos[c][i],C=COLORS[c],N=g.pos[c].length;
  if(p<0){const a=((g.war?0:45)+360/N*i)*Math.PI/180;/* en guerra las esquinas son para las cartas */return [C.nest[0]+Math.cos(a)*3,C.nest[1]+Math.sin(a)*3]}
  if(p===GOAL){const d=[[-.75,-.35],[.75,-.35],[-.75,.5],[.75,.5]][i],v=c===1||c===3;return [C.goal[0]+(v?d[1]:d[0]),C.goal[1]+(v?d[0]:d[1])]}
  const key=keyOf(c,p),occ=at(key),j=occ.findIndex(o=>o.c===c&&o.i===i),off=occ.length>1?(j===0?-.55:.55):0;
  if(p<=RING_LAST){const n=ringSq(c,p),[x,y]=center(n);return wide(n)?[x+off,y]:[x,y+off]}
  const hc=p>=100?fh(p):c,[x,y]=hallC(hc,p>=100?fs(p):p-RING_LAST);return hc===0||hc===2?[x+off,y]:[x,y+off];
 }
 function place(){
  if(!g||!ui)return;
  for(const c of g.players)for(let i=0;i<g.pos[c].length;i++){const e=$(`.pc-piece[data-c="${c}"][data-i="${i}"]`);if(!e)continue;const [x,y]=spot(c,i);e.style.left=pct(x);e.style.top=pct(y)}
 }
 const nm=c=>g.seats[c].name;
 // ¿este teléfono maneja ese color?
 let endSent=false;
 const mine=c=>g.seats[c].kind==='human'&&(net.role==='solo'||c===net.me);
 const auto=c=>g.seats[c].kind==='ai'||!!g.seats[c].away;
 const teamName=c=>g.players.length===4&&g.war?(g.team[c]===0?'Equipo A':'Equipo B'):nm(c);
 /* ---- dados ---- */
 const PIPS={1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
 function setDie(e,x,y,rot,v){e.style.left=pct(x);e.style.top=pct(y);e.style.transform=`rotate(${rot}deg)`;const on=PIPS[v]||[];[...e.children].forEach((d,k)=>d.classList.toggle('on',on.includes(k)))}
 const ROLL_FRAMES=9,ROLL_MS=30+ROLL_FRAMES*100+180;
 // los dos dados salen de la casa de quien tira, ruedan hasta el centro y ahí muestran el número
 function animDice(ev){
  const els=[0,1].map(d=>ui&&$(`.pc-die[data-d="${d}"]`));if(!els[0]||!els[1])return;
  const my=++rollTok,N=COLORS[ev.by].nest;rolling=true;
  els.forEach((e,d)=>{e.classList.remove('hidden','used','sel','pickable');e.style.transition='none';setDie(e,N[0]+(d?.9:-.9),N[1],0,1+Math.floor(Math.random()*6))});
  let k=0;
  const step=()=>{
   if(my!==rollTok||!ui)return;
   k++;const f=k/ROLL_FRAMES,ease=1-(1-f)*(1-f),last=k>=ROLL_FRAMES;
   els.forEach((e,d)=>{const T=ev.at[d];e.style.transition='left .1s linear,top .1s linear,transform .1s linear';
    setDie(e,N[0]+(T[0]-N[0])*ease,N[1]+(T[1]-N[1])*ease-Math.abs(Math.sin(f*Math.PI*3))*.7*(1-f),last?T[2]:k*(d?-131:149),last?ev.dice[d]:1+Math.floor(Math.random()*6))});
   if(!last)setTimeout(step,100);else setTimeout(()=>{if(my===rollTok){rolling=false;update(true)}},160);
  };
  setTimeout(step,30);
 }
 function drawDice(me){
  if(rolling)return;
  [0,1].forEach(d=>{const e=$(`.pc-die[data-d="${d}"]`);if(!e)return;
   if(!g.dice||!g.diePos){e.classList.add('hidden');return}
   const usable=g.phase==='pick'&&me&&g.opts.some(o=>o.d===d);
   e.classList.remove('hidden');e.style.transition='none';setDie(e,g.diePos[d][0],g.diePos[d][1],g.diePos[d][2],g.dice[d]);
   e.classList.toggle('used',!!g.used[d]);e.classList.toggle('pickable',usable);e.classList.toggle('sel',usable&&selDie===d&&g.opts.filter(o=>o.d>=0).length>1);e.disabled=!usable});
 }
 // las cartas se pueden usar en cualquier momento en que el juego esté esperando (tirar o elegir ficha), sea o no tu turno
 const cardTime=()=>g.war&&!g.over&&(g.phase==='roll'||g.phase==='pick');
 const SLOT=[[[21.15,21.15],[15.85,21.15]],[[21.15,.85],[15.85,.85]],[[.85,.85],[6.15,.85]],[[.85,21.15],[6.15,21.15]]];   // los dos huecos de carta en las esquinas de cada casa
 let lastFx=0,fxTimer=null;
 function update(local){
  if(!g||!ui||!$('.pc-board'))return;
  if(!g.over)endSent=false;else if(!endSent){endSent=true;const hs=g.players.filter(c=>g.seats[c].kind==='human'),L=net.role!=='solo'?net.me:hs.length===1?hs[0]:-1;if(L>=0){try{window.dispatchEvent(new CustomEvent('sudomi-arcade',{detail:{game:'parchis',won:g.war?g.team[L]===g.winner:g.winner===L}}))}catch(_){}}
   try{const root=$('.pc-board').closest('.mini-game'),won=L>=0?(g.war?g.team[L]===g.winner:g.winner===L):null;if(window.SudomiResult&&root)setTimeout(()=>{if(g&&g.over)SudomiResult.show(root,{kind:won===null?'end':won?'win':'lose',game:'PARCHIMI',title:won?'¡Ganaste!':won===false?'Perdiste':'Partida terminada',sub:String(g.msg||'').replace(/^🏆\s*/,''),exit:leave})},1400)}catch(_){}}   /* 0.3.28: tarjeta de resultado común */   /* 0.3.2: avisa el resultado a logros y estadísticas (no si hay varias personas en el mismo teléfono) */
  const c=g.players[g.turn],me=mine(c)&&!g.over,opts=g.phase==='pick'&&me?g.opts:[],W=g.war;
  if(opts.length&&!opts.some(o=>o.d===selDie))selDie=opts[0].d;
  if(!opts.length)choice=null;
  if(aim&&!(cardTime()&&mine(aim.c)&&g.cards[aim.c][aim.idx]===aim.key))aim=null;
  const can=new Set(opts.flatMap(o=>o.moves.map(m=>m.c+'-'+m.i)));
  const tg=new Set(aim?cardTargets(aim.c,aim.key,aim.first).map(x=>x.c+'-'+x.i):[]);
  ui.stage.querySelectorAll('.pc-piece').forEach(e=>{
   const pc=+e.dataset.c,pi=+e.dataset.i,k=pc+'-'+pi,on=aim?tg.has(k):can.has(k);
   e.classList.toggle('can',on&&!aim);e.classList.toggle('tgt',on&&!!aim);e.disabled=!on;e.classList.toggle('home',g.pos[pc][pi]===GOAL);
   if(W){const p=g.pos[pc][pi],hp=g.hp[pc][pi],board=p>=0&&p!==GOAL;
    e.textContent=board?hp:p<0&&hp<HPMAX?(hp===1.5?'1½':hp):'';e.classList.toggle('hurt',p!==GOAL&&hp<HPMAX);e.classList.toggle('ko',p<0&&(hp<=0||hp===1.5));e.classList.toggle('sh',g.shield[pc][pi]>0)}
  });
  ui.stage.querySelectorAll('.pc-av').forEach(e=>{e.classList.toggle('turn',!g.over&&+e.dataset.c===c);e.classList.toggle('away',!!g.seats[+e.dataset.c].away)});
  ui.stage.querySelectorAll('.pc-seat').forEach(e=>{const s=+e.dataset.c;e.classList.toggle('turn',!g.over&&s===c);
   e.querySelector('i').textContent=(g.seats[s].away?'📴 ':'')+(W&&g.frozen[s]?'❄️ ':'')+'🏁 '+g.pos[s].filter(p=>p===GOAL).length+'/'+g.pos[s].length+(W?' · 🃏'+g.cards[s].length:'')});
  drawDice(me);
  const d=$('#pcDice'),canRoll=g.phase==='roll'&&me;
  d.style.setProperty('--pc-c',COLORS[c].hex);d.style.setProperty('--pc-ink',COLORS[c].ink);d.disabled=!canRoll;d.classList.toggle('go',canRoll&&!aim);
  $('#pcMsg').textContent=g.msg;
  $('#pcSub').textContent=g.over?'':aim?(!CARDS[aim.key].t?'Toca «Usar ahora», o la carta otra vez para cancelar':aim.key==='cambio'&&!aim.first?'Toca TU ficha que quieres cambiar':aim.key==='cambio'?'Ahora toca la ficha rival (solo las que están detrás de la tuya)':'Toca la ficha a la que apuntas (o la carta otra vez para cancelar)'):canRoll?'Toca «Tirar» para lanzar los dados':opts.length?(opts.filter(o=>o.d>=0).length>1?'Toca un dado para elegir cuál usar, y luego la ficha':'Toca la ficha que quieres mover'):g.phase==='duel'?'':net.role!=='solo'&&!mine(c)?'Esperando a '+nm(c)+'…':'';
  $('#pcAgain').classList.toggle('hidden',!g.over||net.role==='guest');
  if(W)drawWar(c,me);
  drawChoice();
  if(net.role==='host'&&!local)bcast({t:'s',s:snapshot()});
 }
 // guerra: cartas del jugador, el duelo y el marcador final
 function drawWar(c,me){
  // los dos huecos de carta de cada jugador, en las esquinas de su casa
  ui.stage.querySelectorAll('.pc-slot').forEach(e=>{
   const sc=+e.dataset.c,k=+e.dataset.k,key=g.cards[sc][k],ok=!!key&&cardTime()&&mine(sc)&&cardUsable(sc,key);
   e.textContent=key?CARDS[key].e:'';e.classList.toggle('full',!!key);e.classList.toggle('on',!!aim&&aim.c===sc&&aim.idx===k);e.disabled=!ok;
   e.title=key?CARDS[key].n+': '+CARDS[key].d:'Hueco para una carta';
  });
  const info=$('#pcCardInfo');
  if(info){
   if(aim){const C=CARDS[aim.key];info.innerHTML=`<b>${C.e} ${C.n}</b><span>${esc(C.d)}</span>${C.t?'':'<button type="button" class="arc-btn" id="pcUseCard">Usar ahora</button>'}`;info.classList.remove('hidden');const u=$('#pcUseCard');if(u)u.onclick=()=>{const a=aim;sendCard(a.c,a.idx)}}
   else info.classList.add('hidden');
  }
  // animación + texto cuando alguien activa una carta (se ve en todos los teléfonos)
  const fx=$('.pc-fx');
  if(fx&&g.fx&&g.fx.id!==lastFx){
   lastFx=g.fx.id;const C=CARDS[g.fx.key];
   fx.innerHTML=`<span class="pc-fx-e fx-${g.fx.key}">${C.e}</span><b>${C.n}</b><p>${esc(C.d)}</p><small>${esc(g.fx.text)}</small>`;
   fx.classList.remove('show');void fx.offsetWidth;fx.classList.add('show');clearTimeout(fxTimer);fxTimer=setTimeout(()=>fx.classList.remove('show'),2600);
  }
  const box=$('#pcDuel');if(!box)return;
  if(g.duel){
   const D=g.duel,mineNeed=D.need.find(x=>mine(x));
   let body='';
   if(D.res){const w=D.res==='tie'?'¡Empate! Otra vez…':`Gana ${nm(D.res==='a'?D.a.c:D.d.c)}`;body=`<div class="pc-duel-show"><span>${RPS[D.pa]}</span><i>vs</i><span>${RPS[D.pd]}</span></div><p>${esc(w)}</p>`}
   else if(mineNeed!=null)body=`<p><b>${esc(nm(mineNeed))}</b>, elige en secreto:</p><div class="pc-rps">${Object.keys(RPS).map(k=>`<button type="button" data-rps="${k}" aria-label="${RPS_N[k]}">${RPS[k]}</button>`).join('')}</div>`;
   else body='<p>Esperando la elección…</p>';
   box.innerHTML=`<h4>⚔️ Duelo: ${esc(nm(D.a.c))} contra ${esc(nm(D.d.c))}</h4>${body}`;box.classList.remove('hidden');
   box.querySelectorAll('[data-rps]').forEach(b=>b.onclick=()=>{
    const v2=b.dataset.rps;
    if(net.role==='guest'){net.conn.send({t:'rps',v:v2});g.duel.need=g.duel.need.filter(x=>x!==net.me);update(true)}
    else rpsAnswer(mineNeed,v2);
   });
  }else box.classList.add('hidden');
  const sc=$('#pcScore');
  if(sc){
   if(g.over&&g.score){
    sc.innerHTML=`<h4>🏆 ${esc(g.score.title)}</h4><table><tr><th>Jugador</th><th>🏁</th><th>💀</th><th>Daño</th><th>Recibido</th></tr>${g.players.map(p=>`<tr><td><u style="background:${COLORS[p].hex}"></u>${esc(nm(p))}</td><td>${g.pos[p].filter(x=>x===GOAL).length}</td><td>${g.stats[p].kills}</td><td>${g.stats[p].dmg}</td><td>${g.stats[p].taken}</td></tr>`).join('')}</table><p>${g.score.lines.map(esc).join(' · ')}</p>`;
    sc.classList.remove('hidden');
   }else sc.classList.add('hidden');
  }
 }
 // cuando la misma ficha puede seguir por el tablero o atacar dentro de un pasillo
 function drawChoice(){
  const box=$('#pcChoice');if(!box)return;
  if(!choice){box.classList.add('hidden');return}
  box.innerHTML=`<p>¿Qué hace esta ficha?</p>`+choice.list.map((x,k)=>`<button type="button" class="arc-btn" data-ch="${k}">${x.m.hall!=null?'⚔️ Atacar en el pasillo '+COLORS[x.m.hall].name.toLowerCase():x.m.duel?'⚔️ Atacar en el tablero':'➡️ Seguir por el tablero'}</button>`).join('');
  box.classList.remove('hidden');
  box.querySelectorAll('[data-ch]').forEach(b=>b.onclick=()=>{const x=choice.list[+b.dataset.ch];choice=null;sendPick(x.d,x.k)});
 }
 function sendPick(d,k){
  const c=g.players[g.turn],o=g.opts.find(x=>x.d===d),m=o&&o.moves[k];if(!m)return;
  if(net.role==='guest'){net.conn.send({t:'pick',d,m:k});g.phase='anim';update(true);return}
  answer('pick',c,{d,m});
 }
 function sendCard(c,idx,t1,t2){
  aim=null;
  if(net.role==='guest'){net.conn.send({t:'card',idx,t1,t2});update(true);return}
  if(!useCard(c,idx,t1,t2))update(true);
 }
 const say=t=>{if(!g)return;g.msg=t;update()};
 const flush=()=>{place();update()};
 function fitUnit(){const b=$('.pc-board');if(b)b.style.setProperty('--pc-u',(b.clientWidth/22)+'px')}
 function applyTheme(){const t=THEMES[setup.theme]||THEMES.clasico;ui.stage.querySelectorAll('.pc-board').forEach(b=>['bg','cell','line','num','safe','nest'].forEach(k=>b.style.setProperty('--pc-'+k,t[k])))}
 const SUB={pve:'CONTRA LA MÁQUINA',pvp:'EN ESTE DISPOSITIVO',online:'SALA ONLINE'};
 const head=()=>`<div class="dos-head"><div><p>ARCADE SUDOMI · ${SUB[mode]||SUB.online}${g&&g.war?' · ⚔️ GUERRA':''}</p><h2>${NAME}</h2></div><div class="dos-actions"><button class="game-restart" id="pcRules" aria-label="Reglas">?</button><button class="game-restart" id="pcExit">Juegos</button></div></div>`;
 // 0.3.37 (dueño): los temas son círculos pequeños con los colores del tablero; el nombre del elegido sale al lado del título
 const themePick=()=>`<div class="pc-opt pc-themes"><b>Tema del tablero · <i class="pc-tname">${(THEMES[setup.theme]||THEMES.clasico).name}</i></b><div class="pc-dots">${Object.entries(THEMES).map(([k,t])=>`<button type="button" data-theme="${k}" class="pc-dot${k===setup.theme?' on':''}" style="background:linear-gradient(135deg,${t.cell} 0 50%,${t.bg||t.cell} 50%);border-color:${t.line}" aria-label="Tema ${t.name}" title="${t.name}"></button>`).join('')}</div></div>`;
 function bindTheme(root){(root||ui.stage).querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>{setup.theme=b.dataset.theme;try{localStorage.setItem(TKEY,setup.theme)}catch(_){}ui.stage.querySelectorAll('[data-theme]').forEach(x=>x.classList.toggle('on',x.dataset.theme===setup.theme));ui.stage.querySelectorAll('.pc-tname').forEach(x=>{x.textContent=(THEMES[setup.theme]||THEMES.clasico).name});applyTheme()})}
 function rulesHTML(war){
  if(war)return `<h3>⚔️ Parchís guerra</h3><ul>
  <li><b>Equipos:</b> con 4 jugadores son parejas (amarillo + rojo contra azul + verde). Con 2 o 3, cada uno por su cuenta.</li>
  <li><b>Vidas:</b> cada ficha tiene ${HPMAX} (el número sobre la ficha). <b>Por cada vida perdida camina un paso menos</b>: herida una vez, un 6 vale 5.</li>
  <li><b>Sin vidas:</b> la ficha vuelve a casa en 0. Necesita <b>dos 5</b>: el primero la cura a medias (1½) y el segundo la deja en ${HPMAX} y la saca.</li>
  <li><b>No hay zonas seguras.</b> Solo están protegidas <b>dos fichas del mismo equipo en la misma casilla</b>: nadie puede caerles encima ni pasar.</li>
  <li><b>Duelo:</b> si caes sobre una ficha rival sola, juegan <b>piedra, papel o tijera</b>. <b>Quien pierde vuelve a su casa con una vida menos.</b></li>
  <li><b>🎁 Armas:</b> al caer en una casilla gris ganas una carta. Guardas hasta <b>${HAND}</b>, en las esquinas de tu casa, y las usas <b>cuando quieras</b>, aunque no sea tu turno: toca la carta y luego la ficha.</li>
  <li><b>Atacar pasillos:</b> puedes doblar hacia el pasillo de color de un rival si caes justo sobre una ficha suya. Si sigues y llegas al final de ese pasillo, vuelves a tu salida.</li>
  <li><b>Final:</b> termina cuando un equipo mete todas sus fichas. <b>3 puntos</b> por ficha en la meta, <b>1</b> por cada ficha que mandaste a casa, <b>1</b> para quien más daño hizo y <b>1</b> para quien más daño recibió. Gana el equipo con más puntos.</li>
  <li>Dados: 5 para salir (o que sumen 5), pareja de dados repite, tres parejas seguidas castigan.</li></ul>
  <h3>Las armas</h3><ul>${CARD_KEYS.map(k=>`<li>${CARDS[k].e} <b>${CARDS[k].n}:</b> ${CARDS[k].d}</li>`).join('')}</ul>`;
  return `<h3>Cómo se juega</h3><ul>
  <li>Cada jugador tiene <b>4 fichas</b>. Gana quien meta las cuatro en el centro.</li>
  <li>Se tiran <b>dos dados</b>. Cada dado se usa por separado: puedes mover dos fichas, o la misma ficha dos veces. Tú eliges el orden.</li>
  <li>Con un <b>5</b> en un dado sacas una ficha de casa (es obligatorio si puedes). También si los dos dados <b>suman 5</b>.</li>
  <li><b>Pareja</b> (los dos dados iguales): tiras otra vez. Con <b>tres parejas seguidas</b>, la última ficha que moviste vuelve a casa.</li>
  <li><b>Comer:</b> si caes donde hay una sola ficha rival, la mandas a su casa y <b>cuentas 20</b> con cualquier ficha.</li>
  <li><b>Zonas seguras</b> (casillas grises con dos puntos blancos, y las salidas): ahí nadie puede comer.</li>
  <li><b>Barrera:</b> dos fichas del mismo color en una casilla. Nadie puede pasar. Con pareja estás obligado a abrirla.</li>
  <li>Después de dar la vuelta entras a tu <b>pasillo de color</b>. A la meta se llega con el número <b>exacto</b>, y al llegar <b>cuentas 10</b>.</li></ul>`}
 function sheet(html){const s=document.createElement('div');s.className='pc-sheet';s.innerHTML=`<div class="pc-sheet-in">${html}<button class="arc-btn" type="button" data-close>Entendido</button></div>`;s.onclick=e=>{if(e.target===s||e.target.closest('[data-close]'))s.remove()};if($('.pc'))$('.pc').appendChild(s);return s}
 const showRules=()=>sheet(rulesHTML(g?g.war:setup.war));
 // cambiar el tema en plena partida: solo cambia colores del tablero en este teléfono, no toca el estado del juego ni avisa a la sala
 function showThemes(){if(!$('.pc')||$('.pc-sheet'))return;bindTheme(sheet(themePick()+'<p class="pc-hint">Solo cambia cómo ves el tablero. La partida sigue igual.</p>'))}
 const bindHead=()=>{$('#pcExit').onclick=leave;$('#pcRules').onclick=showRules};

 function renderMenu(){
  stopGame();leaveNet();
  const online=mode==='online';
  const opts=mode==='pve'?[2,3,4].map(n=>[n,`Tú + ${n-1} IA`]):[2,3,4].map(n=>[n,`${n} ${online?'jugadores':'personas'}`]);
  ui.stage.innerHTML=`<div class="mini-game pc">${head()}
   <div class="pc-menu">${net.status?`<p class="pc-note bad">${esc(net.status)}</p>`:''}<div class="pc-hero">🎲<b>${NAME}</b><span>El parchís de SUDOMI. Saca tus fichas, da la vuelta al tablero y llévalas al centro.</span></div>
    <div class="pc-opt"><b>${mode==='pve'?'¿Contra cuántos?':'¿Cuántos juegan?'}</b><div class="pc-seg">${opts.map(([n,t])=>`<button type="button" data-n="${n}" class="${n===setup.n?'on':''}">${t}</button>`).join('')}</div>${online?'<small class="pc-hint">Los espacios que no se llenen los juega la IA.</small>':''}</div>
    <label class="pc-switch"><input type="checkbox" role="switch" id="pcWar" ${setup.war?'checked':''}><i></i><span><b>⚔️ Parchís guerra</b><small>Vidas, duelos de piedra, papel o tijera, armas y equipos.</small></span></label>
    <div class="pc-opt${setup.war?'':' hidden'}" id="pcN4"><b>Fichas por jugador</b><div class="pc-seg">${[2,4].map(n=>`<button type="button" data-n4="${n}" class="${n===setup.n4?'on':''}">${n} fichas${n===2?' (rápido)':''}</button>`).join('')}</div><button type="button" class="pc-link" id="pcWarRules">Ver las reglas de guerra</button></div>
    ${themePick()}<div class="pc-board pc-mini">${boardSVG(false)}</div>
    <button class="arc-btn pc-big" id="pcStart">${online?'🌐 Crear sala':'▶ Jugar'}</button></div></div>`;
  net.status='';bindHead();
  ui.stage.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{setup.n=+b.dataset.n;ui.stage.querySelectorAll('[data-n]').forEach(x=>x.classList.toggle('on',x===b))});
  ui.stage.querySelectorAll('[data-n4]').forEach(b=>b.onclick=()=>{setup.n4=+b.dataset.n4;ui.stage.querySelectorAll('[data-n4]').forEach(x=>x.classList.toggle('on',x===b))});
  $('#pcWar').onchange=e=>{setup.war=e.target.checked;$('#pcN4').classList.toggle('hidden',!setup.war)};
  $('#pcWarRules').onclick=()=>sheet(rulesHTML(true));
  bindTheme();applyTheme();$('#pcStart').onclick=online?createRoom:start;
 }
 function newGame(players,seats,war,n4){
  const N=war?(n4===4?4:2):4;
  g={players,seats,war:!!war,pos:{},hp:{},shield:{},cards:{},frozen:{},stats:{},team:{},turn:0,phase:'roll',dice:null,used:[true,true],diePos:null,doubles:0,last:null,bonus:[],opts:[],msg:'',over:false,winner:null,duel:null,turbo:{},fx:null,score:null};
  players.forEach(c=>{g.pos[c]=Array(N).fill(-1);g.hp[c]=Array(N).fill(HPMAX);g.shield[c]=Array(N).fill(0);g.cards[c]=[];g.frozen[c]=false;g.stats[c]={kills:0,dmg:0,taken:0};g.team[c]=war&&players.length===4?c%2:c});
  aim=null;choice=null;
 }
 function start(){
  const players=ORDER[setup.n],seats={},names=AI.slice().sort(()=>Math.random()-.5);
  players.forEach((c,k)=>{
   if(k===0)seats[c]={kind:'human',name:myName(),avatar:myAvatar()};
   else if(mode==='pvp')seats[c]={kind:'human',name:'Jugador '+(k+1),avatar:['🙂','😎','🤠','🥳'][k]};
   else seats[c]={kind:'ai',name:names[k][0],avatar:names[k][1]};
  });
  stopGame();newGame(players,seats,setup.war,setup.n4);renderGame();run(++token);
 }
 function renderGame(){
  const W=g.war;
  const pieces=g.players.map(c=>g.pos[c].map((_,i)=>`<button type="button" class="pc-piece" data-c="${c}" data-i="${i}" style="--pc-c:${COLORS[c].hex};--pc-ink:${COLORS[c].ink}" aria-label="Ficha ${COLORS[c].name} ${i+1}" disabled></button>`).join('')).join('');
  const avs=g.players.map(c=>`<div class="pc-av" data-c="${c}" style="left:${pct(COLORS[c].nest[0])};top:${pct(COLORS[c].nest[1])};--pc-c:${COLORS[c].hex}" title="${esc(nm(c))}"><span>${esc(g.seats[c].avatar)}</span></div>`).join('');
  const seats=g.players.map(c=>`<div class="pc-seat" data-c="${c}" style="--pc-c:${COLORS[c].hex}"><u></u><b>${esc(nm(c))}${net.role!=='solo'&&c===net.me?' (tú)':''}${W&&g.players.length===4?' · '+(g.team[c]?'B':'A'):''}</b><i></i></div>`).join('');
  const dice=[0,1].map(d=>`<button type="button" class="pc-die hidden" data-d="${d}" aria-label="Dado ${d+1}" disabled>${'<i></i>'.repeat(9)}</button>`).join('');
  const slots=W?g.players.map(c=>[0,1].map(k=>`<button type="button" class="pc-slot" data-c="${c}" data-k="${k}" style="left:${pct(SLOT[c][k][0])};top:${pct(SLOT[c][k][1])};--pc-c:${COLORS[c].hex}" aria-label="Carta ${k+1} de ${esc(nm(c))}" disabled></button>`).join('')).join('')+'<div class="pc-fx" aria-live="polite"></div>':'';
  ui.stage.innerHTML=`<div class="mini-game pc${W?' war':''}">${head()}
   <div class="pc-seats">${seats}</div>
   <div class="pc-board">${boardSVG(W)}${avs}${slots}${pieces}${dice}</div>
   <div class="pc-hud"><button type="button" id="pcDice" class="pc-dice" aria-label="Tirar los dados"><span>🎲</span><small>Tirar</small></button><div class="pc-say"><b id="pcMsg"></b><small id="pcSub"></small></div></div>
   <div class="pc-choice hidden" id="pcChoice"></div>
   ${W?'<div class="pc-cardinfo2 hidden" id="pcCardInfo"></div><div class="pc-duel hidden" id="pcDuel"></div><div class="pc-score hidden" id="pcScore"></div>':''}
   <div class="pc-foot"><button class="arc-btn hidden" id="pcAgain" type="button">↻ Jugar otra vez</button><button class="arc-btn ghost" id="pcTheme" type="button">🎨 Fondo</button></div></div>`;
  bindHead();$('#pcTheme').onclick=showThemes;
  $('#pcAgain').onclick=()=>{if(net.role==='host')startOnline();else start()};
  $('#pcDice').onclick=()=>{if(!g||g.over||g.phase!=='roll'||!mine(g.players[g.turn]))return;aim=null;if(net.role==='guest'){net.conn.send({t:'roll'});return}answer('roll',g.players[g.turn],true)};
  ui.stage.querySelectorAll('.pc-slot').forEach(e=>e.onclick=()=>{   // tocar una carta: se elige (sale qué hace); tocarla otra vez la suelta
   const c=+e.dataset.c,idx=+e.dataset.k,key=g&&g.cards[c][idx];if(!key||!cardTime()||!mine(c))return;
   aim=aim&&aim.c===c&&aim.idx===idx?null:{c,idx,key,first:null};choice=null;update(true);
  });
  ui.stage.querySelectorAll('.pc-die').forEach(e=>e.onclick=()=>{const d=+e.dataset.d;if(g&&g.phase==='pick'&&g.opts.some(o=>o.d===d)){selDie=d;choice=null;update(true)}});
  ui.stage.querySelectorAll('.pc-piece').forEach(e=>e.onclick=()=>{
   if(!g)return;
   const c=+e.dataset.c,i=+e.dataset.i;
   if(aim){   // apuntando con una carta
    if(!cardTargets(aim.c,aim.key,aim.first).some(x=>x.c===c&&x.i===i))return;
    if(aim.key==='cambio'&&!aim.first){aim.first={c,i};update(true);return}
    const a=aim;if(a.first)sendCard(a.c,a.idx,a.first,{c,i});else sendCard(a.c,a.idx,{c,i});return;
   }
   if(g.phase!=='pick'||!mine(g.players[g.turn]))return;
   const has=o=>o.moves.some(m=>m.c===c&&m.i===i),o=g.opts.find(x=>x.d===selDie&&has(x))||g.opts.find(has);if(!o)return;
   const list=o.moves.map((m,k)=>({d:o.d,k,m})).filter(x=>x.m.c===c&&x.m.i===i);
   if(list.length>1){choice={list};update(true);return}
   sendPick(o.d,list[0].k);
  });
  applyTheme();fitUnit();place();update();
 }
 window.addEventListener('resize',()=>{if(ui&&g)fitUnit()});

 /* ================= flujo del turno (solo, o el anfitrión de una sala) ================= */
 const sleep=(ms,t)=>new Promise(res=>setTimeout(()=>res(t===token),ms));
 const ask=(kind,c)=>new Promise(res=>waits.set(kind+':'+c,res));
 function answer(kind,c,val){const k=kind+':'+c,res=waits.get(k);if(!res)return false;waits.delete(k);res(val);return true}
 function rpsAnswer(c,v){if(!g||!g.duel||!RPS[v]||!g.duel.need.includes(c))return;g.duel.need=g.duel.need.filter(x=>x!==c);if(answer('rps',c,v))update()}
 async function choose(c,opts,t){
  g.opts=opts;
  if(auto(c)){if(!await sleep(700,t))return null;return aiPick(c,opts)}
  const all=opts.flatMap(o=>o.moves.map(m=>({d:o.d,m})));
  if(opts.length===1&&all.every(x=>x.m.from===all[0].m.from&&x.m.to===all[0].m.to)){if(!await sleep(420,t))return null;return all[0]}
  g.phase='pick';selDie=opts[0].d;update();
  const r=await ask('pick',c);if(t!==token)return null;
  g.phase='anim';if(r==='redo')return {redo:true};
  return r&&r!=='auto'?r:aiPick(c,opts);
 }
 const rndRps=()=>'rps'[Math.floor(Math.random()*3)];
 async function rpsOf(c,t){if(auto(c)){await sleep(650,t);return rndRps()}const v=await ask('rps',c);return RPS[v]?v:rndRps()}
 // duelo de piedra, papel o tijera: devuelve 'a' (gana quien ataca), 'd' (gana quien defiende) o null si la partida se cerró
 async function duel(a,d,t){
  for(let round=1;;round++){
   g.phase='duel';g.duel={a,d,need:[a.c,d.c].filter(x=>!auto(x)),pa:null,pd:null,res:null,round};play('clack');say(`⚔️ Duelo: ${nm(a.c)} contra ${nm(d.c)}`);
   const [pa,pd]=await Promise.all([rpsOf(a.c,t),rpsOf(d.c,t)]);if(t!==token)return null;
   const w=pa===pd?null:(pa==='r'&&pd==='s')||(pa==='p'&&pd==='r')||(pa==='s'&&pd==='p')?'a':'d';
   Object.assign(g.duel,{pa,pd,need:[],res:w||'tie'});play(w?'bonus':'tap');update();
   if(!await sleep(1500,t))return null;
   if(w||round>=4){g.duel=null;return w||(Math.random()<.5?'a':'d')}
  }
 }
 async function doMove(m,t){
  const {c,i}=m,W=g.war;g.phase='anim';g.opts=[];update();
  if(m.heal){g.hp[c][i]=1.5;play('bonus');say(`${nm(c)} usó un 5 para curar su ficha: con otro 5 vuelve a salir`);if(!await sleep(1100,t))return false;g.last={c,i};flush();return true}
  if(W&&m.from<0&&g.hp[c][i]===1.5)g.hp[c][i]=HPMAX;   // el segundo 5: curada del todo y a la calle
  const fast=m.path.length>9;
  for(let k=0;k<m.path.length;k++){g.pos[c][i]=m.path[k];flush();if(m.from<0)play('pop');else if(!fast||k%2===0)play('tap');if(!await sleep(m.from<0?320:fast?70:170,t))return false}
  let lost=false;
  if(m.back&&at('r'+COLORS[c].start).some(o=>foeOf(c,o))){g.pos[c][i]=-1;place();say(`${nm(c)} salió del pasillo, pero su salida estaba ocupada: vuelve a casa`);if(!await sleep(800,t))return false}
  if(m.duel){
   const v=m.duel,r=await duel({c,i},v,t);if(r==null)return false;
   g.phase='anim';
   // 0.2.94: quien pierde el duelo vuelve a su casa con una vida menos (si era la última, queda sin vidas)
   const L=r==='a'?v:{c,i},Wn=r==='a'?c:v.c;if(r!=='a')lost=true;
   if(damage(L.c,L.i,1,Wn))say(`${nm(Wn)} ganó el duelo: la ficha de ${nm(L.c)} se quedó sin vidas y vuelve a casa`);
   else{g.pos[L.c][L.i]=-1;g.shield[L.c][L.i]=0;say(`${nm(Wn)} ganó el duelo: la ficha de ${nm(L.c)} vuelve a casa con una vida menos`)}
   play('bad');
   place();if(!await sleep(850,t))return false;
  }
  if(m.capture){const v=m.capture;g.pos[v.c][v.i]=-1;place();play('bad');say(`${nm(c)} se comió una ficha de ${nm(v.c)}: cuenta 20`);g.bonus.push(20);if(!await sleep(750,t))return false}
  if(!lost&&g.pos[c][i]===GOAL){
   if(W){play('bonus');if(teamDone(g.team[c])){endWar(c);return true}say(`${nm(c)} llevó una ficha a la meta: 3 puntos`);if(!await sleep(650,t))return false}
   else{
    if(g.pos[c].every(p=>p===GOAL)){g.over=true;g.winner=c;g.phase='over';play('win');place();say(`🏆 ¡${nm(c)} ganó la partida!`);try{window.SudomiFX&&SudomiFX.confetti&&SudomiFX.confetti()}catch(_){}return true}
    play('bonus');say(`${nm(c)} llevó una ficha a la meta: cuenta 10`);g.bonus.push(10);if(!await sleep(650,t))return false;
   }
  }
  if(W&&!lost){const p=g.pos[c][i];
   if(p>=0&&p<=RING_LAST){const sq=ringSq(c,p);if(SAFE.has(sq)&&EXITS[sq]==null&&g.cards[c].length<HAND){const k=CARD_KEYS[Math.floor(Math.random()*CARD_KEYS.length)];g.cards[c].push(k);play('bonus');say(`🎁 ${nm(c)} ganó una carta: ${CARDS[k].e} ${CARDS[k].n}`);if(!await sleep(900,t))return false}}}
  g.last={c,i};flush();return true;
 }
 const teamDone=tm=>g.players.filter(c=>g.team[c]===tm).every(c=>g.pos[c].every(p=>p===GOAL));
 function endWar(closer){
  const pts={},lines=[],teams=[...new Set(g.players.map(c=>g.team[c]))];
  teams.forEach(tm=>pts[tm]=0);
  g.players.forEach(c=>{pts[g.team[c]]+=3*g.pos[c].filter(p=>p===GOAL).length+g.stats[c].kills});
  const top=k=>{const mx=Math.max(...g.players.map(c=>g.stats[c][k]));return mx>0?g.players.filter(c=>g.stats[c][k]===mx):[]};
  top('dmg').forEach(c=>{pts[g.team[c]]++;lines.push(`+1 a ${nm(c)} por hacer más daño`)});
  top('taken').forEach(c=>{pts[g.team[c]]++;lines.push(`+1 a ${nm(c)} por aguantar más daño`)});
  const best=Math.max(...teams.map(tm=>pts[tm])),win=teams.filter(tm=>pts[tm]===best),wt=win.includes(g.team[closer])?g.team[closer]:win[0];
  const label=tm=>teamName(g.players.find(c=>g.team[c]===tm));
  g.score={pts,lines,title:`Gana ${label(wt)} · ${teams.map(tm=>label(tm)+' '+pts[tm]).join(' — ')}`};
  g.over=true;g.winner=wt;g.phase='over';g.duel=null;play('win');place();say(`🏆 ¡Gana ${label(wt)} con ${pts[wt]} puntos!`);
  try{window.SudomiFX&&SudomiFX.confetti&&SudomiFX.confetti()}catch(_){}
 }
 async function bonuses(c,t){
  while(!g.over&&g.bonus.length){
   const b=g.bonus.shift(),bm=legal(c,b,true,false);
   if(!bm.length){say(`${nm(c)} no puede contar ${b}`);if(!await sleep(900,t))return false;continue}
   say(`${nm(c)} cuenta ${b}`);const p=await choose(c,[{d:-1,moves:bm}],t);if(!p)return false;if(p.redo){g.bonus.unshift(b);continue}if(!await doMove(p.m,t))return false;
  }
  return true;
 }
 async function run(t){
  while(g&&!g.over&&t===token){
   const c=g.players[g.turn],who=nm(c),W=g.war;
   g.opts=[];g.bonus=[];
   if(W&&g.frozen[c]){g.frozen[c]=false;g.phase='anim';say(`❄️ ${who} está congelado y pierde el turno`);if(!await sleep(1300,t))return;next();continue}
   g.phase='roll';
   say(g.doubles?`¡Pareja! ${who} tira otra vez`:`Turno de ${who}`);
   if(auto(c)){if(!await sleep(800,t))return;if(W&&g.cards[c].length&&Math.random()<.75&&aiCard(c)){if(!await sleep(2300,t))return}}
   else{await ask('roll',c);if(t!==token)return}
   // tirar: los mismos dados y el mismo recorrido para todos
   const dice=[1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6)],jit=()=>Math.random()*1.6-.8;
   const ev={t:'roll',by:c,dice,at:[[9.7+jit()*.6,11+jit()*1.6,Math.round(jit()*30)],[12.3+jit()*.6,11+jit()*1.6,Math.round(jit()*30)]]};
   g.phase='anim';update();bcast(ev);play('clack');
   g.dice=dice;g.used=[false,false];g.diePos=ev.at;animDice(ev);   // mientras ruedan (rolling) no se dibuja el número final
   if(!await sleep(ROLL_MS,t))return;
   play('tap');
   const [a,b]=dice,dbl=a===b;
   if(dbl)g.doubles++;
   if(dbl&&g.doubles===3){
    const Lm=g.last;g.used=[true,true];
    if(Lm&&Lm.c===c&&g.pos[c][Lm.i]>=0&&g.pos[c][Lm.i]<=RING_LAST){g.pos[c][Lm.i]=-1;place();play('bad');say(`Tres parejas seguidas: la última ficha de ${who} vuelve a casa`)}
    else say(`Tres parejas seguidas: ${who} pierde el turno`);
    if(!await sleep(1400,t))return;next();continue;
   }
   say(`${who} sacó ${a} y ${b}`);
   if(a+b===5){   // sumando 5 también se sale de casa
    const ex=legal(c,5,false,false).filter(m=>m.from<0);
    if(ex.length){g.used=[true,true];say(`${who} sacó ${a} y ${b}: suman 5 y sale una ficha`);if(!await sleep(500,t))return;if(!await doMove(ex[0],t))return;if(!await bonuses(c,t))return}
   }
   let first=true;
   while(!g.over&&g.used.includes(false)){
    const opts=[],mul=W&&g.turbo[c]?2:1;
    [0,1].forEach(d=>{if(g.used[d]||(d===1&&!g.used[0]&&dbl))return;const mv=legal(c,dice[d]*mul,false,dbl&&first);if(mv.length)opts.push({d,moves:mv})});
    if(!opts.length){say(first?`${who} sacó ${a} y ${b} y no puede mover`:`${who} no puede usar el otro dado`);g.used=[true,true];if(!await sleep(1100,t))return;break}
    const p=await choose(c,opts,t);if(!p)return;
    if(p.redo)continue;   // alguien usó una carta mientras elegía: se recalculan las jugadas
    g.used[p.d]=true;first=false;g.turbo[c]=false;if(!await doMove(p.m,t))return;if(!await bonuses(c,t))return;
   }
   if(g.over)break;
   if(!dbl)next();
  }
  if(g&&t===token)update();
 }
 function next(){
  const c=g.players[g.turn];if(g.war)g.shield[c]=g.shield[c].map(x=>Math.max(0,x-1));
  g.turn=(g.turn+1)%g.players.length;g.doubles=0;g.last=null;
 }

 /* ================= sala online ================= */
 const snapshot=()=>({pos:g.pos,turn:g.turn,phase:g.phase,dice:g.dice,used:g.used,diePos:g.diePos,doubles:g.doubles,opts:g.opts,msg:g.msg,over:g.over,winner:g.winner,
  hp:g.hp,shield:g.shield,cards:g.cards,frozen:g.frozen,stats:g.stats,duel:g.duel,turbo:g.turbo,fx:g.fx,score:g.score,away:Object.fromEntries(g.players.map(c=>[c,!!g.seats[c].away]))});
 const pubSeats=()=>net.seats.map(s=>({c:s.c,kind:s.kind,name:s.name,avatar:s.avatar,away:!!s.away}));
 function bcast(msg){if(net.role!=='host'||!net.room)return;net.seats.forEach(s=>{if(s.kind==='human'&&s.id&&s.id!=='host')net.room.send(s.id,msg)})}
 function inviteUrl(){const base=location.origin&&location.origin!=='null'?location.origin+location.pathname:location.href.split(/[?#]/)[0];return `${base}?game=${GAME}&room=${net.code}`}
 function pushLobby(){if(net.role!=='host')return;net.seats.forEach(s=>{if(s.kind==='human'&&s.id&&s.id!=='host'&&net.room)net.room.send(s.id,{t:'lobby',seats:pubSeats(),you:s.c,code:net.code,war:setup.war,n4:setup.n4})});if(!net.started)renderLobby()}
 function renderLobby(){
  if(!ui)return;
  const host=net.role==='host',war=host?setup.war:net.war;
  ui.stage.innerHTML=`<div class="mini-game pc">${head()}<div id="lbRoot"></div></div>`;bindHead();
  if(!window.SudomiLobby){$('#lbRoot').textContent=net.status||'Creando sala…';return}
  SudomiLobby.render($('#lbRoot'),{game:GAME,gameName:NAME,code:net.code||null,url:net.code?inviteUrl():'',host,fixed:false,
   seats:net.seats.map(s=>({state:s.c===net.me&&s.kind==='human'?'me':s.kind==='open'?'open':s.kind==='ai'?'ai':s.away?'away':'human',name:s.name,avatar:s.avatar,sub:s.kind==='open'?undefined:COLORS[s.c].name+(s.c===net.me?' · tú':'')})),
   extra:`<p class="pc-note ${war?'war':''}">${war?`⚔️ Parchís guerra · ${(host?setup.n4:net.n4)||2} fichas por jugador`:'Parchís clásico'}</p>`+themePick(),bindExtra:root=>bindTheme(root),
   startLabel:'▶ Empezar la partida',canStart:!!net.code,onStart:host?startOnline:undefined,
   onRemove:i=>{if(!host||net.started||!net.seats[i]||net.seats[i].kind!=='open'||net.seats.length<=2)return;net.seats.splice(i,1);pushLobby()},
   status:net.status,hint:host?'Comparte el código o invita a tus amigos. Los espacios libres los juega la IA.':''});
 }
 async function createRoom(){
  if(P()&&P().get&&!P().get()){P().ensure(()=>createRoom());return}
  if(!window.SudomiParty){net.status='Este navegador no puede crear salas.';return renderMenu()}
  const players=ORDER[setup.n],my=++net.tok;
  Object.assign(net,{role:'host',code:'',started:false,status:'',me:players[0],room:null});
  net.seats=players.map((c,k)=>k===0?{c,kind:'human',id:'host',name:myName(),avatar:myAvatar()}:{c,kind:'open'});
  renderLobby();
  try{const room=await SudomiParty.host(GAME,onHost);if(my!==net.tok){room.close();return}net.room=room;net.code=room.code;renderLobby()}
  catch(e){if(my!==net.tok)return;net.role='solo';net.status=(e&&e.message)||'No se pudo crear la sala.';renderMenu()}
 }
 const startMsg=c=>({t:'start',players:g.players,seats:pubSeats(),you:c,war:g.war,n4:g.pos[g.players[0]].length});
 function onHost(e){
  if(net.role!=='host')return;
  let seat=net.seats.find(s=>s.id===e.id);
  if(e.type==='join'){
   const meta=e.meta||{};
   if(seat){seat.away=false;if(g&&g.seats[seat.c])g.seats[seat.c].away=false}
   else if(net.started){net.room.reject(e.id,'La partida ya empezó.');return}
   else{seat=net.seats.find(s=>s.kind==='open');if(!seat){net.room.reject(e.id,'La sala está llena.');return}Object.assign(seat,{kind:'human',id:e.id,name:clean(meta.n)||'Amigo',avatar:String(meta.a||'🙂').slice(0,4)})}
   pushLobby();
   if(net.started&&g){net.room.send(e.id,startMsg(seat.c));update()}
  }else if(e.type==='leave'){
   if(!seat)return;
   if(!net.started){Object.assign(seat,{kind:'open',id:null,name:undefined,avatar:undefined});pushLobby();return}
   seat.away=true;
   if(g&&g.seats[seat.c]){g.seats[seat.c].away=true;['roll','pick','rps'].forEach(k=>answer(k,seat.c,'auto'));if(g.duel)g.duel.need=g.duel.need.filter(x=>x!==seat.c);update()}   // mientras no vuelva, juega la IA por él
  }else if(e.type==='msg'&&seat&&g&&!g.over){
   const d=e.data||{},c=seat.c;
   if(d.t==='roll')answer('roll',c,true);
   else if(d.t==='pick'&&g.phase==='pick'&&g.players[g.turn]===c){const o=g.opts.find(x=>x.d===d.d),m=o&&o.moves[d.m];if(m&&m.c===c)answer('pick',c,{d:o.d,m})}
   else if(d.t==='rps')rpsAnswer(c,d.v);
   else if(d.t==='card')useCard(c,+d.idx,d.t1,d.t2);
  }
 }
 function startOnline(){
  if(net.role!=='host'||!net.room)return;
  const names=AI.slice().sort(()=>Math.random()-.5),seats={};
  net.seats.forEach((s,k)=>{if(s.kind==='open')Object.assign(s,{kind:'ai',name:names[k][0],avatar:names[k][1]});seats[s.c]={kind:s.kind,name:s.name,avatar:s.avatar,away:!!s.away}});
  net.started=true;stopGame();newGame(net.seats.map(s=>s.c),seats,setup.war,setup.n4);
  net.seats.forEach(s=>{if(s.kind==='human'&&s.id!=='host')net.room.send(s.id,startMsg(s.c))});
  renderGame();run(++token);
 }
 function joinRoom(code){
  if(P()&&P().get&&!P().get()){P().ensure(()=>joinRoom(code));return}
  if(!window.SudomiParty){net.status='Este navegador no puede entrar a salas.';mode='online';return renderMenu()}
  stopGame();leaveNet();
  const my=++net.tok;Object.assign(net,{role:'guest',code:SudomiParty.normCode(code),started:false,status:'Conectando con la sala…',seats:[],me:-1});
  renderLobby();
  net.conn=SudomiParty.join(GAME,code,{n:myName(),a:myAvatar()},e=>{if(my===net.tok)onGuest(e)});
 }
 function onGuest(e){
  if(e.type==='open'){net.status='';if(!net.started)renderLobby();return}
  if(e.type==='away'){net.status='Se perdió la conexión. Reconectando…';if(g){g.msg=net.status;update(true)}else renderLobby();return}
  if(e.type==='back'){net.status='';return}
  if(e.type==='closed'){const msg=e.message||'La sala se cerró.';stopGame();leaveNet();net.status=msg;mode='online';renderMenu();return}
  if(e.type!=='msg')return;
  const d=e.data||{};
  if(d.t==='lobby'){net.seats=d.seats;net.me=d.you;net.code=d.code||net.code;net.war=!!d.war;net.n4=d.n4;if(!net.started)renderLobby()}
  else if(d.t==='start'){
   net.started=true;net.seats=d.seats;net.me=d.you;token++;rollTok++;rolling=false;
   const seats={};d.seats.forEach(s=>seats[s.c]={kind:s.kind,name:s.name,avatar:s.avatar,away:!!s.away});
   newGame(d.players,seats,d.war,d.n4);renderGame();
  }
  else if(d.t==='s'&&g){const s=d.s;Object.keys(s.away||{}).forEach(c=>{if(g.seats[c])g.seats[c].away=s.away[c]});delete s.away;Object.assign(g,s);place();update(true)}
  else if(d.t==='roll'&&g){g.phase='anim';g.dice=d.dice;g.used=[false,false];g.diePos=d.at;animDice(d)}
  else if(d.t==='snd'){try{window.SudomiSound&&SudomiSound.play(d.n)}catch(_){}if(d.n==='win'){try{window.SudomiFX&&SudomiFX.confetti&&SudomiFX.confetti()}catch(_){}}}
 }
 function leaveNet(){
  net.tok++;
  if(net.room){try{net.room.close()}catch(_){}}
  if(net.conn){try{net.conn.close()}catch(_){}}
  Object.assign(net,{role:'solo',room:null,conn:null,code:'',seats:[],started:false,me:0,war:false,n4:2});
 }
 function stopGame(){token++;rollTok++;rolling=false;g=null;aim=null;choice=null;const pend=[...waits.values()];waits.clear();pend.forEach(res=>res(null))}
 function leave(){close();const u=ui;if(u){u.stage.innerHTML='';u.exit()}}
 function close(){stopGame();leaveNet();net.status=''}
 function open(opts,m,code){
  ui=opts;ui.hub.classList.add('hidden');ui.stage.classList.remove('hidden');
  if(m==='join'){mode='online';joinRoom(code);return}
  mode=m==='pvp'||m==='online'?m:'pve';renderMenu();
 }
 window.SudomiParchis={open,close,join:code=>joinRoom(code),themes:THEMES,cards:CARDS,_state:()=>g,_net:()=>net,_ev:e=>onHost(e),_legal:legal,_useCard:useCard,_targets:cardTargets,_setState:s=>{Object.assign(g,s);place();update()}};
})();
