# Catalogue, contacts et futur CRM

Le plugin natif `catalogue-leads` utilise les API d’EmDash 0.41.0. Ses données restent dans le stockage privé du plugin, hors des collections publiques et de la recherche éditoriale. Le document PDF reste dans le bucket R2 privé `CATALOGUES`, distinct de la médiathèque `MEDIA`.

## Parcours public

1. Le formulaire envoie le nom, l’e-mail, l’identifiant du catalogue, un UUID de demande et le choix **facultatif** de recevoir des communications. Le choix vaut `false` s’il n’est pas renseigné.
2. Le serveur valide les champs, le piège anti-robot, la limite de taille, la limite de fréquence et la disponibilité de l’édition publiée ainsi que du PDF.
3. Une écriture conditionnelle EmDash enregistre **dans le même document** le contact et l’événement CRM en attente. Il n’existe pas de fenêtre où le contact serait enregistré sans son événement.
4. Seulement après cette écriture, le serveur signe un lien valable 15 minutes. Le téléchargement vérifie la signature, l’expiration et l’existence de la demande enregistrée. Il n’envoie aucun e-mail.

Le client conserve le même `requestId` s’il réessaie après une erreur réseau. Si les valeurs saisies changent, il crée un nouvel UUID. Un UUID déjà utilisé avec un autre nom, e-mail, catalogue ou choix de communication est refusé. Une nouvelle demande volontaire avec un nouvel UUID crée un nouvel événement ; le futur CRM pourra rapprocher les contacts par e-mail sans perdre l’historique des consentements.

Le lien ne contient aucune donnée personnelle. Il donne accès à l’édition demandée au moment de l’enregistrement, même si une autre édition est ensuite publiée. Aucune donnée de formulaire ni aucun jeton de téléchargement n’est écrit dans les journaux du plugin. Les compteurs de fréquence utilisent une empreinte salée de l’IP (ou de l’e-mail en l’absence d’IP) et sont nettoyés par la tâche planifiée.

### Contrat du formulaire

`POST /_emdash/api/plugins/catalogue-leads/request`, avec `Content-Type: application/json` et `X-EmDash-Request: 1` :

```json
{
  "requestId": "<UUID v4 conservé pour les tentatives de la même demande>",
  "catalogueId": "<id ou slug de la fiche Catalogue publiée>",
  "name": "Nom du visiteur",
  "email": "visiteur@example.test",
  "communicationsConsent": false,
  "website": "",
  "sourcePath": "/catalogue/"
}
```

EmDash enveloppe les réponses JSON dans `{ "success": true, "data": ... }`. Dans `data`, vérifier `ok` : un succès fournit `downloadUrl`, `placeholder` et `message` ; une erreur attendue fournit `code` et `message`. Les refus du système (méthode, authentification, CSRF, corps trop volumineux) ont un statut HTTP d’erreur. Le formulaire doit traiter les deux cas.

## Administration

La page `/_emdash/admin/plugins/catalogue-leads/contacts` liste les demandes avec pagination, le choix de communication, l’édition et l’état CRM. Les routes privées de consultation, d’export, de traitement et de chargement PDF exigent `plugins:manage` : elles sont réservées aux administrateurs. L’interface utilise `apiFetch`, qui ajoute la protection CSRF d’EmDash.

L’export CSV neutralise les formules qui pourraient provenir des champs saisis. L’export direct est limité à 5 000 demandes ; au-delà, utiliser la route privée `contacts` et son curseur pour un export paginé. Les données exportées ne doivent pas être ajoutées au dépôt Git.

L’action « Supprimer » retire atomiquement la demande et son événement CRM, et invalide son lien de téléchargement. Elle concerne les données de ce site ; elle ne supprime pas d’éventuels exports déjà téléchargés. Lorsque le CRM réel sera connecté, intégrer aussi son mécanisme de suppression et de conservation.

Pour une nouvelle édition :

1. Dans « Mettre à jour un catalogue PDF », choisir le catalogue concerné et le nouveau PDF.
2. Vérifier le choix « Document de démonstration », puis cliquer sur « Associer au brouillon ».
3. Ouvrir « Vérifier et publier le catalogue » : contrôler l’édition, le titre et la couverture, puis publier la fiche Catalogue dans EmDash.
4. Tester une demande et son téléchargement avant de communiquer le lien public.

L’interface associe le PDF au brouillon automatiquement, sans copier de valeur technique. Elle conserve les autres champs et utilise la révision courante d’EmDash pour détecter les modifications concurrentes. Elle ne publie jamais automatiquement. Le chargement n’écrase pas le fichier utilisé par l’édition publiée. La médiathèque publique sert uniquement aux couvertures et aux images. Les anciens fichiers R2 ne sont pas supprimés automatiquement pour préserver les liens encore valables ; leur purge pourra suivre la politique de conservation retenue.

## Initialiser le PDF provisoire

Après la configuration locale :

```sh
npx wrangler r2 object put cattelan-maroc-catalogues-preview/catalogues/cattelan-demonstration.pdf \
  --file src/plugins/catalogue/assets/cattelan-demonstration.pdf \
  --content-type application/pdf --local
```

Le seed éditorial pointe vers `catalogues/cattelan-demonstration.pdf` et indique `is_placeholder: true`. Le document porte explicitement la mention « Catalogue de démonstration ». Ce chargement est une action de préparation ; une visite publique ne crée jamais de PDF ni ne modifie le bucket.

## CRM et reprise après incident

Le connecteur est volontairement en **mode test sans accès réseau**. Le traitement place les événements dans `waiting_configuration`, sans prétendre qu’ils ont été transmis. Un bouton admin permet de tester ce chemin. L’activation du plugin programme le traitement toutes les cinq minutes ; le Worker doit conserver le gestionnaire de tâches planifiées EmDash et son déclencheur cron.

`CrmAdapter.send(lead, idempotencyKey)` est le point de connexion au futur CRM. L’adaptateur de production devra avoir un délai de requête inférieur au bail de 60 secondes et transmettre la clé stable `catalogue-request:<UUID>`. Il devra respecter la distinction entre une demande de catalogue et le consentement aux communications.

Une prise en charge atomique empêche deux workers de traiter simultanément un événement. Une erreur conserve les données et programme une reprise avec délai croissant. Un bail expiré est récupérable après interruption. La livraison est **au moins une fois** : le CRM doit respecter la clé d’idempotence, car une réponse perdue après un envoi externe ne permet pas de garantir une seule exécution. Le connecteur réel devra remettre explicitement en attente les événements `waiting_configuration` après revue de son mapping.

## Secrets, sauvegarde et limites actuelles

- `CATALOGUE_TOKEN_SECRET` : secret aléatoire dédié, généré localement par le script de configuration ; à créer séparément dans Cloudflare. Ne jamais le committer. Sa rotation invalide les liens de téléchargement existants.
- `CATALOGUES` : bucket privé sans URL publique. Le binding local et celui de préproduction doivent rester séparés de la production.
- Les fichiers PDF sont limités à **8 Mio** dans ce prototype, limite documentée des routes brutes EmDash. Pour un catalogue final plus volumineux, ajouter un endpoint authentifié de transfert/streaming avant sa mise en ligne ; ne pas placer le PDF dans la médiathèque publique pour contourner la limite.
- Les exports de site EmDash n’incluent pas le stockage des plugins ni les secrets. La sauvegarde doit donc inclure la base D1 complète, le bucket privé et les secrets dans leur canal sécurisé. Tester la restauration de contacts et d’un téléchargement avant migration vers un autre environnement.
- La politique de conservation et le texte de confidentialité définitif restent à finaliser avant de collecter des données réelles. Utiliser des identités de test pendant la préproduction.

## Vérifications

`node --experimental-strip-types --test tests/catalogue.test.ts` couvre la validation, les accès concurrents, l’idempotence, les défaillances de stockage/CRM, les baux, l’expiration et l’altération des liens, et la sécurité CSV. Les vérifications HTTP locales doivent en complément prouver le refus des routes privées anonymes, l’accès au PDF après enregistrement réel, le refus d’un faux jeton, ainsi que la lecture de l’édition publiée après modification du CMS.

Sources officielles vérifiées pour l’implémentation : [plugin natif](https://docs.emdashcms.com/plugins/creating-native-plugins/your-first-native-plugin/), [stockage conditionnel](https://docs.emdashcms.com/plugins/creating-plugins/storage/), [routes et limites](https://docs.emdashcms.com/plugins/creating-plugins/api-routes/), [administration React](https://docs.emdashcms.com/plugins/creating-native-plugins/react-admin/). Les signatures ont également été contrôlées dans le package `emdash@0.41.0` installé.
