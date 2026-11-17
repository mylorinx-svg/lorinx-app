# LORINX — SEO and Performance

## 1. Performance — measured

Lab measurement, 17 Nov 2026: headless Chromium, 390×844 viewport, three runs per page, datacentre network, `tools/perf.js`. Third-party analytics hosts were blocked by the test network on both variants. These are **relative lab numbers, not field Core Web Vitals.**

| Page | Variant | LCP (3 runs, ms) | CLS | Transfer total | Images | Other (video, etc.) | DOM nodes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Home | Live | 440 / 564 / 1108 | 0.009 | 2,081 KB | 1,046 KB | 579 KB | 619 |
| Home | Draft | 284 / 352 / 376 | 0 | 1,451 KB | 200 KB | 654 KB | 634 |
| Product (cupping) | Live | 452 / 472 / 484 | 0.005 | 17,543 KB | 3,016 KB | 14,078 KB | 699 |
| Product (cupping) | Draft | 452 / 480 / 488 | 0 | 1,554 KB | 295 KB | 685 KB | 750 |

What the numbers say:

- Product page transfer dropped by about 91% (17.5 MB → 1.55 MB). The live page autoplays a 1080p video and loads an animated GIF; the draft loads the video only when the visitor presses play and does not use the GIF.
- Image bytes dropped by 81% on the homepage and 90% on the product page, from responsive `srcset` and lazy loading.
- CLS is 0 on both draft pages.
- LCP is about the same on the product page and lower on the homepage. On this fast network LCP was already under 1.2 s on the live theme, so no LCP improvement is claimed for real users.
- Scripts and fonts grew slightly (10 KB script, one extra font request) because the draft's fonts actually load and display.

**NOT TESTED:** INP (needs real interaction data), Lighthouse score (the tool could not be run in this environment), throttled 4G, real devices, field data (CrUX / Shopify web performance report).

## 2. Performance — what was implemented

| Item | Implementation |
| --- | --- |
| LCP image | One image per page with `loading="eager"` and `fetchpriority="high"`; width, height and `srcset` output by `image_tag` |
| Other images | `loading="lazy"`, `sizes` per layout |
| Video | `preload="none"`, poster image, no autoplay |
| Fonts | Two families, `display=swap`, preconnect |
| CSS | One 37.5 KB file (uncompressed); no inline `<style>` blobs in templates |
| JavaScript | One 10 KB deferred file, no libraries, no inline `onclick` |
| Layout shift | Aspect-ratio boxes for all media; sticky bar and drawers are out of flow |

Remaining opportunities, **not implemented** because they need changes outside the `lx2` layer:

1. `layout/theme.liquid` still loads Dawn's `base.css` (80 KB), `global.js` and seven other Dawn scripts that the new pages no longer use. Removing them needs a careful pass over the layout.
2. The Sense RTL app loads Arimo from Google Fonts on every page although the draft does not display it. Turning off the app's font option saves a stylesheet and font files.
3. The stylesheet and fonts are requested from the header section rather than `<head>`; moving them to the layout would allow preloading.
4. Self-hosting the two font families on the Shopify CDN would remove two third-party connections.

## 3. Technical SEO — checked on the preview

| Check | Result | Status |
| --- | --- | --- |
| URLs | No handle, template or redirect was changed; all existing URLs resolve | VERIFIED |
| Canonical | Present and unchanged on home, product, collection, policy | VERIFIED |
| Titles and meta descriptions | Come from Shopify admin, unchanged | VERIFIED |
| One `<h1>` per page | Yes on all 15 tested pages except policy pages, where the policy text itself contains a second `<h1>` (content in admin) | VERIFIED |
| Heading order | `h1` → `h2` → `h3`, no skipped levels in `lx2` sections | VERIFIED by inspection |
| Product structured data | One `ProductGroup` with three variants (the live page outputs the same) | VERIFIED |
| FAQ structured data | `FAQPage` on home, product and contact pages, built from the visible questions | VERIFIED (valid JSON) |
| Organization / WebSite | Present on the homepage, valid JSON | VERIFIED |
| Breadcrumbs | Visible breadcrumb on product pages; no `BreadcrumbList` schema | PARTIAL |
| Image alt text | Every content image has alt text; decorative thumbnails are `alt=""` | VERIFIED |
| Language and direction | `lang="he-IL"` from the layout; `dir="rtl"` is set by script and on every `lx2` container | PARTIAL — the attribute should be in the layout |
| Internal links | Header, footer, cards, breadcrumbs and CTAs are plain `<a href>` links | VERIFIED |
| Open Graph image | Present | VERIFIED |
| Rating markup | None, because there is no verifiable review data | Intentional |

Structured data was checked for valid JSON and expected types in the browser. It was **not** run through Google's Rich Results Test (NOT TESTED).

## 4. SEO recommendations that need the owner (not done)

1. **Homepage title** is just "LORINX". Suggested: `LORINX | כוס רוח חשמלית ומכשירי ריקוברי לבית`. Set in Online Store → Preferences.
2. **Collection "all"** is titled "קטלוג" with no meta description; the custom collection has no description.
3. **Product titles** carry the suffix "מבית — ™LORINX" and, for the hero product, a pain-relief claim. A cleaner title would help click-through and compliance.
4. **Product descriptions** are empty for three of four products, so those pages rely on template copy. Moving that copy into the product description or metafields would make it indexable as product data and reusable in feeds.
5. **Two secondary menus** ("link-list", "copy") and three orphan pages duplicate product names; consider removing or redirecting them.
6. **Blog** is empty; usage guides ("איך משתמשים נכון בכוס רוח") are the natural first content.
