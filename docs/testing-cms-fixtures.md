# Native CMS regression fixtures

Run these tests only in a separate local checkout with its own `.wrangler` state and `.dev.vars`. `integrationEnvironment()` requires a matching disposable marker, a local HTTP origin, and a port other than 4321. Tests use native EmDash setup and WebAuthn; they do not bypass authentication. Local email delivery must remain disabled (`CLOUDFLARE_ENV` unset).

`prepare-cms-fixture.mjs` preserves the full schema, entries and relationships. Remote photographs and PDFs are replaced with three synthetic local assets uploaded through the native media API. The committed original-model manifest enriches its eleven original entries. This verifies CMS bindings and layout behavior, not the accuracy or availability of the original assets.

## Fresh fixture

```sh
npm ci
npm run setup
CMS_TEST_URL=http://localhost:4331 node scripts/prepare-cms-fixture.mjs --prepare
npm run dev -- --port 4331
CMS_TEST_URL=http://localhost:4331 node tests/cms-sync.mjs --setup --setup-only
node scripts/prepare-cms-fixture.mjs --cleanup
EMDASH_BASE_URL=http://localhost:4331 EMDASH_AUTH_FILE=.wrangler/cms-sync-session.json node scripts/migrations/0025-editor-readiness.mjs --apply
CMS_TEST_URL=http://localhost:4331 node tests/editor-readiness.mjs --prepare-only
CMS_TEST_URL=http://localhost:4331 node scripts/prepare-cms-fixture.mjs --hydrate
EMDASH_BASE_URL=http://localhost:4331 EMDASH_AUTH_FILE=.wrangler/cms-sync-session.json node scripts/migrations/0026-native-seo-authority.mjs --apply
```

The fixture preparation command refuses existing state and existing seed overrides. Its temporary `.emdash/seed.json` override must be removed with `--cleanup` before any production build. Credentials, fixture snapshots, database state and private migration backups remain in ignored `.wrangler` files. `--prepare-only` publishes migration-created drafts only in the explicitly marked local fixture; migration 0025 itself never publishes content.

To exercise an existing-site migration, pass `--seed-before-repair` to `--prepare`. This loads the verified `e8baf89` schema (41 global fields), then runs the same native migration to the current 42-field schema. The additional editorial controls share one native JSON field; adding one database column for every control exceeds D1's public-query column limit.

## Regression suites

Run mutation suites sequentially so fixture changes cannot race. `PLAYWRIGHT_EXECUTABLE_PATH` can select an installed Chromium executable.

```sh
CMS_TEST_URL=http://localhost:4331 node tests/editor-readiness.mjs
CMS_TEST_URL=http://localhost:4331 node tests/mcp-write-guard.mjs
CMS_TEST_URL=http://localhost:4331 node tests/cms-sync.mjs
CMS_TEST_URL=http://localhost:4331 node tests/models-browser.mjs --representative
CMS_TEST_URL=http://localhost:4331 node tests/public-forms-browser.mjs
```

`editor-readiness.mjs` checks the current schema, authenticated API rejection of unsafe edits, grouped editor save/preview/publish, optional-copy clearing, legal fact substitution, native SEO, and admin rendering. It restores changed content and SEO after each fixture. `cms-sync.mjs` covers broad rich-text/image/CTA draft, signed preview, publication and clearing behavior. `models-browser.mjs` checks all current model entries and family relationships; `--representative` limits visual screenshots to four contrasting models in desktop/mobile and light/dark modes while retaining the complete public-content and publication checks. `public-forms-browser.mjs` intercepts submissions in the browser and tests status messages without sending real requests or email.

`mcp-write-guard.mjs` uses the disposable administrator session to create short-lived native API tokens, held only in memory and revoked afterwards. It verifies Bearer authentication, safe native reads, rejection of slug-only `content_update` calls and mixed batches, and native scope enforcement. The complete home record and revision must remain unchanged. Run it while no other suite edits the home page; home must have no pending draft. Its report contains no credentials.

Native content PUT merges data. Restoration therefore explicitly clears keys introduced by a fixture; omission would leave those keys behind. Optimized image URL checks unwrap Astro's `/_image?href=…` while still verifying the exact selected media reference. Retired internal availability/source fields must remain absent from public pages.

These checks do not establish live deployment state, authenticate OpenSEO, verify real catalogue bytes, or replace the post-deployment review against the authorized Cloudflare resources.
