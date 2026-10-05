# Cattelan — editor repair and release

This repair starts from `e8baf8961c3eb93d4761801a541b666212e2ccd1` on `claude/product-marketing-context`, not the older static `main` branch. The prior audit is [here](emdash-editability-audit-2026-10-04.md). Local acceptance evidence belongs in [editor-readiness-2026-10-05](audits/editor-readiness-2026-10-05/).

## Editing ownership

| Task | Authoritative editor |
| --- | --- |
| Page copy, imagery, sections | Native Pages; the page identity is protected at publication. Home-only fields are labelled. Standard Home scenes have fixed positions; extra sections follow them. A section image overrides its corresponding Home fallback image. |
| Furniture and Journal | Native collections with useful list columns. Old availability/source fields are retained as read-only internal references, without restoring removed public copy. |
| Shared business terms, contacts, forms, buttons, analytics | Plugins → Piloter le site → Réglages du site. These groups edit the existing `site_content/global` record, using its native drafts and revisions. Logos and relationships link to the full native editor. |
| Menus | Native navigation: `primary` owns main menu text, including the dedicated header catalogue link; `footer` owns supplementary information links. Menu changes take effect immediately. |
| Commercial actions | Shared button text is editable; implemented internal page/form destinations remain fixed. The WhatsApp destination is shared, with an editable general message; model-specific messages retain their model context. |
| Privacy | Native Pages → Confidentialité; shared legal identity/contact fields and protected factual placeholders reflect actual runtime providers and retention. The approved fallback policy remains until this new draft is published. |
| SEO | The native SEO panel of each public page, family, model or article. SEO saves immediately, independently of content publication. Catalogue-page SEO belongs to Pages → Catalogue; shared-record SEO belongs to Pages → Home. Legacy SEO fields are archived after migration. |
| PDF | The catalogue field widget or catalogue panel's PDF tab opens the private upload workflow. Uploading associates a file with a draft; publication remains explicit. |
| Enquiries | Separate catalogue and appointment/project panels, with readable details and search/filters. Filters cover the loaded records; “load more” extends the search. CSV exports cover all records. |

No second settings database, CMS fork, public PDF bucket, Replit Agent or paid AI session is introduced.

The grouped controls share one validated native JSON field on the existing global record. This keeps its schema at 42 top-level fields: the local D1 migration test exposed the native query's column limit with a separate column for every control. The grouped interface still presents ordinary labelled inputs, and all changes use the same native revision and publication workflow. The seed validator reserves room for EmDash's own query columns to prevent this regression.

## Release sequence

1. Confirm the target Worker is `cattelan-maroc-preview` in the Cattelan account `dba3e3d7b3e2bfbdcca8acf3667916f6`, at <https://cattelan-maroc-preview.cattelan.workers.dev>. Inspect its currently deployed version and compare the authenticated schema/content with the migration inventories. Do not infer the deployed commit from GitHub alone.
2. Record the currently deployed Worker version and export a private D1 backup with the account's normal backup procedure. Keep the existing R2 assets; neither migration deletes files. Native migration backups are additional safeguards, not a substitute for a database backup.
3. Pause concurrent schema edits. Migration `0025-editor-readiness.mjs` uses native schema APIs, which do not support revision tokens; it detects observed schema drift before updates. Content writes use `_rev`. Run it first without flags, inspect the inventory, then with `--apply`. It preserves existing text, pending drafts and existing footer menus. Missing shared fields and the privacy page are added to drafts; nothing is automatically published.
4. Follow [the native SEO cutover](native-seo-cutover.md). Run `0026-native-seo-authority.mjs` in dry-run mode, then apply, then repeat the inventory. **Do not deploy this frontend while migration changes or blockers remain.** It reads currently live metadata, preserves populated native values and does not publish body drafts.
5. Run `npm test`, `npm run check`, `node scripts/seed-validate.mjs` and the production client build. The disposable local CMS/browser tests must also pass against this repair; historical reports from earlier revisions are not acceptance evidence.
6. Deploy using the existing pinned client target (`npm run deploy:client`) only after the access and migration gates above are satisfied. Keep `SITE_INDEXABLE=false`; this repair is not the public launch or a DNS change.
7. Open the task hub and grouped settings. Review the entire pre-existing global draft before publishing it; publishing a native entry applies its whole draft, not just the most recently edited group. Review and publish the privacy draft. Verify signed preview, publication, optional-field clearing, private PDF association, native SEO clearing, menu labels and both mobile and desktop layouts. Live verification need not create customer enquiries or send emails.
8. Record the new Worker version and post-release inventory. If rollback is needed, first identify whether schema/content also require restoration; rolling back Worker code alone does not revert immediate menu/SEO changes. Use the private pre-change backups with the owner’s established restore procedure.

Migration commands (credentials must already be configured securely):

```sh
export EMDASH_BASE_URL=https://cattelan-maroc-preview.cattelan.workers.dev
node scripts/migrations/0025-editor-readiness.mjs
node scripts/migrations/0025-editor-readiness.mjs --apply
node scripts/migrations/0026-native-seo-authority.mjs
node scripts/migrations/0026-native-seo-authority.mjs --apply
node scripts/migrations/0026-native-seo-authority.mjs
```

## Access needed for the live steps

- **EmDash:** connect the custom MCP endpoint <https://cattelan-maroc-preview.cattelan.workers.dev/_emdash/api/mcp> using its OAuth sign-in. For the scripted native migrations, use `npx emdash login --url https://cattelan-maroc-preview.cattelan.workers.dev`, or add a native API token to the environment as `EMDASH_API_TOKEN`. The native CLI identifies its token-creation screen as Settings → API Tokens. Do not put tokens in chat, source files or command history.
- **Cloudflare:** configure `CLOUDFLARE_API_TOKEN` securely for this account's Worker deployment and its D1/R2/KV resources. Verify the actual account and resource permissions before backing up or deploying. No Cloudflare credentials or injected outbound identity were available when this repair began; the older handover's claim about proxy-injected credentials is not evidence of access in this session.
- **OpenSEO:** supply its dashboard/connection URL and connect the account. Project research credits “DataForSEO via OpenSEO”, but no authenticated OpenSEO tools or runtime connection are visible. The app's `cattelan-seo` plugin is a native metadata hook, not proof of an OpenSEO connection.

## Native limits

EmDash 0.41 has no declarative per-entry field tabs or conditional Home-only field groups. The task hub and grouped settings use supported native plugin extensions. [Request guards](editor-write-guard.md) reject REST/MCP update shapes that bypass native drafting, and publication hooks check protected route identities. They do not prevent every intermediate draft operation. Native duplication can create unused drafts, and permanent deletion of already-trashed records has separate behavior. These are not database-level singleton constraints. Native authorizations remain enforced by the API.

The catalogue CRM test processes only the CRM simulation. Scheduled email delivery retains its existing behavior. Search is explicitly limited to loaded rows rather than suggesting that an unloaded match does not exist.
