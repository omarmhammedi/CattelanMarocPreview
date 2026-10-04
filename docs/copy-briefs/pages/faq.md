# Brief: FAQ (Questions fréquentes)

## Page card

- **Route / CMS:** `/faq/` · `pages`, slug `faq`
- **Purpose:** Answer the 22 questions a buyer asks before ordering.
- **Visitor:** Anyone about to contact the showroom.
- **Main action:** Find the answer, or move on to the quote.
- **SEO intent:** Question-form searches; the page carries FAQ structured data.

## What to read

`.agents/product-marketing.md` (rules and target style), `docs/copy-briefs/data/shared-facts.md` (fact ids used below),
`.agents/press-and-brand-sources.md`, `docs/copy-drafts/a-propos-2026-10-04.md` (style example). Output format and
drafting prompt: `docs/copy-briefs/README.md`. Do not read the live page or `docs/reference/`.

## Slots

| Slot | Role for the visitor | Limit | Facts |
|---|---|---|---|
| `eyebrow` | **FIXED** |  | "FAQ" |
| `title` | **FIXED** |  | "Questions fréquentes" |
| `intro` | Says what the answers cover | 25 words | FAQ topics |
| `group.1.heading` | **FIXED** |  | "Produits et collections" |
| `faq.1.question` | **FIXED** |  | "Les produits sont-ils authentiques et fabriqués en Italie ?" |
| `faq.1.answer` | Direct answer, first sentence says yes, no or the figure | 40 words (25 for simple ones) | B7; authentic, designed and made in Italy (FAQ) |
| `faq.2.question` | **FIXED** |  | "Puis-je commander un modèle qui n’est pas exposé au showroom ?" |
| `faq.2.answer` | Direct answer, first sentence says yes, no or the figure | 40 words (25 for simple ones) | C3, S7; dimensions and finishes depend on the model |
| `faq.3.question` | **FIXED** |  | "Proposez-vous les nouvelles collections ?" |
| `faq.3.answer` | Direct answer, first sentence says yes, no or the figure | 40 words (25 for simple ones) | New collections are presented every year at the Salon du Meuble de Milan; all can be ordered from Casablanca, even before being displayed (FAQ) |
| `group.2.heading` | **FIXED** |  | "Personnalisation" |
| `faq.4.question` | **FIXED** |  | "Quels produits peuvent être personnalisés ?" |
| `faq.4.answer` | Direct answer, first sentence says yes, no or the figure | 40 words (25 for simple ones) | M1 |
| `faq.5.question` | **FIXED** |  | "Puis-je voir les matériaux avant de commander ?" |
| `faq.5.answer` | Direct answer, first sentence says yes, no or the figure | 40 words (25 for simple ones) | S3 |
| `faq.6.question` | **FIXED** |  | "Une commande personnalisée prend-elle plus de temps ?" |
| `faq.6.answer` | Direct answer, first sentence says yes, no or the figure | 40 words (25 for simple ones) | SV5, M2 |
| `group.3.heading` | **FIXED** |  | "Commande et paiement" |
| `faq.7.question` | **FIXED** |  | "Quelles sont les étapes d’une commande ?" |
| `faq.7.answer` | Direct answer, first sentence says yes, no or the figure | 40 words (25 for simple ones) | SV1, SV10 |
| `faq.8.question` | **FIXED** |  | "Pourquoi les prix ne sont-ils pas affichés ?" |
| `faq.8.answer` | Direct answer, first sentence says yes, no or the figure | 40 words (25 for simple ones) | SV8 |
| `faq.9.question` | **FIXED** |  | "Quels moyens de paiement acceptez-vous ?" |
| `faq.9.answer` | Direct answer, first sentence says yes, no or the figure | 40 words (25 for simple ones) | SV4 |
| `faq.10.question` | **FIXED** |  | "Un acompte est-il demandé ?" |
| `faq.10.answer` | Direct answer, first sentence says yes, no or the figure | 40 words (25 for simple ones) | SV3 |
| `group.4.heading` | **FIXED** |  | "Livraison" |
| `faq.11.question` | **FIXED** |  | "Quel est le délai de livraison ?" |
| `faq.11.answer` | Direct answer, first sentence says yes, no or the figure | 40 words (25 for simple ones) | SV5 |
| `faq.12.question` | **FIXED** |  | "Livrez-vous partout au Maroc ?" |
| `faq.12.answer` | Direct answer, first sentence says yes, no or the figure | 40 words (25 for simple ones) | SV6 |
| `faq.13.question` | **FIXED** |  | "La livraison et l’installation sont-elles incluses ?" |
| `faq.13.answer` | Direct answer, first sentence says yes, no or the figure | 40 words (25 for simple ones) | SV6 |
| `faq.14.question` | **FIXED** |  | "J’habite Rabat, Marrakech ou Tanger : comment choisir ?" |
| `faq.14.answer` | Direct answer, first sentence says yes, no or the figure | 40 words (25 for simple ones) | SV9 |
| `group.5.heading` | **FIXED** |  | "Showroom" |
| `faq.15.question` | **FIXED** |  | "Faut-il prendre rendez-vous ?" |
| `faq.15.answer` | Direct answer, first sentence says yes, no or the figure | 40 words (25 for simple ones) | BZ2, S4 |
| `faq.16.question` | **FIXED** |  | "Peut-on confier une pièce entière ou toute la maison au showroom ?" |
| `faq.16.answer` | Direct answer, first sentence says yes, no or the figure | 40 words (25 for simple ones) | SV11 (question reworded: the old wording used a banned word) |
| `group.6.heading` | **FIXED** |  | "Architectes et professionnels" |
| `faq.17.question` | **FIXED** |  | "Travaillez-vous sur des projets résidentiels, hôteliers et commerciaux ?" |
| `faq.17.answer` | Direct answer, first sentence says yes, no or the figure | 40 words (25 for simple ones) | P4; button "Architectes et décorateurs" → /professionnels/ (fixed) |
| `faq.18.question` | **FIXED** |  | "Fournissez-vous les fichiers 3D des modèles ?" |
| `faq.18.answer` | Direct answer, first sentence says yes, no or the figure | 40 words (25 for simple ones) | P1 |
| `faq.19.question` | **FIXED** |  | "Puis-je recevoir mes clients au showroom ?" |
| `faq.19.answer` | Direct answer, first sentence says yes, no or the figure | 40 words (25 for simple ones) | P2 |
| `group.7.heading` | **FIXED** |  | "Informations pratiques" |
| `faq.20.question` | **FIXED** |  | "Où se situe le showroom ?" |
| `faq.20.answer` | Direct answer, first sentence says yes, no or the figure | 40 words (25 for simple ones) | BZ1 |
| `faq.21.question` | **FIXED** |  | "Un parking est-il disponible ?" |
| `faq.21.answer` | Direct answer, first sentence says yes, no or the figure | 40 words (25 for simple ones) | S5 |
| `faq.22.question` | **FIXED** |  | "Comment vous contacter ?" |
| `faq.22.answer` | Direct answer, first sentence says yes, no or the figure | 40 words (25 for simple ones) | BZ3 |
| `seo_title` | Title in search results | 60 characters; contains "Questions fréquentes" and "Cattelan Italia Maroc" | brand, place |
| `meta_description` | Snippet in search results | 155 characters | SV3, SV5, SV6 |

The questions are given as fixed wording because a question is neutral. The 22 answers are where the style changes.

## Not allowed

The facts of `product-marketing.md`, section 7 (no official-reseller claim, no models-on-display claim, no family or
team names, no warranty, no bedrooms or rugs). No sentence from the current site. No invented number.
