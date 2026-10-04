# Brief: guide « Céramique, verre ou bois : quel plateau ? »

## Page card

- **Route / CMS:** `/journal/ceramique-verre-bois-choisir-finition-meuble/` · `posts`, slug `ceramique-verre-bois-choisir-finition-meuble`
- **Purpose:** help the visitor decide something concrete with measurements, using Cattelan Italia models as examples.
- **Visitor:** someone about to choose and order.
- **Main action:** open the family page of the models discussed.
- **Search intent:** "table céramique", "table à manger marbre maroc"; comparing tabletop materials.
- **Signed:** "Cattelan Italia Maroc" (team of the Casablanca showroom).

## What to read

`.agents/product-marketing.md` (rules and target style), `docs/copy-briefs/data/shared-facts.md` (fact ids used below),
`.agents/press-and-brand-sources.md`, `docs/copy-drafts/a-propos-2026-10-04.md` (style example). Output format and
drafting prompt: `docs/copy-briefs/README.md`. Do not read the live page or `docs/reference/`.

## Slots

| Slot | Role for the visitor | Limit | Facts |
|---|---|---|---|
| `title` | The visitor's question; keeps the search intent | 12 words | "table céramique", "table à manger marbre maroc"; comparing tabletop materials |
| `excerpt` | Card and snippet text: the topic and two useful numbers | 40 words | facts below |
| `section.1.heading` to `section.4.heading` | Each names an object or a measure to check | 6 words each | facts below |
| `section.1.text` to `section.4.text` | One check per section, ending on something the reader can do | 80 words each | facts below |
| `cta_text` | One line before the button (optional) | 20 words | family |
| `cta_label` | **FIXED** |  | "Voir les tables" → `/collections/tables/` |
| `seo_title` | Title in search results | 60 characters; contains "Cattelan Italia Maroc" | "table céramique", "table à manger marbre maroc"; comparing tabletop materials |
| `meta_description` | Snippet in search results | 155 characters | two numbers from the facts |

A guide has 4 sections. It names models only where the fact bank gives a number or a trait.

## Fact bank

- **G3.1** Ceramic: the Marmi decors reproduce notably Calacatta and Portoro, up to 18 depending on the model. On Napoleon Keramik and Rado Keramik the ceramic also covers the base; Napoleon Keramik Outdoor uses it for a covered terrace. For cleaning products and hot dishes, follow the notice of the model and of its finish.
- **G3.2** Glass: clear glass shows the oblique lines of Skorpio or the steel ribbon base of Butterfly. The glass tops of Westin and Nettuno are 12 mm thick, that of Butterfly 15 mm. MIST glass has a textured surface. Mirrored glass is used for the tops of Chelsea and Amsterdam and for the Cosmos and Glenn mirrors.
- **G3.3** Wood: Botero Wood Round comes in Canaletto walnut or burnt oak; Adrian Wood combines both on one top. Protect tops with coasters and a trivet.
- **G3.4** Samples and light: bring a sample of curtain, paint or tile to compare materials side by side. A photo taken by day helps to understand the room but does not render colours exactly. Compare shades in daylight and under the lighting planned at home.

## Official sources to keep at the end of the guide

- https://www.cattelanitalia.com/fr/products/B217DE70-0F32-41F5-975B-FD6273164AF8 (Skorpio)
- https://www.cattelanitalia.com/fr/products/DD24EC9D-FA00-4C0D-A989-9ADD6E56BFD0 (Napoleon Keramik)
- https://www.cattelanitalia.com/fr/products/B7E158FA-BF2D-484D-9F9A-0C3D14138E8E (Chelsea)
- brochures Keramik, Brushed, CrystalArt: https://www.cattelanitalia.com/fr/catalogues

## Not allowed

The facts of `product-marketing.md`, section 7 (no official-reseller claim, no models-on-display claim, no family or
team names, no warranty, no bedrooms or rugs). No sentence from the current site. No invented number.
