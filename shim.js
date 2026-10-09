/* Local runtime: replaces the claude.ai runtime (window.claude) with the Brain sheet via an Apps Script web app. */
(function(){
  var CFG=window.LORINX_CFG||{};
  var SHEET_KEY="lorinx_local_";
  var IDEMP={get:1,update:1,appset:1,appdel:1,orders:1,gmail:1,health:1};
  /* append / expops are not naturally idempotent: they carry an opId, so the server applies a retried request only once */
  var OPID={append:1,expv2ops:1};
  function opId(){var a="";try{var u=new Uint8Array(12);crypto.getRandomValues(u);for(var i=0;i<u.length;i++)a+=("0"+u[i].toString(16)).slice(-2)}catch(e){a=String(Date.now())+String(Math.random()).slice(2,12)}return "op_"+a}
  function friendly(m){
    m=String(m||"");
    if(/unauthorized/.test(m))return "קוד הגישה לא תקף. התחבר מחדש עם קוד חדש.";
    if(/^locked/.test(m))return "נחסם זמנית אחרי ניסיונות כושלים. נסה שוב בעוד כמה דקות.";
    if(/^busy/.test(m))return "המערכת עסוקה, נסה שוב בעוד רגע.";
    if(/^conflict/.test(m))return m.replace(/^conflict:\s*/,"");
    if(/not allowed|not writable|header is read-only/.test(m))return "הפעולה לא מותרת בשרת.";
    return "הגיליון החזיר שגיאה: "+m;
  }
  function setNet(off){if(window.LX_OFFLINE===off)return;window.LX_OFFLINE=off;try{window.dispatchEvent(new Event("lx-net"))}catch(e){}}
  function once(body,ms){
    var ctl=window.AbortController?new AbortController():null,t=ctl?setTimeout(function(){ctl.abort()},ms||20000):null;
    return fetch(CFG.url,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(Object.assign({token:CFG.token},body)),redirect:"follow",signal:ctl?ctl.signal:undefined})
      .then(function(r){if(t)clearTimeout(t);return r.json()},function(e){if(t)clearTimeout(t);throw {net:true}});
  }
  function api(body){
    if(!CFG.url)return Promise.reject({code:"local_unavailable",message:"צריך להדביק את כתובת ה-Web App ב-config.js (ראה הוראות ההתקנה)."});
    if(OPID[body.action]&&!body.opId)body=Object.assign({opId:opId()},body);
    var tries=(IDEMP[body.action]||body.opId)?3:1,delay=[0,700,1800];
    function go(i){
      return once(body).then(function(j){setNet(false);if(j&&j.error)throw {code:/^conflict/.test(j.error)?"conflict":"upstream_error",message:friendly(j.error)};return j},function(e){
        if(e&&e.net){if(i+1<tries)return new Promise(function(r){setTimeout(r,delay[i+1])}).then(function(){return go(i+1)});setNet(true);throw {code:"offline",message:"אין חיבור לגיליון. בדוק אינטרנט."}}
        throw e});
    }
    return go(0);
  }
  function lsGet(k,d){try{var v=localStorage.getItem(SHEET_KEY+k);return v?JSON.parse(v):d}catch(e){return d}}
  function lsSet(k,v){try{localStorage.setItem(SHEET_KEY+k,JSON.stringify(v))}catch(e){}}
  var clipListeners=[];
  var STATUS_IN={"מאושר לפרסום":"approved","פורסם":"approved","פורסם חלקית":"approved","נדחה":"rejected","ממתין לאישור":"pending"};
  var STATUS_OUT={approved:"מאושר לפרסום",rejected:"נדחה",pending:"ממתין לאישור"};
  /* a status may carry a suffix ("מאושר לפרסום - תמונה", "בוטל - יוחלף בקליפ אחר"): it is read by its beginning. statusRaw keeps the exact approved wording last seen for the row, so a re-approval in the same session writes it back unchanged */
  var approvedAs={};
  function statusIn(st){if(STATUS_IN[st])return STATUS_IN[st];var k=["מאושר לפרסום","פורסם","נדחה","ממתין לאישור"];for(var i=0;i<k.length;i++)if(st.indexOf(k[i])===0)return STATUS_IN[k[i]];return "pending"}
  var rowsCache=[];
  function mapRow(r,i){
    var st=(r[6]||"").trim();
    if(st.indexOf("בוטל")===0||!r[0])return null;
    var file=r[4]||"",base=file.split("/").pop(),ak=r[0]+"|"+file;
    if(st.indexOf("מאושר לפרסום")===0)approvedAs[ak]=st;
    return {id:r[0],row:i+1,data:{date:r[0],product:r[1]||"",template:r[2]||"",hook:r[3]||"",file:file,status:statusIn(st),statusRaw:approvedAs[ak]||st,time:r[14]||"20:30",caption:r[15]||"",
      video:file?encodeURI("../"+file):""}};
  }
  function loadClips(){
    return api({action:"get",range:"content!A1:P200"}).then(function(j){
      rowsCache=(j.values||[]).map(mapRow).slice(1).filter(Boolean);
      clipListeners.forEach(function(f){f()});
    });
  }
  function snapOf(list){return {empty:!list.length,docs:list.map(function(d){return {id:d.id,data:function(){return d.data}}})}}
  var db={
    collection:function(name){
      if(name==="clips"){return {orderBy:function(){return this},onSnapshot:function(cb,err){
        function fire(){cb(snapOf(rowsCache.slice().sort(function(a,b){return (a.id+a.data.time).localeCompare(b.id+b.data.time)})))}
        clipListeners.push(fire);loadClips().catch(function(e){if(err)err(e)});
      }}}
      return {orderBy:function(){return this},onSnapshot:function(cb){cb({empty:true,docs:[]})}};
    },
    doc:function(path){
      var p=path.split("/");
      return {
        onSnapshot:function(cb){var v=lsGet(path,null);cb({exists:!!v,data:function(){return v}})},
        set:function(data){
          if(p[0]==="clips"){
            var ex=rowsCache.filter(function(x){return x.id===p[1]})[0];
            if(ex){
              return api({action:"update",range:"content!B"+ex.row+":E"+ex.row,values:[[data.product||"",data.template||"",data.hook||"",data.file||""]]});
            }
            if(!data.date)return Promise.resolve();
            return api({action:"append",sheet:"content",row:[data.date,data.product||"",data.template||"",data.hook||"",data.file||"","",STATUS_OUT[data.status||"pending"],"","","","","","","",data.time||"20:30",data.caption||""]}).then(loadClips);
          }
          lsSet(path,data);return Promise.resolve();
        },
        delete:function(){if(p[0]!=="clips")try{localStorage.removeItem(SHEET_KEY+path)}catch(e){}return Promise.resolve()}
      };
    }
  };
  /* ---- appdata tab = single source of truth for depts / todos / cfg. All writes are atomic on the server (appset/appdel under a lock). ---- */
  var APP={map:{},loaded:false},appLs=[],appChain=Promise.resolve(),pend=0,loadingP=null,CACHE_KEY="lorinx_cache_app";
  function legacyKeys(){var o=[];try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf(SHEET_KEY)===0){var n=k.slice(SHEET_KEY.length);if(/^(depts|todos|cfg)(\/|$)/.test(n))o.push(n)}}}catch(e){}return o}
  function parseApp(v){
    var m={};
    for(var i=1;i<v.length;i++){var r=v[i]||[];if(!r[0])continue;try{m[r[0]]=JSON.parse(r[1])}catch(e){}}
    APP.map=m;APP.loaded=true;
    try{localStorage.setItem(CACHE_KEY,JSON.stringify(m))}catch(e){}   /* read-only fallback while offline; overwritten on every successful load */
  }
  function fireApp(){appLs.forEach(function(f){try{f()}catch(e){}})}
  function fetchApp(){return api({action:"get",range:"appdata!A1:C2000"}).then(function(j){var v=j.values||[];if(v.length>1900&&window.LX_WARN)window.LX_WARN("טבלת הנתונים כמעט מלאה ("+v.length+" מתוך 2000 שורות)");parseApp(v)})}
  function loadApp(){
    if(loadingP)return loadingP;
    loadingP=fetchApp().then(migrateLegacy).then(function(){loadingP=null;fireApp()},function(e){
      loadingP=null;
      if(!APP.loaded&&e&&e.code==="offline"){   /* first load failed: show the last known state, read-only */
        try{var c=JSON.parse(localStorage.getItem(CACHE_KEY)||"null");if(c){APP.map=c;APP.loaded=true;fireApp();return}}catch(x){}
      }
      throw e});
    return loadingP;
  }
  function migrateLegacy(){
    var ks=legacyKeys();if(!ks.length)return Promise.resolve();
    var moved=[],chain=Promise.resolve();
    ks.forEach(function(n){var v=lsGet(n,null);if(v==null)return;
      if(APP.map[n]!==undefined){moved.push(n);return}
      chain=chain.then(function(){return api({action:"appset",key:n,json:JSON.stringify(v)})}).then(function(){moved.push(n)});});
    return chain.then(fetchApp).then(function(){
      /* delete a legacy copy only after the sheet read-back proves it is there */
      moved.forEach(function(n){if(APP.map[n]!==undefined){try{localStorage.removeItem(SHEET_KEY+n)}catch(e){}}});
    });
  }
  function appOp(fn){
    if(window.LX_OFFLINE)return Promise.reject({code:"offline",message:"אין חיבור לגיליון. השינוי לא נשמר."});
    pend++;
    var p=appChain.catch(function(){}).then(fn);
    appChain=p.catch(function(){});
    return p.then(function(r){pend--;fireApp();return r},function(e){pend--;throw e});
  }
  function appCol(name){
    return {orderBy:function(){return this},onSnapshot:function(cb,err){
      function fire(){
        var out=[];Object.keys(APP.map).forEach(function(k){if(k.indexOf(name+"/")===0)out.push({id:k.slice(name.length+1),data:APP.map[k]})});
        cb(snapOf(out));
      }
      appLs.push(fire);
      if(APP.loaded)fire();else loadApp().catch(function(e){if(err)err(e)});
    }};
  }
  var origCollection=db.collection;
  db.collection=function(name){return (name==="depts"||name==="todos")?appCol(name):origCollection(name)};
  var origDoc=db.doc;
  db.doc=function(path){
    var p=path.split("/");
    if(p[0]==="clips")return origDoc(path);
    return {
      onSnapshot:function(cb,err){
        function fire(){var e=APP.map[path];cb({exists:e!==undefined,data:function(){return e}})}
        appLs.push(fire);
        if(APP.loaded)fire();else loadApp().catch(function(e){if(err)err(e)});
      },
      set:function(data){return appOp(function(){return api({action:"appset",key:path,json:JSON.stringify(data)}).then(function(){APP.map[path]=data})})},
      delete:function(){return appOp(function(){return api({action:"appdel",keys:[path]}).then(function(){delete APP.map[path]})})}
    };
  };
  db.deleteMany=function(paths){return appOp(function(){return api({action:"appdel",keys:paths}).then(function(){paths.forEach(function(k){delete APP.map[k]})})})};
  db.refresh=function(){return loadApp().then(function(){return loadClips()})};
  function ordersFromShopify(){
    /* never turn a malformed answer into "0 orders": a missing list is an error, shown as an error */
    return api({action:"orders"}).then(function(j){
      if(!j||!Array.isArray(j.orders))throw {code:"invalid_response",message:"Shopify החזיר תשובה לא תקינה. מוצג הנתון האחרון שאומת, אם יש."};
      return {payload:Object.assign({},j,{totalCount:typeof j.totalCount==="number"?j.totalCount:j.orders.length})}});
  }
  var mcp={
    listTools:function(){return Promise.resolve({servers:[{server:"Google Sheets",authStatus:CFG.url?"connected":"needs_reauth"},{server:"Shopify",authStatus:CFG.url?"connected":"needs_reauth"},{server:"Gmail",authStatus:CFG.url?"connected":"needs_reauth"}]})},
    callTool:function(server,tool,input){
      if(server==="Google Sheets"&&tool==="get_values")return api({action:"get",range:input.range}).then(function(j){
        /* a newer server says when the tab has more rows than the range asked for; an older one never sets the flag */
        if(j.truncated&&window.LX_WARN)window.LX_WARN("הלשונית "+String(input.range).split("!")[0]+" ארוכה מהטווח שנקרא ("+j.lastRow+" שורות). חלק מהשורות לא נטען.");
        return {payload:{values:j.values,truncated:!!j.truncated,lastRow:j.lastRow}}});
      if(server==="Google Sheets"&&tool==="update_values")return api({action:"update",range:input.range,values:input.values}).then(function(){
        if(/^content!/.test(input.range))return loadClips().then(null,function(){}).then(function(){return {payload:{}}});
        return {payload:{}}});
      if(server==="Google Sheets"&&tool==="exp_v2_ops")return api({action:"expv2ops",ops:input.ops}).then(function(){return {payload:{}}});
      if(server==="Shopify"&&tool==="list-orders")return ordersFromShopify();
      if(server==="LORINX"&&tool==="health")return api({action:"health"}).then(function(j){if(!j||!Array.isArray(j.checks))throw {code:"old_server",message:"השרת עדיין בגרסה ישנה, בלי בדיקת תקינות."};return {payload:j}},function(e){if(e&&/unknown action/.test(String(e.message||"")))throw {code:"old_server",message:"השרת עדיין בגרסה ישנה, בלי בדיקת תקינות."};throw e});
      if(server==="Gmail"&&tool==="search_threads")return api({action:"gmail"}).then(function(j){if(j.error)throw {code:"upstream_error",message:j.error};if(typeof j.count!=="number")throw {code:"invalid_response",message:"Gmail החזיר תשובה לא תקינה."};return {payload:{threads:[],resultCountEstimate:j.count}}});
      return Promise.reject({code:"local_unavailable",message:"לא זמין באפליקציה המקומית ("+server+")."});
    }
  };
  window.claude={use:function(name){
    if(name==="db")return Promise.resolve(db);
    if(name==="mcp")return Promise.resolve(mcp);
    if(name==="user")return Promise.resolve({can:function(){return true}});
    return Promise.resolve(null);
  }};
var nextOk=0,fails=0;
  function tick(force){
    if(document.hidden||!CFG.url||pend)return;
    var n=Date.now();if(!force&&n<nextOk)return;
    nextOk=n+15000;
    Promise.all([loadClips(),loadApp()]).then(function(){fails=0},function(){fails=Math.min(fails+1,5);nextOk=Date.now()+15000*Math.pow(2,fails)});
  }
  setInterval(function(){tick()},60000);
  document.addEventListener("visibilitychange",function(){if(!document.hidden)tick()});
  window.addEventListener("online",function(){tick(true)});
  window.LX_TICK=function(){tick(true)};
})();
