# LORINX premium redesign — design research (part: competitive design + themes + patterns)

Research date: 2026-11-17. Scope: visual/UX design only (no copy, pricing strategy or ads).

## 0. How to read this file

- **[V] = verified fact**: seen by me on the live page (headless Chromium screenshots at 1440 and 390 px, plus DOM text/computed-style probes). Screenshots are in `/tmp/research-shots/` (temporary).
- **[R] = professional recommendation**: my judgement, not a fact about any page.
- **[S] = from search results, not opened**: the page itself was not reachable; statements come from third-party write-ups and are lower confidence.
- Scores are 1–5 and are always judgement ([R]) built on the evidence type stated per site. `n/e` = no evidence, deliberately not scored.
- Environment limits that affect confidence:
  - WebFetch could not resolve any host in this session; everything "opened" was opened with Playwright.
  - Image CDNs of Oura, Foreo and Eight Sleep were blocked, so their pages rendered with layout, type and copy but **without photos**. Photography scores for those three are low-confidence.
  - Aesop and the WHOOP homepage returned a Cloudflare 403 challenge. Awwwards returned 502, Godly did not resolve.
  - Most sites were in Black-Friday mode (promo bars, coupon badges). Promo density is partly seasonal.

## 0.1 LORINX baseline (what we are redesigning) — all [V] unless marked

| Item | Observation |
|---|---|
| Platform | Shopify, theme reports itself as `Dawn`; `lang="he-IL"`; `<html dir>` attribute is empty (RTL is applied some other way — worth checking, [R]) |
| Type | Arimo everywhere; H1 72px weight 900, H2 42px weight 900, body 16–19px |
| Palette | Black hero/bands, saturated red CTAs and announcement bar, white/grey sections |
| Homepage order | Red announcement bar (3 claims) → black hero with product cut-out on red blobs + 2 CTAs + 4 stat tiles → 4-feature strip → full buy box with bundle selector → black "15 min" band → 4 trust icons → 4-product grid → review cards → WhatsApp screenshots → about block |
| Bundle selector | 3 radio cards: 1 unit ₪237.90 (home) / ₪237.33 (PDP), 2 units ₪379.90 (₪189.95 each, 20% badge), 3 units ₪499.90 (₪166.63 each, 30% badge); CTA repeats the price |
| PDP order | Gallery + thumbs → buy box → 4 trust icons → dark problem section → 3 usage moments → video → "who it's for" 6 cards → week-by-week table → "why LORINX" with packaging shot |
| Mobile PDP | No sticky add-to-cart found at 3,000px scroll (only the nav drawer is `position:fixed`) |
| Cart | Add-to-cart goes to a full `/cart` page, not a drawer |

Defects seen while browsing ([V]) — fix before any restyling:
1. Hero product price differs between homepage (₪237.90) and PDP (₪237.33).
2. Cart page showed "subtotal ₪0.00" above "total ₪237.33".
3. Homepage preselects the 2-pack, the PDP preselects the 1-pack.
4. The same trust claims (shipping / warranty / SSL / returns) appear three to four times per page (announcement bar, under the CTA, icon row, cart).
5. Packaging photo in "why LORINX" shows a generic English box ("Intelligent Breathing Cupping Massage Instrument") — the single strongest "dropshipping" tell on the site.
6. The four products' photos share no lighting, background or crop logic.

Design read ([R]): the structure is already competent (bundle cards, CTA with price, usage timeline). What reads as non-premium is the art direction: weight-900 type everywhere, pure red on pure black, icon-row trust blocks, mismatched imagery, repeated claims, and no brand-owned visual device.

---

## 1. Competitive design analysis

### 1.1 Therabody — opened (screenshots: home, PDP, cart drawer; desktop + mobile). Shopify, custom theme [V]

| Dimension | Score | Justification |
|---|---|---|
| Brand identity | 5 | Warm cream page colour, serif display + grotesque body, charcoal buttons: reads as wellness, not gadget |
| Homepage | 4 | Lifestyle hero, product rails, category pills, research block; heavy coupon badging lowers it |
| Product page | 5 | Eyebrow → serif title → one paragraph → trust chips → option card → CTA; long editorial body below |
| Photography | 5 | Real people, warm tungsten light, product in use; product tiles on consistent beige |
| Typography | 5 | ABC Arizona serif headings (40px, weight ~440) with Suisse Int'l body; light weights, generous size |
| Navigation | 4 | Four top items (Shop / Explore / Learn / Gifts), search, account, bag |
| Mobile | 4 | Gallery keeps a thumbnail rail; sticky bottom bar with name, price, CTA, BNPL (142px tall — large) |
| Trust | 5 | Chips for returns/warranty/registration next to the title, third-party research logos, footnoted claims |
| Conversion | 4 | Dated coupon box, "sold N times in 24h", cart drawer with "frequently bought together" side panel |
| Differentiation | 4 | Science + athlete storytelling; category leader look |

Principles for LORINX:
- Put proof next to the claim: every performance statement on the PDP carries a footnote number and a "see the science" link [V]. LORINX should only state what it can footnote, and show the footnote.
- Trust lives as small neutral chips directly under the product description, once, not as a repeated icon row [V].
- A warm off-white page colour plus one dark neutral for buttons does more for "premium" than any accent colour [R].

### 1.2 Hyperice — opened (screenshots: home, PDP, cart drawer; desktop + mobile). Shopify, custom theme [V]

| Dimension | Score | Justification |
|---|---|---|
| Brand identity | 5 | Strict black/white/light-grey, single grotesque (Suisse Intl 500), pill-shaped UI |
| Homepage | 5 | Full-bleed campaign photo, product rail, two colour-field campaign tiles, shop-by-therapy, bundles, "why buy direct" |
| Product page | 5 | Product-only hero on grey; right column is a spec sheet (label/value rows, accordions); black immersive section below |
| Photography | 5 | Studio-grade athlete shots on flat colour fields; product renders with one accent light |
| Typography | 4 | One family, medium weight, small sizes; calm, slightly cold |
| Navigation | 5 | Three items (Shop / Therapy / Explore); mobile adds a horizontal product-line chip row under the header |
| Mobile | 5 | 44px sticky bottom CTA with price; header icons as circles; hero text bottom-left over photo |
| Trust | 4 | Eligibility chip, rating beside it, "why buy direct" 4-column block (shipping, returns, warranty) once on the homepage |
| Conversion | 4 | CTA carries price; cart drawer has free-shipping progress bar, upsell carousel, discount field |
| Differentiation | 5 | Looks like sports equipment from a performance brand, not a massage gadget |

Principles for LORINX:
- The buy box can be a calm specification sheet: label on one side, value on the other, hairline dividers, accordions for specs / ideal for / what's included [V]. No badges needed when hierarchy is clear.
- One accent, used on the product itself (their green light ring) rather than on the UI [V]. LORINX's red should belong to the device and its heat glow, not to bars and buttons [R].
- "Why buy direct" as one consolidated block replaces scattered trust icons [V].

### 1.3 Oura — opened (screenshots: home, product story page; images did not load). Not Shopify [V]

| Dimension | Score | Justification |
|---|---|---|
| Brand identity | 5 | Warm paper background, light-weight editorial serif, quiet palette |
| Homepage | 4 | Short headline, single CTA, three benefit pillars, stat-led section, topic-tagged testimonials, press |
| Product page | 4 | Story page: huge serif line, numeric proof (accuracy, battery), specs, then finish chooser with prices |
| Photography | n/e | Images blocked in this session |
| Typography | 5 | Editorial New serif at 80px weight 300 with Akkurat sans for UI |
| Navigation | 5 | Four items with dropdowns, cart only; mobile sticky top bar shows product name + "Shop Now" |
| Mobile | 4 | Large numerals and one-line statements per screen; persistent top CTA |
| Trust | 4 | Stats with sources in small print, named testimonials tagged by health topic, press quotes |
| Conversion | 3 | Deliberately slow: story first, purchase later |
| Differentiation | 5 | Feels like a health publication |

Principles for LORINX:
- One number per screen: big numeral + three-word statement + small-print source [V]. LORINX has natural numbers (15 minutes, 12 levels, heat range) — but only use ones that are true and sourced.
- Testimonials gain credibility when tagged by use case (e.g. neck / lower back / post-training) instead of star rows [V pattern, R application].
- Light serif display at large size is the fastest route to "editorial" — the Hebrew equivalent needs a display face with real light/regular weights [R].

### 1.4 HigherDOSE — opened (screenshots: home, PDP, starter-kit PDP; desktop + mobile). Shopify, custom theme [V]

| Dimension | Score | Justification |
|---|---|---|
| Brand identity | 5 | Red-light photography as the brand's own colour world, teal CTAs, high-contrast serif wordmark |
| Homepage | 4 | Sale-led hero, category image carousel, best sellers, starter kits with "Save $" badges, quiz, founder story |
| Product page | 5 | Two-column image grid where several tiles are typographic infographics; radio cards "single vs starter kit" |
| Photography | 5 | Saturated, sensual, consistent; products shot on one light-grey sweep |
| Typography | 4 | Serif display (68px) + Suisse body; uppercase tracked micro-labels |
| Navigation | 4 | Shop / Best Sellers / Bundles & Starter Kits / Explore — bundles get a top-level slot |
| Mobile | 4 | Single image + thumbnail strip, radio cards stack well, sticky bottom CTA with price |
| Trust | 4 | Shipping threshold, instalments, 120-day guarantee as three plain rows under the CTA; FAQ + Learn side by side |
| Conversion | 5 | Kit offered inside the single product's buy box; kit page shows price, strike price, % saved, linked contents list |
| Differentiation | 5 | "Ritual" framing turns devices into lifestyle objects |

Principles for LORINX:
- Own a light. HigherDOSE's whole identity is the colour of its product's light [V]. LORINX's device emits red light and heat — a controlled warm-red glow on dark skin-tone/charcoal scenes can be its signature, used in photography rather than in UI chrome [R].
- Gallery images can carry the infographic layer (benefit, tech, what's included) set in brand typography, so the buy box stays short [V].
- The upgrade option sits in the same selector as the base product, with a tiny thumbnail and a one-line contents list [V].

### 1.5 Eight Sleep — opened (screenshots: home popup, PDP; images did not load) [V]

| Dimension | Score | Justification |
|---|---|---|
| Brand identity | 4 | Black/bone palette, serif + Neue Montreal, tracked uppercase nav |
| Homepage | 2 | First paint was a full-screen quiz/offer modal before any content |
| Product page | 5 | Configurator: sticky gallery left, stepwise questions right, running total in a sticky bottom bar |
| Photography | n/e | Images blocked |
| Typography | 4 | Large light sans headings, mono-style hotspot labels |
| Navigation | 4 | Three items only (how it works / accessories / reviews) |
| Mobile | 4 | Same stepwise configurator; sticky total + checkout |
| Trust | 5 | Warranty / trial / returns / shipping row above the gallery; review count beside price; explicit "what is and isn't included" note |
| Conversion | 4 | Add-ons with was/now prices, ship-by date beside the checkout button, payment-mode tabs |
| Differentiation | 4 | Product page feels like speccing a car |

Principles for LORINX:
- State what is in the box and what is not, on the gallery itself [V]. Removes a support question and reads as confident.
- Phrase the selector as a question ("How many do you need?") with tiles, and keep a running total in the sticky bar [V pattern, R application to 1/2/3 units].
- Delivery date next to the final button is a trust element, not a shipping detail [V].

### 1.6 Foreo — opened (screenshots: home, BEAR 2 page; images did not load) [V]

| Dimension | Score | Justification |
|---|---|---|
| Brand identity | 3 | Magenta pill buttons on navy/grey; recognisable but mass-market |
| Homepage | 3 | Bestsellers shown as bundles with "bundle contains" lines and strike prices; many repeated CTA pairs |
| Product page | 4 | Strong content model: highlights, the science, before/after, clinical percentages, how-to steps, features |
| Photography | n/e | Images blocked |
| Typography | 2 | Montserrat bold headings, tracked caps labels; generic |
| Navigation | 3 | Hamburger on desktop, logo centred, utility bar with region |
| Mobile | 3 | Long stacked sections; not verified in detail |
| Trust | 4 | Regulatory tag, awards logo row (250+), celebrity quotes, percentage outcomes |
| Conversion | 4 | Bundles first, paired "discover / buy now" on every block |
| Differentiation | 3 | Colourful product design carries it more than the site |

Principles for LORINX:
- The PDP content sequence — highlights → how it works → results → how to use (numbered steps) → features — is the right skeleton for a single-device brand [V].
- Describing a bundle by its contents in one line under the name is clearer than a discount badge alone [V].
- Counter-example: a geometric bold sans with a bright pill button is the visual language of mid-market devices. Avoid [R].

### 1.7 WHOOP — partially opened (membership page, mobile screenshot + text; homepage and desktop returned 403) [V]

| Dimension | Score | Justification |
|---|---|---|
| Brand identity | 4 | Pure black, white type, tracked uppercase buttons |
| Homepage | n/e | Blocked |
| Product page | 4 | Three tiers as cards with included items, then a full comparison table |
| Photography | n/e | Not loaded |
| Typography | 4 | Large tight sans headline, small caps buttons |
| Navigation | 3 | Six uppercase items plus "Join now" |
| Mobile | 4 | Persistent "Join now" pill at the bottom; tiers as swipeable cards with dots |
| Trust | 3 | Eligibility chip, free-trial note; medical small print linked |
| Conversion | 4 | Each tier states "everything in the previous tier, plus…" |
| Differentiation | 4 | Performance-club tone |

Principles for LORINX:
- "Everything in X, plus…" is the clearest way to describe step-up options [V]; applicable if LORINX ever sells kit tiers (device / device + oil / pair).
- All-black works for WHOOP because photography and data visuals carry colour. Black + flat red blocks with no photography (current LORINX hero) does not get the same effect [R].

### 1.8 Aesop — NOT opened (Cloudflare 403 on two URLs). [S] only

| Dimension | Score | Justification (all [S], low confidence) |
|---|---|---|
| Brand identity | 5 | Widely cited as the reference for quiet, consistent luxury |
| Homepage | n/e | — |
| Product page | 4 | Reported to give function, suitability, key ingredients, usage and pairings in a fixed order |
| Photography | n/e | — |
| Typography | 4 | Sources disagree on the exact faces (Suisse Int'l vs Helvetica Neue; serif/flared wordmark); small body size (~14px) reported |
| Navigation | 4 | Agency case study (Work & Co) describes products exposed directly from navigation, tested with repeat buyers |
| Mobile | n/e | — |
| Trust | n/e | — |
| Conversion | n/e | — |
| Differentiation | 5 | Brand architecture discussed as a category of its own |

Principles for LORINX ([R], inspired by the above):
- A fixed information order on every product (what it does → who it suits → how to use → what pairs with it) signals an edited catalogue.
- Modular page components that the owner can recombine, rather than one-off landing pages, keep quality stable over time.
- Do not lean on Aesop specifics in the build — nothing here was verified.

### 1.9 Solawave — NOT opened. [S] only

| Dimension | Score | Justification (all [S]) |
|---|---|---|
| Brand identity | 3 | Rose-gold device on white, pastel panels |
| Homepage | n/e | — |
| Product page | 3 | Kit framing, stacked was/now prices, comparison table vs other devices, day-1/day-21 timeline |
| Photography | n/e | — |
| Typography | n/e | — |
| Navigation | n/e | — |
| Mobile | n/e | — |
| Trust | 4 | Review count + customer count, returns/warranty/shipping callouts, regulatory framing |
| Conversion | 4 | "Add 2 to activate" BOGO, free-gift stacking, scarcity labels |
| Differentiation | 3 | Promotion-led |

Principles for LORINX:
- A dated results timeline is a good content block — LORINX already has one; keep it, restyle it.
- Counter-example: perpetual BOGO, "almost sold out" and stacked free gifts are exactly the discount-store signals this redesign is trying to leave [R].

### 1.10 Loop Earplugs — NOT opened. [S] only

| Dimension | Score | Justification (all [S]) |
|---|---|---|
| Brand identity | 4 | Colour-led lifestyle accessory positioning |
| Homepage | n/e | — |
| Product page | 4 | Bundle pages show strike price, % badge and shipping threshold; colour as a visual variant |
| Photography | n/e | — |
| Typography | n/e | — |
| Navigation | 4 | "Help me choose", quiz and comparison page in the menu; "build your own bundle" up front |
| Mobile | n/e | — |
| Trust | n/e | — |
| Conversion | 4 | Named use-case bundles with a one-line purpose each |
| Differentiation | 4 | Turned a commodity into a fashion object |

Principles for LORINX:
- Name bundles by situation, not by quantity (a pair "for two at home", three "for the family / to gift") [R, from S].
- A "help me choose" entry point in navigation matters once there are four products with overlapping uses.

### 1.11 Ridge — NOT opened. [S] only

| Dimension | Score | Justification (all [S]) |
|---|---|---|
| Brand identity | 4 | Single-product focus, materials-led |
| Homepage | n/e | — |
| Product page | 4 | Scroll-driven animation of the product opening; guarantee prominent |
| Photography | n/e | — |
| Typography | n/e | — |
| Navigation | n/e | — |
| Mobile | n/e | — |
| Trust | 4 | Lifetime guarantee as a core page element |
| Conversion | 4 | Company-reported lift from a "see how it works" CTA (secondary source, unverified) |
| Differentiation | 4 | Everyday object sold as engineered kit |

Principles for LORINX:
- A secondary CTA that explains the mechanism can out-perform a second "buy" button; LORINX's hero already has one — keep it and make it lead to a real demonstration [R].
- One short motion sequence of the device working (suction, heat glow, display) is worth more than five static renders [R].

### 1.12 Nothing — NOT opened. [S] only

| Dimension | Score | Justification (all [S]) |
|---|---|---|
| Brand identity | 5 | Proprietary dot-matrix face for product names, mono labels, sans headlines |
| Typography | 5 | Described as its single most ownable asset |
| Differentiation | 5 | Distinct from every phone brand |
| Other dimensions | n/e | — |

Principle for LORINX: a small, ownable typographic device used sparingly (product names, numerals, labels) creates more identity than any colour. For LORINX the device's own digital display numerals are a natural candidate for a numeral/label style [R].

### 1.13 Dyson — NOT opened. [S] only

| Dimension | Score | Justification (all [S]) |
|---|---|---|
| Product page | 4 | Reported to use engineering diagrams, airflow animation and test footage as a guided demo |
| Brand identity | 4 | Engineering-led |
| Other dimensions | n/e | — |

Principle for LORINX: explain the mechanism with a diagram (cross-section: suction chamber, heating ring, light) instead of adjectives [R].

### 1.14 Not scored
- **LYMA**: search returned only product reviews and retailer listings, nothing about the site's design. No claims made.
- **Bala, Hims**: not researched (time). No claims made.
- **Land-book e-commerce gallery** — opened [V]: the current front page lists small independent brands (e.g. Nick Fouquet, people4ocean, Skall Studio, Studio Iron, EADEM, Nossara, Heist, Flynny's). Titles only were read; individual sites were not opened, so no design claims are made about them.

### 1.15 Cross-site summary ([V] for the opened five, [R] for the conclusion)

| Trait | Therabody | Hyperice | Oura | HigherDOSE | Eight Sleep | LORINX today |
|---|---|---|---|---|---|---|
| Page background | warm cream | white / light grey | warm paper | white | bone / black | black + white + grey |
| Display type | serif, light | grotesque, medium | serif, light | serif, regular | serif + light sans | sans, weight 900 |
| Primary button | charcoal | black | blue pill / charcoal | teal pill | white on black bar | bright red |
| Top-nav items | 4 | 3 | 4 | 4 | 3 | 5 |
| Sticky mobile CTA | yes | yes (with price) | yes (top bar) | yes (with price) | yes (with total) | no |
| Cart | drawer | drawer | n/e | n/e | n/e | full page |
| Trust placement | chips under description | chip + one block | small print + press | 3 rows under CTA | row above gallery | 3–4 repeated icon rows |

Conclusion [R]: none of the premium references uses heavy black display type, a saturated accent for both bars and buttons, or repeated icon-row trust blocks. All of them use: a warm or neutral ground, light/medium type weights at large sizes, a dark neutral or single calm colour for the CTA, 3–4 navigation items, one consolidated trust statement, and a sticky mobile purchase bar.

---

## 2. Shopify premium themes (pattern mining only — we are not buying)

All rows [V] from the Theme Store listing pages on 2026-11-17 (price, rating, feature list). Demo stores were not opened, so behaviour claims are limited to what the listing states. "Quantity pricing" is shown in the listings with a "Shopify Plus" label directly after it; none of the listings names "bundles" as a theme feature.

| Theme (developer) | Price | Rating (reviews) | RTL listed | Sticky cart listed | Quantity pricing listed | Listing's own positioning |
|---|---|---|---|---|---|---|
| Prestige (Maestrooo) | $400 | 91% (875) | yes | yes | yes (Plus label) | premium, high-end brand appeal |
| Impulse (Archetype) | $500 | 94% (1305) | not listed | not listed | not listed | fashion, promotions, shoppable hero |
| Motion (Archetype) | $420 | 97% (558) | not listed | not listed | not listed | animation and video, mobile-first |
| Impact (Maestrooo) | $400 | 85% (200) | yes | yes | yes (Plus label) | bold, gradients, big headings |
| Symmetry (Clean Canvas) | $420 | 94% (392) | yes | yes | not listed | all-rounder, strong filtering |
| Pipeline (Groupthought) | $360 | 97% (209) | yes | not listed | not listed | luxury brands, merchandising, nested blocks |
| Be Yours (RoarTheme) | $380 | 98% (702) | yes | yes | yes (Plus label) | skincare/beauty editorial storytelling |
| Stiletto (Fluorescent) | $380 | 92% (156) | not listed | yes | not listed | premium design, sticky buy buttons, cart upsells |
| Release (DigiFist) | $420 | 95% (118) | yes | yes | yes (Plus label) | bold, single-brand, video, sales points |
| Shapes (Switch) | $420 | 99% (87) | not listed | yes | not listed | playful, consumables, comparison tables |
| Broadcast (Presidio) | $420 | 94% (287) | not listed | yes | not listed | feature-rich, upsell; bundles via companion app |
| Concept (RoarTheme) | $400 | 99% (675) | yes | yes | yes (Plus label) | app-like mobile shopping |
| Dawn (Shopify) — current | Free | 36% | n/e | n/e | n/e | minimalist, media-forward product page |

Per-theme notes and verdict (features [V] from listing; verdict [R]):

- **Prestige** — product features listed: product tabs, image zoom, image hotspot, before/after slider, lookbooks, usage information, ingredients info, stock counter, quick order list, recently viewed, cross-selling, mega menu, sticky header, slide-out cart. Mobile: listing only claims performance and accessibility. *Adapt:* the restrained luxury product page (tabs/accordion for usage + specs, before/after slider, press coverage strip). Closest in spirit to what LORINX needs.
- **Impulse** — promo-heavy: countdown timer, promo popups/tiles/banners, stock counter, trust badges, shoppable hero. *Adapt:* nothing beyond the testimonial section idea. Its promotion toolkit is what we are moving away from.
- **Motion** — animation, product videos, image hotspot, quick buy; listing calls it "thumb-friendly" and compact on mobile. *Adapt:* restrained scroll reveal and video-first sections; skip the rest.
- **Impact** — big headings, gradients, 35+ sections; sticky add to cart and complementary products called out in the blurb; before/after slider; RTL listed. *Adapt:* sticky add-to-cart behaviour and "complementary products" block under the buy box. Do not adopt gradients or oversized bold headings (same failure mode LORINX has now).
- **Symmetry** — generalist with strong collection filtering; RTL listed. *Adapt:* little; LORINX has four products and needs no filtering.
- **Pipeline** — blurb names free-shipping bars, free-shipping-aware cart, hotspots, countdowns, upsells; before/after slider; RTL listed; no sticky cart listed. *Adapt:* free-shipping-aware cart drawer and image hotspots (label the suction cup, heat ring, display).
- **Be Yours** — blurb names ritual steps, ingredient tabs, shoppable hotspots, before/after sliders, lookbooks, sticky cart, slide-out drawer; RTL listed. *Adapt:* "ritual steps" section (numbered routine) and tabbed usage information — the best structural match for a wellness device.
- **Stiletto** — blurb names cart upsells, hotspots, sticky buy buttons, free shipping bars, countdowns. No RTL listed. *Adapt:* sticky buy button + cart upsell row.
- **Release** — single-brand, video, "sales points", quick order list, RTL listed, sticky cart. *Adapt:* the "sales points" idea (3–4 short proof lines beside the price) as LORINX's replacement for check-mark bullets.
- **Shapes** — product comparison tables, usage icons, decorative shapes/stickers. *Adapt:* comparison table only (LORINX vs manual cups vs clinic visit — if claims can be supported). Reject the sticker aesthetic.
- **Broadcast / Concept** — similar feature sets; Concept stresses swipe carousels and dismissible sheets on mobile. *Adapt:* bottom-sheet behaviour for mobile variant/bundle editing.

Bundle / quantity-break support, summarised: [V] no listing advertises a native bundle selector; five list "Quantity pricing" with a Shopify Plus label. [R] For LORINX on Dawn, the 1/2/3-unit selector should stay a custom block (as it already is), driven by variants or automatic discounts, and should not depend on a theme feature.

RTL, summarised: [V] listed for Prestige, Impact, Symmetry, Pipeline, Be Yours, Release, Concept; not listed for Impulse, Motion, Stiletto, Shapes, Broadcast. [V] The Dawn GitHub issue search for "rtl" shows RTL-related issues/PRs (e.g. logical properties support, exposing direction, dropdown position in RTL). [R] In a custom Dawn build, write all new CSS with logical properties (`margin-inline`, `inset-inline`, `text-align: start`) and set `dir="rtl"` on `<html>`.

---

## 3. Design patterns worth adopting

Each pattern: source ([V] unless marked) → what to take ([R]).

### 3.1 Hero
- **Source:** Hyperice home (full-bleed photograph, text bottom-aligned, one pill CTA, no badges); Therabody home (lifestyle photo with product in use); Oura (short serif headline, one CTA).
- **Adopt:** one art-directed photograph of the device on a body in warm low light, the red glow as the only saturated colour; headline of 3–5 words in a light/regular display weight; one primary CTA and one text link ("how it works"). Remove the four stat tiles and the category badge from the hero.
- **Mobile:** photo fills the first screen, text block at the bottom inline-start (right in RTL), as on Hyperice mobile.

### 3.2 Product gallery
- **Source:** HigherDOSE (two-column tile grid on desktop mixing photos and typographic infographic tiles; single image + thumb strip on mobile); Therabody (vertical thumbnail rail, video as first thumbnail, rounded large image); Eight Sleep (hotspot labels and an "included / not included" note on the image); Baymard (in-scale and human-model images are common omissions; support pinch and double-tap zoom on mobile).
- **Adopt:** fixed image order — 1) hero product on brand ground, 2) on body, in scale, 3) mechanism diagram with labels, 4) what's in the box, 5) display/controls close-up, 6) short video. Same background colour and light direction on every frame, for all four products. Infographic text is set in the brand typeface, in Hebrew, never baked-in English.

### 3.3 Bundle selector
- **Source:** HigherDOSE "select product" radio cards (check circle, name, one-line contents, price + strike price, small thumbnail, one badge at most); Eight Sleep (selector phrased as a question; running total in the sticky bar; was/now on add-ons); Therabody (option card with thumbnail and price); Baymard guideline: show price per unit for products sold in varying quantities (81% of benchmarked sites don't) and a total-cost estimate near the buy section (67% don't).
- **Adopt:** keep LORINX's three radio cards but restyle: hairline borders, selected state = dark outline + filled check (no red frame); per-unit price on every row including the single unit; saving shown as an amount in shekels in neutral text; at most one label ("most chosen") on one row; each row named by situation; default selection identical on homepage and PDP; CTA shows the live total.
- **Avoid:** two competing badges per card (current "save more" plus "20% off").

### 3.4 Trust architecture
- **Source:** Therabody (neutral chips under the description; footnoted claims; third-party research logos; dated coupon terms); Hyperice ("why buy direct" block once); HigherDOSE (three plain rows under the CTA: shipping, instalments, guarantee length); Eight Sleep (trust row above the gallery; delivery window by the button); NN/g: the four credibility factors are design quality, up-front disclosure, comprehensive/correct/current content, and connection to the rest of the web; Baymard: link the return policy from the main product content (44% don't).
- **Adopt, as three layers that each appear once:**
  1. At the decision point: three text rows under the CTA — delivery time to Israel, return window with link, warranty length.
  2. Mid-page: one "buying from LORINX" block — who the company is, Israeli service in Hebrew, contact channels, business details.
  3. Evidence: reviews with reviewer photos and use-case tags; anything clinical only with a source.
- **Remove:** the SSL claim as a selling point, the repeated icon rows, and trust items from the announcement bar (use the bar for one message).

### 3.5 Editorial sections
- **Source:** Oura (one number per screen with source); Therabody (alternating image/text rows with serif headings; "what's included / specifications" tabs); Foreo (highlights → science → results → how-to steps → features); HigherDOSE ("how to use" as a ritual with a pull quote; FAQ beside "Learn" articles).
- **Adopt:** PDP body sequence — the feeling (one photograph + one sentence) → how it works (diagram) → the routine (3 numbered steps, 15 minutes) → what to expect over weeks (existing table, restyled as a timeline) → who it suits / who should not use it → in the box + specs (tabs) → reviews → FAQ. Each section gets one idea and generous spacing; alternate warm-light and deep-dark grounds no more than twice per page.
- **Add:** a "who should not use it / safety" block. Up-front disclosure is a credibility factor per NN/g and is absent today.

### 3.6 Cart drawer
- **Source:** Hyperice (title with count, free-shipping progress bar, line item with stepper, "you may also like" horizontal cards, discount field, estimated total, full-width checkout); Therabody (free-shipping message, "included in the box" thumbnails under the line item, separate "frequently bought together" panel, subtotal/shipping/tax rows).
- **Adopt:** replace the `/cart` page hop with a drawer that slides from the inline-end side: free-shipping status line; line item showing bundle name and per-unit price; an in-drawer "make it a pair" upgrade when quantity is 1; "in the box" thumbnails; subtotal, shipping and total rows that always add up; one checkout button; payment marks below it, small and monochrome.

### 3.7 Mobile sticky CTA
- **Source:** Hyperice (44px bar: "Add to bag – $149.00"); HigherDOSE (bar with name, selected variant, "Edit", CTA with price); Therabody (name + price + CTA + BNPL, 142px — too tall); Eight Sleep (running total + checkout + ship date); Oura (sticky top bar with product name + shop button).
- **Adopt:** a bar of about 56–64px that appears after the main CTA scrolls out of view: selected bundle label + total on the inline-start side, button on the inline-end side; tapping the label opens the bundle selector as a bottom sheet. Respect the iOS safe area; hide while the cart drawer or keyboard is open.

### 3.8 Navigation
- **Source:** Hyperice (3 items; on mobile a horizontal chip row of product lines under the header); Therabody / Oura / HigherDOSE (4 items); HigherDOSE (bundles as a top-level item); Loop [S] ("help me choose").
- **Adopt:** desktop — logo, 3–4 items (Shop, How it works, Our story, Support), cart; remove "Home" and move "bulk orders for companies" and "contact" to the footer/support. Mobile — logo, cart, menu, plus a chip row with the four products so every product is one tap away. One-message announcement bar, in a neutral dark tone rather than red.

### 3.9 Visual system (supporting recommendation, [R], derived from 1.15)
- Ground: warm off-white for most sections; one deep warm charcoal (not pure black) for 1–2 immersive sections.
- Accent: the device's red, reserved for the product, the glow in photography, and very small UI moments (selected dot, price saving). Primary button in charcoal.
- Type: a Hebrew display face with light/regular weights for headings and a neutral Hebrew sans for UI; replace weight 900 with 400–500 at larger sizes; set numerals in a distinct style echoing the device display.
- Shape: one corner radius, hairline borders, no drop shadows on cards.
- Motion: slow fades and one scroll-linked product moment; nothing that bounces or counts down.

---

## 4. Rejected approaches and why

| Approach | Seen at | Why rejected for LORINX |
|---|---|---|
| Entry modal / quiz before content | Eight Sleep [V] | Blocks the first impression; unknown brand has not earned an interruption |
| Coupon badges on every product tile and dated promo boxes | Therabody [V] (seasonal) | Established brands can absorb it; on a young store it reads as a discount site |
| "Sold N times in 24 hours" and stock/urgency counters | Therabody [V]; several themes list stock counters and countdown timers [V] | Unverifiable to the shopper, typical of dropshipping templates, and a legal risk if not literally true |
| Perpetual BOGO, "almost sold out", stacked free gifts | Solawave [S] | Trains shoppers to distrust the list price; conflicts with premium positioning |
| Bold geometric sans + bright pill buttons | Foreo [V] | Mid-market device look; LORINX's current weight-900 Arimo has the same problem |
| Gradients and oversized bold headings | Impact listing [V] | Entertainment/audio styling, not wellness |
| Stickers, blobs, decorative shapes | Shapes listing [V]; LORINX's own red blobs [V] | Playful/consumable tone; cheapens a device |
| Trust-badge icon rows and SSL badges | LORINX today [V]; "trust badges" feature in many themes [V] | None of the five opened premium sites uses them; they use text rows, chips, or one block |
| WhatsApp screenshot testimonials as-is | LORINX today [V] | Authentic but visually noisy and unverifiable; re-set the quotes in brand typography with name, city and use-case tag, and keep originals behind a "see the original message" link |
| Full buy box with bundle selector on the homepage | LORINX today [V] | Turns the homepage into a landing page; premium references keep the homepage for brand and routing and sell on the PDP |
| Sticky bar taller than ~70px | Therabody mobile [V] | Covers too much of a 390px screen |
| All-black site | WHOOP [V] | Needs strong photography and data visuals to work; with cut-outs it looks like a generic gadget store |
| Buying and installing a premium theme | — | Out of scope by decision; also RTL is not listed for five of the twelve, and bundle logic would still be custom |
| Copying any competitor's layout or wording | — | Principles only; several of these brands sell in Israel |

---

## 5. Sources

### 5.1 Opened (Playwright; screenshots and/or page text)
- https://lorinx-il.com (home; desktop + mobile)
- https://lorinx-il.com/products/כוס-רוח-חשמלית (PDP; desktop + mobile; add-to-cart → cart page)
- https://www.therabody.com/us/en-us/ (home)
- https://www.therabody.com/products/theragun-mini-plus-massage-gun (PDP, cart drawer)
- https://hyperice.com/ (home)
- https://hyperice.com/products/hypervolt-go-3 (PDP, cart drawer)
- https://ouraring.com/ (home; images not loaded)
- https://ouraring.com/store/rings/oura-ring-5 (product page; images not loaded)
- https://higherdose.com/ (home)
- https://higherdose.com/products/infrared-sauna-blanket (PDP)
- https://higherdose.com/products/sauna-blanket-starter-kit (kit PDP)
- https://www.eightsleep.com/ (home; modal only)
- https://www.eightsleep.com/product/pod-cover/ (PDP; images not loaded)
- https://www.foreo.com/ (home; images not loaded)
- https://www.foreo.com/bear-2-collection (product page; images not loaded)
- https://www.whoop.com/us/en/membership/ (text + mobile screenshot; desktop screenshot got 403)
- https://land-book.com/design/ecommerce (gallery titles only)
- https://themes.shopify.com/themes/prestige , /impulse , /motion , /impact , /symmetry , /pipeline , /be-yours , /stiletto , /release , /shapes , /broadcast , /concept , /dawn (each redirected to `/presets/<name>`)
- https://baymard.com/research-articles/current-state-ecommerce-product-page-ux
- https://baymard.com/research-articles/mobile-image-gestures
- https://www.nngroup.com/articles/trustworthy-design/
- https://github.com/Shopify/dawn/issues?q=rtl (issue titles only)
- https://shopify.dev/docs/storefronts/themes/markets/multiple-currencies-languages (opened; nothing RTL-specific used)

### 5.2 Tried and failed
- https://www.aesop.com/us/ and one Aesop product URL — 403 (Cloudflare challenge)
- https://www.whoop.com/us/en/ — 403 (Cloudflare challenge)
- https://www.awwwards.com/websites/e-commerce/ — 502 (twice)
- https://godly.website/websites/ecommerce — host did not resolve
- https://baymard.com/blog/sticky-add-to-cart-button — 404 (guessed URL)
- Theme demo stores — not attempted (outside the allowed hosts)

### 5.3 Search-result only (not opened)
- Aesop: https://work.co/clients/aesop , https://fontalternatives.com/inspiration/aesop-suisse/ , https://www.shadcn.io/design/aesop , https://www.webdesignhot.com/design.md/aesop/
- Solawave: https://www.solawave.co/products/4-in-1-radiant-renewal-skincare-wand-bundle , https://www.solawave.co/collections/kits-bundles , https://shop.solawave.co/pages/wand-bundle
- Loop: https://us.loopearplugs.com/collections , https://us.loopearplugs.com/products/deluxe-bundle , https://www.replo.app/case-study/loop-earplugs-testing-and-optimizing-40-landing-pages
- Ridge: https://landingdoctors.com/teardowns/ridge-com , https://1800dtc.com/resources/reads/under-the-hood-connor-from-ridge , https://brand-breakdowns.beehiiv.com/p/kickstarter-100myear-business-brandbreakdowns-004
- Nothing: https://www.shadcn.io/design/nothing , https://madegooddesigns.com/nothing-brand-guidelines/
- Dyson: https://superside.com/blog/product-page , https://www.marketingmonk.so/p/dyson-engineering-led-marketing-strategy , https://www.brandvm.com/post/dyson-marketing-strategy
- LYMA (nothing usable on design): https://www.beautyindependent.com/?p=185515
