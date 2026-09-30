# Préproduction Cloudflare de Cattelan

La préproduction Cloudflare est publiée sous la version `8bf5538b-a76b-4ab8-b498-6e249f4738b8`. Les données et médias transférés, les 28 pages publiques et les quatre passages de navigateur ont été vérifiés. Le propriétaire a ajouté sa passkey sur cette nouvelle adresse et confirmé son accès.

Le site cible est `https://cattelan-maroc-preview.omar-8b8.workers.dev`, avec l'administration EmDash sous `/_emdash/admin/`. Il utilise des ressources Cattelan créées dans le compte existant confirmé par le propriétaire. Aucun domaine personnalisé, service d'envoi d'email ou CRM externe n'est prévu par ce déploiement. La préproduction conserve `noindex` et le PDF de démonstration.

## Isolation et transfert

La configuration distante se trouve uniquement dans l'environnement `cattelan` de `wrangler.jsonc`. Le niveau par défaut, utilisé par le port local privé 4321, a été comparé à la version Git précédente et reste identique. Le contrôle de cible épingle le compte, le Worker, l'origine, les deux buckets et les identifiants D1/KV ; il refuse aussi une route personnalisée ou des variables inattendues. Les quinze tests suivis dans Git couvrent une cible autorisée et quatorze refus, dont une modification identique mais incorrecte des configurations source et compilée. Un contrôle ponctuel antérieur avait aussi vérifié une cible autorisée et quinze cas incorrects.

L'export de la nouvelle base D1 distante a été comparé à la copie préparée : schéma des 74 tables identique, empreintes typées des lignes de 73 tables identiques, intégrité SQLite correcte et aucune violation de clé étrangère. Seules la valeur de l'option `emdash:site_url` et sa révision ont été adaptées à l'origine distante. Les deux utilisateurs, deux passkeys et 625 médias sont conservés au transfert ; la passkey Cloudflare du propriétaire a été ajoutée ensuite par celui-ci. La base locale n'est pas la cible de ces adaptations.

Le transfert des 627 objets, comprenant 626 médias publics et un PDF privé, s'est terminé le **29 septembre à 16 h 56, heure de Toronto**. Les 626 médias ont ensuite été téléchargés depuis le Worker : tous répondent HTTP 200 et correspondent à l'original en octets, SHA-256 et type de contenu, soit 193 906 208 octets contrôlés. Le PDF privé de 23 232 octets a également été vérifié via Wrangler et le parcours signé. Wrangler confirme que l'accès public `r2.dev` du bucket de catalogues est désactivé ; le téléchargement contrôlé utilise la route signée de l'application. Les sauvegardes et informations d'authentification restent privées et hors de Git.

Le contrôle final de la source locale confirme les 74 tables applicatives et 628 fichiers protégés, y compris `.dev.vars`, inchangés. Seul le compteur interne de lecture D1 a progressé pendant le fonctionnement normal. La vérification de transfert complète s'est achevée à **16 h 57, heure de Toronto**.

Les paramètres du Worker préexistant et les métadonnées du bucket déjà présent ont été comparés avant/après sans changement. La date de modification du Worker existant reste celle du 13 août. Ce contrôle a été réalisé le **29 septembre à 16 h 48, heure de Toronto** ; il ne s'appuie pas uniquement sur le nom des nouvelles ressources.

## Vérifications

| Contrôle | Résultat |
| --- | --- |
| Configuration locale inchangée et cible Cattelan isolée | Réussi localement |
| Syntaxe du contrôle de cible et refus de 15 configurations incorrectes | Réussi localement |
| Vérification Astro et tests unitaires | 104 fichiers, aucun diagnostic ; 116 tests unitaires réussis, dont 15 pour le contrôle de cible : 1 autorisation, 14 refus |
| Compilation de l'environnement `cattelan` et configuration générée | Réussie en 40,54 s ; contrôle de cible et dry-run réussis |
| Déploiement effectif | Version `8bf5538b-a76b-4ab8-b498-6e249f4738b8` ; accueil/catalogue HTTP 200, administration anonyme HTTP 302 |
| 28 pages publiques, liens, métadonnées et canonicals | HTTP 200 sur les 28 routes, 0 problème de lien interne, origine canonique Cloudflare correcte ; 27 descriptions éditoriales présentes |
| `noindex`, `robots.txt`, sitemap et page 404 | Réussi : pages `noindex` et `no-store`, robots `Disallow: /`, sitemap vide de préproduction HTTP 200, page inconnue HTTP 404 |
| Empreinte de la photo du showroom fournie par le propriétaire | Réussie sur le Worker : 2 145 163 octets, SHA-256 identique à l'original, même référence sur l'accueil et le showroom |
| Chromium et WebKit, clair/sombre, ordinateur/mobile | 65 contrôles réussis sur les quatre passages ; 224 couples route/format vérifiés, 199 liens internes contrôlés |
| Navigation, animations et mouvement réduit | Réussi : changement de thème au clavier, navigation accueil/famille/modèle, menus mobiles, animations et accès avec mouvement réduit |
| Formulaire, contact privé et PDF signé sur la copie distante | Réussi par l'API : demande et PDF HTTP 200, 23 232 octets et empreinte du PDF identiques ; consentement omis enregistré `false` |
| Formulaire réel dans le navigateur | Réussi sur Chromium mobile 390 × 844 : saisie, envoi, consentement décoché enregistré `false`, clic sur le lien et téléchargement des octets exacts du PDF |
| Nettoyage des identités synthétiques des deux contrôles | Chaque demande de test a été supprimée par son UUID et son identité exacte ; absence vérifiée, anciens liens PDF refusés HTTP 410 |
| Administration et données privées | Redirection de l'administration anonyme, contacts/export refusés anonymement ; contournements de développement et reset compilés en refus HTTP 403 |
| Accès du propriétaire | Passkey ajoutée et accès confirmé par le propriétaire ; contrôle en lecture seule à 17 h 10 Toronto : récupération consommée, une nouvelle passkey liée au propriétaire |
| État des sites existants après l'opération | Paramètres du Worker existant et métadonnées du bucket déjà présent identiques avant/après |

Le contrôle `node scripts/check-cloudflare-public.mjs` réutilise l'inventaire SSR anonyme des 28 routes, puis vérifie leur origine canonique, leurs métadonnées et en-têtes, les liens internes et les octets de la photographie du showroom. Il utilise uniquement des lectures publiques, sans formulaire ni authentification. L'option `--reuse-audit` accepte le relevé réel de cette même origine datant de moins d'une heure ; son horodatage reste distinct dans le rapport pour ne pas présenter une ancienne lecture comme une nouvelle requête.

Le relevé initial des 28 pages a été terminé le **29 septembre 2026 à 16 h 45, heure de Toronto**, pendant le transfert des médias. Il valide les réponses HTML et leurs métadonnées ; il ne constitue pas encore une vérification de chargement des images.

Les contrôles de navigateur réutilisent `tests/editorial-refresh-browser.mjs`, dont les attentes suivent la dernière révision éditoriale. Les quatre passages réussissent, sans exception JavaScript, tentative d'écriture ni requête privée. Toutes les méthodes autres que GET/HEAD sont bloquées dans ces navigateurs ; le test des erreurs du formulaire ne produit aucun contact. Les contrôles de formulaire valides et de PDF sont rapportés séparément. Les [preuves publiques détaillées](audits/cloudflare-public-2026-09-29.json) regroupent les résultats, les horodatages et les empreintes des captures.

Le parcours valide de catalogue a été testé séparément sur la copie distante avec une identité synthétique. Le champ de consentement marketing a été omis : D1 conserve bien la valeur `false` et la version de consentement attendue. Le PDF a été reçu avec l'en-tête `no-store` ; aucune transmission d'email ou de CRM n'est déduite de ce téléchargement. Un contrôle indépendant de 609 fichiers n'a trouvé aucune valeur de secret privée en clair dans les fichiers examinés.

Le parcours réel dans Chromium mobile a ensuite réussi à **17 h 16, heure de Toronto** : le navigateur a produit lui-même l'identifiant de demande, envoyé le formulaire avec le consentement décoché puis téléchargé le PDF via le lien affiché. Une lecture D1 a confirmé l'enregistrement avant la suppression ciblée du seul contact fictif. Aucun appel d'authentification, aucune écriture inattendue et aucune erreur JavaScript. Deux essais préalables du script de vérification ont été interrompus avant tout envoi de formulaire ; aucun contact n'a été créé par ces essais. La dernière exécution a réussi sans erreur de commande.

L'aperçu local a été relancé avec Astro après le transfert : accueil HTTP 200 et port 4321 toujours privé. Les données locales et Cloudflare sont désormais indépendantes ; une modification éditoriale locale ne publie pas automatiquement le site distant.

## Captures

| Page | Ordinateur sombre | Ordinateur clair | Mobile sombre | Mobile clair |
| --- | --- | --- | --- | --- |
| Accueil, scène showroom | [Voir](screenshots/cloudflare-2026-09-29/home-showroom-1440-dark.jpg) | [Voir](screenshots/cloudflare-2026-09-29/home-showroom-1440-light.jpg) | [Voir](screenshots/cloudflare-2026-09-29/home-showroom-390-dark.jpg) | [Voir](screenshots/cloudflare-2026-09-29/home-showroom-390-light.jpg) |
| Showroom | [Voir](screenshots/cloudflare-2026-09-29/showroom-1440-dark.jpg) | [Voir](screenshots/cloudflare-2026-09-29/showroom-1440-light.jpg) | [Voir](screenshots/cloudflare-2026-09-29/showroom-390-dark.jpg) | [Voir](screenshots/cloudflare-2026-09-29/showroom-390-light.jpg) |
| Catalogue | [Voir](screenshots/cloudflare-2026-09-29/catalogue-1440-dark.jpg) | [Voir](screenshots/cloudflare-2026-09-29/catalogue-1440-light.jpg) | [Voir](screenshots/cloudflare-2026-09-29/catalogue-390-dark.jpg) | [Voir](screenshots/cloudflare-2026-09-29/catalogue-390-light.jpg) |

Ces douze captures proviennent de pages fraîches aux formats 1440 × 900 et 390 × 844, après chargement des polices et décodage des images visibles. Les animations restent actives ; les positions de défilement sont stabilisées avant capture. Aucune session administrateur ni identité de formulaire n'y apparaît.

Quelques premières captures présentaient un logo tronqué. Les mesures sur pages fraîches, locales et distantes, ont confirmé les mêmes dimensions correctes sur ordinateur, avant et après défilement ; aucune modification CSS n'a été justifiée ni effectuée. La série finale vérifie les limites du logo et leur stabilité avant/après chaque capture. Sur l'accueil mobile, le cadre de marque dépasse de 0,359 pixel de chaque côté d'un en-tête de 60 pixels, identiquement en local et sur Cloudflare ; le contrôle admet un pixel de tolérance. Cela ne constitue pas une affirmation de parité pixel par pixel avec la version B.

## Limites

`noindex` ne rend pas l'adresse Cloudflare privée. Le site reste une préproduction avec un document PDF de démonstration, sans prestataire d'email ni CRM réel. Les textes juridiques et commerciaux définitifs, les autres visuels provisoires et le domaine final restent à valider avant lancement commercial.

La page de confidentialité de prévisualisation conserve son titre et son absence de méta-description. Les 27 pages éditoriales ont chacune une description ; aucune réécriture de contenu n'a été effectuée pour modifier ce résultat pendant le déploiement.

Une passkey du Codespace ne se transfère pas automatiquement à une autre origine. Le propriétaire a confirmé l'ajout de sa passkey pour l'origine Cloudflare ; le contrôle de la base distante confirme une nouvelle passkey et la consommation de la récupération à **17 h 10, heure de Toronto**. Aucun lien, jeton de récupération ou identifiant privé n'est publié dans ce rapport. Aucun test automatisé d'inscription n'a été exécuté contre son compte. Les contrôles automatisés de navigateur ne sont pas des essais sur iPhone physique ni une nouvelle preuve de parité pixel par pixel avec la version B.

Les réponses Cloudflare HTTP 200 et les parcours vérifiés utilisent le Worker et ses ressources distantes. L'arrêt du Codespace n'a pas été provoqué pendant ces contrôles. Les mesures de CPU en charge et le coût futur ne sont pas établis par ces seuls essais ; aucune gratuité illimitée n'est promise.

- [Site Cloudflare](https://cattelan-maroc-preview.omar-8b8.workers.dev/)
- [Showroom](https://cattelan-maroc-preview.omar-8b8.workers.dev/showroom-casablanca/)
- [Administration EmDash](https://cattelan-maroc-preview.omar-8b8.workers.dev/_emdash/admin/)
- [Procédure de déploiement](deployment-cloudflare.md)
