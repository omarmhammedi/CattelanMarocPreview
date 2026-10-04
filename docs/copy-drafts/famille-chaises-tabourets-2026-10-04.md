# Draft: famille Chaises et tabourets (4 October 2026)

Brief: `docs/copy-briefs/families/chaises-tabourets.md`. Route `/collections/chaises-tabourets/`, CMS `families`, slug
`chaises-tabourets`. Written from the brief, the shared fact bank and the model data only; the live page was not read.

## Page copy

**short_title:** Chaises et tabourets

**title:** Chaises et tabourets Cattelan Italia en cuir et en tissu

**card_text:** Quatre chaises de 62 à 64 cm de large, dont deux existent aussi en tabouret.

**intro:** Les chaises entrent au catalogue Cattelan Italia en 1989. La famille en compte quatre. Rhonda a un dossier plissé, Greta des accoudoirs prolongés, Miranda ML une coque enveloppante, et Zuleika est habillée de cuir. Rhonda et Greta existent aussi en tabouret.

**content.1.heading:** La chaise sous le plateau

**content.1.text:** Miranda ML place l'assise à 47 cm du sol, Zuleika à 46 cm. En largeur, Greta prend 62 cm, Rhonda et Miranda ML 63 cm, Zuleika 64 cm. Les accoudoirs prolongés de Greta doivent passer sous le plateau et sous sa ceinture. Mesurez la hauteur libre sous votre plateau, puis asseyez-vous au showroom pour juger l'assise.

**content.2.heading:** Cuir, similicuir, tissu ou micro-nubuck

**content.2.text:** Zuleika est habillée de cuir, en 21 teintes, sur une structure en acier. Rhonda et Miranda ML existent en 112 teintes de cuir, similicuir, tissu ou micro-nubuck. Greta reçoit les mêmes, plus les tissus des gammes T10 à T90 et les cuirs Magnifica, Nabuk et Perfetto. Au showroom, posez les échantillons contre la finition de la table choisie.

**seo_title:** Chaises et tabourets Cattelan Italia à Casablanca · Cattelan Italia Maroc

**meta_description:** Chaises Rhonda, Greta, Miranda ML et Zuleika en cuir, similicuir, tissu ou micro-nubuck. Showroom à Casablanca avec toutes les finitions en échantillons.

## Alternatives

**title**
- A: Chaises et tabourets Cattelan Italia, quatre modèles. Rationale: gives the count first, for a visitor who wants the whole family at a glance (CH1).
- B: Chaises et tabourets Cattelan Italia, de 62 à 64 cm. Rationale: names the width range, the number that decides how many chairs fit along a table (CH3).

**content.1.heading**
- A: Les accoudoirs passent-ils sous le plateau ? Rationale: the visitor's own question, answered in the text (CH4).
- B: Assise à 47 cm pour Miranda ML. Rationale: opens on a measure from the data (CH2); weaker because it names one
  model of four.

**content.2.heading**
- A: 21 teintes de cuir pour Zuleika. Rationale: opens on the one model with a single covering and its exact count.
- B: Quel revêtement pour l'assise ? Rationale: the visitor's question, answered model by model in the text.

## Sources

| Slot | Fact ids |
|---|---|
| short_title | FIXED |
| title | CH5 (leather, fabric) |
| card_text | CH1 (four models, Rhonda and Greta as stools), CH3 (62 to 64 cm), Miranda ML data (63 × 61 cm) |
| intro | Brand fact in `press-and-brand-sources.md` (1989: range widened to dining tables, chairs, shelving); CH1 |
| content.1.heading | CH4 (chair, armrests and tabletop) |
| content.1.text | CH2, CH3, Miranda ML data (63 × 61 cm), CH4, CH1 (Greta: accoudoirs prolongés), S6 (seat height judged on site) |
| content.2.heading | CH5 |
| content.2.text | CH5; Zuleika trait (habillée de cuir sur structure en acier) and data (cuir, 21); Rhonda and Miranda ML data (cuir mince 36 + cuir Glove 13 + similicuir 18 + tissu 31 + micro-nubuck 14 = 112); Greta data (same groups plus T10 to T90, magnifica, nabuk, perfetto); M6; CH6 |
| seo_title | FIXED |
| meta_description | CH1, CH5, FAM1 / S3 |

## Open points

- Linter, first run: 0 blocking, 4 review. Fixed all four: "plus de 100" (heading and text) replaced by the exact
  counts from the model data (21 for Zuleika, 112 for Rhonda and Miranda ML); the four-comma sentence was rewritten
  around those counts; the stool sentence repeated in card_text and intro was rewritten in card_text. Second run:
  1 blocking (content.2.text at 61 words), rewritten shorter. Final run: 0 blocking, 0 review.
- Counts: CH5 says "more than a hundred shades"; the copy gives the counts summed from the data (112 for Rhonda and
  Miranda ML). Greta's total is left out because her data lists both "tissu 31" and the T10 to T90 ranges, which
  may overlap. To check against the official spec sheet.
- [NEED: hauteur d'assise de Rhonda et de Greta] The data gives seat heights for Miranda ML (47 cm) and Zuleika
  (46 cm) only, so content.1 compares two of four. Not written as a gap in the page copy.
- [NEED: hauteur des accoudoirs de Greta] The reader is asked to measure the free height under the tabletop, but the
  site gives no armrest height to compare it with.
- [NEED: dimensions des tabourets Rhonda et Greta] No stool height or seat height in the data; the page states only
  that the stools exist.
- Miranda ML width: CH3 lists Greta, Rhonda and Zuleika; the 63 cm for Miranda ML comes from its model data
  (63 × 61 cm, same L × P order as Rhonda's 63 × 60 cm). Remove it if the owner wants CH3 only.
- "Les chaises entrent au catalogue en 1989": the brand page says the range widened to chairs in 1989. It does not
  date stools, so the year is kept out of the H1.
- Greta's leathers: the data lists Magnifica, Nabuk and Perfetto for Greta only; Rhonda and Miranda ML list cuir mince
  and cuir Glove. Worth a check on the official spec sheets.
- "Tissus des gammes T10 à T90": the codes come from M6 and the data; the page does not explain them. Owner to say
  whether a visitor knows these fabric ranges or the codes should stay on the model page only.
