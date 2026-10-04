/* SUDOMI 0.2.70 — DOMINÓPOLIS: reglas del juego de propiedades (sin pantalla).
 * Estado en JSON simple: g = create({players:[{name,ai,token,style}],mode,seed}); act(g,{t:'roll',p:0}) devuelve {ok} o {ok:false,err}.
 * La computadora: aiAct(g) devuelve la próxima acción del jugador en turno si es de la computadora.
 * Todo texto visible está en español (el idioma se traduce en pantalla). */
(function (root) {
  'use strict';
  const START = 1500, GO = 50, JAIL_FEE = 50, FAST_TURNS = 30, CAP = 4000;
  const GROUPS = {
    brown: { name: 'Marrón', color: '#8b5a2b', house: 50 }, lblue: { name: 'Celeste', color: '#6ec6f0', house: 50 },
    pink: { name: 'Rosa', color: '#e86aa8', house: 100 }, orange: { name: 'Naranja', color: '#f28c28', house: 100 },
    red: { name: 'Rojo', color: '#d62027', house: 150 }, yellow: { name: 'Amarillo', color: '#f5cf2e', house: 150 },
    green: { name: 'Verde', color: '#1f9d55', house: 200 }, blue: { name: 'Azul', color: '#0b3d91', house: 200 }
  };
  const TOKENS = ['guagua', 'concho', 'moto', 'gallo', 'maraca', 'bandera', 'cotorra', 'delfin', 'mango', 'tortuga'];
  const T = [];
  const P = (n, g, p, r) => T.push({ n, t: 'prop', g, p, r });
  const X = (n, t, extra) => T.push(Object.assign({ n, t }, extra || {}));
  X('SALIDA', 'go');
  P('Cristo Rey', 'brown', 60, [2, 10, 30, 90, 160, 250]); X('Sorpresa', 'card', { d: 'S' });
  P('Los Mina', 'brown', 60, [4, 20, 60, 180, 320, 450]); X('Impuesto ITBIS', 'tax', { p: 200 });
  X('Terminal Norte', 'rail', { p: 200 });
  P('Boca Chica', 'lblue', 100, [6, 30, 90, 270, 400, 550]); X('Colmado Andry', 'card', { d: 'C' });
  P('Juan Dolio', 'lblue', 100, [6, 30, 90, 270, 400, 550]); P('Sosúa', 'lblue', 120, [8, 40, 100, 300, 450, 600]);
  X('Preventivo (visita)', 'jail');
  P('Samaná', 'pink', 140, [10, 50, 150, 450, 625, 750]); X('Compañía de Luz', 'util', { p: 150 });
  P('Las Terrenas', 'pink', 140, [10, 50, 150, 450, 625, 750]); P('Cabarete', 'pink', 160, [12, 60, 180, 500, 700, 900]);
  X('Terminal Sur', 'rail', { p: 200 });
  P('Bonao', 'orange', 180, [14, 70, 200, 550, 750, 950]); X('Sorpresa', 'card', { d: 'S' });
  P('Jarabacoa', 'orange', 180, [14, 70, 200, 550, 750, 950]); P('Constanza', 'orange', 200, [16, 80, 220, 600, 800, 1000]);
  X('Malecón (parqueo libre)', 'free');
  P('San Pedro', 'red', 220, [18, 90, 250, 700, 875, 1050]); X('Colmado Andry', 'card', { d: 'C' });
  P('La Romana', 'red', 220, [18, 90, 250, 700, 875, 1050]); P('Higüey', 'red', 240, [20, 100, 300, 750, 925, 1100]);
  X('Terminal Este', 'rail', { p: 200 });
  P('Santiago', 'yellow', 260, [22, 110, 330, 800, 975, 1150]); P('Puerto Plata', 'yellow', 260, [22, 110, 330, 800, 975, 1150]);
  X('Acueducto', 'util', { p: 150 }); P('Moca', 'yellow', 280, [24, 120, 360, 850, 1025, 1200]);
  X('¡Operativo! Ve al Preventivo', 'gojail');
  P('Bávaro', 'green', 300, [26, 130, 390, 900, 1100, 1275]); P('Cap Cana', 'green', 300, [26, 130, 390, 900, 1100, 1275]);
  X('Colmado Andry', 'card', { d: 'C' }); P('Punta Cana', 'green', 320, [28, 150, 450, 1000, 1200, 1400]);
  X('Terminal Oeste', 'rail', { p: 200 }); X('Sorpresa', 'card', { d: 'S' });
  P('Zona Colonial', 'blue', 350, [35, 175, 500, 1100, 1300, 1500]); X('Impuesto de lujo', 'tax', { p: 100 });
  P('Malecón de Santo Domingo', 'blue', 400, [50, 200, 600, 1400, 1700, 2000]);
  const GROUP_TILES = {};
  T.forEach((t, i) => { if (t.g) (GROUP_TILES[t.g] = GROUP_TILES[t.g] || []).push(i) });
  const RAILS = T.map((t, i) => t.t === 'rail' ? i : -1).filter(i => i >= 0);
  const UTILS = T.map((t, i) => t.t === 'util' ? i : -1).filter(i => i >= 0);

  // Cartas. Tipos: gain, pay, moveTo, back, jail, jailcard, payEach, collectEach, repairs, nearRail, nearUtil
  const CARDS = {
    S: [
      { x: 'Avanza hasta la SALIDA y cobra el sueldo.', k: 'moveTo', v: 0 }, { x: 'Un tío de Nueva York te manda $150.', k: 'gain', v: 150 },
      { x: 'Te pillaron sin casco en la moto. Paga $50.', k: 'pay', v: 50 }, { x: 'Avanza hasta Samaná. Si pasas por la SALIDA, cobras.', k: 'moveTo', v: 11 },
      { x: 'Avanza hasta el Malecón de Santo Domingo.', k: 'moveTo', v: 39 }, { x: 'Retrocede 3 casillas.', k: 'back', v: 3 },
      { x: '¡Operativo! Ve directo al Preventivo, sin cobrar la SALIDA.', k: 'jail' }, { x: 'Sales libre del Preventivo. Guarda esta carta.', k: 'jailcard' },
      { x: 'Avanza a la terminal más cercana. Si tiene dueño, pagas el doble.', k: 'nearRail' }, { x: 'Ganaste la bandita: cobra $100.', k: 'gain', v: 100 },
      { x: 'Cumpleaños de un amigo: paga $50 a cada jugador.', k: 'payEach', v: 50 }, { x: 'El colmado te fía y se lo cobras a todos: cobra $50 de cada jugador.', k: 'collectEach', v: 50 },
      { x: 'Reparaciones: paga $25 por cada casa y $100 por cada torre.', k: 'repairs', v: 25, w: 100 }, { x: 'Avanza hasta Bávaro.', k: 'moveTo', v: 31 },
      { x: 'Avanza hasta el servicio más cercano. Si tiene dueño, pagas 10 veces el dado.', k: 'nearUtil' }, { x: 'El banco te devuelve $75 de ITBIS.', k: 'gain', v: 75 }
    ],
    C: [
      { x: 'Error del banco a tu favor: cobra $200.', k: 'gain', v: 200 }, { x: 'Pagas la luz atrasada: $100.', k: 'pay', v: 100 },
      { x: 'Vendiste frituras en el parque: cobra $50.', k: 'gain', v: 50 }, { x: 'Honorarios del doctor: paga $50.', k: 'pay', v: 50 },
      { x: 'Herencia de la abuela: cobra $100.', k: 'gain', v: 100 }, { x: 'Avanza hasta la SALIDA y cobra el sueldo.', k: 'moveTo', v: 0 },
      { x: '¡Operativo! Ve directo al Preventivo, sin cobrar la SALIDA.', k: 'jail' }, { x: 'Sales libre del Preventivo. Guarda esta carta.', k: 'jailcard' },
      { x: 'Devolución de impuestos: cobra $20.', k: 'gain', v: 20 }, { x: 'Es tu cumpleaños: cada jugador te da $10.', k: 'collectEach', v: 10 },
      { x: 'Pagas el colegio: $150.', k: 'pay', v: 150 }, { x: 'Cobras el seguro: $100.', k: 'gain', v: 100 },
      { x: 'Te ganaste una rifa: cobra $25.', k: 'gain', v: 25 }, { x: 'Reparación de calles: paga $40 por casa y $115 por torre.', k: 'repairs', v: 40, w: 115 },
      { x: 'Ganaste el concurso de merengue: cobra $10.', k: 'gain', v: 10 }, { x: 'Multa de tránsito: paga $15.', k: 'pay', v: 15 }
    ]
  };

  function rng(g) { let t = g.s = (g.s + 0x6D2B79F5) >>> 0; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296 }
  function shuffle(g, a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng(g) * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
  const cur = g => g.players[g.turn];
  const money = n => '$' + n;

  function create(o) {
    o = o || {};
    const list = (o.players && o.players.length ? o.players : [{ name: 'Tú' }, { name: 'IA', ai: true }]).slice(0, 8);
    const g = {
      v: 1, cfg: Object.assign({ rm: 3, go: GO, res: [80, 40, 0] }, o.cfg || {}), mode: o.mode === 'rapido' ? 'rapido' : 'normal', s: (o.seed == null ? Date.now() : o.seed) >>> 0,
      players: list.map((p, i) => ({ id: i, name: p.name || 'Jugador ' + (i + 1), ai: !!p.ai, style: p.style || 'eq', token: p.token || TOKENS[i], color: p.color || ['#d62027', '#0b3d91', '#1f9d55', '#e0a800', '#7a3fc9', '#e8731a', '#e0529c', '#12a3a3'][i], cash: START, pos: 0, jail: 0, cards: [], bankrupt: false })),
      own: new Array(40).fill(null), turn: 0, phase: 'roll', dice: [0, 0], dbl: 0, after: 'end', debt: null, rent: 0,
      turns: list.map(() => 0), total: 0, over: false, winner: null, log: [], ev: [], card: null
    };
    g.decks = { S: shuffle(g, CARDS.S.map((c, i) => i)), C: shuffle(g, CARDS.C.map((c, i) => i)) };
    g.turn = Math.floor(rng(g) * list.length);
    say(g, 'Empieza ' + cur(g).name + '.');
    return g;
  }

  function say(g, text) { g.log.push(text); if (g.log.length > 60) g.log.shift(); g.ev.push({ t: 'say', x: text }) }
  function alive(g) { return g.players.filter(p => !p.bankrupt) }
  function groupOwned(g, pid, grp) { return GROUP_TILES[grp].every(i => g.own[i] && g.own[i].o === pid) }
  function ownedBy(g, pid) { const r = []; g.own.forEach((o, i) => { if (o && o.o === pid) r.push(i) }); return r }
  function netWorth(g, pid) {
    const p = g.players[pid]; let w = p.cash;
    ownedBy(g, pid).forEach(i => { const o = g.own[i], t = T[i]; w += o.m ? t.p / 2 : t.p; if (t.g) w += o.h * GROUPS[t.g].house });
    return w;
  }

  function rentOf(g, i, dice) {
    const o = g.own[i], t = T[i]; if (!o) return 0;
    if (t.t === 'prop') {
      if (o.h === 0) return Math.round((groupOwned(g, o.o, t.g) ? t.r[0] * 2 : t.r[0]) * g.cfg.rm);
      return Math.round(t.r[o.h] * g.cfg.rm);
    }
    if (t.t === 'rail') { const n = RAILS.filter(r => g.own[r] && g.own[r].o === o.o).length; return (25 << (n - 1)) * (g.cardRent === 'rail' ? 2 : 1) }
    const n = UTILS.filter(r => g.own[r] && g.own[r].o === o.o).length;
    return (g.cardRent === 'util' ? 10 : n >= 2 ? 10 : 4) * (dice[0] + dice[1]);
  }

  // ---- movimiento y casillas
  function finish(g) { g.debt = null; g.phase = g.after === 'roll' ? 'roll' : 'end' }
  function resume(g, then) { if (then && then.k === 'move') move(g, cur(g), then.n); else if (then && then.k === 'land') land(g, cur(g)); else finish(g) }
  function pay(g, p, amt, to) {
    p.cash -= amt;
    if (Array.isArray(to)) { const each = amt / to.length; to.forEach(q => g.players[q].cash += each) } else if (to != null) g.players[to].cash += amt;
    g.ev.push({ t: 'pay', from: p.id, to: to == null ? -1 : to, amt });
  }
  // Todos los pagos son manuales: se crea una deuda y el jugador debe pulsar "Pagar" (acción 'settle').
  function charge(g, p, amt, to, then, why) {
    if (amt <= 0) return resume(g, then);
    g.debt = { p: p.id, amt, to: to == null ? null : to, then: then || { k: 'finish' }, why: why || '' }; g.phase = 'debt';
    say(g, p.name + ' debe pagar ' + money(amt) + (why ? ' (' + why + ')' : '') + '.');
  }
  function goJail(g, p) { p.pos = 10; p.jail = 1; g.dbl = 0; g.after = 'end'; g.ev.push({ t: 'jail', p: p.id }); say(g, p.name + ' va al Preventivo.'); finish(g) }
  function move(g, p, n) {
    const from = p.pos, raw = from + n; p.pos = ((raw % 40) + 40) % 40;
    if (n > 0 && raw >= 40) { p.cash += g.cfg.go; g.ev.push({ t: 'go', p: p.id }); say(g, p.name + ' pasa por la SALIDA y cobra ' + money(g.cfg.go) + '.') }
    g.ev.push({ t: 'move', p: p.id, from, to: p.pos });
    land(g, p);
  }
  function moveTo(g, p, to) { move(g, p, (to - p.pos + 40) % 40 || 0) }
  function land(g, p) {
    const t = T[p.pos], o = g.own[p.pos];
    if (t.t === 'prop' || t.t === 'rail' || t.t === 'util') {
      if (!o) { if (p.cash >= t.p) { g.phase = 'buy'; return } say(g, p.name + ' no tiene para comprar ' + t.n + '.'); return finish(g) }
      if (o.o === p.id || o.m) return finish(g);
      const amt = rentOf(g, p.pos, g.dice); g.rent = amt;
      say(g, p.name + ' paga ' + money(amt) + ' de alquiler a ' + g.players[o.o].name + ' por ' + t.n + '.');
      return charge(g, p, amt, o.o, { k: 'finish' }, 'alquiler de ' + t.n);
    }
    if (t.t === 'tax') { say(g, p.name + ' paga ' + t.n + ': ' + money(t.p) + '.'); return charge(g, p, t.p, null, { k: 'finish' }, t.n) }
    if (t.t === 'card') { g.phase = 'draw'; g.deck = t.d; say(g, p.name + ' cae en ' + t.n + ' y debe sacar una carta.'); return }
    if (t.t === 'gojail') return goJail(g, p);
    finish(g);
  }
  function drawCard(g, p, d) {
    const deck = g.decks[d], idx = deck.shift(), c = CARDS[d][idx];
    if (c.k !== 'jailcard') deck.push(idx);
    g.card = { d, i: idx, x: c.x, p: p.id }; g.ev.push({ t: 'card', d, i: idx, p: p.id });
    say(g, p.name + ': «' + c.x + '»');
    const fin = { k: 'finish' };
    switch (c.k) {
      case 'gain': p.cash += c.v; return finish(g);
      case 'pay': return charge(g, p, c.v, null, fin, 'carta');
      case 'moveTo': return moveTo(g, p, c.v);
      case 'back': p.pos = (p.pos - c.v + 40) % 40; g.ev.push({ t: 'move', p: p.id, from: (p.pos + c.v) % 40, to: p.pos }); return land(g, p);
      case 'jail': return goJail(g, p);
      case 'jailcard': p.cards.push([d, idx]); return finish(g);
      case 'payEach': { const others = alive(g).filter(q => q.id !== p.id).map(q => q.id); return charge(g, p, c.v * others.length, others, fin, 'carta') }
      case 'collectEach': alive(g).forEach(q => { if (q.id !== p.id) { const a = Math.min(q.cash, c.v); q.cash -= a; p.cash += a } }); return finish(g);
      case 'repairs': { let amt = 0; ownedBy(g, p.id).forEach(i => { const h = g.own[i].h; if (h) amt += h === 5 ? c.w : h * c.v }); return charge(g, p, amt, null, fin, 'reparaciones') }
      case 'nearRail': case 'nearUtil': {
        const list = c.k === 'nearRail' ? RAILS : UTILS; const to = list.find(i => i > p.pos) != null ? list.find(i => i > p.pos) : list[0];
        g.cardRent = c.k === 'nearRail' ? 'rail' : 'util';
        moveTo(g, p, to); g.cardRent = null; return;
      }
    }
    finish(g);
  }

  // ---- reglas de construir e hipotecar
  function canBuild(g, pid, i) {
    const t = T[i], o = g.own[i]; if (!o || o.o !== pid || t.t !== 'prop') return false;
    if (!groupOwned(g, pid, t.g)) return false;
    const grp = GROUP_TILES[t.g]; if (grp.some(j => g.own[j].m)) return false;
    if (o.h >= 5) return false; if (grp.some(j => g.own[j].h < o.h)) return false;
    return g.players[pid].cash >= GROUPS[t.g].house;
  }
  function canSell(g, pid, i) {
    const t = T[i], o = g.own[i]; if (!o || o.o !== pid || t.t !== 'prop' || o.h <= 0) return false;
    return !GROUP_TILES[t.g].some(j => g.own[j].h > o.h);
  }
  function canMortgage(g, pid, i) {
    const t = T[i], o = g.own[i]; if (!o || o.o !== pid || o.m) return false;
    return !(t.g && GROUP_TILES[t.g].some(j => g.own[j] && g.own[j].h > 0));
  }
  const unmortgageCost = i => Math.ceil(T[i].p / 2 * 1.1);

  function bankrupt(g, p, to) {
    ownedBy(g, p.id).forEach(i => {
      const o = g.own[i];
      if (typeof to === 'number') { o.o = to; o.h = 0 } else g.own[i] = null;
    });
    if (typeof to === 'number') g.players[to].cash += Math.max(0, p.cash);
    p.cash = 0; p.bankrupt = true;
    p.cards.forEach(([d, i]) => g.decks[d].push(i)); p.cards = [];
    g.debt = null; g.ev.push({ t: 'bankrupt', p: p.id }); say(g, p.name + ' se declara en quiebra.');
    if (alive(g).length <= 1) return endGame(g);
    g.turns[p.id]++; nextTurn(g);
  }
  function nextTurn(g) {
    do { g.turn = (g.turn + 1) % g.players.length } while (cur(g).bankrupt);
    g.dbl = 0; g.after = 'end'; g.phase = 'roll'; g.debt = null; g.total++;
    if (g.total > CAP) return endGame(g);
    if (g.mode === 'rapido' && alive(g).every(q => g.turns[q.id] >= FAST_TURNS)) return endGame(g);
    g.ev.push({ t: 'turn', p: g.turn });
  }
  function endGame(g) {
    g.over = true; g.phase = 'over';
    const a = alive(g).slice().sort((x, y) => netWorth(g, y.id) - netWorth(g, x.id));
    g.winner = a[0].id; g.ev.push({ t: 'over', p: g.winner });
    say(g, '¡' + a[0].name + ' gana la partida con ' + money(netWorth(g, a[0].id)) + '!');
  }

  const err = e => ({ ok: false, err: e });
  function act(g, a) {
    g.ev = [];
    if (g.over) return err('La partida terminó.');
    const p = cur(g);
    if (a.p != null && a.p !== p.id) return err('No es tu turno.');
    const phase = g.phase, mgmt = phase === 'roll' || phase === 'end' || phase === 'debt';
    switch (a.t) {
      case 'roll': {
        if (phase !== 'roll') return err('Ahora no puedes tirar.');
        const d1 = 1 + Math.floor(rng(g) * 6), d2 = 1 + Math.floor(rng(g) * 6), dbl = d1 === d2; g.dice = [d1, d2];
        g.ev.push({ t: 'roll', p: p.id, d: [d1, d2] }); say(g, p.name + ' saca ' + d1 + ' y ' + d2 + (dbl ? ' (dobles)' : '') + '.');
        if (p.jail > 0) {
          if (dbl) { p.jail = 0; g.after = 'end'; say(g, p.name + ' sale del Preventivo con dobles.'); move(g, p, d1 + d2); return { ok: true } }
          p.jail++;
          if (p.jail > 3) { p.jail = 0; g.after = 'end'; say(g, p.name + ' paga ' + money(JAIL_FEE) + ' y sale del Preventivo.'); charge(g, p, JAIL_FEE, null, { k: 'move', n: d1 + d2 }, 'multa del Preventivo'); return { ok: true } }
          g.after = 'end'; say(g, p.name + ' sigue en el Preventivo.'); finish(g); return { ok: true };
        }
        if (dbl) { g.dbl++; if (g.dbl >= 3) { say(g, 'Tres dobles seguidos.'); goJail(g, p); return { ok: true } } g.after = 'roll' } else { g.dbl = 0; g.after = 'end' }
        move(g, p, d1 + d2); return { ok: true };
      }
      case 'draw': {
        if (phase !== 'draw') return err('No hay carta que sacar.');
        drawCard(g, p, g.deck); return { ok: true };
      }
      case 'buy': {
        if (phase !== 'buy') return err('No hay nada que comprar.');
        const t = T[p.pos]; if (p.cash < t.p) return err('No te alcanza el dinero.');
        p.cash -= t.p; g.own[p.pos] = { o: p.id, h: 0, m: false }; g.ev.push({ t: 'buy', p: p.id, i: p.pos });
        say(g, p.name + ' compra ' + t.n + ' por ' + money(t.p) + '.'); finish(g); return { ok: true };
      }
      case 'decline': if (phase !== 'buy') return err('No hay nada que decidir.'); say(g, p.name + ' no compra ' + T[p.pos].n + '.'); finish(g); return { ok: true };
      case 'build': {
        if (!(phase === 'roll' || phase === 'end')) return err('Ahora no puedes construir.');
        if (!canBuild(g, p.id, a.i)) return err('No puedes construir ahí.');
        const t = T[a.i], c = GROUPS[t.g].house; p.cash -= c; g.own[a.i].h++; g.ev.push({ t: 'build', p: p.id, i: a.i, h: g.own[a.i].h });
        say(g, p.name + ' construye en ' + t.n + ' (' + money(c) + ').'); return { ok: true };
      }
      case 'sell': {
        if (!mgmt) return err('Ahora no puedes vender.');
        if (!canSell(g, p.id, a.i)) return err('No puedes vender ahí.');
        const c = GROUPS[T[a.i].g].house / 2; p.cash += c; g.own[a.i].h--; g.ev.push({ t: 'sell', p: p.id, i: a.i, h: g.own[a.i].h });
        say(g, p.name + ' vende una construcción de ' + T[a.i].n + ' (' + money(c) + ').'); return { ok: true };
      }
      case 'mortgage': {
        if (!mgmt) return err('Ahora no puedes hipotecar.');
        if (!canMortgage(g, p.id, a.i)) return err('No puedes hipotecar eso (vende primero las construcciones).');
        g.own[a.i].m = true; p.cash += T[a.i].p / 2; g.ev.push({ t: 'mortgage', p: p.id, i: a.i });
        say(g, p.name + ' hipoteca ' + T[a.i].n + ' (' + money(T[a.i].p / 2) + ').'); return { ok: true };
      }
      case 'unmortgage': {
        if (!(phase === 'roll' || phase === 'end')) return err('Ahora no puedes.');
        const o = g.own[a.i]; if (!o || o.o !== p.id || !o.m) return err('Esa propiedad no está hipotecada.');
        const c = unmortgageCost(a.i); if (p.cash < c) return err('No te alcanza el dinero.');
        p.cash -= c; o.m = false; g.ev.push({ t: 'unmortgage', p: p.id, i: a.i }); say(g, p.name + ' recupera ' + T[a.i].n + ' (' + money(c) + ').'); return { ok: true };
      }
      case 'payJail': {
        if (phase !== 'roll' || p.jail <= 0) return err('No estás en el Preventivo.');
        if (p.cash < JAIL_FEE) return err('No te alcanza el dinero.');
        p.cash -= JAIL_FEE; p.jail = 0; say(g, p.name + ' paga ' + money(JAIL_FEE) + ' y sale del Preventivo.'); return { ok: true };
      }
      case 'useCard': {
        if (phase !== 'roll' || p.jail <= 0 || !p.cards.length) return err('No tienes carta para salir.');
        const [d, i] = p.cards.pop(); g.decks[d].push(i); p.jail = 0; say(g, p.name + ' usa su carta y sale del Preventivo.'); return { ok: true };
      }
      case 'settle': {
        if (phase !== 'debt') return err('No hay deudas.');
        const d = g.debt; if (p.cash < d.amt) return err('Todavía no te alcanza.');
        pay(g, p, d.amt, d.to); const then = d.then; g.debt = null; resume(g, then); return { ok: true };
      }
      case 'bankrupt': {
        if (phase !== 'debt') return err('Solo puedes declararte en quiebra con una deuda.');
        bankrupt(g, p, g.debt.to); return { ok: true };
      }
      case 'endTurn': {
        if (phase !== 'end') return err('Todavía no puedes terminar el turno.');
        g.turns[p.id]++; nextTurn(g); return { ok: true };
      }
    }
    return err('Acción desconocida.');
  }

  // ---- computadora
  const ORDER = ['orange', 'red', 'yellow', 'lblue', 'pink', 'green', 'blue', 'brown'];
  function aiManage(g, p, res) {
    const mine = ownedBy(g, p.id);
    const um = mine.filter(i => g.own[i].m && p.cash - unmortgageCost(i) >= res + 100).sort((a, b) => T[b].p - T[a].p)[0];
    if (um != null) return { t: 'unmortgage', i: um, p: p.id };
    const bs = mine.filter(i => canBuild(g, p.id, i) && p.cash - GROUPS[T[i].g].house >= res)
      .sort((a, b) => ORDER.indexOf(T[a].g) - ORDER.indexOf(T[b].g) || g.own[a].h - g.own[b].h);
    if (bs.length) return { t: 'build', i: bs[0], p: p.id };
    return null;
  }
  function aiAct(g) {
    if (g.over) return null;
    const p = cur(g), me = p.id, res = g.cfg.res[{ cauta: 0, eq: 1, agr: 2 }[p.style] != null ? { cauta: 0, eq: 1, agr: 2 }[p.style] : 1];
    const mine = ownedBy(g, me);
    if (g.phase === 'debt') {
      if (p.cash >= g.debt.amt) return { t: 'settle', p: me };
      const sells = mine.filter(i => canSell(g, me, i)).sort((a, b) => GROUPS[T[b].g].house - GROUPS[T[a].g].house);
      if (sells.length) return { t: 'sell', i: sells[0], p: me };
      const ms = mine.filter(i => canMortgage(g, me, i)).sort((a, b) => T[a].p - T[b].p);
      if (ms.length) return { t: 'mortgage', i: ms[0], p: me };
      return { t: 'bankrupt', p: me };
    }
    if (g.phase === 'draw') return { t: 'draw', p: me };
    if (g.phase === 'buy') {
      const t = T[p.pos], left = p.cash - t.p;
      const completes = t.g && GROUP_TILES[t.g].every(j => j === p.pos || (g.own[j] && g.own[j].o === me));
      const want = (completes || t.t !== 'prop') ? left >= res / 2 : left >= res;
      return { t: want ? 'buy' : 'decline', p: me };
    }
    if (g.phase === 'roll') {
      if (p.jail > 0) {
        if (p.cards.length) return { t: 'useCard', p: me };
        const free = T.filter((t, i) => (t.t === 'prop' || t.t === 'rail' || t.t === 'util') && !g.own[i]).length;
        if (free > 6 && p.cash >= 50 + res) return { t: 'payJail', p: me };
      }
      return aiManage(g, p, res) || { t: 'roll', p: me };
    }
    if (g.phase === 'end') return aiManage(g, p, res) || { t: 'endTurn', p: me };
    return null;
  }

  const api = { TILES: T, GROUPS, GROUP_TILES, TOKENS, CARDS, START, GO, create, act, aiAct, rentOf, netWorth, ownedBy, groupOwned, canBuild, canSell, canMortgage, unmortgageCost, cur, alive };
  root.Dominopolis = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
