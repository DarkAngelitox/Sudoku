/* SUDOMI 0.2.72 — SALA DE ESPERA ÚNICA para todos los juegos (window.SudomiLobby).
 * Misma pantalla para DOS, STOP, Dominópolis, Dominó y los juegos de 2 jugadores:
 *   1) interruptores QR / Wi‑Fi local (solo juegos de 2 jugadores)   2) código de la sala + Copiar + Compartir enlace
 *   3) lista de espacios (tú, amigos, espacios libres con ✕ Quitar o 🤖 Poner IA, IA)   4) 👥 Invitar amigos (a varios a la vez)
 *   5) controles propios del juego (o.extra)   6) botón Empezar (el anfitrión)
 * Este archivo solo dibuja y avisa; las reglas y la red las siguen llevando los juegos.
 *
 * o = {
 *   game, gameName, code, url,                 código de 8 letras (null mientras se crea) y enlace para compartir
 *   host: bool, fixed: bool,                   fixed = tamaño fijo → el espacio libre ofrece «Poner IA» en vez de «Quitar»
 *   seats: [{state:'me'|'human'|'open'|'ai'|'away', name, avatar, sub}],
 *   extra: html, bindExtra(root),
 *   startLabel, canStart, onStart(),
 *   onRemove(i), onAI(i),
 *   switches: {mode:'online'|'qr'|'lan', qr:bool, lan:bool, onSwitch(kind)},
 *   status: texto, hint: texto
 * } */
(() => {
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pretty = c => c && c.length === 8 ? c.slice(0, 4) + '-' + c.slice(4) : c || '';
  const t = s => window.SudomiI18n ? SudomiI18n.t(s) : s;

  const SW_HELP = {
    online: 'Online: juegas por internet. Crea la sala, comparte el código y tus amigos entran desde donde estén.',
    qr: 'Sin internet (QR): los dos teléfonos deben estar en el mismo Wi‑Fi o en el hotspot de uno de ellos. Uno toca «Crear partida» y el otro «Unirme»; se emparejan escaneando dos códigos QR con la cámara.',
    lan: 'Wi‑Fi local: los dos teléfonos deben estar conectados a la misma red Wi‑Fi y abrir esta app desde la dirección local de la computadora.'
  };

  function switchesHTML(s) {
    if (!s) return '';
    const one = (k, label, ok) => `<label class="lb-sw ${s.mode === k ? 'on' : ''} ${ok ? '' : 'off'}"><input type="checkbox" role="switch" data-sw="${k}" ${s.mode === k ? 'checked' : ''} ${ok ? '' : 'disabled'}><i></i><span>${label}</span></label>`;
    return `<div class="lb-switches">${one('qr', '📷 Sin internet (QR)', s.qr)}${one('lan', '📶 Wi‑Fi local', s.lan)}</div><p class="lb-swhelp">${esc(SW_HELP[s.mode] || SW_HELP.online)}</p>`;
  }
  function seatRow(s, i, o) {
    const n = i + 1, host = o.host;
    let act = '';
    if (s.state === 'open' && host && !o.autoAI) act = o.fixed ? `<button type="button" class="lb-btn small" data-lb="ai" data-i="${i}">🤖 Poner IA</button>` : (o.seats.length > 2 ? `<button type="button" class="lb-btn small alt" data-lb="rm" data-i="${i}">✕ Quitar</button>` : '');
    const av = s.state === 'open' ? '⏳' : esc(s.avatar || '🙂');
    const name = s.state === 'open' ? 'Espacio libre' : esc(s.name);
    const sub = s.sub != null ? s.sub : s.state === 'open' ? (o.fixed ? 'Un amigo, o la IA si lo prefieres' : 'Si nadie entra, juega la IA') : s.state === 'ai' ? 'IA' : s.state === 'away' ? 'Sin conexión' : s.state === 'me' ? 'Tú' : 'Listo';
    return `<li class="lb-seat ${s.state}"><i class="lb-n">${n}</i><span class="lb-av">${av}</span><div><b>${name}</b><small>${esc(sub)}</small></div>${act}</li>`;
  }
  function html(o) {
    const code = o.code
      ? `<div class="lb-code"><small>CÓDIGO DE LA SALA</small><b>${esc(pretty(o.code))}</b><div class="lb-codebtns"><button type="button" class="lb-btn" data-lb="copy">📋 Copiar</button><button type="button" class="lb-btn alt" data-lb="share">📤 Compartir enlace</button></div></div>`
      : `<div class="lb-code"><small>CÓDIGO DE LA SALA</small><b class="lb-wait">Creando sala…</b></div>`;
    const n = o.seats.filter(s => s.state !== 'open').length;
    return `<div class="lb">
      ${switchesHTML(o.switches)}
      ${code}
      <div class="lb-head"><b>${esc(`Jugadores (${n} de ${o.seats.length})`)}</b></div>
      <ol class="lb-seats">${o.seats.map((s, i) => seatRow(s, i, o)).join('')}</ol>
      ${o.code ? '<button type="button" class="lb-invite" data-lb="invite">👥 Invitar amigos</button>' : ''}
      ${o.extra ? `<div class="lb-extra">${o.extra}</div>` : ''}
      ${o.hint ? `<p class="lb-note">${esc(o.hint)}</p>` : ''}
      ${o.host && o.onStart ? `<button type="button" class="lb-start" data-lb="start" ${o.canStart === false ? 'disabled' : ''}>${esc(o.startLabel || '▶ Empezar')}</button>` : (!o.host && o.onStart !== null ? '<p class="lb-note">Esperando que el anfitrión empiece la partida…</p>' : '')}
      <p class="lb-status" id="lbStatus">${o.status ? esc(o.status) : ''}</p>
    </div>`;
  }
  function say(root, text) { const e = root.querySelector('#lbStatus'); if (e) e.textContent = t(text) }
  function bind(root, o) {
    root.querySelectorAll('[data-lb]').forEach(b => b.onclick = async () => {
      const k = b.dataset.lb, i = +b.dataset.i;
      if (k === 'copy') { try { await navigator.clipboard.writeText(pretty(o.code)); say(root, 'Código copiado.') } catch (_) { say(root, pretty(o.code)) } }
      else if (k === 'share') {
        const url = o.url || '', text = (o.gameName ? t('Juega ' + o.gameName + ' conmigo en SUDOMI') : t('Juega conmigo en SUDOMI'));
        if (navigator.share) navigator.share({ title: 'SUDOMI', text, url }).catch(() => {});
        else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => say(root, 'Enlace copiado. Pégalo en tu chat.')).catch(() => say(root, url));
        else say(root, url);
      }
      else if (k === 'invite') { if (window.SudomiFriends) SudomiFriends.invite({ game: o.game, gameName: o.gameName, room: o.code, url: o.url }) }
      else if (k === 'rm') { if (o.onRemove) o.onRemove(i) }
      else if (k === 'ai') { if (o.onAI) o.onAI(i) }
      else if (k === 'start') { if (o.onStart) o.onStart() }
    });
    const s = o.switches;
    if (s) root.querySelectorAll('[data-sw]').forEach(c => c.onchange = () => { if (s.onSwitch) s.onSwitch(c.checked ? c.dataset.sw : 'online') });
    if (o.bindExtra) o.bindExtra(root);
  }
  function render(root, o) { if (!root) return; root.innerHTML = html(o); bind(root, o) }
  window.SudomiLobby = { render, html, bind, switchesHTML };
})();
