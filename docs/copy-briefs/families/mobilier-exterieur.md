# Brief: famille Mobilier extérieur

## Page card

- **Route / CMS:** `/collections/mobilier-exterieur/` · `families`, slug `mobilier-exterieur`
- **Purpose:** help the visitor tell the 2 models apart and check the practical points before choosing.
- **Visitor:** someone choosing in this family, with a room to furnish.
- **Main action:** open a model page. The catalogue and showroom calls to action come from the template.
- **Models:** 2, listed below; their own texts are in `docs/copy-briefs/models/mobilier-exterieur.md`.

## What to read

`.agents/product-marketing.md` (rules and target style), `docs/copy-briefs/data/shared-facts.md` (fact ids used below),
`.agents/press-and-brand-sources.md`, `docs/copy-drafts/a-propos-2026-10-04.md` (style example). Output format and
drafting prompt: `docs/copy-briefs/README.md`. Do not read the live page or `docs/reference/`.

## Slots

| Slot | Role for the visitor | Limit | Facts |
|---|---|---|---|
| `short_title` | **FIXED** |  | "Mobilier extérieur" |
| `title` | H1 | 10 words; contains "Mobilier extérieur" and "Cattelan Italia" | facts below |
| `card_text` | Text on the family card: the range and the number that helps choose | 20 words | facts below |
| `intro` | Counts the models, names them and says what distinguishes them | 45 words | facts below, model list |
| `content.1.heading` | Names the check (topic: "Installation conditions", rewrite freely) | 6 words | OU2 |
| `content.1.text` | The practical check, ending on something the reader can do | 60 words | OU2 |
| `seo_title` | **FIXED** |  | "Mobilier extérieur Cattelan Italia à Casablanca · Cattelan Italia Maroc" |
| `meta_description` | Materials and models; "Showroom à Casablanca" | 155 characters | OU1, OU2, FAM1 |

## Models in this family

- **Greta Outdoor**: chaise en acier inoxydable 304, rembourrée; pour terrasse ou véranda couverte, à l’abri de la pluie et du soleil direct
- **Napoleon Keramik Outdoor**: table tout en céramique; pour terrasse ou véranda couverte, à l’abri de la pluie et du soleil direct

## Fact bank (family)

- **OU1** Two models: the Napoleon Keramik Outdoor table, all in ceramic, and the Greta Outdoor chair, in 304 stainless steel, upholstered.
- **OU2** Both are for a covered terrace or veranda, sheltered from rain and direct sun.

## Common facts

- **FAM1** All the brand's finishes are shown at the showroom, as samples or on displayed pieces (S3).
- **FAM2** The whole catalogue can be ordered, on display or not (C3).
- **FAM3** Made in Italy, delivered 10 to 12 weeks at most after validation, installation included, delivery free in Casablanca (SV5, SV6).

Photo, alt text and caption: provisional until the 9 October shoot; not part of this brief. Full dimensions and finishes of each model: `models/mobilier-exterieur.md` and `data/models-facts.json`.

## Not allowed

The facts of `product-marketing.md`, section 7 (no official-reseller claim, no models-on-display claim, no family or
team names, no warranty, no bedrooms or rugs). No sentence from the current site. No invented number.
