# Applying approved copy to the site

Ported from the account skill `cattelan-site-copy` (4 Oct 2026), which is no longer used because its style rules
produce the style the owner dislikes. Only the operating knowledge is kept here. Style and fact rules live in
`.agents/product-marketing.md`.

**Nothing goes to the live CMS before the owner approves the draft.** Drafts stay in `docs/copy-drafts/`.

## Where each text lives

| Text | Place | How to change it |
|---|---|---|
| Pages, families, models, journal guides, shared labels | EmDash CMS (`pages`, `families`, `models`, `posts`, `site_content`) | CMS API or the CMS connector, below |
| Fixed template strings (labels, form messages, empty states) | `src/` (Astro templates, `src/lib/`) | Branch, tests, patch |
| Migration layers (`content/copy-v*.json`, `scripts/migrations/`) | repo | Not a source of truth: the live CMS is. Never run a migration written elsewhere without reading its rules first |

## Sources of truth for facts, in this order

1. The facts in `.agents/product-marketing.md`, section 6, and the owner's decisions, section 9.
2. Model data in the CMS (`ec_models`, read-only): dimensions, finish groups and counts. Count before writing a number
   ("19 décors": Tyron and Butterfly Keramik 18 Marmi + KS = 19; Albert 16; Botero Keramik Round 15; Botero Ker-Wood 16).
3. Official product pages on cattelanitalia.com for technical claims.
4. `.agents/press-and-brand-sources.md` for brand and company history.

## Applying a batch to the CMS

1. Lint every draft: `node scripts/copy-lint.mjs <draft>`; zero blocking findings.
2. Write a manifest of exact replacements per CMS item (collection, slug, field, new text).
3. **Dry run first**: read each item (`content_get`), check the field exists and that no editor has changed it since the
   draft was written. Every replacement must match its target. Report mismatches; do not guess.
4. Apply with `content_update` (needs the item's `_rev` from the read), then `content_publish`. Through the raw API the
   same flow is `PUT /_emdash/api/content/{collection}/{id}` with `{ _rev, data }` and `POST …/publish`, headers
   `X-EmDash-Request: 1`, `credentials: 'include'`, from the owner's signed-in browser tab.
5. A 409 means a concurrent edit: re-read. If the draft already holds exactly the intended change, publish it;
   otherwise redo the replacement on the fresh version.
6. Keep the editor's drafts and revisions: use update, never delete and recreate.
7. Re-read the published items and re-lint their text. Report what changed, what was refused and why.

## Template strings in `src/`

Branch from the current `origin/feat/site-strategy` (fetch first: other sessions push there). Run `npm test` and
`npx astro check`. After any change that removes an element, check the layout at 1440 px for empty grid columns. Open
the change as a branch for the owner; do not push to `feat/site-strategy` directly.

## Environment notes

- The preview on `workers.dev` is not reachable from the cloud container. Read live content through the CMS
  connector, or crawl from the owner's browser tab.
- Image alt texts, captions and SEO fields are copy too: include them in a batch.
- Fixed by the owner and never rewritten: the home H1 and hero line, menu and category names, button labels listed in
  `.agents/product-marketing.md`.
