# Brief: famille Luminaires et lustres

## Page card

- **Route / CMS:** `/collections/luminaires/` · `families`, slug `luminaires`
- **Purpose:** help the visitor tell the 4 models apart and check the practical points before choosing.
- **Visitor:** someone choosing in this family, with a room to furnish.
- **Main action:** open a model page. The catalogue and showroom calls to action come from the template.
- **Models:** 4, listed below; their own texts are in `docs/copy-briefs/models/luminaires.md`.

## What to read

`.agents/product-marketing.md` (rules and target style), `docs/copy-briefs/data/shared-facts.md` (fact ids used below),
`.agents/press-and-brand-sources.md`, `docs/copy-drafts/a-propos-2026-10-04.md` (style example). Output format and
drafting prompt: `docs/copy-briefs/README.md`. Do not read the live page or `docs/reference/`.

## Slots

| Slot | Role for the visitor | Limit | Facts |
|---|---|---|---|
| `short_title` | **FIXED** |  | "Luminaires et lustres" |
| `title` | H1 | 10 words; contains "Luminaires et lustres" and "Cattelan Italia" | facts below |
| `card_text` | Text on the family card: the range and the number that helps choose | 20 words | facts below |
| `intro` | Counts the models, names them and says what distinguishes them | 45 words | facts below, model list |
| `content.1.heading` | Names the check (topic: "Height of a pendant", rewrite freely) | 6 words | LU2, LU3 |
| `content.1.text` | The practical check, ending on something the reader can do | 60 words | LU2, LU3 |
| `seo_title` | **FIXED** |  | "Luminaires et lustres Cattelan Italia à Casablanca · Cattelan Italia Maroc" |
| `meta_description` | Materials and models; "Showroom à Casablanca" | 155 characters | LU1, FAM1 |

## Models in this family

- **Aladdin**: suspension en verre artistique; seule ou en grappe; câble jusqu’à 250 cm
- **Cloudine**: suspension en verre artistique; seule ou en grappe; câble jusqu’à 300 cm
- **Paris**: suspension en verre artistique; seule ou en grappe; câble jusqu’à 250 cm
- **Bloom**: en suspension ou en lampadaire; variateur seulement sur certaines versions (O/LO et V/LV)

## Fact bank (family)

- **LU1** Four lights: the pendants Paris, Aladdin and Cloudine in artistic glass, alone or in a cluster of up to 12; Bloom as a pendant or a floor lamp.
- **LU2** Cable length up to 250 cm for Paris and Aladdin, 300 cm for Cloudine.
- **LU3** Measure the distance from ceiling to table, compare with the height of the light and the cable length, and locate the electrical outlet. [usage]
- **LU4** Bloom has a dimmer only on some versions (O/LO and V/LV). [official sheet]

## Common facts

- **FAM1** All the brand's finishes are shown at the showroom, as samples or on displayed pieces (S3).
- **FAM2** The whole catalogue can be ordered, on display or not (C3).
- **FAM3** Made in Italy, delivered 10 to 12 weeks at most after validation, installation included, delivery free in Casablanca (SV5, SV6).

Photo, alt text and caption: provisional until the 9 October shoot; not part of this brief. Full dimensions and finishes of each model: `models/luminaires.md` and `data/models-facts.json`.

## Not allowed

The facts of `product-marketing.md`, section 7 (no official-reseller claim, no models-on-display claim, no family or
team names, no warranty, no bedrooms or rugs). No sentence from the current site. No invented number.
