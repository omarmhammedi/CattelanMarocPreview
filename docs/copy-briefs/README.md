# Page briefs: how copy gets written

**Why briefs exist.** The owner likes the information on the site but not its style. If a drafting agent reads the
current text, it copies the current style. A brief gives it the structure of the page (every slot to fill) and the
facts allowed in each slot, and nothing else. It never sees the current wording.

## What a brief contains

- **Page card:** route, CMS item, purpose, the visitor, the one main action.
- **Slots:** every text the page needs, named as in the CMS (`title`, `intro`, `brand.heading`, `brand.text`, ...),
  each with its role (what it does for the visitor), a length limit and the facts allowed in it (by id).
- **Fixed items:** texts decided by the owner or labels the templates expect. Copied as-is, never rewritten.
- **Fact bank:** short atomic statements with an id and a source. No wording from the current site.
- **Not allowed:** facts that must stay out (`.agents/product-marketing.md`, section 7).

## What the drafting agent reads (and nothing else)

1. `.agents/product-marketing.md` (facts, audience, target style, rules)
2. `.agents/press-and-brand-sources.md` (story facts, with what may not be used)
3. `.agents/style-references.md` (method only)
4. `docs/copy-drafts/a-propos-2026-10-04.md` (worked example of the target style)
5. The brief for the page

It must **not** read `docs/reference/current-site-copy-2026-10-04.md`, `content/copy-v*.json`, the live CMS item or
the live site.

## Output format (so the linter can read it)

A Markdown file in `docs/copy-drafts/<page>-<date>.md` with a `## Page copy` section. One line per slot:

```
**title:** ...
**intro:** ...
**brand.heading:** ...
**brand.text:** ...
**collections.button:** ...
```

A slot name ending in `heading`, `title` or `h1` is checked as a heading; `button`, `cta` or `cta_label` as a button;
`eyebrow`, `seo_title`, `meta_description`, `caption` or `alt` as short copy; everything else as body copy. Extra
notes go in other `##` sections: they are not linted. Then run `node scripts/copy-lint.mjs <draft>`.

## Drafting prompt

> Write the copy for the page in the attached brief, with the `copywriting` skill. Use only the facts in the fact
> bank and the files listed above. Write every slot, keep the length limits, copy the fixed items unchanged, follow the
> target style in `product-marketing.md` section 5. Where a slot needs a fact you do not have, write `[NEED: ...]`.
> Give two alternatives for each heading. Save the result in `docs/copy-drafts/` in the output format above, then run
> the linter and fix every blocking finding.

## Status of the briefs

| Page | Brief | Draft |
|---|---|---|
| À propos | not needed (drafted first, used as the worked example) | `docs/copy-drafts/a-propos-2026-10-04.md` |
| Accueil | `home.md` (ready) | to do |
| Other pages, 8 families, 5 guides, models | to do | to do |
