/* SUDOMI 0.2.74 — avatares especiales: DRAGONES (solo para el nombre «Madeline» / «Madelin»).
 * El perfil guarda el avatar como un texto corto (por ejemplo '🐲👑'; así funciona en todos los juegos y salas, aunque no esté este archivo).
 * Aquí, cada vez que uno de esos textos aparece en pantalla, se cambia por un dibujo SVG propio.
 * Son 8 dragones de dibujo original, con colores y detalles inspirados en el mundo de los jinetes de dragón (tormenta, sombras, plumas, fuego,
 * daga, escudo de jinete y alas de hierro). Los textos son de 4 caracteres o menos para que las salas y la lista de amigos no los recorten.
 * Solo se pueden ELEGIR en el editor de perfil cuando el nombre es Madeline (ver js/profile.js). */
(() => {
  const wrap = inner => '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + inner + '</svg>';
  // Cabeza de dragón con colores intercambiables: c = paleta, o.back = dibujo detrás de la cabeza, o.front = dibujo encima.
  const head = (c, o = {}) => (o.back || '') +
    '<path d="M18 26 10 8l15 9z" fill="' + c.horn + '" stroke="' + c.hornS + '" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<path d="M46 26 54 8 39 17z" fill="' + c.horn + '" stroke="' + c.hornS + '" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<path d="M12 35 3 30l6 11z" fill="' + c.fin + '" stroke="' + c.dark + '" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<path d="M52 35 61 30l-6 11z" fill="' + c.fin + '" stroke="' + c.dark + '" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<path d="M32 18C46 18 54 28 53 40 52 52 43 59 32 59 21 59 12 52 11 40 10 28 18 18 32 18z" fill="' + c.body + '" stroke="' + c.dark + '" stroke-width="2"/>' +
    '<ellipse cx="32" cy="47" rx="13" ry="9" fill="' + c.belly + '" stroke="' + c.dark + '" stroke-width="1.5"/>' +
    '<circle cx="27" cy="45.5" r="1.8" fill="' + c.dark + '"/><circle cx="37" cy="45.5" r="1.8" fill="' + c.dark + '"/>' +
    '<ellipse cx="23" cy="34" rx="5" ry="4.3" fill="' + c.eyew + '" stroke="' + c.dark + '" stroke-width="1"/><ellipse cx="41" cy="34" rx="5" ry="4.3" fill="' + c.eyew + '" stroke="' + c.dark + '" stroke-width="1"/>' +
    '<ellipse cx="23.8" cy="34" rx="1.8" ry="3.4" fill="' + c.pup + '"/><ellipse cx="40.2" cy="34" rx="1.8" ry="3.4" fill="' + c.pup + '"/>' +
    '<path d="M17 29l11 2.5M47 29 36 31.5" stroke="' + c.dark + '" stroke-width="2.2" stroke-linecap="round" fill="none"/>' +
    '<path d="M25 52q7 4 14 0" stroke="' + c.dark + '" stroke-width="1.7" fill="none" stroke-linecap="round"/>' + (o.front || '');

  const CROWN = '<path d="M20 22 22 8l5 7 5-10 5 10 5-7 2 14z" fill="#ffcf1f" stroke="#a87b00" stroke-width="1.5" stroke-linejoin="round"/>' +
    '<rect x="20" y="19.5" width="24" height="4.5" rx="1.6" fill="#f2b800" stroke="#a87b00" stroke-width="1.2"/>' +
    '<circle cx="32" cy="12.5" r="2" fill="#e0243a"/><circle cx="24.5" cy="15.5" r="1.4" fill="#2a6fe0"/><circle cx="39.5" cy="15.5" r="1.4" fill="#2a6fe0"/>';

  const LIST = [
    { id: '🐲👑', name: 'Dragón con corona',
      svg: wrap(head({ body: '#3fd276', dark: '#14733c', belly: '#9cf2b8', horn: '#f4e3b2', hornS: '#b79b5a', fin: '#1f9d55', eyew: '#fff6c2', pup: '#222' }, { front: CROWN })) },
    { id: '🐉⚡', name: 'Dragón de tormenta',
      svg: wrap(head({ body: '#2b2d3a', dark: '#0c0d14', belly: '#555a73', horn: '#a9acc2', hornS: '#44465a', fin: '#3a3d52', eyew: '#fff6a0', pup: '#111' }, {
        back: '<path d="M3 22l8 3-5 4 8 4M61 22l-8 3 5 4-8 4" stroke="#7fd4ff" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
        front: '<path d="M34 15 27 28h5l-3 9 11-14h-5.5L38 15z" fill="#ffe34d" stroke="#b58900" stroke-width="1.2" stroke-linejoin="round"/>' })) },
    { id: '🐉🌑', name: 'Dragón de sombras',
      svg: wrap(head({ body: '#232a66', dark: '#0a0e30', belly: '#4a56a8', horn: '#d6dbff', hornS: '#7f89d6', fin: '#3a45a0', eyew: '#eef0ff', pup: '#1a1a3a' }, {
        back: '<path d="M7 56c7-9-2-15 4-24M57 56c-7-9 2-15-4-24M3 40c5-7 0-11 3-18M61 40c-5-7 0-11-3-18" stroke="#6b79ff" stroke-width="3.2" fill="none" opacity=".6" stroke-linecap="round"/>',
        front: '<circle cx="32" cy="25" r="4.2" fill="#c3ccff"/><circle cx="34" cy="24" r="3.4" fill="#232a66"/>' })) },
    { id: '🐉🪶', name: 'Dragón dorado de plumas',
      svg: wrap(head({ body: '#f2b632', dark: '#9a6408', belly: '#ffeab0', horn: '#fff3d1', hornS: '#c8a45a', fin: '#ffd770', eyew: '#ffe1e1', pup: '#7a1020' }, {
        back: '<g fill="#ffe7ae" stroke="#c58a1c" stroke-width="1.2"><ellipse cx="8" cy="34" rx="9" ry="3.8" transform="rotate(-38 8 34)"/><ellipse cx="6" cy="44" rx="9" ry="3.8" transform="rotate(-12 6 44)"/><ellipse cx="9" cy="53" rx="8" ry="3.4" transform="rotate(18 9 53)"/><ellipse cx="56" cy="34" rx="9" ry="3.8" transform="rotate(38 56 34)"/><ellipse cx="58" cy="44" rx="9" ry="3.8" transform="rotate(12 58 44)"/><ellipse cx="55" cy="53" rx="8" ry="3.4" transform="rotate(-18 55 53)"/></g>',
        front: '<path d="M32 19c-3 3-3 6 0 9 3-3 3-6 0-9z" fill="#fff3d1" stroke="#c58a1c" stroke-width="1"/>' })) },
    { id: '🐉🔥', name: 'Dragón de fuego',
      svg: wrap(head({ body: '#e3412a', dark: '#7e1608', belly: '#ffc46b', horn: '#ffe2a0', hornS: '#b87a2a', fin: '#ff8a2a', eyew: '#fff2c4', pup: '#5a1000' }, {
        back: '<path d="M32 1c4 8 11 8 8 17 5-2 7-6 7-11 7 9 4 19-2 24H23c-6-5-9-15-2-24 1 5 3 9 7 11-3-9 4-9 4-17z" fill="#ffb02a" stroke="#e3412a" stroke-width="1.4" stroke-linejoin="round"/>',
        front: '<path d="M32 58q-3 4 0 6 3-2 0-6z" fill="#ffb02a"/>' })) },
    { id: '🐉🗡', name: 'Dragón y daga',
      svg: wrap(head({ body: '#5d7f9e', dark: '#243e55', belly: '#c3d8ea', horn: '#e8eef5', hornS: '#7b94ad', fin: '#3f5d7a', eyew: '#ffe5e5', pup: '#8b0d1c' }, {
        back: '<path d="M32 0l4 9v36h-8V9z" fill="#dfe7ef" stroke="#7a8794" stroke-width="1.3" stroke-linejoin="round"/><path d="M32 3v40" stroke="#aab6c2" stroke-width="1"/>',
        front: '<rect x="19" y="56.5" width="26" height="3.6" rx="1.4" fill="#e0a800" stroke="#8a6500" stroke-width="1"/><rect x="29" y="60" width="6" height="4" rx="1" fill="#6b4423" stroke="#3b2410" stroke-width="1"/>' })) },
    { id: '🐉🛡', name: 'Escudo de jinete',
      svg: wrap('<path d="M32 2 56 10v21c0 14-10 25-24 31C18 56 8 45 8 31V10z" fill="#6f7a89" stroke="#2c333d" stroke-width="2.4" stroke-linejoin="round"/>' +
        '<path d="M32 7 51 13v18c0 11-8 20-19 25C21 51 13 42 13 31V13z" fill="#4b5461" stroke="#aab4c2" stroke-width="1.6" stroke-linejoin="round"/>' +
        '<g transform="translate(15 15) scale(.58)">' + head({ body: '#c9d1dc', dark: '#2c333d', belly: '#eef2f7', horn: '#ffffff', hornS: '#7b8794', fin: '#9aa5b3', eyew: '#ffb347', pup: '#2c1500' }) + '</g>') },
    { id: '🐉🔩', name: 'Alas de hierro',
      svg: wrap(head({ body: '#8e98a6', dark: '#2a3038', belly: '#c9d1db', horn: '#e4e9ef', hornS: '#58626f', fin: '#58626f', eyew: '#ffa63a', pup: '#3a1500' }, {
        back: '<path d="M15 40 0 11l19 9-3-14 14 17z" fill="#59626f" stroke="#2a3038" stroke-width="1.5" stroke-linejoin="round"/><path d="M49 40 64 11l-19 9 3-14-14 17z" fill="#59626f" stroke="#2a3038" stroke-width="1.5" stroke-linejoin="round"/>',
        front: '<path d="M24 22q8-4 16 0M26.5 26.5q5.5-3 11 0" stroke="#2a3038" stroke-width="1.4" fill="none" stroke-linecap="round"/><g fill="#dfe5ec" stroke="#2a3038" stroke-width=".7"><circle cx="19" cy="42" r="1.3"/><circle cx="45" cy="42" r="1.3"/><circle cx="32" cy="21" r="1.3"/></g>' })) }
  ];
  const BY_ID = Object.fromEntries(LIST.map(d => [d.id, d]));
  const IDS = LIST.map(d => d.id);
  const SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, TITLE: 1 };
  // un solo patrón que reconoce cualquiera de los dragones
  const RX = new RegExp('(' + IDS.join('|') + ')', 'g');

  function swapText(node) {
    const v = node.nodeValue; if (!v) return; RX.lastIndex = 0; if (!RX.test(v)) return;
    const p = node.parentNode; if (!p || SKIP[p.nodeName] || (p.closest && p.closest('[contenteditable="true"],input,textarea'))) return;
    const frag = document.createDocumentFragment(), parts = v.split(RX);   // con grupo de captura: los textos y los dragones se alternan
    parts.forEach(txt => {
      if (!txt) return;
      const d = BY_ID[txt];
      if (d) { const s = document.createElement('span'); s.className = 'av-dragon'; s.setAttribute('role', 'img'); s.setAttribute('aria-label', d.name); s.innerHTML = d.svg; frag.appendChild(s) }
      else frag.appendChild(document.createTextNode(txt));
    });
    p.replaceChild(frag, node);
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) return swapText(root);
    if (root.nodeType !== 1 || SKIP[root.nodeName]) return;
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = [];
    while (tw.nextNode()) { RX.lastIndex = 0; if (RX.test(tw.currentNode.nodeValue)) list.push(tw.currentNode) }
    list.forEach(swapText);
  }
  function start() {
    walk(document.body);
    new MutationObserver(ms => { for (const m of ms) { if (m.type === 'childList') m.addedNodes.forEach(walk); else if (m.type === 'characterData') swapText(m.target) } })
      .observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  window.SudomiAvatarArt = { DRAGON: IDS[0], ids: IDS, list: LIST.map(d => ({ id: d.id, name: d.name })), svg: id => (BY_ID[id || IDS[0]] || LIST[0]).svg, has: id => !!BY_ID[id] };
})();
