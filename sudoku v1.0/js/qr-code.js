/* SUDOMI 0.2.52 — a small QR code generator and reader, written for this project (no third-party code).
 *   SudomiQRCode.encode(bytes)        → {size, modules:[[0|1…]…], version}   (byte mode, error-correction level L, versions 1–14)
 *   SudomiQRCode.draw(canvas, qr, px) → paints it black on white with a 4-module quiet zone
 *   SudomiQRCode.decode(imageData)    → Uint8Array of the bytes, or null    (finds the three corner squares, samples the grid)
 *   SudomiQRCode.scan(video, onBytes, check) → starts reading camera frames; stops itself when check(bytes) is true; returns {stop()}
 * The reader does NOT correct errors: the caller puts its own checksum in the data and the scanner just keeps trying frames until
 * one reads cleanly. Meant for screen-to-camera scanning at close range of codes of up to ~330 bytes. */
(()=>{
 /* ================= tables (error-correction level L) ================= */
 const ECC_PER_BLOCK=[0,7,10,15,20,26,18,20,24,30,18,20,24,26,30];
 const NUM_BLOCKS=   [0,1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4];
 const MAXV=14;
 const sizeOf=v=>v*4+17;
 function alignPos(v){
  if(v===1)return [];
  const n=Math.floor(v/7)+2,size=sizeOf(v),step=Math.ceil((v*4+n*2+1)/(n*2-2))*2,r=[6];
  for(let p=size-7;r.length<n;p-=step)r.splice(1,0,p);
  return r;
 }
 function rawModules(v){
  let r=(16*v+128)*v+64;
  if(v>=2){const n=Math.floor(v/7)+2;r-=(25*n-10)*n-55;if(v>=7)r-=36}
  return r;
 }
 const rawCodewords=v=>Math.floor(rawModules(v)/8);
 const dataCodewords=v=>rawCodewords(v)-ECC_PER_BLOCK[v]*NUM_BLOCKS[v];
 /* ================= Reed–Solomon over GF(256) ================= */
 const mul=(x,y)=>{let z=0;for(let i=7;i>=0;i--){z=(z<<1)^((z>>>7)*0x11D);z^=((y>>>i)&1)*x}return z};
 function rsDivisor(deg){
  const r=new Array(deg).fill(0);r[deg-1]=1;let root=1;
  for(let i=0;i<deg;i++){for(let j=0;j<deg;j++){r[j]=mul(r[j],root);if(j+1<deg)r[j]^=r[j+1]}root=mul(root,2)}
  return r;
 }
 function rsRemainder(data,div){
  const r=new Array(div.length).fill(0);
  for(const b of data){const f=b^r.shift();r.push(0);div.forEach((c,i)=>{r[i]^=mul(c,f)})}
  return r;
 }
 /* block layout shared by the encoder and the reader */
 function layout(v){
  const nb=NUM_BLOCKS[v],ecc=ECC_PER_BLOCK[v],raw=rawCodewords(v),numShort=nb-raw%nb,shortLen=Math.floor(raw/nb);
  const dataLen=j=>shortLen-ecc+(j<numShort?0:1);
  const order=[];                                   // interleaved order: [block, index]
  for(let i=0;i<=shortLen;i++)for(let j=0;j<nb;j++)if(i!==shortLen-ecc||j>=numShort)order.push([j,i]);
  return {nb,ecc,raw,numShort,shortLen,dataLen,order};
 }
 /* ================= function patterns (which modules are NOT data) ================= */
 function newGrid(v){
  const size=sizeOf(v),m=[...Array(size)].map(()=>new Array(size).fill(0)),f=[...Array(size)].map(()=>new Array(size).fill(false));
  const set=(x,y,dark)=>{m[y][x]=dark?1:0;f[y][x]=true};
  for(let i=0;i<size;i++){set(6,i,i%2===0);set(i,6,i%2===0)}
  const finder=(cx,cy)=>{for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const d=Math.max(Math.abs(dx),Math.abs(dy)),x=cx+dx,y=cy+dy;if(x>=0&&x<size&&y>=0&&y<size)set(x,y,d!==2&&d!==4)}};
  finder(3,3);finder(size-4,3);finder(3,size-4);
  const ap=alignPos(v),n=ap.length;
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){
   if((i===0&&j===0)||(i===0&&j===n-1)||(i===n-1&&j===0))continue;
   for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)set(ap[i]+dx,ap[j]+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1);
  }
  // reserve format areas (real bits are drawn later) and version areas
  for(let i=0;i<9;i++){f[8][i]=true;f[i][8]=true}
  for(let i=0;i<8;i++){f[8][size-1-i]=true;f[size-1-i][8]=true}
  set(8,size-8,true);
  if(v>=7){
   let rem=v;for(let i=0;i<12;i++)rem=(rem<<1)^((rem>>>11)*0x1F25);
   const bits=v<<12|rem;
   for(let i=0;i<18;i++){const a=size-11+i%3,b=Math.floor(i/3),bit=((bits>>>i)&1)===1;set(a,b,bit);set(b,a,bit)}
  }
  return {size,m,f,set};
 }
 const MASKS=[(x,y)=>(x+y)%2===0,(x,y)=>y%2===0,(x,y)=>x%3===0,(x,y)=>(x+y)%3===0,(x,y)=>(Math.floor(x/3)+Math.floor(y/2))%2===0,(x,y)=>x*y%2+x*y%3===0,(x,y)=>(x*y%2+x*y%3)%2===0,(x,y)=>((x+y)%2+x*y%3)%2===0];
 const formatWord=mask=>{const data=(1<<3)|mask;let rem=data;for(let i=0;i<10;i++)rem=(rem<<1)^((rem>>>9)*0x537);return((data<<10)|rem)^0x5412};   // level L = 01
 function drawFormat(g,mask){
  const bits=formatWord(mask),size=g.size,bit=i=>((bits>>>i)&1)===1;
  for(let i=0;i<=5;i++)g.m[i][8]=bit(i)?1:0;
  g.m[7][8]=bit(6)?1:0;g.m[8][8]=bit(7)?1:0;g.m[8][7]=bit(8)?1:0;
  for(let i=9;i<15;i++)g.m[8][14-i]=bit(i)?1:0;
  for(let i=0;i<8;i++)g.m[8][size-1-i]=bit(i)?1:0;
  for(let i=8;i<15;i++)g.m[size-15+i][8]=bit(i)?1:0;
  g.m[size-8][8]=1;
 }
 /* zig-zag walk over the data modules (same order for writing and reading) */
 function* walk(g){
  const size=g.size;
  for(let right=size-1;right>=1;right-=2){
   if(right===6)right=5;
   for(let vert=0;vert<size;vert++)for(let j=0;j<2;j++){
    const x=right-j,upward=((right+1)&2)===0,y=upward?size-1-vert:vert;
    if(!g.f[y][x])yield [x,y];
   }
  }
 }
 /* ================= encoder ================= */
 function encode(bytes){
  let v=1;for(;v<=MAXV;v++){if(4+(v<10?8:16)+8*bytes.length<=dataCodewords(v)*8)break}
  if(v>MAXV)throw new Error('Datos demasiado grandes para el código QR.');
  const bb=[],put=(val,len)=>{for(let i=len-1;i>=0;i--)bb.push((val>>>i)&1)};
  put(4,4);put(bytes.length,v<10?8:16);bytes.forEach(b=>put(b,8));
  const cap=dataCodewords(v)*8;put(0,Math.min(4,cap-bb.length));while(bb.length%8)bb.push(0);
  for(let pad=0xEC;bb.length<cap;pad^=0xEC^0x11)put(pad,8);
  const data=[];for(let i=0;i<bb.length;i+=8){let x=0;for(let j=0;j<8;j++)x=(x<<1)|bb[i+j];data.push(x)}
  const L=layout(v),div=rsDivisor(L.ecc),blocks=[];
  let k=0;for(let j=0;j<L.nb;j++){const d=data.slice(k,k+L.dataLen(j));k+=d.length;blocks.push(d.concat(j<L.numShort?[0]:[]).concat(rsRemainder(d,div)))}   // short blocks carry a dummy 0 so every block has the same length (it is skipped when interleaving)
  const all=L.order.map(([j,i])=>blocks[j][i]);
  const g=newGrid(v);let n=0;
  for(const [x,y] of walk(g)){if(n<all.length*8){g.m[y][x]=(all[n>>>3]>>>(7-(n&7)))&1;n++}}
  // choose the mask with the lowest penalty
  let best=null,bestP=1e9;
  for(let mask=0;mask<8;mask++){
   const t=g.m.map(r=>r.slice());
   for(let y=0;y<g.size;y++)for(let x=0;x<g.size;x++)if(!g.f[y][x]&&MASKS[mask](x,y))t[y][x]^=1;
   const gg={size:g.size,m:t};drawFormat(gg,mask);
   const p=penalty(t);if(p<bestP){bestP=p;best=t}
  }
  return {size:g.size,modules:best,version:v};
 }
 function penalty(m){
  const n=m.length;let p=0;
  for(let pass=0;pass<2;pass++){
   for(let a=0;a<n;a++){let run=1;for(let b=1;b<n;b++){const c=pass?m[b][a]:m[a][b],pr=pass?m[b-1][a]:m[a][b-1];if(c===pr){run++;if(run===5)p+=3;else if(run>5)p++}else run=1}}
  }
  for(let y=0;y<n-1;y++)for(let x=0;x<n-1;x++){const c=m[y][x];if(c===m[y][x+1]&&c===m[y+1][x]&&c===m[y+1][x+1])p+=3}
  let dark=0;for(const r of m)for(const c of r)dark+=c;
  p+=Math.floor(Math.abs(dark*20-n*n*10)/(n*n))*10;
  return p;
 }
 function draw(canvas,qr,px){
  const q=4,n=qr.size+q*2,s=Math.max(1,Math.floor(px/n));canvas.width=canvas.height=n*s;
  const c=canvas.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,canvas.width,canvas.height);c.fillStyle='#000';
  for(let y=0;y<qr.size;y++)for(let x=0;x<qr.size;x++)if(qr.modules[y][x])c.fillRect((x+q)*s,(y+q)*s,s,s);
 }
 /* ================= reader ================= */
 function binarize(img){
  const w=img.width,h=img.height,d=img.data,gray=new Uint8Array(w*h);
  for(let i=0,j=0;i<gray.length;i++,j+=4)gray[i]=(d[j]*77+d[j+1]*150+d[j+2]*29)>>8;
  const I=new Uint32Array((w+1)*(h+1));
  for(let y=0;y<h;y++){let row=0;for(let x=0;x<w;x++){row+=gray[y*w+x];I[(y+1)*(w+1)+x+1]=I[y*(w+1)+x+1]+row}}
  const r=Math.max(8,Math.round(Math.min(w,h)/14)),bin=new Uint8Array(w*h);
  for(let y=0;y<h;y++){const y0=Math.max(0,y-r),y1=Math.min(h,y+r+1);
   for(let x=0;x<w;x++){const x0=Math.max(0,x-r),x1=Math.min(w,x+r+1),cnt=(x1-x0)*(y1-y0),sum=I[y1*(w+1)+x1]-I[y0*(w+1)+x1]-I[y1*(w+1)+x0]+I[y0*(w+1)+x0];
    bin[y*w+x]=gray[y*w+x]*cnt<sum*0.88?1:0}}
  return {w,h,bin};
 }
 const ok15=(r,m)=>Math.abs(r[0]-m)<m*.55&&Math.abs(r[1]-m)<m*.55&&Math.abs(r[2]-3*m)<m*1.1&&Math.abs(r[3]-m)<m*.55&&Math.abs(r[4]-m)<m*.55;
 // refine a finder: the dark 3×3 block in its middle is one connected blob; its bounding box gives the exact centre and module size
 function refine(B,c){
  const {w,h,bin}=B,R=Math.ceil(c.m*3);let sx=Math.round(c.x),sy=Math.round(c.y);
  if(!bin[sy*w+sx])return c;
  const x0=Math.max(0,sx-R),x1=Math.min(w-1,sx+R),y0=Math.max(0,sy-R),y1=Math.min(h-1,sy+R),W=x1-x0+1,seen=new Uint8Array(W*(y1-y0+1)),st=[[sx,sy]];
  let minx=sx,maxx=sx,miny=sy,maxy=sy;seen[(sy-y0)*W+(sx-x0)]=1;
  while(st.length){
   const [x,y]=st.pop();if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y;
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<x0||nx>x1||ny<y0||ny>y1)continue;const i=(ny-y0)*W+(nx-x0);if(seen[i]||!bin[ny*w+nx])continue;seen[i]=1;st.push([nx,ny])}
  }
  const bw=maxx-minx+1,bh=maxy-miny+1;
  if(bw<c.m*2||bw>c.m*4.2||bh<c.m*2||bh>c.m*4.2)return c;
  return {x:(minx+maxx+1)/2,y:(miny+maxy+1)/2,m:(bw+bh)/6,n:c.n};
 }
 function runsOf(get,len){const runs=[];let cur=get(0),n=1;for(let i=1;i<len;i++){const c=get(i);if(c===cur)n++;else{runs.push([cur,n,i-n]);cur=c;n=1}}runs.push([cur,n,len-n]);return runs}
 function findFinders(B){
  const {w,h,bin}=B,hits=[];
  for(let y=0;y<h;y+=2){
   const runs=runsOf(x=>bin[y*w+x],w);
   for(let i=0;i+4<runs.length;i++){
    if(runs[i][0]!==1)continue;
    const r=[0,1,2,3,4].map(k=>runs[i+k][1]),tot=r[0]+r[1]+r[2]+r[3]+r[4],m=tot/7;
    if(m<1.5||!ok15(r,m))continue;
    const cx=runs[i][2]+tot/2;
    // vertical check through the centre
    const x=Math.round(cx),vr=runsOf(yy=>bin[yy*w+x],h);
    let vi=-1;for(let k=0;k<vr.length;k++)if(vr[k][2]<=y&&y<vr[k][2]+vr[k][1]){vi=k;break}
    if(vi<2||vi+2>=vr.length||vr[vi][0]!==1)continue;
    const v5=[vr[vi-2][1],vr[vi-1][1],vr[vi][1],vr[vi+1][1],vr[vi+2][1]],vt=v5.reduce((a,b)=>a+b,0),vm=vt/7;
    if(!ok15(v5,vm)||Math.abs(vm-m)>m*.6)continue;
    hits.push({x:cx,y:vr[vi-2][2]+vt/2,m:(m+vm)/2});
   }
  }
  const cl=[];
  for(const p of hits){const c=cl.find(q=>Math.hypot(q.x-p.x,q.y-p.y)<q.m*3);if(c){c.x=(c.x*c.n+p.x)/(c.n+1);c.y=(c.y*c.n+p.y)/(c.n+1);c.m=(c.m*c.n+p.m)/(c.n+1);c.n++}else cl.push({...p,n:1})}
  return cl.filter(c=>c.n>=2).sort((a,b)=>b.n-a.n).slice(0,8);
 }
 function pickTriple(cs){
  let best=null,bestE=1e9;
  for(let i=0;i<cs.length;i++)for(let j=i+1;j<cs.length;j++)for(let k=j+1;k<cs.length;k++){
   const P=[cs[i],cs[j],cs[k]],ms=P.map(p=>p.m);if(Math.max(...ms)/Math.min(...ms)>1.6)continue;
   const d=[Math.hypot(P[1].x-P[2].x,P[1].y-P[2].y),Math.hypot(P[0].x-P[2].x,P[0].y-P[2].y),Math.hypot(P[0].x-P[1].x,P[0].y-P[1].y)];
   const o=d.map((x,i)=>[x,i]).sort((a,b)=>b[0]-a[0]),c=o[0][0],a=o[1][0],b=o[2][0];
   const e=Math.abs(a-b)/c+Math.abs(c-a*Math.SQRT2)/c;if(e<bestE){bestE=e;best={tl:P[o[0][1]],others:P.filter((_,t)=>t!==o[0][1])}}
  }
  if(!best||bestE>.5)return null;
  const {tl,others}=best,[p1,p2]=others,cross=(p1.x-tl.x)*(p2.y-tl.y)-(p1.y-tl.y)*(p2.x-tl.x);
  return cross>0?{tl,tr:p1,bl:p2}:{tl,tr:p2,bl:p1};
 }
 function sample(B,T,dim){
  const {w,h,bin}=B,{tl,tr,bl}=T,span=dim-7,vx=[(tr.x-tl.x)/span,(tr.y-tl.y)/span],vy=[(bl.x-tl.x)/span,(bl.y-tl.y)/span];
  const g=[...Array(dim)].map(()=>new Array(dim).fill(0)),at=(x,y)=>{x=Math.round(x);y=Math.round(y);return x<0||y<0||x>=w||y>=h?0:bin[y*w+x]};
  const mx=Math.hypot(vx[0],vx[1]),off=mx*.3;
  for(let r=0;r<dim;r++)for(let c=0;c<dim;c++){
   const px=tl.x+(c-3)*vx[0]+(r-3)*vy[0],py=tl.y+(c-3)*vx[1]+(r-3)*vy[1];
   let s=at(px,py)*2+at(px+off,py)+at(px-off,py)+at(px,py+off)+at(px,py-off);g[r][c]=s>=4?1:0;
  }
  return g;
 }
 const hamming=(a,b)=>{let x=a^b,n=0;while(x){n+=x&1;x>>>=1}return n};
 function readFormat(g){
  const dim=g.length,bit=(x,y)=>g[y][x];
  const A=[];for(let i=0;i<=5;i++)A[i]=bit(8,i);A[6]=bit(8,7);A[7]=bit(8,8);A[8]=bit(7,8);for(let i=9;i<15;i++)A[i]=bit(14-i,8);
  const B=[];for(let i=0;i<8;i++)B[i]=bit(dim-1-i,8);for(let i=8;i<15;i++)B[i]=bit(8,dim-15+i);
  const val=a=>a.reduce((s,b,i)=>s|(b<<i),0);
  let best=null,bd=99;
  for(let mask=0;mask<8;mask++){const f=formatWord(mask);for(const v of [val(A),val(B)]){const d=hamming(v,f);if(d<bd){bd=d;best=mask}}}
  return bd<=3?best:null;
 }
 function readData(g,v,mask){
  const gr=newGrid(v),bits=[];
  for(const [x,y] of walk(gr))bits.push(g[y][x]^(MASKS[mask](x,y)?1:0));
  const L=layout(v),cw=[];for(let i=0;i<L.raw;i++){let b=0;for(let j=0;j<8;j++)b=(b<<1)|(bits[i*8+j]||0);cw.push(b)}
  const blocks=[...Array(L.nb)].map(()=>[]);
  L.order.forEach(([j,i],idx)=>{if(i<L.dataLen(j))blocks[j][i]=cw[idx]});
  const data=[].concat(...blocks);
  // parse: mode 4 bits, length, bytes
  let p=0;const take=n=>{let x=0;for(let i=0;i<n;i++){const byte=data[p>>>3]||0;x=(x<<1)|((byte>>>(7-(p&7)))&1);p++}return x};
  if(take(4)!==4)return null;
  const len=take(v<10?8:16);if(len<=0||len>dataCodewords(v))return null;
  const out=new Uint8Array(len);for(let i=0;i<len;i++)out[i]=take(8);
  return out;
 }
 function decode(img){
  const B=binarize(img),raw=findFinders(B);if(raw.length<3)return null;
  const cs=raw.map(c=>refine(B,c));
  const T=pickTriple(cs);if(!T)return null;
  const m=(T.tl.m+T.tr.m+T.bl.m)/3,est=Math.hypot(T.tr.x-T.tl.x,T.tr.y-T.tl.y)/m+7;
  const v0=Math.round((est-17)/4);
  for(const dv of [0,-1,1]){
   const v=v0+dv;if(v<1||v>MAXV)continue;
   const g=sample(B,T,sizeOf(v)),mask=readFormat(g);if(mask===null)continue;
   const out=readData(g,v,mask);if(out)return out;
  }
  return null;
 }
 /* ================= camera scanner ================= */
 function scan(video,onBytes,check){
  let alive=true;const cv=document.createElement('canvas'),ctx=cv.getContext('2d',{willReadFrequently:true});
  const step=()=>{
   if(!alive)return;
   try{
    if(video.readyState>=2&&video.videoWidth){
     const s=Math.min(1,720/Math.max(video.videoWidth,video.videoHeight));cv.width=Math.round(video.videoWidth*s);cv.height=Math.round(video.videoHeight*s);
     ctx.drawImage(video,0,0,cv.width,cv.height);
     const out=decode(ctx.getImageData(0,0,cv.width,cv.height));
     if(out&&(!check||check(out))){alive=false;onBytes(out);return}
    }
   }catch(_){}
   setTimeout(step,110);
  };
  step();
  return {stop(){alive=false}};
 }
 window.SudomiQRCode={encode,draw,decode,scan};
})();
