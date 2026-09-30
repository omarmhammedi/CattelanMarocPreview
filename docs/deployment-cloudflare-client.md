# Compte Cloudflare dédié au client Cattelan

## Publication du 30 septembre 2026

Le site est publié sur **https://cattelan-maroc-preview.cattelan.workers.dev** dans le compte `cattelan@client.kreedns.com`, avec les contenus et médias importés du site existant. Le domaine définitif sera ajouté plus tard. Le tableau de bord confirme **Workers Free — Current plan**. R2 est activé avec un tarif de base de 0 $ et une facturation possible au-delà des quotas inclus, expressément approuvée par le propriétaire. Aucun abonnement Workers Paid n'a été activé.

Version déployée et vérifiée : `2540aafa-d381-4f57-bdbe-16f365c57fb3`.

| Élément | Cible du compte client |
| --- | --- |
| Compte | `dba3e3d7b3e2bfbdcca8acf3667916f6` |
| Environnement | `cattelan-client` |
| Worker | `cattelan-maroc-preview` |
| Origine | `https://cattelan-maroc-preview.cattelan.workers.dev` |
| Base D1 | `cattelan-maroc-preview` — `c636dd25-e3b1-4f1d-bc8c-e294ec20717e` |
| Médias R2 | `cattelan-maroc-media-preview` |
| Catalogues privés R2 | `cattelan-maroc-catalogues-preview` |
| Namespace KV SESSION | `29a57d89be95411a962f810e0dbb74ac` |

L'environnement original `cattelan`, sa base, ses objets et son site restent en place. Les noms des buckets sont propres à chaque compte ; les comptes et les IDs D1/KV diffèrent. Le contrôle de déploiement épingle séparément les deux cibles et refuse un mélange de comptes ou de ressources.

## Données transférées et vérifications

- Base D1 : 74 tables, schéma, index et déclencheurs vérifiés après réexport ; intégrité SQLite correcte et aucune violation des clés étrangères. Les contenus et utilisateurs sont conservés. Seuls l'origine, le secret de prévisualisation et les données d'authentification temporaires ont été adaptés ou vidés dans la copie.
- Stockage R2 : 626 objets de médias et un PDF privé, soit 627 objets et 193 929 440 octets. Clés, tailles, ETags et métadonnées comparés entre les comptes ; empreintes des 625 médias référencés par le CMS vérifiées contre leurs fichiers.
- Sessions actives non transférées. Aucun paramètre chiffré dans la base source ; nouvelles clés de chiffrement et de signature stockées comme secrets Cloudflare, hors de Git.
- 28 pages publiques répondent en HTTP 200 ; 25 images échantillonnées chargent correctement. Absence de l'ancienne origine dans le HTML contrôlé. La préproduction conserve `noindex` et `robots.txt` interdit l'indexation.
- Administration anonyme redirigée vers la connexion ; export de contacts protégé ; routes de contournement et de réinitialisation de développement refusées. L'installation est déjà terminée.
- Formulaire catalogue testé dans le navigateur avec un contact fictif et sans consentement marketing. Contact enregistré, PDF téléchargé et empreinte vérifiée. Le contact fictif a ensuite été supprimé de la copie client.
- Compilation et 28 tests du contrôle de cible réussis. Wrangler `4.145.0` et les types Workers correspondants sont épinglés pour reproduire la publication validée.

Les exports, sauvegardes, rapports de vérification et secrets de migration restent dans le dossier local ignoré `.wrangler/client-migration`, avec des permissions restreintes. Ils ne doivent jamais être ajoutés au dépôt.

## Déploiements suivants

Utiliser Node.js 22.16 ou ultérieur et une connexion Wrangler autorisée dans le compte client. Les profils locaux restent hors de Git.

```sh
npm ci
npm run deploy:client
```

`npm run deploy` est un alias de `deploy:client`. La commande compile avec `CLOUDFLARE_ENV=cattelan-client`, valide le compte et les ressources puis publie le fichier `dist/server/wrangler.json`. Les secrets déjà présents sont conservés. `npm run deploy:cattelan` continue de désigner explicitement le compte original.

Pour compiler et contrôler sans publier :

```sh
CLOUDFLARE_ENV=cattelan-client RAYON_NUM_THREADS=1 NODE_OPTIONS=--max-old-space-size=2048 npm run build
node scripts/check-cloudflare-target.mjs --env cattelan-client
npx wrangler deploy --config dist/server/wrangler.json --dry-run
node --test tests/cloudflare-target.test.mjs
```

## Accès et étapes ultérieures

Les utilisateurs existants sont conservés, mais les passkeys enregistrées sur l'ancienne origine ne sont pas valables sur la nouvelle. Le propriétaire doit utiliser une récupération native à usage unique puis enregistrer lui-même une passkey sur la nouvelle origine. Ne pas activer un contournement de connexion ni relancer le setup public. Les liens de récupération sont privés, limités à 15 minutes et ne doivent pas être enregistrés dans Git.

Resend n'est pas encore configuré et aucun e-mail de test n'a été envoyé. Le branchement automatique des publications GitHub n'est pas configuré ; les commandes ci-dessus publient les modifications. Avant le lancement public, connecter le domaine définitif, adapter l'origine, réenregistrer les passkeys pour ce domaine et retirer `noindex` après validation.

Les tests confirment le fonctionnement actuel sous Workers Free ; ils ne constituent pas un test de charge ni une garantie de rester sous les quotas pour tout trafic futur.
