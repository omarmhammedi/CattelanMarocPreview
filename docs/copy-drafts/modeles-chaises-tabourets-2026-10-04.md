# Draft: modèles Chaises et tabourets (4 October 2026)

## Page copy

**rhonda.description:** Rhonda est une chaise au dossier plissé, proposée aussi en version tabouret. En chaise, elle mesure 63 × 60 cm, hauteur 79 cm.

**rhonda.content:** Le revêtement existe en cuir mince (36 teintes), en cuir Glove (13), en similicuir (18), en tissu (31) ou en micro-nubuck (14). La structure en métal se commande chromée ou gaufrée (titane, bronze, graphite, pearl ou noir).

**greta.description:** Avec ses accoudoirs prolongés, Greta existe en chaise et en tabouret. La chaise mesure 62 × 62 cm, hauteur 78 cm.

**greta.content:** Le piètement en métal gaufré existe en titane, bronze, graphite, pearl ou noir. En cuir, Greta se commande en Glove dans deux séries ainsi qu'en Magnifica, Nabuk, Perfetto et cuir mince. Le tissu se choisit en 31 teintes ou dans neuf catégories de T10 à T90, le similicuir en 18 teintes et le micro-nubuck en 14.

**miranda-ml.description:** Miranda ML est une chaise à coque enveloppante, avec une assise à 47 cm du sol. Elle mesure 63 × 61 cm, hauteur 81 cm.

**miranda-ml.content:** La structure en métal reçoit le chrome ou l'une des cinq finitions gaufrées (titane, bronze, graphite, pearl et noir). Pour le revêtement, Miranda ML se commande en cuir mince (36 teintes) ou en cuir Glove (13), en tissu (31), en micro-nubuck (14) ou en similicuir (18).

**zuleika.description:** Zuleika est une chaise habillée de cuir. Elle mesure 64 × 58,5 cm, hauteur 79 cm, avec une assise à 46 cm.

**zuleika.content:** Le cuir recouvre une structure en acier et se choisit parmi 21 teintes.

## Sources

| Slot | Traits | Dimensions | Finishes |
|---|---|---|---|
| rhonda.description | dossier plissé; existe aussi en tabouret | 63 × 60 cm, hauteur 79 cm | none |
| rhonda.content | none | none | assise: cuir mince 36, cuir Glove 13, similicuir 18, tissu 31, micro-nubuck 14 (written "revêtement", vocabulary table); structure · métaux 6: 08 chrome, gaufré titane, bronze, graphite, pearl, noir |
| greta.description | accoudoirs prolongés; existe aussi en tabouret; 62 cm de large | 62 × 62 cm, hauteur 78 cm | none |
| greta.content | none | none | base · métaux 5: gaufré titane, bronze, graphite, pearl, noir (written "piètement"); assise: glove 12 (GLW) and cuir Glove 13 (GLV) as "Glove en deux séries", magnifica 10, nabuk 6, perfetto 8, cuir mince 36 (5 leather names), tissu 31, T10 to T90 (9 groups), similicuir 18, micro-nubuck 14 |
| miranda-ml.description | coque enveloppante; assise à 47 cm | 63 × 61 cm, hauteur 81 cm, assise à 47 cm | none |
| miranda-ml.content | none | none | structure · métaux 6: 08 chrome + 5 gaufré (titane, bronze, graphite, pearl, noir); revêtement: cuir mince 36, cuir Glove 13, tissu 31, micro-nubuck 14, similicuir 18 |
| zuleika.description | habillée de cuir (sur structure en acier) | 64 × 58,5 cm, hauteur 79 cm, assise à 46 cm | none |
| zuleika.content | habillée de cuir sur structure en acier | none | revêtement · cuir 21 |

## Open points

- [NEED: dimensions du tabouret Rhonda] and [NEED: dimensions du tabouret Greta]. The briefs give the stool versions as a
  trait but only the chair dimensions, so the descriptions say "La chaise mesure" / "En version chaise" and give no stool
  figure.
- Greta: the data lists nine groups "T10" to "T90" next to a separate "tissu 31" group. I wrote them as "neuf catégories
  de T10 à T90" attached to the fabric sentence. To confirm: are T10 to T90 fabric price categories?
- Greta: two Glove groups exist in the data (glove · 12, codes GLW; cuir Glove · 13, codes GLV). Written "le Glove en
  deux séries". To confirm with the owner that these are two series of the same leather.
- "pearl" (finish GFM70 gaufré pearl) is kept as the data spells it, while titane, bronze, graphite and noir are in
  French. Should it read "perle"?
- Zuleika: the content slot holds one sentence (21 leather shades on a steel structure), because the data gives no
  other construction fact or option. A line on the downloadable spec sheet was left out, since the template already
  carries the download.
- The counts are shades per covering family as given in the data. No total was added up in the copy.
- Lint (`--brief docs/copy-briefs/models/chaises-tabourets.md --all`): 0 blocking, 0 review. Three "many-commas"
  review findings on the first run (finish lists for Rhonda, Greta, Miranda ML) were fixed by rewriting the sentences;
  no review finding is kept. Description and content of each model share no figure and no sentence.
