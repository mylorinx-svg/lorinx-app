// LORINX Premium (lx2) — automated QA against the unpublished preview theme.
// Usage: node tools/qa.js [themeId] [outDir]
// Nothing is purchased: the script adds to a throw-away session cart, then empties it,
// and only checks that the checkout button hands off to Shopify checkout.
const { chromium } = require('playwright');
const fs = require('fs');

const THEME = process.argv[2] || '153195577388';
const OUT = process.argv[3] || '/tmp/lx2-qa';
const BASE = 'https://lorinx-il.com';
const enc = encodeURI;
const PAGES = {
  home: '/',
  cup: enc('/products/כוס-רוח-חשמלית'),
  gun: enc('/products/אקדח-מסאג'),
  foot: enc('/products/מסאגר-חשמלי-לרגליים'),
  thigh: enc('/products/מכשיר-לחיזוק-ועיצוב-הירכיים'),
  collection: enc('/collections/המוצר-שלנו'),
  all: '/collections/all',
  search: '/search?q=' + encodeURIComponent('כוס') + '&type=product',
  searchEmpty: '/search?q=zzzzqqq',
  cart: '/cart',
  about: enc('/pages/קצת-עלינו'),
  contact: '/pages/contact',
  b2b: enc('/pages/כמויות-לחברות'),
  shipping: '/policies/shipping-policy',
  notfound: '/this-page-does-not-exist',
};
const WIDTHS = [320, 375, 390, 430, 768, 1024, 1440];
const results = { theme: THEME, date: new Date().toISOString(), overflow: [], pages: {}, flows: {}, errors: {} };
const ignorable = (t) => /ERR_TUNNEL|Failed to fetch|net::ERR|Failed to load resource|contentsquare|monorail|shop\.app|hotjar/i.test(t);

function url(path) { return BASE + path + (path.includes('?') ? '&' : '?') + 'preview_theme_id=' + THEME + '&pb=0'; }

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();

  // ---- 1. Layout: horizontal overflow + basic page facts at every width
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 800 : 900 }, locale: 'he-IL' });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => { if (!ignorable(String(e))) errs.push(String(e).slice(0, 200)); });
    page.on('console', (m) => { if (m.type() === 'error' && !ignorable(m.text())) errs.push(m.text().slice(0, 200)); });
    for (const [name, path] of Object.entries(PAGES)) {
      const resp = await page.goto(url(path), { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => null);
      await page.waitForTimeout(900);
      const info = await page.evaluate(() => {
        const de = document.documentElement;
        const wide = [];
        if (de.scrollWidth > window.innerWidth + 1) {
          document.querySelectorAll('body *').forEach((el) => {
            const r = el.getBoundingClientRect();
            if ((r.right > window.innerWidth + 1 || r.left < -1) && r.width > 0 && wide.length < 4 && !el.closest('.lx-panel') && !el.closest('.lx-gal__track') && !el.closest('.lx-rev__track') && !el.closest('.lx-shots__track')) wide.push(el.className || el.tagName);
          });
        }
        const small = [];
        document.querySelectorAll('.lx2 a.lx-btn, .lx2 button, .lx2 .lxh-icon').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && (r.height < 40 || r.width < 40) && small.length < 5) small.push((el.className || el.tagName) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
        });
        return {
          overflow: de.scrollWidth - window.innerWidth, wide, small,
          h1: document.querySelectorAll('h1').length,
          title: document.title, dir: de.getAttribute('dir'), lang: de.getAttribute('lang'),
          lx: !!document.querySelector('.lx2'),
          imgsNoAlt: [...document.querySelectorAll('main img')].filter((i) => !i.hasAttribute('alt')).length,
          liquidErrors: (document.body.innerText.match(/Liquid error[^\n]*/g) || []).slice(0, 3),
        };
      });
      if (info.overflow > 1) results.overflow.push({ page: name, width: w, px: info.overflow, culprits: info.wide });
      if (w === 390 || w === 1440) results.pages[name + '@' + w] = Object.assign({ status: resp ? resp.status() : 'ERR' }, info);
    }
    if (errs.length) results.errors['w' + w] = [...new Set(errs)].slice(0, 10);
    await ctx.close();
  }

  // ---- 2. Purchase flow on mobile
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'he-IL' });
  const page = await ctx.newPage();
  const f = results.flows;
  try {
    await page.goto(url(PAGES.cup), { waitUntil: 'load', timeout: 60000 });
    await page.waitForTimeout(1200);
    f.initialPrice = await page.textContent('[data-lx-main] [data-lx-price]');
    f.initialCta = (await page.textContent('[data-lx-main] [data-lx-cta]')).trim();
    f.stickyHiddenAtTop = !(await page.evaluate(() => document.getElementById('lx-sticky').classList.contains('is-on')));
    const radios = await page.$$('[data-lx-main] input[name="id"]');
    f.variantOptions = radios.length;
    await page.click('[data-lx-main] .lx-opt:nth-of-type(2)');
    await page.waitForTimeout(200);
    f.priceAfterPick2 = await page.textContent('[data-lx-main] [data-lx-price]');
    f.ctaAfterPick2 = (await page.textContent('[data-lx-main] [data-lx-cta]')).trim();
    f.urlHasVariant = /variant=\d+/.test(page.url());
    await page.screenshot({ path: OUT + '/pdp-top-390.jpg', type: 'jpeg', quality: 70 });
    // sticky bar after scrolling past the button
    await page.evaluate(() => window.scrollTo(0, 2600));
    await page.waitForTimeout(700);
    f.stickyShownAfterScroll = await page.evaluate(() => document.getElementById('lx-sticky').classList.contains('is-on'));
    f.stickyText = (await page.textContent('[data-lx-sticky-price]')).trim();
    await page.screenshot({ path: OUT + '/pdp-sticky-390.jpg', type: 'jpeg', quality: 70 });
    // add to cart through the sticky bar
    await page.click('[data-lx-sticky-add]');
    await page.waitForSelector('#lx-cart-panel.is-open', { timeout: 15000 });
    await page.waitForTimeout(600);
    f.drawerOpened = true;
    f.drawerLine = (await page.textContent('#lx-cart-mount .lx-line__v').catch(() => '')).trim();
    f.drawerTotal = (await page.textContent('#lx-cart-mount .lx-cart__sum span:last-child').catch(() => '')).trim();
    f.countBadge = (await page.textContent('[data-lx-count]')).trim();
    await page.screenshot({ path: OUT + '/drawer-390.jpg', type: 'jpeg', quality: 70 });
    // quantity +
    await page.click('#lx-cart-mount .lx-qty button:last-child');
    await page.waitForTimeout(2500);
    f.totalAfterPlus = (await page.textContent('#lx-cart-mount .lx-cart__sum span:last-child').catch(() => '')).trim();
    f.countAfterPlus = (await page.textContent('[data-lx-count]')).trim();
    // escape closes the drawer
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    f.escClosesDrawer = !(await page.evaluate(() => document.getElementById('lx-cart-panel').classList.contains('is-open')));
    // cart page
    await page.goto(url('/cart'), { waitUntil: 'load' });
    await page.waitForTimeout(800);
    f.cartPageLines = await page.$$eval('[data-lx-cartpage] .lx-line', (l) => l.length);
    f.cartPageTotal = (await page.textContent('.lx-cartpage__side .lx-cart__sum:last-of-type span:last-child').catch(() => '')).trim();
    await page.screenshot({ path: OUT + '/cart-390.jpg', type: 'jpeg', quality: 70, fullPage: true });
    // checkout hand-off (no details are entered, no order is created)
    await Promise.all([
      page.waitForNavigation({ timeout: 30000 }).catch(() => null),
      page.click('.lx-cartpage__side button[name="checkout"]'),
    ]);
    await page.waitForTimeout(1500);
    f.checkoutUrl = page.url().replace(/\?.*/, '').replace(/[A-Za-z0-9]{20,}/g, '<token>');
    f.checkoutHandoff = /checkouts?/.test(page.url());
    // empty the cart again
    await page.goto(url('/cart'), { waitUntil: 'load' });
    await page.evaluate(() => fetch('/cart/clear.js', { method: 'POST' }));
    await page.waitForTimeout(1500);
    await page.goto(url('/cart'), { waitUntil: 'load' });
    f.cartEmptyState = (await page.textContent('.lx-cart__empty h2').catch(() => '')).trim();

    // navigation: mobile menu, search, FAQ
    await page.goto(url('/'), { waitUntil: 'load' });
    await page.waitForTimeout(800);
    await page.click('[data-lx-open="lx-menu-panel"]');
    await page.waitForTimeout(500);
    f.menuOpens = await page.evaluate(() => document.getElementById('lx-menu-panel').classList.contains('is-open'));
    f.menuLinks = await page.$$eval('#lx-menu-panel .lxm-nav a', (a) => a.map((x) => x.textContent.trim()));
    await page.screenshot({ path: OUT + '/menu-390.jpg', type: 'jpeg', quality: 70 });
    await page.keyboard.press('Escape');
    await page.click('[data-lx-search]');
    await page.waitForTimeout(300);
    f.searchOpens = await page.evaluate(() => document.querySelector('.lxh').classList.contains('is-search') && document.activeElement.id === 'lxh-q');
    await page.fill('#lxh-q', 'כוס');
    await Promise.all([page.waitForNavigation(), page.keyboard.press('Enter')]);
    f.searchResults = await page.$$eval('.lx-grid .lx-card', (c) => c.length);
    await page.goto(url('/') + '#faq', { waitUntil: 'load' });
    await page.click('#faq details:first-of-type summary');
    f.faqOpens = await page.evaluate(() => document.querySelector('#faq details').open);
    // home featured buy box adds too
    await page.click('#featured button[name="add"]');
    await page.waitForSelector('#lx-cart-panel.is-open', { timeout: 15000 });
    f.homeAddOpensDrawer = true;
    await page.evaluate(() => fetch('/cart/clear.js', { method: 'POST' }));
    await page.waitForTimeout(1000);
    // keyboard: first tab stop is the skip link, focus is visible on header controls
    await page.goto(url(PAGES.cup), { waitUntil: 'load' });
    await page.keyboard.press('Tab');
    f.firstTabStop = await page.evaluate(() => document.activeElement.className);
  } catch (e) {
    f.ERROR = String(e).slice(0, 400);
    await page.screenshot({ path: OUT + '/flow-error.jpg', type: 'jpeg', quality: 60 }).catch(() => {});
  }
  await ctx.close();
  await browser.close();
  fs.writeFileSync(OUT + '/qa.json', JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ overflow: results.overflow, flows: results.flows, errors: results.errors }, null, 1));
  const brief = Object.entries(results.pages).filter(([k]) => k.endsWith('@390')).map(([k, v]) => `${k} status=${v.status} lx=${v.lx} h1=${v.h1} noAlt=${v.imgsNoAlt} small=${JSON.stringify(v.small)} liquid=${JSON.stringify(v.liquidErrors)} title=${v.title.replace(/\s+/g, ' ').slice(0, 50)}`);
  console.log(brief.join('\n'));
})();
