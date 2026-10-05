/* SUDOMI - Idiomas (0.2.69)
   El juego está escrito en español. Para los demás idiomas se traduce en pantalla
   usando diccionarios (js/lang-en.js, lang-fr.js, lang-pt.js, lang-zh.js).
   El idioma elegido se guarda en localStorage "sudomi-lang". Cambiar de idioma recarga la página. */
(function () {
  'use strict';
  var KEY = 'sudomi-lang';
  var NAMES = { es: 'Español', en: 'English', fr: 'Français', pt: 'Português', zh: '中文' };
  var LOCALES = { es: 'es-DO', en: 'en-US', fr: 'fr-FR', pt: 'pt-BR', zh: 'zh-CN' };
  var lang = 'es';
  try { var s = localStorage.getItem(KEY); if (s && NAMES[s]) lang = s; } catch (e) {}

  var dict = {};      // español normalizado -> traducción
  var patterns = [];  // [{re, out, n}]
  var rev = null;     // traducción normalizada -> español
  var cache = {};

  function norm(s) { return String(s).replace(/\s+/g, ' ').trim(); }

  function escRe(s) { return s.replace(/[.*+?^$()|[\]\\\/]/g, '\\$&'); }

  function compile() {
    patterns = [];
    Object.keys(dict).forEach(function (k) {
      if (k.indexOf('{}') < 0) return;
      var parts = k.split('{}');
      var src = '^' + parts.map(escRe).join('([\\s\\S]*?)') + '$';
      var lit = k.replace(/\{\}/g, '').length;
      if (lit < 3) return;
      try { patterns.push({ re: new RegExp(src), out: dict[k], lit: lit }); } catch (e) {}
    });
    patterns.sort(function (a, b) { return b.lit - a.lit; });
    cache = {}; rev = null; revPat = null;
  }

  function add(l, d) {
    if (l !== lang || lang === 'es') return;
    Object.keys(d).forEach(function (k) {
      var v = d[k];
      if (v == null || v === '') return;
      dict[norm(k)] = v;
    });
    compile();
    if (started) { try { translateTree(document.documentElement); } catch (e) {} }
  }

  function fill(out, caps) {
    var i = 0;
    return out.replace(/\{(\d*)\}/g, function (m, n) {
      var idx = n ? parseInt(n, 10) - 1 : i++;
      var c = caps[idx];
      if (c == null) return m;
      var t = dict[norm(c)];
      if (t == null && c.length > 2 && c.length < 200) { var u = lookup(c); if (u !== c) t = u; }   // las partes variables también se traducen (nombres de casillas, motivos…)
      return t != null ? t : c;
    });
  }

  // Traduce un texto (sin conservar espacios de los bordes)
  function lookup(core, seg, strict) {       // strict = solo frase exacta o patrón (se usa con trozos de HTML)
    if (lang === 'es') return core;
    var n = norm(core);
    if (!n) return core;
    if (dict.hasOwnProperty(n)) return dict[n];
    if (!strict && cache.hasOwnProperty(n)) return cache[n];
    var res = n, hit = false;
    for (var i = 0; i < patterns.length; i++) {
      var m = patterns[i].re.exec(n);
      if (m) { res = fill(patterns[i].out, m.slice(1)); hit = true; break; }
    }
    if (strict) return hit ? res : core;
    if (!hit) {
      // quita adornos (emojis, símbolos) del principio o del final y vuelve a buscar
      try {
        var mm = /^([^\p{L}\p{N}¡¿«"(]+)?([\s\S]*?)([\s\p{Extended_Pictographic}️‍✓›‹→←…·]+)?$/u.exec(n);
        if (mm && mm[2] && mm[2] !== n && (mm[1] || mm[3])) {
          var inner = lookup(mm[2]);
          if (inner !== mm[2]) { res = (mm[1] || '') + inner + (mm[3] || ''); hit = true; }
        }
      } catch (e) {}
    }
    if (!hit && !seg) {
      // textos compuestos: se traduce cada trozo separado por · : , . – (los nombres de jugadores quedan igual)
      var parts = n.split(/(\s·\s|:\s|\s[—–-]\s|,\s|\.\s|\s\|\s)/);
      if (parts.length > 2) {
        var any = false, joined = parts.map(function (p, i) {
          if (i % 2) return p;
          var tp = lookup(p, true);
          if (tp !== p) any = true;
          return tp;
        }).join('');
        if (any) { res = joined; hit = true; }
      }
    }
    if (!hit) res = core;
    if (Object.keys(cache).length > 4000) cache = {};
    cache[n] = res;
    return res;
  }

  function t(text) {
    if (lang === 'es' || text == null) return text;
    var s = String(text);
    var lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
    var core = s.slice(lead.length, s.length - trail.length);
    if (!core) return s;
    var out = lookup(core);
    return out === core ? s : lead + out + trail;
  }

  function buildRev() {
    rev = {};
    Object.keys(dict).forEach(function (k) {
      if (k.indexOf('{}') >= 0) return;
      var v = norm(dict[k]);
      if (!rev.hasOwnProperty(v)) rev[v] = k;
    });
  }
  // Devuelve el texto en español de lo que se ve en pantalla (para detectores basados en texto)
  function es(text) {
    if (lang === 'es' || text == null) return text;
    if (!rev) buildRev();
    var n = norm(text);
    return rev.hasOwnProperty(n) ? rev[n] : text;
  }
  var revPat = null;
  function buildRevPat() {
    revPat = [];
    Object.keys(dict).forEach(function (k) {
      if (k.indexOf('{}') < 0) return;
      var tr = dict[k], order = [], i = 0;
      var parts = tr.split(/\{(\d*)\}/);
      // parts alterna: texto, índice, texto, índice...
      var src = '', idxs = [];
      for (var j = 0; j < parts.length; j++) {
        if (j % 2 === 0) src += escRe(parts[j]);
        else { src += '([\\s\\S]*?)'; idxs.push(parts[j] ? parseInt(parts[j], 10) - 1 : i++); }
      }
      if (idxs.length === 0) return;
      var lit = tr.replace(/\{\d*\}/g, '').length;
      if (lit < 3) return;
      try { revPat.push({ re: new RegExp('^' + src + '$'), key: k, idxs: idxs, lit: lit }); } catch (e) {}
    });
    revPat.sort(function (a, b) { return b.lit - a.lit; });
  }
  // Devuelve una línea de pantalla "vuelta al español" (para detectores que buscan palabras en español)
  function esLine(text) {
    if (lang === 'es' || text == null) return text;
    var s = es(text);
    if (s !== text) return s;
    var n = norm(text);
    if (!revPat) buildRevPat();
    for (var i = 0; i < revPat.length; i++) {
      var m = revPat[i].re.exec(n);
      if (m) {
        var caps = [], k = 0;
        revPat[i].idxs.forEach(function (ix, q) { caps[ix] = m[q + 1]; });
        var c = 0;
        return revPat[i].key.replace(/\{\}/g, function () { var v = caps[c++]; return v == null ? '' : v; });
      }
    }
    return esText(text);
  }
  function esText(text) {
    if (lang === 'es' || text == null) return text;
    if (!rev) buildRev();
    var s = String(text);
    var keys = Object.keys(rev).sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k.length > 2 && s.indexOf(k) >= 0) s = s.split(k).join(rev[k]);
    }
    return s;
  }

  /* ---------- Traducción del DOM ---------- */
  var started = false, obs = null;
  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1, CODE: 1, SVG: 0 };
  var ATTRS = ['title', 'placeholder', 'aria-label', 'alt', 'aria-description'];
  var textState = new WeakMap(); // nodo -> {out}
  var busy = false;
  try { if (/[?&]i18ndebug/.test(location.search)) { window.__i18nDebug = true; window.__i18nMiss = {}; } } catch (e) {}

  function skipEl(el) {
    if (!el || el.nodeType !== 1) return false;
    if (SKIP[el.tagName]) return true;
    if (el.hasAttribute && el.hasAttribute('data-no-i18n')) return true;
    return false;
  }

  function doText(node) {
    var st = textState.get(node);
    var v = node.nodeValue;
    if (st && st.out === v) return;
    if (!v || !/\S/.test(v)) return;
    var out = t(v);
    if (out !== v) { textState.set(node, { out: out }); node.nodeValue = out; }
    else if (window.__i18nDebug) { var mk = norm(v); if (mk.length > 1 && /[A-Za-zÁÉÍÓÚáéíóúñÑ¡¿]/.test(mk)) window.__i18nMiss[mk] = 1; }
  }

  function doAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (!el.hasAttribute(a)) continue;
      var v = el.getAttribute(a);
      var o = t(v);
      if (o !== v) el.setAttribute(a, o);
    }
  }

  function mixed(el) {
    var hasText = false, hasEl = false, c = el.firstChild;
    while (c) {
      if (c.nodeType === 3 && /\S/.test(c.nodeValue)) hasText = true;
      else if (c.nodeType === 1) hasEl = true;
      c = c.nextSibling;
    }
    return hasText && hasEl;
  }

  function walk(node) {
    if (node.nodeType === 3) { if (!skipEl(node.parentNode)) doText(node); return; }
    if (node.nodeType !== 1) return;
    if (skipEl(node)) return;
    doAttrs(node);
    if (mixed(node)) {
      var h = node.innerHTML;
      if (h && h.length < 1800) {
        var n = norm(h);
        if (dict.hasOwnProperty(n)) { node.innerHTML = dict[n]; return; }
        var o = lookup(h, true, true);
        if (o !== h && o !== norm(h)) { node.innerHTML = o; return; }
      }
    }
    var c = node.firstChild;
    while (c) { var nx = c.nextSibling; walk(c); c = nx; }
  }

  function translateTree(root) {
    if (lang === 'es') return;
    busy = true;
    try { walk(root); } finally { busy = false; }
    if (obs) obs.takeRecords();
  }

  function onMut(list) {
    if (busy) return;
    busy = true;
    try {
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        if (m.type === 'childList') {
          for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
          if (m.target && m.target.nodeType === 1 && mixed(m.target) && !skipEl(m.target)) walk(m.target);
        } else if (m.type === 'characterData') {
          if (!skipEl(m.target.parentNode)) doText(m.target);
        } else if (m.type === 'attributes') {
          if (!skipEl(m.target)) doAttrs(m.target);
        }
      }
    } finally { busy = false; }
    if (obs) obs.takeRecords();
  }

  function start() {
    if (started || lang === 'es') return;
    started = true;
    try { document.documentElement.setAttribute('lang', lang); } catch (e) {}
    translateTree(document.documentElement);
    obs = new MutationObserver(onMut);
    obs.observe(document.documentElement, {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ATTRS
    });
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { translateTree(document.documentElement); });
    }
    window.addEventListener('load', function () { translateTree(document.documentElement); });
    try { document.title = t(document.title); } catch (e) {}
  }

  function setLang(l) {
    if (!NAMES[l]) return;
    try { localStorage.setItem(KEY, l); } catch (e) {}
    try { location.reload(); } catch (e) {}
  }

  window.SudomiI18n = {
    lang: function () { return lang; },
    names: NAMES,
    locale: function () { return LOCALES[lang] || 'es-DO'; },
    add: add, t: t, es: es, esText: esText, esLine: esLine, setLang: setLang, start: start, refresh: function () { translateTree(document.documentElement); }
  };
  try { document.documentElement.setAttribute('lang', lang); } catch (e) {}
  var q = window.__sudomiLangQueue; if (q) q.forEach(function (x) { add(x[0], x[1]); });
  if (lang !== 'es') {
    try { document.write('<script src="js/lang-' + lang + '.js"><\/script>'); } catch (e) {}
    start();
  }
  // el observador queda activo; el diccionario (justo después en el <head>) traduce al cargarse
})();
