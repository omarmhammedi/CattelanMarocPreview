# Contenus des familles et des modèles

Cette révision applique la [stratégie de contenu](seo-content-strategy.md) aux six familles et aux onze modèles déjà sélectionnés. Les familles comparent les références ; les fiches décrivent le modèle exact. Aucun minimum de mots, ajout de ville, prix, stock ou avis inventé ne sert à allonger les textes.

Les sources de migration sont `content/family-editorial.json` et `content/model-editorial.json`. Chaque entrée conserve son texte précédent, sa proposition et les URL officielles correspondantes. Les faits techniques viennent des pages françaises et des données publiques examinées pour `content/model-details.json`. Le texte français est rédigé pour le parcours local, avec onze liens contextuels famille → modèle. Ces fichiers ne sont jamais lus par le frontend : EmDash reste l'unique source publiée.

## Migration ciblée 0004

La migration 0003 doit avoir importé les détails des modèles au préalable. La 0004 ne crée ni schéma, ni média, ni compte. Elle modifie uniquement :

- Familles : introduction, texte court de carte et corps enrichi.
- Modèles : description et corps enrichi.
- Panneau SEO natif : titre et description, en conservant image, canonical et `noIndex`.

```sh
EMDASH_USE_CLI_AUTH=1 node scripts/migrations/0004-collection-editorial.mjs
EMDASH_USE_CLI_AUTH=1 node scripts/migrations/0004-collection-editorial.mjs --apply
```

L'authentification doit provenir d'une connexion EmDash native pour ce projet. Comme la 0003, le script accepte également `EMDASH_AUTH_FILE` avec une session existante. Ne pas utiliser les deux modes ensemble. Le mode par défaut est une simulation en lecture seule ; aucun code d'authentification n'est approuvé automatiquement.

L'accès technique local explicitement autorisé par le propriétaire utilise le [parcours natif de développement décrit pour la 0003](model-pages.md#migration-ciblée-dune-base-existante). Il ouvre une session du compte distinct `dev@emdash.local`, créé si nécessaire, en conservant l'administrateur personnel et ses passkeys. Seule la route `auth/dev-bypass` intervient, jamais `setup/dev-bypass` ni un seed. Sauvegarde et relevé de conservation précèdent l'opération ; le cookie reste privé et la session est fermée par la route native de déconnexion après publication et vérification. Les tests qui modifient le contenu ou l'authentification restent réservés à la copie jetable ; les vérifications publiques en lecture seule peuvent porter sur l'aperçu principal.

Les dix-sept entrées doivent correspondre exactement à leur état initial connu ou à leur état final attendu. Une modification personnalisée, une valeur effacée, un état partiellement modifié ou un brouillon en attente arrête la préparation avant toute écriture. Le script contrôle les révisions, le schéma et toutes les pages des relations natives avant l'import, puis chaque entrée avant son enregistrement. Il sauvegarde les entrées concernées dans `.wrangler/migrations/`, révise par l'API native et republie uniquement les entrées déjà publiées.

Les autres champs, les médias, l'ordre des relations, les attributions et les statuts sont comparés après sauvegarde. Relancer une migration terminée ne change rien. Un import interrompu conserve son rapport et sa sauvegarde ; examiner tout brouillon laissé en attente dans EmDash avant de le reprendre. Ne jamais remplacer une base existante par le seed pour résoudre un conflit.

**Particularité native : le panneau SEO n'est pas un brouillon.** EmDash 0.41 enregistre ces métadonnées immédiatement, même lorsque le corps de page attend une publication. La migration n'est donc pas une transaction atomique entre textes et SEO. Un échec entre sauvegarde et publication peut laisser le nouveau SEO avec l'ancien corps publié ; le rapport permet d'identifier l'entrée et sa révision. Le template respecte le titre du panneau pour `<title>` et laisse le H1 éditorial intact.

## Vérification isolée

Le test `tests/collection-editorial-browser.mjs` exige une copie jetable marquée, avec ses propres données, médias, secrets et session, sur un port différent de 4321. Exécuter d'abord les migrations 0003 et 0004 sur cette seule copie.

```sh
CMS_TEST_URL=http://localhost:4331 node tests/collection-editorial-browser.mjs
```

Il vérifie les dix-sept textes et métadonnées rendus, les liens contextuels, la précision commune sans répétition, les thèmes clair/sombre aux formats ordinateur/mobile dans Chromium et WebKit. Il teste aussi le brouillon, l'aperçu signé et la publication d'une famille, ainsi que l'effet immédiat et l'effacement des métadonnées SEO natives. Les valeurs de test sont restaurées dans un bloc `finally`. Les captures et le rapport sont écrits sous `test-results/collection-editorial/`.

Le port principal reste privé et `SITE_INDEXABLE=false`. Aucun déploiement, changement de domaine, import de tout le catalogue international ni connexion à Search Console n'appartient à cette migration.
