# Les cinq guides du Journal : audit et réparation ciblée

Audit du 5 octobre 2026 sur les réponses HTML du site de prévisualisation et sur les cinq entrées natives EmDash. Les corps correspondent exactement aux textes approuvés le 4 octobre. Ils répondent tous en HTTP 200, conservent la signature « Cattelan Italia Maroc », leurs sources et un seul `BlogPosting` dont l'auteur est une organisation. Les dates de modification du graphe reflètent la révision du 4 octobre.

**État : les cinq articles ont été publiés et vérifiés le 5 octobre 2026.** La migration 0027 a enregistré les cinq brouillons et les deux titres SEO natifs ; une étape distincte a publié uniquement ces brouillons après contrôle de leurs révisions. Les reçus de publication sont conservés en privé dans `.wrangler/seo-2026-10-05/publication-2026-10-05T12-06-00-852Z/`. Le contrôle anonyme après publication confirme le contenu effectivement servi.

## Constat et cause

Les cinq corps d'article ont **zéro lien contextuel** vers un modèle ou un autre guide. La génération de `docs/copy-drafts/apply/manifest.json` par `scripts/build-copy-manifest.mjs` a reconstruit les paragraphes en Markdown sans liens. Les liens ajoutés lors des révisions de septembre ont donc disparu au moment de la publication des textes du 4 octobre. Les boutons vers les collections sont restés présents.

Les guides contiennent environ 289 à 320 mots de corps selon l'extraction HTML. Ce nombre n'est pas un objectif à corriger : les exemples, mesures et contrôles sont utiles. Le premier travail consiste à permettre au lecteur de vérifier la référence nommée, puis de poursuivre sa décision.

## Parcours prévu

| Guide existant | Question conservée | Modèles reliés dans le corps | Guide suivant |
| --- | --- | --- | --- |
| [Forme et proportions de table](https://cattelan-maroc-preview.cattelan.workers.dev/journal/choisir-forme-proportions-table-salle-a-manger/) | Quelle forme et quelle taille conviennent à la pièce ? | Zuleika, Miranda ML, Skorpio, Napoleon Keramik, Butterfly | Association table/chaises |
| [Table et chaises](https://cattelan-maroc-preview.cattelan.workers.dev/journal/associer-table-chaises-salle-a-manger/) | Comment coordonner les finitions et vérifier l'encombrement ? | Tyron Keramik, Rhonda, Greta, Zuleika | Forme et proportions de table |
| [Céramique, verre ou bois](https://cattelan-maroc-preview.cattelan.workers.dev/journal/ceramique-verre-bois-choisir-finition-meuble/) | Quel matériau réel et quel aspect pour le plateau ? | Napoleon Keramik, Skorpio, Butterfly, Botero Wood Round | Forme et proportions de table |
| [Canapé et fauteuil](https://cattelan-maroc-preview.cattelan.workers.dev/journal/composer-salon-canape-fauteuil/) | Comment implanter et associer les assises ? | Craig, Douglas, Mykonos, Sinatra, Ruby, Ruby Lounge | Buffet ou bibliothèque |
| [Buffet ou bibliothèque](https://cattelan-maroc-preview.cattelan.workers.dev/journal/choisir-buffet-bibliotheque-salon/) | Quel rangement convient aux objets et à la pièce ? | Chelsea, Amsterdam, Kayak, Nautilus, Airport | Canapé et fauteuil |

Le texte du nom devient un lien à sa première occurrence pertinente dans un paragraphe. Les titres, citations, mesures et autres paragraphes restent en place. Un paragraphe court relie chaque guide à une étape complémentaire. Au total : **24 liens vers des modèles et 5 liens entre guides**.

## Deux précisions factuelles

- **Adrian Wood.** Le guide des matières affirme que les deux essences sont réunies sur un même plateau. Le dossier `docs/copy-drafts/OPEN-POINTS.md` maintient ce point parmi les détails non confirmés. La phrase est retirée ; l'exemple sourcé de Botero Wood Round en noyer Canaletto ou chêne brûlé reste intact. La migration ne modifie pas la fiche Adrian Wood.
- **Airport.** La longueur de 60 à 310 cm et la profondeur de 29 cm concernent ses étagères. La phrase devient : « Airport se fixe au mur ou au plafond ; ses étagères mesurent de 60 à 310 cm de long et 29 cm de profondeur. » Elle rejoint le fait déjà publié sur la fiche modèle et évite de présenter les cotes d'un composant comme celles de toute la bibliothèque.

Les repères d'aménagement restent des premiers contrôles à adapter à la pièce. Aucun nombre de places, encombrement supplémentaire, garantie d'entretien ou modèle exposé n'est inventé.

## Deux titres SEO natifs

| Guide | Avant | Après |
| --- | --- | --- |
| Forme et proportions | Table de salle à manger à Casablanca · Cattelan Italia Maroc | Forme et dimensions d'une table · Cattelan Italia Maroc |
| Canapé et fauteuil | Salon, canapé d'angle et fauteuil · Cattelan Italia Maroc | Choisir canapé et fauteuil · Cattelan Italia Maroc |

Ces titres présentent le rôle informatif des guides. Les familles gardent l'intention de comparaison commerciale et locale. Les H1 approuvés, les descriptions natives, les images sociales et les canonical ne changent pas. Les autres titres sont déjà cohérents avec les questions abordées.

## Sources et recherche complémentaire

Les sources existantes sont conservées avec leurs libellés. Les URL officielles documentées dans les modèles natifs sont comparées avant toute écriture ; les variantes avec et sans `www` ne créent pas de doublon. Les anciennes sources couvrent les modèles d'origine. Parmi les modèles nouvellement ajoutés et nommés dans ces guides, douze références distinctes n'ont pas de champ natif `source_url` ou `official_url` dans l'inventaire du 5 octobre. Leurs fiches techniques sont présentes, mais la provenance web doit être complétée séparément. Aucune URL n'est reconstruite depuis un nom ou un identifiant supposé.

La recherche OpenSEO existante couvre déjà les catégories et matières. Le complément Google Maroc/français du 5 octobre confirme l'utilité des guides sur les formes de table et l'association des assises. Les résultats céramique/marbre et canapé modulable sont mixtes ou commerciaux : ils ne justifient pas d'ajouter des articles qui répètent ces guides. Le livrable de stratégie ancien reste une source de priorités, pas un objectif de longueur ni une promesse de position.

Les prochains enrichissements demandent une information nouvelle : comparaison sourcée céramique/marbre, notice d'entretien de la finition exacte, schéma d'implantation, choix d'une configuration avec ses cotes. Deux sujets encore absents peuvent ensuite élargir le Journal : disposition des luminaires et association console/miroir. Aucun nouveau texte n'est nécessaire pour atteindre une cadence mensuelle.

## Vérification et procédure native

Fichiers concernés :

- `content/journal-seo-2026-10-05.json` : corps avant intervention, annotations, corrections et titres ciblés ;
- `scripts/migrations/0027-journal-seo-links.mjs` : inventaire, vérifications natives et sauvegarde en brouillon ;
- `tests/journal-seo-migration.test.mjs` : conservation du contenu, brouillons, concurrence, sauvegardes, sources, idempotence et absence de publication.

La migration exige les corps exacts audités, des articles publiés sans brouillon et des destinations publiées. Les révisions, sources officielles et relations sont relues avant écriture. Une modification concurrente ou un brouillon existant interrompt l'opération. Chaque mutation possède une copie privée de l'état précédent dans `.wrangler/migrations/0027-journal-seo-links/` ; aucun jeton, compte ou média n'est modifié.

Le corps et les éventuelles sources sont enregistrés en brouillon, sans champ de publication. Les titres SEO natifs sont enregistrés séparément avec une révision fraîche parce qu'ils prennent effet immédiatement. Une seconde exécution refuse les brouillons, même s'ils ressemblent à la migration : leur publication exige une vérification distincte des reçus. Après cette publication, le nouvel inventaire doit signaler zéro changement.

## Résultat après publication

Le relevé privé `.wrangler/seo-2026-10-05/article-after-audit.json` confirme cinq réponses HTTP 200 et **29 liens de corps d'article**, avec les ancres et destinations exactes du manifeste. Les deux titres SEO et les deux corrections factuelles sont présents. Les descriptions natives, les listes de sources, les signatures et les dates originales de publication sont inchangées.

Chaque article conserve un seul `BlogPosting`, un auteur de type `Organization`, sa bonne URL et la même date de publication. Sa date de modification avance avec cette révision. Le `noindex` reste présent dans le HTML et dans l'en-tête HTTP.

Les guides sur les dimensions de table et les matières ont également été rendus à **1 440 px et 390 px** : quatre captures privées dans `.wrangler/seo-2026-10-05/article-screenshots/`, textes et liens visibles, aucun débordement horizontal et aucune erreur réseau. Les captures intégrales prises après défilement conservent la position de l'en-tête fixe ; elles servent de relevé du rendu, pas de nouvelle référence visuelle.

Le contrôle n'a envoyé aucun formulaire et n'a consommé aucun crédit de recherche supplémentaire. Il confirme cette publication dans la prévisualisation, sans ouverture de l'indexation ni lancement du domaine final.
