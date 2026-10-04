# Brief: Journal (index)

## Page card

- **Route / CMS:** `/journal/` · `pages`, slug `journal`
- **Purpose:** Present the five guides and what each one helps to decide.
- **Visitor:** Someone choosing a table, chairs, a sofa or a storage unit.
- **Main action:** Open a guide.
- **SEO intent:** "conseils mobilier casablanca".

## What to read

`.agents/product-marketing.md` (rules and target style), `docs/copy-briefs/data/shared-facts.md` (fact ids used below),
`.agents/press-and-brand-sources.md`, `docs/copy-drafts/a-propos-2026-10-04.md` (style example). Output format and
drafting prompt: `docs/copy-briefs/README.md`. Do not read the live page or `docs/reference/`.

## Slots

| Slot | Role for the visitor | Limit | Facts |
|---|---|---|---|
| `eyebrow` | **FIXED** |  | "Cattelan Italia · Casablanca" |
| `title` | H1 | 8 words; contains "Journal" and "Cattelan Italia" | J1 |
| `intro` | Names the five topics and says who wrote them | 40 words | J1, "written by the Casablanca showroom team" |
| `catalogue.heading` | Says the catalogue can be downloaded | 8 words | K1 |
| `catalogue.button` | **FIXED** |  | "Télécharger le catalogue" |
| `seo_title` | Title in search results | 60 characters | brand, place |
| `meta_description` | Snippet in search results | 155 characters | J1, J2 |

The five guides are written in `docs/copy-briefs/guides/`; this page lists them with the titles and excerpts of those drafts.

## Not allowed

The facts of `product-marketing.md`, section 7 (no official-reseller claim, no models-on-display claim, no family or
team names, no warranty, no bedrooms or rugs). No sentence from the current site. No invented number.
