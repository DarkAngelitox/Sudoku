/* SUDOMI 0.2.53 — "Perfil": the player's card (avatar, name, level, title, XP) with the main numbers, plus buttons to edit it or share it.
 * Reads the same stores as the rest of the app (xp, achievements, statistics, daily calendar, score records); the name and avatar come from
 * js/profile.js, which also provides the editor. Nothing is sent anywhere: "Compartir" only builds a text summary for the share sheet. */
(()=>{
 const S=window.SudomiScreen;if(!S)return;
 const fmt=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,',');
 const rd=k=>{try{return JSON.parse(localStorage.getItem(k))||{}}catch(_){return {}}};
 function numbers(){
  const ach=window.SudomiAch?SudomiAch.stats:{wins:0},unl=window.SudomiAch?Object.keys(SudomiAch.unlocked()).filter(k=>k!=='king').length:0,total=window.SudomiAch?SudomiAch.list.length:0;
  const best=rd('sudomi-score-best'),top=Math.max(0,...Object.values(best).map(Number));
  const st=window.SudomiStats?SudomiStats.compute():{played:0,time:0,rate:0};
  return {wins:ach.wins||0,played:st.played,rate:st.rate,top,streak:window.SudomiDaily?SudomiDaily.bestStreak():0,ach:unl,achTotal:total,king:window.SudomiAch&&SudomiAch.king,time:st.time||0};
 }
 const dur=s=>{const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?`${h} h ${m} min`:`${m} min`};
 function summary(p,i,n){return `Soy ${p.name} ${p.avatar} en SUDOMI: nivel ${i.L} (${i.title}), ${n.wins} victorias, mejor puntuación ${fmt(n.top)} y ${n.ach} logros. ¡Juega conmigo!`}
 function open(){
  const P=window.SudomiProfile;
  // 0.3.1: Perfil es una pestaña de la barra de abajo y aquí está lo que antes iba en el menú; por eso se abre aunque todavía no haya perfil
  const api=S.open('profileScreen','👤 Perfil',(body,api)=>{
   const p=P.get()||{name:'Sin perfil',avatar:'👤',none:true},i=window.SudomiXP?SudomiXP.info:{L:1,title:'Novato',into:0,span:100,xp:0},n=numbers(),pct=Math.round(i.into/i.span*100);
   body.innerHTML=`<div class="pf-card"><div class="pf-av">${p.avatar}</div><div class="pf-main"><b>${String(p.name).replace(/[<>&]/g,'')}</b><span>Nivel ${i.L} · ${i.title}</span><div class="lv-bar"><i style="width:${pct}%"></i></div><small>${fmt(i.into)} / ${fmt(i.span)} XP · ${fmt(i.xp)} XP en total</small></div></div>
   <div class="st-cards"><div><b>${fmt(n.wins)}</b><small>Victorias</small></div><div><b>${n.rate}%</b><small>% de victorias</small></div><div><b>${fmt(n.top)}</b><small>Mejor puntuación</small></div><div><b>${n.streak}</b><small>Mejor racha</small></div><div><b>${n.ach}/${n.achTotal}</b><small>Logros</small></div><div><b>${n.time?dur(n.time):'—'}</b><small>Tiempo jugado</small></div></div>
   ${n.king?'<p class="pf-king">👑 Eres el <b>Rey del Sudomi</b></p>':''}
   <div class="tc-btns"><button type="button" id="pfEdit" class="main">${p.none?'👤 Crear mi perfil':'✏️ Editar perfil'}</button>${p.none?'':'<button type="button" id="pfShare">📤 Compartir mi perfil</button>'}</div>
   <div class="tc-btns small"><button type="button" id="pfAch">🏆 Mis logros</button><button type="button" id="pfStats">📊 Mis estadísticas</button></div>
   <p class="pf-more-h">Más de SUDOMI</p><div class="pf-more">${more().map(([id,ic,n,d])=>`<button type="button" data-go="${id}"><span>${ic}</span><b>${n}</b><small>${d}</small></button>`).join('')}</div>
   <p class="st-note" id="pfMsg">Tu nombre y avatar son lo que ven tus amigos en las salas online.</p>`;
   body.querySelector('#pfEdit').onclick=()=>{if(p.none)P.ensure(()=>api.redraw());else P.edit()};
   body.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>{S.close('profileScreen');const t=document.getElementById(b.dataset.go);if(t)t.click()});
   const sh=body.querySelector('#pfShare');if(sh)sh.onclick=()=>{const text=summary(p,i,n),url=location.origin&&location.origin!=='null'?location.origin+location.pathname:'';
    if(navigator.share)navigator.share({title:'SUDOMI',text,url}).catch(()=>{});else if(navigator.clipboard)navigator.clipboard.writeText(text+(url?' '+url:'')).then(()=>{body.querySelector('#pfMsg').textContent='Resumen copiado. Pégalo en tu chat.'}).catch(()=>{})};
   body.querySelector('#pfAch').onclick=()=>{S.close('profileScreen');if(window.SudomiAch)SudomiAch.open()};
   body.querySelector('#pfStats').onclick=()=>{S.close('profileScreen');if(window.SudomiStats)SudomiStats.open()};
  });
  cur=api;
 }
 let cur=null;
 // lo que estaba en el menú de hamburguesa de la portada: cada botón pulsa el botón original (sigue en la página, escondido)
 // se leen del propio menú, así entra también lo que otros archivos le añaden (Tutorial, Instalar SUDOMI). Fuera lo que ya es pestaña o ya está arriba
 const SKIP=['openProfileScreen','openMiniGames','openAchievements'];
 const txt=(b,s)=>{const x=b.querySelector(s);return x?x.textContent.replace(/[<>&]/g,''):''};
 const more=()=>[...document.querySelectorAll('#homeDropdown .dropdown-option')].filter(b=>b.id&&!SKIP.includes(b.id)&&!/friend/i.test(b.id)).map(b=>[b.id,txt(b,'span'),txt(b,'strong'),b.id==='openRankings'?'Top 15':txt(b,'small')]);
 window.addEventListener('sudomi-profile',()=>{const el=document.getElementById('profileScreen');if(cur&&el&&!el.classList.contains('hidden'))cur.redraw()});
 function boot(){const b=document.getElementById('openProfileScreen'),dd=document.getElementById('homeDropdown');if(b)b.onclick=()=>{dd.classList.add('hidden');const t=document.getElementById('homeMenuBtn');if(t)t.setAttribute('aria-expanded','false');open()}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
 window.SudomiProfileScreen={open};
})();
