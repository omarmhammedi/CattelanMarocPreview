# SEO readiness and focused optimization — 5 October 2026

This release reuses the October 1 Morocco/French research and the five approved articles. It repairs observed content and technical issues without opening the preview to indexing or launching the final domain.

## Evidence and decisions

- **Existing research:** 74 saved OpenSEO keywords and the October 1 strategy. Five additional national Google checks validate article intent; no broad repeat of keyword research was needed.
- **Technical inventory:** 64 published pages, complete unique titles/descriptions, one H1 per page, valid product/article/local schemas and no broken internal page or fragment links. [Detailed technical review](../../seo-technical-review-2026-10-05.md).
- **Articles:** all five bodies had lost contextual links. Migration 0027 adds 24 model links and five guide links, makes two narrowly sourced factual corrections and changes two native SEO titles. [Exact article changes and safe migration](../../journal-seo-cluster-2026-10-05.md).
- **Local search:** exact Google Place ID matches the site's address, phone, coordinates and hours. The existing listing is claimed and links to the international manufacturer. The local domain should replace that link when it launches. [Local and AI-readiness review](local-llm.md).
- **Maps snapshot:** mobile French query `mobilier italien casablanca`, 3 × 3 grid around 33.5927007, −7.6426741, spacing 2 km: no matching CID/Place ID in the 16–19 returned listings at any point. A branded control at the center returns the exact listing in position 1; a generic center repeat returns 18 listings without it. This single-day sample does not establish absence from Maps, a cause or a trend.
- **Search Console:** the integration responds for `https://cattelan-maroc-preview.cattelan.workers.dev/`; the query/page request returned no rows for September 4–October 2. No final-domain property or organic traffic baseline was verified.

## Implementation

Default public page URLs use trailing slashes. A permanent redirect only applies to successful GET/HEAD HTML responses, preserves queries and yields to explicit native canonical overrides. API routes, mutations, errors, native redirects and signed previews retain their behavior.

The optional `llms.txt` recap takes its business answers from the published EmDash FAQ rather than separate hardcoded claims. Native noindex/canonical decisions remain effective; any `_preview` request is rejected before CMS access. It is an aid to readers, not a ranking guarantee or measured AI citation result.

The article migration uses native revision APIs, preserves existing sources and bylines, refuses pre-existing drafts or concurrent changes, and keeps private before-images. Body writes are drafts; publication is a separate guarded operation. Native SEO titles take effect immediately and are saved independently with fresh revision checks.

The [strategy HTML](../../livrables/strategie-seo.html), [strategy PDF](../../livrables/Strategie-SEO-Cattelan-Italia-Maroc.pdf) and [Google profile checklist](../../livrables/fiche-google-business-profile.html) now reflect the current inventory and measured milestones.

## Validation and release

- 328 automated tests passed; Astro check returned zero errors and zero warnings (two pre-existing hints).
- Seed validation, production build and the pinned Cattelan Cloudflare target check passed.
- Independent review found two edge cases, both repaired: explicit slashless native canonicals and signed FAQ preview requests on the LLM endpoint.
- Real HTTP checks on the disposable native CMS confirmed that explicit canonical overrides preserve HTTP 200 and clearing them restores slash redirects; original metadata and revision pointers were restored.
- A fresh native backup (18,813,022 bytes) round-tripped every row through an isolated SQLite recovery check; integrity was `ok`. Content, settings and revisions are covered; authentication secrets and media bytes are outside this native export.
- Preview: `SITE_INDEXABLE=false`, robots exclusion and empty sitemap remain intentional. No forms submitted, emails sent, customer-data tests, DNS changes, Replit Agent usage or public launch.

### Verified release

The five articles were published on October 5 and checked live: all 29 expected links, the two native titles and both factual corrections match; original dates, bylines and source lists remain unchanged. Four desktop/mobile renders passed without overflow.

- Deployed source commit: `eefb7434ed186f5ae40025af4e662b8b8750fa13`.
- [Successful deployment run 37307785112](https://github.com/omarmhammedi/CattelanMarocPreview/actions/runs/37307785112), including all 328 tests.
- Worker version: `e4277107-9a2e-4ec2-b882-0dba0666f0c9`; prior version `7b9d8b89-2b0a-447d-8eff-b69862208675` remains the code rollback reference.
- Post-deployment verification: 12/12 checks passed for GET/HEAD redirects, query preservation, canonical/noindex, genuine 404, robots exclusion, empty sitemap, protected API behavior, 22 FAQ answers in llms.txt and private/nonindexable rejection of preview queries.
- [PR #4](https://github.com/omarmhammedi/CattelanMarocPreview/pull/4) remains a draft targeting `feat/site-strategy`. Its feature branch was deployed directly; no merge or movement of the usual deployment branch was performed. Later documentation commits do not change the deployed application code.
- [Private OpenSEO audit report](https://open-seo-selfhost.omar-8b8.workers.dev/p/882fd590-3102-4c31-983a-e42e7c0cc274/reports/8679e8f6-7038-49c6-be3c-b11ab82f3c4d) is saved in the Cattelan project, with refreshed shared context and research records. It requires workspace access and was not made publicly shareable.

CMS snapshots, publication before/after receipts and the native backup remain private. Code rollback does not revert independently published CMS content; the captured article before-images are the recovery reference for content.

## Remaining work at the appropriate stage

1. At launch, verify the final domain, HTTPS, canonical origin, desired search-crawler access, sitemap, Search Console property and Google listing website link. Public profile reads do not establish Google Business Profile management access.
2. Measure mobile performance before deciding whether large product HTML requires changes; HTML size alone is not a Core Web Vitals failure.
3. Backfill verified manufacturer provenance for 12 linked models currently missing native source URLs. Preserve their existing technical PDFs; never infer official URLs.
4. Select approved social images for seven service/legal pages if wanted. Native cleared image values remain authoritative.
5. Consider lighting and console/mirror guides after checking their specific informational demand and source material. Broad keyword estimates alone do not prove their likely return. No duplicate material guide or generic city pages were added.

OpenSEO receipts, CMS snapshots, revision receipts and backups remain outside Git. No ranking, lead volume, revenue or assistant citation is promised.
