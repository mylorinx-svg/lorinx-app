# LORINX — Website Architecture

## 1. Technical approach

The live theme is Dawn with almost all content held as `custom-liquid` blobs inside JSON templates. The redesign replaces those blobs with real sections that have schemas, on an **unpublished duplicate** of the live theme.

- `layout/theme.liquid`, `config/*`, locales, Dawn's own assets and all app embeds are **unchanged** from the live theme. Analytics, web pixels, the Sense RTL app and Contentsquare keep loading exactly as before.
- New files are additive and prefixed `lx2`. Only section groups and templates were replaced.
- The header section loads `lx2.css`, `lx2.js` and the two font families, so no layout edit was needed.
- Product-specific copy lives in template settings with an "only for product" picker, because all four products use the default product template and this project may not edit products or metafields.

## 2. File map

| Path | Role |
| --- | --- |
| `assets/lx2.css`, `assets/lx2.js` | Design system and behaviour (10 KB of JS, no dependencies) |
| `snippets/lx2-buybox.liquid` | Price, quantity cards, add-to-cart form, assurances, payment icons |
| `snippets/lx2-card.liquid`, `lx2-title.liquid`, `lx2-icon.liquid` | Product card, display title, icons |
| `sections/lx2-header.liquid`, `lx2-footer.liquid`, `lx2-cart-drawer.liquid` | Global chrome |
| `sections/lx2-hero`, `lx2-facts`, `lx2-list`, `lx2-media-text`, `lx2-featured-product`, `lx2-products`, `lx2-reviews`, `lx2-faq`, `lx2-cta`, `lx2-dos-donts` | Content sections |
| `sections/lx2-product`, `lx2-collection`, `lx2-search`, `lx2-cart`, `lx2-page`, `lx2-contact`, `lx2-404` | Main template sections |
| `sections/header-group.json`, `footer-group.json` | Section groups |
| `templates/index, product, collection, search, cart, 404, page, page.about, page.contact, page.b2b` (`.json`) | Templates |
| `tools/build_templates.py` | Generates the JSON templates from one readable copy file |

Untouched templates: `article`, `blog`, `list-collections`, `password`, `gift_card`, customer templates, and the unused alternate product templates.

## 3. Homepage — section by section

| # | Section | Customer question | Message and headline | Visual | CTA | Mobile | Conversion role |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Announcement + header | Is this a real shop? | Free shipping · 14-day returns · 1-year warranty | Ink bar, bone header | Menu, search, cart | One line; third item drops under 360px | Baseline trust |
| 2 | Hero | What is this and is it for me? | שחרור לשרירים תפוסים. בבית, בזמן שלכם. | Device on a wooden table, warm light | לכוס הרוח החשמלית / איך זה עובד | Image, then headline and button in the first screen | Route to the hero product |
| 3 | Facts strip | What does it actually do? | 12 levels · heat and red light · cordless · auto-off | Line icons | — | 2×2 | Comprehension |
| 4 | How it works | Is it complicated? | שלושה צעדים, רבע שעה. | Dark section, large numerals | — | Stacked | Removes effort objection |
| 5 | Featured product | How much, and can I just buy it? | Product name, price, quantity cards | Product image + buy box | הוספה לסל | Image above buy box | Direct purchase |
| 6 | When to use | Where does it fit in my day? | רבע שעה שנכנסת לשגרה. | In-use photo | לכל הפרטים על כוס הרוח | Stacked | Relevance |
| 7 | Collection | What else is there? | ריקוברי ביתי, מכשיר לכל צורך. | Four cards | לכל המוצרים | 2 columns | Discovery |
| 8 | Customer messages | Did others buy and like it? | הודעות שקיבלנו. | Real WhatsApp screenshots | — | Horizontal scroll | Social proof |
| 9 | Story | Who is behind this? | לפעמים מותג לא מתחיל במוצר… | Sand band | לסיפור המלא / כמויות לחברות | Centred | Brand trust |
| 10 | Assurances | What if something goes wrong? | Shipping, returns, warranty, service | Facts strip | — | 2×2 | Risk reversal |
| 11 | FAQ | Delivery, returns, warranty, bulk | לפני שמזמינים. | Accordion | דברו איתנו | Stacked | Objections |
| 12 | Footer | — | Newsletter, navigation, policies, payment methods | Dark | הרשמה | Stacked | Retention, legal |

Left out on purpose: pop-ups, countdowns, a second trust-icon row, a hardcoded reviews carousel, a slideshow.

## 4. Product page

1. Breadcrumbs.
2. Gallery (all product media, first image is the LCP element) and buy box: brand, title, one-line promise, four key points, price, quantity cards, add to cart, three assurance rows with policy links, payment icons, accordions (description from Shopify, delivery, returns, warranty).
3. What is inside (five features).
4. In action (the existing product video, loaded only on play) — cupping device.
5. When to use.
6. Who it suits — cupping device.
7. What to expect — cupping device.
8. Why LORINX — cupping device.
9. Correct use (do / avoid) with a "who should not use" note.
10. Customer messages — cupping device.
11. FAQ (also output as FAQPage structured data).
12. Closing band that returns to the quantity cards.
13. Other products.

The massage gun, foot massager and thigh trainer get sections 3, 5, 9, 11 plus the shared 12–13. A JSON template may hold 25 sections; the product template uses 24.

## 5. Other templates

| Template | Structure |
| --- | --- |
| Collection | Title and intro, product count and sort, grid, pagination, assurances |
| Search | Search field, result count, grid, empty state with a route back |
| Cart | Line items with quantity steppers, summary card, secure checkout button, assurances, empty state |
| About | Page hero, origin, the four questions, values, trust band with CTAs |
| Contact | Page hero, Shopify contact form, email / WhatsApp / hours, FAQ |
| B2B | Page hero with quote CTA, audiences, terms, products, quote form |
| Default page | Title, the page's own content, product grid |
| 404 | Message, two routes, product grid |
| Policies | Rendered by Shopify; restyled through CSS only, legal text untouched |

## 6. Behaviour (`lx2.js`)

- Add to cart: `fetch` to `/cart/add.js`, then the drawer is re-rendered through the Section Rendering API and opened. If the request fails, the form submits normally.
- Quantity changes: `/cart/change.js`; the drawer re-renders, the cart page reloads.
- Checkout: an ordinary form post with `name="checkout"`. Checkout, payments and shipping are not touched.
- Variant choice updates the price, the button label, the sticky bar and the `?variant=` parameter.
- Without JavaScript every page still renders, forms post, accordions open.
