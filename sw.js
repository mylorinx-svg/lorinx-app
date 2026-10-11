const C="lorinx-shell-331c967287",F=["./","index.html","shim.js","gate.js","engine.js","sheet_adapter.js","icon-192.png","icon-512.png","manifest.webmanifest","apple-touch-icon.png","favicon.ico","favicon.svg","favicon-32.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
/* One page load = one version (audit 7 U-27). The page itself is network first with a 4 second fallback to the cache. Whichever it got decides where every script,
   style and image of THAT page comes from: a page that came from the cache gets all of its files from the cache, a page that came from the network gets them from the network
   (the cache only if the network fails). So an old index.html can never run a new shim.js, or the other way round. */
const mode=new Map();   // client id -> "cache" | "net"
const remember=(id,v)=>{if(!id)return;mode.set(id,v);if(mode.size>50)mode.delete(mode.keys().next().value)};
const put=(req,r)=>{if(r.status===200&&r.type==="basic"&&!r.redirected){const cp=r.clone();caches.open(C).then(c=>c.put(req,cp)).catch(()=>{})}return r};
self.addEventListener("fetch",e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=="GET"||u.origin!==location.origin||u.pathname.indexOf("/media/")>=0)return;
 const fromCache=()=>caches.match(e.request,{ignoreSearch:true});
 if(e.request.mode==="navigate"){
  const id=e.resultingClientId||e.clientId;
  const net=fetch(e.request).then(r=>{remember(id,"net");return put(e.request,r)});
  const slow=new Promise((res,rej)=>setTimeout(()=>fromCache().then(m=>{if(m){remember(id,"cache");res(m)}else net.then(res,rej)}),4000));
  e.respondWith(Promise.race([net,slow]).catch(()=>fromCache().then(m=>{if(m){remember(id,"cache");return m}return Response.error()})));
  return;
 }
 if(mode.get(e.clientId)==="cache"){
  e.respondWith(fromCache().then(m=>m||fetch(e.request).then(r=>put(e.request,r))).catch(()=>Response.error()));
  return;
 }
 const net=fetch(e.request).then(r=>put(e.request,r));
 const late=new Promise((res,rej)=>setTimeout(()=>fromCache().then(m=>m?res(m):net.then(res,rej)),8000));   // a stalled network does not freeze the page
 e.respondWith(Promise.race([net,late]).catch(()=>fromCache().then(m=>m||Response.error())));
});
