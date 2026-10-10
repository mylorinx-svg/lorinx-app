/*
 * LORINX Control Center — calculation engine
 * מנוע חישוב אחד לכל המדדים. רץ ב-Node (בדיקות), בדפדפן (האפליקציה) וב-Apps Script (השרת והבוטים).
 *
 * כללים:
 *  - כל סכום כסף הוא מספר שלם של אגורות (ILS) או סנטים (USD). עיגול רק בתצוגה.
 *  - תאריך "עסקי" הוא היום הקלנדרי לפי שעון ישראל (Asia/Jerusalem).
 *  - כל תוצאה נושאת רכיבים (components) עם תווית אמינות: VERIFIED | MANUAL | ESTIMATED | STALE | MISSING.
 *  - שום פונקציה לא קוראת מהרשת או מהגיליון; כל הנתונים מגיעים כפרמטרים.
 */
var LorinxEngine = (function () {
  'use strict';

  var FORMULA_VERSION = '1.3.0'; // 1.3.0: purchase amounts frozen in ILS (rate_used, rate_date, converted_agorot); 1.2.0: 1.2.0: MISSING caps confidence, KPI null on missing inputs, real-order denominators, cumulative fixed-cost rounding, ad refresh window
  var VAT_RATE = 0.18;
  var CONFIDENCE_WEIGHT = { VERIFIED: 1, MANUAL: 0.8, ESTIMATED: 0.5, STALE: 0.5, MISSING: 0 };
  var MISSING_CAP = 50; // תקרת ציון אמינות כשחסר רכיב כלשהו
  var TZ = 'Asia/Jerusalem';

  // ---------- עזרים: כסף ותאריכים ----------

  function roundHalfUp(x) { return x < 0 ? -Math.round(-x) : Math.round(x); }

  function ilsFromUsd(usdCents, rate) { return roundHalfUp(usdCents * rate); }

  var _fmt = null;
  function israelDate(iso) {
    // ISO timestamp (UTC) -> 'YYYY-MM-DD' לפי שעון ישראל
    if (!iso) return null;
    if (typeof iso === 'string' && iso.length === 10) return iso; // כבר תאריך
    var d = iso instanceof Date ? iso : new Date(iso);
    if (typeof Intl !== 'undefined' && Intl.DateTimeFormat) {
      if (!_fmt) _fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
      return _fmt.format(d); // en-CA נותן YYYY-MM-DD
    }
    if (typeof Utilities !== 'undefined' && Utilities.formatDate) {
      return Utilities.formatDate(d, TZ, 'yyyy-MM-dd'); // Apps Script
    }
    // גיבוי: +3 בקיץ, +2 בחורף (שעון קיץ ישראל: שישי שלפני יום ראשון האחרון של מרץ עד יום ראשון האחרון של אוקטובר)
    var y = d.getUTCFullYear();
    var lastSunOct = new Date(Date.UTC(y, 9, 31)); lastSunOct.setUTCDate(31 - lastSunOct.getUTCDay());
    var lastSunMar = new Date(Date.UTC(y, 2, 31)); lastSunMar.setUTCDate(31 - lastSunMar.getUTCDay());
    var dstStart = new Date(lastSunMar.getTime() - 2 * 864e5); dstStart.setUTCHours(0); // שישי 02:00 מקומי = 00:00 UTC
    var dstEnd = new Date(lastSunOct.getTime()); dstEnd.setUTCHours(23); // ראשון 02:00 מקומי = שבת 23:00 UTC
    var off = (d >= dstStart && d < dstEnd) ? 3 : 2;
    return new Date(d.getTime() + off * 3600e3).toISOString().slice(0, 10);
  }

  function daysInMonth(ym) { // 'YYYY-MM'
    var y = +ym.slice(0, 4), m = +ym.slice(5, 7);
    return new Date(Date.UTC(y, m, 0)).getUTCDate();
  }
  function addDays(ymd, n) {
    var d = new Date(ymd + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function inPeriod(ymd, period) { return !!ymd && ymd >= period.from && ymd <= period.to; }
  function monthOf(ymd) { return ymd.slice(0, 7); }

  // תקופות
  function periodMonth(ym) { return { from: ym + '-01', to: ym + '-' + ('0' + daysInMonth(ym)).slice(-2), label: ym }; }
  function periodLastDays(n, today) { // כמו Shopify ו-Ads Manager: n ימים קלנדריים שמסתיימים אתמול
    var t = israelDate(today || new Date());
    return { from: addDays(t, -n), to: addDays(t, -1), label: n + 'd' };
  }
  function periodToday(today) { var t = israelDate(today || new Date()); return { from: t, to: t, label: 'today' }; }
  function periodAll(today, firstDate) { // מהיום הראשון של הנתונים עד היום
    var t = israelDate(today || new Date());
    return { from: firstDate || '2026-06-01', to: t, label: 'all' };
  }
  // מילון תקופות יחיד. כל מסך בוחר מכאן ומציג את from–to. אין הגדרות מקומיות אחרות.
  function periodDefs(now) {
    var t = israelDate(now || new Date()), ym = t.slice(0, 7);
    return {
      today: { key: 'today', he: 'היום', from: t, to: t, label: 'today' },
      week: { key: 'week', he: '7 ימים (עד אתמול)', from: addDays(t, -7), to: addDays(t, -1), label: '7d' },
      d30: { key: 'd30', he: '30 ימים (עד אתמול)', from: addDays(t, -30), to: addDays(t, -1), label: '30d' },
      mtd: { key: 'mtd', he: 'החודש עד אתמול', from: ym + '-01', to: addDays(t, -1), label: ym + '-mtd' }, // ביום 1 בחודש: תקופה ריקה (from > to)
      fullMonth: { key: 'fullMonth', he: 'החודש כולו (כולל ימים שעוד לא עברו)', from: ym + '-01', to: ym + '-' + ('0' + daysInMonth(ym)).slice(-2), label: ym },
      all: { key: 'all', he: 'מקסימום', from: '2026-06-01', to: t, label: 'all' }
    };
  }
  function periodDays(p) { return Math.round((Date.parse(p.to + 'T00:00:00Z') - Date.parse(p.from + 'T00:00:00Z')) / 864e5) + 1; }

  // ---------- אמינות ----------

  function worst(labels) {
    var order = ['MISSING', 'STALE', 'ESTIMATED', 'MANUAL', 'VERIFIED'];
    var w = 'VERIFIED';
    for (var i = 0; i < labels.length; i++) if (order.indexOf(labels[i]) < order.indexOf(w)) w = labels[i];
    return w;
  }
  function confidencePercent(components) {
    // ממוצע משוקלל לפי הסכום המוחלט של כל רכיב. רכיב MISSING נספר במשקל 0 עם "סכום" משוער אם ניתן, אחרת 1.
    // אבל סכום של אגורה אחת כמעט לא מזיז ממוצע, ולכן כל רכיב MISSING מגביל את הציון כולו ל-MISSING_CAP (ראו C1 בביקורת 10.10).
    var num = 0, den = 0, anyMissing = false;
    for (var i = 0; i < components.length; i++) {
      var c = components[i];
      var amt = Math.abs(c.amountAgorot || 0);
      if (c.confidence === 'MISSING') { anyMissing = true; amt = Math.abs(c.estimatedAgorot || 0) || 1; }
      if (amt === 0) continue;
      num += amt * (CONFIDENCE_WEIGHT[c.confidence] || 0);
      den += amt;
    }
    if (!den) return null;
    var pct = Math.round(100 * num / den);
    return anyMissing && pct > MISSING_CAP ? MISSING_CAP : pct; // null = אין מה לשקלל (תקופה ריקה), לא 0% ולא 100%
  }
  function missingOf(components) {
    var m = [];
    for (var i = 0; i < components.length; i++) if (components[i].confidence === 'MISSING') m.push(components[i].name);
    return m;
  }

  // ---------- נורמליזציה של הזמנות ----------

  function normalizeOrder(o, flags) {
    var f = (flags && flags[o.name]) || {};
    var refunded = 0;
    (o.refunds || []).forEach(function (r) { refunded += r.amountAgorot || 0; });
    var cancelled = !!o.cancelledAt && !f.cancelledInError;
    var state = 'OK';
    if (o.invalid) state = 'INVALID'; // שדה לא תקין בגיליון: ההזמנה מדווחת ב-dataHealth ולא נכנסת לשום סכום
    else if (f.deletedInShopify) state = 'DELETED'; // נמחקה ב-Shopify (הסנכרון מסמן, לא מוחק): לא נספרת בשום סכום, ומדווחת ב-Health
    else if (f.isTest) state = 'TEST';
    else if (f.creatorSample) state = 'CREATOR_SAMPLE';
    else if (cancelled && refunded === 0) state = 'CANCELLED_NO_REFUND';
    else if (cancelled) state = 'CANCELLED';
    else if (o.financialStatus !== 'PAID' && o.financialStatus !== 'PARTIALLY_REFUNDED' && o.financialStatus !== 'REFUNDED') state = 'UNPAID';
    var units = 0;
    (o.lines || []).forEach(function (l) { units += (l.qty || 0) * (l.unitsPerVariant || 1); });
    return {
      id: o.id, name: o.name,
      date: israelDate(o.createdAt), createdAt: o.createdAt,
      gateway: o.gateway, campaign: o.campaign || null, shippingAgorot: o.shippingAgorot || 0,
      grossAgorot: o.grossAgorot, discountAgorot: o.discountAgorot, netAgorot: o.netAgorot,
      refundedAgorot: refunded, refunds: o.refunds || [],
      units: units, lines: o.lines || [],
      isTest: !!f.isTest, creatorSample: !!f.creatorSample, cancelledInError: !!f.cancelledInError,
      cancelledAt: o.cancelledAt || null, state: state, note: f.note || ''
    };
  }
  function normalizeOrders(orders, flags) { return orders.map(function (o) { return normalizeOrder(o, flags); }); }

  // אילו הזמנות נכנסות למכירות ואילו לרווח
  function salesEligible(o, opts) {
    if (o.state === 'INVALID' || o.state === 'DELETED') return false;
    if (o.state === 'TEST' && !(opts && opts.includeTestOrders)) return false;
    return true; // מכירות = כמו Shopify (כולל מבוטלות; ההחזר יורד בנפרד)
  }
  function profitEligible(o, opts) {
    if (o.state === 'INVALID' || o.state === 'DELETED') return false;
    if (o.state === 'TEST' && !(opts && opts.includeTestOrders)) return false;
    if (o.state === 'CANCELLED_NO_REFUND') return false; // עד שההחזר נרשם או שההזמנה מתוקנת
    if (o.state === 'UNPAID') return false;
    return true;
  }

  // הזמנה אמיתית לצורך מכנים (AOV, CPA, CAC, נקודת איזון, הזמנות נדרשות): בתוך הרווח, לא דוגמת יוצר, ולא הזמנה שבוטלה והוחזרה במלואה.
  // ביטול עם החזר חלקי נשאר הזמנה (חלק מהכסף נשאר אצלך).
  function isRealOrderRow(r) {
    if (!r.inProfit || r.state === 'CREATOR_SAMPLE') return false;
    if (r.state === 'CANCELLED' && r.netAgorot <= 0) return false;
    return true;
  }
  // שורות פרסום בלי כפילויות (אותו יום, קמפיין וקבוצת מודעות: האחרונה בגיליון), כמו ב-calculateAdSpend
  function dedupeAds(adSpend) {
    var last = {};
    (adSpend || []).forEach(function (r, i) { last[r.date + '|' + r.campaignId + '|' + (r.adsetId || '')] = i; });
    return (adSpend || []).filter(function (r, i) { return last[r.date + '|' + r.campaignId + '|' + (r.adsetId || '')] === i && r.spendAgorot != null; });
  }

  // ---------- מכירות ----------

  function calculateNetRevenue(orders, period, opts) {
    opts = opts || {};
    var gross = 0, disc = 0, refund = 0, count = 0, countTest = 0, testNet = 0, list = [], samples = 0, cancelledN = 0, invalid = [];
    orders.forEach(function (o) {
      if (o.state === 'INVALID') { invalid.push(o.name); return; }
      if (o.state === 'DELETED') return;
      if (!inPeriod(o.date, period)) return;
      if (o.state === 'TEST') { countTest++; testNet += o.netAgorot; if (!opts.includeTestOrders) return; }
      if (opts.profitOnly && !profitEligible(o, opts)) return;
      count++; gross += o.grossAgorot; disc += o.discountAgorot; list.push(o.name);
      if (o.state === 'CREATOR_SAMPLE') samples++; else if (o.state === 'CANCELLED' && o.refundedAgorot >= o.netAgorot) cancelledN++; // בוטלה במלואה. החזר חלקי: ההזמנה נשארת (חלק מהכסף נשאר)
    });
    // החזרים לפי תאריך ההחזר
    orders.forEach(function (o) {
      if (o.state === 'INVALID' || o.state === 'DELETED') return;
      if (o.state === 'TEST' && !opts.includeTestOrders) return;
      if (opts.profitOnly && !profitEligible(o, opts)) return; // ההכנסה ברוטו של הזמנה כזו לא נכנסה, אז גם ההחזר שלה לא יורד
      o.refunds.forEach(function (r) { if (inPeriod(israelDate(r.createdAt), period)) refund += r.amountAgorot; });
    });
    var net = gross - disc - refund;
    return {
      metric: 'netRevenue', period: period, netAgorot: net, grossAgorot: gross, discountAgorot: disc, refundAgorot: refund,
      orderCount: count, sampleOrderCount: samples, cancelledOrderCount: cancelledN, realOrderCount: count - samples - cancelledN, invalidOrders: invalid, orderNames: list, testOrderCount: countTest, testOrdersNetAgorot: testNet,
      components: [
        { name: 'מכירות ברוטו', amountAgorot: gross, confidence: invalid.length ? 'MISSING' : 'VERIFIED', source: 'Shopify' }, // הזמנה שלא נקראה: אי אפשר לדעת שהסכום שלם
        { name: 'הנחות', amountAgorot: -disc, confidence: 'VERIFIED', source: 'Shopify' },
        { name: 'החזרים', amountAgorot: -refund, confidence: 'VERIFIED', source: 'Shopify' }
      ],
      confidence: invalid.length ? 'MISSING' : 'VERIFIED', confidencePercent: invalid.length ? 50 : 100
    };
  }

  // ---------- עלות מוצרים ----------

  function fxRate(fx, ymd, currency) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(ymd || ''))) return null; // תאריך חסר או שבור: אין שער (לא קריסה)
    currency = currency || 'USD'; // כל השערים בכסף הזה הם דולר; מטבע אחר לא דורס אותו
    // שער ליום; אם אין (סוף שבוע/חג) לוקחים את הקודם עד 3 ימים אחורה ומסמנים
    var map = fx._map; if (!map) { map = {}; fx.forEach(function (r) { map[(r.currency || 'USD') + '|' + r.date] = r; }); fx._map = map; }
    for (var i = 0; i <= 3; i++) {
      var r = map[currency + '|' + addDays(ymd, -i)];
      if (r) return { rate: r.rate, date: r.date, exact: i === 0, confidence: r.confidence || 'VERIFIED' };
    }
    return null;
  }

  // אומדן עלות מקטלוג העלויות בתוקף ביום ההזמנה (ושער היום). ok=false אם חסר מוצר או שער או שורות.
  function catalogEstimate(o, productCosts, fx) {
    var est = 0, ok = !!(o.lines && o.lines.length);
    (o.lines || []).forEach(function (l) {
      var pc = null;
      (productCosts || []).forEach(function (p) {
        var key = l.sku || (l.unitsPerVariant === 3 ? '3units' : null);
        if (p.sku === key && p.unitCostUsdCents != null && p.effectiveFrom && p.effectiveFrom <= o.date && (!p.effectiveTo || p.effectiveTo >= o.date)) pc = p;
      });
      if (!pc) { ok = false; return; }
      var r = fxRate(fx, o.date);
      if (!r) { ok = false; return; }
      est += ilsFromUsd(pc.unitCostUsdCents * (l.qty * (l.unitsPerVariant || 1)), r.rate);
    });
    return { ok: ok, agorot: ok ? est : null };
  }

  function calculateCOGS(orders, orderCosts, productCosts, fx, period, opts) {
    opts = opts || {};
    var byOrder = {};
    (orderCosts || []).forEach(function (c) { (byOrder[c.orderName] = byOrder[c.orderName] || []).push(c); });
    var total = 0, creatorAgorot = 0, perOrder = [], labels = [], missing = [], statusReview = [];
    orders.forEach(function (o) {
      if (!inPeriod(o.date, period)) return;
      if (!profitEligible(o, opts) && o.state !== 'CREATOR_SAMPLE') return;
      var rows = byOrder[o.name] || [], amt = 0, conf = [], detail = [];
      // בוטלה, הוחזרה במלואה ואין רכישה רשומה: אין עלות אמיתית. החזר חלקי בלבד: ההזמנה נשארת בהכנסה, ולכן עלות משוערת/חסרה כרגיל
      if (!rows.length && o.state === 'CANCELLED' && o.refundedAgorot >= o.netAgorot) return;
      if (rows.length) {
        rows.forEach(function (c) {
          if (c.amountUsdCents == null || !c.purchaseDate) { conf.push('MISSING'); detail.push({ supplierOrder: c.supplierOrder, usdCents: c.amountUsdCents, agorot: null, reason: c.amountUsdCents == null ? 'סכום רכישה חסר' : 'תאריך רכישה חסר' }); return; }
          var r = fxRate(fx, c.purchaseDate);
          // סכום נעול (freezeOrderCosts): אם הוא עקבי (סכום בדולר × שער שנשמר = הסכום בשקלים) הוא מקור האמת, גם אם שורת השער השתנתה או נמחקה אחר כך
          var frozen = c.convertedAgorot != null && c.rateUsed > 0 && ilsFromUsd(c.amountUsdCents, c.rateUsed) === c.convertedAgorot;
          if (!r && !frozen) { conf.push('MISSING'); detail.push({ supplierOrder: c.supplierOrder, usdCents: c.amountUsdCents, agorot: null, reason: 'אין שער' }); return; }
          if (!r) r = { rate: c.rateUsed, date: c.rateDate || c.purchaseDate, exact: true, confidence: 'VERIFIED' };
          var a = frozen ? c.convertedAgorot : ilsFromUsd(c.amountUsdCents, r.rate);
          amt += a;
          // שער יציג של בנק ישראל תקף עד הפרסום הבא: ביום בלי פרסום (סוף שבוע, חג) משתמשים בשער היום העסקי הקודם, וזה לא הערכה
          var cc = worst([c.confidence || 'MANUAL', r.confidence]);
          // רכש בסטטוס החזרה/ביטול נספר (שמרני), אבל לא כעלות מאומתת: ממתין לאישור שהספק לא זיכה
          if (/return|cancel|refund/i.test(String(c.status || ''))) { cc = worst([cc, 'ESTIMATED']); statusReview.push({ order: o.name, supplierOrder: c.supplierOrder, status: c.status, usdCents: c.amountUsdCents, agorot: a }); }
          conf.push(cc);
          detail.push({ supplierOrder: c.supplierOrder, usdCents: c.amountUsdCents, rate: frozen ? c.rateUsed : r.rate, rateDate: frozen ? (c.rateDate || r.date) : r.date, rateCarried: !r.exact, agorot: a, status: c.status, frozen: frozen });
        });
      } else {
        // אין רכישה רשומה: עלות לפי product_costs בתוקף
        var ce = catalogEstimate(o, productCosts, fx);
        if (ce.ok) { amt = ce.agorot; conf.push('ESTIMATED'); detail.push({ reason: 'לפי עלות מוצר בתוקף, אין רכישה רשומה' }); }
        else { conf.push('MISSING'); missing.push(o.name); }
      }
      var c = worst(conf);
      if (o.state === 'CREATOR_SAMPLE') creatorAgorot += amt; else total += amt;
      perOrder.push({ name: o.name, agorot: amt, confidence: c, detail: detail, creatorSample: o.state === 'CREATOR_SAMPLE' });
      labels.push(c);
    });
    var comps = [{ name: 'עלות מוצרים ומשלוח לספק', amountAgorot: total, confidence: worst(labels.length ? labels : ['VERIFIED']), source: 'AutoDS' }];
    perOrder.forEach(function (p) { if (p.confidence === 'MISSING' && missing.indexOf(p.name) < 0) missing.push(p.name); });
    return { metric: 'cogs', period: period, cogsAgorot: total, creatorSamplesAgorot: creatorAgorot, perOrder: perOrder, statusReview: statusReview,
      ordersMissingCost: missing, components: comps, confidence: comps[0].confidence, confidencePercent: confidencePercent(perOrder.map(function (p) { return { amountAgorot: p.agorot, confidence: p.confidence }; })) };
  }

  // ---------- עמלות סליקה ----------

  function feeForOrder(o, feeRates) {
    if (!o.gateway) return { agorot: 0, confidence: 'VERIFIED', detail: 'אין סליקה' };
    var rule = null;
    (feeRates || []).forEach(function (r) {
      if (r.gateway === o.gateway && r.effectiveFrom <= o.date && (!r.effectiveTo || r.effectiveTo >= o.date)) rule = r;
    });
    if (!rule) return { agorot: 0, confidence: 'MISSING', detail: 'אין תעריף לשער ' + o.gateway };
    if (rule.actualAgorot != null) return { agorot: rule.actualAgorot, confidence: 'VERIFIED', detail: 'עמלה בפועל' };
    var base = o.netAgorot, sum = 0, parts = []; // העמלה נגבית על ההזמנה בתאריכה; החזר לא מחזיר עמלה ולא משנה חודש סגור
    rule.components.forEach(function (c) {
      var a = base * (c.rate || 0) + (c.fixedAgorot || 0);
      if (c.vat) a *= (1 + VAT_RATE);
      a = roundHalfUp(a); sum += a; parts.push({ name: c.name, agorot: a });
    });
    return { agorot: sum, confidence: rule.confidence || 'ESTIMATED', detail: parts };
  }

  function calculatePaymentFees(orders, feeRates, period, opts) {
    var total = 0, per = [], labels = [];
    orders.forEach(function (o) {
      if (!inPeriod(o.date, period) || !profitEligible(o, opts)) return;
      var f = feeForOrder(o, feeRates);
      total += f.agorot; per.push({ name: o.name, agorot: f.agorot, confidence: f.confidence, detail: f.detail }); labels.push(f.confidence);
    });
    var conf = worst(labels.length ? labels : ['VERIFIED']);
    return { metric: 'paymentFees', period: period, feesAgorot: total, perOrder: per,
      components: [{ name: 'עמלות סליקה', amountAgorot: total, confidence: conf, source: 'PayPlus/ישראכרט/Shopify' }], confidence: conf, confidencePercent: confidencePercent(per.map(function (p) { return { amountAgorot: p.agorot, confidence: p.confidence }; })) };
  }

  // ---------- פרסום ----------

  function calculateAdSpend(adSpend, period, opts) {
    // adSpend: [{date, campaignId, campaignName, adsetId, spendAgorot, purchases, purchaseValueAgorot, confidence}]
    var total = 0, days = {}, byCampaign = {}, labels = [], dupKeys = {}, badRows = 0, last = {};
    // שורה כפולה (אותו יום, קמפיין וקבוצת מודעות) נספרת פעם אחת: האחרונה בגיליון. הכפילות מדווחת ב-dataHealth.
    (adSpend || []).forEach(function (r, i) { var k = r.date + '|' + r.campaignId + '|' + (r.adsetId || ''); if (last[k] != null) dupKeys[k] = 1; last[k] = i; });
    (adSpend || []).forEach(function (r, i) {
      if (!inPeriod(r.date, period)) return;
      if (last[r.date + '|' + r.campaignId + '|' + (r.adsetId || '')] !== i) return;
      if (r.spendAgorot == null) { badRows++; return; } // הוצאה שלא ניתן לקרוא: לא נספרת כ-0, היום נחשב חסר
      total += r.spendAgorot; days[r.date] = 1; labels.push(r.confidence || 'VERIFIED');
      var k = r.campaignId || '?';
      byCampaign[k] = byCampaign[k] || { campaignId: k, campaignName: r.campaignName, spendAgorot: 0, purchases: 0 };
      byCampaign[k].spendAgorot += r.spendAgorot; byCampaign[k].purchases += r.purchases || 0;
    });
    var coverage = (opts && opts.coverage) || null; // {from,to}: הטווח שיש לו נתונים בכלל. יום בתוך הכיסוי בלי שורה = 0 אמיתי
    var todayYmd = israelDate((opts && opts.now) || new Date()), yesterday = addDays(todayYmd, -1);
    var end = period.to < yesterday ? period.to : yesterday; // ימים שעוד לא עברו לא "חסרים"
    var expected = end >= period.from ? periodDays({ from: period.from, to: end }) : 0, covered = 0;
    for (var d = period.from, k2 = 0; expected && d <= end && k2 < 4000; d = addDays(d, 1), k2++) {
      if (days[d] || (coverage && coverage.from <= d && coverage.to >= d)) covered++;
    }
    var missingDays = expected - covered + badRows, missing = missingDays > 0;
    var conf = missing ? 'MISSING' : worst(labels.length ? labels : ['VERIFIED']);
    // "היום" (או תקופה שכוללת את היום): הבוט מושך עד אתמול, ולכן הוצאת היום עוד לא ידועה. לא VERIFIED.
    var todayOpen = period.from <= todayYmd && period.to >= todayYmd && !days[todayYmd];
    if (todayOpen) conf = worst([conf, 'ESTIMATED']);
    var avgDay = Object.keys(days).length ? total / Object.keys(days).length : 0;
    return { metric: 'adSpend', period: period, adSpendAgorot: total, daysWithData: Object.keys(days).length, expectedDays: expected, coveredDays: covered, missingDays: missingDays, todayOpen: todayOpen, duplicateKeys: Object.keys(dupKeys), unreadableRows: badRows, byCampaign: byCampaign,
      components: [{ name: 'פרסום', amountAgorot: total, confidence: conf, source: 'Meta', estimatedAgorot: missing ? roundHalfUp(avgDay * missingDays) : 0 }], confidence: conf,
      confidencePercent: expected ? Math.min(Math.round(100 * covered / (expected + badRows)), missing ? MISSING_CAP : 100) : (todayOpen ? 50 : (badRows ? MISSING_CAP : null)) };
  }

  // ---------- הוצאות קבועות ----------

  function allocateExpense(e, period) {
    // הקצאה לפי ימים קלנדריים: לכל חודש חופף, סכום חודשי × ימים בתוקף בתקופה ÷ ימי החודש, מעוגל לכל חודש
    if (e.category === 'OneTime') return inPeriod(e.date, period) ? e.amountAgorot : 0;
    var from = e.startDate > period.from ? e.startDate : period.from;
    var to = (e.endDate && e.endDate < period.to) ? e.endDate : period.to;
    if (from > to) return 0;
    var total = 0, cur = from;
    while (cur <= to) {
      var ym = monthOf(cur), dim = daysInMonth(ym);
      var mEnd = ym + '-' + ('0' + dim).slice(-2);
      var segEnd = mEnd < to ? mEnd : to;
      // עיגול מצטבר לפי מקום היום בחודש: סכום חלקי תקופה = סכום התקופה כולה, ובחודש מלא בדיוק הסכום החודשי
      var d1 = Number(cur.slice(8, 10)), d2 = Number(segEnd.slice(8, 10));
      total += roundHalfUp(e.monthlyAgorot * d2 / dim) - roundHalfUp(e.monthlyAgorot * (d1 - 1) / dim);
      cur = addDays(segEnd, 1);
    }
    return total;
  }

  // M9: אותו שם הוצאה קבועה בשתי שורות שטווחי התאריכים שלהן חופפים נסכם פעמיים. מדווח, לא מתוקן אוטומטית.
  function expenseOverlaps(expenses) {
    var by = {}, out = [];
    (expenses || []).forEach(function (e) { if (e.category === 'OneTime' || e.category === 'AdCredit' || !e.startDate) return; (by[String(e.name || '').trim()] = by[String(e.name || '').trim()] || []).push(e); });
    Object.keys(by).forEach(function (n) {
      var l = by[n]; for (var i = 0; i < l.length; i++) for (var j = i + 1; j < l.length; j++) {
        var a = l[i], b = l[j], aEnd = a.endDate || '9999-12-31', bEnd = b.endDate || '9999-12-31';
        if (a.startDate <= bEnd && b.startDate <= aEnd) out.push({ name: n, ids: [a.id, b.id] });
      }
    });
    return out;
  }

  // Actual vs Allocated: "הוקצה" = חלק יחסי לפי ימים (allocateExpense). "חויב בפועל" = כל חיוב שתאריכו בתוך התקופה, לפי יום חיוב בחודש.
  // בלי billingDay אי אפשר לדעת מתי חויב: ההוצאה מסומנת MISSING ולא נכנסת להשוואה (לא מנחשים).
  function chargeDates(e, period) {
    var from = e.startDate > period.from ? e.startDate : period.from;
    var to = (e.endDate && e.endDate < period.to) ? e.endDate : period.to;
    var out = [], cur = from.slice(0, 7) + '-01', guard = 0;
    while (cur <= to && guard++ < 600) {
      var ym = monthOf(cur), dim = daysInMonth(ym), bd = Math.min(e.billingDay, dim);
      var d = ym + '-' + ('0' + bd).slice(-2);
      if (d >= e.startDate && d >= period.from && d <= to) out.push(d);
      cur = addDays(ym + '-' + ('0' + dim).slice(-2), 1);
    }
    return out;
  }
  function calculateFixedActual(expenses, period) {
    var actual = 0, allocated = 0, per = [], missing = [], labels = [];
    (expenses || []).forEach(function (e) {
      if (e.category === 'AdCredit') return;
      if (e.category === 'OneTime') {
        if (!e.date || e.amountAgorot == null || !inPeriod(e.date, period)) return;
        actual += e.amountAgorot; allocated += e.amountAgorot;
        per.push({ id: e.id, name: e.name, category: e.category, actualAgorot: e.amountAgorot, allocatedAgorot: e.amountAgorot, charges: [e.date], confidence: e.confidence || 'MANUAL' }); labels.push(e.confidence || 'MANUAL');
        return;
      }
      if (!e.startDate || e.monthlyAgorot == null) return; // כבר מסומן MISSING ב-calculateFixedCosts
      var al = allocateExpense(e, period);
      if (!(e.billingDay >= 1 && e.billingDay <= 31)) { if (al) missing.push({ id: e.id, name: e.name, allocatedAgorot: al, reason: 'אין יום חיוב' }); return; }
      var ch = chargeDates(e, period), a = ch.length * e.monthlyAgorot;
      if (!a && !al) return;
      actual += a; allocated += al;
      per.push({ id: e.id, name: e.name, category: e.category, actualAgorot: a, allocatedAgorot: al, charges: ch, confidence: e.confidence || 'MANUAL' }); labels.push(e.confidence || 'MANUAL');
    });
    var conf = missing.length ? 'MISSING' : worst(labels.length ? labels : ['MANUAL']);
    return { metric: 'fixedActual', period: period, actualAgorot: actual, allocatedComparableAgorot: allocated, diffAgorot: actual - allocated, perExpense: per, missing: missing, confidence: conf };
  }
  function calculateFixedCosts(expenses, period) {
    var total = 0, per = [], labels = [];
    (expenses || []).forEach(function (e) {
      if (e.category === 'AdCredit') return; // קרדיט פרסום אינו הוצאה קבועה
      if (e.category !== 'OneTime' && (!e.startDate || e.monthlyAgorot == null)) { // בלי תאריך התחלה או סכום אי אפשר להקצות: חסר, לא "מאז ומעולם"
        per.push({ id: e.id, name: e.name, category: e.category, agorot: 0, confidence: 'MISSING' }); labels.push('MISSING'); return;
      }
      if (e.category === 'OneTime' && (!e.date || e.amountAgorot == null)) { per.push({ id: e.id, name: e.name, category: e.category, agorot: 0, confidence: 'MISSING' }); labels.push('MISSING'); return; }
      var a = allocateExpense(e, period);
      if (a === 0) return;
      total += a; per.push({ id: e.id, name: e.name, category: e.category, agorot: a, confidence: e.confidence || 'MANUAL' }); labels.push(e.confidence || 'MANUAL');
    });
    var conf = worst(labels.length ? labels : ['MANUAL']);
    return { metric: 'fixedCosts', period: period, fixedAgorot: total, perExpense: per,
      components: [{ name: 'הוצאות קבועות מוקצות', amountAgorot: total, confidence: conf, source: 'expenses' }], confidence: conf, confidencePercent: confidencePercent(per.map(function (p) { return { amountAgorot: p.agorot, confidence: p.confidence }; })), overlaps: expenseOverlaps(expenses) };
  }

  // ---------- רמות הרווח ----------

  function calculateGrossProfit(rev, cogs) {
    var comps = rev.components.concat(cogs.components.map(neg));
    return { metric: 'grossProfit', period: rev.period, agorot: rev.netAgorot - cogs.cogsAgorot, components: comps, confidence: worst(comps.map(cf)), confidencePercent: confidencePercent(comps), missing: missingOf(comps) };
  }
  function calculateContributionProfit(rev, cogs, fees, ads) {
    var comps = rev.components.concat(cogs.components.map(neg), fees.components.map(neg), ads.components.map(neg));
    if (cogs.creatorSamplesAgorot) comps.push({ name: 'מוצרים ליוצרי תוכן', amountAgorot: -cogs.creatorSamplesAgorot, confidence: 'MANUAL', source: 'AutoDS' });
    var a = rev.netAgorot - cogs.cogsAgorot - fees.feesAgorot - ads.adSpendAgorot - (cogs.creatorSamplesAgorot || 0);
    return { metric: 'contributionProfit', period: rev.period, agorot: a, components: comps, confidence: worst(comps.map(cf)), confidencePercent: confidencePercent(comps), missing: missingOf(comps) };
  }
  function calculateNetProfit(contrib, fixed) {
    var comps = contrib.components.concat(fixed.components.map(neg));
    return { metric: 'netProfit', period: contrib.period, agorot: contrib.agorot - fixed.fixedAgorot, components: comps, confidence: worst(comps.map(cf)), confidencePercent: confidencePercent(comps), missing: missingOf(comps) };
  }
  function neg(c) { var d = {}; for (var k in c) d[k] = c[k]; d.amountAgorot = -(c.amountAgorot || 0); return d; }
  function cf(c) { return c.confidence; }

  // ---------- קרדיט פרסום ----------
  // הוצאת הפרסום נשארת מלאה (כמו שמטא מדווחת). קרדיט = החלק שלא נגבה מהכרטיס. מוצג כשורה נפרדת, לא מוריד את ההוצאה.
  // קרדיט נרשם בלשונית expenses_v2 בקטגוריה AdCredit: amount_agorot = הקרדיט, start_date..end_date = טווח ההוצאה שהוא מכסה.
  // מוצג רק כשהתקופה מכילה את כל הטווח; אחרת לא ידוע כמה ממנו נפל בתקופה.
  function calculateAdCredit(expenses, ads, period) {
    var cr = (expenses || []).filter(function (e) { return e.category === 'AdCredit'; });
    if (!cr.length) return { creditAgorot: 0, applies: false, partial: false, cashProfitDeltaAgorot: 0, confidence: 'VERIFIED', rows: [] };
    var total = 0, partial = false, rows = [], labels = [];
    cr.forEach(function (e) {
      if (e.endDate < period.from || e.startDate > period.to) return;
      if (e.startDate >= period.from && e.endDate <= period.to) { total += e.amountAgorot; rows.push(e); labels.push(e.confidence || 'MANUAL'); }
      else partial = true;
    });
    return { creditAgorot: total, applies: total > 0, partial: partial, cashPaidAgorot: total > 0 ? ads.adSpendAgorot - total : null,
      confidence: labels.length ? worst(labels) : 'MANUAL', rows: rows };
  }

  // ---------- בדיקת תקינות נתוני המנוע (מבוצעת על הנתונים עצמם, בלי שרת) ----------
  // opts: {now: ISO, syncedAt: ISO|null}. כל בדיקה: ok / warn (דורש תשומת לב, לא שבור) / bad (שבור).
  function dataHealth(data, opts) {
    opts = opts || {};
    var now = opts.now || new Date().toISOString(), today = israelDate(now), checks = [];
    function add(id, label, level, detail) { checks.push({ id: id, label: label, level: level, ok: level === 'ok', detail: detail || '' }); }
    var orders = normalizeOrders(data.orders, data.flags), all = periodAll(now);

    var seen = {}, dup = [];
    (data.orders || []).forEach(function (o) { if (seen[o.name]) dup.push(o.name); seen[o.name] = 1; });
    add('orders_unique', 'אין הזמנות כפולות', dup.length ? 'bad' : 'ok', dup.length ? 'כפולות: ' + dup.join(', ') : (data.orders || []).length + ' הזמנות');

    var arith = [];
    (data.orders || []).forEach(function (o) {
      var sum = 0; (o.lines || []).forEach(function (l) { sum += l.unitPriceAgorot * l.qty; });
      if (o.netAgorot !== o.grossAgorot - o.discountAgorot) arith.push(o.name + ' (נטו ≠ ברוטו פחות הנחה)');
      else if ((o.lines || []).length && sum !== o.grossAgorot) arith.push(o.name + ' (ברוטו ≠ סכום השורות)');
      else if (!(o.lines || []).length) arith.push(o.name + ' (אין שורות מוצר)');
    });
    add('orders_arith', 'סכומי ההזמנות מתאימים לשורות שלהן', arith.length ? 'bad' : 'ok', arith.join(', '));

    var cogs = calculateCOGS(orders, data.orderCosts, data.productCosts, data.fx, all);
    add('cost_coverage', 'לכל הזמנה ברווח יש עלות מוצר', cogs.ordersMissingCost.length ? 'bad' : 'ok', cogs.ordersMissingCost.length ? 'בלי עלות: ' + cogs.ordersMissingCost.join(', ') : '');
    var reviewNames = (cogs.statusReview || []).map(function (r) { return r.order; });
    var est = cogs.perOrder.filter(function (p) { return p.confidence === 'ESTIMATED' && reviewNames.indexOf(p.name) < 0; }).map(function (p) { return p.name; });
    add('cost_actual', 'העלות מבוססת על רכישה בפועל', est.length ? 'warn' : 'ok', est.length ? 'מחיר ספק נוכחי במקום רכישה בפועל: ' + est.join(', ') : '');

    // שער הזמנה נדרש רק להזמנה שהעלות שלה נגזרת מהקטלוג (בלי שורת רכש); עלות רכש משתמשת בשער תאריך הרכישה (בדיקה נפרדת)
    var costNames = {}; (data.orderCosts || []).forEach(function (c) { if (c.amountUsdCents != null) costNames[c.orderName] = 1; });
    var noFx = [];
    orders.forEach(function (o) { if (profitEligible(o) && !costNames[o.name] && !fxRate(data.fx, o.date)) noFx.push(o.name); });
    add('fx_coverage', 'יש שער בנק ישראל לכל הזמנה שעלותה מהקטלוג', noFx.length ? 'bad' : 'ok', noFx.length ? 'בלי שער: ' + noFx.join(', ') : '');
    var deleted = orders.filter(function (o) { return o.state === 'DELETED'; }).map(function (o) { return o.name; });
    add('orders_deleted', 'אין הזמנות שנמחקו ב-Shopify', deleted.length ? 'warn' : 'ok', deleted.length ? 'נמחקו ב-Shopify ומוחרגות מכל הסכומים: ' + deleted.join(', ') : '');
    var noFxBuy = [];
    (data.orderCosts || []).forEach(function (c) {
      if (c.amountUsdCents == null || !c.purchaseDate) return;
      var frozen = c.convertedAgorot != null && c.rateUsed > 0 && ilsFromUsd(c.amountUsdCents, c.rateUsed) === c.convertedAgorot;
      if (!frozen && !fxRate(data.fx, c.purchaseDate)) noFxBuy.push(c.orderName + (c.supplierOrder ? ' (' + c.supplierOrder + ')' : ''));
    });
    add('fx_purchase', 'יש שער לכל תאריך רכישה שלא ננעל', noFxBuy.length ? 'bad' : 'ok', noFxBuy.join(', '));

    var fees = calculatePaymentFees(orders, data.feeRates, all);
    var weak = fees.perOrder.filter(function (p) { return p.confidence === 'MISSING'; }).map(function (p) { return p.name; });
    var estf = fees.perOrder.filter(function (p) { return p.confidence === 'ESTIMATED'; }).map(function (p) { return p.name; });
    add('fee_coverage', 'לכל הזמנה ברווח יש תעריף עמלה', weak.length ? 'bad' : (estf.length ? 'warn' : 'ok'), weak.length ? 'בלי תעריף: ' + weak.join(', ') : (estf.length ? 'תעריף לא מאומת: ' + estf.join(', ') : ''));

    var cov = data.adSpendCoverage, lagDays = cov ? Math.round((Date.parse(addDays(today, -1) + 'T00:00:00Z') - Date.parse(cov.to + 'T00:00:00Z')) / 864e5) : null;
    add('ads_fresh', 'נתוני הפרסום מעודכנים עד אתמול', !cov ? 'bad' : (lagDays > 0 ? 'warn' : 'ok'), !cov ? 'אין נתוני פרסום' : (lagDays > 0 ? 'הנתון האחרון מ-' + cov.to + ', חסרים ' + lagDays + ' ימים (עד שהסנכרון היומי יעבוד, מעדכנים ידנית)' : 'עד ' + cov.to));

    if (opts.syncedAt !== undefined) {
      var ageH = opts.syncedAt ? (Date.parse(now) - Date.parse(opts.syncedAt)) / 36e5 : null;
      add('orders_fresh', 'סנכרון ההזמנות מ-Shopify טרי', ageH == null ? 'bad' : (ageH > 3 ? 'warn' : 'ok'), ageH == null ? 'אין חותמת סנכרון' : 'לפני ' + (ageH < 1 ? Math.round(ageH * 60) + ' דקות' : ageH.toFixed(1) + ' שעות'));
    }

    var badExp = (data.expenses || []).filter(function (e) {
      if (e.category === 'OneTime') return !(e.amountAgorot >= 0) || !e.date;
      if (e.category === 'AdCredit') return !(e.amountAgorot >= 0) || !e.startDate || !e.endDate;
      return !(e.monthlyAgorot >= 0) || !e.startDate;
    }).map(function (e) { return e.id; });
    add('expenses_valid', 'שורות ההוצאה תקינות', badExp.length ? 'bad' : 'ok', badExp.join(', '));

    // ערכים שהמתאם לא הצליח לקרוא (מספר/תאריך שבור): מדווחים, לא הופכים בשקט ל-0
    var iss = data.issues || [];
    add('adapter_clean', 'כל הערכים בגיליון נקראו', iss.length ? 'bad' : 'ok', iss.slice(0, 5).map(function (x) { return x.tab + ' שורה ' + x.row + ' ' + x.field + ' (' + x.why + ')'; }).join('; ') + (iss.length > 5 ? ' ועוד ' + (iss.length - 5) : ''));
    var adsAll = calculateAdSpend(data.adSpend, all, { coverage: data.adSpendCoverage, now: now });
    add('ads_unique', 'אין שורות פרסום כפולות', adsAll.duplicateKeys.length ? 'bad' : 'ok', adsAll.duplicateKeys.slice(0, 5).join(', '));
    // סכומי רכש נעולים: כל שורה עם סכום ותאריך צריכה להיות נעולה, וסכום נעול חייב להיות עקבי ולהתאים לשער הנוכחי
    var unfrozen = [], inconsistent = [], drift = [];
    (data.orderCosts || []).forEach(function (c) {
      if (c.amountUsdCents == null || !c.purchaseDate) return;
      var label = c.orderName + (c.supplierOrder ? ' (' + c.supplierOrder + ')' : '');
      if (c.convertedAgorot == null) { unfrozen.push(label); return; }
      if (!(c.rateUsed > 0) || ilsFromUsd(c.amountUsdCents, c.rateUsed) !== c.convertedAgorot) { inconsistent.push(label); return; }
      var rr = fxRate(data.fx, c.rateDate || c.purchaseDate);
      if (rr && rr.rate !== c.rateUsed) drift.push(label);
    });
    add('cost_frozen', 'סכומי הרכש נעולים בשקלים', inconsistent.length ? 'bad' : ((unfrozen.length || drift.length) ? 'warn' : 'ok'),
      inconsistent.length ? 'סכום נעול לא תואם לשער שלו: ' + inconsistent.join(', ') : (drift.length ? 'השער בטבלה השתנה מאז הנעילה: ' + drift.join(', ') : (unfrozen.length ? 'עוד לא ננעלו: ' + unfrozen.join(', ') : '')));
    // order_costs: כפילות, יתומה, ועלות על הזמנה שלא נכנסת לרווח. כל אחת משנה או מסתירה COGS בלי שמישהו שם לב.
    var seenSup = {}, dupSup = [], orphanCost = [], excludedCost = [], byName = {};
    orders.forEach(function (o) { byName[o.name] = o; });
    (data.orderCosts || []).forEach(function (c) {
      var key = c.orderName + '|' + (c.supplierOrder || '');
      if (c.supplierOrder) { if (seenSup[key]) dupSup.push(c.orderName + ' (' + c.supplierOrder + ')'); seenSup[key] = 1; }
      var o = byName[c.orderName];
      if (!o) orphanCost.push(c.orderName + (c.supplierOrder ? ' (' + c.supplierOrder + ')' : ''));
      else if ((o.state === 'CANCELLED_NO_REFUND' || o.state === 'UNPAID') && c.amountUsdCents != null) excludedCost.push(o.name + ' (' + o.state + (c.status ? ', ' + c.status : '') + ', $' + (c.amountUsdCents / 100).toFixed(2) + ')');
    });
    add('cost_duplicates', 'אין שורת רכש כפולה לאותה הזמנת ספק', dupSup.length ? 'bad' : 'ok', dupSup.join(', '));
    add('cost_orphans', 'לכל שורת רכש יש הזמנה', orphanCost.length ? 'warn' : 'ok', orphanCost.join(', '));
    add('cost_excluded', 'אין עלות רכש על הזמנה שלא נכנסת לרווח', excludedCost.length ? 'warn' : 'ok', excludedCost.length ? 'העלות לא נספרת ברווח: ' + excludedCost.join(', ') : '');
    // עלות רכש נמוכה בהרבה מאומדן הקטלוג להזמנה: ייתכן שחסרה שורת רכש ליחידה
    var lowCost = [];
    cogs.perOrder.forEach(function (p) {
      if (p.creatorSample || p.confidence === 'MISSING' || !(byName[p.name] && (byName[p.name].lines || []).length)) return;
      var hasPurchase = (data.orderCosts || []).some(function (c) { return c.orderName === p.name && c.amountUsdCents != null; });
      if (!hasPurchase) return;
      var ce = catalogEstimate(byName[p.name], data.productCosts, data.fx);
      if (ce.ok && ce.agorot > 0 && p.agorot < 0.6 * ce.agorot) lowCost.push(p.name + ' (רכש ' + fmt(p.agorot) + ' מול אומדן ' + fmt(ce.agorot) + ')');
    });
    add('cost_vs_units', 'עלות הרכש סבירה ביחס לכמות היחידות', lowCost.length ? 'warn' : 'ok', lowCost.join(', '));
    // סטטוס תשלום "הוחזר" בלי שורות החזר: ההכנסה נספרת במלואה
    var noRefundRows = [];
    (data.orders || []).forEach(function (o) {
      var st = String(o.financialStatus || '').toUpperCase();
      if ((st === 'REFUNDED' || st === 'PARTIALLY_REFUNDED') && !(o.refunds || []).length) noRefundRows.push(o.name);
    });
    add('refund_rows', 'הזמנה שסומנה כמוחזרת כוללת שורות החזר', noRefundRows.length ? 'bad' : 'ok', noRefundRows.join(', '));
    var review = cogs.statusReview || [];
    add('cost_status', 'אין רכש בסטטוס החזרה או ביטול שנספר כעלות', review.length ? 'warn' : 'ok', review.map(function (r) { return r.order + ' (' + r.status + ', $' + (r.usdCents / 100).toFixed(2) + ')'; }).join(', '));
    var lastFx = (data.fx || []).reduce(function (m, r) { return r.date > m ? r.date : m; }, '');
    var fxAge = lastFx ? Math.round((Date.parse(today + 'T00:00:00Z') - Date.parse(lastFx + 'T00:00:00Z')) / 864e5) : null;
    add('fx_fresh', 'שער הדולר מעודכן', fxAge == null ? 'bad' : (fxAge > 4 ? 'warn' : 'ok'), fxAge == null ? 'אין שערים' : 'השער האחרון מ-' + lastFx);
    var ov = calculateFixedCosts(data.expenses, all).overlaps;
    add('expenses_overlap', 'אין הוצאה קבועה כפולה בטווחים חופפים', ov.length ? 'warn' : 'ok', ov.map(function (x) { return x.name + ' (' + x.ids.join(', ') + ')'; }).join(', '));

    var bad = checks.filter(function (c) { return c.level === 'bad'; }).length, warn = checks.filter(function (c) { return c.level === 'warn'; }).length;
    return { checks: checks, bad: bad, warn: warn, ok: bad === 0 && warn === 0 };
  }

  // ---------- התאמה ל-Shopify ----------
  // feed = תשובת השרת לפעולה orders: {orders:[{name, refunded:'12.34'}], excluded:[{name, reason:'test'|'cancelled'}]}.
  // משווה רק מה שמוגדר אותו דבר בשני הצדדים (קבוצת ההזמנות, סימון בדיקה, סכום החזרים), בלי להשוות סכומי מכירות שמוגדרים אחרת.
  // red = חסרה בגיליון הזמנה או שסכום החזר שונה. yellow = הזמנה בגיליון שאינה ב-Shopify, או הבדל בסימון בדיקה. green = זהה.
  function reconcileOrders(data, feed) {
    var orders = normalizeOrders(data.orders, data.flags), sheet = {}, shop = {}, tests = {}, refunds = {}, totals = {};
    orders.forEach(function (o) { if (o.state !== 'INVALID' && o.state !== 'DELETED') sheet[o.name] = o; });
    ((feed && feed.orders) || []).forEach(function (o) { shop[o.name] = 1; if (o.totalPrice != null) totals[o.name] = Math.round(parseFloat(o.totalPrice) * 100); refunds[o.name] = Math.round(parseFloat(o.refunded || '0') * 100) || 0; });
    ((feed && feed.excluded) || []).forEach(function (o) { shop[o.name] = 1; if (o.totalPrice != null) totals[o.name] = Math.round(parseFloat(o.totalPrice) * 100); if (o.reason === 'test') tests[o.name] = 1; refunds[o.name] = Math.round(parseFloat(o.refunded || '0') * 100) || 0; });
    var onlyShopify = Object.keys(shop).filter(function (n) { return !sheet[n]; }).sort();
    var onlySheet = Object.keys(sheet).filter(function (n) { return !shop[n]; }).sort();
    var testMismatch = Object.keys(sheet).filter(function (n) { return shop[n] && (sheet[n].state === 'TEST') !== !!tests[n]; }).sort();
    var refundDiff = Object.keys(sheet).filter(function (n) { return shop[n] && sheet[n].refundedAgorot !== refunds[n]; }).map(function (n) { return { name: n, sheetAgorot: sheet[n].refundedAgorot, shopifyAgorot: refunds[n] }; });
    // סכום כל הזמנה: מה ש-Shopify גבתה (total_price, כולל משלוח) מול נטו + משלוח בגיליון. מספר בכל צד, ההפרש, וההזמנות שמסבירות אותו.
    var amountDiff = [], shopTotal = 0, sheetTotal = 0;
    Object.keys(sheet).forEach(function (n) {
      if (!shop[n] || totals[n] == null) return;
      var mine = sheet[n].netAgorot + (sheet[n].shippingAgorot || 0);
      shopTotal += totals[n]; sheetTotal += mine;
      if (mine !== totals[n]) amountDiff.push({ name: n, sheetAgorot: mine, shopifyAgorot: totals[n], diffAgorot: mine - totals[n] });
    });
    var level = (onlyShopify.length || refundDiff.length || amountDiff.length) ? 'bad' : ((onlySheet.length || testMismatch.length) ? 'warn' : 'ok');
    return { level: level, shopifyCount: Object.keys(shop).length, sheetCount: Object.keys(sheet).length, onlyShopify: onlyShopify, onlySheet: onlySheet, testMismatch: testMismatch, refundDiff: refundDiff, amountDiff: amountDiff, shopifyTotalAgorot: shopTotal, sheetTotalAgorot: sheetTotal, diffAgorot: sheetTotal - shopTotal };
  }

  // ---------- למה הרווח השתנה ----------
  // פירוק שינוי ברווח הנקי בין שתי תקופות (A קודמת, B נוכחית) לרכיבים שסכומם שווה לשינוי בדיוק.
  // החלק שמושפע מההזמנות (מכירות פחות עלות, דוגמאות ועמלות) מתפרק לכמות הזמנות ולשינוי ממוצע להזמנה (מחיר/תמהיל, הנחות, עלות, עמלות);
  // פרסום והוצאות קבועות נכנסים כשינוי שלהם. עיגול באגורות נרשם בשורה נפרדת (בדרך כלל 0 עד 3 אגורות), לא מוסתר.
  function explainChange(data, pA, pB, opts) {
    var A = summarize(data, pA, opts), B = summarize(data, pB, opts);
    function parts(s) {
      var r = s.revenueForProfit, n = r.orderCount;
      return { n: n, rev: r.netAgorot, disc: r.discountAgorot || 0, cogs: s.cogs.cogsAgorot, samples: s.cogs.creatorSamplesAgorot || 0, fees: s.fees.feesAgorot,
        ads: s.ads.adSpendAgorot, fixed: s.fixed.fixedAgorot, net: s.netProfit.agorot, missing: s.netProfit.missing };
    }
    var a = parts(A), b = parts(B);
    var pa = a.rev - a.cogs - a.samples - a.fees, pb = b.rev - b.cogs - b.samples - b.fees; // רווח מהזמנות, לפני פרסום וקבועות
    var comps = [];
    function add(id, label, v, why) { comps.push({ id: id, label: label, agorot: v || 0, why: why }); }
    var avg = function (x, n) { return n ? x / n : 0; };
    if (a.n === 0 || b.n === 0) {
      add('volume', 'כמות הזמנות', pb - pa, a.n === 0 ? 'בתקופה הקודמת לא היו הזמנות ברווח' : 'בתקופה הנוכחית אין הזמנות ברווח');
    } else {
      var vol = Math.round((b.n - a.n) * pa / a.n);
      var dDisc = -Math.round(b.n * (avg(b.disc, b.n) - avg(a.disc, a.n)));
      var dRev = Math.round(b.n * (avg(b.rev, b.n) - avg(a.rev, a.n)));
      add('volume', 'כמות הזמנות', vol, a.n + ' → ' + b.n + ' הזמנות, ברווח ממוצע ' + Math.round(pa / a.n) + ' אגורות להזמנה בתקופה הקודמת');
      add('price', 'מחיר ותמהיל מוצרים', dRev - dDisc, 'מכירות נטו ממוצעות להזמנה, לפני שינוי בהנחות');
      add('discounts', 'הנחות', dDisc, 'הנחה ממוצעת להזמנה');
      add('cogs', 'עלות מוצרים', -Math.round(b.n * (avg(b.cogs + b.samples, b.n) - avg(a.cogs + a.samples, a.n))), 'עלות מוצרים (כולל דוגמאות ליוצרים) ממוצעת להזמנה');
      add('fees', 'עמלות סליקה', -Math.round(b.n * (avg(b.fees, b.n) - avg(a.fees, a.n))), 'עמלה ממוצעת להזמנה');
    }
    add('ads', 'פרסום', -(b.ads - a.ads), 'הוצאת פרסום בתקופה הנוכחית פחות הקודמת');
    add('fixed', 'הוצאות קבועות מוקצות', -(b.fixed - a.fixed), 'קבועות לפי ימים בתקופה');
    var delta = b.net - a.net, sum = comps.reduce(function (t, c) { return t + c.agorot; }, 0);
    return { from: pA, to: pB, fromNetAgorot: a.net, toNetAgorot: b.net, deltaAgorot: delta, components: comps, roundingAgorot: delta - sum,
      ordersFrom: a.n, ordersTo: b.n, missing: a.missing.concat(b.missing), complete: !a.missing.length && !b.missing.length };
  }

  // תקופות להשוואה: הנוכחית מסתיימת אתמול (כמו Shopify), והקודמת באותו אורך בדיוק
  function comparePeriods(kind, today) {
    var t = israelDate(today || new Date());
    if (kind === '7d' || kind === '30d') {
      var n = kind === '7d' ? 7 : 30, b = periodLastDays(n, today);
      return { a: { from: addDays(b.from, -n), to: addDays(b.from, -1), label: 'prev-' + kind }, b: b };
    }
    if (kind === 'month') {
      var y = addDays(t, -1), ym = y.slice(0, 7), day = Number(y.slice(8, 10));
      var pm = addDays(ym + '-01', -1).slice(0, 7), len = Math.min(day, daysInMonth(pm));
      return { a: { from: pm + '-01', to: pm + '-' + ('0' + len).slice(-2), label: pm }, b: { from: ym + '-01', to: y, label: ym } };
    }
    return null;
  }

  // ---------- חריגות לפי כללים מפורשים ----------
  // כל חריגה מציגה את הכלל שהפעיל אותה ואת המספרים. אין למידה ואין תחזית, רק סף קבוע שנקבע כאן.
  var ANOMALY_RULES = {
    adSpikeFactor: 2, adSpikeMinAgorot: 5000, adNoPurchaseMinAgorot: 30000, adWindowDays: 7, unpaidDays: 3, lossOrderMinAgorot: 0
  };
  function anomalies(data, now, opts) {
    var R = ANOMALY_RULES, today = israelDate(now || new Date()), out = [], orders = normalizeOrders(data.orders, data.flags);
    var all = periodAll(now || new Date());
    // 1) הזמנה הפסדית
    orderRows(data, all, opts).forEach(function (r) {
      if (r.inProfit && r.state !== 'CREATOR_SAMPLE' && r.profitAgorot != null && r.profitAgorot < R.lossOrderMinAgorot)
        out.push({ id: 'loss-' + r.name, level: 'bad', text: r.name + ' הפסדית: ' + fmt(r.profitAgorot), rule: 'רווח הזמנה (נטו פחות עלות ועמלה) קטן מ-0', numbers: { net: r.netAgorot, cogs: r.cogsAgorot, fee: r.feeAgorot, profit: r.profitAgorot } });
    });
    // 2) הזמנה בוטלה בלי החזר, או לא שולמה כבר כמה ימים
    orders.forEach(function (o) {
      if (o.state === 'CANCELLED_NO_REFUND') out.push({ id: 'norefund-' + o.name, level: 'warn', text: o.name + ' בוטלה בלי החזר כספי (' + fmt(o.netAgorot) + ') ומוחרגת מהרווח עד שיוסדר', rule: 'הזמנה מבוטלת בלי רישום החזר', numbers: { net: o.netAgorot } });
      if (o.state === 'UNPAID') {
        var age = Math.round((Date.parse(today + 'T00:00:00Z') - Date.parse(o.date + 'T00:00:00Z')) / 864e5);
        if (age >= R.unpaidDays) out.push({ id: 'unpaid-' + o.name, level: 'warn', text: o.name + ' לא שולמה כבר ' + age + ' ימים', rule: 'הזמנה לא שולמה ' + R.unpaidDays + ' ימים ומעלה', numbers: { ageDays: age } });
      }
    });
    // 3) קפיצת הוצאת פרסום ביום לעומת ממוצע 7 הימים שקדמו לו (רק ימים עם נתון)
    var adsClean = dedupeAds(data.adSpend);
    var byDay = {}; adsClean.forEach(function (r) { byDay[r.date] = (byDay[r.date] || 0) + r.spendAgorot; });
    for (var i = 1; i <= R.adWindowDays; i++) {
      var d = addDays(today, -i), v = byDay[d];
      if (v == null) continue;
      var prev = [], k; for (k = 1; k <= 7; k++) { var pv = byDay[addDays(d, -k)]; if (pv != null) prev.push(pv); }
      if (prev.length < 3) continue;
      var base = prev.reduce(function (t, x) { return t + x; }, 0) / prev.length;
      if (base > 0 && v >= R.adSpikeFactor * base && v - base >= R.adSpikeMinAgorot)
        out.push({ id: 'adspike-' + d, level: 'warn', text: 'פרסום ב-' + d + ': ' + fmt(v) + ', פי ' + (v / base).toFixed(1) + ' מהממוצע (' + fmt(Math.round(base)) + ')', rule: 'הוצאה יומית לפחות פי ' + R.adSpikeFactor + ' מממוצע הימים שקדמו ובהפרש של לפחות ' + fmt(R.adSpikeMinAgorot), numbers: { day: v, baseline: Math.round(base), days: prev.length } });
    }
    // 4) קמפיין שהוציא הרבה בשבוע האחרון בלי רכישה אחת לפי מטא
    var win = { from: addDays(today, -R.adWindowDays), to: addDays(today, -1) }, camp = {};
    adsClean.forEach(function (r) {
      if (!inPeriod(r.date, win)) return;
      var c = camp[r.campaignId] || (camp[r.campaignId] = { name: r.campaignName, spend: 0, purchases: 0 });
      c.spend += r.spendAgorot; c.purchases += r.purchases || 0;
    });
    Object.keys(camp).forEach(function (id) {
      var c = camp[id];
      if (c.purchases === 0 && c.spend >= R.adNoPurchaseMinAgorot)
        out.push({ id: 'nopurchase-' + id, level: 'warn', text: 'הקמפיין "' + c.name + '" הוציא ' + fmt(c.spend) + ' ב-' + R.adWindowDays + ' הימים האחרונים ללא רכישה לפי מטא', rule: 'הוצאה של לפחות ' + fmt(R.adNoPurchaseMinAgorot) + ' בשבוע בלי רכישה', numbers: { spend: c.spend } });
    });
    out.sort(function (a, b) { return (a.level === b.level ? 0 : a.level === 'bad' ? -1 : 1); });
    return { items: out, rules: R, asOf: today };
  }


  // ---------- ייחוס הזמנות לקמפיינים (לפי campaign_id מה-UTM של ההזמנה) ----------
  // הזמנה בלי campaign_id לא "אורגנית" בהכרח: היא פשוט לא מיוחסת. לכן מוצג בנפרד, והאחוז המיוחס נושא ביטחון.
  // ROAS מיוחס = מכירות נטו של הזמנות המיוחסות לקמפיין ÷ הוצאת הקמפיין. CAC = הוצאת הקמפיין ÷ הזמנות מיוחסות.
  function attributeByCampaign(data, period, opts) {
    opts = opts || {};
    var ads = calculateAdSpend(data.adSpend, period, { coverage: data.adSpendCoverage, now: opts.now });
    var rows = orderRows(data, period, opts).filter(isRealOrderRow); // רק הזמנות אמיתיות: לא דוגמאות ולא ביטולים שהוחזרו במלואם
    var by = {}, un = { orders: 0, netAgorot: 0 }, spendKnown = {};
    Object.keys(ads.byCampaign).forEach(function (id) { var c = ads.byCampaign[id]; spendKnown[id] = 1; by[id] = { campaignId: id, campaignName: c.campaignName, spendAgorot: c.spendAgorot, metaPurchases: c.purchases, orders: 0, netAgorot: 0, profitBeforeAdsAgorot: 0, profitKnownOrders: 0, orderNames: [] }; });
    var orphan = { orders: 0, netAgorot: 0, ids: {} };
    rows.forEach(function (r) {
      if (!r.campaign) { un.orders++; un.netAgorot += r.netAgorot; return; }
      var c = by[r.campaign];
      if (!c) { orphan.orders++; orphan.netAgorot += r.netAgorot; orphan.ids[r.campaign] = 1; return; } // קמפיין בהזמנה בלי שורת הוצאה
      c.orders++; c.netAgorot += r.netAgorot; c.orderNames.push(r.name);
      if (r.profitAgorot != null) { c.profitBeforeAdsAgorot += r.profitAgorot; c.profitKnownOrders++; }
    });
    var list = Object.keys(by).map(function (id) {
      var c = by[id], full = c.profitKnownOrders === c.orders;
      var adsMissing = ads.confidence === 'MISSING'; // פרסום חסר: אין ROAS, CAC או רווח אחרי פרסום (כמו ב-kpi של summarize)
      c.roas = !adsMissing && c.spendAgorot > 0 && c.orders ? +(c.netAgorot / c.spendAgorot).toFixed(2) : null;
      c.cacAgorot = !adsMissing && c.orders ? roundHalfUp(c.spendAgorot / c.orders) : null;
      c.profitAfterAdsAgorot = !adsMissing && c.orders && full ? c.profitBeforeAdsAgorot - c.spendAgorot : null;
      c.confidence = ads.confidence === 'MISSING' ? 'MISSING' : 'ESTIMATED'; // ייחוס לפי UTM הוא הערכה, לא מדידה
      return c;
    }).sort(function (a, b) { return b.spendAgorot - a.spendAgorot; });
    var attributed = 0, attributedNet = 0, total = rows.length, totalNet = 0;
    list.forEach(function (c) { attributed += c.orders; attributedNet += c.netAgorot; });
    rows.forEach(function (r) { totalNet += r.netAgorot; });
    return { period: period, campaigns: list, unattributed: un, orphan: { orders: orphan.orders, netAgorot: orphan.netAgorot, campaignIds: Object.keys(orphan.ids) },
      attributedOrders: attributed, totalOrders: total, attributedPct: total ? Math.round(100 * (attributed + orphan.orders) / total) : null,
      attributedNetAgorot: attributedNet, totalNetAgorot: totalNet, adsConfidence: ads.confidence };
  }

  // ---------- משלוח כ-KPI ----------
  // הכנסת משלוח: מה שהלקוח שילם על משלוח (shipping_agorot). היא לא כלולה במכירות נטו. עלות משלוח מהספק: לא מופרדת בסכום הרכש של AutoDS,
  // ולכן לא מוצגת כמספר (MISSING) עד שתירשם בנפרד.
  function shippingSummary(data, period, opts) {
    var orders = normalizeOrders(data.orders, data.flags), income = 0, n = 0, paying = 0;
    orders.forEach(function (o) {
      if (!inPeriod(o.date, period) || !profitEligible(o, opts)) return;
      n++; if (o.shippingAgorot > 0) { paying++; income += o.shippingAgorot; }
    });
    return { period: period, orders: n, ordersWithShipping: paying, incomeAgorot: income, incomeConfidence: 'VERIFIED',
      supplierCostAgorot: null, supplierCostConfidence: 'MISSING', note: 'עלות משלוח מהספק לא מופרדת בסכום הרכש' };
  }

  // ---------- שער כניסה לניתוח מתקדם (רווח לפי קמפיין, המלצות) ----------
  // נפתח רק עם לפחות 30 הזמנות בטווח שיש לו נתוני פרסום וביטחון של 80% ומעלה ברווח התרומה באותו טווח.
  function dmyIL(ymd) { var p = ymd.split('-'); return Number(p[2]) + '.' + Number(p[1]) + '.' + p[0]; }
  function advancedGate(data, now, opts) {
    var need = { orders: 30, confidencePercent: 80 };
    var cov = data.adSpendCoverage;
    if (!cov) return { met: false, need: need, orders: 0, confidencePercent: 0, reasons: ['אין נתוני פרסום'] };
    var s = summarize(data, { from: cov.from, to: cov.to, label: 'ads-coverage' }, opts);
    var n = s.revenueForProfit.orderCount, c = s.contributionProfit.confidencePercent, reasons = [];
    if (n < need.orders) reasons.push('יש ' + n + ' הזמנות בטווח שיש בו נתוני פרסום, נדרשות ' + need.orders + '. הטווח: ' + dmyIL(cov.from) + ' עד ' + dmyIL(cov.to));
    if (c == null || c < need.confidencePercent) reasons.push('ביטחון ברווח התרומה ' + (c == null ? 'אין נתון' : c + '%') + ', נדרש ' + need.confidencePercent + '%');
    return { met: reasons.length === 0, need: need, orders: n, confidencePercent: c, coverage: cov, reasons: reasons };
  }

  // ---------- צילום מדדים (kpi_snapshots) ----------
  // שורה לכל (תקופה, מדד): snapshot_date, period_label, period_from, period_to, metric, value_agorot, confidence, confidence_pct, missing, formula_version, data_version, components_json
  function snapshotRows(data, nowIso, dataVersion) {
    var today = israelDate(nowIso), ym = today.slice(0, 7), periods = [], rows = [];
    var defs = periodDefs(nowIso), cur = today.slice(0, 7);
    for (var y = 2026, mo = 7; (y + '-' + ('0' + mo).slice(-2)) < cur; mo++) { if (mo > 12) { mo = 1; y++; } var lab = y + '-' + ('0' + mo).slice(-2); if (lab >= cur) break; periods.push([lab, periodMonth(lab)]); }
    if (defs.mtd.from <= defs.mtd.to) periods.push([cur + '-mtd', defs.mtd]);
    periods.push(['30d', defs.d30], ['7d', defs.week]);
    function cj(list) { return JSON.stringify(list.map(function (x) { return { n: x.name, a: x.amountAgorot, c: x.confidence }; })); }
    periods.forEach(function (pp) {
      var label = pp[0], p = pp[1], s = summarize(data, p, { now: nowIso });
      function row(metric, v, conf, pct, missing, comps) { rows.push([today, label, p.from, p.to, metric, v, conf, pct == null ? '' : pct, missing, s.formulaVersion, dataVersion || today, comps]); }
      var rv = s.revenueForProfit;
      row('netRevenue', rv.netAgorot, rv.confidence, rv.confidencePercent, rv.confidence === 'MISSING' ? 'מכירות ברוטו' : '', cj(rv.components));
      row('salesLikeShopify', s.sales.netAgorot, s.sales.confidence, s.sales.confidencePercent, s.sales.confidence === 'MISSING' ? 'מכירות ברוטו' : '', cj([{ name: 'הזמנות', amountAgorot: s.sales.orderCount, confidence: s.sales.confidence }]));
      row('cogs', s.cogs.cogsAgorot, s.cogs.confidence, s.cogs.confidencePercent, s.cogs.ordersMissingCost.join(' '), cj([{ name: 'עלות מוצרים ומשלוח לספק', amountAgorot: s.cogs.cogsAgorot, confidence: s.cogs.confidence }]));
      row('paymentFees', s.fees.feesAgorot, s.fees.confidence, s.fees.confidencePercent, '', cj(s.fees.components));
      row('adSpend', s.ads.adSpendAgorot, s.ads.confidence, s.ads.confidencePercent, s.ads.confidence === 'MISSING' ? 'פרסום' : '', cj(s.ads.components));
      row('fixedCosts', s.fixed.fixedAgorot, s.fixed.confidence, s.fixed.confidencePercent, '', cj(s.fixed.perExpense.map(function (e) { return { name: e.name, amountAgorot: e.agorot, confidence: e.confidence || 'MANUAL' }; })));
      row('grossProfit', s.grossProfit.agorot, s.grossProfit.confidence, s.grossProfit.confidencePercent, s.grossProfit.missing.join(' '), '[]');
      row('contributionProfit', s.contributionProfit.agorot, s.contributionProfit.confidence, s.contributionProfit.confidencePercent, s.contributionProfit.missing.join(' '), '[]');
      row('netProfit', s.netProfit.agorot, s.netProfit.confidence, s.netProfit.confidencePercent, s.netProfit.missing.join(' '), '[]');
    });
    return rows;
  }

  // ---------- חבילה אחת לתקופה ----------

  function summarize(data, period, opts) {
    opts = opts || {};
    var orders = normalizeOrders(data.orders, data.flags);
    var sales = calculateNetRevenue(orders, period, Object.assign({}, opts, { includeTestOrders: true })); // כמו Shopify, עם שורת בדיקות
    var rev = calculateNetRevenue(orders, period, Object.assign({}, opts, { profitOnly: true })); // בסיס לרווח
    var cogs = calculateCOGS(orders, data.orderCosts, data.productCosts, data.fx, period, opts);
    var fees = calculatePaymentFees(orders, data.feeRates, period, opts);
    var ads = calculateAdSpend(data.adSpend, period, { coverage: data.adSpendCoverage, now: opts.now });
    var fixed = calculateFixedCosts(data.expenses, period), fixedActual = calculateFixedActual(data.expenses, period);
    var adCredit = calculateAdCredit(data.expenses, ads, period);
    var gross = calculateGrossProfit(rev, cogs);
    var contrib = calculateContributionProfit(rev, cogs, fees, ads);
    var net = calculateNetProfit(contrib, fixed);
    // מכנה ההזמנות: הזמנות אמיתיות בלבד. דוגמאות ליוצרים (0 ₪) והזמנות שבוטלו והוחזרו לא מדללות AOV, CPA ונקודת איזון.
    var ordersInProfit = rev.realOrderCount;
    var unitProfitBase = rev.netAgorot - cogs.cogsAgorot - fees.feesAgorot - (cogs.creatorSamplesAgorot || 0); // כולל מוצרים שנשלחו ליוצרים, כמו ברווח התרומה
    // כל KPI נושא את הרכיבים שהוא תלוי בהם. אם אחד מהם MISSING הערך הוא null ולא מספר שנראה תקין (H3).
    function kpi(name, value, deps) {
      var miss = [];
      deps.forEach(function (d) { if (d.confidence === 'MISSING') miss.push(d.name); });
      var conf = deps.length ? worst(deps.map(cf)) : 'VERIFIED';
      meta[name] = { confidence: miss.length ? 'MISSING' : conf, missing: miss, reason: value == null && !miss.length ? 'אין נתון לחישוב' : (miss.length ? 'חסר: ' + miss.join(', ') : '') };
      return miss.length ? null : value;
    }
    var meta = {};
    var depRev = { name: 'מכירות', confidence: rev.confidence }, depCogs = { name: 'עלות מוצרים', confidence: cogs.ordersMissingCost.length ? 'MISSING' : cogs.confidence },
      depFees = { name: 'עמלות סליקה', confidence: fees.confidence }, depAds = { name: 'פרסום', confidence: ads.confidence === 'MISSING' ? 'MISSING' : ads.confidence }, depFixed = { name: 'הוצאות קבועות', confidence: fixed.confidence };
    var beCpa = ordersInProfit ? roundHalfUp(unitProfitBase / ordersInProfit) : null;
    var r = {
      formulaVersion: FORMULA_VERSION, period: period, days: periodDays(period), refundBasis: 'לפי תאריך ההחזר (ההכנסה בתקופה יורדת בחודש שבו ההחזר נרשם, לא בחודש ההזמנה)',
      sales: sales, revenueForProfit: rev, cogs: cogs, fees: fees, ads: ads, fixed: fixed, fixedActual: fixedActual,
      grossProfit: gross, contributionProfit: contrib, netProfit: net, adCredit: adCredit,
      kpis: {
        orders: sales.orderCount,
        realOrders: rev.realOrderCount, // מונה אחד להזמנות אמיתיות (בלי בדיקות, דוגמאות, לא שולמו וביטולים שהוחזרו במלואם)
        aovAgorot: kpi('aovAgorot', ordersInProfit ? roundHalfUp(rev.netAgorot / ordersInProfit) : null, [depRev]),
        contributionMarginPct: kpi('contributionMarginPct', rev.netAgorot > 0 ? +(100 * contrib.agorot / rev.netAgorot).toFixed(1) : null, [depRev, depCogs, depFees, depAds]),
        netMarginPct: kpi('netMarginPct', rev.netAgorot > 0 ? +(100 * net.agorot / rev.netAgorot).toFixed(1) : null, [depRev, depCogs, depFees, depAds, depFixed]),
        mer: kpi('mer', ads.adSpendAgorot && rev.netAgorot > 0 ? +(rev.netAgorot / ads.adSpendAgorot).toFixed(2) : null, [depRev, depAds]),
        blendedCpaAgorot: kpi('blendedCpaAgorot', ads.adSpendAgorot && ordersInProfit ? roundHalfUp(ads.adSpendAgorot / ordersInProfit) : null, [depAds]),
        breakEvenCpaAgorot: kpi('breakEvenCpaAgorot', beCpa != null && beCpa > 0 ? beCpa : null, [depRev, depCogs, depFees]), // שלילי = אין נקודת איזון: null
        breakEvenRoas: kpi('breakEvenRoas', unitProfitBase > 0 ? +(rev.netAgorot / unitProfitBase).toFixed(2) : null, [depRev, depCogs, depFees])
      },
      kpiMeta: meta
    };
    return r;
  }

  // ---------- תצוגה ----------
  function fmt(agorot) {
    if (agorot == null) return '—';
    var s = (Math.abs(agorot) / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (agorot < 0 ? '-' : '') + s + ' ₪';
  }

  // ---------- דוחות מפורטים לפי הזמנה / מוצר / יחידת מוצר (אותם כללים, אותם מספרים כמו summarize) ----------

  function skuKey(l) { return l.sku || (l.unitsPerVariant === 3 ? '3units' : null); }
  function productName(l, productCosts) {
    var key = skuKey(l), name = null;
    (productCosts || []).forEach(function (p) { if (key && p.sku === key && !name) name = p.name; });
    return name || l.variantTitle || l.sku || 'מוצר לא מזוהה';
  }
  // חלוקה במספרים שלמים (אגורות) לפי משקלות; השארית לשורה האחרונה בעלת משקל
  function allocate(total, weights) {
    var sum = 0; weights.forEach(function (w) { sum += w; });
    if (!sum) { var z = weights.map(function () { return 0; }); if (z.length) z[0] = total; return z; }
    var out = [], used = 0, lastNz = -1;
    weights.forEach(function (w, i) { if (w > 0) lastNz = i; });
    weights.forEach(function (w, i) {
      var a = i === lastNz ? total - used : Math.round(total * w / sum);
      out.push(a); used += a;
    });
    return out;
  }

  // שורה לכל הזמנה בתקופה. profit = מכירות נטו (אחרי החזרים של ההזמנה) פחות עלות מוצרים, דוגמאות ליוצרים ועמלה; לפני פרסום והוצאות קבועות.
  function orderRows(data, period, opts) {
    opts = opts || {};
    var orders = normalizeOrders(data.orders, data.flags);
    var cogs = calculateCOGS(orders, data.orderCosts, data.productCosts, data.fx, period, opts);
    var fees = calculatePaymentFees(orders, data.feeRates, period, opts);
    var cBy = {}, fBy = {};
    cogs.perOrder.forEach(function (c) { cBy[c.name] = c; });
    fees.perOrder.forEach(function (f) { fBy[f.name] = f; });
    var rows = [];
    orders.forEach(function (o) {
      if (!inPeriod(o.date, period)) return;
      var inProfit = profitEligible(o, opts), c = cBy[o.name], f = fBy[o.name];
      var net = o.netAgorot - o.refundedAgorot;
      var cost = c ? (c.creatorSample ? 0 : c.agorot) : null, sample = c && c.creatorSample ? c.agorot : 0;
      var known = inProfit && c && f && c.confidence !== 'MISSING' && f.confidence !== 'MISSING';
      rows.push({
        name: o.name, date: o.date, state: o.state, inProfit: inProfit, units: o.units, campaign: o.campaign || null,
        items: o.lines.map(function (l) { return productName(l, data.productCosts) + (l.qty > 1 ? ' ×' + l.qty : ''); }).join(', '),
        netAgorot: net, cogsAgorot: inProfit && c ? cost : null, sampleAgorot: sample, feeAgorot: inProfit && f ? f.agorot : null,
        profitAgorot: known ? net - cost - sample - f.agorot : null,
        confidence: known ? worst([c.confidence, f.confidence]) : (inProfit ? 'MISSING' : null),
        note: o.note || '', _lines: o.lines
      });
    });
    rows.sort(function (a, b) { return a.date === b.date ? (a.name < b.name ? 1 : -1) : (a.date < b.date ? 1 : -1); });
    return rows;
  }

  // רווח לפי מוצר: הכנסה, עלות ועמלה של כל הזמנה מתחלקות בין שורותיה לפי ערך השורה (ואם אין ערך, לפי יחידות)
  function profitByProduct(data, period, opts) {
    var rows = orderRows(data, period, opts), by = {}, unknownOrders = [];
    rows.forEach(function (r) {
      if (!r.inProfit) return;
      if (r.profitAgorot == null) { unknownOrders.push(r.name); return; }
      var ls = r._lines, w = ls.map(function (l) { return Math.max(0, l.unitPriceAgorot * l.qty - (l.lineDiscountAgorot || 0)); });
      if (!w.some(function (x) { return x > 0; })) w = ls.map(function (l) { return l.qty * (l.unitsPerVariant || 1); });
      var aNet = allocate(r.netAgorot, w), aCogs = allocate(r.cogsAgorot, w), aSample = allocate(r.sampleAgorot, w), aFee = allocate(r.feeAgorot, w), seen = {};
      ls.forEach(function (l, i) {
        var n = productName(l, data.productCosts), o = by[n] || (by[n] = { name: n, orders: 0, units: 0, netAgorot: 0, cogsAgorot: 0, sampleAgorot: 0, feeAgorot: 0, profitAgorot: 0 });
        if (!seen[n]) { o.orders++; seen[n] = 1; }
        o.units += l.qty * (l.unitsPerVariant || 1);
        o.netAgorot += aNet[i]; o.cogsAgorot += aCogs[i]; o.sampleAgorot += aSample[i]; o.feeAgorot += aFee[i];
        o.profitAgorot += aNet[i] - aCogs[i] - aSample[i] - aFee[i];
      });
    });
    var list = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.profitAgorot - a.profitAgorot; });
    return { period: period, products: list, ordersWithoutKnownProfit: unknownOrders };
  }

  // אחוז העמלה האפקטיבי של שער תשלום בתאריך (כולל מע"מ היכן שצריך) + החלק הקבוע להזמנה
  function effectiveFeeRate(feeRates, gateway, ymd) {
    var rule = null;
    (feeRates || []).forEach(function (r) { if (r.gateway === gateway && r.effectiveFrom <= ymd && (!r.effectiveTo || r.effectiveTo >= ymd)) rule = r; });
    if (!rule) return null;
    var pct = 0, fixed = 0;
    rule.components.forEach(function (c) { var k = c.vat ? 1 + VAT_RATE : 1; pct += (c.rate || 0) * k; fixed += roundHalfUp((c.fixedAgorot || 0) * k); });
    return { pct: pct, fixedAgorot: fixed, confidence: rule.confidence || 'ESTIMATED', actual: rule.actualAgorot != null };
  }

  // התחייבויות חודשיות פעילות ביום ymd: הוצאה קבועה/זמנית שבתוקף. חד-פעמית וקרדיט פרסום לא נכנסות (הן לא התחייבות חודשית). שורה בלי סכום חודשי תקין לא נספרת אלא מדווחת.
  function monthlyCommitments(expenses, ymd) {
    var items = [], total = 0, skipped = [];
    (expenses || []).forEach(function (e) {
      if (e.category !== 'Fixed' && e.category !== 'Temporary') return;
      if (e.startDate && e.startDate > ymd) return;
      if (e.endDate && e.endDate < ymd) return;
      if (e.monthlyAgorot == null || !isFinite(e.monthlyAgorot)) { skipped.push(e.name || e.id); return; }
      total += e.monthlyAgorot;
      items.push({ id: e.id, name: e.name, category: e.category, monthlyAgorot: e.monthlyAgorot, startDate: e.startDate || null, endDate: e.endDate || null, confidence: e.confidence });
    });
    return { totalAgorot: total, items: items, skipped: skipped, asOf: ymd };
  }

  // רווח ליחידה ממחיר מחירון: מנכה עלות, עמלה באחוזים ועמלה קבועה (fee = תוצאת effectiveFeeRate)
  function unitMargin(priceAgorot, costAgorot, fee) {
    if (priceAgorot == null || costAgorot == null || !fee || !(priceAgorot > 0)) return null;
    var feeAg = roundHalfUp(priceAgorot * fee.pct) + (fee.fixedAgorot || 0), net = priceAgorot - costAgorot - feeAg;
    return { netAgorot: net, feeAgorot: feeAg, margin: net / priceAgorot };
  }

  // סיכום שורות ההזמנות על בסיס אחד (החזר לפי ההזמנה): רווח, מכירות נטו של אותן הזמנות, ושוליים. לא מערבבים עם מכירות לפי תאריך החזר.
  function orderRowsTotals(rows) {
    var profit = 0, net = 0, n = 0;
    (rows || []).forEach(function (r) { if (r.inProfit && r.profitAgorot != null) { profit += r.profitAgorot; net += r.netAgorot; n++; } });
    return { profitAgorot: profit, netAgorot: net, orders: n, pct: net > 0 ? Math.round(profit / net * 100) : null };
  }

  // עלות יחידה נוכחית (בשקלים, באגורות שלמות) לכל מק"ט: השורה שבתוקף ביום asOf, ואם אין, האחרונה הידועה (מסומנת)
  function unitCosts(data, asOf) {
    var by = {};
    (data.productCosts || []).forEach(function (p) { (by[p.sku] = by[p.sku] || []).push(p); });
    var r = fxRate(data.fx, asOf), out = {};
    Object.keys(by).forEach(function (sku) {
      var rows = by[sku].slice().sort(function (a, b) { return a.effectiveFrom < b.effectiveFrom ? -1 : 1; }), cur = null, stale = false;
      rows.forEach(function (p) { if (p.effectiveFrom <= asOf && (!p.effectiveTo || p.effectiveTo >= asOf)) cur = p; });
      if (!cur) { cur = rows[rows.length - 1]; stale = true; }
      out[sku] = { sku: sku, name: cur.name, usdCents: cur.unitCostUsdCents, agorot: r ? ilsFromUsd(cur.unitCostUsdCents, r.rate) : null,
        rate: r ? r.rate : null, rateDate: r ? r.date : null, effectiveTo: cur.effectiveTo, stale: stale,
        confidence: worst([cur.confidence || 'MANUAL', r ? (r.exact ? r.confidence : 'ESTIMATED') : 'MISSING']) };
    });
    return out;
  }

  // כמה הזמנות צריך בחודש כדי להגיע ליעד רווח נקי: (יעד + קבועות לחודש מלא) / רווח ממוצע להזמנה (אחרי עלות מוצרים ועמלות, לפני פרסום).
  // הממוצע מהזמנות רגילות ששולמו בתקופת הבסיס (בלי בדיקות, דוגמאות ליוצרים, ביטולים בלי החזר).
  function ordersNeeded(data, goalAgorot, monthPeriod, basisPeriod, opts) {
    opts = opts || {};
    var rows = orderRows(data, basisPeriod, opts).filter(function (r) { return isRealOrderRow(r) && r.profitAgorot != null && r.netAgorot > 0; });
    var sum = 0; rows.forEach(function (r) { sum += r.profitAgorot; });
    // מוצרים שנשלחו ליוצרים בתקופה הם עלות של ההזמנות האמיתיות (כמו ברווח התרומה)
    var samplesTotal = rows.length ? calculateCOGS(normalizeOrders(data.orders, data.flags), data.orderCosts, data.productCosts, data.fx, basisPeriod, opts).creatorSamplesAgorot : 0;
    var avg = rows.length ? (sum - samplesTotal) / rows.length : null, fixed = calculateFixedCosts(data.expenses, monthPeriod);
    var needBefore = avg && avg > 0 ? Math.ceil((goalAgorot + fixed.fixedAgorot) / avg) : null;
    // פרסום (M10): כשיש נתוני פרסום לתקופת הבסיס, הרווח הממוצע להזמנה יורד בעלות הפרסום להזמנה (פרסום בתקופה / הזמנות ברווח באותה תקופה)
    var withAds = false, adsPer = 0, adsConf = null;
    if (rows.length && data.adSpend && data.adSpend.length && data.adSpendCoverage) {
      var ads = calculateAdSpend(data.adSpend, basisPeriod, { coverage: data.adSpendCoverage, now: opts.now });
      if (ads.confidence !== 'MISSING') { withAds = true; adsPer = ads.adSpendAgorot / rows.length; adsConf = ads.confidence; }
    }
    var avgNet = avg == null ? null : avg - adsPer;
    var need = avgNet && avgNet > 0 ? Math.ceil((goalAgorot + fixed.fixedAgorot) / avgNet) : null;
    var conf = rows.map(function (r) { return r.confidence; }).concat(fixed.confidence ? [fixed.confidence] : []);
    if (adsConf) conf.push(adsConf);
    return { needed: need, neededBeforeAds: needBefore, avgProfitAgorot: avg == null ? null : roundHalfUp(avgNet), avgProfitBeforeAdsAgorot: avg == null ? null : roundHalfUp(avg), adsPerOrderAgorot: roundHalfUp(adsPer),
      basisOrders: rows.length, fixedAgorot: fixed.fixedAgorot, goalAgorot: goalAgorot, beforeAds: !withAds, confidence: worst(conf) };
  }


  // ---------- שלב 3: מה-אם, החלטות, תחזית ----------
  // כל שלושתן טהורות, בלי כתיבה. מה-אם הוא חשבון בלבד (עובד תמיד, מסומן לפי אמינות הבסיס). החלטות ותחזית נעולות עד advancedGate.
  function baselineUnit(data, basisPeriod, opts) {
    var rows = orderRows(data, basisPeriod, opts).filter(function (r) { return isRealOrderRow(r) && r.profitAgorot != null && r.netAgorot > 0; });
    if (!rows.length) return null;
    var n = rows.length, net = 0, cogs = 0, fee = 0, first = rows[0].date;
    rows.forEach(function (r) { net += r.netAgorot; cogs += r.cogsAgorot; fee += r.feeAgorot; if (r.date < first) first = r.date; });
    cogs += calculateCOGS(normalizeOrders(data.orders, data.flags), data.orderCosts, data.productCosts, data.fx, basisPeriod, opts).creatorSamplesAgorot || 0; // כולל דוגמאות ליוצרים
    var ads = null, adsConf = null;
    if (data.adSpend && data.adSpend.length && data.adSpendCoverage) {
      var a = calculateAdSpend(data.adSpend, basisPeriod, { coverage: data.adSpendCoverage, now: (opts && opts.now) });
      if (a.confidence !== 'MISSING') { ads = a.adSpendAgorot / n; adsConf = a.confidence; }
    }
    return { orders: n, firstDate: first, netPerOrder: net / n, cogsPerOrder: cogs / n, feePerOrder: fee / n, adsPerOrder: ads, confidence: worst(rows.map(function (r) { return r.confidence; }).concat(adsConf ? [adsConf] : [])) };
  }
  function unitMath(net, cogs, fee, ads) {
    var contribution = net - cogs - fee; // לפני פרסום = גם נקודת האיזון של עלות להזמנה
    var profit = ads == null ? null : contribution - ads;
    return { netAgorot: roundHalfUp(net), cogsAgorot: roundHalfUp(cogs), feeAgorot: roundHalfUp(fee), adsAgorot: ads == null ? null : roundHalfUp(ads), beforeAdsAgorot: roundHalfUp(contribution), profitAgorot: profit == null ? null : roundHalfUp(profit), breakEvenCpaAgorot: contribution > 0 ? roundHalfUp(contribution) : null };
  }
  // scenario: {netPerOrderAgorot, cogsPerOrderAgorot, adsPerOrderAgorot, ordersPerMonth, goalAgorot}. שדה שלא נשלח = הבסיס מהנתונים. העמלה נשארת באותו אחוז מההכנסה.
  function whatIf(data, basisPeriod, monthPeriod, scenario, opts) {
    scenario = scenario || {};
    var b = baselineUnit(data, basisPeriod, opts);
    if (!b) return { ok: false, reason: 'אין הזמנות רגילות ששולמו בתקופת הבסיס, אין ממה לחשב' };
    var fixed = calculateFixedCosts(data.expenses, monthPeriod), feeRatio = b.netPerOrder ? b.feePerOrder / b.netPerOrder : 0;
    // בסיס הזמנות בחודש: מהזמנה הראשונה בתקופה (לא מתחילת התקופה) עד אתמול, ולפי אורך החודש של החודש המוצג
    var today = israelDate((opts && opts.now) || new Date()), basisFrom = b.firstDate > basisPeriod.from ? b.firstDate : basisPeriod.from, basisTo0 = addDays(today, -1);
    var basisTo = basisPeriod.to < basisTo0 ? basisPeriod.to : basisTo0; if (basisTo < basisFrom) basisTo = basisFrom;
    var days = periodDays({ from: basisFrom, to: basisTo }), baseOrdersMonth = roundHalfUp(b.orders / days * daysInMonth(String(monthPeriod.from).slice(0, 7)));
    function pick(v, d) { return v == null || v === '' || !isFinite(v) ? d : Number(v); }
    var sNet = pick(scenario.netPerOrderAgorot, b.netPerOrder), sCogs = pick(scenario.cogsPerOrderAgorot, b.cogsPerOrder), sAds = pick(scenario.adsPerOrderAgorot, b.adsPerOrder);
    var sOrders = pick(scenario.ordersPerMonth, baseOrdersMonth), goal = pick(scenario.goalAgorot, null);
    var base = unitMath(b.netPerOrder, b.cogsPerOrder, b.feePerOrder, b.adsPerOrder), sc = unitMath(sNet, sCogs, feeRatio * sNet, sAds);
    function month(u, orders) { return u.profitAgorot == null ? null : u.profitAgorot * orders - fixed.fixedAgorot; }
    function need(u) { return goal != null && u.profitAgorot > 0 ? Math.ceil((goal + fixed.fixedAgorot) / u.profitAgorot) : null; }
    var bm = month(base, baseOrdersMonth), sm = month(sc, sOrders);
    var changed = ['netPerOrderAgorot', 'cogsPerOrderAgorot', 'adsPerOrderAgorot', 'ordersPerMonth'].filter(function (k) { return scenario[k] != null && scenario[k] !== ''; });
    return { ok: true, basis: { orders: b.orders, period: basisPeriod, effectiveFrom: basisFrom, effectiveTo: basisTo, days: days, ordersPerMonth: baseOrdersMonth, beforeAds: b.adsPerOrder == null }, fixedAgorot: fixed.fixedAgorot,
      baseline: { unit: base, monthProfitAgorot: bm, ordersNeeded: need(base) }, scenario: { unit: sc, ordersPerMonth: sOrders, monthProfitAgorot: sm, ordersNeeded: need(sc) },
      deltaMonthAgorot: bm == null || sm == null ? null : sm - bm, changed: changed,
      confidence: worst([b.confidence, fixed.confidence || 'MANUAL'].concat(changed.length ? ['ESTIMATED'] : [])),
      note: 'תרחיש הוא חשבון על הממוצעים של תקופת הבסיס, לא תחזית. ' + (b.adsPerOrder == null ? 'אין נתוני פרסום לתקופה: הרווח להזמנה מוצג לפני פרסום.' : '') };
  }
  // החלטות: כללים גלויים בלבד, כל המלצה נושאת את הכלל והמספרים. נעולות עד advancedGate.
  var DECISION_RULES = { cpaOverFactor: 1.0, campaignMinPurchasesToJudge: 3, minContributionMarginPct: 0 };
  function decisions(data, now, opts) {
    var gate = advancedGate(data, now, opts);
    if (!gate.met) return { locked: true, gate: gate, items: [] };
    var d = periodDefs(now || new Date()), s = summarize(data, d.d30, opts), k = s.kpis, items = [];
    function add(id, level, text, rule, numbers) { items.push({ id: id, level: level, text: text, rule: rule, numbers: numbers }); }
    if (k.blendedCpaAgorot != null && k.breakEvenCpaAgorot != null && k.blendedCpaAgorot > DECISION_RULES.cpaOverFactor * k.breakEvenCpaAgorot)
      add('cpa-over', 'bad', 'עלות הרכישה (' + fmt(k.blendedCpaAgorot) + ') גבוהה מנקודת האיזון (' + fmt(k.breakEvenCpaAgorot) + '). כל הזמנה מפסידה ' + fmt(k.blendedCpaAgorot - k.breakEvenCpaAgorot) + ' אחרי פרסום.', 'CPA ב-30 הימים האחרונים גדול מנקודת האיזון', { cpa: k.blendedCpaAgorot, breakEven: k.breakEvenCpaAgorot });
    var camps = s.ads.byCampaign || {};
    Object.keys(camps).forEach(function (id) {
      var c = camps[id];
      if (c.spendAgorot > 0 && c.purchases >= DECISION_RULES.campaignMinPurchasesToJudge && k.breakEvenCpaAgorot != null && c.spendAgorot / c.purchases > k.breakEvenCpaAgorot)
        add('camp-over-' + id, 'warn', 'בקמפיין "' + (c.campaignName || id) + '" עלות הרכישה לפי מטא ' + fmt(roundHalfUp(c.spendAgorot / c.purchases)) + ', מעל נקודת האיזון ' + fmt(k.breakEvenCpaAgorot) + '. כדאי לבחון הורדת תקציב.', 'עלות רכישה בקמפיין (לפחות ' + DECISION_RULES.campaignMinPurchasesToJudge + ' רכישות) מעל נקודת האיזון', { spend: c.spendAgorot, purchases: c.purchases, breakEven: k.breakEvenCpaAgorot });
    });
    if (k.contributionMarginPct != null && k.contributionMarginPct < DECISION_RULES.minContributionMarginPct)
      add('margin-neg', 'bad', 'רווח התרומה שלילי (' + k.contributionMarginPct + '% מההכנסה) ב-30 הימים האחרונים. כל הזמנה נוספת מעמיקה את ההפסד עד שמחיר, עלות או פרסום משתנים.', 'שולי תרומה מתחת ל-' + DECISION_RULES.minContributionMarginPct + '%', { marginPct: k.contributionMarginPct });
    var m = ordersNeeded(data, 0, d.fullMonth, d.d30, opts);
    if (m.needed != null && m.basisOrders >= 1) add('fixed-cover', 'info', 'כדי לכסות את ההוצאות הקבועות של החודש (' + fmt(m.fixedAgorot) + ') צריך ' + m.needed + ' הזמנות בחודש לפי הרווח הממוצע להזמנה ב-30 הימים האחרונים.', 'הוצאות קבועות לחודש ÷ רווח ממוצע להזמנה אחרי פרסום', { fixed: m.fixedAgorot, avgProfit: m.avgProfitAgorot });
    return { locked: false, gate: gate, confidence: s.netProfit.confidence, items: items };
  }
  // תחזית סוף חודש: רק כשהשער פתוח. טווח בין קצב 14 הימים לקצב 30 הימים של רווח התרומה היומי, פחות הוצאות קבועות לחודש.
  function forecast(data, now, opts) {
    var gate = advancedGate(data, now, opts);
    if (!gate.met) return { locked: true, gate: gate };
    var d = periodDefs(now || new Date()), t = israelDate(now || new Date());
    var s30 = summarize(data, d.d30, opts), s14 = summarize(data, { from: addDays(t, -14), to: addDays(t, -1), label: '14d' }, opts), mtd = d.mtd.from <= d.mtd.to ? summarize(data, d.mtd, opts) : null;
    var rate30 = s30.contributionProfit.agorot / periodDays(d.d30), rate14 = s14.contributionProfit.agorot / 14;
    var rem = periodDays({ from: t, to: d.fullMonth.to }), have = mtd ? mtd.contributionProfit.agorot : 0, fixed = calculateFixedCosts(data.expenses, d.fullMonth).fixedAgorot;
    var lo = Math.min(rate14, rate30), hi = Math.max(rate14, rate30);
    return { locked: false, gate: gate, remainingDays: rem, contributionSoFarAgorot: have, fixedAgorot: fixed, lowAgorot: roundHalfUp(have + lo * rem - fixed), highAgorot: roundHalfUp(have + hi * rem - fixed),
      confidence: worst([s30.contributionProfit.confidence, s14.contributionProfit.confidence]), note: 'המשך הקצב של 14 ו-30 הימים האחרונים. אינה מביאה בחשבון שינוי מחיר, תקציב או עונתיות.' };
  }

  // מה צריך לנעול: שורות רכש עם סכום ותאריך ובלי סכום נעול, שיש להן שער. לא נוגע בשורה שכבר נעולה (גם אם השער השתנה: זה מה שנעילה אומרת)
  function planCostFreeze(orderCosts, fx) {
    var out = [];
    (orderCosts || []).forEach(function (c) {
      if (c.amountUsdCents == null || !c.purchaseDate || !c.row) return;
      if (c.convertedAgorot != null && c.rateUsed != null && c.rateDate) return; // קפואה במלואה: לא נוגעים
      // קפואה חלקית (קריסה באמצע כתיבה): משלימים לפי מה שכבר נכתב, בלי לשנות שער שנקבע
      var rate, rdate;
      if (c.rateUsed != null && c.rateDate) { rate = c.rateUsed; rdate = c.rateDate; }
      else { var r = fxRate(fx, c.purchaseDate); if (!r) return; rate = r.rate; rdate = r.date; }
      out.push({ row: c.row, rateUsed: rate, rateDate: rdate, convertedAgorot: ilsFromUsd(c.amountUsdCents, rate) });
    });
    return out;
  }

  return {
    planCostFreeze: planCostFreeze, whatIf: whatIf, decisions: decisions, forecast: forecast,
    FORMULA_VERSION: FORMULA_VERSION, VAT_RATE: VAT_RATE,
    israelDate: israelDate, daysInMonth: daysInMonth, addDays: addDays, inPeriod: inPeriod,
    periodDefs: periodDefs, periodMonth: periodMonth, periodLastDays: periodLastDays, periodToday: periodToday, periodAll: periodAll, periodDays: periodDays,
    normalizeOrder: normalizeOrder, normalizeOrders: normalizeOrders, salesEligible: salesEligible, profitEligible: profitEligible,
    fxRate: fxRate, ilsFromUsd: ilsFromUsd, roundHalfUp: roundHalfUp,
    calculateNetRevenue: calculateNetRevenue, calculateCOGS: calculateCOGS, calculatePaymentFees: calculatePaymentFees, feeForOrder: feeForOrder,
    reconcileOrders: reconcileOrders, calculateAdSpend: calculateAdSpend, calculateAdCredit: calculateAdCredit, dataHealth: dataHealth, explainChange: explainChange, comparePeriods: comparePeriods, anomalies: anomalies, advancedGate: advancedGate, snapshotRows: snapshotRows, calculateFixedCosts: calculateFixedCosts, calculateFixedActual: calculateFixedActual, allocateExpense: allocateExpense,
    calculateGrossProfit: calculateGrossProfit, calculateContributionProfit: calculateContributionProfit, calculateNetProfit: calculateNetProfit,
    confidencePercent: confidencePercent, worst: worst, summarize: summarize, fmt: fmt,
    monthlyCommitments: monthlyCommitments, unitMargin: unitMargin, orderRowsTotals: orderRowsTotals,
    isRealOrderRow: isRealOrderRow, dedupeAds: dedupeAds, catalogEstimate: catalogEstimate, orderRows: orderRows, attributeByCampaign: attributeByCampaign, shippingSummary: shippingSummary, profitByProduct: profitByProduct, effectiveFeeRate: effectiveFeeRate, unitCosts: unitCosts, ordersNeeded: ordersNeeded, productName: productName, allocate: allocate
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = LorinxEngine;
