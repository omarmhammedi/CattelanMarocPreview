# Révision éditoriale complète — 29 septembre 2026

Horaires exprimés dans le fuseau de Toronto (`America/Toronto`). Révision du site existant sur `feat/emdash-migration`, après approbation du [réaudit éditorial](editorial-audit-2026-09-29.md).

## Résultat

Les 28 pages restent accessibles : accueil, index, showroom, catalogue, confidentialité, six familles, onze modèles et cinq articles. La migration cible 28 entrées EmDash, dont la configuration commune ; la confidentialité relève du code. Elle conserve les six familles et la présentation des modèles comme exemples.

- Accueil : paragraphes génériques retirés, présentation du magasin raccourcie, légende Skorpio explicite ; compositions et images conservées.
- Showroom : présentation du lieu, photo réelle, adresse, horaires, téléphone et itinéraire. Les blocs de préparation et les FAQ répétitives deviennent une seule note auprès du téléphone.
- Collections : introductions de gamme, matières et différences concrètes ; suppression des rubriques qui demandaient plans, photos ou préparation d’un projet. Restrictions Outdoor maintenues.
- Modèles : faits, versions, dimensions, plans, finitions, photos et PDF conservés ; paragraphes allégés, catégories de finitions plus lisibles et codes non répétés. La correction « balnc » → « blanc » concerne seulement le rendu du libellé connu GFM71 ; la donnée native est intacte.
- Journal : cinq articles raccourcis et huit liens contextuels ajoutés. L’article matières explique les termes Keramik, Wood, CrystalArt et Brushed ; il ne promet plus une comparaison de résistance ou d’entretien non documentée. Les boutons mènent aux familles pertinentes.
- Catalogue : « Télécharger » décrit le résultat réel du formulaire, sans promesse d’e-mail. Une seule occurrence de l’avertissement de démonstration sur sa page. Messages d’erreur sans WhatsApp inventé, lien vers les coordonnées et consignes serveur de récupération conservées. Consentement marketing séparé, facultatif et non coché.
- Pieds de page : paragraphe de projet supprimé ; statut provisoire toujours explicite.

Les définitions matières ont été recoupées sur les [variantes officielles Skorpio](https://www.cattelanitalia.com/fr/products/B217DE70-0F32-41F5-975B-FD6273164AF8) et les [brochures officielles](https://www.cattelanitalia.com/fr/catalogues). Les dimensions et revêtements Ruby/Ruby Lounge sont étayés par le [catalogue officiel canapés et fauteuils](https://download.cattelanitalia.com/catalogues/718.pdf?t=1774003834). Aucune disponibilité, aucun prix, délai ou service commercial n’est ajouté.

## Publication et conservation

Publication dans l’aperçu existant le **29 septembre, de 12 h 23 min 12 s à 12 h 24 min 04 s, heure de Toronto** : 28 entrées, six couples SEO natifs et un libellé de menu. La seconde simulation indique **zéro changement**. La session technique native a été fermée à 12 h 24 min 50 s ; son ancien cookie reçoit HTTP 401, et seul le nouveau fichier de session a été supprimé.

Vérification de conservation à **12 h 27 min 54 s** : 51 tables protégées intactes, les 28 entrées et leurs seuls champs autorisés conformes, 69 anciennes révisions conservées et 28 nouvelles vérifiées, 627 fichiers (191 784 549 octets) inchangés. Les 624 médias, deux utilisateurs, deux passkeys, contacts, PDF et secrets sont préservés. Aucun utilisateur ajouté. Les compteurs et index internes EmDash/D1 évoluent normalement ; ils sont distingués des données éditoriales et protégées.

La migration 0010 utilise les API natives avec vérification des états exacts, révisions, schémas, relations et SEO, sauvegarde privée préalable et refus des brouillons ou modifications concurrentes. Les médias et PDF ne sont pas réimportés. Les publications sont séquentielles ; le SEO natif est enregistré immédiatement, indépendamment des brouillons. L’API menu n’offre pas de révision conditionnelle : le libellé seul est envoyé après relecture, puis tout le menu est comparé.

Les preuves publiques sont réunies dans [le relevé de validation](audits/editorial-refresh-2026-09-29.json), sans identifiant de connexion ni donnée de contact privée.

Les quatre manifestes `content/editorial-refresh-*.json` servent à cette migration et à ses tests. Ils ne remplacent pas EmDash au rendu. Les bases, médias, secrets, contacts et identités de l’aperçu n’ont jamais été copiés dans les essais jetables.

## Vérifications

- **101 tests unitaires réussis**, dont 13 nouveaux contrôles de migration et 7 de présentation des finitions/messages. Concurrence entre préparation, sauvegarde et publication, brouillons, effacements, préservation et idempotence sont couverts.
- **Astro : 102 fichiers, zéro erreur, avertissement ou indication.** Validation du seed uniquement, sans réimport. Build réussi en **20,97 s** ; l’avertissement existant sur les bundles supérieurs à 500 Ko reste présent.
- **9 contrôles CMS natifs sur une base jetable** : 28 publications et menu, préservation, réapplication sans écriture, brouillons privés, aperçu signé valide/invalide, emplacement et effacement de la note contact, sections arbitraires, effacement des scènes d’accueil et CTA d’article, SEO immédiat et repli après effacement. Tous les changements temporaires sont restaurés.
- Le parcours **contacts/catalogue/PDF** est testé dans cette même base jetable, avant et après la révision : validation, origine/CSRF, dédoublonnage, consentements absent/faux/vrai, téléchargements vérifiés par SHA-256, changement de PDF en brouillon puis publié, ancien lien, faux jeton et révocation après suppression. Deux soumissions Chromium réelles vérifient les choix marketing. Aucun CRM externe ni e-mail envoyé. La fixture, son compte et sa passkey sont distincts et ont été supprimés après arrêt du serveur.
- **65 contrôles publics réussis** dans Chromium et WebKit, en clair et sombre, à 1440 × 900 et 390 × 844 : 224 visites de compositions, 28 routes avec textes et métadonnées vérifiés, 199 liens internes et ancres, ainsi que les PDF techniques par HEAD. Navigation, thèmes au clavier, animations normales, mouvement réduit, erreurs locales du formulaire et consentement facultatif passent. Zéro erreur JavaScript, tentative d’écriture ou accès privé ; dix captures conservées ci-dessous. Les tests de contenu complets tournent une fois dans Chromium, les quatre combinaisons moteur/thème couvrent chacune les 28 pages aux deux tailles.

Deux corrections ont concerné uniquement le harnais de navigateur : cibler le `<title>` du `<head>` sans compter les titres accessibles des SVG, et attendre le décodage des images réellement visibles après prise en compte du viewport et des zones rognées. Le premier filtre attendait des images lazy du carrousel hors écran mobile ; la photo visible du showroom était chargée. Aucun style ni chargement produit n’a été changé pour faire passer ces contrôles.

## Captures

Captures de l’aperçu publié à 1440 × 900 et 390 × 844, sans modifier les styles pour la prise de vue. Les positions correspondent aux contenus contrôlés ; elles ne constituent pas une comparaison pixel à pixel avec l’ancienne maquette.

| Page | Ordinateur, sombre | Mobile, clair |
| --- | --- | --- |
| Accueil — showroom | [Capture](screenshots/editorial-refresh-2026-09-29/home-showroom-1440-dark.jpg) | [Capture](screenshots/editorial-refresh-2026-09-29/home-showroom-390-light.jpg) |
| Coordonnées du showroom | [Capture](screenshots/editorial-refresh-2026-09-29/showroom-contact-1440-dark.jpg) | [Capture](screenshots/editorial-refresh-2026-09-29/showroom-contact-390-light.jpg) |
| Famille Tables | [Capture](screenshots/editorial-refresh-2026-09-29/family-tables-1440-dark.jpg) | [Capture](screenshots/editorial-refresh-2026-09-29/family-tables-390-light.jpg) |
| Article sur les tables | [Capture](screenshots/editorial-refresh-2026-09-29/journal-table-1440-dark.jpg) | [Capture](screenshots/editorial-refresh-2026-09-29/journal-table-390-light.jpg) |
| Formulaire catalogue | [Capture](screenshots/editorial-refresh-2026-09-29/catalogue-form-1440-dark.jpg) | [Capture](screenshots/editorial-refresh-2026-09-29/catalogue-form-390-light.jpg) |

## Limites

La prévisualisation reste privée et non indexable. Aucun déploiement, domaine, Cloudflare ou CRM raccordé ; PR conservée en brouillon et branche `main` intacte. Les aperçus statiques et GitHub Pages ne sont pas modifiés.

Le PDF reste un document de démonstration. Certaines images d’ambiance sont encore provisoires ; les droits pour la mise en ligne définitive et les modalités commerciales/juridiques restent à finaliser. Les légendes numérotées des plans/photos et les abréviations techniques non vérifiées (notamment `sag.`/`bisc.`) sont conservées plutôt qu’interprétées. Les réponses d’erreur directes du téléchargement PDF restent des messages serveur simples ; le retour au formulaire est disponible dans le parcours du site, sans nouvelle page d’erreur dédiée.

Le serveur local s’est arrêté pendant le premier passage WebKit, entraînant un refus de connexion. Aucun événement OOM du cgroup n’a été signalé ; la cause n’est pas confirmée. L’aperçu a été relancé avec la même base et les mêmes secrets, sans modifier le démarrage ou l’arrêt automatique. Les contrôles concernés ont été repris après relance.

Les contrôles de navigateur ne remplacent pas un essai sur iPhone physique. Aucun résultat Google ou trafic n’est garanti et aucune nouvelle parité pixel par pixel avec la version B n’est revendiquée. Le bouton d’itinéraire conserve sa destination Google Maps ; le navigateur intégré Simple Browser de VS Code peut bloquer son ouverture dans une autre fenêtre.

## Accès

- [Site](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/)
- [Showroom](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/showroom-casablanca/)
- [Administration EmDash](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/_emdash/admin/)

Ces liens privés fonctionnent tant que le Codespace et l’aperçu sont démarrés. L’arrêt automatique existant après fin de tâches reste inchangé.
