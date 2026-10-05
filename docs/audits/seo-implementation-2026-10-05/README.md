# SEO implementation — 5 October 2026

This follow-up implements the remaining technical, source and sharing improvements identified in the [SEO readiness audit](../seo-readiness-2026-10-05/README.md). The existing titles, descriptions, structured data, canonical fixes, published article links and CMS-backed FAQ recap remain in place. The preview stays non-indexable; this is not a public-domain launch.

## Release status

The preceding SEO release is merged through [PR #4](https://github.com/omarmhammedi/CattelanMarocPreview/pull/4) into `feat/site-strategy` at `be99e9e8271e0beaae4399df1a89f37b893c8f99`; [deployment 37311818479](https://github.com/omarmhammedi/CattelanMarocPreview/actions/runs/37311818479) succeeded. The follow-up application changes described here have passed local checks but are not yet recorded as merged or deployed. The [Cattelan deployment workflow](https://github.com/omarmhammedi/CattelanMarocPreview/actions/workflows/deploy-cattelan-client.yml) is the authoritative release record.

| Component | Implemented scope | Rollout status |
| --- | --- | --- |
| Native social images, migration 0029 | Fill seven empty SEO image fields with two existing published photographs | Applied and independently verified live |
| Manufacturer provenance, migration 0028 | Complete 12 model source records and 14 source references across five articles | All 17 native entries published and preservation checks passed; new frontend link display awaits deployment |
| Native inverse family reference, migration 0030 | Add one optional field viewing the existing relation | Applied live; only the schema field was created, with no entry or relationship writes |
| Fonts, homepage hero preload, model lookup, source-link display and deployment checks | Application and workflow changes | Final local validation passed; application deployment pending |

## Implemented changes

- **Rendering and lookup:** self-host the exact licensed Albert Sans files, removing the external Google Fonts stylesheet. Model pages load their own related families through EmDash's native inverse reference instead of hydrating all eight families and their selected models. Multiple families retain the original display order, including the native database-ID tie-break. [Performance evidence](performance.md).
- **Homepage image discovery:** preload the actual CMS hero from the page head after the viewport metadata. The preload and displayed image share their exact responsive source candidates and crop-aware size hints. Clearing the hero removes both; other page templates retain their existing behavior. This targets discovery delay without changing the photograph or its framing.
- **Sources:** display verified manufacturer product links beside technical information. Migration 0028 preserves article prose, existing PDFs, publication dates, bylines and native SEO. Source URLs were checked against exact manufacturer records and technical PDFs. [Provenance evidence](../seo-readiness-2026-10-05/manufacturer-provenance.md).
- **Share previews:** seven native SEO image fields now produce matching Open Graph and Twitter images. All seven pages and both source assets were checked live. Editors can replace or clear these fields normally; root-relative media URLs survive a domain change. [Native metadata evidence](social-metadata.md).
- **Ongoing checks:** the release workflow now runs 19 anonymous public checks after deployment, covering page metadata, canonical agreement and redirects, preview exclusion, sitemap, genuine 404 responses, API access control, FAQ recap and local fonts. Missing optional share images are reported without blocking an intentional CMS edit. These checks have been added; their first deployed run is pending.

## Validation and safeguards

- 352 automated tests passed with zero failures. Astro checked 240 files and returned zero errors, zero warnings and three hints. Seed validation passed.
- Six native integration scenarios passed on a marked disposable CMS: existing drafts and relationship edges survive the schema addition; only published families appear publicly; signed model previews retain draft visibility and noindex; older drafts preserve links when published; family ordering changes only after publication; inverse-picker changes remain staged until publication.
- Native browser checks at 390 px and 1440 px, both DPR 2, confirmed that the hero preload follows the viewport declaration, matches the displayed responsive candidate and causes one image request. Clearing the fixture hero removed its image and preload; a model route emitted no homepage preload. The fixture hero was restored.
- A fresh native backup of 18,855,138 bytes was verified and remains private. Migration before-images, signed preview URLs, authenticated receipts and recovery files are excluded from Git.
- The migrations pin the Cattelan preview, refuse incompatible schemas or concurrent edits, and require private backups before writes. Migration 0030 adds only the inverse schema field; it writes no content, relation edges, revisions or publication state.
- Independent review corrected deployment checks that could reject legitimate native SEO edits and a family-order tie-break discrepancy. The targeted regression checks pass.

All three native CMS migrations are applied. Deploy the application changes, verify the released code with the automated public checks, check the new manufacturer-link display and repeat the same mobile measurements. CMS publication and application deployment have separate recovery records; rolling back code does not undo published CMS edits.

No DNS or launch changes, Replit Agent usage, customer-data tests, enquiry submissions or emails are part of this release. Google listing management, final-domain indexing and Search Console activation remain launch tasks; no ranking or AI citation result is claimed.
