# Développer Cattelan Maroc

Le nouveau site est une application Astro + EmDash 0.41 exécutée dans le runtime Cloudflare local. La base D1 et les fichiers R2 sont simulés dans le projet : aucun compte Cloudflare n'est nécessaire pour développer. Les anciennes maquettes `legacy/index.html`, `version-a/` et `version-b/` restent des références statiques. GitHub Pages peut les servir ; il n'exécute pas le CMS, ses formulaires ou son administration.

## Démarrer dans Codespaces

1. Dans GitHub, sélectionner la branche de migration, puis **Code → Codespaces → Create codespace**.
2. Attendre l'installation. Le conteneur fournit Node 24, exécute `npm ci` et prépare les secrets locaux manquants.
3. Exécuter `npm run dev` dans le terminal.
4. Dans **Ports**, ouvrir le port **4321** dans le navigateur. Sa visibilité doit rester **Private** : le site et l'administration utilisent le même port. L'URL externe est en HTTPS, même si Astro écoute en HTTP dans le conteneur.
5. Ajouter `/_emdash/admin` à cette URL pour accéder au CMS.

Le conteneur rétablit la visibilité privée à la reconnexion. Si GitHub refuse cette commande, le terminal invite à la vérifier dans **Ports**. Une prévisualisation publique destinée au client se fera sur un environnement Cloudflare séparé, après configuration de l'administration.

## Démarrer sur un ordinateur

Avec Node 24 et le dépôt cloné :

```sh
npm ci
node scripts/setup-dev.mjs
npm run dev
```

Ouvrir `http://localhost:4321`, puis `http://localhost:4321/_emdash/admin`.

Le script utilise le générateur de clés d'EmDash installé dans le projet et crée une clé distincte pour les liens de téléchargement. Il n'affiche pas les secrets et ne remplace pas les valeurs existantes. Relancer le script est sans effet sur les clés déjà configurées.

Dans Codespaces, il renseigne aussi `EMDASH_SITE_URL` avec l'URL HTTPS du port 4321. Si le projet est copié dans un autre Codespace, adapter cette URL dans `.dev.vars` avant l'inscription des passkeys. Les clés et données ne doivent pas être réinitialisées pour changer cette adresse.

## Créer le premier administrateur

Dans l'assistant EmDash, choisir **Cattelan Italia Maroc** comme titre du site, puis créer le compte avec l’adresse d’administration convenue hors du dépôt et enregistrer une passkey avec le navigateur. Cette étape appartient au titulaire du compte ; aucun mot de passe ou compte partagé n'est fourni par le dépôt.

Une passkey dépend du domaine utilisé. Conserver la même URL de Codespace pendant les tests ; le futur domaine de production aura sa propre inscription. L'envoi d'invitations et les liens de connexion par email nécessiteront un prestataire email configuré. L'adresse d'administration n'est pas automatiquement l'adresse commerciale affichée au public.

## Données locales et catalogue de démonstration

Les liaisons prévues sont `DB` pour D1, `MEDIA` pour les médias EmDash et `CATALOGUES` pour les PDF privés. Wrangler conserve l'état local sous `.wrangler/`. Arrêter puis relancer le serveur conserve cet état. Supprimer un Codespace supprime aussi ces données locales : Git ne contient pas les modifications effectuées dans le CMS.

Charger une fois le PDF de démonstration dans le R2 local, depuis la racine du dépôt :

```sh
npx wrangler r2 object put cattelan-maroc-catalogues-preview/catalogues/cattelan-demonstration.pdf --file src/plugins/catalogue/assets/cattelan-demonstration.pdf --content-type application/pdf --local
```

Le fichier est explicitement fictif. Pour le remplacer, utiliser l'écran **Contacts catalogue** de l'administration (`/_emdash/admin/plugins/catalogue-leads/contacts`) : téléverser le PDF privé, copier sa clé dans le champ `private_file_key` de l'entrée Catalogue, puis publier cette entrée. La limite prévue est de 8 Mio. Ne pas déposer le PDF dans `public/` ni dans le stockage public des images.

Le visiteur renseigne son nom et son email. Le formulaire enregistre la demande avant de proposer le téléchargement. Le consentement aux communications est distinct et facultatif. Le connecteur CRM restera simulé jusqu'à la définition de l'API finale ; ne pas utiliser de vrais contacts pour les essais. Aucun email de catalogue n'est promis tant qu'aucun service d'envoi n'est configuré.

## Modifier et vérifier le contenu

Le fichier `seed/seed.json` sert à initialiser une base vide. Modifier ce fichier après le premier démarrage ne met pas à jour une base existante. Les modifications éditoriales passent ensuite par EmDash ; les évolutions de schéma doivent être migrées explicitement et conservées avec le code.

Pour chaque type de page, vérifier ce cycle avec un texte facilement reconnaissable : enregistrer un brouillon, ouvrir l'aperçu, confirmer que le site anonyme conserve la version publiée, publier, puis recharger le site anonyme. Vérifier aussi une image remplacée, une référence entre collections et la navigation mobile. Le rendu serveur doit refléter la publication sans reconstruire le site.

```sh
npm run check
npm test
npm run build
npm run preview
```

`npm run preview` teste le build ; arrêter le serveur de développement avant de réutiliser son port. Les commandes réussies ne remplacent pas une vérification visuelle des animations, des thèmes et des formulaires.

Astro 7 peut lancer le serveur en arrière-plan lorsqu'il détecte un agent de développement. `npx astro dev status`, `npx astro dev logs --follow` et `npx astro dev stop` permettent de le gérer. Pour garder le processus au premier plan dans une automatisation, utiliser `npm run dev -- --ignore-lock` seulement après avoir vérifié qu'aucun autre serveur de ce projet ne tourne.

## Préparer Cloudflare ensuite

Après connexion du compte, créer un environnement de préproduction avec ses propres ressources D1, R2 et secrets, puis tester l'application sur son URL Workers. Le domaine `cattelanitalia.ma` sera raccordé plus tard. Ne pas lancer `npm run deploy` avant d'avoir choisi le compte et les noms de ressources.

Configurer aussi l’URL du site dans EmDash et `EMDASH_SITE_URL` avec l’origine Workers de préproduction : ne pas conserver l’URL localhost lors du transfert. Vérifier les canoniques, les aperçus signés et les passkeys sur cette origine. `SITE_INDEXABLE` reste à `false` jusqu’à la validation de la mise en ligne.

Le transfert doit couvrir séparément le contenu EmDash, les médias, les PDF privés et les contacts du plugin. Un export de site EmDash ne constitue pas à lui seul une sauvegarde des contacts, des comptes et des secrets. Conserver les clés hors de Git et vérifier une restauration avant de basculer vers la production.

## Références vérifiées

- [Déploiement Cloudflare et seed EmDash](https://docs.emdashcms.com/deployment/cloudflare/)
- [Clés et secrets](https://docs.emdashcms.com/deployment/secrets/)
- [Commandes CLI](https://docs.emdashcms.com/reference/cli/)
- [Authentification et premier compte](https://docs.emdashcms.com/guides/authentication/)
- [Évolution du schéma](https://docs.emdashcms.com/deployment/schema-evolution/)
- [Transfert d'un site](https://docs.emdashcms.com/guides/site-transfer/)
- [Ports et visibilité Codespaces](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace)

Les coordonnées commerciales (téléphone, lien WhatsApp, adresse et horaires) sont à renseigner dans **Configuration du site**. Elles restent hors des données de démarrage publiées dans Git.
