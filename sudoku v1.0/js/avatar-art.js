/* SUDOMI 0.2.72 — avatar especial: DRAGÓN CON CORONA (solo para el nombre «Madeline» / «Madelin»).
 * El perfil guarda el avatar como el texto '🐲👑' (así funciona en todos los juegos y salas, aunque no haya este archivo).
 * Aquí, cada vez que ese texto aparece en pantalla, se cambia por un dibujo SVG propio: un dragón verde con una corona dorada.
 * El dibujo solo se puede ELEGIR en el editor de perfil cuando el nombre es Madeline (ver js/profile.js). */
(() => {
  const DRAGON = '🐲👑';
  const SVG = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
    '<path d="M18 26 10 8l15 9z" fill="#f4e3b2" stroke="#b79b5a" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<path d="M46 26 54 8 39 17z" fill="#f4e3b2" stroke="#b79b5a" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<path d="M12 35 3 30l6 11z" fill="#1f9d55" stroke="#14733c" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<path d="M52 35 61 30l-6 11z" fill="#1f9d55" stroke="#14733c" stroke-width="1.4" stroke-linejoin="round"/>' +
    '<path d="M32 18C46 18 54 28 53 40 52 52 43 59 32 59 21 59 12 52 11 40 10 28 18 18 32 18z" fill="#3fd276" stroke="#14733c" stroke-width="2"/>' +
    '<ellipse cx="32" cy="47" rx="13" ry="9" fill="#9cf2b8" stroke="#14733c" stroke-width="1.5"/>' +
    '<circle cx="27" cy="45.5" r="1.8" fill="#14733c"/><circle cx="37" cy="45.5" r="1.8" fill="#14733c"/>' +
    '<ellipse cx="23" cy="34" rx="5" ry="4.3" fill="#fff6c2" stroke="#14733c" stroke-width="1"/><ellipse cx="41" cy="34" rx="5" ry="4.3" fill="#fff6c2" stroke="#14733c" stroke-width="1"/>' +
    '<ellipse cx="23.8" cy="34" rx="1.8" ry="3.4" fill="#222"/><ellipse cx="40.2" cy="34" rx="1.8" ry="3.4" fill="#222"/>' +
    '<path d="M17 29l11 2.5M47 29 36 31.5" stroke="#14733c" stroke-width="2.2" stroke-linecap="round" fill="none"/>' +
    '<path d="M25 52q7 4 14 0" stroke="#14733c" stroke-width="1.7" fill="none" stroke-linecap="round"/>' +
    '<path d="M20 22 22 8l5 7 5-10 5 10 5-7 2 14z" fill="#ffcf1f" stroke="#a87b00" stroke-width="1.5" stroke-linejoin="round"/>' +
    '<rect x="20" y="19.5" width="24" height="4.5" rx="1.6" fill="#f2b800" stroke="#a87b00" stroke-width="1.2"/>' +
    '<circle cx="32" cy="12.5" r="2" fill="#e0243a"/><circle cx="24.5" cy="15.5" r="1.4" fill="#2a6fe0"/><circle cx="39.5" cy="15.5" r="1.4" fill="#2a6fe0"/>' +
    '</svg>';
  const SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, TITLE: 1 };

  function swapText(node) {
    const v = node.nodeValue; if (!v || v.indexOf(DRAGON) < 0) return;
    const p = node.parentNode; if (!p || SKIP[p.nodeName] || (p.closest && p.closest('[contenteditable="true"],input,textarea'))) return;
    const frag = document.createDocumentFragment(), parts = v.split(DRAGON);
    parts.forEach((txt, i) => {
      if (txt) frag.appendChild(document.createTextNode(txt));
      if (i < parts.length - 1) { const s = document.createElement('span'); s.className = 'av-dragon'; s.setAttribute('role', 'img'); s.setAttribute('aria-label', 'Dragón con corona'); s.innerHTML = SVG; frag.appendChild(s) }
    });
    p.replaceChild(frag, node);
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) return swapText(root);
    if (root.nodeType !== 1 || SKIP[root.nodeName]) return;
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = [];
    while (tw.nextNode()) { if (tw.currentNode.nodeValue.indexOf(DRAGON) >= 0) list.push(tw.currentNode) }
    list.forEach(swapText);
  }
  function start() {
    walk(document.body);
    new MutationObserver(ms => { for (const m of ms) { if (m.type === 'childList') m.addedNodes.forEach(walk); else if (m.type === 'characterData') swapText(m.target) } })
      .observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  window.SudomiAvatarArt = { DRAGON, svg: SVG };
})();
