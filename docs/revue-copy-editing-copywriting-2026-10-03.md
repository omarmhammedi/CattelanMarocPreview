# Copy review: copy-editing + copywriting skills (live site, 3 October 2026)

Crawl of https://cattelan-maroc-preview.cattelan.workers.dev: 65 pages, all visible text, titles and meta descriptions.
Both skills were run against the house rules (`cattelan-site-copy`), which take precedence: luxury tone, facts only,
no promises nobody can give. Proposals the skills make but the house rules forbid are listed separately (section E).

Note: the live CMS no longer matches the audit "Révision 2" word for word (another session already rewrote part of it,
e.g. the home collections heading). Nothing below has been applied.

---

## A. Blocking conflicts to settle before migration 0024 runs

The audit (Révision 2) contradicts decisions recorded in the house rules:

| Audit entry | Audit asks | House rule | Proposal |
|---|---|---|---|
| H01 | Hero "Cattelan Italia à Casablanca" | Hero stays "Le premier showroom exclusif Cattelan Italia au Maroc" (your decision) | Keep the current hero unless you now prefer the audit |
| C01-07, C06-01 | "Luminaires et lustres" → "Suspensions et lampadaires" | Category names follow the SEO strategy ("Luminaires et lustres") | Keep the SEO names in the H1 and menu |
| C01-08, C07-01 | "Mobilier extérieur" → "Mobilier pour terrasses couvertes" | Same | Keep it in the H1; say "couvertes" in the intro |
| M01 | Menu "Sur mesure" → "Personnalisation" | Keep "Sur mesure" | Keep it |
| C01-02, C02-02, C05-02, C06-02, C08-02, C09-02 | Delete the category intros | Category intros are rewritten, never deleted | Rewrite them (section C) |
| J01 | "Journal" → "Conseils d'aménagement" | Keep "Journal" | Keep the H1 and add the topic in the intro |

**Your decision is needed on these 6 lines.** The rest of the audit is compatible.

---

## B. AI tells and patterns (copy-editing "AI-Tell Check")

1. **Colon reveal, used on almost every page.** A list, then a colon, then the point:
   - Home cards: "Verre, céramique, bois ou argile : des tables rondes…"
   - Journal cards: "45 à 55 cm…, 90 cm devant les portes : les mesures et les modèles pour…"
   - "Un seul élément très dessiné, une finition en commun, des chaises qui passent sous le plateau : trois règles pour…"
   - Catalogue: "Formats, finitions, délai, devis : écrivez-nous sur WhatsApp."
   - "Céramiques, bois, laques, métaux, tissus et cuirs : toutes les finitions de la marque…" (Professionnels, Sur mesure)

   Proposal: put the subject first. "Les tables rondes vont jusqu'à 180 cm, les rectangulaires jusqu'à 320 cm, en verre, céramique, bois ou argile."
2. **Bare list of nouns used as a sentence or heading:**
   - FAQ intro: "Personnalisation, délais, acompte, paiement, livraison, échantillons et accès au showroom."
   - Sur mesure H1: "Formats, matières et finitions".

   Proposal: FAQ intro "Les réponses sur la commande, la livraison et le showroom de Casablanca."; Sur mesure H1 "Mobilier Cattelan Italia sur mesure".
3. **Trailing pile-on.** Home intro: "Tables, chaises, canapés, rangements et luminaires de la maison italienne, et tout son catalogue sur commande, fabriqué en Italie."

   Proposal: "Tables, chaises, canapés, rangements et luminaires de la maison italienne. Tout le catalogue se commande au showroom."
4. **List stacked to five items.** Journal card for the salon article: "80 à 90 cm de passage, 40 à 45 cm…, canapé droit ou composable, fauteuil assorti ou contrasté, tissu ou cuir : les repères…"

   Proposal: keep the two measurements and stop: "80 à 90 cm de passage autour du salon, 40 à 45 cm jusqu'à la table basse."
5. **Gimmick lines:**
   - "Si la première est la plus longue, c'est un buffet." (buffet article)
   - "en deux jours, vous saurez si les passages suffisent." (table article)
   - "c'est le choix d'une salle à manger avec des enfants." (chairs article)

   Proposal: delete; the audit (J07, J51, J40) already replaces all three.

## C. Clarity, repetition and specificity (sweeps 1 and 5)

6. **The same sentence appears twice on a page.** The house rule: lead = identity + key numbers, description = construction and options. Found on:
   - Ruby: "Le fauteuil Ruby Lounge reprend la même structure" appears in the lead and the description.
   - Cloudine, Aladdin, Paris: "seule ou en composition / en grappe de deux à six/douze" is repeated.
   - Botero Ker-Wood Round: the "version T" sentence is repeated.
   - Butterfly: "240 ou 300 cm, rectangulaire ou aux angles adoucis" is repeated.
   - Napoleon Keramik: "jusqu'à quatorze personnes" is repeated.
   - Cosmos: "fumé ou bronze, 120 ou 157 cm" is repeated.
   - Glenn: "au sol ou au mur" is repeated.
   - Dodo: the opening sentence is repeated.
   - The audit fixes most of these; Cloudine (C03-01-2 covers only the description) and Glenn still need one more cut.
7. **The same text on two pages:**
   - The 8 collection descriptions on /collections/ are word for word the home cards.
   - Each journal article's opening paragraph is the same as its card on /journal/.
   - "Toutes se commandent depuis Casablanca, même avant d'être exposées" is on both À propos and the FAQ.
   - The client-appointment paragraph appears 3 times: Showroom, Professionnels and FAQ.

   Proposal: give the /collections/ page its own one-line facts per family (number of models plus the key size); keep the home cards short.
8. **A vague quantity where the fact exists:**
   - "Près de quarante modèles" should read **"39 modèles"**.
   - "près de 300 revêtements", "plus de 200 teintes", "plus de cent teintes" and "plus de trente teintes": give the exact count from the finish data, or drop the number.
9. **Wrong or invented facts in meta descriptions (shown in Google):**
   - Luminaires: "Suspensions, lampadaires, lampes à poser et appliques". There is no table lamp or wall light among the 4 models. Proposal: "Suspensions Paris, Aladdin et Cloudine en verre artistique et Bloom, en suspension ou en lampadaire. Showroom de Casablanca."
   - Tables: "verre, bois, céramique ou marbre naturel". No model has natural marble, and argile is missing. Proposal: "Neuf tables Cattelan Italia en verre, céramique, bois ou argile, rondes jusqu'à 180 cm et rectangulaires jusqu'à 320 cm."
   - Ruby: "Ruby S200 et AC80" uses internal codes. Ruby Lounge: "micro nubuck" is missing the hyphen and "81 × 92 × 76 cm" doesn't follow the site format.
   - Rhonda: promises "différences avec les autres versions", which the page doesn't give.
   - Greta: "appui arrière dédoublé" and "revêtements fixes" are jargon. Proposal: "Chaise Greta : dossier rembourré prolongé en accoudoirs, 62 × 62 cm, hauteur 78 cm. Structure en acier laqué, cinq teintes."
   - Airport: says "module Desk" while the page says "bureau"; use one word.
   - Banned words: "Explorez" (Chaises), "Découvrez" (Canapés, Luminaires).
   - Showroom: mentions "chambres". No bed is in the catalogue, so check with the client before keeping it (also in audit S00).
10. **Delay wording.** Professionnels says "fabriquée en Italie en 10 à 12 semaines". The house rule wording is "livrée 10 à 12 semaines au maximum après validation de la commande".
11. **Headings built on "vous/vos" or slogans (house rule):**
    - Professionnels: "Vos rendez-vous clients" → "Rendez-vous clients au showroom".
    - Professionnels: "Un seul conseiller, du devis à la pose" → "Suivi de commande" (audit P02).
    - Professionnels: "De la liste au devis" → "Devis" (audit P02).
12. **Two buttons still say "Écrire sur WhatsApp ↗"** (Catalogue and Collections; they are CMS labels). Every other button now says "Nous écrire". Proposal: change both to "Nous écrire".
13. **Catalogue button wording varies.** "Recevoir le catalogue" (hero, footer and page ends) vs "Télécharger le catalogue" (form). The house rule asks for the download wording. Proposal: "Télécharger le catalogue" everywhere.
14. **Finish names in English, lowercase or with codes:**
    - "iron grey satiné" and "laiton" (Bloom).
    - "oxybrass" and "miroité bronze" (Amsterdam).
    - "fumé", "mix (fumé/blanc)" (Aladdin).
    - "NC noyer Canaletto" (Adrian Wood) next to "Noyer Canaletto" elsewhere.
    - Bloom group "Pièces — métal" → "Raccords — laiton brossé".

    These come from the import; a label rule like the one already used for finishes would fix them in one place.
15. **The privacy page's form list misses the Votre projet form.** Proposal (from the form fields): "Demande de conseil (Votre projet) : nom, WhatsApp, type de projet, ville et message facultatif, pour préparer votre projet avec un conseiller." This closes the pending audit item L01.

## D. Zero-risk sweep: what a visitor needs next to each button (skill sweep 7)

The skills ask for reassurance next to every call to action. What can be said truthfully:

- **Appointment form:** say when the confirmation arrives. Example: "Nous vous confirmons l'horaire sur WhatsApp sous 24 h ouvrées." **[NEED: the real response time]**
- **Quote button on model pages:** "Réponse avec un devis détaillé : dimensions, finitions, livraison et installation." This is already a fact on Votre projet (step 02); reuse it as a small line under the button.
- **Catalogue form:** already good ("Le lien s'affiche après l'envoi").
- **Remote buyers (Rabat, Marrakech, Tanger):** the answer exists but sits in the FAQ and Showroom pages. Add one line next to the delivery fact on model pages: "Devis et validation possibles à distance, sur WhatsApp."

## E. Skill proposals refused under the house rules (and why)

| Skill proposal | Why it is refused or postponed |
|---|---|
| Testimonials, client logos, review scores ("Prove It" sweep) | None exist yet. **[NEED: client projects, photos of installations, press]**, then add a "Réalisations" block |
| Guarantees and risk reversal ("money-back", "satisfait ou remboursé") | False: a validated order is neither exchanged nor refunded; warranty is "à confirmer" |
| Urgency and FOMO ("places limitées", "offre") | No promotions on this site |
| Heightened emotion (sensory language, "imaginez…") | Luxury tone: facts, not adjectives; the house rules ban the stock phrases this produces |
| Benefit bridges on every feature ("which means…") | Kept only where a fact supports it (e.g. Rado Keramik 38 cm for a narrow hall); otherwise it creates filler |
| Hero rewritten as "outcome without pain" | The hero is a fixed decision (section A) |

## F. Client data still missing (blocks better copy)

- Response time for appointments and quotes.
- Models on display at the showroom (for the "Exposé au showroom" badge).
- Whether the showroom shows bedrooms (beds are not in the catalogue).
- Trade terms for architects and the name of the publication director.
- Exact counts of fabrics and leathers per sofa (to replace "près de 300").
- The final catalogue PDF.
