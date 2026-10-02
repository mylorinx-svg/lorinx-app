/* Local runtime: replaces the claude.ai runtime (window.claude) with the Brain sheet via an Apps Script web app. */
(function(){
  var CFG=window.LORINX_CFG||{};
  var SHEET_KEY="lorinx_local_";
  function api(body){
    if(!CFG.url)return Promise.reject({code:"local_unavailable",message:"צריך להדביק את כתובת ה-Web App ב-config.js (ראה הוראות ההתקנה)."});
    return fetch(CFG.url,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify(Object.assign({token:CFG.token},body)),redirect:"follow"})
      .then(function(r){return r.json()})
      .then(function(j){if(j&&j.error)throw {code:"upstream_error",message:"הגיליון החזיר שגיאה: "+j.error};return j},
            function(){throw {code:"upstream_error",message:"אין חיבור לגיליון. בדוק אינטרנט."}});
  }
  function lsGet(k,d){try{var v=localStorage.getItem(SHEET_KEY+k);return v?JSON.parse(v):d}catch(e){return d}}
  function lsSet(k,v){try{localStorage.setItem(SHEET_KEY+k,JSON.stringify(v))}catch(e){}}
  var clipListeners=[];
  var STATUS_IN={"מאושר לפרסום":"approved","פורסם":"approved","פורסם חלקית":"approved","נדחה":"rejected","ממתין לאישור":"pending"};
  var STATUS_OUT={approved:"מאושר לפרסום",rejected:"נדחה",pending:"ממתין לאישור"};
  var rowsCache=[];
  function mapRow(r,i){
    var st=(r[6]||"").trim();
    if(st==="בוטל"||!r[0])return null;
    var file=r[4]||"",base=file.split("/").pop();
    return {id:r[0],row:i+1,data:{date:r[0],product:r[1]||"",template:r[2]||"",hook:r[3]||"",file:file,status:STATUS_IN[st]||"pending",time:r[14]||"20:30",caption:r[15]||"",
      video:file?encodeURI("../"+file):""}};
  }
  function loadClips(){
    return api({action:"get",range:"content!A1:P200"}).then(function(j){
      rowsCache=(j.values||[]).map(mapRow).slice(1).filter(Boolean);
      clipListeners.forEach(function(f){f()});
    });
  }
  function snapOf(list){return {empty:!list.length,docs:list.map(function(d){return {id:d.id,data:function(){return d.data}}})}}
  var LOCAL={depts:null,todos:null};
  function localCol(name){
    return {orderBy:function(){return this},onSnapshot:function(cb){
      var saved=lsGet(name,null);
      if(saved)cb(snapOf(saved));else cb({empty:true,docs:[]});
    }};
  }
  var db={
    collection:function(name){
      if(name==="clips"){return {orderBy:function(){return this},onSnapshot:function(cb,err){
        function fire(){cb(snapOf(rowsCache.slice().sort(function(a,b){return (a.id+a.data.time).localeCompare(b.id+b.data.time)})))}
        clipListeners.push(fire);loadClips().catch(function(e){if(err)err(e)});
      }}}
      return localCol(name);
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
  /* depts/todos are saved per-doc under "depts/<id>" / "todos/<id>"; the collection snapshot assembles them */
  var origCollection=db.collection;
  db.collection=function(name){
    if(name==="depts"||name==="todos"){
      return {orderBy:function(){return this},onSnapshot:function(cb){
        var out=[];
        try{for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(k&&k.indexOf(SHEET_KEY+name+"/")===0){out.push({id:k.slice((SHEET_KEY+name+"/").length),data:JSON.parse(localStorage.getItem(k))})}}}catch(e){}
        cb(snapOf(out));
      }};
    }
    return origCollection(name);
  };
  function ordersFromShopify(){
    return api({action:"orders"}).then(function(j){return {payload:{orders:j.orders||[],totalCount:j.totalCount||0}}});
  }
  var mcp={
    listTools:function(){return Promise.resolve({servers:[{server:"Google Sheets",authStatus:CFG.url?"connected":"needs_reauth"},{server:"Shopify",authStatus:CFG.url?"connected":"needs_reauth"},{server:"Gmail",authStatus:CFG.url?"connected":"needs_reauth"}]})},
    callTool:function(server,tool,input){
      if(server==="Google Sheets"&&tool==="get_values")return api({action:"get",range:input.range}).then(function(j){return {payload:{values:j.values}}});
      if(server==="Google Sheets"&&tool==="update_values")return api({action:"update",range:input.range,values:input.values}).then(function(){
        if(/^content!/.test(input.range))setTimeout(function(){loadClips().catch(function(){})},800);
        return {payload:{}}});
      if(server==="Shopify"&&tool==="list-orders")return ordersFromShopify();
      if(server==="Gmail"&&tool==="search_threads")return api({action:"gmail"}).then(function(j){if(j.error)throw {code:"upstream_error",message:j.error};return {payload:{threads:[],resultCountEstimate:j.count||0}}});
      return Promise.reject({code:"local_unavailable",message:"לא זמין באפליקציה המקומית ("+server+")."});
    }
  };
  window.claude={use:function(name){
    if(name==="db")return Promise.resolve(db);
    if(name==="mcp")return Promise.resolve(mcp);
    if(name==="user")return Promise.resolve({can:function(){return true}});
    return Promise.resolve(null);
  }};
  setInterval(function(){if(!document.hidden&&CFG.url)loadClips().catch(function(){})},60000);
})();
