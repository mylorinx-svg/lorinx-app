# LORINX premium redesign — UX, conversion, claims, prompting and performance research

Research date: 2026-11-17. Scope: lorinx-il.com (Shopify, Dawn 15.5.0, Hebrew RTL, mobile-first, Meta-ads traffic).

## How to read this file

Every finding carries one of these labels:

- **[VF]** Verified fact: I read it on the page at the cited URL during this session.
- **[SR]** Search-result only: taken from a search snippet; the page itself was not opened. Treat numbers as unconfirmed.
- **[LIVE]** Observed in the HTML of lorinx-il.com fetched on 2026-11-17 (home page and the cupping-device product page, mobile user agent). Server HTML only; nothing was rendered in a browser.
- **[PR]** Professional recommendation: my own judgment, not a quoted source.

"REQ" lines are implementation requirements for the Dawn-based Hebrew RTL store. Statements about Dawn's built-in settings are from my working knowledge of Dawn 15; the Dawn repository could not be opened in this session, so confirm each setting in the theme editor.

Two things to know before using this file:

1. The brand rules for LORINX currently include "do not change the product page". Every product-page REQ below is therefore a proposal that needs the owner's explicit approval before anyone implements it.
2. Section 3 is not legal advice. The Israeli sources were reachable only through search snippets. Have an Israeli lawyer confirm the claims wording and the review display before launch.

---

## 0. Baseline: what the live site does today [LIVE]

These observations anchor the requirements that follow.

| # | Observation | Why it matters |
|---|---|---|
| L1 | Theme is Dawn 15.5.0; the home page and product page are built mostly from custom Liquid sections (`custom_liquid`, a `lorinx` section) with inline styles. | Dawn's own gallery, price, cart and image helpers are bypassed, so their accessibility and performance behaviour is lost. |
| L2 | `<html lang="he-IL">` has no `dir` attribute. `dir="rtl"` is set on inner wrappers (`<div class="lx" dir="rtl">`). | Header, cart drawer, checkout links and app widgets outside those wrappers do not inherit RTL from the document. |
| L3 | Product images are plain `<img src="…&width=1200">` tags: no `width`/`height`, no `srcset`/`sizes`, no `fetchpriority`, no `loading`. The home hero is `ChatGPT_Image_1.png` requested with no width parameter. | Likely LCP and CLS cost; phones download a 1200px (or full-size PNG) file. |
| L4 | Gallery thumbnails swap the main image with an inline `onclick`. There is no swipe, zoom or lightbox markup in the server HTML. | Baymard finding F4 and F5 below. |
| L5 | Fonts: Google Fonts stylesheet requests for Heebo (7 weights), Frank Ruhl Libre and Arimo, plus two preloaded Assistant files from the Shopify CDN. | Four families, third-party connection, and preloads for a family that may not be the visible one. |
| L6 | Product page has `ProductGroup` JSON-LD. The home page has no JSON-LD at all. No `hreflang` links (single language). Canonical is present. | Organization/WebSite schema is missing. |
| L7 | H1 is "כוס רוח חשמלית להפחתת כאבים מבית — ™LORINX" ("for reducing pain"). Copy also says heat "shortens recovery time", red light "helps calm the area", and the FAQ recommends the device "especially for people with back, neck and shoulder pain". | Medical-style claims; see section 3. |
| L8 | Reviews are hard-coded in the template: "4.9 · 46+ ביקורות מאומתות" and three quotes marked "ביקורת מאומתת", one of which says "I suffered from lower-back pain for years". No review-app markup was found. | A "verified" label needs a verifiable source; a pain testimonial is a health claim made through a customer. |
| L9 | The page shows ₪237.33 for one unit; bundle rows show ₪474.66 → ₪379.90 ("20% הנחה", "₪189.95 ליחידה", badge "הנמכר ביותר") and ₪711.99 → ₪499.90 ("30% הנחה", "₪166.63 ליחידה"). The brand sheet says the single price is ₪237.90. | Price mismatch between the page and the brand's own source of truth; the reference prices are multiples of the on-page single price. |
| L10 | Next to the CTA: "תשלום מאובטח SSL · משלוח חינם · אחריות לשנה", then "14 יום להחזרה מרגע קבלת המוצר, בלי סיבה ובלי דמי ביטול". The FAQ states 7–14 business days. | Good placement already; keep and tighten. |
| L11 | No element with a sticky class was found on the product page; a second CTA ("הוסף להזמנה · ₪237.33") sits at the page bottom. Cart-drawer markup is present. | Confirm on a real phone whether any add-to-cart control stays visible while scrolling. |
| L12 | 53 `<script>` tags on the page, 18 with `src` (14 deferred), 6 stylesheets, one app extension (`sense-apps-rtl`). | Input for the INP and script audit in section 5. |

---

## 1. E-commerce UX findings (Baymard, NN/g, Shopify)

### 1.1 Product-page usability

**F1. Most product pages underperform, mobile more than desktop.** [VF] Baymard's 2026 benchmark: 52% of desktop, 62% of mobile and 64% of app product pages are "mediocre or worse".
Source: https://baymard.com/blog/current-state-ecommerce-product-page-ux
REQ: Treat the product page as the primary landing surface for Meta traffic and design it at 360–390px first. Desktop is an adaptation.

**F2. Users start with the images.** [VF] In Baymard's product-page study, 56% of test subjects' first action on a new product page was to explore the images, before the title or description.
Source: https://baymard.com/blog/in-scale-product-images
REQ: The gallery is the first block on mobile. The first image must show the device clearly on its own; images 2–4 carry the argument (in use, scale, what is in the box).

**F3. Must-have product-page components.** [VF] NN/g lists as the minimum: descriptive product name, recognizable images, price including product-specific charges, clear options and a way to select them, a clear way to add to cart with clear feedback, and a concise informative description. Nice-to-have: ratings and reviews filterable by rating, extra images, zoom, related products.
Source: https://www.nngroup.com/articles/ecommerce-product-pages/
REQ: Order on mobile: gallery → rating summary → product name → price → quantity offer → CTA → shipping/returns/warranty line → benefits. Nothing else between the name and the CTA.

**F4. Descriptions must answer questions and get to the point.** [VF] NN/g: users "are not looking for marketing fluff"; they skim; terms users may not know must be explained. Fully described products made users confident and less worried about returns.
Sources: https://www.nngroup.com/articles/ecommerce-product-pages/ , https://www.nngroup.com/articles/product-descriptions/
REQ: Explain in one plain sentence each: what electric cupping is, what the heat does to how it feels, what "12 levels" means in practice, session length (15 minutes, auto shut-off), battery and charging, what is in the box, who should not use it.

**F5. Collapsed sections help overview.** [VF] Baymard guideline: long uncollapsed sections make it hard to get an overview; if collapsed sections are used, use the same layout for all and clear titles.
Source: https://baymard.com/blog/ecommerce-ux-best-practices
REQ: Use Dawn's collapsible-row blocks for "מה בקופסה", "מפרט טכני", "משלוח והחזרות", "אחריות", "הוראות בטיחות". Keep the top benefits and the offer uncollapsed.

### 1.2 Image gallery

**F6. Provide at least 3–5 images, plus video for complicated products.** [VF] Baymard guidelines #740 and #759.
Source: https://baymard.com/blog/ecommerce-ux-best-practices
REQ: Minimum set of 6: (1) clean product shot, (2) in use on back/shoulder with a person, (3) in hand for scale, (4) what is in the box, (5) controls/display close-up with Hebrew captions as HTML text, (6) short silent looping video of a session. Hebrew text is overlaid in HTML/CSS, never baked into the image (brand rule).

**F7. "In scale" images.** [VF] 42% of users try to judge product size from images; without an in-scale image they draw wrong conclusions and sometimes discard suitable products. 28% of 60 top sites lacked one (2017 article); the 2026 article reports 37%. Show the product in its use environment or next to an object of known size.
Sources: https://baymard.com/blog/in-scale-product-images , https://baymard.com/blog/current-state-ecommerce-product-page-ux
REQ: One image of the device held in an adult hand and one of it placed on the upper back. Add the diameter and weight as a caption under the gallery.

**F8. Human-model / lifestyle image.** [VF] Baymard 2026 best practice 3: "Provide a 'Human Model' image (23% don't)". Shopify's product-page guide also recommends lifestyle photos showing size, setting and use.
Sources: https://baymard.com/blog/current-state-ecommerce-product-page-ux , https://www.shopify.com/blog/product-page
REQ: Lifestyle images show real-looking people in natural light at home. No stock look. Do not show cupping marks presented as a "result", and no before/after pairs (section 3).

**F9. Mobile: swipe is the primary behaviour; thumbnails are optional.** [VF] 94% of desktop sites and 34% of mobile sites use thumbnails. On mobile, most users swipe: 78% of participants on one test site swiped through all gallery images without thumbnails. If thumbnails are used on mobile, a truncated strip needs a clear truncation indicator. Swipe must be supported.
Source: https://baymard.com/blog/always-use-thumbnails-additional-images
REQ: Mobile gallery is a native horizontal scroll-snap slider with a visible "1/6" counter and a peek of the next slide. In RTL the first slide is at the right and swiping left-to-right advances; test this on iOS Safari and Android Chrome. Desktop uses thumbnails. Replace the current `onclick` image swap (L4).

**F10. Pinch and double-tap zoom.** [VF] Baymard's benchmark of 50 mobile sites: 40% did not support pinch or tap zoom; users try these gestures even when close-up images exist. Low-resolution images make zoom useless. Only half of supporting sites tell users zoom exists; a hint that fades is fine. Non-native English speakers did not all understand the word "pinch"; use an icon or "double-tap".
Source: https://baymard.com/blog/mobile-image-gestures
REQ: Tap opens a full-screen lightbox that supports pinch and double-tap; load a ≥2000px source inside the lightbox only. Show a small magnifier icon on the first slide. Shopify's guide recommends 2048×2048 source images [VF, https://www.shopify.com/blog/product-page].

**F11. Carousels must not auto-rotate on mobile.** [VF] 52% of mobile sites have an auto-rotating home carousel; participants went on unintended detours. Better: static sections.
Source: https://baymard.com/blog/ecommerce-ux-best-practices
REQ: No auto-advancing sliders anywhere (hero, reviews, gallery). Reviews and "how it works" are static stacked sections or user-driven sliders.

### 1.3 Variants and quantity/bundle selection

**F12. Expose options as buttons, not dropdowns.** [VF] Baymard: exposing button selectors makes variations easy to see; 57% of sites don't use buttons for size selection.
Source: https://baymard.com/blog/current-state-ecommerce-product-page-ux
REQ: The 1 / 2 / 3-unit choice is three full-width radio cards (real `<input type="radio">` inside a `<fieldset>` with a Hebrew `<legend>`), each ≥48px tall, selected state shown by border and a check mark, not colour alone.

**F13. Information must be consistent across variants.** [VF] NN/g: shoppers expected the same information for every variation and were frustrated when only one size carried a useful detail.
Source: https://www.nngroup.com/articles/ecommerce-product-pages/
REQ: Every offer card shows the same four items in the same order: quantity, total price, price per unit, what you save versus buying singly.

**F14. Show price per unit when the same product is sold in different quantities.** [VF] Baymard: 86% of sites (list-item benchmark; 81% in the 2026 product-page article, 62% in the 2025 sales article) do not show it; users then cannot tell which option is the better value and some abandon. Total price should stand out; the unit price should be findable without dominating.
Sources: https://baymard.com/blog/price-per-unit , https://baymard.com/blog/current-state-ecommerce-product-page-ux , https://baymard.com/blog/10-sales-ux-best-practices
REQ: Each card: total in the large weight, "₪X ליחידה" in a smaller secondary style directly under it. Compute in Liquid from the variant or discounted line price; do not hard-code. Shopify's built-in unit pricing (`variant.unit_price_measurement`) is for measured goods such as weight or volume [VF, https://shopify.dev/docs/storefronts/themes/pricing-payments/unit-pricing], so the per-device figure needs custom Liquid.

**F15. Multi-item promotions are noticed when placed next to price and quantity, and must be reflected in the cart.** [SR] NN/g "Communicating Ecommerce Discounts" (page opened for headings only; this detail came from a search snippet): promotions near the price and quantity selectors were more likely to be noticed; when users do not see the discount in the cart they may abandon. [VF] The article's guidelines include "Remind users of multi-item discounts" and "Display (and apply) discounts for qualifying purchases".
Source: https://www.nngroup.com/articles/communicating-discounts/
REQ: The offer selector sits directly under the price. If a shopper adds one unit, the cart drawer shows one quiet line: "הוסיפו יחידה שנייה — ₪189.95 ליחידה" with a one-tap upgrade. The cart line shows the multi-unit price already applied.

**F16. Quantity steppers.** [VF] Baymard checkout 2026: plain text quantity fields cause errors (typing "2" produced "21"); use buttons or buttons plus a text field.
Source: https://baymard.com/blog/current-state-of-checkout-ux
REQ: Cart drawer uses − / + buttons with ≥44px targets. In RTL keep "−" and "+" in the order Dawn renders for RTL and test that "+" increases.

### 1.4 Price presentation

**F17. Price must include product-specific charges and be shown with the purchase controls.** [VF] NN/g must-have list; Shopify: show the current price next to the title and purchase button, show the original price next to the sale price, state which variant qualifies and whether a code is needed.
Sources: https://www.nngroup.com/articles/ecommerce-product-pages/ , https://www.shopify.com/blog/product-page
REQ: One price block. No discount code is needed for bundles; say so implicitly by showing the final price. Prices are final consumer prices in ₪.

**F18. Users want the total order cost near the buy section.** [VF] Baymard: 67% of sites don't provide it; the lowest full order cost should be shown on the product page by default. 12% of US shoppers abandoned because they couldn't see or calculate total cost up front; 40% because extra costs were too high.
Sources: https://baymard.com/blog/current-state-ecommerce-product-page-ux , https://baymard.com/lists/cart-abandonment-rate
REQ: Directly under the CTA: "המחיר כולל משלוח. אין תוספות בקופה." The CTA itself repeats the total for the selected offer ("הוספה לסל · ₪379.90").

**F19. Strikethrough/reference prices.** [VF] Shopify describes showing a compare price with strikethrough and the saving as a common tactic and, in the same article, asks merchants to check "Are you being transparent?". [PR] A reference price is honest only when it is a price the shopper could really pay.
Source: https://www.shopify.com/blog/psychological-pricing
REQ: The only reference price allowed is "N × the current single-unit price" on the 2- and 3-unit cards, labelled in words ("במקום ₪475.80 בקנייה נפרדת"). No compare-at price on the single unit unless that higher price was genuinely charged recently. Fix the ₪237.33 vs ₪237.90 mismatch (L9) so the arithmetic on the cards is exact.

**F20. Promo-code field.** [VF] Baymard: 70% of sites have a promo field; most users pause at it and some leave to hunt for codes; 35% of sites with the field show it open by default; hide it behind a link and apply discounts automatically (83% of sites don't auto-apply). NN/g, by contrast, recommends a clear coupon field in cart and checkout for users who hold a code.
Sources: https://baymard.com/blog/checkout-flow-average-form-fields , https://baymard.com/blog/10-sales-ux-best-practices , https://www.nngroup.com/articles/applying-discounts/
REQ: Bundle pricing is applied automatically (variant price or automatic discount). No discount-code input in the cart drawer. The checkout's own field stays as Shopify renders it. Never advertise a code on the product page.

### 1.5 Shipping, returns and warranty placement

**F21. Shipping cost is looked for on the product page.** [VF] 64% of users looked for shipping cost on the product page before adding to cart; 43% of sites showed none.
Source: https://baymard.com/blog/show-shipping-costs-on-product-pages
**F22. "Free shipping" in a banner alone is missed.** [VF] 32% of sites show free shipping only in a site-wide banner; as many as 27% of test subjects missed it. Place it near, but not inside, the buy section, because buy sections get bloated (56% of sites). 11% of sites used conflicting free-shipping text.
Source: https://baymard.com/blog/avoid-banners-only-free-shipping
REQ (F21–F22): Keep the announcement bar, and repeat a three-item line directly below the CTA: "משלוח חינם · 14 יום להחזרה · אחריות לשנה". Each item opens the matching collapsible row. The free-shipping statement has no conditions hidden elsewhere.

**F23. Give a delivery date, not a speed.** [VF] 41% of benchmarked sites gave no delivery date; users read a stated date as a promise, so it must be accurate and account for handling, holidays and customs. 20% of US shoppers abandoned because delivery was too slow.
Sources: https://baymard.com/blog/shipping-speed-vs-delivery-date , https://baymard.com/lists/cart-abandonment-rate
REQ: Show a computed date range under the CTA: "מגיע אליכם בין DD.MM ל-DD.MM" calculated as today + 7 and + 14 business days, skipping Friday, Saturday and Israeli holidays from a maintained list. Render it server-side in Liquid with a JS refinement, and use the wide range rather than an optimistic one. 7–14 business days is slow for this market, so state it plainly before the click and again in the cart; hiding it only moves the disappointment to after purchase.

**F24. Return policy on the product page.** [VF] 60% of users look for the return policy on the product page (1,032 respondents); 44% of sites don't display or link it there; 13–15% of shoppers report abandoning over an unsatisfactory return policy.
Sources: https://baymard.com/blog/current-state-ecommerce-product-page-ux , https://baymard.com/lists/cart-abandonment-rate
**F25. Return policies must be readable.** [VF] Summary, headers, plain language; if returns are free, say the company pays return shipping.
Source: https://baymard.com/blog/ecommerce-ux-best-practices
REQ (F24–F25): A three-bullet returns summary in the collapsible row: the window, who pays return shipping, how to start a return (WhatsApp or email). Link to the full policy. The summary must match the legal policy word for word in substance.

**F26. Footer links.** [VF] A subgroup of users goes straight to the footer for shipping and returns; 20% of sites lack direct links; a generic "Help" link is not enough. Include an "FAQ" link titled exactly that.
Sources: https://baymard.com/blog/footer-needs-return-shipping-links , https://baymard.com/blog/ecommerce-ux-best-practices
REQ: Footer has separate links: "משלוחים", "ביטולים והחזרות", "אחריות", "שאלות נפוצות", "צור קשר". The site already has most of these (L10); add "אחריות" and "שאלות נפוצות" as their own links.

### 1.6 Trust signals

**F27. Four credibility factors.** [VF] NN/g: design quality, upfront disclosure, comprehensive/correct/current content, and connection to the rest of the web (people trust external reviews more than on-site testimonials).
Source: https://www.nngroup.com/articles/trustworthy-design/
REQ: (a) Zero layout bugs at 360px. (b) Prices, delivery time and contact details visible without hunting. (c) An "אודות" page with the owner's first name, a business identifier, email and response hours. (d) Link out to at least one external review or social profile that the store does not control.

**F28. Perceived payment security.** [VF] 19% of users abandoned a checkout in the last three months because they did not trust the site with card data (1,026 respondents, 2025). Visual reinforcement of the card fields raises confidence. Layout quirks erode trust.
Source: https://baymard.com/blog/perceived-security-of-payment-form
REQ: One row of real payment-method marks under the CTA (only methods the checkout actually offers), rendered as inline SVG with fixed dimensions. No invented "certified" seals. The current payment icons are injected by an app from `sense-apps.com` (L3); replace them with theme-rendered icons to avoid layout shift.

**F29. Policy badges and security badges.** [VF] Shopify lists five badge types; policy badges (free shipping, returns, warranty) are claims the business makes about itself and need no third party; payment badges also inform about accepted methods.
Source: https://www.shopify.com/blog/trust-badges
REQ: Three text-plus-icon policy items in the brand's line-icon style. No coloured boxes, no badge clusters (brand rule).

**F30. Unprompted live-chat overlays and sticky chat elements hurt on mobile.** [VF] Baymard guideline #940.
Source: https://baymard.com/blog/ecommerce-ux-best-practices
REQ: No auto-opening chat. A "דברו איתנו בוואטסאפ" text link in the FAQ block and footer. If a floating WhatsApp button is kept, it must never overlap the sticky add-to-cart bar.

### 1.7 Reviews

**F31. Reviews are used by almost everyone.** [VF] 95% of users relied on reviews in Baymard's product-page testing. Users relied on the ratings distribution more than on individual review text; 43% of 60 top sites lacked a distribution summary. An average plus a count does not replace the distribution. The summary should be graphical, clickable as a filter, and omitted when there are very few reviews.
Source: https://baymard.com/blog/user-ratings-distribution-summary
**F32. People look for the negative reviews.** [VF] 53% of users seek out negative reviews; 37% factor a site's reply positively; 87% of sites don't reply. NN/g observes the same behaviour and asks for reviewer details (use case, relevant attributes).
Sources: https://baymard.com/blog/respond-to-negative-user-reviews , https://www.nngroup.com/articles/ecommerce-product-pages/
**F33. Review photos.** [VF] 34% of sites don't allow image upload; users judge customer images as more objective than site photos; 63% of sites (2026) don't let users browse across reviewer images.
Sources: https://baymard.com/research-articles/allow-reviewers-to-upload-images , https://baymard.com/blog/current-state-ecommerce-product-page-ux
**F34. Small numbers can backfire.** [VF] NN/g: the main risk of social proof is the perception that too few people approve; a participant dismissed an article with a share count she found unimpressive.
Source: https://www.nngroup.com/articles/social-proof-ux/
REQ (F31–F34):
- Replace the hard-coded review block (L8) with a real review app that collects reviews by post-purchase email and marks verified buyers. Free tiers exist; the brand rule is free tools only.
- Show the star average and count under the product name only when backed by that app's data. With 46 reviews, show the number honestly; do not round up or add "+".
- Reviews section: distribution bars, filter by stars, photos first, owner replies visible on every review of 3 stars or fewer.
- Each review shows first name, use case tag ("עבודה משרדית", "אחרי אימון") and date.
- Until real reviews exist in the app, show no star rating at all. A page with no rating is weaker than one with a real rating and far safer than one with an unverifiable rating.

### 1.8 Cart and cart drawer

**F35. Add-to-cart feedback must be obvious.** [VF] NN/g: a single line of text under the button was "too subtle a change on the page".
Source: https://www.nngroup.com/articles/e-commerce-usability/
**F36. The confirmation must offer clear next paths.** [SR] Baymard (search snippet): unclear paths in the "added to cart" confirmation made participants struggle; an overlay works when it shows the added item and key order details.
Source: https://baymard.com/ecommerce-design-examples/added-to-cart-confirmation
**F37. Keep a full cart available.** [VF] NN/g: minicarts show few items and make editing secondary; users use a full cart page to review, compare and adjust. List name, options and a clear image; link items back to the product; allow easy removal including quantity zero.
Source: https://www.nngroup.com/articles/shopping-cart/
REQ (F35–F37): Use Dawn's cart drawer (theme setting: cart type = drawer). It opens from the left edge in RTL. Contents top to bottom: confirmation line, line item (image, name, "2 יחידות", price with the bundle saving shown), stepper, remove, the delivery date range, "משלוח חינם", subtotal, one primary button "לתשלום מאובטח", one text link "המשך קנייה". Keep `/cart` working as a full page. No upsell carousel above the checkout button.

**F38. Emphasise the cart link in the header.** [VF] Baymard guideline #607.
Source: https://baymard.com/blog/ecommerce-ux-best-practices
REQ: Cart icon with a numeric count bubble; in RTL it sits at the left end of the header.

### 1.9 Checkout friction

**F39. Why carts are abandoned.** [VF] Average documented abandonment 70.22% across 50 studies. Reasons among US shoppers (excluding "just browsing"): extra costs 40%, slow delivery 20%, distrust with card data 19%, forced account 18%, long/complicated checkout 17%, errors 17%, returns policy 13%, couldn't see total 12%, card declined 10%, too few payment methods 9%.
Source: https://baymard.com/lists/cart-abandonment-rate
**F40. Form length.** [VF] An ideal flow can be 12–14 form elements (7–8 fields); the average US checkout shows 23.48 elements (14.88 fields).
Source: https://baymard.com/lists/cart-abandonment-rate
**F41. Guest checkout first; delay account creation.** [VF] Baymard: always offer guest checkout and make it the most prominent option; save account creation for the confirmation step.
Sources: https://baymard.com/blog/current-state-of-checkout-ux , https://baymard.com/blog/10-sales-ux-best-practices
**F42. Explain why the phone number is needed; mark required and optional fields.** [VF] Baymard checkout 2026 items 7 and 9.
Source: https://baymard.com/blog/current-state-of-checkout-ux
**F43. Third-party payment options.** [VF] 10% of users will leave if their preferred method isn't available.
Source: https://baymard.com/blog/10-sales-ux-best-practices
REQ (F39–F43): In Shopify admin: customer accounts optional; company name and address line 2 hidden or optional; phone required only if the courier needs it, with the note "לתיאום המשלוח בלבד"; marketing opt-in unchecked. Offer the wallets the payment provider supports plus card installments if available. Checkout language Hebrew with the store logo. Run one real test order on a phone after every change.

### 1.10 Mobile navigation and search

**F44. Hidden navigation is the least discoverable.** [VF] NN/g: the hamburger menu makes options least discoverable and suits browse-mostly content sites; if used, support navigation in other ways such as cross-links.
Source: https://www.nngroup.com/articles/mobile-navigation-patterns/
**F45. Sticky headers must be small, opaque and still.** [VF] NN/g: maximise content-to-chrome ratio; tap targets at least 1cm × 1cm; opaque background with contrast; minimal animation; consider a header that hides on scroll down and returns on scroll up.
Source: https://www.nngroup.com/articles/sticky-headers/
REQ (F44–F45): With four products, expose them directly: logo, cart, and a menu whose first level is the four product names. On the home page, show the four products as cards high on the page. Header height ≤56px on mobile, solid background; enable Dawn's "on scroll up" sticky header so it does not compete with the sticky add-to-cart bar.

**F46. Search.** [VF] Baymard: users fall back on search when browsing fails, so it must be easy to find; on mobile always provide a submit button next to the field; support symptom-style and feature queries.
Sources: https://baymard.com/blog/ecommerce-ux-best-practices , https://baymard.com/blog/mobile-ux-ecommerce
REQ: A four-product catalogue needs only a search icon in the header (Dawn predictive search). Make sure Hebrew queries people actually type resolve to a product: "כוסות רוח", "מסאז'", "גב תפוס", "עיסוי רגליים". Add these as product tags/synonyms in the Search & Discovery app. The empty-results page lists all four products.

### 1.11 Cross-sell

**F47. Recommendations help discovery but belong below the main information.** [VF] NN/g: related-product suggestions helped users find alternatives they had not thought of. Shopify: keep recommendations below the main product information so they don't distract from the primary purchase; complementary products can be set in the Search & Discovery app.
Sources: https://www.nngroup.com/articles/ecommerce-product-pages/ , https://www.shopify.com/blog/product-page
REQ: One "משלימים את השגרה" row after the reviews, maximum two products (for the cupping device: the massage gun and the thigh device). No cross-sell inside the buy box. In the cart drawer, at most one text-line suggestion below the checkout button. No discount on cross-sells.

### 1.12 Sticky add-to-cart

**F48. A sticky add-to-cart button needs white space and a unique style.** [VF] Baymard guideline #791: the primary button uses a style no other button uses; if sticky, surround it with white space; don't use a full-width button; avoid competing CTAs.
Source: https://baymard.com/blog/ecommerce-ux-best-practices
**F49. Keep a persistent add-to-cart on mobile.** [VF] Shopify's product-page guide: "Keep a persistent Add to Cart button visible as shoppers scroll"; its landing-page guide quotes agency practitioners recommending a sticky CTA that reinforces the offer with consistent button copy.
Sources: https://www.shopify.com/blog/product-page , https://www.shopify.com/blog/landing-page-design
REQ (F48–F49): Dawn has no built-in sticky add-to-cart; build a small custom element.
- Appears only after the main CTA scrolls out of view (IntersectionObserver), hides again when the main CTA or the footer is visible.
- Content: selected offer and total at the right (RTL start), button at the left; button is inset with side margins, not edge-to-edge.
- Height ≤64px plus `env(safe-area-inset-bottom)`; reserve the same space as bottom padding on `<main>` so it never covers content.
- It adds the selected offer directly; it does not scroll the user back up.
- Uses `transform`/`opacity` for the show/hide transition and respects `prefers-reduced-motion`.

---

## 2. DTC marketing and conversion findings

### 2.1 Premium positioning

**M1. Brand cues create trust on arrival.** [VF] Shopify's landing-page guide quotes Otherhalf Studio: brand (logo, typography, photography, palette) "signals trust super, super quickly", so the above-the-fold impact matters.
Source: https://www.shopify.com/blog/landing-page-design
**M2. Premium sites lean on restraint, and discounting erodes perceived value.** [SR] CXL "5 Critical Factors for Optimizing Luxury Ecommerce Sites" and several agency blogs (not opened): whitespace signals confidence; offer added value instead of price cuts; scarcity must be real. These are practitioner opinions, not measured results.
Sources: https://cxl.com/blog/optimizing-luxury-ecommerce/ , https://ecommercefastlane.com/premium-web-design-dtc-growth/
REQ (M1–M2): One typeface family for Hebrew body and UI, one optional display face for headlines; two neutrals plus one accent; generous vertical rhythm (section padding ≥56px mobile). Remove "עד 30% הנחה במארזים" from above the fold (L9) and from the announcement bar; the bundle value is shown inside the offer cards as price per unit. No countdown timers, no stock-scarcity counters, no pop-up discount wheels.

### 2.2 Value-proposition architecture

**M3. A value proposition is specific, pain-point focused and exclusive.** [VF] Shopify names these three elements and lists the common mistakes: meaningless words, showboating the business, promises you can't keep, inconsistency. It advises clarity before creativity and benefits over hype.
Source: https://www.shopify.com/blog/value-proposition
REQ: Write the proposition at four levels and keep them consistent:
1. Brand: home recovery tools that feel considered and are simple to use.
2. Product headline (H1): what it is, in plain words. Example: "כוס רוח חשמלית עם חימום".
3. Sub-headline: the experience, not a cure. Example: "15 דקות של שחרור והרפיה, בבית."
4. Three proof points directly under it: "12 דרגות עוצמה", "חימום מבוקר", "כיבוי אוטומטי אחרי 15 דקות".

### 2.3 Benefit-led copy

**M4. Sell the outcome, then support with features.** [VF] Shopify: "The consumer doesn't always care about the product… They care about the outcome… or the feeling"; founder-led brands tend to be too product-oriented. Its SEO description guide says lead with benefits, support with features, and keep descriptions scannable on mobile.
Sources: https://www.shopify.com/blog/landing-page-design , https://www.shopify.com/blog/product-description
**M5. But no fluff.** [VF] NN/g: users want a solid description of what the product is, how it is used and what it does.
Source: https://www.nngroup.com/articles/ecommerce-product-pages/
REQ (M4–M5): Each benefit block is "feeling → mechanism → spec". Example: "תחושת שחרור בכתפיים · שאיבה עדינה בשילוב חום · 12 דרגות, עד 15 דקות". Maximum 12 Hebrew words per line on mobile. Every outcome is phrased as a sensation or routine, never as a treatment result (section 3).

### 2.4 Product storytelling

**M6. Show the product in action with mixed media.** [VF] Shopify quotes practitioners favouring media-rich video over static assets and pairing outcome copy with imagery of a person using the product in daily life.
Source: https://www.shopify.com/blog/landing-page-design
**M7. Videos are skipped by many.** [VF] Baymard: a large group of users will not watch product videos, so video cannot be the only carrier of key information.
Source: https://baymard.com/blog/in-scale-product-images
REQ (M6–M7): A three-step "איך משתמשים" strip (place, choose level, 15 minutes) as images with HTML captions, plus one muted, captioned, user-started or lazy-loaded loop. Everything the video says also exists as text.

### 2.5 Objection handling

**M8. The objections are known and quantified.** [VF] From Baymard's abandonment reasons: extra costs, slow delivery, card trust, returns, unclear total (F39). [VF] NN/g: unanswered product questions block purchase; a common worry is having to return the item.
Sources: https://baymard.com/lists/cart-abandonment-rate , https://www.nngroup.com/articles/ecommerce-product-pages/
REQ: Answer each objection where it arises, not only in the FAQ.

| Objection | Where it is answered | Wording direction |
|---|---|---|
| Is the price final? | Under CTA | "המחיר כולל משלוח" |
| When does it arrive? | Under CTA, cart, order email | Date range, 7–14 business days |
| What if it doesn't suit me? | Under CTA + returns row | 14-day return summary |
| Is it safe / does it hurt? | "איך משתמשים" + safety row | Start at the lowest level; who should not use it |
| Will it leave marks? | FAQ | Honest: temporary marks are common with cupping; lower level and shorter time reduce them |
| Is this a real business? | Footer, About, FAQ | Named owner, Hebrew support, contact channel and hours |
| Is it noisy / complicated? | Benefit block | Plain spec statements |
| Why 2 or 3 units? | Offer cards | Use cases: two areas at once, one for home and one for a family member |

### 2.6 Offer framing and bundle economics (1 / 2 / 3 units)

Verified arithmetic from the brand's prices (single ₪237.90, two ₪379.90, three ₪499.90):

| Offer | Total | Per unit | Buying separately | Saving | Saving % |
|---|---|---|---|---|---|
| 1 unit | ₪237.90 | ₪237.90 | — | — | — |
| 2 units | ₪379.90 | ₪189.95 | ₪475.80 | ₪95.90 | 20.2% |
| 3 units | ₪499.90 | ₪166.63 | ₪713.70 | ₪213.80 | 30.0% |

**M9. Bundles raise order value and perceived value but can cost margin and disappoint.** [VF] Shopify lists the advantages (higher average order value, perceived value, simpler decisions) and disadvantages (lower per-item margin, limited choice, potential disappointment); it recommends showing total savings clearly.
Sources: https://www.shopify.com/blog/product-bundling , https://www.shopify.com/blog/psychological-pricing
**M10. Badge and default choices.** [SR] App-vendor blogs (not opened) suggest labelling the tier you want to sell, keeping the table to four rows or fewer, and showing the saving per tier. No independent evidence was found.
Source: https://ninety9.dev/blog/quantity-breaks-vs-volume-discounts.html
**M11. Transparency.** [VF] Shopify's ethics checklist for pricing: be transparent, don't test customer trust, consider vulnerable customers.
Source: https://www.shopify.com/blog/psychological-pricing
REQ (M9–M11): honest presentation rules.
- Pre-select **one unit**. [PR] A cold Meta visitor who is silently defaulted to ₪379.90 meets a surprise in the cart, and surprise totals are the top abandonment reason (F39). If the owner wants to test a 2-unit default, the CTA must show the total and the card must be visibly selected.
- Name cards by use, not by pressure: "יחידה אחת", "זוג — לשני אזורים במקביל", "שלישייה — לבית ולמשפחה".
- Show the saving in shekels first ("חוסכים ₪95.90"), percentage second or not at all. Round nothing upward.
- A "הנמכר ביותר" badge is allowed only if order data for the last 90 days shows that tier really is the most ordered. Otherwise use a neutral descriptor such as "הכי משתלם ליחידה" on the 3-unit card, which is arithmetically true.
- Same shipping and same warranty on every tier, stated once below the cards.
- The tiers must hold the same price in the cart, the checkout and the order email.
- No fake urgency attached to the bundles.

### 2.7 Social proof

**M12. Types and placement.** [VF] Shopify lists six types (crowd, user, celebrity, friends, certification, expert) and examples: reviews on the product page, verified-buyer labels, best-seller highlights, UGC. Its landing-page guide: real reviews are the most important; with a high review count, show stars and count above the fold; press mentions belong lower on the page.
Sources: https://www.shopify.com/blog/social-proof , https://www.shopify.com/blog/landing-page-design
**M13. Social-media visuals on the product page.** [VF] Baymard: 60% of sites don't add them; users wanted to see real people using the product; every image in such a carousel must contain the product being viewed.
Source: https://baymard.com/blog/10-sales-ux-best-practices
REQ (M12–M13): Order of proof on the product page: rating summary near the name (when real), two short review excerpts after the benefits, a UGC photo row (with permission from each customer), the full reviews section. No celebrity or expert endorsement unless documented. No "as seen in" logos unless true.

### 2.8 Trust architecture

**M14. Put shipping, returns and payment cues close to the purchase button.** [VF] Shopify's product-page guide, citing Baymard's abandonment data; it also reports that Audio Advice put shipping and return policies, stock status and technical details in clear view and, after its Shopify migration and redesign, reported a 47% year-over-year increase in conversion rate (one merchant's self-reported result from a combined migration and redesign, so it does not isolate the effect of policy placement).
Source: https://www.shopify.com/blog/product-page
REQ: Trust appears in four layers: (1) arrival: clean design, Hebrew typography, real photos; (2) decision: policies line under the CTA; (3) verification: reviews, About page, external profile; (4) commitment: secure-checkout wording on the button, consistent totals, an order-confirmation email that repeats the delivery window.

### 2.9 CTA placement

**M15. One page, one action.** [VF] Shopify: "The page should be driving one specific thing"; the offer should be reinforced throughout; CTA copy should be identical in every instance.
Source: https://www.shopify.com/blog/landing-page-design
REQ: One CTA label everywhere: "הוספה לסל · ₪{total}". Placements: buy box, sticky bar, after "how it works", after reviews, page end. "Buy now" dynamic checkout buttons are hidden on the product page so the bundle choice and cart confirmation are not skipped. Secondary links are text links.

### 2.10 Landing-page structure for paid-social traffic

**M16. Message match.** [SR] Practitioner sources (not opened) say the first screen should continue the ad's promise and that paid-social traffic is mostly mobile; the specific uplift percentages quoted in those snippets are vendor claims and are not used here.
Sources: https://www.webtonic.io/blog/message-match , https://winninghunter.com/blog/landing-page-teardown-above-the-fold
**M17. Meta reviews the landing page as part of the ad.** [SR] Meta's ad standards (not opened): ads for health or appearance products can't imply or try to generate negative self-perception, and can't assert a viewer's personal attributes such as health conditions; secondary guides say the landing page is reviewed with the ad.
Sources: https://transparency.meta.com/policies/ad-standards/objectionable-content/personal-health-and-appearance , https://transparency.meta.com/policies/ad-standards/restricted-goods-services/health-wellness
REQ (M16–M17): Ads link to the product page, not the home page. Section order for the cupping-device page:

1. Gallery (first slide matches the ad's hero visual)
2. Rating line (if real) · H1 · sub-headline
3. Price · offer cards · CTA · policies line · delivery date
4. Three benefit blocks (feeling → mechanism → spec)
5. How to use, in three steps, with the safety note
6. Two review excerpts + UGC row
7. What is in the box + specs (collapsed)
8. Comparison with manual cups (table of factual attributes only)
9. FAQ (objections table in 2.5)
10. Full reviews
11. Complementary products
12. Final CTA with the policies line

Keep one variant of headline and first image per ad angle using Shopify's alternate product templates or URL parameters, so the page headline repeats the ad's wording. Page copy never addresses the visitor's condition ("סובלים מכאבי גב?"); it describes the product and the routine.

### 2.11 Mobile conversion

**M18. Design for thumbs and speed.** [VF] Shopify: size controls for tapping, keep a persistent add-to-cart, serve responsive images, keep key actions in thumb reach, limit heavy scripts, test on a physical phone.
Source: https://www.shopify.com/blog/product-page
REQ: Body text ≥16px, line-height ≥1.5 for Hebrew; tap targets ≥44×44px with ≥8px spacing; no horizontal scroll at 360px; inputs at 16px to prevent iOS zoom; test inside the Instagram and Facebook in-app browsers, where the viewport and bottom bar differ from Safari.

---

## 3. Wellness-claims guardrails

### 3.1 What the sources say

**C1. US FDA general-wellness policy (benchmark, not Israeli law).** [SR] The guidance "General Wellness: Policy for Low Risk Devices" lists "relaxation or stress management" among general-wellness categories; a claim to promote relaxation or manage stress is the example. Claims to treat or diagnose a condition fall outside it. The 2015 draft tied the relaxation example to having no reference to a disease or condition. The product must also be low risk (not invasive). One secondary source says FDA updated the guidance in January 2026; unverified.
Sources: https://innolitics.com/articles/fda-guidance-general-wellness-policy-for-low-risk-devices/ , https://btlaw.com/insights/alerts/2016/food-drug-and-device-law-fda-finalizes-guidance-on-general-wellness-devices-will-not-regulate
**C2. US FTC Health Products Compliance Guidance (Dec 2022).** [SR] Health-related claims need "competent and reliable scientific evidence", generally randomized controlled human trials; this applies to implied claims as well as express ones, even when no disease is named; testimonials cannot carry a claim the advertiser could not substantiate itself; traditional use is not an exception. It is business guidance without the force of law.
Sources: https://www.cov.com/en/news-and-insights/insights/2023/01/ftc-issues-new-guidance-on-health-related-claims-to-replace-the-dietary-supplements-advertising-guide , https://natlawreview.com/article/after-almost-25-years-ftc-issues-new-health-products-compliance-guidance
**C3. Israel: Ministry of Health and consumer protection.** [SR] A Ministry of Health committee ("הוועדה לבדיקת הטעיית הציבור") handles complaints about advertising of health products, medical technologies and accessories that have no approved medical indication, and backs the Consumer Protection Authority. The Medical Equipment Law, 5772-2012, defines "advertising" of medical equipment broadly (oral, written or any other form aimed at the public). No source specific to massage devices was found.
Sources: https://www.gov.il/he/departments/units/committee-deception , https://www.gov.il/he/service/complaint_mislead_medical_advertisement , https://fs.knesset.gov.il/18/law/18_lsr_300799.pdf
**C4. Israel: distance selling.** [SR] Secondary sources describe a right to cancel a distance purchase within 14 days of receiving the product or the disclosure document (whichever is later), a cancellation fee capped at 5% of the transaction or ₪100 (the lower), refund within 14 days, and a four-month period for people with disabilities, people aged 65+ and new immigrants. The Consumer Protection Law prohibits misleading consumers about a product's characteristics or the terms of a transaction. Nothing was found on rules for reference ("was") prices.
Sources: https://mondaq.com/consumer-law/626544/consumer-protection-law-prescribes-a-general-arrangement-for-canceling-transactions , https://magazine.esra.org.il/posts/entry/senior-citizen-s-guide-to-cancellation-of-a-remote-sales-transaction.html
**C5. Meta ad policy.** [SR] See M17.

[PR] Working conclusion: describe sensations, comfort and routine. Do not name diseases, symptoms, injuries or body-system effects. Do not let a testimonial, an image, a product name, an alt text or a meta description say what the page copy is not allowed to say. The store sells a comfort device, so it must not present itself as registered medical equipment (אמ"ר) unless it actually holds that registration.

### 3.2 Say this / not that

| Topic | Say this (English) | אפשר לומר | Not that (English) | לא לומר |
|---|---|---|---|---|
| Product name / H1 | Electric cupping device with heat | כוס רוח חשמלית עם חימום | Cupping device for pain reduction | כוס רוח חשמלית להפחתת כאבים |
| Core benefit | A feeling of release and relaxation | תחושת שחרור והרפיה | Relieves / treats / reduces pain | מקל / מטפל / מפחית כאבים |
| Muscles | For muscles that feel tight after a long day | לשרירים שמרגישים תפוסים אחרי יום ארוך | Releases muscle spasms; treats strains | משחרר התכווצויות; מטפל במתיחות |
| Back and neck | Comfortable to use on the back, shoulders and thighs | נוח לשימוש על הגב, הכתפיים והירכיים | For back pain, herniated disc, sciatica | לכאבי גב, פריצת דיסק, סיאטיקה |
| Heat | Controlled warmth that feels soothing | חום מבוקר ונעים | Heat that heals / reduces inflammation | חום שמרפא / מפחית דלקת |
| Red light | Soft red light as part of the experience | אור אדום רך כחלק מהחוויה | Red-light therapy that repairs tissue or calms the area | טיפול באור אדום שמשקם רקמות / מרגיע את האזור |
| Circulation | (say nothing) | — | Improves blood flow; removes toxins; lymphatic drainage | משפר זרימת דם; מנקה רעלים; ניקוז לימפתי |
| Recovery | Part of your wind-down after training | חלק משגרת ההתאוששות שלכם אחרי אימון | Speeds recovery; shortens healing time | מזרז החלמה; מקצר את זמן ההחלמה |
| Results timing | Many people enjoy it from the first session | רבים נהנים כבר מהשימוש הראשון | Results within X days; pain gone in a week | תוצאות תוך X ימים; הכאב נעלם תוך שבוע |
| Audience | For people who sit all day, stand on shifts, or train | למי שיושב כל היום, עומד במשמרות או מתאמן | For people who suffer from back, neck and shoulder pain | לאנשים שסובלים מכאבי גב, צוואר וכתפיים |
| Alternative to care | A home routine | שגרה ביתית | Instead of physiotherapy / a clinic visit | במקום פיזיותרפיה / טיפול במרפאה |
| Safety | Start at the lowest level. Not for use on broken or irritated skin. | מתחילים בעוצמה הנמוכה. לא על עור פצוע או מגורה. | Completely safe; no side effects | בטוח לחלוטין; ללא תופעות לוואי |
| Marks | Temporary marks on the skin are common with cupping | סימנים זמניים על העור נפוצים בשימוש בכוסות רוח | Marks show toxins leaving the body | הסימנים מעידים על רעלים שיוצאים מהגוף |
| Testimonials | "It became my evening routine. Feels good on the shoulders." | "זה הפך לשגרת הערב שלי. מרגיש טוב על הכתפיים." | "I suffered from back pain for years and it's gone." | "סבלתי מכאבי גב שנים וזה נעלם." |
| Authority | Designed for simple home use | תוכנן לשימוש ביתי פשוט | Clinically proven; doctor recommended; medical grade | מוכח קלינית; מומלץ על ידי רופאים; ברמה רפואית |
| Ad hook | "15 minutes for yourself at the end of the day" | "15 דקות לעצמכם בסוף היום" | "Back pain? Stiff neck?" (addresses a condition) | "כאבי גב? צוואר תפוס?" |

### 3.3 Implementation requirements

- REQ C-a: Rewrite the live H1, the red-light and heat lines, the "especially recommended for people with pain" FAQ answer and the pain testimonial (L7, L8). The product title in Shopify admin feeds the `<title>`, the JSON-LD `name`, image alt text and the Meta catalogue, so change it there.
- REQ C-b: Keep and strengthen the existing contraindication text: pregnancy, pacemaker, clotting problems, heat sensitivity, damaged skin, face and front of neck. Add "במקרה של ספק, התייעצו עם רופא" and "המוצר אינו מכשיר רפואי ואינו מיועד לאבחון, טיפול או מניעה של מחלה". A disclaimer supplements compliant copy; it does not repair a medical claim made elsewhere on the page.
- REQ C-c: Review moderation rule: publish reviews unedited, but do not feature (in excerpts, ads or the above-the-fold area) any review that describes treating a medical condition. Reply to such reviews with a neutral thank-you; do not echo the claim. Medical questions from customers go to the owner as a draft (existing brand rule).
- REQ C-d: No before/after images, no images of bruising as proof, no anatomical diagrams of blood flow or toxins.
- REQ C-e: Run a claims lint before every publish: search theme files, product descriptions, metafields, alt texts and meta descriptions for כאב, מרפא, ריפוי, טיפול ב, דלקת, מחלה, רפואי, קליני, רעלים, זרימת דם, לימפ, פיזיותרפ, מוכח. Every hit needs a rewrite or a written justification. The word "טיפול" for a session ("טיפול של 15 דקות") is better replaced by "שימוש" or "סשן".
- REQ C-f: The returns text on the page ("14 days, no reason, no cancellation fee") is more generous than the statutory minimum described in C4; keep the legal policy page identical to that promise.

---

## 4. AI website-design prompting framework

### 4.1 Principles distilled from the sources

| # | Principle | Source and status |
|---|---|---|
| P1 | State design dimensions explicitly (typography, colour, motion, backgrounds); reference inspirations without prescribing; name the defaults you do not want. Without guidance the model falls back to generic white-and-purple layouts and over-used fonts. | [SR] Anthropic cookbook "Prompting for frontend aesthetics": https://platform.claude.com/cookbook/coding-prompting-for-frontend-aesthetics |
| P2 | Anthropic ships a `frontend-design` plugin/skill for Claude Code that the model applies to frontend work; its README points to the cookbook. | [SR] https://gitcode.com/2301_77165880/claude-code/tree/main/plugins/frontend-design (mirror; the GitHub original was not reachable) |
| P3 | Keep the generation prompt short and concrete: a company description, goals and a rough page outline; let the tool propose the sitemap, then edit. Build copy first, then style foundations. | [SR] Relume docs and community: https://www.relume.io/resources/docs/building-a-sitemap-with-ai , https://community.relume.io/best-practices-for-prompting-the-ai-site-builder-s4sRghHHTcXl |
| P4 | Name the page type and audience, list the sections in order, add tone, the key headline and the single action; refine by chat in steps; treat the first output as a draft. | [SR] Framer Wireframer guides: https://framer.com/wireframer , https://www.hxmzaehsan.com/blog/how-to-use-framer-wireframer-ai |
| P5 | If industry, tone, brand and features are not specified, the builder produces the statistical average. Build piece by piece, not in one shot. | [SR] https://yoast.com/prompting-guide-ai-website-builders/ , https://www.techradar.com/pro/website-building/how-to-write-ai-website-builder-prompts-like-a-high-end-design-agency |
| P6 | A design brief fixes goals, strategy and scope, including the number of unique pages and customisations; goal statements are the section most often done badly. | [SR] https://webflow.com/blog/design-briefs , https://www.lowcode.agency/blog/how-to-write-a-webflow-project-brief-for-your-agency |
| P7 | For agents editing an existing site, prompts name the exact target and the expected outcome. | [SR] https://webflow.com/blog/writing-prompts-webflow-mcp |
| P8 | Give the agent platform context at the right time. Shopify's AI Toolkit connects a coding agent (Claude Code is listed as supported) to current developer docs and API schemas and to code validation for Liquid templates and GraphQL, "rather than relying only on model memory or broad web search". | [VF] https://shopify.dev/docs/apps/build/devmcp |
| P9 | Every performance practice should answer: why it matters, how to implement, how to test that it worked. The same triple works for any design requirement. | [VF] https://shopify.dev/docs/storefronts/themes/best-practices/performance |

### 4.2 One spec template (fill in, then hand to the model section by section)

```
A. PROJECT FRAME
   A1. What this is: [page or component], for [store], on [platform + theme + version].
   A2. The single business goal and the single visitor action.
   A3. What already exists and must be kept (files, settings, apps, data sources).
   A4. What is out of scope and what needs the owner's approval before change.

B. BRAND CONTEXT
   B1. One-sentence positioning. Three adjectives the design must earn. Three it must avoid.
   B2. Voice: person, sentence length, banned words, example sentence in the target language.
   B3. Products, exact prices, policies (shipping, returns, warranty) with their source of truth.

C. AUDIENCE AND ENTRY
   C1. Who arrives, from which ad or query, on what device and browser (incl. in-app browsers).
   C2. What they already saw (ad promise) and what they need to learn in the first screen.
   C3. Their top five objections, each with the fact that answers it.

D. DESIGN DIRECTION
   D1. Typography: families, weights, sizes per breakpoint, line-height, Hebrew-specific notes.
   D2. Colour tokens: background, surface, text, muted text, accent, focus; contrast targets.
   D3. Spacing scale, radius, borders, shadow policy, icon style, image treatment and ratios.
   D4. References: two or three sites, with what to take from each. Not "copy this".
   D5. Defaults to avoid (name them): e.g. gradients, coloured boxes, emoji, stock imagery,
       centred everything, auto-rotating sliders, urgency timers.

E. INFORMATION HIERARCHY
   E1. Ordered list of sections with the job of each in one line.
   E2. What must be visible without scrolling at 360x640 and at 390x844.
   E3. The one primary CTA label and every place it appears.

F. SECTION SPECS (repeat per section)
   F1. Purpose and the question it answers.
   F2. Content: exact copy or copy rules, word limits, data bindings (Liquid objects, metafields).
   F3. Layout at mobile, tablet, desktop; RTL behaviour; what collapses.
   F4. States: default, selected, hover/focus, loading, empty, error, out of stock.
   F5. Merchant controls: which settings appear in the theme editor (schema).
   F6. Acceptance checks for this section.

G. INTERACTIONS AND MOTION
   G1. Each interaction: trigger, response, duration, easing, reduced-motion behaviour.
   G2. Sticky elements: when they appear, what they contain, what they must never cover.
   G3. Keyboard and screen-reader behaviour for each control.

H. RESPONSIVE AND RTL RULES
   H1. Breakpoints and what changes at each.
   H2. Logical CSS properties only; which elements are mirrored and which are not
       (numbers, prices, phone numbers, brand name in Latin).
   H3. Touch-target sizes, safe-area insets, font-size floor for inputs.

I. CONTENT AND ASSETS
   I1. Image list with ratio, subject, alt-text rule, max file weight.
   I2. Video list with length, captions, poster image.
   I3. Copy deck in the target language; claims wording rules; words that are banned.

J. TECHNICAL CONSTRAINTS
   J1. Platform rules (Liquid, sections, JSON templates, no new paid apps).
   J2. Performance budget: LCP, CLS, INP targets; JS and CSS weight; number of fonts.
   J3. SEO: title, meta description, headings, structured data, canonical, lang/dir.
   J4. Accessibility: contrast, focus order, labels, landmarks, motion.
   J5. Analytics events to keep firing (view_item, add_to_cart, begin_checkout, pixel).

K. QUALITY CRITERIA (how the output will be judged)
   K1. Checklist the model must self-verify and report, item by item, with evidence.
   K2. What "done" means: files changed, screenshots at stated sizes, test results.
   K3. Things that are an automatic fail (e.g. a medical claim, a hard-coded price,
       horizontal scroll at 360px, LCP image lazy-loaded).

L. ITERATION PROTOCOL
   L1. Work order: structure -> content -> visual system -> interactions -> performance.
   L2. After each step: render, screenshot mobile RTL, compare against K, list defects, fix.
   L3. One change set per section; describe what changed and why; keep a rollback path.
   L4. Stop and ask when: a price, policy or claim is unknown, or approval is required.
```

### 4.3 Requirements for using the template on LORINX [PR]

- Fill B3 from the brand's price sheet, never from memory or from the live page (L9 shows they differ).
- D5 for this brand: no full red, no coloured boxes, no cheap gradients, no stock look, no Hebrew text drawn inside images, restrained emoji.
- K3 must include the claims lint from REQ C-e and the review rule from F31–F34.
- Evaluate every iteration on a phone-sized RTL screenshot before looking at desktop.
- Give the model the verified Liquid patterns from section 5 verbatim, so it does not invent filter parameters.

---

## 5. Core Web Vitals, Shopify performance and technical SEO

### 5.1 Targets

**T1.** [SR] web.dev: "good" thresholds are LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1, each at the 75th percentile of real visits; INP replaced FID as a Core Web Vital in March 2024.
Source: https://web.dev/articles/defining-core-web-vitals-thresholds
**T2.** [VF] Shopify: LCP, CLS and INP are the Core Web Vitals and a Google ranking signal; TTFB on a storefront is mostly Liquid render time. Theme Store themes need an average Lighthouse performance score of at least 60 across home, product and collection pages.
Source: https://shopify.dev/docs/storefronts/themes/best-practices/performance
REQ: Budget for the product page on a mid-range Android over 4G: LCP ≤ 2.5s, CLS ≤ 0.1, INP ≤ 200ms, measured in the field (Shopify's web performance report or CrUX) and checked in the lab with mobile Lighthouse after each change.

### 5.2 LCP image handling in Liquid

**T3. Never lazy-load the LCP image; do not use JS lazy-loaders.** [VF] `loading="lazy"` or `data-src` libraries hide or deprioritise the image; a server-rendered `<img src>` is found by the preload scanner before CSS or JS run.
Source: https://shopify.dev/docs/storefronts/themes/best-practices/performance/never-lazy-load-lcp-image
**T4. `fetchpriority="high"` on exactly one image per page.** [VF] Use with `loading="eager"` or no loading attribute; it must be the real LCP element, visible in the initial viewport. Overuse can degrade performance.
Source: https://shopify.dev/docs/storefronts/themes/best-practices/performance/set-fetchpriority-high-on-lcp-image
**T5. `image_tag` defaults.** [VF] `image_tag` adds `width` and `height` from the image's dimensions and generates `srcset`. It applies `loading="eager"` for sections 1–3 and `lazy` for section 4 onward, and eager whenever `section.index` is nil (theme editor, static sections, Section Rendering API). When overriding, test the lazy case as a positive `section.index > 3` so nil falls through to eager.
Sources: https://shopify.dev/docs/api/liquid/filters/image_tag , https://shopify.dev/docs/storefronts/themes/best-practices/performance/never-lazy-load-lcp-image
**T6. Always give explicit `sizes` for images in the initial viewport.** [VF] JavaScript-computed sizes delay the download.
Source: same as T3.
**T7. Use `<img>`, not CSS backgrounds, for hero/LCP content.** [VF] Background images are discovered only after CSS downloads and parses. Position the `<img>` absolutely with `object-fit: cover`; do not give it a negative z-index.
Source: https://shopify.dev/docs/storefronts/themes/best-practices/performance/avoid-background-images-hero
**T8. Preload sparingly.** [VF] Reserve preload for one or two resources the browser discovers late. `image_tag: preload: true` sends a `Link: rel=preload` HTTP header with matching `imagesrcset` and `imagesizes`.
Sources: https://shopify.dev/docs/storefronts/themes/best-practices/performance , https://shopify.dev/docs/api/liquid/filters/image_tag
**T9. Don't hide the LCP image behind a fade-in; render essential content in Liquid, not JS.** [VF]
Source: https://shopify.dev/docs/storefronts/themes/best-practices/performance

REQ (T3–T9), verified pattern from shopify.dev adapted for the first product image:

```liquid
{%- comment -%} First gallery image on the product page: the LCP element {%- endcomment -%}
{{ product.featured_media.preview_image
  | image_url: width: 1200
  | image_tag:
    loading: 'eager',
    fetchpriority: 'high',
    widths: '400, 600, 800, 1000, 1200',
    sizes: '(min-width: 990px) 50vw, 100vw',
    alt: product.featured_media.alt
}}
{%- comment -%} Gallery images 2+ and everything below the fold {%- endcomment -%}
{{ media.preview_image
  | image_url: width: 1200
  | image_tag: loading: 'lazy', widths: '400, 600, 800, 1000, 1200',
    sizes: '(min-width: 990px) 50vw, 100vw'
}}
```

- Replace every hand-written `<img src="…&width=1200">` in the custom sections (L3) with `image_url | image_tag`, which restores `width`, `height` and `srcset`.
- The home hero currently loads a PNG with no width parameter (L3): serve it through `image_url` with `widths`, and upload a photographic JPEG source instead of a PNG where there is no transparency. Shopify's CDN picks the delivery format.
- Do not add `preload: true` to an image that already has a server-rendered `<img>` with `fetchpriority="high"` unless a Network-panel test shows a gain. [SR, third-party advice]
- In a slider, only slide 1 is eager; slides 2+ are lazy.
- The second image the user will see (slide 2) may stay lazy; the lightbox's 2000px source loads on open.

### 5.3 Fonts

**T10. Self-host fonts on the Shopify CDN instead of Google Fonts.** [VF] Avoids extra DNS and connection overhead. System fonts remove the delay entirely.
**T11. Reduce CLS from font swap with `size-adjust` and metric overrides on the fallback.** [VF]
**T12. Put base stylesheets and font preloads above `{{ content_for_header }}`.** [VF] With streamed responses, everything above it reaches the browser while Liquid still renders sections.
Source for T10–T12: https://shopify.dev/docs/storefronts/themes/best-practices/performance
**T13. `font_face` accepts `font_display`.** [VF] `{{ settings.type_header_font | font_face: font_display: 'swap' }}`; the docs' example output is for the Assistant family.
Source: https://shopify.dev/docs/api/liquid/filters/font_face
REQ (T10–T13):
- Reduce to two families at most, two or three weights each. The live page requests Heebo in seven weights, Frank Ruhl Libre and Arimo from Google, and preloads Assistant (L5).
- Preferred route: choose Hebrew-capable fonts from Shopify's font library in theme settings (Assistant and Heebo are candidates; confirm availability in the font picker) so `font_face` serves them from the store's CDN. Otherwise upload WOFF2 files to theme assets and write `@font-face` with `font-display: swap` and `unicode-range` for Hebrew and Latin.
- Remove the Google Fonts `<link>` tags. Preload only the one or two WOFF2 files used above the fold, and make sure the preloaded family is the one actually rendered.
- Define a fallback stack with a metric-adjusted local Hebrew font (`size-adjust`, `ascent-override`) to limit shift when the web font swaps in.

### 5.4 CLS

**T14.** [VF] Common causes: images without dimensions, late font swap, app-injected content. Always include `width`/`height` or use `image_tag`; reserve space for app blocks with `min-height`; keep dialogs from becoming the LCP element.
Source: https://shopify.dev/docs/storefronts/themes/best-practices/performance
REQ: Fixed `aspect-ratio` on the gallery container (1/1). Reserve height for the review widget, the delivery-date line and the payment icons. The sticky add-to-cart bar is `position: fixed` with pre-reserved bottom padding (F48). The announcement bar has a fixed height and no rotating text. No content is injected above existing content after load.

### 5.5 INP and JavaScript

**T15.** [VF] Audit and remove unused scripts including apps and pixels; `defer` non-critical scripts; load modules on interaction with dynamic `import()`; remove render-blocking apps; remove A/B anti-flicker snippets when no test runs; build the DOM of drawers and dialogs only when opened; reduce the number of stylesheets (each extra one triggers a style recalculation); animate with `transform` and `opacity`; debounce and use passive listeners; merge duplicate mobile and desktop menus.
Source: https://shopify.dev/docs/storefronts/themes/best-practices/performance
**T16.** [SR] web.dev: input delay comes mostly from long main-thread tasks, so INP work means breaking up long tasks and trimming JavaScript.
Source: https://web.dev/articles/optimize-inp
REQ: Inventory the 53 script tags (L12): keep theme JS, the Meta pixel and the review app; question everything else. Replace inline `onclick` handlers with one delegated, deferred listener. The offer selector updates price and CTA text with a few lines of JS and no network call. The cart drawer uses Dawn's Section Rendering API flow. No jQuery, no slider library; use CSS scroll-snap. Move inline `<style>` blocks from custom-Liquid sections into one stylesheet or `{% stylesheet %}` tags.

### 5.6 Liquid and TTFB

**T17.** [VF] Avoid nested loops and metafield lookups inside loops; don't iterate all variants unnecessarily; assign repeated filter results to variables; guard expensive Liquid inside drawers so it runs only when needed.
Source: https://shopify.dev/docs/storefronts/themes/best-practices/performance
REQ: Convert the custom-Liquid page sections into proper theme sections with schema settings and blocks, so the merchant can edit copy in the theme editor and `section.index` works for image loading. Run Theme Check before publishing.

### 5.7 Structured data for Product

**T18.** [VF] `{{ product | structured_data }}` outputs schema.org `Product` for products without variants and `ProductGroup` for products with variants, including brand, image, name and offers.
Source: https://shopify.dev/docs/api/liquid/filters/structured_data
**T19.** [SR] Google supports `shippingDetails` (`OfferShippingDetails`) nested in an `Offer`, and return policy via `hasMerchantReturnPolicy` on `Organization` (site-wide) or on the `Offer`; the return-policy country must be specified; for free returns omit the fee amount; settings entered in Search Console take precedence over markup.
Sources: https://developers.google.com/search/docs/appearance/structured-data/return-policy , https://developers.google.com/search/docs/appearance/structured-data/shipping-policy
**T20.** [VF] Shopify's SEO description guide lists adding product structured data as a tip and advises aligning page copy with the Google Merchant Center feed.
Source: https://www.shopify.com/blog/product-description
REQ:
- Keep one Product/ProductGroup JSON-LD block from the `structured_data` filter (already present, L6). Make sure no app or custom section outputs a second one.
- Add `Organization` and `WebSite` JSON-LD on the home page (name, URL, logo, contact email, `sameAs` social profiles), plus `hasMerchantReturnPolicy` and a shipping service block that mirror the written policies: Israel, free shipping, the 7–14 business-day transit range, 14-day returns.
- Add `aggregateRating` and `review` only when produced by the review app from real reviews. Do not mark up the hard-coded 4.9/46 figures.
- Add `FAQPage` markup only if the questions are visible on the page; expect no guarantee of a rich result.
- If 1/2/3-unit offers are variants, each variant's Offer price must equal the on-page price. If they are quantity discounts, the Offer shows the single-unit price.
- Validate with Google's Rich Results Test after deployment.

### 5.8 Metadata, `lang`, `dir` and hreflang for Hebrew RTL

**T21.** [VF] Shopify: output `<title>` from `page_title`, a meta description from `page_description`, and `<link rel="canonical" href="{{ canonical_url }}">` in the `<head>`.
Source: https://shopify.dev/docs/storefronts/themes/seo/metadata
**T22.** [VF] Shopify's language-selector example uses `hreflang="{{ language.iso_code }}"` and `lang="{{ language.iso_code }}"` on links, and says to output a selector only when more than one language is available.
Source: https://shopify.dev/docs/storefronts/themes/markets/multiple-currencies-languages
**T23.** [SR] Google: `x-default` marks the language-neutral fallback URL and is used alongside other hreflang values. Nothing Hebrew-specific was found.
Source: https://developers.google.com/search/blog/2023/05/x-default
REQ:
- In `layout/theme.liquid`: `<html lang="{{ request.locale.iso_code }}" dir="rtl">` (or derive `dir` from the locale if a second language is ever added). Today `dir` is missing on `<html>` (L2). Remove per-section `dir="rtl"` wrappers once the root is set.
- CSS uses logical properties (`margin-inline-start`, `padding-inline-end`, `inset-inline-start`, `text-align: start`). No `left`/`right` in new code. Directional icons (arrows, chevrons) are mirrored; logos, product photos, play icons and check marks are not.
- Prices, phone numbers, order numbers and the Latin brand name are wrapped in `<bdi>` or `dir="ltr"` spans so "₪237.90" and "7–14" do not reorder inside Hebrew sentences. Decide once whether the currency sign precedes or follows the number and use the store's money format everywhere.
- Single-language store: no hreflang tags are needed. [PR] If English or Arabic is added through Shopify Markets, rely on Shopify's generated alternates and confirm in page source that each locale has a self-reference and an `x-default`. (How Shopify emits these was not verified in this session.)
- Product handles are in Hebrew (for example `/products/כוס-רוח-חשמלית`). Keep them stable; any change needs a URL redirect.
- Each page has one H1. The home H1 is fine in form; the product H1 changes per REQ C-a. Title ≤ 60 characters and meta description ≤ 155 characters in Hebrew, with no claims that fail section 3.
- Every image gets descriptive, distinct Hebrew alt text. Today all gallery images share the product title as alt (L4).
- Accessibility baseline from Shopify's theme guidance (page fetched, not read in detail: https://shopify.dev/docs/storefronts/themes/best-practices/accessibility): visible focus states, labelled controls, sufficient contrast, keyboard access to the gallery, offer selector, drawer and accordions. [PR] Israeli web-accessibility regulations may apply to the business; this was not researched and needs a check.

---

## 6. Sources

### 6.1 Opened and read in this session

Baymard Institute
- https://baymard.com/blog/current-state-ecommerce-product-page-ux
- https://baymard.com/blog/in-scale-product-images
- https://baymard.com/blog/always-use-thumbnails-additional-images
- https://baymard.com/blog/mobile-image-gestures
- https://baymard.com/blog/price-per-unit
- https://baymard.com/lists/cart-abandonment-rate
- https://baymard.com/blog/avoid-banners-only-free-shipping
- https://baymard.com/blog/show-shipping-costs-on-product-pages
- https://baymard.com/blog/shipping-speed-vs-delivery-date
- https://baymard.com/blog/perceived-security-of-payment-form
- https://baymard.com/blog/user-ratings-distribution-summary
- https://baymard.com/blog/respond-to-negative-user-reviews
- https://baymard.com/research-articles/allow-reviewers-to-upload-images
- https://baymard.com/blog/footer-needs-return-shipping-links
- https://baymard.com/blog/ecommerce-ux-best-practices
- https://baymard.com/blog/10-sales-ux-best-practices
- https://baymard.com/blog/current-state-of-checkout-ux
- https://baymard.com/blog/checkout-flow-average-form-fields
- https://baymard.com/blog/mobile-ux-ecommerce (headings and search items only)

Nielsen Norman Group
- https://www.nngroup.com/articles/ecommerce-product-pages/
- https://www.nngroup.com/articles/trustworthy-design/
- https://www.nngroup.com/articles/sticky-headers/
- https://www.nngroup.com/articles/shopping-cart/
- https://www.nngroup.com/articles/e-commerce-usability/
- https://www.nngroup.com/articles/product-descriptions/
- https://www.nngroup.com/articles/mobile-navigation-patterns/ (hamburger section)
- https://www.nngroup.com/articles/social-proof-ux/ (usage and testing sections)
- https://www.nngroup.com/articles/communicating-discounts/ (headings)
- https://www.nngroup.com/articles/applying-discounts/ (headings and guideline 3)

Shopify developer documentation
- https://shopify.dev/docs/storefronts/themes/best-practices/performance
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/set-fetchpriority-high-on-lcp-image
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/never-lazy-load-lcp-image
- https://shopify.dev/docs/storefronts/themes/best-practices/performance/avoid-background-images-hero
- https://shopify.dev/docs/api/liquid/filters/image_tag
- https://shopify.dev/docs/api/liquid/filters/structured_data
- https://shopify.dev/docs/api/liquid/filters/font_face
- https://shopify.dev/docs/storefronts/themes/seo/metadata
- https://shopify.dev/docs/storefronts/themes/pricing-payments/unit-pricing
- https://shopify.dev/docs/storefronts/themes/markets/multiple-currencies-languages
- https://shopify.dev/docs/apps/build/devmcp (introduction and install section)
- https://shopify.dev/docs/storefronts/themes/best-practices/accessibility (fetched, not read in detail)

Shopify blog
- https://www.shopify.com/blog/product-page
- https://www.shopify.com/blog/landing-page-design
- https://www.shopify.com/blog/trust-badges
- https://www.shopify.com/blog/psychological-pricing
- https://www.shopify.com/blog/product-bundling (headings)
- https://www.shopify.com/blog/value-proposition (headings)
- https://www.shopify.com/blog/social-proof (headings)
- https://www.shopify.com/blog/product-description (headings)

LORINX live site
- https://lorinx-il.com/
- https://lorinx-il.com/products/כוס-רוח-חשמלית

### 6.2 Search-result only (not opened)

Baymard and NN/g snippets
- https://baymard.com/ecommerce-design-examples/added-to-cart-confirmation
- https://baymard.com/research/product-page
- https://baymard.com/mcommerce-usability/benchmark/mobile-page-types/navigation-menu

Claims and regulation
- https://innolitics.com/articles/fda-guidance-general-wellness-policy-for-low-risk-devices/
- https://btlaw.com/insights/alerts/2016/food-drug-and-device-law-fda-finalizes-guidance-on-general-wellness-devices-will-not-regulate
- https://www.arentfox.com/newsroom/alerts/fda-guidance-exempts-low-risk-wellness-products-device-regulation
- https://meddeviceguide.com/blog/fda-general-wellness-policy-wearable-devices-2026-guide
- https://www.cov.com/en/news-and-insights/insights/2023/01/ftc-issues-new-guidance-on-health-related-claims-to-replace-the-dietary-supplements-advertising-guide
- https://natlawreview.com/article/after-almost-25-years-ftc-issues-new-health-products-compliance-guidance
- https://m.jonesday.com/en/insights/2023/01/ftc-overhauls-and-expands-25yearold-health-products-advertising-compliance-guide
- https://www.gov.il/he/departments/units/committee-deception
- https://www.gov.il/he/service/complaint_mislead_medical_advertisement
- https://fs.knesset.gov.il/18/law/18_lsr_300799.pdf
- https://mondaq.com/consumer-law/626544/consumer-protection-law-prescribes-a-general-arrangement-for-canceling-transactions
- https://magazine.esra.org.il/posts/entry/senior-citizen-s-guide-to-cancellation-of-a-remote-sales-transaction.html
- https://transparency.meta.com/policies/ad-standards/objectionable-content/personal-health-and-appearance
- https://transparency.meta.com/policies/ad-standards/restricted-goods-services/health-wellness

Marketing and conversion
- https://cxl.com/blog/optimizing-luxury-ecommerce/
- https://ecommercefastlane.com/premium-web-design-dtc-growth/
- https://www.webtonic.io/blog/message-match
- https://winninghunter.com/blog/landing-page-teardown-above-the-fold
- https://ninety9.dev/blog/quantity-breaks-vs-volume-discounts.html

AI design prompting
- https://platform.claude.com/cookbook/coding-prompting-for-frontend-aesthetics
- https://gitcode.com/2301_77165880/claude-code/tree/main/plugins/frontend-design
- https://www.relume.io/resources/docs/building-a-sitemap-with-ai
- https://community.relume.io/best-practices-for-prompting-the-ai-site-builder-s4sRghHHTcXl
- https://relume.io/resources/series-videos/ai-prompting
- https://framer.com/wireframer
- https://www.hxmzaehsan.com/blog/how-to-use-framer-wireframer-ai
- https://webflow.com/blog/design-briefs
- https://webflow.com/blog/writing-prompts-webflow-mcp
- https://www.lowcode.agency/blog/how-to-write-a-webflow-project-brief-for-your-agency
- https://yoast.com/prompting-guide-ai-website-builders/
- https://www.techradar.com/pro/website-building/how-to-write-ai-website-builder-prompts-like-a-high-end-design-agency

Performance and SEO
- https://web.dev/articles/defining-core-web-vitals-thresholds
- https://web.dev/articles/optimize-inp
- https://web.dev/articles/font-best-practices
- https://developers.google.com/search/docs/appearance/structured-data/return-policy
- https://developers.google.com/search/docs/appearance/structured-data/shipping-policy
- https://developers.google.com/search/blog/2023/05/x-default

### 6.3 Attempted and not reachable

- https://github.com/Shopify/dawn (HTTP 403 through the proxy; the GitHub connector is limited to the project's own repository). All Dawn-setting statements are therefore from working knowledge.
- https://github.com/anthropics/claude-code (frontend-design skill; same restriction).
- themes.shopify.com was not needed and not fetched.
- Shopify blog URLs that returned 404 (guessed slugs, no content used): /blog/core-web-vitals, /blog/landing-page-optimization, /blog/sticky-add-to-cart, /blog/ecommerce-checkout-best-practices, /blog/cart-drawer, /blog/mobile-conversion-rate, /blog/luxury-branding, /blog/quantity-discounts, /blog/product-landing-page, /blog/ugc.
- NN/g URLs that returned 404 (guessed slugs): /articles/ecommerce-discounts/, /articles/product-photos/, /articles/cross-selling/.
