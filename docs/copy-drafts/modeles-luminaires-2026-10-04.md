# Draft: modèles Luminaires et lustres (4 October 2026)

## Page copy

**paris.description:** Paris est une suspension en verre artistique, proposée en deux tailles. Paris 1 a un globe de Ø 25 cm, hauteur 30 cm. Celui de Paris 2 mesure Ø 33 cm, hauteur 38,5 cm.

**paris.content:** Le diffuseur en verre artistique existe en une finition, le mix fumé et blanc. Paris se suspend seule, ou de deux à six sur une base circulaire, à des hauteurs différentes. Le câble mesure 250 cm au plus.

**aladdin.description:** Aladdin est une suspension en verre artistique, proposée dans une seule taille. Son globe mesure Ø 22 cm, hauteur 31 cm.

**aladdin.content:** Le diffuseur se choisit en verre fumé ou en verre mix (fumé et blanc). Aladdin pend seule ou par deux à six sur une base circulaire, chaque globe à sa hauteur, au bout d'un câble de 250 cm au plus.

**cloudine.description:** Cloudine est une suspension en verre artistique dont chaque diffuseur mesure environ 20 × 15 cm. Cloudine 1 compte un diffuseur. Les compositions en réunissent de 2 à 12 sur une platine de Ø 25 cm.

**cloudine.content:** Le verre des diffuseurs se choisit fumé ou iride. Le câble de suspension mesure jusqu'à 300 cm.

**bloom.description:** Bloom est un luminaire en métal, décliné en suspension verticale, en suspension horizontale et en lampadaire. La suspension verticale mesure 150 × 46 cm, hauteur 90 cm. L'horizontale fait 150 × 86 cm, hauteur 46 cm, et le lampadaire 57 × 45 cm, hauteur 178 cm.

**bloom.content:** La structure a une finition iron grey satiné ; les inserts sont en laiton. Une télécommande et son récepteur sont proposés en option sur les versions O/LO (horizontale) et V/LV (verticale). La platine de plafond S2/4 mesure Ø 25 cm.

## Sources

| Slot | Traits | Dimensions | Finishes |
|---|---|---|---|
| `paris.description` | suspension en verre artistique | Paris 1 : globe Ø 25 cm, hauteur 30 cm ; Paris 2 : globe Ø 33 cm, hauteur 38,5 cm (2 sizes counted) | none |
| `paris.content` | seule ou en grappe ; câble jusqu'à 250 cm | câble jusqu'à 250 cm | diffuseur · verre artistique · 1 : mix (fumé/blanc) |
| `aladdin.description` | suspension en verre artistique | Aladdin : globe Ø 22 cm, hauteur 31 cm (one size listed) | none |
| `aladdin.content` | seule ou en grappe ; câble jusqu'à 250 cm | câble jusqu'à 250 cm | diffuseur · verre artistique · 2 : fumé, mix (fumé/blanc) |
| `cloudine.description` | suspension en verre artistique ; seule ou en grappe | Cloudine 1 : diffuseur d'environ 20 × 15 cm ; Compositions : de 2 à 12 diffuseurs, platine Ø 25 cm | none |
| `cloudine.content` | câble jusqu'à 300 cm | câble jusqu'à 300 cm | diffuseur · verre · 2 : fumé, iride |
| `bloom.description` | en suspension ou en lampadaire | Suspension verticale (V, LV) 150 × 46 cm, hauteur 90 cm ; suspension horizontale (O, LO) 150 × 86 cm, hauteur 46 cm ; lampadaire 57 × 45 cm, hauteur 178 cm (3 versions counted) | "en métal" from the finish groups structure · métaux and pièces · métaux |
| `bloom.content` | variateur seulement sur certaines versions (O/LO et V/LV) | Platine de plafond (S2/4) : Ø 25 cm ; version letters from the dimension lines | structure · métaux · 1 : iron grey satiné ; pièces · métaux · 1 : laiton (written "inserts", vocabulary table) |

Style: `.agents/product-marketing.md` section 5 and `docs/copy-briefs/models/README.md` (precision text, one object or
measure per sentence). Figures checked per model: no figure of `description` appears in `content`.

## Open points

- **Cloudine 1 has one diffuser:** inferred from the data line "Cloudine 1 : diffuseur d'environ 20 × 15 cm" (singular)
  and from compositions starting at 2 diffusers (family fact LU1: alone or in a cluster of up to 12). To confirm.
- **Platine of Cloudine:** the data ties the Ø 25 cm platine to the compositions only. The text says so. Whether
  Cloudine 1 has its own ceiling plate is not given. [NEED: dimension of the Cloudine 1 ceiling plate, if the owner
  wants it stated]
- **Bloom S2/4:** the data names "Platine de plafond (S2/4) : Ø 25 cm" without saying what S2/4 is (a pendant with
  2 or 4 sources?). The text names the code only. [NEED: what the S2/4 version is, and whether it has a dimmer]
- **Bloom dimmer:** written as "seulement les versions O/LO et V/LV", as in the trait. By that trait the floor lamp
  has no dimmer; the text does not say it outright.
- **Finish names kept as in the data:** "mix" (fumé et blanc), "iride" (French equivalent: irisé) and "iron grey
  satiné". Owner to say whether the brand names stay or are translated.
- **Paris and Aladdin share the same traits** (verre artistique, seule ou en grappe, câble 250 cm). What tells them
  apart in the data is only size and finishes. [NEED: a design trait for each (shape of the globe, how the glass is
  worked), if the owner wants more than the numbers]
- **Fiche technique** (downloadable on each page) is not mentioned: the slot is about construction and finishes, and
  the template carries the download.

**Lint (final run, `--all`): 0 blocking, 1 review, kept.**
- `vague-quantity` on "environ 20" (`cloudine.description`): the data itself gives the Cloudine diffuser as
  "d'environ 20 × 15 cm". No exact figure exists in the brief; dropping "environ" would claim a precision the data
  does not give. [NEED: exact diffuser dimensions of Cloudine, if available on the official sheet]
- Fixed during drafting: a four-comma sentence in `paris.description` and a 30-word sentence in `bloom.description`,
  both split into two sentences.
