const C="lorinx-shell-7c73fb132c",F=["./","index.html","shim.js","gate.js","engine.js","sheet_adapter.js","icon-192.png","icon-512.png","manifest.webmanifest","apple-touch-icon.png","favicon.ico","favicon.svg","favicon-32.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
/* network first, but a network that does not answer within 4 seconds falls back to the cache, so a poor connection does not freeze the app */
self.addEventListener("fetch",e=>{if(e.request.method!=="GET"||new URL(e.request.url).origin!==location.origin||new URL(e.request.url).pathname.indexOf("/media/")>=0)return;
 const fromCache=()=>caches.match(e.request,{ignoreSearch:true});
 const net=fetch(e.request).then(r=>{if(r.status===200&&r.type==="basic"&&!r.redirected){const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp)).catch(()=>{})}return r});
 const slow=new Promise((res,rej)=>setTimeout(()=>fromCache().then(m=>m?res(m):net.then(res,rej)),4000));
 e.respondWith(Promise.race([net,slow]).catch(()=>fromCache().then(m=>m||Response.error())))});
