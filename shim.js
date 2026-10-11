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
    if(/^slot taken/.test(m))return "כבר יש קליפ באותו תאריך ושעה. בחר שעה או תאריך אחרים.";
    if(/^stale.*(expectId|זיהוי)/.test(m))return "אישור פרסום דורש זיהוי של הקליפ (content_id). רענן ונסה שוב.";
    if(/^stale.*(אותו קליפ|not the clip)/.test(m))return "השורה בגיליון כבר לא אותו קליפ (שורות זזו). רענן ונסה שוב.";
    if(/^stale/.test(m))return "הסטטוס של הקליפ השתנה בינתיים. רענן ונסה שוב.";
    /* a date/status refusal carries its own reason in Hebrew ("אי אפשר לאשר פרסום בשישי או בשבת"): that reason is shown, not replaced */
    var br=/^bad (?:date|status):\s*(.+)$/.exec(m);if(br)return /[\u0590-\u05FF]/.test(br[1])?br[1]:"תאריך או סטטוס לא תקינים: "+br[1];
    if(/^bad (status|date)|bad row: content date/.test(m))return "תאריך או סטטוס לא תקינים.";
    if(/^approved clip: changing its content/.test(m))return "קליפ מאושר: שינוי התוכן שלו מותר רק לבעלים, או אחרי שמחזירים אותו להמתנה.";
    if(/^bad expense:/.test(m)){
      if(/name and source/.test(m))return "שם ההוצאה והמקור חייבים להיות טקסט.";
      if(/: name$/.test(m))return "שם ההוצאה חסר או ארוך מדי (עד 200 תווים).";
      if(/source/.test(m))return "המקור / ההערה חסרים או ארוכים מדי (עד 400 תווים).";
      if(/date is more than a year/.test(m))return "תאריך הוצאה חד-פעמית חייב להיות בטווח של שנה מהיום.";
      if(/end date before/.test(m))return "תאריך הסיום לפני תאריך ההתחלה.";
      if(/billing day/.test(m))return "יום חיוב חייב להיות מספר בין 1 ל-31.";
      if(/amount|agorot|out of range/.test(m))return "הסכום לא תקין: מספר גדול מ-0 ועד 1,000,000 ₪.";
      if(/category/.test(m))return "סוג ההוצאה לא תקין.";
      if(/date/.test(m))return "תאריך ההוצאה לא תקין.";
      return "ההוצאה לא תקינה: "+m.replace(/^bad expense:\s*/,"");
    }
    if(/^too many expenses/.test(m))return "יש יותר מדי הוצאות בגיליון (עד 300).";
    if(/^content_id/.test(m))return "מזהה הקליפ (content_id) לא תקין או כבר בשימוש.";
    if(/^range starts after/.test(m))return "הכתיבה מחוץ לטווח הגיליון. רענן ונסה שוב.";
    if(/^forbidden/.test(m))return "אין לך הרשאה לפעולה הזאת.";
    if(/^clip already published/.test(m))return "הקליפ כבר פורסם. את הסטטוס שלו משנה רק הבעלים.";
    if(/not allowed|not writable|header is read-only|too large/.test(m))return "הפעולה לא מותרת בשרת.";
    return "הגיליון החזיר שגיאה: "+m;
  }
  /* the role the server reports for this token (a newer server adds "role" to its answers); an older one never does and the app stays in owner mode */
  function setRole(r){r=String(r);if(window.LX_ROLE===r)return;window.LX_ROLE=r;try{window.dispatchEvent(new Event("lx-role"))}catch(e){}}
  function setNet(off){if(window.LX_OFFLINE===off)return;window.LX_OFFLINE=off;try{window.dispatchEvent(new Event("lx-net"))}catch(e){}}
  function once(body,ms){
    var ctl=window.AbortController?new AbortController():null,t=ctl?setTimeout(function(){ctl.abort()},ms||20000):null;
    return fetch(CFG.url,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(Object.assign({token:CFG.token},body)),redirect:"follow",signal:ctl?ctl.signal:undefined})
      .then(function(r){if(t)clearTimeout(t);return r.json().catch(function(){throw {code:"upstream_error",message:"השרת החזיר תשובה לא תקינה (לא JSON). נסה שוב; אם זה חוזר, בדוק את הפריסה של ה-Web App."}})},function(e){if(t)clearTimeout(t);throw {net:true,timeout:!!(e&&e.name==="AbortError")}});
  }
  function api(body){
    if(!CFG.url)return Promise.reject({code:"local_unavailable",message:"צריך להדביק את כתובת ה-Web App ב-config.js (ראה הוראות ההתקנה)."});
    if(OPID[body.action]&&!body.opId)body=Object.assign({opId:opId()},body);
    var tries=((IDEMP[body.action]&&!(body.action==="update"&&(body.expectId||body.expectOld)))||body.opId)?3:1   /* an update guarded by expectId / expectOld is not retried: a lost reply after a successful write would come back as a false conflict */,delay=[0,700,1800];
    var ms=body.action==="orders"?60000:20000;   /* Shopify (several pages) and a cold Apps Script start can be slow */
    var WRITE={update:1,append:1,appset:1,appdel:1,expv2ops:1};
    function go(i){
      return once(body,ms).then(function(j){
        setNet(false);
        /* null, [] or a bare number is not an answer: it would read as "empty" or crash with an English TypeError */
        if(!j||typeof j!=="object"||Array.isArray(j))throw {code:"upstream_error",message:"השרת החזיר תשובה לא תקינה (לא JSON של התשובה הצפויה). נסה שוב; אם זה חוזר, בדוק את הפריסה של ה-Web App."};
        if(j.role)setRole(j.role);
        if(j.error){
          /* a token the server no longer knows: back to the access-code screen, there is nothing else the user can do here */
          if(/^unauthorized/.test(j.error)&&window.LORINX_RELOGIN)window.LORINX_RELOGIN();
          throw {code:/^conflict/.test(j.error)?"conflict":(/^forbidden/.test(j.error)?"forbidden":"upstream_error"),message:friendly(j.error)};
        }
        return j},function(e){
        /* a slow server is not a missing network: no retry storm, no "offline" banner, and a write that timed out is said to be of unknown outcome */
        if(e&&e.timeout)throw {code:"timeout",message:WRITE[body.action]?"השרת לא ענה בזמן. לא ידוע אם השינוי נשמר: רענן ובדוק לפני שתנסה שוב.":"השרת איטי ולא ענה בזמן. נסה שוב בעוד רגע."};
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
  /* an empty or unrecognised status is "unknown": shown for checking, never counted as waiting and never approved in bulk (U-8) */
  function statusIn(st){if(STATUS_IN[st])return STATUS_IN[st];var k=["מאושר לפרסום","פורסם","נדחה","ממתין לאישור"];for(var i=0;i<k.length;i++)if(st.indexOf(k[i])===0)return STATUS_IN[k[i]];return "unknown"}
  var rowsCache=[];
  function mapRow(r,i){
    var st=(r[6]||"").trim();
    if(st.indexOf("בוטל")===0||!r[0])return null;
    var file=r[4]||"",base=file.split("/").pop(),ak=r[0]+"|"+file;
    if(st.indexOf("מאושר לפרסום")===0)approvedAs[ak]=st;
    var cid=String(r[16]||"");   /* a stable id from the sheet (column Q); the date alone is not unique */
    return {id:cid||r[0],cid:cid,row:i+1,data:{date:r[0],product:r[1]||"",template:r[2]||"",hook:r[3]||"",file:file,status:statusIn(st),statusRaw:approvedAs[ak]||st,sheetRaw:st,time:r[14]||"20:30",caption:r[15]||"",
      video:file?encodeURI("../"+file):""}};
  }
  /* every failed read, not only the first one, reaches the screen (audit 7 U-3) */
  function reportErr(src,e){try{if(window.LX_LOADERR)window.LX_LOADERR(src,e)}catch(x){}}
  function loadClips(){
    return api({action:"get",range:"content!A1:Q1500"}).then(function(j){
      if(!Array.isArray(j.values))throw {code:"upstream_error",message:"השרת לא החזיר את לשונית התוכן (תשובה בלי רשימת שורות). נסה שוב."};
      if(j.truncated)throw {code:"upstream_error",message:"לשונית התוכן ארוכה מהטווח שנקרא"+(j.lastRow?" ("+j.lastRow+" שורות)":"")+". המסך לא יציג חלק ממנה. נקה שורות ישנות בגיליון."};
      rowsCache=(j.values||[]).map(mapRow).slice(1).filter(Boolean);
      clipListeners.forEach(function(f){f()});
    },function(e){reportErr("clips",e);throw e});
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
            var same=rowsCache.filter(function(x){return x.id===p[1]}),ex=same[0];
            /* an id that matches several rows (old rows without content_id on the same date) would write into the wrong one: refused */
            if(same.length>1)return Promise.reject({code:"upstream_error",message:"יש כמה שורות בגיליון עם אותו תאריך ובלי מזהה (עמודה Q), לכן אי אפשר לערוך אחת מהן בבטחה. הוסף מזהה בגיליון."});
            if(!ex){var byDate=rowsCache.filter(function(x){return x.data.date===p[1]});if(byDate.length===1)ex=byDate[0]}   /* an old date-based id: only when it is unambiguous */
            if(ex){
              /* only the cells the user really changed are written, each guarded by the clip's content_id: a stale screen can no longer put an old hook, file or caption back over what the content factory wrote */
              var o=ex.data||{},tNew=data.time?data.time:o.time,cNew=data.caption?data.caption:o.caption;   /* an empty value never overwrites what the sheet has */
              var cols=[["B",data.product||"",o.product||""],["C",data.template||"",o.template||""],["D",data.hook||"",o.hook||""],["E",data.file||"",o.file||""],["O",tNew||"20:30",o.time||"20:30"],["P",cNew||"",o.caption||""]].filter(function(c){return String(c[1])!==String(c[2])});
              var chain=Promise.resolve();
              cols.forEach(function(c){chain=chain.then(function(){return api({action:"update",range:"content!"+c[0]+ex.row,values:[[c[1]]],expectId:ex.cid||undefined})})});
              /* the cached copy follows what the sheet accepted, so a later edit is compared with the truth */
              return chain.then(function(){var F={B:"product",C:"template",D:"hook",E:"file",O:"time",P:"caption"};cols.forEach(function(c){ex.data[F[c[0]]]=c[1]})});
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
  var appVer=0;   /* bumped by every write: a read that started before a write must not overwrite what the write just set */
  function fetchApp(){var v0=appVer;return api({action:"get",range:"appdata!A1:C2000"}).then(function(j){var v=j.values;
    /* an answer without the table header is a broken answer, not an empty store: treating it as empty would make the app write its defaults over everything */
    if(!Array.isArray(v)||!v[0]||String(v[0][0])!=="key")throw {code:"upstream_error",message:"השרת לא החזיר את טבלת הנתונים של האפליקציה (תשובה ריקה או בלי כותרת). לא נכתב כלום."};
    if(v.length>1900&&window.LX_WARN)window.LX_WARN("טבלת הנתונים כמעט מלאה ("+v.length+" מתוך 2000 שורות)");if(APP.loaded&&(v0!==appVer||pend>0))return;parseApp(v)})}
  function loadApp(){
    if(loadingP)return loadingP;
    loadingP=fetchApp().then(migrateLegacy).then(function(){loadingP=null;fireApp()},function(e){
      loadingP=null;
      if(!(e&&e.code==="offline"))reportErr("app",e);
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
    pend++;appVer++;
    var p=appChain.catch(function(){}).then(fn);
    appChain=p.catch(function(){});
    return p.then(function(r){pend--;appVer++;fireApp();return r},function(e){pend--;appVer++;throw e});
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
      if(server==="Google Sheets"&&tool==="update_values")return api({action:"update",range:input.range,values:input.values,expectOld:input.expectOld,expectId:input.expectId,confirmRepublish:input.confirmRepublish}).then(function(){
        if(/^content!/.test(input.range)&&!input.noReload)return loadClips().then(null,function(){}).then(function(){return {payload:{}}});   /* a batch asks for one reload at its end */
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
    if(name==="user")return Promise.resolve({can:function(){return window.LX_ROLE!=="viewer"}});
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
