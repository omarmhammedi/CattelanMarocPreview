# Développer Cattelan Maroc

Le nouveau site est une application Astro + EmDash 0.41 exécutée dans le runtime Cloudflare local. La base D1 et les fichiers R2 sont simulés dans le projet : aucun compte Cloudflare n'est nécessaire pour développer. Les anciennes maquettes `legacy/index.html`, `version-a/` et `version-b/` restent des références statiques. GitHub Pages peut les servir ; il n'exécute pas le CMS, ses formulaires ou son administration.

## Démarrer dans Codespaces

1. Dans GitHub, sélectionner la branche de migration, puis **Code → Codespaces → Create codespace**.
2. Attendre l'installation. Le conteneur fournit Node 24, exécute `npm ci` et prépare les secrets locaux manquants.
3. Exécuter `npm run dev` dans le terminal.
4. Dans **Ports**, ouvrir le port **4321** dans le navigateur. Sa visibilité doit rester **Private** : le site et l'administration utilisent le même port. L'URL externe est en HTTPS, même si Astro écoute en HTTP dans le conteneur.
5. Ajouter `/_emdash/admin` à cette URL pour accéder au CMS.

Le conteneur rétablit la visibilité privée à la reconnexion. Si GitHub refuse cette commande, le terminal invite à la vérifier dans **Ports**. Une prévisualisation publique destinée au client se fera sur un environnement Cloudflare séparé, après configuration de l'administration.

### Relancer automatiquement l'aperçu après un redémarrage

Sur une installation déjà initialisée, `.devcontainer/preview-start.sh` lance Astro une fois au démarrage du conteneur ou à l'ouverture de l'éditeur. Le Codespace existant possède aussi un appel dans `~/.ssh/rc`, exécuté avec le profil de connexion `bash -lc`, pour les reconnexions SSH depuis le mobile. Les dépendances, `.dev.vars` et le stockage D1 local doivent déjà exister : ce mécanisme n'installe rien et ne réinitialise pas EmDash.

Un ancien conteneur déjà créé peut conserver uniquement `node .devcontainer/private-port.mjs` comme commande de rattachement, même si le fichier de configuration du dépôt contient les nouveaux hooks. Cette entrée rétablit désormais le port privé, puis lance les helpers de suivi de fin de tâches et d'aperçu : la reconnexion de l'éditeur fonctionne donc aussi avec cette ancienne configuration, sans reconstruction. Si la visibilité privée n'est pas confirmée, cette entrée ne démarre pas l'aperçu et affiche un avertissement ; le suivi d'arrêt peut démarrer indépendamment. Les appels restent bornés et n'affichent pas les sorties privées des sous-commandes. Les verrous existants absorbent les appels concurrents des nouveaux hooks.

Ce pont couvre le rattachement de l'éditeur ; il n'ajoute pas un événement de démarrage à un ancien conteneur qui ne possède pas de `postStartCommand`. Pour démarrer le site dès la reprise d'une machine sans connexion éditeur ou SSH, la configuration actuelle de `.devcontainer/devcontainer.json` doit être appliquée par le cycle normal de reconstruction. Aucune reconstruction de la machine contenant les données CMS n'a été effectuée pour ce correctif.

Un verrou temporaire empêche deux connexions simultanées de lancer deux serveurs. Astro réutilise son serveur existant ou élimine son ancien verrou si le processus a disparu. Le port demandé reste 4321 ; une collision échoue explicitement au lieu de déplacer le site sur 4322. Le démarrage ne se répète pas en boucle : seule l'erreur native exacte de dépassement des 30 secondes d'Astro autorise une seconde tentative, après deux secondes et une nouvelle vérification des prérequis et de la désactivation. Chaque invocation a aussi une borne externe de 60 secondes. Les autres erreurs ne déclenchent aucune reprise. Les journaux sont `.astro/preview-start.log` et `.astro/dev.log`.

```sh
# Demander une seule tentative de démarrage en arrière-plan
bash .devcontainer/preview-start.sh start

# Garder le serveur arrêté pendant une maintenance, même à la reconnexion
bash .devcontainer/preview-start.sh disable
npx astro dev stop

# Réactiver le démarrage automatique et lancer l'aperçu
bash .devcontainer/preview-start.sh enable
```

Sans désactivation explicite, un arrêt manuel d'Astro dure jusqu'au prochain démarrage, rattachement de l'éditeur ou accès SSH. Le marqueur de désactivation reste local sous `.astro/preview-autostart.disabled` et ne touche pas le réglage d'arrêt du Codespace.

Ce mécanisme ne réveille pas une machine arrêtée, ne la maintient pas allumée et ne modifie pas le délai de quinze minutes après les tâches. Il démarre le site **après la reprise du Codespace**. L'aperçu reste inaccessible lorsque la machine est éteinte. Il ne surveille pas continuellement un serveur bloqué ; `npx astro dev status` et une requête HTTP restent nécessaires pour diagnostiquer ce cas distinct.

Les tests `node --test .devcontainer/private-port.test.mjs .devcontainer/preview-start.test.mjs` utilisent des répertoires jetables et de faux exécutables, sans GitHub ni accès au CMS. Ils vérifient notamment l'ancienne entrée de rattachement, les erreurs de visibilité, les connexions simultanées, la fin du verrou, les prérequis, la désactivation et la reprise unique après un démarrage à froid trop lent. Voir le [rapport de rétablissement](test-results-preview-reconnect.md).

### Afficher le site dans l’éditeur

Dans **Ports**, faire un clic droit sur **4321 → Preview in Editor**. Les pages publiques GET/HEAD autorisent leur intégration uniquement dans l’environnement de développement Codespaces : une politique explicite `object-src 'none'`, sans restriction `frame-ancestors`, évite aussi l’ajout de `X-Frame-Options` par EmDash. Une liste limitée aux domaines connus des webviews ne couvre pas toutes les imbrications de l’éditeur. Ce choix autorise délibérément tout ancêtre à afficher les pages publiques de développement, formulaire catalogue compris ; le port privé continue d’exiger l’authentification GitHub. Il ne donne pas accès au contenu de l’iframe depuis une autre origine. Les pages d’administration, les API, les aperçus CMS signés et la version compilée gardent leurs protections d’intégration ; une politique CSP existante n’est jamais remplacée. Ouvrir l’administration dans un onglet normal du navigateur.

`node tests/editor-preview-browser.mjs` vérifie en lecture seule les domaines de webview connus, des ancêtres supplémentaires et une imbrication sandboxée avec les vraies réponses locales du site. Les pages publiques doivent s’afficher ; les pages protégées doivent rester bloquées. Ces ancêtres sont simulés : le test ne valide pas la session GitHub du navigateur de l’utilisateur.

Si le panneau indique **github.com refused to connect**, ouvrir d’abord l’URL du port dans un onglet normal du même navigateur/profil, terminer la connexion GitHub, puis recharger le Simple Browser. La page de connexion GitHub interdit elle-même son intégration. Dans Brave, si les cookies tiers restent bloqués, le réglage du lion **Advanced controls → cookies → Allow all cookies** peut être appliqué au seul onglet du Codespace ; recharger ensuite l’éditeur. Le code du site ne peut pas lever les restrictions de connexion de GitHub ou du navigateur. L’onglet normal reste utilisable si l’intégration échoue. Voir [les cookies des ports privés](https://docs.github.com/en/codespaces/reference/security-in-github-codespaces#port-forwarding) et [les réglages Brave par site](https://support.brave.app/hc/en-us/articles/360022806212-How-do-I-use-Shields-while-browsing).

### Arrêt automatique après les tâches Codex

Le surveillant `.devcontainer/task-autostop.mjs` demande l’arrêt du Codespace **15 minutes après la fin vérifiée de toutes les tâches Codex**, sous-agents compris. Il attend aussi l’absence de message en attente et d’objectif actif. Fermer ChatGPT ou la connexion SSH ne déclenche pas ce délai.

Le décompte commence seulement après une fin de tâche observée avec un suivi opérationnel. Une nouvelle tâche annule le décompte ; ses 15 minutes commencent après sa fin. Un tour terminé, échoué ou interrompu est une exécution finie ; un objectif encore actif ou un message en attente bloque toujours l’arrêt. Une erreur, une connexion de suivi perdue ou un état inconnu annule l’arrêt prévu : le surveillant ne déduit jamais qu’une tâche est terminée d’une simple déconnexion.

Un rafraîchissement des réglages de conversation ne constitue pas une nouvelle tâche et ne repousse pas l’échéance. Le suivi compare l’identité et l’état du dernier tour, sa date de fin et l’objectif, sans utiliser les dates générales de modification de la conversation. Chaque départ ou remise à zéro du décompte est journalisé avec sa raison et son échéance, sans contenu des messages.

Les compteurs du serveur Codex sont créés à leur première utilisation : un serveur neuf peut n’exposer aucun des quatre compteurs d’activité surveillés. Leur absence seule ne bloque pas le décompte ; toute valeur présente doit rester valide et nulle. L’identité du serveur, le format des diagnostics et les vérifications des tâches, objectifs et files d’attente restent obligatoires. Une conversation vierge et inactive, pas encore enregistrée par Codex, ne constitue pas une tâche et ne crée pas de dépendance persistante.

Le fichier privé `~/.local/state/cattelan-task-autostop/checkpoint.json` conserve les identifiants des conversations observées et les demandes d’arrêt, sans messages ni identifiants d’authentification. Une reconnexion ou un redémarrage ne supprime plus cette mémoire. Même si le serveur redémarre sans conversation chargée, le surveillant relit l’état des conversations enregistrées et reprend un délai complet de 15 minutes après vérification. Il ne reprend aucune tâche. Un serveur sans aucune tâche connue ne fournit pas de preuve de fin et n’arme pas le délai.

Après acceptation d’une demande d’arrêt, le surveillant reste actif et consulte l’état GitHub. Il ne confond pas l’acceptation HTTP avec un arrêt confirmé. Si GitHub reste `Available`, il peut retenter après au moins une minute, au maximum trois demandes, chacune précédée d’une nouvelle vérification. Aucune répétition n’est envoyée pendant `ShuttingDown` ; une nouvelle activité annule les reprises. L’état accepté et le nombre de tentatives survivent au redémarrage du seul surveillant. Une erreur d’état reste visible dans `status.json` avec une raison limitée, sans contenu des requêtes.

Le processus s’exécute silencieusement en arrière-plan. Les commandes `postStartCommand` et `postAttachCommand` le démarrent sans créer de doublon. Sur le Codespace existant, un appel géré dans `~/.ssh/rc` assure aussi son démarrage aux reconnexions SSH ; aucune reconstruction du conteneur n’est nécessaire pour cette installation locale. Cet appel passe par `bash -lc` : le profil de connexion Codespaces doit restaurer l’identité et les identifiants GitHub avant le lancement du surveillant. Un lancement direct depuis `~/.ssh/rc` intervient trop tôt.

Depuis la racine du dépôt :

```sh
# Voir le suivi et le décompte éventuel
node .devcontainer/task-autostop.mjs status

# Suspendre l’arrêt automatique, par exemple avant une longue édition EmDash
node .devcontainer/task-autostop.mjs disable

# Réactiver le suivi des fins de tâches
node .devcontainer/task-autostop.mjs enable

# Démarrer le surveillant si nécessaire
node .devcontainer/task-autostop.mjs start
```

Le suivi concerne Codex : une édition du CMS dans Safari ou un travail lancé séparément dans un terminal ne repousse pas le décompte. Désactiver temporairement le surveillant pour ces activités. Le délai d’inactivité natif de GitHub, actuellement de **30 minutes**, reste un mécanisme distinct ; désactiver ce surveillant ne désactive pas celui de GitHub.

L’action demandée est **Stop codespace**, jamais **Delete**. Les fichiers enregistrés, la base EmDash, les médias, les PDF et les secrets restent sur disque. Le site et son administration deviennent indisponibles jusqu’au redémarrage du Codespace et du serveur de développement. Les formulaires non enregistrés dans le navigateur ne sont pas sauvegardés par cet arrêt.

Ce dispositif ne garantit pas un plafond de facturation : les budgets et alertes se règlent dans GitHub, et le stockage reste comptabilisé à l’arrêt. Un client externe peut redémarrer le Codespace : la connexion SSH de GitHub CLI démarre une machine arrêtée. Le surveillant local ne peut empêcher cette demande externe. Les réglages de connexion du client doivent donc être vérifiés si la machine se réveille sans nouvelle tâche. Le réglage iOS documenté qui ouvre directement Codex Remote au lancement est une piste à vérifier, sans preuve qu’il est à l’origine des réveils observés ni qu’il contrôle toutes les reconnexions.

`npm run test:autostop` couvre la politique de délai, les fichiers persistants et deux processus Node distincts, les demandes GitHub différées/refusées et les reprises. Les essais utilisent une horloge simulée et une fausse action GitHub : ils n’arrêtent pas cette machine et ne modifient pas le CMS. Si Codex CLI est installé, le test de protocole démarre de vrais serveurs Codex dans des répertoires temporaires, sans configuration ni authentification copiées. Une réponse déterministe servie uniquement sur localhost permet de créer un tour terminé, puis de vérifier sa lecture après redémarrage sans reprise ni appel à un modèle externe. Ces essais ne prouvent pas qu’un client iPhone laissera la machine arrêtée.

Le suivi est limité aux interfaces natives observées et vérifiées. Une histoire éphémère/ancienne incompatible ou une conversation connue devenue illisible maintient l’arrêt en attente ; le surveillant ne supprime pas cet état pour forcer un arrêt. Il reste une courte fenêtre entre la dernière vérification locale et la prise en compte de l’arrêt GitHub ; une demande déjà acceptée par GitHub n’est pas annulable par le surveillant.

Références : [états et événements du serveur Codex](https://learn.chatgpt.com/docs/app-server), [arrêter et redémarrer un Codespace](https://docs.github.com/en/codespaces/developing-in-a-codespace/stopping-and-starting-a-codespace), [délai d’inactivité GitHub](https://docs.github.com/en/codespaces/setting-your-user-preferences/setting-your-timeout-period-for-github-codespaces), [démarrage dans la connexion GitHub CLI](https://github.com/cli/cli/blob/trunk/internal/codespaces/codespaces.go), [réglage de lancement iOS du 18 août 2026](https://learn.chatgpt.com/docs/changelog).

### Inspecter la version ordinateur depuis un téléphone

Sur la prévisualisation de développement, ajouter `?view=desktop` à l’URL publique force un viewport de 1280 pixels, ajusté à l’écran par le navigateur. Cette option active les compositions et animations ordinateur existantes ; le zoom reste disponible. La préférence est conservée dans l’onglet pendant la navigation entre pages. Ouvrir `?view=auto` pour retrouver le comportement responsive normal.

- [Vue ordinateur](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/?view=desktop)
- [Affichage automatique](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/?view=auto)

L’option ne modifie ni le CMS ni son administration et n’est pas activée dans le build de production. Sans stockage navigateur, le choix explicite dans l’URL fonctionne encore ; sans JavaScript, seule cette URL explicite force la largeur. Un téléphone tenu verticalement conserve un viewport haut : le mettre à l’horizontale rapproche davantage la composition de celle d’un écran d’ordinateur.

Vérification : émulation mobile WebKit et Chromium, avec largeur normale de 390 px, vue ordinateur de 1280 px, animations, navigation entre pages, réinitialisation, retour arrière, restauration de page en cache, stockage indisponible, JavaScript désactivé et orientation horizontale. Ces contrôles ne remplacent pas un essai sur l’iPhone physique et son navigateur intégré.

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

Le formulaire catalogue vérifie cette origine publique canonique. Le proxy Codespaces peut réécrire l'en-tête `Origin` en `http://localhost:4321` : cette variante est acceptée uniquement en développement, pour une requête reçue sur `localhost:4321`, lorsque l'origine HTTPS du `Referer` correspond exactement à l'adresse `.app.github.dev` configurée. Les autres origines restent refusées ; l'authentification et les protections CSRF natives d'EmDash restent actives. Après une modification du code du plugin natif, arrêter puis relancer `npm run dev` pour renouveler son instance en mémoire ; un simple rechargement Vite peut conserver l'ancien gestionnaire.

## Créer le premier administrateur

Dans l'assistant EmDash, choisir **Cattelan Italia Maroc** comme titre du site, puis créer le compte avec l’adresse d’administration convenue hors du dépôt et enregistrer une passkey avec le navigateur. Cette étape appartient au titulaire du compte ; aucun mot de passe ou compte partagé n'est fourni par le dépôt.

Une passkey dépend du domaine utilisé. Conserver la même URL de Codespace pendant les tests ; le futur domaine de production aura sa propre inscription. L'envoi d'invitations et les liens de connexion par email nécessiteront un prestataire email configuré. L'adresse d'administration n'est pas automatiquement l'adresse commerciale affichée au public.

## Données locales et catalogue de démonstration

Les liaisons prévues sont `DB` pour D1, `MEDIA` pour les médias EmDash et `CATALOGUES` pour les PDF privés. Wrangler conserve l'état local sous `.wrangler/`. Arrêter puis relancer le serveur conserve cet état. Supprimer un Codespace supprime aussi ces données locales : Git ne contient pas les modifications effectuées dans le CMS.

Charger une fois le PDF de démonstration dans le R2 local, depuis la racine du dépôt :

```sh
npx wrangler r2 object put cattelan-maroc-catalogues-preview/catalogues/cattelan-demonstration.pdf --file src/plugins/catalogue/assets/cattelan-demonstration.pdf --content-type application/pdf --local
```

Le fichier est explicitement fictif. Pour le remplacer, ouvrir **Contacts catalogue** dans l'administration (`/_emdash/admin/plugins/catalogue-leads/contacts`), choisir le catalogue et son nouveau PDF, puis cliquer sur **Associer au brouillon**. Vérifier le choix **Document de démonstration**, puis ouvrir **Vérifier et publier le catalogue** pour contrôler l'édition et la publier dans EmDash. Le titre, la couverture et les autres champs sont conservés ; aucune publication n'est automatique. La limite prévue est de 8 Mio. Ne pas déposer le PDF dans `public/` ni dans le stockage public des images.

Le visiteur renseigne son nom et son email. Le formulaire enregistre la demande avant de proposer le téléchargement. Le consentement aux communications est distinct et facultatif. Le connecteur CRM restera simulé jusqu'à la définition de l'API finale ; ne pas utiliser de vrais contacts pour les essais. Aucun email de catalogue n'est promis tant qu'aucun service d'envoi n'est configuré.

## Modifier et vérifier le contenu

La configuration Astro déclare explicitement le français comme seule locale. Initialiser la base neuve depuis l’assistant natif de l’application démarrée avec cette configuration. Ne pas amorcer ce projet avec la commande `emdash seed` seule : dans EmDash 0.41.0, ce chemin peut exécuter les migrations avant de connaître la locale Astro et créer les taxonomies natives en anglais.

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

## Coordonnées et carte du showroom

Dans **Configuration du site**, les champs `address`, `hours` et `contact_phone` pilotent les coordonnées publiques. Le propriétaire a fourni l’adresse du magasin, son téléphone et ses horaires locaux de Casablanca ; le contrat approuvé est conservé dans `content/showroom-location.json`. L’email public et WhatsApp restent séparés et vides tant qu’ils ne sont pas confirmés. Les données de contact ne sont pas ajoutées au seed générique.

La carte de l’accueil est un SVG fondé sur la géographie réelle OpenStreetMap de Casablanca, avec les couleurs, les rues fines et le repère rouge animé de la version B. Ses données sont conservées localement, avec une attribution visible et un téléchargement ODbL à `/cartographie/casablanca.json` ; aucun service cartographique externe n’est appelé pour afficher cette carte. Les sources et la mise à jour du jeu local sont décrites dans [le guide cartographique](geographic-map.md).

Les champs numériques facultatifs `showroom_latitude` et `showroom_longitude` positionnent le repère. Vider une coordonnée, saisir une valeur invalide ou déplacer le point hors de la couverture locale masque le repère, sans inventer de position de remplacement. La carte reste limitée à sa zone de Casablanca. `map_note` est une légende facultative : le libellé historique du champ dans EmDash est conservé, mais une valeur vide ne produit aucune mention de plan illustratif. L’attribution OpenStreetMap reste affichée indépendamment de cette légende.

Le zoom va de 1 à 6. Le glissement exige d’activer le bouton de déplacement, pour conserver le défilement de la page par défaut ; la molette n’est pas interceptée. Les flèches, `+`/`−` et `Début` agissent quand la carte a le focus ; `Échap` quitte le déplacement. Sans JavaScript, le fond géographique et les liens restent visibles, avec le repère si ses coordonnées sont valides ; seules les commandes sont masquées.

`map_url` reste le lien d’itinéraire. La carte Google Maps de la page showroom est une option séparée, pas la source du style de l’accueil. Son champ `map_embed_url` accepte uniquement l’URL tirée de l’attribut `src`, sous la forme `https://www.google.com/maps/embed?pb=…` : ne pas coller toute la balise iframe. Elle se charge lorsque le visiteur active « Afficher la carte interactive » ; sa fermeture retire l’iframe. Effacer ce champ masque son bouton, et l’itinéraire reste utilisable sans JavaScript.

Pour prévisualiser les coordonnées avant publication, ouvrir l’aperçu signé de la configuration globale : les cartes de l’accueil utilisent le repère du brouillon. La section supplémentaire « Carte du showroom », après l’accueil, permet de contrôler séparément l’option Google Maps. Elle conserve seulement l’itinéraire si l’URL d’intégration est vide, et disparaît si les deux liens sont vides. Les aperçus signés restent privés et non indexables.

Sur une base existante, la migration ciblée 0005 remplace un réimport du seed. Avec une session native valide enregistrée dans un fichier privé, examiner d’abord son plan :

```sh
EMDASH_AUTH_FILE=.wrangler/admin-session.json node scripts/migrations/0005-showroom-location.mjs
EMDASH_AUTH_FILE=.wrangler/admin-session.json node scripts/migrations/0005-showroom-location.mjs --apply
```

Le chemin de session ci-dessus est un exemple ; la migration ne crée pas de compte ni de session. Elle utilise les API natives locales, sauvegarde les données affectées sous `.wrangler/migrations/`, vérifie les révisions et refuse les brouillons en attente ou les valeurs personnalisées. Elle renseigne uniquement les coordonnées approuvées, ajoute les champs facultatifs absents et dirige le bouton de contact du showroom vers ses informations pratiques. Ne jamais réinitialiser la base, les médias ou l’authentification pour appliquer cette évolution.

Après l’état initial de la migration 0005, la migration 0006 ajoute les deux champs numériques et remplace uniquement leur valeur vide et l’ancienne légende du plan illustratif, à partir de `content/showroom-geography.json` :

```sh
EMDASH_AUTH_FILE=.wrangler/admin-session.json node scripts/migrations/0006-geographic-showroom-map.mjs
EMDASH_AUTH_FILE=.wrangler/admin-session.json node scripts/migrations/0006-geographic-showroom-map.mjs --apply
```

Elle sauvegarde les valeurs dans `.wrangler/migrations/`, contrôle les révisions et exige l’état exact attendu. Un brouillon ou une modification éditoriale des coordonnées ou de la légende est conservé : la migration s’arrête au lieu de l’écraser. Une migration déjà appliquée ne change rien. Les liens Google, médias, contacts du catalogue, comptes et secrets ne sont pas modifiés. Après l’import, les changements ordinaires de position passent par les champs EmDash, pas par une réexécution du contrat initial.

Les contrôles publics restent anonymes et en lecture seule ; les vérifications qui changent le CMS sont réservées à la copie jetable ci-dessous. `node tests/showroom-browser.mjs` concerne les coordonnées, l’itinéraire et la carte Google Maps à la demande ; `PUBLIC_TEST_URL` choisit l’origine et les résultats vont par défaut dans `test-results/showroom-browser/`. `node tests/geographic-map-browser.mjs` vérifie la carte géographique et ses interactions. Le [premier rapport showroom](test-results-showroom.md) est historique et ne prouve pas le nouveau rendu géographique. Voir le [rapport dédié à la géographie](test-results-geographic-map.md) pour ses contrôles et captures.

## Préparer Cloudflare ensuite

Après connexion du compte, créer un environnement de préproduction avec ses propres ressources D1, R2 et secrets, puis tester l'application sur son URL Workers. Le domaine `cattelanitalia.ma` sera raccordé plus tard. Ne pas lancer `npm run deploy` avant d'avoir choisi le compte et les noms de ressources.

Configurer aussi l’URL du site dans EmDash et `EMDASH_SITE_URL` avec l’origine Workers de préproduction : ne pas conserver l’URL localhost lors du transfert. Vérifier les canoniques, les aperçus signés et les passkeys sur cette origine. `SITE_INDEXABLE` reste à `false` jusqu’à la validation de la mise en ligne.

Après compilation, vérifier `dist/server/wrangler.json` : l’adaptateur ajoute aussi les liaisons `SESSION` (KV), `IMAGES` et `ASSETS`. Le dry-run d’assemblage a réussi ; les ressources distantes et les limites du compte devront être validées lors du premier déploiement.

Le transfert doit couvrir séparément le contenu EmDash, les médias, les PDF privés et les contacts du plugin. Un export de site EmDash ne constitue pas à lui seul une sauvegarde des contacts, des comptes et des secrets. Conserver les clés hors de Git et vérifier une restauration avant de basculer vers la production.

## Références vérifiées

- [Déploiement Cloudflare et seed EmDash](https://docs.emdashcms.com/deployment/cloudflare/)
- [Clés et secrets](https://docs.emdashcms.com/deployment/secrets/)
- [Commandes CLI](https://docs.emdashcms.com/reference/cli/)
- [Authentification et premier compte](https://docs.emdashcms.com/guides/authentication/)
- [Évolution du schéma](https://docs.emdashcms.com/deployment/schema-evolution/)
- [Transfert d'un site](https://docs.emdashcms.com/guides/site-transfer/)
- [Ports et visibilité Codespaces](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace)

Les coordonnées commerciales restent éditables dans **Configuration du site**. Le contrat versionné de la migration 0005 contient uniquement les informations publiques approuvées ; les secrets, sessions et sauvegardes privées restent hors de Git. Ne pas déduire un lien WhatsApp du seul numéro de téléphone.

## Tests de navigateur sur une base locale dédiée

Les tests inscrivent un compte fictif avec une passkey virtuelle et modifient des contenus avant de les restaurer. Ils exigent une **copie jetable**, ses propres secrets et données, une origine locale explicite et un marqueur d’isolation. Le port 4321 est refusé. Ne jamais copier `.dev.vars` ou `.wrangler/` depuis la prévisualisation existante et ne jamais utiliser `emdash seed` pour ces tests.

Installer le navigateur une fois avec `npx playwright install --with-deps chromium`. Depuis le dépôt, préparer la copie de travail avec les fichiers suivis et les nouveaux fichiers non ignorés :

```sh
cattelan_test_root=$(mktemp -d /tmp/cattelan-cms-integration-XXXXXX)
git ls-files --cached --others --exclude-standard -z | tar --exclude='.dev.vars' --exclude='.wrangler' --null -T - -cf - | tar -xf - -C "$cattelan_test_root"
cp -a node_modules "$cattelan_test_root/node_modules"
cd "$cattelan_test_root"
CODESPACES=false npm run setup
node --input-type=module <<'JS'
import { appendFile, mkdir, realpath, writeFile } from 'node:fs/promises';
await appendFile('.dev.vars', 'EMDASH_SITE_URL=http://localhost:4331\n');
await mkdir('.wrangler', { recursive: true });
await writeFile('.wrangler/integration-test-environment.json', JSON.stringify({
  disposable: true,
  projectRoot: await realpath('.'),
  origin: 'http://localhost:4331',
}) + '\n', { mode: 0o600 });
JS
npx wrangler r2 object put cattelan-maroc-catalogues-preview/catalogues/cattelan-demonstration.pdf --file src/plugins/catalogue/assets/cattelan-demonstration.pdf --content-type application/pdf --local
CODESPACES=false npm run dev -- --port 4331 --ignore-lock
```

La copie possède aussi ses propres dépendances et caches Vite : ne pas remplacer cette copie par un lien symbolique vers les dépendances du serveur actif. Garder le port de test privé. Dans un autre terminal, se placer dans le même dossier temporaire, puis lancer les vérifications **successivement** :

```sh
CMS_TEST_URL=http://localhost:4331 npm run test:cms -- --setup
CMS_TEST_URL=http://localhost:4331 npm run test:catalogue-http
CMS_TEST_URL=http://localhost:4331 node tests/showroom-location-cms.mjs
CMS_TEST_URL=http://localhost:4331 node tests/geographic-showroom-cms.mjs
```

Le premier test utilise l’initialisation native, la connexion passkey, les brouillons, les aperçus signés, la publication et l’effacement des champs. Le second réutilise sa session native pour tester les contacts D1, les PDF privés R2, la publication d’une édition, les consentements facultatifs et le formulaire Chromium. `showroom-location-cms.mjs` vérifie la migration 0005 et le cycle de ses champs ; `geographic-showroom-cms.mjs` vérifie ensuite la migration 0006, les coordonnées en brouillon et leur publication ou effacement. Ces tests utilisent uniquement la même base isolée. Ne pas les lancer contre le port 4321 ni contre la base existante. Les fichiers de session/passkey restent dans le `.wrangler/` jetable ; seuls les rapports Markdown relus peuvent être repris dans le dépôt. Arrêter ce serveur après les tests. Éviter les compilations et vérifications Astro simultanées avec ces navigateurs dans un petit Codespace.
