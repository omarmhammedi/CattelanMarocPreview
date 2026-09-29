# Audit éditorial — interface, catalogue et confidentialité

Lecture seule, 29 septembre 2026. Le relevé public a été capturé à **11 h 47, heure de Toronto** (`2026-09-29T15:47:35.979Z`). Aucune modification du site, du CMS, de ses réglages ou de ses données ; aucun formulaire envoyé.

## Périmètre et preuves

- Pages lues intégralement : `/catalogue/` et `/confidentialite/`, titres, descriptions, textes, liens, images et formulaire.
- Surfaces communes : navigation ordinateur/mobile, pied de page, identité, liens d’action, fil d’Ariane, mentions d’images, boutons de thème et de carte, titres techniques des fiches modèles.
- États conditionnels : erreurs, attente, succès et indisponibilité du catalogue ; absence de JavaScript ; aperçu éditorial ; erreur de téléchargement ; page 404. Ces états ont été **lus dans les attributs SSR et le code**, pas déclenchés contre la base existante.
- Sources : `test-results/editorial-audit-2026-09-29/report.json`, `page-copy.txt`, `html/`, puis les composants cités ci-dessous. Les valeurs actuelles sont celles du HTML public capturé ; le seed ne sert pas à prouver l’état publié. L’association aux champs repose sur `src/lib/content.ts` et les composants.
- L’extraction SSR contient ensemble les variantes ordinateur/mobile. `noscript`, le piège antispam « Site web » et les consignes de carte masquées visuellement ne sont pas des répétitions visibles ordinaires. Ils ne sont pas comptés comme du remplissage.

**Conclusion :** la navigation et les informations pratiques sont globalement compréhensibles. Le problème se concentre dans les phrases d’accompagnement automatiques (« poursuivre », « projet », « découverte »), les appels à l’action répétés et deux incohérences du formulaire. Le vocabulaire doit décrire ce que le bouton fait, sans supposer que chaque visiteur a un projet à préparer.

Priorités : **P1** = corriger une attente erronée ou un remplissage très visible ; **P2** = simplifier/cohérence ; **P3** = finition. Une recommandation de texte n’est pas une publication ni une validation juridique.

## 1. Catalogue : une action simple, actuellement trop racontée

| Priorité / décision | Texte actuel exact | Origine / surface | Pourquoi et proposition |
| --- | --- | --- | --- |
| P1 — réécrire | « Recevez le catalogue Cattelan Italia » | CMS `pages/catalogue.title`, H1 | « Recevez » associé à un champ email peut faire attendre un email. Le site donne un lien après le formulaire et n’envoie rien. Pour le futur vrai document : **« Télécharger le catalogue Cattelan Italia »**. Dans l’aperçu actuel, conserver une mention explicite de démonstration près du formulaire. |
| P1 — réécrire | « Découvrez les collections en images et prenez le temps de repérer vos pièces préférées. Laissez votre nom et votre adresse email pour accéder au catalogue en PDF. » | CMS `pages/catalogue.intro` | La première phrase commente une utilisation évidente et ne décrit pas le document. Garder seulement une indication de parcours : **« Le lien de téléchargement s’affiche après l’envoi du formulaire. »** En aperçu : ajouter **« Document de démonstration : utilisez des coordonnées fictives. »** Ne pas décrire le contenu d’un futur catalogue non fourni. |
| P1 — supprimer | « Poursuivons votre découverte » ; « Vous pourrez ensuite contacter notre showroom de Casablanca pour parler d’un modèle ou connaître les pièces exposées. » ; « Échanger avec le showroom » | CMS `pages/catalogue.sections`, section reconnue par ce titre ; rendu `src/pages/catalogue.astro` | Ce bloc impose une suite imaginaire au téléchargement. Il n’ajoute ni renseignement sur le PDF ni réponse à une difficulté. Supprimer le bloc. Les coordonnées restent accessibles dans la navigation et le pied de page. |
| P1 — dédupliquer, garder l’avertissement | « Document de démonstration utilisé pour tester le téléchargement. Le catalogue définitif sera ajouté ultérieurement. » **affiché deux fois de suite** | CMS `catalogues.description` + `site_content.placeholder_notice`, tous deux rendus par `src/pages/catalogue.astro:25` | Vraie répétition dans la même vue, indépendante des variantes mobile/ordinateur. Conserver une seule mention explicite, par exemple **« Catalogue de démonstration, utilisé pour tester le téléchargement. »** Le futur PDF et son contenu restent à fournir. |
| P2 — garder | « Document de démonstration » | CMS `catalogues.edition`, sur la couverture décorative | Statut utile et exact. Ne pas le remplacer par une année/édition officielle inventée. |
| P2 — réécrire en cohérence avec le document | « Catalogue Cattelan Italia » | CMS `catalogues.title`, près du document de test | Pour l’état actuel, **« Catalogue de démonstration »** identifie mieux le fichier. Le titre officiel sera repris du vrai PDF quand il sera disponible. Éviter d’afficher simultanément plusieurs titres identiques autour de la couverture. |
| P2 — réécrire | « Catalogue Cattelan Italia \| Recevoir le PDF » | `<title>` actuel ; repli CMS `seo_title`, sous priorité du SEO natif | Pour le vrai document : **« Catalogue Cattelan Italia en PDF »**. En aperçu non indexable, ne pas prétendre que cette seule amélioration rend la page prête à être indexée. |
| P2 — réécrire | « Recevez le catalogue Cattelan Italia après votre demande. Explorez les collections et poursuivez votre projet avec le showroom de Casablanca. » | Description SEO actuelle | Remplacer la seconde phrase abstraite par le parcours réel. Proposition future : **« Téléchargez le catalogue Cattelan Italia en PDF. Le lien est disponible sur cette page après l’envoi du formulaire. »** À utiliser avec le vrai document, pas comme description de son contenu. |
| P3 — garder | « Cattelan Italia · Casablanca » | CMS `pages/catalogue.eyebrow` | Repère de marque/localisation ; nul besoin d’une phrase supplémentaire. |

Le problème « recevoir/télécharger » est transversal : le menu natif contient son propre libellé, `site_content.catalogue_label` pilote plusieurs boutons **et** le bouton du formulaire, les sections de pages et les CTA des articles ont leurs propres champs, et `catalogues.download_label` pilote le lien final. Une correction limitée au H1 laisserait le parcours incohérent. Le menu peut simplement s’appeler **« Catalogue »** ; les appels à l’action **« Télécharger le catalogue »** ; le lien obtenu **« Télécharger le PDF »**. Aucun de ces textes ne doit annoncer un envoi par email.

## 2. Formulaire : textes publiés et états conditionnels

Toutes les valeurs ci-dessous ont été lues dans le HTML publié de `/catalogue/` et des deux formulaires de l’accueil. Le composant partagé est `src/components/CatalogueForm.astro`, le mapping CMS est `src/lib/content.ts:118`.

| Priorité / décision | Texte actuel exact | Champ / état | Proposition et motif |
| --- | --- | --- | --- |
| P1 — réécrire | « Votre demande n’a pas pu aboutir. Réessayez ou contactez-nous sur WhatsApp. » | `form_error`, erreur réseau/générique | **« L’envoi a échoué. Réessayez dans quelques instants. »** Si un recours est proposé, donner un vrai lien vers le téléphone ou les coordonnées du showroom. Aucun WhatsApp n’est publié dans la configuration actuelle ; sa disponibilité n’est pas confirmée dans le README. |
| P1 — réécrire | « Le catalogue est momentanément indisponible. Contactez notre équipe sur WhatsApp pour poursuivre votre demande. » | `form_unavailable`, catalogue absent/non disponible | **« Le catalogue est momentanément indisponible. »** Puis un vrai lien **« Appeler le showroom »** vers le numéro confirmé, ou **« Coordonnées du showroom »** vers sa page. Ne pas conserver une instruction WhatsApp sans destination utilisable. |
| P2 — garder ou raccourcir | « Nom » ; « Adresse email » | `form_name_label`, `form_email_label` | Clairs. Uniformiser éventuellement en **« Nom » / « Adresse e-mail »** dans tous les messages. Ne pas transformer « Nom » en exigence de nom complet sans motif fonctionnel. |
| P2 — garder | « Indiquez votre nom. » ; « Vérifiez votre adresse email. » | `form_name_error`, `form_email_error` ; attributs SSR puis messages locaux/serveur | Directs et utiles. Variante plus précise du second : **« Indiquez une adresse e-mail valide. »** La règle de deux caractères du nom relève de la validation existante, pas d’une consigne commerciale. |
| P2 — réécrire | « Accédez au PDF après l’envoi du formulaire. Aucun compte à créer. » | `form_hint` | Le fond est exact. **« Le lien de téléchargement s’affiche après l’envoi du formulaire. »** indique aussi où chercher. « Aucun compte à créer » peut rester si utile, mais n’est pas indispensable. En phase de test, faire apparaître l’instruction d’utiliser des coordonnées fictives ici, pas seulement dans la page de confidentialité. |
| P2 — garder, préciser le caractère facultatif | « Je souhaite également recevoir les nouveautés et invitations du showroom. » | `form_opt_in_label`, case non cochée et non requise | Consentement distinct du téléchargement, à conserver. Version plus directe : **« Je souhaite recevoir les nouveautés et invitations du showroom par e-mail (facultatif). »** Ce choix n’autorise pas à affirmer qu’un service d’envoi est déjà actif. |
| P2 — raccourcir | « Vos coordonnées permettent de traiter votre demande de catalogue. Pour en savoir plus sur leur utilisation, consultez notre politique de confidentialité. » | `form_privacy`, suivi du lien codé « Confidentialité » | Pour l’aperçu : **« Vos coordonnées sont enregistrées pour tester le téléchargement. »**, avec le lien existant. Pour le site final, employer uniquement les usages réellement définis ; ne pas inventer « uniquement », une durée ou une absence de partage. |
| P2 — raccourcir | « Votre demande est en cours… » | `form_pending` | Déjà compréhensible. **« Envoi en cours… »** décrit plus précisément l’attente. |
| P2 — réécrire | « Votre catalogue est prêt » | `form_success_title` | **« Le PDF est prêt »**, compatible avec le document de test et la future édition. Le fichier n’est pas encore téléchargé : ne pas afficher « Téléchargement terminé ». |
| P2 — supprimer le remplissage, ajouter une information utile | « Merci pour votre intérêt. Vous pouvez maintenant télécharger le catalogue et poursuivre votre découverte à votre rythme. » | `form_success_text` | **« Ce lien de téléchargement est valable 15 minutes. »** Durée constatée dans `DOWNLOAD_LIFETIME_MS` et le contrat du plugin. La seconde action « poursuivre votre découverte » n’aide pas à télécharger. |
| P2 — garder | « Télécharger le PDF » | `catalogues.download_label`, lien après succès | Décrit exactement l’action. Aucune promesse email. |
| P3 — garder | « Activez JavaScript pour télécharger le catalogue, ou contactez le showroom. » | Texte codé `<noscript>` | Consigne de secours, pas une phrase visible quand JavaScript fonctionne. Un lien vers le showroom la rendrait actionnable. Ne pas la supprimer comme du remplissage. |
| P3 — garder hors parcours visible | « Site web » | Champ piège antispam codé, masqué/`aria-hidden` | Ni champ métier supplémentaire ni défaut de rédaction visible. |
| P3 — garder dans l’aperçu éditorial | « Prévisualisation du catalogue : le formulaire public continue à utiliser l’édition publiée. » | `src/pages/catalogue.astro:18`, `previewOnly` | Message réservé à l’édition/prévisualisation : explique une vraie limite de publication. Ce n’est pas un argument commercial à montrer sur la page ordinaire. |

### Messages du serveur et du PDF

Source : `src/plugins/catalogue/core.ts` et `runtime.ts`. Revue de code uniquement ; aucun POST, jeton signé, contact ou téléchargement protégé créé pendant l’audit.

| Texte / comportement actuel | Décision |
| --- | --- |
| « Votre demande est enregistrée. Le catalogue est prêt à être téléchargé. » | Conserver comme réponse API ; le formulaire affiche actuellement les messages CMS de succès, pas cette phrase. |
| « Trop de demandes. Veuillez réessayer plus tard. » | Bon message de limitation. Le frontend actuel le masque derrière `form_error` : distinguer ce cas lors d’un futur correctif d’interface, sans changer les limites ni ajouter une attente chiffrée inventée. |
| « Rechargez la page avant de réessayer. » ; « Les informations ont changé. Rechargez le formulaire. » | Consignes de récupération concrètes. Actuellement masquées par l’erreur générique CMS hors erreurs nom/email. Une phrase générique « Réessayez » ne dit pas toujours l’action réellement nécessaire. |
| « Veuillez compléter le formulaire. » ; « Veuillez vérifier les informations saisies. » ; « Le formulaire n’a pas pu être envoyé. » | Garder pour les réponses d’entrée invalide. Ne pas multiplier leur visibilité si le nom/email dispose déjà d’un message ciblé. |
| « Veuillez vérifier votre choix de communication. » | Réponse à un payload invalide, pas à une case laissée vide. Ne pas la reformuler en consentement obligatoire. |
| « Veuillez utiliser le formulaire depuis ce site. » | Message d’origine refusée : clair. Ne pas le confondre avec une demande de connexion utilisateur. |
| « Ce lien a expiré ou n’est pas valide. Veuillez refaire votre demande de catalogue. » | Message exact pour expiration **ou** jeton invalide. Proposition : **« Ce lien n’est plus utilisable. Retournez au formulaire pour obtenir un nouveau lien. »** Ajouter un retour réel vers `/catalogue/` dans une future page d’erreur ; ne pas faire croire que le lien de connexion EmDash et celui du PDF sont la même chose. |
| « Catalogue temporairement indisponible. » | Correct, mais isolé dans une réponse brute sans issue. Garder le constat et offrir **« Revenir au catalogue »** ou les coordonnées, sans promettre un délai. |
| Variantes internes « Le catalogue est temporairement indisponible. », « Ce catalogue n’est pas disponible pour le moment. », « Le catalogue est momentanément indisponible. Veuillez réessayer plus tard. », « Votre demande n’a pas pu être finalisée. Veuillez réessayer. » | Harmoniser le message effectivement rendu. Ne pas compter toutes ces chaînes comme des paragraphes visibles sur une seule page. |

## 3. Textes transversaux

| Priorité / décision | Texte actuel exact | Source / surfaces | Proposition |
| --- | --- | --- | --- |
| P1 — supprimer le remplissage | « Cattelan Italia au Maroc. Découvrez les collections et poursuivez votre projet avec notre showroom de Casablanca. » | CMS `site_content.footer_text`, accueil et toutes les pages intérieures | Supprimer ce paragraphe redondant avec le logo, la navigation et les coordonnées. Si une ligne de présentation est souhaitée : **« Mobilier Cattelan Italia à Casablanca. »** Aucune injonction à « poursuivre » un projet. |
| P2 — réécrire sans masquer le statut de travail | « Cette prévisualisation présente la direction de design. Les textes et les images sont provisoires : l’objectif est de valider le design avant de finaliser le contenu. » | CMS `site_content.preview_notice`, tous les pieds de page | État devenu trop général : des données et photographies sont désormais vérifiées. **« Version de travail. Certains visuels et le catalogue restent provisoires. »** Ne pas supprimer toute mention de test tant que le document et la confidentialité restent provisoires. |
| P2 — garder | « Collections », « Showroom », « Journal » | Menu natif `primary`, en-tête et pied de page | Intitulés courts, destinations cohérentes. Aucun besoin de les développer en promesses de conseils. |
| P2 — simplifier | « Recevoir le catalogue » | Menu natif `primary` | **« Catalogue »** dans le menu ; cohérence avec la révision du parcours ci-dessus. Les champs du menu sont distincts du bouton global. |
| P2 — garder selon destination | « Découvrir » ; « Découvrir le modèle » ; « Lire l’article » ; « Lire le Journal » | Champs CMS globaux/sections et `ModelCard.astro` | Libellés adaptés à des pages d’information. « Voir le modèle » est une alternative plus neutre, mais ne change pas l’utilité du lien. Il n’est pas nécessaire de remplacer tous les verbes identiques pour créer de la variété. |
| P2 — préciser selon destination | « Contacter le showroom » ; « Échanger avec le showroom » | Champ global `contact_label`, CTA éditoriaux et composants | Si le lien mène à une page de coordonnées : **« Coordonnées du showroom »**. Pour un vrai `tel:` : **« Appeler le showroom »**. Ne pas remplacer aveuglément le champ global si certains usages mènent un jour à WhatsApp. Éviter « Échanger » pour une simple navigation. |
| P1 — supprimer les accroches automatiques | « Pour poursuivre votre découverte » / « Précisons votre projet » | **Code**, `src/pages/collections/[slug].astro`, six fins de pages | Garder seulement des actions utiles et explicites. Si aucune information nouvelle n’accompagne ces boutons, ces deux titres ne sont pas nécessaires. |
| P1 — supprimer les accroches automatiques | « Votre projet » / « Parlons de votre intérieur. » | **Code**, `src/components/ModelDetail.astro`, onze fiches | Ne pas supposer un projet d’aménagement global chez chaque lecteur d’une fiche. Variante si un titre est requis : **« Une question sur ce modèle ? »**, avec un lien réel vers les coordonnées. Les boutons seuls peuvent suffire. |
| P2 — raccourcir en gardant le fait utile | « Cette sélection présente des modèles de la marque. Contactez notre showroom de Casablanca pour connaître les possibilités de commande et vérifier les modèles exposés. » | CMS `site_content.model_notice`, et copies identiques dans `models.availability_note` | L’absence d’inventaire de stock est une information utile, pas du remplissage. Proposition : **« Pour connaître les prix, les délais ou les modèles exposés, contactez le showroom. »** Garder une seule occurrence par page ; vérifier aussi les notices propres aux modèles lors d’une révision CMS. Aucune disponibilité garantie. |
| P3 — garder | « Vivre italien, à Casablanca » | Réglage natif `settings.tagline`, selon le rendu | Signature de marque : elle peut rester expressive. Elle n’a pas à devenir une liste technique ; éviter seulement de la répéter dans chaque paragraphe. |
| P3 — garder | « Maroc » ; « Casablanca, Maroc » ; numéro et adresse publiés | `brand_location`, `city`, contacts confirmés | Identité et informations pratiques distinctes. Ne pas réintroduire Casablanca dans le logo sous prétexte d’uniformiser les textes. |
| P3 — garder | « Explorer » ; « Confidentialité » ; « Défiler » ; « Menu » | Code/footer, CMS pour le défilement | Libellés fonctionnels. « Explorer » n’est pas un paragraphe de remplissage. |

### Petits titres et aide à la lecture

- Familles : « La sélection » / « Quelques pièces à découvrir » peut devenir un seul **« Quelques modèles »**. Ce sont bien des exemples, pas une liste de modèles en stock. « À lire dans le Journal » est utile lorsqu’un véritable article est lié.
- Modèles : « En images » / « Sous tous les angles. » peut devenir **« Le modèle en images »** ; « Dans le détail » / « Dimensions & proportions. » devient **« Dimensions »** ; « Matières & couleurs » / « Les finitions. » devient **« Finitions »**. Les mots « proportions » et « tous » n’ajoutent rien aux données présentées. Ne pas supprimer les dimensions, codes et particularités des versions.
- « Le modèle », « Année », « Plans & détails », « Télécharger la fiche technique PDF », « Voir la fiche Cattelan Italia », « finition » / « finitions », « place » / « places » sont des repères utiles. « Plans et détails » est une simple harmonisation typographique possible.
- Articles : le panneau codé **« Pour aller plus loin »** contient surtout des sources officielles externes. **« Sources »** décrit plus précisément ce contenu ; ce panneau ne constitue pas du remplissage s’il permet de vérifier les informations.
- Fils d’Ariane : « Collections » puis famille et modèle ; retour « Journal ». Garder ces repères. Les titres de famille ou d’article restent des contenus éditoriaux audités séparément.

## 4. Carte, thème et accessibilité

| État / source | Texte actuel | Décision |
| --- | --- | --- |
| Accueil, lien de directions | « Itinéraire » | Garder. Décrit l’action et n’impose pas de « préparer » quoi que ce soit. |
| `ShowroomMap.astro`, page showroom | « Préparer l’itinéraire » | **Réécrire « Itinéraire »**, cohérent avec l’accueil. Le lien ouvre Google Maps. Cela ne résout pas les restrictions de fenêtres externes du navigateur intégré VS Code. |
| `ShowroomMap.astro`, ouverture/fermeture | « Afficher la carte interactive » / « Masquer la carte interactive » ; « Google Maps » | Garder : action et fournisseur précis. Si ces libellés changent, modifier aussi la citation dans la confidentialité. |
| `GeographicMap.astro`, commandes | « Zoomer sur la carte », « Dézoomer la carte », « Recentrer la carte », « Déplacer la carte » | Garder. Les titres courts « Zoomer », « Dézoomer », « Recentrer » sont cohérents. Le bouton de déplacement utilise `aria-pressed` pour son état. |
| `GeographicMap.astro:44`, aide masquée visuellement | « Au trackpad, déplacez deux doigts pour parcourir la carte et pincez pour zoomer. Utilisez aussi + et − pour zoomer. Activez le déplacement pour faire glisser la carte, ou utilisez les flèches au clavier. Échap termine le déplacement. » | **Garder l’aide**, qui décrit de vrais gestes et n’est pas un paragraphe commercial visible. Une réorganisation par geste pourrait améliorer sa lecture, mais supprimer cette aide serait une perte d’accessibilité. |
| Carte, titres accessibles | « Carte de Casablanca » ; « Carte géographique de Casablanca — Cattelan Italia Maroc » ; « Itinéraire vers Cattelan Italia Maroc » | Garder : nom de zone, sujet et destination. |
| Attribution cartographique | « © OpenStreetMap contributors » ; « Données ODbL » | Garder l’attribution et son lien. Option de clarté : **« Données de la carte (ODbL) »** pour le téléchargement ; ne pas traiter l’attribution comme du remplissage. |
| Thème | « Activer le thème clair » / « Activer le thème sombre » | Garder, même si l’interface montre seulement une icône. Le libellé décrit le résultat du clic. |
| Navigation et accès | « Aller au contenu », « Navigation principale », « Navigation mobile », « Navigation de pied de page », « Ouvrir le menu », « Fermer le menu », « Fil d’Ariane », « Retour au Journal » | Garder. Textes d’accessibilité ou de navigation, pas des slogans. |

Les noms de rues et quartiers proviennent des données géographiques, pas d’une rédaction de marketing. Cet audit ne propose aucune modification du comportement de la carte.

## 5. Légendes et textes alternatifs

- Les références publiées **« Salle à manger avec table Skorpio en verre et piètement sculptural — Cattelan Italia »**, **« Détail du piètement métallique et du plateau en verre de la table Skorpio »** et **« Salon présenté au showroom Cattelan Italia à Casablanca »** identifient des sujets concrets : garder. La description d’image n’a pas à inviter le lecteur à contacter le showroom.
- Les anciennes valeurs **« Ambiance tables — visuel provisoire »**, **« Ambiance de salon contemporain — visuel provisoire »**, **« Ambiance de mobilier — illustration provisoire de l’article »**, **« Ambiance de salle à manger — couverture de démonstration »** sont encore publiées. Le statut provisoire est honnête, mais « ambiance de mobilier » décrit mal une image pour une personne qui ne la voit pas. Réécrire les descriptions après inspection des images finales ; ne pas simplement supprimer « provisoire » ni attribuer un modèle/lieu non identifié.
- La légende visible **« Photographie d’ambiance provisoire. »** mérite d’être remplacée avec son image. Elle n’est pas à supprimer pour faire croire que les visuels ont été validés.
- Les galeries publient des alternatives indexées, par exemple **« Skorpio — photographie officielle 1 »** ; le composant prévoit aussi le repli **« Skorpio — vue 1 »** si l’alt est vide. Elles identifient l’ordre, pas le contenu visuel. Une passe dédiée pourra décrire les vues qui apportent une information différente, après inspection. Ne pas inventer de finition dans l’alt.
- Les miniatures de galerie et la couverture purement décorative de l’accueil ont des `alt=""` intentionnels ; les boutons ou images principales portent déjà leur nom. Un alt vide n’est pas automatiquement un manque de contenu.
- Les logos portent « Cattelan Italia » à l’accueil et « Cattelan Italia Maroc » dans les pages intérieures ; les liens ont un nom accessible de marque/accueil. Ce n’est pas un paragraphe SEO à enrichir avec des mots-clés.

## 6. Confidentialité et page introuvable

La confidentialité est **codée dans `src/pages/confidentialite.astro`**, non éditée dans une collection EmDash. Le texte actuel concerne explicitement la prévisualisation et ne constitue pas une politique finale validée.

| Texte actuel exact | Décision |
| --- | --- |
| « Version de travail » ; « Confidentialité » ; titre « Confidentialité de la prévisualisation » | Garder pour l’état actuel. |
| « Ce site est une prévisualisation en cours de développement. Utilisez des coordonnées fictives pour tester le formulaire catalogue. » | Garder le sens. Plus court : **« Ce site est en cours de développement. Utilisez des coordonnées fictives pour tester le téléchargement du catalogue. »** Faire apparaître cette consigne aussi près du formulaire. |
| « Les coordonnées saisies sont enregistrées dans la base de test du site pour vérifier le téléchargement du PDF. Aucun envoi de message ni transfert vers un CRM externe n’est activé. » | Information concrète sur le fonctionnement actuel, à garder. Formulation plus simple possible : **« Les coordonnées saisies sont enregistrées pour tester le téléchargement. Aucun e-mail n’est envoyé et aucun CRM externe n’est connecté. »** Ne pas transformer cela en promesse permanente du futur site. |
| « La carte interactive du showroom utilise Google Maps. Elle se charge uniquement lorsque vous choisissez « Afficher la carte interactive » ; votre navigateur se connecte alors aux services de Google. Le bouton d’itinéraire ouvre également Google Maps. » | Garder. Pour distinguer les deux cartes : **« Sur la page showroom, Google Maps se charge lorsque vous cliquez sur “Afficher la carte interactive”. Votre navigateur se connecte alors à Google. Les boutons d’itinéraire ouvrent aussi Google Maps. »** La carte dessinée de l’accueil lit des données locales ; ne pas dire que toute carte charge Google. |
| « La politique définitive, avec l’identité du responsable, les modalités d’exercice des droits et la durée de conservation, sera finalisée avant la collecte de demandes réelles. » | Conserver le statut incomplet dans l’aperçu. La future politique réclame des faits d’exploitation réels ; l’audit ne peut ni les inventer ni confirmer une conformité juridique. Ce n’est pas du texte à allonger pour le SEO. |
| « Cette page est introuvable. » ; « Revenir à l’accueil » | `src/pages/404.astro` : garder. C’est bref, compréhensible et actionnable. Pas de formule humoristique ni d’injonction à démarrer un projet nécessaire. |
| « Page introuvable », « Collection introuvable », « Article introuvable », « Modèle introuvable » | Réponses 404 de certaines routes de contenu : sens clair. Leur cohérence visuelle et la présence d’un retour relèvent d’un contrôle de parcours distinct ; ne pas prétendre avoir testé chaque cas ici. |

## Priorités de la prochaine révision

1. Retirer les promesses de recours WhatsApp non configuré et harmoniser le parcours autour du téléchargement sur le site.
2. Supprimer les blocs automatiques « poursuivre votre découverte/projet » et le paragraphe de pied de page redondant ; garder les liens explicites.
3. Garder une mention de PDF de démonstration, une consigne de coordonnées fictives près du formulaire, et une confidentialité fidèle à la phase actuelle.
4. Rendre le succès, les erreurs et l’expiration actionnables ; conserver consentement facultatif, messages d’accessibilité et avertissements factuels.
5. Décrire le vrai document et les images définitives seulement quand ils seront fournis/confirmés.

## Limites

Ce volet ne remplace pas l’audit des paragraphes de l’accueil, des six familles, des onze modèles, du showroom et des cinq articles. Il ne revalide ni les données fabricant, ni les droits sur les images, ni une politique juridique. Aucun état de formulaire nécessitant une mutation n’a été exercé ; aucun contact, secret ou jeton n’a été lu. Le PDF protégé n’a pas été demandé. Les citations d’états conditionnels sont fondées sur les valeurs SSR et le code, pas sur un parcours de soumission exécuté. Les pages et le CMS restent inchangés.
