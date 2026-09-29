# Une vraie carte dans le style de la version B

Correction du **28 septembre 2026, heure de Toronto**, après la précision du propriétaire : c’est le plan stylisé de l’accueil qui doit devenir géographique. L’étape précédente avait conservé un dessin illustratif et ajouté une carte Google séparée ; elle ne répondait pas entièrement à cette demande.

## Résultat visible

Le plan de l’accueil utilise maintenant le littoral, le port et les rues réels de Casablanca issus d’OpenStreetMap. Le rendu conserve la palette clair/sombre, les lignes fines, la typographie espacée, le pictogramme et le repère rouge animé. Le panneau du showroom et ses informations publiées restent en place. Les coordonnées du repère viennent de l’établissement indiqué par le propriétaire, distinctes du centre de l’iframe Google.

Le zoom va de 1 à 6. Le bouton de déplacement active le glissement ; les flèches du clavier fonctionnent lorsque la carte a le focus. Le bouton de recentrage rétablit la composition initiale. Le défilement normal et le zoom à deux doigts du navigateur restent autorisés hors du mode déplacement. L’itinéraire ouvre Google Maps ; la carte locale ne calcule pas de trajet.

Les rues et la côte sont servies avec le site, sans requête vers un service cartographique pendant la consultation. L’attribution OSM est visible et l’extrait dérivé est téléchargeable sous ODbL. La page showroom garde sa carte Google facultative, chargée uniquement à la demande. Voir [les sources et la méthode](geographic-map.md).

## Publication EmDash et préservation

La migration native [0006](../scripts/migrations/0006-geographic-showroom-map.mjs) a été publiée dans l’EmDash existant à **21 h 34, Toronto**. Elle ajoute deux champs numériques facultatifs, `showroom_latitude` et `showroom_longitude`, puis publie **33,5927007 ; −7,6426741** et une légende qui ne présente plus le plan comme illustratif. Un deuxième passage en simulation ne prévoit aucun changement. Les autres coordonnées commerciales, liens et contenus restent inchangés.

Le frontend lit les coordonnées publiées dans EmDash. Les brouillons n’apparaissent que dans leur aperçu signé ; publier déplace le repère sans reconstruction. Effacer une coordonnée, fournir une valeur invalide ou sortir de la couverture masque le repère. Effacer la légende la masque aussi. Aucun repère ni texte illustratif de remplacement n’est imposé. Le libellé historique du champ de légende dans l’administration reste « Précision sur le plan illustré ».

Une sauvegarde SQLite cohérente a précédé la migration. La vérification après déconnexion technique, à **21 h 45, Toronto**, confirme **28 tables protégées et 626 fichiers existants inchangés**, notamment les pages, collections, modèles, articles, contacts, catalogue PDF, médias, utilisateurs, deux passkeys et secrets. Aucun utilisateur ajouté. Deux champs et une révision native ont été ajoutés ; l’index d’utilisation des médias a été actualisé par EmDash. La session technique a été fermée par l’API native, son ancien cookie renvoie 401, et seul son nouveau fichier de session a été supprimé.

Les tests qui modifient des contenus ont utilisé une installation indépendante et jetable sur le port 4331. Aucun setup, réensemencement ou test de passkey n’a été exécuté sur la base principale. Le serveur de test a été arrêté et son répertoire supprimé après conservation du rapport.

## Vérifications

Les preuves compactes sont dans [l’audit JSON](audits/geographic-map-2026-09-28.json). Les sorties détaillées restent dans `test-results/geographic-map/` et `test-results/geographic-regression/`, exclus de Git.

| Contrôle | Résultat |
| --- | --- |
| Tests unitaires | 60 réussis, dont projection, données géographiques et garde-fous de migration |
| Astro / TypeScript | 81 fichiers, aucune erreur, aucun avertissement ni conseil |
| Validation statique du seed | Réussie ; aucun import du seed |
| Compilation | Réussie ; avertissement existant sur certains bundles supérieurs à 500 Ko |
| EmDash natif isolé | 8 contrôles réussis : simulation, migration, idempotence, repère publié, brouillon/aperçu privé, publication et effacement/restauration |
| Carte dans Chromium et WebKit | 16 cas : 1440×900, 1024×768, 390×844 et 320×740, chaque thème |
| Sans JavaScript | 2 cas Chromium : carte, repère et itinéraire visibles ; commandes inactives masquées |
| Régression des pages publiques | 17 routes dans les deux thèmes à 1440 et 390 px, puis largeurs compactes, navigation, animations et formulaire invalide |

Les contrôles de carte vérifient la source téléchargeable, la palette, les coordonnées, le zoom, le glissement explicite, le clavier, les limites de navigation, le défilement de page, le mode de mouvement réduit et l’absence de débordement. Aucune erreur JavaScript, écriture CMS ou requête cartographique externe n’a été constatée dans cette suite.

Un premier passage complet de la carte a réussi. Après la correction CSS autorisant le zoom natif du navigateur, une répétition s’est terminée par un signal de processus (code 143), sans échec d’assertion enregistré. Les vérifications finales sont donc exécutées séparément par moteur avec `PUBLIC_TEST_ENGINE=chromium` puis `PUBLIC_TEST_ENGINE=webkit` ; leurs rapports distincts sont conservés. Le serveur principal continuait à répondre HTTP 200. La cause de cette interruption n’a pas été établie.

La régression générale contrôle aussi les sections éditoriales du catalogue, les erreurs de formulaire pilotées par EmDash, le consentement marketing facultatif, la navigation mobile et les images publiques. Aucun contact réel n’est soumis et aucun nouveau téléchargement du PDF privé n’est déclenché sur la base principale. Le parcours contact/PDF déjà validé dans les environnements isolés n’a pas été modifié par cette correction ; voir [le rapport catalogue](test-results-catalogue.md). Le test historique de l’iframe Google n’a pas été réexécuté ici ; son code est conservé.

## Captures et différences assumées

Les [huit captures finales](screenshots/geographic-map-2026-09-28/README.md) montrent l’accueil à 1440×900 et 390×844, dans les deux thèmes, au cadrage initial et après zoom. Elles proviennent du frontend principal en lecture seule. Les captures précédentes sont conservées pour comparaison dans [le rapport showroom historique](test-results-showroom.md).

Le dessin des rues, du port et de la côte change nécessairement. Le triangle décoratif autour du magasin disparaît ; le quartier Triangle d’Or est nommé à son emplacement OSM. Les libellés de rues suivent de vrais segments. Sur mobile, la carte mesure désormais 420 px de haut pour rendre les commandes et les environs lisibles. Les captures mobiles anciennes et nouvelles ont les mêmes dimensions mais des positions de défilement différentes ; elles ne constituent pas une superposition pixel par pixel.

La carte couvre une partie de Casablanca, environ 13,4 × 8,9 km. Ce n’est ni une carte mondiale ni un moteur de navigation. Les données sont un extrait daté, à régénérer pour suivre les changements de voirie. Les essais WebKit sont une émulation, pas une vérification sur l’iPhone physique du propriétaire. Aucune parité pixel parfaite ni mesure des performances réelles en production n’est revendiquée.

## Liens exacts

- [Carte de l’accueil](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/#plan)
- [Showroom et carte Google facultative](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/showroom-casablanca/#showroom-contact)
- [Administration EmDash](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/_emdash/admin/)

L’aperçu reste privé sur le port 4321 et dépend du Codespace en marche. La correction est enregistrée sur `feat/emdash-migration` ; la PR reste en brouillon. Aucun changement de `main`, des aperçus statiques, de GitHub Pages, du domaine ou de la production. Cette correction ciblée ne termine pas le reste du [plan SEO](seo-audit-2026-09-28.md).
