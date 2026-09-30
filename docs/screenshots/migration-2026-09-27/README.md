# Version B comparison — 27 September 2026

These are browser screenshots of the authoritative static version B and the corrected EmDash homepage. They show visual fidelity with the current CMS content preserved; they do **not** establish pixel-perfect equality.

The local reference `version-b/index.html` and the [published version B](https://omarmhammedi.github.io/CattelanMarocPreview/version-b/) matched SHA-256 `d711bb0ffe796b2d00b68eaf4295888e0d4c032264c5f208b40bd99515c085e3` during this audit. Chromium used the local reference and its original image files. Neither static preview was edited.

## Screenshot gallery

Each pair shows **original / corrected**. Desktop screenshots were taken at **1440 × 900** and displayed at half size in the comparison sheets. Mobile screenshots were taken at **390 × 844** and displayed at full size. Both sites use their actual theme buttons; the selected button and theme attribute agree in all 60 final captures.

| Content | Dark theme | Light theme |
| --- | --- | --- |
| Desktop: hero, brand, collections | [Open](comparison-desktop-dark-1.jpg) | [Open](comparison-desktop-light-1.jpg) |
| Desktop: showroom entry, showroom information, map | [Open](comparison-desktop-dark-2.jpg) | [Open](comparison-desktop-light-2.jpg) |
| Desktop: catalogue, journal | [Open](comparison-desktop-dark-3.jpg) | [Open](comparison-desktop-light-3.jpg) |
| Mobile: hero, brand, collections, showroom | [Open](comparison-mobile-dark-1.jpg) | [Open](comparison-mobile-light-1.jpg) |
| Mobile: map, catalogue, journal | [Open](comparison-mobile-dark-2.jpg) | [Open](comparison-mobile-light-2.jpg) |

The real catalogue page is also captured separately, with its optional marketing consent and CMS labels:

| Viewport | Dark theme | Light theme |
| --- | --- | --- |
| 1440 × 900 | [Open](catalogue-1440-dark.jpg) | [Open](catalogue-1440-light.jpg) |
| 390 × 844 | [Open](catalogue-390-dark.jpg) | [Open](catalogue-390-light.jpg) |
| Catalogue CMS section, 1440 × 900 | [Open](catalogue-section-1440-dark.jpg) | [Open](catalogue-section-1440-light.jpg) |
| Catalogue CMS section, 390 × 844 | [Open](catalogue-section-390-dark.jpg) | [Open](catalogue-section-390-light.jpg) |

## Matched scene positions

Desktop scroll position is calculated as section top + progress × (section height − viewport height). Hero, brand, map and journal are captured at progress 0; collections at 0.02; showroom at both 0 and 0.62; catalogue at 0.62. Mobile uses the relevant mobile section top minus the 60 px header. Screenshots therefore compare the same scene position, rather than one shared page-wide scroll offset that becomes invalid when CMS content changes height.

The normal-motion check also sampled hero progress 0.35 / 0.8, brand 0.3, collections 0.5 / 1, showroom 0.3 / 0.7 and catalogue 0.5. Scene variables and computed transforms were recorded for both implementations. The horizontal rail remains longer for six current families. The map pulse is still animated. The clock and pulse phase are time-dependent, so their pixels can differ between captures.

## Typography measurements

Computed font size / line height, in CSS pixels, at 1440 × 900:

| Element | Original B | Migration before fixes | Corrected |
| --- | --- | --- | --- |
| Main title | 74.88 / 82.37 | 74.88 / 82.37 | 74.88 / 82.37 |
| Brand heading | 120.96 / 111.28 | 120.96 / 111.28 | 120.96 / 111.28 |
| Collections heading | 77.76 / 71.54 | 66.24 / 67.56 | 77.76 / 71.54 |
| Showroom information heading | 80.64 / 74.19 | 63.36 / 65.89 | 80.64 / 74.19 |
| Catalogue heading | 74.88 / 68.89 | 64.80 / 66.74 | 74.88 / 68.89 |
| Journal heading | 80.64 / 74.19 | 67.68 / 70.39 | 80.64 / 74.19 |

At 390 px wide, regular mobile section headings again use 46.80 / 43.06 px, compared with 46.80 / 49.14 px before the fix. The hero title keeps its original 33.54 / 37.56 px. The brand title now keeps the original two-line grouping “Dessiné” / “en Italie.” instead of the migration’s three lines.

The showroom invitation keeps B’s original 8.6 × viewport-unit size when it fits. The current, longer CMS invitation needs 111.10 px at 1440 × 900 to remain below the fixed header; its top is 112.58 px against an 89.27 px header. At 1440 × 650 its top is 93.02 px, fixing the previous negative top position. This is a content-driven fit adjustment.

## Content and functionality differences retained

- Current CMS titles, descriptions and branding remain authoritative. “Le catalogue”, “Le Journal” and “À Casablanca” differ from the prototype’s longer placeholder headings. The city line says “Casablanca, Maroc”; branding and clock text follow the CMS. No opening status is inferred from prototype hours.
- Current CMS image choices are also retained. In particular, the Tables card uses the published dining-room image, while original B uses a closer table-detail image; restoring its 60% focal position and frame does not make those different source images identical.
- Six family cards and five articles remain. Their real destinations, CMS-authored section buttons, article-reading label and section images work. Clearing a section button removes it, including the brand button that is currently empty in the CMS.
- The catalogue uses the real name/email form, a separate optional marketing checkbox, privacy link, PDF response and demonstration notice. The prototype’s mock form and email promise are not restored.
- Empty contact fields omit placeholder facts. The restored map drawing is explicitly labelled illustrative; the CMS map URL controls the real directions link. The marker label follows the site name.
- Mobile retains a functional menu for all real pages, the original two-line brand heading and a single main brand photograph. Its caption and the showroom invitation appear as ordinary text; the invitation does not cover the mobile photograph. The dedicated brand detail photograph remains in the desktop composition and its reduced-motion alternative.
- When a photograph is removed, its empty painted frame is omitted and the associated copy remains readable. Missing logos use the site name. Additional homepage rich text and extra sections render after the named scenes.
- Hero photograph placement measures the actual title height, retaining clearance for edited text. The reduced-motion/no-script view keeps content in normal document flow instead of long pinned scenes.

No horizontal document overflow was found at 1440 × 900, 1024 × 768, 1440 × 650, 390 × 844 or 320 × 740. Both final desktop/mobile theme captures also reported no horizontal overflow. These observations cover the current published preview content, not arbitrary future editorial lengths or production browser coverage.

Machine-readable local evidence is saved under `test-results/design-fidelity/` (ignored by Git): baseline and final scene metrics, compact viewport fit measurements and animation states. Only public, read-only requests were used for these captures; this visual audit did not submit forms or change CMS data.
