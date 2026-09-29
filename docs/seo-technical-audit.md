# Audit technique SEO — 28 septembre 2026

Relevé à **20 h 18, heure de Toronto**, sur la branche `feat/emdash-migration`, à partir du contenu effectivement servi par EmDash. Cet audit prépare les corrections et la mise en service ; il ne constitue ni un déploiement ni une mesure de classement dans Google.

Le relevé local `test-results/seo-audit/report.json` contient les 28 routes, leurs métadonnées, titres, images, liens et variantes d'URL. `page-copy.txt` conserve le texte rendu pour la revue éditoriale. Ce dossier de résultats reste ignoré par Git. Le contrôle utilise uniquement des GET anonymes ; le parseur DOM bloque scripts et réseau. Aucun formulaire, compte, contact ou contenu CMS n'a été modifié. Les règles conditionnelles de production ont été inspectées dans le code, sans activer l'indexation de la prévisualisation.

## Ce qui fonctionne déjà

| Contrôle | Résultat constaté |
| --- | --- |
| Routes prévues | 28 réponses HTTP 200 : cinq pages fixes, six familles, onze modèles, cinq articles, confidentialité |
| Titres et descriptions | Titres présents et distincts ; 27 descriptions présentes et distinctes. La confidentialité provisoire n'a pas de description. |
| Liens internes | Aucun lien HTML vers une route interne absente ni fragment absent détecté dans ce périmètre ; ce résultat ne vérifie pas les liens externes ou les soumissions. |
| Canonical | Une balise par page ; le paramètre de présentation `?view=desktop` est exclu. Les variantes sans slash restent à corriger, ci-dessous. |
| Alias de l'accueil | `/home` et `/home/` redirigent en 301 vers `/`. |
| URL inconnue | La route de contrôle inexistante renvoie 404. |
| Langue et rendu | `lang="fr"`, contenu et liens présents dans le HTML serveur, sans attendre JavaScript. |
| Prévisualisation | Les 28 pages portent `noindex, nofollow` dans le HTML et l'en-tête HTTP ; robots interdit le crawl et le sitemap est vide. C'est volontaire et à préserver. |
| Données structurées | 23 pages émettent `WebSite` ; les cinq articles émettent `BlogPosting`. Les données structurées ne sont donc pas absentes. |
| Images | 1 695 occurrences de `<img>`, toutes avec un attribut `alt`. Il s'agit d'occurrences dans le HTML des 28 pages, pas de fichiers uniques ou de téléchargements réseau. |

L'accueil possède deux H1 dans le HTML, correspondant aux compositions ordinateur et mobile héritées de la version B. Leur visibilité dépend du breakpoint. Ce n'est pas la preuve d'une pénalité SEO ni de deux titres simultanément visibles. Les extractions `textContent` peuvent également joindre les mots séparés par des éléments de mise en page : ne pas traiter ce seul artefact comme une faute dans le contenu éditorial.

## Corrections confirmées

Les priorités signifient : **P0**, préalable à l'ouverture au public ; **P1**, correction dans le lot de finalisation SEO ; **P2**, amélioration après les éléments bloquants. Aucun de ces constats n'autorise à rendre le port 4321 public.

| ID / priorité | Preuve et conséquence | Correction et critère de réception |
| --- | --- | --- |
| T01 — P0 avant indexation | `src/pages/robots.txt.ts:8` produit `Disallow: /_emdash/` lorsque `SITE_INDEXABLE=true`. Or `src/lib/content.ts:11` sert les images depuis `/_emdash/api/media/file/`. Les médias publics seraient donc interdits aux robots lors du lancement. | Autoriser précisément les fichiers médias publics, ou les servir sur un chemin public distinct, en conservant les exclusions admin, API privées et aperçus. Test isolé : robots de production autorise une image et un PDF technique publics, interdit admin/preview/catalogue privé ; robots de prévisualisation reste `Disallow: /`. Ne pas considérer robots comme une protection d'accès. |
| T02 — P1 | `/collections` et `/collections/` répondent 200 avec deux canonicals différents ; même résultat pour `/modeles/skorpio`. `astro.config.mjs:13` ignore le slash final et `src/components/SeoHead.astro:35` reprend le pathname tel quel. | Retenir les URL publiques avec slash, déjà utilisées dans le maillage et le sitemap. Unifier leurs canonicals et, de préférence, rediriger les variantes GET/HEAD. Vérifier toutes les familles de routes, les paramètres et l'alias home. Les POST EmDash doivent conserver leurs chemins et corps ; ne pas imposer une redirection globale aux API. |
| T03 — P1 | Les 26 pages munies d'une image Open Graph émettent un chemin relatif ; les cinq `BlogPosting.image` sont aussi relatifs. Exemple : `/_emdash/api/media/file/…jpg`. `SeoHead.astro:35` transmet `image.src` sans résolution sur l'origine publique. Les images du panneau SEO natif passent par un autre chemin de résolution. | Résoudre les images de repli en URL absolue sur l'origine publique configurée et conserver la priorité du panneau SEO. Vérifier accueil, famille, modèle, article, image SEO personnalisée puis effacée. Les images HTML, Open Graph, Twitter et JSON-LD doivent représenter la même ressource publique. Contrôler les cartes sociales sur l'hébergement final, où elles pourront réellement être lues. |
| T04 — P1 | Les cinq articles publient `author: {"@type":"Person","name":"Cattelan Italia Maroc"}` alors que la signature visible est celle de l'organisation. `SeoHead.astro:35` fournit la byline à EmDash ; son constructeur `node_modules/emdash/src/page/jsonld.ts:61` impose `Person`. | Émettre le type d'auteur correspondant à la signature réelle via une contribution native maîtrisée, sans modifier `node_modules` ni inventer un auteur humain. Réception : un seul graphe d'article faisant autorité, auteur `Organization` pour cette signature, dates et URL cohérentes, pas de doublon contradictoire. |
| T05 — P1, contrat de configuration | Le sitemap tient compte de `seo.noIndex`, mais ignore `seo.canonical` (`src/pages/sitemap.xml.ts:19–23`). Le head applique ce canonical natif (`EmDashHead.astro:80`). Le défaut apparaît lorsqu'un éditeur renseigne une URL canonique différente ; aucun cas actuellement publié n'a été établi par le relevé anonyme. | Définir une règle unique : exclure du sitemap une page canonisée vers une autre URL, et ne lister que les URL canoniques internes publiées. Vérifier sur environnement jetable canonical relatif/absolu, `noIndex`, brouillon et dépublication. Ne pas lister arbitrairement un domaine externe saisi dans le CMS. |

La consolidation doit garder cohérents liens internes, canonical et sitemap ; Google traite ces signaux ensemble. [Documentation Google sur les URL canoniques](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).

Le schéma d'article accepte un auteur personne ou organisation ; le type doit correspondre à l'auteur identifié. [Documentation Google sur les articles](https://developers.google.com/search/docs/appearance/structured-data/article).

## Images et performance : faits, puis mesures nécessaires

| Mesure du HTML servi | Résultat | Interprétation |
| --- | ---: | --- |
| Images avec `srcset` | 0 / 1 695 occurrences | Le navigateur ne peut pas choisir une variante plus légère selon la largeur depuis ces balises. |
| Images sans dimensions HTML | 31, toutes sur l'accueil | Les compositions CSS réservent souvent une surface. L'absence de width/height ne prouve donc pas, à elle seule, un décalage visuel. |
| Images avec `alt=""` | 131 | 129 miniatures dont le lien possède un libellé accessible ; deux images décoratives du livre de l'accueil. Ne pas remplir mécaniquement ces attributs. |
| Images sans attribut alt | 0 | Les descriptions présentes restent à enrichir lorsque les vrais visuels seront validés. |
| Greta | 383 images, 198 964 octets HTML | Beaucoup de finitions, pas 383 requêtes initiales démontrées. |
| Ruby Lounge | 374 images, 196 477 octets HTML | Même distinction entre DOM, ressources différées et octets réellement transférés. |
| Ruby | 301 images, 177 661 octets HTML | Même risque à mesurer sur mobile. |

Ces tailles HTML viennent du serveur de développement et comprennent ses éléments propres ; elles ne sont pas les tailles compressées d'une livraison en production. Aucun score Lighthouse ou Core Web Vitals de terrain n'est déduit de ce relevé.

Un second relevé anonyme (`test-results/seo-audit/mobile.json`, **20 h 19 Toronto**) utilise Chromium à 390 × 844 pixels CSS, DPR 3, thème clair, un contexte neuf par page, sans bridage CPU/réseau et sans défilement. Les ressources sont observées 1,5 seconde après le chargement et les polices. Les quatre pages ont un seul H1 visible, sans erreur JavaScript, débordement horizontal ou requête d'écriture.

| Page mobile | Requêtes image observées | Corps encodés des images reçues |
| --- | ---: | ---: |
| Accueil | 7 | 1 272 044 octets |
| Showroom | 3 | 172 099 octets |
| Greta | 10 | 2 558 937 octets |
| Article « Associer table et chaises » | 3 | 449 765 octets |

La photo principale de Greta mesure 2 362 × 3 543 pixels et pèse 638 267 octets, pour une boîte affichée de 350 × 263 pixels CSS. Cette observation justifie des variantes adaptées ; elle ne mesure ni la qualité réseau d'un visiteur au Maroc ni les Core Web Vitals de production. Elle confirme aussi que les 383 images du DOM ne sont pas toutes téléchargées au premier affichage.

**P1 — variantes d'images et mesures mobiles.** Les miniatures et les vues utilisent la même source pleine taille (`ModelDetail.astro:109–115`), et les finitions sont intégralement présentes dans le DOM (`:143–154`). Créer des variantes adaptées aux cartes, miniatures et vues principales, conserver l'original pour la consultation détaillée et le cadrage B. Garder un `src` de repli. Mesurer les octets transférés, LCP, CLS et interactions sur accueil, une famille, un article et une fiche lourde, à froid et sur un profil mobile documenté. Les groupes de finitions doivent rester utilisables au clavier, avec JavaScript indisponible, et sans déclencher d'emblée le téléchargement de toute la sélection. Les textes alternatifs des vues significatives doivent décrire ce qui distingue réellement la photographie ; ne pas inventer matière ou finition à partir d'un nom de fichier. [Conseils Google sur les images et les variantes responsives](https://developers.google.com/search/docs/appearance/google-images).

**P2 — cache de production.** `SeoHead.astro:33` impose `Cache-Control: no-store` à toutes les pages publiques, même hors prévisualisation. C'est une protection actuelle contre un contenu périmé, pas une preuve de lenteur mesurée. Avant d'introduire du cache, définir son invalidation à la publication/dépublication, préserver le `private, no-store` des aperçus et des flux privés, puis comparer le temps serveur et la fraîcheur réelle. Le chargement de toutes les relations de familles pour retrouver celles d'un modèle (`content.ts:100–103`) est une piste d'optimisation si le profilage révèle un coût significatif ; il n'est pas démontré comme cause des anciens blocages du serveur.

## Parcours et compléments de balisage

**P0 — un contact exploitable.** Le lien « Contacter le showroom » d'une fiche aboutit à `/showroom-casablanca/` sans référence de modèle (`ModelDetail.astro:91,162`). La page contact sait afficher téléphone, email, horaires, adresse, carte et WhatsApp (`showroom-casablanca.astro:20,31–38`), mais le relevé actuel ne fournit pas ces coordonnées : aucun lien téléphone, email ou WhatsApp sur les 28 pages. La navigation fonctionne techniquement, mais ne termine pas une demande commerciale. Confirmer et renseigner les vrais contacts, puis transmettre au canal choisi la référence consultée, sans données personnelles dans l'URL. Le test doit démontrer « fiche Greta → demande concernant Greta », sur ordinateur et mobile.

**P0 — catalogue et confidentialité définitifs.** Le formulaire possède une préférence marketing facultative, enregistre la demande avant de fournir le PDF et n'envoie aucun email. Le PDF demeure une démonstration et `src/pages/confidentialite.astro:6–7` décrit des essais de développement. Finaliser les faits juridiques et le document avant les demandes réelles. Le contrôle complet contact/jeton/PDF se fait dans une copie jetable ; cet audit anonyme ne remplace pas ces tests et n'a soumis aucune donnée sur la base existante. Voir [le contrat catalogue](catalogue.md) et [les tests isolés existants](test-results-catalogue.md).

**P2 — données structurées utiles.** Il n'existe actuellement ni `BreadcrumbList`, ni `LocalBusiness`/`FurnitureStore`, ni `Product` dans les 28 graphes rendus. Ajouter un fil d'Ariane structuré cohérent avec les liens visibles et une identité locale seulement après validation du vrai nom commercial, de l'adresse et des contacts. L'absence de `Product` n'est pas un blocage à l'indexation d'une fiche. Un éventuel balisage de produit doit se limiter aux faits établis ; l'éligibilité aux résultats enrichis dépend de propriétés supplémentaires, qui ne justifient jamais d'inventer prix, stock ou avis. [Conditions Google des extraits produit](https://developers.google.com/search/docs/appearance/structured-data/product-snippet).

## Réception avant mise en service

1. Corriger T01–T04 et le contrat T05 sur la branche de migration ; vérifier le comportement indexable dans un environnement distinct. Conserver l'aperçu principal privé et non indexable.
2. Compléter les faits commerciaux, le catalogue et la confidentialité ; contrôler chaque appel à l'action et le passage d'une référence à une demande utile.
3. Vérifier les 28 routes et leurs variantes sur un build de préproduction, avec l'origine HTTPS finale configurée : aucune URL localhost/Codespaces dans canonical, sitemap ou partage. La confidentialité peut rester hors du sitemap par choix éditorial ; son absence actuelle n'est pas un lien cassé.
4. Sur données jetables : publication, brouillon, aperçu signé, dépublication, titre/description/image/canonical/noIndex natifs, effacement d'une valeur, formulaire avec et sans consentement facultatif, refus anonyme des routes privées, expiration et téléchargement du PDF. Le panneau SEO natif est enregistré immédiatement, indépendamment du brouillon du corps ; préserver ce contrat documenté.
5. Refaire les contrôles ordinateur/mobile, clair/sombre, animations et réduction de mouvement ; comparer les octets et mesures de performance après optimisation sans transformer le langage visuel B.
6. Seulement lors d'une mise en service autorisée : vérifier robots, sitemap et données structurées sur l'hébergement permanent, puis Search Console et résultats réels. Ni le domaine, ni Cloudflare, ni Google Business Profile, ni un outil de mesure n'ont été connectés dans cet audit.

Les anciens aperçus statiques et GitHub Pages restent préservés. Leur éventuelle présence dans Google doit être examinée séparément lors du lancement ; elle n'a pas été mesurée ici et aucune modification de ces références n'est incluse.
