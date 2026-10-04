# Draft: guide table et chaises (4 October 2026)

## Page copy

**title:** Comment associer une table et des chaises sans tout assortir ?

**excerpt:** Une table et des chaises s'accordent par une pièce au dessin marqué, une finition partagée et des assises qui glissent dessous. Les chaises Greta, larges de 62 cm, partagent quatre laques gaufrées avec le piètement de Tyron Keramik.

**section.1.heading:** Le piètement ou le dossier plissé

**section.1.text:** Autour d'une table, une seule pièce porte le dessin. Des chaises simples laissent voir le piètement en X de Tyron Keramik ou la base galbée de Botero, revêtue d'argile. Face à une table plus sobre, le dossier plissé de Rhonda attire le regard. Sur les pages des deux modèles, regardez le piètement de la table puis le dossier de la chaise, et laissez un seul des deux porter le dessin.

**section.2.heading:** Quatre laques gaufrées en commun

**section.2.text:** Le bronze gaufré du piètement de Tyron Keramik se retrouve sur celui de la chaise Greta, comme le titane, le graphite et le noir. Une laque partagée relie la table et les chaises quand les deux modèles la proposent. Rhonda prend ces mêmes laques, ou un chrome. Sur la page de chaque modèle, relevez les finitions du piètement et gardez celles qui reviennent des deux côtés.

**section.3.heading:** Le cuir et la céramique Portoro

**section.3.text:** Un cuir de chaise dans le ton d'une céramique Portoro ou d'un noyer Canaletto relie la chaise au plateau par la couleur. Le revêtement se choisit aussi selon l'usage. Rhonda existe en 112 teintes de cuir, de similicuir, de tissu et de micro-nubuck. Pour une table servie chaque jour, lisez les notes d'entretien de chaque finition. Au showroom, comparez ensemble l'échantillon de cuir et celui du plateau, à la lumière du jour.

**section.4.heading:** Les accoudoirs sous le plateau

**section.4.text:** Greta mesure 62 cm de large, Rhonda 63 cm et Zuleika 64 cm. Pour placer les assises, comptez cette largeur et repérez la position du piètement sous le plateau. Les accoudoirs prolongés de Greta demandent une mesure de plus. Une chaise peut convenir par sa hauteur d'assise et buter pourtant contre le plateau ou ses traverses. Mesurez le dégagement sous le plateau, traverses comprises, puis comparez-le à la hauteur des accoudoirs.

**cta_text:** Rhonda et Greta existent aussi en tabouret. Chaque modèle a sa page, avec ses dimensions et ses revêtements.

**cta_label:** Voir les chaises

**seo_title:** Comment associer table et chaises · Cattelan Italia Maroc

**meta_description:** Associer table et chaises sans tout assortir, avec une laque commune, une couleur reprise et des chaises de 62 à 64 cm de large qui glissent sous le plateau.

**sources:** https://www.cattelanitalia.com/fr/products/41ED48AE-E379-4863-8E3C-28EE1D985390 (Rhonda) · https://www.cattelanitalia.com/fr/products/A73FA6B3-0BA9-4F13-ADB6-FBAFC6E39BBF (Greta)

## Alternatives

**title**
- A: Associer une table et des chaises, faut-il tout assortir ?
- B: Quelles chaises choisir pour une table sans tout assortir ?

**section.1.heading**
- A: Une seule pièce au dessin marqué
- B: Le piètement en X de Tyron Keramik

**section.2.heading**
- A: Le bronze gaufré des deux piètements
- B: Une laque sur table et chaises

**section.3.heading**
- A: Le cuir au ton du Portoro
- B: Le revêtement de Rhonda

**section.4.heading**
- A: 62 à 64 cm de large
- B: Le dégagement sous le plateau

## Sources

| Slot | Fact ids |
|---|---|
| title | brief search intent "associer table et chaises", pairing without matching everything |
| excerpt | G2.1, G2.3, G2.5 |
| section.1.heading | G2.1, G2.2 |
| section.1.text | G2.1, G2.2; tables.md (Tyron Keramik steel X base, Botero curved base coated in clay); C2 (model pages) |
| section.2.heading | G2.3 |
| section.2.text | G2.1, G2.3; tables.md and chaises-tabourets.md (finish lists); C2 (finishes on each model page) |
| section.3.heading | G2.4 |
| section.3.text | G2.4, G2.7; chaises-tabourets.md (Rhonda covering groups, 112 shades counted) |
| section.4.heading | G2.6 |
| section.4.text | G2.5, G2.6; chaises-tabourets.md (Greta "accoudoirs prolongés") |
| cta_text | chaises-tabourets.md (Rhonda and Greta also as stools); C2 |
| cta_label | FIXED |
| seo_title | brief search intent "associer table et chaises" |
| meta_description | G2.1, G2.3, G2.4, G2.5 |
| sources | brief, official sources |

## Open points

- No [NEED] item: every sentence comes from the brief's fact bank, the shared facts or the model data.
- section.3.text says "112 teintes" for Rhonda. G2.7 says "more than a hundred"; the linter flags that as a vague
  quantity, so the figure was counted in `models/chaises-tabourets.md`: cuir mince 36, cuir Glove 13, similicuir 18,
  tissu 31, micro-nubuck 14, total 112. To confirm: if the Glove leathers are already part of the 36 thin leathers,
  the total is 99 and both the figure and G2.7 must change.
- section.2.text: the four shared lacquers were checked in the model data (GFM11 titane, GFM18 bronze, GFM69 graphite,
  GFM73 noir on the base of Tyron Keramik and on Greta; Greta also has GFM70 pearl, Tyron Keramik does not). Rhonda's
  structure has the same lacquers plus 08 chrome. G2.3 says "frame of Greta"; the data calls it the base, so the text
  says "piètement".
- section.4.text: no armrest height or clearance under the top exists in the data (Greta: 62 × 62 cm, hauteur 78 cm).
  The text gives the check without a figure. If the spec sheets give armrest heights, a number could be added.
  Greta's "accoudoirs prolongés" (model trait) is the example; the text does not say it fails to fit any table.
- section.1.text points the reader to the model pages (C2) to compare the base and the back; it does not say which
  pieces are on display at the showroom.
- cta_text names only Rhonda and Greta (named in the fact bank) and their stool versions (model trait).
- Lint: first run 2 blocking (cliché "côte à côte", twice) and 1 review ("plus de cent"). All three were rewritten
  from the facts. Final run: 0 blocking, 0 review.
