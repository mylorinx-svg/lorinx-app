/* LORINX Premium (lx2) — storefront behaviour. No dependencies.
   Progressive enhancement: every form still works as a plain POST if this file fails to load. */
(function () {
  'use strict';
  var d = document;
  var root = d.documentElement;
  root.classList.add('lx-js');
  if (!root.getAttribute('dir')) root.setAttribute('dir', 'rtl');

  var $ = function (s, c) { return (c || d).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || d).querySelectorAll(s)); };
  var routes = window.lxRoutes || { cart: '/cart', add: '/cart/add', change: '/cart/change', root: '/' };

  /* ---------- Panels (menu + cart drawer) ---------- */
  var lastFocus = null;
  function openPanel(panel) {
    if (!panel) return;
    lastFocus = d.activeElement;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    d.body.style.overflow = 'hidden';
    var f = $('[data-lx-close]', panel);
    if (f) setTimeout(function () { f.focus(); }, 60);
  }
  function closePanel(panel) {
    if (!panel) return;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    d.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  d.addEventListener('click', function (e) {
    var opener = e.target.closest('[data-lx-open]');
    if (opener) {
      var id = opener.getAttribute('data-lx-open');
      if (id === 'lx-cart-panel') {
        e.preventDefault();
        refreshDrawer().then(function () { openPanel(d.getElementById(id)); });
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
      var h = $('.lxh');
      if (!h) return;
      e.preventDefault();
      var on = h.classList.toggle('is-search');
      search.setAttribute('aria-expanded', on ? 'true' : 'false');
      if (on) { var i = $('.lxh-search input', h); if (i) i.focus(); }
    }
  });
  d.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var p = $('.lx-panel.is-open');
    if (p) closePanel(p);
    var h = $('.lxh.is-search');
    if (h) h.classList.remove('is-search');
  });

  /* ---------- Cart ---------- */
  function setCount(n) {
    $$('[data-lx-count]').forEach(function (el) {
      el.textContent = n;
      el.hidden = !n;
    });
  }
  function refreshDrawer() {
    var mount = d.getElementById('lx-cart-mount');
    if (!mount) return Promise.resolve();
    return fetch(routes.root + '?section_id=lx2-cart-drawer', { credentials: 'same-origin' })
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var fresh = doc.getElementById('lx-cart-inner');
        if (fresh) {
          mount.innerHTML = '';
          mount.appendChild(fresh);
          var c = fresh.getAttribute('data-count');
          if (c !== null) setCount(parseInt(c, 10) || 0);
        }
      })
      .catch(function () {});
  }
  function changeLine(key, qty, scope) {
    if (scope) scope.classList.add('is-busy');
    return fetch(routes.change + '.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: key, quantity: qty })
    }).then(function (r) { return r.json(); });
  }
  d.addEventListener('click', function (e) {
    var b = e.target.closest('[data-lx-qty]');
    if (!b) return;
    e.preventDefault();
    var key = b.getAttribute('data-key');
    var qty = Math.max(0, parseInt(b.getAttribute('data-lx-qty'), 10) || 0);
    var page = b.closest('[data-lx-cartpage]');
    changeLine(key, qty, b.closest('.lx-cart')).then(function () {
      if (page) { window.location.reload(); } else { refreshDrawer(); }
    }).catch(function () { window.location.href = routes.cart; });
  });

  d.addEventListener('submit', function (e) {
    var form = e.target.closest('form[data-lx-product-form]');
    if (!form || !window.fetch || !window.FormData) return;
    e.preventDefault();
    var btn = $('[type="submit"]', form);
    var err = $('.lx-form__err', form);
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
        return refreshDrawer().then(function () { openPanel(d.getElementById('lx-cart-panel')); });
      })
      .catch(function () { form.removeAttribute('data-lx-product-form'); form.submit(); })
      .then(function () {
        if (btn) { btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy'); }
      });
  });

  /* ---------- Variant / bundle selector ---------- */
  function syncVariant(form, userAction) {
    var picked = $('input[name="id"]:checked', form) || $('select[name="id"] option:checked', form) || $('input[name="id"]', form);
    if (!picked) return;
    var price = picked.getAttribute('data-price');
    var label = picked.getAttribute('data-label') || '';
    var avail = picked.getAttribute('data-available') !== 'false';
    var scope = form.closest('[data-lx-buy]') || d;
    $$('[data-lx-price]', scope).forEach(function (el) { el.textContent = price; });
    $$('[data-lx-cta]', scope).forEach(function (el) {
      el.textContent = avail ? (el.getAttribute('data-add') + ' · ' + price) : el.getAttribute('data-soldout');
      el.disabled = !avail;
    });
    var sticky = d.getElementById('lx-sticky');
    if (sticky && scope.hasAttribute('data-lx-main')) {
      var sp = $('[data-lx-sticky-price]', sticky);
      if (sp) sp.textContent = label ? label + ' · ' + price : price;
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

  /* ---------- Gallery ---------- */
  $$('[data-lx-gallery]').forEach(function (g) {
    var track = $('.lx-gal__track', g);
    var slides = $$('.lx-gal__slide', g);
    var thumbs = $$('.lx-gal__thumb', g);
    if (!track || slides.length < 2) return;
    function mark(i) {
      thumbs.forEach(function (t, n) { t.setAttribute('aria-current', n === i ? 'true' : 'false'); });
    }
    thumbs.forEach(function (t, i) {
      t.addEventListener('click', function () {
        track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft, behavior: 'smooth' });
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

  /* ---------- Sticky add-to-cart ---------- */
  var sticky = d.getElementById('lx-sticky');
  var mainBtn = $('[data-lx-main] [data-lx-cta]');
  if (sticky && mainBtn && 'IntersectionObserver' in window) {
    d.body.classList.add('lx-has-sticky');
    var footer = $('.lx2-footer');
    var btnVisible = true, footVisible = false, passed = false;
    var upd = function () {
      var on = !btnVisible && passed && !footVisible;
      sticky.classList.toggle('is-on', on);
      sticky.setAttribute('aria-hidden', on ? 'false' : 'true');
      $$('button, a', sticky).forEach(function (el) { el.tabIndex = on ? 0 : -1; });
    };
    new IntersectionObserver(function (es) {
      btnVisible = es[0].isIntersecting;
      passed = es[0].boundingClientRect.top < 0;
      upd();
    }).observe(mainBtn);
    if (footer) new IntersectionObserver(function (es) { footVisible = es[0].isIntersecting; upd(); }).observe(footer);
    var go = $('[data-lx-sticky-add]', sticky);
    if (go) go.addEventListener('click', function () {
      var form = mainBtn.closest('form');
      if (form.requestSubmit) form.requestSubmit(mainBtn); else mainBtn.click();
    });
    upd();
  }

  /* ---------- Reveal on scroll ---------- */
  var rv = $$('[data-lx-reveal]');
  if (rv.length) {
    if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var ro = new IntersectionObserver(function (es) {
        es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); ro.unobserve(en.target); } });
      }, { rootMargin: '0px 0px -8% 0px' });
      rv.forEach(function (el) { ro.observe(el); });
    } else {
      rv.forEach(function (el) { el.classList.add('is-in'); });
    }
  }

  $$('form[data-lx-product-form]').forEach(function (f) { syncVariant(f, false); });
})();
