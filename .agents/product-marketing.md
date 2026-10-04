# Product marketing context: Cattelan Italia Maroc

Read first by `copywriting`, `copy-editing` and `cattelan-site-copy`. Everything here comes from the repo's
docs, the project FAQ and decisions recorded by the owner. Items marked **À CONFIRMER** must never be published.
Last compiled: 4 October 2026. Update this file when the client answers, not the skills.

## Precedence (when sources disagree)

1. Owner decisions (section 9)
2. Project FAQ and `Info about Cattelan.pdf` facts (section 6)
3. Model data in the CMS (`ec_models`) and official cattelanitalia.com pages
4. `cattelan-site-copy` house rules (section 8)
5. Generic skill advice (`copywriting`, `copy-editing`): useful for structure and editing, never overrides 1 to 4.
   Where a framework asks for urgency, scarcity, social proof or superlatives, skip it.

## 1. The business

- **Who:** Racha Home (SARL), operator of the Cattelan Italia showroom in Casablanca. Brand: Cattelan Italia S.p.A.,
  founded 1979 by Giorgio and Silvia Cattelan, Carrè (Vicenza), Italy.
- **What:** single-brand showroom for Cattelan Italia furniture: tables, chairs and stools, sofas and armchairs,
  buffets and bookcases, lighting, outdoor furniture. The whole catalogue can be ordered and customised, including
  models not on display.
- **Where:** 8-10 avenue du Docteur Mohamed Sijilmassi, Triangle d'Or, 20250 Casablanca.
  Hours: Monday 12:00 to 19:30, Tuesday to Saturday 9:00 to 19:30. Appointment optional.
  No private car park; valet service; street parking nearby.
- **Contact:** WhatsApp / phone +212 771 105 490 (**À CONFIRMER**: a magazine article lists another number),
  contact@cattelanitalia.ma.
- **Site status:** private, non-indexable preview. Brand licence not yet signed.

## 2. What the site must do

Let a visitor discover the furniture, check an exact reference, or find the showroom. Contacting the shop is never a
required step. Each page answers one need (see `docs/seo-page-map.md` for the page-by-page intent).

Primary actions, in order of frequency: see a model, request a quote, WhatsApp the showroom, book a visit,
download the catalogue (demo PDF until the official one arrives).

## 3. Audience (hypotheses from the FAQ and the client questionnaire; no research done)

| Visitor | Typically wants to know | Page |
|---|---|---|
| Homeowner in Casablanca | Is it authentic, what sizes and finishes, how long, what it costs to deliver, can I see it first | Collections, model pages, Showroom, FAQ |
| Homeowner in another Moroccan city | Do you deliver here, what do delivery fees depend on, can I see materials | FAQ, Sur mesure |
| Moroccans living abroad | Can I order and pay from abroad, deliver to a relative | **À CONFIRMER** (questionnaire Q13) |
| Architects, decorators, hotels, restaurants | Residential, hotel and commercial projects, trade contact | Professionnels |
| Someone checking a reference | Exact version, materials, dimensions, finishes, spec sheet | Model page |

Objections the facts can answer: price unknown before quote (quote process), delay (10 to 12 weeks), cancellation
(not possible after validation, stated plainly), delivery cost (free in Casablanca), seeing materials first
(showroom has all finishes).

## 4. Positioning

- **One line (owner's decision):** "Le premier showroom exclusif Cattelan Italia au Maroc". Never "premier showroom"
  alone.
- **Proof that exists:** designed and made in Italy; all brand finishes shown at the showroom; whole catalogue on
  order; installation included; 39 models in the site data (count again before writing a number).
- **Proof that does not exist yet (do not claim):** official reseller status, warranty terms, after-sales, awards,
  customer testimonials, named architect partners, delivered projects, which models are currently on display.

## 5. Voice

Luxury, calm, factual. A showroom advisor speaking to a client, not an advert. "Nous" for the showroom team.
French (France spelling, no Anglicisms). Short sentences. Each sentence carries a checkable fact: number + unit,
model, material, finish, place, day or service. If it cannot, delete it; never swap filler for other filler.

| We are | We are not |
|---|---|
| Precise (dimensions, finishes, counts) | Poetic or slogan-driven |
| Matter-of-fact about limits (no refund after validation) | Promising ("sans contraintes", "quels que soient") |
| Direct: say what the block gives the visitor | Urging ("vous attend", "découvrez") |
| Plain French | Stacked colon reveals, bare noun lists, gimmick lines |

Headlines name a place, object, material, number or the customer's question. Never an order or an infinitive, never
built on "vous/votre". Buttons act: "Voir le modèle", "Demander un devis", "Prendre rendez-vous", "Nous écrire",
"Télécharger le catalogue" (WhatsApp buttons: WhatsApp icon, accessible name "… sur WhatsApp").

## 6. Facts you may state (verified)

- Authentic, designed and made in Italy.
- Most collections can be customised (dimensions, materials, finishes, woods, ceramics, marbles, metals, fabric or
  leather); all brand finishes are shown at the showroom as samples or on displayed pieces.
- Delay: "10 à 12 semaines au maximum après validation de la commande", custom pieces included. Never "fabriqué en
  10 à 12 semaines".
- Order steps: advice, detailed quote, validation, manufacture in Italy, follow-up to delivery and installation.
- Deposit 50 % at validation, balance before delivery. Payment: card, bank transfer, cheque.
- A validated order is neither exchangeable nor refundable.
- Installation included. Delivery free in Casablanca; elsewhere in Morocco, cost depends on destination (no figure).
- Delivery covers all of Morocco.
- Showroom: address, hours, valet, no private car park (section 1).
- Residential, hotel, restaurant and commercial projects are supported.

## 7. Facts you must not publish yet (À CONFIRMER, ask the client)

Warranty and after-sales; "représentant officiel" / "revendeur officiel" (until the written brand licence is signed);
current models on display (list expected at the 9 October shoot); team names, size and languages; quote delay; home
measuring service; delivery to Bouskoura, Dar Bouazza, Mohammedia; delivery fee ranges; instalments beyond the
deposit; payment from abroad; trade terms; the Berrada family / Diva Ameublement story; beds category models;
final catalogue PDF; public phone number; publication director's name. Full list: `docs/questionnaire-contenu-racha-home.md`
and `docs/demandes-client.md`.

## 8. House rules and banned language

Authoritative rules live in the `cattelan-site-copy` skill and the linter (`node scripts/copy-lint.mjs`, allow-list
in `scripts/copy-lint-allow.txt`). Short version:

- No stock phrases: univers, signature, élégant, raffiné, intemporel, savoir-faire, sublimer, harmonie, inspiration,
  découvrir, explorer, expérience, accompagner, votre intérieur, iconique, épuré, qualité, "à votre disposition",
  "vous attend", "de quoi", "voici comment"; the linter has the full list.
- No vague quantity where a number exists ("près de quarante" becomes "39 modèles"; count from the data).
- No guarantee nobody can give. No production notes in public copy (except the preview notice and demo catalogue).
- A model's lead (also used on cards and meta) and its description never repeat each other: lead = identity + key
  numbers; description = construction, finishes, options. No sentence twice on a page.
- Specs: "L × P cm, hauteur H cm", always with units; "Piètement de 160 cm"; finish groups in French.
- Terms: buffet (not bahut); Botero base "revêtue d'argile"; Zuleika "habillée de cuir".
- Do not reuse the same sentence across Showroom, Professionnels and FAQ (known repetition).

## 9. Owner decisions on record

- Hero stays "Le premier showroom exclusif Cattelan Italia au Maroc"; home hero line chosen by the client in copy v8.
- Category and menu names follow the SEO strategy: keep "Luminaires et lustres", "Mobilier extérieur", "Sur mesure",
  "Journal". Brand name in H1s. Category intros are rewritten, never deleted.
- One WhatsApp label across the site.
- FAQ keeps its facts (delay, deposit, payment, delivery, cancellation) even if an audit prefers minimal copy.
- Never replace a precise number or measurement guide with a vaguer sentence.

## 10. Workflow for any copy task

1. Read this file, then the relevant block of `content/copy-v8.json` (latest copy) and the page's intent in
   `docs/seo-page-map.md`.
2. Draft with `copywriting`; tighten with `copy-editing`; finish with `cattelan-site-copy` and the linter.
3. Every proposed line gets a source: FAQ, model data, official page, or an owner decision. No source: list it
   under "données client" instead of writing it.
4. Report per entry: Appliqué, Adapté, Refusé (with the contradicting source), or Données client.

## Sources in this repo

`content/site-information-pages.json` (FAQ, À propos, Votre projet, legal) · `content/copy-v8.json` ·
`docs/seo-content-strategy.md` · `docs/seo-page-map.md` · `docs/demandes-client.md` ·
`docs/questionnaire-contenu-racha-home.md` · `docs/demande-licence-marque.md` ·
`docs/revue-copy-editing-copywriting-2026-10-03.md`
