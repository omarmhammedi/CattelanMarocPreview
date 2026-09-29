# Photographies et présentation du showroom

Révision du 29 septembre 2026, heure de Toronto (`America/Toronto`), publiée dans l’aperçu EmDash existant sur `feat/emdash-migration`.

La séquence « Dessiné en Italie » présente désormais deux photographies officielles de Skorpio : une ambiance et un détail du piètement. Le showroom utilise une photographie réelle du magasin, commune à l’accueil et à la page dédiée. L’accueil conserve un paragraphe et un seul bouton vers cette page ; les coordonnées et l’itinéraire restent accessibles dans les pieds de page, la carte et les informations pratiques.

La page showroom explique le conseil et la préparation de visite. Deux questions traitent des pièces exposées et de la demande de prix/délai. Le passage générique sur d’autres villes, la question redondante de préparation et la question de livraison sont retirés. Aucune présence d’un modèle en magasin ni nouvelle prestation n’est promise. Le téléphone fourni par le propriétaire est conservé.

## Sources et périmètre éditorial

Les textes approuvés sont dans [`content/showroom-editorial-copy.json`](../content/showroom-editorial-copy.json). Les images, leurs empreintes et les valeurs de départ sont décrites dans [`content/showroom-refresh.json`](../content/showroom-refresh.json). La photographie du magasin et les faits qui motivent sa présentation proviennent de l’[article Maisons du Maroc transmis par le propriétaire](https://maisonsdumaroc.com/architectures-et-design/cattelan-italia-ouvre-son-premier-flagship-store-au-maroc). La paire Skorpio réutilise des médias officiels déjà présents dans EmDash ; la fiche du modèle reste intacte.

Le frontend continue de lire le contenu publié dans EmDash à chaque requête. Les JSON versionnés sont des contrats de migration, pas une source de secours du site. La migration actualise les champs éditoriaux `seo_title` et `meta_description` du showroom ; le panneau SEO natif, vide dans l’état de départ, reste inchangé. Aucun schéma, réglage d’authentification ou contenu de catalogue n’est remplacé.

## Publication et conservation

La migration `0009-showroom-refresh.mjs` a publié les deux pages entre **11 h 24 min 58 s et 11 h 25 min 05 s**, heure de Toronto. Elle réutilise deux images existantes et importe une photographie dédupliquée : la médiathèque passe de **623 à 624 entrées**, et les révisions éditoriales de **67 à 69**. Le second contrôle à blanc trouve **zéro modification**.

Une sauvegarde cohérente précède les écritures. Les contrôles confirment **29 tables strictement conservées et 626 fichiers préexistants intacts**, notamment les médias originaux, les contacts, le PDF privé et les secrets. Les deux utilisateurs et les deux passkeys sont conservés ; aucun compte ni moyen d’authentification n’est ajouté. Les familles, les fiches modèles, les articles, les coordonnées globales et les autres champs des pages restent conservés.

L’authentification technique native a réutilisé le compte de développement existant, par la route d’authentification seule. Aucun setup, réimport du seed ou test de passkey n’a été lancé sur la base principale. La déconnexion native à **11 h 26 min 19 s**, heure de Toronto, retourne 200 ; l’ancien cookie est ensuite refusé avec 401 et le fichier de session créé pour cette intervention est supprimé. Aucun identifiant de session n’est consigné dans ce rapport.

## Vérifications

| Contrôle | Résultat |
| --- | --- |
| Chromium, thème sombre | 15 contrôles publics réussis |
| Chromium, thème clair | 15 contrôles publics réussis |
| WebKit, thèmes sombre et clair | 15 contrôles publics réussis par thème |
| Tests unitaires | 81 réussis, dont 9 propres à la migration 0009 |
| Validation du seed, sans import | 6 collections et 29 entrées valides |
| Vérification Astro finale | 94 fichiers, aucun diagnostic |
| Compilation finale | Réussie en 20,44 s ; avertissement de bundle > 500 kB déjà présent |

Les quatre rapports de `test-results/showroom-refresh/{chromium,webkit}-{dark,light}/report.json` totalisent **60 contrôles réussis**. Ils confirment les métadonnées SEO et les deux questions fréquentes exactes, puis les textes et images publiés, le bouton unique de l’accueil, les coordonnées, la navigation et la conservation du thème au clavier. Ils couvrent les formats **1440×900 et 390×844**, les animations normales de l’accueil et la lecture avec réduction des animations. Aucune exception JavaScript, écriture ou requête privée n’a été tentée dans ces contrôles anonymes.

La première exécution WebKit a arrêté le test pendant une animation : après une seconde, sa progression était encore de 0,7885 malgré une position de défilement correcte. Le test attend désormais la convergence des animations et la position exacte, avec un délai maximal de huit secondes. Les exécutions finales atteignent la fin du rail en environ 1,5–1,7 seconde dans WebKit. Aucun code d’animation du site n’a changé. Les quatre suites ont été rejouées après cette correction du test. La [preuve compacte](audits/showroom-refresh-2026-09-29.json) est versionnée.

Les clics sur « Itinéraire » ouvrent une fenêtre vers l’URL Google Maps du lieu approuvé, depuis l’accueil et la page showroom. La requête externe est interceptée par le test : ce résultat valide la destination du lien, pas le chargement ni le calcul d’itinéraire par Google Maps. La restriction connue des nouvelles fenêtres dans l’aperçu intégré VS Code Simple Browser reste inchangée ; ce parcours est à utiliser depuis un navigateur externe.

Deux tentatives de compilation se sont arrêtées avec un signal SIGTERM (code 143), sans diagnostic de code ; les compteurs OOM du conteneur sont restés à zéro. La compilation a ensuite réussi après un arrêt temporaire du serveur d’aperçu par la commande native Astro. Le serveur est relancé avec sa configuration habituelle ; à 11 h 38, heure de Toronto, l’accueil et la page showroom répondent 200 avec les nouveaux contenus et la protection contre l’indexation. Le contrôle de conservation final réussit aussi après cette relance. La cause précise des interruptions n’est pas établie ; aucun réglage d’arrêt automatique ou de démarrage n’a été modifié.

## Captures

Les douze captures ci-dessous proviennent des contrôles Chromium terminés après publication, avec animations normales. Le tableau compare les mêmes scènes et formats dans les deux thèmes.

| Scène et format | Sombre | Clair |
| --- | --- | --- |
| Dessiné en Italie — ordinateur | [Voir](screenshots/showroom-refresh-2026-09-29/home-brand-1440-dark.jpg) | [Voir](screenshots/showroom-refresh-2026-09-29/home-brand-1440-light.jpg) |
| Dessiné en Italie — mobile | [Voir](screenshots/showroom-refresh-2026-09-29/home-brand-390-dark.jpg) | [Voir](screenshots/showroom-refresh-2026-09-29/home-brand-390-light.jpg) |
| Showroom de l’accueil — ordinateur | [Voir](screenshots/showroom-refresh-2026-09-29/home-showroom-1440-dark.jpg) | [Voir](screenshots/showroom-refresh-2026-09-29/home-showroom-1440-light.jpg) |
| Showroom de l’accueil — mobile | [Voir](screenshots/showroom-refresh-2026-09-29/home-showroom-390-dark.jpg) | [Voir](screenshots/showroom-refresh-2026-09-29/home-showroom-390-light.jpg) |
| Page showroom — ordinateur | [Voir](screenshots/showroom-refresh-2026-09-29/showroom-information-1440-dark.jpg) | [Voir](screenshots/showroom-refresh-2026-09-29/showroom-information-1440-light.jpg) |
| Page showroom — mobile | [Voir](screenshots/showroom-refresh-2026-09-29/showroom-information-390-dark.jpg) | [Voir](screenshots/showroom-refresh-2026-09-29/showroom-information-390-light.jpg) |

## Limites

L’image principale de Skorpio mesure 735×735 pixels : sa définition limite la netteté sur un grand écran à forte densité de pixels. La photo réelle retenue ne remplace pas les autres ambiances provisoires. Les fichiers originaux et les droits d’utilisation pour la mise en ligne définitive restent à confirmer ; le PDF demeure le document de démonstration existant.

Le formulaire catalogue, le consentement marketing facultatif et le téléchargement privé sont conservés. Aucun contact ni parcours PDF n’a été soumis sur la base principale pendant cette intervention. Le cycle CMS complet brouillon–aperçu signé–publication n’a pas été rejoué pour cette migration ; ses protections ciblées relèvent des tests unitaires, et sa publication effective est contrôlée séparément.

Les captures ne constituent ni une comparaison pixel à pixel avec la version B ni un essai sur iPhone physique. Les aperçus statiques, GitHub Pages, `main`, la PR en brouillon et le port 4321 privé sont conservés. Aucun déploiement, raccordement de domaine, Cloudflare ou CRM n’est effectué ; l’aperçu reste non indexable.

[Accueil](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/) · [Showroom](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/showroom-casablanca/) · [Administration EmDash](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/_emdash/admin/)
