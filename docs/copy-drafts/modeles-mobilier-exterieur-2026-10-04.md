# Draft: modèles Mobilier extérieur (4 October 2026)

## Page copy

**napoleon-keramik-outdoor.description:** Napoleon Keramik Outdoor est une table tout en céramique pour terrasse ou véranda couverte, à l'abri de la pluie et du soleil direct. Elle existe en 10 dimensions, de 200 à 320 cm de long, hauteur 74 ou 75 cm.

**napoleon-keramik-outdoor.content:** Le plateau se choisit rectangulaire, à angles adoucis, biscuit, ovale ou polygonal. Pour le plateau et le piètement, la céramique Marmi existe en 5 décors (KM07 Portoro opaque, KM18 Borghini Calacatta opaque, KM21 Colosseo, KM24 Invisible opaque, KM26 Taj Mahal).

**greta-outdoor.description:** Greta Outdoor est une chaise rembourrée à structure en acier inoxydable 304, pour terrasse ou véranda couverte, à l'abri de la pluie et du soleil direct. Elle mesure 62 × 62 cm, hauteur 78 cm.

**greta-outdoor.content:** Le revêtement de l'assise et du dossier se choisit parmi 20 références de tissu d'extérieur. La structure en acier se commande en 5 finitions gaufrées (GFM11 titane, GFM18 bronze, GFM69 graphite, GFM70 pearl, GFM73 noir).

## Sources

| Slot | Traits | Dimensions | Finishes |
|---|---|---|---|
| `napoleon-keramik-outdoor.description` | table tout en céramique ; pour terrasse ou véranda couverte, à l'abri de la pluie et du soleil direct | 10 dimension lines counted; lengths 200 (angles adoucis 200 × 120) to 320 (angles adoucis 320 × 138); heights 74 cm (angles adoucis 200 × 120, biscuit 220 × 120) or 75 cm (all others) | none |
| `napoleon-keramik-outdoor.content` | none | shape names of the 10 dimension lines: rectangulaire, angles adoucis, biscuit, ovale, polygonale (5 shapes, count not written) | Plateau et base · céramique Marmi · 5 : KM07 Portoro opaque, KM18 Borghini Calacatta opaque, KM21 Colosseo, KM24 Invisible opaque, KM26 Taj Mahal ("base" written "piètement", vocabulary table) |
| `greta-outdoor.description` | chaise en acier inoxydable 304, rembourrée ; pour terrasse ou véranda couverte, à l'abri de la pluie et du soleil direct | Chaise : 62 × 62 cm, hauteur 78 cm | none |
| `greta-outdoor.content` | none | none | assise/dossier · Tissu outdoor · 20 (WB codes counted: 20) ; structure · métaux · 5 : GFM11 gaufré titane, GFM18 gaufré bronze, GFM69 gaufré graphite, GFM70 gaufré pearl, GFM73 gaufré noir |

Style: `.agents/product-marketing.md` section 5 and `docs/copy-briefs/models/README.md` (precision text, one object or
measure per sentence). Figures checked per model: no figure of `description` appears in `content` (the 5 shapes of
Napoleon are named without a count so that "5" appears once, for the decors).

## Open points

- **Napoleon widths:** the description gives the length range (200 to 320 cm) and the heights; widths (120, 130,
  138 or 150 cm) are left to the dimension table of the page, for the 45-word limit. Owner to say if the width range
  should replace the height.
- **Napoleon "base" or "piètement":** the data says "Plateau et base". The vocabulary table keeps "base" only for a
  central column. [NEED: whether the Outdoor table stands on a central base, to choose the word]
- **Greta fabrics:** the 20 WB codes are counted (WB100 to WB104, WB120 to WB132, WB140, WB141) and not listed in
  the text. Whether each code is a colour or a different fabric is not given, so the text says "références".
- **Finish names kept as in the data:** "pearl" (GFM70) stays in English, as the brand names it. Owner to decide.
- **Tissu outdoor** written "tissu d'extérieur" (French from France).

**Lint (final run, `--all`): 0 blocking, 2 review, kept.**
- `many-commas` on the decor list of `napoleon-keramik-outdoor.content` and on the finish list of
  `greta-outdoor.content`: both commas separate the five finish codes inside parentheses (KM07 to KM26, GFM11 to
  GFM73). They are reference lists, not a trailing pile-on. Owner to say if the codes should leave the text for the
  finish table of the page.
- Fixed during drafting: a four-comma sentence on the Napoleon shapes (the trailing "selon la version" was cut).
