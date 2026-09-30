# Rétablissement de l’aperçu à la reconnexion

29 septembre 2026. Horaires de ce rapport : Toronto (`America/Toronto`).

## Cause constatée

Le site répondait après la relance précédente, puis le suivi de fin de tâches a demandé l’arrêt du Codespace à **14 h 02 min 14 s**. Le conteneur actuel a démarré à **14 h 03 min 51 s** ; l’origine de cette reprise n’est pas établie. Au diagnostic suivant, aucun serveur n’écoutait sur le port 4321. Aucun événement OOM n’était enregistré.

La configuration appliquée, dans `/workspaces/.codespaces/shared/merged_devcontainer.json`, contenait seulement `postAttachCommand: "node .devcontainer/private-port.mjs"`, sans `postStartCommand`. Le fichier `.devcontainer/devcontainer.json` du dépôt avait déjà les nouveaux hooks, mais ils n’avaient pas été appliqués au conteneur existant. Le dernier appel journalisé à `preview-start.sh` datait de **13 h 17 min 27 s**. Le marqueur de désactivation était absent.

## Correctif

L’entrée existante `private-port.mjs` confirme la visibilité privée, puis appelle les helpers existants de suivi des tâches et de démarrage de l’aperçu. Elle utilise des chemins absolus, la racine du dépôt et des appels bornés. Une erreur de visibilité empêche cette entrée de démarrer l’aperçu ; elle n’empêche pas le lancement du suivi d’arrêt. Les sorties privées des sous-commandes ne sont pas affichées. Les verrous et les marqueurs de désactivation des helpers restent la référence, sans nouveau surveillant permanent.

Astro 7.3.5 interrompt lui-même son démarrage en arrière-plan après 30 secondes. Le précédent rétablissement avait rencontré cette erreur pendant la préparation des dépendances ; la nouvelle relance manuelle a pris **25,819 secondes**. Le helper autorise donc une seule reprise, après deux secondes, pour cette erreur native exacte avec le code de sortie 1, au format texte ou JSON. Il revérifie les prérequis et la désactivation et conserve le même verrou. Une erreur différente, un second échec ou le délai externe de 60 secondes ne déclenchent pas de nouvelle reprise. Le correctif ne supprime aucun verrou natif et ne termine aucun processus lui-même.

L’arrêt automatique reste fixé à quinze minutes après la fin vérifiée des tâches. Aucun réglage CMS, contenu, média, PDF, contact, passkey ou secret n’a été modifié. Aucune initialisation, migration de données, reconstruction du conteneur ou mise en production n’a été lancée.

## Validation

- **33 tests isolés réussis** : quatre pour l’entrée de rattachement et 29 pour le helper, sous-cas compris. Vérifications de syntaxe Node/Bash et `git diff --check` réussies. Aucune compilation ou suite CMS complète relancée pour ce changement de démarrage.
- Les tests isolés de l’ancienne entrée de rattachement couvrent le lancement des deux helpers, leur répertoire de travail, l’ordre de privatisation, le refus d’un port dont la visibilité n’est pas confirmée, les erreurs indépendantes et les identités invalides. Les exécutables sont fictifs : aucun appel GitHub ou CMS.
- Les tests isolés du helper couvrent les connexions concurrentes, le détachement, les verrous, les prérequis et la désactivation. Les cas de reprise distinguent le message exact texte/JSON des messages malformés ou approchants et imposent deux tentatives au maximum.
- Exécution réelle de l’ancienne commande `node .devcontainer/private-port.mjs` réussie : à **14 h 14 min 46–48 s**, le helper réutilise le serveur existant PID 3878. Le suivi d’arrêt confirme ensuite `running: true`, `disabled: false`, `work-active`, quinze minutes et aucune échéance pendant la tâche.
- L’accueil et le catalogue renvoient HTTP 200 avec un document HTML complet ; l’administration renvoie vers sa connexion native. Aucun formulaire soumis ni test d’authentification exécuté.
- GitHub confirme que le port 4321 reste privé.

## Limites

Ce correctif est testé par l’exécution de la commande réellement installée et dans les fixtures. Il ne constitue pas un essai complet de fermeture/réouverture de l’éditeur ou d’arrêt/redémarrage de la machine.

Il corrige l’ancienne entrée de rattachement de l’éditeur. Une reprise de l’ancien conteneur sans connexion éditeur ni SSH ne possède toujours pas de hook `postStartCommand` : ce cas nécessite d’appliquer la configuration actuelle par le cycle normal de reconstruction. Le lien de l’aperçu ne réveille pas une machine arrêtée. L’aperçu devient donc indisponible pendant l’arrêt automatique demandé ; aucune disponibilité permanente n’est promise.

- [Site](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/)
- [EmDash](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/_emdash/admin/)
