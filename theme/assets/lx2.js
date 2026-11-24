/* LORINX Premium (lx2) — storefront behaviour and motion. No dependencies.
   Progressive enhancement: every form still works as a plain POST if this file fails to load,
   and every animation is skipped under prefers-reduced-motion. */
(function () {
  'use strict';
  var d = document;
  var root = d.documentElement;
  root.classList.add('lx-js');
  if (!root.getAttribute('dir')) root.setAttribute('dir', 'rtl');

  var q = function (s, c) { return (c || d).querySelector(s); };
  var qa = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var routes = window.lxRoutes || { cart: '/cart', add: '/cart/add', change: '/cart/change', root: '/' };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ==========================================================================
     Panels (menu + cart drawer): focus moves in, is trapped, and returns.
     ========================================================================== */
  var lastFocus = null;
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';
  function setInert(on) {
    qa('main, .lxh, .lx2-footer').forEach(function (el) {
      if (on) el.setAttribute('inert', ''); else el.removeAttribute('inert');
    });
  }
  function openPanel(panel) {
    if (!panel) return;
    var other = q('.lx-panel.is-open');
    if (other && other !== panel) { other.classList.remove('is-open'); other.setAttribute('aria-hidden', 'true'); }
    else if (!other) lastFocus = d.activeElement;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    d.body.style.overflow = 'hidden';
    setInert(true);
    var f = q('button[data-lx-close]', panel);
    if (f) setTimeout(function () { f.focus(); }, 80);
  }
  function closePanel(panel) {
    if (!panel) return;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    d.body.style.overflow = '';
    setInert(false);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  function closeSearch() {
    var h = q('.lxh.is-search');
    if (!h) return;
    h.classList.remove('is-search');
    var tg = q('[data-lx-search]', h);
    if (tg) { tg.setAttribute('aria-expanded', 'false'); tg.focus(); }
  }
  d.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-lx-open]');
    if (opener) {
      var id = opener.getAttribute('data-lx-open');
      if (id === 'lx-cart-panel') {
        if (q('[data-lx-cartpage]')) return; // on the cart page the icon is a plain link
        e.preventDefault();
        refreshDrawer().then(function (ok) {
          if (ok === false) { window.location.href = routes.cart; return; }
          openPanel(d.getElementById(id));
        });
      } else {
        e.preventDefault();
        openPanel(d.getElementById(id));
      }
      return;
    }
    var closer = e.target.closest('[data-lx-close]');
    if (closer) { e.preventDefault(); closePanel(closer.closest('.lx-panel')); return; }
    var search = e.target.closest('[data-lx-search]');
    if (search) {
      var h = q('.lxh');
      if (!h) return;
      e.preventDefault();
      var on = h.classList.toggle('is-search');
      search.setAttribute('aria-expanded', on ? 'true' : 'false');
      if (on) { var i = q('.lxh-search input', h); if (i) i.focus(); }
    }
  });
  d.addEventListener('keydown', function (e) {
    var p = q('.lx-panel.is-open');
    if (e.key === 'Escape') {
      if (p) closePanel(p); else closeSearch();
      return;
    }
    if (e.key !== 'Tab' || !p) return;
    var f = qa(FOCUSABLE, p).filter(function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && d.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && d.activeElement === last) { e.preventDefault(); first.focus(); }
    else if (!p.contains(d.activeElement)) { e.preventDefault(); first.focus(); }
  });

  /* ==========================================================================
     Cart
     ========================================================================== */
  function setCount(n) {
    qa('[data-lx-count]').forEach(function (el) { el.textContent = n; el.hidden = !n; });
  }
  // Resolves true when the drawer was re-rendered, false when it could not be.
  function refreshDrawer() {
    var mount = d.getElementById('lx-cart-mount');
    if (!mount) return Promise.resolve(false);
    return fetch(routes.root + '?section_id=lx2-cart-drawer', { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('section'); return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var fresh = doc.getElementById('lx-cart-inner');
        if (!fresh) return false;
        mount.innerHTML = '';
        mount.appendChild(fresh);
        var c = fresh.getAttribute('data-count');
        if (c !== null) setCount(parseInt(c, 10) || 0);
        return true;
      })
      .catch(function () { return false; });
  }
  function changeLine(key, qty) {
    return fetch(routes.change + '.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: key, quantity: qty })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); });
  }
  d.addEventListener('click', function (e) {
    var b = e.target.closest('[data-lx-qty]');
    if (!b) return;
    e.preventDefault();
    var key = b.getAttribute('data-key');
    var qty = Math.max(0, parseInt(b.getAttribute('data-lx-qty'), 10) || 0);
    var page = b.closest('[data-lx-cartpage]');
    var scope = b.closest('.lx-cart');
    if (scope) scope.classList.add('is-busy');
    changeLine(key, qty).then(function (res) {
      if (page) { window.location.reload(); return; }
      return refreshDrawer().then(function (ok) {
        if (ok === false) { window.location.href = routes.cart; return; }
        if (!res.ok) {
          var note = q('#lx-cart-inner .lx-cart__note');
          if (note) { note.textContent = res.j.description || res.j.message || 'לא ניתן לעדכן את הכמות.'; note.setAttribute('role', 'alert'); }
        }
      });
    }).catch(function () { window.location.href = routes.cart; })
      .then(function () { if (scope) scope.classList.remove('is-busy'); });
  });

  d.addEventListener('submit', function (e) {
    var form = e.target.closest('form[data-lx-product-form]');
    if (!form || !window.fetch || !window.FormData) return;
    e.preventDefault();
    if (form.__lxBusy) return; // a second tap while the request is in flight must not add twice
    form.__lxBusy = true;
    var btn = q('[type="submit"]', form);
    var err = q('.lx-form__err', form);
    if (err) err.hidden = true;
    if (btn) { btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true'); }
    fetch(routes.add + '.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
      body: new FormData(form)
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) {
          if (err) { err.textContent = res.j.description || res.j.message || 'לא הצלחנו להוסיף את המוצר לסל. נסו שוב.'; err.hidden = false; }
          return;
        }
        return refreshDrawer().then(function (ok) {
          if (ok === false) { window.location.href = routes.cart; return; }
          openPanel(d.getElementById('lx-cart-panel'));
        });
      })
      .catch(function () { form.removeAttribute('data-lx-product-form'); form.submit(); })
      .then(function () {
        form.__lxBusy = false;
        if (btn) { btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy'); }
      });
  });

  /* ==========================================================================
     Variant / quantity selector
     ========================================================================== */
  function syncVariant(form, userAction) {
    var picked = q('input[name="id"]:checked', form) || q('select[name="id"] option:checked', form) || q('input[name="id"]', form);
    if (!picked) return;
    var price = picked.getAttribute('data-price');
    var label = picked.getAttribute('data-label') || '';
    var avail = picked.getAttribute('data-available') !== 'false';
    var scope = form.closest('[data-lx-buy]') || d;
    qa('[data-lx-price]', scope).forEach(function (el) { el.textContent = price; });
    qa('[data-lx-cta]', scope).forEach(function (el) {
      el.textContent = avail ? (el.getAttribute('data-add') + ' · ' + price) : el.getAttribute('data-soldout');
      el.disabled = !avail;
    });
    var sticky = d.getElementById('lx-sticky');
    if (sticky && scope.hasAttribute('data-lx-main')) {
      var sp = q('[data-lx-sticky-price]', sticky);
      if (sp) sp.textContent = label ? label + ' · ' + price : price;
      var sa = q('[data-lx-sticky-add]', sticky);
      if (sa) sa.disabled = !avail;
    }
    if (userAction === true && scope.hasAttribute('data-lx-main') && window.history && history.replaceState && picked.value) {
      var u = new URL(window.location.href);
      u.searchParams.set('variant', picked.value);
      history.replaceState({}, '', u.toString());
    }
  }
  d.addEventListener('change', function (e) {
    if (e.target.name === 'id') { var f = e.target.closest('form'); if (f) syncVariant(f, true); }
    if (e.target.matches('[data-lx-sort]')) {
      var u = new URL(window.location.href);
      u.searchParams.set('sort_by', e.target.value);
      u.searchParams.delete('page');
      window.location.href = u.toString();
    }
  });

  /* ==========================================================================
     Gallery
     ========================================================================== */
  qa('[data-lx-gallery]').forEach(function (g) {
    var track = q('.lx-gal__track', g);
    var slides = qa('.lx-gal__slide', g);
    var thumbs = qa('.lx-gal__thumb', g);
    if (!track || slides.length < 2) return;
    function mark(i) { thumbs.forEach(function (t, n) { t.setAttribute('aria-current', n === i ? 'true' : 'false'); }); }
    thumbs.forEach(function (t, i) {
      t.addEventListener('click', function () {
        track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft, behavior: reduce ? 'auto' : 'smooth' });
        mark(i);
      });
    });
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) mark(slides.indexOf(en.target)); });
      }, { root: track, threshold: 0.6 });
      slides.forEach(function (s) { io.observe(s); });
    }
  });

  /* ==========================================================================
     Sticky add-to-cart
     ========================================================================== */
  var sticky = d.getElementById('lx-sticky');
  var mainBtn = q('[data-lx-main] [data-lx-cta]');
  if (sticky && mainBtn && 'IntersectionObserver' in window) {
    d.body.classList.add('lx-has-sticky');
    var footer = q('.lx2-footer');
    var btnVisible = true, footVisible = false, passed = false;
    var upd = function () {
      var on = !btnVisible && passed && !footVisible;
      sticky.classList.toggle('is-on', on);
      sticky.setAttribute('aria-hidden', on ? 'false' : 'true');
      qa('button, a', sticky).forEach(function (el) { el.tabIndex = on ? 0 : -1; });
    };
    new IntersectionObserver(function (es) {
      btnVisible = es[0].isIntersecting;
      passed = es[0].boundingClientRect.top < 0;
      upd();
    }).observe(mainBtn);
    if (footer) new IntersectionObserver(function (es) { footVisible = es[0].isIntersecting; upd(); }).observe(footer);
    var go = q('[data-lx-sticky-add]', sticky);
    if (go) go.addEventListener('click', function () {
      var form = mainBtn.closest('form');
      if (form.requestSubmit) form.requestSubmit(mainBtn); else mainBtn.click();
    });
    upd();
  }

  /* ==========================================================================
     Motion 1 — word-by-word heading reveal
     Headings marked [data-lx-split] are wrapped word by word so each word can rise from
     behind a mask. Text content is unchanged for assistive technology (aria-label keeps
     the sentence whole).
     ========================================================================== */
  function splitWords(el) {
    if (el.__lxSplit) return;
    el.__lxSplit = true;
    var label = el.textContent.replace(/\s+/g, ' ').trim();
    var n = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var parts = c.textContent.split(/(\s+)/);
          var frag = d.createDocumentFragment();
          parts.forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(d.createTextNode(' ')); return; }
            var o = d.createElement('span'); o.className = 'lx-w'; o.setAttribute('aria-hidden', 'true');
            var i = d.createElement('span'); i.textContent = part; i.style.setProperty('--i', n++);
            o.appendChild(i); frag.appendChild(o);
          });
          node.replaceChild(frag, c);
        } else if (c.nodeType === 1 && c.tagName !== 'BR') { walk(c); }
      });
    })(el);
    el.setAttribute('aria-label', label);
  }
  if (!reduce) qa('[data-lx-split]').forEach(splitWords);

  /* ==========================================================================
     Motion 2 — reveal on scroll (fade, rise, image un-mask), with stagger inside groups
     ========================================================================== */
  var rv = qa('[data-lx-reveal], [data-lx-split], [data-lx-unmask]');
  if (rv.length) {
    if ('IntersectionObserver' in window && !reduce) {
      var ro = new IntersectionObserver(function (es) {
        es.forEach(function (en) {
          if (!en.isIntersecting) return;
          var el = en.target;
          var sibs = el.parentElement ? qa(':scope > [data-lx-reveal]', el.parentElement) : [];
          var idx = sibs.indexOf(el);
          if (idx > 0) el.style.transitionDelay = Math.min(idx * 70, 420) + 'ms';
          el.classList.add('is-in');
          ro.unobserve(el);
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });
      rv.forEach(function (el) { ro.observe(el); });
    } else {
      rv.forEach(function (el) { el.classList.add('is-in'); });
    }
  }
  // Intro: mark the document ready on the next frame so hero choreography starts after first paint.
  requestAnimationFrame(function () { requestAnimationFrame(function () { root.classList.add('lx-ready'); }); });
  try { sessionStorage.setItem('lxSeen', '1'); } catch (e) {}

  /* ==========================================================================
     Motion 3 — scroll-linked parallax and progress, one rAF loop
     ========================================================================== */
  var par = qa('[data-lx-parallax]');
  var prog = qa('[data-lx-progress]');
  if (!reduce && (par.length || prog.length)) {
    var ticking = false;
    var frame = function () {
      ticking = false;
      var vh = window.innerHeight;
      par.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        var k = parseFloat(el.getAttribute('data-lx-parallax')) || 0.1;
        var off = (r.top + r.height / 2 - vh / 2) * k;
        el.style.setProperty('--lx-py', off.toFixed(1) + 'px');
      });
      prog.forEach(function (el) {
        var r = el.getBoundingClientRect();
        var p = Math.max(0, Math.min(1, (vh * 0.75 - r.top) / (r.height || 1)));
        el.style.setProperty('--lx-p', p.toFixed(3));
      });
    };
    var onScroll = function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    frame();
  }

  /* ==========================================================================
     Motion 4 — pointer glow on glass surfaces (desktop pointers only)
     ========================================================================== */
  if (finePointer && !reduce) {
    d.addEventListener('pointermove', function (e) {
      var t = e.target.closest ? e.target.closest('[data-lx-glow]') : null;
      if (!t) return;
      var r = t.getBoundingClientRect();
      t.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      t.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  }

  // The header is transparent over the hero and gains its glass bar once the page scrolls.
  var setScrolled = function () { root.classList.toggle('lx-scrolled', window.scrollY > 24); };
  window.addEventListener('scroll', setScrolled, { passive: true });
  setScrolled();

  /* ==========================================================================
     Hero motion: the 3.2 s clip of the runners loops forever and cuts straight back to the
     start when it ends (no fade, and the echo is reset so no ghost carries over). It is drawn through a small WebGL pipeline: pass 1 keeps a short per-channel
     "echo" of the previous frames, so moving things leave a soft colour smear (red lags most,
     blue least) while the still background stays sharp; pass 2 adds a gentle blur that grows
     toward the edges. Nothing reacts to the pointer. Without WebGL the plain looping video is
     shown; reduced motion and data-saver get the still image.
     ========================================================================== */
  var hv = q('video[data-lx-herovideo]');
  var saveData = navigator.connection && navigator.connection.saveData;
  if (hv && !reduce && !saveData) {
    var heroEl = hv.closest('[data-lx-hero]') || hv.parentElement;
    var bgEl = hv.parentElement;
    var started = false, glOk = false, drawRaf = 0, lastDraw = 0, first = true, vis = true, lastT = 0;
    // smear strength per channel, expressed per 1/60 s (higher = longer trail)
    var KEEP = [0.94, 0.9, 0.84];
    var BLUR_BASE = 0.7, BLUR_EDGE = 4.0;
    var cv = null, gl = null, vtex = null, ptex = [null, null], pfb = [null, null], progs = {}, buf = null, cur = 0, fw = 0, fh = 0;
    var DRAG_VERT = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
    var ECHO_FRAG = [
      'precision mediump float;',
      'varying vec2 v; uniform sampler2D vid; uniform sampler2D prev; uniform vec2 cov; uniform vec2 opos; uniform vec3 keep;',
      'void main(){',
      ' vec2 sc=vec2(v.x,1.-v.y);',
      ' vec2 a=vec2(sc.x*cov.x+opos.x*(1.-cov.x), sc.y*cov.y+opos.y*(1.-cov.y));',
      ' vec3 c=texture2D(vid,a).rgb; vec3 p=texture2D(prev,v).rgb;',
      ' gl_FragColor=vec4(mix(c,p,keep),1.);',
      '}'
    ].join('\n');
    var BLUR_FRAG = [
      'precision mediump float;',
      'varying vec2 v; uniform sampler2D img; uniform vec2 px; uniform float asp; uniform vec2 fc; uniform vec2 br;',
      'void main(){',
      ' float dd=length((v-fc)*vec2(asp,1.));',
      ' float r=br.x+br.y*smoothstep(.28,1.,dd);',
      ' vec2 o=px*r;',
      ' vec3 c=texture2D(img,v).rgb*.2;',
      ' c+=(texture2D(img,v+vec2(o.x,0.)).rgb+texture2D(img,v-vec2(o.x,0.)).rgb+texture2D(img,v+vec2(0.,o.y)).rgb+texture2D(img,v-vec2(0.,o.y)).rgb)*.1;',
      ' c+=(texture2D(img,v+o*.7).rgb+texture2D(img,v-o*.7).rgb+texture2D(img,v+vec2(o.x,-o.y)*.7).rgb+texture2D(img,v+vec2(-o.x,o.y)*.7).rgb)*.1;',
      ' gl_FragColor=vec4(c,1.);',
      '}'
    ].join('\n');

    var mkProg = function (fs) {
      var mk = function (t, src) { var sh = gl.createShader(t); gl.shaderSource(sh, src); gl.compileShader(sh); return sh; };
      var pr = gl.createProgram();
      gl.attachShader(pr, mk(gl.VERTEX_SHADER, DRAG_VERT));
      gl.attachShader(pr, mk(gl.FRAGMENT_SHADER, fs));
      gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error('link');
      var o = { pr: pr, u: {} };
      var n = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS);
      for (var i = 0; i < n; i++) { var nm = gl.getActiveUniform(pr, i).name; o.u[nm] = gl.getUniformLocation(pr, nm); }
      return o;
    };
    var newTex = function () {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    };
    var allocTargets = function (w, h) {
      for (var i = 0; i < 2; i++) {
        if (!ptex[i]) { ptex[i] = newTex(); pfb[i] = gl.createFramebuffer(); }
        gl.bindTexture(gl.TEXTURE_2D, ptex[i]);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, pfb[i]);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, ptex[i], 0);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      fw = w; fh = h; first = true;
    };
    var initGL = function () {
      try {
        cv = d.createElement('canvas');
        cv.className = 'lx-hero__drag';
        cv.setAttribute('aria-hidden', 'true');
        gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
        if (!gl) return false;
        progs.echo = mkProg(ECHO_FRAG);
        progs.blur = mkProg(BLUR_FRAG);
        buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        vtex = newTex();
        bgEl.appendChild(cv);
        return true;
      } catch (e) { return false; }
    };
    var bind = function (prog) {
      gl.useProgram(prog.pr);
      var loc = gl.getAttribLocation(prog.pr, 'p');
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    };
    var upload = function () {
      try {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, vtex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, hv);
        return true;
      } catch (e) { return false; }
    };
    var draw = function (now) {
      var small = window.innerWidth < 750;
      var scale = Math.min(window.devicePixelRatio || 1, 1.25);
      var w = Math.min(small ? 900 : 1600, Math.round(cv.clientWidth * scale));
      var h = Math.round(w * cv.clientHeight / Math.max(1, cv.clientWidth));
      if (w < 2 || h < 2) return;
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      if (w !== fw || h !== fh) allocTargets(w, h);
      var dt = Math.min(0.1, Math.max(0.008, (now - (lastDraw || now - 16)) / 1000));
      lastDraw = now;
      var ca = w / h, ia = (hv.videoWidth || 16) / (hv.videoHeight || 9);
      var sx = ca > ia ? 1 : ca / ia, sy = ca > ia ? ia / ca : 1;
      var Z = small ? 1.08 : 1.18; sx /= Z; sy /= Z; // move in closer to the runners
      var next = 1 - cur;
      // pass 1: echo into the other target
      bind(progs.echo);
      gl.bindFramebuffer(gl.FRAMEBUFFER, pfb[next]);
      gl.viewport(0, 0, w, h);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, vtex); gl.uniform1i(progs.echo.u.vid, 0);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, ptex[cur]); gl.uniform1i(progs.echo.u.prev, 1);
      gl.uniform2f(progs.echo.u.cov, sx, sy);
      gl.uniform2f(progs.echo.u.opos, small ? 0.3 : 0.25, small ? 0.3 : 0.4);
      var f = dt * 60;
      var k = first ? [0, 0, 0] : [Math.pow(KEEP[0], f), Math.pow(KEEP[1], f), Math.pow(KEEP[2], f)];
      gl.uniform3f(progs.echo.u.keep, k[0], k[1], k[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      // pass 2: soft blur to the screen
      bind(progs.blur);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, w, h);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, ptex[next]); gl.uniform1i(progs.blur.u.img, 0);
      gl.uniform2f(progs.blur.u.px, 1 / w, 1 / h);
      gl.uniform1f(progs.blur.u.asp, ca);
      gl.uniform2f(progs.blur.u.fc, 0.36, 0.5);
      gl.uniform2f(progs.blur.u.br, BLUR_BASE * (w / 1440), BLUR_EDGE * (w / 1440));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      cur = next; first = false;
    };
    var frame = function (now) {
      drawRaf = 0;
      if (!vis || d.hidden) return;
      if (now - lastDraw >= 30 && hv.readyState >= 2) {
        // the clip wrapped around: cut straight back to the start with no ghost of the last frames
        if (hv.currentTime < lastT - 0.4) first = true;
        lastT = hv.currentTime;
        if (!upload()) { glOk = false; cv.parentNode && cv.parentNode.removeChild(cv); hv.classList.add('is-on'); return; }
        draw(now);
        if (!cv.classList.contains('is-on')) cv.classList.add('is-on');
      }
      drawRaf = requestAnimationFrame(frame);
    };
    var kick = function () { if (!drawRaf && glOk) drawRaf = requestAnimationFrame(frame); };

    var begin = function () {
      if (started) return;
      started = true;
      hv.muted = true; hv.loop = true;
      hv.crossOrigin = 'anonymous';
      glOk = initGL();
      hv.src = hv.getAttribute('data-src');
      hv.addEventListener('canplay', function once() {
        hv.removeEventListener('canplay', once);
        var pr = hv.play();
        var shown = function () { if (glOk) kick(); else hv.classList.add('is-on'); };
        if (pr && pr.then) pr.then(shown).catch(function () {}); else shown();
      });
      hv.load();
    };
    if (d.readyState === 'complete') setTimeout(begin, 700); else window.addEventListener('load', function () { setTimeout(begin, 700); });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        vis = es[0].isIntersecting;
        if (!started) return;
        if (vis) { if (hv.paused) hv.play().catch(function () {}); lastDraw = 0; first = true; kick(); } else { hv.pause(); }
      }).observe(heroEl);
    }
    d.addEventListener('visibilitychange', function () {
      if (!started) return;
      if (d.hidden) hv.pause(); else if (vis) { hv.play().catch(function () {}); lastDraw = 0; first = true; kick(); }
    });
  }

  /* ==========================================================================
     Motion 5 — "ember" aura: an original WebGL fragment shader (domain-warped noise in
     the device's own red light). Drawn at reduced resolution, capped at ~30fps, paused
     when off-screen or when the tab is hidden. Falls back to a CSS gradient.
     ========================================================================== */
  var FRAG = [
    'precision mediump float;',
    'uniform vec2 r; uniform float t; uniform vec2 m; uniform float k;',
    'float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
    ' return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}',
    'float fbm(vec2 p){float a=.5,s=0.;for(int i=0;i<5;i++){s+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return s;}',
    'void main(){',
    ' vec2 uv=(gl_FragCoord.xy-.5*r)/min(r.x,r.y);',
    ' vec2 p=uv*1.35; float tt=t*.045;',
    ' vec2 a=vec2(fbm(p+tt),fbm(p+vec2(5.2,1.3)-tt));',
    ' vec2 b=vec2(fbm(p+2.6*a+vec2(1.7,9.2)+tt*1.4),fbm(p+2.6*a+vec2(8.3,2.8)-tt*1.1));',
    ' float f=fbm(p+3.1*b+m*.35);',
    ' vec2 c0=vec2(.18*sin(tt*1.7)+m.x*.12,-.04+.1*cos(tt*1.3)+m.y*.1);',
    ' float dd=length(uv-c0);',
    ' vec3 col=vec3(.012,.012,.012);',
    ' col=mix(col,vec3(.36,.035,.02),smoothstep(.28,.72,f));',
    ' col=mix(col,vec3(.93,.30,.15),smoothstep(.56,.92,f)*.85);',
    ' col+=vec3(1.,.74,.52)*pow(max(f-.70,0.)*3.2,2.)*.55;',
    ' col*=smoothstep(1.15,.08,dd);',
    ' col+=vec3(.5,.07,.03)*smoothstep(.55,0.,dd)*.22;',
    ' float g=h(gl_FragCoord.xy+t)*.035-.0175;',
    ' gl_FragColor=vec4(max(col*k+g,0.),1.);',
    '}'
  ].join('\n');
  function aura(canvas) {
    var gl;
    try { gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' }); } catch (e) { gl = null; }
    if (!gl) { canvas.classList.add('is-fallback'); return; }
    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    var prg = gl.createProgram();
    gl.attachShader(prg, sh(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'));
    gl.attachShader(prg, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prg);
    if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) { canvas.classList.add('is-fallback'); return; }
    gl.useProgram(prg);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prg, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var uR = gl.getUniformLocation(prg, 'r'), uT = gl.getUniformLocation(prg, 't'), uM = gl.getUniformLocation(prg, 'm'), uK = gl.getUniformLocation(prg, 'k');
    var intensity = parseFloat(canvas.getAttribute('data-lx-aura')) || 1;
    var mx = 0, my = 0, tx = 0, ty = 0, visible = false, raf = 0, last = 0, t0 = performance.now() - Math.random() * 40000;
    function size() {
      var scale = Math.min(window.devicePixelRatio || 1, 1.5) * 0.5;
      var w = Math.max(2, Math.round(canvas.clientWidth * scale)), hgt = Math.max(2, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== hgt) { canvas.width = w; canvas.height = hgt; gl.viewport(0, 0, w, hgt); }
    }
    function draw(now) {
      size();
      mx += (tx - mx) * 0.04; my += (ty - my) * 0.04;
      gl.uniform2f(uR, canvas.width, canvas.height);
      gl.uniform1f(uT, (now - t0) / 1000);
      gl.uniform2f(uM, mx, my);
      gl.uniform1f(uK, intensity);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    function loop(now) {
      raf = 0;
      if (!visible || d.hidden) return;
      if (now - last > 32) { last = now; draw(now); }
      raf = requestAnimationFrame(loop);
    }
    function start() { if (!raf && visible && !d.hidden && !reduce) raf = requestAnimationFrame(loop); }
    draw(performance.now());
    canvas.classList.add('is-live');
    if (reduce) return; // one still frame
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; start(); }).observe(canvas);
    } else { visible = true; start(); }
    d.addEventListener('visibilitychange', start);
    if (finePointer) {
      window.addEventListener('pointermove', function (e) {
        tx = (e.clientX / window.innerWidth - 0.5) * 2; ty = -(e.clientY / window.innerHeight - 0.5) * 2;
      }, { passive: true });
    }
  }
  qa('canvas[data-lx-aura]').forEach(aura);

  qa('form[data-lx-product-form]').forEach(function (f) { syncVariant(f, false); });
})();

/* category rows: arrows appear only when the row really scrolls */
(function () {
  var rows = document.querySelectorAll('[data-rail]');
  if (!rows.length) return;
  Array.prototype.forEach.call(rows, function (rail) {
    var head = rail.closest('.lx-wrap'), nav = head && head.querySelector('[data-rail-nav]');
    if (!nav) return;
    var btns = nav.querySelectorAll('button');
    function step() { var li = rail.firstElementChild; return li ? li.getBoundingClientRect().width + 24 : 300; }
    function update() {
      var max = rail.scrollWidth - rail.clientWidth, pos = Math.abs(rail.scrollLeft);
      nav.hidden = max < 8;
      if (btns[0]) btns[0].disabled = pos < 4;
      if (btns[1]) btns[1].disabled = pos > max - 4;
    }
    Array.prototype.forEach.call(btns, function (b) {
      b.addEventListener('click', function () {
        var dir = Number(b.getAttribute('data-rail-dir')), rtl = getComputedStyle(rail).direction === 'rtl';
        rail.scrollBy({ left: dir * step() * (rtl ? -1 : 1), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      });
    });
    rail.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });
})();

/* statement rows: opacity follows the distance from the middle of the screen */
(function () {
  var list = document.querySelector('[data-stmt]');
  if (!list || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  var rows = Array.prototype.slice.call(list.children), ticking = false;
  function paint() {
    ticking = false;
    var vh = window.innerHeight || 800, mid = vh / 2;
    rows.forEach(function (r) {
      var b = r.getBoundingClientRect(), c = b.top + b.height / 2, d = Math.abs(c - mid) / (vh * 0.42);
      r.style.setProperty('--lx-p', String(Math.max(0.16, Math.min(1, 1.15 - d)).toFixed(3)));
    });
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  paint();
})();
