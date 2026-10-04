# Brief: Sur mesure

## Page card

- **Route / CMS:** `/sur-mesure/` · `pages`, slug `sur-mesure`
- **Purpose:** Show what can be customised and how, with real options and numbers.
- **Visitor:** Someone who wants a size or a finish that is not standard.
- **Main action:** Ask for a quote (WhatsApp).
- **SEO intent:** "mobilier sur mesure casablanca".

## What to read

`.agents/product-marketing.md` (rules and target style), `docs/copy-briefs/data/shared-facts.md` (fact ids used below),
`.agents/press-and-brand-sources.md`, `docs/copy-drafts/a-propos-2026-10-04.md` (style example). Output format and
drafting prompt: `docs/copy-briefs/README.md`. Do not read the live page or `docs/reference/`.

## Slots

| Slot | Role for the visitor | Limit | Facts |
|---|---|---|---|
| `eyebrow` | **FIXED** |  | "Sur mesure" |
| `title` | H1 | 10 words; contains "sur mesure" and "Cattelan Italia" | M1 |
| `intro` | What varies from one model to another | 35 words | M2, M3 |
| `options.format` | The format (one line) | 30 words | M3 |
| `options.plateau` | The top (one line) | 30 words | M4 |
| `options.piètement` | The base (one line) | 30 words | M5 |
| `options.revêtement` | The covering (one line) | 30 words | M6 |
| `samples.heading`, `samples.text` | Samples at the showroom | 6 words; 40 words | S3 |
| `lead_time.heading`, `lead_time.text` | The delay of a custom piece | heading must state the delay; 40 words | SV5, M2, SV3, SV6 |
| `materials.heading`, `materials.text` | Ceramic, glass or wood | 6 words; 50 words | M7 |
| `materials.button` | **FIXED** |  | "Lire l'article" (link to the guide on ceramic, glass and wood) |
| `seo_title` | Title in search results | 60 characters; contains "sur mesure" and "Casablanca" | brand, place |
| `meta_description` | Snippet in search results | 155 characters | M1, S3 |

The four `options.*` lines are a structured list (a label, then the options). Write each as one sentence that starts with the label.

## Not allowed

The facts of `product-marketing.md`, section 7 (no official-reseller claim, no models-on-display claim, no family or
team names, no warranty, no bedrooms or rugs). No sentence from the current site. No invented number.
