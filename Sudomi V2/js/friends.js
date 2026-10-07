/* SUDOMI 0.2.71 — AMIGOS: lista de amigos e invitaciones desde dentro del juego (window.SudomiFriends).
 *
 * SUDOMI no tiene servidor propio ni cuentas, así que esto funciona así:
 *  · Cada persona tiene un CÓDIGO DE AMIGO (8 letras/números al azar, guardado en este dispositivo: localStorage 'sudomi-friends').
 *  · Con "Aparecer en línea" activado (viene activado), la app abre un buzón en el servicio de salas público (PeerJS) con el id
 *    "sudomi-friend-<código>" mientras el juego esté abierto. Ahí llegan invitaciones, solicitudes de amistad y comprobaciones de "¿estás en línea?".
 *  · Agregar un amigo = escribir su código (o abrir su enlace). Se le avisa a su buzón ({t:'friend-add'}) y le aparece EN SU LISTA al instante;
 *    si estaba desconectado, el aviso queda pendiente y se reenvía en cuanto aparezca en línea.
 *  · Invitar = conectarse a su buzón y enviarle {t:'invite',game,room}; si su juego está abierto le sale un aviso con "Unirme".
 *  · Cualquier elemento <div class="fr-panel" data-game data-name data-room> que aparezca en pantalla se llena solo con la lista de
 *    amigos y botones "Invitar" (así todas las salas de espera comparten el mismo panel).
 *  · "Partida en curso": los juegos online avisan con track()/untrack(); al abrir SUDOMI sale un aviso para volver a la sala.
 *  Reutiliza window.SudomiParty (party-net.js) y SudomiScreen. Nada de esto toca el Sudoku. */
(() => {
  const KEY = 'sudomi-friends', ROOM_KEY = 'sudomi-active-room', ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', MAX_AGE = 6 * 3600 * 1000;
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clean = n => String(n || '').replace(/[<>&"']/g, '').replace(/\s+/g, ' ').trim().slice(0, 14);
  const norm = c => String(c || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const pretty = c => c && c.length === 8 ? c.slice(0, 4) + '-' + c.slice(4) : c || '';
  const newId = () => { const a = new Uint32Array(8); (window.crypto || window.msCrypto).getRandomValues(a); return Array.from(a).map(x => ALPHA[x % ALPHA.length]).join('') };
  const P = () => window.SudomiProfile;
  const play = n => { try { window.SudomiSound && SudomiSound.play(n) } catch (_) {} };
  const t = s => window.SudomiI18n ? SudomiI18n.t(s) : s;

  function read() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY));
      if (v && norm(v.id).length === 8) { const s = { on: true, list: [], blocked: [], pending: [], ...v, id: norm(v.id) }; if (!v.ver) s.on = true; s.ver = 2; return s }   // v2: "en línea" viene activado
    } catch (_) {}
    return { ver: 2, id: newId(), on: true, list: [], blocked: [], pending: [] };
  }
  let S = read();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)) } catch (_) {} };
  save();
  // 0.2.81: si SUDOMI está abierto dos veces (pestaña + app instalada, o dos pestañas), la copia vieja ya no pisa la lista de la otra
  window.addEventListener('storage', e => { if (e.key !== KEY || !e.newValue) return; try { S = read(); refreshUI(); homeBtn() } catch (_) {} });
  const me = () => ({ code: S.id, name: clean(P() && P().name && P().name()), avatar: (P() && P().avatar && P().avatar()) || '' });
  const hasProfile = () => !!(P() && P().get && P().get());
  const status = {};                       // código → 'on' | 'off' | '…'
  const sent = {};                         // sala+código → 'sent'
  let inbox = null, listening = false, lastErr = '', api = null;

  /* ---------- 0.2.77: AVISOS (invitaciones sin responder, amigos nuevos, invitaciones rechazadas) ----------
   * Se guardan en este teléfono (localStorage 'sudomi-notifs'), hasta 5 a la vez (los más nuevos), y se ven tocando el botón «Amigos» de la portada. */
  const NKEY = 'sudomi-notifs', NMAX = 5, N_LIFE = { invite: 6 * 3600 * 1000, added: 48 * 3600 * 1000, declined: 48 * 3600 * 1000 };
  function readN() {
    try {
      const a = JSON.parse(localStorage.getItem(NKEY)); if (!Array.isArray(a)) return [];
      return a.filter(n => n && n.id && N_LIFE[n.type] && Date.now() - n.ts < N_LIFE[n.type]).slice(0, NMAX);
    } catch (_) { return [] }
  }
  const writeN = a => { try { localStorage.setItem(NKEY, JSON.stringify(a.slice(0, NMAX))) } catch (_) {} };
  function addNotif(n) {               // misma cosa (tipo + persona + sala) = se actualiza en vez de repetirse
    n.id = n.type + ':' + n.code + ':' + (n.room || ''); n.ts = Date.now();
    const a = readN().filter(x => x.id !== n.id); a.unshift(n); writeN(a); homeBtn();
  }
  function removeNotif(id) { writeN(readN().filter(x => x.id !== id)); homeBtn() }
  // ¿la sala sigue abierta? Nos asomamos a su puerta sin entrar (sin llave): 'alive' | 'gone' | 'unknown'
  function probeRoom(game, room) {
    return new Promise(async res => {
      let done = false, p = null;
      const fin = r => { if (done) return; done = true; try { p && p.destroy() } catch (_) {} res(r) };
      setTimeout(() => fin('unknown'), 9000);
      try {
        if (!window.Peer) {
          const cfg = window.SUDOMI_ONLINE || {}, src = (cfg.scripts || ['https://cdnjs.cloudflare.com/ajax/libs/peerjs/1.5.5/peerjs.min.js'])[0];
          await new Promise((ok, bad) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = bad; document.head.appendChild(s) });
        }
        const cfg = window.SUDOMI_ONLINE || {};
        p = new window.Peer({ debug: 0, config: { iceServers: cfg.iceServers || [{ urls: 'stun:stun.l.google.com:19302' }] }, ...(cfg.peerServer || {}) });
        p.on('error', err => fin(err && err.type === 'peer-unavailable' ? 'gone' : 'unknown'));
        p.on('open', () => {
          const c = p.connect(`sudomi-${game}-${norm(room)}`, { reliable: true, serialization: 'json', metadata: { probe: 1 } });
          c.on('open', () => fin('alive')); c.on('error', () => fin('unknown'));
        });
      } catch (_) { fin('unknown') }
    });
  }
  /* ---------- lista ---------- */
  function addFriend(code, name, avatar) {
    code = norm(code);
    if (code.length !== 8 || code === S.id) return false;
    const f = S.list.find(x => x.code === code);
    if (f) { if (name) f.name = clean(name) || f.name; if (avatar) f.avatar = avatar; save(); return true }
    S.blocked = S.blocked.filter(c => c !== code);
    S.list.push({ code, name: clean(name) || 'Amigo', avatar: avatar || '🙂', added: Date.now() }); save(); return true;
  }
  function removeFriend(code) { S.list = S.list.filter(f => f.code !== code); S.pending = S.pending.filter(c => c !== code); delete status[code]; save() }
  function updateFrom(m) { if (!m) return; const c = norm(m.code), f = S.list.find(x => x.code === c); if (f) { const n = clean(m.name); if (n) f.name = n; if (m.avatar) f.avatar = String(m.avatar).slice(0, 4); save() } }
  function refreshUI() { if (api && api.body && api.body.isConnected && $('#friendsScreen') && !$('#friendsScreen').classList.contains('hidden')) draw(); fillPanels() }

  /* ---------- buzón (recibir) ---------- */
  async function listen() {
    if (listening || inbox || !S.on || !window.SudomiParty || !hasProfile()) return;
    listening = true;
    try { inbox = await SudomiParty.host('friend', onEvent, S.id); lastErr = '' }
    catch (e) { inbox = null; lastErr = e && e.message || 'No se pudo activar.' }
    listening = false; refreshUI();
  }
  function stopListening() { if (inbox) { try { inbox.close() } catch (_) {} inbox = null } }
  function onEvent(e) {
    if (e.type !== 'msg') return;
    const d = e.data || {};
    if (d.t === 'hello') { if (inbox) inbox.send(e.id, { t: 'hi', me: me() }); updateFrom(d.me); return }
    if (d.t === 'friend-add') { if (inbox) inbox.send(e.id, { t: 'ack' }); gotAdd(d.me); return }
    if (d.t === 'invite') { if (inbox) inbox.send(e.id, { t: 'ack' }); gotInvite(d) }
    if (d.t === 'invite-no') { if (inbox) inbox.send(e.id, { t: 'ack' }); gotDecline(d) }
  }
  // 0.2.77: tu amigo rechazó la invitación: puedes volver a invitarlo (se libera la marca «Invitación enviada») y te queda un aviso
  function gotDecline(d) {
    const from = d.from || {}, code = norm(from.code), name = clean(from.name), room = norm(d.room);
    if (code.length !== 8 || !name || room.length !== 8) return;
    delete sent[room + code]; updateFrom(from);
    addNotif({ type: 'declined', code, name, avatar: String(from.avatar || '🙂').slice(0, 4), game: String(d.game || ''), gameName: clean(d.gameName) || 'un juego', room });
    play('bad'); toast2(`${name} rechazó tu invitación`); refreshUI();
  }
  function gotAdd(m) {
    const code = norm(m && m.code), name = clean(m && m.name);
    if (code.length !== 8 || code === S.id || !name || S.blocked.includes(code)) return;
    const isNew = !S.list.some(f => f.code === code);
    addFriend(code, name, String((m && m.avatar) || '🙂').slice(0, 4));
    status[code] = 'on'; refreshUI();
    if (isNew) { play('bonus'); toast(name); addNotif({ type: 'added', code, name, avatar: String((m && m.avatar) || '🙂').slice(0, 4) }) }
  }
  const seenInv = {};
  function gotInvite(d) {
    const from = d.from || {}, code = norm(from.code), name = clean(from.name), room = norm(d.room), game = String(d.game || '').toLowerCase();
    if (!name || code.length !== 8 || room.length !== 8 || !/^[a-z0-9]{2,20}$/.test(game)) return;
    if (S.blocked.includes(code)) return;
    if (seenInv[room] && Date.now() - seenInv[room] < 60000) return; seenInv[room] = Date.now();
    updateFrom(from);
    const inv = { code, name, avatar: String(from.avatar || '🙂').slice(0, 4), game, room, gameName: clean(d.gameName) || 'un juego', known: S.list.some(f => f.code === code) };
    addNotif({ type: 'invite', code, name, avatar: inv.avatar, game, gameName: inv.gameName, room });   // queda como aviso aunque no la aceptes
    banner(inv);
  }
  function toast(name) {                   // "X te agregó como amigo"
    let b = $('#frToast'); if (b) b.remove();
    b = document.createElement('div'); b.id = 'frToast'; b.className = 'fr-banner fr-small'; b.textContent = '👥 ' + name + ' ' + t('te agregó como amigo');
    document.body.appendChild(b); setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 300) }, 3500);
  }
  function goTo(game, room, opts) {
    document.querySelectorAll('.ach-screen,.tut').forEach(x => x.classList.add('hidden')); document.body.classList.remove('tut-open');
    if (window.SudomiJoinInvite) SudomiJoinInvite(game, room, opts);
  }
  function banner(inv) {
    let b = $('#frBanner'); if (b) b.remove();
    b = document.createElement('div'); b.id = 'frBanner'; b.className = 'fr-banner'; b.setAttribute('role', 'alert'); b.dataset.room = norm(inv.room);
    b.innerHTML = `<div class="fr-b-who"><span>${esc(inv.avatar)}</span><div>${esc(`${inv.name} te invita a jugar ${inv.gameName}`)}</div></div>
      <div class="fr-b-btns"><button type="button" class="fr-go" id="frGo">Unirme</button><button type="button" id="frNo">Ahora no</button>${inv.known ? '' : '<button type="button" id="frAdd">+ Amigo</button>'}<button type="button" id="frBlock" aria-label="Bloquear">🚫</button></div>`;
    document.body.appendChild(b); play('bonus');
    const close = () => { b.classList.add('out'); setTimeout(() => b.remove(), 300) };
    b.querySelector('#frGo').onclick = async () => {
      const go = b.querySelector('#frGo'); go.disabled = true; go.textContent = t('Comprobando…');
      const ok = await acceptInvite({ type: 'invite', code: inv.code, name: inv.name, avatar: inv.avatar, game: inv.game, gameName: inv.gameName, room: inv.room, id: 'invite:' + inv.code + ':' + inv.room });
      if (ok) close(); else { b.querySelector('.fr-b-who div').textContent = t(`Sesión terminada: la partida de ${inv.name} ya no está disponible.`); b.querySelector('.fr-b-btns').remove(); setTimeout(close, 6000) }
    };
    b.querySelector('#frNo').onclick = close;
    const a = b.querySelector('#frAdd'); if (a) a.onclick = () => { addFriend(inv.code, inv.name, inv.avatar); notifyAdd(inv.code); a.remove(); refreshUI() };
    b.querySelector('#frBlock').onclick = () => { if (!S.blocked.includes(inv.code)) S.blocked.push(inv.code); removeFriend(inv.code); save(); removeNotif('invite:' + inv.code + ':' + inv.room); close() };
    setTimeout(() => { if (b.isConnected) close() }, 45000);
  }

  /* ---------- enviar ---------- */
  // los envíos a un mismo amigo van de uno en uno (comparten la misma "llave" de conexión; dos a la vez se pisarían)
  const chains = {};
  function send(code, msg, ms) { const run = () => rawSend(code, msg, ms); chains[code] = (chains[code] || Promise.resolve()).then(run, run); return chains[code] }
  function rawSend(code, msg, ms) {         // → 'sent' | 'online' | 'offline' | 'error'
    return new Promise(res => {
      let done = false, conn = null;
      const fin = r => { if (done) return; done = true; try { conn && conn.close() } catch (_) {} res(r) };
      if (!window.SudomiParty) return fin('error');
      try {
        conn = SudomiParty.join('friend', code, { n: me().name }, ev => {
          if (ev.type === 'open') { try { conn.send(msg) } catch (_) { fin('error') } }
          else if (ev.type === 'msg') { const d = ev.data || {}; if (d.t === 'hi') { updateFrom(d.me); fin('online') } else if (d.t === 'ack') fin('sent') }
          else if (ev.type === 'closed') fin('offline');
        });
      } catch (_) { return fin('error') }
      setTimeout(() => fin('offline'), ms || 7000);
    });
  }
  // avisa al otro que lo agregaste (le aparece en su lista al momento); si no está en línea queda pendiente
  async function notifyAdd(code) {
    const r = await send(code, { t: 'friend-add', me: me() }, 7000);
    if (r === 'sent' || r === 'online') S.pending = S.pending.filter(c => c !== code);
    else if (!S.pending.includes(code)) S.pending.push(code);
    save(); return r;
  }
  async function retryPending() {
    for (const c of S.pending.slice()) { if (!S.list.some(f => f.code === c)) { S.pending = S.pending.filter(x => x !== c); continue } await notifyAdd(c) }
    save();
  }
  let checking = false;
  async function checkAll(codes, onEach) {  // comprueba quién está en línea (3 a la vez)
    const q = codes.slice();
    const worker = async () => { while (q.length) { const c = q.shift(); status[c] = '…'; if (onEach) onEach(c); const r = await send(c, { t: 'hello', me: me() }, 6000); status[c] = r === 'online' ? 'on' : 'off'; if (onEach) onEach(c); if (status[c] === 'on' && S.pending.includes(c)) notifyAdd(c) } };
    await Promise.all([worker(), worker(), worker()]);
  }
  const base = () => location.origin && location.origin !== 'null' ? location.origin + location.pathname : location.href.split(/[?#]/)[0];
  const myLink = () => `${base()}?friend=${S.id}&n=${encodeURIComponent(me().name)}`;

  /* ---------- pantalla "Amigos" ---------- */
  function dot(c) { const s = status[c]; return s === 'on' ? '<i class="fr-dot on"></i>En línea' : s === 'off' ? '<i class="fr-dot"></i>Desconectado' : s === '…' ? '<i class="fr-dot wait"></i>Comprobando…' : '<i class="fr-dot"></i>—' }
  function draw() {
    if (!api || !api.body.isConnected) return;
    const body = api.body, prof = hasProfile();
    body.innerHTML = `
      <div class="fr-card"><small>TU CÓDIGO DE AMIGO</small><b class="fr-code">${pretty(S.id)}</b>
        <div class="fr-row"><button type="button" class="fr-btn" id="frShare">📤 Compartir mi enlace</button><button type="button" class="fr-btn alt" id="frCopy">Copiar código</button></div>
        <p class="fr-note">Tus amigos escriben este código (o abren el enlace) para agregarte.</p></div>
      <div class="fr-card"><label class="fr-switch"><input type="checkbox" id="frOn" ${S.on ? 'checked' : ''}><span>Aparecer en línea para mis amigos</span></label>
        <p class="fr-note">${S.on ? (inbox ? '✓ Activo: recibirás invitaciones mientras SUDOMI esté abierto.' : (lastErr ? esc(lastErr) : 'Conectando…')) : 'Apagado: nadie puede invitarte (tú sí puedes invitar). Al activarlo se usa el servicio de salas público; verán tu nombre y avatar solo tus amigos.'}</p>
        ${prof ? '' : '<p class="fr-note bad">Primero crea tu perfil (nombre y avatar).</p>'}</div>
      <div class="fr-card"><b>Agregar un amigo</b><div class="fr-row"><input id="frCode" maxlength="9" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="ABCD-2345"><button type="button" class="fr-btn" id="frAdd">Agregar</button></div><p class="fr-note" id="frMsg"></p></div>
      <div class="fr-head"><b>${esc(`Mis amigos (${S.list.length})`)}</b>${S.list.length ? '<button type="button" class="fr-mini" id="frCheck">↻ Comprobar</button>' : ''}</div>
      <div class="fr-list">${S.list.length ? S.list.map(f => `<div class="fr-friend" data-c="${f.code}"><span class="fr-av">${esc(f.avatar)}</span><div><b>${esc(f.name)}</b><small>${dot(f.code)}</small></div><button type="button" class="fr-x" data-del="${f.code}" aria-label="Quitar">🗑</button></div>`).join('') : '<p class="fr-note">Todavía no tienes amigos agregados.</p>'}</div>
      ${S.blocked.length ? `<p class="fr-note">${esc(`Bloqueados: ${S.blocked.length}`)} <button type="button" class="fr-mini" id="frUnblock">Desbloquear todos</button></p>` : ''}`;
    $('#frShare').onclick = shareMine;
    $('#frCopy').onclick = async () => { try { await navigator.clipboard.writeText(pretty(S.id)); msg('Código copiado.') } catch (_) { msg(pretty(S.id)) } };
    $('#frOn').onchange = async e => {
      if (e.target.checked) { if (!hasProfile()) { e.target.checked = false; if (P() && P().ensure) { api.close(); P().ensure(() => open()) } return } S.on = true; save(); draw(); await listen() }
      else { S.on = false; save(); stopListening(); draw() }
    };
    $('#frAdd').onclick = () => {
      const c = norm($('#frCode').value);
      if (c.length !== 8) return msg('Escribe el código completo (8 caracteres).');
      if (c === S.id) return msg('Ese es tu propio código.');
      if (S.list.some(f => f.code === c)) return msg('Ya es tu amigo.');
      addFriend(c, '', ''); draw(); notifyAdd(c); checkAll([c], () => draw());
    };
    const ck = $('#frCheck'); if (ck) ck.onclick = () => checkAll(S.list.map(f => f.code), () => draw());
    body.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if (confirm(t('¿Quitar a este amigo?'))) { removeFriend(b.dataset.del); draw() } });
    const ub = $('#frUnblock'); if (ub) ub.onclick = () => { S.blocked = []; save(); draw() };
  }
  function msg(text) { const m = $('#frMsg'); if (m) m.textContent = text }
  function shareMine() {
    const url = myLink(), text = 'Agrégame como amigo en SUDOMI';
    if (navigator.share) navigator.share({ title: 'SUDOMI', text: t(text), url }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => msg('Enlace copiado. Pégalo en tu chat.')).catch(() => msg(url));
    else msg(url);
  }
  function open() {
    if (!window.SudomiScreen) return;
    api = SudomiScreen.open('friendsScreen', '👥 Amigos', (body, a) => { api = a; draw() });
    if (S.on) listen();
    if (S.list.length) checkAll(S.list.map(f => f.code), () => draw());
  }

  /* ---------- panel de invitar dentro de las salas ---------- */
  // <div class="fr-panel" data-game="dos" data-name="DOS" data-room="ABCD2345" data-url="…"></div>
  const lastCheck = {};
  function panelHTML(el) {
    const room = norm(el.dataset.room);
    const rows = S.list.length ? S.list.map(f => {
      const done = sent[room + f.code];
      return `<div class="fr-friend" data-c="${f.code}"><span class="fr-av">${esc(f.avatar)}</span><div><b>${esc(f.name)}</b><small>${dot(f.code)}</small></div><button type="button" class="fr-btn" data-inv="${f.code}" ${done ? 'disabled' : ''}>${done ? '✓ Enviada' : 'Invitar'}</button></div>`;
    }).join('') : '<p class="fr-note">Todavía no tienes amigos agregados.</p>';
    return `<div class="fr-pbox"><div class="fr-head"><b>👥 Invitar amigos</b>${S.list.length ? '<button type="button" class="fr-mini" data-pcheck>↻</button>' : ''}</div><div class="fr-list">${rows}</div><div class="fr-row"><button type="button" class="fr-btn alt" data-pfriends>👥 Mis amigos</button>${el.dataset.url ? '<button type="button" class="fr-btn alt" data-plink>📤 Compartir enlace</button>' : ''}</div><p class="fr-note small">Tu amigo recibe el aviso solo si tiene SUDOMI abierto y "Aparecer en línea" activado.</p></div>`;
  }
  function bindPanel(el) {
    const room = norm(el.dataset.room), game = el.dataset.game, gameName = el.dataset.name || '';
    el.querySelectorAll('[data-inv]').forEach(b => b.onclick = async () => {
      const c = b.dataset.inv; b.disabled = true; b.textContent = 'Enviando…';
      const r = await send(c, { t: 'invite', game, gameName, room, from: me() }, 8000);
      if (r === 'sent') { sent[room + c] = 'sent'; status[c] = 'on' } else status[c] = 'off';
      b.textContent = r === 'sent' ? '✓ Enviada' : 'Sin conexión'; b.disabled = r === 'sent';
      if (r !== 'sent') setTimeout(() => { if (b.isConnected) { b.textContent = 'Invitar'; b.disabled = false } }, 2500);
    });
    const pf = el.querySelector('[data-pfriends]'); if (pf) pf.onclick = open;
    const pc = el.querySelector('[data-pcheck]'); if (pc) pc.onclick = () => { lastCheck[room] = Date.now(); checkAll(S.list.map(f => f.code), c => updateRow(el, c)) };
    const pl = el.querySelector('[data-plink]'); if (pl) pl.onclick = () => { const url = el.dataset.url; if (navigator.share) navigator.share({ title: 'SUDOMI', text: gameName ? t('Juega ' + gameName + ' conmigo en SUDOMI') : t('Juega conmigo en SUDOMI'), url }).catch(() => {}); else if (navigator.clipboard) navigator.clipboard.writeText(url) };
    if (S.list.length && (!lastCheck[room] || Date.now() - lastCheck[room] > 20000)) { lastCheck[room] = Date.now(); checkAll(S.list.map(f => f.code), c => updateRow(el, c)) }
  }
  function updateRow(el, c) { const row = el.querySelector(`.fr-friend[data-c="${c}"] small`); if (row && el.isConnected) row.innerHTML = dot(c) }
  function fillPanels() {
    document.querySelectorAll('.fr-panel:not([data-filled])').forEach(el => { el.dataset.filled = '1'; el.innerHTML = panelHTML(el); bindPanel(el) });
  }
  new MutationObserver(() => fillPanels()).observe(document.documentElement, { childList: true, subtree: true });
  // Invitar a VARIOS amigos a la vez: hoja con casillas ☑ y un solo botón «Enviar invitaciones».
  // La invitación no reserva ningún espacio: entra el primero que acepte.
  // opts: {game, gameName, room, url?}
  function invite(opts) {
    if (!window.SudomiScreen) return;
    const room = norm(opts.room), game = opts.game, gameName = opts.gameName || '';
    // 0.3.41: «Invitar de nuevo» (alguien se salió de tu sala) — se olvida que ya lo habías invitado; si no, salía marcado «✓ Invitación enviada» y no se podía reenviar
    if (opts.again) Object.keys(sent).forEach(k => { if (k.indexOf(room) === 0) delete sent[k] });
    SudomiScreen.open('friendsInvite', '👥 Invitar amigos', (body, a) => {
      const sel = new Set(S.list.map(f => f.code));          // por defecto, todos marcados
      const paint = () => {
        const n = sel.size;
        body.innerHTML = `<p class="fr-note">${esc(`Sala ${pretty(room)} · ${gameName}. Tu amigo recibe el aviso solo si tiene SUDOMI abierto y "Aparecer en línea" activado.`)}</p>
          ${S.list.length ? `<label class="fr-check fr-all"><input type="checkbox" id="frAll" ${n === S.list.length ? 'checked' : ''}><span>Todos</span></label>
          <div class="fr-list">${S.list.map(f => { const done = sent[room + f.code]; return `<label class="fr-friend fr-pick" data-c="${f.code}"><input type="checkbox" data-sel="${f.code}" ${sel.has(f.code) ? 'checked' : ''} ${done ? 'disabled' : ''}><span class="fr-av">${esc(f.avatar)}</span><div><b>${esc(f.name)}</b><small>${done ? '✓ Invitación enviada' : dot(f.code)}</small></div></label>` }).join('')}</div>`
            : '<p class="fr-note">Todavía no tienes amigos agregados.</p>'}
          <div class="fr-row">${S.list.length ? `<button type="button" class="fr-btn" id="frSendAll" ${n ? '' : 'disabled'}>${esc(`Enviar invitaciones (${n})`)}</button>` : ''}<button type="button" class="fr-btn alt" id="frToFriends">👥 Mis amigos</button></div>
          <p class="fr-note" id="frInvMsg"></p>`;
        const all = body.querySelector('#frAll'); if (all) all.onchange = () => { sel.clear(); if (all.checked) S.list.forEach(f => { if (!sent[room + f.code]) sel.add(f.code) }); paint() };
        body.querySelectorAll('[data-sel]').forEach(c => c.onchange = () => { c.checked ? sel.add(c.dataset.sel) : sel.delete(c.dataset.sel); const b = body.querySelector('#frSendAll'); if (b) { b.disabled = !sel.size; b.textContent = t('Enviar invitaciones') + ' (' + sel.size + ')' } });
        const tf = body.querySelector('#frToFriends'); if (tf) tf.onclick = () => { a.close(); open() };
        const sb = body.querySelector('#frSendAll'); if (sb) sb.onclick = async () => {
          const codes = [...sel].filter(c => !sent[room + c]); if (!codes.length) return;
          sb.disabled = true; sb.textContent = t('Enviando…');
          const res = await Promise.all(codes.map(async c => ({ c, r: await send(c, { t: 'invite', game, gameName, room, from: me() }, 8000) })));
          const ok = [], bad = [];
          res.forEach(({ c, r }) => { const f = S.list.find(x => x.code === c); if (r === 'sent') { sent[room + c] = 'sent'; status[c] = 'on'; sel.delete(c); ok.push(f ? f.name : c) } else { status[c] = 'off'; bad.push(f ? f.name : c) } });
          paint();
          const m = body.querySelector('#frInvMsg'); if (m) m.textContent = (ok.length ? t('✓ Enviada a') + ' ' + ok.join(', ') + '. ' : '') + (bad.length ? t('Sin conexión:') + ' ' + bad.join(', ') + '.' : '');
          if (ok.length && opts.onSent) opts.onSent(ok);
        };
      };
      paint();
      if (S.list.length) checkAll(S.list.map(f => f.code), c => { if (a.body.isConnected) { const s = a.body.querySelector(`.fr-pick[data-c="${c}"] small`); if (s && !sent[room + c]) s.innerHTML = dot(c) } });
    });
  }

  /* ---------- 0.2.77: aceptar una invitación y la lista de avisos ---------- */
  async function acceptInvite(n) {         // → true si entró; false si la sesión ya terminó
    const r = await probeRoom(n.game, n.room);
    // 0.3.41: si aceptas desde la pestaña Amigos, el aviso flotante de esa misma invitación se quita (antes se quedaba en pantalla)
    const fb = $('#frBanner'); if (fb && fb.dataset.room === norm(n.room)) fb.remove();
    if (r === 'gone') { removeNotif(n.id); return false }
    removeNotif(n.id); delete seenInv[n.room];
    if (!S.list.some(f => f.code === n.code)) { addFriend(n.code, n.name, n.avatar); notifyAdd(n.code) }
    goTo(n.game, n.room);
    return true;
  }
  function showNotifs() {
    if (!window.SudomiScreen) return open();
    SudomiScreen.open('friendsNotifs', '🔔 Avisos', (body, a) => {
      const ended = [];
      const card = n => {
        const who = `<span class="fr-av">${esc(n.avatar || '🙂')}</span>`;
        if (n.type === 'invite') return `<div class="fr-nt" data-id="${esc(n.id)}">${who}<div class="fr-nt-t"><b>${esc(`${n.name} te invita a jugar ${n.gameName}`)}</b></div><div class="fr-nt-b"><button type="button" class="fr-go" data-ac="yes">Aceptar</button><button type="button" data-ac="no">Rechazar</button></div></div>`;
        if (n.type === 'added') return `<div class="fr-nt" data-id="${esc(n.id)}">${who}<div class="fr-nt-t"><b>${esc(`${n.name} te agregó como amigo`)}</b></div><div class="fr-nt-b"><button type="button" data-ac="ok">Entendido</button></div></div>`;
        return `<div class="fr-nt" data-id="${esc(n.id)}">${who}<div class="fr-nt-t"><b>${esc(`${n.name} rechazó tu invitación a ${n.gameName}`)}</b></div><div class="fr-nt-b"><button type="button" data-ac="ok">Entendido</button></div></div>`;
      };
      const paint = () => {
        const list = readN();
        const gone = ended.map((m, i) => `<div class="fr-nt ended"><span class="fr-av">🚪</span><div class="fr-nt-t"><b>${esc(`Sesión terminada: la partida de ${m} ya no está disponible.`)}</b></div><div class="fr-nt-b"><button type="button" data-end="${i}">Entendido</button></div></div>`).join('');
        body.innerHTML = `${gone || list.length ? `<div class="fr-nlist">${gone}${list.map(card).join('')}</div>` : '<p class="fr-note">No tienes avisos.</p>'}<p class="fr-note">Se guardan hasta 5 avisos.</p><div class="fr-row"><button type="button" class="fr-btn alt" id="ntFriends">👥 Mis amigos</button></div>`;
        body.querySelector('#ntFriends').onclick = () => { a.close(); open() };
        body.querySelectorAll('[data-end]').forEach(x => x.onclick = () => { ended.splice(+x.dataset.end, 1); paint() });
        body.querySelectorAll('.fr-nt[data-id]').forEach(el => {
          const n = list.find(x => x.id === el.dataset.id); if (!n) return;
          el.querySelectorAll('[data-ac]').forEach(btn => btn.onclick = async () => {
            const ac = btn.dataset.ac;
            if (ac === 'ok') { removeNotif(n.id); paint(); return }
            if (ac === 'no') {
              removeNotif(n.id); delete seenInv[n.room]; paint();
              send(n.code, { t: 'invite-no', game: n.game, gameName: n.gameName, room: n.room, from: me() }, 7000);   // así la otra persona puede invitar otra vez
              return;
            }
            el.querySelectorAll('button').forEach(x => x.disabled = true); btn.textContent = t('Comprobando…');
            const ok = await acceptInvite(n);
            if (ok) a.close(); else { ended.unshift(n.name); paint() }
          });
        });
      };
      paint();
    });
  }

  /* ---------- 0.2.76: alguien se desconectó de TU partida: barra para invitarlo de nuevo ---------- */
  // info: {game, gameName, room, names:[...]}; sin nombres (o sin info) la barra se quita.
  function roomUrl(game, room) {
    let net = ''; try { if (sessionStorage.getItem('sudomi-net') === 'online') net = '&net=online' } catch (_) {}
    return `${base()}?game=${encodeURIComponent(game)}&room=${norm(room)}${net}`;
  }
  function awayBar(info) {
    let b = $('#frAwayBar');
    if (!info || !info.names || !info.names.length || !info.room) { if (b) b.remove(); return }
    const key = info.game + ':' + info.room + ':' + info.names.join('|');
    if (b && b.dataset.k === key) return;
    if (!b) { b = document.createElement('div'); b.id = 'frAwayBar'; b.className = 'fr-awaybar'; b.setAttribute('role', 'status'); document.body.appendChild(b) }
    b.dataset.k = key;
    b.innerHTML = `<span>${esc('📴 ' + info.names.join(', ') + ' sin conexión')}</span><div><button type="button" class="fr-go" id="frAwayInv">Invitar de nuevo</button><button type="button" id="frAwayShare">📤 Compartir enlace</button></div>`;
    b.querySelector('#frAwayInv').onclick = () => invite({ game: info.game, gameName: info.gameName || '', room: info.room, url: roomUrl(info.game, info.room), again: true });
    b.querySelector('#frAwayShare').onclick = () => {
      const url = roomUrl(info.game, info.room), text = t('Juega conmigo en SUDOMI');
      if (navigator.share) navigator.share({ title: 'SUDOMI', text, url }).catch(() => {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast2('Enlace copiado. Pégalo en tu chat.')).catch(() => toast2(url));
      else toast2(url);
    };
  }
  function toast2(text) {
    let x = $('#frToast2'); if (x) x.remove();
    x = document.createElement('div'); x.id = 'frToast2'; x.className = 'fr-banner fr-small'; x.textContent = t(text);
    document.body.appendChild(x); setTimeout(() => { x.classList.add('out'); setTimeout(() => x.remove(), 300) }, 3500);
  }

  /* ---------- partida en curso (volver a la sala) ---------- */
  // info: {game, gameName, room, role:'host'|'guest'}
  function track(info) { try { localStorage.setItem(ROOM_KEY, JSON.stringify({ ...info, room: norm(info.room), ts: Date.now() })) } catch (_) {} }
  function untrack() { try { localStorage.removeItem(ROOM_KEY) } catch (_) {} const b = $('#frRoomBanner'); if (b) b.remove() }
  function activeRoom() { try { const v = JSON.parse(localStorage.getItem(ROOM_KEY)); return v && v.room && Date.now() - v.ts < MAX_AGE ? v : null } catch (_) { return null } }
  function roomBanner() {
    let v = activeRoom(), sv = null;
    if (!v && window.SudomiSavedGame) sv = SudomiSavedGame();     // 0.2.76: también las partidas de 2 jugadores (Ajedrez, Damas…) guardadas en este teléfono
    if (!v && !sv) return;
    if (!v) v = sv;
    if ($('#frRoomBanner')) return;
    const b = document.createElement('div'); b.id = 'frRoomBanner'; b.className = 'fr-banner';
    b.innerHTML = `<div class="fr-b-who"><span>🎮</span><div>${esc(`Tienes una partida en curso: ${v.gameName || v.game}`)}</div></div><div class="fr-b-btns"><button type="button" class="fr-go" id="frBack">Volver a la partida</button><button type="button" id="frDrop">Descartar</button></div>`;
    document.body.appendChild(b);
    b.querySelector('#frBack').onclick = () => { b.remove(); if (sv) { document.querySelectorAll('.ach-screen,.tut').forEach(x => x.classList.add('hidden')); document.body.classList.remove('tut-open'); SudomiResumeSaved() } else goTo(v.game, v.room, { role: v.role, back: true }) };
    b.querySelector('#frDrop').onclick = () => { if (sv && window.SudomiDropSaved) SudomiDropSaved(); untrack() };
  }

  /* ---------- agregar por enlace (?friend=CÓDIGO&n=NOMBRE) ---------- */
  function handleLink() {
    let q; try { q = new URLSearchParams(location.search) } catch (_) { return }
    const code = norm(q.get('friend')); if (!code) return;
    const name = clean(q.get('n'));
    try { const u = new URL(location.href); ['friend', 'n'].forEach(k => u.searchParams.delete(k)); history.replaceState(null, '', u.pathname + u.search + u.hash) } catch (_) {}
    if (code.length !== 8 || code === S.id || S.list.some(f => f.code === code)) return;
    setTimeout(() => {
      const w = document.createElement('div'); w.className = 'fr-banner'; w.id = 'frLinkBanner';
      w.innerHTML = `<div class="fr-b-who"><span>👥</span><div>${esc(`¿Agregar a ${name || pretty(code)} como amigo?`)}</div></div><div class="fr-b-btns"><button type="button" class="fr-go" id="frYes">Agregar</button><button type="button" id="frNo2">No</button></div>`;
      document.body.appendChild(w);
      w.querySelector('#frYes').onclick = () => { addFriend(code, name, ''); notifyAdd(code); w.remove(); open() };
      w.querySelector('#frNo2').onclick = () => w.remove();
    }, 1200);
  }

  /* ---------- arranque ---------- */
  function addMenuItem() {
    const dd = $('#homeDropdown'); if (!dd || $('#openFriends')) return;
    const b = document.createElement('button'); b.id = 'openFriends'; b.type = 'button'; b.className = 'dropdown-option';
    b.innerHTML = '<span>👥</span><strong>Amigos</strong><small>Invita desde el juego</small>';
    b.onclick = () => { dd.classList.add('hidden'); const tg = $('#homeMenuBtn'); if (tg) tg.setAttribute('aria-expanded', 'false'); open() };
    const ref = $('#openProfileScreen'); if (ref && ref.nextSibling) dd.insertBefore(b, ref.nextSibling); else dd.appendChild(b);
  }
  /* ---------- botón «Amigos» en la portada, al lado contrario del saludo ---------- */
  function homeBtn() {
    const copy = $('.hero-copy'); if (!copy) return;
    let row = $('#heroRow');
    if (!row) { row = document.createElement('div'); row.id = 'heroRow'; row.className = 'hero-row'; const h1 = copy.querySelector('h1'); copy.insertBefore(row, h1 || copy.firstChild) }
    const hello = $('#profHello'); if (hello && hello.parentNode !== row) row.insertBefore(hello, row.firstChild);
    let b = $('#homeFriends');
    if (!b) { b = document.createElement('button'); b.id = 'homeFriends'; b.type = 'button'; b.className = 'home-friends'; b.onclick = () => (readN().length ? showNotifs() : open()); row.appendChild(b) }
    const n = S.list.filter(f => status[f.code] === 'on').length, checked = S.list.some(f => status[f.code] === 'on' || status[f.code] === 'off');
    const sub = !S.list.length ? 'Agrega amigos' : !checked ? 'Comprobando…' : n + ' en línea';
    const nn = readN().length;
    b.innerHTML = `<span>👥</span><div><b>Amigos</b><small>${n ? '<i class="fr-dot on"></i>' : ''}${sub}</small></div>${nn ? `<em class="fr-badge" aria-label="${nn} avisos">${nn}</em>` : ''}`;
    b.classList.toggle('has-notif', nn > 0);
  }
  let homeTimer = 0;
  function homePoll() {
    homeBtn();
    if (!S.on || !S.list.length || document.hidden || checking) return;
    checking = true; checkAll(S.list.map(f => f.code), homeBtn).catch(() => {}).then(() => { checking = false; homeBtn() });
  }
  function startHome() {
    homeBtn(); [400, 1500, 4000].forEach(ms => setTimeout(homeBtn, ms));
    setTimeout(homePoll, 3000); clearInterval(homeTimer); homeTimer = setInterval(homePoll, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) homePoll() });
  }
  function boot() {
    startHome(); addMenuItem(); handleLink(); fillPanels();
    if (S.on) setTimeout(listen, 1500);
    if (S.pending.length) setTimeout(retryPending, 5000);
    setTimeout(roomBanner, 1800);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('sudomi-profile', () => { homeBtn(); if (S.on) listen() });
  window.SudomiFriends = { open, invite, awayBar, notifs: readN, showNotifs, track, untrack, activeRoom, list: () => S.list.slice(), myCode: () => S.id, _state: () => S, _send: send, _listen: listen, _retry: retryPending };
})();
