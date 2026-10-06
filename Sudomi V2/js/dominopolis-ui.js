/* SUDOMI 0.2.70 — DOMINÓPOLIS: pantallas (menú, salas online, tablero pseudo‑3D con CSS, dados, tarjetas, fichas, panel de acciones).
 * Las reglas viven en js/dominopolis-engine.js (window.Dominopolis). Aquí solo se dibuja y se llevan los turnos.
 * Se abre desde "Otros juegos" con window.SudomiDominopolis.open({hub,stage,exit}).
 * Modos: contra la computadora ('solo') y salas online de 2 a 8 personas ('host' / 'guest', con window.SudomiParty).
 * En línea manda el anfitrión: el invitado solo envía su acción {t:'act',a}; el anfitrión aplica las reglas y reparte el estado
 * completo + la lista de eventos para que todos vean las mismas animaciones.
 * Tablero: 11×11 casillas. La fila/columna de adentro son "solares": al comprar, primero aparece una calle y luego el edificio
 * (del color del dueño, con su inicial arriba). El centro (7×7) es el área de juego: dados, mazos y tarjetas. */
(() => {
  const D = window.Dominopolis; if (!D) return;
  const T = D.TILES, G = D.GROUPS;
  const P = () => window.SudomiProfile;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = n => '$' + Math.round(n);
  // nombres de la computadora: la lista del dueño (window.SudomiAI, en other-games.js); esta copia solo sirve si esa lista no cargó
  const aiNameList = () => window.SudomiAI ? SudomiAI.names.map(x => x[0]) : ['Pavel', 'Esteban', 'Madeline', 'Cristal', 'Edwin', 'Harly', 'Gian Carlos', 'Jean Luis', 'Luis Miguel', 'Carmelis', 'Maicol'];
  const EMO = { guagua: '🚌', concho: '🚕', moto: '🛵', gallo: '🐓', maraca: '🥁', bandera: '🚩', cotorra: '🦜', delfin: '🐬', mango: '🥭', tortuga: '🐢' };
  const COLORS = [['#d62027', 'Rojo'], ['#0b3d91', 'Azul'], ['#1f9d55', 'Verde'], ['#e0a800', 'Amarillo'], ['#7a3fc9', 'Morado'], ['#e8731a', 'Naranja'], ['#e0529c', 'Rosado'], ['#12a3a3', 'Turquesa']];
  const STYLES = ['cauta', 'eq', 'agr'];
  const CELL = 100 / 11;
  const TILT = 40, ZOOM_IN = 1.3;   // 0.2.78: la partida empieza alejada (zoom 1) para que se vea el paisaje; el botón 🔍 acerca la cámara
  const ART = ['🏁', '⛪', '❓', '🏘️', '💸', '🚌', '🏖️', '🏪', '🌊', '🤿', '🚓', '🐋', '💡', '🌴', '🏄', '🚌', '⛰️', '❓', '🏞️', '🍓', '🌴', '⚾', '🏪', '⛳', '⛪', '🚌', '🏙️', '🚡', '🚰', '🌸', '👮', '🏝️', '🛥️', '🏪', '🏨', '🚌', '❓', '🏛️', '💎', '🌆'];
  const TCOL = { go: '#e0a800', jail: '#4b5a78', free: '#2f9e6b', gojail: '#3a4a8a', card: '#7a55d9', tax: '#b34a4a', rail: '#c9a23a', util: '#4f9aa8' };
  let SP = 1;
  const sleep = ms => new Promise(r => setTimeout(r, ms * SP));

  let ui = null, g = null, token = 0, busy = false, rz = 0, tilt = TILT, zoom = 1, camAt = 0;
  let setup = { n: 2, mode: 'normal', tok: 'guagua', color: '#d62027', size: 4 };
  let xpDone = -1, tokVis = [], sheet = null, lastDice = [1, 1], hubTile = 0, hubCard = null, cardResolve = null, bld = {}, aiTimer = null;
  let awayFlags = [], netMode = 'solo', net = null, seats = [], me = 0, roomCode = '', started = false, status = '', offline = false, joinCode = '', q = Promise.resolve();
  const $ = s => ui.stage.querySelector(s);
  const play = n => { try { window.SudomiSound && SudomiSound.play(n) } catch (_) {} };
  const myName = () => { let n = ''; try { n = P() && P().name() || '' } catch (_) {} return (n || 'Tú').trim().slice(0, 14) };
  const pcol = pid => g.players[pid].color;
  const pinit = pid => (String(g.players[pid].name).trim()[0] || '?').toUpperCase();
  const tokEmo = pid => EMO[g.players[pid].token] || '♟️';
  const isMe = () => g && D.cur(g).id === me;
  const enqueue = fn => { q = q.then(fn).catch(e => console.error('Dominópolis:', e)); return q };

  /* ---------- posiciones ---------- */
  function cellOf(i) {                       // [columna, fila] de 1 a 11
    if (i <= 10) return [11 - i, 11];
    if (i <= 20) return [1, 11 - (i - 10)];
    if (i <= 30) return [1 + (i - 20), 1];
    return [11, 1 + (i - 30)];
  }
  const side = i => i === 0 || i === 10 || i === 20 || i === 30 ? 'c' : i < 10 ? 'b' : i < 20 ? 'l' : i < 30 ? 't' : 'r';
  const posOf = i => { const [c, r] = cellOf(i); return { x: (c - 1) * CELL, y: (r - 1) * CELL } };
  const buildable = i => T[i].t === 'prop' || T[i].t === 'rail' || T[i].t === 'util';
  function lotCell(i) {                      // el solar queda justo "encima" de la casilla, hacia el centro
    const [c, r] = cellOf(i), s = side(i);
    return s === 'b' ? [c, 10] : s === 't' ? [c, 2] : s === 'l' ? [2, r] : [10, r];
  }
  const lotShare = {};
  T.forEach((t, i) => { if (buildable(i)) { const [c, r] = lotCell(i); (lotShare[c + ',' + r] = lotShare[c + ',' + r] || []).push(i) } });
  function lotHalf(i) {                      // en las 4 esquinas dos casillas comparten solar: cada una usa una mitad
    const [c, r] = lotCell(i); if (lotShare[c + ',' + r].length < 2) return null;
    const s = side(i); return s === 'l' ? 'l' : s === 'r' ? 'r' : c === 2 ? 'r' : 'l';
  }

  /* ---------- cajas 3D ---------- */
  function box(l, t, w, d, h, c, cls, top, letter) {  // l,t en % del tablero; w,d,h en casillas
    const u = v => `calc(var(--cell)*${v})`;
    return `<div class="bx ${cls || ''}" style="left:${l}%;top:${t}%;--w:${u(w)};--d:${u(d)};--h:${u(h)};--c:${c};--top:${top || c}"><i class="tp">${letter ? `<b>${esc(letter)}</b>` : ''}</i><i class="sw"></i><i class="nw"></i><i class="ww"></i><i class="ew"></i></div>`;
  }
  const lighten = c => `color-mix(in srgb, ${c} 62%, #fff)`;

  /* ---------- tablero ---------- */
  function tileIcon(t) {
    if (t.t === 'go') return '🏁'; if (t.t === 'jail') return '🚓'; if (t.t === 'free') return '🌴'; if (t.t === 'gojail') return '👮';
    if (t.t === 'card') return t.d === 'S' ? '❓' : '🏪'; if (t.t === 'tax') return '💸'; if (t.t === 'rail') return '🚌';
    if (t.t === 'util') return t.n.indexOf('Luz') >= 0 ? '💡' : '🚰'; return '';
  }
  function boardHTML() {
    let tiles = '', lots = '';
    T.forEach((t, i) => {
      const [c, r] = cellOf(i);
      const col = t.g ? G[t.g].color : (TCOL[t.t === 'card' ? 'card' : t.t] || '#667'), foto = window.DominopolisFotos && window.DominopolisFotos[i];
      tiles += `<div class="dp-t t-${t.t} s-${side(i)}" data-i="${i}" style="grid-column:${c};grid-row:${r}"><span class="pic" style="--c1:${col}"><b class="em">${ART[i]}</b>${foto ? `<img src="${esc(foto)}" alt="" loading="lazy">` : ''}</span>${t.t === 'prop' ? `<i class="band" style="background:${G[t.g].color}"></i>` : ''}${t.p ? `<small class="pr">${t.p}</small>` : ''}<em class="own"></em></div>`;
      if (buildable(i)) { const [lc, lr] = lotCell(i); lots += `<div class="dp-lot s-${side(i)} ${lotHalf(i) ? 'half-' + lotHalf(i) : ''}" data-lot="${i}" style="grid-column:${lc};grid-row:${lr}"></div>` }
    });
    const palms = [[2, 2], [10, 2], [2, 10], [10, 10]].map(([c, r]) => `<i class="dp-palm" style="grid-column:${c};grid-row:${r}">🌴</i>`).join('');
    return `<div class="dp-rot" id="dpRot"><div class="dp-board" id="dpBoard">${tiles}<div class="dp-center"></div>${lots}${palms}<div class="dp-hub" id="dpHub">${hubHTML()}</div><div class="dp-layer" id="dpBld"></div><div class="dp-layer" id="dpTok"></div></div></div>`;
  }
  function updateLots() {
    ui.stage.querySelectorAll('.dp-lot').forEach(el => {
      const i = +el.dataset.lot, o = g.own[i];
      el.classList.toggle('own', !!o); el.classList.toggle('mort', !!(o && o.m));
      if (o) el.style.setProperty('--oc', pcol(o.o));
    });
  }
  function bldSpec(i, o) {
    const t = T[i], dead = o.m, own = pcol(o.o), body = dead ? '#8a8a8a' : own, top = dead ? '#9a9a9a' : lighten(own), ini = pinit(o.o);
    if (t.t === 'prop') { const h = o.h; return { w: .66, d: .66, h: h === 5 ? 2.2 : .5 + h * .3, c: body, top, ini, cls: 'bld' + (h === 5 ? ' tower' : '') } }
    if (t.t === 'rail') return { w: .84, d: .56, h: .4, c: body, top, ini, cls: 'bld' };
    return { w: .6, d: .6, h: .75, c: body, top, ini, cls: 'bld' };
  }
  function updateBoard() {
    ui.stage.querySelectorAll('.dp-t').forEach(el => {
      const i = +el.dataset.i, o = g.own[i], ow = el.querySelector('.own');
      el.classList.toggle('mort', !!(o && o.m));
      if (o) { ow.style.background = pcol(o.o); ow.style.display = 'block'; el.style.outline = '3px solid ' + pcol(o.o); el.style.outlineOffset = '-3px' } else { ow.style.display = 'none'; el.style.outline = '' }
    });
    updateLots();
    const layer = $('#dpBld'); if (!layer) return;
    g.own.forEach((o, i) => {
      const cur = bld[i];
      if (!o) { if (cur) { cur.el.remove(); delete bld[i] } return }
      const sp = bldSpec(i, o), sig = [o.o, o.h, o.m].join('|'), hv = `calc(var(--cell)*${sp.h})`;
      if (!cur) {
        const half = lotHalf(i), w = half ? Math.min(sp.w, .38) : sp.w, xc = half === 'l' ? .25 : half === 'r' ? .75 : .5; sp.w = w;
        const [c, r] = lotCell(i), l = (c - 1) * CELL + CELL * (xc - w / 2), tt = (r - 1) * CELL + CELL * (1 - sp.d) / 2;
        layer.insertAdjacentHTML('beforeend', box(l, tt, sp.w, sp.d, 0, sp.c, sp.cls, sp.top, sp.ini));
        const el = layer.lastElementChild; bld[i] = { el, sig };
        if (half) el.classList.add('small');
        setTimeout(() => el.style.setProperty('--h', hv), 40);
      } else if (cur.sig !== sig) {
        cur.sig = sig; cur.el.className = 'bx ' + sp.cls + (lotHalf(i) ? ' small' : ''); cur.el.style.setProperty('--c', sp.c); cur.el.style.setProperty('--top', sp.top); cur.el.style.setProperty('--h', hv);
        const b = cur.el.querySelector('.tp b'); if (b) b.textContent = sp.ini;
      }
    });
  }
  function placeTokens() {
    const el = $('#dpTok'); if (!el) return;
    const groups = {};
    g.players.forEach(p => { if (!p.bankrupt) (groups[tokVis[p.id]] = groups[tokVis[p.id]] || []).push(p.id) });
    let h = '';
    g.players.forEach(p => {
      if (p.bankrupt) return;
      const pos = posOf(tokVis[p.id]), grp = groups[tokVis[p.id]], k = grp.indexOf(p.id);
      const many = grp.length > 1, dx = many ? ((k % 3) - 1) * CELL * .22 : 0, dy = many ? (Math.floor(k / 3) - .5) * CELL * .2 : 0;
      h += `<div class="tk ${g.turn === p.id ? 'act' : ''}" data-p="${p.id}" style="left:${pos.x + dx}%;top:${pos.y + dy}%;--pc:${p.color}"><span>${tokEmo(p.id)}</span></div>`;
    });
    el.innerHTML = h;
  }
  function moveTokenEl(pid) {
    const e = ui.stage.querySelector(`.tk[data-p="${pid}"]`); if (!e) return placeTokens();
    const pos = posOf(tokVis[pid]); e.style.left = pos.x + '%'; e.style.top = pos.y + '%'; camTo(tokVis[pid]);
  }
  function setCam() {                        // ángulo, inclinación y zoom que sigue a la ficha en movimiento
    const r = $('#dpRot'), st = $('#dpStage'); if (!r || !st) return;
    r.style.setProperty('--rz', rz + 'deg'); r.style.setProperty('--tilt', tilt + 'deg'); r.style.setProperty('--zm', zoom);
    let tx = 0, ty = 0;
    if (zoom > 1) {
      const bw = st.clientWidth * .98, p = posOf(camAt), a = rz * Math.PI / 180;
      const vx = (p.x + CELL / 2 - 50) / 100 * bw * .6, vy = (p.y + CELL / 2 - 50) / 100 * bw * .6;
      const sx = vx * Math.cos(a) - vy * Math.sin(a), sy = (vx * Math.sin(a) + vy * Math.cos(a)) * Math.cos(tilt * Math.PI / 180);
      const lim = (zoom - 1) * bw / 2;
      tx = Math.max(-lim, Math.min(lim, -sx * zoom)); ty = Math.max(-lim, Math.min(lim, -sy * zoom));
    }
    r.style.setProperty('--tx', tx + 'px'); r.style.setProperty('--ty', ty + 'px');
  }
  function camTo(i) { camAt = i; setCam() }
  function fitBoard() {
    const st = $('#dpStage'); if (!st) return; const W = Math.min(st.clientWidth, 560);
    st.style.setProperty('--W', W + 'px'); st.style.setProperty('--cell', (W / 11) + 'px');
  }

  /* ---------- centro: dados, mazos y tarjeta ---------- */
  function dieHTML(v) {
    const pips = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] }[v] || [];
    let h = ''; for (let i = 1; i <= 9; i++) h += `<i class="${pips.includes(i) ? 'p' : ''}"></i>`;
    return `<div class="dp-die">${h}</div>`;
  }
  const diceHTML = d => `<div class="dp-dice" id="dpDice">${dieHTML(d[0])}${dieHTML(d[1])}</div>`;
  function setDice(d) { const e = $('#dpDice'); if (e) e.outerHTML = diceHTML(d) }
  function hubHTML() {
    return `<div class="dp-decks"><b class="dk s" data-d="S">❓<small>Sorpresa</small></b><b class="dk c" data-d="C">🏪<small>Colmado Andry</small></b></div><div class="dp-hubmain"><div class="dp-dicecol" id="dpDiceBox">${diceHTML(lastDice)}<small>Toca para tirar</small></div><div class="dp-hubcard" id="dpHubCard"></div></div>`;
  }
  function rentLines(i) {
    const t = T[i], rm = g.cfg.rm; if (t.t === 'prop') return [['Alquiler', t.r[0] * rm], ['Set completo', t.r[0] * 2 * rm], ['1 casa', t.r[1] * rm], ['2 casas', t.r[2] * rm], ['3 casas', t.r[3] * rm], ['4 casas', t.r[4] * rm], ['Torre', t.r[5] * rm]];
    if (t.t === 'rail') return [['1 terminal', 25], ['2 terminales', 50], ['3 terminales', 100], ['4 terminales', 200]];
    if (t.t === 'util') return [['1 servicio', '4 × dados'], ['2 servicios', '10 × dados']];
    return [];
  }
  function tileCard(i, mini) {
    const t = T[i], o = g.own[i], col = t.g ? G[t.g].color : '#556';
    const rows = rentLines(i).map(([a, b]) => `<tr><td>${a}</td><td>${typeof b === 'number' ? money(b) : b}</td></tr>`).join('');
    return `<div class="dp-card ${mini ? 'mini' : ''}"><div class="dp-card-h" style="background:${col}"><b>${esc(t.n)}</b></div>${t.p ? `<p class="dp-price">Precio ${money(t.p)}${t.g ? ` · Casa ${money(G[t.g].house)}` : ''}</p>` : ''}<table>${rows}</table>${o ? `<p class="dp-owner">Dueño: <b style="color:${pcol(o.o)}">${esc(g.players[o.o].name)}</b>${o.m ? ' · hipotecada' : ''}${o.h ? ` · ${o.h === 5 ? 'torre' : o.h + ' casa' + (o.h > 1 ? 's' : '')}` : ''}</p>` : (t.p ? '<p class="dp-owner">Sin dueño</p>' : '')}</div>`;
  }
  function renderHubCard() {
    const el = $('#dpHubCard'); if (!el || !g) return;
    if (hubCard) {
      const c = D.CARDS[hubCard.d][hubCard.i];
      el.innerHTML = `<div class="dp-cardpop ${hubCard.d === 'S' ? 'sor' : 'col'}"><small>${hubCard.d === 'S' ? '❓ SORPRESA' : '🏪 COLMADO ANDRY'}</small><p>${esc(c.x)}</p>${cardResolve ? '<em>Toca para continuar</em>' : ''}</div>`;
      return;
    }
    const t = T[hubTile];
    if (t.p) { el.innerHTML = tileCard(hubTile, true); return }
    el.innerHTML = `<div class="dp-card mini"><div class="dp-card-h" style="background:#556"><b>${esc(t.n)}</b></div><p class="dp-owner big">${tileIcon(t)}</p></div>`;
  }
  function setHub(i) { hubTile = i; renderHubCard() }

  /* ---------- HUD y panel ---------- */
  function hudHTML() {
    return g.players.map(p => `<div class="dp-pl ${g.turn === p.id && !g.over ? 'on' : ''} ${p.bankrupt ? 'out' : ''}" style="--pc:${p.color}"><b>${tokEmo(p.id)}</b><span>${esc(p.name)}${p.id === me && netMode !== 'solo' ? ' (tú)' : ''}${isAway(p.id) && !p.ai ? ' 📴' : ''}</span><em>${p.bankrupt ? 'Quiebra' : money(p.cash)}${p.jail ? ' 🚓' : ''}</em></div>`).join('');
  }
  function logHTML() { return g.log.slice(-3).map(x => `<p>${esc(x)}</p>`).join('') }
  function waitingFor(p) { return `<div class="dp-wait"><span class="dp-dots"></span> Turno de <b style="color:${p.color}">${esc(p.name)}</b>…</div><div class="dp-log">${logHTML()}</div>` }
  function panelHTML() {
    const p = D.cur(g), mine = p.id === me;
    if (g.over) return '';
    if (!mine) return waitingFor(p);
    let h = '';
    if (g.phase === 'roll') {
      if (p.jail > 0) h += `<p class="dp-note">🚓 Estás en el Preventivo (intento ${p.jail} de 3). Saca dobles para salir.</p><div class="dp-btns"><button class="arc-btn" data-a="roll">🎲 Tirar dados</button>${p.cash >= 50 ? '<button class="arc-btn alt" data-a="payJail">Pagar $50</button>' : ''}${p.cards.length ? '<button class="arc-btn alt" data-a="useCard">Usar carta</button>' : ''}</div>`;
      else h += `<div class="dp-btns"><button class="arc-btn dp-big" data-a="roll">🎲 Tirar dados</button></div>`;
      h += `<div class="dp-btns"><button class="arc-btn alt" data-a="props">🏠 Mis propiedades</button></div>`;
    } else if (g.phase === 'draw') {
      h += `<p class="dp-note">${esc(`Caíste en ${T[p.pos].n}. ¡Toca el mazo del centro para sacar una carta!`)}</p><div class="dp-btns"><button class="arc-btn dp-big" data-a="draw">🎴 Sacar carta</button></div>`;
    } else if (g.phase === 'buy') {
      const t = T[p.pos]; h += `<p class="dp-note">${esc(`¿Compras ${t.n}?`)}</p><div class="dp-btns"><button class="arc-btn" data-a="buy">Comprar ${money(t.p)}</button><button class="arc-btn alt" data-a="decline">No comprar</button></div>`;
    } else if (g.phase === 'debt') {
      const d = g.debt, to = d.to == null ? 'el banco' : Array.isArray(d.to) ? 'los demás jugadores' : g.players[d.to].name;
      const can = p.cash >= d.amt;
      h += `<p class="dp-note bad">${esc(`Debes pagar ${money(d.amt)} a ${to}${d.why ? ` (${d.why})` : ''}.`)}<br>${can ? `Tienes ${money(p.cash)}.` : `No te alcanza: tienes ${money(p.cash)}. Vende o hipoteca para juntar el dinero.`}</p><div class="dp-btns">${can ? `<button class="arc-btn dp-big" data-a="settle">💸 Pagar ${money(d.amt)} a ${esc(to)}</button>` : ''}<button class="arc-btn alt" data-a="props">Vender / hipotecar</button><button class="arc-btn danger" data-a="bankrupt">Declararme en quiebra</button></div>`;
    } else if (g.phase === 'end') {
      h += `<div class="dp-btns"><button class="arc-btn" data-a="endTurn">Terminar turno</button><button class="arc-btn alt" data-a="props">🏠 Mis propiedades</button></div>`;
    }
    return h + `<div class="dp-log">${logHTML()}</div>`;
  }
  function renderPanel() {
    const el = $('#dpPanel'); if (!el || !g) return;
    el.innerHTML = busy && isMe() ? (cardResolve ? '<div class="dp-btns"><button class="arc-btn dp-big" data-a="cardok">Entendido</button></div>' : '') + `<div class="dp-log">${logHTML()}</div>` : panelHTML();
    el.querySelectorAll('[data-a]').forEach(b => b.onclick = () => onAction(b.dataset.a));
    const hud = $('#dpHud'); if (hud) hud.innerHTML = hudHTML();
    ui.stage.querySelectorAll('.dp-decks .dk').forEach(d => d.classList.toggle('pulse', !busy && !g.over && g.phase === 'draw' && isMe() && d.dataset.d === g.deck));
    const off = $('#dpOff'); if (off) off.style.display = offline ? 'block' : 'none';
    const ab = $('#dpAway');
    if (ab) {
      const away = netMode === 'host' ? seats.map((s, i) => s.kind === 'human' && s.away ? g.players[i].name : null).filter(Boolean) : [];
      ab.style.display = away.length ? 'flex' : 'none';
      if (away.length) { ab.innerHTML = `<span>${esc(`📴 ${away.join(', ')} sin conexión: la IA juega hasta que vuelva.`)}</span><button type="button" class="arc-btn alt" id="dpReinvite">Invitar de nuevo</button>`; const rb = $('#dpReinvite'); if (rb) rb.onclick = () => window.SudomiFriends && SudomiFriends.invite({ game: 'dominopolis', gameName: 'Dominópolis', room: roomCode, url: inviteUrl() }) }
    }
  }
  function refresh() { updateBoard(); placeTokens(); camTo(g.players[g.turn].pos); if (!hubCard) { hubTile = g.players[g.turn].pos; renderHubCard() } renderPanel() }

  /* ---------- hojas (propiedades, información, fin) ---------- */
  function openSheet(html, onBind) {
    closeSheet(); const s = document.createElement('div'); s.className = 'dp-sheet'; s.id = 'dpSheet';
    s.innerHTML = `<div class="dp-sheet-in">${html}</div>`; ui.stage.querySelector('.dp').appendChild(s); sheet = s;
    s.addEventListener('click', e => { if (e.target === s) closeSheet() });
    if (onBind) onBind(s);
  }
  function closeSheet() { if (sheet) { sheet.remove(); sheet = null } }
  function propsSheet() {
    const mp = g.players[me], mine = D.ownedBy(g, me).sort((a, b) => a - b), turnOk = D.cur(g).id === me;
    const rows = mine.map(i => {
      const t = T[i], o = g.own[i], c = t.g ? G[t.g].color : '#667', can = turnOk && (g.phase === 'roll' || g.phase === 'end');
      const houses = t.t === 'prop' ? `<span class="dp-hs">${o.h === 5 ? '🏙️ Torre' : '🏠'.repeat(o.h) || '—'}</span>` : '';
      const btns = [];
      if (t.t === 'prop' && can && D.canBuild(g, me, i)) btns.push(`<button class="arc-btn" data-b="build" data-i="${i}">+ Construir ${money(G[t.g].house)}</button>`);
      if (t.t === 'prop' && turnOk && D.canSell(g, me, i)) btns.push(`<button class="arc-btn alt" data-b="sell" data-i="${i}">Vender ${money(G[t.g].house / 2)}</button>`);
      if (o.m) { if (can) btns.push(`<button class="arc-btn" ${mp.cash >= D.unmortgageCost(i) ? '' : 'disabled'} data-b="unmortgage" data-i="${i}">Recuperar ${money(D.unmortgageCost(i))}</button>`) }
      else if (turnOk && D.canMortgage(g, me, i)) btns.push(`<button class="arc-btn alt" data-b="mortgage" data-i="${i}">Hipotecar ${money(t.p / 2)}</button>`);
      return `<div class="dp-prow ${o.m ? 'mort' : ''}"><i style="background:${c}"></i><div><b>${esc(t.n)}</b>${houses}${o.m ? '<small>hipotecada</small>' : ''}</div><div class="dp-pb">${btns.join('')}</div></div>`;
    }).join('') || '<p class="dp-note">Todavía no tienes propiedades.</p>';
    const html = `<h3>Mis propiedades</h3><p class="dp-note">${esc(`Efectivo: ${money(mp.cash)} · Patrimonio: ${money(D.netWorth(g, me))}`)}</p><p class="dp-note small">${turnOk ? 'Construyes cuando tienes todo el color. Se construye de forma pareja.' : 'Construyes cuando tienes todo el color. Se construye de forma pareja. Solo puedes cambiar cosas en tu turno.'}</p><div class="dp-plist">${rows}</div><button class="arc-btn alt" id="dpSheetX">Cerrar</button>`;
    openSheet(html, s => {
      s.querySelector('#dpSheetX').onclick = closeSheet;
      s.querySelectorAll('[data-b]').forEach(b => b.onclick = () => manage({ t: b.dataset.b, i: +b.dataset.i, p: me }));
    });
  }
  function manage(a) {                       // construir / vender / hipotecar desde la hoja
    if (netMode === 'guest') { net.send({ t: 'act', a }); return }
    const r = D.act(g, a); if (!r.ok) return toast(r.err);
    play('tap'); refresh(); propsSheet(); saveGame(); if (netMode === 'host') bcast(g.ev.slice());
  }
  function infoSheet(i) { openSheet(`${tileCard(i)}<button class="arc-btn alt" id="dpSheetX">Cerrar</button>`, s => { s.querySelector('#dpSheetX').onclick = closeSheet }) }
  function showCard(ev) {
    const human = ev.p === me && !g.players[ev.p].ai;
    return new Promise(res => {
      const done = () => { cardResolve = null; hubCard = null; renderHubCard(); res() };
      hubCard = { d: ev.d, i: ev.i }; cardResolve = human ? done : null; renderHubCard(); renderPanel();
      if (!human) setTimeout(done, 2000 * SP);
    });
  }
  function toast(t) {
    const w = $('.dp'); if (!w) return; const e = document.createElement('div'); e.className = 'dp-toast'; e.textContent = t; w.appendChild(e); setTimeout(() => e.remove(), 1800);
  }
  function floatText(pid, text, cls) {
    const e = ui.stage.querySelector(`.dp-pl:nth-child(${pid + 1})`); if (!e) return;
    const f = document.createElement('span'); f.className = 'dp-float ' + (cls || ''); f.textContent = text; e.appendChild(f); setTimeout(() => f.remove(), 1400);
  }

  /* ---------- animación de eventos ---------- */
  async function playEvents(evs, myToken) {
    for (const e of evs) {
      if (myToken !== token) return;
      if (e.t === 'roll') {
        play('clack');
        for (let k = 0; k < 6; k++) { setDice([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]); await sleep(75) }
        setDice(e.d); lastDice = e.d; await sleep(380);
      } else if (e.t === 'move') {
        const fwd = (e.to - e.from + 40) % 40;
        if (fwd > 0 && fwd <= 12) { for (let k = 1; k <= fwd; k++) { tokVis[e.p] = (e.from + k) % 40; moveTokenEl(e.p); play('pop'); await sleep(190) } }
        else { tokVis[e.p] = e.to; moveTokenEl(e.p); await sleep(350) }
        setHub(e.to); await sleep(120);
      } else if (e.t === 'jail') { tokVis[e.p] = 10; moveTokenEl(e.p); setHub(10); play('gbad'); await sleep(450) }
      else if (e.t === 'go') { floatText(e.p, '+' + money(g.cfg.go), 'up'); play('good') }
      else if (e.t === 'card') { await showCard(e) }
      else if (e.t === 'buy') { play('bonus'); setHub(e.i); updateLots(); await sleep(450); updateBoard(); await sleep(350) }
      else if (e.t === 'build') { play('bonus'); refreshPartial(); if (e.h === 5 && e.p === me) { try { window.dispatchEvent(new CustomEvent('sudomi-dominopolis', { detail: { type: 'tower' } })) } catch (_) {} } await sleep(400) }
      else if (e.t === 'pay') { if (e.amt >= 1) { floatText(e.from, '−' + money(e.amt), 'down'); if (e.to >= 0) floatText(e.to, '+' + money(e.amt), 'up'); play('gbad') } await sleep(350) }
      else if (e.t === 'bankrupt') { play('lose'); refreshPartial(); await sleep(500) }
      else if (e.t === 'turn') { tokVis = g.players.map(p => p.pos) }
    }
  }
  function refreshPartial() { updateBoard(); const hud = $('#dpHud'); if (hud) hud.innerHTML = hudHTML() }

  /* ---------- flujo de la partida ---------- */
  const SAVE_KEY = 'sudomi-dominopolis-save';
  function saveGame() { if (netMode !== 'solo' || !g) return; try { if (g.over) localStorage.removeItem(SAVE_KEY); else localStorage.setItem(SAVE_KEY, JSON.stringify({ g, mode: setup.mode, t: Date.now() })) } catch (_) {} }
  function getSave() { try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); return s && s.g && !s.g.over && s.g.players && s.g.players.length ? s : null } catch (_) { return null } }
  function resumeSolo() {
    const s = getSave(); if (!s) return;
    netMode = 'solo'; me = 0; seats = []; started = true; g = s.g; setup.mode = s.mode || g.mode;
    token++; busy = false; rz = 0; tilt = TILT; zoom = 1; tokVis = g.players.map(p => p.pos); sheet = null; lastDice = g.dice[0] ? g.dice : [1, 1]; hubCard = null; cardResolve = null; bld = {}; hubTile = g.players[g.turn].pos; camAt = hubTile; q = Promise.resolve();
    renderGame();
  }
  function afterRun() { saveGame(); busy = false; hubCard = null; tokVis = g.players.map(p => p.pos); refresh(); setDice(g.dice[0] ? g.dice : lastDice); step() }
  async function doRun(a, remote) {          // anfitrión / solo: aplica la acción y la anima
    const myToken = token; busy = true; renderPanel();
    const r = D.act(g, a);
    if (!r.ok) { busy = false; if (!remote) toast(r.err); renderPanel(); if (remote && netMode === 'host') sendState(a.p, []); return }
    const evs = g.ev.slice();
    if (netMode === 'host') bcast(evs);
    await playEvents(evs, myToken);
    if (myToken !== token) return;
    afterRun();
  }
  function run(a) {
    if (netMode === 'guest') { busy = true; renderPanel(); if (!net.send({ t: 'act', a })) { busy = false; offline = true; renderPanel() } return }
    enqueue(() => doRun(a, false));
  }
  function step() {
    if (!ui || !g) return;
    clearTimeout(aiTimer);
    if (g.over) return showEnd();
    const p = D.cur(g), myToken = token;
    const seat = seats[p.id], covered = netMode === 'host' && seat && seat.kind === 'human' && seat.away;
    if (netMode !== 'guest' && (p.ai || covered)) {
      busy = true; renderPanel();
      const delay = (g.phase === 'roll' ? 900 : 550) * SP;
      aiTimer = setTimeout(() => { if (myToken !== token || !g || g.over) return; const a = D.aiAct(g); if (!a) return; enqueue(() => doRun(a, false)) }, delay);
    } else { busy = false; renderPanel() }
  }
  function onAction(a) {
    if (a === 'cardok') { if (cardResolve) cardResolve(); return }
    if (busy || !g || !isMe()) return;
    if (a === 'props') return propsSheet();
    run({ t: a, p: me });
  }
  function showEnd() {
    const order = g.players.map(p => ({ p, w: p.bankrupt ? -1 : D.netWorth(g, p.id) })).sort((a, b) => b.w - a.w);
    const win = g.players[g.winner], meWon = g.winner === me;
    play(meWon ? 'win' : 'lose');
    if (xpDone !== token) { xpDone = token; const opp = g.players.length - 1; try { window.SudomiXP && SudomiXP.award(meWon ? 60 + 15 * Math.min(opp, 7) : 20) } catch (_) {} try { window.dispatchEvent(new CustomEvent('sudomi-dominopolis', { detail: { type: 'end', won: meWon, opponents: opp } })) } catch (_) {} }
    const rows = order.map((o, k) => `<li class="${o.p.id === me ? 'me' : ''}" style="border-left:6px solid ${o.p.color}"><b>${k + 1}.</b> ${tokEmo(o.p.id)} <span>${esc(o.p.name)}</span><em>${o.p.bankrupt ? 'Quiebra' : money(o.w)}</em></li>`).join('');
    const again = netMode === 'guest' ? '<p class="dp-note small">El anfitrión puede empezar otra partida.</p>' : '<button class="arc-btn" id="dpAgain">Otra partida</button>';
    openSheet(`<div class="dp-end"><h3>${meWon ? '🏆 ¡Ganaste!' : '🏁 Fin de la partida'}</h3><p>${meWon ? 'Eres el dueño de la ciudad.' : esc(win.name) + ' gana la partida.'}</p><ol>${rows}</ol><div class="dp-btns">${again}<button class="arc-btn alt" id="dpExit2">Salir</button></div></div>`, s => {
      const ag = s.querySelector('#dpAgain'); if (ag) ag.onclick = () => { closeSheet(); if (netMode === 'host') backToLobby(); else renderMenu() };
      s.querySelector('#dpExit2').onclick = leave;
    });
    const hud = $('#dpHud'); if (hud) hud.innerHTML = hudHTML();
  }

  /* ---------- colores y fichas sin repetir ---------- */
  const usedColors = ex => seats.filter((s, i) => i !== ex && s.kind !== 'open' && s.color).map(s => s.color);
  const usedToks = ex => seats.filter((s, i) => i !== ex && s.kind !== 'open' && s.token).map(s => s.token);
  const freeColor = used => (COLORS.find(c => !used.includes(c[0])) || COLORS[0])[0];
  const freeTok = used => D.TOKENS.find(t => !used.includes(t)) || D.TOKENS[0];

  /* ---------- partida nueva ---------- */
  function newGameFrom(list) {
    g = D.create({ players: list, mode: setup.mode });
    token++; busy = false; rz = 0; tilt = TILT; zoom = 1; tokVis = g.players.map(p => p.pos); sheet = null; lastDice = [1, 1]; hubCard = null; cardResolve = null; bld = {}; hubTile = 0; camAt = g.players[g.turn].pos; q = Promise.resolve();
  }
  function aiPlayers(count, usedC, usedT) {
    const taken = (typeof seats !== 'undefined' ? seats : []).map(s => s.name), names = aiNameList().filter(n => !taken.includes(n)).sort(() => Math.random() - .5), out = [];
    for (let i = 0; i < count; i++) {
      const c = COLORS.map(x => x[0]).filter(x => !usedC.includes(x)).sort(() => Math.random() - .5)[0] || COLORS[0][0], t = D.TOKENS.filter(x => !usedT.includes(x)).sort(() => Math.random() - .5)[0] || D.TOKENS[0];
      usedC.push(c); usedT.push(t);
      out.push({ name: names[i], ai: true, style: STYLES[Math.floor(Math.random() * 3)], token: t, color: c });
    }
    return out;
  }
  function startSolo() {
    netMode = 'solo'; me = 0; seats = []; started = true;
    const list = [{ name: myName(), token: setup.tok, color: setup.color }].concat(aiPlayers(setup.n - 1, [setup.color], [setup.tok]));
    newGameFrom(list); renderGame();
  }

  /* ---------- salas online ---------- */
  const needProfile = fn => { if (P() && !P().get()) { P().ensure(fn); return true } return false };
  const publicSeats = () => seats.map(s => ({ name: s.name, kind: s.kind, token: s.token, color: s.color, away: !!s.away }));
  function pushLobby() { seats.forEach((s, i) => { if (s.id && s.id !== 'host' && s.kind === 'human') net.send(s.id, { t: 'lobby', seats: publicSeats(), you: i, mode: setup.mode, code: roomCode }) }) }
  const fid = () => (window.SudomiFriends && SudomiFriends.myCode()) || '';
  const isAway = i => netMode === 'host' ? !!(seats[i] && seats[i].away) : !!awayFlags[i];
  function sendState(i, evs) { const s = seats[i]; if (s && s.id && s.id !== 'host' && s.kind === 'human' && g) net.send(s.id, { t: 'state', g, ev: evs, you: i, mode: setup.mode, away: seats.map(x => !!x.away) }) }
  function bcast(evs) { seats.forEach((s, i) => sendState(i, evs)); saveHost() }
  /* La sala del anfitrión se guarda en este dispositivo: si se cierra la app o se cae la conexión, "Reanudar sala" la abre con el mismo código
     y los invitados (que siguen intentando reconectar) vuelven a sus sillas; mientras tanto la computadora juega por los ausentes. */
  const HOST_KEY = 'sudomi-dp-host';
  function saveHost() {
    if (netMode !== 'host' || !started || !g) return;
    try { if (g.over) localStorage.removeItem(HOST_KEY); else localStorage.setItem(HOST_KEY, JSON.stringify({ code: roomCode, g, mode: setup.mode, seats: seats.map(s => ({ name: s.name, kind: s.kind, id: s.id, fid: s.fid, token: s.token, color: s.color })), ts: Date.now() })) } catch (_) {}
  }
  function getHostSave() { try { const v = JSON.parse(localStorage.getItem(HOST_KEY)); return v && v.g && !v.g.over && v.code && Date.now() - v.ts < 6 * 3600 * 1000 ? v : null } catch (_) { return null } }
  async function resumeHost() {
    const snap = getHostSave(); if (!snap) return;
    if (needProfile(resumeHost)) return;
    if (!window.SudomiParty) { status = 'No se cargó el módulo de conexión.'; return renderMenu() }
    leaveNet(); netMode = 'host'; status = 'Reabriendo la sala…'; renderMenu();
    let lastErr = null;
    for (let k = 0; k < 6 && !net; k++) {      // el servicio tarda unos segundos en liberar el código anterior
      try { net = await SudomiParty.host('dominopolis', onHostEvent, snap.code) } catch (err) { lastErr = err; await new Promise(r => setTimeout(r, 3000)) }
    }
    if (!net) { netMode = 'solo'; status = (lastErr && lastErr.message) || 'No se pudo reabrir la sala.'; return renderMenu() }
    roomCode = snap.code; me = 0; started = true; setup.mode = snap.mode || 'normal';
    seats = snap.seats.map((s, i) => Object.assign({}, s, { away: s.kind === 'human' && s.id !== 'host' }));   // todos los demás aparecen "ausentes" hasta que se reconecten
    g = snap.g; g.ev = [];
    token++; busy = false; rz = 0; tilt = TILT; zoom = 1; tokVis = g.players.map(p => p.pos); sheet = null; lastDice = g.dice[0] ? g.dice : [1, 1]; hubCard = null; cardResolve = null; bld = {}; hubTile = g.players[g.turn].pos; camAt = hubTile; q = Promise.resolve();
    track(); renderGame();
  }
  function track() { try { window.SudomiFriends && SudomiFriends.track({ game: 'dominopolis', gameName: 'Dominópolis', room: roomCode, role: netMode === 'host' ? 'host' : 'guest' }) } catch (_) {} }
  function untrack() { try { window.SudomiFriends && SudomiFriends.untrack() } catch (_) {} }
  async function createRoom() {
    if (needProfile(createRoom)) return;
    if (!window.SudomiParty) { status = 'No se cargó el módulo de conexión.'; return renderMenu() }
    leaveNet(); netMode = 'host'; status = 'Creando sala…'; renderMenu();
    try {
      net = await SudomiParty.host('dominopolis', onHostEvent);
      roomCode = net.code; me = 0; started = false;
      seats = [{ name: myName(), kind: 'human', id: 'host', fid: fid(), token: setup.tok, color: setup.color }];
      for (let i = 1; i < setup.size; i++) seats.push({ name: '', kind: 'open' });
      status = ''; track(); renderLobby();
    } catch (err) { netMode = 'solo'; status = err.message || 'No se pudo crear la sala.'; renderMenu() }
  }
  function onHostEvent(e) {
    if (netMode !== 'host') return;
    if (e.type === 'join') {
      const meta0 = e.meta || {};
      let i = seats.findIndex(x => x.id === e.id);
      if (i < 0 && started && meta0.fid) i = seats.findIndex(x => x.fid && x.fid === meta0.fid && x.id !== 'host' && x.kind !== 'open');   // la misma persona desde otro teléfono o ventana recupera su silla
      if (i >= 0) {
        const s0 = seats[i]; s0.id = e.id; s0.away = false;
        if (s0.kind === 'ai' && g) { s0.kind = 'human'; g.players[i].ai = false; g.players[i].name = String(g.players[i].name).replace(/ \(IA\)$/, ''); s0.name = g.players[i].name }
        if (g && started) { bcast([]); refresh(); step() } else { pushLobby(); renderLobby() }
        return
      }
      if (started) { net.reject(e.id, 'La partida ya empezó.'); return }
      i = seats.findIndex(x => x.kind === 'open');
      if (i < 0) { net.reject(e.id, 'La sala ya está llena.'); return }
      const uc = usedColors(-1), ut = usedToks(-1), meta = e.meta || {};
      seats[i] = { name: String(meta.name || '').trim().slice(0, 14) || 'Jugador', kind: 'human', id: e.id, fid: String(meta.fid || '').slice(0, 8), token: freeTok(ut), color: uc.includes(meta.color) || !COLORS.some(c => c[0] === meta.color) ? freeColor(uc) : meta.color };
      pushLobby(); renderLobby(); return;
    }
    const i = seats.findIndex(x => x.id === e.id); if (i < 0) return;
    if (e.type === 'leave' || (e.type === 'msg' && e.data.t === 'bye')) {
      if (!started) { seats[i] = { name: '', kind: 'open' }; pushLobby(); renderLobby(); return }
      if (e.type === 'msg') { seats[i].kind = 'ai'; g.players[i].ai = true; g.players[i].name += ' (IA)'; seats[i].name = g.players[i].name; bcast([]); refresh(); step() }   // se fue para siempre: juega la IA
      else { seats[i].away = true; step() }                                                                                                                            // perdió la conexión: la IA lo cubre hasta que vuelva
      return;
    }
    if (e.type !== 'msg') return;
    const d = e.data;
    if (d.t === 'pick' && !started) {
      if (d.color && COLORS.some(c => c[0] === d.color) && !usedColors(i).includes(d.color)) seats[i].color = d.color;
      if (d.token && D.TOKENS.includes(d.token) && !usedToks(i).includes(d.token)) seats[i].token = d.token;
      pushLobby(); renderLobby();
    } else if (d.t === 'act' && started && g) {
      if (!d.a || d.a.p !== i) { sendState(i, []); return }
      enqueue(() => doRun(d.a, true));
    }
  }
  function joinRoom(raw) {
    if (needProfile(() => joinRoom(raw))) return;
    if (!window.SudomiParty) { status = 'No se cargó el módulo de conexión.'; return renderMenu() }
    const code = SudomiParty.normCode(raw);
    if (code.length !== 8) { status = 'Escribe el código de 8 caracteres.'; return renderMenu() }
    leaveNet(); netMode = 'guest'; roomCode = code; started = false; status = 'Conectando…'; renderMenu();
    net = SudomiParty.join('dominopolis', code, { name: myName(), color: setup.color, token: setup.tok, fid: fid() }, e => {
      if (netMode !== 'guest') return;
      if (e.type === 'open') { status = 'Conectado. Esperando al anfitrión…'; offline = false; track(); if (!started) renderMenu() }
      else if (e.type === 'away') { offline = true; renderPanel() }
      else if (e.type === 'back') { offline = false; renderPanel() }
      else if (e.type === 'closed') { const m = e.message; leaveNet(); netMode = 'solo'; status = m; renderMenu() }
      else if (e.type === 'msg') {
        const d = e.data;
        if (d.t === 'lobby') { seats = d.seats; me = d.you; setup.mode = d.mode; started = false; g = null; renderLobby() }
        else if (d.t === 'state') enqueue(() => onState(d));
      }
    });
  }
  async function onState(d) {                // invitado: recibe estado + eventos y los anima en orden
    const first = !g || !started;
    me = d.you; setup.mode = d.mode || setup.mode; started = true; g = d.g; awayFlags = d.away || [];
    if (first) { newGuestView(); }
    const myToken = token; busy = true;
    if (d.ev && d.ev.length) { renderPanel(); await playEvents(d.ev, myToken) }
    if (myToken !== token) return;
    afterRun();
  }
  function newGuestView() {
    token++; rz = 0; tilt = TILT; zoom = 1; sheet = null; lastDice = [1, 1]; hubCard = null; cardResolve = null; bld = {}; hubTile = 0; tokVis = g.players.map(p => p.pos); camAt = g.players[g.turn].pos;
    renderGame();
  }
  function leaveNet() {
    clearTimeout(aiTimer);
    if (net) { try { net.close() } catch (_) {} net = null }
    seats = []; started = false; offline = false;
  }
  function startOnline() {
    if (netMode !== 'host' || started) return;
    const human = seats.filter(s => s.kind === 'human').length;
    const usedC = seats.filter(s => s.kind === 'human').map(s => s.color), usedT = seats.filter(s => s.kind === 'human').map(s => s.token);
    const ais = aiPlayers(seats.length - human, usedC, usedT); let k = 0;
    seats = seats.map(s => s.kind === 'human' ? s : Object.assign({ kind: 'ai' }, ais[k], { name: ais[k++].name }));
    const list = seats.map(s => ({ name: s.name, token: s.token, color: s.color, ai: s.kind === 'ai', style: s.style }));
    started = true; newGameFrom(list); bcast([]); renderGame();
  }
  function backToLobby() {                   // anfitrión: otra partida con la misma gente
    seats = seats.map(s => s.kind === 'ai' ? { name: '', kind: 'open' } : Object.assign({}, s, { away: false }));
    started = false; g = null; token++; pushLobby(); renderLobby();
  }
  function inviteUrl() { const base = location.origin && location.origin !== 'null' ? location.origin + location.pathname : location.href.split(/[?#]/)[0]; return `?game=dominopolis&room=` }
  function invite() {
    const base = location.origin && location.origin !== 'null' ? location.origin + location.pathname : location.href.split(/[?#]/)[0];
    const url = `${base}?game=dominopolis&room=${roomCode}`, txt = 'Juega Dominópolis conmigo en SUDOMI';
    const say = m => { status = m; renderLobby() };
    if (navigator.share) navigator.share({ title: 'SUDOMI', text: window.SudomiI18n ? SudomiI18n.t(txt) : txt, url }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => say('Enlace copiado. Pégalo en tu chat.')).catch(() => say(url));
    else say(url);
  }

  /* ---------- pantallas ---------- */
  function renderGame() {
    ui.stage.innerHTML = `<div class="mini-game dp">${head('TABLERO')}<div class="dp-off" id="dpOff" style="display:none">Sin conexión con el anfitrión… reconectando</div><div class="dp-awaybar" id="dpAway" style="display:none"></div><div class="dp-hud" id="dpHud"></div><div class="dp-stage" id="dpStage">${boardHTML()}</div><div class="dp-tools"><button class="game-restart" id="dpRotL" aria-label="Girar a la izquierda">⟲</button><button class="game-restart" id="dpRotR" aria-label="Girar a la derecha">⟳</button><button class="game-restart" id="dpTilt" aria-label="Cambiar vista">3D</button><button class="game-restart" id="dpZoom" aria-label="Acercar o ver todo">🔍</button><button class="game-restart" id="dpBgBtn" aria-label="Cambiar fondo">🖼</button><button class="game-restart" id="dpSpeed" aria-label="Velocidad">⏩</button></div><div class="dp-panel" id="dpPanel"></div></div>`;
    if (window.SudomiDpBg) SudomiDpBg.apply($('#dpStage'));       // 0.2.79: fondo elegido por este jugador
    { const bb = $('#dpBgBtn'); if (bb) bb.onclick = () => { if (!window.SudomiDpBg) return; const n = SudomiDpBg.next(); toast('Fondo: ' + SudomiDpBg.name(n)) } }
    $('#dpExit').onclick = leave; $('#dpRules').onclick = rulesSheet;
    $('#dpRotL').onclick = () => { rz -= 90; setCam() }; $('#dpRotR').onclick = () => { rz += 90; setCam() };
    $('#dpTilt').onclick = () => { tilt = tilt ? 0 : TILT; setCam() };
    $('#dpZoom').onclick = e => { zoom = zoom > 1 ? 1 : ZOOM_IN; e.currentTarget.style.opacity = zoom > 1 ? 1 : .55; setCam() };
    $('#dpSpeed').onclick = e => { SP = SP === 1 ? .35 : 1; e.currentTarget.style.opacity = SP === 1 ? 1 : .55; toast(SP === 1 ? 'Velocidad normal' : 'Velocidad rápida') };
    ui.stage.querySelectorAll('.dp-t').forEach(el => el.onclick = () => setHub(+el.dataset.i));
    $('#dpDiceBox').onclick = () => { if (!busy && g && !g.over && g.phase === 'roll' && isMe()) onAction('roll') };
    ui.stage.querySelectorAll('.dp-decks .dk').forEach(d => d.onclick = () => {
      if (busy || !g || g.over || g.phase !== 'draw' || !isMe()) return;
      if (d.dataset.d !== g.deck) return toast('Ese no es tu mazo: toca el que está brillando');
      onAction('draw');
    });
    $('#dpHubCard').onclick = () => { if (cardResolve) cardResolve(); else infoSheet(hubTile) };
    fitBoard(); setCam(); refresh();
    if (window.ResizeObserver) { const ro = new ResizeObserver(fitBoard); ro.observe($('#dpStage')) } else window.addEventListener('resize', fitBoard);
    step();
  }
  const head = sub => `<div class="dos-head"><div><p>ARCADE SUDOMI · ${sub}</p><h2>Dominópolis</h2></div><div class="dos-actions"><button class="game-restart" id="dpRules" aria-label="Reglas">?</button><button class="game-restart" id="dpExit">Juegos</button></div></div>`;
  const RULES = [
    ['Objetivo', 'Compra propiedades, construye y cobra alquiler. Gana el último jugador que no quiebre (en el modo rápido, el que tenga más patrimonio tras 30 turnos cada uno).'],
    ['Tu turno', 'Toca los dados (o el botón) y avanza. Si caes en una propiedad libre puedes comprarla: aparece una calle y luego un edificio de tu color, con tu inicial, en el solar de adentro del tablero. Si tiene dueño, debes pagarle el alquiler con el botón de pagar.'],
    ['Construir', 'Cuando tienes todas las propiedades de un color puedes construir casas (hasta 4) y luego una torre. Se construye de forma pareja y el edificio crece.'],
    ['Dobles', 'Si sacas dobles juegas otra vez. Tres dobles seguidos te mandan al Preventivo.'],
    ['Preventivo', 'Sales con dobles, pagando $50 o con una carta de salida. Al tercer intento fallido pagas $50 y sales.'],
    ['Cartas', 'En ❓ Sorpresa y 🏪 Colmado Andry debes tocar el mazo que brilla para sacar la carta. Puede ser un premio, una multa o un viaje.'],
    ['Deudas', 'Todos los pagos son manuales. Si no te alcanza para pagar puedes vender construcciones o hipotecar propiedades. Si aun así no alcanza, quiebras.'],
    ['Online', 'Crea una sala (de 2 a 8 personas) y comparte el enlace o el código. Las sillas vacías las juega la computadora. Cada jugador elige su ficha y su color, y no se pueden repetir.']
  ];
  function rulesSheet() {
    openSheet(`<h3>Reglas de Dominópolis</h3><dl class="dp-rules">${RULES.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl><button class="arc-btn" id="dpSheetX">Cerrar</button>`, s => { s.querySelector('#dpSheetX').onclick = closeSheet });
  }
  function ensureSheetHost() { return ui.stage.querySelector('.dp') }
  const swatches = (cur, used, k) => COLORS.map(([c, n]) => `<button type="button" class="dp-sw ${c === cur ? 'on' : ''}" data-pick="${k}" data-v="${c}" style="--sw:${c}" aria-label="${n}" ${used.includes(c) && c !== cur ? 'disabled' : ''}></button>`).join('');
  const tokBtns = (cur, used, k) => D.TOKENS.map(t => `<button type="button" class="${t === cur ? 'on' : ''}" data-pick="${k}" data-v="${t}" aria-label="${t}" ${used.includes(t) && t !== cur ? 'disabled' : ''}>${EMO[t]}</button>`).join('');
  function renderMenu() {
    token++; g = null; sheet = null; if (netMode === 'solo') leaveNet();
    const busyNet = netMode !== 'solo';
    ui.stage.innerHTML = `<div class="mini-game dp">${head('1 A 8 JUGADORES')}
      <div class="dp-menu">
       ${status ? `<p class="dp-note bad">${esc(status)}</p>` : ''}<div class="dp-hero">🏙️<b>Compra la ciudad</b><span>Malecón, Zona Colonial, Punta Cana… ¡y que no te cobren alquiler!</span></div>
       <div class="dp-opt"><b>Tu ficha</b><div class="dp-seg tok" data-k="tok">${tokBtns(setup.tok, [], 'tok')}</div></div>
       <div class="dp-opt"><b>Tu color</b><div class="dp-colors" data-k="color">${swatches(setup.color, [], 'color')}</div></div>
       ${bgPick()}
       <div class="dp-opt"><b>Duración</b><div class="dp-seg" data-k="mode"><button class="${setup.mode === 'normal' ? 'on' : ''}" data-pick="mode" data-v="normal">Normal</button><button class="${setup.mode === 'rapido' ? 'on' : ''}" data-pick="mode" data-v="rapido">Rápido (30 turnos)</button></div></div>
       ${getSave() ? '<button class="arc-btn dp-big" id="dpResume">▶ Continuar partida guardada</button>' : ''}${getHostSave() && !busyNet ? `<button class="arc-btn" id="dpResumeHost">${esc(`▶ Reanudar mi sala online (${SudomiParty.pretty(getHostSave().code)})`)}</button>` : ''}<div class="dp-opt dp-box"><b>🤖 Contra la máquina</b><div class="dp-seg" data-k="n">${[2, 3, 4].map(n => `<button class="${setup.n === n ? 'on' : ''}" data-pick="n" data-v="${n}">Tú + ${n - 1} IA</button>`).join('')}</div><button class="arc-btn dp-big" id="dpStart">▶ Jugar</button></div>
      </div></div>`;
    $('#dpExit').onclick = leave; $('#dpRules').onclick = rulesSheet;
    ui.stage.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => {
      const k = b.dataset.pick, v = b.dataset.v; setup[k] = ['n', 'size'].includes(k) ? +v : v;
      ui.stage.querySelectorAll(`[data-pick="${k}"]`).forEach(x => x.classList.toggle('on', x === b));
    });
    if (window.SudomiDpBg) SudomiDpBg.bindPicker(ui.stage);
    $('#dpStart').onclick = startSolo; const rs = $('#dpResume'); if (rs) rs.onclick = resumeSolo; const rh = $('#dpResumeHost'); if (rh) rh.onclick = resumeHost;
  }
  // 0.2.79: selector de fondo (debajo de «Tu color»), mismo tamaño que las fichas
  const bgPick = () => window.SudomiDpBg ? `<div class="dp-opt"><b>Fondo</b><div class="dp-seg bgs">${SudomiDpBg.pickerHTML()}</div></div>` : '';
  function removeSeat(i) { if (netMode !== 'host' || started || !seats[i] || seats[i].kind !== 'open' || seats.length <= 2) return; seats.splice(i, 1); setup.size = seats.length; pushLobby(); renderLobby() }
  // sala de espera única (js/lobby.js) + los controles propios de Dominópolis (ficha, color, duración)
  function renderLobby() {
    if (!ui) return;
    const host = netMode === 'host', mine = seats[me] || {}, humans = seats.filter(s => s.kind === 'human').length, free = seats.length - humans;
    const extra = `<div class="dp-opt"><b>Tu ficha</b><div class="dp-seg tok">${tokBtns(mine.token, usedToks(me), 'ptok')}</div></div>
       <div class="dp-opt"><b>Tu color <small>(no se pueden repetir)</small></b><div class="dp-colors">${swatches(mine.color, usedColors(me), 'pcolor')}</div></div>
       ${bgPick()}
       ${host ? `<div class="dp-opt"><b>Duración</b><div class="dp-seg"><button class="${setup.mode === 'normal' ? 'on' : ''}" data-m="normal">Normal</button><button class="${setup.mode === 'rapido' ? 'on' : ''}" data-m="rapido">Rápido (30 turnos)</button></div></div>` : ''}`;
    ui.stage.innerHTML = `<div class="mini-game dp">${head('SALA ONLINE')}<div id="lbRoot"></div></div>`;
    $('#dpExit').onclick = leave; $('#dpRules').onclick = rulesSheet;
    SudomiLobby.render($('#lbRoot'), {
      game: 'dominopolis', gameName: 'Dominópolis', code: roomCode, url: inviteUrl(), host, fixed: false,
      seats: seats.map((s, i) => ({ state: s.kind === 'open' ? 'open' : i === me ? 'me' : s.away ? 'away' : 'human', name: s.name, avatar: EMO[s.token] || '♟️', sub: i === 0 ? 'Anfitrión' : (COLORS.find(c => c[0] === s.color) || [0, ''])[1] })),
      extra, startLabel: free > 0 ? `▶ Empezar (la IA juega ${free})` : '▶ Empezar', canStart: true, onStart: startOnline, onRemove: removeSeat,
      hint: host && seats.length > 4 && setup.mode === 'normal' ? 'Con más de 4 jugadores la partida normal es larga: conviene el modo rápido.' : '', status,
      bindExtra: root => {
        root.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => {
          const k = b.dataset.pick, v = b.dataset.v, upd = k === 'pcolor' ? { color: v } : { token: v };
          if (host) { if (k === 'pcolor' && !usedColors(0).includes(v)) seats[0].color = v; if (k === 'ptok' && !usedToks(0).includes(v)) seats[0].token = v; setup.color = seats[0].color; setup.tok = seats[0].token; pushLobby(); renderLobby() }
          else { net.send(Object.assign({ t: 'pick' }, upd)) }
        });
        root.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { setup.mode = b.dataset.m; renderLobby() });
        if (window.SudomiDpBg) SudomiDpBg.bindPicker(root);
      }
    });
  }
  function open(opts) { ui = opts; ui.hub.classList.add('hidden'); ui.stage.classList.remove('hidden'); netMode = 'solo'; status = ''; renderMenu() }
  function leave() { untrack(); try { if (netMode === 'host') localStorage.removeItem(HOST_KEY) } catch (_) {} token++; clearTimeout(aiTimer); const u = ui; g = null; leaveNet(); netMode = 'solo'; if (u) { u.stage.innerHTML = ''; u.exit() } }
  function joinFromInvite(code, opts) {
    if (opts && opts.role === 'host') { if (getHostSave()) return resumeHost(); untrack(); status = 'La sala ya no se puede reabrir.'; return renderMenu() }
    joinCode = code; if (ui) joinRoom(code);
  }
  window.SudomiDominopolis = { open, join: joinFromInvite, resumeHost, soloSetup: () => renderMenu(), create: n => { setup.size = n; createRoom() }, close() { token++; g = null; leaveNet() }, _state: () => g, _refresh: () => { if (g) refresh() }, _seats: () => seats };
})();
