# Brief: Architectes et décorateurs

## Page card

- **Route / CMS:** `/professionnels/` · `pages`, slug `professionnels`
- **Purpose:** Tell professionals what the showroom gives their projects and how to start.
- **Visitor:** Architect, interior decorator, hotel or restaurant owner.
- **Main action:** Ask for the trade conditions (form on the page).
- **SEO intent:** "architecte d'intérieur casablanca", "mobilier hôtellerie".

## What to read

`.agents/product-marketing.md` (rules and target style), `docs/copy-briefs/data/shared-facts.md` (fact ids used below),
`.agents/press-and-brand-sources.md`, `docs/copy-drafts/a-propos-2026-10-04.md` (style example). Output format and
drafting prompt: `docs/copy-briefs/README.md`. Do not read the live page or `docs/reference/`.

## Slots

| Slot | Role for the visitor | Limit | Facts |
|---|---|---|---|
| `eyebrow` | **FIXED** |  | "Projets" |
| `title` | **FIXED** |  | "Architectes et décorateurs" |
| `intro` | What the showroom offers a project | 45 words | P1 |
| `files.heading`, `files.text` | Spec sheets and 2D/3D files | 8 words; 30 words | P1 |
| `finishes.heading`, `finishes.text` | Finishes and samples at the showroom | 6 words; 40 words | S3, C3 |
| `clients.heading`, `clients.text` | Client meetings at the showroom | 8 words; 35 words | P2, S9 |
| `terms.heading` | Trade conditions block (no text: terms are not published) | 6 words | P5 |
| `terms.button` | **FIXED** |  | "Demander les conditions professionnelles" (link to the form on the page) |
| `follow_up.heading`, `follow_up.text` | One contact follows the order | 6 words; 30 words | SV10 |
| `order.heading`, `order.text` | How a quote works | 4 words; 45 words | P3 |
| `projects.heading`, `projects.text` | Kinds of project and where | 8 words; 30 words | P4 |
| `seo_title` | Title in search results | 60 characters; contains "Architectes et décorateurs", "Cattelan Italia" | brand, place |
| `meta_description` | Snippet in search results | 155 characters | P1, P2 |

## Not allowed

The facts of `product-marketing.md`, section 7 (no official-reseller claim, no models-on-display claim, no family or
team names, no warranty, no bedrooms or rugs). No sentence from the current site. No invented number.
