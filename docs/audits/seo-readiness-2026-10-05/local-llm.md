# Local search and answer-engine readiness — 5 October 2026

Scope: current repository, anonymous read-only GET requests to the Cattelan preview at approximately 11:47 UTC, and an OpenSEO `get_business_profile` lookup of the exact website Place ID at 11:53 UTC. This report does not establish access to the Google Business Profile management account, submit a listing, contact reviewers, change the domain or enable indexation. Later deployment evidence is recorded separately.

## Verified foundation

| Surface | Current evidence | Implication |
| --- | --- | --- |
| Home and showroom | HTTP 200; server-rendered `FurnitureStore` with matching business name, postal address, telephone, email, coordinates, hours, image and map link | Search engines can read the same practical information visitors see once the production website is crawlable. |
| Shared identity | Cattelan Italia Maroc; 8-10 avenue du Docteur Mohamed Sijilmassi, Triangle d’Or, 20250 Casablanca, Maroc; +212 771 105 490; contact@cattelanitalia.ma | Use these current owner-approved values when checking external citations. Do not replace them with a phone number copied from a press article. |
| Opening hours | Monday 12:00–19:30; Tuesday–Saturday 09:00–19:30; Sunday closed; Casablanca local time | Native CMS settings feed both visible contact information and the structured opening hours. Exceptional holiday hours still require maintenance in the external business profile. |
| Location | Latitude 33.5927007; longitude -7.6426741; map destination Place ID `ChIJnXzIEVjTpw0RXul0XQgeEHw` | This identifies the map destination used by the website. It does **not** establish who manages the Google listing or whether it has completed verification. |
| External identity | `sameAs` contains `https://www.instagram.com/cattelanitalia.ma/` | The published profile is represented. A Google Business Profile URL is not currently in `sameAs`; add only a verified matching public profile, without assuming account access. |
| Local service information | Showroom page includes real location information, photos, access/contact details, four visible FAQs, remote ordering and installation information | Existing local content is useful. Additional city pages require distinct, substantiated service information rather than repeating Casablanca copy. |
| FAQ | 22 visible questions and answers also represented in `FAQPage` JSON-LD | The answers cover selection, ordering, payment, delivery, visits and professional projects in readable HTML. Structured data should continue to match these visible answers. It is not a promise of a rich result or an AI citation. |
| Preview controls | `/robots.txt` returns `User-agent: *` and `Disallow: /`; HTML sends `X-Robots-Tag: noindex, nofollow`; `/llms.txt` sends `noindex` | These are intentional development controls. The preview is not a valid baseline for organic ranking or AI-search inclusion. |

The source also supplies `Organization`, `BreadcrumbList`, model `Product` and journal `BlogPosting` graphs. Existing helpers omit unsupported price, stock, review and rating properties instead of fabricating them. The site does not require additional schema types merely to be considered by AI search.

## Existing Google listing: provider lookup

OpenSEO returned an existing listing for the exact Place ID used in the website’s map link. The result is **Cattelan Italia**, category **Magasin de meubles**, with phone **+212771105490**, address **8-10 Av. Mohamed Sijilmassi, Casablanca 20250**, coordinates **33.5927007, -7.6426741** and the same weekly opening hours as the website. These location and contact matches identify the relevant listing; abbreviated address formatting is not a different location. The website’s longer trading name does not justify adding “Maroc” or SEO keywords to the listing name: the real signage remains authoritative.

The provider reports `is_claimed: true`. This establishes that the provider considers the existing listing claimed; it does **not** establish which Google account manages it, give this workspace management access, or independently verify the account’s current verification state. Start from this listing and identify its authorized manager. Do not create a new duplicate.

The actionable difference is its website URL: **`http://www.cattelanitalia.com/`**, the Italian manufacturer, rather than the Moroccan showroom domain. Once `cattelanitalia.ma` is actually live and verified, the authorized manager should replace that field with the local production URL and add the local appointment URL. Preserve the current destination until that launch; never substitute the excluded preview URL.

OpenSEO also reported **4.9/5 from 42 ratings and 22 photos**. These are provider observations at lookup time, not independently validated review totals, endorsements or permission to reproduce reviews. They were not added to the website or its structured data. The private source receipt is `2026-10-05T11-53-28-890Z-verified-place-profile.json` in the release coordinator’s OpenSEO evidence directory; only the public business facts are summarized here.

## Implemented factual correction

The old `/llms.txt` had a second set of commercial promises hardcoded in its route. The live FAQ stated “La plupart des collections se personnalisent, selon le modèle”; the file instead said “Tout le catalogue Cattelan Italia peut être commandé et personnalisé.” This was an actual discrepancy, independently of whether an assistant reads the optional file.

The route now reads the published FAQ through the same EmDash content adapter as the public website and reproduces its visible question/answer sections. Shared contact information still comes from native site settings. Cleared answers disappear, missing or individually `noIndex` FAQ content is omitted, and a safe native FAQ canonical is used for the source link. The route retains its content type, no-store caching and preview noindex header. Requests containing any `_preview` query parameter return a private, nonindexable 404 **before any CMS read**, so a valid signed preview token cannot export draft answers even after production indexation is enabled. No payment, delivery, customization, service-area or parking promise is maintained separately in source code.

Validation: five targeted regression tests pass, covering changed/cleared answers and contact details, omitted FAQ content, safe canonical overrides, preview requests that never reach the CMS loader, and ordinary production/preview response headers. A current public FAQ fixture reproduced all 22 published answers and excluded the old “tout le catalogue” personalization promise. This is code validation; deployment and live rechecking must be recorded by the release coordinator.

The existing Google Business Profile checklist now starts from the matching listing reported as claimed, with management access still to establish. It explains that Google chooses any verification method requested by the account, removes guaranteed placement and automatic duplicate-penalty claims, and qualifies personalization by model. The local website URL change is explicitly a production-launch action. The checklist remains an operational document, not evidence that account changes occurred.

## Work that matters next

1. **Establish management access to the existing listing.** The exact Place ID lookup already matches the showroom’s location, telephone and hours and reports a claimed listing. Identify the authorized manager and confirm the account state. At production launch, replace the current manufacturer website link with the local showroom domain and add the appointment URL. Do not create a duplicate listing or point it at the preview.
2. **Prepare the authorized production launch.** Keep the preview excluded. On the permanent domain, align canonical URLs, sitemap, redirects and crawl rules, then confirm Google/Bing can fetch the public pages and media. Check the CDN/WAF as well as robots.txt. Search Console and Bing Webmaster Tools access are needed for verified indexing and search-performance data.
3. **Maintain accurate local proof.** Add the real approved showroom photography, current opening/holiday hours and useful access information. Ask the owners of inconsistent citations to correct them through an authorized communication workflow. Do not assert awards, reviews, availability or professional credentials from an unrelated listing or a keyword report.
4. **Use the first journal articles as durable answer pages.** Keep their established URLs, model-specific evidence, manufacturer sources and links to the appropriate collections/models. Add concise answers or comparison detail only when it helps a real choice. Preserve visible authorship and update dates when substantive revisions are made. Avoid bulk city pages or invented firsthand experience.
5. **Measure outcomes after launch.** Track indexed canonical pages, search queries, clicks, local profile actions and actual enquiries separately. A periodic fixed set of local/product questions can record answer-engine citations and their source URLs; results vary and do not establish a universal “LLM ranking.” Use observations to improve weak pages rather than multiplying new articles without a gap.

## Primary guidance checked

- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features): ordinary SEO practices apply; a supporting page must be indexed and eligible for a search snippet; important information should be textual and internally linked; structured data should match the visible text. No special AI text file or schema is required, and inclusion is not guaranteed.
- [OpenAI: crawlers and user agents](https://platform.openai.com/docs/bots): `OAI-SearchBot` controls automatic search discovery; `GPTBot` is a separate training control. Allowing search discovery does not require a blanket decision to allow training. At launch, verify the intended search crawler and published IP ranges are not blocked by the CDN. `ChatGPT-User` represents user-triggered visits and is not the automatic search-discovery control.
- [Google Business Profile: improve local ranking](https://support.google.com/business/answer/7091?hl=en): complete information, verification, accurate hours, photos and legitimate reviews can help; relevance, distance and prominence influence results. No listing, markup or content change guarantees a map-pack position.

The optional `llms.txt` correction removes inconsistency. Crawlable, useful public pages, trustworthy local facts and measured production results remain the priorities.
