# LORINX — Design System (`lx2`)

Source of truth: `theme/assets/lx2.css`. Everything is scoped under `.lx2`, so Dawn's own CSS, the Sense RTL app and any app block are unaffected.

## 1. Colour

| Token | Value | Use | Contrast |
| --- | --- | --- | --- |
| `--lx-bg` | `#F5F2EC` | Page ground | — |
| `--lx-surface` | `#FBFAF7` | Raised sections, cards | — |
| `--lx-sand` | `#EBE5D9` | Quiet emphasis sections, image placeholders | — |
| `--lx-ink` | `#191816` | Text, primary button | 15.9:1 on bg |
| `--lx-ink-2` | `#5C574E` | Secondary text | 6.4:1 on bg, 5.7:1 on sand |
| `--lx-ink-3` | `#6E695F` | Breadcrumbs, tertiary | 4.9:1 on bg |
| `--lx-line` | `#DCD5C7` | Hairlines, input borders | — |
| `--lx-accent` | `#9A3324` | Eyebrows, small icons, cart count | 6.5:1 on bg |
| `--lx-accent-soft` / `--lx-accent-ink` | `#F0E2DA` / `#7C2619` | Tag chip | 7.7:1 |
| `--lx-dark` | `#171614` | Dark sections, footer, announcement | — |
| `--lx-on-dark` / `--lx-on-dark-2` | `#F5F2EC` / `#B9B2A5` | Text on dark | 15.9:1 / 8.6:1 |
| `--lx-ok` | `#2F6B4F` | Saving amount, success | 6.0:1 on surface |
| `--lx-err` | `#B3261E` | Errors | — |

Rules: the primary button is always ink. Red is never a background for bars, buttons or badges. One accent per screen.

## 2. Typography

- Display: **Frank Ruhl Libre** 400/500 — headings, numerals, quotes, FAQ questions.
- Body: **Heebo** 300–600 — everything else.
- Two families, six files. Sizes are fluid: H1 `clamp(38px, 6.2vw, 76px)` (hero capped at 64px), H2 `clamp(30px, 4.2vw, 52px)`, H3 21–26px, body 16px / 1.65, lead 17–20px, eyebrow 12px with 0.14em tracking.
- Dawn sets `html { font-size: 62.5% }`, so the system uses px and `clamp()`, never `rem`.
- The Sense RTL app injects `* { font-family: Arimo !important }`. The system re-applies fonts on every `.lx2` element through an inherited custom property (`--lx-ff`). To change a component's font, set `--lx-ff`, not `font-family`.

## 3. Space, grid, shape

- Container 1240px; gutter `clamp(20px, 4.4vw, 56px)`; section padding `clamp(64px, 9vw, 128px)`.
- Radius 4px everywhere (pills only for the tag chip and cart count). No shadows except the drawers. Hairlines instead of boxes.
- Single-column grids are declared `minmax(0, 1fr)` so long content can never widen the page.
- Breakpoints: 750px (grids), 900px (two-column editorial), 990px (header, product layout).

## 4. Components

| Component | Notes |
| --- | --- |
| Button `.lx-btn` | 54px min height (60px in the buy box), ink; `--ghost`, `--light`, `--block` variants; hover moves to dark oxide |
| Text link `.lx-link` | Underlined, arrow slides on hover |
| Header | Sticky, translucent bone; centred wordmark on mobile, inline nav from 990px; 44px icon targets |
| Panels | Menu (start side) and cart drawer (end side); Escape and veil close; focus returns to the opener |
| Quantity cards `.lx-opt` | Whole card is the radio label; total, per-unit price, saving; one factual tag |
| Gallery | Scroll-snap track, thumbnails; vertical thumbs on desktop; non-square images are letterboxed, not cropped |
| Sticky purchase bar | Appears after the main button leaves the viewport; hidden at the footer; not focusable while hidden |
| Accordion `.lx-acc` | Native `<details>`; works without JavaScript |
| Facts strip | Four short facts with a 1.5px line icon |
| List | Split / 2-col / 3-col / steps / timeline layouts |
| Forms | 52px inputs, visible labels, 16px text (no iOS zoom), inline success and error notes |

States: `:focus-visible` shows a 2px oxide outline with 3px offset on every interactive element. Loading buttons dim and ignore input. Disabled is 45% opacity. Motion is one 0.8s fade-and-rise on scroll and is removed under `prefers-reduced-motion`.

## 5. Icons

`snippets/lx2-icon.liquid`: 17 line icons, 24px grid, 1.5px stroke, `currentColor`, `aria-hidden`.

## 6. Imagery — current use and asset brief

Current pages use only existing files from the store. No image was generated and no product image was altered.

| # | Needed asset | Subject | Environment and light | Composition | Ratio | Placement |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Homepage hero | The real cupping device, powered on | Living room side table, late-afternoon window light, linen and wood | Device at the lower third, negative space for nothing (text is beside, not on, the image) | 4:5 and 1:1 | Home hero |
| 2 | In use, shoulders | Device on an upper back, person seated, face not needed | Same room, soft daylight | Three-quarter back view, device sharp, skin tones natural | 4:5 | "מתי משתמשים" |
| 3 | In hand, scale | Device held in an adult hand | Neutral warm background | Close, display readable | 1:1 | Gallery image 2 |
| 4 | What is in the box | Device, cable, manual and every included part, **in LORINX packaging or with no packaging** | Bone-coloured seamless, top light | Flat lay, items aligned to a grid | 3:2 | "למה LORINX", gallery |
| 5 | Controls | Close-up of the display and buttons | Dark-to-warm gradient is fine | Macro, shallow depth | 1:1 | Features |
| 6 | Other three products | One lifestyle and one clean product shot each, same room and light as #1 | — | Consistent horizon and scale across products | 4:5 and 1:1 | Cards and galleries |
| 7 | Short loop | 6–8 seconds: place, press, light on | Same set | Locked-off, no text baked in | 1:1, under 2 MB | Product page video block |

Rules for any new image: the real product only; no Hebrew text rendered by an AI model inside the image; no stock look; the same room and light across the catalogue.

## 7. Merchant customisation

Every section has a schema with Hebrew labels and appears in the theme editor under names starting with "LORINX". Text, images, links, background tone and per-product visibility are editable without code.
