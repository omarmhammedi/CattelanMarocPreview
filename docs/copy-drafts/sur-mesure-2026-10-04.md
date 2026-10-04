# Draft: Sur mesure (4 October 2026)

## Page copy

**eyebrow:** Sur mesure

**title:** Le mobilier Cattelan Italia sur mesure, à Casablanca

**intro:** La table Skorpio existe en 14 formats, Tyron Keramik en plateau rectangulaire, biscuit ou boomerang. Chaque modèle a ses formats et ses finitions, et une pièce personnalisée garde le délai d'une pièce standard.

**options.format:** Le format de Napoleon Keramik se choisit parmi 10 tailles, de 200 à 320 cm, et Botero se commande de 100 à 180 cm de diamètre.

**options.plateau:** Le plateau se commande en céramique avec jusqu'à 19 décors du Calacatta au Portoro, en verre clair, extra-clair ou cuit, en noyer Canaletto ou en chêne brûlé.

**options.piètement:** Le piètement est brossé à la main en Brushed Bronze ou Brushed Grey, ou laqué gaufré titane, bronze, graphite, perle ou noir.

**options.revêtement:** Le revêtement se choisit parmi les tissus T10 à T90, les cuirs Glove, Magnifica, Nabuk et Perfetto, le micro-nubuck et le similicuir.

**samples.heading:** Les échantillons du Triangle d'Or

**samples.text:** Le showroom de Casablanca réunit toutes les finitions de la marque, en échantillons ou sur les meubles exposés. On y compare céramiques et bois, laques et métaux, tissus et cuirs avec un conseiller, échantillons en main.

**lead_time.heading:** 10 à 12 semaines au maximum

**lead_time.text:** Pour une pièce sur mesure comme pour une autre, le délai court dès que l'acompte de 50 % valide la commande et lance la fabrication en Italie. Le solde se règle avant la livraison, gratuite à Casablanca. L'installation est comprise.

**materials.heading:** Céramique, verre ou bois ?

**materials.text:** Sur une table de repas, la céramique résiste à la chaleur et aux taches. Le verre laisse voir le piètement à travers le plateau. Le bois se choisit pour son veinage. Notre guide compare les trois plateaux sur des tables Cattelan Italia, avec leurs dimensions.

**materials.button:** Lire l'article

**seo_title:** Mobilier sur mesure à Casablanca · Cattelan Italia Maroc

**meta_description:** La plupart des collections Cattelan Italia se commandent sur mesure, en format, matière et finition. Toutes les finitions sont au showroom de Casablanca.

## Alternatives

- **title**
  - A: Cattelan Italia sur mesure, du plateau au piètement
  - B: Cattelan Italia sur mesure au showroom de Casablanca
- **samples.heading**
  - A: Toutes les finitions à Casablanca
  - B: Le showroom du Triangle d'Or
- **lead_time.heading**
  - A: 10 à 12 semaines, sur mesure compris
  - B: 10 à 12 semaines après la validation
- **materials.heading**
  - A: Trois matières pour un plateau
  - B: Le plateau en céramique, en verre ou en bois

## Sources

| Slot | Fact ids |
|---|---|
| eyebrow | fixed (brief) |
| title | M1, BZ1 (Casablanca) |
| intro | M3 (Skorpio, Tyron Keramik), M2 |
| options.format | M3 (Napoleon Keramik, Botero) |
| options.plateau | M4 |
| options.piètement | M5 |
| options.revêtement | M6 |
| samples.heading | S3, S1 (Triangle d'Or) |
| samples.text | S3, S8 (advisor, samples in hand) |
| lead_time.heading | SV5 |
| lead_time.text | M2, SV5, SV3, SV1 (manufacture in Italy), SV6 |
| materials.heading | M7 |
| materials.text | M7, J1, J2 |
| materials.button | fixed (brief) |
| seo_title | brand, place (BZ1) |
| meta_description | M1, S3 |

## Open points

- No [NEED] item: every slot is covered by the fact bank.
- The brief gives no quote or WhatsApp button, although the main action is "ask for a quote (WhatsApp)". The template
  is assumed to carry it; if not, a button slot is needed ("Demander un devis", or the site's single WhatsApp label).
- M2 (same delay for a custom piece) appears twice, in the intro and in `lead_time.text`, as the brief allows it in
  both slots. The wording differs; the owner may prefer to keep it in one place only.
- French names of finishes to check against the model data: "verre cuit" (baked glass), "laqué gaufré" (embossed
  lacquer), "biscuit" (Tyron Keramik top shape), "tissus T10 à T90".
- "Jusqu'à 19 décors": 19 only with decor KS (Tyron and Butterfly Keramik); other ceramic models have 18 or fewer.
  The "jusqu'à" keeps the line true; each model page gives its own count.
- Elsewhere in Morocco, delivery cost depends on the destination (SV6). It does not fit in the 40 words of
  `lead_time.text`; the FAQ carries it.
- Lint review findings kept (many-commas): `options.piètement` (five lacquer colours) and `options.revêtement` (four
  leathers). Both are the option lists the brief asks for, one sentence per label; the commas separate real options
  and no clause trails after the claim. The plateau line and `samples.text` were rewritten to clear the same finding.
