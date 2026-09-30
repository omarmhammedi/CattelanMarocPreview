# Reprise de l'aperçu — 28 septembre 2026, heure de Toronto

Le Codespace avait redémarré à 19 h 41 min 42 s, mais aucun serveur n'écoutait sur 4321 lors du signalement. Les hooks existants lançaient le moniteur d'arrêt automatique sans lancer Astro. L'origine du redémarrage de la machine n'est pas établie par ce constat.

## Correction

Le helper `.devcontainer/preview-start.sh` effectue une seule tentative de démarrage natif en arrière-plan. Il est déclaré dans les hooks de démarrage/rattachement du conteneur et installé dans le hook SSH du Codespace existant. La reconnexion SSH restaure l'environnement via `bash -lc`. Le hook SSH précédent est conservé, avec une sauvegarde locale privée avant ajout.

Le démarrage possède sa propre session système (`setsid`), afin de survivre à la fermeture du lanceur, ainsi qu'un verrou temporaire partagé entre les connexions. Ce verrou n'est pas transmis au serveur Astro. Le port reste 4321 ; `strictPort` empêche un repli silencieux sur 4322. Aucun setup, seed, installation de dépendances ou redémarrage continu n'est exécuté. Une commande distincte permet de désactiver ce démarrage pendant la maintenance.

L'arrêt automatique après quinze minutes de fin de tâches reste inchangé. Le helper ne réveille pas un Codespace éteint et ne le maintient pas allumé.

## Vérifications

- Douze contrôles isolés réussis avec un faux binaire Astro et des répertoires jetables : connexions simultanées, réutilisation native, libération du verrou, session détachée, prérequis, chemins avec espaces, désactivation, erreur et expiration sans boucle.
- Sur le Codespace existant : arrêt natif du serveur, exécution du même `~/.ssh/rc` que lors d'une reconnexion, démarrage natif réussi sur 4321, puis deuxième appel du hook conservant le même PID.
- Accueil, collections, Skorpio et catalogue : réponses HTTP 200 et marqueurs du contenu publié présents. Aucun envoi de formulaire, accès administrateur authentifié ou modification éditoriale pendant ces vérifications.
- Port 4321 toujours privé. Syntaxe Bash, JavaScript de configuration et différences Git contrôlées.

Le passage par un redémarrage complet de la VM n'a pas été forcé pendant cette tâche. Les changements de configuration du conteneur prennent effet selon son cycle normal d'application ; le hook SSH est installé et testé dès maintenant. Cette correction traite l'absence du serveur après reprise. Elle ne constitue pas un diagnostic des blocages distincts observés auparavant pendant les imports intensifs.

Commande reproductible : `node --test .devcontainer/preview-start.test.mjs`. Les commandes de maintenance et le fonctionnement sont décrits dans [Développement](development.md#relancer-automatiquement-laperçu-après-un-redémarrage).
