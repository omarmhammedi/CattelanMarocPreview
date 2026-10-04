# Draft: guide table forme et taille (4 October 2026)

## Page copy

**title:** Quelle forme et quelle taille pour une table de salle à manger ?

**excerpt:** Autour d'une table de salle à manger, on compte 60 cm de plateau par convive et 90 cm de passage. Skorpio, Napoleon Keramik et Butterfly servent d'exemples pour la forme du plateau et le piètement.

**section.1.heading:** 60 cm de plateau par convive

**section.1.text:** À table, l'usage compte 60 cm de plateau par convive. Le nombre réel de places dépend ensuite de la largeur des chaises, de la forme du plateau et du piètement. Une chaise Zuleika mesure 64 cm de large, une Miranda ML 63 cm. Divisez la longueur du plateau par 60 pour un premier compte, puis refaites le calcul avec la largeur de la chaise choisie.

**section.2.heading:** Le passage de 90 cm

**section.2.text:** Dans une pièce vide de 4 × 3,5 m, 90 cm de passage sur les quatre côtés laissent au centre un rectangle de 220 × 170 cm. Ce premier plan se corrige avec les portes, les autres meubles et les chaises choisies. Sur le plan, vérifiez le passage derrière une chaise occupée. Dans la pièce, tracez le contour du plateau au ruban de masquage, posez-y vos chaises actuelles et refaites le test.

**section.3.heading:** Un plateau rond, carré ou ovale

**section.3.text:** Une pièce presque carrée reçoit une table carrée, comme Skorpio en 150 × 150 ou 200 × 200 cm, une pièce longue un rectangle. À longueur et largeur égales, un ovale comme celui de Napoleon Keramik, 300 × 150 cm, prend moins de place aux angles. À une table ronde, les convives se répartissent autour du centre, et l'écart entre eux grandit avec le diamètre. Apportez au showroom la longueur et la largeur de la pièce, avec quelques photos.

**section.4.heading:** Le piètement sous le plateau

**section.4.text:** Le piètement décide des places. Une base centrale, comme sur Napoleon Keramik ou Botero, dégage les angles du plateau. Sur Butterfly, un piètement de 160 cm en ruban d'acier porte un plateau de 240 cm. À chaque bout, il reste 40 cm pour une chaise en tête de table. Vérifiez l'emprise de la base sur le plan coté. Envoyez la photo du tracé et les mesures de la pièce sur WhatsApp, et le conseiller propose les formats qui conviennent.

**cta_text:** Skorpio existe en 14 formats, et Napoleon Keramik en 10 tailles, de 200 à 320 cm.

**cta_label:** Voir les tables

**seo_title:** Table de salle à manger à Casablanca · Cattelan Italia Maroc

**meta_description:** Forme et taille d'une table de salle à manger, avec 60 cm de plateau par convive et 90 cm de passage. Le guide du showroom Cattelan Italia de Casablanca.

**sources:** https://www.cattelanitalia.com/fr/products/B217DE70-0F32-41F5-975B-FD6273164AF8 (Skorpio) · https://www.cattelanitalia.com/fr/products/DD24EC9D-FA00-4C0D-A989-9ADD6E56BFD0 (Napoleon Keramik)

## Alternatives

**title**
- A: Table de salle à manger à Casablanca, quelle forme et quelle taille ?
- B: Combien de places et quelle forme pour une table de salle à manger ?

**section.1.heading**
- A: La longueur du plateau et les places
- B: 60 cm par convive autour du plateau

**section.2.heading**
- A: Une pièce de 4 × 3,5 m
- B: Le passage derrière une chaise occupée

**section.3.heading**
- A: La forme du plateau et la pièce
- B: Le plateau ovale de Napoleon Keramik

**section.4.heading**
- A: Une base centrale ou un ruban d'acier
- B: Le piètement de 160 cm de Butterfly

## Sources

| Slot | Fact ids |
|---|---|
| title | brief search intent (shape and size) |
| excerpt | G1.1, G1.2, G1.6, G1.7 |
| section.1.heading | G1.1 |
| section.1.text | G1.1, G1.4; chaises-tabourets.md (Zuleika 64 cm, Miranda ML 63 cm of width); C2 (model page gives the formats) |
| section.2.heading | G1.2 |
| section.2.text | G1.2, G1.3, G1.9 (masking tape, current chairs) |
| section.3.heading | G1.5 |
| section.3.text | G1.5, G1.6; S8 (bring the room dimensions and photos) |
| section.4.heading | G1.7 |
| section.4.text | G1.7, G1.9 (photo and room measurements on WhatsApp, advisor proposes formats) |
| cta_text | C2; tables.md (spec sheet downloadable on each page) |
| cta_label | FIXED |
| seo_title | brief search intent "table salle à manger casablanca" |
| meta_description | G1.1, G1.2; S1 (showroom in Casablanca) |
| sources | brief, official sources |

## Open points

- No [NEED] item: every sentence comes from the brief's fact bank, the shared facts or the model data.
- G1.8 (tables 74 to 75 cm high, seats at 46 or 47 cm) is left out on purpose. `models/tables.md` gives Botero Keramik
  Round at 73 and 73,5 cm, so "74 to 75 cm" does not hold for every table. To fix in the brief before using it.
- section.4.text sends the reader to the "plan coté" (G1.7). The model data only says a spec sheet can be downloaded;
  confirm that it carries a dimensioned plan with the footprint of the base, then the text can say where to find it.
- section.1.text: "Divisez la longueur du plateau par 60" applies the G1.1 rule of thumb; no seat count is computed,
  so no number is invented. The chair widths (Zuleika 64 cm, Miranda ML 63 cm) come from `models/chaises-tabourets.md`;
  both chairs are named in G1.8.
- title: the question keeps "forme et taille" but not "Casablanca" (alternative A has it). The seo_title carries
  "Casablanca" instead, at exactly 60 characters; it gives up "forme et taille", which the meta description takes.
- cta_text names no model, so it stays true for the 9 models of the family (each page has its spec sheet).
- Lint: first run 0 blocking, 4 review (two "environ 60" vague quantities, a 30-word sentence, a cta_text with four
  commas). All four were rewritten from the facts. Final run: 0 blocking, 0 review.

## Style pass, 4 October 2026

Owner feedback on the live preview: no sentence about the website itself, no heading built on a count, no inventory opener. Done with the `copy-editing` skill; facts unchanged.

- `cta_text`: "La page de chaque table donne ses formats et ses finitions, avec une fiche technique à télécharger." → "Skorpio existe en 14 formats, et Napoleon Keramik en 10 tailles, de 200 à 320 cm."
- body: "puis refaites le calcul avec la largeur de la chaise choisie, indiquée sur la page du modèle." → "puis refaites le calcul avec la largeur de la chaise choisie."
