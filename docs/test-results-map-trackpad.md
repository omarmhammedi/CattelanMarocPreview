# Navigation de la carte au trackpad

Correctif du **29 septembre 2026, heure de Toronto**, sur `feat/emdash-migration`.

Le correctif précédent rendait les boutons accessibles, mais ne traitait aucun geste de trackpad : les événements de molette défilaient la page et le pincement restait celui du navigateur. Ce comportement ne répondait pas à la demande de parcourir directement la carte au trackpad.

## Comportement ajouté

- Sur le fond cartographique, deux doigts déplacent la vue horizontalement et verticalement, sans activer le bouton de glissement.
- Le pincement zoome autour du pointeur, dans les deux sens. Le contrôleur prend en charge Ctrl + molette et les événements de geste Safari ; un même geste n’est pas compté deux fois.
- Le défilement reste celui de la page hors du fond cartographique, notamment sur le panneau d’information et l’en-tête. À la limite de l’extrait, un mouvement qui ne peut plus déplacer la carte laisse la page défiler.
- La caméra conserve les limites géographiques et le zoom maximal de 16. Les boutons, le recentrage, le clavier et le mode glisser restent disponibles.
- Sur écran tactile, le défilement et le zoom de page du navigateur restent natifs. Ce correctif ne transforme pas le pincement de l’iPhone en zoom de carte.

Le code ne distingue pas arbitrairement une souris d’un trackpad à partir de ses deltas : une molette ordinaire déplace aussi la carte sous le pointeur. Les gestes sont limités au fond cartographique et à une entrée avec pointeur fin et survol. Aucun nouveau fournisseur, dépendance ou appel cartographique.

## Vérifications

**40 cas trackpad réussis** : dix cas dans chacun des couples Chromium/WebKit × clair/sombre. Les essais utilisent de vrais événements de molette envoyés par Playwright pour le déplacement et le passage au défilement de page. Ils contrôlent les deux axes, la stabilité de la page, le point géographique sous le curseur, les limites, l’inversion du pincement aux limites, les gestes Safari cumulatifs, la suppression du double événement, les boutons après les gestes et la préservation du comportement tactile mobile.

**20 cas de régression réussis** : la suite précédente des boutons, rues, positions partiellement défilées, limites de zoom, taps mobiles et iframe a été rejouée dans Chromium sombre et WebKit clair. Son contrôle de défilement de page vise maintenant une zone hors de la carte, conformément au nouveau comportement demandé.

Le build de production réussit, avec le seul avertissement de taille de bundle déjà présent (plus de 500 Ko). Les 69 tests unitaires passent. Astro vérifie 84 fichiers avec zéro erreur, avertissement ou indication. Les résultats complets des navigateurs sont conservés dans les [preuves compactes](audits/map-trackpad-2026-09-29.json) ; les sorties brutes sont dans `test-results/map-trackpad/`, exclu de Git.

Les pincements sont des événements synthétiques avec les propriétés reçues par les contrôleurs, et non des gestes effectués sur un trackpad physique. Les coordonnées de test sont arrondies aux pixels CSS entiers utilisés par `MouseEvent`. Les essais WebKit sous Linux ne remplacent pas un essai sur le Mac/Safari du propriétaire. Aucun événement d’écriture CMS ni erreur JavaScript lors des passages finaux.

| Capture après interaction | Sombre | Clair |
| --- | --- | --- |
| Ordinateur : déplacement et pincement | [Voir](screenshots/map-trackpad-2026-09-29/desktop-trackpad-pan-and-pinch-dark.jpg) | [Voir](screenshots/map-trackpad-2026-09-29/desktop-trackpad-pan-and-pinch-light.jpg) |
| Mobile : carte et gestes natifs préservés | [Voir](screenshots/map-trackpad-2026-09-29/mobile-native-pinch-preserved-dark.jpg) | [Voir](screenshots/map-trackpad-2026-09-29/mobile-native-pinch-preserved-light.jpg) |

Les captures montrent le rendu obtenu ; elles ne constituent pas une preuve d’un geste matériel. Les données OSM, les contenus EmDash, l’administration, les contacts, médias, PDF et secrets ne sont pas modifiés. Aucun accès authentifié au CMS ni réinitialisation. Les aperçus statiques, `main`, GitHub Pages et la production restent inchangés. Le port 4321 demeure privé et la PR reste en brouillon.

[Carte dans l’aperçu](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/#plan) · [Administration EmDash](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/_emdash/admin/)
