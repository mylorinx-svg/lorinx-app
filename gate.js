/* LORINX phone: access gate. Secrets are never stored in the page, only in this phone's localStorage. */
(function(){
  var KEY="lorinx_access";
  function dec(code){try{var o=JSON.parse(decodeURIComponent(escape(atob(String(code).trim()))));if(o&&o.u&&o.t&&/^https:\/\/script\.google\.com\//.test(o.u))return o}catch(e){}return null}
  try{var m=/[#&]k=([^&]+)/.exec(location.hash);if(m){var o=dec(decodeURIComponent(m[1]));if(o)localStorage.setItem(KEY,JSON.stringify(o));history.replaceState(null,"",location.pathname+location.search)}}catch(e){}
  var cfg=null;try{cfg=JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){}
  if(cfg&&cfg.u&&cfg.t){window.LORINX_CFG={url:cfg.u,token:cfg.t};window.LORINX_LOGOUT=function(){localStorage.removeItem(KEY);location.reload()};return}
  window.LORINX_CFG={};window.LORINX_NEEDS_CODE=true;
  document.addEventListener("DOMContentLoaded",function(){
    var d=document.createElement("div");
    d.style.cssText="position:fixed;inset:0;z-index:99999;background:#111;color:#fff;display:flex;align-items:center;justify-content:center;padding:24px;font-family:Arimo,Arial,sans-serif;direction:rtl";
    d.innerHTML='<div style="max-width:420px;width:100%;text-align:center"><div style="font-size:28px;font-weight:700;letter-spacing:.12em;color:#fff">LORINX</div><p style="margin:14px 0 6px">הדבק את קוד הגישה (פעם אחת בטלפון הזה)</p><textarea id="lxcode" rows="5" dir="ltr" style="width:100%;border-radius:10px;border:1px solid #444;background:#1c1c1c;color:#fff;padding:10px;font-size:14px"></textarea><button id="lxgo" style="margin-top:12px;width:100%;padding:12px;border:0;border-radius:10px;background:#C8102E;color:#fff;font-weight:700;font-size:16px">התחבר</button><p id="lxerr" style="color:#ff7a7a;min-height:20px"></p></div>';
    document.body.appendChild(d);
    document.getElementById("lxgo").onclick=function(){
      var o=dec(document.getElementById("lxcode").value),er=document.getElementById("lxerr");
      if(!o){er.textContent="הקוד לא תקין";return}
      er.textContent="בודק...";
      fetch(o.u,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({token:o.t,action:"get",range:"settings!A1:A1"})}).then(function(r){return r.json()}).then(function(j){
        if(j&&j.values){localStorage.setItem(KEY,JSON.stringify(o));location.reload()}else er.textContent="הקוד לא התקבל"}).catch(function(){er.textContent="אין חיבור, נסה שוב"});
    };
  });
})();
