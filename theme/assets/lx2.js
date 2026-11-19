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
     Hero motion: the clip plays ONCE, slows as if time is being caught, and holds on its last
     frame (no loop, no restart). On fine pointers the picture is drawn through an original
     WebGL shader in which the pointer drags the "air": displacement and a slight colour split
     trail behind the cursor and settle back. Touch screens, reduced motion and data-saver get
     the plain video (or just the still) instead.
     ========================================================================== */
  var hv = q('video[data-lx-herovideo]');
  var saveData = navigator.connection && navigator.connection.saveData;
  if (hv && !reduce && !saveData) {
    var heroEl = hv.closest('[data-lx-hero]') || hv.parentElement;
    var bgEl = hv.parentElement;
    var frozen = false, started = false, glOk = false;
    var TRAIL = 12;

    var plainFreeze = function () { frozen = true; };
    var slowDown = function () {
      // ease the playback rate down over the last second, then hold the final frame
      if (frozen || hv.paused) return;
      var rem = hv.duration - hv.currentTime;
      if (rem < 1.15) hv.playbackRate = Math.max(0.1, rem / 1.15);
      if (rem < 0.07) { hv.pause(); plainFreeze(); }
    };

    /* ---- WebGL drag layer ---- */
    var cv = null, gl = null, tex = null, U = {}, ring = [], pos = { x: 0.5, y: 0.5 }, raw = { x: 0.5, y: 0.5 };
    var lastMove = 0, drawRaf = 0, energy = 0, haveFrame = false;
    var DRAG_VERT = 'attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
    var DRAG_FRAG = [
      'precision mediump float;',
      'varying vec2 v; uniform sampler2D tex; uniform vec2 cov; uniform vec2 opos; uniform float asp;',
      'uniform vec2 tp[' + TRAIL + ']; uniform vec2 tv[' + TRAIL + '];',
      'void main(){',
      ' vec2 d=vec2(0.);',
      ' for(int i=0;i<' + TRAIL + ';i++){',
      '  vec2 q=(v-tp[i])*vec2(asp,1.); float w=exp(-dot(q,q)*14.);',
      '  d+=tv[i]*w;',
      ' }',
      ' vec2 s=v-d*.55;',
      ' vec2 sc=vec2(s.x,1.-s.y);',
      ' vec2 a=vec2(sc.x*cov.x+opos.x*(1.-cov.x), sc.y*cov.y+opos.y*(1.-cov.y));',
      ' vec2 sh=d*.22; sh.y=-sh.y; sh*=vec2(cov.x,cov.y);',
      ' float r=texture2D(tex,a+sh).r; float g=texture2D(tex,a).g; float b=texture2D(tex,a-sh).b;',
      ' gl_FragColor=vec4(r,g,b,1.);',
      '}'
    ].join('\n');

    var initGL = function () {
      try {
        cv = d.createElement('canvas');
        cv.className = 'lx-hero__drag';
        cv.setAttribute('aria-hidden', 'true');
        gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
        if (!gl) return false;
        var mk = function (t, src) { var sh = gl.createShader(t); gl.shaderSource(sh, src); gl.compileShader(sh); return sh; };
        var prg = gl.createProgram();
        gl.attachShader(prg, mk(gl.VERTEX_SHADER, DRAG_VERT));
        gl.attachShader(prg, mk(gl.FRAGMENT_SHADER, DRAG_FRAG));
        gl.linkProgram(prg);
        if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) return false;
        gl.useProgram(prg);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
        var loc = gl.getAttribLocation(prg, 'p');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
        ['tex', 'cov', 'opos', 'asp', 'tp', 'tv'].forEach(function (n) { U[n] = gl.getUniformLocation(prg, n); });
        tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.uniform1i(U.tex, 0);
        for (var i = 0; i < TRAIL; i++) ring.push({ x: 0.5, y: 0.5, vx: 0, vy: 0 });
        bgEl.appendChild(cv);
        return true;
      } catch (e) { return false; }
    };
    var sizeCanvas = function () {
      var scale = Math.min(window.devicePixelRatio || 1, 1.25);
      var w = Math.min(1600, Math.round(cv.clientWidth * scale)), h = Math.round(w * cv.clientHeight / Math.max(1, cv.clientWidth));
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
    };
    var uploadFrame = function () {
      try {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, hv);
        haveFrame = true;
        return true;
      } catch (e) { return false; }
    };
    var draw = function () {
      sizeCanvas();
      var ca = cv.width / cv.height, ia = (hv.videoWidth || 16) / (hv.videoHeight || 9);
      var sx = ca > ia ? 1 : ca / ia, sy = ca > ia ? ia / ca : 1;
      gl.uniform2f(U.cov, sx, sy);
      gl.uniform2f(U.opos, window.innerWidth < 750 ? 0.6 : 0.5, 0);
      gl.uniform1f(U.asp, ca);
      var tp = new Float32Array(TRAIL * 2), tv = new Float32Array(TRAIL * 2);
      for (var i = 0; i < TRAIL; i++) { tp[i * 2] = ring[i].x; tp[i * 2 + 1] = ring[i].y; tv[i * 2] = ring[i].vx; tv[i * 2 + 1] = ring[i].vy; }
      gl.uniform2fv(U.tp, tp); gl.uniform2fv(U.tv, tv);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    var step = function () {
      drawRaf = 0;
      slowDown();
      if (!hv.paused && !hv.ended) uploadFrame();
      // pointer easing and the dragged-air trail
      var px = pos.x, py = pos.y;
      pos.x += (raw.x - pos.x) * 0.2; pos.y += (raw.y - pos.y) * 0.2;
      var vx = pos.x - px, vy = pos.y - py;
      energy = 0;
      for (var i = ring.length - 1; i > 0; i--) { ring[i].x = ring[i - 1].x; ring[i].y = ring[i - 1].y; ring[i].vx = ring[i - 1].vx * 0.93; ring[i].vy = ring[i - 1].vy * 0.93; }
      ring[0].x = pos.x; ring[0].y = pos.y; ring[0].vx = Math.max(-0.05, Math.min(0.05, vx * 2.4)); ring[0].vy = Math.max(-0.05, Math.min(0.05, vy * 2.4));
      for (var j = 0; j < ring.length; j++) energy += Math.abs(ring[j].vx) + Math.abs(ring[j].vy);
      if (haveFrame) draw();
      var playing = !hv.paused && !hv.ended;
      if ((playing || energy > 0.0008 || performance.now() - lastMove < 400) && !d.hidden) drawRaf = requestAnimationFrame(step);
    };
    var kick = function () { if (!drawRaf && glOk) drawRaf = requestAnimationFrame(step); };

    /* ---- start: fetch after load, play once, then hold ---- */
    var begin = function () {
      if (started) return;
      started = true;
      hv.muted = true; hv.loop = false;
      hv.crossOrigin = 'anonymous';
      glOk = finePointer && initGL();
      hv.src = hv.getAttribute('data-src');
      hv.addEventListener('canplay', function once() {
        hv.removeEventListener('canplay', once);
        var pr = hv.play();
        var shown = function () {
          if (glOk && uploadFrame()) { cv.classList.add('is-on'); kick(); }
          else { glOk = false; hv.classList.add('is-on'); }
        };
        if (pr && pr.then) pr.then(shown).catch(function () {}); else shown();
      });
      hv.addEventListener('timeupdate', function () { if (!glOk) slowDown(); });
      hv.addEventListener('ended', function () { plainFreeze(); if (glOk) { uploadFrame(); kick(); } });
      hv.load();
    };
    if (d.readyState === 'complete') setTimeout(begin, 700); else window.addEventListener('load', function () { setTimeout(begin, 700); });

    if (finePointer) {
      heroEl.addEventListener('pointermove', function (e) {
        var r = heroEl.getBoundingClientRect();
        raw.x = (e.clientX - r.left) / r.width; raw.y = 1 - (e.clientY - r.top) / r.height;
        lastMove = performance.now();
        kick();
      }, { passive: true });
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        if (!started) return;
        if (es[0].isIntersecting) { if (!frozen && hv.paused && !hv.ended) hv.play().catch(function () {}); kick(); }
        else if (!frozen) hv.pause();
      }).observe(heroEl);
    }
    d.addEventListener('visibilitychange', function () {
      if (!started) return;
      if (d.hidden) { if (!frozen) hv.pause(); } else { if (!frozen && hv.paused) hv.play().catch(function () {}); kick(); }
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
