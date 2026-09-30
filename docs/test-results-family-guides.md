# Guides des six collections

Révision du 29 septembre 2026, heure de Toronto, publiée dans l’aperçu EmDash existant sur `feat/emdash-migration`.

Les pages présentent désormais chaque famille dans son ensemble, avec des critères concrets de choix avant la sélection de modèles. Les onze fiches existantes restent des exemples documentés. Les introductions, textes de cartes, corps enrichis et descriptions SEO des six familles sont révisés ; titres éditoriaux, images, relations, fiches modèles et articles sont conservés. Les actions finales proposent le catalogue et un lien direct vers les coordonnées du showroom.

| Collection | Information mise en avant |
| --- | --- |
| Tables | Matières réelles, forme, dimensions, piètement et places selon les assises |
| Chaises et tabourets | Hauteur d’usage, accoudoirs, encombrement et revêtements |
| Canapés et fauteuils | Implantation, compositions, profondeur d’assise et habillages |
| Buffets et bibliothèques | Rangement ouvert ou fermé, dimensions utiles, fixation et finitions |
| Luminaires | Type, emplacement, proportions, source lumineuse et caractéristiques électriques |
| Mobilier extérieur | Exposition autorisée, espace disponible et entretien propre aux références |

Les possibilités de tabourets et de canapés composables sont étayées par des références officielles distinctes des modèles sélectionnés. Bloom ne représente plus à lui seul le texte consacré aux luminaires. Les deux modèles Outdoor présentés restent explicitement réservés à des extérieurs couverts et protégés des intempéries. Les textes français sont originaux ; les sources Cattelan Italia sont conservées dans [`content/family-guides.json`](../content/family-guides.json).

## Publication et conservation

La migration `0008-family-guides.mjs` réutilise le moteur natif protégé de la 0004 : vérification exacte de l’état antérieur, refus d’un brouillon ou de textes personnalisés, sauvegarde privée avant écriture, mise à jour partielle et publication de la révision concernée. Les six entrées ont été publiées à 10 h 36–37, heure de Toronto ; le second contrôle à blanc trouve **zéro modification**. Le frontend continue de lire EmDash, sans fichier JSON de substitution.

Une sauvegarde SQLite cohérente précède la publication. Le contrôle de conservation confirme **29 tables protégées et 626 fichiers intacts**, dont les médias, PDF privés et secrets ; deux comptes et deux passkeys conservés, aucun nouvel utilisateur. Les seules révisions éditoriales ajoutées concernent les six familles. Les autres variations concernent leurs métadonnées SEO et les index internes natifs. La session technique autorisée a été fermée par la déconnexion native ; son ancien cookie retourne 401 et son nouveau fichier local a été supprimé.

L’aperçu a nécessité une relance du serveur Astro pendant la préparation, sans cause établie. La publication et les contrôles publics suivants ont réussi. Aucun setup ou seed sur la base principale, aucun changement de `main`, des aperçus statiques, de GitHub Pages ou du dispositif d’arrêt automatique. Le port 4321 reste privé et la PR nº 1 reste ouverte en brouillon. Aucun déploiement en production.

## Vérification

- **9 contrôles CMS sur une base jetable séparée** : état initial, simulation sans modification, publication et conservation, relance sans changement, confidentialité des brouillons, aperçu signé, refus d’écraser un brouillon, publication publique et effacement du corps facultatif. Le caractère immédiat des métadonnées SEO natives est également vérifié. Cette base, ses médias, ses secrets et sa passkey de test étaient indépendants ; l’environnement a été arrêté puis supprimé.
- **64 contrôles publics réussis** : six textes et métadonnées rendus exactement, onze fiches modèles avec leurs galeries et PDF techniques conservés, 29 liens internes et ancres valides, 48 compositions de pages et huit parcours modèle/changement de thème. Chromium et WebKit, 1440×900 et 390×844, sombre et clair ; aucune erreur JavaScript, aucun débordement horizontal, aucune écriture ni requête privée tentée.
- **72 tests unitaires réussis**, vérification Astro de 91 fichiers sans diagnostic, seed validé sans import et compilation réussie en 24,33 secondes. L’avertissement de bundle supérieur à 500 kB déjà présent subsiste.

Les rapports détaillés locaux sont sous `test-results/family-guides/` ; la [preuve compacte](audits/family-guides-2026-09-29.json) est versionnée. Le contrôle public général a été adapté au nouveau manifeste ; le test ciblé ci-dessus est celui exécuté pour cette révision.

## Captures

La page Tables illustre la structure commune. Les six familles sont couvertes par les contrôles de mise en page.

| Position et format | Sombre | Clair |
| --- | --- | --- |
| Guide ordinateur | [Voir](screenshots/family-guides-2026-09-29/tables-1440-dark-overview.jpg) | [Voir](screenshots/family-guides-2026-09-29/tables-1440-light-overview.jpg) |
| Guide mobile | [Voir](screenshots/family-guides-2026-09-29/tables-390-dark-overview.jpg) | [Voir](screenshots/family-guides-2026-09-29/tables-390-light-overview.jpg) |
| Sélection ordinateur | [Voir](screenshots/family-guides-2026-09-29/tables-1440-dark-selection.jpg) | [Voir](screenshots/family-guides-2026-09-29/tables-1440-light-selection.jpg) |
| Sélection mobile | [Voir](screenshots/family-guides-2026-09-29/tables-390-dark-selection.jpg) | [Voir](screenshots/family-guides-2026-09-29/tables-390-light-selection.jpg) |
| Actions ordinateur | [Voir](screenshots/family-guides-2026-09-29/tables-1440-dark-cta.jpg) | [Voir](screenshots/family-guides-2026-09-29/tables-1440-light-cta.jpg) |
| Actions mobile | [Voir](screenshots/family-guides-2026-09-29/tables-390-dark-cta.jpg) | [Voir](screenshots/family-guides-2026-09-29/tables-390-light-cta.jpg) |

## Limites

Le PDF de démonstration, les photos d’ambiance provisoires et les autres points de l’audit SEO restent à finaliser. Le formulaire catalogue et son consentement marketing facultatif sont conservés ; aucun nouveau contact ni parcours de téléchargement privé n’a été soumis sur la base principale pour ce travail éditorial. Les tests navigateur utilisent la réduction des animations ; ils ne constituent ni une nouvelle validation des animations normales, ni un essai sur iPhone physique, ni une comparaison pixel à pixel avec la version B.

Le SEO natif EmDash s’enregistre immédiatement, indépendamment des brouillons de corps de page. L’aperçu reste privé et non indexable ; aucun résultat de classement Google n’est annoncé.

[Collections](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/collections/) · [Exemple Tables](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/collections/tables/) · [Administration](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/_emdash/admin/)
