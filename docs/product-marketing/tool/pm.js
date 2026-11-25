/* Review layer for the product marketing document: per-product status and notes, per-section notes, per-copy-block edits. Everything is stored in the artifact database, keyed by stable ids, so it survives every republish. */
(function () {
  var DATA = JSON.parse(document.getElementById('pm-data').textContent);
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var db = null, state = { status: {}, notes: {}, sec: {}, copy: {}, general: '' };
  var timers = {}, chain = {}, dirty = {}, seq = 0, saving = 0, lastError = '';
  var STATUS = DATA.statuses;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function fill(node, raw) {
    node.textContent = '';
    String(raw).split('\n').forEach(function (ln, i) { if (i) node.appendChild(document.createElement('br')); node.appendChild(document.createTextNode(ln)); });
  }
  function touch(k) { dirty[k] = ++seq; return dirty[k]; }
  function settle(k, my) { if (dirty[k] === my) delete dirty[k]; }
  function queue(key, fn) {
    saving++; paintBar();
    chain[key] = (chain[key] || Promise.resolve()).then(fn).then(function () { lastError = ''; }, function (e) {
      lastError = 'השמירה נכשלה' + (e && e.code ? ' (' + e.code + ')' : '');
    }).then(function () { saving--; paintBar(); });
  }
  function later(key, ms, fn) { clearTimeout(timers[key]); timers[key] = setTimeout(fn, ms); }
  function now() { return new Date().toISOString(); }

  /* ---------- writes ---------- */
  function writeDoc(col, id, key, data, empty) {
    var my = touch(key);
    queue(key, function () {
      var ref = db.collection(col).doc(id);
      return (empty ? ref.delete() : ref.set(data)).then(function () { settle(key, my); });
    });
  }
  function setStatus(p, v) {
    state.status[p] = v; paintProduct(p); paintBar();
    writeDoc('status', p, 's' + p, { product: p, name: DATA.products[p], status: v, at: now() }, !v);
  }
  function setNotes(p, v) {
    state.notes[p] = v; paintBar(); touch('n' + p);
    later('n' + p, 700, function () { writeDoc('notes', p, 'n' + p, { product: p, name: DATA.products[p], text: v, at: now() }, !v); });
  }
  function setSecNote(id, v) {
    state.sec[id] = v; paintBar(); touch('c' + id);
    later('c' + id, 700, function () { writeDoc('sec', id, 'c' + id, { id: id, product: id.split('-')[0], section: DATA.sections[id] || '', text: v, at: now() }, !v); });
  }
  function setCopy(id, patch) {
    var c = Object.assign({}, state.copy[id] || {}, patch); state.copy[id] = c; paintCopy(id); paintBar();
    var orig = DATA.copy[id] || {}, empty = !c.text && !c.decision && !c.note;
    var go = function () { writeDoc('copy', id, 'k' + id, { id: id, product: orig.product, label: orig.label, original: orig.text, text: c.text || '', decision: c.decision || '', note: c.note || '', at: now() }, empty); };
    if (patch.note !== undefined) { touch('k' + id); later('k' + id, 700, go); } else go();
  }
  function setGeneral(v) {
    state.general = v; paintBar(); touch('g');
    later('g', 700, function () { writeDoc('meta', 'general', 'g', { text: v, at: now() }, !v); });
  }

  /* ---------- UI ---------- */
  function noteBox(id, placeholder, value, onInput) {
    var wrap = el('div', 'pm-note');
    var b = el('button', 'chip', 'הערה'); b.type = 'button';
    var ta = document.createElement('textarea'); ta.rows = 3; ta.id = 'nt-' + id; ta.placeholder = placeholder; ta.setAttribute('aria-label', placeholder); ta.hidden = true;
    ta.oninput = function () { onInput(ta.value); };
    b.onclick = function () { ta.hidden = !ta.hidden; if (!ta.hidden) ta.focus(); };
    wrap.appendChild(b); wrap.appendChild(ta); wrap._ta = ta; wrap._b = b;
    return wrap;
  }

  function build() {
    $$('[data-pm-product]').forEach(function (sec) {
      var p = sec.getAttribute('data-pm-product');
      var st = $('[data-pm-status]', sec);
      if (st) {
        STATUS.forEach(function (s) {
          var b = el('button', 'chip st-' + s.k, s.label); b.type = 'button'; b.setAttribute('data-v', s.k);
          b.onclick = function () { setStatus(p, state.status[p] === s.k ? '' : s.k); };
          st.appendChild(b);
        });
      }
      var nt = $('[data-pm-notes]', sec);
      if (nt) {
        var ta = document.createElement('textarea'); ta.rows = 6; ta.id = 'notes-' + p;
        ta.placeholder = 'הערות, תיקונים והחלטות שלך למוצר הזה'; ta.setAttribute('aria-label', 'הערות למוצר');
        ta.oninput = function () { setNotes(p, ta.value); };
        nt.appendChild(ta); sec._notes = ta;
      }
    });
    $$('[data-pm-sec]').forEach(function (h) {
      var id = h.getAttribute('data-pm-sec');
      var box = noteBox(id, 'הערה לסעיף הזה', '', function (v) { setSecNote(id, v); });
      h.appendChild(box); h._box = box;
    });
    $$('[data-pm-copy]').forEach(function (blk) {
      var id = blk.getAttribute('data-pm-copy'), body = $('.pm-copy__text', blk);
      var ctl = el('div', 'ctl');
      var bOk = el('button', 'chip', 'מאשר'), bNo = el('button', 'chip', 'לא מתאים'), bEd = el('button', 'chip', 'ערוך'), bNt = el('button', 'chip', 'הערה');
      [bOk, bNo, bEd, bNt].forEach(function (b) { b.type = 'button'; ctl.appendChild(b); });
      var ed = el('div', 'edbox'); ed.hidden = true;
      var ta = document.createElement('textarea'); ta.rows = 4; ta.id = 'ed-' + id; ta.setAttribute('aria-label', 'נוסח לעריכה');
      var row = el('div', 'edrow'), bS = el('button', 'chip main', 'שמור את הנוסח שלי'), bR = el('button', 'chip', 'החזר לנוסח המקורי');
      bS.type = bR.type = 'button'; row.appendChild(bS); row.appendChild(bR); ed.appendChild(ta); ed.appendChild(row);
      var nt = el('div', 'ntbox'); nt.hidden = true;
      var nta = document.createElement('textarea'); nta.rows = 2; nta.id = 'cn-' + id; nta.placeholder = 'הערה לטקסט הזה'; nta.setAttribute('aria-label', 'הערה לטקסט');
      nt.appendChild(nta);
      var was = el('div', 'was'); was.hidden = true;
      bOk.onclick = function () { setCopy(id, { decision: (state.copy[id] || {}).decision === 'ok' ? '' : 'ok' }); };
      bNo.onclick = function () { setCopy(id, { decision: (state.copy[id] || {}).decision === 'no' ? '' : 'no' }); };
      bEd.onclick = function () { var c = state.copy[id] || {}; ta.value = c.text || DATA.copy[id].text; ed.hidden = !ed.hidden; if (!ed.hidden) ta.focus(); };
      bS.onclick = function () { var v = ta.value.trim(); var same = v === DATA.copy[id].text; setCopy(id, { text: same ? '' : v, decision: same ? (state.copy[id] || {}).decision : 'ok' }); ed.hidden = true; };
      bR.onclick = function () { setCopy(id, { text: '' }); ed.hidden = true; };
      bNt.onclick = function () { nt.hidden = !nt.hidden; if (!nt.hidden) nta.focus(); };
      nta.oninput = function () { setCopy(id, { note: nta.value }); };
      blk.appendChild(was); blk.appendChild(ctl); blk.appendChild(ed); blk.appendChild(nt);
      blk._u = { body: body, was: was, bOk: bOk, bNo: bNo, bEd: bEd, bNt: bNt, nta: nta, nt: nt };
    });
    var gen = $('#pm-general'); if (gen) gen.oninput = function () { setGeneral(gen.value); };
  }

  function paintCopy(id) {
    var blk = $('[data-pm-copy="' + id + '"]'); if (!blk || !blk._u) return;
    var u = blk._u, c = state.copy[id] || {}, edited = !!c.text;
    fill(u.body, edited ? c.text : DATA.copy[id].text);
    blk.classList.toggle('edited', edited); blk.classList.toggle('dec-ok', c.decision === 'ok'); blk.classList.toggle('dec-no', c.decision === 'no');
    u.was.hidden = !edited; if (edited) u.was.textContent = 'הנוסח שהצעתי: ' + DATA.copy[id].text.replace(/\n/g, ' / ');
    u.bOk.classList.toggle('on', c.decision === 'ok'); u.bNo.classList.toggle('on-no', c.decision === 'no');
    u.bEd.classList.toggle('on', edited); u.bNt.classList.toggle('on', !!c.note);
    if (document.activeElement !== u.nta) u.nta.value = c.note || '';
    if (c.note) u.nt.hidden = false;
  }
  function paintProduct(p) {
    var sec = $('[data-pm-product="' + p + '"]'); if (!sec) return;
    $$('[data-pm-status] .chip', sec).forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-v') === state.status[p]); b.setAttribute('aria-pressed', b.getAttribute('data-v') === state.status[p]); });
    if (sec._notes && document.activeElement !== sec._notes) sec._notes.value = state.notes[p] || '';
    var chipTop = $('[data-pm-toc="' + p + '"]');
    if (chipTop) { var s = STATUS.filter(function (x) { return x.k === state.status[p]; })[0]; chipTop.textContent = s ? s.label : 'ממתין לאישור'; chipTop.className = 'tstat st-' + (s ? s.k : 'wait'); }
  }
  function paintAll() {
    Object.keys(DATA.products).forEach(paintProduct);
    $$('[data-pm-sec]').forEach(function (h) {
      var id = h.getAttribute('data-pm-sec'), b = h._box; if (!b) return;
      var v = state.sec[id] || ''; if (document.activeElement !== b._ta) b._ta.value = v;
      if (v) b._ta.hidden = false; b._b.classList.toggle('on', !!v);
    });
    Object.keys(DATA.copy).forEach(paintCopy);
    var gen = $('#pm-general'); if (gen && document.activeElement !== gen) gen.value = state.general || '';
    paintBar();
  }
  function paintBar() {
    var bar = $('#pm-bar'); if (!bar) return;
    var n = 0, ed = 0, ok = 0;
    Object.keys(state.copy).forEach(function (k) { var c = state.copy[k]; if (c.text) ed++; if (c.decision === 'ok') ok++; if (c.note) n++; });
    Object.keys(state.sec).forEach(function (k) { if (state.sec[k]) n++; });
    Object.keys(state.notes).forEach(function (k) { if (state.notes[k]) n++; });
    if (state.general) n++;
    var decided = Object.keys(DATA.products).filter(function (p) { return state.status[p]; }).length;
    $('#pm-count').textContent = decided + ' מתוך ' + Object.keys(DATA.products).length + ' מוצרים עם סטטוס · ' + ok + ' טקסטים אושרו · ' + ed + ' נערכו · ' + n + ' הערות';
    var s = $('#pm-save'); s.textContent = lastError || (saving ? 'שומר…' : (db ? 'נשמר' : '')); s.className = lastError ? 'bad' : '';
  }

  /* ---------- start ---------- */
  build(); paintBar();
  var warn = $('#pm-warn');
  var t = setTimeout(function () { if (warn) { warn.hidden = false; warn.textContent = 'לא הצלחתי להתחבר לשמירה עדיין. אפשר לקרוא, והעריכה תופיע כשהחיבור יעלה.'; } }, 10000);
  function off() { clearTimeout(t); if (warn) warn.hidden = true; }
  function fail(e) { off(); if (warn) { warn.hidden = false; warn.textContent = 'השמירה לא זמינה בתצוגה הזאת' + (e && e.code ? ' (' + e.code + ')' : '') + '. כדי לערוך, פתחו את המסמך מהחשבון שלכם.'; } $$('.ctl, .pm-note, [data-pm-status], [data-pm-notes], #pm-bar, #pm-general-wrap').forEach(function (n) { n.hidden = true; }); }
  claude.use('db').then(function (d) {
    if (!d) { fail(); return; }
    db = d; var first = {};
    function once(k) { first[k] = 1; if (Object.keys(first).length >= 5) off(); }
    function sub(col, apply, key) {
      db.collection(col).onSnapshot(function (s) { apply(s.docs); once(key); paintAll(); }, fail);
    }
    sub('status', function (docs) { var keep = state.status; state.status = {}; docs.forEach(function (x) { var v = x.data(); if (v) state.status[x.id] = v.status || ''; }); Object.keys(keep).forEach(function (p) { if (dirty['s' + p]) state.status[p] = keep[p]; }); }, 's');
    sub('notes', function (docs) { var keep = state.notes; state.notes = {}; docs.forEach(function (x) { var v = x.data(); if (v) state.notes[x.id] = v.text || ''; }); Object.keys(keep).forEach(function (p) { if (dirty['n' + p]) state.notes[p] = keep[p]; }); }, 'n');
    sub('sec', function (docs) { var keep = state.sec; state.sec = {}; docs.forEach(function (x) { var v = x.data(); if (v) state.sec[x.id] = v.text || ''; }); Object.keys(keep).forEach(function (k) { if (dirty['c' + k]) state.sec[k] = keep[k]; }); }, 'c');
    sub('copy', function (docs) { var keep = state.copy; state.copy = {}; docs.forEach(function (x) { var v = x.data(); if (v && DATA.copy[x.id]) state.copy[x.id] = { text: v.text || '', decision: v.decision || '', note: v.note || '' }; }); Object.keys(keep).forEach(function (k) { if (dirty['k' + k]) state.copy[k] = keep[k]; }); }, 'k');
    sub('meta', function (docs) { var g = state.general; state.general = ''; docs.forEach(function (x) { if (x.id === 'general') state.general = (x.data() || {}).text || ''; }); if (dirty.g) state.general = g; }, 'm');
  }, fail);
})();
