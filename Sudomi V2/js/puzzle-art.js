/* SUDOMI 0.3.89 — ilustraciones de los acertijos (js/puzzles.js), estilo viñeta de manga: tinta negra, trama de puntos y líneas de acción.
 * No hay archivos de imagen: cada viñeta es un SVG que se arma con piezas (M: caracol, barca, cerdo, tonel…) sobre un fondo
 * (FX: líneas de velocidad, de concentración, cielo, suelo, estallido, noche), y lleva su letra: el título rotulado y un globo con el dato clave (TXT).
 *   ART[id] = 'fondo;pieza,x,y,escala[,espejo];pieza:dato,x,y,escala…'   (lienzo de 160 × 100)
 *   SudomiPuzzleArt.svg(id, título) devuelve el SVG; el título va solo como texto para lectores de pantalla.
 * La trama de puntos (#pzTone, #pzTone2) se define una sola vez en la página y la comparten todas las viñetas. */
(()=>{
 const K='fill="#111"',T='fill="url(#pzTone)"',T2='fill="url(#pzTone2)"',N='fill="none"',TH='fill="none" stroke-width="1.2"';
 const c=(x,y,r,a='')=>`<circle cx="${x}" cy="${y}" r="${r}" ${a}/>`,e=(x,y,rx,ry,a='')=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" ${a}/>`;
 const r=(x,y,w,h,a='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" ${a}/>`,p=(d,a='')=>`<path d="${d}" ${a}/>`;
 // una persona: o = 'm' hombre · 'w' mujer · 'o' anciano · 'k' rey · 'b' obispo · 's' soldado
 const person=o=>(o==='w'?p('M-8 -14 q-3 12 -1 16 h18 q2 -4 -1 -16 z',K):'')+p(o==='w'?'M-6 -6 h12 l6 17 h-24 z':'M-7 -6 h14 l2 16 h-18 z',o==='s'||o==='k'?T:'')+p('M-4 11 v8 M4 11 v8',N)+c(0,-12,6)
  +(o==='o'?p('M-5 -9 q5 12 10 0 z')+p('M11 -8 v27',N):o==='w'?p('M-6 -13 a6 6 0 0 1 12 0 q-6 -3 -12 0 z',K):o==='k'?p('M-7 -16 l-1 -8 l4 4 l4 -6 l4 6 l4 -4 l-1 8 z',T):o==='b'?p('M-6 -16 v-4 l6 -8 l6 8 v4 z')+p('M0 -27 v11',N):o==='s'?p('M-7 -13 a7 7 0 0 1 14 0 z',K)+p('M12 -22 v41 M12 -22 l-2 5 h4 z',N):p('M-6 -13 a6 6 0 0 1 12 0 z',K))
  +c(-2,-11,.9,K)+c(2.5,-11,.9,K);
 const flask=f=>p('M-4 -14 h8 v6 l6 20 h-20 l6 -20 z')+(f>0?p(f>1?'M-5.5 -4 l-4.5 16 h20 l-4.5 -16 z':'M-8 4 l-2 8 h20 l-2 -8 z',T):'')+p('M-5 -14 h10',N);
 const jug=f=>p('M-8 -12 h13 l4 4 h-3 q6 10 0 22 h-12 q-6 -12 0 -22 z')+(f>0?p(f>1?'M-9 -2 q-3 6 1 14 h12 q4 -8 1 -14 z':'M-9 5 q0 4 1 7 h12 q1 -3 1 -7 z',T):'')+p('M-8 -7 q-9 4 -3 13',N);
 const barrel=f=>p('M-9 -13 Q-14 0 -9 13 H9 Q14 0 9 -13 Z',f>1?T:'')+(f===1?p('M-11.5 0 Q-11.5 8 -9 13 H9 Q11.5 8 11.5 0 Z',T):'')+p('M-11 -5 H11 M-11 5 H11',N)+e(0,-13,9,2.5);
 const board=n=>{const s=32/n;let h=r(-16,-16,32,32);for(let i=0;i<n;i++)for(let j=0;j<n;j++)if((i+j)%2)h+=r(-16+i*s,-16+j*s,s,s,K+' stroke="none"');return h+r(-16,-16,32,32,N)};
 const discs=n=>{let h=p('M0 -20 v34 M-24 14 h48',N);for(let i=0;i<n;i++){const w=10+(n-i)*8;h+=r(-w/2,8-i*7,w,6,(i%2?T:'')+' rx="3"')}return h};
 const ring=()=>{let h=c(0,0,16,TH+' stroke-dasharray="2 3"');for(let i=0;i<10;i++){const a=i/10*Math.PI*2-Math.PI/2;h+=c(Math.round(Math.cos(a)*16),Math.round(Math.sin(a)*16),3.6,i===4?K:i%2?T:'')}return h};
 const M={
  snail:()=>p('M-22 9 Q-23 -6 -15 -6 Q-9 -6 -9 2 L15 2 Q22 2 22 9 Z')+c(4,-5,11,T)+p('M-2 -5 a6 6 0 1 1 6 6 a3.5 3.5 0 1 1 -3 -5',N)+p('M-18 -5 l-3 -8 M-14 -6 l1 -8',N)+c(-21,-14,1.5,K)+c(-13,-15,1.5,K)+c(-17,0,1,K),
  road:()=>p('M-34 22 Q-8 8 2 -4 T30 -22 L36 -14 Q16 -4 10 6 T-14 22 Z',T2)+r(16,4,9,14,'rx="3"')+p('M18 9 h5',N),
  person:o=>person(o||'m'),
  child:()=>`<g transform="translate(0 6) scale(.7)">${person('m')}</g>`,
  girl:()=>`<g transform="translate(0 6) scale(.7)">${person('w')}</g>`,
  baby:()=>e(0,4,9,7,T)+c(0,-6,6)+c(-2,-6,.9,K)+c(2,-6,.9,K)+p('M-2 -11 q2 -3 4 0',N),
  crowd:()=>[[-12,2,.6],[12,2,.6],[0,-2,.75]].map(([x,y,s])=>`<g transform="translate(${x} ${y}) scale(${s})">${person(x<0?'w':'m')}</g>`).join(''),
  stork:()=>e(0,0,10,6)+p('M-8 1 q6 -7 13 -1',N)+p('M7 -3 q6 -8 3 -16',N)+c(10,-20,3)+p('M12 -21 l13 2 l-13 2 z',K)+p('M-2 6 v14 M3 6 v14',N)+p('M-10 0 l-8 3 l7 3 z',K),
  horse:()=>p('M-14 -2 q-8 4 -5 12',N)+e(0,0,14,8)+p('M8 -5 l6 -13 l9 3 l-1 6 l-6 1 l-2 8 z')+p('M9 -6 l5 -12',N+' stroke-width="4"')+p('M-9 6 v13 M-4 7 v12 M6 7 v12 M11 6 v13',N)+c(19,-12,.9,K),
  pig:()=>p('M-15 0 q-5 -2 -3 -6 q3 -2 3 2',N)+p('M-8 10 v7 M-2 11 v6 M6 11 v6 M11 10 v6',N)+e(0,2,15,10)+p('M6 -7 l2 -7 l5 6 z',T)+e(15,3,4,3.2,T)+c(8,-1,1.1,K)+c(14,3,.6,K)+c(16.5,3,.6,K),
  coin:()=>c(0,0,7)+c(0,0,4,T),
  coins:()=>e(0,8,9,3.5)+e(0,4,9,3.5)+e(0,0,9,3.5)+e(0,-4,9,3.5,T),
  bag:()=>p('M-9 -6 Q-15 13 0 13 Q15 13 9 -6 Z')+p('M-6 -6 l-3 -7 h18 l-3 7 z',T)+p('M-7 -6 h14',N)+c(0,4,3.5,T),
  plate:()=>e(0,0,20,8)+e(0,0,13,4.5,T)+e(0,0,6,2),
  barrel:f=>barrel(+f||0),
  drops:()=>p('M-10 -8 q-4 7 0 9 q4 -2 0 -9 z M2 -2 q-4 7 0 9 q4 -2 0 -9 z M12 -9 q-4 7 0 9 q4 -2 0 -9 z',T),
  pipes:()=>p('M-18 -10 h8 v10 M0 -14 v14 M18 -10 h-8 v10',N+' stroke-width="4"'),
  cloth:()=>p('M-20 -11 h40 v21 q-10 6 -20 0 t-20 0 z')+p('M-7 -11 v21 M7 -11 v22 M-20 0 h40',TH+' stroke-dasharray="3 3"'),
  scissors:()=>c(-4,7,3.5,N)+c(4,7,3.5,N)+p('M-2 4 L8 -12 M2 4 L-8 -12',N),
  rings:()=>c(-6,0,9,N+' stroke-width="3.6"')+c(6,0,9,N+' stroke-width="3.6"')+p('M-9 -9 l3 -6 l3 6 z',T),
  flask:f=>flask(+f||0),
  crown:()=>p('M-12 7 l-2 -14 l7 7 l7 -11 l7 11 l7 -7 l-2 14 z',T)+c(-14,-8,1.6,K)+c(0,-12,1.6,K)+c(14,-8,1.6,K),
  ox:()=>p('M-15 -2 q-7 5 -4 13',N)+p('M-9 8 v11 M-4 9 v10 M6 9 v10 M11 8 v11',N)+e(0,1,15,9,T)+p('M9 -7 h10 l1 9 l-7 2 z')+p('M11 -7 q-5 -8 2 -9 M18 -7 q6 -6 -1 -9',N)+c(15,-2,.9,K)+c(18,2,.7,K),
  plough:()=>p('M-16 8 L6 -8 L16 -10',N)+p('M-16 8 l9 6 l3 -9 z',K)+c(11,6,5,N)+c(11,6,1,K),
  furrows:()=>p('M-36 0 q18 -7 36 0 t36 0 M-36 8 q18 -7 36 0 t36 0 M-36 16 q18 -7 36 0 t36 0',N),
  boat:()=>p('M-24 0 h48 q-4 13 -15 13 h-18 q-11 0 -15 -13 z',T)+p('M-24 0 h48',N),
  waves:()=>p('M-40 0 q5 -5 10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0 M-36 8 q5 -5 10 0 t10 0 t10 0 t10 0 t10 0 t10 0 t10 0',N),
  wolf:()=>p('M-11 8 L-13 -12 L-4 -5 H4 L13 -12 L11 8 L0 17 Z',T)+p('M-7 -1 l5 3 M7 -1 l-5 3',N)+c(0,12,2,K)+p('M-4 13 l1.5 4 l1.5 -4 M1 13 l1.5 4 l1.5 -4'),
  goat:()=>p('M-5 -7 q-7 -8 -1 -14 M5 -7 q7 -8 1 -14',N)+p('M-7 -4 l-8 2 l7 4 z M7 -4 l8 2 l-7 4 z')+p('M-7 -7 h14 l-3 17 h-8 z')+c(-3,-1,1,K)+c(3,-1,1,K)+p('M-2 10 l2 8 l2 -8 z',K),
  cabbage:()=>c(0,2,12,T)+p('M-12 2 q5 -9 12 -4 q7 -5 12 4 M0 -2 v14 M-7 4 q3 5 7 6 M7 4 q-3 5 -7 6',N),
  hedgehog:()=>p('M-12 -4 l-3 -7 M-6 -7 l-2 -8 M0 -8 l0 -8 M6 -7 l3 -7 M11 -4 l5 -5',N)+p('M-17 9 Q-17 -6 -2 -8 Q13 -8 16 9 Z',T)+p('M16 9 l7 -2 l-6 -4 z')+c(23,7,1.5,K)+c(13,3,1.1,K)+p('M-10 9 v3 M6 9 v3',N),
  sheep:()=>p('M-5 9 v8 M5 9 v8',N)+c(-7,-1,7)+c(1,-5,7)+c(8,0,7)+c(0,4,8)+c(-1,-1,5,'stroke="none"')+e(14,2,4.5,5.5,K),
  fence:()=>p('M-24 -4 h48 M-24 4 h48 M-16 -9 v18 M0 -9 v18 M16 -9 v18',N),
  quad:()=>p('M-24 13 L-17 -13 L21 -9 L25 13 Z',T2)+[[-24,13],[-17,-13],[21,-9],[25,13]].map(([x,y])=>c(x,y,2,K)).join(''),
  bent:()=>p('M-26 -8 L0 -12 L26 -6 L26 8 L0 14 L-26 10 Z',T2)+p('M-26 -8 v18 M0 -12 v26 M26 -6 v14',N+' stroke-dasharray="2 3"'),
  tri:()=>p('M0 -17 L24 14 H-24 Z',T2)+[[0,-17],[24,14],[-24,14]].map(([x,y])=>c(x,y,2,K)).join(''),
  round:()=>c(0,0,18,T2)+c(0,0,1.6,K)+p('M0 0 h18',N+' stroke-dasharray="2 3"'),
  dog:()=>p('M-13 -1 l-9 -7',N)+p('M-10 3 l-9 8 M-6 5 l-5 10 M7 5 l9 8 M10 3 l11 4',N)+e(0,0,13,6)+p('M10 -3 l8 -6 l7 5 l-4 4 l-7 1 z')+p('M14 -8 l-2 -7 l6 4 z',K)+c(18,-4,.9,K),
  hare:()=>p('M-6 6 l-10 6 M5 7 l9 6',N)+c(-9,1,2.6)+e(0,2,9,6,T)+p('M8 -7 l-3 -14 l5 2 l2 11 z')+p('M11 -7 l3 -13 l4 3 l-4 11 z')+c(9,-3,5)+c(11,-4,.9,K),
  house:()=>r(-9,-2,18,14)+p('M-12 -2 L0 -14 L12 -2 Z',T)+r(-2.5,5,5,7,K),
  church:()=>r(-12,-4,24,18)+p('M-14 -4 L0 -16 L14 -4 Z',T)+p('M0 -16 v-9 M-3 -21 h6',N)+p('M-3 14 v-7 a3 3 0 0 1 6 0 v7 z',K),
  tiles:()=>p('M-24 0 L0 -8 L24 0 L0 8 Z')+p('M-12 -4 L12 4 M12 -4 L-12 4 M-18 -2 L6 6 M-6 -6 L18 2',TH),
  sack:()=>p('M-10 -8 Q-16 15 0 15 Q16 15 10 -8 Q0 -4 -10 -8 Z')+p('M-6 -9 l-3 -7 l9 4 l9 -4 l-3 7',T)+c(-3,3,1,K)+c(3,6,1,K)+c(1,0,1,K)+c(-1,9,1,K),
  wall:()=>r(-18,-6,36,20)+p('M-18 1 h36 M-18 8 h36 M-8 -6 v7 M6 -6 v7 M-1 1 v7 M12 1 v7 M-10 8 v6 M4 8 v6',TH),
  trowel:()=>p('M-6 -6 l14 4 l-10 6 z',T)+p('M-4 0 l-7 8',N+' stroke-width="3.4"'),
  camel:()=>p('M-14 0 q-6 4 -4 10',N)+p('M-9 8 v11 M-3 9 v10 M5 9 v10 M10 8 v11',N)+p('M-14 4 q0 -8 5 -8 q3 -11 7 -1 q3 -11 8 0 q8 0 8 9 q0 5 -6 5 h-16 q-6 0 -6 -5 z',T)+p('M11 0 q3 -10 3 -17 l8 0 l1 4 l-5 2 q0 8 -2 13 z')+c(18,-14,.9,K),
  donkey:()=>p('M-13 -1 q-6 4 -4 11',N)+p('M-8 6 v12 M-3 7 v11 M5 7 v11 M9 6 v12',N)+e(0,1,13,7,T)+p('M8 -4 l5 -10 l8 3 l-1 6 l-6 1 l-2 6 z')+p('M13 -14 l-1 -9 l4 6 z M16 -13 l3 -8 l1 7 z')+c(17,-8,.9,K),
  hill:()=>p('M-40 22 Q-14 -22 12 6 Q24 -8 40 22 Z',T2),
  ladder:()=>p('M-9 24 L-3 -24 M9 24 L3 -24 M-7.5 13 h15 M-6 3 h12 M-5 -7 h10 M-4 -17 h8',N),
  dove:()=>p('M-11 2 q6 -9 17 -4 l6 -3 l-3 6 q-6 8 -16 5 z')+p('M-3 0 q4 -13 11 -11 q-2 9 -7 12 z',T)+c(10,-2,.9,K)+p('M15 -2 l4 1 l-4 1 z',K),
  tree:()=>r(-3,4,6,16,T)+c(-8,-3,9)+c(8,-3,9)+c(0,-12,9)+c(0,-2,8,'stroke="none"')+p('M-5 -5 q5 4 10 0',N),
  bread:()=>e(0,0,15,8,T)+p('M-8 -4 l3 7 M-1 -5 l3 8 M6 -4 l3 7',N),
  loaves:()=>e(-9,5,10,5.5,T)+e(9,5,10,5.5,T)+e(0,-3,10,5.5,T)+p('M-4 -5 l2 4 M2 -5 l2 4',N),
  book:()=>p('M-17 -8 q8 -4 17 0 q9 -4 17 0 v18 q-8 -4 -17 0 q-9 -4 -17 0 z')+p('M0 -8 v18',N)+p('M-13 -2 h9 M-13 3 h9 M4 -2 h9 M4 3 h9',TH),
  wheel:()=>c(0,0,13)+p('M0 -13 v26 M-13 0 h26 M-9 -9 l18 18 M9 -9 l-18 18',N)+c(0,0,3,K),
  cart:()=>p('M-18 -10 h32 l4 12 h-36 z',T)+p('M18 -4 h10',N)+c(-9,6,6)+c(-9,6,1.4,K)+c(9,6,6)+c(9,6,1.4,K),
  cup:()=>p('M-7 -9 h14 q0 13 -7 13 q-7 0 -7 -13 z',T)+p('M0 4 v7 M-6 12 h12',N),
  jug:f=>jug(+f||0),
  basket:()=>e(-6,-4,4,5)+e(2,-6,4,5)+e(9,-3,3.5,4.5)+p('M-13 -2 q13 -19 26 0',N)+p('M-15 -2 h30 l-4 15 h-22 z',T)+p('M-13 4 h26',N),
  eggs:()=>e(-8,2,5,7)+e(1,0,5,7)+e(9,3,5,7),
  stele:()=>p('M-18 14 q-5 -9 2 -14 M18 14 q5 -9 -2 -14',N)+p('M-10 16 v-22 a10 10 0 0 1 20 0 v22 z')+p('M-5 -5 h10 M-5 1 h10 M-5 7 h6',TH)+p('M-24 16 h48',N),
  cat:()=>p('M-10 6 L-11 -11 L-3 -5 H3 L11 -11 L10 6 Q0 15 -10 6 Z')+e(-4,0,1.3,2.3,K)+e(4,0,1.3,2.3,K)+p('M-1 5 h2 l-1 1.6 z',K)+p('M-5 6 l-10 -1 M-5 8 l-10 3 M5 6 l10 -1 M5 8 l10 3',TH),
  mouse:()=>p('M-10 4 q-9 2 -10 -7',N)+e(0,3,10,6,T)+c(5,-4,4)+c(10,1,5)+c(12,0,.9,K)+c(15,2,1,K),
  rabbit:()=>p('M-6 -5 q-5 -19 2 -19 q4 7 1 18 z M6 -5 q5 -19 -2 -19 q-4 7 -1 18 z')+c(0,3,10)+c(-4,1,1.1,K)+c(4,1,1.1,K)+p('M-1.5 5 h3 l-1.5 2 z',K)+r(-1.6,8,3.2,3),
  rooster:()=>p('M-12 4 q-11 -4 -9 -17 q5 7 11 9 z',T)+p('M-4 12 v7 M2 12 v7',N)+p('M-12 6 Q-12 -6 0 -4 L4 -14 Q10 -16 10 -8 L8 2 Q8 12 -4 12 Z')+p('M4 -15 q1 -6 3 -1 q2 -6 3 0 q4 -3 2 3 z',K)+p('M10 -10 l6 2 l-6 2 z',K)+c(9,-4,2,K)+c(6.5,-11,.9,K),
  hen:()=>p('M-4 11 v7 M2 11 v7',N)+p('M-13 2 Q-12 -6 0 -4 L4 -12 Q10 -13 10 -7 L8 2 Q8 11 -4 11 Q-13 11 -13 2 Z',T)+p('M5 -13 q2 -4 4 0 z',K)+p('M10 -8 l5 1.5 l-5 1.5 z',K)+c(6.5,-9,.9,K),
  chick:()=>p('M-2 9 v5 M3 9 v5',N)+c(0,2,8)+c(6,-6,5)+p('M11 -6 l4 1 l-4 2 z',K)+c(7,-7,.8,K),
  bee:()=>e(-3,-8,5,3.5)+e(4,-8,5,3.5)+e(0,0,9,6)+p('M-3 -5.6 v11.2 M2 -5.8 v11.6',N+' stroke-width="3"')+p('M9 0 h5',N)+c(-6,-1,.9,K),
  flower:()=>p('M0 6 v18 M0 16 q6 -2 8 -8',N)+[0,1,2,3,4].map(i=>c(Math.round(Math.cos(i*1.257-1.57)*7),Math.round(Math.sin(i*1.257-1.57)*7),4.5)).join('')+c(0,0,3.6,K),
  board:n=>board(+n||8),
  grain:()=>[[-10,2],[-3,-4],[4,3],[10,-3],[-6,8],[7,9],[0,6]].map(([x,y])=>e(x,y,2.4,1.4,K+` transform="rotate(${x*9} ${x} ${y})"`)).join(''),
  scale:()=>p('M0 -18 v32 M-11 14 h22 M-19 -13 h38 M-19 -13 l-8 15 M-19 -13 l8 15 M19 -13 l-8 15 M19 -13 l8 15',N)+p('M-28 2 q9 9 18 0 z',T)+p('M10 2 q9 9 18 0 z',T)+c(0,-18,2,K),
  weights:()=>p('M-12 6 h10 l2 9 h-14 z',K)+p('M3 9 h7 l1.5 6 h-10 z',K)+c(-7,4,2,N)+c(6.5,7.5,1.6,N),
  river:()=>p('M-44 -8 Q-12 -20 8 -6 T44 -10 L44 10 Q14 20 -6 6 T-44 12 Z',T)+e(-8,0,10,5)+e(15,2,7,4)+[[-8,-9,0],[-14,7,20],[-2,7,-20],[15,-6,0],[15,9,0],[3,1,90],[-22,-1,90]].map(([x,y,a])=>r(x-1.6,y-4,3.2,8,`transform="rotate(${a} ${x} ${y})"`)).join(''),
  bridge:()=>p('M-30 6 Q0 -20 30 6',N+' stroke-width="4"')+p('M-30 6 h60 M-15 -4 v10 M0 -7 v13 M15 -4 v10',N),
  lantern:()=>p('M0 -12 v-6 M-12 -2 h-5 M12 -2 h5 M-9 -11 l-4 -4 M9 -11 l4 -4',N)+r(-5,-6,10,13,T)+p('M-6 -6 h12 l-3 -6 h-6 z',K)+r(-6,7,12,2.5,K),
  moon:()=>p('M4 -13 a13 13 0 1 0 9 22 a10 10 0 1 1 -9 -22 z'),
  well:()=>p('M-12 0 v-17 M12 0 v-17',N)+p('M-16 -17 L0 -26 L16 -17 Z',T)+p('M0 -17 v9',TH)+r(-13,0,26,15)+p('M-13 5 h26 M-13 10 h26 M-5 0 v5 M5 0 v5 M0 5 v5 M-8 10 v5 M8 10 v5',TH),
  frog:()=>p('M-11 8 l-7 6 M11 8 l7 6',N)+e(0,4,12,8,T)+c(-6,-4,4.2)+c(6,-4,4.2)+c(-6,-4,1.3,K)+c(6,-4,1.3,K)+p('M-7 6 q7 5 14 0',N),
  ring:()=>ring(),
  fountain:()=>p('M0 4 v-12 M0 -8 q-9 -8 -13 8 M0 -8 q9 -8 13 8',N)+c(0,-10,2.2)+p('M-17 4 h34 l-3 9 h-28 z',T),
  discs:n=>discs(+n||3),
  turtle:()=>c(-10,-9,3.6)+c(-10,9,3.6)+c(9,-10,3.6)+c(9,10,3.6)+p('M-15 0 l-6 2',N)+c(19,0,5)+c(21,-1,.9,K)+e(0,0,15,11,T)+p('M-5 -10 v20 M5 -10 v20 M-14 -3.5 h28 M-14 3.5 h28',TH),
  queen:()=>p('M-9 11 h18 l-2 -6 l6 -15 l-7 7 l-2 -11 l-4 10 l-4 -10 l-2 11 l-7 -7 l6 15 z',T)+r(-11,11,22,4.5)+c(-13,-10,1.6,K)+c(-4,-14,1.6,K)+c(4,-14,1.6,K)+c(13,-10,1.6,K),
  sun:()=>c(0,0,8)+p('M0 -12 v-5 M0 12 v5 M-12 0 h-5 M12 0 h5 M-9 -9 l-3 -3 M9 -9 l3 -3 M-9 9 l-3 3 M9 9 l3 3',N),
  cloud:()=>p('M-14 5 a6 6 0 0 1 2 -11 a8 8 0 0 1 15 -2 a6 6 0 0 1 9 6 a4 4 0 0 1 0 7 z'),
  prints:()=>[[-18,0],[-8,-4],[2,0],[12,-4]].map(([x,y])=>e(x,y,2.4,3.4,K)+e(x+4,y,2.4,3.4,K)).join(''),
  cross:()=>p('M-6 -6 L6 6 M6 -6 L-6 6',N+' stroke-width="3.4"'),
  sweat:()=>p('M0 -6 q-5 8 0 10 q5 -2 0 -10 z')
 };
 const FX={
  plain:()=>'',
  ground:()=>r(0,74,160,26,T2+' stroke="none"')+p('M0 74 H160',N),
  sky:()=>r(0,74,160,26,T2+' stroke="none"')+p('M0 74 H160',N)+`<g transform="translate(128 20)">${M.cloud()}</g><g transform="translate(34 16) scale(.7)">${M.cloud()}</g>`,
  speed:()=>{let h='';for(let i=0;i<14;i++){const y=6+i*6.6,x=(i*37)%50;h+=p(`M${x} ${y} H${x+30+(i*23)%60}`,N+` stroke-width="${i%3?1:2.2}"`)}return h},
  focus:()=>{let h='';for(let i=0;i<34;i++){const a=i/34*Math.PI*2,r0=46+(i*7)%16,x1=80+Math.cos(a)*r0*1.5,y1=50+Math.sin(a)*r0*.95,x2=80+Math.cos(a)*150,y2=50+Math.sin(a)*100;h+=p(`M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`,N+` stroke-width="${i%2?1:2.4}"`)}return h},
  burst:()=>{let d='';for(let i=0;i<24;i++){const a=i/24*Math.PI*2,rr=i%2?30:44,x=80+Math.cos(a)*rr*1.45,y=50+Math.sin(a)*rr*.9;d+=(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)}return r(0,0,160,100,T2+' stroke="none"')+p(d+'Z','stroke-width="2.4"')},
  night:()=>r(0,0,160,100,K+' stroke="none"')+[[20,14],[48,26],[74,10],[100,22],[140,12],[150,34],[10,40]].map(([x,y])=>c(x,y,1.1,'fill="#fff" stroke="none"')).join('')+r(0,76,160,24,T+' stroke="none"'),
  water:()=>r(0,58,160,42,T2+' stroke="none"')+`<g transform="translate(80 70) scale(2)" stroke-width="1.1">${M.waves()}</g>`
 };
 const ART={
  a1:'sky;road,104,54,1.7;snail,52,62,1.5',a2:'ground;person:o,34,56,1.5;crowd,104,58,1.9',a3:'sky;stork,54,52,1.5;stork,104,56,1.3,1',a4:'ground;horse,54,56,1.5;horse,110,60,1.2,1',
  a5:'burst;pig,62,52,1.6;coins,118,60,1.3',a6:'ground;pig,44,62,1.3;pig,86,62,1.3,1;bag,128,56,1.4',a7:'focus;plate,80,52,2.4',a8:'ground;pipes,80,22,1.6;drops,80,40,1.2;barrel:0,80,66,1.6',
  a9:'plain;cloth,70,48,2.2;scissors,128,62,1.6',a10:'ground;cloth,62,50,1.9;scissors,122,56,1.5;cloth,128,30,.7',a11:'burst;person,40,56,1.5;rings,80,46,1.3;person:w,120,56,1.5',a11b:'ground;person:w,30,56,1.4;person,62,56,1.4;rings,80,24,1;person:w,98,56,1.4;person,130,56,1.4',
  a12:'ground;flask:2,40,56,1.7;flask:1,80,56,1.7;flask:0,120,56,1.7',a13:'focus;person:k,80,50,1.6;person:s,36,62,1.1;person:s,124,62,1.1',a14:'ground;furrows,80,80,1.6;ox,96,48,1.6;plough,46,56,1.3;prints,112,82,.9',a15:'sky;furrows,80,72,2;plough,80,46,1.7',
  a16:'ground;ox,48,56,1.4;ox,112,56,1.4,1',a17:'water;boat,80,62,1.5;person,58,44,.9;person:w,80,44,.9;person,102,44,.9',a18:'water;boat,80,70,1.3;wolf,30,34,1.2;goat,80,40,1.2;cabbage,130,36,1.2',a19:'water;boat,84,66,1.4;person,30,38,1.1;person:w,60,38,1.1;child,100,44,1.1;girl,128,44,1.1',
  a20:'ground;hedgehog,48,58,1.5;hedgehog,112,62,1,1;hedgehog,136,66,.6,1',a21:'sky;fence,80,82,2.2;sheep,44,58,1.3;sheep,84,62,1.1;sheep,122,56,1.3,1',a22:'plain;bent,80,50,2.3',a23:'plain;quad,80,50,2.3',
  a24:'plain;tri,80,50,2.2',a25:'plain;round,80,50,2.2',a26:'speed;hare,116,54,1.5;dog,46,56,1.6',a27:'ground;house,30,54,1.2;house,62,54,1.2;house,94,54,1.2;house,126,54,1.2',
  a28:'plain;tri,80,52,2.4;house,80,62,.9;house,60,70,.6;house,100,70,.6',a29:'plain;round,80,50,2.4;house,80,50,1;house,56,54,.6;house,104,54,.6',a30:'ground;church,58,48,2;tiles,124,78,1.2',a31:'ground;barrel:2,32,58,1.3;barrel:2,64,58,1.3;barrel:2,96,58,1.3;barrel:2,128,58,1.3',
  a32:'ground;sack,34,58,1.4;person,78,54,1.3;person:w,108,54,1.3;child,136,56,1.3',a33:'ground;sack,30,60,1.1;sack,54,58,1.3;person,92,54,1.3;person:w,120,54,1.3;child,144,58,1.2',a33b:'burst;sack,80,50,2;child,34,66,1.1;girl,128,66,1.1',a34:'focus;sack,80,48,2.1;person,34,62,1.1;person:w,126,62,1.1',
  a35:'ground;baby,54,56,1.6;baby,96,56,1.6;coins,134,62,1.2',a36:'sky;person:o,54,52,1.7;child,108,58,1.6',a37:'ground;wall,64,58,1.9;trowel,122,36,1.8',a38:'ground;horse,36,54,1.2;ox,84,58,1.2;sheep,128,62,1.1',
  a39:'sky;camel,46,52,1.5;donkey,100,60,1.1;sheep,136,64,.9',a40:'plain;hill,80,60,2;sheep,52,62,1;sheep,96,48,.8;person,128,62,1.2',a41:'burst;pig,70,48,1.7;pig,36,76,.6;pig,116,74,.6,1;pig,134,56,.5',a42:'sky;ladder,80,52,1.9;dove,46,40,1.2;dove,118,30,1,1;dove,122,66,1.1',
  a43:'ground;pig,34,58,1.1;pig,80,58,1.1;pig,126,58,1.1;cross,80,26,1.6',a44:'ground;person,54,52,1.7;child,108,58,1.6',a45:'sky;tree,56,50,2;dove,58,24,1;dove,118,36,1.3,1',a46:'burst;bag,70,50,2.1;coin,118,36,1.2;coin,128,62,1',
  a47:'ground;person:b,36,54,1.5;loaves,96,58,1.9',a48:'ground;crowd,58,58,1.9;book,122,52,1.3',a49:'ground;cart,56,56,1.6;wheel,122,54,1.5',a50:'plain;jug:2,54,50,2;cup,104,58,1.5;cup,134,62,1.2',
  a51:'ground;barrel:2,30,54,1.5;barrel:2,66,58,1.3;barrel:1,98,61,1.1;barrel:1,126,64,.9',a52:'sky;camel,60,50,1.8;sack,124,62,1.3',a53:'focus;basket,80,52,2.2',
  o1:'sky;stele,80,50,2',o2:'ground;person:s,28,58,1.2;person:s,60,58,1.2;person:s,92,58,1.2;person:s,124,58,1.2',o3:'ground;house,36,50,1.5;cat,86,54,1.5;mouse,130,66,1.1',o4:'sky;road,90,60,1.4;person,40,56,1.5;sack,104,66,.9;cat,132,62,.9',
  o5:'burst;rabbit,58,52,1.7;rabbit,110,58,1.3',o6:'ground;rooster,36,54,1.5;hen,86,60,1.3;chick,126,66,1.1;chick,146,70,.8',o7:'sky;flower,44,48,1.6;bee,96,36,1.4;bee,126,58,1',o8:'plain;board:8,62,50,2.2;grain,128,56,1.5',
  o9:'plain;scale,62,50,1.9;weights,130,44,1.5',o10:'focus;scale,80,48,1.9;coin,36,78,.9;coin,124,78,.9',o11:'plain;river,80,50,1.7',o12:'night;bridge,80,62,2;moon,130,24,1;lantern,46,40,1.2',
  o13:'ground;well,80,58,1.9;frog,128,72,1',o14:'focus;ring,80,50,2.1',o15:'ground;jug:2,36,52,1.9;jug:0,86,58,1.4;jug:0,126,62,1.1',o16:'ground;fountain,44,56,1.8;jug:0,98,56,1.5;jug:0,134,62,1.1',
  o17:'plain;discs:3,80,52,2.2',o18:'plain;discs:4,80,54,2.1',o19:'focus;turtle,80,50,2.2',o20:'plain;board:6,58,50,2.2;queen,124,52,1.7',o21:'burst;board:8,58,50,2.2;queen,124,52,1.9'
 };
 // la letra de cada viñeta: el dato clave del acertijo, en un globo (nunca la respuesta)
 const TXT={a1:'1 legua',a2:'¿100?',a3:'¿100?',a4:'¿100?',a5:'100 × 100',a6:'5 por 2',a7:'30 libras',a8:'300 medidas',a9:'100 × 80',a10:'60 × 40',a11:'¿Parientes?',a11b:'¿Qué son?',a12:'10 · 10 · 10',a13:'30 pueblos',a14:'¿Huellas?',a15:'3 vueltas',a16:'«Dame 2»',a17:'Solo caben 2',a18:'¡Ñam!',a19:'¡Pesan mucho!',a20:'¡Pinchan!',
  a21:'200 × 100',a22:'50 · 60 · 40',a23:'30 · 32 · 34 · 32',a24:'30 · 30 · 18',a25:'400',a26:'¡150 pies!',a27:'1,200 × 600',a28:'80 · 60',a29:'8,000',a30:'240 × 120',a31:'100 × 64',a32:'20 para 20',a33:'30 para 30',a33b:'90 para 90',a34:'100 para 100',a35:'700 monedas',a36:'¡100 años!',a37:'33 al día',a38:'100 × 100',a39:'100 × 100',a40:'¿200?',
  a41:'× 8',a42:'100 escalones',a43:'300 en 3 días',a44:'¿50?',a45:'¿100?',a46:'2 cofres',a47:'12 panes',a48:'¿100?',a49:'7 × 7',a50:'100 barriles',a51:'40 · 30 · 20 · 10',a52:'30 leguas',a53:'204 huevos',
  o1:'1/6 · 1/12 · 1/7',o2:'3 · 5 · 7',o3:'7 × 7 × 7…',o4:'¿Cuántos?',o5:'1, 1, 2, 3…',o6:'100 aves',o7:'¡Bzzz!',o8:'1, 2, 4, 8…',o9:'1 a 40',o10:'¿Cuál pesa más?',o11:'7 puentes',o12:'1 · 2 · 5 · 10',o13:'30 metros',o14:'¿Quién queda?',o15:'8 · 5 · 3',o16:'5 y 3',o17:'3 discos',o18:'4 discos',o19:'15',o20:'6 reinas',o21:'8 reinas'};
 const FONT=`font-family="Impact,'Arial Black','Segoe UI Black',sans-serif" stroke="none"`,esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
 function letters(id,title){
  let h='';const t=String(title||'').toUpperCase();
  if(t){const fs=Math.min(7.5,142/(t.length*.5)),w=t.length*fs*.5+9;h+=`<g transform="skewX(-8)"><rect x="9" y="4.5" width="${w.toFixed(1)}" height="${(fs+5).toFixed(1)}" fill="#fff" stroke="#111" stroke-width="1.6"/><text x="13.5" y="${(fs+6.4).toFixed(1)}" font-size="${fs.toFixed(1)}" fill="#111" ${FONT}>${esc(t)}</text></g>`}
  const b=TXT[id];
  if(b){const w=b.length*4.5+14,cx=155-w/2;h+=`<path d="M${(cx-w/2+8).toFixed(1)} 80 l-7 -8 l12 5 z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/><ellipse cx="${cx.toFixed(1)}" cy="86" rx="${(w/2).toFixed(1)}" ry="8.5" fill="#fff" stroke="#111" stroke-width="1.6"/><path d="M${(cx-w/2+7).toFixed(1)} 80.4 l5.5 -2.6" stroke="#fff" stroke-width="2.4"/><text x="${cx.toFixed(1)}" y="89.4" font-size="9" text-anchor="middle" fill="#111" ${FONT}>${esc(b)}</text>`}
  return h;
 }
 function svg(id,title){
  const spec=(ART[id]||'plain').split(';'),bg=FX[spec[0]]||FX.plain,dark=spec[0]==='night';
  const parts=spec.slice(1).map(s=>{const [name,x,y,sc,flip]=s.split(','),[k,arg]=name.split(':'),f=M[k];if(!f)return '';const z=+sc||1;
   return `<g transform="translate(${x} ${y}) scale(${flip?-z:z} ${z})" stroke-width="${(2.3/z).toFixed(2)}">${f(arg)}</g>`}).join('');
  return `<svg class="pz-art" viewBox="0 0 160 100" role="img" aria-label="${String(title||'').replace(/"/g,'')}" xmlns="http://www.w3.org/2000/svg"><rect width="160" height="100" fill="#fff"/><g fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">${bg()}</g><g fill="#fff" stroke="${dark?'#fff':'#111'}" stroke-linejoin="round" stroke-linecap="round">${parts}</g>${letters(id,title)}<rect x="1.5" y="1.5" width="157" height="97" fill="none" stroke="#111" stroke-width="3"/></svg>`;
 }
 const PAT='<pattern id="pzTone" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill="#fff"/><circle cx=".8" cy=".8" r=".75" fill="#111"/><circle cx="2.3" cy="2.3" r=".75" fill="#111"/></pattern><pattern id="pzTone2" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#fff"/><circle cx="1" cy="1" r=".55" fill="#111"/><circle cx="3" cy="3" r=".55" fill="#111"/></pattern>';
 function defs(){
  if(document.getElementById('pzToneDefs'))return;
  const d=document.createElement('div');d.id='pzToneDefs';d.setAttribute('aria-hidden','true');d.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
  d.innerHTML='<svg width="0" height="0"><defs>'+PAT+'</defs></svg>';
  document.body.appendChild(d);
 }
 // la misma viñeta con la trama dentro, para usarla como imagen suelta (los rompecabezas de js/puzzles.js la cortan en piezas)
 const standalone=(id,title)=>svg(id,title).replace('<rect width="160" height="100" fill="#fff"/>','<defs>'+PAT+'</defs><rect width="160" height="100" fill="#fff"/>');
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',defs);else defs();
 window.SudomiPuzzleArt={svg,standalone,has:id=>!!ART[id],ids:Object.keys(ART)};
})();
