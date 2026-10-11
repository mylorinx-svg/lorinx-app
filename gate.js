/* LORINX phone: access gate. Secrets are never stored in the page, only in this phone's localStorage. */
(function(){
  /* the page (with its access-code box) is not shown inside another site's frame; a meta CSP cannot set frame-ancestors */
  try{if(window.top!==window.self){document.documentElement.style.display="none";window.LORINX_CFG={};return}}catch(e){document.documentElement.style.display="none";window.LORINX_CFG={};return}
  var KEY="lorinx_access";
  function dec(code){try{var o=JSON.parse(decodeURIComponent(escape(atob(String(code).trim()))));if(o&&o.u&&o.t&&/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(o.u))return o}catch(e){}return null}
  /* the access code is accepted only by pasting it below; it is never read from the URL (URLs end up in history and screenshots) */
  try{if(/[#&]k=/.test(location.hash))history.replaceState(null,"",location.pathname+location.search)}catch(e){}
  /* the server no longer knows this device's code (revoked or rotated): the saved code and cached data are dropped and the code screen is shown, instead of a banner telling the user to do something this screen cannot do */
  window.LORINX_RELOGIN=function(){try{Object.keys(localStorage).filter(function(k){return k===KEY||k==="lorinx_cache_app"||k.indexOf("lorinx_local_")===0}).forEach(function(k){localStorage.removeItem(k)})}catch(e){}location.reload()};
  var cfg=null;try{cfg=JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){}
  if(cfg&&cfg.u&&cfg.t){window.LORINX_CFG={url:cfg.u,token:cfg.t};window.LORINX_LOGOUT=function(){try{var tk=window.LORINX_CFG&&window.LORINX_CFG.token,u=window.LORINX_CFG&&window.LORINX_CFG.url;if(tk&&u){var wipe=function(){try{Object.keys(localStorage).filter(function(k){return k===KEY||k==="lorinx_cache_app"||k.indexOf("lorinx_local_")===0}).forEach(function(k){localStorage.removeItem(k)})}catch(e){}location.reload()};
    var ctl=window.AbortController?new AbortController():null,tm=ctl?setTimeout(function(){ctl.abort()},6000):null;
    /* the token is wiped from this phone only after the server confirms it was revoked; if that cannot be confirmed, the user is told and decides */
    fetch(u,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({token:tk,action:"logout"}),signal:ctl?ctl.signal:undefined}).then(function(r){return r.json()}).then(function(j){if(tm)clearTimeout(tm);if(j&&(j.revoked||j.reason==="master"))wipe();else if(confirm("השרת לא אישר את ביטול הקוד. לנתק מהטלפון בכל זאת? (הקוד ימשיך לעבוד עד שיבוטל בשרת)"))wipe()}).catch(function(){if(tm)clearTimeout(tm);if(confirm("אין חיבור לשרת, אז לא ניתן לבטל את הקוד. לנתק מהטלפון בכל זאת? (הקוד ימשיך לעבוד עד שיבוטל בשרת)"))wipe()});return}
  }catch(e){}};return}
  window.LORINX_CFG={};window.LORINX_NEEDS_CODE=true;
  document.addEventListener("DOMContentLoaded",function(){
    var d=document.createElement("div");
    d.style.cssText="position:fixed;inset:0;z-index:99999;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;padding:24px;font-family:Arimo,Arial,sans-serif;direction:rtl";
    d.innerHTML='<div style="max-width:420px;width:100%;text-align:center"><img src="icon-192.png" alt="LORINX" width="84" height="84" style="border-radius:20px;display:block;margin:0 auto 14px"><div style="font-size:28px;font-weight:700;letter-spacing:.12em;color:#fff">LORINX</div><p style="margin:14px 0 6px">הדבק את קוד הגישה (פעם אחת בטלפון הזה)</p><textarea id="lxcode" aria-label="קוד גישה" rows="5" dir="ltr" style="width:100%;border-radius:10px;border:1px solid #444;background:#1c1c1c;color:#fff;padding:10px;font-size:16px"></textarea><button id="lxgo" style="margin-top:12px;width:100%;padding:12px;border:0;border-radius:10px;background:#C8102E;color:#fff;font-weight:700;font-size:16px">התחבר</button><p id="lxerr" role="alert" style="color:#ff7a7a;min-height:20px"></p></div>';
    document.body.appendChild(d);
    var appEl=document.getElementById("app");if(appEl)appEl.setAttribute("inert","");
    try{document.getElementById("lxcode").focus()}catch(e){}   /* the code box has the cursor, no tap needed (audit 7 U-29) */   /* the app behind the gate is not reachable by keyboard or screen reader */
    document.getElementById("lxgo").onclick=function(){
      var o=dec(document.getElementById("lxcode").value),er=document.getElementById("lxerr"),go=document.getElementById("lxgo");
      if(!o){er.textContent="הקוד לא תקין";return}
      if(go.disabled)return;go.disabled=true;
      er.textContent="בודק...";
      fetch(o.u,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({token:o.t,action:"get",range:"settings!A1:A1"})}).then(function(r){return r.json()}).then(function(j){
        if(j&&j.values){localStorage.setItem(KEY,JSON.stringify(o));location.reload()}else{er.textContent="הקוד לא התקבל";go.disabled=false}}).catch(function(){er.textContent="אין חיבור, נסה שוב";go.disabled=false});
    };
  });
})();
