# Brief: guide « Composer un salon : canapé et fauteuil »

## Page card

- **Route / CMS:** `/journal/composer-salon-canape-fauteuil/` · `posts`, slug `composer-salon-canape-fauteuil`
- **Purpose:** help the visitor decide something concrete with measurements, using Cattelan Italia models as examples.
- **Visitor:** someone about to choose and order.
- **Main action:** open the family page of the models discussed.
- **Search intent:** "canapé casablanca", "canapé d'angle casablanca"; composing a living room.
- **Signed:** "Cattelan Italia Maroc" (team of the Casablanca showroom).

## What to read

`.agents/product-marketing.md` (rules and target style), `docs/copy-briefs/data/shared-facts.md` (fact ids used below),
`.agents/press-and-brand-sources.md`, `docs/copy-drafts/a-propos-2026-10-04.md` (style example). Output format and
drafting prompt: `docs/copy-briefs/README.md`. Do not read the live page or `docs/reference/`.

## Slots

| Slot | Role for the visitor | Limit | Facts |
|---|---|---|---|
| `title` | The visitor's question; keeps the search intent | 12 words | "canapé casablanca", "canapé d'angle casablanca"; composing a living room |
| `excerpt` | Card and snippet text: the topic and two useful numbers | 40 words | facts below |
| `section.1.heading` to `section.4.heading` | Each names an object or a measure to check | 6 words each | facts below |
| `section.1.text` to `section.4.text` | One check per section, ending on something the reader can do | 80 words each | facts below |
| `cta_text` | One line before the button (optional) | 20 words | family |
| `cta_label` | **FIXED** |  | "Voir les canapés et fauteuils" → `/collections/canapes-fauteuils/` |
| `seo_title` | Title in search results | 60 characters; contains "Cattelan Italia Maroc" | "canapé casablanca", "canapé d'angle casablanca"; composing a living room |
| `meta_description` | Snippet in search results | 155 characters | two numbers from the facts |

A guide has 4 sections. It names models only where the fact bank gives a number or a trait.

## Fact bank

- **G4.1** Draw the plan with the doors, the windows and the TV if it belongs to the living room. Report the length and depth of each seat. First benchmarks: 80 to 90 cm of passage and 40 to 45 cm between sofa and coffee table, to adapt to the chosen pieces. Then test the room: sit down, stand up, cross the usual passages. [usage]
- **G4.2** Craig, Douglas, Mykonos and Sinatra are composed in elements: straight, corner or a large composition. Craig has back cushions filled with feathers; Douglas stands on metal legs in two heights that leave the floor visible; Mykonos has rounded shapes; Sinatra has adjustable backs. Ruby is a straight sofa of 200 cm with an exposed ash frame.
- **G4.3** The Ruby Lounge armchair is 81 cm wide and takes the ash frame of Ruby. The two can be paired with different coverings or colours.
- **G4.4** Craig, Douglas, Mykonos and Sinatra come in removable fabric. The leather ranges are Glove, Magnifica, Nabuk and Perfetto. Compare the shades with a sample of the floor or the curtains. A photo does not render colours exactly.

## Official sources to keep at the end of the guide

- https://www.cattelanitalia.com/fr/products/75C6DB4B-1A99-400D-AEE7-9D5797651F05 (Ruby)
- https://www.cattelanitalia.com/fr/products/3BFE3570-1D83-4026-A81F-F0913AEE75BD (Ruby Lounge)
- catalogue canapés: https://download.cattelanitalia.com/catalogues/718.pdf

## Not allowed

The facts of `product-marketing.md`, section 7 (no official-reseller claim, no models-on-display claim, no family or
team names, no warranty, no bedrooms or rugs). No sentence from the current site. No invented number.
