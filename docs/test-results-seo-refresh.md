# Révision SEO 0011 — publication et résultats

État du 29 septembre 2026. Toutes les heures de ce rapport sont celles de **Toronto** (`America/Toronto`, HAE).

Les [preuves agrégées](audits/seo-refresh-2026-09-29.json) consignent les versions, publications, préservation, contrôles et mesures CPU, sans identifiants de connexion ni données de contacts.

**Les 27 entrées et les correctifs sont publiés ; les derniers contrôles publics passent dans Chromium et WebKit.** Le contrôle final des 28 routes et les huit cas de rendu du formulaire passent aussi sur la dernière version. Aucune réponse 503 n’a été observée dans ces suites après optimisation. La capacité de l’hébergement reste toutefois à confirmer avant lancement définitif : une version précédente a produit des erreurs Cloudflare 1102 avec `exceededCpu` à 10 ms, et certains temps CPU mesurés dépassent encore ce budget. Les essais réussis ci-dessous ne sont pas un test de stabilité de longue durée.

- Site : <https://cattelan-maroc-preview.omar-8b8.workers.dev/>
- EmDash : <https://cattelan-maroc-preview.omar-8b8.workers.dev/_emdash/admin/>
- Version des mesures avant/après d’images : `058227fd-2705-441b-9152-6f12ecec196c`.
- Version des contrôles de présentation et d’interaction après suppression des relectures SEO : `a8c61922-0a9b-4f4a-b65f-08292ccbbc8e`.
- Dernière version déployée, incluant le partage des données du formulaire catalogue : `a4eed856-99ec-435e-bc14-d1361c68c7c8`. Les contrôles HTTP et de rendu du formulaire sont réussis sur cette version.
- Branche : `feat/emdash-migration`. Le domaine commercial et l’indexation restent désactivés.

## Changements réalisés

Le [manifeste 0011](../content/seo-editorial-2026-09-29.json) reprend quatre pages, la configuration commune, six familles, onze modèles et cinq articles. Les URL et les pages existantes sont conservées. Les [choix éditoriaux sourcés](seo-editorial-2026-09-29.md) expliquent les descriptions, comparaisons et liens ajoutés, ainsi que les affirmations volontairement exclues.

Les familles décrivent la gamme et les critères de choix ; les fiches détaillent les modèles précis ; les articles répondent à des questions de choix et orientent vers les collections ou modèles concernés. Douze textes alternatifs ont été corrigés après inspection des images existantes. Les photos, plans, nuanciers et fichiers de la médiathèque n’ont pas été remplacés. Les caractéristiques des meubles ne sont pas présentées comme un inventaire du showroom.

Les titres SEO natifs restent prioritaires sur les champs éditoriaux de repli. Les images de partage utilisent des URL absolues et une icône est fournie à partir des réglages existants. Le balisage structuré décrit le magasin (`FurnitureStore`), les modèles (`Product`), les articles (`BlogPosting`) et les fils d’Ariane (`BreadcrumbList`). Il n’ajoute aucun prix, stock, avis ou service non confirmé. Les valeurs effacées dans EmDash ne réapparaissent pas sous forme de coordonnées de secours.

Les métadonnées réutilisent désormais les données déjà chargées pour le rendu de la page. Le formulaire catalogue reçoit également les réglages et le catalogue déjà lus par sa page, sans changer son interface. Ces deux optimisations sont déployées.

Sur l’accueil, l’espace de « Dessiné en Italie » est rétabli. Le long texte d’introduction et le texte de la carte catalogue deviennent des paragraphes tout en conservant leurs styles. Les images disposent de dimensions intrinsèques ; les variantes WebP passent par le service d’images natif EmDash. Leurs tailles de rendu tiennent compte du recadrage CSS ; les cadres, proportions, positions et animations existants sont conservés. Les plans et nuanciers restent sur leurs images originales.

## Publication et préservation

La publication native des **27 entrées** est terminée à **19 h 05**. Les six couples titre/description du panneau SEO natif sont inclus dans la migration. La dernière préparation en lecture seule ne propose plus aucune entrée à modifier.

La comparaison avant/après de la base distante, réalisée à **19 h 09 min 40 s**, confirme :

| Contrôle | Résultat |
| --- | --- |
| Intégrité de la base | `ok`, aucune violation de clé étrangère |
| Tables applicatives examinées | 74 ; 57 strictement inchangées |
| Champs éditoriaux non ciblés | Tous conservés |
| Révisions historiques | 99 conservées ; 27 nouvelles révisions |
| Comptes et passkeys | 2 utilisateurs et 3 credentials inchangés |
| Médiathèque | 625 fiches inchangées |
| Schémas, relations et menu | Inchangés |
| Catalogue, contacts et état du plugin | Inchangés |

Les autres différences concernent les contenus et métadonnées ciblés, leurs révisions, et les mécanismes natifs de publication, d’indexation des usages médias ou d’autorisation temporaire. La comparaison ne prétend donc pas que toute la base est identique après une publication. Les sauvegardes, données d’authentification et détails des contacts restent privés dans `.wrangler/` et ne sont pas joints à ce rapport.

Le PDF privé de démonstration a été relu : **23 232 octets**, SHA-256 `7fc069fe5b9aef04a950e93cd1b78f133bf4862de6f74189fb68d9c3ec694cf4`, identique au fichier initial. Aucune réinitialisation ni réimportation du seed n’a été effectuée. Les publications 0011 concernent la copie Cloudflare ; les contenus du CMS local ne se synchronisent pas automatiquement avec elle.

## Contrôles réussis et portée

| Contrôle | Résultat enregistré | Portée |
| --- | --- | --- |
| Tests unitaires | 138 réussis initialement ; 140 après suppression des relectures SEO | Images, métadonnées, règles de migration, contexte de rendu et régressions existantes |
| Vérification Astro | 116 fichiers initialement ; 117 après optimisation, aucun diagnostic | Vérification de code et de types |
| Compilation Cloudflare | Compilation, simulation et déploiement de la projection SEO réussis ; compilation suivante du partage des données catalogue en 23,47 s, simulation et déploiement réussis | Un avertissement de taille de chunks subsiste ; une compilation réussie ne valide pas le budget CPU à l’exécution |
| Publication/CMS isolé | 14 contrôles distincts réussis | Base jetable sur `localhost:4331`, aucune écriture dans les comptes ou médias du site existant |
| Catalogue isolé | 11 contrôles réussis | Formulaire réel, D1, R2, préférences marketing, PDF et révocation |
| Métadonnées publiques | 28 routes réussies à nouveau sur la version `a8c61922…` | Titres, canonical, `noindex`, partage, icône et JSON-LD ; preuve `test-results/seo-projection-acceptance.log` |
| Contenu publié | 28 routes et 199 liens internes réussis entre 19 h 08 min 33 s et 19 h 09 min 20 s | Textes 0011, métadonnées, liens et ancres ; ce passage ponctuel ne garantit pas la disponibilité ultérieure |
| Présentation Chromium | 24 rendus réussis, de 19 h 22 min 50 s à 19 h 24 min 04 s | Six pages × deux thèmes × ordinateur/mobile ; images, choix des variantes et chargement différé des finitions |
| Présentation WebKit | 24 rendus réussis, de 19 h 24 min 48 s à 19 h 25 min 55 s | Les mêmes six pages et quatre combinaisons de thème/format |
| Interactions WebKit | 56 visites et 9 contrôles réussis, de 19 h 26 min 22 s à 19 h 28 min 31 s | 28 pages en ordinateur/mobile, thème sombre, animations, navigation, formulaire et mouvement réduit |
| Contrôle public final | 28 routes réussies, de 19 h 30 min 06 s à 19 h 30 min 37 s | Dernière version `a4eed856…` : liens, métadonnées, canonical, `noindex`, `no-store`, robots, sitemap, vraie 404 et photo du propriétaire |
| Formulaire après dernière optimisation | 8 cas Chromium réussis, de 19 h 31 min 17 s à 19 h 31 min 43 s | Accueil/catalogue × deux thèmes × ordinateur/mobile ; réponses 200, aucune erreur JavaScript ni écriture |

Les contrôles CMS couvrent la préparation sans écriture, la publication des 27 entrées, une réexécution sans effet, les brouillons privés, les aperçus signés et les jetons invalides. Ils vérifient aussi l’effacement de sections de l’accueil, de la note de contact du showroom et du CTA d’un article, sans réapparition de textes de secours. Les métadonnées du magasin et des produits suivent leurs contenus ; les images ou coordonnées facultatives effacées disparaissent. Le panneau SEO natif reste une exception documentée : ses changements prennent effet immédiatement, indépendamment du brouillon du corps de page.

La reprise ciblée des contrôles de métadonnées dans la même base jetable, après suppression des relectures SEO, est réussie à **19 h 19 min 57 s**, avec restauration des contenus de test. Elle ne constitue pas un test de budget CPU Cloudflare.

Les contrôles catalogue isolés vérifient le refus des requêtes invalides, la persistance avant téléchargement, le dédoublonnage, le consentement omis/`false`/`true`, deux PDF distincts contrôlés par empreinte, la publication d’une nouvelle édition et la révocation après suppression. Le formulaire Chromium a réellement soumis les deux choix marketing. Les contacts et PDF synthétiques ont ensuite été supprimés de cette base jetable.

Les suites de présentation et d’interaction n’enregistrent aucune erreur JavaScript, tentative d’écriture ou requête privée. WebKit vérifie cinq positions de l’animation d’accueil, l’absence de débordement des 28 pages dans les deux formats, le thème au clavier, la navigation accueil → famille → modèle, les erreurs locales du formulaire et le consentement facultatif. Le mode de mouvement réduit laisse le contenu accessible. Ces suites sont anonymes et en lecture seule ; les soumissions valides et les PDF sont vérifiés séparément dans l’environnement isolé.

Le contrôle final retrouve également les octets de la photo originale du showroom : **2 145 163 octets**, SHA-256 `27fb665fc83d84f5c70157172a5f4d1dcd3e6153a1bbc717fb1ca4fc6933fe11`, ainsi que sa variante affichée disponible.

Les preuves brutes sont conservées localement dans `test-results/seo-isolated-cms/`, `test-results/seo-editorial-publication/`, `test-results/seo-projection-acceptance/{chromium,webkit}/report.json`, `test-results/seo-projection-interactions/webkit-dark/report-layouts.json`, `test-results/seo-final-public/report.json` et `test-results/seo-final-form-render.json`. Les reprises d’un même contrôle dans le rapport CMS ne sont comptées qu’une fois. Les navigateurs sont émulés ; aucun iPhone physique n’a servi à ces essais.

## Images : mesure de transfert initial

Le [relevé détaillé avant/après](audits/seo-image-transfer-2026-09-29.json) compare deux chargements publics par page : Chromium 151, viewport **390 × 844**, DPR 1, thème sombre, contexte neuf, cache navigateur désactivé, sans défilement ni limitation de réseau, puis trois secondes de calme réseau. La mesure après déploiement est prise à **19 h 03**, après publication complète des deux pages concernées.

| Page | Requêtes images avant → après | Octets images avant → après | Réduction observée |
| --- | --- | --- | --- |
| Accueil | 7 → 7 | 3 321 497 → 454 892 | **86,30 %** |
| Greta | 10 → 15 | 2 567 232 → 206 044 | **91,97 %** |

Il s’agit uniquement des octets transférés par les réponses d’images, mesurés par `Network.loadingFinished.encodedDataLength`, en-têtes compris. Les miniatures peuvent créer davantage de petites requêtes au lieu de réutiliser une grande image originale. Il n’y a ni score Lighthouse, ni mesure de Core Web Vitals, ni démonstration d’une réduction équivalente du temps de chargement. Le cache Cloudflare n’est pas réinitialisé ; ce sont deux passages contrôlés, sans iPhone physique ni réseau cellulaire. Ces résultats ne résolvent pas les erreurs CPU du rendu serveur.

## Présentation et captures disponibles

La [comparaison géométrique de l’accueil](audits/seo-home-geometry-2026-09-29.json) porte sur **18 positions de défilement et 64 éléments**, dans les deux thèmes, en 1440 px et 390 px. Les styles typographiques, couleurs et paramètres de cadrage examinés restent identiques. L’écart maximal mesuré est de **0,097 px CSS**, dans une composition catalogue animée. Les 35 images de l’accueil ont maintenant des dimensions intrinsèques, contre 31 valeurs manquantes auparavant.

Cette comparaison locale isole les changements techniques sur le même contenu CMS. Elle ne constitue ni une comparaison exhaustive avec le prototype version B, ni une preuve de parité au pixel près pour toutes les pages ou tous les états animés.

| Vue locale, avant/après modification technique | Avant | Après |
| --- | --- | --- |
| Séquence Italie, ordinateur, sombre | [Capture](screenshots/seo-refresh-2026-09-29/before-brand-1440-dark.png) | [Capture](screenshots/seo-refresh-2026-09-29/after-brand-1440-dark.png) |
| Collections, mobile, clair | [Capture](screenshots/seo-refresh-2026-09-29/before-collections-390-light.png) | [Capture](screenshots/seo-refresh-2026-09-29/after-collections-390-light.png) |

Les douze captures suivantes montrent les contenus publiés sur Cloudflare, après suppression des relectures SEO. Elles ont été produites pendant le contrôle Chromium ; les mêmes compositions ont été contrôlées dans WebKit.

| Page publiée | Ordinateur sombre | Ordinateur clair | Mobile sombre | Mobile clair |
| --- | --- | --- | --- | --- |
| Accueil | [Capture](screenshots/seo-refresh-2026-09-29/home-1440-dark.jpg) | [Capture](screenshots/seo-refresh-2026-09-29/home-1440-light.jpg) | [Capture](screenshots/seo-refresh-2026-09-29/home-390-dark.jpg) | [Capture](screenshots/seo-refresh-2026-09-29/home-390-light.jpg) |
| Showroom | [Capture](screenshots/seo-refresh-2026-09-29/showroom-casablanca-1440-dark.jpg) | [Capture](screenshots/seo-refresh-2026-09-29/showroom-casablanca-1440-light.jpg) | [Capture](screenshots/seo-refresh-2026-09-29/showroom-casablanca-390-dark.jpg) | [Capture](screenshots/seo-refresh-2026-09-29/showroom-casablanca-390-light.jpg) |
| Collection Tables | [Capture](screenshots/seo-refresh-2026-09-29/collections-tables-1440-dark.jpg) | [Capture](screenshots/seo-refresh-2026-09-29/collections-tables-1440-light.jpg) | [Capture](screenshots/seo-refresh-2026-09-29/collections-tables-390-dark.jpg) | [Capture](screenshots/seo-refresh-2026-09-29/collections-tables-390-light.jpg) |

Les passages précédents interrompus par les erreurs serveur restent conservés comme tels ; ils ne sont pas comptabilisés comme des suites réussies.

## Incident Cloudflare et capacité d’hébergement à confirmer

À **19 h 06**, le premier contrôle public rencontre trois réponses 500 au corps vide pendant l’export D1 de vérification. Les mêmes routes répondent 200 à **19 h 07**. La concomitance avec l’export est relevée ; les corps vides ne démontrent pas à eux seuls la cause de ces réponses.

Le contrôle suivant, à **19 h 09**, rencontre huit réponses **503 / erreur 1102 « Worker exceeded resource limits »**, sur six fiches modèles et deux articles. Ce deuxième échec est distinct du précédent. Les journaux Cloudflare examinés ensuite confirment **`exceededCpu` à 10 ms** pour une requête publique ; l’accueil est également concerné lors du diagnostic de cette version.

La suppression des lectures CMS redondantes dans la production des métadonnées a été déployée sous la version `a8c61922-0a9b-4f4a-b65f-08292ccbbc8e`. Les cinq premiers GET séquentiels ont répondu 200, mais leurs temps CPU étaient de **13, 25, 56, 73 et 193 ms**, donc tous au-dessus de 10 ms. Les 28 routes de métadonnées, les 48 rendus Chromium/WebKit et les 56 visites d’interaction ont ensuite réussi, sans nouvelle réponse 503 dans ces suites. Le site répond lors de ces contrôles ; ces observations ne démontrent pas que le risque de dépassement CPU est éliminé sur la durée ou sous une autre charge.

Aucun changement de formule payante n’est compris dans cette étape. Une lecture inverse des familles d’un modèle a été étudiée, mais elle nécessiterait un champ de relation supplémentaire et une migration dédiée ; le schéma reste inchangé.

La dernière version `a4eed856…`, qui partage aussi les lectures du formulaire catalogue, passe ensuite le contrôle complet des **28 routes**, puis les **huit cas de rendu du formulaire**. Le relevé d’exécution de ce dernier passage contient **23 GET publics**, tous avec un résultat `ok`, des temps CPU de **5 à 48 ms** et aucun `exceededCpu`. Le premier chargement de l’accueil n’a pas été capturé par ce relevé : cette plage ne lui est pas attribuée. Le relevé est conservé dans `test-results/seo-final-cpu.json`.

Un relevé ciblé à **19 h 32** mesure ensuite **113 puis 62 ms** pour l’accueil et **23 ms** pour le catalogue, tous en HTTP 200. La [documentation Cloudflare](https://developers.cloudflare.com/workers/platform/limits/#cpu-time) précise que l’offre gratuite dispose de 10 ms par requête et d’une tolérance occasionnelle aux dépassements. Les réglages lus du Worker n’imposent aucune limite CPU explicite ; la lecture de l’abonnement du compte renvoie 403 avec l’autorisation disponible. Aucun statut de facturation n’est donc déduit du seul libellé technique `standard`. Le choix entre une formule adaptée et une architecture restant gratuite a été soumis au propriétaire ; aucune modification d’abonnement n’a été effectuée.

Preuves des deux passages interrompus : `test-results/seo-cloudflare-public-first-pass-failed/` et `test-results/seo-cloudflare-public-second-pass-resource-limit/`. Les journaux Cloudflare détaillés restent privés. Les contenus et correctifs publiés sont vérifiés ; la capacité de l’hébergement doit être confirmée avant de considérer la stabilité commerciale comme acquise. Aucun changement payant n’a été activé.

## Limites conservées

- L’accueil conserve les deux compositions responsive de la version B, avec deux H1 dans le DOM et un seul visible par viewport. Les fusionner sans modifier le rendu et les animations reste un chantier distinct.
- `SITE_INDEXABLE=false` et `noindex` restent actifs. Ce site n’est pas présenté comme déjà indexé, et aucun classement SEO n’est garanti.
- Le PDF est une démonstration ; les mentions de confidentialité et la collecte réelle restent à finaliser avant lancement commercial. Le téléchargement immédiat fonctionne sans promettre un envoi par email.
- Aucun fournisseur d’emails transactionnels, CRM externe ou domaine commercial n’a été raccordé par cette révision.
- Les services, stocks, prix, délais, usages WhatsApp et email public non confirmés ne sont pas inventés. La restriction des modèles Outdoor aux espaces couverts reste présente.
- Les visuels existants sont conservés ; certaines photos d’ambiance et leurs droits d’exploitation définitifs restent à confirmer. La photo du showroom fournie par le propriétaire reste en place.
- Les essais de publication et d’authentification restent réservés aux environnements jetables. Le port local 4321 reste privé ; les aperçus statiques et GitHub Pages ne sont pas modifiés.
