# Brief: famille Tables et salles à manger

## Page card

- **Route / CMS:** `/collections/tables/` · `families`, slug `tables`
- **Purpose:** help the visitor tell the 9 models apart and check the practical points before choosing.
- **Visitor:** someone choosing in this family, with a room to furnish.
- **Main action:** open a model page. The catalogue and showroom calls to action come from the template.
- **Models:** 9, listed below; their own texts are in `docs/copy-briefs/models/tables.md`.

## What to read

`.agents/product-marketing.md` (rules and target style), `docs/copy-briefs/data/shared-facts.md` (fact ids used below),
`.agents/press-and-brand-sources.md`, `docs/copy-drafts/a-propos-2026-10-04.md` (style example). Output format and
drafting prompt: `docs/copy-briefs/README.md`. Do not read the live page or `docs/reference/`.

## Slots

| Slot | Role for the visitor | Limit | Facts |
|---|---|---|---|
| `short_title` | **FIXED** |  | "Tables et salles à manger" |
| `title` | H1 | 10 words; contains "Tables et salles à manger" and "Cattelan Italia" | facts below |
| `card_text` | Text on the family card: the range and the number that helps choose | 20 words | facts below |
| `intro` | Counts the models, names them and says what distinguishes them | 45 words | facts below, model list |
| `content.1.heading` | Names the check (topic: "Number of seats", rewrite freely) | 6 words | TB4, TB5 |
| `content.1.text` | The practical check, ending on something the reader can do | 60 words | TB4, TB5 |
| `content.2.heading` | Names the check (topic: "Ceramic, glass or wood", rewrite freely) | 6 words | TB6, TB7 |
| `content.2.text` | The practical check, ending on something the reader can do | 60 words | TB6, TB7 |
| `seo_title` | **FIXED** |  | "Tables et salles à manger Cattelan Italia à Casablanca · Cattelan Italia Maroc" |
| `meta_description` | Materials and models; "Showroom à Casablanca" | 155 characters | TB2, TB3, FAM1 |

## Models in this family

- **Botero Ker-Wood Round**: plateau en bois serti d’un disque central en céramique; version T : disque pivotant; base revêtue d’argile spatulée
- **Botero Keramik Round**: plateau rond en céramique; piètement galbé en polymère revêtu d’argile spatulée (Cairo, Oslo, Marrakech); plateau central pivotant en option
- **Botero Wood Round**: plateau rond en noyer Canaletto ou chêne brûlé; piètement galbé en polymère revêtu d’argile spatulée; plateau central pivotant en option
- **Botero Argile**: base Botero revêtue d’argile
- **Tyron Keramik**: piètement en acier en forme de X; plateau rectangulaire, biscuit ou boomerang
- **Butterfly Keramik**: base en ruban d’acier plié; plateau en céramique
- **Butterfly**: base en ruban d’acier plié; plateau en verre de 15 mm; base de 160 cm sous un plateau de 240 cm
- **Napoleon Keramik**: plateau et base centrale en céramique; plateau ovale 300 × 150 cm; jusqu’à 14 places
- **Skorpio**: plateau en verre; piètement en acier à lignes croisées; existe en carré 150 × 150 et 200 × 200 cm

## Fact bank (family)

- **TB1** Nine tables, round, square, rectangular or with softened corners, from the glass top of Skorpio to the curved base of Botero; up to 14 seats.
- **TB2** Round tables go up to 180 cm across, rectangular ones up to 320 cm.
- **TB3** Materials: glass, ceramic, wood, clay (the Botero base).
- **TB4** Count about 60 cm of tabletop per person, then check the chair width and the room the base leaves. [usage]
- **TB5** Measure the passage behind occupied chairs. [usage]
- **TB6** Glass shows the base. Wood comes in Canaletto walnut and burnt oak. Ceramic reproduces marble decors from Calacatta to Portoro, up to 19 depending on the model (check on the model).
- **TB7** Compare the decors as samples at the showroom.

## Common facts

- **FAM1** All the brand's finishes are shown at the showroom, as samples or on displayed pieces (S3).
- **FAM2** The whole catalogue can be ordered, on display or not (C3).
- **FAM3** Made in Italy, delivered 10 to 12 weeks at most after validation, installation included, delivery free in Casablanca (SV5, SV6).

Photo, alt text and caption: provisional until the 9 October shoot; not part of this brief. Full dimensions and finishes of each model: `models/tables.md` and `data/models-facts.json`.

## Not allowed

The facts of `product-marketing.md`, section 7 (no official-reseller claim, no models-on-display claim, no family or
team names, no warranty, no bedrooms or rugs). No sentence from the current site. No invented number.
