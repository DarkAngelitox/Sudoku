/* SUDOMI 0.2.71 — AMIGOS: lista de amigos e invitaciones desde dentro del juego (window.SudomiFriends).
 *
 * SUDOMI no tiene servidor propio ni cuentas, así que esto funciona así:
 *  · Cada persona tiene un CÓDIGO DE AMIGO (8 letras/números al azar, guardado en este dispositivo: localStorage 'sudomi-friends').
 *  · Si el usuario activa "Aparecer en línea", la app abre un buzón en el servicio de salas público (PeerJS) con el id
 *    "sudomi-friend-<código>" mientras el juego esté abierto. Ahí llegan las invitaciones y las comprobaciones de "¿estás en línea?".
 *  · Agregar un amigo = escribir su código (o abrir su enlace). Invitar = conectarse a su buzón y enviarle {t:'invite',game,room};
 *    si su juego está abierto, le sale un aviso con "Unirme". Si está cerrado, la invitación NO llega (no hay notificaciones push).
 *  · Reutiliza window.SudomiParty (party-net.js) y el módulo de pantallas SudomiScreen. Nada de esto toca el Sudoku. */
(() => {
  const KEY = 'sudomi-friends', ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clean = n => String(n || '').replace(/[<>&"']/g, '').replace(/\s+/g, ' ').trim().slice(0, 14);
  const norm = c => String(c || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const pretty = c => c && c.length === 8 ? c.slice(0, 4) + '-' + c.slice(4) : c || '';
  const newId = () => { const a = new Uint32Array(8); (window.crypto || window.msCrypto).getRandomValues(a); return Array.from(a).map(x => ALPHA[x % ALPHA.length]).join('') };
  const P = () => window.SudomiProfile;
  const play = n => { try { window.SudomiSound && SudomiSound.play(n) } catch (_) {} };

  function read() {
    try { const v = JSON.parse(localStorage.getItem(KEY)); if (v && norm(v.id).length === 8) return { on: false, list: [], blocked: [], ...v, id: norm(v.id) } } catch (_) {}
    return { id: newId(), on: false, list: [], blocked: [] };
  }
  let S = read();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)) } catch (_) {} };
  save();
  const me = () => ({ code: S.id, name: clean(P() && P().name && P().name()), avatar: (P() && P().avatar && P().avatar()) || '' });
  const hasProfile = () => !!(P() && P().get && P().get());
  const status = {};                       // código → 'on' | 'off' | '…'
  let inbox = null, listening = false, lastErr = '';

  /* ---------- lista ---------- */
  function addFriend(code, name, avatar) {
    code = norm(code);
    if (code.length !== 8 || code === S.id) return false;
    const f = S.list.find(x => x.code === code);
    if (f) { if (name) f.name = clean(name) || f.name; if (avatar) f.avatar = avatar; save(); return true }
    S.blocked = S.blocked.filter(c => c !== code);
    S.list.push({ code, name: clean(name) || 'Amigo', avatar: avatar || '🙂', added: Date.now() }); save(); return true;
  }
  function removeFriend(code) { S.list = S.list.filter(f => f.code !== code); delete status[code]; save() }
  function updateFrom(m) { if (!m) return; const c = norm(m.code), f = S.list.find(x => x.code === c); if (f) { const n = clean(m.name); if (n) f.name = n; if (m.avatar) f.avatar = String(m.avatar).slice(0, 4); save() } }

  /* ---------- buzón (recibir) ---------- */
  async function listen() {
    if (listening || inbox || !S.on || !window.SudomiParty || !hasProfile()) return;
    listening = true;
    try { inbox = await SudomiParty.host('friend', onEvent, S.id); lastErr = '' }
    catch (e) { inbox = null; lastErr = e && e.message || 'No se pudo activar.' }
    listening = false;
    if ($('#friendsScreen') && !$('#friendsScreen').classList.contains('hidden')) draw();
  }
  function stopListening() { if (inbox) { try { inbox.close() } catch (_) {} inbox = null } }
  function onEvent(e) {
    if (e.type !== 'msg') return;
    const d = e.data || {};
    if (d.t === 'hello') { if (inbox) inbox.send(e.id, { t: 'hi', me: me() }); updateFrom(d.me); return }
    if (d.t === 'invite') { if (inbox) inbox.send(e.id, { t: 'ack' }); gotInvite(d) }
  }
  const seenInv = {};
  function gotInvite(d) {
    const from = d.from || {}, code = norm(from.code), name = clean(from.name), room = norm(d.room), game = String(d.game || '').toLowerCase();
    if (!name || code.length !== 8 || room.length !== 8 || !/^[a-z0-9]{2,20}$/.test(game)) return;
    if (S.blocked.includes(code)) return;
    if (seenInv[room] && Date.now() - seenInv[room] < 60000) return; seenInv[room] = Date.now();
    updateFrom(from);
    banner({ code, name, avatar: String(from.avatar || '🙂').slice(0, 4), game, room, gameName: clean(d.gameName) || 'un juego', known: S.list.some(f => f.code === code) });
  }
  function banner(inv) {
    let b = $('#frBanner'); if (b) b.remove();
    b = document.createElement('div'); b.id = 'frBanner'; b.className = 'fr-banner'; b.setAttribute('role', 'alert');
    b.innerHTML = `<div class="fr-b-who"><span>${esc(inv.avatar)}</span><div>${esc(`${inv.name} te invita a jugar ${inv.gameName}`)}</div></div>
      <div class="fr-b-btns"><button type="button" class="fr-go" id="frGo">Unirme</button><button type="button" id="frNo">Ahora no</button>${inv.known ? '' : '<button type="button" id="frAdd">+ Amigo</button>'}<button type="button" id="frBlock" aria-label="Bloquear">🚫</button></div>`;
    document.body.appendChild(b); play('bonus');
    const close = () => { b.classList.add('out'); setTimeout(() => b.remove(), 300) };
    b.querySelector('#frGo').onclick = () => { close(); if (!inv.known) addFriend(inv.code, inv.name, inv.avatar); document.querySelectorAll('.ach-screen,.tut').forEach(x => x.classList.add('hidden')); document.body.classList.remove('tut-open'); if (window.SudomiJoinInvite) SudomiJoinInvite(inv.game, inv.room) };
    b.querySelector('#frNo').onclick = close;
    const a = b.querySelector('#frAdd'); if (a) a.onclick = () => { addFriend(inv.code, inv.name, inv.avatar); a.remove() };
    b.querySelector('#frBlock').onclick = () => { if (!S.blocked.includes(inv.code)) S.blocked.push(inv.code); removeFriend(inv.code); save(); close() };
    setTimeout(() => { if (b.isConnected) close() }, 45000);
  }

  /* ---------- enviar ---------- */
  function send(code, msg, ms) {            // → 'sent' | 'online' | 'offline' | 'error'
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
  async function checkAll(codes, onEach) {  // comprueba quién está en línea (3 a la vez)
    const q = codes.slice();
    const worker = async () => { while (q.length) { const c = q.shift(); status[c] = '…'; if (onEach) onEach(c); const r = await send(c, { t: 'hello', me: me() }, 6000); status[c] = r === 'online' ? 'on' : 'off'; if (onEach) onEach(c) } };
    await Promise.all([worker(), worker(), worker()]);
  }
  const base = () => location.origin && location.origin !== 'null' ? location.origin + location.pathname : location.href.split(/[?#]/)[0];
  const myLink = () => `${base()}?friend=${S.id}&n=${encodeURIComponent(me().name)}`;

  /* ---------- pantalla "Amigos" ---------- */
  let api = null;
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
      addFriend(c, '', ''); draw(); checkAll([c], () => draw());
    };
    const ck = $('#frCheck'); if (ck) ck.onclick = () => checkAll(S.list.map(f => f.code), () => draw());
    body.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if (confirm(window.SudomiI18n ? SudomiI18n.t('¿Quitar a este amigo?') : '¿Quitar a este amigo?')) { removeFriend(b.dataset.del); draw() } });
    const ub = $('#frUnblock'); if (ub) ub.onclick = () => { S.blocked = []; save(); draw() };
  }
  function msg(t) { const m = $('#frMsg'); if (m) m.textContent = t }
  function shareMine() {
    const url = myLink(), text = 'Agrégame como amigo en SUDOMI';
    if (navigator.share) navigator.share({ title: 'SUDOMI', text: window.SudomiI18n ? SudomiI18n.t(text) : text, url }).catch(() => {});
    else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => msg('Enlace copiado. Pégalo en tu chat.')).catch(() => msg(url));
    else msg(url);
  }
  function open() {
    if (!window.SudomiScreen) return;
    api = SudomiScreen.open('friendsScreen', '👥 Amigos', (body, a) => { api = a; draw() });
    if (S.on) listen();
    if (S.list.length) checkAll(S.list.map(f => f.code), () => draw());
  }

  /* ---------- invitar desde un juego ---------- */
  // opts: {game:'dos', gameName:'DOS', room:'ABCD2345', url?}
  function invite(opts) {
    if (!window.SudomiScreen) return;
    const room = norm(opts.room), game = opts.game;
    const sa = SudomiScreen.open('friendsInvite', '👥 Invitar amigos', (body, a) => {
      body.innerHTML = `<p class="fr-note">${esc(`Sala ${pretty(room)} · ${opts.gameName || ''}. Tu amigo recibe el aviso solo si tiene SUDOMI abierto y "Aparecer en línea" activado.`)}</p>
        <div class="fr-list">${S.list.length ? S.list.map(f => `<div class="fr-friend" data-c="${f.code}"><span class="fr-av">${esc(f.avatar)}</span><div><b>${esc(f.name)}</b><small>${dot(f.code)}</small></div><button type="button" class="fr-btn" data-inv="${f.code}">Invitar</button></div>`).join('') : '<p class="fr-note">Todavía no tienes amigos agregados.</p>'}</div>
        <div class="fr-row"><button type="button" class="fr-btn alt" id="frToFriends">👥 Mis amigos</button>${opts.url ? '<button type="button" class="fr-btn alt" id="frLink">📤 Compartir enlace</button>' : ''}</div><p class="fr-note" id="frInvMsg"></p>`;
      body.querySelectorAll('[data-inv]').forEach(b => b.onclick = async () => {
        const c = b.dataset.inv; b.disabled = true; b.textContent = 'Enviando…';
        const r = await send(c, { t: 'invite', game, gameName: opts.gameName, room, from: me() }, 8000);
        b.textContent = r === 'sent' ? '✓ Enviada' : 'Sin conexión'; b.disabled = r === 'sent'; status[c] = r === 'sent' ? 'on' : 'off';
        if (r !== 'sent') setTimeout(() => { b.textContent = 'Invitar'; b.disabled = false }, 2500);
      });
      const tf = body.querySelector('#frToFriends'); if (tf) tf.onclick = () => { a.close(); open() };
      const lk = body.querySelector('#frLink'); if (lk) lk.onclick = () => { if (navigator.share) navigator.share({ title: 'SUDOMI', text: opts.gameName ? 'Juega ' + opts.gameName + ' conmigo en SUDOMI' : 'Juega conmigo en SUDOMI', url: opts.url }).catch(() => {}); else if (navigator.clipboard) navigator.clipboard.writeText(opts.url).then(() => { const m = body.querySelector('#frInvMsg'); if (m) m.textContent = 'Enlace copiado.' }) };
    });
    if (S.list.length) checkAll(S.list.map(f => f.code), c => { if (sa && sa.body.isConnected) { const row = sa.body.querySelector(`.fr-friend[data-c="${c}"] small`); if (row) row.innerHTML = dot(c) } });
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
      w.querySelector('#frYes').onclick = () => { addFriend(code, name, ''); w.remove(); open() };
      w.querySelector('#frNo2').onclick = () => w.remove();
    }, 1200);
  }

  /* ---------- arranque ---------- */
  function addMenuItem() {
    const dd = $('#homeDropdown'); if (!dd || $('#openFriends')) return;
    const b = document.createElement('button'); b.id = 'openFriends'; b.type = 'button'; b.className = 'dropdown-option';
    b.innerHTML = '<span>👥</span><strong>Amigos</strong><small>Invita desde el juego</small>';
    b.onclick = () => { dd.classList.add('hidden'); const t = $('#homeMenuBtn'); if (t) t.setAttribute('aria-expanded', 'false'); open() };
    const ref = $('#openProfileScreen'); if (ref && ref.nextSibling) dd.insertBefore(b, ref.nextSibling); else dd.appendChild(b);
  }
  function boot() { addMenuItem(); handleLink(); if (S.on) setTimeout(listen, 1500) }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  window.addEventListener('sudomi-profile', () => { if (S.on) listen() });
  window.SudomiFriends = { open, invite, list: () => S.list.slice(), myCode: () => S.id, _state: () => S, _send: send, _listen: listen };
})();
