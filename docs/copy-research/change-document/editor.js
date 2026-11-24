/* Review layer: every row can be approved, edited or commented; edits live in the artifact database, not in this file. */
(function () {
  var DATA = JSON.parse(document.getElementById('lx-data').textContent);
  var ROWS = DATA.rows, ITEMS = DATA.items;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var db = null, state = { rows: {}, items: {}, added: {}, general: '', status: null };
  var timers = {}, chain = {}, saving = 0, lastError = '', dirty = {}, seq = 0;
  function touch(k) { dirty[k] = ++seq; return dirty[k]; }
  function settle(k, my) { if (dirty[k] === my) delete dirty[k]; }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  /* text with [[placeholder]] markers and line breaks, set safely */
  function fill(node, raw) {
    node.textContent = '';
    String(raw).split(/(\[\[.+?\]\])/).forEach(function (part) {
      if (/^\[\[.+\]\]$/.test(part)) { node.appendChild(el('span', 'ph', '[' + part.slice(2, -2) + ']')); return; }
      part.split('\n').forEach(function (ln, i) { if (i) node.appendChild(document.createElement('br')); node.appendChild(document.createTextNode(ln)); });
    });
  }

  /* ---------- status bar ---------- */
  var bar = $('#lx-bar');
  function counts() {
    var c = { ok: 0, edit: 0, no: 0, note: 0, add: 0 };
    Object.keys(state.rows).forEach(function (k) {
      var r = state.rows[k];
      if (r.decision === 'ok') c.ok++;
      if (r.decision === 'no') c.no++;
      if (typeof r.text === 'string' && r.text !== '') c.edit++;
      if (r.note) c.note++;
    });
    Object.keys(state.items).forEach(function (k) { if (state.items[k].note) c.note++; });
    c.add = Object.keys(state.added).length;
    if (state.general) c.note++;
    return c;
  }
  function paintBar() {
    if (!bar) return;
    var c = counts(), ready = state.status && state.status.ready;
    $('#lx-count', bar).textContent = c.ok + ' מאושרות · ' + c.edit + ' נערכו · ' + c.no + ' נדחו · ' + c.add + ' נוספו · ' + c.note + ' הערות';
    $('#lx-save', bar).textContent = lastError ? lastError : (saving ? 'שומר…' : (db ? 'נשמר' : ''));
    $('#lx-save', bar).className = lastError ? 'bad' : '';
    var b = $('#lx-ready', bar);
    b.textContent = ready ? 'סומן כמוכן. לחצו לביטול' : 'סיימתי, המסמך מוכן';
    b.className = 'btn' + (ready ? ' on' : ' main');
    $('#lx-ready-note').hidden = !ready;
  }

  /* ---------- writes ---------- */
  function queue(key, fn) {
    saving++; paintBar();
    chain[key] = (chain[key] || Promise.resolve()).then(fn).then(function () { lastError = ''; }, function (e) {
      lastError = 'השמירה נכשלה' + (e && e.code ? ' (' + e.code + ')' : '');
    }).then(function () { saving--; paintBar(); });
  }
  function later(key, ms, fn) { clearTimeout(timers[key]); timers[key] = setTimeout(fn, ms); }

  function rowEmpty(r) { return !r.decision && !r.note && !(typeof r.text === 'string' && r.text !== ''); }
  function saveRow(rid) {
    if (!db) return;
    var r = state.rows[rid] || {}, meta = ROWS[rid], my = touch('r' + rid);
    queue('r' + rid, function () {
      var ref = db.collection('rows').doc(rid);
      var w = rowEmpty(r) ? ref.delete() : ref.set({ rid: rid, item: meta.item, itemTitle: meta.itemTitle, label: meta.label, current: meta.cur, proposed: meta.nw, kind: meta.kind,
        decision: r.decision || '', text: (typeof r.text === 'string' ? r.text : ''), note: r.note || '', at: new Date().toISOString() });
      return w.then(function () { settle('r' + rid, my); });
    });
  }
  function patchRow(rid, patch, debounceMs) {
    var r = Object.assign({}, state.rows[rid] || {}, patch);
    state.rows[rid] = r; touch('r' + rid); paintRow(rid); paintBar();
    if (debounceMs) later('r' + rid, debounceMs, function () { saveRow(rid); }); else saveRow(rid);
  }
  function saveItemNote(id, text) {
    state.items[id] = { note: text }; var my = touch('i' + id); paintBar();
    later('i' + id, 700, function () {
      queue('i' + id, function () {
        var ref = db.collection('items').doc(id);
        return (text ? ref.set({ item: id, itemTitle: ITEMS[id], note: text, at: new Date().toISOString() }) : ref.delete()).then(function () { settle('i' + id, my); });
      });
    });
  }
  function saveGeneral(text) {
    state.general = text; var my = touch('g'); paintBar();
    later('g', 700, function () {
      queue('g', function () {
        var ref = db.doc('meta/general');
        return (text ? ref.set({ text: text, at: new Date().toISOString() }) : ref.delete()).then(function () { settle('g', my); });
      });
    });
  }
  function setReady(on) {
    state.status = { ready: on }; paintBar();
    queue('s', function () { return db.doc('meta/status').set({ ready: on, at: new Date().toISOString(), summary: $('#lx-count', bar).textContent }); });
  }
  function addRow(item, label, text, note) {
    var ref = db.collection('added').doc();
    var data = { id: ref.id, item: item, itemTitle: ITEMS[item], label: label, text: text, note: note, at: new Date().toISOString() };
    state.added[ref.id] = data; paintAdded(item); paintBar();
    queue('a' + ref.id, function () { return ref.set(data); });
  }
  function delAdded(id) {
    var it = state.added[id] && state.added[id].item; delete state.added[id]; if (it) paintAdded(it); paintBar();
    queue('a' + id, function () { return db.collection('added').doc(id).delete(); });
  }

  /* ---------- row UI ---------- */
  function build() {
    $$('tr[data-rid]').forEach(function (tr) {
      var rid = tr.getAttribute('data-rid'), td = $('td.new', tr);
      var shown = el('div', 'val'); fill(shown, ROWS[rid].nw);
      var was = el('div', 'was'); was.hidden = true;
      var ctl = el('div', 'ctl');
      var bOk = el('button', 'chip', 'מאשר'), bNo = el('button', 'chip', 'לא לשנות'), bEd = el('button', 'chip', 'ערוך'), bNt = el('button', 'chip', 'הערה');
      [bOk, bNo, bEd, bNt].forEach(function (b) { b.type = 'button'; });
      bOk.onclick = function () { var d = (state.rows[rid] || {}).decision; patchRow(rid, { decision: d === 'ok' ? '' : 'ok' }); };
      bNo.onclick = function () { var d = (state.rows[rid] || {}).decision; patchRow(rid, { decision: d === 'no' ? '' : 'no' }); };
      var ed = el('div', 'edbox'); ed.hidden = true;
      var ta = document.createElement('textarea'); ta.rows = 4; ta.id = 'ed-' + rid; ta.setAttribute('aria-label', 'נוסח מוצע לעריכה');
      var edRow = el('div', 'edrow'), bSave = el('button', 'chip main', 'שמור את הנוסח שלי'), bReset = el('button', 'chip', 'החזר להצעה המקורית');
      bSave.type = bReset.type = 'button';
      bSave.onclick = function () { var v = ta.value.trim(); patchRow(rid, { text: v === ROWS[rid].nw ? '' : v, decision: v === ROWS[rid].nw ? (state.rows[rid] || {}).decision : 'ok' }); ed.hidden = true; };
      bReset.onclick = function () { ta.value = ROWS[rid].nw; patchRow(rid, { text: '' }); ed.hidden = true; };
      edRow.appendChild(bSave); edRow.appendChild(bReset); ed.appendChild(ta); ed.appendChild(edRow);
      bEd.onclick = function () { var r = state.rows[rid] || {}; ta.value = (typeof r.text === 'string' && r.text) ? r.text : ROWS[rid].nw; ed.hidden = !ed.hidden; if (!ed.hidden) ta.focus(); };
      var nt = el('div', 'ntbox'); nt.hidden = true;
      var nta = document.createElement('textarea'); nta.rows = 2; nta.id = 'nt-' + rid; nta.placeholder = 'הערה לשורה הזאת'; nta.setAttribute('aria-label', 'הערה לשורה');
      nta.oninput = function () { patchRow(rid, { note: nta.value }, 700); };
      nt.appendChild(nta);
      bNt.onclick = function () { nt.hidden = !nt.hidden; if (!nt.hidden) nta.focus(); };
      [bOk, bNo, bEd, bNt].forEach(function (b) { ctl.appendChild(b); });
      td.textContent = ''; td.appendChild(shown); td.appendChild(was); td.appendChild(ctl); td.appendChild(ed); td.appendChild(nt);
      tr._ui = { td: td, shown: shown, was: was, bOk: bOk, bNo: bNo, bNt: bNt, bEd: bEd, nta: nta, nt: nt, ta: ta, ed: ed };
    });
    $$('article.item').forEach(function (art) {
      var id = art.id.toUpperCase();
      var box = el('div', 'itemtools');
      var head = el('div', 'bulk');
      var bAll = el('button', 'chip', 'אשר את כל השורות באזור הזה'); bAll.type = 'button';
      bAll.onclick = function () {
        $$('tr[data-rid]', art).forEach(function (tr) {
          var rid = tr.getAttribute('data-rid'), k = ROWS[rid].kind, r = state.rows[rid] || {};
          if (k === 'keep' || k === 'data' || k === 'approve') return;
          if (!r.decision) patchRow(rid, { decision: 'ok' });
        });
      };
      var bAdd = el('button', 'chip', 'הוסף שורה חדשה'); bAdd.type = 'button';
      head.appendChild(bAll); head.appendChild(bAdd);
      var addBox = el('div', 'addbox'); addBox.hidden = true;
      var l1 = document.createElement('input'); l1.type = 'text'; l1.placeholder = 'איפה (למשל: כותרת, משפט חדש)'; l1.id = 'al-' + id; l1.setAttribute('aria-label', 'איפה');
      var l2 = document.createElement('textarea'); l2.rows = 3; l2.placeholder = 'הטקסט החדש, או מה להוסיף'; l2.id = 'at-' + id; l2.setAttribute('aria-label', 'הטקסט החדש');
      var s = el('button', 'chip main', 'הוסף'); s.type = 'button';
      s.onclick = function () { if (!l2.value.trim()) return; addRow(id, l1.value.trim(), l2.value.trim(), ''); l1.value = l2.value = ''; addBox.hidden = true; };
      addBox.appendChild(l1); addBox.appendChild(l2); addBox.appendChild(s);
      bAdd.onclick = function () { addBox.hidden = !addBox.hidden; if (!addBox.hidden) l1.focus(); };
      var list = el('div', 'addedlist'); list.id = 'added-' + id;
      var inote = document.createElement('textarea'); inote.rows = 2; inote.id = 'in-' + id; inote.placeholder = 'הערה לאזור כולו'; inote.setAttribute('aria-label', 'הערה לאזור');
      inote.oninput = function () { saveItemNote(id, inote.value); };
      box.appendChild(head); box.appendChild(addBox); box.appendChild(list); box.appendChild(inote);
      art.appendChild(box); art._inote = inote;
    });
    var gen = $('#lx-general'); if (gen) gen.oninput = function () { saveGeneral(gen.value); };
    $('#lx-ready').onclick = function () { setReady(!(state.status && state.status.ready)); };
    var ex = $('#lx-export'); if (ex) ex.onclick = exportSummary;
  }

  function paintRow(rid) {
    var tr = $('tr[data-rid="' + rid + '"]'); if (!tr || !tr._ui) return;
    var u = tr._ui, r = state.rows[rid] || {}, edited = typeof r.text === 'string' && r.text !== '';
    fill(u.shown, edited ? r.text : ROWS[rid].nw);
    u.td.classList.toggle('edited', edited);
    u.was.hidden = !edited;
    if (edited) { u.was.textContent = 'הנוסח שהצעתי: ' + ROWS[rid].nw.replace(/\[\[(.+?)\]\]/g, '[$1]').replace(/\n/g, ' / '); }
    u.bOk.classList.toggle('on', r.decision === 'ok'); u.bNo.classList.toggle('on-no', r.decision === 'no');
    u.bOk.setAttribute('aria-pressed', r.decision === 'ok'); u.bNo.setAttribute('aria-pressed', r.decision === 'no');
    u.bEd.classList.toggle('on', edited); u.bNt.classList.toggle('on', !!r.note);
    if (document.activeElement !== u.nta) u.nta.value = r.note || '';
    if (r.note) u.nt.hidden = false;
    tr.classList.toggle('dec-ok', r.decision === 'ok'); tr.classList.toggle('dec-no', r.decision === 'no');
  }
  function paintAdded(item) {
    var list = $('#added-' + item); if (!list) return;
    list.textContent = '';
    Object.keys(state.added).map(function (k) { return state.added[k]; }).filter(function (a) { return a.item === item; })
      .sort(function (a, b) { return String(a.at).localeCompare(String(b.at)); })
      .forEach(function (a) {
        var row = el('div', 'added');
        var h = el('div', 'addh'); h.appendChild(el('span', 'k k-add', 'שורה שהוספת')); if (a.label) h.appendChild(el('b', '', a.label));
        var t = el('div', 'val'); fill(t, a.text);
        var d = el('button', 'chip', 'מחק'); d.type = 'button'; d.onclick = function () { delAdded(a.id); };
        row.appendChild(h); row.appendChild(t); row.appendChild(d); list.appendChild(row);
      });
  }
  function paintAll() {
    Object.keys(ROWS).forEach(paintRow);
    Object.keys(ITEMS).forEach(function (id) {
      paintAdded(id);
      var art = document.getElementById(id.toLowerCase()); if (art && art._inote && document.activeElement !== art._inote) art._inote.value = (state.items[id] || {}).note || '';
    });
    var gen = $('#lx-general'); if (gen && document.activeElement !== gen) gen.value = state.general || '';
    paintBar();
  }

  /* ---------- export of the review as a text file (backup) ---------- */
  function exportSummary() {
    var out = ['# הערות על מסמך שינויי הקופי של LORINX', ''];
    if (state.general) out.push('## הערות כלליות', state.general, '');
    Object.keys(ITEMS).forEach(function (id) {
      var lines = [];
      Object.keys(state.rows).forEach(function (rid) {
        var r = state.rows[rid], m = ROWS[rid]; if (!m || m.item !== id || rowEmpty(r)) return;
        var s = '- ' + m.label + ': ' + (r.decision === 'ok' ? 'מאשר' : r.decision === 'no' ? 'לא לשנות' : 'ללא סימון');
        if (r.text) s += '\n  הנוסח שלי: ' + r.text.replace(/\n/g, ' / ');
        if (r.note) s += '\n  הערה: ' + r.note.replace(/\n/g, ' / ');
        lines.push(s);
      });
      Object.keys(state.added).forEach(function (k) { var a = state.added[k]; if (a.item === id) lines.push('- שורה חדשה' + (a.label ? ' (' + a.label + ')' : '') + ': ' + a.text.replace(/\n/g, ' / ')); });
      if ((state.items[id] || {}).note) lines.push('- הערה לאזור: ' + state.items[id].note);
      if (lines.length) { out.push('## ' + id + ' ' + ITEMS[id]); out = out.concat(lines); out.push(''); }
    });
    claude.use('downloads').then(function (d) { if (d) return d.save({ filename: 'lorinx-copy-review.md', data: out.join('\n') }); }).catch(function () {});
  }

  /* ---------- start ---------- */
  build(); paintBar();
  var warn = $('#lx-warn');
  var loadTimer = setTimeout(function () { if (warn) { warn.hidden = false; warn.textContent = 'לא הצלחתי להתחבר לשמירה עדיין. אפשר לקרוא, והעריכה תופיע כשהחיבור יעלה.'; } }, 10000);
  function off() { clearTimeout(loadTimer); if (warn) warn.hidden = true; }
  function fail(e) { off(); if (warn) { warn.hidden = false; warn.textContent = 'השמירה לא זמינה בתצוגה הזאת' + (e && e.code ? ' (' + e.code + ')' : '') + '. כדי לערוך, פתחו את המסמך מהחשבון שלכם.'; } $$('.ctl, .itemtools, #lx-general-wrap, #lx-bar').forEach(function (n) { n.hidden = true; }); }

  claude.use('db').then(function (d) {
    if (!d) { fail(); return; }
    db = d;
    var first = {};
    function once(k) { if (!first[k]) { first[k] = 1; if (Object.keys(first).length === 4) off(); } }
    db.collection('rows').onSnapshot(function (s) {
      var keep = state.rows; state.rows = {};
      s.docs.forEach(function (x) { var v = x.data(); if (v && ROWS[x.id]) state.rows[x.id] = { decision: v.decision || '', text: v.text || '', note: v.note || '' }; });
      Object.keys(keep).forEach(function (rid) { if (dirty['r' + rid]) state.rows[rid] = keep[rid]; });
      once('r'); paintAll();
    }, fail);
    db.collection('items').onSnapshot(function (s) {
      var keep = state.items; state.items = {};
      s.docs.forEach(function (x) { var v = x.data(); if (v) state.items[x.id] = { note: v.note || '' }; });
      Object.keys(keep).forEach(function (id) { if (dirty['i' + id]) state.items[id] = keep[id]; });
      once('i'); paintAll();
    }, fail);
    db.collection('added').onSnapshot(function (s) {
      state.added = {}; s.docs.forEach(function (x) { var v = x.data(); if (v) state.added[x.id] = v; });
      once('a'); paintAll();
    }, fail);
    db.collection('meta').onSnapshot(function (s) {
      var g = state.general; state.general = ''; state.status = null;
      s.docs.forEach(function (x) { var v = x.data() || {}; if (x.id === 'general') state.general = v.text || ''; if (x.id === 'status') state.status = { ready: !!v.ready }; });
      if (dirty.g) state.general = g;
      once('m'); paintAll();
    }, fail);
  }, fail);
})();
