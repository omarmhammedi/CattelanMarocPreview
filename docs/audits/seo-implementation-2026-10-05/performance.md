# Rendering and model lookup — 5 October 2026

## Implemented changes

The page head previously fetched a Google Fonts stylesheet before rendering. Four
mobile Chromium samples identified that request as render-blocking, taking
482–515 ms. Albert Sans is a fallback after Helvetica in the existing font stack,
so it was not actually used by that browser despite the blocking stylesheet.

`SeoHead.astro` now imports bundled font CSS. The exact two Google Fonts v4 WOFF2
files are served from `/fonts/albert-sans/`, with the original Unicode subsets,
weights 200–500 and `font-display: swap`. The Helvetica-first stack is unchanged;
there is no unnecessary font preload. The unmodified files, SIL Open Font License
and source URLs are checked into `public/fonts/albert-sans/`.

The homepage hero image was already eager, responsive and high priority, but its
element appeared at byte 339,910 of 381,682 uncompressed HTML bytes, after the
inline map symbols. In the first baseline sample its request started 537 ms after
the response began. A homepage-only responsive image preload now announces the
hero in the head, after viewport metadata. `Home.astro` and `index.astro` share
the exact `src`, `srcset` and crop-aware `sizes` calculation through
`home-images.ts`. Image quality, composition and layout are unchanged. A cleared
CMS hero emits no preload; other routes and signed editor previews keep their
existing loading behavior.

The model route previously loaded the families collection and then loaded all eight
families again with their complete selected models, including finish swatches,
just to determine the current model's family. Migration 0030 adds `models.families`,
a native inverse view of the existing `family_models` relation. The model read
now loads only its own related families. No custom database query or global cache
was introduced. Native pagination, publication and signed-preview rules remain
in effect. Parents sort by `sort_order`, then native database ID, matching the
previous collection query; that matters when a model belongs to several families.

Migration 0030 writes one optional schema field. It writes no content, relationship
edges, revisions or publication state. It refuses conflicting fields and observed
schema drift, requires a private before-image, restricts the remote origin to the
Cattelan preview and limits API writes to creation of that exact field. Apply it
before deploying the route that requires it.

## Verification before deployment

- A Chromium font fixture forced Albert Sans as primary to exercise both subsets.
  Weights 200, 300, 400 and 500, French accents and extended Latin produced identical
  text metrics and byte-identical screenshots before and after self-hosting.
  Both local font files loaded successfully, with no external font requests.
- Eight focused unit checks passed: migration idempotence, backup requirement,
  conflicting bindings, concurrent schema edits, seed parity, origin/API guards,
  parent ordering including native-ID ties, and retention of 101 paginated parents.
- Two additional hero helper checks passed. The real local homepage was checked
  in Chromium at 390 px and 1,440 px, both DPR 2: the displayed responsive hero
  was initiated by its head preload with exactly one request, and all image
  attributes matched. Viewport metadata preceded the preload. Clearing and
  publishing the fixture hero removed both image and preload; the original was
  restored. A model route did not inherit the homepage preload.
- The current seed validates: six collections, 66 entries, 1,638 source images.
- Six native integration scenarios passed on the explicitly marked disposable CMS
  at `http://localhost:4331`. Synthetic test entries were removed through native APIs.

| Native integration scenario | Result |
| --- | --- |
| Add inverse field while an existing model draft is pending | Content, revision IDs and parent edges preserved |
| Render a model assigned to several families | Correct first published family; hidden parent and model draft excluded |
| Open signed model preview | Draft shown; response remains non-indexable |
| Publish a draft created before the new field | Existing parent edges preserved |
| Change family display order in a draft, then publish | Public order unchanged until publication, then refreshed immediately |
| Edit relationships using the native inverse picker | Public links unchanged until publication; signed preview shows staged selection |

The new reference field necessarily adds a `references.families` view to native
GET responses. Tests exclude only that newly exposed view when comparing the
model before/after; they independently compare the underlying parent list.

## Live baseline

Measured against `https://cattelan-maroc-preview.cattelan.workers.dev` before these
changes, using Chromium, a 390 × 844 viewport, DPR 2, CPU throttling ×4, a 150 ms
network latency setting, 1.6 Mbps download and an empty browser cache. Each page
was sampled twice, with no scrolling or form submission. These are laboratory
observations from this execution environment, not field Core Web Vitals or a
Lighthouse score.

| Page | Run | TTFB | FCP | LCP | Google Fonts CSS duration |
| --- | ---: | ---: | ---: | ---: | ---: |
| Home | 1 | 1.43 s | 2.10 s | 6.35 s | 499 ms |
| Home | 2 | 1.21 s | 1.90 s | 6.18 s | 482 ms |
| Greta | 1 | 4.52 s | 5.17 s | 5.26 s | 515 ms |
| Greta | 2 | 2.56 s | 3.29 s | 3.29 s | 507 ms |

No layout shifts or failed resource requests were observed in these samples.
Greta rendered 1,802 DOM elements and retained all 361 CMS finish entries. The
home's LCP was its large hero image; its remaining image transfer cost is not
removed by the font change. Server response times varied appreciably, so these
samples alone do not establish an expected percentage improvement.

Private receipts and the repeatable browser scripts are in
`.wrangler/performance-2026-10-05/`. Native integration receipts are in
`.wrangler/model-families-0030/`. They are excluded from the public repository.

## Deployment measurement

Pending at the time of this note. Repeat the same four live samples after release,
confirm that external font requests are absent, and report results with the same
network and runtime limitations. Do not infer a ranking or indexing improvement
from a laboratory timing change.
