# Draft: modèles Buffets et bibliothèques (4 October 2026)

## Page copy

**chelsea.description:** Chelsea est un buffet aux façades à facettes, profond de 46 cm et long de 137,5, 193 ou 248 cm. Selon la longueur, il mesure 50, 75 ou 100 cm de haut. La version B, sur piètement, est haute de 65 cm.

**chelsea.content:** Le plateau est en verre miroité bronze ou en céramique Marmi, décor Colosseo (KM21) ou Taj Mahal (KM26). La structure en bois se commande en titane (M11), paprika (M14) ou mint (M75). Le piètement métallique est en chrome (08) ou en graphite mat (OP69).

**kayak.description:** Kayak, buffet aux façades à facettes, a deux portes sur 147 cm de long ou trois portes sur 220 cm. Il est profond de 53 cm et haut de 73 ou 83 cm.

**kayak.content:** La structure en bois existe en Brushed Bronze, en Brushed Grey ou en titane (M11). Le piètement est en acier inox poli ou en métal graphite mat (OP69). Un tiroir intérieur pour les couverts se commande en option.

**amsterdam.description:** Amsterdam est un buffet aux portes Oxybrass, profond de 46 cm et haut de 79 cm. Il existe à deux, trois ou quatre portes, pour 147, 220 ou 294 cm de long.

**amsterdam.content:** Les portes et la structure, en bois, portent la finition Oxybrass, et les inserts sont en chêne brûlé. Le plateau est en verre miroité bronze. Sur demande, un tiroir intérieur accueille les couverts.

**airport.description:** Airport est une bibliothèque à étagères modulaires, fixée au mur ou au plafond. Ses étagères, profondes de 29 cm, mesurent de 60 à 310 cm de long.

**airport.content:** Un caisson Box, long de 110 ou 160 cm et haut de 36 cm, et un bureau de 110 cm de long s'ajoutent aux étagères. Étagères et caissons se choisissent en six finitions, dont le noyer Canaletto et le chêne brûlé. La structure en métal gaufré existe en titane, bronze, graphite, blanc ou noir.

**nautilus.description:** La bibliothèque Nautilus assemble des modules en acier de 100 × 100 cm, profonds de 26 cm, juxtaposés ou superposés. Les compositions mesurent 200 cm de long sur 100 à 200 cm de haut, ou 300 cm de long sur 100 cm de haut.

**nautilus.content:** Selon la configuration, Nautilus se fixe au mur ou reçoit un lest. La structure et le lest se choisissent dans les mêmes quatre finitions de métal gaufré, titane, bronze, graphite ou pearl.

## Sources

| Slot | Traits | Dimensions | Finitions |
|---|---|---|---|
| chelsea.description | façades à facettes; trois hauteurs 50, 75 et 100 cm; longueurs de 137,5 à 248 cm; profondeur 46 cm | 137,5 × 46 cm h 75; 193 × 46 cm h 50, 75 ou 100; 248 × 46 cm h 50 ou 75; version B sur piètement h 65 cm | none |
| chelsea.content | plateau en verre miroité | none | plateau · verre · 1 (miroité bronze); plateau · céramique Marmi · 2 (KM21 Colosseo, KM26 Taj Mahal); structure · bois · 3 (M11 titane, M14 paprika, M75 mint); base · métaux · 2 (08 chrome, OP69 graphite mat) |
| kayak.description | façades à facettes; deux ou trois portes, 147 ou 220 cm; profondeur 53 cm | 147 × 53 cm and 220 × 53 cm, hauteur 73 ou 83 cm | none |
| kayak.content | tiroir intérieur pour les couverts possible | none | structure · bois · 3 (Brushed Bronze, Brushed Grey, M11 titane); base · métaux · 2 (acier inox poli, OP69 graphite mat) |
| amsterdam.description | portes Oxybrass; deux, trois ou quatre portes, jusqu'à 294 cm; profondeur 46 cm | 147, 220, 294 × 46 cm, hauteur 79 cm | none |
| amsterdam.content | plateau en verre miroité; tiroir intérieur pour les couverts possible | none | portes · bois · 1 (oxybrass); structure · bois · 1 (oxybrass); pièces · bois · 1 (Chêne brûlé, written "inserts"); plateau · verre · 1 (miroité bronze) |
| airport.description | étagères modulaires; fixation au mur ou au plafond; longueurs de 60 à 310 cm; profondeur 29 cm | Étagère 60 to 310 × 29 cm | none |
| airport.content | none | Caisson Box 110 ou 160 × 29 cm, hauteur 36 cm; Bureau 110 × 60 cm (length only) | conteneur · bois · 6 and étagères · bois · 6 (same six; two named); structure · métaux · 5 (GFM11 titane, GFM18 bronze, GFM69 graphite, GFM71 blanc, GFM73 noir) |
| nautilus.description | modules en acier de 100 × 100 cm, juxtaposés ou superposés; profondeur 26 cm | un module 100 × 26 cm h 100; compositions 200 × 26 cm h 100 à 200, 300 × 26 cm h 100 | none |
| nautilus.content | fixation au mur ou lest selon la configuration | none | lest · métaux · 4 and structure · métaux · 4 (same four: GFM11 titane, GFM18 bronze, GFM69 graphite, GFM70 pearl) |

Vocabulary: "base" written "piètement", "pièces" written "inserts", "ballast" written "lest"; "buffet" throughout, never "bahut".

## Open points

- **Chelsea, heights per length.** The description gives the three lengths and three heights without pairing them (137,5 cm only at 75 cm; 193 cm at 50, 75 or 100 cm; 248 cm at 50 or 75 cm), and the content cannot repeat those figures. The exact pairs are in the dimensions data on the page. If the owner wants them in the text, the description needs about 10 more words than the limit allows.
- **Chelsea, version B lengths.** Version B exists in 193 or 248 cm only; not stated in the copy (figures already in the description).
- **Chelsea, base finishes.** The data give two metal base finishes (chrome, graphite mat) without saying whether only version B has a metal base. The copy says "le piètement métallique" without tying it to a version. [NEED: do the non-B Chelsea versions have a metal base?]
- **Airport, desk depth.** The desk is 110 × 60 cm; the copy gives only its length because 60 cm is already in the description (shortest shelf).
- **Airport, data typo.** The data spell GFM71 "gaufré balnc"; the copy writes "blanc". Fix in `models-facts.json`.
- **Airport, "caissons".** The data group "conteneur" is written "caissons", read as the Box unit. To confirm.
- **Amsterdam, Oxybrass.** The data class Oxybrass under wood finishes; the copy calls the doors and structure wood with an Oxybrass finish and does not describe what Oxybrass looks like. [NEED: one factual line on what the Oxybrass finish is, if the owner wants it explained]
- **Nautilus, where the lest sits.** The copy says the bookcase "reçoit un lest" depending on the configuration, without saying where or which configurations. [NEED: which Nautilus compositions use the lest and which are wall-fixed]
- **Chelsea, finish code M75.** The content keeps the code "M75 mint", whose digits match the 75 cm height in the description. It is a finish code, not a measure; kept for readers checking a reference. Drop the codes if the owner prefers.
- **Spec sheet.** Each model has a downloadable spec sheet; not mentioned in the copy, assuming the page template shows the download.
