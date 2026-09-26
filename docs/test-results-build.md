# Validation technique finale

Date : 26 septembre 2026. Node 24, EmDash 0.41.0, Astro 7.3.5, adaptateur Cloudflare 14.3.3, Wrangler 4.125.0.

| Vérification | Résultat |
| --- | --- |
| `npm run check` | 40 fichiers ; 0 erreur, 0 avertissement, 0 remarque |
| `npm test` | 11 tests réussis, aucun échec |
| `npm run seed:validate` | 6 collections, 29 entrées ; références résolues, cinq articles complets et PDF de démonstration |
| `npm run build` | Build serveur Cloudflare réussi |
| `wrangler deploy --dry-run` | Assemblage réussi, aucune mise en ligne |
| `git diff --check` | Aucun défaut d’espacement |

Le dry-run utilise la configuration générée `dist/server/wrangler.json`. Il assemble 727 modules et 76 fichiers statiques ; taille totale annoncée : 26 872,67 Kio, dont 7 123,74 Kio après gzip. Le build signale certains bundles de plus de 500 Ko ; cet avertissement n’empêche pas la compilation. Les limites et performances effectives devront être contrôlées sur le compte de préproduction, notamment le temps de démarrage et le CPU des requêtes.

L’adaptateur ajoute `SESSION` (KV), `IMAGES` et `ASSETS` aux liaisons explicites `DB`, `MEDIA` et `CATALOGUES`. La configuration générée constitue donc la référence pour préparer les ressources Cloudflare. Aucun compte Cloudflare, domaine ou service CRM externe n’a été connecté par cette vérification.

La locale par défaut est explicitement `fr`, sans préfixe dans les URL. L’accueil reste disponible lorsqu’aucun catalogue n’est publié ; le formulaire affiche alors son message d’indisponibilité administrable.

Les preuves fonctionnelles sont détaillées séparément :

- [Brouillons, aperçus signés et publication immédiate](test-results-cms.md)
- [Collecte durable, droits d’accès et PDF privé](test-results-catalogue.md)
- [Design B, mobile, thèmes et interface d’administration](test-results-visual.md)

La préproduction distante reste à faire après connexion de Cloudflare. Les contenus définitifs, les coordonnées commerciales, les mentions de confidentialité et le PDF final restent à valider avant une collecte réelle. Le transfert de données devra inclure D1, les médias, les PDF privés et les secrets, au-delà du seul dépôt Git.

Sources de configuration : [déploiement EmDash sur Cloudflare](https://docs.emdashcms.com/deployment/cloudflare/) et [limites Workers](https://developers.cloudflare.com/workers/platform/limits/), consultées le 26 septembre 2026.
