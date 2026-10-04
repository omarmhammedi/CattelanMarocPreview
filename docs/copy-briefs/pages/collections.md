# Brief: Collections (index)

## Page card

- **Route / CMS:** `/collections/` · `pages`, slug `collections`
- **Purpose:** Show the eight families and send the visitor to one.
- **Visitor:** Someone who wants to find the right family, or check a model.
- **Main action:** Open a family. Secondary: write on WhatsApp.
- **SEO intent:** "collections cattelan italia", "mobilier italien casablanca".

## What to read

`.agents/product-marketing.md` (rules and target style), `docs/copy-briefs/data/shared-facts.md` (fact ids used below),
`.agents/press-and-brand-sources.md`, `docs/copy-drafts/a-propos-2026-10-04.md` (style example). Output format and
drafting prompt: `docs/copy-briefs/README.md`. Do not read the live page or `docs/reference/`.

## Slots

| Slot | Role for the visitor | Limit | Facts |
|---|---|---|---|
| `eyebrow` | **FIXED** |  | "Cattelan Italia · Casablanca" |
| `title` | H1 | 8 words; contains "collections" and "Cattelan Italia" | C1 |
| `intro` | Says what the families furnish (the rooms, the objects) and that all the models can be ordered; no inventory opener | 40 words | C1, C2, C3 |
| `contact.text` | Invites the visitor to send a model name on WhatsApp | 30 words | CP1 below, SV13 |
| `contact.button` | **FIXED** |  | "Nous écrire" (WhatsApp link) |
| `professional.heading` | **FIXED** |  | "Architectes et décorateurs" |
| `professional.text` | Tells professionals what they get | 35 words | P1, P2 |
| `professional.button` | **FIXED** |  | "Voir les services professionnels" |
| `seo_title` | Title in search results | 60 characters | brand, place |
| `meta_description` | Snippet in search results | 155 characters | C1, C3 |

**CP1** Send the name of a model on WhatsApp: we say whether it is on display and in which finishes it exists, then prepare the quote. (site)

Family cards and their texts are written in `docs/copy-briefs/families/`.

## Not allowed

The facts of `product-marketing.md`, section 7 (no official-reseller claim, no models-on-display claim, no family or
team names, no warranty, no bedrooms or rugs). No sentence from the current site. No invented number.
