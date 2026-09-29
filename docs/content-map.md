# Modèle éditorial et synchronisation EmDash

Version initiale : EmDash **0.41.0**, français uniquement. `seed/seed.json` initialise un site vide avec les textes préparés dans la proposition éditoriale du 26 septembre 2026. Le rendu public interroge EmDash ; le fichier de seed n’est pas une source de secours du site.

La configuration Astro déclare explicitement `defaultLocale: 'fr'` et `locales: ['fr']`, en accord avec le seed. EmDash utilise cette configuration pour les menus, les taxonomies et les nouveaux contenus. Les URL restent sans préfixe de langue, y compris l’administration ; aucune seconde langue n’est activée. Voir la [configuration native des langues](https://docs.emdashcms.com/guides/internationalization/).

## Collections et chemins

| Collection | Entrées initiales | Chemins publics | Contenu |
| --- | ---: | --- | --- |
| `pages` | 5 | `/`, `/collections/`, `/showroom-casablanca/`, `/catalogue/`, `/journal/` | Titre, introduction, images et sections éditoriales |
| `families` | 6 | `/collections/{slug}/` | Présentation courte, texte enrichi, sélection de modèles, article associé |
| `models` | 11 | `/modeles/{slug}/` et cartes des familles | Fiche du modèle exact, galerie, dimensions, plans, finitions et PDF technique public |
| `posts` | 5 | `/journal/{slug}/` | Articles complets en Portable Text, extrait, image, rubrique, sources, CTA |
| `catalogues` | 1 | Formulaire et téléchargement | Édition, couverture, mention de démonstration, référence du PDF privé |
| `site_content` | 1 | Partagé sur tout le site | Logos, contacts, coordonnées, boutons, pied de page, textes du formulaire et catalogue actif |

Les clés stables des pages sont `home`, `collections`, `showroom`, `catalogue`, `journal`. Leurs slugs sont respectivement `home`, `collections`, `showroom-casablanca`, `catalogue`, `journal`. Le rendu résout l’accueil à `/` et traite `/home/` comme son alias. Une prévisualisation signée doit conserver son contexte EmDash lorsqu’elle résout cette route.

Les familles sont `tables`, `chaises-tabourets`, `canapes-fauteuils`, `buffets-bibliotheques`, `luminaires`, `mobilier-exterieur`.

## Champs et surfaces

| Champ EmDash | Rendu concerné | Comportement si vide | Vérification attendue |
| --- | --- | --- | --- |
| `pages.title`, `eyebrow`, `intro` | En-têtes desktop et mobile | Le titre est obligatoire ; champs secondaires masqués | Publier un titre et vérifier les deux formats sans reconstruction |
| `pages.hero_image` | Image principale | Masquer le bloc photo ; aucune image de secours cachée | Remplacer la référence, publier, comparer clair/sombre |
| `pages.sections` | Sections éditoriales | Masquer la section absente | Modifier texte/CTA une seule fois, vérifier toutes les vues |
| `sections.section_key` | Repère sémantique | Ne pas déplacer les repères de l’accueil | `brand`, `collections`, `showroom`, `catalogue`, `journal` |
| `sections.heading` | Titre éditorial complet | Facultatif | Conserver le sens indépendamment de la mise en page |
| `sections.display_heading` | Titre court des grandes compositions | Utiliser `heading` | Tester les deux lignes et le retour à la ligne sur mobile |
| `pages.brand_image`, `brand_detail_image`, `brand_caption` | Séquence « Dessiné en Italie » | Masquer l’image ou légende absente | Vérifier recadrage, lecture et animation |
| `pages.showroom_image`, `showroom_invitation` | Séquence showroom de l’accueil | Masquer les champs absents | Ne pas légender une ambiance comme une photographie du magasin |
| `families.short_title`, `card_text`, `image`, `sort_order` | Cartes de l’accueil et des collections | Titre obligatoire, image facultative | Le rail calcule sa longueur sur les six familles, sans nombre fixé en CSS |
| `families.content` | Page de famille | Masquer le corps vide | L’éditeur Portable Text pilote les paragraphes |
| `families.models` | Cartes de modèles | Masquer la sélection | Respecter l’ordre de la relation enregistré par l’éditeur |
| `families.related_post` | Article associé | Masquer le lien | Un article en brouillon ne fuit pas sur le site public |
| `models.image` | Photographie du modèle exact, carte et tête de fiche | Carte/fiche sans photographie | Ne pas affecter une photo d’ambiance à un modèle non identifié |
| `posts.title`, `excerpt`, `image`, taxonomie `category` | Listes et cartes Journal | Titre/extrait obligatoires, image facultative | Les modifications se propagent à l’accueil, à la liste et à l’article |
| `posts.content` | Article | Contenu obligatoire | Les cinq articles possèdent leurs sections et paragraphes complets |
| `posts.cta_*` | Fin d’article | Masquer le bouton incomplet | Vérifier destination locale et invitation |
| `site_content.logo_light`, `logo_dark` | En-tête et pied de page | Utiliser le logo natif s’il existe, puis le nom du site | Vérifier les deux apparences et la navigation mobile |
| `site_content.address`, `hours`, `contact_phone`, `map_url` | Informations pratiques de l’accueil, du showroom et du pied de page ; lien d’itinéraire | Masquer chaque donnée absente ; téléphone en lien `tel:` | Seed vide ; coordonnées approuvées fournies par la migration 0005 |
| `site_content.map_embed_url` | Carte interactive de la page showroom, ouverte sur demande | Masquer le bouton de carte si vide ou URL refusée ; conserver l’itinéraire s’il existe | URL seule `https://www.google.com/maps/embed?pb=…`, jamais le code `<iframe>` |
| `site_content.showroom_latitude`, `showroom_longitude` | Position du repère sur la carte géographique de l’accueil, desktop et mobile | Masquer le repère si une coordonnée est vide, invalide ou hors de la zone cartographiée | Deux nombres facultatifs ; publication et aperçu signés natifs, sans coordonnée de repli |
| `site_content.map_note` | Légende facultative de la carte géographique de l’accueil, desktop et mobile | Masquer la légende ; aucun retour automatique à « Plan illustratif » | L’ancien libellé administratif du champ est conservé ; l’attribution cartographique reste indépendante |
| `site_content.public_email` | Contact public | Masquer | L’adresse d’administration n’est pas publiée automatiquement |
| `site_content.discover_label` | Boutons des familles de mobilier | Libellé obligatoire, initialement « Découvrir » | Modifier ce bouton sans changer « Lire l’article » dans le Journal |
| `site_content.active_catalogue` | Tous les formulaires catalogue | Message d’indisponibilité | Publier un changement de catalogue et vérifier les deux formulaires |
| `catalogues.private_file_key` | Route serveur de téléchargement | Refuser le téléchargement, message explicite | Vérifier accès sans jeton, jeton expiré et téléchargement après enregistrement |
| `catalogues.is_placeholder` | Mention du document de test | Booléen obligatoire à vérifier lors du remplacement | Initialement vrai ; la couverture n’est pas une couverture officielle validée |
| `seo_title`, `meta_description` | Métadonnées publiques | Utiliser titre/extrait éditoriaux | Vérifier canonical, partage et absence de doubles URLs |

Le panneau SEO natif EmDash est prioritaire sur ces anciens champs éditoriaux. Son titre pilote désormais aussi la balise HTML `<title>`, sans modifier le H1 visible. La description, l'image, le canonical et `noIndex` suivent le comportement natif d'`EmDashHead`. Effacer une valeur du panneau rétablit les champs éditoriaux de repli. Dans EmDash 0.41, ce panneau est enregistré immédiatement : ses modifications ne suivent pas le cycle de brouillon du corps de page.

La rubrique du Journal a une seule source : la taxonomie native `category`. Le rendu lit `entry.data.terms.category[].label` ; aucun champ texte `posts.category` ne la duplique. Les crédits éditoriaux proviennent également des bylines natifs, initialement « Cattelan Italia Maroc », sans auteur personnel inventé.

Les sections de pages sont des repeaters éditables : `section_key`, `heading`, `display_heading`, `text`, `cta_label`, `cta_href`, `image`. Les textes enrichis utilisent le type natif `portableText`. Aucun HTML arbitraire issu du seed n’est injecté.

## Relations en EmDash 0.41

Le seed déclare trois relations : `family_models`, `family_posts`, `site_catalogue`. Les champs `reference` les désignent par `validation.relation`.

Dans un **seed**, les liens sont des valeurs `$ref:identifiant-du-seed` dans `data`. Le moteur 0.41 les transforme en liens de relation. Les cibles doivent avoir été créées avant le parent : le seed ordonne donc modèles, articles et catalogue avant familles et configuration globale. Ce format est distinct des écritures REST, qui utilisent le champ de premier niveau `references`.

Au rendu, demander les relations à `getEmDashEntry` / `getEmDashCollection`, puis lire `entry.references.models.entries`, `entry.references.related_post.entries` et `entry.references.active_catalogue.entries`. Elles ne se trouvent pas dans `entry.data`.

## Médias et PDF

Les images de la maquette sont référencées par `$media` avec une URL GitHub au commit immuable `fa61f4a01c46a19e9f597773ce4f8ee00849fc70`. L’application du seed avec un adaptateur de stockage télécharge les fichiers, crée les médias EmDash et remplace les références par leurs identifiants. Il ne s’agit pas de dépendances HTTP de chaque page publique. Les répétitions d’une même URL sont dédupliquées pendant une application du seed.

Le seed ne prend pas en charge de chemin local `file` pour un `$media`. Une application sans adaptateur de stockage peut produire des images nulles ; ne pas valider l’installation dans cet état. L’import doit être vérifié sur la base et le stockage réellement utilisés par le serveur.

Le PDF n’est pas importé dans la médiathèque publique. Le champ `catalogues.private_file_key` vaut initialement `catalogues/cattelan-demonstration.pdf` dans le stockage privé du module catalogue. Le remplacement est enregistré dans EmDash et publié explicitement ; aucun URL R2 public ne doit être exposé.

## Initialisation et évolutions

```sh
node scripts/seed-validate.mjs
npx emdash seed seed/seed.json --validate
```

Le seed n’est exécuté qu’à l’initialisation d’une base vide ou dans un import explicitement choisi. Ne pas appliquer automatiquement `--on-conflict update` au démarrage ou au déploiement : cela remplacerait les modifications faites dans l’administration. Une évolution d’un site existant passe par une migration ciblée et versionnée des champs, puis la régénération des types. Les contacts privés et les fichiers du module catalogue nécessitent une sauvegarde distincte du seed éditorial.

## Contrat de rendu complété le 27 septembre 2026

Ces règles concernent le contenu publié et les aperçus natifs signés. Elles ne nécessitent ni réimport du seed ni modification des contenus existants.

| Champs | Comportement public |
| --- | --- |
| `pages.sections` | Les quatre pages intérieures affichent chaque section, son texte, son image et son bouton. Les questions `faq_*` du showroom restent des accordéons et conservent leurs images et boutons ; une réponse sans titre apparaît comme bloc ordinaire, une entrée vide est omise. La section « Poursuivons votre découverte » du catalogue est rendue après le parcours de demande. |
| `sections.display_heading`, `heading` | Le titre court est prioritaire pour la composition visible ; à défaut, le titre éditorial est utilisé. Vider les deux masque le titre. |
| `sections.cta_label`, `cta_href` | Un bouton apparaît uniquement si les deux valeurs sont renseignées. Effacer l’une des valeurs retire le bouton, sans destination ou texte de remplacement. |
| Accueil : `sections.image` | L’image de la section est utilisée. Pour `brand` et `showroom`, elle est prioritaire sur `brand_image` ou `showroom_image`, conservés comme champs de repli explicites. Pour `catalogue`, elle peut remplacer la couverture dans la composition de l’accueil ; elle ne change pas le PDF ni la fiche catalogue. |
| Accueil : repères de sections | `brand`, `collections`, `showroom`, `catalogue`, `journal` déterminent les scènes dans leur ordre visuel fixe. Supprimer un repère retire sa scène. Les autres sections sont affichées après les scènes ; elles ne sont pas ignorées. |
| `pages.content`, `hero_image` | Le corps enrichi non vide et l’image principale sont rendus sur chaque page fixe. Sur l’accueil, le corps supplémentaire suit les scènes. Sur le catalogue, l’image éditoriale est distincte de la couverture du PDF. |
| `site_content.public_email` | L’adresse renseignée apparaît comme lien email dans les pieds de page et les informations du showroom. Un champ vide ne produit aucun lien. L’email du compte administrateur n’est jamais utilisé comme remplacement. |
| `site_content.read_article_label` | Le libellé contrôle les liens de lecture des cartes du Journal et des articles associés ; `discover_label` reste réservé aux familles de mobilier. |
| `site_content.form_name_error`, `form_email_error` | Les erreurs des champs du formulaire utilisent ces textes, y compris lorsque le serveur renvoie une erreur de validation de nom ou d’email. Le consentement aux communications reste séparé et facultatif. |
| `posts.cta_text`, `cta_label`, `cta_href` | Le texte d’invitation peut apparaître seul. Le bouton exige libellé et destination. Une invitation effacée ne fait pas réapparaître de bouton catalogue implicite. |
| `models.image_caption`, `availability_note` | La légende accompagne l’image du modèle si elle existe ; la précision de disponibilité apparaît sur la carte. Le texte global `model_notice` reste une précision commune à la sélection. |
| Nom, ville, logos et pied de page | Accueil et pages intérieures utilisent le titre/tagline natifs et la configuration globale. Chaque logo de thème explicite est prioritaire ; le logo natif EmDash sert de repli. En l’absence de logo utilisable, le nom du site reste lisible. |

Sur une page de famille, une précision de disponibilité identique au texte global est affichée une seule fois après la sélection. Une précision propre à un modèle reste sur sa carte ; si le texte global est vide, chaque précision de modèle reste visible. Aucun champ CMS n'est effacé par ce regroupement.

Les champs `route_key` et `sort_order` pilotent les routes et l’ordre, pas un texte affiché. `site_content.title` nomme la fiche dans l’administration ; le nom public vient du titre natif EmDash. `private_file_key` reste strictement serveur. Les champs dédiés `brand_*` et `showroom_*` de la collection partagée `pages` concernent l’accueil uniquement. Les métadonnées SEO, relations, taxonomies et crédits utilisent toujours les API natives.

## Éléments à valider avant mise en ligne

Le magasin présenté se situe uniquement à Casablanca. Rabat, Marrakech et Tanger apparaissent comme villes de projets. Le site ne promet aucun stock, exposition, délai ou service non confirmé. Les modèles Outdoor présentés sont explicitement limités aux espaces extérieurs couverts.

Le propriétaire a fourni et approuvé l’adresse, le téléphone et les horaires consignés dans `content/showroom-location.json` ; les horaires sont ceux de Casablanca (`Africa/Casablanca`). L’email public, l’usage de WhatsApp, les services et zones de livraison, les visuels du magasin, les droits d'utilisation des photos des modèles, le PDF définitif et les mentions juridiques restent à confirmer. Les sources officielles de la proposition sont consignées dans `seed/sources.json`. L'enrichissement des onze modèles est documenté dans [Fiches modèles](model-pages.md), avec le contrat de chaque nouveau champ et sa migration ciblée. La prévisualisation est prévue pour la validation du design et du fonctionnement avec des contenus provisoires.

Sources techniques : [format du seed](https://docs.emdashcms.com/themes/seed-files/), [types de champs](https://docs.emdashcms.com/reference/field-types/), [relations](https://docs.emdashcms.com/guides/relations/), [évolution du schéma](https://docs.emdashcms.com/deployment/schema-evolution/).

## Import fiable des images en développement

Le seed a été appliqué à une base SQLite jetable avec le moteur EmDash 0.41 : 86 migrations du cœur, 6 collections, 29 entrées et 17 liens de relation. Le modèle consolidé contient 84 champs : le doublon de rubrique a été retiré et le bouton des collections possède désormais son propre libellé. Les téléchargements d’images distantes peuvent cependant échouer silencieusement lors de l’initialisation si la résolution réseau est indisponible. La validation du schéma ne constitue donc pas une validation des médias.

`scripts/import-local-media.mjs` répare les références initiales à partir de `public/images`. Il utilise exclusivement les API natives authentifiées de téléversement, d’édition et de publication, puis compare l’empreinte de chaque image lue dans R2 à celle du fichier local. Il demande un fichier de session issu d’une connexion réelle à l’administration ; il ne crée pas d’utilisateur ou de session et n’écrit pas directement dans la base.

```sh
# Le serveur local doit tourner et l’administration doit avoir été initialisée.
# Ce fichier contient une session privée et doit rester ignoré par Git.
EMDASH_AUTH_FILE=.wrangler/cms-sync-session.json node scripts/import-local-media.mjs
EMDASH_AUTH_FILE=.wrangler/cms-sync-session.json node scripts/import-local-media.mjs --apply
```

Sans `--apply`, le script affiche les changements envisagés. Il conserve une entrée si ses textes diffèrent du seed ou si elle possède des modifications non publiées. Il conserve aussi toute image remplacée par l’éditeur. Les références initiales absentes ou dont les octets manquent sont importées, enregistrées avec contrôle de révision `_rev`, puis publiées si l’entrée était déjà publique. Le rapport local `.wrangler/media-import-report.json` ne contient aucun identifiant de session.

Cet import ne s’exécute pas automatiquement en production. Après les changements éditoriaux, la médiathèque et l’éditeur EmDash constituent le chemin normal de mise à jour.

## Migration 0001 : une seule rubrique pour le Journal

Le champ texte initial `posts.category` est remplacé par la taxonomie native déjà présente. Les cinq articles conservent leurs affectations ; le titre de rubrique affiché vient de `entry.data.terms.category[].label`. Les nouvelles installations n’ont pas le champ en double.

Pour la base locale déjà initialisée, utiliser le script versionné avec une vraie session d’administration :

```sh
EMDASH_AUTH_FILE=.wrangler/cms-sync-session.json node scripts/migrations/0001-native-journal-category.mjs
EMDASH_AUTH_FILE=.wrangler/cms-sync-session.json node scripts/migrations/0001-native-journal-category.mjs --apply
```

Le script vérifie d’abord le type du champ, l’absence de brouillon en attente, la présence des cinq articles initiaux et l’existence d’un terme natif identique à chaque ancien libellé. Il s’arrête si le site s’écarte de cet état initial. Il enregistre une copie du champ et des valeurs dans `.wrangler/migrations`, puis appelle uniquement `DELETE /_emdash/api/schema/collections/posts/fields/category`. Il ne modifie ni les termes ni leurs affectations. Après suppression, il vérifie les identifiants et libellés des termes avant/après. Une seconde exécution indique que la migration est déjà appliquée.

La suppression passe par le registre EmDash, qui traite le schéma et ses caches. Régénérer ensuite les types EmDash et exécuter la vérification du projet. La sauvegarde de migration contient les informations nécessaires à une restauration éventuelle du champ par l’API de schéma ; ne pas réappliquer un seed complet pour annuler cette seule évolution.


## Migration 0002 : bouton des collections

`site_content.discover_label` est un champ texte obligatoire dont la valeur initiale est « Découvrir ». Il est distinct de `read_article_label`, utilisé par les cartes du Journal. Les nouvelles installations reçoivent directement les deux champs.

```sh
EMDASH_AUTH_FILE=.wrangler/cms-sync-session.json node scripts/migrations/0002-collection-discover-label.mjs --apply
```

Le script crée le champ par l’API de schéma uniquement s’il est absent. Il lit ensuite la configuration globale actuelle, conserve les autres valeurs et un éventuel libellé personnalisé, puis initialise le bouton manquant avec contrôle `_rev`. Une configuration déjà publiée est publiée à nouveau. Le script refuse de publier des brouillons antérieurs à la migration et vérifie ensuite que les autres champs n’ont pas changé. Le cliché de migration contient uniquement le champ concerné, sans les coordonnées du site. Une deuxième exécution conserve le libellé existant.

## Migration 0005 : coordonnées du showroom et carte à la demande

Le contrat [content/showroom-location.json](../content/showroom-location.json) contient les informations publiques fournies et approuvées par le propriétaire à partir de [sa capture du magasin](https://i.imgur.com/6swwYhA.png) et de son iframe Google Maps :

| Information | Valeur fournie |
| --- | --- |
| Adresse | 8–10 Avenue Mohamed Sijilmassi, Casablanca 20250, Maroc |
| Téléphone | +212 7 71 10 54 90 (`tel:+212771105490`) |
| Lundi | 12 h–19 h 30 |
| Mardi–samedi | 9 h–19 h 30 |
| Dimanche | Fermé |

Les heures sont locales à Casablanca. Cette source ne confirme ni email commercial ni WhatsApp ; aucun de ces champs n’est rempli par déduction. Les coordonnées sont volontairement absentes du seed générique ; le JSON est un contrat de migration versionné, jamais une source de secours du rendu.

`scripts/migrations/0005-showroom-location.mjs` ajoute les champs facultatifs `map_embed_url` et `map_note` si nécessaire, puis renseigne les coordonnées et les deux liens Google dans l’entrée globale. Il corrige uniquement la destination initiale du bouton « Contacter le showroom » de la section `visit`, vers `#showroom-contact`. Il conserve les autres textes, références, médias et paramètres. La migration exige une session native valide, produit un aperçu sans écriture par défaut, sauvegarde les valeurs avant application et vérifie les révisions. Elle refuse un brouillon en attente ou un état éditorial qui diffère de l’état vide attendu et du résultat déjà appliqué ; elle ne remplit donc pas de nouveau un champ effacé après l’import.

La migration 0005 accompagnait initialement le plan illustratif SVG de l’accueil. Cette étape est remplacée par la géographie réelle décrite dans la migration 0006 ci-dessous. `map_url` conserve son rôle de lien d’itinéraire vers le lieu Google identifié ; les coordonnées de cadrage présentes dans le code d’intégration ne sont pas les coordonnées du repère du magasin.

Sur la page showroom, `map_embed_url` accepte uniquement l’URL HTTPS de `www.google.com/maps/embed` avec un seul paramètre `pb`. Une balise iframe, un autre domaine, des identifiants, un fragment ou des paramètres supplémentaires sont refusés au rendu. Le bouton « Afficher la carte interactive » insère l’iframe après activation ; aucun appel à Google Maps n’est effectué avant cette action. La fermeture retire l’iframe. Sans JavaScript, le lien d’itinéraire reste disponible et le bouton interactif est masqué. Les requêtes Google Fonts déjà utilisées par le site sont indépendantes de ce comportement.

Le cadre et les commandes suivent les couleurs du site ; la carte Google conserve son propre affichage et ses mentions d’attribution. Cette option de la page showroom est distincte de la carte géographique personnalisée de l’accueil : le style de cette dernière ne provient pas de l’iframe. Effacer `map_embed_url` supprime le bouton de carte, sans supprimer le lien `map_url`. Effacer les deux retire les deux actions.

L’aperçu signé de `site_content/global` conserve l’accueil complet et ajoute ensuite une section « Carte du showroom » avec les valeurs du brouillon. Elle permet de contrôler ce champ qui apparaît normalement sur une autre page. Aucun iframe n’est ajouté à l’accueil public. Si seul l’itinéraire reste renseigné, cette section d’aperçu affiche seulement son lien ; si les deux champs sont vides, elle disparaît.

Les tests `tests/showroom-location-cms.mjs` couvrent ce cycle éditorial sur une base jetable, tandis que `tests/showroom-browser.mjs` contrôle anonymement le rendu publié en lecture seule. Voir [les résultats historiques de cette première étape](test-results-showroom.md) ; ils ne valident pas la géographie ajoutée ci-dessous.

## Migration 0006 : géographie réelle de Casablanca et position du showroom

La carte de l’accueil utilise désormais des rues, quartiers et tracés côtiers issus de données OpenStreetMap locales, en conservant la palette claire/sombre, les traits fins et le repère rouge animé de la version B. L’ancien tracé décoratif est remplacé. La carte couvre une zone de Casablanca ; les déplacements restent bornés à cette couverture et ne permettent pas de parcourir le monde entier.

Les données géographiques sont versionnées séparément du contenu éditorial. L’affichage SVG ne dépend pas d’un appel externe à un service cartographique lors de la visite. Un lien visible crédite OpenStreetMap et propose le jeu de données sous ODbL à `/cartographie/casablanca.json`. Cette attribution est indépendante de `map_note` et reste présente lorsque l’éditeur efface sa légende. Voir [les sources et modalités de mise à jour](geographic-map.md).

`site_content.showroom_latitude` et `showroom_longitude` sont deux champs numériques natifs, facultatifs, sans valeur de repli. Ils pilotent le repère dans les deux compositions de l’accueil ; les coordonnées invalides, incomplètes ou situées hors de la couverture du jeu local masquent le repère. La carte et le lien d’itinéraire restent disponibles. Le brouillon de configuration globale montre les nouvelles coordonnées dans son aperçu signé ; le public conserve les valeurs publiées jusqu’à la publication.

Le contrat [content/showroom-geography.json](../content/showroom-geography.json) retient le repère du lieu Google identifié : latitude `33.5927007`, longitude `-7.6426741`. Il distingue explicitement cette position du centre de cadrage de l’iframe fourni. `scripts/migrations/0006-geographic-showroom-map.mjs` ajoute uniquement les deux champs absents et modifie uniquement leurs valeurs et la légende `map_note` initiale. Le libellé administratif historique de `map_note` reste conservé ; vider sa valeur masque la légende au lieu de réintroduire une mention de plan illustratif.

Comme la migration 0005, cette évolution utilise une session native existante, une sauvegarde privée avant écriture et les contrôles de révision. Elle exige l’état exact attendu après la migration 0005, refuse les brouillons ou modifications éditoriales concurrents, conserve les autres champs et références et devient sans changement lorsqu’elle est déjà appliquée. Elle ne modifie ni les liens Google, ni l’authentification, ni les contacts du catalogue et ne réinitialise pas le site.

Les commandes de la carte permettent un zoom de 1 à 6 et un recentrage. Le glissement à la souris ou au toucher exige d’activer le bouton de déplacement ; le défilement normal de la page reste disponible par défaut et la molette n’est pas interceptée. Lorsque la carte a le focus, les flèches déplacent la vue, `+`/`−` règlent le zoom et `Début` rétablit le cadrage. `Échap` quitte le déplacement. Sans JavaScript, la carte géographique, le repère valide, l’attribution et l’itinéraire restent lisibles ; les commandes sont masquées.

`tests/geographic-showroom-cms.mjs` vérifie le cycle natif et les protections de la migration dans une base jetable uniquement. Les tests de projection et de migration font partie de `npm test`. `tests/geographic-map-browser.mjs` contrôle le rendu public en lecture seule. Les preuves et leurs limites sont consignées dans le [rapport de carte géographique](test-results-geographic-map.md), distinct du rapport historique de la première intégration Google Maps.
