# Nouvelle photographie du showroom — 29 septembre 2026

La photographie de l’entrée et de l’enseigne fournie par le propriétaire remplace celle du salon sur l’accueil et sur `/showroom-casablanca/`. Le fichier original `AMIN2589.jpg` est importé une seule fois dans EmDash : JPEG de 2 000 × 3 000 pixels, 2 145 163 octets. Il est conservé sans recompression ni retouche ; le site ne dépend pas du lien de partage pour l’afficher.

Les deux références ont été publiées le **29 septembre à 14 h 25, heure de Toronto**. Les cadres existants sont conservés. Les photos portrait sont cadrées vers le haut, avec une origine de zoom haute sur l’accueil, pour garder l’enseigne visible ; le cadrage des photos paysage reste inchangé. La progression des animations est conservée.

La publication a modifié uniquement `home.showroom_image` et `showroom-casablanca.hero_image`. Les textes, relations, coordonnées, réglages SEO et autres images restent identiques. L’ancien média reste dans la médiathèque. Les [dimensions et l’empreinte du nouveau fichier](../content/showroom-owner-photo.json) sont consignées sans publier l’URL de partage.

La sauvegarde cohérente a précédé l’authentification native et l’import. Après publication et déconnexion, le contrôle de conservation confirme **56 tables protégées**, 97 anciennes révisions, 624 anciens médias et 627 fichiers existants intacts ; seuls un média, son fichier et deux révisions de pages sont ajoutés. Deux utilisateurs, deux passkeys, contacts, PDF et secrets sont préservés. Le fichier téléchargé depuis EmDash a la même empreinte SHA-256 que l’original. La session temporaire a été fermée, son ancien cookie refusé et son fichier supprimé.

## Vérifications

Les quatre passages Chromium/WebKit × clair/sombre réussissent : **60 contrôles**, chacun couvrant les formats 1440 × 900 et 390 × 844. Ils vérifient le chargement de la même photo sur les deux pages, les animations normales et leur réduction, la navigation, le changement de thème au clavier, les coordonnées et les CTA. Aucune erreur JavaScript, écriture ou requête d’administration n’a été observée. Les clics d’itinéraire vérifient l’URL Google attendue sans tester la disponibilité du service externe.

`npm run check` : **102 fichiers, zéro erreur, avertissement ou indication**. `npm run build` : réussite en 20,46 secondes, avec l’avertissement existant sur un bundle supérieur à 500 Ko. Les [preuves détaillées](audits/showroom-photo-2026-09-29.json) regroupent ces résultats, la publication, la conservation des données et les empreintes des captures. Aucun seed, test d’inscription ou test de formulaire avec données réelles n’est exécuté pour ce remplacement. Les contrôles de navigateur sont anonymes et bloquent les écritures.

Un premier passage de navigateur a échoué sur le contrôle de mouvement mobile pendant les ajustements du composant. Il a été repris après stabilisation du code. Aucun code d’animation n’a été modifié pour faire passer ce contrôle. Un ancien libellé de test mentionnant deux FAQ a aussi été corrigé : son assertion vérifiait déjà l’absence de FAQ et la présence de la note de contact.

## Captures

| Emplacement | Ordinateur, sombre | Mobile, clair |
| --- | --- | --- |
| Accueil | [Capture](screenshots/showroom-photo-2026-09-29/home-showroom-1440-dark.jpg) | [Capture](screenshots/showroom-photo-2026-09-29/home-showroom-390-light.jpg) |
| Page showroom | [Capture](screenshots/showroom-photo-2026-09-29/showroom-information-1440-dark.jpg) | [Capture](screenshots/showroom-photo-2026-09-29/showroom-information-390-light.jpg) |

Les captures montrent le rendu publié à 1440 × 900 et 390 × 844. Elles ne constituent pas un essai sur iPhone physique ni une nouvelle comparaison pixel par pixel avec la version B. Le fichier original pèse environ 2,15 Mo ; aucune optimisation de compression n’est revendiquée.

Le port 4321 reste privé. Aucun déploiement, fusion vers `main`, changement des aperçus statiques ou du délai d’arrêt automatique n’est effectué.

- [Accueil](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/)
- [Showroom](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/showroom-casablanca/)
- [EmDash](https://bookish-space-umbrella-jjxxvgxjwwvrfqvrp-4321.app.github.dev/_emdash/admin/)
