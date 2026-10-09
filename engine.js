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

  var FORMULA_VERSION = '1.0.0';
  var VAT_RATE = 0.18;
  var CONFIDENCE_WEIGHT = { VERIFIED: 1, MANUAL: 0.8, ESTIMATED: 0.5, STALE: 0.5, MISSING: 0 };
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
  function periodDays(p) { return Math.round((Date.parse(p.to + 'T00:00:00Z') - Date.parse(p.from + 'T00:00:00Z')) / 864e5) + 1; }

  // ---------- אמינות ----------

  function worst(labels) {
    var order = ['MISSING', 'STALE', 'ESTIMATED', 'MANUAL', 'VERIFIED'];
    var w = 'VERIFIED';
    for (var i = 0; i < labels.length; i++) if (order.indexOf(labels[i]) < order.indexOf(w)) w = labels[i];
    return w;
  }
  function confidencePercent(components) {
    // ממוצע משוקלל לפי הסכום המוחלט של כל רכיב. רכיב MISSING נספר במשקל 0 עם "סכום" משוער אם ניתן, אחרת 1 כדי להוריד את הציון.
    var num = 0, den = 0;
    for (var i = 0; i < components.length; i++) {
      var c = components[i];
      var amt = Math.abs(c.amountAgorot || 0);
      if (c.confidence === 'MISSING') amt = Math.abs(c.estimatedAgorot || 0) || 1;
      if (amt === 0) continue;
      num += amt * (CONFIDENCE_WEIGHT[c.confidence] || 0);
      den += amt;
    }
    return den ? Math.round(100 * num / den) : 0;
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
    if (f.isTest) state = 'TEST';
    else if (f.creatorSample) state = 'CREATOR_SAMPLE';
    else if (cancelled && refunded === 0) state = 'CANCELLED_NO_REFUND';
    else if (cancelled) state = 'CANCELLED';
    else if (o.financialStatus !== 'PAID' && o.financialStatus !== 'PARTIALLY_REFUNDED' && o.financialStatus !== 'REFUNDED') state = 'UNPAID';
    var units = 0;
    (o.lines || []).forEach(function (l) { units += (l.qty || 0) * (l.unitsPerVariant || 1); });
    return {
      id: o.id, name: o.name,
      date: israelDate(o.createdAt), createdAt: o.createdAt,
      gateway: o.gateway, campaign: o.campaign || null,
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
    if (o.state === 'TEST' && !(opts && opts.includeTestOrders)) return false;
    return true; // מכירות = כמו Shopify (כולל מבוטלות; ההחזר יורד בנפרד)
  }
  function profitEligible(o, opts) {
    if (o.state === 'TEST' && !(opts && opts.includeTestOrders)) return false;
    if (o.state === 'CANCELLED_NO_REFUND') return false; // עד שההחזר נרשם או שההזמנה מתוקנת
    if (o.state === 'UNPAID') return false;
    return true;
  }

  // ---------- מכירות ----------

  function calculateNetRevenue(orders, period, opts) {
    opts = opts || {};
    var gross = 0, disc = 0, refund = 0, count = 0, countTest = 0, testNet = 0, list = [];
    orders.forEach(function (o) {
      if (!inPeriod(o.date, period)) return;
      if (o.state === 'TEST') { countTest++; testNet += o.netAgorot; if (!opts.includeTestOrders) return; }
      if (opts.profitOnly && !profitEligible(o, opts)) return;
      count++; gross += o.grossAgorot; disc += o.discountAgorot; list.push(o.name);
    });
    // החזרים לפי תאריך ההחזר
    orders.forEach(function (o) {
      if (o.state === 'TEST' && !opts.includeTestOrders) return;
      o.refunds.forEach(function (r) { if (inPeriod(israelDate(r.createdAt), period)) refund += r.amountAgorot; });
    });
    var net = gross - disc - refund;
    return {
      metric: 'netRevenue', period: period, netAgorot: net, grossAgorot: gross, discountAgorot: disc, refundAgorot: refund,
      orderCount: count, orderNames: list, testOrderCount: countTest, testOrdersNetAgorot: testNet,
      components: [
        { name: 'מכירות ברוטו', amountAgorot: gross, confidence: 'VERIFIED', source: 'Shopify' },
        { name: 'הנחות', amountAgorot: -disc, confidence: 'VERIFIED', source: 'Shopify' },
        { name: 'החזרים', amountAgorot: -refund, confidence: 'VERIFIED', source: 'Shopify' }
      ],
      confidence: 'VERIFIED', confidencePercent: 100
    };
  }

  // ---------- עלות מוצרים ----------

  function fxRate(fx, ymd) {
    // שער ליום; אם אין (סוף שבוע/חג) לוקחים את הקודם עד 3 ימים אחורה ומסמנים
    var map = fx._map; if (!map) { map = {}; fx.forEach(function (r) { map[r.date] = r; }); fx._map = map; }
    for (var i = 0; i <= 3; i++) {
      var r = map[addDays(ymd, -i)];
      if (r) return { rate: r.rate, date: r.date, exact: i === 0, confidence: r.confidence || 'VERIFIED' };
    }
    return null;
  }

  function calculateCOGS(orders, orderCosts, productCosts, fx, period, opts) {
    opts = opts || {};
    var byOrder = {};
    (orderCosts || []).forEach(function (c) { (byOrder[c.orderName] = byOrder[c.orderName] || []).push(c); });
    var total = 0, creatorAgorot = 0, perOrder = [], labels = [], missing = [];
    orders.forEach(function (o) {
      if (!inPeriod(o.date, period)) return;
      if (!profitEligible(o, opts) && o.state !== 'CREATOR_SAMPLE') return;
      var rows = byOrder[o.name] || [], amt = 0, conf = [], detail = [];
      if (rows.length) {
        rows.forEach(function (c) {
          var r = fxRate(fx, c.purchaseDate);
          if (!r) { conf.push('MISSING'); detail.push({ supplierOrder: c.supplierOrder, usdCents: c.amountUsdCents, agorot: null, reason: 'אין שער' }); return; }
          var a = ilsFromUsd(c.amountUsdCents, r.rate);
          amt += a;
          // שער יציג של בנק ישראל תקף עד הפרסום הבא: ביום בלי פרסום (סוף שבוע, חג) משתמשים בשער היום העסקי הקודם, וזה לא הערכה
          conf.push(worst([c.confidence || 'MANUAL', r.confidence]));
          detail.push({ supplierOrder: c.supplierOrder, usdCents: c.amountUsdCents, rate: r.rate, rateDate: r.date, rateCarried: !r.exact, agorot: a, status: c.status });
        });
      } else {
        // אין רכישה רשומה: עלות לפי product_costs בתוקף
        var est = 0, ok = true;
        o.lines.forEach(function (l) {
          var pc = null;
          (productCosts || []).forEach(function (p) {
            var key = l.sku || (l.unitsPerVariant === 3 ? '3units' : null);
            if (p.sku === key && p.effectiveFrom <= o.date && (!p.effectiveTo || p.effectiveTo >= o.date)) pc = p;
          });
          if (!pc) { ok = false; return; }
          var r = fxRate(fx, o.date);
          if (!r) { ok = false; return; }
          est += ilsFromUsd(pc.unitCostUsdCents * (l.qty * (l.unitsPerVariant || 1)), r.rate);
        });
        if (ok && o.lines.length) { amt = est; conf.push('ESTIMATED'); detail.push({ reason: 'לפי עלות מוצר בתוקף, אין רכישה רשומה' }); }
        else { conf.push('MISSING'); missing.push(o.name); }
      }
      var c = worst(conf);
      if (o.state === 'CREATOR_SAMPLE') creatorAgorot += amt; else total += amt;
      perOrder.push({ name: o.name, agorot: amt, confidence: c, detail: detail, creatorSample: o.state === 'CREATOR_SAMPLE' });
      labels.push(c);
    });
    var comps = [{ name: 'עלות מוצרים ומשלוח לספק', amountAgorot: total, confidence: worst(labels.length ? labels : ['VERIFIED']), source: 'AutoDS' }];
    return { metric: 'cogs', period: period, cogsAgorot: total, creatorSamplesAgorot: creatorAgorot, perOrder: perOrder,
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
    var base = o.netAgorot - o.refundedAgorot, sum = 0, parts = [];
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
    var total = 0, days = {}, byCampaign = {}, labels = [];
    (adSpend || []).forEach(function (r) {
      if (!inPeriod(r.date, period)) return;
      total += r.spendAgorot; days[r.date] = 1; labels.push(r.confidence || 'VERIFIED');
      var k = r.campaignId || '?';
      byCampaign[k] = byCampaign[k] || { campaignId: k, campaignName: r.campaignName, spendAgorot: 0, purchases: 0 };
      byCampaign[k].spendAgorot += r.spendAgorot; byCampaign[k].purchases += r.purchases || 0;
    });
    var coverage = (opts && opts.coverage) || null; // {from,to}: הטווח שיש לו נתונים בכלל
    var hasData = Object.keys(days).length > 0;
    var missing = !hasData && !(coverage && coverage.from <= period.from && coverage.to >= period.to);
    var conf = missing ? 'MISSING' : worst(labels.length ? labels : ['VERIFIED']);
    return { metric: 'adSpend', period: period, adSpendAgorot: total, daysWithData: Object.keys(days).length, byCampaign: byCampaign,
      components: [{ name: 'פרסום', amountAgorot: total, confidence: conf, source: 'Meta', estimatedAgorot: 0 }], confidence: conf, confidencePercent: missing ? 0 : 100 };
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
      var days = Math.round((Date.parse(segEnd + 'T00:00:00Z') - Date.parse(cur + 'T00:00:00Z')) / 864e5) + 1;
      total += roundHalfUp(e.monthlyAgorot * days / dim);
      cur = addDays(segEnd, 1);
    }
    return total;
  }

  function calculateFixedCosts(expenses, period) {
    var total = 0, per = [], labels = [];
    (expenses || []).forEach(function (e) {
      if (e.category === 'AdCredit') return; // קרדיט פרסום אינו הוצאה קבועה
      var a = allocateExpense(e, period);
      if (a === 0) return;
      total += a; per.push({ id: e.id, name: e.name, category: e.category, agorot: a, confidence: e.confidence || 'MANUAL' }); labels.push(e.confidence || 'MANUAL');
    });
    var conf = worst(labels.length ? labels : ['MANUAL']);
    return { metric: 'fixedCosts', period: period, fixedAgorot: total, perExpense: per,
      components: [{ name: 'הוצאות קבועות מוקצות', amountAgorot: total, confidence: conf, source: 'expenses' }], confidence: conf, confidencePercent: confidencePercent(per.map(function (p) { return { amountAgorot: p.agorot, confidence: p.confidence }; })) };
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
    var est = cogs.perOrder.filter(function (p) { return p.confidence === 'ESTIMATED'; }).map(function (p) { return p.name; });
    add('cost_actual', 'העלות מבוססת על רכישה בפועל', est.length ? 'warn' : 'ok', est.length ? 'מחיר ספק נוכחי במקום רכישה בפועל: ' + est.join(', ') : '');

    var noFx = [];
    orders.forEach(function (o) { if (profitEligible(o) && !fxRate(data.fx, o.date)) noFx.push(o.name); });
    add('fx_coverage', 'יש שער בנק ישראל לכל תאריך הזמנה', noFx.length ? 'bad' : 'ok', noFx.length ? 'בלי שער: ' + noFx.join(', ') : '');

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

    var bad = checks.filter(function (c) { return c.level === 'bad'; }).length, warn = checks.filter(function (c) { return c.level === 'warn'; }).length;
    return { checks: checks, bad: bad, warn: warn, ok: bad === 0 && warn === 0 };
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
    var byDay = {}; (data.adSpend || []).forEach(function (r) { byDay[r.date] = (byDay[r.date] || 0) + r.spendAgorot; });
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
    (data.adSpend || []).forEach(function (r) {
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
    if (c < need.confidencePercent) reasons.push('ביטחון ברווח התרומה ' + c + '%, נדרש ' + need.confidencePercent + '%');
    return { met: reasons.length === 0, need: need, orders: n, confidencePercent: c, coverage: cov, reasons: reasons };
  }

  // ---------- צילום מדדים (kpi_snapshots) ----------
  // שורה לכל (תקופה, מדד): snapshot_date, period_label, period_from, period_to, metric, value_agorot, confidence, confidence_pct, missing, formula_version, data_version, components_json
  function snapshotRows(data, nowIso, dataVersion) {
    var today = israelDate(nowIso), ym = today.slice(0, 7), periods = [], rows = [];
    for (var m = 7; m < Number(today.slice(5, 7)); m++) { var lab = today.slice(0, 4) + '-' + ('0' + m).slice(-2); periods.push([lab, periodMonth(lab)]); }
    if (ym) periods.push(['30d', periodLastDays(30, nowIso)], ['7d', periodLastDays(7, nowIso)]);
    function cj(list) { return JSON.stringify(list.map(function (x) { return { n: x.name, a: x.amountAgorot, c: x.confidence }; })); }
    periods.forEach(function (pp) {
      var label = pp[0], p = pp[1], s = summarize(data, p);
      function row(metric, v, conf, pct, missing, comps) { rows.push([today, label, p.from, p.to, metric, v, conf, pct, missing, s.formulaVersion, dataVersion || today, comps]); }
      var rv = s.revenueForProfit;
      row('netRevenue', rv.netAgorot, 'VERIFIED', 100, '', cj([{ name: 'מכירות ברוטו', amountAgorot: rv.grossAgorot, confidence: 'VERIFIED' }, { name: 'הנחות', amountAgorot: -rv.discountAgorot, confidence: 'VERIFIED' }, { name: 'החזרים', amountAgorot: -rv.refundAgorot, confidence: 'VERIFIED' }]));
      row('salesLikeShopify', s.sales.netAgorot, 'VERIFIED', 100, '', cj([{ name: 'הזמנות', amountAgorot: s.sales.orderCount, confidence: 'VERIFIED' }]));
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
    var ads = calculateAdSpend(data.adSpend, period, { coverage: data.adSpendCoverage });
    var fixed = calculateFixedCosts(data.expenses, period);
    var adCredit = calculateAdCredit(data.expenses, ads, period);
    var gross = calculateGrossProfit(rev, cogs);
    var contrib = calculateContributionProfit(rev, cogs, fees, ads);
    var net = calculateNetProfit(contrib, fixed);
    var ordersInProfit = rev.orderCount;
    var r = {
      formulaVersion: FORMULA_VERSION, period: period, days: periodDays(period),
      sales: sales, revenueForProfit: rev, cogs: cogs, fees: fees, ads: ads, fixed: fixed,
      grossProfit: gross, contributionProfit: contrib, netProfit: net, adCredit: adCredit,
      kpis: {
        orders: sales.orderCount, aovAgorot: sales.orderCount ? roundHalfUp(sales.netAgorot / sales.orderCount) : null,
        contributionMarginPct: rev.netAgorot ? +(100 * contrib.agorot / rev.netAgorot).toFixed(1) : null,
        netMarginPct: rev.netAgorot ? +(100 * net.agorot / rev.netAgorot).toFixed(1) : null,
        mer: ads.adSpendAgorot ? +(rev.netAgorot / ads.adSpendAgorot).toFixed(2) : null,
        blendedCpaAgorot: ads.adSpendAgorot && ordersInProfit ? roundHalfUp(ads.adSpendAgorot / ordersInProfit) : null,
        breakEvenCpaAgorot: ordersInProfit ? roundHalfUp((rev.netAgorot - cogs.cogsAgorot - fees.feesAgorot) / ordersInProfit) : null,
        breakEvenRoas: (rev.netAgorot - cogs.cogsAgorot - fees.feesAgorot) > 0 ? +(rev.netAgorot / (rev.netAgorot - cogs.cogsAgorot - fees.feesAgorot)).toFixed(2) : null
      }
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
        name: o.name, date: o.date, state: o.state, inProfit: inProfit, units: o.units,
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
    var rows = orderRows(data, basisPeriod, opts).filter(function (r) { return r.inProfit && r.state === 'OK' && r.profitAgorot != null && r.netAgorot > 0; });
    var sum = 0; rows.forEach(function (r) { sum += r.profitAgorot; });
    var avg = rows.length ? sum / rows.length : null, fixed = calculateFixedCosts(data.expenses, monthPeriod);
    var need = avg && avg > 0 ? Math.ceil((goalAgorot + fixed.fixedAgorot) / avg) : null;
    return { needed: need, avgProfitAgorot: avg == null ? null : roundHalfUp(avg), basisOrders: rows.length, fixedAgorot: fixed.fixedAgorot, goalAgorot: goalAgorot, beforeAds: true,
      confidence: worst(rows.map(function (r) { return r.confidence; }).concat(fixed.confidence ? [fixed.confidence] : [])) };
  }

  return {
    FORMULA_VERSION: FORMULA_VERSION, VAT_RATE: VAT_RATE,
    israelDate: israelDate, daysInMonth: daysInMonth, addDays: addDays, inPeriod: inPeriod,
    periodMonth: periodMonth, periodLastDays: periodLastDays, periodToday: periodToday, periodAll: periodAll, periodDays: periodDays,
    normalizeOrder: normalizeOrder, normalizeOrders: normalizeOrders, salesEligible: salesEligible, profitEligible: profitEligible,
    fxRate: fxRate, ilsFromUsd: ilsFromUsd, roundHalfUp: roundHalfUp,
    calculateNetRevenue: calculateNetRevenue, calculateCOGS: calculateCOGS, calculatePaymentFees: calculatePaymentFees, feeForOrder: feeForOrder,
    calculateAdSpend: calculateAdSpend, calculateAdCredit: calculateAdCredit, dataHealth: dataHealth, explainChange: explainChange, comparePeriods: comparePeriods, anomalies: anomalies, advancedGate: advancedGate, snapshotRows: snapshotRows, calculateFixedCosts: calculateFixedCosts, allocateExpense: allocateExpense,
    calculateGrossProfit: calculateGrossProfit, calculateContributionProfit: calculateContributionProfit, calculateNetProfit: calculateNetProfit,
    confidencePercent: confidencePercent, worst: worst, summarize: summarize, fmt: fmt,
    orderRows: orderRows, profitByProduct: profitByProduct, effectiveFeeRate: effectiveFeeRate, unitCosts: unitCosts, ordersNeeded: ordersNeeded, productName: productName, allocate: allocate
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = LorinxEngine;
