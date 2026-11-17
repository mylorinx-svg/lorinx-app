# LORINX — Premium Redesign Research

Date: 17 November 2026 · Scope: research that drove the `lx2` redesign of lorinx-il.com.

This file is the synthesis. The full evidence, with per-source labels, is in two appendices:

- [Appendix A — design inspiration, competitor scoring, Shopify themes](appendix-a-design-and-competitors.md)
- [Appendix B — e-commerce UX, CRO, wellness-claim guardrails, prompting frameworks, performance and SEO](appendix-b-ux-cro-seo.md)

Labels used throughout: **VERIFIED** = read on a page that was actually opened (or measured on the live store). **SEARCH** = from search-result snippets only, page not opened. **RECOMMENDATION** = professional judgement.

## 1. How the research was done, and its limits

- The research ran in a sandboxed session with an allow-list of hosts. Pages were opened with a headless browser and with `curl`.
- **Opened (VERIFIED):** lorinx-il.com (all templates), Therabody, Hyperice, Oura, HigherDOSE, Eight Sleep, Foreo, WHOOP (partially), themes.shopify.com listings, Baymard, NN/g, shopify.dev, shopify.com.
- **Not opened (SEARCH only):** Aesop (blocked by Cloudflare), Solawave, Loop, Ridge, Nothing, Dyson, Awwwards (502), Godly (did not resolve), SiteInspire, Land-book, Behance, Dribbble, Commerce Cream, Really Good Emails, CXL, Relume, Framer, Webflow, FDA/FTC guidance, Israeli regulatory pages.
- Consequence: 13 sites are scored, but only 7 scores rest on pages that were opened. Theme-demo stores were not opened, so theme claims are limited to what the Theme Store listings state. Oura, Foreo and Eight Sleep rendered without photos, so their photography is unscored. Many sites were in Black Friday mode.
- The gallery sites the brief names (Awwwards, Godly, SiteInspire, Land-book, Behance, Dribbble, Commerce Cream) could not be browsed. This is a real gap; the design direction rests on the brand sites above, not on gallery curation.

## 2. What the live store looked like before (VERIFIED)

| Area | Finding |
| --- | --- |
| Build | Dawn 887 with almost every page made of `custom-liquid` blobs (inline HTML, CSS and `onclick` JS inside the JSON templates). |
| Visual language | Black, white and saturated red; red announcement bar, red CTAs, red badges. |
| Typography | Heebo and Frank Ruhl Libre are loaded, but the Sense RTL app forces **Arimo** on every element with `!important`, so the intended fonts never show. Seven Heebo weights are downloaded for nothing. |
| Offer framing | "עד 30% הנחה במארזים", "הנמכר ביותר · 20% הנחה", struck-through compare prices built from multiples of the unit price. |
| Price consistency | Homepage shows ₪237.90 for one unit; the product page and Shopify variant are **₪237.33**. The brand sheet says ₪237.90. Homepage preselects 2 units, product page preselects 1. |
| Social proof | "4.9 · 46+ ביקורות מאומתות" and named quotes are hardcoded in templates; no review app. The same names carry different quotes on different pages. Six WhatsApp screenshots look like genuine customer messages. |
| Claims | Product title "להפחתת כאבים"; copy says heat "shortens recovery time", red light "calms the area"; FAQ recommends the device to people with back pain; foot massager copy addresses diabetics. |
| Purchase flow | Plain form POST to `/cart/add`, full page reload to `/cart`. No cart drawer, no sticky purchase bar. |
| Weight | Product page transfers about 17.5 MB on load (autoplaying 1080p video plus an animated GIF). |
| Markup | `<html lang="he-IL">` with no `dir`; images are bare `<img>` tags without `srcset`, dimensions or priority. |
| Integrations | Sense RTL app embed, Contentsquare/Hotjar script, Shopify web pixels. No Meta pixel or GTM snippet in theme code (pixels run through Shopify's web-pixel sandbox). |

## 3. Competitive analysis — what transfers to LORINX

Full scoring tables for 13 sites are in Appendix A §1. The patterns that repeat across the sites actually opened:

1. **Warm or neutral ground, one calm CTA colour** (Therabody, Hyperice, HigherDOSE, Oura). None uses saturated red for bars, buttons and badges at once. RECOMMENDATION: move LORINX red out of the interface and leave it in the product itself.
2. **Light or medium type at large sizes**, 3–4 navigation items.
3. **Sticky purchase bar on every product page**, showing the price or total (Hyperice, HigherDOSE, Eight Sleep).
4. **Cart drawer** instead of a redirect (Hyperice, Therabody).
5. **Trust stated once**, as plain rows under the CTA, not as repeated icon rows.
6. **Bundle selection as radio cards** with total, one badge at most (HigherDOSE). Baymard adds per-unit price next to the total.
7. **Claim discipline**: Therabody footnotes performance claims; Oura puts one sourced number per screen.
8. Therabody, Hyperice and HigherDOSE are Shopify stores with custom themes, so all of the above is achievable on Dawn.

## 4. Shopify themes (VERIFIED from Theme Store listings only)

- RTL is listed for Prestige, Impact, Symmetry, Pipeline, Be Yours, Release and Concept; not listed for Impulse, Motion, Stiletto, Shapes or Broadcast.
- No listing advertises a native multi-unit bundle selector. "Quantity pricing" appears on five listings with a Shopify Plus label, which LORINX (Basic plan) cannot use. The 1/2/3 selector therefore stays a custom block driven by variants.
- Patterns adapted: Prestige (restrained product page), Be Yours (ritual steps), Pipeline (assurance-aware cart), Impact/Stiletto (sticky buy bar), Release (short "sales points").
- Decision: **no theme purchase.** A paid theme would not solve the bundle selector, would need the same RTL and copy work, and the brand rules forbid paid tools without approval.

## 5. UX findings turned into requirements

Evidence and URLs are in Appendix B §1–2. Each requirement below was implemented unless marked.

| Finding | Requirement | Status |
| --- | --- | --- |
| Shoppers look for shipping cost and returns on the product page; banner-only messages are missed (Baymard, VERIFIED) | Shipping, returns and warranty as three text rows directly under the add-to-cart button, with policy links | IMPLEMENTED |
| Per-unit price is needed to compare multi-packs (Baymard, VERIFIED) | Each quantity card shows total, per-unit price and the shekel saving, all computed from variant prices | IMPLEMENTED |
| Crossed-out prices that were never charged erode trust (RECOMMENDATION) | No compare-at prices, no percentage badges; one factual tag on the lowest per-unit price | IMPLEMENTED |
| Mobile users lose the CTA on long product pages (Baymard/NN/g, VERIFIED) | Sticky bar appears only after the main button scrolls away and hides at the footer | IMPLEMENTED |
| Added-to-cart confirmation must be unmistakable (Baymard, SEARCH) | Cart drawer opens after add; `/cart` remains a full page | IMPLEMENTED |
| Delivery shown as a date range reads as a promise (Baymard, VERIFIED) | Text range "7–14 ימי עסקים" kept; computed calendar dates not built | NOT IMPLEMENTED (needs a business-day calendar) |
| Gallery needs in-scale, in-use and in-box images; swipe on mobile | Swipe gallery with thumbnails using the five existing product images | IMPLEMENTED with existing assets; pinch-zoom NOT IMPLEMENTED |
| Reviews must be genuine and attributable (FTC/consumer law, SEARCH) | Hardcoded rating line, "verified" labels and named quotes removed from the draft; real WhatsApp screenshots kept | IMPLEMENTED — owner decision required |

## 6. Marketing findings

- Paid-social traffic lands on the product page; the first image and headline must match the ad. The product page is therefore self-sufficient and the homepage is a brand page with one clear route to the hero product.
- Premium positioning comes from restraint: one message per screen, facts instead of superlatives, an offer that is easy to verify.
- Honest multi-unit framing: "המחיר ליחידה יורד ככל שמוסיפים" plus the real saving in shekels.
- Objections answered where they arise: safety and correct use (do/don't), who should not use the device, delivery time, returns.

## 7. Wellness-claim guardrails (Appendix B §3; SEARCH-based, not legal advice)

Say what the device does and how it feels; do not say what it treats. Applied in the draft copy:

| Avoid | Use |
| --- | --- |
| להפחתת כאבים, מקל על כאבי גב | תחושת שחרור, הרפיית שרירים אחרי יום ארוך |
| מקצר את זמן ההחלמה | חום הדרגתי ונעים באזור הטיפול |
| מומלץ לאנשים עם כאבי גב / לסוכרתיים | למי שיושב שעות מול מחשב / עומד כל היום |
| תוצאות תוך X ימים | התחושה משתנה מאדם לאדם |

The product **title** still contains "להפחתת כאבים". It is product data, which this project may not change; see the handoff.

## 8. Prompting-framework synthesis

Relume, Framer, Webflow and Anthropic guidance (SEARCH) converge on the same brief structure: brand context, audience, one named design direction, tokens before components, section-by-section purpose, interaction and responsive rules, constraints, and explicit quality criteria checked in a browser. `docs/LORINX_DESIGN_SYSTEM.md` and `docs/LORINX_WEBSITE_ARCHITECTURE.md` follow that structure.

## 9. Recommended direction and rejected approaches

**Chosen: "Quiet Recovery"** — warm bone ground, near-black ink, a single oxide-red accent taken from the device, Hebrew serif display type over a clean sans, editorial spacing, facts over hype. Rationale and the three concepts are in `docs/LORINX_BRAND_STRATEGY.md`.

Rejected: an all-black "tech" site (closest to today's look and to generic gadget stores); black and gold luxury (a cliché the brief warns against, and unrelated to the product); entry pop-ups, countdown timers and percentage badges (dark patterns, cheapen the brand); repeated icon trust rows; buying a theme; AI-generated product imagery (would misrepresent the product).

One deliberate departure from Appendix A: it advises against a buy box on the homepage. The draft keeps one, because the store has a single hero product and the live homepage already sells it directly. It uses the same component and the same preselection as the product page, which removes the inconsistency the appendix criticised.

## 10. Sources

Every URL, split into opened / failed / search-only, is listed in Appendix A §5 and Appendix B §6.
