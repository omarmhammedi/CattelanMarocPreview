# Coordonnées et carte du showroom

Intégration publiée dans l’aperçu privé le **28 septembre 2026 à 20 h 59, heure de Toronto**. Les horaires affichés sur le site sont explicitement ceux de **Casablanca**.

## Résultat

L’entrée globale EmDash contient désormais l’adresse **8–10 Avenue Mohamed Sijilmassi, Casablanca 20250, Maroc**, le téléphone **+212 7 71 10 54 90** et les horaires fournis par le propriétaire : lundi 12 h–19 h 30, mardi–samedi 9 h–19 h 30, dimanche fermé. La source et les valeurs approuvées sont conservées dans [le contrat de migration](../content/showroom-location.json).

Le téléphone est cliquable sur l’accueil et les pages intérieures. « Contacter le showroom » rejoint les informations pratiques au lieu de recharger la même page. Les liens d’itinéraire identifient le lieu Google `ChIJnXzIEVjTpw0RXul0XQgeEHw`.

Le plan illustré de l’accueil conserve son dessin, ses couleurs et son marqueur animé. Le symbole SVG et toute la feuille `src/styles/site.css` sont identiques à ceux du commit `22d8d07`. Cette comparaison établit la conservation du plan existant ; elle ne constitue pas une nouvelle comparaison pixel par pixel avec le prototype B.

Sur la page showroom, « Afficher la carte interactive » charge l’iframe fournie par le propriétaire. Aucun appel à Google Maps n’a lieu avant l’activation. Fermer la carte retire l’iframe ; sans JavaScript, l’itinéraire reste disponible. Le cadre et les commandes suivent le thème du site, tandis que la cartographie, les couleurs et les mentions Google restent gérées par Google. La page de confidentialité décrit ce chargement à la demande.

Les champs facultatifs `map_embed_url` et `map_note` sont administrables. L’aperçu signé de la configuration globale présente aussi la carte après l’accueil. Effacer l’URL d’intégration supprime le bouton et l’iframe après publication, sans rétablissement automatique. L’itinéraire reste un champ distinct. Voir [le contrat éditorial](content-map.md#migration-0005--coordonnées-du-showroom-et-carte-à-la-demande).

## Vérifications effectuées

- **48 tests unitaires réussis**, dont la validation des URL d’intégration et les garde-fous de la migration.
- **Astro check : 70 fichiers, aucune erreur, aucun avertissement.**
- **Compilation de production réussie** (`npm run build`, 23 secondes). Vite signale encore des chunks supérieurs à 500 kB ; cette intégration ne résout pas le chantier général de performance.
- Seed validé : six collections, 29 entrées, dix images sources. Aucun réimport du seed dans la base existante.
- **23 cas de navigateur réussis** : Chromium et WebKit, clair/sombre, 1440 × 900, 1280 × 720, 1024 × 768, 390 × 844 et 320 × 740 ; puis trois contrôles Chromium sans JavaScript. Coordonnées, téléphone, itinéraire, panneau d’accueil sans débordement, chargement uniquement après activation, clavier Entrée/Espace/Échap et fermeture vérifiés. Les 20 chargements Google initiaux ont répondu HTTP 200 ; le marqueur Cattelan Italia est visible dans les captures finales. Aucun débordement horizontal ni erreur JavaScript applicative relevé.
- **Régression publique réussie** : 17 routes dans les deux thèmes à 1440 et 390 px, compléments à 1024 et 320 px, navigation mobile, changement de thème entre pages, scènes et animations de l’accueil, mouvement réduit, consentement facultatif et erreurs du formulaire catalogue. Les 30 images distinctes contrôlées répondent avec un contenu image. Aucun contact soumis ni téléchargement privé déclenché dans la base existante.
- **Huit contrôles CMS natifs réussis** dans une copie jetable indépendante sur le port 4331 : simulation sans écriture, application, idempotence, conservation des champs non concernés, brouillons privés, aperçu signé, publication immédiate, effacement et restauration. Les aperçus signés portent `private, no-store` et `noindex` ; un jeton invalide ne révèle pas les brouillons.
- Préservation de la base existante : **27 tables protégées et 626 fichiers vérifiés** ; aucun utilisateur ajouté, administrateurs et deux passkeys conservés, contacts et PDF privés intacts. Les deux champs et les deux révisions publiées sont les ajouts attendus ; les index internes de médias ont évolué lors de la publication native. Sauvegarde cohérente et journaux privés sous `.wrangler/migrations/0005-primary-showroom/`.
- Deuxième simulation sur la base existante : **zéro modification**. La session technique utilisée a été déconnectée, son ancien cookie refusé avec HTTP 401 et son seul fichier de session nouvellement créé supprimé.

La copie jetable utilisée pour les tests CMS a été arrêtée puis supprimée après conservation de son rapport ; elle ne laisse ni serveur supplémentaire ni copie de dépendances en fonctionnement.

Les résultats bruts locaux sont dans `test-results/showroom-browser/`. Les tests de navigateur n’effectuent aucune écriture dans le CMS. Le service Google lit ses données de cadrage et ses marqueurs par le RPC POST `GetViewportInfo`, explicitement autorisé dans le test ; les autres requêtes non GET/HEAD sont bloquées. Une première passe qui bloquait également ce RPC vérifiait la structure et les contrôles, mais empêchait Google d’afficher le marqueur : les captures finales proviennent de la passe autorisant cette lecture.

## Captures

Le [relevé de validation conservé dans Git](audits/showroom-2026-09-28.json) rassemble les cas de navigateur, les contrôles CMS isolés et la comparaison du SVG.

Captures de l’aperçu existant, aux mêmes dimensions dans les deux thèmes :

| Vue | Sombre | Clair |
| --- | --- | --- |
| Accueil, plan illustré — 1440 × 900 | [Capture](screenshots/showroom-2026-09-28/home-map-1440-dark.jpg) | [Capture](screenshots/showroom-2026-09-28/home-map-1440-light.jpg) |
| Accueil, plan illustré — 390 × 844 | [Capture](screenshots/showroom-2026-09-28/home-map-390-dark.jpg) | [Capture](screenshots/showroom-2026-09-28/home-map-390-light.jpg) |
| Showroom, Google Maps ouvert — 1440 × 900 | [Capture](screenshots/showroom-2026-09-28/showroom-map-1440-dark.jpg) | [Capture](screenshots/showroom-2026-09-28/showroom-map-1440-light.jpg) |
| Showroom, Google Maps ouvert — 390 × 844 | [Capture](screenshots/showroom-2026-09-28/showroom-map-390-dark.jpg) | [Capture](screenshots/showroom-2026-09-28/showroom-map-390-light.jpg) |

## Limites et accès

Le plan d’accueil reste une illustration, pas un fond de carte géoréférencé. La carte réelle dépend de Google et d’une connexion réseau. Aucun email public, WhatsApp, stock exposé ou service de livraison n’a été déduit du numéro ou du listing. Les photos réelles du magasin, le catalogue définitif et les éléments juridiques restent à finaliser ; les autres points de l’audit SEO restent distincts de cette intégration.

- [Accueil](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/)
- [Informations et carte du showroom](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/showroom-casablanca/#showroom-contact)
- [Administration EmDash](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/_emdash/admin/)

Le port 4321 reste privé, la PR n° 1 ouverte en brouillon et les aperçus statiques inchangés. Aucun déploiement de production, raccordement Cloudflare, domaine ou CRM. L’aperçu dépend du Codespace en cours d’exécution ; son arrêt automatique après quinze minutes de fin de tâches est inchangé.
