# Cattelan EmDash editability and editor organization audit

The website is genuinely connected to EmDash, and most page, furniture and Journal content uses the CMS. **Not every important field is editable or connected correctly.** Some visible CMS controls no longer affect the website, while business information and form text still live in code. The editor follows EmDash's basic conventions but needs clearer ownership of fields and better organization.

## Scope and evidence

Audited source: `e8baf8961c3eb93d4761801a541b666212e2ccd1`, branch `claude/product-marketing-context`, including the earlier site-strategy migrations. This is the latest available source and matches the newer features observed publicly; the deployed Worker commit was not independently queried. `main` is an older static mockup, and the open Cloudflare PR branch is also older than this source.

Live site: <https://cattelan-maroc-preview.cattelan.workers.dev/>. All **64 public routes derived from the current source** responded HTTP 200 and contained an H1. All remained deliberately nonindexable. Live desktop home, mobile catalogue and native login were inspected in Chromium, with no form submissions, attempted writes or browser exceptions. See [route results](audits/emdash-coverage-2026-10-04/routes.json) and [browser results](audits/emdash-coverage-2026-10-04/browser.json).

The intended schema contains **six collections and 102 custom top-level fields**. Its seed contains 65 records: 11 pages, eight families, 39 models, five articles, one catalogue and one shared-settings record. These are source counts, not an authenticated export of the current live database. Seed validation and **258 current unit tests passed**.

The authenticated live admin remains inaccessible from this chat. Native EmDash 0.41 was also inspected in a disposable local installation of the earlier schema: it establishes stock editor behavior, not the precise current migrated interface. Its screenshots are explicitly labelled baseline. Current source/migrations were rechecked separately; the current shared record has 41 fields, versus 39 in that baseline. Historical documentation and test results were not treated as fresh live verification.

## What is editable and connected

| Area | Assessment |
| --- | --- |
| Main and service pages | The 11 designated pages consume CMS titles, introductions, images, rich text, sections and SEO, including Sur-mesure, Professionnels, À propos, Votre projet, FAQ and Mentions légales. |
| Families and models | Family descriptions/cards/order/relationships and model descriptions, galleries, dimensions, finishes and technical PDFs are connected. The newer showroom-display checkbox is connected. Availability/source-note exceptions are listed below. |
| Journal | Article title, excerpt, rich text, images, native category/byline, references and article CTA use EmDash. |
| Shared identity and contacts | Native site name, logos, address, phone, email, WhatsApp, hours, maps and footer content are mostly connected. Some secondary messages and legal text duplicate business facts in code. |
| Menus | Native primary menu works, but fixed header/footer actions supplement or replace some items. |
| Catalogue | Active catalogue, cover, edition, description and private PDF selection are connected. Safe upload exists through the catalogue plugin, with draft association and explicit publication. |
| Requests | Appointment, professional and project submissions connect to the native plugin's private storage/admin. Notification recipient is configurable. The public form copy is mostly code-managed. |
| SEO and operational settings | Native SEO title/description/image/noIndex reach page metadata. CNDP receipt, native social profiles and a valid analytics token are consumed. Canonical, robots and other settings have exceptions below. |

The primary rendering contract is [content.ts](../src/lib/content.ts), with [ServicePage](../src/components/ServicePage.astro), [ModelDetail](../src/components/ModelDetail.astro), [CatalogueForm](../src/components/CatalogueForm.astro) and [SeoHead](../src/components/SeoHead.astro). The seed is only initial content; the server reads EmDash at request time.

## Findings and proposed repairs

| Priority | Finding | Proposed repair and evidence |
| --- | --- | --- |
| High | **Visible model fields have no public output.** `availability_note`, shared `model_notice`, `official_url` and `source_url` are still exposed/adapted, but the current templates do not display them. | Decide which fields remain useful, then reconnect them or retire/relabel them. Do not automatically restore copy intentionally removed by a redesign. [ModelCard](../src/components/ModelCard.astro), [ModelDetail](../src/components/ModelDetail.astro), [family page](../src/pages/collections/[slug].astro). |
| High | **Important business facts are code-managed.** Privacy policy text, legal contact details in that policy, product delivery/installation terms, quote terms, valet service, and some form phone/hours messages are fixed strings. Changing shared contacts/hours does not update every occurrence. | Give frequently changed business facts one controlled CMS owner and render them consistently. Keep legal text aligned with actual behavior and approved policy. **Mentions légales already is CMS-managed**; privacy is the exception. [Privacy](../src/pages/confidentialite.astro), [ModelDetail](../src/components/ModelDetail.astro), [footer](../src/lib/footer.ts), [RequestForm](../src/components/RequestForm.astro). |
| High | **The staff request panel hides a captured choice.** The separate “Avec un architecte” checkbox is saved, emailed and exported, but omitted from the admin detail display. `piece` appears as “Une pièce” in admin although the visitor selected “Un meuble.” | Display the architect flag and reuse shared labels so staff see the visitor's actual request. [Request admin](../src/plugins/requests/admin.tsx), [request contract](../src/plugins/requests/core.ts). No live visitor data was inspected. |
| Medium | **Catalogue form fields can be edited without changing the client site.** In the email-enabled client build, `form_hint` is replaced and `form_privacy` is suppressed. Other WhatsApp/city/email-status text is hardcoded. | Remove misleading controls or wire explicitly supported copy fields, while preserving accurate transactional/privacy behavior. [CatalogueForm](../src/components/CatalogueForm.astro), [build configuration](../astro.config.mjs). |
| Medium | **New request-form copy is mostly outside EmDash.** Labels, choices, buttons, success/errors, Monday opening guidance and fallback WhatsApp number are code-defined. | Expose the business copy that staff need to maintain. Keep storage keys, validation and permitted operational values controlled rather than making all form logic freely editable. [RequestForm](../src/components/RequestForm.astro), [request core](../src/plugins/requests/core.ts). |
| Medium | **Menu and CTA ownership is confusing.** Native menu items, shared fields labelled “Navigation …” and fixed `actions.ts` values are different sources. The header replaces the catalogue menu item with a fixed label; supplementary footer links are fixed. | Name each control for its actual destination and establish one owner for commercial CTA text/links. [Actions](../src/lib/actions.ts), [HeaderActions](../src/components/HeaderActions.astro), [PageLayout](../src/layouts/PageLayout.astro), [Home](../src/components/Home.astro). |
| Medium | **Two SEO editors compete.** Native SEO overrides legacy `seo_title`/`meta_description`. Native SEO saves immediately, independently of the body draft. Catalogue/shared records also show SEO panels whose values are not used by their public page layouts. | Consolidate on native SEO through a migration preserving existing metadata. Until then, label fallback fields and immediate-save behavior clearly. Disable unused SEO on nonpage records and link to the owning page. [SeoHead](../src/components/SeoHead.astro), [preview renderer](../src/pages/preview/[collection]/[id].astro), [schema](../seed/seed.json). |
| Medium | **Some native SEO settings are disconnected.** Custom robots text is ignored; a canonical override changes the page head without changing sitemap inclusion. The title-separator setting is not consumed. Indexable-mode robots currently blocks all `/_emdash/`, including original media. | Reconcile custom routes with the native settings and canonical policy; allow intended public media. Current preview `noindex` is intentional and was not changed. [robots](../src/pages/robots.txt.ts), [sitemap](../src/pages/sitemap.xml.ts), [model SEO](../src/lib/model-seo.ts). These are source findings for indexable mode, not live search-index tests. |
| Medium | **Shared editing is too broad.** The 41-field shared record mixes branding, contact/maps, form copy, catalogue, CNDP and analytics. All pages expose five homepage-only fields; free-text section keys and image fallback precedence require technical knowledge. | Create clear task entry points, protect the one `global` record, identify Home-only fields and explain section/image ownership. Do not create a second settings store. [Schema](../seed/seed.json), [content model](../src/lib/content.ts). |
| Medium | **Private PDF replacement is difficult to discover.** The Catalogue editor exposes a storage key, while safe upload sits below contacts on another screen. | Add “Replace PDF” beside catalogue editing and link to the existing private upload/draft workflow. Preserve private storage. [Catalogue admin](../src/plugins/catalogue/admin.tsx). |
| Medium | **Editing safeguards are incomplete.** Fixed page slugs and preview `route_key` can diverge. Required operational labels are optional in the schema and can become blank controls. Additional global records are ignored. Analytics accepts an arbitrary string but silently omits malformed values. | Enforce fixed route identities/singleton behavior, validate essential labels and the 32-hex analytics token, and show useful feedback. [Content](../src/lib/content.ts), [preview](../src/pages/preview/[collection]/[id].astro), [schema](../seed/seed.json). |
| Lower | **Lists and guidance need refinement.** Most collections lack useful columns; contacts/requests lack search and practical filters. Schema `options.helpText` is not rendered by the inspected stock 0.41 field renderer. | Use supported collection grouping/order/list columns, visible field labels and native plugin widgets/pages for essential guidance. Show model display state, catalogue edition/demo state and page role. Avoid proposing unsupported declarative field tabs. |

Additional growth limitation: the shared collection-list helper throws once more than 100 records are returned. Add pagination before the catalogue/Journal reaches that point; this is not a current live outage.

## Recommended EmDash organization

Keep EmDash's native collections, media, menus, drafts, revisions and preview. Organize the existing controls around staff tasks:

1. **Website pages** — Home and other pages, with a clearly identified owner for legal/privacy content.
2. **Furniture** — Families and models, with useful list columns and only active fields.
3. **Journal** — Articles, categories and bylines.
4. **Catalogue and enquiries** — Catalogue edition/private PDF, catalogue requests, appointments and projects, with clear detail views and filters.
5. **Site settings** — Identity, showroom/contact/maps, shared buttons/form copy, CNDP and analytics, still using native publication and revision APIs.
6. **SEO and navigation** — Native menu/redirect/settings tools and one authoritative per-page SEO panel.

EmDash 0.41 supports collection folders/order, field ordering, native list columns and plugin field widgets/admin pages. Its stock editor renders a single field form; this audit did not find declarative per-entry conditional field groups or tabs. Use supported extensions where necessary rather than maintaining a fork of the CMS interface.

## Connection visibility

| Connection | What is confirmed | What remains unverified |
| --- | --- | --- |
| Website to EmDash | Live CMS-backed pages/media; native admin redirects to login; MCP endpoint responds 401 with a Bearer challenge; OAuth discovery advertises the current Cattelan origin. | Current authenticated admin schema/permissions and a live edit-to-publication transaction. |
| This chat to EmDash | The connection endpoint exists at `https://cattelan-maroc-preview.cattelan.workers.dev/_emdash/api/mcp`. | No authenticated EmDash connector or callable EmDash tools are available in this session. An endpoint existing is not the same as this chat being connected. |
| OpenSEO | [The SEO strategy](livrables/strategie-seo.html) attributes research to “DataForSEO via OpenSEO (Maroc, français).” | No current authenticated OpenSEO connector/account is visible. No OpenSEO runtime integration appears in the app configuration. Research attribution does not establish a permanent website integration. |

The app's `cattelan-seo` plugin is a custom **native EmDash metadata hook**, not an OpenSEO connector. Plugin searches for EmDash/OpenSEO and available-tool inspection did not expose either connector. This is an access/verification limitation, not proof that an external account has been disconnected.

## Verification limits and changes

This task audited the site; it did not repair or publish it. No live CMS writes, customer submissions, emails, deployment, credentials changes or Replit Agent credits were used.

Current unit tests and schema validation passed. They do not prove every editor-to-website binding. The earlier isolated CMS experiment verified several draft/preview/publication/clearing sequences, but its full historical suite failed: it expects original media URLs instead of optimized-image wrappers, and model assertions/restoration are stale relative to current rendering and sparse data. An audit-only copy accounted for the image wrapper; the repository test was not changed. That experiment is **not** a passing current end-to-end gate. Update these regressions alongside any repairs, then verify the current workflow in an authenticated staging CMS.

Live screenshots and read-only evidence are stored beside this report. Baseline local screenshots are explanatory only. The current runtime is a working preview; authenticated editor conformance, live publishing and external OpenSEO authorization remain unverified.
