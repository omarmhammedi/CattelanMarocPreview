# Cattelan editor repair — acceptance evidence

Tested locally on 5 October 2026, starting from the verified `e8baf89` source and existing 41-field global schema. The repaired schema has six collections, 66 entries and 42 native global fields. Its 44 additional editorial controls share one validated JSON field on the same native global record.

The site was **not deployed or migrated live**. These reports prove behavior in an isolated native EmDash 0.41 installation, using synthetic media and native passkey authentication. They do not prove the current live administrator configuration, real catalogue bytes or an OpenSEO account connection.

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

The unit/build checks are now included in a pull-request workflow and the existing deployment workflow. Full CMS acceptance remains a separately guarded local suite; [reproduction instructions](../../testing-cms-fixtures.md) explain setup, synthetic media, native authentication and fixture restoration. Historical migration-specific browser suites require their matching historical fixtures; updating their stale assertions is not a claim that every historical suite was rerun.

## What is still required live

Follow [the release sequence](../../emdash-editor-release.md), including private backups, authenticated inventory, migration completion and the native SEO cutover **before deployment**. Review the entire existing shared draft before publication. Keep the preview nonindexable.

EmDash's MCP endpoint and OAuth discovery are reachable, but no authenticated EmDash connector is available in this session. The workspace has no Cloudflare credentials. OpenSEO appears in the research attribution, but its current account/connection remains unverified. No Replit Agent, live enquiries, emails, DNS changes or production writes were used for this repair.
