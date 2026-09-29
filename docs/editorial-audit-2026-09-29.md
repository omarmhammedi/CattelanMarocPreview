# Réaudit de tous les textes du site

**Mise à jour après approbation :** les corrections ont été appliquées dans la révision 0010. Voir le [résultat, les contrôles et les limites](test-results-editorial-refresh.md). Le relevé ci-dessous conserve les constats et propositions de l’audit initial.

**29 septembre 2026, capture à 11 h 47, heure de Toronto.** Audit des 28 pages publiques de l’aperçu existant, après la révision showroom `a3127b2`, ainsi que des textes communs et des messages d’interface. Les propositions de ce rapport ne sont pas publiées.

## Conclusion

Le problème est réel et ne se limite pas à « Préparer votre visite ». Le site impose trop souvent un même parcours : définir un projet, prendre des mesures, réunir des références, puis contacter le showroom. Une personne peut pourtant venir voir des meubles, consulter une fiche ou chercher les horaires du magasin.

Les dernières révisions ont rendu les caractéristiques plus précises, mais elles ont aussi ajouté des consignes et des précautions à trop d’endroits. Les six familles ressemblent parfois à des formulaires de préparation. Le Journal contient des conseils utiles, entourés de phrases décoratives abstraites. Les fiches modèles sont généralement les textes les plus concrets : elles nécessitent surtout des coupes et une clarification des libellés techniques.

L’expression « votre projet » figure dans le contenu principal de **21 des 28 pages**, notamment par l’effet des blocs communs. Ce relevé décrit une répétition de discours ; ce n’est ni un score SEO ni un mot à interdire. Une phrase courte de marque peut rester évocatrice. Un conseil de mesure est utile lorsqu’il répond à une question de dimensions. C’est leur usage systématique et sans besoin précis qui pose problème.

## Décisions prioritaires

| Priorité | Constat vérifié | Correction recommandée |
| --- | --- | --- |
| Immédiate | Les erreurs du formulaire proposent WhatsApp, sans lien WhatsApp configuré. | Remplacer cette destination inexistante par le contact réel du showroom. |
| Haute | « Préparer votre visite », « Préciser votre choix avec l’équipe », « Précisons votre projet » et les conclusions avec plans/photos créent des étapes inutiles. | Supprimer les rubriques qui n’apportent que ces consignes ; conserver les accès directs aux collections, au téléphone et à l’itinéraire. |
| Haute | Plusieurs paragraphes parlent de « formes », « matières », « intentions » ou « associations » sans expliquer une différence. | Remplacer par un fait distinctif déjà documenté, ou retirer le paragraphe si l’image, le titre ou les cartes suffisent. |
| Haute | L’article céramique/verre/bois promet une comparaison d’usage qu’il ne fournit pas. | Recentrer le titre et le contenu sur les termes réellement expliqués ; une comparaison de résistance ou d’entretien nécessiterait des sources précises. |
| Haute | Des conclusions présentent le catalogue comme la réponse alors que le fichier reste une démonstration. | Diriger les conseils vers les pages et fiches consultables ; conserver l’avertissement de démonstration jusqu’au remplacement réel du PDF. |
| Moyenne | « Recevoir le catalogue » laisse le mode de réception implicite ; le site fournit un lien de téléchargement et n’envoie pas d’email. | Harmoniser les boutons et l’aide autour du téléchargement réel. Conserver le consentement marketing séparé et facultatif. |
| Moyenne | Certaines données importées restent peu lisibles : « base · metals », « sag. », « GFM71 gaufré balnc », codes répétés. | Corriger la langue et la présentation ; rapprocher les abréviations des plans avant de les développer. Conserver les codes et caractéristiques exacts. |

## Accueil, index des collections et showroom

Les citations ci-dessous viennent du rendu publié. Les noms de champs précisent où effectuer une future correction ; les anciens JSON de migration ne remplacent pas le contenu EmDash.

### Accueil — `/`

| Champ / passage actuel | Décision | Proposition ciblée |
| --- | --- | --- |
| `pages/home.intro` : « puis poursuivez votre projet avec notre showroom de Casablanca » | Couper la progression imposée. Le showroom est un magasin, pas une étape obligatoire du parcours. | Présenter directement le mobilier et les deux destinations : collections et showroom. Garder les boutons déjà explicites. |
| `sections.brand.text` : « La recherche des formes et le travail des matières donnent aux collections leur caractère, avec une attention portée aux espaces de vie. » | Supprimer cette deuxième phrase. Elle pourrait décrire presque toute marque de mobilier. | La première phrase sur la création de la marque peut rester seule ; sa provenance existe dans les sources du projet. Aucun nouveau récit de fabrication n’est nécessaire ici. |
| `brand_caption` : « Formes, matières et savoir-faire italien » | Remplacer si une légende est souhaitée. | « Table Skorpio — plateau en verre et piètement métallique. » La légende doit suivre l’image si celle-ci change. |
| `sections.collections.text` : « Une table autour de laquelle se retrouver, une assise qui trouve sa place, un rangement qui organise la pièce. » | Supprimer le paragraphe complet, y compris la phrase suivante sur les « associations qui vous ressemblent ». | Le titre, les six cartes et le lien vers les collections donnent déjà l’information et la navigation. |
| `sections.showroom.display_heading` : « Découvrez le showroom de Casablanca » | Raccourcir, sans modifier le rôle de la section. | « Le showroom de Casablanca ». |
| `sections.showroom.text` : « Découvrez les matières et les proportions des meubles en situation, puis échangez avec notre équipe… » | Garder les faits sur le magasin, couper la consigne et le vocabulaire abstrait. | « Au Triangle d’Or, notre showroom de 400 m² présente du mobilier pour le salon, la salle à manger et la chambre. » Un seul bouton vers la page showroom suffit. |
| `site_content.map_note` : « Retrouvez le showroom à Casablanca. Ouvrez l’itinéraire pour préparer votre visite. » | Supprimer cette note. | L’adresse, le repère et le bouton « Itinéraire » se comprennent seuls. Conserver l’attribution cartographique et les instructions d’accessibilité. |
| `sections.catalogue.text` : « Conservez les références qui vous attirent pour poursuivre votre découverte avec le showroom. » | Supprimer. Revoir aussi la promesse de la première phrase tant que le PDF est une démonstration. | Expliquer seulement le document réellement disponible et son téléchargement, une seule fois. Voir l’audit d’interface. |
| `sections.journal.text` : « vous donnent des repères pour choisir votre mobilier et imaginer sa place chez vous » | Supprimer ce paragraphe introductif si les cinq titres restent visibles. | Les questions des articles expliquent déjà leur utilité. |
| `meta_description` : « préparez votre visite au showroom de Casablanca » | Réécrire la fin ; le titre SEO actuel est clair. | « Découvrez les collections Cattelan Italia et leurs fiches modèles. Retrouvez l’adresse et les horaires du showroom de Casablanca. » |

**À garder :** les six familles, les titres de navigation, les photographies identifiées, les liens de modèles, la localisation et les contacts réels. « Dessiné en Italie » et « Vivre italien, à Casablanca » sont des accroches de marque : elles ne nécessitent pas un paragraphe explicatif artificiel. Leur tonalité peut être discutée, mais elles sont moins prioritaires que les passages qui demandent une démarche inutile au visiteur.

### Index des collections — `/collections/`

| Champ / passage actuel | Décision | Proposition ciblée |
| --- | --- | --- |
| `pages/collections.intro` : « chaque famille permet d’explorer des formes et des matières pour votre projet » | Couper cette explication du fonctionnement de la page. | Le H1 et les six cartes suffisent. L’introduction peut être vide. |
| `sections.contact` : « Notez son nom et les détails qui vous plaisent. » | Supprimer la consigne ; conserver un lien direct si cette action reste utile. | « Coordonnées du showroom », vers `/showroom-casablanca/#showroom-contact`, sans paragraphe de préparation. |
| `sections.professional` : « Architecte ou décorateur, vous pouvez nous transmettre les références qui vous intéressent pour discuter de votre sélection avec le showroom. » | Supprimer ce bloc dans son état actuel. | Il répète le contact précédent et ne décrit aucun service professionnel distinct. Aucun nouveau service ne doit être inventé pour justifier une rubrique. |
| Deux boutons vers le même showroom : « Contacter le showroom » / « Échanger avec notre équipe » | Conserver une seule action, avec une destination précise. | « Coordonnées du showroom », vers les informations de contact. |
| `families.card_text`, réutilisé sur l’accueil et ici | Retirer la méthode systématique « comparer… choisir… composer… ». | Nommer les types de meubles ou matières qui seront réellement présentés. Propositions des six cartes dans l’audit produits. |

Le titre SEO et la description identifient correctement les catégories. Ils peuvent rester. Les deux encadrés de contact ne sont pas indispensables à la fonction d’orientation de cette page.

### Showroom — `/showroom-casablanca/`

| Champ / passage actuel | Décision | Proposition ciblée |
| --- | --- | --- |
| `intro` : « Au Triangle d’Or, 400 m² réunissent salons, salles à manger et chambres. Une visite permet d’apprécier les volumes, les matières et les associations de mobilier avant de préciser votre sélection. » | Réécrire en langage direct, en gardant uniquement les faits. | « Le showroom Cattelan Italia se situe au Triangle d’Or, à Casablanca. Sur 400 m², il présente du mobilier pour le salon, la salle à manger et la chambre. » |
| `sections.advice.heading` : « Préciser votre choix avec l’équipe » ; texte : « Les possibilités se précisent selon les options proposées pour chaque meuble. » | Supprimer le bloc. | Cette dernière phrase reformule une évidence ; le bloc ajoute un intermédiaire entre la découverte du magasin et les informations pratiques. |
| `sections.visit` : « Préparer votre visite » ; « Apportez les dimensions de votre pièce, quelques photos et, si vous en avez un, votre plan… » | Supprimer le bloc, sans remplacer le titre par une autre formule commerciale. | Le visiteur peut venir découvrir le magasin. La préparation d’un dossier n’a pas à figurer comme une étape de visite. |
| `faq_1` : « Les collections du site présentent une sélection de modèles, pas un inventaire du showroom. » | Regrouper avec la seconde réponse près du téléphone. | Les deux réponses renvoient à un appel et ne justifient pas deux accordéons. Ne pas affirmer que toutes les références sont disponibles. |
| `faq_2` : « Communiquez le nom du modèle, la dimension et la finition qui vous intéressent. » | Remplacer les deux FAQ par une seule note, avec le vrai lien téléphonique. | « Pour les prix, les délais ou savoir si un modèle est exposé, appelez le showroom. » Aucun prix ou délai n’est inventé. |
| `meta_description` : « Découvrez les ambiances et préparez votre visite… » | Remplacer la consigne par les informations que la page contient. | « Showroom Cattelan Italia de 400 m² au Triangle d’Or, à Casablanca : présentation du magasin, adresse, horaires, téléphone et itinéraire. » |
| Template `ShowroomMap.astro` : « Préparer l’itinéraire » | Harmoniser avec la carte de l’accueil. | « Itinéraire ». |

**Structure recommandée :** un titre, une courte présentation, la photo réelle, les coordonnées et les horaires, l’itinéraire et une seule note près du téléphone. La rubrique « Avant votre visite / Questions fréquentes » peut disparaître avec ses deux réponses fusionnées. Le téléphone confirmé par le propriétaire reste prioritaire sur celui de l’article de presse. Les coordonnées et la photo apportent plus que de nouveaux paragraphes sur « l’accompagnement ».

## Familles, modèles, Journal et interface

Les annexes donnent les citations, les champs concernés, les coupes proposées et ce qu’il faut conserver pour chaque page.

- [Six familles et onze modèles](audits/editorial-products-2026-09-29.md) : introductions et cartes, corps, boutons communs, métadonnées, légendes, textes alternatifs, dimensions, plans et finitions.
- [Index et cinq articles du Journal](audits/editorial-journal-2026-09-29.md) : lecture intégrale des articles, chapeaux, sources, conclusions et boutons ; maintien des cinq sujets.
- [Catalogue, confidentialité et textes d’interface](audits/editorial-interface-2026-09-29.md) : formulaires et états conditionnels, menus, pieds de page, carte, erreurs et messages techniques.

## Couverture des 28 pages

| Route | Décision dominante | Détail |
| --- | --- | --- |
| `/` | Alléger fortement les paragraphes entre les scènes | Présent rapport |
| `/collections/` | Garder les cartes, supprimer les introductions et contacts redondants | Présent rapport |
| `/showroom-casablanca/` | Simplifier autour du magasin et de ses informations pratiques | Présent rapport |
| `/catalogue/` | Clarifier le téléchargement réel et retirer l’invitation générique finale | Interface |
| `/confidentialite/` | Conserver l’information de prévisualisation ; texte final dépendant des modalités réelles | Interface |
| `/journal/` | Garder les cartes, supprimer l’invitation de projet | Journal |
| `/collections/tables/` | Présenter la gamme, couper la préparation systématique | Produits |
| `/collections/chaises-tabourets/` | Présenter assises et usages, alléger les consignes | Produits |
| `/collections/canapes-fauteuils/` | Décrire les possibilités, retirer le dossier de projet | Produits |
| `/collections/buffets-bibliotheques/` | Conserver ouvert/fermé et fixation ; couper les évidences | Produits |
| `/collections/luminaires/` | Conserver les caractéristiques ; retirer les généralités d’installation | Produits |
| `/collections/mobilier-exterieur/` | Présenter la famille puis les exemples ; conserver leurs restrictions d’exposition | Produits |
| `/modeles/skorpio/` | Garder les faits, alléger les rappels de variantes | Produits |
| `/modeles/napoleon-keramik/` | Garder les faits, retirer le vocabulaire de publication interne | Produits |
| `/modeles/rhonda/` | Garder la description, éviter la répétition des dimensions | Produits |
| `/modeles/greta/` | Garder la construction, alléger les commentaires et clarifier les nuanciers | Produits |
| `/modeles/ruby/` | Garder structure et revêtements, simplifier le lien avec Ruby Lounge | Produits |
| `/modeles/ruby-lounge/` | Garder les faits, supprimer la reformulation des mesures | Produits |
| `/modeles/chelsea/` | Texte globalement concret, retouches légères | Produits |
| `/modeles/airport/` | Garder modularité et fixation, clarifier dimensions et finitions | Produits |
| `/modeles/bloom/` | Garder les versions, simplifier la formulation de l’option variateur | Produits |
| `/modeles/napoleon-keramik-outdoor/` | Simplifier la langue sans affaiblir les restrictions | Produits |
| `/modeles/greta-outdoor/` | Décrire positivement le revêtement et conserver les restrictions | Produits |
| `/journal/choisir-forme-proportions-table-salle-a-manger/` | Garder circulation et piètement, couper le commentaire décoratif | Journal |
| `/journal/associer-table-chaises-salle-a-manger/` | Garder compatibilité et exemples, couper les notions d’intention | Journal |
| `/journal/ceramique-verre-bois-choisir-finition-meuble/` | Recentrer la promesse et le contenu | Journal |
| `/journal/composer-salon-canape-fauteuil/` | Garder dimensions et passages, couper le dossier final | Journal |
| `/journal/choisir-buffet-bibliotheque-salon/` | Garder le fond pratique, raccourcir les considérations décoratives | Journal |

## Règle de rédaction pour la reprise

1. **Nommer ce que l’on montre.** Une matière, une forme, une différence entre versions ou un renseignement sur le magasin vaut mieux que « des possibilités adaptées à votre projet ».
2. **Couper quand il n’y a rien à ajouter.** Une section composée d’un titre, d’une image et d’un bouton peut être complète. Aucun quota de mots n’est nécessaire pour le référencement. Google recommande un contenu utile au lecteur et ne fixe pas de longueur cible. [Source officielle](https://developers.google.com/search/docs/fundamentals/creating-helpful-content?hl=fr).
3. **Donner un conseil au bon endroit.** Les passages autour d’une table ont leur place dans l’article correspondant. Réunir plans et photos n’a pas à conclure toutes les pages.
4. **Nommer la destination des boutons.** « Voir les tables », « Télécharger le catalogue », « Appeler le showroom », « Itinéraire ». Préserver les actions et les contraintes réellement disponibles.
5. **Conserver les faits et leurs limites.** Dimensions, variantes, références de finitions et restrictions Outdoor ne sont pas du remplissage. Aucune promesse de prix, de stock, de délai ou de service ne doit être ajoutée pour rendre la phrase plus séduisante.

L’ordre de reprise recommandé est : erreurs et promesses incohérentes ; accueil/showroom/index ; six familles et blocs communs ; cinq articles ; retouches des modèles et libellés techniques. Les pages, les modèles et les articles existants restent conservés. La présentation des familles reste générale, avec les modèles comme exemples.

## Preuves et limites de l’audit

- **28 pages sur 28 obtenues en HTTP 200**, sans échec de collecte. Aucun lien interne invalide détecté par l’inventaire ; ce contrôle de lien ne prouve pas la qualité des textes.
- [Inventaire versionné](audits/editorial-inventory-2026-09-29.json) : titres, descriptions, blocs de texte, légendes/alternatives, pieds de page et messages des formulaires, avec empreinte du HTML de chaque route. Les captures HTML complètes restent dans `test-results/editorial-audit-2026-09-29/`.
- Lecture du rendu SSR publié, complétée par les composants pour identifier l’origine et la visibilité des textes. Les copies desktop/mobile de l’accueil, les textes réservés à l’accessibilité, les messages sans JavaScript et le champ antispam masqué ne sont pas assimilés à des répétitions visibles.
- Les messages d’erreur et de succès ont été lus dans le HTML et le code ; aucun formulaire ni téléchargement protégé n’a été soumis. Aucune authentification CMS, modification de contenu, réinitialisation ou publication effectuée pendant cet audit.
- Les données techniques sont examinées pour leur lisibilité et leur cohérence éditoriale. Les 11 PDF techniques externes, chaque référence de nuancier, les droits des images et les futures mentions juridiques ne font pas l’objet d’une nouvelle validation exhaustive ici. Les hypothèses sont indiquées comme telles ; les propositions n’ajoutent aucun fait commercial.
- L’audit ne promet ni classement Google ni résultat de trafic. Les aperçus statiques historiques, l’administration EmDash et les textes de services tiers ne sont pas le périmètre de cette révision du site public.
