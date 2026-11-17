// Lab comparison of the live theme and the lx2 preview theme (mobile viewport, 3 runs each).
// Reports LCP, CLS, DOM size, and transferred bytes by type. Lab numbers from one machine and
// network — use for relative comparison only, not as field Core Web Vitals.
// Usage: node tools/perf.js [themeId]
const { chromium } = require('playwright');
const THEME = process.argv[2] || '153195577388';
const BASE = 'https://lorinx-il.com';
const PAGES = { home: '/', product: encodeURI('/products/כוס-רוח-חשמלית') };

async function run(browser, path, preview) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL', deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  if (preview) { await page.goto(BASE + '/?preview_theme_id=' + THEME + '&pb=0', { waitUntil: 'domcontentloaded' }); }
  const bytes = { total: 0, image: 0, script: 0, stylesheet: 0, font: 0, document: 0, other: 0 };
  let requests = 0;
  page.on('response', async (r) => {
    try {
      const len = parseInt((await r.allHeaders())['content-length'] || '0', 10);
      const t = r.request().resourceType();
      requests++; bytes.total += len; bytes[t in bytes ? t : 'other'] += len;
    } catch (e) {}
  });
  await page.addInitScript(() => {
    window.__lcp = 0; window.__cls = 0; window.__lcpEl = '';
    new PerformanceObserver((l) => { for (const e of l.getEntries()) { window.__lcp = e.startTime; window.__lcpEl = (e.element && (e.element.tagName + '.' + e.element.className)) || ''; } }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  });
  await page.goto(BASE + path, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3500);
  const m = await page.evaluate(() => ({
    lcp: Math.round(window.__lcp), cls: +window.__cls.toFixed(3), lcpEl: window.__lcpEl.slice(0, 60),
    dom: document.querySelectorAll('*').length,
    fcp: Math.round((performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime || 0),
    inlineCss: [...document.querySelectorAll('style')].reduce((n, s) => n + s.textContent.length, 0),
    theme: (window.Shopify && Shopify.theme && Shopify.theme.id) || null,
  }));
  await ctx.close();
  return Object.assign(m, { requests, kb: Object.fromEntries(Object.entries(bytes).map(([k, v]) => [k, Math.round(v / 1024)])) });
}

(async () => {
  const browser = await chromium.launch();
  const out = {};
  for (const [name, path] of Object.entries(PAGES)) {
    for (const variant of ['live', 'preview']) {
      const runs = [];
      for (let i = 0; i < 3; i++) runs.push(await run(browser, path, variant === 'preview'));
      runs.sort((a, b) => a.lcp - b.lcp);
      const med = runs[1];
      out[name + ':' + variant] = { themeId: med.theme, lcp_ms: runs.map((r) => r.lcp), fcp_ms: med.fcp, cls: runs.map((r) => r.cls), lcpElement: med.lcpEl, domNodes: med.dom, inlineCssChars: med.inlineCss, requests: med.requests, kb: med.kb };
    }
  }
  await browser.close();
  console.log(JSON.stringify(out, null, 1));
})();
