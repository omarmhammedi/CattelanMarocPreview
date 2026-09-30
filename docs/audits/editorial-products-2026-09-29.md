# Audit éditorial — six familles et onze modèles

29 septembre 2026. Audit en lecture seule du contenu publié capturé à **11 h 47, heure de Toronto**. Aucune proposition ci-dessous n’est publiée.

## Périmètre et méthode

Les dix-sept routes ont répondu HTTP 200. Les introductions, descriptions et blocs de texte rendus correspondent aux dernières révisions de `content/family-guides.json` et `content/model-editorial.json`. L’examen porte aussi sur les titres SEO, descriptions, boutons, légendes, textes alternatifs, dimensions, intitulés des plans et finitions. Preuves locales : `test-results/editorial-audit-2026-09-29/report.json`, `page-copy.txt` et `html/`. Les champs et textes partagés ont été rapprochés de `src/lib/content.ts`, `ModelDetail.astro`, `ModelCard.astro` et `src/pages/collections/[slug].astro`.

**Constat : les familles parlent trop de la méthode de choix et pas assez directement des meubles. Les fiches modèles sont nettement plus précises.** Il faut retirer les consignes et le commentaire sur le parcours, puis conserver les caractéristiques qui distinguent vraiment les produits. Une visite ou une prise de contact ne doit pas sembler exiger un projet défini ou un dossier de mesures.

Les propositions reprennent uniquement des informations déjà documentées dans le dépôt. Cet audit de rédaction ne renouvelle pas la vérification externe de chaque caractéristique technique ni la disponibilité locale. Il ne valide pas l’exhaustivité du catalogue. Les nuances de matière, de variante et d’usage Outdoor restent nécessaires.

## Corrections prioritaires communes

| Priorité et emplacement | Citation actuelle exacte | Décision et proposition | Motif |
| --- | --- | --- | --- |
| P1 — trois familles, `families.content` | « Préparer votre choix au Maroc » ; « Préparer un ensemble repas ou comptoir » ; « Préparer votre projet de salon » | **Supprimer ces trois rubriques**, sans remplacement. Conserver les boutons catalogue et contact. | Elles répètent les actions déjà proposées et imposent des devoirs au visiteur. |
| P1 — `/collections/canapes-fauteuils/`, même rubrique | « contactez le showroom de Casablanca avec un plan coté, les ouvertures et le nombre de places souhaité » | **Supprimer** avec la rubrique. | Ce sont des éléments éventuellement utiles dans une conversation avancée, pas une condition pour découvrir le magasin. |
| P1 — six familles, template `[slug].astro` | « Pour poursuivre votre découverte » / « Précisons votre projet » | **Supprimer les deux titres** et garder les liens aux libellés directs. | Aucune information supplémentaire. Le même discours s’impose sur toutes les familles. |
| P1 — onze modèles, template `ModelDetail.astro` | « Votre projet » / « Parlons de votre intérieur. » | **Supprimer ces titres**, garder les actions. | Le visiteur consulte peut-être un meuble sans projet. « Intérieur » est en outre inadapté aux deux fiches Outdoor. |
| P2 — six familles et onze modèles, `site_content.model_notice` et `models.availability_note` | « Cette sélection présente des modèles de la marque. Contactez notre showroom de Casablanca pour connaître les possibilités de commande et vérifier les modèles exposés. » | **Raccourcir**, en conservant l’information : « Contactez le showroom pour connaître les modèles exposés et les possibilités de commande. » | La première phrase est évidente. L’avertissement doit rester discret et cohérent entre cartes et fiches ; il évite une promesse de stock. |
| P2 — familles, fin des paragraphes consacrés aux exemples | « Elles constituent un point de départ pour comparer les tables, sans résumer toute la gamme. » ; « ces deux exemples ne résument pas toute la collection » ; « cette fiche ne représente pas l’ensemble des suspensions, lampes et appliques de la collection » | **Supprimer ces conclusions**. Le titre « Quelques pièces à découvrir » exprime déjà la sélection. | Le site commente ses propres limites plusieurs fois au lieu de présenter les meubles. Conserver les cartes et leurs liens vers les fiches. |

La règle n’est pas de supprimer tout conseil. « Le piètement influe sur l’emplacement des convives autant que la longueur du plateau » apporte une conséquence concrète. Une suite de « comparez », « relevez », « vérifiez » et « précisez » transforme en revanche la page en questionnaire.

## Couverture des six familles et propositions

Toutes les phrases citées ci-dessous figurent dans le HTML publié. Les remplacements sont des brouillons ciblés, pas une nouvelle version complète des pages.

| Route et champ | Passage à revoir | Action et texte proposé | À conserver |
| --- | --- | --- | --- |
| `/collections/tables/` — `intro` | « Verre, bois, céramique ou marbre naturel composent des propositions différentes selon les modèles. Pour choisir, comparez la matière et la silhouette, puis vérifiez le format avec vos chaises et les passages autour de la table. » | **Réécrire l’introduction** : « Des plateaux en verre, en bois, en céramique ou en marbre naturel, associés à des piètements sculpturaux : les tables de salle à manger Cattelan Italia se déclinent en plusieurs formes et dimensions. » | Différence Keramik/céramique et CrystalArt/verre imprimé ; rapport piètement, chaises et places. |
| `/collections/chaises-tabourets/` — `intro` | « Commencez par la hauteur d’utilisation, puis comparez les proportions et la manière dont l’assise s’intègre au meuble voisin. » | **Réécrire l’introduction** : « Chaises de salle à manger et tabourets de comptoir se déclinent avec des pieds en bois ou en métal, des dossiers enveloppants et différents revêtements. Les modèles fixes, pivotants ou réglables répondent à des usages différents. » | Hauteur d’assise distincte de la hauteur du dossier ; passage des accoudoirs sous le plateau ; cartes clairement identifiées comme chaises. |
| `/collections/canapes-fauteuils/` — `intro` | « Volumes rembourrés, cadres en bois apparent ou silhouettes courbes donnent des directions différentes au salon. Le choix se construit autour de votre usage, de l’implantation et du revêtement, avant de retenir un modèle ou une configuration. » | **Réécrire l’introduction** : « La collection réunit canapés droits ou composables et fauteuils indépendants. Les structures en bois apparent, les dossiers courbes et les revêtements en tissu ou en cuir varient selon les modèles. » | Distinction profondeur totale/profondeur d’assise ; finition du dos d’un canapé placé au centre ; frêne teinté de Ruby. |
| `/collections/buffets-bibliotheques/` — `content`, finitions | « Une façade laquée, un plateau en céramique ou en miroir et des étagères en bois produisent des effets différents. » | **Supprimer cette phrase**. Garder la présentation de la gamme et les faits concrets sur les portes, étagères, fixation et compositions. | L’introduction oppose clairement rangement fermé et étagères ouvertes. « Les dimensions d’un module ne décrivent pas toute la composition » est utile pour Airport. |
| `/collections/luminaires/` — `content`, premier conseil | « Une suspension prend place dans le volume de la pièce ; une lampe à poser nécessite une surface et une prise adaptées. Un lampadaire ou une applique répond à une autre implantation. » | **Supprimer ce développement évident**. Conserver les types de luminaires dans l’introduction, puis les faits sur dimensions, points électriques et équipements. | Différence ampoules/LED intégrées ; variation selon version ; description de Bloom et de ses deux implantations. |
| `/collections/mobilier-exterieur/` — `intro` | « Pour composer un espace repas, le choix des proportions et des matières commence par les conditions du lieu. » | **Réécrire l’introduction** : « Les tables et assises Outdoor Cattelan Italia se déclinent en plusieurs dimensions et finitions. Les modèles présentés ici sont réservés aux espaces couverts, protégés d’une exposition directe aux intempéries. » | Présentation de la famille avant les modèles, conservés comme exemples plus bas. Limite d’usage explicite ; céramique, acier inoxydable 304 et tissu non déhoussable dans les descriptions concernées. Ne pas généraliser la restriction des deux modèles à tout le catalogue international. |

Allégements complémentaires dans `families.content` :

- **Tables** : remplacer « Ronde, ovale ou rectangulaire : étudiez la forme dans un plan de votre salle à manger, en ajoutant les chaises occupées et leur recul » par « La place autour de la table dépend aussi du recul des chaises et de la position du piètement. » Garder l’information sur les rallonges propres à certaines références.
- **Chaises et tabourets** : supprimer « Indiquez bien si votre recherche concerne une chaise ou un tabouret. » L’intitulé des produits suffit. Le passage sur les nuanciers peut rester dans les fiches exactes.
- **Canapés et fauteuils** : supprimer « Une configuration modulable ne signifie pas que toutes ses housses se retirent ». Aucun lien entre modularité et housses n’avait été suggéré. Garder simplement que le caractère déhoussable dépend du modèle.
- **Buffets et bibliothèques** : « demandez aussi les charges admissibles des tablettes avant de définir leur répartition » peut devenir « La charge admissible des tablettes est à vérifier pour les livres et la vaisselle. » C’est une contrainte utile, sans inventer de valeur ni imposer une demande systématique.
- **Luminaires** : remplacer la dernière phrase « Une version variable ou une télécommande peut être une option spécifique : sa compatibilité avec l’installation doit être confirmée pour la version choisie » par « Les possibilités de variation et la télécommande dépendent de la version. » Les limites précises de Bloom restent dans sa fiche.
- **Mobilier extérieur** : raccourcir « Leur désignation Outdoor ne constitue pas une validation pour une installation sans protection » : la limite explicite de l’introduction suffit. Garder un encadré d’usage près des caractéristiques ; ne pas disperser trois avertissements équivalents.

### Textes des cartes de familles

Les six `families.card_text` réapparaissent sur l’accueil et l’index des collections. Ils annoncent aujourd’hui une méthode à suivre plutôt que ce que l’on va voir. Exemple exact : « Canapés droits ou composables et fauteuils : comparer les volumes, l’implantation et les revêtements. » Propositions plus directes :

| Famille | Proposition de `card_text` |
| --- | --- |
| Tables | Tables de salle à manger en verre, bois, céramique ou marbre naturel. |
| Chaises et tabourets | Chaises à accoudoirs, dossiers enveloppants et tabourets de comptoir. |
| Canapés et fauteuils | Canapés droits ou composables et fauteuils indépendants. |
| Buffets et bibliothèques | Buffets fermés, étagères ouvertes et bibliothèques modulaires. |
| Luminaires | Suspensions, lampadaires, lampes à poser et appliques. |
| Mobilier extérieur | Tables et assises pour les extérieurs couverts et protégés. |

## Couverture des onze fiches modèles

Les caractéristiques, photos, nuanciers, plans et PDF sont la valeur de ces pages. Il n’est pas nécessaire de réécrire toutes les fiches. Les titres des modèles et leurs principales descriptions sont spécifiques ; les coupes suivantes visent les répétitions et le langage de notice interne. Les citations de cette table viennent de `models.content`, sauf mention contraire.

| Route | Passage exact et décision | Proposition courte / information à garder |
| --- | --- | --- |
| `/modeles/skorpio/` | « Leurs matériaux ne sont pas des options interchangeables de la référence présentée. » — **supprimer** après identification claire de la version. | Garder « Cette fiche concerne Skorpio en verre », les variantes distinctes, les épaisseurs et exceptions de dimensions. Les finitions brossées et la base visible sont de vraies particularités. |
| `/modeles/napoleon-keramik/` | « Les dix formats publiés vont du plateau de 200 × 120 cm à celui de 320 × 138 cm » — **alléger** le vocabulaire de publication. | « Dix formats, de 200 × 120 à 320 × 138 cm, avec notamment des plateaux ovales et polygonaux. » Garder la base à deux coques et la distinction céramique/marbre naturel. |
| `/modeles/rhonda/` | « Le gabarit publié est de 63 × 60 × 79 cm. » — **supprimer du récit**, déjà présent dans les dimensions. | Garder dossier plissé, coque lisse, pieds acier et revêtement non déhoussable. La comparaison Wood/Cantilever/Turn/Wheels a un contenu réel, à conserver sans la conclusion évidente sur les fiches séparées. |
| `/modeles/greta/` | « Ce détail de construction caractérise la famille Greta. » — **supprimer**. | La phrase précédente décrit déjà les surpiqûres et le dossier. Garder l’explication de l’appui arrière dédoublé. Raccourcir la fin : « Cette fiche décrit Greta d’intérieur, à pieds métalliques. » |
| `/modeles/ruby/` | « Ruby Lounge, présenté séparément dans la sélection, appartient au même univers formel mais conserve sa propre fiche de revêtements et de caractéristiques. » — **réécrire**. | « Le fauteuil Ruby Lounge reprend le cadre en frêne et les courbes de Ruby, avec ses propres choix de revêtements. » Faire du nom un lien. Garder S200/AC80 et le fait que Canaletto/rouvre sont ici des teintes du frêne. |
| `/modeles/ruby-lounge/` | « Son format de 81 cm de large et 92 cm de profondeur est celui d’une assise lounge. » — **supprimer**. | Les mesures sont déjà indiquées ; qualifier ces mesures d’« assise lounge » n’explique rien. Garder le cadre, le dossier et les revêtements propres au fauteuil. |
| `/modeles/chelsea/` | « Les huit formats publiés mesurent 46 cm de profondeur. » — **réécrire**. | « Les huit formats ont une profondeur de 46 cm. » Conserver pans polygonaux, rebord incliné, dessus et différences des versions B. Fiche globalement concrète. |
| `/modeles/airport/` | « Les groupes de finitions distinguent la structure, les étagères et les conteneurs. » — **supprimer**. | Cette phrase décrit l’organisation du nuancier. Garder fixation mur/plafond et dimensions des composants, qui évitent une confusion réelle avec l’ensemble monté. |
| `/modeles/bloom/` | « Cette option ne doit donc pas être supposée incluse, ni étendue au lampadaire P. » — **réécrire le paragraphe sans ce rappel**. | « Les ampoules fournies sont non dimmables. Une télécommande avec récepteur-variateur est proposée en option pour les suspensions O/LO et V/LV uniquement. » Garder références, matériaux et dimensions. Ne pas déduire la compatibilité d’une autre ampoule. |
| `/modeles/napoleon-keramik-outdoor/` | « Le fabricant prescrit un emplacement couvert et protégé d’une exposition directe aux agents atmosphériques. » — **conserver le fond, simplifier**. | « Pour un extérieur couvert, à l’abri d’une exposition directe aux intempéries. » La limitation doit rester visible ; « agents atmosphériques » peut disparaître. Ne pas changer cette consigne en simple conseil d’entretien. |
| `/modeles/greta-outdoor/` | « Les cuirs et autres revêtements de Greta d’intérieur ne sont pas des options de cette fiche. » — **supprimer**, après présentation positive de l’habillage. | « L’assise et le dossier sont habillés de tissu Outdoor non déhoussable. » Garder inox 304, dimensions et usage exclusivement couvert/protégé. La fiche n’autorise pas une terrasse ouverte. |

## Métadonnées, légendes et vocabulaire technique

**Titres SEO et descriptions :** les dix-sept sont distincts et liés au contenu réel. Les onze descriptions de modèles contiennent des caractéristiques identifiables ; à conserver dans l’ensemble. Les descriptions de familles reprennent trop le verbe « comparer ». Sur Tables, remplacer « Comparez les possibilités pour votre salle à manger au Maroc » par une description des matières et formats. Sur Canapés, « pour composer votre salon au Maroc » ajoute surtout une localisation artificielle ; la marque locale figure déjà dans le titre. Les descriptions Outdoor doivent conserver la mention d’espace couvert. Il s’agit des métadonnées natives EmDash rendues par `SeoHead`, pas d’un changement de H1.

| Surface inspectée | Exemple publié | Recommandation |
| --- | --- | --- |
| Six `families.image_caption` | « Ambiance illustrative. Les modèles de cette image restent à identifier. » | **Problème d’image encore non identifiée**, pas une phrase à maquiller. Remplacer ou identifier le visuel, puis mettre une légende vraie ; ne pas faire croire qu’il représente les produits locaux exposés. |
| Alts des six images de famille | « Ambiance tables — visuel provisoire » | Décrire l’image retenue une fois identifiée. Retirer « provisoire » sans résoudre l’image ne rend pas le contenu final. |
| Alts des galeries modèles | « Skorpio — photographie officielle 1 » | Identifie le modèle mais pas la vue. Réviser image par image : vue d’ensemble, détail du piètement, etc., après inspection. Ne pas inventer la finition photographiée. Les miniatures à `alt=""` ont déjà des liens nommés ; elles ne sont pas des oublis équivalents. |
| Galerie, template | « En images » / « Sous tous les angles. » | Garder un seul titre, par exemple **« Photos »**. « Tous les angles » promet une couverture que le titre n’a pas besoin d’annoncer. |
| Dimensions, `models.dimensions[].value` | « 200x120x74h sag. », « 220x120x74h bisc. », « 300x130x75h polygon » | Afficher les mesures avec unités et identifier la forme en français après rapprochement avec le plan source. Ne pas développer une abréviation inconnue par supposition. Préserver la valeur technique originale pour contrôle. |
| Plans, `models.drawings[].label` | « Skorpio — plan 1 », jusqu’à « plan 22 » | Des libellés de format/version seraient plus utiles qu’un numéro ; établir le lien exact plan-format avant changement. Aucune association n’a été vérifiée dans cet audit. |
| Groupes de finitions, `finishes[].group/material_group/material` | « base · metals », « assise · Cuir Chaise/Lit · cuir mince », « assise · Tissu Canapé · T10 » sur Greta | Traduire les catégories et présenter une hiérarchie compréhensible : « Piètement — métal », « Revêtement — cuir mince », « Revêtement — tissu T10 ». Garder les codes commerciaux. Ne pas déduire une erreur de compatibilité du seul nom de la famille de nuanciers. |
| Noms/codes de finitions, Airport | « GFM71 gaufré balnc » | Corriger **« blanc »**, sans changer GFM71. Les noms déjà composés du code sont suivis du même code dans le template : éviter la répétition visuelle. |
| Données exactes et liens utiles | « Télécharger la fiche technique », « Voir la fiche Cattelan Italia », « Découvrir le modèle » | **Conserver** : destination explicite et information réelle. Les noms commerciaux MIST, Marmi, Brushed Bronze, Box, Desk restent identifiables ; expliquer si nécessaire, sans traduction arbitraire. |

## Ordre de reprise conseillé

1. Supprimer les rubriques de préparation et les titres de conversion vides ; alléger la note commune sans perdre sa fonction.
2. Réécrire introductions et cartes de familles, puis conserver seulement les conseils qui changent concrètement le choix.
3. Couper les répétitions ciblées des modèles ; préserver toutes les données exactes, les PDF, les variantes et les restrictions d’usage.
4. Clarifier les libellés techniques et résoudre les images provisoires. Un changement de rédaction ne remplace pas une identification de produit ou de photographie.

La validation suivante devra porter sur le texte réellement publié dans EmDash, avec conservation des modifications éditoriales éventuelles. Cet audit ne demande ni d’allonger les pages pour le référencement, ni de retirer les pages utiles, ni d’inventer prix, stock, exposition, livraison ou prestations du showroom.
