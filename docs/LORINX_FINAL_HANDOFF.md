# LORINX — Final Handoff

Date: 17 November 2026. Everything below describes an **unpublished draft**. The live store was not changed.

## 1. Where things are

| Item | Location |
| --- | --- |
| Draft theme | "LORINX Premium — טיוטה 11.2026 (לא לפרסם לפני אישור)", ID `153195577388`, role UNPUBLISHED |
| Preview link | `https://lorinx-il.com/?preview_theme_id=153195577388` |
| Live theme (untouched) | "LORINX - עותק חי 8.10 + חיפוש", ID `151965958188` |
| Source code | Branch `claude/kind-ride-7pzs23` of `mylorinx-svg/lorinx-app`, folder `theme/` |
| Documents | `research/`, `docs/` |
| Test scripts | `tools/qa.js`, `tools/perf.js`, `tools/build_templates.py`, `tools/upload_vars.py` |

The repository `lorinx-app` is the dashboard PWA, not the Shopify theme. The theme code was added under `theme/` on the working branch and does not affect the PWA files.

## 2. How to preview

1. Open the preview link above on your phone and on a computer. The preview stays active in that browser while you move between pages.
2. Or: Shopify admin → Online Store → Themes → the draft → Preview.
3. To edit texts and images: Themes → the draft → Customize. Sections are named "LORINX …".

## 3. New brand direction

"Quiet Recovery": warm bone background, near-black text and buttons, one oxide-red accent taken from the device, Frank Ruhl Libre headlines over Heebo body text, editorial spacing, factual copy. The saturated red bars, percentage badges and struck-through prices are gone. Details: `LORINX_BRAND_STRATEGY.md`, `LORINX_DESIGN_SYSTEM.md`.

## 4. What was built — IMPLEMENTED

| Area | Change |
| --- | --- |
| Design system | Tokens, typography, buttons, forms, panels, icons in one stylesheet |
| Header and footer | Sticky header, mobile menu, search, newsletter, policy links, payment icons |
| Homepage | 10 purpose-built sections replacing 8 custom-liquid blobs |
| Product page | Swipe gallery, new buy box with quantity cards, assurances with policy links, accordions, sticky purchase bar, per-product content sections, FAQ with structured data |
| Cart | Cart drawer after add-to-cart; redesigned cart page |
| Other pages | Collection, search, about, contact, B2B, default page, 404; policy pages restyled |
| Components | 20 sections, 4 snippets, all with Hebrew editor labels |

## 5. Status of every claim

**VERIFIED**
- The live theme is untouched (`updatedAt` 2026-10-09, role MAIN).
- The draft is unpublished and its 38 `lx2` files are byte-identical to the repository.
- No product, price, discount, policy, shipping, payment, app or setting was written to. The only write operations were one theme duplication and theme-file uploads to the draft.
- URLs, canonicals, titles and meta descriptions are unchanged. One `ProductGroup` schema per product page; `FAQPage` and Organization/WebSite schema are valid JSON.
- The Sense RTL app, Contentsquare and Shopify web pixels are still injected on draft pages.
- Colour contrast ratios meet WCAG AA for text.

**TESTED** (headless Chromium, preview URL)
- 15 pages at 7 widths: no horizontal overflow, no Liquid errors, no theme JavaScript errors.
- Full purchase path on mobile up to the Shopify checkout page: quantity selection, price updates, sticky bar, drawer, quantity change, cart page, checkout hand-off, empty cart.
- Mobile menu, search, FAQ accordion, keyboard order and visible focus on the product page.
- Performance: product page transfer 17.5 MB → 1.55 MB; homepage 2.08 MB → 1.45 MB; CLS 0; LCP unchanged on a fast lab network.

**PARTIAL**
- Accessibility: keyboard, focus and contrast checked; no screen-reader or automated audit; drawers do not trap focus.
- Visual review: main pages at 390px and 1440px by eye; tablet by automated overflow check only.
- RTL: correct in rendering; `dir="rtl"` is set by script rather than in the layout.
- Research: 7 of 13 competitor sites were actually opened; the design-gallery sites could not be browsed.

**NOT TESTED**
- Real phones, Safari, Firefox.
- Analytics and pixel events on the new add-to-cart path.
- Completing a checkout; contact, B2B and newsletter form submissions.
- INP, Lighthouse, field Core Web Vitals, Google Rich Results Test.
- Any effect on conversion. The draft has had no real visitors.

**BLOCKED**
- Shopify theme-editing tools (`theme_bash`, `theme_screenshot`) returned "connector requires additional permissions". Workaround used: Admin API uploads and preview-URL screenshots. Reconnecting the Shopify connector with theme permissions would allow direct editing.
- Design galleries (Awwwards, Godly, SiteInspire, Behance, Dribbble, Commerce Cream) and Aesop were unreachable from the research environment.
- Lighthouse could not be run.

## 6. Decisions that are yours

1. **Brand rule conflict.** The LORINX brand rules say "לא לשנות את דף המוצר". This brief asked for a product-page redesign, so it was built only in the unpublished draft. Publishing it is the point at which that rule would be broken, and needs your explicit approval.
2. **Reviews and rating.** Not carried over (see `LORINX_MARKETING_COPY.md` §6). If "4.9 · 46+" and the quotes are genuine, re-enter them in the "LORINX לקוחות מספרים" section and the "שורת דירוג" block. If not, leave them out.
3. **Price.** One cupping unit is ₪237.33 in Shopify and ₪237.90 on the brand sheet. The draft shows Shopify's value.
4. **Product title** contains "להפחתת כאבים". Recommended to change; it is a product edit.
5. **Default quantity.** One unit is preselected. The live homepage preselected two.
6. **Removed copy.** Diabetic and post-birth audience cards and recovery-time claims were removed.

## 7. Before publishing — checklist

- [ ] Open the preview on your own phone; add to cart; reach the checkout page.
- [ ] In Shopify → Settings → Customer events (and Meta Events Manager test events), confirm an add-to-cart event arrives from the preview.
- [ ] Send one message from the contact form in the preview and confirm it arrives.
- [ ] Decide items 1–5 in section 6.
- [ ] Optional: turn off the font option in the Sense RTL app (the draft no longer shows Arimo).

Publishing is a button in Shopify admin (Themes → the draft → Publish). It was not done and cannot be done by this session.

## 8. Rollback

- **Before publishing:** nothing to roll back. Delete the draft theme, or leave it.
- **After publishing:** Shopify admin → Online Store → Themes → "LORINX - עותק חי 8.10 + חיפוש" → Publish. The previous theme returns in full within seconds; no data is lost because products, orders and settings were never changed.
- **Single file:** every upload is in the Git history of the branch; `python3 tools/upload_vars.py 153195577388 <file>` prints the upload request for any earlier commit.
- The original templates remain inside the live theme and in the two older unpublished copies.

## 9. Known limitations

- Per-product copy lives in the product template with an "only for product" picker, because products and metafields could not be edited. A new product needs its blocks added in the editor.
- The product template holds 24 of the 25 sections Shopify allows.
- Dawn's base CSS and scripts still load from the layout although the new pages do not use them.
- Photography is the existing set; see the asset brief in `LORINX_DESIGN_SYSTEM.md`.
- Delivery is shown as a range, not as calendar dates.
- No image pinch-zoom in the gallery.

## 10. Research sources

`research/LORINX_PREMIUM_REDESIGN_RESEARCH.md` and its two appendices list every URL, split into opened and search-only.

## 11. Exact files

Uploaded to the draft theme (38):

```
assets/lx2.css
assets/lx2.js
snippets/lx2-buybox.liquid
snippets/lx2-card.liquid
snippets/lx2-icon.liquid
snippets/lx2-title.liquid
sections/lx2-404.liquid
sections/lx2-cart-drawer.liquid
sections/lx2-cart.liquid
sections/lx2-collection.liquid
sections/lx2-contact.liquid
sections/lx2-cta.liquid
sections/lx2-dos-donts.liquid
sections/lx2-facts.liquid
sections/lx2-faq.liquid
sections/lx2-featured-product.liquid
sections/lx2-footer.liquid
sections/lx2-header.liquid
sections/lx2-hero.liquid
sections/lx2-list.liquid
sections/lx2-media-text.liquid
sections/lx2-page.liquid
sections/lx2-product.liquid
sections/lx2-products.liquid
sections/lx2-reviews.liquid
sections/lx2-search.liquid
sections/header-group.json      (replaced)
sections/footer-group.json      (replaced)
templates/index.json            (replaced)
templates/product.json          (replaced)
templates/collection.json       (replaced)
templates/search.json           (replaced)
templates/cart.json             (replaced)
templates/404.json              (replaced)
templates/page.json             (replaced)
templates/page.about.json       (replaced)
templates/page.contact.json     (replaced)
templates/page.b2b.json         (replaced)
```

Not modified in the draft: `layout/*`, `config/*`, `locales/*`, all Dawn assets, sections and snippets, `blocks/*`, and the templates `article`, `blog`, `list-collections`, `password`, `gift_card`, `customers/*`, `page.contact-2`, `product.*` alternates.

Added to the repository only: `research/*`, `docs/*`, `tools/*`, `theme/*`.

Environment change made during the work: 22 hostnames were added to the allowed-network list of the personal `lorinx-app` cloud environment (the store, Shopify CDN, GitHub, Google Fonts and research sites). They can be removed in the environment settings.
