/* SUDOMI 0.3.95 — ILUSTRACIONES de los rompecabezas que se deslizan (pedido del dueño): paisajes de colores y personajes de estilo anime
 * propios (no copian a ningún personaje). window.SudomiPuzzlePics[clave]() devuelve un SVG de 300×300; js/puzzles.js las usa junto a las suyas.
 * Cada imagen tiene muchos colores y formas distintas en cada zona, para que las piezas de 3×3 y 4×4 se distingan bien. */
window.SudomiPuzzlePics=(()=>{
 const S=b=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300">${b}</svg>`;
 const grad=(id,stops,v=1)=>`<linearGradient id="${id}" x1="0" y1="0" x2="${v?0:1}" y2="${v?1:0}">${stops.map(([o,c])=>`<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
 const pine=(x,y,h,c='#1e1438',snow)=>`<path d="M${x} ${y-h}l${h*.32} ${h*.42}h${-h*.12}l${h*.24} ${h*.32}h${-h*.12}l${h*.22} ${h*.26}h${-h*1.08}l${h*.22} ${-h*.26}h${-h*.12}l${h*.24} ${-h*.32}h${-h*.12}z" fill="${c}"/>${snow?`<path d="M${x} ${y-h}l${h*.16} ${h*.21}h${-h*.32}z" fill="#fff"/>`:''}<rect x="${x-h*.05}" y="${y}" width="${h*.1}" height="${h*.12}" fill="#3a2414"/>`;
 const cloud=(x,y,s,o=1)=>`<g transform="translate(${x} ${y}) scale(${s})" fill="#fff" opacity="${o}"><ellipse cx="0" cy="0" rx="26" ry="14"/><ellipse cx="22" cy="-8" rx="20" ry="16"/><ellipse cx="44" cy="2" rx="22" ry="12"/></g>`;
 const stars=(list,c='#fff')=>`<g fill="${c}">${list.map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r||1.4}"/>`).join('')}</g>`;
 const spark=(x,y,s,c='#fff')=>`<path d="M${x} ${y-s}Q${x+s*.15} ${y-s*.15} ${x+s} ${y}Q${x+s*.15} ${y+s*.15} ${x} ${y+s}Q${x-s*.15} ${y+s*.15} ${x-s} ${y}Q${x-s*.15} ${y-s*.15} ${x} ${y-s}Z" fill="${c}"/>`;
 // ---- estilo anime: ojos grandes con brillos, cara con barbilla en punta, rubor
 const EYE=(x,y,c,flip)=>`<g transform="translate(${x} ${y}) scale(${flip?-1:1} 1)"><path d="M-11 -2Q-10 -15 2 -14Q12 -13 12 -1Q12 13 0 14Q-11 13 -11 -2Z" fill="#fff"/><ellipse cx="1" cy="2" rx="8.5" ry="11" fill="${c}"/><ellipse cx="1" cy="5" rx="8.5" ry="7" fill="#000" opacity=".18"/><ellipse cx="1" cy="3" rx="4.5" ry="6.5" fill="#1a1030"/><ellipse cx="-2.5" cy="-3" rx="3.2" ry="4" fill="#fff"/><circle cx="4.5" cy="7" r="1.6" fill="#fff" opacity=".9"/><path d="M-12 -4Q-9 -17 3 -16Q12 -15 14 -6" stroke="#1a1030" stroke-width="3.4" fill="none" stroke-linecap="round"/><path d="M13 -7l4 -3" stroke="#1a1030" stroke-width="2.4" stroke-linecap="round"/></g>`;
 const FACE=(o)=>{const sk=o.skin||'#ffe2cc';return `<path d="M-34 -8Q-36 26 -14 42Q0 52 14 42Q36 26 34 -8Q30 -40 0 -42Q-30 -40 -34 -8Z" fill="${sk}"/><path d="M-34 -8Q-36 26 -14 42Q0 52 14 42Q36 26 34 -8" fill="none" stroke="#b8735a" stroke-width="1.6"/>
  ${EYE(-15,6,o.eye||'#3a7bd5',false)}${EYE(15,6,o.eye||'#3a7bd5',true)}<ellipse cx="-23" cy="22" rx="6.5" ry="3" fill="#ff7a96" opacity=".45"/><ellipse cx="23" cy="22" rx="6.5" ry="3" fill="#ff7a96" opacity=".45"/>
  <path d="M0 18l1.5 3" stroke="#c98a7a" stroke-width="1.6" stroke-linecap="round"/>${o.mouth||'<path d="M-6 30Q0 36 6 30Q0 33 -6 30Z" fill="#c43a52" stroke="#8a2a3a" stroke-width="1.2"/>'}`};
 const P={
  // ===================================== paisajes =====================================
  girasoles:()=>{
   let f='';const flower=(x,y,r)=>{let p='';for(let k=0;k<12;k++){const a=k*30;p+=`<ellipse cx="${x}" cy="${y-r*.95}" rx="${r*.28}" ry="${r*.55}" fill="${k%2?'#ffc21a':'#ffd84a'}" transform="rotate(${a} ${x} ${y})"/>`}return `<path d="M${x} ${y}v${r*3}" stroke="#2f8a3a" stroke-width="${r*.18}"/><ellipse cx="${x+r*.6}" cy="${y+r*1.6}" rx="${r*.5}" ry="${r*.2}" fill="#3aa04a" transform="rotate(-30 ${x+r*.6} ${y+r*1.6})"/>${p}<circle cx="${x}" cy="${y}" r="${r*.55}" fill="#6b3a12"/><circle cx="${x-r*.15}" cy="${y-r*.15}" r="${r*.2}" fill="#8a5a2b"/>`};
   [[30,214,12],[78,206,13],[128,214,12],[176,206,13],[226,212,12],[272,206,13]].forEach(a=>f+=flower(...a));
   [[18,262,20],[72,252,22],[132,266,21],[190,250,23],[250,264,21],[296,250,20]].forEach(a=>f+=flower(...a));
   return S(`<defs>${grad('sk',[[0,'#3aa0ff'],[1,'#bfe8ff']])}</defs><rect width="300" height="300" fill="url(#sk)"/><circle cx="246" cy="52" r="26" fill="#fff36a"/><circle cx="246" cy="52" r="36" fill="#fff36a" opacity=".25"/>${cloud(40,50,1)}${cloud(150,82,.8,.9)}
    <path d="M0 160Q70 120 150 150T300 140V300H0Z" fill="#6fcf5a"/><path d="M0 182Q90 150 180 176T300 170V300H0Z" fill="#4cb84a"/>
    <g><rect x="34" y="118" width="62" height="44" fill="#c0392b"/><path d="M28 120L65 92L102 120Z" fill="#8f2418"/><rect x="56" y="134" width="18" height="28" fill="#fff"/><path d="M56 134l18 28M74 134l-18 28" stroke="#c0392b" stroke-width="3"/><rect x="40" y="126" width="10" height="10" fill="#fff"/><rect x="80" y="126" width="10" height="10" fill="#fff"/></g>
    <g><path d="M218 160l8 -60h8l8 60z" fill="#f2efe6" stroke="#9a8f7a" stroke-width="2"/><circle cx="230" cy="100" r="5" fill="#9a8f7a"/><g stroke="#7a6a5a" stroke-width="4" stroke-linecap="round"><path d="M230 100l-30 -14M230 100l14 -30M230 100l30 14M230 100l-14 30"/></g></g>
    <path d="M0 196H300V300H0Z" fill="#3a9a3a"/>${f}`)},
  cascada:()=>S(`<defs>${grad('sk',[[0,'#7fd8ff'],[1,'#e0f7ff']])}${grad('wf',[[0,'#e8fbff'],[1,'#9fe3ff']])}</defs><rect width="300" height="300" fill="url(#sk)"/>
    <path d="M0 0H110Q100 60 112 120Q96 180 108 230H0Z" fill="#2f8a4a"/><path d="M300 0H190Q202 70 188 130Q204 190 192 230H300Z" fill="#257a3e"/>
    <path d="M0 40Q40 30 70 60T104 120" stroke="#3fae5a" stroke-width="10" fill="none"/><path d="M300 60Q250 50 226 90T196 150" stroke="#3fae5a" stroke-width="10" fill="none"/>
    <rect x="112" y="18" width="76" height="210" fill="url(#wf)"/><g stroke="#ffffff" stroke-width="3" opacity=".9"><path d="M124 18v200M140 18v210M158 18v205M174 18v212"/></g><g stroke="#7fd0f5" stroke-width="2"><path d="M132 30v180M150 26v195M166 34v186"/></g>
    <path d="M70 180A90 90 0 0 1 230 180" stroke="#ff4a4a" stroke-width="5" fill="none" opacity=".55"/><path d="M76 184A84 84 0 0 1 224 184" stroke="#ffd84a" stroke-width="5" fill="none" opacity=".55"/><path d="M82 188A78 78 0 0 1 218 188" stroke="#4adf6a" stroke-width="5" fill="none" opacity=".55"/><path d="M88 192A72 72 0 0 1 212 192" stroke="#4a8cff" stroke-width="5" fill="none" opacity=".55"/>
    <path d="M0 230Q150 205 300 230V300H0Z" fill="#1f9fd6"/><g fill="#fff" opacity=".85"><ellipse cx="150" cy="228" rx="54" ry="10"/><ellipse cx="110" cy="244" rx="18" ry="4"/><ellipse cx="196" cy="250" rx="22" ry="4"/></g>
    <g fill="#7d8796" stroke="#4a5260" stroke-width="2"><path d="M0 268q30 -26 62 -8q14 22 -10 40H0Z"/><path d="M300 262q-34 -22 -66 -4q-12 26 12 42H300Z"/><ellipse cx="96" cy="282" rx="22" ry="12"/></g>
    <g><path d="M30 128h60" stroke="#6b3a12" stroke-width="6" stroke-linecap="round"/><ellipse cx="62" cy="110" rx="12" ry="18" fill="#e0342c"/><path d="M58 96q-18 -2 -26 8q14 2 26 0z" fill="#ffb02e"/><circle cx="60" cy="98" r="3" fill="#fff"/><circle cx="60" cy="98" r="1.4" fill="#000"/><path d="M60 126l-6 16M66 126l4 16" stroke="#1f5fd0" stroke-width="5" stroke-linecap="round"/></g>
    <g><circle cx="240" cy="200" r="8" fill="#ff5aa0"/><circle cx="252" cy="206" r="8" fill="#ff5aa0"/><circle cx="246" cy="196" r="8" fill="#ff7ab8"/><circle cx="246" cy="203" r="4" fill="#ffd84a"/><circle cx="34" cy="206" r="7" fill="#ffd84a"/><circle cx="44" cy="210" r="7" fill="#ffb02e"/><circle cx="39" cy="207" r="3" fill="#e0342c"/></g>
    <path d="M300 0q-60 10 -80 50q40 -20 80 -18z" fill="#4cc25a"/><path d="M0 0q50 20 56 70q-30 -34 -56 -40z" fill="#4cc25a"/>`),
  arrecife:()=>{
   const fish=(x,y,s,a,b,flip)=>`<g transform="translate(${x} ${y}) scale(${flip?-s:s} ${s})"><ellipse rx="16" ry="10" fill="${a}"/><path d="M14 0l12 -9v18z" fill="${a}"/>${b?`<path d="M-6 -9v18M4 -10v20" stroke="${b}" stroke-width="4"/>`:''}<circle cx="-9" cy="-2" r="2.6" fill="#fff"/><circle cx="-9.6" cy="-2" r="1.3" fill="#000"/></g>`;
   return S(`<defs>${grad('wa',[[0,'#3fd0ff'],[1,'#0a3a8a']])}</defs><rect width="300" height="300" fill="url(#wa)"/><g fill="#fff" opacity=".18"><path d="M40 0l30 0l-60 220h-20z"/><path d="M140 0l24 0l-40 200h-20z"/><path d="M230 0l26 0l-30 180h-20z"/></g>
    <path d="M0 250Q80 232 150 248T300 244V300H0Z" fill="#f2d59a"/><path d="M0 268Q100 256 200 270T300 266V300H0Z" fill="#e2c07a"/>
    <g stroke="#ff5a8a" stroke-width="7" stroke-linecap="round" fill="none"><path d="M44 250v-50M44 214l-18 -20M44 222l20 -26M26 194v-14M64 196v-18"/></g>
    <path d="M200 250q-30 -40 0 -80q30 40 0 80z" fill="#ffa02e" opacity=".9"/><path d="M200 250q-46 -30 -40 -66M200 250q46 -30 40 -66" stroke="#ff7a1a" stroke-width="4" fill="none"/>
    <g fill="#9a4ad8"><circle cx="120" cy="244" r="12"/><circle cx="134" cy="236" r="10"/><circle cx="108" cy="232" r="9"/></g><g fill="#2fbf6a"><path d="M260 252q-10 -40 6 -80q4 40 -6 80z"/><path d="M272 252q4 -36 22 -60q-6 34 -22 60z"/><path d="M90 254q-12 -30 2 -60q2 30 -2 60z"/></g>
    ${fish(80,90,1.3,'#ff7a1a','#fff')}${fish(210,120,1.1,'#2a6ee0','#ffd84a',true)}${fish(150,170,.9,'#ffd84a','#2a2a2a')}${fish(60,170,.8,'#ff4a8a','',true)}${fish(250,60,.8,'#ff7a1a','#fff')}
    <g transform="translate(160 66) rotate(-12)"><ellipse rx="30" ry="20" fill="#3a9a5a"/><path d="M-20 -8h40M-24 4h48M-10 -18v36M10 -18v36" stroke="#2a6a3a" stroke-width="3"/><ellipse cx="-36" cy="-2" rx="10" ry="8" fill="#7fcf8a"/><circle cx="-40" cy="-4" r="2" fill="#000"/><ellipse cx="-14" cy="-24" rx="12" ry="5" fill="#7fcf8a" transform="rotate(-30 -14 -24)"/><ellipse cx="-14" cy="24" rx="12" ry="5" fill="#7fcf8a" transform="rotate(30 -14 24)"/><ellipse cx="24" cy="-18" rx="8" ry="4" fill="#7fcf8a"/><ellipse cx="24" cy="18" rx="8" ry="4" fill="#7fcf8a"/></g>
    <g fill="none" stroke="#e8fbff" stroke-width="2"><circle cx="40" cy="40" r="5"/><circle cx="48" cy="24" r="3"/><circle cx="274" cy="160" r="5"/><circle cx="266" cy="140" r="3"/><circle cx="130" cy="130" r="4"/></g>
    <path d="M230 240l6 -14l6 14l14 1l-11 9l4 14l-13 -8l-13 8l4 -14l-11 -9z" fill="#ff5a5a" stroke="#a02a2a" stroke-width="2"/>`)},
  montana:()=>S(`<defs>${grad('sk',[[0,'#2b1a5e'],[.5,'#e2557a'],[.8,'#ffb05a']])}${grad('la',[[0,'#ff9a6a'],[1,'#2a1a4e']])}</defs><rect width="300" height="300" fill="url(#sk)"/>
    ${stars([[20,20],[60,40,1],[110,16],[200,28,1.8],[250,14],[280,46,1],[160,50,1]])}<circle cx="150" cy="168" r="40" fill="#ffe08a"/><circle cx="150" cy="168" r="54" fill="#ffe08a" opacity=".25"/>
    <path d="M0 176L50 110L96 150L150 70L206 138L252 96L300 130V220H0Z" fill="#7a3f8f"/><path d="M150 70L134 92L142 90L150 100L158 90L166 92Z" fill="#fff"/><path d="M252 96L240 112L252 108L262 112Z" fill="#fff"/><path d="M50 110L40 124L50 120L58 124Z" fill="#fff"/>
    <path d="M0 206L44 160L92 196L140 166L196 206L244 170L300 196V230H0Z" fill="#4a2a6e"/>
    <rect y="222" width="300" height="78" fill="url(#la)"/><g fill="#ffe08a" opacity=".75"><rect x="118" y="230" width="64" height="4" rx="2"/><rect x="126" y="242" width="48" height="3" rx="1.5"/><rect x="134" y="252" width="32" height="3" rx="1.5"/><rect x="140" y="262" width="20" height="2" rx="1"/></g>
    ${pine(20,226,46)}${pine(46,228,34)}${pine(268,226,50)}${pine(242,230,32)}${pine(292,230,30)}
    <g stroke="#2a1838" stroke-width="2.4" fill="none" stroke-linecap="round"><path d="M70 60q6 -6 12 0q6 -6 12 0"/><path d="M96 80q5 -5 10 0q5 -5 10 0"/><path d="M220 66q4 -4 8 0q4 -4 8 0"/></g>
    <path d="M90 280q60 -10 120 0" stroke="#fff" stroke-width="2" opacity=".35"/><path d="M60 290q90 -8 180 0" stroke="#fff" stroke-width="2" opacity=".25"/>`),
  pueblo:()=>{
   const house=(x,w,h,c,roof,win)=>`<rect x="${x}" y="${250-h}" width="${w}" height="${h}" fill="${c}" stroke="#5a3a2a" stroke-width="2"/><rect x="${x-3}" y="${246-h}" width="${w+6}" height="8" fill="${roof}"/>
    <rect x="${x+w/2-9}" y="216" width="18" height="34" rx="9" fill="#6b3a12"/><circle cx="${x+w/2+5}" cy="234" r="1.6" fill="#ffd84a"/>
    <rect x="${x+8}" y="${262-h}" width="14" height="20" fill="${win}" stroke="#fff" stroke-width="2"/><rect x="${x+w-22}" y="${262-h}" width="14" height="20" fill="${win}" stroke="#fff" stroke-width="2"/>
    <rect x="${x+4}" y="${284-h}" width="${w-8}" height="4" fill="#3a2a1a"/><path d="M${x+6} ${284-h}v-10M${x+w-6} ${284-h}v-10" stroke="#3a2a1a" stroke-width="2"/><g fill="#ff4a7a"><circle cx="${x+12}" cy="${280-h}" r="3"/><circle cx="${x+w-12}" cy="${280-h}" r="3"/></g>`;
   return S(`<defs>${grad('sk',[[0,'#2a8cff'],[1,'#a8e0ff']])}</defs><rect width="300" height="300" fill="url(#sk)"/>${cloud(30,40,.9)}${cloud(190,30,1.1)}<circle cx="270" cy="70" r="16" fill="#fff36a"/>
    ${house(4,70,150,'#ffd84a','#c0392b','#2a6ee0')}${house(78,66,180,'#3fc7c0','#1f5fd0','#ffb02e')}${house(148,72,140,'#ff7aa8','#7a2a8f','#2fbf6a')}${house(224,72,170,'#ff9a2e','#2a8a4a','#7a2a8f')}
    <path d="M0 250H300V300H0Z" fill="#9aa3ad"/><g stroke="#7a838d" stroke-width="2"><path d="M0 266h300M0 284h300M20 250v16M60 250v16M100 250v16M140 250v16M180 250v16M220 250v16M260 250v16M40 266v18M80 266v18M120 266v18M160 266v18M200 266v18M240 266v18M280 266v18"/></g>
    <g><path d="M290 250q-6 -60 -14 -110" stroke="#8a5a2b" stroke-width="8" fill="none" stroke-linecap="round"/><g fill="#2f9a4a"><path d="M276 140q-30 -16 -46 6q26 -8 46 -6z"/><path d="M276 140q-6 -30 -34 -30q22 10 34 30z"/><path d="M276 140q14 -26 36 -20q-24 4 -36 20z"/></g></g>
    <g transform="translate(110 270)"><circle cx="-14" cy="8" r="9" fill="none" stroke="#222" stroke-width="3"/><circle cx="14" cy="8" r="9" fill="none" stroke="#222" stroke-width="3"/><path d="M-14 8l10 -14h16l2 14M-4 -6l-4 -6M12 -6l2 -6" stroke="#e0342c" stroke-width="3" fill="none"/></g>
    <g transform="translate(200 236)"><ellipse rx="10" ry="7" fill="#444"/><circle cx="-9" cy="-6" r="6" fill="#444"/><path d="M-13 -11l2 -6l3 5M-6 -11l1 -6l3 5" fill="#444"/><path d="M9 0q10 -6 6 -14" stroke="#444" stroke-width="3" fill="none"/><circle cx="-11" cy="-7" r="1.4" fill="#ffd84a"/></g>`)},
  aurora:()=>S(`<defs>${grad('sk',[[0,'#050a24'],[1,'#1a3a6a']])}${grad('a1',[[0,'#3affb0'],[1,'#3affb000']])}${grad('a2',[[0,'#b05aff'],[1,'#b05aff00']])}</defs><rect width="300" height="300" fill="url(#sk)"/>
    ${stars([[14,18],[40,60,1],[70,24,1.8],[98,70,1],[130,14],[170,40,1],[204,20,2],[236,64,1],[268,30],[290,80,1],[22,100,1],[260,110,1]])}
    <path d="M-10 70Q60 30 120 80T240 60T320 90V150Q250 120 200 150T80 140T-10 160Z" fill="url(#a1)" opacity=".75"/><path d="M-10 110Q80 70 150 120T320 110V170Q240 150 160 180T-10 190Z" fill="url(#a2)" opacity=".55"/><path d="M40 50Q120 20 160 70T290 40" stroke="#7affd0" stroke-width="3" fill="none" opacity=".6"/>
    <path d="M0 200L60 130L110 180L170 110L230 175L300 140V240H0Z" fill="#cfe2f5"/><path d="M60 130L48 146L60 142L72 150ZM170 110L154 130L170 124L186 132Z" fill="#fff"/><path d="M110 180L170 110L200 145L170 140L140 170Z" fill="#a8c4e2"/>
    <path d="M0 236Q150 214 300 236V300H0Z" fill="#f4f9ff"/>
    <g><rect x="112" y="210" width="70" height="44" fill="#8a4a2a" stroke="#4a2414" stroke-width="2"/><path d="M104 214L147 182L190 214Z" fill="#f4f9ff" stroke="#9ab" stroke-width="2"/><rect x="122" y="222" width="16" height="14" fill="#ffd84a"/><rect x="158" y="222" width="16" height="14" fill="#ffd84a"/><rect x="141" y="232" width="13" height="22" fill="#4a2414"/><rect x="168" y="186" width="9" height="18" fill="#6b3a22"/>
     <g fill="#cfd8e6" opacity=".7"><circle cx="174" cy="176" r="6"/><circle cx="182" cy="164" r="8"/><circle cx="194" cy="150" r="10"/></g></g>
    ${pine(30,244,60,'#1a4a3a',1)}${pine(66,250,44,'#1f5a44',1)}${pine(232,246,56,'#1a4a3a',1)}${pine(268,252,46,'#1f5a44',1)}${pine(292,240,34,'#1a4a3a',1)}
    <g fill="#fff">${[[20,280],[90,290],[200,286],[250,296],[150,276]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="2"/>`).join('')}</g>`),
  // ===================================== personajes de estilo anime (propios) =====================================
  cerezo:()=>{
   const bloom=(x,y,r)=>`<g><circle cx="${x}" cy="${y}" r="${r}" fill="#ffc0d8"/><circle cx="${x+r*.6}" cy="${y-r*.4}" r="${r*.8}" fill="#ffd6e6"/><circle cx="${x-r*.6}" cy="${y-r*.3}" r="${r*.7}" fill="#ffaecb"/></g>`;
   const petal=(x,y,a)=>`<ellipse cx="${x}" cy="${y}" rx="5" ry="3" fill="#ff9ec0" transform="rotate(${a} ${x} ${y})"/>`;
   return S(`<defs>${grad('sk',[[0,'#bfa8ff'],[1,'#ffe0ef']])}</defs><rect width="300" height="300" fill="url(#sk)"/>
    <path d="M300 30Q200 40 120 20" stroke="#6b3a2a" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M220 36Q190 60 160 64" stroke="#6b3a2a" stroke-width="5" fill="none"/>
    ${bloom(270,30,20)}${bloom(220,26,18)}${bloom(170,22,17)}${bloom(130,26,15)}${bloom(196,60,14)}${bloom(156,66,12)}${bloom(290,60,14)}
    ${[[40,40,20],[70,90,-30],[30,160,50],[260,120,10],[240,200,-40],[90,210,30],[280,250,60],[20,240,-10]].map(a=>petal(...a)).join('')}
    <path d="M0 250Q150 236 300 250V300H0Z" fill="#7fcf8a"/>
    <g transform="translate(150 168)">
     <path d="M-62 -40Q-74 60 -70 132H70Q74 60 62 -40Q50 -76 0 -78Q-50 -76 -62 -40Z" fill="#ff86b4"/>
     <path d="M-46 72L0 60L46 72L58 132H-58Z" fill="#26386a"/><path d="M-30 64L0 92L30 64L0 70Z" fill="#fff"/><path d="M-30 64L-46 72L-34 88Z" fill="#fff"/><path d="M30 64L46 72L34 88Z" fill="#fff"/><path d="M-10 84L0 98L10 84L0 90Z" fill="#e0342c"/><path d="M-12 82l12 6l12 -6l-4 12l-8 -4l-8 4z" fill="#e0342c"/>
     <rect x="-8" y="40" width="16" height="22" fill="#ffe2cc"/>
     ${FACE({eye:'#2fae6a'})}
     <path d="M-38 -10Q-40 -54 0 -56Q40 -54 38 -10L30 -26L22 -4L12 -30L0 -8L-12 -30L-22 -4L-30 -26Z" fill="#ff86b4"/><path d="M-30 -40Q0 -60 30 -40" stroke="#ffc0dc" stroke-width="5" fill="none" opacity=".8"/>
     <g transform="translate(26 -40)"><circle r="7" fill="#ffd6e6"/><circle cx="6" cy="-4" r="5" fill="#ffaecb"/><circle r="2.4" fill="#ffd84a"/></g>
    </g>`)},
  idol:()=>S(`<defs>${grad('bg',[[0,'#1a0a3a'],[1,'#5a1a6a']])}${grad('bm',[[0,'#fff6a0'],[1,'#fff6a000']])}</defs><rect width="300" height="300" fill="url(#bg)"/>
    <path d="M30 0L90 0L180 300H120Z" fill="url(#bm)" opacity=".5"/><path d="M270 0L210 0L120 300H180Z" fill="url(#bm)" opacity=".5"/><path d="M140 0h20l40 300h-100z" fill="#ff8ad8" opacity=".18"/>
    ${spark(40,60,10,'#ffe08a')}${spark(260,80,12,'#8ae0ff')}${spark(60,150,7,'#ff8ad8')}${spark(250,170,8,'#ffe08a')}${spark(150,24,8,'#fff')}
    <g transform="translate(150 150)">
     <path d="M-40 -40Q-110 -10 -100 70Q-96 90 -84 100Q-96 40 -58 10Z" fill="#2ad0c0"/><path d="M40 -40Q110 -10 100 70Q96 90 84 100Q96 40 58 10Z" fill="#2ad0c0"/>
     <circle cx="-42" cy="-42" r="9" fill="#ff4a8a"/><circle cx="42" cy="-42" r="9" fill="#ff4a8a"/>
     <path d="M-40 70Q-60 120 -76 150H76Q60 120 40 70Q0 56 -40 70Z" fill="#ff5aa8"/><path d="M-76 150Q0 128 76 150" stroke="#fff" stroke-width="5" fill="none"/><path d="M-30 74Q0 92 30 74" stroke="#fff" stroke-width="5" fill="none"/>
     <rect x="-8" y="40" width="16" height="24" fill="#ffe2cc"/>
     ${FACE({eye:'#c03aff',mouth:'<path d="M-8 28Q0 40 8 28Z" fill="#c43a52" stroke="#8a2a3a" stroke-width="1.2"/><path d="M-5 31Q0 35 5 31" fill="#ff8aa0"/>'})}
     <path d="M-36 -12Q-38 -54 0 -56Q38 -54 36 -12L28 -26L18 -8L8 -30L-4 -10L-14 -30L-24 -8Z" fill="#2ad0c0"/><path d="M-26 -44Q0 -58 26 -44" stroke="#9af5ec" stroke-width="5" fill="none"/>
     <g transform="translate(46 70) rotate(-20)"><rect x="-4" y="-6" width="8" height="34" rx="4" fill="#ccc"/><circle cy="-12" r="11" fill="#555"/><circle cy="-12" r="11" fill="none" stroke="#ddd" stroke-width="2"/><ellipse cx="-14" cy="20" rx="10" ry="7" fill="#ffe2cc"/></g>
    </g>
    <g>${[[16,'#ff4a8a'],[48,'#4ad0ff'],[80,'#ffe04a'],[112,'#7aff6a'],[188,'#ff4a8a'],[220,'#ffe04a'],[252,'#4ad0ff'],[284,'#b05aff']].map(([x,c],i)=>`<circle cx="${x}" cy="${292-(i%2)*6}" r="9" fill="#1a0a2a"/><path d="M${x} ${284-(i%2)*6}l${i%2?6:-6} -26" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`).join('')}</g>`),
  dragon:()=>S(`<defs>${grad('sk',[[0,'#4aa8ff'],[1,'#d8f0ff']])}</defs><rect width="300" height="300" fill="url(#sk)"/>${cloud(20,240,1.4)}${cloud(200,262,1.3)}${cloud(220,40,.9,.9)}${cloud(30,60,.7,.8)}
    <g transform="translate(150 160)">
     <path d="M-20 -10Q-110 -90 -140 -40Q-110 -50 -96 -20Q-120 -20 -126 6Q-90 -8 -40 20Z" fill="#2f9a5a" stroke="#1a5a34" stroke-width="3"/><path d="M-96 -20l20 30M-120 -34l40 46" stroke="#1a5a34" stroke-width="2"/>
     <path d="M30 -10Q120 -90 150 -40Q120 -50 106 -20Q130 -20 136 6Q100 -8 50 20Z" fill="#3aaf6a" stroke="#1a5a34" stroke-width="3"/>
     <path d="M-60 40Q0 0 70 30Q100 44 130 30Q120 56 90 60Q40 70 -10 64Q-50 62 -60 40Z" fill="#4cc27a" stroke="#1a5a34" stroke-width="3"/><path d="M-10 64Q20 50 60 58" stroke="#d8ffb0" stroke-width="8" fill="none" opacity=".7"/>
     <path d="M-60 40Q-90 30 -110 46Q-122 58 -104 64Q-86 70 -70 58Z" fill="#4cc27a" stroke="#1a5a34" stroke-width="3"/><circle cx="-96" cy="48" r="4" fill="#ffd84a"/><circle cx="-96" cy="48" r="1.8" fill="#000"/><path d="M-90 36l-6 -14l12 10M-80 34l2 -14l6 12" fill="#f2e3b8" stroke="#1a5a34" stroke-width="1.5"/>
     <path d="M126 30q20 -4 26 -20q4 14 -10 24z" fill="#4cc27a" stroke="#1a5a34" stroke-width="2"/><path d="M0 4l6 -12l6 10l6 -12l6 10l6 -12l6 12" fill="#ffb02e"/>
     <g transform="translate(10 -40)">
      <path d="M-24 40Q-30 70 -16 76H22Q34 70 26 40Q0 30 -24 40Z" fill="#2a6ee0"/><path d="M-30 46Q-70 50 -88 30" stroke="#e0342c" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M-30 46Q-60 60 -84 52" stroke="#c0281f" stroke-width="7" fill="none" stroke-linecap="round"/>
      <g transform="scale(.62) translate(0 -20)">${FACE({eye:'#a0602a'})}<path d="M-38 -8Q-40 -56 0 -58Q40 -56 38 -8L32 -30L24 -10L16 -34L4 -14L-6 -36L-16 -14L-26 -34Z" fill="#7a4a22"/><path d="M-36 -26h72" stroke="#5a5a5a" stroke-width="9"/><circle cx="-14" cy="-26" r="9" fill="#9ae0ff" stroke="#5a5a5a" stroke-width="4"/><circle cx="14" cy="-26" r="9" fill="#9ae0ff" stroke="#5a5a5a" stroke-width="4"/></g>
     </g>
    </g>`),
  ninja:()=>S(`<defs>${grad('sk',[[0,'#0a0f2e'],[1,'#3a2a6a']])}</defs><rect width="300" height="300" fill="url(#sk)"/>${stars([[20,30],[60,80,1],[110,20,1],[240,40],[280,100,1],[200,110,1],[30,140,1]])}
    <circle cx="210" cy="100" r="64" fill="#fff4c8"/><circle cx="186" cy="80" r="10" fill="#efe2a8"/><circle cx="232" cy="122" r="14" fill="#efe2a8"/><circle cx="240" cy="80" r="6" fill="#efe2a8"/>
    <path d="M0 236L40 216H120L160 236V300H0Z" fill="#2a1a3a"/><path d="M-10 236Q80 222 170 236" stroke="#5a3a5a" stroke-width="6" fill="none"/><path d="M180 260L220 240H300V300H180Z" fill="#3a2244"/><path d="M174 260Q240 246 306 260" stroke="#6a4a6a" stroke-width="6" fill="none"/>
    <g fill="#ffd84a"><rect x="30" y="250" width="12" height="16"/><rect x="90" y="250" width="12" height="16"/><rect x="240" y="270" width="12" height="16"/></g>
    <g transform="translate(120 150)">
     <path d="M-50 70Q-60 110 -70 150H70Q60 110 50 70Q0 54 -50 70Z" fill="#1f2a4a"/><path d="M-30 72L0 100L30 72" stroke="#ff7a1a" stroke-width="10" fill="none"/>
     <path d="M30 60Q90 40 150 70Q110 62 80 74Q120 80 140 100Q90 84 40 80Z" fill="#ff7a1a"/>
     <rect x="-8" y="40" width="16" height="24" fill="#f0d0b0"/>
     ${FACE({skin:'#f0d0b0',eye:'#ffb02e',mouth:'<path d="M-7 31h14" stroke="#8a2a3a" stroke-width="2.4" stroke-linecap="round"/>'})}
     <path d="M-36 -18h72v12h-72z" fill="#c0281f"/><rect x="-10" y="-18" width="20" height="12" fill="#c9ced8" stroke="#7a8090" stroke-width="2"/><path d="M-2 -14l4 4M2 -14l-4 4" stroke="#7a8090" stroke-width="1.5"/>
     <path d="M-40 -12L-56 -50L-30 -36L-30 -76L-10 -46L6 -84L14 -48L40 -78L34 -40L60 -56L40 -12Q0 -26 -40 -12Z" fill="#1a1a3a"/><path d="M-4 -60L6 -84L14 -48Z" fill="#3a3a6a"/>
     <path d="M36 -12q30 -8 46 6q-20 -2 -40 8z" fill="#c0281f"/>
    </g>
    <g transform="translate(250 230) rotate(20)" fill="#c9ced8" stroke="#5a6070" stroke-width="2"><path d="M0 -16L4 -4L16 0L4 4L0 16L-4 4L-16 0L-4 -4Z"/><circle r="3" fill="#2a2a3a"/></g>`),
  maga:()=>S(`<defs>${grad('sk',[[0,'#1a0f4a'],[1,'#6a3aa8']])}</defs><rect width="300" height="300" fill="url(#sk)"/>${stars([[20,20,2],[50,70],[90,30,1],[260,40,2],[280,120],[230,90,1],[30,180,1],[270,200,1]],'#fff7c0')}
    <path d="M250 50a26 26 0 1 0 22 40a20 20 0 1 1 -22 -40z" fill="#fff4c8"/>${spark(60,120,10,'#ffe08a')}${spark(240,150,8,'#9ae0ff')}${spark(40,240,7,'#ff9ae0')}
    <g transform="translate(150 168)">
     <path d="M-58 -30Q-70 50 -60 132H60Q70 50 58 -30Q40 -62 0 -62Q-40 -62 -58 -30Z" fill="#b8d8ff"/>
     <path d="M-48 70Q-66 110 -72 132H72Q66 110 48 70Q0 56 -48 70Z" fill="#4a2a8a"/><path d="M-20 70h40l-8 20h-24z" fill="#ffd84a"/><circle cy="80" r="5" fill="#e0342c"/>
     <rect x="-8" y="40" width="16" height="22" fill="#ffe2cc"/>
     ${FACE({eye:'#ffb02e'})}
     <path d="M-36 -12Q-38 -50 0 -52Q38 -50 36 -12L26 -28L14 -8L4 -30L-8 -10L-18 -30L-28 -8Z" fill="#b8d8ff"/>
     <path d="M-84 -28Q0 -54 84 -28Q60 -16 0 -24Q-60 -16 -84 -28Z" fill="#3a1f6a" stroke="#22104a" stroke-width="2"/><path d="M-40 -32Q-20 -110 30 -136Q20 -100 40 -34Z" fill="#4a2a8a" stroke="#22104a" stroke-width="2"/><path d="M-38 -38Q0 -46 40 -38L38 -30Q0 -38 -38 -30Z" fill="#ffd84a"/>${spark(4,-80,8,'#ffd84a')}
     <g transform="translate(72 40) rotate(14)"><rect x="-3" y="-30" width="6" height="110" rx="3" fill="#8a5a2b"/>${spark(0,-42,16,'#fff36a')}<circle cy="-42" r="22" fill="#fff36a" opacity=".25"/><ellipse cx="-10" cy="16" rx="10" ry="7" fill="#ffe2cc"/></g>
    </g>`),
  cocinera:()=>S(`<defs>${grad('bg',[[0,'#ffcf7a'],[1,'#ff8a4a']])}</defs><rect width="300" height="300" fill="url(#bg)"/>
    <rect x="0" y="0" width="300" height="70" fill="#c0281f"/><g stroke="#8f1a12" stroke-width="3"><path d="M75 0v70M150 0v70M225 0v70"/></g><g fill="#fff" font-family="sans-serif" font-weight="900" font-size="30" text-anchor="middle"><text x="37" y="48">ラ</text><text x="112" y="48">ー</text><text x="187" y="48">メ</text><text x="262" y="48">ン</text></g>
    <g><rect x="18" y="96" width="30" height="40" rx="4" fill="#e0342c"/><rect x="24" y="90" width="18" height="8" fill="#f4f4f4"/><circle cx="33" cy="80" r="10" fill="#fff4c8" opacity=".9"/></g><g><rect x="250" y="100" width="34" height="36" rx="6" fill="#2a6ee0"/><path d="M256 100v-14h22v14" fill="none" stroke="#2a6ee0" stroke-width="4"/></g>
    <rect x="0" y="250" width="300" height="50" fill="#8a5a2b"/><path d="M0 250h300" stroke="#5a3a1a" stroke-width="5"/>
    <g transform="translate(150 158)">
     <path d="M-36 -40Q-60 0 -54 40Q-30 30 -36 -10Z" fill="#ff7a1a"/><path d="M36 -40Q60 0 54 40Q30 30 36 -10Z" fill="#ff7a1a"/>
     <path d="M-50 70Q-62 100 -66 92H66Q62 100 50 70Q0 56 -50 70Z" fill="#fff"/><path d="M-50 70Q0 60 50 70V92H-50Z" fill="#fff"/><path d="M-24 66h48v26h-48z" fill="#ff9ab8"/>
     <rect x="-8" y="40" width="16" height="22" fill="#ffe2cc"/>
     ${FACE({eye:'#6a3a1a',mouth:'<path d="M-9 28Q0 40 9 28Z" fill="#c43a52" stroke="#8a2a3a" stroke-width="1.2"/><path d="M-5 32Q0 36 5 32" fill="#ff8aa0"/>'})}
     <path d="M-36 -12Q-38 -50 0 -52Q38 -50 36 -12L26 -30L16 -10L6 -34L-6 -12L-16 -34L-26 -12Z" fill="#ff7a1a"/>
     <path d="M-40 -40Q-44 -76 -18 -70Q-10 -96 14 -84Q36 -96 44 -70Q62 -66 40 -40Z" fill="#fff" stroke="#ddd" stroke-width="2"/><rect x="-40" y="-46" width="80" height="12" fill="#fff" stroke="#ddd" stroke-width="2"/>
    </g>
    <g transform="translate(150 246)"><path d="M-62 -16H62Q58 30 0 34Q-58 30 -62 -16Z" fill="#e0342c" stroke="#8f1a12" stroke-width="3"/><path d="M-62 -16H62" stroke="#ffd84a" stroke-width="4"/><ellipse cy="-16" rx="60" ry="8" fill="#ffd27a"/>
     <path d="M-40 -18q10 -6 20 0t20 0t20 0t20 0" stroke="#ffe8a0" stroke-width="4" fill="none"/><circle cx="-22" cy="-20" r="8" fill="#fff"/><circle cx="-22" cy="-20" r="4" fill="#ffb02e"/><path d="M14 -24l20 -4" stroke="#3a7a3a" stroke-width="5"/><ellipse cx="30" cy="-20" rx="10" ry="5" fill="#f4c0c0"/>
     <path d="M-20 -40q-8 -14 0 -26M0 -42q-8 -14 0 -26M20 -40q-8 -14 0 -26" stroke="#fff" stroke-width="3" fill="none" opacity=".8"/><path d="M40 -60l30 46M50 -64l30 46" stroke="#c98a45" stroke-width="4"/></g>`)
 };
 return P;
})();
