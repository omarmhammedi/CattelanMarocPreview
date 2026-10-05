# Native SEO cutover

EmDash's native SEO panel owns the public metadata. Its changes save immediately, independently of body drafts. The retired `seo_title` and `meta_description` fields remain only as historical/bootstrap migration inputs. Clearing a native title or description uses the public content's generated fallback; it does not restore retired copy.

EmDash 0.41's seed importer does not populate native per-entry SEO. Run migration `0026-native-seo-authority` after a fresh seed, and **before deploying this frontend over an existing CMS**. Do not delete the archived legacy fields until the production inventory and backups have been reviewed.

1. Confirm the exact Worker origin and verify recovery coverage using the [release backup requirements](emdash-editor-release.md#release-sequence). Prefer a private D1 export; these additive migrations can also use a verified native CMS backup, complete migration before/after records and the Worker rollback state. Supply a native CMS credential through `EMDASH_API_TOKEN` in the environment, or use the native CLI login. Do not put credentials in Git or command history.
2. Set `EMDASH_BASE_URL` to that origin. Run `node scripts/migrations/0026-native-seo-authority.mjs`. This is read-only and lists pending changes, preserved native conflicts, unpublished entries and blockers.
3. Resolve all blockers before applying. For a published entry with a pending body draft, the migration reads documented `item.liveData`, never the overlaid `item.data`. Missing live data or revision metadata blocks the cutover.
4. Run the same command with `--apply`. It requires a private backup before each write, rechecks the revision token, writes only the missing native title/description, and verifies both live and draft revision pointers remained unchanged. It never publishes or changes content fields, native images, canonicals or indexing settings.
5. Repeat the dry run. It must contain zero changes and zero blockers. Existing native values that differ from legacy values are preserved and reported as conflicts for editorial review. Unpublished entries are intentionally skipped; review their native SEO before their first publication. Pending draft changes to retired SEO fields must also be reviewed in the native panel before publication.
6. Deploy the frontend, then verify title, description, social metadata, canonical, native clear behavior and previews. Keep `SITE_INDEXABLE=false` until a separate launch decision.

The script stores timestamped mode-0600 backups under the ignored `.wrangler/migrations/0026-native-seo-authority/` directory, including the target origin, full pre-write record and revision token. These are recovery evidence, not a database backup. If a write fails halfway through, investigate and rerun the read-only inventory: completed records are idempotent. Restore metadata only after comparing the current record with its backup, using a fresh revision token; never replay a backup over subsequent editorial changes.

The new robots route consumes **Settings → SEO → custom robots.txt** when the site is indexable. It keeps crawler groups and custom restrictions, adds admin/preview exclusions to each group, and allows public EmDash media. Preview mode always returns `Disallow: /`. These directives are crawler guidance; CMS authentication remains responsible for access control.

The sitemap contains only indexable entries whose canonical is their own public URL. An entry pointing to another page or another domain is omitted; the target URL is included through its own entry if it is a public, indexable page. Generated page/model titles use the native site title separator. An explicit native SEO title is rendered exactly as entered.

This repair does not establish or replace an OpenSEO connection. The site's strategy document attributes research to DataForSEO via OpenSEO; verifying the external account still requires its actual connection/dashboard access.
