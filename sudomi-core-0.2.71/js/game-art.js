/* SUDOMI 0.2.19 — small drawings used as the background of each card in "Otros juegos".
 * window.SudomiGameArt[id] is an SVG string. Pure decoration: no game logic here.
 * To add a game: add one entry with the same id used in the `games` list of other-games.js.
 */
window.SudomiGameArt=(()=>{
 const svg=(bg,body)=>`<svg viewBox="0 0 200 140" preserveAspectRatio="xMidYMin slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="200" height="140" fill="${bg}"/>${body}</svg>`;
 const r=(x,y,w,h,f,rx=0,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${f}" ${extra}/>`;
 const c=(x,y,rad,f,extra='')=>`<circle cx="${x}" cy="${y}" r="${rad}" fill="${f}" ${extra}/>`;
 const t=(x,y,s,f,txt,extra='')=>`<text x="${x}" y="${y}" font-size="${s}" fill="${f}" font-weight="900" text-anchor="middle" font-family="system-ui,-apple-system,Segoe UI,sans-serif" ${extra}>${txt}</text>`;
 const line=(x1,y1,x2,y2,col,w=4)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
 const grid=(rows,cols,x0,y0,size,gap,fn)=>{let o='';for(let i=0;i<rows;i++)for(let j=0;j<cols;j++)o+=fn(x0+j*(size+gap),y0+i*(size+gap),i,j);return o};
 const g=(x,y,rot,body)=>`<g transform="translate(${x} ${y}) rotate(${rot})">${body}</g>`;
 // a playing card centred on 0,0
 const card=(label,col,w=42,h=58,fill='#fff',edge='#c9d3e3')=>r(-w/2,-h/2,w,h,fill,6,`stroke="${edge}" stroke-width="1.5"`)+t(0,9,label.length>2?17:24,col,label);
 const back=(w=42,h=58)=>r(-w/2,-h/2,w,h,'#1a5ec4',6,'stroke="#fff" stroke-width="3"')+r(-w/2+7,-h/2+7,w-14,h-14,'#0b3d91',3);
 const pips={0:[],1:[4],2:[0,8],3:[0,4,8],4:[0,2,6,8],5:[0,2,4,6,8],6:[0,2,3,5,6,8]};
 const half=(n,ox)=>pips[n].map(p=>c(ox+(p%3-1)*7,(Math.floor(p/3)-1)*7,2.6,'#10213b')).join('');
 const domino=(a,b)=>r(-30,-16,60,32,'#fffdf5',6,'stroke="#b9ae92" stroke-width="1.5"')+line(0,-10,0,10,'#7b7258',2)+half(a,-15)+half(b,15);
 const chip=(x,y,col)=>c(x,y,11,col,'stroke="#fff" stroke-width="3" stroke-dasharray="5 4"')+c(x,y,5,'#fff','opacity=".85"');
 const felt='#17704a';

 const art={
  mines:svg('#8fa2ba',grid(4,7,13,10,22,3,(x,y,i,j)=>{
    const k=i*7+j,open=[1,2,3,8,9,10,15,16,17,22,23].includes(k),num={1:'1',3:'2',8:'1',10:'3',15:'2',17:'1',22:'1'}[k];
    return r(x,y,22,22,open?'#f7f9fc':'#dfe7f1',4,open?'':'stroke="#b9c6d6" stroke-width="1.5"')+(num?t(x+11,y+17,15,['','#0b6bd6','#1c8a4a','#d62027'][+num],num):'')+(k===5?t(x+11,y+17,14,'#000','🚩'):'')+(k===12?t(x+11,y+17,14,'#000','💣'):'');
  })),
  fleet:svg('#1e6fb3',grid(5,8,12,8,20,2,(x,y,i,j)=>r(x,y,20,20,(i+j)%2?'#2d86cf':'#2a7fc6',3))+
   r(56,30,64,20,'#6f8296',10)+r(74,24,20,10,'#8fa1b4',3)+r(122,74,20,42,'#6f8296',10)+
   c(44,62,7,'#fff','opacity=".9"')+c(154,40,7,'#fff','opacity=".9"')+c(88,84,7,'#fff','opacity=".9"')+
   c(88,40,8,'#ff4d57')+c(110,40,8,'#ff4d57')+t(88,45,13,'#fff','✹')+t(110,45,13,'#fff','✹')),
  chess:svg('#9b7159',grid(5,8,0,0,25,0,(x,y,i,j)=>r(x,y,25,25,(i+j)%2?'#9b7159':'#f0dfc2'))+
   t(37,45,26,'#1d2a3b','♞')+t(112,45,26,'#1d2a3b','♛')+t(162,45,26,'#1d2a3b','♜')+t(62,95,26,'#fff','♙','stroke="#23354f" stroke-width=".8"')+t(137,70,26,'#fff','♔','stroke="#23354f" stroke-width=".8"')),
  checkers:svg('#9b7159',grid(5,8,0,0,25,0,(x,y,i,j)=>r(x,y,25,25,(i+j)%2?'#9b7159':'#f0dfc2')+((i+j)%2&&i<2?c(x+12.5,y+12.5,9,'#243449','stroke="#ffffff66" stroke-width="2"'):'')+((i+j)%2&&i>2?c(x+12.5,y+12.5,9,'#d0222f','stroke="#ffffff88" stroke-width="2"'):''))+
   t(112.5,69,13,'#f5d889','♛')),
  tictactoe:svg('#e9f0fa',line(78,12,78,104,'#b9c8dc',5)+line(122,12,122,104,'#b9c8dc',5)+line(40,42,160,42,'#b9c8dc',5)+line(40,74,160,74,'#b9c8dc',5)+
   t(58,37,30,'#0b3d91','✕')+t(100,69,30,'#0b3d91','✕')+t(142,101,30,'#0b3d91','✕')+t(142,37,30,'#d62027','◯')+t(58,101,30,'#d62027','◯')+line(46,18,154,100,'#f3c844',5)),
  connect4:svg('#0e4aa8',grid(4,7,17,8,20,4,(x,y,i,j)=>{
    const k=i*7+j,red=[23,24,17,11,25].includes(k),yel=[22,16,10,18,26,21].includes(k);
    return c(x+10,y+10,10,red?'#e5303c':yel?'#f4bd2a':'#dbe8f7','stroke="#0a3a86" stroke-width="2"');
  })),
  domino:svg(felt,g(52,34,-14,domino(6,4))+g(120,30,8,domino(4,2))+g(150,72,90,domino(2,5))+g(78,78,4,domino(5,5))),
  memory:svg('#123a7a',grid(2,4,20,10,34,8,(x,y,i,j)=>{
    const k=i*4+j,up={1:'🐶',6:'🐶',3:'🦊'}[k];
    return r(x,y,34,40,up?'#fff':'#2a86e0',7,up?'stroke="#c8d4e6" stroke-width="2"':'stroke="#0b3d91" stroke-width="2"')+(up?t(x+17,y+29,22,'#000',up):t(x+17,y+28,20,'#ffffff70','?'));
  })),
  dotsboxes:svg('#f4f7fc',r(60,22,40,40,'#e1263655',4)+r(100,62,40,40,'#1761b255',4)+
   line(60,22,100,22,'#e12636',5)+line(60,22,60,62,'#e12636',5)+line(100,22,100,62,'#e12636',5)+line(60,62,100,62,'#e12636',5)+
   line(100,62,140,62,'#1761b2',5)+line(140,62,140,102,'#1761b2',5)+line(100,62,100,102,'#1761b2',5)+line(100,102,140,102,'#1761b2',5)+line(140,22,180,22,'#1761b2',5)+line(20,62,20,102,'#e12636',5)+
   grid(3,5,20,22,0,40,(x,y)=>c(x,y,5.5,'#10213b'))),
  stop:svg('#b3131a','STOP'.split('').map((ch,i)=>g(34+i*44,48,[-8,5,-4,7][i],r(-18,-22,36,44,'#fff',8)+t(0,11,30,'#b3131a',ch))).join('')),
  mahjong:svg('#145a3c',[['中','#d62027',-6],['發','#1c8a4a',4],['東','#10213b',-3],['萬','#b3262c',6]].map(([ch,col,rot],i)=>g(34+i*44,46,rot,r(-17,-23,34,46,'#fffdf4',6,'stroke="#b9ae8e" stroke-width="2"')+r(-17,19,34,6,'#2f9a63',3)+t(0,9,22,col,ch))).join('')),
  blackjack:svg(felt,g(72,48,-10,card('A♠','#10213b'))+g(118,48,9,card('K♥','#d62027'))+r(140,10,48,24,'#ffd54a',12)+t(164,28,17,'#4a3500','21')),
  poker:svg('#0f4d35',[['10♥','#d62027'],['J♥','#d62027'],['Q♥','#d62027'],['K♥','#d62027'],['A♥','#d62027']].map(([l,col],i)=>g(48+i*24,54,-20+i*10,card(l,col,38,54))).join('')+chip(170,24,'#d62027')+chip(182,44,'#0b3d91')),
  escoba:svg('#8a5a1c',[['7','#9a6a00','●'],['5','#b3262c','♥'],['3','#1d4ea8','⚔']].map(([n,col,s],i)=>g(52+i*48,48,[-8,2,9][i],r(-21,-30,42,60,'#fffaf0',6,'stroke="#c9a45c" stroke-width="2"')+t(-10,-12,15,col,n)+t(0,16,24,col,s))).join('')+t(176,26,22,'#000','🧹')),
  rummy:svg('#1d4e89',[['5♣','#10213b'],['6♣','#10213b'],['7♣','#10213b']].map(([l,col],i)=>g(46+i*26,50,0,card(l,col,38,54))).join('')+[['9♦','#d62027'],['9♠','#10213b']].map(([l,col],i)=>g(138+i*26,50,0,card(l,col,38,54))).join('')+g(176,96,8,back(34,48))),
  // 0.2.61: Fichas deslizantes — two boards of pink tiles, a few turned over, the blue comodín sliding in
  slide:svg('#8c3a63',grid(3,6,26,18,22,4,(x,y,i,j)=>r(x,y,22,22,i===1&&j===2?'#fffaf0':'#f6a9c6',4,'stroke="#fff" stroke-opacity=".6" stroke-width="1.5"')+(i===1&&j===2?t(x+11,y+17,14,'#10213b','🥭'):''))+grid(2,6,26,92,22,4,(x,y,i,j)=>r(x,y,22,22,i===0&&j===4?'#fffaf0':'#f6a9c6',4,'stroke="#fff" stroke-opacity=".6" stroke-width="1.5"')+(i===0&&j===4?t(x+11,y+17,14,'#10213b','🥁'):''))+r(170,50,22,30,'#2a7de1',4,'stroke="#fff" stroke-width="2"')+t(181,72,18,'#ffd54a','★'))
 };
 // DOS: four coloured cards and a black special one
 const dcard=(fill,label,col='#fff')=>r(-21,-30,42,60,fill,7,'stroke="#fff" stroke-width="3"')+`<ellipse cx="0" cy="0" rx="13" ry="21" fill="#ffffff2e" transform="rotate(28)"/>`+t(0,9,label.length>1?17:26,col,label);
 art.dos=svg('#2a1b4d',g(40,52,-18,dcard('#d62027','7'))+g(76,46,-8,dcard('#1761b2','⊘'))+g(112,44,2,dcard('#1c8a4a','+2'))+g(148,48,12,dcard('#e2a400','2'))+g(176,62,24,dcard('#1b1f2a','🌪')));
 return art;
})();
