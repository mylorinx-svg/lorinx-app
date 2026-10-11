/*
 * מתאם בין לשוניות הגיליון (LORINX Brain) למבנה שהמנוע מצפה לו.
 * קלט: מערכי שורות כפי שמחזירים Sheets API / Apps Script (שורה ראשונה = כותרות).
 * פלט: אובייקט data ל-LorinxEngine.summarize. אין כאן חישובים.
 *
 * נרמול (כאן ולא במנוע): מספרים כמו "1,000" או "₪1,000.50", סטטוסים באותיות גדולות, ערכי כן/לא ("1", "כן"),
 * תאריכים בכל הצורות הנפוצות (Date, "02/10/2026", "2.10.2026", ISO) ל-YYYY-MM-DD.
 * ערך שלא ניתן לפרסר לא הופך בשקט ל-0: הוא נרשם ב-data.issues, והשדה מקבל null או שההזמנה מסומנת invalid.
 */
var LorinxSheetAdapter = (function () {
  'use strict';
  var issues = [];
  function isolated(f) { return function () { var saved = issues; issues = []; try { return f.apply(null, arguments); } finally { issues = saved; } }; } // קריאה ישירה לפונקציה מיוצאת לא צוברת issues לנצח
  function issue(tab, row, field, value, why) { issues.push({ tab: tab, row: row, field: field, value: value === undefined ? '' : String(value), why: why }); }

  // כותרת מנורמלת: בלי BOM, NBSP ורווחים בקצוות. אותה פונקציה גם ב-table וגם ב-checkHeaders (אחרת הבדיקה עוברת והעמודה אובדת)
  function normHeader(h) { return String(h == null ? '' : h).replace(/[\ufeff\u00a0]/g, ' ').trim(); }
  function blank(c) { return c === '' || c == null || (typeof c === 'string' && c.replace(/[\s\u00a0\ufeff]/g, '') === ''); }
  function table(rows) {
    if (!rows || !rows.length) return [];
    var h = (rows[0] || []).map(normHeader), out = [], seenH = {};
    h.forEach(function (n) { if (n && seenH[n]) issue('header', 1, n, '', 'כותרת כפולה: העמודה הימנית דורסת את השמאלית'); seenH[n] = 1; });
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i]; if (!r || r.every(blank)) continue;
      var o = { _row: i + 1 }; for (var j = 0; j < h.length; j++) o[h[j]] = r[j] === undefined ? '' : (typeof r[j] === 'string' && blank(r[j]) ? '' : r[j]);
      out.push(o);
    }
    return out;
  }

  // מספר: '' או null = ברירת מחדל (def); "1,000" / "₪ 1,000.5" / " 12 " = המספר; כל דבר אחר = null ורישום ב-issues
  function parseNum(v) {
    if (v === '' || v == null) return undefined;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var raw = String(v);
    if (/^[\s\u00a0₪$,\-–]*$/.test(raw)) return undefined;             // '', '-', רווחים = ריק = ברירת מחדל
    if (/,\d{1,2}$/.test(raw.trim())) return null;   // פסיק עשרוני (1.234,5) לא נקרא בשקט
    var t = raw.replace(/[\s\u00a0₪$,]/g, '').replace(/^\((.*)\)$/, '-$1');
    if (t === '' || !/^[-+]?(\d+\.?\d*|\.\d+)$/.test(t)) return null;
    return Number(t);
  }
  function num(v, tab, row, field, def) {
    var n = parseNum(v);
    if (n === undefined) return def === undefined ? 0 : def;
    if (n === null) { issue(tab, row, field, v, 'לא מספר'); return null; }
    return n;
  }
  // סכום בשלמים (אגורות/סנטים/כמות): בלי נקודה עשרונית. '1.000' (אלפים אירופאי), '100.5' ו-'$12.50' בשדה אגורות הם טעות בקנה מידה, לא מספר: null + issue
  function money(v, tab, row, field, def, required) {
    var n = parseNum(v);
    if (n === undefined && required) { issue(tab, row, field, v, 'ערך חובה חסר'); return null; } // '', '-' ורווחים בשדה חובה אינם 0
    if (n === undefined) return def === undefined ? 0 : def;
    if (n === null) { issue(tab, row, field, v, 'לא מספר'); return null; }
    if (typeof v === 'string' && v.indexOf('.') >= 0) { issue(tab, row, field, v, 'שדה בשלמים (אגורות/סנטים) מכיל נקודה עשרונית'); return null; }
    if (!Number.isInteger(n)) { issue(tab, row, field, v, 'שדה בשלמים (אגורות/סנטים) אינו מספר שלם'); return null; }
    return n;
  }
  // סכום/כמות שאינם יכולים להיות שליליים (הוצאת פרסום, עלות רכש, כמות, הנחה, משלוח, הוצאה): שלילי = טעות, null + issue
  function mnn(v, tab, row, field, def, required) {
    var n = money(v, tab, row, field, def, required);
    if (n != null && n < 0) { issue(tab, row, field, v, 'ערך שלילי אינו תקין בשדה הזה'); return null; }
    return n;
  }
  function idStr(v, tab, row, field) { // מזהה גדול שהוצג כמספר מאבד ספרות (מעל 2^53)
    if (typeof v === 'number' && !Number.isSafeInteger(v)) { issue(tab, row, field, v, 'מזהה גדול מדי כמספר: חייב להיות טקסט'); return String(v); }
    return String(v == null ? '' : v);
  }
  var TRUE_SET = { 'true': 1, '1': 1, 'yes': 1, 'y': 1, 'כן': 1, 'v': 1, '✓': 1, '✔': 1, 'x': 1, 'on': 1 };
  var FALSE_SET = { 'false': 1, '0': 1, 'no': 1, 'n': 1, 'לא': 1, 'off': 1 };
  // דגל: ריק = false. ערך לא ריק שאינו בקבוצות המוכרות הוא issue (ונקרא true, השמרני: הזמנת בדיקה/דוגמה לא נספרת כהכנסה אמיתית), לא false בשקט
  function bool(v, tab, row, field) {
    if (v === true || v === 1) return true;
    if (v === false || v === 0 || v == null) return false;
    var t = String(v).trim().toLowerCase();
    if (t === '' || FALSE_SET[t]) return false;
    if (TRUE_SET[t]) return true;
    if (tab) issue(tab, row, field, v, 'ערך דגל לא מוכר (צפוי כן/לא, TRUE/FALSE, 1/0)');
    return true;
  }
  var CONF_SET = { VERIFIED: 1, MANUAL: 1, ESTIMATED: 1, STALE: 1, MISSING: 1 };
  // תווית אמינות: ריק = ברירת מחדל; תווית שאינה אחת מחמש היא issue והופכת ל-MISSING (לא מנצחת את MISSING בשקט)
  function conf(v, def, tab, row, field) {
    var t = enumU(v); if (!t) return def;
    if (CONF_SET[t]) return t;
    issue(tab, row, field, v, 'תווית אמינות לא מוכרת'); return 'MISSING';
  }
  function enumU(v) { return String(v == null ? '' : v).trim().toUpperCase().replace(/[\s-]+/g, '_'); }
  var nul = function (v) { return v === '' || v == null ? null : v; };

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function validYmd(y, m, d) { if (m < 1 || m > 12 || d < 1) return false; return d <= new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  var _ilFmt = null;
  function dateOfDate(d) { // Date של Sheets/Apps Script -> יום קלנדרי לפי שעון ישראל
    if (isNaN(d.getTime())) return null;
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      if (!_ilFmt) _ilFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' });
      return _ilFmt.format(d);
    }
    return d.toISOString().slice(0, 10);
  }
  // תאריך יום: מחזיר 'YYYY-MM-DD' או null (ריק / לא תקין)
  function parseDay(v) {
    if (v === '' || v == null) return null;
    if (v instanceof Date) return dateOfDate(v);
    var t = String(v).trim(), m;
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}.*(Z|[+-]\d{2}:?\d{2})$/i.test(t)) { var dt = new Date(t.replace(' ', 'T')); if (!isNaN(dt.getTime())) return dateOfDate(dt); } // חותמת עם אזור: היום לפי שעון ישראל, לא לפי UTC
    if ((m = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/.exec(t))) return validYmd(+m[1], +m[2], +m[3]) ? m[1] + '-' + m[2] + '-' + m[3] : null;
    if ((m = /^(\d{1,2})([\/.\-])(\d{1,2})[\/.\-](\d{4})(?:$|[\s,T])/.exec(t))) {
      var d = +m[1], mo = +m[3], y = +m[4];
      if ((m[2] === '/' || m[2] === '-') && d <= 12 && mo <= 12 && d !== mo) return null; // 02/10/2026 נקרא אחרת בלוקאל אמריקאי: דו-משמעי, נדחה. נקודה (2.10.2026) נקראת יום.חודש כמקובל בישראל
      return validYmd(y, mo, d) ? y + '-' + pad(mo) + '-' + pad(d) : null;
    }
    return null;
  }
  function day(v, tab, row, field) {
    var d = parseDay(v);
    if (d === null && v !== '' && v != null) issue(tab, row, field, v, 'תאריך לא תקין');
    return d;
  }
  // חותמת זמן להזמנה: ISO נשמר כמות שהוא (המנוע ממיר לשעון ישראל); Date -> ISO; תאריך בלבד -> היום
  function stamp(v, tab, row, field) {
    if (v === '' || v == null) { issue(tab, row, field, v, 'חסר תאריך'); return null; }
    if (v instanceof Date) { if (isNaN(v.getTime())) { issue(tab, row, field, v, 'תאריך לא תקין'); return null; } return v.toISOString(); }
    var t = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(t) && !isNaN(Date.parse(t.replace(' ', 'T')))) return t.replace(' ', 'T'); // שעה נשמרת (גם בפורמט עם רווח)
    var d = parseDay(t); if (d) return d;
    issue(tab, row, field, v, 'תאריך לא תקין'); return null;
  }

  var FIN_STATUS = { PAID: 1, PENDING: 1, AUTHORIZED: 1, PARTIALLY_PAID: 1, PARTIALLY_REFUNDED: 1, REFUNDED: 1, VOIDED: 1, EXPIRED: 1 };
  function orders(ordersRows, linesRows, refundsRows) {
    var lines = {}, refunds = {}, seenLine = {}, seenRefund = {}, orderIds = {};
    var oTable = table(ordersRows);
    oTable.forEach(function (o) { orderIds[idStr(o.order_id, 'orders_v2', o._row, 'order_id')] = 1; });
    table(linesRows).forEach(function (l) {
      var oid = idStr(l.order_id, 'order_lines', l._row, 'order_id');
      if (bool(l.removed_in_shopify, 'order_lines', l._row, 'removed_in_shopify')) return; // שורה שהוסרה בשופיפיי (עריכת הזמנה): לא נספרת
      var lid = idStr(l.line_id, 'order_lines', l._row, 'line_id');
      if (lid && seenLine[lid]) issue('order_lines', l._row, 'line_id', lid, 'line_id כפול: אותה שורת מוצר פעמיים');
      if (lid) seenLine[lid] = 1;
      if (!orderIds[oid]) issue('order_lines', l._row, 'order_id', oid, 'שורת מוצר ללא הזמנה (יתומה)');
      var q = mnn(l.qty, 'order_lines', l._row, 'qty', undefined, true), up = mnn(l.unit_price_agorot, 'order_lines', l._row, 'unit_price_agorot', undefined, true);
      var upv = mnn(l.units_per_variant, 'order_lines', l._row, 'units_per_variant');
      (lines[oid] = lines[oid] || []).push({ id: lid, sku: nul(l.sku), variantTitle: nul(l.variant_title), qty: q, unitsPerVariant: upv || 1, unitPriceAgorot: up, lineDiscountAgorot: mnn(l.line_discount_agorot, 'order_lines', l._row, 'line_discount_agorot'), invalid: q == null || up == null || upv == null });
    });
    table(refundsRows).forEach(function (r) {
      var oid = idStr(r.order_id, 'refunds', r._row, 'order_id'), rid = idStr(r.refund_id, 'refunds', r._row, 'refund_id');
      if (rid && seenRefund[rid]) issue('refunds', r._row, 'refund_id', rid, 'refund_id כפול: אותו החזר פעמיים');
      if (rid) seenRefund[rid] = 1;
      if (!orderIds[oid]) issue('refunds', r._row, 'order_id', oid, 'החזר ללא הזמנה (יתום)');
      var amt = mnn(r.amount_agorot, 'refunds', r._row, 'amount_agorot', undefined, true), dt = stamp(r.refund_date, 'refunds', r._row, 'refund_date');
      (refunds[oid] = refunds[oid] || []).push({ id: rid, createdAt: dt, amountAgorot: amt == null ? 0 : amt, goodsReturned: bool(r.goods_returned, 'refunds', r._row, 'goods_returned'), invalid: amt == null || dt == null });
    });
    var flags = {}, list = [];
    oTable.forEach(function (o) {
      var T = 'orders_v2', oid = idStr(o.order_id, T, o._row, 'order_id');
      var created = stamp(o.created_at, T, o._row, 'created_at');
      var gross = mnn(o.gross_agorot, T, o._row, 'gross_agorot', undefined, true), disc = mnn(o.discount_agorot, T, o._row, 'discount_agorot'), net = money(o.net_agorot, T, o._row, 'net_agorot', undefined, true);
      var ship = mnn(o.shipping_agorot, T, o._row, 'shipping_agorot');
      var cancelled = nul(o.cancelled_at), cancelStamp = cancelled == null ? null : stamp(cancelled, T, o._row, 'cancelled_at');
      var fin = enumU(o.financial_status);
      if (!FIN_STATUS[fin]) issue(T, o._row, 'financial_status', o.financial_status, 'סטטוס תשלום ריק או לא מוכר (ההזמנה תיחשב כלא שולמה)');
      var ls = lines[oid] || [], rs = refunds[oid] || [];
      var bad = created == null || gross == null || disc == null || net == null || (cancelled != null && cancelStamp == null) || ls.some(function (l) { return l.invalid; }) || rs.some(function (r) { return r.invalid; });
      list.push({ id: oid, name: o.name, createdAt: created, cancelledAt: cancelStamp, financialStatus: fin, fulfillmentStatus: enumU(o.fulfillment_status), gateway: nul(o.gateway), city: o.city, customerId: String(o.customer_id == null ? '' : o.customer_id), campaign: nul(idStr(o.campaign_id, T, o._row, 'campaign_id')), source: nul(o.source), tags: o.tags ? String(o.tags).split(',') : [], grossAgorot: gross, discountAgorot: disc, netAgorot: net, shippingAgorot: ship, refunds: rs, lines: ls, invalid: bad });
      flags[o.name] = { isTest: bool(o.is_test, T, o._row, 'is_test'), cancelledInError: bool(o.cancelled_in_error, T, o._row, 'cancelled_in_error'), creatorSample: bool(o.creator_sample, T, o._row, 'creator_sample'), deletedInShopify: bool(o.deleted_in_shopify, T, o._row, 'deleted_in_shopify'), note: o.note || '' };
    });
    return { orders: list, flags: flags };
  }
  function orderCosts(rows) {
    return table(rows).map(function (c) {
      var T = 'order_costs', amt = mnn(c.amount_usd_cents, T, c._row, 'amount_usd_cents', null);
      if (amt === null && (c.amount_usd_cents === '' || c.amount_usd_cents == null)) issue(T, c._row, 'amount_usd_cents', '', 'סכום חסר');
      var pd = day(c.purchase_date, T, c._row, 'purchase_date');
      if (pd === null && (c.purchase_date === '' || c.purchase_date == null)) issue(T, c._row, 'purchase_date', '', 'תאריך רכישה חסר');
      // עמודות אופציונליות שנכתבות פעם אחת ע"י freezeOrderCosts: השער, תאריך השער והסכום בשקלים כפי שנקבעו (לא מחושבים מחדש)
      var ru = num(c.rate_used, T, c._row, 'rate_used', null), rd = day(c.rate_date, T, c._row, 'rate_date'), ca = mnn(c.converted_agorot, T, c._row, 'converted_agorot', null);
      if (ru != null && ru <= 0) { issue(T, c._row, 'rate_used', c.rate_used, 'שער חייב להיות חיובי'); ru = null; }
      return { row: c._row, orderName: c.order_name, supplierOrder: nul(c.supplier_order), amountUsdCents: amt, purchaseDate: pd, status: c.status, source: c.source, confidence: conf(c.confidence, 'MANUAL', T, c._row, 'confidence'), rateUsed: ru, rateDate: rd, convertedAgorot: ca };
    });
  }
  function productCosts(rows) { return table(rows).map(function (p) { var T = 'product_costs'; return { sku: p.sku, name: p.name, unitCostUsdCents: mnn(p.unit_cost_usd_cents, T, p._row, 'unit_cost_usd_cents', null), effectiveFrom: day(p.effective_from, T, p._row, 'effective_from'), effectiveTo: day(p.effective_to, T, p._row, 'effective_to'), source: p.source, confidence: conf(p.confidence, 'MANUAL', T, p._row, 'confidence') }; }); }
  function fxRates(rows) {
    return table(rows).map(function (r) { return { date: day(r.date, 'fx_rates', r._row, 'date'), currency: r.currency, rate: num(r.rate, 'fx_rates', r._row, 'rate', null), source: r.source, confidence: conf(r.confidence, 'VERIFIED', 'fx_rates', r._row, 'confidence'), _row: r._row }; })
      .filter(function (r) {
        var ok = r.date && r.rate != null && r.rate > 0;
        if (!ok) issue('fx_rates', r._row, 'rate', r.rate == null ? '' : r.rate, 'שורת שער לא תקינה – לא נכללה');
        return ok;
      });
  }
  // רכיב עמלה תקין (אותה הגדרה כמו במנוע): rate שבר 0..1 ו/או fixedAgorot שלם אי-שלילי, vat בוליאני
  function feeCompsOk(comps) {
    if (!Array.isArray(comps) || !comps.length) return false;
    return comps.every(function (c) {
      if (!c || typeof c !== 'object') return false;
      var hasR = c.rate !== undefined && c.rate !== null, hasF = c.fixedAgorot !== undefined && c.fixedAgorot !== null;
      if (!hasR && !hasF) return false;
      if (hasR && !(typeof c.rate === 'number' && isFinite(c.rate) && c.rate >= 0 && c.rate <= 1)) return false;
      if (hasF && !(typeof c.fixedAgorot === 'number' && Number.isInteger(c.fixedAgorot) && c.fixedAgorot >= 0)) return false;
      if (c.vat !== undefined && c.vat !== null && typeof c.vat !== 'boolean') return false;
      return true;
    });
  }
  function feeRates(rows) { return table(rows).map(function (r) {
    var T = 'fee_rates', hasJson = !(r.components_json === '' || r.components_json == null);
    var act = r.actual_agorot === '' || r.actual_agorot == null ? null : mnn(r.actual_agorot, T, r._row, 'actual_agorot', null);
    var isActual = !(r.order_id === '' || r.order_id == null);
    var comps = []; try { comps = hasJson ? JSON.parse(r.components_json) : []; if (!Array.isArray(comps)) throw new Error('not array'); } catch (e) { comps = null; issue(T, r._row, 'components_json', r.components_json, 'JSON לא תקין'); }
    // שורת "בפועל" (order_id + actual_agorot) יכולה להיות בלי רכיבים. תעריף כללי בלי רכיבים תקינים = שבור (MISSING במנוע), לא עמלה 0
    if (comps !== null && !(isActual && act != null) && !feeCompsOk(comps)) { issue(T, r._row, 'components_json', r.components_json, 'רכיבי עמלה ריקים או לא תקינים (rate בין 0 ל-1, fixedAgorot שלם, vat בוליאני)'); comps = null; }
    if (isActual && act == null) issue(T, r._row, 'actual_agorot', r.actual_agorot, 'שורת עמלה בפועל (יש order_id) בלי סכום');
    return { gateway: r.gateway, effectiveFrom: day(r.effective_from, T, r._row, 'effective_from'), effectiveTo: day(r.effective_to, T, r._row, 'effective_to'), components: comps, actualAgorot: act, orderId: isActual ? idStr(r.order_id, T, r._row, 'order_id') : null, source: r.source, confidence: conf(r.confidence, 'ESTIMATED', T, r._row, 'confidence'), note: r.note }; }); }
  function adSpend(rows) {
    return table(rows).map(function (r) {
      var T = 'ad_spend', d = day(r.date, T, r._row, 'date');
      if (d === null && (r.date === '' || r.date == null)) issue(T, r._row, 'date', '', 'תאריך חסר');
      var sp = mnn(r.spend_agorot, T, r._row, 'spend_agorot', null);
      if (sp === null && (r.spend_agorot === '' || r.spend_agorot == null)) issue(T, r._row, 'spend_agorot', '', 'הוצאה חסרה');
      return { date: d, campaignId: idStr(r.campaign_id, T, r._row, 'campaign_id'), campaignName: r.campaign_name, adsetId: nul(r.adset_id), spendAgorot: sp, purchases: mnn(r.purchases, T, r._row, 'purchases', null), purchaseValueAgorot: mnn(r.purchase_value_agorot, T, r._row, 'purchase_value_agorot', null), source: r.source, confidence: conf(r.confidence, 'VERIFIED', T, r._row, 'confidence'), _row: r._row };
    }).filter(function (r) { return r.date; });
  }
  function expenses(rows) { return table(rows).map(function (e) {
    var T = 'expenses_v2', o = { id: e.id, name: e.name, category: e.category, source: e.source, confidence: conf(e.confidence, 'MANUAL', T, e._row, 'confidence') };
    if (e.category === 'OneTime') { o.amountAgorot = mnn(e.amount_agorot, T, e._row, 'amount_agorot', null); o.date = day(e.date, T, e._row, 'date'); }
    else if (e.category === 'AdCredit') { o.amountAgorot = mnn(e.amount_agorot, T, e._row, 'amount_agorot', null); o.startDate = day(e.start_date, T, e._row, 'start_date'); o.endDate = day(e.end_date, T, e._row, 'end_date'); }
    else { o.billingDay = mnn(e.billing_day, T, e._row, 'billing_day', null); if (o.billingDay != null && (o.billingDay < 1 || o.billingDay > 31)) { issue(T, e._row, 'billing_day', e.billing_day, 'יום חיוב חייב להיות בין 1 ל-31'); o.billingDay = null; } o.monthlyAgorot = mnn(e.monthly_agorot, T, e._row, 'monthly_agorot', null); o.startDate = day(e.start_date, T, e._row, 'start_date'); o.endDate = day(e.end_date, T, e._row, 'end_date'); }
    return o; }); }

  // כותרות נדרשות לכל לשונית. עמודה שנעלמה או שונה שמה לא הופכת בשקט ל-0/ריק: הבעיה נרשמת ב-issues, ו-dailyRun לא כותב צילום.
  var REQUIRED = {
    orders_v2: ['order_id', 'name', 'created_at', 'cancelled_at', 'financial_status', 'gateway', 'campaign_id', 'gross_agorot', 'discount_agorot', 'net_agorot', 'shipping_agorot', 'is_test', 'cancelled_in_error', 'creator_sample', 'deleted_in_shopify'],
    order_lines: ['line_id', 'order_id', 'sku', 'qty', 'units_per_variant', 'unit_price_agorot', 'line_discount_agorot', 'removed_in_shopify'],
    refunds: ['refund_id', 'order_id', 'refund_date', 'amount_agorot'],
    order_costs: ['order_name', 'supplier_order', 'amount_usd_cents', 'purchase_date', 'status', 'confidence', 'rate_used', 'rate_date', 'converted_agorot'],
    product_costs: ['sku', 'name', 'unit_cost_usd_cents', 'effective_from', 'effective_to', 'confidence'],
    fx_rates: ['date', 'currency', 'rate', 'confidence'],
    fee_rates: ['gateway', 'effective_from', 'effective_to', 'components_json', 'actual_agorot', 'confidence'], // order_id לא נדרש: בגיליון החי אין עמודה כזו (נוצרת רק עם שורת עמלה בפועל; ראו בדיקה מותנית ב-checkHeaders)
    ad_spend: ['date', 'campaign_id', 'campaign_name', 'adset_id', 'spend_agorot', 'purchases', 'purchase_value_agorot', 'confidence'],
    expenses_v2: ['id', 'name', 'category', 'monthly_agorot', 'amount_agorot', 'date', 'start_date', 'end_date', 'billing_day']
  };
  function checkHeaders(tabs) {
    Object.keys(REQUIRED).forEach(function (tab) {
      var rows = tabs[tab];
      if (rows === undefined || rows === null) return; // לשונית שלא נשלחה בכלל (קריאה חלקית): לא נבדקת. ב-Daily.gs לשונית חסרה זורקת שגיאה בקריאה
      if (!Array.isArray(rows) || !rows.length) { issue(tab, 1, 'header', '', 'הלשונית ריקה, אין שורת כותרות'); return; }
      var have = {}; (rows[0] || []).forEach(function (h) { have[normHeader(h)] = 1; });
      REQUIRED[tab].forEach(function (h) { if (!have[h]) issue(tab, 1, h, '', 'עמודה חסרה בכותרת'); });
      if (tab === 'fee_rates' && !have.order_id) { // שורת "בפועל" בלי עמודת order_id הייתה הופכת לתעריף כללי ריק
        var hd = (rows[0] || []).map(normHeader), ai = hd.indexOf('actual_agorot');
        if (ai >= 0 && rows.slice(1).some(function (r) { return r && !blank(r[ai]); })) issue(tab, 1, 'order_id', '', 'יש עמלה בפועל (actual_agorot) אבל אין עמודת order_id');
      }
    });
  }
  // tabs: {orders_v2, order_lines, refunds, order_costs, product_costs, fx_rates, fee_rates, ad_spend, expenses_v2}
  function build(tabs) {
    issues = [];
    checkHeaders(tabs);
    var o = orders(tabs.orders_v2, tabs.order_lines, tabs.refunds);
    var ads = adSpend(tabs.ad_spend);
    var cov = null;
    if (ads.length) { var ds = ads.map(function (a) { return a.date; }).sort(); cov = { from: ds[0], to: ds[ds.length - 1] }; }
    var data = { orders: o.orders, flags: o.flags, orderCosts: orderCosts(tabs.order_costs), productCosts: productCosts(tabs.product_costs), fx: fxRates(tabs.fx_rates), feeRates: feeRates(tabs.fee_rates), adSpend: ads, adSpendCoverage: cov, expenses: expenses(tabs.expenses_v2) };
    data.issues = issues; issues = [];
    return data;
  }
  return { VERSION: '1.2.0', REQUIRED: REQUIRED, normHeader: normHeader, table: isolated(table), parseNum: parseNum, money: isolated(money), parseDay: parseDay, orders: isolated(orders), orderCosts: isolated(orderCosts), productCosts: isolated(productCosts), fxRates: isolated(fxRates), feeRates: isolated(feeRates), adSpend: isolated(adSpend), expenses: isolated(expenses), build: build };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = LorinxSheetAdapter;
