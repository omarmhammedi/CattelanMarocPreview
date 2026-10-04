# Brief: Accueil (home)

## Page card

- **Route / CMS:** `/` · collection `pages`, slug `home`
- **Purpose:** in a few seconds, say who stands behind the furniture, what the collections hold, where the showroom
  is, and send the visitor to the next step.
- **Visitor:** someone in Casablanca or elsewhere in Morocco who has just heard of the showroom, or searched for
  Italian or design furniture in Casablanca.
- **Main action:** open the collections. Secondary: visit the showroom, download the catalogue, read a guide.
- **SEO intent:** "cattelan italia maroc", "mobilier italien casablanca", "meuble design casablanca".
- **Style:** `.agents/product-marketing.md`, section 5. Worked example: `docs/copy-drafts/a-propos-2026-10-04.md`.

## Slots

| Slot | Role for the visitor | Limit | Facts allowed |
|---|---|---|---|
| `title` | **FIXED** (owner) | | "Le premier showroom exclusif Cattelan Italia au Maroc" |
| `intro` | **FIXED** (chosen by the client, 3 Oct 2026) | | "Fabriqués en Italie aux formats et finitions que vous choisissez, livrés et installés partout au Maroc." |
| `brand.heading` | Names who is behind the furniture | 6 words | B1 |
| `brand.text` | Gives the story in a few sentences: a person, a place, a year, a material | 40 words | B1 to B6 |
| `brand.caption` | Caption of the photo of the Skorpio table | 12 words | I1 |
| `collections.heading` | Says what the collections hold | 6 words | C1 |
| `collections.text` | Starts from an object or a material, then says that everything can be ordered (never describes the website) | 30 words | C1 to C4 |
| `collections.button` | **FIXED** | | "Voir les collections" |
| `showroom.label` | Short label of the showroom block | 5 words | S1 |
| `showroom.text` | Places the showroom and what you do there | 50 words | S1 to S5 |
| `showroom.button` | **FIXED** | | "Voir le showroom" |
| `catalogue.heading` | Makes clear the catalogue is a file to download | 8 words | K1 |
| `catalogue.button` | **FIXED** | | "Télécharger le catalogue" |
| `journal.heading` | Names the guides | 6 words | J1 |
| `journal.text` | Says what the five guides help to decide | 35 words | J1, J2 |
| `journal.button` | **FIXED** | | "Voir tous les guides" |
| `seo_title` | Title in search results | 60 characters | brand, place |
| `meta_description` | Snippet in search results | 155 characters | S1, B1, C1 |

## Fact bank

| Id | Fact | Source |
|---|---|---|
| B1 | Cattelan Italia was founded in 1979 by Giorgio and Silvia Cattelan. | brand site, press |
| B2 | Giorgio, youngest of seven brothers, grew up in his father's workshop, among wood. | brand site |
| B3 | The first pieces were tables in marble and glass. | brand site, press |
| B4 | The first plant opened in 1982 at Carrè, near Vicenza. | brand site, site |
| B5 | Paolo Cattelan, one of the founders' sons, has led the company since 2014. | brand site, press |
| B6 | The brand is present in more than 140 countries. | brand site, press |
| B7 | Every piece is made in Italy by a network of specialised companies around the maison. | brand site |
| C1 | 39 models in 8 families: tables et salles à manger, chaises et tabourets, canapés salons et fauteuils, tables basses et d'appoint, buffets et bibliothèques, consoles et miroirs, luminaires et lustres, mobilier extérieur. | site data |
| C2 | Each model page gives its formats, its finishes and a spec sheet. | site |
| C3 | The whole catalogue can be ordered, on display or not. | FAQ |
| C4 | Materials: glass, wood, ceramic, lacquers, hand-brushed metal, fabrics, leather. | brand site, FAQ |
| S1 | The showroom opened in September 2026. It covers 400 m² in the Triangle d'Or, Casablanca. | owner, press |
| S2 | Tables are shown with their chairs and lights, sofas with their coffee tables. | live site |
| S3 | All the brand's finishes are there, as samples or on displayed pieces. | FAQ |
| S4 | Free visit Monday to Saturday, appointment optional. Monday 12:00 to 19:30, Tuesday to Saturday 9:00 to 19:30. | FAQ |
| S5 | Valet service; the showroom has no private car park. | FAQ |
| K1 | The catalogue is a PDF to download. The file online is a demonstration until the final catalogue is ready. | site |
| J1 | Five guides: shape and size of a dining table; pairing table and chairs without matching everything; ceramic, glass or wood for a tabletop; composing a living room with a sofa and an armchair; choosing between a buffet and a bookcase. | site |
| J2 | The guides give measurements (for example 60 cm of tabletop per guest, 90 cm of passage) and the dimensions and materials of Cattelan Italia models. | site |
| I1 | The photo shows the Skorpio table: glass top, steel base. | site |

## Not allowed

The facts of section 7 in `product-marketing.md`: no "représentant officiel", no models-on-display claim, no
bedrooms or rugs, no family or team names, no warranty. No sentence from the current site.
