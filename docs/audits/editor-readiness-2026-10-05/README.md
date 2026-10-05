# Cattelan editor repair — acceptance evidence

Tested locally on 5 October 2026, starting from the verified `e8baf89` source and existing 41-field global schema. The repaired schema has six collections, 66 entries and 42 native global fields. Its 44 additional editorial controls share one validated JSON field on the same native global record.

The reports below prove behavior in an isolated native EmDash 0.41 installation, using synthetic media and native passkey authentication. The repair was subsequently migrated, deployed and published on the preview site; see the separate [live release evidence](../live-release-2026-10-05/README.md). Local fixture results do not prove real catalogue bytes or an OpenSEO account connection.

## Checks

| Check | Result / evidence |
| --- | --- |
| Unit tests | 309 passed; covers migrations, validation, query pagination, native SEO and write guards, JSON preservation, operations queues and existing application behavior. |
| Astro / TypeScript | No errors or warnings; two existing unused-parameter hints. |
| Seed | Six collections, 66 entries, 1,638 source image references; relationship validation passed. A schema-width guard prevents repeating the D1 query limit found during testing. |
| Production client build | Passed with the Cattelan client configuration; the target checker confirms the intended account, Worker, D1 and R2 names. Existing bundle-size guidance remains a non-failing build warning. |
| Existing-site migration | Native setup from the previous schema, then migrations 0025/0026, preserving draft/revision/preview capabilities. Current schema and entry coverage are in [fixture/report.json](fixture/report.json). |
| Main editor workflow | [editor/report.json](editor/report.json): grouped editor save, draft isolation, signed preview, explicit publication, optional clearing, privacy facts and native SEO. |
| Broad CMS bindings | [cms-sync.md](cms-sync.md): native rich text, images, sections, CTAs, shared text, model cards and signed previews; fixture content restored after testing. |
| Models | [models/report.json](models/report.json): all 39 models and eight families; four representative models on desktop/mobile in light/dark modes, plus native publication/clearing/restoration. Media and PDF bytes are synthetic fixtures. |
| Authenticated MCP | [mcp-write-guard.json](mcp-write-guard.json): safe read and native scope checks, rejected unsafe single/batch writes, unchanged content/revision, and revocation of both temporary local API tokens. |
| Private PDF concurrency | [catalogue-admin-report.json](catalogue-admin-report.json): a stale revision returns 409, concurrent edits remain intact, explicit reload permits draft-only association, and the original live revision is restored. Synthetic PDFs were removed. |
| Form responses | [public-forms.json](public-forms.json): ten scenarios with nine intercepted POSTs, zero actual submissions/emails. |
| Operations panels | [operations-admin-report.json](operations-admin-report.json): intercepted synthetic list records verify filters, architect details, labels, loaded-record scope and mobile layout; all writes blocked. |
| Responsive admin | [responsive-admin/admin-responsive.json](responsive-admin/admin-responsive.json): native task hub, grouped settings and operations panels on desktop and mobile. |

The first GitHub run exposed a date fixture tied to a changing time-zone rule: Node 24.19.0 (tzdata 2026b) and Node 24.21.0 (tzdata 2026c) disagree about Casablanca on 1 October 2026. The calendar test now uses historical 2025 midnight, year and Ramadan boundaries; application code continues to use `Africa/Casablanca`, without a hard-coded offset. The fixture was checked on both Node versions.

The unit/build checks are now included in a pull-request workflow and the existing deployment workflow. Full CMS acceptance remains a separately guarded local suite; [reproduction instructions](../../testing-cms-fixtures.md) explain setup, synthetic media, native authentication and fixture restoration. Historical migration-specific browser suites require their matching historical fixtures; updating their stale assertions is not a claim that every historical suite was rerun.

## Live release

The [release sequence](../../emdash-editor-release.md) was completed on 5 October 2026: verified scoped backups, authenticated inventory, migrations 0025/0026, deployment and guarded publication of the migration's shared settings and privacy page. The preview remains nonindexable. The [live report](../live-release-2026-10-05/README.md) distinguishes remote acceptance from these local mutation tests.

Native EmDash CLI authentication and the repository's existing Cloudflare deployment secret supplied the required live access. OpenSEO's authenticated connector is still not exposed to this tool session, so its connection remains unverified. No Replit Agent, live enquiries, emails or DNS changes were used for this repair.
