# Draft: modèles Consoles et miroirs (4 October 2026)

## Page copy

**glenn.description:** Glenn est un miroir aux bords courbés, qui se place au sol ou au mur. Il existe en carré de 120 × 120 cm et en rectangle de 80 × 190 cm.

**glenn.content:** Le carré et le rectangle ont la même épaisseur, 8 cm. Le verre se commande en trois finitions : miroité, miroité fumé ou miroité bronze.

**cosmos.description:** Cosmos est un miroir aux bords courbés, en verre miroité. Il se commande en 120 cm ou en 157 cm de diamètre.

**cosmos.content:** Le verre se choisit en deux teintes, miroité fumé ou miroité bronze. Le miroir mesure 11 cm d'épaisseur, quel que soit son diamètre.

**rado-keramik.description:** Rado Keramik est une console tout en céramique. Elle mesure 127 × 38 cm ou 157 × 38 cm, hauteur 73 cm.

**rado-keramik.content:** Le plateau et le piètement prennent un décor de céramique Marmi. Les cinq décors proposés sont KM07 Portoro opaque, KM18 Borghini Calacatta opaque, KM21 Colosseo, KM24 Invisible opaque et KM26 Taj Mahal. La console se fixe au mur.

**nettuno.description:** Nettuno est une console sur piètement ondulé, avec un plateau en verre de 12 mm. Elle mesure 130, 160 ou 180 × 40 cm, hauteur 72 ou 92 cm.

**nettuno.content:** Les deux plateaux les plus courts reposent sur un piètement de 67 cm, le plus long sur un piètement de 105 cm. Le piètement se commande en quatre finitions de métal : GFM11 gaufré titane, GFM18 gaufré bronze, oxybrass ou oxygrey. Le plateau existe en verre transparent extra-clair ou en verre cuit MIST. Nettuno se fixe au mur.

**westin.description:** Westin est une console sur lames d'acier croisées. Avec un plateau en verre, elle mesure 160, 180 ou 200 × 50 cm, hauteur 74 cm. Avec un plateau en bois, 160 ou 200 × 45 cm, hauteur 76 cm.

**westin.content:** Les lames d'acier se commandent en sept finitions de métal, deux brossées et cinq gaufrées. Le plateau en verre, épais de 12 mm, est clair ou transparent extra-clair. Le plateau en bois, épais de 4 cm, existe en noyer Canaletto (NC), chêne brûlé ou chêne naturel (RN). Westin se fixe au mur.

## Sources

All facts come from `docs/copy-briefs/models/consoles-miroirs.md` (traits, dimensions, finishes), worded with the
vocabulary table of `docs/copy-briefs/models/README.md` (base → piètement, metals → métal, céramique Marmi → décors de
céramique Marmi) and the spec format "L × P cm, hauteur H cm".

| Slot | Traits | Dimensions | Finishes |
|---|---|---|---|
| `glenn.description` | miroir aux bords courbés; au sol ou au mur | Carré 120 × 120 cm; Rectangle 80 × 190 cm | none |
| `glenn.content` | none | épaisseur 8 cm (both formats) | verre · 3: miroité, miroité fumé, miroité bronze (counted: 3) |
| `cosmos.description` | miroir aux bords courbés; 120 ou 157 cm | Cosmos 120: Ø 120 cm; Cosmos 157: Ø 157 cm | "verre miroité" (finish material) |
| `cosmos.content` | verre miroité fumé ou bronze | épaisseur 11 cm (both sizes) | verre · 2: miroité bronze, miroité fumé (counted: 2) |
| `rado-keramik.description` | console tout en céramique; profondeur 38 cm (given through the 38 cm depth of both sizes) | 127 × 38 cm and 157 × 38 cm, hauteur 73 cm | none |
| `rado-keramik.content` | fixation murale | none | group "Plateau et base" (ceramic on both parts); Plateau et base · céramique Marmi · 5: KM07 Portoro opaque, KM18 Borghini Calacatta opaque, KM21 Colosseo, KM24 Invisible opaque, KM26 Taj Mahal (counted: 5) |
| `nettuno.description` | console sur base ondulée; plateau en verre de 12 mm | 130 ou 160 × 40 cm and 180 × 40 cm, hauteur 72 ou 92 cm | none |
| `nettuno.content` | fixation murale | Piètement de 67 cm (130 and 160 cm tops); Piètement de 105 cm (180 cm top) | base · métaux · 4: GFM11 gaufré titane, GFM18 gaufré bronze, oxybrass, oxygrey (counted: 4); plateau · verre · 2: transparent extra-clair, verre cuit (MIST) (counted: 2) |
| `westin.description` | console sur lames d'acier croisées | Plateau en verre: 160, 180 ou 200 × 50 cm, hauteur 74 cm; Plateau en bois: 160 ou 200 × 45 cm, hauteur 76 cm | none |
| `westin.content` | plateau en verre de 12 mm; fixation murale | Plateau en bois: épaisseur 4 cm | base · métaux · 7: Brushed Bronze, Brushed Grey (2 brushed), GFM11, GFM18, GFM69, GFM70, GFM73 gaufré (5 embossed) (counted: 7 = 2 + 5); plateau · verre · 2: clair, transparent extra-clair; plateau · bois · 3: NC noyer Canaletto, Chêne brûlé, RN chêne naturel (counted: 3) |

Figures checked per model: no figure of a description appears in its content (Glenn 120/80/190 vs 8 and three;
Cosmos 120/157 vs two and 11; Rado Keramik 127/157/38/73 vs five; Nettuno 12/130/160/180/40/72/92 vs 67/105/two/four;
Westin 160/180/200/50/45/74/76 vs seven/two/five/12/4).

## Open points

- **Fiche technique:** each brief says the spec sheet can be downloaded on the page. It is left out of the text,
  assuming the template shows the download link. If it does not, add one short sentence to each `content`.
- **Westin with a wooden top:** the data lists the wooden top (160 or 200 × 45 cm, hauteur 76 cm, three woods) under
  Westin itself, so it is written as an option of Westin. Confirm it is not a separate "Westin Wood" model (README rule
  on Wood versions).
- **Westin metal finishes:** the seven finishes are summarised as "deux brossées et cinq gaufrées" to keep within 60
  words. The full names (Brushed Bronze, Brushed Grey, GFM11 gaufré titane, GFM18 gaufré bronze, GFM69 gaufré
  graphite, GFM70 gaufré pearl, GFM73 gaufré noir) would take the slot to about 67 words, over the 60-word limit.
- **Self-check (copywriting AI-tell list):** no contrast reveal, negation list, question, em dash or banned word. The
  two colons introduce real lists of finish names (Glenn, Nettuno). One fragment, kept on purpose: the second
  dimension sentence of `westin.description`. Word counts (excluding "×" and ":"): Glenn 30 / 24, Cosmos 22 / 23,
  Rado Keramik 20 / 38, Nettuno 28 / 57, Westin 37 / 52 (limits 45 / 60).
- **Rado Keramik:** "un décor de céramique Marmi" for plateau and piètement reads the single finish group "Plateau et
  base" as one décor for both parts. Confirm that the two parts cannot take different décors. (The first draft put the
  five décor names in one 32-word sentence; the linter flagged it as long, so it was split in two.)
- **Glenn:** the data does not say which format (carré or rectangle) goes on the floor and which on the wall, so the
  text does not pair them.
- **Cosmos:** the shape is given only by "Ø" in the data; the text says "diamètre" and does not add "rond" or any other
  design trait.
- **Finish names kept as in the data:** oxybrass, oxygrey, verre cuit MIST, Brushed (summarised as "brossées").
- No `[NEED]` item: every slot is written from the brief's facts.
