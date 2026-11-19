# LORINX — Version 2: Cinematic direction with motion

Date: 17 November 2026. This supersedes the visual direction in `LORINX_BRAND_STRATEGY.md` §5 and the token tables in `LORINX_DESIGN_SYSTEM.md` §1–3. Structure, copy rules, commerce logic and the handoff process in the other documents still apply. It lives on the same unpublished draft theme (`153195577388`); the live store is untouched.

## Why it changed

After the first draft ("Quiet Recovery", warm and editorial) the owner asked for a more premium result, with motion, in the style of the sites on getlayers.ai. That style is dark and cinematic: near-black ground, very large light-weight headlines, live shader backgrounds, glass panels with hairline borders, pill buttons, and content that enters in a choreographed sequence.

## What GetLayers was and was not used for

- The GetLayers skill was loaded and its flow was followed as far as possible.
- **BLOCKED:** the GetLayers MCP server is not connected in this session. It answers `401` and needs the owner's GetLayers sign-in, which cannot be done from here. No GetLayers template, section, scene, background or composition was pulled, and nothing from its library is in the theme.
- getlayers.ai itself was opened and studied as a style reference (home page and library pages).
- Everything in the theme is original work in that genre: the shader, the layouts and the motion were written for LORINX. No template was copied.
- When the MCP is connected, the natural next step is to replace the hand-written aura with a GetLayers scene or gradient tinted to the LORINX palette, and to swap section layouts for library compositions.

## Visual system (v2)

| Token | Value | Use |
| --- | --- | --- |
| `--lx-bg` | `#080808` | Page ground |
| `--lx-surface` / `--lx-sand` | `#0E0E0D` / `#131211` | Raised bands |
| `--lx-glass` / `--lx-glass-line` | white 4.5% / white 9% | Cards, option cards, panels |
| `--lx-ink` | `#F4F1EA` | Text, primary button fill |
| `--lx-ink-2` / `--lx-ink-3` | `#AAA49A` / `#8B867D` | Secondary and tertiary text |
| `--lx-accent` | `#EE6A4F` | Eyebrows, numerals, small icons, progress line — the colour of the device's red light |
| `--lx-ok` / `--lx-err` | `#7BD3A0` / `#FF8F80` | Saving amount, errors |

- Typography: **Heebo only** (300/400/500/600). Display text is weight 300 with tight tracking; the serif was dropped, which also removes one font request. Hero headline `clamp(42px, 6.3vw, 104px)`.
- Shape: 14–18px radius on cards, full pills for buttons, inputs and the quantity stepper.
- Buttons: primary is an ivory pill with dark text; secondary is a glass pill.

## Motion system

All motion is in `assets/lx2.js` and `assets/lx2.css`, with no libraries. Everything is disabled under `prefers-reduced-motion`.

| Piece | What it does | Where |
| --- | --- | --- |
| Intro curtain | Wordmark resolves from blur, a hairline draws across, the curtain lifts after about one second. Pure CSS, first page view of a session only, home page only | Home |
| Hero choreography | Meta row, headline words, lead, buttons and the fact rail enter in sequence once the curtain lifts; the product scales in and then floats slowly | Home hero |
| "Ember" aura | An original WebGL fragment shader: domain-warped noise in black, oxblood and ember, with a soft focus point that drifts and follows the pointer. Half resolution, capped near 30 fps, paused off-screen and when the tab is hidden, CSS-gradient fallback without WebGL, a single still frame under reduced motion | Home hero, story band, product closing band |
| Word reveal | Section headings rise word by word from behind a mask when they enter the viewport; the sentence stays whole for screen readers through `aria-label` | All section headings, product title |
| Image un-mask | Images wipe in from the top while settling from a slight zoom | Featured product, editorial images |
| Parallax | Editorial images and the hero product drift a few percent against scroll, one `requestAnimationFrame` loop | Hero, media sections |
| Progress line | The rule above the three steps fills in the accent colour as the section scrolls through | "How it works" |
| Marquee | A slow band of large words, alternating filled and outlined, pauses on hover | Home, under the hero |
| Pointer glow | A soft ember glow follows the pointer across glass cards (fine pointers only) | Do / avoid cards |
| Staggered lists | Items in a group enter 70 ms apart | Lists, grids |

## Layout changes

- **Hero:** full-height dark stage. Product on the left with the aura behind it, headline at large scale on the right, two pill buttons, and a four-cell fact rail along the bottom edge. The header sits transparently over it.
- The separate facts strip under the hero was folded into the hero rail; a marquee follows the hero.
- The story band and the product closing band carry the aura.

## Independent review — fixes applied in this version

A separate reviewer read the theme code and copy. Fixed: focus now moves into drawers and is trapped there while the page behind is inert; a double tap can no longer add twice; drawer and quantity failures fall back to the cart page instead of an empty drawer; the sticky button follows the chosen variant's availability; per-product visibility now uses the product handle and fails closed; pack detection requires a first variant of one unit and shows the "lowest per unit" tag only when it is true; merchant text is escaped; anchors clear the sticky header; hardcoded five-star marks were removed from the reviews section; "treatment" wording was replaced with "use"; sentences claiming what "many users report" were removed; delivery wording was unified.

Not changed, for the owner to confirm: the six WhatsApp screenshots (genuine, shared with consent, no personal details visible), product specifications carried over from the live site, and the contraindication list (should match the manufacturer's manual).

## Status of version 2

**VERIFIED**
- The live theme is unchanged (`updatedAt` 2026-10-09, role MAIN); the draft is UNPUBLISHED.
- All 39 `lx2` files on the draft are byte-identical to the repository (MD5 compared after the last upload).

**TESTED** (headless Chromium with software WebGL, preview URL, `tools/qa.js`)
- 15 pages × 7 widths (320–1440px): no horizontal overflow, no Liquid errors, no theme JavaScript errors.
- Purchase path on mobile: quantity cards, price and button update, sticky bar, drawer, quantity change, cart page, hand-off to Shopify checkout, empty cart. All pass.
- Menu, search, FAQ, homepage buy box.
- The shader initialises and draws on the home hero and the two bands; headings, images and hero choreography reveal as designed (checked in screenshots: `docs/screenshots/v2-*.jpg`).

**NOT TESTED**
- Frame rate and battery use of the shader on real phones. It was only run with software rendering; it is drawn at half resolution and paused off-screen, but a real-device check is needed before publishing.
- Performance of version 2 was not re-measured (the version 1 numbers in `LORINX_SEO_AND_PERFORMANCE.md` do not cover the shader or the intro). The intro curtain delays the first view of the homepage by about one second on the first visit of a session.
- Safari / iOS, Firefox, screen readers, focus order inside the drawers after the focus-trap change, reduced-motion mode.
- Analytics events, form submissions, completed checkout (as in version 1).

**BLOCKED**
- GetLayers MCP (needs the owner's sign-in), so no library assets were used.

## Files added or changed in version 2

Added: `sections/lx2-marquee.liquid`. Changed: `assets/lx2.css`, `assets/lx2.js`, `sections/lx2-hero`, `lx2-header`, `lx2-cta`, `lx2-list`, `lx2-media-text`, `lx2-featured-product`, `lx2-product`, `lx2-products`, `lx2-reviews`, `lx2-faq`, `lx2-facts`, `lx2-dos-donts`, `lx2-page`, `lx2-footer`, `lx2-cart`, `lx2-cart-drawer`, `snippets/lx2-buybox`, `snippets/lx2-title`, `templates/index.json`, `templates/product.json`, `templates/page.contact.json`.

## Update, 18 November 2026 — hero with people in motion

After seeing the GetLayers "Stride Nine" layer, the owner asked for that idea only: athletes in motion across the whole hero, fitting a recovery, fitness and sport store. Everything else stays as it is. The cupping product and the extra widgets of that layer were explicitly not wanted.

- The home hero is now a full-bleed photograph of two sprinters at dusk. The floating product image, the ember shader in the hero and the product fact rail were removed; the rail now carries the four service assurances.
- Copy is brand-level: "כל אימון נגמר ברגע של שחרור." with "מכשירי התאוששות לבית: לפני האימון, אחריו, ובסוף יום ארוך." Primary button goes to all products.
- Motion: the photograph drifts slowly, moves a little against scroll, and sits under a soft blur that opens into a sharp window which trails the pointer ("move to focus", an original take on the interaction in the reference). On touch screens and under reduced motion the image is simply sharp.
- The header is transparent over the hero and becomes the glass bar once the page scrolls.
- The photograph (`assets/lx2-hero-runners.jpg`, 1920×1080, 195 KB) was generated with Canva's image generator at the owner's request. It shows no product, no text and no brand; two logo-like marks on the shoes were painted out. It lives only in the draft theme's assets. It is an AI-generated image of fictional people, not a photo of real athletes or customers.
- The layer itself was not copied: no asset, code or layout from GetLayers is in the theme (its MCP still needs the owner's sign-in).
- The section accepts a background image from the theme editor, so the picture can be replaced without code.

**Not done:** a moving video background. The reference uses real video; this version animates a still image. A 6–10 second looping clip of the same scene would be the next step. It needs a video generator (the owner offered Kling access) or the Canva video tool, which requires the owner's explicit approval because it uses the account's AI limit and outputs 720p at most.

## Update, 19 November 2026 — moving hero

- The owner generated a clip in Kling (image-to-video from the runners still) and supplied the file. It was 1280×720, 5 s, with audio and a "KlingAI 4.0" watermark in the bottom-right corner.
- Processing: audio removed; trimmed to the first 3.7 s, because the runners leave the frame after that; re-encoded (H.264, 691 KB).
- Hosting: uploaded to the store's Files through Shopify's video upload (staged upload + `fileCreate`). Shopify serves a 720p rendition from its CDN. This adds one file to Files; it does not touch the live theme.
- Hero behaviour: the still image paints first; the clip is fetched only after the page has loaded, fades in over the still, dissolves back to it shortly before the end and restarts, so the loop is a cross-fade rather than a jump. No video under reduced motion or data-saver; paused off-screen and when the tab is hidden.
- The "move to focus" blur was made lighter and its sharp window larger, so it does not hide the motion.
- TESTED in headless Chromium on the preview: the clip loads from the Shopify CDN, plays, fades out before the end and restarts. NOT TESTED: real phones, iOS Safari autoplay, mobile data cost.
- Known limits: the clip is 720p, so it is soft on large screens; the watermark is still in the file — in the hero it falls in the cropped, darkened bottom edge, but it is not removed. For publishing, replace it with a watermark-free 1080p export (one field in the hero section settings).
- One failed upload attempt (a generic file entry named `lx2-hero-runners.mp4`) is stuck in "processing" in Files and could not be deleted while pending; it can be removed from Content → Files.
