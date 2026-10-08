/*
 * מתאם בין לשוניות הגיליון (LORINX Brain) למבנה שהמנוע מצפה לו.
 * קלט: מערכי שורות כפי שמחזירים Sheets API / Apps Script (שורה ראשונה = כותרות).
 * פלט: אובייקט data ל-LorinxEngine.summarize. אין כאן חישובים.
 */
var LorinxSheetAdapter = (function () {
  'use strict';
  function table(rows) {
    if (!rows || !rows.length) return [];
    var h = rows[0], out = [];
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i]; if (!r || r.every(function (c) { return c === '' || c == null; })) continue;
      var o = {}; for (var j = 0; j < h.length; j++) o[h[j]] = r[j] === undefined ? '' : r[j];
      out.push(o);
    }
    return out;
  }
  var num = function (v) { return v === '' || v == null ? 0 : Number(v); };
  var bool = function (v) { return v === true || v === 1 || String(v).trim().toLowerCase() === 'true'; };
  var nul = function (v) { return v === '' || v == null ? null : v; };

  function orders(ordersRows, linesRows, refundsRows) {
    var lines = {}, refunds = {};
    table(linesRows).forEach(function (l) {
      (lines[l.order_id] = lines[l.order_id] || []).push({ id: l.line_id, sku: nul(l.sku), variantTitle: nul(l.variant_title), qty: num(l.qty), unitsPerVariant: num(l.units_per_variant) || 1, unitPriceAgorot: num(l.unit_price_agorot), lineDiscountAgorot: num(l.line_discount_agorot) });
    });
    table(refundsRows).forEach(function (r) {
      (refunds[r.order_id] = refunds[r.order_id] || []).push({ id: r.refund_id, createdAt: r.refund_date, amountAgorot: num(r.amount_agorot), goodsReturned: bool(r.goods_returned) });
    });
    var flags = {}, list = [];
    table(ordersRows).forEach(function (o) {
      list.push({ id: o.order_id, name: o.name, createdAt: o.created_at, cancelledAt: nul(o.cancelled_at), financialStatus: o.financial_status, fulfillmentStatus: o.fulfillment_status, gateway: nul(o.gateway), city: o.city, customerId: String(o.customer_id), campaign: nul(String(o.campaign_id || '')), source: nul(o.source), tags: o.tags ? String(o.tags).split(',') : [], grossAgorot: num(o.gross_agorot), discountAgorot: num(o.discount_agorot), netAgorot: num(o.net_agorot), shippingAgorot: num(o.shipping_agorot), refunds: refunds[o.order_id] || [], lines: lines[o.order_id] || [] });
      flags[o.name] = { isTest: bool(o.is_test), cancelledInError: bool(o.cancelled_in_error), creatorSample: bool(o.creator_sample), note: o.note || '' };
    });
    return { orders: list, flags: flags };
  }
  function orderCosts(rows) { return table(rows).map(function (c) { return { orderName: c.order_name, supplierOrder: nul(c.supplier_order), amountUsdCents: num(c.amount_usd_cents), purchaseDate: c.purchase_date, status: c.status, source: c.source, confidence: c.confidence || 'MANUAL' }; }); }
  function productCosts(rows) { return table(rows).map(function (p) { return { sku: p.sku, name: p.name, unitCostUsdCents: num(p.unit_cost_usd_cents), effectiveFrom: p.effective_from, effectiveTo: nul(p.effective_to), source: p.source, confidence: p.confidence || 'MANUAL' }; }); }
  function fxRates(rows) { return table(rows).map(function (r) { return { date: r.date, currency: r.currency, rate: num(r.rate), source: r.source, confidence: r.confidence || 'VERIFIED' }; }); }
  function feeRates(rows) { return table(rows).map(function (r) { return { gateway: r.gateway, effectiveFrom: r.effective_from, effectiveTo: nul(r.effective_to), components: r.components_json ? JSON.parse(r.components_json) : [], actualAgorot: r.actual_agorot === '' ? null : num(r.actual_agorot), source: r.source, confidence: r.confidence || 'ESTIMATED', note: r.note }; }); }
  function adSpend(rows) { return table(rows).map(function (r) { return { date: r.date, campaignId: String(r.campaign_id), campaignName: r.campaign_name, adsetId: nul(r.adset_id), spendAgorot: num(r.spend_agorot), purchases: num(r.purchases), purchaseValueAgorot: num(r.purchase_value_agorot), source: r.source, confidence: r.confidence || 'VERIFIED' }; }); }
  function expenses(rows) { return table(rows).map(function (e) { var o = { id: e.id, name: e.name, category: e.category, source: e.source, confidence: e.confidence || 'MANUAL' }; if (e.category === 'OneTime') { o.amountAgorot = num(e.amount_agorot); o.date = e.date; } else if (e.category === 'AdCredit') { o.amountAgorot = num(e.amount_agorot); o.startDate = e.start_date; o.endDate = e.end_date; } else { o.monthlyAgorot = num(e.monthly_agorot); o.startDate = e.start_date; o.endDate = nul(e.end_date); } return o; }); }

  // tabs: {orders_v2, order_lines, refunds, order_costs, product_costs, fx_rates, fee_rates, ad_spend, expenses_v2}
  function build(tabs) {
    var o = orders(tabs.orders_v2, tabs.order_lines, tabs.refunds);
    var ads = adSpend(tabs.ad_spend);
    var cov = null;
    if (ads.length) { var ds = ads.map(function (a) { return a.date; }).sort(); cov = { from: ds[0], to: ds[ds.length - 1] }; }
    return { orders: o.orders, flags: o.flags, orderCosts: orderCosts(tabs.order_costs), productCosts: productCosts(tabs.product_costs), fx: fxRates(tabs.fx_rates), feeRates: feeRates(tabs.fee_rates), adSpend: ads, adSpendCoverage: cov, expenses: expenses(tabs.expenses_v2) };
  }
  return { table: table, orders: orders, orderCosts: orderCosts, productCosts: productCosts, fxRates: fxRates, feeRates: feeRates, adSpend: adSpend, expenses: expenses, build: build };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = LorinxSheetAdapter;
