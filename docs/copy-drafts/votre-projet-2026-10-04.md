# Draft: Commande et livraison (4 October 2026)

## Page copy

**eyebrow:** Votre projet

**title:** Commande et livraison d'un meuble Cattelan Italia

**intro:** Une commande part d'un conseil, au showroom ou sur WhatsApp, et passe par le devis, l'acompte et la fabrication en Italie. Le meuble est livré 10 à 12 semaines au maximum après validation de la commande, puis installé.

**situation.1.heading:** Un meuble

**situation.1.text:** Une table ou un fauteuil se choisit au showroom, échantillons en main, ou sur WhatsApp. Le devis détaillé vient ensuite, et nous restons votre contact jusqu'à la livraison.

**situation.2.heading:** Une pièce ou toute la maison

**situation.2.text:** Pour un salon ou une maison entière, nous partons des plans, ou des mesures de chaque pièce, et de quelques photos. Nous aidons ensuite à choisir les meubles et suivons la commande jusqu'à l'installation.

**situation.3.heading:** Avec un architecte

**situation.3.text:** L'architecte travaille directement avec le showroom. Nous lui envoyons les fiches techniques et les échantillons, puis nous le recevons avec son client, sur rendez-vous.

**step.1.heading:** 01 · Conseil

**step.1.text:** Toutes les finitions de la marque sont au showroom, en échantillons ou sur les meubles exposés. On y pose la main sur la céramique d'un plateau ou le cuir d'un fauteuil. Sur WhatsApp, nous répondons sur les formats, le délai et le devis.

**step.2.heading:** 02 · Devis détaillé

**step.2.text:** Le prix d'une table dépend du modèle, de sa longueur et de ses finitions. Le site n'affiche donc aucun prix. Le devis détaille chaque meuble avec ses dimensions, ses finitions et son revêtement, puis la livraison et l'installation.

**step.3.heading:** 03 · Validation et acompte

**step.3.text:** Un acompte de 50 % du montant total valide la commande. Ce versement lance la fabrication en Italie. Le solde se règle avant la livraison.

**step.4.heading:** 04 · Fabrication en Italie

**step.4.text:** Chaque meuble est fabriqué en Italie, par des entreprises spécialisées réunies autour de Cattelan Italia. Un meuble sur mesure a le même délai qu'un modèle standard, 10 à 12 semaines au maximum entre validation et livraison. Nous vous tenons informé pendant la fabrication.

**step.5.heading:** 05 · Livraison et installation

**step.5.text:** La livraison est gratuite à Casablanca. Pour Rabat, Marrakech, Tanger et le reste du Maroc, son coût dépend de la destination et figure sur le devis. Une seule personne suit la commande, de la fabrication en Italie à la livraison. L'installation est comprise.

**payment.heading:** Moyens de paiement

**payment.text:** Le paiement se fait par carte bancaire, par virement ou par chèque.

**cancellation.heading:** Une commande validée est définitive

**cancellation.text:** Dès le versement de l'acompte, la commande ne peut plus être échangée ni remboursée.

**seo_title:** Commander du mobilier italien au Maroc · Cattelan Italia

**meta_description:** Conseil, devis, acompte de 50 % et fabrication en Italie, puis livraison au Maroc 10 à 12 semaines au maximum après validation, installation comprise.

## Alternatives

**title**
- A: Une commande Cattelan Italia en cinq étapes. Names the measure of the process (five steps) and the brand.
- B: Commande et livraison, de l'Italie au Maroc. Names the two places the order travels between.

**cancellation.heading**
- A: Échange et remboursement après validation. Names the two things the visitor asks about, plainly.
- B: Et après la validation ? The visitor's own question; the text answers it.

## Sources

| Slot | Fact ids |
|---|---|
| eyebrow | FIXED |
| title | SV1 |
| intro | SV1, SV5 |
| situation.1.heading | FIXED |
| situation.1.text | SV1, SV2, SV13, S3 (samples, as in the slot role), SV10 (one contact) |
| situation.2.heading | FIXED |
| situation.2.text | SV11 |
| situation.3.heading | FIXED |
| situation.3.text | SV12 |
| step.1.heading | FIXED |
| step.1.text | SV1, SV13, S3 |
| step.2.heading | FIXED |
| step.2.text | SV2, SV8 |
| step.3.heading | FIXED |
| step.3.text | SV3 |
| step.4.heading | FIXED |
| step.4.text | B7, M2, SV5 |
| step.5.heading | FIXED |
| step.5.text | SV6, SV10 |
| payment.heading | FIXED |
| payment.text | SV4 |
| cancellation.heading | SV7 (with SV3: the deposit validates the order) |
| cancellation.text | SV7, SV3 |
| seo_title | brand, place (SEO intent "commander mobilier italien maroc") |
| meta_description | SV1, SV3, SV5, SV6 |

## Open points

- No [NEED] item: every slot is covered by the brief's fact ids.
- Lint: 0 blocking, 0 review on the final run. Two review findings from the first run (four or more commas in the
  step.1 and step.2 lists) were fixed by rewriting, along with the blocking cliché "côte à côte" in step.1.
- intro: "livré 10 à 12 semaines au maximum après validation de la commande, puis installé". The delay applies to
  delivery (SV5); installation is placed right after it because step 5 joins delivery and installation (SV1). Confirm
  that installation happens at delivery, not on a later date.
- situation.1.text uses samples (S3) and a single contact (SV10), which the slot role asks for ("advice with samples,
  then quote and follow-up") but the slot's fact list does not name. Both facts are in the brief for other slots.
- step.1.text: "On y pose la main sur la céramique d'un plateau ou le cuir d'un fauteuil" illustrates S3 (ceramics and
  leathers shown as samples or on displayed pieces). It names no model, so it makes no claim about what is on display.
- step.2.text takes a table as the price example ("sa longueur"); SV8 says prices depend on model, dimensions and
  finishes for every piece.
- seo_title starts with the infinitive "Commander" to match the SEO intent "commander mobilier italien maroc". If the
  owner prefers the site pattern, use "Commande et livraison · Cattelan Italia Maroc" (45 characters).
- payment.text does not say whether the three means apply to both the deposit and the balance; SV4 does not specify.
