/* SUDOMI 0.3.98 (roadmap, Fase 6) — RELEVO DEL ANFITRIÓN en las salas de DOS, STOP, Dominó y Dominópolis (window.SudomiHandoff).
 * Si el anfitrión se va, la partida sigue: el primer invitado conectado (el SUCESOR) abre la sala con el MISMO código y sigue llevando la partida;
 *   los demás teléfonos, que de por sí reintentan conectarse a ese código, vuelven solos a sus asientos. El asiento del que se fue lo juega la máquina.
 * Cómo: el anfitrión le va mandando al sucesor una copia completa de la partida ({t:'mig'}, cada game la arma a su manera; como mucho cada 2 s).
 *   · Si el anfitrión sale con «Salir», manda {t:'handoff'} al sucesor y cierra la sala SIN avisar «sala cerrada» (party-net close(true)).
 *   · Si se le cae la conexión, el sucesor espera AWAY_MS y, si no vuelve, se queda con la sala.
 * Este archivo solo trae lo común; cada juego decide qué copia manda y cómo la retoma. */
(()=>{
 const AWAY_MS=15000,EVERY=3000,TRIES=40;
 // a quién le toca: el primer asiento de persona conectada que no sea el anfitrión
 function successor(list){return list.findIndex(x=>x&&x.id&&x.id!=='host'&&(x.kind==='human'||x.human)&&!x.away&&!x.gone)}
 // abre la sala con el mismo código; reintenta mientras el servicio no suelte el código viejo. stop() → true para dejar de intentar
 async function takeover(game,code,handler,stop){
  for(let k=0;k<TRIES;k++){
   if(stop&&stop())return null;
   try{const room=await SudomiParty.host(game,handler,code);if(stop&&stop()){room.close(true);return null}return room}
   catch(_){await new Promise(r=>setTimeout(r,EVERY))}
  }
  return null;
 }
 // vigila la conexión de un invitado: si el anfitrión desaparece AWAY_MS (o avisa que se va), llama a go() una sola vez
 function watcher(go){
  let t=0,done=false;const fire=()=>{if(done)return;done=true;clearTimeout(t);go()};
  return {away(){if(!t&&!done)t=setTimeout(fire,AWAY_MS)},back(){clearTimeout(t);t=0},handoff:fire,reset(){clearTimeout(t);t=0;done=false},stop(){clearTimeout(t);t=0;done=true}};
 }
 // el anfitrión no manda la copia más de una vez cada 2 s (salvo force)
 function throttle(ms){let at=0;return force=>{if(force||Date.now()-at>=ms){at=Date.now();return true}return false}}
 window.SudomiHandoff={successor,takeover,watcher,throttle,AWAY_MS};
})();
