# Modèle éditorial et synchronisation EmDash

Version initiale : EmDash **0.41.0**, français uniquement. `seed/seed.json` initialise un site vide avec les textes préparés dans la proposition éditoriale du 26 septembre 2026. Le rendu public interroge EmDash ; le fichier de seed n’est pas une source de secours du site.

La configuration Astro déclare explicitement `defaultLocale: 'fr'` et `locales: ['fr']`, en accord avec le seed. EmDash utilise cette configuration pour les menus, les taxonomies et les nouveaux contenus. Les URL restent sans préfixe de langue, y compris l’administration ; aucune seconde langue n’est activée. Voir la [configuration native des langues](https://docs.emdashcms.com/guides/internationalization/).

## Collections et chemins

| Collection | Entrées initiales | Chemins publics | Contenu |
| --- | ---: | --- | --- |
| `pages` | 11 | `/`, `/collections/`, `/showroom-casablanca/`, `/catalogue/`, `/journal/`, `/sur-mesure/`, `/professionnels/`, `/a-propos/`, `/votre-projet/`, `/faq/`, `/mentions-legales/` | Titre, introduction, images et sections éditoriales |
| `families` | 8 | `/collections/{slug}/` | Présentation courte, texte enrichi, sélection de modèles, article associé |
| `models` | 20 | `/modeles/{slug}/` et cartes des familles | Fiche du modèle exact, galerie, dimensions, plans, finitions et PDF technique public |
| `posts` | 5 | `/journal/{slug}/` | Articles complets en Portable Text, extrait, image, rubrique, sources, CTA |
| `catalogues` | 1 | Formulaire et téléchargement | Édition, couverture, mention de démonstration, référence du PDF privé |
| `site_content` | 1 | Partagé sur tout le site | Logos, contacts, coordonnées, boutons, pied de page, textes du formulaire et catalogue actif |

Les clés stables des pages sont `home`, `collections`, `showroom`, `catalogue`, `journal`, `sur-mesure`, `professionnels`, `a-propos`, `votre-projet`, `faq`, `mentions-legales`. Leurs slugs sont respectivement `home`, `collections`, `showroom-casablanca`, `catalogue`, `journal`, `sur-mesure`, `professionnels`, `a-propos`, `votre-projet`, `faq`, `mentions-legales`. Le rendu résout l’accueil à `/` et traite `/home/` comme son alias. Une prévisualisation signée doit conserver son contexte EmDash lorsqu’elle résout cette route.

Les familles sont `tables`, `chaises-tabourets`, `canapes-fauteuils`, `buffets-bibliotheques`, `luminaires`, `mobilier-exterieur`, `tables-basses`, `consoles-miroirs`.

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
| `families.short_title`, `card_text`, `image`, `sort_order` | Cartes de l’accueil et des collections | Titre obligatoire, image facultative | Le rail calcule sa longueur sur le nombre de familles, sans nombre fixé en CSS |
| `families.content` | Page de famille | Masquer le corps vide | L’éditeur Portable Text pilote les paragraphes |
| `families.models` | Cartes de modèles | Masquer la sélection | Respecter l’ordre de la relation enregistré par l’éditeur |
| `families.related_post` | Article associé | Masquer le lien | Un article en brouillon ne fuit pas sur le site public |
| `models.image` | Photographie du modèle exact, carte et tête de fiche | Carte/fiche sans photographie | Ne pas affecter une photo d’ambiance à un modèle non identifié |
| `posts.title`, `excerpt`, `image`, taxonomie `category` | Listes et cartes Journal | Titre/extrait obligatoires, image facultative | Les modifications se propagent à l’accueil, à la liste et à l’article |
| `posts.content` | Article | Contenu obligatoire | Les cinq articles possèdent leurs sections et paragraphes complets |
| `posts.cta_*` | Fin d’article | Masquer le bouton incomplet | Vérifier destination locale et invitation |
| `site_content.logo_light`, `logo_dark` | En-tête et pied de page | Utiliser le logo natif s’il existe, puis le nom du site | Vérifier les deux apparences et la navigation mobile |
| `site_content.brand_location` | Libellé sous le logo des pieds de page et couverture décorative du catalogue ; l’en-tête n’affiche que le logo | Masquer la ligne ; aucun repli sur la ville du showroom | Champ facultatif initialisé à « Maroc » ; modification et effacement suivent le brouillon et la publication natifs |
| `site_content.city` | Ville dans les informations pratiques du showroom et le contact du pied de page intérieur | Aucun libellé de marque de secours | Reste indépendant de `brand_location` ; retirer Casablanca du logo ne modifie pas la localisation du magasin |
| `site_content.address`, `hours`, `contact_phone`, `map_url` | Informations pratiques de la page showroom et des pieds de page ; lien d’itinéraire des cartes | Masquer chaque donnée absente ; téléphone en lien `tel:` | Seed vide ; coordonnées approuvées fournies par la migration 0005 |
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
| `pages.sections` | Les quatre pages intérieures affichent chaque section, son texte, son image et son bouton. Les questions `faq_*` du showroom restent des accordéons et conservent leurs images et boutons ; une réponse sans titre apparaît comme bloc ordinaire, une entrée vide est omise. Les sections du catalogue apparaissent après le formulaire lorsqu’elles sont renseignées. La migration 0010 a retiré l’ancienne invitation générique. |
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

Le magasin présenté se situe uniquement à Casablanca. La révision showroom 0009 retire la liste de villes de projets et la FAQ sur la livraison, qui ne documentaient aucun service confirmé. Le site ne promet aucun stock, exposition, délai ou service non confirmé. Les modèles Outdoor présentés sont explicitement limités aux espaces extérieurs couverts.

Le propriétaire a fourni et approuvé l’adresse, le téléphone et les horaires consignés dans `content/showroom-location.json` ; les horaires sont ceux de Casablanca (`Africa/Casablanca`). L’email public, l’usage de WhatsApp, les services et zones de livraison, les droits d’utilisation des photographies, le PDF définitif et les mentions juridiques restent à confirmer. La photographie de l’entrée actuellement affichée a été fournie par le propriétaire le 29 septembre ; elle remplace celle issue de l’article et ne valide pas les autres photos d’ambiance. Les sources officielles de la proposition initiale sont consignées dans `seed/sources.json`. L'enrichissement des onze modèles est documenté dans [Fiches modèles](model-pages.md), avec le contrat de chaque nouveau champ et sa migration ciblée. La prévisualisation est prévue pour la validation du design et du fonctionnement avec des contenus provisoires.

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

Les commandes de la carte partent d’un zoom relatif de 1 et permettent de se rapprocher jusqu’à 16. Le dézoom minimal est calculé selon la couverture géographique et les proportions de l’écran : le bouton `−` est actif dès le cadrage initial lorsque les données permettent une vue plus large. Les boutons suivent la partie visible de la carte sous l’en-tête fixe pendant le défilement. Le glissement à la souris ou au toucher exige d’activer le bouton de déplacement. Sur ordinateur, les deux doigts du trackpad déplacent directement la carte sous le pointeur ; le pincement règle le zoom autour de celui-ci, y compris via les gestes Safari. La molette déplace la carte et Ctrl + molette la zoome. Le défilement de la page reste disponible hors de la carte et lorsque la limite géographique empêche tout déplacement supplémentaire. Les gestes tactiles de page restent natifs. Lorsque la carte a le focus, les flèches déplacent la vue, `+`/`−` règlent le zoom et `Début` rétablit le cadrage initial. `Échap` quitte le déplacement par glissement.

Les noms de rues proviennent du même extrait OSM : 1 113 segments nommés, pour 605 noms distincts. Une seule métadonnée SVG transmet 1 223 candidats d’affichage, soit 121 198 octets ; les longs axes et la rue du showroom proposent des positions alternatives situées sur leur tracé réel lorsque leur milieu est masqué ou hors cadre. Aucun nouveau champ CMS ni nouvel appel cartographique n’est nécessaire. Le sélecteur affiche les noms qui tiennent à l’échelle réelle de l’écran, dès la vue initiale lorsque possible, puis davantage de petites rues en se rapprochant. Il conserve une seule occurrence d’un nom, donne la priorité à la rue du showroom et aux grands axes, et évite les chevauchements avec les autres libellés et les éléments de l’interface. Les caractères restent à 13 px ; la limite est de 15 noms pour une carte de moins de 700 px de large, sinon 30. Tous les noms ne sont donc pas visibles simultanément. Ils ne sont pas modifiables dans EmDash : une correction de rue relève de la source géographique et de sa régénération, décrites dans [le guide cartographique](geographic-map.md).

Sans JavaScript, la carte géographique, les huit libellés de grands axes de repli, le repère valide, l’attribution et l’itinéraire restent lisibles ; les commandes sont masquées. Ces améliorations de navigation et de lisibilité ne changent pas le jeu géographique, l’adresse éditoriale, les coordonnées ou les autres contenus publiés dans le CMS.

`tests/geographic-showroom-cms.mjs` vérifie le cycle natif et les protections de la migration dans une base jetable uniquement. Les tests de projection et de migration font partie de `npm test`. `tests/geographic-map-browser.mjs` contrôle le rendu public en lecture seule. Les preuves et leurs limites sont consignées dans le [rapport de carte géographique](test-results-geographic-map.md), distinct du rapport historique de la première intégration Google Maps.

## Migration 0009 : photographies et présentation du showroom

Le contrat [content/showroom-refresh.json](../content/showroom-refresh.json) et les textes de [content/showroom-editorial-copy.json](../content/showroom-editorial-copy.json) décrivent la révision approuvée des pages `home` et `showroom-casablanca`. Ils servent à une migration ciblée par les API natives ; aucun fichier de contenu n’est lu comme remplacement par le frontend, et le seed n’est pas réappliqué.

La paire de photographies officielles de Skorpio, déjà présente dans la galerie du modèle, alimente `home.brand_image` et `home.brand_detail_image`. La migration réutilise leurs références sans modifier la fiche du modèle. Une photographie réelle du showroom, issue de l’[article Maisons du Maroc fourni par le propriétaire](https://maisonsdumaroc.com/architectures-et-design/cattelan-italia-ouvre-son-premier-flagship-store-au-maroc), est importée une seule fois et partagée entre `home.showroom_image` et `showroom-casablanca.hero_image`. Les anciens médias sont conservés. Les légendes de ces trois références identifient leur sujet ; les autres images ne sont pas requalifiées automatiquement.

La section `home.sections.showroom` contient un titre, un paragraphe et un bouton vers la page showroom. `showroom_invitation` est vide pour éviter de répéter cette invitation. Les coordonnées restent dans `site_content/global` et sont accessibles dans les pieds de page et sur la page dédiée ; la carte conserve son lien d’itinéraire. Le téléphone approuvé par le propriétaire reste inchangé, même si l’article de presse indique un autre numéro.

La page dédiée explique la découverte sur place et le conseil, puis aide à préparer la visite. Ses quatre sections sont `advice`, `visit`, `faq_1` et `faq_2`. Les deux questions concernent les modèles exposés et la demande de prix/délai. La section `cities`, la question redondante sur la préparation et celle sur la livraison sont retirées. Ce texte ne transforme pas les exemples du site en inventaire du showroom et n’ajoute aucune promesse de service.

Les champs éditoriaux `seo_title` et `meta_description` de cette page reçoivent les valeurs approuvées. Le panneau SEO natif, vide dans l’état de départ, reste inchangé : ses futures valeurs continueront d’avoir priorité selon le contrat général. Les métadonnées éditoriales suivent ainsi la publication du contenu ; cette migration n’écrit pas de réglage SEO natif immédiat.

La migration refuse un brouillon en attente ou un écart avec l’état exact attendu, contrôle les octets des images et sauvegarde avant toute écriture. Elle conserve les autres pages, familles, modèles, articles, coordonnées et fichiers existants. Les résultats effectifs de publication, de conservation et d’affichage sont consignés séparément dans le [rapport de révision du showroom](test-results-showroom-refresh.md) ; la description du contrat ne constitue pas à elle seule une preuve de validation. Les autres photos d’ambiance et le PDF de démonstration restent à remplacer ou confirmer.

## Migration 0010 — révision éditoriale complète

Le réaudit est appliqué par `scripts/migrations/0010-editorial-refresh.mjs` et les quatre manifestes `content/editorial-refresh-*.json`. Ils décrivent les valeurs initiales et finales exactes de 28 entrées (5 pages, 6 familles, 11 modèles, 5 articles, configuration globale), six couples titre/description SEO natifs et le seul libellé Catalogue du menu primaire. Le catalogue lui-même, ses fichiers et ses médias restent intacts. Le frontend ne lit jamais ces manifestes.

La migration refuse les brouillons, états partiels, textes modifiés ou effacés, et les changements concurrents de révision, schéma, SEO et références. Elle sauvegarde son plan avant toute écriture, emploie les PUT partiels et publications natives, conserve les champs non ciblés, et ne fait aucune réinitialisation. Une seconde exécution complète ne change rien. Les publications se font une par une ; le SEO natif reste immédiat. Le menu natif ne fournit pas de verrou de révision : une relecture complète précède la modification de son libellé et une comparaison complète la suit.

Sur le showroom, `section_key: contact_note` place une section auprès des coordonnées, après le téléphone et avant la carte. Tous ses champs usuels (titre, texte, image, CTA) fonctionnent. Les autres sections gardent leur emplacement ; les `faq_*` restent des questions si elles sont renseignées. Retirer `contact_note` la masque sans texte de secours. La révision retire les anciens blocs de préparation et les deux FAQ, réunis dans une note courte.

Le menu indique Catalogue. Le bouton global indique Télécharger le catalogue ; le formulaire affiche un lien après enregistrement et ne promet aucun e-mail. Messages nom/e-mail et indisponibilité restent éditables. Pour les codes serveur qui exigent une action particulière (limitation, rechargement, conflit ou origine), la consigne de récupération native est affichée ; les autres échecs utilisent le texte générique CMS. Un lien réel mène aux coordonnées. Le consentement marketing reste séparé, facultatif et non coché. Le succès annonce la validité de 15 minutes du lien, conformément au plugin.

Sur la page catalogue, une description identique exactement à la notice de démonstration n’est montrée qu’une fois. Une description différente continue d’apparaître. Aucun autre paragraphe éditorial n’est masqué par détection de mots. Les champs facultatifs vides restent vides.

Les fiches modèles conservent leurs nuanciers natifs ; une présentation française des catégories connues et des codes sans répétition améliore la lecture. Seule la faute connue « GFM71 gaufré balnc » est corrigée au rendu. Les valeurs inconnues, abréviations de plans, médias et dimensions restent intacts. Voir le [rapport et les captures](test-results-editorial-refresh.md).

## Photographie de l’entrée fournie par le propriétaire — 29 septembre 2026

Le fichier `AMIN2589.jpg` fourni par le propriétaire remplace la photo du salon issue de la presse. [Le relevé du fichier](../content/showroom-owner-photo.json) décrit son empreinte, ses dimensions et les deux champs concernés : `pages/home.showroom_image` et `pages/showroom-casablanca.hero_image`. Il sert de preuve de provenance et n’est pas lu comme contenu de remplacement par le frontend. L’URL de partage et les sauvegardes restent dans le dossier local privé ; la photo est servie depuis EmDash.

Une seule image est importée, puis les deux pages sont publiées avec leurs révisions courantes. Aucun autre champ, texte, réglage SEO, relation ou fichier existant n’est remplacé. L’ancien média reste disponible dans EmDash. Le texte alternatif décrit l’entrée et l’enseigne du showroom à Casablanca.

Les images du showroom dont les dimensions indiquent un format portrait sont cadrées en haut. Sur l’accueil, le zoom conserve aussi une origine haute pour éviter de couper l’enseigne ; les dimensions des cadres et la progression des animations sont conservées. Les images paysage gardent leur cadrage précédent. Ce réglage de présentation s’applique à l’image choisie dans le CMS, sans dépendre de son identifiant. Voir [les captures et vérifications](test-results-showroom-photo.md).

## Révision SEO 0011 : présentation et métadonnées

Le [manifeste ciblé](../content/seo-editorial-2026-09-29.json) reprend 27 entrées existantes et six couples titre/description du panneau SEO. Il conserve leurs références, dates, catégories et champs non ciblés. Douze textes alternatifs sont modifiés dans les références d'images des contenus, sans modifier le fichier ni la fiche de médiathèque. La procédure `scripts/migrations/0011-seo-editorial.mjs` utilise l'autorisation CLI native du CMS Cloudflare exact ; elle sauvegarde, refuse les brouillons et écarts, publie séquentiellement et devient sans effet après réussite. La navigation n'est pas modifiée. Les [choix éditoriaux et leurs sources](seo-editorial-2026-09-29.md) distinguent faits établis et services restant à confirmer.

Les rendus WebP sont calculés depuis l'image EmDash courante, sans découpe ni agrandissement de l'original. Le cadre CSS conserve son recadrage ; `sizes` tient compte du format de la photo pour éviter de sous-dimensionner les images qui le remplissent. Changer ou effacer l'image dans EmDash change ou retire aussi ses variantes. Les images externes, sans dimensions connues, SVG et GIF restent sur leur URL d'origine. Plans et nuanciers ne passent pas par ces variantes. Aucun fichier optimisé n'est importé à la place du média original.

Le balisage `FurnitureStore` de l'accueil et du showroom reprend le nom, les coordonnées, les horaires reconnus, la carte et la photographie publiés. Un format d'horaires libre non reconnu reste visible, sans horaires structurés devinés. Les fiches modèles fournissent un `Product` descriptif (images et dimensions), sans prix, stock, avis ou marque fabricant inventés. Les articles fournissent un seul `BlogPosting`, avec leur titre visible et un auteur `Organization` lorsque la signature correspond au nom du site. Les pages intérieures fournissent un `BreadcrumbList` ; la hiérarchie visible des modèles est conservée.

Les champs SEO natifs restent prioritaires. Les images de partage deviennent absolues ; à défaut d'image de page ou de réglage global, la liste Journal emploie le logo existant. Une icône native configurée est prioritaire sur le repli vers ce même logo. Les contenus structurés suivent le cycle brouillon/aperçu signé/publication du texte et des réglages communs. L'aperçu des réglages communs décrit la page d'accueil réellement rendue, avec les valeurs globales de cet aperçu. Effacer une valeur ne rétablit pas une ancienne coordonnée.

L'indexation reste désactivée sur la préproduction. Le catalogue de démonstration, la confidentialité provisoire et les éléments nécessaires au lancement commercial restent explicitement signalés.

Les 27 publications 0011 ont été vérifiées dans la copie Cloudflare le 29 septembre 2026. Les tests d'effacement et de publication décrits ci-dessus ont été exécutés sur une base jetable distincte. Les contrôles publics de métadonnées, de présentation Chromium/WebKit et d'interaction ont réussi après optimisation des lectures SEO. La dernière version, partageant aussi les lectures du formulaire catalogue, passe le contrôle des 28 routes et huit cas de rendu du formulaire, sans nouvelle réponse 503 dans ces suites. Le [rapport de réalisation](test-results-seo-refresh.md) conserve les preuves des erreurs 1102 observées auparavant et distingue ces résultats de la capacité d'hébergement restant à confirmer avant lancement définitif. Aucun champ inverse de relation n'a été ajouté aux modèles.

## En-tête, trois actions et services des fiches modèles — 1er octobre 2026

Cette étape applique le début du plan de changements du site. Elle modifie uniquement les gabarits : aucun contenu EmDash, schéma ou menu n’est migré.

L’en-tête de l’accueil et des pages intérieures affiche le logo seul, relié à l’accueil. Le menu reste le menu natif `primary`, mais son entrée `/catalogue/` en est sortie : elle devient le lien texte « Catalogue », placé avant l’icône WhatsApp et le bouton « Prendre rendez-vous ». Les entrées Sur-mesure et Professionnels du plan s’ajoutent dans l’administration lorsque leurs pages existent. Jusqu’à 1 240 px de large, le menu passe dans son panneau ; le lien Catalogue et le bouton restent dans la barre. Sous 820 px, ils rejoignent le panneau et seule l’icône WhatsApp reste dans la barre.

Les trois actions sont définies dans `src/lib/actions.ts`, dans l’ordre d’importance du plan : « Prendre rendez-vous » (`/showroom-casablanca/#rendez-vous`), « Échanger avec un conseiller » (WhatsApp) et « Recevoir le catalogue » (`/catalogue/`). Ce ne sont pas des champs CMS. Dans un groupe, la première action est un bouton plein, la deuxième un bouton à contour, la troisième un lien texte.

`site_content.whatsapp_url` reste le lien de conversation, sans message. Chaque page y ajoute le texte prérempli du plan : le message général, ou, sur une fiche, le nom du modèle suivi de l’adresse de la page, calculée avec l’origine canonique du site. Un lien vide ou qui n’est pas un lien WhatsApp HTTPS masque cette action ; aucun lien n’est déduit du téléphone.

| Page | Actions |
| --- | --- |
| En-tête | Catalogue, icône WhatsApp, Prendre rendez-vous |
| Accueil, scène d’ouverture | Prendre rendez-vous, Recevoir le catalogue |
| Collections, fin de page | Prendre rendez-vous, Recevoir le catalogue |
| Familles, fin de page | Prendre rendez-vous, Échanger avec un conseiller |
| Fiches modèles, sous la présentation et en fin de page | Prendre rendez-vous, Être conseillé sur [modèle] |
| Showroom, section `#rendez-vous` en fin de page | Échanger avec un conseiller, Recevoir le catalogue |

La section `#rendez-vous` accueillera le formulaire de rendez-vous ; elle indique pour l’instant « Visite libre ou sur rendez-vous ». Sous leur titre, les fiches modèles affichent les quatre conditions communes au catalogue issues de la FAQ du projet (Personnalisation, Livraison) : personnalisable, délai de 10 à 12 semaines, livraison partout au Maroc et offerte à Casablanca, installation incluse. Ce bloc est écrit dans le gabarit et s’applique à toutes les fiches.

`contact_label` et `catalogue_label` ne pilotent plus ces boutons. Ils restent utilisés par le pied de page, la page showroom et le formulaire catalogue, qui conservent leurs liens actuels jusqu’aux étapes suivantes du plan, comme les fins d’articles du Journal.

## Migration 0014 : Sur-mesure, Professionnels, pied de page et pièces exposées

Le [manifeste](../content/site-strategy-pages.json) décrit deux nouvelles pages, rédigées à partir des faits que le plan attribue à la FAQ du projet. `/sur-mesure/` présente ce qui se personnalise (dimensions, essences de bois, céramiques, marbres, métaux, tissus, cuirs), les échantillons au showroom, l’absence de délai supplémentaire et l’article sur les finitions. `/professionnels/` présente les projets accompagnés (appartements, villas, bureaux de direction, hôtels, restaurants, boutiques), le catalogue et ses échantillons, les documents techniques et le suivi jusqu’à l’installation. Leur fin de page propose les actions du site ; sur Professionnels, le message WhatsApp prérempli est celui du plan pour les projets professionnels.

Deux points restent à confirmer avant la mise en ligne : la disponibilité des fichiers 2D/3D auprès du compte revendeur, et le formulaire de demande professionnelle, qui attend le choix du CRM. Les deux pages restent entièrement éditables dans EmDash ; leurs sections suivent le contrat général des `pages.sections`.

`scripts/migrations/0014-site-strategy-pages.mjs` ajoute, uniquement s’ils manquent : les clés `sur-mesure` et `professionnels` de `pages.route_key`, le champ booléen facultatif `models.on_display`, les deux pages publiées, et les entrées Sur-mesure (après Collections) et Professionnels (après Showroom) du menu `primary`. Une page ou une entrée de menu déjà présente n’est jamais remplacée. Sans `--apply`, le script affiche seulement son plan ; avec `--apply`, il enregistre d’abord une sauvegarde privée sous `.wrangler/migrations/`. Une seconde exécution ne change rien.

```sh
# Copie locale jetable
EMDASH_BASE_URL=http://localhost:4331 EMDASH_AUTH_FILE=.wrangler/cms-sync-session.json node scripts/migrations/0014-site-strategy-pages.mjs
# CMS Cloudflare, après connexion de la CLI EmDash native à cette origine
EMDASH_BASE_URL=https://cattelan-maroc-preview.cattelan.workers.dev node scripts/migrations/0014-site-strategy-pages.mjs --apply
```

Appliquer la migration en même temps que le déploiement du code : avant elle, les deux routes répondent 404 et le pied de page pointe vers Professionnels. Le seed contient directement ces pages, ce menu et ce champ pour les nouvelles installations.

Quand `models.on_display` est coché, la fiche affiche « Exposé au showroom de Casablanca » sous le titre. Le champ est vide par défaut : ne le cocher qu’après confirmation de la liste des pièces exposées.

Le pied de page reprend le nom, l’adresse et les horaires de `site_content`, ajoute « Service voiturier », le téléphone, l’e-mail public s’il est renseigné et l’action « Échanger avec un conseiller ». Ses liens d’information sont Professionnels et Confidentialité ; À propos, Votre projet, FAQ et Mentions légales s’ajouteront avec leurs pages. Un lien déjà présent dans le menu n’est pas répété. La mention de version de travail reste jusqu’au lancement.

## Migration 0015 : À propos, Votre projet, FAQ et Mentions légales

Le [manifeste](../content/site-information-pages.json) reprend la FAQ du projet (19 questions en 7 groupes, condensées selon les règles de ton du plan), la règle d’annulation du questionnaire de lancement, le profil de la marque et l’éditeur Racha Home confirmé par le propriétaire. La FAQ n’écrit pas « représentant officiel » tant que l’autorisation écrite de la marque n’est pas signée. Les mentions légales signalent « à compléter » pour la forme juridique, le capital, le RC, l’ICE et le directeur de la publication ; ces textes se modifient ensuite dans EmDash.

Sur la page FAQ, une section `group` ouvre un groupe et chaque section `faq_*` est une question en accordéon (titre = question, texte = réponse). Les mêmes sections alimentent le balisage `FAQPage`. L’accueil ajoute un balisage `Organization`, et le magasin indique le Maroc comme zone desservie. `/llms.txt` résume le showroom à partir de `site_content`, les services et la commande d’après la FAQ, et liste les pages principales ; il reste `noindex` tant que `SITE_INDEXABLE` est faux.

`scripts/migrations/0015-site-information-pages.mjs` s’exécute comme la 0014 (aperçu par défaut, `--apply`, sauvegarde privée, sans effet à la seconde exécution). Il ajoute les quatre clés de route et les quatre pages, porte la limite des sections de page de 20 à 40 (la FAQ en compte 26), puis met à jour, uniquement depuis leur valeur attendue : l’adresse au format du plan (« 8-10 avenue du Docteur Mohamed Sijilmassi, Triangle d’Or, 20250 Casablanca, Maroc »), le téléphone « +212 771 105 490 », l’e-mail public contact@cattelanitalia.ma et le paragraphe de livraison du showroom, qui reprend désormais les conditions de la FAQ. Une valeur déjà modifiée par un éditeur est conservée et signalée. Appliquer la 0014 avant la 0015.

Le pied de page relie À propos, Votre projet, Professionnels, FAQ, Confidentialité et Mentions légales. Les logos officiels rouge et blanc fournis par le propriétaire remplacent les fichiers de `public/images` utilisés par l’import local ; sur le site en ligne, les logos se changent dans **Configuration du site**.

## Migration 0016 : Tables basses, Consoles & miroirs

`scripts/migrations/0016-new-families.mjs` s’exécute comme la 0014 (aperçu par défaut, `--apply`, sauvegarde privée, sans effet à la seconde exécution). À partir de `content/new-families.json`, il téléverse les photos de `content/media/new-families` par l’API média native, crée et publie neuf modèles (Arena, Albert Keramik, Adrian Wood, Dodo, Westin, Nettuno, Rado Keramik, Cosmos, Glenn), avec leurs dimensions, finitions, dessin et fiche produit en PDF, puis les familles `tables-basses` (ordre 7) et `consoles-miroirs` (ordre 8) avec leur sélection. Une entrée qui existe déjà est conservée telle quelle et reste liée à sa famille.

Les photos viennent des kits numériques Cattelan Italia ; le propriétaire a retiré les logos. Elles ont été agrandies ×2 avec Real-ESRNet, un modèle qui n’invente pas de texture (Real-ESRGAN ajoutait un quadrillage sur le bronze brossé). Les textes ne décrivent que ce que montrent les photos.

Descriptions, dimensions et finitions viennent des fiches produit Cattelan Italia fournies par le propriétaire ; les nuanciers (×4) et les photos des fiches (×2) sont agrandis de la même façon. Seules les photos principales et les bannières de famille sont agrandies : les autres photos de galerie restent à leur taille d’origine. Restent à compléter : le lien vers la fiche officielle et l’année. Rado Keramik n’a que la photo de sa fiche ; Dodo et Cosmos gagneraient à avoir davantage de photos.

## Migration 0017 : récépissé CNDP et mention sous les formulaires

`scripts/migrations/0017-cndp-receipt.mjs` (aperçu par défaut, `--apply`, sans effet à la seconde exécution) ajoute à Configuration du site le champ texte facultatif `cndp_receipt` (« Récépissé CNDP »). Sous chacun des trois formulaires (catalogue, rendez-vous, professionnels), une mention conforme à la loi n° 09-08 nomme Racha Home, la finalité, la durée de conservation de trois ans et les droits, avec l’e-mail public. Lorsque le champ est rempli, la mention et la page Confidentialité ajoutent « déclaré à la CNDP sous le n° … » ; vide, la page indique que la déclaration est en cours d’enregistrement et les formulaires ne mentionnent pas la CNDP. La phrase `form_privacy` du formulaire catalogue reste modifiable dans EmDash. Les demandes et contacts de plus de trois ans sont supprimés automatiquement par les tâches planifiées des deux plugins. Le dossier de déclaration est dans [cndp-declaration.md](cndp-declaration.md).

## Migration 0018 : dix-neuf modèles dans les familles existantes

`scripts/migrations/0018-collection-additions.mjs` s’exécute comme la 0016 (aperçu par défaut, `--apply`, sauvegarde privée, sans effet à la seconde exécution). À partir de `content/collection-additions.json` et des fichiers de `content/media/collection-additions`, il crée et publie dix-neuf modèles, avec photos, dimensions, dessins, finitions et fiche produit en PDF, puis les ajoute à la suite de la sélection actuelle de leur famille :

| Famille | Modèles ajoutés |
| --- | --- |
| Tables | Butterfly, Butterfly Keramik, Tyron Keramik, Botero Argile, Botero Wood Round, Botero Keramik Round, Botero Ker-Wood Round |
| Chaises et tabourets | Miranda ML, Zuleika |
| Canapés et fauteuils | Craig, Douglas, Mykonos, Sinatra |
| Buffets et bibliothèques | Kayak, Amsterdam, Nautilus |
| Luminaires | Paris, Cloudine, Aladdin |

Un modèle déjà créé par un éditeur est conservé et n’est pas lié deux fois ; l’ordre et le contenu des familles ne changent pas. Les nuanciers des fiches (1 321, dont près de 300 par canapé) sont rangés comme ceux des modèles existants : « Tissu Canapé » pour les catégories T10 à T90, « Cuir Canapé » pour glove, magnifica, nabuk et perfetto, « Cuir Chaise/Lit » pour le cuir mince et le similicuir. Les canapés étant composables, leurs dimensions sont données par les dessins de la fiche. Les nuanciers, les photos des fiches et la photo principale de chaque modèle sont agrandis avec Real-ESRNet ; les autres photos de galerie restent à leur taille d’origine. Les quatre Botero n’ont qu’une photo d’ambiance chacun. Ohay attend des photos et une fiche produit lisible : celle reçue est vide. Appliquer après la 0016, dont il réutilise le code d’écriture.
