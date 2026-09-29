# Révision éditoriale après l’audit SEO

Le manifeste [`content/seo-editorial-2026-09-29.json`](../content/seo-editorial-2026-09-29.json) décrit une révision ciblée de 27 entrées EmDash. Il ne remplace pas les données du CMS et ne doit pas servir à réimporter le seed. Chaque entrée contient uniquement les champs concernés, leur valeur initiale exacte et leur nouvelle valeur. Les six familles incluent les valeurs avant/après du panneau SEO natif, en plus des champs éditoriaux de secours.

Les valeurs initiales ont été comparées au relevé privé de la base Cloudflare du 29 septembre 2026. La procédure de publication doit vérifier à nouveau les révisions, les champs, le panneau SEO et l’absence de brouillon avant toute écriture. Une modification de l’éditeur intervenue depuis ce relevé doit arrêter la publication de l’entrée concernée.

Après l'enregistrement d'une image, EmDash peut compléter sa référence avec `meta.caption`, `meta.blurhash` et `meta.dominantColor` issus de la médiathèque. La reconnaissance d'une entrée déjà terminée tolère uniquement ces trois ajouts lorsqu'ils étaient absents du manifeste, puis saute l'entrée sans aucune écriture. La comparaison de l'état initial reste exacte ; les métadonnées déjà présentes, identifiants, fichiers, dimensions, textes alternatifs et brouillons restent contrôlés strictement. Le contrôle final compare les valeurs ajoutées à la fiche média sauvegardée avant publication.

## Choix de rédaction

- **Accueil et showroom :** une invitation directe, les compositions exposées sur 400 m² et le rôle de l’équipe dans le choix des dimensions et des revêtements. Aucun dossier à préparer avant de venir, aucune promesse de modèle en stock, d’échantillon à emporter, de livraison ou de pose. L’adresse, les horaires et le téléphone continuent à provenir des réglages communs.
- **Collections :** des introductions centrées sur les usages et les matières. Casablanca apparaît dans les titres SEO lorsque le contexte local est pertinent, sans ajouter la ville à tous les H1 ni présenter les modèles du site comme un inventaire du magasin. La famille extérieure conserve un titre centré sur sa restriction d’usage.
- **Fiches modèles :** les caractéristiques, dimensions, nuanciers, plans et PDF restent conservés. Des liens contextuels permettent de comparer une assise, un autre rangement ou un article pertinent. Les associations suggérées ne garantissent pas la compatibilité de toutes les dimensions et finitions. La phrase identique de disponibilité est retirée des onze fiches ; leurs liens de contact restent présents et la notice commune des familles mentionne les modèles exposés, les prix et les délais.
- **Mobilier extérieur :** la restriction « espaces couverts, protégés d’une exposition directe aux intempéries » reste dans l’introduction de la famille et dans le corps de chaque fiche Outdoor. Les cartes et le paragraphe de sélection ne répètent plus cette même réserve. Aucun usage sous la pluie ou sur une terrasse découverte n’est ajouté.
- **Journal :** les cinq articles sont conservés et remaniés avec des réponses plus directes, des comparaisons chiffrées lorsque les sources les permettent et des liens utiles. Ils restent d’environ 380 à 410 mots ; leur longueur n’est pas un objectif SEO. Leurs URL, catégories, dates de publication et auteurs ne sont pas changés par ce manifeste.
- **Visuels existants :** les photos et leurs références sont conservées. La légende « Photographie d’ambiance. » remplace les notes de travail sous les photos non identifiées des familles et du Journal. Elle n’attribue ni modèle ni lieu à ces images. Les droits et l’identification finale restent à vérifier avant lancement commercial.
- **Textes alternatifs :** douze occurrences sont corrigées après inspection des sept photos d’origine : image principale de l’accueil, six familles et cinq articles. Seul `alt` change ; identifiant, fichier, dimensions et métadonnées du média restent identiques. Les descriptions ne déduisent pas une matière précise, un modèle ou un lieu non identifié.
- **Catalogue :** le PDF est toujours une démonstration. Ses avertissements, le téléchargement immédiat et le consentement marketing séparé restent inchangés. Le texte ne promet aucun envoi de catalogue par email.

## Sources des faits ajoutés ou développés

Le texte du showroom reprend uniquement les faits déjà relevés dans l’[article Maisons du Maroc fourni par le propriétaire](https://maisonsdumaroc.com/architectures-et-design/cattelan-italia-ouvre-son-premier-flagship-store-au-maroc), consignés dans [`showroom-editorial-copy.json`](../content/showroom-editorial-copy.json) : surface, Triangle d’Or, compositions de salons/salles à manger/chambres et conseil sur les meubles. Les coordonnées approuvées par le propriétaire priment sur celles d’un article de presse.

Les caractéristiques des meubles proviennent des fiches officielles importées et identifiées dans [`model-details.json`](../content/model-details.json), ainsi que des textes sourcés [`model-editorial.json`](../content/model-editorial.json) et [`family-guides.json`](../content/family-guides.json). Les références précises qui enrichissent les articles sont :

| Sujet | Faits utilisés |
| --- | --- |
| Taille de table | Skorpio 200 × 100 cm : huit places standard ou six avec de grandes chaises dans la fiche fabricant ; verre et base en acier. Napoleon Keramik : plateau et base en céramique Marmi. |
| Association table/chaises | Rhonda : largeur 63 cm et dossier arrondi plissé. Greta : largeur 62 cm, ouverture entre assise et dossier. Les dimensions concernent les versions des fiches locales. |
| Matières et finitions | Keramik = céramique ; Marble = marbre naturel ; CrystalArt = décor imprimé sur verre ; Brushed = finition brossée. Ruby Lounge : structure en frêne, teintes noyer Canaletto ou rouvre brûlé. Chelsea : dessus en miroir bronze ou en céramique selon la version. |
| Canapé et fauteuil | Ruby S200 : 200 × 92 × 76 cm ; Ruby Lounge : 81 × 92 × 76 cm. Cadre en frêne et revêtements fixes avec options propres à la référence. |
| Buffet et bibliothèque | Chelsea de 193 cm : hauteurs 50, 75, 100 cm, et B3 sur piètement de 65 cm. Airport : composants, caissons Box, module Desk, fixation mur/plafond ; les dimensions des éléments ne sont pas celles d’une composition complète. |

Les sources officielles supplémentaires sont ajoutées aux articles concernés. Les conseils de disposition sont des suggestions pratiques, sans norme dimensionnelle inventée ni garantie de confort ou d’entretien.

Cette révision ne change pas le domaine, les réglages d’indexation, la fiche Google Business Profile, le fournisseur email ou les mentions légales. Le rapport de réalisation doit distinguer la préparation du manifeste de sa publication effectivement vérifiée.
