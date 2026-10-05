# Cattelan EmDash — live preview release

The editor repair was deployed to <https://cattelan-maroc-preview.cattelan.workers.dev> on 5 October 2026. The native editor migration, SEO cutover and publication of the two migration drafts completed successfully. This is a preview release: `SITE_INDEXABLE=false`, `X-Robots-Tag: noindex, nofollow` and `robots.txt` excluding all crawlers remain in place.

## Deployment and recovery

- Tested source: `f2a3b86400d401d5a3f099543fa969eed7f26c90`.
- [Deployment run 37258993716](https://github.com/omarmhammedi/CattelanMarocPreview/actions/runs/37258993716) passed dependency installation, 309 tests, Astro checks, seed validation, production build and the pinned Cloudflare target check.
- Accepted Worker version: `5cc6b847-2473-4c8a-862b-d16e26cf73d1`.
- Previous Worker rollback version: `0d30d952-4d12-4672-982f-1df296f61c31`.
- A native EmDash backup captured all 24 exported tables before migration. It was restored into an isolated SQLite database, with exact row equality and `integrity_check=ok`. The snapshot includes all affected content, schema, navigation, SEO and revisions. Its SHA-256 is `9341a9653cffe5a4419bf48f2ed4e8e968b9462d3edbc123f54cb62b3246247c`.
- [Backup run 37258015024](https://github.com/omarmhammedi/CattelanMarocPreview/actions/runs/37258015024) captured encrypted Worker deployment/settings state. The archive was retrieved, hash-checked and decrypted successfully. Private backup files, migration receipts and the decryption key remain outside Git.

The existing repository credential permits Worker operations but lacks D1 export permission. Recovery therefore uses the verified native snapshot, complete migration before/after records and Worker rollback state. This is scoped recovery for these additive migrations, not a full database disaster-recovery backup. Authentication, secrets, plugin stores and media binaries were not modified.

## Live mutations

| Step | Verified result |
| --- | --- |
| Migration 0025 | Six native collections updated; global schema has 42 fields; 44 shared copy controls added through one validated JSON field; privacy draft and native footer menu created. All 82 native writes succeeded. A second inventory found no outstanding editor changes or missing controls. |
| Migration 0026 | Inspected 64 entries across public content collections. Native title/description values migrated for 18 published entries; all writes succeeded. Final inventory found zero changes and zero blockers. Content bodies, publication status and live/draft revision pointers were preserved. |
| Shared settings publication | Baseline proved there was no previous global draft. The migration draft differed only in `editorial_copy`; all other data, references and bylines matched the baseline. Published with a fresh revision token and verified no remaining draft. |
| Privacy publication | Baseline proved the page did not previously exist. The created entry and revision matched the migration proof, with no intervening body changes. Its native title/description were filled, then the page was published with a fresh revision token and verified without a remaining draft. |
| Runtime | Editorial plugin reports active with native content/read/write and publication-policy capabilities. Home and privacy return 200. Privacy renders factual placeholders without exposing unresolved tokens. Preview indexing restrictions remain intact. |

Publication was limited to those two proven migration drafts. Existing pages, furniture and journal content were not republished. The footer menu and native SEO use EmDash's immediate-save behavior.

## Live acceptance

The [authenticated editor report](../editor-readiness-2026-10-05/live-read-only/report.json) and its six masked screenshots verify the live task hub and grouped settings at 1440px and 390px, with no JavaScript errors, unexpected HTTP/network failures or horizontal overflow. Six public pages returned 200 with the expected headings/forms and retained `noindex`. The browser made no write requests and did not read customer enquiries; external font requests and the native comment count were deliberately blocked.

The [public binding report](public-smoke.json) compares all 44 published shared copy controls with rendered HTML, including intentionally empty values. It covers ten live routes: home, catalogue, showroom/appointment, professionals, projects, privacy and four representative furniture models. Populated native SEO titles/descriptions and canonical URLs match the CMS; preview robots restrictions hold. Three browser layouts have no JavaScript/console errors or horizontal overflow. Form outcome copy is checked in rendered attributes; no real submission, email dispatch or catalogue download is attempted.

The separately documented [isolated acceptance suite](../editor-readiness-2026-10-05/README.md) covers save, draft isolation, signed preview, explicit publication, clearing, private PDF concurrency and intercepted form responses without changing customer records.

No live enquiry submission, email, paid SEO scan, Replit Agent session, DNS change or public launch was performed. OpenSEO's authenticated tools are not exposed to this session; this release does not claim that its connection to Cattelan has been verified.
