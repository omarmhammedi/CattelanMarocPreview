# Manufacturer provenance implementation — 5 October 2026

Twelve of the twenty models linked by the five existing articles had no native manufacturer URL. Their existing technical PDFs were available, but readers could not follow an official product-page reference. Migration 0028 fills these missing native model fields and completes fourteen article source references without changing article prose, product specifications, publication dates, bylines or SEO settings.

The presentation adapter now reads `source_url` (then `official_url`) and the model technical section displays a compact link to the exact Cattelan Italia product page. It accepts HTTPS links on the manufacturer's exact hostname and product route only. All editorial content and links remain native EmDash data.

## Source verification

The [public manifest](../../../content/model-provenance-2026-10-05.json) records each exact official product ID, French product URL, source category, technical PDF URL, content hashes and verification time. Product IDs came from the manufacturer's public category endpoint, as called by its category page; none were inferred from model names. All twelve product pages and technical PDFs returned HTTP 200. Each PDF names the exact model and its normalized extracted text matches the existing imported technical sheet. Binary hashes differ because regenerated PDFs are not byte-stable; no claim of byte identity is made.

Verified models: Amsterdam, Botero Wood Round, Butterfly, Craig, Douglas, Kayak, Miranda ML, Mykonos, Nautilus, Sinatra, Tyron Keramik and Zuleika. Several manufacturer page titles carry inconsistent category suffixes; identity was cross-checked using the exact category product record and PDF content, rather than treating those suffixes as furniture facts.

## Application and checks

Migration 0028 is applied on the live preview: all 12 model source records and all five article source lists were saved as native drafts, separately published and checked against their before-images. The 14 added article references are published. Article prose, existing PDFs, original publication dates, bylines and native SEO were preserved. The new model-page manufacturer-link display is deployed and verified on all twelve affected pages.

- `node --test tests/model-provenance-migration.test.mjs`: seven passing tests covering source identity, native datetime normalization, existing drafts, changed PDFs and editorial metadata, concurrent edits, backup failure, preserved live content and idempotence. Verification timestamps use UTC with millisecond precision, matching EmDash serialization; noncanonical timestamps are rejected before writes.
- `node --use-env-proxy --use-system-ca scripts/migrations/0028-model-provenance.mjs`: read-only native inventory.
- Add `--apply` to create native drafts only after successful private before-images. The script refuses existing drafts, concurrent revisions and changed source lists; it never publishes or changes native SEO.
- Native publication and live rendering verification are complete. Publication receipts, before-images and manufacturer response bodies stay outside the public repository in `.wrangler/`.

## Deployed result

Verified on 5 October 2026 at 13:18 UTC after deployment of commit `f8e10c45e6d4f790b9d6f7b19d1fe7f0a3aa5190`, Worker version `05286e1f-6b64-41bd-a8b0-595df2c17631`.

The read-only public check passed 234 assertions across all seventeen pages: HTTP 200, correct preview canonical, header and meta `noindex`, twelve visible links to the exact verified manufacturer URLs, preserved technical PDF downloads, fourteen new article source references and every previous source. All twenty-four contextual model links and five related-guide links remain intact. Article source links are visible when the native Sources disclosure is opened.

SSR responses were re-rendered in Chromium with the deployed stylesheets; scripts, images, fonts and form requests were blocked. This check verifies the source links and preview protection; it does not measure whole-page performance. Private HTML snapshots and the detailed result are stored under `.wrangler/seo-completion-2026-10-05/provenance-live-2026-10-05T13-18-39-361Z/`.

This improves source traceability and helps readers verify product statements. It is not a promise of search-engine or AI ranking gains. Preview indexing remains unchanged.
