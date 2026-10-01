# Déploiement de feat/site-strategy sur la prévisualisation

Cible : le Worker `cattelan-maroc-preview` du compte Cloudflare « Cattelan@client.kreedns.com's Account » (`dba3e3d7b3e2bfbdcca8acf3667916f6`), servi sur https://cattelan-maroc-preview.cattelan.workers.dev. Pas de domaine public, pas d’indexation : le site reste en `noindex`, aucun changement DNS.

## Accès de la session

- Le jeton Cloudflare est une « API credential » de l’environnement : le proxy l’ajoute aux requêtes vers `api.cloudflare.com`, il n’est jamais visible dans la session. `CLOUDFLARE_ACCOUNT_ID` est une variable d’environnement.
- Wrangler refuse de démarrer sans jeton local : exporter un jeton fictif (`export CLOUDFLARE_API_TOKEN=injected-by-proxy`), puis vérifier `npx wrangler whoami`. Si le compte Cattelan n’apparaît pas, s’arrêter et le signaler : le propriétaire lancera `npm run deploy` sur son poste.
- Le CMS en ligne demande une connexion native : `npx emdash login --url https://cattelan-maroc-preview.cattelan.workers.dev` affiche un code que le propriétaire approuve dans son navigateur avec son compte administrateur.

## Étapes

1. `git fetch origin feat/site-strategy && git checkout feat/site-strategy` ; `npm install` si nécessaire.
2. Contrôles : `npx astro check`, `npm test`, `node scripts/seed-validate.mjs`. Tout doit passer.
3. Déploiement : `npm run deploy` (construit pour `cattelan-client`, vérifie la cible avec `scripts/check-cloudflare-target.mjs`, puis `wrangler deploy`).
4. Connexion au CMS en ligne (voir ci-dessus).
5. Migrations, dans cet ordre, chacune d’abord en aperçu, résultat montré au propriétaire, puis avec `--apply` :
   ```
   export EMDASH_BASE_URL=https://cattelan-maroc-preview.cattelan.workers.dev
   node scripts/migrations/0014-site-strategy-pages.mjs
   node scripts/migrations/0015-site-information-pages.mjs
   node scripts/migrations/0016-new-families.mjs
   node scripts/migrations/0017-cndp-receipt.mjs
   node scripts/migrations/0018-collection-additions.mjs
   ```
   Chaque script est additif, sauvegarde l’état avant écriture dans `.wrangler/migrations/` et ne change rien à une seconde exécution. Un script qui s’arrête sur une valeur inattendue a protégé une modification d’éditeur : lire le message, ne pas forcer.
6. Dans EmDash, Plugins › Rendez-vous et projets › Paramètres : vérifier « Adresse des alertes » (omar@kreedns.com par défaut).
7. Vérifier en ligne (HTTP 200, images chargées) : `/`, `/collections/`, `/collections/tables/`, `/collections/tables-basses/`, `/collections/consoles-miroirs/`, `/modeles/craig/`, `/modeles/botero-argile/`, `/sur-mesure/`, `/professionnels/`, `/showroom-casablanca/`, `/faq/`, `/a-propos/`, `/votre-projet/`, `/mentions-legales/`, `/confidentialite/`, `/catalogue/`. Envoyer une demande de rendez-vous de test et la supprimer ensuite depuis l’administration.
8. Fermer la session CMS (`npx emdash logout`) et rendre compte : version déployée, sortie de chaque migration, pages vérifiées.

## Ne pas faire

- Ne pas retirer le `noindex`, ne pas ajouter de route ou de domaine, ne pas toucher au DNS.
- Ne pas écrire directement dans la base D1 : seules les migrations, par l’API native, modifient le contenu.
- Ne pas afficher ni copier de jeton.
