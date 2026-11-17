# LORINX — Conversion Strategy

Principle: sell through clarity, trust and perceived value. No pop-ups, timers, scarcity or manipulative defaults.

## 1. Journey map

| Stage | Intention | Friction found on the live site | Trust need | Change in the draft | Status |
| --- | --- | --- | --- | --- | --- |
| Ad → landing | "Is this what I saw?" | Heavy page (17.5 MB), red discount framing | Same product, same promise | Product page weight 1.6 MB; first image is prioritised; promise line under the title | IMPLEMENTED, measured |
| Understanding | "What does it do?" | Long title, benefits mixed with claims | Plain facts | Four key points before the price; trimmed display title | IMPLEMENTED |
| Offer | "How much for one, two, three?" | Percent badges, invented compare prices, different preselection on home and product page | Verifiable numbers | Quantity cards: total, per-unit, shekels saved; one unit preselected everywhere | IMPLEMENTED |
| Reassurance | "What if?" | Trust icons repeated 3–4 times, policies far away | Policies at the decision point | Three rows with policy links under the button; accordions for delivery, returns, warranty | IMPLEMENTED |
| Add to cart | "Did it work?" | Full reload to `/cart` | Clear confirmation | Drawer opens with the line, subtotal and checkout button | IMPLEMENTED, tested |
| Long page | "Where is the button?" | No persistent CTA | — | Sticky bar with the chosen quantity and price | IMPLEMENTED, tested |
| Cart | "Is the total right?" | — | Secure, no surprises | Summary card, "משלוח: חינם", secure checkout button, assurances | IMPLEMENTED, tested |
| Checkout | Pay | Not in scope | — | Untouched Shopify checkout | TESTED hand-off only |

## 2. Why each decision should help

1. **One unit preselected.** Honest default; the live homepage preselected two units while the product page preselected one.
2. **Savings in shekels, not percent.** Concrete and checkable against the unit price on the same card.
3. **Trust once, at the button.** Baymard: shipping and returns information is looked for on the product page and missed in banners.
4. **Drawer instead of redirect.** Keeps the shopper on the page and shows the result of the action immediately.
5. **Lighter page.** The video loads on play instead of on page load, which matters most on mobile data from Meta ads.
6. **Removing unverifiable proof.** A fake-looking rating is a larger risk to trust than no rating.

## 3. What was deliberately not built

- Upsell carousel in the cart, free-shipping progress bar (shipping is always free), exit pop-ups, discount field emphasis, dynamic checkout buttons on the product page (they skip the cart and were not on the live site).
- Calendar delivery dates: needs a business-day and holiday calendar; a wrong date is worse than a range.

## 4. Measurement plan (not started — needs the owner)

Nothing has been measured on real visitors; the draft is unpublished. After approval:

| Metric | Source | Compare |
| --- | --- | --- |
| Add-to-cart rate, product page | Shopify analytics | 14 days before vs 14 days after publish |
| Cart → checkout rate | Shopify analytics | same |
| Conversion rate, mobile | Shopify analytics | same |
| Units per order (1 / 2 / 3) | Orders | same; watch for a drop in 2-unit orders now that 1 is preselected |
| Bounce on product page from Meta | Meta + Shopify sessions | same |

If the share of 2-unit orders falls and revenue per session with it, test preselecting 2 units with the same honest framing. That is a business decision, not a design one.

## 5. Risks

- Removing the rating line and quotes may lower conversion in the short term if visitors relied on them. The fix is real reviews (a free review app and a post-delivery email), not restoring unverifiable ones.
- The preview could not be shown to real customers, so every expected gain above is a hypothesis.
