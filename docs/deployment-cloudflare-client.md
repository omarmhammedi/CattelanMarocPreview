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

L'intégration Resend est décrite ci-dessous. Le branchement automatique des publications GitHub n'est pas configuré ; les commandes ci-dessus publient les modifications. Avant le lancement public, connecter le domaine définitif, adapter l'origine, réenregistrer les passkeys pour ce domaine et retirer `noindex` après validation.

Les tests confirment le fonctionnement actuel sous Workers Free ; ils ne constituent pas un test de charge ni une garantie de rester sous les quotas pour tout trafic futur.

## Intégration Resend

Le domaine `client.kreedns.com` est vérifié dans le compte Resend `cattelan@client.kreedns.com`. Les enregistrements fournis par Resend ont été ajoutés via Hostinger : TXT `resend._domainkey.client`, CNAME `rsend.client` et CNAME `send.client`. Les MX existants et le transfert de la boîte Cattelan restent inchangés.

Le plugin natif `cattelan-resend` est inclus uniquement lors d'une compilation `cattelan-client`. Il fournit le transport des e-mails EmDash (connexion, récupération et invitations) et des demandes de catalogue. Expéditeur : `Cattelan Italia Maroc <cattelan@client.kreedns.com>` ; réponse par défaut : `cattelan@client.kreedns.com`. La clé `RESEND_API_KEY` doit être un secret Cloudflare limité à l'envoi depuis ce domaine, jamais une variable publique ni une valeur Git.

Pour les nouvelles demandes uniquement, le contact et sa file d'envoi sont enregistrés ensemble. Une première tentative accompagne la demande ; le cron existant reprend les échecs avec un délai croissant, une limite de huit tentatives et une fenêtre de six heures. Le corps du message reste stable pour la déduplication Resend. Les anciennes demandes ne sont pas envoyées rétroactivement. L'état de l'envoi est visible dans Contacts catalogue. Les liens envoyés par e-mail sont signés, privés et valables 24 heures ; le téléchargement affiché sur le site conserve sa durée de 15 minutes. Supprimer un contact révoque ses liens et ses envois en attente.

L'e-mail de catalogue est transactionnel et indépendant du consentement marketing. Le texte du formulaire et la page de confidentialité expliquent l'envoi par Resend. Aucun abonnement marketing ni connexion CRM externe n'est créé. Le PDF actuel est une démonstration et le message le précise.

Validation du code : 181 tests réussis ; contrôle Astro sans erreurs ni avertissements ; compilation de production et contrôle de cible réussis. L'activation et les essais de livraison réels restent à effectuer après création de la clé restreinte par le propriétaire.
