# LORINX — QA Report

Tested 17 November 2026 against the unpublished theme `153195577388` through the storefront preview URL, with headless Chromium (Playwright). Scripts: `tools/qa.js`, `tools/perf.js`. Raw output: `docs/qa-results.json`, `docs/perf-results.json`. Screenshots: `docs/screenshots/`.

Status words: **TESTED** = exercised in a browser and passed. **VERIFIED** = confirmed from data (checksums, API, DOM). **PARTIAL** = some of it checked. **NOT TESTED** = not checked. **BLOCKED** = could not be done from this environment.

## 1. Environment and limits

- One browser engine (Chromium), emulated viewports. **NOT TESTED:** Safari / iOS, Firefox, Samsung Internet, real phones, screen readers.
- The test network blocks most third-party hosts, so analytics and pixel scripts did not fully run during tests.
- Shopify's theme-editor tools (`theme_bash`, `theme_screenshot`) were **BLOCKED** by connector permissions; files were uploaded through the Admin API and screenshots taken through the public preview URL instead.
- No order was placed and no payment page was filled in.

## 2. Layout and responsive — TESTED

15 pages × 7 widths (320, 375, 390, 430, 768, 1024, 1440) = 105 page loads.

| Check | Result |
| --- | --- |
| Horizontal overflow | 0 of 105 |
| Liquid errors rendered on page | 0 |
| JavaScript errors from theme code | 0 |
| Touch targets under 40px on buttons and header icons | 0 |
| Content images without alt text | 0 |
| HTTP status | 200 on 14 pages, 404 on the not-found page (correct) |

Pages: home, four product pages, custom collection, all products, search with results, search without results, cart, about, contact, B2B, shipping policy, 404.

Three layout bugs were found by this suite during development and fixed: a newsletter form that widened the page by 4–19px, an announcement bar that overflowed at 320px, and single-column grids that grew to content width.

## 3. Purchase flow, mobile 390px — TESTED

| Step | Expected | Result |
| --- | --- | --- |
| Product page loads | Price ₪237.33, button "הוספה לסל · ₪237.33", one unit selected | Pass |
| Three quantity options | 3 radio cards | Pass |
| Select 2 units | Price and button show ₪379.90; URL gains `?variant=` | Pass |
| Sticky bar | Hidden at top; shown after scrolling past the button; text "2 יחידות · ₪379.90" | Pass |
| Add to cart from sticky bar | Drawer opens, line "2 יחידות", subtotal ₪379.90, cart badge 1 | Pass |
| Quantity + in drawer | Subtotal ₪759.80, badge 2 | Pass |
| Escape | Drawer closes | Pass |
| Cart page | 1 line, total ₪759.80 | Pass |
| Checkout button | Lands on `/checkouts/…/information` (Shopify checkout) | Pass — hand-off only |
| Clear cart | Empty state "הסל עדיין ריק" | Pass |
| Homepage buy box | Add opens the drawer | Pass |

The prices shown match Shopify variant prices (237.33 / 379.90 / 499.90). Savings shown (₪94.76, ₪212.09) equal units × 237.33 minus the pack price.

**NOT TESTED:** completing checkout, payment methods, discount codes, sold-out variants (none exist), adding with JavaScript disabled, quantity changes on the cart page other than load, the other three products' add-to-cart (same component, not individually exercised).

## 4. Navigation and interaction — TESTED

| Item | Result |
| --- | --- |
| Mobile menu opens, lists the 5 menu links | Pass |
| Search opens, focuses the field, submits, returns 2 product results for "כוס" | Pass |
| Empty search state | Renders |
| FAQ accordion opens | Pass |
| Footer links, policy links, breadcrumbs | Render as links; **NOT TESTED** click-by-click |
| Contact and B2B forms | Render with labels; **NOT TESTED** submission (would send a real message to the store inbox) |
| Newsletter form | Renders; **NOT TESTED** submission (would create a real subscriber) |

## 5. Accessibility — PARTIAL

| Check | Result | Status |
| --- | --- | --- |
| Keyboard order on product page | Skip link → menu → logo → search → cart → breadcrumbs → gallery → thumbnails → quantity cards | TESTED |
| Visible focus | 2px outline on every stop tested, including the quantity card when its radio is focused | TESTED |
| Escape closes drawers; focus returns to opener | Implemented; Escape TESTED, focus return NOT TESTED |
| Focus trap inside open drawers | Not implemented | Known limitation |
| Contrast | Body 15.9:1, secondary 6.4:1, tertiary 4.9:1, accent 6.5:1, text on dark 8.6:1 (computed) | VERIFIED |
| Semantics | One `h1`, landmarks (`header`, `nav`, `main`, `footer`), labelled forms, `aria-label` on icon buttons, native `details` and radios | VERIFIED by inspection |
| Reduced motion | Animations disabled under `prefers-reduced-motion` | Implemented, NOT TESTED |
| Screen reader | — | NOT TESTED |
| Automated audit (axe / Lighthouse) | — | NOT TESTED |

## 6. Visual review — PARTIAL

Reviewed in screenshots at 390px and 1440px: home, cupping product page, massage-gun product page, cart, drawer, menu, about, contact, B2B, collection, 404, refund policy. Typography, spacing, RTL alignment and image ratios are consistent. Not every page was reviewed at every width by eye; tablet widths were checked by the overflow test only.

Known visual weaknesses:

- Product photos vary in style and ratio between products; non-square images are letterboxed in the gallery.
- The "what's in the box" photo shows generic English packaging.
- WhatsApp screenshots are shown as they are.

## 7. Regression against the live theme

| Item | Result | Status |
| --- | --- | --- |
| Live theme `151965958188` | `updatedAt` still 2026-10-09; role MAIN | VERIFIED |
| Draft theme | role UNPUBLISHED | VERIFIED |
| Uploaded files equal the repository | MD5 of all 38 theme files on Shopify compared with the repository after the last upload: all match | VERIFIED |
| Layout, settings, locales, app embeds | Not modified | VERIFIED (not in the upload list) |
| Sense RTL app, Contentsquare, Shopify web pixels | Still injected on preview pages | VERIFIED in page source |
| Analytics events (add to cart, checkout started) firing | — | NOT TESTED (pixels run in Shopify's sandbox and were blocked by the test network) |
| Products, prices, discounts, policies, shipping, payments | No write was made to any of them | VERIFIED (only `themeDuplicate` and `themeFilesUpsert` were called) |

## 8. Performance and SEO

See `LORINX_SEO_AND_PERFORMANCE.md`. Summary: product page transfer 17.5 MB → 1.55 MB, CLS 0, LCP unchanged on a fast network (measured); INP and Lighthouse NOT TESTED.

## 9. Open issues

| # | Issue | Severity | Owner action |
| --- | --- | --- | --- |
| 1 | Analytics events on the new add-to-cart path are unverified | High before publishing | Add to cart once in the preview from a normal browser and check Shopify → Customer events / Meta Events Manager |
| 2 | No test on a real iPhone or Android phone | High before publishing | Open the preview link on your phone |
| 3 | Forms not submitted | Medium | Send one test message from the contact page in the preview |
| 4 | Drawers do not trap focus | Low | Later improvement |
| 5 | `dir="rtl"` is set by script, not in the layout | Low | One-line layout edit after approval |
| 6 | Policy pages have two `h1` | Low | Edit the policy text in admin |
