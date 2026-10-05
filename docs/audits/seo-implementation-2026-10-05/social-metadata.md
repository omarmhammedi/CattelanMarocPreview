# Native social images — 5 October 2026

Migration `0029-social-images` was applied to the live preview on 5 October 2026 at 12:52 UTC. A separate read-only check completed at 13:00 UTC: all seven pages returned HTTP 200, each emitted exactly one matching `og:image` and `twitter:image`, and both source image URLs returned HTTP 200 with `image/jpeg`. Every page retained `X-Robots-Tag: noindex, nofollow`.

The seven informational pages without a template image previously had empty native EmDash SEO image fields: `/a-propos/`, `/votre-projet/`, `/faq/`, `/mentions-legales/`, `/confidentialite/`, `/sur-mesure/` and `/professionnels/`. All seven were published without pending drafts when inspected. The native site settings had no default social image. These were missing share-preview images, not missing page titles or descriptions.

Migration `0029-social-images` explicitly fills only those empty per-page `seo.image` values. EmDash renders that field as `og:image` and the matching Twitter card image. No template fallback or site-wide default is introduced, so editors can still replace or clear the image in the normal SEO panel. Root-relative native media paths remain valid when the authorized production domain replaces the preview origin. Bodies, publication state, canonical URLs, robots fields, and other native SEO fields must remain unchanged.

| Pages | Existing asset | Why this image |
| --- | --- | --- |
| About, your project, FAQ, legal notice, privacy | `cattelan-italia-casablanca-entree-showroom.jpg`, 2000 × 3000 | The owner's photograph identifies the real local showroom. It is already published on the home and showroom pages; the bytes match the owner-photo manifest. |
| Customization, professionals | `cattelan-skorpio-9997cf91-aae7-42d4-8f2c-083db41f17cf.jpg`, 1200 × 735 | The published homepage detail shows the Skorpio glass top and metal base, illustrating material selection and technical advice. |

Both public source files returned HTTP 200 with `image/jpeg`; their SHA-256 checksums are recorded in `content/social-images-2026-10-05.json`. The source images were visually inspected. The original owner photograph is portrait-oriented, so social networks may crop its preview differently; no altered photo or fabricated showroom scene is introduced.

The migration refuses unpublished entries, existing drafts, replaced source images, changed revision tokens and concurrent edits. It preserves any image already selected by an editor. Every save requires private before-images, sends only `_rev` plus `seo.image`, then compares all other entry fields except update bookkeeping. Five targeted tests cover preservation, idempotence, source/draft checks, backup failure and an edit arriving between saves.

All seven native before/after receipts were checked independently: bodies, status, live/draft revision IDs, SEO titles and descriptions, canonical overrides and native `noIndex` values were preserved. Private migration evidence is stored under `.wrangler/migrations/0029-social-images/2026-10-05T12-52-55-405Z/`; the anonymous HTTP verification is `.wrangler/seo-implementation-2026-10-05/social-images-live-verification.json`. These private files remain outside the public repository.

The existing native map destination already identifies the verified Google Place ID and is emitted as `FurnitureStore.hasMap`. EmDash 0.41's native `social` settings accept only six named social networks and would strip an invented Google key. No unsupported setting, duplicate listing, review data or external account write is added for this repair.
