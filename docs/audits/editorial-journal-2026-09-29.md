# Réaudit éditorial — Journal

État public relevé le **29 septembre 2026 à 11 h 47, heure de Toronto**, sur l’aperçu EmDash existant. Lecture de l’index et des cinq articles complets : titres, chapeaux, corps, conclusions, boutons, métadonnées, légendes, textes alternatifs et sources. Preuves locales : `test-results/editorial-audit-2026-09-29/report.json` et `html/journal*.html`. Le HTML complète le rapport : son extraction `mainText` retire aussi les en-têtes des articles, donc leurs chapeaux et signatures.

**Constat : les sujets sont utiles, mais les textes les étirent.** Les vérifications concrètes sont entourées de considérations décoratives difficiles à appliquer, puis d’une même consigne de préparation de projet. Il faut conserver les cinq articles, en raccourcir les passages abstraits et les conclusions, et relier leurs exemples aux fiches disponibles. L’article sur les matières doit surtout tenir une promesse plus précise.

Ce document propose des corrections ; **aucun texte public ni champ CMS n’a été modifié**. Les citations sont tirées du rendu actuel. Les noms de champs viennent du modèle éditorial et du frontend ; les titres et descriptions publics peuvent être remplacés par le panneau SEO natif, à vérifier au moment d’une modification.

## 1. Index — `/journal/`

Verdict : conserver les cartes et les sujets ; raccourcir l’introduction et supprimer la conclusion commerciale générique. L’index n’a pas besoin d’expliquer au visiteur qu’il doit avoir un projet.

| Champ / emplacement | Citation actuelle | Action et raison | Exemple court |
| --- | --- | --- | --- |
| `pages.intro` | « Choisir un meuble, c’est aussi penser à sa place dans la pièce et à la façon de vivre avec lui. » | Remplacer l’évidence par les questions effectivement traitées. | « Quelle forme de table choisir ? Comment l’associer aux chaises ? Quel rangement convient au salon ? » |
| Fin de `intro` et `meta_description` | « pour préparer votre projet » | Supprimer : aucun besoin précis n’est nommé ; cette formule se répète sur tout le parcours. | Aucune phrase de remplacement. |
| `sections[].heading` | « Des idées à votre sélection » | Supprimer la section si son unique rôle reste de répéter l’accès au catalogue. L’intitulé ne dit rien de concret. | Aucune section supplémentaire. |
| `sections[].text` | « Une idée vous plaît ? Retrouvez les collections dans le catalogue et repérez les pièces à explorer pour votre intérieur. » | Supprimer : détour par le formulaire alors que les familles sont consultables sur le site, et PDF encore de démonstration. | Si un lien de sortie est conservé : « Voir les collections », vers `/collections/`, sans paragraphe. |

À conserver : « Le Journal Cattelan Italia Maroc », les catégories compréhensibles et le bouton « Lire l’article ». Les cinq extraits affichés sur les cartes doivent être corrigés avec le champ `posts.excerpt` de chaque article, sans créer un second texte concurrent pour l’index. Le titre SEO actuel décrit correctement la page.

## 2. Table — `/journal/choisir-forme-proportions-table-salle-a-manger/`

Verdict : l’article contient une vraie méthode ; l’alléger autour du dégagement, de la forme du plateau et du piètement. Le titre actuel est pertinent mais long ; « Quelle forme et quelles dimensions pour une table de salle à manger ? » serait plus direct.

| Champ / emplacement | Citation actuelle | Action et raison | Exemple court |
| --- | --- | --- | --- |
| `excerpt` | « Quelques repères pour comparer les formes et se projeter. » | Remplacer l’annonce vague par les trois points examinés. | « Forme du plateau, place des chaises et passages : ce qu’il faut vérifier avant de choisir une table. » |
| `content`, ouverture | « Une table attire souvent l’attention dès l’entrée dans une salle à manger. Pourtant, son dessin ne suffit pas à déterminer si elle trouvera sa place. » | Couper ces deux phrases : le paragraphe suivant expose déjà le problème de circulation. | Commencer à « Avant de comparer les modèles, observez les trajets quotidiens ». |
| `content`, dernière section | « Une table très expressive peut devenir le point de départ de la décoration ; une silhouette plus discrète laisse davantage de place aux autres éléments. » | Supprimer : ne permet ni de comparer deux tables ni de vérifier leur implantation. | Aucun remplacement. |
| `content`, dernière phrase | « Ce petit exercice transforme une préférence visuelle en choix concret, plus facile à comparer avec les dimensions de la configuration retenue. » | Couper : commentaire sur le conseil qui vient d’être donné. | Terminer après l’essai avec les chaises et les passages. |
| `cta_text` | « Découvrez les collections dans le catalogue, puis contactez le showroom de Casablanca pour connaître la disponibilité de la configuration qui vous intéresse. » | Retirer l’enchaînement imposé et le détour par le PDF. Un accès direct aux tables répond mieux au sujet. | Bouton seul « Voir les tables », vers `/collections/tables/`. |

À conserver : la différence entre places habituelles et occasionnelles ; l’ouverture des portes et tiroirs ; le fait qu’une table ronde n’occupe pas automatiquement moins de place ; l’encombrement du piètement ; l’essai au sol. La phrase sur la famille Skorpio mérite un lien vers les références précises, sans laisser croire que la fiche locale Skorpio en verre couvre toutes ses variantes. Le titre SEO actuel convient ; la description peut être resserrée autour des passages et du piètement, au lieu de « composer une salle à manger adaptée à votre intérieur ».

## 3. Table et chaises — `/journal/associer-table-chaises-salle-a-manger/`

Verdict : sujet clair, conseils de compatibilité utiles, moitié esthétique trop conceptuelle. Garder un exemple visuel simple et la vérification des accoudoirs ; supprimer les couches de vocabulaire décoratif.

| Champ / emplacement | Citation actuelle | Action et raison | Exemple court |
| --- | --- | --- | --- |
| `excerpt` | « L’essentiel est de choisir les liens qui donneront une unité à l’ensemble. » | Remplacer la formule abstraite par une possibilité concrète, sans la présenter comme une règle. | « La table et les chaises peuvent avoir des matières différentes. Un piètement de même couleur peut suffire à les rapprocher. » |
| `content`, H2 | « Choisir une intention pour l’ensemble » | Supprimer ce titre et raccourcir les deux premiers paragraphes. Une préférence visuelle ne demande pas une “intention”. | Entrer directement par l’exemple de pieds foncés rappelant la base de la table. |
| `content`, H2 | « Observer le dialogue entre les silhouettes » | Remplacer par ce que le lecteur doit réellement regarder. | « Voir les chaises autour de la table ». |
| `content` | « Il s’agit de choisir où l’on souhaite porter le regard, puis d’organiser les autres éléments autour de cette intention. » | Supprimer : explication abstraite d’une préférence, sans exemple supplémentaire. | Aucun remplacement. |
| `cta_text` | « Explorez les tables et les assises Cattelan Italia dans le catalogue pour préparer les associations de votre projet. » | Supprimer le paragraphe et proposer les deux familles directement. | « Voir les tables » et « Voir les chaises et tabourets ». |

À conserver : un exemple de rappel de couleur ; la comparaison d’échantillons ; le contrôle de la hauteur d’assise, des accoudoirs, du nombre de sièges et de leur rapport au piètement. Le titre principal pose une bonne question. Rhonda constitue un exemple identifiable : relier son nom à `/modeles/rhonda/`, tout en distinguant la variante Wood évoquée de la fiche locale. La description SEO est compréhensible mais « cohérente et personnelle » peut être remplacé par « hauteur, accoudoirs et finitions », qui annonce le contenu utile.

## 4. Matières — `/journal/ceramique-verre-bois-choisir-finition-meuble/`

Verdict : **priorité haute**. Le titre promet une comparaison entre céramique, verre et bois ; le texte répond surtout “regarder la pièce, les photos et vérifier la fiche”. Les différences d’usage ne sont pas expliquées. Le passage le plus spécifique porte sur les noms des finitions : mieux vaut recentrer l’article sur leur lecture que créer une comparaison sans preuves.

| Champ / emplacement | Citation actuelle | Action et raison | Exemple court |
| --- | --- | --- | --- |
| `title` | « Céramique, verre ou bois : comment choisir la finition d’un meuble ? » | Réduire la promesse au contenu effectivement étayé ; conserver la route existante. | « Matières et finitions : comprendre les termes Cattelan Italia ». |
| `excerpt` | « Une même forme change de présence selon sa finition. » | Supprimer : “change de présence” est peu naturel et n’apprend rien sur les matières. | « Un aspect marbré ne signifie pas forcément du marbre naturel. Le nom complet du modèle et sa fiche permettent d’identifier sa matière. » |
| `content`, premier paragraphe | « Avant de comparer les options, rassemblez quelques photographies de votre pièce prises en journée et le soir. » | Couper cette consigne systématique de préparation ; elle ne résout pas la question annoncée. | Aucun remplacement. |
| `content`, dernier paragraphe | « Pour avancer, retenez deux ou trois options et notez ce qui vous plaît dans chacune. » | Supprimer le paragraphe de constitution de dossier, photos comprises ; il répète les autres articles. | Conserver seulement la nécessité d’identifier la finition exacte, si elle n’est pas déjà expliquée. |
| `meta_description` | « Comparez le dessin, la teinte et les effets de matière pour choisir une finition de meuble en accord avec votre intérieur et votre usage. » | Réaligner sur le sujet retenu au lieu de promettre une comparaison d’usage absente. | « Aspect marbré, verre imprimé, finitions brossées : repérez la matière et la finition exactes dans les fiches Cattelan Italia. » |

À conserver : distinction entre aspect marbré et matériau ; référence exacte ; limites de perception des couleurs à l’écran ; nécessité de consulter les consignes propres à une finition, sans inventer résistance ou entretien. CrystalArt et Brushed sont des exemples concrets, mais leurs définitions doivent être rattachées aux documents précis qui les justifient avant réécriture. Les liens actuels renvoient à Skorpio et à un index de catalogues : ils ne rendent pas cette vérification évidente. Le `cta_text` « Découvrez les ambiances du catalogue et repérez les modèles dont vous souhaitez explorer les finitions. » peut être supprimé. Préférer des liens dans le texte vers les fiches et leurs finitions ; garder les sources officielles séparément.

## 5. Canapé et fauteuil — `/journal/composer-salon-canape-fauteuil/`

Verdict : réduire fortement les paragraphes sur “continuité et contraste”. La circulation, les dimensions et l’exemple Ruby/Ruby Lounge suffisent à donner une utilité propre à l’article.

| Champ / emplacement | Citation actuelle | Action et raison | Exemple court |
| --- | --- | --- | --- |
| `excerpt` | « Le point de départ reste votre façon de vivre le salon. » | Supprimer : ne donne aucune piste et pourrait décrire n’importe quel mobilier. | « Canapé et fauteuil doivent laisser les passages libres. Leur profondeur et leurs accoudoirs comptent autant que leur largeur. » |
| `content`, H2 | « Partir des moments vécus dans le salon » | Remplacer l’intitulé artificiel par le critère développé dans le paragraphe. | « Placer le fauteuil sans gêner le passage ». |
| `content` | « Ce fil conducteur aide à construire l’ensemble. Un contraste se lit mieux lorsqu’il porte sur un choix précis, plutôt que sur toutes les caractéristiques à la fois. » | Supprimer : règle esthétique générale présentée sans démonstration. | Garder, si nécessaire, l’exemple concret de teinte ou de matière commune qui précède. |
| `content`, conclusion | « Rassemblez un plan, quelques photos du salon et des ambiances qui vous plaisent. » | Supprimer ce paragraphe et la suite sur les préférences à noter : autre rituel de préparation inutile en conclusion. | Aucun remplacement. |
| `cta_text` | « Découvrez les lignes et les matières des collections pour préparer votre sélection. » | Supprimer ; le bouton existant est déjà explicite. | Garder seulement « Explorer les canapés et fauteuils ». |

À conserver : portes et trajets ; profondeur et accoudoirs ; comparaison Ruby/Ruby Lounge, reliée aux deux fiches locales ; consignes d’entretien propres au revêtement. L’appel à vérifier une référence exposée peut rester uniquement là où le lecteur envisage expressément de voir ce modèle, mais il n’a pas à conclure tous les articles. Le titre et le titre SEO sont clairs. La description peut nommer « dimensions, passages et revêtements » plutôt que « adapté à votre quotidien ». La source actuelle documente Ruby en anglais ; elle ne dispense pas de citer le document précis de Ruby Lounge si cet exemple reste.

## 6. Rangement — `/journal/choisir-buffet-bibliotheque-salon/`

Verdict : le plus concret des cinq. Conserver la comparaison ouvert/fermé et les contraintes de rangement/fixation ; raccourcir les commentaires décoratifs et la préparation de visite.

| Champ / emplacement | Citation actuelle | Action et raison | Exemple court |
| --- | --- | --- | --- |
| `excerpt` | « Voici comment orienter votre choix. » | Supprimer cette annonce de l’article ; remplacer le chapeau long par la différence essentielle. | « Portes fermées pour la vaisselle, étagères ouvertes pour les livres et objets : le choix dépend de ce que vous voulez ranger ou laisser visible. » |
| `content`, H2 | « La bibliothèque pour donner une place aux objets visibles » | Raccourcir : lourd pour une idée simple. | « La bibliothèque ouverte ». |
| `content` | « Leur disposition devient une partie du décor : des ouvrages regroupés, un objet isolé et une étagère moins remplie produisent des effets différents. » | Couper : évidence décorative sans conséquence pratique. | Aucun remplacement. |
| `content` | « Le rangement participe ainsi à la composition générale du salon. » | Supprimer : reformule les phrases précédentes sans information nouvelle. | Aucun remplacement. |
| `content`, conclusion | « Préparez ensuite des photos du salon et les dimensions disponibles. » | Supprimer le paragraphe final et laisser le bouton de famille. Le lecteur vient de lire les mesures utiles ; il n’a pas besoin d’un dossier pour visiter. | Garder seulement « Découvrir les buffets et bibliothèques ». |

À conserver : dimensions intérieures plutôt qu’extérieures seules ; portes et tiroirs à ouvrir ; prises et interrupteurs ; Chelsea et Airport comme exemples précis ; conditions de fixation d’Airport. Relier ces noms aux fiches locales. Le titre principal, le titre SEO et la description sont compréhensibles et peuvent rester. Le `cta_text` « Comparez les silhouettes et les compositions de rangement proposées par Cattelan Italia. » est dispensable puisque le bouton annonce la destination.

## Problèmes communs à traiter

- **Préparation répétée** : trois articles demandent explicitement de réunir photos/plan/sélection en conclusion ; les autres ajoutent eux aussi des tâches successives. Un conseil de mesure peut être utile dans un article consacré à l’encombrement, sans transformer toute consultation ou visite en démarche préparatoire. Conserver le conseil au bon endroit, couper le rituel final.
- **Catalogue présenté comme une réponse** : les articles table, table/chaises et matières ainsi que l’index proposent un PDF qui est encore de démonstration. Les textes doivent guider vers les familles et références consultables ; l’avertissement de démonstration ne doit pas être masqué pour améliorer le ton.
- **Maillage absent dans le corps des cinq articles** : les modèles sont nommés mais aucun nom ne mène à sa fiche locale. Les seuls liens techniques figurent dans « Pour aller plus loin », vers le site international. Ajouter des liens contextuels aux exemples existants, tout en conservant leur provenance, apporte davantage qu’une nouvelle conclusion.
- **Légende et alt identiques sur les cinq photos** : `image_caption` = « Photographie d’ambiance provisoire. » ; `image.alt` = « Ambiance de mobilier — illustration provisoire de l’article ». La légende dit honnêtement que le choix est provisoire, mais aucun texte n’explique ce que l’image illustre. Choisir une image correspondant au conseil puis décrire son sujet réel ; ne pas inventer un modèle représenté ni retirer la réserve avant cette vérification.
- **Signature, catégories et dates** : les cinq pages indiquent « Cattelan Italia Maroc », une catégorie et le 27 septembre 2026. Aucun temps de lecture n’est affiché. Ne pas inventer d’auteur expert ou de durée. Ces éléments n’expliquent pas le ton artificiel et ne nécessitent pas de remplacement éditorial.

## Ordre de correction et limites

1. Retirer les paragraphes de préparation de projet et les conclusions qui ne font que répéter les boutons ; simplifier les chapeaux.
2. Recentrer l’article matières et ses métadonnées sur une question à laquelle ses sources permettent réellement de répondre.
3. Ajouter les liens vers les fiches mentionnées et choisir des photographies qui expliquent un point du texte.

Audit de qualité et d’adéquation à l’intention, pas vérification exhaustive des caractéristiques techniques ni des documents externes. Aucune hypothèse de volume de recherche, de stock, de service au showroom ou de classement Google n’est ajoutée. Les exemples de réécriture sont des propositions courtes, à harmoniser avec les autres pages avant une publication ciblée. Les modèles et cinq articles doivent être conservés ; aucun quota de mots ne justifie les paragraphes à retirer.
