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

Une fois le site initialisé, l'aperçu se relance au démarrage du Codespace ou à la reconnexion de l'éditeur ; le Codespace existant couvre aussi la reconnexion SSH. Ce démarrage ne change pas l'arrêt automatique après quinze minutes de fin de tâches. Voir [le fonctionnement et la commande de désactivation](docs/development.md#relancer-automatiquement-laperçu-après-un-redémarrage).

## Contenus

- Cinq pages fixes, six familles, onze fiches de modèles et cinq articles complets.
- Contenus, médias, navigation et métadonnées lus dans EmDash à chaque requête.
- Brouillons, publication et prévisualisations signées natifs ; aucun JSON de remplacement côté site.
- PDF privé de démonstration, formulaire nom/email, préférence facultative pour les communications.
- Contacts et événement CRM atomiques en stockage privé, reprise et dédoublonnage ; aucun CRM externe activé.
- Les textes, visuels et PDF restent provisoires. Les exemples de meubles ne constituent pas une liste de stock ou de pièces exposées.

## Vérifications

```sh
npm run check
npm test
node scripts/seed-validate.mjs
npm run build
```

Le test `tests/cms-sync.mjs` utilise une vraie inscription et connexion EmDash avec une passkey virtuelle sur **une copie jetable dédiée uniquement**. Les tests CMS et catalogue HTTP exigent un `CMS_TEST_URL` explicite, un port différent de 4321 et un marqueur local d’isolation. Ses identifiants restent dans le `.wrangler/` de cette copie, exclu de Git. Voir [le protocole de test isolé](docs/development.md#tests-de-navigateur-sur-une-base-locale-dédiée).

`node tests/public-browser.mjs` vérifie le site existant en lecture seule : pages publiques, thèmes, navigation, animations et erreurs du formulaire. Toute tentative de requête autre que GET/HEAD y est bloquée. Les captures et le rapport sont placés dans `test-results/public-browser/`.

Après les migrations 0003 et 0004, `node tests/published-content-browser.mjs` vérifie aussi les textes et métadonnées publiés des six familles et onze modèles, les liens, les médias et les PDF techniques, puis leurs compositions dans Chromium et WebKit. Ce contrôle est anonyme et en lecture seule ; il compare les octets aux empreintes du cache officiel local de la migration. Voir le [rapport de publication dans l'aperçu privé](docs/test-results-publication.md).

## Guides

- [Développement et Codespaces](docs/development.md)
- [Champs et synchronisation des contenus](docs/content-map.md)
- [Fiches modèles et import des sources officielles](docs/model-pages.md)
- [Stratégie de contenu et SEO](docs/seo-content-strategy.md)
- [Audit des 28 pages et plan de finalisation SEO](docs/seo-audit-2026-09-28.md)
- [Carte des pages et intentions de recherche](docs/seo-page-map.md)
- [Catalogue, contacts privés et CRM](docs/catalogue.md)
- [Résultats de compilation et périmètre de validation](docs/test-results-build.md)
- [Finalisation de la migration et comparaison avec la version B](docs/migration-completion.md)

## Mise en service ultérieure

Connecter Cloudflare, créer les ressources de préproduction puis de production, importer les données et médias, configurer les secrets, inscrire l'administrateur et tester le parcours complet sur Workers. Le domaine `cattelanitalia.ma` sera raccordé à cette étape. `SITE_INDEXABLE=false` et les réponses sans cache protègent actuellement la prévisualisation contre une indexation involontaire et les contenus périmés.

Avant une collecte réelle : finaliser le catalogue, les informations légales et la confidentialité, confirmer les coordonnées du showroom et les droits sur les visuels. La page de confidentialité actuelle décrit uniquement les essais de développement.
