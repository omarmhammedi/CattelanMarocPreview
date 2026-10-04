# Brief: guide « Buffet ou bibliothèque pour le salon ? »

## Page card

- **Route / CMS:** `/journal/choisir-buffet-bibliotheque-salon/` · `posts`, slug `choisir-buffet-bibliotheque-salon`
- **Purpose:** help the visitor decide something concrete with measurements, using Cattelan Italia models as examples.
- **Visitor:** someone about to choose and order.
- **Main action:** open the family page of the models discussed.
- **Search intent:** "buffet maroc", "bibliothèque maroc"; choosing storage for a living room.
- **Signed:** "Cattelan Italia Maroc" (team of the Casablanca showroom).

## What to read

`.agents/product-marketing.md` (rules and target style), `docs/copy-briefs/data/shared-facts.md` (fact ids used below),
`.agents/press-and-brand-sources.md`, `docs/copy-drafts/a-propos-2026-10-04.md` (style example). Output format and
drafting prompt: `docs/copy-briefs/README.md`. Do not read the live page or `docs/reference/`.

## Slots

| Slot | Role for the visitor | Limit | Facts |
|---|---|---|---|
| `title` | The visitor's question; keeps the search intent | 12 words | "buffet maroc", "bibliothèque maroc"; choosing storage for a living room |
| `excerpt` | Card and snippet text: the topic and two useful numbers | 40 words | facts below |
| `section.1.heading` to `section.4.heading` | Each names an object or a measure to check | 6 words each | facts below |
| `section.1.text` to `section.4.text` | One check per section, ending on something the reader can do | 80 words each | facts below |
| `cta_text` | One line before the button (optional) | 20 words | family |
| `cta_label` | **FIXED** |  | "Voir les buffets et bibliothèques" → `/collections/buffets-bibliotheques/` |
| `seo_title` | Title in search results | 60 characters; contains "Cattelan Italia Maroc" | "buffet maroc", "bibliothèque maroc"; choosing storage for a living room |
| `meta_description` | Snippet in search results | 155 characters | two numbers from the facts |

A guide has 4 sections. It names models only where the fact bank gives a number or a trait.

## Fact bank

- **G5.1** A buffet is 45 to 55 cm deep, a bookcase 26 to 29 cm.
- **G5.2** To choose: list the dimensions of the crockery, the large books and the objects to store; compare them with the usable height and depth of the shelves; separate what you keep in a closed unit from what you want to show.
- **G5.3** Chelsea and Amsterdam are 46 cm deep, Kayak 53 cm. Leave room in front to open the doors fully and reach the shelves, and keep a passage.
- **G5.4** Chelsea comes in three heights (50, 75 and 100 cm) and in lengths from 137.5 to 248 cm. Amsterdam has two, three or four doors, up to 294 cm. Kayak has two or three doors, 147 or 220 cm. The shelves are glass. Kayak and Amsterdam can take an inner drawer for cutlery.
- **G5.5** Nautilus is 26 cm deep, made of steel modules of 100 × 100 cm to place side by side or stack, fixed to the wall or fitted with ballast depending on the configuration. Airport is 29 cm deep, with wall or ceiling fixings, in lengths from 60 to 310 cm.
- **G5.6** Placement: a buffet near the table eases service if its doors can open and the chairs can be pulled back. A bookcase can fill a wall or separate two spaces if the model and its fixing allow it. In both cases, check the passage around the piece. [usage]

## Official sources to keep at the end of the guide

- https://www.cattelanitalia.com/fr/products/B7E158FA-BF2D-484D-9F9A-0C3D14138E8E (Chelsea)
- https://www.cattelanitalia.com/fr/products/0BD758C3-F539-4263-BA05-CEB859A760A4 (Airport)

## Not allowed

The facts of `product-marketing.md`, section 7 (no official-reseller claim, no models-on-display claim, no family or
team names, no warranty, no bedrooms or rugs). No sentence from the current site. No invented number.
