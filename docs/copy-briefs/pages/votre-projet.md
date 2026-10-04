# Brief: Commande et livraison (Votre projet)

## Page card

- **Route / CMS:** `/votre-projet/` · `pages`, slug `votre-projet`
- **Purpose:** Explain how an order works, from the first advice to the installation, and what it costs the client in time and money.
- **Visitor:** Someone about to order who wants to know the steps, the deposit, the delay and the delivery.
- **Main action:** Start a quote (WhatsApp or showroom).
- **SEO intent:** "commander mobilier italien maroc".

## What to read

`.agents/product-marketing.md` (rules and target style), `docs/copy-briefs/data/shared-facts.md` (fact ids used below),
`.agents/press-and-brand-sources.md`, `docs/copy-drafts/a-propos-2026-10-04.md` (style example). Output format and
drafting prompt: `docs/copy-briefs/README.md`. Do not read the live page or `docs/reference/`.

## Slots

| Slot | Role for the visitor | Limit | Facts |
|---|---|---|---|
| `eyebrow` | **FIXED** |  | "Votre projet" |
| `title` | H1 naming ordering and delivery | 8 words | SV1 |
| `intro` | The five steps and the delay in two sentences | 40 words | SV1, SV5 |
| `situation.1.heading` | **FIXED** |  | "Un meuble" |
| `situation.1.text` | One piece: advice with samples, then quote and follow-up | 40 words | SV1, SV2, SV13 |
| `situation.2.heading` | **FIXED** |  | "Une pièce ou toute la maison" |
| `situation.2.text` | A room or a whole house: plans, measurements, photos | 40 words | SV11 |
| `situation.3.heading` | **FIXED** |  | "Avec un architecte" |
| `situation.3.text` | The architect works with the showroom | 40 words | SV12 |
| `step.1.heading` | **FIXED** |  | "01 · Conseil" |
| `step.1.text` |  | 45 words | SV1, SV13, S3 |
| `step.2.heading` | **FIXED** |  | "02 · Devis détaillé" |
| `step.2.text` |  | 45 words | SV2, SV8 |
| `step.3.heading` | **FIXED** |  | "03 · Validation et acompte" |
| `step.3.text` |  | 45 words | SV3 |
| `step.4.heading` | **FIXED** |  | "04 · Fabrication en Italie" |
| `step.4.text` |  | 45 words | B7, M2, SV5, SV10 |
| `step.5.heading` | **FIXED** |  | "05 · Livraison et installation" |
| `step.5.text` |  | 45 words | SV6, SV10 |
| `payment.heading` | **FIXED** |  | "Moyens de paiement" |
| `payment.text` |  | 15 words | SV4 |
| `cancellation.heading` | Says what happens to a validated order | 5 words | SV7 |
| `cancellation.text` | Plain statement, no softening | 20 words | SV7 |
| `seo_title` | Title in search results | 60 characters; contains "Cattelan Italia" and "Maroc" | brand, place |
| `meta_description` | Snippet in search results | 155 characters | SV1, SV3, SV5, SV6 |

## Not allowed

The facts of `product-marketing.md`, section 7 (no official-reseller claim, no models-on-display claim, no family or
team names, no warranty, no bedrooms or rugs). No sentence from the current site. No invented number.
