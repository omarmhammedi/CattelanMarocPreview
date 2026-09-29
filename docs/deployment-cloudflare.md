# Déploiement Cloudflare de Cattelan

Le propriétaire a autorisé un déploiement séparé de Cattelan dans son compte Cloudflare existant. Les ressources de Civico et des autres sites ne font pas partie de cette opération. Le développement local conserve sa base, ses médias, ses secrets et son port privé 4321.

Ce guide décrit la procédure de déploiement. Une compilation réussie ou un `--dry-run` ne prouve pas que le site a été publié : l'adresse effective et les vérifications distantes doivent figurer dans le rapport de mise en ligne.

## Cible isolée

La configuration source reste `wrangler.jsonc`. L'environnement nommé `cattelan` déclare explicitement le compte approuvé, le nom du nouveau Worker, une nouvelle base D1, deux nouveaux buckets R2 et un nouveau namespace KV pour `SESSION`. Aucun identifiant d'une ressource existante d'un autre site ne doit être réutilisé. Les ressources distantes sont créées puis vérifiées avant de renseigner leurs identifiants.

| Ressource Cattelan | Cible |
| --- | --- |
| Worker | `cattelan-maroc-preview` |
| Base D1 | `cattelan-maroc-preview` |
| Médias R2 | `cattelan-maroc-media-preview` |
| PDF privés R2 | `cattelan-maroc-catalogues-preview` |
| Sessions KV | `cattelan-maroc-session-preview` |
| Origine configurée | `https://cattelan-maroc-preview.omar-8b8.workers.dev` |

Les valeurs au premier niveau restent celles du développement local. Les bindings et les variables de l'environnement `cattelan` sont répétés explicitement car leur héritage diffère des autres paramètres Wrangler. La première adresse utilise `workers.dev`, sans route ni domaine personnalisé ; les URL de versions supplémentaires sont désactivées.

`SITE_INDEXABLE=false` conserve les réponses `noindex` et le refus de parcours dans `robots.txt`. Ce réglage empêche une indexation souhaitée par le site ; il ne rend pas l'adresse privée. La version distante reste une préproduction avec son PDF de démonstration et ses mentions de contenu provisoire.

## Compilation et contrôle de la cible

Le plugin Vite choisit l'environnement **pendant la compilation**. La commande suivante produit la configuration aplatie dans `dist/server/wrangler.json` :

```sh
CLOUDFLARE_ENV=cattelan RAYON_NUM_THREADS=1 NODE_OPTIONS=--max-old-space-size=1024 npm run build
```

Avant chaque envoi, vérifier dans ce fichier généré le compte, le nom du Worker, chaque identifiant D1/KV, chaque bucket R2, `EMDASH_SITE_URL`, `SITE_INDEXABLE` et l'absence de route personnalisée. Vérifier aussi qu'aucun secret local n'est devenu une variable publique de configuration. Ne pas modifier le fichier généré pour corriger une cible : corriger la source puis recompiler.

```sh
node scripts/check-cloudflare-target.mjs
npx wrangler deploy --config dist/server/wrangler.json --dry-run
```

Le contrôle est strictement local et en lecture seule : il refuse un autre compte, des bindings différents, une route de domaine, des variables inattendues ou une compilation différente de l'environnement source. Il ne prouve pas à lui seul que les identifiants désignent de nouvelles ressources ; cette vérification nécessite les reçus de création et l'inventaire distant.

Le déploiement utilise ensuite exactement cette configuration contrôlée. Ajouter `--env cattelan` uniquement au moment du déploiement ne corrigerait pas une compilation faite pour le mauvais environnement. Pour les mises à jour autorisées après le premier transfert, `npm run deploy:cattelan` enchaîne la compilation de cet environnement, le contrôle de cible et l'envoi du fichier généré. `npm run deploy` est un alias de cette commande protégée : il ne déploie jamais implicitement la configuration locale.

L'adaptateur Astro reste inchangé : il ajoute le binding `IMAGES`. Depuis la révision SEO 0011, les photographies et logos internes dont les dimensions sont connues utilisent le service natif EmDash `/_image` pour des variantes WebP adaptées à leur cadre. Les originaux R2 sont conservés ; les plans, PDF et nuanciers restent servis directement. Ce changement demande des transformations au service Images existant : il ne constitue pas une garantie de gratuité et n'active aucun abonnement ou changement de forfait. Le namespace `SESSION` est explicite pour éviter une création implicite imprévisible par l'adaptateur Astro.

Les journaux applicatifs sont activés, mais les journaux automatiques d'invocation sont désactivés car ils incluent l'URL de la requête. Les traces sont configurées avec un échantillonnage nul pour cette préproduction : aucun lien signé ne doit être conservé par cette voie avant une revue dédiée. Ne jamais ajouter de journalisation des formulaires, cookies, secrets ou jetons.

## Données et administration

Prendre une sauvegarde cohérente en lecture seule de l'état local avant transfert. Copier la base éditoriale et les objets avec vérification des nombres, clés et empreintes. Ne pas lancer de setup, de réinitialisation ni de seed sur le site existant. La nouvelle base distante doit être alimentée avant d'exposer son administration : la valeur EmDash indiquant que l'installation est terminée empêche un visiteur de prendre le premier compte administrateur.

La copie distante ne doit pas réutiliser une session locale active, un jeton de récupération temporaire ou un jeton technique de développement. Une passkey est attachée à son origine : conserver la passkey locale ne permet pas de se connecter automatiquement au nouveau domaine. L'accès du propriétaire doit passer par le mécanisme natif d'EmDash, avec une passkey enregistrée pour l'adresse distante. Ne pas publier de contournement d'authentification. En compilation de production, les endpoints `auth/dev-bypass` et `setup/dev-bypass` doivent refuser l'accès.

`EMDASH_SITE_URL` désigne l'origine HTTPS exacte du Worker. Le secret `EMDASH_ENCRYPTION_KEY` doit permettre de lire les éventuels secrets chiffrés transférés. `CATALOGUE_TOKEN_SECRET` est un secret dédié au téléchargement et peut être distinct de celui du développement ; sa rotation invalide les liens qu'il avait signés. Les secrets passent par Wrangler, jamais dans les fichiers suivis par Git ni dans les journaux. `EMDASH_AUTH_SECRET` n'est pas le secret de session dans EmDash 0.41.0 : c'est un ancien repli pour le sel de hachage des IP.

La médiathèque `MEDIA` et les PDF `CATALOGUES` sont séparés. Les buckets restent sans accès public direct ; les médias publics sont servis par les routes prévues et les PDF par des liens signés après enregistrement du formulaire. Le CRM reste en mode simulé, aucun service d'email n'est activé par ce déploiement et le consentement marketing reste facultatif.

## Vérification distante

Effectuer les contrôles suivants avec les vrais bindings distants après publication :

- Pages publiques, six familles, onze modèles, cinq articles, liens internes et médias chargés ; images identiques aux médias transférés.
- Accueil et showroom sur ordinateur et mobile, thèmes clair et sombre, navigation et animations.
- `robots.txt`, métadonnées, URL canonique, réponses sans cache et `noindex` conformes à la préproduction.
- Administration anonyme protégée, endpoints de développement refusés, configuration terminée et aucune route publique de réinitialisation.
- Formulaire avec identité de test, téléchargement et empreinte du PDF, consentement facultatif et routes privées refusées aux visiteurs anonymes. Ne pas présenter un contrôle HTTP comme la preuve d'une passkey créée sur l'iPhone du propriétaire.
- Vérification finale que les identifiants et versions des ressources existantes des autres sites n'ont pas changé.

Les sauvegardes, exports, identités de test et rapports contenant des informations privées restent hors de Git. Le rapport public ne contient que des totaux, empreintes de fichiers publics, captures du site et résultats de validation.

## Sources vérifiées

- [Environnements Cloudflare avec Vite](https://developers.cloudflare.com/workers/vite-plugin/reference/cloudflare-environments/) : sélection à la compilation et configuration aplatie.
- [Adaptateur Astro Cloudflare](https://docs.astro.build/en/guides/integrations-guide/cloudflare/) : services d'images et sessions KV.
- [Configuration Wrangler](https://developers.cloudflare.com/workers/wrangler/configuration/) : bindings, variables, routes et observabilité.
- [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/) : les journaux d'invocation incluent l'URL ; éviter de conserver les liens temporaires de catalogue ou d'aperçu dans des journaux applicatifs.

Ces choix ont également été contrôlés dans les sources installées de Wrangler 4.125.0, de l'adaptateur Astro Cloudflare 14.3.3 et d'EmDash 0.41.0.
