# Brief: guide « Table de salle à manger : forme et taille »

## Page card

- **Route / CMS:** `/journal/choisir-forme-proportions-table-salle-a-manger/` · `posts`, slug `choisir-forme-proportions-table-salle-a-manger`
- **Purpose:** help the visitor decide something concrete with measurements, using Cattelan Italia models as examples.
- **Visitor:** someone about to choose and order.
- **Main action:** open the family page of the models discussed.
- **Search intent:** "table salle à manger casablanca"; choosing the shape and size.
- **Signed:** "Cattelan Italia Maroc" (team of the Casablanca showroom).

## What to read

`.agents/product-marketing.md` (rules and target style), `docs/copy-briefs/data/shared-facts.md` (fact ids used below),
`.agents/press-and-brand-sources.md`, `docs/copy-drafts/a-propos-2026-10-04.md` (style example). Output format and
drafting prompt: `docs/copy-briefs/README.md`. Do not read the live page or `docs/reference/`.

## Slots

| Slot | Role for the visitor | Limit | Facts |
|---|---|---|---|
| `title` | The visitor's question; keeps the search intent | 12 words | "table salle à manger casablanca"; choosing the shape and size |
| `excerpt` | Card and snippet text: the topic and two useful numbers | 40 words | facts below |
| `section.1.heading` to `section.4.heading` | Each names an object or a measure to check | 6 words each | facts below |
| `section.1.text` to `section.4.text` | One check per section, ending on something the reader can do | 80 words each | facts below |
| `cta_text` | One line before the button (optional) | 20 words | family |
| `cta_label` | **FIXED** |  | "Voir les tables" → `/collections/tables/` |
| `seo_title` | Title in search results | 60 characters; contains "Cattelan Italia Maroc" | "table salle à manger casablanca"; choosing the shape and size |
| `meta_description` | Snippet in search results | 155 characters | two numbers from the facts |

A guide has 4 sections. It names models only where the fact bank gives a number or a trait.

## Fact bank

- **G1.1** About 60 cm of tabletop per guest. [usage]
- **G1.2** About 90 cm of passage around the table. In an empty room of 4 × 3.5 m, 90 cm on the four sides leaves a rectangle of 220 × 170 cm. That sum gives a first layout; doors, other furniture and the chosen chairs still count. [usage]
- **G1.3** Test the passage behind an occupied chair on the plan, then on site. [usage]
- **G1.4** The number of seats depends on the width of the chairs, the shape of the top and the base.
- **G1.5** A round table spreads guests around the centre, and the distance between them grows with the diameter. A square table suits a room of near-square proportions, a rectangle a long room. At equal length and width, an oval top takes less room at the corners. [usage]
- **G1.6** Skorpio exists in square formats of 150 × 150 and 200 × 200 cm. Napoleon Keramik has an oval top of 300 × 150 cm.
- **G1.7** The base decides where one can sit. A central base, as on Napoleon Keramik or Botero, frees the corners of the top; check its footprint on the dimensioned plan. On Butterfly the steel ribbon base measures 160 cm under a 240 cm top, leaving 40 cm at each end for a seat at the head of the table.
- **G1.8** Cattelan Italia tables are 73 to 75 cm high (Botero Keramik Round 73 and 73.5 cm, the others 74 or 75 cm; corrected 4 Oct from the model data); the chairs have seats at 46 or 47 cm (Miranda ML 47, Zuleika 46).
- **G1.9** Before ordering: trace the outline of the top on the floor with masking tape and set the current chairs on it. Send a photo of the layout and the room measurements to the showroom on WhatsApp; the advisor proposes the formats that fit.

## Official sources to keep at the end of the guide

- https://www.cattelanitalia.com/fr/products/B217DE70-0F32-41F5-975B-FD6273164AF8 (Skorpio)
- https://www.cattelanitalia.com/fr/products/DD24EC9D-FA00-4C0D-A989-9ADD6E56BFD0 (Napoleon Keramik)

## Not allowed

The facts of `product-marketing.md`, section 7 (no official-reseller claim, no models-on-display claim, no family or
team names, no warranty, no bedrooms or rugs). No sentence from the current site. No invented number.
