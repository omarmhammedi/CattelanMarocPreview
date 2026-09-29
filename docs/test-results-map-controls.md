# Commandes de carte et noms de rues

Défaut reproduit le 28 septembre ; correctif finalisé le **29 septembre 2026, heure de Toronto**, sur `feat/emdash-migration`.

## Défaut reproduit

Le propriétaire a précisé que les boutons `+` et `−` ne permettaient pas d’explorer la carte. À 2000×1248, après seulement 70 px de défilement dans la section, le centre du bouton `+` se trouvait derrière le header fixe. À 1440×900, le clic atteignait même le lien catalogue du header. Le bouton `−` était désactivé au cadrage initial et les noms de rues n’apparaissaient qu’après trois pressions sur `+`.

Les premiers tests avaient aligné la section en haut de l’écran ; ils n’avaient pas couvert ces positions ordinaires de défilement. Les gestionnaires de clic fonctionnaient lorsque les boutons étaient dégagés, y compris dans une iframe.

## Correction

- Les commandes suivent la partie visible de la carte, sous le header et dans les limites du panneau cartographique.
- Le bouton `−` élargit le cadrage initial jusqu’à la couverture géographique disponible. Le bouton `+` permet un rapprochement jusqu’à 16 ; le recentrage revient à la composition initiale.
- Les libellés utilisent les rues nommées de l’extrait OSM existant. Leur sélection dépend de leur taille réelle à l’écran, de leur emplacement et de l’espace libre. Les voies principales peuvent être nommées dès le cadrage initial ; les rues locales apparaissent aux vues rapprochées.
- Les libellés évitent les commandes, le panneau, le repère, les quartiers et les autres noms. Plusieurs positions sur un même tracé réel permettent de conserver un nom visible à proximité du showroom, sans déplacer la rue.
- Les zooms conservent la position de défilement de la page. Un contrôle WebKit a également reproduit un déplacement de la page lors de changements du `viewBox` SVG ; les commandes ne font plus sortir la carte de l’écran après plusieurs taps.

La palette, les traits fins et le repère animé sont conservés. Le défilement de page et le zoom natif du navigateur restent disponibles par défaut ; aucun nouveau comportement de molette ou de pincement n’est ajouté. Le glissement de la carte conserve son bouton d’activation.

Ce changement concerne le frontend. Aucune publication, migration de schéma, connexion administrative ou modification de la base EmDash, des contacts, comptes, passkeys, médias, PDF ou secrets. Le jeu géographique reste identique ; aucune requête vers un fournisseur de carte n’est ajoutée.

## Validation

**40 cas ciblés réussis**, répartis entre Chromium et WebKit, dans les deux thèmes. La suite `tests/geographic-map-interaction-browser.mjs` utilise les coordonnées réelles du pointeur et le test de l’élément sous le clic ; elle évite le défilement automatique de `locator.click()`, qui pourrait cacher le défaut. Les essais couvrent 2000×1248 et 1440×900, les offsets de 70, 140 et 220 px, les limites du zoom, les rues dans la vue rapprochée, les taps à 390×844, la stabilité du défilement de page et une iframe sandboxée servie depuis une origine locale fiable. Aucun appel en écriture ni erreur JavaScript lors de ces passages finaux.

Sur mobile, le cadrage large conserve les noms de quartiers ; un premier zoom avant révèle les noms de rues qui tiennent à l’écran. Les noms voisins restent lisibles au rapprochement testé. Le nombre et le choix des libellés varient selon le cadrage et l’espace libre. Le test distingue donc la vue d’ensemble de la vue rapprochée.

Les 69 tests unitaires réussissent, dont neuf contrôles de sélection des noms, collision, densité, géométrie et positions alternatives. Les [preuves compactes](audits/map-controls-2026-09-29.json) conservent chaque cas et les valeurs de zoom. Les sorties détaillées sont dans `test-results/map-interaction/`, exclu de Git.

| Capture | Thème sombre | Thème clair |
| --- | --- | --- |
| Ordinateur, carte partiellement défilée | [Voir](screenshots/map-controls-2026-09-29/desktop-partial-scroll-dark.jpg) | [Voir](screenshots/map-controls-2026-09-29/desktop-partial-scroll-light.jpg) |
| Ordinateur, noms de rues rapprochés | [Voir](screenshots/map-controls-2026-09-29/desktop-close-streets-dark.jpg) | [Voir](screenshots/map-controls-2026-09-29/desktop-close-streets-light.jpg) |
| Mobile, premier rapprochement | [Voir](screenshots/map-controls-2026-09-29/mobile-partial-scroll-dark.jpg) | [Voir](screenshots/map-controls-2026-09-29/mobile-partial-scroll-light.jpg) |
| Mobile, vue rapprochée | [Voir](screenshots/map-controls-2026-09-29/mobile-close-streets-dark.jpg) | [Voir](screenshots/map-controls-2026-09-29/mobile-close-streets-light.jpg) |

Les captures proviennent du frontend principal, en lecture seule. Les données et parcours CMS/catalogue n’ont pas été modifiés ni réinitialisés. Le serveur d’aperçu a été relancé après des chargements qui n’aboutissaient pas ; aucune opération d’initialisation n’a été exécutée.

La couverture reste limitée à la zone de Casablanca téléchargée. Les libellés sont ceux d’OSM, avec ses variantes orthographiques ; tous les noms ne sont pas affichés simultanément. Les essais WebKit ne remplacent pas un test sur l’iPhone physique du propriétaire.

[Ouvrir la carte](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/#plan) · [Administration EmDash](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/_emdash/admin/)
