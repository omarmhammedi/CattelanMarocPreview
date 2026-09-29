# Logo Maroc et suppression de l’horloge

Modification du 29 septembre 2026, heure de Toronto, sur `feat/emdash-migration`, demandée à partir de [cette capture](https://i.imgur.com/es9D1oi.png).

Le logo porte désormais uniquement **Maroc**. La ligne de l’en-tête contenant le point, « Casablanca, Maroc » et l’heure est supprimée, avec son minuteur JavaScript et ses styles inutilisés. Les logos, leurs couleurs et le bouton de thème sont conservés.

La migration `scripts/migrations/0007-brand-location.mjs` ajoute le champ facultatif `site_content.brand_location` et publie « Maroc » dans la configuration existante, par les API natives EmDash. L’adaptateur l’utilise pour les logos de l’accueil, des pages intérieures, des pieds de page et de la représentation du catalogue. Vider le champ masque la ligne. La ville `city`, utilisée dans les coordonnées et les informations pratiques, reste « Casablanca, Maroc ».

La migration refuse les brouillons et les schémas incompatibles ; un champ déjà présent, y compris vide, est préservé. Elle réutilise le moteur vérifié de la migration 0005 pour la sauvegarde préalable, les mises à jour partielles, les révisions et la conservation des références. Le second contrôle à blanc trouve zéro modification. Le seed est seulement mis à jour pour les nouvelles installations ; il n’a pas été importé.

Validation : **72 tests unitaires réussis**, Astro **87 fichiers sans diagnostic**, seed valide et build réussi avec l’avertissement de taille de bundle déjà connu. **16 contrôles Chromium anonymes** couvrent accueil, catalogue, showroom et tables en clair/sombre, à 1440×900 et 390×844 : tous les libellés sous les logos affichent Maroc, absence d’horloge, ville conservée, menu mobile fonctionnel, aucun débordement horizontal ni erreur JavaScript. Les tests de protection de la migration utilisent des objets en mémoire ; aucun test de setup ou de passkey sur la base principale.

Une sauvegarde SQLite cohérente précède la publication. Les contrôles privés confirment la conservation de 28 tables protégées et de 626 fichiers ; aucun nouvel utilisateur, les deux comptes et les deux passkeys sont préservés. La session technique native autorisée a été déconnectée et son ancien cookie retourne 401. Les médias, contacts, PDF et secrets sont conservés. Aucun setup, reseed, changement des aperçus statiques, de `main`, de GitHub Pages ou déploiement en production.

| Capture | Sombre | Clair |
| --- | --- | --- |
| Accueil ordinateur | [Voir](screenshots/branding-2026-09-29/home-desktop-dark.jpg) | [Voir](screenshots/branding-2026-09-29/home-desktop-light.jpg) |
| Accueil mobile | [Voir](screenshots/branding-2026-09-29/home-mobile-dark.jpg) | [Voir](screenshots/branding-2026-09-29/home-mobile-light.jpg) |
| Showroom ordinateur | [Voir](screenshots/branding-2026-09-29/showroom-desktop-dark.jpg) | [Voir](screenshots/branding-2026-09-29/showroom-desktop-light.jpg) |
| Showroom mobile | [Voir](screenshots/branding-2026-09-29/showroom-mobile-dark.jpg) | [Voir](screenshots/branding-2026-09-29/showroom-mobile-light.jpg) |

[Preuves compactes](audits/branding-2026-09-29.json) · [Aperçu](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/) · [Administration](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/_emdash/admin/)
