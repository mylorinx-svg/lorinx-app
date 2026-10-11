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
  function issue(tab, row, field, value, why) { issues.push({ tab: tab, row: row, field: field, value: value === undefined ? '' : String(value), why: why }); }

  function table(rows) {
    if (!rows || !rows.length) return [];
    var h = rows[0], out = [];
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i]; if (!r || r.every(function (c) { return c === '' || c == null; })) continue;
      var o = { _row: i + 1 }; for (var j = 0; j < h.length; j++) o[h[j]] = r[j] === undefined ? '' : r[j];
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
    if ((v === '' || v == null) && required) { issue(tab, row, field, v, 'ערך חובה חסר'); return null; }
    var n = parseNum(v);
    if (n === undefined) return def === undefined ? 0 : def;
    if (n === null) { issue(tab, row, field, v, 'לא מספר'); return null; }
    if (typeof v === 'string' && v.indexOf('.') >= 0) { issue(tab, row, field, v, 'שדה בשלמים (אגורות/סנטים) מכיל נקודה עשרונית'); return null; }
    if (!Number.isInteger(n)) { issue(tab, row, field, v, 'שדה בשלמים (אגורות/סנטים) אינו מספר שלם'); return null; }
    return n;
  }
  function idStr(v, tab, row, field) { // מזהה גדול שהוצג כמספר מאבד ספרות (מעל 2^53)
    if (typeof v === 'number' && !Number.isSafeInteger(v)) { issue(tab, row, field, v, 'מזהה גדול מדי כמספר: חייב להיות טקסט'); return String(v); }
    return String(v == null ? '' : v);
  }
  function bool(v) {
    if (v === true || v === 1) return true;
    var t = String(v == null ? '' : v).trim().toLowerCase();
    return t === 'true' || t === '1' || t === 'yes' || t === 'y' || t === 'כן' || t === 'v' || t === '✓';
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
    if ((m = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/.exec(t))) return validYmd(+m[1], +m[2], +m[3]) ? m[1] + '-' + m[2] + '-' + m[3] : null;
    if ((m = /^(\d{1,2})([\/.\-])(\d{1,2})[\/.\-](\d{4})(?:$|[\s,T])/.exec(t))) {
      var d = +m[1], mo = +m[3], y = +m[4];
      if (m[2] === '/' && d <= 12 && mo <= 12 && d !== mo) return null; // 02/10/2026 נקרא אחרת בלוקאל אמריקאי: דו-משמעי, נדחה. נקודה (2.10.2026) נקראת יום.חודש כמקובל בישראל
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

  function orders(ordersRows, linesRows, refundsRows) {
    var lines = {}, refunds = {};
    table(linesRows).forEach(function (l) {
      if (bool(l.removed_in_shopify)) return; // שורה שהוסרה בשופיפיי (עריכת הזמנה): לא נספרת
      var q = money(l.qty, 'order_lines', l._row, 'qty', undefined, true), up = money(l.unit_price_agorot, 'order_lines', l._row, 'unit_price_agorot', undefined, true);
      (lines[l.order_id] = lines[l.order_id] || []).push({ id: l.line_id, sku: nul(l.sku), variantTitle: nul(l.variant_title), qty: q, unitsPerVariant: money(l.units_per_variant, 'order_lines', l._row, 'units_per_variant') || 1, unitPriceAgorot: up, lineDiscountAgorot: money(l.line_discount_agorot, 'order_lines', l._row, 'line_discount_agorot'), invalid: q == null || up == null });
    });
    table(refundsRows).forEach(function (r) {
      var amt = money(r.amount_agorot, 'refunds', r._row, 'amount_agorot', undefined, true), dt = stamp(r.refund_date, 'refunds', r._row, 'refund_date');
      (refunds[r.order_id] = refunds[r.order_id] || []).push({ id: r.refund_id, createdAt: dt, amountAgorot: amt == null ? 0 : amt, goodsReturned: bool(r.goods_returned), invalid: amt == null || dt == null });
    });
    var flags = {}, list = [];
    table(ordersRows).forEach(function (o) {
      var created = stamp(o.created_at, 'orders_v2', o._row, 'created_at');
      var gross = money(o.gross_agorot, 'orders_v2', o._row, 'gross_agorot', undefined, true), disc = money(o.discount_agorot, 'orders_v2', o._row, 'discount_agorot'), net = money(o.net_agorot, 'orders_v2', o._row, 'net_agorot', undefined, true);
      var ship = money(o.shipping_agorot, 'orders_v2', o._row, 'shipping_agorot');
      var cancelled = nul(o.cancelled_at), cancelStamp = cancelled == null ? null : stamp(cancelled, 'orders_v2', o._row, 'cancelled_at');
      var ls = lines[o.order_id] || [], rs = refunds[o.order_id] || [];
      var bad = created == null || gross == null || disc == null || net == null || (cancelled != null && cancelStamp == null) || ls.some(function (l) { return l.invalid; }) || rs.some(function (r) { return r.invalid; });
      list.push({ id: o.order_id, name: o.name, createdAt: created, cancelledAt: cancelStamp, financialStatus: enumU(o.financial_status), fulfillmentStatus: enumU(o.fulfillment_status), gateway: nul(o.gateway), city: o.city, customerId: idStr(o.customer_id, 'orders_v2', o._row, 'customer_id'), campaign: nul(idStr(o.campaign_id, 'orders_v2', o._row, 'campaign_id')), source: nul(o.source), tags: o.tags ? String(o.tags).split(',') : [], grossAgorot: gross, discountAgorot: disc, netAgorot: net, shippingAgorot: ship, refunds: rs, lines: ls, invalid: bad });
      flags[o.name] = { isTest: bool(o.is_test), cancelledInError: bool(o.cancelled_in_error), creatorSample: bool(o.creator_sample), deletedInShopify: bool(o.deleted_in_shopify), note: o.note || '' };
    });
    return { orders: list, flags: flags };
  }
  function orderCosts(rows) {
    return table(rows).map(function (c) {
      var amt = money(c.amount_usd_cents, 'order_costs', c._row, 'amount_usd_cents', null);
      if (amt === null && (c.amount_usd_cents === '' || c.amount_usd_cents == null)) issue('order_costs', c._row, 'amount_usd_cents', '', 'סכום חסר');
      var pd = day(c.purchase_date, 'order_costs', c._row, 'purchase_date');
      if (pd === null && (c.purchase_date === '' || c.purchase_date == null)) issue('order_costs', c._row, 'purchase_date', '', 'תאריך רכישה חסר');
      // עמודות אופציונליות שנכתבות פעם אחת ע"י freezeOrderCosts: השער, תאריך השער והסכום בשקלים כפי שנקבעו (לא מחושבים מחדש)
      var ru = num(c.rate_used, 'order_costs', c._row, 'rate_used', null), rd = day(c.rate_date, 'order_costs', c._row, 'rate_date'), ca = money(c.converted_agorot, 'order_costs', c._row, 'converted_agorot', null);
      return { row: c._row, orderName: c.order_name, supplierOrder: nul(c.supplier_order), amountUsdCents: amt, purchaseDate: pd, status: c.status, source: c.source, confidence: enumU(c.confidence) || 'MANUAL', rateUsed: ru, rateDate: rd, convertedAgorot: ca };
    });
  }
  function productCosts(rows) { return table(rows).map(function (p) { return { sku: p.sku, name: p.name, unitCostUsdCents: money(p.unit_cost_usd_cents, 'product_costs', p._row, 'unit_cost_usd_cents', null), effectiveFrom: day(p.effective_from, 'product_costs', p._row, 'effective_from'), effectiveTo: day(p.effective_to, 'product_costs', p._row, 'effective_to'), source: p.source, confidence: enumU(p.confidence) || 'MANUAL' }; }); }
  function fxRates(rows) {
    return table(rows).map(function (r) { return { date: day(r.date, 'fx_rates', r._row, 'date'), currency: r.currency, rate: num(r.rate, 'fx_rates', r._row, 'rate', null), source: r.source, confidence: enumU(r.confidence) || 'VERIFIED', _row: r._row }; })
      .filter(function (r) {
        var ok = r.date && r.rate != null && r.rate > 0;
        if (!ok) issue('fx_rates', r._row, 'rate', r.rate == null ? '' : r.rate, 'שורת שער לא תקינה – לא נכללה');
        return ok;
      });
  }
  function feeRates(rows) { return table(rows).map(function (r) {
    var comps = []; try { comps = r.components_json ? JSON.parse(r.components_json) : []; if (!Array.isArray(comps)) throw new Error('not array'); } catch (e) { comps = null; issue('fee_rates', r._row, 'components_json', r.components_json, 'JSON לא תקין'); } // null = תעריף שבור: העמלה MISSING במנוע
    var act = r.actual_agorot === '' || r.actual_agorot == null ? null : money(r.actual_agorot, 'fee_rates', r._row, 'actual_agorot', null);
    return { gateway: r.gateway, effectiveFrom: day(r.effective_from, 'fee_rates', r._row, 'effective_from'), effectiveTo: day(r.effective_to, 'fee_rates', r._row, 'effective_to'), components: comps, actualAgorot: act, orderId: r.order_id === '' || r.order_id == null ? null : String(r.order_id), source: r.source, confidence: enumU(r.confidence) || 'ESTIMATED', note: r.note }; }); }
  function adSpend(rows) {
    return table(rows).map(function (r) {
      var d = day(r.date, 'ad_spend', r._row, 'date');
      if (d === null && (r.date === '' || r.date == null)) issue('ad_spend', r._row, 'date', '', 'תאריך חסר');
      var sp = money(r.spend_agorot, 'ad_spend', r._row, 'spend_agorot', null);
      if (sp === null && (r.spend_agorot === '' || r.spend_agorot == null)) issue('ad_spend', r._row, 'spend_agorot', '', 'הוצאה חסרה');
      return { date: d, campaignId: idStr(r.campaign_id, 'ad_spend', r._row, 'campaign_id'), campaignName: r.campaign_name, adsetId: nul(r.adset_id), spendAgorot: sp, purchases: money(r.purchases, 'ad_spend', r._row, 'purchases', null), purchaseValueAgorot: money(r.purchase_value_agorot, 'ad_spend', r._row, 'purchase_value_agorot', null), source: r.source, confidence: enumU(r.confidence) || 'VERIFIED', _row: r._row };
    }).filter(function (r) { return r.date; });
  }
  function expenses(rows) { return table(rows).map(function (e) {
    var T = 'expenses_v2', o = { id: e.id, name: e.name, category: e.category, source: e.source, confidence: enumU(e.confidence) || 'MANUAL' };
    if (e.category === 'OneTime') { o.amountAgorot = money(e.amount_agorot, T, e._row, 'amount_agorot', null); o.date = day(e.date, T, e._row, 'date'); }
    else if (e.category === 'AdCredit') { o.amountAgorot = money(e.amount_agorot, T, e._row, 'amount_agorot', null); o.startDate = day(e.start_date, T, e._row, 'start_date'); o.endDate = day(e.end_date, T, e._row, 'end_date'); }
    else { o.billingDay = money(e.billing_day, T, e._row, 'billing_day', null); o.monthlyAgorot = money(e.monthly_agorot, T, e._row, 'monthly_agorot', null); o.startDate = day(e.start_date, T, e._row, 'start_date'); o.endDate = day(e.end_date, T, e._row, 'end_date'); }
    return o; }); }

  // כותרות נדרשות לכל לשונית. עמודה שנעלמה או שונה שמה לא הופכת בשקט ל-0/ריק: הבעיה נרשמת ב-issues, ו-dailyRun לא כותב צילום.
  var REQUIRED = {
    orders_v2: ['order_id', 'name', 'created_at', 'cancelled_at', 'financial_status', 'gateway', 'campaign_id', 'gross_agorot', 'discount_agorot', 'net_agorot', 'shipping_agorot', 'is_test', 'cancelled_in_error', 'creator_sample'],
    order_lines: ['line_id', 'order_id', 'sku', 'qty', 'units_per_variant', 'unit_price_agorot', 'line_discount_agorot'],
    refunds: ['refund_id', 'order_id', 'refund_date', 'amount_agorot'],
    order_costs: ['order_name', 'supplier_order', 'amount_usd_cents', 'purchase_date', 'status'],
    product_costs: ['sku', 'name', 'unit_cost_usd_cents', 'effective_from', 'effective_to'],
    fx_rates: ['date', 'currency', 'rate'],
    fee_rates: ['gateway', 'effective_from', 'effective_to', 'components_json'],
    ad_spend: ['date', 'campaign_id', 'campaign_name', 'spend_agorot', 'purchases', 'purchase_value_agorot'],
    expenses_v2: ['id', 'name', 'category', 'monthly_agorot', 'amount_agorot', 'date', 'start_date', 'end_date', 'billing_day']
  };
  function checkHeaders(tabs) {
    Object.keys(REQUIRED).forEach(function (tab) {
      var rows = tabs[tab];
      if (rows === undefined || rows === null) return; // לשונית שלא נשלחה בכלל (קריאה חלקית): לא נבדקת. ב-Daily.gs לשונית חסרה זורקת שגיאה בקריאה
      if (!Array.isArray(rows) || !rows.length) { issue(tab, 1, 'header', '', 'הלשונית ריקה, אין שורת כותרות'); return; }
      var have = {}; (rows[0] || []).forEach(function (h) { have[String(h).trim()] = 1; });
      REQUIRED[tab].forEach(function (h) { if (!have[h]) issue(tab, 1, h, '', 'עמודה חסרה בכותרת'); });
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
  return { VERSION: '1.1.0', REQUIRED: REQUIRED, table: table, parseNum: parseNum, money: money, parseDay: parseDay, orders: orders, orderCosts: orderCosts, productCosts: productCosts, fxRates: fxRates, feeRates: feeRates, adSpend: adSpend, expenses: expenses, build: build };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = LorinxSheetAdapter;
