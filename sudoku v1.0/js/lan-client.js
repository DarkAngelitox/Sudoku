// Same-Wi-Fi relay client. The companion lan-server.js runs on the host PC.
//
// 0.2.13: the session is remembered in sessionStorage so a refreshed page (or a
// phone that slept) can reconnect to the same room instead of starting over.
(()=>{
 const KEY='sudomi-lan-session';
 let session=null,handlers=[],cursor=0,polling=false,backlog=[];

 const store={
  save(){try{session?localStorage.setItem(KEY,JSON.stringify({session,cursor,at:Date.now()})):localStorage.removeItem(KEY)}catch(_){}},
  read(){try{const v=JSON.parse(localStorage.getItem(KEY));return v&&v.session&&Date.now()-v.at<6*3600*1000?v:null}catch(_){return null}}
 };

 const api=async(path,options={})=>{
  const r=await fetch(path,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});
  const data=await r.json();
  if(!r.ok){const err=new Error(data.error||'No se pudo conectar');err.status=r.status;throw err}
  return data;
 };
 const emit=e=>{if(handlers.length)handlers.forEach(fn=>fn(e));else backlog.push(e)};

 async function poll(){
  if(!session||polling)return;
  polling=true;
  while(session){
   try{
    const s=session;
    const d=await api(`/api/poll?room=${encodeURIComponent(s.room)}&player=${s.player}&token=${encodeURIComponent(s.token)}&since=${cursor}`);
    if(session!==s)continue;
    cursor=d.cursor||cursor;
    store.save();
    for(const e of d.events||[])emit(e);
   }catch(e){
    // The room is gone for good (expired, wrong token): stop retrying.
    if(e.status===401||e.status===404||e.status===410){session=null;store.save();emit({type:'room-lost',message:e.message});break}
    emit({type:'error',message:e.message});
    await new Promise(r=>setTimeout(r,1500));
   }
  }
  polling=false;
 }

 async function begin(path){session=await api(path);cursor=0;store.save();poll();return session}

 window.SudomiLAN={
  kind:'lan',
  create:game=>begin(`/api/create?game=${encodeURIComponent(game)}`),
  join:(game,room)=>begin(`/api/join?game=${encodeURIComponent(game)}&room=${encodeURIComponent(room)}`),
  on:fn=>{handlers.push(fn);if(backlog.length){const pending=backlog;backlog=[];pending.forEach(e=>fn(e))}},
  off:fn=>handlers=handlers.filter(x=>x!==fn),
  get session(){return session},
  // A room saved by a previous page load (or null).
  get saved(){return store.read()},
  // Re-attach to a saved room after a refresh.
  resume(saved){session=saved.session;cursor=saved.cursor||0;store.save();poll();return session},
  // Forget the saved room without telling the other player.
  forget(){try{localStorage.removeItem(KEY)}catch(_){}},
  send:async(type,payload={})=>{if(!session)throw new Error('La sala se desconectó');return api('/api/send',{method:'POST',body:JSON.stringify({...session,type,payload})})},
  leave(){
   // Tell the other player we left on purpose, then clear everything.
   if(session){const s=session;fetch('/api/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...s,type:'peer-left',payload:{}})}).catch(()=>{})}
   session=null;handlers=[];backlog=[];cursor=0;store.save();
  }
 };
 window.SudomiLANRelay=window.SudomiLAN;   // 0.2.72: referencia fija para poder volver al Wi‑Fi local desde la sala
})();
