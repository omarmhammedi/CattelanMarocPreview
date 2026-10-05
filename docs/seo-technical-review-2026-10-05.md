# Contrôle technique SEO — 5 octobre 2026

Contrôle de la préversion `https://cattelan-maroc-preview.cattelan.workers.dev`, après la mise à jour EmDash, terminé à **11:48 UTC**. Le périmètre porte sur 64 pages publiées : 12 pages fixes, 8 familles, 39 modèles et les 5 premiers articles. Le relevé emploie uniquement des GET anonymes ; le HTML serveur est analysé sans exécuter de scripts ni charger ses ressources. Une seule image transformée est vérifiée séparément. Avec les variantes et fichiers techniques, le total est de **80 requêtes publiques**, sans formulaire, compte client, envoi d’email ou écriture CMS.

Les données détaillées restent dans `test-results/seo-audit-2026-10-05/report.json`, avec le HTML et le texte extraits. Le script temporaire d’inventaire reprend `scripts/audit-public-seo.mjs` en ajoutant toutes les pages fixes présentes dans le seed ; ce relevé ne dépend pas d’un scan payant.

## Résultats constatés

| Contrôle | Résultat |
| --- | --- |
| Pages et maillage | 64/64 réponses 200 ; aucun lien interne ou fragment absent dans ce périmètre |
| Titres et descriptions | Présents et distincts sur les 64 pages |
| H1 et canonical | Un H1 et un canonical sur chaque URL avec slash |
| Préversion | `noindex, nofollow` dans le HTML et l’en-tête des 64 pages ; robots interdit `/`, sitemap vide |
| Données structurées | 39 `Product`, 5 `BlogPosting`, 63 `BreadcrumbList`, 2 `FurnitureStore`, 1 `Organization`, 1 `FAQPage` ; JSON valide |
| Articles | Les 5 articles ont une signature `Organization`, des dates publiées/modifiées et une image absolue ; le titre du schéma correspond au titre visible |
| Identité locale | Adresse à Casablanca, code postal, coordonnées, téléphone, email, horaires, lien Maps et profil Instagram présents dans les graphes du showroom et de l’accueil |
| Images | 3 601 occurrences HTML ; toutes avec `alt`, `width` et `height` ; 3 487 avec `srcset` |
| Images sociales | Toutes les images émises sont absolues ; 7 pages de services/informations n’en émettent pas |
| Ressource transformée | Image principale de Greta, variante WebP de 1 080 pixels : HTTP 200, 34 880 octets de corps |

Les occurrences d’images sont des balises, pas des téléchargements initiaux. Les `alt=""` décoratifs ne sont pas des attributs manquants. La présence de schémas valides ne garantit ni résultat enrichi, ni classement, ni citation par un assistant. Le `Product` existant n’invente ni prix, ni stock, ni avis.

Les points T01, T03, T04 et T05 de l’[audit précédent](seo-technical-audit.md) sont désormais traités dans le code : exception robots pour les médias publics, images absolues, auteur collectif correctement typé et sitemap respectant les canonical/noindex natifs. Le comportement indexable reste couvert par des tests isolés ; il n’a pas été activé sur cette préversion.

## Correctif livré dans ce lot : variantes sans slash

Le relevé avant correctif confirme encore des réponses 200 sur `/collections`, `/modeles/skorpio` et `/sur-mesure`, avec des canonical différents des URL avec slash. C’est le point T02 de l’audit précédent.

Le correctif unifie le canonical de repli sur les URL publiques avec slash et ajoute une redirection permanente pour les variantes **GET/HEAD qui rendent effectivement une page HTML 200**. Le chemin doit appartenir aux modèles publics connus. Les paramètres de requête sont conservés. Les API, médias, cartes, fichiers techniques, aperçus signés, méthodes d’écriture, pages absentes et redirections natives gardent leur comportement. Une valeur canonical explicite dans le panneau SEO natif désactive cette redirection automatique pour la page rendue : une URL choisie sans slash ne doit pas pointer vers la redirection ajoutée par le site. Ce signal reste dans le contexte de la requête, sans lire le corps HTML ni effectuer une seconde requête CMS. Les valeurs explicitement définies dans le panneau SEO natif conservent leur priorité.

Vérification locale sur l’instance isolée `localhost:4331` :

| Requête | Résultat |
| --- | --- |
| GET `/collections` | 301 vers `/collections/`, `noindex` conservé |
| GET `/modeles/skorpio?view=desktop&utm_source=journal` | 301 vers `/modeles/skorpio/?view=desktop&utm_source=journal` |
| HEAD `/showroom-casablanca` | 301 vers `/showroom-casablanca/` |
| GET `/collections/` | 200, canonical avec slash, `noindex` conservé |
| GET `/modeles/does-not-exist` | 404 sans redirection |
| GET robots et sitemap | Exclusion intégrale et sitemap vide conservés |

Les 11 tests de `tests/seo-policy.test.ts` passent, dont les vérifications des chemins publics, paramètres, méthodes POST/PUT/PATCH/DELETE et corps non consommés, aperçus signés, réponses non HTML, erreurs et redirections natives. Deux tests d’interaction vérifient les canonical natifs relatifs/absolus, leur effacement et leur isolation entre requêtes simultanées. Un test HTTP supplémentaire sur cette instance jetable renseigne un canonical natif absolu sans slash sur Collections : les deux variantes restent en 200 et rendent exactement ce canonical. Son effacement rétablit la redirection 301 et le canonical avec slash. Les métadonnées initiales sont ensuite restaurées et les pointeurs de révision publiée/brouillon restent inchangés (`test-results/seo-audit-2026-10-05/native-canonical-http.json`). Le contrôle HTTP sur le Worker devra confirmer ce comportement après déploiement ; le relevé public initial ci-dessus précède ce correctif.

## Éléments à poursuivre

- **Images de partage — amélioration éditoriale.** `/sur-mesure/`, `/professionnels/`, `/a-propos/`, `/votre-projet/`, `/faq/`, `/mentions-legales/` et `/confidentialite/` n’ont pas d’image Open Graph. Renseigner une image native par page ou une image de partage globale approuvée améliore les aperçus sociaux ; ce n’est pas un blocage d’indexation. Ne pas rétablir silencieusement une image qu’un éditeur a effacée.
- **Performance mobile — mesure avant conclusion.** Le HTML décompressé de Greta atteint 412 951 octets et celui de Ruby Lounge 400 412 octets ; ils comportent de nombreuses finitions. Ces tailles ne sont ni le transfert compressé, ni un score Core Web Vitals. Les images responsives fonctionnent. Une mesure mobile contrôlée et les données de terrain devront guider les prochaines optimisations ; un cache HTML exige une stratégie d’invalidation à la publication.
- **Mise en service — étape séparée.** L’origine finale, l’ouverture à l’indexation, Search Console et la fiche Google Business Profile restent des sujets de lancement. Les exclusions actuelles empêchent volontairement l’indexation et la découverte par les robots : aucun audit de la préversion ne doit les compter comme une panne ni promettre une visibilité réelle avant lancement.

## Vérification après déploiement

Le déploiement GitHub Actions [37307785112](https://github.com/omarmhammedi/CattelanMarocPreview/actions/runs/37307785112) a réussi pour le commit `eefb7434ed186f5ae40025af4e662b8b8750fa13`. Version Worker : `e4277107-9a2e-4ec2-b882-0dba0666f0c9`. Les douze contrôles publics ont ensuite tous réussi : redirections GET/HEAD, paramètres conservés, canonical et noindex, 404 réelle, robots, sitemap vide, API protégée en 401, fichier llms avec 22 réponses et exclusion privée des requêtes de prévisualisation. L’évidence détaillée reste privée dans `test-results/seo-audit-2026-10-05/postdeploy-technical.json`.
