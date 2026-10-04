# Brief: Showroom Casablanca

## Page card

- **Route / CMS:** `/showroom-casablanca/` · `pages`, slug `showroom-casablanca`
- **Purpose:** Let the visitor picture the place and prepare a visit.
- **Visitor:** Someone deciding whether to come, or a person outside Casablanca who wants to choose remotely.
- **Main action:** Visit the showroom or write on WhatsApp. The phone, hours and map block comes from the template.
- **SEO intent:** "showroom meuble casablanca", "magasin meuble casablanca", "showroom cattelan italia casablanca".

## What to read

`.agents/product-marketing.md` (rules and target style), `docs/copy-briefs/data/shared-facts.md` (fact ids used below),
`.agents/press-and-brand-sources.md`, `docs/copy-drafts/a-propos-2026-10-04.md` (style example). Output format and
drafting prompt: `docs/copy-briefs/README.md`. Do not read the live page or `docs/reference/`.

## Slots

| Slot | Role for the visitor | Limit | Facts |
|---|---|---|---|
| `eyebrow` | **FIXED** |  | "Cattelan Italia · Casablanca" |
| `title` | H1: names the place and the brand | 10 words; must contain "showroom", "Cattelan Italia", "Casablanca" | S1 |
| `intro` | Says what the place holds | 45 words | S1, S2, S3, S11 |
| `body.1.heading`, `body.1.text` | What you can try and check on site | 6 words; 60 words | S2, S3, S6 |
| `body.2.heading`, `body.2.text` | For architects and decorators | 6 words; 45 words | S9 |
| `cities.heading`, `cities.text` | Project in another city | 8 words; 40 words | SV9 |
| `faq.1.question` | **FIXED** |  | "Tous les modèles sont-ils exposés ?" |
| `faq.1.answer` |  | 40 words | S7, C3 |
| `faq.2.question` | **FIXED** |  | "Comment obtenir un devis et un délai ?" |
| `faq.2.answer` |  | 40 words | S10, SV5 |
| `faq.3.question` | **FIXED** |  | "Peut-on préparer son choix avant de venir ?" |
| `faq.3.answer` |  | 40 words | S8 |
| `faq.4.question` | **FIXED** |  | "Livrez-vous hors de Casablanca ?" |
| `faq.4.answer` |  | 40 words | SV6 |
| `contact.note` | One line near the phone number: how to know if a model is on display, or get a quote | 25 words | S7, S8, BZ3 |
| `seo_title` | Title in search results | 60 characters; contains "Showroom Cattelan Italia" and "Casablanca" | brand, place |
| `meta_description` | Snippet in search results | 155 characters | S1, S3 |

Photos: the page photo and its alt text are provisional until the 9 October shoot. Not part of this brief.

## Not allowed

The facts of `product-marketing.md`, section 7 (no official-reseller claim, no models-on-display claim, no family or
team names, no warranty, no bedrooms or rugs). No sentence from the current site. No invented number.
