# Publication dans l'aperçu privé — 28 septembre 2026

Les migrations 0003 et 0004 ont été appliquées à la base EmDash existante de l'aperçu principal. Les six familles et onze modèles sont publiés avec leurs textes spécifiques, liens locaux et métadonnées SEO natives. Les fiches comprennent les photos, galeries, dimensions, plans, finitions et PDF techniques issus des sources officielles vérifiées.

Cette publication concerne le contenu du Codespace privé. Le site reste non indexable ; aucun déploiement en production, raccordement de domaine ou connexion CRM n'a été effectué. Les cinq articles du Journal et les pages existantes restent présents.

## Import et conservation

Une sauvegarde SQLite cohérente, contrôlée par `integrity_check`, ainsi qu'un relevé des données et empreintes des fichiers précèdent l'accès technique et les publications. Ces fichiers restent privés sous `.wrangler/migrations/primary-publication-2026-09-28/`, hors de Git.

Sur instruction explicite du propriétaire, la route native d'authentification de développement d'EmDash a créé un administrateur technique distinct. Aucune route d'installation ni commande de seed n'a été utilisée. Le cookie local est resté privé. Après les migrations et leurs simulations de contrôle, la déconnexion native a fermé cette session ; l'ancien cookie reçoit une réponse 401 et son fichier a été supprimé. Le compte technique reste associé à l'historique de ses révisions.

Le contrôle de conservation, réussi à **18 h 14, heure de Toronto**, confirme :

- L'administrateur personnel et ses deux passkeys sont inchangés.
- Les contacts, le catalogue privé, les pages, les articles, les réglages et la navigation sont inchangés.
- Les vingt fichiers R2 préexistants et `.dev.vars` ont les mêmes empreintes SHA-256.
- Les anciens médias, révisions et champs sont conservés ; les familles et modèles gardent leurs identités.
- Les ajouts attendus sont dix champs de modèle, 604 médias dédupliqués, dix-sept enregistrements SEO, vingt-huit révisions et un compte technique.

Les 609 URL sources correspondent à 604 objets médias distincts après déduplication native. Les onze fiches totalisent 129 entrées de galerie, 63 dimensions, 72 plans, 1 174 références de finitions et onze PDF techniques publics. Ces documents restent séparés du catalogue privé remis après formulaire.

Deux tentatives d'import ont été interrompues par une disparition puis un blocage du serveur local. La cause n'est pas établie. Les reprises ont réutilisé et vérifié les médias déjà importés, sans suppression ni réinitialisation. La troisième a terminé les onze fiches ; la migration éditoriale a ensuite publié les dix-sept entrées. Les simulations finales 0003 et 0004 proposent toutes deux **zéro modification**.

## Vérification du contenu réellement publié

`tests/published-content-browser.mjs` utilise exclusivement des accès publics anonymes GET/HEAD. Les API administratives et les écritures sont interdites dans cette suite. Les rapports locaux restent sous `test-results/publication-final/`.

- Les dix-sept pages rendent les textes, titres HTML, descriptions SEO et titres de partage attendus. Chaque titre SEO est distinct et chaque page possède un seul H1.
- Les cartes de collections et les onze liens contextuels mènent aux fiches locales dans le même onglet ; toutes les fiches restent accessibles depuis leur famille.
- Galeries, légendes, dimensions, plans, codes de finition et liens de source correspondent aux données importées.
- Les 604 médias publics, dont les onze PDF, répondent avec le type attendu et les mêmes octets SHA-256 que les sources vérifiées.
- Chromium et WebKit : Tables, Skorpio, Rhonda et Napoleon Keramik Outdoor à 1440 × 900 et 390 × 844, en clair et sombre, soit trente-deux compositions contrôlées. Navigation interne, persistance du thème, galerie et finitions au clavier, menu mobile et chargement des images passent sans débordement ni exception JavaScript de l'application.
- Huit [captures de la base principale](screenshots/publication-2026-09-28/README.md) présentent le résultat réellement publié. Les anciennes captures de la copie jetable restent identifiées séparément.

Ces contrôles ont passé en plusieurs exécutions ciblées, pas en une seule exécution complète : `report.json` conserve les succès du contenu, des médias et de Chromium, puis l'échec du début de WebKit. Le serveur principal ne répondait alors plus non plus à des requêtes HTTP indépendantes ; il a été redémarré. `report-webkit-image-decode.json` conserve ensuite les deux configurations ordinateur réussies et un échec du helper de décodage sur une image chargée à la demande en mobile. Le helper attend désormais un chargement terminé avec une largeur naturelle positive avant `decode()`, tout en refusant un changement de source. Les deux configurations mobiles passent dans `report-webkit-390.json`. Aucun échec initial n'a été effacé et aucun changement du frontend n'a été nécessaire pour ce problème de synchronisation du test.

`verification-summary.json` recoupe les onze contrôles requis dans ces rapports conservés : contenu, données techniques, médias et huit combinaisons de navigateur, viewport et thème. Les trente-deux compositions requises ont toutes un résultat réussi. La cause des blocages du serveur local lors des imports et contrôles intensifs reste non établie ; un redémarrage du runtime a été nécessaire.

## Accueil, navigation et formulaire sur l'aperçu principal

Après les contrôles des modèles, `tests/public-browser.mjs` a terminé avec succès, toujours sans écriture. Son rapport est `test-results/publication-site/report.json` :

- Dix-sept routes, comprenant l'accueil, les pages fixes, les six familles et les cinq articles, dans les deux thèmes à 1440 × 900 et 390 × 844. Contrôles complémentaires à 1024 × 768 et 320 × 740.
- Menu mobile, fermeture avec Échap, navigation issue du CMS et conservation du thème entre pages.
- Les cinq animations principales de l'accueil, le rail des six familles et le mode de mouvement réduit.
- La section éditoriale du catalogue, les erreurs nom/email issues du CMS, la gestion du focus et le consentement marketing facultatif, non coché par défaut. Les saisies invalides restent bloquées dans le navigateur.
- Trente URL d'images publiques répondent correctement ; aucun débordement horizontal, identifiant DOM dupliqué, erreur JavaScript ni tentative d'écriture n'est relevé.

Les deux suites couvrent ainsi les vingt-huit routes actuelles, avec des matrices visuelles distinctes explicitement décrites ci-dessus. Le téléchargement privé après enregistrement d'un contact reste couvert par la recette isolée ; il n'a pas été rejoué sur les vrais contacts.

## Portée des autres contrôles

Les tests qui modifient les brouillons, les publications, l'authentification, les contacts ou les PDF ont été effectués auparavant dans une copie jetable avec ses propres données et secrets. Ils restent décrits dans les rapports [CMS](test-results-cms.md), [catalogue](test-results-catalogue.md), [modèles](test-results-models.md) et [éditorial](test-results-editorial.md). Aucun contact de test n'a été ajouté à la base principale pour cette publication.

Les vérifications du code publié avant l'import restent valides : 37 tests unitaires, seed contrôlé sans application, vérification Astro de soixante fichiers sans diagnostic et compilation réussie. L'avertissement connu concernant les bundles de plus de 500 Ko demeure. Cette étape de publication ne modifie pas le code du frontend.

## Limites et accès

Le périmètre porte sur les onze modèles sélectionnés, pas sur tout le catalogue international. Les configurateurs et vidéos restent sur le site officiel. Les informations définitives du showroom, les droits des visuels et le catalogue commercial final restent à valider ; le PDF privé actuel est un document de démonstration. Les liens contextuels des articles du Journal restent à compléter. Aucun classement SEO ni trafic organique n'est mesuré sur cet aperçu privé.

Les images d'ambiance déjà choisies pour les familles restent conservées, avec leurs légendes d'identification provisoire. Elles sont distinctes des photographies identifiées importées sur les fiches modèles.

Les captures documentent le rendu actuel ; elles ne constituent pas une promesse de parité pixel à pixel avec la maquette B ni un essai sur iPhone physique. La comparaison de design et les adaptations fonctionnelles sont décrites dans [Finalisation de la migration](migration-completion.md).

- [Site](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/)
- [Collections](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/collections/)
- [Exemple : Skorpio](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/modeles/skorpio/)
- [Administration EmDash](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/_emdash/admin/)

Le port 4321 reste privé. Le serveur et ces liens dépendent du Codespace en fonctionnement ; l'arrêt automatique demandé après quinze minutes de fin de tâches reste actif. Les aperçus statiques, GitHub Pages et `main` sont conservés. La PR de migration reste ouverte en brouillon.
