/* SUDOMI 0.2.78 — avatares especiales: DRAGONES (solo para el nombre «Madeline» / «Madelin»).
 * El perfil guarda el avatar como un texto corto (por ejemplo '🐲👑'; así funciona en todos los juegos y salas, aunque no esté este archivo).
 * Aquí, cada vez que uno de esos textos aparece en pantalla, se cambia por la imagen del dragón (carpeta img/dragones/, 7 siluetas en azul).
 * Los textos son de 4 caracteres o menos para que las salas y la lista de amigos no los recorten.
 * Solo se pueden ELEGIR en el editor de perfil cuando el nombre es Madeline (ver js/profile.js).
 * Para cambiar o agregar un dragón: poner el PNG en img/dragones/, agregarlo a LIST aquí y a SHELL en sw.js. */
(() => {
  const FILE = n => 'img/dragones/dragon' + n + '.png';
  const LIST = [
    { id: '🐲👑', name: 'Dragón de perfil', img: FILE(1) },
    { id: '🐉⚡', name: 'Dragón de melena', img: FILE(2) },
    { id: '🐉🌑', name: 'Dragón alado', img: FILE(3) },
    { id: '🐉🪶', name: 'Dragón de contorno', img: FILE(4) },
    { id: '🐉🔥', name: 'Dragón de contorno con melena', img: FILE(5) },
    { id: '🐉🗡', name: 'Dragón de frente', img: FILE(6) },
    { id: '🐉🛡', name: 'Dragón en pie', img: FILE(7) }
  ];
  // 0.2.82: iconos solo para el nombre «Yukiri» / «Yukiry» (carpeta img/yukiri/). No salen en la fila de dragones.
  const YUKI = [
    { id: '🌸🗡', name: 'Yukiri: espadachina', img: 'img/yukiri/yukiri1.png', pic: 1 },
    { id: '🌸🌈', name: 'Yukiri: espada en alto', img: 'img/yukiri/yukiri2.png', pic: 1 },
    { id: '🌸🌿', name: 'Yukiri: pradera', img: 'img/yukiri/yukiri3.png', pic: 1 }
  ];
  const DRAGON_LIST = LIST.slice(); YUKI.forEach(y => LIST.push(y));
  // nombres antiguos (0.2.72–0.2.77): se siguen reconociendo y muestran el dragón más parecido, pero ya no se ofrecen
  const LEGACY = { '🐉🔩': FILE(3) };
  const BY_ID = Object.fromEntries(LIST.map(d => [d.id, d]));
  const IDS = LIST.map(d => d.id).concat(Object.keys(LEGACY));
  const imgOf = id => (BY_ID[id] ? BY_ID[id].img : LEGACY[id]) || LIST[0].img;
  const nameOf = id => (BY_ID[id] ? BY_ID[id].name : 'Dragón');
  const html = id => '<img src="' + imgOf(id) + '" alt="" draggable="false" decoding="async">';
  const SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, TITLE: 1 };
  // un solo patrón que reconoce cualquiera de los dragones
  const RX = new RegExp('(' + IDS.join('|') + ')', 'g');

  function swapText(node) {
    const v = node.nodeValue; if (!v) return; RX.lastIndex = 0; if (!RX.test(v)) return;
    const p = node.parentNode; if (!p || SKIP[p.nodeName] || (p.closest && p.closest('[contenteditable="true"],input,textarea'))) return;
    const frag = document.createDocumentFragment(), parts = v.split(RX);   // con grupo de captura: los textos y los dragones se alternan
    parts.forEach(txt => {
      if (!txt) return;
      if (IDS.includes(txt)) { const s = document.createElement('span'); s.className = 'av-dragon' + (BY_ID[txt] && BY_ID[txt].pic ? ' av-pic' : ''); s.setAttribute('role', 'img'); s.setAttribute('aria-label', nameOf(txt)); s.innerHTML = html(txt); frag.appendChild(s) }
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
  window.SudomiAvatarArt = { DRAGON: IDS[0], ids: IDS, list: DRAGON_LIST.map(d => ({ id: d.id, name: d.name })), yuki: YUKI.map(d => ({ id: d.id, name: d.name })), html, has: id => IDS.includes(id) && !YUKI.some(y => y.id === id), hasYuki: id => YUKI.some(y => y.id === id) };
})();
