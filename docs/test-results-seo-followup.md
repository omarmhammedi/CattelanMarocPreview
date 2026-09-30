# Deuxième passage SEO : réalisation et vérifications

Travail du 29 septembre 2026, heure de Toronto, sur `feat/emdash-migration`. Les fichiers datés du 30 septembre suivent l’UTC. Les correctifs sont publiés sur la préversion Cloudflare ; le lancement indexable reste une étape distincte.

## Changements

- Accueil : un seul arbre responsive, un H1, un formulaire et une carte. Les six familles et cinq articles sont conservés, avec les scènes ordinateur, les cadrages mobiles et les thèmes clair/sombre.
- Showroom : présentation enrichie, liens vers les familles, livraison nationale et WhatsApp confirmé. La mention des chambres est retirée ; l’introduction des tables ne répète plus le paragraphe sur les matières.
- Photos : descriptions des 129 images de galerie et des onze images principales identiques, à partir des visuels existants examinés. Aucun fichier remplacé.
- Nuanciers : groupes repliés et chargement différé conservés ; variantes WebP adaptées après ouverture et accès clavier à l’original.
- Données structurées : pays `MA` ; profils `sameAs` uniquement lorsqu’une URL explicite est renseignée dans les réglages natifs EmDash.

Les [décisions éditoriales](seo-followup-2026-09-30.md) distinguent les corrections utiles des recommandations non retenues : quota de mots, ville dans chaque H1, prix ou services supposés. Le dimanche fermé reste correctement représenté par `00:00–00:00`.

## Vérifications isolées

Les tests qui écrivent utilisent exclusivement une copie jetable sur le port 4331. Leurs données sont restaurées et le serveur d’essai arrêté ; aucune inscription ou manipulation de passkey n’est exécutée sur le CMS existant.

| Contrôle | Résultat |
| --- | --- |
| Tests unitaires | 156 réussis ; sous-suite galerie de dix tests également relancée après renforcement des contrôles de concurrence |
| Publication 0012 | Cinq groupes : valeurs exactes, brouillons privés, aperçu signé, publication, effacement du texte/WhatsApp, idempotence et restauration |
| Accueil éditable | Quatre groupes : cinq images/CTA de sections, contenu libre, sections supplémentaires, brouillons et publications ; effacements sans retour des valeurs par défaut |
| Descriptions des photos | Six groupes : brouillon, aperçu, publication, sauvegarde des légendes/métadonnées/relations, refus d’une description personnalisée ou d’un brouillon existant, restauration |
| Catalogue/contact/PDF | Onze groupes, dont huit formulaires réels : accueil et catalogue, 1440/390 px, consentement facultatif coché/décoché, thèmes clair/sombre ; CSRF, dédoublonnage, confidentialité, éditions et révocation des PDF |
| Accueil responsive | Neuf scénarios par moteur, Chromium et WebKit : deux thèmes, 1440/390 px et passage 820/821, état du formulaire et caméra conservés, anciennes ancres, changement de préférence de mouvement, lecture sans JavaScript |
| Carte | Huit combinaisons format/thème par moteur, deux lectures sans JavaScript, dix cas trackpad par moteur : géographie, palette, zoom, clavier, limites, déplacement et défilement de page |

Les journaux bruts restent dans `test-results/`, exclu de Git. Les sauvegardes et preuves contenant des données internes restent dans `.wrangler/`, également exclu de Git.

La comparaison locale utilise le contenu 0010 inchangé : 36 positions à 1440 × 900 et 390 × 844, deux thèmes, 254 éléments appariés. Aucun écart de géométrie retenu au-delà de 0,6 px, aucune différence de position de défilement. Les polices, espacements et cadrages mesurés sont conservés. Le nombre d’images de l’accueil passe de 35 à 21 éléments dans le DOM ; il ne s’agit pas d’un comptage de téléchargements réseau.

Le contrôle Astro termine avec zéro erreur et zéro avertissement sur 132 fichiers. Deux suggestions TypeScript portent uniquement sur un script de diagnostic temporaire ignoré par Git. La compilation réussit en 32,98 s, avec l’avertissement existant de taille de chunk. La cible Cloudflare est contrôlée avant un dry-run réussi, puis déployée sous la version `220432fc-d357-4877-807b-48b7abb9a3fa`, dans les ressources dédiées existantes.

## Vérifications de la version publiée

- Les 28 routes publiques répondent 200, avec les textes attendus, un seul H1 par page et les métadonnées contrôlées ; les 199 liens internes vérifiés répondent 200 et leurs ancres existent.
- Les 129 descriptions de galerie et onze descriptions principales correspondent au manifeste publié. La relecture native finale 0013 ne propose plus aucune modification.
- 48 rendus : six pages représentatives × deux formats × deux thèmes × Chromium/WebKit. Images visibles décodées, absence de débordement horizontal, variantes WebP et nuanciers différés vérifiés ; aucune erreur JavaScript ni écriture.
- Les 36 captures de l’accueil public montrent les nouveaux textes. Ses quatre chargements répondent 200, sans erreur JavaScript, réponse 5xx ou appel privé.
- `robots.txt`, `sitemap.xml` et les directives `noindex` restent adaptés à une préversion. L’administration redirige vers sa connexion native.

L’accueil public contient désormais 21 images dimensionnées et un H1. Son HTML brut mesure 369 210 octets, contre 393 641 lors du relevé public précédent, qui utilisait un contenu légèrement différent. L’unification enlève le contenu dupliqué ; elle ne rend pas l’ensemble du document léger à elle seule.

Sur Greta, les 21 échantillons du premier groupe passent d’environ 5,08 Mo à 1,79 Mo transférés à DPR 2 : **−64,73 %**, sur mobile et ordinateur. Aucun échantillon n’est chargé tant que le groupe reste fermé. Le HTML complet augmente de 14 796 à 26 295 octets Brotli dans ces relevés, notamment avec les variantes, liens d’origine et descriptions nouvelles. Les originaux sont conservés et accessibles ; les WebP restent des compressions avec perte. Voir [la mesure détaillée](audits/seo-swatches-2026-09-29.json).

Les [preuves synthétiques](audits/seo-followup-2026-09-30.json) distinguent tests locaux, contenu réellement publié et contrôles publics. Aucun test ne soumet de coordonnées au CMS Cloudflare.

## Publication et conservation

Les migrations ciblent les valeurs réellement présentes dans EmDash, contrôlent les révisions et utilisent ses API natives de sauvegarde/publication. Elles ne changent ni schéma ni relations et ne réimportent aucun seed. Le contenu local et le CMS Cloudflare restent des copies indépendantes.

Une interruption du processus 0012 est survenue après deux publications et la sauvegarde du brouillon Tables. Sa cause n’est pas établie. Seul ce brouillon précis a été repris après vérification de son origine, de sa révision publiée, de ses champs, du schéma et des relations ; la reprise a ignoré les entrées déjà terminées. Les preuves initiales et de récupération ont été conservées.

La comparaison des exports D1 avant/après, terminée à **22 h 28, heure de Toronto**, confirme 74 tables intègres et aucune violation de clé étrangère. 65 tables sont strictement identiques. Les quinze publications ajoutent exactement quinze révisions ; les 126 révisions antérieures sont inchangées. Les 625 médias, deux utilisateurs, trois passkeys, contacts, références du PDF privé, schémas, relations, navigation et réglages SEO sont préservés. Les autres différences sont les quatre tables éditoriales ciblées et les index d’utilisation des médias recalculés par EmDash.

## Limites de lancement

Le vrai catalogue, les informations légales/confidentialité, le nouveau logo et l’autorisation écrite de marque/contenus restent à finaliser. La liste exacte des modèles exposés, la garantie et le SAV restent à confirmer. Aucun service d’installation, d’architecte, de stationnement ou de rendez-vous n’est inventé.

L’indexation reste désactivée sur la préversion, sans domaine raccordé ni nouvel abonnement payant. Les essais utilisent Chromium et WebKit émulés, pas un iPhone physique ; ils ne constituent ni une mesure des Core Web Vitals sur le terrain ni une garantie de capacité à long terme. Une réponse 500 de l’ancien Worker a été observée pendant la mesure initiale de Greta, puis une reprise bornée a répondu 200 ; sa cause n’est pas démontrée. Les incidents CPU antérieurs restent documentés dans [le rapport précédent](test-results-seo-refresh.md).

Après les onze publications de photos réussies, un contrôle sans écriture a également reçu une réponse 500 sur une lecture administrative de l’ancien Worker. Ce contrôle s’est arrêté ; aucune publication n’a été répétée à cause de cet échec. Les exports ont confirmé les onze entrées terminées sans brouillon résiduel.

Les essais publics finaux et la relecture native après déploiement ont réussi sans reproduire ces erreurs. Cela ne suffit pas à conclure que la capacité de l’hébergement est garantie dans la durée.

Le prototype statique B reste une référence de composition. Les contenus CMS, pages internes, formulaires fonctionnels et géographie réelle produisent des différences assumées ; aucune parité parfaite au pixel n’est revendiquée.

## Accès

Captures prises sur Cloudflare après déploiement, avec le contenu publié :

| Vue | Ordinateur | Mobile |
| --- | --- | --- |
| Accueil | [Sombre](screenshots/seo-followup-2026-09-29/public-home-hero-1440-dark.jpg) | [Clair](screenshots/seo-followup-2026-09-29/public-home-hero-390-light.jpg) |
| Showroom dans l’accueil | [Clair](screenshots/seo-followup-2026-09-29/public-home-showroom-1440-light.jpg) | [Sombre](screenshots/seo-followup-2026-09-29/public-home-showroom-390-dark.jpg) |
| Carte | [Sombre](screenshots/seo-followup-2026-09-29/public-home-map-1440-dark.jpg) | [Clair](screenshots/seo-followup-2026-09-29/public-home-map-390-light.jpg) |

- [Site Cloudflare](https://cattelan-maroc-preview.omar-8b8.workers.dev/)
- [Administration EmDash](https://cattelan-maroc-preview.omar-8b8.workers.dev/_emdash/admin/)
- [Showroom](https://cattelan-maroc-preview.omar-8b8.workers.dev/showroom-casablanca/)

Le site Cloudflare reste accessible lorsque le Codespace s’arrête. Le port de développement 4321 reste privé. La branche principale, les aperçus statiques, GitHub Pages, le domaine, le CRM et les autres sites Cloudflare sont conservés.
