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

Measured after deployment of application commit `f8e10c45` to Worker version
`05286e1f-6b64-41bd-a8b0-595df2c17631` on 2026-10-05. The same script, browser,
viewport, CPU/network throttling and cache settings produced these four samples:

| Page | Run | TTFB | FCP | LCP | External font requests |
| --- | ---: | ---: | ---: | ---: | ---: |
| Home | 1 | 1.15 s | 1.76 s | 7.26 s | 0 |
| Home | 2 | 1.74 s | 2.37 s | 7.98 s | 0 |
| Greta | 1 | 2.33 s | 2.81 s | 2.81 s | 0 |
| Greta | 2 | 0.96 s | 1.41 s | 1.41 s | 0 |

The homepage hero request now starts 75 ms and 72 ms after TTFB, versus 537 ms
and 552 ms before, with resource initiator `link` rather than `img`. A separate
live check at 390 px and 1,440 px, DPR 2, confirmed the preload and displayed
image choose the exact same responsive candidate, with one request and no
horizontal overflow. The image bytes and quality remain unchanged at 285,378
bytes for the mobile candidate. There were no external font requests, failed
resources or layout shifts in the four timing samples, and Greta retains all
361 finish entries.

Greta's response and rendering times were lower in these samples. The homepage's
overall LCP was **higher**, despite earlier image discovery. Image transfer and
competition with nearby lazy images remain an optimization target; the homepage
does not yet demonstrate a good mobile LCP result under this constrained lab
profile. Variable Worker/network timing and only two observations per page do
not establish a field-performance percentage or prove the preload caused the
LCP difference. No ranking or indexing benefit is inferred from these timings.

The preview continues to return `noindex, nofollow`. The unchanged baseline is
saved privately as `before.json`; after samples and live preload verification
are `after.json` and `hero-preload-live.json` in the same private evidence folder.

### Controlled preload comparison

Because the normal homepage samples had a higher LCP after release, a separate
six-navigation check replayed the same captured live HTML with only the hero
preload removed in the comparison variant. Runs alternated in the order with,
without, without, with, with, without, using the same mobile viewport, CPU and
network throttling and an empty browser cache. Playwright fulfilled the main
HTML request; these timings exclude normal origin HTML delivery and must not be
compared directly with the live tables above.

| Pair | LCP with preload | LCP without preload | Image request counts, with / without |
| --- | ---: | ---: | ---: |
| 1 | 5.216 s | 5.356 s | 6 / 7 |
| 2 | 4.792 s | 5.096 s | 7 / 7 |
| 3 | 4.456 s | 4.528 s | 6 / 6 |

All six runs selected the same 1080 px, 285,378-byte hero exactly once, at high
network priority. A preload regression was not reproduced. The two pairs with
matching image-request counts favored the preload by 304 ms and 72 ms; the first
pair also fetched one fewer nearby lazy image, which confounds its comparison.
The sample is small and browser lazy-loading timing varies, so this supports
retaining the narrow discovery improvement without claiming a general speed gain.

In the normal live runs, the hero request duration increased from about 4.35–4.37 s
before release to 6.00–6.12 s afterward, even though discovery happened earlier.
Four nearby photographs totaling roughly 740 kB were also transferring. This
waterfall supports investigating image transfer and competing requests next;
it does not establish the exact network cause of the observed difference. The
controlled results are saved privately in `hero-ab.json`.

A final bounded priority check recorded Chromium's initial priorities and every
`Network.resourceChangedPriority` event during the same mobile profile. All four
nearby lazy photographs started and finished at **Low**, without an automatic
boost; the hero stayed **High**. Only the small visible header logo was promoted
to High. Adding `fetchpriority="low"` to those lazy images therefore has no
demonstrated priority problem to correct, and no such application change was
made. The remaining work concerns the image byte budget and delivery behavior,
with visual comparison required before changing rendition quality or artwork.
The private trace is `image-priorities.json`.


## Mobile image delivery follow-up — 5 October 2026

Homepage photographs now use native HTML picture sources on screens up to
820 px: AVIF at quality 85, followed by WebP at the same quality. The existing
WebP desktop candidates remain the fallback. Additional mobile candidate widths
include 640 and 800 px; the collection card sizing hint now accounts for the
page gutters. The 390 px, DPR 2 hero needs about 784 source pixels, so it can
select 800 px instead of jumping from 768 to 1080 px. Logos retain their existing
rendering, and originals, CMS media references, crop positions, alt text and
publication behavior are preserved.

The responsive hero preload selects the same format, width and sizing hint as
the image. Its mobile and desktop media conditions are complementary. The AVIF
preload has no fallback href, avoiding an unnecessary wrong-size request in
browsers without responsive preload support. Unsupported AVIF is handled by
native picture selection; image display does not depend on JavaScript.

No new transformation service or database migration is required. Native EmDash
image responses retain their existing `public, max-age=0, must-revalidate` cache
policy because replacing an original can reuse its storage key. Unsupported
external, animated, SVG and incomplete image records retain the existing path.

| Selected mobile photograph | Previous encoded bytes | New encoded bytes | Reduction |
| --- | ---: | ---: | ---: |
| Homepage hero | 285,378 | 113,787 | 60.1% |
| Chair collection card | 321,282 | 177,773 | 44.7% |

Visual comparisons at the displayed mobile dimensions and DPR 2 retained clear
furniture edges, stitching, textures and showroom lettering. These are new
encodings, not byte-identical artwork. No quality setting was lowered.

A six-navigation controlled comparison alternated the captured deployed HTML
and the same HTML with the actual new helper output and compiled assets. It
used a 390 × 844 viewport, DPR 2, CPU throttling ×4, 150 ms latency, 1.6 Mbps
download and a fresh browser cache. Origin HTML and compiled asset responses
were supplied by the harness; image requests used the native remote endpoint.
Therefore these timings isolate browser/image delivery and are not comparable
to the live-origin tables above.

| Controlled variant | Three LCP samples | Median LCP | Median initial image transfer |
| --- | --- | ---: | ---: |
| Previous delivery | 6.016, 5.916, 5.404 s | 5.916 s | 917,520 bytes |
| Mobile picture sources | 2.352, 3.344, 2.740 s | 2.740 s | 527,082 bytes |

The controlled median initial image transfer fell 42.6%. All 23 image bounding
rectangles matched; all six runs had zero layout shifts and no failed requests.
Every candidate run fetched the selected hero exactly once. Native lazy loading
can vary the count of nearby images, so this small sample does not establish a
field Core Web Vitals result or a guaranteed speed improvement.

Validation: all 357 unit tests passed; Astro checked 241 files with zero errors,
zero warnings and three existing hints; the Cloudflare production build and
Cattelan target guard passed. Native Chromium checks on the marked disposable
CMS covered mobile and desktop, JavaScript disabled, and an unsupported AVIF
MIME fixture that exercised WebP fallback without an unused AVIF preload. They
verified one hero request, correct preload matching, preserved frames, alt text,
mobile drift and no horizontal overflow. Clearing and publishing the local hero
removed the image and preload; the original fixture was restored and published.
A product route retained its existing behavior. Safari was not tested.

Private measurement scripts, before/after encoding comparisons and browser
receipts are excluded from Git under `.wrangler/mobile-images-2026-10-05/`.
