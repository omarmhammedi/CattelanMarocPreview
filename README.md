# Cattelan Italia Maroc

Migration du site vitrine vers **EmDash 0.41.0 / Astro / Cloudflare Workers**. La direction B conserve ses scènes au défilement, ses compositions ordinateur/mobile et ses thèmes clair/sombre.

Les fichiers `legacy/index.html`, `version-a/` et `version-b/` conservent les aperçus statiques historiques. L'application CMS se trouve dans `src/`. GitHub Pages continue à servir les aperçus historiques ; il ne peut pas exécuter ce backend.

## Développement

Node 24 recommandé (minimum 22.16).

```sh
npm ci
npm run setup
npm run dev
```

Ouvrir `http://localhost:4321/_emdash/admin/` et suivre l'initialisation native. EmDash applique le seed fourni à une base vide ; ne pas le réimporter sur un site déjà initialisé. Le compte d'administration prévu pour le vrai site est l’adresse d’administration convenue hors du dépôt ; créer sa passkey au moment de la mise en service. Aucun secret ou compte préconfiguré n'est livré dans Git.

Le dossier `.devcontainer/` permet d'ouvrir cette branche dans GitHub Codespaces. La base D1 et les deux espaces R2 sont simulés localement par workerd. Aucun compte Cloudflare n'est nécessaire pour ces essais. Le port contenant l'administration doit rester privé.

Une fois le site initialisé, l'aperçu se relance à la reconnexion de l'éditeur, y compris dans l'ancien Codespace ; celui-ci couvre aussi la reconnexion SSH. La reprise sans connexion utilise le hook de démarrage et nécessite que la configuration actuelle du conteneur soit appliquée. L'arrêt automatique après quinze minutes de fin de tâches est conservé. Voir [le fonctionnement et la commande de désactivation](docs/development.md#relancer-automatiquement-laperçu-après-un-redémarrage).

## Contenus

- Cinq pages fixes, six familles, onze fiches de modèles et cinq articles complets.
- Contenus, médias, navigation et métadonnées lus dans EmDash à chaque requête.
- Brouillons, publication et prévisualisations signées natifs ; aucun JSON de remplacement côté site.
- Adresse, téléphone et horaires du showroom fournis par le propriétaire ; carte de Casablanca fondée sur la géographie réelle OpenStreetMap, avec la palette de la version B, des rues fines et le repère rouge animé.
- Carte de l’accueil : zoom et déplacement à la demande, coordonnées du showroom éditables dans EmDash, attribution visible et données locales téléchargeables. La page showroom conserve séparément son itinéraire et sa carte Google Maps chargée à la demande.
- PDF privé de démonstration, formulaire nom/email, préférence facultative pour les communications.
- Contacts et événement CRM atomiques en stockage privé, reprise et dédoublonnage ; aucun CRM externe activé.
- Le showroom associe une photographie réelle tirée de l’article fourni par le propriétaire à une courte présentation, aux coordonnées et aux horaires. La séquence « Dessiné en Italie » réutilise deux images officielles de Skorpio déjà présentes dans EmDash. Voir le [contrat de contenu](docs/content-map.md#migration-0009--photographies-et-présentation-du-showroom).
- Les autres photos d’ambiance et le PDF de démonstration restent provisoires. Les exemples de meubles ne constituent pas une liste de stock ou de pièces exposées.

## Vérifications

La révision éditoriale 0010 applique le [réaudit des 28 pages](docs/editorial-audit-2026-09-29.md) : suppression des préparatifs systématiques, textes factuels, liens contextuels dans les articles et téléchargement explicite. Les manifestes `content/editorial-refresh-*.json` servent uniquement à la migration ciblée ; EmDash reste la source du site. Le [rapport de révision](docs/test-results-editorial-refresh.md) décrit la publication, les tests et les limites.

`PUBLIC_TEST_ENGINE=chromium|webkit PUBLIC_TEST_THEME=dark|light node tests/editorial-refresh-browser.mjs` contrôle les textes publiés des 28 routes et les compositions ordinateur/mobile, sans écriture. `tests/editorial-refresh-cms.mjs` vérifie la migration et les brouillons uniquement dans une base jetable. Les anciens rapports restent des preuves historiques ; les contrôles familles/publication/showroom suivent désormais le texte de la migration 0010.

```sh
npm run check
npm test
node scripts/seed-validate.mjs
npm run build
```

Le test `tests/cms-sync.mjs` utilise une vraie inscription et connexion EmDash avec une passkey virtuelle sur **une copie jetable dédiée uniquement**. Les tests CMS et catalogue HTTP exigent un `CMS_TEST_URL` explicite, un port différent de 4321 et un marqueur local d’isolation. Ses identifiants restent dans le `.wrangler/` de cette copie, exclu de Git. Voir [le protocole de test isolé](docs/development.md#tests-de-navigateur-sur-une-base-locale-dédiée).

`node tests/public-browser.mjs` vérifie le site existant en lecture seule : pages publiques, thèmes, navigation, animations et erreurs du formulaire. Toute tentative de requête autre que GET/HEAD y est bloquée. Les captures et le rapport sont placés dans `test-results/public-browser/`.

Après les migrations 0003, 0004 et 0008, `node tests/published-content-browser.mjs` vérifie aussi les textes et métadonnées publiés des six familles et onze modèles, les liens, les médias et les PDF techniques, puis leurs compositions dans Chromium et WebKit. Ce contrôle est anonyme et en lecture seule ; il compare les octets aux empreintes du cache officiel local de la migration. Voir le [rapport de publication initiale dans l'aperçu privé](docs/test-results-publication.md).

La migration 0008 élargit les six familles à la présentation de gamme et aux critères de choix, avec les modèles conservés comme exemples. `node tests/family-guides-browser.mjs` vérifie les guides publiés ; paramètres `PUBLIC_TEST_ENGINE=chromium|webkit` et `PUBLIC_TEST_THEME=dark|light`. Le contrôle général de publication utilise également ce dernier manifeste. `tests/family-guides-cms.mjs` reste réservé à une base jetable. Voir [le contrat éditorial](docs/collection-editorial.md) et le [rapport avec captures](docs/test-results-family-guides.md).

`node tests/showroom-browser.mjs` vérifie en lecture seule les coordonnées, les thèmes et la carte Google Maps à la demande, avec captures dans `test-results/showroom-browser/`. Le [premier rapport showroom](docs/test-results-showroom.md) décrit l’étape précédente avec le plan illustratif ; il ne valide pas la nouvelle géographie. `node tests/geographic-map-browser.mjs` contrôle la carte géographique et ses interactions ; ses preuves et limites sont consignées dans le [rapport dédié](docs/test-results-geographic-map.md).

La migration 0009 cible uniquement les deux pages `home` et `showroom-casablanca` et leurs images approuvées. Les textes, références d’images et contrôles de départ sont décrits dans `content/showroom-editorial-copy.json` et `content/showroom-refresh.json` ; le site continue de lire EmDash à chaque requête. Le [rapport de cette révision](docs/test-results-showroom-refresh.md) rassemble les preuves de publication, les contrôles publics et les captures.

Le cycle brouillon, aperçu signé, publication et effacement des champs relève de `tests/showroom-location-cms.mjs` pour la migration 0005 et de `tests/geographic-showroom-cms.mjs` pour les coordonnées de la migration 0006, **uniquement dans l’environnement jetable** décrit dans le guide de développement.

`node tests/geographic-map-interaction-browser.mjs` contrôle aussi les clics sur `+` et `−` après défilement partiel de la carte, les limites du zoom, les noms de rues, les taps mobiles et l’affichage dans une iframe. Il accepte `PUBLIC_TEST_ENGINE=chromium` ou `webkit` et `PUBLIC_TEST_THEME=dark` ou `light`. Voir [le correctif des commandes et ses captures](docs/test-results-map-controls.md).

`node tests/geographic-map-trackpad-browser.mjs` vérifie le déplacement à deux doigts, le zoom autour du pointeur, les événements de pincement Safari, les limites géographiques et le défilement de page hors de la carte. Il accepte les mêmes paramètres de moteur et de thème. Les pincements sont simulés : voir [les preuves et limites du correctif trackpad](docs/test-results-map-trackpad.md).

## Guides

- [Réaudit éditorial des 28 pages : textes à conserver, réécrire ou supprimer](docs/editorial-audit-2026-09-29.md)
- [Développement et Codespaces](docs/development.md)
- [Champs et synchronisation des contenus](docs/content-map.md)
- [Fiches modèles et import des sources officielles](docs/model-pages.md)
- [Stratégie de contenu et SEO](docs/seo-content-strategy.md)
- [Audit des 28 pages et plan de finalisation SEO](docs/seo-audit-2026-09-28.md)
- [Coordonnées du showroom, carte et preuves de validation](docs/test-results-showroom.md)
- [Photographies et présentation du showroom](docs/test-results-showroom-refresh.md)
- [Carte géographique : sources, attribution et données locales](docs/geographic-map.md)
- [Vérifications de la carte géographique](docs/test-results-geographic-map.md)
- [Carte des pages et intentions de recherche](docs/seo-page-map.md)
- [Catalogue, contacts privés et CRM](docs/catalogue.md)
- [Résultats de compilation et périmètre de validation](docs/test-results-build.md)
- [Finalisation de la migration et comparaison avec la version B](docs/migration-completion.md)

## Mise en service ultérieure

Connecter Cloudflare, créer les ressources de préproduction puis de production, importer les données et médias, configurer les secrets, inscrire l'administrateur et tester le parcours complet sur Workers. Le domaine `cattelanitalia.ma` sera raccordé à cette étape. `SITE_INDEXABLE=false` et les réponses sans cache protègent actuellement la prévisualisation contre une indexation involontaire et les contenus périmés.

Avant une collecte réelle : finaliser le catalogue, les informations légales et la confidentialité, confirmer les services proposés et les droits sur les visuels. L’adresse, le téléphone et les horaires ont été fournis ; aucun email public ni usage de WhatsApp n’a été confirmé. Une photographie réelle du magasin est retenue depuis l’article transmis par le propriétaire ; les fichiers originaux et les droits pour la mise en ligne définitive restent à confirmer. La page de confidentialité actuelle décrit uniquement les essais de développement.
