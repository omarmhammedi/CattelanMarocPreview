# Draft: Architectes et décorateurs (4 October 2026)

## Page copy

**eyebrow:** Projets

**title:** Architectes et décorateurs

**intro:** Au Triangle d'Or, à Casablanca, le showroom prépare pour chaque projet le catalogue Cattelan Italia aux formats et aux finitions retenus. Le dossier comprend les fiches techniques et, selon le modèle, les fichiers et les images. Les échantillons se comparent sur place.

**files.heading:** Fiches techniques et fichiers 2D et 3D

**files.text:** Chaque page modèle donne sa fiche technique. Selon le modèle, nous envoyons sur demande les fichiers 2D et 3D pour les plans et les images HD pour les planches.

**finishes.heading:** Toutes les finitions au Triangle d'Or

**finishes.text:** Toutes les finitions de la marque sont au showroom, en échantillons ou sur les pièces exposées. On y pose une céramique à côté d'un bois, un cuir à côté d'une laque. Le catalogue entier se commande, exposé ou non.

**clients.heading:** Avec le client, au showroom de Casablanca

**clients.text:** Sur rendez-vous, vous venez au showroom avec vos clients. Ils voient les pièces exposées et touchent la céramique ou le cuir. Les finitions se valident ensemble, échantillons en main.

**terms.heading:** Conditions professionnelles sur demande

**terms.button:** Demander les conditions professionnelles

**follow_up.heading:** Un interlocuteur pour toute la commande

**follow_up.text:** Une même personne suit la commande, de la fabrication en Italie à la livraison et à l'installation sur le chantier. Elle vous informe de l'avancement de chaque pièce.

**order.heading:** Le devis détaillé

**order.text:** Vous envoyez la liste des modèles avec dimensions et finitions. Nous préparons un devis détaillé, pièce par pièce. Un acompte de 50 % valide la commande. La livraison a lieu 10 à 12 semaines au maximum après validation. L'installation est comprise.

**projects.heading:** Villas et hôtels dans tout le Maroc

**projects.text:** Nous suivons des projets d'appartements et de villas, de bureaux de direction et de boutiques, d'hôtels et de restaurants. Nous livrons à Casablanca, Rabat, Marrakech, Tanger et partout au Maroc.

**seo_title:** Architectes et décorateurs à Casablanca · Cattelan Italia

**meta_description:** Au showroom Cattelan Italia de Casablanca, architectes et décorateurs reçoivent leurs clients sur rendez-vous, avec fiches techniques et échantillons.

## Alternatives

- **files.heading:** A. « Les fichiers de chaque modèle » (names the object, shorter). B. « Fiches, plans 2D et 3D, images HD » (lists the four documents a professional checks).
- **finishes.heading:** A. « Céramiques, bois et cuirs en échantillons » (names the materials). B. « Les échantillons du showroom » (names the object and the place).
- **clients.heading:** A. « Le rendez-vous client au Triangle d'Or » (names the meeting and the place). B. « Les pièces exposées devant le client » (names the object the meeting is for).
- **terms.heading:** A. « Les conditions professionnelles » (plain label). B. « Quelles conditions pour un professionnel ? » (the visitor's question).
- **follow_up.heading:** A. « Le suivi, de l'Italie à l'installation » (names the span). B. « Une personne suit la commande » (names the person, verb in the third person).
- **order.heading:** A. « Du devis à l'installation » (names the span). B. « Devis, acompte et délai » (the three things a professional checks).
- **projects.heading:** A. « Casablanca, Rabat, Marrakech et Tanger » (names the cities). B. « Appartements, hôtels et boutiques au Maroc » (names the kinds of project; a list of three, so the text would then need to drop its grouping in pairs).

## Sources

| Slot | Fact ids |
|---|---|
| eyebrow | FIXED |
| title | FIXED |
| intro | P1, BZ1 (Triangle d'Or, Casablanca) |
| files.heading | P1 |
| files.text | C2 (spec sheet on each model page), P1 |
| finishes.heading | S3, BZ1 |
| finishes.text | S3, C3 |
| clients.heading | P2, BZ1 |
| clients.text | P2, S9 |
| terms.heading | P5 |
| terms.button | FIXED |
| follow_up.heading | SV10 |
| follow_up.text | SV10, SV5 (client kept informed of progress) |
| order.heading | P3, SV2 |
| order.text | P3, SV2 (quote details each piece) |
| projects.heading | P4 |
| projects.text | P4, SV6 (delivery all over Morocco) |
| seo_title | brand name, BZ1 (Casablanca) |
| meta_description | P1, P2 |

## Open points

- No `[NEED]` in the page copy: every slot is covered by its facts.
- Optional, for a later version: the file formats of the 2D and 3D files (DWG, 3DS or other) are not in the fact bank. A professional would look for them in `files.text`. `[NEED: formats des fichiers 2D et 3D]` if the owner wants them stated.
- `terms.heading` has no body text on purpose: the trade terms are not published (P5). The form fields are functional microcopy and are not drafted here.
- `files.text` uses C2 (the spec sheet on each model page) in addition to P1, so that it does not repeat the intro.
- `projects.text` first listed the six kinds of project in one sentence (lint review: four or more commas). Rewritten as three pairs (homes, offices and shops, hotels and restaurants) to read less like a list. The heading names two kinds only, to keep one list of three per section.
- `projects.text` states the kinds of project the showroom takes on (P4) in the present tense. It names no client and no delivered project; the owner should confirm that "Nous suivons des projets" does not read as a claim of past work.
- `follow_up.text` uses SV5 (the client is kept informed of progress), which is not in the brief's slot list but is in the shared fact bank.
