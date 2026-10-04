# Copy applied to the CMS: 4 October 2026

Source: `docs/copy-drafts/apply/manifest.json` (built by `scripts/build-copy-manifest.mjs` from the 31 drafts).
Each item was updated with `content_update` (status `published`), so the new text went live in one step. The CMS keeps
every earlier revision: any item can be restored with `revision_list` / `revision_restore` (Cattelan_Website tools).

## Pages (10), applied by the main session

| Page | New live version | Updated (UTC) | Notes |
|---|---|---|---|
| a-propos | 20 | 2026-10-04 12:32:48 | 7 sections (two paragraphs split into `founders_2`, `matter_2`) |
| home | 38 | 2026-10-04 12:33:32 | H1 and hero line unchanged (owner decisions) |
| showroom-casablanca | 36 | 2026-10-04 12:34:35 | new `contact_note` section |
| collections | 18 | 2026-10-04 12:34:44 | |
| catalogue | 20 | 2026-10-04 12:35:21 | native SEO title panel updated too |
| journal | 22 | 2026-10-04 12:35:36 | |
| votre-projet | 18 | 2026-10-04 12:35:55 | new `cancellation` section |
| professionnels | 18 | 2026-10-04 12:36:32 | |
| sur-mesure | 22 | 2026-10-04 12:36:42 | |
| faq | 16 | 2026-10-04 12:37:25 | two reworded questions, button "Architectes et décorateurs" |

Not changed on purpose: legal pages, shared labels (`site_content`), photos, alt texts and captions.

## Families (8), guides (5), models (39)

Applied by a helper agent from the same manifest, 2026-10-04 between 12:34 and 12:47 UTC, one `content_update`
(status `published`) per item, no conflict, no failure.

- Families (8): all published; the native SEO description panel was updated on the 6 families that had it filled.
- Guides (5): all published; the native SEO title of the ceramic/glass/wood guide was updated too. The official
  sources lists were left unchanged.
- Models (39): `description` and `content` of every model published.

**Verified by the main session after the run:** a fresh read of the CMS shows all 8 families, 5 guides and 39 models
published with the manifest text (rich text compared after normalising whitespace and Markdown), no pending drafts.
Total: 62 CMS items replaced (10 pages, 8 families, 5 guides, 39 models).

## Style pass, 4 October 2026 (18:51 to 18:56 UTC)

Owner feedback on the live preview (home, collections block): "39 modèles en huit familles / Chaque modèle a sa page…"
read as an inventory and talked about the website. Pass done with the `copywriting` and `copy-editing` skills; facts
unchanged, every changed draft at 0 blocking against its brief.

- New linter review rules in `scripts/copy-lint.mjs`: `site-meta` (sentences about the website), `heading-count`
  (heading built on a count of models or families), `negative-wording`, `abstract-sentence` (no material, object,
  place, person, date or number). The rule is also written in `.agents/product-marketing.md` section 5 and in the
  briefs whose role asked for it (home `collections.text`, collections `intro`, guide `cta_text`).
- 17 CMS items republished, each read first (no editor change since 12:38) and updated with `status: published`:
  pages home (collections block, journal heading, meta), collections, catalogue, journal, faq (intro), votre-projet
  (step 2), professionnels (files); families tables, chaises-tabourets, buffets-bibliotheques, consoles-miroirs,
  mobilier-exterieur; the five guides (`cta_text`, and two body sentences in the table guides).
- Models: no finding, unchanged. Each changed draft lists its before → after in a "Style pass" section.
